// js/do_name.js — port of nethack-c/src/do_name.c
//

import { monPmname, permonstTemplate } from './makemon.js';
import { pushRngLogEntry } from './rng.js';
import { rn2, rn2_on_display_rng } from './rnd.js';
import { get_rnd_line_from_section } from './mklev.js';
import { BOGUSMON_LINES, BOGUSMON_OFFSETS, BOGUSMON_SIZE, MD_PAD_BOGONS } from './bogusmon_data.js';
import { ENV } from './hostenv.js';
import { game } from './gstate.js';
import { The } from './objnam.js';
import { Upolyd } from './const.js';
import { is_youmonst } from './mhitm.js';
import { ismnum, NEUTRAL, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM } from './const.js';
import { impossible } from './steed.js';
import { GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HAND, INV_ORDER, MS_ANIMAL, OCLASS_FOOD, OCLASS_NAME, OCLASS_POTION, OCLASS_WEAPON, SPE_NOVEL_OTYP as SPE_NOVEL, SetVoice, _ach_rank_of, _cmd_Hallucination, _disco_append_price_quote, _disco_typename, _fl_pmidx, _glyph_at as glyph_at, _hidesUnder_useupf, _interesting_to_discover, _plineVFmt, _restrict_name, _um_beautiful, _um_mhis, _uprop_active, body_part, cmdq_clear, cmdq_pop, flooreffects_is_plural, getObjFromGetobj, set_cursor, type_is_pname, verbalize } from './cmd.js';
import { getpos } from './getpos.js';
import { carrying } from './invent.js';
import { donamelevel } from './dungeon.js';
import { look_at_object } from './pager.js'; // relocate-fns
import { build_window_screen, menu_search_case } from './com_pager.js'; // relocate-fns
import { ARTICLE_THE, CMDQ_KEY, CQ_CANNED, ECMD_OK, GETOBJ_NOFLAGS, GETOBJ_PROMPT, HALLUC, HALLUC_RES, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, OBJ_FREE, OBJ_INVENT, ONAME_KNOW_ARTI, ONAME_VIA_NAMING, PICK_ONE, PL_PSIZ, has_mgivenname, isok, u_at } from './const.js'; // relocate-fns
import { GLYPHCLS_OBJ, GLYPHCLS_SWALLOW, await_menu_key, canspotmon, docorner_blank_utf8_captures, docrt, flush_screen, force_more_pages, see_with_infrared, sensemon } from './display.js'; // relocate-fns
import { You, xname } from './do_wear.js'; // relocate-fns
import { shkname as dokick_shkname } from './dokick.js'; // relocate-fns
import { newobj } from './game.js'; // relocate-fns
import { mungspaces, upstart } from './hacklib.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { mhe } from './makemon.js'; // relocate-fns
import { helpless } from './mhitm.js'; // relocate-fns
import { OC_USES_KNOWN } from './mklev.js';
import { dealloc_obj } from './mkobj.js';
import { wipeout_text } from './engrave.js'; // relocate-fns
import { OC_NAME } from './oc_name_data.js';
import { discover_object, undiscover_object } from './o_init.js'; // relocate-fns
import { CXN_NORMAL, Ysimple_name2, simpleonames as _ia_simpleonames, an, getObjDescr, xname_flags } from './objnam.js';
import { artifact_name as artifact_name_exported, exist_artifact } from './artifact.js'; // relocate-fns
import { pline, There } from './pline.js'; // relocate-fns
import { NUMMONS, PM_DEATH, PM_FAMINE, PM_GHOST, PM_JUIBLEX, PM_PESTILENCE } from './pm.generated.js'; // relocate-fns
import { COIN_CLASS } from './shk.js';
import { safe_qbuf as inventory_safe_qbuf } from './objnam.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { m_at } from './uhitm.js'; // relocate-fns
import { cansee } from './vision.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { xm_has_mgivenname } from './mhitm.js';
import { SUPPRESS_SADDLE } from './const.js';
import { NH_BLACK, NH_BLUE, NH_GOLDEN, NH_PURPLE, NH_RED, NH_SILVER } from './read.js'; // relocate-fns
import { NON_PM } from './const.js'; // relocate-fns
import { PM_LONG_WORM, PM_LONG_WORM_TAIL } from './pm.generated.js'; // relocate-fns
import { m_at as monster_at } from './uhitm.js'; // relocate-fns
import { menucolor_text } from './coloratt.js'; // windows.c:1796 add_menu menucolor
export { read_tribute } from './files.js'; // relocate-fns

// C do_name.c:16-27: names share five reusable buffers; retain the cell
// rather than copying its text when C keeps a char * across other calls.
export function nextmbuf() {
    const pool = game._mbufs ||= { index: 0, cells: Array.from({ length: 5 }, () => ({ text: '' })) };
    pool.index = (pool.index + 1) % pool.cells.length;
    return pool.cells[pool.index];
}
export function currentmbuf() { return game._mbufs.cells[game._mbufs.index]; }

/* C monflag.h enum mgender { MALE, FEMALE, NEUTRAL, NUM_MGENDERS } */
import { MALE, FEMALE } from './const.js';
import { rename_disco } from './o_init.js'; // relocate-fns
import './mhitm.js'; // relocate-fns
import { artifact_exists, set_artifact_intrinsic } from './artifact.js'; // relocate-fns
import { LL_ARTIFACT, LL_CONDUCT, ONAME_SKIP_INVUPD, W_WEP as W_WEP_D } from './const.js'; // relocate-fns
import { ansimpleoname, bare_artifactname } from './objnam.js'; // relocate-fns
import { livelog_printf } from './pline.js'; // relocate-fns
import { alter_cost } from './shk.js'; // relocate-fns
import { untwoweapon } from './wield.js'; // relocate-fns
import { rank_of } from './botl.js'; // relocate-fns
import { ARTICLE_A, ARTICLE_NONE, ARTICLE_YOUR, AUGMENT_IT, FALSE, In_endgame, Is_astralevel, PRONOUN_HALLU, SUPPRESS_HALLUCINATION, SUPPRESS_INVISIBLE, SUPPRESS_IT, SUPPRESS_MAPPEARANCE, SUPPRESS_NAME, TRUE, W_SADDLE } from './const.js'; // relocate-fns
import { shkname } from './dokick.js'; // relocate-fns
import { lcase, s_suffix } from './hacklib.js'; // relocate-fns
import { newmextra } from './makemon.js'; // relocate-fns
import { M1_ANIMAL, M1_MINDLESS, M_AP_TYPMASK, PM_HIGH_CLERIC, SPBOOK_CLASS, TOOL_CLASS, m_next2u, xm_Blind, xm_Hallucination, xm_same_monst } from './mhitm.js'; // relocate-fns
import { newoextra } from './mkobj.js'; // relocate-fns
import { MKOBJ_OC_CLASS } from './mkobj_data.js'; // relocate-fns
import { pronoun_gender } from './mondata.js'; // relocate-fns
import { just_an } from './objnam.js'; // relocate-fns
import { nh_getenv } from './options.js'; // relocate-fns
import { PM_ARCHEOLOGIST, PM_SHOPKEEPER, PM_WIZARD, PM_WIZARD_OF_YENDOR } from './pm.generated.js'; // relocate-fns
import { priestname } from './priest.js'; // relocate-fns
import { rn1 } from './rng.js'; // relocate-fns
import { ARMOR_CLASS, GEM_CLASS } from './uhitm.js'; // relocate-fns

function ONAME(o) {
    return o.oextra.oname;
}
function has_oname(o) {
    return Boolean(o.oextra && ONAME(o));
}

/* safe_oname — C ref: nethack-c/src/do_name.c:94-100
 *   const char *safe_oname(struct obj *obj)
 *   { if (has_oname(obj)) return ONAME(obj); return ""; }
 * Always returns a valid string: the object's given name if it has one, or
 * an empty string otherwise. No RNG, no state change. */
export function safe_oname(obj) {
    if (has_oname(obj))
        return ONAME(obj);
    return "";
}

/* Mgender — C ref: nethack-c/src/do_name.c:1289-1300
 *   int Mgender(struct monst *mtmp) {
 *       int mgender = MALE;
 *       if (mtmp == &gy.youmonst) { if (Upolyd ? u.mfemale : flags.female) mgender = FEMALE; }
 *       else if (mtmp->female) mgender = FEMALE;
 *       return mgender;
 *   }
 */
export function Mgender(mtmp) {
    return (is_youmonst(mtmp) ? (Upolyd(game.u) ? game.u.mfemale : game.flags.female) : mtmp.female) ? FEMALE : MALE;
}

export function mon_pmname(mon) {
    const pmidx = mon.data?.pmidx;
    return monPmname(typeof pmidx === 'number' ? (pmidx | 0) : (mon.data_mndx | 0), Mgender(mon));
}


/* C do_name.c:1364 `const char bogon_codes[] = "-_+|=";` — see dat/bogusmon.txt. */
const bogon_codes = '-_+|=';

/* C do_name.c:1368-1383 bogusmon(buf, code) — a random line of dat/bogusmon,
 * with its leading bogon code (if any) stripped off into *code. */
export function bogusmon(code) {
    /* C: get_rnd_text(BOGUSMONFILE, buf, rn2_on_display_rng, MD_PAD_BOGONS).
     * "might fail (return empty buf[]) if the file isn't available" — the table
     * is generated from the compiled chunk and is never empty here. */
    let mnam = get_rnd_line_from_section(BOGUSMON_LINES, BOGUSMON_OFFSETS,
                                         BOGUSMON_SIZE, rn2_on_display_rng,
                                         MD_PAD_BOGONS);
    if (!mnam)
        return { name: 'bogon', code: '\0' };
    if (bogon_codes.indexOf(mnam[0]) >= 0)  /* strip prefix if present */
        return { name: mnam.slice(1), code: mnam[0] };
    return { name: mnam, code: '\0' };
}

/* C do_name.c:1387-1409 rndmonnam(code) — "return a random monster name, for
 * hallucination".
 *
 *     do {
 *         name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
 *     } while (name < SPECIAL_PM
 *              && (type_is_pname(&mons[name]) || (mons[name].geno & G_NOGEN)));
 *     if (name >= SPECIAL_PM) mnam = bogusmon(buf, code);
 *     else mnam = strcpy(buf, pmname(&mons[name], rn2_on_display_rng(2)));
 *
 * The rejection loop redraws, so the number of display draws depends on the
 * values themselves — a reason to keep it verbatim rather than "optimise" it
 * into a filtered table.
 *
 * Returns the name; the out-parameter `code` is returned alongside it because
 * JS has no char*, and priestname()/x_monnam() feed it to bogon_is_pname().
 */
const BOGUSMONSIZE = 100;                /* C do_name.c:1392 (arbitrary) */
const LOW_PM_DN = 0;                     /* C monsym.h:15 NON_PM + 1 */
const SPECIAL_PM_DN = 330;               /* C monsym.h:23 PM_LONG_WORM_TAIL */
const G_NOGEN_DN = 0x0200;               /* C monflag.h:197 */
const M2_PNAME_DN = 0x00080000;          /* C monflag.h M2_PNAME */
export function rndmonnam_ex() {
    let name;
    do {
        name = rn2_on_display_rng(SPECIAL_PM_DN + BOGUSMONSIZE - LOW_PM_DN) + LOW_PM_DN;
    } while (name < SPECIAL_PM_DN && _rndmonnam_rejected(name));

    if (name >= SPECIAL_PM_DN) {
        const out = bogusmon();
        if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
            pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=${out.code.charCodeAt(0) || 0} pick=${name}]`);
        return out;
    }
    /* C mondata.h pmname(pm, mgender); rn2_on_display_rng(2) is MALE/FEMALE. */
    const out = { name: monPmname(name, rn2_on_display_rng(2)), code: '\0' };
    if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
        pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=0 pick=${name}]`);
    return out;
}
/* C do_name.c:1400-1402 rejection test — `type_is_pname(&mons[name])
 * || (mons[name].geno & G_NOGEN)`.  C mondata.h:135
 * type_is_pname(ptr) = ((ptr->mflags2 & M2_PNAME) != 0L). */
function _rndmonnam_rejected(mndx) {
    const ptr = permonstTemplate(mndx);
    if (!ptr) return true;
    return ((ptr.mflags2 >>> 0) & M2_PNAME_DN) !== 0
        || ((ptr.geno | 0) & G_NOGEN_DN) !== 0;
}
/* The C-signature form: callers that do not want the bogon code just take the
 * name.  (C's rndmonnam(NULL) is the majority of its 15 call sites.) */
export function rndmonnam(code) {
    const out = rndmonnam_ex();
    if (code && typeof code === 'object')
        code.code = out.code; // C do_name.c:1396-1408, optional char * output
    return out.name;
}

/* C do_name.c:1414-1420 bogon_is_pname(code) — "check bogusmon prefix to
 * decide whether it's a personal name".  Note it tests "-+=", a HARD-CODED
 * SUBSET of bogon_codes ("-_+|="), exactly as C's own comment at :1362 warns;
 * ported as the subset, not as bogon_codes. */
export function bogon_is_pname(code) {
    if (!code || code === '\0')
        return false;
    return '-+='.indexOf(code) >= 0;
}

const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown"
];
/* C do_name.c:1604-1608 — the variant-spelling index macros.  Only
 * lookup_novel() reads them and that function has no caller in js/ yet; they
 * are kept here so a future lookup_novel() port cannot silently renumber. */
export const NVL_COLOUR_OF_MAGIC = 0;
export const NVL_SOURCERY = 4;
export const NVL_MASKERADE = 17;
export const NVL_AMAZING_MAURICE = 27;
export const NVL_THUD = 33;

export function noveltitle(novidx) {
    const k = sir_Terry_novels.length;
    let j = rn2(k);

    if (novidx) {
        if ((novidx.value | 0) === -1)
            novidx.value = j;
        else if ((novidx.value | 0) >= 0 && (novidx.value | 0) < k)
            j = novidx.value | 0;
    }
    return sir_Terry_novels[j];
}

/* C do_name.c:1625-1661 lookup_novel().  Novel names are compared
 * case-insensitively, with or without the leading article, and a handful of
 * established American/variant spellings map to the canonical title. */
export function lookup_novel(lookname, idx) {
    const fold = (s) => String(s ?? '').toLowerCase();
    let name = String(lookname ?? '');
    if (fold(The(name)) === 'the color of magic')
        name = sir_Terry_novels[NVL_COLOUR_OF_MAGIC];
    else if (fold(name) === 'sorcery')
        name = sir_Terry_novels[NVL_SOURCERY];
    else if (fold(name) === 'masquerade')
        name = sir_Terry_novels[NVL_MASKERADE];
    else if (fold(The(name)) === 'the amazing maurice')
        name = sir_Terry_novels[NVL_AMAZING_MAURICE];
    else if (fold(name) === 'thud')
        name = sir_Terry_novels[NVL_THUD];

    for (let k = 0; k < sir_Terry_novels.length; k++) {
        const title = sir_Terry_novels[k];
        if (fold(name) === fold(title) || fold(The(name)) === fold(title)) {
            if (idx)
                idx.value = k;
            return title;
        }
    }
    const prior = idx ? (idx.value | 0) : -1;
    if (idx && prior >= 0 && prior < sir_Terry_novels.length)
        return sir_Terry_novels[prior];
    return null;
}



// C ref: do_name.c docallcmd() — "What do you want to name?" menu.
// Shows a window overlay at WIN_COL=32 with naming options m/i/o/f/d/a.
// C call chain: doextcmd → docallcmd → create_nhwindow → select_menu
//   → win_display_nhwindow → tty_display_nhwindow → build window lines
export async function docallcmd() {
    const g = game;
    // C do_name.c:505-512: item actions queue the naming mode before invlet.
    let selKey;
    const queued = cmdq_pop();
    if (queued) {
        if (queued.typ === CMDQ_KEY) selKey = queued.key;
        else { cmdq_clear(CQ_CANNED); selKey = 0; }
    } else {
    /* C ref: do_name.c docallcmd — WIN_COL computed by right-aligning
     * longest line to col 79 (0-indexed). Longest line is:
     * 'a - record an annotation for the current level' = 46 chars
     * WIN_COL = 80 - 46 - 2 = 32                                         */
    const WIN_COL = 32;
    /* Window lines mirror C's docallcmd menu (do_name.c:499-530).
     * Row 0: highlighted title. Rows 1-8: menu items + (end).            */
    /* do_name.c:507,521-548 — with flags.lootabc the rows carry selector 0
     * (auto-lettered a,b,c... in order) instead of m/i/o/f/d/a; the pick is
     * still any.a_char and the group accelerators are unchanged. */
    const abc = !!(g.flags && g.flags.lootabc);
    const rows = [['m', 'a monster']];
    if (g.invent) {
        rows.push(['i', 'a particular object in inventory']);
        rows.push(['o', 'the type of an object in inventory']);
    }
    rows.push(['f', 'the type of an object upon the floor'],
              ['d', 'the type of an object on discoveries list'],
              ['a', 'record an annotation for the current level']);
    const shown = rows.map((r, i) => (abc ? String.fromCharCode(97 + i) : r[0]));
    const windowLines = [
        menu_heading_text('What do you want to name?'), /* do_name.c:550 end_menu; wintty.c:2688 */
        '',
        /* windows.c:1796-1816 add_menu menucolors the raw str before tty composes "%c - %s" */
        ...rows.map((r, i) => shown[i] + ' - ' + menucolor_text(r[1])),
        '(end)'];
    /* Build the screen with the window overlay using the game map.
     * uac: use game.u.uac (post-find_ac value) for status line 2.       */
    const uac = g.u?.uac ?? 0;
    /* C wintty.c:1927 — `!iflags.menu_overlay` drops the NHW_MENU to offx 0 and
     * clears the whole screen: one-space margin, "(end) " footer. */
    const ncFullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    let screenOutput = ncFullScreen
        ? Array.from({ length: 24 }, (_, i) => (i < windowLines.length ? ` ${windowLines[i]}` : '')).join('\n')
        : build_window_screen(windowLines, WIN_COL, uac);
    /* Cursor after '(end)': WIN_COL + len('(end)') + 1 = 32 + 5 + 1 = 38
     * Row = windowLines.length - 1 = 8 (0-indexed screen row)           */
    const endRow = windowLines.length - 1; // 8
    const endCursorCol = ncFullScreen ? 1 + '(end) '.length : WIN_COL + 5 + 1; // 32 + 5 + 1 = 38
    const showCallMenu = async () => {
        g._screen_output = screenOutput;
        set_cursor(endCursorCol, endRow);
    };
    // C wintty.c:1700-1730: search the stored rows; getlin erases row 0.
    let searchPick = null;
    const searchCallMenu = async () => {
        const finished = await menu_search_case('ONE',
            rows.map((r, i) => ({ str: shown[i] + ' - ' + r[1], key: shown[i] })),
            () => screenOutput.split('\n'), (row) => { searchPick = row.key.charCodeAt(0); });
        screenOutput = ['', ...screenOutput.split('\n').slice(1)].join('\n');
        return finished;
    };
    /* wintty.c:1921 tty_display_nhwindow(NHW_MENU) more()s a standing topline */
    if (g._pending_message) await force_more_pages(g._pending_message);
    await showCallMenu();
    /* Read user selection — C ref: do_name.c:551 select_menu(win, PICK_ONE, ...)
     * -> win/tty/wintty.c process_menu_window.  This was a BARE nhgetch(), which
     * closed the menu on ANY key; C rings the bell and redraws the same page for
     * a key outside the response set (wintty.c:1738), so every such key was a
     * keystroke this port swallowed and C did not.
     * The rows this menu adds (do_name.c:521-548) carry BOTH a selector and a
     * group accelerator: m/C, i/y, o/n, f/',', d/'\', a/l.  Every gselector
     * differs from its own selector and is unique, so wintty.c:1366-1377 puts
     * all six in gacc and :1528 concatenates them; for a PICK_ONE both halves
     * sit inside resp_len (:1527-1530), so either spelling is an explicit
     * choice that finishes the menu (:1740-1755). */
    /* y and n are group accelerators only for the i and o rows, which C adds only when gi.invent (do_name.c:526-538) */
    selKey = await await_menu_key(showCallMenu, shown.join(''), g.invent ? 'Cyn,\\l' : 'C,\\l', PICK_ONE, undefined, searchCallMenu);
    if (selKey === 58 && searchPick !== null) selKey = searchPick;
    // C do_name.c:552: select_menu returns any.a_char, including for groups.
    const group = 'Cyn,\\l'.indexOf(String.fromCharCode(selKey));
    if (group >= 0) selKey = 'miofda'.charCodeAt(group);
    else if (abc) { const k = shown.indexOf(String.fromCharCode(selKey)); if (k >= 0) selKey = rows[k][0].charCodeAt(0); }
    /* After selection: clear pending message, turn not consumed */
    g._pending_message = '';
    /* tty_dismiss_nhwindow -> docorner(offx, maxrow + 1) (wintty.c:982) */
    if (!ncFullScreen) docorner_blank_utf8_captures(WIN_COL - 1, windowLines.length + 1);
    }
    // C do_name.c:560-600: item/type names and level annotations share
    // the same dispatcher for queued and interactive choices.
    const selCh = String.fromCharCode(selKey);
    if (selCh === 'm') {
        await do_mgivenname();               /* do_name.c:563-564 */
    } else if (selCh === 'a') {
        await donamelevel();
    } else if (selCh === 'i') {
        /* C ref: do_name.c's 'i' arm —
         *   obj = getobj("name", name_ok, GETOBJ_PROMPT);
         *   if (obj) do_oname(obj); */
        const obj = await getObjFromGetobj('name', name_ok, GETOBJ_PROMPT); /* do_name.c:567 */
        if (obj)
            await do_oname(obj);
    } else if (selCh === 'o') {
        const obj = await getObjFromGetobj('call', call_ok, GETOBJ_NOFLAGS);
        if (obj) {
            xname_flags(obj, CXN_NORMAL); // C examines the object before naming.
            if (!obj.dknown) await You('would never recognize another one.');
            else await docall(obj);
        }
    } else if (selCh === 'f') {
        await namefloorobj();                /* do_name.c:590-592 */
    } else if (selCh === 'd') {
        await rename_disco();                /* do_name.c:593-595 */
    }
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

async function namefloorobj() {
    const g = game;
    const u = g.u;
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const buf0 = `object on map (or '.' for one ${(u.uundetected
        && _hidesUnder_useupf(g.youmonst?.data)) ? 'over' : 'under'} you)`;
    if ((await getpos(cc, false, buf0)) < 0 || cc.x <= 0)
        return;                                         /* C:694-695 */
    const here = cc.x === (u.ux | 0) && cc.y === (u.uy | 0);
    let obj = null, fakeobj = false;
    if (here) {
        // C do_name.c:697: vobj_at() uses the tile's nexthere pile head,
        // whose order can differ from the global fobj/nobj chain.
        obj = g.level?.levelObjects?.[cc.x]?.[cc.y] ?? null;
    } else {
        const glyph = glyph_at(cc.x, cc.y);
        if (glyph?.cls === GLYPHCLS_OBJ)
            ({ obj, fakeobj } = await look_at_object(cc.x, cc.y, glyph, false, true));
    }
    if (!obj) {
        await There("doesn't seem to be any object %s.", here ? 'under you' : 'there');
        return;                                         /* C:704-709 */
    }
    const STRANGE_OBJECT = 0; /* objects.h:80 */
    const buf = (obj.otyp !== STRANGE_OBJECT) ? _ia_simpleonames(obj) : OC_NAME[STRANGE_OBJECT];
    const use_plural = obj.quan > 1;
    if ((u.uprops[HALLUC]?.intrinsic | 0)
        && !((u.uprops[HALLUC_RES]?.intrinsic | 0) || (u.uprops[HALLUC_RES]?.extrinsic | 0))) {
        const unames = [(Upolyd(u) ? u.mfemale : g.flags.female) && g.urole.name.f
            ? g.urole.name.f : g.urole.name.m];
        unames[1] = _ach_rank_of(rn2_on_display_rng(30) + 1, g.flags.female);
        unames[2] = unames[3] = bogusmon().name;
        unames[4] = roguename();
        unames[5] = 'Wibbly Wobbly';
        await pline('%s %s to call you "%s."', The(buf), use_plural ? 'decide' : 'decides',
            unames[rn2_on_display_rng(unames.length)]);
    } else if (call_ok(obj) === GETOBJ_EXCLUDE) {
        await pline(`${use_plural ? 'Those' : 'That'} ${buf} can't be assigned a type name.`);
    } else if (!obj.dknown) {
        await You(`don't know ${use_plural ? 'those' : 'that'} ${buf} well enough to name ${use_plural ? 'them' : 'it'}.`);
    } else {
        await docall(obj);
    }
    if (fakeobj) { obj.where = OBJ_FREE; await dealloc_obj(obj); }
}


/* C ref: do_name.c:463 name_ok(obj) — getobj's classifier for `#name i'. */
export function name_ok(obj) {
    if (!obj || (obj.oclass | 0) === COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (!obj.dknown || (obj.oartifact | 0) || (obj.otyp | 0) === SPE_NOVEL)
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

// C do_name.c:429-495 — type naming eligibility, separate from naming an item.
export function call_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    const t = obj.otyp | 0;
    const called = game._oc_uname?.[t];
    const callable = objtyp_is_callable(t);
    if (!callable) return GETOBJ_EXCLUDE;
    if (!obj.dknown || (game._oc_name_known?.[t] && called == null))
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

/* C do_name.c:199-285 do_mgivenname() — `#name` / `C` option 'm'.  The
 * shopkeeper/priest/unique-monster rejection arms are ported; the steed arm and
 * the swallowed-by-monster glyph arm now follow C as well. */
async function do_mgivenname() {
    const g = game;
    const u = g.u;
    if (_cmd_Hallucination()) {
        await You('would never recognize it anyway.');
        return;
    }
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    if ((await getpos(cc, false, 'the monster you want to name')) < 0
        || !isok(cc.x, cc.y))
        return;
    const cx = cc.x, cy = cc.y;
    let mtmp = null;
    if (u_at(cx, cy) && !(u.usteed && canspotmon(u.usteed))) {
        /* C: `This %s creature is called %s and cannot be renamed.` */
        await pline(`This ${_um_beautiful()} creature is called ${g.plname} and cannot be renamed.`);
        return;
    }
    mtmp = u_at(cx, cy) ? u.usteed : m_at(cx, cy);
    let do_swallow = false;
    if (!mtmp && u.uswallow) {
        const glyph = glyph_at(cx, cy);
        if (glyph?.cls === GLYPHCLS_SWALLOW) {
            mtmp = u.ustuck;
            do_swallow = true;
        }
    }
    if (!do_swallow && (!mtmp
        || (!sensemon(mtmp)
            && (!(cansee(cx, cy) || see_with_infrared(mtmp))
                || mtmp.mundetected || M_AP_TYPE(mtmp) === M_AP_FURNITURE
                || M_AP_TYPE(mtmp) === M_AP_OBJECT
                || ((mtmp.minvis | 0) && !_uprop_active('SEE_INVIS')))))) {
        await pline('I see no monster there.');
        return;
    }
    const monnambuf = distant_monnam(mtmp, ARTICLE_THE);
    const qbuf = `What do you want to call ${monnambuf}?`;
    const buf = await name_from_player(qbuf, has_mgivenname(mtmp) ? mtmp.mextra.mgivenname : null);
    if (buf == null)
        return;
    const GENO_UNIQ = 0x1000; /* monflag.h G_UNIQ */
    if (((mtmp.data?.geno | 0) & GENO_UNIQ) && !mtmp.ispriest) {
        if (!await _alreadynamed(mtmp, monnambuf, buf))
            await pline(`${upstart(monnambuf)} doesn't like being called names!`);
    } else if (mtmp.isshk && !(_uprop_active('DEAF') || helpless(mtmp) || mtmp.data.msound <= MS_ANIMAL)) {
        if (!await _alreadynamed(mtmp, monnambuf, buf)) {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize("I'm %s, not %s.", dokick_shkname(mtmp), buf);
        }
    } else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk
               || _fl_pmidx(mtmp) === PM_GHOST || mtmp.mextra?.ebones) {
        if (!await _alreadynamed(mtmp, monnambuf, buf))
            await pline(`${upstart(monnambuf)} will not accept the name ${buf}.`);
    } else {
        christen_monst(mtmp, buf);
    }
}

/* christen_monst — C ref: nethack-c-v5/upstream/src/do_name.c:133-152
 * Give a monster a name.  Truncates to PL_PSIZ (63) if necessary. */
export function christen_monst(mtmp, name) {
    const PL_PSIZ = 63;
    let lth = (name && name.length > 0) ? (name.length + 1) : 0;
    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        name = name.substring(0, PL_PSIZ - 1);
    }
    new_mgivenname(mtmp, lth); /* removes old name if one is present */
    if (lth)
        mtmp.mextra.mgivenname = name; /* C: Strcpy(MGIVENNAME(mtmp), name) */
    if (mtmp.mleashed) update_inventory(); /* C do_name.c:149-150 */
    return mtmp;
}

/* C do_name.c:157-195: reject attempts to erase or nearly match a fixed name. */
async function _alreadynamed(mtmp, monnambuf, usrbuf) {
    const norm = (t) => t.toLowerCase().replace(/[ \-_]/g, '');
    const rider = [PM_DEATH, PM_FAMINE, PM_PESTILENCE].includes(_fl_pmidx(mtmp));
    if (!usrbuf) {
        const name_not_title = has_mgivenname(mtmp) || type_is_pname(mtmp.data) || mtmp.isshk;
        await pline('%s would rather keep %s existing %s.', upstart(monnambuf), rider ? 'its' : _um_mhis(mtmp), name_not_title ? 'name' : 'title');
        return true;
    }
    const inv = monnambuf.toLowerCase().indexOf('invisible '), of = monnambuf.toLowerCase().indexOf(' of ');
    if (norm(usrbuf) === norm(monnambuf) || (/^the /i.test(monnambuf) && norm(usrbuf) === norm(monnambuf.slice(4)))
        || (inv >= 0 && norm(usrbuf) === norm(monnambuf.slice(inv + 10))) || (of >= 0 && norm(usrbuf) === norm(monnambuf.slice(of + 4)))) {
        if (rider) await pline('%s is already called that.', upstart(monnambuf));
        else await pline('%s is already called %s.', upstart(mhe(mtmp)), monnambuf);
        return true;
    }
    if (_fl_pmidx(mtmp) === PM_JUIBLEX && /Juiblex/i.test(monnambuf) && /^Jubilex$/i.test(usrbuf)) {
        await pline("%s doesn't like being called %s.", upstart(monnambuf), usrbuf);
        return true;
    }
    return false;
}

async function do_oname(obj) {
    if ((obj.otyp | 0) === SPE_NOVEL) {
        /* C do_name.c:298 — novels already carry their published title and
         * cannot be renamed.  Ysimple_name2 suppresses the novel title. */
        await pline('%s already has a published name.', Ysimple_name2(obj));
        return;
    }
    const prefix = `What do you want to name ${flooreffects_is_plural(obj) ? 'these' : 'this'} `;
    const qbuf = await inventory_safe_qbuf('', prefix, '?', obj, xname, _ia_simpleonames, 'item');
    let buf = await name_from_player(qbuf, obj.oextra?.oname);
    if (buf == null)
        return;
    if (obj.oartifact | 0) {
        await pline(_plineVFmt('%s resists the attempt.',
            [obj.oextra?.oname || 'The artifact']));
        return;
    }
    /* C do_name.c:349 — restricted artifact names slip while engraving.
     * Only the slip count uses the display-only RNG; wipeout_text keeps
     * the global rn2 as in C.  A matching base type with a single object is
     * allowed through to oname(), which creates the artifact just as C does. */
    const candidate = artifact_name_exported(buf, true);
    if (candidate && (_restrict_name(obj, candidate.name)
                      || exist_artifact(obj.otyp, candidate.name))) {
        const canonical = candidate.name || buf;
        /* for "the Foo of Bar", only scuff the "Foo of Bar" part */
        const pre = /^the /i.test(canonical) ? canonical.slice(0, 4) : '';
        const rest = canonical.slice(pre.length);
        let slipped = canonical;
        while (slipped === canonical)
            slipped = pre + wipeout_text(rest, 1 + rn2_on_display_rng(2), 0);
        await pline('While engraving, your %s slips.', body_part(HAND));
        /* C do_name.c:351 display_nhwindow(WIN_MESSAGE, FALSE) pages it */
        if (game._pending_message)
            await force_more_pages(game._pending_message);
        /* topl.c more():232-235 — ESC at this display_nhwindow page sets WIN_STOP,
         * so the "You engrave" pline below is swallowed. */
        if (game._topl_win_stop_armed) {
            game._topl_win_stop_armed = false;
            game._topl_win_stop = true;
        }
        await pline('You engrave: "%s".', slipped);
        const conduct = (game.u.uconduct ||= {});
        conduct.literate = (conduct.literate | 0) + 1; /* C do_name.c:356 */
        buf = slipped;
    } else if (candidate && (obj.otyp | 0) === candidate.otyp) {
        buf = candidate.name; /* C do_name.c:356-363: canonical Sting/Orcrist */
    }
    await oname(obj, buf, ONAME_VIA_NAMING | ONAME_KNOW_ARTI);
}

/* C do_name.c:605-633 docall_xname(obj) — the formatter docall() hands to
 * safe_qbuf().  Formats a COPY of the object with the doname-caliber
 * attributes stripped, so the prompt names the TYPE rather than this
 * particular item. */
function docall_xname(obj) {
    /* C: `otemp = *obj` — a struct copy, so nothing here touches the real
     * object.  (xname() still publishes discovery state into the global
     * objects[] table; C's copy does not undo that either.) */
    const otemp = newobj(obj);
    otemp.oextra = null;
    otemp.quan = 1;
    /* in case water is already known, convert "[un]holy water" to "water" */
    otemp.blessed = 0;
    otemp.cursed = 0;
    const cls = otemp.oclass | 0, t = otemp.otyp | 0;
    if (cls === OCLASS_WEAPON)
        otemp.opoisoned = 0;              /* not poisoned */
    else if (cls === OCLASS_POTION)
        otemp.odiluted = 0;               /* not diluted */
    else if (t === _DOCALL_TOWEL || t === _DOCALL_STATUE)
        otemp.spe = 0;                    /* not wet or historic */
    else if (t === _DOCALL_TIN)
        otemp.known = 0;                  /* suppress tin type and mon type */
    else if (t === _DOCALL_FIGURINE)
        otemp.corpsenm = NON_PM_DOCALL;   /* suppress mon type */
    else if (t === _DOCALL_HEAVY_IRON_BALL)
        otemp.owt = 480;                  /* C objects.h: base iron ball weight */
    else if (cls === OCLASS_FOOD && otemp.globby)
        otemp.owt = 120;                  /* 6*20, neither small nor large */
    return an(xname(otemp));
}

/* objects.h otyps docall_xname's fixup ladder names, from js/oc_name_data.js. */
const _DOCALL_TOWEL = 234, _DOCALL_FIGURINE = 241, _DOCALL_TIN = 296,
      _DOCALL_STATUE = 476, _DOCALL_HEAVY_IRON_BALL = 477;

const NON_PM_DOCALL = -1; /* C monsym.h NON_PM */

/* C do_name.c:105-128 name_from_player(outbuf, prompt, defres).
 * EDIT_GETLIN is not defined in this tree, so `defres` is nhUse()d — accepted
 * and ignored, exactly as C does, rather than dropped from the signature.
 * Returns the mungspaced, PL_PSIZ-truncated name, or null for C's NULL. */
async function name_from_player(prompt, _defres) {
    const buf = await getlin(prompt);
    /* C:120 `if (!*outbuf || *outbuf == '\033') return NULL;` — tested BEFORE
     * mungspaces, so a line of pure spaces is NOT a cancel; it falls through
     * and becomes the empty string that uncalls the type. */
    if (!buf || buf === '\x1b')
        return null;
    let out = mungspaces(buf);
    if (out.length >= PL_PSIZ)
        out = out.slice(0, PL_PSIZ - 1);
    return out;
}

export async function docall(obj) {
    const g = game;
    if (!obj.dknown)
        return; /* C:642 — probably blind */
    await flush_screen(1); /* C:644 "buffered updates might matter" */
    const otyp = obj.otyp | 0;
    let qbuf;
    if ((obj.oclass | 0) === OCLASS_POTION && obj.fromsink)
        /* C:646-649 fromsink: kludge, meaning it's sink water */
        qbuf = `Call a stream of ${getObjDescr(otyp) ?? 'clear'} fluid:`;
    else
        qbuf = await inventory_safe_qbuf('', 'Call ', ':', obj, docall_xname,
                                        _ia_simpleonames, 'thing');
    /* win/tty/topl.c update_topl(): the prompt lands on a topline that may
     * still hold an unacked message, so the tty more()s it first — the same
     * page js/read.js:_docall_scroll documents.  getlin() does this itself
     * (js/wizcmds.js), so there is no second copy of it here. */
    if (!g._oc_uname) g._oc_uname = {};
    const uname_p = g._oc_uname[otyp];
    const buf = await name_from_player(qbuf, uname_p);
    if (buf == null)
        return; /* C:656-657 */
    /* C:659-663 — clear the old name BEFORE deciding, so undiscover_object
     * below sees the type with no uname (C frees *uname_p and NULLs it). */
    let had_name = false;
    if (uname_p) {
        had_name = true;
        delete g._oc_uname[otyp];
    }
    /* C:665-673 — strip leading and trailing spaces; uncalls item if all
     * spaces. mungspaces returns the empty string for all-space input. */
    const munged = mungspaces(buf);
    if (!munged || munged === ' ') {
        if (had_name)
            await undiscover_object(otyp);
    } else {
        g._oc_uname[otyp] = munged;
        discover_object(otyp, false, true, true);
    }
    /* C:674-675 */
    if ((obj.where | 0) === OBJ_INVENT || carrying(otyp))
        update_inventory();
}

/* Monnam(mtmp) — C ref: do_name.c:1073-1080.
 *   char *bp = mon_nam(mtmp); *bp = highc(*bp); return bp;
 * highc() only uppercases a-z (hacklib.h). */
export function Monnam(mtmp) {
    const bp = mon_nam(mtmp);
    if (!bp) return bp;
    let first = bp.charCodeAt(0);
    if (0x61 <= first && first <= 0x7a) first &= ~0x20;
    return (currentmbuf().text = String.fromCharCode(first) + bp.slice(1));
}

/* mon_nam(mtmp) — C ref: do_name.c:1041-1046.
 *   return x_monnam(mtmp, ARTICLE_THE, (char *) 0,
 *                   (has_mgivenname(mtmp)) ? SUPPRESS_SADDLE : 0, FALSE);
 * xm_has_mgivenname (not const.js has_mgivenname): the former reads the mon
 * struct's presence bit directly. */
export function mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

/* C do_name.c:1303-1308: permonst-pointer wrapper for the shared gender lookup. */
export function pmname(pm, mgender) { return monPmname(pm.pmidx, mgender); }

/* C do_name.c:2432 hcolor(colorstr): identity unless hallucinating, in which
 * case it draws from rn2_on_display_rng (the sole body; mhitm.js re-exports).  The table maps this
 * file's numeric NH_* tokens to the C c_color_names strings (decl.c:16-19).
 * Any other input is C's plain colorpref arm, returned as-is
 * (or draws when hallucinating / null) — never the "" this used to collapse
 * to, which skipped the hallucination draw entirely. */
const NH_AMBER = 'amber';

const hcolors = [
    "ultraviolet", "infrared", "bluish-orange", "reddish-green", "dark white",
    "light black", "sky blue-pink", "pinkish-cyan", "indigo-chartreuse",
    "salty", "sweet", "sour", "bitter", "umami", /* basic tastes */
    "striped", "spiral", "swirly", "plaid", "checkered", "argyle", "paisley",
    "blotchy", "guernsey-spotted", "polka-dotted", "square", "round",
    "triangular", "cabernet", "sangria", "fuchsia", "wisteria", "lemon-lime",
    "strawberry-banana", "peppermint", "romantic", "incandescent",
    "octarine", /* Discworld: the Colour of Magic */
    "excitingly dull", "mauve", "electric",
    "neon", "fluorescent", "phosphorescent", "translucent", "opaque",
    "psychedelic", "iridescent", "rainbow-colored", "polychromatic",
    "colorless", "colorless green",
    "dancing", "singing", "loving", "loudy", "noisy", "clattery", "silent",
    "apocyan", "infra-pink", "opalescent", "violant", "tuneless",
    "viridian", "aureolin", "cinnabar", "purpurin", "gamboge", "madder",
    "bistre", "ecru", "fulvous", "tekhelet", "selective yellow",
];

export function hcolor(color) {
    const name = color === NH_BLUE ? "blue"
        : color === NH_RED ? "red"
        : color === NH_PURPLE ? "purple"
        : color === NH_BLACK ? "black"
        : color === NH_SILVER ? "silver"
        : color === NH_GOLDEN ? "golden"
        : (color === NH_AMBER || color === "amber") ? "amber"
        : "";
    const colorpref = name || color;
    const HHallucination = game.u?.uprops?.[HALLUC]?.intrinsic || 0;
    const Halluc_resistance = (game.u?.uprops?.[HALLUC_RES]?.intrinsic || 0)
        || (game.u?.uprops?.[HALLUC_RES]?.extrinsic || 0);
    const Hallucination = HHallucination && !Halluc_resistance;
    /* C do_name.c:1463 tests the pointer; an empty string is still non-null. */
    return (Hallucination || colorpref == null)
        ? hcolors[rn2_on_display_rng(hcolors.length)]
        : colorpref;
}

/* C do_name.c:1254-1287; permonst templates represent mons[] entries,
 * without the native addresses used by C's corrupt-pointer diagnostics. */
export function minimal_monnam(mon, ckloc) {
    const buf = nextmbuf();
    buf.text = minimal_monnam_body(mon, ckloc);
    return buf.text;
}
function minimal_monnam_body(mon, ckloc) {
    if (!mon) return '[Null monster]';
    if (!mon.data) return '[Null mon->data]';
    const mndx = mon.data.pmidx | 0;
    if (mndx < 0) return `[Invalid mon->data ${mndx} < 0]`;
    if (mndx >= NUMMONS) return `[Invalid mon->data ${mndx} >= ${NUMMONS}]`;
    const gender = mon.female ? 1 : 0; /* monst.h:268 Mgender */
    if (ckloc && mndx === PM_LONG_WORM && mon.mx
        && monster_at(mon.mx, mon.my) !== mon)
        return `${monPmname(PM_LONG_WORM_TAIL, gender)} <${mon.mx | 0},${mon.my | 0}>`;
    const prefix = (mon.mtame | 0) ? 'tame ' : ((mon.mpeaceful | 0) ? 'peaceful ' : '');
    let name = `${prefix}${monPmname(mndx, gender)} <${mon.mx | 0},${mon.my | 0}>`;
    if (mon.cham != null && mon.cham !== NON_PM)
        name += `{${monPmname(mon.cham | 0, gender)}}`;
    return name;
}


/* C do_name.c:1320-1360 obj_pmname(obj) — mons[].pmname for a corpse/statue/
 * figurine, keyed off obj->corpsenm + the CORPSTAT_GENDER bits in obj->spe.
 * The #if 0 saved-montraits branch is dead in the compiled C (never taken);
 * it is not ported here.
 * PM_ALIGNED_CLERIC = 275 (== the "priest"/"priestess"/"aligned cleric"
 * class-monster row; pm.generated.js dedups its name onto PM_PRIEST).
 * PM_CLERIC = 337 (the role monster "priest"/"priestess"/"cleric" row; no
 * exported const — same dedup collision). */
const OBJ_PMNAME_CORPSE = 265;
const OBJ_PMNAME_STATUE = 476;
const OBJ_PMNAME_FIGURINE = 241;
const PM_ALIGNED_CLERIC = 275;
const PM_CLERIC = 337;
export function obj_pmname(obj) {
    if ((obj.otyp === OBJ_PMNAME_CORPSE || obj.otyp === OBJ_PMNAME_STATUE
         || obj.otyp === OBJ_PMNAME_FIGURINE) && ismnum(obj.corpsenm)) {
        const cgend = obj.spe & CORPSTAT_GENDER;
        const mgend = (cgend === CORPSTAT_MALE) ? MALE
                      : (cgend === CORPSTAT_FEMALE) ? FEMALE
                        : NEUTRAL;
        let mndx = obj.corpsenm;

        if (mndx === PM_ALIGNED_CLERIC && cgend === CORPSTAT_RANDOM)
            mndx = PM_CLERIC;

        return monPmname(mndx, mgend);
    }
    impossible("obj_pmname otyp:%i,corpsenm:%i", obj.otyp, obj.corpsenm);
    return "two-legged glorkum-seeker";
}

/* C do_name.c:80-87: clear ONAME only when allocated; retain oextra.
 * Support both the nested live name and new_oname's flattened name fields.
 * An allocated empty string is still a non-NULL C name pointer. */
export function free_oname(otmp) {
    const nested_name = 'oextra' in otmp
        && otmp.oextra && otmp.oextra.oname != null;
    const flat_name = 'oextra_present' in otmp && otmp.oextra_present
        && otmp.oextra_oname_present;
    if (!nested_name && !flat_name)
        return;
    if (nested_name)
        otmp.oextra.oname = null;
    if (Object.prototype.hasOwnProperty.call(otmp, 'oextra_oname_present'))
        otmp.oextra_oname_present = 0;
    if (Object.prototype.hasOwnProperty.call(otmp, 'oname'))
        otmp.oname = null;
}

export function christen_orc(mtmp, gang, other) {
    const BUFSZ = 256;
    /* C do_name.c:1560 `orcname = rndorcname(buf2)` — a `char buf2[BUFSZ]`,
     * i.e. non-NULL, so the name-building loop always runs.  js/mhitm.js's port
     * tests `s !== null && s !== undefined` (an empty C buffer is ""), so the
     * argument is load-bearing: calling it bare skips the loop and drops
     * 2*iend-1 draws. */
    let orcname = rndorcname("");
    let sz = orcname.length;
    if (gang)
        sz += gang.length + 4; /* sizeof " of " - sizeof "" = 4 */
    else if (other)
        sz += other.length;

    if (sz < BUFSZ) {
        let nameit = false;
        let buf;
        if (gang) {
            buf = upstart(orcname) + " of " + upstart(gang);
            nameit = true;
        } else if (other) {
            buf = upstart(orcname) + other;
            nameit = true;
        }
        if (nameit)
            mtmp = christen_monst(mtmp, buf);
    }
    return mtmp;
}

/* C do_name.c:79-133 oname(obj, name, oflgs) — assign a custom name to an
 * object, promoting it to an artifact when the name matches artilist[].
 * RNG-free.
 *
 * C's `lth` is the C string length INCLUDING the NUL, and it is used only as a
 * truthiness test plus the new_oname() allocation size, so JS keeps it as a
 * count and never allocates. */
export async function oname(obj, name, oflgs) {
    const via_naming = (oflgs & ONAME_VIA_NAMING) !== 0;
    const skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;
    let nm = (name == null) ? '' : String(name);
    let lth = nm.length ? nm.length + 1 : 0;

    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        nm = nm.slice(0, PL_PSIZ - 1); /* strncpy(buf, name, PL_PSIZ-1) + NUL */
    }
    /* If named artifact exists in the game, do not create another.
       Also trying to create an artifact shouldn't de-artifact
       it (e.g. Excalibur from prayer). In this case the object
       will retain its current name. */
    if ((obj.oartifact | 0) || (lth && exist_artifact(obj.otyp, nm)))
        return obj;

    if (!obj.oextra)
        obj.oextra = {};
    obj.oextra.oname = lth ? nm : undefined;

    if (lth)
        artifact_exists(obj, nm, true, oflgs);
    if (obj.oartifact | 0) {
        /* C do_name.c:402-404: can't dual-wield with an artifact secondary. */
        if (obj === game.u.uswapwep)
            await untwoweapon();
        /* activate warning if you've just named your weapon "Sting" */
        if (obj === game.u.uwep)
            set_artifact_intrinsic(obj, true, W_WEP_D); // C do_name.c:406-407
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            await alter_cost(obj, 0);
        if (via_naming) {
            /* violate illiteracy conduct since successfully wrote arti-name */
            const uc = (game.u.uconduct = game.u.uconduct || {});
            const wasLiterate = (uc.literate | 0);
            uc.literate = wasLiterate + 1;
            if (!wasLiterate)
                livelog_printf(LL_CONDUCT | LL_ARTIFACT,
                               'became literate by naming %s',
                               bare_artifactname(obj));
            else
                livelog_printf(LL_ARTIFACT,
                               'chose %s to be named "%s"',
                               ansimpleoname(obj), bare_artifactname(obj));
        }
    }
    /* C: carried(o) == (o->where == OBJ_INVENT) */
    if (obj.where === OBJ_INVENT && !skip_inv_update)
        update_inventory();
    return obj;
}

const _hliquids = [
    "yoghurt", "oobleck", "clotted blood", "diluted water", "purified water",
    "instant coffee", "tea", "herbal infusion", "liquid rainbow",
    "creamy foam", "mulled wine", "bouillon", "nectar", "grog", "flubber",
    "ketchup", "slow light", "oil", "vinaigrette", "liquid crystal", "honey",
    "caramel sauce", "ink", "aqueous humour", "milk substitute",
    "fruit juice", "glowing lava", "gastric acid", "mineral water",
    "cough syrup", "quicksilver", "sweet vitriol", "grey goo", "pink slime",
    "cosmic latte", "bone oil", "custard", "lard", "vinegar", "creosote",
    /* "new coke (tm)", --better not */
];

export function hliquid(liquidpref) {
    const hallucinate = xm_Hallucination() && !xm_gameover();
    if (hallucinate || !liquidpref) {
        let count = _hliquids.length;
        if (liquidpref) ++count;
        const indx = rn2_on_display_rng(count);
        if (indx >= 0 && indx < _hliquids.length)
            return _hliquids[indx];
    }
    return liquidpref;
}

const XM_EXACT_NAME = 0x1F;

/* C ref: nethack-c/include/monst.h:52-72 — M_AP_TYPE(m) is m_ap_type masked. */
const M_AP_MONSTER = 3;

const M1_HUMANOID = 0x00020000;

const M2_PNAME = 0x00080000;

const G_UNIQ = 0x1000;

/* C ref: nethack-c/include/hacklib.h highc(c) — uppercase only a-z. */
function xm_highc_first(bp) {
    if (!bp) return bp;
    let first = bp.charCodeAt(0);
    if (0x61 <= first && first <= 0x7a) first &= ~0x20;
    return (currentmbuf().text = String.fromCharCode(first) + bp.slice(1));
}

/* C ref: nethack-c/src/allmain.c program_state.gameover */
function xm_gameover() {
    return !!(game && game.program_state && game.program_state.gameover);
}

/* C ref: nethack-c/include/monst.h:248 engulfing_u(mon) */
function xm_engulfing_u(mon) {
    const u = game.u || {};
    return !!(u.uswallow && xm_same_monst(u.ustuck, mon));
}

/* mondata.h:64-66,135 predicates over mtmp->data. */
function xm_mindless(mdat) { return (mdat.mflags1 & M1_MINDLESS) !== 0; }

function xm_humanoid(mdat) { return (mdat.mflags1 & M1_HUMANOID) !== 0; }

function xm_is_animal(mdat) { return (mdat.mflags1 & M1_ANIMAL) !== 0; }

function xm_type_is_pname(mdat) { return (mdat.mflags2 & M2_PNAME) !== 0; }

/* C ref: mondata.h:157 is_mplayer(ptr) — &mons[PM_ARCHEOLOGIST]..&mons[PM_WIZARD] */
function xm_is_mplayer(mdat) {
    const i = mdat.pmidx | 0;
    return i >= PM_ARCHEOLOGIST && i <= PM_WIZARD;
}

/* C ref: nethack-c/src/do_name.c:1289-1300 Mgender(mtmp).  The
 * `mtmp == &gy.youmonst` arm is unreachable from x_monnam (which returns "you"
 * before ever asking for a gender), so this is the plain monster arm. */
function xm_Mgender(mtmp) {
    return mtmp.female ? FEMALE : MALE;
}

function xm_MGIVENNAME(mtmp) {
    if ('mextra' in mtmp && mtmp.mextra && mtmp.mextra.mgivenname != null)
        return mtmp.mextra.mgivenname;
    return ('mgivenname' in mtmp) ? mtmp.mgivenname : null;
}

/* C ref: nethack-c/src/hacklib.c:804 strstri() — case-insensitive strstr.
 * Returns the index of the match, or -1 (C returns a pointer or NULL). */
function xm_strstri(str, sub) {
    if (!sub) return 0;
    return String(str).toLowerCase().indexOf(String(sub).toLowerCase());
}

/*
 * x_monnam — C ref: nethack-c/src/do_name.c:826-1032.
 * The generic monster-naming function; every wrapper below routes through it.
 * RNG: rn2(2) in the AUGMENT_IT-while-hallucinating arm, plus whatever
 * rndmonnam() consumes in the hallucination arm.
 */
export function x_monnam(mtmp, article, adjective, suppress, called) {
    const buf = nextmbuf(); // C do_name.c:834, including the hero early return.
    buf.text = x_monnam_body(mtmp, article, adjective, suppress, called);
    return buf.text;
}

function x_monnam_body(mtmp, article, adjective, suppress, called) {
    const mdat = mtmp.data;
    const mappear_as_mon = ((mtmp.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_MONSTER;
    let pm_name, name_at_start = false, bp;

    /* C do_name.c:843-844 */
    if (is_youmonst(mtmp))
        return "you"; /* ignore article, "invisible", &c */

    /* C do_name.c:846-849 */
    if (xm_gameover())
        suppress |= SUPPRESS_HALLUCINATION;
    if (article === ARTICLE_YOUR && !mtmp.mtame)
        article = ARTICLE_THE;

    /* C do_name.c:851-860 — the hero's consumer is worthy of ARTICLE_THE, and
       its invisibility stops mattering once you are inside it. */
    const u = game.u || {};
    if (u.uswallow && xm_same_monst(mtmp, u.ustuck)) {
        article = ARTICLE_THE;
        suppress |= SUPPRESS_INVISIBLE;
    }
    /* C do_name.c:861-870 */
    const do_hallu = xm_Hallucination() && !(suppress & SUPPRESS_HALLUCINATION);
    const do_invis = !!mtmp.minvis && !(suppress & SUPPRESS_INVISIBLE);
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
                  && !xm_gameover() && !xm_same_monst(mtmp, u.usteed)
                  && !xm_engulfing_u(mtmp) && !(suppress & SUPPRESS_IT);
    const do_saddle = !(suppress & SUPPRESS_SADDLE);
    const do_mappear = mappear_as_mon && !(suppress & SUPPRESS_MAPPEARANCE);
    const do_exact = (suppress & XM_EXACT_NAME) === XM_EXACT_NAME;
    const do_name = !(suppress & SUPPRESS_NAME) || xm_type_is_pname(mdat);
    const augment_it = (suppress & AUGMENT_IT) !== 0;

    /* FF_NAME_TRACE is a RNG-neutral witness for the display-name branch.
     * It pairs with FF_HIDE_TRACE and the display-rng hook: when a render
     * diverges, this tells us which visible monster naming call actually
     * consumed the hallucinatory name draw, including its visibility and
     * suppression inputs. */
    if (do_hallu && typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
        pushRngLogEntry(`^name_trace[moves=${game.moves | 0} id=${mtmp.m_id | 0} xy=${mtmp.mx | 0},${mtmp.my | 0}`
            + ` mndx=${mdat.pmidx | 0} article=${article | 0} suppress=${suppress | 0}`
            + ` mappear=${do_mappear ? 1 : 0} cansee=${canspotmon(mtmp) ? 1 : 0}]`);

    let buf = "";

    /* C do_name.c:874-884 — unseen monsters; usually "it" but sometimes more
       specific, and when hallucinating the specific values might be inverted.
       !is_animal excludes all Y; !mindless excludes Z, M, '. */
    if (do_it) {
        const s_one = xm_humanoid(mdat) && !xm_is_animal(mdat) && !xm_mindless(mdat);
        return !augment_it ? "it"
               : ((!do_hallu ? s_one : !rn2(2)) ? "someone" : "something");
    }

    /* C do_name.c:886-904 — priests and minions: don't even use this function. */
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear) {
        const hres = (game.u && game.u.uprops) ? game.u.uprops[HALLUC_RES] : null;
        const save_prop = hres ? hres.extrinsic : 0;
        const save_invis = mtmp.minvis;

        /* when true name is wanted, explicitly block Hallucination */
        if (!do_hallu && hres)
            hres.extrinsic = 1;
        if (!do_invis)
            mtmp.minvis = 0;
        /* EXACT_NAME will force "of <deity>" on the Astral Plane */
        let name = priestname(mtmp, article, do_exact, "");
        if (hres)
            hres.extrinsic = save_prop;
        mtmp.minvis = save_invis;
        if (article === ARTICLE_NONE && String(name).slice(0, 4) === "the ")
            name = String(name).slice(4);
        return name;
    }

    /* C do_name.c:906-912 — 'pm_name' is the base part of most names. */
    if (do_mappear) {
        pm_name = monPmname(mtmp.mappearance | 0, xm_Mgender(mtmp));
    } else {
        pm_name = monPmname(mdat.pmidx | 0, xm_Mgender(mtmp));
    }

    /* C do_name.c:914-936 — shopkeepers use the shopkeeper name. */
    if (mtmp.isshk && !do_hallu && !do_mappear) {
        if (adjective && article === ARTICLE_THE) {
            /* pathological case: "the angry Asidonhopo the blue dragon"
               sounds silly */
            buf = "the ";
            buf += adjective + " ";
            buf += shkname(mtmp);
        } else {
            buf += shkname(mtmp);
            if ((mdat.pmidx | 0) !== PM_SHOPKEEPER || do_invis) {
                buf += " the ";
                if (do_invis)
                    buf += "invisible ";
                buf += pm_name;
            }
        }
        return buf;
    }

    /* C do_name.c:938-946 — put the adjectives in the buffer. */
    if (adjective)
        buf += adjective + " ";
    if (do_invis)
        buf += "invisible ";
    if (do_saddle && ((mtmp.misc_worn_check | 0) & W_SADDLE) && !xm_Blind()
        && !xm_Hallucination())
        buf += "saddled ";
    const has_adjectives = (buf !== "");

    /* C do_name.c:948-998 — the actual monster name or type; remember whether
       the buffer starts with a personal name. */
    if (do_hallu) {
        const rnamecode = {};
        const rname = rndmonnam(rnamecode);

        buf += rname;
        name_at_start = bogon_is_pname(rnamecode.code);
    } else if (do_name && xm_has_mgivenname(mtmp)) {
        const name = xm_MGIVENNAME(mtmp);

        if ((mdat.pmidx | 0) === PM_GHOST) {
            buf += s_suffix(name) + " ghost";
            name_at_start = true;
        } else if (called) {
            buf += pm_name + " called " + name;
            name_at_start = xm_type_is_pname(mdat);
        } else if (xm_is_mplayer(mdat) && (bp = xm_strstri(name, " the ")) >= 0) {
            /* <name> the <adjective> <invisible> <saddled> <rank> */
            let pbuf = name.slice(0, bp + 5); /* adjectives right after " the " */
            if (has_adjectives)
                pbuf += buf;
            pbuf += name.slice(bp + 5); /* append the rest of the name */
            buf = pbuf;
            article = ARTICLE_NONE;
            name_at_start = true;
        } else {
            buf += name;
            name_at_start = true;
        }
    } else if (xm_is_mplayer(mdat) && !In_endgame(u.uz)) {
        /* C: rank_of((int) mtmp->m_lev, monsndx(mdat), (boolean) mtmp->female).
         * monsndx(mdat) is the mons[] index, i.e. mdat->pmidx.  (js/display.js's
         * rank_of currently expects a 0..12 role ordinal rather than a mndx —
         * that is a display.js defect, not a reason to pass it the wrong
         * argument here.) */
        buf += lcase(rank_of(mtmp.m_lev | 0, mdat.pmidx | 0, !!mtmp.female));
        name_at_start = false;
    } else {
        buf += pm_name;
        name_at_start = xm_type_is_pname(mdat);
    }

    /* C do_name.c:1000-1007 */
    if (name_at_start && (article === ARTICLE_YOUR || !has_adjectives)) {
        if ((mdat.pmidx | 0) === PM_WIZARD_OF_YENDOR)
            article = ARTICLE_THE;
        else
            article = ARTICLE_NONE;
    } else if ((mdat.geno & G_UNIQ) !== 0 && article === ARTICLE_A) {
        article = ARTICLE_THE;
    }

    /* C do_name.c:1009-1031 */
    let insertbuf2 = true;
    let buf2 = "";
    switch (article) {
    case ARTICLE_YOUR:
        buf2 = "your ";
        break;
    case ARTICLE_THE:
        buf2 = "the ";
        break;
    case ARTICLE_A:
        /* avoid an() here */
        buf2 = just_an({}, buf); /* "a " or "an " */
        break;
    case ARTICLE_NONE:
    default:
        insertbuf2 = false;
        break;
    }
    if (insertbuf2)
        buf = buf2 + buf;
    return buf;
}

/* l_monnam — C ref: nethack-c/src/do_name.c:1034-1039 */
export function l_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null,
                    xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, true);
}

/* noit_Monnam — C ref: nethack-c/src/do_name.c:1082-1089 */
export function noit_Monnam(mtmp) {
    return xm_highc_first(noit_mon_nam(mtmp));
}

/* Some_Monnam — C ref: nethack-c/src/do_name.c:1091-1098 */
export function Some_Monnam(mtmp) {
    return xm_highc_first(some_mon_nam(mtmp));
}

/* noname_monnam — C ref: nethack-c/src/do_name.c:1100-1105 */
export function noname_monnam(mtmp, article) {
    return x_monnam(mtmp, article, null, SUPPRESS_NAME, false);
}

/* m_monnam — C ref: nethack-c/src/do_name.c:1107-1113 */
export function m_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, XM_EXACT_NAME, false);
}

/* YMonnam — C ref: nethack-c/src/do_name.c:1131-1139 */
export function YMonnam(mtmp) {
    return xm_highc_first(y_monnam(mtmp));
}

/* Adjmonnam — C ref: nethack-c/src/do_name.c:1141-1149 */
export function Adjmonnam(mtmp, adj) {
    return xm_highc_first(
        x_monnam(mtmp, ARTICLE_THE, adj,
                 xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false));
}

/* a_monnam — C ref: nethack-c/src/do_name.c:1151-1156 */
export function a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null,
                    xm_has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
}

/* Amonnam — C ref: nethack-c/src/do_name.c:1158-1165 */
export function Amonnam(mtmp) {
    return xm_highc_first(a_monnam(mtmp));
}

/* C ref: do_name.c:1512-1534 — road-runner nemesis aliases for coyotes. */
const coynames = [
    "Carnivorous Vulgaris", "Road-Runnerus Digestus", "Eatibus Anythingus",
    "Famishus-Famishus", "Eatibus Almost Anythingus", "Eatius Birdius",
    "Famishius Fantasticus", "Eternalii Famishiis", "Famishus Vulgarus",
    "Famishius Vulgaris Ingeniusi", "Eatius-Slobbius", "Hardheadipus Oedipus",
    "Carnivorous Slobbius", "Hard-Headipus Ravenus", "Evereadii Eatibus",
    "Apetitius Giganticus", "Hungrii Flea-Bagius", "Overconfidentii Vulgaris",
    "Caninus Nervous Rex", "Grotesques Appetitus", "Nemesis Ridiculii",
    "Canis latrans"
];

export function coyotename(mtmp) {
    if (!mtmp) return "";
    return `${x_monnam(mtmp, ARTICLE_NONE, null, 0, true)} - ${
        mtmp.mcan ? coynames[coynames.length - 1]
                  : coynames[(mtmp.m_id >>> 0) % (coynames.length - 1)]}`;
}

export function distant_monnam(mon, article) {
    /* compute Hallucination: HHallucination && !Halluc_resistance */
    const HHallucination = game.u?.uprops?.[HALLUC]?.intrinsic || 0;
    const HHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.intrinsic || 0;
    const EHalluc_resistance = game.u?.uprops?.[HALLUC_RES]?.extrinsic || 0;
    const Halluc_resistance = HHalluc_resistance || EHalluc_resistance;
    const Hallucination = HHallucination && !Halluc_resistance;

    if (mon.data && mon.data.pmidx === PM_HIGH_CLERIC && !Hallucination
        && Is_astralevel(game.u.uz) && !m_next2u(mon)) {
        let buf = article === ARTICLE_THE ? "the " : "";
        buf += mon.female ? "high priestess" : "high priest";
        return buf;
    } else {
        return x_monnam(mon, article, null, 0, true);
    }
}

/* ---------------------------------------------------------------------------
 * rndghostname — C ref: nethack-c/src/do_name.c:772-776
 * Returns a random ghost name, or the player's own name (1/7 chance).
 * RNG: rn2(7), and rn2(34) when the ghost-name branch is taken.
 * --------------------------------------------------------------------------- */
const ghostnames = [
    "Adri", "Andries", "Andreas", "Bert", "David", "Dirk",
    "Emile", "Frans", "Fred", "Greg", "Hether", "Jay",
    "John", "Jon", "Karnov", "Kay", "Kenny", "Kevin",
    "Maud", "Michiel", "Mike", "Peter", "Robert", "Ron",
    "Tom", "Wilmar", "Nick Danger", "Phoenix", "Jiro", "Mizue",
    "Stephan", "Lance Braccus", "Shadowhawk", "Murphy"
];

export function rndghostname() {
    return rn2(7) ? ghostnames[rn2(ghostnames.length)] : String(game.plname);
}

export function roguename() {
    const opts = nh_getenv("ROGUEOPTS");
    if (opts) {
        for (let i = 0; i < opts.length; i++) {
            if (opts.substr(i, 5) === "name=") {
                const nameStart = i + 5;
                const commaIdx = opts.indexOf(',', nameStart);
                if (commaIdx !== -1) {
                    return opts.substring(nameStart, commaIdx);
                }
                return opts.substring(nameStart);
            }
        }
    }
    return rn2(3) ? (rn2(2) ? "Michael Toy" : "Kenneth Arnold")
                  : "Glenn Wichman";
}

/* C ref: do_name.c mon_nam_too(struct monst *mon, struct monst *other_mon)
 * PRONOUN_HALLU = 2 (random if hallucinating) */
export function mon_nam_too(mon, other_mon) {
    /* C compares the two struct monst pointers; see xm_same_monst() for why
       the replay-side identity has to go through m_id. */
    if (!xm_same_monst(mon, other_mon)) {
        return mon_nam(mon);
    } else {
        const namebuf = nextmbuf(); // C do_name.c:1198
        let buf = "";
        switch (pronoun_gender(mon, PRONOUN_HALLU)) {
        case 0:
            buf = "himself";
            break;
        case 1:
            buf = "herself";
            break;
        case 2:
        default:
            buf = "itself";
            break;
        case 3: /* could happen when hallucinating */
            buf = "themselves";
            break;
        }
        return (namebuf.text = buf);
    }
}

/* ---------------------------------------------------------------------------
 * new_oname — C ref: nethack-c/src/do_name.c:60-76
 * Allocates space for an object's custom name, freeing any prior oextra/name
 * first; a zero-length request just releases the existing name.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function new_oname(obj, lth) {
    if (lth) {
        if (!obj.oextra_present && !obj.oextra) {
            const oe = newoextra();
            obj.oextra_present = 1;
            obj.oextra_oname_present = oe.oname ? 1 : 0;
            obj.oextra_omonst_present = oe.omonst ? 1 : 0;
            obj.oextra_omailcmd_present = oe.omailcmd ? 1 : 0;
            obj.oextra_omid = oe.omid | 0;
        } else {
            free_oname(obj); /* already has oextra, might also have name */
        }
        obj.oextra_oname_present = 1; /* ONAME(obj) = alloc_mhitm(lth) */
        if (!obj.oextra) obj.oextra = {};
        obj.oextra.oname = alloc_mhitm(lth);
        obj.oname = obj.oextra.oname;
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if ((obj.oextra_present && obj.oextra_oname_present) || obj.oextra?.oname != null)
            free_oname(obj);
    }
}

function alloc_mhitm(size) {
    /* C: char *alloc(unsigned n) — raw buffer allocation; the (unported)
     * do_oname() caller copies the actual name text in afterward. */
    return '';
}

/* ---------------------------------------------------------------------------
 * rndorcname — C ref: nethack-c/src/do_name.c:1538-1555
 * Generate a random orc name by concatenating random vowels and consonants.
 * RNG: rn1(2,3) loop count, rn2(2) initial vstart, conditional rn2(30) per
 *      iteration (i>0), and rn2(4)/rn2(11) for the vowel/consonant rolls.
 * --------------------------------------------------------------------------- */
export function rndorcname(s) {
    /* C do_name.c:1540 */
    const v = ["a", "ai", "og", "u"];
    /* C do_name.c:1541-1542 */
    const snd = ["gor", "gris", "un", "bane", "ruk", "oth", "ul", "z", "thos", "akh", "hai"];

    /* C do_name.c:1543 `int i, iend = rn1(2, 3), vstart = rn2(2);` — BOTH draws
     * happen before the `if (s)` guard, so rndorcname(NULL) still burns two
     * rn2(2)s.  Declarator initialisers are evaluated left to right: iend first. */
    let iend = rn1(2, 3);
    let vstart = rn2(2);

    /* C do_name.c:1545 `if (s)` is a NULL-POINTER test on a `char buf[BUFSZ]`.
     * Both C call sites (do_name.c:1562 christen_orc, mkmaze.c:819 stolen_booty)
     * pass the address of a stack buffer, so the branch is always taken.  JS's
     * `if (s)` would additionally reject "" — the natural JS spelling of an
     * empty C buffer — and silently skip the whole loop, dropping 2*iend-1
     * draws.  Test for null/undefined only, which is what C tests. */
    if (s !== null && s !== undefined) {
        s = "";                                 /* C do_name.c:1546 `*s = '\0'` */
        for (let i = 0; i < iend; ++i) {
            vstart = 1 - vstart;                /* 0 -> 1, 1 -> 0 */
            let dash = "";
            if (i > 0 && !rn2(30)) {
                dash = "-";
            }
            let rolled = vstart ? v[rn2(v.length)] : snd[rn2(snd.length)];
            s = s + dash + rolled;
        }
    }
    return s;                                   /* C do_name.c:1553 */
}

/* Amulet constants (object type indices; C ref: objects.h) */
const AMULET_OF_YENDOR = 213;

const FAKE_AMULET_OF_YENDOR = 212; /* objects.h AMULET() FAKE_AMULET_OF_YENDOR — cheap plastic imitation, the slot before AMULET_OF_YENDOR(213); was 420 = WAN_SPEED_MONSTER */

/* Object class enum values (C ref: objclass.h defsym.h) */
const AMULET_CLASS = 5;

const POTION_CLASS = 8;

const WAND_CLASS = 11;

const RING_CLASS = 4;

const VENOM_CLASS = 17;

const SCROLL_CLASS = 9;

// C v5 do_name.c:429-465: an existing user name always allows renaming;
// otherwise only the listed classes with an appearance can be called.
export function objtyp_is_callable(i) {
    const ityp = i | 0;
    if (game._oc_uname?.[ityp] != null)
        return TRUE;
    const oc_class = (MKOBJ_OC_CLASS[ityp] | 0);

    switch (oc_class) {
    case AMULET_CLASS:
        /* Special amulets (AMULET_OF_YENDOR and FAKE_AMULET_OF_YENDOR)
         * cannot be called to prevent players from identifying them
         * via the discovery mechanism. */
        if (ityp === AMULET_OF_YENDOR || ityp === FAKE_AMULET_OF_YENDOR)
            return FALSE;
        /* FALLTHROUGH */
    case SCROLL_CLASS:
    case POTION_CLASS:
    case WAND_CLASS:
    case RING_CLASS:
    case GEM_CLASS:
    case SPBOOK_CLASS:
    case ARMOR_CLASS:
    case TOOL_CLASS:
    case VENOM_CLASS:
        return getObjDescr(ityp) != null ? TRUE : FALSE;
    default:
        break;
    }
    return FALSE;
}

/* some_mon_nam — C ref: nethack-c/src/do_name.c:1062-1071.
 * In between noit_mon_nam() and mon_nam(): where the latter would pick "it",
 * use "someone" (humanoids) or "something" (everything else) instead. */
export function some_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE, null,
                    xm_has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | AUGMENT_IT)
                                            : AUGMENT_IT,
                    false);
}

/* y_monnam — C ref: nethack-c/src/do_name.c:1115-1129.  Pet name: "your little
 * dog".  ARTICLE_YOUR is handled by x_monnam itself (do_name.c:1012-1014); the
 * old local "your " prefix double-applied it for pets and mis-applied it for
 * the hostile ARTICLE_THE case. */
export function y_monnam(mtmp) {
    const prefix = mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE;
    /* "saddled" is redundant when mounted */
    const suppression_flag = (xm_has_mgivenname(mtmp)
                              || xm_same_monst(mtmp, (game.u || {}).usteed))
                                 ? SUPPRESS_SADDLE
                                 : 0;

    return x_monnam(mtmp, prefix, null, suppression_flag, false);
}

/* noit_mon_nam — C ref: nethack-c/src/do_name.c:1048-1060.
 * mon_nam() (y_monnam() if tame) but assume the player can always see the
 * monster — used for probing, for cursed-potion-of-invisibility aggravation,
 * and for a pet moving "reluctantly" onto a cursed object. */
export function noit_mon_nam(mtmp) {
    return x_monnam(mtmp, ARTICLE_YOUR, null,
                    xm_has_mgivenname(mtmp) ? (SUPPRESS_SADDLE | SUPPRESS_IT)
                                            : SUPPRESS_IT,
                    false);
}

/* new_mgivenname — C ref: nethack-c/src/do_name.c:30-46
 * Allocate space for a monster's name; removes old name if one is present.
 * The new buffer is alloc()'s empty string; the caller Strcpy's the name in.
 */
export function new_mgivenname(mtmp, lth) {
    if (lth) {
        /* C: if (!mtmp->mextra) mtmp->mextra = newmextra();
         *    else free_mgivenname(mtmp);
         *    MGIVENNAME(mtmp) = (char *) alloc((unsigned) lth);
         * The name lives ONLY in mextra (mextra.h MGIVENNAME); the flat
         * mtmp.mgivenname this used to write was invisible to C's
         * has_mgivenname() macro and to every reader that mirrors it. */
        if (!mtmp.mextra)
            mtmp.mextra = newmextra();
        else
            free_mgivenname(mtmp);
        mtmp.mextra.mgivenname = alloc_mhitm(lth); /* C do_name.c:41 */
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if (mtmp.mextra && mtmp.mextra.mgivenname != null) /* has_mgivenname */
            free_mgivenname(mtmp);
    }
}

export function free_mgivenname(mon) {
    if (mon.mextra && mon.mextra.mgivenname != null)
        mon.mextra.mgivenname = null;
}
