// @ts-nocheck
// Symbol-class portion of C pager.c:1247-1607 do_screen_description().
// This deliberately knows nothing about map coordinates or lookat(): callers
// provide the already-painted symbol and use `needsLook` to decide whether the
// location-specific description must be appended.

import { monsym_explain } from './makemon.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { an } from './objnam.js';
import { def_warnsyms } from './const.js';

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
// C pager.c:1199-1214 add_cmap_descr(): waterbody names suppress articles
// only for these prefixes or an adjective followed by " ice" (so "a pond").
function waterbodyNoArticle(description) {
    return ['water', 'ice', 'pool', 'moat', 'lava', 'swamp', 'molten',
        'shallow', 'limitless', 'wall of lava', 'wall of water', 'frozen']
        .some(prefix => description.startsWith(prefix))
        || description.slice(description.indexOf(' ')).toLowerCase() === ' ice';
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
    // C compares ttychar before terminal handling strips high bits/control bytes.
    let selected = normalizeSymbol(options.symbol ?? options.ch, !!options.dec);
    const showsyms = Array.isArray(options.showsyms) ? options.showsyms : null;
    const classes = [];
    let assembled = '';
    let needsLook = false, matchCount = 0, firstmatch = null, skippedVenom = 0;
    const symbolAt = (index, fallback) => {
        /* display.c:1850-1853 reglyph_darkroom: showsyms[S_darkroom] aliases
         * showsyms[S_room] when dark_room && use_color (DEC table has no own slot). */
        const active = showsyms?.[index]
            ?? (index === 20 && options.darkroomAlias ? showsyms?.[19] : null);
        if (active == null && index === 20 && options.darkroomAlias && options.decMode && !options.rogueMode)
            return { ch: DEC_PCHARS.get(19), dec: true };
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
        if (firstmatch === null) firstmatch = value; /* pager.c *firstmatch: the raw explanation */
        if (count) matchCount++;
        if (needs) needsLook = true;
    };

    // pager.c's is_swallow_sym() runs before monster/object class scans and
    // intentionally permits further collisions (for example, '/' is also a
    // wand).  The surrounding game state is not needed for this symbol test.
    // pager.c:1296 `if (!looked) ; /* skip special handling */` precedes it.
    for (let i = 88; options.looked !== false && i <= 95; i++) {
        if (matches(i, PCHARS[i])) {
            add('the interior of a monster', { plain: true, needs: true });
            break;
        }
    }

    // C pager.c:1574-1575 jumps back here without clearing prior matches.
    for (;;) {
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
            // pager.c:1391-1394: a looked-at VENOM_CLASS match is skipped
            // (after need_to_look is set).
            if (options.looked !== false && i === 17) {
                needsLook = true;
                skippedVenom++;
                continue;
            }
            add(description, { needs: true });
        }
    }

    const otherOff = 190;
    if (options.glyphKind === 'invisible' || (selected.ch === 'I' && !selected.dec))
        add((options.usealt || options.blind) ? 'unseen creature' : 'remembered, unseen, creature');
    // pager.c:1419-1431: the symbol arms need `looked`; a typed one has no glyph.
    const looked = options.looked !== false;
    const isNothing = options.glyphKind === 'nothing' || (looked && matches(otherOff, ' '));
    const isUnexplored = options.glyphKind === 'unexplored' || (looked && matches(otherOff + 1, ' '));
    if (isNothing) add('the dark part of a room', { plain: true });
    if (isUnexplored) add(options.submerged ? 'land' : 'unexplored', { plain: true });

    let hitTrap = false;
    if (enabled(options.terrainmode, 'terrain')) {
        for (let i = 0; i < MAXPCHARS; i++) {
            // pager.c rotates water/lava/lava-wall through this scan so its
            // phrase order stays useful when their symbols collide.
            const alt = i === 40 ? 48 : i === 41 ? 40 : i === 48 ? 41 : i;
            let description = options.waterbodyNames?.[alt]?.[0] ?? DEFSYM_EXPLANATION[alt];
            /* C pager.c:1148-1158 add_cmap_descr(), glyph == NO_GLYPH (typed
             * symbol): "water" becomes "pool of water" / "wall of water" /
             * "limitless water" (the transformations waterbody_name makes). */
            if (!looked && description === 'water' && !options.waterbodyNames)
                description = alt === 38 ? 'pool of water'
                    : alt === 48 ? (options.waterLevel ? 'limitless water' : 'wall of water')
                    : description;
            if (!description || !matches(alt, PCHARS[alt])) continue;
            if (isNothing && alt === 20) continue;
            const isTrap = alt >= 49 && alt <= 73 && alt !== 71;
            // C's hit_trap prevents each of the many '^' trap classes from
            // becoming a long list.  The screen-description phrase is the
            // generic class, leaving location-specific detail to lookat().
            if (isTrap) {
                // C pager.c add_cmap_descr (1133-1235): the first trap is "a trap"
                // only when it is the FIRST match (found == 0); after an object or
                // monster class it appends that trap's own defsym name ("a web"),
                // and hit_trap then suppresses every later trap.
                if (!hitTrap) {
                    if (matchCount === 0) add('a trap', { needs: true, plain: true });
                    else add(description, { needs: true });
                }
                hitTrap = true;
                continue;
            }
            if (alt === 71 && !options.allowVibratingSquare
                && options.glyphKind !== 'trap') continue;
            // C pager.c:1230: omit drawbridges after three prior matches.
            if (matchCount >= 3 && alt >= 42 && alt <= 45) continue;
            const plain = options.waterbodyNames?.[alt] ? waterbodyNoArticle(description)
                : description === 'stone' || description === 'air' || description === 'land';
            const definite = description.includes(' of a room');
            const special = alt === 33 || (alt >= 49 && alt <= 73) || alt === 21 || alt === 24 || alt === 34;
            add(description, { needs: special, plain, definite });
            // S_pool and S_moat share a display symbol.  C appends moat as a
            // second possibility without increasing `found`.
            if (alt === 38 && matches(38, PCHARS[38])) {
                const moat = options.waterbodyNames?.[38]?.[1] ?? 'moat';
                add(moat, { needs: true, count: false,
                    plain: !!options.waterbodyNames?.[38] && waterbodyNoArticle(moat) });
            }
        }
    }
    // C pager.c:1512-1528 scans warning symbols even for an object glyph.
    for (let i = 1; i < def_warnsyms.length; i++) {
        if (selected.dec || selected.ch !== def_warnsyms[i].ch) continue;
        add(def_warnsyms[i].desc, { plain: true });
        if (looked && options.boulderAt)
            classes[classes.length - 1] += ' co-located with a boulder';
        break;
    }
    // pager.c:1530-1541: if venom was ignored and the list turned out short,
    // put it back.
    if (skippedVenom && matchCount < 2) add(OBJEXPLAIN[17], { needs: true });
    const heroOverride = normalizeSymbol(options.heroOverride);
    if (!options.heroOverride || selected.ch !== heroOverride.ch
        || selected.dec !== heroOverride.dec) break;
    selected = normalizeSymbol(options.heroSymbol ?? '@');
    }
    const collapsed = matchCount > 4;
    return { classes: collapsed ? ['can be many things'] : classes, needsLook, matchCount, collapsed, firstmatch };
}
