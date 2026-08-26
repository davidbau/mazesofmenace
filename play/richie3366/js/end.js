// end.js — Hero death / bones feasibility (partial).
// C ref: end.c done2 / done_in_by / done / really_done / disclose;
//        bones.c can_make_bones / drop_upon_death / savebones.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth } from './hacklib.js';
import {
    pline, flush_topl_more, bot, You_feel, clear_nhwindow_message,
} from './display.js';
import { yn_function, paranoid_query } from './getline.js';
import { show_text_pages, show_nhw_menu_text } from './pager.js';
import { genl_outrip_lines } from './rip.js';
import { Goodbye } from './roles.js';
import { an, doname, xname, the as theArt } from './objnam.js';
import { COIN_CLASS } from './objects.js';
import {
    DIED, GENOCIDED, STONING, QUIT, ESCAPED, ASCENDED, STARVING, BURNING,
    CHOKING, NON_PM, CORPSTAT_INIT, CORPSTAT_NONE,
    OBJ_FREE, Upolyd, MM_NONAME, isok, ACCESSIBLE, MAGIC_PORTAL,
    ECMD_OK, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, PANICKED,
    DISCLOSE_YES_WITHOUT_PROMPT, DISCLOSE_NO_WITHOUT_PROMPT,
    DISCLOSE_SPECIAL_WITHOUT_PROMPT, DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL, NUM_DISCLOSURE_OPTIONS,
    BASICENLIGHTENMENT, MAGICENLIGHTENMENT,
    ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD,
    Is_container, SORTLOOT_LOOT, SORTLOOT_PACK,
    PARANOID_DIE, PARANOID_BONES, PARANOID_QUIT, TT_LAVA, Has_contents,
    LIFESAVED, W_AMUL,
} from './const.js';
import { G_NOCORPSE, mons } from './monsters.js';
import { oname, christen_monst } from './do_name.js';
import { mkcorpstat, curse, place_object, stackobj } from './mkobj.js';
import { make_grave } from './engrave.js';
import { makemon } from './makemon.js';
import {
    write_bonesfile, bones_file_exists, delete_bonesfile,
    goodfruit, savebones_negate_fruit_ids,
} from './bones.js';
import { genders, aligns } from './roles.js';
import { topten, nh_terminate_capture, raw_print_blanks } from './topten.js';
import { objectNames } from './generated/objects_data.js';
import { monsterNames, pmnames, PM_TOURIST } from './generated/monsters_data.js';
import { paybill, money2mon } from './shk.js';
import { shkname, shkname_is_pname } from './shknam.js';
import {
    enlightenment, display_inventory, discover_object, makeknown, sortloot,
} from './invent.js';
import {
    list_vanquished, list_genocided, show_conduct,
} from './insight.js';
import { show_overview } from './dungeon.js';
import { A_CON, acurr, adjattrib } from './attrib.js';
import { init_uhunger } from './eat.js';
import { setworn } from './do_wear.js';

const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const TIN = objectNames.indexOf('TIN');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

/** C ref: youprop.h Lifesaved — uprops[LIFESAVED].extrinsic. */
function Lifesaved(u = game.u || {}) {
    return !!((u.uprops?.[LIFESAVED]?.extrinsic | 0));
}

/** C ref: youprop.h Blind — H||E && !B (flat Blind/ublind mirrors). */
function Blind(u = game.u || {}) {
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: invent.c useup / useupall for worn amulet — setnotworn + freeinv.
 * Named omissions: update_inventory; obfree contents; shop unpaid.
 */
function useup_amulet(obj) {
    if (!obj) return;
    const u = game.u || {};
    if (u.uamul === obj) setworn(null, W_AMUL);
    else if ((obj.owornmask | 0) & W_AMUL) {
        obj.owornmask = (obj.owornmask | 0) & ~W_AMUL;
    }
    if ((obj.quan || 1) > 1) {
        obj.quan--;
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.quan = 0;
    obj.where = OBJ_FREE;
}

/** C ref: decl.c disclosure_options */
const DISCLOSURE_OPTIONS = 'iavgco';

/** C ref: end.c deaths[] — killer.name when empty / how >= PANICKED */
const DEATHS = [
    'died', 'choked', 'poisoned', 'starvation', 'drowning', 'burning',
    'dissolving under the heat and pressure', 'crushed', 'turned to stone',
    'turned into slime', 'genocided', 'panic', 'trickery', 'quit',
    'escaped', 'ascended',
];

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
 * C ref: shk.c contained_gold — recurse cobj for COIN_CLASS.
 * @param {object} obj container
 * @param {boolean} even_if_unknown
 */
function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) value += otmp.quan | 0;
        else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}

/**
 * C ref: vault.c hidden_gold — invent containers' gold.
 * @param {boolean} even_if_unknown
 */
function hidden_gold(even_if_unknown) {
    let value = 0;
    for (const obj of game.invent || []) {
        if (Has_contents(obj) && (obj.cknown || even_if_unknown)) {
            value += contained_gold(obj, even_if_unknown);
        }
    }
    return value;
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
    // C: wizard global — JS playmode:debug sets flags.debug (not .wizard)
    const wizard = !!(flags.wizard || flags.debug);
    if (dep <= 0
        || (!rn2(1 + (dep >> 2)) && !wizard)) {
        return false;
    }
    if (flags.discover || flags.explore) return false;
    return true;
}

/**
 * C ref: invent.c set_cknown_lknown — containers/statue/tin flags.
 */
function set_cknown_lknown(obj) {
    if (!obj) return;
    if (Is_container(obj) || obj.otyp === STATUE) {
        obj.cknown = obj.lknown = 1;
    } else if (obj.otyp === TIN) {
        obj.cknown = 1;
    }
}

/**
 * C ref: end.c really_done invent walk before disclose — ID everything
 * for inventory disclosure / dumplog. Named omissions: SchroedingersBox
 * observe_quantum_cat / Schroedingers_cat.
 */
function identify_invent_for_disclose() {
    const invent = game.invent || [];
    for (const obj of invent) {
        if (!obj) continue;
        discover_object(obj.otyp, true, true, false);
        obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
        set_cknown_lknown(obj);
        // SchroedingersBox deferred
    }
}

/**
 * C ref: end.c container_contents — walk invent/container list after
 * disclose invent 'y'. Named omissions: SchroedingersBox live-cat line;
 * nested identify polish beyond discover_object; update_inventory.
 * @param {object[]|object|null} list invent array or cobj chain head
 * @param {boolean} identified
 * @param {boolean} all_containers
 * @param {boolean} reportempty
 */
async function container_contents(list, identified, all_containers, reportempty) {
    const boxes = Array.isArray(list)
        ? list
        : (() => {
            const out = [];
            for (let box = list; box; box = box.nobj) out.push(box);
            return out;
        })();

    for (const box of boxes) {
        if (!box) continue;
        if (!(Is_container(box) || box.otyp === STATUE)) {
            if (!all_containers) break;
            continue;
        }
        if (!box.cknown || (identified && !box.lknown)) {
            box.cknown = 1;
            if (identified) box.lknown = 1;
            // update_inventory deferred
        }
        if (box.otyp === BAG_OF_TRICKS) {
            if (!all_containers) break;
            continue;
        }
        if (box.cobj) {
            const lines = [`Contents of ${theArt(xname(box))}:`, ''];
            const flags = game.flags || {};
            const sortlootOpt = flags.sortloot ?? 'l';
            let sortflags = 0;
            if (sortlootOpt === 'l' || sortlootOpt === 'f') {
                sortflags |= SORTLOOT_LOOT;
            }
            if (flags.sortpack !== false) sortflags |= SORTLOOT_PACK;
            const sorted = sortloot(box.cobj, sortflags, false);
            for (const srtc of sorted) {
                const obj = srtc.obj;
                if (identified && obj) {
                    discover_object(obj.otyp, true, true, false);
                    obj.dknown = 1;
                    obj.known = obj.bknown = obj.rknown = 1;
                    if (Is_container(obj) || obj.otyp === STATUE) {
                        obj.cknown = obj.lknown = 1;
                    }
                }
                lines.push(`  ${doname(obj)}`);
            }
            await show_nhw_menu_text(lines);
            if (all_containers) {
                await container_contents(box.cobj, identified, true, reportempty);
            }
        } else if (reportempty) {
            // C: pline("%s is empty.", …) — rarely used on disclose (FALSE)
            await pline(`${theArt(xname(box))} is empty.`);
        }
        if (!all_containers) break;
    }
}

/**
 * C ref: end.c disclose — invent, attributes, vanquished, genocided,
 * conduct, overview (each gated by should_query / done_stopprint).
 * Named omissions: vanquished ask yn body when ntypes>0
 * (list_vanquished still skips empty); force_invmenu clear is no-op.
 */
async function disclose(how, taken) {
    const stop = () => !!(game.program_state?.done_stopprint);

    const invent = game.invent || [];
    if (invent.length && !stop()) {
        const qbuf = taken
            ? 'Do you want to see what you had when you died?'
            : 'Do you want your possessions identified?';
        const { ask, defquery } = should_query_disclose_option('i');
        const c = ask
            ? await yn_function(qbuf, 'ynq', defquery)
            : defquery;
        if (c === 'y') {
            // C: iflags.force_invmenu = FALSE; display_inventory(NULL, TRUE)
            if (game.iflags) game.iflags.force_invmenu = false;
            await display_inventory();
            await container_contents(invent, true, true, false);
        }
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    if (!stop()) {
        const { ask, defquery } = should_query_disclose_option('a');
        const c = ask
            ? await yn_function(
                'Do you want to see your attributes?',
                'ynq',
                defquery,
            )
            : defquery;
        if (c === 'y') {
            const final = (how >= PANICKED)
                ? ENL_GAMEOVERALIVE
                : ENL_GAMEOVERDEAD;
            await enlightenment(
                BASICENLIGHTENMENT | MAGICENLIGHTENMENT,
                final,
            );
        }
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    if (!stop()) {
        const { ask, defquery } = should_query_disclose_option('v');
        await list_vanquished(defquery, ask);
    }

    if (!stop()) {
        const { ask, defquery } = should_query_disclose_option('g');
        await list_genocided(defquery, ask);
    }

    if (!stop()) {
        const { ask, defquery } = should_query_disclose_option('c');
        // count_achievements deferred — always "conduct" not "and achievements"
        const c = ask
            ? await yn_function(
                'Do you want to see your conduct?',
                'ynq',
                defquery,
            )
            : defquery;
        if (c === 'y') {
            await show_conduct(
                (how >= PANICKED) ? ENL_GAMEOVERALIVE : ENL_GAMEOVERDEAD,
            );
        }
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    if (!stop()) {
        const { ask, defquery } = should_query_disclose_option('o');
        const c = ask
            ? await yn_function(
                'Do you want to see the dungeon overview?',
                'ynq',
                defquery,
            )
            : defquery;
        if (c === 'y') {
            await show_overview(
                (how >= PANICKED) ? 1 : 2,
                how,
            );
        }
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
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
    // C: dump_forward_putstr(..., done_stopprint) + display_nhwindow
    // skipped when stopprint — visible output suppressed even if tombstone.
    if (done_stopprint) return;

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
 * C ref: end.c really_done — gameover; paybill; disclose; score; bones; rip; topten.
 * Named omissions: clearpriests/paygd; SchroedingersBox; dump/livelog;
 * logfile/xlogfile; toptenwin NHW_TEXT; arise pline;
 * inven_inuse / ball-chain arms of done_object_cleanup; unleash_all
 * in finish_paybill; launch_in_progress abort; ParanoidBones getlin.
 */
async function really_done(how) {
    if (!game.program_state) game.program_state = {};
    game.program_state.gameover = true;

    // C: done_object_cleanup before bones/disclosure — limbo missiles → map
    if (!game.program_state.panicking) done_object_cleanup();

    // C: bones_ok = can_make_bones() before display_nhwindow(WIN_MESSAGE)
    const bones_ok = (how < GENOCIDED) && can_make_bones();

    const u = game.u || {};
    // C end.c really_done: QUIT → NO_KILLER_PREFIX; low HP → Charon's boat
    if (how === QUIT) {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = NO_KILLER_PREFIX;
        if ((u.uhp | 0) < 1) {
            how = DIED;
            u.umortality = (u.umortality | 0) + 1;
            game.killer.name = "quit while already on Charon's boat";
        }
    }
    if (how === ESCAPED || how === PANICKED) {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = NO_KILLER_PREFIX;
    }

    // C: paybill before display_nhwindow — may append to pending "You die..."
    let taken = false;
    if (how !== PANICKED) {
        const silently = !!(game.program_state.done_stopprint);
        // croaked: -1 escaped; 0 quit; 1 died (how != QUIT)
        const croaked = how === ESCAPED ? -1 : (how !== QUIT ? 1 : 0);
        taken = await paybill(croaked, silently);
        // paygd / clearpriests deferred
    }

    await flush_topl_more();

    // C: invent discover_object walk before disclose (and dumplog)
    if (how !== PANICKED) {
        // C: collect at_night/at_midnight before disclosure prompts
        const { night, midnight } = await import('./calendar.js');
        if (!game.iflags) game.iflags = {};
        game.iflags.at_night = night() ? 1 : 0;
        game.iflags.at_midnight = midnight() ? 1 : 0;
        identify_invent_for_disclose();
    }

    // C: strcmp(flags.end_disclose, "none") — array never equals "none"
    // after optfn_disclose; always call disclose (modes inside may no-ask).
    const endDisclose = game.flags?.end_disclose;
    if (how !== PANICKED && endDisclose !== 'none') {
        await disclose(how, taken);
    }

    // C: score before bones (invent still held; gold may already be money2mon'd)
    let umoney = money_cnt(game.invent);
    // C: umoney += hidden_gold(TRUE)
    umoney += hidden_gold(true);
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

    // C: finish_paybill after disclosure, before bones
    if (bones_ok && taken) finish_paybill();

    if (bones_ok) {
        // C: if (!wizard || paranoid_query(ParanoidBones, "Save bones?"))
        const flags = game.flags || {};
        const wizard = !!(flags.wizard || flags.debug);
        const paranoidBones = ((flags.paranoia_bits | 0) & PARANOID_BONES) !== 0;
        if (!wizard || (await paranoid_query(paranoidBones, 'Save bones?'))) {
            await savebones(how, corpse);
        }
    }

    // C: outrip + goodbye into NHW_TEXT then display_nhwindow(TRUE)
    await show_death_rip_and_summary(how, umoney);

    // C: !toptenwin → exit_nhwindows then topten raw_print; nh_terminate
    // captures final screen (contest nomux input boundary, no nhgetch).
    topten(how, 0, formatkiller(how, true));
    // C: if (done_stopprint) { raw_print(""); raw_print(""); }
    if (game.program_state?.done_stopprint) {
        raw_print_blanks(2);
    }
    nh_terminate_capture();
}

/**
 * C ref: shk.c finish_paybill — drop invent at repo loc (no messages).
 * Named omissions: unleash_all; impossible off-map arm.
 */
function finish_paybill() {
    const repo = game.repo || {};
    const shkp = repo.shopkeeper || null;
    let ox = repo.location?.x | 0;
    let oy = repo.location?.y | 0;
    const u = game.u || {};
    if (!isok(ox, oy)) {
        ox = u.ux ? u.ux : (u.ux0 | 0);
        oy = u.ux ? u.uy : (u.uy0 | 0);
    }
    // unleash_all deferred
    if (shkp) {
        const umoney = money_cnt(game.invent);
        if (umoney) money2mon(shkp, umoney);
    }
    drop_upon_death(null, null, ox, oy);
}

/**
 * C ref: end.c done_in_by — "You die..." then done(how).
 * Ported: isshk → honorific + shkname + ", the shopkeeper" + KILLED_BY
 * (D-0313). Named omissions: G_UNIQ / ghost / mimicker / vampshifter /
 * priest|minion m_monnam / minvis / hallu-distort / monhealthdescr /
 * multi_reason trim.
 */
export async function done_in_by(mtmp, how = DIED) {
    await pline(how === STONING ? 'You turn to stone...' : 'You die...');
    if (!game.killer) game.killer = { name: '', format: 0 };
    // C: svk.killer.format = KILLED_BY_AN; then branch may override
    game.killer.format = KILLED_BY_AN;
    let buf = '';
    if (mtmp?.isshk) {
        // C end.c: isshk → "%s%s, the shopkeeper" + KILLED_BY
        const shknm = shkname(mtmp);
        const honorific = shkname_is_pname(mtmp)
            ? ''
            : (mtmp.female ? 'Ms. ' : 'Mr. ');
        buf = `${honorific}${shknm}, the shopkeeper`;
        game.killer.format = KILLED_BY;
    } else {
        const mnum = mtmp?.mnum;
        const names = (mnum != null) ? pmnames[mnum] : null;
        buf = names
            ? (names[2] || names[0] || names[1] || 'creature')
            : '';
    }
    game.killer.name = buf;
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
 * Named omissions: artifact_light/end_burn;
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

        // C `:287–288` after owornmask=0, before rn2(5) curse
        if ((otmp.otyp | 0) === SLIME_MOLD) goodfruit(otmp.spe);

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
 * MM_NONAME. Wizard Replace when bones file already exists (D-0581).
 * Named omissions: file compress; unleash_all/unpunish/dismount;
 * remove_mon_from_bones/dmonsfree/forget_engravings;
 * set_ghostly_objlist / resetobjs known-strip; map memory clear;
 * arise/statue arms; ebones; m_dowear; obj_attach_mid; binary savelev;
 * formatkiller body / yyyymmddhhmmss polish (how/when stubs OK for
 * bones_include_name).
 */
async function savebones(how, corpse) {
    void how;
    const u = game.u || {};
    const flags = game.flags || {};
    const wizard = !!(flags.wizard || flags.debug);

    // C: open_bonesfile hit → wizard Replace? before make_bones mutations
    if (bones_file_exists(u.uz)) {
        if (wizard) {
            if ((await yn_function(
                'Bones file already exists.  Replace it?', 'yn', 'n',
            )) === 'y') {
                if (!delete_bonesfile(u.uz)) {
                    await pline('Cannot unlink old bones.');
                    return;
                }
                // fall through to make_bones
            } else {
                return;
            }
        } else {
            return;
        }
    }

    // C savebones `:450–453` — negate all fids before drop_upon_death
    savebones_negate_fruit_ids();

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

    // C: bones.c savebones — attach cemetery before create_bonesfile
    // who = plname-ROL-RAC-GEN-ALI (playmode:debug → plname "wizard")
    const gidx = game.flags?.female ? 1 : 0;
    const atype = u.ualign?.type | 0;
    const who = [
        game.plname || 'Player',
        (game.urole?.filecode || 'Tou').slice(0, 3),
        (game.urace?.filecode || 'Hum').slice(0, 3),
        (genders[gidx]?.filecode || (gidx ? 'Fem' : 'Mal')).slice(0, 3),
        (aligns[1 - atype]?.filecode || 'Neu').slice(0, 3),
    ].join('-');
    const newbones = {
        who,
        how: '', // formatkiller deferred
        when: '', // yyyymmddhhmmss deferred
        frpx: u.ux0 | u.ux | 0,
        frpy: u.uy0 | u.uy | 0,
        bonesknown: false,
        next: game.level?.bonesinfo || null,
    };
    if (!game.level) game.level = {};
    game.level.bonesinfo = newbones;

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
 * Named omissions: In_tutorial abandon / schedule_goto;
 * Dump-core 'y' → NH_abort / sound_exit (treated as stopprint quit);
 * curs_on_u / wait_synch / multi nomul on cancel (topline clear only).
 * ParanoidQuit getlin "yes" via paranoid_query when bit set (D-0999).
 */
export async function done2() {
    // C: paranoid_query(ParanoidQuit, …). Default paranoia_bits omit
    // PARANOID_QUIT → yn_function.
    const flags = game.flags || {};
    const paranoidQuit = ((flags.paranoia_bits | 0) & PARANOID_QUIT) !== 0;
    const ok = await paranoid_query(paranoidQuit, 'Really quit without saving?');
    if (!ok) {
        // C end.c done2 cancel arm: clear_nhwindow(WIN_MESSAGE) so the
        // yn prompt does not linger into the next nhgetch capture.
        clear_nhwindow_message();
        return ECMD_OK;
    }

    // C: wizard → ynq("Dump core?") — wizard ≡ flags.debug
    if (game.flags?.debug || game.flags?.wizard) {
        const c = await yn_function('Dump core?', 'ynq', 'q');
        if (c === 'y' || c === 'q') {
            // C: 'y' → NH_abort (deferred); 'q' → done_stopprint++
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    await done(QUIT);
    return ECMD_OK;
}

/**
 * C ref: end.c savelife — restore viable state after wizard/discover
 * decline-to-die (or Lifesaved). Named omissions: make_sick TIMEOUT==1;
 * endmultishot; curs_on_u; uswallow expels / ustuck release; livelog.
 */
async function savelife(how) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    if ((u.ulevel | 0) < 1) u.ulevel = 1;
    // C: minuhpmax(10) ≡ max(ulevel, 10)
    const uhpmin = Math.max(u.ulevel | 0, 10);
    if ((u.uhpmax | 0) < uhpmin) {
        u.uhpmax = uhpmin;
        if ((u.uhppeak | 0) < u.uhpmax) u.uhppeak = u.uhpmax;
        flags.botl = true;
    }
    // C: givehp = 50 + 10 * (ACURR(A_CON) / 2)
    const givehp = 50 + 10 * ((acurr(A_CON) / 2) | 0);
    u.uhp = Math.min(u.uhpmax | 0, givehp);
    if (Upolyd(u)) u.mh = Math.min(u.mhmax | 0, givehp);
    if ((u.uhunger | 0) < 500 || how === CHOKING) await init_uhunger();
    game.nomovemsg = 'You survived that attempt on your life.';
    if (!game.context) game.context = {};
    game.context.move = 0;
    // C: gm.multi = -1 (direct, not nomul); Tourist multi_reason differs
    game.multi = -1;
    const rolePm = game.urole?.malenum;
    game.multi_reason = (rolePm === PM_TOURIST)
        ? 'being toyed with by Fate'
        : 'attempting to cheat Death';
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
    if (u.utrap && (u.utraptype | 0) === TT_LAVA) {
        u.utrap = 0;
        u.utraptype = 0;
    }
    flags.botl = true;
    u.ugrave_arise = NON_PM;
    u.HUnchanging = 0;
    // uswallow / ustuck / endmultishot / curs_on_u deferred
}

/**
 * C ref: end.c done — Lifesaved amulet (D-0868) then wizard·discover Die?.
 * Ordinary deaths fall through to really_done.
 * bot() before HP zero so You die more() (no bot) keeps prior botl when
 * uhp was -1 at pline flush (D-0310/D-0314).
 * Named omissions: livelog_printf; formatkiller; CHOKING vomit arm;
 * GENOCIDED still-genocided pline polish.
 */
export async function done(how) {
    const flags = game.flags || (game.flags = {});
    // C: skip bot when panicking / hangup / QUIT with done_stopprint
    const stopprint = game.program_state?.done_stopprint | 0;
    if (game.program_state?.panicking || (how === QUIT && stopprint)) {
        flags.botl = false;
        flags.botlx = false;
    } else {
        flags.botlx = true;
        await bot();
    }
    if (!game.killer) game.killer = { name: '', format: 0 };
    // C: ASCENDED / empty GENOCIDED → NO_KILLER_PREFIX
    if (how === ASCENDED || (!game.killer.name && how === GENOCIDED)) {
        game.killer.format = NO_KILLER_PREFIX;
    }
    // C: empty STARVING/BURNING → KILLED_BY (avoid "a" starvation)
    if (!game.killer.name && (how === STARVING || how === BURNING)) {
        game.killer.format = KILLED_BY;
    }
    // C: empty name or how >= PANICKED → deaths[how] (QUIT → "quit")
    if (!game.killer.name || how >= PANICKED) {
        game.killer.name = DEATHS[how] || 'died';
    }
    const u = game.u || {};
    // C: umortality++ when how < PANICKED (before really_done)
    if (how < PANICKED) {
        u.umortality = (u.umortality | 0) + 1;
        if ((u.uhp | 0) !== 0 || (Upolyd(u) && (u.mh | 0) !== 0)) {
            u.uhp = 0;
            if (Upolyd(u)) u.mh = 0;
            flags.botl = true;
        }
    }

    let survive = false;
    // C: Lifesaved && how <= GENOCIDED — makeknown→exercise(A_WIS) (D-0868)
    if (Lifesaved(u) && how <= GENOCIDED) {
        await pline('But wait...');
        makeknown(AMULET_OF_LIFE_SAVING);
        await pline(
            `Your medallion ${!Blind(u) ? 'begins to glow' : 'feels warm'}!`,
        );
        if (how === CHOKING) await pline('You vomit ...');
        await You_feel('much better!');
        await pline('The medallion crumbles to dust!');
        if (u.uamul) useup_amulet(u.uamul);
        await adjattrib(A_CON, -1, true);
        await savelife(how);
        if (how === GENOCIDED) {
            await pline('Unfortunately you are still genocided...');
        } else {
            // livelog_printf deferred
            survive = true;
        }
    }
    // C: explore and wizard modes offer player the option to keep playing
    const wizard = !!(flags.wizard || flags.debug);
    const discover = !!(flags.explore || flags.discover);
    if (!survive && (wizard || discover) && how <= GENOCIDED) {
        const paranoidDie = ((flags.paranoia_bits | 0) & PARANOID_DIE) !== 0;
        if (!(await paranoid_query(paranoidDie, 'Die?'))) {
            await pline(
                `OK, so you don't ${how === CHOKING ? 'choke' : 'die'}.`,
            );
            await savelife(how);
            survive = true;
        }
    }

    if (survive) {
        game.killer.name = '';
        game.killer.format = KILLED_BY_AN;
        return;
    }
    await really_done(how);
}

/**
 * C ref: end.c delayed_killer — set/replace delayed killer by id; clear
 * immediate killer name.
 */
export function delayed_killer(id, format, killername) {
    if (!game.killer) game.killer = { name: '', format: 0, next: null };
    let k = find_delayed_killer(id);
    if (!k) {
        k = { id: id | 0, format: 0, name: '', next: game.killer.next || null };
        game.killer.next = k;
    }
    k.format = format | 0;
    k.name = killername ? String(killername) : '';
    game.killer.name = '';
}

/** C ref: end.c find_delayed_killer */
export function find_delayed_killer(id) {
    if (!game.killer) return null;
    for (let k = game.killer.next; k; k = k.next) {
        if ((k.id | 0) === (id | 0)) return k;
    }
    return null;
}

/** C ref: end.c dealloc_killer — unlink one delayed killer node. */
export function dealloc_killer(kptr) {
    if (!kptr || !game.killer) return;
    let prev = game.killer;
    for (let k = game.killer.next; k; k = k.next) {
        if (k === kptr) {
            prev.next = k.next || null;
            return;
        }
        prev = k;
    }
}
