// fountain.js — fountains.
// C ref: src/fountain.c
//
// Fountain and sink interactions.  The implemented arms preserve the C
// source's draw order; unavailable side effects remain explicitly recorded.

import { POLY_NOFLAGS } from './const.js';
import { Unchanging } from './youprop.js';
import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { more, pline } from './display.js';
import { You, You_feel, You_hear, Your, pline_The } from './pline.js';
import { newsym } from './display.js';
import { IS_FOUNTAIN, ROOM, POOL, FOUNTAIN, SINK, A_WIS, A_CON, IS_DOOR,
         SDOOR, isok,
         SQKY_BOARD, BEAR_TRAP, LANDMINE, FIRE_TRAP, PIT, SPIKED_PIT,
         HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, WEB, MAGIC_TRAP,
         ANTI_MAGIC, KILLED_BY_AN, KILLED_BY, F_LOOTED, S_LRING,
         u_at } from './const.js';
import { ONAMES } from './objects_data.js';
import { OCLASSES } from './objects_data.js';
import { deltrap, water_damage, water_damage_chain } from './trap.js';
import { ACURR, adjattrib, A_MAX, exercise, poison_strdmg } from './attrib.js';
import { morehungry, vomit } from './eat.js';
import { update_inventory, money_cnt } from './invent.js';
import { curse, uncurse, mkobj, mkobj_at, mksobj_at, rnd_class } from './mkobj.js';
import { tty_yn_function } from './tty/topl.js';
import { distmin } from './hacklib.js';
import { do_clear_area } from './vision.js';
import { m_at, t_at } from './mon.js';
import { sobj_at } from './invent.js';
import { del_engr, engr_at } from './engrave.js';
import { somegold } from './steal.js';
import { hcolor, hliquid } from './do_name.js';
import { Blind, Fire_resistance, Hallucination } from './youprop.js';
import { losehp } from './hack.js';
import { more_experienced, newexplevel } from './exper.js';
import { Deaf } from './youprop.js';
import { body_part } from './polyself.js';
import { FACE } from './const.js';
import { A_DEX } from './const.js';
import { You_see } from './pline.js';












function note_unported_fountain(what) {
    (game.unported ||= new Set()).add('fountain:' + what);
}

// src/fountain.c:201 dryup() — 1 in 3 dips dries the fountain.
export async function dryup(x, y, isyou) {
    const loc = game.level.at(x, y);
    if (IS_FOUNTAIN(loc.typ)
        && (!rn2(3) || (loc.looted & 2 /* F_WARNED */))) {
        const { in_town } = await import('./hack.js');
        if (isyou && in_town(x, y) && !(loc.looted & 2 /* F_WARNED */)) {
            const { couldsee } = await import('./vision.js');
            const { PMNAMES } = await import('./monst_data.js');
            const watch = (game.level.monsters || []).find(mtmp =>
                (mtmp.data?.pmidx === PMNAMES.PM_WATCHMAN
                 || mtmp.data?.pmidx === PMNAMES.PM_WATCH_CAPTAIN)
                && couldsee(mtmp.mx, mtmp.my) && mtmp.mpeaceful);

            loc.looted |= 2; /* F_WARNED */
            const { Deaf } = await import('./youprop.js');
            if (watch && !Deaf()) {
                const { Amonnam } = await import('./do_name.js');
                await pline(`${Amonnam(watch)} yells:`);
                await pline('"Hey, stop using that fountain!"');
            } else if (!watch) {
                await pline_The('flow reduces to a trickle.');
            } else {
                note_unported_fountain('dryup:deaf_watchman_warning');
            }
            return;
        }
        if (isyou && game.wizard) {
            const ans = await tty_yn_function('Dry up fountain?', 'yn', 'n');
            if (ans === 'n')
                return;
        }
        await pline_The('fountain dries up!');
        /* replace the fountain with ordinary floor */
        loc.typ = ROOM;
        loc.flags = 0;
        loc.looted = 0;
        loc.blessedftn = 0;
        if (game.level.flags)
            game.level.flags.nfountains =
                Math.max(0, (game.level.flags.nfountains || 1) - 1);
        newsym(x, y);
    }
}

// src/fountain.c:40 dowatersnakes()
async function dowatersnakes() {
    const num = rn1(5, 2);
    const { makemon } = await import('./makemon.js');
    const { PMNAMES } = await import('./monst_data.js');
    const { MM_NOMSG, NO_TRAP_FLAGS } = await import('./const.js');
    const { mintrap } = await import('./trap.js');
    const G_GONE = 0x03;

    if (!((game.mvitals?.[PMNAMES.PM_WATER_MOCCASIN]?.mvflags ?? 0)
          & G_GONE)) {
        if (!game.u.ublind) {
            if (game.u.uprops?.HALLUC)
                note_unported_fountain('dowatersnakes:hallucination_name');
            await pline('An endless stream of snakes pours forth!');
        } else {
            const { You_hear } = await import('./pline.js');
            await You_hear('something hissing!');
        }
        for (let i = 0; i < num; ++i) {
            const mtmp = await makemon(game.mons[PMNAMES.PM_WATER_MOCCASIN],
                                 game.u.ux, game.u.uy, MM_NOMSG);
            if (mtmp && t_at(mtmp.mx, mtmp.my))
                await mintrap(mtmp, NO_TRAP_FLAGS);
        }
    } else {
        await pline_The('fountain bubbles furiously for a moment, then calms.');
    }
}

// src/fountain.c:64 dowaterdemon() — the fountain unleashes a water demon;
// low-level heroes have a small chance of a wish instead.
async function dowaterdemon() {
    const { makemon } = await import('./makemon.js');
    const { a_monnam } = await import('./do_name.js');
    const { PMNAMES } = await import('./monst_data.js');
    const { MM_NOMSG, NO_TRAP_FLAGS } = await import('./const.js');
    const { level_difficulty } = await import('./dungeon.js');
    const { mintrap } = await import('./trap.js');
    const { t_at } = await import('./mon.js');
    const G_GONE = 0x03; /* G_GENOD | G_EXTINCT */

    if (!((game.mvitals?.[PMNAMES.PM_WATER_DEMON]?.mvflags ?? 0) & G_GONE)) {
        const mtmp = await makemon(game.mons[PMNAMES.PM_WATER_DEMON],
                             game.u.ux, game.u.uy, MM_NOMSG);
        if (mtmp) {
            if (!game.u.ublind)
                await You(`unleash ${a_monnam(mtmp)}!`);
            else
                await You_feel('the presence of evil.');

            /* Give those on low levels a (slightly) better chance of
               survival */
            if (rnd(100) > (80 + level_difficulty())) {
                note_unported_fountain('dowaterdemon:wish');
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline_The('fountain bubbles furiously for a moment, then calms.');
    }
}

// src/fountain.c:93 dowaternymph()
async function dowaternymph() {
    const { makemon } = await import('./makemon.js');
    const { a_monnam } = await import('./do_name.js');
    const { PMNAMES } = await import('./monst_data.js');
    const { MM_NOMSG, NO_TRAP_FLAGS } = await import('./const.js');
    const { mintrap } = await import('./trap.js');
    const { t_at } = await import('./mon.js');
    const { You_hear } = await import('./pline.js');
    const G_GONE = 0x03;

    let mtmp = null;
    if (!((game.mvitals?.[PMNAMES.PM_WATER_NYMPH]?.mvflags ?? 0) & G_GONE)
        && (mtmp = await makemon(game.mons[PMNAMES.PM_WATER_NYMPH],
                           game.u.ux, game.u.uy, MM_NOMSG))) {
        if (!game.u.ublind)
            await You(`attract ${a_monnam(mtmp)}!`);
        else
            await You_hear('a seductive voice.');
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my))
            await mintrap(mtmp, NO_TRAP_FLAGS);
    } else if (!game.u.ublind) {
        await pline('A large bubble rises to the surface and pops.');
    } else {
        await You_hear('a loud pop.');
    }
}

function nexttodoor(x, y) {
    for (let dx = -1; dx <= 1; ++dx)
        for (let dy = -1; dy <= 1; ++dy) {
            const nx = x + dx, ny = y + dy;
            if (!isok(nx, ny))
                continue;
            const typ = game.level.at(nx, ny)?.typ;
            if (IS_DOOR(typ) || typ === SDOOR)
                return true;
        }
    return false;
}

const gush_floor_traps = new Set([
    SQKY_BOARD, BEAR_TRAP, LANDMINE, FIRE_TRAP, PIT, SPIKED_PIT, HOLE,
    TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, WEB, MAGIC_TRAP, ANTI_MAGIC,
]);

function delete_gush_trap(ttmp) {
    if (!gush_floor_traps.has(ttmp.ttyp))
        return false;
    const mon = m_at(ttmp.tx, ttmp.ty);
    if (mon)
        mon.mtrapped = 0;
    deltrap(ttmp);
    return true;
}

// src/fountain.c:134 gush(). The distance roll precedes the terrain, boulder,
// and door checks, so even an ineligible visible square can spend a draw.
async function gush(x, y, state) {
    if ((x + y) % 2 || (game.u.ux === x && game.u.uy === y)
        || rn2(1 + distmin(game.u.ux, game.u.uy, x, y))
        || game.level.at(x, y)?.typ !== ROOM
        || sobj_at(ONAMES.BOULDER, x, y) || nexttodoor(x, y))
        return;

    const trap = t_at(x, y);
    if (trap && !delete_gush_trap(trap))
        return;

    if (state.madepool++ === 0)
        await pline('Water gushes forth from the overflowing fountain!');

    const loc = game.level.at(x, y);
    loc.typ = POOL;
    loc.flags = 0;
    const engraving = engr_at(x, y);
    if (engraving)
        del_engr(engraving);

    const floor_objects = (game.level.objects || [])
        .filter(obj => obj.ox === x && obj.oy === y);
    await water_damage_chain(floor_objects, true);

    if (m_at(x, y)) {
        /* minliquid() is only relevant for a monster on a newly made pool.
           Keep the flood and draw order exact while its drowning branches
           remain isolated as a tracked gap. */
        note_unported_fountain('gush:minliquid');
    } else {
        newsym(x, y);
    }
}

// src/fountain.c:121 dogushforth(). do_clear_area supplies C's exact visible
// coordinate order; process the collected coordinates serially for water
// damage messages and draws.
export async function dogushforth(drinking) {
    const coords = [];
    do_clear_area(game.u.ux, game.u.uy, 7,
                  (x, y) => coords.push([x, y]), null);
    const state = { madepool: 0 };
    for (const [x, y] of coords)
        await gush(x, y, state);
    if (!state.madepool) {
        if (drinking)
            await Your('thirst is quenched.');
        else
            await pline('Water sprays all over you.');
    }
}

// src/fountain.c:165 dofindgem() -- place one weighted random gem in the
// fountain square and remember that this fountain has been looted.
async function dofindgem() {
    if (!game.u.ublind)
        await You('spot a gem in the sparkling waters!');
    else
        await You_feel('a gem here!');
    mksobj_at(rnd_class(ONAMES.DILITHIUM_CRYSTAL, ONAMES.LUCKSTONE - 1),
              game.u.ux, game.u.uy, false, false);
    game.level.at(game.u.ux, game.u.uy).looted |= 1; /* F_LOOTED */
    newsym(game.u.ux, game.u.uy);
    exercise(A_WIS, true);
}

// src/fountain.c:243 drinkfountain() — quaff from the fountain underfoot.
export async function drinkfountain() {
    const u = game.u;
    const loc = game.level.at(u.ux, u.uy);
    const mgkftn = (loc.blessedftn === 1);
    const fate = rnd(30);

    if (u.uprops?.LEVITATION) {
        note_unported_fountain('drinkfountain:floating_above');
        return;
    }

    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        const littleluck = (u.uluck | 0) < 4;

        await pline('Wow!  This makes you feel great!');
        for (let i = 0; i < A_MAX; ++i) {
            if (u.acurr.a[i] < u.amax.a[i]) {
                u.acurr.a[i] = u.amax.a[i];
                (game.disp ||= {}).botl = true;
            }
        }

        let i = rn2(A_MAX);
        for (let ii = 0; ii < A_MAX; ++ii) {
            if (await adjattrib(i, 1, littleluck ? -1 : 0) && littleluck)
                break;
            if (++i >= A_MAX)
                i = 0;
        }

        await more();
        await pline('A wisp of vapor escapes the fountain...');
        exercise(A_WIS, true);
        loc.blessedftn = 0;
        return;
    }

    if (fate < 10) {
        await pline_The('cool draught refreshes you.');
        u.uhunger += rnd(10); /* don't choke on water */
        const { newuhs } = await import('./eat.js');
        await newuhs(false);
        if (mgkftn)
            return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            {
                await You_feel('self-knowledgeable...');
                await more();

                const { enlightenment, MAGICENLIGHTENMENT,
                        ENL_GAMEINPROGRESS } = await import('./insight.js');
                const { tty_create_nhwindow, tty_destroy_nhwindow,
                        tty_start_menu, tty_add_menu, tty_end_menu,
                        tty_display_nhwindow, tty_next_page, NHW_MENU,
                        ATR_NONE } = await import('./tty/wintty.js');
                const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE } =
                    await import('./const.js');
                const { NO_COLOR } = await import('./terminal.js');
                const { xwaitforspace } = await import('./tty/getline.js');
                const { docrt } = await import('./display.js');

                const win = tty_create_nhwindow(NHW_MENU);
                tty_start_menu(win, MENU_BEHAVE_STANDARD);
                for (const line of enlightenment(MAGICENLIGHTENMENT,
                                                  ENL_GAMEINPROGRESS)) {
                    tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR,
                                 line, MENU_ITEMFLAGS_NONE);
                }
                tty_end_menu(win, null);
                await tty_display_nhwindow(win);
                await xwaitforspace(' \r\n\x1b');
                while (tty_next_page(win))
                    await xwaitforspace(' \r\n\x1b');
                tty_destroy_nhwindow(win);
                await docrt();

                exercise(A_WIS, true);
                await pline_The('feeling subsides.');
            }
            break;
        case 20: /* Foul water */
            {
                await pline_The('water is foul!  You gag and vomit.');
                const { morehungry, vomit } = await import('./eat.js');
                await morehungry(rn1(20, 11));
                await vomit();
            }
            break;
        case 21: /* Poisonous */
            {
                await pline_The('water is contaminated!');
                const { Poison_resistance } = await import('./youprop.js');
                if (Poison_resistance()) {
                    const { fruitname } = await import('./objnam.js');
                    const { losehp } = await import('./hack.js');
                    await pline(`Perhaps it is runoff from the nearby ${
                        fruitname(false)} farm.`);
                    await losehp(rnd(4), 'unrefrigerated sip of juice',
                                 KILLED_BY_AN);
                    break;
                }
                await poison_strdmg(rn1(4, 3), rnd(10),
                                    'contaminated water', KILLED_BY);
                exercise(A_CON, false);
            }
            break;
        case 22: /* Fountain of snakes! */
            await dowatersnakes();
            break;
        case 23: /* Water demon */
            await dowaterdemon();
            break;
        case 24: /* Maybe curse some items */
            {
                await pline("This water's no good!");
                const { morehungry } = await import('./eat.js');
                const { rn1 } = await import('./rng.js');
                await morehungry(rn1(20, 11));
                exercise(A_CON, false);
                let buc_changed = 0;
                for (const obj of [...(game.invent || [])]) {
                    if (obj.oclass !== OCLASSES.COIN_CLASS && !obj.cursed
                        && !rn2(5)) {
                        await curse(obj);
                        ++buc_changed;
                    }
                }
                if (buc_changed)
                    update_inventory();
            }
            break;
        case 25: /* See invisible */
            note_unported_fountain('drinkfountain:see_invisible');
            break;
        case 26: /* See Monsters */
            {
                const { monster_detect } = await import('./detect.js');
                if (await monster_detect(null, 0))
                    await pline_The('water tastes like nothing.');
                exercise(A_WIS, true);
            }
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!(loc.looted & 1 /* F_LOOTED */)) {
                await dofindgem();
                break;
            }
            /* FALLTHRU */
        case 28: /* Water Nymph */
            await dowaternymph();
            break;
        case 29: /* Scare */
            {
                await pline('This water gives you bad breath!');
                const { monflee } = await import('./monmove.js');
                for (const mtmp of (game.level?.monsters || [])) {
                    if (mtmp.mhp <= 0)
                        continue;
                    await monflee(mtmp, 0, false, false);
                }
            }
            break;
        case 30: /* Gushing forth in this room */
            await dogushforth(true);
            break;
        default:
            await pline('This tepid water is tasteless.');
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

// src/fountain.c:575 breaksink() -- convert a sink into a looted fountain.
export async function breaksink(x, y) {
    const { cansee } = await import('./vision.js');
    if (cansee(x, y) || u_at(x, y))
        await pline_The('pipes break!  Water spurts out!');

    const loc = game.level.at(x, y);
    if (loc.typ === SINK) {
        game.level.flags.nsinks = Math.max(0,
            (game.level.flags.nsinks || 1) - 1);
    }
    if (loc.typ !== FOUNTAIN)
        game.level.flags.nfountains = (game.level.flags.nfountains || 0) + 1;
    loc.typ = FOUNTAIN;
    loc.looted = F_LOOTED;
    loc.blessedftn = 0;
    newsym(x, y);
}

// src/fountain.c:595 drinksink() -- quaff from the sink underfoot.
export async function drinksink() {
    if (game.u.uprops?.LEVITATION) {
        await You('are floating high above the sink.');
        return;
    }

    const outcome = rn2(20);
    switch (outcome) {
    case 0:
        await You(`take a sip of very cold ${hliquid('water')}.`);
        break;
    case 1:
        await You(`take a sip of very warm ${hliquid('water')}.`);
        break;
    case 2:
        await You(`take a sip of scalding hot ${hliquid('water')}.`);
        if (Fire_resistance()) {
            await pline('It seems quite tasty.');
        } else {
            await losehp(rnd(6), 'sipping boiling water', KILLED_BY);
        }
        break;
    case 3: {
        const { PMNAMES } = await import('./monst_data.js');
        const { G_GONE, MM_NOMSG } = await import('./const.js');
        if ((game.mvitals?.[PMNAMES.PM_SEWER_RAT]?.mvflags ?? 0) & G_GONE) {
            await pline_The('sink seems quite dirty.');
        } else {
            const { makemon } = await import('./makemon.js');
            const mtmp = await makemon(game.mons[PMNAMES.PM_SEWER_RAT],
                                 game.u.ux, game.u.uy, MM_NOMSG);
            if (mtmp) {
                const { canspotmon } = await import('./display.js');
                const { a_monnam } = await import('./do_name.js');
                await pline(`Eek!  There's ${Blind() || !canspotmon(mtmp)
                    ? 'something squirmy' : a_monnam(mtmp)} in the sink!`);
            }
        }
        break;
    }
    case 4: {
        let otmp;
        do {
            otmp = mkobj(OCLASSES.POTION_CLASS, false);
        } while (otmp.otyp === ONAMES.POT_WATER);
        otmp.cursed = 0;
        otmp.blessed = 0;
        const { OBJ_DESCR } = await import('./objnam.js');
        const color = Blind() ? 'odd'
                    : hcolor(OBJ_DESCR(game.objects[otmp.otyp]));
        await pline(`Some ${color} liquid flows from the faucet.`);
        if (!Blind() && !Hallucination()) {
            const { observe_object } = await import('./o_init.js');
            observe_object(otmp);
        }
        otmp.quan++;
        otmp.fromsink = 1;
        const { dopotion } = await import('./potion.js');
        await dopotion(otmp);
        break;
    }
    case 5: {
        const lev = game.level.at(game.u.ux, game.u.uy);
        if (!(lev.looted & S_LRING)) {
            await You('find a ring in the sink!');
            mkobj_at(OCLASSES.RING_CLASS, game.u.ux, game.u.uy, true);
            lev.looted |= S_LRING;
            exercise(A_WIS, true);
            newsym(game.u.ux, game.u.uy);
        } else {
            await pline(`Some dirty ${hliquid('water')} backs up in the drain.`);
        }
        break;
    }
    case 6:
        await breaksink(game.u.ux, game.u.uy);
        break;
    case 7: {
        await pline_The(`${hliquid('water')} moves as though of its own will!`);
        const { PMNAMES } = await import('./monst_data.js');
        const { G_GONE, MM_NOMSG } = await import('./const.js');
        const gone = (game.mvitals?.[PMNAMES.PM_WATER_ELEMENTAL]?.mvflags ?? 0)
                   & G_GONE;
        let mtmp = null;
        if (!gone) {
            const { makemon } = await import('./makemon.js');
            mtmp = await makemon(game.mons[PMNAMES.PM_WATER_ELEMENTAL],
                           game.u.ux, game.u.uy, MM_NOMSG);
        }
        if (gone || !mtmp)
            await pline('But it quiets down.');
        break;
    }
    case 8:
        await pline(`Yuk, this ${hliquid('water')} tastes awful.`);
        more_experienced(1, 0);
        await newexplevel();
        break;
    case 10:
        await pline(`This ${hliquid('water')} contains toxic wastes!`);
        if (!Unchanging()) {
            await You('undergo a freakish metamorphosis!');
            const { polyself } = await import('./polyself.js');
            await polyself(POLY_NOFLAGS);
        }
        break;
    case 13: {
        await pline('Ew, what a stench!');
        const { create_gas_cloud } = await import('./region.js');
        await create_gas_cloud(game.u.ux, game.u.uy, 1, 4);
        break;
    }
    case 11:
        await You_hear('clanking from the pipes...');
        break;
    case 12:
        await You_hear('snatches of song from among the sewers...');
        break;
    case 19:
        if (game.u.intrinsic?.HHallucination || game.u.uprops?.HALLUC) {
            await pline('From the murky drain, a hand reaches up... --oops--');
            break;
        }
        /* FALLTHRU */
    default:
        await You(`take a sip of ${rn2(3) ? (rn2(2) ? 'cold' : 'warm')
                                         : 'hot'} ${hliquid('water')}.`);
        break;
    case 9:
        await pline('Gaggg... this tastes like sewage!  You vomit.');
        await morehungry(rn1(30 - ACURR(A_CON), 11));
        await vomit();
        break;
    }
}

// src/fountain.c:394 dipfountain() — dip an object into a fountain.
export async function dipfountain(obj) {
    let er = 0; /* ER_NOTHING */

    if (game.u.uprops?.LEVITATION) {
        note_unported_fountain('dipfountain:floating_above');
        return;
    }

    if (obj.otyp === ONAMES.LONG_SWORD && game.u.ulevel >= 5
        && !rn2(game.urole?.name === 'Knight' ? 6 : 30)
        && obj.quan === 1 && !obj.oartifact) {
        /* exist_artifact(Excalibur) — the Lady of the Lake; artifact
           creation machinery records */
        note_unported_fountain('dipfountain:excalibur');
        return;
    } else if (obj === game.u.uarmg) {
        note_unported_fountain('dipfountain:wash_hands');
    } else {
        er = await water_damage(obj, null, true);
    }

    if (er === 3 /* ER_DESTROYED */ || (er !== 0 && !rn2(2))) {
        return; /* no further effect */
    }

    switch (rnd(30)) {
    case 16: /* Curse the item */
        if (obj.oclass !== OCLASSES.COIN_CLASS && !obj.cursed) {
            await curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: /* Uncurse the item */
        if (obj.cursed) {
            if (!game.u.ublind)
                await pline_The('water glows for a moment.');
            await uncurse(obj);
        } else {
            await pline('A feeling of loss comes over you.');
        }
        break;
    case 21: /* Water Demon */
        note_unported_fountain('dipfountain:dowaterdemon');
        break;
    case 22: /* Water Nymph */
        await dowaternymph();
        break;
    case 23: /* an Endless Stream of Snakes */
        await dowatersnakes();
        break;
    case 24: /* Find a gem */
        if (!(game.level.at(game.u.ux, game.u.uy).looted & 1 /* F_LOOTED */)) {
            await dofindgem();
            break;
        }
        await dogushforth(false);
        break;
    case 25: /* Water gushes forth */
        await dogushforth(false);
        break;
    case 26: /* Strange feeling */
        await pline('A strange tingling runs up your arm.');
        break;
    case 27: /* Strange feeling */
        await You_feel('a sudden chill.');
        break;
    case 28: /* Strange feeling */
        await pline('An urge to take a bath overwhelms you.');
        {
            let money = money_cnt(game.invent);
            if (money > 10) {
                game._deferred_status_money = {
                    value: money,
                    throughMove: (game.moves ?? 0) + 1,
                };
                money = Math.trunc(somegold(money) / 10);
                for (const coin of [...(game.invent || [])]) {
                    if (money <= 0)
                        break;
                    if (coin.oclass !== OCLASSES.COIN_CLASS)
                        continue;
                    const denomination = game.objects[coin.otyp].oc_cost;
                    const coin_loss = Math.min(
                        Math.trunc((money + denomination - 1) / denomination),
                        coin.quan);
                    coin.quan -= coin_loss;
                    money -= coin_loss * denomination;
                    if (!coin.quan)
                        game.invent.splice(game.invent.indexOf(coin), 1);
                }
                await You('lost some of your gold in the fountain!');
                game.level.at(game.u.ux, game.u.uy).looted &= ~1;
                exercise(A_WIS, false);
            }
        }
        break;
    case 29: /* You see coins */
        note_unported_fountain('dipfountain:see_coins');
        break;
    default:
        if (er === 0 /* ER_NOTHING */)
            await pline('Nothing seems to happen.');
        break;
    }
    update_inventory();
    await dryup(game.u.ux, game.u.uy, true);
}

// src/fountain.c sink_backs_up(); a kicked sink spits out a ring, once
export async function sink_backs_up(x, y) {
    let buf;

    if (!Blind())
        buf = 'Muddy waste pops up from the drain';
    else if (!Deaf())
        buf = 'You hear a sloshing sound'; /* Deaf-aware */
    else
        buf = `Something splashes you in the ${body_part(FACE)}`;
    await pline(`${!Deaf() ? 'Flupp!  ' : ''}${buf}.`);

    if (!(game.level.at(x, y).looted & S_LRING)) { /* once per sink */
        if (!Blind())
            await You_see('a ring shining in its midst.');
        mkobj_at(OCLASSES.RING_CLASS, x, y, true);
        newsym(x, y);
        exercise(A_DEX, true);
        exercise(A_WIS, true); /* a discovery! */
        game.level.at(x, y).looted |= S_LRING;
    }
}
