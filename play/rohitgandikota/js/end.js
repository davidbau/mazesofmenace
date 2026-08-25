// end.js — the death sequence.
// C ref: src/end.c
//
// done() and really_done() spend almost no draws themselves; the sequence is
// screens — "Die?", the corpse (whose creation DOES draw), "Save bones?",
// the tombstone text window, the topten notice — and then the process ends,
// which for a replayed session means the remaining keys of the segment are
// swallowed and the next segment starts a fresh game.

import { game } from './gstate.js';
import { pline, canspotmon } from './display.js';
import { You } from './pline.js';
import { hidden_gold, money_cnt } from './invent.js';
import { depth, dunlevs_in_dungeon } from './dungeon.js';
import { G_GENOD, G_UNIQ, In_endgame, In_quest, KILLED_BY_AN, KILLED_BY,
         LOW_PM, M_AP_MONSTER, M_AP_TYPE, MGIVENNAME, NHW_TEXT, NHW_MENU,
         NON_PM, has_mgivenname } from './const.js';
import { PMNAMES, MONSYMS } from './monst_data.js';
import { pmname } from './do_name.js';
import { gender, type_is_pname } from './mondata.js';
import { is_vampshifter } from './monst.js';
import { Hallucination } from './youprop.js';
import { an } from './objnam.js';
import { Race_if } from './u_init.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow } from './tty/wintty.js';
import { tty_yn_function } from './tty/topl.js';

function note_unported_end(what) {
    (game.unported ||= new Set()).add('end:' + what);
}

// src/end.c:44 deaths[] — the array of death.
const deaths = [
    'died', 'choked', 'poisoned', 'starvation', 'drowning', 'burning',
    'dissolving under the heat and pressure', 'crushed', 'turned to stone',
    'turned into slime', 'genocided', 'panic', 'trickery', 'quit',
    'escaped', 'ascended',
];

// src/end.c:52 ends[] — "when you %s".
const ends = [
    'died', 'choked', 'were poisoned', 'starved', 'drowned', 'burned',
    'dissolved in the lava', 'were crushed', 'turned to stone',
    'turned into slime', 'were genocided', 'panicked', 'were tricked',
    'quit', 'escaped', 'ascended',
];

/* include/hack.h death `how` reasons; only the ones the port dispatches on */
export const DIED = 0, CHOKING = 1, POISONING = 2, STARVING = 3,
             DROWNING = 4, BURNING = 5, DISSOLVED = 6, CRUSHING = 7,
             STONING = 8, TURNED_SLIME = 9, GENOCIDED = 10, PANICKED = 11,
             TRICKED = 12, QUIT = 13, ESCAPED = 14, ASCENDED = 15;

const the_unique_pm = (ptr) =>
    !type_is_pname(ptr) && (ptr.geno & G_UNIQ) !== 0;

// src/mon.c:362 zombie_maker(), used here only to choose the hero's bones
// form after a fatal attack.
function zombie_maker(mon) {
    const ptr = mon.data;
    if (mon.mcan)
        return false;
    if (ptr.mlet === MONSYMS.S_ZOMBIE)
        return ptr.pmidx !== PMNAMES.PM_GHOUL
            && ptr.pmidx !== PMNAMES.PM_SKELETON;
    return ptr.mlet === MONSYMS.S_LICH;
}

// src/end.c:185 done_in_by() -- death caused directly by a monster.
export async function done_in_by(mtmp, how) {
    const original = mtmp.data;
    const chamData = Number.isInteger(mtmp.cham) && mtmp.cham >= LOW_PM
        ? game.mons?.[mtmp.cham] : null;
    const champtr = chamData || original;
    const mimicker = M_AP_TYPE(mtmp) === M_AP_MONSTER;
    const imitator = original !== champtr || mimicker;
    const monGender = gender(mtmp);
    let format = KILLED_BY_AN;
    let buf = '';

    await You(how === STONING ? 'turn to stone...' : 'die...');

    if ((original.geno & G_UNIQ) !== 0 && !(imitator && !mimicker)
        && !(original === game.mons[PMNAMES.PM_HIGH_CLERIC]
             && !mtmp.ispriest)) {
        if (!type_is_pname(original))
            buf += 'the ';
        format = KILLED_BY;
    }
    if (original === game.mons[PMNAMES.PM_GHOST]
        && has_mgivenname(mtmp)) {
        buf += 'the ';
        format = KILLED_BY;
    }
    if (mtmp.minvis)
        buf += 'invisible ';
    if (Hallucination() && canspotmon(mtmp))
        buf += 'hallucinogen-distorted ';

    if (imitator) {
        let shapePtr = original;
        const realnm = pmname(champtr, monGender);
        let fakenm = pmname(original, monGender);
        const alternate = is_vampshifter(mtmp);

        if (mimicker) {
            shapePtr = game.mons[mtmp.mappearance] || original;
            fakenm = pmname(shapePtr, monGender);
        } else if (alternate && realnm.includes('vampire')
                   && fakenm === 'vampire bat') {
            fakenm = 'bat';
        }

        const shape = alternate || type_is_pname(shapePtr) ? fakenm
            : the_unique_pm(shapePtr) ? `the ${fakenm}` : an(fakenm);
        buf += alternate ? `${realnm} in ${shape} form`
            : mimicker ? `${realnm} disguised as ${shape}`
              : `${realnm} imitating ${shape}`;
    } else if (original === game.mons[PMNAMES.PM_GHOST]) {
        buf += 'ghost';
        if (has_mgivenname(mtmp))
            buf += ` of ${MGIVENNAME(mtmp)}`;
    } else if (mtmp.isshk) {
        const rawName = mtmp.shknam || mtmp.eshk?.shknam
            || mtmp.mextra?.eshk?.shknam || '';
        if (rawName) {
            const personal = /^[-+=]/.test(rawName);
            const shkname = /^[A-Za-z]/.test(rawName[0])
                ? rawName : rawName.slice(1);
            buf += `${personal ? '' : mtmp.female ? 'Ms. ' : 'Mr. '}`
                + `${shkname}, the shopkeeper`;
        } else {
            note_unported_end('done_in_by:shopkeeper-name');
            buf += pmname(original, monGender);
        }
        format = KILLED_BY;
    } else if (mtmp.ispriest || mtmp.isminion) {
        note_unported_end('done_in_by:priest-or-minion-name');
        buf += pmname(original, monGender);
    } else {
        buf += pmname(original, monGender);
        if (has_mgivenname(mtmp))
            buf += ` called ${MGIVENNAME(mtmp)}`;
    }

    game.killer = { format, name: buf };
    if (game.multi_reason)
        note_unported_end('done_in_by:multi-reason-truncation');

    if (original.mlet === MONSYMS.S_WRAITH) {
        game.u.ugrave_arise = PMNAMES.PM_WRAITH;
    } else if (original.mlet === MONSYMS.S_MUMMY
               && (game.urace?.mummynum ?? NON_PM) !== NON_PM) {
        game.u.ugrave_arise = game.urace.mummynum;
    } else if (zombie_maker(mtmp)
               && (game.urace?.zombienum ?? NON_PM) !== NON_PM) {
        game.u.ugrave_arise = game.urace.zombienum;
    } else if (original.mlet === MONSYMS.S_VAMPIRE
               && Race_if(PMNAMES.PM_HUMAN)) {
        game.u.ugrave_arise = PMNAMES.PM_VAMPIRE;
    } else if (original === game.mons[PMNAMES.PM_GHOUL]) {
        game.u.ugrave_arise = PMNAMES.PM_GHOUL;
    }
    if ((game.u.ugrave_arise ?? NON_PM) >= LOW_PM
        && (game.mvitals[game.u.ugrave_arise].mvflags & G_GENOD) !== 0)
        game.u.ugrave_arise = NON_PM;

    await done(how);
}

// src/end.c:1855 formatkiller() — final death description. Only the
// NO_KILLER_PREFIX and KILLED_BY* forms are live; the fuller article logic
// follows svk.killer.format the same way.
export function formatkiller(how, incl_helpless) {
    const k = game.killer || {};
    let name = k.name || deaths[how] || 'died';
    /* src/topten.c:103 killed_by_prefix[] — the verb depends on `how` */
    const killed_by_prefix = [
        /* DIED, CHOKING, POISONING, STARVING, */
        'killed by ', 'choked on ', 'poisoned by ', 'died of ',
        /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
        'drowned in ', 'burned by ', 'dissolved in ',
        'crushed to death by ',
        /* STONING, TURNED_SLIME, GENOCIDED, */
        'petrified by ', 'turned to slime by ', 'killed by ',
        /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
        '', '', '', '', '',
    ];
    const prefix = killed_by_prefix[how] ?? 'killed by ';
    /* KILLED_BY_AN = 0, KILLED_BY = 1, NO_KILLER_PREFIX = 2 */
    switch (k.format ?? 0) {
    case 2:
        return name;
    case 0:
        /* an() before the prefix attaches */
        name = (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
        /* FALLTHRU */
    case 1:
    default:
        return prefix + name;
    }
}

// src/end.c:704 savelife() — explore/wizard "OK, so you don't die."
function savelife(how) {
    const u = game.u;
    const A_CON = 2;
    const acon = u.acurr?.a?.[A_CON] ?? 10;
    const givehp = 50 + 10 * ((acon / 2) | 0);

    if (u.ulevel < 1)
        u.ulevel = 1;
    /* minuhpmax(10) */
    if (u.uhpmax < 10)
        u.uhpmax = 10;
    u.uhp = Math.min(u.uhpmax, givehp);
    if (u.uhunger < 500 || how === CHOKING) {
        u.uhunger = 900;   /* init_uhunger() */
        u.uhs = 1;         /* NOT_HUNGRY */
    }
    game.nomovemsg = 'You survived that attempt on your life.';
    game.multi = -1; /* can't move again during the current turn */
    game.disp = game.disp || {};
    game.disp.botl = true;
}

// src/end.c done() — the hero's game is over.
export async function done(how) {
    let survive = false;
    const u = game.u;
    game.killer ||= {};

    if (how === TRICKED && game.wizard) {
        await You('are a very tricky wizard, it seems.');
        game.killer.format = 0;
        return;
    }

    /* force full status update */
    game.disp = game.disp || {};
    game.disp.botlx = true;
    /* src/end.c:1045: draw the final live status before fatal damage sets
       current HP to zero (skipped for 'q' to "Really quit?") */
    if (!(how === QUIT && game.done_stopprint)) {
        const { bot } = await import('./display.js');
        await bot();
    }

    if (how === ASCENDED || (!game.killer.name && how === GENOCIDED))
        game.killer.format = 2; /* NO_KILLER_PREFIX */
    if (!game.killer.name && (how === STARVING || how === BURNING))
        game.killer.format = 1; /* KILLED_BY */
    if (!game.killer.name || how >= PANICKED)
        game.killer.name = deaths[how];

    if (how < PANICKED) {
        u.umortality = (u.umortality || 0) + 1;
        if (u.uhp !== 0) {
            u.uhp = 0;
            game.disp.botl = true;
        }
    }
    /* Lifesaved (amulet of life saving): no session wears one yet */
    if (u.uprops?.LIFESAVED && how <= GENOCIDED)
        note_unported_end('done:lifesaved');

    /* explore and wizard modes offer player the option to keep playing */
    if (!survive && (game.wizard || game.discover) && how <= GENOCIDED) {
        const c = await tty_yn_function('Die?', 'yn', 'n');
        if (c !== 'y') {
            await pline(`OK, so you don't ${how === CHOKING ? 'choke' : 'die'}.`);
            savelife(how);
            survive = true;
        }
    }

    if (survive) {
        game.killer.name = '';
        game.killer.format = 0;
        return;
    }
    await really_done(how);
}

// src/dungeon.c deepest_lev_reached() — deepest ledger depth the hero saw.
function deepest_lev_reached() {
    let deepest = 1;
    for (let i = 0; i < (game.dungeons || []).length; i++) {
        const d = game.dungeons[i];
        const reached = d.dunlev_ureached ?? 0;
        if (reached > 0) {
            const dep = d.depth_start + reached - 1;
            if (dep > deepest)
                deepest = dep;
        }
    }
    return deepest;
}

// src/end.c:1135 really_done() — the part after the point of no return.
async function really_done(how) {
    const u = game.u;
    let corpse = null;
    let umoney;

    /* src/end.c:1144 — the game is now over; disclosure windows read this
       (add_menu_heading drops its highlight, hallucination stops, &c) */
    game.program_state_gameover = true;
    {
        const { night, midnight } = await import('./calendar.js');
        (game.iflags ||= {}).at_night = night();
        game.iflags.at_midnight = midnight();
    }

    /* achievements, dumplog, signal handlers: none modelled */

    const { can_make_bones, savebones } = await import('./bones.js');
    const bones_ok = (how < GENOCIDED) && can_make_bones();

    /* maintain ugrave_arise even for !bones_ok */
    if (how === PANICKED)
        u.ugrave_arise = -4;           /* NON_PM - 3 */
    else if (how === BURNING || how === DISSOLVED)
        u.ugrave_arise = -3;           /* NON_PM - 2 */
    else if (how === STONING)
        u.ugrave_arise = -100;         /* LEAVESTATUE; not modelled */
    else
        u.ugrave_arise = u.ugrave_arise ?? -1;   /* NON_PM */

    /* paybill/paygd: no shop bill or vault gold for these heroes */

    /* discover everything in inventory for disclosure and dumplog */
    const { discover_object } = await import('./o_init.js');
    const { Is_container } = await import('./obj.js');
    const { ONAMES: END_ONAMES } = await import('./objects_data.js');
    for (const obj of game.invent || []) {
        discover_object(obj.otyp, true, true, false);
        obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
        if (Is_container(obj))
            obj.cknown = 1;
        if (obj.otyp === END_ONAMES.TIN)
            obj.cknown = 1;
        if (obj.otyp === END_ONAMES.LARGE_BOX || obj.otyp === END_ONAMES.CHEST)
            obj.lknown = 1;
    }

    await disclose(how);

    /* dump_everything: dumplog disabled */

    /* grave creation after disclosure */
    if (bones_ok && u.ugrave_arise === -1
        && !((game.mvitals?.[u.umonnum]?.mvflags ?? 0) & 0x10 /* G_NOCORPSE */)) {
        const mnum = game.urace?.mnum ?? PMNAMES.PM_HUMAN;
        const { mkcorpstat } = await import('./mklev.js');
        const { ONAMES } = await import('./objects_data.js');
        const { CORPSTAT_INIT } = await import('./const.js');
        corpse = mkcorpstat(ONAMES.CORPSE, null, mnum, u.ux, u.uy,
                            CORPSTAT_INIT);
        if (corpse && game.plname) {
            /* mk_named_object: oname(corpse, plname) */
            corpse.oname = game.plname;
        }
        /* make_grave: headstone terrain is not modelled; the level is not
           redrawn after death so it has no screen effect here */
        note_unported_end('really_done:make_grave');
    }

    /* calculate score, before creating bones [container gold] */
    {
        const deepest = deepest_lev_reached();
        umoney = money_cnt(game.invent || []);
        umoney += hidden_gold(game.invent || [], true);
        let tmp = u.umoney0 ?? 0;
        tmp = umoney - tmp;            /* net gain */
        if (tmp < 0)
            tmp = 0;
        if (how < PANICKED)
            tmp -= (tmp / 10) | 0;
        tmp += 50 * (deepest - 1);
        if (deepest > 20)
            tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
        u.urexp = (u.urexp || 0) + tmp;

        if (how === ASCENDED)
            note_unported_end('really_done:ascension bonus');
    }

    if (u.ugrave_arise >= 0)
        note_unported_end('really_done:body rises');

    if (bones_ok) {
        /* wizard mode asks; normal play saves unconditionally */
        if (!game.wizard
            || (await tty_yn_function('Save bones?', 'yn', 'n')) === 'y')
            await savebones(how, corpse);
        corpse = null;
    }

    game.done_money = umoney;

    /* window teardown, then the tombstone text window. C threads
       done_stopprint through dump_forward_putstr and the final
       display_nhwindow gate, so a 'q' at the wizard Dump-core prompt
       suppresses the whole goodbye summary. */
    const endwin = tty_create_nhwindow(NHW_TEXT);
    if (!game.done_stopprint
        && how < GENOCIDED && (game.flags?.tombstone ?? true)) {
        const { genl_outrip } = await import('./rip.js');
        genl_outrip(endwin, how);
    }

    if (!game.done_stopprint) {
        if (u.uhave?.amulet)
            game.killer.name += ' (with the Amulet)';

        const female = !!game.flags?.female;
        const rolename = (female && game.urole?.name?.f)
            ? game.urole.name.f : (game.urole?.name?.m || 'Adventurer');
        tty_putstr(endwin, 0,
                   `${Goodbye()} ${game.plname} the ${how !== ASCENDED
                       ? rolename : (female ? 'Demigoddess' : 'Demigod')}...`);
        tty_putstr(endwin, 0, '');

        if (how === ESCAPED || how === ASCENDED) {
            note_unported_end('really_done:escape/ascension summary');
        } else {
            /* did not escape or ascend */
            let pbuf;
            if (u.uz.dnum === 0 && u.uz.dlevel <= 0) {
                pbuf = `You ${u.uz.dlevel < 0 ? 'passed away' : ends[how]}`
                       + ' beyond the confines of the dungeon';
            } else {
                const where = game.dungeons?.[u.uz.dnum]?.dname
                              || 'The Dungeons of Doom';
                pbuf = `You ${ends[how]} in ${where}`;
                if (!In_endgame(u.uz))
                    pbuf += ` on dungeon level ${
                        In_quest(u.uz) ? u.uz.dlevel : depth(u.uz)}`;
            }
            pbuf += ` with ${u.urexp} point${u.urexp === 1 ? '' : 's'},`;
            tty_putstr(endwin, 0, pbuf);
        }

        tty_putstr(endwin, 0,
                   `and ${umoney} piece${umoney === 1 ? '' : 's'} of gold, after `
                   + `${game.moves} move${game.moves === 1 ? '' : 's'}.`);
        tty_putstr(endwin, 0,
                   `You were level ${u.ulevel} with a maximum of ${u.uhpmax} hit `
                   + `point${u.uhpmax === 1 ? '' : 's'} when you ${ends[how]}.`);
        tty_putstr(endwin, 0, '');
        await tty_display_nhwindow(endwin, true);
    }
    if (!game.done_stopprint) {
        /* the text window's --More-- accepts only space/return/ESC */
        const { xwaitforspace } = await import('./tty/getline.js');
        const { tty_next_page } = await import('./tty/wintty.js');
        await xwaitforspace(' ');
        while (tty_next_page(endwin))
            await xwaitforspace(' ');
    }
    tty_destroy_nhwindow(endwin);

    /* end.c:1579 — exit_nhwindows() runs before topten(): settty ->
       end_screen clears the terminal and homes the cursor, on every path */
    {
        const { cls } = await import('./display.js');
        await cls();
        const { tty_curs_base } = await import('./tty/wintty.js');
        tty_curs_base(0, 0);
    }
    const { topten } = await import('./topten.js');
    await topten(how);
    {
        /* the raw prints moved the base cursor; the terminal shows it */
        const { tty_base_cursor } = await import('./tty/wintty.js');
        tty_base_cursor();
    }

    /* end.c:1585 — the stopprint path pads two blank raw lines, which is
       where the recorded cursor parks */
    if (game.done_stopprint) {
        const { tty_raw_print, tty_base_cursor } =
            await import('./tty/wintty.js');
        tty_raw_print('');
        tty_raw_print('');
        tty_base_cursor();
    }

    /* nh_terminate(): the process exits here and the session wrapper
       relaunches the game on the same pty and recorder stream. The driver
       sees _restart_pending and boots a fresh game, continuing the RNG. */
    game.program_state_gameover = true;
    /* C's nh_terminate() never returns; unwind the in-flight turn so the
       dying move cannot keep drawing (exerchk etc.) after the exit. A
       session that continues after a death does so as a NEW SEGMENT with
       its own seed and rc; the driver never restarts within a segment. */
    const sig = new Error('nh_terminate');
    sig.__nh_gameover = true;
    throw sig;
}

// src/end.c:476 should_query_disclose_option() — how to handle one
// disclosure category: {ask, defquery}. flags.end_disclose comes from the
// rc's disclose: option; each category char is one of
// y/n (prompt, with that default), +/- (always/never, no prompt), a/#.
function should_query_disclose_option(category) {
    const disclosure_options = 'iavgco'; /* decl.c:54 */
    const idx = disclosure_options.indexOf(category);
    let end = game.flags?.end_disclose;
    if (end === undefined) {
        /* parse the raw rc string once: "-i -a" style tokens */
        end = 'nnnnnn'.split('');
        const raw = game.flags?.disclose;
        if (typeof raw === 'string') {
            for (const tok of raw.trim().split(/\s+/)) {
                if (tok.length === 2) {
                    const k = disclosure_options.indexOf(tok[1]);
                    if (k >= 0)
                        end[k] = tok[0];
                } else if (tok.length === 1) {
                    const k = disclosure_options.indexOf(tok[0]);
                    if (k >= 0)
                        end[k] = 'y';
                }
            }
        }
        end = end.join('');
        (game.flags ||= {}).end_disclose = end;
    }
    const disclose = end[idx] ?? 'n';
    if (disclose === '+')
        return { ask: false, defquery: 'y' };
    if (disclose === '#')
        return { ask: false, defquery: 'a' };
    if (disclose === '-')
        return { ask: false, defquery: 'n' };
    if (disclose === 'y')
        return { ask: true, defquery: 'y' };
    if (disclose === 'a')
        return { ask: true, defquery: 'a' };
    return { ask: true, defquery: 'n' };
}

// src/end.c:2010 disclose() — end of game disclosure. Every category in the
// tourist rc is '-' (never); prompted categories would need the i/a/v/g/c/o
// menus, which are recorded until a session actually reaches one.
async function disclose(how, taken) {
    /* src/end.c:557 should_query_disclose_option() — the default spec is
       DISCLOSE_PROMPT_DEFAULT_NO for every category: ask, defaulting 'n'.
       No public rc sets disclose:, so the ask path is the ported one. */
    const { tty_yn_function } = await import('./tty/topl.js');
    let c;

    if ((game.invent || []).length && !game.done_stopprint) {
        const { ask, defquery } = should_query_disclose_option('i');
        const qbuf = taken
            ? `Do you want to see what you had when you ${
                  how === QUIT ? 'quit' : 'died'}?`
            : 'Do you want your possessions identified?';
        c = ask ? await tty_yn_function(qbuf, 'ynq', defquery) : defquery;
        if (c === 'y') {
            const { display_inventory } = await import('./invent.js');
            const { tty_start_menu, tty_add_menu, tty_end_menu,
                    tty_next_page } = await import('./tty/wintty.js');
            const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE } =
                await import('./const.js');
            const { NO_COLOR } = await import('./terminal.js');
            const { nhgetch } = await import('./input.js');
            const { docrt } = await import('./display.js');
            const win = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(win, MENU_BEHAVE_STANDARD);
            for (const item of display_inventory()) {
                tty_add_menu(win, null, item.heading ? 0 : 1,
                             item.invlet || 0, 0, 0, NO_COLOR, item.str,
                             MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(win, null);
            await tty_display_nhwindow(win);
            let key = await nhgetch();
            while (String.fromCharCode(key) !== '\x1b'
                   && tty_next_page(win))
                key = await nhgetch();
            tty_destroy_nhwindow(win);
            await docrt();
            /* container_contents: no dead hero carries a container yet */
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
    }

    if (!game.done_stopprint) {
        const { ask, defquery } = should_query_disclose_option('a');
        c = ask ? await tty_yn_function('Do you want to see your attributes?',
                                        'ynq', defquery) : defquery;
        if (c === 'y') {
            /* src/end.c:594 — the full window, past tense; en_via_menu is
               FALSE for the final call so the lines go out as putstr text
               with --More-- paging, not a menu pager */
            const { enlightenment, BASICENLIGHTENMENT, MAGICENLIGHTENMENT,
                    ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD } =
                await import('./insight.js');
            const { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
                    tty_destroy_nhwindow, tty_next_page } =
                await import('./tty/wintty.js');
            const { nhgetch } = await import('./input.js');
            const win = tty_create_nhwindow(NHW_MENU);
            for (const l of enlightenment(
                     BASICENLIGHTENMENT | MAGICENLIGHTENMENT,
                     (how >= PANICKED) ? ENL_GAMEOVERALIVE
                                       : ENL_GAMEOVERDEAD))
                tty_putstr(win, 0, l);
            await tty_display_nhwindow(win);
            await nhgetch();
            while (tty_next_page(win))
                await nhgetch();
            tty_destroy_nhwindow(win);
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
    }

    if (!game.done_stopprint) {
        const { ask, defquery } = should_query_disclose_option('v');
        const { list_vanquished } = await import('./insight.js');
        await list_vanquished(defquery, ask);
    }

    /* list_genocided: nothing is ever genocided in a recorded session */

    if (!game.done_stopprint) {
        const { ask, defquery } = should_query_disclose_option('c');
        c = ask ? await tty_yn_function('Do you want to see your conduct?',
                                        'ynq', defquery) : defquery;
        if (c === 'y') {
            const { show_conduct, ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD } =
                await import('./insight.js');
            await show_conduct((how >= PANICKED) ? ENL_GAMEOVERALIVE
                                                 : ENL_GAMEOVERDEAD);
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
    }

    if (!game.done_stopprint) {
        const { ask, defquery } = should_query_disclose_option('o');
        c = ask ? await tty_yn_function(
                'Do you want to see the dungeon overview?', 'ynq', defquery)
                : defquery;
        if (c === 'y') {
            const { show_overview } = await import('./dungeon.js');
            await show_overview((how >= PANICKED) ? 1 : 2, how);
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
    }
}

// src/role.c:2143 Goodbye() — role-flavoured farewell.
function Goodbye() {
    switch (game.urole?.mnum) {
    case PMNAMES.PM_KNIGHT:  return 'Fare thee well';
    case PMNAMES.PM_SAMURAI: return 'Sayonara';
    case PMNAMES.PM_TOURIST: return 'Aloha';
    case PMNAMES.PM_VALKYRIE: return 'Farvel';
    default: return 'Goodbye';
    }
}

// src/end.c:89 done2() — the #quit command.
export async function done2() {
    const { tty_yn_function } = await import('./tty/topl.js');
    /* In_tutorial arm: the tutorial switch-back question */
    /* ParanoidQuit is not in the default paranoid_confirmation set, so
       this is a plain single-key yn with default 'n' */
    const c0 = await tty_yn_function('Really quit without saving?', 'yn', 'n');
    if (c0 !== 'y') {
        /* clear_nhwindow(WIN_MESSAGE); nomul(0) */
        const { nomul } = await import('./hack.js');
        if ((game.multi ?? 0) > 0)
            nomul(0);
        return 0; /* ECMD_OK */
    }

    if (game.wizard) {
        /* src/end.c:129 — UNIX wizard mode offers a core dump; 'q' (the
           default, ESC included) suppresses the end-of-game printout */
        const c = await tty_yn_function('Dump core?', 'ynq', 'q');
        if (c === 'y') {
            /* exit_nhwindows + abort: the session ends here */
            game.program_state = game.program_state || {};
            game.program_state.done = true;
            return 0;
        } else if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
    }
    await done(QUIT);
    return 0;
}
