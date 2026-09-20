// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, seemimic, wakeup, m_respond,
//         setmangry / peacefuls_respond (D-1772), maybe_mnexto (D-1336),
//         mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { dochugw, m_everyturn_effect, monflee, can_hide_under_obj, can_fog, mon_offmap, accessible } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, IS_TREE, D_CLOSED, D_LOCKED, D_BROKEN,
    ALLOW_ROCK, ALLOW_DIG, Is_rogue_level, NOTONL, ALLOW_ALL, ALLOW_BARS,
    ALLOW_MDISP, Is_stronghold,
    NOGARLIC, IRONBARS, IS_ALTAR, DISPLACED, W_NONDIGGABLE,
    IS_WATERWALL, LAVAWALL, Is_waterlevel, POOL, MOAT, WATER, LAVAPOOL,
    M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE,
    MSLOW, MFAST, STRAT_WAITMASK, STRAT_WAITFORU, G_GENOD, PLNMSG_GROWL, HEADSTONE,
    BOLT_LIM, WT_TOOMUCH_DIAGONAL, IS_STWALL, W_NONPASSWALL,
    ROOM, IN_SIGHT, COULD_SEE, is_pit, TT_PIT, In_endgame, Is_earthlevel,
    Is_astralevel, Is_airlevel, Is_firelevel,
    IS_FOUNTAIN,
    ismnum, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD, POISON_RES,
    FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, STONE_RES,
    u_at, isok, TEMPLE, SHOPBASE, MON_FLOOR, MON_OFFMAP, MON_MIGRATING, MON_DETACH,
    MON_LIMBO, MON_OBLITERATE, MON_ENDGAME_MIGR, MIGR_APPROX_XY, MIGR_RANDOM,
    has_emin, has_epri, has_eshk, has_egd, has_edog, EDOG, has_mcorpsenm, MCORPSENM, OBJ_AT,
    Has_contents, RLOC_MSG, RLOC_NOMSG, XKILL_NOMSG,
    NO_MM_FLAGS, NO_NC_FLAGS, EXPL_FIERY, NATTK, PROT_FROM_SHAPE_CHANGERS, NO_WEAPON_WANTED, engulfing_u,
    W_SADDLE, OBJ_MINVENT,
} from './const.js';
import { t_at, m_harmless_trap, water_damage_chain, fire_damage_chain, fixed_tele_trap } from './trap.js';
import {
    nohands, verysmall, throws_rocks, passes_walls, lays_eggs, mons,
    monsterNames, NON_PM, LOW_PM, NUMMONS, NEUTRAL, pmnames,
    mon_knows_traps, tunnels, needspick,
    is_hider, hides_under, M1_SEE_INVIS, humanoid, regenerates,
    is_flyer, is_floater, is_clinger, is_swimmer, likes_lava,
    bigmonst, amorphous, is_whirly, noncorporeal, M1_SLITHY, unsolid,
    dmgtype, passes_bars,
    is_vampshifter, is_male, is_female, is_neuter, likes_gems,
    is_rider, is_displacer, nonliving, breathless, is_giant, is_minion, is_human,
    is_elf, is_dwarf, is_gnome, is_orc, is_undead, amphibious, can_teleport, MR_FIRE,
    MR_POISON, mindless, G_UNIQ, is_watch,
    touch_petrifies, flesh_petrifies, slimeproof, resists_ston, poly_when_stoned, vegan,
    montoostrong, monmax_difficulty,
} from './monsters.js';
import {
    little_to_big, big_to_little, big_little_match, hero_conflict,
    resist_conflict, m_canseeu, on_fire, monsndx,
} from './mondata.js';
import {
    objects_at, sobj_at, kill_egg, place_object, stackobj, delobj, is_metallic,
    is_rustprone, mksobj_at, is_organic, is_mines_prize, is_soko_prize,
    obj_extract_self, nxtobj, splitobj, g_at, add_to_minv,
} from './mkobj.js';
import { gd_move } from './vault.js';
import {
    objectNames, objectDescrs, ROCK_CLASS, SCROLL_CLASS,
} from './generated/objects_data.js';
import { PM_GRID_BUG, PM_TOURIST } from './generated/monsters_data.js';
import { enexto, rloc_to, rloc, tele_restrict, noteleport_level, rloc_to_flag, migrate_to_level, rloco, control_mon_tele, goodpos } from './teleport.js';
import { may_dig, fill_pit } from './dig.js';
import { newsym, pline, pline_mon, pline_The, verbalize, You_feel, sensemon, canseemon, canspotmon, impossible } from './display.js';
import { online2, level_difficulty } from './hacklib.js';
import { worm_cross, level_mon_at, remove_worm, place_wsegs, count_wsegs } from './worm.js';
import { On_W_tower_level, In_W_tower } from './dungeon.js';
import { Monnam, mon_nam, hliquid, pmname, mon_pmname, Mgender, s_suffix } from './do_name.js';
import { cansee, couldsee, does_block, is_lightblocker_mappear, unblock_point, vision_recalc } from './vision.js';
import { fightm, mondead, mondied, grow_up, mon_to_stone, monstone } from './mhitm.js';
import { remove_monster, place_monster } from './steed.js';
import { engr_at, del_engr_at } from './engrave.js';
import { visible_region_at, is_poisoncloud_region } from './region.js';
import { were_change } from './were.js';
import {
    set_mimic_sym, newcham, pickvampshape, pm_to_cham, neweshk, newegd,
    newemin, newepri, newedog, freemcorpsenm, mpickobj, makemon, makemon_appear_msg,
} from './makemon.js';
import { in_your_sanctuary, p_coaligned, ghod_hitsu } from './priest.js';
import { in_rooms, is_pool, is_lava, disturb_buried_zombies, stop_occupation } from './hack.js';
import { inv_weight, weight_cap } from './invent.js';
import { maybe_m_dowear_special, extract_from_minvent, update_mon_extrinsics, mon_set_minvis, which_armor } from './worn.js';
import { adjalign } from './attrib.js';
import { SetVoice } from './sndprocs.js';
import { maybe_gasp, growl } from './sounds.js';
import { vtense, doname, distant_name, makeplural, xname, The } from './objnam.js';
import { obj_resists, cursed_object_at, finish_meating, quickmimic } from './dogmove.js';
import { touch_artifact } from './artifact.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { hastrack } from './track.js';
import { MON_WEP } from './weapon.js';
import { is_axe, is_pick, GOLD } from './objects.js';
import { get_mleash } from './apply.js';
import { ofood, polyfood } from './eat.js';
import { mcureblindness, removed_from_icebox } from './muse.js';
import { unpunish } from './read.js';
import { explode } from './explode.js';
import { flooreffects } from './do.js';
import { surface } from './sit.js';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_SMALL_MIMIC = monsterNames.indexOf('PM_SMALL_MIMIC');
const PM_LARGE_MIMIC = monsterNames.indexOf('PM_LARGE_MIMIC');
const PM_GIANT_MIMIC = monsterNames.indexOf('PM_GIANT_MIMIC');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_WRAITH = monsterNames.indexOf('PM_WRAITH');
const PM_NURSE = monsterNames.indexOf('PM_NURSE');
const PM_PYROLISK = monsterNames.indexOf('PM_PYROLISK');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_ERINYS = monsterNames.indexOf('PM_ERINYS');
const PM_PURPLE_WORM = monsterNames.indexOf('PM_PURPLE_WORM');
const PM_BABY_PURPLE_WORM = monsterNames.indexOf('PM_BABY_PURPLE_WORM');
const PM_SHRIEKER = monsterNames.indexOf('PM_SHRIEKER');
/** C monflag.h MS_SHRIEK — wakes up others. */
const MS_SHRIEK = 18;
/** C monattk.h AT_GAZE. */
const AT_GAZE = 15;
const PM_AIR_ELEMENTAL = monsterNames.indexOf('PM_AIR_ELEMENTAL');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_EARTH_ELEMENTAL = monsterNames.indexOf('PM_EARTH_ELEMENTAL');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');
const PM_HEZROU = monsterNames.indexOf('PM_HEZROU');
const PM_VROCK = monsterNames.indexOf('PM_VROCK');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_RUST_MONSTER = monsterNames.indexOf('PM_RUST_MONSTER');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
const RIN_SLOW_DIGESTION = objectNames.indexOf('RIN_SLOW_DIGESTION');
const ROCK = objectNames.indexOf('ROCK');
const AT_BREA = 12; // C monattk.h
const AD_DRST = 7;
const AD_RBRE = 242;
const AD_RUST = 24;
const AD_CORR = 42;
const EGG = objectNames.indexOf('EGG');
const TIN = objectNames.indexOf('TIN');
const CORPSE = objectNames.indexOf('CORPSE');
const CARROT = objectNames.indexOf('CARROT');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const GLOB_OF_GREEN_SLIME = objectNames.indexOf('GLOB_OF_GREEN_SLIME');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const SADDLE = objectNames.indexOf('SADDLE');
const NC_SHOW_MSG = 1;

/** C ref: monmove.c closed_door — IS_DOOR && (CLOSED|LOCKED). */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C ref: mon.c mdistu — squared distance to hero. */
export function mdistu(mtmp) {
    return dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy);
}

/** C ref: hack.c may_passwall — STWALL + W_NONPASSWALL blocks. Exported for
 * hack.c test_move (same C body; teleport.js keeps its D-1100 local copy). */
export function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C: wall_info aliases flags; OR JS split W_* fields (D-0865).
    const wi = (loc.wall_info | 0) | (loc.flags | 0);
    return !(IS_STWALL(loc.typ) && (wi & W_NONPASSWALL));
}

/**
 * C ref: hack.c bad_rock — obstructed (or Sokoban boulder) the form
 * cannot dig or pass through.
 */
export function bad_rock(mdat, x, y) {
    const Sokoban = !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban
        || game.Sokoban);
    if (Sokoban) {
        for (let o = objects_at(x, y); o; o = o.nexthere) {
            if (o.otyp === BOULDER) return true;
        }
    }
    const loc = game.level?.at(x, y);
    if (!loc || !IS_OBSTRUCTED(loc.typ)) return false;
    if ((!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
        && !(passes_walls(mdat) && may_passwall(x, y))) {
        return true;
    }
    return false;
}

/**
 * C ref: hack.c cant_squeeze_thru — nonzero = cannot fit a tight diagonal.
 * 1=too big, 2=load, 3=Sokoban (hero only). Returns 0 if can squeeze.
 * Named omission: can_fog (vampshifter) for bigmonst exemption.
 */
export function cant_squeeze_thru(mon) {
    const ptr = mon?.data;
    const is_u = mon === game.youmonst;
    // C: (mon == &youmonst) ? Passes_walls : passes_walls(ptr)
    if (is_u) {
        const u = game.u;
        if (u?.Passes_walls || u?.HPasses_walls || u?.EPasses_walls) return 0;
    } else if (passes_walls(ptr)) {
        return 0;
    }
    const slithy = !!((ptr?.mflags1 ?? 0) & M1_SLITHY);
    // Named omission: can_fog(mon) — treat as false until exported.
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
            || slithy /* || can_fog(mon) */)) {
        return 1;
    }
    // C: hero uses inv_weight()+weight_cap(); mon uses curr_mon_load
    let amt;
    if (is_u) {
        amt = inv_weight() + weight_cap();
    } else {
        amt = 0;
        for (let obj = mon.minvent; obj; obj = obj.nobj) {
            if (obj.otyp !== BOULDER || !throws_rocks(ptr)) {
                amt += obj.owt || 0;
            }
        }
    }
    if (amt > WT_TOOMUCH_DIAGONAL) return 2;

    // C: Sokoban restriction applies to hero only
    const Sokoban = !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban
        || game.Sokoban);
    if (is_u && Sokoban) return 3;

    return 0;
}

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
export function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/** C ref: mon.c monlineu — online with where mon thinks hero is. */
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
}

export const NORMAL_SPEED = 12;

const BOULDER = objectNames.indexOf('BOULDER');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const AXE = objectNames.indexOf('AXE');
const BATTLE_AXE = objectNames.indexOf('BATTLE_AXE');
const CLOVE_OF_GARLIC = objectNames.indexOf('CLOVE_OF_GARLIC');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const OTYP_SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const OTYP_LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const OTYP_CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const PM_ANGEL = monsterNames.indexOf('PM_ANGEL');
const PM_MINOTAUR = monsterNames.indexOf('PM_MINOTAUR');

/** C mondata.h immune_poisongas — Hezrou or Vrock (mndx; JS mons() allocs). */
function immune_poisongas(ptr) {
    const n = ptr?.mndx ?? -1;
    return n === PM_HEZROU || n === PM_VROCK;
}

/**
 * C ref: mondata.c attacktype_fordmg — first mattk with aatyp+adtyp.
 * Local clone (eat.js / region.js); cycle if imported from those.
 */
function attacktype_fordmg(ptr, atyp, dtyp) {
    const slots = ptr?.mattk;
    if (!slots) return null;
    for (let i = 0; i < slots.length; i++) {
        const a = slots[i];
        if ((a?.aatyp | 0) === atyp
            && (dtyp === -1 || (a?.adtyp | 0) === dtyp)) {
            return a;
        }
    }
    return null;
}

/** C youprop.h Poison_resistance — H || E || uprops (JS split storage). */
function Poison_resistance() {
    const u = game.u || {};
    const p = u.uprops?.[POISON_RES];
    return !!((u.HPoison_resistance | 0) || (u.EPoison_resistance | 0)
        || u.Poison_resistance
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/** C youprop.h Breathless — magical breathing || breathless(form). */
function Breathless() {
    const u = game.u || {};
    if ((u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || u.Magical_breathing) {
        return true;
    }
    const data = game.youmonst?.data;
    return data ? breathless(data) : false;
}

/**
 * C ref: monst.h resists_poison → Resists_Elem(POISON_RES) subset:
 * data.mresists | mextrinsics | mintrinsics. Artifact/worn grants named.
 */
function resists_poison(mtmp) {
    if (!mtmp || mtmp === game.youmonst) return Poison_resistance();
    const bits = (mtmp.data?.mresists | 0)
        | (mtmp.mextrinsics | 0)
        | (mtmp.mintrinsics | 0);
    return !!(bits & MR_POISON);
}

/**
 * C ref: mon.c m_poisongas_ok — OK / MINOR / BAD. mfndpos treats only
 * OK as willing to enter poisoncloud (MINOR still avoids). region.js
 * keeps a local clone (mon.js imports visible_region_at).
 */
export function m_poisongas_ok(mtmp) {
    const is_you = mtmp === game.youmonst;
    const ptr = mtmp?.data;
    if (nonliving(ptr) || is_vampshifter(mtmp)
        || breathless(ptr) || immune_poisongas(ptr)) {
        return M_POISONGAS_OK;
    }
    const u = game.u || {};
    const px = is_you ? (u.ux | 0) : (mtmp.mx | 0);
    const py = is_you ? (u.uy | 0) : (mtmp.my | 0);
    if ((ptr?.mlet === 'S_EEL' || Is_waterlevel(u.uz)) && is_pool(px, py)) {
        return M_POISONGAS_OK;
    }
    if (attacktype_fordmg(ptr, AT_BREA, AD_DRST)
        || attacktype_fordmg(ptr, AT_BREA, AD_RBRE)) {
        return M_POISONGAS_OK;
    }
    if (is_you && (u.uinvulnerable || Breathless() || u.uinwater)) {
        return M_POISONGAS_OK;
    }
    if (is_you ? Poison_resistance() : resists_poison(mtmp)) {
        return M_POISONGAS_MINOR;
    }
    return M_POISONGAS_BAD;
}

/**
 * C ref: monmove.c onscary — mfndpos Elbereth / scare-scroll / altar-vamp.
 * Named omissions: is_lminion; unique_corpstat human-resist; auditory
 * <0,0> only used from music; shopkeeper/priest own-shop temple resist;
 * sengr_at fuzzy match (exact "Elbereth"); Inhell (dungeon hellish).
 */
export function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;
    const ptr = mtmp?.data;
    if (mtmp.iswiz || is_rider(ptr)
        || (ptr?.mndx ?? mtmp.mnum) === PM_ANGEL) {
        return false;
    }
    // is_lminion / unique_corpstat / S_HUMAN magical resist deferred
    if (magical_scare && ptr?.mlet === 'S_HUMAN') return false;
    if ((mtmp.isshk /* && inhishop */) || (mtmp.ispriest /* && inhistemple */)) {
        // own-shop / own-temple resist deferred → fall through
    }
    if (auditory_scare) return true;
    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ)
        && (ptr?.mlet === 'S_VAMPIRE' || is_vampshifter(mtmp))) {
        return true;
    }
    if (sobj_at(SCR_SCARE_MONSTER, x, y)) return true;
    const ep = engr_at(x, y);
    if (ep && String(ep.engr_txt || '') === 'Elbereth') {
        const u = game.u || {};
        const displaced = !!(u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic
            || u.uprops?.[DISPLACED]?.extrinsic);
        const hero_or_image = u_at(x, y)
            || (displaced && mtmp.mux === x && mtmp.muy === y)
            || (!!(ep.guardobjects) && !!objects_at(x, y));
        if (hero_or_image
            && !(mtmp.isshk || mtmp.isgd || !mtmp.mcansee || mtmp.mpeaceful
                || (ptr?.mndx ?? mtmp.mnum) === PM_MINOTAUR
                || In_endgame(u.uz))) {
            return true;
        }
    }
    return false;
}

/** C ref: invent.c m_carrying — first matching otyp in minvent chain. */
export function m_carrying(mon, otyp) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/**
 * C ref: mon.c pet_sanity_check `:56–70` (static) — edog droptime sanity
 * for one pet. C order: has_edog gate, then droptime-in-the-future arm;
 * the `TODO: verify some of the other edog fields` stays a comment like C.
 * C `svm.moves` is `game.moves` (dogmove.js:423 idiom).
 */
async function pet_sanity_check(mtmp, msgarg) {
    if (has_edog(mtmp)) {
        const edog = EDOG(mtmp);

        if ((edog?.droptime | 0) > (game.moves | 0))
            await impossible('insane pet #%d has droptime (%d)'
                             + ' in the future (%d) (%s)',
                             mtmp?.m_id | 0, edog.droptime | 0,
                             game.moves | 0, msgarg);
        /* TODO: verify some of the other edog fields */
    }
}

/**
 * C ref: mon.c sanity_check_single_mon `:72–255` (static) — wizard
 * `#sanity` validation of one monster, in C order: data-pointer range,
 * mnum fixup, HP bounds, dead-monster early return, genocided/tame arms,
 * quest-leader extras, pet/steed/trapped/frozen/hiding/mimic/leash arms.
 * JS adaptations: no real pointers, so the range arm keys on the numeric
 * `data.mndx` (`< LOW_PM`, `> NUMMONS - 1` for `&mons[HIGH_PM]` — HIGH_PM
 * is NUMMONS-1 per dogmove.js:1414) with `0x` hex where C prints `fmt_ptr`
 * (alloc.c:125; D-2375 precedent); `DEADMONSTER` is `(mhp|0) < 1` (do.js
 * idiom); `Protection_from_shape_changers` is the youprop.h:359 macro
 * (`uprops[PROT_FROM_SHAPE_CHANGERS]` intrinsic||extrinsic); `%u`/`%ld`
 * print as `%d` (JS `impossible` formats `%s`/`%d`); `levl[mx][my].typ`
 * is `game.level?.at(mx, my)?.typ` (ball.js idiom). C `panic` (illegal
 * mon data) is a loud throw (lev_json.js precedent: throw ≡ C panic;
 * `panic` itself is an unported own-row callee, end.js:978). The three
 * `#if 0` arms (dead-mon fmon/guard check; mimic inaccessible-location
 * check naming `levltyp_to_name`; leash `distu > 90` check) stay omitted
 * like C. `impossible` is awaited (display.js async). Callers live in
 * unported `mon_sanity_check` (mon.c:258–324, fmon `:265` + migr `:313`
 * sites) — wire when that ships.
 */
async function sanity_check_single_mon(mtmp, chk_geno, msg) {
    const u = game.u || {};
    const mptr = mtmp?.data ?? null;
    let mx = mtmp?.mx | 0, my = mtmp?.my | 0;
    /* C fmt_ptr (alloc.c:125) » 0x hex; JS has no pointer to print. */
    const hex = (n) => '0x' + ((n >>> 0).toString(16));

    if (!mptr || ((mptr.mndx ?? -1) < LOW_PM)
        || ((mptr.mndx ?? NUMMONS) > NUMMONS - 1)) {
        /* most sanity checks issue warnings if they detect a problem,
           but this would be too extreme to keep going */
        throw new Error(`illegal mon data ${hex(mptr?.mndx ?? 0)};`
                        + ` mnum=${mtmp?.mnum | 0} (${msg})`);
        /*NOTREACHED*/
    }
    const mndx = monsndx(mptr);

    if ((mtmp.mnum | 0) !== (mndx | 0)) {
        await impossible('monster mnum=%d, monsndx=%d (%s)',
                         mtmp.mnum | 0, mndx | 0, msg);
        mtmp.mnum = mndx | 0;
    }
    /* check before DEADMONSTER() because dead monsters should still
       have sane mhpmax */
    if ((mtmp.mhpmax | 0) < 1
        /* Gremlins don't obey the (mhpmax >= m_lev) rule so disable
         * this check, at least for the time being.  We could skip it
         * when the cloned flag is set, but the original gremlin would
         * still be an issue.
        || mtmp->mhpmax < (int) mtmp->m_lev
         */
        || (mtmp.mhp | 0) > (mtmp.mhpmax | 0))
        await impossible('%s: level %d %s #%d [%s] has %d cur HP, %d max HP',
                         msg, mtmp.m_lev | 0, pmnames[mndx]?.[NEUTRAL] ?? 'monster',
                         mtmp.m_id | 0, hex(mtmp.m_id), mtmp.mhp | 0, mtmp.mhpmax | 0);
    if ((mtmp.mhp | 0) < 1) {
        /* #if 0 in C: bad if not fmon list or if not vault guard
        if (strcmp(msg, "fmon") || !mtmp->isgd)
            impossible("dead monster on %s; %s at <%d,%d>",
                       msg, mptr->pmnames[NEUTRAL], mx, my); */
        return;
    }
    if (chk_geno && (((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD) !== 0))
        await impossible('genocided %s in play (%s)',
                         pmname(mptr, Mgender(mtmp)), msg);
    if (mtmp.mtame && !mtmp.mpeaceful)
        await impossible('tame %s is not peaceful (%s)',
                         pmname(mptr, Mgender(mtmp)), msg);
    if (mtmp.isshk && !has_eshk(mtmp))
        await impossible('shk without eshk (%s)', msg);
    if (mtmp.ispriest && !has_epri(mtmp))
        await impossible('priest without epri (%s)', msg);
    if (mtmp.isgd && !has_egd(mtmp))
        await impossible('guard without egd (%s)', msg);
    if (mtmp.isminion && !has_emin(mtmp))
        await impossible('minion without emin (%s)', msg);
    /* guardian angel on astral level is tame but has emin rather than edog */
    if (mtmp.mtame) {
        if (!has_edog(mtmp) && !mtmp.isminion)
            await impossible('pet without edog (%s)', msg);
        else
            await pet_sanity_check(mtmp, msg);
    }
    /* steed should be tame and saddled */
    if (mtmp === u.usteed) {
        const nt = !mtmp.mtame ? 'not tame' : 0;

        const ns = !m_carrying(mtmp, SADDLE) ? 'no saddle'
             : !which_armor(mtmp, W_SADDLE) ? 'saddle not worn'
               : 0;
        if (ns || nt)
            await impossible('steed: %s%s%s (%s)',
                             ns ? ns : '', (ns && nt) ? ', ' : '', nt ? nt : '',
                             msg);
    }

    if (mtmp.mtrapped) {
        if (mtmp.wormno) {
            ; /* TODO: how to check worm in trap? */
        } else if (!t_at(mx, my))
            await impossible('trapped without a trap (%s)', msg);
    }
    /* monst->mfrozen is difficult to deal with--it's used for paralysis,
       for temporary sleep, and for being busy (usually donning armor);
       code that sets mfrozen needs to also clear mcanmove, otherwise the
       helpless() test will be unreliable */
    if (mtmp.mfrozen && mtmp.mcanmove)
        await impossible('frozen monster [%s%s] is able to move (%s)',
                         mtmp.mtame ? 'tame ' : mtmp.mpeaceful ? 'peaceful ' : '',
                         pmname(mptr, Mgender(mtmp)), msg);

    /* monster is hiding? */
    if (mtmp.mundetected) {
        let t;

        if (!isok(mx, my)) /* caller will have checked this but not fixed it */
            mx = my = 0;
        if (mtmp === u.ustuck)
            await impossible('hiding monster stuck to you (%s)', msg);
        if (m_at(mx, my) === mtmp && hides_under(mptr) && !OBJ_AT(mx, my))
            await impossible('mon hiding under nonexistent obj (%s)', msg);
        if (mptr.mlet === 'S_EEL'
            && !(is_pool(mx, my) && !Is_waterlevel(u.uz)))
            await impossible('eel hiding %s (%s)',
                             !Is_waterlevel(u.uz) ? 'out of water'
                                                  : 'on Plane of Water', msg);
        if (ceiling_hider(mptr)
            /* normally !accessible would be overridable with passes_walls,
               but not for hiding on the ceiling */
            && (!has_ceiling(u.uz)
                || !([POOL, MOAT, WATER, LAVAPOOL, LAVAWALL].includes(game.level?.at(mx, my)?.typ)
                     || accessible(mx, my))))
            await impossible('ceiling hider hiding %s (%s)',
                             !has_ceiling(u.uz) ? 'without ceiling'
                                                : 'in solid stone',
                             msg);
        if (mtmp.mtrapped && (t = t_at(mx, my)) != null && !is_pit(t.ttyp))
            await impossible('hiding while trapped in a non-pit (%s)', msg);
    } else if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        const mapType = M_AP_TYPE(mtmp);
        const is_mimic = (mptr.mlet === 'S_MIMIC');
        const what = (mapType === M_AP_FURNITURE) ? 'furniture'
                           : (mapType === M_AP_MONSTER) ? 'a monster'
                             : (mapType === M_AP_OBJECT) ? 'an object'
                               : 'something strange';

        if (msg === 'migr') {
            if (mapType !== M_AP_MONSTER)
                await impossible('migrating %s mimicking %s %s',
                                 is_mimic ? 'mimic' : 'monster', what, msg);
        } else {
            const uprot = u.uprops?.[PROT_FROM_SHAPE_CHANGERS];
            if ((uprot?.intrinsic | 0) || (uprot?.extrinsic | 0))
                await impossible(
                    'mimic%s concealed as %s despite Prot-from-shape-changers %s',
                    is_mimic ? '' : 'ker', what, msg);
        }
        /* the Wizard's clone after "double trouble" starts out mimicking
           some other monster; pet's quickmimic effect can temporarily take
           on furniture, object, or monster shape, but only until the pet
           finishes eating a mimic corpse */
        if (!(is_mimic || mtmp.meating
              || (mtmp.iswiz && mapType === M_AP_MONSTER)))
            await impossible('non-mimic (%s) posing as %s (%s)',
                             pmnames[mndx]?.[NEUTRAL] ?? 'monster', what, msg);
        /* mimics who end up in strange locations do still hide while there:
        if (!(accessible(mx, my) || passes_walls(mptr))) {
            ... levltyp_to_name(levl[mx][my].typ) ...
            impossible("mimic%s concealed in inaccessible location: %s (%s)",
                       is_mimic ? "" : "ker", typnam, msg);
        } */
    }
    if (mtmp.mleashed) {
        if (!get_mleash(mtmp))
            await impossible('monst %d: leashed but no leash for %s',
                             mtmp.m_id | 0, mon_pmname(mtmp));
        else if (!mtmp.mtame)
            await impossible('monst %d: leashed but not tame %s',
                             mtmp.m_id | 0, mon_pmname(mtmp));
        /* after hero moves, leashed mon won't necessarily pass 'm_next2u()'
           test; 90 is farthest observed distance ...
        else if (distu(mtmp->mx, mtmp->my) > 90)
            impossible("monst %u: leashed but not next to you (%d)",
                       mtmp->m_id, distu(mtmp->mx, mtmp->my)); */
    }
}

/** C ref: mon.c genus `:469–531`. mode 1 → role; 0 → race prototype. */
export function genus(mndx, mode) {
    const pm = (name) => monsterNames.indexOf(name);
    switch (mndx | 0) {
    case pm('PM_STUDENT'): mndx = mode ? pm('PM_ARCHEOLOGIST') : pm('PM_HUMAN'); break;
    case pm('PM_CHIEFTAIN'): mndx = mode ? pm('PM_BARBARIAN') : pm('PM_HUMAN'); break;
    case pm('PM_NEANDERTHAL'): mndx = mode ? pm('PM_CAVE_DWELLER') : pm('PM_HUMAN'); break;
    case pm('PM_ATTENDANT'): mndx = mode ? pm('PM_HEALER') : pm('PM_HUMAN'); break;
    case pm('PM_PAGE'): mndx = mode ? pm('PM_KNIGHT') : pm('PM_HUMAN'); break;
    case pm('PM_ABBOT'): mndx = mode ? pm('PM_MONK') : pm('PM_HUMAN'); break;
    case pm('PM_ACOLYTE'): mndx = mode ? pm('PM_CLERIC') : pm('PM_HUMAN'); break;
    case pm('PM_HUNTER'): mndx = mode ? pm('PM_RANGER') : pm('PM_HUMAN'); break;
    case pm('PM_THUG'): mndx = mode ? pm('PM_ROGUE') : pm('PM_HUMAN'); break;
    case pm('PM_ROSHI'): mndx = mode ? pm('PM_SAMURAI') : pm('PM_HUMAN'); break;
    case pm('PM_GUIDE'): mndx = mode ? pm('PM_TOURIST') : pm('PM_HUMAN'); break;
    case pm('PM_APPRENTICE'): mndx = mode ? pm('PM_WIZARD') : pm('PM_HUMAN'); break;
    case pm('PM_WARRIOR'): mndx = mode ? pm('PM_VALKYRIE') : pm('PM_HUMAN'); break;
    default:
        if (ismnum(mndx)) {
            const ptr = mons(mndx);
            if (is_human(ptr)) mndx = pm('PM_HUMAN');
            else if (is_elf(ptr)) mndx = pm('PM_ELF');
            else if (is_dwarf(ptr)) mndx = pm('PM_DWARF');
            else if (is_gnome(ptr)) mndx = pm('PM_GNOME');
            else if (is_orc(ptr)) mndx = pm('PM_ORC');
        }
        break;
    }
    return mndx | 0;
}

/** C ref: worn.c which_armor(W_ARMS) — shield blocks two-hand dig tools. */
export function mon_has_shield(mon) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        if ((o.owornmask || 0) & 0x00000008 /* W_ARMS */) return true;
    }
    return false;
}

/**
 * C ref: mon.c mondead — svm.mvitals[mndx].died++ (cap 255).
 * Called from uhitm/mhitm mondead after form restore would run in C.
 */
export function record_mvitals_died(mndx) {
    if (mndx == null || mndx < LOW_PM) return;
    if (!game.mvitals) game.mvitals = [];
    const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
        mvflags: 0, born: 0, died: 0, seen_close: 0, photographed: 0,
    });
    if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
}

/** C youprop.h Blind / Blind_telepat / Hallucination subset for closeup. */
function closeup_Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function closeup_Blind_telepat() {
    const u = game.u || {};
    return !!((u.HTelepat | 0) || (u.ETelepat | 0) || u.Blind_telepat);
}
function closeup_Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
}

/**
 * C ref: mon.c see_monster_closeup — mark mvitals seen_close; camera
 * photo + Tourist EXP for first photograph of each type (D-0999).
 * @param {object} mtmp
 * @param {boolean} photo
 */
export async function see_monster_closeup(mtmp, photo) {
    if (!mtmp) return;
    if (closeup_Hallucination() || (closeup_Blind() && !closeup_Blind_telepat())) {
        return;
    }

    let mndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
    if (M_AP_TYPE(mtmp) === M_AP_MONSTER && !sensemon(mtmp)) {
        mndx = mtmp.mappearance | 0;
    }
    if (mndx === PM_LONG_WORM && game.notonhead) {
        mndx = PM_LONG_WORM_TAIL;
    }

    if (!game.mvitals) game.mvitals = [];
    const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
        mvflags: 0, born: 0, died: 0, seen_close: 0, photographed: 0,
    });
    if (!slot.seen_close) {
        slot.seen_close = 1;
        if (!game.context) game.context = {};
        if (!game.context.lifelist) game.context.lifelist = {};
        game.context.lifelist.total_seen_upclose =
            (game.context.lifelist.total_seen_upclose | 0) + 1;
    }

    // photo: Invis / undetected / non-monster disguise skip
    if (photo && !mtmp.minvis && !mtmp.mundetected
        && (M_AP_TYPE(mtmp) === M_AP_NOTHING
            || M_AP_TYPE(mtmp) === M_AP_MONSTER)) {
        if (M_AP_TYPE(mtmp) === M_AP_MONSTER) {
            mndx = mtmp.mappearance | 0;
        }
        const pslot = game.mvitals[mndx] || (game.mvitals[mndx] = {
            mvflags: 0, born: 0, died: 0, seen_close: 0, photographed: 0,
        });
        if (!pslot.photographed) {
            pslot.photographed = 1;
            if (!game.context) game.context = {};
            if (!game.context.lifelist) game.context.lifelist = {};
            game.context.lifelist.total_photographed =
                (game.context.lifelist.total_photographed | 0) + 1;

            const rolePm = game.urole?.mnum;
            const trueNdx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
            const ctx = game.context;
            if (rolePm === PM_TOURIST
                && ((mtmp.m_id | 0) !== (ctx.startingpet_mid | 0)
                    || mndx !== (ctx.startingpet_typ | 0))
                && mndx === trueNdx) {
                more_experienced(experience(mtmp, 0), 0);
                await newexplevel();
            }
        }
    }
}

/**
 * C ref: mon.c see_nearby_monsters — adjacent canseemon/sensemon →
 * see_monster_closeup(photo=FALSE). Wired from allmain once-per-hero
 * time-passed (D-1000).
 * Named omit: transient_light_cleanup; under_water/under_ground polish.
 */
export async function see_nearby_monsters() {
    if (closeup_Hallucination()
        || (closeup_Blind() && !closeup_Blind_telepat())) {
        return;
    }
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok_xy(x, y)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            let mndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
            if (M_AP_TYPE(mtmp) === M_AP_MONSTER) {
                mndx = mtmp.mappearance | 0;
            }
            if (!game.mvitals) game.mvitals = [];
            const slot = game.mvitals[mndx];
            if (slot?.seen_close) continue;
            // C: canseemon || (mundetected && sensemon)
            if (canseemon(mtmp)
                || (mtmp.mundetected && sensemon(mtmp))) {
                if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
                game.bhitpos.x = x;
                game.bhitpos.y = y;
                game.notonhead = (x !== (mtmp.mx | 0)
                    || y !== (mtmp.my | 0));
                await see_monster_closeup(mtmp, false);
            }
        }
    }
}

// C ref: hack.h NODIAG — only grid bugs
export function NODIAG(monnum) {
    return monnum === PM_GRID_BUG;
}

function pm(name) {
    return monsterNames.indexOf(`PM_${name}`);
}

/**
 * C ref: mon.c can_be_hatched — return corpsenm for a typed egg, or NON_PM.
 * BREEDER_EGG (!rn2(77)) is evaluated left-to-right when lays_eggs is true
 * (except the PM_KILLER_BEE / PM_GARGOYLE fast path).
 */
export function can_be_hatched(mnum) {
    if (mnum === pm('SCORPIUS')) mnum = pm('SCORPION');

    mnum = little_to_big(mnum);
    if (mnum === pm('KILLER_BEE') || mnum === pm('GARGOYLE')
        || (lays_eggs(mons(mnum))
            && (!rn2(77)
                || (mnum !== pm('QUEEN_BEE') && mnum !== pm('WINGED_GARGOYLE'))))) {
        return mnum;
    }
    return NON_PM;
}

/**
 * C ref: mon.c egg_type_from_parent — #sit / learn_egg_type corpsenm.
 * BREEDER_EGG is !rn2(77). `force_ordinary || !BREEDER_EGG` short-circuits
 * the roll when force_ordinary is true (polyself); sit passes FALSE so
 * rn2(77) always runs. Queen bee → killer bee and winged gargoyle →
 * gargoyle unless the 1/77 breeder roll keeps the parent.
 */
export function egg_type_from_parent(mnum, force_ordinary) {
    // C: if (force_ordinary || !BREEDER_EGG) with BREEDER_EGG (!rn2(77))
    if (force_ordinary || rn2(77)) {
        if (mnum === pm('QUEEN_BEE')) mnum = pm('KILLER_BEE');
        else if (mnum === pm('WINGED_GARGOYLE')) mnum = pm('GARGOYLE');
    }
    return mnum;
}

/**
 * C ref: mon.c dead_species — genocided species (egg checks baby form too).
 */
export function dead_species(m_idx, egg) {
    if (m_idx < LOW_PM) return true;
    const alt_idx = egg ? big_to_little(m_idx) : m_idx;
    const mv = game.mvitals || [];
    return !!((mv[m_idx]?.mvflags ?? 0) & G_GENOD)
        || !!((mv[alt_idx]?.mvflags ?? 0) & G_GENOD);
}

/**
 * C ref: mon.c LEVEL_SPECIFIC_NOCORPSE — rogue, !deathdrops, or
 * graveyard+undead+rn2(3). Short-circuit matches C so rn2(3) only
 * runs on the last arm. xkilled goto-cleanup and corpse_chance both
 * call this (C duplicates the check).
 */
export function LEVEL_SPECIFIC_NOCORPSE(mdat) {
    if (Is_rogue_level(game.u?.uz)) return true;
    const lf = game.level?.flags;
    if (!lf?.deathdrops) return true;
    return !!(lf.graveyard && is_undead(mdat) && rn2(3));
}

// C ref: mon.c undead_to_corpse — zombie/mummy/vampire → living species for corpses
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case pm('KOBOLD_ZOMBIE'):
    case pm('KOBOLD_MUMMY'):
        return pm('KOBOLD');
    case pm('DWARF_ZOMBIE'):
    case pm('DWARF_MUMMY'):
        return pm('DWARF');
    case pm('GNOME_ZOMBIE'):
    case pm('GNOME_MUMMY'):
        return pm('GNOME');
    case pm('ORC_ZOMBIE'):
    case pm('ORC_MUMMY'):
        return pm('ORC');
    case pm('ELF_ZOMBIE'):
    case pm('ELF_MUMMY'):
        return pm('ELF');
    case pm('VAMPIRE'):
    case pm('VAMPIRE_LEADER'):
    case pm('HUMAN_ZOMBIE'):
    case pm('HUMAN_MUMMY'):
        return pm('HUMAN');
    case pm('GIANT_ZOMBIE'):
    case pm('GIANT_MUMMY'):
        return pm('GIANT');
    case pm('ETTIN_ZOMBIE'):
    case pm('ETTIN_MUMMY'):
        return pm('ETTIN');
    default:
        return mndx;
    }
}

/**
 * C ref: mon.c zombie_maker — True if mon can convert others into zombies.
 * Cancelled monsters cannot. S_ZOMBIE except ghoul/skeleton; all S_LICH.
 * Compare mndx not pointer: JS mons() allocates a fresh permonst.
 * @param {object|null} mon
 * @returns {boolean}
 */
export function zombie_maker(mon) {
    if (!mon) return false;
    if (mon.mcan) return false;
    const ptr = mon.data;
    if (!ptr) return false;
    switch (ptr.mlet) {
    case 'S_ZOMBIE':
        /* Z-class that are not actually zombies */
        if ((ptr.mndx | 0) === pm('GHOUL') || (ptr.mndx | 0) === pm('SKELETON')) {
            return false;
        }
        return true;
    case 'S_LICH':
        return true;
    }
    return false;
}

/**
 * C ref: mon.c zombie_form — living species → zombie mndx, or NON_PM.
 * Inverse of undead_to_corpse for the zombie half. Ettin is the only
 * S_GIANT that maps to ETTIN_ZOMBIE; S_HUMANOID only dwarf; already
 * S_ZOMBIE stays NON_PM (ghoul/skeleton/zombie keep their corpse).
 * @param {object|null} ptr permonst
 * @returns {number}
 */
export function zombie_form(ptr) {
    if (!ptr) return NON_PM;
    switch (ptr.mlet) {
    case 'S_ZOMBIE':
        return NON_PM;
    case 'S_KOBOLD':
        return pm('KOBOLD_ZOMBIE');
    case 'S_ORC':
        return pm('ORC_ZOMBIE');
    case 'S_GIANT':
        if ((ptr.mndx | 0) === pm('ETTIN')) return pm('ETTIN_ZOMBIE');
        return pm('GIANT_ZOMBIE');
    case 'S_HUMAN':
    case 'S_KOP':
        if (is_elf(ptr)) return pm('ELF_ZOMBIE');
        return pm('HUMAN_ZOMBIE');
    case 'S_HUMANOID':
        if (is_dwarf(ptr)) return pm('DWARF_ZOMBIE');
        break;
    case 'S_GNOME':
        return pm('GNOME_ZOMBIE');
    }
    return NON_PM;
}

export const ALLOW_U = 0x00040000;
export const ALLOW_M = 0x00080000;
export const ALLOW_TM = 0x00100000;
export const ALLOW_TRAPS = 0x00020000;
export const ALLOW_SANCT = 0x20000000;
export const ALLOW_SSM = 0x40000000;
export const OPENDOOR = 0x00400000;
export const UNLOCKDOOR = 0x00800000;
export const BUSTDOOR = 0x01000000;
export const ALLOW_WALL = 0x04000000;
// ALLOW_ROCK imported from const.js (mfndpos.h 0x02000000)

// C ref: mon.c mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data?.mmove ?? NORMAL_SPEED;
    // C: MSLOW / MFAST scale before optional rounding
    if (mon.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    // steed gallop deferred
    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) mmove += NORMAL_SPEED;
    }
    return mmove;
}

/**
 * C ref: monmove.c mon_regen — HP tick + mspec_used; digest_meal=false from
 * mcalcdistress (meating countdown lives in m_move).
 */
function mon_regen(mon, digest_meal) {
    const moves = game.moves | 0;
    if (moves % 20 === 0 || regenerates(mon.data)) {
        // healmon(mon, 1, 0) subset — bump HP only
        if ((mon.mhp | 0) < (mon.mhpmax | 0)) mon.mhp = (mon.mhp | 0) + 1;
    }
    if (mon.mspec_used) mon.mspec_used = (mon.mspec_used | 0) - 1;
    if (digest_meal && mon.meating) {
        mon.meating = (mon.meating | 0) - 1;
        // finish_meating deferred here (m_move path owns it)
    }
}

/**
 * C ref: mon.c decide_to_shapeshift — cham once-per-turn form change.
 * Regular + vampshifter (low-hp revert / fog pickvampshape / vamp shift).
 * Named omissions: mon_has_special Vlad stay in pickvampshape;
 * canseemon uses worm_known when wormno (D-1548). NC_SHOW_MSG is D-1586.
 */
async function decide_to_shapeshift(mon) {
    let ptr = null;
    let mndx;
    const was_female = mon.female ? 1 : 0;
    let dochng = false;

    if (!is_vampshifter(mon)) {
        // regular shapeshifter; ptr stays null
        if (!mon.mspec_used && !rn2(6)) {
            dochng = true;
            mon.mspec_used = 3 + rn2(10);
        }
    } else if (!((mon.mstrategy || 0) & STRAT_WAITFORU)) {
        if (mon.data?.mlet !== 'S_VAMPIRE') {
            const mhp = mon.mhp | 0;
            const mhpmax = mon.mhpmax | 0;
            if (mhp <= Math.trunc((mhpmax + 5) / 6) && rn2(4)
                && ismnum(mon.cham)) {
                ptr = mons(mon.cham);
                dochng = true;
            } else if ((mon.data?.mndx | 0) === PM_FOG_CLOUD
                && mhp === mhpmax && !rn2(4)
                && (!canseemon(mon)
                    || mdistu(mon) > BOLT_LIM * BOLT_LIM)) {
                mndx = pickvampshape(mon);
                if (ismnum(mndx)) {
                    ptr = mons(mndx);
                    // C: dochng = (ptr != mon->data). mons() returns a fresh
                    // object each call, so compare mndx (same mons[] slot).
                    dochng = (ptr?.mndx | 0) !== (mon.data?.mndx | 0);
                }
            }
            if (dochng && amorphous(mon.data)
                && closed_door(mon.mx, mon.my)) {
                const new_xy = { x: 0, y: 0 };
                if (enexto(new_xy, mon.mx, mon.my, ptr)) {
                    await rloc_to(mon, new_xy.x, new_xy.y);
                }
            }
        } else {
            const mhp = mon.mhp | 0;
            const mhpmax = mon.mhpmax | 0;
            if (mhp >= Math.trunc((9 * mhpmax) / 10) && !rn2(6)
                && (!canseemon(mon)
                    || mdistu(mon) > BOLT_LIM * BOLT_LIM)) {
                dochng = true; // ptr stays null
            }
        }
    }
    if (dochng) {
        if (await newcham(mon, ptr, NC_SHOW_MSG)) {
            if (is_vampshifter(mon)) {
                ptr = mon.data;
                if (!is_male(ptr) && !is_female(ptr) && !is_neuter(ptr)) {
                    mon.female = was_female;
                }
            }
        }
    }
}

/**
 * C ref: mon.c m_calcdistress — once-per-turn mon timeouts / regen.
 */
async function m_calcdistress(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) < 1) return;
    // C: mmove==0 must still check liquid once/turn (mon.c:1186–1191)
    if ((mtmp.data?.mmove | 0) === 0) {
        if (game.vision_full_recalc) vision_recalc(0);
        if (await minliquid(mtmp)) return;
    }
    mon_regen(mtmp, false);
    if (ismnum(mtmp.cham)) await decide_to_shapeshift(mtmp);
    await were_change(mtmp);
    if (mtmp.mblinded && !(--mtmp.mblinded)) mtmp.mcansee = 1;
    if (mtmp.mfrozen && !(--mtmp.mfrozen)) mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !(--mtmp.mfleetim)) mtmp.mflee = 0;
}

/**
 * C ref: mon.c mcalcdistress — iter_mons over fmon.
 */
export async function mcalcdistress() {
    for (const mtmp of game.fmon || []) {
        await m_calcdistress(mtmp);
    }
}

export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

export function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

/**
 * C ref: mon.c monnear — close enough to move/attack into.
 * Orthogonal (dist2==1) or same square; diagonal (dist2==2) only if
 * not NODIAG (grid bugs cannot act on a diagonal).
 */
export function monnear(mtmp, x, y) {
    const distance = dist2(mtmp.mx, mtmp.my, x, y);
    const monnum = mtmp.mnum ?? mtmp.data?.mndx;
    if (distance === 2 && NODIAG(monnum)) return false;
    return distance < 3;
}

/** C ref: you.h next2u — squared dist to hero ≤ 2. */
function next2u(x, y) {
    return dist2(x, y, game.u.ux, game.u.uy) <= 2;
}

function isok_xy(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/**
 * C ref: monmove.c m_avoid_kicked_loc — peaceful/tame skip hero's kicked square.
 */
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if (!kl || !isok_xy(kl.x, kl.y)) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (!mtmp.mcansee || mtmp.mconf || mtmp.mstun) return false;
    if (game.Conflict || game.flags?.Conflict) return false;
    if (nx !== kl.x || ny !== kl.y) return false;
    return next2u(nx, ny);
}

/**
 * C ref: monmove.c m_avoid_soko_push_loc — Sokoban: peaceful/tame skip a
 * cell when a boulder sits between it and the hero (dist2 == 4).
 */
export function m_avoid_soko_push_loc(mtmp, nx, ny) {
    const Sokoban = !!(game.level?.flags?.sokoban_rules
        || game.level?.flags?.sokoban
        || game.Sokoban);
    if (!Sokoban) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (mtmp.mconf || mtmp.mstun) return false;
    if (hero_conflict()) return false;
    const u = game.u;
    if (!u) return false;
    if (dist2(nx, ny, u.ux, u.uy) !== 4) return false;
    const bx = nx + Math.sign(u.ux - nx);
    const by = ny + Math.sign(u.uy - ny);
    for (let o = objects_at(bx, by); o; o = o.nexthere) {
        if (o.otyp === BOULDER) return true;
    }
    return false;
}

/**
 * C ref: mon.c seemimic — clear disguise; capture is_lightblocker_mappear
 * before M_AP_NOTHING so a discovered wall/door/boulder mimic unblocks
 * unless terrain still does_block. has_mcorpsenm / freemcorpsenm
 * before M_AP_NOTHING (D-1598).
 */
export function seemimic(mtmp) {
    if (!mtmp) return;
    const is_blocker_appear = is_lightblocker_mappear(mtmp);
    if (has_mcorpsenm(mtmp))
        freemcorpsenm(mtmp);
    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.mappearance = 0;
    /*
     *  Discovered mimics don't block light.
     */
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    if (is_blocker_appear
        && !does_block(mx, my, game.level?.at?.(mx, my)))
        unblock_point(mx, my);
    if (mx > 0) newsym(mx, my);
}

/**
 * C ref: mon.c normal_shape `:4430–4462` — cham revert / were / seemimic.
 * Await `newcham(..., NC_SHOW_MSG)` so the shapeshift pline/More
 * finish before `cham=NON_PM` / `mcan` restore / `newsym` (D-1594;
 * C `:4438–4443`). Named: `is_were`/`new_were`; `finish_meating`.
 */
export async function normal_shape(mon) {
    if (!mon) return;
    const mcham = mon.cham;
    if (ismnum(mcham)) {
        const mcan = mon.mcan;
        await newcham(mon, mons(mcham), NC_SHOW_MSG);
        mon.cham = NON_PM;
        if (mcan) mon.mcan = 1;
        newsym(mon.mx | 0, mon.my | 0);
    }
    // is_were / new_were deferred
    if (M_AP_TYPE(mon) !== M_AP_NOTHING) {
        if (!mon.meating) {
            if (M_AP_TYPE(mon) !== M_AP_MONSTER) mon.msleeping = 1;
            seemimic(mon);
        }
        // finish_meating deferred
    }
}

/**
 * C ref: mon.c rescham — iter_mons(normal_shape) when PfSC turns on.
 */
export async function rescham() {
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) <= 0) continue;
        await normal_shape(mon);
    }
}

/**
 * C ref: mon.c m_restartcham — re-allow cham; sleeping mimic re-hide.
 */
function m_restartcham(mtmp) {
    if (!mtmp) return;
    if (!mtmp.mcan) {
        const mndx = mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM;
        mtmp.cham = pm_to_cham(mndx);
    }
    if (mtmp.data?.mlet === 'S_MIMIC' && mtmp.msleeping) {
        set_mimic_sym(mtmp);
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }
}

/**
 * C ref: mon.c restartcham — after removing PfSC protection.
 */
export function restartcham() {
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) <= 0) continue;
        m_restartcham(mon);
    }
}

/**
 * C ref: mon.c peacefuls_respond `:4162–4257`. Nearby peacefuls react
 * when the hero angers one. Watch Halt (is_watch / MS_ARREST) +
 * angry_guards; humanoid gasp/exclaim/flee/anger; same-mlet growl+flee.
 * Caller setmangry `:4317` when !mon_moving. mndx not mons() identity
 * for `mons[quest_info(MS_LEADER)]` / `mons[gu.urole.guardnum]`.
 * Named: tame tameness reduce (qst_guardians_respond ported D-2494).
 */
async function peacefuls_respond(mtmp) {
    const mndx = mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM;
    const ldrnum = game.urole?.ldrnum | 0;
    const guardnum = game.urole?.guardnum | 0;

    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) <= 0) continue; /* DEADMONSTER */
        if (mon === mtmp) continue;

        if (!mindless(mon.data) && mon.mpeaceful
            && couldsee(mon.mx, mon.my) && !mon.msleeping
            && mon.mcansee && m_canseeu(mon)) {
            let buf = '';
            let exclaimed = false;
            let needpunct = false;
            let alreadyfleeing;

            if (humanoid(mon.data) || mon.isshk || mon.ispriest) {
                if (is_watch(mon.data)) {
                    SetVoice(mon, 0, 80, 0);
                    await verbalize("Halt!  You're under arrest!");
                    await angry_guards(!!Deaf_respond());
                } else {
                    if (!Deaf_respond() && !rn2(5)) {
                        const gasp = maybe_gasp(mon);
                        if (gasp) {
                            /* C strncmpi(gasp, "gasp", 4) — Exclam[0] is Gasp! */
                            if (String(gasp).slice(0, 4).toLowerCase() === 'gasp') {
                                buf = `${Monnam(mon)} gasps`;
                                needpunct = true;
                            } else {
                                buf = `${Monnam(mon)} exclaims "${gasp}"`;
                            }
                            exclaimed = true;
                        }
                    }
                    /* shopkeepers and temple priests might gasp in
                       surprise, but they won't become angry here;
                       quest leader will only get angry if hero attacks
                       own quest guardians */
                    if (mon.isshk || mon.ispriest
                        || ((mon.data?.mndx | 0) === ldrnum
                            && (mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM) !== guardnum)) {
                        if (exclaimed) {
                            await pline_mon(mon, `${buf} then shrugs.`);
                        }
                        continue;
                    }

                    if ((mon.data?.mlevel | 0) < rn2(10)
                        /* don't have quest guardians turn to flee */
                        && (mon.data?.mndx | 0) !== guardnum) {
                        alreadyfleeing = !!(mon.mflee || mon.mfleetim);
                        await monflee(mon, rn2(50) + 25, true, !exclaimed);
                        if (exclaimed) {
                            if (game.flags?.verbose !== false && !alreadyfleeing) {
                                buf += ' and then turns to flee.';
                                needpunct = false;
                            }
                        } else {
                            exclaimed = true; /* got msg from monflee() */
                        }
                    }
                    if (buf) {
                        await pline_mon(mon, `${buf}${needpunct ? '.' : ''}`);
                    }
                    if (mon.mtame) {
                        ; /* mustn't set mpeaceful to 0 as below;
                           * perhaps reduce tameness? */
                    } else {
                        mon.mpeaceful = 0;
                        if (mon.mstrategy != null) mon.mstrategy &= ~STRAT_WAITMASK;
                        adjalign(-1);
                        if (!exclaimed) {
                            await pline_mon(mon, `${Monnam(mon)} gets angry!`);
                        }
                    }
                }
            } else if (mon.data?.mlet === mtmp.data?.mlet
                && big_little_match(mndx, mon.data?.mndx ?? mon.mnum ?? NON_PM)
                && !rn2(3)) {
                if (!rn2(4)) {
                    await growl(mon);
                    exclaimed = (game.iflags?.last_msg | 0) === PLNMSG_GROWL;
                }
                if (rn2(6)) {
                    alreadyfleeing = !!(mon.mflee || mon.mfleetim);
                    await monflee(mon, rn2(25) + 15, true, !exclaimed);
                    if (exclaimed && !alreadyfleeing) {
                        /* word like a separate sentence so that we
                           don't have to poke around inside growl() */
                        await pline('And then starts to flee.');
                    }
                }
            }
        }
    }
}

/** C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded (do.js idiom). */
function Blind() {
    const u = game.u || {};
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Hallucination — flat flag or (HHallucination && !resist). */
function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.HHalluc_resistance | 0));
}

/**
 * C ref: mon.c qst_guardians_respond `:4134–4159` (staticfn) — attacking
 * the quest leader angers the peaceful guardians. C order: fmon sweep
 * (DEADMONSTER skip; data match + mpeaceful → clear, canseemon → got_mad),
 * then the Hallucination-gated pline_The with makeplural past one.
 * `&mons[quest_info(MS_GUARDIAN)]` is the mndx-vs-guardnum compare
 * (peacefuls_respond `:1229` urole idiom, no read.js clone);
 * `pmnames[NEUTRAL]` per mon.js:461.
 */
async function qst_guardians_respond() {
    const guardnum = game.urole?.guardnum | 0;
    let got_mad = 0;

    /* guardians will sense this attack even if they can't see it */
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) <= 0) continue; /* DEADMONSTER */
        if ((mon.data?.mndx ?? mon.mnum ?? NON_PM) === guardnum && mon.mpeaceful) {
            mon.mpeaceful = 0;
            if (canseemon(mon)) ++got_mad;
        }
    }
    if (got_mad && !Hallucination()) {
        let who = pmnames[guardnum]?.[NEUTRAL] ?? 'guardian';
        if (got_mad > 1) who = makeplural(who);
        await pline_The(`${who} ${vtense(who, 'appear')} to be angry too...`);
    }
}

/**
 * C ref: mon.c setmangry `:4265–4318` — mtmp gets annoyed at the player.
 * C order: Elbereth hypocrite arm (`:4272–4284`: via_attack + strict
 * sengr_at + onscary/mpeaceful → You_feel + adjalign(-5 or -rnd(5)) +
 * !Blind pline + del_engr_at); mstrategy waitmask clear; !mpeaceful and
 * tame early returns; mpeaceful clear; priest coaligned -5/+2 else -1;
 * humanoid/shk/gd couldsee pline_mon else victim growl (`:4304–4309`,
 * D-2124); quest-leader → qst_guardians_respond (`:4311–4313`);
 * peacefuls_respond when !mon_moving (`:4316–4317`, D-1772).
 * sengr_at strict (engrave.c:250–261) is inline via live engr_at —
 * teleport.js:175 keeps its own module-local clone, no second clone here.
 * onscary is the live same-module export (its own omissions pre-existing).
 */
export async function setmangry(mtmp, via_attack) {
    if (!mtmp) return;
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    if (via_attack) {
        const ep = engr_at(ux, uy);
        const txt = ep ? String(ep.engr_txt?.actual_text ?? ep.engr_txt ?? '') : '';
        if (ep && ep.engr_type !== HEADSTONE && (ep.engr_time | 0) <= (game.moves | 0)
            && txt.toLowerCase() === 'elbereth'
            && (onscary(ux, uy, mtmp) || mtmp.mpeaceful)) {
            await You_feel('like a hypocrite.');
            /* AIS: larger than the usual 1s and 2s; average when already low */
            adjalign(((u.ualign?.record | 0) > 5) ? -5 : -rnd(5));
            if (!Blind()) {
                await pline('The engraving beneath you fades.');
            }
            del_engr_at(ux, uy);
        }
    }

    /* AIS: Should this be in both places, or just in wakeup()? */
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful) return;
    /* [C FIXME: this logic seems wrong; peaceful humanoids gasp or exclaim
       when they see you attack a peaceful monster but they just casually
       look the other way when you attack a pet?] */
    if (mtmp.mtame) return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        if (p_coaligned(mtmp)) adjalign(-5); /* very bad */
        else adjalign(2);
    } else {
        adjalign(-1); /* attacking peaceful monsters is bad */
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        if (couldsee(mtmp.mx, mtmp.my)) {
            await pline_mon(mtmp, `${Monnam(mtmp)} gets angry!`);
        }
    } else {
        await growl(mtmp);
    }

    /* attacking your own quest leader will anger his or her guardians */
    if (game.urole != null
        && (mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM) === (game.urole.ldrnum | 0)) {
        await qst_guardians_respond();
    }

    /* make other peaceful monsters react */
    if (!game.context?.mon_moving) {
        await peacefuls_respond(mtmp);
    }
}

/** C youprop.h Deaf — H||E||uroleplay.deaf (plus u.Deaf flag). */
function Deaf_respond() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C apply.c um_dist — TRUE when Chebyshev dist to hero > n. */
export function um_dist(x, y, n) {
    const u = game.u || {};
    return Math.abs((u.ux | 0) - (x | 0)) > (n | 0)
        || Math.abs((u.uy | 0) - (y | 0)) > (n | 0);
}

/** C monst.h: monmax_difficulty(level_difficulty()) — u.ulevel is inside. */
function monmax_difficulty_lev() {
    return monmax_difficulty(level_difficulty(), game.u?.ulevel | 0);
}

/**
 * C mon.c m_respond_shrieker — pline/stop_occupation if !Deaf; 1/10
 * makemon (1/13 purple worm vs random); always aggravate.
 */
async function m_respond_shrieker(mtmp) {
    if (!Deaf_respond()) {
        await pline(`${Monnam(mtmp)} shrieks.`);
        await stop_occupation();
    }
    if (!rn2(10)) {
        // C: rn2(13) ? NULL : purple/baby via montoostrong(monmax_difficulty_lev)
        const mdat = rn2(13)
            ? null
            : mons(montoostrong(PM_PURPLE_WORM, monmax_difficulty_lev())
                ? PM_BABY_PURPLE_WORM : PM_PURPLE_WORM);
        const summoned = makemon(mdat, 0, 0, NO_MM_FLAGS);
        if (summoned) {
            await makemon_appear_msg(
                summoned, summoned.mx | 0, summoned.my | 0, NO_MM_FLAGS,
            );
        }
    }
    // wizard.js imports mnexto from this file — dynamic to avoid a cycle
    const { aggravate } = await import('./wizard.js');
    aggravate();
}

/**
 * C mon.c m_respond_medusa — first AT_GAZE slot → gazemu (D-1328).
 */
async function m_respond_medusa(mtmp) {
    const atks = mtmp.data?.mattk || [];
    for (let i = 0; i < NATTK; i++) {
        if ((atks[i]?.aatyp | 0) === AT_GAZE) {
            const { gazemu } = await import('./mhitu.js');
            await gazemu(mtmp, atks[i]);
            break;
        }
    }
}

/**
 * C mon.c m_respond — monster responds to player action (not passive).
 * Callers: monmove.c dochug; zap.c boomhit / bhitm.
 * Named omit: qst_guardians_respond (setmangry). peacefuls_respond is
 * D-1772. Compare mndx, not mons() identity (D-0928).
 */
export async function m_respond(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if ((mtmp.data?.msound | 0) === MS_SHRIEK
        && !um_dist(mtmp.mx, mtmp.my, 1)) {
        await m_respond_shrieker(mtmp);
    }
    if ((mtmp.data?.mndx | 0) === PM_MEDUSA
        && couldsee(mtmp.mx, mtmp.my)) {
        await m_respond_medusa(mtmp);
    }
    // Erinyes will inform surrounding monsters of your crimes
    if ((mtmp.data?.mndx | 0) === PM_ERINYS
        && !mtmp.mpeaceful && m_canseeu(mtmp)) {
        const { aggravate } = await import('./wizard.js');
        aggravate();
    }
}

/**
 * C ref: mon.c wake_nearto_core — clear sleep/wait in radius.
 * Named omissions: wake_msg when msleeping already
 * cleared by sync callers. Buried zombies via disturb_buried_zombies
 * (D-1214).
 * @param {boolean} [petcall=false] — whistle: set EDOG.whistletime + clear track
 */
async function wake_nearto_core(x, y, distance, petcall = false) {
    const mon_moving = !!(game.context?.mon_moving);
    for (const m of game.fmon || []) {
        if (!m || m.mx == null || (m.mhp | 0) <= 0) continue;
        if (distance === 0 || dist2(m.mx, m.my, x, y) < distance) {
            await wake_msg(m, false);
            m.msleeping = 0;
            if (!((m.data?.geno | 0) & G_UNIQ) && m.mstrategy != null) {
                m.mstrategy &= ~STRAT_WAITMASK;
            }
            if (mon_moving || !petcall) continue;
            if (m.mtame) {
                if (!m.isminion) {
                    if (!m.edog) m.edog = {};
                    m.edog.whistletime = game.moves | 0;
                }
                // C: mon_track_clear(mtmp)
                if (m.mtrack) {
                    for (let j = 0; j < m.mtrack.length; j++) {
                        m.mtrack[j] = { x: 0, y: 0 };
                    }
                }
            }
        }
    }
    disturb_buried_zombies(x, y);
}

/**
 * C ref: mon.c wake_nearto — wake_nearto_core(..., FALSE).
 */
export async function wake_nearto(x, y, distance) {
    await wake_nearto_core(x, y, distance, false);
}

/**
 * C ref: mon.c wake_nearby — wake_nearto_core(u, ulevel*20, petcall).
 * Whistle uses petcall=TRUE for EDOG.whistletime (D-1007).
 */
export async function wake_nearby(petcall = false) {
    const u = game.u || {};
    await wake_nearto_core(u.ux | 0, u.uy | 0, ((u.ulevel | 0) * 20) | 0, !!petcall);
}

const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');

/**
 * C ref: mon.c wake_msg — "X wakes up[!.]" when msleeping && canseemon.
 * interesting (via_attack) → '!'; flesh golem → " It's alive!".
 */
export async function wake_msg(mtmp, interesting) {
    if (!mtmp?.msleeping || !canseemon(mtmp)) return;
    const punct = interesting ? '!' : '.';
    const alive = (mtmp.mnum | 0) === PM_FLESH_GOLEM ? " It's alive!" : '';
    await pline(`${Monnam(mtmp)} wakes up${punct}${alive}`);
}

/**
 * C ref: mon.c wakeup — clear sleep / non-monster disguise; via_attack → setmangry.
 * C `finish_meating(mtmp)` runs unconditionally after the mimic/undetected
 * block (D-2417: hero missing the mid-meal Knight pony ends the meal via
 * missum → wakeup, so dog_invent rates the apple next turn).
 * Named omissions: none on this path (ghod_hitsu live, D-2474).
 */
export async function wakeup(mtmp, via_attack) {
    if (!mtmp) return;
    const was_sleeping = !!mtmp.msleeping;
    // C: wake_msg before clearing msleeping (D-0928 #1161)
    await wake_msg(mtmp, via_attack);
    mtmp.msleeping = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        if (M_AP_TYPE(mtmp) !== M_AP_MONSTER) seemimic(mtmp);
    } else if (game.context?.forcefight && !game.context?.mon_moving
        && mtmp.mundetected) {
        mtmp.mundetected = 0;
        if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
    }
    // C: unconditional finish_meating (ends quickmimic meals too)
    finish_meating(mtmp);
    if (via_attack) {
        const was_peaceful = !!mtmp.mpeaceful;
        // C: was_sleeping → growl → wake_nearto (D-0922/#1161)
        if (was_sleeping) {
            await growl(mtmp);
        }
        await setmangry(mtmp, true);
        if (was_peaceful) {
            // C mon.c:4357 — priest in temple: god smites (before shk arm)
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE))
                await ghod_hitsu(mtmp);
            if (mtmp.isshk && !(game.u?.ushops && String(game.u.ushops).length)) {
                const { hot_pursuit } = await import('./shk.js');
                hot_pursuit(mtmp);
            }
        }
    }
}

/** C invent.c plur — "s" when n !== 1. */
function plur(n) {
    return (n | 0) !== 1 ? 's' : '';
}

/** C you.h m_next2u — squared dist ≤ 2. */
function m_next2u_angry(mtmp) {
    const u = game.u;
    if (!u || !mtmp) return false;
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return (dx * dx + dy * dy) <= 2;
}

/**
 * C ref: mon.c angry_guards — wake/hostile all peaceful watchmen.
 * @param {boolean} silent skip pline/You_hear when true
 * @returns {Promise<boolean>} true if any watch became angry
 */
export async function angry_guards(silent) {
    let ct = 0;
    let nct = 0;
    let sct = 0;
    let slct = 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (!is_watch(mtmp.data) || !mtmp.mpeaceful) continue;
        ct++;
        if (canspotmon(mtmp) && mtmp.mcanmove) {
            if (m_next2u_angry(mtmp)) nct++;
            else sct++;
        }
        if (mtmp.msleeping || (mtmp.mfrozen | 0)) {
            slct++;
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
        }
        mtmp.mpeaceful = 0;
    }
    if (!ct) return false;
    if (!silent) {
        if (slct) {
            const buf = `guard${plur(slct)}`;
            await pline(`The ${buf} ${vtense(buf, 'wake')} up.`);
        }
        if (nct) {
            const buf = `guard${plur(nct)}`;
            await pline(`The ${buf} ${vtense(buf, 'get')} angry!`);
        } else if (sct) {
            const buf = `guard${plur(sct)}`;
            await pline(
                `${sct === 1 ? 'An angry' : 'Angry'} ${buf} ${vtense(buf, 'are')} approaching!`,
            );
        } else {
            const buf = ct === 1 ? "a guard's" : "guards'";
            const Deaf = !!((game.u?.HDeaf | 0) || (game.u?.EDeaf | 0)
                || game.u?.uroleplay?.deaf || game.u?.Deaf);
            if (!Deaf) {
                await pline(
                    `You hear the shrill sound of ${buf} whistle${plur(ct)}.`,
                );
            }
        }
    }
    return true;
}

export function m_at(x, y) {
    // C: level.monsters[][] — worm segs via place_worm_seg; heads via
    // place_monster (D-1565). Steed is remove_monster'd while mounted.
    // Dead mons stay on fmon until dmonsfree but are off the map grid (C).
    // gulpmm remove_monster leaves mx/my; JS marks MON_OFFMAP so this
    // skip matches C's empty grid cell (D-1231). Stale grid heads
    // (mx/my-only movement) are ignored by level_mon_at.
    const seg = level_mon_at(x, y);
    if (seg) return seg;
    const list = game.fmon || [];
    const steed = game.u?.usteed;
    for (const m of list) {
        if (m === steed) continue;
        if ((m.mhp | 0) <= 0) continue; // DEADMONSTER — not on map
        if ((m.mstate | 0) & MON_OFFMAP) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/** C ref: dungeon.c ledger_no — local copy (avoid mon↔do cycle). */
function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

/** C ref: questpgr.c is_quest_artifact — oartifact == urole.questarti. */
function is_quest_artifact(obj) {
    const want = game.urole?.questarti | 0;
    return want !== 0 && (obj?.oartifact | 0) === want;
}

/**
 * C ref: zap.c obj_resists(obj, 0, 0) — invocation/rider TRUE with no rn2;
 * ordinary always consumes rn2(100) then fails (ochance/achance 0).
 */
function obj_resists_00(obj) {
    if (!obj) return false;
    const n = objectNames[obj.otyp];
    if (n === 'AMULET_OF_YENDOR'
        || n === 'SPE_BOOK_OF_THE_DEAD'
        || n === 'CANDELABRUM_OF_INVOCATION'
        || n === 'BELL_OF_OPENING'
        || (n === 'CORPSE' && is_rider(mons(obj.corpsenm)))) {
        return true;
    }
    rn2(100);
    return false;
}

/** C ref: wizard.c mon_has_amulet — local copy (apply.js cycle). */
function mon_has_amulet(mtmp) {
    if (!mtmp || AMULET_OF_YENDOR < 0) return 0;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR) return 1;
    }
    return 0;
}

/** C ref: makemon.c is_home_elemental — local copy (makemon.js cycle). */
function is_home_elemental(ptr) {
    if (ptr?.mlet !== 'S_ELEMENTAL') return false;
    switch (ptr.mndx ?? -1) {
    case PM_AIR_ELEMENTAL:
        return Is_airlevel(game.u?.uz);
    case PM_FIRE_ELEMENTAL:
        return Is_firelevel(game.u?.uz);
    case PM_EARTH_ELEMENTAL:
        return Is_earthlevel(game.u?.uz);
    case PM_WATER_ELEMENTAL:
        return Is_waterlevel(game.u?.uz);
    default:
        return false;
    }
}

function unlink_minvent(mon, obj) {
    if (!mon || !obj) return;
    if (mon.minvent === obj) {
        mon.minvent = obj.nobj || null;
    } else {
        for (let p = mon.minvent; p; p = p.nobj) {
            if (p.nobj === obj) {
                p.nobj = obj.nobj || null;
                break;
            }
        }
    }
    obj.ocarry = null;
}

/**
 * C ref: steal.c mdrop_obj :808–849 — drop one obj from a (possibly dead)
 * monster's inventory onto its floor square.
 * Order: distant_name observe before extract; extract_from_minvent(FALSE,
 * TRUE); tame-saddle no_charge in shop; verbosely pline; flooreffects
 * "fall" gate before place+stack; update_mon_extrinsics when still alive
 * and the obj was worn (saddle removal last — it can throw the rider).
 */
async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx | 0;
    const omy = mon.my | 0;
    const unwornmask = obj.owornmask | 0;
    // C: distant_name(obj, doname) before extract — near observe side effects.
    const obj_name = distant_name(obj, doname);
    // C: extract_from_minvent(mon, obj, FALSE, TRUE); the unlink fallback
    // keeps C's post-state when the obj lacks a MINVENT where-tag.
    extract_from_minvent(mon, obj, false, true);
    unlink_minvent(mon, obj);
    // C steal.c:830–837 — don't charge for an owned saddle on a tame steed
    // dropped in its shop (costly_spot guarantees roomno is not 0).
    if (unwornmask && mon.mtame && (unwornmask & W_SADDLE)
        && !obj.unpaid) {
        const { costly_spot } = await import('./shk.js');
        if (costly_spot(omx, omy)) {
            const roomno = game.level?.at?.(omx, omy)?.roomno | 0;
            const heroRooms = in_rooms(game.u?.ux, game.u?.uy, SHOPBASE) || '';
            if (heroRooms.includes(String.fromCharCode(roomno))) {
                obj.no_charge = 1;
            }
        }
    }
    if (verbosely && cansee(omx, omy)) {
        await pline_mon(mon, `${Monnam(mon)} drops ${obj_name}.`);
    }
    const { flooreffects } = await import('./do.js');
    if (!(await flooreffects(obj, omx, omy, 'fall'))) {
        place_object(obj, omx, omy);
        stackobj(obj);
    }
    // C: saddle removal last — it can throw the rider; extrinsics ran with
    // do_intrinsics=FALSE above, so refresh them here when still alive.
    if ((mon.mhp | 0) > 0 && unwornmask) {
        await update_mon_extrinsics(mon, obj, false, true);
    }
}

/**
 * C ref: steal.c mdrop_special_objs :852–872 — drop Amulet/invocation/Rider/
 * quest arti before migrate or mongone. Ordinary items still burn
 * obj_resists(0,0) rn2(100).
 */
export async function mdrop_special_objs(mon) {
    if (!mon) return;
    for (let obj = mon.minvent; obj; ) {
        const next = obj.nobj;
        if (obj_resists_00(obj) || is_quest_artifact(obj)) {
            if (mon.mx) {
                await mdrop_obj(mon, obj, false);
            } else {
                // C steal.c:865–868 — migrating mon off map: extract + rloco.
                extract_from_minvent(mon, obj, true, true);
                unlink_minvent(mon, obj);
                obj.nobj = null;
                obj.nexthere = null;
                await rloco(obj);
            }
        }
        obj = next;
    }
}

/**
 * C ref: mon.c migrate_mon — unstuck + mdrop_special_objs when on map,
 * then migrate_to_level.
 */
export async function migrate_mon(mtmp, target_lev, xyloc) {
    if ((mtmp.mx | 0)) {
        const { unstuck } = await import('./mhitu.js');
        await unstuck(mtmp);
        await mdrop_special_objs(mtmp);
    }
    migrate_to_level(mtmp, target_lev, xyloc, null);
}

/**
 * C ref: mon.c mpickgold `:1827–1843` — monster picks up floor gold at its
 * feet: extract + add_to_minv; when seen, newsym, plus a verbose
 * non-guard pline_mon with the gold-vs-money material message
 * (GOLD = objclass.h 15, Au). Callers: vault.c gd_move newpos +
 * gd_pick_corridor_gold (same iteration).
 */
export async function mpickgold(mtmp) {
    const gold = g_at(mtmp.mx, mtmp.my);
    if (gold) {
        const mat = game.objects?.[gold.otyp]?.oc_material ?? 0;
        obj_extract_self(gold);
        add_to_minv(mtmp, gold);
        if (cansee(mtmp.mx, mtmp.my)) {
            if ((game.flags?.verbose !== false) && !mtmp.isgd) {
                await pline_mon(
                    mtmp,
                    `${Monnam(mtmp)} picks up some ${mat === GOLD ? 'gold' : 'money'}.`,
                );
            }
            newsym(mtmp.mx, mtmp.my);
        }
    }
}

/**
 * C ref: mon.c m_into_limbo `:3834–3840` — MON_LIMBO then migrate to current
 * ledger with MIGR_APPROX_XY. Callers: deal_with_overcrowding (same file),
 * do.c u_collide_m, teleport.c u_teleport_mon, vault.c clear_fcorr.
 * Sync sites stay deferred: mkmaze.c put_lregion_here (sync level-gen),
 * vault.c wallify/gd_mv_monaway (wallify stub), dog.c losedogs/mon_arrive
 * (failed_arrivals/relmon infra).
 */
export async function m_into_limbo(mtmp) {
    const target_lev = ledger_no(game.u?.uz);
    mtmp.mstate = (mtmp.mstate | 0) | MON_LIMBO;
    await migrate_mon(mtmp, target_lev, MIGR_APPROX_XY);
}

/**
 * C ref: mon.c ok_to_obliterate — Wizard/Rider/emin/epri/eshk/ustuck/usteed
 * must not be chosen as the clog victim.
 */
function ok_to_obliterate(mtmp) {
    if ((mtmp.data?.mndx ?? -1) === PM_WIZARD_OF_YENDOR
        || is_rider(mtmp.data)
        || has_emin(mtmp) || has_epri(mtmp) || has_eshk(mtmp)
        || mtmp === game.u?.ustuck || mtmp === game.u?.usteed) {
        return false;
    }
    return true;
}

/**
 * C ref: mon.c elemental_clog — endgame overcrowding: You_feel besieged
 * (first time, then every 200 moves with rn2(2)); pick a victim to mongone
 * (unstuck + mdrop_special_objs + discard, D-1149) and rloc_to the clogged
 * mon into that cell; else migrate to the previous plane unless already
 * on Astral.
 */
export async function elemental_clog(mon) {
    if (!In_endgame(game.u?.uz)) return;
    let m1 = null;
    let m2 = null;
    let m3 = null;
    let m4 = null;
    let m5 = null;
    let m_lev = 0;
    const msgmv = game._elemental_clog_msgmv | 0;
    const moves = game.moves | 0;
    if (!msgmv || (moves - msgmv) > 200) {
        if (!msgmv || rn2(2)) {
            await You_feel('besieged.');
        }
        game._elemental_clog_msgmv = moves;
    }
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) <= 0 || mtmp === mon) continue;
        if ((mtmp.mx | 0) === 0 && (mtmp.my | 0) === 0) continue;
        if (mon_has_amulet(mtmp) || !ok_to_obliterate(mtmp)) continue;
        if (mtmp.data?.mlet === 'S_ELEMENTAL') {
            if (!is_home_elemental(mtmp.data)) {
                if (!m1) m1 = mtmp;
            } else if (!m2) {
                m2 = mtmp;
            }
        } else if (!mtmp.mtame) {
            if (!m_lev || (mtmp.m_lev | 0) < m_lev) {
                m_lev = mtmp.m_lev | 0;
                m3 = mtmp;
            } else if (!m4) {
                m4 = mtmp;
            }
        } else {
            if (!m5) m5 = mtmp;
            break;
        }
    }
    const victim = m1 || m2 || m3 || m4 || m5 || null;
    if (victim) {
        const mx = victim.mx | 0;
        const my = victim.my | 0;
        victim.mstate = (victim.mstate | 0) | MON_OBLITERATE;
        await mongone(victim);
        await rloc_to(mon, mx, my);
    } else if (!Is_astralevel(game.u?.uz)) {
        const dest = {
            dnum: game.u?.uz?.dnum | 0,
            dlevel: (game.u?.uz?.dlevel | 0) - 1,
        };
        mon.mstate = (mon.mstate | 0) | MON_ENDGAME_MIGR;
        await migrate_mon(mon, ledger_no(dest), MIGR_RANDOM);
    }
}

/**
 * C ref: mon.c deal_with_overcrowding — endgame elemental_clog, else limbo.
 * Callers: minliquid_core failed survivor rloc (lava RLOC_MSG / pool
 * RLOC_NOMSG); mnexto when enexto fails (D-1148).
 */
export async function deal_with_overcrowding(mtmp) {
    if (!mtmp) return;
    if (In_endgame(game.u?.uz)) {
        await elemental_clog(mtmp);
    } else {
        await m_into_limbo(mtmp);
    }
}

/**
 * C ref: mon.c mnexto — place next to hero via enexto + rloc_to_flag.
 * Failed enexto → deal_with_overcrowding (D-1148). Wizard-mode
 * iflags.mon_telecontrol may override dest via control_mon_tele(..., FALSE)
 * then restore savemm on cancel so the hero cell is never forced (D-1173).
 * Default Off: public paths unchanged. RLOC_MSG / STRAT_APPEARMSG appear
 * plines need the flag path (D-0928 #1128).
 */
export async function mnexto(mtmp, rlocflags = 0) {
    if (!mtmp) return;
    const u = game.u;
    if (mtmp === u?.usteed) {
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }
    const mm = { x: 0, y: 0 };
    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok_xy(mm.x, mm.y)) {
        await deal_with_overcrowding(mtmp);
        return;
    }
    /* C: wizard-mode 'montelecontrol'; enexto mm is the default; savemm
     * is a coord copy so a cancelled / hero-cell getpos cannot stick. */
    if (game.iflags?.mon_telecontrol) {
        const savemm = { x: mm.x, y: mm.y };
        if (!(await control_mon_tele(mtmp, mm, rlocflags, false))) {
            mm.x = savemm.x;
            mm.y = savemm.y;
        }
    }
    await rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);
}

/**
 * C ref: mon.c maybe_mnexto `:3998–4017` — like mnexto but dest must be
 * directly accessible (couldsee) and not a grid-bug diagonal.
 * Up to 20 enexto tries; failed enexto returns without relocating.
 * Does not honor iflags.montelecontrol (C comment). Caller
 * dokick.c kick_monster evade (D-1336).
 */
export async function maybe_mnexto(mtmp) {
    if (!mtmp) return;
    const ptr = mtmp.data;
    const u = game.u;
    const diagok = !NODIAG(ptr?.mndx ?? mtmp.mnum ?? -1);
    let tryct = 20;

    do {
        const mm = { x: 0, y: 0 };
        if (!enexto(mm, u.ux, u.uy, ptr)) return;
        if (couldsee(mm.x, mm.y)
            /* don't move grid bugs diagonally */
            && (diagok || mm.x === mtmp.mx || mm.y === mtmp.my)) {
            await rloc_to(mtmp, mm.x, mm.y);
            return;
        }
    } while (--tryct > 0);
}

/**
 * C ref: mon.c mon_leaving_level `:2696–2732` — mon is off the level
 * (migration via mnearto move_other, or death via m_detach): clear
 * mtrapped, unstuck (not swallowing/held), drop the worm body or the
 * grid cell (vault guard may sit at <0,0>), then mundetected clear,
 * mimic unhide, pit fill and newsym on-map, and forget a remembered
 * polearm target. C static. The `#if 0` mx/my zeroing stays out (C
 * keeps the stale coords valid). `m_at` is the rm.h grid read (heads
 * on fmon, segs on _level_monsters — D-1565). Async only because the
 * port's unstuck awaits docrt on swallow release.
 */
export async function mon_leaving_level(mon) {
    const mx = mon.mx | 0, my = mon.my | 0;
    // C mon.c:2699 — levl.monsters[mx][my]==mon. m_at is liveness-filtered
    // (skips mhp<=0; m_detach calls this after mhp=0) and _level_monsters
    // heads go stale on mx/my-only movement (m_at's own comment), so
    // neither map alone matches C's grid. The fmon membership + coords
    // clause covers the death path (dead mons stay on fmon with current
    // coords until dmonsfree); live callers still match via the maps.
    const raw_at = (x, y) => (game._level_monsters?.get(`${x | 0},${y | 0}`) ?? null);
    const onmap = isok(mx, my)
        && (m_at(mx, my) === mon || raw_at(mx, my) === mon
            || ((mon.mx | 0) === mx && (mon.my | 0) === my
                && !(mon.mstate & MON_OFFMAP) && (game.fmon || []).includes(mon)));

    /* to prevent an infinite relobj-flooreffects-hmon-killed loop */
    mon.mtrapped = 0;
    /* dynamic import: mon↔mhitu is a cycle and a static unstuck edge
       breaks graph link; migrate_mon/mongone use this same idiom */
    const { unstuck } = await import('./mhitu.js');
    await unstuck(mon); /* mon is not swallowing or holding you nor held by you */

    /* vault guard might be at <0,0> */
    if (onmap || raw_at(0, 0) === mon) {
        if (mon.wormno) {
            remove_worm(mon);
        } else {
            remove_monster(mx, my);
        }
    }
    if (onmap) {
        mon.mundetected = 0; /* for migration; doesn't matter for death */
        /* unhide mimic in case its shape has been blocking line of sight
           or it is accompanying the hero to another level */
        if (M_AP_TYPE(mon) !== M_AP_NOTHING
            && M_AP_TYPE(mon) !== M_AP_MONSTER) {
            seemimic(mon);
        }
        /* if mon is pinned by a boulder, removing mon lets boulder drop */
        fill_pit(mx, my);
        newsym(mx, my);
    }
    /* if mon is a remembered target, forget it since it isn't here anymore */
    if (game.context?.polearm && mon === game.context.polearm.hitmon) {
        game.context.polearm.hitmon = null;
    }
}

/**
 * C ref: mon.c mnearto `:4031–4085` — relocate mtmp onto (x,y) for the
 * covetous tactics arms: already-there early-out; move_other lifts the
 * occupant off-map first (mx/my zeroed + MON_OFFMAP); goodpos else the
 * enexto/isok fallback (C `&mm` out-param is the {x,y} idiom shared
 * with mnexto); rloc_to_flag; move_other recurses once with FALSE then
 * deal_with_overcrowding. Returns 1, 2 (moved another), or 0. Async:
 * mon_leaving_level / rloc_to_flag / deal_with_overcrowding await.
 */
export async function mnearto(mtmp, x, y, move_other, rlocflags) {
    let othermon = null;
    let newx, newy;
    const mm = { x: 0, y: 0 };
    let res = 1;

    if (mtmp.mx === x && mtmp.my === y && m_at(x, y) === mtmp) {
        return res;
    }

    if (move_other) {
        othermon = m_at(x, y);
        if (othermon) {
            /* take othermon off the map; it might end up immediately
               returning but for the moment it is leaving */
            await mon_leaving_level(othermon);
            othermon.mx = othermon.my = 0; /* 'othermon' is not on the map */
            othermon.mstate |= MON_OFFMAP;
        }
    }

    newx = x;
    newy = y;
    if (!goodpos(newx, newy, mtmp, 0)) {
        /* Actually we have real problems if enexto ever fails.
         * Migrating_mons that need to be placed will cause
         * no end of trouble.
         */
        if (!enexto(mm, newx, newy, mtmp.data) || !isok(mm.x, mm.y)) {
            if (othermon) {
                /* othermon already had its mx, my set to 0 above
                 * and this would shortly cause a sanity check to fail
                 * if we just return 0 here. The caller only possesses
                 * awareness of mtmp, not othermon. */
                await deal_with_overcrowding(othermon);
            }
            return 0;
        }
        newx = mm.x;
        newy = mm.y;
    }
    /* [this doesn't honor the 'montelecontrol' option] */
    await rloc_to_flag(mtmp, newx, newy, rlocflags);

    if (move_other && othermon) {
        res = 2; /* moving another monster out of the way */
        /* 'move_other'==FALSE this time; fail rather than recurse */
        if (!(await mnearto(othermon, x, y, false, rlocflags))) {
            await deal_with_overcrowding(othermon);
        }
    }

    return res;
}

// C ref: mon.c mon_allowflags() — hostile/peaceful + dig/tunnel flags
export function mon_allowflags(mtmp) {
    let allowflags = 0;
    const Conflict = hero_conflict();
    // C: can_open = !(nohands(data) || verysmall(data))
    const can_open = !(nohands(mtmp.data) || verysmall(mtmp.data));
    // C: can_unlock = (can_open && monhaskey) || wiz || rider
    let has_key = false;
    for (let o = mtmp.minvent; o; o = o.nobj) {
        if (o.otyp === OTYP_CREDIT_CARD || o.otyp === OTYP_SKELETON_KEY
            || o.otyp === OTYP_LOCK_PICK) {
            has_key = true;
            break;
        }
    }
    const can_unlock = (can_open && has_key) || !!mtmp.iswiz || is_rider(mtmp.data);
    const doorbuster = is_giant(mtmp.data);
    // C: can_tunnel = tunnels && !Is_rogue_level; needspick hostiles close
    // enough prefer weapon over dig (same gate as m_move).
    let can_tunnel = tunnels(mtmp.data) && !Is_rogue_level(game.u?.uz);
    if (can_tunnel && needspick(mtmp.data)
        && ((!mtmp.mpeaceful || Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8)) {
        can_tunnel = false;
    }
    if (mtmp.mtame) {
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    } else if (mtmp.mpeaceful) {
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    } else {
        allowflags |= ALLOW_U;
    }
    // C: Conflict && !resist_conflict → ALLOW_U (attacks hero)
    if (Conflict && !resist_conflict(mtmp)) {
        allowflags |= ALLOW_U;
    }
    if (mtmp.isshk) allowflags |= ALLOW_SSM;
    if (mtmp.ispriest) allowflags |= ALLOW_SSM | ALLOW_SANCT;
    // C: passes_walls → ALLOW_ROCK|ALLOW_WALL; throws_rocks / m_can_break_boulder → ALLOW_ROCK
    // m_can_break_boulder (wielded dig tool) deferred — named in C-JS-MAP
    if (passes_walls(mtmp.data)) allowflags |= ALLOW_ROCK | ALLOW_WALL;
    if (throws_rocks(mtmp.data)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (doorbuster) allowflags |= BUSTDOOR;
    if (can_open) allowflags |= OPENDOOR;
    if (can_unlock) allowflags |= UNLOCKDOOR;
    // C: passes_bars → ALLOW_BARS unless this mon is u.ustuck carrying the
    // hero (poly'd hero unsolid/verysmall still allowed — not full
    // passes_bars(youmonst.data)).
    if (passes_bars(mtmp.data)
        && (mtmp !== game.u?.ustuck
            || unsolid(game.youmonst?.data)
            || verysmall(game.youmonst?.data))) {
        allowflags |= ALLOW_BARS;
    }
    if (is_minion(mtmp.data) || is_rider(mtmp.data)) {
        allowflags |= ALLOW_SANCT;
    }
    // C: unicorn && !noteleport_level → NOTONL (mfndpos skips online cells).
    if (mtmp.data?.mlet === 'S_UNICORN' && likes_gems(mtmp.data)
        && !noteleport_level(mtmp)) {
        allowflags |= NOTONL;
    }
    if (is_human(mtmp.data) || (mtmp.data?.mndx ?? -1) === PM_MINOTAUR) {
        allowflags |= ALLOW_SSM;
    }
    // C: undead (not ghost) or vampshifter → NOGARLIC
    if ((is_undead(mtmp.data) && mtmp.data?.mlet !== 'S_GHOST')
        || is_vampshifter(mtmp)) {
        allowflags |= NOGARLIC;
    }
    return allowflags;
}

// C ref: mon.c m_in_air — flyer/floater; cling+ceiling mundetected deferred
function m_in_air(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    if (is_flyer(ptr) || is_floater(ptr)) return true;
    return !!(is_clinger(ptr) && mtmp.mundetected);
}

/** C ref: mondata.h cant_drown */
export function cant_drown(ptr) {
    return is_swimmer(ptr) || amphibious(ptr) || breathless(ptr);
}

/** C ref: monst.h resists_fire — mresists|mintrinsics|mextrinsics MR_FIRE. */
function resists_fire(mtmp) {
    const bits = (mtmp?.data?.mresists | 0)
        | (mtmp?.mintrinsics | 0)
        | (mtmp?.mextrinsics | 0);
    return !!(bits & MR_FIRE);
}

/**
 * C ref: mon.c healmon. Monster HP bump + optional max overheal.
 * youmonst healup arm named (potion.js cycle via eat/sit).
 */
export function healmon(mtmp, amt, overheal) {
    if (!mtmp || mtmp === game.youmonst) return 0;
    const oldhp = mtmp.mhp | 0;
    amt |= 0;
    overheal |= 0;
    if (oldhp + amt > (mtmp.mhpmax | 0) + overheal) {
        mtmp.mhpmax = (mtmp.mhpmax | 0) + overheal;
        mtmp.mhp = mtmp.mhpmax | 0;
    } else {
        mtmp.mhp = oldhp + amt;
        if ((mtmp.mhp | 0) > (mtmp.mhpmax | 0)) mtmp.mhpmax = mtmp.mhp | 0;
    }
    return (mtmp.mhp | 0) - oldhp;
}

/**
 * C ref: mon.c meatbox() (`:1352–1381`) — dispose of an eaten container's
 * contents; used for pets and other monsters. A gelatinous-cube eater
 * engulfs the contents (via mpickobj); anything else spills them onto
 * the floor (flooreffects may consume each first). Async only for the
 * spill message and flooreffects (Constitution §2).
 */
export async function meatbox(mon, otmp) {
    // C mon.c:1356 — cube eater engulfs, everything else spills
    const engulf_contents = mon?.data === mons(PM_GELATINOUS_CUBE);
    const x = mon?.mx | 0, y = mon?.my | 0;
    if (!Has_contents(otmp) || !isok(x, y)) return;
    // C mon.c:1363-1367 — visible spill message before unwrapping
    if (!engulf_contents && cansee(x, y)) {
        await pline('%s contents spill out onto the %s.',
            s_suffix(The(distant_name(otmp, xname))), surface(x, y));
    }
    // C mon.c:1368-1379 — unwrap head-first until the box is empty
    let cobj;
    while ((cobj = otmp.cobj)) {
        obj_extract_self(cobj);
        if ((otmp.otyp | 0) === ICE_BOX) removed_from_icebox(cobj);
        if (engulf_contents) {
            mpickobj(mon, cobj);
        } else {
            if (!(await flooreffects(cobj, x, y, ''))) place_object(cobj, x, y);
        }
    }
}

/**
 * C ref: mon.c m_consume_obj() (`:1392–1453`) — monster mtmp consumes
 * object otmp. Non-pet heals up to the object's weight in hp; container
 * contents go through meatbox; ball/chain go through unpunish; otherwise
 * the pre-munch snapshot drives poly/slime newcham, wraith grow_up,
 * petrify, nurse full heal, carrot/blindness cure, pet quickmimic,
 * pyrolisk-egg explode and corpse mon_givit. The object is extracted
 * from any list and freed (delobj); meating is not changed.
 */
export async function m_consume_obj(mtmp, otmp) {
    if (!mtmp || !otmp) return;
    const u = game.u || {};
    const ispet = !!mtmp.mtame;
    // C mon.c:1397-1399 — non-pet heals up to the object's weight in hp
    if (!ispet && (mtmp.mhp | 0) < (mtmp.mhpmax | 0)) {
        healmon(mtmp, game.objects?.[otmp.otyp]?.oc_weight | 0, 0);
    }
    // C mon.c:1400-1401 — eaten container spills/engulfs first
    if (Has_contents(otmp)) await meatbox(mtmp, otmp);
    // C mon.c:1402-1406 — ball/chain: unpunish frees; ball needs delobj too
    if (otmp === u.uball) {
        unpunish();
        delobj(otmp);
    } else if (otmp === u.uchain) {
        unpunish(); // frees uchain
    } else {
        // C mon.c:1408-1420 — snapshot pre-munch state (delobj frees otmp)
        const otyp = otmp.otyp | 0;
        const vis = canseemon(mtmp);
        const corpsenm = otyp === CORPSE ? (otmp.corpsenm | 0) : NON_PM;
        const deadmimic = otyp === CORPSE
            && (corpsenm === PM_SMALL_MIMIC || corpsenm === PM_LARGE_MIMIC
                || corpsenm === PM_GIANT_MIMIC);
        const slimer = otyp === GLOB_OF_GREEN_SLIME;
        const poly = polyfood(otmp);
        // C obj.h:325 mlevelgain — macro expanded (raw corpsenm, not local)
        const grow = ofood(otmp) && ((otmp.corpsenm | 0) === PM_WRAITH);
        // C obj.h:326 mhealup — macro expanded (raw corpsenm, not local)
        const heal = ofood(otmp) && ((otmp.corpsenm | 0) === PM_NURSE);
        const eyes = otyp === CARROT;
        // C mon.c:1384-1386 mstoning — macro expanded (ismnum guards mons[])
        const mstone = ofood(otmp) && ismnum(otmp.corpsenm | 0)
            && flesh_petrifies(mons(otmp.corpsenm | 0));
        delobj(otmp); // munch
        // C mon.c:1422-1426 — polymorph (slime forces the green slime form)
        if (poly || slimer) {
            const ptr = slimer ? mons(PM_GREEN_SLIME) : null;
            newcham(mtmp, ptr, vis ? NC_SHOW_MSG : NO_NC_FLAGS);
        }
        // C mon.c:1427-1431 — wraith level gain (pets cap at mlevel + 15)
        if (grow) {
            if ((ispet && (mtmp.m_lev | 0) < ((mtmp.data?.mlevel | 0) + 15))
                || !ispet) {
                await grow_up(mtmp, null);
            }
        }
        // C mon.c:1432-1441 — petrifying corpse
        if (mstone) {
            if (poly_when_stoned(mtmp.data)) {
                await mon_to_stone(mtmp);
            } else if (!resists_ston(mtmp)) {
                if (vis) {
                    await pline_mon(mtmp, '%s turns to stone!', Monnam(mtmp));
                }
                await monstone(mtmp);
            }
        }
        // C mon.c:1442-1443 — nurse corpse fully heals
        if (heal) healmon(mtmp, mtmp.mhpmax | 0, 0);
        // C mon.c:1444-1445 — carrot/heal cures blindness
        if ((eyes || heal) && !mtmp.mcansee) {
            await mcureblindness(mtmp, canseemon(mtmp));
        }
        // C mon.c:1446-1447 — pet mimic-food snaps back to mimic shape
        if (ispet && deadmimic) await quickmimic(mtmp);
        // C mon.c:1448-1449 — pyrolisk egg detonates (otyp snapshotted:
        // delobj already freed otmp)
        if (otyp === EGG && corpsenm === PM_PYROLISK) {
            await explode(mtmp.mx | 0, mtmp.my | 0, -11, d(3, 6), 0, EXPL_FIERY);
        }
        // C mon.c:1450-1451 — corpse intrinsics for the eater
        if (corpsenm !== NON_PM) await mon_givit(mtmp, mons(corpsenm));
    }
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear_meat(line) {
    const u = game.u || {};
    if (u.Deaf || (u.HDeaf | 0) || (u.EDeaf | 0)
        || u.uroleplay?.deaf || game.flags?.acoustics === false) {
        return;
    }
    await pline(`You hear ${line}`);
}

/**
 * C ref: mon.c meatmetal — non-pet eats the topmost metallic floor object
 * that is not indigestible. 0 nothing, 1 ate, 2 died. Caller:
 * monmove.c postmov OBJ_AT when metallivorous (D-1271).
 * m_consume_obj arms live (meatbox/poly/uball/grow/stone/mon_givit).
 */
export async function meatmetal(mtmp) {
    if (!mtmp || mtmp.mtame) return 0;

    const vis = canseemon(mtmp);
    const verbose = game.flags?.verbose !== false;
    const rustmon = (mtmp.data?.mndx ?? mtmp.mnum) === PM_RUST_MONSTER;

    for (let otmp = objects_at(mtmp.mx, mtmp.my); otmp; otmp = otmp.nexthere) {
        if ((rustmon && !is_rustprone(otmp))
            || ((otmp.otyp | 0) === AMULET_OF_STRANGULATION
                || (otmp.otyp | 0) === RIN_SLOW_DIGESTION)
            || (otmp.opoisoned && !resists_poison(mtmp))) {
            continue;
        }
        if (is_metallic(otmp) && !obj_resists(otmp, 5, 95)
            && (await touch_artifact(otmp, mtmp))) {
            if (rustmon && otmp.oerodeproof) {
                if (vis) {
                    const otmpname = distant_name(otmp, doname);
                    if (verbose) {
                        await pline_mon(
                            mtmp,
                            `${Monnam(mtmp)} eats ${otmpname}!`,
                        );
                    }
                }
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                if (vis) {
                    const otmpname = distant_name(otmp, doname);
                    if (verbose) {
                        await pline_mon(
                            mtmp,
                            `${Monnam(mtmp)} spits ${otmpname} out in disgust!`,
                        );
                    }
                }
            } else {
                if (cansee(mtmp.mx, mtmp.my)) {
                    const otmpname = distant_name(otmp, doname);
                    if (verbose) {
                        await pline_mon(
                            mtmp,
                            `${Monnam(mtmp)} eats ${otmpname}!`,
                        );
                    }
                } else if (verbose) {
                    // C Soundeffect(se_crunching_sound) empty without SND_LIB
                    await You_hear_meat('a crunching sound.');
                }
                mtmp.meating = ((otmp.owt | 0) / 2 | 0) + 1;
                await m_consume_obj(mtmp, otmp);
                if ((mtmp.mhp | 0) < 1) return 2;
                if (rnd(25) < 3) {
                    mksobj_at(ROCK, mtmp.mx, mtmp.my, true, false);
                }
                newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        }
    }
    return 0;
}

/** C ref: obj.h ofood — CORPSE / EGG / TIN. */
function ofood_meat(obj) {
    const t = obj?.otyp | 0;
    return t === CORPSE || t === EGG || t === TIN;
}

/**
 * C ref: mon.c mstoning — ofood + ismnum + flesh_petrifies (Medusa eggs
 * engulf rather than skip; cockatrice corpses are the untouchable arm).
 */
function mstoning_meat(obj) {
    if (!obj || !ofood_meat(obj) || !ismnum(obj.corpsenm)) return false;
    return flesh_petrifies(mons(obj.corpsenm));
}

/** C ref: o_init.c objdescr_is — OBJ_DESCR(objects[otyp]) vs descr. */
function objdescr_is_meat(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/**
 * C ref: mon.c meatobj — non-pet eats organic floor objects and engulfs
 * the rest except rocks/prizes/ball&chain/scare. 0 nothing, 1 ate or
 * engulfed, 2 died (data became null after consume). Caller:
 * monmove.c postmov OBJ_AT when PM_GELATINOUS_CUBE (D-1284).
 * m_consume_obj arms live (meatbox/poly/uball/grow/stone/mon_givit);
 * rider off-level return 3 (C comments unimplemented).
 */
export async function meatobj(mtmp) {
    if (!mtmp || mtmp.mtame) return 0;

    const originalMndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
    let count = 0;
    let ecount = 0;
    let buf = '';
    const verbose = game.flags?.verbose !== false;
    const u = game.u || {};

    for (let otmp = objects_at(mtmp.mx, mtmp.my); otmp; ) {
        const otmp2 = otmp.nexthere;

        if (is_mines_prize(otmp) || is_soko_prize(otmp)) {
            otmp = otmp2;
            continue;
        }

        if ((otmp.otyp | 0) === CORPSE && is_rider(mons(otmp.corpsenm))) {
            const ox = otmp.ox;
            const oy = otmp.oy;
            const { revive_corpse } = await import('./do.js');
            const revived_it = await revive_corpse(otmp);
            newsym(ox, oy);
            if (!revived_it) {
                otmp = otmp2;
                continue;
            }
            break;
        } else if (((otmp.otyp | 0) === CORPSE
                    && touch_petrifies(mons(otmp.corpsenm))
                    && !resists_ston(mtmp))
                   || (otmp.oclass | 0) === ROCK_CLASS
                   || otmp === u.uball || otmp === u.uchain
                   || (otmp.otyp | 0) === SCR_SCARE_MONSTER) {
            otmp = otmp2;
            continue;
        } else if (!is_organic(otmp) || obj_resists(otmp, 5, 95)
                   || !(await touch_artifact(otmp, mtmp))
                   || ((otmp.otyp | 0) === AMULET_OF_STRANGULATION
                       || (otmp.otyp | 0) === RIN_SLOW_DIGESTION)
                   || (otmp.opoisoned && !resists_poison(mtmp))
                   || (mstoning_meat(otmp) && !resists_ston(mtmp))
                   || ((otmp.otyp | 0) === GLOB_OF_GREEN_SLIME
                       && !slimeproof(mtmp.data))) {
            ecount++;
            const otmpname = distant_name(otmp, doname);
            if (ecount === 1) {
                buf = `${Monnam(mtmp)} engulfs ${otmpname}.`;
            } else if (ecount === 2) {
                buf = `${Monnam(mtmp)} engulfs several objects.`;
            }
            obj_extract_self(otmp);
            mpickobj(mtmp, otmp);
        } else {
            count++;
            if (cansee(mtmp.mx, mtmp.my)) {
                const otmpname = distant_name(otmp, doname);
                if (verbose) {
                    await pline_mon(
                        mtmp,
                        `${Monnam(mtmp)} eats ${otmpname}!`,
                    );
                }
                if ((otmp.oclass | 0) === SCROLL_CLASS
                    && objdescr_is_meat(otmp, 'YUM YUM')) {
                    await pline(`Yum${otmp.blessed ? '!' : '.'}`);
                }
            } else {
                // C Soundeffect(se_slurping_sound) empty without SND_LIB
                if (verbose) {
                    await You_hear_meat('a slurping sound.');
                }
            }
            await m_consume_obj(mtmp, otmp);
            const ptr = mtmp.data;
            if (!ptr || (ptr.mndx ?? mtmp.mnum ?? -1) !== originalMndx) {
                return !ptr ? 2 : 1;
            }
        }

        if (mtmp.minvis) newsym(mtmp.mx, mtmp.my);
        otmp = otmp2;
    }

    if (ecount > 0) {
        if (cansee(mtmp.mx, mtmp.my) && verbose && buf) {
            await pline(buf);
        } else if (verbose) {
            await You_hear_meat(
                `${ecount === 1 ? 'a' : 'several'} slurping sound${
                    ecount === 1 ? '' : 's'
                }.`,
            );
        }
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

/**
 * C ref: mon.c meatcorpse — non-pet corpse_eater eats one floor CORPSE
 * (sobj_at skips globs). 0 nothing, 1 ate, 2 died (data became null after
 * consume). Caller: monmove.c postmov OBJ_AT when corpse_eater (D-1285).
 * m_consume_obj arms live (meatbox/poly/uball/grow/stone/mon_givit);
 * rider off-level return 3 (C comments unimplemented).
 */
export async function meatcorpse(mtmp) {
    if (!mtmp || mtmp.mtame) return 0;

    const originalMndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const verbose = game.flags?.verbose !== false;

    for (let otmp = sobj_at(CORPSE, x, y); otmp;
         otmp = nxtobj(otmp, CORPSE, true)) {
        const corpsepm = mons(otmp.corpsenm);
        if (vegan(corpsepm)
            || (flesh_petrifies(corpsepm) && !resists_ston(mtmp))) {
            continue;
        }
        if (is_rider(corpsepm)) {
            const { revive_corpse } = await import('./do.js');
            const revived_it = await revive_corpse(otmp);
            newsym(x, y);
            if (!revived_it) continue;
            break;
        }

        if ((otmp.quan | 0) > 1) {
            otmp = splitobj(otmp, 1) || otmp;
        }

        if (cansee(x, y) && canseemon(mtmp)) {
            const otmpname = distant_name(otmp, doname);
            if (verbose) {
                await pline_mon(
                    mtmp,
                    `${Monnam(mtmp)} eats ${otmpname}!`,
                );
            }
        } else if (verbose) {
            // C Soundeffect(se_masticating_sound) empty without SND_LIB
            await You_hear_meat('a masticating sound.');
        }

        await m_consume_obj(mtmp, otmp);
        const ptr = mtmp.data;
        if (!ptr || (ptr.mndx ?? mtmp.mnum ?? -1) !== originalMndx) {
            return !ptr ? 2 : 1;
        }

        if (mtmp.minvis) newsym(x, y);
        return 1;
    }
    return 0;
}

/** C ref: prop.h res_to_mr — FIRE_RES..STONE_RES → MR_* bit. */
function res_to_mr_mon(r) {
    if (r >= FIRE_RES && r <= STONE_RES) return 1 << (r - 1);
    return 0;
}

/**
 * C ref: mon.c mon_give_prop — MR_* mintrinsics from corpse resist props.
 * Strength / teleport / other hero-only props are ignored.
 */
export async function mon_give_prop(mtmp, prop) {
    let msg = null;
    switch (prop | 0) {
    case FIRE_RES:
        msg = `${Monnam(mtmp)} shivers slightly.`;
        break;
    case COLD_RES:
        msg = `${Monnam(mtmp)} looks quite warm.`;
        break;
    case SLEEP_RES:
        msg = `${Monnam(mtmp)} looks wide awake.`;
        break;
    case DISINT_RES:
        msg = `${Monnam(mtmp)} looks very firm.`;
        break;
    case SHOCK_RES:
        msg = `${Monnam(mtmp)} crackles with static electricity.`;
        break;
    case POISON_RES:
        msg = `${Monnam(mtmp)} looks healthy.`;
        break;
    default:
        return;
    }
    const intrinsic = res_to_mr_mon(prop);
    if (((mtmp.data?.mresists | 0) | (mtmp.mintrinsics | 0)) & intrinsic) {
        msg = null;
    }
    if (intrinsic) mtmp.mintrinsics = (mtmp.mintrinsics | 0) | intrinsic;
    if (canseemon(mtmp) && msg) await pline_mon(mtmp, msg);
}

/**
 * C ref: mon.c mon_givit — maybe grant a resist intrinsic from a corpse.
 * Callers: mhitm.c mdamagem AD_DGST (D-1244); meatobj D-1284.
 */
export async function mon_givit(mtmp, ptr) {
    if (!mtmp) return;
    // C: corpse_intrinsic before DEADMONSTER / stalker (RNG even if unused)
    const { corpse_intrinsic, should_givit } = await import('./eat.js');
    const prop = corpse_intrinsic(ptr);
    const vis = canseemon(mtmp);
    if ((mtmp.mhp | 0) < 1) return;
    if ((ptr?.mndx | 0) === PM_STALKER) {
        if (!mtmp.perminvis || mtmp.invis_blkd) {
            const buf = Monnam(mtmp);
            mon_set_minvis(mtmp, false);
            if (vis) {
                let how;
                if (!canspotmon(mtmp)) how = 'vanishes';
                else if (mtmp.invis_blkd) how = 'seems to flicker';
                else how = 'becomes invisible';
                await pline_mon(mtmp, `${buf} ${how}.`);
            }
        }
        mtmp.mstun = 1;
        return;
    }
    if (prop === 0) return;
    if (!should_givit(prop, ptr)) return;
    await mon_give_prop(mtmp, prop);
}

/**
 * C ref: mon.c minliquid / minliquid_core — liquid compatibility; 1=died.
 * Envelope: gremlin pool/fountain rn2(3)→split_mon + dryup (D-1095);
 * iron-golem inpool rust (D-1117); pool drown mondied vs xkilled (D-1117);
 * lava on_fire / mondead vs xkilled / fire_damage_chain (D-1138);
 * deal_with_overcrowding after failed survivor rloc (D-1148);
 * steed Flying/Levitation gate (mon.c:975–981); engulfing_u drown flush
 * (mon.c:1088–1093); mdrop_special_objs via steal.c mdrop_obj :808–849
 * (distant_name observe, extract_from_minvent, saddle no_charge,
 * flooreffects "fall" gate, update_mon_extrinsics).
 * Named omissions: none new.
 */
export async function minliquid(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return 1;
    // C minliquid:947–956 — sad_feeling for mondead/xkilled, always cleared.
    game.iflags = game.iflags || {};
    game.iflags.sad_feeling = !!(mtmp.mtame && !canseemon(mtmp));
    try {
        return await minliquid_core(mtmp);
    } finally {
        game.iflags.sad_feeling = false;
    }
}

async function minliquid_core(mtmp) {
    const ptr = mtmp.data;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const waterwall = IS_WATERWALL(game.level?.at?.(mx, my)?.typ);
    const inpool = is_pool(mx, my)
        && (!(is_flyer(ptr) || is_floater(ptr)) || Is_waterlevel(game.u?.uz));
    const inlava = is_lava(mx, my)
        && !(is_flyer(ptr) || is_floater(ptr));
    const infountain = IS_FOUNTAIN(game.level?.at?.(mx, my)?.typ);

    // C mon.c:975–981 — Flying/Levitation keeps the steed out of liquid
    // (not water-walking/swimming; on the Plane of Water flight is blocked
    // so the gate fails and the steed takes water effects, as intended).
    // youprop.h:240,253 shape — flat cache or (H||E)&&!B, as in do.js.
    if (mtmp === game.u?.usteed && !waterwall) {
        const u = game.u || {};
        const levitating = !!(u.Levitation
            || (((u.HLevitation | 0) || (u.ELevitation | 0)) && !(u.BLevitation | 0)));
        const flying = !!(u.Flying
            || (((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0)));
        if (levitating || flying) return 0;
    }

    // C minliquid_core:987–992 — gremlin split before iron-golem / lava
    if ((ptr?.mndx ?? -1) === PM_GREMLIN && (inpool || infountain) && rn2(3)) {
        const { split_mon } = await import('./sit.js');
        if (await split_mon(mtmp, null)) {
            const { dryup } = await import('./fountain.js');
            await dryup(mx, my, false);
        }
        if (inpool) {
            await water_damage_chain(mtmp.minvent, false);
        }
        return 0;
    }
    // C minliquid_core:993–1008 — iron golem rusts in pool (D-1117).
    if ((ptr?.mndx ?? -1) === PM_IRON_GOLEM && inpool && !rn2(5)) {
        const dam = d(2, 6);
        if (cansee(mx, my)) {
            await pline(`${Monnam(mtmp)} rusts.`);
        }
        mtmp.mhp = (mtmp.mhp | 0) - dam;
        if ((mtmp.mhpmax | 0) > dam) {
            mtmp.mhpmax = (mtmp.mhpmax | 0) - dam;
        }
        if ((mtmp.mhp | 0) <= 0) {
            await mondied(mtmp);
            if ((mtmp.mhp | 0) <= 0) return 1;
        }
        await water_damage_chain(mtmp.minvent, false);
        return 0;
    }

    if (inlava) {
        // C minliquid_core:1010–1067 — lava unlike pool: on_fire death
        // pline; mon_moving → mondead (no corpse) else xkilled(XKILL_NOMSG);
        // fire-resist −1 hp; survivor fire_damage_chain then rloc (D-1138).
        if (!is_clinger(ptr) && !likes_lava(ptr)) {
            if (can_teleport(ptr) && !(await tele_restrict(mtmp))) {
                if (await rloc(mtmp, RLOC_MSG)) return 0;
            }
            if (!resists_fire(mtmp)) {
                if (cansee(mx, my)) {
                    const dummy = ptr?.mattk?.[0];
                    const how = on_fire(ptr, dummy);
                    const fate = how === 'boiling' ? 'boils away'
                        : how === 'melting' ? 'melts away'
                        : 'burns to a crisp';
                    await pline(`${Monnam(mtmp)} ${fate}.`);
                }
                if (game.context?.mon_moving) {
                    await mondead(mtmp);
                } else {
                    const { xkilled } = await import('./uhitm.js');
                    await xkilled(mtmp, XKILL_NOMSG);
                }
            } else {
                mtmp.mhp = (mtmp.mhp | 0) - 1;
                if ((mtmp.mhp | 0) <= 0) {
                    if (cansee(mx, my)) {
                        await pline(`${Monnam(mtmp)} surrenders to the fire.`);
                    }
                    await mondead(mtmp);
                } else if (cansee(mx, my)) {
                    await pline(`${Monnam(mtmp)} burns slightly.`);
                }
            }
            if ((mtmp.mhp | 0) > 0) {
                if (m_in_air(mtmp)) {
                    /* vampshifter wolf → flyer: skip teleport */
                } else if (likes_lava(ptr)) {
                    /* hypothetical — outer gate already skipped likers */
                } else {
                    await fire_damage_chain(mtmp.minvent, false, false, mx, my);
                    if (!(await rloc(mtmp, RLOC_MSG))) {
                        await deal_with_overcrowding(mtmp);
                    }
                }
                return 0;
            }
            return 1;
        }
    } else if (inpool || waterwall) {
        if ((waterwall || !is_clinger(ptr)) && !cant_drown(ptr)) {
            if (can_teleport(ptr) && !(await tele_restrict(mtmp))) {
                if (await rloc(mtmp, RLOC_MSG)) return 0;
            }
            // C minliquid_core:1081–1109 — drown pline + mondied vs xkilled.
            if (cansee(mx, my)) {
                if (game.context?.mon_moving) {
                    await pline(`${Monnam(mtmp)} drowns.`);
                } else {
                    await pline(`You drown ${mon_nam(mtmp)}.`);
                }
            }
            // C mon.c:1088–1093 — purple worm plucked the hero off a flying
            // steed over water: the inrushing water flushes the hero out.
            if (engulfing_u(mtmp)) {
                await pline(`${Monnam(mtmp)} sinks as ${hliquid('water')} rushes in and flushes you out.`);
            }
            if (game.context?.mon_moving) {
                await mondied(mtmp);
            } else {
                const { xkilled } = await import('./uhitm.js');
                await xkilled(mtmp, XKILL_NOMSG);
            }
            if ((mtmp.mhp | 0) > 0) {
                if (!m_in_air(mtmp)) {
                    await water_damage_chain(mtmp.minvent, false);
                    if (!(await rloc(mtmp, RLOC_NOMSG))) {
                        await deal_with_overcrowding(mtmp);
                    }
                }
                return 0;
            }
            return 1;
        }
    } else if (ptr?.mlet === 'S_EEL' && !Is_waterlevel(game.u?.uz)
        && !breathless(ptr)) {
        if ((mtmp.mhp | 0) > 1 && rn2(mtmp.mhp | 0) > rn2(8)) {
            mtmp.mhp = (mtmp.mhp | 0) - 1;
        }
        // C: monflee(mtmp, 2, FALSE, FALSE) — includes mon_track_clear
        // so land-crawl track avoid does not burn rn2 after out-of-water flee
        await monflee(mtmp, 2, false, false);
    }
    return 0;
}

// C ref: mondata.h unique_corpstat — G_UNIQ. Exported (was file-local);
// uhitm.c xkilled tame-murder gamelog shares it (no fifth local).
export function unique_corpstat(ptr) {
    return !!((ptr?.geno | 0) & G_UNIQ);
}

/**
 * C ref: mon.c iter_mons `:4527–4540` — call vfunc for every living
 * on-level monster. DEADMONSTER is `mhp < 1`; fmon is a JS array (no nmon
 * unlink hazard), so the C mtmp2 snapshot is the loop itself.
 */
export async function iter_mons(vfunc) {
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) < 1 || mon_offmap(mtmp)) continue;
        await vfunc(mtmp);
    }
}

/**
 * C ref: mon.c anger_quest_guardians `:3072–3077` (staticfn) — anger the
 * quest guards on the level. Guard comparison by mndx (mon.js:1016 idiom);
 * setmangry is async.
 */
export async function anger_quest_guardians(mtmp) {
    const guardnum = game.urole?.guardnum | 0;
    if ((mtmp.data?.mndx ?? mtmp.mnum ?? NON_PM) === guardnum) {
        await setmangry(mtmp, true);
    }
}

// C ref: mon.c mm_2way_aggression `:2387–2420` — the two-way half of
// mm_aggression (W tower inside/outside gate + zombie-maker vs zombifiable).
// C is staticfn; JS keeps it file-local like NODIAG/may_passwall.
function mm_2way_aggression(magr, mdef) {
    if (On_W_tower_level(game.u?.uz)) {
        // C: In_W_tower(u.ux,u.uy) ? (either mon outside) : (either mon inside)
        if (In_W_tower(game.u?.ux, game.u?.uy, game.u?.uz)
            ? (!In_W_tower(magr?.mx, magr?.my, game.u?.uz)
                || !In_W_tower(mdef?.mx, mdef?.my, game.u?.uz))
            : (In_W_tower(magr?.mx, magr?.my, game.u?.uz)
                || In_W_tower(mdef?.mx, mdef?.my, game.u?.uz)))
            return 0;
    }
    // C: liches/zombies vs things that can be zombified (Castle + unique
    // + both-mgenmklev gates; balance/flavor comment in C).
    if (zombie_maker(magr) && zombie_form(mdef?.data) !== NON_PM) {
        if (magr?.mgenmklev && mdef?.mgenmklev)
            return 0;
        if (!Is_stronghold(game.u?.uz)
            && !unique_corpstat(magr?.data) && !unique_corpstat(mdef?.data))
            return (ALLOW_M | ALLOW_TM);
    }
    return 0;
}

// C ref: mon.c mm_aggression `:2428–2447` — monster-vs-monster attack grant.
// C is staticfn; JS keeps it file-local. monsndx ≡ data.mndx (mons()
// allocates, so pointer equality is mndx equality).
function mm_aggression(magr, mdef) {
    const mndx = ((magr?.data?.mndx ?? magr?.mnum ?? NON_PM) | 0);

    // C: don't allow pets to fight each other
    if (magr?.mtame && mdef?.mtame)
        return 0;

    // C: purple worms are attracted to shrieking (eat shriekers)
    if ((mndx === PM_PURPLE_WORM || mndx === PM_BABY_PURPLE_WORM)
        && ((mdef?.data?.mndx ?? mdef?.mnum ?? NON_PM) | 0) === PM_SHRIEKER)
        return ALLOW_M | ALLOW_TM;
    return (mm_2way_aggression(magr, mdef) | mm_2way_aggression(mdef, magr));
}

// C ref: mon.c mm_displacement `:2451–2472` — barging (displacer) grant.
// C is staticfn; JS keeps it file-local.
function mm_displacement(magr, mdef) {
    const pa = magr?.data, pd = mdef?.data;

    // C comment verbatim: if attacker can't barge through there's nothing
    // to do; or if defender can barge too and is at least as high level,
    // don't let attacker do so (else they just swap places again).
    if (is_displacer(pa) && (!is_displacer(pd) || (magr?.m_lev | 0) > (mdef?.m_lev | 0))
        // C: no displacing grid bugs diagonally
        && !(magr?.mx !== mdef?.mx && magr?.my !== mdef?.my
            && NODIAG((pd?.mndx ?? NON_PM) | 0))
        // C: no displacing trapped monsters or multi-location longworms
        && !mdef?.mtrapped && (!mdef?.wormno || !count_wsegs(mdef))
        // C: riders can move anything; others, same size or smaller only
        && (is_rider(pa) || (pa?.msize ?? 0) >= (pd?.msize ?? 0)))
        return ALLOW_MDISP;
    return 0;
}

// C ref: mon.c mfndpos() — neighbour scan; ALLOW_DIG rock/tree + thrudoor
// Named omissions still:
// can_fog in cant_squeeze_thru;
// Inhell Elbereth; m_can_break_boulder.
// passes_bars / ALLOW_BARS rust/corr/metallivore is D-1258.
export function mfndpos(mon, data, flag) {
    const x = mon.mx;
    const y = mon.my;
    let cnt = 0;
    data.cnt = 0;
    data.poss = data.poss || [];
    data.info = data.info || [];

    const nowloc = game.level?.at(x, y);
    const nowtyp = nowloc?.typ;
    const nowdm = nowloc?.doormask || 0;
    const nodiag = NODIAG(mon.mnum ?? mon.data?.mndx);
    const mdat = mon.data;

    // C: wantpool / poolok / lavaok — land monsters skip pool/lava neighbours.
    // poolok is computed once; eel nexttry only clears wantpool (mon.c).
    let wantpool = mdat?.mlet === 'S_EEL';
    const poolok = ((!Is_waterlevel(game.u?.uz) && m_in_air(mon))
        || (is_swimmer(mdat) && !wantpool));
    let lavaok = m_in_air(mon) || likes_lava(mdat);
    if ((mdat?.mndx ?? -1) === PM_FLOATING_EYE) lavaok = false;

    let rockok = false;
    let treeok = false;
    // C: thrudoor = (flag & (ALLOW_WALL|BUSTDOOR)) != 0; dig may set too
    let thrudoor = !!(flag & (ALLOW_WALL | BUSTDOOR));
    if (flag & ALLOW_DIG) {
        // C mon.c mfndpos — !needspick → both; cursed wielded tool while
        // wanting no weapon → that tool's skill only; else carried tools.
        if (!needspick(mdat)) {
            rockok = true;
            treeok = true;
        } else {
            const mw_tmp = MON_WEP(mon);
            if (mw_tmp && mw_tmp.cursed && (mon.weapon_check | 0) === NO_WEAPON_WANTED) {
                rockok = is_pick(mw_tmp);
                treeok = is_axe(mw_tmp);
            } else {
                rockok = !!(m_carrying(mon, PICK_AXE)
                    || (m_carrying(mon, DWARVISH_MATTOCK) && !mon_has_shield(mon)));
                treeok = !!(m_carrying(mon, AXE)
                    || (m_carrying(mon, BATTLE_AXE) && !mon_has_shield(mon)));
            }
        }
        if (rockok || treeok) thrudoor = true;
    }

    // C: poisongas_ok / in_poisongas at mon's current cell
    // (visible_region_at && glyph == cmap_to_glyph(S_poisoncloud))
    const poisongas_ok = m_poisongas_ok(mon) === M_POISONGAS_OK;
    const in_poisongas = is_poisoncloud_region(visible_region_at(x, y));

    // C: mconf → ALLOW_ALL and clear NOTONL; blind → ALLOW_SSM
    if (mon.mconf) {
        flag |= ALLOW_ALL;
        flag &= ~NOTONL;
    }
    if (!mon.mcansee) flag |= ALLOW_SSM;

    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    // C: monseeu is constant across the neighbour scan
    const Invis = !!(game.u?.Invis);
    const monseeu = !!(mon.mcansee && (!Invis || perceives(mdat)));
    // Displacement for onscary hero-image arm
    const u = game.u || {};
    const DisplacedHero = !!(u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic
        || u.uprops?.[DISPLACED]?.extrinsic);

    // C: nexttry — eels prefer water; if none nearby and not already in
    // pool, retry with wantpool cleared so they crawl over land.
    for (;;) {
        cnt = 0;
        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y) continue;
                const loc = game.level?.at(nx, ny);
                if (!loc) continue;
                const ntyp = loc.typ;
                // C: obstructed unless ALLOW_WALL passwall or diggable rock/tree
                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny))) {
                    continue;
                }
                // C ref: mon.c mfndpos — intelligent peacefuls avoid digging
                // shop/temple walls (D-0865).
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !mindless(mdat) && (mon.mpeaceful || mon.mtame)
                    && (in_rooms(nx, ny, TEMPLE) || in_rooms(nx, ny, SHOPBASE))
                    && !(in_rooms(x, y, TEMPLE) || in_rooms(x, y, SHOPBASE))) {
                    continue;
                }
                // C: IS_WATERWALL && !is_swimmer
                if (IS_WATERWALL(ntyp) && !is_swimmer(mdat)) continue;
                // C: IRONBARS — need ALLOW_BARS; rust/corr cannot eat
                // W_NONDIGGABLE bars (metallivorous may still path there).
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || ((((loc.wall_info | 0) | (loc.flags | 0))
                            & W_NONDIGGABLE)
                            && (dmgtype(mdat, AD_RUST)
                                || dmgtype(mdat, AD_CORR))))) {
                    continue;
                }
                // C mon.c:2232-2238 mfndpos — amorphous or fog-form monsters
                // slip under/through closed doors unless engulfing the hero.
                if (IS_DOOR(ntyp)
                    && !((amorphous(mdat) || can_fog(mon)) && !engulfing_u(mon))) {
                    const dm = loc.doormask || 0;
                    if ((((dm & D_CLOSED) && !(flag & OPENDOOR))
                        || ((dm & D_LOCKED) && !(flag & UNLOCKDOOR)))
                        && !thrudoor) {
                        continue;
                    }
                }
                // C: avoid poison gas when not already in it (glyph == S_poisoncloud)
                {
                    const gas_reg = visible_region_at(nx, ny);
                    if (!poisongas_ok && !in_poisongas && is_poisoncloud_region(gas_reg)) {
                        continue;
                    }
                }
                // C: first diagonal checks — NODIAG + non-broken doors + rogue
                // door-cut + worm_cross consecutive segs (mon.c mfndpos)
                if (nx !== x && ny !== y) {
                    const ndm = loc.doormask || 0;
                    if (nodiag
                        || (IS_DOOR(nowtyp) && (nowdm & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (ndm & ~D_BROKEN))
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp))
                            && Is_rogue_level(game.u?.uz))
                        || (m_at(x, ny) && m_at(nx, y)
                            && worm_cross(x, y, nx, ny)
                            && !m_at(nx, ny)
                            && (nx !== game.u?.ux || ny !== game.u?.uy))) {
                        continue;
                    }
                }
                // C: LAVAWALL — needs lavaok and ALLOW_WALL
                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL) {
                    continue;
                }
                // C: poolok/lavaok outer gate
                if (!((poolok || is_pool(nx, ny) === wantpool)
                    && (lavaok || !is_lava(nx, ny)))) {
                    continue;
                }

                // C: Displacement remaps onscary check to hero cell
                let dispx = nx;
                let dispy = ny;
                if (DisplacedHero && monseeu && mon.mux === nx && mon.muy === ny) {
                    dispx = u.ux;
                    dispy = u.uy;
                }

                let info = 0;
                if (onscary(dispx, dispy, mon)) {
                    if (!(flag & ALLOW_SSM)) continue;
                    info |= ALLOW_SSM;
                }
                if ((nx === game.u.ux && ny === game.u.uy)
                    || (nx === mon.mux && ny === mon.muy)) {
                    if (nx === game.u.ux && ny === game.u.uy) {
                        mon.mux = game.u.ux;
                        mon.muy = game.u.uy;
                    }
                    if (!(flag & ALLOW_U)) continue;
                    info |= ALLOW_U;
                } else {
                    const mtmp2 = m_at(nx, ny);
                    if (mtmp2) {
                        // C ref: mon.c mfndpos `:2299–2317` — MON_AT arm:
                        // mmflag = flag | mm_aggression(mon, mtmp2); ALLOW_M
                        // (+ALLOW_TM for tame defender) else MDISP fallback.
                        let mmflag = (flag | mm_aggression(mon, mtmp2)) | 0;
                        if (mmflag & ALLOW_M) {
                            info |= ALLOW_M;
                            if (mtmp2.mtame) {
                                if (!(mmflag & ALLOW_TM)) continue;
                                info |= ALLOW_TM;
                            }
                        } else {
                            flag &= ~ALLOW_MDISP; // C: depends upon defender
                            mmflag = (flag | mm_displacement(mon, mtmp2)) | 0;
                            if (!(mmflag & ALLOW_MDISP)) continue;
                            info |= ALLOW_MDISP;
                        }
                    } else {
                    // C: ALLOW_SANCT only prevents movement (not attack) into temple
                    if (game.level?.flags?.has_temple
                        && in_rooms(nx, ny, TEMPLE)
                        && !in_rooms(x, y, TEMPLE)
                        && in_your_sanctuary(null, nx, ny)) {
                        if (!(flag & ALLOW_SANCT)) continue;
                        info |= ALLOW_SANCT;
                    }
                    }
                }

                // C: sobj_at garlic / boulder
                const obj = objects_at(nx, ny);
                if (obj) {
                    let hasBoulder = false;
                    let hasGarlic = false;
                    for (let o = obj; o; o = o.nexthere) {
                        if (o.otyp === BOULDER) hasBoulder = true;
                        if (o.otyp === CLOVE_OF_GARLIC) hasGarlic = true;
                    }
                    if (hasGarlic) {
                        if (flag & NOGARLIC) continue;
                        info |= NOGARLIC;
                    }
                    if (hasBoulder) {
                        if (!(flag & ALLOW_ROCK)) continue;
                        info |= ALLOW_ROCK;
                    }
                }

                // C: monseeu && monlineu → NOTONL (unicorn flag skips; else mark)
                if (monseeu && monlineu(mon, nx, ny)) {
                    if (flag & NOTONL) continue;
                    info |= NOTONL;
                }

                // C: diagonal tight squeeze — bad_rock flanks + cant_squeeze_thru
                // (mon.c mfndpos; D-0612). Giant spider through wall corner.
                if (nx !== x && ny !== y
                    && bad_rock(mdat, x, ny)
                    && bad_rock(mdat, nx, y)
                    && cant_squeeze_thru(mon)) {
                    continue;
                }

                // C: harmful traps → ALLOW_TRAPS; hostiles skip known types
                // (mon.c mfndpos). Pets get ALLOW_TRAPS and check in dogmove.
                const ttmp = t_at(nx, ny);
                if (ttmp) {
                    // C mon.c mfndpos — corrupt ttyp impossible() named-omit
                    // (no JS impossible path); fixed-dest tele trap the hero
                    // used keeps ALLOW_TRAPS when their track crosses it.
                    if (fixed_tele_trap(ttmp) && hastrack(nx, ny)) {
                        info |= ALLOW_TRAPS;
                    } else if (!m_harmless_trap(mon, ttmp)) {
                        if (!(flag & ALLOW_TRAPS)) {
                            if (mon_knows_traps(mon, ttmp.ttyp)) continue;
                        }
                        info |= ALLOW_TRAPS;
                    }
                }

                data.poss[cnt] = { x: nx, y: ny };
                data.info[cnt] = info;
                cnt++;
            }
        }
        // C mon.c:2376 — eel nexttry when stranded on land with no water nbr
        if (!cnt && wantpool && !is_pool(x, y)) {
            wantpool = false;
            continue;
        }
        break;
    }
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c movemon_singlemon()
// Returns true to stop iter_mons_safe early (C: u.utotype).
async function movemon_singlemon(mtmp) {
    // C: end monster movement early if hero is flagged to leave the level
    if (game.u?.utotype) {
        game._somebody_can_move = false;
        return true;
    }

    // C mon.c:1233-1239 — parked vault guard at <0,0> gets one gd_move
    // per turn (tears down the corridor, clears isgd when done); no
    // NORMAL_SPEED spend, and FALSE either way (dead or alive).
    if (mtmp?.isgd && !(mtmp.mx | 0)
        && !((mtmp.mstate | 0) & MON_MIGRATING)) {
        if ((game.moves | 0) > (mtmp.mlstmv | 0)) {
            await gd_move(mtmp);
            mtmp.mlstmv = game.moves | 0;
        }
        return false;
    }

    // C: DEADMONSTER — stay on fmon until dmonsfree (D-0828)
    if (!mtmp || mtmp.mhp <= 0) return false;

    // C: mon_offmap before m_everyturn / movement spend
    if (((mtmp.mstate | 0) !== MON_FLOOR)) return false;

    // C: m_everyturn_effect before movement gate (fog vapor even if idle)
    await m_everyturn_effect(mtmp);

    if ((mtmp.movement | 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED) game._somebody_can_move = true;

    // C: vision_recalc / clear_bypasses / clear_splitobjs deferred
    // C: minliquid before hider/Conflict/dochug — lava/pool may spend the turn
    if (await minliquid(mtmp)) return false;

    // C: mon.c movemon_singlemon — I_SPECIAL → m_dowear; may spend turn
    if (await maybe_m_dowear_special(mtmp)) return false;

    // C: is_hider — restrap may hide again; disguised/undetected skip dochug.
    // Else eels may re-hide in isolated pools before dochug (rn2(4) gated).
    if (is_hider(mtmp.data)) {
        if (restrap(mtmp)) return false;
        const ap = M_AP_TYPE(mtmp);
        if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) return false;
        if (mtmp.mundetected) return false;
    } else if (mtmp.data?.mlet === 'S_EEL' && !mtmp.mundetected
        && (mtmp.mflee || !m_next2u(mtmp))
        && !canseemon(mtmp) && !rn2(4)) {
        // C mon.c:1295 — hideunder may spend turn; fail continues to Conflict
        if (hideunder(mtmp)) return false;
    }

    // C: Conflict → fightm before dochugw (always rolls resist_conflict).
    if (hero_conflict() && !mtmp.iswiz && m_canseeu(mtmp)) {
        const u = game.u;
        if (cansee(mtmp.mx, mtmp.my)
            && u
            && dist2(mtmp.mx, mtmp.my, u.ux, u.uy) <= BOLT_LIM * BOLT_LIM
            && (await fightm(mtmp))) {
            return false;
        }
    }

    await dochugw(mtmp, true);
    return false;
}

/**
 * C ref: mon.c dmonsfree — remove DEADMONSTER from fmon after movemon.
 * Vault guards (isgd) at <0,0> are retained until corridor teardown.
 */
export function dmonsfree() {
    const list = game.fmon;
    if (!list || !list.length) return;
    let w = 0;
    for (let r = 0; r < list.length; r++) {
        const m = list[r];
        if ((m.mhp | 0) <= 0 && !m.isgd) continue;
        list[w++] = m;
    }
    list.length = w;
}

/**
 * C ref: mon.c copy_mextra — deep-copy mextra bags (edog/eshk/epri/…).
 * Also mirrors top-level mtmp.edog used by dog.js.
 */
export function copy_mextra(mtmp2, mtmp1) {
    if (!mtmp2 || !mtmp1) return;
    const srcExtra = mtmp1.mextra || null;
    const srcEdog = mtmp1.edog || srcExtra?.edog || null;
    if (!srcExtra && !srcEdog) return;

    if (!mtmp2.mextra) mtmp2.mextra = {};

    const name = srcExtra?.mgivenname || mtmp1.mgivenname;
    if (name) {
        mtmp2.mextra.mgivenname = String(name);
        mtmp2.mgivenname = mtmp2.mextra.mgivenname;
    }
    if (srcExtra?.egd) {
        newegd(mtmp2);
        Object.assign(mtmp2.mextra.egd, srcExtra.egd);
    }
    if (srcExtra?.epri) {
        newepri(mtmp2);
        Object.assign(mtmp2.mextra.epri, srcExtra.epri);
    }
    if (srcExtra?.eshk) {
        neweshk(mtmp2);
        Object.assign(mtmp2.mextra.eshk, srcExtra.eshk);
    }
    if (srcExtra?.emin) {
        newemin(mtmp2);
        Object.assign(mtmp2.mextra.emin, srcExtra.emin);
    }
    if (srcEdog) {
        newedog(mtmp2);
        Object.assign(mtmp2.mextra.edog, srcEdog);
        if (srcEdog.ogoal) {
            mtmp2.mextra.edog.ogoal = {
                x: srcEdog.ogoal.x | 0,
                y: srcEdog.ogoal.y | 0,
            };
        }
        mtmp2.edog = mtmp2.mextra.edog;
    }
    if (srcExtra?.ebones) {
        if (!mtmp2.mextra.ebones) mtmp2.mextra.ebones = {};
        Object.assign(mtmp2.mextra.ebones, srcExtra.ebones);
    }
    if (has_mcorpsenm(mtmp1))
        mtmp2.mextra.mcorpsenm = MCORPSENM(mtmp1);
}

/**
 * C ref: mon.c find_mid — locate monst by m_id on fmon (FM_FMON).
 * Named omit: FM_MIGRATE / FM_MYDOGS / FM_EVERYWHERE.
 */
export function find_mid(mid, _fm = 0) {
    const want = mid | 0;
    if (!want) return null;
    for (const m of game.fmon || []) {
        if ((m.m_id | 0) === want) return m;
    }
    return null;
}

/**
 * C ref: mkobj.c discard_minvent — remaining invent leaves the game.
 * mongone passes FALSE. Named omit: extract_from_minvent worn extrinsics;
 * artifact_exists when uncreate_artifacts.
 */
export function discard_minvent(mtmp, _uncreate_artifacts) {
    if (!mtmp) return;
    while (mtmp.minvent) {
        const otmp = mtmp.minvent;
        unlink_minvent(mtmp, otmp);
        otmp.nobj = null;
        otmp.nexthere = null;
    }
}

/**
 * C ref: mon.c mongone — unstuck, mdrop_special_objs, discard_minvent,
 * then m_detach subset (D-1149). Clog victim must not vanish specials.
 * Named omit: isgd && !grddead; m_detach wizdead/shkgone/wormgone/
 * MON_DETACH/dismount_steed; extract_from_minvent worn.
 */
export async function mongone(mtmp) {
    if (!mtmp) return;
    mtmp.mhp = 0;
    if (game.u?.ustuck === mtmp) {
        const { unstuck } = await import('./mhitu.js');
        await unstuck(mtmp);
    }
    await mdrop_special_objs(mtmp);
    discard_minvent(mtmp, false);
    const list = game.fmon;
    if (list) {
        const i = list.indexOf(mtmp);
        if (i >= 0) list.splice(i, 1);
    }
    if (game.u?.usteed === mtmp) game.u.usteed = null;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    mtmp.mx = 0;
    mtmp.my = 0;
    if (mx > 0) newsym(mx, my);
}

/**
 * C ref: mon.c replmon `:2515–2563` — swap map mon for larger/traits
 * replacement. relmon off-map + fmon removal, then place_monster the
 * replacement (unless it is the steed), worm segs via place_wsegs,
 * light-source swap, fmon prepend, ustuck/usteed, replshk, dealloc.
 * place_wsegs live (D-2300); light sources + full replshk bill +
 * set_ustuck botl stay named.
 * `impossible()` stays fire-and-forget so this stays sync like C.
 */
export function replmon(mtmp, mtmp2) {
    if (!mtmp || !mtmp2) return;
    // C :2520–2524 — transfer replacement inventory, flag inconsistency.
    for (let otmp = mtmp2.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.where | 0) !== OBJ_MINVENT || otmp.ocarry !== mtmp)
            void impossible('replmon: minvent inconsistency');
        otmp.ocarry = mtmp2;
    }
    mtmp.minvent = null;

    // C :2525–2527 — before relmon, which could clear polearm.hitmon.
    if (game.context?.polearm?.hitmon === mtmp) {
        game.context.polearm.hitmon = mtmp2;
        game.context.polearm.m_id = mtmp2.m_id | 0;
    }

    // C :2530 relmon(mtmp, NULL) — off the map and out of fmon.
    // Grid: worm heads clear segs, else clear the head cell when it
    // still holds the old mon (C mon_leaving_level :2696–2720).
    const omx = mtmp.mx | 0, omy = mtmp.my | 0;
    if ((mtmp.wormno | 0)) remove_worm(mtmp);
    else if (game._level_monsters?.get(`${omx},${omy}`) === mtmp)
        game._level_monsters.delete(`${omx},${omy}`);
    const list = game.fmon || [];
    const i = list.indexOf(mtmp);
    if (i >= 0) list.splice(i, 1);

    // C :2533–2535 — finish adding the replacement (steed stays off-map).
    if (mtmp !== game.u?.usteed)
        place_monster(mtmp2, mtmp2.mx, mtmp2.my);
    // C :2536–2537 — the replacement takes over every body seg cell.
    if ((mtmp2.wormno | 0)) place_wsegs(mtmp2, mtmp);
    if (!list.includes(mtmp2)) list.unshift(mtmp2);
    game.fmon = list;

    if (game.u?.ustuck === mtmp) game.u.ustuck = mtmp2;
    if (game.u?.usteed === mtmp) game.u.usteed = mtmp2;
    // replshk deferred beyond isshk flag already on mtmp2

    mtmp.mx = 0;
    mtmp.my = 0;
}

/**
 * C ref: mon.c restore_cham `:4646–4658` — PfSC/`mcan` → normal_shape,
 * else re-allow cham via pm_to_cham(monsndx). Await SHOW_MSG revert
 * (D-1594). youprop.h Protection_from_shape_changers is H||E ≡
 * uprops[PROT_FROM_SHAPE_CHANGERS] (confer_oc_oprop writes that);
 * eat/wiz also set H/E flats. Callers: getlev catchup (D-1637),
 * dog.c mon_arrive With_you+After_you, zap.c montraits.
 */
export async function restore_cham(mon) {
    if (!mon) return;
    const u = game.u || {};
    const protU = u.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    const prot = !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers
        || (protU?.intrinsic | 0)
        || (protU?.extrinsic | 0));
    if (prot || mon.mcan) {
        await normal_shape(mon);
    } else if ((mon.cham | 0) === NON_PM || mon.cham == null) {
        mon.cham = pm_to_cham(mon.data?.mndx ?? mon.mnum ?? NON_PM);
    }
}

// C ref: mon.c movemon()
export async function movemon() {
    game._somebody_can_move = false;
    if (game.program_state?.gameover) return false;
    const list = game.fmon || [];
    // Snapshot — C iter_mons_safe; dochug may mutate list later
    for (const mtmp of list.slice()) {
        if (game.program_state?.gameover) break;
        // C: movemon_singlemon true → break (utotype)
        if (await movemon_singlemon(mtmp)) break;
    }
    // C: dmonsfree after last mon, before utotype deferred_goto
    dmonsfree();
    // C: after last mon — if (u.utotype) deferred_goto(); somebody_can_move=FALSE
    // Lazy import avoids mon.js ↔ do.js cycle (do.js imports m_at/mnexto).
    // Named omissions: any_light_source vision_full_recalc; clear_bypasses;
    // clear_splitobjs.
    if (game.u?.utotype) {
        const { deferred_goto } = await import('./do.js');
        await deferred_goto();
        game._somebody_can_move = false;
    }
    return game._somebody_can_move;
}

/** C ref: you.h m_next2u — squared distu ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/**
 * C ref: mondata.h ceiling_hider — hider that clings/flies (not mimic).
 * Canonical export: engrave/music hold identical locals; pooleffects imports
 * this one (no 4th clone).
 */
export function ceiling_hider(ptr) {
    if (!is_hider(ptr)) return false;
    return (is_clinger(ptr) && ptr.mlet !== 'S_MIMIC') || is_flyer(ptr);
}

/**
 * C ref: dungeon.c has_ceiling — endgame non-earth has no ceiling.
 */
function has_ceiling(lev) {
    if (In_endgame(lev) && !Is_earthlevel(lev)) return false;
    return true;
}

/**
 * C ref: mon.c restrap — unwatched hiders may hide again; True if hid.
 * Short-circuit order matches C (rn2(3) after cansee). Called from
 * movemon_singlemon (pre-dochug) and hide_monst (getlev).
 */
export function restrap(mtmp) {
    if (!mtmp?.data) return false;
    const u = game.u || {};
    if (mtmp.mcan || M_AP_TYPE(mtmp) || cansee(mtmp.mx, mtmp.my)
        || rn2(3) || mtmp === u.ustuck) {
        return false;
    }
    if (mtmp.mtrapped) {
        const t = t_at(mtmp.mx, mtmp.my);
        if (t && !is_pit(t.ttyp)) return false;
    }
    if (ceiling_hider(mtmp.data) && !has_ceiling(u.uz)) return false;
    if (sensemon(mtmp) && m_next2u(mtmp)) return false;

    if (mtmp.data.mlet === 'S_MIMIC') {
        if (mtmp.msleeping || mtmp.mfrozen) return false;
        set_mimic_sym(mtmp);
        return true;
    }
    if (game.level?.at?.(mtmp.mx, mtmp.my)?.typ === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}

/**
 * C ref: mon.c hideunder — set mundetected under object / pool for eels.
 * Used by hide_monst, teleds(&youmonst) (D-1131), and
 * hack.js hero_hideunder_after_move (D-1245). monmove.js keeps
 * a parallel local for postmov.
 * Named omissions: You_see "%s %s under %s" pline + set_msg_xy /
 * PLNMSG_HIDE_UNDER / last_hider (async boundary; both locals stay silent).
 */
export function hideunder(mtmp) {
    if (!mtmp?.data) return false;
    const u = game.u || {};
    const is_u = mtmp === game.youmonst;
    const x = is_u ? (u.ux | 0) : (mtmp.mx | 0);
    const y = is_u ? (u.uy | 0) : (mtmp.my | 0);
    let undetected = false;
    const t = t_at(x, y);

    if (mtmp === u.ustuck) {
        // cannot hide while holding / held
    } else if ((is_u ? u.utrap : mtmp.mtrapped)
        || (t && !is_pit(t.ttyp))) {
        // trapped or non-pit trap site
    } else if (mtmp.data.mlet === 'S_EEL') {
        /* C: is_pool && !Is_waterlevel && (!Underwater || !couldsee) */
        undetected = !!(is_pool(x, y) && !Is_waterlevel(u.uz)
            && (!(u.Underwater) || !couldsee(x, y)));
    } else if (hides_under(mtmp.data)) {
        const otmp = objects_at(x, y);
        /* C: most things can be hidden under (can_hide_under_obj coins);
           pets refuse cursed piles; no hiding under pool/lava */
        if (otmp && can_hide_under_obj(otmp)
            && (!mtmp.mtame || !cursed_object_at(x, y))
            && !is_pool(x, y) && !is_lava(x, y)) {
            /* C: most monsters won't hide under a cockatrice corpse but
               they can hide under a pile containing more than just such
               corpses; hero arm reads Stone_resistance */
            let o = otmp;
            const stoneproof = is_u
                ? !!(u.Stone_resistance || u.HStone_resistance
                    || u.EStone_resistance)
                : !!resists_ston(mtmp);
            if (!stoneproof) {
                while (o && (o.otyp | 0) === CORPSE
                    && touch_petrifies(mons(o.corpsenm)))
                    o = o.nexthere;
            }
            if (o) undetected = true;
        }
    }

    let oldundetctd;
    if (is_u) {
        oldundetctd = !!(u.uundetected);
        u.uundetected = undetected ? 1 : 0;
    } else {
        oldundetctd = !!mtmp.mundetected;
        mtmp.mundetected = undetected ? 1 : 0;
    }
    if (undetected !== oldundetctd) newsym(x, y);
    return undetected;
}

/**
 * C ref: mon.c hide_monst — called from getlev when returning to a level.
 * Viz override forces cansee false so restrap may roll rn2(3).
 */
export function hide_monst(mon) {
    if (!mon?.data) return;
    const hider_under = hides_under(mon.data) || mon.data.mlet === 'S_EEL';
    if (!(is_hider(mon.data) || hider_under)) return;
    if (mon.mundetected || M_AP_TYPE(mon) !== M_AP_NOTHING) return;

    const x = mon.mx | 0;
    const y = mon.my | 0;
    const viz = game.viz_array;
    const save_viz = viz?.[y]?.[x] ?? 0;
    if (viz?.[y]) viz[y][x] = save_viz & ~(IN_SIGHT | COULD_SEE);

    if (is_hider(mon.data)) restrap(mon);
    // try again if mimic missed its 1/3 chance to hide
    if (mon.data.mlet === 'S_MIMIC' && !M_AP_TYPE(mon)) restrap(mon);

    if (viz?.[y]) viz[y][x] = save_viz;
    if (hider_under) hideunder(mon);
}

/**
 * C ref: mon.c kill_eggs — stop HATCH_EGG on eggs of genocided species
 * (dead_species(..., TRUE) also checks baby form). JS invent is an
 * array; other lists are nobj chains. TIN/CORPSE arms are #if 0 in C.
 */
export function kill_eggs(obj_list) {
    if (!obj_list) return;
    if (Array.isArray(obj_list)) {
        for (const otmp of obj_list) kill_eggs_one(otmp);
        return;
    }
    for (let otmp = obj_list; otmp; otmp = otmp.nobj) {
        kill_eggs_one(otmp);
    }
}

function kill_eggs_one(otmp) {
    if (!otmp) return;
    if ((otmp.otyp | 0) === EGG) {
        if (dead_species(otmp.corpsenm | 0, true)) kill_egg(otmp);
    } else if (Has_contents(otmp)) {
        kill_eggs(otmp.cobj);
    }
}

/**
 * C ref: mon.c kill_genocided_monsters `:5639–5677` — wipe live mons of
 * G_GENOD species then kill_eggs on minvent / invent / fobj /
 * migrating_objs / buried. A cham imitating a genocided form takes a new
 * shape via `newcham(mtmp, NULL, NC_SHOW_MSG)` (C `:5665`, `(void)`
 * return); the await only completes C's inline message before the loop
 * continues — scored runs stay sync (D-1648). mondead stays
 * fire-and-forget per the review-1197 debt (amulet+More corner suspends
 * detach past later loop iterations — display-order only).
 * Callers: do.c goto_level (D-1190); cmd.c makemap_prepost post (D-1288);
 * read.c do_class_genocide / do_genocide — all await.
 */
export async function kill_genocided_monsters() {
    const mv = game.mvitals || [];
    for (const mtmp of [...(game.fmon || [])]) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue;
        const mndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
        const cham = mtmp.cham | 0;
        const kill_cham = ismnum(cham) && (((mv[cham]?.mvflags ?? 0) & G_GENOD) !== 0);
        if ((((mv[mndx]?.mvflags ?? 0) & G_GENOD) !== 0) || kill_cham) {
            if (ismnum(cham) && !kill_cham) {
                await newcham(mtmp, null, NC_SHOW_MSG);
            } else {
                // Sync by design: genocided mons cannot lifesave (amulet
                // still dies) or vamprise (G_GENOD gate); the async detach
                // lands before the next input. Corner nuance: the minvent
                // egg pass below runs pre-drop (C drops first, then kills
                // floor eggs) — equivalent kill set, see D-log.
                mondead(mtmp);
            }
        }
        if (mtmp.minvent) kill_eggs(mtmp.minvent);
    }

    kill_eggs(game.invent);
    kill_eggs(game.fobj);
    kill_eggs(game.migrating_objs);
    kill_eggs(game.level?.buriedobjlist);
}

/**
 * C ref: mhitu.c mtrapped_in_pit `:465–479` — TRUE iff monster or hero is
 * trapped in a (spiked) pit. Hero: utrap && TT_PIT then t_at(ux,uy).
 * Monster: mtrapped then t_at(mx,my). Then is_pit(ttyp). Shared by
 * hmonas / mattackm / mattacku AT_KICK continues (D-1298).
 */
export function mtrapped_in_pit(mtmp) {
    if (!mtmp) return false;
    let ttmp = null;
    if (mtmp === game.youmonst) {
        const u = game.u || {};
        ttmp = (u.utrap && (u.utraptype | 0) === TT_PIT)
            ? t_at(u.ux | 0, u.uy | 0) : null;
    } else {
        ttmp = mtmp.mtrapped ? t_at(mtmp.mx | 0, mtmp.my | 0) : null;
    }
    return !!(ttmp && is_pit(ttmp.ttyp));
}
