// do_name.js — Object naming helpers (partial).
// C ref: do_name.c oname / artifact naming / docallcmd.

import { artifact_exists, exist_artifact } from './artifact.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, docrt, canspotmon } from './display.js';
import { paint_corner_nhw_menu } from './invent.js';
import {
    ONAME_VIA_NAMING, MGIVENNAME, has_mgivenname, W_SADDLE, engulfing_u,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { shkname } from './shknam.js';
import { monsterNames } from './generated/monsters_data.js';

const PL_PSIZ = 32; // C: PL_PSIZ player-name / oname buffer
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C ref: do_name.c x_monnam — named PM_GHOST → "<name>'s ghost" (ARTICLE_NONE).
 * name_at_start clears article for mon_nam / Monnam / y_monnam callers.
 */
function named_ghost_monnam(mtmp) {
    if (!mtmp || (mtmp.mnum | 0) !== PM_GHOST) return null;
    if (!has_mgivenname(mtmp)) return null;
    return `${s_suffix(MGIVENNAME(mtmp))} ghost`;
}

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
 * C ref: do_name.c x_monnam — "saddled " when W_SADDLE && !Blind && !Hallu.
 * Hallu / Blind checked; SUPPRESS_SADDLE callers pass suppress (hack.h 0x08).
 */
const SUPPRESS_SADDLE = 0x08;
function saddle_adj(mtmp, suppress = 0) {
    if (suppress & SUPPRESS_SADDLE) return '';
    if (game.u?.Blind || game.u?.ublind) return '';
    if (game.u?.Hallucination) return '';
    if ((mtmp?.misc_worn_check || 0) & W_SADDLE) return 'saddled ';
    return '';
}

/**
 * C ref: do_name.c x_monnam — tame/name subset for displace and pet plines.
 * ARTICLE_YOUR + named pet → bare given name (name_at_start clears article).
 */
export function x_monnam_tame(mtmp) {
    if (!mtmp) return 'it';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    const plain = mon_plain_name(mtmp);
    const sad = saddle_adj(mtmp);
    if (mtmp.mtame) return `your ${sad}${plain}`;
    return `the ${sad}${plain}`;
}

/**
 * C ref: do_name.c x_monnam do_it — !canspotmon → "it" before type/given name.
 * ARTICLE_THE callers (mon_nam/Monnam). ARTICLE_YOUR never takes this arm.
 */
function x_monnam_do_it(mtmp) {
    if (!mtmp) return true;
    if (canspotmon(mtmp)) return false;
    if (game.program_state?.gameover) return false;
    if (mtmp === game.u?.usteed) return false;
    if (engulfing_u(mtmp)) return false;
    return true;
}

/**
 * C ref: do_name.c distant_monnam(ARTICLE_NONE) → x_monnam.
 * Shopkeeper → shkname (same arm as mon_nam / D-0307). Astral high-cleric
 * conceal deferred; hallu / mappear / invis+non-PM_SHOPKEEPER suffix deferred.
 */
export function distant_monnam_none(mtmp) {
    if (!mtmp) return 'it';
    // C x_monnam: isshk && !hallu && !mappear → shkname
    if (mtmp.isshk) {
        const nam = shkname(mtmp);
        if (nam) return nam;
    }
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    return `${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
}

/**
 * C ref: do_name.c mon_nam — ARTICLE_THE; unseen → "it"; named → bare name.
 * Shopkeeper → shkname (D-0307). Hallu / invis adj / priest / AUGMENT_IT deferred.
 */
export function mon_nam(mtmp) {
    if (!mtmp) return 'it';
    if (x_monnam_do_it(mtmp)) return 'it';
    // C x_monnam: isshk && !hallu && !mappear → shkname (ordinary PM_SHOPKEEPER)
    if (mtmp.isshk) {
        const nam = shkname(mtmp);
        if (nam) return nam;
    }
    // C x_monnam: do_name && has_mgivenname && PM_GHOST → s_suffix(name)+" ghost"
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    return `the ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
}

/**
 * C ref: do_name.c Monnam — highc(mon_nam()).
 */
export function Monnam(mtmp) {
    return highc_name(mon_nam(mtmp));
}

/**
 * C ref: do_name.c noit_mon_nam / noit_Monnam — ARTICLE_YOUR + SUPPRESS_IT.
 * Never "it"; named → bare; hallu deferred.
 */
export function noit_Monnam(mtmp) {
    if (!mtmp) return 'It';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return highc_name(ghost);
    if (has_mgivenname(mtmp)) return highc_name(MGIVENNAME(mtmp));
    if (mtmp.mtame) {
        return highc_name(`your ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`);
    }
    // SUPPRESS_IT — type name even when !canspotmon
    return highc_name(`the ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`);
}

/** C ref: do_name.c noit_mon_nam — lowercase noit_Monnam. */
export function noit_mon_nam(mtmp) {
    if (!mtmp) return 'it';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    if (mtmp.mtame) {
        return `your ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
    }
    return `the ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
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
            const { donamelevel } = await import('./dungeon.js');
            await donamelevel();
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
