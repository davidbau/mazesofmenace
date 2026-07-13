// engrave.js — Engrave command / floor inscriptions (partial).
// C ref: engrave.c doengrave, engrave occupation, make_engr_at, engr_at,
//        read_engr_at, wipeout_text, wipe_engr_at.
//
// Branch envelope: u_can_engrave floor gate + getobj write-with (hands `-`
// SUGGEST) + DUST fingertip You/getlin + literate bump + DUST/blood/
// Blind/Confusion/Stunned/Hallu mix-up + set_occupation one-tick finish
// via make_engr_at (Elbereth → exercise(A_WIS,TRUE)); look_here/`:` via
// read_engr_at (DUST/ENGRAVE/BURN/MARK/blood non-Blind); mklev niche age
// via wipe_engr_at → wipeout_text (seed==0 RNG path).
// Named omissions: wand/weapon/marker/towel/gem/ring stylus sfx;
// grave/altar/jello/swallow/lava/pool; add-to/overwrite yn; multi-turn
// dulling occupation; del_engr/rloc_engr; u_wipe_engr body; livelog;
// demon/vampire blood default beyond type; Blind feel path for
// engrave/burn; full surface()/is_ice nouns; wipeout_text seeded
// (non-zero) path; maybe_smudge_engr.
// Engraving map glyphs (S_engroom/S_engrcorr) live in display.js newsym.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline, newsym } from './display.js';
import { getlin } from './getline.js';
import { HANDS_OBJ } from './readobjnam.js';
import { A_WIS, exercise } from './attrib.js';
import {
    WEAPON_CLASS, WAND_CLASS, GEM_CLASS, RING_CLASS, TOOL_CLASS,
    objectNames,
} from './objects.js';
import {
    DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE, ICE,
    ACCESSIBLE, IS_FOUNTAIN, IS_AIR, IS_POOL, IS_LAVA,
    Never_mind,
} from './const.js';
import { nomul } from './hack.js';

const TOWEL = objectNames.indexOf('TOWEL');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');

/** C: decl.h Something */
const Something = 'Something';

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}
function Confusion() {
    return !!(game.u?.Confusion);
}
function Stunned() {
    return !!(game.u?.Stunned);
}
function Hallucination() {
    return !!(game.u?.Hallucination);
}

/** C ref: hack.c is_ice — ice terrain check (partial). */
function is_ice(x, y) {
    const typ = game.level?.locations?.[x]?.[y]?.typ;
    return typ === ICE;
}

/**
 * C ref: description.c surface — floor noun under engraving.
 * Branch envelope: room/corridor/door → floor; ice deferred via is_ice.
 */
function surface(_x, _y) {
    return 'floor';
}

/** C ref: engrave.c engr_at */
export function engr_at(x, y) {
    for (let ep = game.head_engr; ep; ep = ep.nxt_engr) {
        if (ep.engr_x === x && ep.engr_y === y) return ep;
    }
    return null;
}

/** C ref: engrave.c del_engr — unlink one engraving. */
export function del_engr(ep) {
    if (!ep) return;
    let prev = null;
    for (let cur = game.head_engr; cur; prev = cur, cur = cur.nxt_engr) {
        if (cur === ep) {
            if (prev) prev.nxt_engr = cur.nxt_engr;
            else game.head_engr = cur.nxt_engr;
            return;
        }
    }
}

/** C hack.h BUFSZ — seeded wipeout_text modulus only. */
const BUFSZ = 256;

/** C ref: engrave.c rubouts[] — partial character substitutes. */
const RUBOUTS = {
    A: '^', B: 'Pb[', C: '(', D: '|)[', E: '|FL[_', F: '|-', G: 'C(', H: '|-',
    I: '|', K: '|<', L: '|_', M: '|', N: '|\\', O: 'C(', P: 'F', Q: 'C(', R: 'PF',
    T: '|', U: 'J', V: '/\\', W: 'V/\\', Z: '/',
    b: '|', d: 'c|', e: 'c', g: 'c', h: 'n', j: 'i', k: '|', l: '|', m: 'nr',
    n: 'r', o: 'c', q: 'c', w: 'v', y: 'v',
    ':': '.', ';': ',:', ',': '.', '=': '-', '+': '-|', '*': '+', '@': '0',
    '0': 'C(', '1': '|', '6': 'o', '7': '/', '8': '3o',
};

/**
 * C ref: engrave.c wipeout_text — degrade characters in-place (returns string).
 * Branch envelope: seed==0 random path (rn2(lth), rn2(4), optional rn2(ln)).
 * Named omission: non-zero seed deterministic path.
 */
export function wipeout_text(engr, cnt, seed = 0) {
    const s = String(engr || '').split('');
    let lth = s.length;
    if (!lth || cnt <= 0) return s.join('');
    let n = cnt;
    let seedu = seed >>> 0;
    while (n--) {
        let nxt;
        let use_rubout;
        if (!seedu) {
            nxt = rn2(lth);
            use_rubout = rn2(4);
        } else {
            nxt = seedu % lth;
            seedu = (seedu * 31) % (BUFSZ - 1);
            use_rubout = seedu & 3;
        }
        if (s[nxt] === ' ') continue;
        if ("?.,'`-|_".includes(s[nxt])) {
            s[nxt] = ' ';
            continue;
        }
        if (!use_rubout) {
            s[nxt] = '?';
            continue;
        }
        const wipeto = RUBOUTS[s[nxt]];
        if (wipeto) {
            let j;
            if (!seedu) {
                j = rn2(wipeto.length);
            } else {
                seedu = (seedu * 31) % (BUFSZ - 1);
                j = seedu % wipeto.length;
            }
            s[nxt] = wipeto[j];
        } else {
            s[nxt] = '?';
        }
    }
    while (lth && s[lth - 1] === ' ') {
        s[--lth] = '';
    }
    return s.slice(0, lth).join('');
}

/**
 * C ref: engrave.c wipe_engr_at — age/erode an existing engraving.
 * Branch envelope: non-HEADSTONE, !nowipeout; DUST/blood keep full cnt;
 * non-DUST/blood may rn2-gate cnt to 0/1; BURN needs ice or magical rn2.
 */
export function wipe_engr_at(x, y, cnt, magical = false) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE || ep.nowipeout) return;
    if (ep.engr_type === BURN && !is_ice(x, y)
        && !(magical && !rn2(2))) {
        return;
    }
    let n = cnt;
    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
        n = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    let txt = String(ep.engr_txt?.actual_text ?? '');
    txt = wipeout_text(txt, n, 0);
    while (txt.startsWith(' ')) txt = txt.slice(1);
    if (!txt) {
        del_engr(ep);
        return;
    }
    ep.engr_txt.actual_text = txt;
}

/**
 * C ref: engrave.c read_engr_at — sense engraving type + You read/feel text.
 * Branch envelope: DUST/ENGRAVE/HEADSTONE/BURN/MARK/ENGR_BLOOD sighted
 * (non-Blind); Blind feel for engrave/burn when can_reach deferred as
 * non-Blind path only for now. Truncation + pristine endpunct rules.
 */
export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (!ep) return;
    const text = ep.engr_txt?.actual_text || '';
    if (!text) return;

    const blind = Blind();
    const eloc = surface(x, y);
    let sensed = false;

    switch (ep.engr_type) {
    case DUST:
        if (!blind) {
            sensed = true;
            await pline(
                `${Something} is written here in the ${is_ice(x, y) ? 'frost' : 'dust'}.`,
            );
        }
        break;
    case ENGRAVE:
    case HEADSTONE:
        if (!blind) {
            sensed = true;
            await pline(`${Something} is engraved here on the ${eloc}.`);
        }
        break;
    case BURN:
        if (!blind) {
            sensed = true;
            await pline(
                `Some text has been ${is_ice(x, y) ? 'melted' : 'burned'} into the ${eloc} here.`,
            );
        }
        break;
    case MARK:
        if (!blind) {
            sensed = true;
            await pline(`There's some graffiti on the ${eloc} here.`);
        }
        break;
    case ENGR_BLOOD:
        if (!blind) {
            sensed = true;
            await pline('You see a message scrawled in blood here.');
        }
        break;
    default:
        sensed = true;
        await pline(`${Something} is written in a very strange way.`);
        break;
    }

    if (!sensed) return;

    // C: maxelen = sizeof buf - sizeof "You feel the words: \"\"."
    const maxelen = 80 - 'You feel the words: "".'.length;
    let et = text;
    let elen = et.length;
    if (elen > maxelen) {
        et = et.slice(0, maxelen);
        elen = maxelen;
    }
    const pristine = ep.engr_txt?.pristine_text || text;
    let endpunct = '';
    const last = et[elen - 1];
    if (elen < 2
        || !(pristine[elen - 1] === last && '.!?'.includes(last))) {
        endpunct = '.';
    }
    await pline(
        `You ${blind ? 'feel the words' : 'read'}: "${et}"${endpunct}`,
    );
    if (ep.engr_txt) ep.engr_txt.remembered_text = text;
    ep.eread = 1;
    ep.erevealed = 1;
    if ((game.context?.run | 0) > 0) nomul(0);
}

/**
 * C ref: engrave.c make_engr_at — place/replace engraving text.
 * Pristine/guardobjects mklev path partial; Elbereth player exercise wired.
 */
export function make_engr_at(x, y, text, pristine, e_time, e_type) {
    del_engr(engr_at(x, y));
    const s = String(text || '');
    const pristine_s = pristine != null ? String(pristine) : s;
    const ep = {
        nxt_engr: game.head_engr || null,
        engr_x: x,
        engr_y: y,
        engr_txt: { actual_text: s, remembered_text: s, pristine_text: pristine_s },
        engr_time: e_time || 0,
        engr_type: (e_type > 0) ? e_type : rnd(HEADSTONE - 1),
        eread: 0,
        erevealed: 0,
        guardobjects: 0,
    };
    game.head_engr = ep;
    if (s === 'Elbereth') {
        // C: gi.in_mklev → guardobjects; else exercise wisdom
        if (game.in_mklev) ep.guardobjects = 1;
        else exercise(A_WIS, true);
    }
    return ep;
}

/** Invent-order letters for stylus_ok SUGGEST (C invent walk). */
function stylus_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (o.oclass === WEAPON_CLASS || o.oclass === WAND_CLASS
            || o.oclass === GEM_CLASS || o.oclass === RING_CLASS) {
            lets.push(o.invlet);
            continue;
        }
        if (o.oclass === TOOL_CLASS
            && (o.otyp === TOWEL || o.otyp === MAGIC_MARKER)) {
            lets.push(o.invlet);
        }
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("write with", stylus_ok, GETOBJ_PROMPT)
 * Hands `-` is SUGGEST (space after `-` in prompt). Loop on missing letter.
 */
async function getobj_stylus() {
    for (;;) {
        await flush_topl_more();
        const lets = stylus_lets();
        const query = lets
            ? `What do you want to write with? [- ${lets} or ?*]`
            : 'What do you want to write with? [- or ?*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        if (ch === '-') {
            game._pending_message = '';
            return HANDS_OBJ;
        }
        if (ch === '?' || ch === '*') {
            await pline(Never_mind);
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        // Non-hands stylus body deferred — cancel rather than fake DUST
        await pline(Never_mind);
        return null;
    }
}

/** C ref: engrave.c u_can_engrave — floor/reach subset. */
function u_can_engrave() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const typ = loc?.typ ?? 0;
    if (u.uswallow) return false;
    if (IS_LAVA(typ) || IS_POOL(typ) || IS_FOUNTAIN(typ) || IS_AIR(typ)) {
        return false;
    }
    if (!ACCESSIBLE(typ)) return false;
    // cantwield / check_capacity deferred — humanoid start always ok
    return true;
}

/** C ref: cmd.c set_occupation */
export function set_occupation(fn, txt) {
    game.occupation = fn;
    game.occtxt = txt;
    game.occtime = 0;
}

/**
 * C ref: engrave.c engrave() occupation — DUST/finger one-action finish.
 * Returns 1 to continue, 0 when done (C).
 */
function engrave_occupation() {
    const eng = game.context?.engraving;
    if (!eng) return 0;
    const u = game.u || {};
    if (eng.pos?.x !== u.ux || eng.pos?.y !== u.uy) {
        // pline deferred for rare teleport mid-engrave
        return 0;
    }

    const firsttime = (eng.actionct || 0) === 0;
    const neweng = firsttime;
    eng.actionct = (eng.actionct || 0) + 1;

    let rate = 10;
    // carving/marker rate deferred — finger DUST keeps 10
    const nextc = eng.nextc || '';
    let i = rate;
    let end = 0;
    for (; end < nextc.length && i > 0; end++) {
        if (nextc[end] !== ' ') i--;
    }
    const chunk = nextc.slice(0, end);
    const rest = nextc.slice(end);

    const oep = engr_at(u.ux, u.uy);
    const prev = oep?.engr_txt?.actual_text || '';
    const buf = prev + chunk;
    const ep = make_engr_at(
        u.ux, u.uy, buf, null,
        (game.moves || 0) - (game.multi || 0),
        eng.type || DUST,
    );
    if (ep) {
        ep.eread = 1;
        ep.erevealed = 1;
    }

    if (rest) {
        eng.nextc = rest;
        if (neweng) newsym(eng.pos.x, eng.pos.y);
        return 1;
    }

    // finished — multi-action "You finish …" deferred (firsttime path silent)
    if (game.context) {
        game.context.engraving = {
            text: '',
            nextc: '',
            stylus: null,
            type: 0,
            pos: { x: 0, y: 0 },
            actionct: 0,
        };
    }
    if (neweng) newsym(u.ux, u.uy);
    return 0;
}

/**
 * C ref: engrave.c doengrave — #engrave / 'E'.
 * @returns {number} 0 = ECMD_OK (setup; occupation takes the turn)
 */
export async function doengrave() {
    if (!u_can_engrave()) {
        await pline('You can\'t write here.');
        return 0;
    }

    game.multi = 0;
    game.nomovemsg = null;

    const otmp = await getobj_stylus();
    if (!otmp) return 0; // cancel

    // Non-hands deferred above; only HANDS_OBJ reaches here
    let type = DUST;
    // demon/vampire → ENGR_BLOOD deferred (Wizard human stays DUST)
    const frosted = false; // is_ice deferred
    const eloc = frosted ? 'frost' : 'dust';
    const everb = 'write in';

    await pline(`You ${everb} the ${eloc} with your fingertip.`);

    const qbuf = `What do you want to ${everb} the ${eloc} here?`;
    let ebuf = await getlin(qbuf);
    if (ebuf === '\x1b') {
        await pline(Never_mind);
        return 0;
    }
    ebuf = mungspaces(ebuf);

    let len = ebuf.length;
    for (const ch of ebuf) {
        if (ch === ' ') len -= 1;
    }
    if (len === 0 || ebuf.includes('\x1b')) {
        await pline(Never_mind);
        return 0;
    }

    // literate conduct (not single x/X signature)
    if (len !== 1 || (!ebuf.includes('x') && !ebuf.includes('X'))) {
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.literate = (game.u.uconduct.literate | 0) + 1;
    }

    // Mix up engraving if surface or state of mind is unsound
    const chars = ebuf.split('');
    const u = game.u || {};
    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') continue;
        if (((type === DUST || type === ENGR_BLOOD) && !rn2(25))
            || (Blind() && !rn2(11))
            || (Confusion() && !rn2(7))
            || (Stunned() && !rn2(4))
            || (Hallucination() && !rn2(2))) {
            chars[i] = String.fromCharCode(32 + rnd(96 - 2));
        }
    }
    ebuf = chars.join('');

    if (!game.context) game.context = {};
    game.context.engraving = {
        text: ebuf,
        nextc: ebuf,
        stylus: otmp,
        type,
        pos: { x: u.ux, y: u.uy },
        actionct: 0,
    };
    set_occupation(engrave_occupation, 'engraving');

    // Setup does not take time — occupation runs next moveloop tick
    return 0;
}
