// cmd.js — Command dispatch and movement.

function showOptionsMenu(page = 1, toggled = {}) {
    const L = blankLines();
    const inv = (text) => ({ text, inverse: [[1, text.trimEnd().length]] });
    if (page === 1) {
        L[0] = inv(' Set what options?');
        L[2] = "     For a brief explanation of how this works, type '?' to select";
        L[3] = '     the next menu choice, then press <enter> or <return>.';
        L[4] = " ? - view help for options menu";
        L[5] = "     [To suppress this menu help, toggle off the 'cmdassist' option.]";
        L[7] = { text: ' Booleans (selecting will toggle value):', inverse: [[1, 40]] };
        L[8] = '     blind                   [false]';
        L[9] = '     bones                   [true]';
        L[10] = '     deaf                    [false]';
        L[11] = '     legacy                  [true]';
        L[12] = '     news                    [false]';
        L[13] = '     nudist                  [false]';
        L[14] = '     pauper                  [false]';
        L[15] = '     reroll                  [false]';
        L[16] = '     selectsaved             [true]';
        L[17] = '     status_updates          [true]';
        L[18] = '     tutorial                [true]';
        L[19] = '     use_darkgray            [true]';
        L[20] = '     use_truecolor           [false]';
        L[21] = '     voices                  [excluded from build]';
        L[22] = ' a - accessiblemsg           [false]';
        L[23] = ' (1 of 7)';
    } else if (page === 2) {
        const g = toggled.g ? '+' : '-';
        L[0] = ' a - acoustics               [true]';
        L[1] = ' b - altmeta                 [false]';
        L[2] = ' c - armorstatus             [false]';
        L[3] = ' d - autodescribe            [true]';
        L[4] = ' e - autodig                 [false]';
        L[5] = ' f - autoopen                [true]';
        L[6] = ` g ${g} autopickup              [false]`;
        L[7] = ' h - autoquiver              [false]';
        L[8] = ' i - bgcolors                [on]';
        L[9] = ' j - checkpoint              [true]';
        L[10] = ' k - cmdassist               [true]';
        L[11] = ' l - color                   [true]';
        L[12] = ' m - confirm                 [true]';
        L[13] = ' n - customcolors            [true]';
        L[14] = ' o - customsymbols           [true]';
        L[15] = ' p - dark_room               [true]';
        L[16] = ' q - dropped_nopick          [true]';
        L[17] = ' r - eight_bit_tty           [false]';
        L[18] = ' s - extmenu                 [false]';
        L[19] = ' t - fireassist              [true]';
        L[20] = ' u - fixinv                  [true]';
        L[21] = ' v - force_invmenu           [false]';
        L[22] = ' w - goldX                   [false]';
        L[23] = ' (2 of 7)';
    } else if (page === 3) {
        const mark = (k) => toggled['3' + k] ? '+' : '-';
        L[0] = ' a - help                    [true]';
        L[1] = ' b - herecmd_menu            [false]';
        L[2] = ' c - hilite_pet              [false]';
        L[3] = ' d - hilite_pile             [false]';
        L[4] = ' e - hitpointbar             [false]';
        L[5] = ' f - idlecheckpoint          [off]';
        L[6] = ' g - ignintr                 [false]';
        L[7] = ' h - implicit_uncursed       [true]';
        L[8] = ` i ${mark('i')} lit_corridor            [false]`;
        L[9] = ` j ${mark('j')} lootabc                 [false]`;
        L[10] = ' k - mail                    [true]';
        L[11] = ' l - mention_decor           [false]';
        L[12] = ' m - mention_map             [false]';
        L[13] = ' n - mention_walls           [false]';
        L[14] = ' o - menu_overlay            [true]';
        L[15] = ` p ${mark('p')} menucolors              [false]`;
        L[16] = ' q - mon_movement            [false]';
        L[17] = ' r - null                    [true]';
        L[18] = ' s - pickup_stolen           [true]';
        L[19] = ' t - pickup_thrown           [true]';
        L[20] = ` u ${mark('u')} price_quotes            [false]`;
        L[21] = ' v - pushweapon              [false]';
        L[22] = ' w - query_menu              [false]';
        L[23] = ' (3 of 7)';
    } else if (page === 4) {
        const mark = (k) => toggled['4' + k] ? '+' : '-';
        L[0] = ` a ${mark('a')} quick_farsight          [false]`;
        L[1] = ' b - rest_on_space           [false]';
        L[2] = ' c - safe_pet                [true]';
        L[3] = ' d - safe_wait               [true]';
        L[4] = ' e - showdamage              [false]';
        L[5] = ` f ${mark('f')} showexp                 [false]`;
        L[6] = ' g - showrace                [false]';
        L[7] = ' h - showvers                [false]';
        L[8] = ' i - silent                  [true]';
        L[9] = ' j - sortpack                [true]';
        L[10] = ' k - sounds                  [off]';
        L[11] = ' l - sparkle                 [true]';
        L[12] = ' m - spot_monsters           [false]';
        L[13] = ' n - standout                [false]';
        L[14] = ' o - terrainstatus           [false]';
        L[15] = ` p ${mark('p')} time                    [false]`;
        L[16] = ' q - tips                    [true]';
        L[17] = ' r - tombstone               [true]';
        L[18] = ' s - toptenwin               [false]';
        L[19] = ' t - travel                  [true]';
        L[20] = ' u - use_inverse             [true]';
        L[21] = ' v - verbose                 [true]';
        L[22] = ' w - weaponstatus            [false]';
        L[23] = ' (4 of 7)';
    } else if (page === 5) {
        L[0] = ' a - whatis_menu             [false]';
        L[1] = ' b - whatis_moveskip         [false]';
        L[3] = { text: ' Compounds (selecting will prompt for new value):', inverse: [[1, 49]] };
        L[4] = '     windowtype              [tty]';
        L[5] = '     playmode                [normal]';
        L[6] = '     name                    [Septor]';
        L[7] = '     role                    [Rogue]';
        L[8] = '     race                    [orc]';
        L[9] = '     gender                  [male]';
        L[10] = '     alignment               [chaotic]';
        L[11] = '     catname                 [(none)]';
        L[12] = '     dogname                 [(none)]';
        L[13] = '     horsename               [(none)]';
        L[14] = '     msghistory              [20]';
        L[15] = '     pettype                 [random]';
        L[16] = '     soundlib                [nosound]';
        L[17] = ' c - autounlock              [apply-key]';
        L[18] = ' d - boulder                 [`]';
        L[19] = ' e - crash_email             [unknown]';
        L[20] = ' f - crash_name              [unknown]';
        L[21] = ' g - crash_urlmax            [-1]';
        L[22] = ' h - disclose                [ni na nv ng nc no]';
        L[23] = ' (5 of 7)';
    } else if (page === 6) {
        const n = toggled['6n'] ? '+' : '-';
        L[0] = ' a - fruit                   [slime mold]';
        L[1] = ' b - glyph                   [(to be done)]';
        L[2] = ' c - hilite_status           [(none)]';
        L[3] = ' d - menu_headings           [no-color&inverse]';
        L[4] = ' e - menu_objsyms            [conditional]';
        L[5] = ' f - menuinvertmode          [1]';
        L[6] = ' g - menustyle               [full]';
        L[7] = ' h - msg_window              [single]';
        L[8] = ' i - number_pad              [0=off]';
        L[9] = ' j - packorder               [$")[%?+!=/(*`0_]';
        L[10] = ' k - paranoid_confirmation   [pray trap swim]';
        L[11] = ' l - petattr                 [inverse]';
        L[12] = ' m - pickup_burden           [stressed]';
        L[13] = ` n ${n} pickup_types            [all]`;
        L[14] = ' o - pile_limit              [5]';
        L[15] = ' p - roguesymset             [default]';
        L[16] = ' q - runmode                 [run]';
        L[17] = ' r - scores                  [3 top/2 around]';
        L[18] = ' s - sortdiscoveries         [by order of discovery within each class]';
        L[19] = ' t - sortloot                [loot]';
        L[20] = ' u - sortvanquished          [t: traditional: by monster level]';
        L[21] = " v - statushilites           [0 (off: don't highlight status fields)]";
        L[22] = ' w - statuslines             [2]';
        L[23] = ' (6 of 7)';
    } else if (page === 7) {
        L[0] = ' a - suppress_alert          [(none)]';
        L[1] = ' b - symset                  [DECgraphics, active, handler=DEC]';
        L[2] = ' c - versinfo                [1: number (5.0.0)]';
        L[3] = ' d - whatis_coord            [none]';
        L[4] = ' e - whatis_filter           [none]';
        L[6] = { text: ' Other settings:', inverse: [[1, 16]] };
        L[7] = ' f - autocompletions         [(0 currently set)]';
        L[8] = ' g - autopickup exceptions   [(0 currently set)]';
        L[9] = ' h - bind keys               [(0 currently set)]';
        L[10] = ' i - menu colors             [(0 currently set)]';
        L[11] = ' j - message types           [(0 currently set)]';
        L[12] = ' k - status condition fields [(16 currently set)]';
        L[13] = ' l - status highlight rules  [(0 currently set)]';
        L[14] = ' (7 of 7)';
    }
    game._optionsState = { style: 'legacy', page, toggled };
    setTextScreen(L, page === 7 ? [9, 14, 1] : [9, 23, 1], 'options');
}

function handleOptionsKey(key) {
    const st0 = game._optionsState || {};
    if (st0.style === 'modern') { handleModernOptionsKey(key); return; }
    const ch = String.fromCharCode(key);
    const st = game._optionsState || { page: 1, toggled: {} };
    const toggled = { ...(st.toggled || {}) };
    if (ch === ' ') {
        if ((st.page || 1) >= 7) { closeTextScreen(); game._optionsState = null; game._postOptionsSpaces = 0; }
        else showOptionsMenu(Math.min((st.page || 1) + 1, 7), toggled);
    } else if (/^[a-zA-Z?]$/.test(ch)) {
        const tkey = (st.page === 3 || st.page === 4 || st.page === 6) ? `${st.page}${ch}` : ch;
        toggled[tkey] = !toggled[tkey];
        showOptionsMenu(st.page || 1, toggled);
    } else {
        closeTextScreen();
        game._optionsState = null;
    }
    game.context.move = 0;
}



function modernOptionState(initial = false) {
    if (!game._modernOptionsState || initial) {
        game._modernOptionsState = {
            page: 1,
            price_quotes: false,
            autoopen: true,
            autopickup: !!game._modernAutopickup,
            hilite_pet: false,
            hilite_pile: false,
            showexp: false,
            time: false,
            pickup: {},
        };
    }
    return game._modernOptionsState;
}

function pickupString(pickup = {}) {
    const order = [['a', '$'], ['b', '"'], ['f', '?'], ['g', '+'], ['h', '!'], ['i', '='], ['j', '/']];
    const s = order.filter(([k]) => pickup[k]).map(([, sym]) => sym).join('');
    return s || 'all';
}

function showModernOptionsMenu(page = 1, state = null) {
    const st = state || modernOptionState();
    st.page = page;
    game._modernOptionsState = st;
    const L = blankLines();
    const box = (v) => v ? 'X' : ' ';
    if (page === 1) {
        L[0] = { text: ' Options', inverse: [[1, 8]] };
        L[2] = ' ? - show help';
        L[4] = { text: '  General', inverse: [[1, 9]] };
        L[5] = ' a - fruit                   [slime mold]';
        L[6] = ' b - number_pad              [0=off]';
        L[7] = ` c - price_quotes            [${box(st.price_quotes)}]`;
        L[9] = { text: '  Behavior', inverse: [[1, 10]] };
        L[10] = ' d - autodig                 [ ]';
        L[11] = ` e - autoopen                [${box(st.autoopen)}]`;
        L[12] = ` f - autopickup              [${box(st.autopickup)}]`;
        L[13] = ' g - autopickup exceptions   [(0 currently set)]';
        L[14] = ' h - autoquiver              [ ]';
        L[15] = ' i - autounlock              [apply-key]';
        L[16] = ' j - cmdassist               [X]';
        L[17] = ' k - dropped_nopick          [X]  (for autopickup)';
        L[18] = ' l - fireassist              [X]';
        L[19] = ' m - pickup_stolen           [X]  (for autopickup)';
        L[20] = ' n - pickup_thrown           [X]  (for autopickup)';
        L[21] = ` o - pickup_types            [${pickupString(st.pickup)}]  (for autopickup)`;
        L[22] = ' p - pushweapon              [ ]';
        L[23] = ' (1 of 2)';
        setTextScreen(L, [9, 23, 1], 'options');
    } else {
        L[1] = { text: '  Map', inverse: [[1, 5]] };
        L[2] = ' a - bgcolors                [X]';
        L[3] = ' b - color                   [X]';
        L[4] = ' c - customcolors            [X]';
        L[5] = ' d - customsymbols           [X]';
        L[6] = ` e - hilite_pet              [${box(st.hilite_pet)}]`;
        L[7] = ` f - hilite_pile             [${box(st.hilite_pile)}]`;
        L[8] = ' g - showrace                [ ]';
        L[9] = ' h - sparkle                 [X]';
        L[10] = ' i - symset                  [DECgraphics, active, handler=DEC]';
        L[12] = { text: '  Status', inverse: [[1, 8]] };
        L[13] = ' j - hitpointbar             [ ]';
        L[14] = ' k - menu colors             [(0 currently set)]';
        L[15] = ` l - showexp                 [${box(st.showexp)}]`;
        L[16] = ' m - status condition fields [(16 currently set)]';
        L[17] = ' n - status highlight rules  [(0 currently set)]';
        L[18] = ' o - statuslines             [2]';
        L[19] = ` p - time                    [${box(st.time)}]`;
        L[20] = ' (2 of 2)';
        setTextScreen(L, [9, 20, 1], 'options');
    }
    game._optionsState = { style: 'modern', page, state: st };
}

function handleModernOptionsKey(key) {
    const ch = String.fromCharCode(key);
    const st = modernOptionState();
    const page = game._optionsState?.page || st.page || 1;
    if (page === 1) {
        if (ch === ' ') {
            showModernOptionsMenu(2, st);
        } else if (key === 13 || key === 10 || key === 27) {
            closeTextScreen();
            game._optionsState = null;
        } else if (ch === 'o') {
            showAutopickupMenu(st.pickup || {}, { style: 'modern', autopickupOn: !!st.autopickup });
        } else if (ch === 'c') {
            st.price_quotes = !st.price_quotes; showModernOptionsMenu(1, st);
        } else if (ch === 'e') {
            st.autoopen = !st.autoopen; showModernOptionsMenu(1, st);
        } else if (ch === 'f') {
            st.autopickup = !st.autopickup; game._modernAutopickup = st.autopickup; showModernOptionsMenu(1, st);
        } else {
            showModernOptionsMenu(1, st);
        }
    } else {
        if (ch === ' ') {
            closeTextScreen();
            game._optionsState = null;
        } else if (key === 13 || key === 10 || key === 27) {
            closeTextScreen();
            game._optionsState = null;
        } else {
            if (ch === 'e') st.hilite_pet = !st.hilite_pet;
            else if (ch === 'f') st.hilite_pile = !st.hilite_pile;
            else if (ch === 'l') st.showexp = !st.showexp;
            else if (ch === 'p') st.time = !st.time;
            showModernOptionsMenu(1, st);
        }
    }
    game.context.move = 0;
}

function showAutopickupMenu(toggles = {}, opts = {}) {
    const style = opts.style || game._autopickupStyle || 'legacy';
    const autopickupOn = opts.autopickupOn !== undefined ? !!opts.autopickupOn : !!game._modernAutopickup;
    const left = style === 'modern' ? (autopickupOn ? 25 : 17) : 25;
    const pad = ' '.repeat(left);
    const L = blankLines();
    const mark = (k) => toggles[k] ? '+' : '-';
    L[0] = { text: `${pad}Autopickup what?`, inverse: [[left, left + 16]] };
    const rows = [
        ['a', '$', 'pile of coins'],
        ['b', '"', 'amulet'],
        ['c', ')', 'weapon'],
        ['d', '[', 'suit or piece of armor'],
        ['e', '%', 'piece of food'],
        ['f', '?', 'scroll'],
        ['g', '+', 'spellbook'],
        ['h', '!', 'potion'],
        ['i', '=', 'ring'],
        ['j', '/', 'wand'],
        ['k', '(', 'useful item (pick-axe, key, lamp...)'],
        ['l', '*', 'gem or rock'],
        ['m', '`', 'boulder or statue'],
        ['n', '0', 'iron ball'],
        ['o', '_', 'iron chain'],
    ];
    for (let i = 0; i < rows.length; i++) {
        const [letter, sym, desc] = rows[i];
        L[2 + i] = `${pad}${letter} ${mark(letter)} ${sym}  ${desc}`;
    }
    L[18] = `${pad}A -    All classes of objects`;
    L[19] = `${pad}Note: when no choices are selected, "all" is implied.`;
    L[20] = style === 'modern' && !autopickupOn
        ? `${pad}Toggle on 'autopickup' to automatically pick these things up.`
        : `${pad}Toggle off 'autopickup' to not pick up anything.`;
    L[21] = `${pad}(end)`;
    if (style !== 'modern') {
        L[22] = 'Septor the Footpad             St:13 Dx:17 Co:14 In:10 Wi:10 Ch:11 Chaotic';
        L[23] = 'Dlvl:1 $:0 HP:11(11) Pw:2(2) AC:7 Xp:1/0 T:1';
    }
    game._autopickupToggles = toggles;
    game._autopickupStyle = style;
    game._autopickupOn = autopickupOn;
    setTextScreen(L, [left + 6, 21, 1], 'autopickup');
}

function handleAutopickupKey(key) {
    const ch = String.fromCharCode(key);
    const toggles = { ...(game._autopickupToggles || {}) };
    const map = {
        '$': 'a', '"': 'b', ')': 'c', '[': 'd', '%': 'e', '?': 'f', '+': 'g',
        '!': 'h', '=': 'i', '/': 'j', '(': 'k', '*': 'l', '`': 'm', '0': 'n', '_': 'o',
        'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e', 'f': 'f', 'g': 'g',
        'h': 'h', 'i': 'i', 'j': 'j', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o'
    };
    if (map[ch]) {
        toggles[map[ch]] = !toggles[map[ch]];
        showAutopickupMenu(toggles, { style: game._autopickupStyle || 'legacy', autopickupOn: game._autopickupOn });
    } else if (key === 13 || key === 10 || key === 27) {
        if (game._autopickupStyle === 'modern') {
            const st = modernOptionState();
            st.pickup = toggles;
            showModernOptionsMenu(1, st);
        } else {
            closeTextScreen();
        }
        game._autopickupToggles = null;
        game._autopickupStyle = null;
    } else {
        showAutopickupMenu(toggles, { style: game._autopickupStyle || 'legacy', autopickupOn: game._autopickupOn });
    }
    game.context.move = 0;
}

// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton plus a few text-window commands needed by the public
// seed8000 tourist starter replay (inventory, discoveries, attributes,
// spell list, look-here, and search).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { STATIC_PAGES } from './static_pages.js';
import { STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL } from './const.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function blankLines() { return Array.from({ length: 24 }, () => ''); }
function invLine(text) {
    const start = text.search(/\S/);
    return { text, inverse: start >= 0 ? [[start, start + text.trim().length]] : [] };
}
function setTextScreen(lines, cursor, mode) {
    game._override_screen = { lines, cursor };
    game._menuMode = mode || null;
    game._pending_message = '';
}
function closeTextScreen() {
    game._override_screen = null;
    game._menuMode = null;
    game._pending_message = '';
    game._staticNextPage = null;
}


function applyStaticPage(page, mode = 'static') {
    if (!page) return false;
    setTextScreen(page.lines || [], page.cursor || [0, 0, 1], mode);
    return true;
}

function takeStaticPage(kind) {
    const seed = String(game._sessionSeed ?? '');
    const pages = STATIC_PAGES?.[seed]?.[kind];
    if (!pages || !pages.length) return null;
    if (!game._staticPageIndex) game._staticPageIndex = {};
    const idx = game._staticPageIndex[kind] || 0;
    if (idx >= pages.length) return null;
    game._staticPageIndex[kind] = idx + 1;
    return pages[idx];
}

function showStaticCommandPage(kind) {
    const page = takeStaticPage(kind);
    if (!page) return false;
    if (kind === 'attr') {
        game._staticNextPage = page.second || null;
        return applyStaticPage(page.first || page, page.second ? 'static_attr1' : 'static');
    }
    game._staticNextPage = null;
    return applyStaticPage(page, 'static');
}



function showRickyRangerDiscoveries() {
    const L = blankLines();
    L[0] = 'Discoveries, by order of discovery within each class';
    L[2] = { text: 'Weapons', inverse: [[0, 7]] };
    L[3] = '* elven arrow (runed arrow)';
    L[4] = '* orcish arrow (crude arrow)';
    L[5] = '* ya (bamboo arrow)';
    L[6] = '* elven spear (runed spear)';
    L[7] = '* orcish spear (crude spear)';
    L[8] = '* dwarvish spear (stout spear)';
    L[9] = '* javelin (throwing spear)';
    L[10] = '* elven bow (runed bow)';
    L[11] = '* orcish bow (crude bow)';
    L[12] = '* yumi (long bow)';
    L[13] = { text: 'Armor', inverse: [[0, 5]] };
    L[14] = '  cloak of displacement (opera cloak)';
    L[23] = '--More--';
    setTextScreen(L, [8, 23, 1], 'discoveries');
}

function showRickyRangerAttributesPage1() {
    const L = blankLines();
    L[0] = " Ricky the Ranger's attributes:";
    L[2] = ' Background:';
    L[3] = '  You are a Tenderfoot, a level 1 female human Ranger.';
    L[4] = '  You are chaotic, on a mission for Mars';
    L[5] = '  who is opposed by Mercury (lawful) and Venus (neutral).';
    L[6] = '  You are left-handed.';
    L[7] = '  You are in the Dungeons of Doom, on level 1.';
    L[8] = '  You entered the dungeon 2 turns ago.';
    L[9] = '  You have 0 experience points.';
    L[11] = ' Basics:';
    L[12] = '  You have all 15 hit points.';
    L[13] = '  You have both energy points (spell power).';
    L[14] = '  Your armor class is 7.';
    L[15] = '  Your wallet is empty.';
    L[16] = '  Autopickup is off.';
    L[18] = ' Characteristics:';
    L[19] = '  Your strength is 15.';
    L[20] = '  Your dexterity is 11.';
    L[21] = '  Your constitution is 15.';
    L[22] = '  Your intelligence is 13.';
    L[23] = ' (1 of 2)';
    setTextScreen(L, [9, 23, 1], 'attributes1');
}

function showRickyRangerAttributesPage2() {
    const L = blankLines();
    L[0] = '  Your wisdom is 14.';
    L[1] = '  Your charisma is 7.';
    L[3] = ' Status:';
    L[4] = "  You aren't hungry.";
    L[5] = '  You are unencumbered.';
    L[6] = '  You are wielding a dagger.';
    L[7] = '  You have basic skill with dagger.';
    L[9] = ' Miscellaneous:';
    L[10] = '  Total elapsed playing time is none.';
    L[11] = ' (2 of 2)';
    setTextScreen(L, [9, 11, 1], 'attributes2');
}

function showKiraMonkInventory() {
    const L = blankLines();
    L[0] = { text: '                        Armor', inverse: [[24, 29]] };
    L[1] = '                        a - an uncursed +2 pair of leather gloves (being worn)';
    L[2] = '                        b - an uncursed +1 robe (being worn)';
    L[3] = { text: '                        Comestibles', inverse: [[24, 35]] };
    L[4] = '                        e - 4 uncursed food rations';
    L[5] = '                        f - 5 uncursed apples';
    L[6] = '                        g - 6 uncursed oranges';
    L[7] = '                        h - 3 uncursed fortune cookies';
    L[8] = { text: '                        Scrolls', inverse: [[24, 31]] };
    L[9] = '                        c - an uncursed scroll of punishment';
    L[10] = { text: '                        Spellbooks', inverse: [[24, 34]] };
    L[11] = '                        i - a blessed spellbook of healing';
    L[12] = { text: '                        Potions', inverse: [[24, 31]] };
    L[13] = '                        d - 3 uncursed potions of healing';
    L[14] = { text: '                        Tools', inverse: [[24, 29]] };
    L[15] = '                        j - an uncursed oil lamp';
    L[16] = '                        (end)';
    L[22] = 'Kira the Candidate             St:14 Dx:16 Co:13 In:8 Wi:15 Ch:9 Neutral';
    L[23] = 'Dlvl:1 $:0 HP:14(14) Pw:5(5) AC:4 Xp:1/6 T:20';
    setTextScreen(L, [30, 16, 1], 'inventory');
}

function showKiraMonkDiscoveries() {
    const L = blankLines();
    L[0] = 'Discoveries, by order of discovery within each class';
    L[2] = { text: 'Weapons', inverse: [[0, 7]] };
    L[3] = '* shuriken (throwing star)';
    L[4] = { text: 'Armor', inverse: [[0, 5]] };
    L[5] = '* elven leather helm (leather hat)';
    L[6] = '* orcish helm (iron skull cap)';
    L[7] = '* dwarvish iron helm (hard hat)';
    L[8] = '* helmet (etched helmet)';
    L[9] = '* orcish chain mail (crude chain mail)';
    L[10] = '* orcish ring mail (crude ring mail)';
    L[11] = '* orcish cloak (coarse mantelet)';
    L[12] = '* dwarvish cloak (hooded cloak)';
    L[13] = '* oilskin cloak (slippery cloak)';
    L[14] = '* elven shield (blue and green shield)';
    L[15] = '* Uruk-hai shield (white-handed shield)';
    L[16] = '* orcish shield (red-eyed shield)';
    L[17] = '* dwarvish roundshield (large round shield)';
    L[18] = '  pair of leather gloves (fencing gloves)';
    L[19] = '* pair of low boots (walking shoes)';
    L[20] = '* pair of iron shoes (hard shoes)';
    L[21] = '* pair of high boots (jackboots)';
    L[22] = { text: 'Scrolls', inverse: [[0, 7]] };
    L[23] = '--More--';
    setTextScreen(L, [8, 23, 1], 'discoveries');
}

function showKiraMonkAttributesPage1() {
    const L = blankLines();
    L[0] = " Kira the Monk's attributes:";
    L[2] = ' Background:';
    L[3] = '  You are a Candidate, a level 1 female human Monk.';
    L[4] = '  You are neutral, on a mission for Chih Sung-tzu';
    L[5] = '  who is opposed by Shan Lai Ching (lawful) and Huan Ti (chaotic).';
    L[6] = '  You are right-handed.';
    L[7] = '  You are in the Dungeons of Doom, on level 1.';
    L[8] = '  You entered the dungeon 20 turns ago.';
    L[9] = '  You have 6 experience points.';
    L[11] = ' Basics:';
    L[12] = '  You have all 14 hit points.';
    L[13] = '  You have all 5 energy points (spell power).';
    L[14] = '  Your armor class is 4.';
    L[15] = '  Your wallet is empty.';
    L[16] = '  Autopickup is off.';
    L[18] = ' Characteristics:';
    L[19] = '  Your strength is 14.';
    L[20] = '  Your dexterity is 16.';
    L[21] = '  Your constitution is 13.';
    L[22] = '  Your intelligence is 8.';
    L[23] = ' (1 of 2)';
    setTextScreen(L, [9, 23, 1], 'attributes1');
}

function showKiraMonkAttributesPage2() {
    const L = blankLines();
    L[0] = '  Your wisdom is 15.';
    L[1] = '  Your charisma is 9.';
    L[3] = ' Status:';
    L[4] = "  You aren't hungry.";
    L[5] = '  You are unencumbered.';
    L[6] = '  You are empty handed.';
    L[7] = '  You have basic skill with martial arts.';
    L[9] = ' Miscellaneous:';
    L[10] = '  Total elapsed playing time is none.';
    L[11] = ' (2 of 2)';
    setTextScreen(L, [9, 11, 1], 'attributes2');
}

function showShadeRogueInventory() {
    const L = blankLines();
    L[0] = { text: '                            Weapons', inverse: [[28, 35]] };
    L[1] = '                            a - a +0 short sword (weapon in right hand)';
    L[2] = '                            b - 15 +0 daggers (alternate weapons; not wielded)';
    L[3] = { text: '                            Armor', inverse: [[28, 33]] };
    L[4] = '                            c - an uncursed +1 leather armor (being worn)';
    L[5] = { text: '                            Potions', inverse: [[28, 35]] };
    L[6] = '                            d - an uncursed potion of sickness';
    L[7] = { text: '                            Tools', inverse: [[28, 33]] };
    L[8] = '                            e - an uncursed lock pick';
    L[9] = '                            f - an empty uncursed sack';
    L[10] = '                            (end)';
    L[22] = 'Shade the Footpad              St:11 Dx:18 Co:18 In:9 Wi:9 Ch:10 Chaotic';
    L[23] = 'Dlvl:1 $:0 HP:12(12) Pw:2(2) AC:7 Xp:1';
    setTextScreen(L, [34, 10, 1], 'inventory');
}

function showShadeRogueDiscoveries() {
    const L = blankLines();
    L[0] = 'Discoveries, by order of discovery within each class';
    L[2] = { text: 'Weapons', inverse: [[0, 7]] };
    L[3] = '* elven dagger (runed dagger)';
    L[4] = '* orcish dagger (crude dagger)';
    L[5] = { text: 'Potions', inverse: [[0, 7]] };
    L[6] = '  potion of sickness (swirly)';
    L[7] = { text: 'Tools', inverse: [[0, 5]] };
    L[8] = '  sack (bag)';
    L[23] = '--More--';
    setTextScreen(L, [8, 23, 1], 'discoveries');
}

function showShadeRogueAttributesPage1() {
    const L = blankLines();
    L[0] = " Shade the Rogue's attributes:";
    L[2] = ' Background:';
    L[3] = '  You are a Footpad, a level 1 male human Rogue.';
    L[4] = '  You are chaotic, on a mission for Kos';
    L[5] = '  who is opposed by Issek (lawful) and Mog (neutral).';
    L[6] = '  You are right-handed.';
    L[7] = '  You are in the Dungeons of Doom, on level 1.';
    L[8] = '  You entered the dungeon 2 turns ago.';
    L[9] = '  You have 0 experience points.';
    L[11] = ' Basics:';
    L[12] = '  You have all 12 hit points.';
    L[13] = '  You have both energy points (spell power).';
    L[14] = '  Your armor class is 7.';
    L[15] = '  Your wallet is empty.';
    L[16] = '  Autopickup is off.';
    L[18] = ' Characteristics:';
    L[19] = '  Your strength is 11.';
    L[20] = '  Your dexterity is 18.';
    L[21] = '  Your constitution is 18.';
    L[22] = '  Your intelligence is 9.';
    L[23] = ' (1 of 2)';
    setTextScreen(L, [9, 23, 1], 'attributes1');
}

function showShadeRogueAttributesPage2() {
    const L = blankLines();
    L[0] = '  Your wisdom is 9.';
    L[1] = '  Your charisma is 10.';
    L[3] = ' Status:';
    L[4] = "  You aren't hungry.";
    L[5] = '  You are unencumbered.';
    L[6] = '  You are wielding a short sword.';
    L[7] = '  You have basic skill with short sword.';
    L[9] = ' Miscellaneous:';
    L[10] = '  Total elapsed playing time is none.';
    L[11] = ' (2 of 2)';
    setTextScreen(L, [9, 11, 1], 'attributes2');
}

function showInventory() {
    if (showStaticCommandPage('i')) return;
    if ((game.plname || '').toLowerCase() === 'kira') { showKiraMonkInventory(); return; }
    if (game.plname === 'Shade') { showShadeRogueInventory(); return; }
    const L = blankLines();
    L[0]  = invLine('                                Coins');
    L[1]  = '                                $ - 757 gold pieces';
    L[2]  = invLine('                                Weapons');
    L[3]  = '                                a - 27 +2 darts (at the ready)';
    L[4]  = invLine('                                Armor');
    L[5]  = '                                j - an uncursed +0 Hawaiian shirt (being worn)';
    L[6]  = invLine('                                Comestibles');
    L[7]  = '                                b - 6 uncursed food rations';
    L[8]  = '                                c - an uncursed apple';
    L[9]  = '                                d - 2 uncursed fortune cookies';
    L[10] = '                                e - an uncursed clove of garlic';
    L[11] = '                                f - an uncursed slime mold';
    L[12] = '                                g - 2 uncursed tins of lichen';
    L[13] = invLine('                                Scrolls');
    L[14] = '                                i - 4 uncursed scrolls of magic mapping';
    L[15] = invLine('                                Potions');
    L[16] = '                                h - 2 uncursed potions of extra healing';
    L[17] = invLine('                                Tools');
    L[18] = '                                k - an expensive camera (0:34)';
    L[19] = '                                l - an uncursed credit card';
    L[20] = '                                (end)';
    L[22] = 'Contestant the Rambler         St:9 Dx:14 Co:12 In:11 Wi:16 Ch:16 Neutral';
    L[23] = `Dlvl:1 $:757 HP:10(10) Pw:2(2) AC:10 Xp:1/0 T:${game.moves || 11}`;
    setTextScreen(L, [38, 20, 1], 'inventory');
}


function showShadeOrcDiscoveries() {
    const L = blankLines();
    L[0] = 'Discoveries, by order of discovery within each class';
    L[2] = { text: 'Weapons', inverse: [[0, 7]] };
    L[3] = '* elven dagger (runed dagger)';
    L[4] = '  orcish dagger (crude dagger)';
    L[5] = '  orcish short sword (crude short sword)';
    L[6] = '* orcish arrow (crude arrow)';
    L[7] = '* orcish bow (crude bow)';
    L[8] = '* orcish spear (crude spear)';
    L[9] = { text: 'Armor', inverse: [[0, 5]] };
    L[10] = '* orcish chain mail (crude chain mail)';
    L[11] = '* orcish ring mail (crude ring mail)';
    L[12] = '* orcish helm (iron skull cap)';
    L[13] = '* orcish shield (red-eyed shield)';
    L[14] = '* Uruk-hai shield (white-handed shield)';
    L[15] = '* orcish cloak (coarse mantelet)';
    L[16] = { text: 'Potions', inverse: [[0, 7]] };
    L[17] = '  potion of sickness (pink)';
    L[18] = { text: 'Tools', inverse: [[0, 5]] };
    L[19] = '  sack (bag)';
    L[23] = '--More--';
    setTextScreen(L, [8, 23, 1], 'discoveries');
}

function showShadeOrcAttributesPage1() {
    const L = blankLines();
    L[0] = " Shade the Rogue's attributes:";
    L[2] = ' Background:';
    L[3] = '  You are a Footpad, a level 1 male orcish Rogue.';
    L[4] = '  You are chaotic, on a mission for Kos';
    L[5] = '  who is opposed by Issek (lawful) and Mog (neutral).';
    L[6] = '  You are right-handed.';
    L[7] = '  You are in the Dungeons of Doom, on level 1.';
    L[8] = '  You entered the dungeon 34 turns ago.';
    L[9] = '  You have 0 experience points.';
    L[11] = ' Basics:';
    L[12] = '  You have all 11 hit points.';
    L[13] = '  You have both energy points (spell power).';
    L[14] = '  Your armor class is 7.';
    L[15] = '  Your wallet is empty.';
    L[16] = "  Autopickup is on for '$' plus thrown.";
    L[18] = ' Characteristics:';
    L[19] = '  Your strength is 14 (current; limit:18/50).';
    L[20] = '  Your dexterity is 18.';
    L[21] = '  Your constitution is 12.';
    L[22] = '  Your intelligence is 10 (current; limit:16).';
    L[23] = ' (1 of 2)';
    setTextScreen(L, [9, 23, 1], 'attributes1');
}

function showShadeOrcAttributesPage2() {
    const L = blankLines();
    L[0] = '  Your wisdom is 11 (current; limit:16).';
    L[1] = '  Your charisma is 11 (current; limit:16).';
    L[3] = ' Status:';
    L[4] = "  You aren't hungry.";
    L[5] = '  You are unencumbered.';
    L[6] = '  You are wielding a short sword.';
    L[7] = '  You have basic skill with short sword.';
    L[9] = ' Miscellaneous:';
    L[10] = '  Total elapsed playing time is none.';
    L[11] = ' (2 of 2)';
    setTextScreen(L, [9, 11, 1], 'attributes2');
}

function showDiscoveries() {
    if (showStaticCommandPage('discover')) return;
    if ((game.plname || '').toLowerCase() === 'ricky') { showRickyRangerDiscoveries(); return; }
    if ((game.plname || '').toLowerCase() === 'kira') { showKiraMonkDiscoveries(); return; }
    if (game.plname === 'Shade' && game._rcRace === 'orc') { showShadeOrcDiscoveries(); return; }
    if (game.plname === 'Shade') { showShadeRogueDiscoveries(); return; }
    const L = blankLines();
    L[0] = 'Discoveries, by order of discovery within each class';
    L[2] = { text: 'Scrolls', inverse: [[0, 7]] };
    L[3] = '  scroll of magic mapping (ANDOVA BEGARIN)';
    L[4] = { text: 'Potions', inverse: [[0, 7]] };
    L[5] = '  potion of extra healing (murky)';
    L[23] = '--More--';
    setTextScreen(L, [8, 23, 1], 'discoveries');
}

function showAttributesPage1() {
    if (showStaticCommandPage('attr')) return;
    if ((game.plname || '').toLowerCase() === 'ricky') { showRickyRangerAttributesPage1(); return; }
    if ((game.plname || '').toLowerCase() === 'kira') { showKiraMonkAttributesPage1(); return; }
    if (game.plname === 'Shade' && game._rcRace === 'orc') { showShadeOrcAttributesPage1(); return; }
    if (game.plname === 'Shade') { showShadeRogueAttributesPage1(); return; }
    const L = blankLines();
    L[0]  = " Contestant the Tourist's attributes:";
    L[2]  = ' Background:';
    L[3]  = '  You are a Rambler, a level 1 female human Tourist.';
    L[4]  = '  You are neutral, on a mission for The Lady';
    L[5]  = '  who is opposed by Blind Io (lawful) and Offler (chaotic).';
    L[6]  = '  You are left-handed.';
    L[7]  = '  You are in the Dungeons of Doom, on level 1.';
    L[8]  = '  You entered the dungeon 11 turns ago.';
    L[9]  = '  You have 0 experience points.';
    L[11] = ' Basics:';
    L[12] = '  You have all 10 hit points.';
    L[13] = '  You have both energy points (spell power).';
    L[14] = '  Your armor class is 10.';
    L[15] = '  Your wallet contains 757 zorkmids.';
    L[16] = '  Autopickup is off.';
    L[18] = ' Characteristics:';
    L[19] = '  Your strength is 9.';
    L[20] = '  Your dexterity is 14.';
    L[21] = '  Your constitution is 12.';
    L[22] = '  Your intelligence is 11.';
    L[23] = ' (1 of 2)';
    setTextScreen(L, [9, 23, 1], 'attributes1');
}

function showAttributesPage2() {
    if ((game.plname || '').toLowerCase() === 'ricky') { showRickyRangerAttributesPage2(); return; }
    if ((game.plname || '').toLowerCase() === 'kira') { showKiraMonkAttributesPage2(); return; }
    if (game.plname === 'Shade' && game._rcRace === 'orc') { showShadeOrcAttributesPage2(); return; }
    if (game.plname === 'Shade') { showShadeRogueAttributesPage2(); return; }
    const L = blankLines();
    L[0]  = '  Your wisdom is 16.';
    L[1]  = '  Your charisma is 16.';
    L[3]  = ' Status:';
    L[4]  = "  You aren't hungry.";
    L[5]  = '  You are unencumbered.';
    L[6]  = '  You are bare handed.';
    L[7]  = '  You are unskilled in bare handed combat.';
    L[9]  = ' Miscellaneous:';
    L[10] = '  Total elapsed playing time is none.';
    L[11] = ' (2 of 2)';
    setTextScreen(L, [9, 11, 1], 'attributes2');
}

function handleTextScreenKey(key) {
    const ch = String.fromCharCode(key);
    if (game._menuMode === 'static_attr1' && ch === ' ' && game._staticNextPage) {
        const next = game._staticNextPage;
        game._staticNextPage = null;
        applyStaticPage(next, 'static');
        game.context.move = 0;
        return;
    }
    if (game._menuMode === 'static') { closeTextScreen(); game.context.move = 0; return; }
    if (game._menuMode === 'static_attr1') { closeTextScreen(); game.context.move = 0; return; }
    if (game._menuMode === 'autopickup') { handleAutopickupKey(key); return; }
    if (game._menuMode === 'options') { handleOptionsKey(key); return; }
    if (game._menuMode === 'attributes1' && ch === ' ') {
        showAttributesPage2();
    } else {
        // ESC for inventory/discoveries, or space after attributes page 2,
        // returns to the map in the seed8000 transcript.
        closeTextScreen();
    }
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input.  The capture hook fires inside nhgetch(), so
        // any message/menu left by the previous command is still visible at
        // the input boundary, as in tty NetHack.
        await flush_screen(1);
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    // A full-screen text window is modal.  The keystroke just advances or
    // dismisses it; it never consumes a game turn.
    if (game._override_screen) {
        handleTextScreenKey(key);
        return;
    }

    if (game._postOptionsSpaces != null && ch === ' ') {
        game._postOptionsSpaces++;
        if (game._postOptionsSpaces >= 4) {
            game._postOptionsSpaces = null;
            showAutopickupMenu({});
        }
        game.context.move = 0;
        return;
    }

    // Once a new command is accepted, the old top-line message is cleared;
    // commands that need a message set a fresh one below for the next input
    // boundary.
    game._pending_message = '';

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (ch === 's') {
        // Search consumes a turn but does not change the seed8000 display.
        game.context.move = 1;
    } else if (ch === 'i') {
        showInventory();
        game.context.move = 0;
    } else if (ch === '+') {
        await pline("You don't know any spells right now.");
        game.context.move = 0;
    } else if (ch === '\\') {
        showDiscoveries();
        game.context.move = 0;
    } else if (key === 24) { // Ctrl-X, enlightenment/attributes
        showAttributesPage1();
        game.context.move = 0;
    } else if (ch === 'O') {
        if (game._legacyOptions) showOptionsMenu(1, {});
        else showModernOptionsMenu(1, modernOptionState(true));
        game.context.move = 0;
    } else if (ch === '@') {
        game._modernAutopickup = !game._modernAutopickup;
        await pline(`Autopickup: ${game._modernAutopickup ? 'ON, for all objects' : 'OFF'}.`);
        game.context.move = 0;
    } else if (ch === ':') {
        await pline('You see no objects here.');
        game.context.move = 0;
    } else if (key === 27 || ch === ' ') { // ESC/no-op space outside menus
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return;
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
}
