// wizard.js — Wizard of Yendor harassment from wizard.c.
// C ref: wizard.c resurrect (new-Wizard makemon arm); aggravate; clonewiz;
//         choose_stairs (D-1733; also shk.c call_kops);
//         nasty / pick_nasty (pick_nasty lives in makemon.js for newcham).

import { game } from './gstate.js';
import { makemon, set_malign, pick_nasty } from './makemon.js';
import {
    mons, is_covetous, is_minion, M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSBOOK,
    M3_WANTSCAND,
} from './monsters.js';
import { monsterNames } from './generated/monsters_data.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { objectNames } from './objects.js';
import { add_to_minv, mksobj } from './mkobj.js';
import {
    MM_NOWAIT, MM_NOMSG, NO_MM_FLAGS, STRAT_WAITMASK, STRAT_WAITFORU,
    STRAT_APPEARMSG, STRAT_NONE, STRAT_HEAL, RLOC_MSG, In_endgame,
    M_AP_MONSTER, EMIN,
} from './const.js';
import { pline, verbalize, Norep, newsym } from './display.js';
import { Monnam } from './do_name.js';
import { rn1, rn2, rnd } from './rng.js';
import { noteleport_level, enexto, is_lminion } from './teleport.js';
import { mnexto, wake_nearto } from './mon.js';
import { SetVoice } from './sndprocs.js';
import { com_pager } from './questpgr.js';
import { inhishop } from './shk.js';
import { msummon, monster_census, Inhell } from './minion.js';
import { builds_up } from './hacklib.js';
import { stairway_find_type_dir } from './mklev.js';

const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_ARCH_LICH = monsterNames.indexOf('PM_ARCH_LICH');
const PM_ARCHON = monsterNames.indexOf('PM_ARCHON');
// C ref: wizard.c wizapp[] — clonewiz disguise pool
const wizapp = [
    'PM_HUMAN', 'PM_WATER_DEMON', 'PM_VAMPIRE', 'PM_RED_DRAGON',
    'PM_TROLL', 'PM_UMBER_HULK', 'PM_XORN', 'PM_XAN',
    'PM_COCKATRICE', 'PM_FLOATING_EYE', 'PM_GUARDIAN_NAGA', 'PM_TRAPPER',
].map((n) => monsterNames.indexOf(n));
const AT_MAGC = 255; // monattk.h
const MAXNASTIES = 10;

function sgn(n) {
    return (n > 0) ? 1 : (n < 0) ? -1 : 0;
}

/** C ref: mondata.h attacktype — any mattk slot with aatyp. */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/**
 * C ref: wizard.c nasty — summon nasties aligned with caster (or neutral
 * when summoner is null / late-game harassment).
 * Envelope: Inhell `!rn2(10)` → msummon(null); else rnd(ulevel/3) outer ×
 * pick_nasty / enexto / makemon loop with difcap + demon↔angel reject.
 * Named omissions: full unmakemon (born/extinct/discard_minvent) — reject
 * path sets mhp=0 so census skips; rogue/juvenile polish is in pick_nasty.
 *
 * @param {object|null} summoner
 * @returns {Promise<number>} census delta (created count)
 */
export async function nasty(summoner) {
    const u = game.u || {};
    const mmflags = summoner ? MM_NOMSG : NO_MM_FLAGS;
    const census = monster_census(false);
    let count = 0;

    if (!rn2(10) && Inhell()) {
        // C: msummon((struct monst *) 0) — WoY-like demon help
        count = await msummon(null);
    } else {
        count = 0;
        const s_cls = summoner ? (summoner.data?.mlet || 0) : 0;
        let difcap = summoner ? (summoner.data?.difficulty | 0) : 0;
        const castalign = summoner ? sgn(summoner.data?.maligntyp | 0) : 0;
        let tmp = ((u.ulevel | 0) > 3) ? Math.trunc((u.ulevel | 0) / 3) : 1;
        const bypos = { x: u.ux | 0, y: u.uy | 0 };

        for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
            jloop: for (let j = 0; j < 20; j++) {
                let trylimit = 10 + 1;
                let makeindex;
                let m_cls;
                do {
                    if (!--trylimit) continue jloop; // C: goto nextj
                    makeindex = pick_nasty(difcap);
                    m_cls = mons(makeindex)?.mlet;
                } while ((difcap > 0
                        && (mons(makeindex)?.difficulty | 0) >= difcap
                        && attacktype(mons(makeindex), AT_MAGC))
                    || (s_cls === 'S_DEMON' && m_cls === 'S_ANGEL')
                    || (s_cls === 'S_ANGEL' && m_cls === 'S_DEMON'));

                if (summoner && !enexto(
                    bypos,
                    summoner.mux | 0,
                    summoner.muy | 0,
                    mons(makeindex),
                )) {
                    continue;
                }

                let mtmp = makemon(mons(makeindex), bypos.x, bypos.y, mmflags);
                if (mtmp) {
                    mtmp.msleeping = 0;
                    mtmp.mpeaceful = 0;
                    mtmp.mtame = 0;
                    set_malign(mtmp);
                } else {
                    // Random substitute for geno'd selection
                    mtmp = makemon(null, bypos.x, bypos.y, mmflags);
                    if (mtmp) {
                        m_cls = mtmp.data?.mlet;
                        if ((difcap > 0
                                && (mtmp.data?.difficulty | 0) >= difcap
                                && rn2(In_endgame(u.uz) ? 3 : 7)
                                && attacktype(mtmp.data, AT_MAGC))
                            || (s_cls === 'S_DEMON' && m_cls === 'S_ANGEL')
                            || (s_cls === 'S_ANGEL' && m_cls === 'S_DEMON')) {
                            // Named omission: unmakemon — mark dead for census
                            mtmp.mhp = 0;
                            mtmp = null;
                        }
                    }
                }

                if (mtmp) {
                    if (mtmp.data === mons(PM_ARCH_LICH)
                        || mtmp.data === mons(PM_ARCHON)) {
                        tmp = Math.min(
                            mons(PM_ARCHON)?.difficulty | 0,
                            mons(PM_ARCH_LICH)?.difficulty | 0,
                        );
                        if (!difcap || difcap > tmp) difcap = tmp;
                    }
                    mtmp.mspec_used = rnd(4);

                    if (++count >= MAXNASTIES
                        || (mtmp.data?.maligntyp | 0) === 0
                        || sgn(mtmp.data?.maligntyp | 0) === castalign) {
                        break;
                    }
                }
            } // for j
        } // for i
    }

    if (count) count = monster_census(false) - census;
    return count;
}

/**
 * C ref: wizard.c aggravate — wake/unfreeze monsters on this W-tower side.
 * Named omission: In_W_tower filter (always treat same side until W-tower
 * regions exist) — both hero and mon treated as non-tower.
 */
export function aggravate() {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        // In_W_tower mismatch skip deferred (always same side)
        mtmp.mstrategy = (mtmp.mstrategy | 0)
            & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

function Protection_from_shape_changers() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/** C ref: wizard.c clonewiz — Double Trouble; caller checks no_of_wizards==1. */
export function clonewiz() {
    const u = game.u || {};
    const mtmp2 = makemon(mons(PM_WIZARD_OF_YENDOR), u.ux, u.uy, MM_NOWAIT);
    if (mtmp2) {
        mtmp2.msleeping = mtmp2.mtame = mtmp2.mpeaceful = 0;
        if (!u.uhave?.amulet && rn2(2)) {
            const fake = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
            add_to_minv(mtmp2, mksobj(fake, true, false));
        }
        if (!Protection_from_shape_changers()) {
            mtmp2.m_ap_type = M_AP_MONSTER;
            mtmp2.mappearance = wizapp[rn2(wizapp.length)];
        }
        newsym(mtmp2.mx, mtmp2.my);
    }
}

/**
 * C ref: wizard.c which_arti `:141–157` — covetous mask to invocation
 * object type. Default 0 signifies the quest artifact (M3_WANTSARTI and
 * any combined mask fall here, as in C's switch).
 */
export function which_arti(mask) {
    switch (mask | 0) {
    case M3_WANTSAMUL:
        return AMULET_OF_YENDOR;
    case M3_WANTSBELL:
        return BELL_OF_OPENING;
    case M3_WANTSCAND:
        return CANDELABRUM_OF_INVOCATION;
    case M3_WANTSBOOK:
        return SPE_BOOK_OF_THE_DEAD;
    default:
        break; /* 0 signifies quest artifact */
    }
    return 0;
}

/**
 * C ref: wizard.c mon_has_arti `:164–177` — minvent holds otyp, or (otyp
 * 0) any quest artifact. obj.h any_quest_artifact: oartifact at or above
 * ART_ORB_OF_DETECTION.
 */
export function mon_has_arti(mtmp, otyp) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === (otyp | 0)) return 1;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION) {
            return 1;
        }
    }
    return 0;
}

/**
 * C ref: wizard.c other_mon_has_arti `:183–195` — first other monster
 * holding otyp (or any quest artifact when otyp is 0), else null.
 * C walks fmon with no DEADMONSTER check (the dead carry nothing);
 * game.fmon is the JS array side of that list.
 */
export function other_mon_has_arti(mtmp, otyp) {
    for (const mtmp2 of game.fmon || []) {
        /* no need for !DEADMONSTER check here since they have no inventory */
        if (mtmp2 !== mtmp && mon_has_arti(mtmp2, otyp)) return mtmp2;
    }
    return null;
}

/**
 * C ref: wizard.c on_ground `:201–213` — first floor object of otyp,
 * or (otyp 0) of any quest artifact, else null. game.fobj is the JS
 * head of the floor chain.
 */
export function on_ground(otyp) {
    for (let otmp = game.fobj; otmp; otmp = otmp.nobj) {
        if (otyp) {
            if ((otmp.otyp | 0) === (otyp | 0)) return otmp;
        } else if ((otmp.oartifact | 0) >= ART_ORB_OF_DETECTION) {
            return otmp;
        }
    }
    return null;
}

/**
 * C ref: wizard.c wizdeadorgone `:813–822` — Wizard gone (killed or left
 * alive): drop the census count and, until demigod, set udemigod with a
 * rn1(250, 50) doom clock. Caller: mon.c mongone/mondead.
 */
export function wizdeadorgone() {
    if (!game.context) game.context = {};
    game.context.no_of_wizards = (game.context.no_of_wizards | 0) - 1;
    const u = game.u || {};
    if (!u.uevent) u.uevent = {};
    if (!u.uevent.udemigod) {
        u.uevent.udemigod = 1;
        u.udg_cnt = rn1(250, 50);
    }
}

/**
 * C ref: wizard.c strategy — HP-band + covetous/shop/temple gates.
 * Envelope: cases 0–3 → STRAT_HEAL / STRAT_NONE. Named omissions:
 * target_on(M3_WANTS*) pursuit; inhistemple (ispriest always treated as
 * in-temple skip like shopkeeper-in-shop).
 */
function strategy(mtmp) {
    if (!is_covetous(mtmp.data)
        || (mtmp.isshk && inhishop(mtmp))
        || mtmp.ispriest) {
        return STRAT_NONE;
    }
    const hpmax = mtmp.mhpmax | 0;
    const band = hpmax > 0 ? (((mtmp.mhp | 0) * 3) / hpmax) | 0 : 0;
    switch (band) {
    default:
    case 0:
        return STRAT_HEAL;
    case 1:
        if (mtmp.data !== mons(PM_WIZARD_OF_YENDOR)) return STRAT_HEAL;
        // FALLTHROUGH — Wizard less cautious
    case 2:
        // C: dstrat=HEAL then target_on… — target deferred → HEAL
        return STRAT_HEAL;
    case 3:
        // C: dstrat=NONE then target_on… — target deferred → NONE
        return STRAT_NONE;
    }
}

/**
 * C ref: wizard.c choose_stairs `:330–364` — pick stair/ladder coord for
 * Kops (call_kops) and covetous heal. Leaves sx,sy as-is when none found
 * (portal-only levels). dir True = forward, False = backtrack.
 */
export function choose_stairs(coord, dir) {
    const uz = game.u?.uz;
    const stdir = builds_up(uz) ? !!dir : !dir;
    let stway = stairway_find_type_dir(false, stdir);
    if (!stway) {
        stway = stairway_find_type_dir(true, stdir);
        if (!stway) {
            const dnum = uz?.dnum | 0;
            for (stway = game.stairs; stway; stway = stway.next) {
                if ((stway.tolev?.dnum | 0) !== dnum) break;
            }
            if (!stway) {
                stway = stairway_find_type_dir(false, !stdir);
                if (!stway) stway = stairway_find_type_dir(true, !stdir);
            }
        }
    }
    if (stway && coord) {
        coord.sx = stway.sx;
        coord.sy = stway.sy;
    }
}

/**
 * C ref: wizard.c tactics — covetous special move before distfleeck.
 * Envelope: strategy → mstrategy update → STRAT_NONE harass rn2/mnexto.
 * STRAT_HEAL: set mavenge only; choose_stairs / rloc / healmon /
 * FALLTHROUGH-to-harass deferred (falling through burned extra rn2 when C
 * early-returned from HEAL). choose_stairs is live for call_kops.
 */
export async function tactics(mtmp) {
    const strat = strategy(mtmp);
    mtmp.mstrategy = ((mtmp.mstrategy | 0) & (STRAT_WAITMASK | STRAT_APPEARMSG))
        | strat;

    switch (strat) {
    case STRAT_HEAL:
        // choose_stairs / In_W_tower rloc / healmon / FALLTHROUGH deferred
        mtmp.mavenge = 1;
        return 0;
    case STRAT_NONE:
        if (!noteleport_level(mtmp) && !rn2(!mtmp.mflee ? 5 : 33)) {
            await mnexto(mtmp, RLOC_MSG);
        }
        return 0;
    default:
        // STRAT_PLAYER / GROUND / MONSTR pursuit deferred
        return 0;
    }
}

/**
 * C ref: wizard.c resurrect — confront hero with Wizard on endgame entry.
 * Envelope: no_of_wizards==0 → makemon(PM_WIZARD, ux,uy, MM_NOWAIT) +
 * mrevived; clear WAITMASK; hostile + set_malign; voice pline.
 * Named omissions: migrating-Wizard mon_arrive(Wiz_arrive) path when
 * no_of_wizards>0; SetVoice; Deaf-aware acoustics polish.
 */
export async function resurrect() {
    const u = game.u;
    if (!u) return;

    if (!game.context) game.context = {};
    let mtmp = null;
    let verb = 'kill';

    if (!(game.context.no_of_wizards | 0)) {
        // C: make a new Wizard
        verb = 'kill';
        mtmp = makemon(
            mons(PM_WIZARD_OF_YENDOR),
            u.ux | 0,
            u.uy | 0,
            MM_NOWAIT,
        );
        if (mtmp) mtmp.mrevived = 1;
    } else {
        // Migrating-Wizard search / mon_arrive(Wiz_arrive) deferred
        verb = 'elude';
        return;
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
        mtmp.mtame = 0;
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        // C: makemon !in_mklev !MM_NOMSG appear Norep (D-0559) — before voice.
        // Envelope: canseemon/sensemon + mimic arms deferred; Wizard is visible.
        {
            const ux = u.ux | 0;
            const uy = u.uy | 0;
            const dx = Math.abs((mtmp.mx | 0) - ux);
            const dy = Math.abs((mtmp.my | 0) - uy);
            const next2u = dx <= 1 && dy <= 1 && (dx || dy);
            const where = next2u ? ' next to you'
                : ((dx * dx + dy * dy) <= 64) ? ' close by' : '';
            await Norep(`${Monnam(mtmp)} suddenly appears${where}!`);
        }
        if (!u.Deaf) {
            await pline('A voice booms out...');
            await verbalize(`So thou thought thou couldst ${verb} me, fool.`);
        }
    }
}

/**
 * C ref: wizard.c random_insult `:824–833` — WoY cuss noun pool (28).
 * ROLL_FROM (`hack.h :1493`) picks `array[rn2(SIZE(array))]`; callers
 * use `.length` for the same bound.
 */
const random_insult = [
    'antic', 'blackguard', 'caitiff', 'chucklehead',
    'coistrel', 'craven', 'cretin', 'cur',
    'dastard', 'demon fodder', 'dimwit', 'dolt',
    'fool', 'footpad', 'imbecile', 'knave',
    'maledict', 'miscreant', 'niddering', 'poltroon',
    'rattlepate', 'reprobate', 'scapegrace', 'varlet',
    'villein', /* (sic.) */
    'wittol', 'worm', 'wretch',
];

/**
 * C ref: wizard.c random_malediction `:835–843` — WoY cuss opener pool
 * (11). Same ROLL_FROM bound convention as random_insult.
 */
const random_malediction = [
    'Hell shall soon claim thy remains,', 'I chortle at thee, thou pathetic',
    'Prepare to die, thou', 'Resistance is useless,',
    'Surrender or die, thou', 'There shall be no mercy, thou',
    'Thou shalt repent of thy cunning,', 'Thou art as a flea to me,',
    'Thou art doomed,', 'Thy fate is sealed,',
    'Verily, thou shalt be one dead',
];

/**
 * C ref: wizard.c cuss `:845–883` — insult/intimidate behind MS_CUSS
 * (`sounds.c :1146–1156`) and monmove retaliation. Deaf silence;
 * iswiz amulet/panic/parthian/malediction arms (clang L→R: the message
 * rn2 burns before the ROLL_FROM insult); co-aligned-minion angel
 * pager; minion-gated aspersions vs demon pager; always
 * wake_nearto(5*5). Async: pline/verbalize/com_pager/wake_nearto await.
 */
export async function cuss(mtmp) {
    const u = game.u || {};
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
        || u.uroleplay?.deaf || u.Deaf);
    if (Deaf) {
        return;
    }
    if (mtmp.iswiz) {
        if (!rn2(5)) { /* typical bad guy action */
            await pline(`${Monnam(mtmp)} laughs fiendishly.`);
        } else if (u.uhave?.amulet && !rn2(random_insult.length)) {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(`Relinquish the amulet, ${random_insult[rn2(random_insult.length)]}!`);
        } else if ((u.uhp | 0) < 5 && !rn2(2)) { /* Panic */
            SetVoice(mtmp, 0, 80, 0);
            const ebbs = rn2(2);
            const insult = random_insult[rn2(random_insult.length)];
            await verbalize(ebbs
                ? `Even now thy life force ebbs, ${insult}!`
                : `Savor thy breath, ${insult}, it be thy last!`);
        } else if ((mtmp.mhp | 0) < 5 && !rn2(2)) { /* Parthian shot */
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(rn2(2) ? 'I shall return.' : "I'll be back.");
        } else {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(`${random_malediction[rn2(random_malediction.length)]} ${random_insult[rn2(random_insult.length)]}!`);
        }
    } else if (is_lminion(mtmp)
        && !(mtmp.isminion && EMIN(mtmp)?.renegade)) {
        await com_pager('angel_cuss'); /* TODO: the Hallucination msg */
        /*com_pager(rn2(QTN_ANGELIC - 1 + (Hallucination ? 1 : 0))
          + QT_ANGELIC);*/
    } else {
        if (!rn2(is_minion(mtmp.data) ? 100 : 5)) {
            await pline(`${Monnam(mtmp)} casts aspersions on your ancestry.`);
        } else {
            await com_pager('demon_cuss');
        }
    }
    await wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}
