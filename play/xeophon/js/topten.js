// topten.js — score list and "record" file.
// C refs: src/topten.c (formatkiller, topten(), outheader(), outentry(),
// get_rnd_toptenentry()), src/end.c (build_english_list re-export),
// config.h (PERSMAX/ENTRYMAX/POINTSMIN), src/sys.c (sysopt defaults).
//
// Record-file format decision: the C build writes a fixed-field text
// "record" file (topten.c:139-168 writeentry()); this port keeps the
// contest's JSON-to-vfs convention — a JSON array in the 'record' path of
// the frozen virtual FS (frozen/storage.js), so the list persists across
// sessions within a run and across the multi-segment public fixtures.
// Entry field names mirror the C struct toptenentry (topten.c:38-55)
// through the adapter in buildToptenEntry()/storeToptenList().

import { vfsReadFile, vfsWriteFile } from './storage.js';
import { game } from './gstate.js';
import { COLNO } from './const.js';
import {
    DIED, QUIT, ESCAPED, ASCENDED, GENOCIDED, PANICKED, CHOKING,
    POISONING, STARVING, DROWNING, BURNING, DISSOLVED, CRUSHING,
    STONING, TURNED_SLIME, TRICKED, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX,
    DEATHS, deathSummary, justAn, buildEnglishList,
} from './end.js';

const NAMSZ = 10;   /* topten.c:31-34 */
const DTHSZ = 100;  /* topten.c:35    */
const ROLESZ = 3;   /* topten.c:36    */

// sysopt defaults (sys.c:81-84, config.h:326-345).
const PERSMAX = 3;
const ENTRYMAX = 100;
const POINTSMIN = 1;
const TT_ONAME_MAXRANK = 10; /* sysopt.tt_oname_maxrank, sys.c:81 */

// end_top/end_around/end_own as compounded for the recorded public fixtures
// ('scores' option, optfn_scores() options.c:3680-3760); the fixture rc
// files don't override these.
const END_TOP = 3;
const END_AROUND = 2;
const END_OWN = false;

const RECORD_PATH = '/record';

// C ref: killed_by_prefix[] (topten.c:96-105).
const KILLED_BY_PREFIX = [
    /* DIED, CHOKING, POISONING, STARVING, */
    'killed by ', 'choked on ', 'poisoned by ', 'died of ',
    /* DROWNING, BURNING, DISSOLVED, CRUSHING, */
    'drowned in ', 'burned by ', 'dissolved in ', 'crushed to death by ',
    /* STONING, TURNED_SLIME, GENOCIDED, */
    'petrified by ', 'turned to slime by ', 'killed by ',
    /* PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED */
    '', '', '', '', '',
];

// C ref: formatkiller() (topten.c:88-162) —
// "killed by",&c ["an"] killer.name, with ", while <reason>" if helpless.
export function formatKiller(how, killer, { inclHelpless = false, multi = 0,
                                            multiReason = null, maxLen = DTHSZ + 1 } = {}) {
    let buf = '';
    let kname = String(killer?.name || '');
    const format = killer?.format ?? KILLED_BY_AN;
    switch (format) {
    case NO_KILLER_PREFIX:
        break;
    case KILLED_BY_AN:
        kname = justAn(kname) + kname;
        /*FALLTHRU*/
    case KILLED_BY:
        buf += KILLED_BY_PREFIX[how].slice(0, maxLen - 1);
        break;
    default:
        /* impossible("bad killer format") */
        break;
    }
    /* Copy kname into buf[], replacing ',' with ';' and '=' with '_' so the
       text can't confuse field splitting when 'record' is re-read
       (topten.c:127-149). */
    const budget = Math.max(0, maxLen - 1 - buf.length);
    for (const c of kname) {
        if (buf.length >= budget) break;
        if (c === ',') buf += ';';
        else if (c === '=') buf += '_';
        else if (c === '\t') buf += ' ';
        else buf += c;
    }
    /* ", while <reason>" appended after the formatted killer name
       (topten.c:151-161; siz is the space remaining after prefix+name) */
    if (inclHelpless && multi < 0) {
        const room = maxLen - 1 - buf.length;
        if (multiReason && multiReason.length + ', while '.length <= room) {
            buf += `, while ${multiReason}`;
        } else if (', while helpless'.length <= room) {
            buf += ', while helpless';
        }
        /* else extra death info won't fit, so leave it out */
    }
    return buf;
}

/* ------------------------------------------------------------------ */
/* record file                                                        */
/* ------------------------------------------------------------------ */

// Adapter: struct toptenentry (topten.c:38-55) <-> persisted JSON.
// The JSON keys are the historical cmd.js ('score', 'name', ...) names so
// existing stored lists (and fixture states) stay compatible.
function loadToptenList() {
    const raw = vfsReadFile(RECORD_PATH);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function storeToptenList(entries) {
    vfsWriteFile(RECORD_PATH, JSON.stringify(entries.slice(0, ENTRYMAX)));
}

function buildToptenEntry(dsum, cause) {
    return {
        score: dsum.score,            /* t0->points = u.urexp */
        name: String(dsum.name).slice(0, NAMSZ),
        role: dsum.role,
        race: dsum.race,
        gender: dsum.gender,
        align: dsum.align,
        dungeon: dsum.dungeon,
        depth: dsum.depth,
        maxlvl: dsum.maxlvl,
        hp: dsum.hp,
        hpmax: dsum.hpmax,
        cause,
    };
}

const ROLE_ABBREV = { Archeologist: 'Arc', Barbarian: 'Bar', Caveman: 'Cav',
    Healer: 'Hea', Knight: 'Kni', Monk: 'Mon', Priest: 'Pri', Ranger: 'Ran',
    Rogue: 'Rog', Samurai: 'Sam', Tourist: 'Tou', Valkyrie: 'Val', Wizard: 'Wiz' };
const RACE_ABBREV = { human: 'Hum', elven: 'Elf', gnomish: 'Gno', dwarven: 'Dwa', orcish: 'Orc' };
const GENDER_CODE = { male: 'Mal', female: 'Fem' };
const ALIGN_CODE = { lawful: 'Law', neutral: 'Neu', chaotic: 'Cha' };

function entryName(entry) {
    const role = ROLE_ABBREV[entry.role] || String(entry.role).slice(0, 3);
    const race = RACE_ABBREV[entry.race] || String(entry.race).slice(0, 3);
    const gender = GENDER_CODE[entry.gender] || 'Mal';
    const align = ALIGN_CODE[entry.align] || 'Neu';
    return `${String(entry.name).slice(0, NAMSZ)}-${role}-${race}-${gender}-${align}`;
}

// C ref: ordinary role filecode fallback: roles[i].filecode is the
// abbreviation (e.g. role.c 'Wiz'); JS role names map through ROLE_ABBREV.

// C ref: outheader() (topten.c:1416-1428).
function outheader() {
    let line = ' No  Points     Name';
    line = line.padEnd(COLNO - 9);
    return `${line}Hp [max]`;
}

// C ref: ordin() (hacklib.c:623-631) — duplicated here because hacklib.js
// does not export it yet.
function ordin(n) {
    const dd = n % 10;
    return (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1) ? 'th'
        : dd === 1 ? 'st' : dd === 2 ? 'nd' : 'rd';
}

// C ref: outentry() (topten.c:1446-1530) — build one score-list entry's
// display lines; returns an array of lines (before HP padding).
function outentryLines(rank, t1, dsum) {
    const hpWidth = '  Hp [max]'.length; /* hppos base (topten.c:1158) */
    const wrapCol = COLNO - hpWidth;
    const dotStone = String(t1.cause || '');
    /* fix up ", the "<->"; the " munging from formatkiller()/record
       (topten.c:1149-1152) */
    const displayCause = dotStone.replace(/; the /g, ', the ');

    let secondLine = true;
    let line = rank ? String(rank).padStart(3) : '   ';
    const points = t1.score ? t1.score : (t1.cause === 'quit' ? 0 : dsum.exp || 0);
    line += ` ${String(points).padStart(10)}  ${entryName(t1)} `;
    if (dotStone.startsWith('escaped')) {
        line += `escaped the dungeon [max level ${t1.maxlvl ?? t1.depth}].`;
        secondLine = false;
    } else if (dotStone.startsWith('ascended')) {
        line += `ascended to demigod${t1.gender === 'female' ? 'dess' : ''}-hood`;
        secondLine = false;
    } else if (dotStone.startsWith('quit')) {
        line += 'quit';
        secondLine = false;
    } else if (dotStone.startsWith('died of st')) {
        line += 'starved to death';
        secondLine = false;
    } else if (dotStone.startsWith('choked')) {
        line += `choked on h${t1.gender === 'female' ? 'er' : 'is'} food`;
    } else if (dotStone.startsWith('poisoned')) {
        line += 'was poisoned';
    } else if (dotStone.startsWith('crushed')) {
        line += 'was crushed to death';
    } else if (dotStone.startsWith('petrified by ')) {
        line += 'turned to stone';
    } else {
        line += 'died';
    }

    if (!dotStone.startsWith('escaped') && !dotStone.startsWith('ascended')) {
        line += ` in ${t1.dungeon} on level ${t1.depth}`;
        if (t1.depth !== t1.maxlvl) line += ` [max ${t1.maxlvl}]`;
        /* kludge for "quit while already on Charon's boat" (topten.c:1132-1134) */
        if (dotStone.startsWith('quit ')) line += dotStone.slice(4);
    }
    line += '.';

    if (secondLine) {
        const first = displayCause.charAt(0).toUpperCase();
        line += `  ${first}${displayCause.slice(1)}.`;
    }

    /* wrap to the HP column (topten.c:1154-1177) */
    const wrapped = [];
    while (line.length >= wrapCol) {
        let split = -1;
        for (let col = Math.min(line.length - 1, wrapCol - 1); col >= 0; col--) {
            if (line[col] === ' ') { split = col; break; }
        }
        /* special case: word too long, wrap in the middle (topten.c:1164-1165) */
        if (split <= 15) split = wrapCol - 1;
        /* wrap in front of a " [max" boundary (topten.c:1167-1168) */
        if (split > 5 && line.slice(split - 5, split) === ' [max') split -= 5;
        const next = line[split] === ' ' ? line.slice(split + 1) : line.slice(split);
        wrapped.push(line.slice(0, split));
        line = `${''.padStart(15)} ${next}`;
    }

    /* hit point column (topten.c:1178-1194) */
    const hp = t1.hp <= 0 ? '-' : String(t1.hp);
    const hpCol = COLNO - 7 - hp.length;
    if (line.length <= hpCol) {
        const maxhpPad = t1.hpmax < 10 ? '  ' : t1.hpmax < 100 ? ' ' : '';
        line += `${' '.repeat(hpCol - line.length)}${hp} ${maxhpPad}[${t1.hpmax}]`;
    }
    wrapped.push(line);
    return wrapped;
}

/* ------------------------------------------------------------------ */
/* topten()                                                           */
/* ------------------------------------------------------------------ */

// C ref: topten() rank/persist decision (topten.c:755-885).  Returns the
// overlay rows for the score list screen; persists the record list when the
// current game makes the cut.
export function deathScoreLines() {
    const dsum = deathSummary();
    const cause = game._escaped_game ? 'escaped'
        : game._quit_game ? 'quit'
        : dsum.cause;
    const t0 = buildToptenEntry(dsum, cause);

    let entries = loadToptenList();

    /* assure minimum number of points (topten.c:757-758) */
    const unrankedCurrent = t0.score < POINTSMIN;
    let rank0 = 0; /* 0 = not on the list; n = n_th on the list (topten.c:762) */
    let currentIndex = -1;
    if (unrankedCurrent) {
        rank0 = entries.length + 1;
        currentIndex = entries.length;
        entries = [...entries, t0];
    } else {
        rank0 = entries.findIndex(entry => entry.score < t0.score);
        if (rank0 < 0) rank0 = entries.length;
        entries = [ ...entries.slice(0, rank0), t0, ...entries.slice(rank0) ];
        currentIndex = rank0;
        storeToptenList(entries);
        rank0 = rank0 + 1;
    }

    const rows = [];
    let row;
    if (unrankedCurrent) {
        rows.push([1, 0, outheader()]);
        row = 2;
    } else {
        /* "You made the top ten list!" / "You reached the Nst place..."
           (topten.c:866-878) */
        if (rank0 <= 10) {
            rows.push([1, 0, 'You made the top ten list!']);
        } else {
            rows.push([1, 0,
                `You reached the ${rank0}${ordin(rank0)} place on the top ${ENTRYMAX} list.`]);
        }
        rows.push([3, 1, outheader().trimStart()]);
        row = 4;
    }

    for (const [index, entry] of entries.entries()) {
        const actualRank = index + 1;
        const isCurrent = index === currentIndex;
        const rankShown = unrankedCurrent && isCurrent ? 0 : actualRank;
        const wanted = rankShown <= END_TOP
            || isCurrent
            || (actualRank >= rank0 - END_AROUND && actualRank <= rank0 + END_AROUND)
            || (END_OWN && entry.idname === game.idname);
        if (!wanted) continue;
        /* blank separator line between the top block and the own block
           (topten.c:864-868) */
        if (!isCurrent && actualRank === rank0 - END_AROUND
            && rank0 > END_TOP + END_AROUND + 1) rows.push([row++, 0, '']);

        for (const text of outentryLines(rankShown, entry, dsum))
            rows.push(isCurrent ? [row++, 0, text, 2] : [row++, 0, text]);
    }
    /* current entry beyond the printed range gets its own unranked row
       (topten.c:879-881) */
    if (isFinite(rank0) && rank0 > entries.length && currentIndex >= 0) {
        /* handled by the isCurrent branch above */
    }
    return rows;
}

/* ------------------------------------------------------------------ */
/* record-based naming (statues/corpses)                              */
/* ------------------------------------------------------------------ */

// C ref: get_rnd_toptenentry() (topten.c:1408-1439) — pick a rank in
// 1..tt_oname_maxrank via rnd() semantics, walk down the list, and wrap to
// rank 1 if the list ran out.  rng here acts like C's rnd(N): 1..N.
export function getRndToptenEntry(rng, { maxRank = TT_ONAME_MAXRANK } = {}) {
    let rank = rng(maxRank) | 0;
    if (rank < 1) rank = 1;
    const entries = loadToptenList();
    if (!entries.length) return null;
    if (rank > entries.length) rank = 1;
    return entries[rank - 1] || null;
}

// C ref: score_wanted() (topten.c:1051-1080) — whether a record entry
// matches a prscore selection; provided for completeness/test parity even
// though the browser port has no `-s` CLI.
export function scoreWanted({ currentVer = true, rank, entry, players = [],
                              uid = -1 } = {}) {
    if (players.length === 0 && uid !== -1 && entry.uid === uid) return true;
    for (let i = 0; i < players.length; i++) {
        let arg = players[i];
        if (arg.startsWith('-u') && arg.length > 2) arg = arg.slice(2);
        if (arg === 'all'
            || entry.name?.startsWith(arg)
            || (arg.length === 2 && arg[0] === '-' && arg[1] === entry.role?.[0])
            || (/^\d+$/.test(arg) && rank <= parseInt(arg, 10))) return true;
    }
    return false;
}
