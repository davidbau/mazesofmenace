// minion.js — minions and summoned monsters.
// C ref: minion.c — monster_census(), msummon(), summon_minion(), dprince(),
// dlord(), llord(), lminion() (ndemon() lives in makemon.js).
//
// demon_talk(), bribe().
//
// Not ported yet: the rest of minion.c (lose_guardian_angel(),
// gain_guardian_angel()).

import { game } from './gstate.js';
import { canspotmon, canseemon, pline, You_feel, verbalize } from './display.js';
import { ROLL_FROM, rn2, rn1 } from './rng.js';
import { makemon, mkclass, ndemon } from './makemon.js';
import { monsndx, is_lord } from './mondata.js';
import { mons, S_ANGEL, PM_ANGEL, PM_SHOPKEEPER, PM_GUARD,
         PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_AIR_ELEMENTAL,
         PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL,
         PM_WATER_ELEMENTAL } from './monsters.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, NON_PM, MM_EMIN, MM_NOMSG,
         STRAT_APPEARMSG, DEAF } from './const.js';
import { Amonnam, Monnam } from './do_name.js';
import { s_suffix, sgn } from './hacklib.js';
import { align_gname } from './pray.js';
import { is_ndemon, is_lminion } from './makemon.js';
import { is_demon, is_dprince, is_dlord, msummon_environ } from './mondata.js';
import { PM_WIZARD_OF_YENDOR, PM_BONE_DEVIL, PM_SKELETON, PM_ORCUS,
         PM_DEMOGORGON, PM_JUIBLEX, PM_YEENOGHU, PM_ARCHON,
         G_UNIQ } from './monsters.js';
import { G_GONE, In_endgame } from './const.js';
import { u_wield_art } from './objects.js';
import { ART_DEMONBANE } from './artilist.js';
import { Blind } from './youprop.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import { newsym, You } from './display.js';
import { rnd } from './rng.js';
import { set_malign } from './makemon.js';
import { is_fainted, reset_faint } from './eat.js';
import { stop_occupation, unmul } from './allmain.js';
import { nomul } from './hack.js';
import { tele_restrict, rloc } from './teleport.js';
import { RLOC_MSG, A_CHA, LL_UMONST } from './const.js';
import { S_DEMON } from './monsters.js';
import { Deaf } from './youprop.js';
import { money_cnt } from './u_init.js';
import { mon_has_amulet } from './dog.js';
import { currency } from './insight.js';
import { ACURR } from './attrib.js';
import { livelog_printf } from './display.js';
import { x_monnam, mon_nam, ARTICLE_A, EXACT_NAME } from './do_name.js';
import { mongone } from './mon.js';
import { money2mon } from './shk.js';
import { tty_getlin } from './wintty.js';
import { In_hell } from './dungeon.js';
import { ART_EXCALIBUR } from './artilist.js';

/* used to pick among the four basic elementals without worrying whether
   they've been reordered (difficulty reassessment?) or any new ones have
   been introduced (hybrid types added to 'E'-class?) */
const elementals = [
    PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL,
    PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL,
];

// C ref: minion.c msummon()
/* mon summons a monster */
export async function msummon(mon) {
    const u = game.u;
    let ptr;
    let dtype = NON_PM, cnt = 0, result = 0, census;
    let xlight;
    let atyp;
    let mtmp;

    if (mon) {
        ptr = mon.data;

        if (u_wield_art(ART_DEMONBANE) && is_demon(ptr)) {
            if (canseemon(mon))
                await pline(`${Monnam(mon)} looks puzzled for a moment.`);
            return 0;
        }

        atyp = mon.ispriest ? mon.epri.shralign /* EPRI(mon) */
               : mon.isminion ? mon.emin.min_align /* EMIN(mon) */
                 : (ptr.maligntyp === A_NONE) ? A_NONE
                   : sgn(ptr.maligntyp);
    } else {
        ptr = mons[PM_WIZARD_OF_YENDOR];
        atyp = (ptr.maligntyp === A_NONE) ? A_NONE : sgn(ptr.maligntyp);
    }

    if (is_dprince(ptr) || (ptr === mons[PM_WIZARD_OF_YENDOR])) {
        dtype = (!rn2(20)) ? dprince(atyp) : (!rn2(4)) ? dlord(atyp)
                                                       : ndemon(atyp);
        cnt = ((dtype !== NON_PM)
               && !rn2(4) && is_ndemon(mons[dtype])) ? 2 : 1;
    } else if (is_dlord(ptr)) {
        dtype = (!rn2(50)) ? dprince(atyp) : (!rn2(20)) ? dlord(atyp)
                                                        : ndemon(atyp);
        cnt = ((dtype !== NON_PM)
               && !rn2(4) && is_ndemon(mons[dtype])) ? 2 : 1;
    } else if (ptr === mons[PM_BONE_DEVIL]) {
        dtype = PM_SKELETON;
        cnt = 1;
    } else if (is_ndemon(ptr)) {
        dtype = (!rn2(20)) ? dlord(atyp) : (!rn2(6)) ? ndemon(atyp)
                                                     : monsndx(ptr);
        cnt = 1;
    } else if (is_lminion(mon)) {
        dtype = (is_lord(ptr) && !rn2(20))
                    ? llord()
                    : (is_lord(ptr) || !rn2(6)) ? lminion() : monsndx(ptr);
        cnt = ((dtype !== NON_PM)
               && !rn2(4) && !is_lord(mons[dtype])) ? 2 : 1;
    } else if (ptr === mons[PM_ANGEL]) {
        /* non-lawful angels can also summon */
        if (!rn2(6)) {
            switch (atyp) { /* see summon_minion */
            case A_NEUTRAL:
                dtype = ROLL_FROM(elementals);
                break;
            case A_CHAOTIC:
            case A_NONE:
                dtype = ndemon(atyp);
                break;
            }
        } else {
            dtype = PM_ANGEL;
        }
        cnt = ((dtype !== NON_PM)
               && !rn2(4) && !is_lord(mons[dtype])) ? 2 : 1;
    }

    if (dtype === NON_PM)
        return 0;

    /* sanity checks */
    if (cnt > 1 && (mons[dtype].geno & G_UNIQ) !== 0)
        cnt = 1;
    /*
     * If this daemon is unique and being re-summoned (the only way we
     * could get this far with an extinct dtype), try another.
     */
    if ((game.mvitals[dtype].mvflags & G_GONE) !== 0) {
        dtype = ndemon(atyp);
        if (dtype === NON_PM)
            return 0;
    }

    /* some candidates can generate a group of monsters, so simple
       count of non-null makemon() result is not sufficient */
    census = monster_census(false);
    xlight = false;

    while (cnt > 0) {
        mtmp = makemon(mons[dtype], u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mtmp) {
            result++;
            /* an angel's alignment should match the summoner */
            if (dtype === PM_ANGEL) {
                mtmp.isminion = 1;
                mtmp.emin.min_align = atyp;
                /* renegade if same alignment but not peaceful
                   or peaceful but different alignment */
                mtmp.emin.renegade =
                    !!((atyp !== u.ualign.type) ^ !mtmp.mpeaceful);
            }

            if (mtmp.data.mlet === S_ANGEL && !Blind()) {
                /* for any 'A', 'cloud of smoke' will be 'flash of light';
                   if more than one monster is being created, that message
                   might be skipped for this monster but show 'mtmp' anyway */
                await show_transient_light(null, mtmp.mx, mtmp.my);
                xlight = true;
                /* we don't do this for 'burst of flame' (fire elemental)
                   because those monsters become their own light source */
            }

            if (cnt === 1 && canseemon(mtmp)) {
                const { what, cloud } = msummon_environ(mtmp.data);

                await pline(`${Amonnam(mtmp)} appears in a ${cloud} of ${what}!`);
            }
        }
        cnt--;
    }

    if (xlight) {
        /* Note: if we forced --More-- here, the 'A's would be visible for
           long enough to be seen, but like with clairvoyance, some players
           would be annoyed at the disruption of having to acknowledge it */
        await transient_light_cleanup();
    }

    /* how many monsters exist now compared to before? */
    if (result)
        result = monster_census(false) - census;

    return result;
}

// C ref: minion.c summon_minion()
export async function summon_minion(alignment, talk) {
    const u = game.u;
    let mon;
    let mnum;

    switch (alignment) {
    case A_LAWFUL:
        mnum = lminion();
        break;
    case A_NEUTRAL:
        mnum = ROLL_FROM(elementals);
        break;
    case A_CHAOTIC:
    case A_NONE:
        mnum = ndemon(alignment);
        break;
    default:
        console.error("impossible: unaligned player?");
        mnum = ndemon(A_NONE);
        break;
    }
    if (mnum === NON_PM) {
        mon = null;
    } else if (mnum === PM_ANGEL) {
        mon = makemon(mons[mnum], u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else if (mnum !== PM_SHOPKEEPER && mnum !== PM_GUARD
               && mnum !== PM_ALIGNED_CLERIC && mnum !== PM_HIGH_CLERIC) {
        /* This was mons[mnum].pxlth == 0 but is this restriction
           appropriate or necessary now that the structures are separate? */
        mon = makemon(mons[mnum], u.ux, u.uy, MM_EMIN | MM_NOMSG);
        if (mon) {
            mon.isminion = 1;
            mon.emin.min_align = alignment;
            mon.emin.renegade = false;
        }
    } else {
        mon = makemon(mons[mnum], u.ux, u.uy, MM_NOMSG);
    }
    if (mon) {
        if (talk) {
            const Deaf = !!(u.uprops[DEAF]?.intrinsic || u.uprops[DEAF]?.extrinsic
                            || u.uroleplay?.deaf);
            if (!Deaf)
                await pline(`The voice of ${align_gname(alignment)} booms:`); /* pline_The() */
            else
                await You_feel(`${s_suffix(align_gname(alignment))} booming voice:`);
            /* SetVoice(mon, 0, 80, 0): speech synthesis only */
            await verbalize("Thou shalt pay for thine indiscretion!");
            if (canspotmon(mon))
                await pline(`${Amonnam(mon)} appears before you.`);
            mon.mstrategy &= ~STRAT_APPEARMSG;
        }
        mon.mpeaceful = 0;
        /* don't call set_malign(); player was naughty */
    }
}

// C ref: minion.c demon_talk()
/* returns 1 if it won't attack. */
export async function demon_talk(mtmp) {
    const u = game.u;
    let cash, demand, offer;
    /* #define Athome (Inhell && (mtmp->cham == NON_PM)) */
    const Athome = (In_hell(u.uz) && (mtmp.cham === NON_PM)) ? 1 : 0;

    if (u_wield_art(ART_EXCALIBUR) || u_wield_art(ART_DEMONBANE)) {
        if (canspotmon(mtmp))
            await pline(`${Amonnam(mtmp)} looks very angry.`);
        else
            await You_feel("tension building.");
        mtmp.mpeaceful = mtmp.mtame = 0;
        set_malign(mtmp);
        newsym(mtmp.mx, mtmp.my);
        return 0;
    }

    if (is_fainted()) {
        await reset_faint(); /* if fainted - wake up */
    } else {
        await stop_occupation();
        if (game.multi > 0) {
            nomul(0);
            await unmul(null);
        }
    }

    /* Slight advantage given. */
    if (is_dprince(mtmp.data) && mtmp.minvis) {
        const wasunseen = !canspotmon(mtmp);

        mtmp.minvis = mtmp.perminvis = 0;
        if (wasunseen && canspotmon(mtmp)) {
            await pline(`${Amonnam(mtmp)} appears before you.`);
            mtmp.mstrategy &= ~STRAT_APPEARMSG;
        }
        newsym(mtmp.mx, mtmp.my);
    }
    if (game.youmonst.data.mlet === S_DEMON) { /* Won't blackmail their own. */
        if (!Deaf())
            await pline(`${Amonnam(mtmp)} says, "Good hunting, ${
                game.flags.female ? "Sister" : "Brother"}."`);
        else if (canseemon(mtmp))
            await pline(`${Amonnam(mtmp)} says something.`);
        if (!(await tele_restrict(mtmp)))
            /* (void) */ await rloc(mtmp, RLOC_MSG);
        return 1;
    }
    cash = money_cnt(game.invent);
    demand = Math.trunc((cash * (rnd(80) + 20 * Athome))
                        / (100 * (1 + ((sgn(u.ualign.type)
                                        === sgn(mtmp.data.maligntyp)) ? 1 : 0))));

    if (!demand || game.multi < 0) { /* you have no gold or can't move */
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        return 0;
    } else {
        /* make sure that the demand is unmeetable if the monster
           has the Amulet, preventing monster from being satisfied
           and removed from the game (along with said Amulet...) */
        /* [actually the Amulet is safe; it would be dropped when
           mongone() gets rid of the monster; force combat anyway;
           also make it unmeetable if the player is Deaf, to simplify
           handling that case as player-won't-pay] */
        if (mon_has_amulet(mtmp) || Deaf())
            /* 125: 5*25 in case hero has maximum possible charisma */
            demand = cash + rn1(1000, 125);

        if (!Deaf())
            await pline(`${Amonnam(mtmp)} demands ${demand} ${
                currency(demand)} for safe passage.`);
        else if (canseemon(mtmp))
            await pline(`${Amonnam(mtmp)} seems to be demanding something.`);
        offer = 0;
        if (!Deaf()
            && ((offer = await bribe(mtmp, "How much will you offer?"))
                >= demand)) {
            await pline(`${Amonnam(mtmp)} vanishes, laughing about cowardly mortals.`);
        } else if (offer > 0
                   && rnd(5 * ACURR(A_CHA)) > (demand - offer)) {
            await pline(`${Amonnam(mtmp)} scowls at you menacingly, then vanishes.`);
        } else {
            await pline(`${Amonnam(mtmp)} gets angry...`);
            mtmp.mpeaceful = 0;
            set_malign(mtmp);
            return 0;
        }
    }
    /* if 'mtmp' is unrecognizable due to hero's hallucination,
       #chronicle will reveal its true identity -- just live with that;
       also, avoid random hallucinatory currency() units */
    livelog_printf(LL_UMONST, `bribed ${
        x_monnam(mtmp, ARTICLE_A, null, EXACT_NAME, false)} with ${offer} ${
        (offer === 1) ? "zorkmid" : "zorkmids"} for safe passage`);
    mongone(mtmp);
    return 1;
}

// C ref: minion.c bribe()
export async function bribe(mtmp, prompt) {
    let offer;
    const umoney = money_cnt(game.invent);

    const buf = (await tty_getlin(prompt)) || ''; /* getlin(prompt, buf) */
    /* if (sscanf(buf, "%ld", &offer) != 1) offer = 0L; */
    const m = /^\s*([+-]?\d+)/.exec(buf);
    offer = m ? parseInt(m[1], 10) : 0;

    /*Michael Paddon -- fix for negative offer to monster*/
    /*JAR880815 - */
    if (offer < 0) {
        await You(`try to shortchange ${mon_nam(mtmp)}, but fumble.`);
        return 0;
    } else if (offer === 0) {
        await You("refuse.");
        return 0;
    } else if (offer >= umoney) {
        await You(`give ${mon_nam(mtmp)} all your gold.`);
        offer = umoney;
    } else {
        await You(`give ${mon_nam(mtmp)} ${offer} ${currency(offer)}.`);
    }
    /* (void) */ await money2mon(mtmp, offer);
    game.disp_botl = true;
    return offer;
}

// C ref: minion.c dprince()
export function dprince(atyp) {
    let tryct, pm;

    for (tryct = !In_endgame(game.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        pm = rn1(PM_DEMOGORGON + 1 - PM_ORCUS, PM_ORCUS);
        if (!(game.mvitals[pm].mvflags & G_GONE)
            && (atyp === A_NONE || sgn(mons[pm].maligntyp) === sgn(atyp)))
            return pm;
    }
    return dlord(atyp); /* approximate */
}

// C ref: minion.c dlord()
export function dlord(atyp) {
    let tryct, pm;

    for (tryct = !In_endgame(game.u.uz) ? 20 : 0; tryct > 0; --tryct) {
        pm = rn1(PM_YEENOGHU + 1 - PM_JUIBLEX, PM_JUIBLEX);
        if (!(game.mvitals[pm].mvflags & G_GONE)
            && (atyp === A_NONE || sgn(mons[pm].maligntyp) === sgn(atyp)))
            return pm;
    }
    return ndemon(atyp); /* approximate */
}

// C ref: minion.c llord()
/* create lawful (good) lord */
export function llord() {
    if (!(game.mvitals[PM_ARCHON].mvflags & G_GONE))
        return PM_ARCHON;

    return lminion(); /* approximate */
}

// C ref: minion.c lminion()
export function lminion() {
    let tryct;
    let ptr;

    for (tryct = 0; tryct < 20; tryct++) {
        ptr = mkclass(S_ANGEL, 0);
        if (ptr && !is_lord(ptr))
            return monsndx(ptr);
    }

    return NON_PM;
}

// C ref: minion.c monster_census()
/* count the number of monsters on the level */
export function monster_census(spotted) /* seen|sensed vs all */
{
    let count = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER() */
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}
