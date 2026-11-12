/*
** $Id: lua.h $
** Lua - A Scripting Language
** Lua.org, PUC-Rio, Brazil (http://www.lua.org)
** See Copyright Notice at the end of this file
*/

























/* mark for precompiled code ('<esc>Lua') */


/* option for multiple returns in 'lua_pcall' and 'lua_call' */



/*
** Pseudo-indices
** (-LUAI_MAXSTACK is the minimum valid index; we keep some free empty
** space after that to help overflow detection)
*/




/* thread status */











/*
** basic types
*/
















/* minimum Lua stack available to a C function */



/* predefined values in the registry */





/* type of numbers in Lua */



/* type for integer functions */


/* unsigned integer type */


/* type for continuation-function contexts */



/*
** Type for C functions registered with Lua
*/


/*
** Type for continuation functions
*/



/*
** Type for functions that read/write blocks when loading/dumping Lua chunks
*/





/*
** Type for memory-allocation functions
*/



/*
** Type for warning functions
*/



/*
** Type used by the debug API to collect debug information
*/



/*
** Functions to be called by the debugger in specific events
*/



/*
** generic extra include file
*/





/*
** RCS ident string
*/



/*
** state manipulation
*/




/* Deprecated! */







/*
** basic stack manipulation
*/











/*
** access functions (stack -> C)
*/




















/*
** Comparison and arithmetic functions
*/


























/*
** push functions (C -> stack)
*/














/*
** get functions (Lua -> stack)
*/














/*
** set functions (stack -> Lua)
*/











/*
** 'load' and 'call' functions (load and run Lua code)
*/


export function lua_call(L, n, r) { return lua_callk(L, (n), (r), 0, null); }



export function lua_pcall(L, n, r, f) { return lua_pcallk(L, (n), (r), (f), 0, null); }







/*
** coroutine functions
*/










/*
** Warning-related functions
*/




/*
** garbage-collection function and options
*/
















/*
** miscellaneous functions
*/

















/*
** {==============================================================
** some useful macros
** ===============================================================
*/




export function lua_tointeger(L, i) { return lua_tointegerx(L,(i),null); }

export function lua_pop(L, n) { return lua_settop(L, -(n)-1); }

export function lua_newtable(L) { return lua_createtable(L, 0, 0); }



export function lua_pushcfunction(L, f) { return lua_pushcclosure(L, (f), 0); }


export function lua_istable(L, n) { return (+(lua_type(L, (n)) == LUA_TTABLE)); }

export function lua_isnil(L, n) { return (+(lua_type(L, (n)) == LUA_TNIL)); }










export function lua_tostring(L, i) { return lua_tolstring(L, (i), null); }


export function lua_insert(L, idx) { return lua_rotate(L, (idx), 1); }

export function lua_remove(L, idx) { return (lua_rotate(L, (idx), -1), lua_pop(L, 1)); }



/* }============================================================== */


/*
** {==============================================================
** compatibility macros
** ===============================================================
*/








export function lua_newuserdata(L, s) { return lua_newuserdatauv(L,s,1); }





/* }============================================================== */

/*
** {======================================================================
** Debug API
** =======================================================================
*/


/*
** Event codes
*/







/*
** Event masks
*/


























  /* (n) */
  /* (n) 'global', 'local', 'field', 'method' */
  /* (S) 'Lua', 'C', 'main', 'tail' */
  /* (S) */
  /* (S) */
  /* (l) */
  /* (S) */
  /* (S) */
  /* (u) number of upvalues */
  /* (u) number of parameters */
  /* (u) */
  /* (t) */
  /* (r) index of first value transferred */
  /* (r) number of transferred values */
  /* (S) */
  /* private part */
  /* active function */


/* }====================================================================== */


/******************************************************************************
* Copyright (C) 1994-2025 Lua.org, PUC-Rio.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
******************************************************************************/
import { LUA_TNIL } from "./lua.h.js";
import { LUA_TTABLE } from "./lua.h.js";
import { lua_callk } from "../rt/lua.js";
import { lua_createtable } from "../rt/lua.js";
import { lua_newuserdatauv } from "../rt/lua.js";
import { lua_pcallk } from "../rt/lua.js";
import { lua_pushcclosure } from "../rt/lua.js";
import { lua_rotate } from "../rt/lua.js";
import { lua_settop } from "../rt/lua.js";
import { lua_tointegerx } from "../rt/lua.js";
import { lua_tolstring } from "../rt/lua.js";
import { lua_type } from "../rt/lua.js";
