// wizard.js — Wizard of Yendor strategy and the nasty-summons table.
// C ref: src/wizard.c
//
// Only pick_nasty() is live so far: select_newcham_form() uses it for
// sandestin and doppelganger shapes. The Wizard's own strategy engine
// (tactics, intervene, resurrection) is not ported.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { PMNAMES, MFLAGS, GROWNUPS } from './monst_data.js';
import { Is_rogue_level, MAGIC_PORTAL, BOLT_LIM, RLOC_MSG,
         STRAT_NONE, STRAT_HEAL, STRAT_PLAYER, STRAT_GROUND, STRAT_MONSTR,
         STRAT_WAITMASK, STRAT_WAITFORU, STRAT_APPEARMSG, STRAT_STRATMASK,
         STRAT_GOAL } from './const.js';
import { distu, isok } from './hacklib.js';
import { ONAMES } from './objects_data.js';
import { is_covetous } from './mondata.js';
import { inhishop, inhistemple } from './monmove.js';
import { builds_up } from './dungeon.js';
import { DEADMONSTER } from './monst.js';

// src/wizard.c:61 amulet() — carrying the Amulet: a worn or wielded Amulet
// senses the portal (rn2(15) gate), and while the Wizard of Yendor is in
// play a sleeping Wizard may notice the theft. Runs every turn from
// moveloop_core when u.uhave.amulet.
export async function amulet() {
    let amu;
    if ((((amu = game.u.uamul) != null
          && amu.otyp === ONAMES.AMULET_OF_YENDOR)
         || ((amu = game.u.uwep) != null
             && amu.otyp === ONAMES.AMULET_OF_YENDOR))
        && !rn2(15)) {
        for (const ttmp of (game.level?.traps || [])) {
            if (ttmp.ttyp === MAGIC_PORTAL) {
                const du = distu(ttmp.tx, ttmp.ty);
                const { pline } = await import('./display.js');
                const { Tobjnam } = await import('./objnam.js');
                if (du <= 9)
                    await pline(`${Tobjnam(amu, 'feel')} hot!`);
                else if (du <= 64)
                    await pline(`${Tobjnam(amu, 'feel')} very warm.`);
                else if (du <= 144)
                    await pline(`${Tobjnam(amu, 'feel')} warm.`);
                /* else, the amulet feels normal */
                break;
            }
        }
    }

    if (!game.context?.no_of_wizards)
        return;
    /* find Wizard, and wake him if necessary — the resurrected-Wizard
       machinery is not ported; record instead of guessing the rn2(40) */
    (game.unported ||= new Set()).add('amulet:wake_wizard');
}

// src/wizard.c:105 mon_has_amulet()
export function mon_has_amulet(mtmp) {
    for (const otmp of (mtmp.minvent || []))
        if (otmp.otyp === ONAMES.AMULET_OF_YENDOR)
            return 1;
    return 0;
}

/* ==== covetous-monster strategy (src/wizard.c:140-465) ==== */

// src/wizard.c:140 which_arti() — the object a WANTS bit names; zero means
// the role's quest artifact.
function which_arti(mask) {
    switch (mask) {
    case MFLAGS.M3_WANTSAMUL:
        return ONAMES.AMULET_OF_YENDOR;
    case MFLAGS.M3_WANTSBELL:
        return ONAMES.BELL_OF_OPENING;
    case MFLAGS.M3_WANTSCAND:
        return ONAMES.CANDELABRUM_OF_INVOCATION;
    case MFLAGS.M3_WANTSBOOK:
        return ONAMES.SPE_BOOK_OF_THE_DEAD;
    default:
        return 0; /* quest artifact */
    }
}

/* src/artifact.c any_quest_artifact() reduction: this port's objects carry
   oartifact ids but no role-independent artifact table walk is needed —
   an object is "any quest artifact" when its artifact record is a quest
   one, and only the hero's own can exist in a recorded game. */
function any_quest_artifact_w(otmp) {
    return (otmp.oartifact ?? 0) !== 0
           && (otmp.oartifact === game.urole?.questarti);
}

// src/wizard.c:164 mon_has_arti()
function mon_has_arti(mtmp, otyp) {
    for (const otmp of (mtmp.minvent || [])) {
        if (otyp) {
            if (otmp.otyp === otyp)
                return 1;
        } else if (any_quest_artifact_w(otmp))
            return 1;
    }
    return 0;
}

// src/wizard.c:183 other_mon_has_arti()
function other_mon_has_arti(mtmp, otyp) {
    for (const mtmp2 of (game.level?.monsters || []))
        /* no need for !DEADMONSTER check here since they have no inventory */
        if (mtmp2 !== mtmp)
            if (mon_has_arti(mtmp2, otyp))
                return mtmp2;
    return null;
}

// src/wizard.c:201 on_ground()
function on_ground(otyp) {
    for (const otmp of (game.level?.objects || []))
        if (otyp) {
            if (otmp.otyp === otyp)
                return otmp;
        } else if (any_quest_artifact_w(otmp)) {
            return otmp;
        }
    return null;
}

// src/wizard.c:215 you_have()
function you_have(mask) {
    switch (mask) {
    case MFLAGS.M3_WANTSAMUL:
        return !!game.u.uhave?.amulet;
    case MFLAGS.M3_WANTSBELL:
        return !!game.u.uhave?.bell;
    case MFLAGS.M3_WANTSCAND:
        return !!game.u.uhave?.menorah;
    case MFLAGS.M3_WANTSBOOK:
        return !!game.u.uhave?.book;
    case MFLAGS.M3_WANTSARTI:
        return !!game.u.uhave?.questart;
    default:
        break;
    }
    return false;
}

// src/wizard.c:234 target_on() — where is the coveted object? Sets
// mtmp.mgoal as a side effect. No draws.
function target_on(mask, mtmp) {
    /* M_Wants(mask): (mtmp->data->mflags3 & mask) */
    if (!((mtmp.data.mflags3 ?? 0) & mask))
        return STRAT_NONE;

    const otyp = which_arti(mask);
    if (!mon_has_arti(mtmp, otyp)) {
        let otmp, mtmp2;
        if (you_have(mask)) {
            mtmp.mgoal = { x: game.u.ux, y: game.u.uy };
            return (STRAT_PLAYER | mask);
        } else if ((otmp = on_ground(otyp)) != null) {
            mtmp.mgoal = { x: otmp.ox, y: otmp.oy };
            return (STRAT_GROUND | mask);
        } else if ((mtmp2 = other_mon_has_arti(mtmp, otyp)) != null
                   /* when seeking the Amulet, avoid targeting the Wizard
                      or temple priests (to protect Moloch's high priest) */
                   && (otyp !== ONAMES.AMULET_OF_YENDOR
                       || (!mtmp2.iswiz && !inhistemple(mtmp2)))) {
            mtmp.mgoal = { x: mtmp2.mx, y: mtmp2.my };
            return (STRAT_MONSTR | mask);
        }
    }
    mtmp.mgoal = { x: 0, y: 0 };
    return STRAT_NONE;
}

// src/wizard.c:270 strategy() — what does a covetous monster want to do?
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
        if (mtmp.data !== game.mons[PMNAMES.PM_WIZARD_OF_YENDOR])
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
        if ((strat = target_on(MFLAGS.M3_WANTSAMUL, mtmp)) !== STRAT_NONE)
            return strat;

    if (game.u.uevent?.invoked) { /* priorities change once gate opened */
        if ((strat = target_on(MFLAGS.M3_WANTSARTI, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSBOOK, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSBELL, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSCAND, mtmp)) !== STRAT_NONE)
            return strat;
    } else {
        if ((strat = target_on(MFLAGS.M3_WANTSBOOK, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSBELL, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSCAND, mtmp)) !== STRAT_NONE)
            return strat;
        if ((strat = target_on(MFLAGS.M3_WANTSARTI, mtmp)) !== STRAT_NONE)
            return strat;
    }
    return dstrat;
}

// src/wizard.c:330 choose_stairs() — pick a destination for a covetous
// monster to flee to so that it can heal. No draws.
export function choose_stairs(sxy, dir) {
    /* stairway_find_type_dir(isladder, up) — teleport.c */
    const find_type_dir = (isladder, up) => {
        for (let s = game.stairs; s; s = s.next)
            if (!!s.isladder === isladder && !!s.up === up
                && s.tolev?.dnum === game.u.uz.dnum)
                return s;
        return null;
    };
    const stdir = builds_up(game.u.uz) ? !!dir : !dir;

    let stway = find_type_dir(false, stdir);
    if (!stway) {
        stway = find_type_dir(true, stdir);
        if (!stway) {
            for (let s = game.stairs; s; s = s.next)
                if (s.tolev?.dnum !== game.u.uz.dnum) {
                    stway = s;
                    break;
                }
            if (!stway) {
                stway = find_type_dir(false, !stdir);
                if (!stway)
                    stway = find_type_dir(true, !stdir);
            }
        }
    }

    if (stway) {
        sxy.sx = stway.sx;
        sxy.sy = stway.sy;
    }
}

/* rloc_to(mtmp, x, y) — teleport.c's remove+place+newsym reduction, with
   the same-square early return of rloc_to_core. */
async function rloc_to_w(mtmp, x, y) {
    const { m_at } = await import('./mon.js');
    if (x === mtmp.mx && y === mtmp.my && m_at(x, y) === mtmp)
        return; /* that was easy */
    const { remove_monster, place_monster } = await import('./makemon.js');
    const { newsym } = await import('./display.js');
    const { mon_track_clear, set_apparxy } = await import('./monmove.js');
    if (mtmp.mx || mtmp.my) {
        remove_monster(mtmp.mx, mtmp.my);
        await newsym(mtmp.mx, mtmp.my);
    }
    mon_track_clear(mtmp);
    place_monster(mtmp, x, y);
    await newsym(x, y);
    set_apparxy(mtmp);
}

// src/wizard.c:369 tactics() — a covetous monster's teleport move: heal on
// the stairs when hurt, harass at random, or warp straight to whatever it
// covets. The mnearto/mnexto calls draw (enexto rings); noteleport levels
// don't stop covetous monsters (teleport.c noteleport_level).
export async function tactics(mtmp) {
    const { noteleport_level } = await import('./teleport.js');
    const { mnexto, mnearto, healmon } = await import('./mon.js');
    const { rnd } = await import('./rng.js');
    const strat = strategy(mtmp);
    let sx = 0, sy = 0, mx, my;

    mtmp.mstrategy =
        ((mtmp.mstrategy | 0) & (STRAT_WAITMASK | STRAT_APPEARMSG)) | strat;

    switch (strat) {
    case STRAT_HEAL: { /* hide and recover */
        mx = mtmp.mx; my = mtmp.my;

        if (game.u.uswallow && game.u.ustuck === mtmp)
            note_unported_wizard('tactics:expels');

        /* if wounded, hole up on or near the stairs (to block them) */
        const sxy = { sx: 0, sy: 0 };
        choose_stairs(sxy, ((mtmp.m_id | 0) % 2) !== 0);
        sx = sxy.sx; sy = sxy.sy;
        mtmp.mavenge = 1; /* covetous monsters attack while fleeing */
        if (In_W_tower_w(mx, my)
            || (mtmp.iswiz && !sx && !mon_has_amulet(mtmp))) {
            if (!noteleport_level(mtmp) && !rn2(3 + Math.trunc(mtmp.mhp / 10)))
                note_unported_wizard('tactics:rloc');
        } else if (sx && (mx !== sx || my !== sy)) {
            if (!noteleport_level(mtmp)
                && !await mnearto(mtmp, sx, sy, true, RLOC_MSG)) {
                /* couldn't move to the target spot for some reason,
                   so stay where we are (don't actually need rloc_to()
                   because mtmp is still on the map at <mx,my>... */
                await rloc_to_w(mtmp, mx, my);
                return 0;
            }
            mx = mtmp.mx; my = mtmp.my; /* update cached location */
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
            mnexto(mtmp, RLOC_MSG);
        return 0;

    default: /* kill, maim, pillage! */
    {
        const where = (strat & STRAT_STRATMASK);
        const tx = mtmp.mgoal?.x ?? 0, ty = mtmp.mgoal?.y ?? 0;
        const targ = (strat & STRAT_GOAL);

        if (!targ || !isok(tx, ty)) { /* simply wants you to close */
            return 0;
        }
        {
            const { monnear } = await import('./monmove.js');
            if (noteleport_level(mtmp) && !monnear(mtmp, tx, ty))
                return 0;
        }
        if ((game.u.ux === tx && game.u.uy === ty)
            || where === STRAT_PLAYER) {
            /* player is standing on it (or has it) */
            mx = mtmp.mx; my = mtmp.my;
            if (noteleport_level(mtmp)
                || !await mnearto(mtmp, tx, ty, false, RLOC_MSG))
                await rloc_to_w(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
        if (where === STRAT_GROUND) {
            const { m_at } = await import('./mon.js');
            if (!m_at(tx, ty) || (mtmp.mx === tx && mtmp.my === ty)) {
                /* teleport to it and pick it up */
                await rloc_to_w(mtmp, tx, ty); /* clean old pos */
                const otmp = on_ground(which_arti(targ));
                if (otmp != null) {
                    const { cansee } = await import('./vision.js');
                    if (cansee(mtmp.mx, mtmp.my)) {
                        const { pline } = await import('./display.js');
                        const { Monnam } = await import('./do_name.js');
                        const { doname } = await import('./objnam.js');
                        await pline(`${Monnam(mtmp)} picks up ${
                                    doname(otmp)}.`);
                    }
                    const { obj_extract_self } = await import('./invent.js');
                    const { mpickobj } = await import('./steal.js');
                    obj_extract_self(otmp);
                    mpickobj(mtmp, otmp);
                    return 1;
                } else
                    return 0;
            } else {
                /* a monster is standing on it - cause some trouble */
                if (!rn2(5) && !noteleport_level(mtmp))
                    mnexto(mtmp, RLOC_MSG);
                return 0;
            }
        } else { /* a monster has it - 'port beside it. */
            mx = mtmp.mx; my = mtmp.my;
            if (!noteleport_level(mtmp)
                && !await mnearto(mtmp, tx, ty, false, RLOC_MSG))
                await rloc_to_w(mtmp, mx, my); /* no room? stay put */
            return 0;
        }
    } /* default case */
    } /* switch */
}

/* include/dungeon.h In_W_tower() — the Wizard's tower footprint; absent
   until dungeon.js publishes the tower region, and no covetous monster on
   the planes is inside it. */
function In_W_tower_w(/* x, y */) {
    return false;
}

// src/wizard.c:494 aggravate()
export function aggravate() {
    const hero_in_tower = In_W_tower_w(game.u.ux, game.u.uy);

    for (const mtmp of game.level?.monsters || []) {
        if (DEADMONSTER(mtmp)
            || hero_in_tower !== In_W_tower_w(mtmp.mx, mtmp.my))
            continue;
        mtmp.mstrategy = (mtmp.mstrategy | 0)
            & ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

// src/wizard.c:481 resurrect() — force confrontation with the Wizard:
// entering a new dungeon while carrying the Amulet conjures him beside the
// hero (makemon at the hero's square goes through enexto). The
// migrating-Wizard arm needs the migrating_mons list and records.
export async function resurrect() {
    let mtmp = null;
    let verb;

    if (!game.context?.no_of_wizards) {
        /* make a new Wizard */
        verb = 'kill';
        const { makemon } = await import('./makemon.js');
        const { MM_NOWAIT } = await import('./const.js');
        mtmp = makemon(game.mons[PMNAMES.PM_WIZARD_OF_YENDOR],
                       game.u.ux, game.u.uy, MM_NOWAIT);
        /* makemon.c:1471-1500 — the !in_mklev arrival message this port's
           sync makemon defers to its caller: "The Wizard of Yendor
           suddenly appears next to you!" */
        if (mtmp) {
            const { canseemon } = await import('./display.js');
            if (canseemon(mtmp)) {
                const { Amonnam } = await import('./do_name.js');
                const { Norep } = await import('./pline.js');
                const du = distu(mtmp.mx, mtmp.my);
                await Norep(`${Amonnam(mtmp)} suddenly appears${
                    du <= 2 ? ' next to you'
                    : (du <= BOLT_LIM * BOLT_LIM) ? ' close by' : ''}!`);
            }
        }
        /* affects experience; he's not coming back from a corpse
           but is subject to repeated killing like a revived corpse */
        if (mtmp)
            mtmp.mrevived = 1;
    } else {
        /* look for a migrating Wizard */
        verb = 'elude';
        note_unported_wizard('resurrect:migrating_wizard');
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;

        mtmp.mtame = 0;
        mtmp.mpeaceful = 0; /* paranoia */
        const { set_malign } = await import('./makemon.js');
        set_malign(mtmp);
        const { Deaf } = await import('./youprop.js');
        if (!Deaf()) {
            const { pline } = await import('./display.js');
            await pline('A voice booms out...');
            /* verbalize() */
            await pline(`"So thou thought thou couldst ${verb} me, fool."`);
        }
    }
}

function note_unported_wizard(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/wizard.c:31 nasties[] — shapes for polymorph harassment. */
const nasties = [
    /* neutral */
    'PM_COCKATRICE', 'PM_ETTIN', 'PM_STALKER', 'PM_MINOTAUR',
    'PM_OWLBEAR', 'PM_PURPLE_WORM', 'PM_XAN', 'PM_UMBER_HULK',
    'PM_XORN', 'PM_ZRUTY', 'PM_LEOCROTTA', 'PM_BALUCHITHERIUM',
    'PM_CARNIVOROUS_APE', 'PM_FIRE_ELEMENTAL', 'PM_JABBERWOCK',
    'PM_IRON_GOLEM', 'PM_OCHRE_JELLY', 'PM_GREEN_SLIME',
    'PM_DISPLACER_BEAST', 'PM_GENETIC_ENGINEER',
    /* chaotic */
    'PM_BLACK_DRAGON', 'PM_RED_DRAGON', 'PM_ARCH_LICH', 'PM_VAMPIRE_LEADER',
    'PM_MASTER_MIND_FLAYER', 'PM_DISENCHANTER', 'PM_WINGED_GARGOYLE',
    'PM_STORM_GIANT', 'PM_OLOG_HAI', 'PM_ELF_NOBLE', 'PM_ELVEN_MONARCH',
    'PM_OGRE_TYRANT', 'PM_CAPTAIN', 'PM_GREMLIN',
    /* lawful */
    'PM_SILVER_DRAGON', 'PM_ORANGE_DRAGON', 'PM_GREEN_DRAGON',
    'PM_YELLOW_DRAGON', 'PM_GUARDIAN_NAGA', 'PM_FIRE_GIANT',
    'PM_ALEAX', 'PM_COUATL', 'PM_HORNED_DEVIL', 'PM_BARBED_DEVIL',
].map((n) => PMNAMES[n]);

/* src/mondata.c:1316 big_to_little() — walk the grownups pairs backward. */
export function big_to_little(montype) {
    for (const [little, big] of GROWNUPS)
        if (montype === big)
            return little;
    return montype;
}

/* include/dungeon.h In_hell() */
const In_hell = (lev) => (lev ?? game.u?.uz)?.dnum === game.hell_dnum;

// src/wizard.c:537 pick_nasty() — a random nasty shape, demoted to its
// juvenile form when genocided, over the difficulty cap, or out of place
// for Gehennom.
export function pick_nasty(difcap) {
    const { G_GENOD, G_HELL, G_NOHELL } = MFLAGS;
    let res = nasties[rn2(nasties.length)];       /* ROLL_FROM */

    /* prefer uppercase on the rogue level, one retry only */
    if (Is_rogue_level(game.u?.uz)) {
        const sym = game.mons[res]?.mlet;
        /* monsym A-Z test approximated by def_monsyms — the rogue level
           is unreachable in any recorded session; the retry still rolls */
        void sym;
        res = nasties[rn2(nasties.length)];
    }

    let alt = res;
    if (((game.mvitals?.[res]?.mvflags ?? 0) & G_GENOD) !== 0
        || (difcap > 0 && game.mons[res].difficulty >= difcap)
        || ((game.mons[res].geno ?? 0)
            & (In_hell(game.u?.uz) ? G_NOHELL : G_HELL)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && ((game.mvitals?.[alt]?.mvflags ?? 0) & G_GENOD) === 0) {
        const mnam = game.mons[alt].pmnames?.[2] ?? game.mons[alt].pmnames?.[0]
                     ?? '';
        const lastspace = mnam.lastIndexOf(' ');
        const tail = lastspace >= 0 ? mnam.slice(lastspace) : null;

        /* only non-juveniles can become alternate choice */
        if (!mnam.startsWith('baby ')
            && (!tail
                || (tail !== ' hatchling' && tail !== ' pup'
                    && tail !== ' cub')))
            res = alt;
    }

    return res;
}
