// nhl_lua.js — Fengari runner for upstream **`dat/*.lua`** des protofiles (minetn vertical slice).
// C ref: nhlua.c `load_lua` / nhlib.lua bootstrap.
//
// Fengari loads lazily: Node uses npm `fengari`; browser uses globalThis.fengari
// from js/vendor/fengari-web.js (see index.html).

import { nhlRn2LikeC, nhlRandomLikeC } from './nhl_rng.js';
import * as Des from './des_api.js';
import { BOOL_RANDOM } from './const.js';

/** @type {import('fengari').lua | undefined} */
let lua;
/** @type {import('fengari').lauxlib | undefined} */
let lauxlib;
/** @type {import('fengari').lualib | undefined} */
let lualib;
/** @type {import('fengari/src/fengaricore.js').to_luastring | undefined} */
let to_luastring;

function isNodeRuntime() {
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}

async function getFengariLikeC() {
    if (isNodeRuntime()) {
        const [fengari, core] = await Promise.all([
            import('fengari'),
            import('fengari/src/fengaricore.js'),
        ]);
        return {
            lua: fengari.lua,
            lauxlib: fengari.lauxlib,
            lualib: fengari.lualib,
            to_luastring: core.to_luastring,
        };
    }
    const f = globalThis.fengari;
    if (!f?.lua || !f?.lauxlib || !f?.lualib || !f?.to_luastring) {
        throw new Error('fengari-web not loaded — index.html must include js/vendor/fengari-web.js');
    }
    return {
        lua: f.lua,
        lauxlib: f.lauxlib,
        lualib: f.lualib,
        to_luastring: f.to_luastring,
    };
}

/** @type {WeakMap<object, Des.NhlDesCtx>} */
const ctxByState = new WeakMap();

function luaStr(L, idx) {
    if (lua.lua_isnoneornil(L, idx)) return '';
    return lua.lua_tojsstring(L, idx) ?? '';
}

function luaInt(L, idx) {
    return lua.lua_tointeger(L, idx) | 0;
}

/** Read string field from table at `tidx`. */
function tableStr(L, tidx, key) {
    lua.lua_getfield(L, tidx, to_luastring(key, true));
    const s = luaStr(L, -1);
    lua.lua_pop(L, 1);
    return s;
}

/** Read int field; missing → `dflt`. */
function tableIntOpt(L, tidx, key, dflt) {
    lua.lua_getfield(L, tidx, to_luastring(key, true));
    let v = dflt;
    if (!lua.lua_isnil(L, -1)) v = lua.lua_tointeger(L, -1) | 0;
    lua.lua_pop(L, 1);
    return v;
}

/** Read bool field; missing → `dflt`. */
function tableBoolOpt(L, tidx, key, dflt) {
    lua.lua_getfield(L, tidx, to_luastring(key, true));
    let v = dflt;
    if (!lua.lua_isnil(L, -1)) v = !!lua.lua_toboolean(L, -1);
    lua.lua_pop(L, 1);
    return v;
}

/** @param {object} L @param {number} tidx @param {string} key @returns {Record<number, number>|null} */
function tableRegionOpt(L, tidx, key) {
    lua.lua_getfield(L, tidx, to_luastring(key, true));
    if (lua.lua_isnil(L, -1) || lua.lua_type(L, -1) !== lua.LUA_TTABLE) {
        lua.lua_pop(L, 1);
        return null;
    }
    const ridx = lua.lua_gettop(L);
    const o = {};
    for (let i = 1; i <= 4; i++) {
        lua.lua_geti(L, ridx, i);
        o[i] = lua.lua_tointeger(L, -1) | 0;
        lua.lua_pop(L, 1);
    }
    lua.lua_pop(L, 1);
    return o;
}

/**
 * @param {import('./gstate.js').game} g
 * @param {string} name — e.g. **`minetn-1.lua`**
 * @param {Record<string, Function>} mkmapDeps
 * @returns {Promise<boolean>}
 */
export async function runLuaProtofileLikeC(g, name, mkmapDeps) {
    const base = String(name ?? '').replace(/\.lua$/i, '');
    if (!base || base !== 'minetn-1') return false;

    ({ lua, lauxlib, lualib, to_luastring } = await getFengariLikeC());

    const mksobj = mkmapDeps.mksobj;
    const mkcorpstat = mkmapDeps.mkcorpstat;
    const appendLregion = mkmapDeps.appendLregion;
    if (!mksobj || !mkcorpstat || !appendLregion) return false;

    const ctx = {
        g,
        deps: {
            ...mkmapDeps,
        },
        nextSel: 0,
        sels: new Map(),
        mapGx: undefined,
    };

    const L = lauxlib.luaL_newstate();
    if (!L) return false;
    ctxByState.set(L, ctx);
    lualib.luaL_openlibs(L);

    /* nh table — nhlib.lua `math.random` → nh.rn2 / nh.random */
    lua.lua_newtable(L);
    const nhIdx = lua.lua_gettop(L);
    lua.lua_pushjsfunction(L, (L2) => {
        const n = lua.luaL_checkinteger(L2, 1);
        lua.lua_pushinteger(L2, nhlRn2LikeC(n));
        return 1;
    });
    lua.lua_setfield(L, nhIdx, to_luastring('rn2', true));
    lua.lua_pushjsfunction(L, (L2) => {
        const top = lua.lua_gettop(L2);
        const a = lua.luaL_checkinteger(L2, 1);
        if (top >= 2) {
            const b = lua.luaL_checkinteger(L2, 2);
            lua.lua_pushinteger(L2, nhlRandomLikeC(a, b));
        } else {
            lua.lua_pushinteger(L2, nhlRandomLikeC(a));
        }
        return 1;
    });
    lua.lua_setfield(L, nhIdx, to_luastring('random', true));
    for (const k of ['pline', 'callback', 'eckey', 'gamestate']) {
        lua.lua_pushjsfunction(L, () => 0);
        lua.lua_setfield(L, nhIdx, to_luastring(k, true));
    }
    lua.lua_setglobal(L, to_luastring('nh', true));

    /* selection + des — JS bridges */
    lua.lua_newtable(L);
    const nhc = lua.lua_gettop(L);

    const pushDes = (name, fn) => {
        lua.lua_pushjsfunction(L, fn);
        lua.lua_setfield(L, nhc, to_luastring(name, true));
    };

    pushDes('_sel_rect', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const lx = luaInt(L2, 1);
        const ly = luaInt(L2, 2);
        const hx = luaInt(L2, 3);
        const hy = luaInt(L2, 4);
        lua.lua_pushinteger(L2, Des.desSelRectLikeC(c, lx, ly, hx, hy));
        return 1;
    });
    pushDes('_sel_flood', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const x = luaInt(L2, 1);
        const y = luaInt(L2, 2);
        const d = lua.lua_toboolean(L2, 3);
        lua.lua_pushinteger(L2, Des.desSelFloodLikeC(c, x, y, d));
        return 1;
    });
    pushDes('_sel_and', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const a = luaInt(L2, 1);
        const b = luaInt(L2, 2);
        lua.lua_pushinteger(L2, Des.desSelBandLikeC(c, a, b));
        return 1;
    });
    pushDes('_sel_rndcoord', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const id = luaInt(L2, 1);
        const rm = lua.lua_toboolean(L2, 2);
        const p = Des.desSelRndcoordLikeC(c, id, rm ? 1 : 0);
        if (!p) {
            lua.lua_pushnil(L2);
            return 1;
        }
        lua.lua_createtable(L2, 0, 2);
        const t = lua.lua_gettop(L2);
        lua.lua_pushinteger(L2, p.x);
        lua.lua_setfield(L2, t, to_luastring('x', true));
        lua.lua_pushinteger(L2, p.y);
        lua.lua_setfield(L2, t, to_luastring('y', true));
        return 1;
    });

    pushDes('des_level_flags', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const n = lua.lua_gettop(L2);
        for (let i = 1; i <= n; i++) Des.desLevelFlagsLikeC(c, luaStr(L2, i));
        return 0;
    });
    pushDes('des_level_init', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        lua.luaL_checktype(L2, 1, lua.LUA_TTABLE);
        const t = {
            style: tableStr(L2, 1, 'style'),
            fg: tableStr(L2, 1, 'fg'),
            bg: tableStr(L2, 1, 'bg'),
            smoothed: tableBoolOpt(L2, 1, 'smoothed', false),
            joined: tableBoolOpt(L2, 1, 'joined', false),
            walled: tableBoolOpt(L2, 1, 'walled', false),
            lit: tableIntOpt(L2, 1, 'lit', BOOL_RANDOM),
            filling: (() => {
                lua.lua_getfield(L2, 1, to_luastring('filling', true));
                if (lua.lua_isnil(L2, -1)) {
                    lua.lua_pop(L2, 1);
                    return undefined;
                }
                const s = luaStr(L2, -1);
                lua.lua_pop(L2, 1);
                return s;
            })(),
        };
        Des.desLevelInitLikeC(c, t);
        return 0;
    });
    pushDes('des_map', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const mapStr = lua.lua_tojsstring(L2, 1) ?? '';
        Des.desMapAsciiLikeC(c, mapStr);
        return 0;
    });
    pushDes('des_teleport_region', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        lua.luaL_checktype(L2, 1, lua.LUA_TTABLE);
        const region = tableRegionOpt(L2, 1, 'region');
        const exclude = tableRegionOpt(L2, 1, 'exclude');
        if (!region || !exclude) return 0;
        Des.desTeleportRegionLikeC(c, { region, exclude });
        return 0;
    });
    pushDes('des_region', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        if (lua.lua_gettop(L2) === 2 && lua.lua_type(L2, 1) === lua.LUA_TTABLE) {
            lua.lua_getfield(L2, 1, to_luastring('_id', true));
            const sid = lua.lua_tointeger(L2, -1) | 0;
            lua.lua_pop(L2, 1);
            const lit = luaStr(L2, 2);
            Des.desRegionSelectionLitLikeC(c, sid, lit);
            return 0;
        }
        return 0;
    });
    pushDes('des_levregion', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        lua.luaL_checktype(L2, 1, lua.LUA_TTABLE);
        const typ = tableStr(L2, 1, 'type');
        const region = tableRegionOpt(L2, 1, 'region');
        const exclude = tableRegionOpt(L2, 1, 'exclude');
        if (!region || !exclude) return 0;
        Des.desLevregionLikeC(c, { type: typ, region, exclude });
        return 0;
    });
    pushDes('des_feature', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const feat = lua.lua_tojsstring(L2, 1) ?? '';
        const x = luaInt(L2, 2);
        const y = luaInt(L2, 3);
        Des.desFeatureLikeC(c, feat, x, y);
        return 0;
    });
    pushDes('des_altar', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        lua.luaL_checktype(L2, 1, lua.LUA_TTABLE);
        Des.desAltarLikeC(c, {
            x: tableIntOpt(L2, 1, 'x', 0),
            y: tableIntOpt(L2, 1, 'y', 0),
        });
        return 0;
    });
    pushDes('des_door', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const how = lua.lua_tojsstring(L2, 1) ?? '';
        const x = luaInt(L2, 2);
        const y = luaInt(L2, 3);
        Des.desDoorLikeC(c, how, x, y);
        return 0;
    });
    pushDes('des_replace_terrain', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        lua.luaL_checktype(L2, 1, lua.LUA_TTABLE);
        const region = tableRegionOpt(L2, 1, 'region');
        if (!region) return 0;
        Des.desReplaceTerrainLikeC(c, {
            region,
            fromterrain: tableStr(L2, 1, 'fromterrain'),
            toterrain: tableStr(L2, 1, 'toterrain'),
            chance: tableIntOpt(L2, 1, 'chance', 0),
        });
        return 0;
    });
    pushDes('des_object', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const typ = lua.lua_type(L2, 1);
        if (typ === lua.LUA_TSTRING) {
            Des.desObjectLikeC(c, luaStr(L2, 1));
            return 0;
        }
        if (typ !== lua.LUA_TTABLE) return 0;
        const o = {};
        lua.lua_getfield(L2, 1, to_luastring('id', true));
        if (!lua.lua_isnil(L2, -1)) o.id = luaStr(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('montype', true));
        if (!lua.lua_isnil(L2, -1)) o.montype = luaStr(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('x', true));
        if (!lua.lua_isnil(L2, -1)) o.x = lua.lua_tointeger(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('y', true));
        if (!lua.lua_isnil(L2, -1)) o.y = lua.lua_tointeger(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('quantity', true));
        if (!lua.lua_isnil(L2, -1)) o.quantity = lua.lua_tointeger(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('coord', true));
        if (lua.lua_type(L2, -1) === lua.LUA_TTABLE) {
            const ci = lua.lua_gettop(L2);
            lua.lua_getfield(L2, ci, to_luastring('x', true));
            const cx = lua.lua_tointeger(L2, -1);
            lua.lua_pop(L2, 1);
            lua.lua_getfield(L2, ci, to_luastring('y', true));
            const cy = lua.lua_tointeger(L2, -1);
            lua.lua_pop(L2, 1);
            o.coord = { x: cx, y: cy };
        }
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('buc', true));
        if (!lua.lua_isnil(L2, -1)) o.buc = luaStr(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('spe', true));
        if (!lua.lua_isnil(L2, -1)) o.spe = lua.lua_tointeger(L2, -1);
        lua.lua_pop(L2, 1);
        Des.desObjectLikeC(c, o);
        return 0;
    });
    pushDes('des_monster', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        const typ = lua.lua_type(L2, 1);
        if (typ === lua.LUA_TSTRING) {
            Des.desMonsterLikeC(c, luaStr(L2, 1));
            return 0;
        }
        if (typ !== lua.LUA_TTABLE) return 0;
        const o = {};
        lua.lua_getfield(L2, 1, to_luastring('id', true));
        if (!lua.lua_isnil(L2, -1)) o.id = luaStr(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('peaceful', true));
        if (!lua.lua_isnil(L2, -1)) o.peaceful = lua.lua_toboolean(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('m_lev_adj', true));
        if (!lua.lua_isnil(L2, -1)) o.m_lev_adj = lua.lua_tointeger(L2, -1);
        lua.lua_pop(L2, 1);
        lua.lua_getfield(L2, 1, to_luastring('coord', true));
        if (lua.lua_type(L2, -1) === lua.LUA_TTABLE) {
            const ci = lua.lua_gettop(L2);
            lua.lua_getfield(L2, ci, to_luastring('x', true));
            const cx = lua.lua_tointeger(L2, -1);
            lua.lua_pop(L2, 1);
            lua.lua_getfield(L2, ci, to_luastring('y', true));
            const cy = lua.lua_tointeger(L2, -1);
            lua.lua_pop(L2, 1);
            o.coord = { x: cx, y: cy };
        }
        lua.lua_pop(L2, 1);
        Des.desMonsterLikeC(c, o);
        return 0;
    });
    pushDes('des_wallify', (L2) => {
        const c = ctxByState.get(L2);
        if (!c) return 0;
        Des.desWallifyLikeC(c);
        return 0;
    });

    lua.lua_setglobal(L, to_luastring('nhc', true));

    const shim = `
selection = {
  area = function(lx, ly, hx, hy)
    return setmetatable({ _id = nhc._sel_rect(lx, ly, hx, hy) }, SelMeta)
  end,
  floodfill = function(x, y, d)
    d = d or false
    return setmetatable({ _id = nhc._sel_flood(x, y, d) }, SelMeta)
  end,
}
SelMeta = {
  __band = function(a, b)
    return setmetatable({ _id = nhc._sel_and(a._id, b._id) }, SelMeta)
  end,
  __index = {
    rndcoord = function(self, rm)
      rm = rm or 0
      return nhc._sel_rndcoord(self._id, rm)
    end,
  },
}

des = {
  level_flags = function(...) return nhc.des_level_flags(...) end,
  level_init = function(t) return nhc.des_level_init(t) end,
  map = function(s) return nhc.des_map(s) end,
  teleport_region = function(t) return nhc.des_teleport_region(t) end,
  region = function(a, b) return nhc.des_region(a, b) end,
  levregion = function(t) return nhc.des_levregion(t) end,
  feature = function(f, x, y) return nhc.des_feature(f, x, y) end,
  altar = function(t) return nhc.des_altar(t) end,
  door = function(h, x, y) return nhc.des_door(h, x, y) end,
  replace_terrain = function(t) return nhc.des_replace_terrain(t) end,
  object = function(o) return nhc.des_object(o) end,
  monster = function(m) return nhc.des_monster(m) end,
  wallify = function() return nhc.des_wallify() end,
}
`;
    const nhlib = await Des.readUpstreamDatLikeC('nhlib');
    const minetn = await Des.readUpstreamDatLikeC('minetn-1');

    const runChunk = (src, tag) => {
        const err = lauxlib.luaL_loadstring(L, to_luastring(src, true));
        if (err !== lua.LUA_OK) {
            const msg = lua.lua_tojsstring(L, -1);
            lua.lua_pop(L, 1);
            throw new Error(`${tag}: ${msg}`);
        }
        const er2 = lua.lua_pcall(L, 0, 0, 0);
        if (er2 !== lua.LUA_OK) {
            const msg = lua.lua_tojsstring(L, -1);
            lua.lua_pop(L, 1);
            throw new Error(`${tag} pcall: ${msg}`);
        }
    };

    try {
        runChunk(nhlib, 'nhlib.lua');
        runChunk(shim, 'nhl_shim.lua');
        runChunk(minetn, 'minetn-1.lua');
    } catch (e) {
        console.error(e);
        return false;
    }
    return true;
}
