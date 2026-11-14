/* minion.js — C ref: nethack-c-v5/upstream/src/minion.c (lose_guardian_angel,
 * gain_guardian_angel).  Not wired: final_level (do.c:2043-2053) is the caller
 * and its Astral arm in js/cmd.js is a later step. */
import { game } from './gstate.js';
import { CONFLICT, STRAT_APPEARMSG } from './const.js';
import { PM_ANGEL } from './pm.generated.js';
import { rn1 } from './rng.js';
import { rnd, d } from './rnd.js';
import { mon_has_amulet } from './sit.js';
import { is_dprince, is_demon, set_malign, Inhell } from './makemon.js';
import { tele_restrict, rloc } from './teleport.js';
import { money_cnt } from './hack.js';
import { is_fainted, reset_faint } from './eat.js';
import { stop_occupation } from './allmain.js';
import { nomul, unmul } from './hack.js';
import { money2mon, currency } from './shk.js';
import { getlin } from './windows.js';
import { acurr } from './attrib.js';
import { A_CHA, RLOC_MSG, LL_UMONST } from './const.js';
import { canseemon } from './display.js';
import { livelog_printf } from './pline.js';
import { mon_nam } from './uhitm.js';
import { x_monnam, Amonnam } from './do_name.js';
import { newsym, canspotmon, Deaf } from './display.js';
import { pline, You_feel } from './pline.js';
import { Blind } from './vision.js';
import { Monnam } from './mcastu.js';
import { Hear_again } from './eat.js';
import { verbalize, SetVoice } from './cmd.js';
import { mk_roamer } from './priest.js';
import { enexto_out } from './teleport.js';
import { permonstTemplate } from './makemon.js';
import { which_armor } from './worn.js';
import { mksobj } from './mkobj.js';
import { mpickobj } from './steal.js';
import { mongone } from './mon.js';
import { select_hwep } from './weapon.js';
import { mongets } from './makemon.js';
import { m_dowear } from './worn.js';
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
                SetVoice(mon, 0, 80, 0);
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
        SetVoice(null, 0, 80, 0 /* voice_deity */);
        await verbalize('Thy desire for conflict shall be fulfilled!');
        /* send in some hostile angels instead */
        await lose_guardian_angel(null);
    } else if ((u.ualign.record | 0) > 8) { /* fervent */
        if (!Deaf())
            await pline('A voice whispers:');
        else
            await You_feel('a soft voice:');
        SetVoice(null, 0, 80, 0 /* voice_deity */);
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
export const S_DEMON = 56;
import { NON_PM } from './const.js';
import { A_CHAOTIC, A_NEUTRAL, A_NONE, EMIN, G_GONE, MM_EMIN, MM_NOMSG } from './const.js'; // relocate-fns
import { show_transient_light, transient_light_cleanup } from './light.js'; // relocate-fns
import { is_ndemon, mkclass, mkclassAligned, newmextra } from './makemon.js'; // relocate-fns
import monsPack from './makemon_mons.json' with { type: 'json' }; // relocate-fns
import { is_lminion } from './mcastu.js'; // relocate-fns
import { makemon } from './makemon.js'; // relocate-fns
import { PM_AIR_ELEMENTAL, PM_ARCHON, PM_BONE_DEVIL, PM_DEMOGORGON, PM_EARTH_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_JUIBLEX, PM_ORCUS, PM_SKELETON, PM_WATER_ELEMENTAL, PM_WIZARD_OF_YENDOR, PM_YEENOGHU, PM_YELLOW_LIGHT } from './pm.generated.js'; // relocate-fns
import { G_UNIQ } from './read.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { M2_DEMON, M2_PRINCE, _ENV_T } from './sit.js'; // relocate-fns
import { DEADMONSTER } from './wizard.js'; // relocate-fns
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
    livelog_printf(LL_UMONST, 'bribed %s with %ld %s for safe passage',
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

/* C ref: nethack-c-v5/upstream/src/minion.c:27-34 free_emin — release a
 * monster's minion extension and clear isminion. Not exported in C
 * (top-level, non-static, but this port has no other caller yet); kept
 * private here since make_familiar is its only user.  As in C, the only
 * emin storage is mextra.emin. */
export function free_emin(mtmp) {
    if (mtmp.mextra && mtmp.mextra.emin)
        mtmp.mextra.emin = null;
    mtmp.isminion = 0;
}

/* C minion.c:391-439.  These selectors deliberately retain their retry loops:
 * mkclass_aligned and the gone/alignment checks each consume RNG in C. */
function dprince(atyp) {
    const inEndgame = !!(game.u?.uz && game.astral_level
                          && game.u.uz.dnum === game.astral_level.dnum);
    for (let tries = inEndgame ? 0 : 20; tries > 0; --tries) {
        const pm = PM_ORCUS + rn1(PM_DEMOGORGON + 1 - PM_ORCUS, 0);
        const v = game.mvitals?.[pm];
        const d = permonstTemplate(pm);
        if (!((v?.mvflags | 0) & G_GONE) /* C minion.c:397 */
            && (atyp === A_NONE || Math.sign(d.maligntyp | 0) === Math.sign(atyp)))
            return pm;
    }
    return dlord(atyp);
}

export function dlord(atyp) {
    const inEndgame = !!(game.u?.uz && game.astral_level
                          && game.u.uz.dnum === game.astral_level.dnum);
    for (let tries = inEndgame ? 0 : 20; tries > 0; --tries) {
        const pm = PM_JUIBLEX + rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, 0);
        const v = game.mvitals?.[pm];
        const d = permonstTemplate(pm);
        if (!((v?.mvflags | 0) & G_GONE)
            && (atyp === A_NONE || Math.sign(d.maligntyp | 0) === Math.sign(atyp)))
            return pm;
    }
    return ndemon(atyp);
}

const S_ANGEL = 27;

export function lminion() {
    for (let tries = 0; tries < 20; ++tries) {
        const pm = mkclass(S_ANGEL, 0);
        if (pm !== null && pm !== NON_PM
            && !(permonstTemplate(pm).mflags2 & M2_LORD))
            return pm;
    }
    return NON_PM;
}

/* C minion.c:419-426 llord */
function llord() {
    if (!(game.mvitals?.[PM_ARCHON]?.mvflags & G_GONE))
        return PM_ARCHON;
    return lminion(); /* approximate */
}

const S_LIGHT = 25; /* defsym.h MONSYM(25, 'y', LIGHT, S_LIGHT) */

export async function msummon(mon) {
    const ptr = mon?.data || permonstTemplate(PM_WIZARD_OF_YENDOR);
    const ART_DEMONBANE = 12;
    /* C minion.c:69-74: Demonbane prevents summoning before any RNG. */
    if (mon && game.u.uwep?.oartifact === ART_DEMONBANE && (ptr.mflags2 & M2_DEMON)) {
        if (canseemon(mon)) await pline('%s looks puzzled for a moment.', Monnam(mon));
        return 0;
    }
    /* C minion.c:76-82: a priest or minion carries its own alignment; any
     * other species keeps A_NONE (the Wizard), which dprince()/dlord() read
     * as "any alignment".  Math.sign(A_NONE) is -1 and would reject every
     * prince of the other sign. */
    const atyp = (mon?.ispriest && mon.mextra?.epri) ? mon.mextra.epri.shralign
        : (mon?.isminion && mon.mextra?.emin) ? mon.mextra.emin.min_align
        : ptr.maligntyp === A_NONE ? A_NONE : Math.sign(ptr.maligntyp | 0);
    let dtype = NON_PM, cnt = 0;
    const princeOrWizard = ((ptr.mflags2 & M2_DEMON) && (ptr.mflags2 & M2_PRINCE))
        || ptr.pmidx === PM_WIZARD_OF_YENDOR;
    if (princeOrWizard) {
        dtype = !rn2(20) ? dprince(atyp) : !rn2(4) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && is_ndemon(permonstTemplate(dtype)) ? 2 : 1;
    } else if ((ptr.mflags2 & M2_DEMON) && (ptr.mflags2 & M2_LORD)) {
        dtype = !rn2(50) ? dprince(atyp) : !rn2(20) ? dlord(atyp) : ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && is_ndemon(permonstTemplate(dtype)) ? 2 : 1;
    } else if ((ptr.pmidx | 0) === PM_BONE_DEVIL) {
        dtype = PM_SKELETON; cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = !rn2(20) ? dlord(atyp) : !rn2(6) ? ndemon(atyp) : (ptr.pmidx | 0);
        cnt = 1;
    } else if (is_lminion(mon)) { /* monst.h:281; mon is non-null here (the Wizard takes the first arm) */
        dtype = (ptr.mflags2 & M2_LORD) && !rn2(20) ? llord()
            : ((ptr.mflags2 & M2_LORD) || !rn2(6)) ? lminion() : (ptr.pmidx | 0);
        cnt = dtype !== NON_PM && !rn2(4) && !(permonstTemplate(dtype).mflags2 & M2_LORD) ? 2 : 1;
    } else if ((ptr.pmidx | 0) === PM_ANGEL) {
        if (rn2(6)) dtype = PM_ANGEL;
        else if (atyp === A_NEUTRAL)
            dtype = [PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL][rn2(4)];
        else if (atyp === A_CHAOTIC || atyp === A_NONE) dtype = ndemon(atyp);
        cnt = dtype !== NON_PM && !rn2(4) && !(permonstTemplate(dtype).mflags2 & M2_LORD) ? 2 : 1;
    }
    if (dtype === NON_PM) return 0;
    /* C minion.c:137-148 — sanity checks */
    if (cnt > 1 && (permonstTemplate(dtype).geno & G_UNIQ)) cnt = 1;
    if ((game.mvitals?.[dtype]?.mvflags & G_GONE) !== 0) {
        dtype = ndemon(atyp);
        if (dtype === NON_PM) return 0;
    }
    /* C:152 — "some candidates can generate a group of monsters, so simple
       count of non-null makemon() result is not sufficient" */
    const census = monster_census(false);
    let result = 0, xlight = false;
    while (cnt-- > 0) {
        const m = await makemon(dtype, game.u.ux | 0, game.u.uy | 0, MM_EMIN | MM_NOMSG);
        if (m) {
            result++;
            /* C:159-167 — an angel's alignment should match the summoner */
            if (dtype === PM_ANGEL) {
                m.isminion = 1;
                newemin(m);
                m.mextra.emin.min_align = atyp;
                m.mextra.emin.renegade = ((atyp !== game.u.ualign.type) ^ !m.mpeaceful) ? 1 : 0;
            }
            if (m.data.mlet === S_ANGEL && !Blind()) { /* C minion.c:162-170 */
                await show_transient_light(null, m.mx, m.my);
                xlight = true;
            }
            if (cnt === 0 && canseemon(m)) {
                const d = m.data, k = d.mlet === S_ANGEL ? PM_ANGEL : d.mlet === S_LIGHT ? PM_YELLOW_LIGHT /* mondata.c:1452-1454 */ : (d.pmidx | 0);
                const [cloud, what] = _ENV_T[k] || ['cloud', 'smoke'];
                await pline(`${Amonnam(m)} appears in a ${cloud} of ${what}!`);
            }
        }
    }
    if (xlight) await transient_light_cleanup(); /* C minion.c:183-188 */
    /* C:190-192 */
    if (result) result = monster_census(false) - census;
    return result;
}

const M2_LORD = 0x00000400;

const MONS = /** @type {any[]} */ (monsPack.mons);

export function ndemon(atyp) {
    const ptr = mkclassAligned(S_DEMON, 0, atyp);
    if (ptr === null || ptr === NON_PM)
        return NON_PM;
    const mflags2 = MONS[ptr][7] | 0;
    const is_demon = (mflags2 & M2_DEMON) !== 0;
    const is_lord = (mflags2 & M2_LORD) !== 0;
    const is_prince = (mflags2 & M2_PRINCE) !== 0;
    if (is_demon && !is_lord && !is_prince)
        return ptr;
    return NON_PM;
}

/* ---------------------------------------------------------------------------
 * newemin — allocate and init emin (minion extended data)
 * C ref: nethack-c-v5/upstream/src/minion.c:17-26
 * ---------------------------------------------------------------------------
 */
export function newemin(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EMIN(mtmp)) {
        mtmp.mextra.emin = { min_align: 0, renegade: 0, parentmid: mtmp.m_id };
    }
}

export function monster_census(spotted) {
    let count = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}
