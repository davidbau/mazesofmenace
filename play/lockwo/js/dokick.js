// dokick.js — C ref: dokick.c (the ^D kick command).
//
// The kick command used to live inline in cmd.js and covered three of the five
// squares C distinguishes (empty space, rock/wall, door).  The one that costs
// the most RNG is kick_nondoor(): its fountain / altar / throne / grave / sink
// / secret-door / stairs arms each have their own draw shape, and every one of
// them used to be routed into kick_dumb() (one rn2(2), sometimes an rn2(3)).
// dokick()'s pre-direction refusals matter for a different reason: C returns
// ECMD_FAIL *before* getdir(), so the direction key becomes the next command.

import { game } from './gstate.js';
import { rn2, rnd, rnl, rn1 } from './rng.js';
import { pline, newsym, m_at, topl_more, unmap_object, y_n } from './display.js';
import { Blind, couldsee, recalc_block_point, unblock_point } from './vision.js';
import { exercise, acurr_eff, adjalign } from './attrib.js';
import {
    A_STR, A_DEX, A_CON, A_WIS, A_LAWFUL, FACE, LEG,
    SDOOR, SCORR, CORR, DOOR, ROOM, STAIRS, LADDER, IRONBARS, LAVAWALL,
    LA_DOWN, D_ISOPEN, D_BROKEN, D_NODOOR, D_CLOSED, D_LOCKED, D_TRAPPED,
    D_WARNED, T_LOOTED, TREE_SWARM, S_LPUDDING, S_LDWASHER,
    IS_DOOR, IS_STWALL, IS_OBSTRUCTED, IS_THRONE, IS_ALTAR, IS_FOUNTAIN,
    IS_GRAVE, IS_SINK, IS_TREE, IS_DRAWBRIDGE, IS_POOL,
    isok, LEFT_SIDE, RIGHT_SIDE, BOTH_SIDES, SLT_ENCUMBER, SHOPBASE,
    TT_PIT, TT_WEB, TT_BEARTRAP, TRAPDOOR, HOLE,
    MIGR_NOWHERE, MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_LADDER_UP, MIGR_SSTAIRS,
    In_endgame, Is_stronghold, Is_botlevel,
    MM_ANGRY, MM_NOMSG, MM_MALE, MM_FEMALE, ER_NOTHING,
    AM_MASK, Amask2align, W_ARMF,
} from './const.js';
import { KICKING_BOOTS, BOULDER, ROCK, DILITHIUM_CRYSTAL, LUCKSTONE,
         RING_CLASS, GEM_CLASS, EGG, BAG_OF_HOLDING, BAG_OF_TRICKS,
         mkgold, mksobj_at, mkobj_at, rnd_class, objects, weight } from './mkobj.js';
import { makemon, monster_by_pmidx, name_to_pmidx, enexto_spawn } from './makemon.js';
import { in_rooms, shop_keeper } from './shkroom.js';
import { water_damage, set_wounded_legs, t_at } from './trap.js';
import { near_capacity, sobj_at, useup, body_part, inv_weight, makeplural } from './invent.js';
import { obj_resists } from './zap.js';
import { surface, hliquid, dunlevs_in_dungeon, Is_special } from './dungeon.js';
import { attacktype, AT_ENGL } from './monattk_data.js';
import { nolimbs, nohands, mflags1_of, M1_SLITHY, humanoid,
         M1_THICK_HIDE, M1_NOEYES, M1_FLY, M1_TPORT,
         is_neuter_flag } from './monflags_data.js';
import { canspotmon, Monnam, mon_nam, setmangry, killed, monflee,
         attack_checks, overexertion, passive, check_caitiff, abuse_dog,
         seemimicLocal as seemimic, glyph_is_invisible } from './uhitm.js';
import { DEADMONSTER } from './mon.js';
import { map_invisible } from './display.js';
import { special_dmgval } from './weapon.js';
import { goodpos, rloc_to } from './teleport.js';
import { m_in_out_region } from './region.js';
import { set_apparxy, noteleport_level } from './monmove.js';
import { AT_KICK } from './monattk_data.js';
import { a_monnam } from './do_name.js';
import { wipe_engr_at } from './engrave.js';
import { getdir, wake_nearby, wake_nearto, b_trapped } from './cmd.js';
import { goto_level } from './do.js';

const ECMD_OK = 0, ECMD_TIME = 1, ECMD_FAIL = 0, ECMD_CANCEL = 0;
const S_LIZARD = 58;      // defsym.h S_LIZARD, as numbered in permonst.mcls
                          // (`mlet` on these rows is the display CHARACTER)
const GLASS = 19;         // objects[].oc_material GLASS (mkobj.js's private copy)
const MIRROR = 230;       // objects[] MIRROR
const S_LRING = 4;        // rm.h S_LRING (sink `looted` bit)
const STRAT_WAITMASK = 0x00ff0000;

// C ref: attrib.c acurr(chridx) — effective attribute; attrib.js owns it.
function ACURR(i) { return acurr_eff(i); }

// C ref: attrib.c acurrstr() — map the encoded A_STR (3..125; 18/01 stored as
// 19, ..) onto the 3..25 scale used by strength-dependent checks.
function ACURRSTR() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 0;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

function Levitation() { return !!game.u?.uprops?.Levitation; }
function Deaf() { return !!game.u?.Deaf; }
function Luck() { return game.u?.uluck ?? 0; }
// C ref: allmain.c Wounded_legs (HWounded_legs || EWounded_legs).
function Wounded_legs() {
    const u = game.u;
    return !!((u?.HWounded_legs || 0) || (u?.EWounded_legs || 0));
}
// C ref: youprop.h Passes_walls.
function Passes_walls() { return !!game.u?.uprops?.Passes_walls; }

// C ref: dokick.c martial() == (martial_bonus() || is_bigfoot(youmonst)
//   || (uarmf && uarmf->otyp == KICKING_BOOTS)), where
//   martial_bonus() == (Role_if(PM_SAMURAI) || Role_if(PM_MONK)).
// A martial hero kicks "expertly" — the kick_dumb / kick_door martial checks
// short-circuit before rolling, so the RNG stream must reflect this for the
// monk and samurai sessions (the seed0200-monk step-27 divergence: kick_dumb's
// rn2(3) fired in JS but C skipped it via martial()).  We never poly into a
// sasquatch, so is_bigfoot() stays false (no RNG either way).
// mnum is roles[].mnum, the PM_ number Role_if() compares against (role.js).
const PM_ARCHEOLOGIST = 0, PM_MONK = 5, PM_SAMURAI = 9;
export function martial() {
    const mnum = game.urole?.mnum;
    if (mnum === PM_MONK || mnum === PM_SAMURAI) return true;
    const uarmf = game.uarmf;
    if (uarmf && uarmf.otyp === KICKING_BOOTS) return true;
    return false;
}

// C ref: mondata.h is_watch(ptr) — the species-pointer test
// `ptr == &mons[PM_WATCHMAN] || ptr == &mons[PM_WATCH_CAPTAIN]`.  Resolved by
// pmidx (fountain.js does the same) so it cannot go stale on a name change.
let PM_WATCHMAN = -2, PM_WATCH_CAPTAIN = -2;
function is_watch(ptr) {
    if (PM_WATCHMAN === -2) {
        PM_WATCHMAN = name_to_pmidx('watchman');
        PM_WATCH_CAPTAIN = name_to_pmidx('watch captain');
    }
    const idx = ptr?.pmidx ?? -1;
    return idx >= 0 && (idx === PM_WATCHMAN || idx === PM_WATCH_CAPTAIN);
}

// C ref: shk.c angry_guards(silent) — every watchman in town turns hostile.
// shkroom.js and fountain.js each keep their own copy (no shared owner); this
// is the dokick.c caller's.  No RNG.
function angry_guards(_silent) {
    let ct = 0;
    for (const mtmp of (game.level?.monsters || [])) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (!is_watch(mtmp.data)) continue;
        ct++;
        if (mtmp.mpeaceful) {
            mtmp.mpeaceful = 0;
            if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
        }
    }
    return ct > 0;
}

// C ref: sounds.c mon_yells(mon, msg) — heard verbatim when the yeller is
// visible, otherwise attributed to "someone".  No RNG.
async function mon_yells(mtmp, msg) {
    if (canspotmon(mtmp)) await pline(`${Monnam(mtmp)} yells:  ${msg}`);
    else await pline(`You hear someone yell:  ${msg}`);
}

// C ref: dungeon.c in_town(x, y).  Same shape as dig.js/makemon.js/fountain.js
// keep (each file-private): the S_LEVEL `town` flag stands in for
// svl.level.flags.has_town, which nothing in this port writes.
function inside_room(croom, x, y) {
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}
function in_town(x, y) {
    const lvl = game.level;
    const slev = Is_special(game.u?.uz);
    if (!slev || !slev.flags?.town) return false;
    let has_subrooms = false;
    for (let i = 0; i < (lvl?.nroom ?? 0); i++) {
        const sroom = lvl.rooms[i];
        if (!sroom || (sroom.hx ?? 0) <= 0) break;
        if ((sroom.nsubrooms ?? 0) > 0) {
            has_subrooms = true;
            if (inside_room(sroom, x, y)) return true;
        }
    }
    return !has_subrooms;
}

// C ref: mklev.c cvt_sdoor_to_door(lev) — an exposed secret door becomes an
// ordinary (closed) door.  WM_MASK (rm.h) is the low wall-mode bits stored in
// doormask for an SDOOR; strip them, then mark the door closed unless locked.
const WM_MASK = 0x07;
function cvt_sdoor_to_door(lev) {
    let newmask = lev.doormask & ~WM_MASK;
    if (!(newmask & D_LOCKED)) newmask |= D_CLOSED;
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// C ref: engrave.c del_engr_at(x, y).  fountain.js keeps the fountain caller's
// copy; this is the grave-smashing one.
function del_engr_at(x, y) {
    const engr = game.level?.engravings;
    if (!Array.isArray(engr)) return;
    const i = engr.findIndex((e) => e.engr_x === x && e.engr_y === y);
    if (i >= 0) engr.splice(i, 1);
}

// C ref: engrave.c disturb_grave(x, y) — kicking (or engraving on) a headstone
// summons the grave's ghoul, once.  makemon() draws; exercise() draws rn2(2).
async function disturb_grave(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev || lev.disturbed) return;
    await pline('You disturb the undead!');
    lev.disturbed = 1;
    makemon(monster_by_pmidx(name_to_pmidx('ghoul')), x, y, 0);
    exercise(A_WIS, false);
}

// C ref: cmd.c change_luck(n) — clamped Luck adjustment (eat.js/pray.js/
// uhitm.js each keep their own copy).  LUCKADD/LUCKMAX are 3/10.
function change_luck(n) {
    const u = game.u;
    if (!u) return;
    u.uluck = (u.uluck || 0) + n;
    if (u.uluck < 0 && u.uluck < -10) u.uluck = -10;
    if (u.uluck > 0 && u.uluck > 10) u.uluck = 10;
    game.botl = true;
}

// C ref: pray.c altar_wrath(x, y) — the altar's god objects to being kicked.
// RNG: rn2(4) for the "own god" test, else rn2(Luck + 6) and, when that fires,
// change_luck(rn2(20) ? -1 : -2).
async function altar_wrath(x, y) {
    const u = game.u;
    const lev = game.level?.at(x, y);
    const altaralign = Amask2align((lev?.altarmask ?? 0) & AM_MASK);
    if ((u?.ualign?.type ?? 0) === altaralign && (u?.ualign?.record ?? 0) > -rn2(4)) {
        await pline('"How darest thou desecrate my altar!"');
        // adjattrib(A_WIS, -1, FALSE): no RNG, lowers the attribute.
        const a = u?.acurr?.a;
        if (a && a[A_WIS] > 3) a[A_WIS] -= 1;
        if (u?.ualign) u.ualign.record--;
        game.botl = true;
    } else {
        await pline('A voice whispers:  "Thou shalt pay, infidel!"');
        // higher luck is more likely to be reduced
        if (Luck() > -5 && rn2(Luck() + 6)) change_luck(rn2(20) ? -1 : -2);
    }
}

// C ref: makemon.c svm.mvitals[mndx].mvflags & G_GONE — genocided or extinct.
const G_GONE = 0x03;
function species_gone(name) {
    const idx = name_to_pmidx(name);
    if (idx < 0) return true;
    return ((game.mvitals?.[idx]?.mvflags ?? 0) & G_GONE) !== 0;
}

// C ref: polyself.c poly_gender() — "0/1 = same meaning as flags.female,
// 2 = none".  So 1 is FEMALE, and dokick's `gend == 1 ? MM_MALE : MM_FEMALE`
// is deliberate: a female hero summons the male dish washer.
function poly_gender() {
    const ydata = game.youmonst?.data;
    if (ydata && (is_neuter_flag(ydata) || !humanoid(ydata))) return 2;
    return game.flags?.female ? 1 : 0;
}

// C ref: display.c unmap_invisible(x, y) — a square remembered as holding a
// sensed-but-unseen monster ('I') loses that notation once the hero looks.
function unmap_invisible(x, y) {
    if (!isok(x, y)) return false;
    if (!game.level?.at(x, y)?.invisMon) return false;
    unmap_object(x, y);
    newsym(x, y);
    return true;
}

// C ref: engrave.c u_wipe_engr(cnt) — scuff the engraving under the hero.
// wipe_engr_at() draws rn2(1 + 50 / (cnt + 1)) for every engraving type except
// DUST and blood, so this is an RNG call site on an engraved square.
function u_wipe_engr(cnt) {
    const u = game.u;
    if (u?.uprops?.Levitation || u?.uprops?.Flying) return;
    wipe_engr_at(u.ux, u.uy, cnt, false);
}

// C ref: mon.c get_iter_mons(func) / get_iter_mons_xy(func, x, y) — walk fmon
// applying the predicate; both dokick.c call sites ignore the result.
async function get_iter_mons(fn) {
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (await fn(mtmp)) return mtmp;
    }
    return null;
}
async function get_iter_mons_xy(fn, x, y) {
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (await fn(mtmp, x, y)) return mtmp;
    }
    return null;
}

// C ref: dokick.c kickstr(buf, kickobjnam) — the cause of death when the kick
// kills the kicker (kick_ouch -> losehp(.., kickstr(..), KILLED_BY)).  With no
// kicked object the text names the terrain gm.maploc points at; a null maploc
// is C's `gm.maploc == &gn.nowhere` (a kick off the edge of the map).
export function kickstr(kickobjnam, maploc) {
    let what;
    if (kickobjnam) what = kickobjnam;
    else if (!maploc) what = 'nothing';
    else if (IS_DOOR(maploc.typ)) what = 'a door';
    else if (IS_TREE(maploc.typ)) what = 'a tree';
    else if (IS_STWALL(maploc.typ)) what = 'a wall';
    else if (IS_OBSTRUCTED(maploc.typ)) what = 'a rock';
    else if (IS_THRONE(maploc.typ)) what = 'a throne';
    else if (IS_FOUNTAIN(maploc.typ)) what = 'a fountain';
    else if (IS_GRAVE(maploc.typ)) what = 'a headstone';
    else if (IS_SINK(maploc.typ)) what = 'a sink';
    else if (IS_ALTAR(maploc.typ)) what = 'an altar';
    else if (IS_DRAWBRIDGE(maploc.typ)) what = 'a drawbridge';
    else if (maploc.typ === STAIRS) what = 'the stairs';
    else if (maploc.typ === LADDER) what = 'a ladder';
    else if (maploc.typ === IRONBARS) what = 'an iron bar';
    else what = 'something weird';
    return 'kicking ' + what;
}

// C ref: dokick.c watchman_thief_arrest(mtmp) — the get_iter_mons() predicate
// run after a shop door is broken in town.  No RNG.
export async function watchman_thief_arrest(mtmp) {
    if (is_watch(mtmp.data) && couldsee(mtmp.mx, mtmp.my) && mtmp.mpeaceful) {
        await mon_yells(mtmp, "Halt, thief!  You're under arrest!");
        angry_guards(false);
        return true;
    }
    return false;
}

// C ref: dokick.c watchman_door_damage(mtmp, x, y) — first offence is a warning
// (D_WARNED goes into the door's `looted` field), second is an arrest.  No RNG.
export async function watchman_door_damage(mtmp, x, y) {
    if (is_watch(mtmp.data) && mtmp.mpeaceful && couldsee(mtmp.mx, mtmp.my)) {
        const lev = game.level?.at(x, y);
        if ((lev?.looted ?? 0) & D_WARNED) {
            await mon_yells(mtmp, "Halt, vandal!  You're under arrest!");
            angry_guards(false);
        } else {
            await mon_yells(mtmp, 'Hey, stop damaging that door!');
            if (lev) lev.looted = (lev.looted | 0) | D_WARNED;
        }
        return true;
    }
    return false;
}

// C ref: dokick.c kick_dumb(x,y) — kicking empty space (or an indestructible
// feature).  exercise(A_DEX, FALSE) always fires (rn2(2) inside exercise); the
// "strain a muscle" branch needs not martial, ACURR(A_DEX) < 16, and rn2(3)==0.
export async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
        // feel_location(x, y) when Blind: map bookkeeping only, no RNG.
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    // C ref: dokick.c — `if ((Is_airlevel || Levitation) && rn2(2)) hurtle(...)`.
    // The rn2(2) is drawn for every kick a LEVITATING hero makes; hurtle()'s own
    // flight (walk_path + hurtle_step) is not ported, so only the roll is.
    if (Levitation()) rn2(2);
}

// C ref: dokick.c kick_ouch(x,y,kickobjnam) — kicking a solid obstacle hurts.
// RNG order: exercise(A_DEX) [rn2(2)], exercise(A_STR) [rn2(2)], !rn2(3) ->
// set_wounded_legs(5+rnd(5)), then dmg = rnd(ACURR(A_CON)>15?3:5), losehp(dmg).
export async function kick_ouch(x, y, kickobjnam, maploc) {
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        // C ref: dokick.c:898 — the noise wakes anything within 5*5; no RNG
        // here, but the monsters it wakes go on to take (RNG-drawing) turns.
        // is_drawbridge_wall()/find_drawbridge() only retarget gm.maploc for
        // kickstr(); no drawbridge is kicked on the levels this reaches.
        await wake_nearto(x, y, 5 * 5);
    }
    if (rn2(3) === 0) await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    const dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    const u = game.u;
    // losehp(Maybe_Half_Phys(dmg), kickstr(buf, kickobjnam), KILLED_BY): no hero
    // reaching here carries Half_physical_damage, so dmg passes unhalved.
    if (u) {
        u.ukiller = kickstr(kickobjnam, maploc);
        u.uhp = Math.max(0, (u.uhp || 0) - dmg);
        game.botl = true;
    }
    // C ref: dokick.c — `if (Is_airlevel || Levitation) hurtle(-u.dx, -u.dy,
    // rn1(2, 4), TRUE)`: a levitating kicker is always thrown back, and the
    // range roll rn1(2,4) == 4 + rn2(2) is drawn before hurtle() runs.  The
    // flight itself is not ported; the roll is.
    if (Levitation()) rn1(2, 4);
}

// C ref: dokick.c kick_door(x, y, avrg_attrib) — kick a closed/locked door.
// Open/broken/no-door squares fall through to kick_dumb.  Otherwise:
//   exercise(A_DEX, TRUE)            -> rn2(19)
//   rnl(35) < avrg_attrib + (martial() ? ACURR(A_DEX) : 0)  -> break the door
// On a break (non-trapped), STR>18 && !rn2(5) shatters, else it crashes open;
// either way exercise(A_STR, TRUE) -> rn2(19).  A shop door never shatters but
// the rn2(5) is still drawn: C evaluates `!shopdoor` last in that &&-chain.
export async function kick_door(x, y, avrg_attrib) {
    const maploc = game.level?.at(x, y);
    const dm = maploc.doormask;
    if (dm === D_ISOPEN || dm === D_BROKEN || dm === D_NODOOR) {
        await kick_dumb(x, y);
        return; /* uses a turn */
    }
    // C ref: dokick.c — "not enough leverage to kick open doors while
    // levitating": the kick hits the door and hurts, which is a different RNG
    // shape entirely (kick_ouch's exercise/rn2(3)/rnd()) from the exercise +
    // rnl(35) below.
    if (Levitation()) {
        await kick_ouch(x, y, '', maploc);
        return;
    }
    exercise(A_DEX, true); // -> rn2(19)
    // doorbuster (Upolyd giant) is false; a martial hero (monk/samurai) gets a
    // +ACURR(A_DEX) bonus to the break threshold, so include it faithfully.
    if (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX))) {
        // C: `*in_rooms(x, y, SHOPBASE) ? TRUE : FALSE` — the FIRST room letter,
        // not the buffer.  shkroom.js's in_rooms() returns an array, and an
        // empty array is truthy in JS, so the [0] is load-bearing: without it
        // every door counts as a shop door and never shatters.
        const shopdoor = in_rooms(x, y, SHOPBASE)[0] ? true : false;
        if (dm & D_TRAPPED) {
            await pline('You kick the door.');
            exercise(A_STR, false);
            maploc.doormask = D_NODOOR;
            await b_trapped('door', true); // FOOT != NO_PART
        } else if (ACURR(A_STR) > 18 && rn2(5) === 0 && !shopdoor) {
            await pline('As you kick the door, it shatters to pieces!');
            exercise(A_STR, true);
            maploc.doormask = D_NODOOR;
        } else {
            await pline('As you kick the door, it crashes open!');
            exercise(A_STR, true); // -> rn2(19)
            maploc.doormask = D_BROKEN;
        }
        // C ref: dokick.c:951-952 feel_newsym(x,y); recalc_block_point(x,y) —
        // the broken/gone door is now transparent, so re-run vision (reveals
        // whatever lies beyond the doorway).
        newsym(x, y);
        recalc_block_point(x, y);
        // NOT PORTED: add_damage(x, y, SHOP_DOOR_COST) + pay_for_damage("break")
        // for a shop door — shk.c's damage list has no counterpart here.
        if (in_town(x, y)) await get_iter_mons(watchman_thief_arrest);
    } else {
        // feel_location(x, y) when Blind: no RNG.
        exercise(A_STR, true);
        // C ref: dokick.c:966 pline("%s!!", (Deaf || !rn2(3)) ? "Thwack" :
        // "Whammm") — Thwack when rn2(3)==0 (or Deaf), else Whammm.
        await pline(`${(Deaf() || rn2(3) === 0) ? 'Thwack' : 'Whammm'}!!`);
        if (in_town(x, y)) await get_iter_mons_xy(watchman_door_damage, x, y);
    }
    // C ref: topl.c — pline() leaves the message unacknowledged
    // (toplin = TOPLINE_NEED_MORE).  A turn-consuming kick is followed by the
    // monster-move pass, whose first pline must page the kick message with
    // --More-- when the two won't fit on one top line.
    game._toplin = 1;
}

// C ref: trap.c fall_through(FALSE, 0) as reached from kick_nondoor()'s throne
// arm — the floor under the throne gives way.  The hero is known to be
// non-levitating (the throne arm returns early otherwise) and the dungeon's
// bottom level was checked by the caller, so what remains of C's guard chain is
// u.ustuck / Flying / pet-adjacency, none of which hold for a hero standing on
// a throne kicking it.  C finishes with schedule_goto(), which the moveloop
// turns into goto_level() on its next pass; do.js's other falling call sites
// call goto_level() directly, so this does too.  No RNG of its own.
async function fall_through_throne() {
    const u = game.u;
    await pline(`The ${surface(u.ux, u.uy)} opens up under you!`);
    await goto_level({ dnum: u.uz.dnum, dlevel: u.uz.dlevel + 1 }, false, true, false);
}

// C ref: potion.c sink_backs_up(x, y) — potion.js keeps the dosink() copy; this
// is the dokick.c caller's.  mkobj_at() draws when the ring appears.
async function sink_backs_up(x, y) {
    const loc = game.level?.at(x, y);
    await pline(!Deaf()
        ? (!Blind() ? 'Flupp!  Muddy waste pops up from the drain.'
                    : 'Flupp!  You hear a sloshing sound.')
        : `Something splashes you in the ${body_part(FACE)}.`);
    if ((((loc?.looted) | 0) & S_LRING) === 0) {
        if (!Blind()) await pline('You see a ring shining in its midst.');
        mkobj_at(RING_CLASS, x, y, true);
        newsym(x, y);
        exercise(A_DEX, true);
        exercise(A_WIS, true);
        if (loc) loc.looted = ((loc.looted) | 0) | S_LRING;
    }
}

// C ref: dokick.c kick_nondoor(x, y, avrg_attrib) — every kickable terrain that
// is not a door.  The order of the tests is C's; each arm returns ECMD_TIME.
export async function kick_nondoor(x, y, avrg_attrib) {
    const maploc = game.level?.at(x, y);

    if (maploc.typ === SDOOR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(maploc); /* ->typ = DOOR */
            // don't "kick open" when it's locked unless it's also trapped
            await pline(`Crash!  ${((maploc.doormask & (D_LOCKED | D_TRAPPED)) === D_LOCKED)
                ? 'Your kick uncovers' : 'You kick open'} a secret door!`);
            exercise(A_DEX, true);
            if (maploc.doormask & D_TRAPPED) {
                maploc.doormask = D_NODOOR;
                await b_trapped('door', true);
            } else if (maploc.doormask !== D_NODOOR
                       && !(maploc.doormask & D_LOCKED)) {
                maploc.doormask = D_ISOPEN;
            }
            newsym(x, y); /* feel_newsym: we know it's gone */
            if (maploc.doormask === D_ISOPEN || maploc.doormask === D_NODOOR)
                unblock_point(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (maploc.typ === SCORR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            await pline('Crash!  You kick open a secret passage!');
            exercise(A_DEX, true);
            maploc.typ = CORR;
            newsym(x, y);
            unblock_point(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (IS_THRONE(maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if ((Luck() < 0 || maploc.looted) && !rn2(3)) {
            maploc.looted = 0; /* don't leave loose ends.. */
            maploc.typ = ROOM;
            mkgold(rnd(200), x, y);
            if (Blind()) {
                await pline('CRASH!  You destroy it.');
            } else {
                await pline('CRASH!  You destroy the throne.');
                newsym(x, y);
            }
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (Luck() > 0 && !rn2(3) && !maploc.looted) {
            mkgold(rn1(201, 300), x, y);
            let i = Luck() + 1;
            if (i > 6) i = 6;
            while (i--)
                mksobj_at(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1), x, y,
                          false, true);
            if (Blind()) {
                await pline('You kick something loose!');
            } else {
                await pline('You kick loose some ornamental coins and gems!');
                newsym(x, y);
            }
            maploc.looted = T_LOOTED; /* prevent endless milking */
            return ECMD_TIME;
        } else if (!rn2(4)) {
            const uz = game.u.uz;
            if (uz.dlevel < dunlevs_in_dungeon(uz)) {
                await fall_through_throne();
                return ECMD_TIME;
            }
            await kick_ouch(x, y, '', maploc);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (IS_ALTAR(maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await pline(`You kick ${Blind() ? 'something' : 'the altar'}.`);
        await altar_wrath(x, y);
        if (!rn2(3)) {
            await kick_ouch(x, y, '', maploc);
            return ECMD_TIME;
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_FOUNTAIN(maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await pline(`You kick ${Blind() ? 'something' : 'the fountain'}.`);
        if (!rn2(3)) {
            await kick_ouch(x, y, '', maploc);
            return ECMD_TIME;
        }
        /* make metal boots rust */
        if (game.uarmf && rn2(3)) {
            if (await water_damage(game.uarmf, 'metal boots', true) === ER_NOTHING)
                await pline('Your boots get wet.');
            /* could cause short-lived fumbling here */
        }
        exercise(A_DEX, true);
        return ECMD_TIME;
    }
    if (IS_GRAVE(maploc.typ)) {
        if (Levitation()) {
            await kick_dumb(x, y);
        } else if (rn2(4)) {
            await kick_ouch(x, y, '', maploc); /* minor injury */
        } else if (!maploc.disturbed && !rn2(2)) {
            /* summon a ghoul (once only), same as when engraving */
            await disturb_grave(x, y);
        } else {
            /* destroy the headstone */
            exercise(A_WIS, false);
            const u = game.u;
            // Role_if(PM_ARCHEOLOGIST) / Role_if(PM_SAMURAI) — compared on
            // roles[].mnum, the same handle martial() uses.
            const mnum = game.urole?.mnum;
            if (mnum === PM_ARCHEOLOGIST || mnum === PM_SAMURAI
                || ((u?.ualign?.type ?? 0) === A_LAWFUL
                    && (u?.ualign?.record ?? 0) > -10))
                adjalign(-Math.sign(u?.ualign?.type ?? 0));
            maploc.typ = ROOM;
            maploc.emptygrave = 0; /* clear 'flags' */
            maploc.disturbed = 0;  /* clear 'horizontal' */
            mksobj_at(ROCK, x, y, true, false);
            del_engr_at(x, y);
            if (Blind()) {
                await pline('Crack!  Something broke!');
            } else {
                await pline('The headstone topples over and breaks!');
                newsym(x, y);
            }
        }
        return ECMD_TIME;
    }
    if (maploc.typ === IRONBARS) {
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (IS_TREE(maploc.typ)) {
        /* nothing, fruit or trouble? 75:23.5:1.5% */
        if (rn2(3)) {
            if (!rn2(6) && !species_gone('killer bee'))
                await pline('You hear a low buzzing.'); /* a warning */
            await kick_ouch(x, y, '', maploc);
            return ECMD_TIME;
        }
        // NOT PORTED: the fruit arm — `rn2(15) && !(looted & TREE_LOOTED)
        // && (treefruit = rnd_treefruit_at(x,y))` ends in scatter() (explode.c),
        // which this port does not have.  Falling into the swarm arm below is C's
        // own else-branch, and it is the arm a picked (TREE_LOOTED) tree takes.
        if (!(maploc.looted & TREE_SWARM)) {
            let cnt = rnl(4) + 2;
            let made = 0;
            let mm = { x, y };
            const ptr = monster_by_pmidx(name_to_pmidx('killer bee'));
            while (cnt--) {
                const spot = enexto_spawn(mm.x, mm.y, ptr);
                if (spot) {
                    mm = spot;
                    if (makemon(ptr, mm.x, mm.y, MM_ANGRY | MM_NOMSG)) made++;
                }
            }
            if (made) await pline("You've attracted the tree's former occupants!");
            else await pline('You smell stale honey.');
            maploc.looted = (maploc.looted | 0) | TREE_SWARM;
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (IS_SINK(maploc.typ)) {
        const gend = poly_gender();

        if (Levitation()) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        if (rn2(5)) {
            await pline(Deaf() ? 'Klunk!' : 'Klunk!  The pipes vibrate noisily.');
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!(maploc.looted & S_LPUDDING) && !rn2(3)
                   && !species_gone('black pudding')) {
            if (Blind()) {
                if (!Deaf()) await pline('You hear a gushing sound.');
            } else {
                await pline('A black ooze gushes up from the drain!');
            }
            makemon(monster_by_pmidx(name_to_pmidx('black pudding')), x, y, MM_NOMSG);
            exercise(A_DEX, true);
            newsym(x, y);
            maploc.looted = (maploc.looted | 0) | S_LPUDDING;
            return ECMD_TIME;
        } else if (!(maploc.looted & S_LDWASHER) && !rn2(3)
                   && !species_gone('amorous demon')) {
            /* can't resist... */
            await pline(`${Blind() ? 'Something' : 'The dish washer'} returns!`);
            const male = (gend === 1 || (gend === 2 && rn2(2)));
            if (makemon(monster_by_pmidx(name_to_pmidx('amorous demon')), x, y,
                        MM_NOMSG | (male ? MM_MALE : MM_FEMALE)))
                newsym(x, y);
            maploc.looted = (maploc.looted | 0) | S_LDWASHER;
            exercise(A_DEX, true);
            return ECMD_TIME;
        } else if (!rn2(3)) {
            await sink_backs_up(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    if (maploc.typ === STAIRS || maploc.typ === LADDER
        || IS_STWALL(maploc.typ)) {
        if (!IS_STWALL(maploc.typ) && maploc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, '', maploc);
        return ECMD_TIME;
    }
    await kick_dumb(x, y);
    return ECMD_TIME;
}

// ── kicking a monster (C ref: dokick.c:29-296) ────────────────────────────
// C ref: dokick.c:30.
const kick_passes_thru = 'kick passes harmlessly through';
// C ref: mondata.h thick_skinned/haseyes/is_flyer/is_floater/can_teleport.
const thick_skinned = (p) => (mflags1_of(p) & M1_THICK_HIDE) !== 0;
const haseyes = (p) => (mflags1_of(p) & M1_NOEYES) === 0;
const is_flyer = (p) => (mflags1_of(p) & M1_FLY) !== 0;
const can_teleport = (p) => (mflags1_of(p) & M1_TPORT) !== 0;
const S_EYE_K = 5, S_LIGHT_K = 25, S_EEL_K = 57;   // defsym.h MONSYM indices
const is_floater = (p) => p?.mcls === S_EYE_K || p?.mcls === S_LIGHT_K;
// C ref: mondata.h bigmonst(ptr) == msize >= MZ_LARGE.
const bigmonst_k = (p) => (p?.msize ?? 2 /*MZ_MEDIUM*/) >= 3 /*MZ_LARGE*/;
const is_shade = (p) => p?.name === 'shade';
// C ref: objects.h ARMOR()'s `blk` (oc_bulky) field for ARM_SUIT rows — the
// five heavy suits plus every dragon-scale suit (DRGN_ARMR passes blk=1).
const OC_BULKY_SUIT = (otyp) => otyp >= 101 /*GRAY_DRAGON_SCALE_MAIL*/
    && otyp <= 125 /*BANDED_MAIL*/;
// C ref: youprop.h Fumbling == (HFumbling || EFumbling).
function Fumbling() { return !!((game.u?.HFumbling || 0) || (game.u?.EFumbling || 0)); }

// C ref: mon.c:3999 maybe_mnexto(mtmp) — mnexto() restricted to a square the
// hero could see; draws no RNG (enexto's scan is deterministic).
async function maybe_mnexto(mtmp) {
    const ptr = mtmp.data;
    const diagok = ptr?.name !== 'grid bug';
    for (let tryct = 20; tryct > 0; tryct--) {
        const mm = enexto_spawn(game.u.ux, game.u.uy, ptr);
        if (!mm) return;
        if (couldsee(mm.x, mm.y)
            && (diagok || mm.x === mtmp.mx || mm.y === mtmp.my)) {
            await rloc_to(mtmp, mm.x, mm.y);
            return;
        }
    }
}

// C ref: dokick.c:33 kickdmg(mon, clumsy) — damage for a kick by a hero who is
// not polymorphed into something with an AT_KICK attack.
async function kickdmg(mon, clumsy) {
    let dmg = Math.trunc((ACURRSTR() + ACURR(A_DEX) + ACURR(A_CON)) / 15);
    let trapkilled = false;

    if (game.uarmf && game.uarmf.otyp === KICKING_BOOTS) dmg += 5;
    /* excessive wt affects dex, so it affects dmg */
    if (clumsy) dmg = Math.trunc(dmg / 2);
    /* kicking a dragon or an elephant will not harm it */
    if (thick_skinned(mon.data)) dmg = 0;
    if (is_shade(mon.data)) dmg = 0;

    // C: special_dmgval(&gy.youmonst, mon, W_ARMF, NULL).  which_armor() walks
    // the wearer's minvent, which for the hero is gi.invent.
    const specialdmg = special_dmgval({ minvent: game.invent || [] },
                                      mon, W_ARMF).bonus;

    if (is_shade(mon.data) && !specialdmg) {
        await pline(`The ${kick_passes_thru}.`);
        /* doesn't exercise skill or abuse alignment or frighten pet,
           and shades have no passive counterattack */
        return;
    }

    if (mon.m_ap_type) seemimic(mon);
    await check_caitiff(mon);

    /* squeeze some guilt feelings... */
    if (mon.mtame) {
        await abuse_dog(mon);
        if (mon.mtame) monflee(mon, dmg ? rnd(dmg) : 1, false, false);
        else mon.mflee = 0;
    }

    if (dmg > 0) {
        /* convert potential damage to actual damage */
        dmg = rnd(dmg);
        if (martial()) dmg += rn2(Math.trunc(ACURR(A_DEX) / 2) + 1);
        /* a good kick exercises your dex */
        exercise(A_DEX, true);
    }
    dmg += specialdmg;                        /* blessed/silver boots */
    if (game.uarmf) dmg += (game.uarmf.spe | 0);
    dmg += (game.u.udaminc | 0);              /* ring(s) of increase damage */
    if (dmg > 0) mon.mhp -= dmg;

    if (!DEADMONSTER(mon) && martial() && !bigmonst_k(mon.data) && !rn2(3)
        && mon.mcanmove && mon !== game.u.ustuck && !mon.mtrapped) {
        /* see if the monster has a place to move into */
        const mdx = mon.mx + game.u.dx, mdy = mon.my + game.u.dy;
        if (isok(mdx, mdy) && goodpos(mdx, mdy, mon, 0)) {
            await pline(`${Monnam(mon)} reels from the blow.`);
            if (m_in_out_region(mon, mdx, mdy)) {
                const ox = mon.mx, oy = mon.my;
                mon.mx = mdx; mon.my = mdy;
                newsym(ox, oy);
                newsym(mdx, mdy);
                set_apparxy(mon);
                // NOT PORTED: mintrap(mon, NO_TRAP_FLAGS) — a monster shoved
                // onto a trap does not spring it here (nothing else in this
                // port calls mintrap either).
            }
        }
    }

    await passive(mon, game.uarmf, true, !DEADMONSTER(mon), AT_KICK);
    if (DEADMONSTER(mon) && !trapkilled) await killed(mon);
    /* use_skill(kick_skill, 1): skill training draws no RNG */
}

// C ref: dokick.c:127 maybe_kick_monster(mon, x, y) — the kick can be halted by
// a hidden monster's discovery, by declining to attack a peaceful, or by
// passing out from encumbrance.  Returns FALSE when the kick is called off.
async function maybe_kick_monster(mon, x, y) {
    if (!mon) return false;
    game.context = game.context || {};
    const save_forcefight = game.context.forcefight;
    game.bhitpos = { x, y };
    if (!mon.mpeaceful || !canspotmon(mon))
        game.context.forcefight = true; /* attack even if invisible */
    const halted = (await attack_checks(mon)) || (await overexertion());
    game.context.forcefight = save_forcefight;
    return !halted;
}

// C ref: dokick.c:146 kick_monster(mon, x, y).
async function kick_monster(mon, x, y) {
    let clumsy = false;

    /* anger target even if wild miss will occur */
    await setmangry(mon, true);

    if (Levitation() && !rn2(3) && verysmall(mon.data) && !is_flyer(mon.data)) {
        await pline('Floating in the air, you miss wildly!');
        exercise(A_DEX, false);
        await passive(mon, game.uarmf, false, 1, AT_KICK);
        return;
    }

    /* reveal hidden target even if kick ends up missing */
    if (mon.mundetected || (mon.m_ap_type && mon.m_ap_type !== 'mon')) {
        if (mon.m_ap_type) seemimic(mon);
        mon.mundetected = 0;
        if (!canspotmon(mon)) map_invisible(x, y);
        else newsym(x, y);
        await pline(`There is ${canspotmon(mon) ? a_monnam(mon) : 'something hidden'} here.`);
    }

    // NOT PORTED: the Upolyd AT_KICK branch (dokick.c:190) — find_roll_to_hit()
    // and damageum() belong to uhitm.c and no recorded session polymorphs.

    /* over 70% of carrying capacity: a "deal no damage" check, then a
       "clumsy kick" check */
    // C: `i = -inv_weight(); j = weight_cap();`.  inv_weight() stashes the
    // freshly computed capacity in game._wc (C's gw.wc), so read it from there
    // rather than recomputing.
    const i = -inv_weight(), j = game._wc | 0;
    let doit = false;
    if (i < Math.trunc((j * 3) / 10)) {
        if (!rn2((i < Math.trunc(j / 10)) ? 2 : (i < Math.trunc(j / 5)) ? 3 : 4)) {
            if (martial()) {
                doit = true;
            } else {
                await pline('Your clumsy kick does no damage.');
                await passive(mon, game.uarmf, false, 1, AT_KICK);
                return;
            }
        }
        if (!doit) {
            if (i < Math.trunc(j / 10)) clumsy = true;
            else if (!rn2((i < Math.trunc(j / 5)) ? 2 : 3)) clumsy = true;
        }
    }
    if (!doit) {
        if (Fumbling()) clumsy = true;
        else if (game.uarm && OC_BULKY_SUIT(game.uarm.otyp)
                 && ACURR(A_DEX) < rnd(25)) clumsy = true;
    }
    /* doit: */
    await pline(`You kick ${mon_nam(mon)}.`);
    if (!rn2(clumsy ? 3 : 4) && (clumsy || !bigmonst_k(mon.data))
        && mon.mcansee && !mon.mtrapped && !thick_skinned(mon.data)
        && mon.data?.mcls !== S_EEL_K && haseyes(mon.data) && mon.mcanmove
        && !mon.mstun && !mon.mconf && !mon.msleeping
        && (mon.data?.mmove ?? 0) >= 12) {
        if (!nohands(mon.data) && !rn2(martial() ? 5 : 3)) {
            await pline(`${Monnam(mon)} blocks your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, game.uarmf, false, 1, AT_KICK);
            return;
        }
        await maybe_mnexto(mon);
        if (mon.mx !== x || mon.my !== y) {
            unmap_invisible(x, y);
            const verb = (can_teleport(mon.data) && !noteleport_level(mon)) ? 'teleports'
                : is_floater(mon.data) ? 'floats'
                : is_flyer(mon.data) ? 'swoops'
                : (nolimbs(mon.data) || slithy(mon.data)) ? 'slides' : 'jumps';
            await pline(`${Monnam(mon)} ${verb}, ${clumsy ? 'easily' : 'nimbly'
                } evading your ${clumsy ? 'clumsy ' : ''}kick.`);
            await passive(mon, game.uarmf, false, 1, AT_KICK);
            return;
        }
    }
    await kickdmg(mon, clumsy);
}

// C ref: dokick.c dokick() — the ^D kick command.  Returns ECMD_TIME (1) when a
// game turn elapses, 0 otherwise.
export async function dokick() {
    const u = game.u;
    let no_kick = false;

    // C ref: dokick.c:1262 — the pre-direction refusals.  Every one of these
    // returns ECMD_FAIL *without* calling getdir(), so the direction key the
    // player types next falls through to rhack() as its own command; reading it
    // as a direction (as the old inline port did) shifts every later keystroke.
    // Wounded_legs is the one that actually fires: kick_ouch()'s !rn2(3) and
    // kick_dumb()'s "strain a muscle" both set it, so a hero who keeps kicking
    // a wall gets refused for the next 5..10 turns.
    const ydata = game.youmonst?.data;
    if (ydata && (nolimbs(ydata) || slithy(ydata))) {
        await pline('You have no legs to kick with.');
        no_kick = true;
    } else if (ydata && verysmall(ydata)) {
        await pline('You are too small to do any kicking.');
        no_kick = true;
    } else if (u.usteed) {
        // C ref: dokick.c:1271 — yn_function("Kick your steed?", ynchars, 'y').
        // The prompt is what consumes the next keystroke; skipping it (as the
        // old inline port did, by falling straight into getdir) reads the
        // answer as a direction.
        if (await y_n('Kick your steed?', 'yn\x1b', 'y') === 'y') {
            await pline(`You kick ${mon_nam(u.usteed)}.`);
            // NOT PORTED: steed.c kick_steed() — its dismount_steed(
            // DISMOUNT_THROWN) leaf has no counterpart here (see `deferred`).
            return ECMD_TIME;
        }
        return ECMD_OK;
    } else if (Wounded_legs()) {
        // C ref: do.c legs_in_no_shape("kicking", FALSE) — the side that was
        // wounded is named ("left "/"right ") unless both are, and the verb
        // agrees with the (possibly pluralised) body part.
        const wl = (u.EWounded_legs || 0) & BOTH_SIDES;
        const bp = wl === BOTH_SIDES ? makeplural(body_part(LEG)) : body_part(LEG);
        const side = wl === LEFT_SIDE ? 'left ' : wl === RIGHT_SIDE ? 'right ' : '';
        await pline(`Your ${side}${bp} ${wl === BOTH_SIDES ? 'are' : 'is'}`
                    + ' in no shape for kicking.');
        no_kick = true;
    } else if (near_capacity() > SLT_ENCUMBER) {
        await pline('Your load is too heavy to balance yourself for a kick.');
        no_kick = true;
    } else if (ydata && ydata.mcls === S_LIZARD) {
        await pline('Your legs cannot kick effectively.');
        no_kick = true;
    } else if (u.uinwater && !rn2(2)) {
        await pline("Your slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (u.utrap) {
        no_kick = true;
        switch (u.utraptype) {
        case TT_PIT:
            if (!Passes_walls())
                await pline("There's not enough room to kick down here.");
            else
                no_kick = false;
            break;
        case TT_WEB:
        case TT_BEARTRAP:
            await pline(`You can't move your ${body_part(LEG)}!`);
            break;
        default:
            break;
        }
    } else if (sobj_at(BOULDER, u.ux, u.uy) && !Passes_walls()) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        // C ref: dokick.c:1312 — display_nhwindow(WIN_MESSAGE, TRUE), which is
        // tty_display_nhwindow()'s `if (toplin == TOPLINE_NEED_MORE) more()`:
        // the refusal is acknowledged before the next command is read, so the
        // direction the player typed ahead is not silently eaten.  Every
        // refusal above went through pline(), which in C leaves toplin ==
        // NEED_MORE; this port records that as _toplinSoft (see display.js
        // pline()), so both markers have to be consulted here.
        const soft = !!game._pending_message
                     && game._toplinSoft === game._pending_message;
        if (game._toplin === 1 || soft) {
            await topl_more();
            game._toplin = 0;
            game._toplinSoft = null;
            game._pending_message = '';
        }
        return ECMD_FAIL;
    }

    const dir = await getdir();
    if (!dir) return ECMD_CANCEL;               // ESC
    if (!dir.dx && !dir.dy) return ECMD_CANCEL; // self / '.'

    const x = u.ux + dir.dx, y = u.uy + dir.dy;
    u.dx = dir.dx; u.dy = dir.dy;

    // C ref: dokick.c:1325 — record the kicked square so a peaceful/tame
    // monster avoids stepping onto it for this turn's monster-move phase
    // (m_avoid_kicked_loc).  Cleared by the next hero action (rhack/domove).
    game.kickedloc = { x, y };

    // C ref: dokick.c:1327 — "KMH -- Kicking boots always succeed": the boots
    // REPLACE the attribute average with 99 rather than adding to it, so a
    // booted hero's kick_door() rnl(35) comparison is effectively always true.
    const avrg_attrib = (game.uarmf && game.uarmf.otyp === KICKING_BOOTS)
        ? 99
        : Math.trunc((ACURRSTR() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    // C ref: dokick.c:1332 — a swallowed hero kicks the inside of the engulfer:
    // one rn2(3) and the turn is spent.
    if (u.uswallow) {
        const r = rn2(3);
        if (r === 0) await pline(`You can't move your ${body_part(LEG)}!`);
        else if (r === 1 && u.ustuck && attacktype(u.ustuck.data, AT_ENGL))
            await pline(`${Monnam(u.ustuck)} burps loudly.`);
        else await pline('Your feeble kick has no effect.');
        return ECMD_TIME;
    } else if (u.utrap && u.utraptype === TT_PIT) {
        /* must be Passes_walls */
        await pline('You kick at the side of the pit.');
        return ECMD_TIME;
    }
    // C ref: dokick.c:1348 — Levitation without anything to brace against
    // aborts the kick with no turn (ECMD_OK) and, crucially, no RNG at all.
    if (Levitation()) {
        const xx = u.ux - dir.dx, yy = u.uy - dir.dy;
        const bt = isok(xx, yy) ? game.level?.at(xx, yy) : null;
        if (bt && !IS_OBSTRUCTED(bt.typ) && !IS_DOOR(bt.typ)) {
            await pline('You have nothing to brace yourself against.');
            return ECMD_OK;
        }
    }

    const mtmp = isok(x, y) ? m_at(x, y) : null;
    // C ref: dokick.c:1377-1381 — the kick may be called off by attack_checks()
    // (hidden monster revealed / peaceful declined) or by overexertion().
    if (mtmp) {
        if (!(await maybe_kick_monster(mtmp, x, y)))
            return game.context?.move ? ECMD_TIME : ECMD_OK;
    }

    // C ref: dokick.c:1383-1384 — the noise of the kick wakes everything within
    // ulevel*20 (squared) and scuffs any engraving under the hero.
    await wake_nearby(false);
    u_wipe_engr(2);

    // C ref: dokick.c:1406-1441 — monsters come first of the five square tests.
    if (mtmp) {
        await kick_monster(mtmp, x, y);
        if (!DEADMONSTER(mtmp) && !canspotmon(mtmp)
            && mtmp.mx === x && mtmp.my === y
            && !glyph_is_invisible(x, y)
            && !(game.u?.uswallow && game.u?.ustuck === mtmp))
            map_invisible(x, y);
        // NOT PORTED: the Is_airlevel/Levitation hurtle() recoil (dokick.c:1428);
        // hurtle() has no counterpart here.  It draws no RNG.
        return ECMD_TIME;
    }

    if (!isok(x, y)) {
        await kick_ouch(x, y, '', null); /* gm.maploc = &gn.nowhere */
        return ECMD_TIME;
    }
    const maploc = game.level?.at(x, y);

    unmap_invisible(x, y);
    // C ref: dokick.c:1441 — `(is_pool(x,y) || typ == LAVAWALL) ^ !!u.uinwater`:
    // objects normally can't be removed from water by kicking.
    if ((IS_POOL(maploc.typ) || maploc.typ === LAVAWALL) !== !!u.uinwater) {
        await pline(`You splash some ${hliquid(IS_POOL(maploc.typ) ? 'water' : 'lava')} around.`);
        /* pretend the kick is fast enough for lava not to burn */
        return ECMD_TIME;
    }

    // NOT PORTED: the OBJ_AT(x,y) arm (kick_object -> really_kick_object).
    // Terrain handling below is C's and is unaffected by that gap.

    if (IS_DOOR(maploc.typ)) {
        await kick_door(x, y, avrg_attrib);
        return ECMD_TIME;
    }
    return await kick_nondoor(x, y, avrg_attrib);
}

// C ref: mondata.h slithy(ptr) — read off the generated flag table.  nolimbs()
// is monflags_data.js's own export and verysmall() is a precomputed column on
// the permonst (msize < MZ_SMALL); permonst rows carry no `mflags1` field, so a
// direct `ptr.mflags1 & M1_x` test silently answers FALSE for every species.
function slithy(ptr) { return (mflags1_of(ptr) & M1_SLITHY) !== 0; }
function verysmall(ptr) { return !!ptr?.verysmall; }

/* ------------------------------------------------------------------ *
 * Objects falling to the level below.  down_gate()/drop_to() are the  *
 * two members of this family whose inputs all exist here; their       *
 * callers (impact_drop / ship_object) need add_to_migration(), which  *
 * this port does not have.                                            *
 * ------------------------------------------------------------------ */

// C ref: stairs.c stairway_at(x, y) — do.js/dig.js/display.js each keep a copy.
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: quest.c ok_to_quest() — `((got_quest || got_thanks) && is_pure() > 0)
// || killed_leader`.  questpgr.js tracks got_quest; the other two flags have no
// counterpart, and neither can be true before got_quest is.
function ok_to_quest() { return !!game._quest_got_quest; }

// C ref: dokick.c down_gate(x, y) — the migration destination code for objects
// that fall off this square, plus the "down the stairs"/"through the hole" tail
// (gg.gate_str) that otransit_msg()/impact_drop() print.  No RNG.
export function down_gate(x, y) {
    const stway = stairway_at(x, y);
    const uz = game.u?.uz;
    const q = game.qstart_level;

    game.gate_str = null;
    /* this matches the player restriction in goto_level() */
    if (q && uz && uz.dnum === q.dnum && uz.dlevel === q.dlevel && !ok_to_quest())
        return MIGR_NOWHERE;
    if (stway && !stway.up && !stway.isladder) {
        game.gate_str = 'down the stairs';
        return (stway.tolev.dnum === uz.dnum) ? MIGR_STAIRS_UP : MIGR_SSTAIRS;
    }
    if (stway && !stway.up && stway.isladder) {
        game.gate_str = 'down the ladder';
        return MIGR_LADDER_UP;
    }
    /* hole will always be flagged as seen; trap door might or might not */
    const ttmp = t_at(x, y);
    if (ttmp && ttmp.tseen && (ttmp.ttyp === TRAPDOOR || ttmp.ttyp === HOLE)) {
        game.gate_str = (ttmp.ttyp === TRAPDOOR) ? 'through the trap door'
                                                 : 'through the hole';
        return MIGR_RANDOM;
    }
    return MIGR_NOWHERE;
}

// C ref: dokick.c drop_to(cc, loc, x, y) — turn a down_gate() code into the
// (dnum, dlevel) an object migrates to.  cc.y == 0 means "nowhere".  No RNG.
export function drop_to(cc, loc, x, y) {
    const stway = stairway_at(x, y);
    const uz = game.u.uz;

    /* cover all the MIGR_xxx choices generated by down_gate() */
    switch (loc) {
    case MIGR_RANDOM: /* trap door or hole */
        if (Is_stronghold(uz)) {
            cc.x = game.valley_level?.dnum ?? 0;
            cc.y = game.valley_level?.dlevel ?? 0;
            break;
        } else if (In_endgame(uz) || Is_botlevel(uz)) {
            cc.y = cc.x = 0;
            break;
        }
        /* FALLTHRU */
    case MIGR_STAIRS_UP:
    case MIGR_LADDER_UP:
    case MIGR_SSTAIRS:
        if (stway) {
            cc.x = stway.tolev.dnum;
            cc.y = stway.tolev.dlevel;
        } else {
            cc.x = uz.dnum;
            cc.y = uz.dlevel + 1;
        }
        break;
    default:
    case MIGR_NOWHERE:
        /* y==0 means "nowhere", in which case x doesn't matter */
        cc.y = cc.x = 0;
        break;
    }
}

// C ref: dokick.c container_impact_dmg(obj, x, y) — a container is kicked,
// dropped, thrown or otherwise impacted; glass contents shatter and eggs crack.
// RNG: obj_resists(otmp, 33, 100) per glass item, rn2(3) per egg — in cobj
// order, which is why this must not be reordered.
export function container_impact_dmg(obj, x, y) {
    /* only consider normal containers */
    if (!obj || !Array.isArray(obj.cobj) || !obj.cobj.length) return;
    if (obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS) return;

    // costly/insider/frominv drive stolen_value() billing, which invent.js
    // stubs out; the loop's RNG and destruction are what matter here.
    void shop_keeper(in_rooms(x, y, SHOPBASE)[0]);
    let wchange = false;

    for (const otmp of [...obj.cobj]) {
        let result = null;

        if (objects[otmp.otyp]?.oc_material === GLASS
            && otmp.oclass !== GEM_CLASS && !obj_resists(otmp, 33, 100)) {
            result = 'shatter';
        } else if (otmp.otyp === EGG && !rn2(3)) {
            result = 'cracking';
        }
        if (result) {
            if (otmp.otyp === MIRROR) change_luck(-2);
            /* eggs laid by you: -1 per egg, but exactly 1 breaks */
            if (otmp.otyp === EGG && otmp.spe && otmp.corpsenm >= 0)
                change_luck(-1);
            if (otmp.quan > 1) {
                useup(otmp);
            } else {
                const i = obj.cobj.indexOf(otmp);
                if (i >= 0) obj.cobj.splice(i, 1);
            }
            obj.cknown = 0; /* contents no longer known */
            wchange = true;
        }
    }
    if (wchange) obj.owt = weight(obj);
}
