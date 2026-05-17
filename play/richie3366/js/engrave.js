// engrave.js — Floor engravings and reachability at the hero’s square.
// C ref: engrave.c read_engr_at(), engr_at(), make_engr_at(), can_reach_floor();
//        dungeon.c surface(); hack.c maybe_smudge_engr; rumors.c getrumor;
//        hack.c nomul (via timeout.js).

import { game } from './gstate.js';
import { pline, newsym } from './display.js';
import { nomul } from './timeout.js';
import { rn2, rnd } from './rng.js';
import {
    Is_airlevel,
    Is_waterlevel,
    is_pit,
    P_BASIC,
    P_RIDING,
    IS_POOL,
    IS_LAVA,
    IS_ALTAR,
    IS_GRAVE,
    IS_FOUNTAIN,
    IS_DOOR,
    IS_ROOM,
    IS_WALL,
    DRAWBRIDGE_DOWN,
    ICE,
    BUFSZ,
    MD_PAD_RUMORS,
    A_WIS,
} from './const.js';
import { ENGRAVE_FILE_BODY } from './engrave_lines.js';
import { EPITAPH_FILE_BODY } from './epitaph_lines.js';
import { RUMORS_TRUE_BODY, RUMORS_FALSE_BODY } from './rumor_data.js';
import { exercise } from './attrib.js';
import { raceptr } from './mondata.js';
import { tAt } from './search.js';
import { levlTypAt, stairwayAt } from './decor.js';

/** C: engrave.h — engraving_texts */
export const ENGR_TXT_ACTUAL = 0;
export const ENGR_TXT_REMEMBERED = 1;
export const ENGR_TXT_PRISTINE = 2;

/** C: engrave.h engr_type */
export const ENGR_DUST = 1;
export const ENGR_ENGRAVE = 2;
export const ENGR_BURN = 3;
export const ENGR_MARK = 4;
export const ENGR_BLOOD = 5;
export const ENGR_HEADSTONE = 6;

/** C: monflag.h MZ_HUGE */
const MZ_HUGE = 4;

/** C: sticks(ptr) — stub until mondata.c */
function sticks(/** @type {unknown} */ _ptr) {
    return false;
}

/** C: attacktype(..., AT_HUGS) — stub */
function attackTypeHugs(/** @type {unknown} */ _mon) {
    return false;
}

/** C: ceiling_hider — stub */
function ceilingHider(/** @type {unknown} */ _ptr) {
    return false;
}

function engravingsList() {
    const L = game.level;
    if (!L) return null;
    if (!L.engravings) L.engravings = [];
    return L.engravings;
}

/**
 * C: engrave.c engr_at(x, y)
 * @returns {{ engr_x: number, engr_y: number, engr_type: number, engr_txt: string[], eread: number, erevealed: number, engr_time?: number, nowipeout?: boolean, guardobjects?: number }|null}
 */
export function engrAt(x, y) {
    const list = engravingsList();
    if (!list) return null;
    return list.find((e) => e.engr_x === x && e.engr_y === y) ?? null;
}

/**
 * C: engrave.c **`sengr_at(const char *s, coordxy x, coordxy y, boolean strict)`**
 * — substring match unless **strict** (case-insensitive full-string match).
 * @param {import('./gstate.js').game} g
 * @param {string} s
 * @param {number} x
 * @param {number} y
 * @param {boolean} strict
 * @returns {NonNullable<ReturnType<typeof engrAt>>|null}
 */
export function sengrAtLikeC(g, s, x, y, strict) {
    const ep = engrAt(x | 0, y | 0);
    if (!ep || ep.engr_type === ENGR_HEADSTONE) return null;
    const moves = g?.moves ?? game.moves ?? 1;
    if ((ep.engr_time | 0) > (moves | 0)) return null;
    const actual = ep.engr_txt?.[ENGR_TXT_ACTUAL] ?? '';
    const sub = s || '';
    if (strict) {
        if (actual.toLowerCase() === sub.toLowerCase()) return ep;
        return null;
    }
    if (!sub) return ep;
    return actual.toLowerCase().includes(sub.toLowerCase()) ? ep : null;
}

/** C: engrave.c see_engraving(ep) */
export function seeEngraving(ep) {
    if (!ep) return;
    newsym(ep.engr_x, ep.engr_y);
}

/** C: del_engr — remove engraving at (x,y) if present. */
export function delEngrAt(x, y) {
    const L = game.level;
    if (!L?.engravings?.length) return;
    const n = L.engravings.length;
    L.engravings = L.engravings.filter((e) => !(e.engr_x === x && e.engr_y === y));
    if (L.engravings.length < n) newsym(x, y);
}

/**
 * C: make_engr_at — minimal until full doengrave port.
 * @param {number} engrType — ENGR_* constants
 */
export function makeEngrAt(x, y, text, engrType = ENGR_ENGRAVE) {
    const s = text || '';
    delEngrAt(x, y);
    const ep = {
        engr_x: x,
        engr_y: y,
        engr_type: engrType,
        engr_txt: [s, s, s],
        eread: 0,
        erevealed: 0,
        engr_time: 0,
        nowipeout: false,
        guardobjects: 0,
    };
    if (s === 'Elbereth') {
        if (game.in_mklev) ep.guardobjects = 1;
        else exercise(A_WIS, true);
    }
    engravingsList()?.push(ep);
    seeEngraving(ep);
    return ep;
}

/** C: dungeon.c surface(x, y) — subset for read_engr_at eloc. */
function surfaceAt(x, y) {
    const levtyp = levlTypAt(x, y);
    const u = game.u;
    if (IS_POOL(levtyp) && u?.underwater) return 'bottom';
    if (IS_POOL(levtyp)) return 'water';
    if (levtyp === ICE) return 'ice';
    if (IS_LAVA(levtyp)) return 'lava';
    if (levtyp === DRAWBRIDGE_DOWN) return 'bridge';
    if (IS_ALTAR(levtyp)) return 'altar';
    if (IS_GRAVE(levtyp)) return 'headstone';
    if (IS_FOUNTAIN(levtyp)) return 'fountain';
    if (stairwayAt(x, y)) return 'stairs';
    if (IS_WALL(levtyp)) return 'wall';
    if (IS_DOOR(levtyp)) return 'doorway';
    if (IS_ROOM(levtyp)) return 'floor';
    return 'ground';
}

/**
 * C: engrave.c can_reach_floor(boolean check_pit)
 * @param {boolean} [checkPit]
 */
export function canReachFloor(checkPit = false) {
    const u = game.u;
    if (!u) return false;

    if (u.uswallow) return false;

    const ptr = raceptr(game.youmonst);
    if (u.ustuck && !sticks(ptr) && attackTypeHugs(u.ustuck)) return false;

    if (u.ulevitation && !Is_airlevel(u.uz) && !Is_waterlevel(u.uz)) return false;

    if (u.usteed && (u.weapon_skills?.[P_RIDING]?.skill ?? 0) < P_BASIC) return false;

    if (u.uundetected && ceilingHider(ptr)) return false;

    if (u.uflying || ptr.msize >= MZ_HUGE) return true;

    if (checkPit) {
        const t = tAt(u.ux, u.uy);
        if (t && is_pit(t.ttyp) && (u.uteetering_seen_pit || u.uescaped_shaft)) return false;
    }

    return true;
}

/**
 * C: engrave.c read_engr_at(x, y)
 * @param {number} x
 * @param {number} y
 */
export async function readEngrAt(x, y) {
    const ep = engrAt(x, y);
    const eloc = surfaceAt(x, y);
    let sensed = 0;

    if (!ep || !ep.engr_txt?.[ENGR_TXT_ACTUAL]?.[0]) return;

    const Blind = !!game.u?.ublind;

    switch (ep.engr_type) {
    case ENGR_DUST:
        if (!Blind) {
            sensed = 1;
            const dustWord = levlTypAt(x, y) === ICE ? 'frost' : 'dust';
            await pline(`Something is written here in the ${dustWord}.`);
        }
        break;
    case ENGR_ENGRAVE:
    case ENGR_HEADSTONE:
        if (!Blind || canReachFloor(true)) {
            sensed = 1;
            await pline(`Something is engraved here on the ${eloc}.`);
        }
        break;
    case ENGR_BURN:
        if (!Blind || canReachFloor(true)) {
            sensed = 1;
            const verb = levlTypAt(x, y) === ICE ? 'melted' : 'burned';
            await pline(`Some text has been ${verb} into the ${eloc} here.`);
        }
        break;
    case ENGR_MARK:
        if (!Blind) {
            sensed = 1;
            await pline(`There's some graffiti on the ${eloc} here.`);
        }
        break;
    case ENGR_BLOOD:
        if (!Blind) {
            sensed = 1;
            await pline('You see a message scrawled in blood here.');
        }
        break;
    default:
        sensed = 1;
        await pline('Something is written in a very strange way.');
        break;
    }

    if (!sensed) return;

    let et = ep.engr_txt[ENGR_TXT_ACTUAL];
    const maxelen = 256;
    if (et.length > maxelen) et = et.slice(0, maxelen);

    const elen = et.length;
    const pr = ep.engr_txt[ENGR_TXT_PRISTINE];
    const last = elen > 0 ? et[elen - 1] : '';
    const endpunct = elen < 2 || !(pr && pr[elen - 1] === last && '.!?'.includes(last)) ? '.' : '';

    const verb = Blind ? 'feel the words' : 'read';
    await pline(`You ${verb}: "${et}"${endpunct}`);

    ep.engr_txt[ENGR_TXT_REMEMBERED] = ep.engr_txt[ENGR_TXT_ACTUAL];
    ep.eread = 1;
    ep.erevealed = 1;

    if ((game.context?.run ?? 0) > 0) nomul(0);
}

// --- random_engraving / wipeout_text (C: engrave.c) + get_rnd_line (rumors.c)

/** C: hacklib.c xcrypt — used when reading encrypted DLB text (not plaintext engrave_lines). */
export function xcryptStr(str) {
    let bitmask = 1;
    let out = '';
    for (let p = 0; p < str.length; p++) {
        let c = str.charCodeAt(p);
        if (c & (32 | 64)) c ^= bitmask;
        out += String.fromCharCode(c);
        bitmask <<= 1;
        if (bitmask >= 32) bitmask = 1;
    }
    return out;
}

/** C: rumors.c unpadline — strip trailing makedefs underscore padding. */
function unpadline(s) {
    let e = s.length;
    while (e > 0 && s[e - 1] === '_') e--;
    return s.slice(0, e);
}

/**
 * C: rumors.c get_rnd_line on a contiguous string (no DLB).
 * @param {string} body file bytes after header
 * @param {number} padlength MD_PAD_RUMORS for ENGRAVEFILE
 */
export function getRndLineFromBody(body, padlength) {
    const startpos = 0;
    const endpos = body.length;
    const filechunksize = endpos - startpos;
    if (filechunksize < 1) return '';

    let buf = '';
    for (let trylimit = 10; trylimit > 0; trylimit--) {
        const chunkoffset = rn2(filechunksize);
        const pos = startpos + chunkoffset;
        const nl0 = body.indexOf('\n', pos);
        const lineEnd = nl0 === -1 ? body.length : nl0;
        const fragLen = lineEnd - pos;
        if (!padlength || fragLen <= padlength) {
            const nextStart = lineEnd < body.length ? lineEnd + 1 : body.length;
            if (nextStart >= endpos || nextStart >= body.length) {
                const firstNl = body.indexOf('\n', startpos);
                buf = firstNl === -1 ? body.slice(startpos) : body.slice(startpos, firstNl);
            } else {
                const nl1 = body.indexOf('\n', nextStart);
                buf = nl1 === -1 ? body.slice(nextStart) : body.slice(nextStart, nl1);
            }
            break;
        }
    }
    if (!buf) {
        const firstNl = body.indexOf('\n', startpos);
        buf = firstNl === -1 ? body.slice(startpos) : body.slice(startpos, firstNl);
    }
    /* C: Strcpy(buf, xcrypt(buf, …)) — DLB lines are encrypted; our bundle is plaintext. */
    return unpadline(buf);
}

function getRndEngraveText() {
    return getRndLineFromBody(ENGRAVE_FILE_BODY, MD_PAD_RUMORS);
}

/** C: get_rnd_text(EPITAPHFILE, …) via virtual plaintext body. */
export function getRndEpitaphText() {
    return getRndLineFromBody(EPITAPH_FILE_BODY, MD_PAD_RUMORS);
}

/** C: engrave.c rubouts[] */
const RUBOUTS = /** @type {readonly { wipefrom: string, wipeto: string }[]} */ (Object.freeze([
    { wipefrom: 'A', wipeto: '^' },
    { wipefrom: 'B', wipeto: 'Pb[' },
    { wipefrom: 'C', wipeto: '(' },
    { wipefrom: 'D', wipeto: '|)[' },
    { wipefrom: 'E', wipeto: '|FL[_' },
    { wipefrom: 'F', wipeto: '|-' },
    { wipefrom: 'G', wipeto: 'C(' },
    { wipefrom: 'H', wipeto: '|-' },
    { wipefrom: 'I', wipeto: '|' },
    { wipefrom: 'K', wipeto: '|<' },
    { wipefrom: 'L', wipeto: '|_' },
    { wipefrom: 'M', wipeto: '|' },
    { wipefrom: 'N', wipeto: '|\\' },
    { wipefrom: 'O', wipeto: 'C(' },
    { wipefrom: 'P', wipeto: 'F' },
    { wipefrom: 'Q', wipeto: 'C(' },
    { wipefrom: 'R', wipeto: 'PF' },
    { wipefrom: 'T', wipeto: '|' },
    { wipefrom: 'U', wipeto: 'J' },
    { wipefrom: 'V', wipeto: '/\\' },
    { wipefrom: 'W', wipeto: 'V/\\' },
    { wipefrom: 'Z', wipeto: '/' },
    { wipefrom: 'b', wipeto: '|' },
    { wipefrom: 'd', wipeto: 'c|' },
    { wipefrom: 'e', wipeto: 'c' },
    { wipefrom: 'g', wipeto: 'c' },
    { wipefrom: 'h', wipeto: 'n' },
    { wipefrom: 'j', wipeto: 'i' },
    { wipefrom: 'k', wipeto: '|' },
    { wipefrom: 'l', wipeto: '|' },
    { wipefrom: 'm', wipeto: 'nr' },
    { wipefrom: 'n', wipeto: 'r' },
    { wipefrom: 'o', wipeto: 'c' },
    { wipefrom: 'q', wipeto: 'c' },
    { wipefrom: 'w', wipeto: 'v' },
    { wipefrom: 'y', wipeto: 'v' },
    { wipefrom: ':', wipeto: '.' },
    { wipefrom: ';', wipeto: ',:' },
    { wipefrom: ',', wipeto: '.' },
    { wipefrom: '=', wipeto: '-' },
    { wipefrom: '+', wipeto: '-|' },
    { wipefrom: '*', wipeto: '+' },
    { wipefrom: '@', wipeto: '0' },
    { wipefrom: '0', wipeto: 'C(' },
    { wipefrom: '1', wipeto: '|' },
    { wipefrom: '6', wipeto: 'o' },
    { wipefrom: '7', wipeto: '/' },
    { wipefrom: '8', wipeto: '3o' },
]));

/**
 * C: engrave.c wipeout_text
 * @param {string} engr
 * @param {number} cnt
 * @param {number} [seed] 0 = random (rn2); else deterministic like C
 */
export function wipeoutText(engr, cnt, seed = 0) {
    const chars = engr.split('');
    const pickLen = chars.length;
    if (!pickLen || cnt <= 0) return engr;

    let sSeed = seed >>> 0;
    let n = cnt;
    while (n-- > 0) {
        let nxt;
        let useRubout;
        if (!seed) {
            nxt = rn2(pickLen);
            useRubout = rn2(4);
        } else {
            nxt = sSeed % pickLen;
            sSeed = (sSeed * 31) % (BUFSZ - 1);
            useRubout = sSeed & 3;
        }

        const ch = chars[nxt];
        if (ch === ' ') continue;
        if ('?.,\'`-|_'.includes(ch)) {
            chars[nxt] = ' ';
            continue;
        }

        let i;
        if (!useRubout) {
            i = RUBOUTS.length;
        } else {
            for (i = 0; i < RUBOUTS.length; i++) {
                if (ch === RUBOUTS[i].wipefrom) {
                    const wipeto = RUBOUTS[i].wipeto;
                    const ln = wipeto.length;
                    let j;
                    if (!seed) {
                        j = rn2(ln);
                    } else {
                        sSeed = (sSeed * 31) % (BUFSZ - 1);
                        j = sSeed % ln;
                    }
                    chars[nxt] = wipeto[j];
                    break;
                }
            }
        }
        if (i === RUBOUTS.length) chars[nxt] = '?';
    }

    let out = chars.join('');
    while (out.length > 0 && out[out.length - 1] === ' ') out = out.slice(0, -1);
    return out;
}

const COOKIE_MARKER = '[cookie] ';

/**
 * C: rumors.c getrumor(truth, rumor_buf, exclude_cookie) — returns one line (plaintext DLB).
 * @param {number} truth 1 true, -1 false, 0 either
 * @param {boolean} excludeCookie
 */
export function getRumor(truth, excludeCookie) {
    if (!RUMORS_TRUE_BODY.length && !RUMORS_FALSE_BODY.length) return '';

    let rumor_buf = '';
    let adjtruth = 0;
    let count = 0;

    do {
        rumor_buf = '';
        adjtruth = truth + rn2(2);
        /** @type {string} */
        let body;
        switch (adjtruth) {
        case 2:
        case 1:
            body = RUMORS_TRUE_BODY;
            break;
        case 0:
        case -1:
            body = RUMORS_FALSE_BODY;
            break;
        default:
            return 'Oops...';
        }
        if (!body.length) break;
        rumor_buf = getRndLineFromBody(body, MD_PAD_RUMORS);
    } while (
        count++ < 50
        && excludeCookie
        && rumor_buf.startsWith(COOKIE_MARKER)
    );

    if (!excludeCookie && rumor_buf.startsWith(COOKIE_MARKER))
        rumor_buf = rumor_buf.slice(COOKIE_MARKER.length);

    if (!game.in_mklev) exercise(A_WIS, adjtruth > 0);
    return rumor_buf;
}

/**
 * C: engrave.c random_engraving(outbuf, pristine_copy)
 * @returns {{ text: string, pristine: string }}
 */
export function randomEngraving() {
    let pristine = '';
    if (!rn2(4)) {
        pristine = getRndEngraveText();
    } else {
        pristine = getRumor(0, true);
        if (!pristine) pristine = getRndEngraveText();
    }
    const wcnt = Math.floor(pristine.length / 4) | 0;
    const text = wipeoutText(pristine, wcnt, 0);
    return { text, pristine };
}

/**
 * C: engrave.c wipe_engr_at(x, y, cnt, magical)
 * @param {number} cnt
 * @param {boolean} [magical]
 */
export function wipeEngrAt(x, y, cnt, magical = false) {
    const ep = engrAt(x, y);
    if (!ep || ep.engr_type === ENGR_HEADSTONE || ep.nowipeout) return;

    const typ = ep.engr_type;
    const iceHere = levlTypAt(x, y) === ICE;
    if (typ === ENGR_BURN && !iceHere && !(magical && !rn2(2))) return;

    let eff = cnt;
    if (typ !== ENGR_DUST && typ !== ENGR_BLOOD) {
        eff = rn2(1 + Math.floor(50 / (eff + 1))) ? 0 : 1;
    }

    let actual = ep.engr_txt[ENGR_TXT_ACTUAL] || '';
    actual = wipeoutText(actual, eff, 0);
    while (actual.length > 0 && actual[0] === ' ') actual = actual.slice(1);

    if (!actual) {
        delEngrAt(x, y);
        return;
    }
    ep.engr_txt[ENGR_TXT_ACTUAL] = actual;
    newsym(x, y);
}

/** C: engrave.c u_wipe_engr(cnt) */
export function uWipeEngr(cnt) {
    const u = game.u;
    if (!u || u.ux === undefined || u.uy === undefined) return;
    if (canReachFloor(true)) wipeEngrAt(u.ux, u.uy, cnt, false);
}

/**
 * C: hack.c maybe_smudge_engr(x1, y1, x2, y2) — after DOMOVE_WALK / RUSH.
 * Smudges engravings on the old and new hero cells when feet can reach floor.
 */
export function maybeSmudgeEngr(x1, y1, x2, y2) {
    if (!canReachFloor(true)) return;
    let ep = engrAt(x1, y1);
    if (ep && ep.engr_type !== ENGR_HEADSTONE) wipeEngrAt(x1, y1, rnd(5), false);
    if (x2 !== x1 || y2 !== y1) {
        ep = engrAt(x2, y2);
        if (ep && ep.engr_type !== ENGR_HEADSTONE) wipeEngrAt(x2, y2, rnd(5), false);
    }
}
