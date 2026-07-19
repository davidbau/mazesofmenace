// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, seemimic, wakeup, mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dochugw, m_everyturn_effect } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, IS_TREE, D_CLOSED, D_LOCKED, D_BROKEN,
    ALLOW_ROCK, ALLOW_DIG, Is_rogue_level, NOTONL, ALLOW_ALL, ALLOW_BARS,
    NOGARLIC, IRONBARS, IS_ALTAR, DISPLACED,
    IS_WATERWALL, LAVAWALL, Is_waterlevel, POOL, MOAT, WATER, LAVAPOOL,
    M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE,
    MSLOW, MFAST, STRAT_WAITMASK, STRAT_WAITFORU, G_GENOD,
    BOLT_LIM, WT_TOOMUCH_DIAGONAL, IS_STWALL, W_NONPASSWALL,
    ROOM, IN_SIGHT, COULD_SEE, is_pit, In_endgame, Is_earthlevel,
    ismnum, M_POISONGAS_OK, u_at, TEMPLE,
} from './const.js';
import { t_at } from './trap.js';
import {
    nohands, verysmall, throws_rocks, passes_walls, lays_eggs, mons,
    monsterNames, NON_PM, LOW_PM, mon_knows_traps, tunnels, needspick,
    is_hider, hides_under, M1_SEE_INVIS, humanoid, regenerates,
    is_flyer, is_floater, is_clinger, is_swimmer, likes_lava,
    bigmonst, amorphous, is_whirly, noncorporeal, M1_SLITHY,
    is_vampshifter, is_male, is_female, is_neuter, likes_gems,
    is_rider, nonliving, breathless, is_giant, is_minion, is_human,
    is_undead,
} from './monsters.js';
import { m_harmless_trap } from './trap.js';
import {
    little_to_big, big_to_little, hero_conflict, resist_conflict,
    m_canseeu,
} from './mondata.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { enexto, rloc_to } from './teleport.js';
import { may_dig } from './dig.js';
import { newsym, pline, sensemon, canseemon } from './display.js';
import { online2 } from './hacklib.js';
import { worm_cross } from './worm.js';
import { Monnam } from './do_name.js';
import { cansee } from './vision.js';
import { fightm } from './mhitm.js';
import { engr_at } from './engrave.js';
import { visible_region_at } from './region.js';
import { were_change } from './were.js';
import { set_mimic_sym, newcham, pickvampshape } from './makemon.js';
import { in_your_sanctuary } from './priest.js';
import { in_rooms } from './hack.js';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
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

/** Local is_pool/is_lava — avoid mon.js ↔ hack.js cycle. */
function mfndpos_is_pool(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ === POOL || typ === MOAT || typ === WATER;
}
function mfndpos_is_lava(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ === LAVAPOOL || typ === LAVAWALL;
}

/** C ref: hack.c may_passwall — STWALL + W_NONPASSWALL blocks. */
function may_passwall(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !(IS_STWALL(loc.typ) && (loc.wall_info & W_NONPASSWALL));
}

/**
 * C ref: hack.c bad_rock — obstructed (or Sokoban boulder) the form
 * cannot dig or pass through.
 */
function bad_rock(mdat, x, y) {
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
 * 1=too big, 2=load, 3=Sokoban (hero only). can_fog vampshifter deferred.
 */
function cant_squeeze_thru(mon) {
    const ptr = mon?.data;
    if (passes_walls(ptr)) return 0;
    const slithy = !!((ptr?.mflags1 ?? 0) & M1_SLITHY);
    // Named omission: can_fog (vampshifter) — treat as false.
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
            || slithy /* || can_fog(mon) */)) {
        return 1;
    }
    let curload = 0;
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if (obj.otyp !== BOULDER || !throws_rocks(ptr)) {
            curload += obj.owt || 0;
        }
    }
    if (curload > WT_TOOMUCH_DIAGONAL) return 2;
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

/**
 * C ref: mon.c m_poisongas_ok — subset for mfndpos avoid-gas gate.
 * Named omissions: vampshifter; eel/waterlevel pool; breath AD_DRST/RBRE;
 * resists_poison → MINOR (treated as not OK so gas still avoided).
 */
function m_poisongas_ok(mtmp) {
    const ptr = mtmp?.data;
    if (nonliving(ptr) || breathless(ptr)) return M_POISONGAS_OK;
    // immune_poisongas deferred → false
    return 0; // M_POISONGAS_BAD
}

/**
 * C ref: monmove.c onscary — mfndpos Elbereth / scare-scroll / altar-vamp.
 * Named omissions: is_lminion; unique_corpstat human-resist; auditory
 * <0,0> only used from music; shopkeeper/priest own-shop temple resist;
 * sengr_at fuzzy match (exact "Elbereth"); Inhell (dungeon hellish).
 */
function onscary(x, y, mtmp) {
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
        mvflags: 0, born: 0, died: 0,
    });
    if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
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
function decide_to_shapeshift(mon) {
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
                    dochng = ptr !== mon.data;
                }
            }
            if (dochng && amorphous(mon.data)
                && closed_door(mon.mx, mon.my)) {
                const new_xy = { x: 0, y: 0 };
                if (enexto(new_xy, mon.mx, mon.my, ptr)) {
                    rloc_to(mon, new_xy.x, new_xy.y);
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
 * Named omissions: mmove==0 minliquid.
 */
function m_calcdistress(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) < 1) return;
    // mmove==0 minliquid deferred
    mon_regen(mtmp, false);
    if (ismnum(mtmp.cham)) decide_to_shapeshift(mtmp);
    were_change(mtmp);
    if (mtmp.mblinded && !(--mtmp.mblinded)) mtmp.mcansee = 1;
    if (mtmp.mfrozen && !(--mtmp.mfrozen)) mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !(--mtmp.mfleetim)) mtmp.mflee = 0;
}

/**
 * C ref: mon.c mcalcdistress — iter_mons over fmon.
 */
export function mcalcdistress() {
    for (const mtmp of game.fmon || []) {
        m_calcdistress(mtmp);
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
 * C ref: mon.c setmangry — peaceful → hostile on attack.
 * Branch envelope: core mpeaceful clear + humanoid/shk/gd pline + adjalign(-1).
 * Named omissions: Elbereth hypocrite/rnd(5)/del_engr; priest adjalign
 * coalign; growl; quest guardian / peacefuls_respond bodies.
 */
export function setmangry(mtmp, via_attack) {
    if (!mtmp) return;
    // Elbereth hypocrite arm deferred (no RNG when not on Elbereth)
    void via_attack;
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful) return;
    if (mtmp.mtame) return;
    mtmp.mpeaceful = 0;
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { record: 0, type: 0 };
    if (mtmp.ispriest) {
        // p_coaligned adjalign ± deferred → -1 like non-priest
        u.ualign.record = (u.ualign.record | 0) - 1;
    } else {
        u.ualign.record = (u.ualign.record | 0) - 1;
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        // couldsee gate: still pline when visible-ish (canspot deferred)
        pline(`${Monnam(mtmp)} gets angry!`);
    }
    // growl / qst_guardians_respond / peacefuls_respond deferred
}

/**
 * C ref: mon.c wakeup — clear sleep / non-monster disguise; via_attack → setmangry.
 * Named omissions: wake_msg; finish_meating; growl-on-sleep; ghod_hitsu;
 * hot_pursuit when shk && !*u.ushops.
 */
export function wakeup(mtmp, via_attack) {
    if (!mtmp) return;
    // wake_msg deferred (canseemon sleep pline)
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
        // was_sleeping growl deferred
        setmangry(mtmp, true);
        if (was_peaceful) {
            // ghod_hitsu / hot_pursuit deferred
        }
    }
}

export function m_at(x, y) {
    // C: level.monsters[][] — worm segs via place_worm_seg; heads on fmon.
    // Steed is remove_monster'd while mounted.
    const seg = game._level_monsters?.get(`${x},${y}`);
    if (seg) return seg;
    const list = game.fmon || [];
    const steed = game.u?.usteed;
    for (const m of list) {
        if (m === steed) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/**
 * C ref: mon.c mnexto — place next to hero via enexto + rloc_to.
 * Omits mon_telecontrol / overcrowding limbo.
 */
export function mnexto(mtmp, _rlocflags = 0) {
    if (!mtmp) return;
    const u = game.u;
    if (mtmp === u?.usteed) {
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }
    const mm = { x: 0, y: 0 };
    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok_xy(mm.x, mm.y)) return;
    rloc_to(mtmp, mm.x, mm.y);
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
    // noteleport_level: level.flags.noteleport (covetous/hell-court deferred).
    if (mtmp.data?.mlet === 'S_UNICORN' && likes_gems(mtmp.data)
        && !game.level?.flags?.noteleport
        && !((game.level?.flags?.stasis_until ?? -1) >= (game.moves ?? 0))) {
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

// C ref: mon.c mfndpos() — neighbour scan; ALLOW_DIG rock/tree + thrudoor
// Named omissions still: mm_aggression/MDISP;
// eel nexttry; can_fog in cant_squeeze_thru;
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

    // C: wantpool / poolok / lavaok — land monsters skip pool/lava neighbours
    const wantpool = mdat?.mlet === 'S_EEL';
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
    const poisongas_ok = m_poisongas_ok(mon) === M_POISONGAS_OK;
    const in_poisongas = !!visible_region_at(x, y);

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

    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;
            // C: obstructed unless ALLOW_WALL passwall or diggable rock/tree
            if (IS_OBSTRUCTED(ntyp)
                && !((flag & ALLOW_WALL) && false /* may_passwall deferred */)
                && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny))) {
                continue;
            }
            // C: IS_WATERWALL && !is_swimmer
            if (IS_WATERWALL(ntyp) && !is_swimmer(mdat)) continue;
            // peaceful shop/temple dig avoid deferred
            // C: IRONBARS — need ALLOW_BARS; nondiggable+rust/corr deferred
            if (ntyp === IRONBARS && !(flag & ALLOW_BARS)) continue;
            if (IS_DOOR(ntyp)) {
                const dm = loc.doormask || 0;
                if (((dm & D_CLOSED) && !(flag & OPENDOOR))
                    || ((dm & D_LOCKED) && !(flag & UNLOCKDOOR))) {
                    if (!thrudoor) continue;
                }
            }
            // C: avoid poison gas when not already in it
            if (!poisongas_ok && !in_poisongas && visible_region_at(nx, ny)) {
                continue;
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
            if (!((poolok || mfndpos_is_pool(nx, ny) === wantpool)
                && (lavaok || !mfndpos_is_lava(nx, ny)))) {
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
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c movemon_singlemon()
async function movemon_singlemon(mtmp) {
    if (!mtmp || mtmp.mhp <= 0) return false;

    // C: m_everyturn_effect before movement gate (fog vapor even if idle)
    m_everyturn_effect(mtmp);

    if ((mtmp.movement | 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED) game._somebody_can_move = true;

    // C: is_hider — restrap may hide again; disguised/undetected skip dochug
    // (eel hideunder / minliquid / equip I_SPECIAL deferred)
    if (is_hider(mtmp.data)) {
        if (restrap(mtmp)) return false;
        const ap = M_AP_TYPE(mtmp);
        if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) return false;
        if (mtmp.mundetected) return false;
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

// C ref: mon.c movemon()
export async function movemon() {
    game._somebody_can_move = false;
    if (game.program_state?.gameover) return false;
    const list = game.fmon || [];
    // Snapshot — dochug may mutate list later
    for (const mtmp of list.slice()) {
        if (game.program_state?.gameover) break;
        await movemon_singlemon(mtmp);
    }
    // C: after last mon — if (u.utotype) deferred_goto(); somebody_can_move=FALSE
    // Lazy import avoids mon.js ↔ do.js cycle (do.js imports m_at/mnexto).
    // Named omissions: any_light_source vision_full_recalc; clear_bypasses;
    // clear_splitobjs; dmonsfree before the utotype check.
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
 * Used by hide_monst; monmove.js keeps a parallel local for postmov.
 * Named omissions: You_see pline; pet cursed_object_at; cockatrice skip;
 * youmonst path; can_hide_under_obj filter.
 */
function hideunder(mtmp) {
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
        const typ = game.level?.at?.(x, y)?.typ;
        const pool = typ === POOL || typ === MOAT || typ === WATER;
        undetected = !!(pool && !Is_waterlevel(u.uz)
            && (!(u.Underwater) || !cansee(x, y)));
    } else if (hides_under(mtmp.data)) {
        const otmp = objects_at(x, y);
        if (otmp) {
            const typ = game.level?.at?.(x, y)?.typ;
            const poolOrLava = typ === POOL || typ === MOAT || typ === WATER
                || typ === LAVAPOOL || typ === LAVAWALL;
            if (!poolOrLava) undetected = true;
        }
    }

    if (is_u) {
        u.uundetected = undetected ? 1 : 0;
    } else {
        const oldundetctd = !!mtmp.mundetected;
        mtmp.mundetected = undetected ? 1 : 0;
        if (undetected !== oldundetctd) newsym(x, y);
    }
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
