import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dosounds } from './sounds.js';
import { A_CHA, A_CON, A_DEX, A_INT, A_STR, A_WIS } from './const.js';
import { makemon } from './mklev.js';
import { depth } from './hacklib.js';

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
    if (!u || u.uinvulnerable || (u.uhp ?? 0) >= (u.uhpmax ?? 0)) return;
    const heal = ((u.ulevel || 0) + currentAttr(A_CON)) > rn2(100);
    if (!heal) return;
    u.uhp = Math.min(u.uhpmax, (u.uhp || 0) + 1);
}

export function gethungry() {
    // C ref: eat.c:3191
    if (game.u?.uinvulnerable || game.iflags?.debug_hunger) return;
    rn2(20);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

export function exercise(index, increase) {
    if (!game.u) return;
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
        if (newabuse > align.abuse) align.abuse = newabuse;
    } else if (newalign > align.record) {
        const alignlim = 10 + Math.trunc((game.moves || 0) / 200);
        align.record = Math.min(newalign, alignlim);
    }
}

export function exerchk() {
    // C ref: attrib.c:exerper().  This covers the ordinary early-game
    // hunger/encumbrance shape; status, polymorph, and encumbrance side
    // effects are still future work.
    const moves = (game.moves || 1) + 1;
    if (moves % 10 === 0) {
        const hunger = game.u?.uhunger ?? 900;
        if (hunger > 150 && hunger <= 1000) exercise(A_CON, true);
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
    if (!rn2(40 + dex * 3)) rnd(3);
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
