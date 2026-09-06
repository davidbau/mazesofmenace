// C: mondata.c resists_blnd, uhitm.c flash_hits_mon/light_hits_gremlin,
// zap.c flashburn/lightdamage/bhit, and apply.c do_blinding_ray.
import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { MONS, PM_HUMAN, PM_GREMLIN, PM_GRID_BUG, PM_LONG_WORM, PM_LONG_WORM_TAIL,
    S_LIGHT, haseyes, AD_BLND, AT_EXPL, AT_GAZE } from './permonst.js';
import { pmOf } from './mhitm.js';
import { artifactDefinitionForName } from './mklev.js';
import { W_WEP, COLNO, ROWNO, ZAP_POS, DOOR, D_CLOSED, D_LOCKED,
    M_AP_TYPE, M_AP_OBJECT, M_AP_MONSTER } from './const.js';

import { CMAP_EXPLANATIONS as FLASH_CMAP_EXPLANATIONS } from './defsym.js';
export { FLASH_CMAP_EXPLANATIONS };

export function resolveFlashDirection(direction, D) {
    const form = game.u._polyself_form || MONS[game.u.umonnum ?? PM_HUMAN];
    const gridbug = (pmOf({ data: form }) || form)?.pm === PM_GRID_BUG;
    const dir = { ...direction };
    if (gridbug && dir.dx && dir.dy) return { error: "You can't orient yourself that direction." };
    if (!dir.dz && (D.heroIsStunned() || (D.heroIsConfused() && !rn2(5)))) {
        const directions = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[1,1],[-1,1]];
        [dir.dx, dir.dy] = directions[rn2(gridbug ? 4 : 8)];
    }
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = dir.dz;
    return dir;
}

export async function recordCameraCloseup(mon, messages, D) {
    if (D.heroIsHallucinating() || (D.heroIsBlind() && !D.heroBlindTelepathy())) return;
    const species = pmOf(mon) || mon.data;
    let index = species.pm;
    if (M_AP_TYPE(mon) === M_AP_MONSTER && !D.senseMonster(mon)) index = mon.mappearance;
    if (species.pm === PM_LONG_WORM && game.notonhead) index = PM_LONG_WORM_TAIL;
    game.mvitals ??= [];
    game.context.lifelist ??= {};
    let vital = game.mvitals[index] ??= {};
    const list = game.context.lifelist;
    if (!vital.seen_close) {
        vital.seen_close = 1;
        list.total_seen_upclose = (list.total_seen_upclose || 0) + 1;
    }
    if (!mon.minvis && !mon.mundetected && [0, M_AP_MONSTER].includes(M_AP_TYPE(mon))) {
        if (M_AP_TYPE(mon) === M_AP_MONSTER) index = mon.mappearance;
        vital = game.mvitals[index] ??= {};
        if (!vital.photographed) {
            vital.photographed = 1;
            list.total_photographed = (list.total_photographed || 0) + 1;
            if ((game._startup_role || game.urole?.name?.m) === 'Tourist'
                && (mon.m_id !== game.context.startingpet_mid || index !== game.context.startingpet_typ)
                && index === species.pm) await D.gainPhotoExperience(mon, messages);
        }
    }
}

export function flashResistance(mon, D) {
    const hero = !mon;
    const form = hero ? game.u._polyself_form || MONS[game.u.umonnum ?? PM_HUMAN] : mon.data;
    const species = pmOf({ data: form }) || form || {};
    const weapon = hero ? game.u.uwep || (game.inventory || []).find(obj => obj.wielded || (obj.owornmask & W_WEP))
        : mon.mw || (mon.minvent || []).find(obj => obj.wielded || (obj.owornmask & W_WEP));
    const artifact = artifactDefinitionForName(weapon?.artifact || weapon?.oartifact)?.name === 'Sunsword';
    const blind = hero ? D.heroIsBlind() || (game._helpless_time > 0 && game._sleeping_time > 0)
        : mon.mblinded || mon.mcansee === false || mon.mcansee === 0 || mon.msleeping;
    const innate = (species.attacks || []).some(atk => atk.adtyp === AD_BLND
        && (atk.aatyp === AT_EXPL || atk.aatyp === AT_GAZE));
    return { resists: !!(blind || !haseyes(species) || innate || artifact), artifact };
}

export async function lightDamageHero(item, amount, messages, D) {
    let damage = amount;
    const form = game.u._polyself_form || MONS[game.u.umonnum ?? PM_HUMAN];
    if ((pmOf({ data: form }) || form)?.pm === PM_GREMLIN && damage) {
        damage = rnd(damage);
        if (damage > 10) damage = 10 + rnd(damage - 10);
        damage = Math.min(20, damage);
        messages.push(`Ow, that light hurts${damage > 2 || game.u.mh <= 5 ? '!' : '.'}`);
        const result = await D.damageHero(messages, D.halfPhysical(damage), 'killed while stuck in creature form');
        Object.assign(messages, result);
    }
    return damage;
}

export function flashBurnHero(duration, messages, D) {
    const resistance = flashResistance(null, D);
    if (!resistance.resists) {
        messages.push('You are blinded by the flash!');
        D.blindHero(duration);
        if (!D.heroIsBlind()) messages.push('Your vision clears.');
        return true;
    }
    if (resistance.artifact) D.shield?.(game.u.ux, game.u.uy);
    return resistance.artifact;
}

export async function lightHitsGremlin(mon, damage, messages, D) {
    const distance = (mon.mx - game.u.ux) ** 2 + (mon.my - game.u.uy) ** 2;
    if (!game.u.deaf && distance <= 90)
        messages.push(`${D.name(mon, true)} ${damage > mon.mhp / 2 ? 'wails in agony' : 'cries out in pain'}!`);
    else if (D.visible(mon)) messages.push(`${D.name(mon, true)} recoils from the light!`);
    mon.mhp -= damage;
    D.wake(mon.mx, mon.my, 30);
    if (mon.mhp <= 0) await D.kill(mon, messages, D.name(mon));
    else if (D.seeSquare(mon.mx, mon.my) && !D.visible(mon)) D.mapInvisible(mon.mx, mon.my);
}

export async function flashHitsMonster(mon, item, messages, D) {
    if (game.notonhead) return;
    const species = pmOf(mon) || mon.data || {};
    const visible = D.visible(mon);
    if (M_AP_TYPE(mon)) {
        mon.msleeping = 0;
        mon.meating = 0;
        if (M_AP_TYPE(mon) !== M_AP_MONSTER) D.revealMimic(mon, messages);
    }
    if (mon.msleeping && haseyes(species)) {
        mon.msleeping = 0;
        if (visible) messages.push(`The flash awakens ${D.name(mon)}.`);
    } else if (species.mlet !== S_LIGHT) {
        const resistance = flashResistance(mon, D);
        if (!resistance.resists) {
            const distance = (item.ox - mon.mx) ** 2 + (item.oy - mon.my) ** 2;
            if (visible) messages.push(`${D.name(mon, true)} is blinded by the flash!`);
            if (species.pm === PM_GREMLIN) await lightHitsGremlin(mon, rnd(Math.min(mon.mhp, 4)), messages, D);
            if (!mon.dead && mon.mhp > 0) {
                D.anger(mon);
                if (distance < 9 && !mon.isshk && rn2(4))
                    D.flee(mon, rn2(4) ? rnd(100) : 0, { first: false, message: true, messages });
                mon.mcansee = 0;
                mon.mblinded = distance < 3 ? 0 : rnd(1 + Math.trunc(50 / distance));
            }
        } else if (visible) {
            if (resistance.artifact) D.shield?.(mon.mx, mon.my);
            if (game.flags?.verbose !== false) messages.push(game.level.at(mon.mx, mon.my).lit
                ? `The flash of light shines on ${D.name(mon)}.` : `${D.name(mon, true)} is illuminated.`);
        }
    }
    D.newsym(mon.mx, mon.my);
}

export async function flashRay(item, dir, messages, D) {
    item.ox = game.u.ux;
    item.oy = game.u.uy;
    let x = item.ox;
    let y = item.oy;
    for (let range = 0; range < COLNO; range++) {
        x += dir.dx; y += dir.dy;
        if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) break;
        const loc = game.level.at(x, y);
        if (!D.heroIsBlind()) await D.transientLight(x, y);
        const mon = game.level.monsters.find(target => !target.dead && (target.mhp ?? 1) > 0
            && ((target.mx === x && target.my === y)
                || (target.wormSegments || []).some(segment => segment.x === x && segment.y === y)));
        if (mon && M_AP_TYPE(mon) !== M_AP_OBJECT) {
            game.notonhead = mon.mx !== x || mon.my !== y;
            await flashHitsMonster(mon, item, messages, D);
            if (!mon.minvis) return mon;
        }
        if (!ZAP_POS(loc.typ) || (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)))) break;
    }
}
