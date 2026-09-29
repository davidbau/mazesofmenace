// @ts-nocheck
// mapstate_game_bridge.js — replay-mode bridge between the captured-input
// mapstate table and the live `game` global. Used exclusively by the
// per-function differential equivalence harness in --mode replay (see
// tools/equiv-test/runner.mjs).
//
// Two functions:
//   applyMapstateToGame(entries):   write captured state_before into game.*
//   extractGameToMapstate(keys):    read selected schema keys back out
//
// Both walk a single READER/WRITER table that maps each of the 49 keys
// in MAPSTATE_SCHEMA to (a) a writer that takes the stringified C-side
// value and mutates the live `game` object, and (b) a reader that
// returns the current `game.*` value rendered as a stringified value
// matching the wire shape (always a decimal string, never quoted).
//
// CARDINAL RULE 1: the bridge does NOT do "smart" inference. If a key
// has no JS-side analog today, it is recorded as a "placeholder slot"
// and round-trips through `g.__bridge__.<key>` so dumps still produce
// the expected wire value. The JS port reading `game.<real-slot>`
// remains responsible for setting the real slot; the bridge will NOT
// silently fabricate field values to make replay pass. If u_init_misc
// is expected to set `dungeon.dlevel = 1` but the JS port doesn't,
// extractGameToMapstate will return the placeholder default (0) and
// the runner's assertStateAfterDiff will surface that as a divergence.
// That is the intended behaviour — the bridge surfaces porter gaps,
// it does not paper over them.
//
// The single exception to the placeholder rule is `hero.hero_seq`: the
// JS port DOES source this from `g.hero_seq` (set by resetGame()), so
// the bridge round-trips through that real slot. See js/mapstate.js
// for the same source-of-truth convention.
import { game, resetGame } from './gstate.js';
import { MAPSTATE_SCHEMA, MAPSTATE_KEYS } from './mapstate_schema.js';
import { GameMap } from './game.js';
import { parseObjChainString, markChainNode } from './struct_reconstructor.js';
import { NO_COLOR } from './terminal.js';
import { GLYPHCLS_INVIS } from './display.js';

// C ref: include/display.h enum glyph_offsets — GLYPH_INVIS_OFF =
// (NUMMONS + GLYPH_PET_FEM_OFF), a compile-time constant fixed by this
// build's monster table (NetHack-5.0.0_Release, pinned commit 16ff59115).
// #define GLYPH_INVISIBLE GLYPH_INVIS_OFF (display.h:549). Measured directly
// against the running recorder binary (not hand-derived from the formula,
// to rule out an off-by-one in NUMMONS): a probe TU compiled against
// nethack-c-v5's own include/hack.h printed GLYPH_INVISIBLE=1532, and the
// same value (1532) is the single most repeated nonzero level_tiles glyph
// in a fresh capture of probe-containers/gen001 after glyph 0 (STONE),
// confirming both the constant and that this session actually carries
// remembered-invisible-monster tiles (wave12/glyph-channel, 2026-09-04).
const GLYPH_INVISIBLE = 1532;
// Numeric "as long" coercion mirroring js/mapstate.js asLong() — the
// wire format always carries decimal integers; booleans encode as 0/1.
function asLong(v) {
    if (v === true)
        return 1;
    if (v === false)
        return 0;
    if (v === null || v === undefined)
        return 0;
    const n = Number(v);
    if (!Number.isFinite(n))
        return 0;
    return Math.trunc(n);
}
// Convenience: ensure `game.<chain>` (dotted path) exists as an object
// before assigning into it. Idempotent.
function ensureObj(g, chain) {
    let cur = g;
    for (const seg of chain) {
        if (cur[seg] === undefined || cur[seg] === null)
            cur[seg] = {};
        cur = cur[seg];
    }
    return cur;
}
// Read a nested path, returning undefined if any segment is missing.
function readPath(g, chain) {
    let cur = g;
    for (const seg of chain) {
        if (cur === null || cur === undefined)
            return undefined;
        cur = cur[seg];
    }
    return cur;
}
// ---------------------------------------------------------------------
// SLOT TABLE — one entry per MAPSTATE_SCHEMA key.
//
// Each entry has:
//   read(g):       returns the current value rendered as a string
//   write(g, val): assigns `val` (string) into the game's live slot
//
// Most slots are direct game.u.* mappings; a handful (role/race
// identifiers, the display.* fields, the chain count summaries) have
// no production JS-side slot today, so they live under
// g.__bridge__.<key> as inert placeholder integers. The placeholder
// store is INVISIBLE to the JS port; nothing reads it except this
// bridge.  We isolate it from `game.*` so a porter who adds a real
// slot (e.g. `g.disp = {}` with proper botl tracking) can do so
// without bridging through __bridge__ first.
//
// The reader contract: always return a decimal-string representation
// of an integer (never quoted, never 'true'/'false'). The schema
// stores defaults as e.g. "0", "300", "2" — so e.g. `phase` (a string-
// valued slot from build_mapdump) goes through the placeholder.
//
// The writer contract: callers pass strings (the wire form). Numeric
// slots parse via Number+truncate; string slots store verbatim.
// ---------------------------------------------------------------------
function bridgeSlot(key) {
    return {
        read: (g) => {
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                // Not yet written via apply — fall back to schema default
                // so a fresh game (e.g. immediately after resetGame())
                // round-trips identically to a defaults-only mapstate.
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => {
            if (!g.__bridge__)
                g.__bridge__ = {};
            g.__bridge__[key] = val;
        },
    };
}
// traps.count — unlike fmon.count/fobj.count/invent.count (no JS chain
// exists yet), game.level.traps IS the real chain: t_at/deltrap read/splice
// it and maketrap (js/trap.js) pushes onto it, matching the same convention
// applyTrapsToGame uses to seed it from the "traps" side-channel. A plain
// bridgeSlot placeholder never observes that array, so every trap-creating
// capture spuriously reads back MISSING (the placeholder never leaves its
// apply-time value). Derive the count from the real array when a level (or
// the plain-object level fallback — see project_gamemap_bridge_plainobj_fix)
// carries a traps array; otherwise fall back to the placeholder default,
// unchanged from before, for functions that never touch traps.
// fobj.count — same dead-placeholder class as traps.count above (5th bridge
// gap of this family): game.fobj IS a real linked list now (walked via .nobj
// below at collectChains; dropx/place_object push onto it), but the plain
// bridgeSlot never observes it. Derive when the chain exists.
function fobjCountSlot() {
    const key = 'fobj.count';
    return {
        read: (g) => {
            if (g.fobj !== undefined && g.fobj !== null) {
                let n = 0;
                for (let o = g.fobj; o; o = o.nobj) n++;
                return String(n);
            }
            if (g.fobj === null) return '0';
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = val; },
    };
}

// migrating_objs.count — same dead-placeholder class (7th of this family,
// schema1 2026-07-14): game.migrating_objs IS a real linked list now — the
// replay seeds it from the "migrating_objs" side-channel
// (tools/equiv-test/lib/replay-core.mjs seedMigratingObjsFromCapture) and
// js/dog.js deliver_obj_to_mon splices nodes OFF it into minvent — but the
// plain bridgeSlot never observes the chain, so every delivery capture read
// back MISSING on its migrating_objs.count state_after_diff (15/90
// deliver_obj_to_mon records, schema1 fixture refresh). Derive when the
// chain exists, exactly mirroring fobjCountSlot.
function migratingObjsCountSlot() {
    const key = 'migrating_objs.count';
    return {
        read: (g) => {
            // Prefer the C-shaped gm.* alias (js/dokick.js deliver_obj_to_mon
            // relinks g.gm.migrating_objs); fall back to the flat alias
            // (js/dog.js losedogs). Both are seeded by the replay's
            // seedMigratingObjsFromCapture.
            const head = (g.gm && g.gm.migrating_objs !== undefined)
                ? g.gm.migrating_objs : g.migrating_objs;
            if (head !== undefined && head !== null) {
                let n = 0;
                for (let o = head; o; o = o.nobj) n++;
                return String(n);
            }
            if (head === null) return '0';
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = val; },
    };
}

// fmon.count — the canonical cheatable placeholder this file's own comment
// below named (docs/MEASURE-packet-gate-cheatability-2026-08-09.md): a plain
// bridgeSlot echoed whatever apply wrote and never observed game.fmon, so any
// makemon caller (were_summon 2/2, use_defensive 5/8, wave-5 2026-09-05)
// read MISSING on its post-call fmon.count growth regardless of the port.
// game.fmon IS the real chain: js/mklev.js makemon pushes onto it
// (mon.nmon = game.fmon; game.fmon = mon — makemon.c:1251-1252), relmon /
// mondead splice it, and the replay seeds it from the "fmon" side-channel
// (tools/equiv-test/lib/replay-core.mjs seedFmonFromCapture). Derive when the
// chain exists, exactly mirroring fobjCountSlot — C cmd.c:337-339, the same
// walk js/mapstate.js chainLen(g.fmon, 'nmon') does for the map-dump channel.
function fmonCountSlot() {
    const key = 'fmon.count';
    return {
        read: (g) => {
            if (g.fmon !== undefined && g.fmon !== null) {
                let n = 0;
                for (let m = g.fmon; m; m = m.nmon) n++;
                return String(n);
            }
            if (g.fmon === null) return '0';
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = val; },
    };
}

// migrating_mons.count — same class. game.migrating_mons is a real .nmon
// chain (js/dog.js losedogs / relmon(mtmp, 'migrating_mons') / migrate_to_level
// splice it, mirroring C's gm.migrating_mons); walk it when it exists.
//
// UNLIKE fmon, NO side-channel seeds this chain on replay (there is no
// "migrating_mons" record field — only this count scalar). So the members C
// already had when the record was taken are INVISIBLE to the walk: the chain
// starts undefined, the bridge store holds C's pre-call count, and after the
// port pushes one monster the walk reads 1 where C reads N+1 (use_defensive
// #2: 1->2 in C, MISSING in replay; #3: 2->3 in C, read 1). The walk and the
// store therefore COMPOSE: count = C's seeded baseline + nodes the port
// spliced on. The baseline is exactly the unseen C members, valid as long as
// nothing removes one of them — which the port cannot do (it cannot see them),
// and which C would report as its own count change, an honest divergence
// that names the real gap (a migrating_mons side-channel). In live play
// nothing writes the store, so the baseline is 0 and the walk is the whole
// truth, as before. A future seeder of the chain from a real channel MUST
// delete store[key] (or set store['migrating_mons.chain_seeded']) so the
// baseline is not double-counted.
function migratingMonsCountSlot() {
    const key = 'migrating_mons.count';
    return {
        read: (g) => {
            const head = (g.gm && g.gm.migrating_mons !== undefined)
                ? g.gm.migrating_mons : g.migrating_mons;
            const store = g.__bridge__ || {};
            const seededBaseline = (store[key] !== undefined
                                    && !store['migrating_mons.chain_seeded'])
                ? (Number(store[key]) || 0) : 0;
            if (head !== undefined && head !== null) {
                let n = 0;
                for (let m = head; m; m = m.nmon) n++;
                return String(seededBaseline + n);
            }
            if (head === null) return String(seededBaseline);
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = val; },
    };
}

// invent.count — same dead-placeholder class as fobj.count/traps.count above
// (6th bridge gap of this family): game.invent IS a real linked list (walked
// via .nobj, rebuilt from the "invent" side-channel by applyInventToGame, and
// spliced by dropx's freeinv-equivalent unlink), but the plain bridgeSlot
// never observes it. Derive when the chain exists, exactly mirroring
// fobjCountSlot.
function inventCountSlot() {
    const key = 'invent.count';
    return {
        read: (g) => {
            if (g.invent !== undefined && g.invent !== null) {
                let n = 0;
                for (let o = g.invent; o; o = o.nobj) n++;
                return String(n);
            }
            if (g.invent === null) return '0';
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = val; },
    };
}

function trapsCountSlot() {
    const key = 'traps.count';
    return {
        read: (g) => {
            if (g.level && Array.isArray(g.level.traps)) {
                return String(g.level.traps.length);
            }
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '0';
            }
            return String(v);
        },
        write: (g, val) => {
            if (!g.__bridge__)
                g.__bridge__ = {};
            g.__bridge__[key] = val;
        },
    };
}

// stairs.count — derive the live stairway chain instead of preserving the
// captured placeholder.  This mirrors the other chain-count slots and lets
// stairway_free_all() be observed by replay.
function stairsCountSlot() {
    const key = 'stairs.count';
    return {
        read: (g) => {
            let n = 0;
            for (let s = g.stairs; s; s = s.next)
                n++;
            if (n || g.stairs === null)
                return String(n);
            const store = g.__bridge__ || {};
            const v = store[key];
            return v === undefined ? '0' : String(v);
        },
        write: (g, val) => {
            if (!g.__bridge__)
                g.__bridge__ = {};
            g.__bridge__[key] = val;
        },
    };
}
// hero.ustuck_m_id (wave15/harness, 2026-09-05, TASK A) — u.ustuck (uhitm.c
// attack_checks' engulfing_u(mtmp): u.uswallow && u.ustuck == mtmp) is a
// MONSTER POINTER, captured as the stable m_id of the monster (-1 = C NULL).
// Same real-slot exception as hero.hero_seq above: game.u.ustuck IS the
// production field every port already reads/writes (js/mklev.js:15597
// set_ustuck()), so READ derives from it directly rather than a bridge
// placeholder, once it exists.
//
// WRITE cannot resolve the id to a live reference at apply time: this slot's
// write() runs inside applyMapstateToGame(), which fires BEFORE the fmon
// side-channel is seeded (tools/equiv-test/lib/replay-core.mjs
// seedFmonFromCapture runs strictly after loadGameFromMapstate calls
// applyMapstateToGame). So write() stashes the raw id in the __bridge__
// placeholder store, exactly like fobjCountSlot/trapsCountSlot do before
// their real chain exists; replay-core's seedUstuckFromCapture() resolves it
// into game.u.ustuck via findMonstById() once fmon has been built, and
// spliceMonstArg() keeps it correct if the same monster is later spliced in
// as a reconstructed function argument (see replay-core.mjs comments).
//
// Real gameplay is unaffected either way: nothing here overrides
// set_ustuck()'s own writes to game.u.ustuck; this slot only round-trips
// state for the replay harness.
function ustuckMidSlot() {
    const key = 'hero.ustuck_m_id';
    return {
        read: (g) => {
            if (g.u && Object.prototype.hasOwnProperty.call(g.u, 'ustuck')) {
                const m = g.u.ustuck;
                if (m && typeof m === 'object') {
                    const id = Number(m.m_id);
                    return String(Number.isFinite(id) ? (id | 0) : -1);
                }
                return '-1'; // explicitly cleared / no monster
            }
            // Not yet resolved (mid-apply, before replay-core's post-fmon
            // seed step) — read the stashed raw id, or the schema default.
            const store = g.__bridge__ || {};
            const v = store[key];
            if (v === undefined) {
                const def = MAPSTATE_SCHEMA.find(e => e.key === key);
                return def ? def.default : '-1';
            }
            return String(v);
        },
        write: (g, val) => { (g.__bridge__ = g.__bridge__ || {})[key] = String(asLong(val)); },
    };
}
// rect.cnt -> game.rect_cnt (js/rect.js). rnd_rect() indexes
// game.nhrect[rn2(game.rect_cnt)], and after resetGame() game.nhrect is
// undefined, so a write of n>0 also guarantees an nhrect array of length
// >= n holding {lx,ly,hx,hy} placeholders (the capture does not carry the
// rectangle list itself -- only its count and the returned rectangle).
function rectCntSlot() {
    return {
        read: (g) => String(asLong(g.rect_cnt ?? 0)),
        write: (g, val) => {
            const n = asLong(val);
            g.rect_cnt = n;
            if (n > 0) {
                if (!Array.isArray(g.nhrect))
                    g.nhrect = [];
                for (let i = g.nhrect.length; i < n; i++)
                    g.nhrect.push({ lx: 0, ly: 0, hx: 0, hy: 0 });
            }
        },
    };
}
function longSlot(chain) {
    return {
        read: g => String(BigInt(readPath(g, chain) ?? 0)),
        write: (g, val) => {
            const parent = ensureObj(g, chain.slice(0, -1));
            parent[chain.at(-1)] = BigInt.asIntN(64, BigInt(val));
        },
    };
}
function numSlot(chain) {
    // chain is e.g. ['u', 'uhp']. Reader: walk the path, asLong, stringify.
    // Writer: parse decimal, assign into the leaf (ensuring intermediates exist).
    return {
        read: (g) => String(asLong(readPath(g, chain))),
        write: (g, val) => {
            const parent = ensureObj(g, chain.slice(0, -1));
            parent[chain[chain.length - 1]] = asLong(val);
        },
    };
}
function boolSlot(chain) {
    // Same as numSlot but reader coerces truthy/falsy to 1/0; writer
    // accepts "0"/"1" and stores as a JS boolean (matching C's
    // boolean field shape in struct flag / struct dgn_disp / etc.).
    return {
        read: (g) => {
            const v = readPath(g, chain);
            if (v === true)
                return '1';
            if (v === false || v === null || v === undefined)
                return '0';
            return asLong(v) ? '1' : '0';
        },
        write: (g, val) => {
            const parent = ensureObj(g, chain.slice(0, -1));
            parent[chain[chain.length - 1]] = !!asLong(val);
        },
    };
}
// Attribute slot: stores into u.acurr.a[idx] (and u.amax.a[idx]
// for symmetry with C's init_attr that sets ABASE+AMAX both).
function attrSlot(idx) {
    return {
        read: (g) => {
            const a = g.u && g.u.acurr && g.u.acurr.a;
            return String(asLong(a ? a[idx] : undefined));
        },
        write: (g, val) => {
            if (!g.u)
                g.u = {};
            if (!g.u.acurr)
                g.u.acurr = { a: [0, 0, 0, 0, 0, 0] };
            if (!Array.isArray(g.u.acurr.a))
                g.u.acurr.a = [0, 0, 0, 0, 0, 0];
            g.u.acurr.a[idx] = asLong(val);
        },
    };
}
// wsv-V7: AMAX slot — stores into u.amax.a[idx] (display order, same idx
// mapping as attrSlot). redist_attr (attrib.c:743) reads AMAX(i) and divides
// ABASE by it; without seeding this the JS port divides by 0.
function amaxSlot(idx) {
    return {
        read: (g) => {
            const a = g.u && g.u.amax && g.u.amax.a;
            return String(asLong(a ? a[idx] : undefined));
        },
        write: (g, val) => {
            if (!g.u)
                g.u = {};
            if (!g.u.amax)
                g.u.amax = { a: [0, 0, 0, 0, 0, 0] };
            if (!Array.isArray(g.u.amax.a))
                g.u.amax.a = [0, 0, 0, 0, 0, 0];
            g.u.amax.a[idx] = asLong(val);
        },
    };
}
// 2026-09-05 (wave 4): ATEMP / ABON slots — u.atemp.a[idx] / u.abon.a[idx]
// (attrib.h ATEMP(x)/ABON(x); js/attrib.js getAtemp/getAbon). Both arrays are
// DISPLAY-ordered in JS exactly like u.acurr.a / u.amax.a: js/attrib.js's
// acurr() reads them through C_ATTR_TO_DISP and js/cmd.js's set_wounded_legs
// writes u.atemp.a[C_ATTR_TO_DISP[A_DEX]]. So the keys use the amaxSlot idx
// mapping (str->0 int->3 wis->4 dex->1 con->2 cha->5), NOT the aexe one.
function heroAttrArraySlot(field, idx) {
    return {
        read: (g) => {
            const a = g.u && g.u[field] && g.u[field].a;
            return String(asLong(a ? a[idx] : undefined));
        },
        write: (g, val) => {
            if (!g.u)
                g.u = {};
            if (!g.u[field])
                g.u[field] = { a: [0, 0, 0, 0, 0, 0] };
            if (!Array.isArray(g.u[field].a))
                g.u[field].a = [0, 0, 0, 0, 0, 0];
            g.u[field].a[idx] = asLong(val);
        },
    };
}
const atempSlot = (idx) => heroAttrArraySlot('atemp', idx);
const abonSlot = (idx) => heroAttrArraySlot('abon', idx);
// 2026-09-04: AEXE slot — stores into u.aexe.a[idx], C's exercise accumulator
// (attrib.h AEXE(x) = u.aexe.a[x]; js/attrib.js:62 getAexe).
//
// ORDERING TRAP, and it differs from amaxSlot/attrSlot above: u.acurr.a and
// u.amax.a are DISPLAY-ordered (St Dx Co In Wi Ch), which is why their keys
// remap str->0 int->3 wis->4 dex->1 con->2 cha->5. u.aexe.a is NOT — 
// js/attrib.js's exercise(i) indexes it directly by the C constant
// (A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5), and compares
// `i === A_INT` / `i === A_WIS` against those same values. So these keys map
// straight through in A_* order. Remapping them to display order would put
// Wisdom's accumulator in Dexterity's slot and silently mis-gate every
// exercise() draw.
function aexeSlot(idx) {
    return {
        read: (g) => {
            const a = g.u && g.u.aexe && g.u.aexe.a;
            return String(asLong(a ? a[idx] : undefined));
        },
        write: (g, val) => {
            if (!g.u)
                g.u = {};
            if (!g.u.aexe)
                g.u.aexe = { a: [0, 0, 0, 0, 0, 0] };
            if (!Array.isArray(g.u.aexe.a))
                g.u.aexe.a = [0, 0, 0, 0, 0, 0];
            g.u.aexe.a[idx] = asLong(val);
        },
    };
}

// wsv-V89c: string slot — stores/reads a verbatim string into a game path.
// Used for char-array fields like u.ushops where the value is a plain string,
// not a decimal-encoded integer.
function strSlot(chain) {
    return {
        read: (g) => {
            const v = readPath(g, chain);
            return (v === null || v === undefined) ? '' : String(v);
        },
        write: (g, val) => {
            const parent = ensureObj(g, chain.slice(0, -1));
            parent[chain[chain.length - 1]] = val;
        },
    };
}
const SLOTS = Object.freeze({
    // Header / build_mapdump global block (cmd.c:296-300). These don't
    // correspond to per-instance game fields — `v`, `phase`, `turn`
    // describe the dump itself. The bridge holds them as placeholders
    // so round-trip works; u_init_misc doesn't read them.
    'v': bridgeSlot('v'),
    'phase': bridgeSlot('phase'),
    'turn': {
        read: (g) => String(asLong(g.moves)),
        write: (g, val) => { g.moves = asLong(val); },
    },
    // dungeon block — C maps to u.uz. JS port DOES read u.uz.dlevel
    // (it's set by allmain newgame() prior to mklev), but u_init_misc
    // C-side ASSIGNS u.uz.dlevel = 1 (u_init.c:983) which the JS port
    // does NOT replicate. Bridge round-trips through u.uz.* — that's
    // the real slot.
    'dungeon.dnum': numSlot(['u', 'uz', 'dnum']),
    'dungeon.dlevel': numSlot(['u', 'uz', 'dlevel']),
    // hero block — all live under game.u.*
    'hero.ux': numSlot(['u', 'ux']),
    'hero.uy': numSlot(['u', 'uy']),
    'hero.dx': numSlot(['u', 'dx']),
    'hero.dy': numSlot(['u', 'dy']),
    'hero.dz': numSlot(['u', 'dz']),
    'hero.uhp': numSlot(['u', 'uhp']),
    'hero.uhpmax': numSlot(['u', 'uhpmax']),
    'hero.uen': numSlot(['u', 'uen']),
    'hero.uenmax': numSlot(['u', 'uenmax']),
    'hero.ulevel': numSlot(['u', 'ulevel']),
    'hero.uac': numSlot(['u', 'uac']),
    'hero.uhunger': numSlot(['u', 'uhunger']),
    'hero.uhs': numSlot(['u', 'uhs']),
    // hero.multi → C global gm.multi; JS has no slot today; bridge.
    'hero.multi': bridgeSlot('hero.multi'),
    // hero.context_move → g.context.move (boolean ternary).
    'hero.context_move': boolSlot(['context', 'move']),
    // hero.hero_seq → g.hero_seq (initialized to 8 by resetGame, see
    // gstate.js; mirrors C's gh.hero_seq static init).
    'hero.hero_seq': numSlot(['hero_seq']),
    // hero.umovement → u.umovement (u_init_misc sets to 0).
    'hero.umovement': numSlot(['u', 'umovement']),
    // ABASE attributes — stored under u.acurr.a[0..5] in DISPLAY order.
    // JS u.acurr.a is stored in display order [St,Dx,Co,In,Wi,Ch] (see
    // src/u_init.ts:702-718 init_attr() disp[] permutation — source of truth).
    // Display order: display[0]=St, display[1]=Dx, display[2]=Co,
    //                display[3]=In, display[4]=Wi, display[5]=Ch.
    // C constants:   A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5.
    // These indices MUST be symmetric with js/mapstate.js lines 191-196.
    'hero.str': attrSlot(0), // display[0]=St
    'hero.int': attrSlot(3), // display[3]=In
    'hero.wis': attrSlot(4), // display[4]=Wi
    'hero.dex': attrSlot(1), // display[1]=Dx
    'hero.con': attrSlot(2), // display[2]=Co
    'hero.cha': attrSlot(5), // display[5]=Ch
    // u.uluck, u.ublesscnt — direct game.u.* slots.
    'hero.uluck': numSlot(['u', 'uluck']),
    'hero.ublesscnt': numSlot(['u', 'ublesscnt']),
    // wsv-V5 (2026-06-11): hero trap scalars (uteetering_at_seen_pit) — direct
    // game.u.* slots; the port reads game.u.utrap / game.u.utraptype.
    'hero.utrap': numSlot(['u', 'utrap']),
    'hero.utraptype': numSlot(['u', 'utraptype']),
    // wsv-V7 (2026-06-11): hero AMAX attributes (redist_attr) — u.amax.a in
    // DISPLAY order, same idx mapping as the ABASE attrSlot keys above.
    'hero.amax_str': amaxSlot(0), // St
    'hero.amax_int': amaxSlot(3), // In
    'hero.amax_wis': amaxSlot(4), // Wi
    'hero.amax_dex': amaxSlot(1), // Dx
    'hero.amax_con': amaxSlot(2), // Co
    'hero.amax_cha': amaxSlot(5), // Ch
    // 2026-09-04: hero AEXE exercise accumulators. C's exercise() draws rn2(19)
    // / rn2(2) ONLY while abs(AEXE(i)) < AVAL(50), so an unseeded replay drew
    // where C had already saturated. NOTE these are in C's A_* order, NOT the
    // display order the amax_* keys above use — see aexeSlot's comment.
    'hero.aexe_str': aexeSlot(0), // A_STR
    'hero.aexe_int': aexeSlot(1), // A_INT
    'hero.aexe_wis': aexeSlot(2), // A_WIS
    'hero.aexe_dex': aexeSlot(3), // A_DEX
    'hero.aexe_con': aexeSlot(4), // A_CON
    'hero.aexe_cha': aexeSlot(5), // A_CHA
    // 2026-09-05 (wave 4): hero ATEMP / ABON arrays — acurr() inputs. DISPLAY
    // order, same idx mapping as the amax_* keys (see heroAttrArraySlot).
    'hero.atemp_str': atempSlot(0), // St
    'hero.atemp_int': atempSlot(3), // In
    'hero.atemp_wis': atempSlot(4), // Wi
    'hero.atemp_dex': atempSlot(1), // Dx
    'hero.atemp_con': atempSlot(2), // Co
    'hero.atemp_cha': atempSlot(5), // Ch
    'hero.abon_str': abonSlot(0), // St
    'hero.abon_int': abonSlot(3), // In
    'hero.abon_wis': abonSlot(4), // Wi
    'hero.abon_dex': abonSlot(1), // Dx
    'hero.abon_con': abonSlot(2), // Co
    'hero.abon_cha': abonSlot(5), // Ch
    // wsv-V89 (2026-06-22): hero alignment (can_pray unpark).
    // u.ualign.type (A_CHAOTIC=-1/A_NEUTRAL=0/A_LAWFUL=1) and u.ualign.record.
    'hero.ualign_type':   numSlot(['u', 'ualign', 'type']),
    'hero.ualign_record': numSlot(['u', 'ualign', 'record']),
    // wsv-V89c (2026-06-22): u.ushops — char[5] shop rooms hero occupies now.
    // Read by unpaid_cost (shk.c:3285) to iterate shop rooms via shop_keeper().
    // Empty string = not currently in a shop.
    'hero.ushops':        strSlot(['u', 'ushops']),
    // WS8-prevpos (2026-07-13): hero previous position. u.ux0/u.uy0 are plain
    // coordxy scalars; u.uz0 is a d_level {dnum,dlevel} marshalled as two
    // scalar keys. The port reads game.u.ux0/uy0 (levl[u.ux0][u.uy0].typ,
    // hack.c:3262) and game.u.uz0.{dnum,dlevel} (on_level(&u.uz,&u.uz0)).
    'hero.ux0':        numSlot(['u', 'ux0']),
    'hero.uy0':        numSlot(['u', 'uy0']),
    'hero.uz0_dnum':   numSlot(['u', 'uz0', 'dnum']),
    'hero.uz0_dlevel': numSlot(['u', 'uz0', 'dlevel']),
    // disp7 (2026-07-14): hero polymorph form (Upolyd blind-oracle class).
    // hero.umonnum/umh/umhmax are plain u.* scalars (the ports read
    // game.u.umonnum / u.mh / u.mhmax — js/dochug.js:334, js/attrib.js
    // setuhpmax). hero.upolyd carries C's you.h:554 macro VALUE (u.umonnum !=
    // u.umonster), sampled 0/1.
    //
    // 2026-09-06: this slot USED to read and write u.mtimedone, because the
    // live JS predicate const.js Upolyd(u) was `u.mtimedone > 0`. That was not
    // C's macro (you.h:422 mtimedone is the poly TIMER, a different field —
    // potion.c:1326 tests both), Upolyd is now C's predicate verbatim, and
    // this slot moves with it or replay would answer the question wrongly:
    // u.umonster is NOT in MAPSTATE_SCHEMA, so a replayed game left it
    // undefined and `(u.umonnum|0) !== (u.umonster|0)` would have read
    // TRUE for every non-zero umonnum, i.e. for every replayed hero.
    //
    // What the capture carries is exactly the macro's VALUE plus u.umonnum, so
    // the write side materializes the ONE relation those two determine —
    // u.umonster equal to u.umonnum when not polymorphed, unequal when it is —
    // and nothing more. u.umonster's real VALUE (C: gu.urole.mnum, constant
    // for the whole game) is not captured; a port that needs the role monster
    // itself under replay needs a new scalar, the same caveat this slot has
    // always carried for the mtimedone countdown. u.mtimedone is still seeded
    // for the readers that consult the timer directly (js/display.js status
    // lines, js/com_pager.js, js/restore.js).
    'hero.umonnum':    numSlot(['u', 'umonnum']),
    'hero.upolyd': {
        read: (g) => (g?.u && (g.u.umonnum | 0) !== (g.u.umonster | 0)) ? '1' : '0',
        write: (g, val) => {
            if (!g.u) g.u = {};
            const on = Number(val) ? 1 : 0;
            g.u.mtimedone = on ? (g.u.mtimedone > 0 ? g.u.mtimedone : 1) : 0;
            // Applied in schema-insertion order, so u.umonnum is already set.
            const umonnum = g.u.umonnum | 0;
            g.u.umonster = on ? (umonnum === 0 ? 1 : 0) : umonnum;
        },
    },
    'hero.umh':        numSlot(['u', 'mh']),
    'hero.umhmax':     numSlot(['u', 'mhmax']),
    // schema2 (2026-07-14): occupation PRESENCE (C samples go.occupation !=
    // NULL as 0/1 — the pointer value itself is unportable). JS models the
    // occupation as g.occupation (a function or falsy — js/dig.js:311
    // `g.occupation = dig`, js/mhitu.js:110 stop_occupation reads
    // truthiness). Read side reports truthiness; write side seeds a benign
    // marker function when 1 (the captured paths only TEST and CLEAR it —
    // stop_occupation calls maybe_finished_meal/nomul, never the occupation
    // itself on the dotrap path) and clears to null when 0, preserving any
    // real occupation function already set.
    'hero.occupation': {
        read: (g) => (g && g.occupation) ? '1' : '0',
        write: (g, val) => {
            if (Number(val)) {
                if (!g.occupation) g.occupation = () => 0;
            } else {
                g.occupation = null;
            }
        },
    },
    // Batch-1 (2026-07-15): hero/global scalar mutators. more_experienced
    // writes u.uexp/u.urexp (js/uhitm.js:864); setuwep writes top-level
    // g.unweapon (js/cmd.js:5870); set_twoweap writes u.twoweap boolean;
    // set_uinwater writes u.uinwater 0/1. Key-based — order does not matter.
    'hero.uexp': longSlot(['u', 'uexp']),
    'hero.urexp': longSlot(['u', 'urexp']),
    'hero.unweapon': boolSlot(['unweapon']),
    'hero.twoweap': boolSlot(['u', 'twoweap']),
    'hero.uinwater': numSlot(['u', 'uinwater']),
    // wave15/harness (2026-09-05, TASK A) — see ustuckMidSlot() above.
    'hero.ustuck_m_id': ustuckMidSlot(),
    // wave15/harness (2026-09-05, coordinator-reported): plain scalars, real
    // production slots (game.u.usleep / game.u.uinvulnerable) already read
    // by js/mhitu.js — a direct numSlot mapping like hero.uswallow above.
    'hero.usleep': numSlot(['u', 'usleep']),
    'hero.uinvulnerable': numSlot(['u', 'uinvulnerable']),
    // harness (2026-09-05): gl.lastinvnr -> game._lastinvnr, the real slot the
    // assigninvlet ports read (see mapstate_schema.js). A numSlot, so an old
    // fixture lacking the key writes NOTHING and the ports' `?? 51` fallback
    // is unchanged there — only a fixture that captured it seeds the cursor.
    'hero.lastinvnr': numSlot(['_lastinvnr']),
    // harness (2026-09-05): rnd_rect()'s capture_extra_int suffix keys.
    // rect.cnt -> game.rect_cnt (real slot, js/rect.js). rect.ret.* are
    // C's returned rectangle -- a return descriptor, not game state -- so
    // they stay __bridge__ placeholders.
    'rect.cnt': rectCntSlot(),
    'rect.ret.lx': bridgeSlot('rect.ret.lx'),
    'rect.ret.ly': bridgeSlot('rect.ret.ly'),
    'rect.ret.hx': bridgeSlot('rect.ret.hx'),
    'rect.ret.hy': bridgeSlot('rect.ret.hy'),
    // display block — C maps to global `disp`. JS port has NO g.disp
    // today; the bridge writes/reads through g.disp.* as placeholder
    // slots. If u_init_misc's chain-of-calls (init_uhunger sets
    // disp.botl = 1) hasn't been ported, replay extractGameToMapstate
    // returns the apply-time value (still 0), and the runner flags
    // display.botl as a porting gap. That is the intended Cardinal
    // Rule 1 surface.
    'display.botl': boolSlot(['disp', 'botl']),
    'display.botlx': boolSlot(['disp', 'botlx']),
    'display.time_botl': boolSlot(['disp', 'time_botl']),
    'display.toplin': numSlot(['disp', 'toplin']),
    'display.inmore': numSlot(['disp', 'inmore']),
    // chain count summaries — fmon/fobj/invent/traps/migrating_* are REAL
    // chain walks now (see the *CountSlot helpers above); stairs/mydogs/
    // billobjs/objs_deleted remain placeholders.
    'fmon.count': fmonCountSlot(),                     // harness 2026-09-05: real g.fmon walk
    'fobj.count': fobjCountSlot(),
    'invent.count': inventCountSlot(),
    'traps.count': trapsCountSlot(),
    'stairs.count': stairsCountSlot(),
    // WS6d (2026-07-06): level-transfer chain counts — placeholders, same
    // as the counts above. A recaptured migration fn (obj_delivery, ...)
    // whose C state_after_diff now carries migrating_objs.count 0->1 stays
    // RED here until the port builds the chain (placeholder never moves);
    // that vacuous→red-for-real flip is the intended compensation-removal.
    'migrating_objs.count': migratingObjsCountSlot(), // schema1: real chain seeded now
    'migrating_mons.count': migratingMonsCountSlot(), // harness 2026-09-05: real chain walk
    'mydogs.count': bridgeSlot('mydogs.count'),
    'billobjs.count': bridgeSlot('billobjs.count'),
    'objs_deleted.count': bridgeSlot('objs_deleted.count'),
    // T5.5 appendix — role/race/align/gender. The JS port reads
    // g.flags.init* (numSlot below). role.mnum / race.mnum are
    // derived identifiers C sets via init_role() (role.c:1037)
    // which the JS port has not yet wired up — bridge round-trips
    // them through g.urole.mnum / g.urace.mnum placeholder slots.
    'role.mnum': numSlot(['urole', 'mnum']),
    'race.mnum': numSlot(['urace', 'mnum']),
    'flags.initrole': numSlot(['flags', 'initrole']),
    'flags.initrace': numSlot(['flags', 'initrace']),
    'flags.initgend': numSlot(['flags', 'initgend']),
    'flags.initalign': numSlot(['flags', 'initalign']),
    'flags.female': numSlot(['flags', 'female']),
    // 2026-09-04: gameplay OPTION flags. Only the chargen flags.init* keys were
    // captured; the options that GATE BEHAVIOUR were not, so an isolated replay
    // read every one as undefined. Measured: pickup's oracle records diverged on
    // invent_delta because `autopickup && !g.flags?.pickup` always evaluated
    // true. flags.pickup_types is a STRING (char[MAXOCLASSES], the object
    // classes to autopickup), not a scalar — strSlot, not numSlot.
    'flags.pickup': numSlot(['flags', 'pickup']),
    'flags.pickup_thrown': numSlot(['flags', 'pickup_thrown']),
    'flags.pickup_stolen': numSlot(['flags', 'pickup_stolen']),
    'flags.nopick_dropped': numSlot(['flags', 'nopick_dropped']),
    'flags.mention_decor': numSlot(['flags', 'mention_decor']),
    'flags.verbose': numSlot(['flags', 'verbose']),
    'flags.showexp': numSlot(['flags', 'showexp']),
    'flags.debug': numSlot(['flags', 'debug']),
    'hero.uswallow': numSlot(['u', 'uswallow']),
    'hero.ugangr': numSlot(['u', 'ugangr']),
    'hero.ulycn': numSlot(['u', 'ulycn']),
    'flags.showscore': numSlot(['flags', 'showscore']),
    'flags.pickup_burden': numSlot(['flags', 'pickup_burden']),
    'flags.sortloot': numSlot(['flags', 'sortloot']),
    'flags.pickup_types': strSlot(['flags', 'pickup_types']),
    'uroleplay.blind': numSlot(['u', 'uroleplay', 'blind']),
    // harness (2026-09-05): u.uroleplay.deaf + flags.acoustics -- the two
    // remaining inputs of sounds.c:206's `Deaf || !flags.acoustics` guard
    // (js/fastforward.js dosounds_rng reads u.uroleplay.deaf and
    // `game.flags.acoustics === false`, so acoustics is a boolSlot). Appended
    // at the END of the C SCHEMA (4-mirror: patch 010 getter+SCHEMA+setter+
    // SETTERS, js/mapstate_schema.js).
    'uroleplay.deaf': numSlot(['u', 'uroleplay', 'deaf']),
    'flags.acoustics': boolSlot(['flags', 'acoustics']),
    // harness (2026-09-05, wave-9 doeat): iflags.menu_requested -- the 'm'
    // command prefix, read as `g.iflags.menu_requested` by js/eat.js
    // floorfood, js/shk.js dopay, js/cmd.js doorganize/dovanquished/
    // dooverview. C: struct instance_flags iflags (flag.h:341), boolean.
    // Appended at the END of the C SCHEMA (4-mirror).
    'iflags.menu_requested': boolSlot(['iflags', 'menu_requested']),
    // Wave-11.4 (2026-05-17): context.ident — svc.context.ident in C;
    // g.context.ident in JS (set by next_ident() calls in mklev.js / dog.js).
    // Capture-probe-only key; not emitted by emitMapstate(). Bridge slot
    // required because the schema validation loop checks all MAPSTATE_KEYS.
    'context.ident': numSlot(['context', 'ident']),
    // 2026-08-09: movement mode. C writes svc.context.run and
    // gd.domove_attempting in set_move_cmd(); JS holds them at g.context.run
    // and g.domove_attempting. These are REAL slots, not bridgeSlot()
    // placeholders — a placeholder would be satisfiable by writing it
    // directly, which is exactly the scaffolding habit fmon.count teaches
    // (see docs/MEASURE-packet-gate-cheatability-2026-08-09.md).
    'context.run': numSlot(['context', 'run']),
    'context.forcefight': numSlot(['context', 'forcefight']),
    // g.gd.domove_attempting, NOT g.domove_attempting: C's gd is a struct and
    // js/cmd.js:10728 mirrors it. Getting this path wrong fails a FAITHFUL port
    // with `domove_attempting MISSING (exp=2 got=null)` — a false red, which is
    // worse than the false green this key was added to fix, because it blocks
    // real work instead of admitting bad work. Caught by testing a correct port
    // against the tightened gate, not just a wrong one.
    'domove_attempting': numSlot(['gd', 'domove_attempting']),
});
// Validate at module load time that every schema key has a slot.
// Drift between the schema and the bridge is a hard error — silently
// missing a key would surface as a "key has no JS analog" mystery at
// replay time, which is the bug the explicit table is designed to
// prevent.
for (const k of MAPSTATE_KEYS) {
    if (!SLOTS[k]) {
        throw new Error(`mapstate_game_bridge: schema key "${k}" has no SLOTS entry; ` +
            `bridge is out of sync with MAPSTATE_SCHEMA`);
    }
}
/**
 * Apply a list of {key, val} entries to the live `game` object. Calls
 * resetGame() first so the game starts from a clean slate (the same
 * state any post-fresh-fork capture began from). Unknown keys throw —
 * unknown keys can only mean the schema and bridge are out of sync,
 * which is a hard error worth catching.
 *
 * @param {Array<{key: string, val: string}>} entries  - mapstate key/val pairs
 * @param {Array<{x,y,typ,flags,lit,roomno}>|null} [levelTiles] - optional level
 *   tile snapshot from capture record's "level_tiles" field.  When supplied,
 *   game.level is initialised as a fresh GameMap (all STONE) and then each
 *   tile entry is written into game.level.locations[x][y].  Functions that
 *   READ levl[][] (dig_corridor, place_object, etc.) require this; pure
 *   function captures (rndexp, etc.) pass null/undefined and game.level
 *   stays undefined (same behaviour as before this feature).
 * @param {object|null} [worn] - optional worn-gear snapshot from the capture
 *   record's "worn" field (capture-schema-spec §3.1).  Shape:
 *   { uspellprot, uarm:{present,otyp,a_ac,spe,oeroded,oeroded2}, uarmc:{...}, ... }.
 *   When supplied, each worn slot is rebuilt as a small obj on game.u[slot]
 *   so find_ac sees the worn armor C had.  Absent/null → slots stay unset
 *   (find_ac then computes the bare base AC, as before this feature).
 * @param {Array<{tx,ty,ttyp,madeby_u,tseen}>|null} [traps] - optional traps-list
 *   snapshot from the capture record's "traps" field (capture-schema-spec §3.2).
 *   When supplied, game.level.traps is populated so t_at()/mintrap see the
 *   real traps.  Absent/null → game.level.traps stays as-is.
 *
 * Returns the live `game` reference for convenience; callers usually
 * ignore it (the side effect on the module-global is what they want).
 */
export function applyMapstateToGame(entries, levelTiles, worn, traps, invent,
                                    inventOnames) {
    if (!Array.isArray(entries)) {
        throw new TypeError(`applyMapstateToGame expected an array, got ${typeof entries}`);
    }
    resetGame();
    // After resetGame, `game` is a fresh {} (with hero_seq=8).  Walk
    // the entries and dispatch each to its slot writer.  Apply in
    // schema-insertion order if the caller passed full state_before
    // (the captured records do), so any intra-write dependencies
    // (e.g. ensureObj for chained slots) settle naturally.
    for (const e of entries) {
        if (!e || typeof e.key !== 'string') {
            throw new TypeError(`applyMapstateToGame entry missing string key: ${JSON.stringify(e)}`);
        }
        const slot = SLOTS[e.key];
        if (!slot) {
            throw new Error(`applyMapstateToGame: unknown key "${e.key}" (not in MAPSTATE_SCHEMA)`);
        }
        slot.write(game, e.val);
    }
    // Restore level tile state when a tile snapshot was captured.
    // C's levl[][] is indexed [x][y]; JS GameMap.locations is the same.
    // We create a fresh all-STONE GameMap (same as C's clear_level_structures)
    // and overlay only the non-STONE cells listed in levelTiles.  The flags,
    // lit, and roomno fields are the minimum needed by dig_corridor and the
    // sp_lev internals that follow similar patterns.
    if (Array.isArray(levelTiles) && levelTiles.length > 0) {
        game.level = new GameMap();
        for (const t of levelTiles) {
            const loc = game.level.at(t.x, t.y);
            if (!loc)
                continue; // out-of-bounds — skip defensively
            loc.typ = t.typ | 0;
            loc.flags = t.flags | 0;
            loc.lit = !!t.lit;
            loc.roomno = t.roomno | 0;
            // wave12/glyph-channel: levl[x][y].glyph (rm.h:160, "what the hero
            // thinks is there") — captured ONLY as of the patch landing this
            // block; absent on every capture recorded before it (`t.glyph ===
            // undefined`), which must leave replay behaviour unchanged. When
            // present and equal to GLYPH_INVISIBLE, mirror EXACTLY the shape
            // map_invisible() (js/display.js) writes into hero memory — same
            // fields, same values — so glyph_is_invisible_at() (which tests
            // loc.remembered_glyph?.ch === 'I') reads true on replay the same
            // way it would after a live map_invisible() call. Any other
            // captured glyph value is a terrain/object glyph already carried
            // by typ/flags/roomno above and is not modelled here.
            if (t.glyph !== undefined && (t.glyph | 0) === GLYPH_INVISIBLE) {
                loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false,
                                         cls: GLYPHCLS_INVIS };
            }
        }
    }
    // Restore worn gear (capture-schema-spec §3.1) so find_ac sees the armor
    // C had on.  The C recorder emits a_ac as objects[otyp].a_ac (the class
    // default ARM_BONUS multiplies), matching js/do_wear.js armBonus's
    // obj.a_ac read.  Each present slot becomes a minimal obj on game.u[slot];
    // absent slots are left unset (null) so the find_ac `if (u.uarm)` guards
    // skip them, exactly as C's `if (uarm)` skips a NULL global.
    if (worn && typeof worn === 'object') {
        applyWornToGame(worn);
    }
    // ws6g: Restore the hero gi.invent obj-chain from the "invent" side-channel
    // (docs/DECOMP-near_capacity.md / DECOMP-autokey). The flat mapstate captures
    // gi.invent only as the scalar 'invent.count', so game.invent replayed EMPTY
    // and the weight/encumbrance family + autokey saw a blind oracle. Rebuild the
    // nobj-linked chain in captured (head-first) order so those pure-of-chain
    // functions read C's real inventory. No-op when invent is absent/null
    // (pre-ws6g captures) or "" (empty inventory → game.invent stays null == C NULL).
    if (typeof invent === 'string') {
        // inventOnames (optional, 2026-09-06): the "invent_onames" side-channel
        // {"<o_id>":"<oname>"} for the chain's NAMED nodes; absent/null on
        // older captures (then a named node's oextra.oname stays a self-
        // reporting gap, exactly as before).
        applyInventToGame(invent, inventOnames ?? null);
    }
    // Restore the traps list (capture-schema-spec §3.2) so t_at()/mintrap see
    // the real traps.  Built onto game.level (creating a fresh GameMap if no
    // level_tiles snapshot already made one).
    if (Array.isArray(traps) && traps.length > 0) {
        applyTrapsToGame(traps);
    }
    return game;
}

// Rebuild worn-gear objects on game.u from the capture record's "worn" field.
// Slot names match the C decl.h:94 globals (uarm/uarmc/uarmh/uarmf/uarms/
// uarmg/uarmu/uleft/uright/uamul). Mirrors the C find_ac state.
/* LOCKSTEP: tools/equiv-test/lib/replay-core.mjs carries its OWN copy of this
 * list. The two DRIFTED — 'ublindf' was added there on 2026-09-04 and never
 * here, so applyWornToGame() never seeded game.u.ublindf from a mid-game
 * capture, and C's eyewear guards (do_wear.c:1544,1630), which key on object
 * IDENTITY against ublindf, were dead in replay. Measured on doremring: every
 * remaining actionable divergence was the hero removing worn eyewear.
 * patches/010-capture-surface.patch DOES emit the slot (WORN_SLOTS 11); only
 * this consumer was missing. Keep the two lists in sync. */
const WORN_SLOT_NAMES = ['uarm', 'uarmc', 'uarmh', 'uarmf', 'uarms',
                         'uarmg', 'uarmu', 'uleft', 'uright', 'uamul',
                         'ublindf'];
function applyWornToGame(worn) {
    if (!game.u) game.u = {};
    for (const name of WORN_SLOT_NAMES) {
        const slot = worn[name];
        if (slot && slot.present) {
            game.u[name] = {
                otyp: asLong(slot.otyp),
                a_ac: asLong(slot.a_ac),
                spe: asLong(slot.spe),
                oeroded: asLong(slot.oeroded),
                oeroded2: asLong(slot.oeroded2),
                // wsv-V89c: o_id + owornmask for which_armor/some_armor return
                // canonicalization. o_id is an unsigned 32-bit integer.
                o_id: slot.o_id !== undefined ? (slot.o_id >>> 0) : 0,
                owornmask: asLong(slot.owornmask !== undefined ? slot.owornmask : 0),
            };
        }
        else {
            // Not worn — leave the slot null so `if (u.<slot>)` skips it
            // (C's NULL global). resetGame() left it unset; be explicit.
            game.u[name] = null;
        }
    }
    // u.uspellprot — find_ac reads it (do_wear.c:2497). Default 0 at post_init,
    // but capture the real value so mid-game find_ac is faithful.
    if (worn.uspellprot !== undefined) {
        game.u.uspellprot = asLong(worn.uspellprot);
    }
    // ws6g (DECOMP-find_ac): the two non-worn find_ac inputs. base_ac =
    // mons[u.umonnum].ac (base-form AC; the JS port hardcoded 10). uintrinsicprot
    // = (HProtection&INTRINSIC)?u.ublessed:0 (intrinsic-Protection term). Seeded
    // onto game.u.uac_base / game.u.uintrinsicprot for the find_ac re-port to read
    // instead of the 10 literal. Guarded so pre-ws6g captures are byte-identical.
    if (worn.base_ac !== undefined) {
        game.u.uac_base = asLong(worn.base_ac);
    }
    if (worn.uintrinsicprot !== undefined) {
        game.u.uintrinsicprot = asLong(worn.uintrinsicprot);
    }
}

// ws6g: Rebuild game.invent (the hero carried-object chain) from the "invent"
// side-channel string. Nodes are plain objects linked via nobj in captured
// (head-first) order, carrying the OBJ_CHAIN_FIELD_ORDER fields (o_id/otyp/quan/
// oclass/spe/owt/...). Mirrors seedLevelObjectsFromCapture's chain build for the
// floor "objects" channel. An empty string → no nodes → game.invent left null
// (== C's NULL gi.invent).
function applyInventToGame(inventStr, onames = null) {
    const nodes = parseObjChainString(inventStr, onames);
    if (!nodes || nodes.length === 0) {
        game.invent = null;
        return;
    }
    let head = null, prev = null;
    for (const n of nodes) {
        // Mark as a chain node (carries only the OBJ_CHAIN_FIELD_ORDER encoded
        // subset — no bknown/cursed/oextra/...). A function that RETURNS an
        // invent node (e.g. autokey → a SKELETON_KEY/CREDIT_CARD obj) then
        // canonicalizes its return by o_id in replay-core instead of a full-field
        // subset compare that would spuriously flag the uncaptured fields.
        const obj = markChainNode({ ...n, nobj: null });
        if (head === null) head = obj; else prev.nobj = obj;
        prev = obj;
    }
    game.invent = head;
}

// Rebuild the level traps list from the capture record's "traps" field.
// t_at (js/trap.js) walks game.level.traps matching tx/ty; mintrap then reads
// ttyp/madeby_u/tseen. Field shape matches struct trap *'s captured set plus
// madeby_u/tseen.
function applyTrapsToGame(traps) {
    if (!game.level) game.level = new GameMap();
    game.level.traps = traps.map(t => {
        const node = {
            tx: asLong(t.tx),
            ty: asLong(t.ty),
            ttyp: asLong(t.ttyp),
            madeby_u: asLong(t.madeby_u),
            tseen: asLong(t.tseen),
        };
        // harness (2026-09-05, wave-1 mintrap): launch/launch2/once/dst — the
        // ROLLING_BOULDER_TRAP arm reads trap.launch.{x,y}/trap.launch2.{x,y}
        // (js/trap.js trapeffect_rolling_boulder_trap_mon -> launch_obj) and
        // replayed sobj_at(BOULDER,0,0) without them. Present only on captures
        // taken after patch 010 grew the traps[] node; an older record leaves
        // them ABSENT (undefined), exactly as before this change, so the
        // `trap.launch?.x | 0` readers behave identically on old fixtures.
        // C aliases: teledest == launch (trap.h:23); launch_otyp/conjoined/
        // tnote share launch2's bytes (trap.h:11-16) — decode from launch2.
        if (t.launch_x !== undefined) {
            node.launch = { x: asLong(t.launch_x), y: asLong(t.launch_y) };
            node.teledest = node.launch;
            node.launch2 = { x: asLong(t.launch2_x), y: asLong(t.launch2_y) };
            node.launch_otyp = node.launch2.x;
            node.once = asLong(t.once);
            node.dst = { dnum: asLong(t.dst_dnum), dlevel: asLong(t.dst_dlevel) };
        }
        return node;
    });
}
/**
 * Read the supplied schema keys back from the live `game` object as a
 * list of {key, val} entries in the supplied order. No glob expansion
 * here — callers pass exact keys (typically a subset of MAPSTATE_KEYS
 * or the full list). Unknown keys throw.
 *
 * The reader contract for each slot returns a string already, so the
 * output entries' `val` is always a string — matching the wire shape
 * the captures file uses.
 */
export function extractGameToMapstate(keys) {
    if (!Array.isArray(keys)) {
        throw new TypeError(`extractGameToMapstate expected an array of keys, got ${typeof keys}`);
    }
    const out = [];
    for (const k of keys) {
        if (typeof k !== 'string') {
            throw new TypeError(`extractGameToMapstate: keys must be strings, got ${typeof k}`);
        }
        const slot = SLOTS[k];
        if (!slot) {
            throw new Error(`extractGameToMapstate: unknown key "${k}" (not in MAPSTATE_SCHEMA)`);
        }
        out.push({ key: k, val: slot.read(game) });
    }
    return out;
}
/**
 * Convenience: extract ALL 49 schema keys in schema-insertion order.
 * Used by the runner to assert "no unexpected slot changed" — the
 * difference between this dump and the applied state_before must
 * exactly equal the captured state_after_diff.
 */
export function extractAllGameToMapstate() {
    return extractGameToMapstate(MAPSTATE_KEYS.slice());
}

// ─── Chain-lookup helpers (Layer B, Wave 6) ──────────────────────────────────
//
// Walk the in-game fobj / fmon chains (loaded by applyMapstateToGame via the
// scalar counts) to find a specific object or monster by its stable ID. Used
// by the generic replay oracle when chain-lookup mode is available (i.e. when
// the capture record carries an o_id or m_id field extracted from the struct).
//
// These operate on the module-global `game` mutated by applyMapstateToGame;
// callers must call applyMapstateToGame first.
//
// Returns the JS object/monst node, or null if not found.

export function findObjById(o_id) {
    if (o_id == null || !game) return null;
    // Walk the fobj chain first
    for (let o = game.fobj; o; o = o.nobj) {
        if (o.o_id === o_id || o.o_id == o_id) return o;
    }
    // Walk invent chain
    for (let o = game.invent; o; o = o.nobj) {
        if (o.o_id === o_id || o.o_id == o_id) return o;
    }
    return null;
}

export function findMonstById(m_id) {
    if (m_id == null || !game) return null;
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C find_mid (light.c:376) disregards a dead monster */
        if (m.m_id === m_id || m.m_id == m_id) return m;
    }
    return null;
}

// gbuf_glyphs (wave15/harness, 2026-09-05, TASK B) — the TRANSIENT SCREEN
// BUFFER (C's gg.gbuf, read by display.c's glyph_at()), captured by
// patches/010-capture-surface.patch capture_emit_gbuf_glyphs() as a
// compacted [{x,y,glyph}, ...] list (cells matching the snapshot's own
// MODAL glyph omitted -- gbuf has no fixed default the way levl[][] does;
// see capture_emit_gbuf_glyphs's C-side comment for why a fixed value was
// wrong on the first cut).
// Distinct from level_tiles' levl[][].glyph (hero MEMORY, applied above by
// applyMapstateToGame into loc.remembered_glyph): uhitm.c's attack_checks()
// tests ONLY glyph_at() -- the "levl[][].glyph" line in its own C source
// sits inside a commented-out dead-code block (context.forcefight's stale
// comment), not a live second test. js/uhitm.js's do_attack has no separate
// gbuf hook of its own (a single glyph_is_invisible_at(bx,by) call stands
// in for the whole vector), so js/display.js's glyph_is_invisible_at() is
// extended (see there) to consult this side-channel FIRST for a covered
// cell, falling back to hero memory for every cell this channel does not
// cover -- which, since gbuf_glyphs is populated only by do_attack's
// capture today, is every OTHER call site and every record predating this
// feature. Real gameplay never populates game.__gbuf__, so
// glyph_is_invisible_at's behaviour there is completely unchanged.
//
// Stored as a flat {"x,y": glyph} map on game.__gbuf__ rather than on
// game.level, so it works even for a record that captures gbuf_glyphs
// without (or before) level_tiles having created game.level.
export function applyGbufGlyphsToGame(gbufGlyphs) {
    if (!game) return;
    if (!Array.isArray(gbufGlyphs) || gbufGlyphs.length === 0) {
        game.__gbuf__ = null;
        return;
    }
    const store = {};
    for (const c of gbufGlyphs) {
        if (!c) continue;
        const x = Number(c.x), y = Number(c.y), glyph = Number(c.glyph);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(glyph))
            continue;
        store[`${x | 0},${y | 0}`] = glyph | 0;
    }
    game.__gbuf__ = store;
}
