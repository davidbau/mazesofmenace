// rumors.js — C ref: src/rumors.c, the Oracle half.
//
// init_rumors()/getrumor()/get_rnd_line()/get_rnd_text()/outrumor() already
// live in js/engrave.js (they were needed for random engravings).  What was
// missing is everything the Oracle uses: init_oracles(), outoracle() and
// doconsult(), plus outrumor()'s BY_ORACLE arm — whose "offhandedly /
// casually / nonchalantly" adverb costs up to three real rn2() draws that no
// other rumor path makes.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { update_topl } from './display.js';
import { ORACLES_B64 } from './oracles_data.js';
import { outrumor, BY_ORACLE } from './engrave.js';

const ECMD_OK = 0x00, ECMD_TIME = 0x01;   // hack.h:1456
const BUFSZ = 256;
const COLNO = 80;

function decodeBase64(b64) {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64');
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
const ORACLES_DATA = decodeBase64(ORACLES_B64);

// C ref: hacklib.c xcrypt() — the symmetric bit-rotation cipher, restarted for
// every line (bitmask is a local).
function xcrypt(str) {
    let out = '';
    let bitmask = 1;
    for (let i = 0; i < str.length; i++) {
        let q = str.charCodeAt(i);
        if (q & (32 | 64)) q ^= bitmask;
        out += String.fromCharCode(q);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

// dlb_fgets: read from `pos` up to and including the first '\n', or `max`-1
// bytes, or EOF.
function dlb_fgets(data, pos, max) {
    let s = '';
    let i = pos;
    while (i < data.length && s.length < max - 1) {
        const c = String.fromCharCode(data[i]);
        s += c;
        i++;
        if (c === '\n') break;
    }
    return { line: s, next: i };
}

// C ref: rumors.c:577 init_oracles(fp) — skip the "don't edit" comment, read
// the count, then that many "%5lx" offsets.  Called once; oracle_loc is then
// mutated by outoracle() as oracularities are used up.
let _oracles = null;
function init_oracles() {
    if (_oracles) return _oracles;
    let { next } = dlb_fgets(ORACLES_DATA, 0, BUFSZ);       /* comment */
    let line;
    ({ line, next } = dlb_fgets(ORACLES_DATA, next, BUFSZ));
    const cnt = parseInt(line, 10);
    const loc = [];
    if (cnt > 0) {
        for (let i = 0; i < cnt; i++) {
            ({ line, next } = dlb_fgets(ORACLES_DATA, next, BUFSZ));
            loc.push(parseInt(line.trim(), 16));
        }
    }
    _oracles = { cnt: cnt > 0 ? cnt : 0, loc };
    return _oracles;
}

// C ref: rumors.c:640 outoracle(special, delphi).  The one draw is
// rnd(oracle_cnt - 1) for a non-special oracularity; the chosen slot is then
// overwritten by the last one and the count shrinks, so repeat consultations
// never repeat text.
export async function outoracle(special, delphi) {
    const o = init_oracles();
    if (o.cnt === 0) return;
    if (o.cnt <= 1 && !special) return;

    const oracle_idx = special ? 0 : rnd(o.cnt - 1);
    const start = o.loc[oracle_idx];
    if (!special) o.loc[oracle_idx] = o.loc[--o.cnt];

    await update_topl(delphi
        ? (special ? 'The Oracle scornfully takes all your gold and says:'
                   : 'The Oracle meditates for a moment and then intones:')
        : 'The message reads:');
    await update_topl('');

    let pos = start;
    for (;;) {
        const r = dlb_fgets(ORACLES_DATA, pos, COLNO);
        if (!r.line.length || r.line === '---\n') break;
        pos = r.next;
        let line = r.line;
        const nl = line.indexOf('\n');
        if (nl >= 0) line = line.slice(0, nl);
        await update_topl(xcrypt(line));
    }
}

// C ref: rumors.c:529 outrumor()'s BY_ORACLE arm — the adverb costs rn2(4),
// then rn2(3), then rn2(2), short-circuited left to right.
async function oracle_says(truth) {
    const line = outrumor(truth, BY_ORACLE);
    const adverb = !rn2(4) ? 'offhandedly '
                 : (!rn2(3) ? 'casually '
                            : (rn2(2) ? 'nonchalantly ' : ''));
    await update_topl(`True to her word, the Oracle ${adverb}says: `);
    await update_topl(`"${line}"`);
}

// C ref: rumors.c:696 doconsult(oracl) — #chat with the Oracle.
export async function doconsult(oracl) {
    const u = game.u;
    const { money_cnt_invent } = await import('./shk.js');
    const { ynq, currency } = await import('./invent.js');
    const { y_n } = await import('./display.js');
    const { money2mon } = await import('./shk.js');
    const { Monnam } = await import('./uhitm.js');
    const { exercise } = await import('./attrib.js');
    const minor_cost = 50, major_cost = 500 + 50 * (u.ulevel | 0);
    let u_pay;

    game.multi = 0;
    const umoney = money_cnt_invent();

    if (!oracl) {
        await update_topl('There is no one here to consult.');
        return ECMD_OK;
    } else if (!oracl.mpeaceful) {
        await update_topl(`${Monnam(oracl)} is in no mood for consultations.`);
        return ECMD_OK;
    } else if (!umoney) {
        await update_topl('You have no gold.');
        return ECMD_OK;
    }

    const o = init_oracles();
    const c = await ynq(`"Wilt thou settle for a minor consultation?" (${
        minor_cost} ${currency(minor_cost)})`);
    if (c === 'y') {
        if (umoney < minor_cost) {
            await update_topl("You don't even have enough gold for that!");
            return ECMD_OK;
        }
        u_pay = minor_cost;
    } else if (c === 'n') {
        if (umoney <= minor_cost || o.cnt === 1) return ECMD_OK;
        const c2 = await y_n(`"Then dost thou desire a major one?" (${
            major_cost} ${currency(major_cost)})`);
        if (c2 !== 'y') return ECMD_OK;
        u_pay = (umoney < major_cost) ? umoney : major_cost;
    } else {
        return ECMD_OK;                                   /* 'q' */
    }

    await money2mon(oracl, u_pay);
    game.disp = game.disp || {};
    game.disp.botl = true;
    u.uevent = u.uevent || {};
    let add_xpts = 0;
    if (u_pay === minor_cost) {
        await oracle_says(1);
        if (!u.uevent.minor_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.major_oracle ? 25 : 10));
        u.uevent.minor_oracle = true;
    } else {
        const cheapskate = u_pay < major_cost;
        await outoracle(cheapskate, true);
        if (!cheapskate && !u.uevent.major_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.minor_oracle ? 25 : 10));
        u.uevent.major_oracle = true;
        exercise(2 /*A_WIS*/, !cheapskate);
    }
    if (add_xpts) {
        const { more_experienced, newexplevel } = await import('./exper.js');
        more_experienced(add_xpts, Math.trunc(u_pay / 50));
        await newexplevel();
    }
    return ECMD_TIME;
}
