// C explode.c:explode. Capture resistance masks before terrain changes, visit
// columns then rows, and retain the current phase through message/death input.
import { game } from './gstate.js';
import { A_STR, COLNO, ROWNO, MFAST, MSLOW } from './const.js';
import { cansee } from './vision.js';
import { newsym } from './display.js';
import { pmOf, resistsFire, resistsCold, digests } from './mhitm.js';
import { AT_ENGL, AT_HUGS, AD_STCK, AD_WRAP } from './permonst.js';

export async function explodeSpell(x, y, element, damage, D, { wand = false } = {}) {
    return resumeSpellExplosion({ x, y, element, damage, wand, phase: 'init', output: [] }, D);
}

export async function resumeSpellExplosion(state, D) {
    const { x, y, element, damage, wand } = state;
    const u = game.u;
    const description = element === 'fire' ? 'fireball' : 'ball of cold';
    const pending = () => ({ published: true, pending: true, messages: [],
        afterHeroDamage: { kind: 'spellExplosion', state } });
    while (!game.gameover) {
        while (state.output.length) if (!D.say(state.output.shift())) return pending();
        if (D.waiting()) return pending();
        if (state.phase === 'init') {
            state.swallowed = !!u.uswallow;
            state.holder = u.ustuck;
            const form = pmOf({ data: u._polyself_form }) || u._polyself_form;
            state.grabbing = !!(state.holder && !state.swallowed && form?.attacks?.some(attack =>
                attack.aatyp === AT_HUGS || attack.adtyp === AD_STCK
                || (attack.adtyp === AD_WRAP && !form.attacks.some(atk => atk.aatyp === AT_ENGL))));
            state.grabX = state.holder?.mx; state.grabY = state.holder?.my;
            state.heroResistant = element === 'fire' ? D.heroHasFireResistance() : D.heroHasColdResistance();
            state.heroDamage = damage;
            if (wand) {
                const role = game.urole?.name?.m || game._startup_role;
                if (['Priest', 'Cleric', 'Monk', 'Wizard'].includes(role)) state.heroDamage = Math.trunc(damage / 5);
                else if (['Healer', 'Knight'].includes(role)) state.heroDamage = Math.trunc(damage / 2);
            }
            state.cells = [];
            let visible = false;
            for (let xx = x - 1; xx <= x + 1; xx++) for (let yy = y - 1; yy <= y + 1; yy++) {
                if (xx < 1 || xx >= COLNO || yy < 0 || yy >= ROWNO) continue;
                const atHero = xx === u.ux && yy === u.uy;
                const mon = (game.level?.monsters || []).find(candidate =>
                    !candidate.dead && candidate.mhp > 0 && candidate.mx === xx && candidate.my === yy)
                    || (atHero ? u.usteed : null);
                const resistant = !!mon && (element === 'fire'
                    ? resistsFire(mon) || D.monsterResistsFire(mon)
                    : resistsCold(mon) || D.monsterResistsCold(mon));
                state.cells.push({ x: xx, y: yy, atHero, resistant });
                if (cansee(xx, yy)) {
                    visible = true;
                    const loc = game.level?.at(xx, yy);
                    if (loc) loc.map_invisible = !!mon && !D.visibleMonsterForScroll(mon);
                }
            }
            state.index = 0; state.phase = 'cell';
            if (!D.heroIsDeaf()) state.output.push(visible ? 'Boom!' : 'You hear a blast.');
            continue;
        }
        if (state.phase === 'cell') {
            if (!damage || state.index >= state.cells.length) { state.phase = 'hero'; continue; }
            const cell = state.cell = state.cells[state.index++];
            if (cell.atHero) state.hurtHero = true;
            else if (state.swallowed) continue;
            state.phase = 'monster';
            if (!u.uswallow) state.shopDamage = D.spellExplosionFloor(cell.x, cell.y, element, state.output) || state.shopDamage;
            continue;
        }
        if (state.phase === 'monster') {
            const cell = state.cell;
            const mon = state.mon = (game.level?.monsters || []).find(candidate =>
                !candidate.dead && candidate.mhp > 0 && candidate.mx === cell.x && candidate.my === cell.y)
                || (cell.atHero ? u.usteed : null);
            if (!mon) { state.phase = 'cell'; continue; }
            state.seen = cansee(cell.x, cell.y);
            state.monName = D.monsterTheName(mon, true);
            state.phase = 'monsterDamage';
            if (u.uswallow && u.ustuck === mon) {
                state.output.push(element === 'fire'
                    ? `${state.monName} gets ${digests(mon) ? 'heartburn' : 'slightly toasted'}!`
                    : `${state.monName} gets ${digests(mon) ? '' : 'slightly '}chilly!`);
            } else if (state.seen) {
                D.revealHeroProjectileHitMimicAppearance(mon);
                state.output.push(`${state.monName} is caught in the ${description}!`);
            }
            continue;
        }
        if (state.phase === 'monsterDamage') {
            const { mon, seen, monName: name } = state;
            const itemDamage = element === 'fire'
                ? D.monsterFireInventoryDamage(mon, damage, state.output, seen)
                : D.monsterColdInventoryDamage(mon, damage, state.output, seen);
            if (element === 'fire') {
                D.burnMonsterArmorFromFire(mon);
                D.igniteMonsterFireInventoryItems(mon, state.output, seen);
            }
            let applied = 0;
            if (state.cell.resistant) {
                const species = pmOf(mon) || mon.data;
                if (species.name === 'flesh golem' && mon.mspeed !== MSLOW) {
                    const old = mon.mspeed || 0;
                    mon.permspeed = mon.permspeed === MFAST ? 0 : MSLOW;
                    mon.mspeed = (mon.minvent || []).some(obj => (obj.owornmask || obj.worn)
                        && (obj.actualKind || obj.kind) === 'speed boots') ? MFAST : mon.permspeed;
                    if (old !== mon.mspeed && !mon.mfrozen && !mon.msleeping && D.visibleMonsterForScroll(mon))
                        state.output.push(`${name} seems to be moving slower.`);
                } else if (species.name === 'iron golem' && element === 'fire' && mon.mhp < mon.mhpmax) {
                    mon.mhp = Math.min(mon.mhpmax, mon.mhp + damage);
                    if (seen) state.output.push(`${name} seems healthier.`);
                }
            } else {
                applied = damage;
                if (D.monsterResistsEffect(mon, wand ? 12 : u.ulevel || 1)) {
                    applied = Math.trunc((damage + 1) / 2);
                    if (seen || state.swallowed) state.output.push(`${name} resists the ${description}!`);
                }
                if (state.holder && !state.grabbing && !state.swallowed && mon === state.holder
                    && Math.abs(u.ux - x) <= 1 && Math.abs(u.uy - y) <= 1) applied *= 2;
                if (element === 'fire' ? resistsCold(mon) || D.monsterResistsCold(mon)
                    : resistsFire(mon) || D.monsterResistsFire(mon)) applied *= 2;
            }
            mon.mhp -= applied + itemDamage;
            state.phase = 'cell';
            if (mon.mhp <= 0) {
                const species = pmOf(mon) || mon.data;
                await D.killMonsterFromHeroProjectileHit(mon, state.output, D.monsterTheName(mon), {
                    noCorpse: element === 'fire' && ['paper golem', 'straw golem'].includes(species.name),
                });
            } else D.explosionAngerMonster(mon, state.output);
            continue;
        }
        if (state.phase === 'hero') {
            if (!state.hurtHero) { state.phase = 'shop'; continue; }
            state.phase = 'heroPrepare';
            if (game.flags?.verbose !== false) state.output.push(`You are caught in the ${description}!`);
            continue;
        }
        if (state.phase === 'heroPrepare') {
            state.phase = 'heroInventory';
            if (element === 'fire') D.burnAwayHeroSlime(state.output);
            if (u.uinvulnerable) { state.heroDamage = 0; state.output.push('You are unharmed!'); }
            continue;
        }
        if (state.phase === 'heroInventory') {
            const inventory = state.inventory ??= { original: damage };
            if (!(element === 'fire' ? await D.heroFireInventoryDamage(inventory) : D.heroColdInventoryDamage(inventory))) return pending();
            state.phase = 'heroGolem';
            continue;
        }
        if (state.phase === 'heroGolem') {
            state.phase = 'heroInjury';
            const form = pmOf({ data: u._polyself_form }) || u._polyself_form;
            if (element === 'fire' && form?.name === 'iron golem' && state.heroDamage && u.mh < u.mhmax) {
                u.mh = Math.min(u.mhmax, u.mh + state.heroDamage);
                state.phase = 'heroGolemExercise';
                state.output.push('Strangely, you feel better than before.');
            }
            continue;
        }
        if (state.phase === 'heroGolemExercise') {
            D.exerciseAttribute(A_STR, true); state.phase = 'heroInjury'; continue;
        }
        if (state.phase === 'heroInjury') {
            if (!await D.explosionHeroInjury(state, description)) return pending();
            state.phase = 'heroExercise'; continue;
        }
        if (state.phase === 'heroExercise') {
            D.exerciseAttribute(A_STR, false); state.phase = 'shop'; continue;
        }
        if (state.phase === 'shop') {
            state.phase = 'end';
            if (state.shopDamage) D.payForCurrentShopTerrainDamage(element === 'fire' ? 'burn away' : 'shatter', state.output);
            continue;
        }
        if (state.phase === 'end') {
            let noise = Math.max(damage * damage, 50);
            if (state.swallowed) noise = Math.trunc((noise + 3) / 4);
            D.wakeNearbyMonstersAt(x, y, noise);
            for (const cell of state.cells) newsym(cell.x, cell.y);
            state.phase = 'done';
            return { published: true, messages: [] };
        }
        return { published: true, messages: [] };
    }
    return { published: true, messages: [] };
}
