// Source: mon.c maybe_unhide_at/hideunder and monmove.c can_hide_under_obj.
import { game } from './gstate.js';
import { MONS, PM_HUMAN, S_EEL, hides_under, touch_petrifies, MR_STONE } from './permonst.js';
import { pmOf, resistsSton } from './mhitm.js';
import { locomotion } from './mondata.js';
import { POOL, MOAT, WATER, DRAWBRIDGE_UP, DB_UNDER, DB_MOAT, DB_LAVA,
    IS_LAVA, is_pit, STONE_RES, PLNMSG_HIDE_UNDER } from './const.js';
import { cansee, couldsee } from './vision.js';
import { newsym } from './display.js';

function floorStack(x, y, g) {
    // Floor insertion appends in JS; C puts newly placed objects at the head.
    return (g.level?.objects || []).filter(obj => obj.ox === x && obj.oy === y
        && !obj.buried && !obj.contained && !obj.hidden && !obj.transientProjectile).reverse();
}

function hidingTerrain(x, y, g) {
    const loc = g.level?.at(x, y);
    const typ = loc?.typ;
    const under = (loc?.drawbridgemask ?? loc?.flags ?? 0) & DB_UNDER;
    const juiblex = g.juiblex_level || g.specialLevels?.find(level => level.name === 'juiblex');
    const atJuiblex = juiblex && juiblex.dnum === g.u?.uz?.dnum && juiblex.dlevel === g.u?.uz?.dlevel;
    const raised = typ === DRAWBRIDGE_UP;
    return {
        pool: [POOL, MOAT, WATER].includes(typ) || (raised && under === DB_MOAT && !atJuiblex),
        lava: IS_LAVA(typ) || (raised && under === DB_LAVA),
    };
}

export function canHideUnderObject(obj, g = game) {
    if (!obj) return false;
    const pile = floorStack(obj.ox, obj.oy, g);
    const index = pile.indexOf(obj);
    if (index < 0) return false;
    const trap = (g.level?.traps || []).find(t => t.tx === obj.ox && t.ty === obj.oy);
    if (trap && !is_pit(trap.ttyp)) return false;
    let coins = 0;
    for (const item of pile.slice(index)) {
        if (item.otyp !== 466 && item.cls !== 'coin' && item.cls !== 10002 && item.oclass !== 10002)
            return true;
        coins += item.quan || 1;
        if (coins >= 10) return true;
    }
    return false;
}

export function hideUnder(mon, deps = {}, g = game) {
    const hero = mon === g.u;
    const form = hero ? g.u._polyself_form || MONS[g.u.umonnum ?? PM_HUMAN] : mon.data;
    const species = pmOf({ data: form }) || form || {};
    const x = hero ? g.u.ux : mon.mx;
    const y = hero ? g.u.uy : mon.my;
    const oldHidden = !!(hero ? g.u.uundetected : mon.mundetected);
    const seeit = !g.in_mklev && (deps.canSeeMonster ? deps.canSeeMonster(mon)
        : cansee(x, y) && !g.u?.blind && !oldHidden && (!mon.minvis || g.u?.seeInvisible));
    const pile = floorStack(x, y, g);
    const trap = (g.level?.traps || []).find(t => t.tx === x && t.ty === y);
    const terrain = hidingTerrain(x, y, g);
    let undetected = false;
    let seenObject;
    if (mon !== g.u?.ustuck && !(hero ? g.u.utrap : mon.mtrapped)
        && (!trap || is_pit(trap.ttyp))) {
        if (species.mlet === S_EEL) {
            const waterPlane = g.water_level && g.water_level.dnum === g.u?.uz?.dnum
                && g.water_level.dlevel === g.u?.uz?.dlevel;
            undetected = terrain.pool && !waterPlane
                && (!(g.u?.underwater || g.u?.Underwater || g.u?.uinwater || g.u?.uunderwater) || !couldsee(x, y));
            seenObject = 'the water';
        } else if (hides_under(species) && canHideUnderObject(pile[0], g)
            && (!mon.mtame || !pile.some(obj => obj.cursed)) && !terrain.pool && !terrain.lava) {
            const stoneResistant = hero ? !!(g.u.stoneResistance || g.u.Stone_resistance
                || ((species.mres || 0) & MR_STONE) || g.u.uprops?.[STONE_RES]?.intrinsic
                || g.u.uprops?.[STONE_RES]?.extrinsic) : resistsSton(mon);
            undetected = stoneResistant || pile.some(obj => {
                if (obj.otyp !== 471 && obj.otyp !== 'corpse' && obj.kind !== 'corpse') return true;
                const corpse = typeof obj.corpsenm === 'number' ? MONS[obj.corpsenm]
                    : pmOf({ data: obj.corpsenm }) || obj.corpsenm;
                return !corpse || !touch_petrifies(corpse);
            });
            const kind = pile[0].kind || pile[0].actualKind || 'object';
            seenObject = deps.objectName?.(pile[0]) || `${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind}`;
        }
    }
    if (hero) g.u.uundetected = undetected ? 1 : 0;
    else {
        mon.mundetected = undetected ? 1 : 0;
        if (undetected && seeit && seenObject) {
            const name = deps.monsterName?.(mon) || mon.givenName || `${mon.mtame ? 'your' : 'the'} ${species.name}`;
            const verb = species.mlet === S_EEL ? 'dive' : locomotion(species, 'hide');
            deps.messages?.push(`You see ${name} ${verb} under ${seenObject}.`);
            (g.iflags ??= {}).last_msg = PLNMSG_HIDE_UNDER;
            g.last_hider = mon.m_id;
        }
    }
    if (undetected !== oldHidden) (deps.newsym || newsym)(x, y);
    return undetected;
}

export function maybeUnhideAt(x, y, deps = {}, g = game) {
    const mon = (g.level?.monsters || []).find(m => m.mx === x && m.my === y && !m.dead && (m.mhp ?? 1) > 0)
        || (g.u?.ux === x && g.u?.uy === y ? g.u : null);
    if (!mon) return;
    const hero = mon === g.u;
    if (!(hero ? g.u.uundetected : mon.mundetected)) return;
    const form = hero ? g.u._polyself_form || MONS[g.u.umonnum ?? PM_HUMAN] : mon.data;
    const species = pmOf({ data: form }) || form || {};
    const pile = floorStack(x, y, g);
    if ((hides_under(species) && (!pile.length || (hero ? g.u.utrap : mon.mtrapped)
        || !canHideUnderObject(pile[0], g))) || (species.mlet === S_EEL && !hidingTerrain(x, y, g).pool))
        hideUnder(mon, deps, g);
}
