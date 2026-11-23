// wizard.js — the Wizard of Yendor's tricks and the nasty monsters.
// C ref: wizard.c — nasties[], pick_nasty(), has_aggravatables(),
// clonewiz(), nasty().
//
// Also cuss(). Not ported yet: the rest of wizard.c (the Wizard's AI, amulet(),
// resurrect(), intervene()).

import { game } from './gstate.js';
import { ROLL_FROM, rn2, rnd } from './rng.js';
import * as MM from './monsters.js';
import { mons, G_HELL, G_NOHELL } from './monsters.js';
import { NEUTRAL, G_GENOD, Is_rogue_level, STRAT_WAITFORU, MM_NOWAIT,
         MM_NOMSG, NO_MM_FLAGS, M_AP_MONSTER, PROT_FROM_SHAPE_CHANGERS,
         In_endgame } from './const.js';
import { In_hell, In_W_tower } from './dungeon.js';
import { makemon, set_malign, m_at } from './makemon.js';
import { enexto } from './teleport.js';
import { add_to_minv, mksobj } from './mkobj.js';
import { FAKE_AMULET_OF_YENDOR } from './objects.js';
import { newsym } from './display.js';
import { monster_census } from './minion.js';
import { big_to_little } from './mondata.js';
import { def_monsyms } from './drawing.js';
import { pline } from './display.js';
import { Monnam } from './do_name.js';
import { com_pager } from './questpgr.js';
import { wake_nearto } from './mon.js';
import { mon_aligntyp } from './priest.js';
import { DEAF, A_LAWFUL } from './const.js';
import { STRAT_NONE, STRAT_HEAL, STRAT_GROUND, STRAT_MONSTR, STRAT_PLAYER,
         STRAT_WAITMASK, STRAT_APPEARMSG, STRAT_STRATMASK, STRAT_GOAL,
         RLOC_MSG, BOLT_LIM, u_at } from './const.js';
import { AMULET_OF_YENDOR, BELL_OF_OPENING, CANDELABRUM_OF_INVOCATION,
         SPE_BOOK_OF_THE_DEAD } from './objects.js';
import { ART_ORB_OF_DETECTION } from './artilist.js';
import { builds_up } from './dungeon.js';
import { rloc, rloc_to, mnexto, noteleport_level } from './teleport.js';
import { mnearto, healmon, monnear } from './mon.js';
import { expels } from './mhitu.js';
import { inhishop } from './shk.js';
import { inhistemple } from './priest.js';
import { mon_has_amulet } from './dog.js';
import { cansee } from './vision.js';
import { distant_name, doname } from './objnam.js';
import { obj_extract_self } from './mkobj.js';
import { mpickobj } from './steal.js';
import { dist2, isok } from './hacklib.js';

// C ref: wizard.c nasties[]
const nasties = [
    /* neutral */
    MM.PM_COCKATRICE, MM.PM_ETTIN, MM.PM_STALKER, MM.PM_MINOTAUR,
    MM.PM_OWLBEAR, MM.PM_PURPLE_WORM, MM.PM_XAN, MM.PM_UMBER_HULK,
    MM.PM_XORN, MM.PM_ZRUTY, MM.PM_LEOCROTTA, MM.PM_BALUCHITHERIUM,
    MM.PM_CARNIVOROUS_APE, MM.PM_FIRE_ELEMENTAL, MM.PM_JABBERWOCK,
    MM.PM_IRON_GOLEM, MM.PM_OCHRE_JELLY, MM.PM_GREEN_SLIME,
    MM.PM_DISPLACER_BEAST, MM.PM_GENETIC_ENGINEER,
    /* chaotic */
    MM.PM_BLACK_DRAGON, MM.PM_RED_DRAGON, MM.PM_ARCH_LICH, MM.PM_VAMPIRE_LEADER,
    MM.PM_MASTER_MIND_FLAYER, MM.PM_DISENCHANTER, MM.PM_WINGED_GARGOYLE,
    MM.PM_STORM_GIANT, MM.PM_OLOG_HAI, MM.PM_ELF_NOBLE, MM.PM_ELVEN_MONARCH,
    MM.PM_OGRE_TYRANT, MM.PM_CAPTAIN, MM.PM_GREMLIN,
    /* lawful */
    MM.PM_SILVER_DRAGON, MM.PM_ORANGE_DRAGON, MM.PM_GREEN_DRAGON,
    MM.PM_YELLOW_DRAGON, MM.PM_GUARDIAN_NAGA, MM.PM_FIRE_GIANT,
    MM.PM_ALEAX, MM.PM_COUATL, MM.PM_HORNED_DEVIL, MM.PM_BARBED_DEVIL,
    /* (Archons, titans, ki-rin, and golden nagas are suitably nasty, but
       they're summoners so would aggravate excessive summoning) */
];

// monsym(ptr): def_monsyms[ptr->mlet].sym
function monsym(ptr) { return def_monsyms[ptr.mlet]; }

// C ref: wizard.c pick_nasty()
/* also used by newcham() */
export function pick_nasty(
    difcap) /* if non-zero, try to make difficulty be lower than this */
{
    let alt, res = ROLL_FROM(nasties);

    /* To do?  Possibly should filter for appropriate forms when
     * in the elemental planes or surrounded by water or lava.
     *
     * We want monsters represented by uppercase on rogue level,
     * but we don't try very hard.
     */
    if (Is_rogue_level(game.u.uz)
        && !('A' <= monsym(mons[res]) && monsym(mons[res]) <= 'Z'))
        res = ROLL_FROM(nasties);

    /* if genocided or too difficult or out of place, try a substitute
       when a suitable one exists
           arch-lich -> master lich,
           master mind flayer -> mind flayer,
       but the substitutes are likely to be genocided too */
    alt = res;
    if ((game.mvitals[res].mvflags & G_GENOD) !== 0
        || (difcap > 0 && mons[res].difficulty >= difcap)
         /* note: nasty() -> makemon() ignores G_HELL|G_NOHELL;
            arch-lich and master lich are both flagged as hell-only;
            this filtering demotes arch-lich to master lich when
            outside of Gehennom (unless the latter has been genocided) */
        || (mons[res].geno & (In_hell(game.u.uz) ? G_NOHELL : G_HELL)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && (game.mvitals[alt].mvflags & G_GENOD) === 0) {
        const mnam = mons[alt].pmnames[NEUTRAL],
            sp = mnam.lastIndexOf(' '),
            lastspace = sp >= 0 ? mnam.slice(sp) : null;

        /* only non-juveniles can become alternate choice */
        if (mnam.slice(0, 5) !== 'baby '
            && (!lastspace
                || (lastspace !== ' hatchling'
                    && lastspace !== ' pup'
                    && lastspace !== ' cub')))
            res = alt;
    }

    return res;
}

/* C ref: monst.h DEADMONSTER(), helpless(); mondata.c attacktype() */
function DEADMONSTER(mon) { return mon.mhp < 1; }
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
function attacktype(ptr, atyp) { return ptr.mattk.some(a => a.aatyp === atyp); }
/* C ref: hack.h sgn() */
function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// C ref: wizard.c wizapp[]
const wizapp = [
    MM.PM_HUMAN, MM.PM_WATER_DEMON, MM.PM_VAMPIRE, MM.PM_RED_DRAGON,
    MM.PM_TROLL, MM.PM_UMBER_HULK, MM.PM_XORN, MM.PM_XAN,
    MM.PM_COCKATRICE, MM.PM_FLOATING_EYE, MM.PM_GUARDIAN_NAGA, MM.PM_TRAPPER,
];

// C ref: wizard.c has_aggravatables()
/* are there any monsters mon could aggravate? */
export function has_aggravatables(mon) {
    const u = game.u;
    const in_w_tower = In_W_tower(mon.mx, mon.my, u.uz);

    if (in_w_tower !== In_W_tower(u.ux, u.uy, u.uz))
        return false;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz))
            continue;
        if ((mtmp.mstrategy & STRAT_WAITFORU) !== 0 || helpless(mtmp))
            return true;
    }
    return false;
}

// C ref: wizard.c clonewiz()
/* "Double Trouble" spell cast by the Wizard; caller is responsible for
   only casting this when there is currently one wizard in existence;
   the clone can't use it unless/until its creator has been killed off */
export function clonewiz() {
    const u = game.u;
    let mtmp2;

    if ((mtmp2 = makemon(mons[MM.PM_WIZARD_OF_YENDOR], u.ux, u.uy, MM_NOWAIT))
        !== null) {
        mtmp2.msleeping = mtmp2.mtame = mtmp2.mpeaceful = 0;
        if (!u.uhave.amulet && rn2(2)) { /* give clone a fake */
            add_to_minv(mtmp2, mksobj(FAKE_AMULET_OF_YENDOR, true, false));
        }
        const P = u.uprops[PROT_FROM_SHAPE_CHANGERS];
        if (!(P.intrinsic || P.extrinsic)) { /* !Protection_from_shape_changers */
            mtmp2.m_ap_type = M_AP_MONSTER;
            mtmp2.mappearance = ROLL_FROM(wizapp);
        }
        newsym(mtmp2.mx, mtmp2.my);
    }
}

// C ref: wizard.c nasty()
/* create some nasty monsters, aligned with the caster or neutral; chaotic
   and unaligned are treated as equivalent; if summoner is Null, this is
   for late-game harassment (after the Wizard has been killed at least once
   or the invocation ritual has been performed), in which case we treat
   'summoner' as neutral, since that will produce the greatest number of
   creatures on average (in 3.6.0 and earlier, Null was treated as chaotic);
   returns the number of monsters created */
export function nasty(summoner) {
    const u = game.u;
    let mtmp;
    const bypos = { x: 0, y: 0 };
    let i, j, count, census, tmp, makeindex,
        s_cls, m_cls, difcap, trylimit, castalign;
    /* when a monster casts the "summon nasties" spell, it gives feedback;
       when random post-Wizard harassment casts that, we give feedback */
    const mmflags = summoner ? MM_NOMSG : NO_MM_FLAGS;

    const MAXNASTIES = 10; /* more than this can be created */

    /* some candidates may be created in groups, so simple count
       of non-null makemon() return is inadequate */
    census = monster_census(false);

    if (!rn2(10) && In_hell(u.uz)) {
        /* this might summon a demon prince or lord */
        throw new Error('nasty(): msummon() not ported yet');
    } else {
        count = 0;
        s_cls = summoner ? summoner.data.mlet : 0;
        difcap = summoner ? summoner.data.difficulty : 0; /* spellcasters */
        castalign = summoner ? sgn(summoner.data.maligntyp) : 0;
        tmp = (u.ulevel > 3) ? Math.trunc(u.ulevel / 3) : 1;
        /* if we don't have a casting monster, nasties appear around hero,
           otherwise they'll appear around spot summoner thinks she's at */
        bypos.x = u.ux;
        bypos.y = u.uy;
        for (i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
            /* Of the 44 nasties[], 10 are lawful, 14 are chaotic,
             * and 20 are neutral.  [...] */
            for (j = 0; j < 20; j++) {
                /* Don't create more spellcasters of the monster's level or
                 * higher--avoids chain summoners filling up the level.
                 */
                trylimit = 10 + 1; /* 10 tries */
                let nextj = false;
                do {
                    if (!--trylimit) {
                        nextj = true; /* goto nextj */
                        break;
                    }
                    makeindex = pick_nasty(difcap);
                    m_cls = mons[makeindex].mlet;
                } while ((difcap > 0 && mons[makeindex].difficulty >= difcap
                          && attacktype(mons[makeindex], MM.AT_MAGC))
                         || (s_cls === MM.S_DEMON && m_cls === MM.S_ANGEL)
                         || (s_cls === MM.S_ANGEL && m_cls === MM.S_DEMON));
                if (nextj)
                    continue; /* break this loop, continue outer one */
                /* do this after picking the monster to place */
                if (summoner && !enexto(bypos, summoner.mux, summoner.muy,
                                        mons[makeindex]))
                    continue;
                /* this honors genocide but overrides extinction; it ignores
                   inside-hell-only (G_HELL) & outside-hell-only (G_NOHELL) */
                if ((mtmp = makemon(mons[makeindex], bypos.x, bypos.y,
                                    mmflags)) !== null) {
                    mtmp.msleeping = mtmp.mpeaceful = mtmp.mtame = 0;
                    set_malign(mtmp);
                } else {
                    /* random monster to substitute for geno'd selection;
                       unlike direct choice, not forced to be hostile [why?];
                       limit spellcasters to inhibit chain summoning */
                    if ((mtmp = makemon(null, bypos.x, bypos.y, mmflags))
                        !== null) {
                        m_cls = mtmp.data.mlet;
                        if ((difcap > 0 && mtmp.data.difficulty >= difcap
                             /* always capping for substitutes made wanton
                                genocide become too strong in the endgame */
                             && rn2(In_endgame(u.uz) ? 3 : 7) /* usually */
                             && attacktype(mtmp.data, MM.AT_MAGC))
                            || (s_cls === MM.S_DEMON && m_cls === MM.S_ANGEL)
                            || (s_cls === MM.S_ANGEL && m_cls === MM.S_DEMON))
                            throw new Error('nasty(): unmakemon() not ported yet');
                    }
                }

                if (mtmp) {
                    /* if creating an arch-lich or Archon, further directly
                       selected nasties will have to be less difficult, and
                       substitues for geno victims will usually be less
                       (note: Archon is not in nasties[] but could be chosen
                       as random replacement for a genocided selection) */
                    if (mtmp.data === mons[MM.PM_ARCH_LICH]
                        || mtmp.data === mons[MM.PM_ARCHON]) {
                        tmp = Math.min(mons[MM.PM_ARCHON].difficulty, /* A:26 */
                                       mons[MM.PM_ARCH_LICH].difficulty); /* L:31 */
                        if (!difcap || difcap > tmp)
                            difcap = tmp; /* rest must be lower difficulty */
                    }
                    /* delay first use of spell or breath attack */
                    mtmp.mspec_used = rnd(4);

                    if (++count >= MAXNASTIES
                        || mtmp.data.maligntyp === 0
                        || sgn(mtmp.data.maligntyp) === castalign)
                        break;
                }
            } /* for j */
        } /* for i */
    }

    if (count)
        count = monster_census(false) - census;
    return count;
}

// C ref: wizard.c random_insult[]
const random_insult = [
    "antic",      "blackguard",   "caitiff",    "chucklehead",
    "coistrel",   "craven",       "cretin",     "cur",
    "dastard",    "demon fodder", "dimwit",     "dolt",
    "fool",       "footpad",      "imbecile",   "knave",
    "maledict",   "miscreant",    "niddering",  "poltroon",
    "rattlepate", "reprobate",    "scapegrace", "varlet",
    "villein", /* (sic.) */
    "wittol",     "worm",         "wretch",
];

// C ref: wizard.c random_malediction[]
const random_malediction = [
    "Hell shall soon claim thy remains,", "I chortle at thee, thou pathetic",
    "Prepare to die, thou", "Resistance is useless,",
    "Surrender or die, thou", "There shall be no mercy, thou",
    "Thou shalt repent of thy cunning,", "Thou art as a flea to me,",
    "Thou art doomed,", "Thy fate is sealed,",
    "Verily, thou shalt be one dead"
];

/* C ref: youprop.h Deaf */
function Deaf() {
    const p = game.u.uprops?.[DEAF];
    return !!(p?.intrinsic || p?.extrinsic) || !!game.u.uroleplay?.deaf;
}
/* C ref: mondata.h is_minion(), is_lminion() */
function is_minion(ptr) { return (ptr.mflags2 & MM.M2_MINION) !== 0; }
function is_lminion(mon) {
    return is_minion(mon.data) && mon_aligntyp(mon) === A_LAWFUL;
}
/* C ref: pline.c verbalize() -- SetVoice() only matters for speech */
async function verbalize(line) {
    if (Deaf())
        return; /* vpline(): PLINE_VERBALIZE is dropped when Deaf */
    await pline(`"${line}"`);
}

// C ref: wizard.c cuss()
/* Insult or intimidate the player */
export async function cuss(mtmp) {
    const u = game.u;

    if (Deaf())
        return;
    if (mtmp.iswiz) {
        if (!rn2(5)) { /* typical bad guy action */
            await pline(`${Monnam(mtmp)} laughs fiendishly.`);
        } else if (u.uhave?.amulet && !rn2(random_insult.length)) {
            /* SetVoice(mtmp, 0, 80, 0) */
            await verbalize(`Relinquish the amulet, ${ROLL_FROM(random_insult)}!`);
        } else if (u.uhp < 5 && !rn2(2)) { /* Panic */
            /* SetVoice(mtmp, 0, 80, 0) */
            const fmt = rn2(2) ? "Even now thy life force ebbs, %s!"
                               : "Savor thy breath, %s, it be thy last!";
            await verbalize(fmt.replace('%s', ROLL_FROM(random_insult)));
        } else if (mtmp.mhp < 5 && !rn2(2)) { /* Parthian shot */
            /* SetVoice(mtmp, 0, 80, 0) */
            await verbalize(rn2(2) ? "I shall return." : "I'll be back.");
        } else {
            /* SetVoice(mtmp, 0, 80, 0) */
            const malediction = ROLL_FROM(random_malediction);
            await verbalize(`${malediction} ${ROLL_FROM(random_insult)}!`);
        }
    } else if (is_lminion(mtmp)
               && !(mtmp.isminion && mtmp.emin?.renegade)) {
        await com_pager("angel_cuss"); /* TODO: the Hallucination msg */
        /*com_pager(rn2(QTN_ANGELIC - 1 + (Hallucination ? 1 : 0))
          + QT_ANGELIC);*/
    } else {
        if (!rn2(is_minion(mtmp.data) ? 100 : 5))
            await pline(`${Monnam(mtmp)} casts aspersions on your ancestry.`);
        else
            await com_pager("demon_cuss");
    }
    await wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}

/*
 *      New for 3.1  Strategy / Tactics for the wiz, as well as other
 *      monsters that are "after" something (defined via mflag3).
 *
 *      The strategy section decides *what* the monster is going
 *      to attempt, the tactics section implements the decision.
 */

/* C ref: obj.h any_quest_artifact() */
function any_quest_artifact(o) { return (o.oartifact || 0) >= ART_ORB_OF_DETECTION; }
/* C ref: mondata.h is_covetous() */
function is_covetous(ptr) { return (ptr.mflags3 & MM.M3_COVETOUS) !== 0; }
/* C ref: hack.h distu() */
function distu(x, y) { return dist2(x, y, game.u.ux, game.u.uy); }
/* C ref: wizard.c M_Wants() */
function M_Wants(mtmp, mask) { return (mtmp.data.mflags3 & mask) !== 0; }

// C ref: wizard.c which_arti()
function which_arti(mask) {
    switch (mask) {
    case MM.M3_WANTSAMUL:
        return AMULET_OF_YENDOR;
    case MM.M3_WANTSBELL:
        return BELL_OF_OPENING;
    case MM.M3_WANTSCAND:
        return CANDELABRUM_OF_INVOCATION;
    case MM.M3_WANTSBOOK:
        return SPE_BOOK_OF_THE_DEAD;
    default:
        break; /* 0 signifies quest artifact */
    }
    return 0;
}

// C ref: wizard.c mon_has_arti()
/*
 *      If "otyp" is zero, it triggers a check for the quest_artifact,
 *      since bell, book, candle, and amulet are all objects, not really
 *      artifacts right now.  [MRS]
 */
function mon_has_arti(mtmp, otyp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if (otmp.otyp === otyp)
                return true;
        } else if (any_quest_artifact(otmp))
            return true;
    }
    return false;
}

// C ref: wizard.c other_mon_has_arti()
/*
 * Returns some monster other than mtmp that
 * has artifact, or NULL monst pointer.
 */
function other_mon_has_arti(mtmp, otyp) {
    for (let mtmp2 = game.fmon; mtmp2; mtmp2 = mtmp2.nmon)
        /* no need for !DEADMONSTER check here since they have no inventory */
        if (mtmp2 !== mtmp)
            if (mon_has_arti(mtmp2, otyp))
                return mtmp2;

    return null;
}

// C ref: wizard.c on_ground()
/*
 * Returns obj of type specified if there is one
 * on the ground, otherwise returns NULL obj pointer.
 */
function on_ground(otyp) {
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj)
        if (otyp) {
            if (otmp.otyp === otyp)
                return otmp;
        } else if (any_quest_artifact(otmp))
            return otmp;
    return null;
}

// C ref: wizard.c you_have()
function you_have(mask) {
    const uhave = game.u.uhave || {};
    switch (mask) {
    case MM.M3_WANTSAMUL:
        return !!uhave.amulet;
    case MM.M3_WANTSBELL:
        return !!uhave.bell;
    case MM.M3_WANTSCAND:
        return !!uhave.menorah;
    case MM.M3_WANTSBOOK:
        return !!uhave.book;
    case MM.M3_WANTSARTI:
        return !!uhave.questart;
    default:
        break;
    }
    return false;
}

// C ref: wizard.c target_on()
function target_on(mask, mtmp) {
    const u = game.u;
    let otmp, mtmp2;

    if (!M_Wants(mtmp, mask))
        return STRAT_NONE;

    if (!mtmp.mgoal)
        mtmp.mgoal = { x: 0, y: 0 };
    const otyp = which_arti(mask);
    if (!mon_has_arti(mtmp, otyp)) {
        if (you_have(mask)) {
            mtmp.mgoal.x = u.ux;
            mtmp.mgoal.y = u.uy;
            return (STRAT_PLAYER | mask);
        } else if ((otmp = on_ground(otyp))) {
            mtmp.mgoal.x = otmp.ox;
            mtmp.mgoal.y = otmp.oy;
            return (STRAT_GROUND | mask);
        } else if ((mtmp2 = other_mon_has_arti(mtmp, otyp)) !== null
                 /* when seeking the Amulet, avoid targeting the Wizard
                    or temple priests (to protect Moloch's high priest) */
                 && (otyp !== AMULET_OF_YENDOR
                     || (!mtmp2.iswiz && !inhistemple(mtmp2)))) {
            mtmp.mgoal.x = mtmp2.mx;
            mtmp.mgoal.y = mtmp2.my;
            return (STRAT_MONSTR | mask);
        }
    }
    mtmp.mgoal.x = mtmp.mgoal.y = 0;
    return STRAT_NONE;
}

// C ref: wizard.c strategy()
function strategy(mtmp) {
    let strat, dstrat;

    if (!is_covetous(mtmp.data)
        /* perhaps a shopkeeper has been polymorphed into a master
           lich; we don't want it teleporting to the stairs to heal
           because that will leave its shop untended */
        || (mtmp.isshk && inhishop(mtmp))
        /* likewise for temple priests */
        || (mtmp.ispriest && inhistemple(mtmp)))
        return STRAT_NONE;

    switch (Math.trunc((mtmp.mhp * 3) / mtmp.mhpmax)) { /* 0-3 */

    default:
    case 0: /* panic time - mtmp is almost snuffed */
        return STRAT_HEAL;

    case 1: /* the wiz is less cautious */
        if (mtmp.data !== mons[MM.PM_WIZARD_OF_YENDOR])
            return STRAT_HEAL;
        /* FALLTHRU */
    case 2:
        dstrat = STRAT_HEAL;
        break;

    case 3:
        dstrat = STRAT_NONE;
        break;
    }

    if (game.context?.made_amulet)
        if ((strat = target_on(MM.M3_WANTSAMUL, mtmp)) !== STRAT_NONE)
            return strat;

    if (game.u.uevent?.invoked) { /* priorities change once gate opened */
        if ((strat = target_on(MM.M3_WANTSARTI, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSBOOK, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSBELL, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSCAND, mtmp)) !== STRAT_NONE)
            return strat;
    } else {
        if ((strat = target_on(MM.M3_WANTSBOOK, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSBELL, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSCAND, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MM.M3_WANTSARTI, mtmp)) !== STRAT_NONE)
            return strat;
    }
    return dstrat;
}

// C ref: stairs.c stairway_find_type_dir()
function stairway_find_type_dir(isladder, up) {
    let tmp = game.stairs;

    while (tmp && !(!!tmp.isladder === !!isladder && !!tmp.up === !!up))
        tmp = tmp.next;
    return tmp || null;
}

// C ref: wizard.c choose_stairs()
/* pick a destination for a covetous monster to flee to so that it can
   heal or for guardians (Kops) to congregate at to block hero's progress;
   returns {x, y} of the spot, or null when no spot is found (C leaves the
   caller's *sx,*sy as-is) */
export function choose_stairs(
    dir) /* True: forward, False: backtrack (usually up) */
{
    const u = game.u;
    let stway;
    const stdir = builds_up(u.uz) ? dir : !dir;

    /* look for stairs in direction 'stdir' (True: up, False: down) */
    stway = stairway_find_type_dir(false, stdir);
    if (!stway) {
        /* no stairs; look for ladder it that direction */
        stway = stairway_find_type_dir(true, stdir);
        if (!stway) {
            /* no ladder either; look for branch stairs or ladder in any
               direction */
            for (stway = game.stairs; stway; stway = stway.next)
                if (stway.tolev.dnum !== u.uz.dnum)
                    break;
            /* if no branch stairs/ladder, check for regular stairs in
               opposite direction, then for regular ladder if necessary */
            if (!stway) {
                stway = stairway_find_type_dir(false, !stdir);
                if (!stway)
                    stway = stairway_find_type_dir(true, !stdir);
            }
        }
        /* [note: 'stway' could still be Null if the only access to this
           level is via magic portal] */
    }

    if (stway)
        return { x: stway.sx, y: stway.sy };
    return null;
}

// C ref: wizard.c tactics()
export async function tactics(mtmp) {
    const u = game.u;
    const strat = strategy(mtmp);
    let sx = 0, sy = 0, mx, my;

    mtmp.mstrategy =
        ((mtmp.mstrategy || 0) & (STRAT_WAITMASK | STRAT_APPEARMSG)) | strat;

    switch (strat) {
    case STRAT_HEAL: { /* hide and recover */
        mx = mtmp.mx, my = mtmp.my;

        if (u.uswallow && u.ustuck === mtmp)
            await expels(mtmp, mtmp.data, true);

        /* if wounded, hole up on or near the stairs (to block them) */
        const sxy = choose_stairs((mtmp.m_id % 2) !== 0);
        if (sxy)
            sx = sxy.x, sy = sxy.y;
        mtmp.mavenge = 1; /* covetous monsters attack while fleeing */
        if (In_W_tower(mx, my, u.uz)
            || (mtmp.iswiz && !sx && !mon_has_amulet(mtmp))) {
            if (!noteleport_level(mtmp)
                && !rn2(3 + Math.trunc(mtmp.mhp / 10)))
                await rloc(mtmp, RLOC_MSG);
        } else if (sx && (mx !== sx || my !== sy)) {
            if (!noteleport_level(mtmp)
                && !(await mnearto(mtmp, sx, sy, true, RLOC_MSG))) {
                /* couldn't move to the target spot for some reason,
                   so stay where we are (don't actually need rloc_to()
                   because mtmp is still on the map at <mx,my>... */
                await rloc_to(mtmp, mx, my);
                return 0;
            }
            mx = mtmp.mx, my = mtmp.my; /* update cached location */
        }
        /* if you're not around, cast healing spells */
        if (distu(mx, my) > (BOLT_LIM * BOLT_LIM))
            if (mtmp.mhp <= mtmp.mhpmax - 8) {
                healmon(mtmp, rnd(8), 0);
                return 1;
            }
    }
        /* FALLTHRU */

    case STRAT_NONE: /* harass */
        if (!noteleport_level(mtmp) && !rn2(!mtmp.mflee ? 5 : 33))
            await mnexto(mtmp, RLOC_MSG);
        return 0;

    default: /* kill, maim, pillage! */
    {
        const where = (strat & STRAT_STRATMASK);
        const tx = mtmp.mgoal.x, ty = mtmp.mgoal.y;
        const targ = (strat & STRAT_GOAL);
        let otmp;

        if (!targ || !isok(tx, ty)) { /* simply wants you to close */
            return 0;
        }
        if (noteleport_level(mtmp) && !monnear(mtmp, tx, ty))
            return 0;
        if (u_at(tx, ty) || where === STRAT_PLAYER) {
            /* player is standing on it (or has it) */
            mx = mtmp.mx, my = mtmp.my;
            if (noteleport_level(mtmp)
                || !(await mnearto(mtmp, tx, ty, false, RLOC_MSG)))
                await rloc_to(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
        if (where === STRAT_GROUND) {
            if (!m_at(tx, ty) /* !MON_AT(tx, ty) */
                || (mtmp.mx === tx && mtmp.my === ty)) {
                /* teleport to it and pick it up */
                await rloc_to(mtmp, tx, ty); /* clean old pos */

                if ((otmp = on_ground(which_arti(targ))) !== null) {
                    if (cansee(mtmp.mx, mtmp.my))
                        await pline(`${Monnam(mtmp)} picks up ${
                            distant_name(otmp, doname)}.`);
                    obj_extract_self(otmp);
                    mpickobj(mtmp, otmp);
                    return 1;
                } else
                    return 0;
            } else {
                /* a monster is standing on it - cause some trouble */
                if (!rn2(5) && !noteleport_level(mtmp))
                    await mnexto(mtmp, RLOC_MSG);
                return 0;
            }
        } else { /* a monster has it - 'port beside it. */
            mx = mtmp.mx, my = mtmp.my;
            if (!noteleport_level(mtmp)
                && !(await mnearto(mtmp, tx, ty, false, RLOC_MSG)))
                await rloc_to(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
    } /* default case */
    } /* switch */
    /*NOTREACHED*/
}
