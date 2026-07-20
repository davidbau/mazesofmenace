// ball.js — Ball & chain placement / drag (partial).
// C ref: ball.c placebc / placebc_core / move_bc / drag_ball / bc_order /
//         drag_down / ballrelease / litter.
//
// Named omissions: Blind move_bc glyph/felt arms (sighted path live);
// flooreffects rust; bcrestriction / breadcrumbs; ballfall / drop_ball;
// litter hitfloor/shop/impact (place at feet); Soundeffect in drag_down;
// jerked-back hmon/miss body (rnd(20) still burned); unpunish; set_bc.

import { game } from './gstate.js';
import { place_object, obj_extract_self, objects_at } from './mkobj.js';
import { newsym, pline, You_feel, cls } from './display.js';
import {
    OBJ_FREE, BC_BALL, BC_CHAIN, IS_OBSTRUCTED, IS_DOOR,
    D_CLOSED, D_LOCKED, POOL, is_pit, is_hole, SLT_ENCUMBER,
    W_ARMOR, W_ACCESSORY, W_SADDLE, A_STR, NO_KILLER_PREFIX, KILLED_BY_AN,
} from './const.js';
import { dist2, distmin } from './hacklib.js';
import { is_pool, nomul, losehp, maybe_half_phys } from './hack.js';
import { near_capacity, weight_cap, encumber_msg } from './invent.js';
import { rn2, rnd } from './rng.js';
import { t_at } from './trap.js';
import { mon_at } from './uhitm.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { exercise } from './attrib.js';
import { xname } from './objnam.js';

/** C ref: ball.c BCPOS_* — stacking order when ball&chain share a cell. */
const BCPOS_DIFFER = 0;
const BCPOS_CHAIN = 1;
const BCPOS_BALL = 2;

function carried(obj) {
    if (!obj) return false;
    const invent = game.invent || [];
    return invent.includes(obj);
}

/** Remove from invent without placing on floor (C invent.c freeinv subset). */
function freeinv_ball(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.nobj = null;
    obj.where = OBJ_FREE;
}

/**
 * Silent canletgo for litter (word="") — avoid do.js import cycle.
 * C ref: do.c canletgo worn/weld/saddle gates when word empty.
 */
function canletgo_silent(obj) {
    if (!obj) return false;
    const mask = obj.owornmask || 0;
    if (mask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) return false;
    const u = game.u || {};
    if (obj === u.uwep && welded(u.uwep)) return false;
    return true;
}

/**
 * C ref: ball.c ballrelease — drop carried iron ball (not welded).
 * @param {boolean} showmsg
 */
export async function ballrelease(showmsg) {
    const u = game.u || {};
    const uball = u.uball;
    if (!carried(uball) || welded(uball)) return;
    if (showmsg) await pline('Startled, you drop the iron ball.');
    if (u.uwep === uball) setuwep(null);
    if (u.uswapwep === uball) setuswapwep(null);
    if (u.uquiver === uball) setuqwep(null);
    freeinv_ball(uball);
    await encumber_msg();
}

/**
 * C ref: ball.c litter — rnd(capacity) may force-drop invent downstairs.
 * Named omission: hitfloor impact/shop/altar (place at hero feet).
 */
async function litter() {
    const u = game.u || {};
    const uball = u.uball;
    const capacity = weight_cap();
    const invent = game.invent || [];
    // Snapshot — freeinv mutates invent during iteration (C nextobj).
    const snapshot = invent.slice();
    for (const otmp of snapshot) {
        if (otmp === uball) continue;
        if (rnd(capacity) > (otmp.owt | 0)) continue;
        if (!canletgo_silent(otmp)) continue;
        const yn = xname(otmp);
        const plural = (otmp.quan | 0) !== 1;
        await pline(
            `You drop ${yn} and ${plural ? 'they' : 'it'} `
            + `${plural ? 'fall' : 'falls'} down the stairs with you.`,
        );
        // setnotworn subset
        if (u.uwep === otmp) setuwep(null);
        if (u.uswapwep === otmp) setuswapwep(null);
        if (u.uquiver === otmp) setuqwep(null);
        for (const slot of [
            'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
            'uleft', 'uright', 'uamul', 'ublindf',
        ]) {
            if (u[slot] === otmp) u[slot] = null;
        }
        otmp.owornmask = 0;
        freeinv_ball(otmp);
        // hitfloor deferred — place at feet like ordinary dropz
        place_object(otmp, u.ux | 0, u.uy | 0);
        newsym(u.ux | 0, u.uy | 0);
    }
}

/**
 * C ref: ball.c drag_down — Punished stair-fall ball smash/drag RNG.
 * Soundeffect deferred (no RNG).
 */
export async function drag_down() {
    const u = game.u || {};
    const uball = u.uball;
    if (!uball) return;

    let dragchance = 3;
    // C: forward = carried(uball) && (uwep == uball || !uwep || !rn2(3));
    const forward = carried(uball)
        && (u.uwep === uball || !u.uwep || !rn2(3));

    if (carried(uball) && !welded(uball)) {
        await pline('You lose your grip on the iron ball.');
    }

    // C: cls() — clear stale prior-level map before damage plines
    await cls();

    if (forward) {
        if (rn2(6)) {
            await pline('The iron ball drags you downstairs!');
            losehp(
                maybe_half_phys(rnd(6)),
                'dragged downstairs by an iron ball',
                NO_KILLER_PREFIX,
            );
            await litter();
        }
    } else {
        if (rn2(2)) {
            // Soundeffect(se_iron_ball_hits_you, 25) deferred
            await pline('The iron ball smacks into you!');
            losehp(
                maybe_half_phys(rnd(20)),
                'iron ball collision',
                KILLED_BY_AN,
            );
            exercise(A_STR, false);
            dragchance -= 2;
        }
        if (dragchance >= rnd(6)) {
            await pline('The iron ball drags you downstairs!');
            losehp(
                maybe_half_phys(rnd(3)),
                'dragged downstairs by an iron ball',
                NO_KILLER_PREFIX,
            );
            exercise(A_STR, false);
            await litter();
        }
    }
}

/**
 * C ref: ball.c bc_order — stacking of uball/uchain when punished.
 */
function bc_order() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return BCPOS_DIFFER;
    if ((uchain.ox | 0) !== (uball.ox | 0)
        || (uchain.oy | 0) !== (uball.oy | 0)
        || carried(uball)
        || (u.uswallow | 0)) {
        return BCPOS_DIFFER;
    }
    for (let obj = objects_at(uball.ox | 0, uball.oy | 0); obj;
        obj = obj.nexthere) {
        if (obj === uchain) return BCPOS_CHAIN;
        if (obj === uball) return BCPOS_BALL;
    }
    return BCPOS_DIFFER;
}

function is_chain_rock(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    if (IS_DOOR(loc.typ)
        && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED))) {
        return true;
    }
    return false;
}

/**
 * C ref: ball.c placebc → placebc_core.
 * Places uball (if not carried) and uchain under the hero.
 * Named omissions: flooreffects rust; bcrestriction / breadcrumbs.
 */
export function placebc() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uchain || !uball) return;
    // C: if (uchain && uchain->where != OBJ_FREE) impossible; return
    if (uchain.where != null && uchain.where !== OBJ_FREE) return;

    // flooreffects(uchain/uball) deferred (iron — no RNG on ordinary floors)
    // C: carried(uball) → skip floor place; else place_object(uball)
    if (carried(uball)) {
        u.bc_order = BCPOS_DIFFER;
    } else {
        place_object(uball, u.ux | 0, u.uy | 0);
        u.bc_order = BCPOS_CHAIN;
    }
    place_object(uchain, u.ux | 0, u.uy | 0);
    newsym(u.ux | 0, u.uy | 0);
}

/**
 * C ref: ball.c unplacebc → unplacebc_core.
 * Extract ball&chain from the floor before leaving a level (goto_level).
 * Named omissions: Blind glyph restore; maybe_unhide_at; waterlevel swallow.
 */
export function unplacebc() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return;

    // C: swallowed → leave bc placed (except waterlevel arm deferred)
    if (u.uswallow | 0) return;

    if (!carried(uball)) {
        const bx = uball.ox | 0;
        const by = uball.oy | 0;
        obj_extract_self(uball);
        // Blind bglyph / maybe_unhide_at deferred
        newsym(bx, by);
    }
    const cx = uchain.ox | 0;
    const cy = uchain.oy | 0;
    obj_extract_self(uchain);
    newsym(cx, cy);
    u.bc_felt = 0;
}

/**
 * C ref: ball.c move_bc — pick up (before) / put down (after) ball&chain.
 * Sighted path ported; Blind glyph/felt arms deferred (still movobj).
 */
export function move_bc(before, control, ballx, bally, chainx, chainy) {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uball || !uchain) return;

    const Blind = !!(u.Blind || u.ublind
        || (((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0)));

    if (Blind) {
        // Blind felt/glyph arms deferred — still relocate when !before
        if (!before) {
            if ((control & BC_CHAIN) && (control & BC_BALL)) {
                if (!carried(uball)) {
                    obj_extract_self(uball);
                    place_object(uball, ballx, bally);
                }
                obj_extract_self(uchain);
                place_object(uchain, chainx, chainy);
                newsym(ballx, bally);
                newsym(chainx, chainy);
            } else if (control & BC_BALL) {
                if (!carried(uball)) {
                    obj_extract_self(uball);
                    place_object(uball, ballx, bally);
                    newsym(ballx, bally);
                }
            } else if (control & BC_CHAIN) {
                obj_extract_self(uchain);
                place_object(uchain, chainx, chainy);
                newsym(chainx, chainy);
            }
            u.bc_order = bc_order();
        }
        return;
    }

    // Sighted path — C ball.c move_bc else branch
    if (before) {
        if (!control) u.bc_order = bc_order();
        obj_extract_self(uchain);
        // maybe_unhide_at deferred
        newsym(uchain.ox | 0, uchain.oy | 0);
        if (!carried(uball)) {
            obj_extract_self(uball);
            newsym(uball.ox | 0, uball.oy | 0);
        }
    } else {
        const on_floor = !carried(uball);
        if ((control & BC_CHAIN)
            || (!control && (u.bc_order | 0) === BCPOS_CHAIN)) {
            if (on_floor) place_object(uball, ballx, bally);
            place_object(uchain, chainx, chainy); // chain on top
        } else {
            place_object(uchain, chainx, chainy);
            if (on_floor) place_object(uball, ballx, bally);
        }
        newsym(chainx, chainy);
        if (on_floor) newsym(ballx, bally);
    }
}

/**
 * C ref: ball.c drag_ball — compute ball/chain targets before hero move.
 * Returns { ok, bc_control, ballx, bally, chainx, chainy, cause_delay }.
 * ok=false → abort the move (encumber / jerked-back).
 */
export async function drag_ball(x, y, allow_drag = true) {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    const out = {
        ok: true,
        bc_control: 0,
        ballx: uball?.ox | 0,
        bally: uball?.oy | 0,
        chainx: uchain?.ox | 0,
        chainy: uchain?.oy | 0,
        cause_delay: false,
    };
    if (!uball || !uchain) return out;

    out.ballx = uball.ox | 0;
    out.bally = uball.oy | 0;
    out.chainx = uchain.ox | 0;
    out.chainy = uchain.oy | 0;

    // C: dist2(x,y,uchain) <= 2 → nothing moved
    if (dist2(x, y, uchain.ox | 0, uchain.oy | 0) <= 2) {
        move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
        return out;
    }

    // only need to move the chain?
    if (carried(uball)
        || distmin(x, y, uball.ox | 0, uball.oy | 0) <= 2) {
        const oldchainx = uchain.ox | 0;
        const oldchainy = uchain.oy | 0;
        out.bc_control = BC_CHAIN;
        move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);

        if (carried(uball)) {
            if (distmin(x, y, uchain.ox | 0, uchain.oy | 0) > 1) {
                out.chainx = u.ux | 0;
                out.chainy = u.uy | 0;
            }
            return out;
        }

        const chain_in_middle = (chx, chy) => (
            distmin(x, y, chx, chy) <= 1
            && distmin(chx, chy, uball.ox | 0, uball.oy | 0) <= 1
        );

        let already_in_rock = false;
        if (is_chain_rock(u.ux | 0, u.uy | 0)
            || is_chain_rock(out.chainx, out.chainy)
            || is_chain_rock(uball.ox | 0, uball.oy | 0)) {
            already_in_rock = true;
        }

        const skip_to_drag = () => {
            out.chainx = oldchainx;
            out.chainy = oldchainy;
            move_bc(0, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
            return 'drag';
        };

        let gotoDrag = false;
        switch (dist2(x, y, uball.ox | 0, uball.oy | 0)) {
        case 8:
            out.chainx = Math.trunc(((uball.ox | 0) + x) / 2);
            out.chainy = Math.trunc(((uball.oy | 0) + y) / 2);
            if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            }
            break;

        case 5: {
            let tempx, tempy, tempx2, tempy2;
            if (Math.abs(x - (uball.ox | 0)) === 1) {
                tempx = x;
                tempx2 = uball.ox | 0;
                tempy = tempy2 = Math.trunc(((uball.oy | 0) + y) / 2);
            } else {
                tempx = tempx2 = Math.trunc(((uball.ox | 0) + x) / 2);
                tempy = y;
                tempy2 = uball.oy | 0;
            }
            if (is_chain_rock(tempx, tempy) && !is_chain_rock(tempx2, tempy2)
                && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 5
                        && dist2(x, y, tempx, tempy) === 1) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 4
                        && dist2(x, y, tempx, tempy) === 2) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                }
                out.chainx = tempx2;
                out.chainy = tempy2;
            } else if (!is_chain_rock(tempx, tempy)
                && is_chain_rock(tempx2, tempy2) && !already_in_rock) {
                if (allow_drag) {
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 5
                        && dist2(x, y, tempx2, tempy2) === 1) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                    if (dist2(u.ux | 0, u.uy | 0, uball.ox | 0, uball.oy | 0) === 4
                        && dist2(x, y, tempx2, tempy2) === 2) {
                        if (skip_to_drag() === 'drag') { gotoDrag = true; break; }
                    }
                }
                out.chainx = tempx;
                out.chainy = tempy;
            } else if (is_chain_rock(tempx, tempy)
                && is_chain_rock(tempx2, tempy2) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            } else if (
                dist2(tempx, tempy, uchain.ox | 0, uchain.oy | 0)
                    < dist2(tempx2, tempy2, uchain.ox | 0, uchain.oy | 0)
                || ((dist2(tempx, tempy, uchain.ox | 0, uchain.oy | 0)
                    === dist2(tempx2, tempy2, uchain.ox | 0, uchain.oy | 0))
                    && rn2(2))
            ) {
                out.chainx = tempx;
                out.chainy = tempy;
            } else {
                out.chainx = tempx2;
                out.chainy = tempy2;
            }
            break;
        }

        case 4:
            if (chain_in_middle(uchain.ox | 0, uchain.oy | 0)) break;
            out.chainx = Math.trunc((x + (uball.ox | 0)) / 2);
            out.chainy = Math.trunc((y + (uball.oy | 0)) / 2);
            if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                if (skip_to_drag() === 'drag') gotoDrag = true;
            }
            break;

        case 2:
            if (dist2(x, y, uball.ox | 0, uball.oy | 0) === 2
                && dist2(x, y, uchain.ox | 0, uchain.oy | 0) === 4) {
                if ((uchain.oy | 0) === y) out.chainx = uball.ox | 0;
                else out.chainy = uball.oy | 0;
                if (is_chain_rock(out.chainx, out.chainy) && !already_in_rock) {
                    if (skip_to_drag() === 'drag') gotoDrag = true;
                }
                break;
            }
            // FALLTHROUGH
        case 1:
        case 0:
            if (chain_in_middle(uchain.ox | 0, uchain.oy | 0)) break;
            if (chain_in_middle(u.ux | 0, u.uy | 0)) {
                out.chainx = u.ux | 0;
                out.chainy = u.uy | 0;
                break;
            }
            out.chainx = x;
            out.chainy = y;
            break;

        default:
            break;
        }

        if (!gotoDrag) return out;
        // fall through to drag:
    }

    // drag: path — pull ball+chain
    if (near_capacity() > SLT_ENCUMBER
        && dist2(x, y, u.ux | 0, u.uy | 0) <= 2) {
        const invent = game.invent || [];
        await pline(
            `You cannot ${invent.length ? 'carry all that and also ' : ''}drag the heavy iron ball.`,
        );
        nomul(0);
        out.ok = false;
        return out;
    }

    {
        const cox = uchain.ox | 0;
        const coy = uchain.oy | 0;
        const box = uball.ox | 0;
        const boy = uball.oy | 0;
        const cloc = game.level?.at(cox, coy);
        const t = t_at(cox, coy);
        const pool_jerk = is_pool(cox, coy)
            && (cloc?.typ === POOL
                || !is_pool(box, boy)
                || game.level?.at(box, boy)?.typ === POOL);
        const pit_jerk = t && (is_pit(t.ttyp) || is_hole(t.ttyp));

        if (pool_jerk || pit_jerk) {
            const Levitation = !!(u.Levitation || u.Lev);
            if (Levitation) {
                await You_feel('a tug from the iron ball.');
                if (t) t.tseen = 1;
            } else {
                await pline('You are jerked back by the iron ball!');
                const victim = mon_at(cox, coy);
                if (victim) {
                    // C: dieroll = rnd(20); hmon/miss body deferred — burn roll
                    void rnd(20);
                }
                if (!mon_at(cox, coy)) {
                    u.ux = cox;
                    u.uy = coy;
                    newsym(u.ux0 | 0, u.uy0 | 0);
                }
                nomul(0);
                out.bc_control = BC_BALL;
                move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
                out.ballx = cox;
                out.bally = coy;
                move_bc(0, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);
                // spoteffects caller-side deferred for abort path
                out.ok = false;
                return out;
            }
        }
    }

    out.bc_control = BC_BALL | BC_CHAIN;
    move_bc(1, out.bc_control, out.ballx, out.bally, out.chainx, out.chainy);

    if (dist2(x, y, u.ux | 0, u.uy | 0) > 2) {
        out.ballx = out.chainx = x;
        out.bally = out.chainy = y;
    } else {
        let newchainx = u.ux | 0;
        let newchainy = u.uy | 0;
        if (dist2(x, y, uchain.ox | 0, uchain.oy | 0) === 4
            && !is_chain_rock(newchainx, newchainy)) {
            newchainx = Math.trunc((x + (uchain.ox | 0)) / 2);
            newchainy = Math.trunc((y + (uchain.oy | 0)) / 2);
            if (is_chain_rock(newchainx, newchainy)) {
                newchainx = u.ux | 0;
                newchainy = u.uy | 0;
            }
        }
        out.ballx = uchain.ox | 0;
        out.bally = uchain.oy | 0;
        out.chainx = newchainx;
        out.chainy = newchainy;
    }
    out.cause_delay = true;
    return out;
}
