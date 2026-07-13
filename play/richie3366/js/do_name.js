// do_name.js — Object naming helpers (partial).
// C ref: do_name.c oname / artifact naming / docallcmd.

import { artifact_exists, exist_artifact } from './artifact.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, docrt } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import { ONAME_VIA_NAMING, MGIVENNAME, has_mgivenname } from './const.js';
import { ATR_INVERSE } from './terminal.js';

const PL_PSIZ = 32; // C: PL_PSIZ player-name / oname buffer

/**
 * C ref: do_name.c christen_monst — assign MGIVENNAME (pet / #name).
 */
export function christen_monst(mtmp, name) {
    if (!mtmp) return mtmp;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);
    if (!mtmp.mextra) mtmp.mextra = {};
    if (n) mtmp.mextra.mgivenname = n;
    else delete mtmp.mextra.mgivenname;
    // C: leash → update_inventory deferred
    return mtmp;
}

function mon_plain_name(mtmp) {
    const raw = mtmp?.data?.name || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

function highc_name(name) {
    if (!name) return 'It';
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * C ref: do_name.c x_monnam — tame/name subset for displace and pet plines.
 * ARTICLE_YOUR + named pet → bare given name (name_at_start clears article).
 */
export function x_monnam_tame(mtmp) {
    if (!mtmp) return 'it';
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    const plain = mon_plain_name(mtmp);
    if (mtmp.mtame) return `your ${plain}`;
    return `the ${plain}`;
}

/**
 * C ref: do_name.c mon_nam / Monnam — ARTICLE_THE; named → bare name.
 * Hallu / invis / saddle / priest / shk deferred.
 */
export function Monnam(mtmp) {
    if (!mtmp) return 'It';
    if (has_mgivenname(mtmp)) return highc_name(MGIVENNAME(mtmp));
    return highc_name(`the ${mon_plain_name(mtmp)}`);
}

/**
 * C ref: do_name.c noit_mon_nam / noit_Monnam — ARTICLE_YOUR; named → bare.
 * SUPPRESS_IT / hallu deferred.
 */
export function noit_Monnam(mtmp) {
    if (!mtmp) return 'It';
    if (has_mgivenname(mtmp)) return highc_name(MGIVENNAME(mtmp));
    if (mtmp.mtame) return highc_name(`your ${mon_plain_name(mtmp)}`);
    return Monnam(mtmp);
}

/**
 * C ref: do_name.c oname — assign name; may create artifact via artifact_exists.
 */
export function oname(obj, name, oflgs = 0) {
    if (!obj) return obj;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);

    // If already artifact or named artifact exists, keep current
    if (obj.oartifact || (n && exist_artifact(obj.otyp, n))) {
        return obj;
    }

    if (!obj.oextra) obj.oextra = {};
    if (n) obj.oextra.oname = n;
    else delete obj.oextra.oname;

    if (n) artifact_exists(obj, n, true, oflgs | 0);

    // Dual-wield / intrinsic / shop / literate paths deferred
    void (oflgs & ONAME_VIA_NAMING);
    return obj;
}

export function safe_oname(obj) {
    return obj?.oextra?.oname || '';
}

/**
 * C ref: do_name.c docallcmd — "What do you want to name?" menu.
 * Cancel and floor getpos-cancel paths; other branches named deferred.
 */
export async function docallcmd() {
    await flush_topl_more();
    const entries = [
        { text: 'What do you want to name?', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: 'm - a monster', attr: 0 },
        { text: 'i - a particular object in inventory', attr: 0 },
        { text: 'o - the type of an object in inventory', attr: 0 },
        { text: 'f - the type of an object upon the floor', attr: 0 },
        { text: 'd - the type of an object on discoveries list', attr: 0 },
        { text: 'a - record an annotation for the current level', attr: 0 },
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === 'q') return;
        // C select_menu: Enter/space with no pick → re-prompt (n==0)
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        if (ch === 'f' || ch === ',') {
            await namefloorobj_stub();
            return;
        }
        if (ch === 'i' || ch === 'y') {
            await name_invent_obj_stub();
            return;
        }
        if (ch === 'a' || ch === 'l') {
            // donamelevel deferred
            return;
        }
        if (ch === 'm' || ch === 'C' || ch === 'o' || ch === 'n'
            || ch === 'd' || ch === '\\') {
            return;
        }
    }
}

/** C ref: docallcmd case 'i' → getobj("name") — cancel via Esc. */
async function name_invent_obj_stub() {
    game._pending_message = 'What do you want to name? [?] ';
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10) {
            game._pending_message = '';
            return;
        }
    }
}

/**
 * C ref: do_name.c namefloorobj — getpos subset; Esc cancels.
 * hjkl move a targeting cursor, not the hero.
 */
async function namefloorobj_stub() {
    game._pending_message = "object on map (or '.' for one under you)";
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        if (key === 27) {
            game._pending_message = '';
            return;
        }
    }
}
