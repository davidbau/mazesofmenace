// js/do_name.js — port of nethack-c/src/do_name.c
//

import { monPmname, permonstTemplate } from './makemon.js';
import { rn2, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
import { get_rnd_line_from_section } from './mklev.js';
import { BOGUSMON_LINES, BOGUSMON_OFFSETS, BOGUSMON_SIZE, MD_PAD_BOGONS } from './bogusmon_data.js';
import { ENV } from './hostenv.js';
import { game } from './gstate.js';

/* C monflag.h enum mgender { MALE, FEMALE, NEUTRAL, NUM_MGENDERS } */
const MALE = 0, FEMALE = 1;

function ONAME(o) {
    return o.oextra.oname;
}
function has_oname(o) {
    return Boolean(o.oextra && ONAME(o));
}

/* safe_oname — C ref: nethack-c/src/do_name.c:94-100
 *   const char *safe_oname(struct obj *obj)
 *   { if (has_oname(obj)) return ONAME(obj); return ""; }
 * Always returns a valid string: the object's given name if it has one, or
 * an empty string otherwise. No RNG, no state change. */
export function safe_oname(obj) {
    if (has_oname(obj))
        return ONAME(obj);
    return "";
}

function Mgender(mtmp) {
    return mtmp.female ? FEMALE : MALE;
}

export function mon_pmname(mon) {
    const pmidx = mon.data?.pmidx;
    return monPmname(typeof pmidx === 'number' ? (pmidx | 0) : (mon.data_mndx | 0), Mgender(mon));
}


/* C do_name.c:1364 `const char bogon_codes[] = "-_+|=";` — see dat/bogusmon.txt. */
const bogon_codes = '-_+|=';

/* C do_name.c:1368-1383 bogusmon(buf, code) — a random line of dat/bogusmon,
 * with its leading bogon code (if any) stripped off into *code. */
export function bogusmon(code) {
    /* C: get_rnd_text(BOGUSMONFILE, buf, rn2_on_display_rng, MD_PAD_BOGONS).
     * "might fail (return empty buf[]) if the file isn't available" — the table
     * is generated from the compiled chunk and is never empty here. */
    let mnam = get_rnd_line_from_section(BOGUSMON_LINES, BOGUSMON_OFFSETS,
                                         BOGUSMON_SIZE, rn2_on_display_rng,
                                         MD_PAD_BOGONS);
    if (!mnam)
        return { name: 'bogon', code: '\0' };
    if (bogon_codes.indexOf(mnam[0]) >= 0)  /* strip prefix if present */
        return { name: mnam.slice(1), code: mnam[0] };
    return { name: mnam, code: '\0' };
}

/* C do_name.c:1387-1409 rndmonnam(code) — "return a random monster name, for
 * hallucination".
 *
 *     do {
 *         name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
 *     } while (name < SPECIAL_PM
 *              && (type_is_pname(&mons[name]) || (mons[name].geno & G_NOGEN)));
 *     if (name >= SPECIAL_PM) mnam = bogusmon(buf, code);
 *     else mnam = strcpy(buf, pmname(&mons[name], rn2_on_display_rng(2)));
 *
 * The rejection loop redraws, so the number of display draws depends on the
 * values themselves — a reason to keep it verbatim rather than "optimise" it
 * into a filtered table.
 *
 * Returns the name; the out-parameter `code` is returned alongside it because
 * JS has no char*, and priestname()/x_monnam() feed it to bogon_is_pname().
 */
const BOGUSMONSIZE = 100;                /* C do_name.c:1392 (arbitrary) */
const LOW_PM_DN = 0;                     /* C monsym.h:15 NON_PM + 1 */
const SPECIAL_PM_DN = 330;               /* C monsym.h:23 PM_LONG_WORM_TAIL */
const G_NOGEN_DN = 0x0200;               /* C monflag.h:197 */
const M2_PNAME_DN = 0x00080000;          /* C monflag.h M2_PNAME */
export function rndmonnam_ex() {
    let name;
    do {
        name = rn2_on_display_rng(SPECIAL_PM_DN + BOGUSMONSIZE - LOW_PM_DN) + LOW_PM_DN;
    } while (name < SPECIAL_PM_DN && _rndmonnam_rejected(name));

    if (name >= SPECIAL_PM_DN) {
        const out = bogusmon();
        if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
            pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=${out.code.charCodeAt(0) || 0} pick=${name}]`);
        return out;
    }
    /* C mondata.h pmname(pm, mgender); rn2_on_display_rng(2) is MALE/FEMALE. */
    const out = { name: monPmname(name, rn2_on_display_rng(2)), code: '\0' };
    if (typeof process !== 'undefined' && ENV?.FF_NAME_TRACE === '1')
        pushRngLogEntry(`^rndmonnam[name=${encodeURIComponent(out.name)} code=0 pick=${name}]`);
    return out;
}
/* C do_name.c:1400-1402 rejection test — `type_is_pname(&mons[name])
 * || (mons[name].geno & G_NOGEN)`.  C mondata.h:135
 * type_is_pname(ptr) = ((ptr->mflags2 & M2_PNAME) != 0L). */
function _rndmonnam_rejected(mndx) {
    const ptr = permonstTemplate(mndx);
    if (!ptr) return true;
    return ((ptr.mflags2 >>> 0) & M2_PNAME_DN) !== 0
        || ((ptr.geno | 0) & G_NOGEN_DN) !== 0;
}
/* The C-signature form: callers that do not want the bogon code just take the
 * name.  (C's rndmonnam(NULL) is the majority of its 15 call sites.) */
export function rndmonnam() {
    return rndmonnam_ex().name;
}

/* C do_name.c:1414-1420 bogon_is_pname(code) — "check bogusmon prefix to
 * decide whether it's a personal name".  Note it tests "-+=", a HARD-CODED
 * SUBSET of bogon_codes ("-_+|="), exactly as C's own comment at :1362 warns;
 * ported as the subset, not as bogon_codes. */
export function bogon_is_pname(code) {
    if (!code || code === '\0')
        return false;
    return '-+='.indexOf(code) >= 0;
}

const sir_Terry_novels = [
    "The Colour of Magic", "The Light Fantastic", "Equal Rites", "Mort",
    "Sourcery", "Wyrd Sisters", "Pyramids", "Guards! Guards!", "Eric",
    "Moving Pictures", "Reaper Man", "Witches Abroad", "Small Gods",
    "Lords and Ladies", "Men at Arms", "Soul Music", "Interesting Times",
    "Maskerade", "Feet of Clay", "Hogfather", "Jingo", "The Last Continent",
    "Carpe Jugulum", "The Fifth Elephant", "The Truth", "Thief of Time",
    "The Last Hero", "The Amazing Maurice and His Educated Rodents",
    "Night Watch", "The Wee Free Men", "Monstrous Regiment",
    "A Hat Full of Sky", "Going Postal", "Thud!", "Wintersmith",
    "Making Money", "Unseen Academicals", "I Shall Wear Midnight", "Snuff",
    "Raising Steam", "The Shepherd's Crown"
];
/* C do_name.c:1604-1608 — the variant-spelling index macros.  Only
 * lookup_novel() reads them and that function has no caller in js/ yet; they
 * are kept here so a future lookup_novel() port cannot silently renumber. */
export const NVL_COLOUR_OF_MAGIC = 0;
export const NVL_SOURCERY = 4;
export const NVL_MASKERADE = 17;
export const NVL_AMAZING_MAURICE = 27;
export const NVL_THUD = 33;

export function noveltitle(novidx) {
    const k = sir_Terry_novels.length;
    let j = rn2(k);

    if (novidx) {
        if ((novidx.value | 0) === -1)
            novidx.value = j;
        else if ((novidx.value | 0) >= 0 && (novidx.value | 0) < k)
            j = novidx.value | 0;
    }
    return sir_Terry_novels[j];
}

/* C do_name.c:1625-1661 lookup_novel().  Novel names are compared
 * case-insensitively, with or without the leading article, and a handful of
 * established American/variant spellings map to the canonical title. */
export function lookup_novel(lookname, idx) {
    const fold = (s) => String(s ?? '').toLowerCase();
    const withoutArticle = (s) => {
        const v = fold(s);
        return v.startsWith('the ') ? v.slice(4) : v;
    };
    let name = String(lookname ?? '');
    const bare = withoutArticle(name);
    if (bare === 'color of magic')
        name = sir_Terry_novels[NVL_COLOUR_OF_MAGIC];
    else if (bare === 'sorcery')
        name = sir_Terry_novels[NVL_SOURCERY];
    else if (bare === 'masquerade')
        name = sir_Terry_novels[NVL_MASKERADE];
    else if (bare === 'amazing maurice')
        name = sir_Terry_novels[NVL_AMAZING_MAURICE];
    else if (bare === 'thud')
        name = sir_Terry_novels[NVL_THUD];

    for (let k = 0; k < sir_Terry_novels.length; k++) {
        const title = sir_Terry_novels[k];
        if (fold(name) === fold(title) || withoutArticle(name) === withoutArticle(title)) {
            if (idx)
                idx.value = k;
            return title;
        }
    }
    const prior = idx ? (idx.value | 0) : -1;
    if (idx && prior >= 0 && prior < sir_Terry_novels.length)
        return sir_Terry_novels[prior];
    return null;
}

/* C files.c:3424-3470 choose_passage(): pick a not-yet-used passage of the
 * book `oid`, tracking the unused ones in svc.context.novel.  The rn2(range)
 * draws of the >MAXPASSAGES arm and the final rn2(count) are RNG-visible. */
function choose_passage(passagecnt, oid) {
    const MAXPASSAGES = 20;
    const ctx = game.context || (game.context = {});
    const nv = ctx.novel || (ctx.novel = { id: 0, count: 0, pasg: new Array(MAXPASSAGES).fill(0) });
    if (passagecnt < 1)
        return 0;
    if ((oid >>> 0) !== (nv.id >>> 0) || (nv.count | 0) === 0) {
        let range = passagecnt, limit = MAXPASSAGES;
        nv.id = oid;
        if (range <= limit) {
            nv.count = passagecnt;
            for (let idx = 0; idx < MAXPASSAGES; idx++)
                nv.pasg[idx] = idx < passagecnt ? idx + 1 : 0;
        } else {
            nv.count = MAXPASSAGES;
            let idx = 0;
            for (let i = 0; i < passagecnt; ++i, --range)
                if (range > 0 && rn2(range) < limit) {
                    nv.pasg[idx++] = i + 1;
                    --limit;
                }
        }
    }
    const idx = rn2(nv.count | 0);
    const res = nv.pasg[idx] | 0;
    nv.pasg[idx] = nv.pasg[--nv.count] | 0;
    return res;
}

/* C files.c:3474-3637 read_tribute(): find `tribtitle` in dat/tribute's
 * `tribsection`, choose a passage and show it in an NHW_MENU window (or, when
 * `nowin_buf` is a {value} box, fetch its first line into the box instead).
 * Returns TRUE when something was read. */
export async function read_tribute(tribsection, tribtitle, tribpassage, nowin_buf, oid) {
    const { pline, putmsghistory } = await import('./display.js');
    const { dat_content } = await import('./dat_source.js');
    const badtranslation = 'an incomprehensible foreign translation';
    const ci = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const munge = (s) => s.replace(/\s+/g, ' ').replace(/^ /, '').replace(/ $/, '');
    if (nowin_buf)
        nowin_buf.value = '';
    if (tribsection == null || tribtitle == null) {
        if (!nowin_buf)
            await pline(`It's ${badtranslation} of "${tribtitle}"!`);
        return false;
    }
    const raw = dat_content('tribute');
    if (raw === null) {
        if (!nowin_buf)
            await pline('You feel too overwhelmed to continue!');
        return false;
    }
    const SECTIONSCOPE = 1, TITLESCOPE = 2, PASSAGESCOPE = 3;
    let scope = 0, passagecnt = 0, targetpassage = 0;
    let matchedsection = false, matchedtitle = false, foundpassage = false;
    let lastline = '';
    const win = [];
    let grasped = false;
    for (const rawline of raw.replace(/\n$/, '').split('\n')) {
        const line = rawline.replace(/\r$/, '');
        const c0 = line[0];
        if (c0 === '%') {
            const rest = line.slice(1).toLowerCase();
            if (rest.startsWith('section ')) {
                scope = SECTIONSCOPE;
                matchedsection = ci(line.slice(9), tribsection);
            } else if (rest.startsWith('title ')) {
                let st = line.slice(7);
                const p1 = st.indexOf('(');
                if (p1 >= 0) {
                    const after = st.slice(p1 + 1);
                    st = munge(st.slice(0, p1));
                    const p2 = after.indexOf(')');
                    if (p2 >= 0) {
                        passagecnt = parseInt(after.slice(0, p2), 10) || 0;
                        scope = TITLESCOPE;
                        if (matchedsection && ci(st, tribtitle)) {
                            matchedtitle = true;
                            targetpassage = !tribpassage
                                ? choose_passage(passagecnt, oid)
                                : (tribpassage <= passagecnt) ? tribpassage : 0;
                        } else {
                            matchedtitle = false;
                        }
                    }
                }
            } else if (rest.startsWith('passage ')) {
                const passagenum = parseInt(munge(line.slice(9)), 10) || 0;
                if (passagenum > 0 && passagenum <= passagecnt) {
                    scope = PASSAGESCOPE;
                    if (matchedtitle && passagenum === targetpassage)
                        foundpassage = true;
                }
            } else if (rest.startsWith('e ')) {
                if (foundpassage)
                    break;
                if (scope === TITLESCOPE)
                    matchedtitle = false;
                if (scope === SECTIONSCOPE)
                    matchedsection = false;
                if (scope)
                    --scope;
            }
        } else if (c0 === '#') {
            /* comment */
        } else if (foundpassage) {
            if (!nowin_buf) {
                win.push(line);
                if (line)
                    lastline = line;
            } else {
                nowin_buf.value = line;
                break;
            }
        }
    }
    if (nowin_buf)
        return nowin_buf.value !== '';
    if (foundpassage && lastline) {
        const { dbase_display_window } = await import('./cmd.js');
        await dbase_display_window(win);
        if (lastline.includes('['))
            lastline = munge(lastline);
        else
            lastline = `[${tribtitle}, by Terry Pratchett]`;
        const p = lastline.lastIndexOf(']');
        if (p >= 0)
            lastline = lastline.slice(0, p) + `; passage #${targetpassage}]`;
        putmsghistory(lastline, false);
        grasped = true;
    }
    if (!grasped)
        await pline(`It seems to be ${badtranslation} of "${tribtitle}"!`);
    return grasped;
}
