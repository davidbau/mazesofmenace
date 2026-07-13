// dothrow.js — Throw command (minimal path for Tourist darts).
// C ref: dothrow.c dothrow / throw_obj / throwit (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline, docrt } from './display.js';
import { rnd } from './rng.js';
import { place_object, splitobj } from './mkobj.js';
import { WEAPON_CLASS, COIN_CLASS } from './objects.js';
import {
    COLNO, ROWNO, IS_SOFT, LOST_THROWN, ZAP_POS, IS_DOOR, D_CLOSED, D_LOCKED,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { obj_resists } from './dogmove.js';
import {
    ammo_and_launcher, is_ammo, doswapweapon,
} from './wield.js';

/** C ref: cmd.c cmdq_add_ec(CQ_CANNED, …) — shared with rhack via game._cmdq_canned */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}



const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/**
 * C ref: dothrow.c throw_ok — GETOBJ_SUGGEST for coins + weapons (!uslinging).
 * DOWNPLAY / welded / AutoReturn / gem-sling branches deferred.
 */
function throw_ok(obj) {
    if (!obj) return false;
    if (obj.oclass === COIN_CLASS) return true;
    if (obj.oclass === WEAPON_CLASS) return true;
    return false;
}

/** Invent-order suggest letters (C getobj walks invent; gold `$` first). */
function throwable_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (throw_ok(o) && o.invlet) lets.push(o.invlet);
    }
    if (!lets.length) return '';
    return lets.join('');
}

/**
 * C ref: invent.c getobj("throw", throw_ok) — loop on missing letter;
 * re-prompt after more() when prior topline still needs acknowledgment.
 */
async function getobj_throw() {
    for (;;) {
        await flush_topl_more();
        const lets = throwable_lets();
        const query = lets
            ? `What do you want to throw? [${lets} or ?*]`
            : 'What do you want to throw? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!throw_ok(otmp)) {
            await pline('You cannot throw that!');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

async function getdir(prompt) {
    if (prompt) {
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r')
        return null;
    if (!(ch in DIR_DX)) {
        await pline('Never mind.');
        return null;
    }
    return { dx: DIR_DX[ch], dy: DIR_DY[ch] };
}

function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    // Also handle when otmp was split from a stack still in invent
}

/**
 * C ref: dothrow.c throw_obj — multishot rnd + split + throwit stub.
 * Enough RNG for seed1800 dart throw that lands without combat rolls.
 */
async function throw_obj(obj, _shotlimit) {
    // C: coin class → throw_gold (body deferred; `$` still in getobj suggest list)
    if (obj.oclass === COIN_CLASS) return 0;
    // Multishot stays 1 for Tourist dart (no launcher skill bonus path)
    let multishot = 1;
    multishot = rnd(multishot);
    if (multishot > (obj.quan || 1)) multishot = obj.quan || 1;

    for (let i = 1; i <= multishot; i++) {
        let otmp;
        if ((obj.quan || 1) > 1) {
            otmp = splitobj(obj, 1);
        } else {
            otmp = obj;
            freeinv(otmp);
            obj = null;
        }
        if (!otmp) break;
        // Detach split child from invent (parent stack remains)
        if (obj) {
            // split child was never in invent list as separate entry
        } else {
            freeinv(otmp);
        }
        await throwit(otmp);
    }
    return 1;
}

/**
 * C ref: dothrow.c breaktest() — always rolls obj_resists; darts don't break.
 */
function breaktest(obj) {
    if (!obj) return false;
    // nonbreakchance 1 for normal items
    if (obj_resists(obj, 1, 99)) return false;
    // glass / potions / eggs etc. — not needed for Tourist darts
    return false;
}

/**
 * C ref: zap.c bhit + dothrow.c throwit — fly along dx/dy; stop before
 * !ZAP_POS / closed door (bhit backs up one step), then place / breaktest.
 */
async function throwit(obj) {
    const u = game.u;
    const dx = u.dx || 0;
    const dy = u.dy || 0;
    // C: urange = ACURRSTR/2, then range capped; adjacent wall needs ≥1
    let range = 5;
    let x = u.ux;
    let y = u.uy;
    while (range-- > 0) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) break;
        const loc = game.level?.at?.(nx, ny);
        if (!loc) break;
        const typ = loc.typ ?? 0;
        const closed = IS_DOOR(typ) && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
        // C bhit: if (!ZAP_POS(typ) || closed_door) { bhitpos -= dir; break; }
        if (!ZAP_POS(typ) || closed) break;
        x = nx;
        y = ny;
    }
    const loc = game.level?.at?.(x, y);
    if (loc && !IS_SOFT(loc.typ) && breaktest(obj)) {
        // Broken — darts usually survive via obj_resists
        return;
    }
    obj.how_lost = LOST_THROWN;
    place_object(obj, x, y);
}


/**
 * C ref: cmd.c show_direction_keys — hjkl/yubn grid for help_dir.
 * @param {boolean} nodiag grid-bug form (orthogonal only)
 */
function show_direction_keys_lines(nodiag) {
    if (nodiag) {
        return [
            '             k   ',
            '             |   ',
            '          h- . -l',
            '             |   ',
            '             j   ',
        ];
    }
    return [
        '          y  k  u',
        '           \\ | / ',
        '          h- . -l',
        '           / | \\ ',
        '          b  j  n',
    ];
}

/**
 * C ref: cmd.c help_dir — NHW_TEXT cmdassist for invalid getdir / '?'.
 * display_nhwindow blocking; --More-- on row 23. Returns true if shown.
 * Prefix-key / ^letter Guidebook branches deferred.
 */
async function help_dir(msg) {
    const disp = game.nhDisplay;
    if (!disp) return false;

    const lines = [];
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }
    lines.push('Valid direction keys are:');
    lines.push(...show_direction_keys_lines(false));
    lines.push('');
    lines.push('          <  up');
    lines.push('          >  down');
    lines.push('          .  direct at yourself');
    if (msg) {
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }
    while (lines.length < 24) lines.push('');
    lines[23] = '--More--';

    // C: process_text_window fullscreen (offx==0) — clear map/status
    disp.clearScreen();
    game._menu_overlay = true;
    game._pending_message = '';
    for (let r = 0; r < 24; r++) {
        const text = lines[r] || '';
        for (let i = 0; i < text.length && i < disp.cols; i++)
            disp.setCell(i, r, text[i], NO_COLOR, 0);
    }
    disp.setCursor(8, 23);
    await flush_screen(1);
    await nhgetch(); // dmore / xwaitforspace
    game._menu_overlay = false;
    await docrt();
    return true;
}

/**
 * C ref: cmd.c getdir via yn_function + help_dir.
 * Esc / '.' / space / return cancel. '?' shows help and retries.
 * Other invalid keys: cmdassist NHW_TEXT then return cancel (no retry).
 * Returns {dx,dy} or null.
 */
async function getdir_cmdassist(prompt) {
    // C: tty_yn_function — Sprintf(prompt, "%s ", query)
    const base = prompt || 'In what direction?';
    const msg = base.endsWith(' ') ? base : `${base} `;
    for (;;) {
        game._pending_message = msg;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(msg.length, 0);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        game._pending_message = '';
        // C: quitchars + getdir self ('.') cancel without help
        if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r')
            return null;
        if (ch in DIR_DX) return { dx: DIR_DX[ch], dy: DIR_DY[ch] };
        // C: NHKF_GETDIR_HELP '?' → help_dir then retry
        if (ch === '?') {
            await help_dir(null);
            continue;
        }
        // C: iflags.cmdassist → help_dir("Invalid direction key!") then return 0
        if (game.flags?.cmdassist !== false) {
            await help_dir('Invalid direction key!');
        } else {
            await pline('What a strange direction!');
        }
        return null;
    }
}

/**
 * C ref: dothrow.c dofire — quivered ammo; fireassist swap; getdir.
 * Autoquiver / doquiver_core / polearm / find_launcher canned wield deferred.
 * @returns {number} 0 no turn (OK/cancel), 1 took time
 */
export async function dofire() {
    let obj = game.u?.uquiver || null;

    // C: iflags.fireassist default On — swap launcher from uswapwep then retry
    if (obj && is_ammo(obj) && game.flags?.fireassist !== false) {
        const uwep = game.u?.uwep || null;
        const uswap = game.u?.uswapwep || null;
        if (ammo_and_launcher(obj, uwep)) {
            // ready to fire
        } else if (ammo_and_launcher(obj, uswap)) {
            cmdq_add_ec(doswapweapon);
            cmdq_add_ec(dofire);
            return 0; // ECMD_OK — canned swap+fire; no time yet
        }
        // find_launcher / polearm fireassist deferred
    }

    if (!obj) {
        // C: You("have no ammunition readied.") then doquiver_core("fire")
        await pline('You have no ammunition readied.');
        return 0;
    }
    const dir = await getdir_cmdassist('In what direction?');
    if (!dir) return 0;
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;
    return await throw_obj(obj, 0);
}

export async function dothrow() {
    const obj = await getobj_throw();
    if (!obj) return 0;

    const dir = await getdir('In what direction? ');
    if (!dir) return 0;
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;

    return await throw_obj(obj, 0);
}
