// C pray.c:doturn/maybe_turn_mon_iter. The current monster and phase are
// retained across topline, landing, and death prompts in the save graph.
import { game } from './gstate.js';
import { A_CHAOTIC, A_WIS, MON_FLOOR, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE } from './const.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { couldsee } from './vision.js';
import { pmOf } from './mhitm.js';
import { clearMonsterTrack } from './montrack.js';
import { createGasCloud } from './region.js';
import { alignGodName, OFFER_GODS_BY_ROLE } from './offer.js';
import { is_undead, is_demon, is_silent, has_head, MS_BUZZ, MS_BURBLE,
    PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER, PM_VROCK,
    S_ZOMBIE, S_MUMMY, S_WRAITH, S_VAMPIRE, S_GHOST, S_LICH } from './permonst.js';

const TURN_LEVEL = new Map([[S_ZOMBIE, 6], [S_MUMMY, 8], [S_WRAITH, 10],
    [S_VAMPIRE, 12], [S_GHOST, 14], [S_LICH, 16]]);
const HALLU_GODS = ['the Flying Spaghetti Monster', 'Eris', 'the Martians', 'Xom',
    'AnDoR dRaKoN', 'the Central Bank of Yendor', 'Tooth Fairy', 'Om', 'Yawgmoth',
    'Morgoth', 'Cthulhu', 'the Ori', 'destiny', 'your Friend the Computer'];

export function hallucinatedGodName(alignment, hallucinating) {
    if (!hallucinating) return alignGodName(alignment);
    const roles = Object.keys(OFFER_GODS_BY_ROLE);
    const heroRole = game.urole?.name?.m || game._startup_role;
    let role;
    do role = roles[rn2_on_display_rng(roles.length)];
    while (role === 'Priest' && heroRole !== 'Priest');
    if (role === 'Priest') role = game._pantheon_role || 'Barbarian';
    const which = rn2_on_display_rng(9);
    return which === 8 ? 'Moloch' : which >= 6 ? HALLU_GODS[rn2_on_display_rng(HALLU_GODS.length)]
        : OFFER_GODS_BY_ROLE[role][Math.floor(which / 2)].replace(/^_/, '');
}

export function isVampireShifter(mon) {
    const data = mon?.data || {};
    const cham = mon?.cham ?? mon?.mcham ?? data.cham;
    if ([PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER].includes(cham)) return true;
    const name = String(cham || mon?.vampBase || data.vampBase || mon?.chamBase || data.chamBase
        || mon?.chamName || data.chamName || '').toLowerCase();
    return !!(mon?.vampshifter || data.vampshifter
        || ['vampire', 'vampire leader', 'vampire lord', 'vampire lady', 'vlad the impaler'].includes(name));
}

export async function advanceTurnUndead(state, D) {
    const u = game.u;
    if (!state.phase) {
        const role = game.urole?.name?.m || game._startup_role;
        if (!['Knight', 'Priest'].includes(role)) {
            if (!await D.castKnownSpell('turn undead')) D.say("You don't know how to turn undead!");
            return true;
        }
        u.uconduct ??= {};
        if (!u.uconduct.gnostic) {
            (game._chronicle_entries ??= []).push({ turn: game.moves || 1, text: 'rejected atheism by turning undead' });
            game._chronicle_rejected_atheism = 1;
        }
        u.uconduct.gnostic = (u.uconduct.gnostic || 0) + 1;
        state.god = hallucinatedGodName(u.ualign?.type ?? 0, D.hallucinating());
        const form = D.heroForm();
        const strangled = D.strangled();
        if (strangled || is_silent(form) || !has_head(form)
            || [MS_BUZZ, MS_BURBLE].includes(form.sound ?? form.msound)) {
            D.say(`You are ${strangled ? 'not able to call' : 'incapable of calling'} upon ${state.god} to turn aside evilness.`);
            game.context.move = u.uconduct.gnostic === 1 ? 1 : 0;
            return true;
        }
        if ((u.ualign?.type !== A_CHAOTIC && (is_demon(form) || is_undead(form)
            || isVampireShifter({ ...u, data: form }))) || u.ugangr > 6) {
            state.phase = 'rejected';
            if (!D.say(`For some reason, ${state.god} seems to ignore you.`)) return false;
        } else if (game.dungeons?.[u.uz?.dnum]?.flags?.hellish) {
            state.phase = 'hell';
            if (!D.say(`Since you are in Gehennom, ${state.god} ${state.god === 'Moloch' ? "won't" : "can't"} help you.`)) return false;
        } else {
            state.phase = 'chant';
            if (!D.say(`Calling upon ${state.god}, you chant an arcane formula.`)) return false;
        }
    }
    if (state.phase === 'rejected' || state.phase === 'hell') {
        D.aggravate();
        if (state.phase === 'rejected') D.exercise(A_WIS, false);
        game.context.move = 1;
        return true;
    }
    if (state.phase === 'chant') {
        D.exercise(A_WIS, true);
        state.range = (8 + Math.trunc(u.ulevel / 5)) ** 2;
        state.monsters = [...(game.level.monsters || [])].reverse();
        state.index = 0;
        state.phase = 'monster';
    }
    while (state.index < state.monsters.length && !game.program_state?.gameover) {
        const mon = state.monsters[state.index];
        const data = pmOf(mon) || mon.data || {};
        if (state.phase === 'monster') {
            if (mon.dead || mon.mhp <= 0 || (mon.mstate || 0) !== MON_FLOOR
                || !couldsee(mon.mx, mon.my) || (mon.mx - u.ux) ** 2 + (mon.my - u.uy) ** 2 > state.range
                || mon.mpeaceful || !(is_undead(data) || isVampireShifter(mon) || (is_demon(data) && u.ulevel > 15))) {
                state.index++; continue;
            }
            mon.msleeping = 0;
            if (D.confused()) {
                state.phase = 'confused';
                if (!state.faltered) {
                    state.faltered = true;
                    if (!D.say('Unfortunately, your voice falters.')) return false;
                }
            } else if (D.resist(mon, u.ulevel)) {
                state.index++; continue;
            } else {
                const threshold = TURN_LEVEL.get(data.mlet);
                if (threshold && u.ulevel >= threshold && !D.resist(mon, u.ulevel)) {
                    if (u.ualign?.type === A_CHAOTIC) {
                        mon.mpeaceful = true; D.setMalign(mon); state.index++; continue;
                    }
                    state.phase = 'kill';
                    if (!D.say(D.killMessage(mon))) return false;
                } else state.phase = 'release';
            }
        }
        if (state.phase === 'confused') {
            mon.mflee = 0; mon.mfrozen = 0; mon.mcanmove = 1;
        } else if (state.phase === 'kill') {
            state.phase = 'afterKill';
            await D.kill(mon);
            if (D.waiting()) return false;
        } else if (state.phase === 'release') {
            state.release ??= {};
            if (!await D.release(mon, state.release)) return false;
            state.release = null;
            mon.mfleetim = 0;
            state.phase = 'flee';
            if (!mon.mflee && D.canSee(mon) && ![M_AP_FURNITURE, M_AP_OBJECT].includes(M_AP_TYPE(mon))) {
                const name = D.name(mon, !mon.mcanmove || !data.mmove);
                if (!D.say(`${name} ${!mon.mcanmove || !data.mmove ? 'seems to flinch' : 'turns to flee'}.`)) return false;
            }
        }
        if (state.phase === 'flee') {
            if (data.pm === PM_VROCK && !mon.mspec_used) {
                mon.mspec_used = 75 + rn2(25);
                createGasCloud(mon.mx, mon.my, 5, 8);
            }
            mon.mflee = 1;
            clearMonsterTrack(mon);
        }
        state.phase = 'monster'; state.index++;
    }
    const duration = 5 - Math.trunc((u.ulevel - 1) / 6);
    if (Math.max(game._helpless_time || 0, -(game.multi || 0)) <= duration) {
        u.uinvulnerable = false; u.usleep = 0;
        game._helpless_time = duration;
        D.endRunning();
    }
    game._multi_reason = 'trying to turn the monsters';
    game._wake_message = 'You can move again.';
    game.context.move = 1;
    return true;
}
