// C mhitu.c:mattacku/hitmu. The state holds the current source phase so a
// displayed message or a death prompt can suspend without replaying rolls.
import { game } from './gstate.js';
import { d, rnd, rn1, rn2 } from './rng.js';
import { W_ARMG } from './const.js';
import { pmOf, hitvalMonsterWeapon, dmgvalMonsterWeapon, selectHwep } from './mhitm.js';
import { AD_PHYS, AD_COLD, AD_MAGM, AD_STUN, AD_CONF, AD_PLYS, AD_SAMU, AD_SPEL, AD_CLRC, AT_MAGC, AT_WEAP, AT_CLAW,
    AT_KICK, AT_BITE, AT_BUTT, AT_TUCH, AT_STNG, AT_TENT, perceives, thick_skinned } from './permonst.js';

const CONTACT_ATTACKS = new Set([AT_WEAP, AT_CLAW, AT_KICK, AT_BITE, AT_BUTT, AT_TUCH, AT_STNG, AT_TENT]);
const CONTACT_DAMAGE = new Set([AD_PHYS, AD_COLD, AD_STUN, AD_CONF, AD_PLYS, AD_SAMU]);
const MAGIC_DAMAGE = new Set([AD_SPEL, AD_CLRC, AD_MAGM, AD_COLD]);
const HIT_VERBS = new Map([[AT_BITE, 'bites'], [AT_KICK, 'kicks'], [AT_BUTT, 'butts'],
    [AT_TUCH, 'touches you'], [AT_STNG, 'stings']]);

export function supportsMonsterAttackSlots(mon) {
    // Polymorphed defenders still use the existing passiveum path until its
    // passive counters can suspend in this same attack state.
    if (game.u?._polyself_form) return false;
    const weapon = mon.mw || selectHwep(mon);
    if (weapon?.artifact || weapon?.oartifact || weapon?.opoisoned || weapon?.permapoisoned) return false;
    const attacks = pmOf(mon)?.attacks || [];
    return attacks.some(attack => attack.aatyp === AT_MAGC)
        && attacks.every(attack => !attack.aatyp
            || (attack.aatyp === AT_MAGC ? MAGIC_DAMAGE.has(attack.adtyp)
                : CONTACT_ATTACKS.has(attack.aatyp) && CONTACT_DAMAGE.has(attack.adtyp)));
}

export async function advanceMonsterAttackSlots(state, D) {
    const mon = state.mon;
    if (!state.phase) {
        const u = game.u;
        const ac = u.uac < 0 ? -rnd(-u.uac) : u.uac ?? 10;
        const helpless = (game._helpless_time || 0) > 0 || game.multi < 0;
        state.toHit = Math.max(1, ac + 10 + (mon.m_lev ?? pmOf(mon)?.mlevel ?? 0)
            + (helpless ? 4 : 0) - ((D.invisible() && !perceives(pmOf(mon))) || !mon.mcansee ? 2 : 0)
            - (mon.mtrapped ? 2 : 0));
        state.index = 0;
        state.firstX = u.ux; state.firstY = u.uy;
        state.firstFound = mon.mux === u.ux && mon.muy === u.uy;
        state.hits = [];
        state.phase = 'slot';
    }
    while (!mon.dead && mon.mhp > 0 && !game.program_state?.gameover) {
        if (state.phase === 'slot') {
            const attacks = pmOf(mon)?.attacks || [];
            if (state.index >= attacks.length) return true;
            state.attack = attacks[state.index];
            state.damage = 0; state.effect = null;
            const found = mon.mux === game.u.ux && mon.muy === game.u.uy;
            if (!state.attack.aatyp || (state.index > 0 && (state.firstX !== game.u.ux || state.firstY !== game.u.uy
                || (state.firstFound && !found)))) {
                state.hits[state.index++] = false;
                continue;
            }
            state.found = found;
            if (state.attack.aatyp === AT_MAGC) {
                // mattacku recalculates range after theft can teleport its
                // attacker. buzzmu rejects non-ray spell types immediately.
                if (Math.max(Math.abs(mon.mx - game.u.ux), Math.abs(mon.my - game.u.uy)) > 1
                    && (state.attack.adtyp === AD_SPEL || state.attack.adtyp === AD_CLRC)) {
                    state.hits[state.index++] = false;
                    continue;
                }
                state.phase = 'cast';
                continue;
            }
            if (state.skipNonMagic || Math.max(Math.abs(mon.mx - mon.mux), Math.abs(mon.my - mon.muy)) > 1
                || (state.attack.aatyp === AT_KICK && D.inPit(mon))) {
                state.hits[state.index++] = false;
                continue;
            }
            if (!found) {
                state.skipNonMagic = true;
                state.hits[state.index++] = false;
                if (!D.say(D.wildMiss(mon))) return false;
                continue;
            }
            state.phase = state.attack.aatyp === AT_WEAP ? 'weapon' : 'roll';
        }
        if (state.phase === 'cast') {
            state.phase = 'afterCast';
            state.hits[state.index] = await D.cast(mon, state.attack, state.found);
            if (D.waiting()) return false;
        }
        if (state.phase === 'afterCast') {
            state.previousHitType = null; state.phase = 'afterSlot';
        }
        if (state.phase === 'weapon') {
            state.phase = 'roll';
            if (await D.wield(mon)) {
                state.hits[state.index++] = false; state.phase = 'slot';
                if (D.waiting()) return false;
                continue;
            }
            const swing = mon.mw && D.swing(mon, mon.mw);
            if (swing && !D.say(swing)) return false;
        }
        if (state.phase === 'roll') {
            const attack = state.attack;
            state.roll = rnd(20 + state.index);
            const hitValue = state.toHit + (attack.aatyp === AT_WEAP && mon.mw ? hitvalMonsterWeapon(mon.mw, D.hero()) : 0);
            if (hitValue <= state.roll) {
                state.hits[state.index++] = false; state.previousHitType = null; state.phase = 'slot';
                if (!D.say(`${D.name(mon)} ${hitValue === state.roll && game.flags?.verbose !== false ? 'just ' : ''}misses!`)) return false;
                continue;
            }
            if (attack.aatyp === AT_KICK && thick_skinned(D.hero().data)) {
                state.hits[state.index++] = false; state.phase = 'slot';
                continue;
            }
            state.hits[state.index] = true;
            state.damage = d(attack.damn, attack.damd);
            if (D.midnightUndead(mon)) state.damage += d(attack.damn, attack.damd);
            if (attack.aatyp === AT_WEAP && attack.adtyp === AD_PHYS && mon.mw) {
                state.damage += dmgvalMonsterWeapon(mon.mw, D.hero());
                if ((mon.minvent || []).some(obj => (obj.owornmask & W_ARMG)
                    && (obj.actualKind || obj.kind) === 'gauntlets of power')) state.damage += rn1(4, 3);
                state.damage = Math.max(1, state.damage);
            }
            const verb = HIT_VERBS.get(attack.aatyp) || 'hits';
            const again = state.previousHitType === attack.aatyp && state.previousHitIndex === state.index - 1 ? ' again' : '';
            state.previousHitType = attack.aatyp;
            state.previousHitIndex = state.index;
            state.phase = 'effect';
            if (!D.say(`${D.name(mon)} ${verb}${again}!`)) return false;
        }
        if (state.phase === 'effect') {
            if (!await D.hitEffect(state)) return false;
            state.phase = 'damage';
        }
        if (state.phase === 'damage') {
            await D.knockback(state);
            if (state.damage && game.u.uac < 0) state.damage = Math.max(1, state.damage - rnd(-game.u.uac));
            state.damage = D.halfPhysical(state.damage);
            state.phase = 'afterHit';
            if (!await D.damage(state.damage, mon)) return false;
        }
        if (state.phase === 'afterHit') {
            state.phase = 'afterSlot';
            if (!await D.afterHit(state)) return false;
        }
        if (state.phase === 'afterSlot') {
            if (state.hits[state.index] && game.u.usleep && game.u.usleep < game.moves && !rn2(10)) {
                game.multi = -1;
                game._helpless_time = 1;
                if (game._sleeping_time > 1) game._sleeping_time = 1;
                game._wake_message = 'The combat suddenly awakens you.';
            }
            state.index++; state.phase = 'slot';
        }
    }
    return true;
}
