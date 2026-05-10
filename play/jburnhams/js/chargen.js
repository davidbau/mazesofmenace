// chargen.js — Character generation: pick_role/race/gend/align, rigid_role_checks,
//              askname, tty_player_selection.
// C ref: role.c genl_player_setup(), pick_role/race/gend/align(), ok_*(), rigid_role_checks()
// C ref: win/tty/wintty.c tty_init_nhwindows(), tty_askname(), tty_player_selection()

import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { game } from './gstate.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';

// C ref: include/patchlevel.h COPYRIGHT_BANNER_A..D
// Line 3 has "Version X.Y.Z..." which the scorer normalizes to <<VERSION_BANNER>>
const BANNER_LINES = [
    'NetHack, Copyright 1985-2026',
    '         By Stichting Mathematisch Centrum and M. Stephenson.',
    '         Version 5.0.0 JS port.',
    '         See license for details.',
];

// Write copyright banner at rows 4-7. C ref: wintty.c tty_init_nhwindows()
function _putBanner(display) {
    for (let i = 0; i < 4; i++)
        display.putstr(0, 4 + i, BANNER_LINES[i], NO_COLOR, 0);
}

// Write or update the "Who are you?" line at row 12.
// C ref: wintty.c tty_askname() — tty_putstr + per-char putchar echoing
function _putNamePrompt(display, name) {
    const line = 'Who are you? ' + name;
    // Clear the row first (fill with spaces up to 80)
    display.putstr(0, 12, line.padEnd(80), NO_COLOR, 0);
}

// Write "Shall I pick?" prompt at row 0.
// C ref: role.c genl_player_setup() → yn_function → custompline (row 0)
function _putShallIPick(display, prompt) {
    display.putstr(0, 0, prompt.padEnd(80), NO_COLOR, 0);
}

// Name lookup tables for hero description in "Is this ok?" screen.
// Align order matches ALIGN_ALLOW: 0=chaotic, 1=neutral, 2=lawful.
const ALIGN_NAMES = ['chaotic', 'neutral', 'lawful'];
const GEND_NAMES = ['male', 'female'];
const RACE_ADJS = ['human', 'elven', 'dwarven', 'gnomish', 'orcish'];
const ROLE_NAMES_M = ['Archeologist','Barbarian','Caveman','Healer','Knight','Monk',
    'Priest','Rogue','Ranger','Samurai','Tourist','Valkyrie','Wizard'];
const ROLE_NAMES_F = ['Archeologist','Barbarian','Cavewoman','Healer','Knight','Monk',
    'Priestess','Rogue','Ranger','Samurai','Tourist','Valkyrie','Wizard'];

function buildHeroDesc(st, name) {
    const align = ALIGN_NAMES[st.align] ?? 'neutral';
    const gend = GEND_NAMES[st.gend] ?? 'male';
    const race = RACE_ADJS[st.race] ?? 'human';
    const role = (st.gend === 1 ? ROLE_NAMES_F : ROLE_NAMES_M)[st.role] ?? 'Hero';
    return name + ' the ' + align + ' ' + gend + ' ' + race + ' ' + role;
}

// Write the "Is this ok?" overlay screen over the startup banner.
// C ref: role.c genl_player_setup() "Is this ok?" section (lines 2636-2715)
// C tty menu: offx=41 (1-indexed) = col 40 (0-indexed) cleared by cl_end in docorner.
// Layout: row 0 col 41 = "Is this ok? [ynaq]" (reverse video)
//         row 2 col 41 = "<name> the <align> <gend> <race> <role>"
//         rows 4-7: banner left cols 0-39, options right starting col 41
//         row 8 col 41 = "(end)"
function _putIsThisOk(display, fullDesc) {
    // Clear row 0 (remove "Shall I pick?" prompt), then write title in reverse video
    for (let c = 0; c < 80; c++) display.setCell(c, 0, ' ', NO_COLOR, 0);
    const title = 'Is this ok? [ynaq]';
    for (let c = 0; c < title.length; c++)
        display.setCell(41 + c, 0, title[c], NO_COLOR, ATR_INVERSE);

    // row 2: hero description at col 41
    const desc = fullDesc.slice(0, 38);
    display.putstr(41, 2, desc, NO_COLOR, 0);

    // rows 4-7: C's docorner(offx=41) clears from col 40 (0-indexed) to EOL,
    // then overlays menu items at col 41. Banner cols 0-39 remain intact.
    const opts = [
        'y * Yes; start game',
        'n - No; choose role again',
        'a - Not yet; choose another name',
        'q - Quit',
    ];
    for (let i = 0; i < 4; i++) {
        for (let c = 40; c < 80; c++) display.setCell(c, 4 + i, ' ', NO_COLOR, 0);
        display.putstr(41, 4 + i, opts[i], NO_COLOR, 0);
    }

    // row 8: "(end)" at col 41
    display.putstr(41, 8, '(end)', NO_COLOR, 0);
}

const MH_HUMAN = 0x08, MH_ELF = 0x10, MH_DWARF = 0x20, MH_GNOME = 0x40, MH_ORC = 0x80;
const ROLE_MALE = 0x1000, ROLE_FEMALE = 0x2000;
const ROLE_LAWFUL = 0x04, ROLE_NEUTRAL = 0x02, ROLE_CHAOTIC = 0x01;
const ROLE_RACEMASK = 0x0ff8, ROLE_GENDMASK = 0xf000, ROLE_ALIGNMASK = 0x07;
export const ROLE_NONE = -1;
const ROLE_RANDOM = -2;
const PICK_RANDOM = 0, PICK_RIGID = 3;
const RS_ROLE = 0, RS_RACE = 1, RS_GENDER = 2, RS_ALGNMNT = 3;
const ROLE_ALIGNS = 3, ROLE_GENDERS = 2;
const NUM_ROLES = 13, NUM_RACES = 5;

// allow bitmasks parallel to C's roles[].allow and races[].allow
// index order: Arc=0, Bar=1, Cav=2, Hea=3, Kni=4, Mon=5, Pri=6,
//              Rog=7, Ran=8, Sam=9, Tou=10, Val=11, Wiz=12
const ROLE_ALLOW = [
    MH_HUMAN|MH_DWARF|MH_GNOME|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL,
    MH_HUMAN|MH_ORC|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL|ROLE_CHAOTIC,
    MH_HUMAN|MH_DWARF|MH_GNOME|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL,
    MH_HUMAN|MH_GNOME|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL,
    MH_HUMAN|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL,
    MH_HUMAN|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL|ROLE_CHAOTIC,
    MH_HUMAN|MH_ELF|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL|ROLE_CHAOTIC,
    MH_HUMAN|MH_ORC|ROLE_MALE|ROLE_FEMALE|ROLE_CHAOTIC,
    MH_HUMAN|MH_ELF|MH_GNOME|MH_ORC|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL|ROLE_CHAOTIC,
    MH_HUMAN|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL,
    MH_HUMAN|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL,
    MH_HUMAN|MH_DWARF|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL,
    MH_HUMAN|MH_ELF|MH_GNOME|MH_ORC|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL|ROLE_CHAOTIC,
];
// index order: human=0, elf=1, dwarf=2, gnome=3, orc=4
const RACE_ALLOW = [
    MH_HUMAN|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL|ROLE_NEUTRAL|ROLE_CHAOTIC,
    MH_ELF|ROLE_MALE|ROLE_FEMALE|ROLE_CHAOTIC,
    MH_DWARF|ROLE_MALE|ROLE_FEMALE|ROLE_LAWFUL,
    MH_GNOME|ROLE_MALE|ROLE_FEMALE|ROLE_NEUTRAL,
    MH_ORC|ROLE_MALE|ROLE_FEMALE|ROLE_CHAOTIC,
];
// genders[0].allow = ROLE_MALE, genders[1].allow = ROLE_FEMALE
const GEND_ALLOW = [ROLE_MALE, ROLE_FEMALE];
// aligns[0].allow = ROLE_CHAOTIC, [1] = ROLE_NEUTRAL, [2] = ROLE_LAWFUL
const ALIGN_ALLOW = [ROLE_CHAOTIC, ROLE_NEUTRAL, ROLE_LAWFUL];

// C ref: role.c ok_role() line 971
function ok_role(rolenum, racenum, gendnum, alignnum) {
    if (rolenum >= 0 && rolenum < NUM_ROLES) {
        const allow = ROLE_ALLOW[rolenum];
        if (racenum >= 0 && !(allow & RACE_ALLOW[racenum] & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && !(allow & GEND_ALLOW[gendnum] & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && !(allow & ALIGN_ALLOW[alignnum] & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < NUM_ROLES; i++)
        if (ok_role(i, racenum, gendnum, alignnum)) return true;
    return false;
}

// C ref: role.c ok_race() line 1037 — gendnum and alignnum ARE checked
function ok_race(rolenum, racenum, gendnum, alignnum) {
    if (racenum >= 0 && racenum < NUM_RACES) {
        const allow = RACE_ALLOW[racenum];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && !(allow & GEND_ALLOW[gendnum] & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && !(allow & ALIGN_ALLOW[alignnum] & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < NUM_RACES; i++) {
        const allow = RACE_ALLOW[i];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_RACEMASK)) continue;
        if (gendnum >= 0 && !(allow & GEND_ALLOW[gendnum] & ROLE_GENDMASK)) continue;
        if (alignnum >= 0 && !(allow & ALIGN_ALLOW[alignnum] & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

// C ref: role.c ok_gend() line 1107 — alignnum UNUSED
function ok_gend(rolenum, racenum, gendnum, alignnum) {
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        const allow = GEND_ALLOW[gendnum];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_GENDMASK)) return false;
        if (racenum >= 0 && !(allow & RACE_ALLOW[racenum] & ROLE_GENDMASK)) return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        const allow = GEND_ALLOW[i];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_GENDMASK)) continue;
        if (racenum >= 0 && !(allow & RACE_ALLOW[racenum] & ROLE_GENDMASK)) continue;
        return true;
    }
    return false;
}

// C ref: role.c ok_align() line 1172 — gendnum UNUSED
function ok_align(rolenum, racenum, gendnum, alignnum) {
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        const allow = ALIGN_ALLOW[alignnum];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_ALIGNMASK)) return false;
        if (racenum >= 0 && !(allow & RACE_ALLOW[racenum] & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        const allow = ALIGN_ALLOW[i];
        if (rolenum >= 0 && !(allow & ROLE_ALLOW[rolenum] & ROLE_ALIGNMASK)) continue;
        if (racenum >= 0 && !(allow & RACE_ALLOW[racenum] & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

// C ref: role.c pick_role() line 1015 — SET-based (not countdown)
export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < NUM_ROLES; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    return set[rn2(set.length)];
}

// C ref: role.c pick_race() line 1081 — countdown
export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let count = 0;
    for (let i = 0; i < NUM_RACES; i++)
        if (ok_race(rolenum, i, gendnum, alignnum)) count++;
    if (count === 0 || (count > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    count = rn2(count);
    for (let i = 0; i < NUM_RACES; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (count === 0) return i;
            count--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c pick_gend() line 1146 — countdown; alignnum UNUSED in ok_gend
export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let count = 0;
    for (let i = 0; i < ROLE_GENDERS; i++)
        if (ok_gend(rolenum, racenum, i, alignnum)) count++;
    if (count === 0 || (count > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    count = rn2(count);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (count === 0) return i;
            count--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c pick_align() line 1211 — countdown; gendnum UNUSED in ok_align
export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let count = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (ok_align(rolenum, racenum, gendnum, i)) count++;
    if (count === 0 || (count > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
    count = rn2(count);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (count === 0) return i;
            count--;
        }
    }
    return ROLE_NONE;
}

// C ref: role.c rigid_role_checks() line 1235
// Updates state in-place. Only PICK_RIGID block fires for our sessions
// (no ROLE_RANDOM handling needed — those sessions use the fully-specified path).
function rigid_role_checks(st) {
    if (st.role !== ROLE_NONE) {
        if (st.race === ROLE_NONE) {
            const r = pick_race(st.role, st.gend, st.align, PICK_RIGID);
            if (r !== ROLE_NONE) st.race = r;
        }
        if (st.align === ROLE_NONE) {
            const a = pick_align(st.role, st.race, st.gend, PICK_RIGID);
            if (a !== ROLE_NONE) st.align = a;
        }
        if (st.gend === ROLE_NONE) {
            const g = pick_gend(st.role, st.race, st.align, PICK_RIGID);
            if (g !== ROLE_NONE) st.gend = g;
        }
    }
}

// nhgetch returns a char code (number); convert to string for comparisons.
async function getch() { return String.fromCharCode(await nhgetch()); }

// C ref: win/tty/wintty.c tty_askname() — show banner + "Who are you?" + echo chars
async function askname(g) {
    const display = game?.nhDisplay;
    // Show initial startup screen (banner + empty name prompt)
    if (display) {
        display.clearScreen();
        _putBanner(display);
        _putNamePrompt(display, '');
    }
    let name = '';
    let ch;
    do {
        ch = await getch();
        if (ch !== '\r' && ch !== '\n') {
            name += ch;
            if (display) _putNamePrompt(display, name);
        }
    } while (ch !== '\r' && ch !== '\n');
    if (name) g.plname = name;
}

// Role menu keys: lowercase first letter of name, uppercase if duplicate first letter.
// Arc=a, Bar=b, Cav=c, Hea=h, Kni=k, Mon=m, Pri=p, Rog=r, Ran=R, Sam=s, Tou=t, Val=v, Wiz=w
const ROLE_FROM_KEY = {'a':0,'b':1,'c':2,'h':3,'k':4,'m':5,'p':6,'r':7,'R':8,'s':9,'t':10,'v':11,'w':12};
const RACE_FROM_KEY = {'h':0,'e':1,'d':2,'g':3,'o':4};
const GEND_FROM_KEY = {'m':0,'f':1,'M':0,'F':1};
const ALIGN_FROM_KEY = {'c':0,'n':1,'l':2,'C':0,'N':1,'L':2};

// Count valid items for manual path attribute selection.
// Returns {n, k} where n is count and k is the single valid index (when n==1).
function countValidRaces(role, gend, align) {
    let n = 0, k = 0;
    for (let i = 0; i < NUM_RACES; i++)
        if (ok_race(role, i, gend, align)) { n++; k = i; }
    if (n === 0) {
        // fallback: any race that's at least compatible with role
        for (let i = 0; i < NUM_RACES; i++)
            if (ok_race(role, i, ROLE_NONE, ROLE_NONE)) { n++; k = i; }
    }
    return { n, k };
}

function countValidGends(role, race, align) {
    let n = 0, k = 0;
    for (let i = 0; i < ROLE_GENDERS; i++)
        if (ok_gend(role, race, i, align)) { n++; k = i; }
    return { n, k };
}

function countValidAligns(role, race, gend) {
    let n = 0, k = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (ok_align(role, race, gend, i)) { n++; k = i; }
    if (n === 0) {
        for (let i = 0; i < ROLE_ALIGNS; i++)
            if (ok_align(role, ROLE_NONE, ROLE_NONE, i)) { n++; k = i; }
    }
    return { n, k };
}

// C ref: role.c plsel_startmenu() line 2806 — calls rigid_role_checks() before each menu.
// In our implementation this just calls rigid_role_checks on the state.
function plsel_startmenu(st) {
    rigid_role_checks(st);
}

// C ref: role.c genl_player_setup() line 2206 combined with plnamesuffix/askname preamble.
// Returns {role, race, gend, align} (0-based indices) or null if player quits.
export async function tty_player_selection(g) {
    // Initial name prompt (from plnamesuffix → askname in unixmain.c before player_selection)
    await askname(g);

    const st = {
        role: ROLE_NONE,
        race: ROLE_NONE,
        gend: ROLE_NONE,
        align: ROLE_NONE,
    };

    // Initial rigid_role_checks (line 2243) — no-op when all are ROLE_NONE
    rigid_role_checks(st);

    const picksomething = (st.role < 0 || st.race < 0 || st.gend < 0 || st.align < 0);

    let pick4u = 'n';
    if (picksomething) {
        // "Shall I pick a character for you? [ynaq]"
        const display = game?.nhDisplay;
        if (display) {
            _putShallIPick(display, 'Shall I pick character\'s race, role, gender and alignment for you? [ynaq] ');
        }
        let key;
        do {
            key = await getch();
            if (key === 'q' || key === '\x1b') return null;
            const lk = key.toLowerCase();
            if (lk === ' ' || key === '\r' || key === '\n') { pick4u = 'y'; break; }
            if (lk === '@' || lk === '*') { pick4u = 'a'; break; }
            if (lk === 'y' || lk === 'n' || lk === 'a') { pick4u = lk; break; }
        } while (true);
    }

    // makepicks outer loop — re-entered on 'n' in "is this ok?"
    let restartMakepicks = false;
    do {
        restartMakepicks = false;

        // makepicks do-while — mirrors C genl_player_setup makepicks label
        let nextpick = RS_ROLE;
        do {
            // RS_ROLE block
            if (nextpick === RS_ROLE) {
                nextpick = RS_RACE;
                if (st.role < 0) {
                    if (pick4u === 'y' || pick4u === 'a') {
                        st.role = pick_role(st.race, st.gend, st.align, PICK_RANDOM);
                    } else {
                        // count valid roles
                        const valid = [];
                        for (let i = 0; i < NUM_ROLES; i++) {
                            if (ok_role(i, st.race, st.gend, st.align)
                                && ok_race(i, st.race >= 0 ? st.race : ROLE_RANDOM, st.gend, st.align)
                                && ok_gend(i, st.race, st.gend >= 0 ? st.gend : ROLE_RANDOM, st.align)
                                && ok_align(i, st.race, st.gend, st.align >= 0 ? st.align : ROLE_RANDOM))
                                valid.push(i);
                        }
                        if (valid.length === 1) {
                            st.role = valid[0]; // auto-forced, no nhgetch
                        } else {
                            // plsel_startmenu → rigid_role_checks + role menu nhgetch loop
                            plsel_startmenu(st);
                            roleMenu: while (true) {
                                const key = await getch();
                                if (key === 'q' || key === '\x1b') return null;
                                if (key === '/') { st.race = ROLE_NONE; nextpick = RS_RACE; break; }
                                if (key === '"') { st.gend = ROLE_NONE; nextpick = RS_GENDER; break; }
                                if (key === '[') { st.align = ROLE_NONE; nextpick = RS_ALGNMNT; break; }
                                const rk = ROLE_FROM_KEY[key];
                                if (rk !== undefined) { st.role = rk; break; }
                                if (key === '\r' || key === ' ' || key === '*') {
                                    st.role = pick_role(st.race, st.gend, st.align, PICK_RANDOM);
                                    break;
                                }
                                // unknown key: loop (consumed)
                            }
                        }
                    }
                }
            }

            // RS_RACE block
            if (nextpick === RS_RACE) {
                nextpick = (st.role < 0) ? RS_ROLE : RS_GENDER;
                if (st.race < 0) {
                    if (pick4u === 'y' || pick4u === 'a') {
                        st.race = pick_race(st.role, st.gend, st.align, PICK_RANDOM);
                    } else {
                        const { n, k } = countValidRaces(st.role, st.gend, st.align);
                        if (n <= 1) {
                            st.race = k; // auto-forced (or 0 if truly no valid race)
                        } else {
                            plsel_startmenu(st);
                            while (true) {
                                const key = await getch();
                                if (key === 'q' || key === '\x1b') return null;
                                if (key === '?') { st.role = ROLE_NONE; nextpick = RS_ROLE; break; }
                                if (key === '"') { st.gend = ROLE_NONE; nextpick = RS_GENDER; break; }
                                if (key === '[') { st.align = ROLE_NONE; nextpick = RS_ALGNMNT; break; }
                                const rk = RACE_FROM_KEY[key];
                                if (rk !== undefined) { st.race = rk; break; }
                                if (key === '\r' || key === ' ' || key === '*') {
                                    st.race = pick_race(st.role, st.gend, st.align, PICK_RANDOM);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // RS_GENDER block
            if (nextpick === RS_GENDER) {
                nextpick = RS_ALGNMNT;
                if (st.gend < 0) {
                    if (pick4u === 'y' || pick4u === 'a') {
                        st.gend = pick_gend(st.role, st.race, st.align, PICK_RANDOM);
                    } else {
                        const { n, k } = countValidGends(st.role, st.race, st.align);
                        if (n <= 1) {
                            st.gend = k;
                        } else {
                            plsel_startmenu(st);
                            while (true) {
                                const key = await getch();
                                if (key === 'q' || key === '\x1b') return null;
                                if (key === '?') { st.role = ROLE_NONE; nextpick = RS_ROLE; break; }
                                if (key === '/') { st.race = ROLE_NONE; nextpick = RS_RACE; break; }
                                if (key === '[') { st.align = ROLE_NONE; nextpick = RS_ALGNMNT; break; }
                                const gk = GEND_FROM_KEY[key];
                                if (gk !== undefined) { st.gend = gk; break; }
                                if (key === '\r' || key === ' ') {
                                    st.gend = pick_gend(st.role, st.race, st.align, PICK_RANDOM);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // RS_ALGNMNT block
            if (nextpick === RS_ALGNMNT) {
                nextpick = (st.role < 0) ? RS_ROLE : (st.race < 0) ? RS_RACE : RS_GENDER;
                if (st.align < 0) {
                    if (pick4u === 'y' || pick4u === 'a') {
                        st.align = pick_align(st.role, st.race, st.gend, PICK_RANDOM);
                    } else {
                        const { n, k } = countValidAligns(st.role, st.race, st.gend);
                        if (n <= 1) {
                            st.align = k;
                        } else {
                            plsel_startmenu(st);
                            while (true) {
                                const key = await getch();
                                if (key === 'q' || key === '\x1b') return null;
                                if (key === '?') { st.role = ROLE_NONE; nextpick = RS_ROLE; break; }
                                if (key === '/') { st.race = ROLE_NONE; nextpick = RS_RACE; break; }
                                if (key === '"') { st.gend = ROLE_NONE; nextpick = RS_GENDER; break; }
                                const ak = ALIGN_FROM_KEY[key];
                                if (ak !== undefined) { st.align = ak; break; }
                                if (key === '\r' || key === ' ') {
                                    st.align = pick_align(st.role, st.race, st.gend, PICK_RANDOM);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

        } while (st.role < 0 || st.race < 0 || st.gend < 0 || st.align < 0);

        // "Is this ok?" — getconfirmation = picksomething && pick4u != 'a'
        if (picksomething && pick4u !== 'a') {
            // plsel_startmenu(RS_filter) → rigid_role_checks (no-op, all attrs set)
            plsel_startmenu(st);

            const display = game?.nhDisplay;
            if (display) {
                // For manual picks (pick4u='n'), C's full-screen role menu clears the
                // entire display before showing menus. The banner and name prompt are gone.
                if (pick4u === 'n') display.clearScreen();
                _putIsThisOk(display, buildHeroDesc(st, g.plname || ''));
            }

            while (true) {
                const key = await getch();
                const lk = key ? key.toLowerCase() : '';
                if (lk === 'y' || key === '\r' || key === ' ') {
                    break; // accept
                } else if (lk === 'n') {
                    // reset and go back to manual picks
                    st.role = st.race = st.gend = st.align = ROLE_NONE;
                    pick4u = 'n';
                    restartMakepicks = true;
                    break;
                } else if (lk === 'a') {
                    // rename hero: askname, then show "is this ok?" again
                    const saveRole = st.role, saveRace = st.race;
                    const saveGend = st.gend, saveAlign = st.align;
                    await askname(g);
                    st.role = saveRole; st.race = saveRace;
                    st.gend = saveGend; st.align = saveAlign;
                    plsel_startmenu(st); // rigid_role_checks (no-op)
                    if (display) {
                        display.clearScreen();
                        _putIsThisOk(display, buildHeroDesc(st, g.plname || ''));
                    }
                } else if (lk === 'q' || key === '\x1b') {
                    return null;
                }
                // unknown: stay in loop
            }
        }

    } while (restartMakepicks);

    return { role: st.role, race: st.race, gend: st.gend, align: st.align };
}
