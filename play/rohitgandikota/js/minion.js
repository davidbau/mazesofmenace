// minion.js — aligned minions.
// C ref: src/minion.c
//
// Only the Astral-arrival guardian angel machinery is here so far: the
// worthy hero's tame Angel (gain_guardian_angel) and the hostile
// replacements a conflict-causing hero gets instead (lose_guardian_angel).
// msummon(), demon bribery and minion summons record when reached.

import { game } from './gstate.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { PMNAMES } from './monst_data.js';
import { ONAMES } from './objects_data.js';
import { W_ARMS } from './const.js';
import { enexto } from './teleport.js';
import { mk_roamer } from './priest.js';
import { mongets } from './makemon.js';
import { mksobj, bless } from './mkobj.js';
import { mpickobj } from './steal.js';
import { select_hwep } from './weapon.js';
import { which_armor, m_dowear } from './worn.js';
import { newsym, pline, canspotmon } from './display.js';
import { You_feel } from './pline.js';
import { Deaf } from './youprop.js';
import { mongone } from './mon.js';
import { Monnam } from './do_name.js';

function note_unported_minion(what) {
    (game.unported ||= new Set()).add('minion:' + what);
}

// src/minion.c:469 lose_guardian_angel() — the angel rebukes a conflict
// hero (or never appears) and 2 to 4 hostile angels arrive instead.
export async function lose_guardian_angel(mon) {
    const mm = { x: 0, y: 0 };

    if (mon) {
        if (canspotmon(mon)) {
            if (!Deaf()) {
                await pline(`${Monnam(mon)} rebukes you, saying:`);
                await pline('"Since you desire conflict, have some more!"');
            } else {
                await pline(`${Monnam(mon)} vanishes!`);
            }
        }
        mongone(mon);
    }
    /* create 2 to 4 hostile angels to replace the lost guardian */
    for (let i = rn1(3, 2); i > 0; --i) {
        mm.x = game.u.ux;
        mm.y = game.u.uy;
        if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_ANGEL]))
            mk_roamer(game.mons[PMNAMES.PM_ANGEL], game.u.ualign.type,
                      mm.x, mm.y, false);
    }
}

// src/minion.c:498 gain_guardian_angel() — just entered the Astral Plane;
// receive a tame guardian angel if worthy (alignment record > 8).
export async function gain_guardian_angel() {
    const mm = { x: 0, y: 0 };

    /* Hear_again() (eat.c:1800): attempt to cure any deafness now (divine
       message will be heard even if that fails). The rn2(2) is
       unconditional; make_deaf(0) itself is the unwired part (the DEAF
       property timer machinery), so on success the timer is just cleared. */
    if (!rn2(2)) {
        (game.u.intrinsic ||= {}).HDeaf = 0;  /* make_deaf(0L, FALSE) */
        game.botl = true;
    }
    if (game.u.uprops?.CONFLICT) {
        if (!Deaf())
            await pline('A voice booms:');
        else
            await You_feel('a booming voice:');
        await pline('"Thy desire for conflict shall be fulfilled!"');
        /* send in some hostile angels instead */
        await lose_guardian_angel(null);
    } else if (game.u.ualign.record > 8) { /* fervent */
        if (!Deaf())
            await pline('A voice whispers:');
        else
            await You_feel('a soft voice:');
        await pline('"Thou hast been worthy of me!"');
        mm.x = game.u.ux;
        mm.y = game.u.uy;
        let mtmp;
        if (enexto(mm, mm.x, mm.y, game.mons[PMNAMES.PM_ANGEL])
            && (mtmp = mk_roamer(game.mons[PMNAMES.PM_ANGEL],
                                 game.u.ualign.type, mm.x, mm.y,
                                 true)) != null) {
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~0x80000000; /* APPEARMSG */
            /* guardian angel -- the one case mtame doesn't imply an
               edog structure. Petless conduct is preserved: the angel
               appears but won't be tamed. */
            if (game.u.uconduct?.pets) {
                mtmp.mtame = 10;
                game.u.uconduct.pets++;
            }
            /* for 'hilite_pet'; after making tame, before next message */
            await newsym(mtmp.mx, mtmp.my);
            if (!game.u.ublind)
                await pline('An angel appears near you.');
            else
                await You_feel(
                    'the presence of a friendly angel near you.');
            /* make him strong enough vs. endgame foes */
            mtmp.m_lev = rn1(8, 15);
            mtmp.mhp = mtmp.mhpmax =
                d(mtmp.m_lev, 10) + 30 + rnd(30);
            let otmp = select_hwep(mtmp);
            if (!otmp) {
                otmp = mksobj(ONAMES.SILVER_SABER, false, false);
                if (mpickobj(mtmp, otmp))
                    throw new Error('merged weapon?');
            }
            bless(otmp);
            if (otmp.spe < 4)
                otmp.spe += rnd(4);
            otmp = which_armor(mtmp, W_ARMS);
            if (!otmp || otmp.otyp !== ONAMES.SHIELD_OF_REFLECTION) {
                mongets(mtmp, ONAMES.AMULET_OF_REFLECTION);
                m_dowear(mtmp, true);
            }
        }
    }
}
