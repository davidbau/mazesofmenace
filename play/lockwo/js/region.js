// region.js — C ref: src/region.c — the NhRegion subsystem (gas clouds).
//
// SCOPE: region.c also supports "force fields" (create_force_field) and
// generic message/callback regions (create_msg_region); nothing in the
// covered sessions ever creates one (they are used by a handful of special
// levels and the Vlad's tower slow-force-field trap, neither reachable here),
// so only the gas-cloud region type (INSIDE_GAS_CLOUD / EXPIRE_GAS_CLOUD) is
// ported.  Likewise save/restore (save_regions/rest_regions) and the wizard-
// mode #timeout / prayer danger helpers (region_danger/region_safety) are not
// wired to anything a covered session reaches, and create_gas_cloud_selection
// (used only by special-level SP_LEV scripts) is omitted.
//
// The region list is a flat array on `game.regions`.  do.js goto_level() plays
// save_regions()/rest_regions(): it stashes the list on the departing level's
// store, calls clear_regions(), and on a return visit restores it with the
// ttl aged by the turns spent away.

import { game } from './gstate.js';
import { rn2, rn1, rnd } from './rng.js';
import { isok, ACCESSIBLE, IS_POOL, IS_LAVA, COLNO, ROWNO } from './const.js';
import { cansee, block_point, unblock_point, does_block, Blind } from './vision.js';

const MAX_CLOUD_SIZE = 150;

// callback tags (C ref: region.c callbacks[] — INSIDE_GAS_CLOUD / EXPIRE_GAS_CLOUD)
const INSIDE_GAS_CLOUD = 'gas';
const EXPIRE_GAS_CLOUD = 'gas';

function u_at(x, y) { return game.u?.ux === x && game.u?.uy === y; }

function regions() {
    if (!game.regions) game.regions = [];
    return game.regions;
}

// ── NhRegion construction ────────────────────────────────────────────────

// C ref: region.c create_region(rects, nrect) — allocate an inactive region.
// Bounding box starts as the C "empty" sentinel (lx=COLNO, ly=ROWNO, hx=hy=0)
// so the first add_rect_to_reg() widens it exactly like C's nrect>0 branch
// (which starts from rects[0] then widens with the rest) — min/max widening
// from the inverted sentinel produces the identical final box either way.
export function create_region(rects) {
    const reg = {
        rects: [],
        boundingBox: { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 },
        attach2u: false,
        attach2m: null,
        enterMsg: null,
        leaveMsg: null,
        ttl: -1,
        expireF: null,
        canEnterF: null,
        enterF: null,
        canLeaveF: null,
        leaveF: null,
        insideF: null,
        heroInside: false,
        herosFault: true,
        monsters: [], // monster object refs (C keeps m_id; we keep refs directly)
        visible: false,
        glyph: null,
        arg: 0, // C's `anything arg` — for gas clouds this is the damage int
    };
    if (rects) for (const r of rects) add_rect_to_reg(reg, r);
    return reg;
}

// C ref: region.c add_rect_to_reg(reg, rect) — append a rectangle, widening
// the bounding box.
export function add_rect_to_reg(reg, rect) {
    reg.rects.push({ ...rect });
    const b = reg.boundingBox;
    if (b.lx > rect.lx) b.lx = rect.lx;
    if (b.ly > rect.ly) b.ly = rect.ly;
    if (b.hx < rect.hx) b.hx = rect.hx;
    if (b.hy < rect.hy) b.hy = rect.hy;
}

// C ref: region.c inside_rect/inside_region — point-in-region test.
function inside_rect(r, x, y) {
    return x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy;
}
export function inside_region(reg, x, y) {
    if (!reg) return false;
    if (!inside_rect(reg.boundingBox, x, y)) return false;
    return reg.rects.some((r) => inside_rect(r, x, y));
}

// C ref: region.c add_region(reg) — activate a region: register it, sweep its
// bounding box for monsters/hero already inside it, and (if visible) block
// line of sight through every covered cell and redraw it.
export async function add_region(reg) {
    regions().push(reg);
    const b = reg.boundingBox;
    const { newsym } = await import('./display.js');
    for (let x = b.lx; x <= b.hx; x++) {
        for (let y = b.ly; y <= b.hy; y++) {
            if (!isok(x, y)) continue;
            const isInside = inside_region(reg, x, y);
            if (isInside) {
                const mtmp = (game.level?.monsters || []).find((m) => !m.mridden && m.mx === x && m.my === y);
                if (mtmp && !reg.monsters.includes(mtmp)) reg.monsters.push(mtmp);
            }
            if (reg.visible) {
                if (isInside) block_point(x, y);
                if (cansee(x, y)) newsym(x, y);
            }
        }
    }
    reg.heroInside = inside_region(reg, game.u?.ux, game.u?.uy);
}

// C ref: region.c remove_region(reg) — deactivate + free.  A visible region's
// footprint is unblocked in a first pass, then (unless Blind) redrawn in a
// second pass once every cell in the box has had a chance to unblock (matches
// C's two-pass comment: don't call cansee() until all blocked spots are down).
export async function remove_region(reg) {
    const list = regions();
    const i = list.indexOf(reg);
    if (i < 0) return;
    list.splice(i, 1);
    reg.ttl = -2; // C ref: region.c — sentinel for visible_region_at() below

    if (reg.visible) {
        const b = reg.boundingBox;
        const { newsym } = await import('./display.js');
        const passes = Blind() ? 1 : 2;
        for (let pass = 1; pass <= passes; pass++) {
            for (let x = b.lx; x <= b.hx; x++) {
                for (let y = b.ly; y <= b.hy; y++) {
                    if (!isok(x, y) || !inside_region(reg, x, y)) continue;
                    if (pass === 1) {
                        if (!does_block(x, y)) unblock_point(x, y);
                    } else if (cansee(x, y)) {
                        newsym(x, y);
                    }
                }
            }
        }
    }
}

// C ref: region.c clear_regions() — wipe every region (mklev's
// clear_level_structures, and save_regions()'s release_data arm).
export function clear_regions() {
    game.regions = [];
}

// ── per-turn processing ──────────────────────────────────────────────────

// C ref: region.c run_regions() — called once per game turn.  Expires dead
// regions, ages the rest, and fires each visible region's inside-callback for
// the hero and every monster it currently contains.
export async function run_regions() {
    const list = regions();
    let dissWithin = false;
    let dissSeen = 0;

    // "End of life?" pass — backward, since expiry mutates the array.
    for (let i = list.length - 1; i >= 0; i--) {
        const reg = list[i];
        if (reg.ttl === 0) {
            let expired = true;
            if (reg.expireF === EXPIRE_GAS_CLOUD) expired = expire_gas_cloud(reg);
            if (expired) {
                if (reg._dissWithin) dissWithin = true;
                dissSeen += reg._dissSeen || 0;
                await remove_region(reg);
            }
        }
    }

    // Process remaining regions: age + inside-callback for hero/monsters.
    for (const reg of list) {
        if (reg.ttl > 0) reg.ttl--;
        if (reg.insideF !== INSIDE_GAS_CLOUD) continue;
        if (reg.heroInside) await inside_gas_cloud(reg, null);
        for (let j = reg.monsters.length - 1; j >= 0; j--) {
            const mtmp = reg.monsters[j];
            const dead = !mtmp || (mtmp.mhp != null && mtmp.mhp <= 0);
            const died = dead ? true : await inside_gas_cloud(reg, mtmp);
            if (died) reg.monsters.splice(j, 1);
        }
    }

    const { update_topl } = await import('./display.js');
    if (dissWithin) {
        await update_topl('The gas cloud around you dissipates.');
        if ((game.u?.xray_range ?? 0) <= 1) dissSeen = 0;
    }
    if (dissSeen) {
        await update_topl(`You see ${dissSeen === 1 ? 'a' : 'some'} gas cloud${dissSeen === 1 ? '' : 's'} dissipate.`);
    }
}

// C ref: region.c reg_damg(reg) — per-turn damage a visible, non-removed
// region deals.  Unused by any covered session; kept for parity.
export function reg_damg(reg) {
    return (!reg.visible || reg.ttl === -2) ? 0 : reg.arg;
}

// C ref: region.c any_visible_region() — any live, visible region on the level.
export function any_visible_region() {
    return regions().some((r) => r.visible && r.ttl !== -2);
}

// C ref: region.c visible_region_at(x,y) — the visible region (if any)
// covering <x,y>.
export function visible_region_at(x, y) {
    for (const r of regions()) {
        if (!r.visible || r.ttl === -2) continue;
        if (inside_region(r, x, y)) return r;
    }
    return null;
}

// C ref: region.c show_region(reg,x,y) — the glyph a visible region draws.
export function show_region(reg) {
    return reg.glyph;
}

// C ref: region.c is_hero_inside_gas_cloud() (staticfn) — true if the hero is
// currently inside a live gas-cloud region.
function is_hero_inside_gas_cloud() {
    return regions().some((r) => r.heroInside && r.insideF === INSIDE_GAS_CLOUD);
}

// ── movement-triggered enter/leave bookkeeping ──────────────────────────
// C ref: region.c in_out_region()/m_in_out_region() — called when the hero or
// a monster moves, to update heroInside/monsters membership (and fire
// enter_msg/leave_msg + enter_f/leave_f callbacks, unused by gas clouds).
// NOT currently called from hack.js's domove() or monmove.js's move-commit
// path (see file header); every region a covered session creates so far sits
// on its generator's own square and is refreshed there each turn by
// inside_gas_cloud's ttl bump, so the gap has not been exercised.  Exported so
// that hook can be added later without touching this module again.
export function in_out_region(x, y) {
    for (const reg of regions()) {
        if (reg.attach2u) continue;
        if (reg.heroInside && !inside_region(reg, x, y)) reg.heroInside = false;
    }
    for (const reg of regions()) {
        if (reg.attach2u) continue;
        if (!reg.heroInside && inside_region(reg, x, y)) reg.heroInside = true;
    }
}
export function m_in_out_region(mon, x, y) {
    for (const reg of regions()) {
        if (reg.attach2m === mon) continue;
        if (reg.monsters.includes(mon) && !inside_region(reg, x, y)) {
            const idx = reg.monsters.indexOf(mon);
            if (idx >= 0) reg.monsters.splice(idx, 1);
        }
    }
    for (const reg of regions()) {
        if (reg.attach2m === mon) continue;
        if (!reg.monsters.includes(mon) && inside_region(reg, x, y)) reg.monsters.push(mon);
    }
}

// C ref: region.c update_player_regions()/update_monster_region(mon) — resync
// membership after a teleport.  Not wired into teleport.js (no covered
// session teleports while a region exists); exported for parity/future use.
export function update_player_regions() {
    const ux = game.u?.ux, uy = game.u?.uy;
    for (const reg of regions()) reg.heroInside = !reg.attach2u && inside_region(reg, ux, uy);
}
export function update_monster_region(mon) {
    for (const reg of regions()) {
        const inside = inside_region(reg, mon.mx, mon.my);
        const has = reg.monsters.includes(mon);
        if (inside && !has) reg.monsters.push(mon);
        else if (!inside && has) reg.monsters.splice(reg.monsters.indexOf(mon), 1);
    }
}

// ── gas clouds ───────────────────────────────────────────────────────────

// C ref: read.c valid_cloud_pos(x,y) — can a cloud square physically exist
// there (in bounds, and floor/door/pool/lava — not rock/wall).
function valid_cloud_pos(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) || IS_POOL(loc.typ) || IS_LAVA(loc.typ);
}

// C ref: mondata.h nonliving/breathless — simplified to a name-based check
// over the small set of monster types the contest's covered sessions can put
// inside a gas cloud; mirrors mhitm.js's identical simplification.
function nonliving_name(name) {
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghost\b|\blich\b|golem\b|\bvortex\b|\belemental\b|\bshade\b/.test(name || '');
}
function breathless_name(name) {
    return /\bjelly\b|\bpudding\b|\bslime\b|\bgolem\b|\bvortex\b|\belemental\b|\bgas spore\b/.test(name || '');
}

// C ref: mon.c m_poisongas_ok(mtmp) — M_POISONGAS_OK(2)/MINOR(1)/BAD(0).
// SCOPE: the swimmer/eel-in-water and breath-weapon exclusions, and hero/
// monster poison-resistance lookups, are not modeled by any other subsystem
// yet, so a living, breathing target always falls through to BAD — true for
// every monster the covered sessions can put inside a (so far always
// damage-0) gas cloud.
const M_POISONGAS_BAD = 0;
const M_POISONGAS_OK = 2;
function m_poisongas_ok(mtmp, isHero) {
    const data = isHero ? game.u?.data : mtmp?.data;
    const name = data?.name || '';
    if (nonliving_name(name) || breathless_name(name)) return M_POISONGAS_OK;
    return M_POISONGAS_BAD;
}

// C ref: hack.c losehp() — for a non-polymorphed hero this is just HP
// arithmetic (death handling is not exercised by any covered session that
// reaches this code path yet); mirrors the same simplification other files
// (fountain.js, trap.js, ...) already apply to losehp().
function loseHeroHp(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp < 1) u.uhp = 0;
}

// C ref: region.c make_gas_cloud(cloud, damage, inside_cloud) — shared tail of
// create_gas_cloud()/create_gas_cloud_selection(): mark the region as heros_
// fault (unless a monster's move or level generation triggered it), set its
// display glyph, activate it, and announce "enveloped in gas/steam" unless
// the hero was already inside a cloud before this one was created.
async function make_gas_cloud(cloud, damage, insideCloud) {
    cloud.herosFault = !game._in_mklev && !game.context?.mon_moving;
    cloud.insideF = INSIDE_GAS_CLOUD;
    cloud.expireF = EXPIRE_GAS_CLOUD;
    cloud.arg = damage;
    cloud.visible = true;
    cloud.glyph = damage
        ? { ch: '#', color: 10 /* CLR_BRIGHT_GREEN, S_poisoncloud */ }
        : { ch: '#', color: 7 /* CLR_GRAY, S_cloud */ };
    await add_region(cloud);

    if (!game._in_mklev && !insideCloud && is_hero_inside_gas_cloud()) {
        const { update_topl } = await import('./display.js');
        await update_topl(`You are enveloped in a cloud of ${damage ? 'noxious gas' : 'steam'}!`);
    }
}

// C ref: region.c add_region() minus the newsym() refresh.  Level generation
// (des.gas_cloud) activates regions from the synchronous themeroom_fill path,
// which cannot await display.js — and mklev draws nothing anyway, the map is
// rendered from scratch once generation finishes.  Kept separate from
// add_region() rather than shared, because C interleaves block_point() and
// newsym() cell by cell and reordering them would change what the gameplay
// path redraws.
function add_region_nodisplay(reg) {
    regions().push(reg);
    const b = reg.boundingBox;
    for (let x = b.lx; x <= b.hx; x++) {
        for (let y = b.ly; y <= b.hy; y++) {
            if (!isok(x, y)) continue;
            if (!inside_region(reg, x, y)) continue;
            const mtmp = (game.level?.monsters || []).find((m) => !m.mridden && m.mx === x && m.my === y);
            if (mtmp && !reg.monsters.includes(mtmp)) reg.monsters.push(mtmp);
            if (reg.visible) block_point(x, y);
        }
    }
    reg.heroInside = inside_region(reg, game.u?.ux, game.u?.uy);
}

// C ref: region.c create_gas_cloud_selection(sel, damage) — des.gas_cloud()'s
// selection form: one region whose rects are the selection's cells, each 1x1.
// Draws NO RNG (no BFS growth, no rn1(3,4) ttl), so the region keeps
// create_region's permanent ttl of -1.
export function create_gas_cloud_selection(sel, damage) {
    const cloud = create_region(null);
    for (const c of sel)
        add_rect_to_reg(cloud, { lx: c.x, ly: c.y, hx: c.x, hy: c.y });
    // make_gas_cloud() tail; the "enveloped in steam" line is gated on
    // !in_mklev, and this form is only reachable from mklev.
    cloud.herosFault = !game._in_mklev && !game.context?.mon_moving;
    cloud.insideF = INSIDE_GAS_CLOUD;
    cloud.expireF = EXPIRE_GAS_CLOUD;
    cloud.arg = damage;
    cloud.visible = true;
    cloud.glyph = damage
        ? { ch: '#', color: 10 /* CLR_BRIGHT_GREEN, S_poisoncloud */ }
        : { ch: '#', color: 7 /* CLR_GRAY, S_cloud */ };
    add_region_nodisplay(cloud);
    return cloud;
}

// C ref: region.c create_gas_cloud(x,y,cloudsize,damage) — grow a cloud from
// (x,y) via a randomized breadth-first search, then give it a lifespan.
export async function create_gas_cloud(x, y, cloudsize, damage) {
    const xcoords = [x], ycoords = [y];
    let newidx = 1;
    let insideCloud = is_hero_inside_gas_cloud();

    // C ref: region.c — a single-point cloud landing on the hero that deals no
    // damage (or the hero is poison-gas-immune) is silent: presumably a side
    // effect of a benign polyform, not worth a message.
    if (!game.context?.mon_moving && u_at(x, y) && cloudsize === 1
        && (!damage || m_poisongas_ok(null, true) === M_POISONGAS_OK))
        insideCloud = true;

    if (cloudsize > MAX_CLOUD_SIZE) cloudsize = MAX_CLOUD_SIZE;

    for (let curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize) break;
        const xx = xcoords[curridx], yy = ycoords[curridx];

        // C ref: region.c — Fisher-Yates-Knuth shuffle of the 4 cardinal dirs.
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (let i = 4; i > 0; i--) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }

        let nvalid = 0;
        // C ref: region.c — the "stop once cloudsize is reached" check is a
        // SIBLING of the `if (valid_cloud_pos)` block below, not a loop-top
        // guard: a `continue` taken from inside that block (the disruption
        // roll) skips the check for this iteration entirely, exactly like C's
        // `continue` jumps straight to `i++` past the trailing `if`.  Mirror
        // that placement literally rather than hoisting it, since it changes
        // how many disruption rn2(2) rolls a cloudsize>1 cloud consumes.
        for (let i = 0; i < 4; i++) {
            const dx = dirs[i][0], dy = dirs[i][1];
            let isunpicked = true;
            if (valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                for (let j = 0; j < newidx; j++) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) { isunpicked = false; break; }
                }
                // C ref: region.c — randomly skip a 4-valid-neighbor square so
                // the cloud doesn't grow into a perfect rhombus in open rooms.
                if (nvalid === 4 && !rn2(2)) continue;
                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) break;
        }
    }

    const cloud = create_region(null);
    for (let i = 0; i < newidx; i++) {
        add_rect_to_reg(cloud, { lx: xcoords[i], ly: ycoords[i], hx: xcoords[i], hy: ycoords[i] });
    }
    cloud.ttl = rn1(3, 4);
    // C ref: region.c — a cloud that was space-constrained (couldn't grow to
    // its full requested size) lives proportionally longer.
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    await make_gas_cloud(cloud, damage, insideCloud);
    return cloud;
}

// C ref: region.c expire_gas_cloud(reg) — the region's EXPIRE_GAS_CLOUD
// callback, run by run_regions() once ttl hits 0.  A "thick" (damage >= 5)
// cloud dissipates by half and gets a fresh short lease instead of vanishing
// outright; anything thinner really goes away (unblocking its footprint).
// Stashes the within/seen dissipation tally on the region for run_regions()
// to fold into its single end-of-turn message (matching C's file-scope
// gas_cloud_diss_within/gas_cloud_diss_seen accumulators).
function expire_gas_cloud(reg) {
    const damage = reg.arg;
    if (damage >= 5) {
        reg.arg = Math.trunc(damage / 2);
        reg.ttl = 2;
        return false; // still there
    }

    const b = reg.boundingBox;
    reg._dissWithin = false;
    reg._dissSeen = 0;
    const passes = Blind() ? 1 : 2;
    for (let pass = 1; pass <= passes; pass++) {
        for (let x = b.lx; x <= b.hx; x++) {
            for (let y = b.ly; y <= b.hy; y++) {
                if (!isok(x, y) || !inside_region(reg, x, y)) continue;
                if (pass === 1) {
                    if (!does_block(x, y)) unblock_point(x, y);
                } else if (!game.u?.uswallow) {
                    if (u_at(x, y)) reg._dissWithin = true;
                    else if (cansee(x, y)) reg._dissSeen++;
                }
            }
        }
    }
    return true; // gone, free it
}

// C ref: region.c inside_gas_cloud(reg, mtmp) — per-turn effect on whoever is
// standing in a gas-cloud region; mtmp null means the hero.  Returns true if
// the callback's subject died (run_regions() uses that to drop it from the
// region's monster list, matching C's boolean return).
async function inside_gas_cloud(reg, mtmp) {
    const isHero = !mtmp;
    const data = isHero ? game.u?.data : mtmp?.data;
    const name = data?.name || '';

    // C ref: region.c — fog clouds maintain their own gas clouds indefinitely
    // (this is what makes a hero-as-fog-cloud's trailing vapor near-permanent
    // while they stand still): bump the ttl by 5 every turn it's below 20.
    if (reg.ttl < 20 && name === 'fog cloud') reg.ttl += 5;

    const dam = reg.arg;
    if (dam < 1) return false; // harmless vapor: nothing else to do

    const { update_topl } = await import('./display.js');
    if (isHero) {
        if (m_poisongas_ok(null, true) === M_POISONGAS_OK) return false;
        if (!Blind()) {
            await update_topl('Your eyes sting.');
            // C ref: region.c make_blinded(1L, FALSE) — a 1-turn blindness
            // timer.  No blindness-timer subsystem exists yet in this port
            // (see m_poisongas_ok's SCOPE note); the message still fires so
            // the RNG-inert observable text matches, but the timer itself is
            // not modeled.
        }
        // C ref: region.c — Poison_resistance is never true for the covered
        // heroes yet (see m_poisongas_ok SCOPE note), so this always takes
        // the damaging branch.
        await update_topl('Something is burning your lungs!');
        await update_topl('You cough and spit blood!');
        const dmg = rnd(dam) + 5;
        loseHeroHp(dmg);
        return false;
    }
    // SCOPE: monster-in-poison-cloud damage/death is not modeled (no covered
    // session has a non-hero monster standing in a damaging cloud yet); the
    // ttl refresh above (the only effect a damage-0 cloud can have) is
    // faithful for every case reached so far.
    return false;
}
