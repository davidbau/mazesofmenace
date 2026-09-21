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
import { rn2 } from './rng.js';
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

/** C ref: dat/quest.lua goal_first (Arc + Bar + Pri + Kni + Sam; output=text). */
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
    // C ref: dat/quest.lua Sam goal_first (output=text)
    Sam: `In your mind, you hear the taunts of %n.

You become like the rice plant and bend to the ground, offering a
prayer to %d.  But when the wind has passed, you stand
proudly again.  Putting your kami in the hands of fate, you advance.`,
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

/**
 * C ref: dat/quest.lua killed_nemesis (all 13 roles, raw lua text).
 * stinky_nemesis scans the hero role's entry for noxious/poisonous/toxic
 * plus " gas"/" fumes": only Arc, Cav and Pri match (questpgr.c comment).
 */
const QUEST_KILLED_NEMESIS = {
    Arc: `The body of %n dissipates in a cloud of noxious fumes.`,
    Bar: `%nC falls to the ground, and utters a last curse at you.  Then %nj
body fades slowly, seemingly dispersing into the air around you.  You
slowly become aware that the overpowering aura of magic in the air has
begun to fade.`,
    Cav: `%nC sinks to the ground, her heads flailing about.
As she dies, a cloud of noxious fumes billows about her.`,
    Hea: `The battered body of %n slumps to the ground and gasps
out one last curse:

    "You have defeated me, %p, but I shall have my revenge.
    How, I shall not say, but this curse shall be like a cancer
    on you."

With that %n dies.`,
    Kni: `As %n sinks to the ground, blood gushing from %nj open mouth, %nh
defiantly curses you and %l:

    "Thou hast not won yet, %r.  By the gods, I shall return
    and dog thy steps to the grave!"

%nJ tail flailing madly, %n tries to crawl towards you, but slumps
to the ground and dies in a pool of %nj own blood.`,
    Mon: `%nC gasps:

    "You have only defeated this mortal body.  Know this: my spirit
    is strong.  I shall return and reclaim what is mine!"

With that, %n expires.`,
    Pri: `You feel a wrenching shift in the ether as %ns body dissolves
into a cloud of noxious gas.

Suddenly, a voice booms out:

    "Thou hast defeated the least of my minions, %r.
    Know now that Moloch is aware of thy presence.
    As for thee, %n, I shall deal with thy failure
    at my leisure."

You then hear the voice of %n, screaming in terror...`,
    Ran: `%nC collapses to the ground, cursing you and %l, then says:

    "You have defeated me, %r!  But I curse you one final time, with
    my dying breath!  You shall die before you leave my castle!"`,
    Rog: `"I know what you are thinking, %p.  It is not too late for you
to use %o wisely.  For the sake of your guild
%sp, do what is right."

You sit and wait for death to come for %n, and then you
brace yourself for your next meeting with %l!`,
    Sam: `Your healing skills tell you that %ns wounds are mortal.

You know that the bushido tells you to finish him and let his kami
die with honor, but the thought of so many samurai dead due to this
man's dishonor prevents you from giving the final blow.

You order that his unwashed head be given to the crows and his body
thrown into the sea.`,
    Tou: `You turn in the direction of %n.  As his earthly body begins
to vanish before your eyes, you hear him curse:

    "You shall never be rid of me, %p!
    I will find you where ever you go and regain what is rightly mine."`,
    Val: `A look of surprise and horror appears on %ns face.

    "No!!!  %o has lied to me!  I have been misled!"

Suddenly, %n grasps his head and screams in agony, then dies.`,
    Wiz: `%nC, whose body begins to shrivel up, croaks out:

    "I shall haunt your progress until the end of time.  A thousand
    curses on you and %l."

Then, the body bursts into a cloud of choking dust, and blows away.`,
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
        Sam: {
            output: 'text',
            synopsis: '[You feel the taunts %n, but after offering a prayer to %d, you proceed.]',
        },
    },
    killed_nemesis: {
        Bar: {
            output: 'text',
            synopsis: '[%nC curses you, but you feel the overpowering aura of magic fading.]',
        },
        Hea: {
            output: 'text',
            synopsis: '[%nC curses you as %nh dies.]',
        },
        Kni: {
            output: 'text',
            synopsis: '[%nC curses you as %nh dies.]',
        },
        Mon: {
            output: 'text',
            synopsis: '[As %n dies, %nh threatens to return.]',
        },
        Pri: {
            output: 'text',
            synopsis: '[%nC dies.  Moloch is aware of you and angry at %n.]',
        },
        Ran: {
            output: 'text',
            synopsis: '[%nC curses you as %nh dies.]',
        },
        Rog: {
            output: 'text',
            synopsis: '[Before dying, %n tells you to use the %o wisely.]',
        },
        Sam: {
            output: 'text',
            synopsis: '[%nC dies without honor.]',
        },
        Tou: {
            output: 'text',
            synopsis: '[%nC curses at you as %nh dies.]',
        },
        Val: {
            output: 'text',
            synopsis: '[%nC dies.]',
        },
        Wiz: {
            output: 'text',
            synopsis: '[%nC curses you as %nh dies.]',
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
    killed_nemesis: QUEST_KILLED_NEMESIS,
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

/** C ref: quest.lua common text-form entries (quest_portal output=pline
 * comes from lua now, not a JS special case; banished :92-104). */
const QUEST_COMMON = {
    quest_portal: {
        output: 'pline',
        text: `You receive a faint telepathic message from %l:
Your help is urgently needed at %H!
Look for a ...ic transporter.
You couldn't quite make out that last message.`,
    },
    quest_portal_again: 'You again sense %l pleading for help.',
    quest_portal_demand: 'You again sense %l demanding your attendance.',
    quest_complete_no_bell: `"The silver bell which was hoarded by %n will be
essential in locating the Amulet of Yendor."`,
    banished: {
        output: 'text',
        synopsis: '[You are banished from %H for betraying your allegiance to %d.]',
        text: `"You have betrayed all those who hold allegiance to %d, as you once did.
My allegiance to %d holds fast and I cannot condone or accept what you
have done.

Leave this place.  You shall never set foot at %H again.
That which you seek is now lost forever, for without the Bell of Opening,
you will never be able to enter the place where he who has the Amulet
resides.

Go now!  You are banished from this place.]`,
    },
};

/**
 * C ref: dat/quest.lua:76-90 angel_cuss (14 strings) + :106-133 demon_cuss
 * (27 strings) — array-form common entries with no text/synopsis/output
 * keys. C com_pager_core :543/:552-568 picks lua[rn2(nelems)+1]; output
 * stays default, synopsis stays null. Callers: wizard.c cuss_scroll
 * :873/:880 via com_pager.
 */
const QUEST_CUSS_ARRAYS = {
    angel_cuss: [
        "\"Repent, and thou shalt be saved!\"",
        "\"Thou shalt pay for thine insolence!\"",
        "\"Very soon, my child, thou shalt meet thy maker.\"",
        "\"The great %D has sent me to make you pay for your sins!\"",
        "\"The wrath of %D is now upon you!\"",
        "\"Thy life belongs to %D now!\"",
        "\"Dost thou wish to receive thy final blessing?\"",
        "\"Thou art but a godless void.\"",
        "\"Thou art not worthy to seek the Amulet.\"",
        "\"No one expects the Spanish Inquisition!\"",
        "\"Judgment hath been passed upon thee, %p.\"",
        "\"Thy reckoning is at hand, %p.\"",
        "\"Thou shalt be brought before %D for thy crimes!\"",
        "\"With %D as my witness, I shall strike thee down.\"",
    ],
    demon_cuss: [
        "\"I first mistook thee for a statue, when I regarded thy head of stone.\"",
        "\"Come here often?\"",
        "\"Doth pain excite thee?  Wouldst thou prefer the whip?\"",
        "\"Thinkest thou it shall tickle as I rip out thy lungs?\"",
        "\"Eat slime and die!\"",
        "\"Go ahead, fetch thy mama!  I shall wait.\"",
        "\"Go play leapfrog with a herd of unicorns!\"",
        "\"Hast thou been drinking, or art thou always so clumsy?\"",
        "\"This time I shall let thee off with a spanking, but let it not happen again.\"",
        "\"I've met smarter (and prettier) acid blobs.\"",
        "\"Look!  Thy bootlace is undone!\"",
        "\"Mercy!  Dost thou wish me to die of laughter?\"",
        "\"Run away!  Live to flee another day!\"",
        "\"Thou hadst best fight better than thou canst dress!\"",
        "\"Twixt thy cousin and thee, Medusa is the prettier.\"",
        "\"Methinks thou wert unnaturally stirred by yon corpse back there, eh, varlet?\"",
        "\"Up thy nose with a rubber hose!\"",
        "\"Verily, thy corpse could not smell worse!\"",
        "\"Wait!  I shall polymorph into a grid bug to give thee a fighting chance!\"",
        "\"Why search for the Amulet?  Thou wouldst but lose it, cretin.\"",
        "\"Thou ought to be a comedian, thy skills are so laughable!\"",
        "\"Thy gaze is so vacant, I thought thee a floating eye!\"",
        "\"Thy head is unfit for a mind flayer to munch upon!\"",
        "\"Only thy reflection could love thee!\"",
        "\"Hast thou considered masking thine odour?\"",
        "\"Hold! Thy face is a most exquisite torture!\"",
        "\"I should fart in thy direction, but it might improve thy smell!\"",
    ],
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
        // C :517-541 entry table; array-form entries (no "text" key) carry
        // text:null until the :552-568 rn2 arm resolves them.
        const arr = QUEST_CUSS_ARRAYS[msgid];
        if (arr) return { text: null, synopsis: null, output: 'default', array: arr };
        const raw = QUEST_COMMON[msgid];
        if (raw == null) return null;
        if (typeof raw === 'object') {
            return {
                text: raw.text ?? null,
                synopsis: raw.synopsis ?? null,
                output: raw.output ?? 'default',
            };
        }
        return { text: raw, synopsis: null, output: 'default' };
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
 * C ref: questpgr.c com_pager_core `:468–621`, in C order.
 * skip_pager gate; nhl_init shuffle; questtext/section/entry lookup with
 * msg_fallbacks tryagain; rawtext arm; synopsis/output options; array
 * rn2 arm; default+newline/long promote-to-window with synthesized
 * synopsis; pline/window delivery; convert_line(synopsis) +
 * putmsghistory(FALSE) for ^P recall; compagerdone frees (GC in JS).
 *
 * Named omissions: lua VM init/load/malformed-table impossible() text —
 * tables are embedded constants so load cannot fail, and a JS miss also
 * covers unported role bodies (map-named) where C shows text and never
 * calls impossible(), so misses stay silent-FALSE; NHW_MENU except legacy
 * (legacy/pauper_legacy own com_pager_legacy); TEST_PATTERN (lua self-test
 * only); other-role bodies; convert_arg catalogue is D-1649;
 * convert_line pronoun %Xh is D-1634. qt_pager common retry is D-1662.
 * Lua helpers with no JS counterpart: nhl_init/nhl_loadlua/nhl_done
 * (no VM — embedded tables), get_table_str_opt/get_table_option
 * (the lookup above), dupstr (string assign).
 *
 * @param {string} section role filecode or "common"
 * @param {string} msgid
 * @param {boolean} showerror C impossible() on miss — named omit (see above)
 * @param {{ text?: string }|null} rawOut C char **rawtext; stinky_nemesis
 */
async function com_pager_core(section, msgid, showerror, rawOut) {
    // C :484 — skip_pager(TRUE) gate (WIZKIT suppresses plot pager).
    if (skip_pager(true)) return false;

    // C :487-497 — nhl_init (+nhlib align shuffle) and QTEXT_FILE load;
    // :501-514 questtext + section tables. Embedded tables cannot fail to
    // init/load (nhl_nhlib_align_shuffle covers the shuffle half).
    nhl_nhlib_align_shuffle();

    // C :517-541 — entry table with msg_fallbacks tryagain (lua has only
    // goal_alt→goal_next; inside lookup_quest_entry). Miss → impossible()
    // when showerror, then compagerdone FALSE (silent here — see doc).
    const entry = lookup_quest_entry(section, msgid, false);
    if (!entry) {
        void showerror;
        return false;
    }

    // C :543 — text field (null for array-form entries).
    let text = entry.text ?? null;
    // C :544-548 — rawtext arm BEFORE the array arm: dupstr(text) with no
    // display, res TRUE even when text is null.
    if (rawOut) {
        rawOut.text = text;
        return true;
    }

    // C :549-550 — synopsis + output ("default" → 0) options.
    let synopsis = entry.synopsis ?? null;
    let output = howtoput2i(entry.output);

    // C :552-568 — no text: entry is an array of strings; nelems<2 is
    // impossible()+done, else text = array[rn2(nelems)+1] (lua 1-based;
    // JS 0-based picks the same element with one rn2).
    if (!text) {
        const arr = entry.array ?? null;
        const nelems = arr ? arr.length : 0;
        if (nelems < 2) {
            void showerror;
            return false;
        }
        text = arr[rn2(nelems)];
    }

    // C :570-590 — output==0 default with a newline or BUFSZ-1 length
    // promotes to window (2), synthesizing "[text]" with newlines→spaces
    // when lua has no synopsis (C FIXME comment kept in the helper).
    if (output === 0 && (text.includes('\n') || text.length >= BUFSZ - 1)) {
        output = 2;
        if (!synopsis) synopsis = synthesize_window_synopsis(text);
    }

    // C :592-595 — 0/1 pline, else window (3 → NHW_MENU; named omit —
    // deliver_by_window shows text pages, menu lives in com_pager_legacy).
    if (output === 0 || output === 1) {
        await deliver_by_pline(text);
    } else {
        await deliver_by_window(text, output);
    }

    // C :597-610 — synopsis via convert_line + putmsghistory(FALSE) for ^P
    // recall (C #else arm: Strcpy, no added brackets); res TRUE, compagerdone
    // frees + nhl_done (GC + nothing to tear down in JS).
    if (synopsis) {
        putmsghistory(convert_line(synopsis), false);
    }
    return true;
}

/**
 * C ref: questpgr.c stinky_nemesis `:148–194` — does the dead nemesis's
 * kill text describe a noxious/poisonous/toxic gas or fumes? C reads the
 * hero's own role text (gu.urole.filecode, no common retry) via the
 * com_pager_core rawtext arm — which returns the text with no display —
 * flattens newlines to spaces (strNsubst, count 0 = all), then
 * case-insensitively (strstri) matches one of noxious/poisonous/toxic
 * with a later " gas"/" fumes". Only Arc, Cav and Pri texts match.
 * Caller: mon.c m_detach MS_NEMESIS arm (via js/mhitm.js).
 *
 * @param {object} mtmp C monst (nhUse: the gas depends on the shown text)
 * @returns {Promise<number>} 1 when the nemesis leaves a gas cloud, else 0
 */
export async function stinky_nemesis(mtmp) {
    void mtmp;
    const rawOut = {};
    await com_pager_core(game.urole?.filecode || 'Tou', 'killed_nemesis', false, rawOut);
    const mesg = rawOut.text || null;
    if (!mesg) return 0;
    const flat = String(mesg).split('\n').join(' ');
    const p = strstri(flat, 'noxious')
        || strstri(flat, 'poisonous')
        || strstri(flat, 'toxic');
    if (!p) return 0;
    return (strstri(p, ' gas') || strstri(p, ' fumes')) ? 1 : 0;
}

/**
 * C ref: questpgr.c com_pager(msgid) → com_pager_core("common", …).
 * portal/again/demand/no_bell/banished/cuss arrays live; TEST_PATTERN
 * (lua self-test) + menu output (legacy path) still named.
 */
export async function com_pager(msgid) {
    await com_pager_core('common', msgid, true, null);
}

/**
 * C ref: questpgr.c qt_pager `:629–634`.
 * com_pager_core(filecode, msgid, FALSE) then, on miss,
 * com_pager_core("common", msgid, TRUE). Each core runs nhl_init
 * (second shuffle is C). pauper_legacy still named (legacy path).
 */
export async function qt_pager(msgid) {
    const code = game.urole?.filecode || 'Tou';
    if (!await com_pager_core(code, msgid, false, null)) {
        await com_pager_core('common', msgid, true, null);
    }
}
