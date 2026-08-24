// end.js — the death sequence.
// C ref: src/end.c
//
// done() and really_done() spend almost no draws themselves; the sequence is
// screens — "Die?", the corpse (whose creation DOES draw), "Save bones?",
// the tombstone text window, the topten notice — and then the process ends,
// which for a replayed session means the remaining keys of the segment are
// swallowed and the next segment starts a fresh game.

import { game } from './gstate.js';
import { pline } from './display.js';
import { You } from './pline.js';
import { money_cnt } from './invent.js';
import { depth, dunlevs_in_dungeon } from './dungeon.js';
import { In_endgame, In_quest, NHW_TEXT } from './const.js';
import { mons, PMNAMES } from './monst_data.js';
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

// src/end.c:1855 formatkiller() — final death description. Only the
// NO_KILLER_PREFIX and KILLED_BY* forms are live; the fuller article logic
// follows svk.killer.format the same way.
export function formatkiller(how, incl_helpless) {
    const k = game.killer || {};
    const name = k.name || deaths[how] || 'died';
    /* KILLED_BY_AN = 0, KILLED_BY = 1, NO_KILLER_PREFIX = 2 */
    switch (k.format ?? 0) {
    case 2:
        return name;
    case 1:
        return 'killed by ' + name;
    default: {
        /* killed by an <name> — an() without importing objnam for a
           non-object phrase */
        const art = /^[aeiou]/i.test(name) ? 'an ' : 'a ';
        return 'killed by ' + art + name;
    }
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
    for (const obj of game.invent || []) {
        obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
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
        let tmp = u.umoney0 ?? 0;
        /* hidden_gold(): no containers with gold modelled */
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

    /* end.c:1579 — exit_nhwindows() runs before topten() (settty ->
       end_screen clears the terminal). The visible effect only differs
       when the summary was suppressed; the endwin fullscreen display
       covers it otherwise, so clear only on the stopprint path to keep
       the died-session frames byte-stable. */
    if (game.done_stopprint) {
        const { cls } = await import('./display.js');
        await cls();
        /* end_screen homes the cursor; the raw prints start from the top */
        const { tty_curs_base } = await import('./tty/wintty.js');
        tty_curs_base(0, 0);
    }
    const { topten } = await import('./topten.js');
    await topten(how);

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

// src/end.c:2010 disclose() — end of game disclosure. Every category in the
// tourist rc is '-' (never); prompted categories would need the i/a/v/g/c/o
// menus, which are recorded until a session actually reaches one.
async function disclose(how) {
    const spec = game.rc?.opts?.disclose ?? '';
    /* C default is "ni na nv ng nc no" (prompt with default no); an rc of
       "-i -a ..." disables every category outright */
    const wants_prompt = !/^\s*(-[iavgco]\s*)+$/.test(spec) && spec !== null;
    if (spec === '' || wants_prompt) {
        /* defaults would prompt "Do you want ..." for each category */
        note_unported_end(`disclose:spec="${spec}"`);
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
