/*
** $Id: lauxlib.h $
** Auxiliary functions for building Lua libraries
** See Copyright Notice in lua.h
*/













/* global table */






/* extra error code for 'luaL_loadfilex' */



/* key, in the registry, for table of loaded modules */



/* key, in the registry, for table of preloaded loaders */












export function luaL_checkversion(L) { return luaL_checkversion_(L, LUA_VERSION_NUM, LUAL_NUMSIZES); }





































/* predefined references */


































/*
** ===============================================================
** some useful macros
** ===============================================================
*/


export function luaL_newlibtable(L, l) { return lua_createtable(L, 0, Math.trunc(static_sizeof("l_obj_methods")/sizeof(struct_luaL_Reg)) - 1); }


export function luaL_newlib(L, l) { return (luaL_checkversion(L), luaL_newlibtable(L,l), luaL_setfuncs(L,l[0],0)); }








export function luaL_checkstring(L, n) { return (luaL_checklstring(L, (n), null)); }
export function luaL_optstring(L, n, d) { return (luaL_optlstring(L, (n), (d), null)); }

export function luaL_typename(L, i) { return lua_typename(L, lua_type(L,(i))); }







export function luaL_getmetatable(L, n) { return (lua_getfield(L, LUA_REGISTRYINDEX, (n))); }






/*
** Perform arithmetic operations on lua_Integer values with wrap-around
** semantics, as the Lua core does.
*/




/* push the value used to represent failure/error */



/*
** Internal assertions for in-house debugging
*/













/*
** {======================================================
** Generic Buffer manipulation
** =======================================================
*/


  /* buffer address */
  /* buffer size */
  /* number of characters in buffer */


    /* ensure maximum alignment for buffer */
    /* initial buffer */



























/* }====================================================== */



/*
** {======================================================
** File handles for IO library
** =======================================================
*/

/*
** A file handle is a userdata with metatable 'LUA_FILEHANDLE' and
** initial structure 'luaL_Stream' (it may contain other fields
** after that initial structure).
*/





  /* stream (NULL for incompletely created streams) */
  /* to close stream (NULL for closed streams) */


/* }====================================================== */

/*
** {==================================================================
** "Abstraction Layer" for basic report of messages and errors
** ===================================================================
*/

/* print a string */




/* print a newline and flush the output */




/* print an error message */





/* }================================================================== */


/*
** {============================================================
** Compatibility with deprecated conversions
** =============================================================
*/













/* }============================================================ */
import { LUAL_NUMSIZES } from "./lauxlib.h.js";
import { struct_luaL_Reg } from "./lauxlib.h.js";
import { LUA_REGISTRYINDEX } from "./lua.h.js";
import { LUA_VERSION_NUM } from "./lua.h.js";
import { sizeof } from "../rt/ctypes.js";
import { static_sizeof } from "../rt/locals.js";
import { luaL_checklstring } from "../rt/lua.js";
import { luaL_checkversion_ } from "../rt/lua.js";
import { luaL_optlstring } from "../rt/lua.js";
import { luaL_setfuncs } from "../rt/lua.js";
import { lua_createtable } from "../rt/lua.js";
import { lua_getfield } from "../rt/lua.js";
import { lua_type } from "../rt/lua.js";
import { lua_typename } from "../rt/lua.js";
