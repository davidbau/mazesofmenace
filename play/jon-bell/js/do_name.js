// js/do_name.js — port of nethack-c/src/do_name.c
//

import { monPmname, permonstTemplate } from './makemon.js';
import { rn2, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
import { get_rnd_line_from_section } from './mklev.js';
import { BOGUSMON_LINES, BOGUSMON_OFFSETS, BOGUSMON_SIZE, MD_PAD_BOGONS } from './bogusmon_data.js';
import { ENV } from './hostenv.js';
import { game } from './gstate.js';
import { The } from './objnam.js';
import { Upolyd } from './const.js';
import { is_youmonst } from './mhitm.js';
import { GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HAND, INV_ORDER, MS_ANIMAL, OCLASS_FOOD, OCLASS_NAME, OCLASS_POTION, OCLASS_WEAPON, SPE_NOVEL_OTYP, SetVoice, _ach_rank_of, _cmd_Hallucination, _disco_append_price_quote, _disco_typename, _fl_pmidx, _glyph_at, _hidesUnder_useupf, _interesting_to_discover, _plineVFmt, _restrict_name, _um_beautiful, _um_mhis, _uprop_active, body_part, carrying, cmdq_clear, cmdq_pop, donamelevel, flooreffects_is_plural, getObjFromGetobj, getpos, look_at_object, set_cursor, type_is_pname, verbalize } from './cmd.js'; // relocate-fns
import { build_window_screen, menu_search_case } from './com_pager.js'; // relocate-fns
import { ARTICLE_THE, CMDQ_KEY, CQ_CANNED, ECMD_OK, GETOBJ_NOFLAGS, GETOBJ_PROMPT, HALLUC, HALLUC_RES, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, OBJ_FREE, OBJ_INVENT, ONAME_KNOW_ARTI, ONAME_VIA_NAMING, PICK_ONE, PL_PSIZ, has_mgivenname, isok, u_at } from './const.js'; // relocate-fns
import { GLYPHCLS_OBJ, GLYPHCLS_SWALLOW, await_menu_key, canspotmon, docorner_blank_utf8_captures, docrt, flush_screen, force_more_pages, see_with_infrared, sensemon } from './display.js'; // relocate-fns
import { You, xname } from './do_wear.js'; // relocate-fns
import { shkname as dokick_shkname } from './dokick.js'; // relocate-fns
import { newobj } from './game.js'; // relocate-fns
import { mungspaces, upstart } from './hacklib.js'; // relocate-fns
import { update_inventory } from './inventory_refresh.js'; // relocate-fns
import { mhe } from './makemon.js'; // relocate-fns
import { christen_monst as _fl_christen_monst, distant_monnam, helpless, objtyp_is_callable, roguename } from './mhitm.js'; // relocate-fns
import { OC_USES_KNOWN, dealloc_obj, wipeout_text } from './mklev.js'; // relocate-fns
import { discover_object, undiscover_object } from './o_init.js'; // relocate-fns
import { CXN_NORMAL, Ysimple_name2, simpleonames as _ia_simpleonames, an, getObjDescr, oname, xname_flags } from './objnam.js';
import { artifact_name as artifact_name_exported, exist_artifact } from './artifact.js'; // relocate-fns
import { pline } from './pline.js'; // relocate-fns
import { NUMMONS, PM_DEATH, PM_FAMINE, PM_GHOST, PM_JUIBLEX, PM_PESTILENCE } from './pm.generated.js'; // relocate-fns
import { COIN_CLASS, safe_qbuf as inventory_safe_qbuf } from './shk.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { m_at } from './uhitm.js'; // relocate-fns
import { cansee } from './vision.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { x_monnam, xm_has_mgivenname } from './mhitm.js';
import { SUPPRESS_SADDLE } from './const.js';
import { NH_BLACK, NH_BLUE, NH_GOLDEN, NH_PURPLE, NH_RED, NH_SILVER } from './read.js'; // relocate-fns
import { NON_PM } from './const.js'; // relocate-fns
import { PM_LONG_WORM, PM_LONG_WORM_TAIL } from './pm.generated.js'; // relocate-fns
import { m_at as monster_at } from './uhitm.js'; // relocate-fns
import { y_monnam as y_monnam_real } from './mhitm.js'; // relocate-fns
export { read_tribute } from './files.js'; // relocate-fns

/* C monflag.h enum mgender { MALE, FEMALE, NEUTRAL, NUM_MGENDERS } */
const MALE = 0, FEMALE = 1;

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
        ...rows.map((r, i) => shown[i] + ' - ' + r[1]),
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
    } else if (g.level?.at(cc.x, cc.y)?.disp_cls === GLYPHCLS_OBJ) {
        ({ obj, fakeobj } = await look_at_object(cc.x, cc.y, _glyph_at(cc.x, cc.y), false, true));
    }
    if (!obj) {
        await pline(`There doesn't seem to be any object ${here ? 'under you' : 'there'}.`);
        return;                                         /* C:704-709 */
    }
    const STRANGE_OBJECT = 0; /* objects.h:80 */
    const buf = (obj.otyp !== STRANGE_OBJECT) ? _ia_simpleonames(obj) : 'strange object';
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

/* C ref: o_init.c:1128-1213 rename_disco() — the nameable subset of the
 * discoveries list as a PICK_ONE menu, then docall() on a dummy object of the
 * picked type.  disco[] is walked per class in flags.inv_order, filtered by
 * interesting_to_discover() and objtyp_is_callable(); each class with a
 * surviving row gets a heading.  Selector letters run a-z then A-Z across the
 * headings (tty add_menu auto-assignment, wintty.c).  Single-page only. */
async function rename_disco() {
    const g = game;
    const lines = [menu_heading_text('Pick an object type to name'), ''];
    const picks = {};
    const pickItems = [];
    let ct = 0, mn = 0;
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const disco = g._disco || {};
    for (const oclass of (g.flags?.inv_order || INV_ORDER)) { /* C:1143 flags.inv_order */
        const list = disco[oclass];
        if (!list) continue;
        let prev_class = oclass + 1; /* C:1149 forced different from oclass */
        for (const dis of list) {
            if (!dis || !_interesting_to_discover(dis))
                continue;                           /* C:1154 */
            ct++;
            if (!objtyp_is_callable(dis))
                continue;                           /* C:1157 */
            mn++;
            if (oclass !== prev_class) {
                lines.push(menu_heading_text(OCLASS_NAME[oclass])); /* C:1162 */
                prev_class = oclass;
            }
            /* letter assigned after paging (tty_end_menu restarts at 'a' per page) */
            pickItems.push({ row: lines.length, otyp: dis, oclass });
            lines.push(`\0 - ${_disco_append_price_quote(_disco_typename(dis), dis)}`);
        }
    }
    if (ct === 0) {
        await You("haven't discovered anything yet...");   /* C:1177 */
        return;
    }
    if (mn === 0) {
        await pline('None of your discoveries can be assigned names...'); /* C:1179 */
        return;
    }
    const maxLen = lines.reduce((mx, ln) =>
        Math.max(mx, ln.replace(/\x1b\[[0-9;]*m/g, '').length), 0);
    /* wintty.c:1908 H2344_BROKEN: offx = min(min(82, cols/2), cols - maxcol - 1);
     * a menu whose content rows + 1 reach 24 (lines.length >= 23, wintty.c
     * cw->maxrow >= rows - 1; C rename_disco itself makes no paging
     * decision, o_init.c:1185 end_menu) or one too wide
     * for an overlay drops to offx 0 and is paged at 23 content rows with
     * process_menu_window's "(%d of %d)" footer (wintty.c:1537-1539). */
    const SCREEN_ROWS = 24, PAGE_CONTENT = SCREEN_ROWS - 1;
    const fullScreen = lines.length + 1 >= SCREEN_ROWS || 78 - maxLen <= 1;
    const pageCount = fullScreen ? Math.ceil(lines.length / PAGE_CONTENT) : 1;
    /* wintty.c tty_end_menu: auto selectors a-z,A-Z restart on every page */
    const perPage = {};
    for (const it of pickItems) {
        const pg = fullScreen ? Math.floor(it.row / PAGE_CONTENT) : 0;
        const letter = letters[perPage[pg] = (perPage[pg] || 0) + 1, perPage[pg] - 1];
        picks[pg + ':' + letter] = { otyp: it.otyp, oclass: it.oclass };
        lines[it.row] = letter + lines[it.row].slice(1);
    }
    let pageIdx = 0;
    const WIN_COL = fullScreen ? 0 : Math.min(41, 80 - maxLen - 2);
    const pageSel = () => Object.keys(picks)
        .filter((key) => Number(key.split(':')[0]) === (fullScreen ? pageIdx : 0))
        .map((key) => key.split(':')[1]).join('');
    const show = async () => {
        if (fullScreen) {
            const pageLines = lines.slice(pageIdx * PAGE_CONTENT, (pageIdx + 1) * PAGE_CONTENT);
            const morestr = pageCount > 1 ? `(${pageIdx + 1} of ${pageCount})` : '(end) ';
            const rows = new Array(SCREEN_ROWS).fill('');
            for (let i = 0; i < pageLines.length; i++) rows[i] = ` ${pageLines[i]}`;
            rows[pageLines.length] = ` ${morestr}`;
            g._screen_output = rows.join('\n');
            g._pending_message = '';
            set_cursor(1 + morestr.length, pageLines.length);
            return;
        }
        const screen = build_window_screen([...lines, '(end)'], WIN_COL, g.u?.uac ?? 0);
        g._screen_output = screen;
        g._pending_message = '';
        set_cursor(WIN_COL + '(end)'.length + 1, lines.length);
    };
    await show();
    let k;
    for (;;) {
        k = await await_menu_key(show, pageSel(), '', PICK_ONE);
        /* wintty.c process_menu_window: space / '>' next page, '<' previous;
         * space on the last page finishes the menu. */
        if (fullScreen && (k === 32 || k === 62) && pageIdx < pageCount - 1) { pageIdx++; await show(); continue; }
        if (fullScreen && k === 60 && pageIdx > 0) { pageIdx--; await show(); continue; }
        break;
    }
    g._pending_message = '';
    if (fullScreen) {
        /* wintty.c:971-978 erase_menu_or_text: an offx 0 window is dismissed by
         * docrt(), which re-rolls every hallucinated cell (display RNG) and
         * leaves both status rows blank until the next bot(). */
        await docrt();
        g._statusBlankAfterDocrt = true;
        if (g.disp) g.disp.botlx = 1;
        g._status1WholeNext = true;
    }
    const pick = picks[(fullScreen ? pageIdx : 0) + ':' + String.fromCharCode(k)];
    if (!pick) return;                              /* C:1188 STRANGE_OBJECT */
    const odummy = {                                /* C:1192-1200 */
        otyp: pick.otyp, oclass: pick.oclass, quan: 1,
        known: OC_USES_KNOWN[pick.otyp] ? 0 : 1,
        dknown: 1,
    };
    await docall(odummy);
}

const SPE_NOVEL = 408; /* objects.h: SPE_NOVEL */

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
    const do_swallow = !mtmp && u.uswallow && g.level?.at(cx, cy)?.disp_cls === GLYPHCLS_SWALLOW;
    if (do_swallow) mtmp = u.ustuck;
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
    let buf = await getlin(qbuf);
    /* name_from_player: empty or ESC -> NULL -> return. */
    if (!buf || buf === '\x1b')
        return;
    buf = mungspaces(buf);
    if (buf.length >= PL_PSIZ_CMD)
        buf = buf.slice(0, PL_PSIZ_CMD - 1);
    const GENO_UNIQ = 0x1000; /* monflag.h G_UNIQ */
    if (((mtmp.data?.geno | 0) & GENO_UNIQ) && !mtmp.ispriest) {
        if (!await _alreadynamed(mtmp, monnambuf, buf))
            await pline(`${monnambuf.charAt(0).toUpperCase()}${monnambuf.slice(1)} doesn't like being called names!`);
    } else if (mtmp.isshk && !(_uprop_active('DEAF') || helpless(mtmp) || mtmp.data.msound <= MS_ANIMAL)) {
        if (!await _alreadynamed(mtmp, monnambuf, buf)) {
            SetVoice(mtmp, 0, 80, 0);
            await verbalize("I'm %s, not %s.", dokick_shkname(mtmp), buf);
        }
    } else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk
               || _fl_pmidx(mtmp) === PM_GHOST || mtmp.mextra?.ebones) {
        if (!await _alreadynamed(mtmp, monnambuf, buf))
            await pline(`${monnambuf.charAt(0).toUpperCase()}${monnambuf.slice(1)} will not accept the name ${buf}.`);
    } else {
        await _fl_christen_monst(mtmp, buf);
    }
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
    if ((obj.otyp | 0) === SPE_NOVEL_OTYP) {
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

const PL_PSIZ_CMD = PL_PSIZ; /* config.h PL_PSIZ */

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

const PL_PSIZ_DOCALL = PL_PSIZ; /* global.h:404 PL_PSIZ */

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
    return String.fromCharCode(first) + bp.slice(1);
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

export function y_monnam(mtmp) {
    return y_monnam_real(mtmp); // C do_name.c:1117-1129
}
