// wizcmds.js — Wizard-mode extended commands (partial).
// C ref: wizcmds.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { getlin } from './getline.js';
import { pluslvl } from './exper.js';
import { makewish } from './zap.js';
import { create_particular } from './read.js';
import { level_tele } from './teleport.js';
import { ECMD_OK, MAXULEV } from './const.js';

/**
 * C ref: wizcmds.c wiz_level_change — #levelchange
 * Level-drain (losexp) path deferred; raise via pluslvl(FALSE) only.
 */
export async function wiz_level_change() {
    const u = game.u || (game.u = {});
    const buf = await getlin('To what experience level do you want to be set?');
    if (!buf || buf === '\x1b') return;

    const trimmed = buf.trim();
    if (!trimmed) return;

    // C: sscanf("%d%c") must consume the whole string as one int
    if (!/^-?\d+$/.test(trimmed)) {
        await pline('Never mind.');
        return;
    }
    let newlevel = parseInt(trimmed, 10);
    if (!Number.isFinite(newlevel)) {
        await pline('Never mind.');
        return;
    }

    if (newlevel === (u.ulevel | 0)) {
        await pline('You are already that experienced.');
    } else if (newlevel < (u.ulevel | 0)) {
        // C: losexp("#levelchange") loop — deferred (tours only raise)
        if ((u.ulevel | 0) === 1) {
            await pline('You are already as inexperienced as you can get.');
            return;
        }
        // Drain path omitted; see C-JS-MAP.
        return;
    } else {
        if ((u.ulevel | 0) >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return;
        }
        if (newlevel > MAXULEV) newlevel = MAXULEV;
        while ((u.ulevel | 0) < newlevel) {
            await pluslvl(false);
        }
    }
    u.ulevelmax = u.ulevel;
}

/**
 * C ref: wizcmds.c wiz_wish — #wizwish / ^W
 */
export async function wiz_wish() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return;
    }
    const save_verbose = game.flags.verbose;
    game.flags.verbose = false;
    await makewish();
    game.flags.verbose = save_verbose;
    // encumber_msg deferred
}

/**
 * C ref: wizcmds.c wiz_genesis — #wizgenesis / ^G
 * Envelope: create_particular named-monster path (MM_NOEXCLAM).
 * Named omissions: debug_mongen toggle; count-prefix quan beyond multi;
 * class-letter / * random arms inside create_particular.
 */
export async function wiz_genesis() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    // C: iflags.debug_mongen = FALSE around create_particular
    const saved = game.iflags?.debug_mongen;
    if (game.iflags) game.iflags.debug_mongen = false;
    await create_particular();
    if (game.iflags) game.iflags.debug_mongen = saved;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_level_tele — #wizlevelport / ^V
 * Envelope: wizard → level_tele(); else unavailcmd pline.
 */
export async function wiz_level_tele() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    await level_tele();
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_map — #wizmap / ^F
 * Reveal traps + engravings then do_mapping (exercise A_WIS). ECMD_OK.
 * Named omissions: notice_mon_off/on; full engraving_to_glyph; unavailcmd
 * ecname_from_fn wording (generic "You can't do that.").
 */
export async function wiz_map() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    const { map_trap, map_engraving } = await import('./display.js');
    const { do_mapping } = await import('./detect.js');
    const u = game.u || (game.u = {});
    // C: notice_mon_off(); save/clear HConfusion + HHallucination
    const save_Hconf = u.HConfusion | 0;
    const save_Hhallu = u.HHallucination | 0;
    const save_Confusion = u.Confusion;
    const save_Hallucination = u.Hallucination;
    u.HConfusion = 0;
    u.HHallucination = 0;
    u.Confusion = 0;
    u.Hallucination = 0;

    // C: for (t = gf.ftrap; t; t = t->ntrap) — JS stores traps on
    // level.traps (maketrap); ftrap linked list is often empty (D-0814).
    const ftrap = game.ftrap;
    const trapList = [];
    if (Array.isArray(game.level?.traps)) {
        trapList.push(...game.level.traps);
    } else if (Array.isArray(ftrap)) {
        trapList.push(...ftrap);
    } else {
        for (let t = ftrap; t; t = t.ntrap) trapList.push(t);
    }
    for (const t of trapList) {
        if (!t) continue;
        t.tseen = 1;
        map_trap(t, true);
    }
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        map_engraving(ep, true);
    }
    do_mapping();
    // C: notice_mon_on(); restore conf/hallu
    u.HConfusion = save_Hconf;
    u.HHallucination = save_Hhallu;
    u.Confusion = save_Confusion;
    u.Hallucination = save_Hallucination;
    return ECMD_OK;
}

/**
 * C ref: wizcmds.c wiz_polyself — #polyself
 */
export async function wiz_polyself() {
    const { wiz_polyself: run } = await import('./polyself.js');
    return run();
}
