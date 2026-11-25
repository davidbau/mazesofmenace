// makemon.js — monster type selection and monster creation.
// C ref: makemon.c — uncommon, align_shift, temperature_shift, rndmonst,
// rndmonst_adj, mk_gen_ok, cmp_init_mongen_order, init_mongen_order,
// mkclass, mkclass_aligned, adj_lev, makemon, newmonhp, m_initweap,
// m_initinv, m_initthrow, mongets, mkmonmoney, golemhp, propagate,
// peace_minded, set_malign, m_initgrp, wrong_elem_type; muse.c
// rnd_{defensive,offensive,misc}_item; teleport.c goodpos; questpgr.c
// qt_montype; minion.c ndemon.
//
// Not ported yet: newcham (shapechangers),
// set_mimic_sym, rndghostname, worm tail segments.

import { db_under_typ } from './display.js';
import { impossible } from './hack.js';
import { rnd_class } from './mkobj.js';
import { christen_monst, rndghostname, Amonnam, y_monnam, mon_nam, pmname,
         Mgender, YMonnam, pronoun_gender, PRONOUN_HALLU } from './do_name.js';
import { genders } from './role.js';
import { canspotmon } from './display.js';
import { mondied } from './mon.js';
import { in_town } from './hack.js';
import { game } from './gstate.js';
import { stop_timer, obj_to_any, monst_to_any, begin_burn } from './timeout.js';
import { ROT_CORPSE, next2u } from './const.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { level_difficulty, Is_special, In_hell } from './dungeon.js';
import {
    mons, LOW_PM, SPECIAL_PM, NUMMONS, PM_ORC, PM_GIANT, PM_ELF, PM_HUMAN,
    PM_WIZARD_OF_YENDOR, G_FREQ, G_NOGEN, G_UNIQ, G_HELL, G_NOHELL, G_IGNORE,
    S_LICH, MR_FIRE, MR_COLD, MAXMCLASSES,
} from './monsters.js';
import * as M from './monsters.js';
import * as O from './objects.js';
import { objects } from './objects.js';
import {
    G_GONE, A_NEUTRAL, A_NONE, ALIGNWEIGHT,
    AM_NONE, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC,
    MM_NOWAIT, MM_NOCOUNTBIRTH, MM_IGNOREWATER, MM_ADJACENTOK,
    MM_NONAME, MM_EDOG, MM_ASLEEP, MM_NOGRP, MM_MALE, MM_FEMALE, MM_NOMSG,
    MM_NOEXCLAM, MM_IGNORELAVA, NO_MINVENT, NO_MM_FLAGS,
    GP_ALLOW_U, GP_CHECKSCARY, GP_AVOID_MONPOS,
    A_LAWFUL, POOL, MOAT, WATER, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL,
    W_NONPASSWALL, D_CLOSED, D_LOCKED, P_POLEARMS, P_SHORT_SWORD, P_SABER,
    ALTAR, COLNO, ROWNO, isok, ACCESSIBLE, IS_STWALL, IS_DOOR,
    W_ARM, I_SPECIAL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT, ICE, STONE,
} from './const.js';
import {
    ROOMOFFSET, OBJ_AT, IS_WALL, SDOOR, SCORR, HWALL, TLCORNER, TRWALL, BLCORNER,
    TDWALL, CROSSWALL, TUWALL, M_AP_OBJECT, M_AP_FURNITURE,
    ZOO, VAULT, DELPHI, TEMPLE, SHOPBASE, FODDERSHOP,
    TRUE, FALSE, Align2amask,
} from './const.js';
import { ROLL_FROM } from './rng.js';
import { depth } from './dungeon.js';
import { mkobj, rndmonnum, can_be_hatched } from './mkobj.js';
import { t_at, locomotion } from './trap.js';
import { ansimpleoname } from './iactions.js';
import { oname } from './do_name.js';
import { ONAME_RANDOM } from './const.js';
import { get_shop_item } from './shknam.js';
import { mksobj, mkobj_at, curse, bless, next_ident, set_corpsenm } from './mkobj.js';
import {
    monsndx, set_mon_data, is_elf, is_dwarf, is_demon, is_male, is_female,
    is_neuter, is_undead, is_swimmer, is_floater, passes_walls, haseyes,
    is_bat, little_to_big, pm_invisible, emits_light,
} from './mondata.js';
import { new_light_source } from './light.js';
import { LS_MONSTER } from './const.js';
import { deliver_obj_to_mon } from './dokick.js';
import { See_invisible } from './youprop.js';
import { Role_if, Race_if, u_at } from './const.js';
import { mhe } from './mhitu.js';
import { engr_at } from './engrave.js';
import { enexto_core, enexto_gpflags } from './teleport.js';
import { newedog } from './dog.js';
import { M_AP_NOTHING, M_AP_MONSTER, HALLUC, TELEPAT,
         DETECT_MONSTERS, PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { dist2 } from './hacklib.js';
import { an, vtense } from './objnam.js';
import { newsym, pline, canseemon, You_see, vobj_at } from './display.js';
import { does_block, block_point, cansee, couldsee } from './vision.js';
import { Resists_Elem } from './mondata.js';
import { PIT, SPIKED_PIT, STONE_RES, PLNMSG_HIDE_UNDER, Is_juiblex_level,
         SEE_INVIS } from './const.js';
import { set_apparxy, dochugw } from './monmove.js';
import { noteleport_level } from './teleport.js';
import { newcham_sync } from './mon.js';
import { mpickobj } from './steal.js';
import { add_to_minv, weight } from './mkobj.js';
import { m_dowear, which_armor, mon_adjust_speed_sync } from './worn.js';
import { def_monsyms } from './drawing.js';
import { get_wormno, initworm, count_wsegs, place_worm_tail_randomly,
         wseg_mon_at } from './worm.js';
import { Is_waterlevel, Is_firelevel, Is_airlevel, G_GENOD,
         G_EXTINCT } from './const.js';
import { is_flyer } from './mondata.js';
export {
    NO_MM_FLAGS, NO_MINVENT, MM_NOWAIT, MM_NOCOUNTBIRTH, MM_IGNOREWATER,
    MM_ADJACENTOK, MM_NONAME, MM_EDOG, MM_ASLEEP, MM_NOGRP, MM_MALE,
    MM_FEMALE, MM_NOMSG, MM_NOEXCLAM, MM_IGNORELAVA,
};
// C ref: hack.h -- the MM_* flags that const.js doesn't have
export const MM_ANGRY = 0x00000020;
export const MM_EGD = 0x00000080;
export const MM_EPRI = 0x00000100;
export const MM_ESHK = 0x00000200;
export const MM_EMIN = 0x00000400;
export const MM_NOTAIL = 0x00004000;
export const MM_MINVIS = 0x00100000;

/* G_GENOD, G_EXTINCT (monflag.h mvitals[].mvflags): const.js */
const W_ARMH = 0x00000004;
const W_SADDLE = 0x00100000;

// ---- mondata.h predicates used on this path ----
// C ref: mondata.c attacktype()
function attacktype(ptr, atyp) {
    for (let i = 0; i < ptr.mattk.length; i++)
        if (ptr.mattk[i].aatyp === atyp) return true;
    return false;
}
export function is_armed(ptr) { return attacktype(ptr, M.AT_WEAP); }
function is_mercenary(ptr) { return (ptr.mflags2 & M.M2_MERC) !== 0; }
function strongmonst(ptr) { return (ptr.mflags2 & M.M2_STRONG) !== 0; }
export function is_lord(ptr) { return (ptr.mflags2 & M.M2_LORD) !== 0; }
export function is_prince(ptr) { return (ptr.mflags2 & M.M2_PRINCE) !== 0; }
function extra_nasty(ptr) { return (ptr.mflags2 & M.M2_NASTY) !== 0; }
function is_giant(ptr) { return (ptr.mflags2 & M.M2_GIANT) !== 0; }
function throws_rocks(ptr) { return (ptr.mflags2 & M.M2_ROCKTHROW) !== 0; }
function likes_gold(ptr) { return (ptr.mflags2 & M.M2_GREEDY) !== 0; }
function likes_gems(ptr) { return (ptr.mflags2 & M.M2_JEWELS) !== 0; }
export function is_domestic(ptr) { return (ptr.mflags2 & M.M2_DOMESTIC) !== 0; }
function always_peaceful(ptr) { return (ptr.mflags2 & M.M2_PEACEFUL) !== 0; }
function always_hostile(ptr) { return (ptr.mflags2 & M.M2_HOSTILE) !== 0; }
function race_peaceful(ptr) { return (ptr.mflags2 & game.urace.lovemask) !== 0; }
function race_hostile(ptr) { return (ptr.mflags2 & game.urace.hatemask) !== 0; }
function is_minion(ptr) { return (ptr.mflags2 & M.M2_MINION) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M.M1_MINDLESS) !== 0; }
function humanoid(ptr) { return (ptr.mflags1 & M.M1_HUMANOID) !== 0; }
function amorphous(ptr) { return (ptr.mflags1 & M.M1_AMORPHOUS) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === M.S_GHOST; }
function is_whirly(ptr) {
    return ptr.mlet === M.S_VORTEX || ptr === mons[M.PM_AIR_ELEMENTAL];
}
export function is_golem(ptr) { return ptr.mlet === M.S_GOLEM; }
function is_rider(ptr) {
    return ptr === mons[M.PM_DEATH] || ptr === mons[M.PM_FAMINE]
           || ptr === mons[M.PM_PESTILENCE];
}
function is_dlord(ptr) { return is_demon(ptr) && is_lord(ptr); }
function is_dprince(ptr) { return is_demon(ptr) && is_prince(ptr); }
function is_ndemon(ptr) {
    return is_demon(ptr) && !is_dlord(ptr) && !is_dprince(ptr);
}
function is_unicorn(ptr) { return ptr.mlet === M.S_UNICORN && likes_gems(ptr); }
function weirdnonliving(ptr) { return is_golem(ptr) || ptr.mlet === M.S_VORTEX; }
export function nonliving(ptr) {
    return is_undead(ptr) || ptr === mons[M.PM_MANES] || weirdnonliving(ptr);
}
function unique_corpstat(ptr) { return (ptr.geno & G_UNIQ) !== 0; }
export function is_mplayer(ptr) {
    return ptr.pmidx >= M.PM_ARCHEOLOGIST && ptr.pmidx <= M.PM_WIZARD;
}
// C ref: makemon.c is_home_elemental()
export function is_home_elemental(ptr) {
    if (ptr.mlet !== M.S_ELEMENTAL) return false;
    const t = game.dungeon_topology;
    switch (ptr.pmidx) {
    case M.PM_AIR_ELEMENTAL: return on_lev(t.d_air_level);
    case M.PM_FIRE_ELEMENTAL: return on_lev(t.d_fire_level);
    case M.PM_EARTH_ELEMENTAL: return on_lev(t.d_earth_level);
    case M.PM_WATER_ELEMENTAL: return on_lev(t.d_water_level);
    }
    return false;
}
// C ref: mondata.h mon_aligntyp(); is_lminion()
function mon_aligntyp(mon) {
    const ptr = mon.data;
    const algn = (mon.ispriest && mon.epri) ? mon.epri.shralign
                 : (mon.isminion && mon.emin) ? mon.emin.min_align
                 : ptr.maligntyp;
    if (algn === A_NONE) return A_NONE;
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? -1 : A_NEUTRAL;
}
function is_lminion(mon) {
    return is_minion(mon.data) && mon_aligntyp(mon) === A_LAWFUL;
}
// C ref: objclass.h is_sword()
function is_sword(otmp) {
    return objects[otmp.otyp].oc_skill >= P_SHORT_SWORD
           && objects[otmp.otyp].oc_skill <= P_SABER;
}
// C ref: makemon.c quest_mon_represents_role()
function quest_mon_represents_role(mptr, role_pm) {
    return (mptr.mlet === M.S_HUMAN && Role_if(role_pm)
            && (mptr.msound === M.MS_LEADER || mptr.msound === M.MS_NEMESIS));
}
// C ref: steed.c can_saddle()
export function can_saddle(mtmp) {
    const ptr = mtmp.data;
    const steeds = [M.S_QUADRUPED, M.S_UNICORN, M.S_ANGEL, M.S_CENTAUR,
                    M.S_DRAGON, M.S_JABBERWOCK];
    return (steeds.includes(ptr.mlet) && (ptr.msize >= M.MZ_MEDIUM)
            && (!humanoid(ptr) || ptr.mlet === M.S_CENTAUR) && !amorphous(ptr)
            && !noncorporeal(ptr) && !is_whirly(ptr) && !unsolid(ptr));
}

// ---- dungeon predicates (dungeon.h) ----
function on_lev(z) {
    const uz = game.u.uz;
    return !!(z && (z.dnum || z.dlevel) && uz.dnum === z.dnum && uz.dlevel === z.dlevel);
}
function In_sokoban(lev) { return lev.dnum === game.dungeon_topology.d_sokoban_dnum; }
function In_mines(lev) { return lev.dnum === game.dungeon_topology.d_mines_dnum; }
function In_quest(lev) { return lev.dnum === game.dungeon_topology.d_quest_dnum; }
function In_V_tower(lev) { return lev.dnum === game.dungeon_topology.d_tower_dnum; }
function Is_stronghold() { return on_lev(game.dungeon_topology.d_stronghold_level); }
function Is_knox() { return on_lev(game.dungeon_topology.d_knox_level); }
function Is_earthlevel() { return on_lev(game.dungeon_topology.d_earth_level); }

// ---- map / monster-position helpers ----
// C ref: display.h m_at(); MON_AT() -- level monsters are kept in
// game.level.monsters (C keeps a grid; a list with mx/my is equivalent);
// a long worm's tail segments are its grid cells kept in game.level.wsegs;
// a ridden steed is on the monster list but not on C's grid (mount_steed()
// does remove_monster()), so it is skipped
export function m_at(x, y) {
    const lst = game.level.monsters || [];
    for (const m of lst)
        if (m.mx === x && m.my === y && !m.dead && m !== game.u.usteed)
            return m;
    return wseg_mon_at(x, y);
}
export function MON_AT(x, y) { return !!m_at(x, y); }
// C ref: mon.c place_monster()
export function place_monster(mon, x, y) {
    mon.mx = x;
    mon.my = y;
    if (!game.level.monsters) game.level.monsters = [];
    if (!game.level.monsters.includes(mon)) game.level.monsters.push(mon);
}
// C ref: invent.c sobj_at() -- floor object chains aren't ported; uses
// game.level.objects when something has put objects there
export function sobj_at(otyp, x, y) {
    for (const o of game.level.objects || [])
        if (o.otyp === otyp && o.ox === x && o.oy === y) return o;
    return null;
}
// C ref: dbridge.c is_pool()
export function is_pool(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level.at(x, y).typ;
    /* The ltyp == MOAT is not redundant with is_moat, because the
     * Juiblex level does not have moats, although it has MOATs. There
     * is probably a better way to express this. */
    return typ === POOL || typ === MOAT || typ === WATER || is_moat(x, y);
}
// C ref: dbridge.c is_lava()
export function is_lava(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level.at(x, y).typ;
    return typ === LAVAPOOL || typ === LAVAWALL
           || (typ === DRAWBRIDGE_UP
               && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_LAVA);
}
// C ref: dbridge.c is_moat()
export function is_moat(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level.at(x, y).typ;
    return !Is_juiblex_level(game.u.uz)
           && (typ === MOAT
               || (typ === DRAWBRIDGE_UP
                   && ((game.level.at(x, y).drawbridgemask ?? 0) & DB_UNDER) === DB_MOAT));
}
// C ref: monmove.c accessible()
export function accessible(x, y) {
    /* use underlying terrain in front of closed drawbridge */
    const lev = game.level.at(x, y);
    const levtyp = (lev.typ === DRAWBRIDGE_UP) /* SURFACE_AT() */
                   ? db_under_typ(lev.drawbridgemask ?? 0) : lev.typ;

    return ACCESSIBLE(levtyp) && !closed_door(x, y);
}
// C ref: lock.c closed_door(); hack.c may_passwall()
export function closed_door(x, y) {
    const loc = game.level.at(x, y);
    return IS_DOOR(loc.typ) && ((loc.doormask ?? 0) & (D_LOCKED | D_CLOSED)) !== 0;
}
export function may_passwall(x, y) {
    const loc = game.level.at(x, y);
    return !(IS_STWALL(loc.typ) && ((loc.wall_info ?? 0) & W_NONPASSWALL));
}
// C ref: engrave.c sengr_at()
export function sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);
    if (ep && ep.engr_type !== HEADSTONE && ep.engr_time <= game.moves) {
        const txt = String(ep.engr_txt?.actual_text ?? '');
        if (strict ? txt.toLowerCase() === s.toLowerCase()
                   : txt.toLowerCase().includes(s.toLowerCase()))
            return ep;
    }
    return null;
}
const HEADSTONE = 6; /* C ref: engrave.h */
// C ref: region.c is_exclusion_zone() -- no exclusion zones are set up on
// the levels generated so far
function is_exclusion_zone(type, x, y) { return false; }
const LR_MONGEN = 2;

// C ref: teleport.c goodpos_onscary()
function goodpos_onscary(x, y, mptr) {
    /* onscary() checks Angels and lawful minions; this oversimplifies */
    if (mptr.mlet === M.S_HUMAN || mptr.mlet === M.S_ANGEL
        || is_rider(mptr) || unique_corpstat(mptr))
        return false;
    /* onscary() checks for vampshifted vampire bats/fog clouds/wolves too */
    if (game.level.at(x, y).typ === ALTAR && mptr.mlet === M.S_VAMPIRE)
        return true;
    /* scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (sobj_at(O.SCR_SCARE_MONSTER, x, y))
        return true;
    /* engraved Elbereth doesn't work in Gehennom or the end-game */
    if (In_hell(game.u.uz) || In_endgame(game.u.uz))
        return false;
    /* creatures who don't (or can't) fear a written Elbereth and weren't
       caught by the minions check */
    if (mptr === mons[M.PM_MINOTAUR] || !haseyes(mptr))
        return false;
    return sengr_at('Elbereth', x, y, true) ? true : false;
}

// C ref: teleport.c goodpos()
export function goodpos(x, y, mtmp, gpflags) {
    let mdat = null;
    const ignorewater = ((gpflags & MM_IGNOREWATER) !== 0),
          ignorelava = ((gpflags & MM_IGNORELAVA) !== 0),
          checkscary = ((gpflags & GP_CHECKSCARY) !== 0),
          allow_u = ((gpflags & GP_ALLOW_U) !== 0),
          avoid_monpos = ((gpflags & GP_AVOID_MONPOS) !== 0);

    if (!isok(x, y))
        return false;

    if (!allow_u) {
        if (u_at(x, y) && mtmp !== game.youmonst
            && (mtmp !== game.u.ustuck || !game.u.uswallow)
            && (!game.u.usteed || mtmp !== game.u.usteed))
            return false;
    }

    if (MON_AT(x, y) && avoid_monpos)
        return false;

    if (mtmp) {
        const mtmp2 = m_at(x, y);

        if (mtmp2 && (mtmp2 !== mtmp || mtmp.wormno))
            return false;

        mdat = mtmp.data;
        if (is_pool(x, y) && !ignorewater) {
            /* the hero (gy.youmonst) case isn't reached from makemon();
               m_in_air(): is_flyer || is_floater (no monster levitation) */
            return (is_swimmer(mdat)
                    || ((mdat.mflags1 & M.M1_FLY) !== 0 || is_floater(mdat)));
        } else if (mdat.mlet === M.S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava(x, y) && !ignorelava) {
            /* 3.6.3: floating eye can levitate over lava but it avoids
               that due the effect of the heat causing it to dry out */
            if (mdat === mons[M.PM_FLOATING_EYE])
                return false;
            /* m_in_air(mtmp) || likes_lava(mdat) */
            return ((mdat.mflags1 & M.M1_FLY) !== 0 || is_floater(mdat)
                    || mdat === mons[M.PM_FIRE_ELEMENTAL]
                    || mdat === mons[M.PM_SALAMANDER]);
        }
        if (passes_walls(mdat) && may_passwall(x, y))
            return true;
        if (amorphous(mdat) && closed_door(x, y))
            return true;
        /* avoid onscary() if caller has specified that restriction;
           onscary() for existing monsters (m_id set) is not ported yet,
           goodpos_onscary() stands in for both */
        if (checkscary && goodpos_onscary(x, y, mdat))
            return false;
    }
    if (!accessible(x, y)) {
        if (!(is_pool(x, y) && ignorewater)
            && !(is_lava(x, y) && ignorelava))
            return false;
    }
    /* skip boulder locations for most creatures */
    if (sobj_at(O.BOULDER, x, y) && (!mdat || !throws_rocks(mdat)))
        return false;
    /* pretend GP_AVOID_MONPOS == monster creation */
    if (avoid_monpos && is_exclusion_zone(LR_MONGEN, x, y))
        return false;

    return true;
}

// ---- inventory helpers ----
/* C ref: worn.c which_armor() lives in worn.js */
export { which_armor };
// C ref: invent.c findgold()
function findgold(chain) {
    for (const o of chain || [])
        if (o.otyp === O.GOLD_PIECE) return o;
    return null;
}

// C ref: makemon.c m_initthrow()
function m_initthrow(mtmp, otyp, oquan) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = rn1(oquan, 3);
    otmp.owt = weight(otmp);
    if (otyp === O.ORCISH_ARROW)
        otmp.otrapped /* opoisoned */ = true;
    mpickobj(mtmp, otmp);
}

// C ref: makemon.c m_initweap()
function m_initweap(mtmp) {
    const ptr = mtmp.data;
    const mm = monsndx(ptr);
    let otmp;
    let bias, w1, w2;

    if (Is_rogue_level(game.u.uz))
        return;
    /*
     *  First a few special cases:
     *          giants get a boulder to throw sometimes
     *          ettins get clubs
     *          kobolds get darts to throw
     *          centaurs get some sort of bow & arrows or bolts
     *          soldiers get all sorts of things
     *          kops get clubs & cream pies.
     */
    switch (ptr.mlet) {
    case M.S_GIANT:
        if (rn2(2))
            mongets(mtmp, (mm !== M.PM_ETTIN) ? O.BOULDER : O.CLUB);
        if ((mm !== M.PM_ETTIN) && !rn2(5))
            mongets(mtmp, rn2(2) ? O.TWO_HANDED_SWORD : O.BATTLE_AXE);
        break;
    case M.S_HUMAN:
        if (is_mercenary(ptr)) {
            w1 = w2 = 0;
            switch (mm) {
            case M.PM_WATCHMAN:
            case M.PM_SOLDIER:
                if (!rn2(3)) {
                    /* lance and dwarvish mattock used to be in midst of
                       the polearms but use different skills from polearms
                       and aren't appropriates choices for human soldiers */
                    do {
                        w1 = rn1(O.BEC_DE_CORBIN - O.PARTISAN + 1, O.PARTISAN);
                    } while (objects[w1].oc_skill !== P_POLEARMS);
                    w2 = rn2(2) ? O.DAGGER : O.KNIFE;
                } else
                    w1 = rn2(2) ? O.SPEAR : O.SHORT_SWORD;
                break;
            case M.PM_SERGEANT:
                w1 = rn2(2) ? O.FLAIL : O.MACE;
                break;
            case M.PM_LIEUTENANT:
                w1 = rn2(2) ? O.BROADSWORD : O.LONG_SWORD;
                break;
            case M.PM_CAPTAIN:
            case M.PM_WATCH_CAPTAIN:
                w1 = rn2(2) ? O.LONG_SWORD : O.SILVER_SABER;
                break;
            default:
                if (!rn2(4))
                    w1 = O.DAGGER;
                if (!rn2(7))
                    w2 = O.SPEAR;
                break;
            }
            if (w1)
                mongets(mtmp, w1);
            if (!w2 && w1 !== O.DAGGER && !rn2(4))
                w2 = O.KNIFE;
            if (w2)
                mongets(mtmp, w2);
        } else if (is_elf(ptr)) {
            if (rn2(2))
                mongets(mtmp, rn2(2) ? O.ELVEN_MITHRIL_COAT : O.ELVEN_CLOAK);
            if (rn2(2))
                mongets(mtmp, O.ELVEN_LEATHER_HELM);
            else if (!rn2(4))
                mongets(mtmp, O.ELVEN_BOOTS);
            if (rn2(2))
                mongets(mtmp, O.ELVEN_DAGGER);
            switch (rn2(3)) {
            case 0:
                if (!rn2(4))
                    mongets(mtmp, O.ELVEN_SHIELD);
                if (rn2(3))
                    mongets(mtmp, O.ELVEN_SHORT_SWORD);
                mongets(mtmp, O.ELVEN_BOW);
                m_initthrow(mtmp, O.ELVEN_ARROW, 12);
                break;
            case 1:
                mongets(mtmp, O.ELVEN_BROADSWORD);
                if (rn2(2))
                    mongets(mtmp, O.ELVEN_SHIELD);
                break;
            case 2:
                if (rn2(2)) {
                    mongets(mtmp, O.ELVEN_SPEAR);
                    mongets(mtmp, O.ELVEN_SHIELD);
                }
                break;
            }
            if (mm === M.PM_ELVEN_MONARCH) {
                if (rn2(3) || (game.in_mklev && Is_earthlevel()))
                    mongets(mtmp, O.PICK_AXE);
                if (!rn2(50))
                    mongets(mtmp, O.CRYSTAL_BALL);
            }
        } else if (ptr.msound === M.MS_PRIEST
                   || quest_mon_represents_role(ptr, M.PM_CLERIC)) {
            otmp = mksobj(O.MACE, false, false);
            otmp.spe = rnd(3);
            if (!rn2(2))
                curse(otmp);
            mpickobj(mtmp, otmp);
        } else if (mm === M.PM_NINJA) { /* extra quest villains */
            mongets(mtmp, rn2(4) ? O.SHURIKEN : O.DART);
            mongets(mtmp, rn2(4) ? O.SHORT_SWORD : O.AXE);
        } else if (ptr.msound === M.MS_GUARDIAN) {
            /* quest "guardians" */
            switch (mm) {
            case M.PM_STUDENT:
            case M.PM_ATTENDANT:
            case M.PM_ABBOT:
            case M.PM_ACOLYTE:
            case M.PM_GUIDE:
            case M.PM_APPRENTICE:
                if (rn2(2))
                    mongets(mtmp, rn2(3) ? O.DAGGER : O.KNIFE);
                if (rn2(5))
                    mongets(mtmp, rn2(3) ? O.LEATHER_JACKET : O.LEATHER_CLOAK);
                if (rn2(3))
                    mongets(mtmp, rn2(3) ? O.LOW_BOOTS : O.HIGH_BOOTS);
                if (rn2(3))
                    mongets(mtmp, O.POT_HEALING);
                break;
            case M.PM_CHIEFTAIN:
            case M.PM_PAGE:
            case M.PM_ROSHI:
            case M.PM_WARRIOR:
                mongets(mtmp, rn2(3) ? O.LONG_SWORD : O.SHORT_SWORD);
                mongets(mtmp, rn2(3) ? O.CHAIN_MAIL : O.LEATHER_ARMOR);
                if (rn2(2))
                    mongets(mtmp, rn2(2) ? O.LOW_BOOTS : O.HIGH_BOOTS);
                if (!rn2(3))
                    mongets(mtmp, O.LEATHER_CLOAK);
                if (!rn2(3)) {
                    mongets(mtmp, O.BOW);
                    m_initthrow(mtmp, O.ARROW, 12);
                }
                break;
            case M.PM_HUNTER:
                mongets(mtmp, rn2(3) ? O.SHORT_SWORD : O.DAGGER);
                if (rn2(2))
                    mongets(mtmp, rn2(2) ? O.LEATHER_JACKET : O.LEATHER_ARMOR);
                mongets(mtmp, O.BOW);
                m_initthrow(mtmp, O.ARROW, 12);
                break;
            case M.PM_THUG:
                mongets(mtmp, O.CLUB);
                mongets(mtmp, rn2(3) ? O.DAGGER : O.KNIFE);
                if (rn2(2))
                    mongets(mtmp, O.LEATHER_GLOVES);
                mongets(mtmp, rn2(2) ? O.LEATHER_JACKET : O.LEATHER_ARMOR);
                break;
            case M.PM_NEANDERTHAL:
                mongets(mtmp, O.CLUB);
                mongets(mtmp, O.LEATHER_ARMOR);
                break;
            }
        }
        break;

    case M.S_ANGEL:
        if (humanoid(ptr)) {
            /* create minion stuff; bypass mongets */
            const typ = rn2(3) ? O.LONG_SWORD : O.SILVER_MACE;
            const nam = (typ === O.LONG_SWORD) ? "Sunsword" : "Demonbane";

            otmp = mksobj(typ, false, false);
            /* maybe promote weapon to an artifact */
            if ((!rn2(20) || is_lord(ptr))
                && sgn(mtmp.isminion ? mtmp.emin.min_align
                                     : ptr.maligntyp) === A_LAWFUL)
                otmp = oname(otmp, nam, ONAME_RANDOM); /* randomly created */
            /* enhance the weapon */
            bless(otmp);
            otmp.oerodeproof = true;
            /* make long sword be +0 to +3, mace be +3 to +6 to compensate
               for being significantly weaker against large opponents */
            otmp.spe = rn2(4);
            if (typ === O.SILVER_MACE)
                otmp.spe += 3;
            mpickobj(mtmp, otmp);

            otmp = mksobj(!rn2(4) || is_lord(ptr) ? O.SHIELD_OF_REFLECTION
                                                  : O.LARGE_SHIELD,
                          false, false);
            /* uncurse(otmp); -- mksobj(,FALSE,) item is always uncursed */
            otmp.oerodeproof = true;
            otmp.spe = 0;
            mpickobj(mtmp, otmp);
        }
        break;

    case M.S_HUMANOID:
        if (mm === M.PM_HOBBIT) {
            switch (rn2(3)) {
            case 0:
                mongets(mtmp, O.DAGGER);
                break;
            case 1:
                mongets(mtmp, O.ELVEN_DAGGER);
                break;
            case 2:
                mongets(mtmp, O.SLING);
                m_initthrow(mtmp, !rn2(4) ? O.FLINT : O.ROCK, 6);
                break;
            }
            if (!rn2(10))
                mongets(mtmp, O.ELVEN_MITHRIL_COAT);
            if (!rn2(10))
                mongets(mtmp, O.DWARVISH_CLOAK);
        } else if (is_dwarf(ptr)) {
            if (rn2(7))
                mongets(mtmp, O.DWARVISH_CLOAK);
            if (rn2(7))
                mongets(mtmp, O.IRON_SHOES);
            if (!rn2(4)) {
                mongets(mtmp, O.DWARVISH_SHORT_SWORD);
                /* note: you can't use a mattock with a shield */
                if (rn2(2))
                    mongets(mtmp, O.DWARVISH_MATTOCK);
                else {
                    mongets(mtmp, rn2(2) ? O.AXE : O.DWARVISH_SPEAR);
                    mongets(mtmp, O.DWARVISH_ROUNDSHIELD);
                }
                mongets(mtmp, O.DWARVISH_IRON_HELM);
                if (!rn2(3))
                    mongets(mtmp, O.DWARVISH_MITHRIL_COAT);
            } else {
                mongets(mtmp, !rn2(3) ? O.PICK_AXE : O.DAGGER);
            }
        }
        break;
    case M.S_KOP:
        /* create Keystone Kops with cream pies to
           throw. As suggested by KAA.     [MRS] */
        if (!rn2(4))
            m_initthrow(mtmp, O.CREAM_PIE, 2);
        if (!rn2(3))
            mongets(mtmp, (rn2(2)) ? O.CLUB : O.RUBBER_HOSE);
        break;
    case M.S_ORC:
        if (rn2(2))
            mongets(mtmp, O.ORCISH_HELM);
        switch ((mm !== M.PM_ORC_CAPTAIN) ? mm
                : rn2(2) ? M.PM_MORDOR_ORC : M.PM_URUK_HAI) {
        case M.PM_MORDOR_ORC:
            if (!rn2(3))
                mongets(mtmp, O.SCIMITAR);
            if (!rn2(3))
                mongets(mtmp, O.ORCISH_SHIELD);
            if (!rn2(3))
                mongets(mtmp, O.KNIFE);
            if (!rn2(3))
                mongets(mtmp, O.ORCISH_CHAIN_MAIL);
            break;
        case M.PM_URUK_HAI:
            if (!rn2(3))
                mongets(mtmp, O.ORCISH_CLOAK);
            if (!rn2(3))
                mongets(mtmp, O.ORCISH_SHORT_SWORD);
            if (!rn2(3))
                mongets(mtmp, O.IRON_SHOES);
            if (!rn2(3)) {
                mongets(mtmp, O.ORCISH_BOW);
                m_initthrow(mtmp, O.ORCISH_ARROW, 12);
            }
            if (!rn2(3))
                mongets(mtmp, O.URUK_HAI_SHIELD);
            break;
        default:
            if (mm !== M.PM_ORC_SHAMAN && rn2(2))
                mongets(mtmp, (mm === M.PM_GOBLIN || rn2(2) === 0)
                                  ? O.ORCISH_DAGGER
                                  : O.SCIMITAR);
        }
        break;
    case M.S_OGRE:
        if (!rn2(mm === M.PM_OGRE_TYRANT ? 3 : mm === M.PM_OGRE_LEADER ? 6 : 12))
            mongets(mtmp, O.BATTLE_AXE);
        else
            mongets(mtmp, O.CLUB);
        break;
    case M.S_TROLL:
        if (!rn2(2))
            switch (rn2(4)) {
            case 0:
                mongets(mtmp, O.RANSEUR);
                break;
            case 1:
                mongets(mtmp, O.PARTISAN);
                break;
            case 2:
                mongets(mtmp, O.GLAIVE);
                break;
            case 3:
                mongets(mtmp, O.SPETUM);
                break;
            }
        break;
    case M.S_KOBOLD:
        if (!rn2(4))
            m_initthrow(mtmp, O.DART, 12);
        break;

    case M.S_CENTAUR:
        if (rn2(2)) {
            if (ptr === mons[M.PM_FOREST_CENTAUR]) {
                mongets(mtmp, O.BOW);
                m_initthrow(mtmp, O.ARROW, 12);
            } else {
                mongets(mtmp, O.CROSSBOW);
                m_initthrow(mtmp, O.CROSSBOW_BOLT, 12);
            }
        }
        break;
    case M.S_WRAITH:
        mongets(mtmp, O.KNIFE);
        mongets(mtmp, O.LONG_SWORD);
        break;
    case M.S_ZOMBIE:
        if (!rn2(4))
            mongets(mtmp, O.LEATHER_ARMOR);
        if (!rn2(4))
            mongets(mtmp, (rn2(3) ? O.KNIFE : O.SHORT_SWORD));
        break;
    case M.S_LIZARD:
        if (mm === M.PM_SALAMANDER)
            mongets(mtmp, (rn2(7) ? O.SPEAR : rn2(3) ? O.TRIDENT : O.STILETTO));
        break;
    case M.S_DEMON:
        switch (mm) {
        case M.PM_BALROG:
            mongets(mtmp, O.BULLWHIP);
            mongets(mtmp, O.BROADSWORD);
            break;
        case M.PM_ORCUS:
            mongets(mtmp, O.WAN_DEATH); /* the Wand of Orcus */
            break;
        case M.PM_HORNED_DEVIL:
            mongets(mtmp, rn2(4) ? O.TRIDENT : O.BULLWHIP);
            break;
        case M.PM_DISPATER:
            mongets(mtmp, O.WAN_STRIKING);
            break;
        case M.PM_YEENOGHU:
            mongets(mtmp, O.FLAIL);
            break;
        }
        /* prevent djinn and mail daemons from leaving objects when
         * they vanish
         */
        if (!is_demon(ptr))
            break;
        /* FALLTHRU */
    default:
        /*
         * Now the general case, some chance of getting some type
         * of weapon for "normal" monsters.  Certain special types
         * of monsters will get a bonus chance or different selections.
         */
        bias = is_lord(ptr) + is_prince(ptr) * 2 + extra_nasty(ptr);
        switch (rnd(14 - (2 * bias))) {
        case 1:
            if (strongmonst(ptr))
                mongets(mtmp, O.BATTLE_AXE);
            else
                m_initthrow(mtmp, O.DART, 12);
            break;
        case 2:
            if (strongmonst(ptr))
                mongets(mtmp, O.TWO_HANDED_SWORD);
            else {
                mongets(mtmp, O.CROSSBOW);
                m_initthrow(mtmp, O.CROSSBOW_BOLT, 12);
            }
            break;
        case 3:
            mongets(mtmp, O.BOW);
            m_initthrow(mtmp, O.ARROW, 12);
            break;
        case 4:
            if (strongmonst(ptr))
                mongets(mtmp, O.LONG_SWORD);
            else
                m_initthrow(mtmp, O.DAGGER, 3);
            break;
        case 5:
            if (strongmonst(ptr))
                mongets(mtmp, O.LUCERN_HAMMER);
            else
                mongets(mtmp, O.AKLYS);
            break;
        default:
            break;
        }
        break;
    }

    if (mtmp.m_lev > rn2(75))
        mongets(mtmp, rnd_offensive_item(mtmp));
}

// C ref: makemon.c mkmonmoney()
/* create a new stack of gold in monster's inventory */
export function mkmonmoney(mtmp, amount) {
    /* mk_mplayer() passes rn2(1000) so the amount might be 0 */
    if (amount > 0) {
        const gold = mksobj(O.GOLD_PIECE, false, false);

        gold.quan = amount;
        gold.owt = weight(gold);
        add_to_minv(mtmp, gold);
    }
}

// C ref: hack.h ARM_BONUS()
function ARM_BONUS(obj) {
    return objects[obj.otyp].a_ac + (obj.spe || 0)
           - Math.min(greatest_erosion(obj), objects[obj.otyp].a_ac);
}

// C ref: obj.h greatest_erosion()
function greatest_erosion(otmp) {
    return Math.max(otmp.oeroded || 0, otmp.oeroded2 || 0);
}

// C ref: makemon.c m_initinv()
function m_initinv(mtmp) {
    let cnt;
    let otmp;
    const ptr = mtmp.data;

    if (Is_rogue_level(game.u.uz))
        return;
    /*
     *  Soldiers get armour & rations - armour approximates their ac.
     *  Nymphs may get mirror or potion of object detection.
     */
    switch (ptr.mlet) {
    case M.S_HUMAN:
        if (is_mercenary(ptr)) {
            let mac;

            switch (monsndx(ptr)) {
            case M.PM_GUARD: mac = -1; break;
            case M.PM_SOLDIER: mac = 3; break;
            case M.PM_SERGEANT: mac = 0; break;
            case M.PM_LIEUTENANT: mac = -2; break;
            case M.PM_CAPTAIN: mac = -3; break;
            case M.PM_WATCHMAN: mac = 3; break;
            case M.PM_WATCH_CAPTAIN: mac = -2; break;
            default:
                impossible(`odd mercenary ${monsndx(ptr)}?`);
                mac = 0;
                break;
            }
            /* #define add_ac(otmp) */
            const add_ac = () => {
                if (otmp) mac += ARM_BONUS(otmp);
                otmp = null;
            };

            /* round 1: give them body armor */
            if (mac < -1 && rn2(5))
                otmp = mongets(mtmp, (rn2(5)) ? O.PLATE_MAIL : O.CRYSTAL_PLATE_MAIL);
            else if (mac < 3 && rn2(5))
                otmp = mongets(mtmp, (rn2(3)) ? O.SPLINT_MAIL : O.BANDED_MAIL);
            else if (rn2(5))
                otmp = mongets(mtmp, (rn2(3)) ? O.RING_MAIL : O.STUDDED_LEATHER_ARMOR);
            else
                otmp = mongets(mtmp, O.LEATHER_ARMOR);
            add_ac();

            /* round 2: helmets */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, O.HELMET);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, O.DENTED_POT);
            add_ac();

            /* round 3: shields */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, O.SMALL_SHIELD);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, O.LARGE_SHIELD);
            add_ac();

            /* round 4: boots */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, O.LOW_BOOTS);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, O.HIGH_BOOTS);
            add_ac();

            /* round 5: gloves + cloak */
            if (mac < 10 && rn2(3))
                otmp = mongets(mtmp, O.LEATHER_GLOVES);
            else if (mac < 10 && rn2(2))
                otmp = mongets(mtmp, O.LEATHER_CLOAK);
            add_ac(); /* not technically needed */

            if (ptr === mons[M.PM_WATCH_CAPTAIN]) {
                ; /* better weapon rather than extra gear here */
            } else if (ptr === mons[M.PM_WATCHMAN]) {
                if (rn2(3)) /* most watchmen carry a whistle */
                    mongets(mtmp, O.TIN_WHISTLE);
            } else if (ptr === mons[M.PM_GUARD]) {
                /* if hero teleports out of a vault while being confronted
                   by the vault's guard, there is a shrill whistling sound,
                   so guard evidently carries a cursed whistle */
                otmp = mksobj(O.TIN_WHISTLE, true, false);
                curse(otmp);
                mpickobj(mtmp, otmp);
            } else { /* soldiers and their officers */
                if (!rn2(3))
                    mongets(mtmp, O.K_RATION);
                if (!rn2(2))
                    mongets(mtmp, O.C_RATION);
                if (ptr !== mons[M.PM_SOLDIER] && !rn2(3))
                    mongets(mtmp, O.BUGLE);
            }
        } else if (ptr === mons[M.PM_SHOPKEEPER]) {
            mongets(mtmp, O.SKELETON_KEY);
            switch (rn2(4)) {
            /* MAJOR fall through ... */
            case 0:
                mongets(mtmp, O.WAN_MAGIC_MISSILE);
                /* FALLTHRU */
            case 1:
                mongets(mtmp, O.POT_EXTRA_HEALING);
                /* FALLTHRU */
            case 2:
                mongets(mtmp, O.POT_HEALING);
                /* FALLTHRU */
            case 3:
                mongets(mtmp, O.WAN_STRIKING);
            }
        } else if (ptr.msound === M.MS_PRIEST
                   || quest_mon_represents_role(ptr, M.PM_CLERIC)) {
            mongets(mtmp, rn2(7) ? O.ROBE
                                 : rn2(3) ? O.CLOAK_OF_PROTECTION
                                          : O.CLOAK_OF_MAGIC_RESISTANCE);
            mongets(mtmp, O.SMALL_SHIELD);
            mkmonmoney(mtmp, rn1(10, 20));
        } else if (quest_mon_represents_role(ptr, M.PM_MONK)) {
            mongets(mtmp, rn2(11) ? O.ROBE : O.CLOAK_OF_MAGIC_RESISTANCE);
        }
        break;
    case M.S_NYMPH:
        if (!rn2(2))
            mongets(mtmp, O.MIRROR);
        if (!rn2(2))
            mongets(mtmp, O.POT_OBJECT_DETECTION);
        break;
    case M.S_GIANT:
        if (ptr === mons[M.PM_MINOTAUR]) {
            if (!rn2(8) || (game.in_mklev && Is_earthlevel()))
                mongets(mtmp, O.WAN_DIGGING);
        } else if (is_giant(ptr)) {
            for (cnt = rn2(Math.trunc(mtmp.m_lev / 2)); cnt; cnt--) {
                otmp = mksobj(rnd_class(O.DILITHIUM_CRYSTAL, O.LUCKSTONE - 1),
                              false, false);
                otmp.quan = rn1(2, 3);
                otmp.owt = weight(otmp);
                mpickobj(mtmp, otmp);
            }
        }
        break;
    case M.S_WRAITH:
        if (ptr === mons[M.PM_NAZGUL]) {
            otmp = mksobj(O.RIN_INVISIBILITY, false, false);
            curse(otmp);
            mpickobj(mtmp, otmp);
        }
        break;
    case M.S_LICH:
        if (ptr === mons[M.PM_MASTER_LICH] && !rn2(13))
            mongets(mtmp, (rn2(7) ? O.ATHAME : O.WAN_NOTHING));
        else if (ptr === mons[M.PM_ARCH_LICH] && !rn2(3)) {
            const lichwep = rn2(3) ? O.ATHAME : O.QUARTERSTAFF;
            otmp = mksobj(lichwep, true, rn2(13) ? false : true);
            if (otmp.spe < 2)
                otmp.spe = rnd(3);
            if (!rn2(4))
                otmp.oerodeproof = 1;
            mpickobj(mtmp, otmp);
        }
        break;
    case M.S_MUMMY:
        if (rn2(7))
            mongets(mtmp, O.MUMMY_WRAPPING);
        break;
    case M.S_QUANTMECH:
        if (!rn2(20) && ptr === mons[M.PM_QUANTUM_MECHANIC]) {
            let catcorpse;

            otmp = mksobj(O.LARGE_BOX, false, false);
            if ((catcorpse = mksobj(O.CORPSE, true, false)) != null) {
                otmp.spe = 1; /* flag for special SchroedingersBox */
                set_corpsenm(catcorpse, M.PM_HOUSECAT);
                stop_timer(ROT_CORPSE, obj_to_any(catcorpse));
                if (!otmp.cobj) otmp.cobj = [];
                otmp.cobj.push(catcorpse); /* add_to_container() */
            }
            mpickobj(mtmp, otmp);
        }
        break;
    case M.S_LEPRECHAUN:
        mkmonmoney(mtmp, d(level_difficulty(), 30));
        break;
    case M.S_DEMON:
        /* moved here from m_initweap() because these don't
           have AT_WEAP so m_initweap() is not called for them */
        if (ptr === mons[M.PM_ICE_DEVIL] && !rn2(4)) {
            mongets(mtmp, O.SPEAR);
        } else if (ptr === mons[M.PM_ASMODEUS]) {
            mongets(mtmp, O.WAN_COLD);
            mongets(mtmp, O.WAN_FIRE);
        }
        break;
    case M.S_GNOME:
        if (!rn2((In_mines(game.u.uz) && game.in_mklev) ? 20 : 60)) {
            otmp = mksobj(rn2(4) ? O.TALLOW_CANDLE : O.WAX_CANDLE, true, false);
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            if (!mpickobj(mtmp, otmp) && !game.level.at(mtmp.mx, mtmp.my).lit) {
                begin_burn(otmp, false);
            }
        }
        break;
    default:
        break;
    }

    /* ordinary soldiers rarely have access to magic (or gold :-) */
    if (ptr === mons[M.PM_SOLDIER] && rn2(13))
        return;

    if (mtmp.m_lev > rn2(50))
        mongets(mtmp, rnd_defensive_item(mtmp));
    if (mtmp.m_lev > rn2(100))
        mongets(mtmp, rnd_misc_item(mtmp));
    if (likes_gold(ptr) && !findgold(mtmp.minvent) && !rn2(5))
        mkmonmoney(mtmp, d(level_difficulty(),
                           (mtmp.minvent && mtmp.minvent.length) ? 5 : 10));
}

// C ref: makemon.c clone_mon()
/* Note: for long worms, always call cutworm (cutworm calls clone_mon) */
export async function clone_mon(
    mon,
    x, y) { /* clone's preferred location or 0 (near mon) */
    const mm = { x: 0, y: 0 };
    let m2;

    /* may be too weak or have been extinguished for population control */
    if (mon.mhp <= 1
        || (game.mvitals[monsndx(mon.data)].mvflags & G_EXTINCT_CM) !== 0)
        return null;

    if (x === 0) {
        mm.x = mon.mx;
        mm.y = mon.my;
    } else {
        mm.x = x;
        mm.y = y;
    }
    if (!isok_cm(mm.x, mm.y)) { /* paranoia */
        /* impossible("clone_mon trying to create a monster at <%d,%d>?") */
        return null;
    }
    if (MON_AT(mm.x, mm.y)) { /* (always True for the x==0 case) */
        if (!enexto_cm(mm, mm.x, mm.y, mon.data) || MON_AT(mm.x, mm.y))
            return null;
    }

    /* m2 = newmonst(); *m2 = *mon; -- copy condition of old monster */
    m2 = { ...mon };
    /* m2->mextra = (struct mextra *) 0; -- JS keeps some mextra fields
       directly on the monster */
    m2.mextra = null;
    m2.edog = undefined;
    m2.egd = undefined;
    m2.epri = undefined;
    m2.emin = undefined;
    m2.mgivenname = undefined;
    m2.nmon = game.fmon;
    game.fmon = m2;
    m2.m_id = next_ident();
    m2.mx = mm.x;
    m2.my = mm.y;

    m2.mundetected = 0;
    m2.mtrapped = 0;
    m2.mcloned = 1;
    m2.minvent = null; /* objects don't clone */
    m2.mleashed = 0;
    /* Max HP the same, but current HP halved for both.  The caller
     * might want to override this by halving the max HP also.
     * When current HP is odd, the original keeps the extra point.
     * We know original has more than 1 HP, so both end up with at least 1.
     */
    m2.mhpmax = mon.mhpmax;
    m2.mhp = Math.trunc(mon.mhp / 2);
    mon.mhp -= m2.mhp;

    /* clone doesn't have mextra so mustn't retain special monster flags */
    m2.isshk = 0;
    m2.isgd = 0;
    m2.ispriest = 0;
    /* ms->isminion handled below */

    /* clone shouldn't be reluctant to move on spots 'parent' just moved on */
    mon_track_clear_cm(m2);

    place_monster(m2, m2.mx, m2.my);
    if (emits_light(m2.data))
        new_light_source(m2.mx, m2.my, emits_light(m2.data), LS_MONSTER,
                         monst_to_any(m2));
    /* if 'parent' is named, give the clone the same name */
    if (has_mgivenname_cm(mon)) {
        m2 = christen_monst(m2, MGIVENNAME_cm(mon));
    } else if (mon.isshk) {
        throw new Error('clone_mon(): cloning a shopkeeper (shkname()) not ported yet');
    }

    /* not all clones caused by player are tame or peaceful */
    if (!game.context.mon_moving && mon.mpeaceful) {
        if (mon.mtame)
            m2.mtame = rn2(Math.max(2 + game.u.uluck, 2)) ? mon.mtame : 0;
        else if (mon.mpeaceful)
            m2.mpeaceful = rn2(Math.max(2 + game.u.uluck, 2)) ? 1 : 0;
    }
    /* if guardian angel could be cloned (maybe after polymorph?),
       m2 could be both isminion and mtame; isminion takes precedence */
    if (m2.isminion) {
        throw new Error('clone_mon(): cloning a minion (EMIN) not ported yet');
    } else if (m2.mtame) {
        /* Because m2 is a copy of mon it is tame but not init'ed.
           However, tamedog() will not re-tame a tame dog, so m2
           must be made non-tame to get initialized properly. */
        m2.mtame = 0;
        if (await tamedog_cm(m2, null, false)) {
            /* *EDOG(m2) = *EDOG(mon); */
            m2.edog = { ...mon.edog, ogoal: { ...mon.edog.ogoal } };
        }
        /* [TODO? some (most? all?) edog fields probably should be
           reinitialized rather that retain the 'parent's values] */
    }
    set_malign(m2);
    newsym(m2.mx, m2.my); /* display the new monster */

    return m2;
}

// C ref: makemon.c mbirth_limit()
export function mbirth_limit(mndx) {
    /* There is an implicit limit of 4 for "high priest of <deity>",
     * but aligned priests can grow into high priests, thus they aren't
     * really limited to 4, so leave the default amount in place for them.
     */
    return (mndx === M.PM_NAZGUL ? 9 : mndx === M.PM_ERINYS ? 3 : 120 /* MAXMONNO */);
}

// C ref: makemon.c propagate()
/* used for wand/scroll/spell of create monster zapped/read/cast by hero */
export function propagate(mndx, tally, ghostly) {
    const mv = game.mvitals[mndx];
    const lim = mbirth_limit(mndx);

    const gone = (mv.mvflags & G_GONE) !== 0; /* geno'd|extinct */
    const result = (mv.born < lim && !gone) ? true : false;

    /* if it's unique, don't ever make it again */
    if ((mons[mndx].geno & G_UNIQ) !== 0 && mndx !== M.PM_HIGH_CLERIC)
        mv.mvflags |= G_EXTINCT;

    if (mv.born < 255 && tally && (!ghostly || result))
        mv.born++;
    if (mv.born >= lim
        && !(mons[mndx].geno & G_NOGEN)
        && !(mv.mvflags & G_EXTINCT)) {
        mv.mvflags |= G_EXTINCT;
    }
    return result;
}

// C ref: makemon.c golemhp()
export function golemhp(type) {
    switch (type) {
    case M.PM_STRAW_GOLEM: return 20;
    case M.PM_PAPER_GOLEM: return 20;
    case M.PM_ROPE_GOLEM: return 30;
    case M.PM_LEATHER_GOLEM: return 40;
    case M.PM_GOLD_GOLEM: return 60;
    case M.PM_WOOD_GOLEM: return 50;
    case M.PM_FLESH_GOLEM: return 40;
    case M.PM_CLAY_GOLEM: return 70;
    case M.PM_STONE_GOLEM: return 100;
    case M.PM_GLASS_GOLEM: return 80;
    case M.PM_IRON_GOLEM: return 120;
    default: return 0;
    }
}

// C ref: makemon.c monhp_per_lvl()
/* amount of HP to lose from level drain (or gain from Stormbringer) */
export function monhp_per_lvl(mon) {
    const ptr = mon.data;
    let hp = rnd(8); /* default is d8 */

    /* like newmonhp, but home elementals are ignored, riders use normal d8 */
    if (ptr.mlet === M.S_GOLEM) { /* is_golem(ptr) */
        /* draining usually won't be applicable for these critters */
        hp = Math.trunc(golemhp(monsndx(ptr)) / ptr.mlevel);
    } else if (ptr.mlevel > 49) {
        /* arbitrary; such monsters won't be involved in draining anyway */
        hp = 4 + rnd(4); /* 5..8 */
    } else if (ptr.mlet === M.S_DRAGON && monsndx(ptr) >= M.PM_GRAY_DRAGON) {
        /* adult dragons; newmonhp() uses In_endgame(&u.uz) ? 8 : 4 + rnd(4)
         */
        hp = 4 + rn2(5); /* 4..8 */
    } else if (!mon.m_lev) {
        /* level 0 monsters use 1d4 instead of Nd8 */
        hp = rnd(4);
    }
    return hp;
}

// C ref: makemon.c newmonhp()
/* set up a new monster's initial level and hit points;
   used by newcham() as well as by makemon() */
export function newmonhp(mon, mndx) {
    const ptr = mons[mndx];
    let basehp = 0;

    mon.m_lev = adj_lev(ptr);
    if (is_golem(ptr)) {
        /* golems have a fixed amount of HP, varying by golem type */
        mon.mhpmax = mon.mhp = golemhp(mndx);
    } else if (is_rider(ptr)) {
        /* we want low HP, but a high mlevel so they can attack well */
        basehp = 10; /* minimum is 1 per false (weaker) level */
        mon.mhpmax = mon.mhp = d(basehp, 8);
    } else if (ptr.mlevel > 49) {
        /* "special" fixed hp monster
         * the hit points are encoded in the mlevel in a somewhat strange
         * way to fit in the 50..127 positive range of a signed character
         * above the 1..49 that indicate "normal" monster levels */
        mon.mhpmax = mon.mhp = 2 * (ptr.mlevel - 6);
        mon.m_lev = Math.trunc(mon.mhp / 4); /* approximation */
    } else if (ptr.mlet === M.S_DRAGON && mndx >= M.PM_GRAY_DRAGON) {
        /* adult dragons; N*(4+rnd(4)) before endgame, N*8 once there */
        basehp = mon.m_lev; /* not really applicable; isolates cast */
        mon.mhpmax = mon.mhp = In_endgame(game.u.uz) ? (8 * basehp)
                               : (4 * basehp + d(basehp, 4));
    } else if (!mon.m_lev) {
        basehp = 1; /* minimum is 1, increased to 2 below */
        mon.mhpmax = mon.mhp = rnd(4);
    } else {
        basehp = mon.m_lev; /* minimum possible is one per level */
        mon.mhpmax = mon.mhp = d(basehp, 8);
        if (is_home_elemental(ptr))
            mon.mhpmax = (mon.mhp *= 3); /* leave 'basehp' as-is */
    }

    /* if d(X,8) rolled a 1 all X times, give a boost;
       most beneficial for level 0 and level 1 monsters, making mhpmax
       and starting mhp always be at least 2 */
    if (mon.mhpmax === basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}

// C ref: makemon.c makemon_rnd_goodpos()
function makemon_rnd_goodpos(mon, gpflags, cc) {
    let tryct = 0;
    let nx, ny;
    let good;

    gpflags |= GP_AVOID_MONPOS;
    do {
        nx = rn1(COLNO - 3, 2);
        ny = rn2(ROWNO);
        good = (!game.in_mklev && cansee(nx, ny)) ? false
                                                 : goodpos(nx, ny, mon, gpflags);
    } while ((++tryct < 50) && !good);

    if (!good) {
        /* else go through all map positions, twice, first round
           ignoring positions in sight, and pick first good one.
           skip first round if we're in special level loader or blind */
        const xofs = nx;
        const yofs = ny;
        const bl0 = (game.in_mklev || game.Blind) ? 1 : 0;

        for (let bl = bl0; bl < 2; bl++) {
            if (!bl)
                gpflags &= ~GP_CHECKSCARY; /* perhaps should be a 3rd pass */
            for (let dx = 0; dx < COLNO; dx++)
                for (let dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && cansee(nx, ny))
                        continue;
                    if (goodpos(nx, ny, mon, gpflags)) {
                        cc.x = nx; cc.y = ny; /* goto gotgood */
                        return true;
                    }
                }
            if (bl === 0 && (!mon || mon.data.mmove)) {
                let stway = game.stairs;
                /* all map positions are visible (or not good),
                   try to pick something logical */
                while (stway) {
                    if (stway.tolev.dnum === game.u.uz.dnum && !rn2(2)) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                    stway = stway.next;
                }
                if (goodpos(nx, ny, mon, gpflags)) {
                    cc.x = nx; cc.y = ny; /* goto gotgood */
                    return true;
                }
            }
        }
    } else {
        /* gotgood: */
        cc.x = nx;
        cc.y = ny;
        return true;
    }
    return false;
}

// C ref: mon.c pm_to_cham()
export function pm_to_cham(mndx) {
    let mcham = NON_PM;
    switch (mndx) {
    case M.PM_CHAMELEON:
    case M.PM_DOPPELGANGER:
    case M.PM_SANDESTIN:
    case M.PM_VAMPIRE:
    case M.PM_VAMPIRE_LEADER:
    case M.PM_VLAD_THE_IMPALER:
        mcham = mndx;
        break;
    }
    return mcham;
}

// C ref: makemon.c makemon()
/*
 * called with [x,y] = coordinates;
 *      [0,0] means anyplace
 *      [u.ux,u.uy] means: near player (if !gi.in_mklev)
 *
 *      In case we make a monster group, only return the one at [x,y].
 */
export function makemon(ptr, x, y, mmflags) {
    let mtmp;
    const fakemon = { data: null, m_id: 0, wormno: 0 };
    const cc = { x: 0, y: 0 };
    let mndx, mcham, mitem;
    let femaleok, maleok;
    const anymon = !ptr,
          byyou = u_at(x, y),
          countbirth = ((mmflags & MM_NOCOUNTBIRTH) === 0),
          allowtail = ((mmflags & MM_NOTAIL) === 0);
    let allow_minvent = ((mmflags & NO_MINVENT) === 0);
    const gpflags = (((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
                     | GP_CHECKSCARY | GP_AVOID_MONPOS);

    if (game.iflags?.debug_mongen || (!game.level.flags.rndmongen && !ptr))
        return null;

    /* if caller wants random location, do it here */
    if (x === 0 && y === 0) {
        fakemon.data = ptr; /* set up for goodpos */
        if (!makemon_rnd_goodpos(ptr ? fakemon : null, gpflags, cc))
            return null;
        x = cc.x;
        y = cc.y;
    } else if (byyou && !game.in_mklev) {
        if (!enexto_core(cc, game.u.ux, game.u.uy, ptr, gpflags)
            && !enexto_core(cc, game.u.ux, game.u.uy, ptr,
                            gpflags & ~GP_CHECKSCARY))
            return null;
        x = cc.x;
        y = cc.y;
    }

    /* sanity check */
    if (!isok(x, y)) {
        impossible(`makemon trying to create a monster at <${x},${y}>?`);
        return null;
    }

    /* Does monster already exist at the position? */
    if (MON_AT(x, y)) {
        if (!(mmflags & MM_ADJACENTOK)
            || !enexto_core(cc, x, y, ptr, gpflags))
            return null;
        x = cc.x;
        y = cc.y;
    }

    if (ptr) {
        mndx = monsndx(ptr);
        /* if you are to make a specific monster and it has
           already been genocided, return */
        if (game.mvitals[mndx].mvflags & G_GENOD)
            return null;
    } else {
        /* make a random (common) monster that can survive here.
         * (the special levels ask for random monsters at specific
         * positions, causing mass drowning on the medusa level,
         * for instance.)
         */
        let tryct = 0; /* maybe there are no good choices */

        do {
            if (!(ptr = rndmonst())) {
                return null; /* no more monsters! */
            }
            fakemon.data = ptr; /* set up for goodpos */
        } while (++tryct <= 50
                 /* in Sokoban, don't accept a giant on first try;
                    after that, boulder carriers are fair game */
                 && ((tryct === 1 && throws_rocks(ptr) && In_sokoban(game.u.uz))
                     || !goodpos(x, y, fakemon, gpflags)));
        mndx = monsndx(ptr);
    }
    propagate(mndx, countbirth, false);
    /* newmonst(); *mtmp = cg.zeromonst; */
    mtmp = {
        data: null, mnum: 0, m_id: 0, mx: 0, my: 0, m_lev: 0, mhp: 0,
        mhpmax: 0, female: 0, msleeping: 0, mpeaceful: 0, mtame: 0,
        minvis: 0, perminvis: 0, mcansee: 0, mcanmove: 0, mgenmklev: 0,
        seen_resistance: 0, cham: NON_PM, iswiz: 0, isminion: 0, mspec_used: 0,
        ispriest: 0, isshk: 0, isgd: 0, mstrategy: 0, malign: 0,
        wormno: 0, mtrapseen: 0, mwandexp: 0, minvent: null, nmon: null,
        mundetected: 0, mavenge: 0, movement: 0, mspeed: 0,
        misc_worn_check: 0, mw: null, weapon_check: 0 /* NO_WEAPON_WANTED */,
    };

    if (mmflags & MM_EGD) mtmp.egd = {};    /* newegd() */
    if (mmflags & MM_EPRI) mtmp.epri = {};  /* newepri() */
    if (mmflags & MM_ESHK) {                /* neweshk() */
        if (!mtmp.mextra) mtmp.mextra = {};
        mtmp.mextra.eshk = { bill_p: null };
    }
    if (mmflags & MM_EMIN) mtmp.emin = {};  /* newemin() */
    if (mmflags & MM_EDOG) newedog(mtmp);
    if (mmflags & MM_ASLEEP)
        mtmp.msleeping = 1;
    mtmp.nmon = game.fmon;
    game.fmon = mtmp;
    mtmp.m_id = next_ident();
    set_mon_data(mtmp, ptr); /* mtmp->data = ptr; */
    if (ptr.msound === M.MS_LEADER && game.urole.ldrnum === mndx) /* quest_info(MS_LEADER) */
        game.quest_status.leader_m_id = mtmp.m_id;
    mtmp.mnum = mndx;

    /* set up level and hit points */
    newmonhp(mtmp, mndx);

    femaleok = (!is_male(ptr) && !is_neuter(ptr));
    maleok = (!is_female(ptr) && !is_neuter(ptr));
    if (is_female(ptr) || ((mmflags & MM_FEMALE) !== 0 && femaleok))
        mtmp.female = 1;
    else if (is_male(ptr) || ((mmflags & MM_MALE) !== 0 && maleok))
        mtmp.female = 0;
    /* leader and nemesis gender is usually hardcoded in mons[],
       but for ones which can be random, it has already been chosen
       (in role_init(), for possible use by the quest pager code) */
    else if (ptr.msound === M.MS_LEADER && game.urole.ldrnum === mndx) /* quest_info(MS_LEADER) */
        mtmp.female = game.quest_status.ldrgend;
    else if (ptr.msound === M.MS_NEMESIS && game.urole.neminum === mndx) /* quest_info(MS_NEMESIS) */
        mtmp.female = game.quest_status.nemgend;

    /* female used to be set randomly here even for neuters on the
       grounds that it was ignored, but after corpses were changed to
       retain gender it matters because it affects stacking of corpses */
    else
        mtmp.female = femaleok ? rn2(2) : 0;

    /* mon_learns_traps() for Sokoban/stronghold/quest leaders: trap
       knowledge bits only, no rolls -- not ported yet */
    /* locations where monsters are already experienced with wands */
    if (Is_stronghold() || Is_knox() || In_endgame(game.u.uz)
        || In_hell(game.u.uz) || In_V_tower(game.u.uz) || In_quest(game.u.uz))
        mtmp.mwandexp = true;

    place_monster(mtmp, x, y);
    mtmp.mcansee = mtmp.mcanmove = true;
    mtmp.mgenmklev = game.in_mklev;
    mtmp.seen_resistance = 0; /* M_SEEN_NOTHING */
    mtmp.mpeaceful = (mmflags & MM_ANGRY) ? false : peace_minded(ptr);
    /* MM_MINVIS -> mon_set_minvis(): ^G only */

    switch (ptr.mlet) {
    case M.S_MIMIC:
        set_mimic_sym(mtmp);
        break;
    case M.S_SPIDER:
    case M.S_SNAKE:
        if (game.in_mklev) {
            if (x && y)
                mkobj_at(0 /* RANDOM_CLASS */, x, y, true);
            hideunder(mtmp);
        }
        break;
    case M.S_LIGHT:
    case M.S_ELEMENTAL:
        if (mndx === M.PM_STALKER || mndx === M.PM_BLACK_LIGHT) {
            mtmp.perminvis = true;
            mtmp.minvis = true;
        }
        break;
    case M.S_EEL:
        if (game.in_mklev) {
            hideunder(mtmp);
        }
        break;
    case M.S_LEPRECHAUN:
        mtmp.msleeping = 1;
        break;
    case M.S_JABBERWOCK:
    case M.S_NYMPH:
        if (rn2(5) && !game.u.uhave.amulet)
            mtmp.msleeping = 1;
        break;
    case M.S_ORC:
        if (Race_if(M.PM_ELF))
            mtmp.mpeaceful = false;
        break;
    case M.S_UNICORN:
        if (is_unicorn(ptr) && sgn(game.u.ualign.type) === sgn(ptr.maligntyp))
            mtmp.mpeaceful = true;
        break;
    case M.S_BAT:
        if (In_hell(game.u.uz) && is_bat(ptr))
            mon_adjust_speed_sync(mtmp, 2, null);
        break;
    }
    let ct;
    if ((ct = emits_light(mtmp.data)) > 0)
        new_light_source(mtmp.mx, mtmp.my, ct, LS_MONSTER,
                         monst_to_any(mtmp));
    mitem = O.STRANGE_OBJECT; /* extra inventory item for this monster */

    if (mndx === M.PM_VLAD_THE_IMPALER)
        mitem = O.CANDELABRUM_OF_INVOCATION;
    mtmp.cham = NON_PM; /* default is "not a shapechanger" */
    if (/* !Protection_from_shape_changers && */
        (mcham = pm_to_cham(mndx)) !== NON_PM) {
        /* this is a shapechanger after all */
        mtmp.cham = mcham;
        /* Vlad stays in his normal shape so he can carry the Candelabrum */
        if (mndx !== M.PM_VLAD_THE_IMPALER
            /* Let newcham() pick the shape. */
            && newcham_sync(mtmp, null, 0 /* NO_NC_FLAGS */))
            allow_minvent = false;
    } else if (mndx === M.PM_WIZARD_OF_YENDOR) {
        mtmp.iswiz = true;
        if (!game.context) game.context = {};
        game.context.no_of_wizards = (game.context.no_of_wizards || 0) + 1;
        if (game.context.no_of_wizards === 1 && Is_earthlevel())
            mitem = O.SPE_DIG;
    } else if (mndx === M.PM_GHOST && !(mmflags & MM_NONAME)) {
        mtmp = christen_monst(mtmp, rndghostname());
    } else if (mndx === M.PM_CROESUS) {
        mitem = O.TWO_HANDED_SWORD;
    } else if (ptr.msound === M.MS_NEMESIS) {
        mitem = O.BELL_OF_OPENING;
    } else if (mndx === M.PM_PESTILENCE) {
        mitem = O.POT_SICKNESS;
    }
    if (mitem !== O.STRANGE_OBJECT && allow_minvent)
        mongets(mtmp, mitem);

    if (game.in_mklev) {
        if ((is_ndemon(ptr) || mndx === M.PM_WUMPUS
             || mndx === M.PM_LONG_WORM || mndx === M.PM_GIANT_EEL)
            && !game.u.uhave.amulet && rn2(5))
            mtmp.msleeping = true;
    } else {
        if (byyou) {
            newsym(mtmp.mx, mtmp.my);
            set_apparxy(mtmp);
        }
    }
    if (is_dprince(ptr) && ptr.msound === M.MS_BRIBE) {
        mtmp.mpeaceful = mtmp.minvis = mtmp.perminvis = 1;
        mtmp.mavenge = 0;
        /* u_wield_art(ART_EXCALIBUR/ART_DEMONBANE): artifacts not ported */
    }
    if (mndx === M.PM_RAVEN && game.uwep && game.uwep.otyp === O.BEC_DE_CORBIN)
        mtmp.mpeaceful = true;
    if (mndx === M.PM_LONG_WORM && (mtmp.wormno = get_wormno()) !== 0) {
        initworm(mtmp, allowtail ? rn2(5) : 0);
        if (count_wsegs(mtmp))
            place_worm_tail_randomly(mtmp, x, y);
    }
    /* it's possible to create an ordinary monster of some special
       types; make sure their extended data is initialized to
       something sensible if caller hasn't specified MM_EPRI|MM_EMIN
       (when they're specified, caller intends to handle this itself) */
    if ((mndx === M.PM_ALIGNED_CLERIC || mndx === M.PM_HIGH_CLERIC)
            ? !(mmflags & (MM_EPRI | MM_EMIN))
            : (mndx === M.PM_ANGEL && !(mmflags & MM_EMIN) && !rn2(3))) {
        mtmp.emin = {}; /* newemin() */
        const eminp = mtmp.emin;

        mtmp.isminion = 1;            /* make priest be a roamer */
        eminp.min_align = rn2(3) - 1; /* no A_NONE */
        eminp.renegade = ((mmflags & MM_ANGRY) ? 1 : !rn2(3));
        mtmp.mpeaceful = (eminp.min_align === game.u.ualign.type)
                             ? !eminp.renegade
                             : eminp.renegade;
    }
    set_malign(mtmp); /* having finished peaceful changes */
    if (anymon && !(mmflags & MM_NOGRP)) {
        if ((ptr.geno & M.G_SGROUP) && rn2(2)) {
            m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        } else if (ptr.geno & M.G_LGROUP) {
            if (rn2(3))
                m_initlgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
            else
                m_initsgrp(mtmp, mtmp.mx, mtmp.my, mmflags);
        }
    }

    if (allow_minvent) {
        if (is_armed(ptr))
            m_initweap(mtmp); /* equip with weapons / armor */
        m_initinv(mtmp); /* add on a few special items incl. more armor */
        m_dowear(mtmp, true); /* creation: synchronous, see worn.js */

        if (!rn2(100) && is_domestic(ptr)
            && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE)) {
            /* NULL obj arg means put_saddle_on_mon()
             * will create the saddle itself */
            put_saddle_on_mon(null, mtmp);
        }

    } else {
        /* no initial inventory is allowed */
        mtmp.minvent = null; /* caller expects this */
    }
    if (ptr.mflags3 && !(mmflags & MM_NOWAIT)) {
        if (ptr.mflags3 & M.M3_WAITFORU)
            mtmp.mstrategy |= STRAT_WAITFORU;
        if (ptr.mflags3 & M.M3_CLOSE)
            mtmp.mstrategy |= STRAT_CLOSE;
        if (ptr.mflags3 & (M.M3_WAITMASK | M.M3_COVETOUS))
            mtmp.mstrategy |= STRAT_APPEARMSG;
    }

    if (allow_minvent && game.migrating_objs) /* in case of waiting items */
        deliver_obj_to_mon(mtmp, 1, DF_NONE); /* in case of waiting items */

    if (!game.in_mklev) {
        newsym(mtmp.mx, mtmp.my); /* make sure the mon shows up */
        if (!(mmflags & MM_NOMSG)) {
            let what = null;
            /* MM_NOEXCLAM is used for #wizgenesis (^G) */
            let exclaim = !(mmflags & MM_NOEXCLAM);
            const ap_type = mtmp.m_ap_type || M_AP_NOTHING;

            if ((canseemon(mtmp) && (ap_type === M_AP_NOTHING
                                     || ap_type === M_AP_MONSTER))
                || makemon_sensemon(mtmp)) {
                what = Amonnam(mtmp);
                if (ap_type === M_AP_MONSTER)
                    exclaim = true;
            } else if (canseemon(mtmp)) {
                /* mimic masquerading as furniture or object and not sensed */
                throw new Error('makemon(): mhidden_description() not ported yet');
            }
            if (what) {
                /* set_msg_xy(mtmp->mx, mtmp->my): accessibility only */
                const msg = `${what}${exclaim ? " suddenly" : ""} `
                    /* 'what' might be "gold pieces" so need plural verb */
                    + `${vtense(what, "appear")}`
                    + `${next2u(x, y)
                         ? " next to you"
                         : (dist2(x, y, game.u.ux, game.u.uy) <= (BOLT_LIM * BOLT_LIM))
                           ? " close by" : ""}`
                    + `${exclaim ? '!' : '.'}`;
                /* Norep(): pline() waits at --More-- and so is async in this
                   port while makemon() is not; the message is handed to the
                   caller, which prints it with makemon_flush_msg().  Only
                   create_particular() does so far; for other callers the
                   message is not ported yet */
                if (game.makemon_want_msg)
                    game.makemon_msg = msg;
            }
        }
        /* if discernable and a threat, stop fiddling while Rome burns */
        if (game.occupation) {
            /* (void) dochugw(mtmp, FALSE): async (stop_occupation() prints),
               so like the message above it is handed to the caller, which
               runs it right after the message in makemon_flush_msg() */
            if (game.makemon_want_msg)
                game.makemon_dochugw = mtmp;
            else
                throw new Error('makemon(): dochugw() for an occupied hero not ported yet');
        }

        /* TODO: unify with teleport appears msg */
    }

    return mtmp;
}

/* C ref: zap.c BOLT_LIM */
const BOLT_LIM = 8;

// makemon()'s "<mon> appears" message, printed by the caller once makemon()
// returns (see the Norep() comment in makemon())
export async function makemon_flush_msg() {
    const msg = game.makemon_msg;
    game.makemon_msg = null;
    if (msg)
        await pline(msg);
    /* and makemon()'s dochugw(mtmp, FALSE) for an occupied hero */
    const mtmp = game.makemon_dochugw;
    game.makemon_dochugw = null;
    if (mtmp)
        await dochugw(mtmp, false);
}

/* C ref: display.h sensemon() -- telepathy, extended detection and
   warning are not ported yet */
function makemon_sensemon(mtmp) {
    void mtmp;
    const tel = game.u.uprops?.[TELEPAT], det = game.u.uprops?.[DETECT_MONSTERS];
    if ((tel && (tel.intrinsic || tel.extrinsic))
        || (det && (det.intrinsic || det.extrinsic)))
        throw new Error('makemon(): sensemon() not ported yet');
    return false;
}

// C ref: monst.h STRAT_* bits
const STRAT_APPEARMSG = 0x80000000;
const STRAT_WAITFORU = 0x20000000;
const STRAT_CLOSE = 0x10000000;

// C ref: makemon.c m_initgrp()
/* make a group just like mtmp */
function m_initgrp(mtmp, x, y, n, mmflags) {
    const u = game.u;
    const mm = { x: 0, y: 0 };
    let cnt = rnd(n);
    let mon;

    /* Tuning: cut down on swarming at low character levels [mrs] */
    cnt = Math.trunc(cnt / ((u.ulevel < 3) ? 4 : (u.ulevel < 5) ? 2 : 1));
    if (!cnt)
        cnt++;

    mm.x = x;
    mm.y = y;
    while (cnt--) {
        if (peace_minded(mtmp.data))
            continue;
        /* Don't create groups of peaceful monsters since they'll get
         * in our way.  If the monster has a percentage chance so some
         * are peaceful and some are not, the result will just be a
         * smaller group.
         */
        if (enexto_gpflags(mm, mm.x, mm.y, mtmp.data, mmflags)) {
            mon = makemon(mtmp.data, mm.x, mm.y, (mmflags | MM_NOGRP));
            if (mon) {
                mon.mpeaceful = false;
                mon.mavenge = 0;
                set_malign(mon);
                /* Undo the second peace_minded() check in makemon(); if the
                 * monster turned out to be peaceful the first time we
                 * didn't create it at all; we don't want a second check.
                 */
            }
        }
    }
}
// C ref: makemon.c m_initsgrp(), m_initlgrp() (macros)
function m_initsgrp(mtmp, x, y, mmflags) { m_initgrp(mtmp, x, y, 3, mmflags); }
function m_initlgrp(mtmp, x, y, mmflags) { m_initgrp(mtmp, x, y, 10, mmflags); }

// C ref: makemon.c syms[]
const syms = [
    O.MAXOCLASSES,  O.MAXOCLASSES,     O.RING_CLASS,   O.WAND_CLASS,   O.WEAPON_CLASS,
    O.FOOD_CLASS,   O.COIN_CLASS,      O.SCROLL_CLASS, O.POTION_CLASS, O.ARMOR_CLASS,
    O.AMULET_CLASS, O.TOOL_CLASS,      O.ROCK_CLASS,   O.GEM_CLASS,    O.SPBOOK_CLASS,
    M.S_MIMIC_DEF,  M.S_MIMIC_DEF,
];
// C ref: defsym.h pchar indices used by set_mimic_sym()
const S_vwall = 1, S_hwall = 2, S_vcdoor = 15, S_hcdoor = 16, S_upstair = 25,
    S_dnstair = 26, S_altar = 33, S_grave = 34, S_throne = 35, S_sink = 36,
    S_fountain = 37;

// C ref: makemon.c set_mimic_sym()
export function set_mimic_sym(mtmp) {
    let typ, roomno, rt;
    let appear, ap_type;
    let s_sym;
    let otmp;
    let mx, my;
    const levl = (x, y) => game.level.at(x, y);
    let assign = false;

    const pfsc = game.u.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    if (!mtmp || !!(pfsc && (pfsc.intrinsic || pfsc.extrinsic))) /* Protection_from_shape_changers */
        return;
    mx = mtmp.mx;
    my = mtmp.my;
    typ = levl(mx, my).typ;
    /* only valid for INSIDE of room */
    roomno = levl(mx, my).roomno - ROOMOFFSET;
    if (roomno >= 0)
        rt = game.level.rooms[roomno].rtype;
    else
        rt = 0; /* roomno < 0 case for GCC_WARN */

    if (OBJ_AT(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = vobj_at(mx, my).otyp; /* svl.level.objects[mx][my]->otyp */
    } else if (IS_DOOR(typ) || IS_WALL(typ) || typ === SDOOR || typ === SCORR) {
        ap_type = M_AP_FURNITURE;
        /*
         *  If there is a wall to the left that connects to this
         *  location, then the mimic mimics a horizontal closed door.
         *  This does not allow doors to be in corners of rooms.
         *  Since rogue has no closed doors, mimic a wall there
         *  (yes, mimics can end up on this level by various means).
         */
        if (mx !== 0 && (levl(mx - 1, my).typ === HWALL
                         || levl(mx - 1, my).typ === TLCORNER
                         || levl(mx - 1, my).typ === TRWALL
                         || levl(mx - 1, my).typ === BLCORNER
                         || levl(mx - 1, my).typ === TDWALL
                         || levl(mx - 1, my).typ === CROSSWALL
                         || levl(mx - 1, my).typ === TUWALL))
            appear = Is_rogue_level(game.u.uz) ? S_hwall : S_hcdoor;
        else
            appear = Is_rogue_level(game.u.uz) ? S_vwall : S_vcdoor;
    } else if (game.level.flags.is_maze_lev
               && !(In_mines(game.u.uz) && in_town(game.u.ux, game.u.uy))
               && !In_sokoban(game.u.uz) && rn2(2)) {
        ap_type = M_AP_OBJECT;
        appear = O.STATUE;
    } else if (roomno < 0 && !t_at(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = O.BOULDER;
    } else if (rt === ZOO || rt === VAULT) {
        ap_type = M_AP_OBJECT;
        appear = O.GOLD_PIECE;
    } else if (rt === DELPHI) {
        if (rn2(2)) {
            ap_type = M_AP_OBJECT;
            appear = O.STATUE;
        } else {
            ap_type = M_AP_FURNITURE;
            appear = S_fountain;
        }
    } else if (rt === TEMPLE) {
        ap_type = M_AP_FURNITURE;
        appear = S_altar;

    /*
     * We won't bother with beehives, morgues, barracks, throne rooms
     * since they shouldn't contain too many mimics anyway...
     */

    } else if (rt >= SHOPBASE) {
        if (rn2(10) >= depth(game.u.uz)) {
            s_sym = M.S_MIMIC_DEF; /* -> STRANGE_OBJECT */
            assign = true; /* goto assign_sym */
        } else {
            s_sym = get_shop_item(rt - SHOPBASE);
            if (s_sym < 0) {
                ap_type = M_AP_OBJECT;
                appear = -s_sym;
            } else if (rt === FODDERSHOP && s_sym > O.MAXOCLASSES) {
                /* health food store usually generates pseudo-class
                   VEGETARIAN_CLASS which is MAXOCLASSES+1; we don't bother
                   trying to select among all possible vegetarian food items */
                ap_type = M_AP_OBJECT;
                appear = rn2(2) ? O.LUMP_OF_ROYAL_JELLY : O.SLIME_MOLD;
            } else {
                if (s_sym === O.RANDOM_CLASS || s_sym >= O.MAXOCLASSES)
                    s_sym = syms[rn2(syms.length - 2) + 2];
                assign = true; /* goto assign_sym */
            }
        }
    } else {
        s_sym = ROLL_FROM(syms);
        assign = true;
    }
    if (assign) {
 /* assign_sym: */
        if (s_sym === O.MAXOCLASSES) {
            const furnsyms = [
                S_upstair, S_upstair, S_dnstair, S_dnstair,
                S_altar, S_grave, S_throne, S_sink,
            ];

            ap_type = M_AP_FURNITURE;
            appear = ROLL_FROM(furnsyms);
        } else {
            ap_type = M_AP_OBJECT;
            if (s_sym === M.S_MIMIC_DEF) {
                appear = O.STRANGE_OBJECT;
            } else if (s_sym === O.COIN_CLASS) {
                appear = O.GOLD_PIECE;
            } else {
                otmp = mkobj(s_sym, FALSE);
                appear = otmp.otyp;
                /* make sure container contents are free'ed */
                /* obfree(otmp, (struct obj *) 0): JS garbage-collects it */
            }
        }
    }
    mtmp.m_ap_type = ap_type;
    mtmp.m_ap_fdknown = 0; /* M_AP_F_DKNOWN, kept apart from m_ap_type */
    mtmp.mappearance = appear;
    /* when appearing as an object based on a monster type, pick a shape */
    if (ap_type === M_AP_OBJECT
        && (appear === O.STATUE || appear === O.FIGURINE
            || appear === O.CORPSE || appear === O.EGG || appear === O.TIN)) {
        let mndx = rndmonnum();
        const nocorpse_ndx = (game.mvitals[mndx].mvflags & M.G_NOCORPSE) !== 0;

        if (appear === O.CORPSE && nocorpse_ndx)
            mndx = rn1(M.PM_WIZARD - M.PM_ARCHEOLOGIST + 1, M.PM_ARCHEOLOGIST);
        else if ((appear === O.EGG && !can_be_hatched(mndx))
                 || (appear === O.TIN && nocorpse_ndx))
            mndx = NON_PM; /* revert to generic egg or empty tin */

        if (!mtmp.mextra) mtmp.mextra = {}; /* newmcorpsenm(mtmp) */
        mtmp.mextra.mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === O.SLIME_MOLD) {
        if (!mtmp.mextra) mtmp.mextra = {}; /* newmcorpsenm(mtmp) */
        mtmp.mextra.mcorpsenm = game.context.current_fruit;
        /* if no objects of this fruit type have been created yet,
           context.current_fruit is available for re-use when the player
           assigns a new fruit name; override that--having a mimic as the
           current_fruit is equivalent to creating an instance of that
           fruit (no-op if a fruit of this type has actually been made) */
        game.flags.made_fruit = TRUE;
    } else if (ap_type === M_AP_FURNITURE && appear === S_altar) {
        const algn = rn2(3) - 1; /* -1 (A_Cha) or 0 (A_Neu) or +1 (A_Law) */

        if (!mtmp.mextra) mtmp.mextra = {}; /* newmcorpsenm(mtmp) */
        mtmp.mextra.mcorpsenm = (In_hell(game.u.uz) && rn2(3)) ? AM_NONE : Align2amask(algn);
    } else if (mtmp.mextra?.mcorpsenm !== undefined) { /* has_mcorpsenm() */
        /* don't retain stale value from a previously mimicked shape */
        mtmp.mextra.mcorpsenm = NON_PM;
    }

    if (does_block(mx, my, game.level.at(mx, my)))
        block_point(mx, my);
}
// C ref: monmove.c can_hide_under_obj()
/* returns TRUE if a mon can hide under the obj */
export function can_hide_under_obj(obj) {
    let t;

    if (!obj || obj.where !== 'OBJ_FLOOR')
        return false;
    /* can't hide in/on/under traps (except pits) even when there is an
       object here; since obj is on floor, its <ox,oy> are up to date */
    if ((t = t_at(obj.ox, obj.oy)) !== null && !(t.ttyp === PIT || t.ttyp === SPIKED_PIT))
        return false;
    /* can't hide under small amount of coins unless non-coins are also
       present; we expect coins to be a single stack but don't assume that */
    if (obj.oclass === O.COIN_CLASS) {
        const pile = floor_pile(obj.ox, obj.oy);
        let i = pile.indexOf(obj);
        let coinquan = 0;

        do {
            /* 10 coins is arbitrary amount considered enough to hide under */
            if ((coinquan += obj.quan) >= 10)
                break; /* fall through to other checks */
            obj = pile[++i]; /* obj->nexthere */
            if (!obj)
                return false; /* whole pile was less than 10 coins */
        } while (obj.oclass === O.COIN_CLASS);
    }
    /* NO_HIDING_UNDER_STATUES is not defined */
    return true;
}

// the objects at <x,y>, top of the pile first (C's level.objects[x][y]
// chain); game.level.objects is fobj, newest first, in pile order
function floor_pile(x, y) {
    return (game.level.objects || []).filter(o => o.ox === x && o.oy === y);
}

// C ref: mon.c hideunder()
// The "You see <mon> <locomo> under <obj>." message makes this async, but
// it has synchronous callers (makemon() during level creation, newcham(),
// maybe_unhide_at(), getlev()) where C can't print it: 'seeit' is 0 in
// mklev, and a monster that is already hidden or is losing its cover
// doesn't give it.  The body is a generator that yields the message where
// C calls You_see(): hideunder_async() prints it, hideunder() is the
// synchronous entry point.
/* monster/hero tries to hide under something at the current location;
   if used by monster creation, should only happen during level
   creation, otherwise there will be message sequencing issues */
export function hideunder(mtmp) {
    const gen = hideunder_core(mtmp);
    for (let r = gen.next(); ; r = gen.next()) {
        if (r.done)
            return r.value;
        throw new Error(`hideunder(): message in a synchronous caller not ported yet: ${r.value}`);
    }
}

export async function hideunder_async(mtmp) {
    const gen = hideunder_core(mtmp);
    for (let r = gen.next(); ; r = gen.next()) {
        if (r.done)
            return r.value;
        await You_see(r.value);
    }
}

function* hideunder_core(mtmp) {
    let t, otmp;
    let seenmon = null, seenobj = null, locomo = null;
    const seeit = game.in_mklev ? false : canseemon(mtmp);
    let oldundetctd, undetected = false;
    const is_u = (mtmp === game.youmonst);

    if (is_u)
        throw new Error('hideunder(): the hero hiding is not ported yet');
    const x = mtmp.mx, y = mtmp.my;

    if (mtmp === game.u.ustuck) {
        ; /* undetected==FALSE; can't hide if holding you or held by you */
    } else if (mtmp.mtrapped
               || ((t = t_at(x, y)) !== null && !(t.ttyp === PIT || t.ttyp === SPIKED_PIT))) {
        ; /* undetected==FALSE; can't hide while trapped or on/in/under
             any non-pit trap when not trapped */
    } else if (mtmp.data.mlet === M.S_EEL) {
        /* aquatic creatures only hide under water, not under objects;
           they don't do so on the Plane of Water or when hero is also
           under water unless some obstacle blocks line-of-sight */
        undetected = (is_pool(x, y) && !Is_waterlevel(game.u.uz)
                      && (!game.u.uinwater || !couldsee(x, y)));
        if (seeit) {
            seenobj = "the water";
            locomo = "dive";
        }
    } else if ((mtmp.data.mflags1 & M.M1_CONCEAL) /* hides_under() */
               /* hider-underers only hide under objects */
               && (otmp = floor_pile(x, y)[0] || null) !== null
               /* most things can be hidden under, but not all */
               && can_hide_under_obj(otmp)
               /* pets won't hide under a cursed item or an item of any BUC
                  state that shares a pile with one or more cursed items */
               && (!mtmp.mtame || !floor_pile(x, y).some(o => o.cursed))
               /* aquatic creatures don't reach here; other swimmers
                  shouldn't hide beneath underwater objects */
               && !(is_pool(x, y) || is_lava(x, y))) {
        if (seeit) /*&& (!is_pool(x, y) || (Underwater && distu(x, y) <= 2))*/
            seenobj = ansimpleoname(otmp);
        /* most monsters won't hide under a cockatrice corpse but they
           can hide under a pile containing more than just such corpses */
        if (!Resists_Elem(mtmp, STONE_RES)) {
            const pile = floor_pile(x, y);
            let i = 0;
            while (otmp && otmp.otyp === O.CORPSE
                   && (otmp.corpsenm === M.PM_COCKATRICE
                       || otmp.corpsenm === M.PM_CHICKATRICE)) /* touch_petrifies() */
                otmp = pile[++i] || null;
        }
        if (otmp)
            undetected = true;
    }

    if (seeit)
        seenmon = y_monnam(mtmp);
    oldundetctd = mtmp.mundetected !== 0;
    mtmp.mundetected = undetected ? 1 : 0;
    /* the "you see" message won't be shown for monster hiding during
       level creation because 'seeit' will be 0 so 'seenmon' and 'seenobj'
       will be Null */
    if (undetected && seenmon && seenobj) {
        if (!locomo)
            locomo = locomotion(mtmp.data, "hide");
        /* set_msg_xy(mtmp->mx, mtmp->my): accessibility only */
        yield `${seenmon} ${locomo} under ${seenobj}.`; /* You_see() */
        game.iflags.last_msg = PLNMSG_HIDE_UNDER;
        game.last_hider = mtmp.m_id;
    }
    if (undetected !== oldundetctd)
        newsym(x, y);
    return undetected;
}
// C ref: steed.c put_saddle_on_mon()
export function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE)) {
        return;
    }
    if (!saddle) {
        if ((saddle = mksobj(O.SADDLE, true, false)) != null) {
            /* fully_identify_obj(saddle): identification not ported */
        } else {
            return;
        }
    }
    mpickobj(mtmp, saddle);
    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
}

// C ref: makemon.c grow_up()
/* monster earned experience and will gain some hit points; it might also
   grow into a bigger monster (baby to adult, soldier to officer, etc) */
export async function grow_up(mtmp, victim) {
    let max_increase, cur_increase, lev_limit, hp_threshold;
    let ptr = mtmp.data;

    /* monster died after killing enemy but before calling this function */
    /* currently possible if killing a gas spore */
    if (mtmp.mhp < 1) /* DEADMONSTER() */
        return null;

    const oldtype = monsndx(ptr);
    const newtype = (oldtype === M.PM_KILLER_BEE && !victim) ? M.PM_QUEEN_BEE
                                                             : little_to_big(oldtype);

    /* growth limits differ depending on method of advancement */
    if (victim) { /* killed a monster */
        hp_threshold = mtmp.m_lev * 8; /* normal limit */
        if (!mtmp.m_lev)
            hp_threshold = 4;
        else if (is_golem(ptr)) /* strange creatures */
            hp_threshold = (Math.trunc(mtmp.mhpmax / 10) + 1) * 10 - 1;
        else if (is_home_elemental(ptr))
            hp_threshold *= 3;
        lev_limit = Math.trunc(3 * ptr.mlevel / 2); /* same as adj_lev() */
        /* If they can grow up, be sure the level is high enough for that */
        if (oldtype !== newtype && mons[newtype].mlevel > lev_limit)
            lev_limit = mons[newtype].mlevel;
        /* number of hit points to gain; unlike for the player, we put
           the limit at the bottom of the next level rather than the top */
        max_increase = rnd(victim.m_lev + 1);
        if (mtmp.mhpmax + max_increase > hp_threshold + 1)
            max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
        cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
    } else {
        /* a gain level potion or wraith corpse; always go up a level
           unless already at maximum */
        max_increase = cur_increase = rnd(8);
        hp_threshold = 0; /* smaller than `mhpmax + max_increase' */
        lev_limit = 50;   /* recalc below */
    }

    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold)
        return ptr; /* doesn't gain a level */

    if (is_mplayer(ptr))
        lev_limit = 30; /* same as player */
    else if (lev_limit < 5)
        lev_limit = 5; /* arbitrary */
    else if (lev_limit > 49)
        lev_limit = (ptr.mlevel > 49 ? 50 : 49);

    if (++mtmp.m_lev >= mons[newtype].mlevel && newtype !== oldtype) {
        ptr = mons[newtype];
        /* new form might force gender change */
        const fem = is_male(ptr) ? 0 : is_female(ptr) ? 1
                                                            : (mtmp.female ? 1 : 0);

        if (game.mvitals[newtype].mvflags & G_GENOD) { /* allow G_EXTINCT */
            if (canspotmon(mtmp))
                await pline(`As ${mon_nam(mtmp)} grows up into ${
                    an(pmname(ptr, Mgender(mtmp)))}, ${
                    mhe(mtmp)} ${
                    nonliving(ptr) ? "expires" : "dies"}!`);
            set_mon_data(mtmp, ptr); /* keep svm.mvitals[] accurate */
            await mondied(mtmp);
            return null;
        } else if (canspotmon(mtmp)) {
            /* 3.6.1:
             * Temporary (?) hack to fix growing into opposite gender.
             */
            const buf = `${
                /* deal with female gnome becoming a gnome lord */
                (mtmp.female && !fem) ? "male "
                    /* or a male gnome becoming a gnome lady
                       (can't happen with 3.6.0 mons[], but perhaps
                       slightly less sexist if prepared for it...) */
                  : (fem && !mtmp.female) ? "female " : ""}${pmname(ptr, fem)}`;
            /* pline_mon() */
            await pline(`${YMonnam(mtmp)} ${
                (fem !== (mtmp.female ? 1 : 0)) ? "changes into"
                : (ptr.mflags1 & M.M1_HUMANOID) ? "becomes" /* humanoid() */
                  : "grows up into"} ${an(buf)}.`);
        }
        set_mon_data(mtmp, ptr);
        if (mtmp.cham === oldtype && (ptr.mflags2 & M.M2_SHAPESHIFTER))
            mtmp.cham = newtype; /* vampire growing into vampire lord */
        newsym(mtmp.mx, mtmp.my);    /* color may change */
        lev_limit = mtmp.m_lev; /* never undo increment */

        mtmp.female = fem; /* gender might be changing */
        /* if 'mtmp' is leashed, persistent inventory window needs updating:
           update_inventory() -- no persistent inventory window in tty */
    }

    /* sanity checks */
    if (mtmp.m_lev > lev_limit) {
        mtmp.m_lev--; /* undo increment */
        /* HP might have been allowed to grow when it shouldn't */
        if (mtmp.mhpmax === hp_threshold + 1)
            mtmp.mhpmax--;
    }
    if (mtmp.mhpmax > 50 * 8)
        mtmp.mhpmax = 50 * 8; /* absolute limit */
    if (mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;

    return ptr;
}

// C ref: makemon.c mongets()
export function mongets(mtmp, otyp) {
    let otmp;

    if (!otyp)
        return null;
    otmp = mksobj(otyp, true, false);
    if (otmp) {
        if (mtmp.data.mlet === M.S_DEMON) {
            /* demons never get blessed objects */
            if (otmp.blessed)
                curse(otmp);
        } else if (is_lminion(mtmp)) {
            /* lawful minions don't get cursed, bad, or rusting objects */
            otmp.cursed = false;
            if (otmp.spe < 0)
                otmp.spe = 0;
            otmp.oerodeproof = 1;
            otmp.oeroded = otmp.oeroded2 = 0;
        } else if (is_mplayer(mtmp.data) && is_sword(otmp)) {
            otmp.spe = (3 + rn2(4));
        }

        if (otmp.otyp === O.CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0;
            otmp.lamplit = false;
            otmp.blessed = otmp.cursed = false;
        } else if (otmp.otyp === O.BELL_OF_OPENING) {
            otmp.blessed = otmp.cursed = false;
        } else if (otmp.otyp === O.SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = false;
            otmp.cursed = true;
        }

        /* leaders don't tolerate inferior quality battle gear */
        if (is_prince(mtmp.data)) {
            if (otmp.oclass === O.WEAPON_CLASS && otmp.spe < 1)
                otmp.spe = 1;
            else if (otmp.oclass === O.ARMOR_CLASS && otmp.spe < 0)
                otmp.spe = 0;
        }

        if (mpickobj(mtmp, otmp)) {
            /* otmp was freed via merging with something else */
            otmp = null;
        }
    }
    return otmp;
}

// C ref: makemon.c peace_minded()
/*
 *      Alignment vs. yours determines monster's attitude to you.
 *      (Some "animal" types are co-aligned, but also hungry.)
 */
export function peace_minded(ptr) {
    const mal = ptr.maligntyp, ual = game.u.ualign.type;

    if (always_peaceful(ptr))
        return true;
    if (always_hostile(ptr))
        return false;
    if (ptr.msound === M.MS_LEADER || ptr.msound === M.MS_GUARDIAN)
        return true;
    if (ptr.msound === M.MS_NEMESIS)
        return false;
    if (ptr === mons[M.PM_ERINYS])
        return !game.u.ualign.abuse;

    if (race_peaceful(ptr))
        return true;
    if (race_hostile(ptr))
        return false;

    /* the monster is hostile if its alignment is different from the
     * player's */
    if (sgn(mal) !== sgn(ual))
        return false;

    /* Negative monster hostile to player with Amulet. */
    if (mal < A_NEUTRAL && game.u.uhave.amulet)
        return false;

    /* minions are hostile to players that have strayed at all */
    if (is_minion(ptr))
        return (game.u.ualign.record >= 0);

    /* Last case:  a chance of a co-aligned monster being
     * hostile.  This chance is greater if the player has strayed
     * (u.ualign.record negative) or the monster is not strongly aligned.
     */
    return (!!rn2(16 + (game.u.ualign.record < -15 ? -15
                                                   : game.u.ualign.record))
            && !!rn2(2 + Math.abs(mal)));
}

// C ref: makemon.c set_malign()
export function set_malign(mtmp) {
    let mal = mtmp.data.maligntyp;
    let coaligned;

    if (mtmp.ispriest || mtmp.isminion) {
        /* some monsters have individual alignments; check them */
        if (mtmp.ispriest && mtmp.epri)
            mal = mtmp.epri.shralign;
        else if (mtmp.isminion && mtmp.emin)
            mal = mtmp.emin.min_align;
        /* unless alignment is none, set mal to -5,0,5 */
        /* (see align.h for valid aligntyp values)     */
        if (mal !== A_NONE)
            mal *= 5;
    }

    coaligned = (sgn(mal) === sgn(game.u.ualign.type));
    if (mtmp.data.msound === M.MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal === A_NONE) {
        if (mtmp.mpeaceful)
            mtmp.malign = 0;
        else
            mtmp.malign = 20; /* really hostile */
    } else if (always_peaceful(mtmp.data)) {
        const absmal = Math.abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * Math.max(5, absmal);
        else
            mtmp.malign = 3 * Math.max(5, absmal); /* renegade */
    } else if (always_hostile(mtmp.data)) {
        const absmal = Math.abs(mal);
        if (coaligned)
            mtmp.malign = 0;
        else
            mtmp.malign = Math.max(5, absmal);
    } else if (coaligned) {
        const absmal = Math.abs(mal);
        if (mtmp.mpeaceful)
            mtmp.malign = -3 * Math.max(3, absmal);
        else /* renegade */
            mtmp.malign = Math.max(3, absmal);
    } else /* not coaligned and therefore hostile */
        mtmp.malign = Math.abs(mal);
}

// ---- muse.c: random items for monsters ----
// C ref: muse.c rnd_defensive_item()
export function rnd_defensive_item(mtmp) {
    const pm = mtmp.data;
    const difficulty = mons[monsndx(pm)].difficulty;
    let trycnt = 0;

    if (is_animal(pm) || attacktype(pm, M.AT_EXPL) || mindless(mtmp.data)
        || pm.mlet === M.S_GHOST || pm.mlet === M.S_KOP)
        return 0;
    for (;;) { /* try_again: */
        switch (rn2(8 + (difficulty > 3) + (difficulty > 6) + (difficulty > 8))) {
        case 6:
        case 9:
            if (noteleport_level(mtmp) && ++trycnt < 2)
                continue; /* goto try_again */
            if (!rn2(3))
                return O.WAN_TELEPORTATION;
            /* FALLTHRU */
        case 0:
        case 1:
            return O.SCR_TELEPORTATION;
        case 8:
        case 10:
            if (!rn2(3))
                return O.WAN_CREATE_MONSTER;
            /* FALLTHRU */
        case 2:
            return O.SCR_CREATE_MONSTER;
        case 3:
            return O.POT_HEALING;
        case 4:
            return O.POT_EXTRA_HEALING;
        case 5:
            return (mtmp.data !== mons[M.PM_PESTILENCE]) ? O.POT_FULL_HEALING
                                                         : O.POT_SICKNESS;
        case 7: /* wand of digging */
            /* usually avoid digging in Sokoban */
            if (game.level.flags.sokoban_rules && rn2(4))
                continue; /* goto try_again */
            /* some creatures shouldn't dig down to another level when hurt */
            if (is_floater(pm) || mtmp.isshk || mtmp.isgd || mtmp.ispriest)
                return 0;
            return O.WAN_DIGGING;
        }
        /*NOTREACHED*/
        return 0;
    }
}

// C ref: objclass.h is_metallic(); do_wear.c hard_helmet()
function hard_helmet(otmp) {
    if (!otmp) return false;
    const mat = objects[otmp.otyp].oc_material;
    return mat >= 11 /* IRON */ && mat <= 17 /* MITHRIL */;
}

// C ref: muse.c rnd_offensive_item()
export function rnd_offensive_item(mtmp) {
    const pm = mtmp.data;
    const difficulty = mons[monsndx(pm)].difficulty;

    if (is_animal(pm) || attacktype(pm, M.AT_EXPL) || mindless(mtmp.data)
        || pm.mlet === M.S_GHOST || pm.mlet === M.S_KOP)
        return 0;
    if (difficulty > 7 && !rn2(35))
        return O.WAN_DEATH;
    switch (rn2(9 - (difficulty < 4) + 4 * (difficulty > 6))) {
    case 0: {
        const mtmp_helmet = which_armor(mtmp, W_ARMH);

        if (hard_helmet(mtmp_helmet) || amorphous(pm)
            || passes_walls(pm) || noncorporeal(pm) || unsolid(pm))
            return O.SCR_EARTH;
    }
    /* FALLTHRU */
    case 1:
        return O.WAN_STRIKING;
    case 2:
        return O.POT_ACID;
    case 3:
        return O.POT_CONFUSION;
    case 4:
        return O.POT_BLINDNESS;
    case 5:
        return O.POT_SLEEPING;
    case 6:
        return O.POT_PARALYSIS;
    case 7:
    case 8:
        return O.WAN_MAGIC_MISSILE;
    case 9:
        return O.WAN_SLEEP;
    case 10:
        return O.WAN_FIRE;
    case 11:
        return O.WAN_COLD;
    case 12:
        return O.WAN_LIGHTNING;
    }
    /*NOTREACHED*/
    return 0;
}

// C ref: mondata.h is_vampshifter()
function is_vampshifter_mon(mon) {
    return mon.cham === M.PM_VAMPIRE || mon.cham === M.PM_VAMPIRE_LEADER
           || mon.cham === M.PM_VLAD_THE_IMPALER;
}
// C ref: youprop.h See_invisible -- intrinsics aren't tracked yet

// C ref: muse.c rnd_misc_item()
export function rnd_misc_item(mtmp) {
    const pm = mtmp.data;
    const difficulty = mons[monsndx(pm)].difficulty;

    if (is_animal(pm) || attacktype(pm, M.AT_EXPL) || mindless(mtmp.data)
        || pm.mlet === M.S_GHOST || pm.mlet === M.S_KOP)
        return 0;
    /* Unlike other rnd_item functions, we only allow _weak_ monsters
     * to have this item; after all, the item will be used to strengthen
     * the monster and strong monsters won't use it at all...
     */
    if (difficulty < 6 && !rn2(30))
        return rn2(6) ? O.POT_POLYMORPH : O.WAN_POLYMORPH;

    if (!rn2(40) && !nonliving(pm) && !is_vampshifter_mon(mtmp))
        return O.AMULET_OF_LIFE_SAVING;

    switch (rn2(3)) {
    case 0:
        if (mtmp.isgd)
            return 0;
        return rn2(6) ? O.POT_SPEED : O.WAN_SPEED_MONSTER;
    case 1:
        if (mtmp.mpeaceful && !See_invisible())
            return 0;
        return rn2(6) ? O.POT_INVISIBILITY : O.WAN_MAKE_INVISIBLE;
    case 2:
        return O.POT_GAIN_LEVEL;
    }
    /*NOTREACHED*/
    return 0;
}
import { G_EXTINCT as G_EXTINCT_CM, isok as isok_cm, MGIVENNAME as MGIVENNAME_cm,
         has_mgivenname as has_mgivenname_cm } from './const.js';
import { enexto as enexto_cm } from './teleport.js';
import { mon_track_clear as mon_track_clear_cm } from './monmove.js';
import { tamedog as tamedog_cm } from './dog.js';
const DF_NONE = 0x00; /* hack.h */

const NON_PM = -1;

// C ref: monst.h monmax_difficulty(), monmin_difficulty(),
// montoostrong(), montooweak()
function monmax_difficulty(levdif) { return Math.trunc((levdif + game.u.ulevel) / 2); }
function monmin_difficulty(levdif) { return Math.trunc(levdif / 6); }
function montoostrong(monindx, lev) { return mons[monindx].difficulty > lev; }
function montooweak(monindx, lev) { return mons[monindx].difficulty < lev; }

// C ref: hacklib.c sgn()
function sgn(n) { return (n < 0) ? -1 : (n > 0) ? 1 : 0; }

// C ref: mondata.h pm_resistance(), is_placeholder()
export function pm_resistance(ptr, typ) { return (ptr.mresists & typ) !== 0; }
export function is_placeholder(ptr) {
    return (ptr === mons[PM_ORC] || ptr === mons[PM_GIANT]
            || ptr === mons[PM_ELF] || ptr === mons[PM_HUMAN]);
}

// C ref: dungeon.h Is_rogue_level(); In_endgame()
function Is_rogue_level(lev) {
    const z = game.dungeon_topology.d_rogue_level;
    return !!((z.dlevel || z.dnum) && lev.dnum === z.dnum && lev.dlevel === z.dlevel);
}
export function In_endgame(lev) {
    return lev.dnum === game.dungeon_topology.d_astral_level.dnum;
}

// C ref: makemon.c uncommon()
function uncommon(mndx) {
    if (mons[mndx].geno & (G_NOGEN | G_UNIQ))
        return true;
    if (game.mvitals[mndx].mvflags & G_GONE)
        return true;
    if (In_hell(game.u.uz))
        return (mons[mndx].maligntyp > A_NEUTRAL);
    else
        return ((mons[mndx].geno & G_HELL) !== 0);
}

// C ref: makemon.c align_shift()
/*
 *      shift the probability of a monster's generation by
 *      comparing the dungeon alignment and monster alignment.
 *      return an integer in the range of 0-5.
 */
function align_shift(ptr) {
    let alshift;

    /* C: static oldmoves = 0L (!= 1, the starting value of moves) and
       static s_level *lev -- Is_special(&u.uz) is looked up again only
       when moves has changed since the last call, so on a level change
       within one move 'lev' is still the previous level's */
    if (game.align_shift_oldmoves === undefined) {
        game.align_shift_oldmoves = 0;
        game.align_shift_lev = null;
    }
    if (game.align_shift_oldmoves !== game.moves) {
        game.align_shift_lev = Is_special(game.u.uz);
        game.align_shift_oldmoves = game.moves;
    }
    const lev = game.align_shift_lev;
    switch ((lev) ? lev.flags.align : game.dungeons[game.u.uz.dnum].flags.align) {
    default: /* just in case */
    case AM_NONE:
        alshift = 0;
        break;
    case AM_LAWFUL:
        alshift = Math.trunc((ptr.maligntyp + 20) / (2 * ALIGNWEIGHT));
        break;
    case AM_NEUTRAL:
        alshift = Math.trunc((20 - Math.abs(ptr.maligntyp)) / ALIGNWEIGHT);
        break;
    case AM_CHAOTIC:
        alshift = Math.trunc((-(ptr.maligntyp - 20)) / (2 * ALIGNWEIGHT));
        break;
    }
    return alshift;
}

// C ref: makemon.c temperature_shift()
/* return larger value if monster prefers the level temperature */
function temperature_shift(ptr) {
    if (game.level.flags.temperature
        && pm_resistance(ptr, (game.level.flags.temperature > 0)
                         ? MR_FIRE : MR_COLD))
        return 3;
    return 0;
}

// C ref: display.h monsym() -- gs.showsyms[mlet + SYM_OFF_M]; no
// symset in the port changes monster symbols, so they are def_monsyms[]
export function monsym(ptr) {
    return def_monsyms[ptr.mlet];
}

// C ref: <ctype.h> isupper()
function isupper(ch) {
    return typeof ch === 'string' && ch >= 'A' && ch <= 'Z';
}

// C ref: makemon.c wrong_elem_type()
/*
 * Return true if the given monster cannot exist on this elemental level.
 */
function wrong_elem_type(ptr) {
    if (ptr.mlet === M.S_ELEMENTAL) {
        return !is_home_elemental(ptr);
    } else if (Is_earthlevel(game.u.uz)) {
        /* no restrictions? */
    } else if (Is_waterlevel(game.u.uz)) {
        /* just monsters that can swim */
        if (!is_swimmer(ptr))
            return true;
    } else if (Is_firelevel(game.u.uz)) {
        if (!pm_resistance(ptr, MR_FIRE))
            return true;
    } else if (Is_airlevel(game.u.uz)) {
        if (!(is_flyer(ptr) && ptr.mlet !== M.S_TRAPPER) && !is_floater(ptr)
            && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr))
            return true;
    }
    return false;
}

// C ref: questpgr.c qt_montype()
export function qt_montype() {
    let qpm;

    if (rn2(5)) {
        qpm = game.urole.enemy1num;
        if (qpm !== NON_PM && rn2(5) && !(game.mvitals[qpm].mvflags & G_GENOD))
            return mons[qpm];
        return mkclass(game.urole.enemy1sym, 0);
    }
    qpm = game.urole.enemy2num;
    if (qpm !== NON_PM && rn2(5) && !(game.mvitals[qpm].mvflags & G_GENOD))
        return mons[qpm];
    return mkclass(game.urole.enemy2sym, 0);
}

// C ref: minion.c ndemon()
export function ndemon(atyp) /* A_NONE is used for 'any alignment' */
{
    /*
     * 3.6.2:  [fixed #H2204, 22-Dec-2010, eight years later...]
     * pick a correctly aligned demon in one try.  This used to
     * use mkclass() to choose a random demon type and keep trying
     * (up to 20 times) until it got one with the desired alignment.
     * mkclass_aligned() skips wrongly aligned potential candidates.
     * [The only neutral demons are djinni and mail daemon and
     * mkclass() won't pick them, but call it anyway in case either
     * aspect of that changes someday.]
     */
    const ptr = mkclass_aligned(M.S_DEMON, 0, atyp);
    return (ptr && is_ndemon(ptr)) ? monsndx(ptr) : NON_PM;
}

// C ref: makemon.c rndmonst()
/* select a random monster type */
export function rndmonst() {
    return rndmonst_adj(0, 0);
}

// C ref: makemon.c rndmonst_adj()
/* select a random monster type, with adjusted difficulty */
export function rndmonst_adj(minadj, maxadj) {
    let ptr;
    let mndx;
    let weight, totalweight, selected_mndx;

    if (game.u.uz.dnum === game.dungeon_topology.d_quest_dnum && rn2(7)
        && (ptr = qt_montype()) !== null)
        return ptr;

    const zlevel = level_difficulty();
    const minmlev = monmin_difficulty(zlevel) + minadj;
    const maxmlev = monmax_difficulty(zlevel) + maxadj;
    const upper = Is_rogue_level(game.u.uz); /* prefer uppercase only on rogue level */
    const elemlevel = In_endgame(game.u.uz)
        && !(game.u.uz.dnum === game.dungeon_topology.d_astral_level.dnum
             && game.u.uz.dlevel === game.dungeon_topology.d_astral_level.dlevel);

    /* amount processed so far */
    totalweight = 0;
    selected_mndx = NON_PM;

    for (mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        ptr = mons[mndx];

        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper && !isupper(monsym(ptr)))
            continue;
        if (elemlevel && wrong_elem_type(ptr))
            continue;
        if (uncommon(mndx))
            continue;
        if (In_hell(game.u.uz) && (ptr.geno & G_NOHELL))
            continue;

        /*
         * Weighted reservoir sampling:  select ptr with a
         * (ptr weight)/(total of all weights so far including ptr's)
         * probability.
         */
        weight = (ptr.geno & G_FREQ) + align_shift(ptr);
        weight += temperature_shift(ptr);
        if (weight < 0 || weight > 127) {
            impossible(`bad weight in rndmonst for mndx ${mndx}`);
            weight = 0;
        }
        /* was unconditional, but if weight==0, rn2() < 0 will always fail;
           also need to avoid rn2(0) if totalweight is still 0 so far */
        if (weight > 0) {
            totalweight += weight; /* totalweight now guaranteed to be > 0 */
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }
    /*
     * Possible modification:  if totalweight is "too low" or nothing
     * viable was picked, expand minmlev..maxmlev range and try again.
     */
    if (selected_mndx === NON_PM || uncommon(selected_mndx)) {
        /* maybe no common monsters left, or all are too weak or too strong */
        return null;
    }
    return mons[selected_mndx];
}

// C ref: makemon.c mk_gen_ok()
/* decide whether it's ok to generate a candidate monster by mkclass() */
function mk_gen_ok(mndx, mvflagsmask, genomask) {
    const ptr = mons[mndx];

    if (game.mvitals[mndx].mvflags & mvflagsmask)
        return false;
    if (ptr.geno & genomask)
        return false;
    if (is_placeholder(ptr))
        return false;
    /* PM_MAIL_DAEMON exists only with MAIL_STRUCTURES */
    return true;
}

/* monsters in order by mlet & difficulty for mkclass() */
const mongen_order = new Array(NUMMONS).fill(0);
const mclass_maxf = new Array(MAXMCLASSES).fill(0);
let mongen_order_init = false;

// C ref: makemon.c cmp_init_mongen_order()
function cmp_init_mongen_order(i1, i2) {
    const offset1 = 0, offset2 = 0;

    /* incorporate the mlet into the sort values for comparison */
    const difficulty1 = ((mons[i1].difficulty + offset1) | (mons[i1].mlet << 8));
    const difficulty2 = ((mons[i2].difficulty + offset2) | (mons[i2].mlet << 8));
    return difficulty1 - difficulty2;
}

// C ref: makemon.c init_mongen_order()
/* initialize monster order for mkclass */
function init_mongen_order() {
    let i, mlet;

    if (mongen_order_init)
        return;

    mongen_order_init = true;
    for (i = LOW_PM; i < NUMMONS; i++) {
        mongen_order[i] = i;
        mlet = mons[i].mlet;
        if ((mons[i].geno & G_FREQ) > mclass_maxf[mlet])
            mclass_maxf[mlet] = (mons[i].geno & G_FREQ);
    }
    /* qsort(mongen_order, SPECIAL_PM, ...): the C library qsort is not
       stable; ties (same mlet and difficulty) keep mons[] order here,
       which matches glibc's merge sort for this input */
    const head = mongen_order.slice(0, SPECIAL_PM).sort(cmp_init_mongen_order);
    for (i = 0; i < SPECIAL_PM; i++)
        mongen_order[i] = head[i];
}

function MONSi(i) { return mongen_order[i]; }

// C ref: makemon.c mkclass()
/* Make one of the multiple types of a given monster class.
   Returns Null if no monsters in that class can be made. */
export function mkclass(class_, spc) {
    return mkclass_aligned(class_, spc, A_NONE);
}

// C ref: makemon.c mkclass_aligned()
/* mkclass() with alignment restrictions; used by ndemon() */
export function mkclass_aligned(class_, spc, atyp) {
    let first, last, num = 0;
    let k;
    const nums = new Array(SPECIAL_PM + 1).fill(0);
    const gehennom = In_hell(game.u.uz) ? 1 : 0;
    let mv_mask, gn_mask;

    const maxmlev = level_difficulty() >> 1;
    if (class_ < 1 || class_ >= MAXMCLASSES) {
        impossible('mkclass called with bad class!');
        return null;
    }

    init_mongen_order();
    /* the following must come after init_mongen_order() */
    const zero_freq_for_entire_class = (mclass_maxf[class_] === 0);

    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (mons[MONSi(first)].mlet === class_)
            break;
    if (first === SPECIAL_PM) {
        impossible(`mkclass found no class ${class_} monsters`);
        return null;
    }

    mv_mask = G_GONE; /* G_GENOD | G_EXTINCT */
    if ((spc & G_IGNORE) !== 0) {
        mv_mask = 0; /* mv_mask &= ~G_GONE; */
        /* G_IGNORE is not a mons[].geno mask so get rid of it now */
        spc &= ~G_IGNORE;
    }

    for (last = first; last < SPECIAL_PM && mons[MONSi(last)].mlet === class_;
         last++) {
        if (atyp !== A_NONE && sgn(mons[MONSi(last)].maligntyp) !== sgn(atyp))
            continue;
        gn_mask = (G_NOGEN | G_UNIQ);
        if (rn2(9) || class_ === S_LICH)
            gn_mask |= (gehennom ? G_NOHELL : G_HELL);
        gn_mask &= ~spc;

        if (mk_gen_ok(MONSi(last), mv_mask, gn_mask)) {
            if (num && montoostrong(MONSi(last), maxmlev)
                && mons[MONSi(last)].difficulty > mons[MONSi(last - 1)].difficulty
                && rn2(2))
                break;
            if ((k = (mons[MONSi(last)].geno & G_FREQ)) > 0
                || (k = (zero_freq_for_entire_class ? 1 : 0)) > 0) {
                nums[MONSi(last)] = k + 1
                    - (adj_lev(mons[MONSi(last)]) > (game.u.ulevel * 2) ? 1 : 0);
                num += nums[MONSi(last)];
            }
        }
    }
    if (!num)
        return null;

    /* the hard work has already been done; 'num' should hit 0 before
       first reaches last (which is actually one past our last candidate) */
    for (num = rnd(num); first < last; first++)
        if ((num -= nums[MONSi(first)]) <= 0)
            break;

    return nums[MONSi(first)] ? mons[MONSi(first)] : null;
}

// C ref: makemon.c adj_lev()
/* adjust strength of monsters based on u.uz and u.ulevel */
export function adj_lev(ptr) {
    let tmp, tmp2;

    if (ptr === mons[PM_WIZARD_OF_YENDOR]) {
        /* does not depend on other strengths, but does get stronger
         * every time he is killed
         */
        tmp = ptr.mlevel + game.mvitals[PM_WIZARD_OF_YENDOR].died;
        if (tmp > 49)
            tmp = 49;
        return tmp;
    }

    if ((tmp = ptr.mlevel) > 49)
        return 50; /* "special" demons/devils */
    tmp2 = (level_difficulty() - tmp);
    if (tmp2 < 0)
        tmp--; /* if mlevel > u.uz decrement tmp */
    else
        tmp += Math.trunc(tmp2 / 5); /* else increment 1 per five diff */

    tmp2 = (game.u.ulevel - ptr.mlevel); /* adjust vs. the player */
    if (tmp2 > 0)
        tmp += Math.trunc(tmp2 / 4); /* level as well */

    tmp2 = Math.trunc((3 * ptr.mlevel) / 2); /* crude upper limit */
    if (tmp2 > 49)
        tmp2 = 49;                                      /* hard upper limit */
    return ((tmp > tmp2) ? tmp2 : (tmp > 0 ? tmp : 0)); /* 0 lower limit */
}

// ============================================================
// Monster creation: makemon() and the random-monster path.
// C ref: makemon.c makemon(), newmonhp(), m_initweap(), m_initinv(),
// m_initthrow(), mongets(), mkmonmoney(), golemhp(), propagate(),
// peace_minded(), set_malign(); muse.c rnd_defensive_item(),
// rnd_offensive_item(), rnd_misc_item(); teleport.c goodpos().
// ============================================================
