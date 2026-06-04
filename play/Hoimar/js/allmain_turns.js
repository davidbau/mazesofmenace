import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dosounds } from './sounds.js';
import {
    A_CHA, A_CON, A_DEX, A_INT, A_STR, A_WIS,
    EXT_ENCUMBER, HVY_ENCUMBER, MOD_ENCUMBER,
    W_AMUL, W_RINGL, W_RINGR,
} from './const.js';
import { OBJECT_CHARGED } from './object_data.js';
import { adj_erinys, makemon } from './mklev.js';
import { depth } from './hacklib.js';
import { wipeoutText } from './random_text.js';
import { BURN, DUST, ENGR_BLOOD, HEADSTONE, ICE } from './const.js';

const RING_CLASS = 4;
const AMULET_CLASS = 5;
const RIN_PROTECTION = 178;
const RIN_REGENERATION = 179;
const RIN_SLOW_DIGESTION = 193;
const MEAT_RING = 270;
const FAKE_AMULET_OF_YENDOR = 212;
const AMULET_OF_YENDOR = 213;

export async function maybe_generate_rnd_mon() {
    // C ref: allmain.c:maybe_generate_rnd_mon().
    const denom = game.u?.uevent?.udemigod ? 25
        : (game.stronghold_level && depth(game.u?.uz) > depth(game.stronghold_level)) ? 50
            : 70;
    if (!rn2(denom)) await makemon(null, 0, 0, 0);
}

export function regen_hp() {
    // C ref: allmain.c:regen_hp().  This owns the ordinary non-polymorphed
    // regeneration roll once the hero has actually taken HP damage.
    const u = game.u;
    if (!u || u.uinvulnerable || (u.uhp ?? 0) >= (u.uhpmax ?? 0)) return false;
    const ringRegen = !!u.uprops?.hp_regeneration
        || wornRing(W_RINGL, 'left')?.otyp === RIN_REGENERATION
        || wornRing(W_RINGR, 'right')?.otyp === RIN_REGENERATION;
    let heal = ((u.ulevel || 0) + currentAttr(A_CON)) > rn2(100) ? 1 : 0;
    if (ringRegen) heal++;
    if (!heal) return false;
    u.uhp = Math.min(u.uhpmax, (u.uhp || 0) + heal);
    return u.uhp === u.uhpmax;
}

export function regen_pw(nextMove = (game.moves || 1) + 1) {
    // C ref: allmain.c:regen_pw().  Power regeneration uses the incremented
    // turn count and rolls rn1(upper, 1) when the role/level cadence fires.
    const u = game.u;
    if (!u || (u.uen ?? 0) >= (u.uenmax ?? 0)) return;
    const enc = u.uencumber || 0;
    const cadence = Math.trunc(((30 + 8 - (u.ulevel || 1))
        * (game.urole?.name?.m === 'Wizard' ? 3 : 4)) / 6);
    const energyRegen = !!u.uprops?.energy_regeneration;
    if (!energyRegen && (enc >= 2 || !cadence || nextMove % cadence !== 0)) return;
    let upper = Math.trunc((currentAttr(A_WIS) + currentAttr(A_INT)) / 15) + 1;
    if (u.uprops?.magical_breathing) upper += 2;
    u.uen = Math.min(u.uenmax, (u.uen || 0) + (rn2(upper) + 1));
}

export function gethungry() {
    // C ref: eat.c:gethungry().  Ordinary metabolism decrements nutrition
    // before the randomized accessory/extra-hunger gate.
    if (game.u?.uinvulnerable || game.iflags?.debug_hunger) return;
    const u = game.u;
    if (!u) return;
    const sleeping = (game._nomul_turns_remaining || 0) > 0
        && (game._nomul_finish_message === 'You wake up.'
            || game._nomul_finish_message === 'You are conscious again.');
    // C ref: src/eat.c:gethungry().  `Unaware` sleep only burns ordinary
    // metabolism on one in ten turns, before the accessory hunger roll.
    if ((!sleeping || !rn2(10)) && !slowDigestionActive()) {
        u.uhunger = (u.uhunger ?? 900) - 1;
    }

    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        if (u.uprops?.hp_regeneration) u.uhunger--;
        return;
    }
    if (u.uprops?.voracious_hunger) u.uhunger--;
    if (u.uprops?.conflict) u.uhunger--;

    const left = wornRing(W_RINGL, 'left');
    const right = wornRing(W_RINGR, 'right');
    switch (accessorytime) {
    case 0:
        if (slowDigestionActive() && left?.otyp !== RIN_SLOW_DIGESTION
            && right?.otyp !== RIN_SLOW_DIGESTION) {
            u.uhunger--;
        }
        break;
    case 4:
        if (ringConsumesNutrition(left, W_RINGL)) u.uhunger--;
        break;
    case 8:
        {
            const amulet = wornAmulet();
            if (amulet && amulet.otyp !== FAKE_AMULET_OF_YENDOR) u.uhunger--;
        }
        break;
    case 12:
        if (ringConsumesNutrition(right, W_RINGR)) u.uhunger--;
        break;
    case 16:
        if (hasRealAmulet()) u.uhunger--;
        break;
    default:
        break;
    }
}

function wornRing(mask, side) {
    return (game.inventory || []).find((obj) => obj?.oclass === RING_CLASS
        && (obj.wornSide === side || ((obj.owornmask || 0) & mask)));
}

function wornAmulet() {
    return (game.inventory || []).find((obj) => obj?.oclass === AMULET_CLASS
        && (obj.worn || ((obj.owornmask || 0) & W_AMUL)));
}

function slowDigestionActive() {
    return !!game.u?.uprops?.slow_digestion
        || wornRing(W_RINGL, 'left')?.otyp === RIN_SLOW_DIGESTION
        || wornRing(W_RINGR, 'right')?.otyp === RIN_SLOW_DIGESTION;
}

function hasRealAmulet() {
    return !!game.u?.uhave?.amulet
        || (game.inventory || []).some((obj) => obj?.otyp === AMULET_OF_YENDOR);
}

function ringConsumesNutrition(ring, sideMask) {
    if (!ring || ring.otyp === MEAT_RING) return false;
    if (ring.spe) return true;
    if (!OBJECT_CHARGED[ring.otyp]) return true;
    if (ring.otyp !== RIN_PROTECTION) return false;

    const otherMask = sideMask === W_RINGL ? W_RINGR : W_RINGL;
    const otherRing = wornRing(otherMask, sideMask === W_RINGL ? 'right' : 'left');
    const otherProtection = !!game.u?.uprops?.extra_protection
        || (otherRing?.otyp === RIN_PROTECTION && !otherRing.spe);
    return !otherProtection;
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

export function exercise(index, increase) {
    if (!game.u) return;
    // C ref: attrib.c:exercise(). Physical attributes are not exercised
    // while polymorphed; Wisdom still is.
    if (game.u._poly_form && index !== A_WIS) return;
    if (!game.u.aexe) game.u.aexe = [0, 0, 0, 0, 0, 0];
    if (Math.abs(game.u.aexe[index] || 0) >= 50) return;
    if (increase) {
        if (rn2(19) > currentAttr(index)) game.u.aexe[index]++;
    } else {
        game.u.aexe[index] -= rn2(2);
    }
}

export function adjalign(n) {
    const u = game.u || (game.u = {});
    const align = u.ualign || (u.ualign = { type: 0, record: 0, abuse: 0 });
    align.record = align.record || 0;
    align.abuse = align.abuse || 0;
    const newalign = align.record + n;
    if (n < 0) {
        const newabuse = align.abuse - n;
        if (newalign < align.record) align.record = newalign;
        if (newabuse > align.abuse) {
            align.abuse = newabuse;
            adj_erinys(newabuse);
        }
    } else if (newalign > align.record) {
        const alignlim = 10 + Math.trunc((game.moves || 0) / 200);
        align.record = Math.min(newalign, alignlim);
    }
}

export function exerchk(moveNumber = (game.moves || 1) + 1) {
    // C ref: attrib.c:exerper().
    const moves = moveNumber;
    if (moves % 10 === 0) {
        const hunger = game.u?.uhunger ?? 900;
        if (hunger > 150 && hunger <= 1000) exercise(A_CON, true);

        switch (game.u?.uencumber || 0) {
        case MOD_ENCUMBER:
            exercise(A_STR, true);
            break;
        case HVY_ENCUMBER:
            exercise(A_STR, true);
            exercise(A_DEX, false);
            break;
        case EXT_ENCUMBER:
            exercise(A_DEX, false);
            exercise(A_CON, false);
            break;
        default:
            break;
        }
    }
    if (moves % 5 === 0) {
        if (game.u?.uprops?.confusion || game.u?.uprops?.hallucination) {
            exercise(A_WIS, false);
        }
        // C ref: attrib.c:exerper(). Wounded legs, fumbling, and stun abuse
        // dexterity during the same five-turn status check.
        if (game.u?.uprops?.wounded_legs || game.u?.uprops?.fumbling || game.u?.uprops?.stunned) {
            exercise(A_DEX, false);
        }
    }

    // C ref: attrib.c:exerchk().  The first diminishing-returns check is
    // scheduled from allmain.c:newgame() at turn 600, and while a run is
    // still active C sees gm.multi != 0 and defers the check.
    const context = game.context || (game.context = {});
    if (context.next_attrib_check == null) context.next_attrib_check = 600;
    if (moves < context.next_attrib_check || context.run || (context.multi || 0) > 0) return;

    const aexe = game.u?.aexe || [];
    const attrs = game.u?.acurr?.a || [];
    for (const i of [A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA]) {
        let ax = aexe[i] || 0;
        if (!ax) continue;
        const mod = Math.sign(ax);
        const attr = attrs[i] ?? 10;
        if ((ax < 0 && attr <= 3) || (ax > 0 && attr >= 18)) {
            aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod;
            continue;
        }
        const threshold = i === A_WIS ? Math.abs(ax) : Math.trunc(Math.abs(ax) * 2 / 3);
        if (rn2(50) <= threshold) {
            attrs[i] = Math.max(3, Math.min(18, attr + mod));
            if (game.u?.amax?.a) game.u.amax.a[i] = Math.max(game.u.amax.a[i] || attrs[i], attrs[i]);
            ax = 0;
        }
        aexe[i] = Math.trunc(Math.abs(ax) / 2) * mod;
    }
    context.next_attrib_check += rn2(200) + 800;
}

export function maybe_wipe_engraving() {
    // C ref: allmain.c:360 — !rn2(40 + ACURR(A_DEX) * 3)
    const dex = currentAttr(A_DEX);
    if (!rn2(40 + dex * 3)) u_wipe_engr(rnd(3));
}

function u_wipe_engr(cnt) {
    // C refs: engrave.c:u_wipe_engr(), engrave.c:can_reach_floor().
    const u = game.u;
    if (!u || u.uswallow) return;
    if (u.uprops?.levitation) return;
    wipe_engr_at(u.ux, u.uy, cnt, false);
}

function wipe_engr_at(x, y, cnt, magical) {
    // C ref: engrave.c:wipe_engr_at().
    const ep = (game.level?.engravings || []).find((engr) => engr.x === x && engr.y === y);
    if (!ep || ep.type === HEADSTONE || ep.nowipeout) return;
    const loc = game.level?.at(x, y);
    if (ep.type === BURN && loc?.typ !== ICE && !magical) return;
    let count = cnt;
    if (ep.type !== DUST && ep.type !== ENGR_BLOOD) {
        count = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    if (count <= 0) return;
    ep.text = wipeoutText(ep.text || '', count, 0).replace(/^ +/, '');
    if (!ep.text) {
        game.level.engravings = (game.level?.engravings || [])
            .filter((other) => other !== ep);
    }
}

export function maybe_update_seer_turn(moveNumber = null) {
    const context = game.context || (game.context = {});
    if (context.seer_turn == null) return;
    const moves = moveNumber ?? ((game.moves || 1) + 1);
    if (moves >= context.seer_turn) {
        context.seer_turn = moves + rn2(31) + 15;
    }
}

export { dosounds };
