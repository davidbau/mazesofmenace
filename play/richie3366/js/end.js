// end.js — Hero death / bones feasibility (partial).
// C ref: end.c done2 / done_in_by / done / really_done / disclose;
//        bones.c can_make_bones / drop_upon_death / savebones.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth } from './hacklib.js';
import { pline, flush_topl_more } from './display.js';
import { yn_function } from './getline.js';
import { show_text_pages } from './pager.js';
import { genl_outrip_lines } from './rip.js';
import { Goodbye } from './roles.js';
import { an } from './objnam.js';
import { COIN_CLASS } from './objects.js';
import {
    DIED, GENOCIDED, STONING, QUIT, NON_PM, CORPSTAT_INIT, CORPSTAT_NONE,
    OBJ_FREE, Upolyd, MM_NONAME, isok, ACCESSIBLE, MAGIC_PORTAL,
    ECMD_OK, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, PANICKED,
    DISCLOSE_YES_WITHOUT_PROMPT, DISCLOSE_NO_WITHOUT_PROMPT,
    DISCLOSE_SPECIAL_WITHOUT_PROMPT, DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL, NUM_DISCLOSURE_OPTIONS,
} from './const.js';
import { G_NOCORPSE, mons } from './monsters.js';
import { oname, christen_monst } from './do_name.js';
import { mkcorpstat, curse, place_object, stackobj } from './mkobj.js';
import { make_grave } from './engrave.js';
import { makemon } from './makemon.js';
import { write_bonesfile } from './bones.js';
import { topten, nh_terminate_capture } from './topten.js';
import { objectNames } from './generated/objects_data.js';
import { monsterNames, pmnames } from './generated/monsters_data.js';

const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

/** C ref: decl.c disclosure_options */
const DISCLOSURE_OPTIONS = 'iavgco';

/** C ref: end.c ends[] — "when you %s" / "You %s in …" */
const ENDS = [
    'died', 'choked', 'were poisoned', 'starved', 'drowned', 'burned',
    'dissolved in the lava', 'were crushed', 'turned to stone',
    'turned into slime', 'were genocided', 'panicked', 'were tricked',
    'quit', 'escaped', 'ascended',
];

/** C ref: topten.c killed_by_prefix[] */
const KILLED_BY_PREFIX = [
    'killed by ', 'choked on ', 'poisoned by ', 'died of ',
    'drowned in ', 'burned by ', 'dissolved in ', 'crushed to death by ',
    'petrified by ', 'turned to slime by ', 'killed by ',
    '', '', '', '', '',
];

function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/** C ref: invent.c money_cnt */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/**
 * C ref: dungeon.c deepest_lev_reached — max depth() over dunlev_ureached.
 * Quest exclusion (noquest) deferred — score path uses FALSE.
 */
function deepest_lev_reached(noquest) {
    let ret = 0;
    const dungeons = game.dungeons || [];
    for (let i = 0; i < dungeons.length; i++) {
        if (noquest && i === (game.quest_dnum | 0)) continue;
        const dlevel = dungeons[i]?.dunlev_ureached | 0;
        if (!dlevel) continue;
        const d = depth({ dnum: i, dlevel });
        if (d > ret) ret = d;
    }
    return ret;
}

/**
 * C ref: end.c should_query_disclose_option.
 * @returns {{ ask: boolean, defquery: string }}
 */
function should_query_disclose_option(category) {
    const idx = DISCLOSURE_OPTIONS.indexOf(category);
    if (idx < 0 || idx >= NUM_DISCLOSURE_OPTIONS) {
        return { ask: true, defquery: DISCLOSE_PROMPT_DEFAULT_YES };
    }
    const ed = String(game.flags?.end_disclose || '');
    const disclose = ed[idx] || DISCLOSE_PROMPT_DEFAULT_NO;
    if (disclose === DISCLOSE_YES_WITHOUT_PROMPT) {
        return { ask: false, defquery: 'y' };
    }
    if (disclose === DISCLOSE_SPECIAL_WITHOUT_PROMPT) {
        return { ask: false, defquery: 'a' };
    }
    if (disclose === DISCLOSE_NO_WITHOUT_PROMPT) {
        return { ask: false, defquery: 'n' };
    }
    if (disclose === DISCLOSE_PROMPT_DEFAULT_YES) {
        return { ask: true, defquery: 'y' };
    }
    if (disclose === DISCLOSE_PROMPT_DEFAULT_SPECIAL) {
        return { ask: true, defquery: 'a' };
    }
    return { ask: true, defquery: 'n' };
}

/**
 * C ref: topten.c formatkiller — prefix + killer.name; helpless deferred.
 * @param {number} how
 * @param {boolean} incl_helpless
 */
export function formatkiller(how, incl_helpless = false) {
    void incl_helpless;
    let buf = '';
    const fmt = game.killer?.format;
    let kname = String(game.killer?.name || '');
    if (fmt === KILLED_BY_AN) {
        kname = an(kname);
        buf += KILLED_BY_PREFIX[how] || '';
    } else if (fmt === KILLED_BY) {
        buf += KILLED_BY_PREFIX[how] || '';
    }
    // NO_KILLER_PREFIX: bare kname
    for (let i = 0; i < kname.length; i++) {
        let c = kname[i];
        if (c === ',') c = ';';
        else if (c === '=') c = '_';
        else if (c === '\t') c = ' ';
        buf += c;
    }
    return buf;
}

/**
 * C ref: end.c done_object_cleanup — place in-flight thrown/kicked missiles
 * onto the map before disclosure/bones so they are not lost from limbo.
 * Named omissions: inven_inuse; uchain/uball placebc; perm_invent clear;
 * closed_door rejection inside accessible (ACCESSIBLE-only approx).
 */
function done_object_cleanup() {
    const u = game.u || {};
    let ox = (u.ux | 0) + (u.dx | 0);
    let oy = (u.uy | 0) + (u.dy | 0);
    const spotOk = (x, y) => {
        if (!isok(x, y)) return false;
        const loc = game.level?.at?.(x, y);
        return !!(loc && ACCESSIBLE(loc.typ));
    };
    if (!spotOk(ox, oy)) {
        ox = u.ux | 0;
        oy = u.uy | 0;
    }
    const thrown = game._thrownobj;
    if (thrown && thrown.where === OBJ_FREE) {
        place_object(thrown, ox, oy);
        stackobj(thrown);
        game._thrownobj = null;
    }
    const kicked = game._kickedobj;
    if (kicked && kicked.where === OBJ_FREE) {
        place_object(kicked, ox, oy);
        stackobj(kicked);
        game._kickedobj = null;
    }
}

/** C ref: dungeon.c on_level — same dnum+dlevel. */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C ref: dungeon.c Is_special — match in sp_levchn. */
function Is_special(lev) {
    for (const s of game.sp_levchn || []) {
        if (on_level(lev, s.dlevel)) return s;
    }
    return null;
}

/** C ref: dungeon.c Is_branchlev — branch end1/end2 match. */
function Is_branchlev(lev) {
    for (const br of game.branches || []) {
        if (on_level(lev, br.end1) || on_level(lev, br.end2)) return br;
    }
    return null;
}

/**
 * C ref: bones.c no_bones_level — special/dungeon boneid, botlevel,
 * multiway branch (dlevel>1), Gehennom invocation level.
 * Named omission: save_dlevel reassignment before the checks.
 */
export function no_bones_level(lev) {
    const sptr = Is_special(lev);
    if (sptr && !sptr.boneid) return true;
    const dun = game.dungeons?.[lev.dnum | 0];
    if (!dun?.boneid) return true;
    if ((lev.dlevel | 0) === (dun.num_dunlevs | 0)) return true; // Is_botlevel
    if (Is_branchlev(lev) && (lev.dlevel | 0) > 1) return true;
    // In_hell invocation: deepest-1
    if (dun.flags?.hellish
        && (lev.dlevel | 0) === ((dun.num_dunlevs | 0) - 1)) {
        return true;
    }
    return false;
}

/**
 * C ref: bones.c can_make_bones — whether a bones file may be written.
 * Named omissions: save_dlevel assign inside no_bones_level.
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

    // C: no_bones_level before swallow / portal / depth rn2
    if (no_bones_level(uz)) return false;

    if (u.uswallow) return false;

    // C: non-branch levels with a MAGIC_PORTAL never leave bones
    if (!Is_branchlev(uz)) {
        for (let t = game.ftrap; t; t = t.ntrap) {
            if ((t.ttyp | 0) === MAGIC_PORTAL) return false;
        }
    }

    const dep = depth(uz);
    if (dep <= 0
        || (!rn2(1 + (dep >> 2)) && !flags.wizard)) {
        return false;
    }
    if (flags.discover || flags.explore) return false;
    return true;
}

/**
 * C ref: end.c disclose — inventory yn first when should_query; other
 * categories deferred. Honor flags.end_disclose `-i` etc. (D-0288).
 */
async function disclose(how, taken) {
    void how;
    const invent = game.invent || [];
    if (invent.length && !(game.program_state?.done_stopprint)) {
        const qbuf = taken
            ? 'Do you want to see what you had when you died?'
            : 'Do you want your possessions identified?';
        const { ask, defquery } = should_query_disclose_option('i');
        const c = ask
            ? await yn_function(qbuf, 'ynq', defquery)
            : defquery;
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
        // 'y' → display_inventory deferred
    }
}

/**
 * C ref: end.c really_done death summary + rip — NHW_TEXT via
 * display_nhwindow; wintty process_text_window paginates at rows-1.
 * Named omissions: paybill; discover_object invent walk; arise pline;
 * quit/escape/ascend score arms; In_endgame/quest depth text.
 */
async function show_death_rip_and_summary(how, umoney) {
    const flags = game.flags || {};
    const done_stopprint = game.program_state?.done_stopprint | 0;
    if (done_stopprint && !flags.tombstone) return;

    const lines = [];
    // C genl_outrip: leading blank then stone then two blanks
    if (how < GENOCIDED && flags.tombstone !== false) {
        lines.push('');
        lines.push(...genl_outrip_lines(formatkiller(how, false)));
        lines.push('');
        lines.push('');
    }

    const u = game.u || {};
    const plname = game.plname || 'Player';
    const roleName = (flags.female && game.urole?.name?.f)
        ? game.urole.name.f
        : (game.urole?.name?.m || 'Adventurer');
    lines.push(`${Goodbye()} ${plname} the ${roleName}...`);
    lines.push('');

    const where = game.dungeons?.[u.uz?.dnum | 0]?.dname || 'The Dungeons of Doom';
    const dlev = depth(u.uz);
    const pts = u.urexp | 0;
    lines.push(
        `You ${ENDS[how] || 'died'} in ${where} on dungeon level ${dlev} with ${pts} point${plur(pts)},`,
    );
    lines.push(
        `and ${umoney} piece${plur(umoney)} of gold, after ${game.moves | 0} move${plur(game.moves | 0)}.`,
    );
    lines.push(
        `You were level ${u.ulevel | 0} with a maximum of ${u.uhpmax | 0} hit point${plur(u.uhpmax | 0)} when you ${ENDS[how] || 'died'}.`,
    );
    // C: dump_forward_putstr(endwin, 0, "", done_stopprint) before
    // display_nhwindow — 24th line forces process_text_window page-break
    // + blank final --More-- (rows-1 == 23).
    lines.push('');

    await show_text_pages(lines, { moreAtEnd: true });
}

/**
 * C ref: end.c really_done — gameover; disclose; score; bones; rip; topten.
 * Named omissions: paybill/clearpriests; invent discover_object;
 * Schroedinger; dump/livelog; logfile/xlogfile; toptenwin NHW_TEXT;
 * disclose beyond inventory yn; arise pline; wizard bones query;
 * inven_inuse / ball-chain arms of done_object_cleanup.
 */
async function really_done(how) {
    if (!game.program_state) game.program_state = {};
    game.program_state.gameover = true;

    // C: done_object_cleanup before bones/disclosure — limbo missiles → map
    if (!game.program_state.panicking) done_object_cleanup();

    // C: bones_ok = can_make_bones() before display_nhwindow(WIN_MESSAGE)
    const bones_ok = (how < GENOCIDED) && can_make_bones();

    await flush_topl_more();

    // C: strcmp(flags.end_disclose, "none") — array never equals "none"
    // after optfn_disclose; always call disclose (modes inside may no-ask).
    const endDisclose = game.flags?.end_disclose;
    if (endDisclose !== 'none') {
        await disclose(how, false);
    }

    // C: score before bones (invent still held)
    const u = game.u || {};
    let umoney = money_cnt(game.invent);
    // hidden_gold deferred
    let tmp = umoney - (u.umoney0 | 0);
    if (tmp < 0) tmp = 0;
    if (how < PANICKED) tmp -= (tmp / 10) | 0;
    const deepest = deepest_lev_reached(false);
    tmp += 50 * (deepest - 1);
    if (deepest > 20) tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
    u.urexp = (u.urexp | 0) + tmp;
    game._done_money = umoney;

    let corpse = null;
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

    // C: outrip + goodbye into NHW_TEXT then display_nhwindow(TRUE)
    await show_death_rip_and_summary(how, umoney);

    // C: !toptenwin → exit_nhwindows then topten raw_print; nh_terminate
    // captures final screen (contest nomux input boundary, no nhgetch).
    topten(how, 0, formatkiller(how, true));
    nh_terminate_capture();
}

/**
 * C ref: end.c done_in_by — "You die..." then done(how).
 * Ordinary monsters: pmname + KILLED_BY_AN (uniq/priest/hallu deferred).
 */
export async function done_in_by(mtmp, how = DIED) {
    await pline(how === STONING ? 'You turn to stone...' : 'You die...');
    if (!game.killer) game.killer = { name: '', format: 0 };
    const mnum = mtmp?.mnum;
    const names = (mnum != null) ? pmnames[mnum] : null;
    game.killer.name = names
        ? (names[2] || names[0] || names[1] || 'creature')
        : '';
    game.killer.format = KILLED_BY_AN;
    await done(how);
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
 * C ref: bones.c savebones — ghost envelope + VFS bones file (D-0274).
 * Branch: ordinary `ugrave_arise` NON_PM → drop_upon_death + PM_GHOST
 * MM_NONAME. Skips write when bones file already exists (open_bonesfile hit).
 * Named omissions: file replace/compress; unleash_all/unpunish/dismount;
 * remove_mon_from_bones/dmonsfree/forget_engravings; fruit fid;
 * set_ghostly_objlist/resetobjs(FALSE); map memory clear; cemetery;
 * arise/statue arms; ebones; m_dowear; obj_attach_mid; binary savelev.
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
    // C: create_bonesfile + savelev after ghost envelope
    write_bonesfile(u.uz);
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
 * C ref: end.c done2 — `#quit` (GENERALCMD, ECMD_OK; no turn).
 * Named omissions: In_tutorial abandon / schedule_goto; ParanoidQuit
 * getlin "yes" (uses yn when !ParanoidQuit, matching default bits);
 * wizard Dump-core ynq.
 */
export async function done2() {
    // C: paranoid_query(ParanoidQuit, …). Default paranoia_bits omit
    // PARANOID_QUIT → yn_function. getlin "yes" when set is deferred.
    const ok = (await yn_function(
        'Really quit without saving?', 'yn', 'n',
    )) === 'y';
    if (!ok) return ECMD_OK;
    await done(QUIT);
    return ECMD_OK;
}

/**
 * C ref: end.c done — Lifesaved / wizard·discover Die? deferred.
 * Ordinary deaths fall through to really_done.
 */
export async function done(how) {
    const flags = game.flags || {};
    void flags;
    const u = game.u || {};
    // C: umortality++ when how < PANICKED (before really_done)
    if (how < PANICKED) {
        u.umortality = (u.umortality | 0) + 1;
        if ((u.uhp | 0) !== 0 || (Upolyd(u) && (u.mh | 0) !== 0)) {
            u.uhp = 0;
            if (Upolyd(u)) u.mh = 0;
        }
    }
    await really_done(how);
}
