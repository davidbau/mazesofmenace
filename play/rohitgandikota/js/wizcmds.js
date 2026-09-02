// wizcmds.js — the wizard-mode extended commands.
// C ref: src/wizcmds.c
//
// These matter to a port more than their name suggests. A session recorded with
// OPTIONS=playmode:debug (seed0360, seed0399, seed0108, seed2600 and others) can
// issue any of them, and each one that prompts spends keys. A '#' command whose
// body is skipped leaves its prompt's keystrokes to be read as commands.

import { POLY_CONTROLLED } from './const.js';
import { polyself } from './polyself.js';
import { game } from './gstate.js';
import { makewish } from './zap.js';
import { encumber_msg } from './attrib.js';
import { ECMD_OK, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ANY,
         TIMEOUT, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR, XKILL_NOMSG,
         ECMD_CANCEL, UTOTYPE_NONE, SICK_VOMITABLE, SICK_NONVOMITABLE,
         SUPPRESS_IT, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
         has_mgivenname }
    from './const.js';
import { rn2 } from './rng.js';
import { getdir, getlin } from './cmd.js';
import { docrt, map_trap, pline, unmap_invisible, canspotmon }
    from './display.js';
import { pluslvl, losexp } from './exper.js';
import { level_tele } from './teleport.js';
import { do_mapping } from './detect.js';
import { NO_COLOR } from './terminal.js';
import {
    ATR_NONE, NHW_MENU, tty_add_menu, tty_add_menu_str,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_end_menu,
    tty_select_menu, tty_start_menu,
} from './tty/wintty.js';
import { boolean_option } from './options.js';
import { getpos } from './getpos.js';
import { m_at, xkilled } from './mon.js';
import { DEADMONSTER } from './monst.js';
import { nonliving } from './mondata.js';
import { x_monnam } from './do_name.js';
import { You } from './pline.js';

function note_unported_wizcmds(what) {
    (game.unported ||= new Set()).add(what);
}

// src/wizcmds.c:446 wiz_level_change() — the #levelchange command.
//
// The parse is sscanf("%d%c"), which accepts a number with nothing after it;
// anything else, including an empty line or ESC, falls to "Never mind."
// src/wizcmds.c:32 wiz_wish() — unlimited wishes for debug mode.
export async function wiz_wish() {
    if (game.wizard) {
        const save_verbose = game.flags.verbose;
        game.flags.verbose = false;
        await makewish();
        game.flags.verbose = save_verbose;
        await encumber_msg();
    } else {
        note_unported_wizcmds('wiz_wish:unavailcmd');
    }
    return ECMD_OK;
}

// src/wizcmds.c:243 wiz_kill() targets and slays monsters without spending a
// turn. The ordinary hero-credited path is the one exposed by #wizkill.
export async function wiz_kill() {
    if (!game.wizard) {
        note_unported_wizcmds('wiz_kill:unavailcmd');
        return ECMD_OK;
    }

    const cc = { x: game.u.ux, y: game.u.uy };
    let prompt = 'Pick first monster to slay';
    for (;;) {
        await pline(`${prompt}:`);
        prompt = 'Next monster';

        const saveVerbose = game.flags.verbose;
        const saveAutodescribe = game.iflags?.autodescribe;
        game.flags.verbose = false;
        (game.iflags ||= {}).autodescribe = true;
        const ans = await getpos(cc, true, 'a monster');
        game.flags.verbose = saveVerbose;
        game.iflags.autodescribe = saveAutodescribe;
        if (ans < 0 || cc.x < 1)
            break;

        const mtmp = m_at(cc.x, cc.y);
        unmap_invisible(cc.x, cc.y);
        if (!mtmp) {
            await pline('There is no monster there.');
            break;
        }

        const tame = !!mtmp.mtame;
        const seen = canspotmon(mtmp);
        const article = tame ? ARTICLE_YOUR : seen ? ARTICLE_THE : ARTICLE_A;
        const adjective = tame ? (seen ? 'poor' : 'poor, unseen')
                               : seen ? null : 'unseen';
        const suppress = SUPPRESS_IT | SUPPRESS_HALLUCINATION
            | (tame && has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0);
        const name = x_monnam(mtmp, article, adjective, suppress, false);
        await You(`${nonliving(mtmp.data) ? 'destroy' : 'kill'} ${name}!`);
        await xkilled(mtmp, XKILL_NOMSG);
    }
    return ECMD_OK;
}

// src/wizcmds.c:487 wiz_telekinesis(). Select a visible monster and hurtle
// it six squares in a chosen direction. The command repeats until cancelled.
export async function wiz_telekinesis() {
    if (!game.wizard) {
        await pline('Unavailable command.');
        return ECMD_OK;
    }

    const cc = { x: game.u.ux, y: game.u.uy };
    await pline('Pick a monster to hurtle.');
    do {
        const ans = await getpos(cc, true, 'a monster');
        if (ans < 0 || cc.x < 1)
            return ECMD_CANCEL;

        const mtmp = m_at(cc.x, cc.y);
        if (mtmp && canspotmon(mtmp)) {
            if (!await getdir('which direction?'))
                return ECMD_CANCEL;
            const { mhurtle } = await import('./uhitm.js');
            await mhurtle(mtmp, game.u.dx, game.u.dy, 6);
            if (!DEADMONSTER(mtmp) && canspotmon(mtmp)) {
                cc.x = mtmp.mx;
                cc.y = mtmp.my;
            }
        }
    } while ((game.u.utotype || 0) === UTOTYPE_NONE);
    return ECMD_OK;
}

// src/wizcmds.c:176 wiz_map(): reveal the level, traps, and engravings.
export async function wiz_map() {
    if (!game.wizard) {
        note_unported_wizcmds('wiz_map:unavailcmd');
        return ECMD_OK;
    }

    const u = game.u;
    const intrinsic = (u.intrinsic ||= {});
    const uprops = (u.uprops ||= {});
    const saved = {
        hconf: intrinsic.HConfusion,
        hhallu: intrinsic.HHallucination,
        conf: uprops.CONFUSION,
        hallu: uprops.HALLUC,
    };
    delete intrinsic.HConfusion;
    delete intrinsic.HHallucination;
    delete uprops.CONFUSION;
    delete uprops.HALLUC;

    for (const trap of game.level?.traps || []) {
        trap.tseen = 1;
        map_trap(trap, true);
    }
    /* show_map_spot() maps engravings while do_mapping() scans the level. */
    await do_mapping();

    if (saved.hconf !== undefined) intrinsic.HConfusion = saved.hconf;
    if (saved.hhallu !== undefined) intrinsic.HHallucination = saved.hhallu;
    if (saved.conf !== undefined) uprops.CONFUSION = saved.conf;
    if (saved.hallu !== undefined) uprops.HALLUC = saved.hallu;
    return ECMD_OK;
}

export async function wiz_level_change() {
    let newlevel = 0;
    let ret;

    const buf = mungspaces(
        await getlin('To what experience level do you want to be set?'));

    if (buf[0] === '\x1b' || buf === '') {
        ret = 0;
    } else {
        /* sscanf("%d%c", &newlevel, &dummy) returns 1 only when a number was
           read and NOTHING followed it; trailing junk gives 2. */
        const m = /^\s*([-+]?\d+)(.?)/.exec(buf);
        if (!m) {
            ret = 0;
        } else {
            newlevel = parseInt(m[1], 10);
            ret = m[2] === '' ? 1 : 2;
        }
    }

    if (ret !== 1) {
        await pline('Never mind.');   /* pline1(Never_mind) */
        return ECMD_OK;
    }

    if (newlevel === game.u.ulevel) {
        await pline('You are already that experienced.');
    } else if (newlevel < game.u.ulevel) {
        if (game.u.ulevel === 1) {
            await pline('You are already as inexperienced as you can get.');
            return ECMD_OK;
        }
        newlevel = Math.max(newlevel, 1);
        while (game.u.ulevel > newlevel)
            await losexp('#levelchange');
    } else {
        if (game.u.ulevel >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return ECMD_OK;
        }
        newlevel = Math.min(newlevel, MAXULEV);
        while (game.u.ulevel < newlevel)
            await pluslvl(false);
    }

    /* blessed full healing or restore ability won't fix any lost levels */
    game.u.ulevelmax = game.u.ulevel;
    return ECMD_OK;
}

// src/timeout.c propertynames[], in its menu order. HALLUC_RES is omitted by
// wiz_intrinsic(), and the null entry is the separator before timed-only
// properties.
const WIZ_INTRINSICS = [
    ['INVULNERABLE', 'invulnerable'],
    ['STONED', 'petrifying'],
    ['SLIMED', 'becoming slime'],
    ['STRANGLED', 'strangling'],
    ['SICK', 'fatally sick'],
    ['STUNNED', 'stunned'],
    ['CONFUSION', 'confused'],
    ['HALLUC', 'hallucinating'],
    ['BLINDED', 'blinded'],
    ['DEAF', 'deafness'],
    ['VOMITING', 'vomiting'],
    ['GLIB', 'slippery fingers'],
    ['WOUNDED_LEGS', 'wounded legs'],
    ['SLEEPY', 'sleepy'],
    ['TELEPORT', 'teleporting'],
    ['POLYMORPH', 'polymorphing'],
    ['LEVITATION', 'levitating'],
    ['FAST', 'very fast'],
    ['CLAIRVOYANT', 'clairvoyant'],
    ['DETECT_MONSTERS', 'monster detection'],
    ['SEE_INVIS', 'see invisible'],
    ['INVIS', 'invisible'],
    ['ACID_RES', 'acid resistance'],
    ['STONE_RES', 'stoning resistance'],
    ['DISPLACED', 'displaced'],
    ['PASSES_WALLS', 'pass thru walls'],
    ['MAGICAL_BREATHING', 'magical breathing'],
    ['WWALKING', 'water walking'],
    null,
    ['FIRE_RES', 'fire resistance'],
    ['COLD_RES', 'cold resistance'],
    ['SLEEP_RES', 'sleep resistance'],
    ['DISINT_RES', 'disintegration resistance'],
    ['SHOCK_RES', 'shock resistance'],
    ['POISON_RES', 'poison resistance'],
    ['DRAIN_RES', 'drain resistance'],
    ['SICK_RES', 'sickness resistance'],
    ['ANTIMAGIC', 'magic resistance'],
    ['BLND_RES', 'light-induced blindness resistance'],
    ['FUMBLING', 'fumbling'],
    ['HUNGER', 'voracious hunger'],
    ['TELEPAT', 'telepathic'],
    ['WARNING', 'warning'],
    ['WARN_OF_MON', 'warn: monster type or class'],
    ['WARN_UNDEAD', 'warn: undead'],
    ['SEARCHING', 'searching'],
    ['INFRAVISION', 'infravision'],
    ['ADORNED', 'adorned (+/- Cha)'],
    ['STEALTH', 'stealthy'],
    ['AGGRAVATE_MONSTER', 'monster aggravation'],
    ['CONFLICT', 'conflict'],
    ['JUMPING', 'jumping'],
    ['TELEPORT_CONTROL', 'teleport control'],
    ['FLYING', 'flying'],
    ['SWIMMING', 'swimming'],
    ['SLOW_DIGESTION', 'slow digestion'],
    ['HALF_SPDAM', 'half spell damage'],
    ['HALF_PHDAM', 'half physical damage'],
    ['REGENERATION', 'HP regeneration'],
    ['ENERGY_REGENERATION', 'energy regeneration'],
    ['PROTECTION', 'extra protection'],
    ['PROT_FROM_SHAPE_CHANGERS', 'protection from shape changers'],
    ['POLYMORPH_CONTROL', 'polymorph control'],
    ['UNCHANGING', 'unchanging'],
    ['REFLECTING', 'reflecting'],
    ['FREE_ACTION', 'free action'],
    ['FIXED_ABIL', 'fixed abilities'],
    ['LIFESAVED', 'life will be saved'],
];

function wiz_intrinsic_timeout(key) {
    if (key === 'SICK')
        return Number(game.u.uprops?.SICK) || 0;
    if (key === 'CONFUSION')
        return game.u.intrinsic?.HConfusion | 0;
    if (key === 'HALLUC')
        return (game.u.intrinsic?.HHallucination | 0) & TIMEOUT;
    if (key === 'BLINDED')
        return (game.u.intrinsic?.HBlinded | 0) & TIMEOUT;
    if (key === 'DEAF')
        return (game.u.intrinsic?.HDeaf | 0) & TIMEOUT;
    if (key === 'GLIB')
        return (game.u.intrinsic?.HGlib | 0) & TIMEOUT;
    if (key === 'SEE_INVIS')
        return (game.u.intrinsic?.HSee_invisible | 0) & TIMEOUT;
    if (key === 'FAST')
        return (game.u.intrinsic?.HFast | 0) & TIMEOUT;
    if (key === 'STUNNED')
        return (game.u.intrinsic?.HStun | 0) & TIMEOUT;
    if (key === 'FUMBLING')
        return (game.u.intrinsic?.HFumbling | 0) & TIMEOUT;
    if (key === 'DETECT_MONSTERS')
        return Number(game.u.uprops?.DETECT_MONSTERS) || 0;
    return Number(game.u.wiz_intrinsic_timeouts?.[key]) || 0;
}

// src/wizcmds.c:949 wiz_intrinsic(). The menu and ordinary timeout updates
// are shared by every property. Hallucination has its source feedback and
// redraw because it changes every warning glyph immediately.
export async function wiz_intrinsic() {
    if (!game.wizard) {
        await pline('Unavailable command.');
        return ECMD_OK;
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    if (boolean_option('cmdassist')) {
        tty_add_menu_str(win,
            '[Precede any selection with a count to increment by other than 30.]');
    }
    for (const prop of WIZ_INTRINSICS) {
        if (!prop) {
            tty_add_menu_str(win, '--');
            continue;
        }
        const [key, name] = prop;
        const oldtimeout = wiz_intrinsic_timeout(key);
        const text = oldtimeout ? `${name.padEnd(27)} [${oldtimeout}]` : name;
        tty_add_menu(win, null, key, 0, 0, ATR_NONE, NO_COLOR, text,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Which intrinsics?');
    const picks = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);

    for (const key of picks) {
        const prop = WIZ_INTRINSICS.find(p => p?.[0] === key);
        if (!prop)
            continue;
        const name = prop[1];
        const oldtimeout = wiz_intrinsic_timeout(key);
        const picked_count = picks.counts?.get(key) ?? -1;
        const amount = picked_count === -1 ? 30 : picked_count;
        if (amount <= 0)
            continue;

        if (key === 'CONFUSION') {
            const { make_confused } = await import('./potion.js');
            await make_confused(Math.min(TIMEOUT, oldtimeout + amount), false);
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'BLINDED') {
            const { make_blinded } = await import('./potion.js');
            await make_blinded(oldtimeout + amount, true);
        } else if (key === 'DEAF') {
            const { make_deaf } = await import('./potion.js');
            await make_deaf(oldtimeout + amount, true);
        } else if (key === 'HALLUC') {
            const { make_hallucinated } = await import('./potion.js');
            await make_hallucinated(oldtimeout + amount, true);
        } else if (key === 'STUNNED') {
            const { make_stunned } = await import('./potion.js');
            await make_stunned(oldtimeout + amount, true);
        } else if (key === 'SICK') {
            const { make_sick } = await import('./potion.js');
            const type = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
            await make_sick(oldtimeout || amount, '#wizintrinsic', true, type);
        } else if (key === 'GLIB') {
            const { make_glib } = await import('./potion.js');
            make_glib(oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline('Timeout for ' + name + ' '
                        + (oldtimeout ? 'increased by' : 'set to') + ' '
                        + amount + '.');
        } else if (key === 'SEE_INVIS') {
            const intr = (game.u.intrinsic ||= {});
            const word = intr.HSee_invisible | 0;
            intr.HSee_invisible = (word & ~TIMEOUT)
                | Math.min(TIMEOUT, oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'FAST') {
            const intr = (game.u.intrinsic ||= {});
            const word = intr.HFast | 0;
            intr.HFast = (word & ~TIMEOUT)
                         | Math.min(TIMEOUT, oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'FUMBLING') {
            const intr = (game.u.intrinsic ||= {});
            const timeout = Math.min(TIMEOUT, oldtimeout + amount);
            intr.HFumbling = ((intr.HFumbling | 0) & ~TIMEOUT) | timeout;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'DETECT_MONSTERS') {
            (game.u.uprops ||= {}).DETECT_MONSTERS = oldtimeout + amount;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else {
            const timeout = oldtimeout + amount;
            const uprops = (game.u.uprops ||= {});
            const bases = (game.u.wiz_intrinsic_base_props ||= {});
            if (!oldtimeout && !Object.hasOwn(bases, key)) {
                bases[key] = {
                    had: Object.hasOwn(uprops, key),
                    value: uprops[key],
                };
            }
            (game.u.wiz_intrinsic_timeouts ||= {})[key] = timeout;
            /* C stores these timers in u.uprops[p].intrinsic, so direct
               property readers must see the timed value immediately. */
            uprops[key] = timeout;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        }
    }
    await docrt();
    return ECMD_OK;
}

// include/global.h:413 MAXULEV
const MAXULEV = 30;

// src/hacklib.c mungspaces() — squeeze internal runs of whitespace to one
// space and drop leading and trailing space.
function mungspaces(bp) {
    return bp.replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
}

// src/wizcmds.c wiz_level_tele() — the ^V command.
export async function wiz_level_tele() {
    if (game.wizard)
        await level_tele();
    else
        await pline('Unavailable command.');   /* unavailcmd */
    return ECMD_OK;
}

// src/wizcmds.c:568 wiz_polyself(); #polyself command - change hero's form
export async function wiz_polyself() {
    await polyself(POLY_CONTROLLED);
    return ECMD_OK;
}
