/* minion.js — C ref: nethack-c-v5/upstream/src/minion.c (lose_guardian_angel,
 * gain_guardian_angel).  Not wired: final_level (do.c:2043-2053) is the caller
 * and its Astral arm in js/cmd.js is a later step. */
import { game } from './gstate.js';
import { CONFLICT, STRAT_APPEARMSG } from './const.js';
import { PM_ANGEL } from './pm.generated.js';
import { rn1, rnd, d } from './rng.js';
import { pline, newsym, canspotmon, Deaf } from './display.js';
import { Blind } from './vision.js';
import { Monnam } from './mcastu.js';
import { Hear_again } from './eat.js';
import { verbalize } from './cmd.js';
import { mk_roamer } from './priest.js';
import { enexto_out } from './teleport.js';
import { permonstTemplate, which_armor } from './makemon.js';
import { mksobj, mpickobj, mongone } from './mklev.js';
import { select_hwep } from './uhitm.js';
import { mongets } from './m_initweap.js';
import { m_dowear } from './trap.js';

const SILVER_SABER = 51;              /* objects.h WEAPON("silver saber") */
const AMULET_OF_REFLECTION = 208;
const SHIELD_OF_REFLECTION = 158;
const W_ARMS = 0x00000008;
const COIN_CLASS = 11;

/* C macro Conflict (youprop.h:218) := HConflict || EConflict. */
function Conflict() {
    const p = game.u?.uprops?.[CONFLICT];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}

/* C mkobj.c bless(): COIN_CLASS skipped; carried() side branches (confers_luck,
 * bag of holding weight) cannot apply to a freshly made unplaced weapon. */
function bless(otmp) {
    if (otmp.oclass === COIN_CLASS)
        return;
    otmp.cursed = false;
    otmp.blessed = true;
}

/* C ref: minion.c:473-500 — guardian angel has been affected by conflict so is
 * abandoning hero.  mon may be null (angel hasn't been created yet). */
export async function lose_guardian_angel(mon) {
    if (mon) {
        if (canspotmon(mon)) {
            if (!Deaf()) {
                await pline(`${Monnam(mon)} rebukes you, saying:`);
                await verbalize('Since you desire conflict, have some more!');
            } else {
                await pline(`${Monnam(mon)} vanishes!`);
            }
        }
        await mongone(mon);
    }
    /* create 2 to 4 hostile angels to replace the lost guardian */
    for (let i = rn1(3, 2); i > 0; --i) {
        const mm = enexto_out(game.u.ux, game.u.uy, permonstTemplate(PM_ANGEL));
        if (mm)
            await mk_roamer(PM_ANGEL, game.u.ualign.type, mm.x, mm.y, false);
    }
}

/* C ref: minion.c:502-566 — just entered the Astral Plane; receive tame
 * guardian angel if worthy. */
export async function gain_guardian_angel() {
    const u = game.u;
    Hear_again(); /* attempt to cure any deafness now */
    if (Conflict()) {
        if (!Deaf())
            await pline('A voice booms:');
        else
            await pline('You feel a booming voice:');
        await verbalize('Thy desire for conflict shall be fulfilled!');
        /* send in some hostile angels instead */
        await lose_guardian_angel(null);
    } else if ((u.ualign.record | 0) > 8) { /* fervent */
        if (!Deaf())
            await pline('A voice whispers:');
        else
            await pline('You feel a soft voice:');
        await verbalize('Thou hast been worthy of me!');
        const mm = enexto_out(u.ux, u.uy, permonstTemplate(PM_ANGEL));
        let mtmp;
        if (mm && (mtmp = await mk_roamer(PM_ANGEL, u.ualign.type, mm.x, mm.y, true))) {
            mtmp.mstrategy = (mtmp.mstrategy & ~STRAT_APPEARMSG) >>> 0;
            /* guardian angel -- the one case mtame doesn't imply an edog;
             * petless conduct on the final level keeps the angel untamed. */
            if (u.uconduct && (u.uconduct.pets | 0)) {
                mtmp.mtame = 10;
                u.uconduct.pets = (u.uconduct.pets | 0) + 1;
            }
            /* for 'hilite_pet'; after making tame, before next message */
            newsym(mtmp.mx, mtmp.my);
            if (!Blind())
                await pline('An angel appears near you.');
            else
                await pline('You feel the presence of a friendly angel near you.');
            /* make him strong enough vs. endgame foes */
            mtmp.m_lev = rn1(8, 15);
            mtmp.mhp = mtmp.mhpmax = d(mtmp.m_lev | 0, 10) + 30 + rnd(30);
            let otmp = await select_hwep(mtmp);
            if (!otmp) {
                otmp = await mksobj(SILVER_SABER, false, false);
                if (await mpickobj(mtmp, otmp))
                    throw new Error('merged weapon?');
            }
            bless(otmp);
            if ((otmp.spe | 0) < 4)
                otmp.spe = (otmp.spe | 0) + rnd(4);
            otmp = which_armor(mtmp, W_ARMS);
            if (!otmp || otmp.otyp !== SHIELD_OF_REFLECTION) {
                await mongets(mtmp, AMULET_OF_REFLECTION, mksobj);
                await m_dowear(mtmp, true);
            }
        }
    }
}
