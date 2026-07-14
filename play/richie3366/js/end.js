// end.js — Hero death / bones feasibility (partial).
// C ref: end.c done_in_by / done / really_done / disclose; bones.c can_make_bones.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth } from './hacklib.js';
import { pline, flush_topl_more } from './display.js';
import { yn_function } from './getline.js';
import { DIED, GENOCIDED, STONING } from './const.js';
import { Monnam } from './do_name.js';

/**
 * C ref: bones.c can_make_bones — whether a bones file may be written.
 * Named omissions: full no_bones_level (special/bot/branch/invocation);
 * portal scan on non-branch; save_dlevel assign. Ordinary dlvl1 reaches
 * the depth rn2 gate.
 */
export function can_make_bones() {
    const flags = game.flags || {};
    // C default bones:On — unset must not short-circuit before rn2.
    if (flags.bones === false) return false;

    const u = game.u || {};
    const uz = u.uz || { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    const ledger = ((dun?.ledger_start | 0) + dlevel) | 0;
    // maxledgerno approximate: sum of dungeon levels when tables exist
    let maxled = 0;
    for (const d of game.dungeons || []) {
        maxled += d?.num_dunlevs | 0;
    }
    if (ledger <= 0 || (maxled > 0 && ledger > maxled)) return false;

    // no_bones_level stub: ordinary DoD dlvl1 is bones-eligible
    if (u.uswallow) return false;

    // Non-branch portal ban deferred (Is_branchlev not fully wired)

    const dep = depth(uz);
    if (dep <= 0
        || (!rn2(1 + (dep >> 2)) && !flags.wizard)) {
        return false;
    }
    // C: discover — explore playmode also skips bones
    if (flags.discover || flags.explore) return false;
    return true;
}

/**
 * C ref: end.c disclose — inventory yn first; other categories deferred.
 * C default end_disclose prompts with defquery 'n' for 'i'.
 */
async function disclose(how, taken) {
    void how;
    const invent = game.invent || [];
    if (invent.length && !(game.program_state?.done_stopprint)) {
        // taken→"see what you had when you died/quit" deferred (paybill path)
        const qbuf = taken
            ? 'Do you want to see what you had when you died?'
            : 'Do you want your possessions identified?';
        const c = await yn_function(qbuf, 'ynq', 'n');
        // display_inventory / container_contents on 'y' deferred
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }
    // attributes / vanquished / genocided / conduct / overview deferred
}

/**
 * C ref: end.c done — Lifesaved / wizard·discover Die? deferred.
 * Ordinary deaths fall through to really_done.
 */
export async function done(how) {
    const flags = game.flags || {};
    // Lifesaved / explore·wizard Die? omitted — seed0030 has neither
    void flags;
    await really_done(how);
}

/**
 * C ref: end.c really_done — set gameover; display_nhwindow(WIN_MESSAGE);
 * disclose when end_disclose != "none"; bones_ok via can_make_bones.
 * Named omissions: object cleanup, paybill, invent discover_object,
 * topten, rip, savebones body, nh_terminate; disclose beyond inventory yn.
 */
async function really_done(how) {
    if (!game.program_state) game.program_state = {};
    game.program_state.gameover = true;

    // C: display_nhwindow(WIN_MESSAGE, FALSE) — wait for "You die..." --More--
    await flush_topl_more();

    const bones_ok = (how < GENOCIDED) && can_make_bones();
    // savebones deferred — bones_ok false on dlvl1 after rn2 gate
    void bones_ok;

    // C: if (strcmp(flags.end_disclose, "none")) disclose(how, taken);
    const endDisclose = game.flags?.end_disclose;
    if (endDisclose !== 'none') {
        await disclose(how, false);
    }
}

/**
 * C ref: end.c done_in_by — "You die..." then done(how).
 * Killer string / ugrave_arise / multi_reason trim deferred beyond a
 * simple monnam for disclosure later.
 */
export async function done_in_by(mtmp, how = DIED) {
    await pline(how === STONING ? 'You turn to stone...' : 'You die...');
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.name = mtmp ? Monnam(mtmp) : '';
    game.killer.format = /* KILLED_BY_AN */ 2;
    await done(how);
}
