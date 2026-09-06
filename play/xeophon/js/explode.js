// C explode.c:explode, fire/cold spell explosions. Masks are captured before
// terrain or inventory changes; targets are processed by column, then row,
// and the hero's injury is applied last so deaths leave the damaged level.
import { game } from './gstate.js';
import { A_STR, COLNO, ROWNO, MFAST, MSLOW } from './const.js';
import { cansee } from './vision.js';
import { newsym } from './display.js';
import { pmOf, resistsFire, resistsCold, digests } from './mhitm.js';
import { AT_ENGL, AT_HUGS, AD_STCK, AD_WRAP } from './permonst.js';

export async function explodeSpell(x, y, element, damage, D, { wand = false } = {}) {
    const u = game.u || {};
    const messages = [];
    const description = element === 'fire' ? 'fireball' : 'ball of cold';
    const swallowed = !!u.uswallow;
    const holder = u.ustuck;
    const form = pmOf({ data: u._polyself_form }) || u._polyself_form;
    const grabbing = holder && !swallowed && form?.attacks?.some(attack =>
        attack.aatyp === AT_HUGS || attack.adtyp === AD_STCK
        || (attack.adtyp === AD_WRAP && !form.attacks.some(atk => atk.aatyp === AT_ENGL)));
    const grabX = holder?.mx;
    const grabY = holder?.my;
    const heroResistant = element === 'fire' ? D.heroHasFireResistance() : D.heroHasColdResistance();
    const cells = [];
    let visible = false;
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (xx < 1 || xx >= COLNO || yy < 0 || yy >= ROWNO) continue;
            const atHero = xx === u.ux && yy === u.uy;
            const mon = (game.level?.monsters || []).find(candidate =>
                !candidate.dead && candidate.mhp > 0 && candidate.mx === xx && candidate.my === yy)
                || (atHero ? u.usteed : null);
            const resistant = mon && (element === 'fire'
                ? resistsFire(mon) || D.monsterResistsFire(mon)
                : resistsCold(mon) || D.monsterResistsCold(mon));
            cells.push({ x: xx, y: yy, atHero, resistant });
            if (cansee(xx, yy)) {
                visible = true;
                const loc = game.level?.at(xx, yy);
                if (loc) loc.map_invisible = !!mon && !D.visibleMonsterForScroll(mon);
            }
        }
    }
    if (!D.heroIsDeaf()) messages.push(visible ? 'Boom!' : 'You hear a blast.');
    let hurtHero = false;
    let shopDamage = false;
    if (damage) for (const cell of cells) {
        if (cell.atHero) hurtHero = true;
        else if (swallowed) continue;
        if (!u.uswallow) shopDamage = D.spellExplosionFloor(cell.x, cell.y, element, messages) || shopDamage;
        const mon = (game.level?.monsters || []).find(candidate =>
            !candidate.dead && candidate.mhp > 0 && candidate.mx === cell.x && candidate.my === cell.y)
            || (cell.atHero ? u.usteed : null);
        if (!mon) continue;
        const seen = cansee(cell.x, cell.y);
        const name = D.monsterTheName(mon, true);
        if (u.uswallow && u.ustuck === mon) {
            messages.push(element === 'fire'
                ? `${name} gets ${digests(mon) ? 'heartburn' : 'slightly toasted'}!`
                : `${name} gets ${digests(mon) ? '' : 'slightly '}chilly!`);
        } else if (seen) {
            D.revealHeroProjectileHitMimicAppearance(mon);
            messages.push(`${name} is caught in the ${description}!`);
        }
        const itemDamage = element === 'fire'
            ? D.monsterFireInventoryDamage(mon, damage, messages, seen)
            : D.monsterColdInventoryDamage(mon, damage, messages, seen);
        if (element === 'fire') {
            D.burnMonsterArmorFromFire(mon);
            D.igniteMonsterFireInventoryItems(mon, messages, seen);
        }
        let applied = 0;
        if (cell.resistant) {
            const species = pmOf(mon) || mon.data;
            if (species.name === 'flesh golem' && mon.mspeed !== MSLOW) {
                const old = mon.mspeed || 0;
                mon.permspeed = mon.permspeed === MFAST ? 0 : MSLOW;
                mon.mspeed = (mon.minvent || []).some(obj => (obj.owornmask || obj.worn)
                    && (obj.actualKind || obj.kind) === 'speed boots') ? MFAST : mon.permspeed;
                if (old !== mon.mspeed && !mon.mfrozen && !mon.msleeping && D.visibleMonsterForScroll(mon))
                    messages.push(`${name} seems to be moving slower.`);
            } else if (species.name === 'iron golem' && element === 'fire' && mon.mhp < mon.mhpmax) {
                mon.mhp = Math.min(mon.mhpmax, mon.mhp + damage);
                if (seen) messages.push(`${name} seems healthier.`);
            }
        } else {
            applied = damage;
            if (D.monsterResistsEffect(mon, wand ? 12 : u.ulevel || 1)) {
                applied = Math.trunc((damage + 1) / 2);
                if (seen || swallowed) messages.push(`${name} resists the ${description}!`);
            }
            if (holder && !grabbing && !swallowed && mon === holder
                && Math.abs(u.ux - x) <= 1 && Math.abs(u.uy - y) <= 1) applied *= 2;
            if (element === 'fire' ? resistsCold(mon) || D.monsterResistsCold(mon)
                : resistsFire(mon) || D.monsterResistsFire(mon)) applied *= 2;
        }
        mon.mhp -= applied + itemDamage;
        if (mon.mhp <= 0) {
            const species = pmOf(mon) || mon.data;
            await D.killMonsterFromHeroProjectileHit(mon, messages, D.monsterTheName(mon), {
                noCorpse: element === 'fire' && ['paper golem', 'straw golem'].includes(species.name),
            });
        } else D.explosionAngerMonster(mon, messages);
    }
    let result = {};
    if (hurtHero) {
        if (game.flags?.verbose !== false) messages.push(`You are caught in the ${description}!`);
        let heroDamage = damage;
        if (wand) {
            const role = game.urole?.name?.m || game._startup_role;
            if (['Priest', 'Cleric', 'Monk', 'Wizard'].includes(role)) heroDamage = Math.trunc(heroDamage / 5);
            else if (['Healer', 'Knight'].includes(role)) heroDamage = Math.trunc(heroDamage / 2);
        }
        if (grabbing && (grabX - x) ** 2 + (grabY - y) ** 2 <= 2) heroDamage *= 2;
        result = await D.spellElementalHeroDamage(element, damage, heroResistant ? 0 : heroDamage,
            `caught ${game.flags?.female ? 'herself in her' : 'himself in his'} own ${description}`, messages,
            { golemDamage: heroDamage });
        D.observeHeroElementResistance(element, heroResistant);
        D.exerciseAttribute(A_STR, false);
    }
    if (shopDamage) D.payForCurrentShopTerrainDamage(element === 'fire' ? 'burn away' : 'shatter', messages);
    let noise = Math.max(damage * damage, 50);
    if (swallowed) noise = Math.trunc((noise + 3) / 4);
    D.wakeNearbyMonstersAt(x, y, noise);
    for (const cell of cells) newsym(cell.x, cell.y);
    return { messages, ...result, fatal: !!result.fatal || !!messages.fatal, lifeSaving: !!result.lifeSaving || !!messages.lifeSaving };
}
