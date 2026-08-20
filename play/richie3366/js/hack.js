// hack.js — Core hero damage / capacity helpers.
// C ref: hack.c — losehp, nomul, unmul, overexertion, moverock/dopush (and related).

import { game } from './gstate.js';
import {
    Upolyd, KILLED_BY, M_AP_FURNITURE, M_AP_OBJECT, M_AP_NOTHING,
    M_AP_TYPMASK, M_AP_TYPE, isok, u_at,
    IS_OBSTRUCTED, IRONBARS, IS_DOOR, IS_WALL, IS_TREE, IS_STWALL,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    NO_ROOM, SHARED, SHARED_PLUS, ROOMOFFSET, SHOPBASE, COLNO, ROWNO,
    is_pit, TEMPLE, OROOM, COURT, SWAMP, MORGUE, ZOO, BEEHIVE, BARRACKS,
    LEPREHALL, COCKNEST, ANTHOLE, DELPHI,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT,
    DB_LAVA, DB_ICE, STONE,
    ROOM, CORR, DOOR, SDOOR, TREE, ICE,
    xFLOOR, xGROUND, xOPENDOOR, xSHUTDOOR, xSWAMP, xSUBMERGED, xSEA,
    xWATERWALL,
    W_NONDIGGABLE, SHOP_DOOR_COST,
    IS_WATERWALL, PARANOID_SWIM, PARANOID_TRAP, PARANOID_CONFIRM, TIP_SWIM,
    TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    TRAP_CLEARLY_IMMUNE, TRAPNUM,
    xdir, ydir, N_DIRS,
    DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW, DIR_NE, DIR_SE, DIR_SW,
    OVERLOADED, SLT_ENCUMBER, HVY_ENCUMBER, Is_airlevel, Is_waterlevel,
    Is_earthlevel, Is_medusa_level, Is_juiblex_level,
    TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES, FIRE_RES,
    SLEEP_RES, DISINT_RES, TELEPORT_CONTROL, STEALTH, FAST, INVIS,
    INTRINSIC, UNCHANGING, PASSES_WALLS, WT_SQUEEZABLE_INV,
    In_mines, ACH_TOWN, NO_PART, WT_ELF, TIMER_OBJECT, ZOMBIFY_MON,
    NO_KILLER_PREFIX, IS_SINK, W_ARTI, I_SPECIAL, TIMEOUT, FROMOUTSIDE,
    FROMFORM, P_NONE, P_RIDING, P_BASIC, LEVITATION, FLYING, BLINDED, FOOT,
    ARTICLE_NONE, ARTICLE_A, ARTICLE_YOUR, SUPPRESS_SADDLE, has_mgivenname,
} from './const.js';
import {
    pline, Norep, newsym, canspotmon, canseemon, map_invisible, You_feel,
    set_msg_xy, feel_location, map_object,
} from './display.js';
import { gethungry, morehungry } from './eat.js';
import { m_at, hideunder } from './mon.js';
import { recalc_block_point } from './vision.js';
import { is_hider, hides_under, throws_rocks, noncorporeal, metallivorous, mons, is_flyer, verysmall, passes_bars, dmgtype } from './monsters.js';
import {
    objects_at, obj_extract_self, place_object, delobj,
    peek_timer, stop_timer, start_timer,
} from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { WEAPON_CLASS, TOOL_CLASS, COIN_CLASS } from './objects.js';
import { xname, the, The, makeplural } from './objnam.js';
import { oclass_to_sym } from './options.js';
import { A_STR, A_CON, A_DEX, acurr, exercise } from './attrib.js';
import { rn2, rnd, rn1 } from './rng.js';
import { midnight } from './calendar.js';
import {
    PM_GRID_BUG, PM_WIZARD, PM_ELF, PM_VALKYRIE, PM_SAMURAI,
} from './generated/monsters_data.js';
import { hliquid, Hallucination, y_monnam, x_monnam, type_is_pname } from './do_name.js';
import { near_capacity, inv_weight } from './invent.js';
import { record_achievement } from './insight.js';
import {
    b_trapped, selftouch, t_at, into_vs_onto, immune_to_trap, trapname,
    sokoban_guilt,
} from './trap.js';
import { paranoid_query } from './getline.js';

export { set_msg_xy };

/** C ref: decl.c dirs_ord — cardinals first. */
const DIRS_ORD = [
    DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW, DIR_NE, DIR_SE, DIR_SW,
];

const BOULDER = objectNames.indexOf('BOULDER');
/** C hack.h invlet_basic — a-zA-Z slots; overflow '#' is extra. */
const INVLET_BASIC = 52;
const CORPSE = objectNames.indexOf('CORPSE');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const RUBBER_HOSE = objectNames.indexOf('RUBBER_HOSE');
/** C materials.h LEATHER — is_flimsy ceiling (obj.h). */
const LEATHER = 7;
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: hack.c doorless_door — D_NODOOR / D_BROKEN only. */
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const m = loc.doormask || 0;
    return m === D_NODOOR || m === D_BROKEN;
}

/** C ref: hack.c closed_door — D_CLOSED | D_LOCKED. */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * Local t_at — trap.js imports hack.js, so avoid the cycle.
 * C ref: trap.c t_at.
 */
function t_at_local(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) return t;
    }
    return null;
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: do_name.c a_monnam — ARTICLE_A subtype name (uhitm local twin).
 * Hallu / invisible / named-pet arms deferred.
 */
function a_monnam(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const an = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${an} ${plain}`;
}

/**
 * C ref: hack.c cannot_push_msg — vain-push topline (no monster-behind).
 */
async function cannot_push_msg(otmp, sx, sy) {
    const what = `the ${xname(otmp)}`;
    if (game.u?.usteed) {
        await pline(`Your steed tries to move ${what}, but cannot.`);
    } else {
        await pline(`You try to move ${what}, but in vain.`);
    }
    // Blind feel_location deferred
}

/**
 * C youprop.h Passes_walls — H||E, no B.
 * C Sokoban ≡ level.flags.sokoban_rules (JS also mirrors game.Sokoban).
 */
function Passes_walls_prop() {
    const u = game.u || {};
    return !!_uprop_he_st(u, 'HPasses_walls', 'EPasses_walls', PASSES_WALLS);
}
function Sokoban_here() {
    return !!(game.Sokoban || game.level?.flags?.sokoban_rules);
}

/* C monattk.h — rust monster / gray ooze·pudding (test_move bars chew). */
const AD_RUST = 24;
const AD_CORR = 42;

/**
 * C hack.c test_move :1032 — Passes_walls || passes_bars(youmonst.data).
 * On IRONBARS the first obstacle branch (Passes_walls && may_passwall)
 * is Passes_walls: may_passwall is true because bars are not IS_STWALL.
 * TEST_MOVE / TEST_TRAV never chew. D-1270.
 */
export function test_move_hero_passes_bars() {
    return !!(Passes_walls_prop() || passes_bars(game.youmonst?.data));
}

/**
 * C hack.c test_move :1025–1028 — DO_MOVE rust/corr/metallivore chew
 * instead of occupying bars. Passes_walls already allowed the cell in
 * C's first branch, so skip chew. Named: Underwater obstacle; generic
 * rock Passes_walls / tunnels / autodig.
 */
export function test_move_hero_chews_bars() {
    if (Passes_walls_prop()) return false;
    const data = game.youmonst?.data;
    return !!(dmgtype(data, AD_RUST) || dmgtype(data, AD_CORR)
        || metallivorous(data));
}

/**
 * C hack.c squeezeablylightinvent — empty pack or inv_weight() <= -WT_SQUEEZABLE_INV.
 */
function squeezeablylightinvent() {
    const inv = game.invent;
    if (!inv || (Array.isArray(inv) ? inv.length === 0 : !inv)) return true;
    return inv_weight() <= -WT_SQUEEZABLE_INV;
}

/**
 * C hack.c could_move_onto_boulder 145–163 — phaze / not riding / giant
 * unless diagonal-squeeze / tiny / extremely light pack.
 * Uses u.dx/u.dy (C), not the dest-relative step passed to test_move.
 */
export function could_move_onto_boulder(sx, sy) {
    if (Passes_walls_prop()) return true;
    const u = game.u || {};
    if (u.usteed) return false;
    if (throws_rocks(game.youmonst?.data)) {
        const dx = u.dx | 0;
        const dy = u.dy | 0;
        if (!dx || !dy) return true;
        const flankA = game.level?.at(u.ux, sy);
        const flankB = game.level?.at(sx, u.uy);
        return !(IS_OBSTRUCTED(flankA?.typ) && IS_OBSTRUCTED(flankB?.typ));
    }
    if (verysmall(game.youmonst?.data)) return true;
    return squeezeablylightinvent();
}

/**
 * C hack.c test_move 1216 — outer boulder gate (Sokoban || !Passes_walls).
 */
export function test_move_boulder_is_blocking(x, y) {
    return !!(sobj_at(BOULDER, x, y) && (Sokoban_here() || !Passes_walls_prop()));
}

/**
 * C hack.c test_move 1217–1221 — run>=2 abort (mode != TEST_TRAV).
 * Caller prints pline_dir on DO_MOVE + flags.mention_walls (D-1226).
 */
export function test_move_run_blocked_by_boulder(x, y) {
    if (!test_move_boulder_is_blocking(x, y)) return false;
    if ((game.context?.run | 0) < 2) return false;
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind || Blind_im());
    if (Blind || Hallucination()) return false;
    if (could_move_onto_boulder(x, y)) return false;
    return true;
}

/**
 * C pickup.c autopick_testobj — pickup_types symbol filter.
 * calc_costly TRUE unused: costly_spot / thrown/stolen/dropped named omit
 * (same envelope as pickup.js).
 */
function autopick_testobj(otmp, _calc_costly) {
    const otypes = String(game.flags?.pickup_types || '');
    if (!otypes) return true;
    const sym = oclass_to_sym(otmp.oclass);
    return !!(sym && otypes.includes(sym));
}

/**
 * C hack.c inv_cnt — count invent entries; !inclgold skips coins.
 */
function inv_cnt(inclgold) {
    let n = 0;
    for (const otmp of game.invent || []) {
        if (!inclgold && otmp.oclass === COIN_CLASS) continue;
        n++;
    }
    return n;
}

/**
 * C ref: hack.c cannot_push — giant/squeeze may return 0; else -1.
 * Giant pickup/maneuver + sokoban_guilt (D-1253). Squeeze D-1239.
 * nopick m-dir over/against is D-1262 in moverock_core. Named: costly autopick.
 */
export async function cannot_push(otmp, sx, sy) {
    if (throws_rocks(game.youmonst?.data)) {
        /* similar exception as in can_lift(): when poly'd into a giant,
           pick up a boulder if a free a-zA-Z slot or overflow '#' unless
           already carrying at least one */
        const canpickup = !Sokoban_here()
            && (inv_cnt(false) < INVLET_BASIC || !carrying(BOULDER));
        const willpickup = !!(canpickup
            && game.flags?.pickup && !game.context?.nopick
            && autopick_testobj(otmp, true));
        const u = game.u || {};
        const riding = u.weapon_skills?.[P_RIDING]?.skill ?? 0;
        if (u.usteed && riding < P_BASIC) {
            const verb = willpickup ? 'pick up' : 'push aside';
            await pline(
                `You aren't skilled enough to ${verb} ${the(xname(otmp))} from ${y_monnam(u.usteed)}.`,
            );
        } else {
            const act = willpickup ? 'easily pick it up' : 'maneuver over it';
            const extra = (canpickup && !willpickup)
                ? ' and could pick it up'
                : '';
            await pline(`However, you ${act}${extra}.`);
            sokoban_guilt();
        }
        return 0;
    }
    if (could_move_onto_boulder(sx, sy)) {
        await pline(
            'However, you can squeeze yourself into a small opening.',
        );
        sokoban_guilt();
        return 0;
    }
    return -1;
}

/**
 * C ref: hack.c movobj — extract floor obj and place at (ox,oy).
 * maybe_unhide_at deferred. Boulder → recalc_block_point both cells.
 */
function movobj(obj, ox, oy) {
    if (!obj) return;
    const ox0 = obj.ox | 0;
    const oy0 = obj.oy | 0;
    const wasBoulder = (obj.otyp | 0) === BOULDER;
    obj_extract_self(obj);
    newsym(ox0, oy0);
    if (wasBoulder) recalc_block_point(ox0, oy0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
    if (wasBoulder) recalc_block_point(ox, oy);
}

/**
 * C ref: hack.c dopush — message + exercise(A_STR) + movobj.
 * Shop bill / unpaid / stolen_value arms deferred.
 */
async function dopush(sx, sy, rx, ry, otmp) {
    const u = game.u;
    if (!game.bldrpush) game.bldrpush = { oid: 0, time: 0 };
    const bp = game.bldrpush;
    const oid = otmp.o_id | 0;
    if (oid !== bp.oid) {
        bp.time = (game.moves || 0) + 1;
        bp.oid = oid;
    }
    const moves = game.moves || 0;
    const givemesg = moves > bp.time + 2 || moves < bp.time;
    const what = givemesg ? `the ${xname(otmp)}` : null;
    if (!u.usteed) {
        const easypush = throws_rocks(game.youmonst?.data);
        if (givemesg) {
            await pline(
                `With ${easypush ? 'little' : 'great'} effort you move ${what}.`,
            );
        }
        if (!easypush) exercise(A_STR, true);
    } else if (givemesg) {
        // YMonnam(steed) deferred — rare for ordinary push
        await pline(`Your steed moves ${what}.`);
    }
    bp.time = moves;

    // C: if glyph_is_invisible(dest) → unmap_object before movobj/newsym
    // (I from You_hear monster-behind must yield to the pushed boulder).
    const dloc = game.level?.at(rx, ry);
    if (dloc?.remembered_glyph?.invisible) {
        dloc.remembered_glyph = null; // unmap_object trap/engr arms deferred
    }
    otmp.next_boulder = 0;
    movobj(otmp, rx, ry);
    newsym(sx, sy);
}

/**
 * C ref: hack.c moverock_core — push boulder(s) at (sx,sy) along u.dx/u.dy.
 * Branch envelope: Blind unseen start-of-loop feel (D-1281) + nopick
 * m-dir over/against (D-1262) + clear-dest dopush + monster-behind
 * You_hear/canspotmon + closed_door cannot_push_msg (D-0317) + rumbling
 * disturb_buried_zombies (D-1214). Named omissions: Sokoban diagonal,
 * shop costly, trap/teleport/pool arms, Levitation (after nopick),
 * verysmall vain-push, tunneling chew, revive_nasty, next_boulder
 * naming, y_monnam steed wording, dopush/cannot_push_msg Blind
 * feel_location. Giant pickup/maneuver D-1253.
 * Returns 0 to advance onto vacated cell, -1 to abort the move.
 */
async function moverock_core(sx, sy) {
    const u = game.u;
    while (sobj_at(BOULDER, sx, sy)) {
        const otmp = sobj_at(BOULDER, sx, sy);

        /* C hack.c moverock_core :358–363 — Blind + glyph_to_obj(glyph_at)
           != BOULDER before next_boulder / top-of-pile / nopick. D-1281. */
        if (Blind_im() && !glyph_to_obj_is_boulder(sx, sy)) {
            await pline('That feels like a boulder.');
            map_object(otmp, true);
            await nomul(0);
            return -1;
        }

        // Ensure boulder is top of pile
        const head = objects_at(sx, sy);
        if (otmp && head && otmp !== head) movobj(otmp, sx, sy);

        const rx = u.ux + 2 * u.dx;
        const ry = u.uy + 2 * u.dy;
        await nomul(0);

        /* C hack.c moverock_core :382–413 — m<dir> (context.nopick)
           steps over (giant) or squeezes over/against without pushing;
           else in-way. Glyph change spends the turn via door_opened.
           Before Levitation leverage abort. D-1262. */
        if (game.context?.nopick) {
            const oldglyph = glyph_at_fp(sx, sy);
            feel_location(sx, sy);
            if (throws_rocks(game.youmonst?.data)) {
                await pline(
                    `You ${u_locomotion('step')} over a boulder here.`,
                );
                sokoban_guilt();
                return 0;
            }
            if (could_move_onto_boulder(sx, sy)) {
                const how = Flying_st() ? 'over' : 'against';
                await pline(`You squeeze yourself ${how} the boulder.`);
                sokoban_guilt();
                return 0;
            }
            await pline('There is a boulder in your way.');
            if (glyph_at_fp(sx, sy) !== oldglyph) {
                if (!game.context) game.context = {};
                game.context.door_opened = true;
                game.context.move = 1;
            }
            return -1;
        }

        if (u.Levitation || game.dungeon_topology?.Is_airlevel) {
            await pline(`You don't have enough leverage to push the ${xname(otmp)}.`);
            return -1;
        }

        const loc = game.level?.at(rx, ry);
        const typ = loc?.typ ?? 0;
        const clear = isok(rx, ry)
            && !IS_OBSTRUCTED(typ)
            && typ !== IRONBARS
            && (!IS_DOOR(typ) || !(u.dx && u.dy) || doorless_door(rx, ry))
            && !sobj_at(BOULDER, rx, ry);

        if (clear) {
            const ttmp = t_at_local(rx, ry);
            const mtmp = m_at(rx, ry);

            // C: Sokoban diagonal / revive_nasty deferred

            // C ref: hack.c moverock_core — monster on far side of boulder
            if (mtmp && !noncorporeal(mtmp.data)
                && (!mtmp.mtrapped || !(ttmp && is_pit(ttmp.ttyp)))) {
                let deliver_part1 = false;
                // Blind feel_location deferred
                if (canspotmon(mtmp)) {
                    await pline(`There's ${a_monnam(mtmp)} on the other side.`);
                    deliver_part1 = true;
                } else {
                    // Soundeffect deferred
                    await You_hear(`a monster behind the ${xname(otmp)}.`);
                    if (!u.Deaf) deliver_part1 = true;
                    map_invisible(rx, ry);
                }
                if (game.flags?.verbose !== false) {
                    // y_monnam(usteed) deferred — rare on ordinary push
                    const you_or_steed = u.usteed ? 'your steed' : 'you';
                    if (deliver_part1) {
                        await pline(
                            `Perhaps that's why ${you_or_steed} cannot move it.`,
                        );
                    } else {
                        const who = you_or_steed.charAt(0).toUpperCase()
                            + you_or_steed.slice(1);
                        await pline(
                            `${who} cannot move the ${xname(otmp)}.`,
                        );
                    }
                }
                return cannot_push(otmp, sx, sy);
            }

            if (closed_door(rx, ry)) {
                await cannot_push_msg(otmp, sx, sy);
                return cannot_push(otmp, sx, sy);
            }

            disturb_buried_zombies(sx, sy);
            // Trap / pool arms deferred
            await dopush(sx, sy, rx, ry, otmp);
        } else {
            await cannot_push_msg(otmp, sx, sy);
            return cannot_push(otmp, sx, sy);
        }
    }
    return 0;
}

/**
 * C ref: hack.c moverock — push boulder(s) at hero+dir.
 * Uses u.dx/u.dy already set by domove.
 */
export async function moverock() {
    const u = game.u;
    const sx = u.ux + u.dx;
    const sy = u.uy + u.dy;
    return moverock_core(sx, sy);
}

/**
 * C display.c glyph_at — JS has no integer glyph IDs; fingerprint
 * gbuf disp_* plus remembered_glyph for the nopick in-way compare.
 */
function glyph_at_fp(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return '';
    const rg = loc.remembered_glyph;
    return [
        loc.disp_ch ?? '',
        loc.disp_color ?? '',
        loc.disp_decgfx ? 1 : 0,
        loc.disp_attr | 0,
        rg?.ch ?? '',
        rg?.color ?? '',
        rg?.invisible ? 1 : 0,
    ].join('\0');
}

/**
 * C display.h glyph_to_obj(glyph_at(x,y)) == BOULDER.
 * C glyph_at is gbuf, not live floor — never use sobj_at here (the
 * while loop already knows a boulder is present). JS has no integer
 * glyph IDs; map_object stamps remembered_glyph.boulder (D-1281).
 */
function glyph_to_obj_is_boulder(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const rg = loc.remembered_glyph;
    if (rg?.invisible) return false;
    return !!rg?.boulder;
}

/**
 * C ref: obj.h is_flimsy — oc_material ≤ LEATHER or rubber hose.
 */
function is_flimsy(otmp) {
    const mat = game.objects?.[otmp?.otyp]?.oc_material ?? 99;
    return mat <= LEATHER || (otmp?.otyp | 0) === RUBBER_HOSE;
}

/**
 * C ref: hack.c impact_disturbs_zombies — drop/throw/kick owt/flimsy
 * gate then disturb at obj->ox,oy (D-1229). Call after place_object.
 * Violent (throw/kick / dropz TRUE): owt < 10 skip; else owt < 100.
 * dropz/throwit container_impact_dmg is D-1249. hitfloor dropz(TRUE)
 * is D-1263. Hideunder after tread is D-1245.
 */
export function impact_disturbs_zombies(obj, violent) {
    if ((obj.owt | 0) < (violent ? 10 : 100) || is_flimsy(obj)) {
        return;
    }
    disturb_buried_zombies(obj.ox | 0, obj.oy | 0);
}

/**
 * C ref: hack.c disturb_buried_zombies — shrink ZOMBIFY_MON remaining
 * on buried CORPSE in the 3×3 around (x,y) to max(1, t*2/3).
 * peek_timer is absolute timeout (gate > 0); stop_timer returns
 * remaining; integer t*2/3 toward 0. Impact owt/flimsy is D-1229.
 */
export function disturb_buried_zombies(x, y) {
    const px = x | 0;
    const py = y | 0;
    for (let otmp = game.level?.buriedobjlist || null; otmp; otmp = otmp.nobj) {
        let t;
        if ((otmp.otyp | 0) === CORPSE && (otmp.timed | 0)
            && (otmp.ox | 0) >= px - 1 && (otmp.ox | 0) <= px + 1
            && (otmp.oy | 0) >= py - 1 && (otmp.oy | 0) <= py + 1
            && (t = peek_timer(ZOMBIFY_MON, otmp)) > 0) {
            t = stop_timer(ZOMBIFY_MON, otmp);
            start_timer(
                Math.max(1, ((t * 2) / 3) | 0),
                TIMER_OBJECT,
                ZOMBIFY_MON,
                otmp,
            );
        }
    }
}

/**
 * C ref: hack.c:2944–2947 — tread may disturb buried zombies after
 * occupy + run-stop, before hideunder. Levitation/Flying youprop.h;
 * Stealth (H||E)&&!B; cwt >= WT_ELF/2.
 */
export function hero_tread_disturb_buried_zombies() {
    const u = game.u;
    if (!u) return;
    const Stealth = !!(_uprop_he_st(u, 'HStealth', 'EStealth', STEALTH)
        && !((u.BStealth | 0) || (u.uprops?.[STEALTH]?.blocked | 0)));
    if (!Levitation_st() && !Flying_st() && !Stealth
        && (game.youmonst?.data?.cwt | 0) >= ((WT_ELF / 2) | 0)) {
        disturb_buried_zombies(u.ux | 0, u.uy | 0);
    }
}

/**
 * C ref: hack.c:2949–2951 — hideunder(&youmonst) after tread, before
 * mimic unhide / check_leash. Gate: hides_under || S_EEL || dx || dy.
 * Youmonst writes u.uundetected (mon.c hideunder; D-1131).
 */
export function hero_hideunder_after_move() {
    const u = game.u;
    const you = game.youmonst;
    const data = you?.data;
    if (!u || !data) return;
    if (!(hides_under(data) || data.mlet === 'S_EEL' || u.dx || u.dy)) {
        return;
    }
    hideunder(you);
}

/**
 * C ref: hack.c:2953–2960 — after hideunder, before check_leash.
 * Mimics (or whatever) become noticeable if they move while imitating
 * something that doesn't move. U_AP_TYPE is m_ap_type & M_AP_TYPMASK.
 * Assignment is M_AP_NOTHING (not seemimic; mappearance leftover).
 * Named: swap-with-pet seemimic; bump_mon stumble_onto_mimic.
 * display_self U_AP_TYPE glyphs: D-1275.
 */
export function hero_mimic_unhide_after_move() {
    const u = game.u;
    const you = game.youmonst;
    if (!u || !you) return;
    if (!(u.dx || u.dy)) return;
    const ap = (you.m_ap_type | 0) & M_AP_TYPMASK;
    if (ap === M_AP_OBJECT || ap === M_AP_FURNITURE) {
        you.m_ap_type = M_AP_NOTHING;
    }
}

/** True if floor cell has a boulder (domove test_move gate). */
export function boulder_at(x, y) {
    return !!sobj_at(BOULDER, x, y);
}

const AT_BOOM = 14; // monattk.h — explosion-on-death, not a real attack

/**
 * C ref: mondata.c noattacks — True if mattk slots are empty (ignore AT_BOOM).
 */
export function noattacks(ptr) {
    const slots = ptr?.mattk;
    if (!slots) return true;
    for (let i = 0; i < 6; i++) {
        const aatyp = slots[i]?.aatyp | 0;
        if (aatyp === AT_BOOM) continue;
        if (aatyp) return false;
    }
    return true;
}

/**
 * C ref: hack.c monster_nearby — adjacent hostile the hero can spot.
 * onscary stubbed false (Elbereth / sanctuary still deferred).
 */
export function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    const hallu = !!(u.Hallucination);
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            const ap = M_AP_TYPE(mtmp);
            if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) continue;
            if (!(hallu || (!mtmp.mpeaceful && !noattacks(mtmp.data)))) continue;
            if (is_hider(mtmp.data) && mtmp.mundetected) continue;
            if (mtmp.msleeping || mtmp.mcanmove === 0) continue; // helpless
            // onscary(u.ux, u.uy, mtmp) deferred
            // C: canspotmon(mtmp) — Blind still sensemon adjacent (D-0928)
            if (!canspotmon(mtmp)) continue;
            return true;
        }
    }
    return false;
}

/**
 * C ref: hack.c carrying_too_much — OVERLOADED (or low-HP + >SLT) blocks
 * movement; collapses / "not enough stamina". Air level exempt.
 * @returns {Promise<boolean>} true if movement is blocked
 */
export async function carrying_too_much() {
    if (Is_airlevel(game.u?.uz)) return false;
    const wtcap = near_capacity();
    const u = game.u || {};
    const lowHp = Upolyd(u)
        ? ((u.mh | 0) < 5 && (u.mh | 0) !== (u.mhmax | 0))
        : ((u.uhp | 0) < 10 && (u.uhp | 0) !== (u.uhpmax | 0));
    if (!(wtcap >= OVERLOADED || (wtcap > SLT_ENCUMBER && lowHp))) {
        return false;
    }
    if (wtcap < OVERLOADED) {
        await pline("You don't have enough stamina to move.");
        exercise(A_CON, false);
    } else {
        await pline('You collapse under your load.');
    }
    nomul(0);
    return true;
}

/**
 * C ref: hack.c overexert_hp — HP loss or pass-out from exertion.
 * Called from overexertion (melee) and allmain moveloop (encumber+moved).
 */
export async function overexert_hp() {
    const u = game.u || (game.u = {});
    const polyd = Upolyd(u);
    let hp = polyd ? (u.mh | 0) : (u.uhp | 0);
    if (hp > 1) {
        hp -= 1;
        if (polyd) u.mh = hp;
        else u.uhp = hp;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    } else {
        await pline('You pass out from exertion!');
        exercise(A_CON, false);
        fall_asleep(-10, false);
    }
}

/**
 * C ref: hack.c overexertion — melee hunger via gethungry; maybe faint.
 * When moves%3 != 0 and near_capacity >= HVY_ENCUMBER → overexert_hp.
 */
export async function overexertion() {
    gethungry();
    if (((game.moves | 0) % 3) !== 0 && near_capacity() >= HVY_ENCUMBER) {
        await overexert_hp();
    }
    return (game.multi | 0) < 0; // might have fainted (forced to sleep)
}

/**
 * C ref: hack.h Maybe_Half_Phys — Half_physical_damage halves ((dmg+1)/2).
 * Prop not yet wired → identity.
 */
export function maybe_half_phys(dmg) {
    const u = game.u;
    const half = !!(u?.HHalf_physical_damage || u?.EHalf_physical_damage);
    if (half) return Math.trunc((dmg + 1) / 2);
    return dmg;
}

/**
 * C ref: hack.c nomul — start/replace multi-turn inactivity (negative = occupation).
 * end_running deferred; cmdq_clear(CQ_CANNED) via game._cmdq_canned.
 */
export function nomul(nval) {
    if ((game.multi || 0) < nval) return;
    if (!game.flags) game.flags = {};
    if ((game.multi || 0) >= 0) game.flags.botl = true;
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
        game.nomovemsg = null;
    }
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
    // C: end_running(TRUE); cmdq_clear(CQ_CANNED)
    if (game._cmdq_canned) game._cmdq_canned = [];
}

/**
 * C ref: allmain.c stop_occupation — interrupt multi-turn occupation.
 * maybe_finished_meal / reset_eat callers deferred at call sites.
 */
export async function stop_occupation() {
    if (typeof game.occupation === 'function') {
        const txt = game.occtxt;
        if (txt) await pline(`You stop ${txt}.`);
        game.occupation = null;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        nomul(0);
    } else if ((game.multi || 0) >= 0) {
        nomul(0);
    }
    game._repeat_search = false;
    // C: cmdq_clear(CQ_CANNED) — avoid importing cmd.js
    if (game._cmdq_canned) game._cmdq_canned = [];
}

/**
 * C ref: timeout.c fall_asleep — nomul(how_long) with sleeping reason.
 * Deafness / Hear_again afternmv (#if 0 in C) deferred.
 * @param {number} how_long negative multi turns
 * @param {boolean} wakeup_msg if true, nomovemsg is "You wake up."
 */
export function fall_asleep(how_long, wakeup_msg) {
    // stop_occupation — clear multi-turn occupation without message
    if (typeof game.occupation === 'function') game.occupation = null;
    nomul(how_long);
    game.multi_reason = 'sleeping';
    if (!game.u) game.u = {};
    game.u.usleep = game.moves | 0;
    game.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/**
 * C ref: hack.c unmul — finish multi-turn action; run afternmv if set.
 * @param {string|null|undefined} msg_override
 */
export async function unmul(msg_override) {
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    game.multi = 0;
    let msg = msg_override;
    if (msg === undefined) msg = null;
    // C: if (msg_override) gn.nomovemsg = msg_override;
    //    else if (!gn.nomovemsg) gn.nomovemsg = You_can_move_again;
    //    if (*gn.nomovemsg) pline(...);
    // Pointer NULL vs "" — fumbling sets nomovemsg="" (timeout.c) so unmul
    // must NOT treat empty string as missing (JS !"" would wrongly default).
    if (msg != null) game.nomovemsg = msg;
    else if (game.nomovemsg == null) game.nomovemsg = 'You can move again.';
    if (game.nomovemsg != null && game.nomovemsg.length) {
        await pline(game.nomovemsg);
    }
    game.nomovemsg = null;
    game.multi_reason = null;
    const f = game.afternmv;
    game.afternmv = null;
    if (typeof f === 'function') await f();
}

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function Unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: hack.c maybe_wail — low-HP warning (≤50 turns between msgs).
 * Soundeffect deferred (no RNG). Wizard/Elf/Valkyrie power-count arm
 * uses u.uprops[].intrinsic & INTRINSIC.
 */
async function maybe_wail() {
    const moves = game.moves | 0;
    if (moves <= ((game.wailmsg | 0) + 50)) return;
    game.wailmsg = moves;

    const u = game.u || {};
    const roleM = game.urole?.mnum | 0;
    const raceM = game.urace?.mnum | 0;
    if (roleM === PM_WIZARD || raceM === PM_ELF || roleM === PM_VALKYRIE) {
        const who = (roleM === PM_WIZARD || roleM === PM_VALKYRIE)
            ? (game.urole?.name?.m || 'Wizard')
            : 'Elf';
        if ((u.uhp | 0) === 1) {
            await pline(`${who} is about to die.`);
        } else {
            const powers = [
                TELEPORT, SEE_INVIS, POISON_RES, COLD_RES,
                SHOCK_RES, FIRE_RES, SLEEP_RES, DISINT_RES,
                TELEPORT_CONTROL, STEALTH, FAST, INVIS,
            ];
            let powercnt = 0;
            for (const p of powers) {
                if (((u.uprops?.[p]?.intrinsic | 0) & INTRINSIC) !== 0) {
                    ++powercnt;
                }
            }
            await pline(powercnt >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`);
        }
    } else {
        // C: Soundeffect(se_wailing_of_the_banshee, 75) deferred
        await You_hear((u.uhp | 0) === 1
            ? 'the wailing of the Banshee...'
            : 'the howling of the CwnAnnwn...');
    }
}

/**
 * C ref: hack.c losehp() — subtract HP (or mh when Upolyd).
 * Fatal: set killer + gameover + `_losehp_needs_done` so callers must not
 * continue (C `done(DIED)` is noreturn). Callers in async paths await
 * `finish_losehp_done` from end.js; showdamage / rehumanize deferred.
 * Low-HP `maybe_wail` sets `_needs_maybe_wail` — callers must
 * `await finish_maybe_wail()` (C blocks inside losehp on You_hear).
 */
export function losehp(n, knam, k_format = KILLED_BY) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    // C: end_running(TRUE) — clear rush; do NOT force multi=0 (nomul owns that)
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
        game.context.travel = 0;
    }
    if ((game.multi | 0) > 0) game.multi = 0;

    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - n;
        if ((u.mhmax || 0) < (u.mh || 0)) u.mhmax = u.mh;
        if ((u.mh || 0) < 1) {
            // rehumanize deferred — treat as fatal for now
            u.mh = 0;
            if (!game.program_state) game.program_state = {};
            game.program_state.gameover = true;
            game._losehp_needs_done = true;
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.name = knam || '';
            game.killer.format = k_format;
        } else if (n > 0 && (u.mh | 0) * 10 < (u.mhmax | 0) && Unchanging(u)) {
            game._needs_maybe_wail = true;
        }
        return;
    }

    u.uhp = (u.uhp || 0) - n;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhpmax = u.uhp;
    // C hack.c losehp: do not clamp uhp on fatal — leave negative so bot()
    // no-ops when uhp==-1 (exact overkill) and prior botl stays through the
    // deferred hit --More-- before urgent_pline("You die...") / done().
    // done() zeros uhp after its bot() call (end.c).
    if ((u.uhp || 0) < 1) {
        // C: urgent_pline("You die..."); done(DIED); — noreturn
        if (!game.program_state) game.program_state = {};
        game.program_state.gameover = true;
        game._losehp_needs_done = true;
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = knam || '';
        game.killer.format = k_format;
    } else if (n > 0 && (u.uhp | 0) * 10 < (u.uhpmax | 0)) {
        game._needs_maybe_wail = true;
    }
}

/**
 * C ref: hack.c losehp → maybe_wail (You_hear / pline may `--More--`).
 * Call after losehp when `_needs_maybe_wail` may be set.
 */
export async function finish_maybe_wail() {
    if (!game._needs_maybe_wail) return;
    game._needs_maybe_wail = false;
    await maybe_wail();
}

/** C: IS_SHOP(x) — rooms[x].rtype >= SHOPBASE */
function IS_SHOP(roomIdx) {
    const rooms = game.level?.rooms || [];
    return ((rooms[roomIdx]?.rtype | 0) >= SHOPBASE);
}

/**
 * C ref: hack.c in_rooms — roomno chars at (x,y), optionally filtered by type.
 * SHARED / SHARED_PLUS neighbor walk included; returns string of room chars.
 */
export function in_rooms(x, y, typewanted = 0) {
    const level = game.level;
    if (!level?.at) return '';
    const loc0 = level.at(x, y);
    if (!loc0) return '';

    function goodtype(rno) {
        if (!typewanted) return true;
        const typefound = level.rooms?.[rno - ROOMOFFSET]?.rtype | 0;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    }

    const rno0 = loc0.roomno | 0;
    if (rno0 === NO_ROOM) return '';
    if (rno0 !== SHARED && rno0 !== SHARED_PLUS) {
        return goodtype(rno0) ? String.fromCharCode(rno0) : '';
    }

    const step = rno0 === SHARED ? 2 : 1;
    let min_x = x - 1;
    let max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1;
    let max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    // C builds into buf[5] from the end; collect then reverse for stable order
    const found = [];
    for (let cx = min_x; cx <= max_x; cx += step) {
        for (let dy = 0; dy <= max_y_offset; dy += step) {
            const loc = level.at(cx, min_y + dy);
            const rno = loc?.roomno | 0;
            if (rno >= ROOMOFFSET && !found.includes(rno) && goodtype(rno)) {
                found.push(rno);
            }
        }
    }
    // C prepends (--ptr), so later discoveries appear earlier in the string
    found.reverse();
    return found.map((r) => String.fromCharCode(r)).join('');
}

/** Ensure shop/room occupancy strings exist on u (C you.h char arrays). */
function ensure_u_room_strings(u) {
    if (u.urooms == null) u.urooms = '';
    if (u.urooms0 == null) u.urooms0 = '';
    if (u.uentered == null) u.uentered = '';
    if (u.ushops == null) u.ushops = '';
    if (u.ushops0 == null) u.ushops0 = '';
    if (u.ushops_entered == null) u.ushops_entered = '';
    if (u.ushops_left == null) u.ushops_left = '';
}

/**
 * C ref: hack.c move_update — refresh urooms/ushops and enter/leave deltas.
 */
function move_update(newlev) {
    const u = game.u;
    if (!u) return;
    ensure_u_room_strings(u);

    u.urooms0 = u.urooms || '';
    u.ushops0 = u.ushops || '';
    if (newlev) {
        u.urooms = '';
        u.uentered = '';
        u.ushops = '';
        u.ushops_entered = '';
        u.ushops_left = u.ushops0;
        return;
    }

    u.urooms = in_rooms(u.ux, u.uy, 0);
    let entered = '';
    let shops = '';
    let shopsEntered = '';
    for (let i = 0; i < u.urooms.length; i++) {
        const c = u.urooms[i];
        const code = u.urooms.charCodeAt(i);
        if (!u.urooms0.includes(c)) entered += c;
        if (IS_SHOP(code - ROOMOFFSET)) {
            shops += c;
            if (!u.ushops0.includes(c)) shopsEntered += c;
        }
    }
    u.uentered = entered;
    u.ushops = shops;
    u.ushops_entered = shopsEntered;

    let left = '';
    for (let i = 0; i < u.ushops0.length; i++) {
        const c = u.ushops0[i];
        if (!u.ushops.includes(c)) left += c;
    }
    u.ushops_left = left;
}

// --- swim / liquid move danger (hack.c swim_move_danger) -----------------

/** C ref: dbridge.c is_waterwall — drawbridge under deferred. */
function is_waterwall_at(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    return !!(loc && IS_WATERWALL(loc.typ));
}

/**
 * C ref: dbridge.c is_pool — POOL/MOAT/WATER, or is_moat (DRAWBRIDGE_UP
 * + DB_MOAT). Juiblex MOAT terrain is pool but not moat (D-1090).
 */
export function is_pool(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const ltyp = lev.typ | 0;
    /* C: ltyp == MOAT is not redundant with is_moat — Juiblex has
     * MOATs that is_moat rejects. */
    if (ltyp === POOL || ltyp === MOAT || ltyp === WATER || is_moat(x, y)) {
        return true;
    }
    return false;
}

/**
 * C ref: dbridge.c is_lava — LAVAPOOL/LAVAWALL or DRAWBRIDGE_UP with
 * DB_LAVA under (D-1077).
 */
export function is_lava(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const ltyp = lev.typ | 0;
    if (ltyp === LAVAPOOL || ltyp === LAVAWALL) return true;
    return ltyp === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA;
}

/**
 * C ref: dbridge.c is_moat — MOAT or DRAWBRIDGE_UP with DB_MOAT under;
 * Juiblex swamp is never a moat (D-1090). DB_MOAT is 0.
 */
export function is_moat(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const ltyp = lev.typ | 0;
    if (!Is_juiblex_level(game.u?.uz)
        && (ltyp === MOAT
            || (ltyp === DRAWBRIDGE_UP
                && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_MOAT))) {
        return true;
    }
    return false;
}

/**
 * C ref: dbridge.c db_under_typ — ICE / LAVAPOOL / MOAT from
 * drawbridgemask & DB_UNDER; else STONE (D-1103). DB_MOAT is 0;
 * DB_FLOOR falls through to STONE.
 */
export function db_under_typ(mask) {
    switch ((mask | 0) & DB_UNDER) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}

/**
 * C ref: rm.h SURFACE_AT — DRAWBRIDGE_UP reports db_under_typ, else
 * levl.typ (D-1103). Missing JS cell → STONE (C levl[][] always exists
 * after isok).
 */
export function SURFACE_AT(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return STONE;
    if ((lev.typ | 0) === DRAWBRIDGE_UP) {
        return db_under_typ(lev.drawbridgemask);
    }
    return lev.typ | 0;
}

/**
 * C ref: pager.c waterbody_name — pool/moat/lava/ice/wall; medusa
 * shallow sea / juiblex swamp / samurai qstart pond (D-0928 #1163).
 * ltyp via SURFACE_AT so a raised drawbridge names its under-typ
 * (D-1103).
 */
export function waterbody_name(x, y) {
    if (!isok(x, y)) return 'drink';
    const typ = SURFACE_AT(x, y);
    const hallucinate = Hallucination() && !game.program_state?.gameover;
    if (typ === LAVAPOOL) return `molten ${hliquid('lava')}`;
    if (typ === ICE) {
        if (!hallucinate) return 'ice';
        return `frozen ${hliquid('water')}`;
    }
    if (typ === POOL) return `pool of ${hliquid('water')}`;
    if (typ === MOAT) {
        if (hallucinate) return `deep ${hliquid('water')}`;
        if (Is_medusa_level(game.u?.uz)) return 'shallow sea';
        if (Is_juiblex_level(game.u?.uz)) return 'swamp';
        // C: Role_if(PM_SAMURAI) && Is_qstart(&u.uz)
        const qs = game.qstart_level;
        const uz = game.u?.uz;
        if (game.urole?.mnum === PM_SAMURAI
            && qs && uz
            && uz.dnum === qs.dnum && uz.dlevel === qs.dlevel) {
            return 'pond';
        }
        return 'moat';
    }
    if (IS_WATERWALL(typ)) {
        if (Is_waterlevel(game.u?.uz)) return 'limitless water';
        return `wall of ${hliquid('water')}`;
    }
    if (typ === LAVAWALL) return `wall of ${hliquid('lava')}`;
    return 'water';
}

/**
 * C ref: hacklib.c ing_suffix — gerund; on/off/with split + full vowel
 * doubling kept for "step"→"stepping".
 */
function ing_suffix(s) {
    let buf = String(s);
    const vowel = 'aeiouwy';
    let onoff = '';
    if (/\s+on$/i.test(buf) || /\s+off$/i.test(buf) || /\s+with$/i.test(buf)) {
        const sp = buf.lastIndexOf(' ');
        onoff = buf.slice(sp);
        buf = buf.slice(0, sp);
    }
    const n = buf.length;
    if (n >= 2 && buf.slice(-2).toLowerCase() === 'er') {
        // slither + ing
    } else if (n >= 3
        && !vowel.includes(buf[n - 1].toLowerCase())
        && vowel.includes(buf[n - 2].toLowerCase())
        && !vowel.includes(buf[n - 3].toLowerCase())) {
        buf += buf[n - 1]; // tip → tipp
    } else if (n >= 2 && buf.slice(-2).toLowerCase() === 'ie') {
        buf = `${buf.slice(0, -2)}y`;
    } else if (n >= 1 && buf[n - 1].toLowerCase() === 'e') {
        buf = buf.slice(0, -1);
    }
    return `${buf}ing${onoff}`;
}

/**
 * C ref: hack.c u_locomotion — Lev/Fly capitalize path; poly locomotion deferred.
 */
function u_locomotion(defWord) {
    const u = game.u || {};
    if (u.Levitation) return 'float';
    if (u.Flying) return 'fly';
    return defWord;
}

/**
 * C ref: hack.c u_simple_floortyp — grounded pool/lava vs air; poly
 * !grounded flyer arm deferred (treat as grounded unless Lev/Fly).
 */
function u_simple_floortyp(x, y) {
    const u = game.u || {};
    const uInAir = !!(u.Levitation || u.Flying);
    if (is_waterwall_at(x, y)) return WATER;
    const loc = game.level?.at(x, y);
    if (loc?.typ === LAVAWALL) return LAVAWALL;
    if (!uInAir) {
        if (is_pool(x, y)) return POOL;
        if (is_lava(x, y)) return LAVAPOOL;
    }
    return ROOM;
}

/**
 * C ref: hack.c handle_tip — tips option + once-per-bit context.tips.
 * TIP_ENHANCE / TIP_UNTRAP_MON / TIP_GETPOS deferred (callers elsewhere).
 */
export async function handle_tip(tip) {
    if (game.flags?.tips === false) return false;
    if (tip < 0 || tip >= 4 /* NUM_TIPS */) return false;
    if (!game.context) game.context = {};
    const bits = game.context.tips | 0;
    if (bits & (1 << tip)) return false;
    game.context.tips = bits | (1 << tip);
    if (tip === TIP_SWIM) {
        // C: visctrl(cmd_from_func(do_reqmenu)) → 'm' under default binds
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        return true;
    }
    return false;
}

/**
 * C ref: hack.c swim_move_danger — ParanoidSwim / liquid-wall avoid pline.
 * Known_wwalking / Known_lwalking / steed / Underwater pool stay deferred
 * beyond the seenv + nopick + ParanoidSwim|liquid_wall envelope used here.
 * @returns {Promise<boolean>} true → stop move (dangerous)
 */
export async function swim_move_danger(x, y) {
    const u = game.u || {};
    const newtyp = u_simple_floortyp(x, y);
    const liquidWall = IS_WATERWALL(newtyp) || newtyp === LAVAWALL;
    const loc = game.level?.at(x, y);

    if (u.Underwater && (is_pool(x, y) || IS_WATERWALL(newtyp))) return false;

    if (newtyp !== u_simple_floortyp(u.ux, u.uy)
        && !u.Stunned && !u.Confusion && loc?.seenv
        && (is_pool(x, y) || is_lava(x, y) || liquidWall)) {
        // Known_wwalking / Known_lwalking deferred → treat as unknown
        if ((is_pool(x, y) /* && !Known_wwalking */)
            || (is_lava(x, y) && !is_lava(u.ux, u.uy))
            || liquidWall) {
            if (game.context?.nopick) {
                // m-prefix: allow step; suppress future tip
                game.context.tips = (game.context.tips | 0) | (1 << TIP_SWIM);
                return false;
            }
            const bits = game.flags?.paranoia_bits;
            const paranoidSwim = bits == null
                ? true
                : (bits & PARANOID_SWIM) !== 0;
            if (paranoidSwim || liquidWall) {
                await pline(`You avoid ${ing_suffix(u_locomotion('step'))} into the ${waterbody_name(x, y)}.`);
                await handle_tip(TIP_SWIM);
                return true;
            }
        }
    }
    return false;
}

/** C youprop.h Blind / Stunned / Confusion for avoid_trap_andor_region. */
function Blind_prop() {
    const u = game.u || {};
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function Stunned_prop() {
    const u = game.u || {};
    return !!((u.HStun | 0) || u.Stunned);
}
function Confusion_prop() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}

/** C hacklib.c upstart — capitalize first letter. */
function upstart_word(str) {
    const s = String(str ?? '');
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C region.c visible_region_at / reg_damg — local clones so hack.js
 * does not import region.js (region.js already imports hack.js).
 */
function visible_region_at_xy(x, y) {
    const regs = game.regions || [];
    for (const reg of regs) {
        if (!reg.visible || reg.ttl === -2) continue;
        for (const r of reg.rects || []) {
            if (x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy) return reg;
        }
    }
    return null;
}
function reg_damg(reg) {
    if (!reg || !reg.visible || reg.ttl === -2) return 0;
    return reg.arg | 0;
}

/**
 * C ref: hack.c test_move(TEST_MOVE) — silent viability for
 * avoid_trap_andor_region. IRONBARS allow via Passes_walls ||
 * passes_bars (D-1270; chew is DO_MOVE only). Named omissions:
 * Passes_walls/ooze/autodig/Underwater/squeeze/worm_cross. C always
 * clears context.door_opened. run>=2 boulder abort is D-1226 (silent
 * here).
 */
function test_move_viable(dx, dy) {
    const u = game.u;
    if (!u) return false;
    const x = (u.ux | 0) + (dx | 0);
    const y = (u.uy | 0) + (dy | 0);
    if (game.context) game.context.door_opened = false;
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (IS_OBSTRUCTED(loc.typ)) return false;
    if (loc.typ === IRONBARS && !test_move_hero_passes_bars()) return false;
    if (closed_door(x, y)) return false;
    if (dx && dy) {
        if (IS_DOOR(loc.typ) && !doorless_door(x, y)) return false;
        const here = game.level?.at(u.ux, u.uy);
        if (here && IS_DOOR(here.typ) && !doorless_door(u.ux, u.uy)) {
            return false;
        }
    }
    if (test_move_run_blocked_by_boulder(x, y)) return false;
    return true;
}

/**
 * C ref: hack.c avoid_trap_andor_region — ParanoidTrap yn before a
 * viable step onto a tseen trap (or into a visible gas region).
 * Default paranoia_bits include PARANOID_TRAP, not PARANOID_CONFIRM,
 * so paranoid_query uses yn (not getlin "yes").
 * @returns {Promise<boolean>} true → stop moving
 */
export async function avoid_trap_andor_region(x, y) {
    const u = game.u || {};
    const bits = game.flags?.paranoia_bits | 0;
    const ParanoidTrap = (bits & PARANOID_TRAP) !== 0;
    const ParanoidConfirm = (bits & PARANOID_CONFIRM) !== 0;
    const nopick = !!(game.context?.nopick);
    const running = !!(game.context?.run);
    // C: skip m-prefix unless also running
    const wouldAsk = !nopick || running;

    if (ParanoidTrap && !Blind_prop() && !Stunned_prop() && !Confusion_prop()
        && !Hallucination() && wouldAsk) {
        const newreg = visible_region_at_xy(x, y);
        if (newreg) {
            const oldreg = visible_region_at_xy(u.ux, u.uy);
            const newDmg = reg_damg(newreg);
            const oldDmg = oldreg ? reg_damg(oldreg) : 0;
            if ((!oldreg || (newDmg > 0 && oldDmg === 0))
                && test_move_viable(u.dx, u.dy)) {
                const cloud = newDmg > 0 ? 'poison gas' : 'vapor';
                const qbuf = upstart_word(
                    `${u_locomotion('step')} into that ${cloud} cloud?`,
                );
                if (!(await paranoid_query(ParanoidConfirm, qbuf))) {
                    nomul(0);
                    if (game.context) game.context.move = 0;
                    return true;
                }
            }
        }
    }

    if (ParanoidTrap && !Stunned_prop() && !Confusion_prop() && wouldAsk) {
        const trap = t_at(x, y);
        if (trap && trap.tseen && test_move_viable(u.dx, u.dy)
            && (immune_to_trap(game.youmonst, trap.ttyp) !== TRAP_CLEARLY_IMMUNE
                || Hallucination())) {
            const traptype = Hallucination() ? rnd(TRAPNUM - 1) : (trap.ttyp | 0);
            const into = into_vs_onto(traptype);
            const qbuf = `Really ${u_locomotion('step')} ${into ? 'into' : 'onto'} that ${trapname(traptype)}?`;
            if (!(await paranoid_query(ParanoidConfirm, qbuf))) {
                nomul(0);
                if (game.context) game.context.move = 0;
                return true;
            }
        }
    }
    return false;
}

/**
 * C ref: hack.c crawl_destination — orthogonal always; diagonal door/
 * squeeze checks. NODIAG / Passes_walls / bad_rock squeeze / IRONBARS
 * via goodpos deferred → diagonal allowed when goodpos. Hero walk
 * bars are test_move D-1270, not this helper.
 */
export function crawl_destination(x, y) {
    const u = game.u;
    if (!u) return false;
    // Lazy goodpos via teleport to avoid hack→teleport→… cycles at load
    // Inline ACCESSIBLE floor check approximating goodpos for hero crawl.
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    // C: goodpos(x,y,&youmonst,0) — pool/lava not good for grounded hero
    if (is_pool(x, y) || is_lava(x, y) || IS_WATERWALL(loc.typ)
        || loc.typ === LAVAWALL) return false;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) return false;
    if (IS_DOOR(loc.typ) && closed_door(x, y)) return false;
    // occupied by monster
    if (m_at(x, y)) return false;
    if (x === u.ux || y === u.uy) return true;
    // diagonal: intact doorway ban
    if (IS_DOOR(loc.typ) && !doorless_door(x, y)) return false;
    return true;
}

/**
 * C ref: hack.c trapmove — try to escape u.utrap by walking; return true iff
 * movement should continue toward destination. Always false for bear trap
 * (escape still leaves hero on the trap square this turn).
 *
 * Branch envelope this iteration: TT_BEARTRAP full (no steed); TT_WEB
 * decrement+msgs; TT_PIT adjacent-pit continue + climb_pit stub; TT_LAVA /
 * TT_INFLOOR / TT_BURIEDBALL / steed / Sting / buried_ball_to_punishment /
 * surface() culprit text deferred.
 *
 * @param {number} x destination x
 * @param {number} y destination y
 * @param {object|null} desttrap trap at destination or null
 * @returns {Promise<boolean>}
 */
export async function trapmove(x, y, desttrap) {
    const u = game.u;
    if (!u || !(u.utrap | 0)) return true;

    const verbose = game.flags?.verbose !== false;
    let anchored = false;

    switch (u.utraptype | 0) {
    case TT_BEARTRAP: {
        if (verbose) {
            // steed Norep deferred
            await Norep('You are caught in a bear trap.');
        }
        // C: diagonal or !rn2(5) decrements escape counter
        if ((u.dx && u.dy) || !rn2(5)) {
            u.utrap = (u.utrap | 0) - 1;
        }
        if (!(u.utrap | 0)) {
            // wriggle_free — steed / wrench-ball arms deferred
            await pline('You finally wriggle free.');
        }
        break;
    }
    case TT_PIT: {
        if (desttrap && desttrap.tseen && is_pit(desttrap.ttyp)) {
            return true; // move into adjacent pit
        }
        // climb_pit() body deferred — still consume the attempt
        break;
    }
    case TT_WEB: {
        // u_wield_art(ART_STING) cut-through deferred
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap | 0) {
            if (verbose) {
                await Norep('You are stuck to the web.');
            }
        } else {
            await pline('You disentangle yourself.');
        }
        break;
    }
    case TT_LAVA: {
        if (verbose) {
            await Norep('You are stuck in the lava.');
        }
        if (!is_lava(x, y)) {
            u.utrap = (u.utrap | 0) - 1;
            if (((u.utrap | 0) & 0xff) === 0) {
                u.utrap = 0;
                await pline('You pull yourself to the edge of the lava.');
            }
        }
        u.umoved = true;
        break;
    }
    case TT_INFLOOR:
    case TT_BURIEDBALL: {
        anchored = (u.utraptype | 0) === TT_BURIEDBALL;
        // buried_ball radius-1 free-move arm deferred
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap | 0) {
            if (verbose) {
                const msg = anchored
                    ? 'You are chained to the buried ball.'
                    : 'You are stuck in the floor.';
                await Norep(msg);
            }
        } else if (anchored) {
            await pline('You finally wrench the ball free.');
            // buried_ball_to_punishment deferred
        } else {
            await pline('You finally wriggle free.');
        }
        break;
    }
    case TT_NONE:
    default:
        break;
    }
    return false;
}

/**
 * C ref: hack.c u_maybe_impaired — Stunned always; Confusion rolls !rn2(5).
 * Short-circuit matches C: no rn2 when Stunned or when not Confused.
 */
export function u_maybe_impaired() {
    const u = game.u || {};
    if (u.Stunned) return true;
    // C: Confusion ≡ HConfusion
    if (u.Confusion || u.HConfusion) return !rn2(5);
    return false;
}

/**
 * C ref: cmd.c confdir(force_impairment) — randomize u.dx/u.dy when impaired.
 * NODIAG (grid bug) uses cardinals only (N_DIRS/2 via dirs_ord prefix).
 */
export function confdir(force_impairment) {
    if (force_impairment || u_maybe_impaired()) {
        const u = game.u;
        if (!u) return;
        const kmax = ((u.umonnum | 0) === PM_GRID_BUG) ? (N_DIRS / 2) : N_DIRS;
        const k = DIRS_ORD[rn2(kmax)] | 0;
        u.dx = xdir[k];
        u.dy = ydir[k];
    }
}

/**
 * C ref: hack.c bad_rock — obstructed tile the form cannot dig/pass.
 * Named omissions: Sokoban boulder; tunnels/needspick/may_dig;
 * passes_walls/may_passwall (hero rarely applies here).
 */
function bad_rock_hero(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    return IS_OBSTRUCTED(loc.typ);
}

/**
 * C ref: hack.c impaired_movement — if impaired, confdir until isok+!bad_rock.
 * Returns true when movement is aborted (tries>50 → nomul(0)).
 * Mutates u.dx/u.dy on successful redirect; caller recomputes destination.
 */
export function impaired_movement() {
    const u = game.u;
    if (!u) return false;
    if (!u_maybe_impaired()) return false;
    let tries = 0;
    let x;
    let y;
    do {
        if (++tries > 50) {
            nomul(0);
            return true;
        }
        confdir(true);
        x = (u.ux | 0) + (u.dx | 0);
        y = (u.uy | 0) + (u.dy | 0);
    } while (!isok(x, y) || bad_rock_hero(x, y));
    return false;
}

/**
 * C ref: hack.c check_special_room — shop enter/leave + special-room messages.
 * Ported: ZOO/SWAMP/COURT/LEPREHALL/MORGUE/BEEHIVE/COCKNEST/ANTHOLE plines;
 * TEMPLE→intemple; rtype→OROOM + has_* clear; COURT/SWAMP/MORGUE/ZOO
 * wake `!Stealth && !rn2(3)` (wake_msg pline deferred).
 * Named omissions: furniture_present throne detail;
 * BARRACKS monstinroom occupied vs abandoned; DELPHI oracle verbalize;
 * wake_msg canseemon text.
 */
export async function check_special_room(newlev) {
    const u = game.u;
    if (!u) return;
    move_update(!!newlev);

    // Lazy import avoids hack → shk → mhitu → hack cycle.
    const { u_entered_shop, u_left_shop } = await import('./shk.js');

    if (u.ushops0) {
        await u_left_shop(u.ushops_left || '', !!newlev);
    }

    // C: ACH_TOWN before early return (minetn_reached latch)
    if (game.level?.flags?.has_town
        && !game.context?.achieveo?.minetn_reached
        && In_mines(u.uz)
        && in_town(u.ux | 0, u.uy | 0)) {
        record_achievement(ACH_TOWN);
        if (!game.context) game.context = {};
        if (!game.context.achieveo) game.context.achieveo = {};
        game.context.achieveo.minetn_reached = true;
    }

    if (!u.uentered && !u.ushops_entered) return;

    if (u.ushops_entered) {
        await u_entered_shop(u.ushops_entered);
    }

    const { intemple } = await import('./priest.js');
    const rooms = game.level?.rooms;
    const entered = u.uentered || '';
    const Blind = !!(u.Blind || u.HBlind || u.EBlind);
    const Stealth = !!(((u.HStealth | 0) || (u.EStealth | 0))
        && !(u.BStealth | 0));

    for (let i = 0; i < entered.length; i++) {
        let roomno = entered.charCodeAt(i) - ROOMOFFSET;
        let rt = rooms?.[roomno]?.rtype | 0;
        let msg_given = true;

        switch (rt) {
        case ZOO:
            await pline("Welcome to David's treasure zoo!");
            break;
        case SWAMP:
            await pline(`It ${Blind ? 'feels' : 'looks'} rather ${
                Blind ? 'humid' : 'muddy'} down here.`);
            break;
        case COURT:
            // furniture_present(THRONE) deferred — omit " throne" suffix
            await pline('You enter an opulent room!');
            break;
        case LEPREHALL:
            await pline('You enter a leprechaun hall!');
            break;
        case MORGUE:
            if (midnight()) {
                const run = u_locomotion('Run');
                await pline(`${run} away!  ${run} away!`);
            } else {
                await pline('You have an uncanny feeling...');
            }
            break;
        case BEEHIVE:
            await pline('You enter a giant beehive!');
            break;
        case COCKNEST:
            await pline('You enter a disgusting nest!');
            break;
        case ANTHOLE:
            await pline('You enter an anthole!');
            break;
        case BARRACKS:
            // monstinroom soldier check deferred — treat as occupied
            await pline('You enter a military barracks!');
            break;
        case DELPHI:
            // oracle verbalize deferred
            msg_given = false;
            break;
        case TEMPLE:
            await intemple(roomno + ROOMOFFSET);
            // FALLTHROUGH
        default:
            msg_given = (rt === TEMPLE || rt >= SHOPBASE);
            rt = 0;
            break;
        }

        // C: if (msg_given) room_discovered(roomno);
        if (msg_given) {
            const { room_discovered } = await import('./dungeon.js');
            room_discovered(roomno);
        }

        if (rt !== 0) {
            if (rooms?.[roomno]) rooms[roomno].rtype = OROOM;
            if (!search_special_rtype(rt)) {
                const flags = game.level?.flags;
                if (flags) {
                    if (rt === COURT) flags.has_court = 0;
                    else if (rt === SWAMP) flags.has_swamp = 0;
                    else if (rt === MORGUE) flags.has_morgue = 0;
                    else if (rt === ZOO) flags.has_zoo = 0;
                    else if (rt === BARRACKS) flags.has_barracks = 0;
                    else if (rt === TEMPLE) flags.has_temple = 0;
                    else if (rt === BEEHIVE) flags.has_beehive = 0;
                }
            }
            if (rt === COURT || rt === SWAMP || rt === MORGUE || rt === ZOO) {
                for (const mtmp of game.fmon || []) {
                    if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
                    const mx = mtmp.mx | 0;
                    const my = mtmp.my | 0;
                    if (!isok(mx, my)) continue;
                    const mroom = game.level?.at(mx, my)?.roomno | 0;
                    // C: roomno (0-based) != levl[].roomno (same compare)
                    if (roomno !== mroom) continue;
                    if (!Stealth && !rn2(3)) {
                        // wake_msg deferred — still clear sleep
                        mtmp.msleeping = 0;
                    }
                }
            }
        }
    }
}

/**
 * C ref: mkroom.c search_special — any remaining room/subroom of type.
 */
function search_special_rtype(type) {
    const rooms = game.level?.rooms;
    if (!rooms) return false;
    const n = (game.level.nroom | 0) + (game.level.nsubroom | 0);
    for (let i = 0; i < n; i++) {
        if ((rooms[i]?.rtype | 0) === type) return true;
    }
    return false;
}

/**
 * C ref: mkroom.c inside_room — bbox (incl. walls) or irregular roomno.
 * Local copy for in_town (mklev keeps a private twin).
 */
function inside_room_town(croom, x, y) {
    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        const loc = game.level?.at(x, y);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    return x >= (croom.lx | 0) - 1 && x <= (croom.hx | 0) + 1
        && y >= (croom.ly | 0) - 1 && y <= (croom.hy | 0) + 1;
}

/**
 * C ref: hack.c in_town — Mine Town (or whole level if no subroom parent).
 * Requires level.flags.has_town (set in fixup_special for town specials).
 */
export function in_town(x, y) {
    if (!game.level?.flags?.has_town) return false;
    const rooms = game.level.rooms;
    if (!rooms) return false;
    let has_subrooms = false;
    const n = (game.level.nroom | 0) + (game.level.nsubroom | 0);
    for (let i = 0; i < n; i++) {
        const sroom = rooms[i];
        if (!sroom || (sroom.hx | 0) <= 0) continue;
        if ((sroom.nsubrooms | 0) > 0) {
            has_subrooms = true;
            if (inside_room_town(sroom, x, y)) return true;
        }
    }
    return !has_subrooms;
}

/** C dungeon.c on_level — same dnum+dlevel. */
function on_level_dig(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C dungeon.c assign_level — copy dnum/dlevel. */
function assign_level_dig(dest, src) {
    if (!dest || !src) return;
    dest.dnum = src.dnum | 0;
    dest.dlevel = src.dlevel | 0;
}

/**
 * Local may_dig — avoid dig.js import cycle (dig.js imports in_rooms).
 * C ref: hack.c may_dig — STWALL/TREE + W_NONDIGGABLE.
 */
function may_dig_local(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    const wi = (lev.wall_info | 0) | (lev.flags | 0);
    return !((IS_STWALL(typ) || IS_TREE(typ)) && (wi & W_NONDIGGABLE));
}

/** C dungeon.c Is_special — match in sp_levchn (dissolve_bars). */
function Is_special_local(lev) {
    for (const s of game.sp_levchn || []) {
        if (on_level_dig(lev, s.dlevel)) return s;
    }
    return null;
}

/** C youprop.h H/E via flat + uprops[idx] (confer may not mirror E*). */
function _uprop_he_st(u, flatH, flatE, idx) {
    const prop = u.uprops?.[idx];
    return ((u[flatH] | 0) || (u[flatE] | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0));
}

/**
 * C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation.
 * B is u.BLevitation | uprops[LEVITATION].blocked (D-1070).
 */
function Levitation_st() {
    const u = game.u || {};
    const prop = u.uprops?.[LEVITATION];
    const blocked = (u.BLevitation | 0) || (prop?.blocked | 0);
    return !!(_uprop_he_st(u, 'HLevitation', 'ELevitation', LEVITATION)
        && !blocked);
}

/**
 * C youprop.h Flying — (H||E||steed is_flyer) && !BFlying.
 */
function Flying_st() {
    const u = game.u || {};
    const prop = u.uprops?.[FLYING];
    const blocked = (u.BFlying | 0) || (prop?.blocked | 0);
    const steedFlyer = !!(u.usteed && is_flyer(u.usteed.data));
    return !!((_uprop_he_st(u, 'HFlying', 'EFlying', FLYING) || steedFlyer)
        && !blocked);
}

/**
 * C ref: hack.c classify_terrain — set iflags.terrain_typ from
 * lastseentyp[u.ux][u.uy] with status remaps (Underwater, arboreal
 * STONE, ROOM/CORR floor vs earth ground, door open/shut,
 * DRAWBRIDGE_UP under-typ, Medusa sea / Juiblex swamp,
 * WATER→xWATERWALL off the water level). Request disp.botl when
 * flags.terrainstatus && !context.run. C youprop.h Underwater ≡
 * u.uinwater. Named omit: botl terrain_descr[] paint; options.c
 * toggle; end_running MAX_TYPE reset; dungeon.c u_on_newpos
 * MAX_TYPE; **dothrow hurtle_step D-1277**; **u_on_rndspot D-1278**;
 * **objnam wish D-1279**. **maketrap PIT/HOLE set_levltyp D-1280**.
 * digactualhole PIT/HOLE is D-1269.
 * dissolve_bars u_at is D-1259; set_uinwater is D-1267;
 * spoteffects dest-typ is D-1268.
 */
export function classify_terrain() {
    const u = game.u;
    if (!u) return;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const lev = game.level?.at(ux, uy);
    /* C: typ = svl.lastseentyp[u.ux][u.uy]; comment says lev->typ */
    let typ = game.lastseentyp?.[ux]?.[uy] | 0;

    if (u.uinwater) {
        typ = xSUBMERGED;
    } else {
        switch (typ) {
        case STONE:
            if (game.level?.flags?.arboreal) typ = TREE;
            break;
        case CORR:
        case ROOM:
            typ = !Is_earthlevel(u.uz) ? xFLOOR : xGROUND;
            break;
        case DOOR: {
            const mask = lev?.doormask | 0;
            if ((mask & D_ISOPEN) !== 0) typ = xOPENDOOR;
            else if ((mask & (D_CLOSED | D_LOCKED | D_TRAPPED)) !== 0) {
                typ = xSHUTDOOR;
            }
            break;
        }
        case DRAWBRIDGE_UP:
            typ = db_under_typ(lev?.drawbridgemask);
            if (typ === STONE || typ === ROOM) typ = xGROUND;
            break;
        case MOAT:
            if (Is_medusa_level(u.uz)) typ = xSEA;
            else if (Is_juiblex_level(u.uz)) typ = xSWAMP;
            break;
        case WATER:
            if (!Is_waterlevel(u.uz)) typ = xWATERWALL;
            break;
        default:
            break;
        }
    }

    if (!game.iflags) game.iflags = {};
    /* C: if (typ != iflags.terrain_typ); BSS 0 ≡ JS undefined|0 */
    if ((typ | 0) !== (game.iflags.terrain_typ | 0)) {
        game.iflags.terrain_typ = typ | 0;
        if (game.flags?.terrainstatus && !(game.context?.run | 0)) {
            if (!game.flags) game.flags = {};
            game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }
    }
}

/**
 * C ref: hack.c switch_terrain — moving onto different terrain may block
 * or unblock levitation/flight via B* FROMOUTSIDE (solid rock, closed
 * door, waterwall, lavawall). Skip float_down when blocking.
 * flags.terrainstatus → classify_terrain (D-1151).
 * set_uinwater change-gate is D-1267.
 * spoteffects dest-typ / MAX_TYPE is D-1268.
 * digactualhole PIT/HOLE is D-1269.
 * dothrow hurtle_step dest-typ is D-1277.
 * dungeon.c u_on_rndspot after place is D-1278.
 * objnam.c wizterrainwish after madeterrain is D-1279.
 * **maketrap PIT/HOLE set_levltyp D-1280**.
 */
export async function switch_terrain() {
    const u = game.u;
    if (!u) return;
    const lev = game.level?.at(u.ux | 0, u.uy | 0);
    if (!lev) return;
    const blocklev = !!(IS_OBSTRUCTED(lev.typ)
        || closed_door(u.ux | 0, u.uy | 0)
        || IS_WATERWALL(lev.typ)
        || (lev.typ | 0) === LAVAWALL);
    const was_levitating = !!Levitation_st();
    const was_flying = !!Flying_st();

    if (blocklev) {
        // C: stop levitating but skip float_down()
        if (Levitation_st()) {
            await pline("You can't levitate in here.");
        }
        u.BLevitation = (u.BLevitation | 0) | FROMOUTSIDE;
    } else if (u.BLevitation) {
        u.BLevitation = (u.BLevitation | 0) & ~FROMOUTSIDE;
        // C: if (Levitation || BLevitation) float_up();
        if (Levitation_st() || (u.BLevitation | 0)) {
            const { float_up } = await import('./trap.js');
            await float_up();
        }
    }
    if (blocklev) {
        if (Flying_st()) {
            await pline("You can't fly in here.");
        }
        u.BFlying = (u.BFlying | 0) | FROMOUTSIDE;
    } else if (u.BFlying) {
        u.BFlying = (u.BFlying | 0) & ~FROMOUTSIDE;
        const { float_vs_flight } = await import('./polyself.js');
        float_vs_flight();
        if (Flying_st()) {
            await pline('You start flying.');
        }
    }
    if ((!!Levitation_st() !== was_levitating)
        || (!!Flying_st() !== was_flying)) {
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    if (game.flags?.terrainstatus) classify_terrain();
}

/**
 * C ref: hack.c set_uinwater — set or clear u.uinwater; when in_out
 * differs from (int)u.uinwater, write 0/1 then switch_terrain
 * (D-1267). Same-value is a no-op. Wired: boulder_hits_pool dry-land,
 * drown fail-crawl, goto_level leave + after getlev. Named:
 * pooleffects leave-water; drown Amphibious wade / post-rescue;
 * zap freeze; cmd leave-level; detect/save bypass
 * (C writes u.uinwater directly). spoteffects dest-typ is D-1268.
 * digactualhole PIT/HOLE is D-1269. **dothrow hurtle_step D-1277**.
 * **u_on_rndspot D-1278**. **objnam wish D-1279**.
 * **maketrap PIT/HOLE set_levltyp D-1280**.
 */
export async function set_uinwater(in_out) {
    const u = game.u;
    if (!u) return;
    /* C: if (in_out != (int) u.uinwater) */
    if (in_out !== (u.uinwater | 0)) {
        u.uinwater = in_out ? 1 : 0;
        await switch_terrain();
    }
}

/**
 * C dungeon.c Invocation_lev — In_hell && dlevel == num_dunlevs-1.
 * Local clone (apply.js still has its own); dungeon.c export named.
 */
function Invocation_lev(lev) {
    if (!lev) return false;
    const dun = game.dungeons?.[lev.dnum | 0];
    if (!dun?.flags?.hellish) return false;
    return (lev.dlevel | 0) === ((dun.num_dunlevs | 0) - 1);
}

/**
 * C invent.c carrying — first matching otyp in hero invent[].
 */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (const otmp of game.invent || []) {
        if ((otmp.otyp | 0) === otyp) return otmp;
    }
    return null;
}

/**
 * C stairs.c On_stairs — stairway_at != NULL. Walk game.stairs
 * (mklev.js stairway_at) so hack.js does not import mklev.
 */
function On_stairs(x, y) {
    const sx = x | 0;
    const sy = y | 0;
    for (let s = game.stairs; s; s = s.next) {
        if ((s.sx | 0) === sx && (s.sy | 0) === sy) return true;
    }
    return false;
}

/**
 * C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded.
 * uroleplay.blind is PermaBlind (OPTIONS:blind).
 */
function Blind_im() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    const prop = u.uprops?.[BLINDED];
    const blocked = (u.BBlinded | 0) || (prop?.blocked | 0);
    return !!(_uprop_he_st(u, 'HBlinded', 'EBlinded', BLINDED) && !blocked);
}

/**
 * C hack.c invocation_pos — Invocation_lev(&u.uz) && (x,y)==svi.inv_pos.
 * Unset inv_pos is not (0,0).
 */
export function invocation_pos(x, y) {
    const u = game.u;
    if (!u || !Invocation_lev(u.uz)) return false;
    const ip = game.svi?.inv_pos || game.inv_pos;
    if (!ip) return false;
    return (x | 0) === (ip.x | 0) && (y | 0) === (ip.y | 0);
}

/**
 * C flag.h `struct accessibility_data` / `a11y`. Default Off matches
 * optlist `spot_monsters`. `opt_accessiblemsg` addr is D-1218
 * (`options.js` / `jsmain.js`). `mention_map` addr is D-1219
 * (`&a11y.glyph_updates` + `display.c` `show_glyph`). `spot_monsters`
 * addr is D-1235 (`&a11y.mon_notices`). `mon_movement` addr is
 * D-1236 (`&a11y.mon_movement`). `msg_mon_movement` dest
 * pline_xy is D-1228 (`monmove.js`). vpline consume of msg_loc is D-1207;
 * pline_xy/pline_mon writers are D-1215; set_msg_dir/pline_dir D-1216
 * (`display.js`). `cmd.c` `dolookaround` is D-1217 (`cmd.js`; newgame
 * then-arm + `#lookaround`).
 */
function a11y_state() {
    if (!game.a11y) {
        game.a11y = {
            accessiblemsg: false,
            msg_loc: { x: 0, y: 0 },
            mon_notices: false,
            mon_notices_blocked: 0,
            mon_movement: false,
            glyph_updates: false,
        };
    }
    if (typeof game.a11y.mon_notices_blocked !== 'number') {
        game.a11y.mon_notices_blocked = 0;
    }
    if (!game.a11y.msg_loc) game.a11y.msg_loc = { x: 0, y: 0 };
    return game.a11y;
}

/** C flag.h notice_mon_off — bump block around vision messages. */
export function notice_mon_off() {
    a11y_state().mon_notices_blocked++;
}

/**
 * C flag.h notice_mon_on — matching decrement. Clamp at 0
 * (`impossible("mon_notices_blocked<0")` diagnostic named).
 */
export function notice_mon_on() {
    const a = a11y_state();
    a.mon_notices_blocked--;
    if (a.mon_notices_blocked < 0) {
        a.mon_notices_blocked = 0;
    }
}

/** C hack.h distu — squared distance from hero. */
function notice_distu(x, y) {
    const u = game.u || {};
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

/**
 * C hack.c notice_mon — a11y.mon_notices You see/notice once per mspotted.
 * Hiders that are mundetected or appearing as furniture/object are not
 * "spot". Named omit: monmove.c postmov caller.
 */
export async function notice_mon(mtmp) {
    const a = a11y_state();
    if (!a.mon_notices || a.mon_notices_blocked) return;
    if (!mtmp) return;
    const hider = is_hider(mtmp.data)
        && (!!(mtmp.mundetected)
            || M_AP_TYPE(mtmp) === M_AP_FURNITURE
            || M_AP_TYPE(mtmp) === M_AP_OBJECT);
    const spot = canspotmon(mtmp) && !hider;
    if (spot && !mtmp.mspotted && (mtmp.mhp | 0) >= 1) {
        mtmp.mspotted = true;
        set_msg_xy(mtmp.mx | 0, mtmp.my | 0);
        const article = mtmp.mtame
            ? ARTICLE_YOUR
            : (!has_mgivenname(mtmp) && !type_is_pname(mtmp.data))
                ? ARTICLE_A
                : ARTICLE_NONE;
        const adj = (mtmp.mpeaceful && !mtmp.mtame) ? 'peaceful' : null;
        const suppress = has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0;
        const nam = x_monnam(mtmp, article, adj, suppress, false);
        const verb = canseemon(mtmp) ? 'see' : 'notice';
        await pline(`You ${verb} ${nam}.`);
    } else if (!spot) {
        mtmp.mspotted = false;
    }
}

/** C hack.c notice_mons_cmp — qsort by distu (stable in JS). */
function notice_mons_cmp(m1, m2) {
    return notice_distu(m1.mx, m1.my) - notice_distu(m2.mx, m2.my);
}

/**
 * C hack.c notice_all_mons — if a11y.mon_notices && !blocked, count
 * canspotmon, qsort distu, notice_mon each. reset=TRUE clears mspotted
 * on unspotted even when cnt==0 (first-loop else). Named omit:
 * vision.c vision_recalc; read.c seffect_magic_mapping;
 * wizcmds.c; save.c. do.c goto_level wrap is D-1194;
 * allmain.c newgame wrap is D-1200.
 */
export async function notice_all_mons(reset) {
    const a = a11y_state();
    if (!a.mon_notices || a.mon_notices_blocked) return;
    let cnt = 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue; // DEADMONSTER
        if (canspotmon(mtmp)) cnt++;
        else if (reset) mtmp.mspotted = false;
    }
    if (!cnt) return;

    const arr = [];
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue;
        if (!canspotmon(mtmp)) mtmp.mspotted = false;
        else arr.push(mtmp);
    }
    if (arr.length) {
        arr.sort(notice_mons_cmp);
        for (const m of arr) await notice_mon(m);
    }
}

/**
 * C hack.c invocation_message — clue when standing on the Invocation
 * square (not a stair). teleds calls this after spoteffects (D-1141);
 * walk `domove` after vision_recalc(1) (D-1150 / hack.c:2973).
 * Named omit: apply.js still uses a local invocation_pos clone;
 * shared dungeon.c Invocation_lev export. mkmaze.c inv_pos /
 * VIBRATING_SQUARE placement is D-1154.
 */
export async function invocation_message() {
    const u = game.u;
    if (!u) return;
    if (!invocation_pos(u.ux, u.uy) || On_stairs(u.ux, u.uy)) return;

    const otmp = carrying(CANDELABRUM_OF_INVOCATION);
    nomul(0); // stop running or travelling
    let buf;
    if (u.usteed) {
        buf = `beneath ${y_monnam(u.usteed)}`;
    } else if (Levitation_st() || Flying_st()) {
        buf = 'beneath you';
    } else {
        const { body_part } = await import('./polyself.js');
        buf = `under your ${makeplural(body_part(FOOT))}`;
    }
    await You_feel(`a strange vibration ${buf}.`);
    if (!u.uevent) u.uevent = {};
    u.uevent.uvibrated = 1;
    if (otmp && (otmp.spe | 0) === 7 && otmp.lamplit) {
        await pline(
            `${The(xname(otmp))} ${Blind_im() ? 'throbs palpably' : 'glows with a strange light'}!`,
        );
    }
}

/**
 * C ref: monmove.c dissolve_bars — replace IRONBARS with DOOR/ROOM/CORR.
 * After newsym, u_at → switch_terrain (D-1259). set_uinwater is
 * D-1267. spoteffects dest-typ is D-1268. digactualhole PIT/HOLE
 * is D-1269. **dothrow hurtle_step D-1277**. **u_on_rndspot D-1278**.
 * **objnam wish D-1279**.
 */
export async function dissolve_bars(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    const u = game.u || {};
    if ((lev.edge | 0) === 1) {
        lev.typ = DOOR;
    } else if (Is_special_local(u.uz) || in_rooms(x, y, 0)) {
        lev.typ = ROOM;
    } else {
        lev.typ = CORR;
    }
    lev.flags = 0;
    lev.doormask = D_NODOOR;
    newsym(x, y);
    if (u_at(x, y)) await switch_terrain();
}

/**
 * C ref: hack.c still_chewing — chew wall/door/boulder/bars.
 * Returns 1 if still eating, 0 when done (C int boolean).
 * Branch envelope: nondiggable teeth; metallivore full bars; start/continue
 * effort; finish boulder/wall/tree/IRONBARS/SDOOR/door/rock;
 * watch_dig on start/continue; shop add_damage on wall/door (D-0941);
 * pay_for_damage after chew (D-0942).
 * Named omissions: livelog first-food. Bars switch_terrain is
 * D-1259 (dissolve_bars).
 */
export async function still_chewing(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return 1;
    const boulder = sobj_at(BOULDER, x, y);
    const u = game.u || {};
    const youData = game.youmonst?.data
        || mons(u.umonnum ?? game.urole?.mnum);
    let digtxt = null;
    let dmgtxt = null;

    if (!game.context) game.context = {};
    let digging = game.context.digging;
    if (!digging) digging = game.context.digging = {};

    if (digging.down) {
        game.context.digging = digging = {};
    }

    const wi = (lev.wall_info | 0) | (lev.flags | 0);
    if (!boulder
        && ((IS_OBSTRUCTED(lev.typ) && !may_dig_local(x, y))
            || (lev.typ === IRONBARS && (wi & W_NONDIGGABLE)))) {
        const what = lev.typ === IRONBARS
            ? 'bars'
            : IS_TREE(lev.typ) ? 'tree' : 'hard stone';
        await pline(`You hurt your teeth on the ${what}.`);
        nomul(0);
        return 1;
    }
    if (lev.typ === IRONBARS
        && metallivorous(youData)
        && ((game.u?.uhunger | 0) > 1500)) {
        await pline('You are too full to eat the bars.');
        nomul(0);
        return 1;
    }

    const sameSpot = digging.chew
        && (digging.pos?.x | 0) === (x | 0)
        && (digging.pos?.y | 0) === (y | 0)
        && on_level_dig(digging.level, u.uz);
    const udaminc = u.udaminc | 0;

    // Lazy imports avoid hack → dig/shk static cycles.
    const digMod = await import('./dig.js');
    const shkMod = await import('./shk.js');

    if (!sameSpot) {
        digging.down = false;
        digging.chew = true;
        digging.warned = false;
        digging.pos = { x: x | 0, y: y | 0 };
        digging.level = { dnum: 0, dlevel: 0 };
        assign_level_dig(digging.level, u.uz);
        digging.effort = (IS_OBSTRUCTED(lev.typ) && !IS_TREE(lev.typ) ? 30 : 60)
            + udaminc;
        const onA = !!(boulder || IS_TREE(lev.typ) || lev.typ === IRONBARS);
        const what = boulder
            ? 'boulder'
            : IS_TREE(lev.typ)
                ? 'tree'
                : IS_OBSTRUCTED(lev.typ)
                    ? 'rock'
                    : lev.typ === IRONBARS
                        ? 'bar'
                        : 'door';
        await pline(`You start chewing ${onA ? 'on a' : 'a hole in the'} ${what}.`);
        await digMod.watch_dig(null, x, y, false);
        return 1;
    }

    digging.effort = (digging.effort | 0) + 30 + udaminc;
    if ((digging.effort | 0) <= 100) {
        if (game.flags?.verbose !== false) {
            const what = boulder
                ? 'boulder'
                : IS_TREE(lev.typ)
                    ? 'tree'
                    : IS_OBSTRUCTED(lev.typ)
                        ? 'rock'
                        : lev.typ === IRONBARS
                            ? 'bars'
                            : 'door';
            await pline(
                `You ${digging.chew ? 'continue' : 'begin'} chewing on the ${what}.`,
            );
        }
        digging.chew = true;
        await digMod.watch_dig(null, x, y, false);
        return 1;
    }

    // Okay, chewed through
    if (!u.uconduct) u.uconduct = {};
    u.uconduct.food = (u.uconduct.food | 0) + 1;
    // livelog deferred
    u.uhunger = (u.uhunger | 0) + rnd(20);

    if (boulder) {
        delobj(boulder);
        await pline('You eat the boulder.');
        if (IS_OBSTRUCTED(lev.typ) || closed_door(x, y) || sobj_at(BOULDER, x, y)) {
            recalc_block_point(x, y);
            game.context.digging = {};
            return 1;
        }
    } else if (IS_WALL(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE)) {
            shkMod.add_damage(x, y, shkMod.shop_wall_dmg());
            dmgtxt = 'damage';
        }
        digtxt = 'chew a hole in the wall.';
        if (game.level?.flags?.is_maze_lev) {
            lev.typ = ROOM;
        } else if (game.level?.flags?.is_cavernous_lev && !in_town(x, y)) {
            lev.typ = CORR;
        } else {
            lev.typ = DOOR;
            lev.doormask = D_NODOOR;
        }
    } else if (IS_TREE(lev.typ)) {
        digtxt = 'chew through the tree.';
        lev.typ = ROOM;
    } else if (lev.typ === IRONBARS) {
        if (metallivorous(youData)) {
            const nut = (game.objects?.[HEAVY_IRON_BALL]?.oc_weight | 0);
            morehungry(-nut);
        }
        digtxt = ((u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0))
            ? 'devour the iron bars.'
            : 'eat through the bars.';
        await dissolve_bars(x, y);
    } else if (lev.typ === SDOOR) {
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            await b_trapped('secret door', NO_PART);
        } else {
            digtxt = 'chew through the secret door.';
            lev.doormask = D_BROKEN;
        }
        lev.typ = DOOR;
    } else if (IS_DOOR(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE)) {
            shkMod.add_damage(x, y, SHOP_DOOR_COST);
            dmgtxt = 'break';
        }
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            await b_trapped('door', NO_PART);
        } else {
            digtxt = 'chew through the door.';
            lev.doormask = D_BROKEN;
        }
    } else {
        digtxt = 'chew a passage through the rock.';
        lev.typ = CORR;
    }

    recalc_block_point(x, y);
    newsym(x, y);
    if (digtxt) await pline(`You ${digtxt}`);
    if (dmgtxt) await shkMod.pay_for_damage(dmgtxt, false);
    game.context.digging = {};
    return 0;
}

const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const LEVITATION_BOOTS = objectNames.indexOf('LEVITATION_BOOTS');

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE. */
function is_weptool_hack(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== P_NONE;
}

/**
 * C ref: hack.c dosinkfall — land on sink while levitating/flying.
 * Branch envelope: innate/blocked wobble vs flight control vs crash
 * (rn1 dmg + floor weapons + exercise); stop_donning; strip arti/timeout
 * lev + RIN_LEVITATION / LEVITATION_BOOTS; float_vs_flight.
 * Named omissions: Boots_off LEVITATION float_down
 * side-effect (HLevitation++ bracket still prevents mid-strip land).
 */
export async function dosinkfall() {
    const fell_on_sink = 'fell onto a sink';
    const u = game.u || (game.u = {});
    let lev_boots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS);
    const innate_lev = ((u.HLevitation | 0) & (FROMOUTSIDE | FROMFORM)) !== 0;
    /* chained to buried iron ball blocking lev — BLevitation == I_SPECIAL */
    const blockd_lev = ((u.BLevitation | 0) === I_SPECIAL);
    const ufall = (!innate_lev && !blockd_lev
        && !((u.HFlying | 0) || (u.EFlying | 0) || u.Flying)); /* BFlying */

    if (!ufall) {
        await pline((innate_lev || blockd_lev)
            ? 'You wobble unsteadily for a moment.'
            : 'You gain control of your flight.');
    } else {
        const save_ELev = u.ELevitation | 0;
        const save_HLev = u.HLevitation | 0;
        /* fake removal so fatal disclosure is right; rings/boots still worn */
        u.ELevitation = 0;
        u.HLevitation = 0;
        await pline('You crash to the floor!');
        const dmg = rn1(8, 25 - (acurr(A_CON) | 0));
        losehp(maybe_half_phys(dmg), fell_on_sink, NO_KILLER_PREFIX);
        await finish_maybe_wail();
        if (game._losehp_needs_done) {
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            return;
        }
        exercise(A_DEX, false);
        await selftouch('Falling, you');
        const { doname } = await import('./objnam.js');
        for (let obj = objects_at(u.ux | 0, u.uy | 0); obj; obj = obj.nexthere) {
            if (obj.oclass === WEAPON_CLASS || is_weptool_hack(obj)) {
                await pline(`You fell on ${doname(obj)}.`);
                losehp(
                    maybe_half_phys(rnd(3)),
                    fell_on_sink,
                    NO_KILLER_PREFIX,
                );
                await finish_maybe_wail();
                if (game._losehp_needs_done) {
                    const { finish_losehp_done } = await import('./end.js');
                    await finish_losehp_done();
                    return;
                }
                exercise(A_CON, false);
            }
        }
        u.ELevitation = save_ELev;
        u.HLevitation = save_HLev;
    }

    /*
     * Interrupt multi-turn putting on/taking off of armor (teleport onto
     * sink while busy). Also when lev boots will be stripped without fall.
     */
    if (ufall || lev_boots) {
        const { stop_donning } = await import('./do_wear.js');
        await stop_donning(lev_boots ? u.uarmf : null);
        lev_boots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS);
    }

    /* remove worn levitation items */
    u.ELevitation = (u.ELevitation | 0) & ~W_ARTI;
    u.HLevitation = (u.HLevitation | 0) & ~(I_SPECIAL | TIMEOUT);
    u.HLevitation = (u.HLevitation | 0) + 1; /* keep Levitation true during Ring/Boots_off */
    const {
        Ring_off, Boots_off, off_msg,
    } = await import('./do_wear.js');
    if (u.uleft && (u.uleft.otyp | 0) === RIN_LEVITATION) {
        const obj = u.uleft;
        await Ring_off(obj);
        await off_msg(obj);
    }
    if (u.uright && (u.uright.otyp | 0) === RIN_LEVITATION) {
        const obj = u.uright;
        await Ring_off(obj);
        await off_msg(obj);
    }
    if (lev_boots) {
        const obj = u.uarmf;
        await Boots_off();
        await off_msg(obj);
    }
    u.HLevitation = (u.HLevitation | 0) - 1;
    const { float_vs_flight } = await import('./polyself.js');
    float_vs_flight();
}
