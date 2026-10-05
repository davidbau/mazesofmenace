// @ts-nocheck
// Symbol-class portion of C pager.c:1247-1607 do_screen_description().
// This deliberately knows nothing about map coordinates or lookat(): callers
// provide the already-painted symbol and use `needsLook` to decide whether the
// location-specific description must be appended.

import { monsym_explain } from './makemon.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { an } from './objnam.js';

const MAXPCHARS = 105, SYM_OFF_O = 105, SYM_OFF_M = 123;
const MONSYMS = '?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]';
const OBJSYMS = ['', ']', ')', '[', '=', '"', '(', '%', '!', '?', '+', '/', '$', '*', '`', '0', '_', '.'];
// src/symbols.c init_rogue_symbols(): def_r_oc_syms[].  Monster classes keep
// their ordinary symbols on Rogue levels; only these object classes differ.
const ROGUE_OBJSYMS = ['', ']', ')', ']', '=', ',', '(', ':', '!', '?', '+', '/', '*', '*', '`', '0', '_', '.'];
const OBJEXPLAIN = ['', 'strange object', 'weapon', 'suit or piece of armor',
    'ring', 'amulet', 'useful item (pick-axe, key, lamp...)', 'piece of food', 'potion', 'scroll', 'spellbook',
    'wand', 'pile of coins', 'gem or rock', 'boulder or statue', 'iron ball', 'iron chain',
    'splash of venom'];
const PCHARS = [
    ' ', '|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|', '.', '-', '|', '+', '+', '#', '#', '.', '.', '`', '#', '#', '#',
    '<', '>', '<', '>', '<', '>', '<', '>', '_', '|', '\\', '{', '{', '}', '.', '}', '}', '.', '.', '#', '#', ' ', '#', '}',
    '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '"', '^', '^', '^', '^', '~', '^', '^',
    '|', '-', '\\', '/', '*', '!', ')', '(', '0', '#', '@', '*', '#', '$', '/', '-', '\\', '|', '|', '\\', '-', '/', '/', '-', '\\', '|', ' ', '|', '\\', '-', '/',
];
// dat/symbols' `start: DECgraphics`, indexed by defsym cmap index.  A
// low-seven-bit display character is accompanied by the cell's `dec` flag in
// this port; C instead records the same distinction in the high bit.
const DEC_PCHARS = new Map([
    [1, 'x'], [2, 'q'], [3, 'l'], [4, 'k'], [5, 'm'], [6, 'j'], [7, 'n'], [8, 'v'], [9, 'w'], [10, 'u'], [11, 't'],
    [12, '~'], [13, 'a'], [14, 'a'], [17, '|'], [18, 'g'], [19, '~'],
    [27, 'y'], [28, 'z'], [31, 'y'], [32, 'z'], [33, '{'], [38, '\\'],
    [39, '~'], [40, '\\'], [41, '\\'], [42, '~'], [43, '~'], [48, '\\'],
    [74, 'x'], [75, 'q'], [89, 'o'], [91, 'x'], [92, 'x'], [94, 's'],
    [97, 'o'], [99, 'x'], [101, 'x'], [103, 's'],
]);

function asChar(value) {
    if (typeof value === 'number') return String.fromCharCode(value);
    return typeof value === 'string' ? value : '';
}
function normalizeSymbol(value, dec = false) {
    if (typeof value === 'number') {
        return value > 0x7f
            ? { ch: String.fromCharCode(value & 0x7f), dec: true }
            : { ch: String.fromCharCode(value), dec };
    }
    return { ch: asChar(value), dec };
}
function enabled(mode, name) {
    if (!mode) return true;
    if (typeof mode === 'object') return mode[name] !== false;
    if (name === 'monsters') return (mode & 0x08) !== 0; // TER_MON
    if (name === 'objects') return (mode & 0x04) !== 0; // TER_OBJ
    return true; // pager.c's cmap scan is intentionally unconditional
}

/**
 * Collect C pager's class-level possibilities for one already-painted symbol.
 *
 * `showsyms`, when supplied, is the active gs.showsyms array (characters or
 * character codes).  Without it the C primary ASCII defaults are used.  The
 * return keeps `matchCount` separate from `classes`: C collapses display text
 * after four matches but still uses the pre-collapse count for lookat().
 */
export function collectScreenDescriptionClasses(options = {}) {
    const selected = normalizeSymbol(options.ch, !!options.dec);
    const showsyms = Array.isArray(options.showsyms) ? options.showsyms : null;
    const classes = [];
    let assembled = '';
    let needsLook = false, matchCount = 0;
    const symbolAt = (index, fallback) => {
        const active = showsyms?.[index];
        if (active != null) return normalizeSymbol(active);
        if (options.rogueMode) {
            if (index >= SYM_OFF_O && index < SYM_OFF_M)
                fallback = ROGUE_OBJSYMS[index - SYM_OFF_O];
            else if (index === 12 || index === 13 || index === 14)
                fallback = '+';
            else if (index === 25 || index === 26)
                fallback = '%';
        }
        const dec = !options.rogueMode && !!options.decMode && DEC_PCHARS.get(index);
        return { ch: dec || fallback, dec: !!dec };
    };
    const matches = (index, fallback) => {
        const symbol = symbolAt(index, fallback);
        return selected.ch === symbol.ch && selected.dec === symbol.dec;
    };
    const add = (value, { needs = false, plain = false, definite = false, count = true } = {}) => {
        const rendered = plain ? value : (definite ? `the ${value}` : an(value));
        // C append_str() tests the fully article-expanded new string against the
        // accumulated output with strstri(), not a case-sensitive raw-name set.
        if (!value || assembled.toLowerCase().includes(rendered.toLowerCase())) return;
        assembled += (assembled ? ' or ' : '') + rendered;
        classes.push(rendered);
        if (count) matchCount++;
        if (needs) needsLook = true;
    };

    // pager.c's is_swallow_sym() runs before monster/object class scans and
    // intentionally permits further collisions (for example, '/' is also a
    // wand).  The surrounding game state is not needed for this symbol test.
    for (let i = 88; i <= 95; i++) {
        if (matches(i, PCHARS[i])) {
            add('the interior of a monster', { plain: true, needs: true });
            break;
        }
    }

    if (enabled(options.terrainmode, 'monsters')) {
        for (let i = 1; i < MONSYMS.length; i++) {
            if (i === 35) continue; // S_invisible is dealt with by glyph, never class matching
            if (matches(SYM_OFF_M + i, MONSYMS[i])) {
                const description = monsym_explain(i);
                if (description) add(description, { needs: true });
            }
        }
        if (options.isHero && matches(SYM_OFF_M + 53, '@')
            && options.heroNeedsYou) add('you', { plain: true });
    }
    if (enabled(options.terrainmode, 'objects')) {
        for (let i = 1; i < OBJSYMS.length; i++) {
            // pager.c deliberately bypasses gs.showsyms for ROCK_CLASS:
            // boulders use the primary/rogue boulder override, while a statue
            // matches regardless of its painted monster symbol.
            const isBoulderSymbol = selected.ch === asChar(options.boulderSymbol ?? OBJSYMS[14])
                && !selected.dec;
            const matched = i === 14
                ? options.glyphKind === 'statue' || isBoulderSymbol
                : matches(SYM_OFF_O + i, OBJSYMS[i]);
            if (!matched) continue;
            const description = i === 14
                // pager.c tests the custom boulder symbol first, even for a
                // statue glyph whose depicted monster has that same symbol.
                ? (isBoulderSymbol ? 'boulder' : 'statue')
                : OBJEXPLAIN[i];
            add(description, { needs: true });
        }
    }

    const otherOff = 190;
    if (options.glyphKind === 'invisible' || (selected.ch === 'I' && !selected.dec))
        add(options.blind ? 'unseen creature' : 'remembered, unseen, creature');
    const isNothing = options.glyphKind === 'nothing' || matches(otherOff, ' ');
    const isUnexplored = options.glyphKind === 'unexplored' || matches(otherOff + 1, ' ');
    if (isNothing) add('the dark part of a room', { plain: true });
    if (isUnexplored) add(options.submerged ? 'land' : 'unexplored', { plain: true });

    let hitTrap = false;
    if (enabled(options.terrainmode, 'terrain')) {
        for (let i = 0; i < MAXPCHARS; i++) {
            // pager.c rotates water/lava/lava-wall through this scan so its
            // phrase order stays useful when their symbols collide.
            const alt = i === 40 ? 48 : i === 41 ? 40 : i === 48 ? 41 : i;
            const description = DEFSYM_EXPLANATION[alt];
            if (!description || !matches(alt, PCHARS[alt])) continue;
            if (isNothing && alt === 20) continue;
            const isTrap = alt >= 49 && alt <= 73 && alt !== 71;
            // C's hit_trap prevents each of the many '^' trap classes from
            // becoming a long list.  The screen-description phrase is the
            // generic class, leaving location-specific detail to lookat().
            if (isTrap) {
                if (!hitTrap) add('trap', { needs: true });
                hitTrap = true;
                continue;
            }
            if (alt === 71 && !options.allowVibratingSquare
                && options.glyphKind !== 'trap') continue;
            const plain = description === 'stone' || description === 'air' || description === 'land';
            const definite = description.includes(' of a room');
            const special = alt === 33 || (alt >= 49 && alt <= 73) || alt === 21 || alt === 24 || alt === 34;
            add(description, { needs: special, plain, definite });
            // S_pool and S_moat share a display symbol.  C appends moat as a
            // second possibility without increasing `found`.
            if (alt === 38 && matches(38, PCHARS[38]))
                add('moat', { needs: true, count: false });
        }
    }
    const collapsed = matchCount > 4;
    return { classes: collapsed ? ['can be many things'] : classes, needsLook, matchCount, collapsed };
}
