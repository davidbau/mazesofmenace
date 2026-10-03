// @ts-nocheck
// mapstate.js — JS-side structural-state dumper, mirroring the C
// nethack-c/src/cmd.c:288-547.
//
// v2 scope: emits ~35 scalar fields in C insertion order, matching the
// non-grid portion of build_mapdump() (everything before the per-monster /
// per-object / per-trap / per-stair iteration loops, plus the .count
// fields for each chain). The 80×21 levl.* grids are intentionally NOT
// emitted yet — they're costly and we want schema breadth first.
//
// Where the JS port does not yet populate a value on `g.*`, we emit
// `key=?` as the value. The literal "?" appears in the payload (so the
// hash still covers all field names in the right order) and the dev
// runner surfaces these as `c_value=<real>, js_value="?"` divergences,
// which downstream tooling can route as "port_struct_field" tasks. The
// set of emitted-as-? keys is collected in _uncomputableKeys and
// exposed via getUncomputableKeys() for aggregation.
//
// The wire format is one line per field, "key=value\n" for numbers and
// 'key="value"\n' for strings — matching the C pb_num / pb_str helpers.
// The FNV-1a 64-bit hash is computed over the concatenated payload.
//
// Each detail line is pushed as a "^md.<key>=<val>" entry via
// pushRngLogEntry (matching event_log("md.%s", ...) in cmd.c:541), and the
// wrapper line is pushed as
//   "^mapstate[v=2 turn=N hash=H len=L dump=1]"
// matching event_log("mapstate[v=2 turn=%ld hash=%016llx len=%d dump=1]",
// ...) in cmd.c:530.
//
// Both prefixes start with "^" and are filtered out of RNG / event
// comparison by frozen and dev runners (see extractRngCalls /
// extractEvents — they exclude "^mapstate" and "^md." lines).
import { game } from './gstate.js';
import { pushRngLogEntry } from './rng.js';
import { MAPSTATE_SCHEMA, expandGlobs } from './mapstate_schema.js';
import { COLNO, ROWNO } from './const.js';
const FNV1A_OFFSET = 14695981039346656037n;
const FNV1A_PRIME = 1099511628211n;
const U64_MASK = 0xffffffffffffffffn;
// Sentinel used in payload for fields the JS port can't source yet. The
// literal token appears verbatim in the wire payload (key=?\n), so the
// hash differs from C until the field is genuinely ported.
const UNCOMP = '?';
// Module-local set of unique keys we fell back on this run. Cleared at
const _uncomputableKeys = new Set();
export function getUncomputableKeys() {
    return Array.from(_uncomputableKeys);
}
// FNV-1a 64-bit over a JS string, treating its bytes as the unsigned-char
// stream the C side hashes. Restricted to ASCII content — the C dumper
// only emits printable ASCII for keys and integer values, so charCodeAt
// suffices.
function fnv1a64(str) {
    let h = FNV1A_OFFSET;
    for (let i = 0; i < str.length; i++) {
        h = (h ^ BigInt(str.charCodeAt(i) & 0xFF)) * FNV1A_PRIME;
        h &= U64_MASK;
    }
    return h;
}
// Format a uint64 as a zero-padded 16-char lowercase hex string,
// matching C's "%016llx" specifier used in event_log("mapstate[... hash=%016llx ...").
function hex16(u64) {
    const s = u64.toString(16);
    return s.length >= 16 ? s : '0'.repeat(Math.max(0, 16 - s.length)) + s;
}
// Coerce undefined / null / boolean / numeric to the long integer the
// C dumper would emit. Mirrors `pb_num(b, key, (long) value)` semantics:
// booleans become 1/0, missing fields become 0.
function asLong(v) {
    if (v === true)
        return 1;
    if (v === false)
        return 0;
    if (v === null || v === undefined)
        return 0;
    // truncate toward zero like (long) cast in C
    const n = Number(v);
    if (!Number.isFinite(n))
        return 0;
    return Math.trunc(n);
}
// Emit a "key=value" line. Missing values fall back to 0 — matches C
// struct zero-init semantics for fields the JS port hasn't yet wired
// up but which C also defaults to 0.
function pushNum(lines, key, value) {
    lines.push(`${key}=${asLong(value)}`);
}
// Emit "key=?" for a field the JS port genuinely cannot source today.
// The literal `?` token appears in the wire payload, so the hash diverges
// from C at this field, and the dev runner surfaces it as a `js_value="?"`
function pushUnknown(lines, key) {
    _uncomputableKeys.add(key);
    lines.push(`${key}=${UNCOMP}`);
}
// Same as pushNum but for booleans: 0/1, never `?` (booleans are easy
// to default). Used for explicit ternary fields in C.
function pushBool(lines, key, value) {
    if (value === undefined || value === null) {
        lines.push(`${key}=0`);
    }
    else {
        lines.push(`${key}=${value ? 1 : 0}`);
    }
}
// Count nodes in a `.next` (or named-link) linked list. Returns 0 for
// null/undefined head.
function chainLen(head, linkField) {
    let n = 0;
    for (let p = head; p; p = p[linkField])
        n++;
    return n;
}
// Emit the v2 structural state snapshot. Phase is a short label like
// "post_init", "pre_turn", etc. Returns nothing — output goes through
// pushRngLogEntry into the rng log, where the dev runner picks it up.
export function emitMapstate(phase) {
    _uncomputableKeys.clear();
    const g = game;
    const u = g.u || {};
    const uz = u.uz || {};
    const acurr = u.acurr || {};
    const acurr_a = Array.isArray(acurr.a) ? acurr.a : null;
    const turn = asLong(g.moves);
    // Build the canonical payload exactly as build_mapdump() would.
    // Order MUST match C insertion order for hash equality and for the
    // field-level diff walk in computeFirstStateDivergence (it iterates
    // Object.keys(c.fields) in C-insertion order — see
    const lines = [];
    lines.push(`v=2`);
    lines.push(`phase="${phase || 'turn'}"`);
    lines.push(`turn=${turn}`);
    lines.push(`dungeon.dnum=${asLong(uz.dnum)}`);
    lines.push(`dungeon.dlevel=${asLong(uz.dlevel)}`);
    // C cmd.c:302-326 — hero block. Fields not explicitly marked
    // uncomputable default to 0 via pushNum (matching C struct
    // zero-init for any not-yet-set field). pushUnknown emits a
    // literal "?" so the dev runner surfaces a (c_value=N, js_value="?")
    // bug board entry for fields the JS port can't source today.
    pushNum(lines, 'hero.ux', u.ux);
    pushNum(lines, 'hero.uy', u.uy);
    pushNum(lines, 'hero.dx', u.dx);
    pushNum(lines, 'hero.dy', u.dy);
    pushNum(lines, 'hero.dz', u.dz);
    pushNum(lines, 'hero.uhp', u.uhp);
    pushNum(lines, 'hero.uhpmax', u.uhpmax);
    pushNum(lines, 'hero.uen', u.uen);
    pushNum(lines, 'hero.uenmax', u.uenmax);
    pushNum(lines, 'hero.ulevel', u.ulevel);
    pushNum(lines, 'hero.uac', u.uac);
    pushNum(lines, 'hero.uhunger', u.uhunger);
    pushNum(lines, 'hero.uhs', u.uhs);
    // gm.multi in C — global, not on u. JS has no analog yet (default 0).
    pushNum(lines, 'hero.multi', g.multi);
    // svc.context.move — bool in C, ternary'd. In JS g.context.move.
    pushBool(lines, 'hero.context_move', g.context ? g.context.move : undefined);
    // gh.hero_seq — global hero sequence counter. C ref: decl.c:394
    // initializes gh.hero_seq = 1L<<3 = 8 via g_init_h; allmain.c:311
    // rewrites to `svm.moves << 3` and :451 bumps `hero_seq++` once per
    // hero move inside moveloop(). At post_init no increments have fired,
    // so the value is the static-init constant 8. Sourced from g.hero_seq,
    // set by resetGame() in gstate.js.
    pushNum(lines, 'hero.hero_seq', g.hero_seq);
    // u.umovement — movement-points counter, short in C.  Zero at post_init:
    // u_init_misc()'s memset(&u,0,...) zeros it (u_init.c:954), and
    // moveloop_preamble()'s u.umovement = NORMAL_SPEED assignment
    // (allmain.c:85) fires only after newgame() returns — so it has not yet
    // Initialized to 0 in u_init.ts u_init_misc().
    pushNum(lines, 'hero.umovement', u.umovement);
    // JS u.acurr.a is stored in display order [St,Dx,Co,In,Wi,Ch] (see
    // src/u_init.ts:702-718 init_attr() disp[] permutation — source of truth).
    // Display order: display[0]=St, display[1]=Dx, display[2]=Co,
    //                display[3]=In, display[4]=Wi, display[5]=Ch.
    // C constants:   A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5.
    // When not present we fall back to undefined (still legible as divergence).
    pushNum(lines, 'hero.str', acurr_a ? acurr_a[0] : undefined); // display[0]=St
    pushNum(lines, 'hero.int', acurr_a ? acurr_a[3] : undefined); // display[3]=In
    pushNum(lines, 'hero.wis', acurr_a ? acurr_a[4] : undefined); // display[4]=Wi
    pushNum(lines, 'hero.dex', acurr_a ? acurr_a[1] : undefined); // display[1]=Dx
    pushNum(lines, 'hero.con', acurr_a ? acurr_a[2] : undefined); // display[2]=Co
    pushNum(lines, 'hero.cha', acurr_a ? acurr_a[5] : undefined); // display[5]=Ch
    // u.uluck — schar, base luck.  Zero at post_init from u_init_misc()'s
    // memset(&u,0,...) (u_init.c:954).  The `u.uluck = u.moreluck = 0` line
    // at u_init.c:963 is inside `#if 0` so it doesn't fire — the memset is
    // the actual source.  Days-of-the-month/full-moon adjustments happen
    // later (moveloop), not during newgame().  Initialized to 0 in
    // u_init.ts u_init_misc().
    pushNum(lines, 'hero.uluck', u.uluck);
    // u.ublesscnt — prayer cooldown counter.  C ref u_init.c:1005:
    //   u.ublesscnt = 300; /* no prayers just yet */
    // Initialized to 300 in u_init.ts u_init_misc().
    pushNum(lines, 'hero.ublesscnt', u.ublesscnt);
    // C cmd.c:328-334 — display block. JS has no g.disp yet; pushBool
    // defaults to 0 which is C's struct zero-init — same on both sides
    // at post_init, so no divergence.
    const disp = g.disp;
    pushBool(lines, 'display.botl', disp ? disp.botl : undefined);
    pushBool(lines, 'display.botlx', disp ? disp.botlx : undefined);
    pushBool(lines, 'display.time_botl', disp ? disp.time_botl : undefined);
    // C explicitly emits 0L placeholders for toplin/inmore — mirror that.
    lines.push(`display.toplin=0`);
    lines.push(`display.inmore=0`);
    // C cmd.c:337-339 — fmon chain count. JS has g.fmon (null when empty).
    pushNum(lines, 'fmon.count', chainLen(g.fmon, 'nmon'));
    // C cmd.c:341-370 — per-monster fields for each entry in fmon chain.
    // Mirrors C's inner loop: for (mtmp = fmon; mtmp; mtmp = mtmp->nmon, ++i).
    {
        let i = 0;
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon, ++i) {
            pushNum(lines, `fmon[${i}].mid`, mtmp.m_id);
            pushNum(lines, `fmon[${i}].mnum`, mtmp.mnum);
            pushNum(lines, `fmon[${i}].x`, mtmp.mx);
            pushNum(lines, `fmon[${i}].y`, mtmp.my);
            pushNum(lines, `fmon[${i}].mhp`, mtmp.mhp);
            pushNum(lines, `fmon[${i}].movement`, mtmp.movement);
            pushBool(lines, `fmon[${i}].mpeaceful`, mtmp.mpeaceful);
            pushNum(lines, `fmon[${i}].mtame`, mtmp.mtame);
            pushBool(lines, `fmon[${i}].msleeping`, mtmp.msleeping);
            pushBool(lines, `fmon[${i}].mcanmove`, mtmp.mcanmove);
            pushBool(lines, `fmon[${i}].mconf`, mtmp.mconf);
            pushBool(lines, `fmon[${i}].mstun`, mtmp.mstun);
            pushBool(lines, `fmon[${i}].mflee`, mtmp.mflee);
            pushNum(lines, `fmon[${i}].mfleetim`, mtmp.mfleetim);
            pushBool(lines, `fmon[${i}].minvis`, mtmp.minvis);
            pushBool(lines, `fmon[${i}].perminvis`, mtmp.perminvis);
            pushNum(lines, `fmon[${i}].mux`, mtmp.mux);
            pushNum(lines, `fmon[${i}].muy`, mtmp.muy);
            /* nmon_mid: the m_id of the next monster in chain (0 if none) */
            pushNum(lines, `fmon[${i}].nmon_mid`, mtmp.nmon ? mtmp.nmon.m_id : 0);
            /* monster inventory */
            const mc = chainLen(mtmp.minvent, 'nobj');
            pushNum(lines, `fmon[${i}].minvent_count`, mc);
            {
                let mi = 0;
                for (let mo = mtmp.minvent; mo; mo = mo.nobj, ++mi) {
                    pushNum(lines, `fmon[${i}].minvent[${mi}].oid`, mo.o_id);
                }
            }
        }
    }
    // C cmd.c:373-375 — fobj chain count.
    pushNum(lines, 'fobj.count', chainLen(g.fobj, 'nobj'));
    // C cmd.c:377-408 — per-object fields for each entry in fobj chain.
    // Mirrors C's inner loop: for (otmp = fobj; otmp; otmp = otmp->nobj, ++i).
    {
        let i = 0;
        for (let otmp = g.fobj; otmp; otmp = otmp.nobj, ++i) {
            pushNum(lines, `fobj[${i}].oid`, otmp.o_id);
            pushNum(lines, `fobj[${i}].otyp`, otmp.otyp);
            pushNum(lines, `fobj[${i}].oclass`, otmp.oclass);
            pushNum(lines, `fobj[${i}].where`, otmp.where);
            pushNum(lines, `fobj[${i}].x`, otmp.ox);
            pushNum(lines, `fobj[${i}].y`, otmp.oy);
            pushNum(lines, `fobj[${i}].quan`, otmp.quan);
            pushNum(lines, `fobj[${i}].spe`, otmp.spe);
            pushBool(lines, `fobj[${i}].blessed`, otmp.blessed);
            pushBool(lines, `fobj[${i}].cursed`, otmp.cursed);
            pushNum(lines, `fobj[${i}].oartifact`, otmp.oartifact ?? 0);
            pushBool(lines, `fobj[${i}].no_charge`, otmp.no_charge);
            pushNum(lines, `fobj[${i}].owornmask`, otmp.owornmask ?? 0);
            pushNum(lines, `fobj[${i}].invlet`, otmp.invlet ?? 0);
            /* nobj_oid: o_id of the next object in chain (0 if none) */
            pushNum(lines, `fobj[${i}].nobj_oid`, otmp.nobj ? otmp.nobj.o_id : 0);
            /* nexthere_oid: o_id of next obj at same tile (0 if none) — wired by place_object */
            pushNum(lines, `fobj[${i}].nexthere_oid`, otmp.nexthere ? otmp.nexthere.o_id : 0);
            /* Container contents — C cmd.c:395-407 */
            if (otmp.cobj) {
                let ci = 0;
                for (let cobj = otmp.cobj; cobj; cobj = cobj.nobj)
                    ++ci;
                pushNum(lines, `fobj[${i}].contents_count`, ci);
                ci = 0;
                for (let cobj = otmp.cobj; cobj; cobj = cobj.nobj, ++ci) {
                    pushNum(lines, `fobj[${i}].contents[${ci}].oid`, cobj.o_id);
                    pushNum(lines, `fobj[${i}].contents[${ci}].otyp`, cobj.otyp);
                    pushNum(lines, `fobj[${i}].contents[${ci}].oclass`, cobj.oclass);
                    pushNum(lines, `fobj[${i}].contents[${ci}].quan`, cobj.quan);
                }
            }
        }
    }
    // C cmd.c:411-426 — gi.invent chain: count then per-item fields.
    // Per-item fields match C exactly: oid, otyp, oclass, quan, spe,
    // blessed, cursed, owornmask, invlet, nobj_oid.
    // At post_mklev, g.invent is null (inventory assigned later by ini_inv),
    // so invent.count=0 and no per-item lines are emitted — same as C.
    // At post_init and turn_end, g.invent holds the hero's starting items.
    pushNum(lines, 'invent.count', chainLen(g.invent, 'nobj'));
    {
        let i = 0;
        for (let otmp = g.invent; otmp; otmp = otmp.nobj, ++i) {
            pushNum(lines, `invent[${i}].oid`, otmp.o_id);
            pushNum(lines, `invent[${i}].otyp`, otmp.otyp);
            pushNum(lines, `invent[${i}].oclass`, otmp.oclass);
            pushNum(lines, `invent[${i}].quan`, otmp.quan);
            pushNum(lines, `invent[${i}].spe`, otmp.spe);
            pushBool(lines, `invent[${i}].blessed`, otmp.blessed);
            pushBool(lines, `invent[${i}].cursed`, otmp.cursed);
            pushNum(lines, `invent[${i}].owornmask`, otmp.owornmask ?? 0);
            pushNum(lines, `invent[${i}].invlet`, otmp.invlet ?? 0);
            /* Diagnostic-only: pickup.c's JUSTPICKED menu row is driven by
             * obj->pickup_prev.  Keep this in the existing mapstate channel so
             * inventory-menu probes can see the flag at turn boundaries. */
            pushBool(lines, `invent[${i}].pickup_prev`, otmp.pickup_prev);
            /* nobj_oid: o_id of next item in chain (0 if none) */
            pushNum(lines, `invent[${i}].nobj_oid`, otmp.nobj ? otmp.nobj.o_id : 0);
        }
    }
    // C cmd.c:429-437 — gf.ftrap: count then per-trap x/y/ttyp
    {
        let tc = 0;
        for (let t = g.ftrap; t; t = t.ntrap)
            ++tc;
        pushNum(lines, 'traps.count', tc);
        tc = 0;
        for (let t = g.ftrap; t; t = t.ntrap, ++tc) {
            pushNum(lines, `traps[${tc}].x`, t.tx);
            pushNum(lines, `traps[${tc}].y`, t.ty);
            pushNum(lines, `traps[${tc}].ttyp`, t.ttyp);
        }
    }
    // C cmd.c:441-451 — gs.stairs: count then per-stair x/y/up/isladder/to_dnum/to_dlevel
    {
        let sc = 0;
        for (let s = g.stairs; s; s = s.next)
            ++sc;
        pushNum(lines, 'stairs.count', sc);
        sc = 0;
        for (let s = g.stairs; s; s = s.next, ++sc) {
            pushNum(lines, `stairs[${sc}].x`, s.sx);
            pushNum(lines, `stairs[${sc}].y`, s.sy);
            pushNum(lines, `stairs[${sc}].up`, s.up ? 1 : 0);
            pushNum(lines, `stairs[${sc}].isladder`, s.isladder ? 1 : 0);
            /* C cmd.c:450-451 — stway->tolev.dnum/dlevel are struct fields (always valid).
             * stairway_add() always provides a dest object, so s.tolev is never null
             * in practice. Fallback to 0 mirrors C struct zero-init if missing. */
            pushNum(lines, `stairs[${sc}].to_dnum`, s.tolev ? s.tolev.dnum : 0);
            pushNum(lines, `stairs[${sc}].to_dlevel`, s.tolev ? s.tolev.dlevel : 0);
        }
    }
    // C cmd.c:456-461 — Level grid, 6 fields in x-major order
    // (x=0..COLNO-1 outer, y=0..ROWNO-1 inner), emitted as one CSV line each.
    // Mirrors pb_csv_grid() at cmd.c:234-249 and the 6 grid_* getters at
    // cmd.c:252-257.  JS source: game.level.locations[x][y] (GameMap,
    // initialized in game.js makeLocation() to STONE/0/false).
    {
        const locs = game.level ? game.level.locations : null;
        // Build each grid as a flat comma-joined CSV value, x-major.
        // C: for (x=0; x<COLNO; x++) for (y=0; y<ROWNO; y++) emit getter(x,y)
        const _grid = (getter) => {
            const parts = new Array(COLNO * ROWNO);
            let k = 0;
            for (let x = 0; x < COLNO; x++) {
                for (let y = 0; y < ROWNO; y++) {
                    parts[k++] = getter(locs, x, y);
                }
            }
            return parts.join(',');
        };
        // levl.typ — schar, terrain type. JS: locations[x][y].typ (integer).
        lines.push(`levl.typ=${_grid((l, x, y) => asLong(l ? l[x][y].typ : 0))}`);
        // levl.flags — unsigned bitfield (flags:5). JS: locations[x][y].flags (integer).
        lines.push(`levl.flags=${_grid((l, x, y) => asLong(l ? l[x][y].flags : 0))}`);
        // levl.horizontal — bool. JS: locations[x][y].horizontal (boolean).
        lines.push(`levl.horizontal=${_grid((l, x, y) => (l && l[x][y].horizontal) ? 1 : 0)}`);
        // levl.lit — bool. JS: locations[x][y].lit (boolean).
        lines.push(`levl.lit=${_grid((l, x, y) => (l && l[x][y].lit) ? 1 : 0)}`);
        // levl.roomno — unsigned char. JS: locations[x][y].roomno (integer).
        lines.push(`levl.roomno=${_grid((l, x, y) => asLong(l ? l[x][y].roomno : 0))}`);
        // levl.edge — bool. JS: locations[x][y].edge (boolean).
        lines.push(`levl.edge=${_grid((l, x, y) => (l && l[x][y].edge) ? 1 : 0)}`);
    }
    // C builds a single buffer "v=2\nphase=...\n..." and hashes that.
    const payload = lines.join('\n') + '\n';
    const hash = fnv1a64(payload);
    // Push detail lines first, then the wrapper. The dev runner's
    // extractMapstateSnapshots() flushes the field buffer when it sees
    // the wrapper — same order as the C-side emit in cmd.c:495-512.
    for (const line of lines) {
        pushRngLogEntry(`^md.${line}`);
    }
    pushRngLogEntry(`^mapstate[v=2 turn=${turn} hash=${hex16(hash)} len=${payload.length} dump=1]`);
}
// ---------------------------------------------------------------------
//
// loadMapstateEntries / dumpMapstateEntries form a side-channel from the
// existing emitMapstate() pipeline: they back a single Map<string,string>
// seeded from MAPSTATE_SCHEMA defaults. They are used by the per-function
// and reproduce the same values on the JS side before invoking a function
// under test.
//
// IMPORTANT: this is intentionally a separate store from `game` — the
// the JS port has wired up the corresponding game-state field yet. Tests
// entries and apply them by hand.
//
// Round-trip property (asserted in test/mapstate-load-dump.test.mjs):
//   loadMapstateEntries(entries); dumpMapstateEntries(["*"])
//   returns every entry from `entries` (with the supplied values) plus
//   schema defaults for the keys not in entries.
// ---------------------------------------------------------------------
function freshTable() {
    const t = new Map();
    for (const { key, default: def } of MAPSTATE_SCHEMA)
        t.set(key, def);
    return t;
}
let _mapstateTable = freshTable();
export function resetMapstateTable() {
    _mapstateTable = freshTable();
}
/**
 * Apply a list of {key, val} entries to the table. Additive: keys not in
 * `entries` retain their current value. Unknown keys (not in
 * MAPSTATE_SCHEMA) throw — silently dropping them would mask schema
 * drift between the JS and C sides.
 *
 * Caller passes a full-schema array if they want a "full reset" semantic;
 * pass through resetMapstateTable() first if you want defaults restored
 * for the keys you don't override.
 */
export function loadMapstateEntries(entries) {
    if (!Array.isArray(entries)) {
        throw new TypeError(`loadMapstateEntries expected an array, got ${typeof entries}`);
    }
    for (const e of entries) {
        if (!e || typeof e.key !== 'string') {
            throw new TypeError(`loadMapstateEntries entry missing string key: ${JSON.stringify(e)}`);
        }
        if (!_mapstateTable.has(e.key)) {
            throw new Error(`loadMapstateEntries: unknown key "${e.key}" (not in MAPSTATE_SCHEMA)`);
        }
        // Coerce val to string so the wire shape (always string) is
        // preserved on round-trip. JSON-decoded ints arrive as Number;
        // we want bit-stable string representation.
        _mapstateTable.set(e.key, String(e.val));
    }
}
export function dumpMapstateEntries(keysGlob) {
    if (!Array.isArray(keysGlob)) {
        throw new TypeError(`dumpMapstateEntries expected an array, got ${typeof keysGlob}`);
    }
    const keys = expandGlobs(keysGlob);
    return keys.map(k => ({ key: k, val: _mapstateTable.get(k) }));
}
