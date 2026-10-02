// js/topten.js — nethack-c/src/topten.c ported functions

import { rn2, rn1, rnd } from './rng.js';
import { clong, LONG_MIN, LONG_MAX } from './integer.js';
import { CORPSTAT_FEMALE, CORPSTAT_MALE } from './const.js';
import { canseemon } from './display.js';
import { PM_WIZARD, PM_ARCHEOLOGIST } from './pm.generated.js';
import { depth, deepest_lev_reached } from './hacklib.js';
import { genders as _tt_genders, aligns as _tt_aligns } from './roles.js';
import { yyyymmdd } from './allmain.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { set_corpsenm } from './mklev.js';
import { christen_monst } from './mhitm.js';
export { oname } from './objnam.js';
import { oname } from './objnam.js';

/**
 * int tt_doppel(struct monst *mon)
 * nethack-c/src/topten.c:1444-1465
 *
 * "Randomly select a topten entry to mimic."
 *
 * Choose a doppelganger display name — either a random player from the
 * topten list, or a random character class. Returns the monster index.
 *
 * RNG COST with the recording environment's EMPTY (not absent) scoreboard:
 *   rn2(13)  — here
 *   rnd(10)  — get_rnd_toptenentry(topten.c:1395), only when rn2(13) != 0
 *   rn2(13)  — the rn1() below, always (tt is always NULL)
 * i.e. 3 draws in the common case, 2 when the leading rn2(13) rolls 0.
 */
export function tt_doppel(mon) {
    const tt = rn2(13) ? get_rnd_toptenentry() : null;
    let ret;

    if (!tt) {
        ret = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
    } else {
        if (tt.plgend[0] === 'F') {
            mon.female = 1;
        } else if (tt.plgend[0] === 'M') {
            mon.female = 0;
        }
        ret = classmon(tt.plrole);
        /* Only take on a name if the player can see
           the doppelganger, otherwise we end up with
           named monsters spoiling the fun - Kes */
        if (canseemon(mon)) {
            christen_monst(mon, tt.name);
        }
    }
    return ret;
}

function get_rnd_toptenentry() {
    /* topten.c:1387 */
    const rfile = fopen_datafile("record", "r", "scoreprefix");
    /* topten.c:1388-1391 */
    if (!rfile) {
        impossible("Cannot open record file!");
        return null;
    }

    /* topten.c:1393: tt = &tt_buf; — file-static, zero-initialised buffer */
    let tt = newttentry();
    /* topten.c:1395: rank = rnd(sysopt.tt_oname_maxrank);
     * js/sys.js:101 mirrors sys.c:70's `sysopt.tt_oname_maxrank = 10`, but
     * sys_early_init() (js/sys.js:63) is not currently called from the replay
     * entrypoint, so game.sysopt can be absent here.  Prefer the mirror; fall
     * back to sys.c:70's compiled-in value rather than drawing rnd(undefined).
     * When sys_early_init() joins the startup path this reads the mirror and
     * the fallback becomes dead. */
    const TT_ONAME_MAXRANK = 10; /* sys.c:70 */
    let rank = rnd(game.sysopt?.tt_oname_maxrank ?? TT_ONAME_MAXRANK);

    /* topten.c:1396 `pickentry:` — the goto below re-enters here */
    for (;;) {
        /* topten.c:1397-1401 */
        for (let i = rank; i; i--) {
            readentry(rfile, tt);
            if (tt.points === 0n)
                break;
        }

        /* topten.c:1403-1409 */
        if (tt.points === 0n) {
            if (rank > 1) {
                rank = 1;
                rewind(rfile);
                continue; /* goto pickentry */
            }
            tt = null;
        }
        break;
    }

    /* topten.c:1411 */
    fclose(rfile);
    return tt;
}

/* C role.c roles[] `mnum` -- "index (PM_) of role" (you.h:193).  js/roles.js's
 * roles[] carries an `mnum` too, but it is this port's ROLE INDEX (0..12), NOT
 * C's Role.mnum, so reading it here would return `archeologist` as monster 0.
 * The pairs below are read off nethack-c-v5/upstream/src/role.c (filecode at
 * role.c:42/83/124/... , mnum three lines later) and resolved against
 * js/makemon_pmnames.json, which is 5.0's mons[] order:
 *
 *     Arc 331  Bar 332  Cav 333  Hea 334  Kni 335  Mon 336  Pri 337
 *     Ran 338  Rog 339  Sam 340  Tou 341  Val 342  Wiz 343
 *
 * Two of these do NOT match js/pm.generated.js, which still carries 3.7
 * spellings: 5.0 names the caveman's monster PM_CAVE_DWELLER and the priest's
 * PM_CLERIC, and js/pm.generated.js's PM_PRIEST is 275 (the dungeon priest),
 * not 337 (the player-monster).  Hardcoding the pm.generated.js names here
 * would have put a `priest` where C puts a `cleric`. */
const _TT_ROLE_MNUM = {
    Arc: 331, Bar: 332, Cav: 333, Hea: 334, Kni: 335, Mon: 336, Pri: 337,
    Ran: 338, Rog: 339, Sam: 340, Tou: 341, Val: 342, Wiz: 343,
};
/* C's `roles[i].mnum == NON_PM -> PM_HUMAN` arm has no 5.0 role to fire on
 * (every row above is a real player-monster), so PM_HUMAN (== 260) is named
 * here rather than coded as a dead branch. */
const _TT_PM_HUMAN_MUMMY = 192; /* makemon_pmnames.json[192] === "human mummy" */

function classmon(plrole) {
    const code = copynchars_str(String(plrole ?? ''), _TT_ROLESZ);
    if (Object.prototype.hasOwnProperty.call(_TT_ROLE_MNUM, code))
        return _TT_ROLE_MNUM[code];
    if (code === 'E')
        return _TT_ROLE_MNUM.Ran; /* C's PM_RANGER; see the table's note on why
                                   * js/pm.generated.js is not the source here */
    impossible('What weird role is this? (%s)', plrole);
    return _TT_PM_HUMAN_MUMMY;
}

import { KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX } from './const.js';
import { game, wizard, discover } from './gstate.js';
import { raw_print } from './rawterm.js';
/**
 * void formatkiller(char *buf, unsigned siz, int how, boolean incl_helpless)
 * nethack-c/src/topten.c:89
 *
 * Format a killer string into buf, with optional prefix and sanitization.
 * The buf is filled with the killer's name, with special characters replaced,
 * and optionally prefixed with "killed by", "choked on", etc.
 */
export function formatkiller(buf, siz, how, incl_helpless) {
    const killed_by_prefix = [
        /* DIED, CHOKING, POISONING, STARVING, */
        "killed by ", "choked on ", "poisoned by ", "died of ",
        /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
        "drowned in ", "burned by ", "dissolved in ", "crushed to death by ",
        /* STONING, TURNED_SLIME, GENOCIDED, */
        "petrified by ", "turned to slime by ", "killed by ",
        /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
        "", "", "", "", ""
    ];

    const gs = game;
    const svk = gs.svk || { killer: { format: 0, name: "" } };
    let kname = svk.killer.name;

    let result = '';

    /* siz remaining for the kname copy after the prefix has been
     * appended. Defaults to the untouched `siz` for NO_KILLER_PREFIX,
     * where C never calls strncat at all. */
    let sizAfterPrefix = siz;

    switch (svk.killer.format) {
    default:
        impossible("bad killer format? (%d)", svk.killer.format);
        /* FALLTHRU */
    case NO_KILLER_PREFIX:
        break;
    case KILLED_BY_AN:
        kname = an(kname);
        /* FALLTHRU */
    case KILLED_BY: {
        /* topten.c:122: strncat(buf, killed_by_prefix[how], siz - 1);
         * strncat appends at most (siz - 1) bytes of the prefix — NOT
         * the whole prefix unconditionally. `siz` is unsigned, so
         * siz==0 wraps to a huge budget (effectively unlimited);
         * mirrored here with `>>> 0`. With siz==1 the budget is 0, so
         * strncat appends nothing, and l ends up 0 below.
         * topten.c:123-124: l = Strlen(buf); buf += l, siz -= l; —
         * the kname-copy loop's siz budget is reduced by exactly how
         * much of the prefix was actually appended (l), not by the
         * prefix's full length. */
        const prefix = killed_by_prefix[how];
        const n = (siz - 1) >>> 0;
        const l = Math.min(prefix.length, n);
        result += prefix.slice(0, l);
        /* topten.c:124: siz -= l; — siz is unsigned, so when the
         * caller passed siz==0 (as `n` above already wrapped for),
         * this subtraction wraps too, leaving the kname-copy loop
         * below with an effectively unlimited budget rather than a
         * negative one. */
        sizAfterPrefix = (siz - l) >>> 0;
        break;
    }
    }

    /* Copy kname into result, sanitizing special characters.
     * topten.c:170: `while (--siz > 0)` copies at most
     * (sizAfterPrefix - 1) bytes from kname before NUL-terminating.
     * `siz` is unsigned there too: when sizAfterPrefix==0 (e.g. the
     * caller passed siz==0 and the prefix step above left it
     * unmodified), `--siz` wraps to a huge value and the loop copies
     * the WHOLE kname (bounded only by its own NUL), not zero bytes —
     * the mirror image of the siz==1 degenerate case (budget 0, copies
     * nothing). Compute the max-copy budget the same unsigned way as
     * the prefix step above rather than a plain decrementing loop, so
     * both wraps are reproduced. */
    const kBudget = (sizAfterPrefix - 1) >>> 0;
    for (let i = 0, copied = 0; i < kname.length && copied < kBudget; i++, copied++) {
        let c = kname[i];
        if (c === ',') {
            c = ';';
        } else if (c === '=') {
            c = '_';
        } else if (c === '\t') {
            c = ' ';
        }
        result += c;
    }

    /* Handle incl_helpless — add multi_reason suffix if appropriate */
    /* gm.multi / gm.multi_reason live flat on game in this port (g.gm is not populated) */
    const multi = gs.gm?.multi ?? gs.multi;
    if (incl_helpless && multi < 0) {
        const multi_reason = gs.gm?.multi_reason ?? gs.multi_reason;
        const suffix = ", while " + (multi_reason || "helpless");
        const suffix_bytes = suffix.length + 1; /* +1 for null terminator */

        if (result.length + suffix_bytes <= siz) {
            result += suffix;
        } else if (", while helpless".length + 1 <= siz) {
            result += ", while helpless";
        }
        /* else: doesn't fit, leave it out */
    }

    return result;
}

/**
 * an() — Add "a" or "an" prefix to a word.
 * Mirrors C's an() from chargen.c
 */
function an(word) {
    /* C objnam.c:2147 an():
     *     if (!str || !*str) {
     *         impossible("Alphabet soup: 'an(%s)'.", str ? "\"\"" : "<null>");
     *         return strcpy(buf, "an []");
     *     }
     * The empty/NULL input yields the literal "an []", not the input.  This is
     * what makes formatkiller produce "dissolved in an []" for an empty
     * svk.killer.name. */
    if (!word) {
        impossible("Alphabet soup: 'an(%s)'.", word == null ? "<null>" : "\"\"");
        return "an []";
    }
    const vowels = /^[aeiou]/i;
    return (vowels.test(word) ? 'an ' : 'a ') + word;
}

/**
 * impossible() — Log an error (C no-op for now in replay).
 * In C this is a logging macro; in JS replay mode it's a no-op.
 */
function impossible(fmt, arg) {
    // no-op in replay — the C side already logged it
}



export function tt_oname(otmp) {
    if (!otmp) {
        return null;
    }

    const tt = get_rnd_toptenentry();

    if (!tt) {
        return null;
    }

    set_corpsenm(otmp, classmon(tt.plrole));
    if (tt.plgend[0] === 'F') {
        otmp.spe = CORPSTAT_FEMALE;
    } else if (tt.plgend[0] === 'M') {
        otmp.spe = CORPSTAT_MALE;
    }
    otmp = oname(otmp, tt.name, 0); // ONAME_NO_FLAGS = 0

    return otmp;
}
/* set_corpsenm(), oname() and christen_monst() were throwing stubs here for the
 * same reason classmon() was: an always-NULL get_rnd_toptenentry() made
 * tt_oname()'s and tt_doppel()'s tails dead code.  A real `record` file makes
 * them live, so they are wired to their ONE existing body rather than
 * re-derived -- js/mklev.js set_corpsenm (C mkobj.c), js/objnam.js oname
 * (C do_name.c) and js/mhitm.js christen_monst (C do_name.c), each already
 * exported and each already the body every other caller in js/ uses.
 * mklev.js imports this file, so this closes an import cycle; all three are
 * hoisted `function` declarations, which ESM initialises at instantiation time
 * (before any module body evaluates), and nothing here calls them at load. */


export function copynchars(dst, src, n) {
    const s = (src == null) ? "" : String(src);
    let i = 0;
    let out = "";
    n = n | 0;
    /* end-of-JS-string is the '\0' terminator; an embedded '\0' terminates too */
    while (n > 0 && i < s.length && s[i] !== "\0" && s[i] !== "\n") {
        out += s[i++];
        --n;
    }
    return out;
}
export function free_ttlist(tt_head) { /* stub */ }
/* C topten.c:182 observable_depth(lev).  The whole endgame remap in that
 * function sits inside `#if 0`, so it reduces to depth(lev). */
export function observable_depth(uz) { return depth(uz); }

const _TT_COLNO = 80;   /* C config.h COLNO */
/* topten.c:33-36 + :59 — the record file's field widths. */
const _TT_NAMSZ = 10, _TT_DTHSZ = 100, _TT_ROLESZ = 3;
const _TT_SCANBUFSZ = 4 * (_TT_ROLESZ + 1) + (_TT_NAMSZ + 1) + (_TT_DTHSZ + 1) + 1;

export function outheader() {
    let linebuf = ' No  Points     Name';
    while (linebuf.length < _TT_COLNO - 9) linebuf += ' ';
    linebuf += 'Hp [max]';
    topten_print(linebuf);
}

export function outentry(rank, t1, so) {
    const gs = game;
    let second_line = true;
    let linebuf = '';
    linebuf += rank ? String(rank).padStart(3, ' ') : '   ';
    /* " %10ld  %.10s" — a zero-point entry displays the live u.urexp */
    const pts = t1.points ? clong(t1.points) : clong(gs.u?.urexp);
    linebuf += ' ' + String(pts).padStart(10, ' ') + '  ' + copynchars_str(t1.name, 10);
    linebuf += `-${t1.plrole}`;
    if (t1.plrace[0] !== '?') linebuf += `-${t1.plrace}`;
    /* gender and alignment are intentional — part of the NetHack Geek Code */
    linebuf += `-${t1.plgend}`;
    linebuf += (t1.plalign[0] !== '?') ? `-${t1.plalign} ` : ' ';

    const death = String(t1.death ?? '');
    const astralDnum = gs.astral_level?.dnum;
    const knoxDnum = gs.knox_level?.dnum;
    if (death.startsWith('escaped')) {
        linebuf += `escaped the dungeon ${death.slice(7, 9) === ' (' ? death.slice(9) : ''}`
                 + `[max level ${t1.maxlvl}]`;
        const bp = linebuf.indexOf(')');
        if (bp >= 0)
            linebuf = (t1.deathdnum === astralDnum)
                ? linebuf.slice(0, bp)
                : linebuf.slice(0, bp) + ' ' + linebuf.slice(bp + 1);
        second_line = false;
    } else if (death.startsWith('ascended')) {
        linebuf += `ascended to demigod${(t1.plgend[0] === 'F') ? 'dess' : ''}-hood`;
        second_line = false;
    } else {
        if (death.startsWith('quit')) { linebuf += 'quit'; second_line = false; }
        else if (death.startsWith('died of st')) { linebuf += 'starved to death'; second_line = false; }
        else if (death.startsWith('choked')) linebuf += `choked on h${(t1.plgend[0] === 'F') ? 'er' : 'is'} food`;
        else if (death.startsWith('poisoned')) linebuf += 'was poisoned';
        else if (death.startsWith('crushed')) linebuf += 'was crushed to death';
        else if (death.startsWith('petrified by ')) linebuf += 'turned to stone';
        else linebuf += 'died';

        if (astralDnum !== undefined && t1.deathdnum === astralDnum) {
            const arg = { '-5': 'Astral', '-4': 'Water', '-3': 'Fire',
                          '-2': 'Air', '-1': 'Earth' }[String(t1.deathlev)] ?? 'Void';
            linebuf += (t1.deathlev === -5) ? ` on the ${arg} Plane` : ` on the Plane of ${arg}`;
        } else {
            linebuf += ` in ${gs.dungeons?.[t1.deathdnum]?.dname ?? ''}`;
            if (t1.deathdnum !== knoxDnum) linebuf += ` on level ${t1.deathlev}`;
            if (t1.deathlev !== t1.maxlvl) linebuf += ` [max ${t1.maxlvl}]`;
        }
        /* kludge for "quit while already on Charon's boat" */
        if (death.startsWith('quit ')) linebuf += death.slice(4);
    }
    linebuf += '.';

    /* Quit, starved, ascended and escaped have no second line. */
    if (second_line) {
        let bp = `  ${death.charAt(0).toUpperCase()}${death.slice(1)}.`;
        /* 'record' stores "Killed by Mr. Foo; the shopkeeper" with a semicolon
           to keep the comma out of the file; put the comma back for display. */
        bp = bp.replace('; the ', ', the ');
        linebuf += bp;
    }

    const hpbuf = (t1.hp <= 0) ? '-' : String(t1.hp);
    /* beginning of the hp column before padding: COLNO - strlen("  Hp [max]") */
    let hppos = _TT_COLNO - '  Hp [max]'.length;
    while (linebuf.length >= hppos) {
        let bp = linebuf.length;
        while (!(linebuf[bp] === ' ' && bp < hppos)) bp--;
        /* word too long — wrap in the middle */
        if (15 >= bp) bp = hppos - 1;
        /* about to wrap inside " [max N]" — wrap in front of it instead */
        if (bp > 5 && linebuf.slice(bp - 5, bp) === ' [max') bp -= 5;
        const linebuf3 = (linebuf[bp] !== ' ') ? linebuf.slice(bp) : linebuf.slice(bp + 1);
        linebuf = linebuf.slice(0, bp);
        topten_emit(linebuf, so);
        linebuf = ' '.repeat(15) + ' ' + linebuf3;   /* "%15s %s" with "" */
    }
    /* beginning of the hp column not including padding */
    hppos = _TT_COLNO - 7 - hpbuf.length;
    if (linebuf.length <= hppos) {
        linebuf = linebuf.padEnd(hppos, ' ') + hpbuf
                + ' ' + ((t1.maxhp < 10) ? '  ' : (t1.maxhp < 100) ? ' ' : '')
                + `[${t1.maxhp}]`;
    }
    topten_emit(linebuf, so);
}

/* C topten.c:1075/1099 — `if (so) { pad to COLNO - 1; topten_print_bold(); }
 * else topten_print();` */
function topten_emit(linebuf, so) {
    if (so)
        topten_print_bold(linebuf.padEnd(_TT_COLNO - 1, ' '));
    else
        topten_print(linebuf);
}

export function topten_print_bold(x) {
    const gs = game;
    const win = gs.gt ? gs.gt.toptenwin : undefined;
    if (win === undefined || win === null || win === -1 /* WIN_ERR */) {
        raw_print('\x1b[1m' + x + '\x1b[0m');
        return;
    }
    /* C topten_print_bold() is synchronous: retain the attribute alongside
     * the row until display_nhwindow() paints the text window. */
    const w = _TT_WINDOWS.get(win);
    if (w) w.lines.push({ text: String(x ?? ''), attr: 2 });
}

/* C's `%.10s` / strncpy with a fixed width — copynchars() above writes into a
 * caller's buffer, which JS strings cannot do; this is the value-returning
 * form the new call sites need. */
function copynchars_str(s, n) {
    return String(s ?? '').slice(0, n);
}
/* C topten.c:208 discardexcess(rfile) — "throw away characters until current
 * record has been entirely consumed", i.e. fgetc() up to and including the next
 * '\n' (or EOF).  _tt_getline() below already consumes a whole line including
 * its terminator, so by the time readentry() reaches C's failure branch the
 * cursor is where discardexcess() would have left it.  Kept as a named no-op so
 * the call site reads as C's does rather than silently omitting the call. */
function discardexcess(rfile) { /* the line was consumed by _tt_getline */ }

export function readentry(rfile, tt) {
    if (!tt)
        return;
    const line = _tt_getline(rfile);
    /* C topten.c:239 — fscanf returns EOF/short count, never TTFIELDS */
    if (line === null) {
        tt.points = 0n;
        discardexcess(rfile);
        return;
    }
    /* fmt = "%d.%d.%d %ld %d %d %d %d %d %d %ld %ld %d " — 13 fields; each
     * %d/%ld skips leading whitespace, and the trailing literal space skips the
     * whitespace that separates the numbers from the string fields. */
    const nums = /^\s*([-+]?\d+)\.\s*([-+]?\d+)\.\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*([-+]?\d+)\s*/.exec(line);
    if (!nums) {
        tt.points = 0n;
        discardexcess(rfile);
        return;
    }
    tt.ver_major = +nums[1];
    tt.ver_minor = +nums[2];
    tt.patchlevel = +nums[3];
    // fscanf's %ld keeps all 64 bits; the native libc clamps on ERANGE.
    const points = BigInt(nums[4]);
    tt.points = points < LONG_MIN ? LONG_MIN : points > LONG_MAX ? LONG_MAX : points;
    tt.deathdnum = +nums[5];
    tt.deathlev = +nums[6];
    tt.maxlvl = +nums[7];
    tt.hp = +nums[8];
    tt.maxhp = +nums[9];
    tt.deaths = +nums[10];
    tt.deathdate = +nums[11];
    tt.birthdate = +nums[12];
    tt.uid = +nums[13];

    /* C topten.c:252 fgets(inbuf, ...) — the remainder of the line.  SCANBUFSZ
     * is 4*(ROLESZ+1) + (NAMSZ+1) + (DTHSZ+1) + 1 == 129, an implicit length
     * limit on every string field extracted from it. */
    const inbuf = line.slice(nums[0].length).slice(0, _TT_SCANBUFSZ - 1);

    if (tt.ver_major < 3 || (tt.ver_major === 3 && tt.ver_minor < 3)) {
        tt.points = 0n;
        return;
    }
    /* fmt33 = "%s %s %s %s %[^,],%[^\n]%*c" — four whitespace-delimited
     * fields, then a scanset up to the first comma (spaces included) and a
     * scanset up to the newline.  A scanset that matches zero characters FAILS,
     * which is why the two tails are + and not *. */
    const strs = /^\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([^,]+),([^\n]+)/.exec(inbuf);
    if (!strs) {
        tt.points = 0n;
    } else {
        tt.plrole = copynchars(tt.plrole, strs[1], _TT_ROLESZ);
        tt.plrace = copynchars(tt.plrace, strs[2], _TT_ROLESZ);
        tt.plgend = copynchars(tt.plgend, strs[3], _TT_ROLESZ);
        tt.plalign = copynchars(tt.plalign, strs[4], _TT_ROLESZ);
        tt.name = copynchars(tt.name, strs[5], _TT_NAMSZ);
        tt.death = copynchars(tt.death, strs[6], _TT_DTHSZ);
    }

    /* C topten.c:290-296 — "check old score entries for Y2K problem". */
    if (tt.points > 0n) {
        if (tt.birthdate < 19000000) tt.birthdate += 19000000;
        if (tt.deathdate < 19000000) tt.deathdate += 19000000;
    }
}

/**
 * rewind(FILE *) — C stdio; get_rnd_toptenentry() uses it to restart the scan
 * at rank 1 after running off the end of the list.
 */
function rewind(rfile) { if (rfile) rfile.pos = 0; }
export function topten_print(s) {
    const gs = game;
    const win = gs.gt ? gs.gt.toptenwin : undefined;
    if (win === undefined || win === null || win === -1 /* WIN_ERR */) {
        raw_print(s);
        return;
    }
    const w = _TT_WINDOWS.get(win);
    if (w) w.lines.push({ text: String(s ?? ''), attr: 0 });
}
/**
 * staticfn void writeentry(FILE *rfile, struct toptenentry *tt)
 * nethack-c-v5/upstream/src/topten.c:301
 *
 *     fprintf(rfile, "%d.%d.%d %ld %d %d %d %d %d %d %ld %ld %d ", ...13...);
 *     fprintf(rfile, "%s %s %s %s ", plrole, plrace, plgend, plalign);
 *     fprintf(rfile, "%s,%s\n", onlyspace(tt->name) ? "_" : tt->name, tt->death);
 *
 * The comma is the field separator readentry()'s %[^,] scanset splits on, which
 * is why formatkiller() (topten.c:130) rewrites every ',' in a killer name to
 * ';' — outentry() puts it back for display.  The pre-3.3 "%c%c " role/gender
 * form is unreachable: everything this port writes carries VERSION_MAJOR 5.
 */
export function writeentry(rfile, tt) {
    if (!rfile || !tt)
        return;
    let out = `${tt.ver_major | 0}.${tt.ver_minor | 0}.${tt.patchlevel | 0}`
        + ` ${clong(tt.points)} ${tt.deathdnum | 0} ${tt.deathlev | 0}`
        + ` ${tt.maxlvl | 0} ${tt.hp | 0} ${tt.maxhp | 0} ${tt.deaths | 0}`
        + ` ${tt.deathdate | 0} ${tt.birthdate | 0} ${tt.uid | 0} `;
    out += `${tt.plrole} ${tt.plrace} ${tt.plgend} ${tt.plalign} `;
    out += `${onlyspace(tt.name) ? '_' : tt.name},${tt.death}\n`;
    rfile.out += out;
}

/* C hacklib.c:419 onlyspace(s) — TRUE for the empty string too. */
function onlyspace(s) {
    const str = String(s ?? '');
    for (let i = 0; i < str.length; i++)
        if (str[i] !== ' ' && str[i] !== '\t')
            return false;
    return true;
}

/* ---- local helpers needed by topten ---- */

function getuid() { return 0; }
function strncmp(a, b, n) {
    if (!a || !b) return a === b ? 0 : (a ? 1 : -1);
    for (let i = 0; i < n; i++) {
        if (i >= a.length && i >= b.length) return 0;
        if (i >= a.length) return -1;
        if (i >= b.length) return 1;
        if (a.charCodeAt(i) !== b.charCodeAt(i))
            return a.charCodeAt(i) - b.charCodeAt(i);
    }
    return 0;
}

function newttentry() {
    return {
        tt_next: null,
        points: 0n, deathdnum: 0, deathlev: 0,
        maxlvl: 0, hp: 0, maxhp: 0, deaths: 0,
        ver_major: 0, ver_minor: 0, patchlevel: 0,
        deathdate: 0, birthdate: 0, uid: 0,
        plrole: "", plrace: "", plgend: "", plalign: "",
        name: "", death: ""
    };
}
function dealloc_ttentry(ttent) { /* no-op */ }

/* Minimal synchronous NHW_TEXT window used by toptenwin.  topten() itself is
 * synchronous (end.c calls it after tearing down the normal window port), so
 * this path keeps the C putstr/display ordering without introducing a promise
 * into the score writer.  The rows are published as the next screen frame;
 * the normal raw_print path remains unchanged when toptenwin is off. */
const _TT_WINDOWS = new Map();
let _tt_next_window = 1;
function create_nhwindow(type) {
    const id = _tt_next_window++;
    _TT_WINDOWS.set(id, { type, lines: [] });
    return id;
}
function display_nhwindow(win, flag) {
    const w = _TT_WINDOWS.get(win);
    if (!w) return;
    const gs = game;
    const rows = w.lines.map(({ text, attr }) =>
        attr ? '\x1b[1m' + text + '\x1b[0m' : text);
    gs._screen_output = rows.join('\n');
    if (gs.nhDisplay) {
        gs.nhDisplay.cursorCol = 0;
        gs.nhDisplay.cursorRow = Math.min(rows.length, 23);
    }
}
function destroy_nhwindow(win) { _TT_WINDOWS.delete(win); }
function lock_file(filename, prefix, timeout) { return 1; }
function unlock_file(filename) { /* no-op */ }
function fopen_datafile(filename, mode, prefix) {
    const write = String(mode).indexOf('w') >= 0;
    return {
        name: String(filename),
        write,
        data: write ? '' : (vfsReadFile(String(filename)) ?? ''),
        pos: 0,
        out: '',
    };
}

/* One fgets()' worth of the open file, or null at EOF.  A final line with no
 * '\n' is still a line, exactly as fgets() reports it. */
function _tt_getline(f) {
    if (!f || f.pos >= f.data.length)
        return null;
    const nl = f.data.indexOf('\n', f.pos);
    if (nl < 0) {
        const line = f.data.slice(f.pos);
        f.pos = f.data.length;
        return line;
    }
    const line = f.data.slice(f.pos, nl);
    f.pos = nl + 1;
    return line;
}

function fclose(file) {
    if (file && file.write)
        vfsWriteFile(file.name, file.out);
}
function ordin(n) {
    let nn = Math.abs(n) % 100;
    if (Math.trunc(nn / 10) === 1) return "th";
    switch (nn % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
}

/**
 * void topten(int how, time_t when)
 * nethack-c/src/topten.c:627-926
 */
export function topten(how, when) {
    const gs = game;
    let t0, tprev;
    let t1;
    let rfile;
    let uid = getuid();
    let rank, rank0 = -1, rank1 = 0;
    let occ_cnt = gs.sysopt ? gs.sysopt.persmax : 10;
    let flg = 0;
    let t0_used = false;
    let skip_scores;

    if (gs.program_state && gs.program_state.panicking)
        return;

    if (gs.iflags && gs.iflags.toptenwin) {
        gs.gt.toptenwin = create_nhwindow(4);
    }

    t0_used = false;
    t0 = newttentry();
    /* C patchlevel.h:10-15 — VERSION_MAJOR 5, VERSION_MINOR 0, PATCHLEVEL 0.
     * These used to read 3.7.0, which was harmless only while the record file
     * was never read back: readentry() (topten.c:258) routes anything below
     * 3.3 through the legacy "%c%c" layout, and the whole record is a
     * version-tagged format. */
    t0.ver_major = 5;
    t0.ver_minor = 0;
    t0.patchlevel = 0;
    t0.points = clong(gs.u?.urexp);
    t0.deathdnum = gs.u && gs.u.uz ? gs.u.uz.dnum : 0;
    t0.deathlev = observable_depth(gs.u ? gs.u.uz : null);
    t0.maxlvl = deepest_lev_reached(true);
    t0.hp = gs.u ? gs.u.uhp : 0;
    t0.maxhp = gs.u ? gs.u.uhpmax : 0;
    t0.deaths = gs.u ? gs.u.umortality : 0;
    t0.uid = uid;
    /* C copynchars(dest, src, n) writes into a caller buffer; JS strings are
     * immutable, so these are assignments.  Every one of them used to DISCARD
     * copynchars' return value, so the whole identity block came out empty and
     * outentry() rendered "----" where C writes "Swimmer-Ran-Elf-Fem-Cha".
     *
     * The source objects moved too: C's gu.urole / gu.urace / genders[] /
     * aligns[] are game.urole / game.urace / roles.js genders / roles.js aligns
     * in this port, and svp.plname is game.plname.  Reading `gs.gu`, which
     * nothing in this tree assigns, made all four branches take their
     * empty-string else arm. */
    t0.plrole = copynchars(t0.plrole, gs.urole?.filecode || "", 3);
    t0.plrace = copynchars(t0.plrace, gs.urace?.filecode || "", 3);
    {
        const gcode = _tt_genders[gs.flags?.female ? 1 : 0];
        t0.plgend = copynchars(t0.plgend, gcode ? gcode.filecode : "", 3);
    }
    {
        /* C topten.c:672 aligns[1 - u.ualign.type] — lawful(1)->0,
         * neutral(0)->1, chaotic(-1)->2, which is aligns[]' declaration order. */
        const acode = _tt_aligns[1 - (gs.u?.ualign?.type | 0)];
        t0.plalign = copynchars(t0.plalign, acode ? acode.filecode : "", 3);
    }
    t0.name = copynchars(t0.name, gs.svp?.plname ?? gs.plname ?? "", 10);
    t0.death = formatkiller('', 100, how, true);
    t0.birthdate = yyyymmdd(gs.ubirthday || 0);
    t0.deathdate = yyyymmdd(when);
    t0.tt_next = null;

    if ((wizard() || discover()) && how !== 11) {
        let pbuf;
        topten_print("");
        pbuf = "Since you were in " + (wizard() ? "wizard" : "discover") +
               " mode, the score list will not be checked.";
        topten_print(pbuf);
        if (gs.program_state && !gs.program_state.stopprint) {
            if (gs.iflags && gs.iflags.toptenwin) {
                display_nhwindow(gs.gt.toptenwin, true);
            }
        }
        if (gs.iflags && gs.iflags.toptenwin) {
            destroy_nhwindow(gs.gt.toptenwin);
            gs.gt.toptenwin = -1;
        }
        if (!t0_used)
            dealloc_ttentry(t0);
        return;
    }

    if (!lock_file("record", "scoreprefix", 60)) {
        if (!t0_used)
            dealloc_ttentry(t0);
        if (gs.iflags && gs.iflags.toptenwin) {
            destroy_nhwindow(gs.gt.toptenwin);
            gs.gt.toptenwin = -1;
        }
        return;
    }

    rfile = fopen_datafile("record", "r", "scoreprefix");

    if (!rfile) {
        unlock_file("record");
        if (!t0_used)
            dealloc_ttentry(t0);
        if (gs.iflags && gs.iflags.toptenwin) {
            destroy_nhwindow(gs.gt.toptenwin);
            gs.gt.toptenwin = -1;
        }
        return;
    }

    topten_print("");

    if (t0.points < (gs.sysopt ? gs.sysopt.pointsmin : 0))
        t0.points = 0n;

    t1 = newttentry();
    let tt_head = t1;
    tprev = null;
    for (rank = 1; ; ) {
        readentry(rfile, t1);
        if (t1.points < (gs.sysopt ? gs.sysopt.pointsmin : 0))
            t1.points = 0n;
        if (rank0 < 0 && t1.points < t0.points) {
            rank0 = rank++;
            if (tprev === null)
                tt_head = t0;
            else
                tprev.tt_next = t0;
            t0.tt_next = t1;
            t0_used = true;
            occ_cnt--;
            flg++;
        } else
            tprev = t1;

        if (t1.points === 0n)
            break;
        if ((gs.sysopt && gs.sysopt.pers_is_uid ? t1.uid === t0.uid
                    : strncmp(t1.name, t0.name, 10) === 0)
            && strncmp(t1.plrole, t0.plrole, 3) === 0
            && --occ_cnt <= 0) {
            if (rank0 < 0) {
                rank0 = 0;
                rank1 = rank;
                {
                    let pbuf;
                    pbuf = "You didn't beat your previous score of " +
                           t1.points + " points.";
                    topten_print(pbuf);
                    topten_print("");
                }
            }
            if (occ_cnt < 0) {
                flg++;
                continue;
            }
        }
        if (rank <= (gs.sysopt ? gs.sysopt.entrymax : 100)) {
            t1.tt_next = newttentry();
            t1 = t1.tt_next;
            rank++;
        }
        if (rank > (gs.sysopt ? gs.sysopt.entrymax : 100)) {
            t1.points = 0n;
            break;
        }
    }
    if (flg) {
        fclose(rfile);
        rfile = fopen_datafile("record", "w", "scoreprefix");
        if (!rfile) {
            unlock_file("record");
            free_ttlist(tt_head);
            if (!t0_used)
                dealloc_ttentry(t0);
            if (gs.iflags && gs.iflags.toptenwin) {
                destroy_nhwindow(gs.gt.toptenwin);
                gs.gt.toptenwin = -1;
            }
            return;
        }
        if (!(gs.program_state && gs.program_state.stopprint))
            if (rank0 > 0) {
                if (rank0 <= 10) {
                    topten_print("You made the top ten list!");
                } else {
                    let pbuf;
                    pbuf = "You reached the " + rank0 + ordin(rank0) +
                           " place on the top " +
                           (gs.sysopt ? gs.sysopt.entrymax : 100) + " list.";
                    topten_print(pbuf);
                }
                topten_print("");
            }
    }
    skip_scores = !(gs.flags && gs.flags.end_top) &&
                  !(gs.flags && gs.flags.end_around) &&
                  !(gs.flags && gs.flags.end_own);
    if (rank0 === 0)
        rank0 = rank1;
    if (rank0 <= 0)
        rank0 = rank;
    if (!skip_scores && !(gs.program_state && gs.program_state.stopprint))
        outheader();
    for (t1 = tt_head, rank = 1; t1.points !== 0n; t1 = t1.tt_next, ++rank) {
        if (flg)
            writeentry(rfile, t1);
        if (skip_scores || (gs.program_state && gs.program_state.stopprint))
            continue;
        if (rank <= (gs.flags ? gs.flags.end_top : 0)
            || (rank >= rank0 - (gs.flags ? gs.flags.end_around : 0)
                && rank <= rank0 + (gs.flags ? gs.flags.end_around : 0))
            || ((gs.flags && gs.flags.end_own) && (gs.sysopt && gs.sysopt.pers_is_uid
                                  ? t1.uid === t0.uid
                                  : strncmp(t1.name, t0.name, 10) === 0))) {
            if (rank === rank0 - (gs.flags ? gs.flags.end_around : 0)
                && rank0 > (gs.flags ? gs.flags.end_top : 0) + (gs.flags ? gs.flags.end_around : 0) + 1
                && !(gs.flags && gs.flags.end_own))
                topten_print("");

            if (rank !== rank0) {
                outentry(rank, t1, false);
            } else if (!rank1) {
                outentry(rank, t1, true);
            } else {
                outentry(rank, t1, true);
                outentry(0, t0, true);
            }
        }
    }
    if (rank0 >= rank)
        if (!skip_scores && !(gs.program_state && gs.program_state.stopprint))
            outentry(0, t0, true);
    fclose(rfile);
    unlock_file("record");
    free_ttlist(tt_head);

    if (gs.program_state && !gs.program_state.stopprint) {
        if (gs.iflags && gs.iflags.toptenwin) {
            display_nhwindow(gs.gt.toptenwin, true);
        }
    }
    if (!t0_used)
        dealloc_ttentry(t0);
    if (gs.iflags && gs.iflags.toptenwin) {
        destroy_nhwindow(gs.gt.toptenwin);
        gs.gt.toptenwin = -1;
    }
}
