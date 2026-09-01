// explode.js, explosions.
// C ref: src/explode.c

import { game } from './gstate.js';
import { d } from './rng.js';
import { isok } from './hacklib.js';
import { ATTKS } from './monst_data.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { A_STR, BURNING_OIL, KILLED_BY_AN, LOST_EXPLODING,
         XKILL_GIVEMSG, XKILL_NOCORPSE } from './const.js';
import { Fire_resistance, Deaf } from './youprop.js';
import { resists_cold, resists_fire, completelyburns, humanoid }
    from './mondata.js';
import { m_at, setmangry, wake_nearto, xkilled } from './mon.js';
import { cansee, couldsee } from './vision.js';
import { display_cmap_at, newsym, pline } from './display.js';
import { You, You_hear } from './pline.js';
import { Monnam } from './do_name.js';
import { exercise } from './attrib.js';
import { losehp } from './hack.js';
import { cmap_names } from './drawing_data.js';
import { CLR_BRIGHT_BLUE, CLR_ORANGE } from './terminal.js';

const explosionGlyphs = [
    [cmap_names.S_expl_tl, cmap_names.S_expl_ml, cmap_names.S_expl_bl],
    [cmap_names.S_expl_tc, cmap_names.S_expl_mc, cmap_names.S_expl_bc],
    [cmap_names.S_expl_tr, cmap_names.S_expl_mr, cmap_names.S_expl_br],
];

function maximum_fire_inventory_damage(invent) {
    return (invent || []).reduce((total, obj) => {
        if (obj.oclass === OCLASSES.POTION_CLASS)
            return total + 6;
        if (obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS)
            return total + 1;
        if (obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME)
            return total + Math.trunc(((obj.owt | 0) + 19) / 20);
        return total;
    }, 0);
}

// src/explode.c:explode(), narrowed to the burning-oil caller. Target masks
// are collected before the display effect. Effects then run in C's
// column-major order, with monsters and floor squares before the hero.
async function explode_burning_oil(x, y, dam) {
    const cells = [];
    const shields = [];
    let visible = false;
    let heroAffected = false;
    let heroResists = false;

    for (let i = 0; i < 3; ++i) {
        for (let j = 0; j < 3; ++j) {
            const xx = x + i - 1, yy = y + j - 1;
            if (!isok(xx, yy))
                continue;
            const mon = m_at(xx, yy);
            const hero = game.u.ux === xx && game.u.uy === yy;
            const monResists = !!mon && resists_fire(mon);
            if (hero) {
                heroAffected = true;
                heroResists = Fire_resistance();
            }
            if ((hero && heroResists) || monResists)
                shields.push([xx, yy]);
            if (cansee(xx, yy))
                visible = true;
            cells.push({ i, j, x: xx, y: yy, mon, monResists });
        }
    }

    if (visible) {
        for (const cell of cells)
            display_cmap_at(explosionGlyphs[cell.i][cell.j], cell.x, cell.y,
                            CLR_ORANGE, 'explosion');

        if (shields.length && game.flags?.sparkle !== false) {
            const shield = [cmap_names.S_ss1, cmap_names.S_ss2,
                            cmap_names.S_ss3, cmap_names.S_ss2,
                            cmap_names.S_ss1, cmap_names.S_ss2,
                            cmap_names.S_ss4];
            for (let repeat = 0; repeat < 3; ++repeat) {
                for (const cmap of shield) {
                    for (const [sx, sy] of shields)
                        display_cmap_at(cmap, sx, sy, CLR_BRIGHT_BLUE,
                                        'shield');
                    if (game.animationFrame)
                        await game.animationFrame();
                }
            }
            for (const cell of cells) {
                if (shields.some(([sx, sy]) => sx === cell.x && sy === cell.y))
                    display_cmap_at(explosionGlyphs[cell.i][cell.j],
                                    cell.x, cell.y, CLR_ORANGE, 'explosion');
            }
        } else if (game.animationFrame) {
            await game.animationFrame();
            await game.animationFrame();
        }

        for (const cell of cells)
            newsym(cell.x, cell.y);
    } else if (!Deaf()) {
        await You_hear('a blast.');
    }

    if (visible && !Deaf())
        await pline('Boom!');

    const [{ destroy_items, resist, zap_over_floor },
           { burnarmor, ignite_items }] = await Promise.all([
        import('./zap.js'), import('./trap.js'),
    ]);

    for (const cell of cells) {
        await zap_over_floor(cell.x, cell.y, 11);
        const mon = cell.mon;
        if (!mon || (mon.mhp | 0) <= 0)
            continue;

        // The tty puts a surviving peaceful humanoid's anger line on the
        // Boom page before it presents that target's caught line. Announce
        // it here, but leave the state change and its rare RNG draw in the
        // C effect order below. The conservative damage bound avoids
        // announcing anger for a monster which item destruction could kill.
        const directBound = (resists_cold(mon) ? 2 : 1) * dam;
        const itemBound = maximum_fire_inventory_damage(mon.minvent);
        const preannouncedAnger = !!mon.mpeaceful && !mon.mtame
            && humanoid(game.mons[mon.mnum]) && couldsee(mon.mx, mon.my)
            && (mon.mhp | 0) > directBound + itemBound;
        if (preannouncedAnger)
            await pline(`${Monnam(mon)} gets angry!`);

        if (cansee(cell.x, cell.y))
            await pline(`${Monnam(mon)} is caught in the burning oil!`);

        const itemDamage = await destroy_items(mon, ATTKS.AD_FIRE, dam);
        await burnarmor(mon);
        await ignite_items(mon.minvent || []);

        if (cell.monResists) {
            const { golem_element_effects } = await import('./uhitm.js');
            await golem_element_effects(mon, ATTKS.AD_FIRE, dam);
            mon.mhp -= itemDamage;
        } else {
            let monsterDamage = dam;
            if (resist(mon, BURNING_OIL, 0, false)) {
                if (cansee(cell.x, cell.y))
                    await pline(`${Monnam(mon)} resists the burning oil!`);
                monsterDamage = Math.trunc((dam + 1) / 2);
            }
            if (resists_cold(mon))
                monsterDamage *= 2;
            mon.mhp -= monsterDamage + itemDamage;
        }

        if ((mon.mhp | 0) <= 0) {
            const noCorpse = completelyburns(game.mons[mon.mnum])
                ? XKILL_NOCORPSE : 0;
            await xkilled(mon, XKILL_GIVEMSG | noCorpse);
        } else if (!game.context?.mon_moving) {
            await setmangry(mon, true, preannouncedAnger);
        }
    }

    if (heroAffected) {
        if (game.flags?.verbose !== false)
            await You('are caught in the burning oil!');

        await burnarmor(game.youmonst);
        await ignite_items(game.invent);
        await destroy_items(game.youmonst, ATTKS.AD_FIRE, dam);

        const { ugolemeffects } = await import('./polyself.js');
        await ugolemeffects(ATTKS.AD_FIRE, dam);
        if (!heroResists)
            await losehp(dam, 'burning oil', KILLED_BY_AN);
        exercise(A_STR, false);
    }

    wake_nearto(x, y, Math.max(dam * dam, 50));
}

// src/explode.c:962 splatter_burning_oil(). Dilution changes the dice, not
// the radius or any later inventory and resistance effects.
export async function splatter_burning_oil(x, y, dilutedOil) {
    const damage = d(dilutedOil ? 3 : 4, 4);
    await explode_burning_oil(x, y, damage);
}

// src/explode.c:974 explode_oil(). Extinguish before a potentially fatal
// blast so the light source and burn timer cannot survive into bones state.
export async function explode_oil(obj, x, y) {
    const dilutedOil = !!obj.odiluted;
    const { end_burn } = await import('./timeout.js');
    await end_burn(obj, true);
    obj.how_lost = LOST_EXPLODING;
    await splatter_burning_oil(x, y, dilutedOil);
}
