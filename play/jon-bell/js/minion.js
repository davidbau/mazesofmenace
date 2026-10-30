/* minion.js — C ref: nethack-c-v5/upstream/src/minion.c (lose_guardian_angel,
 * gain_guardian_angel).  Not wired: final_level (do.c:2043-2053) is the caller
 * and its Astral arm in js/cmd.js is a later step. */
import { game } from './gstate.js';
import { CONFLICT, STRAT_APPEARMSG } from './const.js';
import { PM_ANGEL } from './pm.generated.js';
import { rn1, rnd, d } from './rng.js';
import { mon_has_amulet } from './sit.js';
import { is_dprince, is_demon, set_malign, Inhell } from './makemon.js';
import { tele_restrict, rloc } from './teleport.js';
import { money_cnt } from './com_pager.js';
import { is_fainted, reset_faint } from './eat.js';
import { nomul, unmul, stop_occupation } from './allmain.js';
import { money2mon, currency } from './shk.js';
import { getlin } from './wizcmds.js';
import { acurr } from './attrib.js';
import { A_CHA, RLOC_MSG } from './const.js';
import { canseemon, livelog_printf } from './display.js';
import { mon_nam } from './uhitm.js';
import { x_monnam, Amonnam } from './mhitm.js';
import { pline, newsym, canspotmon, Deaf, You_feel } from './display.js';
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
import { bless } from './mkobj.js';

const SILVER_SABER = 51;              /* objects.h WEAPON("silver saber") */
const AMULET_OF_REFLECTION = 208;
const SHIELD_OF_REFLECTION = 158;
const W_ARMS = 0x00000008;

/* C macro Conflict (youprop.h:218) := HConflict || EConflict. */
function Conflict() {
    const p = game.u?.uprops?.[CONFLICT];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
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
            await You_feel('a booming voice:');
        await verbalize('Thy desire for conflict shall be fulfilled!');
        /* send in some hostile angels instead */
        await lose_guardian_angel(null);
    } else if ((u.ualign.record | 0) > 8) { /* fervent */
        if (!Deaf())
            await pline('A voice whispers:');
        else
            await You_feel('a soft voice:');
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
                await You_feel('the presence of a friendly angel near you.');
            /* make him strong enough vs. endgame foes */
            mtmp.m_lev = rn1(8, 15);
            mtmp.mhp = mtmp.mhpmax = d(mtmp.m_lev | 0, 10) + 30 + rnd(30);
            let otmp = await select_hwep(mtmp);
            if (!otmp) {
                otmp = await mksobj(SILVER_SABER, false, false);
                if (await mpickobj(mtmp, otmp))
                    throw new Error('merged weapon?');
            }
            await bless(otmp);
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

/* C minion.c:255 — #define Athome (Inhell && (mtmp->cham == NON_PM)) */
const S_DEMON = 56;
const NON_PM = -1;
const sgn = (x) => (x > 0) - (x < 0);
function u_wield_art_mn(art) {
    const uwep = game.u?.uwep;
    return !!uwep && (uwep.oartifact | 0) === art;
}

/* C ref: minion.c:257-352 demon_talk() — returns 1 if it won't attack. */
export async function demon_talk(mtmp) {
    const u = game.u;
    const ART_EXCALIBUR = 1, ART_DEMONBANE = 12;
    if (u_wield_art_mn(ART_EXCALIBUR) || u_wield_art_mn(ART_DEMONBANE)) {
        if (canspotmon(mtmp))
            await pline(`${Amonnam(mtmp)} looks very angry.`);
        else
            await You_feel('tension building.');
        mtmp.mpeaceful = mtmp.mtame = 0;
        set_malign(mtmp);
        newsym(mtmp.mx, mtmp.my);
        return 0;
    }
    if (is_fainted()) {
        await reset_faint();
    } else {
        await stop_occupation();
        if ((game.multi | 0) > 0) {
            nomul(0);
            await unmul(null);
        }
    }
    /* Slight advantage given. */
    if (is_dprince(mtmp.data ?? permonstTemplate(mtmp.mndx)) && mtmp.minvis) {
        const wasunseen = !canspotmon(mtmp);
        mtmp.minvis = mtmp.perminvis = 0;
        if (wasunseen && canspotmon(mtmp)) {
            await pline(`${Amonnam(mtmp)} appears before you.`);
            mtmp.mstrategy &= ~STRAT_APPEARMSG;
        }
        newsym(mtmp.mx, mtmp.my);
    }
    const uPtr = ((u.umonnum | 0) > 0 && u.mtimedone) ? permonstTemplate(u.umonnum) : null;
    if (uPtr && (uPtr.mlet | 0) === S_DEMON) { /* Won't blackmail their own. */
        if (!Deaf())
            await pline(`${Amonnam(mtmp)} says, "Good hunting, ${game.flags?.female ? 'Sister' : 'Brother'}."`);
        else if (canseemon(mtmp))
            await pline(`${Amonnam(mtmp)} says something.`);
        if (!tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
        return 1;
    }
    const cash = money_cnt(game.invent);
    const mptr = mtmp.data ?? permonstTemplate(mtmp.mndx);
    const athome = (Inhell() && (mtmp.cham ?? NON_PM) === NON_PM) ? 1 : 0;
    let demand = Math.trunc((cash * (rnd(80) + 20 * athome))
        / (100 * (1 + (sgn(u.ualign.type) === sgn(mptr.maligntyp) ? 1 : 0))));
    if (!demand || (game.multi | 0) < 0) { /* you have no gold or can't move */
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        return 0;
    }
    if (mon_has_amulet(mtmp) || Deaf())
        demand = cash + rn1(1000, 125);
    if (!Deaf())
        await pline(`${Amonnam(mtmp)} demands ${demand} ${currency(demand)} for safe passage.`);
    else if (canseemon(mtmp))
        await pline(`${Amonnam(mtmp)} seems to be demanding something.`);
    let offer = 0;
    if (!Deaf() && ((offer = await bribe(mtmp, 'How much will you offer?')) >= demand)) {
        await pline(`${Amonnam(mtmp)} vanishes, laughing about cowardly mortals.`);
    } else if (offer > 0 && rnd(5 * acurr(u, A_CHA)) > (demand - offer)) {
        await pline(`${Amonnam(mtmp)} scowls at you menacingly, then vanishes.`);
    } else {
        await pline(`${Amonnam(mtmp)} gets angry...`);
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        return 0;
    }
    livelog_printf(0x0800 /* LL_UMONST */, 'bribed %s with %ld %s for safe passage',
        x_monnam(mtmp, 1, null, 0x1F, false), offer, offer === 1 ? 'zorkmid' : 'zorkmids');
    await mongone(mtmp);
    return 1;
}

/* C ref: minion.c:354-382 bribe() */
export async function bribe(mtmp, prompt) {
    const umoney = money_cnt(game.invent);
    const buf = await getlin(prompt);
    let offer = parseInt(buf, 10);
    if (!Number.isFinite(offer)) offer = 0;
    if (offer < 0) {
        await pline(`You try to shortchange ${mon_nam(mtmp)}, but fumble.`);
        return 0;
    } else if (offer === 0) {
        await pline('You refuse.');
        return 0;
    } else if (offer >= umoney) {
        await pline(`You give ${mon_nam(mtmp)} all your gold.`);
        offer = umoney;
    } else {
        await pline(`You give ${mon_nam(mtmp)} ${offer} ${currency(offer)}.`);
    }
    await money2mon(mtmp, offer);
    if (game.disp) game.disp.botl = 1;
    return offer;
}
