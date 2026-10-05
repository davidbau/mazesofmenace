/**
 * js/lua/nh_state.js — Lua state factory for NetHack level loading.
 *
 * Exports: createLevelLuaState() → interpreter instance with nhlib.lua loaded.
 *
 * This is the integration point for the binding layer: it assembles an
 * interpreter, registers `nh`/`des`/`selection`/`u` global tables, and
 * loads + runs nethack-c/dat/nhlib.lua. The returned interpreter is ready
 * for Phase 2's des.* handlers and Phase 3's per-file level validation.
 */

import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { makeInterp, LuaTable } from './interp.js';
import { rn2, random } from './nh_bindings.js';
import * as SPLEV from '../sp_lev.js';
import { W_ANY, W_RANDOM, W_NORTH, W_WEST, W_EAST, W_SOUTH } from '../const.js';
import { cmd_from_ecname } from '../cmd_binds.js';
/* nh.parse_config (nhlua.c:666) routes its argument through the config-line
 * parser and assigns into the live flags — see the binding below. */
import { parseNethackrc } from '../options.js';
import { game } from '../gstate.js';
import { spot_stop_timers, start_timer } from '../timeout.js';
import { long_to_any } from '../cmd.js';
import { TIMER_LEVEL, MELT_ICE_AWAY, COLNO, ROWNO } from '../const.js';
import { nhl_gamestate } from '../cmd.js';
import { nhl_callback, nhl_variable, nhl_text, nhl_loadlua, lua_checkstring, lua_toboolean } from '../nhlua.js';
import { l_obj_register } from '../nhlobj.js';
/* C ref: dungeon.c depth(&u.uz) — the absolute cross-branch depth the
 * `u.depth` Lua key returns (nhlua.c:2017). */
import { depth } from '../hacklib.js';
/* C dungeon.c:2016 Invocation_lev — the `u.invocation_level` Lua key
 * (nhlua.c:2019).  js/mkmaze.js owns the one faithful copy. */
import { Invocation_lev } from '../mkmaze.js';
import { levelDifficulty } from '../makemon.js';
import { pline, force_more } from '../display.js';
import monPmnamesPack from '../makemon_pmnames.json' with { type: 'json' };
import { G_GENOD, NON_PM } from '../const.js';

/* C nhlua.c:970 nhl_is_genocided().  Lua level scripts pass the ordinary
 * monster name (for example "vampire"); resolve it against the generated
 * neutral-name table, then inspect the live mvitals flag just as C does. */
function lua_is_genocided(name) {
    if (typeof name !== 'string')
        return false;
    const needle = name.trim().toLowerCase();
    if (!needle)
        return false;
    const rows = monPmnamesPack.pmnames || [];
    let pm = NON_PM;
    for (let i = 0; i < rows.length; i++) {
        const n = rows[i]?.[2];
        if (typeof n === 'string' && n.toLowerCase() === needle) {
            pm = i;
            break;
        }
    }
    return pm !== NON_PM
        && !!((game.mvitals?.[pm]?.mvflags | 0) & G_GENOD);
}

// Recursion guard for des.object contents callback trampoline.
// Tracks the current container table so nested invocations can
// save/restore the __nh_obj_table global correctly.
let currentContentsTable = null;

// nests a delphi room inside its outer room, so this genuinely recurses.
let currentRoomTable = null;
let currentRoomArg = null;

// Same, for the des.region contents callback trampoline. Separate slots from
// des.room's: C's lspo_region and lspo_room are distinct opcodes with distinct
// Lua tables, and sanctum.lua's region closure can sit inside nothing while
// wizard3.lua's sits beside two earlier regions — the two must not clobber
// each other's saved state any more than des.object's and des.monster's do.
let currentRegionTable = null;
let currentRegionArg = null;

// Recursion guard for des.monster inventory callback trampoline (see
// currentContentsTable above — same rationale, separate slot since a
// monster's inventory closure can itself invoke des.object contents
// closures, and the two must not clobber each other's saved state).
let currentInventoryFn = null;

/**
 * Create a recording proxy that wraps an underlying handler function.
 * Every call records its arguments into a `_calls` array on the proxy
 * function itself (via a closure over the calls list). The underlying
 * handler can be undefined/null → calls are recorded but nothing else
 * happens.
 *
 * Returns a function f(...args) that pushes { args } onto f._calls,
 * then calls the underlying handler if present.
 */
function makeRecorder(name, handler) {
    const calls = [];
    function recorded(...args) {
        calls.push({ name, args: [...args] });
        if (handler) {
            return handler(...args);
        }
    }
    recorded._calls = calls;
    recorded._name = name;
    recorded._handler = handler || null;
    return recorded;
}

/* C ref: nhlua.c:1963-2036 — the `u` global's metatable.
 *
 * C exposes u through two metamethods: __index (nhl_meta_u_index) reads a
 * fixed list of struct you fields plus five computed ones, and __newindex
 * (nhl_meta_u_newindex) refuses every write.  A LuaTable subclass that
 * overrides get()/set() IS that metatable in this interpreter: the reads stay
 * live, which matters because a level's Lua runs mid-game (dat/nhlib.lua's
 * hell_tweaks reads u.depth while the level is being built).
 *
 * C's ustruct[] entries are plain struct-you fields pushed through
 * nhl_push_anything with ANY_INT / ANY_UCHAR / ANY_SCHAR; all three push a
 * Lua integer, so the type column carries no observable difference here and
 * every one is read as an integer.  A field this port does not carry reads 0,
 * which is what the C struct member would hold before anything writes it.
 */
class NhUTable extends LuaTable {
    /* C nhlua.c:1968-1996 ustruct[] — name order preserved. */
    get(key) {
        const g = game;
        const u = g?.u;
        if (typeof key !== 'string')
            return super.get(key);
        switch (key) {
        /* --- ustruct[] --- */
        case 'ux':          return u?.ux | 0;
        case 'uy':          return u?.uy | 0;
        case 'dx':          return u?.dx | 0;
        case 'dy':          return u?.dy | 0;
        case 'dz':          return u?.dz | 0;
        case 'tx':          return u?.tx | 0;
        case 'ty':          return u?.ty | 0;
        case 'ulevel':      return u?.ulevel | 0;
        case 'ulevelmax':   return u?.ulevelmax | 0;
        case 'uhunger':     return u?.uhunger | 0;
        case 'nv_range':    return u?.nv_range | 0;
        case 'xray_range':  return u?.xray_range | 0;
        case 'umonster':    return u?.umonster | 0;
        case 'umonnum':     return u?.umonnum | 0;
        case 'mh':          return u?.mh | 0;
        case 'mhmax':       return u?.mhmax | 0;
        case 'mtimedone':   return u?.mtimedone | 0;
        case 'dlevel':      return u?.uz?.dlevel | 0;
        case 'dnum':        return u?.uz?.dnum | 0;
        case 'uluck':       return u?.uluck | 0;
        case 'uhp':         return u?.uhp | 0;
        case 'uhpmax':      return u?.uhpmax | 0;
        case 'uen':         return u?.uen | 0;
        case 'uenmax':      return u?.uenmax | 0;
        /* --- C nhlua.c:2003-2023, the computed keys --- */
        /* C: lua_pushstring(L, gu.urole.name.m) — the ROLE's male name
         * ("Wizard", "Monk", ...), not the hero's rank title.  dat/nhlib.lua's
         * monkfoodshop() compares it against "Monk". */
        case 'role':        return String(g?.urole?.name?.m ?? '');
        case 'moves':       return g?.moves | 0;
        case 'uhave_amulet': return u?.uhave?.amulet | 0;
        /* C: lua_pushinteger(L, depth(&u.uz)) — the ABSOLUTE depth across
         * branches (js/hacklib.js depth()), not u.uz.dlevel. */
        case 'depth':       return depth(u?.uz);
        case 'invocation_level': return Invocation_lev(u?.uz);
        /* C nhlua.c:2004-2006 pushes the whole invent chain through
         * nhl_push_obj.  No dat/*.lua in the 5.0 tree indexes u.inventory, and
         * this port has no nhl_push_obj, so it is named rather than faked. */
        case 'inventory':
            throw new Error('UNPORTED-CALLEE: u.inventory (nhlua.c:2004 nhl_push_obj)');
        default:
            /* C nhlua.c:2025 nhl_error(L, "Unknown u table index") */
            throw new Error(`Unknown u table index: ${key}`);
        }
    }

    /* C nhlua.c:2030-2036 nhl_meta_u_newindex — nhl_error("Cannot set u table
     * values").  No dat/*.lua assigns to u. */
    set(key, _value) {
        throw new Error(`Cannot set u table values (${String(key)})`);
    }
}

function stubTable(fields) {
    const tbl = {};
    if (Array.isArray(fields)) {
        for (const name of fields) {
            tbl[name] = makeRecorder(name, null);
        }
    } else {
        for (const [name, handler] of Object.entries(fields)) {
            tbl[name] = makeRecorder(name, handler);
        }
    }
    return tbl;
}

export async function createLevelLuaState() {
    const interp = makeInterp();

    // Wire the selectionvar `|` union operator (C: nhlsel.c:1013 __bor ->
    // l_selection_or). The interpreter dispatches `a | b` here only when an
    // operand is a selectionvar; plain-number `|` is untouched.
    interp.setSelectionUnion((a, b) => SPLEV.selection_or(a, b));

    // Wire the selectionvar `&` intersection operator (C: nhlsel.c:1012 __band
    // -> l_selection_and). Same contract as the `|` wiring above.
    interp.setSelectionIntersect((a, b) => SPLEV.selection_and(a, b));

    // C nhlsel.c:1016 __sub — set difference of two selectionvars.
    interp.setSelectionSubtract((a, b) => SPLEV.selection_sub(a, b));

    // --- nh global table (real bindings) ---
    interp.defineGlobal('nh.rn2', rn2);
    interp.defineGlobal('nh.random', random);

    // --- nh.* helper stubs (Phase 1 — return sensible defaults) ---
    // --- nh.eckey: faithful port of nhl_get_cmd_key (nhlua.c:1797-1812) ---
    // C nhl_get_cmd_key pushes cmd_from_ecname(cmd) verbatim, so this is a thin
    // wrapper over the cmd.c:3740 port in js/cmd_binds.js — which runs the REAL
    // binding machinery (cmd.c:3419 commands_init + cmd.c:4013 reset_commands +
    // cmd.c:3705 cmd_from_func + hacklib.c:533 visctrl) over the generated
    // The previous hand-picked ECKEY_DEFAULTS subset here mis-defaulted every
    // omitted command to the unbound "#name" form and also mis-cased the meta
    // bindings ('M-U' for untrap where visctrl(M('u')) is 'M-u'), both of which
    // are baked into the tutorial engraving text at level-creation time:
    // ''c'' / ''M-u''.  dat/tut-1.lua tut_key() then pattern-matches ^M%-([A-Z])$,
    // so the case error additionally rewrote the line as "Alt-U".
    // A flat ecname->key table cannot answer this correctly either: cmd_from_func
    // resolves by ef_funct, so two ecnames sharing a function ("call"/"name" ->
    // docallcmd) both report the first PRINTABLE key bound to that function,
    // and reset_commands() first STRIPS the movement keys (including highc()
    // 'N') from the bind list.  C therefore answers #name with 'C', not 'M-n'.
    interp.defineGlobal('nh.eckey', (...args) => {
        if (args.length !== 1) return;
        return cmd_from_ecname(lua_checkstring(args[0]));
    });
    interp.defineGlobal('nh.callback', nhl_callback);
    interp.defineGlobal('nh.parse_config', (str) => {
        /* C: luaL_checkstring would error on a non-string; the Lua side never
         * calls it that way, so silently ignore instead of throwing. */
        if (typeof str !== 'string' || !str)
            return undefined;
        const parsed = parseNethackrc(str);
        if (!game)
            return undefined;
        if (parsed.flags && Object.keys(parsed.flags).length) {
            if (!game.flags) game.flags = {};
            Object.assign(game.flags, parsed.flags);
        }
        if (parsed.iflags && Object.keys(parsed.iflags).length) {
            if (!game.iflags) game.iflags = {};
            Object.assign(game.iflags, parsed.iflags);
        }
        return undefined;
    });
    /* C nhlua.c:634 nhl_pline().  The interpreter is async, so this can retain
     * C's blocking optional display_nhwindow(WIN_MESSAGE, TRUE) semantics
     * without dropping the message into a fire-and-forget Promise. */
    interp.defineGlobal('nh.pline', async (...args) => {
        if (args.length !== 1 && args.length !== 2) throw new Error('Wrong args');
        const message = lua_checkstring(args[0]);
        await pline(message);
        if (lua_toboolean(args[1]) && !game._topl_win_stop) {
            const morc = await force_more(game._pending_message || message);
            // This more() belongs to display_nhwindow after THIS pline has
            // finished. An ESC therefore suppresses the next Lua pline; it
            // is not an ESC raised inside that next message's update_topl.
            if (morc === 27) {
                game._topl_win_stop = true;
                game._topl_win_stop_armed = false;
            }
        }
        return undefined;
    });
    interp.defineGlobal('nh.impossible', () => undefined);
    interp.defineGlobal('nh.debug_themerm', () => undefined);
    interp.defineGlobal('nh.dnum_name', () => '');
    interp.defineGlobal('nh.dump_fmtstr', () => '');
    interp.defineGlobal('nh.text', nhl_text);
    interp.defineGlobal('nh.variable', (...args) => nhl_variable(interp, ...args));
    l_obj_register(interp);
    // Lua's truth conversion uses the final argument; zero and empty strings
    // are true. The C binding returns no Lua values (its C return is zero).
    interp.defineGlobal('nh.gamestate', async (...args) => {
        const value = args.at(-1);
        await nhl_gamestate(value !== undefined && value !== null && value !== false);
        return undefined;
    });
    interp.defineGlobal('nh.is_genocided', lua_is_genocided);
    interp.defineGlobal('nh.level_difficulty', () => levelDifficulty());
    /* C ref: nhlua.c:1610-1641 nhl_timer_start_at — nh.start_timer_at(x,y,
     * "melt-ice", when).  (x,y) arrive room/map-relative and are made absolute
     * by cvt_to_abscoord; the Ice room theme's per-cell melter lands here. */
    interp.defineGlobal('nh.start_timer_at', (x, y, timer, when) => {
        if (timer !== 'melt-ice') throw new Error('nhl_get_timertype: Unknown timer type');
        if (x == null || y == null) throw new Error('nhl_timer_start_at: Wrong args');
        if (!game.gx || game.gx.xstart === undefined) SPLEV.reset_xystart_size();
        const c = SPLEV.cvt_to_abscoord(Number(x), Number(y),
                                        { xstart: game.gx.xstart, ystart: game.gy.ystart });
        if (c.x >= 1 && c.x <= COLNO - 1 && c.y >= 0 && c.y <= ROWNO - 1) {
            const where = (c.x << 16) | c.y;
            spot_stop_timers(c.x, c.y, MELT_ICE_AWAY);
            start_timer(Number(when) | 0, TIMER_LEVEL, MELT_ICE_AWAY, long_to_any(where));
        }
        return undefined;
    });

    // --- des global table (stubs — Phase 2 provides real bodies) ---
    // Fields are the lspo_* / des.* API used by level .lua scripts.
    // call *sequence* without needing real level-building logic.
    interp.defineGlobal('des', stubTable([
        'room', 'terrain', 'object', 'monster', 'door',
        'trap', 'drawbridge', 'stairs', 'ladder', 'altar',
        'fountain', 'sink', 'pool', 'grave', 'tree',
        'gold', 'feature', 'level_init', 'level_flags',
        'map', 'replace_terrain', 'dig', 'fillrect',
        'non_diggable', 'non_passwall', 'wallify',
        'corridor', 'random_corridor', 'teleport_region',
        'levregion', 'branch_region', 'stairs_region',
        'placeholder', 'arrival_room', 'theme_room',
        'engraving', 'message', 'vision',
        'wish', 'wall_property', 'region',
        'mazewalk', 'bounds',
        // Additional common des.* calls from tutorials
        'finalize', 'level', 'nested', 'prelude',
        'reset_level', 'mortal_region',
        'stair', 'exclusion', 'gas_cloud', 'portal', 'random_corridors',
    ]));

    // --- REAL des.* handler wiring (Phase 2c) ---
    // As real lspo_* bodies land in js/sp_lev.js (exports named lspo_<name>),
    // the des.<name> binding calls them with the marshalled Lua table. The
    // keeps the record-only stub behavior. Name map defaults to lspo_<desname>;
    // exceptions listed explicitly. WHO-PORTS: the handler BODIES are fleet
    // work — this loop is glue only.
    const DES_EXPORT_EXCEPTIONS = {
        random_corridor: 'lspo_random_corridors',
        stairs: 'lspo_stair',
    };
    for (const desName of Object.keys(interp.getGlobal('des').map ? Object.fromEntries(interp.getGlobal('des').map) : {})) {
        const exportName = DES_EXPORT_EXCEPTIONS[desName] || ('lspo_' + desName);
        const real = SPLEV[exportName];
        if (typeof real !== 'function') continue;
        interp.defineGlobal('des.' + desName, makeRecorder(desName, real));
    }

    // Override des.map to invoke its function-valued `contents` closure.
    // C ref: sp_lev.c:6314-6320 — after the map fragment is written,
    //   else if (has_contents) {
    //       l_push_wid_hei_table(L, gx.xsize, gy.ysize);   <- ONE argument
    //       nhl_pcall_handle(L, 1, 0, "lspo_map", NHLpa_panic);
    //       reset_xystart_size();
    //   }
    // js/sp_lev.js lspo_map hands off via the same needsContentsCall shape
    // des.room uses (the closure call has to happen in the interpreter), and
    // this unwraps the hand-off back to the selection so des.map's Lua return
    // Witness: bigrm-13.lua:61 `des.map({ coord=..., map=pillar,
    // contents=function() end })`.
    const mapContentsCallAst = parse(tokenize('__nh_map_table.contents(__nh_map_arg)'));
    const realLspoMap = SPLEV.lspo_map;
    if (typeof realLspoMap === 'function') {
        interp.defineGlobal('des.map', makeRecorder('map', async function(...callArgs) {
            const result = realLspoMap(...callArgs);
            if (!result || !result.needsContentsCall) return result;
            const tableArg = (callArgs.length === 1 && callArgs[0] && callArgs[0].type === 'table')
                ? callArgs[0] : null;
            if (tableArg) {
                // C: l_push_wid_hei_table(L, gx.xsize, gy.ysize)
                const mapArg = { width: result.wid, height: result.hei };
                interp.defineGlobal('__nh_map_table', tableArg);
                interp.defineGlobal('__nh_map_arg', mapArg);
                try {
                    await interp.run(mapContentsCallAst);
                } finally {
                    interp.defineGlobal('__nh_map_table', null);
                    interp.defineGlobal('__nh_map_arg', null);
                }
            }
            if (typeof SPLEV.map_contents_done === 'function')
                SPLEV.map_contents_done();
            return result.sel;
        }));
    }

    // Override des.object to invoke function-valued `contents` callbacks,
    // faithful to C lspo_object container context (sp_lev.c:3045).
    // Pre-compile the trampoline AST once.
    const contentsCallAst = parse(tokenize('__nh_obj_table.contents({})'));
    const realLspoObject = SPLEV.lspo_object;
    interp.defineGlobal('des.object', makeRecorder('object', async function(...callArgs) {
        let result = null;
        if (typeof realLspoObject === 'function') {
            result = await realLspoObject(...callArgs);
        }
        const tableArg = (callArgs.length === 1 && callArgs[0] && callArgs[0].type === 'table')
            ? callArgs[0] : null;
        if (tableArg) {
            const contents = tableArg.get('contents');
            if (contents && (contents.type === 'function' || typeof contents === 'function')) {
                const prev = currentContentsTable;
                currentContentsTable = tableArg;
                interp.defineGlobal('__nh_obj_table', tableArg);
                try {
                    await interp.run(contentsCallAst);
                } finally {
                    currentContentsTable = prev;
                    interp.defineGlobal('__nh_obj_table', prev);
                }
            }
        }
        if (result && result.isContainer && typeof SPLEV.spo_pop_container === 'function') {
            SPLEV.spo_pop_container();
        }
    }));

    // Override des.room to invoke its function-valued `contents` closure.
    // C ref: sp_lev.c:4092-4101 — after a successful build_room, lspo_room does
    //   lua_getfield(L, 1, "contents");
    //   if (lua_type(L, -1) == LUA_TFUNCTION) {
    //       lua_remove(L, -2);
    //       l_push_mkroom_table(L, tmpcr);            <- ONE argument
    //       nhl_pcall_handle(L, 1, 0, "lspo_room", NHLpa_panic);
    //   } else lua_pop(L, 1);
    //   spo_endroom(gc.coder);
    // js/sp_lev.js lspo_room deliberately stops at the `needsContentsCall`
    // hand-off (see its RETURN CONTRACT comment) because the closure call has
    // to happen in the interpreter, not in sp_lev.js. Nothing consumed that
    // contract until now, so EVERY des.room `contents` block was silently
    // and her four fountains) and its two random monsters never existed.
    // build_room(sp_lev.c:2811) -> mkclass_aligned(makemon.c:1934) (the first
    // statue's centaur); JS ran build_room and went straight to the next room.
    // Same trampoline shape as des.object's `contents` below/above — route the
    // call through the already-marshalled args LuaTable rather than
    // defineGlobal'ing the raw closure (interp.defineGlobal's marshalGlobal has
    // no branch for a bare Lua closure and would flatten it into a data table).
    const roomContentsCallAst = parse(tokenize('__nh_room_table.contents(__nh_room_arg)'));
    const realLspoRoom = SPLEV.lspo_room;
    interp.defineGlobal('des.room', makeRecorder('room', async function(...callArgs) {
        let result = null;
        if (typeof realLspoRoom === 'function') {
            result = realLspoRoom(...callArgs);
        }
        if (!result || !result.needsContentsCall) return;
        const tableArg = (callArgs.length === 1 && callArgs[0] && callArgs[0].type === 'table')
            ? callArgs[0] : null;
        const contents = tableArg && tableArg.get('contents');
        if (tableArg && contents && (contents.type === 'function' || typeof contents === 'function')) {
            const prevTable = currentRoomTable;
            const prevArg = currentRoomArg;
            // C ref: sp_lev.c:3059-3070 l_push_mkroom_table(L, tmpcr) — the
            // `function() ... end` and ignore it, but themerms.lua's take `rm`.
            const cr = result.tmpcr;
            const roomArg = {
                width: 1 + (cr.hx - cr.lx),
                height: 1 + (cr.hy - cr.ly),
                region: { x1: cr.lx, y1: cr.ly, x2: cr.hx, y2: cr.hy },
                lit: !!cr.rlit,
                irregular: !!cr.irregular,
                needjoining: !!cr.needjoining,
                type: SPLEV.get_mkroom_name(cr.rtype),
            };
            currentRoomTable = tableArg;
            currentRoomArg = roomArg;
            interp.defineGlobal('__nh_room_table', tableArg);
            interp.defineGlobal('__nh_room_arg', roomArg);
            try {
                await interp.run(roomContentsCallAst);
            } finally {
                currentRoomTable = prevTable;
                currentRoomArg = prevArg;
                interp.defineGlobal('__nh_room_table', prevTable);
                interp.defineGlobal('__nh_room_arg', prevArg);
            }
        }
        // C: spo_endroom(gc.coder) runs whether or not `contents` was a
        // function — but this branch is only reached when needsContentsCall is
        // true, i.e. exactly the case lspo_room left the room open for.
        if (typeof SPLEV.spo_finish_room === 'function')
            SPLEV.spo_finish_room();
    }));

    // Override des.region to invoke its function-valued `contents` closure.
    // C ref: sp_lev.c:5700-5708 — identical shape to lspo_room's above:
    //   lua_getfield(L, 1, "contents");
    //   if (lua_type(L, -1) == LUA_TFUNCTION) {
    //       lua_remove(L, -2);
    //       l_push_mkroom_table(L, troom);            <- ONE argument
    //       nhl_pcall_handle(L, 1, 0, "lspo_region", NHLpa_panic);
    //   } else lua_pop(L, 1);
    //   spo_endroom(gc.coder);
    // js/sp_lev.js lspo_region now hands off via the same needsContentsCall
    // contract instead of throwing UNPORTED-CALLEE. Every Gehennom special
    // level that carries a region closure needs this: sanctum.lua:35 (a
    // "temple" region whose closure adds the secret door), wizard1.lua:36 (a
    // "morgue" region whose closure picks a wall with math.random(1,3) — a
    // live RNG draw, so dropping the closure also desyncs the stream) and
    // wizard3.lua:38 (percent(50), same). Pre-compile the trampoline AST once
    // and route through the marshalled table, per des.room's note on
    // marshalGlobal flattening a bare Lua closure.
    const regionContentsCallAst = parse(tokenize('__nh_region_table.contents(__nh_region_arg)'));
    const realLspoRegion = SPLEV.lspo_region;
    if (typeof realLspoRegion === 'function') {
        interp.defineGlobal('des.region', makeRecorder('region', async function (...callArgs) {
            const result = realLspoRegion(...callArgs);
            if (!result || !result.needsContentsCall) return result;
            const tableArg = (callArgs.length === 1 && callArgs[0] && callArgs[0].type === 'table')
                ? callArgs[0] : null;
            const contents = tableArg && tableArg.get('contents');
            if (tableArg && contents && (contents.type === 'function' || typeof contents === 'function')) {
                const prevTable = currentRegionTable;
                const prevArg = currentRegionArg;
                // C ref: sp_lev.c:3058-3070 l_push_mkroom_table(L, troom).
                const cr = result.troom;
                const regionArg = {
                    width: 1 + (cr.hx - cr.lx),
                    height: 1 + (cr.hy - cr.ly),
                    region: { x1: cr.lx, y1: cr.ly, x2: cr.hx, y2: cr.hy },
                    lit: !!cr.rlit,
                    irregular: !!cr.irregular,
                    needjoining: !!cr.needjoining,
                    type: SPLEV.get_mkroom_name(cr.rtype),
                };
                currentRegionTable = tableArg;
                currentRegionArg = regionArg;
                interp.defineGlobal('__nh_region_table', tableArg);
                interp.defineGlobal('__nh_region_arg', regionArg);
                try {
                    await interp.run(regionContentsCallAst);
                } finally {
                    currentRegionTable = prevTable;
                    currentRegionArg = prevArg;
                    interp.defineGlobal('__nh_region_table', prevTable);
                    interp.defineGlobal('__nh_region_arg', prevArg);
                }
            }
            // C: spo_endroom(gc.coder) runs on this arm whether or not
            // `contents` turned out to be a function; lspo_region only returns
            // the hand-off when it IS one, and skipped spo_endroom for exactly
            // that case.
            if (typeof SPLEV.spo_finish_room === 'function')
                SPLEV.spo_finish_room();
            return 0;
        }));
    }

    // Override des.monster to invoke a function-valued `inventory` callback,
    // faithful to C lspo_monster's custom-inventory context (sp_lev.c:
    // 3394-3399). Unlike des.object's `contents` (called with the created
    // object as its one argument), C calls the inventory closure with ZERO
    // arguments (nhl_pcall_handle(L, 0, 0, ...)) — the implicit context is
    // create_object's invent_carrying_monster global, not a Lua-visible
    // parameter. Call it as `__nh_mon_table.inventory()` (mirrors des.object's
    // `__nh_obj_table.contents(...)` above) rather than defineGlobal'ing the
    // raw closure directly — interp.defineGlobal's marshalGlobal() (js/lua/
    // interp.js:126-137) has no branch for a bare Lua closure value (only
    // isNativeFn / typeof==='function' / isLuaTable are handled; anything
    // else — including a parsed Lua closure, a plain JS object — falls into
    // the generic "wrap object's own keys into a fresh LuaTable" branch,
    // which flattens the closure into a data table and destroys its
    // callability). Routing through the already-marshalled `args` LuaTable
    // (real args are already isLuaTable, so marshalGlobal passes them
    // through unchanged) sidesteps the bug entirely, same as des.object's
    // existing trampoline already does. Pre-compile the trampoline AST once.
    const inventoryCallAst = parse(tokenize('__nh_mon_table.inventory()'));
    const realLspoMonster = SPLEV.lspo_monster;
    interp.defineGlobal('des.monster', makeRecorder('monster', async function(...callArgs) {
        let result = null;
        if (typeof realLspoMonster === 'function') {
            result = await realLspoMonster(...callArgs);
        }
        const tableArg = (callArgs.length === 1 && callArgs[0] && callArgs[0].type === 'table')
            ? callArgs[0] : null;
        if (result && result.hasCustomInvent && tableArg) {
            const inventory = tableArg.get('inventory');
            if (inventory && (inventory.type === 'function' || typeof inventory === 'function')) {
                const prev = currentInventoryFn;
                currentInventoryFn = tableArg;
                interp.defineGlobal('__nh_mon_table', tableArg);
                try {
                    await interp.run(inventoryCallAst);
                } finally {
                    currentInventoryFn = prev;
                    interp.defineGlobal('__nh_mon_table', prev);
                    if (typeof SPLEV.spo_end_moninvent === 'function')
                        await SPLEV.spo_end_moninvent();
                }
            }
        }
    }));

    // --- selection global table ---
    // new / clone / area are real handlers (port-lspo-selection-wiring-w2-001);

    /** C ref: nhlsel.c:558-584 l_selection_fillrect. nhlsel.c:995-996 registers
     *  this ONE C body under TWO Lua names, "fillrect" and "area", so both
     *  bindings below point here — "fillrect" used to be a record-only stub.
     *  MUST forward every argument: params_sel_2coords (nhlsel.c:474-504)
     *  branches on lua_gettop, and argc==4 builds a BRAND NEW selection while
     *  argc==5 uses the caller's. Declaring only four parameters dropped the
     *  5-arg `s:fillrect(x1,y1,x2,y2)` method form's leading selection.
     *  Body lives in SPLEV because C runs both corners through
     *  get_location_coord, which is sp_lev.js-scoped. */
    function areaHandler(...args) {
        return SPLEV.l_selection_fillrect(...args);
    }

    /** C ref: nhlsel.c:504-527 l_selection_line — same params_sel_2coords
     *  4-or-5 argument shape as fillrect above. Was a record-only stub. */
    function lineHandler(...args) {
        return SPLEV.l_selection_line(...args);
    }

    /** C ref: nhlsel.c:528-552 l_selection_rect — same params_sel_2coords
     *  4-or-5 argument shape as fillrect above. Was a record-only stub. */
    function rectHandler(...args) {
        return SPLEV.l_selection_rect(...args);
    }

    /** C ref: nhlsel.c:680-717 l_selection_match. Reads arg 1 (the mapfragment
     *  string); was a record-only stub, so tut-1.lua:122-123's
     *  `des.region(selection.match("#"), "unlit")` handed lspo_region
     *  `undefined` and the tutorial's corridors stayed lit. */
    function matchHandler(mapstr) {
        return SPLEV.l_selection_match(mapstr);
    }

    /** C ref: nhlsel.c:590-625 l_selection_randline (registered as "randline").
     *  6-arg call form (sel, x1,y1, x2,y2, roughness) — the only form
     *  Bar-strt.lua uses. Body lives in SPLEV.l_selection_randline because C
     *  runs both endpoints through get_location_coord, which is
     *  sp_lev.js-scoped. */
    function randlineHandler(sel, x1, y1, x2, y2, rough) {
        return SPLEV.l_selection_randline(sel, x1, y1, x2, y2, rough ?? 7);
    }

    /** C ref: nhlsel.c:159-199 l_selection_setpoint, argc==1 (`pools:set()` /
     *  `selection.set(pools)`). No x/y → random-location resolution; the whole
     *  rng-consuming core lives in SPLEV.selection_setpoint_rndcoord (which has
     *  get_location_coord / the coder croom / ANY_LOC in scope). Returns sel. */
    /** C ref: nhlsel.c:158-199 l_selection_setpoint. MUST forward every
     *  argument: C branches on lua_gettop, and the argc==1 branch is the
     *  RANDOM one. Dropping the extra args (as this handler used to) turns
     *  every literal `sel:set(x,y)` into a random point plus two rn2 draws
     *  C never makes. */
    function setHandler(...args) {
        return SPLEV.l_selection_setpoint(...args);
    }

    /** C ref: nhlsel.c:629-652 l_selection_grow. Covers BOTH call shapes —
     *  `selection.grow(sel, dir)` and `sel:grow(dir)` (Lua method desugaring
     *  makes them identical). C clones sel first (nhlsel.c:648) and grows the
     *  CLONE, leaving the original untouched, so we mirror that. The direction
     *  string maps via C's growdirs2i table (nhlsel.c:633-638); luaL_checkoption
     *  defaults a missing arg to "all". */
    const GROWDIRS = {
        'all': W_ANY, 'random': W_RANDOM, 'north': W_NORTH,
        'west': W_WEST, 'east': W_EAST, 'south': W_SOUTH,
    };
    function growHandler(sel, dirStr) {
        const key = (dirStr == null) ? 'all' : dirStr;
        if (!(key in GROWDIRS))
            throw new Error(`selection.grow: invalid option '${dirStr}'`);
        const clone = SPLEV.selection_clone(sel);
        SPLEV.selection_do_grow(clone, GROWDIRS[key]);
        return clone;
    }

    /** C ref: nhlsel.c:388-401 l_selection_filter_percent, registered under the
     *  Lua name "percentage" (nhlsel.c:988) — the name/body mismatch is the
     *  same trap as selection.area/fillrect, so grep the REGISTRATION table,
     *  not the C symbol. Covers both call shapes (`selection.percentage(sel,p)`
     *  and `sel:percentage(p)`; method desugaring makes them identical).
     *  C returns a COPY (l_selection_push_copy of the filter's fresh result)
     *  and leaves the caller's selection untouched, which selection_filter_
     *  percent already does by building `ret` from scratch.
     *  RNG: one rn2(100) per SELECTED point, x-outer/y-inner over the source
     *  selection's bounds — drawn only where selection_getpoint is true.
     *  Was `null`, i.e. a record-only stub, so bigrm-5.lua:33
     *      selection.match("."):percentage(2):grow()
     *  got a non-callable and the chained `:grow()` threw "attempt to call a
     *  method on a non-table value". */
    function percentageHandler(sel, p) {
        return SPLEV.selection_filter_percent(sel, Number(p));
    }

    /** C ref: nhlsel.c:655-678 l_selection_filter_mapchar, registered under its
     *  own name (nhlsel.c:996).  `sel:filter_mapchar(mapchar[, lit])` keeps the
     *  selected points whose terrain matches the map char; `lit` defaults to -2
     *  (luaL_optinteger) and only lit == -1 draws (one rn2(2) per kept point).
     *  The key was MISSING from this table entirely — not even a `null` stub —
     *  so the Lua interpreter reported the anonymous
     *      attempt to call method 'filter_mapchar' (a non-function value)
     *  and the scored run HALTED at that level's generation, forfeiting every
     *  later frame.  dat/hellfill.lua, dat/themerms.lua, dat/Mon-loca.lua,
     *  dat/Tou-loca.lua and dat/Tou-goal.lua all call it. */
    function filterMapcharHandler(sel, mapchr, lit) {
        return SPLEV.l_selection_filter_mapchar(sel, mapchr, lit);
    }

    async function iterateHandler(sel, fn) {
        /* C nhlsel.c:930 — argc==2 && lua_type(L,2)==LUA_TFUNCTION, else
         * nhl_error(L, "wrong parameters"). */
        if (!(fn && (fn.type === 'function' || typeof fn === 'function')))
            throw new Error('selection.iterate: wrong parameters');
        const rect = { lx: 0, ly: 0, hx: 0, hy: 0 }; /* C: cg.zeroNhRect */
        SPLEV.selection_getbounds(sel, rect);
        for (let y = rect.ly; y <= rect.hy; y++)
            for (let x = Math.max(1, rect.lx); x <= rect.hx; x++)
                if (SPLEV.selection_getpoint(x, y, sel)) {
                    const c = { x, y };
                    SPLEV.cvt_to_relcoord(c);
                    await interp.callFunction(null, fn, [c.x, c.y]);
                }
    }

    /** C ref: nhlsel.c:723-753 l_selection_flood (registered as "floodfill").
     *  Only the 2-arg (x,y) and 3-arg (x,y,diagonals) call forms exist in C;
     *  anything else is nhl_error("wrong parameters"). The body lives in
     *  SPLEV.l_selection_flood (get_location_coord / levl / the floodfill
     *  predicate are all in sp_lev.js scope). */
    function floodfillHandler(x, y, diagonals) {
        if (x == null || y == null)
            throw new Error('selection.floodfill: wrong parameters');
        return SPLEV.l_selection_flood(x, y, diagonals);
    }

    /** C ref: nhlsel.c:405-428 l_selection_rndcoord. Covers both call shapes
     *  (`selection.rndcoord(sel[,removeit])` and `sel:rndcoord([removeit])` —
     *  Lua method desugaring makes them identical). `removeit` is
     *  luaL_optinteger(L, 2, 0), so a missing arg means 0. C builds the result
     *  with lua_newtable + two nhl_add_table_entry_int calls, so the returned
     *  value must be a real Lua table (get_coord's {x=,y=} form). */
    function rndcoordHandler(sel, removeit) {
        const c = SPLEV.l_selection_rndcoord(sel, Number(removeit ?? 0));
        const t = new LuaTable();
        t.set('x', c.x);
        t.set('y', c.y);
        return t;
    }

    /** C ref: nhlsel.c:452-466 l_selection_getbounds, registered under the Lua
     *  name "bounds" (nhlsel.c:1003) — `local bnds = tmpbounds:bounds();`, the
     *  first statement of wizard1/2/3, fakewiz1/2, asmodeus, orcus and
     *  hellfill's fill loop.  Was absent from the table entirely, so those
     *  levels died with "attempt to call method 'bounds' (a non-function
     *  value)".  RNG-FREE: selection_getbounds (selvar.c:76) only walks the
     *  map to recompute a dirty bounding box, and C draws nothing on the way.
     *  C builds the result with lua_newtable + four nhl_add_table_entry_int
     *  calls, so it must be a real Lua table, not a JS object. */
    function boundsHandler(sel) {
        const rect = { lx: 0, ly: 0, hx: 0, hy: 0 }; /* C: cg.zeroNhRect */
        SPLEV.selection_getbounds(sel, rect);
        const t = new LuaTable();
        t.set('lx', rect.lx);
        t.set('ly', rect.ly);
        t.set('hx', rect.hx);
        t.set('hy', rect.hy);
        return t;
    }

    function negateHandler(sel) {
        if (sel == null) {
            const fresh = SPLEV.selection_new();
            SPLEV.selection_clear(fresh, 1);
            return fresh;
        }
        const clone = SPLEV.selection_clone(sel);
        SPLEV.selection_not(clone);
        return clone;
    }

    function numpointsHandler(sel) {
        const rect = { lx: 0, ly: 0, hx: 0, hy: 0 }; /* C: cg.zeroNhRect */
        SPLEV.selection_getbounds(sel, rect);
        let ret = 0;
        for (let x = rect.lx; x <= rect.hx; x++)
            for (let y = rect.ly; y <= rect.hy; y++)
                if (SPLEV.selection_getpoint(x, y, sel))
                    ret++;
        return ret;
    }

    interp.defineGlobal('selection', stubTable({
        'new':         () => SPLEV.selection_new(),
        'clone':       (sel) => SPLEV.selection_clone(sel),
        'area':        areaHandler,
        'set':         setHandler, 'negate': negateHandler, 'match': matchHandler,
        'grow':        growHandler, 'rndcoord': rndcoordHandler, 'randline': randlineHandler, 'percentage': percentageHandler,
        'numpoints':   numpointsHandler, 'iterate': iterateHandler, 'bounds': boundsHandler,
        'floodfill':   floodfillHandler,
        'filter_mapchar': filterMapcharHandler,
        'fillrect':    areaHandler, 'line': lineHandler, 'rect': rectHandler, 'room': null,
    }));

    /* --- nhc: the Lua-visible constants table ---
     * C ref: nhlua.c:1903-1937 nhl_consts[] + init_nhc_data(), which does
     * lua_setglobal(L, "nhc").  It was missing entirely, so `nhc.COLNO`
     * indexed a nil and every level file that reaches nhlib.lua:87
     *     local reqpts = ((nhc.COLNO * nhc.ROWNO) - n_prot) / 12;
     * died with "attempt to index a non-table value" — that is hell_tweaks's
     * river block, i.e. asmodeus, fakewiz1, fakewiz2, orcus, wizard1, wizard2,
     * wizard3 and hellfill, EVERY Gehennom level file, all on one missing
     * global.  (COLNO and ROWNO are the only two entries any dat/*.lua reads;
     * the rest are transcribed because C registers them and a future .lua may.)
     * NUM_OBJECTS is 481 for this build (js/glyphs.js:59, js/read.js:2349);
     * FIRST_OBJECT is 18 (js/cmd.js:24978, objects.h MARKER(FIRST_OBJECT,
     * LAST_GENERIC+1)).  DLB is the organiser build's data-librarian flag; no
     * dat/*.lua reads it, and this port reads dat/ from the filesystem, so 0. */
    const nhcTable = new LuaTable();
    nhcTable.set('COLNO', 80);          /* global.h:382 */
    nhcTable.set('ROWNO', 21);          /* global.h:383 */
    nhcTable.set('NUMMONS', 383);       /* js/pm.generated.js:385 */
    nhcTable.set('LOW_PM', 0);          /* permonst.h:15 NON_PM + 1 */
    nhcTable.set('HIGH_PM', 382);       /* permonst.h:22 NUMMONS - 1 */
    nhcTable.set('FIRST_OBJECT', 18);
    nhcTable.set('LAST_OBJECT', 480);   /* NUM_OBJECTS - 1 */
    nhcTable.set('DLB', 0);
    interp.defineGlobal('nhc', nhcTable);

    // --- u global table ---
    // C ref: nhlua.c:1963-2027 nhl_meta_u_index (the `u` metatable's __index)
    // and nhlua.c:2030-2036 nhl_meta_u_newindex.
    //
    // role='Monk', depth=1, uhunger=150, ux=10, uy=10.  Two things were wrong
    // with that and both are RNG-visible:
    //
    //   1. Every field was a FUNCTION, not a value.  Lua's `20 + u.depth` then
    //      arithmetics on a function, which in this interpreter is NaN, and
    //      `math.random(0,99) < NaN` is false.  So dat/nhlib.lua's
    //      hell_tweaks() at line 64,
    //          if (percent(20 + u.depth)) then ... random lava pools ...
    //      was DEAD on every Gehennom level: the whole pools block never ran.
    //   2. depth was pinned to 1 anyway, so even a value-returning stub would
    //      have got the threshold and `math.random(u.depth)` at line 66 wrong.
    //
    //     C : rn2(27)=4 @random src=nhlib.lua:8 parent=hell_tweaks(nhlib.lua:66)
    //     JS: rn2(100)=34
    // C had passed percent(20+27) and was drawing math.random(u.depth) for
    // maxpools; JS's percent had gone false and it was already down at line 82
    // asking percent(50) about the lava river.
    //
    // The port is C's index function, verbatim in shape: the ustruct table
    // first, then role/moves/uhave_amulet/depth/invocation_level, then C's
    // nhl_error for anything else.  Reads are LIVE (a subclassed get(), which
    // is what a __index metamethod is) because a level's Lua runs mid-game and
    // u.depth must be this level's depth, not the depth at interpreter setup.
    interp.defineGlobal('u', new NhUTable());

    // C nhl_init loads the same nhlib.lua through the shared loader.
    if (!(await nhl_loadlua(interp, 'nhlib.lua')))
        throw new Error('Failed to load nhlib.lua');

    return interp;
}
