// end.js — Hero death / bones feasibility (partial).
// C ref: end.c done_in_by / done / really_done / disclose;
//        bones.c can_make_bones / drop_upon_death / savebones.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth } from './hacklib.js';
import { pline, flush_topl_more } from './display.js';
import { yn_function } from './getline.js';
import {
    DIED, GENOCIDED, STONING, NON_PM, CORPSTAT_INIT, CORPSTAT_NONE,
    OBJ_FREE, Upolyd, MM_NONAME,
} from './const.js';
import { G_NOCORPSE, mons } from './monsters.js';
import { Monnam, oname, christen_monst } from './do_name.js';
import { mkcorpstat, curse, place_object, stackobj } from './mkobj.js';
import { make_grave } from './engrave.js';
import { makemon } from './makemon.js';
import { objectNames } from './generated/objects_data.js';
import { monsterNames } from './generated/monsters_data.js';

const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

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
    let maxled = 0;
    for (const d of game.dungeons || []) {
        maxled += d?.num_dunlevs | 0;
    }
    if (ledger <= 0 || (maxled > 0 && ledger > maxled)) return false;

    if (u.uswallow) return false;

    const dep = depth(uz);
    if (dep <= 0
        || (!rn2(1 + (dep >> 2)) && !flags.wizard)) {
        return false;
    }
    if (flags.discover || flags.explore) return false;
    return true;
}

/**
 * C ref: end.c disclose — inventory yn first; other categories deferred.
 */
async function disclose(how, taken) {
    void how;
    const invent = game.invent || [];
    if (invent.length && !(game.program_state?.done_stopprint)) {
        const qbuf = taken
            ? 'Do you want to see what you had when you died?'
            : 'Do you want your possessions identified?';
        const c = await yn_function(qbuf, 'ynq', 'n');
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }
}

/**
 * C ref: mkobj.c mk_named_object — CORPSE/STATUE with optional oname.
 */
function mk_named_object(objtype, ptr, x, y, nm) {
    const flags = objtype !== STATUE ? CORPSTAT_INIT : CORPSTAT_NONE;
    let otmp = mkcorpstat(objtype, null, ptr, x, y, flags);
    if (nm && otmp) otmp = oname(otmp, nm, 0);
    return otmp;
}

/**
 * C ref: bones.c drop_upon_death — curse invent; place (or nearby gate).
 * Named omissions: artifact_light/end_burn; slime mold goodfruit;
 * add_to_minv / statue container; give_to_nearby_mon body (still places).
 */
function drop_upon_death(mtmp, cont, x, y) {
    const u = game.u || {};
    u.twoweap = false;
    if (!game.invent) game.invent = [];
    while (game.invent.length) {
        const otmp = game.invent.shift();
        otmp.owornmask = 0;
        otmp.where = OBJ_FREE;
        otmp.nobj = null;

        if (rn2(5)) curse(otmp);
        if (mtmp || cont) {
            place_object(otmp, x, y);
            stackobj(otmp);
        } else if (!rn2(8)) {
            // give_to_nearby_mon deferred — place keeps RNG arity
            place_object(otmp, x, y);
            stackobj(otmp);
        } else {
            place_object(otmp, x, y);
            stackobj(otmp);
        }
    }
}

/**
 * C ref: bones.c savebones — in-memory ghost envelope (no bones file I/O).
 * Branch: ordinary `ugrave_arise` NON_PM → drop_upon_death + PM_GHOST
 * MM_NONAME. Assumes no pre-existing bones file (open_bonesfile miss).
 * Named omissions: file replace/compress; unleash_all/unpunish/dismount;
 * remove_mon_from_bones/dmonsfree/forget_engravings; fruit fid;
 * set_ghostly_objlist; arise/statue arms; ebones; write; m_dowear;
 * obj_attach_mid.
 */
function savebones(how, corpse) {
    void how;
    const u = game.u || {};
    const arise = u.ugrave_arise;
    if (arise != null && arise !== NON_PM && arise >= 0) {
        drop_upon_death(null, null, u.ux, u.uy);
        return;
    }
    drop_upon_death(null, null, u.ux, u.uy);
    const prev = game.in_mklev;
    game.in_mklev = true;
    let mtmp = makemon(mons(PM_GHOST), u.ux | 0, u.uy | 0, MM_NONAME);
    game.in_mklev = prev;
    if (!mtmp) return;
    mtmp = christen_monst(mtmp, game.plname || 'ghost');
    mtmp.m_lev = (u.ulevel | 0) || 1;
    mtmp.mhp = mtmp.mhpmax = u.uhpmax | 0;
    mtmp.female = game.flags?.female ? 1 : 0;
    mtmp.msleeping = 1;
    void corpse;
}

/**
 * C ref: hack.c losehp fatal → urgent_pline + done(DIED).
 * Call after losehp when `_losehp_needs_done` is set (C noreturn).
 */
export async function finish_losehp_done() {
    if (!game._losehp_needs_done) return;
    game._losehp_needs_done = false;
    await pline('You die...');
    await done(DIED);
}

/**
 * C ref: end.c done — Lifesaved / wizard·discover Die? deferred.
 * Ordinary deaths fall through to really_done.
 */
export async function done(how) {
    const flags = game.flags || {};
    void flags;
    await really_done(how);
}

/**
 * C ref: end.c really_done — gameover; disclose; bones corpse + savebones.
 * Named omissions: paybill/clearpriests; invent discover_object;
 * Schroedinger; dump/livelog; score; topten/rip; nh_terminate;
 * disclose beyond inventory yn; arise pline; wizard bones query.
 */
async function really_done(how) {
    if (!game.program_state) game.program_state = {};
    game.program_state.gameover = true;

    // C: bones_ok = can_make_bones() before display_nhwindow(WIN_MESSAGE)
    const bones_ok = (how < GENOCIDED) && can_make_bones();

    await flush_topl_more();

    const endDisclose = game.flags?.end_disclose;
    if (endDisclose !== 'none') {
        await disclose(how, false);
    }

    let corpse = null;
    const u = game.u || {};
    const arise = u.ugrave_arise;
    const ariseUnset = arise == null || arise === NON_PM;
    const umon = Upolyd(u) ? (u.umonnum | 0) : (game.urace?.mnum | 0);
    const noCorpse = !!((game.mvitals?.[umon]?.mvflags | 0) & G_NOCORPSE);
    if (bones_ok && ariseUnset && !noCorpse) {
        const mnum = Upolyd(u) ? (u.umonnum | 0) : (game.urace?.mnum | 0);
        const plname = game.plname || 'Player';
        corpse = mk_named_object(CORPSE, mons(mnum), u.ux | 0, u.uy | 0, plname);
        // formatkiller body deferred — fixed epitaph text (no RNG)
        make_grave(u.ux | 0, u.uy | 0, `${plname}, killed`);
    }

    if (bones_ok) {
        savebones(how, corpse);
    }
}

/**
 * C ref: end.c done_in_by — "You die..." then done(how).
 */
export async function done_in_by(mtmp, how = DIED) {
    await pline(how === STONING ? 'You turn to stone...' : 'You die...');
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.name = mtmp ? Monnam(mtmp) : '';
    game.killer.format = /* KILLED_BY_AN */ 2;
    await done(how);
}
