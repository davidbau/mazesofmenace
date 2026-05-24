// search.js — Trap / secret-door search (#search).
// C ref: detect.c dosearch(), dosearch0(int), find_trap(), mfind0(), cvt_sdoor_to_door();
//       trap.c activate_statue_trap(), seetrap(), feeltrap()
//
// Neighbor iteration and rnl/rn2 usage follow upstream; fund (artifact search,
// lenses) is stubbed until inventory and objects are wired.

import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { pline, newsym, feelLocation } from './display.js';
import { vision_recalc, cansee } from './vision.js';
import { exercise } from './attrib.js';
import {
    isok,
    u_at,
    SDOOR,
    SCORR,
    DOOR,
    CORR,
    D_CLOSED,
    D_LOCKED,
    STATUE_TRAP,
    ARROW_TRAP,
    DART_TRAP,
    ROCKTRAP,
    SQKY_BOARD,
    BEAR_TRAP,
    LANDMINE,
    ROLLING_BOULDER_TRAP,
    SLP_GAS_TRAP,
    RUST_TRAP,
    FIRE_TRAP,
    PIT,
    SPIKED_PIT,
    HOLE,
    TRAPDOOR,
    TELEP_TRAP,
    LEVEL_TELEP,
    MAGIC_PORTAL,
    WEB,
    MAGIC_TRAP,
    ANTI_MAGIC,
    POLY_TRAP,
    VIBRATING_SQUARE,
    TRAPPED_DOOR,
    TRAPPED_CHEST,
    A_WIS,
} from './const.js';

/** C: Luck-derived search bonus (artifact SPFX_SEARCH, lenses) — stub 0 for now. */
function fundSearchBonus() {
    let fund = 0;
    // TODO: uwep artifact spec_ability(SPFX_SEARCH) → uwep->spe
    // TODO: ublindf->otyp === LENSES && !Blind → fund += 2
    if (fund > 5) fund = 5;
    return fund;
}

function blindHero() {
    return !!(game.u?.ublind || (game.u?.timed?.blind ?? 0) > 0);
}

function visibleRegionAt(x, y) {
    void x;
    void y;
    // TODO: vision.c visible_region_at — affects feel_location when not Blind
    return false;
}

function mApType(mtmp) {
    // C: M_AP_TYPE(mtmp) — mimic / furniture disguise
    return (mtmp.m_ap_type ?? 0) !== 0;
}

/** C: mimic.c seemimic — clear disguise and refresh map. */
async function seemimic(mtmp) {
    mtmp.m_ap_type = 0;
    mtmp.mappearance = 0;
    newsym(mtmp.mx, mtmp.my);
}

function warningOf(mtmp) {
    // C: warning_of — prop.c / you.h; stub until warning port
    return !!(mtmp?.warn_of_mon || mtmp?.data?.warn_of_mon);
}

function canSpotMon(mtmp) {
    if (!mtmp) return false;
    if (mtmp.minvis) return false;
    return cansee(mtmp.mx, mtmp.my);
}

function senseMon(mtmp) {
    void mtmp;
    // TODO: telepathy / warn-of / sensemon
    return false;
}

function monsterCanHide(mtmp) {
    const d = mtmp?.data;
    if (d?.is_hider || d?.hides_under) return true;
    const mlet = mtmp.mlet ?? d?.mlet;
    if (mlet === 'e') return true; // S_EEL class letter in many permonst tables
    return !!(mtmp.is_hider || mtmp.hides_under);
}

function glyphIsInvisibleSquare(x, y) {
    const loc = game.level?.at(x, y);
    return loc?.disp_ch === 'I';
}

function mAt(x, y) {
    return game.level?.monsters?.find((m) => m.mx === x && m.my === y) ?? null;
}

/** C: detect.c mfind0 — reveal mimic or mundetected hider; returns -1, 0, or 1. */
async function mfind0(mtmp, viaWarning) {
    if (viaWarning && !warningOf(mtmp)) return -1;

    const x = mtmp.mx, y = mtmp.my;
    let found_something = false;

    if (mApType(mtmp)) {
        await seemimic(mtmp);
        found_something = true;
    } else {
        found_something = !canSpotMon(mtmp);
        if (mtmp.mundetected && monsterCanHide(mtmp)) {
            if (viaWarning && found_something) {
                await pline(
                    blindHero()
                        ? 'Your danger sense causes you to take a second to check nearby.'
                        : 'Your danger sense causes you to take a second look close by.',
                );
            }
            mtmp.mundetected = 0;
            found_something = true;
        }
        newsym(x, y);
    }

    if (!found_something) return 0;

    if (!canSpotMon(mtmp) && glyphIsInvisibleSquare(x, y)) return -1;

    if (!canSpotMon(mtmp)) await pline('You feel an unseen monster!');
    else if (!senseMon(mtmp)) {
        const who = mtmp.monnam || mtmp.data?.mname || 'monster';
        await pline(mtmp.mtame ? `You find ${who}.` : `You find a ${who}.`);
    }
    return 1;
}

/** C: trap.c t_at(x, y) — trap at map cell. */
export function tAt(x, y) {
    const traps = game.level?.traps;
    if (!traps?.length) return null;
    return traps.find((t) => t.tx === x && t.ty === y) ?? null;
}

export function delTrap(trap) {
    const traps = game.level?.traps;
    if (!traps) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

/** C: rm.c cvt_sdoor_to_door — secret door → normal door. */
function cvtSdoorToDoor(lev) {
    let newmask = lev.doormask ?? 0;
    if (!(newmask & D_LOCKED)) newmask |= D_CLOSED;
    lev.typ = DOOR;
    lev.doormask = newmask;
}

export function trapTypName(ttyp) {
    const names = {
        [ARROW_TRAP]: 'arrow trap',
        [DART_TRAP]: 'dart trap',
        [ROCKTRAP]: 'rock trap',
        [SQKY_BOARD]: 'squeaky board',
        [BEAR_TRAP]: 'bear trap',
        [LANDMINE]: 'land mine',
        [ROLLING_BOULDER_TRAP]: 'rolling boulder trap',
        [SLP_GAS_TRAP]: 'gas trap',
        [RUST_TRAP]: 'rust trap',
        [FIRE_TRAP]: 'fire trap',
        [PIT]: 'pit',
        [SPIKED_PIT]: 'spiked pit',
        [HOLE]: 'hole',
        [TRAPDOOR]: 'trap door',
        [TELEP_TRAP]: 'teleportation trap',
        [LEVEL_TELEP]: 'level teleporter',
        [MAGIC_PORTAL]: 'magic portal',
        [WEB]: 'web',
        [STATUE_TRAP]: 'statue trap',
        [MAGIC_TRAP]: 'magic trap',
        [ANTI_MAGIC]: 'anti-magic field',
        [POLY_TRAP]: 'polymorph trap',
        [VIBRATING_SQUARE]: 'vibrating square',
        [TRAPPED_DOOR]: 'trapped door',
        [TRAPPED_CHEST]: 'trapped chest',
    };
    return names[ttyp] || 'trap';
}

/** C: trap.c seetrap(trap) */
export function seetrap(trap) {
    if (!trap || trap.tseen) return;
    trap.tseen = 1;
    newsym(trap.tx, trap.ty);
}

/**
 * C: trap.c feeltrap(trap) — map_trap omitted until trap glyphs are full.
 */
export function feeltrap(trap) {
    if (!trap) return;
    trap.tseen = 1;
    newsym(trap.tx, trap.ty);
}

/** C: detect.c find_trap — mark seen, message. */
async function findTrap(trap) {
    seetrap(trap);
    exercise(A_WIS, true);
    const name = trapTypName(trap.ttyp);
    const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
    await pline(`You find ${article} ${name}.`);
}

/** C: trap.c activate_statue_trap — deltrap + animate; stub returns null (no monster). */
async function activateStatueTrap(trap, x, y) {
    delTrap(trap);
    newsym(x, y);
    vision_recalc(1);
    // TODO: trap.c animate_statue, sobj_at(STATUE), fail_reason / unique checks
    return null;
}

/**
 * C: dosearch() — wrapper; cmd.c #search.
 */
export async function dosearch() {
    await dosearch0(0);
}

/**
 * C: do.c cmd_safety_prevention + detect.c dosearch — block repeat search when
 * safe_wait and a hostile is adjacent (first **`s`** on seed0077 is 0 RNG).
 * @returns {Promise<boolean>} true when suppressed (ECMD_OK, no time).
 */
export async function dosearchCmdSafetyPreventionLikeC() {
    const g = game;
    if (g.flags?.safe_wait === false) return false;
    if (g.iflags?.menu_requested || (g.multi | 0)) return false;
    if (!monsterNearbySearchSafeWaitLikeC(g)) {
        if (g.context) g.context._alreadyFoundSearchFlagLikeC = 0;
        return false;
    }
    g.context = g.context || {};
    const ctr = g.context._alreadyFoundSearchFlagLikeC | 0;
    g.context._alreadyFoundSearchFlagLikeC = ctr + 1;
    let suffix = '';
    if (g.iflags?.cmdassist !== false || !ctr) {
        suffix = "  Use 'm' prefix to force another search.";
    }
    await pline(`You already found a monster.${suffix}`);
    return true;
}

/** C: hack.c monster_nearby() subset for search safe_wait. */
function monsterNearbySearchSafeWaitLikeC(g) {
    const u = g.u;
    if (!u) return false;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    for (const mtmp of g.level?.monsters ?? []) {
        const x = mtmp.mx | 0;
        const y = mtmp.my | 0;
        if (Math.max(Math.abs(x - ux), Math.abs(y - uy)) !== 1) continue;
        if ((mtmp.mpeaceful | 0) || (mtmp.mtame | 0)) continue;
        if ((mtmp.m_ap_type | 0) !== 0) continue;
        return true;
    }
    return false;
}

/**
 * C: dosearch0(int aflag) — eight-neighbor search; aflag≠0 for auto-search.
 * @param {number} aflag
 */
export async function dosearch0(aflag) {
    const u = game.u;
    const lvl = game.level;
    if (!u || !lvl) return;

    if (u.uswallow) {
        if (!aflag) await pline('What are you looking for? The exit?');
        return;
    }

    const fund = fundSearchBonus();
    const Blind = blindHero();
    let reported = false;

    for (let x = u.ux - 1; x < u.ux + 2; x++) {
        for (let y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y)) continue;
            if (u_at(x, y)) continue;

            if (!aflag && (Blind || visibleRegionAt(x, y))) feelLocation(x, y);

            const loc = lvl.at(x, y);
            if (!loc) continue;

            if (loc.typ === SDOOR) {
                if (rnl(7 - fund)) continue;
                cvtSdoorToDoor(loc);
                vision_recalc(1);
                newsym(x, y);
                await pline('You find a hidden door.');
                reported = true;
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund)) continue;
                loc.typ = CORR;
                vision_recalc(1);
                newsym(x, y);
                await pline('You find a hidden passage.');
                reported = true;
            } else {
                const mtmp = mAt(x, y);
                if (mtmp && !aflag) {
                    const mfres = await mfind0(mtmp, 0);
                    if (mfres === -1) continue;
                    if (mfres > 0) return;
                }

                if (!aflag && !mtmp && !Blind) {
                    /* C: unmap_invisible(x, y); */
                }

                const trap = tAt(x, y);
                if (trap && !trap.tseen && !rnl(8)) {
                    if (trap.ttyp === STATUE_TRAP) {
                        await activateStatueTrap(trap, x, y);
                        reported = true;
                        return;
                    }
                    await findTrap(trap);
                    reported = true;
                }
            }
        }
    }

    if (!reported) await pline('You find no traps or secret doors.');
}
