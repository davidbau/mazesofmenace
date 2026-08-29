// questpgr.js — Quest / legacy pager text.
// C ref: questpgr.c com_pager_core / com_pager / deliver_by_window (NHW_MENU);
//        pray.c align_gname / align_gtitle; win/tty/wintty.c menu offx.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    docrt, flush_screen, flush_topl_more, pline, putmsghistory,
    status_line_2,
} from './display.js';
import { NO_COLOR } from './terminal.js';
import { align_gname, align_gtitle, align_str, rank_of, genders } from './roles.js';
import { highc, strstri } from './hacklib.js';
import { artiname } from './artifact.js';
import {
    A_NEUTRAL, A_LAWFUL, MIN_QUEST_LEVEL, BUFSZ,
} from './const.js';
import {
    A_INT, A_WIS, A_DEX, A_CON, A_CHA, acurr, get_strength_str,
} from './attrib.js';
import { nhl_nhlib_align_shuffle } from './dungeon.js';
import { show_text_pages } from './pager.js';
import { mons, M2_PNAME } from './monsters.js';
import { NON_PM, pmnames } from './generated/monsters_data.js';
import { an, An, the, makeplural, makesingular } from './objnam.js';

/**
 * C ref: quest.lua common.legacy + convert_arg %d/%G/%r.
 * Layout: wintty.c H2344_BROKEN NHW_MENU offx.
 * Returns unpadded raw lines + geometry; caller paints corner vs fullscreen.
 */
function legacy_lines() {
    const urole = game.urole || {};
    const female = !!game.flags?.female;
    // C: align_gname(u.ualignbase[A_ORIGINAL])
    const aOrig = game.u?.ualignbase?.original ?? game.u?.ualign?.type ?? A_NEUTRAL;
    const deity = align_gname(urole, aOrig);
    const gtitle = align_gtitle(urole, aOrig);
    // C questpgr.c convert_arg %r → rank_of(u.ulevel, Role_switch, female)
    const rank = rank_of(
        game.u?.ulevel | 0,
        urole.mnum,
        female,
    );

    // Raw lines as after convert_line (lua paragraph indent is 4 spaces).
    // C dmore() appends --More--; include as final row for tty cursor match.
    const raw = [
        `It is written in the Book of ${deity}:`,
        '',
        '    After the Creation, the cruel god Moloch rebelled',
        '    against the authority of Marduk the Creator.',
        '    Moloch stole from Marduk the most powerful of all',
        '    the artifacts of the gods, the Amulet of Yendor,',
        '    and he hid it in the dark cavities of Gehennom, the',
        '    Under World, where he now lurks, and bides his time.',
        '',
        `Your ${gtitle} ${deity} seeks to possess the Amulet, and with it`,
        'to gain deserved ascendance over the other gods.',
        '',
        `You, a newly trained ${rank}, have been heralded`,
        `from birth as the instrument of ${deity}.  You are destined`,
        'to recover the Amulet for your deity, or die in the',
        'attempt.  Your hour of destiny has come.  For the sake',
        `of us all:  Go bravely with ${deity}!`,
        '--More--',
    ];

    // C ref: wintty.c tty_putstr NHW_MENU — n0 = strlen(str)+1 → maxcol;
    //        tty_display_nhwindow with #define H2344_BROKEN (always on in
    //        upstream wintty.c): offx = min(min(82, cols/2), cols-maxcol-1).
    //        Fullscreen only when maxrow>=rows || !menu_overlay — NOT offx==10.
    const cols = 80;
    const rows = 24;
    let maxcol = 0;
    for (const line of raw) {
        if (line === '--More--') continue; // C: dmore, not putstr
        const n0 = line.length + 1;
        if (n0 > maxcol) maxcol = n0;
    }
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const maxrow = raw.length;
    if (maxrow >= rows || game.flags?.menu_overlay === false) offx = 0;
    const moreRow = raw.length - 1;
    // C: NHW_MENU dmore — leading pad at offx, --More-- at offx+1, cursor past it
    const moreCol = offx + 1 + '--More--'.length;
    return { raw, offx, moreRow, moreCol };
}

function write_status_to_grid(disp, statusSnap = null) {
    let s1, s2;
    if (statusSnap && statusSnap.length >= 2) {
        [s1, s2] = statusSnap;
    } else {
        const u = game.u || {};
        let name = game.plname || 'Hero';
        if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
            name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
        }
        const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
        const title = `${name} the ${role}`;
        // C ref: botl.c do_statusline1 — get_strength_str + ACURR
        const stats = u.acurr?.a
            ? `St:${get_strength_str()} Dx:${acurr(A_DEX)} Co:${acurr(A_CON)} In:${acurr(A_INT)} Wi:${acurr(A_WIS)} Ch:${acurr(A_CHA)}`
            : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
        const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
        const gap = Math.max(1, 31 - title.length);
        const s1raw = gap > 4
            ? `${title}\x1b[${gap}C${stats} ${align}`
            : `${title}${' '.repeat(gap)}${stats} ${align}`;
        s1 = s1raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
        s2 = status_line_2();
    }
    for (let c = 0; c < Math.min(s1.length, disp.cols); c++)
        disp.setCell(c, 22, s1[c], NO_COLOR, 0);
    for (let c = 0; c < Math.min(s2.length, disp.cols); c++)
        disp.setCell(c, 23, s2[c], NO_COLOR, 0);
}

/**
 * C ref: questpgr.c com_pager("legacy") → deliver_by_window(NHW_MENU)
 *         → wintty process_text_window with corner offx.
 * Corner path (offx>0): do not term_clear_screen — map below text stays.
 * @param {string[]|null} statusSnap — pre-wear botl lines (C often stale)
 */
export async function com_pager_legacy(statusSnap = null) {
    const disp = game?.nhDisplay;
    if (!disp) return;

    const { raw, offx, moreRow, moreCol } = legacy_lines();
    game._pending_message = '';
    game._menu_overlay = true;

    if (offx === 0) {
        // Fullscreen: clear everything then paint padded text + status
        disp.clearScreen();
        for (let r = 0; r < raw.length && r < 21; r++) {
            const text = raw[r];
            for (let i = 0; i < text.length && i < disp.cols; i++)
                disp.setCell(i, r, text[i], NO_COLOR, 0);
        }
    } else {
        // C ref: wintty.c process_text_window — tty_curs(1,n)+cl_end from offx;
        // putchar(' ') then text; columns < offx and rows below keep the map.
        for (let r = 0; r < raw.length && r < 21; r++) {
            for (let c = offx; c < disp.cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
            const text = raw[r];
            // C: leading pad space at offx, text at offx+1
            disp.setCell(offx, r, ' ', NO_COLOR, 0);
            for (let i = 0; i < text.length && offx + 1 + i < disp.cols; i++)
                disp.setCell(offx + 1 + i, r, text[i], NO_COLOR, 0);
        }
    }

    write_status_to_grid(disp, statusSnap);
    // C tty places cursor past "--More--" on the more row (offx + 1 + len)
    disp.setCursor(moreCol, moreRow);
    await flush_screen(1);

    for (;;) {
        const c = await nhgetch();
        if (c === 27 || c === 32 || c === 13 || c === 10) break;
    }

    game._menu_overlay = false;
    await docrt();
    // C com_pager_core after deliver_by_window: convert_line(synopsis)
    // then putmsghistory(FALSE) — recall only, no redotoplin.
    putmsghistory(convert_line(QUEST_LEGACY_SYNOPSIS), false);
}

/**
 * C ref: dat/quest.lua firsttime texts (Arc/Bar/Pri/Wiz exercised).
 * Other roles burn nhl_init shuffle only until ported.
 */
const QUEST_FIRSTTIME = {
    // C ref: dat/quest.lua Arc firsttime (output=text)
    Arc: `You are suddenly in familiar surroundings.  The buildings in the distance
seem to be those of your old alma mater, but something is wrong.  It feels
as if there has been a riot recently, or %H has
been under siege.

All of the windows are boarded up, and there are objects scattered around
the entrance.

Strange forbidding shapes seem to be moving in the distance.`,
    Bar: `Warily you scan your surroundings, all of your senses alert for signs
of possible danger.  Off in the distance, you can %x the familiar shapes
of %H.

But why, you think, should %l be there?

Suddenly, the hairs on your neck stand on end as you detect the aura of
evil magic in the air.

Without thought, you ready your weapon, and mutter under your breath:

    "By %d, there will be blood spilt today."`,
    // C ref: dat/quest.lua Pri firsttime (output=text) — seed0367 @148
    Pri: `You find yourself standing in sight of %H.  Something
is obviously wrong here.  The doors to %H, which usually
stand open, are closed.  Strange human shapes shamble around
outside.

You realize that %l needs your assistance!`,
    // C ref: dat/quest.lua Wiz firsttime (output=text) — seed0360 @373
    Wiz: `You are suddenly in familiar surroundings.  You notice what appears to
be a large, squat stone structure nearby.  Wait!  That looks like the
tower of your former teacher, %l.

However, things are not the same as when you were last here.  Mists and
areas of unexplained darkness surround the tower.  There is movement in
the shadows.

Your teacher would never allow such unaesthetic forms to surround the
tower...  unless something were dreadfully wrong!`,
};

/** C ref: dat/quest.lua leader_first (Arc + Pri). */
const QUEST_LEADER_FIRST = {
    Arc: `"Finally you have returned, %p.  You were always
my most promising student.  Allow me to see if you are ready for the
most difficult task of your career."`,
    Pri: `"Ah, %p, my %S.  You have returned to us at last.
A great blow has befallen our order; perhaps you can help us.
First, however, I must determine if you are prepared for this
great challenge."`,
};

/** C ref: dat/quest.lua assignquest (Pri; Arc deferred). */
const QUEST_ASSIGNQUEST = {
    Pri: `"Yes, %p.  You are truly ready now.  Attend to me and I shall
tell you of what has transpired:

"At one of the Great Festivals a short time ago, %n and a legion
of undead invaded %H.  Many %gP were killed, including
the one carrying %o.

"As a final act of vengefulness, %n desecrated the altar here.
Without it, we could not mount a counter-attack.  Now, there are
barely enough %gP left to keep the undead at bay.

"We need you to find %i, then, from there, travel
to %ns lair.  If you can manage to defeat %n and return
%o here, we can then drive off the legions of
undead that befoul the land.

"Go with %d as your guide, %p."`,
};

/** C ref: dat/quest.lua badalign (Arc). */
const QUEST_BADALIGN = {
    Arc: `"%pC!  I've heard that you've been using sloppy techniques.  Your
results lately can hardly be called suitable for %ra!

"How could you have strayed from the %a path?  Go from here, and come
back only when you have purified yourself."`,
};

/** C ref: dat/quest.lua locate_first (Bar + Arc + Pri + Wiz exercised). */
const QUEST_LOCATE_FIRST = {
    Bar: `The scent of water comes to you in the desert breeze.  You know that
you have located %i.`,
    Arc: `A plain opens before you.  Beyond the plain lies a foreboding edifice.

You have the feeling that you will soon find the entrance to
%i.`,
    Pri: `You stand facing a large graveyard.  The sky above is filled with clouds
that seem to get thicker closer to the center.  You sense the presence of
undead in larger numbers than you have ever encountered before.

You remember the descriptions of %i, given to you by
%l.  It is ahead that you will find %ns trail.`,
    // C ref: dat/quest.lua Wiz locate_first (default pline) — seed0360 @780
    Wiz: `Wisps of fog swirl nearby.  You feel that %ns lair is close.`,
};

/** C ref: dat/quest.lua locate_next (Bar + Arc + Pri + Wiz). */
const QUEST_LOCATE_NEXT = {
    Bar: `Yet again you have a chance to infiltrate %i.`,
    Arc: `Once again, you are near the entrance to %i.`,
    Pri: `Again, you stand before %i.`,
    // C ref: dat/quest.lua Wiz locate_next
    Wiz: `You believe that you may once again invade %i.`,
};

/** C ref: dat/quest.lua nexttime (Arc + Bar + Pri). */
const QUEST_NEXTTIME = {
    Arc: `Once again, you are back at %H.`,
    Bar: `Once again, you near %H.  You know that %l
will be waiting.`,
    Pri: `Once again, you stand before %H.`,
};

/** C ref: dat/quest.lua othertime (Arc + Bar + Pri). */
const QUEST_OTHERTIME = {
    Arc: `You are back at %H.
You have an odd feeling this may be the last time you ever come here.`,
    Bar: `Again, and you think possibly for the last time, you approach
%H.`,
    Pri: `Again you face %H.  Your intuition hints that this may be
the final time you come here.`,
};

/** C ref: dat/quest.lua goal_first (Arc + Bar + Pri + Kni; output=text). */
const QUEST_GOAL_FIRST = {
    Arc: `A strange feeling washes over you, and you think back to things you
learned during the many lectures of %l.

You realize the feeling must be the presence of %o.`,
    Bar: `The hairs on the nape of your neck lift as you sense an energy in the
very air around you.  You fight down a primordial panic that seeks to
make you turn and run.  This is surely the lair of %n.`,
    // C ref: dat/quest.lua Pri goal_first (output=text) — seed0367 @209
    Pri: `The stench of brimstone is all about you, and the shrieks and moans
of tortured souls assault your psyche.

Ahead, there is a small clearing amidst the bubbling pits of lava...`,
    // C ref: dat/quest.lua Kni goal_first (output=text) — seed4500 @1799
    Kni: `As you exit the swamps, you %x before you a huge, gaping hole in the
side of a hill.  From within, you smell the foul stench of carrion.

The pools on either side of the entrance are fouled with blood, and
pieces of rusted metal and broken weapons show above the surface.`,
};

/** C ref: dat/quest.lua goal_next (Arc + Bar + Pri + Kni). */
const QUEST_GOAL_NEXT = {
    Arc: `The familiar presence of %o is in the ether.`,
    Bar: `Yet again you feel the air around you heavy with malevolent magical energy.`,
    Pri: `Again, you have invaded %ns domain.`,
    // C ref: dat/quest.lua Kni goal_next
    Kni: `Again, you stand at the entrance to %ns lair.`,
};

/** C ref: dat/quest.lua goal_alt (Arc; Bar falls back to goal_next in C). */
const QUEST_GOAL_ALT = {
    Arc: `You have returned to %ns lair.`,
};

/** C ref: quest.lua msg_fallbacks — used when the role table has no msgid. */
const QUEST_MSG_FALLBACKS = {
    goal_alt: 'goal_next',
};

/**
 * C ref: dat/quest.lua synopsis + output for live role/msgid bodies.
 * Pronoun %Xh/%ni/%oh/%dI via convert_line + qtext_pronoun (D-1634).
 */
const QUEST_MSG_META = {
    firsttime: {
        Arc: {
            output: 'text',
            synopsis: '[You arrive at %H, but all is not well.]',
        },
        Bar: {
            output: 'text',
            synopsis: '[You reach the vicinity of %H, but sense evil magic nearby.]',
        },
        Pri: {
            output: 'text',
            synopsis: '[You are at %H; the doors are closed.  %lC needs your help!]',
        },
        Wiz: {
            output: 'text',
            synopsis: '[You have arrived at %ls tower but something is very wrong.]',
        },
    },
    leader_first: {
        Arc: {
            output: 'text',
            synopsis: '["You have returned, %p, to a difficult task."]',
        },
        Pri: {
            output: 'text',
            synopsis: '[You have returned and we need your help.  Are you ready?]',
        },
    },
    assignquest: {
        Pri: {
            output: 'text',
            synopsis: '[%nC invaded %H and captured %o.  Defeat %ni and retrieve %oh.]',
        },
    },
    badalign: {
        Arc: {
            output: 'text',
            synopsis: '["%pC, you have strayed from the %a path.  Purify yourself!"]',
        },
    },
    locate_first: {
        Arc: {
            output: 'text',
            synopsis: '[This foreboding edifice must hide the entrance to %i.]',
        },
        Bar: {
            output: 'text',
            synopsis: '[You have located %i.]',
        },
        Pri: {
            output: 'text',
            synopsis: '[You have found %i.  The trail to %n lies ahead.]',
        },
    },
    goal_first: {
        Arc: {
            output: 'text',
            synopsis: '[This strange feeling must be the presence of %o.]',
        },
        Bar: {
            output: 'text',
            synopsis: '[This is surely the lair of %n.]',
        },
        Pri: {
            output: 'text',
            synopsis: '[The stench of brimstone surrounds you, the shrieks and moans are endless.]',
        },
        Kni: {
            output: 'text',
            synopsis: '[You %x the entrance to a cavern inside a hill.]',
        },
    },
};

/** C ref: dat/quest.lua common.legacy synopsis (output=menu). */
const QUEST_LEGACY_SYNOPSIS =
    '[%dC has chosen you to recover the Amulet of Yendor for %dI.]';

const QUEST_ROLE_TEXT = {
    firsttime: QUEST_FIRSTTIME,
    leader_first: QUEST_LEADER_FIRST,
    assignquest: QUEST_ASSIGNQUEST,
    badalign: QUEST_BADALIGN,
    locate_first: QUEST_LOCATE_FIRST,
    locate_next: QUEST_LOCATE_NEXT,
    nexttime: QUEST_NEXTTIME,
    othertime: QUEST_OTHERTIME,
    goal_first: QUEST_GOAL_FIRST,
    goal_next: QUEST_GOAL_NEXT,
    goal_alt: QUEST_GOAL_ALT,
};

/** C ref: questpgr.c ldrname */
export function ldrname() {
    const i = game.urole?.ldrnum ?? NON_PM;
    if (i === NON_PM || i == null) return '';
    const ptr = mons(i);
    const names = pmnames[i];
    const nm = names?.[2] || names?.[0] || names?.[1] || '';
    const pname = !!((ptr?.mflags2 ?? 0) & M2_PNAME);
    return pname ? nm : `the ${nm}`;
}

/** C ref: questpgr.c neminame — urole.neminum, proper-name vs "the <name>". */
function neminame() {
    const i = game.urole?.neminum ?? NON_PM;
    if (i === NON_PM || i == null) return '';
    const ptr = mons(i);
    const names = pmnames[i];
    const nm = names?.[2] || names?.[0] || names?.[1] || '';
    const pname = !!((ptr?.mflags2 ?? 0) & M2_PNAME);
    return pname ? nm : `the ${nm}`;
}

/** C ref: questpgr.c guardname — urole.guardnum neutral pmname. */
function guardname() {
    const i = game.urole?.guardnum ?? NON_PM;
    if (i === NON_PM || i == null) return '';
    const names = pmnames[i];
    return names?.[2] || names?.[0] || names?.[1] || '';
}

/** C ref: questpgr.c homebase — urole.homebase. */
function homebase() {
    return game.urole?.homebase || '';
}

/** C ref: questpgr.c intermed — urole.intermed. */
function intermed() {
    return game.urole?.intermed || '';
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix(s) {
    if (!s) return s;
    if (s === 'it') return 'its';
    if (s === 'you') return 'your';
    if (s.endsWith('s')) return `${s}'`;
    return `${s}'s`;
}

/**
 * C ref: questpgr.c convert_arg `:235–325` — fills gc.cvt_buf; JS returns it.
 * Caller convert_line (D-1634). ualignbase is a JS object (.original/.current),
 * not C ualignbase[A_ORIGINAL] index.
 */
function convert_arg(c) {
    const urole = game.urole || {};
    const u = game.u || {};
    const Blind = !!(u.Blind || u.HBlind || u.EBlind);
    const female = !!game.flags?.female;
    const aOrig = u.ualignbase?.original ?? u.ualign?.type ?? A_NEUTRAL;
    let str;
    switch (c) {
    case 'p':
        str = game.plname || '';
        break;
    case 'c':
        // C: (flags.female && gu.urole.name.f) ? name.f : name.m
        str = (female && urole.name?.f) ? urole.name.f : (urole.name?.m || '');
        break;
    case 'r':
        str = rank_of(u.ulevel | 0, urole.mnum, female);
        break;
    case 'R':
        str = rank_of(MIN_QUEST_LEVEL, urole.mnum, female);
        break;
    case 's':
        str = female ? 'sister' : 'brother';
        break;
    case 'S':
        str = female ? 'daughter' : 'son';
        break;
    case 'l':
        str = ldrname();
        break;
    case 'i':
        str = intermed();
        break;
    case 'O':
    case 'o': {
        // C: the(artiname(urole.questarti)); %O shortens "the Foo of Bar"
        const raw = artiname(urole.questarti | 0);
        str = raw ? the(raw) : '';
        if (c === 'O') {
            const p = strstri(str, ' of ');
            if (p) str = str.slice(0, str.length - p.length);
        }
        break;
    }
    case 'n':
        str = neminame();
        break;
    case 'g':
        str = guardname();
        break;
    case 'G':
        str = align_gtitle(urole, aOrig);
        break;
    case 'H':
        str = homebase();
        break;
    case 'a':
        str = align_str(aOrig);
        break;
    case 'A':
        str = align_str(u.ualign?.type ?? A_NEUTRAL);
        break;
    case 'd':
        str = align_gname(urole, aOrig);
        break;
    case 'D':
        str = align_gname(urole, A_LAWFUL);
        break;
    case 'C':
        str = 'chaotic';
        break;
    case 'N':
        str = 'neutral';
        break;
    case 'L':
        str = 'lawful';
        break;
    case 'x':
        str = Blind ? 'sense' : 'see';
        break;
    case 'Z':
        // C: svd.dungeons[0].dname
        str = game.dungeons?.[0]?.dname || '';
        break;
    case '%':
        str = '%';
        break;
    default:
        str = '';
        break;
    }
    return str;
}

/**
 * C ref: questpgr.c qtext_pronoun `:197–233`.
 * who is the convert_arg code ('d'/'l'/'n'/'o'; '%O' is not 'o').
 * which is h/H he, i/I him, j/J his. Overwrites convert_arg's name.
 */
function qtext_pronoun(who, which, cvt_buf) {
    const lwhich = which === which.toLowerCase() ? which : which.toLowerCase();
    let pnoun;
    const buf = cvt_buf == null ? '' : String(cvt_buf);
    // C: %o + "Eyes " or name ≠ makesingular → they/them/their
    if (who === 'o'
        && (strstri(buf, 'Eyes ')
            || buf.toLowerCase() !== String(makesingular(buf)).toLowerCase())) {
        pnoun = lwhich === 'h' ? 'they'
            : lwhich === 'i' ? 'them'
                : lwhich === 'j' ? 'their' : '?';
    } else {
        const qs = game.quest_status || {};
        const gend = who === 'd' ? (qs.godgend | 0)
            : who === 'l' ? (qs.ldrgend | 0)
                : who === 'n' ? (qs.nemgend | 0)
                    : 2;
        const g = genders[gend] || genders[2];
        pnoun = lwhich === 'h' ? g.he
            : lwhich === 'i' ? g.him
                : lwhich === 'j' ? g.his : '?';
    }
    if (lwhich !== which && pnoun) {
        pnoun = highc(pnoun.charAt(0)) + pnoun.slice(1);
    }
    return pnoun;
}

/**
 * C ref: questpgr.c convert_line `:327–420` — %X then optional modifier.
 * Covered: %Xa/%XA an/An; %XC capitalize; %Xh/%XH/%Xi/%XI/%Xj/%XJ
 * qtext_pronoun when X in dlno; %Xp/%XP plural; %Xs/%XS possessive;
 * %Xt strip leading "the ". convert_arg %c/%G/%A/%D/%C/%N/%L/%Z is D-1649.
 */
export function convert_line(inLine) {
    let out = '';
    const s = String(inLine ?? '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '\r' || ch === '\n') return out;
        if (ch === '%' && i + 1 < s.length) {
            const code = s[++i];
            let piece = convert_arg(code);
            if (i + 1 < s.length) {
                i++;
                const mod = s[i];
                if (mod === 'A') {
                    out += An(piece);
                    continue;
                }
                if (mod === 'a') {
                    out += an(piece);
                    continue;
                }
                if (mod === 'C') {
                    if (piece) piece = highc(piece.charAt(0)) + piece.slice(1);
                } else if (mod === 'h' || mod === 'H' || mod === 'i'
                    || mod === 'I' || mod === 'j' || mod === 'J') {
                    // C: strchr("dlno", lowc(*(c-1))); else --c
                    if ('dlno'.includes(code.toLowerCase())) {
                        piece = qtext_pronoun(code, mod, piece);
                    } else {
                        i--;
                    }
                } else if (mod === 'P' || mod === 'p') {
                    if (mod === 'P' && piece) {
                        piece = highc(piece.charAt(0)) + piece.slice(1);
                    }
                    piece = makeplural(piece);
                } else if (mod === 'S' || mod === 's') {
                    if (mod === 'S' && piece) {
                        piece = highc(piece.charAt(0)) + piece.slice(1);
                    }
                    piece = s_suffix(piece);
                } else if (mod === 't') {
                    if (/^the /i.test(piece)) {
                        out += piece.slice(4);
                        continue;
                    }
                } else {
                    i--;
                }
            }
            out += piece;
        } else {
            out += ch;
        }
    }
    return out;
}

/** C ref: quest.lua common.quest_portal* — leader telepathy at dungeon entrance. */
const QUEST_COMMON = {
    quest_portal: `You receive a faint telepathic message from %l:
Your help is urgently needed at %H!
Look for a ...ic transporter.
You couldn't quite make out that last message.`,
    quest_portal_again: 'You again sense %l pleading for help.',
    quest_portal_demand: 'You again sense %l demanding your attendance.',
    quest_complete_no_bell: `"The silver bell which was hoarded by %n will be
essential in locating the Amulet of Yendor."`,
};

/**
 * C ref: questpgr.c howtoput / howtoput2i — get_table_option default "default".
 * pline=1, window=2, text=2, menu=3, default=0.
 */
const HOWTOPUT = ['pline', 'window', 'text', 'menu', 'default'];
const HOWTOPUT2I = [1, 2, 2, 3, 0];

function howtoput2i(outputName) {
    const i = HOWTOPUT.indexOf(outputName || 'default');
    return HOWTOPUT2I[i < 0 ? HOWTOPUT.indexOf('default') : i] | 0;
}

/**
 * C ref: questpgr.c skip_pager — WIZKIT suppresses plot pager (arg unused).
 */
function skip_pager(_common) {
    return !!(game.program_state?.wizkit_wishing);
}

/**
 * C ref: questpgr.c com_pager_core lua lookup (embedded tables, not VM).
 * msg_fallbacks.goal_alt → goal_next when the role has no alt table.
 */
function lookup_quest_entry(section, msgid, fallbackTried) {
    if (section === 'common') {
        const raw = QUEST_COMMON[msgid];
        if (!raw) return null;
        return {
            text: raw,
            synopsis: null,
            output: msgid === 'quest_portal' ? 'pline' : 'default',
        };
    }
    const table = QUEST_ROLE_TEXT[msgid];
    const text = table?.[section];
    if (!text) {
        if (!fallbackTried) {
            const fb = QUEST_MSG_FALLBACKS[msgid];
            if (fb) return lookup_quest_entry(section, fb, true);
        }
        return null;
    }
    const meta = QUEST_MSG_META[msgid]?.[section] || {};
    return {
        text,
        synopsis: meta.synopsis || null,
        output: meta.output || 'default',
    };
}

/**
 * C ref: questpgr.c com_pager_core promote: Sprintf("[%.*s]", BUFSZ-1-2, text)
 * then strNsubst newline → space (count 0 = all).
 */
function synthesize_window_synopsis(text) {
    const inner = String(text).slice(0, BUFSZ - 1 - 2).split('\n').join(' ');
    return `[${inner}]`;
}

/**
 * C ref: questpgr.c deliver_by_pline — split on newline, convert_line each, pline.
 * Used when lua sets output="pline" (quest_portal), which must NOT promote
 * to NHW_TEXT despite embedded newlines.
 */
async function deliver_by_pline(raw) {
    if (!raw) return;
    for (const line of String(raw).split('\n')) {
        await pline(convert_line(line));
    }
}

/**
 * C ref: questpgr.c deliver_by_window — copynchars/convert_line per line,
 * putstr + display. Live path is NHW_TEXT; NHW_MENU is com_pager_legacy.
 */
async function deliver_by_window(raw, _how) {
    if (!raw) return;
    await flush_topl_more();
    const lines = String(raw).split('\n').map((line) => convert_line(line));
    await show_text_pages(lines);
}

/**
 * C ref: questpgr.c com_pager_core `:467–621`.
 * nhl_init shuffle, lookup text/synopsis/output, promote default+newline
 * to window (synthesize synopsis when lua has none), deliver, then
 * convert_line(synopsis) + putmsghistory(FALSE) for ^P recall.
 *
 * Named omissions: lua VM / msg_fallbacks beyond goal_alt; array rn2
 * (angel_cuss/demon_cuss); explicit single-line output=text; NHW_MENU
 * except legacy; other-role bodies; pauper_legacy; rawtext
 * killed_nemesis (stinky_nemesis). convert_arg catalogue is D-1649;
 * convert_line pronoun %Xh is D-1634. qt_pager common retry is D-1662.
 *
 * @param {string} section role filecode or "common"
 * @param {string} msgid
 * @param {boolean} showerror C impossible() on miss — named omit
 * @param {{ text?: string }|null} rawOut C char **rawtext; stinky_nemesis
 */
async function com_pager_core(section, msgid, showerror, rawOut) {
    if (skip_pager(true)) return false;

    // C: nhl_init → nhlib.lua shuffle(align) then load QTEXT_FILE
    nhl_nhlib_align_shuffle();

    const entry = lookup_quest_entry(section, msgid, false);
    const text = entry?.text || null;
    if (!text) {
        // C: impossible() when showerror; miss returns FALSE (qt_pager
        // then retries section "common", which nhl_init's again).
        void showerror;
        return false;
    }
    if (rawOut) {
        rawOut.text = text;
        return true;
    }

    let synopsis = entry.synopsis || null;
    let output = howtoput2i(entry.output);

    if (output === 0 && (text.includes('\n') || text.length >= BUFSZ - 1)) {
        output = 2;
        if (!synopsis) synopsis = synthesize_window_synopsis(text);
    }

    if (output === 0 || output === 1) {
        await deliver_by_pline(text);
    } else {
        // output==3 NHW_MENU named omit here (legacy uses com_pager_legacy)
        await deliver_by_window(text, output);
    }

    if (synopsis) {
        putmsghistory(convert_line(synopsis), false);
    }
    return true;
}

/**
 * C ref: questpgr.c com_pager(msgid) → com_pager_core("common", …).
 * Named omissions: other common msgids (portal again/demand live;
 * quest_complete_no_bell D-1312); menu output; array rn2 picks.
 */
export async function com_pager(msgid) {
    await com_pager_core('common', msgid, true, null);
}

/**
 * C ref: questpgr.c qt_pager `:629–634`.
 * com_pager_core(filecode, msgid, FALSE) then, on miss,
 * com_pager_core("common", msgid, TRUE). Each core runs nhl_init
 * (second shuffle is C). Array rn2 / pauper_legacy / killed_nemesis
 * rawtext still named.
 */
export async function qt_pager(msgid) {
    const code = game.urole?.filecode || 'Tou';
    if (!await com_pager_core(code, msgid, false, null)) {
        await com_pager_core('common', msgid, true, null);
    }
}
