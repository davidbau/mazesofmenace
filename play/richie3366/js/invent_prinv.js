// invent_prinv.js — C invent.c prinv / xprname (tty fireassist subset).
// C ref: invent.c prinv, xprname; wield.c ready_weapon prinv before setuwep.

import { game } from './gstate.js';
import { W_WEP } from './const.js';
import { doname } from './objnam.js';
import { pline } from './display.js';

/** C: invlet from invent chain tail→head (addinv order). */
export function objToLetLikeC(obj, g = game) {
    if (!obj) return ' ';
    if (obj.invlet) return obj.invlet;
    const chain = [];
    for (let o = g.invent; o; o = o.nobj) chain.push(o);
    for (let i = chain.length - 1, c = 97; i >= 0; i--, c++) {
        if (chain[i] === obj) return String.fromCharCode(c);
    }
    return '?';
}

/** C: objnam.c doname with temporary owornmask for prinv "(weapon in right hand)". */
function donameWithTempWornLikeC(otmp, g, wornMask) {
    const saved = otmp.owornmask | 0;
    otmp.owornmask = saved | wornMask;
    let s = doname(otmp, g);
    if ((wornMask & W_WEP) !== 0 && !s.includes('weapon in')) {
        s += ' (weapon in right hand)';
    }
    otmp.owornmask = saved;
    return s;
}

/**
 * C: invent.c xprname — "b - a +1 bow (weapon in right hand)."
 * @param {object} obj
 * @param {import('./gstate.js').game} [g]
 * @param {{ dot?: boolean, wornMask?: number }} [opts]
 */
export function xprnameLikeC(obj, g = game, opts = {}) {
    const dot = opts.dot !== false;
    const wornMask = opts.wornMask | 0;
    const letc = objToLetLikeC(obj, g);
    const txt = wornMask ? donameWithTempWornLikeC(obj, g, wornMask) : doname(obj, g);
    return `${letc} - ${txt}${dot ? '.' : ''}`;
}

/** C: invent.c prinv + pline; tty `--More--` via _showDefmoreOnTopline. */
export async function prinvLikeC(prefix, obj, g = game, opts = {}) {
    const msg = `${prefix || ''}${prefix ? ' ' : ''}${xprnameLikeC(obj, g, opts)}`;
    g._showDefmoreOnTopline = true;
    await pline(msg);
    g._retainMessageAfterCommand = true;
}
