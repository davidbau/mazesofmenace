// spell.c:cast_chain_lightning. Queue entries retain their arrival strength:
// killing or life-saving a target does not change how that entry propagates.
import { game } from './gstate.js';
import { d, rn2, rn2_on_display_rng } from './rng.js';
import { DOOR, D_CLOSED, D_LOCKED, POOL, MOAT, DRAWBRIDGE_UP, LAVAPOOL,
    SPACE_POS, isok, xdir, ydir, MON_FLOOR } from './const.js';
import { AD_ELEC } from './permonst.js';
import { newsym } from './display.js';

function monsterAt(x, y) {
    return (game.level.monsters || []).find(mon => !mon.dead && mon.mhp > 0
        && (mon.mstate || 0) === MON_FLOOR && ((mon.mx === x && mon.my === y)
            || (mon.wormSegments || []).some(segment => segment.x === x && segment.y === y)));
}

function propagate(state, zap, D) {
    const x = zap.x + xdir[zap.dir], y = zap.y + ydir[zap.dir];
    if (state.queue.length >= 100 || !isok(x, y)) return;
    const loc = game.level.at(x, y), typ = loc?.typ;
    if (!(SPACE_POS(typ) || [POOL, MOAT, DRAWBRIDGE_UP, LAVAPOOL].includes(typ)
        || (typ === DOOR && !(loc.doormask & (D_CLOSED | D_LOCKED))))) return;
    const mon = monsterAt(x, y);
    if (mon?.mpeaceful) return;
    const strength = mon ? D.monsterResistsElectricity(mon) ? 0 : 3 : zap.strength;
    if (!mon && !strength) return;
    if (state.queue.some(entry => entry.x === x && entry.y === y)) return;
    state.queue.push({ x, y, dir: zap.dir, strength });
    if (!D.heroIsBlind()) {
        const dx = xdir[zap.dir], dy = ydir[zap.dir];
        // tmp_at draws when enqueuing, before the next breadth-first wave.
        (game._transient_beam_cells ??= []).push({ x, y,
            ch: !dy ? '─' : !dx ? '│' : dx === dy ? '\\' : '/',
            color: [12, 9, 15, 12, 0, 15][state.displayedBeam] });
    }
}

export async function resumeChainLightning(state, D) {
    const pending = { messages: [], published: true, pending: true,
        afterHeroDamage: { kind: 'chainLightning', state } };
    if (!state.phase) {
        state.displayedBeam = D.heroIsHallucinating() ? rn2_on_display_rng(6) : AD_ELEC - 1;
        // The upstream TODO intentionally leaves the engulfer unharmed.
        if (game.u.uswallow) return { messages: [] };
        state.queue = []; state.head = 0;
        game._transient_beam_cells = [];
        for (let dir = 0; dir < 8; dir++)
            propagate(state, { x: game.u.ux, y: game.u.uy, dir, strength: 2 }, D);
        state.waveTail = state.queue.length;
        state.phase = 'next';
    }
    while (state.head < state.queue.length || state.phase !== 'next') {
        if (game.program_state?.gameover) break;
        if (state.phase === 'next') {
            if (state.head === state.waveTail) state.waveTail = state.queue.length;
            state.zap = state.queue[state.head++];
            state.mon = monsterAt(state.zap.x, state.zap.y);
            state.phase = state.mon ? 'damage' : 'propagate';
        }
        const mon = state.mon;
        if (state.phase === 'damage') {
            // C uses the previous bhit() position here, not this zap's tile.
            const hit = game.bhitpos || { x: 0, y: 0 };
            game.notonhead = mon.mx !== hit.x || mon.my !== hit.y;
            const original = D.spellDamageBonus(d(2, 6));
            state.damage = D.monsterResistsElectricity(mon) ? 0 : original;
            state.inventory = !rn2(3) ? { original } : null;
            state.phase = 'inventory';
        }
        if (state.phase === 'inventory') {
            if (state.inventory && !D.monsterElectricInventoryDamage(mon, state.inventory)) return pending;
            state.damage += state.inventory?.damage || 0;
            if (D.heroIsKnightWithQuestArtifact()) state.damage *= 2;
            if (state.damage > 0 && D.monsterResistsEffect(mon, game.u.ulevel))
                state.damage = Math.trunc(state.damage / 2);
            mon.mhp -= state.damage;
            state.phase = 'message';
        }
        if (state.phase === 'message') {
            state.phase = 'afterMessage';
            if (state.damage) {
                if (mon.mhp <= 0) {
                    state.phase = 'kill';
                    if (!D.say(D.chainKillMessage(mon))) return pending;
                } else if (!D.say(`You shock ${D.chainMonsterName(mon)}${state.damage > 4 ? '!' : '.'}`)) return pending;
            } else if (D.visibleMonsterForScroll(mon) && !D.say(`${D.chainMonsterName(mon, true)} resists.`)) return pending;
        }
        if (state.phase === 'kill') {
            state.phase = 'wake';
            const messages = [];
            await D.killMonsterFromHeroProjectileHit(mon, messages, '', { killMessage: false, announced: true });
            for (const message of messages) D.say(message);
            if (messages.more) game._message_more = 1;
            if (D.waiting()) return pending;
        }
        if (state.phase === 'afterMessage') {
            if (state.damage && !D.visibleMonsterForScroll(mon) && !game.notonhead) {
                game.level.at(state.zap.x, state.zap.y).map_invisible = true;
                newsym(state.zap.x, state.zap.y);
            }
            state.phase = 'wake';
        }
        if (state.phase === 'wake') {
            state.phase = 'wakeFinish';
            if (!mon.dead && mon.mhp > 0 && mon.msleeping && D.visibleMonsterForScroll(mon)
                && !D.say(`${D.chainMonsterName(mon, true)} wakes up.${mon.data?.name === 'flesh golem' ? " It's alive!" : ''}`)) return pending;
        }
        if (state.phase === 'wakeFinish') {
            if (!mon.dead && mon.mhp > 0) D.chainWakeup(mon);
            state.phase = 'propagate';
        }
        if (state.phase === 'propagate') {
            const zap = { ...state.zap };
            if (zap.strength) {
                zap.strength--;
                propagate(state, zap, D);
                if (zap.strength < 2) zap.strength = 0;
                else if (game.u.uen > 0) game.u.uen--;
                zap.dir = (zap.dir + 7) % 8; propagate(state, zap, D);
                zap.dir = (zap.dir + 2) % 8; propagate(state, zap, D);
            }
            state.mon = null; state.inventory = null; state.phase = 'next';
        }
    }
    return { messages: [], published: true };
}
