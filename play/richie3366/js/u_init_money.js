// u_init_money.js — Starting gold from role (before full ini_inv / invent).
// C ref: u_init.c u_init_role — u.umoney0 for Healer / Rogue / Tourist;
// u_init_inventory_attrs resets u.umoney0 = 0 before u_init_role.

import { game } from './gstate.js';
import { rnd, rn1 } from './rng.js';

/**
 * C: u_init.c u_init_role — role-specific u.umoney0 before ini_inv(Money).
 * Other roles leave umoney0 at 0 (set by caller or u_init_inventory_attrs).
 * C: after u_init_role, if u.umoney0 then ini_inv(Money); then umoney0 += hidden_gold(TRUE)
 * (see `u_init_hidden_gold.js`, wired after `initIniInvStub` in `allmain.js`).
 */
export function applyRoleStartingUmoney0() {
    const u = game.u;
    if (!u) return;
    const abbr = game.urole?.abbr;
    let gold = 0;
    if (abbr === 'Hea') {
        /* C `u_init_role` — **`rn1(1000,1001)`** runs before **`ini_inv(Healer)`**; replayed in **`consumeHealerHumanIniInvUinitRoleRngLikeC`** when present. */
        if (game._healerIniUmoney0Rn1 != null) {
            gold = game._healerIniUmoney0Rn1 | 0;
            game._healerIniUmoney0Rn1 = undefined;
        } else {
            gold = rn1(1000, 1001);
        }
    }
    else if (abbr === 'Rog') gold = 0;
    else if (abbr === 'Tou') {
        /* C `u_init_role` — **`rnd(1000)`** before **`ini_inv(Tourist)`**; replayed in **`consumeTouristHumanIniInvUinitRoleRngLikeC`** when present. */
        if (game._touristIniUmoney0Rnd != null) {
            gold = game._touristIniUmoney0Rnd | 0;
            game._touristIniUmoney0Rnd = undefined;
        } else {
            gold = rnd(1000);
        }
    }
    else gold = 0;
    u.umoney0 = gold;
    game._goldCount = gold;
}
