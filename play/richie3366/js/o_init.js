// o_init.js — Object initialization / description shuffle / discoveries.
// C ref: o_init.c — init_objects, shuffle_all, randomize_gem_colors,
//        interesting_to_discover / disco_append_typename / rename_disco;
//        undiscover_object / gem_learned (D-1691).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline, impossible, clear_nhwindow_message } from './display.js';
import { BUFSZ, ECMD_OK, MENU_TRADITIONAL, MENU_COMBINATION, MENU_PARTIAL } from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { upstart } from './hacklib.js';
import { yn_function, y_n } from './getline.js';
import { visctrl } from './dokeylist.js';
import { disco_typename, Japanese_item_name } from './objnam.js';
import { append_price_quote, gem_learned } from './shk.js';
import { let_to_name, DEF_INV_ORDER } from './invent.js';
import { docall, objtyp_is_callable } from './do_name.js';
import { select_menu_pick_one } from './options.js';
import { PM_SAMURAI } from './generated/monsters_data.js';
import { ledger_no, maxledgerno } from './dungeon.js';
import {
    objects_globals_init,
    NUM_OBJECTS,
    MAXOCLASSES,
    GEM_CLASS,
    ARMOR_CLASS,
    POTION_CLASS,
    AMULET_CLASS,
    SCROLL_CLASS,
    SPBOOK_CLASS,
    RING_CLASS,
    WAND_CLASS,
    VENOM_CLASS,
    ILLOBJ_CLASS,
    TURQUOISE,
    AQUAMARINE,
    FLUORITE,
    SAPPHIRE,
    DIAMOND,
    EMERALD,
    WAN_NOTHING,
    POT_WATER,
    HELMET,
    HELM_OF_TELEPATHY,
    LEATHER_GLOVES,
    GAUNTLETS_OF_DEXTERITY,
    CLOAK_OF_PROTECTION,
    CLOAK_OF_DISPLACEMENT,
    SPEED_BOOTS,
    LEVITATION_BOOTS,
    FIRST_REAL_GEM,
    LAST_REAL_GEM,
    NODIR,
    IMMEDIATE,
    objectNames,
    objectNameStrs,
    objectDescrs,
    def_oc_syms,
} from './objects.js';
import {
    artifacts_globals_init,
    disp_artifact_discoveries,
    dump_artifact_info,
    NROFARTIFACTS,
} from './artifact.js';

function objs() {
    return game.objects;
}

function bases() {
    return game.bases;
}

// C ref: o_init.c COPY_OBJ_DESCR
function copy_obj_descr(dst, src) {
    dst.oc_descr_idx = src.oc_descr_idx;
    dst.oc_color = src.oc_color;
}

// C ref: o_init.c setgemprobs — level-dependent gem oc_prob (ledger_no).
export function setgemprobs(dlev) {
    const objects = objs();
    const b = bases();
    // C: if (dlev) lev = min(ledger_no(dlev), maxledgerno()); else lev = 0
    let lev = 0;
    if (dlev) {
        const led = ledger_no(dlev);
        const maxLed = maxledgerno();
        lev = (maxLed > 0 && led > maxLed) ? maxLed : led;
    }
    let first = b[GEM_CLASS];
    let j;
    for (j = 0; j < 9 - Math.trunc(lev / 3); j++) {
        objects[first + j].oc_prob = 0;
    }
    first += j;
    for (j = first; j <= LAST_REAL_GEM; j++) {
        objects[j].oc_prob = Math.trunc((171 + j - first) / (LAST_REAL_GEM + 1 - first));
    }
    let sum = 0;
    for (j = b[GEM_CLASS]; j < b[GEM_CLASS + 1]; j++) sum += objects[j].oc_prob;
    game.oclass_prob_totals[GEM_CLASS] = sum;
}

// C ref: o_init.c randomize_gem_colors
function randomize_gem_colors() {
    const objects = objs();
    if (rn2(2)) copy_obj_descr(objects[TURQUOISE], objects[SAPPHIRE]);
    if (rn2(2)) copy_obj_descr(objects[AQUAMARINE], objects[SAPPHIRE]);
    switch (rn2(4)) {
        case 0:
            break;
        case 1:
            copy_obj_descr(objects[FLUORITE], objects[SAPPHIRE]);
            break;
        case 2:
            copy_obj_descr(objects[FLUORITE], objects[DIAMOND]);
            break;
        case 3:
            copy_obj_descr(objects[FLUORITE], objects[EMERALD]);
            break;
    }
}

// C ref: o_init.c shuffle
function shuffle(o_low, o_high, domaterial) {
    const objects = objs();
    let num_to_shuffle = 0;
    for (let j = o_low; j <= o_high; j++) {
        if (!objects[j].oc_name_known) num_to_shuffle++;
    }
    if (num_to_shuffle < 2) return;

    for (let j = o_low; j <= o_high; j++) {
        if (objects[j].oc_name_known) continue;
        let i;
        do {
            i = j + rn2(o_high - j + 1);
        } while (objects[i].oc_name_known);

        let sw = objects[j].oc_descr_idx;
        objects[j].oc_descr_idx = objects[i].oc_descr_idx;
        objects[i].oc_descr_idx = sw;

        sw = objects[j].oc_tough;
        objects[j].oc_tough = objects[i].oc_tough;
        objects[i].oc_tough = sw;

        const color = objects[j].oc_color;
        objects[j].oc_color = objects[i].oc_color;
        objects[i].oc_color = color;

        if (domaterial) {
            sw = objects[j].oc_material;
            objects[j].oc_material = objects[i].oc_material;
            objects[i].oc_material = sw;
        }
    }
}

// C ref: o_init.c obj_shuffle_range
export function obj_shuffle_range(otyp) {
    const objects = objs();
    const b = bases();
    const ocls = objects[otyp].oc_class;
    let lo = otyp;
    let hi = otyp;

    switch (ocls) {
        case ARMOR_CLASS:
            if (otyp >= HELMET && otyp <= HELM_OF_TELEPATHY) {
                lo = HELMET; hi = HELM_OF_TELEPATHY;
            } else if (otyp >= LEATHER_GLOVES && otyp <= GAUNTLETS_OF_DEXTERITY) {
                lo = LEATHER_GLOVES; hi = GAUNTLETS_OF_DEXTERITY;
            } else if (otyp >= CLOAK_OF_PROTECTION && otyp <= CLOAK_OF_DISPLACEMENT) {
                lo = CLOAK_OF_PROTECTION; hi = CLOAK_OF_DISPLACEMENT;
            } else if (otyp >= SPEED_BOOTS && otyp <= LEVITATION_BOOTS) {
                lo = SPEED_BOOTS; hi = LEVITATION_BOOTS;
            }
            break;
        case POTION_CLASS:
            lo = b[POTION_CLASS];
            hi = POT_WATER - 1;
            break;
        case AMULET_CLASS:
        case SCROLL_CLASS:
        case SPBOOK_CLASS:
            lo = b[ocls];
            {
                let i = lo;
                for (; objects[i].oc_class === ocls; i++) {
                    if (objects[i].oc_unique || !objects[i].oc_magic) break;
                }
                hi = i - 1;
            }
            break;
        case RING_CLASS:
        case WAND_CLASS:
        case VENOM_CLASS:
            lo = b[ocls];
            hi = b[ocls + 1] - 1;
            break;
        default:
            break;
    }
    if (otyp < lo || otyp > hi) {
        lo = hi = otyp;
    }
    return [lo, hi];
}

// C ref: o_init.c shuffle_all
function shuffle_all() {
    const shuffle_classes = [
        AMULET_CLASS, POTION_CLASS, RING_CLASS, SCROLL_CLASS,
        SPBOOK_CLASS, WAND_CLASS, VENOM_CLASS,
    ];
    const shuffle_types = [
        HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION, SPEED_BOOTS,
    ];
    const b = bases();

    for (const ocls of shuffle_classes) {
        const [first, last] = obj_shuffle_range(b[ocls]);
        shuffle(first, last, true);
    }
    for (const typ of shuffle_types) {
        const [first, last] = obj_shuffle_range(typ);
        shuffle(first, last, false);
    }
}

// C ref: o_init.c init_oclass_probs
function init_oclass_probs() {
    const objects = objs();
    const b = bases();
    for (let oclass = 0; oclass < MAXOCLASSES; oclass++) {
        let sum = 0;
        for (let i = b[oclass]; i < b[oclass + 1]; i++) sum += objects[i].oc_prob;
        if (sum <= 0 && oclass !== ILLOBJ_CLASS && b[oclass] !== b[oclass + 1]) {
            for (let i = b[oclass]; i < b[oclass + 1]; i++) {
                objects[i].oc_prob = 1;
                sum++;
            }
        }
        game.oclass_prob_totals[oclass] = sum;
    }
}

// C ref: o_init.c init_objects
export function init_objects() {
    objects_globals_init();
    artifacts_globals_init();
    const objects = objs();
    const b = bases();

    for (let i = 0; i <= MAXOCLASSES; i++) b[i] = 0;

    for (let i = 0; i < NUM_OBJECTS; i++) {
        objects[i].oc_name_idx = objects[i].oc_descr_idx = i;
    }

    let first = MAXOCLASSES;
    let prevoclass = -1;
    while (first < NUM_OBJECTS) {
        const oclass = objects[first].oc_class;
        if (oclass < prevoclass) {
            throw new Error(`objects[${first}] class #${oclass} not in order`);
        }
        let last = first + 1;
        while (last < NUM_OBJECTS && objects[last].oc_class === oclass) last++;
        b[oclass] = first;

        if (oclass === GEM_CLASS) {
            setgemprobs(null);
            randomize_gem_colors();
        }
        first = last;
        prevoclass = oclass;
    }
    b[MAXOCLASSES] = b[MAXOCLASSES + 1] = NUM_OBJECTS;
    for (let last = MAXOCLASSES - 1; last >= 0; --last) {
        if (!b[last]) b[last] = b[last + 1];
    }

    init_oclass_probs();
    shuffle_all();
    objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE;
}

/**
 * C ref: o_init.c interesting_to_discover `:525–540`.
 * Samurai Japanese items always; else uname or (known|encountered)+OBJ_DESCR.
 */
export function interesting_to_discover(i) {
    if (game.urole?.mnum === PM_SAMURAI && Japanese_item_name(i, null)) {
        return true;
    }
    const oc = objs()?.[i];
    if (!oc) return false;
    if (oc.oc_uname) return true;
    if (!(oc.oc_name_known || oc.oc_encountered)) return false;
    const di = oc.oc_descr_idx ?? i;
    return objectDescrs[di] != null;
}

/**
 * C o_init.c undiscover_object `:497–523` — purge oindx from disco[]
 * when !oc_name_known && !oc_encountered (docall empty uname). Shift
 * later class slots forward; GEM_CLASS → gem_learned.
 * @param {number} oindx
 */
export function undiscover_object(oindx) {
    const objects = objs();
    if (oindx == null || !objects?.[oindx]) return;
    if (objects[oindx].oc_name_known || objects[oindx].oc_encountered) {
        return;
    }
    if (!game.disco) game.disco = new Array(NUM_OBJECTS).fill(0);
    const acls = objects[oindx].oc_class;
    const b = bases();
    let found = false;
    let dindx = b[acls] | 0;
    for (;
        dindx < NUM_OBJECTS && (game.disco[dindx] | 0) !== 0
            && objects[dindx]?.oc_class === acls;
        dindx++) {
        if (found) {
            game.disco[dindx - 1] = game.disco[dindx];
        } else if ((game.disco[dindx] | 0) === (oindx | 0)) {
            found = true;
        }
    }
    if (found) {
        game.disco[dindx - 1] = 0;
    } else {
        impossible('named object not in disco');
    }
    if ((objects[oindx].oc_class | 0) === GEM_CLASS) {
        gem_learned(oindx);
    }
}

/**
 * C ref: o_init.c disco_append_typename `:692–720`.
 * Truncate a long user-applied name; keep " (actual type)"; then price quote.
 * append_price_quote BUFSZ leftover is named in shk.js.
 */
export function disco_append_typename(buf, dis) {
    const typnm = disco_typename(dis);
    const len = buf.length;
    let out;
    if (len + typnm.length < BUFSZ) {
        out = buf + typnm;
    } else {
        const p = typnm.lastIndexOf('(');
        if (p > 0 && typnm.charAt(p - 1) === ' ' && typnm.indexOf(')', p) >= 0) {
            const tail = typnm.slice(p - 1);
            const n = Math.max(0, BUFSZ - 1 - (len + tail.length));
            out = buf + typnm.slice(0, n) + tail;
        } else {
            const n = Math.max(0, BUFSZ - 1 - len);
            out = buf + typnm.slice(0, n);
        }
    }
    return append_price_quote(out, dis);
}

/** C: flags.inv_order string of oclass bytes; JS pack is an array of ints. */
function rename_disco_inv_order() {
    const raw = game.flags?.inv_order;
    return (Array.isArray(raw) && raw.length) ? raw : DEF_INV_ORDER;
}

/**
 * C ref: o_init.c rename_disco `:1130–1206`.
 * Caller: do_name.c docallcmd `'d'` / `'\\'`. Skip unique/artifact
 * sections and venom (packorder omit). Dummy is not observe_object.
 * Dummy known = !objects[dis].oc_uses_known (D-1674 extract).
 * `'o'` getobj is D-1660.
 */
export async function rename_disco() {
    const objects = objs();
    const b = bases();
    const disco = game.disco || [];
    const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
    let ct = 0;
    let mn = 0;
    const items = [
        {
            text: 'Pick an object type to name',
            attr: ATR_INVERSE,
            selectable: false,
        },
        { text: '', attr: 0, selectable: false },
    ];

    for (const oclass of rename_disco_inv_order()) {
        let prev_class = (oclass | 0) + 1;
        const start = b[oclass] | 0;
        for (let i = start;
            i < NUM_OBJECTS && objects[i]?.oc_class === oclass; i++) {
            const dis = disco[i] | 0;
            if (!dis || !interesting_to_discover(dis)) continue;
            ct++;
            if (!objtyp_is_callable(dis)) continue;
            mn++;
            if (oclass !== prev_class) {
                items.push({
                    text: let_to_name(oclass, false, false),
                    attr: ATR_INVERSE,
                    selectable: false,
                });
                prev_class = oclass;
            }
            items.push({
                text: disco_append_typename('', dis),
                selectable: true,
                dis,
            });
        }
    }

    if (ct === 0) {
        // C: You("haven't discovered anything yet...");
        await pline("You haven't discovered anything yet...");
        return;
    }
    if (mn === 0) {
        await pline('None of your discoveries can be assigned names...');
        return;
    }

    const pick = await select_menu_pick_one(items);
    let dis = STRANGE_OBJECT;
    if (pick.kind === 'pick' && pick.item) dis = pick.item.dis | 0;
    if (dis !== STRANGE_OBJECT) {
        const ocl = objects[dis];
        const odummy = {
            otyp: dis,
            oclass: ocl?.oc_class,
            quan: 1,
            known: !ocl?.oc_uses_known,
            dknown: 1,
        };
        await docall(odummy);
    }
}

// C ref: o_init.c disco_order_let `:599` + disco_orders_descr `:600–606`
// (options.c optfn_sortdiscoveries shares the sort letters).
const DISCO_ORDER_LET = 'osca';
const DISCO_ORDERS_DESCR = [
    'by order of discovery within each class',
    'sortloot order (by class with some sub-class groupings)',
    'alphabetical within each class',
    'alphabetical across all classes',
];

// C ref: o_init.c uniq_objs `:543–548` — invocation relics (+ Amulet).
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const UNIQ_OBJS = [
    AMULET_OF_YENDOR,
    objectNames.indexOf('BELL_OF_OPENING'),
    objectNames.indexOf('SPE_BOOK_OF_THE_DEAD'),
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION'),
];

/**
 * C ref: o_init.c discovered_cmp `:553–565` — strcmpi past the "* "/"  "
 * discovery mark. JS sort is stable (Constitution §4); C notes no tie-break.
 */
function discovered_cmp(a, b) {
    const s1 = String(a).slice(2).toLowerCase();
    const s2 = String(b).slice(2).toLowerCase();
    return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
}

/**
 * C ref: o_init.c disco_output_sorted `:743–766` — qsort + putstr + free.
 * The lootsort rewrite (`p[6] = p[0]; p += 6`, i.e. mark + skip the 6-char
 * "%02d%02d%1d " sortloot key) is kept for shape; live callers pass false
 * ('s' order is a named omission — sortloot_descr needs loot_classify).
 */
function disco_output_sorted(lines, sorted, lootsort) {
    const arr = [...sorted].sort(discovered_cmp);
    for (const s of arr) {
        lines.push({ text: lootsort ? s.charAt(0) + s.slice(7) : s, attr: 0 });
    }
}

/**
 * C ref: o_init.c disco_fmt_uniq `:725–741` — "  name" for a unique object,
 * name-known ? OBJ_NAME : OBJ_DESCR, plus " spellbook" for the
 * encountered-but-unknown Book of the Dead (shown "papyrus spellbook" here
 * vs "spellbook (papyrus)" in the class list). C writes outbuf; JS returns.
 */
function disco_fmt_uniq(uidx) {
    const oc = objs()[uidx];
    const s = `  ${oc.oc_name_known ? objectNameStrs[uidx] : objectDescrs[oc.oc_descr_idx]}`;
    return (!oc.oc_name_known && oc.oc_class === SPBOOK_CLASS) ? `${s} spellbook` : s;
}

// C ref: o_init.c oclass_to_name `:877–886` — lowercase let_to_name().
function oclass_to_name(oclass) {
    return let_to_name(oclass, false, false).toLowerCase();
}

/**
 * C ref: o_init.c choose_disco_sort `:611–657` — the 'm'-prefix
 * discovery-sort menu. mode 2 (class disco) appends the single-class note;
 * the current-sort MENU_ITEMFLAGS_SELECTED highlight has no
 * select_menu_pick_one equivalent (presentation only; choice stands).
 * Returns 1 on pick (C n > 0), -1 on dismiss (C n < 0); the C n > 1
 * skip-preselected arm cannot happen under PICK_ONE.
 */
export async function choose_disco_sort(mode) {
    const items = DISCO_ORDERS_DESCR.map((text, i) => ({
        text,
        attr: 0,
        selectable: true,
        a_int: DISCO_ORDER_LET[i],
    }));
    if ((mode | 0) === 2) {
        // C: single-class 'a'/'c' sorts coincide, but the choice sticks.
        items.push({ text: '', attr: 0, selectable: false });
        items.push({
            text: 'Note: full alphabetical and alphabetical within class',
            attr: 0,
            selectable: false,
        });
        items.push({
            text: '      are equivalent for single class discovery, but',
            attr: 0,
            selectable: false,
        });
        items.push({
            text: '      will matter for future use of total discoveries.',
            attr: 0,
            selectable: false,
        });
    }
    const pick = await select_menu_pick_one([
        { text: 'Ordering of discoveries', attr: ATR_INVERSE, selectable: false },
        ...items,
    ]);
    if (pick.kind !== 'pick' || !pick.item) return -1;
    if (!game.flags) game.flags = {};
    game.flags.discosort = pick.item.a_int;
    return 1;
}

/**
 * C ref: o_init.c doclassdisco `:888–1127` — the extended `#knownclass`
 * command: choose a discovered class (unique 'u'/'r', artifacts 'a', or an
 * object class symbol) and list its discoveries in a text window.
 * Class menu via select_menu_pick_one (rename_disco idiom; explicit
 * menulet-order selectors, C group accelerators as gselector); text display
 * via show_text_pages (dodiscovered idiom). C strkitten/dupstr fold into
 * string ops (immutable JS strings).
 * Named omissions: discosort 's' sortloot order (sortloot_descr needs
 * loot_classify, invent.c:149–305); extcmd '`' knownclass caller wiring
 * (cmd.c:1752; the extcmdlist row exists, no dispatch arm yet).
 */
export async function doclassdisco() {
    const objects = objs();
    const b = bases();
    if (!game.flags) game.flags = {};
    // C `:906–907` — bad or unset discosort normalizes to 'o'.
    if (!game.flags.discosort || DISCO_ORDER_LET.indexOf(game.flags.discosort) < 0) {
        game.flags.discosort = 'o';
    }

    // C `:909–913` — 'm' prefix picks the sort first.
    if (game.iflags?.menu_requested) {
        if ((await choose_disco_sort(2)) < 0) return ECMD_OK;
    }
    const alphabetized = game.flags.discosort === 'a' || game.flags.discosort === 'c';
    // C `:916` lootsort is (discosort == 's'); deferred (see above).
    const lootsort = false;

    const traditional = game.flags.menu_style === MENU_TRADITIONAL
        || game.flags.menu_style === MENU_COMBINATION;

    // C `:931–975` — collect classes with discoveries, packorder + VENOM.
    let discosyms = '';
    const menuItems = [];
    let menulet = 97; /* 'a' */
    const hasUnique = UNIQ_OBJS.some(
        (uidx) => objects[uidx].oc_name_known
            || (objects[uidx].oc_encountered && uidx !== AMULET_OF_YENDOR),
    );
    if (hasUnique) {
        discosyms += 'u';
        if (!traditional) {
            menuItems.push({
                text: 'unique items or relics',
                attr: 0,
                selectable: true,
                selector: String.fromCharCode(menulet++),
                gselector: 'r',
                a_int: 'u',
            });
        }
    }
    if (disp_artifact_discoveries(null) > 0) {
        discosyms += 'a';
        if (!traditional) {
            menuItems.push({
                text: 'artifacts',
                attr: 0,
                selectable: true,
                selector: String.fromCharCode(menulet++),
                a_int: 'a',
            });
        }
    }
    const allclasses = [...rename_disco_inv_order()];
    if (!allclasses.includes(VENOM_CLASS)) allclasses.push(VENOM_CLASS);
    for (const oclass of allclasses) {
        const sym = def_oc_syms[oclass]?.sym;
        for (let i = b[oclass] | 0;
            i < NUM_OBJECTS && objects[i]?.oc_class === oclass;
            i++) {
            const dis = game.disco?.[i] | 0;
            if (dis !== 0 && interesting_to_discover(dis)
                && sym != null && !discosyms.includes(sym)) {
                discosyms += sym;
                if (!traditional) {
                    menuItems.push({
                        text: oclass_to_name(oclass),
                        attr: 0,
                        selectable: true,
                        selector: String.fromCharCode(menulet++),
                        gselector: sym,
                        a_int: sym,
                    });
                }
            }
        }
    }

    // C `:977–983` — nothing discovered at all.
    if (!discosyms) {
        await pline("You haven't discovered any items yet.");
        return ECMD_OK;
    }

    // C `:985–1022` — have the player choose a class.
    let c = 0; /* class not chosen yet */
    if (traditional) {
        // C: unseen classes stay acceptable (they report "haven't
        // discovered any") with ESC appended once as the escape hatch.
        let xtras = 0;
        for (const e of [...allclasses, 'a', 'u', 'r']) {
            const cc = (e === 'a' || e === 'u' || e === 'r') ? e : def_oc_syms[e]?.sym;
            if (cc != null && !discosyms.includes(cc)) {
                if (!xtras++) discosyms += '';
                discosyms += cc;
            }
        }
        c = await yn_function(
            'View discoveries for which sort of objects?', discosyms, ' ', true,
        );
        if (!c || c === ' ') clear_nhwindow_message();
    } else if (discosyms.length < 2 && game.flags.menu_style === MENU_PARTIAL) {
        // C `:1011–1014` — one class skips the filter under menustyle:partial.
        c = discosyms.charAt(0);
    } else {
        const pick = await select_menu_pick_one([
            {
                text: 'View discoveries for which sort of objects?',
                attr: ATR_INVERSE,
                selectable: false,
            },
            ...menuItems,
        ]);
        if (pick.kind === 'pick' && pick.item) c = pick.item.a_int;
    }
    if (!c || c === ' ') return ECMD_OK; /* player declined */

    // C `:1024–1122` — show discoveries for class c.
    const { show_text_pages } = await import('./pager.js');
    const lines = [];
    let ct = 0;
    if (c === 'u' || c === 'r') {
        lines.push({ text: upstart('unique items or relics'), attr: ATR_INVERSE });
        for (const uidx of UNIQ_OBJS) {
            if (objects[uidx].oc_name_known
                || (objects[uidx].oc_encountered && uidx !== AMULET_OF_YENDOR)) {
                ct++;
                lines.push({ text: disco_fmt_uniq(uidx), attr: 0 });
            }
        }
        if (!ct) await pline("You haven't discovered any unique items or relics yet.");
    } else if (c === 'a') {
        const wizard = !!(game.flags?.debug || game.flags?.wizard || game.wizard);
        if (wizard && (await y_n('Dump information about all artifacts?')) === 'y') {
            dump_artifact_info(lines);
            ct = NROFARTIFACTS; /* non-zero vs zero is what matters below */
        } else {
            ct = disp_artifact_discoveries(lines);
            if (!ct) await pline("You haven't discovered any artifacts yet.");
        }
    } else {
        const oclass = def_char_to_objclass(c);
        /* C: observed via fuzzer; impossible, then fall through. */
        if (oclass === MAXOCLASSES) {
            impossible(
                "doclassdisco: invalid object class '%s'",
                visctrl(String(c).charCodeAt(0)),
            );
        }
        const sortname = game.flags.discosort === 'o' ? 'order of discovery'
            : game.flags.discosort === 's' ? "'sortloot' order"
                : 'alphabetical order';
        // C: header skips iflags.menu_headings.
        lines.push({
            text: `Discovered ${let_to_name(oclass, false, false)} in ${sortname}`,
            attr: 0,
        });
        const sorted = [];
        for (let i = b[oclass] | 0; i <= (b[oclass + 1] | 0) - 1; i++) {
            const dis = game.disco?.[i] | 0;
            if (dis !== 0 && interesting_to_discover(dis)) {
                ct++;
                let buf = objects[dis].oc_encountered ? '  ' : '* ';
                buf = disco_append_typename(buf, dis);
                if (!alphabetized && !lootsort) lines.push({ text: buf, attr: 0 });
                else sorted.push(buf);
            }
        }
        if (!ct) {
            await pline(`You haven't discovered any ${oclass_to_name(oclass)} yet.`);
        } else if (sorted.length) {
            disco_output_sorted(lines, sorted, lootsort);
        }
    }
    if (ct) await show_text_pages(lines);
    return ECMD_OK;
}
