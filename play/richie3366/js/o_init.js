// o_init.js — Object initialization / description shuffle / discoveries.
// C ref: o_init.c — init_objects, shuffle_all, randomize_gem_colors,
//        interesting_to_discover / disco_append_typename / rename_disco.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { BUFSZ } from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { disco_typename, Japanese_item_name } from './objnam.js';
import { append_price_quote } from './shk.js';
import { let_to_name, DEF_INV_ORDER } from './invent.js';
import { docall, objtyp_is_callable } from './do_name.js';
import { select_menu_pick_one } from './options.js';
import { PM_SAMURAI } from './generated/monsters_data.js';
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
    objectDescrs,
} from './objects.js';
import { artifacts_globals_init } from './artifact.js';

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

/**
 * C ref: dungeon.c ledger_no — dlevel + dungeons[dnum].ledger_start.
 * Local to avoid invent/do import cycles from o_init.
 */
function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

/**
 * C ref: dungeon.c maxledgerno — last dungeon ledger_start + num_dunlevs.
 */
function maxledgerno() {
    const n = game.n_dgns | 0;
    const duns = game.dungeons || [];
    if (n <= 0 || !duns.length) return 0;
    const last = duns[n - 1] || duns[duns.length - 1];
    return ((last?.ledger_start | 0) + (last?.num_dunlevs | 0)) | 0;
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
