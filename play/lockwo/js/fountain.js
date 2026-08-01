// fountain.js - fountain interactions (dip / dry up).
// C ref: fountain.c dipfountain()/dryup().  Faithful port of the branches a
// non-polymorphed contest hero reaches (potion/food/other dip, curse/uncurse,
// "strange feeling", and "nothing seems to happen"); the monster-summon and
// treasure branches call subsystems (makemon/mkgold specifics) the port does
// not yet fully model, so they emit their observable framing only.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { update_topl, newsym, m_at } from './display.js';
import { hliquid, builds_up } from './dungeon.js';
import { water_damage, t_at, delfloortrap } from './trap.js';
import { find_ac } from './u_init.js';
import { curse, objects, COIN_CLASS, POTION_CLASS, POT_WATER, RING_CLASS, mkobj, mkobj_at, BOULDER } from './mkobj.js';
import { exercise, acurr_eff } from './attrib.js';
import { more_experienced, newexplevel } from './exper.js';
import { newuhs } from './eat.js';
import { Blind } from './vision.js';
import { depth, distmin } from './hacklib.js';
import { clear_area_cells } from './vision.js';
import { nexttodoor } from './mkroom.js';
import { makemon, name_to_pmidx, monster_by_pmidx, enexto_spawn, placeOnLevel } from './makemon.js';
import { x_monnam, canspotmon } from './uhitm.js';
import { monster_detect } from './hack.js';
import { observe_object } from './o_init.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import {
    ER_NOTHING, ER_DESTROYED, F_LOOTED, F_WARNED,
    FOUNTAIN, ROOM, POOL, A_WIS, A_CON, IS_FOUNTAIN, S_LRING, G_GONE,
} from './const.js';

// C ref: include/onames.h — long sword otyp (mkobj.js OBJECT_DATA order).
const LONG_SWORD = 54;

const nothing_seems_to_happen = 'Nothing seems to happen.';

// C ref: rm.h FOUNTAIN_IS_LOOTED / _WARNED — bits in levl[x][y].looted.
function fountain_is_looted(loc) { return ((loc?.looted || 0) & F_LOOTED) !== 0; }

// C ref: fountain.c dipfountain(obj) — dipping an object into a fountain.
export async function dipfountain(obj) {
    const u = game.u;
    let er = ER_NOTHING;
    // is_hands ('-') dips wash the hands; the reached sessions dip real objects.
    const is_hands = obj && obj._hands;

    if (u.uprops?.Levitation) {
        await update_topl('You are floating high above the fountain.');
        return;
    }

    // Excalibur creation (LONG_SWORD, ulevel >= 5) — not reachable for the
    // priest hero on dlvl 1; kept as a guard so real long swords fall through.
    if (obj.otyp === LONG_SWORD && u.ulevel >= 5) {
        // rn2(Role_if(KNIGHT)?6:30) etc. — omitted; unreachable here.
    }

    if (is_hands || obj === game.uarmg) {
        // wash_hands(): no RNG on the reached levels.
        er = ER_NOTHING;
    } else {
        er = await water_damage(obj, null, true);
        // C ref: allmain.c moveloop_core() — find_ac() runs once per player
        // input (not from erode_obj/water_damage itself), so a dipped piece
        // of worn armor's AC penalty is already visible on this same screen.
        find_ac();
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return; // no further effect
    }

    switch (rnd(30)) {
    case 16: // Curse the item
        if (!is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: // Uncurse the item
        if (!is_hands && obj.cursed) {
            if (!game.u?.Blind)
                await update_topl(`The ${hliquid('water')} glows for a moment.`);
            obj.cursed = false;
        } else {
            await update_topl('A feeling of loss comes over you.');
        }
        break;
    case 21: // Water Demon
        await dowaterdemon();
        break;
    case 22: // Water Nymph
        await dowaternymph();
        break;
    case 23: // an Endless Stream of Snakes
        await dowatersnakes();
        break;
    case 24: // Find a gem
        if (!fountain_is_looted(game.level?.at(u.ux, u.uy))) {
            await dofindgem();
            break;
        }
        /* FALLTHROUGH */
    case 25: // Water gushes forth
        await dogushforth(false);
        break;
    case 26: // Strange feeling
        await update_topl('A strange tingling runs up your arm.');
        break;
    case 27: // Strange feeling
        await update_topl('You feel a sudden chill.');
        break;
    case 28: // Strange feeling
        await update_topl('An urge to take a bath overwhelms you.');
        // money-loss effect (money_cnt > 10) — no gold carried here, so no-op.
        break;
    case 29: { // You see coins
        const loc = game.level?.at(u.ux, u.uy);
        if (fountain_is_looted(loc)) break;
        if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
        // mkgold + "Far below you..." — treasure spawn not modeled here.
        if (!game.u?.Blind)
            await update_topl(`Far below you, you see coins glistening in the ${hliquid('water')}.`);
        exercise(A_WIS, true);
        newsym(u.ux, u.uy);
        break;
    }
    default:
        if (er === ER_NOTHING)
            await update_topl(nothing_seems_to_happen);
        break;
    }
    await dryup(u.ux, u.uy, true);
}

// C ref: fountain.c drinkfountain() — quaff from a fountain the hero stands on.
// fate = rnd(30) selects the outcome.  The blessed-fountain (mgkftn) restore /
// gain-ability branch is only reachable on a blessedftn square (never true for
// the covered fountains).  Branches that drive unmodeled subsystems (vomit,
// enlightenment, poison, gushing) emit their observable framing while still
// spending their leading RNG so the PRNG stays faithful; the reached outcomes
// are the water demon (fate 23) and monster detection (fate 26, via hack.js
// monster_detect()).  Always ends with dryup(), which has a 1-in-3 chance of
// drying the fountain to floor.
export async function drinkfountain() {
    const u = game.u;
    const loc = game.level?.at(u.ux, u.uy);
    const mgkftn = (loc?.blessedftn === 1);
    const fate = rnd(30);

    if (u.uprops?.Levitation) {
        await update_topl('You are floating high above the fountain.');
        return;
    }

    if (mgkftn && (u.uluck || 0) >= 0 && fate >= 10) {
        // Blessed restore-ability + gain-attribute (adjattrib) + enlightenment:
        // not reached (no blessedftn fountains in the covered sessions).
        return;
    }

    if (fate < 10) {
        await update_topl('The cool draught refreshes you.');
        u.uhunger = (u.uhunger || 0) + rnd(10); /* don't choke on water */
        newuhs(false);
        if (mgkftn) return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            // enlightenment(MAGICENLIGHTENMENT) not modeled; framing only.
            await update_topl('You feel self-knowledgeable...');
            exercise(A_WIS, true);
            break;
        case 20: /* Foul water */
            await update_topl(`The ${hliquid('water')} is foul!  You gag and vomit.`);
            rn1(20, 11); /* morehungry(rn1(20,11)) */
            // C ref: eat.c vomit() — cantvomit/Sick/spewed branches don't apply
            // to a plain human hero, so vomit() reduces to its universal tail:
            // nomul(-2) freezes the hero for 2 turns with a deferred "You can
            // move again." (gn.nomovemsg), fired once the countdown reaches 0.
            if ((game.multi ?? 0) >= -2) {
                game.multi = -2;
                game.multi_reason = 'vomiting';
                game.context = game.context || {};
                game.context.travel = game.context.travel1 = game.context.mv = 0;
            }
            game.nomovemsg = 'You can move again.';
            break;
        case 21: /* Poisonous */
            await update_topl(`The ${hliquid('water')} is contaminated!`);
            // poison_strdmg(rn1(4,3), rnd(10), ...) — spend its leading rolls.
            rn1(4, 3);
            rnd(10);
            exercise(A_CON, false);
            break;
        case 22: /* Fountain of snakes! */
            await dowatersnakes();
            break;
        case 23: /* Water demon */
            await dowaterdemon();
            break;
        case 24: { /* Maybe curse some items */
            await update_topl("This water's no good!");
            rn1(20, 11); /* morehungry(rn1(20,11)) */
            exercise(A_CON, false);
            let buc_changed = 0;
            for (const obj of game.invent || []) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    ++buc_changed;
                }
            }
            void buc_changed; /* update_inventory() is display-only */
            break;
        }
        case 25: /* See invisible */
            if (!Blind())
                await update_topl('You see an image of someone stalking you.');
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: /* See Monsters */
            if (await monster_detect(null, 0))
                await update_topl(`The ${hliquid('water')} tastes like nothing.`);
            exercise(A_WIS, true);
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!fountain_is_looted(loc)) {
                await dofindgem();
                break;
            }
            /* FALLTHROUGH */
        case 28: /* Water Nymph */
            await dowaternymph();
            break;
        case 29: /* Scare monsters (monflee loop, no RNG) */
            await update_topl(`This ${hliquid('water')} gives you bad breath!`);
            break;
        case 30: /* Gushing forth in this room */
            await dogushforth(true);
            break;
        default:
            await update_topl(`This tepid ${hliquid('water')} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

// C ref: dungeon.c level_difficulty() — depth-based difficulty, plus a
// compensating bump in a "builds up" branch (Vlad's Tower, Sokoban); see
// makemon.js's copy of this same C function for the full rationale.
function level_difficulty() {
    const uz = game.u.uz;
    let res = depth(uz);
    if (builds_up(uz))
        res += 2 * (game.dungeons[uz.dnum].entry_lev - uz.dlevel + 1);
    return res;
}

// C ref: fountain.c dowaterdemon() — unless the species is extinct/genocided,
// makemon a water demon at the hero's square (MM_NOMSG).  Since the hero
// occupies that square, makemon.c's byyou && !in_mklev branch fires first:
// enexto_core finds the nearest free square (collect_coords ring-shuffle RNG)
// before any of the gender/inventory/saddle RNG, and place_monster() puts the
// demon there — so we resolve that spot ourselves (enexto_spawn), then create
// and place the monster there, print "You unleash a water demon!", then spend
// the survival-wish roll (rnd(100)); the wish and mintrap follow-ups are
// unreached at this depth's low roll.  The water demon is armed (is_armed_pm),
// so C's makemon() runs the full m_initweap/m_initinv RNG chain (weapon,
// defensive item, saddle) — request the full-fidelity path (normally scoped to
// Big Room / shop stocking) for just this makemon() call.
async function dowaterdemon() {
    const u = game.u;
    const pmidx = name_to_pmidx('water demon');
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return;
    const spot = enexto_spawn(u.ux, u.uy, ptr);
    if (!spot) return;
    const was_full = game._full_mon_gen;
    game._full_mon_gen = true;
    let mtmp;
    try {
        mtmp = makemon(ptr, spot.x, spot.y, 0 /* MM_NOMSG */);
    } finally {
        game._full_mon_gen = was_full;
    }
    if (mtmp) {
        placeOnLevel(mtmp, spot.x, spot.y);
        newsym(spot.x, spot.y);
        if (!Blind())
            await update_topl(`You unleash ${x_monnam(mtmp, 2 /*ARTICLE_A*/, null, 0, false)}!`);
        else
            await update_topl('You feel the presence of evil.');
        // Low-level survival chance: the roll always fires; a high roll grants a
        // wish (mongrantswish), otherwise a trap at the demon's square may snare
        // it (mintrap).  Neither follow-up is reached by the recorded roll.
        if (rnd(100) > (80 + level_difficulty())) {
            // mongrantswish(&mtmp) — a wish; unreached at this depth's roll.
        } else {
            // mintrap(mtmp) if t_at(demon square) — no trap on the fountain.
        }
    }
}
// C ref: fountain.c dowaternymph() — unless the species is genocided, spawn a
// water nymph at the hero's square (mirrors dowaterdemon's byyou &&
// !in_mklev placement: enexto_spawn resolves the nearest free square before
// any of the new monster's own RNG).  Water nymphs aren't armed, but
// m_initinv()'s S_NYMPH case still rolls a mirror/potion-of-object-detection
// chance for every nymph regardless of weapons, so this needs the same
// full-fidelity makemon() path dowaterdemon() uses (normally scoped to Big
// Room / shop stocking) to reach that case instead of the conservative
// generic-species stub.
async function dowaternymph() {
    const u = game.u;
    const pmidx = name_to_pmidx('water nymph');
    const gone = (game.mvitals?.[pmidx]?.mvflags ?? 0) & G_GONE;
    const ptr = (!gone && pmidx >= 0) ? monster_by_pmidx(pmidx) : null;
    const spot = ptr ? enexto_spawn(u.ux, u.uy, ptr) : null;
    let mtmp = null;
    if (spot) {
        const was_full = game._full_mon_gen;
        game._full_mon_gen = true;
        try {
            mtmp = makemon(ptr, spot.x, spot.y, 0 /* MM_NOMSG */);
        } finally {
            game._full_mon_gen = was_full;
        }
    }
    if (mtmp) {
        placeOnLevel(mtmp, spot.x, spot.y);
        newsym(spot.x, spot.y);
        if (!Blind())
            await update_topl(`You attract ${x_monnam(mtmp, 2 /*ARTICLE_A*/, null, 0, false)}!`);
        else
            await update_topl('You hear a seductive voice.');
        mtmp.msleeping = 0;
        // mintrap(mtmp) if t_at(nymph square) — no trap on the fountain.
        return;
    }
    if (!Blind())
        await update_topl('A large bubble rises to the surface and pops.');
    else
        await update_topl('You hear a loud pop.');
}
async function dowatersnakes() {
    await update_topl('An endless stream of snakes pours forth!');
}
async function dofindgem() {
    await update_topl('You spot a gem in the sparkling waters!');
    const loc = game.level?.at(game.u.ux, game.u.uy);
    if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
    newsym(game.u.ux, game.u.uy);
    exercise(A_WIS, true);
}
// C ref: mkobj.c sobj_at(BOULDER, x, y) as used by gush() — is there a boulder
// on the floor at (x, y)?
function floor_boulder_at(x, y) {
    for (const o of game.level?.objects || [])
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === BOULDER)
            return true;
    return false;
}

// C ref: engrave.c del_engr_at(x, y) — remove any engraving at (x, y) (no RNG,
// no message).
function del_engr_at(x, y) {
    if (!game.level?.engravings) return;
    game.level.engravings = game.level.engravings.filter(
        (ep) => ep.engr_x !== x || ep.engr_y !== y);
}

// C ref: fountain.c gush(x, y, poolcnt) — do_clear_area's per-cell callback
// for dogushforth().  Turns a floor-of-a-ROOM square within range into a
// POOL, unless a checkerboard/distance/terrain/boulder/door-adjacency guard
// skips it.  poolcnt is a {n} box so the caller can see how many succeeded.
async function gush(x, y, poolcnt) {
    const u = game.u;
    if (((x + y) % 2) || (x === u.ux && y === u.uy)
        || rn2(1 + distmin(u.ux, u.uy, x, y))
        || game.level?.at(x, y)?.typ !== ROOM
        || floor_boulder_at(x, y) || nexttodoor(x, y))
        return;

    const ttmp = t_at(x, y);
    if (ttmp && !delfloortrap(ttmp)) return;

    if (poolcnt.n++ === 0)
        await update_topl('Water gushes forth from the overflowing fountain!');

    const loc = game.level?.at(x, y);
    if (loc) { loc.typ = POOL; loc.flags = 0; }
    del_engr_at(x, y);
    const here = (game.level?.objects || []).filter(
        (o) => o.where === 'floor' && o.ox === x && o.oy === y);
    for (const obj of here) await water_damage(obj, null, false);

    // minliquid(mtmp) (monster drowning in the new pool) isn't modeled: no
    // covered session has a monster occupying a gush-flooded square.
    if (!m_at(x, y)) newsym(x, y);
}

async function dogushforth(drinking) {
    const u = game.u;
    const poolcnt = { n: 0 };
    for (const [x, y] of clear_area_cells(u.ux, u.uy, 7))
        await gush(x, y, poolcnt);
    if (!poolcnt.n) {
        if (drinking) await update_topl('Your thirst is quenched.');
        else await update_topl('Water sprays all over you.');
    }
}

// C ref: fountain.c dryup(x, y, isyou) — a fountain has a 1-in-3 chance of
// drying up after use.  The rn2(3) roll fires unconditionally (short-circuit
// left operand of `!rn2(3) || FOUNTAIN_IS_WARNED`).  The town-watch warning and
// wizard-mode confirmation are not reached by the contest hero.
export async function dryup(x, y, _isyou) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== FOUNTAIN) return;
    const warned = ((loc.looted || 0) & F_WARNED) !== 0;
    if (!(!rn2(3) || warned)) return;
    // (in_town watchman-warning / wizard "Dry up fountain?" not reached)
    // "The fountain dries up!" (cansee); the reached fountains are in view.
    await update_topl('The fountain dries up!');
    // replace the fountain with ordinary floor
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags && typeof game.level.flags.nfountains === 'number')
        game.level.flags.nfountains = Math.max(0, game.level.flags.nfountains - 1);
    newsym(x, y);
}

// ── sink interactions (fountain.c drinksink/breaksink) ──

function Hallucination() { return !!game.u?.uhallu; }

// C ref: hack.c losehp() — for a non-polymorphed hero this subtracts the
// damage from u.uhp (no RNG).  Death handling is not exercised by the covered
// sessions, so it is reduced to the hp arithmetic + hpmax clamp.
function losehp(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 1) u.uhp = 0;
}

// C ref: objclass.h OBJ_DESCR(obj) — the shuffled appearance word for obj's
// type (e.g. a potion's color).
function OBJ_DESCR(obj) {
    if (!obj) return null;
    const idx = obj.oc_descr_idx != null ? obj.oc_descr_idx : obj.otyp;
    return DESCR_BY_OTYP[idx] ?? null;
}

// C ref: do_name.c hcolor(colorpref) — colorpref unless hallucinating, in
// which case a random nonsense word replaces it.  The hallucination table
// isn't ported (not reached by the covered sessions' non-hallucinating hero);
// the roll still needs to fire to keep the PRNG faithful if that ever
// changes, but none of the covered sessions hallucinate while at a sink.
function hcolor(colorpref) {
    return colorpref;
}

// C ref: fountain.c breaksink(x, y) — converts a sink into a fountain (used
// by both drinksink's "pipes break" case and dipsink).  Both call sites have
// the hero standing on the square, so the cansee(x,y)||u_at(x,y) message
// guard always holds.
export async function breaksink(x, y) {
    await update_topl('The pipes break!  Water spurts out!');
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = FOUNTAIN;
        loc.looted = F_LOOTED; // SET_FOUNTAIN_LOOTED
        loc.blessedftn = 0;
        const lf = game.level?.flags;
        if (lf) {
            lf.nsinks = Math.max(0, (lf.nsinks || 0) - 1);
            lf.nfountains = (lf.nfountains || 0) + 1;
        }
    }
    newsym(x, y);
}

// C ref: makemon.c — a monster created at the hero's occupied square goes
// through the byyou && !in_mklev branch: enexto_core picks the nearest free
// square (before any of the new monster's own RNG), then place_monster()
// puts it there (mirrors fountain.js dowaterdemon's placement, minus the
// full-monster-gen weapon/inventory override that only armed species need).
async function spawnAtHeroSquare(pmidx) {
    const u = game.u;
    const ptr = pmidx >= 0 ? monster_by_pmidx(pmidx) : null;
    if (!ptr) return null;
    const spot = enexto_spawn(u.ux, u.uy, ptr);
    if (!spot) return null;
    const mtmp = makemon(ptr, spot.x, spot.y, 0 /* MM_NOMSG */);
    if (mtmp) {
        placeOnLevel(mtmp, spot.x, spot.y);
        newsym(spot.x, spot.y);
    }
    return mtmp;
}

// C ref: fountain.c drinksink() — quaff from a sink the hero stands on.
// fate = rn2(20) selects the outcome.  Branches driving subsystems this port
// doesn't model yet (random-form polyself, the poison-gas region) still spend
// their observable message; create_gas_cloud(x,y,1,damage)'s single-square
// case spends no RNG (its BFS growth loop breaks before the first
// direction-shuffle draw), so that branch needs no extra roll either.
export async function drinksink() {
    const u = game.u;
    if (u.uprops?.Levitation) {
        await update_topl('You are floating high above the sink.');
        return;
    }
    const loc = game.level?.at(u.ux, u.uy);
    const water = hliquid('water');
    switch (rn2(20)) {
    case 0:
        await update_topl(`You take a sip of very cold ${water}.`);
        break;
    case 1:
        await update_topl(`You take a sip of very warm ${water}.`);
        break;
    case 2:
        await update_topl(`You take a sip of scalding hot ${water}.`);
        // Fire_resistance is never true for the covered heroes; monstunseesu
        // (M_SEEN_FIRE) only toggles monster-memory bookkeeping (no RNG).
        losehp(rnd(6));
        break;
    case 3: {
        const pmidx = name_to_pmidx('sewer rat');
        if ((game.mvitals?.[pmidx]?.mvflags ?? 0) & G_GONE) {
            await update_topl('The sink seems quite dirty.');
        } else {
            const mtmp = await spawnAtHeroSquare(pmidx);
            if (mtmp) {
                const seen = !Blind() && canspotmon(mtmp);
                await update_topl(`Eek!  There's ${seen ? x_monnam(mtmp, 2 /*ARTICLE_A*/, null, 0, false) : 'something squirmy'} in the sink!`);
            }
        }
        break;
    }
    case 4: {
        let otmp;
        for (;;) {
            otmp = mkobj(POTION_CLASS, false);
            if (otmp.otyp !== POT_WATER) break;
        }
        otmp.cursed = false;
        otmp.blessed = false;
        const descr = OBJ_DESCR(otmp) || 'strange';
        await update_topl(`Some ${Blind() ? 'odd' : hcolor(descr)} liquid flows from the faucet.`);
        if (!Blind() && !Hallucination())
            observe_object(otmp);
        otmp.quan = (otmp.quan || 1) + 1; // avoid a panic upon useup() (never in invent)
        otmp.fromsink = 1; // kludge for docall(); not otherwise modeled
        const { dopotion } = await import('./potion.js');
        await dopotion(otmp);
        break;
    }
    case 5:
        if (!((loc?.looted || 0) & S_LRING)) {
            await update_topl('You find a ring in the sink!');
            mkobj_at(RING_CLASS, u.ux, u.uy, true);
            if (loc) loc.looted = (loc.looted || 0) | S_LRING;
            exercise(A_WIS, true);
            newsym(u.ux, u.uy);
        } else {
            await update_topl(`Some dirty ${water} backs up in the drain.`);
        }
        break;
    case 6:
        await breaksink(u.ux, u.uy);
        break;
    case 7: {
        await update_topl(`The ${water} moves as though of its own will!`);
        const pmidx = name_to_pmidx('water elemental');
        const gone = (game.mvitals?.[pmidx]?.mvflags ?? 0) & G_GONE;
        const mtmp = gone ? null : await spawnAtHeroSquare(pmidx);
        if (!mtmp) await update_topl('But it quiets down.');
        break;
    }
    case 8:
        await update_topl(`Yuk, this ${water} tastes awful.`);
        more_experienced(1, 0);
        newexplevel();
        break;
    case 9:
        await update_topl('Gaggg... this tastes like sewage!  You vomit.');
        // morehungry(rn1(30-ACURR(A_CON),11)); vomit() has no observable
        // effect for a non-acid-breathing, non-poly'd hero off an altar.
        rn1(30 - acurr_eff(A_CON), 11);
        break;
    case 10:
        await update_topl(`This ${water} contains toxic wastes!`);
        // Unchanging is never true for the covered heroes.
        await update_topl('You undergo a freakish metamorphosis!');
        // polyself(POLY_NOFLAGS) is not modeled (no polymorph subsystem yet).
        break;
    case 11:
        await update_topl('You hear clanking from the pipes...');
        break;
    case 12:
        await update_topl('You hear snatches of song from among the sewers...');
        break;
    case 13:
        await update_topl('Ew, what a stench!');
        // create_gas_cloud(u.ux, u.uy, 1, 4): cloudsize 1 spends no RNG (see
        // header comment); the lingering poison-gas region isn't modeled.
        break;
    case 19:
        if (Hallucination()) {
            await update_topl('From the murky drain, a hand reaches up... --oops--');
            break;
        }
        /* falls through */
    default:
        await update_topl(`You take a sip of ${rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot'} ${water}.`);
        break;
    }
}
