// host/lua_api.js - the Lua 5.4 C API for the game's JS code.
//
// The Lua VM is the compiled residue (js/vendor/clib-lua.js).  NetHack's
// Lua glue (nhlua.c, nhlobj.c, nhlsel.c, sp_lev.c, ...) calls it exactly
// as in C: lua_settop(L, -2), luaL_checkinteger(L, 1), lua_pushstring(L, s).
// Every function of lua.h / lauxlib.h / lualib.h is exported here under its
// C name, and the header macros (lua_pop, lua_tostring, lua_pcall, ...) as
// one-line functions with the macro's definition.
//
// Values: pointers are addresses (numbers) or anything rt/struct.js can
// take the address of (views, typed refs); C strings are addresses;
// lua_Integer is a Number (64-bit in the VM, exact below 2^53) or a BigInt;
// a lua_CFunction (or lua_Alloc, lua_WarnFunction, lua_Hook) is a JS
// function, given to the VM as a function-table index by `conv.fnIndex`.
//
//   install_lua_api(clib, conv)   once per residue instance, before game code runs
//     conv.addr(v)       address of a pointer-like value (default: number, ._a, byteOffset)
//     conv.fnIndex(f)    function-table index of a JS function (required to pass callbacks)
//     conv.fnFromIndex(i) JS function for a table index (results of lua_atpanic, ...)
//     conv.state(a)      JS value for a lua_State * result (default: the address)

// ---- lua.h / luaconf.h / lauxlib.h constants (as the headers define them) -----------------

export const LUA_VERSION_NUM = 504;
export const LUA_MULTRET = -1;
export const LUAI_MAXSTACK = 1000000; /* luaconf.h, LUAI_IS32INT */
export const LUA_REGISTRYINDEX = -LUAI_MAXSTACK - 1000;
export const LUA_OK = 0;
export const LUA_YIELD = 1;
export const LUA_ERRRUN = 2;
export const LUA_ERRSYNTAX = 3;
export const LUA_ERRMEM = 4;
export const LUA_ERRERR = 5;
export const LUA_ERRFILE = LUA_ERRERR + 1;
export const LUA_TNONE = -1;
export const LUA_TNIL = 0;
export const LUA_TBOOLEAN = 1;
export const LUA_TLIGHTUSERDATA = 2;
export const LUA_TNUMBER = 3;
export const LUA_TSTRING = 4;
export const LUA_TTABLE = 5;
export const LUA_TFUNCTION = 6;
export const LUA_TUSERDATA = 7;
export const LUA_TTHREAD = 8;
export const LUA_NUMTYPES = 9;
export const LUA_MINSTACK = 20;
export const LUA_RIDX_MAINTHREAD = 1;
export const LUA_RIDX_GLOBALS = 2;
export const LUA_RIDX_LAST = LUA_RIDX_GLOBALS;
export const LUA_OPADD = 0;
export const LUA_OPEQ = 0;
export const LUA_OPLT = 1;
export const LUA_OPLE = 2;
export const LUA_GCSTOP = 0;
export const LUA_GCRESTART = 1;
export const LUA_GCCOLLECT = 2;
export const LUA_GCCOUNT = 3;
export const LUA_GCCOUNTB = 4;
export const LUA_GCSTEP = 5;
export const LUA_GCSETPAUSE = 6;
export const LUA_GCSETSTEPMUL = 7;
export const LUA_GCISRUNNING = 9;
export const LUA_GCGEN = 10;
export const LUA_GCINC = 11;
export const LUA_HOOKCALL = 0;
export const LUA_HOOKRET = 1;
export const LUA_HOOKLINE = 2;
export const LUA_HOOKCOUNT = 3;
export const LUA_HOOKTAILCALL = 4;
export const LUA_MASKCALL = 1 << LUA_HOOKCALL;
export const LUA_MASKRET = 1 << LUA_HOOKRET;
export const LUA_MASKLINE = 1 << LUA_HOOKLINE;
export const LUA_MASKCOUNT = 1 << LUA_HOOKCOUNT;
export const LUA_EXTRASPACE = 4; /* sizeof(void *), wasm32 */
export const LUAL_NUMSIZES = 8 * 16 + 8; /* sizeof(lua_Integer)*16 + sizeof(lua_Number) */
export const LUA_NOREF = -2;
export const LUA_REFNIL = -1;

// ---- the functions ------------------------------------------------------------------------

// every C API function of the residue, by name (filled by install_lua_api)
const api = Object.create(null);

// results that are function pointers (table indices in the VM)
const FN_RESULT = new Set(["lua_atpanic", "lua_getallocf", "lua_tocfunction", "lua_gethook"]);
// results that are lua_State pointers
const STATE_RESULT = new Set(["lua_newstate", "lua_newthread", "lua_tothread", "luaL_newstate"]);

function defaultAddr(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v._a !== undefined) return v._a;
  if (v.byteOffset !== undefined) return v.byteOffset;
  throw new Error("lua_api: not a pointer: " + v);
}

let clib = null;

/** Bind every exported Lua C API function to the residue instance `c`. */
export function install_lua_api(c, conv = {}) {
  clib = c;
  const addr = conv.addr ?? defaultAddr;
  const fnIndex = conv.fnIndex ?? ((f) => { throw new Error("lua_api: no function table to pass " + f.name); });
  const fnFromIndex = conv.fnFromIndex ?? ((i) => i);
  const state = conv.state ?? ((a) => a);
  const ptr = (v) => (typeof v === "function" ? fnIndex(v) : addr(v));
  const arg = (v) => {
    if (typeof v === "function") return fnIndex(v);
    if (v === null || v === undefined) return 0;
    if (typeof v === "object" && !(v instanceof Array) && typeof v.rest !== "function") return addr(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  };
  for (const [name, sig] of Object.entries(c.signatures)) {
    if (!/^lua(L)?_/.test(name)) continue;
    const [ret, params] = sig.split(":");
    const raw = c.fn[name];
    let f;
    if (/^[piud]*$/.test(params) && ret !== "j" && ret !== "J" && ret !== "S") {
      const kinds = [...params];
      const n = kinds.length;
      f = function (...args) {
        for (let k = 0; k < n; k++) {
          const t = kinds[k];
          const v = args[k];
          args[k] = t === "p" ? ptr(v) : t === "d" ? +v : typeof v === "boolean" ? +v : v | 0;
        }
        args.length = n;
        const r = raw(...args);
        return ret === "u" ? r >>> 0 : ret === "v" ? undefined : r;
      };
    } else {
      f = function (...args) {
        return c.call(name, ...args.map(arg));
      };
    }
    let g = f;
    if (FN_RESULT.has(name)) g = (...a) => fnFromIndex(f(...a));
    else if (STATE_RESULT.has(name)) g = (...a) => state(f(...a));
    Object.defineProperty(g, "name", { value: name });
    api[name] = g;
  }
  bindExports();
}

/** The residue instance the API is bound to. */
export function lua_clib() {
  return clib;
}

// exported live bindings, assigned by install_lua_api()
export let lua_absindex, lua_arith, lua_atpanic, lua_callk, lua_checkstack, lua_close, lua_closeslot,
  lua_closethread, lua_compare, lua_concat, lua_copy, lua_createtable, lua_dump, lua_error, lua_gc,
  lua_getallocf, lua_getfield, lua_getglobal, lua_gethook, lua_gethookcount, lua_gethookmask, lua_geti,
  lua_getinfo, lua_getiuservalue, lua_getlocal, lua_getmetatable, lua_getstack, lua_gettable, lua_gettop,
  lua_getupvalue, lua_iscfunction, lua_isinteger, lua_isnumber, lua_isstring, lua_isuserdata,
  lua_isyieldable, lua_len, lua_load, lua_newstate, lua_newthread, lua_newuserdatauv, lua_next,
  lua_pcallk, lua_pushboolean, lua_pushcclosure, lua_pushfstring, lua_pushinteger,
  lua_pushlightuserdata, lua_pushlstring, lua_pushnil, lua_pushnumber, lua_pushstring, lua_pushthread,
  lua_pushvalue, lua_pushvfstring, lua_rawequal, lua_rawget, lua_rawgeti, lua_rawgetp, lua_rawlen,
  lua_rawset, lua_rawseti, lua_rawsetp, lua_resetthread, lua_resume, lua_rotate, lua_setallocf,
  lua_setcstacklimit, lua_setfield, lua_setglobal, lua_sethook, lua_seti, lua_setiuservalue,
  lua_setlocal, lua_setmetatable, lua_settable, lua_settop, lua_setupvalue, lua_setwarnf, lua_status,
  lua_stringtonumber, lua_toboolean, lua_tocfunction, lua_toclose, lua_tointegerx, lua_tolstring,
  lua_tonumberx, lua_topointer, lua_tothread, lua_touserdata, lua_type, lua_typename, lua_upvalueid,
  lua_upvaluejoin, lua_version, lua_warning, lua_xmove, lua_yieldk;
export let luaL_addgsub, luaL_addlstring, luaL_addstring, luaL_addvalue, luaL_argerror, luaL_buffinit,
  luaL_buffinitsize, luaL_callmeta, luaL_checkany, luaL_checkinteger, luaL_checklstring,
  luaL_checknumber, luaL_checkoption, luaL_checkstack, luaL_checktype, luaL_checkudata,
  luaL_checkversion_, luaL_error, luaL_execresult, luaL_fileresult, luaL_getmetafield,
  luaL_getsubtable, luaL_gsub, luaL_len, luaL_loadbufferx, luaL_loadfilex, luaL_loadstring,
  luaL_newmetatable, luaL_newstate, luaL_openlibs, luaL_optinteger, luaL_optlstring, luaL_optnumber,
  luaL_prepbuffsize, luaL_pushresult, luaL_pushresultsize, luaL_ref, luaL_requiref, luaL_setfuncs,
  luaL_setmetatable, luaL_testudata, luaL_tolstring, luaL_traceback, luaL_typeerror, luaL_unref,
  luaL_where;

function missing(name) {
  return function () {
    throw new Error(`lua_api: ${name} is not in the residue`);
  };
}

function bindExports() {
  const b = (name) => api[name] ?? missing(name);
  lua_absindex = b("lua_absindex"); lua_arith = b("lua_arith"); lua_atpanic = b("lua_atpanic");
  lua_callk = b("lua_callk"); lua_checkstack = b("lua_checkstack"); lua_close = b("lua_close");
  lua_closeslot = b("lua_closeslot"); lua_closethread = b("lua_closethread"); lua_compare = b("lua_compare");
  lua_concat = b("lua_concat"); lua_copy = b("lua_copy"); lua_createtable = b("lua_createtable");
  lua_dump = b("lua_dump"); lua_error = b("lua_error"); lua_gc = b("lua_gc"); lua_getallocf = b("lua_getallocf");
  lua_getfield = b("lua_getfield"); lua_getglobal = b("lua_getglobal"); lua_gethook = b("lua_gethook");
  lua_gethookcount = b("lua_gethookcount"); lua_gethookmask = b("lua_gethookmask"); lua_geti = b("lua_geti");
  lua_getinfo = b("lua_getinfo"); lua_getiuservalue = b("lua_getiuservalue"); lua_getlocal = b("lua_getlocal");
  lua_getmetatable = b("lua_getmetatable"); lua_getstack = b("lua_getstack"); lua_gettable = b("lua_gettable");
  lua_gettop = b("lua_gettop"); lua_getupvalue = b("lua_getupvalue"); lua_iscfunction = b("lua_iscfunction");
  lua_isinteger = b("lua_isinteger"); lua_isnumber = b("lua_isnumber"); lua_isstring = b("lua_isstring");
  lua_isuserdata = b("lua_isuserdata"); lua_isyieldable = b("lua_isyieldable"); lua_len = b("lua_len");
  lua_load = b("lua_load"); lua_newstate = b("lua_newstate"); lua_newthread = b("lua_newthread");
  lua_newuserdatauv = b("lua_newuserdatauv"); lua_next = b("lua_next"); lua_pcallk = b("lua_pcallk");
  lua_pushboolean = b("lua_pushboolean"); lua_pushcclosure = b("lua_pushcclosure");
  lua_pushfstring = b("lua_pushfstring"); lua_pushinteger = b("lua_pushinteger");
  lua_pushlightuserdata = b("lua_pushlightuserdata"); lua_pushlstring = b("lua_pushlstring");
  lua_pushnil = b("lua_pushnil"); lua_pushnumber = b("lua_pushnumber"); lua_pushstring = b("lua_pushstring");
  lua_pushthread = b("lua_pushthread"); lua_pushvalue = b("lua_pushvalue"); lua_pushvfstring = b("lua_pushvfstring");
  lua_rawequal = b("lua_rawequal"); lua_rawget = b("lua_rawget"); lua_rawgeti = b("lua_rawgeti");
  lua_rawgetp = b("lua_rawgetp"); lua_rawlen = b("lua_rawlen"); lua_rawset = b("lua_rawset");
  lua_rawseti = b("lua_rawseti"); lua_rawsetp = b("lua_rawsetp"); lua_resetthread = b("lua_resetthread");
  lua_resume = b("lua_resume"); lua_rotate = b("lua_rotate"); lua_setallocf = b("lua_setallocf");
  lua_setcstacklimit = b("lua_setcstacklimit"); lua_setfield = b("lua_setfield"); lua_setglobal = b("lua_setglobal");
  lua_sethook = b("lua_sethook"); lua_seti = b("lua_seti"); lua_setiuservalue = b("lua_setiuservalue");
  lua_setlocal = b("lua_setlocal"); lua_setmetatable = b("lua_setmetatable"); lua_settable = b("lua_settable");
  lua_settop = b("lua_settop"); lua_setupvalue = b("lua_setupvalue"); lua_setwarnf = b("lua_setwarnf");
  lua_status = b("lua_status"); lua_stringtonumber = b("lua_stringtonumber"); lua_toboolean = b("lua_toboolean");
  lua_tocfunction = b("lua_tocfunction"); lua_toclose = b("lua_toclose"); lua_tointegerx = b("lua_tointegerx");
  lua_tolstring = b("lua_tolstring"); lua_tonumberx = b("lua_tonumberx"); lua_topointer = b("lua_topointer");
  lua_tothread = b("lua_tothread"); lua_touserdata = b("lua_touserdata"); lua_type = b("lua_type");
  lua_typename = b("lua_typename"); lua_upvalueid = b("lua_upvalueid"); lua_upvaluejoin = b("lua_upvaluejoin");
  lua_version = b("lua_version"); lua_warning = b("lua_warning"); lua_xmove = b("lua_xmove"); lua_yieldk = b("lua_yieldk");
  luaL_addgsub = b("luaL_addgsub"); luaL_addlstring = b("luaL_addlstring"); luaL_addstring = b("luaL_addstring");
  luaL_addvalue = b("luaL_addvalue"); luaL_argerror = b("luaL_argerror"); luaL_buffinit = b("luaL_buffinit");
  luaL_buffinitsize = b("luaL_buffinitsize"); luaL_callmeta = b("luaL_callmeta"); luaL_checkany = b("luaL_checkany");
  luaL_checkinteger = b("luaL_checkinteger"); luaL_checklstring = b("luaL_checklstring");
  luaL_checknumber = b("luaL_checknumber"); luaL_checkoption = b("luaL_checkoption");
  luaL_checkstack = b("luaL_checkstack"); luaL_checktype = b("luaL_checktype"); luaL_checkudata = b("luaL_checkudata");
  luaL_checkversion_ = b("luaL_checkversion_"); luaL_error = b("luaL_error"); luaL_execresult = b("luaL_execresult");
  luaL_fileresult = b("luaL_fileresult"); luaL_getmetafield = b("luaL_getmetafield");
  luaL_getsubtable = b("luaL_getsubtable"); luaL_gsub = b("luaL_gsub"); luaL_len = b("luaL_len");
  luaL_loadbufferx = b("luaL_loadbufferx"); luaL_loadfilex = b("luaL_loadfilex"); luaL_loadstring = b("luaL_loadstring");
  luaL_newmetatable = b("luaL_newmetatable"); luaL_newstate = b("luaL_newstate"); luaL_openlibs = b("luaL_openlibs");
  luaL_optinteger = b("luaL_optinteger"); luaL_optlstring = b("luaL_optlstring"); luaL_optnumber = b("luaL_optnumber");
  luaL_prepbuffsize = b("luaL_prepbuffsize"); luaL_pushresult = b("luaL_pushresult");
  luaL_pushresultsize = b("luaL_pushresultsize"); luaL_ref = b("luaL_ref"); luaL_requiref = b("luaL_requiref");
  luaL_setfuncs = b("luaL_setfuncs"); luaL_setmetatable = b("luaL_setmetatable"); luaL_testudata = b("luaL_testudata");
  luaL_tolstring = b("luaL_tolstring"); luaL_traceback = b("luaL_traceback"); luaL_typeerror = b("luaL_typeerror");
  luaL_unref = b("luaL_unref"); luaL_where = b("luaL_where");
}

// ---- lua.h macros ---------------------------------------------------------------------------

export function lua_upvalueindex(i) { return LUA_REGISTRYINDEX - i; }
export function lua_call(L, n, r) { return lua_callk(L, n, r, 0, null); }
export function lua_pcall(L, n, r, f) { return lua_pcallk(L, n, r, f, 0, null); }
export function lua_yield(L, n) { return lua_yieldk(L, n, 0, null); }
export function lua_getextraspace(L) { return defaultAddr(L) - LUA_EXTRASPACE; }
export function lua_tonumber(L, i) { return lua_tonumberx(L, i, 0); }
export function lua_tointeger(L, i) { return lua_tointegerx(L, i, 0); }
export function lua_pop(L, n) { return lua_settop(L, -n - 1); }
export function lua_newtable(L) { return lua_createtable(L, 0, 0); }
export function lua_register(L, n, f) { lua_pushcfunction(L, f); lua_setglobal(L, n); }
export function lua_pushcfunction(L, f) { return lua_pushcclosure(L, f, 0); }
export function lua_isfunction(L, n) { return lua_type(L, n) == LUA_TFUNCTION; }
export function lua_istable(L, n) { return lua_type(L, n) == LUA_TTABLE; }
export function lua_islightuserdata(L, n) { return lua_type(L, n) == LUA_TLIGHTUSERDATA; }
export function lua_isnil(L, n) { return lua_type(L, n) == LUA_TNIL; }
export function lua_isboolean(L, n) { return lua_type(L, n) == LUA_TBOOLEAN; }
export function lua_isthread(L, n) { return lua_type(L, n) == LUA_TTHREAD; }
export function lua_isnone(L, n) { return lua_type(L, n) == LUA_TNONE; }
export function lua_isnoneornil(L, n) { return lua_type(L, n) <= 0; }
export function lua_pushliteral(L, s) { return lua_pushstring(L, s); }
export function lua_pushglobaltable(L) { void lua_rawgeti(L, LUA_REGISTRYINDEX, LUA_RIDX_GLOBALS); }
export function lua_tostring(L, i) { return lua_tolstring(L, i, 0); }
export function lua_insert(L, idx) { return lua_rotate(L, idx, 1); }
export function lua_remove(L, idx) { lua_rotate(L, idx, -1); lua_pop(L, 1); }
export function lua_replace(L, idx) { lua_copy(L, -1, idx); lua_pop(L, 1); }
export function lua_newuserdata(L, s) { return lua_newuserdatauv(L, s, 1); }
export function lua_getuservalue(L, idx) { return lua_getiuservalue(L, idx, 1); }
export function lua_setuservalue(L, idx) { return lua_setiuservalue(L, idx, 1); }

// ---- lauxlib.h macros -------------------------------------------------------------------------

export function luaL_checkversion(L) { return luaL_checkversion_(L, LUA_VERSION_NUM, LUAL_NUMSIZES); }
export function luaL_loadfile(L, f) { return luaL_loadfilex(L, f, 0); }
/** l: a static luaL_Reg array (JS array of views, terminated by {NULL, NULL}) */
export function luaL_newlibtable(L, l) { return lua_createtable(L, 0, l.length - 1); }
export function luaL_newlib(L, l) { luaL_checkversion(L); luaL_newlibtable(L, l); luaL_setfuncs(L, l, 0); }
export function luaL_argcheck(L, cond, arg, extramsg) { void (cond || luaL_argerror(L, arg, extramsg)); }
export function luaL_argexpected(L, cond, arg, tname) { void (cond || luaL_typeerror(L, arg, tname)); }
export function luaL_checkstring(L, n) { return luaL_checklstring(L, n, 0); }
export function luaL_optstring(L, n, d) { return luaL_optlstring(L, n, d, 0); }
export function luaL_typename(L, i) { return lua_typename(L, lua_type(L, i)); }
export function luaL_dofile(L, fn) { return luaL_loadfile(L, fn) || lua_pcall(L, 0, LUA_MULTRET, 0); }
export function luaL_dostring(L, s) { return luaL_loadstring(L, s) || lua_pcall(L, 0, LUA_MULTRET, 0); }
export function luaL_getmetatable(L, n) { return lua_getfield(L, LUA_REGISTRYINDEX, n); }
export function luaL_opt(L, f, n, d) { return lua_isnoneornil(L, n) ? d : f(L, n); }
export function luaL_loadbuffer(L, s, sz, n) { return luaL_loadbufferx(L, s, sz, n, 0); }
export function luaL_pushfail(L) { return lua_pushnil(L); }
