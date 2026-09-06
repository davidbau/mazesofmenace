// rumors.js — Rumor file load + getrumor for graffiti / fortune cookies.
// C ref: rumors.c getrumor / get_rnd_line / outrumor / outoracle / doconsult;
//         makedefs.c padline + xcrypt packing.

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { A_WIS, exercise } from './attrib.js';
import { pline, verbalize } from './display.js';
import { SetVoice, voice_oracle } from './sndprocs.js';
import { Monnam } from './do_name.js';
import { ynq, y_n } from './getline.js';
import { currency } from './invent.js';
import { money_cnt, money2mon } from './shk.js';
import { record_achievement } from './insight.js';
import { more_experienced, newexplevel } from './exper.js';
import { show_text_pages } from './pager.js';
import { ACH_ORCL, ECMD_OK, ECMD_TIME } from './const.js';
import {
    TRUE_RUMOR_BUF,
    FALSE_RUMOR_BUF,
    MD_PAD_RUMORS,
} from './generated/rumors_data.js';
import { ORACLE_RECORDS } from './generated/oracles_data.js';

export const BY_ORACLE = 0;
export const BY_COOKIE = 1;
export const BY_PAPER = 2;

// C ref: hacklib.c xcrypt() — involution; export for engrave.c blengr.
export function xcrypt(str) {
    let bitmask = 1;
    let out = '';
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c & (32 | 64)) c ^= bitmask;
        out += String.fromCharCode(c);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

function unpadline(line) {
    return line.replace(/_+$/, '');
}

/**
 * C ref: rumors.c get_rnd_line for a single section buffer.
 * Landing mid-line: fgets rest-of-line; accept if strlen <= pad+1; then next line.
 */
function get_rnd_line(buf, rng = rn2, padlength = MD_PAD_RUMORS) {
    const filechunksize = buf.length;
    if (filechunksize < 1) return '';

    let accepted = '';
    for (let trylimit = 10; trylimit > 0; --trylimit) {
        const chunkoffset = rng(filechunksize);
        // Rest of current line from mid-line landing (like fgets after fseek)
        let i = chunkoffset;
        while (i < buf.length && buf[i] !== '\n') i++;
        const partialLen = i - chunkoffset + (i < buf.length ? 1 : 0); // include newline if present
        if (!padlength || partialLen <= padlength + 1) {
            // Accept — use next line
            let start = i + 1;
            if (start >= buf.length) start = 0;
            let end = start;
            while (end < buf.length && buf[end] !== '\n') end++;
            accepted = buf.slice(start, end);
            break;
        }
    }
    if (!accepted) return '';
    return unpadline(xcrypt(accepted));
}

/**
 * C ref: rumors.c get_rnd_text — random line from a padded+xcrypt section buffer.
 * `buf` is the post-comment chunk (as stored by extract-rumors / extract-engrave).
 */
export function get_rnd_text(buf, rng = rn2, padlength = MD_PAD_RUMORS) {
    if (!buf) return '';
    return get_rnd_line(buf, rng, padlength);
}

/**
 * C ref: rumors.c getrumor(truth, rumor_buf, exclude_cookie)
 */
export function getrumor(truth = 0, exclude_cookie = true) {
    let rumor = '';
    let count = 0;
    let adjtruth = 0;
    do {
        rumor = '';
        adjtruth = truth + rn2(2);
        const buf = (adjtruth === 1 || adjtruth === 2) ? TRUE_RUMOR_BUF : FALSE_RUMOR_BUF;
        rumor = get_rnd_line(buf);
        if (exclude_cookie && rumor.startsWith('[cookie] ')) rumor = '';
    } while (count++ < 50 && exclude_cookie && !rumor);

    if (!exclude_cookie && rumor.startsWith('[cookie] '))
        rumor = rumor.slice('[cookie] '.length);

    // C: graffiti during mklev skips WIS exercise
    if (!game.in_mklev)
        exercise(A_WIS, adjtruth > 0);

    return rumor;
}

/**
 * C ref: obj.h bcsign()
 */
export function bcsign(otmp) {
    if (!otmp) return 0;
    return (otmp.blessed ? 1 : 0) - (otmp.cursed ? 1 : 0);
}

/**
 * C ref: rumors.c outrumor()
 */
export async function outrumor(truth, mechanism) {
    const reading = mechanism === BY_COOKIE || mechanism === BY_PAPER;
    let line = getrumor(truth, reading ? false : true);
    if (!line) line = 'NetHack rumors file closed for renovation.';

    if (mechanism === BY_ORACLE) {
        // C :557–563 nested rn2 short-circuit then SetVoice + verbalize1.
        const adv = !rn2(4) ? 'offhandedly '
            : (!rn2(3) ? 'casually ' : (rn2(2) ? 'nonchalantly ' : ''));
        await pline(`True to her word, the Oracle ${adv}says: `);
        SetVoice(null, 0, 80, voice_oracle);
        await verbalize(line);
        return;
    }
    if (mechanism === BY_COOKIE)
        await pline('This cookie has a scrap of paper inside.');
    if (mechanism === BY_COOKIE || mechanism === BY_PAPER)
        await pline('It reads:');
    await pline(line);
}

/** C rumors.c init_oracles `:576–595`. Index 0 is special_oracle. */
function init_oracles() {
    const n = ORACLE_RECORDS.length | 0;
    game.oracle_cnt = n;
    game.oracle_loc = [];
    for (let i = 0; i < n; i++) game.oracle_loc.push(i);
}

/** C rumors.c outoracle `:638–693`. Rule #2 embed. Save/rest is save_oracles/restore_oracles below. */
export async function outoracle(special, delphi) {
    if ((game.oracle_flg | 0) < 0
        || ((game.oracle_flg | 0) > 0 && (game.oracle_cnt | 0) === 0)) {
        return;
    }
    if ((game.oracle_flg | 0) === 0) {
        init_oracles();
        game.oracle_flg = 1;
        if ((game.oracle_cnt | 0) === 0) return;
    }
    if ((game.oracle_cnt | 0) <= 1 && !special) return;

    const loc = game.oracle_loc;
    let oracle_idx = special ? 0 : rnd((game.oracle_cnt | 0) - 1);
    const recIdx = loc[oracle_idx] | 0;
    if (!special) {
        loc[oracle_idx] = loc[--game.oracle_cnt];
    }
    const rec = ORACLE_RECORDS[recIdx] || [];
    const lines = [];
    if (delphi) {
        lines.push(special
            ? 'The Oracle scornfully takes all your gold and says:'
            : 'The Oracle meditates for a moment and then intones:');
    } else {
        lines.push('The message reads:');
    }
    lines.push('');
    for (const row of rec) lines.push(row);
    await show_text_pages(lines);
}

/**
 * C ref: rumors.c save_oracles `:598–620` (called from save.c `:321`).
 * JSON analogue of Sfo_unsigned oracle_cnt + Sfo_ulong oracle_loc[0..cnt):
 * persist the live swap-remove deck prefix. C entries are dlb file offsets;
 * JS entries are ORACLE_RECORDS indices (Rule #2 embed) — same deck role.
 * The `release_data` FREEING arm (zero + free after write) is omitted:
 * JSON VFS always writes and in-memory state stays (save_msghistory precedent).
 * @returns {{ oracle_cnt: number, oracle_loc: number[] }}
 */
export function save_oracles() {
    const cnt = game.oracle_cnt | 0;
    const loc = game.oracle_loc || [];
    return {
        oracle_cnt: cnt,
        oracle_loc: cnt ? loc.slice(0, cnt).map((x) => x | 0) : [],
    };
}

/**
 * C ref: rumors.c restore_oracles `:623–636` (called from restore.c `:712`).
 * JSON analogue of Sfi_unsigned + Sfi_ulong loop. Missing/zero cnt = old
 * save: leave oracle_flg at its fresh-boot 0 so the next outoracle runs
 * init_oracles, exactly as C does when it reads cnt 0 (no flg assignment).
 */
export function restore_oracles(saved) {
    const cnt = saved?.oracle_cnt | 0;
    if (!cnt) return;
    const loc = Array.isArray(saved?.oracle_loc) ? saved.oracle_loc : [];
    game.oracle_cnt = cnt;
    game.oracle_loc = loc.slice(0, cnt).map((x) => x | 0);
    while (game.oracle_loc.length < cnt) game.oracle_loc.push(0);
    game.oracle_flg = 1; /* no need to call init_oracles() */
}

/** C rumors.c doconsult `:695–767`. */
export async function doconsult(oracl) {
    game.multi = 0;
    const umoney = money_cnt(game.invent);
    const minor_cost = 50;
    const major_cost = 500 + 50 * (game.u?.ulevel | 0);

    if (!oracl) {
        await pline('There is no one here to consult.');
        return ECMD_OK;
    }
    if (!oracl.mpeaceful) {
        await pline(`${Monnam(oracl)} is in no mood for consultations.`);
        return ECMD_OK;
    }
    if (!umoney) {
        await pline('You have no gold.');
        return ECMD_OK;
    }

    const qbuf = `"Wilt thou settle for a minor consultation?" (${minor_cost} ${currency(minor_cost)})`;
    const ans = await ynq(qbuf);
    let u_pay;
    switch (ans) {
    default:
    case 'q':
        return ECMD_OK;
    case 'y':
        if (umoney < minor_cost) {
            await pline("You don't even have enough gold for that!");
            return ECMD_OK;
        }
        u_pay = minor_cost;
        break;
    case 'n':
        if (umoney <= minor_cost
            || ((game.oracle_cnt | 0) === 1 || (game.oracle_flg | 0) < 0)) {
            return ECMD_OK;
        }
        {
            const q2 = `"Then dost thou desire a major one?" (${major_cost} ${currency(major_cost)})`;
            if ((await y_n(q2)) !== 'y') return ECMD_OK;
            u_pay = umoney < major_cost ? umoney : major_cost;
        }
        break;
    }
    money2mon(oracl, u_pay);
    if (game.flags) game.flags.botl = true;
    const u = game.u || (game.u = {});
    const ue = u.uevent || (u.uevent = {});
    if (!ue.major_oracle && !ue.minor_oracle) {
        record_achievement(ACH_ORCL);
    }
    let add_xpts = 0;
    if (u_pay === minor_cost) {
        await outrumor(1, BY_ORACLE);
        if (!ue.minor_oracle) {
            add_xpts = Math.trunc(u_pay / (ue.major_oracle ? 25 : 10));
        }
        ue.minor_oracle = true;
    } else {
        const cheapskate = u_pay < major_cost;
        await outoracle(cheapskate, true);
        if (!cheapskate && !ue.major_oracle) {
            add_xpts = Math.trunc(u_pay / (ue.minor_oracle ? 25 : 10));
        }
        ue.major_oracle = true;
        exercise(A_WIS, !cheapskate);
    }
    if (add_xpts) {
        more_experienced(add_xpts, Math.trunc(u_pay / 50));
        await newexplevel();
    }
    return ECMD_TIME;
}
