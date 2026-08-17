// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, seemimic, wakeup, mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { dochugw, m_everyturn_effect, monflee } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, IS_TREE, D_CLOSED, D_LOCKED, D_BROKEN,
    ALLOW_ROCK, ALLOW_DIG, Is_rogue_level, NOTONL, ALLOW_ALL, ALLOW_BARS,
    NOGARLIC, IRONBARS, IS_ALTAR, DISPLACED,
    IS_WATERWALL, LAVAWALL, Is_waterlevel,
    M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE,
    MSLOW, MFAST, STRAT_WAITMASK, STRAT_WAITFORU, G_GENOD,
    BOLT_LIM, WT_TOOMUCH_DIAGONAL, IS_STWALL, W_NONPASSWALL,
    ROOM, IN_SIGHT, COULD_SEE, is_pit, In_endgame, Is_earthlevel,
    Is_astralevel, Is_airlevel, Is_firelevel,
    IS_FOUNTAIN,
    ismnum, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD, POISON_RES,
    u_at, TEMPLE, SHOPBASE, MON_FLOOR, MON_MIGRATING, MON_DETACH,
    MON_LIMBO, MON_OBLITERATE, MON_ENDGAME_MIGR, MIGR_APPROX_XY, MIGR_RANDOM,
    has_emin, has_epri, has_eshk,
    Has_contents, RLOC_MSG, RLOC_NOMSG, XKILL_NOMSG,
} from './const.js';
import { t_at, m_harmless_trap, water_damage_chain, fire_damage_chain } from './trap.js';
import {
    nohands, verysmall, throws_rocks, passes_walls, lays_eggs, mons,
    monsterNames, NON_PM, LOW_PM, mon_knows_traps, tunnels, needspick,
    is_hider, hides_under, M1_SEE_INVIS, humanoid, regenerates,
    is_flyer, is_floater, is_clinger, is_swimmer, likes_lava,
    bigmonst, amorphous, is_whirly, noncorporeal, M1_SLITHY,
    is_vampshifter, is_male, is_female, is_neuter, likes_gems,
    is_rider, nonliving, breathless, is_giant, is_minion, is_human,
    is_undead, amphibious, can_teleport, MR_FIRE, MR_POISON, mindless, G_UNIQ,
    is_watch,
} from './monsters.js';
import {
    little_to_big, big_to_little, hero_conflict, resist_conflict,
    m_canseeu, on_fire,
} from './mondata.js';
import { objects_at, kill_egg, place_object, stackobj } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { PM_GRID_BUG, PM_TOURIST } from './generated/monsters_data.js';
import { enexto, rloc_to, rloc, tele_restrict, noteleport_level, rloc_to_flag, migrate_to_level, rloco } from './teleport.js';
import { may_dig } from './dig.js';
import { newsym, pline, You_feel, sensemon, canseemon, canspotmon } from './display.js';
import { online2 } from './hacklib.js';
import { worm_cross } from './worm.js';
import { Monnam, mon_nam } from './do_name.js';
import { cansee, couldsee } from './vision.js';
import { fightm, mondead, mondied } from './mhitm.js';
import { engr_at } from './engrave.js';
import { visible_region_at, is_poisoncloud_region } from './region.js';
import { were_change } from './were.js';
import { set_mimic_sym, newcham, pickvampshape, pm_to_cham, neweshk, newegd, newemin, newepri } from './makemon.js';
import { in_your_sanctuary, p_coaligned } from './priest.js';
import { in_rooms, is_pool, is_lava } from './hack.js';
import { inv_weight, weight_cap } from './invent.js';
import { maybe_m_dowear_special } from './worn.js';
import { adjalign } from './attrib.js';
import { vtense } from './objnam.js';
import { experience, more_experienced, newexplevel } from './exper.js';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
const PM_LONG_WORM_TAIL = monsterNames.indexOf('PM_LONG_WORM_TAIL');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_AIR_ELEMENTAL = monsterNames.indexOf('PM_AIR_ELEMENTAL');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_EARTH_ELEMENTAL = monsterNames.indexOf('PM_EARTH_ELEMENTAL');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');
const PM_HEZROU = monsterNames.indexOf('PM_HEZROU');
const PM_VROCK = monsterNames.indexOf('PM_VROCK');
const AT_BREA = 12; // C monattk.h
const AD_DRST = 7;
const AD_RBRE = 242;
const EGG = objectNames.indexOf('EGG');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const NC_SHOW_MSG = 1;

/** C ref: monmove.c closed_door — IS_DOOR && (CLOSED|LOCKED). */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C ref: mon.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    return dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy);
}

/** C ref: hack.c may_passwall — STWALL + W_NONPASSWALL blocks. */
function may_passwall(x, y) {
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
function perceives(ptr) {
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
    if (sobj_at_otyp(SCR_SCARE_MONSTER, x, y)) return true;
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

/** C ref: mkobj.c sobj_at — first floor object of otyp. */
function sobj_at_otyp(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/** C ref: invent.c m_carrying — first matching otyp in minvent chain. */
export function m_carrying(mon, otyp) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        if (o.otyp === otyp) return o;
    }
    return null;
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
function NODIAG(monnum) {
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
 * Named omissions: mon_has_special Vlad stay in pickvampshape; NC_SHOW_MSG
 * display polish; canseemon worm_known.
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
        if (newcham(mon, ptr, NC_SHOW_MSG)) {
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
    // C: mmove==0 must still check liquid once/turn
    if ((mtmp.data?.mmove | 0) === 0) {
        if (await minliquid(mtmp)) return;
    }
    mon_regen(mtmp, false);
    if (ismnum(mtmp.cham)) await decide_to_shapeshift(mtmp);
    were_change(mtmp);
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
 * C ref: mon.c seemimic — clear disguise; freemcorpsenm / light-block deferred.
 */
export function seemimic(mtmp) {
    if (!mtmp) return;
    // has_mcorpsenm / freemcorpsenm deferred
    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.mappearance = 0;
    // is_lightblocker unblock_point on discover deferred (vision_reset covers
    // does_block; D-0585 ports is_lightblocker_mappear into _blocks)
    if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
}

/**
 * C ref: mon.c normal_shape — cham revert / were / seemimic.
 * Thin: cham newcham + seemimic; were/meating deferred.
 */
export function normal_shape(mon) {
    if (!mon) return;
    const mcham = mon.cham;
    if (ismnum(mcham)) {
        const mcan = mon.mcan;
        newcham(mon, mons(mcham), NC_SHOW_MSG);
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
 * C ref: mon.c rescham — force all mons to normal_shape (PfSC on).
 */
export function rescham() {
    for (const mon of game.fmon || []) {
        if (!mon || (mon.mhp | 0) <= 0) continue;
        normal_shape(mon);
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
 * C ref: mon.c setmangry — peaceful → hostile on attack.
 * Branch envelope: core mpeaceful clear + humanoid/shk/gd pline +
 * adjalign (priest coalign / -1) so ualign.abuse→adj_erinys runs.
 * Named omissions: Elbereth hypocrite/rnd(5)/del_engr; growl;
 * quest guardian / peacefuls_respond bodies.
 */
export function setmangry(mtmp, via_attack) {
    if (!mtmp) return;
    // Elbereth hypocrite arm deferred (no RNG when not on Elbereth)
    void via_attack;
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful) return;
    if (mtmp.mtame) return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        adjalign(p_coaligned(mtmp) ? -5 : 2);
    } else {
        adjalign(-1); /* attacking peaceful monsters is bad */
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        // couldsee gate: still pline when visible-ish (canspot deferred)
        pline(`${Monnam(mtmp)} gets angry!`);
    }
    // growl / qst_guardians_respond / peacefuls_respond deferred
}

/**
 * C ref: mon.c wake_nearto_core — clear sleep/wait in radius.
 * Named omissions: disturb_buried_zombies; wake_msg when msleeping already
 * cleared by sync callers.
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
 * Named omissions: finish_meating; ghod_hitsu.
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
    // finish_meating deferred
    if (via_attack) {
        const was_peaceful = !!mtmp.mpeaceful;
        // C: was_sleeping → growl → wake_nearto (D-0922/#1161)
        if (was_sleeping) {
            // Dynamic import avoids mon↔sounds↔uhitm static cycle.
            const { growl } = await import('./sounds.js');
            await growl(mtmp);
        }
        setmangry(mtmp, true);
        if (was_peaceful) {
            // ghod_hitsu deferred (priest in temple)
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
    // C: level.monsters[][] — worm segs via place_worm_seg; heads on fmon.
    // Steed is remove_monster'd while mounted.
    // Dead mons stay on fmon until dmonsfree but are off the map grid (C).
    const seg = game._level_monsters?.get(`${x},${y}`);
    if (seg && (seg.mhp | 0) > 0) return seg;
    const list = game.fmon || [];
    const steed = game.u?.usteed;
    for (const m of list) {
        if (m === steed) continue;
        if ((m.mhp | 0) <= 0) continue; // DEADMONSTER — not on map
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
 * C ref: steal.c mdrop_obj subset — extract to floor at mon. Named omit:
 * distant_name observe; extract_from_minvent worn extrinsics; saddle shop.
 */
function mdrop_obj_overcrowd(mon, obj) {
    unlink_minvent(mon, obj);
    obj.owornmask = 0;
    if (mon.mw === obj) mon.mw = null;
    obj.nobj = null;
    obj.nexthere = null;
    place_object(obj, mon.mx | 0, mon.my | 0);
    stackobj(obj);
}

/**
 * C ref: steal.c mdrop_special_objs — drop Amulet/invocation/Rider/quest
 * arti before migrate or mongone. Ordinary items still burn
 * obj_resists(0,0) rn2(100).
 */
function mdrop_special_objs(mon) {
    if (!mon) return;
    for (let obj = mon.minvent; obj; ) {
        const next = obj.nobj;
        if (obj_resists_00(obj) || is_quest_artifact(obj)) {
            if (mon.mx) {
                mdrop_obj_overcrowd(mon, obj);
            } else {
                unlink_minvent(mon, obj);
                obj.nobj = null;
                obj.nexthere = null;
                rloco(obj);
            }
        }
        obj = next;
    }
}

/**
 * C ref: mon.c migrate_mon — unstuck + mdrop_special_objs when on map,
 * then migrate_to_level.
 */
async function migrate_mon(mtmp, target_lev, xyloc) {
    if ((mtmp.mx | 0)) {
        const { unstuck } = await import('./mhitu.js');
        await unstuck(mtmp);
        mdrop_special_objs(mtmp);
    }
    migrate_to_level(mtmp, target_lev, xyloc, null);
}

/**
 * C ref: mon.c m_into_limbo — MON_LIMBO then migrate to current ledger
 * with MIGR_APPROX_XY.
 */
async function m_into_limbo(mtmp) {
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
async function elemental_clog(mon) {
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
 * Failed enexto → deal_with_overcrowding (D-1148). Omits mon_telecontrol.
 * RLOC_MSG / STRAT_APPEARMSG appear plines need the flag path (D-0928 #1128).
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
    await rloc_to_flag(mtmp, mm.x, mm.y, rlocflags);
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
    // C: passes_bars → ALLOW_BARS (rust/corr/metallivorous/slithy subset deferred)
    if (passes_walls(mtmp.data) || amorphous(mtmp.data) || is_whirly(mtmp.data)
        || verysmall(mtmp.data)) {
        allowflags |= ALLOW_BARS;
        // Named: unsolid; dmgtype RUST/CORR; metallivorous; slithy&&!big;
        // ustuck engulfer gate
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
function cant_drown(ptr) {
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
 * C ref: mon.c minliquid / minliquid_core — liquid compatibility; 1=died.
 * Envelope: gremlin pool/fountain rn2(3)→split_mon + dryup (D-1095);
 * iron-golem inpool rust (D-1117); pool drown mondied vs xkilled (D-1117);
 * lava on_fire / mondead vs xkilled / fire_damage_chain (D-1138);
 * deal_with_overcrowding after failed survivor rloc (D-1148).
 * Named omissions: steed Flying/Levitation gate; engulfing_u drown flush;
 * mdrop_obj worn/saddle/`extract_from_minvent` (mongone specials D-1149).
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

    // steed Flying/Levitation deferred — usteed is on u_at, which gush skips

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
                    mondead(mtmp);
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
                    mondead(mtmp);
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
            // engulfing_u flush named
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

// C ref: mon.c mfndpos() — neighbour scan; ALLOW_DIG rock/tree + thrudoor
// Named omissions still: mm_aggression/MDISP;
// can_fog in cant_squeeze_thru;
// peaceful shop/temple dig avoid; Inhell Elbereth;
// passes_bars full (rust/corr/metallivorous/slithy); m_can_break_boulder.
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
        // C: !needspick → both; else carrying pick/axe (cursed-mwep gate deferred)
        if (!needspick(mdat)) {
            rockok = true;
            treeok = true;
        } else {
            rockok = !!(m_carrying(mon, PICK_AXE)
                || (m_carrying(mon, DWARVISH_MATTOCK) && !mon_has_shield(mon)));
            treeok = !!(m_carrying(mon, AXE)
                || (m_carrying(mon, BATTLE_AXE) && !mon_has_shield(mon)));
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
                // C: IRONBARS — need ALLOW_BARS; nondiggable+rust/corr deferred
                if (ntyp === IRONBARS && !(flag & ALLOW_BARS)) continue;
                if (IS_DOOR(ntyp)) {
                    const dm = loc.doormask || 0;
                    if (((dm & D_CLOSED) && !(flag & OPENDOOR))
                        || ((dm & D_LOCKED) && !(flag & UNLOCKDOOR))) {
                        if (!thrudoor) continue;
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
                } else if (m_at(nx, ny)) {
                    // hostiles lack ALLOW_M — cannot displace/attack other mons
                    // mm_aggression / ALLOW_MDISP deferred
                    if (!(flag & ALLOW_M)) continue;
                    info |= ALLOW_M;
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
                    if (!m_harmless_trap(mon, ttmp)) {
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

    // C: parked vault guard at <0,0> — gd_move may discard; no NORMAL_SPEED spend.
    // Named omission: full gd_move corridor teardown (D-0795); skip spend only.
    if (mtmp?.isgd && !(mtmp.mx | 0)
        && !((mtmp.mstate | 0) & MON_MIGRATING)) {
        return false;
    }

    // C: DEADMONSTER — stay on fmon until dmonsfree (D-0828)
    if (!mtmp || mtmp.mhp <= 0) return false;

    // C: mon_offmap before m_everyturn / movement spend
    if (((mtmp.mstate | 0) !== MON_FLOOR)) return false;

    // C: m_everyturn_effect before movement gate (fog vapor even if idle)
    m_everyturn_effect(mtmp);

    if ((mtmp.movement | 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED) game._somebody_can_move = true;

    // C: vision_recalc / clear_bypasses / clear_splitobjs deferred
    // C: minliquid before hider/Conflict/dochug — lava/pool may spend the turn
    if (await minliquid(mtmp)) return false;

    // C: mon.c movemon_singlemon — I_SPECIAL → m_dowear; may spend turn
    if (maybe_m_dowear_special(mtmp)) return false;

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
        if (!mtmp2.mextra.edog) mtmp2.mextra.edog = {};
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
    if (srcExtra && Object.prototype.hasOwnProperty.call(srcExtra, 'mcorpsenm')) {
        mtmp2.mextra.mcorpsenm = srcExtra.mcorpsenm;
    }
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
function discard_minvent(mtmp, _uncreate_artifacts) {
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
    mdrop_special_objs(mtmp);
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
 * C ref: mon.c replmon — swap map mon for larger/traits replacement.
 * Named omit: polearm.hitmon; worm segs; light sources; full replshk bill.
 */
export function replmon(mtmp, mtmp2) {
    if (!mtmp || !mtmp2) return;
    for (let otmp = mtmp2.minvent; otmp; otmp = otmp.nobj) {
        otmp.ocarry = mtmp2;
    }
    mtmp.minvent = null;

    if (game.context?.polearm?.hitmon === mtmp) {
        game.context.polearm.hitmon = mtmp2;
    }

    const list = game.fmon || [];
    const i = list.indexOf(mtmp);
    if (i >= 0) list.splice(i, 1);
    if (!list.includes(mtmp2)) list.unshift(mtmp2);
    game.fmon = list;

    if (game.u?.ustuck === mtmp) game.u.ustuck = mtmp2;
    if (game.u?.usteed === mtmp) game.u.usteed = mtmp2;
    // replshk deferred beyond isshk flag already on mtmp2

    mtmp.mx = 0;
    mtmp.my = 0;
}

/**
 * C ref: mon.c restore_cham — shape-changer vs Protection_from_shape_changers.
 */
export function restore_cham(mon) {
    if (!mon) return;
    const u = game.u || {};
    const prot = !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
    if (prot || mon.mcan) {
        normal_shape(mon);
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
 */
function ceiling_hider(ptr) {
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
 * Used by hide_monst and teleds(&youmonst) (D-1131). monmove.js keeps
 * a parallel local for postmov.
 * Named omissions: You_see pline; pet cursed_object_at; cockatrice skip;
 * can_hide_under_obj filter.
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
        /* C: !is_pool_or_lava — drawbridge-under via is_pool/is_lava */
        if (otmp && !is_pool(x, y) && !is_lava(x, y)) {
            undetected = true;
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
function kill_eggs(obj_list) {
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
 * C ref: mon.c kill_genocided_monsters — wipe live mons of G_GENOD species
 * then kill_eggs on minvent / invent / fobj / migrating_objs / buried.
 * Named omissions: chameleon `newcham` when imitating a genocided form;
 * do.c `goto_level` / cmd.c wiz-level-change callers.
 */
export function kill_genocided_monsters() {
    const mv = game.mvitals || [];
    for (const mtmp of [...(game.fmon || [])]) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue;
        const mndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
        const cham = mtmp.cham | 0;
        const kill_cham = ismnum(cham) && (((mv[cham]?.mvflags ?? 0) & G_GENOD) !== 0);
        if ((((mv[mndx]?.mvflags ?? 0) & G_GENOD) !== 0) || kill_cham) {
            if (ismnum(cham) && !kill_cham) {
                // newcham(mtmp, NULL, NC_SHOW_MSG) deferred
            } else {
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
