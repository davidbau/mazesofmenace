// end.js — Hero death / bones feasibility (partial).
// C ref: end.c done2 / done_in_by / done / really_done / disclose;
//        bones.c can_make_bones / drop_upon_death / savebones.

import { game } from './gstate.js';
// C: end.c really_done ESCAPED fake-Amulet arm — carrying() is a hoisted
// function decl in the shared SCC; call-time use only (no TDZ read).
import { carrying, nomul, finish_losehp_showdamage, finish_losehp_rehumanize } from './hack.js';
import { reset_utrap } from './trap.js';
import { rn2, d } from './rng.js';
import { deepest_lev_reached, depth, strstri, upstart } from './hacklib.js';
import {
    pline, flush_topl_more, bot, You_feel, clear_nhwindow_message,
    canspotmon, Hallucination, curs_on_u, newsym, impossible, You,
    mark_topline_empty,
} from './display.js';
import { yn_function, y_n, ynq, paranoid_query } from './getline.js';
import { livelog_printf } from './pline.js';
import { show_text_pages, show_nhw_menu_text } from './pager.js';
import { genl_outrip_lines } from './rip.js';
import { Goodbye } from './roles.js';
import { an, xname, the as theArt, the_unique_obj, the_unique_pm, thesimpleoname } from './objnam.js';
import {
    objectNameStrs, objects,
    AMULET_CLASS, GEM_CLASS, FIRST_REAL_GEM, LAST_REAL_GEM,
} from './objects.js';
import { arti_cost, artiname } from './artifact.js';
import {
    DIED, GENOCIDED, STONING, QUIT, ESCAPED, ASCENDED, STARVING, BURNING,
    CHOKING, NON_PM, LEAVESTATUE, DISSOLVED, TURNED_SLIME, G_GENOD,
    CORPSTAT_INIT, CORPSTAT_NONE,
    OBJ_FREE, Upolyd, MM_NONAME, NO_MINVENT, isok, u_at, ACCESSIBLE, MAGIC_PORTAL,
    ECMD_OK, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX, PANICKED, TRICKED,
    DISCLOSE_YES_WITHOUT_PROMPT, DISCLOSE_NO_WITHOUT_PROMPT,
    DISCLOSE_SPECIAL_WITHOUT_PROMPT, DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_NO, DISCLOSE_PROMPT_DEFAULT_SPECIAL, NUM_DISCLOSURE_OPTIONS,
    BASICENLIGHTENMENT, MAGICENLIGHTENMENT,
    ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD,
    Is_container, IS_GRAVE, SORTLOOT_LOOT, SORTLOOT_PACK,
    PARANOID_DIE, PARANOID_BONES, PARANOID_QUIT, TT_LAVA, Has_contents,
    PLNMSG_OK_DONT_DIE, LL_LIFESAVE,
    has_oname, LIFESAVED, W_AMUL, ACH_BLND, ACH_NUDE, ACH_UWIN,
    DELPHI, ROOMOFFSET, Is_oracle_level, Is_astralevel, In_endgame,
    In_quest, ismnum, has_ebones, EBONES, has_mgivenname, MGIVENNAME, BUFSZ,
    M_AP_TYPE, M_AP_MONSTER, NUM_ROLES, NUM_RACES, M_SEEN_NOTHING,
    unhideable_trap, DISMOUNT_BONES,
    FIRE_RES, STONE_RES, INTRINSIC,
    WRITING, NHF_BONESFILE,
    UTOTYPE_ATSTAIRS, fuzzer_off, EXIT_FAILURE,
    TIMEOUT, SICK_ALL,
} from './const.js';
import { G_NOCORPSE, G_UNIQ, mons, likes_gold, likes_gems, likes_objs, likes_magic, is_vampshifter, is_undead } from './monsters.js';
import { m_at, mongone, dmonsfree, zombie_maker, m_carrying, iter_mons } from './mon.js';
import { can_carry, accessible } from './monmove.js';
import { enexto, rloc_to, single_level_branch } from './teleport.js';
import { oname, christen_monst, free_oname, mon_nam, Monnam, m_monnam, pmname, Ugender, Mgender, type_is_pname } from './do_name.js';
import { mkcorpstat, curse, place_object, stackobj, mksobj, add_to_minv, add_to_container, weight, obj_attach_mid } from './mkobj.js';
import { artifact_light, end_burn } from './timeout.js';
import { obj_is_burning } from './light.js';
import { make_grave, sticks, forget_engravings } from './engrave.js';
import { makemon, adj_lev, mongets } from './makemon.js';
import {
    write_bonesfile, bones_file_exists, delete_bonesfile,
    goodfruit, savebones_negate_fruit_ids, set_ghostly_objlist, resetobjs,
} from './bones.js';
import { genders, aligns, roles, races } from './roles.js';
import { topten, nh_terminate_capture, raw_print_blanks } from './topten.js';
import { objectNames } from './generated/objects_data.js';
import { monsterNames, PM_TOURIST, LOW_PM } from './generated/monsters_data.js';
import { paybill, money2mon, money_cnt, obfree, doname_with_price } from './shk.js';
import { hidden_gold, paygd } from './vault.js';
import { clearlocks, debugcore, new_nhfile, store_version, FNIDX_HISTORICAL, compress_bonesfile } from './files.js';
import { clearpriests } from './priest.js';
import { shkname, shkname_is_pname } from './shknam.js';
import {
    enlightenment, display_inventory, discover_object, makeknown, sortloot,
    unsortloot, update_inventory,
    currency, free_pickinv_cache, perm_invent_toggled,
} from './invent.js';
import {
    list_vanquished, list_genocided, show_conduct, count_achievements,
    record_achievement,
} from './insight.js';
import { show_overview, In_tutorial, Is_special, Is_branchlev } from './dungeon.js';
// C: end.c done2 abandon arm → do.c schedule_goto (imports.mjs --can:
// SAFE, hoisted function decl, call-time use only).
import { schedule_goto } from './do.js';
import { A_CON, acurr, adjattrib, minuhpmax } from './attrib.js';
import { init_uhunger } from './eat.js';
// C: end.c savelife release arms call mon.c unstuck + mhitu.c expels
// (imports.mjs --can: SAFE, both hoisted function decls, call-time use only).
import { unstuck, expels } from './mhitu.js';
import { setworn } from './do_wear.js';
import { m_dowear, clear_bypasses } from './worn.js';
import { night, midnight, getnow, yyyymmddhhmmss } from './calendar.js';
// C: bones.c savebones make_bones head (imports.mjs --can: SAFE, hoisted
// function decls, call-time use only).
import { unleash_all } from './apply.js';
import { unpunish } from './read.js';
import { dismount_steed } from './steed.js';
import { newebones } from './restore.js';
import { Punished } from './pray.js';
// C: end.c savelife `:713–715` setuhpmax / `:724–726` make_sick / `:745`
// endmultishot (imports.mjs --can: SAFE, hoisted function decls,
// call-time use only).
import { setuhpmax } from './exper.js';
import { make_sick } from './potion.js';
import { endmultishot } from './dothrow.js';

const CORPSE = objectNames.indexOf('CORPSE');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_WRAITH = monsterNames.indexOf('PM_WRAITH');
const PM_VAMPIRE = monsterNames.indexOf('PM_VAMPIRE');
const PM_GHOUL = monsterNames.indexOf('PM_GHOUL');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_HUMAN = monsterNames.indexOf('PM_HUMAN');
const STATUE = objectNames.indexOf('STATUE');
const TIN = objectNames.indexOf('TIN');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const FIRST_AMULET = objectNames.indexOf('AMULET_OF_ESP');
const LAST_AMULET = objectNames.indexOf('AMULET_OF_YENDOR');
const LAST_GLASS_GEM = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_HOUSECAT = monsterNames.indexOf('PM_HOUSECAT');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');
const PM_VLAD = monsterNames.indexOf('PM_VLAD_THE_IMPALER');
// C monst.h msound: MS_LEADER 36, MS_NEMESIS 37 (makemon.js:668-669 same).
const MS_LEADER = 36;
const MS_NEMESIS = 37;

/** C ref: integer.h:129 nowrap_add — saturate at LONG_MAX (JS Number analogue). */
export function nowrap_add(a, b) {
    const LONG_MAX = Number.MAX_SAFE_INTEGER;
    const aa = Number(a) || 0;
    const bb = Number(b) || 0;
    return aa <= LONG_MAX - bb ? aa + bb : LONG_MAX;
}

/**
 * C ref: end.c artifact_score `:906–940`. Walk invent or a cobj nobj
 * chain. Unique/invocation items: zorkmid value via arti_cost, score
 * value * 5 / 2. counting → nowrap_add into u.urexp; else discover,
 * mark known, putstr the worth line. Recurse Has_contents.
 * DUMPLOG listing (endwin 0) remains named omit. get_valuables is D-1741.
 * @param {object[]|object|null} list
 * @param {boolean} counting
 * @param {string[]|null} [lines] NHW_TEXT stand-in when !counting
 */
export function artifact_score(list, counting, lines = null) {
    if (!list) return;
    const walk = Array.isArray(list)
        ? list.filter(Boolean)
        : (() => {
            const out = [];
            for (let otmp = list; otmp; otmp = otmp.nobj) out.push(otmp);
            return out;
        })();
    for (const otmp of walk) {
        if (otmp.oartifact
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD
            || otmp.otyp === CANDELABRUM_OF_INVOCATION) {
            const value = arti_cost(otmp);
            const points = Math.trunc((value * 5) / 2);
            if (counting) {
                const u = game.u || (game.u = {});
                u.urexp = nowrap_add(u.urexp | 0, points);
            } else {
                discover_object(otmp.otyp, true, true, false);
                otmp.known = otmp.dknown = otmp.bknown = otmp.rknown = 1;
                const name = otmp.oartifact
                    ? artiname(otmp.oartifact)
                    : (objectNameStrs[otmp.otyp] || '');
                const pbuf =
                    `${the_unique_obj(otmp) ? 'The ' : ''}${name}`
                    + ` (worth ${value} ${currency(value)} and ${points} points)`;
                if (lines) lines.push(pbuf);
            }
        }
        if (Has_contents(otmp)) {
            artifact_score(otmp.cobj, counting, lines);
        }
    }
}

/**
 * C ref: decl.c gv.valuables / ga.amulets / gg.gems. Recreate so
 * otyp-index identity holds (C BSS zeros once; JS may collect twice
 * in one process). Size: LAST_AMULET+1-FIRST_AMULET; gems get one
 * extra slot for all glass (LAST_REAL_GEM+1-FIRST_REAL_GEM+1).
 */
function reset_valuables() {
    const nA = LAST_AMULET + 1 - FIRST_AMULET;
    const nG = LAST_REAL_GEM + 1 - FIRST_REAL_GEM + 1;
    game.amulets = Array.from({ length: nA }, () => ({ count: 0, typ: 0 }));
    game.gems = Array.from({ length: nG }, () => ({ count: 0, typ: 0 }));
    game.valuables = [
        { list: game.gems, size: nG },
        { list: game.amulets, size: nA },
        { list: null, size: 0 },
    ];
}

/**
 * C ref: end.c get_valuables `:762–791`. Walk invent or a cobj nobj
 * chain. Recurse Has_contents first (artifact bags still scanned).
 * Skip oartifact. Tally AMULET_CLASS by otyp-FIRST_AMULET; GEM_CLASS
 * through LAST_GLASS_GEM with glass collapsed to LAST_REAL_GEM+1.
 * Luckstones and other graystones are past LAST_GLASS_GEM — omitted
 * here as in C.
 * @param {object[]|object|null} list
 */
export function get_valuables(list) {
    if (!list) return;
    if (!game.amulets || !game.gems) reset_valuables();
    const walk = Array.isArray(list)
        ? list.filter(Boolean)
        : (() => {
            const out = [];
            for (let obj = list; obj; obj = obj.nobj) out.push(obj);
            return out;
        })();
    for (const obj of walk) {
        if (Has_contents(obj)) {
            get_valuables(obj.cobj);
        } else if (obj.oartifact) {
            continue;
        } else if ((obj.oclass | 0) === AMULET_CLASS) {
            const i = (obj.otyp | 0) - FIRST_AMULET;
            const slot = game.amulets[i];
            if (!slot.count) {
                slot.count = obj.quan | 0;
                slot.typ = obj.otyp | 0;
            } else {
                slot.count += obj.quan | 0; /* always adds one */
            }
        } else if ((obj.oclass | 0) === GEM_CLASS
            && (obj.otyp | 0) <= LAST_GLASS_GEM) {
            const i = Math.min(obj.otyp | 0, LAST_REAL_GEM + 1) - FIRST_REAL_GEM;
            const slot = game.gems[i];
            if (!slot.count) {
                slot.count = obj.quan | 0;
                slot.typ = obj.otyp | 0;
            } else {
                slot.count += obj.quan | 0;
            }
        }
    }
}

/**
 * C ref: end.c sort_valuables `:797–818`. Insertion sort by count
 * descending; empty slots stay put. Structure-copy — do not alias.
 * @param {Array<{count: number, typ: number}>} list
 * @param {number} size
 */
function sort_valuables(list, size) {
    for (let i = 1; i < size; i++) {
        if (list[i].count === 0) continue;
        const ltmp = { count: list[i].count, typ: list[i].typ };
        let j = i;
        for (; j > 0; --j) {
            if (list[j - 1].count >= ltmp.count) break;
            list[j] = { count: list[j - 1].count, typ: list[j - 1].typ };
        }
        list[j] = ltmp;
    }
}

/** C really_done `:1439–1446` — count * objects[typ].oc_cost into urexp. */
function score_collected_valuables() {
    const u = game.u || (game.u = {});
    const objs = objects();
    for (const val of game.valuables || []) {
        if (!val.list) continue;
        for (let i = 0; i < val.size; i++) {
            if (val.list[i].count !== 0) {
                const tmp = val.list[i].count
                    * (objs?.[val.list[i].typ]?.oc_cost | 0);
                u.urexp = nowrap_add(u.urexp | 0, tmp);
            }
        }
    }
}

/**
 * C ref: end.c really_done `:1453–1476`. After unique-item counting.
 * C sets viz_array[0][0] |= IN_SIGHT so mon_nam can see mx=0 mydogs;
 * JS x_monnam already skips do_it when program_state.gameover.
 * Walk mydogs: name every companion; mtame → nowrap_add(urexp, mhp).
 * Live Schroedingers_cat: adj_lev(housecat) then d(m_lev, 8).
 * DUMPLOG listing remains named omit.
 * @returns {string[]} mon_nam fragments (no leading "You")
 */
export function score_escape_companions() {
    const u = game.u || (game.u = {});
    const names = [];
    for (const mtmp of game.mydogs || []) {
        if (!mtmp) continue;
        names.push(mon_nam(mtmp));
        if (mtmp.mtame) {
            u.urexp = nowrap_add(u.urexp | 0, mtmp.mhp | 0);
        }
    }
    if (game.Schroedingers_cat) {
        const m_lev = adj_lev(mons(PM_HOUSECAT));
        const mhp = d(m_lev, 8);
        u.urexp = nowrap_add(u.urexp | 0, mhp);
        names.push("Schroedinger's cat");
    }
    return names;
}

/**
 * C ref: end.c really_done `:1490–1519`. Sort then putstr each
 * non-zero slot. Real gems/amulets: mksobj(FALSE,FALSE) + xname.
 * Glass: "worthless piece(s) of colored glass". DUMPLOG redirect
 * remains named omit.
 * @param {string[]} lines
 */
function list_valuables(lines) {
    const objs = objects();
    for (const val of game.valuables || []) {
        if (!val.list) continue;
        sort_valuables(val.list, val.size);
        for (let i = 0; i < val.size; i++) {
            const typ = val.list[i].typ;
            const count = val.list[i].count;
            if (count === 0) continue;
            if ((objs?.[typ]?.oc_class | 0) !== GEM_CLASS
                || typ <= LAST_REAL_GEM) {
                const otmp = mksobj(typ, false, false);
                discover_object(otmp.otyp, true, true, false);
                otmp.dknown = 1;
                otmp.known = 1;
                if (has_oname(otmp)) free_oname(otmp);
                otmp.quan = count;
                const cost = count * (objs[typ]?.oc_cost | 0);
                lines.push(
                    `${String(count).padStart(8)} ${xname(otmp)}`
                    + ` (worth ${cost} ${currency(2)}),`,
                );
                obfree(otmp, null);
            } else {
                lines.push(
                    `${String(count).padStart(8)} worthless piece`
                    + `${plur(count)} of colored glass,`,
                );
            }
        }
    }
}

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

/**
 * C ref: end.c death_fixups[] `:349–361` — helplessness overrides.
 * STONING drops "getting stoned" (unmulti); STARVING shortens
 * "fainted from lack of food" to "fainted".
 */
const death_fixups = [
    { why: STONING, unmulti: 1, exclude: 'getting stoned', include: null },
    {
        why: STARVING, unmulti: 0,
        exclude: 'fainted from lack of food', include: 'fainted',
    },
];

/**
 * C ref: end.c fixup_death `:365–384` (staticfn). Rewrite or drop
 * gm.multi_reason when the death how already implies that helplessness.
 */
function fixup_death(how) {
    const reason = game.multi_reason;
    if (!reason) return;
    for (const row of death_fixups) {
        if (row.why === how && row.exclude === reason) {
            game.multi_reason = row.include || null;
            game.multireasonbuf = '';
            if (row.unmulti) game.multi = 0;
            break;
        }
    }
}

/* money_cnt: canonical import from shk.js (hack.c:4513–4522 — first stack). */

/* deepest_lev_reached: canonical import from hacklib.js (dungeon.c:1338–1371). */

/**
 * C ref: end.c should_query_disclose_option `:475–515` (staticfn).
 * strchr over decl.c disclosure_options "iavgco" (`:54`); bad index →
 * impossible + DISCLOSE_PROMPT_DEFAULT_YES/ask; bad category →
 * impossible + ask with C's initial `*defquery = 'n'` (`:482`).
 * Async only because the live `impossible` (display.js) awaits.
 * @returns {{ ask: boolean, defquery: string }}
 */
async function should_query_disclose_option(category) {
    let defquery = 'n'; // C `:482`
    const dop = DISCLOSURE_OPTIONS.indexOf(category); // C strchr `:483`
    if (dop >= 0) {
        const idx = dop; // C `:484` pointer difference
        if (idx < 0 || idx >= NUM_DISCLOSURE_OPTIONS) { // C `:485`
            await impossible( // C `:486–488` (%s: JS impossible has no %c)
                'should_query_disclose_option: bad disclosure index %d %s',
                idx, category);
            return { ask: true, defquery: DISCLOSE_PROMPT_DEFAULT_YES };
        }
        const ed = String(game.flags?.end_disclose || '');
        const disclose = ed[idx] || DISCLOSE_PROMPT_DEFAULT_NO; // C `:492`
        if (disclose === DISCLOSE_YES_WITHOUT_PROMPT) { // C `:493–495`
            return { ask: false, defquery: 'y' };
        }
        if (disclose === DISCLOSE_SPECIAL_WITHOUT_PROMPT) { // C `:496–498`
            return { ask: false, defquery: 'a' };
        }
        if (disclose === DISCLOSE_NO_WITHOUT_PROMPT) { // C `:499–501`
            return { ask: false, defquery: 'n' };
        }
        if (disclose === DISCLOSE_PROMPT_DEFAULT_YES) { // C `:502–504`
            return { ask: true, defquery: 'y' };
        }
        if (disclose === DISCLOSE_PROMPT_DEFAULT_SPECIAL) { // C `:505–507`
            return { ask: true, defquery: 'a' };
        }
        return { ask: true, defquery: 'n' }; // C `:508–511` else
    }
    await impossible( // C `:513`
        'should_query_disclose_option: bad category %s', category);
    return { ask: true, defquery }; // C `:514` ('n' from `:482`)
}

/**
 * C ref: topten.c formatkiller :89-162 — prefix + killer.name; helpless
 * suffix when incl_helpless and still occupied (multi < 0): ", while
 * <multi_reason>", else ", while helpless" (C `siz` buffer guards;
 * BUFSZ units here).
 * @param {number} how
 * @param {boolean} incl_helpless
 */
export function formatkiller(how, incl_helpless = false) {
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
    // C topten.c :145-155 — X <= siz counts the NUL: ", while " is 8
    // with NUL, ", while helpless" is 17 with NUL.
    if (incl_helpless && (game.multi | 0) < 0) {
        const reason = game.multi_reason;
        if (typeof reason === 'string' && reason
            && reason.length + 8 <= BUFSZ - buf.length) {
            buf += `, while ${reason}`;
        } else if (17 <= BUFSZ - buf.length) {
            buf += ', while helpless';
        }
    }
    return buf;
}

/**
 * C ref: end.c done_object_cleanup `:850–903` — use up the active invent
 * item, place limbo thrown/kicked missiles on the map, lift the limbo
 * ball&chain, drop the perm_invent window, all before disclosure/bones.
 * Async: inven_inuse + lift_covet_and_placebc are async callees
 * (imports.mjs: end→save / end→ball are CHECK, so both load lazily via
 * dynamic import, same shape as the allmain.js edge in really_done).
 * Callers: end.c:1157 really_done (below); save.c:98 dosave0
 * (js/save.js); save.c:1111 freedynamicdata has no JS counterpart
 * (save-freeing teardown — named, not wired).
 */
export async function done_object_cleanup() {
    // C `:854` — killed while using a disposable item: finish it off
    // before disclosure/bones (restore.c inven_inuse, quietly=TRUE).
    const { inven_inuse } = await import('./save.js');
    await inven_inuse(true);
    // C `:873–877` — missile square is u + dx/dy, hero square when
    // off-map or blocked.
    const u = game.u || {};
    let ox = (u.ux | 0) + (u.dx | 0);
    let oy = (u.uy | 0) + (u.dy | 0);
    const spotOk = (x, y) => {
        if (!isok(x, y)) return false;
        return accessible(x, y); // C `:875` (live monmove.js export)
    };
    if (!spotOk(ox, oy)) {
        ox = u.ux | 0;
        oy = u.uy | 0;
    }
    // C `:878–885` — limbo missiles onto the map (bypassing
    // flooreffects), stacked, cleared (D-0275).
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
    // C `:886–890` — Punished death mid-change/swallowed: ball&chain in
    // limbo go back on the floor (the `placebc()` comment is dead in C —
    // the live call is lift_covet_and_placebc; hack.h:110
    // override_restriction is -1, cf. ball.js check_restriction).
    const uchain = u.uchain;
    if (uchain && uchain.where === OBJ_FREE) {
        const { lift_covet_and_placebc } = await import('./ball.js');
        await lift_covet_and_placebc(-1);
    }
    // C `:894–897` — popup disclosure replaced the persistent window
    // (avoids "Bad fruit #n" when saving bones).
    const iflags = game.iflags || {};
    if (iflags.perm_invent) {
        iflags.perm_invent = false;
        perm_invent_toggled(true); /* make interface notice the change */
    }
}

/* C dungeon.c on_level / Is_branchlev — imported live from dungeon.js. */

/**
 * C ref: bones.c no_bones_level — special/dungeon boneid, botlevel,
 * multiway branch (dlevel>1), Gehennom invocation level.
 * Named omission: save_dlevel reassignment before the checks.
 */
export function no_bones_level(lev) {
    // C bones.c:25 (sptr = Is_special(lev)) — live dungeon.js export.
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
    // (bones.c can_make_bones `:369–374`: for (ttmp = gf.ftrap; ...) if
    // MAGIC_PORTAL). JS ftrap is level.traps; game.ftrap is the node
    // chain when set — fresh levels leave it null, so the live array
    // carries the check (quest.js:294 portal-find shape).
    if (!Is_branchlev(uz)) {
        const traps = game.level?.traps;
        if (Array.isArray(traps)) {
            for (const tr of traps) {
                if (tr && (tr.ttyp | 0) === MAGIC_PORTAL) return false;
            }
        }
        if (game.ftrap && !Array.isArray(game.ftrap)) {
            for (let t = game.ftrap; t; t = t.ntrap) {
                if ((t.ttyp | 0) === MAGIC_PORTAL) return false;
            }
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

/** C obj.h SchroedingersBox — LARGE_BOX with spe==1. */
function SchroedingersBox(obj) {
    return !!obj && (obj.otyp | 0) === LARGE_BOX && (obj.spe | 0) === 1;
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
 * for inventory disclosure / dumplog. observe_quantum_cat(FALSE, FALSE)
 * so a live cat leaves spe set (container_contents "Schroedinger's cat!").
 * game.Schroedingers_cat is C's file-scope boolean for escape companion HP.
 */
async function identify_invent_for_disclose() {
    const invent = game.invent || [];
    // C BSS zeros once per process; JS reuses the module across games.
    game.Schroedingers_cat = false;
    let observe_quantum_cat = null;
    for (const obj of invent) {
        if (!obj) continue;
        discover_object(obj.otyp, true, true, false);
        obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
        set_cknown_lknown(obj);
        if (SchroedingersBox(obj)) {
            if (!game.Schroedingers_cat) {
                // pickup→trap→end cycle; load after modules are live
                if (!observe_quantum_cat) {
                    ({ observe_quantum_cat } = await import('./pickup.js'));
                }
                await observe_quantum_cat(obj, false, false);
                if (SchroedingersBox(obj)) game.Schroedingers_cat = true;
            } else {
                obj.spe = 0;
            }
        }
    }
}

/**
 * C ref: end.c container_contents `:1594–1670` — walk invent/container
 * list after disclose invent 'y'. Live-cat line when spe still 1 after
 * observe_quantum_cat(FALSE, FALSE). Whole body live: cknown/lknown +
 * update_inventory, Bag-of-Tricks skip, sorted menu (doname_with_price),
 * Schroedinger's-cat line, recursion, reportempty upstart(thesimpleoname).
 * Named omissions: in_dumplog arms (DUMPLOG retired D-1776 — !dumping
 * path live); display_nhwindow(WIN_MESSAGE) after reportempty (the
 * message window live-displays).
 * Callers: end.c:639 disclose → disclose(), end.c:1660 recursion;
 * end.c:593 dump_everything (dumplog, retired — named); pickup.c:3122
 * use_container ':' → js/pickup.js use_container (canonical import).
 * @param {object[]|object|null} list invent array or cobj chain head
 * @param {boolean} identified
 * @param {boolean} all_containers
 * @param {boolean} reportempty
 */
export async function container_contents(list, identified, all_containers, reportempty) {
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
        if (!box.cknown || (identified && !box.lknown)) { // C `:1605–1609`
            box.cknown = 1; /* we're looking at the contents now */
            if (identified) box.lknown = 1;
            update_inventory(); // C `:1609`
        }
        // C `:1611–1613` — `continue` skips the bottom `!all_containers`
        // break: C keeps scanning past a Bag of Tricks.
        if (box.otyp === BAG_OF_TRICKS) continue;
        if (box.cobj) {
            const lines = [`Contents of ${theArt(xname(box))}:`, ''];
            // C: SchroedingersBox flag only if the cat is still live
            const cat = SchroedingersBox(box);
            if (!cat) {
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
                    // C end.c:1647 — container_contents lists doname_with_price.
                    lines.push(`  ${doname_with_price(obj)}`);
                }
                unsortloot(sorted); // C `:1650` — free-only; GC no-op in JS.
            } else {
                lines.push("  Schroedinger's cat!");
            }
            await show_nhw_menu_text(lines);
            if (all_containers) {
                await container_contents(box.cobj, identified, true, reportempty);
            }
        } else if (reportempty) { // C `:1662–1665`
            await pline(`${upstart(thesimpleoname(box))} is empty.`);
            // C `:1664` display_nhwindow(WIN_MESSAGE, FALSE) — the message
            // window live-displays; no JS counterpart needed.
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
        // C end.c:629–630 — (how == QUIT) ? "quit" : "died".
        const qbuf = taken
            ? `Do you want to see what you had when you ${(how === QUIT) ? 'quit' : 'died'}?`
            : 'Do you want your possessions identified?';
        const { ask, defquery } = await should_query_disclose_option('i');
        const c = ask
            ? await yn_function(qbuf, 'ynq', defquery)
            : defquery;
        if (c === 'y') {
            // C: iflags.force_invmenu = FALSE; display_inventory(NULL, TRUE)
            if (game.iflags) game.iflags.force_invmenu = false;
            await display_inventory(null, true);
            await container_contents(invent, true, true, false);
        }
        if (c === 'q') {
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    if (!stop()) {
        const { ask, defquery } = await should_query_disclose_option('a');
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
        const { ask, defquery } = await should_query_disclose_option('v');
        await list_vanquished(defquery, ask);
    }

    if (!stop()) {
        const { ask, defquery } = await should_query_disclose_option('g');
        await list_genocided(defquery, ask);
    }

    if (!stop()) {
        // C ref: end.c:664-680 — Sprintf "conduct%s?" with " and achievements"
        // iff count_achievements() > 0; yn asked only when should_query 'c'.
        const { ask, defquery } = await should_query_disclose_option('c');
        let c;
        if (ask) {
            const acnt = count_achievements();
            const qbuf =
                'Do you want to see your conduct' +
                (acnt > 0 ? ' and achievements' : '') +
                '?';
            c = await yn_function(qbuf, 'ynq', defquery);
        } else {
            c = defquery;
        }
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
        const { ask, defquery } = await should_query_disclose_option('o');
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
 * Named omissions: paybill; discover_object invent walk;
 * DUMPLOG second artifact_score; amulet killer
 * suffix. Companion pet HP / live-cat d() is D-1754.
 */
async function show_death_rip_and_summary(how, umoney, endtime = 0) {
    const flags = game.flags || {};
    const done_stopprint = game.program_state?.done_stopprint | 0;
    // C: dump_forward_putstr(..., done_stopprint) + display_nhwindow
    // skipped when stopprint — visible output suppressed even if tombstone.
    if (done_stopprint) return;

    const lines = [];
    // C genl_outrip: leading blank then stone then two blanks
    if (how < GENOCIDED && flags.tombstone !== false) {
        lines.push('');
        lines.push(...genl_outrip_lines(formatkiller(how, false), endtime));
        lines.push('');
        lines.push('');
    }

    const u = game.u || {};
    const plname = game.plname || 'Player';
    // C really_done `:1428–1434` — ASCENDED → Demigod/Demigoddess
    const roleName = how === ASCENDED
        ? (flags.female ? 'Demigoddess' : 'Demigod')
        : ((flags.female && game.urole?.name?.f)
            ? game.urole.name.f
            : (game.urole?.name?.m || 'Adventurer'));
    lines.push(`${Goodbye()} ${plname} the ${roleName}...`);
    lines.push('');

    if (how === ESCAPED || how === ASCENDED) {
        // C `:1453–1482` after artifact_score counting: companion names
        // then (same or next putstr) verb + points. Pets first so urexp
        // in the sentence includes mhp / live-cat d().
        const names = score_escape_companions();
        const scored = u.urexp | 0;
        const verb = how === ASCENDED
            ? 'went to your reward'
            : 'escaped from the dungeon';
        if (names.length) {
            lines.push(`You and ${names.join(' and ')}`);
            lines.push(`${verb} with ${scored} point${plur(scored)},`);
        } else {
            lines.push(`You ${verb} with ${scored} point${plur(scored)},`);
        }
        artifact_score(game.invent, false, lines);
        list_valuables(lines);
    } else {
        // C really_done :1521-1541 — level-teleported-out arm; Astral
        // override; the level suffix is skipped In_endgame and on
        // single-level branches; quest prints dunlev (== dlevel).
        const pts = u.urexp | 0;
        let line;
        if ((u.uz?.dnum | 0) === 0 && (u.uz?.dlevel | 0) <= 0) {
            line = `You ${(u.uz?.dlevel | 0) < 0 ? 'passed away' : (ENDS[how] || 'died')} beyond the confines of the dungeon`;
        } else {
            let where = game.dungeons?.[u.uz?.dnum | 0]?.dname
                || 'The Dungeons of Doom';
            if (Is_astralevel(u.uz)) where = 'The Astral Plane';
            line = `You ${ENDS[how] || 'died'} in ${where}`;
            if (!In_endgame(u.uz) && !single_level_branch(u.uz)) {
                line += ` on dungeon level ${In_quest(u.uz) ? (u.uz?.dlevel | 0) : depth(u.uz)}`;
            }
        }
        lines.push(`${line} with ${pts} point${plur(pts)},`);
    }
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
 * C ref: end.c nh_terminate `:1673–1703`.
 * Unix `nethack_exit` is `exit` (extern.h:2387). Scored ESM cannot exit
 * the process; `program_state.gameover` stops `moveloop` / `runSegment`.
 * @param {number} status EXIT_SUCCESS (0) or EXIT_FAILURE
 */
export function nh_terminate(status) {
    if (!game.program_state) game.program_state = {};
    const ps = game.program_state;
    ps.in_moveloop = 0; // C `:1676` — won't be returning to normal play
    // C `:1678` l_nhcore_call(NHCORE_GAME_EXIT) — no Lua core in scored JS.
    // MACOS9 getreturn (`:1679–1681`) is not this build.
    if (!ps.panicking) {
        // C `:1684–1687` — freedynamicdata (save-freeing, not ported),
        // dlb_cleanup (data library file, Rule #2), l_nhcore_done (no Lua).
    }
    // VMS (`:1690–1700`) returns when already exiting. Not this build.
    ps.exiting = 1; // C `:1701`
    ps.exit_status = status | 0;
    ps.gameover = true; // C `:1702` nethack_exit(status)
}

/**
 * C ref: end.c really_done `:1130–1590` — gameover; cleanup; urealtime;
 * achievements; first-move pline; bones_ok/launch; arise; QUIT; fixup;
 * paybill; disclose; keepdogs; finish_paybill; grave; score (+ascension);
 * arise pline; savebones; done_money; rip/goodbye; amulet suffix; topten.
 * Named omissions: dumplog family (dump_open_log/dump_everything/
 * dump_redirect/genl_outrip/dump_forward_putstr/dump_close_log — file
 * side-channel, DUMPLOG retired D-1776); livelog_printf/logfile/xlogfile
 * (no session effect); wait_synch/signals/sethanguphandler/exit_nhwindows
 * (platform/windowing, no JS counterpart); sound_exit_nhsound (no sound
 * lib); panic() caller (C end.c:470 — panic itself unported, own row);
 * done_object_cleanup arms (live export above);
 * unleash_all in finish_paybill; ParanoidBones getlin; DUMPLOG second
 * artifact_score; grddead inside mongone; display_pickinv cache setter;
 * insight fmt_elapsed_time / savegamestate / dosuspend / dosh
 * timet_delta callers.
 */
async function really_done(how) {
    if (!game.program_state) game.program_state = {};
    game.program_state.gameover = true;
    // C really_done `:1146` — panic save is pointless once gameover.
    game.program_state.something_worth_saving = 0;
    if (game.program_state.done_hup) {
        game.program_state.done_stopprint =
            (game.program_state.done_stopprint | 0) + 1;
    }
    if (!game.iflags) game.iflags = {};
    game.iflags.vision_inited = false;

    // C end.c `:1155–1160` — limbo missiles → map before bones/disclosure
    // (skipped while panicking); perm_invent cleared again here since the
    // panicking path never ran done_object_cleanup().
    if (!game.program_state.panicking) await done_object_cleanup();
    game.iflags.perm_invent = false;

    // C really_done `:1165–1170` — one getnow for bones when[] / rip / topten
    const endtime = getnow();
    if (!game.urealtime) {
        game.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };
    }
    game.urealtime.finish_time = endtime;
    // allmain.js is in the SCC with end.js; load after modules are live
    // (same shape as keepdogs). timet_delta is a hoisted export.
    const { timet_delta } = await import('./allmain.js');
    game.urealtime.realtime =
        (game.urealtime.realtime | 0)
        + timet_delta(endtime, game.urealtime.start_timing);
    game.iflags.at_night = night() ? 1 : 0;
    game.iflags.at_midnight = midnight() ? 1 : 0;

    // C end.c really_done — final achievement tracking: blind-from-birth
    // and nudist only with tangible progress (a prior achievement or
    // !beginner — u_init sets beginner TRUE like C u_init.c:950);
    // ascension always last. record_achievement is gameover-quiet.
    const u = game.u || {};
    if (((u.uachieved?.[0] | 0) || !game.flags?.beginner)) {
        if (u.uroleplay?.blind) record_achievement(ACH_BLND);
        if (u.uroleplay?.nudist) record_achievement(ACH_NUDE);
    }
    if (how === ASCENDED) record_achievement(ACH_UWIN);

    // C end.c:1186-1187 — die on the first move: "Do not pass Go.  Do not
    // collect 200 zorkmids." svm.moves is game.moves; done_stopprint gates.
    // dump_open_log stays a named omission (log-file side channel, D-1776);
    // wait_synch/signals have no JS counterpart.
    if (((game.moves | 0) <= 1) && how < PANICKED && !(game.program_state?.done_stopprint | 0)) {
        await pline(`Do not pass Go.  Do not collect 200 ${currency(200)}.`);
    }

    // C: bones_ok = can_make_bones() before display_nhwindow(WIN_MESSAGE)
    const bones_ok = (how < GENOCIDED) && can_make_bones();

    if (bones_ok) {
        // trap.js already statically imports end.js — load these lazily.
        const { launch_in_progress, force_launch_placement } =
            await import('./trap.js');
        if (launch_in_progress()) force_launch_placement();
    }

    // C end.c:1206–1219 — maintain ugrave_arise even for !bones_ok: no
    // corpse or grave for PANICKED, none for BURNING/DISSOLVED, a statue
    // for STONING, slime-arise unless green slimes are genocided; the
    // killer-based arise lands in done_in_by (end.c:326–340).
    if (how === PANICKED) u.ugrave_arise = NON_PM - 3;
    else if (how === BURNING || how === DISSOLVED) u.ugrave_arise = NON_PM - 2;
    else if (how === STONING) u.ugrave_arise = LEAVESTATUE;
    else if (how === TURNED_SLIME
        && !(((game.mvitals?.[PM_GREEN_SLIME]?.mvflags) | 0) & G_GENOD)) u.ugrave_arise = PM_GREEN_SLIME;
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

    fixup_death(how);

    // C: paybill before display_nhwindow — may append to pending "You die..."
    let taken = false;
    if (how !== PANICKED) {
        const silently = !!(game.program_state.done_stopprint);
        // croaked: -1 escaped; 0 quit; 1 died (how != QUIT)
        const croaked = how === ESCAPED ? -1 : (how !== QUIT ? 1 : 0);
        taken = await paybill(croaked, silently);
        await paygd(silently);
        await clearpriests();
    }

    clearlocks();

    await flush_topl_more();
    // C end.c:1246–1247 — display_nhwindow(WIN_MESSAGE, FALSE): the
    // not-NEED_MORE arm (wintty.c:1873–1884) settles toplin EMPTY (+msg
    // cur zero) with NO visual erase, so the answered "Die?" prompt
    // stays visible as stale pixels under the disclose menu (the menu
    // overlay clear at wintty.c:1938–1941 then skips).
    mark_topline_empty();

    // C: invent discover_object walk before disclose (and dumplog)
    if (how !== PANICKED) {
        await identify_invent_for_disclose();
    }

    // C: strcmp(flags.end_disclose, "none") — array never equals "none"
    // after optfn_disclose; always call disclose (modes inside may no-ask).
    const endDisclose = game.flags?.end_disclose;
    if (how !== PANICKED && endDisclose !== 'none') {
        await disclose(how, taken);
    }

    // C `:1293–1295` after dump_everything (named omit) so pets stay
    // on-map during dump; mydogs then feeds escape companion HP.
    // dog.js is in the 87-module SCC with end.js; load after modules
    // are live (same shape as observe_quantum_cat).
    if (how === ESCAPED || how === ASCENDED) {
        const { keepdogs } = await import('./dog.js');
        await keepdogs(true);
    }

    // C: finish_paybill after disclosure but before bones — it moves
    // invent gold to the shopkeeper and drops invent, so the score block
    // below must see the post-payment invent (JS previously scored first).
    if (bones_ok && taken) await finish_paybill();

    // C end.c grave creation after disclosure (keeps this grave out of
    // #overview): race-based corpse when !Upolyd (role mons are human);
    // NOCORPSE reads u.umonnum like C; "plname, "+formatkiller epitaph;
    // emptygrave (C flags) when the grave is new — the corpse isn't buried.
    // ugrave_arise null/undefined ≡ NON_PM (C u_init.c:989 init; JS u_init
    // leaves it unset, zap.js:2028 sets it on one path).
    let corpse = null;
    const arise = u.ugrave_arise;
    const ariseUnset = arise == null || arise === NON_PM;
    const noCorpse = !!((game.mvitals?.[u.umonnum | 0]?.mvflags | 0) & G_NOCORPSE);
    if (bones_ok && ariseUnset && !noCorpse) {
        const mnum = Upolyd(u) ? (u.umonnum | 0) : (game.urace?.mnum | 0);
        const wasAlreadyGrave = IS_GRAVE(game.level?.at(u.ux | 0, u.uy | 0)?.typ);
        const plname = game.plname || 'Player';
        corpse = mk_named_object(CORPSE, mons(mnum), u.ux | 0, u.uy | 0, plname);
        make_grave(u.ux | 0, u.uy | 0, `${plname}, ${formatkiller(how, true)}`);
        if (IS_GRAVE(game.level?.at(u.ux | 0, u.uy | 0)?.typ) && !wasAlreadyGrave) {
            game.level.at(u.ux | 0, u.uy | 0).flags = 1;
        }
    }

    // C: score before bones [container gold]. deepest_lev_reached(FALSE);
    // net umoney0 gain less tithe below PANICKED; depth bonus; ascension
    // bonus for keeping the original deity (half via helm-of-OA return).
    // money_cnt is C's first COIN_CLASS stack (hack.c:4513–4522), not a sum.
    let umoney = money_cnt(game.invent);
    // C: umoney += hidden_gold(TRUE)
    umoney += hidden_gold(true);
    let tmp = umoney - (u.umoney0 | 0);
    if (tmp < 0) tmp = 0;
    if (how < PANICKED) tmp -= (tmp / 10) | 0;
    const deepest = deepest_lev_reached(false);
    tmp += 50 * (deepest - 1);
    if (deepest > 20) tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
    u.urexp = nowrap_add(u.urexp | 0, tmp);
    if (how === ASCENDED
        && ((u.ualign?.type | 0)
            === (u.ualignbase?.original ?? u.ualign?.type))) {
        const curBase = u.ualignbase?.current ?? u.ualign?.type;
        const origBase = u.ualignbase?.original ?? u.ualign?.type;
        // C u.urexp/2L — full-width trunc (urexp can exceed 2^31; |0 wraps).
        tmp = (curBase === origBase) ? (u.urexp | 0) : Math.trunc(u.urexp / 2);
        u.urexp = nowrap_add(u.urexp | 0, tmp);
    }

    // C end.c:1351-1361 — grave-arise feedback even when bones won't be
    // made (its presence must not tip off bones); flushed to the message
    // window before the bones query, like the C display_nhwindow.
    if (ismnum(u.ugrave_arise) && !(game.program_state?.done_stopprint | 0)) {
        const ariseAct = u.ugrave_arise !== PM_GREEN_SLIME
            ? 'body rises from the dead'
            : 'revenant persists';
        await pline(`Your ${ariseAct} as ${an(pmname(u.ugrave_arise, Ugender()))}...`);
        await flush_topl_more();
    }

    if (bones_ok) {
        // C: if (!wizard || paranoid_query(ParanoidBones, "Save bones?"))
        const flags = game.flags || {};
        const wizard = !!(flags.wizard || flags.debug);
        const paranoidBones = ((flags.paranoia_bits | 0) & PARANOID_BONES) !== 0;
        if (!wizard || (await paranoid_query(paranoidBones, 'Save bones?'))) {
            await savebones(how, endtime, corpse);
        }
        // corpse may be an invalid pointer now (C) — JS drops the binding.
        corpse = null;
    }

    // C gd.done_money = umoney — rip output can't use hidden_gold()
    // (containers are gone when bones were saved). rip.js reads it.
    game._done_money = umoney;

    // C really_done `:1433–1449` — zero valuables, get_valuables,
    // oc_cost score, then unique-item count. Only ESCAPED/ASCENDED
    // (bones_ok is false for those hows). Companion HP is `:1453–1476`
    // inside the NHW_TEXT arm. DUMPLOG listing remains named.
    if (how === ESCAPED || how === ASCENDED) {
        reset_valuables();
        get_valuables(game.invent);
        score_collected_valuables();
        artifact_score(game.invent, true);
    }

    // C really_done `:1376–1378` — wait_synch then free pickinv cache
    // before tearing down WIN_INVEN / drawing the RIP window.
    free_pickinv_cache();

    // C: outrip + goodbye into NHW_TEXT then display_nhwindow(TRUE)
    await show_death_rip_and_summary(how, umoney, endtime);

    // C really_done killer-name suffix, after the tombstone (which never
    // carries it) for the dumplog/topten record: Amulet; ESCAPED astral
    // disgrace or fake Amulet. carrying/Is_astralevel/uhave live.
    if (u.uhave?.amulet) {
        game.killer.name = `${game.killer?.name || ''} (with the Amulet)`;
    } else if (how === ESCAPED) {
        if (Is_astralevel(u.uz)) {
            game.killer.name = `${game.killer?.name || ''} (in celestial disgrace)`;
        } else if (carrying(FAKE_AMULET_OF_YENDOR)) {
            game.killer.name = `${game.killer?.name || ''} (with a fake Amulet)`;
        }
        /* don't bother counting to see whether it should be plural */
    }

    // C: !toptenwin → exit_nhwindows then topten raw_print; nh_terminate
    // captures final screen (contest nomux input boundary, no nhgetch).
    topten(how, endtime, formatkiller(how, true));
    // C: if (done_stopprint) { raw_print(""); raw_print(""); }
    if (game.program_state?.done_stopprint) {
        raw_print_blanks(2);
    }
    nh_terminate_capture();
}

/**
 * C ref: shk.c finish_paybill `:2723–2755` — repo-loc fallback (C tests
 * u.ux even when setting oy), unleash_all, invent gold → shkp, then
 * drop invent at ox,oy (no messages). Whole body live.
 */
async function finish_paybill() {
    const repo = game.repo || {};
    const shkp = repo.shopkeeper || null;
    let ox = repo.location?.x | 0;
    let oy = repo.location?.y | 0;
    const u = game.u || {};
    if (!isok(ox, oy)) {
        // C `:2735–2737` — off-map repo loc with a live shkp is impossible.
        if (shkp) await impossible('finish_paybill: bad location <%d,%d>.', ox, oy);
        ox = u.ux ? u.ux : (u.ux0 | 0);
        oy = u.ux ? u.uy : (u.uy0 | 0);
    }
    /* C shk.c:2745 — normally done by savebones, too late here */
    unleash_all();
    if (shkp) {
        // C `:2749` — first stack (hack.c:4513–4522), not a sum.
        const umoney = money_cnt(game.invent);
        if (umoney) money2mon(shkp, umoney);
    }
    await drop_upon_death(null, null, ox, oy);
}

/**
 * C ref: end.c done_in_by — "You die..." then done(how).
 * Ported: isshk → honorific + shkname + ", the shopkeeper" + KILLED_BY
 * (D-0313); G_UNIQ "the " (unless pname) + KILLED_BY with imitator /
 * High-Cleric gates (:195-205); minvis + hallucinogen-distorted prefixes
 * (:209-212); imitator "%s imitating %s" + vampshifter "in %s form" +
 * mimicker "disguised as %s" (:230-255); ispriest/isminion m_monnam
 * (:262-267); gendered pmname(Mgender) + "called"/"of" mgivenname suffix
 * (:270-282); killer-caused multi_reason trim (:288-316); killer-based
 * grave arise (wraith/mummy/zombie/vampire/ghoul, end.c:326-340) with the
 * genocided-arise reset. C mptr is mtmp->data here (the mimicker arm
 * resets it at :255; JS arise reads mtmp.data directly, same value).
 * Whole C body live (D-2770): named-ghost "the " (:212-216) + "ghost of"
 * (:260-263) via mptrNdx. Exact-omits: monhealthdescr (:217) stores empty
 * (C `#if 0`'d, pager.c:136-163; live js/pager.js twin agrees);
 * mark_synch (:196, win_mark_synch tty flush) is a platform no-op in JS;
 * the `#if 0` hardfought has_ebones arms (:210, :257-259) are dead in C.
 */
export async function done_in_by(mtmp, how = DIED) {
    // C end.c :195 — You("turn to stone...") / You("die...").
    await You(how === STONING ? 'turn to stone...' : 'die...');
    // C end.c :196 mark_synch — win_mark_synch tty flush; platform no-op
    // in JS (the awaited You above already flushed the topline).
    if (!game.killer) game.killer = { name: '', format: 0 };
    // C end.c done_in_by :183-190 — mptr/champtr + distorted/mimicker/imitator.
    const mnum = mtmp?.mnum;
    const mptr = mtmp?.data ?? (mnum != null ? mons(mnum) : null);
    const champtr = ismnum(mtmp?.cham) ? mons(mtmp.cham) : mptr;
    const distorted = Hallucination() && canspotmon(mtmp);
    const mimicker = M_AP_TYPE(mtmp) === M_AP_MONSTER;
    // C end.c:184-190 compares permonst pointers (mptr != champtr); mons()
    // returns a fresh object per call, so compare indices instead — birth-state
    // cham == mndx (makemon.c:1355-1359, mon.c:535-546) must read non-imitator.
    const mptrNdx = mptr?.mndx ?? mnum;
    const chamNdx = ismnum(mtmp?.cham) ? mtmp.cham : mptrNdx;
    const imitator = mptrNdx !== chamNdx || mimicker;
    // C: svk.killer.format = KILLED_BY_AN; then branch may override
    game.killer.format = KILLED_BY_AN;
    let buf = '';
    // C end.c :195-205 — G_UNIQ "the " (unless pname) + KILLED_BY.
    if (((mptr?.geno | 0) & G_UNIQ) !== 0 && !(imitator && !mimicker)
        && !((mnum | 0) === PM_HIGH_CLERIC && !mtmp?.ispriest)) {
        if (!type_is_pname(mptr)) buf += 'the ';
        game.killer.format = KILLED_BY;
    }
    // C end.c :212-216 — named-ghost "the " + KILLED_BY (the `#if 0`
    // hardfought has_ebones arm is dead; the live arm needs PM_GHOST +
    // mgivenname). mptrNdx is mptr here (imitator arm has not run yet).
    if (mptrNdx === PM_GHOST && has_mgivenname(mtmp)) {
        buf += 'the ';
        game.killer.format = KILLED_BY;
    }
    // C end.c :217 monhealthdescr — exact-omit: C stores empty (`#if 0`'d,
    // pager.c:136-163; live js/pager.js twin agrees), so buf is unchanged.
    // C end.c :218-221 — minvis / hallucinogen-distorted prefixes.
    if (mtmp?.minvis) buf += 'invisible ';
    if (distorted) buf += 'hallucinogen-distorted ';
    // C end.c :230-255 — imitator (shapeshifted killer). realnm is the
    // true form (champtr), shape is the apparent form with C article
    // rules (vampshifter/pname: bare; unique: "the"; else an()).
    if (imitator) {
        const gend = Mgender(mtmp);
        const realnm = pmname(champtr, gend);
        let fakenm = pmname(mptr, gend);
        const alt = is_vampshifter(mtmp);
        let shapeptr = mptr;
        if (mimicker) {
            // C: realnm already correct (champtr==mptr); fake from mappearance
            shapeptr = mtmp?.mappearance != null ? mons(mtmp.mappearance) : mptr;
            fakenm = pmname(shapeptr, gend);
        } else if (alt && strstri(realnm, 'vampire') && fakenm === 'vampire bat') {
            // C end.c imitator arm: !strcmp(fakenm, "vampire bat") → "bat",
            // i.e. "vampire in bat form", not "vampire in vampire bat form"
            fakenm = 'bat';
        }
        let shape;
        if (alt || type_is_pname(shapeptr)) shape = fakenm;
        else if (the_unique_pm(shapeptr)) shape = `the ${fakenm}`;
        else shape = an(fakenm);
          buf += alt ? `${realnm} in ${shape} form`
            : mimicker ? `${realnm} disguised as ${shape}`
            : `${realnm} imitating ${shape}`;
    // C end.c :260-263 — "ghost" (+ " of <name>"); the extra "the " came
    // from the :212 arm above. (C mptr was reset to mtmp->data at :255;
    // JS mptr never left it, so mptrNdx still reads it.)
    } else if (mptrNdx === PM_GHOST) {
        buf += 'ghost';
        if (has_mgivenname(mtmp)) buf += ` of ${MGIVENNAME(mtmp)}`;
    } else if (mtmp?.isshk) {
        // C end.c: isshk → "%s%s, the shopkeeper" + KILLED_BY
        const shknm = shkname(mtmp);
        const honorific = shkname_is_pname(mtmp)
            ? ''
            : (mtmp.female ? 'Ms. ' : 'Mr. ');
        buf += `${honorific}${shknm}, the shopkeeper`;
        game.killer.format = KILLED_BY;
    } else if (mtmp?.ispriest || mtmp?.isminion) {
        // C end.c :262-267 — m_monnam suppresses "the"/invisible and
        // overrides Hallucination on priestname()
        buf += m_monnam(mtmp);
    } else {
        // C end.c :270-282 — gendered pmname + named-killer suffix.
        buf += pmname(mnum, Mgender(mtmp));
        if (has_mgivenname(mtmp)) {
            buf += ` ${has_ebones(mtmp) ? 'of' : 'called'} ${MGIVENNAME(mtmp)}`;
        }
    }
    game.killer.name = buf;
    // C end.c :288-316 — killer-caused helplessness: multireasonbuf holds
    // 'm_id:reason' with multi_reason pointing past the "m_id:" prefix
    // (dynamic_multi_reason); when mtmp caused it, truncate at the first
    // space so formatkiller prints "Killed by a ghoul, while paralyzed."
    // instead of "..., while paralyzed by a ghoul."
    if (typeof game.multi_reason === 'string' && game.multi_reason
        && typeof game.multireasonbuf === 'string') {
        const m = /^(\d+):(.)/s.exec(game.multireasonbuf);
        const tail = m
            ? game.multireasonbuf.slice(m[1].length + 1) : null;
        if (m && tail === game.multi_reason
            && (mtmp?.m_id | 0) === (Number(m[1]) | 0)) {
            const spAll = game.multireasonbuf.indexOf(' ');
            if (spAll >= 0) game.multireasonbuf = game.multireasonbuf.slice(0, spAll);
            const sp = game.multi_reason.indexOf(' ');
            if (sp >= 0) game.multi_reason = game.multi_reason.slice(0, sp);
        }
    }
    // C end.c:326-340 — undead transformation at death: the killer's kind
    // sets ugrave_arise (mummy/zombie via the hero's race); a genocided
    // arise is suppressed. Feeds the really_done arise pline.
    const mdat = mtmp?.data;
    if (mdat) {
        const u = game.u || {};
        const raceMummy = game.urace?.mummynum ?? NON_PM;
        const raceZombie = game.urace?.zombienum ?? NON_PM;
        if (mdat.mlet === 'S_WRAITH') u.ugrave_arise = PM_WRAITH;
        else if (mdat.mlet === 'S_MUMMY' && raceMummy !== NON_PM) {
            u.ugrave_arise = raceMummy;
        } else if (zombie_maker(mtmp) && raceZombie !== NON_PM) {
            u.ugrave_arise = raceZombie;
        } else if (mdat.mlet === 'S_VAMPIRE'
            && (game.urace?.mnum | 0) === PM_HUMAN) {
            u.ugrave_arise = PM_VAMPIRE;
        } else if ((mdat.mndx ?? mtmp?.mnum) === PM_GHOUL) {
            u.ugrave_arise = PM_GHOUL;
        }
        if ((u.ugrave_arise | 0) >= LOW_PM
            && (((game.mvitals?.[u.ugrave_arise]?.mvflags) | 0) & G_GENOD)) {
            u.ugrave_arise = NON_PM;
        }
    }
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
 * C ref: bones.c give_to_nearby_mon `:226–255` (D-2034) — reservoir-sample
 * one object-liking monster on/adjacent to (x,y), skipping the hero's
 * square; give it otmp when it can carry, else place otmp on the floor.
 * Called only from drop_upon_death's `!rn2(8)` arm below.
 */
function give_to_nearby_mon(otmp, x, y) {
    let selected = null;
    let nmon = 0;
    // C: for (xx = x - 1; xx <= x + 1; ++xx)
    //        for (yy = y - 1; yy <= y + 1; ++yy)
    for (let xx = x - 1; xx <= x + 1; ++xx) {
        for (let yy = y - 1; yy <= y + 1; ++yy) {
            if (!isok(xx, yy)) continue;
            if (u_at(xx, yy)) continue;
            const mtmp = m_at(xx, yy);
            if (!mtmp) continue;
            // C: intentionally no check that otmp matches the likes_*
            // property — the monster takes what looks interesting.
            const mdat = mtmp.data;
            if (!(likes_gold(mdat) || likes_gems(mdat)
                  || likes_objs(mdat) || likes_magic(mdat))) continue;
            nmon++;
            if (!rn2(nmon)) selected = mtmp;
        }
    }
    if (selected && can_carry(selected, otmp)) add_to_minv(selected, otmp);
    else {
        // C is place_object only; stackobj is this file's pre-existing
        // floor convention (RNG-free), kept so the no-neighbour path is
        // unchanged from the deferred arm it replaces.
        place_object(otmp, x, y);
        stackobj(otmp);
    }
}

/**
 * C ref: mondata.c give_u_to_m_resistances — hero intrinsics to monster.
 * FIRE_RES..STONE_RES with the INTRINSIC bit become MR bits via prop.h
 * `res_to_mr` (`1 << (intr - 1)`); OR-accumulated into mintrinsics.
 * RNG-free, like C.
 */
function give_u_to_m_resistances(mtmp) {
    if (!mtmp) return;
    const uprops = game.u?.uprops;
    let bits = mtmp.mintrinsics | 0;
    for (let intr = FIRE_RES; intr <= STONE_RES; intr++) {
        if (((uprops?.[intr]?.intrinsic | 0) & INTRINSIC) !== 0)
            bits |= 1 << (intr - 1);
    }
    mtmp.mintrinsics = bits;
}

/**
 * C ref: bones.c drop_upon_death `:259–303` — curse invent; mtmp /
 * cont / nearby-gate placement; cont owt refresh.
 * C bones.c:279–280 `if (!mtmp || is_undead(mtmp->data))`
 * obj_no_longer_held(otmp) is live via the do.js export (D-2060 residual
 * retired here). Lit lamps and artifact lights are snuffed before
 * owornmask clears (artifact_light reads W_ARM).
 */
async function drop_upon_death(mtmp, cont, x, y) {
    const u = game.u || {};
    u.twoweap = false;
    if (!game.invent) game.invent = [];
    const { obj_no_longer_held } = await import('./do.js');
    while (game.invent.length) {
        const otmp = game.invent.shift();
        otmp.where = OBJ_FREE;
        otmp.nobj = null;

        // C bones.c:279–280 — slime keeps gear held; other arises do not
        if (!mtmp || is_undead(mtmp.data)) await obj_no_longer_held(otmp);

        // C `:283–285` — smother a burning light inside a statue, or an
        // artifact light, while owornmask is still set.
        if ((cont || artifact_light(otmp)) && obj_is_burning(otmp)) {
            end_burn(otmp, true);
        }
        otmp.owornmask = 0;

        // C `:287–288` after owornmask=0, before rn2(5) curse
        if ((otmp.otyp | 0) === SLIME_MOLD) goodfruit(otmp.spe);

        if (rn2(5)) curse(otmp);
        if (mtmp) {
            // C `:290` — the risen monster takes the hero's inventory.
            add_to_minv(mtmp, otmp);
        } else if (cont) {
            // C `:294–295` — into the statue, with no rn2(8) nearby gate
            void add_to_container(cont, otmp);
        } else if (!rn2(8)) {
            give_to_nearby_mon(otmp, x, y);
        } else {
            place_object(otmp, x, y);
            stackobj(otmp);
        }
    }
    // C `:301–302` — reweigh the statue after the drop loop
    if (cont) cont.owt = weight(cont);
}

/**
 * C ref: bones.c fixuporacle `:307–363` — Oracle stays only on the Oracle
 * level; set peaceful, keep when already in DELPHI, else move to the
 * original DELPHI chamber centre via enexto+rloc_to and restore rtype.
 */
async function fixuporacle(oracle) {
    // C: if (!Is_oracle_level(&u.uz)) return FALSE
    if (!Is_oracle_level(game.u?.uz)) return false;
    oracle.mpeaceful = 1;
    const rooms = game.level?.rooms || [];
    const loc = game.level?.at?.(oracle.mx | 0, oracle.my | 0);
    let o_ridx = (loc?.roomno | 0) - ROOMOFFSET;
    if (o_ridx >= 0 && (rooms[o_ridx]?.rtype | 0) === DELPHI) return true;
    let ridx = rooms.length;
    for (let i = 0; i < rooms.length; i++) {
        if ((rooms[i]?.orig_rtype | 0) === DELPHI) { ridx = i; break; }
    }
    if (o_ridx !== ridx && ridx < rooms.length) {
        const r = rooms[ridx];
        const cc = {
            x: (((r.lx | 0) + (r.hx | 0)) / 2) | 0,
            y: (((r.ly | 0) + (r.hy | 0)) / 2) | 0,
        };
        if (enexto(cc, cc.x, cc.y, oracle.data)) {
            await rloc_to(oracle, cc.x, cc.y);
            const loc2 = game.level?.at?.(oracle.mx | 0, oracle.my | 0);
            o_ridx = (loc2?.roomno | 0) - ROOMOFFSET;
        }
    }
    if (ridx === o_ridx && rooms[ridx]) rooms[ridx].rtype = DELPHI;
    return true;
}

/**
 * C ref: bones.c remove_mon_from_bones `:388–399` — wizards, Medusa,
 * quest nemesis/leader voices, Vlad (data or cham), and a displaced
 * Oracle leave via mongone before the bones level is saved.
 */
async function remove_mon_from_bones(mtmp) {
    if (!mtmp) return;
    const mptr = mtmp.data;
    const mndx = ((mptr?.mndx ?? mtmp.mnum ?? -1) | 0);
    // C monst.h:222 is_Vlad: data Vlad or cham Vlad (vampshifted).
    const isVlad = mndx === PM_VLAD || ((mtmp.cham | 0) === PM_VLAD);
    if (mtmp.iswiz || mndx === PM_MEDUSA
        || ((mptr?.msound | 0) === MS_NEMESIS) || ((mptr?.msound | 0) === MS_LEADER)
        || isVlad
        || (mndx === PM_ORACLE && !(await fixuporacle(mtmp)))) {
        await mongone(mtmp);
    }
}

/**
 * C ref: bones.c savebones `:403–625` whole body in C order (D-0274 ghost
 * envelope + VFS bones file; D-0581 wizard Replace; D-2060 statue arm).
 * Caller checked can_make_bones(). VFS probe stands in for open_bonesfile;
 * write_bonesfile is the create_bonesfile + savefruitchn + update_mlstmv +
 * savelev tail.
 * Named omissions: close_nhfile on the probe hit + the :622 tail close
 * (no VFS handle — atomic write_bonesfile subsumes close+commit);
 * create_bonesfile creat/errno/VMS arms (VFS creat cannot
 * fail, so neither can the wizard pline1(whynot); paniclog is by-design);
 * binary savelev record layout (JSON payload carries bonesid/fruitchn/level).
 */
async function savebones(how, when, corpse) {
    const u = game.u || {};
    const flags = game.flags || {};
    const wizard = !!(flags.wizard || flags.debug);

    // C `:410` — caller has already checked can_make_bones().
    clear_bypasses();

    // C `:411–428` open_bonesfile hit → wizard Replace? before any
    // make_bones mutation. Each return below is C `:430`
    // compress_bonesfile()+return (the single C site covers all three
    // JS early returns).
    if (bones_file_exists(u.uz)) {
        if (wizard) {
            if ((await yn_function(
                'Bones file already exists.  Replace it?', 'yn', 'n',
            )) === 'y') {
                if (!delete_bonesfile(u.uz)) {
                    // C `:421–422` plines then falls to compress+return.
                    await pline('Cannot unlink old bones.');
                    compress_bonesfile(); // C `:430`
                    return;
                }
                // fall through to make_bones
            } else {
                compress_bonesfile(); // C `:430`
                return;
            }
        } else {
            compress_bonesfile(); // C `:430`
            return;
        }
    }

    // C make_bones `:431–442`: unleash pets, unwear ball+chain while
    // Punished (disclosure already reported it), dismount the steed
    // before dead-monster cleanup.
    unleash_all();
    if (Punished()) unpunish(); /* unwear uball, destroy uchain */
    if (u.usteed) await dismount_steed(DISMOUNT_BONES);

    // C `:444–445` iter_mons(remove_mon_from_bones) then dmonsfree.
    await iter_mons(remove_mon_from_bones);
    await dmonsfree();

    // C bones.c:449 forget_engravings — the next hero hasn't read these.
    forget_engravings();

    // C savebones `:450–453` — negate all fids before drop_upon_death
    savebones_negate_fruit_ids();
    // C bones.c:455 — mark carried objects before they leave invent.
    set_ghostly_objlist(game.invent);

    // C `:457–505` arise if / LEAVESTATUE else-if / ghost else — exactly
    // one arm runs. The mtmp tail below is shared by arise + ghost.
    const arise = u.ugrave_arise;
    let mtmp = null;
    if (ismnum(arise)) {
        // C `:457–478` — the hero rises as an undead: create the
        // monster first (makemon draws next_ident/newmonhp before the
        // drop loop's rn2(5) curse draws), then drop the inventory into
        // it, with no rn2(8) nearby-monster gate in that arm.
        game.in_mklev = true; /* use <u.ux,u.uy> as-is */ // C `:459`
        mtmp = makemon(mons(arise), u.ux | 0, u.uy | 0, NO_MINVENT);
        game.in_mklev = false; // C `:461` — unconditional, not prev-restore
        if (!mtmp) { /* arise-type might have been genocided */
            await drop_upon_death(null, null, u.ux, u.uy);
            u.ugrave_arise = NON_PM; /* in case caller cares */
            return;
        }
        give_u_to_m_resistances(mtmp);
        mtmp = christen_monst(mtmp, game.plname || '');
        newsym(u.ux | 0, u.uy | 0);
        await drop_upon_death(mtmp, null, u.ux | 0, u.uy | 0);
        /* 'mtmp' now has hero's inventory; if 'mtmp' is a mummy, give it
           a wrapping unless already carrying one */
        if (mtmp.data?.mlet === 'S_MUMMY' && !m_carrying(mtmp, MUMMY_WRAPPING))
            mongets(mtmp, MUMMY_WRAPPING);
        await m_dowear(mtmp, true);
    } else if ((arise | 0) === LEAVESTATUE) {
        // C `:480–489` — statue instead of corpse; the drop loop
        // containers inventory in the statue (no rn2(8) gate), then the
        // shared bones tail with no ghost (mtmp NULL in C).
        const statue = mk_named_object(
            STATUE, mons((u.umonnum | 0)), u.ux | 0, u.uy | 0,
            game.plname || 'Player',
        );
        await drop_upon_death(null, statue, u.ux | 0, u.uy | 0);
        if (!statue) return; /* couldn't make statue */
        mtmp = null;
    } else { /* u.ugrave_arise < LEAVESTATUE */
        // C `:490–505` — drop everything, then trick makemon into
        // allowing monster creation on the hero's location for the ghost.
        await drop_upon_death(null, null, u.ux, u.uy);
        game.in_mklev = true; // C `:496`
        mtmp = makemon(mons(PM_GHOST), u.ux | 0, u.uy | 0, MM_NONAME);
        game.in_mklev = false; // C `:498` — unconditional, not prev-restore
        if (!mtmp) return;
        mtmp = christen_monst(mtmp, game.plname || '');
        if (corpse) obj_attach_mid(corpse, mtmp.m_id);
    }

    // C `:506–540` shared mtmp tail — hero level, hero-max HP, hero
    // gender, asleep, then the ebones death record for the next hero.
    if (mtmp) {
        mtmp.m_lev = (u.ulevel | 0) || 1;
        mtmp.mhp = mtmp.mhpmax = u.uhpmax | 0;
        mtmp.female = game.flags?.female ? 1 : 0;
        mtmp.msleeping = 1;

        if (!has_ebones(mtmp)) newebones(mtmp);
        if (has_ebones(mtmp)) {
            const eb = EBONES(mtmp);
            // C `:517–524` role/race index loops (`i <= NUM_*`; a miss
            // keeps the memset 0 — the impossible()s are commented out).
            // `?.` only guards the deliberate overrun slot.
            const rolename = game.urole?.name?.m || '';
            for (let i = 0; i <= NUM_ROLES; ++i) {
                if (rolename === roles[i]?.name?.m) {
                    eb.role = i;
                    break;
                }
            }
            const racenoun = game.urace?.noun || '';
            for (let i = 0; i <= NUM_RACES; ++i) {
                if (racenoun === races[i]?.noun) {
                    eb.race = i;
                    break;
                }
            }
            eb.oldalign = {
                type: u.ualign?.type | 0,
                record: u.ualign?.record | 0,
            };
            eb.deathlevel = u.ulevel | 0;
            eb.luck = u.uluck | 0; /* moreluck not included */
            eb.mnum = game.urole?.mnum | 0; /* C Role_switch */
            eb.female = game.flags?.female ? 1 : 0;
            eb.demigod = u.uevent?.udemigod ? 1 : 0;
            eb.crowned = u.uevent?.uhand_of_elbereth ? 1 : 0;
        }
    }

    // C `:541–551` — ghostly bit + resetobjs(FALSE) on every monster
    // inventory, untame pets, drop stale hero observations. mlstmv is 0
    // here; update_mlstmv stamps it at write time (write_bonesfile).
    for (const m of game.fmon || []) {
        if (!m) continue;
        set_ghostly_objlist(m.minvent);
        resetobjs(m.minvent, false);
        /* do not zero out m_ids for bones levels any more */
        m.mlstmv = 0;
        if (m.mtame) m.mtame = m.mpeaceful = 0;
        /* observations about the current hero won't apply to future game */
        m.seen_resistance = M_SEEN_NOTHING;
    }
    // C `:552–555` — traps lose their maker; only holes stay seen.
    for (let t = game.ftrap; t; t = t.ntrap) {
        t.madeby_u = 0;
        t.tseen = unhideable_trap(t.ttyp);
    }
    // C `:556–559` — floor and buried chains like the monster ones.
    set_ghostly_objlist(game.fobj);
    resetobjs(game.fobj, false);
    set_ghostly_objlist(game.level?.buriedobjlist);
    if (Array.isArray(game.level?.buriedobjlist)) {
        for (const o of game.level.buriedobjlist) resetobjs(o, false);
    } else {
        resetobjs(game.level?.buriedobjlist, false);
    }

    // C `:561–572` — hero leaves the map; the next hero has no memory
    // of the level. frpx/frpy come from the saved ux0/uy0 below.
    u.ux0 = u.ux | 0;
    u.uy0 = u.uy | 0;
    u.ux = u.uy = 0;

    /* Clear all memory from the level. */
    {
        const lvl = game.level;
        if (lvl?.locations) {
            // C `:567–572` seenv/waslit/glyph wipe per cell.
            for (let x = 0; x < lvl.locations.length; x++) {
                for (const cell of lvl.locations[x] || []) {
                    if (!cell) continue;
                    cell.seenv = 0;
                    cell.waslit = false;
                    cell.remembered_glyph = undefined;
                    cell.disp_ch = ' ';
                    cell.disp_color = 8; // NO_COLOR
                    cell.disp_decgfx = false;
                    cell.disp_attr = 0;
                    cell.gnew = 0;
                    cell.glyph_symidx = -1;
                }
            }
        }
        // C `:572` svl.lastseentyp[x][y] = 0.
        if (game.lastseentyp) game.lastseentyp = null;
    }

    // C `:574–599` — attach cemetery before create_bonesfile.
    // who = plname-ROL-RAC-GEN-ALI (playmode:debug → plname "wizard").
    const frpx = u.ux0 | 0;
    const frpy = u.uy0 | 0;
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
        how: formatkiller(how, true),
        when: yyyymmddhhmmss(when),
        frpx,
        frpy,
        bonesknown: false,
        next: game.level?.bonesinfo || null,
    };
    if (!game.level) game.level = {};
    game.level.bonesinfo = newbones;
    // C `:595–599` — flag wizard-mode bones (a previous bones level may
    // already carry the flag into a normal-mode game).
    if (wizard) {
        if (!game.level.flags) game.level.flags = {};
        game.level.flags.wizard_bones = 1;
    }

    // C `:600–625` — create_bonesfile, then mode = WRITING,
    // store_version, bonesid, savefruitchn, update_mlstmv, savelev,
    // commit + compress. The handle fields store_version reads match
    // files.c:849–857. write_bonesfile is the VFS savelev that follows
    // (creat/errno/commit arms named in the doc comment).
    const nhfp = new_nhfile();
    nhfp.ftype = NHF_BONESFILE;
    nhfp.mode = WRITING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.addinfo = true;
    nhfp.style.deflt = true;
    nhfp.style.binary = true;
    nhfp.fnidx = FNIDX_HISTORICAL;
    nhfp.fd = 0;
    store_version(nhfp);
    write_bonesfile(u.uz, nhfp.sf || null);
    compress_bonesfile(); // C `:624` (commit above named: atomic VFS write)
}

/**
 * C ref: hack.c losehp fatal → urgent_pline + done(DIED).
 * Call after losehp when `_losehp_needs_done` is set (C noreturn).
 */
export async function finish_losehp_done() {
    // C hack.c losehp: showdamage (`:4269`/:4280) precedes the branch
    // action, and the Upolyd `:4276` rehumanize arm precedes any later
    // branch — drain both first (no-ops when unset).
    await finish_losehp_showdamage();
    await finish_losehp_rehumanize();
    if (!game._losehp_needs_done) return;
    game._losehp_needs_done = false;
    await pline('You die...');
    await done(DIED);
}

/**
 * C ref: end.c done1 `:68–86` — SIGINT handler (Ctrl-C during play).
 * C order: ignore re-arm (`:71`) → debug_fuzzer off (`:73`) → ignintr
 * message-clear + nomul arm (`:74–82`) else done2() (`:83–84`).
 * Named omissions: signal() re-arms (`:71`, `:76`, no signals in scored
 * ESM); wait_synch (`:80`, no JS counterpart). C takes
 * `int sig_unused UNUSED`; signal-only, no C callers.
 */
export async function done1() {
    // C `:71` signal(SIGINT, SIG_IGN) — no signals in scored ESM.
    if (!game.iflags) game.iflags = {};
    game.iflags.debug_fuzzer = fuzzer_off; // C `:73`
    if (game.flags?.ignintr) { // C `:74`
        // C `:76` signal(SIGINT, done1) re-arm — no signals in scored ESM.
        clear_nhwindow_message(); // C `:78` clear_nhwindow(WIN_MESSAGE)
        await curs_on_u(); // C `:79`
        // C `:80` wait_synch — named omission (no JS counterpart).
        if ((game.multi | 0) > 0) // C `:81–82` gm.multi
            nomul(0);
    } else {
        await done2(); // C `:84`
    }
}

/**
 * C ref: end.c done2 `:90–148` — `#quit` (GENERALCMD, ECMD_OK; no turn).
 * C order: tutorial abandon gate (`:94–96`) → cancel arm (`:98–117`) →
 * wizard Dump-core arm (`:120–144`, unix `ynq("Dump core?")` `:130`) →
 * done(QUIT) (`:146`). ParanoidQuit getlin "yes" via paranoid_query
 * when the bit is set (D-0999).
 * Named omissions: signal() re-arms (`:101`, `:135`, no signals in
 * scored ESM); wait_synch (`:105`, no JS counterpart); exit_nhwindows
 * (`:140`, window teardown while the session continues); NH_abort
 * (`:141`, by-design C runtime — the port ends the run via
 * nh_terminate(EXIT_FAILURE) instead, skipping game-over processing
 * as C does). VMS/LATTICE prompt arms (`:122–129`) are not this build.
 */
export async function done2() {
    let abandon_tutorial = false; // C `:92`
    // C `:94–95` — In_tutorial gate; y_n 'y' abandons.
    if (In_tutorial(game.u?.uz)
        && (await y_n('Switch from the tutorial back to regular play?')) === 'y')
        abandon_tutorial = true; // C `:96`
    // C `:98–99` — abandon short-circuits the quit prompt.
    const flags = game.flags || {};
    const paranoidQuit = ((flags.paranoia_bits | 0) & PARANOID_QUIT) !== 0;
    if (abandon_tutorial
        || !(await paranoid_query(paranoidQuit, 'Really quit without saving?'))) {
        // C `:101` signal(SIGINT, done1) — no signals in scored ESM.
        // clear_nhwindow(WIN_MESSAGE) so the yn prompt does not linger
        // into the next nhgetch capture.
        clear_nhwindow_message(); // C `:103`
        await curs_on_u(); // C `:104`
        // C `:105` wait_synch — named omission (no JS counterpart).
        if ((game.multi | 0) > 0) // C `:106–107` gm.multi
            nomul(0);
        if ((game.multi | 0) === 0) { // C `:108`
            if (!game.u) game.u = {};
            game.u.uinvulnerable = false; // C `:109` avoid ctrl-C bug -dlc
            game.u.usleep = 0; // C `:110`
        }
        if (abandon_tutorial) // C `:113–115`
            schedule_goto(game.u.ucamefrom, UTOTYPE_ATSTAIRS, 'Resuming regular play.', null);
        return ECMD_OK; // C `:116`
    }

    // C `:120` — wizard ≡ flags.debug (flag.h:30); file convention also
    // honors flags.wizard (insight.js:468).
    if (game.flags?.debug || game.flags?.wizard) {
        const c = await ynq('Dump core?'); // C `:130`
        if (c === 'y') { // C `:133`
            // C `:135` signal(SIGINT, done1) — no signals in scored ESM.
            // C `:137–138` — nosound_procs leaves this NULL (sounds.c:1730).
            const exitSound = game.soundprocs?.sound_exit_nhsound;
            if (typeof exitSound === 'function') exitSound('done2');
            // C `:140–141` exit_nhwindows + NH_abort — window teardown +
            // process abort have no scored analogue (NH_abort by-design);
            // end the run without game-over processing, as C does.
            nh_terminate(EXIT_FAILURE);
            return ECMD_OK;
        } else if (c === 'q') { // C `:142–143`
            if (!game.program_state) game.program_state = {};
            game.program_state.done_stopprint =
                (game.program_state.done_stopprint | 0) + 1;
        }
    }

    await done(QUIT); // C `:146`
    return ECMD_OK;
}

/**
 * C ref: end.c done_intr `:154–164` — SIGINT/SIGQUIT ignore handler
 * (staticfn; `#ifndef NO_SIGNAL`, compiled in the contest unix build).
 * Named omissions: signal() ignores (`:157`, `:160`, no signals in
 * scored ESM). C takes `int sig_unused UNUSED`; signal-only, no C
 * callers besides done_hangup (`:175`).
 */
function done_intr() {
    if (!game.program_state) game.program_state = {};
    game.program_state.done_stopprint = // C `:156`
        (game.program_state.done_stopprint | 0) + 1;
    // C `:157–162` signal(SIGINT/SIGQUIT, SIG_IGN) — no signals in ESM.
}

/**
 * C ref: end.c done_hangup `:169–177` — hangup handler (staticfn; unix
 * arm `:166`, HANGUPHANDLING live per global.h:278).
 * Named omissions: sethanguphandler (`:174`, no signals in scored ESM).
 * C takes `(int sig)`; signal-only, no C callers.
 */
function done_hangup() {
    if (!game.program_state) game.program_state = {};
    game.program_state.done_hup = (game.program_state.done_hup | 0) + 1; // C `:172`
    // C `:174` sethanguphandler(SIG_IGN) — no signals in scored ESM.
    done_intr(); // C `:175`
}

/**
 * C ref: end.c savelife `:704–755` — restore viable state after
 * wizard/discover decline-to-die (or Lifesaved). Whole body live, in
 * C order: ulevel bulletproof, minuhpmax/setuhpmax, givehp, uhunger,
 * make_sick TIMEOUT==1 cure, nomovemsg/move/multi, lava reset_utrap,
 * botl/ugrave/HUnchanging, curs_on_u, !mon_moving endmultishot(FALSE),
 * uswallow expels / ustuck release + unstuck.
 * Callers: end.c:1094 amulet lifesave, end.c:1115 wizard/discover Die?;
 * end.c:952 fuzzer_savelife (debug-fuzz only, no JS counterpart — named).
 */
async function savelife(how) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    const givehp = 50 + 10 * ((acurr(A_CON) / 2) | 0); // C `:707`
    if ((u.ulevel | 0) < 1) u.ulevel = 1; // C `:711–712`
    const uhpmin = minuhpmax(10); // C `:713`
    if ((u.uhpmax | 0) < uhpmin) setuhpmax(uhpmin, true); // C `:714–715`
    u.uhp = Math.min(u.uhpmax | 0, givehp); // C `:716`
    if (Upolyd(u)) u.mh = Math.min(u.mhmax | 0, givehp); // C `:717–718`
    if ((u.uhunger | 0) < 500 || how === CHOKING) await init_uhunger(); // C `:719–721`
    // C `:724–726` — cure sickness expiring next turn (no time to fix).
    if (((u.Sick | 0) & TIMEOUT) === 1) await make_sick(0, null, false, SICK_ALL);
    game.nomovemsg = 'You survived that attempt on your life.'; // C `:727`
    if (!game.context) game.context = {};
    game.context.move = 0; // C `:728`
    game.multi = -1; // C `:730` — can't move again during the current turn
    const rolePm = game.urole?.malenum;
    game.multi_reason = (rolePm === PM_TOURIST) // C `:735–736`
        ? 'being toyed with by Fate'
        : 'attempting to cheat Death';
    if (game.context) {
        // No direct C counterpart (pre-existing stop-travel assist).
        game.context.run = 0;
        game.context.mv = 0;
    }
    // C `:738–739` — lava untrap has no restore message.
    if (u.utrap && (u.utraptype | 0) === TT_LAVA) await reset_utrap(false);
    flags.botl = true; // C `:740`
    u.ugrave_arise = NON_PM; // C `:741`
    u.HUnchanging = 0; // C `:742`
    await curs_on_u(); // C `:743` — cursor back on hero first.
    // C `:744–745` — stop a cross-death volley (non-verbose).
    if (!game.context.mon_moving) await endmultishot(false);
    if ((u.uswallow | 0)) { // C `:746–748` — may drop hero onto a trap again.
        await expels(u.ustuck, u.ustuck.data, true);
    } else if (u.ustuck) { // C `:749–754`
        if (Upolyd(u) && sticks(game.youmonst?.data))
            await You('release %s.', mon_nam(u.ustuck)); // C `:750–751`
        else
            await pline('%s releases you.', Monnam(u.ustuck)); // C `:752–753`
        await unstuck(u.ustuck); // C `:754`
    }
}

/**
 * C ref: end.c done — Lifesaved amulet (D-0868) then wizard·discover Die?.
 * Ordinary deaths fall through to really_done.
 * bot() before HP zero so You die more() (no bot) keeps prior botl when
 * uhp was -1 at pline flush (D-0310/D-0314).
 * Ported: done_seq catch-up (C :1050–1051), hangup Die? gate (C :1110),
 * last_msg PLNMSG_OK_DONT_DIE (C :1113; read by timeout.c:507 slime arm).
 * Named omissions: paniclog file write (Rule #2); fuzzer_savelife
 * (debug-fuzz only).
 */
export async function done(how) {
    const flags = game.flags || (game.flags = {});
    // C end.c:1024–1034 — TRICKED first: paniclog("trickery") is a file
    // write (Rule #2: named, not ported) that clears killer.name; a
    // wizard survives the trickery.
    if (how === TRICKED) {
        if (game.killer?.name) game.killer.name = '';
        if (flags.wizard || flags.debug) {
            await pline('You are a very tricky wizard, it seems.');
            if (game.killer) game.killer.format = KILLED_BY_AN; /* reset to 0 */
            return;
        }
    }
    // C `:1036–1044` — skip status update when panicking, on hangup
    // (done_hup; HANGUPHANDLING is defined, global.h:278), or QUIT with
    // done_stopprint ('q' to "Really quit?"): all three bot flags FALSE.
    const stopprint = game.program_state?.done_stopprint | 0;
    if (game.program_state?.panicking || (game.program_state?.done_hup | 0)
        || (how === QUIT && stopprint)) {
        flags.botl = false;
        flags.botlx = false;
        flags.time_botl = false;
    } else {
        flags.botlx = true;
        await bot();
    }
    // C end.c:1050–1054 — done_seq catches up to hero_seq (hero_seq lives
    // on game via allmain.js; done_seq is read by the debug-fuzz
    // fuzzer_savelife, named, and by the hangup Die? gate below).
    if ((game.done_seq | 0) < (game.hero_seq | 0)) game.done_seq = game.hero_seq | 0;
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
            // C end.c:1098–1100 — formatkiller + livelog LL_LIFESAVE
            // "averted death" (same-file formatkiller :518; pline.js live).
            const killbuf = formatkiller(how, false);
            livelog_printf(LL_LIFESAVE, 'averted death (%s)', killbuf);
            survive = true;
        }
    }
    // C: explore and wizard modes offer player the option to keep playing
    const wizard = !!(flags.wizard || flags.debug);
    const discover = !!(flags.explore || flags.discover);
    if (!survive && (wizard || discover) && how <= GENOCIDED) {
        const paranoidDie = ((flags.paranoia_bits | 0) & PARANOID_DIE) !== 0;
        // C end.c:1110 (HANGUPHANDLING, global.h:278) — on hangup the
        // unanswerable Die? defaults 'no', but only once per hero_seq;
        // the post-increment compare runs only when done_hup is set.
        let hangupNo = false;
        if ((game.program_state?.done_hup | 0)) {
            const seq = game.done_seq | 0;
            game.done_seq = seq + 1;
            hangupNo = (seq === (game.hero_seq | 0));
        }
        if (!hangupNo && !(await paranoid_query(paranoidDie, 'Die?'))) {
            await pline(
                `OK, so you don't ${how === CHOKING ? 'choke' : 'die'}.`,
            );
            // C end.c:1113 — timeout.c:507 slimed_to_death reads this for
            // the "Yes, you do." vs "Unfortunately," genocide follow-up.
            if (game.iflags) game.iflags.last_msg = PLNMSG_OK_DONT_DIE;
            await savelife(how);
            survive = true;
        }
    }

    if (survive) {
        game.killer.name = '';
        game.killer.format = KILLED_BY_AN;
        // C end.c done — savelife / wizard-Discover `Die?` decline returns
        // normally (no really_done); the JS-invented gameover flag must clear
        // so moveloop keeps driving (scen-wish-Valkyrie-92014 step 48).
        if (!game.program_state) game.program_state = {};
        game.program_state.gameover = false;
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

/**
 * C lint.h `debugpline1` (`:61`) — DEBUG is on (`patchlevel.h:36`).
 * `showdebug("end.c")` is `debugcore(file, TRUE)`. The false arm does
 * not pline and does not touch `iflags.last_msg`. The true arm's
 * `pline` is async, so this sync caller starts it and then restores
 * `last_msg` the way C does after `pline` returns; the restore can
 * land before that promise finishes.
 * @param {number} id
 */
function debugpline1_end(id) {
    if (!debugcore('end.c', true)) return; // lint.h:33
    const iflags = game.iflags;
    const save = iflags ? iflags.last_msg : 0; // lint.h:34
    void pline('freed delayed killer #%d', id | 0); // end.c:1755
    if (iflags) iflags.last_msg = save; // lint.h:36
}

/**
 * C ref: end.c dealloc_killer `:1738–1757`.
 * Unlink one delayed-killer node. A null pointer returns. A pointer
 * that is not on `svk.killer`'s list is `impossible`. `free` drops the
 * node (GC once nothing else holds it).
 */
export function dealloc_killer(kptr) {
    // C `:1740` prev = &svk.killer. A missing sentinel is an empty list.
    if (kptr == null) return; // C `:1742–1743`
    const head = game.killer;
    let prev = head;
    let k = head ? (head.next ?? null) : null; // C `:1744`
    for (; k != null; k = k.next ?? null) {
        if (k === kptr) break; // C `:1745–1746`
        prev = k; // C `:1747`
    }
    if (k == null) { // C `:1750–1751`
        void impossible('dealloc_killer (#%d) not on list', kptr.id | 0);
    } else {
        prev.next = k.next ?? null; // C `:1753`
        // C `:1754` free(k) — unlinked node is garbage-collected.
        debugpline1_end(kptr.id | 0); // C `:1755`
    }
}

/**
 * C ref: end.c save_killers `:1760–1776` (called from save.c `:293`).
 * JSON analogue of the update_file arm (`:1764–1767` Sfo_kinfo per node,
 * sentinel first): persist the delayed-killer chain as plain records with
 * the struct's data fields (hack.h `:598–606` id, format, name).
 * VFS always writes, so there is no update_file gate; the release_data
 * FREEING arm (`:1769–1774` free nodes past the sentinel) is omitted —
 * in-memory state stays (save_oracles/save_msghistory precedent) — and
 * the save.c `:1097` free_killers exit-free has no JS path (GC). Named.
 * @returns {{id:number,format:number,name:string}[]}
 */
export function save_killers() {
    const out = []; // C `:1763` kptr = &svk.killer
    for (let k = game.killer; k; k = k.next ?? null) { // C `:1764`
        out.push({ // C `:1766` Sfo_kinfo
            id: k.id | 0,
            format: k.format | 0,
            name: String(k.name || ''),
        });
    }
    return out;
}

/**
 * C ref: end.c restore_killers `:1780–1790` (called from restore.c `:653`).
 * JSON analogue of the Sfi_kinfo loop (`:1784–1789` read into the sentinel,
 * alloc each further node): rebuild the chain from records. A missing or
 * empty key is an old save — leave the fresh-boot sentinel alone
 * (restore_oracles precedent).
 */
export function restore_killers(saved) {
    if (!Array.isArray(saved) || saved.length === 0) return; // old save
    game.killer = null; // C `:1784` first read lands on &svk.killer
    let tail = null;
    for (const rec of saved) {
        const node = { // C `:1787` alloc(sizeof (struct kinfo))
            id: rec?.id | 0,
            format: rec?.format | 0,
            name: String(rec?.name || ''),
            next: null, // C `:1786` null-terminates until the next read
        };
        if (!game.killer) game.killer = node;
        else tail.next = node;
        tail = node;
    }
}

/* C `isspace((uchar) *p)` over the C locale — the six ASCII blanks
 * (options.js `isOptSpace` precedent, same set; no unicode folding). */
function isEndSpace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\v'
        || ch === '\f' || ch === '\r';
}

/**
 * C ref: end.c wordcount `:1793–1806` (staticfn, file-local here too).
 * Counts whitespace-separated words; C advances its local `char *p`.
 */
function wordcount(p) {
    let words = 0; // C `:1795`
    let i = 0;
    while (i < p.length) { // C `:1797` while (*p)
        while (i < p.length && isEndSpace(p[i])) i++; // C `:1798–1799`
        if (i < p.length) words++; // C `:1800–1801`
        while (i < p.length && !isEndSpace(p[i])) i++; // C `:1802–1803`
    }
    return words; // C `:1805`
}

/**
 * C ref: end.c bel_copy1 `:1809–1820` (staticfn, file-local here too).
 * Appends the next whitespace-delimited word of the input to `out`.
 * `st` ({ i }) stands in for C's `char **inp`: it skips leading blanks
 * (`:1813–1814`), copies the word (`:1815–1816`), NUL-terminates
 * (`:1817`, the returned string), and leaves the cursor past the word
 * (`:1818`); the caller's `out += strlen(out)` (`:1812`) is the `out +`
 * accumulation in the return value.
 */
function bel_copy1(str, st, out) {
    let i = st.i;
    while (i < str.length && isEndSpace(str[i])) i++;
    let word = '';
    while (i < str.length && !isEndSpace(str[i])) word += str[i++];
    st.i = i;
    return out + word;
}

/**
 * C ref: end.c build_english_list `:1823–1859` in C order.
 * Turns a blank-separated name list into English ("a", "a or b",
 * "a, b, or c"). Async only because the case-0 arm awaits the live
 * `impossible` (display.js; JS has no sync abort).
 * Live-C caller: cfgfiles.c cnf_line_WIZARDS `:806` uses the shared
 * config formatter below; its wordless-value diagnostic is a named
 * omission because the config parser remains synchronous. The other
 * C call site, sys/unix/unixmain.c `:659`, is platform main (never
 * ported — named omission, map). Consumers of the formatted list —
 * end.c panic `:435`, pager.c docontact `:2728`, sys.c exit cleanup
 * `:154` — retain their existing platform-specific omissions.
 * @returns {Promise<string>} the formatted list ('' when wordless, like C).
 */
export async function build_english_list(input) {
    const result = english_list_parts(input);
    if (!result.words) // C :1835–1837, before returning the empty output
        await impossible('no words in list');
    return result.out;
}

/**
 * Shared C formatter for synchronous cnf_line_WIZARDS configuration.
 * Named omit: end.c:1836 impossible on a wordless value; CR/VT/FF can
 * survive mungspaces. The async public wrapper retains that diagnostic.
 */
export function build_english_list_config(input) {
    return english_list_parts(input).out;
}

function english_list_parts(input) {
    const p = String(input ?? ''); // C `:1826` char *p = in
    // C `:1827–1832`: strlen + wordcount sizing + alloc(len + 1) +
    // *out = '\0' — JS strings grow on append, so the sizing has no
    // representable effect; only the word count is observed.
    const st = { i: 0 };
    let words = wordcount(p);
    const originalWords = words;
    let out = '';

    switch (words) { // C `:1834`
    case 0: // C `:1835–1837`
        // The public wrapper emits impossible before returning this output.
        break;
    case 1: // C `:1838–1840` "single"
        out = bel_copy1(p, st, out);
        break;
    default: // C `:1841–1856`
        if (words === 2) { // C `:1842–1845` "first or second"
            out = bel_copy1(p, st, out);
            out += ' '; // C `:1844` Strcat(out, " ")
        } else { // C `:1845–1851` "first, second, or third"
            do {
                out = bel_copy1(p, st, out);
                out += ', '; // C `:1848` Strcat(out, ", ")
            } while (--words > 1); // C `:1849`
        }
        out += 'or '; // C `:1852` Strcat(out, "or ")
        out = bel_copy1(p, st, out); // C `:1853`
        break;
    }
    return { words: originalWords, out }; // C `:1857`, plus wrapper guard
}
