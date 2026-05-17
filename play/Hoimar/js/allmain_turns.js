import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dosounds } from './sounds.js';
import { A_CON, A_DEX, A_WIS } from './const.js';
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
    }
}

export function maybe_wipe_engraving() {
    // C ref: allmain.c:360 — !rn2(40 + ACURR(A_DEX) * 3)
    const dex = currentAttr(A_DEX);
    if (!rn2(40 + dex * 3)) rnd(3);
}

export function maybe_update_seer_turn() {
    const context = game.context || (game.context = {});
    if (context.seer_turn == null) return;
    const moves = (game.moves || 1) + 1;
    if (moves >= context.seer_turn) {
        context.seer_turn = moves + rn2(31) + 15;
    }
}

export { dosounds };
