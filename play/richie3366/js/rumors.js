// rumors.js — Rumor file load + getrumor for graffiti / fortune cookies.
// C ref: rumors.c getrumor / get_rnd_line / outrumor / outoracle / doconsult;
//         makedefs.c padline + xcrypt packing.

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { A_WIS, exercise } from './attrib.js';
import { pline, verbalize, impossible, flush_topl_more } from './display.js';
import { SetVoice, voice_oracle } from './sndprocs.js';
import { Monnam } from './do_name.js';
import { ynq, y_n } from './getline.js';
import { currency } from './invent.js';
import { money_cnt, money2mon } from './shk.js';
import { record_achievement } from './insight.js';
import { more_experienced, newexplevel } from './exper.js';
import { show_text_pages } from './pager.js';
import { ACH_ORCL, ECMD_OK, ECMD_TIME, RUMORFILE, ENGRAVEFILE, EPITAPHFILE, BOGUSMONFILE } from './const.js';
import {
    TRUE_RUMOR_BUF,
    FALSE_RUMOR_BUF,
    MD_PAD_RUMORS,
} from './generated/rumors_data.js';
import { ENGRAVE_BUF } from './generated/engrave_data.js';
import { EPITAPH_BUF } from './generated/epitaph_data.js';
import { BOGUSMON_BUF } from './generated/bogusmon_data.js';
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
 * C ref: rumors.c getrumor `:117–191` — rumor_buf OUT-param becomes the
 * return string (callers `getrumor(0, true)` / `getrumor(truth, bool)`).
 * dlb file handles are Rule #2 embeds (D-0477): TRUE/FALSE_RUMOR_BUF hold
 * the true/false sections, so dlb_fopen always succeeds and dlb_fclose is
 * a no-op; init_rumors header parse ran at build time (extract-rumors.py).
 * RNG order kept: rn2(2) for adjtruth, then get_rnd_line draws.
 */
export function getrumor(truth = 0, exclude_cookie = true) {
    // C :125 rumor_buf[0] = '\0'
    let rumor = '';
    // C :129 a previous try failed to open RUMORFILE
    if ((game.true_rumor_size ?? 0) < 0) return rumor;
    // C :132 rumors = dlb_fopen(RUMORFILE, "r") — embed always opens
    if (TRUE_RUMOR_BUF && FALSE_RUMOR_BUF) {
        let count = 0; // C :134
        let adjtruth = 0; // C :135, read at :175 below
        do {
            rumor = ''; // C :138
            // C :139-143 first outrumor() inits sizes; embed sets them
            // from the split buffers (starts/ends subsumed by the split)
            if ((game.true_rumor_size ?? 0) === 0) {
                if (TRUE_RUMOR_BUF.length > 0 && FALSE_RUMOR_BUF.length > 0) {
                    game.true_rumor_size = TRUE_RUMOR_BUF.length;
                    game.false_rumor_size = FALSE_RUMOR_BUF.length;
                } else {
                    game.true_rumor_size = -1; // C :104 init failed
                    rumor = `Error reading "${RUMORFILE.slice(0, 80)}".`; // C :141 %.80s
                    return rumor; // C :142
                }
            }
            // C :149 switch (adjtruth = truth + rn2(2))
            adjtruth = truth + rn2(2);
            let buf;
            switch (adjtruth) {
            case 2: // C :150 (bogus-input passthrough)
            case 1: // C :151
                buf = TRUE_RUMOR_BUF; // C :153-155 true range
                break;
            case 0: // C :157 (0 means false here, not "either")
            case -1: // C :158
                buf = FALSE_RUMOR_BUF; // C :159-160 false range
                break;
            default:
                impossible('strange truth value for rumor'); // C :162
                return 'Oops...'; // C :163 strcpy
            }
            // C :164-166 get_rnd_line(rumors, line, sizeof line, rn2,
            // beginning, ending, MD_PAD_RUMORS) — buf section version
            rumor = get_rnd_line(buf);
        } while (count++ < 50 && exclude_cookie // C :168-170
            && rumor.startsWith('[cookie] '));
        // C :171 dlb_fclose — no-op under embed
        if (count >= 50) // C :172
            impossible("Can't find non-cookie rumor?"); // C :173
        else if (!game.in_mklev) // C :174 avoid WIS for graffiti
            exercise(A_WIS, adjtruth > 0); // C :175
    } else {
        // C :176-178 open failed — unreachable under embed; record so the
        // C :129 guard trips on later calls, as C does
        impossible(`Can't open '${RUMORFILE}' file.`);
        game.true_rumor_size = -1;
    }
    if (!exclude_cookie // C :180-181
        && rumor.startsWith('[cookie] ')) {
        // C :183-189 memmove loop stripping the marker
        rumor = rumor.slice('[cookie] '.length);
    }
    return rumor; // C :190
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
    // C rumors.c:573 pline1(line) = pline("%s", line) verbatim (hack.h:1026):
    // route through the "%s" arm so rumor text containing '%' is never
    // re-scanned (vpline no-'%' vs vsnprintf arms, pline.c:192-212).
    await pline('%s', line);
}

/**
 * C ref: rumors.c couldnt_open_file `:769–782` (staticfn).
 * Suppresses impossible()'s "saving and reloading might fix this" hint
 * (unless the fuzzer escalates it) around the report, then restores it.
 * Sync like C; impossible() floats un-awaited (getrumor precedent).
 */
function couldnt_open_file(filename) {
    // C :772
    if (!game.program_state) game.program_state = {};
    const ps = game.program_state;
    const save_something = ps.something_worth_saving;
    // C :777-778 most likely the file is missing; the fuzzer escalates
    if (!(game.iflags?.debug_fuzzer)) ps.something_worth_saving = 0;
    // C :780
    impossible("Can't open '%s' file.", filename);
    // C :781
    ps.something_worth_saving = save_something;
}

/**
 * C ref: rumors.c `%06ld (%06lx)` stat formatting (`rumor_check` `:228–237`).
 * Values here are embed-relative byte offsets (see rumor_check); small and
 * non-negative, so zero-padded decimal + hex match C exactly.
 */
function fmt6d(n) {
    return String(n).padStart(6, '0');
}
function fmt6x(n) {
    return Number(n).toString(16).padStart(6, '0');
}

/**
 * C ref: dlb_fgets line model over a Rule #2 embed buffer — one entry per
 * `\\n`-terminated line, trailing terminator not an extra empty line.
 */
function splitEmbedLines(buf) {
    const arr = String(buf).split('\n');
    if (arr.length && arr[arr.length - 1] === '') arr.pop();
    return arr;
}

/**
 * C ref: rumors.c others_check `:307–408` (staticfn) — 5.0 audit helper for
 * rumor_check(); shows the first two entries and the last of the
 * engrave/epitaph/bogusmon file, counting the rest.
 * `lines` is the shared text window (C `winid *winptr` out-param); the
 * caller shows it once via show_text_pages.
 */
function others_check(ftype, fname, buf, lines) {
    // C :319 dlb_fopen(fname, "r") — the embed always opens
    if (buf) {
        // C :321-328 create the window on first use; the create-fail
        // impossible() arm has no JS counterpart (lines[] cannot fail) —
        // named in the map
        lines.push(''); // C :329
        lines.push(ftype); // C :330
        // C :331-354 the "don't edit" `#` comment-line validation arms have
        // no JS counterpart: the extractors omit the plaintext header by
        // design (extract-engrave.py) and validate structure at build time;
        // the embed starts at the first entry — named in the map
        const entries = splitEmbedLines(buf);
        if (!entries.length) {
            // C :356-362 first-non-comment-line-missing shape (unreachable:
            // the embeds are non-empty constants)
            lines.push(`others_check("${fname}"): can't read first non-comment line`);
            return; // C :361 goto closeit (fclose is a no-op under embed)
        }
        // C :363-366 first line; the makedefs default entry
        lines.push(xcrypt(entries[0]));
        if (entries.length < 2) {
            lines.push('(no second entry)'); // C :367-368
            return; // C :400-401 closeit (fclose no-op)
        }
        // C :369-373 second entry
        lines.push(xcrypt(entries[1]));
        // C :374-379 count the rest, keeping the last decrypted line
        let entrycount = 2;
        let last = '';
        for (let i = 2; i < entries.length; i++) {
            entrycount++;
            last = xcrypt(entries[i]); // C :378 (void) xcrypt(line, xbuf)
        }
        // C :380-382 count is 2 only when default + first ordinary are alone
        if (entrycount === 2) {
            lines.push('(only two entries)'); // C :383-384
        } else {
            // C :386-397 ellipsis (3+ more lines force --More-- on 24-line
            // screens) then the already-decrypted last line
            if (entrycount > 3) lines.push(' ...'); // C :394-395
            lines.push(last); // C :396 xbuf already decrypted
        }
        // C :400-401 closeit: dlb_fclose — no-op under embed
    } else {
        // C :402-407 open failed (unreachable: non-empty constant); would
        // not integrate with the text window
        couldnt_open_file(fname);
    }
}

/**
 * C ref: rumors.c rumor_check `:196–302` — `#wizrumorcheck` ("verify each
 * rumor access"): dumps the true/false section offsets and sizes plus the
 * first and last decrypted rumor of each section, then others_check()es the
 * engrave/epitaph/bogusmon files, all into one NHW_TEXT window.
 * dlb file handles are Rule #2 embeds (getrumor precedent, D-2513): the
 * section buffers ARE the file contents, so dlb_fopen always succeeds,
 * init_rumors' header parse ran at build time (extract-rumors.py), and
 * dlb_fclose is a no-op. Sizes equal C's byte-for-byte (same pad+xcrypt
 * transform); START offsets are section-relative (the embed has no "don't
 * edit" + header lines) while C's contiguity invariant is preserved
 * (true_end == false_start). Async: pline/More flush + text window.
 */
export async function rumor_check() {
    // C :199 tmpwin = WIN_ERR — the text window, shown once at the end
    const lines = [];
    // C :204 open gate (a previous try failed) + dlb_fopen (embed: opens)
    if ((game.true_rumor_size ?? 0) >= 0) {
        // C :208 rumor_buf[0] = '\0'
        // C :209-214 first-use init_rumors() (`:84–107`: skip comment, parse
        // the header line into start/size, end = start + size)
        if ((game.true_rumor_size ?? 0) === 0) {
            game.true_rumor_start = 0;
            game.true_rumor_size = TRUE_RUMOR_BUF.length;
            game.true_rumor_end = game.true_rumor_start + game.true_rumor_size; // C :99
            // C :100 assert(true_end == false_start)
            game.false_rumor_start = game.true_rumor_end;
            game.false_rumor_size = FALSE_RUMOR_BUF.length;
            game.false_rumor_end = game.false_rumor_start + game.false_rumor_size; // C :101
            // C :103-106 + :210-213 init-failed `goto no_rumors`: unreachable
            // (buffers are non-empty constants) — named in the map
        }
        // C :215 tmpwin = create_nhwindow(NHW_TEXT) — lines[] above
        // C :228-231 T values line
        lines.push(`T start=${fmt6d(game.true_rumor_start)} (${fmt6x(game.true_rumor_start)}), end=${fmt6d(game.true_rumor_end)} (${fmt6x(game.true_rumor_end)}), size=${fmt6d(game.true_rumor_size)} (${fmt6x(game.true_rumor_size)})`);
        // C :232-237 F values line
        lines.push(`F start=${fmt6d(game.false_rumor_start)} (${fmt6x(game.false_rumor_start)}), end=${fmt6d(game.false_rumor_end)} (${fmt6x(game.false_rumor_end)}), size=${fmt6d(game.false_rumor_size)} (${fmt6x(game.false_rumor_size)})`);
        // C :246-253 first true rumor: seek to true start, ftell, fgets,
        // strip newline, show `T %06ld` + decrypted line (padding kept —
        // C does not unpadline here)
        const trueLines = splitEmbedLines(TRUE_RUMOR_BUF);
        lines.push(`T ${fmt6d(game.true_rumor_start)} ${xcrypt(trueLines[0])}`);
        // C :254-260 find last true rumor: read while ftell < true end;
        // the crossing line is the section's last — the embed split's tail
        lines.push(`  ${''.padStart(6)} ${xcrypt(trueLines[trueLines.length - 1])}`); // C :259 `  %6s %s`
        // C :262-269 first false rumor
        const falseLines = splitEmbedLines(FALSE_RUMOR_BUF);
        lines.push(`F ${fmt6d(game.false_rumor_start)} ${xcrypt(falseLines[0])}`);
        // C :270-276 last false rumor
        lines.push(`  ${''.padStart(6)} ${xcrypt(falseLines[falseLines.length - 1])}`);
        // C :278 dlb_fclose — no-op under embed
    } else {
        // C no_rumors :279-285 — a previous attempt couldn't open the file
        // or rejected its contents (first-open-failed couldnt_open_file arm
        // `:287-290` unreachable under embed — named in the map)
        await pline('rumors not accessible.');
        // C :284 display_nhwindow(WIN_MESSAGE, TRUE) — flush pending --More--
        await flush_topl_more();
    }

    // C :292-298 the epitaph/engraving/bogusmon check rides along (also in
    // the no_rumors case, creating the window there)
    others_check('Engravings:', ENGRAVEFILE, ENGRAVE_BUF, lines); // C :296
    others_check('Epitaphs:', EPITAPHFILE, EPITAPH_BUF, lines); // C :297
    others_check('Bogus monsters:', BOGUSMONFILE, BOGUSMON_BUF, lines); // C :298

    // C :300-303 show + destroy the text window
    if (lines.length > 0) await show_text_pages(lines);
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
