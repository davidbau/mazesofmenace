// Source-faithful configured NHLUA policy; typed C ABI/memory helpers are injected.

import { C } from "./c-runtime.js";

/* NetHack 5.0	nhlua.c	$NHDT-Date: 1744963460 2025/04/18 00:04:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.153 $ */
/*      Copyright (c) 2018 by Pasi Kallinen */
/* NetHack may be freely redistributed.  See license for details. */
/*
#- include <lua5.3/lua.h>
#- include <lua5.3/lualib.h>
#- include <lua5.3/lauxlib.h>
*/
/*  */
/* lua_CFunction prototypes */
/* DUMPLOG */
/* !SFCTOOL */
/* internal structure that hangs off L->ud (but use lua_getallocf() )
 * Note that we use it for both memory use tracking and instruction counting.
 */
/* because the allocator needs it */
/* from nhl_sandbox_info */
/* current counter */
/* original steps value */
/* per pcall steps value */
/* stats */
/* stats step reload count */
/* id number (per state) */
/* for stats logging (per pcall) */
/* instance for file pattern matching */
export function l_nhcore_init()
{
    var sbi = C.local(16);
    C.initialize(sbi,{"record":"nhl_sandbox_info"},{"flags":2147483648,"memlimit":1048576,"steps":0,"perpcall":1048576});
    if (C.truth(Number((C.write(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"},C.cast({"pointer":"void"},C.callLocal(nhl_init,sbi)))) !== C.cast({"pointer":"void"},0))))
    {
        if (C.truth(Number(!C.truth(C.callLocal(nhl_loadlua,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.literal("nhcore.lua"))))))
        {
            C.write(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"},C.cast({"pointer":"void"},C.cast({"pointer":"lua_State"},0)));
        }
        else
        {
            let i;
            for ((i = C.cast("i32",0)); C.truth(Number(i < C.constant("NUM_NHCORE_CALLS"))); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
            C.write(C.offset(C.data("nhcore_call_available"),i,1),"i8",(C.cast("i8",1)));
        }
    }
    else
    C.api(0,C.literal("l_nhcore_init failed"));
}


export function l_nhcore_done()
{
    if (C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))
    {
        C.callLocal(nhl_done,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})));
        C.write(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"},C.cast({"pointer":"void"},0));
    }
    C.callLocal(end_luapat);
}


export function l_nhcore_call(callidx)
{
    callidx = C.cast("i32",callidx);
    var ltyp;
    if (C.truth(Number(C.truth(Number(C.truth(Number(C.truth(Number(callidx < 0)) || C.truth(Number(callidx >= C.constant("NUM_NHCORE_CALLS"))))) || C.truth(Number(!C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))))) || C.truth(Number(!C.truth(C.read(C.offset(C.data("nhcore_call_available"),callidx,1),"i8")))))))
    return;
    C.api(1,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.literal("nhcore"));
    if (C.truth(Number(!C.truth((Number(C.api(2,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1))) === 5))))))
    {
        /*impossible("nhcore is not a lua table");*/
        C.callLocal(nhl_done,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})));
        C.write(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"},C.cast({"pointer":"void"},0));
        return;
    }
    C.api(3,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1),C.read(C.offset(C.data("nhcore_call_names"),callidx,8),{"pointer":"char"}));
    (ltyp = C.cast("i32",C.api(4,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1))));
    if (C.truth(Number(ltyp === 6)))
    {
        C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),0,1,C.literal("l_nhcore_call"),C.cast("u32",C.constant("NHLpa_panic")));
    }
    else
    {
        /*impossible("nhcore.%s is not a lua function",
          nhcore_call_names[callidx]);*/
        C.write(C.offset(C.data("nhcore_call_available"),callidx,1),"i8",(C.cast("i8",0)));
    }
}


export function nhl_error(L, msg)
{
    L = C.cast({"pointer":"lua_State"},L);
    msg = C.cast({"pointer":"char"},msg);
    var ar = C.local(136);
    var buf = C.local(512);
    C.api(5,L,1,ar);
    C.api(6,L,C.literal("lS"),ar);
    C.api(7,buf,C.literal("%s (line %d "),msg,C.read(C.field(ar,"lua_Debug","currentline"),"i32"));
    C.api(10,C.api(8,buf),C.literal("%.*s)"),C.cast("i32",(C.binary("u64","-",512n,(C.binary("u64","+",C.api(9,buf),2n))))),C.field(ar,"lua_Debug","short_src"));
    /* (max length of ar.short_src is actually LUA_IDSIZE
               so this is overkill for it, but crucial for ar.source) */
    /* (used to be 'ar.source' here) */
    C.api(11,L,buf);
    /* defined(PANICTRACE) && !defined(NO_SIGNALS) */
    C.api(12,L);
    /*NOTREACHED*/
}


/* Check that parameters are nothing but single table,
   or if no parameters given, put empty table there */
export function lcheck_param_table(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(13,L);
    if (C.truth(Number(argc < 1)))
    C.api(14,L,0,0);
    /* discard any extra arguments passed in */
    C.api(15,L,1);
    C.api(16,L,1,5);
}


export function get_table_mapchr(L, name)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    var ter;
    var typ;
    (ter = C.cast({"pointer":"char"},C.callLocal(get_table_str,L,name)));
    (typ = C.cast("i8",C.callLocal(check_mapchr,ter)));
    if (C.truth(Number(C.cast("i32",typ) === C.constant("INVALID_TYPE"))))
    C.callLocal(nhl_error,L,C.literal("Erroneous map char"));
    if (C.truth(ter))
    C.api(17,C.cast({"pointer":"void"},ter));
    return typ;
}


export function get_table_mapchr_opt(L, name, defval)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    defval = C.cast("i8",defval);
    var ter;
    var typ;
    (ter = C.cast({"pointer":"char"},C.callLocal(get_table_str_opt,L,name,C.global("emptystr"))));
    if (C.truth(Number(C.truth(ter) && C.truth(C.cast("i32",C.read(ter,"i8"))))))
    {
        (typ = C.cast("i8",C.callLocal(check_mapchr,ter)));
        if (C.truth(Number(C.cast("i32",typ) === C.constant("INVALID_TYPE"))))
        C.callLocal(nhl_error,L,C.literal("Erroneous map char"));
    }
    else
    (typ = C.cast("i8",defval));
    if (C.truth(ter))
    C.api(18,C.cast({"pointer":"void"},ter));
    return typ;
}


export function nhl_get_timertype(L, idx)
{
    L = C.cast({"pointer":"lua_State"},L);
    idx = C.cast("i32",idx);
    /* these are in the same order as enum timeout_types in timeout.h and
       ttable timeout_funcs[] in timeout.c, although not spelled the same */
    var ret = C.cast("i16",C.api(19,L,idx,C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0))),C.data("nhl_get_timertype__timerstr")));
    if (C.truth(Number(C.truth(Number(C.cast("i32",ret) < 0)) || C.truth(Number(C.cast("i32",ret) >= C.constant("NUM_TIME_FUNCS"))))))
    C.callLocal(nhl_error,L,C.literal("Unknown timer type"));
    return ret;
}


export function nhl_add_table_entry_int(L, name, value)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    value = C.cast("i64",value);
    C.api(20,L,name);
    C.api(21,L,value);
    C.api(22,L,C.unary("i32","-",3));
}


export function nhl_add_table_entry_char(L, name, value)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    value = C.cast("i8",value);
    var buf = C.local(2);
    C.api(23,buf,C.literal("%c"),C.cast("i32",value));
    C.api(24,L,name);
    C.api(25,L,buf);
    C.api(26,L,C.unary("i32","-",3));
}


export function nhl_add_table_entry_str(L, name, value)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    value = C.cast({"pointer":"char"},value);
    C.api(27,L,name);
    C.api(28,L,value);
    C.api(29,L,C.unary("i32","-",3));
}


export function nhl_add_table_entry_bool(L, name, value)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    value = C.cast("i8",value);
    C.api(30,L,name);
    C.api(31,L,C.cast("i32",value));
    C.api(32,L,C.unary("i32","-",3));
}


export function nhl_add_table_entry_region(L, name, x1, y1, x2, y2)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    x1 = C.cast("i16",x1);
    y1 = C.cast("i16",y1);
    x2 = C.cast("i16",x2);
    y2 = C.cast("i16",y2);
    C.api(33,L,name);
    C.api(34,L,0,0);
    C.callLocal(nhl_add_table_entry_int,L,C.literal("x1"),C.cast("i64",x1));
    C.callLocal(nhl_add_table_entry_int,L,C.literal("y1"),C.cast("i64",y1));
    C.callLocal(nhl_add_table_entry_int,L,C.literal("x2"),C.cast("i64",x2));
    C.callLocal(nhl_add_table_entry_int,L,C.literal("y2"),C.cast("i64",y2));
    C.api(35,L,C.unary("i32","-",3));
}


/* converting from special level "map character" to levl location type
   and back. order here is important. */
/* Fe = iron */
/* "see-through" */
/* hack: boundary location */
/* IS_STWALL() */
export function splev_chr2typ(c)
{
    c = C.cast("i8",c);
    var i;
    for ((i = C.cast("i32",0)); C.truth(C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","ch"),"i8")); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
    if (C.truth(Number(C.cast("i32",c) === C.cast("i32",C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","ch"),"i8")))))
    return C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","typ"),"i8");
    return C.cast("i8",(C.constant("INVALID_TYPE")));
}


export function check_mapchr(s)
{
    s = C.cast({"pointer":"char"},s);
    if (C.truth(Number(C.truth(s) && C.truth(Number(C.api(36,s) === C.cast("u64",1))))))
    return C.callLocal(splev_chr2typ,C.read(C.offset(s,0,1),"i8"));
    return C.cast("i8",C.constant("INVALID_TYPE"));
}


export function splev_typ2chr(typ)
{
    typ = C.cast("i8",typ);
    var i;
    for ((i = C.cast("i32",0)); C.truth(Number(C.cast("i32",C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","typ"),"i8")) < C.constant("MAX_TYPE"))); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
    if (C.truth(Number(C.cast("i32",typ) === C.cast("i32",C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","typ"),"i8")))))
    return C.read(C.field(C.offset(C.data("char2typ"),i,2),"anonymous_342_14","ch"),"i8");
    return C.cast("i8",120);
}


/* local t = nh.gettrap(x,y); */
/* local t = nh.gettrap({ x = 10, y = 10 }); */
export function nhl_gettrap(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("Incorrect arguments"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(37,x,y);
    if (C.truth(C.api(38,C.read(x,"i16"),C.read(y,"i16"))))
    {
        let ttmp = C.api(39,C.read(x,"i16"),C.read(y,"i16"));
        if (C.truth(ttmp))
        {
            C.api(40,L,0,0);
            C.callLocal(nhl_add_table_entry_int,L,C.literal("tx"),C.cast("i64",C.read(C.field(ttmp,"trap","tx"),"i16")));
            C.callLocal(nhl_add_table_entry_int,L,C.literal("ty"),C.cast("i64",C.read(C.field(ttmp,"trap","ty"),"i16")));
            C.callLocal(nhl_add_table_entry_int,L,C.literal("ttyp"),C.cast("i64",C.bit(C.field(ttmp,"trap","ttyp"),0,5)));
            C.callLocal(nhl_add_table_entry_str,L,C.literal("ttyp_name"),C.api(41,C.cast("i32",C.bit(C.field(ttmp,"trap","ttyp"),0,5))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("tseen"),C.cast("i8",C.bit(C.field(ttmp,"trap","tseen"),5,1)));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("madeby_u"),C.cast("i8",C.bit(C.field(ttmp,"trap","madeby_u"),7,1)));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("once"),C.cast("i8",C.bit(C.field(ttmp,"trap","once"),6,1)));
            switch (C.cast("i32",C.bit(C.field(ttmp,"trap","ttyp"),0,5)))
            {
                case (C.constant("SQKY_BOARD")):
                    C.callLocal(nhl_add_table_entry_int,L,C.literal("tnote"),C.cast("i64",C.read(C.field(C.field(ttmp,"trap","vl"),"vlaunchinfo","v_tnote"),"i16")));
                break;
                case (C.constant("ROLLING_BOULDER_TRAP")):
                    C.callLocal(nhl_add_table_entry_int,L,C.literal("launchx"),C.cast("i64",C.read(C.field(C.field(ttmp,"trap","launch"),"nhcoord","x"),"i16")));
                C.callLocal(nhl_add_table_entry_int,L,C.literal("launchy"),C.cast("i64",C.read(C.field(C.field(ttmp,"trap","launch"),"nhcoord","y"),"i16")));
                C.callLocal(nhl_add_table_entry_int,L,C.literal("launch2x"),C.cast("i64",C.read(C.field(C.field(C.field(ttmp,"trap","vl"),"vlaunchinfo","v_launch2"),"nhcoord","x"),"i16")));
                C.callLocal(nhl_add_table_entry_int,L,C.literal("launch2y"),C.cast("i64",C.read(C.field(C.field(C.field(ttmp,"trap","vl"),"vlaunchinfo","v_launch2"),"nhcoord","y"),"i16")));
                break;
                case (C.constant("PIT")):
                    case (C.constant("SPIKED_PIT")):
                        C.callLocal(nhl_add_table_entry_int,L,C.literal("conjoined"),C.cast("i64",C.read(C.field(C.field(ttmp,"trap","vl"),"vlaunchinfo","v_conjoined"),"u8")));
                break;
            }
            return 1;
        }
        else
        {
            C.callLocal(nhl_error,L,C.literal("No trap at location"));
        }
    }
    else
    {
        C.callLocal(nhl_error,L,C.literal("Coordinates out of range"));
    }
    return 0;
}


/* nh.deltrap(x,y); nh.deltrap({ x = 10, y = 15 }); */
export function nhl_deltrap(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("Incorrect arguments"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(42,x,y);
    if (C.truth(C.api(43,C.read(x,"i16"),C.read(y,"i16"))))
    {
        let ttmp = C.api(44,C.read(x,"i16"),C.read(y,"i16"));
        if (C.truth(ttmp))
        C.api(45,ttmp);
    }
    return 0;
}


/* get parameters (XX,YY) or ({ x = XX, y = YY }) or ({ XX, YY }),
   and set the x and y values.
   return TRUE if there are such params in the stack.
   Note that this does not adjust the values of x and y at all from what is
   specified in the level file; so, it returns absolute coordinates rather
   than map-relative coordinates. Callers of this function must decide if
   they want to interpret the values as absolute or as map-relative, and
   adjust accordingly.
 */
export function nhl_get_xy_params(L, x, y)
{
    L = C.cast({"pointer":"lua_State"},L);
    x = C.cast({"pointer":"lua_Integer"},x);
    y = C.cast({"pointer":"lua_Integer"},y);
    var argc = C.api(46,L);
    var ret = (C.cast("i8",0));
    if (C.truth(Number(argc === 2)))
    {
        C.write(x,"i64",C.api(47,L,(1),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))));
        C.write(y,"i64",C.api(48,L,(2),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))));
        (ret = C.cast("i8",(C.cast("i8",1))));
    }
    else
    if (C.truth(Number(C.truth(Number(argc === 1)) && C.truth(Number(C.api(49,L,1) === 5)))))
    {
        let ax = C.local(8);
        let ay = C.local(8);
        (ret = C.cast("i8",C.api(50,L,1,ax,ay)));
        C.write(x,"i64",C.read(ax,"i64"));
        C.write(y,"i64",C.read(ay,"i64"));
    }
    return ret;
}


/* local loc = nh.getmap(x,y); */
/* local loc = nh.getmap({ x = 10, y = 35 }); */
export function nhl_getmap(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("Incorrect arguments"));
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(51,x,y);
    if (C.truth(C.api(52,C.read(x,"i16"),C.read(y,"i16"))))
    {
        let buf = C.local(256);
        C.api(53,L,0,0);
        /* FIXME: some should be boolean values */
        C.callLocal(nhl_add_table_entry_int,L,C.literal("glyph"),C.cast("i64",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","glyph"),"i32")));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("typ"),C.cast("i64",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")));
        C.callLocal(nhl_add_table_entry_str,L,C.literal("typ_name"),C.api(54,C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8"))));
        C.api(55,buf,C.literal("%c"),C.cast("i32",C.callLocal(splev_typ2chr,C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8"))));
        C.callLocal(nhl_add_table_entry_str,L,C.literal("mapchr"),buf);
        C.callLocal(nhl_add_table_entry_int,L,C.literal("seenv"),C.cast("i64",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","seenv"),"u8")));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("horizontal"),C.cast("i8",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","horizontal"),5,1)));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("lit"),C.cast("i8",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","lit"),6,1)));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("waslit"),C.cast("i8",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","waslit"),7,1)));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("roomno"),C.cast("i64",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","roomno"),0,6)));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("edge"),C.cast("i8",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","edge"),6,1)));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("candig"),C.cast("i8",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","candig"),7,1)));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("has_trap"),C.cast("i8",(C.truth(C.api(56,C.read(x,"i16"),C.read(y,"i16"))) ? 1 : 0)));
        /* TODO: FIXME: levl[x][y].flags */
        C.api(57,L,C.literal("flags"));
        C.api(58,L,0,0);
        if (C.truth((Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("DOOR")))))
        {
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("nodoor"),C.cast("i8",(Number(C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)) === 0))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("broken"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),1))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("isopen"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),2))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("closed"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),4))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("locked"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),8))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("trapped"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),16))));
        }
        else
        if (C.truth((Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("ALTAR")))))
        {
            /* TODO: bits 0, 1, 2 */
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("shrine"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),8))));
        }
        else
        if (C.truth((Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("THRONE")))))
        {
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("looted"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),1))));
        }
        else
        if (C.truth(Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("TREE"))))
        {
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("looted"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),1))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("swarm"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),2))));
        }
        else
        if (C.truth((Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("FOUNTAIN")))))
        {
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("looted"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),1))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("warned"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),2))));
        }
        else
        if (C.truth((Number(C.cast("i32",C.read(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","typ"),"i8")) === C.constant("SINK")))))
        {
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("pudding"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),1))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("dishwasher"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),2))));
            C.callLocal(nhl_add_table_entry_bool,L,C.literal("ring"),C.cast("i8",(C.binary("i32","&",C.cast("i32",C.bit(C.field(C.offset(C.offset(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","locations"),C.read(x,"i16"),168),C.read(y,"i16"),8),"rm","flags"),0,5)),4))));
        }
        /* TODO: drawbridges, walls, ladders, room=>ICED_xxx */
        C.api(59,L,C.unary("i32","-",3));
        return 1;
    }
    else
    {
        /* TODO: return zerorm instead? */
        C.callLocal(nhl_error,L,C.literal("Coordinates out of range"));
        return 0;
    }
}


/* impossible("Error!") */
export function nhl_impossible(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(60,L);
    if (C.truth(Number(argc === 1)))
    C.api(62,C.literal("%s"),(C.api(61,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 0;
}


/* pline("It hits!") */
/* pline("It hits!", true) */
export function nhl_pline(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(63,L);
    if (C.truth(Number(C.truth(Number(argc === 1)) || C.truth(Number(argc === 2)))))
    {
        C.api(65,C.literal("%s"),(C.api(64,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
        if (C.truth(C.api(66,L,2)))
        C.indirect(67,(C.read(C.field(C.global("windowprocs"),"window_procs","win_display_nhwindow"),{"pointer":"function"})),C.read(C.global("WIN_MESSAGE"),"i32"),(C.cast("i8",1)));
    }
    else
    /* --more-- */
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 0;
}


/* verbalize("Fool!") */
export function nhl_verbalize(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(68,L);
    if (C.truth(Number(argc === 1)))
    C.api(70,C.literal("%s"),(C.api(69,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 0;
}


/* parse_config("OPTIONS=!color") */
export function nhl_parse_config(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(71,L);
    if (C.truth(Number(argc === 1)))
    C.api(73,(C.api(72,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))),C.functionPointer("parse_config_line"));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 0;
}


/* local windowtype = get_config("windowtype"); */
export function nhl_get_config(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(74,L);
    if (C.truth(Number(argc === 1)))
    {
        C.api(77,L,C.api(76,(C.api(75,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))),(C.cast("i8",1))));
        return 1;
    }
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 0;
}


/*
  str = getlin("What do you want to call this dungeon level?");
 */
export function nhl_getlin(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(78,L);
    if (C.truth(Number(argc === 1)))
    {
        let prompt = (C.api(79,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
        let buf = C.local(256);
        C.api(80,prompt,buf);
        C.api(81,L,buf);
        return 1;
    }
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    /*NOTREACHED*/
    return 0;
}


/*
 selected = menu("prompt",default,pickX,{"a"="option a", "b"="option b",...})
 pickX = 0,1,2, or "none", "one", "any" (PICK_X in code)

 selected = menu("prompt", default, pickX,
                 {{key:"a", text:"option a"},{key:"b", text:"option b"},... })
 */
export function nhl_menu(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    /* PICK_x */
    var argc = C.api(82,L);
    var prompt;
    var defval = C.literal("");
    var pick = 1;
    var pick_cnt;
    var tmpwin;
    var any = C.local(8);
    var picks = C.local(8);
    C.write(picks,{"pointer":"menu_item"},C.cast({"pointer":"menu_item"},0));
    var clr = 8;
    if (C.truth(Number(C.truth(Number(argc < 2)) || C.truth(Number(argc > 4)))))
    {
        C.callLocal(nhl_error,L,C.literal("Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    (prompt = C.cast({"pointer":"char"},(C.api(83,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    if (C.truth(C.api(84,L,2)))
    (defval = C.cast({"pointer":"char"},(C.api(85,L,(2),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    if (C.truth(C.api(86,L,3)))
    (pick = C.cast("i32",C.api(87,L,3,C.literal("one"),C.data("nhl_menu__pickX"))));
    C.api(88,L,argc,5);
    (tmpwin = C.cast("i32",C.indirect(89,(C.read(C.field(C.global("windowprocs"),"window_procs","win_create_nhwindow"),{"pointer":"function"})),4)));
    C.indirect(90,(C.read(C.field(C.global("windowprocs"),"window_procs","win_start_menu"),{"pointer":"function"})),tmpwin,C.cast("u64",0));
    C.api(91,L);
    /* first key */
    while (C.truth(Number(C.api(92,L,argc) !== 0)))
    {
        let str = C.literal("");
        let key = C.literal("");
        /* key @ index -2, value @ index -1 */
        if (C.truth((Number(C.api(93,L,(C.unary("i32","-",1))) === 5))))
        {
            C.api(94,L,C.literal("key"));
            C.api(95,L,C.unary("i32","-",2));
            (key = C.cast({"pointer":"char"},C.api(96,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
            C.api(97,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
            C.api(98,L,C.literal("text"));
            C.api(99,L,C.unary("i32","-",2));
            (str = C.cast({"pointer":"char"},C.api(100,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
            C.api(101,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
        }
        else
        /* TODO: glyph, attr, accel, group accel (all optional) */
        if (C.truth(C.api(102,L,C.unary("i32","-",1))))
        {
            (str = C.cast({"pointer":"char"},(C.api(103,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
            (key = C.cast({"pointer":"char"},(C.api(104,L,(C.unary("i32","-",2)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
        }
        C.copy(any,C.field(C.global("cg"),"const_globals","zeroany"),8);
        if (C.truth(C.read(key,"i8")))
        C.write(C.field(any,"any","a_char"),"i8",C.read(C.offset(key,0,1),"i8"));
        C.api(105,tmpwin,C.global("nul_glyphinfo"),any,C.cast("i8",0),C.cast("i8",0),0,clr,str,(C.truth((Number(C.truth(Number(C.truth(C.cast("i32",C.read(defval,"i8"))) && C.truth(C.cast("i32",C.read(key,"i8"))))) && C.truth(Number(C.cast("i32",C.read(C.offset(defval,0,1),"i8")) === C.cast("i32",C.read(C.offset(key,0,1),"i8"))))))) ? 1 : 0));
        C.api(106,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    /* removes 'value'; keeps 'key' for next iteration */
    C.indirect(107,(C.read(C.field(C.global("windowprocs"),"window_procs","win_end_menu"),{"pointer":"function"})),tmpwin,prompt);
    (pick_cnt = C.cast("i32",C.api(108,tmpwin,pick,picks)));
    C.indirect(109,(C.read(C.field(C.global("windowprocs"),"window_procs","win_destroy_nhwindow"),{"pointer":"function"})),tmpwin);
    if (C.truth(Number(pick_cnt > 0)))
    {
        let buf = C.local(2);
        C.write(C.offset(buf,0,1),"i8",C.read(C.field(C.field(C.offset(C.read(picks,{"pointer":"menu_item"}),0,24),"mi","item"),"any","a_char"),"i8"));
        if (C.truth(Number(C.truth(Number(C.truth(Number(C.truth(Number(pick === 1)) && C.truth(Number(pick_cnt > 1)))) && C.truth(C.cast("i32",C.read(defval,"i8"))))) && C.truth(Number(C.cast("i32",C.read(C.offset(defval,0,1),"i8")) === C.cast("i32",C.read(C.field(C.field(C.offset(C.read(picks,{"pointer":"menu_item"}),0,24),"mi","item"),"any","a_char"),"i8")))))))
        C.write(C.offset(buf,0,1),"i8",C.read(C.field(C.field(C.offset(C.read(picks,{"pointer":"menu_item"}),1,24),"mi","item"),"any","a_char"),"i8"));
        C.write(C.offset(buf,1,1),"i8",C.cast("i8",0));
        C.api(110,L,buf);
    }
    else
    /* TODO: pick any */
    {
        let buf = C.local(2);
        C.write(C.offset(buf,0,1),"i8",C.read(C.offset(defval,0,1),"i8"));
        C.write(C.offset(buf,1,1),"i8",C.cast("i8",0));
        C.api(111,L,buf);
    }
    return 1;
}


/* text("foo\nbar\nbaz") */
export function nhl_text(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(112,L);
    if (C.truth(Number(argc > 0)))
    {
        let picks = C.local(8);
        C.write(picks,{"pointer":"menu_item"},C.cast({"pointer":"menu_item"},0));
        let tmpwin;
        (tmpwin = C.cast("i32",C.indirect(113,(C.read(C.field(C.global("windowprocs"),"window_procs","win_create_nhwindow"),{"pointer":"function"})),4)));
        C.indirect(114,(C.read(C.field(C.global("windowprocs"),"window_procs","win_start_menu"),{"pointer":"function"})),tmpwin,C.cast("u64",0));
        while (C.truth(Number(C.api(115,L) > 0)))
        {
            let ostr = C.api(117,(C.api(116,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))));
            let ptr;
            let str = ostr;
            let lstr = C.offset(C.offset(str,C.api(118,str),1),(-1),1);
            do
            {
                let nlp = C.api(119,str,10);
                if (C.truth(Number(C.truth(nlp) && C.truth(Number((C.pointerDifference(nlp,str,1)) <= C.cast("i64",76))))))
                {
                    (ptr = C.cast({"pointer":"char"},nlp));
                }
                else
                {
                    (ptr = C.cast({"pointer":"char"},C.offset(str,76,1)));
                    if (C.truth(Number(ptr > lstr)))
                    (ptr = C.cast({"pointer":"char"},lstr));
                }
                while (C.truth(Number(C.truth((Number(ptr > str))) && C.truth(Number(!C.truth((Number(C.truth(Number(C.cast("i32",C.read(ptr,"i8")) === 32)) || C.truth(Number(C.cast("i32",C.read(ptr,"i8")) === 10))))))))))
                C.post(()=>ptr,()=>(ptr = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"-",ptr,1))));
                C.write(ptr,"i8",C.cast("i8",0));
                C.api(120,tmpwin,str);
                (str = C.cast({"pointer":"char"},C.offset(ptr,1,1)));
            }
            while (C.truth(Number(C.truth(C.cast("i32",C.read(str,"i8"))) && C.truth(Number(str <= lstr)))));
            C.api(121,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
            C.api(122,C.cast({"pointer":"void"},ostr));
        }
        C.indirect(123,(C.read(C.field(C.global("windowprocs"),"window_procs","win_end_menu"),{"pointer":"function"})),tmpwin,C.cast({"pointer":"char"},0));
        C.api(124,tmpwin,0,picks);
        C.indirect(125,(C.read(C.field(C.global("windowprocs"),"window_procs","win_destroy_nhwindow"),{"pointer":"function"})),tmpwin);
    }
    return 0;
}


/* makeplural("zorkmid") */
export function nhl_makeplural(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(126,L);
    if (C.truth(Number(argc === 1)))
    C.api(129,L,C.api(128,(C.api(127,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* makesingular("zorkmids") */
export function nhl_makesingular(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(130,L);
    if (C.truth(Number(argc === 1)))
    C.api(133,L,C.api(132,(C.api(131,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* s_suffix("foo") */
export function nhl_s_suffix(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(134,L);
    if (C.truth(Number(argc === 1)))
    C.api(137,L,C.api(136,(C.api(135,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* ing_suffix("foo") */
export function nhl_ing_suffix(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(138,L);
    if (C.truth(Number(argc === 1)))
    C.api(141,L,C.api(140,(C.api(139,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* an("foo") */
export function nhl_an(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(142,L);
    if (C.truth(Number(argc === 1)))
    C.api(145,L,C.api(144,(C.api(143,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* rn2(10) */
export function nhl_lua_rnglog_ctx_enabled()
{
    var env;
    var rnglog;
    if (C.truth(Number(C.read(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32") >= 0)))
    return C.cast("i8",(C.truth(C.read(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32")) ? C.cast("i32",(C.cast("i8",1))) : C.cast("i32",(C.cast("i8",0)))));
    (env = C.cast({"pointer":"char"},C.api(146,C.literal("NETHACK_LUA_RNGLOG_CTX"))));
    if (C.truth(env))
    {
        C.write(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32",(C.truth((Number(C.truth(C.cast("i32",C.read(env,"i8"))) && C.truth(C.api(147,env,C.literal("0")))))) ? 1 : 0));
        return C.cast("i8",(C.truth(C.read(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32")) ? C.cast("i32",(C.cast("i8",1))) : C.cast("i32",(C.cast("i8",0)))));
    }
    /* Harness default: when RNG logging is active, include Lua callsites. */
    (rnglog = C.cast({"pointer":"char"},C.api(148,C.literal("NETHACK_RNGLOG"))));
    C.write(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32",(C.truth((Number(C.truth(rnglog) && C.truth(C.cast("i32",C.read(rnglog,"i8")))))) ? 1 : 0));
    return C.cast("i8",(C.truth(C.read(C.data("nhl_lua_rnglog_ctx_enabled__enabled"),"i32")) ? C.cast("i32",(C.cast("i8",1))) : C.cast("i32",(C.cast("i8",0)))));
}


export function nhl_rnglog_set_lua_caller(L, fallback)
{
    L = C.cast({"pointer":"lua_State"},L);
    fallback = C.cast({"pointer":"char"},fallback);
    /* Static buffers are safe here because this helper is used
       synchronously for a single Lua->C->RNG call path and is not
       expected to be re-entrant. */
    var ar = C.local(136);
    var ar2 = C.local(136);
    var src = C.data("nhl_rnglog_set_lua_caller__rnglog_srcbuf");
    var line = 0;
    var line1 = 0;
    var line2 = 0;
    var name = fallback;
    var name1 = fallback;
    var name2 = C.literal("lua");
    var have1 = (C.cast("i8",0));
    var have2 = (C.cast("i8",0));
    if (C.truth(Number(!C.truth(C.callLocal(nhl_lua_rnglog_ctx_enabled)))))
    return;
    C.api(149,(C.literal("nhl_rnglog_set_lua_caller")),972,C.data("nhl_rnglog_set_lua_caller__rnglog_srcbuf"),256n,C.literal("%s"),C.literal("lua"));
    C.api(150,(C.literal("nhl_rnglog_set_lua_caller")),973,C.data("nhl_rnglog_set_lua_caller__rnglog_src1buf"),256n,C.literal("%s"),C.literal("lua"));
    C.api(151,(C.literal("nhl_rnglog_set_lua_caller")),974,C.data("nhl_rnglog_set_lua_caller__rnglog_src2buf"),256n,C.literal("%s"),C.literal("lua"));
    if (C.truth(Number(C.truth(C.api(152,L,1,ar)) && C.truth(C.api(153,L,C.literal("nSl"),ar)))))
    {
        if (C.truth(Number(C.truth(C.field(ar,"lua_Debug","short_src")) && C.truth(C.cast("i32",C.read(C.field(ar,"lua_Debug","short_src"),"i8"))))))
        {
            let src_start = C.field(ar,"lua_Debug","short_src");
            let src_len = C.api(154,C.field(ar,"lua_Debug","short_src"));
            /* Lua string chunks render as [string "(name.lua)"].
               Normalize to plain "name.lua" for readable RNG logs. */
            if (C.truth(Number(C.truth(Number(C.truth(Number(C.truth(Number(src_len >= C.cast("u64",11))) && C.truth(Number(!C.truth(C.api(155,src_start,C.literal("[string \""),C.cast("u64",9))))))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",2)),1),"i8")) === 34)))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",1)),1),"i8")) === 93)))))
            {
                (src_start = C.cast({"pointer":"char"},C.offset(src_start,9,1)));
                (src_len = C.cast("u64",C.binary("u64","-",src_len,C.cast("u64",11))));
            }
            if (C.truth(Number(C.truth(Number(src_len >= C.cast("u64",1))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,0,1),"i8")) === 64)))))
            {
                C.post(()=>src_start,()=>(src_start = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",src_start,1))));
                C.post(()=>src_len,()=>(src_len = C.cast("u64",C.binary("u64","-",src_len,1n))));
            }
            if (C.truth(Number(C.truth(Number(C.truth(Number(src_len >= C.cast("u64",2))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,0,1),"i8")) === 40)))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",1)),1),"i8")) === 41)))))
            {
                C.post(()=>src_start,()=>(src_start = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",src_start,1))));
                (src_len = C.cast("u64",C.binary("u64","-",src_len,C.cast("u64",2))));
            }
            C.api(156,(C.literal("nhl_rnglog_set_lua_caller")),1001,C.data("nhl_rnglog_set_lua_caller__rnglog_src1buf"),256n,C.literal("%.*s"),C.cast("i32",src_len),src_start);
        }
        (line1 = C.cast("i32",C.read(C.field(ar,"lua_Debug","currentline"),"i32")));
        if (C.truth(Number(C.truth(Number(C.truth(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"})) && C.truth(C.cast("i32",C.read(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),"i8"))))) && C.truth((Number(C.truth(Number(C.truth((Number(C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) >= 65)) && C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) <= 90))))) || C.truth((Number(C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) >= 97)) && C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) <= 122))))))) || C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) === 95))))))))
        {
            C.api(157,(C.literal("nhl_rnglog_set_lua_caller")),1008,C.data("nhl_rnglog_set_lua_caller__rnglog_name1buf"),256n,C.literal("%s"),C.read(C.field(ar,"lua_Debug","name"),{"pointer":"char"}));
            (name1 = C.cast({"pointer":"char"},C.data("nhl_rnglog_set_lua_caller__rnglog_name1buf")));
        }
        (have1 = C.cast("i8",(C.cast("i8",1))));
    }
    if (C.truth(Number(C.truth(C.api(158,L,2,ar2)) && C.truth(C.api(159,L,C.literal("nSl"),ar2)))))
    {
        if (C.truth(Number(C.truth(C.field(ar2,"lua_Debug","short_src")) && C.truth(C.cast("i32",C.read(C.field(ar2,"lua_Debug","short_src"),"i8"))))))
        {
            let src_start = C.field(ar2,"lua_Debug","short_src");
            let src_len = C.api(160,C.field(ar2,"lua_Debug","short_src"));
            if (C.truth(Number(C.truth(Number(C.truth(Number(C.truth(Number(src_len >= C.cast("u64",11))) && C.truth(Number(!C.truth(C.api(161,src_start,C.literal("[string \""),C.cast("u64",9))))))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",2)),1),"i8")) === 34)))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",1)),1),"i8")) === 93)))))
            {
                (src_start = C.cast({"pointer":"char"},C.offset(src_start,9,1)));
                (src_len = C.cast("u64",C.binary("u64","-",src_len,C.cast("u64",11))));
            }
            if (C.truth(Number(C.truth(Number(src_len >= C.cast("u64",1))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,0,1),"i8")) === 64)))))
            {
                C.post(()=>src_start,()=>(src_start = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",src_start,1))));
                C.post(()=>src_len,()=>(src_len = C.cast("u64",C.binary("u64","-",src_len,1n))));
            }
            if (C.truth(Number(C.truth(Number(C.truth(Number(src_len >= C.cast("u64",2))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,0,1),"i8")) === 40)))) && C.truth(Number(C.cast("i32",C.read(C.offset(src_start,C.binary("u64","-",src_len,C.cast("u64",1)),1),"i8")) === 41)))))
            {
                C.post(()=>src_start,()=>(src_start = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",src_start,1))));
                (src_len = C.cast("u64",C.binary("u64","-",src_len,C.cast("u64",2))));
            }
            C.api(162,(C.literal("nhl_rnglog_set_lua_caller")),1037,C.data("nhl_rnglog_set_lua_caller__rnglog_src2buf"),256n,C.literal("%.*s"),C.cast("i32",src_len),src_start);
        }
        (line2 = C.cast("i32",C.read(C.field(ar2,"lua_Debug","currentline"),"i32")));
        if (C.truth(Number(C.truth(Number(C.truth(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"})) && C.truth(C.cast("i32",C.read(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),"i8"))))) && C.truth((Number(C.truth(Number(C.truth((Number(C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) >= 65)) && C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) <= 90))))) || C.truth((Number(C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) >= 97)) && C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) <= 122))))))) || C.truth(Number(C.cast("i32",C.read(C.offset(C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}),0,1),"i8")) === 95))))))))
        {
            C.api(163,(C.literal("nhl_rnglog_set_lua_caller")),1044,C.data("nhl_rnglog_set_lua_caller__rnglog_parentbuf"),256n,C.literal("%s"),C.read(C.field(ar2,"lua_Debug","name"),{"pointer":"char"}));
            (name2 = C.cast({"pointer":"char"},C.data("nhl_rnglog_set_lua_caller__rnglog_parentbuf")));
        }
        (have2 = C.cast("i8",(C.cast("i8",1))));
    }
    if (C.truth(have2))
    {
        (src = C.cast({"pointer":"char"},C.data("nhl_rnglog_set_lua_caller__rnglog_src2buf")));
        (line = C.cast("i32",line2));
        if (C.truth(have1))
        {
            C.api(164,(C.literal("nhl_rnglog_set_lua_caller")),1056,C.data("nhl_rnglog_set_lua_caller__rnglog_namebuf"),256n,C.literal("%s src=%s:%d parent=%s"),name1,C.data("nhl_rnglog_set_lua_caller__rnglog_src1buf"),line1,name2);
            (name = C.cast({"pointer":"char"},C.data("nhl_rnglog_set_lua_caller__rnglog_namebuf")));
        }
        else
        {
            (name = C.cast({"pointer":"char"},name2));
        }
    }
    else
    if (C.truth(have1))
    {
        (src = C.cast({"pointer":"char"},C.data("nhl_rnglog_set_lua_caller__rnglog_src1buf")));
        (line = C.cast("i32",line1));
        (name = C.cast({"pointer":"char"},name1));
    }
    C.api(165,src,line,name);
}


/* rn2(10) */
export function nhl_rn2(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(166,L);
    if (C.truth(Number(argc === 1)))
    {
        let range = C.cast("i32",C.api(167,L,1));
        C.callLocal(nhl_rnglog_set_lua_caller,L,C.literal("nh.rn2"));
        C.api(169,L,C.cast("i64",C.api(168,range)));
    }
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* random(10);  -- is the same as rn2(10); */
/* random(5,8); -- same as 5 + rn2(8); */
export function nhl_random(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(170,L);
    if (C.truth(Number(argc === 1)))
    {
        let range = C.cast("i32",C.api(171,L,1));
        C.callLocal(nhl_rnglog_set_lua_caller,L,C.literal("nh.random"));
        C.api(173,L,C.cast("i64",C.api(172,range)));
    }
    else
    if (C.truth(Number(argc === 2)))
    {
        let base = C.cast("i32",C.api(174,L,1));
        let range = C.cast("i32",C.api(175,L,2));
        C.callLocal(nhl_rnglog_set_lua_caller,L,C.literal("nh.random"));
        C.api(177,L,C.cast("i64",C.binary("i32","+",base,C.api(176,range))));
    }
    else
    C.callLocal(nhl_error,L,C.literal("Wrong args"));
    return 1;
}


/* level_difficulty() */
export function nhl_level_difficulty(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(178,L);
    if (C.truth(Number(argc === 0)))
    {
        C.api(180,L,C.cast("i64",C.api(179)));
    }
    else
    {
        C.callLocal(nhl_error,L,C.literal("level_difficulty should not have any args"));
    }
    return 1;
}


/* local x = nh.is_genocided("vampire") */
export function nhl_is_genocided(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(181,L);
    if (C.truth(Number(argc === 1)))
    {
        let paramstr = (C.api(182,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
        let mgend = C.local(4);
        let i = C.api(183,paramstr,mgend);
        C.api(184,L,(C.truth(Number(C.truth((Number(i !== C.constant("NON_PM")))) && C.truth((C.binary("i32","&",C.cast("i32",C.read(C.field(C.offset(C.field(C.global("svm"),"instance_globals_saved_m","mvitals"),i,4),"mvitals","mvflags"),"u8")),2))))) ? C.cast("i32",(C.cast("i8",1))) : C.cast("i32",(C.cast("i8",0)))));
    }
    else
    {
        C.callLocal(nhl_error,L,C.literal("Wrong args"));
    }
    return 1;
}


/* local debug_themerm = nh.debug_themerm(isfill)
 * if isfill is false, returns value of env variable THEMERM
 * if isfill is true,  returns value of env variable THEMERMFILL
 * return nil if not in wizard mode or the variable isn't set */
export function nhl_get_debug_themerm_name(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(185,L);
    if (C.truth(Number(argc === 1)))
    {
        let dbg_themerm = C.cast({"pointer":"char"},0);
        let is_fill = C.cast("i8",C.api(186,L,1));
        C.api(187,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
        if (C.truth(C.read(C.field(C.global("flags"),"flag","debug"),"i8")))
        (dbg_themerm = C.cast({"pointer":"char"},C.api(188,(C.truth(C.cast("i32",is_fill)) ? C.literal("THEMERMFILL") : C.literal("THEMERM")))));
        if (C.truth(Number(C.truth(Number(!C.truth(dbg_themerm))) || C.truth(Number(!C.truth(C.read(dbg_themerm,"i8")))))))
        {
            C.api(189,L);
        }
        else
        {
            C.api(190,L,dbg_themerm);
        }
    }
    else
    {
        C.callLocal(nhl_error,L,C.literal("debug_themerm should have 1 boolean arg"));
    }
    return 1;
}


/* get mandatory integer value from table */
export function get_table_int(L, name)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    var ret;
    C.api(191,L,C.unary("i32","-",1),name);
    (ret = C.cast("i32",C.cast("i32",C.api(192,L,C.unary("i32","-",1)))));
    C.api(193,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return ret;
}


/* get optional integer value from table */
export function get_table_int_opt(L, name, defval)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    defval = C.cast("i32",defval);
    var ret = defval;
    C.api(194,L,C.unary("i32","-",1),name);
    if (C.truth(Number(!C.truth((Number(C.api(195,L,(C.unary("i32","-",1))) === 0))))))
    {
        (ret = C.cast("i32",C.cast("i32",C.api(196,L,C.unary("i32","-",1)))));
    }
    C.api(197,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return ret;
}


export function get_table_str(L, name)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    var ret;
    C.api(198,L,C.unary("i32","-",1),name);
    (ret = C.cast({"pointer":"char"},C.api(200,(C.api(199,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))))))));
    C.api(201,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return ret;
}


/* get optional string value from table.
   return value must be freed by caller. */
export function get_table_str_opt(L, name, defval)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    defval = C.cast({"pointer":"char"},defval);
    var ret;
    var ltyp;
    C.api(202,L,C.unary("i32","-",1),name);
    (ltyp = C.cast("i32",C.api(203,L,C.unary("i32","-",1))));
    if (C.truth(Number(C.truth(Number(ltyp === 4)) || C.truth(Number(ltyp === 0)))))
    {
        (ret = C.cast({"pointer":"char"},(C.api(204,L,(C.unary("i32","-",1)),defval,C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    }
    else
    if (C.truth(Number(ltyp === 6)))
    {
        C.callLocal(nhl_pcall_handle,L,0,1,C.literal("get_table_str_opt"),C.cast("u32",C.constant("NHLpa_panic")));
        (ret = C.cast({"pointer":"char"},(C.api(205,L,(C.unary("i32","-",1)),defval,C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    }
    else
    {
        C.callLocal(nhl_error,L,C.literal("get_table_str_opt: no string"));
    }
    if (C.truth(ret))
    {
        C.api(206,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
        return C.api(207,ret);
    }
    C.api(208,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0)));
}


export function get_table_boolean(L, name)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    /* static const int boolstr2i[] = { TRUE, FALSE, TRUE, FALSE, -1 }; */
    var ltyp;
    var ret = C.unary("i32","-",1);
    C.api(209,L,C.unary("i32","-",1),name);
    (ltyp = C.cast("i32",C.api(210,L,C.unary("i32","-",1))));
    if (C.truth(Number(ltyp === 4)))
    {
        (ret = C.cast("i32",C.api(211,L,C.unary("i32","-",1),C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0))),C.data("get_table_boolean__boolstr"))));
    }
    else
    /* nhUse(boolstr2i[0]); */
    if (C.truth(Number(ltyp === 1)))
    {
        (ret = C.cast("i32",C.api(212,L,C.unary("i32","-",1))));
    }
    else
    if (C.truth(Number(ltyp === 3)))
    {
        (ret = C.cast("i32",C.cast("i32",C.api(213,L,C.unary("i32","-",1)))));
        if (C.truth(Number(C.truth(Number(ret < 0)) || C.truth(Number(ret > 1)))))
        (ret = C.cast("i32",C.unary("i32","-",1)));
    }
    C.api(214,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    if (C.truth(Number(ret === C.unary("i32","-",1))))
    C.callLocal(nhl_error,L,C.literal("Expected a boolean"));
    return ret;
}


export function get_table_boolean_opt(L, name, defval)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    defval = C.cast("i32",defval);
    var ret = defval;
    C.api(215,L,C.unary("i32","-",1),name);
    if (C.truth(Number(C.api(216,L,C.unary("i32","-",1)) !== 0)))
    {
        C.api(217,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
        return C.callLocal(get_table_boolean,L,name);
    }
    C.api(218,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return ret;
}


/* opts[] is a null-terminated list */
export function get_table_option(L, name, defval, opts)
{
    L = C.cast({"pointer":"lua_State"},L);
    name = C.cast({"pointer":"char"},name);
    defval = C.cast({"pointer":"char"},defval);
    opts = C.cast({"pointer":"char *"},opts);
    var ret;
    C.api(219,L,C.unary("i32","-",1),name);
    (ret = C.cast("i32",C.api(220,L,C.unary("i32","-",1),defval,opts)));
    C.api(221,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    return ret;
}


/* local fname = dump_fmtstr("/tmp/nethack.%n.%d.log"); */
/* DUMPLOG */
/* local dungeon_name = dnum_name(u.dnum); */
export function nhl_dnum_name(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(222,L);
    if (C.truth(Number(argc === 1)))
    {
        let dnum = C.api(223,L,1);
        if (C.truth(Number(C.truth(Number(dnum >= C.cast("i64",0))) && C.truth(Number(dnum < C.cast("i64",C.read(C.field(C.global("svn"),"instance_globals_saved_n","n_dgns"),"i32")))))))
        C.api(224,L,C.field(C.offset(C.field(C.global("svd"),"instance_globals_saved_d","dungeons"),dnum,92),"dungeon","dname"));
        else
        C.api(225,L,C.literal(""));
    }
    else
    C.callLocal(nhl_error,L,C.literal("Expected an integer parameter"));
    return 1;
}


/* return gender-neutral monster type name by integer value,
   or empty string if outside LOW_PM - HIGH_PM range */
/* local montypename = int_to_pmname(12); */
export function nhl_int_to_pm_name(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(226,L);
    if (C.truth(Number(argc === 1)))
    {
        let i = C.api(227,L,1);
        if (C.truth(Number(C.truth(Number(i >= C.cast("i64",C.constant("LOW_PM")))) && C.truth(Number(i <= C.cast("i64",C.constant("HIGH_PM")))))))
        C.api(228,L,C.read(C.offset(C.field(C.offset(C.global("mons"),i,96),"permonst","pmnames"),C.constant("NEUTRAL"),8),{"pointer":"char"}));
        else
        C.api(229,L,C.literal(""));
    }
    else
    C.callLocal(nhl_error,L,C.literal("Expected an integer parameter"));
    return 1;
}


/* convert integer to object type name and class */
/* local oname,oclass = int_to_objname(25); */
export function nhl_int_to_obj_name(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(230,L);
    if (C.truth(Number(argc === 1)))
    {
        let buf = C.local(8);
        let i = C.api(231,L,1);
        if (C.truth(Number(C.truth(Number(C.truth(Number(i >= C.cast("i64",0))) && C.truth(Number(i < C.cast("i64",C.constant("NUM_OBJECTS")))))) && C.truth(C.read(C.field(C.offset(C.global("obj_descr"),C.read(C.field(C.offset(C.global("objects"),i,72),"objclass","oc_name_idx"),"i16"),16),"objdescr","oc_name"),{"pointer":"char"})))))
        {
            C.api(232,L,C.read(C.field(C.offset(C.global("obj_descr"),C.read(C.field(C.offset(C.global("objects"),i,72),"objclass","oc_name_idx"),"i16"),16),"objdescr","oc_name"),{"pointer":"char"}));
            C.write(C.offset(buf,0,1),"i8",C.read(C.field(C.offset(C.global("def_oc_syms"),C.cast("i32",C.read(C.field(C.offset(C.global("objects"),i,72),"objclass","oc_class"),"i8")),24),"class_sym","sym"),"i8"));
            C.write(C.offset(buf,1,1),"i8",C.cast("i8",0));
            C.api(233,L,buf);
        }
        else
        {
            C.api(234,L,C.literal(""));
            C.api(235,L,C.literal(""));
        }
    }
    else
    C.callLocal(nhl_error,L,C.literal("Expected an integer parameter"));
    return 2;
}


/* because nhl_error() does not return */
/* set or get variables which are saved and restored along with the game.
   nh.variable("test", 10);
   local ten = nh.variable("test"); */
export function nhl_variable(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(236,L);
    var typ;
    var key;
    if (C.truth(Number(!C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))))
    {
        C.api(237,C.literal("nh luacore not inited"));
        /*NOTREACHED*/
        return 0;
    }
    C.api(238,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.literal("nh_lua_variables"));
    if (C.truth(Number(!C.truth((Number(C.api(239,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1))) === 5))))))
    {
        C.api(240,C.literal("nh_lua_variables is not a lua table"));
        return 0;
    }
    if (C.truth(Number(argc === 1)))
    {
        (key = C.cast({"pointer":"char"},(C.api(241,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
        C.api(242,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1),key);
        (typ = C.cast("i32",C.api(243,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1))));
        if (C.truth(Number(typ === 4)))
        C.api(245,L,C.api(244,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
        else
        if (C.truth(Number(typ === 0)))
        C.api(246,L);
        else
        if (C.truth(Number(typ === 1)))
        C.api(248,L,C.api(247,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1)));
        else
        if (C.truth(Number(typ === 3)))
        C.api(250,L,C.api(249,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1)),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))));
        else
        if (C.truth(Number(typ === 5)))
        {
            C.api(251,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.literal("nh_get_variables_string"));
            C.api(252,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",2));
            C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),1,1,C.literal("nhl_variable"),C.cast("u32",C.constant("NHLpa_panic")));
            C.api(254,L,C.api(253,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            C.callLocal(nhl_pcall_handle,L,0,1,C.literal("nhl_variable-1"),C.cast("u32",C.constant("NHLpa_panic")));
        }
        else
        C.callLocal(nhl_error,L,C.literal("Cannot get variable of that type"));
        return 1;
    }
    else
    if (C.truth(Number(argc === 2)))
    {
        /* set nh_lua_variables[key] = value;
           nh.variable("key", value); */
        (key = C.cast({"pointer":"char"},(C.api(255,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
        (typ = C.cast("i32",C.api(256,L,C.unary("i32","-",1))));
        if (C.truth(Number(typ === 4)))
        {
            C.api(258,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.api(257,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            C.api(259,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",2),key);
        }
        else
        if (C.truth(Number(typ === 0)))
        {
            C.api(260,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})));
            C.api(261,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",2),key);
        }
        else
        if (C.truth(Number(typ === 1)))
        {
            C.api(263,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.api(262,L,C.unary("i32","-",1)));
            C.api(264,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",2),key);
        }
        else
        if (C.truth(Number(typ === 3)))
        {
            C.api(266,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.api(265,L,(C.unary("i32","-",1)),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))));
            C.api(267,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",2),key);
        }
        else
        if (C.truth(Number(typ === 5)))
        {
            C.api(268,L,C.literal("nh_set_variables_string"));
            C.api(269,L,key);
            C.api(270,L,C.unary("i32","-",3));
            /* copy value to top */
            C.callLocal(nhl_pcall_handle,L,2,1,C.literal("nhl_variable-2"),C.cast("u32",C.constant("NHLpa_panic")));
            C.api(272,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.api(271,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),0,0,C.literal("nhl_variable-3"),C.cast("u32",C.constant("NHLpa_panic")));
        }
        else
        C.callLocal(nhl_error,L,C.literal("Cannot set variable of that type"));
        return 0;
    }
    else
    C.callLocal(nhl_error,L,C.literal("Wrong number of arguments"));
    return 1;
}


/* return nh_lua_variable lua table as a string */
export function get_nh_lua_variables()
{
    var key = C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0)));
    if (C.truth(Number(!C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))))
    {
        C.api(273,C.literal("nh luacore not inited"));
        /*NOTREACHED*/
        return key;
    }
    C.api(274,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.literal("get_variables_string"));
    if (C.truth(Number(C.api(275,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.unary("i32","-",1)) === 6)))
    {
        if (C.truth(C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),0,1,C.literal("get_nh_lua_variables"),C.cast("u32",C.constant("NHLpa_impossible")))))
        {
            return key;
        }
        (key = C.cast({"pointer":"char"},C.api(277,C.api(276,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
    }
    C.api(278,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),C.binary("i32","-",C.unary("i32","-",(1)),1));
    return key;
}


/* !SFCTOOL */
/* save nh_lua_variables table to file */
export function save_luadata(nhfp)
{
    nhfp = C.cast({"pointer":"NHFILE"},nhfp);
    var lua_data_len = C.local(4);
    var lua_data = C.callLocal(get_nh_lua_variables);
    /* note: '\0' terminated */
    if (C.truth(Number(!C.truth(lua_data))))
    (lua_data = C.cast({"pointer":"char"},C.api(279,C.global("emptystr"))));
    C.write(lua_data_len,"u32",C.binary("u32","+",C.api(280,lua_data,(C.literal("save_luadata")),1491),C.cast("u32",1)));
    /* +1: include the terminator */
    C.api(281,nhfp,lua_data_len,C.literal("luadata-lua_data_len"));
    C.api(282,nhfp,lua_data,C.literal("luadata"),C.cast("i32",C.read(lua_data_len,"u32")));
    C.api(283,C.cast({"pointer":"void"},lua_data));
}


/* restore nh_lua_variables table from file */
export function restore_luadata(nhfp)
{
    nhfp = C.cast({"pointer":"NHFILE"},nhfp);
    var lua_data_len = C.local(4);
    C.write(lua_data_len,"u32",C.cast("u32",0));
    var lua_data;
    /* !SFCTOOL */
    C.api(284,nhfp,lua_data_len,C.literal("luadata-lua_data_len"));
    ;
    (lua_data = C.cast({"pointer":"char"},C.cast({"pointer":"char"},C.api(285,C.read(lua_data_len,"u32")))));
    C.api(286,nhfp,lua_data,C.literal("luadata"),C.cast("i32",C.read(lua_data_len,"u32")));
    if (C.truth(Number(!C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))))
    C.callLocal(l_nhcore_init);
    C.api(287,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),lua_data);
    C.api(288,C.cast({"pointer":"void"},lua_data));
    C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),0,0,C.literal("restore_luadata"),C.cast("u32",C.constant("NHLpa_panic")));
    /* !SFCTOOL */
}


/* local stairs = stairways(); */
export function nhl_stairways(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var tmp = C.read(C.field(C.global("gs"),"instance_globals_s","stairs"),{"pointer":"stairway"});
    var i = 1;
    /* lua arrays should start at 1 */
    C.api(289,L,0,0);
    while (C.truth(tmp))
    {
        C.api(290,L,C.cast("i64",i));
        C.api(291,L,0,0);
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("up"),C.read(C.field(tmp,"stairway","up"),"i8"));
        C.callLocal(nhl_add_table_entry_bool,L,C.literal("ladder"),C.read(C.field(tmp,"stairway","isladder"),"i8"));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("x"),C.cast("i64",C.read(C.field(tmp,"stairway","sx"),"i16")));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("y"),C.cast("i64",C.read(C.field(tmp,"stairway","sy"),"i16")));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("dnum"),C.cast("i64",C.read(C.field(C.field(tmp,"stairway","tolev"),"d_level","dnum"),"i16")));
        C.callLocal(nhl_add_table_entry_int,L,C.literal("dlevel"),C.cast("i64",C.read(C.field(C.field(tmp,"stairway","tolev"),"d_level","dlevel"),"i16")));
        C.api(292,L,C.unary("i32","-",3));
        (tmp = C.cast({"pointer":"stairway"},C.read(C.field(tmp,"stairway","next"),{"pointer":"struct stairway"})));
        C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1))));
    }
    return 1;
}


/*
  test( { x = 123, y = 456 } );
*/
export function nhl_test(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var x;
    var y;
    var name;
    var Player = C.local(7);
    C.initialize(Player,{"array":[7],"of":"i8"},"Player");
    /* discard any extra arguments passed in */
    C.api(293,L,1);
    C.api(294,L,1,5);
    (x = C.cast("i16",C.cast("i16",C.callLocal(get_table_int,L,C.literal("x")))));
    (y = C.cast("i16",C.cast("i16",C.callLocal(get_table_int,L,C.literal("y")))));
    (name = C.cast({"pointer":"char"},C.callLocal(get_table_str_opt,L,C.literal("name"),Player)));
    C.api(295,C.literal("TEST:{ x=%i, y=%i, name=\"%s\" }"),C.cast("i32",x),C.cast("i32",y),name);
    C.api(296,C.cast({"pointer":"void"},name));
    return 1;
}


/* push a key into command queue */
/* nh.pushkey("i"); */
export function nhl_pushkey(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(297,L);
    if (C.truth(Number(argc === 1)))
    {
        let key = (C.api(298,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
        while (C.truth(C.read(key,"i8")))
        {
            C.api(299,C.constant("CQ_CANNED"),C.read(key,"i8"));
            C.post(()=>key,()=>(key = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",key,1))));
        }
    }
    return 0;
}


/* do a turn of moveloop, or until gm.multi is done if param is true. */
/* nh.doturn(); nh.doturn(true); */
export function nhl_doturn(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(300,L);
    var domulti = (C.cast("i8",0));
    if (C.truth(Number(argc === 1)))
    (domulti = C.cast("i8",C.cast("i8",C.api(301,L,1))));
    do
    {
        C.api(302);
    }
    while (C.truth(Number(C.truth(C.cast("i32",domulti)) && C.truth(C.read(C.field(C.global("gm"),"instance_globals_m","multi"),"i64")))));
    return 0;
}


/* set debugging flags. debugging use only, of course. */
/* nh.debug_flags({ mongen = false,
                    hunger = false,
                    overwrite_stairs = true }); */
export function nhl_debug_flags(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var val;
    C.callLocal(lcheck_param_table,L);
    /* disable monster generation */
    (val = C.cast("i32",C.callLocal(get_table_boolean_opt,L,C.literal("mongen"),C.unary("i32","-",1))));
    if (C.truth(Number(val !== C.unary("i32","-",1))))
    {
        C.write(C.field(C.global("iflags"),"instance_flags","debug_mongen"),"i8",C.cast("i8",Number(!C.truth(C.cast("i8",val)))));
        /* value in lua is negated */
        if (C.truth(C.read(C.field(C.global("iflags"),"instance_flags","debug_mongen"),"i8")))
        {
            let mtmp;
            let mtmp2;
            for ((mtmp = C.cast({"pointer":"struct monst"},C.read(C.field(C.field(C.global("svl"),"instance_globals_saved_l","level"),"anonymous_473_9","monlist"),{"pointer":"struct monst"}))); C.truth(mtmp); (mtmp = C.cast({"pointer":"struct monst"},mtmp2)))
            {
                (mtmp2 = C.cast({"pointer":"struct monst"},C.read(C.field(mtmp,"monst","nmon"),{"pointer":"struct monst"})));
                if (C.truth((Number(C.read(C.field(mtmp,"monst","mhp"),"i32") < 1))))
                continue;
                C.api(303,mtmp);
            }
        }
    }
    /* prevent hunger */
    (val = C.cast("i32",C.callLocal(get_table_boolean_opt,L,C.literal("hunger"),C.unary("i32","-",1))));
    if (C.truth(Number(val !== C.unary("i32","-",1))))
    {
        C.write(C.field(C.global("iflags"),"instance_flags","debug_hunger"),"i8",C.cast("i8",Number(!C.truth(C.cast("i8",val)))));
    }
    /* value in lua is negated */
    /* allow overwriting stairs */
    (val = C.cast("i32",C.callLocal(get_table_boolean_opt,L,C.literal("overwrite_stairs"),C.unary("i32","-",1))));
    if (C.truth(Number(val !== C.unary("i32","-",1))))
    {
        C.write(C.field(C.global("iflags"),"instance_flags","debug_overwrite_stairs"),"i8",C.cast("i8",val));
    }
    /* prevent pline going out to the UI */
    (val = C.cast("i32",C.callLocal(get_table_boolean_opt,L,C.literal("prevent_pline"),C.unary("i32","-",1))));
    if (C.truth(Number(val !== C.unary("i32","-",1))))
    {
        C.write(C.field(C.global("iflags"),"instance_flags","debug_prevent_pline"),"i8",C.cast("i8",val));
    }
    return 0;
}


/* flip level */
/* nh.flip_level(n); */
export function nhl_flip_level(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(304,L);
    var flp = 0;
    if (C.truth(Number(argc === 1)))
    (flp = C.cast("i32",C.cast("i32",C.api(305,L,(1),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))))));
    C.api(306,flp,C.cast("i8",Number(!C.truth(C.read(C.field(C.global("gi"),"instance_globals_i","in_mklev"),"i8")))));
    return 0;
}


/* does location at x,y have timer? */
/* local has_melttimer = nh.has_timer_at(x,y, "melt-ice"); */
/* local has_melttimer = nh.has_timer_at({x=4,y=7}, "melt-ice"); */
export function nhl_timer_has_at(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var ret = (C.cast("i8",0));
    var timertype = C.callLocal(nhl_get_timertype,L,C.unary("i32","-",1));
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    var when;
    C.api(307,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    /* remove timertype */
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("nhl_timer_has_at: Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(308,x,y);
    if (C.truth(C.api(309,C.read(x,"i16"),C.read(y,"i16"))))
    {
        (when = C.cast("i64",C.api(310,C.read(x,"i16"),C.read(y,"i16"),timertype)));
        (ret = C.cast("i8",C.cast("i8",(Number(when > 0n)))));
    }
    C.api(311,L,C.cast("i32",ret));
    return 1;
}


/* when does location at x,y timer trigger? */
/* local melttime = nh.peek_timer_at(x,y, "melt-ice"); */
/* local melttime = nh.peek_timer_at({x=5,y=6}, "melt-ice"); */
export function nhl_timer_peek_at(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var when = 0n;
    var timertype = C.callLocal(nhl_get_timertype,L,C.unary("i32","-",1));
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    C.api(312,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    /* remove timertype */
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("nhl_timer_peek_at: Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(313,x,y);
    if (C.truth(Number(C.truth((Number(C.cast("i32",timertype) === C.constant("MELT_ICE_AWAY")))) && C.truth(C.api(314,C.read(x,"i16"),C.read(y,"i16"))))))
    (when = C.cast("i64",C.api(315,C.read(x,"i16"),C.read(y,"i16"),timertype)));
    C.api(316,L,C.cast("i64",when));
    return 1;
}


/* stop timer at location x,y */
/* nh.stop_timer_at(x,y, "melt-ice"); */
/* nh.stop_timer_at({x=6,y=8}, "melt-ice"); */
export function nhl_timer_stop_at(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var timertype = C.callLocal(nhl_get_timertype,L,C.unary("i32","-",1));
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    C.api(317,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    /* remove timertype */
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("nhl_timer_stop_at: Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(318,x,y);
    if (C.truth(Number(C.truth((Number(C.cast("i32",timertype) === C.constant("MELT_ICE_AWAY")))) && C.truth(C.api(319,C.read(x,"i16"),C.read(y,"i16"))))))
    C.api(320,C.read(x,"i16"),C.read(y,"i16"),timertype);
    return 0;
}


/* start timer at location x,y */
/* nh.start_timer_at(x,y, "melt-ice", 10); */
export function nhl_timer_start_at(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var timertype = C.callLocal(nhl_get_timertype,L,C.unary("i32","-",2));
    var when = C.cast("i64",C.api(321,L,(C.unary("i32","-",1)),C.cast({"pointer":"int"},(C.cast({"pointer":"void"},0)))));
    var lx = C.local(8);
    var ly = C.local(8);
    var x = C.local(2);
    var y = C.local(2);
    C.api(322,L,C.binary("i32","-",C.unary("i32","-",(2)),1));
    /* remove when and timertype */
    if (C.truth(Number(!C.truth(C.callLocal(nhl_get_xy_params,L,lx,ly)))))
    {
        C.callLocal(nhl_error,L,C.literal("nhl_timer_start_at: Wrong args"));
        /*NOTREACHED*/
        return 0;
    }
    C.write(x,"i16",C.cast("i16",C.read(lx,"i64")));
    C.write(y,"i16",C.cast("i16",C.read(ly,"i64")));
    C.api(323,x,y);
    if (C.truth(Number(C.truth((Number(C.cast("i32",timertype) === C.constant("MELT_ICE_AWAY")))) && C.truth(C.api(324,C.read(x,"i16"),C.read(y,"i16"))))))
    {
        let where = C.binary("i64","|",(C.binary("i64","<<",C.cast("i64",C.read(x,"i16")),16)),C.cast("i64",C.read(y,"i16")));
        C.api(325,C.read(x,"i16"),C.read(y,"i16"),timertype);
        C.api(327,when,C.cast("i16",C.constant("TIMER_LEVEL")),C.cast("i16",C.constant("MELT_ICE_AWAY")),C.api(326,where));
    }
    return 0;
}


/* returns the visual interpretation of the key bound to an extended command,
   or the ext cmd name if not bound to any key */
/* local helpkey = eckey("help"); */
export function nhl_get_cmd_key(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(328,L);
    if (C.truth(Number(argc === 1)))
    {
        let cmd = (C.api(329,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
        let key = C.api(330,cmd);
        C.api(331,L,key);
        return 1;
    }
    return 0;
}


/* add or remove a lua function callback */
/* callback("level_enter", "function_name"); */
/* callback("level_enter", "function_name", true); */
/* level_enter, level_leave, cmd_before */
export function nhl_callback(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var argc = C.api(332,L);
    var i;
    var rm;
    var fn;
    var cb;
    if (C.truth(Number(!C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})))))
    {
        C.api(333,C.literal("nh luacore not inited"));
        /*NOTREACHED*/
        return 0;
    }
    if (C.truth(Number(C.truth(Number(argc === 2)) || C.truth(Number(argc === 3)))))
    {
        if (C.truth(Number(argc === 2)))
        {
            (rm = C.cast("i8",(C.cast("i8",0))));
            (fn = C.cast({"pointer":"char"},(C.api(334,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
            (cb = C.cast({"pointer":"char"},(C.api(335,L,(C.unary("i32","-",2)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
        }
        else
        {
            (rm = C.cast("i8",C.cast("i8",C.api(336,L,C.unary("i32","-",1)))));
            (fn = C.cast({"pointer":"char"},(C.api(337,L,(C.unary("i32","-",2)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
            (cb = C.cast({"pointer":"char"},(C.api(338,L,(C.unary("i32","-",3)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))))));
        }
        for ((i = C.cast("i32",0)); C.truth(Number(i < C.constant("NUM_NHCB"))); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
        if (C.truth(Number(!C.truth(C.api(339,cb,C.read(C.offset(C.global("nhcb_name"),i,8),{"pointer":"char"}))))))
        break;
        if (C.truth(Number(i >= C.constant("NUM_NHCB"))))
        return 0;
        if (C.truth(rm))
        {
            C.post(()=>C.read(C.offset(C.global("nhcb_counts"),i,4),"i32"),()=>C.write(C.offset(C.global("nhcb_counts"),i,4),"i32",C.binary("i32","-",C.read(C.offset(C.global("nhcb_counts"),i,4),"i32"),1)));
            if (C.truth(Number(C.read(C.offset(C.global("nhcb_counts"),i,4),"i32") < 0)))
            C.api(340,C.literal("nh.callback counts are wrong"));
        }
        else
        {
            C.post(()=>C.read(C.offset(C.global("nhcb_counts"),i,4),"i32"),()=>C.write(C.offset(C.global("nhcb_counts"),i,4),"i32",C.binary("i32","+",C.read(C.offset(C.global("nhcb_counts"),i,4),"i32"),1)));
        }
        C.api(341,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),(C.truth(C.cast("i32",rm)) ? C.literal("nh_callback_rm") : C.literal("nh_callback_set")));
        C.api(342,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),cb);
        C.api(343,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),fn);
        C.callLocal(nhl_pcall_handle,C.cast({"pointer":"lua_State"},C.read(C.field(C.global("gl"),"instance_globals_l","luacore"),{"pointer":"void"})),2,0,C.literal("nhl_callback"),C.cast("u32",C.constant("NHLpa_panic")));
    }
    return 0;
}


/* store or restore game state */
/*
 * Currently handles
 *   turn counter,
 *   hero inventory and hunger,
 *   hero attributes and skills and conducts (all via 'struct u'),
 *   object discoveries,
 *   monster generation and vanquished statistics.
 * NOTE: wouldn't work after restore if game has been saved, so the
 * #save command ('S') is disabled during the tutorial.
 */
/* gamestate(); -- save state */
/* gamestate(true); -- restore state */
export function nhl_gamestate(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var wornmask;
    var otmp;
    var argc = C.api(344,L);
    var reststate = C.cast("i8",(C.truth((Number(argc > 0))) ? C.api(345,L,C.unary("i32","-",1)) : C.cast("i32",(C.cast("i8",0)))));
    var otyp;
    do
    {
        if (C.truth(C.api(346,C.literal("nhlua.c"),(C.cast("i8",1)))))
        {
            let save_plnmsg = C.read(C.field(C.global("iflags"),"instance_flags","last_msg"),"i32");
            C.api(347,C.literal("gamestate: %d:%d (%c vs %c)"),C.cast("i32",C.read(C.field(C.field(C.global("u"),"you","uz"),"d_level","dnum"),"i16")),C.cast("i32",C.read(C.field(C.field(C.global("u"),"you","uz"),"d_level","dlevel"),"i16")),(C.truth(C.cast("i32",reststate)) ? 84 : 70),(C.truth(C.cast("i32",C.read(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8"))) ? 116 : 102));
            C.write(C.field(C.global("iflags"),"instance_flags","last_msg"),"i32",save_plnmsg);
        }
    }
    while (C.truth(0));
    if (C.truth(Number(C.truth(C.cast("i32",reststate)) && C.truth(C.cast("i32",C.read(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8"))))))
    {
        let cur_uz = C.local(4);
        C.copy(cur_uz,C.field(C.global("u"),"you","uz"),4);
        let cur_uz0 = C.local(4);
        C.copy(cur_uz0,C.field(C.global("u"),"you","uz0"),4);
        /* restore game state */
        C.write(C.field(C.global("svm"),"instance_globals_saved_m","moves"),"i64",C.read(C.field(C.global("gg"),"instance_globals_g","gmst_moves"),"i64"));
        C.api(348,C.literal("Resetting time to move #%ld."),C.read(C.field(C.global("svm"),"instance_globals_saved_m","moves"),"i64"));
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_moves"),"i64",0n);
        C.write(C.field(C.global("gl"),"instance_globals_l","lastinvnr"),"i32",51);
        while (C.truth(C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"})))
        C.api(349,C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"}));
        while (C.truth(Number(((otmp = C.cast({"pointer":"struct obj"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_invent"),{"pointer":"struct obj"})))) !== C.cast({"pointer":"struct obj"},(C.cast({"pointer":"void"},0))))))
        {
            (wornmask = C.cast("i64",C.read(C.field(otmp,"obj","owornmask"),"i64")));
            C.write(C.field(otmp,"obj","owornmask"),"i64",0n);
            C.api(350,otmp,C.field(C.global("gg"),"instance_globals_g","gmst_invent"));
            C.api(351,otmp);
            if (C.truth(wornmask))
            C.api(352,otmp,wornmask);
        }
        ((Number(C.truth((Number(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"}) !== C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))))) || C.truth(((C.api(353,C.literal("gg.gmst_ubak != NULL"),C.literal("nhlua.c"),1906,(C.literal("nhl_gamestate"))),0))))));
        C.api(354,C.cast({"pointer":"void"},C.global("u")),C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"})),2760n);
        ((Number(C.truth((Number(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"}) !== C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))))) || C.truth(((C.api(355,C.literal("gg.gmst_disco != NULL"),C.literal("nhlua.c"),1908,(C.literal("nhl_gamestate"))),0))))));
        C.api(356,C.cast({"pointer":"void"},C.field(C.global("svd"),"instance_globals_saved_d","disco")),C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"})),962n);
        ((Number(C.truth((Number(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"}) !== C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))))) || C.truth(((C.api(357,C.literal("gg.gmst_mvitals != NULL"),C.literal("nhlua.c"),1911,(C.literal("nhl_gamestate"))),0))))));
        C.api(358,C.cast({"pointer":"void"},C.field(C.global("svm"),"instance_globals_saved_m","mvitals")),C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"})),1532n);
        /* clear user-given object type names */
        for ((otyp = C.cast("i32",0)); C.truth(Number(otyp < C.constant("NUM_OBJECTS"))); C.post(()=>otyp,()=>(otyp = C.cast("i32",C.binary("i32","+",otyp,1)))))
        if (C.truth(C.read(C.field(C.offset(C.global("objects"),otyp,72),"objclass","oc_uname"),{"pointer":"char"})))
        {
            C.api(359,C.cast({"pointer":"void"},C.read(C.field(C.offset(C.global("objects"),otyp,72),"objclass","oc_uname"),{"pointer":"char"})));
            C.write(C.field(C.offset(C.global("objects"),otyp,72),"objclass","oc_uname"),{"pointer":"char"},C.cast({"pointer":"char"},0));
        }
        /* some restored state would confuse the level change in progress */
        (C.copy(C.field(C.global("u"),"you","uz"),cur_uz,4),C.copy(C.field(C.global("u"),"you","uz0"),cur_uz0,4));
        C.api(360);
        C.callLocal(free_tutorial);
        /* release gg.gmst_XYZ */
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8",(C.cast("i8",0)));
        C.api(361,C.cast({"pointer":"void"},C.field(C.global("svs"),"instance_globals_saved_s","spl_book")),C.cast({"pointer":"void"},C.field(C.global("gg"),"instance_globals_g","gmst_spl_book")),344n);
    }
    else
    if (C.truth(Number(C.truth(Number(!C.truth(reststate))) && C.truth(Number(!C.truth(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8")))))))
    {
        /* store game state */
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_moves"),"i64",C.read(C.field(C.global("svm"),"instance_globals_saved_m","moves"),"i64"));
        while (C.truth(Number(((otmp = C.cast({"pointer":"struct obj"},C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"})))) !== C.cast({"pointer":"struct obj"},(C.cast({"pointer":"void"},0))))))
        {
            (wornmask = C.cast("i64",C.read(C.field(otmp,"obj","owornmask"),"i64")));
            C.api(362,otmp);
            C.api(363,otmp);
            C.write(C.field(otmp,"obj","owornmask"),"i64",wornmask);
            /* flag for later restore */
            C.write(C.field(otmp,"obj","nobj"),{"pointer":"struct obj"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_invent"),{"pointer":"struct obj"}));
            C.write(C.field(C.global("gg"),"instance_globals_g","gmst_invent"),{"pointer":"struct obj"},otmp);
        }
        C.write(C.field(C.global("gl"),"instance_globals_l","lastinvnr"),"i32",51);
        /* next inv letter to try to use will be 'a' */
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},C.cast({"pointer":"void"},C.api(364,C.cast("u32",2760n)))));
        C.api(365,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"})),C.cast({"pointer":"void"},C.global("u")),2760n);
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},C.cast({"pointer":"void"},C.api(366,C.cast("u32",962n)))));
        C.api(367,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"})),C.cast({"pointer":"void"},C.field(C.global("svd"),"instance_globals_saved_d","disco")),962n);
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},C.cast({"pointer":"void"},C.api(368,C.cast("u32",1532n)))));
        C.api(369,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"})),C.cast({"pointer":"void"},C.field(C.global("svm"),"instance_globals_saved_m","mvitals")),1532n);
        C.api(370,C.cast({"pointer":"void"},C.field(C.global("gg"),"instance_globals_g","gmst_spl_book")),C.cast({"pointer":"void"},C.field(C.global("svs"),"instance_globals_saved_s","spl_book")),344n);
        C.api(371,C.cast({"pointer":"void"},C.field(C.global("svs"),"instance_globals_saved_s","spl_book")),0,344n);
        C.write(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8",(C.cast("i8",1)));
    }
    else
    {
        C.api(372,C.literal("nhl_gamestate: inconsistent state (%s vs %s)"),(C.truth(C.cast("i32",reststate)) ? C.literal("restore") : C.literal("save")),(C.truth(C.cast("i32",C.read(C.field(C.global("gg"),"instance_globals_g","gmst_stored"),"i8"))) ? C.literal("already stored") : C.literal("not stored")));
    }
    C.api(373);
    return 0;
}


/* free dynamic date allocated when entering tutorial;
   called when exiting tutorial normally or if player quits while in it */
export function free_tutorial()
{
    var otmp;
    /* for normal tutorial exit, gmst_invent will already be Null */
    while (C.truth(Number(((otmp = C.cast({"pointer":"struct obj"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_invent"),{"pointer":"struct obj"})))) !== C.cast({"pointer":"struct obj"},0))))
    {
        /* set otmp->where = OBJ_FREE, otmp->nobj = NULL */
        C.api(374,otmp,C.field(C.global("gg"),"instance_globals_g","gmst_invent"));
        /* gmst_invent is a list of invent items sequestered when entering
           the tutorial; for them, owornmask is used as a flag to re-wear
           them when exiting tutorial, not that they are currently worn;
           clear it to avoid a "deleting worn obj" complaint from obfree() */
        C.write(C.field(otmp,"obj","owornmask"),"i64",0n);
        /* dealloc_obj() isn't enough (for containers, it assumes that
           caller has already freed their contents) */
        C.api(375,otmp,C.cast({"pointer":"struct obj"},0));
    }
    if (C.truth(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"})))
    (C.api(376,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"}))),C.write(C.field(C.global("gg"),"instance_globals_g","gmst_ubak"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))));
    if (C.truth(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"})))
    (C.api(377,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"}))),C.write(C.field(C.global("gg"),"instance_globals_g","gmst_disco"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))));
    if (C.truth(C.read(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"})))
    (C.api(378,C.cast({"pointer":"void"},C.read(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"}))),C.write(C.field(C.global("gg"),"instance_globals_g","gmst_mvitals"),{"pointer":"genericptr_t"},C.cast({"pointer":"genericptr_t"},(C.cast({"pointer":"void"},0)))));
}


/* called from gotolevel(do.c) */
export function tutorial(entering)
{
    entering = C.cast("i8",entering);
    C.callLocal(l_nhcore_call,(C.truth(C.cast("i32",entering)) ? C.constant("NHCORE_ENTER_TUTORIAL") : C.constant("NHCORE_LEAVE_TUTORIAL")));
    if (C.truth(Number(!C.truth(entering))))
    {
        /* after leaving, can't go back */
        C.write(C.offset(C.data("nhcore_call_available"),C.constant("NHCORE_ENTER_TUTORIAL"),1),"i8",C.write(C.offset(C.data("nhcore_call_available"),C.constant("NHCORE_LEAVE_TUTORIAL"),1),"i8",(C.cast("i8",0))));
    }
}


/* DUMPLOG */
/* DLB */
/* register and init the constants table */
export function init_nhc_data(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var i;
    C.api(379,L,0,0);
    for ((i = C.cast("i32",0)); C.truth(C.read(C.field(C.offset(C.data("nhl_consts"),i,16),"anonymous_2057_14","name"),{"pointer":"char"})); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
    {
        C.api(380,L,C.read(C.field(C.offset(C.data("nhl_consts"),i,16),"anonymous_2057_14","name"),{"pointer":"char"}));
        C.api(381,L,C.cast("i64",C.read(C.field(C.offset(C.data("nhl_consts"),i,16),"anonymous_2057_14","value"),"i64")));
        C.api(382,L,C.unary("i32","-",3));
    }
    C.api(383,L,C.literal("nhc"));
}


export function nhl_push_anything(L, anytype, src)
{
    L = C.cast({"pointer":"lua_State"},L);
    anytype = C.cast("i32",anytype);
    src = C.cast({"pointer":"void"},src);
    var any = C.local(8);
    C.copy(any,C.field(C.global("cg"),"const_globals","zeroany"),8);
    switch (anytype)
    {
        case (C.constant("ANY_INT")):
            C.write(C.field(any,"any","a_int"),"i32",C.read(C.cast({"pointer":"int"},src),"i32"));
        C.api(384,L,C.cast("i64",C.read(C.field(any,"any","a_int"),"i32")));
        break;
        case (C.constant("ANY_UCHAR")):
            C.write(C.field(any,"any","a_uchar"),"u8",C.read(C.cast({"pointer":"uchar"},src),"u8"));
        C.api(385,L,C.cast("i64",C.read(C.field(any,"any","a_uchar"),"u8")));
        break;
        case (C.constant("ANY_SCHAR")):
            C.write(C.field(any,"any","a_schar"),"i8",C.read(C.cast({"pointer":"schar"},src),"i8"));
        C.api(386,L,C.cast("i64",C.read(C.field(any,"any","a_schar"),"i8")));
        break;
    }
    return 1;
}


export function nhl_meta_u_index(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    /* actually coordxy */
    /* actually coordxy */
    var tkey = (C.api(387,L,(2),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
    var i;
    /* FIXME: doesn't really work, eg. negative values for u.dx */
    for ((i = C.cast("i32",0)); C.truth(Number(i < C.cast("i32",(C.binary("u64","/",576n,24n))))); C.post(()=>i,()=>(i = C.cast("i32",C.binary("i32","+",i,1)))))
    if (C.truth(Number(!C.truth(C.api(388,tkey,C.read(C.field(C.offset(C.data("nhl_meta_u_index__ustruct"),i,24),"anonymous_2120_18","name"),{"pointer":"char"}))))))
    {
        return C.callLocal(nhl_push_anything,L,C.read(C.field(C.offset(C.data("nhl_meta_u_index__ustruct"),i,24),"anonymous_2120_18","type"),"i32"),C.read(C.field(C.offset(C.data("nhl_meta_u_index__ustruct"),i,24),"anonymous_2120_18","ptr"),{"pointer":"void"}));
    }
    if (C.truth(Number(!C.truth(C.api(389,tkey,C.literal("inventory"))))))
    {
        C.api(390,L,C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"}));
        return 1;
    }
    else
    if (C.truth(Number(!C.truth(C.api(391,tkey,C.literal("role"))))))
    {
        C.api(392,L,C.read(C.field(C.field(C.field(C.global("gu"),"instance_globals_u","urole"),"Role","name"),"RoleName","m"),{"pointer":"char"}));
        return 1;
    }
    else
    if (C.truth(Number(!C.truth(C.api(393,tkey,C.literal("moves"))))))
    {
        C.api(394,L,C.cast("i64",C.read(C.field(C.global("svm"),"instance_globals_saved_m","moves"),"i64")));
        return 1;
    }
    else
    if (C.truth(Number(!C.truth(C.api(395,tkey,C.literal("uhave_amulet"))))))
    {
        C.api(396,L,C.cast("i64",C.bit(C.field(C.field(C.global("u"),"you","uhave"),"u_have","amulet"),0,1)));
        return 1;
    }
    else
    if (C.truth(Number(!C.truth(C.api(397,tkey,C.literal("depth"))))))
    {
        C.api(399,L,C.cast("i64",C.api(398,C.field(C.global("u"),"you","uz"))));
        return 1;
    }
    else
    if (C.truth(Number(!C.truth(C.api(400,tkey,C.literal("invocation_level"))))))
    {
        C.api(402,L,C.cast("i32",C.api(401,C.field(C.global("u"),"you","uz"))));
        return 1;
    }
    C.callLocal(nhl_error,L,C.literal("Unknown u table index"));
    /*NOTREACHED*/
    return 0;
}


export function nhl_meta_u_newindex(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    C.callLocal(nhl_error,L,C.literal("Cannot set u table values"));
    /*NOTREACHED*/
    return 0;
}


export function nhl_u_clear_inventory(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    while (C.truth(C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"})))
    C.api(403,C.read(C.field(C.global("gi"),"instance_globals_i","invent"),{"pointer":"struct obj"}));
    return 0;
}


/* Put object into player's inventory */
/* u.giveobj(obj.new("rock")); */
export function nhl_u_giveobj(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    return C.api(404,L);
}


export function init_u_data(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    C.api(405,L,0,0);
    C.api(406,L,C.data("nhl_u_functions"),0);
    C.api(407,L,0,0);
    C.api(408,L,(C.functionPointer("nhl_meta_u_index")),0);
    C.api(409,L,C.unary("i32","-",2),C.literal("__index"));
    C.api(410,L,(C.functionPointer("nhl_meta_u_newindex")),0);
    C.api(411,L,C.unary("i32","-",2),C.literal("__newindex"));
    C.api(412,L,C.unary("i32","-",2));
    C.api(413,L,C.literal("u"));
}


export function traceback_handler(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    C.api(415,L,L,C.api(414,L,(1),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))),0);
    /* TODO: call impossible() if fuzzing? */
    return 1;
}


export function nhl_getmeminuse(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    return C.cast("u32",C.binary("i32","+",C.binary("i32","*",C.api(416,L,3),1024),C.api(417,L,4)));
}


/* lua_pcall with our traceback handler and memory and instruction step
 * limiting.
 *  On error, traceback will be on top of stack */
export function nhl_pcall(L, nargs, nresults, name)
{
    L = C.cast({"pointer":"lua_State"},L);
    nargs = C.cast("i32",nargs);
    nresults = C.cast("i32",nresults);
    name = C.cast({"pointer":"char"},name);
    var nud = C.local(8);
    var rv;
    C.api(418,L,(C.functionPointer("traceback_handler")),0);
    C.api(419,L,(1),1);
    C.api(420,L,C.cast({"pointer":"void *"},nud));
    if (C.truth(Number(C.truth(C.read(nud,{"pointer":"struct nhl_user_data"})) && C.truth(name))))
    {
        C.write(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"},name);
    }
    /* NB: We don't need to deal with nud->memlimit - Lua handles that. */
    // Transport: keep the native setjmp frame active over this continuation.
    var jump_buffer = 0;
    if (C.truth(Number(C.truth(C.read(nud,{"pointer":"struct nhl_user_data"})) && C.truth((Number(C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","steps"),"u32")) || C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","perpcall"),"u32")))))))) {
        if (C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","perpcall"),"u32")))
        {
            C.write(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","steps"),"u32",C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","perpcall"),"u32"));
            C.write(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","statctr"),"u32",C.cast("u32",0));
        }
        jump_buffer = C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","jb");
    }
    return C.setjmpBooleanScope(jump_buffer, setjmp_result => {
        if (setjmp_result)
        {
            /* panic, because we don't know if the game state is corrupt */
            /* XXX can we get a lua stack trace as well? */
            C.api(421,C.literal("Lua time exceeded %d:%s"),C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","sid"),"i32"),(C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"})) ? C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}) : C.cast({"pointer":"char"},C.literal("(unknown)"))));
        }
        (rv = C.cast("i32",C.api(422,L,nargs,nresults,(1),C.cast("i64",0),C.cast({"pointer":"function"},(C.cast({"pointer":"void"},0))))));
        ((C.api(423,L,(1),C.unary("i32","-",1)),C.api(424,L,C.binary("i32","-",C.unary("i32","-",(1)),1))));
        /* remove handler */
        if (C.truth(Number(C.truth(Number(C.truth(C.read(nud,{"pointer":"struct nhl_user_data"})) && C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","perpcall"),"u32")))) && C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","loglua"),"i32")))))
        {
            let ic = C.cast("i64",C.binary("u32","*",C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","statctr"),"u32"),C.cast("u32",1000)));
            C.api(425,32768n,C.literal("LUASTATS PCAL %d:%s %ld"),C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","sid"),"i32"),C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}),ic);
        }
        if (C.truth(Number(C.truth(Number(C.truth(C.read(nud,{"pointer":"struct nhl_user_data"})) && C.truth(C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","memlimit"),"u32")))) && C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","loglua"),"i32")))))
        {
            C.api(426,32768n,C.literal("LUASTATS PMEM %d:%s %lu"),C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","sid"),"i32"),C.read(C.field(C.read(nud,{"pointer":"struct nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}),C.cast("u64",C.callLocal(nhl_getmeminuse,L)));
        }
        return rv;
    });
}


export function nhl_pcall_handle(L, nargs, nresults, name, npa)
{
    L = C.cast({"pointer":"lua_State"},L);
    nargs = C.cast("i32",nargs);
    nresults = C.cast("i32",nresults);
    name = C.cast({"pointer":"char"},name);
    npa = C.cast("u32",npa);
    var rv = C.callLocal(nhl_pcall,L,nargs,nresults,name);
    if (C.truth(rv))
    {
        let nud = C.local(8);
        C.api(427,L,C.cast({"pointer":"void *"},nud));
        /* XXX can we get a lua stack trace as well? */
        switch (C.cast("u32",npa))
        {
            case C.cast("u32",(C.constant("NHLpa_panic"))):
                C.api(429,C.literal("Lua error %d:%s %s"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","sid"),"i32"),(C.truth(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"})) ? C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}) : C.cast({"pointer":"char"},C.literal("(unknown)"))),C.api(428,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            /*NOTREACHED*/
            break;
            case C.cast("u32",(C.constant("NHLpa_impossible"))):
                C.api(431,C.literal("Lua error: %d:%s %s"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","sid"),"i32"),(C.truth(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"})) ? C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}) : C.cast({"pointer":"char"},C.literal("(unknown)"))),C.api(430,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            /* Drop the error.  If the caller cares, use nhl_pcall(). */
            C.api(432,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
        }
    }
    return rv;
}


/* XXX impossible() should be swappable with pline/nothing/panic via flag */
/* read lua code/data from a dlb module or an external file
   into a string buffer and feed that to lua */
export function nhl_loadlua(L, fname)
{
    L = C.cast({"pointer":"lua_State"},L);
    fname = C.cast({"pointer":"char"},fname);
    give_up: {
        /* 8K */
        var ret = (C.cast("i8",1));
        var fh;
        var buf = C.cast({"pointer":"char"},0);
        var bufin;
        var bufout;
        var p;
        var nl;
        var altfname;
        var buflen;
        var ct;
        var cnt;
        var llret;
        (altfname = C.cast({"pointer":"char"},C.cast({"pointer":"char"},C.api(434,C.binary("u32","+",C.api(433,fname,(C.literal("nhl_loadlua")),2347),C.cast("u32",3))))));
        /* 3: '('...')\0' */
        /* don't know whether 'fname' is inside a dlb container;
       if we did, we could choose between "nhdat(<fname>)" and "<fname>"
       but since we don't, compromise */
        C.api(435,altfname,C.literal("(%s)"),fname);
        (fh = C.cast({"pointer":"FILE"},C.api(436,fname,C.literal("r"))));
        if (C.truth(Number(!C.truth(fh))))
        {
            C.api(437,C.literal("nhl_loadlua: Error opening %s"),altfname);
            (ret = C.cast("i8",(C.cast("i8",0))));
            break give_up;
        }
        C.api(438,fh,0n,(2));
        (buflen = C.cast("i64",C.api(439,fh)));
        C.api(440,fh,0n,(0));
        /* extra +1: room to add final '\n' if missing */
        (buf = C.cast({"pointer":"char"},(bufout = C.cast({"pointer":"char"},C.cast({"pointer":"char"},C.api(442,C.cast("u32",C.api(441,C.cast("i64",C.binary("i64","+",C.binary("i64","+",buflen,C.cast("i64",1)),C.cast("i64",1))),(C.literal("nhl_loadlua")),2364))))))));
        C.write(C.offset(buf,0,1),"i8",C.cast("i8",0));
        (bufin = C.cast({"pointer":"char"},(bufout = C.cast({"pointer":"char"},buf))));
        (ct = C.cast("i64",0n));
        while (C.truth(Number(C.truth(Number(buflen > C.cast("i64",0))) || C.truth(ct))))
        {
            /*
         * Semi-arbitrarily limit reads to 8K at a time.  That's big
         * enough to cover the majority of our Lua files in one bite
         * but small enough to fully exercise the partial record
         * handling (when processing the castle's level description).
         *
         * [For an external file (non-DLB), VMS may only be able to
         * read at most 32K-1 at a time depending on the file format
         * in use, and fseek(SEEK_END) only yields an upper bound on
         * the actual amount of data in that situation.]
         */
            if (C.truth(Number(((cnt = C.cast("i64",C.cast("i64",C.api(443,C.cast({"pointer":"void"},bufin),C.cast("u64",1),C.cast("u64",((C.truth(Number(C.cast("i64",(C.cast("i32",buflen))) < ((C.binary("i64","<<",1n,13))))) ? C.cast("i64",(C.cast("i32",buflen))) : ((C.binary("i64","<<",1n,13)))))),fh))))) < 0n)))
            break;
            (buflen = C.cast("i64",C.binary("i64","-",buflen,cnt)));
            /* set up for next iteration, if any */
            if (C.truth(Number(cnt === 0n)))
            {
                C.write(bufin,"i8",C.cast("i8",10));
                /* very last line is unterminated? */
                (cnt = C.cast("i64",C.cast("i64",1)));
            }
            C.write(C.offset(bufin,cnt,1),"i8",C.cast("i8",0));
            /* fread() doesn't do this */
            /* in case partial line was leftover from previous fread */
            (((bufin = C.cast({"pointer":"char"},C.offset(bufin,(-ct),1))),(cnt = C.cast("i64",C.binary("i64","+",cnt,ct)))),(ct = C.cast("i64",C.cast("i64",0))));
            while (C.truth(Number(cnt > C.cast("i64",0))))
            {
                if (C.truth(Number(((nl = C.cast({"pointer":"char"},C.api(444,bufin,10)))) !== C.cast({"pointer":"char"},0))))
                {
                    /* normal case, newline is present */
                    (ct = C.cast("i64",(C.binary("i64","+",C.pointerDifference(nl,bufin,1),1n))));
                    /* +1: keep the newline */
                    for ((p = C.cast({"pointer":"char"},bufin)); C.truth(Number(p <= nl)); (p = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",p,1))))
                    C.write(C.post(()=>bufout,()=>(bufout = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",bufout,1)))),"i8",C.read(C.post(()=>bufin,()=>(bufin = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",bufin,1)))),"i8"));
                    if (C.truth(Number(C.cast("i32",C.read(bufin,"i8")) === 13)))
                    ((bufin = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",bufin,1))),(ct = C.cast("i64",C.binary("i64","+",ct,1n))));
                    /* update for next loop iteration */
                    (cnt = C.cast("i64",C.binary("i64","-",cnt,ct)));
                    (ct = C.cast("i64",C.cast("i64",0)));
                }
                else
                if (C.truth(Number(C.api(445,bufin) < C.cast("u64",(C.binary("i64","<<",1n,13))))))
                {
                    /* no newline => partial record; move unprocessed chars
                   to front of input buffer (bufin portion of buf[]) */
                    (ct = C.cast("i64",(cnt = C.cast("i64",(C.pointerDifference(C.api(446,bufin),bufin,1))))));
                    for ((p = C.cast({"pointer":"char"},bufout)); C.truth(Number(cnt > C.cast("i64",0))); (cnt = C.cast("i64",C.binary("i64","-",cnt,1n))))
                    C.write(C.post(()=>p,()=>(p = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",p,1)))),"i8",C.read(C.post(()=>bufin,()=>(bufin = C.cast({"pointer":"char"},C.binary({"pointer":"char"},"+",bufin,1)))),"i8"));
                    C.write(p,"i8",C.cast("i8",0));
                    (bufin = C.cast({"pointer":"char"},p));
                }
                else
                /* next fread() populates buf[] starting here */
                /* cnt==0 so inner loop will terminate */
                {
                    /* LOADCHUNKSIZE portion of buffer already completely full */
                    C.api(447,C.literal("(%s) line too long"),altfname);
                    break give_up;
                }
            }
        }
        C.write(bufout,"i8",C.cast("i8",0));
        C.api(448,fh);
        (llret = C.cast("i32",C.api(450,L,buf,C.api(449,buf),altfname,C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0))))));
        if (C.truth(Number(llret !== 0)))
        {
            C.api(452,C.literal("luaL_loadbuffer: Error loading %s: %s"),altfname,C.api(451,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0)))));
            (ret = C.cast("i8",(C.cast("i8",0))));
            break give_up;
        }
        else
        {
            if (C.truth(C.callLocal(nhl_pcall_handle,L,0,(C.unary("i32","-",1)),fname,C.cast("u32",C.constant("NHLpa_impossible")))))
            {
                (ret = C.cast("i8",(C.cast("i8",0))));
                break give_up;
            }
        }
    }
    if (C.truth(altfname))
    C.api(453,C.cast({"pointer":"void"},altfname));
    if (C.truth(buf))
    C.api(454,C.cast({"pointer":"void"},buf));
    return ret;
}


export function nhl_init(sbi)
{
    sbi = C.cast({"pointer":"nhl_sandbox_info"},sbi);
    /* It would be nice to import EXPECTED from each build system. XXX */
    /* And it would be nice to do it only once, but it's cheap. */
    if (C.truth(Number(50408 !== (C.binary("i32","+",C.binary("i32","*",504,100),8)))))
    {
        C.api(455,C.literal("sandbox doesn't know this Lua version: this=%d != expected=%d "),(C.binary("i32","+",C.binary("i32","*",504,100),8)),50408);
    }
    var L = C.callLocal(nhlL_newstate,sbi,C.literal("nhl_init"));
    if (C.truth(Number(!C.truth(L))))
    return C.cast({"pointer":"lua_State"},0);
    C.write(C.field(C.global("iflags"),"instance_flags","in_lua"),"i8",(C.cast("i8",1)));
    /* Temporary for development XXX */
    /* Turn this off in config.h to disable the sandbox. */
    C.callLocal(nhlL_openlibs,L,C.read(C.field(sbi,"nhl_sandbox_info","flags"),"u32"));
    /* XXX Is this still needed? */
    /* register nh -table, and functions for it */
    C.api(456,L,0,0);
    C.api(457,L,C.data("nhl_functions"),0);
    C.api(458,L,C.literal("nh"));
    /* init nhc -table */
    C.callLocal(init_nhc_data,L);
    /* init u -table */
    C.callLocal(init_u_data,L);
    C.api(459,L);
    C.api(460,L);
    C.api(461,L);
    /* nhlib.lua assumes the math table exists. */
    if (C.truth(Number(5 !== C.api(462,L,C.literal("math")))))
    {
        C.api(463,L,0,0);
        C.api(464,L,C.literal("math"));
    }
    if (C.truth(Number(!C.truth(C.callLocal(nhl_loadlua,L,C.literal("nhlib.lua"))))))
    {
        C.callLocal(nhl_done,L);
        return C.cast({"pointer":"lua_State"},0);
    }
    return L;
}


export function nhl_done(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    if (C.truth(L))
    {
        let nud = C.local(8);
        C.write(nud,{"pointer":"nhl_user_data"},C.cast({"pointer":"nhl_user_data"},0));
        C.api(465,L,C.cast({"pointer":"void *"},nud));
        if (C.truth(C.read(C.field(C.global("gl"),"instance_globals_l","loglua"),"i32")))
        {
            if (C.truth(Number(C.truth(C.read(nud,{"pointer":"nhl_user_data"})) && C.truth(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","osteps"),"u32")))))
            {
                let ic = C.cast("i64",C.binary("u32","*",C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","statctr"),"u32"),C.cast("u32",1000)));
                C.api(466,32768n,C.literal("LUASTATS DONE %d:%s %ld"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","sid"),"i32"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}),ic);
            }
            if (C.truth(Number(C.truth(Number(C.truth(C.read(nud,{"pointer":"nhl_user_data"})) && C.truth(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","memlimit"),"u32")))) && C.truth(Number(!C.truth(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","perpcall"),"u32")))))))
            {
                C.api(467,32768n,C.literal("LUASTATS DMEM %d:%s %lu"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","sid"),"i32"),C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","name"),{"pointer":"char"}),C.cast("u64",C.callLocal(nhl_getmeminuse,L)));
            }
        }
        C.api(468,L);
        if (C.truth(C.read(nud,{"pointer":"nhl_user_data"})))
        C.callLocal(nhl_alloc,(C.cast({"pointer":"void"},0)),C.cast({"pointer":"void"},C.read(nud,{"pointer":"nhl_user_data"})),C.cast("u64",0),C.cast("u64",0));
    }
    C.write(C.field(C.global("iflags"),"instance_flags","in_lua"),"i8",(C.cast("i8",0)));
}


export function load_lua(name, sbi)
{
    name = C.cast({"pointer":"char"},name);
    sbi = C.cast({"pointer":"nhl_sandbox_info"},sbi);
    give_up: {
        var ret = (C.cast("i8",1));
        var L = C.callLocal(nhl_init,sbi);
        if (C.truth(Number(!C.truth(L))))
        {
            (ret = C.cast("i8",(C.cast("i8",0))));
            break give_up;
        }
        if (C.truth(Number(!C.truth(C.callLocal(nhl_loadlua,L,name)))))
        {
            (ret = C.cast("i8",(C.cast("i8",0))));
            break give_up;
        }
    }
    C.callLocal(nhl_done,L);
    return ret;
}


export function get_lua_version()
{
    var sbi = C.local(16);
    C.initialize(sbi,{"record":"nhl_sandbox_info"},{"flags":1073741824,"memlimit":1048576,"steps":0,"perpcall":1048576});
    if (C.truth(Number(C.cast("i32",C.read(C.offset(C.field(C.global("gl"),"instance_globals_l","lua_ver"),0,1),"i8")) === 0)))
    {
        let L = C.callLocal(nhl_init,sbi);
        if (C.truth(L))
        {
            let len = C.local(8);
            C.write(len,"u64",C.cast("u64",0));
            let vs = C.cast({"pointer":"char"},0);
            /* LUA_VERSION yields "<major>.<minor>" although we check to see
               whether it is "Lua-<major>.<minor>" and strip prefix if so;
               LUA_RELEASE is <LUA_VERSION>.<LUA_VERSION_RELEASE> but doesn't
               get set up as a lua global */
            C.api(469,L,C.literal("_RELEASE"));
            if (C.truth(C.api(470,L,C.unary("i32","-",1))))
            (vs = C.cast({"pointer":"char"},C.api(471,L,C.unary("i32","-",1),len)));
            else
            ((vs = C.cast({"pointer":"char"},C.literal("Lua 5.4.8"))),C.write(len,"u64",C.api(472,vs)));
            if (C.truth(Number(!C.truth(vs))))
            {
                C.api(473,L,C.literal("_VERSION"));
                if (C.truth(C.api(474,L,C.unary("i32","-",1))))
                (vs = C.cast({"pointer":"char"},C.api(475,L,C.unary("i32","-",1),len)));
                else
                ((vs = C.cast({"pointer":"char"},C.literal("Lua 5.4"))),C.write(len,"u64",C.api(476,vs)));
            }
            if (C.truth(Number(C.truth(vs) && C.truth(Number(C.read(len,"u64") < 20n)))))
            {
                if (C.truth(Number(!C.truth(C.api(477,vs,C.literal("Lua"),3)))))
                {
                    (vs = C.cast({"pointer":"char"},C.offset(vs,3,1)));
                    if (C.truth(Number(C.truth(Number(C.cast("i32",C.read(vs,"i8")) === 45)) || C.truth(Number(C.cast("i32",C.read(vs,"i8")) === 32)))))
                    (vs = C.cast({"pointer":"char"},C.offset(vs,1,1)));
                }
                C.api(478,C.field(C.global("gl"),"instance_globals_l","lua_ver"),vs);
            }
        }
        C.callLocal(nhl_done,L);
        if (C.truth(Number(52n <= 120n)))
        C.api(479,C.field(C.global("gl"),"instance_globals_l","lua_copyright"),C.literal("Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio"));
    }
    return C.field(C.global("gl"),"instance_globals_l","lua_ver");
}


/***
 *** SANDBOX / HARDENING CODE
 ***/
/*
 * Tracing the sandbox:
 * 1. Make sure CHRONICLE and LIVELOG are defined in config.h.
 * 2. Rebuild the game.
 * 3. Run the game and do whatever you want to check with lua.
 * 4. Find the logged information in livelog.
 *
 * Logging format in livelog:
 * <livelog leader>message=LUASTATS <TYPE> <SID>:<TAG> <DATA>
 * where:
 *  TYPE
 *     DONE rough number of step taken during the life of the VM
 *     DMEM memory in use at destruction of VM
 *     PCAL rough number of steps during lua_pcall
 *     PMEM memory in use after lua_pcall returns
 *  SID     a small integer identifying the Lua VM instance
 *  TAG     a string from the nhl_luapcall call
 *  DATA    memory: rough number of bytes in use by the VM
 *          steps: rough number of steps by the VM(see NHL_SB_STEPSIZE)
 */
/* NHL_BASE_BASE - safe things */
/* NHL_BASE_ERROR - not really safe--might not want Lua to kill the process */
/* ok, calls error */
/* ok, calls G->panic */
/* not ok - calls lua_writestring/lua_writeline
                           * which write to stdout */
/* not ok - calls lua_writestringerror which writes
                           * to stderr */
/* NHL_BASE_META - metatable access */
/* NHL_BASE_GC - questionable safety */
/* NHL_BASE_UNSAFE - include only if required */
/* TODO: if NHL_BASE_UNSAFE is ever used, we need to wrap lua_load with
 * something to forbid mode=="b" */
/* no ct_co_ tables; all fns at same level of concern */
/* no ct_string_ tables; all fns at same level of concern */
/* no ct_table_ tables; all fns at same level of concern (but
   sort can take a lot of time and can't be caught by the step limit */
/* no ct_utf8_ tables; all fns at same level of concern */
/* possible ct_debug tables - likely to need changes */
/* uses normal I/O so needs re-write */
/* see sethook */
/* used for memory and step limits */
/* possible ct_os_ tables */
/* is this portable? XXX */
/* not portable */
export function nhl_clearfromtable(L, flag, tndx, todo)
{
    L = C.cast({"pointer":"lua_State"},L);
    flag = C.cast("i32",flag);
    tndx = C.cast("i32",tndx);
    todo = C.cast({"pointer":"struct e"},todo);
    while (C.truth(Number(C.cast("u32",C.read(C.field(todo,"e","when"),"u32")) !== C.cast("u32",C.constant("EOT")))))
    {
        C.api(480,L);
        /* if we load the library at all, NEVER items must be erased
         * and IFFLAG items should be erased if !flag */
        if (C.truth(Number(C.truth(Number(C.cast("u32",C.read(C.field(todo,"e","when"),"u32")) === C.cast("u32",C.constant("NEVER")))) || C.truth(Number(!C.truth(flag))))))
        {
            C.api(481,L,tndx,C.read(C.field(todo,"e","fnname"),{"pointer":"char"}));
        }
        C.post(()=>todo,()=>(todo = C.cast({"pointer":"struct e"},C.binary({"pointer":"struct e"},"+",todo,16))));
    }
}


/*
XXX
registry["org.nethack.nethack.sb.fs"][N]=
    CODEOBJECT
    {
        modepat: PATTERN,
        filepat: PATTERN
    }
CODEOBJECT
    if string then if pcall(string,mode, dir, file)
    if table then if mode matches pattern and filepat ma....
or do we use a real regex engine? (which we don't have and I just
 argued against adding)

return values from "call it":
    accept - file access granted
    reject - file access denied
    continue - try next element
    fail - error.  deny and call impossible/panic
*/
/* stack indexes:
 * -1       table to index with ename
 * params   file
 * params+1 [mode]
 */
/*
 * Problem: NetHack doesn't have a regex engine and Lua doesn't give
 *  C access to pattern matching.  There are 3 poor solutions:
 * 1. Import ~5K lines of code in a dozen files from FreeBSD. (Upside - we
 *    could use it in other places in NetHack.)
 * 2. Hack up lstrlib.c to give C direct access to the pattern matching code.
 * 3. Create a Lua state just to do pattern matching.
 * We're going to do #3.
 */
/* XXX set memory and step limits */
/* load a pattern matching function */
export function end_luapat()
{
    if (C.truth(C.read(C.data("luapat"),{"pointer":"lua_State"})))
    {
        C.api(482,C.read(C.data("luapat"),{"pointer":"lua_State"}));
        C.write(C.data("luapat"),{"pointer":"lua_State"},C.cast({"pointer":"lua_State"},(C.cast({"pointer":"void"},0))));
    }
}


/* careful - we're using 2 different and unrelated Lua states */
/* function             -0,+1 */
/* mode or filename     -0,+0 */
/* -0,+1 */
/* pattern              -0,+1 */
/* -1,+0 */
/* -0,+0 */
/* -0,+1 */
/* -3,+1 */
/* impossible("access check internal error"); */
/* -0,+0 */
/* -1,+0 */
/* put the table open uses to check its arguments on the top of the stack,
 * creating it if needed
 */
/* XXX this may have to be in
                                            * struct g (gi now) TBD */
export function nhl_pushhooked_open_table(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var hot = C.api(483,L,(C.binary("i32","-",C.unary("i32","-",1000000),1000)),C.literal("org.nethack.nethack.sb.fs"));
    if (C.truth(Number(hot === (C.unary("i32","-",1)))))
    {
        C.api(484,L,0,0);
        C.api(485,L,C.unary("i32","-",1));
        C.api(486,L,(C.binary("i32","-",C.unary("i32","-",1000000),1000)),C.literal("org.nethack.nethack.sb.fs"));
    }
}


/* Unlike io.open, we want to treat mode as non-optional. */
/* sandbox checks */
/* Do we need some ud from the calling state to let this be different for
       each call without redoing the HO table??  Maybe for version 2. XXX */
/* point at first param */
/* top of stack is our configtbl[idx] */
/* lots of options to expand this with other types XXX */
/* try next entry */
/* default to "no" */
/* The only way this can happen is if someone is messing with us,
         * and I'm not sure even that is possible. */
/* XXX This is fragile: C11 says casting func* to void*
         * doesn't have to work, but POSIX says it does.  So it
         * _should_ work everywhere but all we can do without messing
         * around inside Lua is to try to keep the compiler quiet. */
export function nhlL_openlibs(L, lflags)
{
    L = C.cast({"pointer":"lua_State"},L);
    lflags = C.cast("u32",lflags);
    /* translate lflags from user-friendly to internal */
    if (C.truth(C.binary("u32","&",C.cast("u32",134217728),lflags)))
    {
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",8192))));
    }
    /* only for debugging the sandbox integration */
    if (C.truth(C.binary("u32","&",C.cast("u32",65535),lflags)))
    {
        (lflags = C.cast("u32",C.cast("u32",C.unary("i32","-",1))));
    }
    else
    if (C.truth(C.binary("u32","&",2147483648,lflags)))
    {
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",128))));
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",4))));
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",2))));
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",1))));
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",8))));
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",16))));
    }
    else
    if (C.truth(1073741824))
    {
        (lflags = C.cast("u32",C.binary("u32","|",lflags,C.cast("u32",128))));
    }
    /*  Handling I/O is complex, so it's not available yet.  I'll
finish it if and when we need it. (keni)
    - hooked open; array of tuples of (r/w/rw/a/etc, directory pat, file pat)

{"close", io_close},    but with no args closes default output, so needs hook
{"flush", io_flush},
{"lines", io_lines},    hook due to filename
{"open", io_open},  hooked version:
    only safe if mode not present or == "r"
        or WRITEIO
    only safe if path has no slashes
        XXX probably need to be: matches port-specific list of paths
        WRITEIO needs a different list
    dlb integration?
    may need to #define l_getc (but that wouldn't hook core)
        may need to #define fopen/fread/fwrite/feof/ftell (etc?)
        ugh: lauxlib.c uses getc() below luaL_loadfilex
            override in lua.h?
        ugh: liolib.c uses getc() below g_read->test_eof
            override in lua.h?
{"read", io_read},
{"type", io_type},
{"input", io_input},    safe with a complex hook, but may be needed for read?
WRITEIO:    needs changes to hooked open?
{"output", io_output},  do we want to allow access to default output?
  {"write", io_write},
UNSAFEIO:
  {"popen", io_popen},
  {"tmpfile", io_tmpfile},
*/
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",3968))))
    {
        let baselib;
        /* load the entire library ... */
        C.api(487,L,C.literal("_G"),C.functionPointer("luaopen_base"),1);
        (baselib = C.cast("i32",C.api(488,L)));
        /* ... and remove anything unsupported or not requested */
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",128))))))),baselib,C.data("ct_base_base"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",256))))))),baselib,C.data("ct_base_error"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",512))))))),baselib,C.data("ct_base_meta"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",1024))))))),baselib,C.data("ct_base_iffy"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",2048))))))),baselib,C.data("ct_base_unsafe"));
        C.api(489,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",4))))
    {
        C.api(490,L,C.literal("coroutine"),C.functionPointer("luaopen_coroutine"),1);
        C.api(491,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",2))))
    {
        C.api(492,L,C.literal("table"),C.functionPointer("luaopen_table"),1);
        C.api(493,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",49152))))
    {
        let oslib;
        C.api(494,L,C.literal("os"),C.functionPointer("luaopen_os"),1);
        (oslib = C.cast("i32",C.api(495,L)));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",16384))))))),oslib,C.data("ct_os_time"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",32768))))))),oslib,C.data("ct_os_files"));
        C.api(496,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",1))))
    {
        C.api(497,L,C.literal("string"),C.functionPointer("luaopen_string"),1);
        C.api(498,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",8))))
    {
        C.api(499,L,C.literal("math"),C.functionPointer("luaopen_math"),1);
        /* Seed Lua's math.random (xoshiro256**) from the game seed so
         * that math.random() calls in level scripts produce deterministic,
         * reproducible results. */
        {
            let env_seed = C.api(500,C.literal("NETHACK_SEED"));
            if (C.truth(env_seed))
            {
                let seed = C.api(501,env_seed,C.cast({"pointer":"char *"},(C.cast({"pointer":"void"},0))),10);
                C.api(502,L,C.unary("i32","-",1),C.literal("randomseed"));
                C.api(503,L,C.cast("i64",seed));
                C.api(504,L,(1),(0),C.cast("i64",0),C.cast({"pointer":"function"},(C.cast({"pointer":"void"},0))));
            }
        }
        C.api(505,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",16))))
    {
        C.api(506,L,C.literal("utf8"),C.functionPointer("luaopen_utf8"),1);
        C.api(507,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
    if (C.truth(C.binary("u32","&",lflags,C.cast("u32",12288))))
    {
        let dblib;
        C.api(508,L,C.literal("debug"),C.functionPointer("luaopen_debug"),1);
        (dblib = C.cast("i32",C.api(509,L)));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",4096))))))),dblib,C.data("ct_debug_debug"));
        C.callLocal(nhl_clearfromtable,L,Number(!C.truth(Number(!C.truth((C.binary("u32","&",lflags,C.cast("u32",8192))))))),dblib,C.data("ct_debug_safe"));
        C.api(510,L,C.binary("i32","-",C.unary("i32","-",(1)),1));
    }
}


export function nhl_alloc(ud, ptr, osize, nsize)
{
    ud = C.cast({"pointer":"void"},ud);
    ptr = C.cast({"pointer":"void"},ptr);
    osize = C.cast("u64",osize);
    nsize = C.cast("u64",nsize);
    var nud = C.cast({"pointer":"nhl_user_data"},ud);
    if (C.truth(Number(nsize === C.cast("u64",0))))
    {
        if (C.truth(Number(ptr !== (C.cast({"pointer":"void"},0)))))
        {
            C.api(511,ptr);
        }
        return (C.cast({"pointer":"void"},0));
    }
    /* Check nud->L because it will be NULL during state init. */
    if (C.truth(Number(C.truth(Number(C.truth(nud) && C.truth(C.read(C.field(nud,"nhl_user_data","L"),{"pointer":"lua_State"})))) && C.truth(C.read(C.field(nud,"nhl_user_data","memlimit"),"u32")))))
    {
        /* this state is size limited */
        if (C.truth(Number(C.callLocal(nhl_getmeminuse,C.read(C.field(nud,"nhl_user_data","L"),{"pointer":"lua_State"})) > C.read(C.field(nud,"nhl_user_data","memlimit"),"u32"))))
        return (C.cast({"pointer":"void"},0));
    }
    return C.cast({"pointer":"void"},C.api(512,C.cast({"pointer":"long"},ptr),C.cast("u32",nsize)));
}


export function nhl_panic(L)
{
    L = C.cast({"pointer":"lua_State"},L);
    var msg = C.api(513,L,(C.unary("i32","-",1)),C.cast({"pointer":"size_t"},(C.cast({"pointer":"void"},0))));
    if (C.truth(Number(msg === C.cast({"pointer":"char"},(C.cast({"pointer":"void"},0))))))
    (msg = C.cast({"pointer":"char"},C.literal("error object is not a string")));
    C.api(514,C.literal("unprotected error in call to Lua API (%s)\n"),msg);
    /*NOTREACHED*/
    return 0;
    /* return to Lua to abort */
}


/* called when lua issues a warning message; the text of the message
   is passed to us in pieces across multiple function calls */
export function nhl_warn(userdata, msg_fragment, to_be_continued)
{
    userdata = C.cast({"pointer":"void"},userdata);
    msg_fragment = C.cast({"pointer":"char"},msg_fragment);
    to_be_continued = C.cast("i32",to_be_continued);
    /* 0: last fragment; 1: more to come */
    var fraglen;
    var buflen = C.api(515,C.field(C.global("gl"),"instance_globals_l","lua_warnbuf"));
    if (C.truth(Number(C.truth(msg_fragment) && C.truth(Number(buflen < C.binary("u64","-",256n,C.cast("u64",1)))))))
    {
        (fraglen = C.cast("u64",C.api(516,msg_fragment)));
        if (C.truth(Number(C.binary("u64","+",buflen,fraglen) > C.binary("u64","-",256n,C.cast("u64",1)))))
        (fraglen = C.cast("u64",C.binary("u64","-",C.binary("u64","-",256n,C.cast("u64",1)),buflen)));
        C.api(517,C.field(C.global("gl"),"instance_globals_l","lua_warnbuf"),msg_fragment,fraglen);
    }
    if (C.truth(Number(!C.truth(to_be_continued))))
    {
        C.api(518,C.literal("[lua]"),C.field(C.global("gl"),"instance_globals_l","lua_warnbuf"));
        C.write(C.offset(C.field(C.global("gl"),"instance_globals_l","lua_warnbuf"),0,1),"i8",C.cast("i8",0));
    }
}


export function nhl_hookfn(L, ar)
{
    L = C.cast({"pointer":"lua_State"},L);
    ar = C.cast({"pointer":"lua_Debug"},ar);
    var nud = C.local(8);
    C.api(519,L,C.cast({"pointer":"void *"},nud));
    if (C.truth(Number(C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","steps"),"u32") <= C.cast("u32",1000))))
    C.longjmp(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","jb"),1);
    C.write(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","steps"),"u32",C.binary("u32","-",C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","steps"),"u32"),C.cast("u32",1000)));
    C.post(()=>C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","statctr"),"u32"),()=>C.write(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","statctr"),"u32",C.binary("u32","+",C.read(C.field(C.read(nud,{"pointer":"nhl_user_data"}),"nhl_user_data","statctr"),"u32"),1)));
}


export function nhlL_newstate(sbi, name)
{
    sbi = C.cast({"pointer":"nhl_sandbox_info"},sbi);
    name = C.cast({"pointer":"char"},name);
    var nud = C.cast({"pointer":"nhl_user_data"},0);
    if (C.truth(Number(C.truth(Number(C.truth(C.read(C.field(sbi,"nhl_sandbox_info","memlimit"),"u32")) || C.truth(C.read(C.field(sbi,"nhl_sandbox_info","steps"),"u32")))) || C.truth(C.read(C.field(sbi,"nhl_sandbox_info","perpcall"),"u32")))))
    {
        (nud = C.cast({"pointer":"nhl_user_data"},C.cast({"pointer":"nhl_user_data"},C.callLocal(nhl_alloc,(C.cast({"pointer":"void"},0)),(C.cast({"pointer":"void"},0)),C.cast("u64",0),232n))));
        if (C.truth(Number(!C.truth(nud))))
        return C.cast({"pointer":"lua_State"},0);
        C.write(C.field(nud,"nhl_user_data","L"),{"pointer":"lua_State"},C.cast({"pointer":"lua_State"},(C.cast({"pointer":"void"},0))));
        C.write(C.field(nud,"nhl_user_data","memlimit"),"u32",C.read(C.field(sbi,"nhl_sandbox_info","memlimit"),"u32"));
        C.write(C.field(nud,"nhl_user_data","perpcall"),"u32",C.cast("u32",0));
        /* set up below, if needed */
        C.write(C.field(nud,"nhl_user_data","steps"),"u32",C.cast("u32",0));
        C.write(C.field(nud,"nhl_user_data","osteps"),"u32",C.cast("u32",0));
        C.write(C.field(nud,"nhl_user_data","flags"),"u32",C.read(C.field(sbi,"nhl_sandbox_info","flags"),"u32"));
        /* save reporting flags */
        C.write(C.field(nud,"nhl_user_data","statctr"),"u32",C.cast("u32",0));
        if (C.truth(name))
        {
            C.write(C.field(nud,"nhl_user_data","name"),{"pointer":"char"},name);
        }
        C.write(C.field(nud,"nhl_user_data","sid"),"i32",C.write(C.field(C.global("gl"),"instance_globals_l","lua_sid"),"i32",C.binary("i32","+",C.read(C.field(C.global("gl"),"instance_globals_l","lua_sid"),"i32"),1)));
    }
    var L = C.api(520,C.functionPointer("nhl_alloc"),C.cast({"pointer":"void"},nud));
    if (C.truth(Number(!C.truth(L))))
    C.api(521,C.literal("NULL lua_newstate"));
    if (C.truth(nud))
    C.write(C.field(nud,"nhl_user_data","L"),{"pointer":"lua_State"},L);
    C.api(522,L,C.functionPointer("nhl_panic"));
    C.api(523,L,C.functionPointer("nhl_warn"),C.cast({"pointer":"void"},L));
    if (C.truth(Number(C.truth(nud) && C.truth((Number(C.truth(C.read(C.field(sbi,"nhl_sandbox_info","steps"),"u32")) || C.truth(C.read(C.field(sbi,"nhl_sandbox_info","perpcall"),"u32"))))))))
    {
        if (C.truth(Number(C.truth(C.read(C.field(sbi,"nhl_sandbox_info","steps"),"u32")) && C.truth(C.read(C.field(sbi,"nhl_sandbox_info","perpcall"),"u32")))))
        C.api(524,C.literal("steps and perpcall both non-zero"));
        if (C.truth(C.read(C.field(sbi,"nhl_sandbox_info","perpcall"),"u32")))
        {
            C.write(C.field(nud,"nhl_user_data","perpcall"),"u32",C.read(C.field(sbi,"nhl_sandbox_info","perpcall"),"u32"));
        }
        else
        {
            C.write(C.field(nud,"nhl_user_data","steps"),"u32",C.read(C.field(sbi,"nhl_sandbox_info","steps"),"u32"));
            C.write(C.field(nud,"nhl_user_data","osteps"),"u32",C.read(C.field(sbi,"nhl_sandbox_info","steps"),"u32"));
        }
        C.api(525,L,C.functionPointer("nhl_hookfn"),(C.binary("i32","<<",1,3)),1000);
    }
    return L;
}


/* !SFCTOOL */
/*
(See end of comment for conclusion.)
to make packages safe, we need something like:
    if setuid/setgid (but does NH drop privs before we can check? TBD)
        unsetenv LUA_CPATH, LUA_CPATH_5_4 (and this needs to change with
          version) maybe more
    luaopen_package calls getenv
        unsetenv(LUA_PATH_VAR)
        unsetenv(LUA_CPATH_VAR)
        unsetenv(LUA_PATH_VAR LUA_VERSUFFIX)
        unsetenv(LUA_CPATH_VAR LUA_VERSUFFIX)
                    package.config
                    oackage[fieldname] = path
            NB: LUA_PATH_DEFAULT and LUA_CPATH_DEFAULT must be safe
                or we must setenv LUA_PATH_VAR and LUA_CPATH_VAR to something
                safe
            or we could just clean out the searchers table?
                package.searchers[preload,Lua,C,Croot]
also, can setting package.path to something odd get Lua to load files
 it shouldn't? (see docs package.searchers)
set (and disallow changing) package.cpath (etc?)
loadlib.c:
    lsys_load -> dlopen     Kill with undef LUA_USE_DLOPEN LUA_DL_DLL
    searchpath -> readable -> fopen
        <- ll_searchpath
        <- findfile <- {searchers C, Croot, Lua}
Probably the best thing to do is replace G.require with our own function
that does whatever it is we need and completely ignore the package library.
*/
/*
TODO:
docs
unfinished functionality & design
commit, cleanup, commit with SHA1 of full code version
BUT how do we compact the current history?
    new branch, then compress there
XXX
*/
/*nhlua.c*/


// Configured source data and actual compiler-derived typed-memory metadata.
export const nhluaSchema = {"source":"cf4403c39d709de3a0aaf8c1797bbead24d88db4b927e798e2237285722a9c24","records":{"anonymous_342_14":{"size":2,"alignment":1,"kind":"struct","fields":[{"name":"ch","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"typ","type":"i8","offset":1,"bitOffset":null,"bits":null}],"nativeName":"struct (unnamed at nhlua.c:342:14)"},"luaL_Reg":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"func","type":{"pointer":"function"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct luaL_Reg"},"anonymous_2057_14":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"value","type":"i64","offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct (unnamed at nhlua.c:2057:14)"},"e":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"when","type":"u32","offset":0,"bitOffset":null,"bits":null},{"name":"fnname","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct e"},"anonymous_2120_18":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"ptr","type":{"pointer":"void"},"offset":8,"bitOffset":null,"bits":null},{"name":"type","type":"i32","offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct (unnamed at nhlua.c:2120:18)"},"nhl_sandbox_info":{"size":16,"alignment":4,"kind":"struct","fields":[{"name":"flags","type":"u32","offset":0,"bitOffset":null,"bits":null},{"name":"memlimit","type":"u32","offset":4,"bitOffset":null,"bits":null},{"name":"steps","type":"u32","offset":8,"bitOffset":null,"bits":null},{"name":"perpcall","type":"u32","offset":12,"bitOffset":null,"bits":null}],"nativeName":"struct nhl_sandbox_info"},"instance_globals_l":{"size":696,"alignment":8,"kind":"struct","fields":[{"name":"last_command_count","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"locknum","type":"i32","offset":8,"bitOffset":null,"bits":null},{"name":"lockptr","type":"i32","offset":12,"bitOffset":null,"bits":null},{"name":"lock","type":{"array":[46],"of":"i8"},"offset":16,"bitOffset":null,"bits":null},{"name":"lastinvnr","type":"i32","offset":64,"bitOffset":null,"bits":null},{"name":"light_base","type":{"pointer":"light_source"},"offset":72,"bitOffset":null,"bits":null},{"name":"luathemes","type":{"array":[16],"of":{"pointer":"void"}},"offset":80,"bitOffset":null,"bits":null},{"name":"last_hider","type":"u32","offset":208,"bitOffset":null,"bits":null},{"name":"luacore","type":{"pointer":"void"},"offset":216,"bitOffset":null,"bits":null},{"name":"lua_warnbuf","type":{"array":[256],"of":"i8"},"offset":224,"bitOffset":null,"bits":null},{"name":"loglua","type":"i32","offset":480,"bitOffset":null,"bits":null},{"name":"lua_sid","type":"i32","offset":484,"bitOffset":null,"bits":null},{"name":"loot_reset_justpicked","type":"i8","offset":488,"bitOffset":null,"bits":null},{"name":"looseball","type":{"pointer":"struct obj"},"offset":496,"bitOffset":null,"bits":null},{"name":"loosechain","type":{"pointer":"struct obj"},"offset":504,"bitOffset":null,"bits":null},{"name":"lev_message","type":{"pointer":"char"},"offset":512,"bitOffset":null,"bits":null},{"name":"lregions","type":{"pointer":"lev_region"},"offset":520,"bitOffset":null,"bits":null},{"name":"launchplace","type":{"record":"launchplace"},"offset":528,"bitOffset":null,"bits":null},{"name":"last_winchoice","type":{"pointer":"struct win_choices"},"offset":544,"bitOffset":null,"bits":null},{"name":"lua_ver","type":{"array":[20],"of":"i8"},"offset":552,"bitOffset":null,"bits":null},{"name":"lua_copyright","type":{"array":[120],"of":"i8"},"offset":572,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":692,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_l"},"launchplace":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"obj","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"x","type":"i16","offset":8,"bitOffset":null,"bits":null},{"name":"y","type":"i16","offset":10,"bitOffset":null,"bits":null}],"nativeName":"struct launchplace"},"lua_Debug":{"size":136,"alignment":8,"kind":"struct","fields":[{"name":"event","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"name","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null},{"name":"namewhat","type":{"pointer":"char"},"offset":16,"bitOffset":null,"bits":null},{"name":"what","type":{"pointer":"char"},"offset":24,"bitOffset":null,"bits":null},{"name":"source","type":{"pointer":"char"},"offset":32,"bitOffset":null,"bits":null},{"name":"srclen","type":"u64","offset":40,"bitOffset":null,"bits":null},{"name":"currentline","type":"i32","offset":48,"bitOffset":null,"bits":null},{"name":"linedefined","type":"i32","offset":52,"bitOffset":null,"bits":null},{"name":"lastlinedefined","type":"i32","offset":56,"bitOffset":null,"bits":null},{"name":"nups","type":"u8","offset":60,"bitOffset":null,"bits":null},{"name":"nparams","type":"u8","offset":61,"bitOffset":null,"bits":null},{"name":"isvararg","type":"i8","offset":62,"bitOffset":null,"bits":null},{"name":"istailcall","type":"i8","offset":63,"bitOffset":null,"bits":null},{"name":"ftransfer","type":"u16","offset":64,"bitOffset":null,"bits":null},{"name":"ntransfer","type":"u16","offset":66,"bitOffset":null,"bits":null},{"name":"short_src","type":{"array":[60],"of":"i8"},"offset":68,"bitOffset":null,"bits":null},{"name":"i_ci","type":{"pointer":"struct CallInfo"},"offset":128,"bitOffset":null,"bits":null}],"nativeName":"struct lua_Debug"},"trap":{"size":32,"alignment":8,"kind":"struct","fields":[{"name":"ntrap","type":{"pointer":"struct trap"},"offset":0,"bitOffset":null,"bits":null},{"name":"tx","type":"i16","offset":8,"bitOffset":null,"bits":null},{"name":"ty","type":"i16","offset":10,"bitOffset":null,"bits":null},{"name":"dst","type":{"record":"d_level"},"offset":12,"bitOffset":null,"bits":null},{"name":"launch","type":{"record":"nhcoord"},"offset":16,"bitOffset":null,"bits":null},{"name":"ttyp","type":"u32","offset":20,"bitOffset":0,"bits":5},{"name":"tseen","type":"u32","offset":20,"bitOffset":5,"bits":1},{"name":"once","type":"u32","offset":20,"bitOffset":6,"bits":1},{"name":"madeby_u","type":"u32","offset":20,"bitOffset":7,"bits":1},{"name":"vl","type":{"record":"vlaunchinfo"},"offset":22,"bitOffset":null,"bits":null}],"nativeName":"struct trap"},"d_level":{"size":4,"alignment":2,"kind":"struct","fields":[{"name":"dnum","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"dlevel","type":"i16","offset":2,"bitOffset":null,"bits":null}],"nativeName":"struct d_level"},"nhcoord":{"size":4,"alignment":2,"kind":"struct","fields":[{"name":"x","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"y","type":"i16","offset":2,"bitOffset":null,"bits":null}],"nativeName":"struct nhcoord"},"vlaunchinfo":{"size":4,"alignment":2,"kind":"union","fields":[{"name":"v_launch_otyp","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"v_launch2","type":{"record":"nhcoord"},"offset":0,"bitOffset":null,"bits":null},{"name":"v_conjoined","type":"u8","offset":0,"bitOffset":null,"bits":null},{"name":"v_tnote","type":"i16","offset":0,"bitOffset":null,"bits":null}],"nativeName":"union vlaunchinfo"},"rm":{"size":8,"alignment":4,"kind":"struct","fields":[{"name":"glyph","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"typ","type":"i8","offset":4,"bitOffset":null,"bits":null},{"name":"seenv","type":"u8","offset":5,"bitOffset":null,"bits":null},{"name":"flags","type":"u32","offset":6,"bitOffset":0,"bits":5},{"name":"horizontal","type":"u32","offset":6,"bitOffset":5,"bits":1},{"name":"lit","type":"u32","offset":6,"bitOffset":6,"bits":1},{"name":"waslit","type":"u32","offset":6,"bitOffset":7,"bits":1},{"name":"roomno","type":"u32","offset":7,"bitOffset":0,"bits":6},{"name":"edge","type":"u32","offset":7,"bitOffset":6,"bits":1},{"name":"candig","type":"u32","offset":7,"bitOffset":7,"bits":1}],"nativeName":"struct rm"},"anonymous_473_9":{"size":40376,"alignment":8,"kind":"struct","fields":[{"name":"locations","type":{"array":[80,21],"of":{"record":"rm"}},"offset":0,"bitOffset":null,"bits":null},{"name":"objects","type":{"array":[80,21],"of":{"pointer":"struct obj"}},"offset":13440,"bitOffset":null,"bits":null},{"name":"monsters","type":{"array":[80,21],"of":{"pointer":"struct monst"}},"offset":26880,"bitOffset":null,"bits":null},{"name":"objlist","type":{"pointer":"struct obj"},"offset":40320,"bitOffset":null,"bits":null},{"name":"buriedobjlist","type":{"pointer":"struct obj"},"offset":40328,"bitOffset":null,"bits":null},{"name":"monlist","type":{"pointer":"struct monst"},"offset":40336,"bitOffset":null,"bits":null},{"name":"damagelist","type":{"pointer":"struct damage"},"offset":40344,"bitOffset":null,"bits":null},{"name":"bonesinfo","type":{"pointer":"struct cemetery"},"offset":40352,"bitOffset":null,"bits":null},{"name":"flags","type":{"record":"levelflags"},"offset":40360,"bitOffset":null,"bits":null}],"nativeName":"struct (unnamed at ../include/rm.h:473:9)"},"levelflags":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"nfountains","type":"u8","offset":0,"bitOffset":null,"bits":null},{"name":"nsinks","type":"u8","offset":1,"bitOffset":null,"bits":null},{"name":"has_shop","type":"u32","offset":2,"bitOffset":0,"bits":1},{"name":"has_vault","type":"u32","offset":2,"bitOffset":1,"bits":1},{"name":"has_zoo","type":"u32","offset":2,"bitOffset":2,"bits":1},{"name":"has_court","type":"u32","offset":2,"bitOffset":3,"bits":1},{"name":"has_morgue","type":"u32","offset":2,"bitOffset":4,"bits":1},{"name":"has_beehive","type":"u32","offset":2,"bitOffset":5,"bits":1},{"name":"has_barracks","type":"u32","offset":2,"bitOffset":6,"bits":1},{"name":"has_temple","type":"u32","offset":2,"bitOffset":7,"bits":1},{"name":"has_swamp","type":"u32","offset":3,"bitOffset":0,"bits":1},{"name":"noteleport","type":"u32","offset":3,"bitOffset":1,"bits":1},{"name":"hardfloor","type":"u32","offset":3,"bitOffset":2,"bits":1},{"name":"nommap","type":"u32","offset":3,"bitOffset":3,"bits":1},{"name":"hero_memory","type":"u32","offset":3,"bitOffset":4,"bits":1},{"name":"shortsighted","type":"u32","offset":3,"bitOffset":5,"bits":1},{"name":"graveyard","type":"u32","offset":3,"bitOffset":6,"bits":1},{"name":"sokoban_rules","type":"u32","offset":3,"bitOffset":7,"bits":1},{"name":"is_maze_lev","type":"u32","offset":4,"bitOffset":0,"bits":1},{"name":"is_cavernous_lev","type":"u32","offset":4,"bitOffset":1,"bits":1},{"name":"arboreal","type":"u32","offset":4,"bitOffset":2,"bits":1},{"name":"has_town","type":"u32","offset":4,"bitOffset":3,"bits":1},{"name":"wizard_bones","type":"u32","offset":4,"bitOffset":4,"bits":1},{"name":"corrmaze","type":"u32","offset":4,"bitOffset":5,"bits":1},{"name":"rndmongen","type":"u32","offset":4,"bitOffset":6,"bits":1},{"name":"deathdrops","type":"u32","offset":4,"bitOffset":7,"bits":1},{"name":"noautosearch","type":"u32","offset":5,"bitOffset":0,"bits":1},{"name":"fumaroles","type":"u32","offset":5,"bitOffset":1,"bits":1},{"name":"stormy","type":"u32","offset":5,"bitOffset":2,"bits":1},{"name":"temperature","type":"i8","offset":6,"bitOffset":null,"bits":null},{"name":"stasis_until","type":"i64","offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct levelflags"},"instance_globals_saved_l":{"size":42568,"alignment":8,"kind":"struct","fields":[{"name":"lastseentyp","type":{"array":[80,21],"of":"i8"},"offset":0,"bitOffset":null,"bits":null},{"name":"level","type":{"record":"anonymous_473_9"},"offset":1680,"bitOffset":null,"bits":null},{"name":"level_info","type":{"array":[512],"of":{"record":"linfo"}},"offset":42056,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_saved_l"},"linfo":{"size":1,"alignment":1,"kind":"struct","fields":[{"name":"flags","type":"u8","offset":0,"bitOffset":null,"bits":null}],"nativeName":"struct linfo"},"window_procs":{"size":416,"alignment":8,"kind":"struct","fields":[{"name":"name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"wp_id","type":"u32","offset":8,"bitOffset":null,"bits":null},{"name":"wincap","type":"u64","offset":16,"bitOffset":null,"bits":null},{"name":"wincap2","type":"u64","offset":24,"bitOffset":null,"bits":null},{"name":"has_color","type":{"array":[16],"of":"i8"},"offset":32,"bitOffset":null,"bits":null},{"name":"win_init_nhwindows","type":{"pointer":"function"},"offset":48,"bitOffset":null,"bits":null},{"name":"win_player_selection","type":{"pointer":"function"},"offset":56,"bitOffset":null,"bits":null},{"name":"win_askname","type":{"pointer":"function"},"offset":64,"bitOffset":null,"bits":null},{"name":"win_get_nh_event","type":{"pointer":"function"},"offset":72,"bitOffset":null,"bits":null},{"name":"win_exit_nhwindows","type":{"pointer":"function"},"offset":80,"bitOffset":null,"bits":null},{"name":"win_suspend_nhwindows","type":{"pointer":"function"},"offset":88,"bitOffset":null,"bits":null},{"name":"win_resume_nhwindows","type":{"pointer":"function"},"offset":96,"bitOffset":null,"bits":null},{"name":"win_create_nhwindow","type":{"pointer":"function"},"offset":104,"bitOffset":null,"bits":null},{"name":"win_clear_nhwindow","type":{"pointer":"function"},"offset":112,"bitOffset":null,"bits":null},{"name":"win_display_nhwindow","type":{"pointer":"function"},"offset":120,"bitOffset":null,"bits":null},{"name":"win_destroy_nhwindow","type":{"pointer":"function"},"offset":128,"bitOffset":null,"bits":null},{"name":"win_curs","type":{"pointer":"function"},"offset":136,"bitOffset":null,"bits":null},{"name":"win_putstr","type":{"pointer":"function"},"offset":144,"bitOffset":null,"bits":null},{"name":"win_putmixed","type":{"pointer":"function"},"offset":152,"bitOffset":null,"bits":null},{"name":"win_display_file","type":{"pointer":"function"},"offset":160,"bitOffset":null,"bits":null},{"name":"win_start_menu","type":{"pointer":"function"},"offset":168,"bitOffset":null,"bits":null},{"name":"win_add_menu","type":{"pointer":"function"},"offset":176,"bitOffset":null,"bits":null},{"name":"win_end_menu","type":{"pointer":"function"},"offset":184,"bitOffset":null,"bits":null},{"name":"win_select_menu","type":{"pointer":"function"},"offset":192,"bitOffset":null,"bits":null},{"name":"win_message_menu","type":{"pointer":"function"},"offset":200,"bitOffset":null,"bits":null},{"name":"win_mark_synch","type":{"pointer":"function"},"offset":208,"bitOffset":null,"bits":null},{"name":"win_wait_synch","type":{"pointer":"function"},"offset":216,"bitOffset":null,"bits":null},{"name":"win_cliparound","type":{"pointer":"function"},"offset":224,"bitOffset":null,"bits":null},{"name":"win_print_glyph","type":{"pointer":"function"},"offset":232,"bitOffset":null,"bits":null},{"name":"win_raw_print","type":{"pointer":"function"},"offset":240,"bitOffset":null,"bits":null},{"name":"win_raw_print_bold","type":{"pointer":"function"},"offset":248,"bitOffset":null,"bits":null},{"name":"win_nhgetch","type":{"pointer":"function"},"offset":256,"bitOffset":null,"bits":null},{"name":"win_nh_poskey","type":{"pointer":"function"},"offset":264,"bitOffset":null,"bits":null},{"name":"win_nhbell","type":{"pointer":"function"},"offset":272,"bitOffset":null,"bits":null},{"name":"win_doprev_message","type":{"pointer":"function"},"offset":280,"bitOffset":null,"bits":null},{"name":"win_yn_function","type":{"pointer":"function"},"offset":288,"bitOffset":null,"bits":null},{"name":"win_getlin","type":{"pointer":"function"},"offset":296,"bitOffset":null,"bits":null},{"name":"win_get_ext_cmd","type":{"pointer":"function"},"offset":304,"bitOffset":null,"bits":null},{"name":"win_number_pad","type":{"pointer":"function"},"offset":312,"bitOffset":null,"bits":null},{"name":"win_delay_output","type":{"pointer":"function"},"offset":320,"bitOffset":null,"bits":null},{"name":"win_outrip","type":{"pointer":"function"},"offset":328,"bitOffset":null,"bits":null},{"name":"win_preference_update","type":{"pointer":"function"},"offset":336,"bitOffset":null,"bits":null},{"name":"win_getmsghistory","type":{"pointer":"function"},"offset":344,"bitOffset":null,"bits":null},{"name":"win_putmsghistory","type":{"pointer":"function"},"offset":352,"bitOffset":null,"bits":null},{"name":"win_status_init","type":{"pointer":"function"},"offset":360,"bitOffset":null,"bits":null},{"name":"win_status_finish","type":{"pointer":"function"},"offset":368,"bitOffset":null,"bits":null},{"name":"win_status_enablefield","type":{"pointer":"function"},"offset":376,"bitOffset":null,"bits":null},{"name":"win_status_update","type":{"pointer":"function"},"offset":384,"bitOffset":null,"bits":null},{"name":"win_can_suspend","type":{"pointer":"function"},"offset":392,"bitOffset":null,"bits":null},{"name":"win_update_inventory","type":{"pointer":"function"},"offset":400,"bitOffset":null,"bits":null},{"name":"win_ctrl_nhwindow","type":{"pointer":"function"},"offset":408,"bitOffset":null,"bits":null}],"nativeName":"struct window_procs"},"any":{"size":8,"alignment":8,"kind":"union","fields":[{"name":"a_void","type":{"pointer":"void"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_obj","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_monst","type":{"pointer":"struct monst"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_int","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"a_xint16","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"a_xint8","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"a_char","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"a_schar","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"a_uchar","type":"u8","offset":0,"bitOffset":null,"bits":null},{"name":"a_uint","type":"u32","offset":0,"bitOffset":null,"bits":null},{"name":"a_long","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"a_ulong","type":"u64","offset":0,"bitOffset":null,"bits":null},{"name":"a_coordxy","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"a_iptr","type":{"pointer":"int"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_xint16ptr","type":{"pointer":"xint16"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_xint8ptr","type":{"pointer":"xint8"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_lptr","type":{"pointer":"long"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_coordxyptr","type":{"pointer":"coordxy"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_ulptr","type":{"pointer":"unsigned long"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_uptr","type":{"pointer":"unsigned int"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_string","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_nfunc","type":{"pointer":"function"},"offset":0,"bitOffset":null,"bits":null},{"name":"a_mask32","type":"u64","offset":0,"bitOffset":null,"bits":null},{"name":"a_int64","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"a_uint64","type":"u64","offset":0,"bitOffset":null,"bits":null}],"nativeName":"union any"},"const_globals":{"size":320,"alignment":8,"kind":"struct","fields":[{"name":"zeroobj","type":{"record":"obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"zeromonst","type":{"record":"monst"},"offset":112,"bitOffset":null,"bits":null},{"name":"zeroany","type":{"record":"any"},"offset":304,"bitOffset":null,"bits":null},{"name":"zeroNhRect","type":{"record":"nhrect"},"offset":312,"bitOffset":null,"bits":null}],"nativeName":"struct const_globals"},"obj":{"size":112,"alignment":8,"kind":"struct","fields":[{"name":"nobj","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"v","type":{"record":"vptrs"},"offset":8,"bitOffset":null,"bits":null},{"name":"cobj","type":{"pointer":"struct obj"},"offset":16,"bitOffset":null,"bits":null},{"name":"o_id","type":"u32","offset":24,"bitOffset":null,"bits":null},{"name":"ox","type":"i16","offset":28,"bitOffset":null,"bits":null},{"name":"oy","type":"i16","offset":30,"bitOffset":null,"bits":null},{"name":"otyp","type":"i16","offset":32,"bitOffset":null,"bits":null},{"name":"owt","type":"u32","offset":36,"bitOffset":null,"bits":null},{"name":"quan","type":"i64","offset":40,"bitOffset":null,"bits":null},{"name":"spe","type":"i8","offset":48,"bitOffset":null,"bits":null},{"name":"oclass","type":"i8","offset":49,"bitOffset":null,"bits":null},{"name":"invlet","type":"i8","offset":50,"bitOffset":null,"bits":null},{"name":"oartifact","type":"i8","offset":51,"bitOffset":null,"bits":null},{"name":"where","type":"i8","offset":52,"bitOffset":null,"bits":null},{"name":"timed","type":"i16","offset":54,"bitOffset":null,"bits":null},{"name":"cursed","type":"u32","offset":56,"bitOffset":0,"bits":1},{"name":"blessed","type":"u32","offset":56,"bitOffset":1,"bits":1},{"name":"unpaid","type":"u32","offset":56,"bitOffset":2,"bits":1},{"name":"no_charge","type":"u32","offset":56,"bitOffset":3,"bits":1},{"name":"recharged","type":"u32","offset":56,"bitOffset":4,"bits":3},{"name":"lamplit","type":"u32","offset":56,"bitOffset":7,"bits":1},{"name":"known","type":"u32","offset":57,"bitOffset":0,"bits":1},{"name":"dknown","type":"u32","offset":57,"bitOffset":1,"bits":1},{"name":"bknown","type":"u32","offset":57,"bitOffset":2,"bits":1},{"name":"rknown","type":"u32","offset":57,"bitOffset":3,"bits":1},{"name":"cknown","type":"u32","offset":57,"bitOffset":4,"bits":1},{"name":"lknown","type":"u32","offset":57,"bitOffset":5,"bits":1},{"name":"tknown","type":"u32","offset":57,"bitOffset":6,"bits":1},{"name":"nomerge","type":"u32","offset":57,"bitOffset":7,"bits":1},{"name":"oeroded","type":"u32","offset":58,"bitOffset":0,"bits":2},{"name":"oeroded2","type":"u32","offset":58,"bitOffset":2,"bits":2},{"name":"oerodeproof","type":"u32","offset":58,"bitOffset":4,"bits":1},{"name":"olocked","type":"u32","offset":58,"bitOffset":5,"bits":1},{"name":"obroken","type":"u32","offset":58,"bitOffset":6,"bits":1},{"name":"otrapped","type":"u32","offset":58,"bitOffset":7,"bits":1},{"name":"globby","type":"u32","offset":59,"bitOffset":0,"bits":1},{"name":"greased","type":"u32","offset":59,"bitOffset":1,"bits":1},{"name":"in_use","type":"u32","offset":59,"bitOffset":2,"bits":1},{"name":"bypass","type":"u32","offset":59,"bitOffset":3,"bits":1},{"name":"pickup_prev","type":"u32","offset":59,"bitOffset":4,"bits":1},{"name":"ghostly","type":"u32","offset":59,"bitOffset":5,"bits":1},{"name":"how_lost","type":"u32","offset":60,"bitOffset":0,"bits":3},{"name":"named_how","type":"u32","offset":60,"bitOffset":3,"bits":1},{"name":"corpsenm","type":"i32","offset":64,"bitOffset":null,"bits":null},{"name":"usecount","type":"i32","offset":68,"bitOffset":null,"bits":null},{"name":"oeaten","type":"u32","offset":72,"bitOffset":null,"bits":null},{"name":"age","type":"i64","offset":80,"bitOffset":null,"bits":null},{"name":"owornmask","type":"i64","offset":88,"bitOffset":null,"bits":null},{"name":"lua_ref_cnt","type":"u32","offset":96,"bitOffset":null,"bits":null},{"name":"omigr_from_dnum","type":"i16","offset":100,"bitOffset":null,"bits":null},{"name":"omigr_from_dlevel","type":"i16","offset":102,"bitOffset":null,"bits":null},{"name":"oextra","type":{"pointer":"struct oextra"},"offset":104,"bitOffset":null,"bits":null}],"nativeName":"struct obj"},"vptrs":{"size":8,"alignment":8,"kind":"union","fields":[{"name":"v_nexthere","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"v_ocontainer","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"v_ocarry","type":{"pointer":"struct monst"},"offset":0,"bitOffset":null,"bits":null}],"nativeName":"union vptrs"},"monst":{"size":192,"alignment":8,"kind":"struct","fields":[{"name":"nmon","type":{"pointer":"struct monst"},"offset":0,"bitOffset":null,"bits":null},{"name":"data","type":{"pointer":"struct permonst"},"offset":8,"bitOffset":null,"bits":null},{"name":"m_id","type":"u32","offset":16,"bitOffset":null,"bits":null},{"name":"mnum","type":"i16","offset":20,"bitOffset":null,"bits":null},{"name":"cham","type":"i16","offset":22,"bitOffset":null,"bits":null},{"name":"movement","type":"i16","offset":24,"bitOffset":null,"bits":null},{"name":"m_lev","type":"u8","offset":26,"bitOffset":null,"bits":null},{"name":"malign","type":"i8","offset":27,"bitOffset":null,"bits":null},{"name":"mx","type":"i16","offset":28,"bitOffset":null,"bits":null},{"name":"my","type":"i16","offset":30,"bitOffset":null,"bits":null},{"name":"mux","type":"i16","offset":32,"bitOffset":null,"bits":null},{"name":"muy","type":"i16","offset":34,"bitOffset":null,"bits":null},{"name":"mtrack","type":{"array":[4],"of":{"record":"nhcoord"}},"offset":36,"bitOffset":null,"bits":null},{"name":"mhp","type":"i32","offset":52,"bitOffset":null,"bits":null},{"name":"mhpmax","type":"i32","offset":56,"bitOffset":null,"bits":null},{"name":"mappearance","type":"u32","offset":60,"bitOffset":null,"bits":null},{"name":"m_ap_type","type":"u8","offset":64,"bitOffset":null,"bits":null},{"name":"mtame","type":"i8","offset":65,"bitOffset":null,"bits":null},{"name":"mintrinsics","type":"u16","offset":66,"bitOffset":null,"bits":null},{"name":"mextrinsics","type":"u16","offset":68,"bitOffset":null,"bits":null},{"name":"seen_resistance","type":"u64","offset":72,"bitOffset":null,"bits":null},{"name":"mspec_used","type":"i32","offset":80,"bitOffset":null,"bits":null},{"name":"female","type":"u32","offset":84,"bitOffset":0,"bits":1},{"name":"minvis","type":"u32","offset":84,"bitOffset":1,"bits":1},{"name":"invis_blkd","type":"u32","offset":84,"bitOffset":2,"bits":1},{"name":"perminvis","type":"u32","offset":84,"bitOffset":3,"bits":1},{"name":"mcan","type":"u32","offset":84,"bitOffset":4,"bits":1},{"name":"mburied","type":"u32","offset":84,"bitOffset":5,"bits":1},{"name":"mundetected","type":"u32","offset":84,"bitOffset":6,"bits":1},{"name":"mcansee","type":"u32","offset":84,"bitOffset":7,"bits":1},{"name":"mspeed","type":"u32","offset":85,"bitOffset":0,"bits":2},{"name":"permspeed","type":"u32","offset":85,"bitOffset":2,"bits":2},{"name":"mrevived","type":"u32","offset":85,"bitOffset":4,"bits":1},{"name":"mcloned","type":"u32","offset":85,"bitOffset":5,"bits":1},{"name":"mavenge","type":"u32","offset":85,"bitOffset":6,"bits":1},{"name":"mflee","type":"u32","offset":85,"bitOffset":7,"bits":1},{"name":"mfleetim","type":"u32","offset":86,"bitOffset":0,"bits":7},{"name":"msleeping","type":"u32","offset":86,"bitOffset":7,"bits":1},{"name":"mblinded","type":"u32","offset":87,"bitOffset":0,"bits":7},{"name":"mstun","type":"u32","offset":87,"bitOffset":7,"bits":1},{"name":"mfrozen","type":"u32","offset":88,"bitOffset":0,"bits":7},{"name":"mcanmove","type":"u32","offset":88,"bitOffset":7,"bits":1},{"name":"mconf","type":"u32","offset":89,"bitOffset":0,"bits":1},{"name":"mpeaceful","type":"u32","offset":89,"bitOffset":1,"bits":1},{"name":"mtrapped","type":"u32","offset":89,"bitOffset":2,"bits":1},{"name":"mleashed","type":"u32","offset":89,"bitOffset":3,"bits":1},{"name":"isshk","type":"u32","offset":89,"bitOffset":4,"bits":1},{"name":"isminion","type":"u32","offset":89,"bitOffset":5,"bits":1},{"name":"isgd","type":"u32","offset":89,"bitOffset":6,"bits":1},{"name":"ispriest","type":"u32","offset":89,"bitOffset":7,"bits":1},{"name":"iswiz","type":"u32","offset":90,"bitOffset":0,"bits":1},{"name":"wormno","type":"u32","offset":90,"bitOffset":1,"bits":5},{"name":"mtemplit","type":"u32","offset":90,"bitOffset":6,"bits":1},{"name":"meverseen","type":"u32","offset":90,"bitOffset":7,"bits":1},{"name":"mspotted","type":"u32","offset":91,"bitOffset":0,"bits":1},{"name":"mwandexp","type":"u32","offset":91,"bitOffset":1,"bits":1},{"name":"mgenmklev","type":"u32","offset":91,"bitOffset":2,"bits":1},{"name":"mstrategy","type":"u64","offset":96,"bitOffset":null,"bits":null},{"name":"mgoal","type":{"record":"nhcoord"},"offset":104,"bitOffset":null,"bits":null},{"name":"mtrapseen","type":"i64","offset":112,"bitOffset":null,"bits":null},{"name":"mlstmv","type":"i64","offset":120,"bitOffset":null,"bits":null},{"name":"mstate","type":"i64","offset":128,"bitOffset":null,"bits":null},{"name":"migflags","type":"i64","offset":136,"bitOffset":null,"bits":null},{"name":"mspare1","type":"i64","offset":144,"bitOffset":null,"bits":null},{"name":"minvent","type":{"pointer":"struct obj"},"offset":152,"bitOffset":null,"bits":null},{"name":"mw","type":{"pointer":"struct obj"},"offset":160,"bitOffset":null,"bits":null},{"name":"misc_worn_check","type":"i64","offset":168,"bitOffset":null,"bits":null},{"name":"weapon_check","type":"i16","offset":176,"bitOffset":null,"bits":null},{"name":"meating","type":"i32","offset":180,"bitOffset":null,"bits":null},{"name":"mextra","type":{"pointer":"struct mextra"},"offset":184,"bitOffset":null,"bits":null}],"nativeName":"struct monst"},"nhrect":{"size":8,"alignment":2,"kind":"struct","fields":[{"name":"lx","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"ly","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"hx","type":"i16","offset":4,"bitOffset":null,"bits":null},{"name":"hy","type":"i16","offset":6,"bitOffset":null,"bits":null}],"nativeName":"struct nhrect"},"mi":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"item","type":{"record":"any"},"offset":0,"bitOffset":null,"bits":null},{"name":"count","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"itemflags","type":"u32","offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct mi"},"mvitals":{"size":4,"alignment":4,"kind":"struct","fields":[{"name":"born","type":"u8","offset":0,"bitOffset":null,"bits":null},{"name":"died","type":"u8","offset":1,"bitOffset":null,"bits":null},{"name":"mvflags","type":"u8","offset":2,"bitOffset":null,"bits":null},{"name":"seen_close","type":"u32","offset":3,"bitOffset":0,"bits":1},{"name":"photographed","type":"u32","offset":3,"bitOffset":1,"bits":1}],"nativeName":"struct mvitals"},"instance_globals_saved_m":{"size":1552,"alignment":8,"kind":"struct","fields":[{"name":"mapseenchn","type":{"pointer":"mapseen"},"offset":0,"bitOffset":null,"bits":null},{"name":"moves","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"mvitals","type":{"array":[383],"of":{"record":"mvitals"}},"offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_saved_m"},"flag":{"size":208,"alignment":8,"kind":"struct","fields":[{"name":"acoustics","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"armorstatus","type":"i8","offset":1,"bitOffset":null,"bits":null},{"name":"autodig","type":"i8","offset":2,"bitOffset":null,"bits":null},{"name":"autoquiver","type":"i8","offset":3,"bitOffset":null,"bits":null},{"name":"autoopen","type":"i8","offset":4,"bitOffset":null,"bits":null},{"name":"beginner","type":"i8","offset":5,"bitOffset":null,"bits":null},{"name":"biff","type":"i8","offset":6,"bitOffset":null,"bits":null},{"name":"bones","type":"i8","offset":7,"bitOffset":null,"bits":null},{"name":"confirm","type":"i8","offset":8,"bitOffset":null,"bits":null},{"name":"dark_room","type":"i8","offset":9,"bitOffset":null,"bits":null},{"name":"debug","type":"i8","offset":10,"bitOffset":null,"bits":null},{"name":"end_own","type":"i8","offset":11,"bitOffset":null,"bits":null},{"name":"explore","type":"i8","offset":12,"bitOffset":null,"bits":null},{"name":"female","type":"i8","offset":13,"bitOffset":null,"bits":null},{"name":"friday13","type":"i8","offset":14,"bitOffset":null,"bits":null},{"name":"goldX","type":"i8","offset":15,"bitOffset":null,"bits":null},{"name":"help","type":"i8","offset":16,"bitOffset":null,"bits":null},{"name":"tips","type":"i8","offset":17,"bitOffset":null,"bits":null},{"name":"tutorial","type":"i8","offset":18,"bitOffset":null,"bits":null},{"name":"ignintr","type":"i8","offset":19,"bitOffset":null,"bits":null},{"name":"implicit_uncursed","type":"i8","offset":20,"bitOffset":null,"bits":null},{"name":"ins_chkpt","type":"i8","offset":21,"bitOffset":null,"bits":null},{"name":"invlet_constant","type":"i8","offset":22,"bitOffset":null,"bits":null},{"name":"legacy","type":"i8","offset":23,"bitOffset":null,"bits":null},{"name":"lit_corridor","type":"i8","offset":24,"bitOffset":null,"bits":null},{"name":"mention_decor","type":"i8","offset":25,"bitOffset":null,"bits":null},{"name":"mention_walls","type":"i8","offset":26,"bitOffset":null,"bits":null},{"name":"nap","type":"i8","offset":27,"bitOffset":null,"bits":null},{"name":"nopick_dropped","type":"i8","offset":28,"bitOffset":null,"bits":null},{"name":"null","type":"i8","offset":29,"bitOffset":null,"bits":null},{"name":"pickup","type":"i8","offset":30,"bitOffset":null,"bits":null},{"name":"pickup_stolen","type":"i8","offset":31,"bitOffset":null,"bits":null},{"name":"pickup_thrown","type":"i8","offset":32,"bitOffset":null,"bits":null},{"name":"pushweapon","type":"i8","offset":33,"bitOffset":null,"bits":null},{"name":"quick_farsight","type":"i8","offset":34,"bitOffset":null,"bits":null},{"name":"rest_on_space","type":"i8","offset":35,"bitOffset":null,"bits":null},{"name":"safe_dog","type":"i8","offset":36,"bitOffset":null,"bits":null},{"name":"safe_wait","type":"i8","offset":37,"bitOffset":null,"bits":null},{"name":"showexp","type":"i8","offset":38,"bitOffset":null,"bits":null},{"name":"showscore","type":"i8","offset":39,"bitOffset":null,"bits":null},{"name":"showvers","type":"i8","offset":40,"bitOffset":null,"bits":null},{"name":"silent","type":"i8","offset":41,"bitOffset":null,"bits":null},{"name":"sortpack","type":"i8","offset":42,"bitOffset":null,"bits":null},{"name":"sparkle","type":"i8","offset":43,"bitOffset":null,"bits":null},{"name":"standout","type":"i8","offset":44,"bitOffset":null,"bits":null},{"name":"terrainstatus","type":"i8","offset":45,"bitOffset":null,"bits":null},{"name":"time","type":"i8","offset":46,"bitOffset":null,"bits":null},{"name":"tombstone","type":"i8","offset":47,"bitOffset":null,"bits":null},{"name":"verbose","type":"i8","offset":48,"bitOffset":null,"bits":null},{"name":"weaponstatus","type":"i8","offset":49,"bitOffset":null,"bits":null},{"name":"end_top","type":"i32","offset":52,"bitOffset":null,"bits":null},{"name":"end_around","type":"i32","offset":56,"bitOffset":null,"bits":null},{"name":"autounlock","type":"u32","offset":60,"bitOffset":null,"bits":null},{"name":"moonphase","type":"u32","offset":64,"bitOffset":null,"bits":null},{"name":"suppress_alert","type":"u64","offset":72,"bitOffset":null,"bits":null},{"name":"paranoia_bits","type":"u32","offset":80,"bitOffset":null,"bits":null},{"name":"versinfo","type":"u32","offset":84,"bitOffset":null,"bits":null},{"name":"pickup_burden","type":"i32","offset":88,"bitOffset":null,"bits":null},{"name":"pile_limit","type":"i32","offset":92,"bitOffset":null,"bits":null},{"name":"discosort","type":"i8","offset":96,"bitOffset":null,"bits":null},{"name":"sortloot","type":"i8","offset":97,"bitOffset":null,"bits":null},{"name":"vanq_sortmode","type":"u8","offset":98,"bitOffset":null,"bits":null},{"name":"inv_order","type":{"array":[18],"of":"i8"},"offset":99,"bitOffset":null,"bits":null},{"name":"pickup_types","type":{"array":[18],"of":"i8"},"offset":117,"bitOffset":null,"bits":null},{"name":"end_disclose","type":{"array":[7],"of":"i8"},"offset":135,"bitOffset":null,"bits":null},{"name":"menu_style","type":"i8","offset":142,"bitOffset":null,"bits":null},{"name":"made_fruit","type":"i8","offset":143,"bitOffset":null,"bits":null},{"name":"initrole","type":"i32","offset":144,"bitOffset":null,"bits":null},{"name":"initrace","type":"i32","offset":148,"bitOffset":null,"bits":null},{"name":"initgend","type":"i32","offset":152,"bitOffset":null,"bits":null},{"name":"initalign","type":"i32","offset":156,"bitOffset":null,"bits":null},{"name":"randomall","type":"i32","offset":160,"bitOffset":null,"bits":null},{"name":"pantheon","type":"i32","offset":164,"bitOffset":null,"bits":null},{"name":"lootabc","type":"i8","offset":168,"bitOffset":null,"bits":null},{"name":"showrace","type":"i8","offset":169,"bitOffset":null,"bits":null},{"name":"travelcmd","type":"i8","offset":170,"bitOffset":null,"bits":null},{"name":"runmode","type":"i32","offset":172,"bitOffset":null,"bits":null},{"name":"reserved1","type":"i32","offset":176,"bitOffset":null,"bits":null},{"name":"reserved2","type":"i32","offset":180,"bitOffset":null,"bits":null},{"name":"reserved3","type":"i32","offset":184,"bitOffset":null,"bits":null},{"name":"reserved4","type":"i32","offset":188,"bitOffset":null,"bits":null},{"name":"reserved5","type":"i32","offset":192,"bitOffset":null,"bits":null},{"name":"reserved6","type":"i32","offset":196,"bitOffset":null,"bits":null},{"name":"reserved7","type":"i32","offset":200,"bitOffset":null,"bits":null},{"name":"reserved8","type":"i32","offset":204,"bitOffset":null,"bits":null}],"nativeName":"struct flag"},"instance_globals_saved_n":{"size":52,"alignment":4,"kind":"struct","fields":[{"name":"n_dgns","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"nhuuid","type":{"array":[37],"of":"i8"},"offset":4,"bitOffset":null,"bits":null},{"name":"nroom","type":"i32","offset":44,"bitOffset":null,"bits":null},{"name":"n_regions","type":"i32","offset":48,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_saved_n"},"dungeon":{"size":92,"alignment":4,"kind":"struct","fields":[{"name":"dname","type":{"array":[24],"of":"i8"},"offset":0,"bitOffset":null,"bits":null},{"name":"proto","type":{"array":[15],"of":"i8"},"offset":24,"bitOffset":null,"bits":null},{"name":"fill_lvl","type":{"array":[15],"of":"i8"},"offset":39,"bitOffset":null,"bits":null},{"name":"themerms","type":{"array":[15],"of":"i8"},"offset":54,"bitOffset":null,"bits":null},{"name":"boneid","type":"i8","offset":69,"bitOffset":null,"bits":null},{"name":"flags","type":{"record":"d_flags"},"offset":72,"bitOffset":null,"bits":null},{"name":"entry_lev","type":"i16","offset":76,"bitOffset":null,"bits":null},{"name":"num_dunlevs","type":"i16","offset":78,"bitOffset":null,"bits":null},{"name":"dunlev_ureached","type":"i16","offset":80,"bitOffset":null,"bits":null},{"name":"ledger_start","type":"i32","offset":84,"bitOffset":null,"bits":null},{"name":"depth_start","type":"i32","offset":88,"bitOffset":null,"bits":null}],"nativeName":"struct dungeon"},"d_flags":{"size":4,"alignment":4,"kind":"struct","fields":[{"name":"town","type":"u32","offset":0,"bitOffset":0,"bits":1},{"name":"hellish","type":"u32","offset":0,"bitOffset":1,"bits":1},{"name":"maze_like","type":"u32","offset":0,"bitOffset":2,"bits":1},{"name":"rogue_like","type":"u32","offset":0,"bitOffset":3,"bits":1},{"name":"align","type":"u32","offset":0,"bitOffset":4,"bits":3},{"name":"unconnected","type":"u32","offset":0,"bitOffset":7,"bits":1}],"nativeName":"struct d_flags"},"instance_globals_saved_d":{"size":2584,"alignment":8,"kind":"struct","fields":[{"name":"dungeons","type":{"array":[16],"of":{"record":"dungeon"}},"offset":0,"bitOffset":null,"bits":null},{"name":"dungeon_topology","type":{"record":"dgn_topology"},"offset":1472,"bitOffset":null,"bits":null},{"name":"dndest","type":{"record":"dest_area"},"offset":1586,"bitOffset":null,"bits":null},{"name":"doors","type":{"pointer":"coord"},"offset":1608,"bitOffset":null,"bits":null},{"name":"doors_alloc","type":"i32","offset":1616,"bitOffset":null,"bits":null},{"name":"disco","type":{"array":[481],"of":"i16"},"offset":1620,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_saved_d"},"dgn_topology":{"size":114,"alignment":2,"kind":"struct","fields":[{"name":"d_oracle_level","type":{"record":"d_level"},"offset":0,"bitOffset":null,"bits":null},{"name":"d_bigroom_level","type":{"record":"d_level"},"offset":4,"bitOffset":null,"bits":null},{"name":"d_rogue_level","type":{"record":"d_level"},"offset":8,"bitOffset":null,"bits":null},{"name":"d_medusa_level","type":{"record":"d_level"},"offset":12,"bitOffset":null,"bits":null},{"name":"d_stronghold_level","type":{"record":"d_level"},"offset":16,"bitOffset":null,"bits":null},{"name":"d_valley_level","type":{"record":"d_level"},"offset":20,"bitOffset":null,"bits":null},{"name":"d_wiz1_level","type":{"record":"d_level"},"offset":24,"bitOffset":null,"bits":null},{"name":"d_wiz2_level","type":{"record":"d_level"},"offset":28,"bitOffset":null,"bits":null},{"name":"d_wiz3_level","type":{"record":"d_level"},"offset":32,"bitOffset":null,"bits":null},{"name":"d_juiblex_level","type":{"record":"d_level"},"offset":36,"bitOffset":null,"bits":null},{"name":"d_orcus_level","type":{"record":"d_level"},"offset":40,"bitOffset":null,"bits":null},{"name":"d_baalzebub_level","type":{"record":"d_level"},"offset":44,"bitOffset":null,"bits":null},{"name":"d_asmodeus_level","type":{"record":"d_level"},"offset":48,"bitOffset":null,"bits":null},{"name":"d_portal_level","type":{"record":"d_level"},"offset":52,"bitOffset":null,"bits":null},{"name":"d_sanctum_level","type":{"record":"d_level"},"offset":56,"bitOffset":null,"bits":null},{"name":"d_earth_level","type":{"record":"d_level"},"offset":60,"bitOffset":null,"bits":null},{"name":"d_water_level","type":{"record":"d_level"},"offset":64,"bitOffset":null,"bits":null},{"name":"d_fire_level","type":{"record":"d_level"},"offset":68,"bitOffset":null,"bits":null},{"name":"d_air_level","type":{"record":"d_level"},"offset":72,"bitOffset":null,"bits":null},{"name":"d_astral_level","type":{"record":"d_level"},"offset":76,"bitOffset":null,"bits":null},{"name":"d_tower_dnum","type":"i16","offset":80,"bitOffset":null,"bits":null},{"name":"d_sokoban_dnum","type":"i16","offset":82,"bitOffset":null,"bits":null},{"name":"d_mines_dnum","type":"i16","offset":84,"bitOffset":null,"bits":null},{"name":"d_quest_dnum","type":"i16","offset":86,"bitOffset":null,"bits":null},{"name":"d_tutorial_dnum","type":"i16","offset":88,"bitOffset":null,"bits":null},{"name":"d_qstart_level","type":{"record":"d_level"},"offset":90,"bitOffset":null,"bits":null},{"name":"d_qlocate_level","type":{"record":"d_level"},"offset":94,"bitOffset":null,"bits":null},{"name":"d_nemesis_level","type":{"record":"d_level"},"offset":98,"bitOffset":null,"bits":null},{"name":"d_knox_level","type":{"record":"d_level"},"offset":102,"bitOffset":null,"bits":null},{"name":"d_mineend_level","type":{"record":"d_level"},"offset":106,"bitOffset":null,"bits":null},{"name":"d_sokoend_level","type":{"record":"d_level"},"offset":110,"bitOffset":null,"bits":null}],"nativeName":"struct dgn_topology"},"dest_area":{"size":16,"alignment":2,"kind":"struct","fields":[{"name":"lx","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"ly","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"hx","type":"i16","offset":4,"bitOffset":null,"bits":null},{"name":"hy","type":"i16","offset":6,"bitOffset":null,"bits":null},{"name":"nlx","type":"i16","offset":8,"bitOffset":null,"bits":null},{"name":"nly","type":"i16","offset":10,"bitOffset":null,"bits":null},{"name":"nhx","type":"i16","offset":12,"bitOffset":null,"bits":null},{"name":"nhy","type":"i16","offset":14,"bitOffset":null,"bits":null}],"nativeName":"struct dest_area"},"permonst":{"size":96,"alignment":8,"kind":"struct","fields":[{"name":"pmnames","type":{"array":[3],"of":{"pointer":"char"}},"offset":0,"bitOffset":null,"bits":null},{"name":"pmidx","type":"u32","offset":24,"bitOffset":null,"bits":null},{"name":"mlet","type":"i8","offset":28,"bitOffset":null,"bits":null},{"name":"mlevel","type":"i8","offset":29,"bitOffset":null,"bits":null},{"name":"mmove","type":"i8","offset":30,"bitOffset":null,"bits":null},{"name":"ac","type":"i8","offset":31,"bitOffset":null,"bits":null},{"name":"mr","type":"i8","offset":32,"bitOffset":null,"bits":null},{"name":"maligntyp","type":"i8","offset":33,"bitOffset":null,"bits":null},{"name":"geno","type":"u16","offset":34,"bitOffset":null,"bits":null},{"name":"mattk","type":{"array":[6],"of":{"record":"attack"}},"offset":36,"bitOffset":null,"bits":null},{"name":"cwt","type":"u32","offset":60,"bitOffset":null,"bits":null},{"name":"cnutrit","type":"u16","offset":64,"bitOffset":null,"bits":null},{"name":"msound","type":"u8","offset":66,"bitOffset":null,"bits":null},{"name":"msize","type":"u8","offset":67,"bitOffset":null,"bits":null},{"name":"mresists","type":"u8","offset":68,"bitOffset":null,"bits":null},{"name":"mconveys","type":"u8","offset":69,"bitOffset":null,"bits":null},{"name":"mflags1","type":"u64","offset":72,"bitOffset":null,"bits":null},{"name":"mflags2","type":"u64","offset":80,"bitOffset":null,"bits":null},{"name":"mflags3","type":"u16","offset":88,"bitOffset":null,"bits":null},{"name":"difficulty","type":"u8","offset":90,"bitOffset":null,"bits":null},{"name":"mcolor","type":"u8","offset":91,"bitOffset":null,"bits":null}],"nativeName":"struct permonst"},"attack":{"size":4,"alignment":1,"kind":"struct","fields":[{"name":"aatyp","type":"u8","offset":0,"bitOffset":null,"bits":null},{"name":"adtyp","type":"u8","offset":1,"bitOffset":null,"bits":null},{"name":"damn","type":"u8","offset":2,"bitOffset":null,"bits":null},{"name":"damd","type":"u8","offset":3,"bitOffset":null,"bits":null}],"nativeName":"struct attack"},"objdescr":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"oc_name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"oc_descr","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct objdescr"},"objclass":{"size":72,"alignment":8,"kind":"struct","fields":[{"name":"oc_name_idx","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"oc_descr_idx","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"oc_uname","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null},{"name":"oc_name_known","type":"u32","offset":16,"bitOffset":0,"bits":1},{"name":"oc_merge","type":"u32","offset":16,"bitOffset":1,"bits":1},{"name":"oc_uses_known","type":"u32","offset":16,"bitOffset":2,"bits":1},{"name":"oc_encountered","type":"u32","offset":16,"bitOffset":3,"bits":1},{"name":"oc_magic","type":"u32","offset":16,"bitOffset":4,"bits":1},{"name":"oc_charged","type":"u32","offset":16,"bitOffset":5,"bits":1},{"name":"oc_unique","type":"u32","offset":16,"bitOffset":6,"bits":1},{"name":"oc_nowish","type":"u32","offset":16,"bitOffset":7,"bits":1},{"name":"oc_big","type":"u32","offset":17,"bitOffset":0,"bits":1},{"name":"oc_tough","type":"u32","offset":17,"bitOffset":1,"bits":1},{"name":"oc_spare1","type":"u32","offset":17,"bitOffset":2,"bits":6},{"name":"oc_dir","type":"u32","offset":18,"bitOffset":0,"bits":3},{"name":"oc_material","type":"u32","offset":18,"bitOffset":3,"bits":5},{"name":"oc_subtyp","type":"i8","offset":19,"bitOffset":null,"bits":null},{"name":"oc_oprop","type":"u8","offset":20,"bitOffset":null,"bits":null},{"name":"oc_class","type":"i8","offset":21,"bitOffset":null,"bits":null},{"name":"oc_delay","type":"i8","offset":22,"bitOffset":null,"bits":null},{"name":"oc_color","type":"u8","offset":23,"bitOffset":null,"bits":null},{"name":"oc_prob","type":"i16","offset":24,"bitOffset":null,"bits":null},{"name":"oc_weight","type":"u32","offset":28,"bitOffset":null,"bits":null},{"name":"oc_cost","type":"i16","offset":32,"bitOffset":null,"bits":null},{"name":"oc_wsdam","type":"i8","offset":34,"bitOffset":null,"bits":null},{"name":"oc_wldam","type":"i8","offset":35,"bitOffset":null,"bits":null},{"name":"oc_oc1","type":"i8","offset":36,"bitOffset":null,"bits":null},{"name":"oc_oc2","type":"i8","offset":37,"bitOffset":null,"bits":null},{"name":"oc_nutrition","type":"u16","offset":38,"bitOffset":null,"bits":null},{"name":"oc_sell_minseen","type":"u64","offset":40,"bitOffset":null,"bits":null},{"name":"oc_sell_maxseen","type":"u64","offset":48,"bitOffset":null,"bits":null},{"name":"oc_buy_minseen","type":"u64","offset":56,"bitOffset":null,"bits":null},{"name":"oc_buy_maxseen","type":"u64","offset":64,"bitOffset":null,"bits":null}],"nativeName":"struct objclass"},"class_sym":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"sym","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"name","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null},{"name":"explain","type":{"pointer":"char"},"offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct class_sym"},"instance_globals_s":{"size":1408,"alignment":8,"kind":"struct","fields":[{"name":"spec_dbon_applies","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"stairs","type":{"pointer":"stairway"},"offset":8,"bitOffset":null,"bits":null},{"name":"smeq","type":{"array":[41],"of":"i32"},"offset":16,"bitOffset":null,"bits":null},{"name":"stoned","type":"i8","offset":180,"bitOffset":null,"bits":null},{"name":"subrooms","type":{"pointer":"struct mkroom"},"offset":184,"bitOffset":null,"bits":null},{"name":"save_dlevel","type":{"record":"d_level"},"offset":192,"bitOffset":null,"bits":null},{"name":"symset","type":{"array":[2],"of":{"record":"symsetentry"}},"offset":200,"bitOffset":null,"bits":null},{"name":"sym_customizations","type":{"array":[3,4],"of":{"record":"symset_customization"}},"offset":280,"bitOffset":null,"bits":null},{"name":"showsyms","type":{"array":[196],"of":"u8"},"offset":664,"bitOffset":null,"bits":null},{"name":"symset_count","type":"i32","offset":860,"bitOffset":null,"bits":null},{"name":"symset_which_set","type":"i32","offset":864,"bitOffset":null,"bits":null},{"name":"SAVEF","type":{"array":[54],"of":"i8"},"offset":868,"bitOffset":null,"bits":null},{"name":"sortlootmode","type":"u32","offset":924,"bitOffset":null,"bits":null},{"name":"skipdrin","type":"i8","offset":928,"bitOffset":null,"bits":null},{"name":"somebody_can_move","type":"i8","offset":929,"bitOffset":null,"bits":null},{"name":"symset_list","type":{"pointer":"struct symsetentry"},"offset":936,"bitOffset":null,"bits":null},{"name":"save_menucolors","type":"i8","offset":944,"bitOffset":null,"bits":null},{"name":"save_colorings","type":{"pointer":"struct menucoloring"},"offset":952,"bitOffset":null,"bits":null},{"name":"simple_options_help","type":"i8","offset":960,"bitOffset":null,"bits":null},{"name":"sellobj_first","type":"i8","offset":961,"bitOffset":null,"bits":null},{"name":"shop_filter","type":"i8","offset":962,"bitOffset":null,"bits":null},{"name":"saved_pline_index","type":"u32","offset":964,"bitOffset":null,"bits":null},{"name":"saved_plines","type":{"array":[50],"of":{"pointer":"char"}},"offset":968,"bitOffset":null,"bits":null},{"name":"sex_change_ok","type":"i32","offset":1368,"bitOffset":null,"bits":null},{"name":"sell_response","type":"i8","offset":1372,"bitOffset":null,"bits":null},{"name":"sell_how","type":"i32","offset":1376,"bitOffset":null,"bits":null},{"name":"spl_sortmode","type":"i32","offset":1380,"bitOffset":null,"bits":null},{"name":"spl_orderindx","type":{"pointer":"int"},"offset":1384,"bitOffset":null,"bits":null},{"name":"stealoid","type":"u32","offset":1392,"bitOffset":null,"bits":null},{"name":"stealmid","type":"u32","offset":1396,"bitOffset":null,"bits":null},{"name":"seethru","type":"i32","offset":1400,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":1404,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_s"},"symsetentry":{"size":40,"alignment":8,"kind":"struct","fields":[{"name":"next","type":{"pointer":"struct symsetentry"},"offset":0,"bitOffset":null,"bits":null},{"name":"name","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null},{"name":"desc","type":{"pointer":"char"},"offset":16,"bitOffset":null,"bits":null},{"name":"idx","type":"i32","offset":24,"bitOffset":null,"bits":null},{"name":"handling","type":"u32","offset":28,"bitOffset":null,"bits":null},{"name":"nocolor","type":"u32","offset":32,"bitOffset":0,"bits":1},{"name":"primary","type":"u32","offset":32,"bitOffset":1,"bits":1},{"name":"rogue","type":"u32","offset":32,"bitOffset":2,"bits":1},{"name":"explicitly","type":"u32","offset":32,"bitOffset":3,"bits":1}],"nativeName":"struct symsetentry"},"symset_customization":{"size":32,"alignment":8,"kind":"struct","fields":[{"name":"customization_name","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"count","type":"i32","offset":8,"bitOffset":null,"bits":null},{"name":"custtype","type":"u32","offset":12,"bitOffset":null,"bits":null},{"name":"details","type":{"pointer":"struct customization_detail"},"offset":16,"bitOffset":null,"bits":null},{"name":"details_end","type":{"pointer":"struct customization_detail"},"offset":24,"bitOffset":null,"bits":null}],"nativeName":"struct symset_customization"},"stairway":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"sx","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"sy","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"tolev","type":{"record":"d_level"},"offset":4,"bitOffset":null,"bits":null},{"name":"up","type":"i8","offset":8,"bitOffset":null,"bits":null},{"name":"isladder","type":"i8","offset":9,"bitOffset":null,"bits":null},{"name":"u_traversed","type":"i8","offset":10,"bitOffset":null,"bits":null},{"name":"next","type":{"pointer":"struct stairway"},"offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct stairway"},"instance_globals_m":{"size":384,"alignment":8,"kind":"struct","fields":[{"name":"mkot_trap_warn_count","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"mrank_sz","type":"i32","offset":4,"bitOffset":null,"bits":null},{"name":"multi","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"multi_reason","type":{"pointer":"char"},"offset":16,"bitOffset":null,"bits":null},{"name":"multireasonbuf","type":{"array":[128],"of":"i8"},"offset":24,"bitOffset":null,"bits":null},{"name":"m_shot","type":{"record":"multishot"},"offset":152,"bitOffset":null,"bits":null},{"name":"mrg_to_wielded","type":"i8","offset":164,"bitOffset":null,"bits":null},{"name":"menu_colorings","type":{"pointer":"struct menucoloring"},"offset":168,"bitOffset":null,"bits":null},{"name":"migrating_objs","type":{"pointer":"struct obj"},"offset":176,"bitOffset":null,"bits":null},{"name":"mydogs","type":{"pointer":"struct monst"},"offset":184,"bitOffset":null,"bits":null},{"name":"migrating_mons","type":{"pointer":"struct monst"},"offset":192,"bitOffset":null,"bits":null},{"name":"maploc","type":{"pointer":"struct rm"},"offset":200,"bitOffset":null,"bits":null},{"name":"mswallower","type":{"pointer":"struct monst"},"offset":208,"bitOffset":null,"bits":null},{"name":"mhitu_dieroll","type":"i32","offset":216,"bitOffset":null,"bits":null},{"name":"made_branch","type":"i8","offset":220,"bitOffset":null,"bits":null},{"name":"min_rx","type":"i16","offset":222,"bitOffset":null,"bits":null},{"name":"max_rx","type":"i16","offset":224,"bitOffset":null,"bits":null},{"name":"min_ry","type":"i16","offset":226,"bitOffset":null,"bits":null},{"name":"max_ry","type":"i16","offset":228,"bitOffset":null,"bits":null},{"name":"mkcorpstat_norevive","type":"i8","offset":230,"bitOffset":null,"bits":null},{"name":"mesg_given","type":"i32","offset":232,"bitOffset":null,"bits":null},{"name":"mtarget","type":{"pointer":"struct monst"},"offset":240,"bitOffset":null,"bits":null},{"name":"marcher","type":{"pointer":"struct monst"},"offset":248,"bitOffset":null,"bits":null},{"name":"m_using","type":"i8","offset":256,"bitOffset":null,"bits":null},{"name":"m","type":{"record":"musable"},"offset":264,"bitOffset":null,"bits":null},{"name":"mapped_menu_cmds","type":{"array":[33],"of":"i8"},"offset":304,"bitOffset":null,"bits":null},{"name":"mapped_menu_op","type":{"array":[33],"of":"i8"},"offset":337,"bitOffset":null,"bits":null},{"name":"max_regions","type":"i32","offset":372,"bitOffset":null,"bits":null},{"name":"mentioned_water","type":"i8","offset":376,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":377,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_m"},"multishot":{"size":12,"alignment":4,"kind":"struct","fields":[{"name":"n","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"i","type":"i32","offset":4,"bitOffset":null,"bits":null},{"name":"o","type":"i16","offset":8,"bitOffset":null,"bits":null},{"name":"s","type":"i8","offset":10,"bitOffset":null,"bits":null}],"nativeName":"struct multishot"},"musable":{"size":40,"alignment":8,"kind":"struct","fields":[{"name":"offensive","type":{"pointer":"struct obj"},"offset":0,"bitOffset":null,"bits":null},{"name":"defensive","type":{"pointer":"struct obj"},"offset":8,"bitOffset":null,"bits":null},{"name":"misc","type":{"pointer":"struct obj"},"offset":16,"bitOffset":null,"bits":null},{"name":"has_offense","type":"i32","offset":24,"bitOffset":null,"bits":null},{"name":"has_defense","type":"i32","offset":28,"bitOffset":null,"bits":null},{"name":"has_misc","type":"i32","offset":32,"bitOffset":null,"bits":null}],"nativeName":"struct musable"},"instance_flags":{"size":424,"alignment":8,"kind":"struct","fields":[{"name":"defer_plname","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"fuzzerpending","type":"i8","offset":1,"bitOffset":null,"bits":null},{"name":"herecmd_menu","type":"i8","offset":2,"bitOffset":null,"bits":null},{"name":"idlecheckpoint","type":"i8","offset":3,"bitOffset":null,"bits":null},{"name":"invis_goldsym","type":"i8","offset":4,"bitOffset":null,"bits":null},{"name":"in_lua","type":"i8","offset":5,"bitOffset":null,"bits":null},{"name":"lua_testing","type":"i8","offset":6,"bitOffset":null,"bits":null},{"name":"term_gone","type":"i8","offset":7,"bitOffset":null,"bits":null},{"name":"nofollowers","type":"i8","offset":8,"bitOffset":null,"bits":null},{"name":"partly_eaten_hack","type":"i8","offset":9,"bitOffset":null,"bits":null},{"name":"query_menu","type":"i8","offset":10,"bitOffset":null,"bits":null},{"name":"remember_getpos","type":"i8","offset":11,"bitOffset":null,"bits":null},{"name":"sad_feeling","type":"i8","offset":12,"bitOffset":null,"bits":null},{"name":"showdamage","type":"i8","offset":13,"bitOffset":null,"bits":null},{"name":"pending_customizations","type":"i8","offset":14,"bitOffset":null,"bits":null},{"name":"debug_fuzzer","type":"i8","offset":15,"bitOffset":null,"bits":null},{"name":"at_midnight","type":"i32","offset":16,"bitOffset":null,"bits":null},{"name":"at_night","type":"i32","offset":20,"bitOffset":null,"bits":null},{"name":"failing_untrap","type":"i32","offset":24,"bitOffset":null,"bits":null},{"name":"getdir_click","type":"i32","offset":28,"bitOffset":null,"bits":null},{"name":"getloc_filter","type":"i32","offset":32,"bitOffset":null,"bits":null},{"name":"in_lava_effects","type":"i32","offset":36,"bitOffset":null,"bits":null},{"name":"last_msg","type":"i32","offset":40,"bitOffset":null,"bits":null},{"name":"menuobjsyms","type":"i32","offset":44,"bitOffset":null,"bits":null},{"name":"override_ID","type":"i32","offset":48,"bitOffset":null,"bits":null},{"name":"parse_config_file_src","type":"i32","offset":52,"bitOffset":null,"bits":null},{"name":"purge_monsters","type":"i32","offset":56,"bitOffset":null,"bits":null},{"name":"raw_printed","type":"i32","offset":60,"bitOffset":null,"bits":null},{"name":"suppress_price","type":"i32","offset":64,"bitOffset":null,"bits":null},{"name":"terrainmode","type":"u32","offset":68,"bitOffset":null,"bits":null},{"name":"bgcolors","type":"i8","offset":72,"bitOffset":null,"bits":null},{"name":"getloc_moveskip","type":"i8","offset":73,"bitOffset":null,"bits":null},{"name":"getloc_travelmode","type":"i8","offset":74,"bitOffset":null,"bits":null},{"name":"getloc_usemenu","type":"i8","offset":75,"bitOffset":null,"bits":null},{"name":"travelcc","type":{"record":"nhcoord"},"offset":76,"bitOffset":null,"bits":null},{"name":"trav_debug","type":"i8","offset":80,"bitOffset":null,"bits":null},{"name":"window_inited","type":"i8","offset":81,"bitOffset":null,"bits":null},{"name":"vision_inited","type":"i8","offset":82,"bitOffset":null,"bits":null},{"name":"sanity_check","type":"i8","offset":83,"bitOffset":null,"bits":null},{"name":"sanity_no_check","type":"i8","offset":84,"bitOffset":null,"bits":null},{"name":"debug_overwrite_stairs","type":"i8","offset":85,"bitOffset":null,"bits":null},{"name":"debug_mongen","type":"i8","offset":86,"bitOffset":null,"bits":null},{"name":"debug_hunger","type":"i8","offset":87,"bitOffset":null,"bits":null},{"name":"debug_prevent_pline","type":"i8","offset":88,"bitOffset":null,"bits":null},{"name":"mon_polycontrol","type":"i8","offset":89,"bitOffset":null,"bits":null},{"name":"mon_telecontrol","type":"i8","offset":90,"bitOffset":null,"bits":null},{"name":"in_dumplog","type":"i8","offset":91,"bitOffset":null,"bits":null},{"name":"in_parse","type":"i8","offset":92,"bitOffset":null,"bits":null},{"name":"initoptions_noterminate","type":"i8","offset":93,"bitOffset":null,"bits":null},{"name":"msg_history","type":"u32","offset":96,"bitOffset":null,"bits":null},{"name":"getpos_coords","type":"i32","offset":100,"bitOffset":null,"bits":null},{"name":"menuinvertmode","type":"i32","offset":104,"bitOffset":null,"bits":null},{"name":"terrain_typ","type":"i32","offset":108,"bitOffset":null,"bits":null},{"name":"menu_headings","type":{"record":"color_and_attr"},"offset":112,"bitOffset":null,"bits":null},{"name":"colorcount","type":"u32","offset":120,"bitOffset":null,"bits":null},{"name":"use_truecolor","type":"i8","offset":124,"bitOffset":null,"bits":null},{"name":"altmeta","type":"i8","offset":125,"bitOffset":null,"bits":null},{"name":"autodescribe","type":"i8","offset":126,"bitOffset":null,"bits":null},{"name":"cbreak","type":"i8","offset":127,"bitOffset":null,"bits":null},{"name":"deferred_X","type":"i8","offset":128,"bitOffset":null,"bits":null},{"name":"defer_decor","type":"i8","offset":129,"bitOffset":null,"bits":null},{"name":"echo","type":"i8","offset":130,"bitOffset":null,"bits":null},{"name":"force_invmenu","type":"i8","offset":131,"bitOffset":null,"bits":null},{"name":"hilite_pile","type":"i8","offset":132,"bitOffset":null,"bits":null},{"name":"menu_head_objsym","type":"i8","offset":133,"bitOffset":null,"bits":null},{"name":"menu_overlay","type":"i8","offset":134,"bitOffset":null,"bits":null},{"name":"menu_requested","type":"i8","offset":135,"bitOffset":null,"bits":null},{"name":"menu_tab_sep","type":"i8","offset":136,"bitOffset":null,"bits":null},{"name":"news","type":"i8","offset":137,"bitOffset":null,"bits":null},{"name":"num_pad","type":"i8","offset":138,"bitOffset":null,"bits":null},{"name":"perm_invent","type":"i8","offset":139,"bitOffset":null,"bits":null},{"name":"perm_invent_pending","type":"i8","offset":140,"bitOffset":null,"bits":null},{"name":"pricequotes","type":"i8","offset":141,"bitOffset":null,"bits":null},{"name":"renameallowed","type":"i8","offset":142,"bitOffset":null,"bits":null},{"name":"renameinprogress","type":"i8","offset":143,"bitOffset":null,"bits":null},{"name":"sounds","type":"i8","offset":144,"bitOffset":null,"bits":null},{"name":"status_updates","type":"i8","offset":145,"bitOffset":null,"bits":null},{"name":"toptenwin","type":"i8","offset":146,"bitOffset":null,"bits":null},{"name":"tux_penalty","type":"i8","offset":147,"bitOffset":null,"bits":null},{"name":"use_background_glyph","type":"i8","offset":148,"bitOffset":null,"bits":null},{"name":"use_menu_color","type":"i8","offset":149,"bitOffset":null,"bits":null},{"name":"use_menu_glyphs","type":"i8","offset":150,"bitOffset":null,"bits":null},{"name":"hilite_delta","type":"i64","offset":152,"bitOffset":null,"bits":null},{"name":"unhilite_deadline","type":"i64","offset":160,"bitOffset":null,"bits":null},{"name":"voices","type":"i8","offset":168,"bitOffset":null,"bits":null},{"name":"zerocomp","type":"i8","offset":169,"bitOffset":null,"bits":null},{"name":"rlecomp","type":"i8","offset":170,"bitOffset":null,"bits":null},{"name":"ice_rating","type":"i8","offset":171,"bitOffset":null,"bits":null},{"name":"prev_decor","type":"i8","offset":172,"bitOffset":null,"bits":null},{"name":"num_pad_mode","type":"u8","offset":173,"bitOffset":null,"bits":null},{"name":"perminv_mode","type":"u8","offset":174,"bitOffset":null,"bits":null},{"name":"bouldersym","type":"u8","offset":175,"bitOffset":null,"bits":null},{"name":"prevmsg_window","type":"i8","offset":176,"bitOffset":null,"bits":null},{"name":"extmenu","type":"i8","offset":177,"bitOffset":null,"bits":null},{"name":"cmdassist","type":"i8","offset":178,"bitOffset":null,"bits":null},{"name":"fireassist","type":"i8","offset":179,"bitOffset":null,"bits":null},{"name":"wizweight","type":"i8","offset":180,"bitOffset":null,"bits":null},{"name":"wizmgender","type":"i8","offset":181,"bitOffset":null,"bits":null},{"name":"customcolors","type":"i8","offset":182,"bitOffset":null,"bits":null},{"name":"customsymbols","type":"i8","offset":183,"bitOffset":null,"bits":null},{"name":"wc_color","type":"i8","offset":184,"bitOffset":null,"bits":null},{"name":"wc_hilite_pet","type":"i8","offset":185,"bitOffset":null,"bits":null},{"name":"wc_ascii_map","type":"i8","offset":186,"bitOffset":null,"bits":null},{"name":"wc_tiled_map","type":"i8","offset":187,"bitOffset":null,"bits":null},{"name":"wc_preload_tiles","type":"i8","offset":188,"bitOffset":null,"bits":null},{"name":"wc_tile_width","type":"i32","offset":192,"bitOffset":null,"bits":null},{"name":"wc_tile_height","type":"i32","offset":196,"bitOffset":null,"bits":null},{"name":"wc_tile_file","type":{"pointer":"char"},"offset":200,"bitOffset":null,"bits":null},{"name":"wc_inverse","type":"i8","offset":208,"bitOffset":null,"bits":null},{"name":"wc_align_status","type":"i32","offset":212,"bitOffset":null,"bits":null},{"name":"wc_align_message","type":"i32","offset":216,"bitOffset":null,"bits":null},{"name":"wc_vary_msgcount","type":"i32","offset":220,"bitOffset":null,"bits":null},{"name":"wcolors","type":{"array":[4],"of":{"record":"windowcolors_struct"}},"offset":224,"bitOffset":null,"bits":null},{"name":"wc_font_map","type":{"pointer":"char"},"offset":288,"bitOffset":null,"bits":null},{"name":"wc_font_message","type":{"pointer":"char"},"offset":296,"bitOffset":null,"bits":null},{"name":"wc_font_status","type":{"pointer":"char"},"offset":304,"bitOffset":null,"bits":null},{"name":"wc_font_menu","type":{"pointer":"char"},"offset":312,"bitOffset":null,"bits":null},{"name":"wc_font_text","type":{"pointer":"char"},"offset":320,"bitOffset":null,"bits":null},{"name":"wc_fontsiz_map","type":"i32","offset":328,"bitOffset":null,"bits":null},{"name":"wc_fontsiz_message","type":"i32","offset":332,"bitOffset":null,"bits":null},{"name":"wc_fontsiz_status","type":"i32","offset":336,"bitOffset":null,"bits":null},{"name":"wc_fontsiz_menu","type":"i32","offset":340,"bitOffset":null,"bits":null},{"name":"wc_fontsiz_text","type":"i32","offset":344,"bitOffset":null,"bits":null},{"name":"wc_scroll_amount","type":"i32","offset":348,"bitOffset":null,"bits":null},{"name":"wc_scroll_margin","type":"i32","offset":352,"bitOffset":null,"bits":null},{"name":"wc_map_mode","type":"i32","offset":356,"bitOffset":null,"bits":null},{"name":"wc_player_selection","type":"i32","offset":360,"bitOffset":null,"bits":null},{"name":"wc_splash_screen","type":"i8","offset":364,"bitOffset":null,"bits":null},{"name":"wc_popup_dialog","type":"i8","offset":365,"bitOffset":null,"bits":null},{"name":"wc_eight_bit_input","type":"i8","offset":366,"bitOffset":null,"bits":null},{"name":"wc2_fullscreen","type":"i8","offset":367,"bitOffset":null,"bits":null},{"name":"wc2_softkeyboard","type":"i8","offset":368,"bitOffset":null,"bits":null},{"name":"wc2_wraptext","type":"i8","offset":369,"bitOffset":null,"bits":null},{"name":"wc2_selectsaved","type":"i8","offset":370,"bitOffset":null,"bits":null},{"name":"wc2_darkgray","type":"i8","offset":371,"bitOffset":null,"bits":null},{"name":"wc2_hitpointbar","type":"i8","offset":372,"bitOffset":null,"bits":null},{"name":"wc2_guicolor","type":"i8","offset":373,"bitOffset":null,"bits":null},{"name":"wc_mouse_support","type":"i32","offset":376,"bitOffset":null,"bits":null},{"name":"wc2_term_cols","type":"i32","offset":380,"bitOffset":null,"bits":null},{"name":"wc2_term_rows","type":"i32","offset":384,"bitOffset":null,"bits":null},{"name":"wc2_statuslines","type":"i32","offset":388,"bitOffset":null,"bits":null},{"name":"wc2_windowborders","type":"i32","offset":392,"bitOffset":null,"bits":null},{"name":"wc2_petattr","type":"i32","offset":396,"bitOffset":null,"bits":null},{"name":"save_uswallow","type":"u32","offset":400,"bitOffset":0,"bits":1},{"name":"save_uinwater","type":"u32","offset":400,"bitOffset":1,"bits":1},{"name":"save_uburied","type":"u32","offset":400,"bitOffset":2,"bits":1},{"name":"debug","type":{"record":"debug_flags"},"offset":401,"bitOffset":null,"bits":null},{"name":"windowtype_locked","type":"i8","offset":403,"bitOffset":null,"bits":null},{"name":"windowtype_deferred","type":"i8","offset":404,"bitOffset":null,"bits":null},{"name":"returning_missile","type":{"pointer":"void"},"offset":408,"bitOffset":null,"bits":null},{"name":"wiz_error_flag","type":"i8","offset":416,"bitOffset":null,"bits":null},{"name":"explore_error_flag","type":"i8","offset":417,"bitOffset":null,"bits":null},{"name":"obsolete","type":"i8","offset":418,"bitOffset":null,"bits":null}],"nativeName":"struct instance_flags"},"color_and_attr":{"size":8,"alignment":4,"kind":"struct","fields":[{"name":"color","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"attr","type":"i32","offset":4,"bitOffset":null,"bits":null}],"nativeName":"struct color_and_attr"},"windowcolors_struct":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"fg","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"bg","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct windowcolors_struct"},"debug_flags":{"size":2,"alignment":1,"kind":"struct","fields":[{"name":"test","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"ttystatus","type":"i8","offset":1,"bitOffset":null,"bits":null}],"nativeName":"struct debug_flags"},"instance_globals_i":{"size":72,"alignment":8,"kind":"struct","fields":[{"name":"in_doagain","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"in_mklev","type":"i8","offset":4,"bitOffset":null,"bits":null},{"name":"in_steed_dismounting","type":"i8","offset":5,"bitOffset":null,"bits":null},{"name":"invent","type":{"pointer":"struct obj"},"offset":8,"bitOffset":null,"bits":null},{"name":"initial_don","type":"i8","offset":16,"bitOffset":null,"bits":null},{"name":"invbuf","type":{"pointer":"char"},"offset":24,"bitOffset":null,"bits":null},{"name":"invbufsiz","type":"u32","offset":32,"bitOffset":null,"bits":null},{"name":"item_action_in_progress","type":"i8","offset":36,"bitOffset":null,"bits":null},{"name":"in_sync_perminvent","type":"i32","offset":40,"bitOffset":null,"bits":null},{"name":"itermonarr","type":{"pointer":"struct monst *"},"offset":48,"bitOffset":null,"bits":null},{"name":"id_map","type":{"pointer":"struct bucket"},"offset":56,"bitOffset":null,"bits":null},{"name":"in_mk_themerooms","type":"i8","offset":64,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":65,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_i"},"you":{"size":2760,"alignment":8,"kind":"struct","fields":[{"name":"ux","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"uy","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"dx","type":"i32","offset":4,"bitOffset":null,"bits":null},{"name":"dy","type":"i32","offset":8,"bitOffset":null,"bits":null},{"name":"dz","type":"i32","offset":12,"bitOffset":null,"bits":null},{"name":"tx","type":"i16","offset":16,"bitOffset":null,"bits":null},{"name":"ty","type":"i16","offset":18,"bitOffset":null,"bits":null},{"name":"ux0","type":"i16","offset":20,"bitOffset":null,"bits":null},{"name":"uy0","type":"i16","offset":22,"bitOffset":null,"bits":null},{"name":"uz","type":{"record":"d_level"},"offset":24,"bitOffset":null,"bits":null},{"name":"uz0","type":{"record":"d_level"},"offset":28,"bitOffset":null,"bits":null},{"name":"utolev","type":{"record":"d_level"},"offset":32,"bitOffset":null,"bits":null},{"name":"utotype","type":"u8","offset":36,"bitOffset":null,"bits":null},{"name":"ucamefrom","type":{"record":"d_level"},"offset":38,"bitOffset":null,"bits":null},{"name":"umoved","type":"i8","offset":42,"bitOffset":null,"bits":null},{"name":"last_str_turn","type":"i32","offset":44,"bitOffset":null,"bits":null},{"name":"ulevel","type":"i32","offset":48,"bitOffset":null,"bits":null},{"name":"ulevelmax","type":"i32","offset":52,"bitOffset":null,"bits":null},{"name":"ulevelpeak","type":"i32","offset":56,"bitOffset":null,"bits":null},{"name":"utrap","type":"u32","offset":60,"bitOffset":null,"bits":null},{"name":"utraptype","type":"u32","offset":64,"bitOffset":null,"bits":null},{"name":"urooms","type":{"array":[5],"of":"i8"},"offset":68,"bitOffset":null,"bits":null},{"name":"urooms0","type":{"array":[5],"of":"i8"},"offset":73,"bitOffset":null,"bits":null},{"name":"uentered","type":{"array":[5],"of":"i8"},"offset":78,"bitOffset":null,"bits":null},{"name":"ushops","type":{"array":[5],"of":"i8"},"offset":83,"bitOffset":null,"bits":null},{"name":"ushops0","type":{"array":[5],"of":"i8"},"offset":88,"bitOffset":null,"bits":null},{"name":"ushops_entered","type":{"array":[5],"of":"i8"},"offset":93,"bitOffset":null,"bits":null},{"name":"ushops_left","type":{"array":[5],"of":"i8"},"offset":98,"bitOffset":null,"bits":null},{"name":"uhunger","type":"i32","offset":104,"bitOffset":null,"bits":null},{"name":"uhs","type":"u32","offset":108,"bitOffset":null,"bits":null},{"name":"uprops","type":{"array":[69],"of":{"record":"prop"}},"offset":112,"bitOffset":null,"bits":null},{"name":"umconf","type":"u32","offset":1768,"bitOffset":null,"bits":null},{"name":"usick_type","type":"u32","offset":1772,"bitOffset":0,"bits":2},{"name":"nv_range","type":"i32","offset":1776,"bitOffset":null,"bits":null},{"name":"xray_range","type":"i32","offset":1780,"bitOffset":null,"bits":null},{"name":"unblind_telepat_range","type":"i32","offset":1784,"bitOffset":null,"bits":null},{"name":"bglyph","type":"i32","offset":1788,"bitOffset":null,"bits":null},{"name":"cglyph","type":"i32","offset":1792,"bitOffset":null,"bits":null},{"name":"bc_order","type":"i32","offset":1796,"bitOffset":null,"bits":null},{"name":"bc_felt","type":"i32","offset":1800,"bitOffset":null,"bits":null},{"name":"umonster","type":"i32","offset":1804,"bitOffset":null,"bits":null},{"name":"umonnum","type":"i32","offset":1808,"bitOffset":null,"bits":null},{"name":"mh","type":"i32","offset":1812,"bitOffset":null,"bits":null},{"name":"mhmax","type":"i32","offset":1816,"bitOffset":null,"bits":null},{"name":"mtimedone","type":"i32","offset":1820,"bitOffset":null,"bits":null},{"name":"macurr","type":{"record":"attribs"},"offset":1824,"bitOffset":null,"bits":null},{"name":"mamax","type":{"record":"attribs"},"offset":1830,"bitOffset":null,"bits":null},{"name":"ulycn","type":"i32","offset":1836,"bitOffset":null,"bits":null},{"name":"ucreamed","type":"u32","offset":1840,"bitOffset":null,"bits":null},{"name":"uswldtim","type":"u32","offset":1844,"bitOffset":null,"bits":null},{"name":"uswallow","type":"u32","offset":1848,"bitOffset":0,"bits":1},{"name":"uinwater","type":"u32","offset":1848,"bitOffset":1,"bits":1},{"name":"uundetected","type":"u32","offset":1848,"bitOffset":2,"bits":1},{"name":"mfemale","type":"u32","offset":1848,"bitOffset":3,"bits":1},{"name":"uinvulnerable","type":"u32","offset":1848,"bitOffset":4,"bits":1},{"name":"uburied","type":"u32","offset":1848,"bitOffset":5,"bits":1},{"name":"uedibility","type":"u32","offset":1848,"bitOffset":6,"bits":1},{"name":"uhandedness","type":"u32","offset":1848,"bitOffset":7,"bits":1},{"name":"udg_cnt","type":"u32","offset":1852,"bitOffset":null,"bits":null},{"name":"uevent","type":{"record":"u_event"},"offset":1856,"bitOffset":null,"bits":null},{"name":"uhave","type":{"record":"u_have"},"offset":1860,"bitOffset":null,"bits":null},{"name":"uconduct","type":{"record":"u_conduct"},"offset":1864,"bitOffset":null,"bits":null},{"name":"uroleplay","type":{"record":"u_roleplay"},"offset":2008,"bitOffset":null,"bits":null},{"name":"acurr","type":{"record":"attribs"},"offset":2032,"bitOffset":null,"bits":null},{"name":"aexe","type":{"record":"attribs"},"offset":2038,"bitOffset":null,"bits":null},{"name":"abon","type":{"record":"attribs"},"offset":2044,"bitOffset":null,"bits":null},{"name":"amax","type":{"record":"attribs"},"offset":2050,"bitOffset":null,"bits":null},{"name":"atemp","type":{"record":"attribs"},"offset":2056,"bitOffset":null,"bits":null},{"name":"atime","type":{"record":"attribs"},"offset":2062,"bitOffset":null,"bits":null},{"name":"ualign","type":{"record":"align"},"offset":2068,"bitOffset":null,"bits":null},{"name":"ualignbase","type":{"array":[2],"of":"i8"},"offset":2080,"bitOffset":null,"bits":null},{"name":"uluck","type":"i8","offset":2082,"bitOffset":null,"bits":null},{"name":"moreluck","type":"i8","offset":2083,"bitOffset":null,"bits":null},{"name":"uhitinc","type":"i8","offset":2084,"bitOffset":null,"bits":null},{"name":"udaminc","type":"i8","offset":2085,"bitOffset":null,"bits":null},{"name":"uac","type":"i8","offset":2086,"bitOffset":null,"bits":null},{"name":"uspellprot","type":"u8","offset":2087,"bitOffset":null,"bits":null},{"name":"usptime","type":"u8","offset":2088,"bitOffset":null,"bits":null},{"name":"uspmtime","type":"u8","offset":2089,"bitOffset":null,"bits":null},{"name":"uhp","type":"i32","offset":2092,"bitOffset":null,"bits":null},{"name":"uhpmax","type":"i32","offset":2096,"bitOffset":null,"bits":null},{"name":"uhppeak","type":"i32","offset":2100,"bitOffset":null,"bits":null},{"name":"uen","type":"i32","offset":2104,"bitOffset":null,"bits":null},{"name":"uenmax","type":"i32","offset":2108,"bitOffset":null,"bits":null},{"name":"uenpeak","type":"i32","offset":2112,"bitOffset":null,"bits":null},{"name":"uhpinc","type":{"array":[30],"of":"i16"},"offset":2116,"bitOffset":null,"bits":null},{"name":"ueninc","type":{"array":[30],"of":"i16"},"offset":2176,"bitOffset":null,"bits":null},{"name":"ugangr","type":"i32","offset":2236,"bitOffset":null,"bits":null},{"name":"ugifts","type":"i32","offset":2240,"bitOffset":null,"bits":null},{"name":"ublessed","type":"i32","offset":2244,"bitOffset":null,"bits":null},{"name":"ublesscnt","type":"i32","offset":2248,"bitOffset":null,"bits":null},{"name":"umoney0","type":"i64","offset":2256,"bitOffset":null,"bits":null},{"name":"uspare1","type":"i64","offset":2264,"bitOffset":null,"bits":null},{"name":"uexp","type":"i64","offset":2272,"bitOffset":null,"bits":null},{"name":"urexp","type":"i64","offset":2280,"bitOffset":null,"bits":null},{"name":"ucleansed","type":"i64","offset":2288,"bitOffset":null,"bits":null},{"name":"usleep","type":"i64","offset":2296,"bitOffset":null,"bits":null},{"name":"uinvault","type":"i32","offset":2304,"bitOffset":null,"bits":null},{"name":"ustuck","type":{"pointer":"struct monst"},"offset":2312,"bitOffset":null,"bits":null},{"name":"usteed","type":{"pointer":"struct monst"},"offset":2320,"bitOffset":null,"bits":null},{"name":"ustuck_mid","type":"u32","offset":2328,"bitOffset":null,"bits":null},{"name":"usteed_mid","type":"u32","offset":2332,"bitOffset":null,"bits":null},{"name":"ugallop","type":"i64","offset":2336,"bitOffset":null,"bits":null},{"name":"urideturns","type":"i32","offset":2344,"bitOffset":null,"bits":null},{"name":"umortality","type":"i32","offset":2348,"bitOffset":null,"bits":null},{"name":"ugrave_arise","type":"i32","offset":2352,"bitOffset":null,"bits":null},{"name":"weapon_slots","type":"i32","offset":2356,"bitOffset":null,"bits":null},{"name":"skills_advanced","type":"i32","offset":2360,"bitOffset":null,"bits":null},{"name":"skill_record","type":{"array":[60],"of":"i16"},"offset":2364,"bitOffset":null,"bits":null},{"name":"weapon_skills","type":{"array":[38],"of":{"record":"skills"}},"offset":2484,"bitOffset":null,"bits":null},{"name":"twoweap","type":"i8","offset":2712,"bitOffset":null,"bits":null},{"name":"mcham","type":"i16","offset":2714,"bitOffset":null,"bits":null},{"name":"umovement","type":"i16","offset":2716,"bitOffset":null,"bits":null},{"name":"uachieved","type":{"array":[32],"of":"i8"},"offset":2718,"bitOffset":null,"bits":null},{"name":"umonst","type":{"pointer":"struct monst"},"offset":2752,"bitOffset":null,"bits":null}],"nativeName":"struct you"},"prop":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"extrinsic","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"blocked","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"intrinsic","type":"i64","offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct prop"},"attribs":{"size":6,"alignment":1,"kind":"struct","fields":[{"name":"a","type":{"array":[6],"of":"i8"},"offset":0,"bitOffset":null,"bits":null}],"nativeName":"struct attribs"},"u_event":{"size":4,"alignment":4,"kind":"struct","fields":[{"name":"minor_oracle","type":"u32","offset":0,"bitOffset":0,"bits":1},{"name":"major_oracle","type":"u32","offset":0,"bitOffset":1,"bits":1},{"name":"read_tribute","type":"u32","offset":0,"bitOffset":2,"bits":1},{"name":"qcalled","type":"u32","offset":0,"bitOffset":3,"bits":1},{"name":"qexpelled","type":"u32","offset":0,"bitOffset":4,"bits":1},{"name":"qcompleted","type":"u32","offset":0,"bitOffset":5,"bits":1},{"name":"uheard_tune","type":"u32","offset":0,"bitOffset":6,"bits":2},{"name":"uopened_dbridge","type":"u32","offset":1,"bitOffset":0,"bits":1},{"name":"invoked","type":"u32","offset":1,"bitOffset":1,"bits":1},{"name":"gehennom_entered","type":"u32","offset":1,"bitOffset":2,"bits":1},{"name":"uhand_of_elbereth","type":"u32","offset":1,"bitOffset":3,"bits":2},{"name":"udemigod","type":"u32","offset":1,"bitOffset":5,"bits":1},{"name":"uvibrated","type":"u32","offset":1,"bitOffset":6,"bits":1},{"name":"ascended","type":"u32","offset":1,"bitOffset":7,"bits":1},{"name":"amulet_wish","type":"u32","offset":2,"bitOffset":0,"bits":1}],"nativeName":"struct u_event"},"u_have":{"size":4,"alignment":4,"kind":"struct","fields":[{"name":"amulet","type":"u32","offset":0,"bitOffset":0,"bits":1},{"name":"bell","type":"u32","offset":0,"bitOffset":1,"bits":1},{"name":"book","type":"u32","offset":0,"bitOffset":2,"bits":1},{"name":"menorah","type":"u32","offset":0,"bitOffset":3,"bits":1},{"name":"questart","type":"u32","offset":0,"bitOffset":4,"bits":1},{"name":"unused","type":"u32","offset":0,"bitOffset":5,"bits":3}],"nativeName":"struct u_have"},"u_conduct":{"size":144,"alignment":8,"kind":"struct","fields":[{"name":"unvegetarian","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"unvegan","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"food","type":"i64","offset":16,"bitOffset":null,"bits":null},{"name":"gnostic","type":"i64","offset":24,"bitOffset":null,"bits":null},{"name":"weaphit","type":"i64","offset":32,"bitOffset":null,"bits":null},{"name":"killer","type":"i64","offset":40,"bitOffset":null,"bits":null},{"name":"literate","type":"i64","offset":48,"bitOffset":null,"bits":null},{"name":"polypiles","type":"i64","offset":56,"bitOffset":null,"bits":null},{"name":"polyselfs","type":"i64","offset":64,"bitOffset":null,"bits":null},{"name":"wishes","type":"i64","offset":72,"bitOffset":null,"bits":null},{"name":"wisharti","type":"i64","offset":80,"bitOffset":null,"bits":null},{"name":"hf_reserved1","type":"i64","offset":88,"bitOffset":null,"bits":null},{"name":"sokocheat","type":"i64","offset":96,"bitOffset":null,"bits":null},{"name":"pets","type":"i64","offset":104,"bitOffset":null,"bits":null},{"name":"reserved1","type":"i64","offset":112,"bitOffset":null,"bits":null},{"name":"reserved2","type":"i64","offset":120,"bitOffset":null,"bits":null},{"name":"reserved3","type":"i64","offset":128,"bitOffset":null,"bits":null},{"name":"reserved4","type":"i64","offset":136,"bitOffset":null,"bits":null}],"nativeName":"struct u_conduct"},"u_roleplay":{"size":24,"alignment":8,"kind":"struct","fields":[{"name":"blind","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"nudist","type":"i8","offset":1,"bitOffset":null,"bits":null},{"name":"deaf","type":"i8","offset":2,"bitOffset":null,"bits":null},{"name":"pauper","type":"i8","offset":3,"bitOffset":null,"bits":null},{"name":"reroll","type":"i8","offset":4,"bitOffset":null,"bits":null},{"name":"reserved1","type":"i8","offset":5,"bitOffset":null,"bits":null},{"name":"reserved2","type":"i8","offset":6,"bitOffset":null,"bits":null},{"name":"reserved3","type":"i8","offset":7,"bitOffset":null,"bits":null},{"name":"numbones","type":"i64","offset":8,"bitOffset":null,"bits":null},{"name":"numrerolls","type":"i64","offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct u_roleplay"},"align":{"size":12,"alignment":4,"kind":"struct","fields":[{"name":"type","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"record","type":"i32","offset":4,"bitOffset":null,"bits":null},{"name":"abuse","type":"u32","offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct align"},"skills":{"size":6,"alignment":2,"kind":"struct","fields":[{"name":"skill","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"max_skill","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"advance","type":"u16","offset":4,"bitOffset":null,"bits":null}],"nativeName":"struct skills"},"instance_globals_g":{"size":95000,"alignment":8,"kind":"struct","fields":[{"name":"gbuf","type":{"array":[21,80],"of":{"record":"anonymous_1024_9"}},"offset":0,"bitOffset":null,"bits":null},{"name":"gbuf_start","type":{"array":[21],"of":"i16"},"offset":94080,"bitOffset":null,"bits":null},{"name":"gbuf_stop","type":{"array":[21],"of":"i16"},"offset":94122,"bitOffset":null,"bits":null},{"name":"getposx","type":"i16","offset":94164,"bitOffset":null,"bits":null},{"name":"getposy","type":"i16","offset":94166,"bitOffset":null,"bits":null},{"name":"gloc_filter_map","type":{"pointer":"struct selectionvar"},"offset":94168,"bitOffset":null,"bits":null},{"name":"gloc_filter_floodfill_match_glyph","type":"i32","offset":94176,"bitOffset":null,"bits":null},{"name":"gtyp","type":"i16","offset":94180,"bitOffset":null,"bits":null},{"name":"gx","type":"i16","offset":94182,"bitOffset":null,"bits":null},{"name":"gy","type":"i16","offset":94184,"bitOffset":null,"bits":null},{"name":"gate_str","type":{"pointer":"char"},"offset":94192,"bitOffset":null,"bits":null},{"name":"gems","type":{"array":[23],"of":{"record":"valuable_data"}},"offset":94200,"bitOffset":null,"bits":null},{"name":"glyph_reset_timestamp","type":"i64","offset":94568,"bitOffset":null,"bits":null},{"name":"gmst_stored","type":"i8","offset":94576,"bitOffset":null,"bits":null},{"name":"gmst_moves","type":"i64","offset":94584,"bitOffset":null,"bits":null},{"name":"gmst_invent","type":{"pointer":"struct obj"},"offset":94592,"bitOffset":null,"bits":null},{"name":"gmst_ubak","type":{"pointer":"genericptr_t"},"offset":94600,"bitOffset":null,"bits":null},{"name":"gmst_disco","type":{"pointer":"genericptr_t"},"offset":94608,"bitOffset":null,"bits":null},{"name":"gmst_mvitals","type":{"pointer":"genericptr_t"},"offset":94616,"bitOffset":null,"bits":null},{"name":"gmst_spl_book","type":{"array":[43],"of":{"record":"spell"}},"offset":94624,"bitOffset":null,"bits":null},{"name":"gamelog","type":{"pointer":"struct gamelog_line"},"offset":94968,"bitOffset":null,"bits":null},{"name":"gas_cloud_diss_within","type":"i8","offset":94976,"bitOffset":null,"bits":null},{"name":"gas_cloud_diss_seen","type":"i32","offset":94980,"bitOffset":null,"bits":null},{"name":"glyphmap_perlevel_flags","type":"i64","offset":94984,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":94992,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_g"},"anonymous_1024_9":{"size":56,"alignment":8,"kind":"struct","fields":[{"name":"gnew","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"glyphinfo","type":{"record":"glyphinfo"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct (unnamed at ../include/display.h:1024:9)"},"glyphinfo":{"size":48,"alignment":8,"kind":"struct","fields":[{"name":"glyph","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"ttychar","type":"i32","offset":4,"bitOffset":null,"bits":null},{"name":"framecolor","type":"u32","offset":8,"bitOffset":null,"bits":null},{"name":"gm","type":{"record":"glyph_map_entry"},"offset":16,"bitOffset":null,"bits":null}],"nativeName":"struct glyphinfo"},"glyph_map_entry":{"size":32,"alignment":8,"kind":"struct","fields":[{"name":"glyphflags","type":"u32","offset":0,"bitOffset":null,"bits":null},{"name":"sym","type":{"record":"classic_representation"},"offset":4,"bitOffset":null,"bits":null},{"name":"customcolor","type":"u32","offset":12,"bitOffset":null,"bits":null},{"name":"color256idx","type":"u16","offset":16,"bitOffset":null,"bits":null},{"name":"tileidx","type":"i16","offset":18,"bitOffset":null,"bits":null},{"name":"u","type":{"pointer":"struct unicode_representation"},"offset":24,"bitOffset":null,"bits":null}],"nativeName":"struct glyph_map_entry"},"classic_representation":{"size":8,"alignment":4,"kind":"struct","fields":[{"name":"color","type":"i32","offset":0,"bitOffset":null,"bits":null},{"name":"symidx","type":"i32","offset":4,"bitOffset":null,"bits":null}],"nativeName":"struct classic_representation"},"valuable_data":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"count","type":"i64","offset":0,"bitOffset":null,"bits":null},{"name":"typ","type":"i32","offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct valuable_data"},"spell":{"size":8,"alignment":4,"kind":"struct","fields":[{"name":"sp_id","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"sp_lev","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"sp_know","type":"i32","offset":4,"bitOffset":null,"bits":null}],"nativeName":"struct spell"},"instance_globals_saved_s":{"size":352,"alignment":8,"kind":"struct","fields":[{"name":"spl_book","type":{"array":[43],"of":{"record":"spell"}},"offset":0,"bitOffset":null,"bits":null},{"name":"sp_levchn","type":{"pointer":"s_level"},"offset":344,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_saved_s"},"RoleName":{"size":16,"alignment":8,"kind":"struct","fields":[{"name":"m","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"f","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null}],"nativeName":"struct RoleName"},"Role":{"size":312,"alignment":8,"kind":"struct","fields":[{"name":"name","type":{"record":"RoleName"},"offset":0,"bitOffset":null,"bits":null},{"name":"rank","type":{"array":[9],"of":{"record":"RoleName"}},"offset":16,"bitOffset":null,"bits":null},{"name":"lgod","type":{"pointer":"char"},"offset":160,"bitOffset":null,"bits":null},{"name":"ngod","type":{"pointer":"char"},"offset":168,"bitOffset":null,"bits":null},{"name":"cgod","type":{"pointer":"char"},"offset":176,"bitOffset":null,"bits":null},{"name":"filecode","type":{"pointer":"char"},"offset":184,"bitOffset":null,"bits":null},{"name":"homebase","type":{"pointer":"char"},"offset":192,"bitOffset":null,"bits":null},{"name":"intermed","type":{"pointer":"char"},"offset":200,"bitOffset":null,"bits":null},{"name":"mnum","type":"i16","offset":208,"bitOffset":null,"bits":null},{"name":"petnum","type":"i16","offset":210,"bitOffset":null,"bits":null},{"name":"ldrnum","type":"i16","offset":212,"bitOffset":null,"bits":null},{"name":"guardnum","type":"i16","offset":214,"bitOffset":null,"bits":null},{"name":"neminum","type":"i16","offset":216,"bitOffset":null,"bits":null},{"name":"enemy1num","type":"i16","offset":218,"bitOffset":null,"bits":null},{"name":"enemy2num","type":"i16","offset":220,"bitOffset":null,"bits":null},{"name":"enemy1sym","type":"i8","offset":222,"bitOffset":null,"bits":null},{"name":"enemy2sym","type":"i8","offset":223,"bitOffset":null,"bits":null},{"name":"questarti","type":"i16","offset":224,"bitOffset":null,"bits":null},{"name":"allow","type":"i16","offset":226,"bitOffset":null,"bits":null},{"name":"attrbase","type":{"array":[6],"of":"i16"},"offset":228,"bitOffset":null,"bits":null},{"name":"attrdist","type":{"array":[6],"of":"i16"},"offset":240,"bitOffset":null,"bits":null},{"name":"hpadv","type":{"record":"RoleAdvance"},"offset":252,"bitOffset":null,"bits":null},{"name":"enadv","type":{"record":"RoleAdvance"},"offset":264,"bitOffset":null,"bits":null},{"name":"xlev","type":"i16","offset":276,"bitOffset":null,"bits":null},{"name":"initrecord","type":"i16","offset":278,"bitOffset":null,"bits":null},{"name":"spelbase","type":"i32","offset":280,"bitOffset":null,"bits":null},{"name":"spelheal","type":"i32","offset":284,"bitOffset":null,"bits":null},{"name":"spelshld","type":"i32","offset":288,"bitOffset":null,"bits":null},{"name":"spelarmr","type":"i32","offset":292,"bitOffset":null,"bits":null},{"name":"spelstat","type":"i32","offset":296,"bitOffset":null,"bits":null},{"name":"spelspec","type":"i32","offset":300,"bitOffset":null,"bits":null},{"name":"spelsbon","type":"i32","offset":304,"bitOffset":null,"bits":null}],"nativeName":"struct Role"},"RoleAdvance":{"size":12,"alignment":2,"kind":"struct","fields":[{"name":"infix","type":"i16","offset":0,"bitOffset":null,"bits":null},{"name":"inrnd","type":"i16","offset":2,"bitOffset":null,"bits":null},{"name":"lofix","type":"i16","offset":4,"bitOffset":null,"bits":null},{"name":"lornd","type":"i16","offset":6,"bitOffset":null,"bits":null},{"name":"hifix","type":"i16","offset":8,"bitOffset":null,"bits":null},{"name":"hirnd","type":"i16","offset":10,"bitOffset":null,"bits":null}],"nativeName":"struct RoleAdvance"},"instance_globals_u":{"size":440,"alignment":8,"kind":"struct","fields":[{"name":"update_all","type":"i8","offset":0,"bitOffset":null,"bits":null},{"name":"unweapon","type":"i8","offset":1,"bitOffset":null,"bits":null},{"name":"urole","type":{"record":"Role"},"offset":8,"bitOffset":null,"bits":null},{"name":"urace","type":{"record":"Race"},"offset":320,"bitOffset":null,"bits":null},{"name":"uz_save","type":{"record":"d_level"},"offset":432,"bitOffset":null,"bits":null},{"name":"havestate","type":"i8","offset":436,"bitOffset":null,"bits":null}],"nativeName":"struct instance_globals_u"},"Race":{"size":112,"alignment":8,"kind":"struct","fields":[{"name":"noun","type":{"pointer":"char"},"offset":0,"bitOffset":null,"bits":null},{"name":"adj","type":{"pointer":"char"},"offset":8,"bitOffset":null,"bits":null},{"name":"coll","type":{"pointer":"char"},"offset":16,"bitOffset":null,"bits":null},{"name":"filecode","type":{"pointer":"char"},"offset":24,"bitOffset":null,"bits":null},{"name":"individual","type":{"record":"RoleName"},"offset":32,"bitOffset":null,"bits":null},{"name":"mnum","type":"i16","offset":48,"bitOffset":null,"bits":null},{"name":"mummynum","type":"i16","offset":50,"bitOffset":null,"bits":null},{"name":"zombienum","type":"i16","offset":52,"bitOffset":null,"bits":null},{"name":"allow","type":"i16","offset":54,"bitOffset":null,"bits":null},{"name":"selfmask","type":"i16","offset":56,"bitOffset":null,"bits":null},{"name":"lovemask","type":"i16","offset":58,"bitOffset":null,"bits":null},{"name":"hatemask","type":"i16","offset":60,"bitOffset":null,"bits":null},{"name":"attrmin","type":{"array":[6],"of":"i16"},"offset":62,"bitOffset":null,"bits":null},{"name":"attrmax","type":{"array":[6],"of":"i16"},"offset":74,"bitOffset":null,"bits":null},{"name":"hpadv","type":{"record":"RoleAdvance"},"offset":86,"bitOffset":null,"bits":null},{"name":"enadv","type":{"record":"RoleAdvance"},"offset":98,"bitOffset":null,"bits":null}],"nativeName":"struct Race"},"nhl_user_data":{"size":232,"alignment":8,"kind":"struct","fields":[{"name":"L","type":{"pointer":"lua_State"},"offset":0,"bitOffset":null,"bits":null},{"name":"flags","type":"u32","offset":8,"bitOffset":null,"bits":null},{"name":"memlimit","type":"u32","offset":12,"bitOffset":null,"bits":null},{"name":"steps","type":"u32","offset":16,"bitOffset":null,"bits":null},{"name":"osteps","type":"u32","offset":20,"bitOffset":null,"bits":null},{"name":"perpcall","type":"u32","offset":24,"bitOffset":null,"bits":null},{"name":"statctr","type":"u32","offset":28,"bitOffset":null,"bits":null},{"name":"sid","type":"i32","offset":32,"bitOffset":null,"bits":null},{"name":"name","type":{"pointer":"char"},"offset":40,"bitOffset":null,"bits":null},{"name":"jb","type":{"array":[1],"of":{"record":"__jmp_buf_tag"}},"offset":48,"bitOffset":null,"bits":null}],"nativeName":"struct nhl_user_data"},"__jmp_buf_tag":{"size":184,"alignment":8,"kind":"struct","fields":[{"name":"__jb","type":{"array":[6],"of":"u64"},"offset":0,"bitOffset":null,"bits":null},{"name":"__fl","type":"u64","offset":48,"bitOffset":null,"bits":null},{"name":"__ss","type":{"array":[16],"of":"u64"},"offset":56,"bitOffset":null,"bits":null}],"nativeName":"struct __jmp_buf_tag"}},"data":{"nhcore_call_names":{"name":"nhcore_call_names","sourceName":"nhcore_call_names","type":{"array":[7],"of":{"pointer":"char"}},"ctype":"const char *const[7]","staticLocal":false,"initial":["start_new_game","restore_old_game","moveloop_turn","game_exit","getpos_tip","enter_tutorial","leave_tutorial"]},"nhcore_call_available":{"name":"nhcore_call_available","sourceName":"nhcore_call_available","type":{"array":[7],"of":"i8"},"ctype":"boolean[7]","staticLocal":false,"initial":null},"luapat":{"name":"luapat","sourceName":"luapat","type":{"pointer":"lua_State"},"ctype":"lua_State *","staticLocal":false,"initial":null},"char2typ":{"name":"char2typ","sourceName":"char2typ","type":{"array":[35],"of":{"record":"anonymous_342_14"}},"ctype":"const struct (unnamed struct at nhlua.c:342:14)[35]","staticLocal":false,"initial":[{"ch":32,"typ":{"constant":"STONE"}},{"ch":35,"typ":{"constant":"CORR"}},{"ch":46,"typ":{"constant":"ROOM"}},{"ch":45,"typ":{"constant":"HWALL"}},{"ch":45,"typ":{"constant":"TLCORNER"}},{"ch":45,"typ":{"constant":"TRCORNER"}},{"ch":45,"typ":{"constant":"BLCORNER"}},{"ch":45,"typ":{"constant":"BRCORNER"}},{"ch":45,"typ":{"constant":"CROSSWALL"}},{"ch":45,"typ":{"constant":"TUWALL"}},{"ch":45,"typ":{"constant":"TDWALL"}},{"ch":45,"typ":{"constant":"TLWALL"}},{"ch":45,"typ":{"constant":"TRWALL"}},{"ch":45,"typ":{"constant":"DBWALL"}},{"ch":124,"typ":{"constant":"VWALL"}},{"ch":43,"typ":{"constant":"DOOR"}},{"ch":65,"typ":{"constant":"AIR"}},{"ch":67,"typ":{"constant":"CLOUD"}},{"ch":83,"typ":{"constant":"SDOOR"}},{"ch":72,"typ":{"constant":"SCORR"}},{"ch":123,"typ":{"constant":"FOUNTAIN"}},{"ch":92,"typ":{"constant":"THRONE"}},{"ch":75,"typ":{"constant":"SINK"}},{"ch":125,"typ":{"constant":"MOAT"}},{"ch":80,"typ":{"constant":"POOL"}},{"ch":76,"typ":{"constant":"LAVAPOOL"}},{"ch":90,"typ":{"constant":"LAVAWALL"}},{"ch":73,"typ":{"constant":"ICE"}},{"ch":87,"typ":{"constant":"WATER"}},{"ch":84,"typ":{"constant":"TREE"}},{"ch":70,"typ":{"constant":"IRONBARS"}},{"ch":120,"typ":{"constant":"MAX_TYPE"}},{"ch":66,"typ":{"constant":"CROSSWALL"}},{"ch":119,"typ":{"constant":"MATCH_WALL"}},{"ch":0,"typ":{"constant":"STONE"}}]},"nhl_functions":{"name":"nhl_functions","sourceName":"nhl_functions","type":{"array":[41],"of":{"record":"luaL_Reg"}},"ctype":"const struct luaL_Reg[41]","staticLocal":false,"initial":[{"name":"test","func":{"function":"nhl_test"}},{"name":"getmap","func":{"function":"nhl_getmap"}},{"name":"gettrap","func":{"function":"nhl_gettrap"}},{"name":"deltrap","func":{"function":"nhl_deltrap"}},{"name":"has_timer_at","func":{"function":"nhl_timer_has_at"}},{"name":"peek_timer_at","func":{"function":"nhl_timer_peek_at"}},{"name":"stop_timer_at","func":{"function":"nhl_timer_stop_at"}},{"name":"start_timer_at","func":{"function":"nhl_timer_start_at"}},{"name":"abscoord","func":{"function":"nhl_abs_coord"}},{"name":"impossible","func":{"function":"nhl_impossible"}},{"name":"pline","func":{"function":"nhl_pline"}},{"name":"verbalize","func":{"function":"nhl_verbalize"}},{"name":"menu","func":{"function":"nhl_menu"}},{"name":"text","func":{"function":"nhl_text"}},{"name":"getlin","func":{"function":"nhl_getlin"}},{"name":"eckey","func":{"function":"nhl_get_cmd_key"}},{"name":"callback","func":{"function":"nhl_callback"}},{"name":"gamestate","func":{"function":"nhl_gamestate"}},{"name":"makeplural","func":{"function":"nhl_makeplural"}},{"name":"makesingular","func":{"function":"nhl_makesingular"}},{"name":"s_suffix","func":{"function":"nhl_s_suffix"}},{"name":"ing_suffix","func":{"function":"nhl_ing_suffix"}},{"name":"an","func":{"function":"nhl_an"}},{"name":"rn2","func":{"function":"nhl_rn2"}},{"name":"random","func":{"function":"nhl_random"}},{"name":"level_difficulty","func":{"function":"nhl_level_difficulty"}},{"name":"is_genocided","func":{"function":"nhl_is_genocided"}},{"name":"debug_themerm","func":{"function":"nhl_get_debug_themerm_name"}},{"name":"parse_config","func":{"function":"nhl_parse_config"}},{"name":"get_config","func":{"function":"nhl_get_config"}},{"name":"get_config_errors","func":{"function":"l_get_config_errors"}},{"name":"dnum_name","func":{"function":"nhl_dnum_name"}},{"name":"int_to_pmname","func":{"function":"nhl_int_to_pm_name"}},{"name":"int_to_objname","func":{"function":"nhl_int_to_obj_name"}},{"name":"variable","func":{"function":"nhl_variable"}},{"name":"stairways","func":{"function":"nhl_stairways"}},{"name":"pushkey","func":{"function":"nhl_pushkey"}},{"name":"doturn","func":{"function":"nhl_doturn"}},{"name":"debug_flags","func":{"function":"nhl_debug_flags"}},{"name":"flip_level","func":{"function":"nhl_flip_level"}},{"name":0,"func":0}]},"nhl_consts":{"name":"nhl_consts","sourceName":"nhl_consts","type":{"array":[9],"of":{"record":"anonymous_2057_14"}},"ctype":"const struct (unnamed struct at nhlua.c:2057:14)[9]","staticLocal":false,"initial":[{"name":"COLNO","value":80},{"name":"ROWNO","value":21},{"name":"NUMMONS","value":{"constant":"NUMMONS"}},{"name":"LOW_PM","value":{"constant":"LOW_PM"}},{"name":"HIGH_PM","value":{"constant":"HIGH_PM"}},{"name":"FIRST_OBJECT","value":{"constant":"FIRST_OBJECT"}},{"name":"LAST_OBJECT","value":{"binary":"-","type":"i32","left":{"constant":"NUM_OBJECTS"},"right":1}},{"name":"DLB","value":0},{"name":0,"value":0}]},"nhl_u_functions":{"name":"nhl_u_functions","sourceName":"nhl_u_functions","type":{"array":[3],"of":{"record":"luaL_Reg"}},"ctype":"const struct luaL_Reg[3]","staticLocal":false,"initial":[{"name":"clear_inventory","func":{"function":"nhl_u_clear_inventory"}},{"name":"giveobj","func":{"function":"nhl_u_giveobj"}},{"name":0,"func":0}]},"ct_base_base":{"name":"ct_base_base","sourceName":"ct_base_base","type":{"array":[10],"of":{"record":"e"}},"ctype":"struct e[10]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"ipairs"},{"when":{"constant":"IFFLAG"},"fnname":"next"},{"when":{"constant":"IFFLAG"},"fnname":"pairs"},{"when":{"constant":"IFFLAG"},"fnname":"pcall"},{"when":{"constant":"IFFLAG"},"fnname":"select"},{"when":{"constant":"IFFLAG"},"fnname":"tonumber"},{"when":{"constant":"IFFLAG"},"fnname":"tostring"},{"when":{"constant":"IFFLAG"},"fnname":"type"},{"when":{"constant":"IFFLAG"},"fnname":"xpcall"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_base_error":{"name":"ct_base_error","sourceName":"ct_base_error","type":{"array":[5],"of":{"record":"e"}},"ctype":"struct e[5]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"assert"},{"when":{"constant":"IFFLAG"},"fnname":"error"},{"when":{"constant":"NEVER"},"fnname":"print"},{"when":{"constant":"NEVER"},"fnname":"warn"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_base_meta":{"name":"ct_base_meta","sourceName":"ct_base_meta","type":{"array":[7],"of":{"record":"e"}},"ctype":"struct e[7]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"getmetatable"},{"when":{"constant":"IFFLAG"},"fnname":"rawequal"},{"when":{"constant":"IFFLAG"},"fnname":"rawget"},{"when":{"constant":"IFFLAG"},"fnname":"rawlen"},{"when":{"constant":"IFFLAG"},"fnname":"rawset"},{"when":{"constant":"IFFLAG"},"fnname":"setmetatable"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_base_iffy":{"name":"ct_base_iffy","sourceName":"ct_base_iffy","type":{"array":[2],"of":{"record":"e"}},"ctype":"struct e[2]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"collectgarbage"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_base_unsafe":{"name":"ct_base_unsafe","sourceName":"ct_base_unsafe","type":{"array":[4],"of":{"record":"e"}},"ctype":"struct e[4]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"dofile"},{"when":{"constant":"IFFLAG"},"fnname":"loadfile"},{"when":{"constant":"IFFLAG"},"fnname":"load"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_debug_debug":{"name":"ct_debug_debug","sourceName":"ct_debug_debug","type":{"array":[17],"of":{"record":"e"}},"ctype":"struct e[17]","staticLocal":false,"initial":[{"when":{"constant":"NEVER"},"fnname":"debug"},{"when":{"constant":"IFFLAG"},"fnname":"getuservalue"},{"when":{"constant":"NEVER"},"fnname":"gethook"},{"when":{"constant":"IFFLAG"},"fnname":"getinfo"},{"when":{"constant":"IFFLAG"},"fnname":"getlocal"},{"when":{"constant":"IFFLAG"},"fnname":"getregistry"},{"when":{"constant":"IFFLAG"},"fnname":"getmetatable"},{"when":{"constant":"IFFLAG"},"fnname":"getupvalue"},{"when":{"constant":"IFFLAG"},"fnname":"upvaluejoin"},{"when":{"constant":"IFFLAG"},"fnname":"upvalueid"},{"when":{"constant":"IFFLAG"},"fnname":"setuservalue"},{"when":{"constant":"NEVER"},"fnname":"sethook"},{"when":{"constant":"IFFLAG"},"fnname":"setlocal"},{"when":{"constant":"IFFLAG"},"fnname":"setmetatable"},{"when":{"constant":"IFFLAG"},"fnname":"setupvalue"},{"when":{"constant":"IFFLAG"},"fnname":"setcstacklimit"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_debug_safe":{"name":"ct_debug_safe","sourceName":"ct_debug_safe","type":{"array":[2],"of":{"record":"e"}},"ctype":"struct e[2]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"traceback"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_os_time":{"name":"ct_os_time","sourceName":"ct_os_time","type":{"array":[5],"of":{"record":"e"}},"ctype":"struct e[5]","staticLocal":false,"initial":[{"when":{"constant":"IFFLAG"},"fnname":"clock"},{"when":{"constant":"IFFLAG"},"fnname":"date"},{"when":{"constant":"IFFLAG"},"fnname":"difftime"},{"when":{"constant":"IFFLAG"},"fnname":"time"},{"when":{"constant":"EOT"},"fnname":0}]},"ct_os_files":{"name":"ct_os_files","sourceName":"ct_os_files","type":{"array":[8],"of":{"record":"e"}},"ctype":"struct e[8]","staticLocal":false,"initial":[{"when":{"constant":"NEVER"},"fnname":"execute"},{"when":{"constant":"NEVER"},"fnname":"exit"},{"when":{"constant":"NEVER"},"fnname":"getenv"},{"when":{"constant":"IFFLAG"},"fnname":"remove"},{"when":{"constant":"IFFLAG"},"fnname":"rename"},{"when":{"constant":"NEVER"},"fnname":"setlocale"},{"when":{"constant":"NEVER"},"fnname":"tmpname"},{"when":{"constant":"EOT"},"fnname":0}]},"nhl_get_timertype__timerstr":{"name":"nhl_get_timertype__timerstr","sourceName":"timerstr","type":{"array":[10],"of":{"pointer":"char"}},"ctype":"const char *const[10]","staticLocal":true,"initial":["rot-organic","rot-corpse","revive-mon","zombify-mon","burn-obj","hatch-egg","fig-transform","shrink-glob","melt-ice",0]},"nhl_menu__pickX":{"name":"nhl_menu__pickX","sourceName":"pickX","type":{"array":[3],"of":{"pointer":"char"}},"ctype":"const char *const[3]","staticLocal":true,"initial":["none","one","any"]},"nhl_lua_rnglog_ctx_enabled__enabled":{"name":"nhl_lua_rnglog_ctx_enabled__enabled","sourceName":"enabled","type":"i32","ctype":"int","staticLocal":true,"initial":-1},"nhl_rnglog_set_lua_caller__rnglog_srcbuf":{"name":"nhl_rnglog_set_lua_caller__rnglog_srcbuf","sourceName":"rnglog_srcbuf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"nhl_rnglog_set_lua_caller__rnglog_namebuf":{"name":"nhl_rnglog_set_lua_caller__rnglog_namebuf","sourceName":"rnglog_namebuf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"nhl_rnglog_set_lua_caller__rnglog_name1buf":{"name":"nhl_rnglog_set_lua_caller__rnglog_name1buf","sourceName":"rnglog_name1buf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"nhl_rnglog_set_lua_caller__rnglog_src1buf":{"name":"nhl_rnglog_set_lua_caller__rnglog_src1buf","sourceName":"rnglog_src1buf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"nhl_rnglog_set_lua_caller__rnglog_src2buf":{"name":"nhl_rnglog_set_lua_caller__rnglog_src2buf","sourceName":"rnglog_src2buf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"nhl_rnglog_set_lua_caller__rnglog_parentbuf":{"name":"nhl_rnglog_set_lua_caller__rnglog_parentbuf","sourceName":"rnglog_parentbuf","type":{"array":[256],"of":"i8"},"ctype":"char[256]","staticLocal":true,"initial":null},"get_table_boolean__boolstr":{"name":"get_table_boolean__boolstr","sourceName":"boolstr","type":{"array":[5],"of":{"pointer":"char"}},"ctype":"const char *const[5]","staticLocal":true,"initial":["true","false","yes","no",0]},"nhl_meta_u_index__ustruct":{"name":"nhl_meta_u_index__ustruct","sourceName":"ustruct","type":{"array":[24],"of":{"record":"anonymous_2120_18"}},"ctype":"const struct (unnamed struct at nhlua.c:2120:18)[24]","staticLocal":true,"initial":[{"name":"ux","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"ux"}},"type":{"constant":"ANY_UCHAR"}},{"name":"uy","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uy"}},"type":{"constant":"ANY_UCHAR"}},{"name":"dx","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"dx"}},"type":{"constant":"ANY_SCHAR"}},{"name":"dy","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"dy"}},"type":{"constant":"ANY_SCHAR"}},{"name":"dz","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"dz"}},"type":{"constant":"ANY_SCHAR"}},{"name":"tx","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"tx"}},"type":{"constant":"ANY_UCHAR"}},{"name":"ty","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"ty"}},"type":{"constant":"ANY_UCHAR"}},{"name":"ulevel","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"ulevel"}},"type":{"constant":"ANY_INT"}},{"name":"ulevelmax","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"ulevelmax"}},"type":{"constant":"ANY_INT"}},{"name":"uhunger","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uhunger"}},"type":{"constant":"ANY_INT"}},{"name":"nv_range","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"nv_range"}},"type":{"constant":"ANY_INT"}},{"name":"xray_range","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"xray_range"}},"type":{"constant":"ANY_INT"}},{"name":"umonster","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"umonster"}},"type":{"constant":"ANY_INT"}},{"name":"umonnum","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"umonnum"}},"type":{"constant":"ANY_INT"}},{"name":"mh","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"mh"}},"type":{"constant":"ANY_INT"}},{"name":"mhmax","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"mhmax"}},"type":{"constant":"ANY_INT"}},{"name":"mtimedone","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"mtimedone"}},"type":{"constant":"ANY_INT"}},{"name":"dlevel","ptr":{"address":{"base":{"base":{"global":"u"},"record":"you","field":"uz"},"record":"d_level","field":"dlevel"}},"type":{"constant":"ANY_SCHAR"}},{"name":"dnum","ptr":{"address":{"base":{"base":{"global":"u"},"record":"you","field":"uz"},"record":"d_level","field":"dnum"}},"type":{"constant":"ANY_SCHAR"}},{"name":"uluck","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uluck"}},"type":{"constant":"ANY_SCHAR"}},{"name":"uhp","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uhp"}},"type":{"constant":"ANY_INT"}},{"name":"uhpmax","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uhpmax"}},"type":{"constant":"ANY_INT"}},{"name":"uen","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uen"}},"type":{"constant":"ANY_INT"}},{"name":"uenmax","ptr":{"address":{"base":{"global":"u"},"record":"you","field":"uenmax"}},"type":{"constant":"ANY_INT"}}]}},"constants":{"NUM_NHCORE_CALLS":7,"NHLpa_panic":0,"INVALID_TYPE":127,"NUM_TIME_FUNCS":9,"MAX_TYPE":37,"SQKY_BOARD":4,"ROLLING_BOULDER_TRAP":7,"PIT":11,"SPIKED_PIT":12,"DOOR":23,"ALTAR":32,"THRONE":29,"TREE":13,"FOUNTAIN":28,"SINK":30,"NON_PM":-1,"LOW_PM":0,"HIGH_PM":382,"NEUTRAL":2,"NUM_OBJECTS":481,"NHLpa_impossible":1,"CQ_CANNED":0,"MELT_ICE_AWAY":8,"TIMER_LEVEL":1,"NUM_NHCB":4,"NHCORE_ENTER_TUTORIAL":5,"NHCORE_LEAVE_TUTORIAL":6,"ANY_INT":4,"ANY_UCHAR":6,"ANY_SCHAR":7,"EOT":2,"NEVER":0,"STONE":0,"CORR":24,"ROOM":25,"HWALL":2,"TLCORNER":3,"TRCORNER":4,"BLCORNER":5,"BRCORNER":6,"CROSSWALL":7,"TUWALL":8,"TDWALL":9,"TLWALL":10,"TRWALL":11,"DBWALL":12,"VWALL":1,"AIR":35,"CLOUD":36,"SDOOR":14,"SCORR":15,"MOAT":17,"POOL":16,"LAVAPOOL":20,"LAVAWALL":21,"ICE":33,"WATER":18,"IRONBARS":22,"MATCH_WALL":38,"NUMMONS":383,"FIRST_OBJECT":18,"IFFLAG":1},"fields":[["Role","name"],["RoleName","m"],["anonymous_2057_14","name"],["anonymous_2057_14","value"],["anonymous_2120_18","name"],["anonymous_2120_18","ptr"],["anonymous_2120_18","type"],["anonymous_342_14","ch"],["anonymous_342_14","typ"],["anonymous_473_9","locations"],["anonymous_473_9","monlist"],["any","a_char"],["any","a_int"],["any","a_schar"],["any","a_uchar"],["class_sym","sym"],["const_globals","zeroany"],["d_level","dlevel"],["d_level","dnum"],["dungeon","dname"],["e","fnname"],["e","when"],["flag","debug"],["instance_flags","debug_hunger"],["instance_flags","debug_mongen"],["instance_flags","debug_overwrite_stairs"],["instance_flags","debug_prevent_pline"],["instance_flags","in_lua"],["instance_flags","last_msg"],["instance_globals_g","gmst_disco"],["instance_globals_g","gmst_invent"],["instance_globals_g","gmst_moves"],["instance_globals_g","gmst_mvitals"],["instance_globals_g","gmst_spl_book"],["instance_globals_g","gmst_stored"],["instance_globals_g","gmst_ubak"],["instance_globals_i","in_mklev"],["instance_globals_i","invent"],["instance_globals_l","lastinvnr"],["instance_globals_l","loglua"],["instance_globals_l","lua_copyright"],["instance_globals_l","lua_sid"],["instance_globals_l","lua_ver"],["instance_globals_l","lua_warnbuf"],["instance_globals_l","luacore"],["instance_globals_m","multi"],["instance_globals_s","stairs"],["instance_globals_saved_d","disco"],["instance_globals_saved_d","dungeons"],["instance_globals_saved_l","level"],["instance_globals_saved_m","moves"],["instance_globals_saved_m","mvitals"],["instance_globals_saved_n","n_dgns"],["instance_globals_saved_s","spl_book"],["instance_globals_u","urole"],["lua_Debug","currentline"],["lua_Debug","name"],["lua_Debug","short_src"],["mi","item"],["monst","mhp"],["monst","nmon"],["mvitals","mvflags"],["nhcoord","x"],["nhcoord","y"],["nhl_sandbox_info","flags"],["nhl_sandbox_info","memlimit"],["nhl_sandbox_info","perpcall"],["nhl_sandbox_info","steps"],["nhl_user_data","L"],["nhl_user_data","flags"],["nhl_user_data","jb"],["nhl_user_data","memlimit"],["nhl_user_data","name"],["nhl_user_data","osteps"],["nhl_user_data","perpcall"],["nhl_user_data","sid"],["nhl_user_data","statctr"],["nhl_user_data","steps"],["obj","nobj"],["obj","owornmask"],["objclass","oc_class"],["objclass","oc_name_idx"],["objclass","oc_uname"],["objdescr","oc_name"],["permonst","pmnames"],["rm","candig"],["rm","edge"],["rm","flags"],["rm","glyph"],["rm","horizontal"],["rm","lit"],["rm","roomno"],["rm","seenv"],["rm","typ"],["rm","waslit"],["stairway","isladder"],["stairway","next"],["stairway","sx"],["stairway","sy"],["stairway","tolev"],["stairway","up"],["trap","launch"],["trap","madeby_u"],["trap","once"],["trap","tseen"],["trap","ttyp"],["trap","tx"],["trap","ty"],["trap","vl"],["u_have","amulet"],["vlaunchinfo","v_conjoined"],["vlaunchinfo","v_launch2"],["vlaunchinfo","v_tnote"],["window_procs","win_create_nhwindow"],["window_procs","win_destroy_nhwindow"],["window_procs","win_display_nhwindow"],["window_procs","win_end_menu"],["window_procs","win_start_menu"],["you","dx"],["you","dy"],["you","dz"],["you","mh"],["you","mhmax"],["you","mtimedone"],["you","nv_range"],["you","tx"],["you","ty"],["you","uen"],["you","uenmax"],["you","uhave"],["you","uhp"],["you","uhpmax"],["you","uhunger"],["you","ulevel"],["you","ulevelmax"],["you","uluck"],["you","umonnum"],["you","umonster"],["you","ux"],["you","uy"],["you","uz"],["you","uz0"],["you","xray_range"]],"foreignGlobals":{"gl":{"ctype":"struct instance_globals_l","type":{"record":"instance_globals_l"}},"emptystr":{"ctype":"char[]","type":{"array":[0],"of":"i8"}},"svl":{"ctype":"struct instance_globals_saved_l","type":{"record":"instance_globals_saved_l"}},"WIN_MESSAGE":{"ctype":"winid","type":"i32"},"windowprocs":{"ctype":"volatile struct window_procs","type":{"record":"window_procs"}},"cg":{"ctype":"const struct const_globals","type":{"record":"const_globals"}},"nul_glyphinfo":{"ctype":"const glyph_info","type":{"record":"glyphinfo"}},"svm":{"ctype":"struct instance_globals_saved_m","type":{"record":"instance_globals_saved_m"}},"flags":{"ctype":"struct flag","type":{"record":"flag"}},"svn":{"ctype":"struct instance_globals_saved_n","type":{"record":"instance_globals_saved_n"}},"svd":{"ctype":"struct instance_globals_saved_d","type":{"record":"instance_globals_saved_d"}},"mons":{"ctype":"struct permonst[384]","type":{"array":[384],"of":{"record":"permonst"}}},"obj_descr":{"ctype":"struct objdescr[482]","type":{"array":[482],"of":{"record":"objdescr"}}},"objects":{"ctype":"struct objclass[482]","type":{"array":[482],"of":{"record":"objclass"}}},"def_oc_syms":{"ctype":"const struct class_sym[18]","type":{"array":[18],"of":{"record":"class_sym"}}},"gs":{"ctype":"struct instance_globals_s","type":{"record":"instance_globals_s"}},"gm":{"ctype":"struct instance_globals_m","type":{"record":"instance_globals_m"}},"iflags":{"ctype":"struct instance_flags","type":{"record":"instance_flags"}},"gi":{"ctype":"struct instance_globals_i","type":{"record":"instance_globals_i"}},"nhcb_name":{"ctype":"const char *const[]","type":{"array":[0],"of":{"pointer":"char"}}},"nhcb_counts":{"ctype":"int[]","type":{"array":[0],"of":"i32"}},"u":{"ctype":"struct you","type":{"record":"you"}},"gg":{"ctype":"struct instance_globals_g","type":{"record":"instance_globals_g"}},"svs":{"ctype":"struct instance_globals_saved_s","type":{"record":"instance_globals_saved_s"}},"gu":{"ctype":"struct instance_globals_u","type":{"record":"instance_globals_u"}}},"functions":[{"name":"l_nhcore_init","returnType":"void","parameters":[]},{"name":"l_nhcore_done","returnType":"void","parameters":[]},{"name":"l_nhcore_call","returnType":"void","parameters":[{"name":"callidx","ctype":"int","type":"i32"}]},{"name":"nhl_error","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"msg","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"lcheck_param_table","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"get_table_mapchr","returnType":"schar","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"get_table_mapchr_opt","returnType":"schar","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"defval","ctype":"schar","type":"i8"}]},{"name":"nhl_get_timertype","returnType":"short","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"idx","ctype":"int","type":"i32"}]},{"name":"nhl_add_table_entry_int","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"value","ctype":"lua_Integer","type":"i64"}]},{"name":"nhl_add_table_entry_char","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"value","ctype":"char","type":"i8"}]},{"name":"nhl_add_table_entry_str","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"value","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"nhl_add_table_entry_bool","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"value","ctype":"boolean","type":"i8"}]},{"name":"nhl_add_table_entry_region","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"x1","ctype":"coordxy","type":"i16"},{"name":"y1","ctype":"coordxy","type":"i16"},{"name":"x2","ctype":"coordxy","type":"i16"},{"name":"y2","ctype":"coordxy","type":"i16"}]},{"name":"splev_chr2typ","returnType":"schar","parameters":[{"name":"c","ctype":"char","type":"i8"}]},{"name":"check_mapchr","returnType":"schar","parameters":[{"name":"s","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"splev_typ2chr","returnType":"char","parameters":[{"name":"typ","ctype":"schar","type":"i8"}]},{"name":"nhl_gettrap","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_deltrap","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_get_xy_params","returnType":"boolean","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"x","ctype":"lua_Integer *","type":{"pointer":"lua_Integer"}},{"name":"y","ctype":"lua_Integer *","type":{"pointer":"lua_Integer"}}]},{"name":"nhl_getmap","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_impossible","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_pline","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_verbalize","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_parse_config","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_get_config","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_getlin","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_menu","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_text","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_makeplural","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_makesingular","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_s_suffix","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_ing_suffix","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_an","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_lua_rnglog_ctx_enabled","returnType":"boolean","parameters":[]},{"name":"nhl_rnglog_set_lua_caller","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"fallback","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"nhl_rn2","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_random","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_level_difficulty","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_is_genocided","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_get_debug_themerm_name","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"get_table_int","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"get_table_int_opt","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"defval","ctype":"int","type":"i32"}]},{"name":"get_table_str","returnType":"char *","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"get_table_str_opt","returnType":"char *","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"defval","ctype":"char *","type":{"pointer":"char"}}]},{"name":"get_table_boolean","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"get_table_boolean_opt","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"defval","ctype":"int","type":"i32"}]},{"name":"get_table_option","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"defval","ctype":"const char *","type":{"pointer":"char"}},{"name":"opts","ctype":"const char *const *","type":{"pointer":"char *"}}]},{"name":"nhl_dnum_name","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_int_to_pm_name","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_int_to_obj_name","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_variable","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"get_nh_lua_variables","returnType":"char *","parameters":[]},{"name":"save_luadata","returnType":"void","parameters":[{"name":"nhfp","ctype":"NHFILE *","type":{"pointer":"NHFILE"}}]},{"name":"restore_luadata","returnType":"void","parameters":[{"name":"nhfp","ctype":"NHFILE *","type":{"pointer":"NHFILE"}}]},{"name":"nhl_stairways","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_test","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_pushkey","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_doturn","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_debug_flags","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_flip_level","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_timer_has_at","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_timer_peek_at","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_timer_stop_at","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_timer_start_at","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_get_cmd_key","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_callback","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_gamestate","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"free_tutorial","returnType":"void","parameters":[]},{"name":"tutorial","returnType":"void","parameters":[{"name":"entering","ctype":"boolean","type":"i8"}]},{"name":"init_nhc_data","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_push_anything","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"anytype","ctype":"int","type":"i32"},{"name":"src","ctype":"void *","type":{"pointer":"void"}}]},{"name":"nhl_meta_u_index","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_meta_u_newindex","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_u_clear_inventory","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_u_giveobj","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"init_u_data","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"traceback_handler","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_getmeminuse","returnType":"uint32_t","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_pcall","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"nargs","ctype":"int","type":"i32"},{"name":"nresults","ctype":"int","type":"i32"},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"nhl_pcall_handle","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"nargs","ctype":"int","type":"i32"},{"name":"nresults","ctype":"int","type":"i32"},{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"npa","ctype":"NHL_pcall_action","type":"u32"}]},{"name":"nhl_loadlua","returnType":"boolean","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"fname","ctype":"const char *","type":{"pointer":"char"}}]},{"name":"nhl_init","returnType":"lua_State *","parameters":[{"name":"sbi","ctype":"nhl_sandbox_info *","type":{"pointer":"nhl_sandbox_info"}}]},{"name":"nhl_done","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"load_lua","returnType":"boolean","parameters":[{"name":"name","ctype":"const char *","type":{"pointer":"char"}},{"name":"sbi","ctype":"nhl_sandbox_info *","type":{"pointer":"nhl_sandbox_info"}}]},{"name":"get_lua_version","returnType":"const char *","parameters":[]},{"name":"nhl_clearfromtable","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"flag","ctype":"int","type":"i32"},{"name":"tndx","ctype":"int","type":"i32"},{"name":"todo","ctype":"struct e *","type":{"pointer":"struct e"}}]},{"name":"end_luapat","returnType":"void","parameters":[]},{"name":"nhl_pushhooked_open_table","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhlL_openlibs","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"lflags","ctype":"uint32_t","type":"u32"}]},{"name":"nhl_alloc","returnType":"void *","parameters":[{"name":"ud","ctype":"void *","type":{"pointer":"void"}},{"name":"ptr","ctype":"void *","type":{"pointer":"void"}},{"name":"osize","ctype":"size_t","type":"u64"},{"name":"nsize","ctype":"size_t","type":"u64"}]},{"name":"nhl_panic","returnType":"int","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}}]},{"name":"nhl_warn","returnType":"void","parameters":[{"name":"userdata","ctype":"void *","type":{"pointer":"void"}},{"name":"msg_fragment","ctype":"const char *","type":{"pointer":"char"}},{"name":"to_be_continued","ctype":"int","type":"i32"}]},{"name":"nhl_hookfn","returnType":"void","parameters":[{"name":"L","ctype":"lua_State *","type":{"pointer":"lua_State"}},{"name":"ar","ctype":"lua_Debug *","type":{"pointer":"lua_Debug"}}]},{"name":"nhlL_newstate","returnType":"lua_State *","parameters":[{"name":"sbi","ctype":"nhl_sandbox_info *","type":{"pointer":"nhl_sandbox_info"}},{"name":"name","ctype":"const char *","type":{"pointer":"char"}}]}],"callSites":[{"name":"impossible","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_getstack","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, int, lua_Debug *)","argumentTypes":["lua_State *","int","lua_Debug *"],"returnType":"int"},{"name":"lua_getinfo","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, const char *, lua_Debug *)","argumentTypes":["lua_State *","const char *","lua_Debug *"],"returnType":"int"},{"name":"sprintf","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"int (char *restrict, const char *restrict, ...)","argumentTypes":["char *","const char *","const char *","int"],"returnType":"int"},{"name":"eos","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(char *)","argumentTypes":["char *"],"returnType":"char *"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"sprintf","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"int (char *restrict, const char *restrict, ...)","argumentTypes":["char *","const char *","int","char *"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_error","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *) __attribute__((noreturn))","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_checktype","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"luaL_checkoption","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"char *"}],"ctype":"int (lua_State *, int, const char *, const char *const *)","argumentTypes":["lua_State *","int","const char *","const char *const *"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"sprintf","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"int (char *restrict, const char *restrict, ...)","argumentTypes":["char *","const char *","int"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"t_at","return":{"pointer":"struct trap"},"args":["i16","i16"],"ctype":"struct trap *(coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"struct trap *"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"get_trapname_bytype","return":{"pointer":"char"},"args":["i32"],"ctype":"const char *(int)","argumentTypes":["int"],"returnType":"const char *"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"t_at","return":{"pointer":"struct trap"},"args":["i16","i16"],"ctype":"struct trap *(coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"struct trap *"},{"name":"deltrap","return":"void","args":[{"pointer":"struct trap"}],"ctype":"void (struct trap *)","argumentTypes":["struct trap *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"get_coord","return":"i8","args":[{"pointer":"lua_State"},"i32",{"pointer":"lua_Integer"},{"pointer":"lua_Integer"}],"ctype":"boolean (lua_State *, int, lua_Integer *, lua_Integer *)","argumentTypes":["lua_State *","int","lua_Integer *","lua_Integer *"],"returnType":"signed char"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"levltyp_to_name","return":{"pointer":"char"},"args":["i32"],"ctype":"const char *(int)","argumentTypes":["int"],"returnType":"const char *"},{"name":"sprintf","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"int (char *restrict, const char *restrict, ...)","argumentTypes":["char *","const char *","int"],"returnType":"int"},{"name":"t_at","return":{"pointer":"struct trap"},"args":["i16","i16"],"ctype":"struct trap *(coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"struct trap *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_settable","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","const char *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"pline","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","const char *"],"returnType":"void"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"indirect":true,"return":"void","args":["i32","i8"],"ctype":"void (*)(winid, boolean)","argumentTypes":["int","signed char"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"verbalize","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","const char *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"parse_conf_str","return":"i8","args":[{"pointer":"char"},{"pointer":"function"}],"ctype":"boolean (const char *, boolean (*)(char *))","argumentTypes":["const char *","boolean (*)(char *)"],"returnType":"signed char"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"get_option_value","return":{"pointer":"char"},"args":[{"pointer":"char"},"i8"],"ctype":"char *(const char *, boolean)","argumentTypes":["const char *","signed char"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"getlin","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, char *)","argumentTypes":["const char *","char *"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_isstring","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_isstring","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checkoption","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"char *"}],"ctype":"int (lua_State *, int, const char *, const char *const *)","argumentTypes":["lua_State *","int","const char *","const char *const *"],"returnType":"int"},{"name":"luaL_checktype","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"indirect":true,"return":"i32","args":["i32"],"ctype":"winid (*)(int)","argumentTypes":["int"],"returnType":"int"},{"indirect":true,"return":"void","args":["i32","u64"],"ctype":"void (*)(winid, unsigned long)","argumentTypes":["int","unsigned long"],"returnType":"void"},{"name":"lua_pushnil","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_next","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettable","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettable","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_isstring","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"add_menu","return":"void","args":["i32",{"pointer":"glyph_info"},{"pointer":"union any"},"i8","i8","i32","i32",{"pointer":"char"},"u32"],"ctype":"void (winid, const glyph_info *, const union any *, char, char, int, int, const char *, unsigned int)","argumentTypes":["int","const glyph_info *","const union any *","char","char","int","int","const char *","unsigned int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"indirect":true,"return":"void","args":["i32",{"pointer":"char"}],"ctype":"void (*)(winid, const char *)","argumentTypes":["int","const char *"],"returnType":"void"},{"name":"select_menu","return":"i32","args":["i32","i32",{"pointer":"menu_item *"}],"ctype":"int (winid, int, menu_item **)","argumentTypes":["int","int","menu_item **"],"returnType":"int"},{"indirect":true,"return":"void","args":["i32"],"ctype":"void (*)(winid)","argumentTypes":["int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"indirect":true,"return":"i32","args":["i32"],"ctype":"winid (*)(int)","argumentTypes":["int"],"returnType":"int"},{"indirect":true,"return":"void","args":["i32","u64"],"ctype":"void (*)(winid, unsigned long)","argumentTypes":["int","unsigned long"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"dupstr","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strchr","return":{"pointer":"char"},"args":[{"pointer":"char"},"i32"],"ctype":"char *(const char *, int)","argumentTypes":["const char *","int"],"returnType":"char *"},{"name":"add_menu_str","return":"void","args":["i32",{"pointer":"char"}],"ctype":"void (winid, const char *)","argumentTypes":["int","const char *"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"indirect":true,"return":"void","args":["i32",{"pointer":"char"}],"ctype":"void (*)(winid, const char *)","argumentTypes":["int","const char *"],"returnType":"void"},{"name":"select_menu","return":"i32","args":["i32","i32",{"pointer":"menu_item *"}],"ctype":"int (winid, int, menu_item **)","argumentTypes":["int","int","menu_item **"],"returnType":"int"},{"indirect":true,"return":"void","args":["i32"],"ctype":"void (*)(winid)","argumentTypes":["int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"makeplural","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"makesingular","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"s_suffix","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"ing_suffix","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"an","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"getenv","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"getenv","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","char *"],"returnType":"void"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","char *"],"returnType":"void"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","char *"],"returnType":"void"},{"name":"lua_getstack","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, int, lua_Debug *)","argumentTypes":["lua_State *","int","lua_Debug *"],"returnType":"int"},{"name":"lua_getinfo","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, const char *, lua_Debug *)","argumentTypes":["lua_State *","const char *","lua_Debug *"],"returnType":"int"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strncmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"u64"],"ctype":"int (const char *, const char *, unsigned long)","argumentTypes":["const char *","const char *","unsigned long"],"returnType":"int"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","int","const char *"],"returnType":"void"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","const char *"],"returnType":"void"},{"name":"lua_getstack","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, int, lua_Debug *)","argumentTypes":["lua_State *","int","lua_Debug *"],"returnType":"int"},{"name":"lua_getinfo","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"lua_Debug"}],"ctype":"int (lua_State *, const char *, lua_Debug *)","argumentTypes":["lua_State *","const char *","lua_Debug *"],"returnType":"int"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strncmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"u64"],"ctype":"int (const char *, const char *, unsigned long)","argumentTypes":["const char *","const char *","unsigned long"],"returnType":"int"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","int","const char *"],"returnType":"void"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","const char *"],"returnType":"void"},{"name":"nh_snprintf","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"},{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, int, char *, size_t, const char *, ...)","argumentTypes":["const char *","int","char *","unsigned long","const char *","const char *","char *","int","const char *"],"returnType":"void"},{"name":"rng_log_set_caller","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, int, const char *)","argumentTypes":["const char *","int","const char *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"rn2","return":"i32","args":["i32"],"ctype":"int (int)","argumentTypes":["int"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"rn2","return":"i32","args":["i32"],"ctype":"int (int)","argumentTypes":["int"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"rn2","return":"i32","args":["i32"],"ctype":"int (int)","argumentTypes":["int"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"level_difficulty","return":"i16","args":[],"ctype":"xint16 (void)","argumentTypes":[],"returnType":"short"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"name_to_mon","return":"i32","args":[{"pointer":"char"},{"pointer":"int"}],"ctype":"int (const char *, int *)","argumentTypes":["const char *","int *"],"returnType":"int"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"getenv","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushnil","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"dupstr","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_optlstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, const char *, size_t *)","argumentTypes":["lua_State *","int","const char *","size_t *"],"returnType":"const char *"},{"name":"luaL_optlstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, const char *, size_t *)","argumentTypes":["lua_State *","int","const char *","size_t *"],"returnType":"const char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"dupstr","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checkoption","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"char *"}],"ctype":"int (lua_State *, int, const char *, const char *const *)","argumentTypes":["lua_State *","int","const char *","const char *const *"],"returnType":"int"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"luaL_checkoption","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"},{"pointer":"char *"}],"ctype":"int (lua_State *, int, const char *, const char *const *)","argumentTypes":["lua_State *","int","const char *","const char *const *"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checkinteger","return":"i64","args":[{"pointer":"lua_State"},"i32"],"ctype":"lua_Integer (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"long long"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"panic","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"impossible","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *"],"returnType":"void"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushnil","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_pushvalue","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_loadstring","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_pushnil","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushvalue","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_loadstring","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"panic","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_type","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"dupstr","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"dupstr","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"Strlen_","return":"u32","args":[{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"unsigned int (const char *, const char *, int)","argumentTypes":["const char *","const char *","int"],"returnType":"unsigned int"},{"name":"sfo_unsigned","return":"void","args":[{"pointer":"NHFILE"},{"pointer":"unsigned int"},{"pointer":"char"}],"ctype":"void (NHFILE *, unsigned int *, const char *)","argumentTypes":["NHFILE *","unsigned int *","const char *"],"returnType":"void"},{"name":"sfo_char","return":"void","args":[{"pointer":"NHFILE"},{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"void (NHFILE *, char *, const char *, int)","argumentTypes":["NHFILE *","char *","const char *","int"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"sfi_unsigned","return":"void","args":[{"pointer":"NHFILE"},{"pointer":"unsigned int"},{"pointer":"char"}],"ctype":"void (NHFILE *, unsigned int *, const char *)","argumentTypes":["NHFILE *","unsigned int *","const char *"],"returnType":"void"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"sfi_char","return":"void","args":[{"pointer":"NHFILE"},{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"void (NHFILE *, char *, const char *, int)","argumentTypes":["NHFILE *","char *","const char *","int"],"returnType":"void"},{"name":"luaL_loadstring","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_settable","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_checktype","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"pline","return":"void","args":[{"pointer":"char"},"i32","i32",{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","int","int","char *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"cmdq_add_key","return":"void","args":["i32","i8"],"ctype":"void (int, char)","argumentTypes":["int","char"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"moveloop_core","return":"void","args":[],"ctype":"void (void)","argumentTypes":[],"returnType":"void"},{"name":"mongone","return":"void","args":[{"pointer":"struct monst"}],"ctype":"void (struct monst *)","argumentTypes":["struct monst *"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"flip_level","return":"void","args":["i32","i8"],"ctype":"void (int, boolean)","argumentTypes":["int","signed char"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"spot_time_expires","return":"i64","args":["i16","i16","i16"],"ctype":"long (coordxy, coordxy, short)","argumentTypes":["short","short","short"],"returnType":"long"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"spot_time_expires","return":"i64","args":["i16","i16","i16"],"ctype":"long (coordxy, coordxy, short)","argumentTypes":["short","short","short"],"returnType":"long"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"spot_stop_timers","return":"void","args":["i16","i16","i16"],"ctype":"void (coordxy, coordxy, short)","argumentTypes":["short","short","short"],"returnType":"void"},{"name":"lua_tointegerx","return":"i64","args":[{"pointer":"lua_State"},"i32",{"pointer":"int"}],"ctype":"lua_Integer (lua_State *, int, int *)","argumentTypes":["lua_State *","int","int *"],"returnType":"long long"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"cvt_to_abscoord","return":"void","args":[{"pointer":"coordxy"},{"pointer":"coordxy"}],"ctype":"void (coordxy *, coordxy *)","argumentTypes":["coordxy *","coordxy *"],"returnType":"void"},{"name":"isok","return":"i32","args":["i16","i16"],"ctype":"int (coordxy, coordxy)","argumentTypes":["short","short"],"returnType":"int"},{"name":"spot_stop_timers","return":"void","args":["i16","i16","i16"],"ctype":"void (coordxy, coordxy, short)","argumentTypes":["short","short","short"],"returnType":"void"},{"name":"long_to_any","return":{"pointer":"anything"},"args":["i64"],"ctype":"anything *(long)","argumentTypes":["long"],"returnType":"anything *"},{"name":"start_timer","return":"i8","args":["i64","i16","i16",{"pointer":"anything"}],"ctype":"boolean (long, short, short, union any *)","argumentTypes":["long","short","short","anything *"],"returnType":"signed char"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"cmd_from_ecname","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"panic","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *"],"returnType":"void"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"impossible","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_toboolean","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"debugcore","return":"i8","args":[{"pointer":"char"},"i8"],"ctype":"boolean (const char *, boolean)","argumentTypes":["const char *","signed char"],"returnType":"signed char"},{"name":"pline","return":"void","args":[{"pointer":"char"},"i32","i32","i32","i32"],"ctype":"void (const char *, ...)","argumentTypes":["const char *","int","int","int","int"],"returnType":"void"},{"name":"pline","return":"void","args":[{"pointer":"char"},"i64"],"ctype":"void (const char *, ...)","argumentTypes":["const char *","long"],"returnType":"void"},{"name":"useupall","return":"void","args":[{"pointer":"struct obj"}],"ctype":"void (struct obj *)","argumentTypes":["struct obj *"],"returnType":"void"},{"name":"extract_nobj","return":"void","args":[{"pointer":"struct obj"},{"pointer":"struct obj *"}],"ctype":"void (struct obj *, struct obj **)","argumentTypes":["struct obj *","struct obj **"],"returnType":"void"},{"name":"addinv_nomerge","return":{"pointer":"struct obj"},"args":[{"pointer":"struct obj"}],"ctype":"struct obj *(struct obj *)","argumentTypes":["struct obj *"],"returnType":"struct obj *"},{"name":"setworn","return":"void","args":[{"pointer":"struct obj"},"i64"],"ctype":"void (struct obj *, long)","argumentTypes":["struct obj *","long"],"returnType":"void"},{"name":"__assert_fail","return":"void","args":[{"pointer":"char"},{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, const char *, int, const char *)","argumentTypes":["const char *","const char *","int","const char *"],"returnType":"void"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"__assert_fail","return":"void","args":[{"pointer":"char"},{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, const char *, int, const char *)","argumentTypes":["const char *","const char *","int","const char *"],"returnType":"void"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"__assert_fail","return":"void","args":[{"pointer":"char"},{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, const char *, int, const char *)","argumentTypes":["const char *","const char *","int","const char *"],"returnType":"void"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"init_uhunger","return":"void","args":[],"ctype":"void (void)","argumentTypes":[],"returnType":"void"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"setnotworn","return":"void","args":[{"pointer":"struct obj"}],"ctype":"void (struct obj *)","argumentTypes":["struct obj *"],"returnType":"void"},{"name":"freeinv","return":"void","args":[{"pointer":"struct obj"}],"ctype":"void (struct obj *)","argumentTypes":["struct obj *"],"returnType":"void"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"memcpy","return":{"pointer":"void"},"args":[{"pointer":"void"},{"pointer":"void"},"u64"],"ctype":"void *(void *, const void *, unsigned long)","argumentTypes":["void *","const void *","unsigned long"],"returnType":"void *"},{"name":"memset","return":{"pointer":"void"},"args":[{"pointer":"void"},"i32","u64"],"ctype":"void *(void *, int, unsigned long)","argumentTypes":["void *","int","unsigned long"],"returnType":"void *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","char *","char *"],"returnType":"void"},{"name":"update_inventory","return":"void","args":[],"ctype":"void (void)","argumentTypes":[],"returnType":"void"},{"name":"extract_nobj","return":"void","args":[{"pointer":"struct obj"},{"pointer":"struct obj *"}],"ctype":"void (struct obj *, struct obj **)","argumentTypes":["struct obj *","struct obj **"],"returnType":"void"},{"name":"obfree","return":"void","args":[{"pointer":"struct obj"},{"pointer":"struct obj"}],"ctype":"void (struct obj *, struct obj *)","argumentTypes":["struct obj *","struct obj *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_rawset","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_setglobal","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"void (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"void"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"luaL_checklstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"nhl_push_obj","return":"void","args":[{"pointer":"lua_State"},{"pointer":"struct obj"}],"ctype":"void (lua_State *, struct obj *)","argumentTypes":["lua_State *","struct obj *"],"returnType":"void"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"lua_pushstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"const char *(lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"const char *"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"depth","return":"i8","args":[{"pointer":"d_level"}],"ctype":"schar (d_level *)","argumentTypes":["d_level *"],"returnType":"signed char"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"strcmp","return":"i32","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"int (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"int"},{"name":"Invocation_lev","return":"i8","args":[{"pointer":"d_level"}],"ctype":"boolean (d_level *)","argumentTypes":["d_level *"],"returnType":"signed char"},{"name":"lua_pushboolean","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"useupall","return":"void","args":[{"pointer":"struct obj"}],"ctype":"void (struct obj *)","argumentTypes":["struct obj *"],"returnType":"void"},{"name":"nhl_obj_u_giveobj","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"luaL_setfuncs","return":"void","args":[{"pointer":"lua_State"},{"pointer":"struct luaL_Reg"},"i32"],"ctype":"void (lua_State *, const luaL_Reg *, int)","argumentTypes":["lua_State *","const struct luaL_Reg *","int"],"returnType":"void"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_pushcclosure","return":"void","args":[{"pointer":"lua_State"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, lua_CFunction, int)","argumentTypes":["lua_State *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_pushcclosure","return":"void","args":[{"pointer":"lua_State"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, lua_CFunction, int)","argumentTypes":["lua_State *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_setmetatable","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_setglobal","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"void (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"void"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"luaL_traceback","return":"void","args":[{"pointer":"lua_State"},{"pointer":"lua_State"},{"pointer":"char"},"i32"],"ctype":"void (lua_State *, lua_State *, const char *, int)","argumentTypes":["lua_State *","lua_State *","const char *","int"],"returnType":"void"},{"name":"lua_gc","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int, ...)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_gc","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int, ...)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_pushcclosure","return":"void","args":[{"pointer":"lua_State"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, lua_CFunction, int)","argumentTypes":["lua_State *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_rotate","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_getallocf","return":{"pointer":"function"},"args":[{"pointer":"lua_State"},{"pointer":"void *"}],"ctype":"lua_Alloc (lua_State *, void **)","argumentTypes":["lua_State *","void **"],"returnType":"void *(*)(void *, void *, size_t, size_t)"},{"name":"panic","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *","int","const char *"],"returnType":"void"},{"name":"lua_pcallk","return":"i32","args":[{"pointer":"lua_State"},"i32","i32","i32","i64",{"pointer":"function"}],"ctype":"int (lua_State *, int, int, int, lua_KContext, lua_KFunction)","argumentTypes":["lua_State *","int","int","int","long","int (*)(lua_State *, int, lua_KContext)"],"returnType":"int"},{"name":"lua_rotate","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"livelog_printf","return":"void","args":["i64",{"pointer":"char"},"i32",{"pointer":"char"},"i64"],"ctype":"void (long, const char *, ...)","argumentTypes":["long","const char *","int","const char *","long"],"returnType":"void"},{"name":"livelog_printf","return":"void","args":["i64",{"pointer":"char"},"i32",{"pointer":"char"},"u64"],"ctype":"void (long, const char *, ...)","argumentTypes":["long","const char *","int","const char *","unsigned long"],"returnType":"void"},{"name":"lua_getallocf","return":{"pointer":"function"},"args":[{"pointer":"lua_State"},{"pointer":"void *"}],"ctype":"lua_Alloc (lua_State *, void **)","argumentTypes":["lua_State *","void **"],"returnType":"void *(*)(void *, void *, size_t, size_t)"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"panic","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *","int","const char *","const char *"],"returnType":"void"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},"i32",{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","int","const char *","const char *"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"Strlen_","return":"u32","args":[{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"unsigned int (const char *, const char *, int)","argumentTypes":["const char *","const char *","int"],"returnType":"unsigned int"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"sprintf","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},{"pointer":"char"}],"ctype":"int (char *restrict, const char *restrict, ...)","argumentTypes":["char *","const char *","const char *"],"returnType":"int"},{"name":"fopen","return":{"pointer":"FILE"},"args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"FILE *(const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"FILE *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","char *"],"returnType":"void"},{"name":"fseek","return":"i32","args":[{"pointer":"FILE"},"i64","i32"],"ctype":"int (FILE *, long, int)","argumentTypes":["FILE *","long","int"],"returnType":"int"},{"name":"ftell","return":"i64","args":[{"pointer":"FILE"}],"ctype":"long (FILE *)","argumentTypes":["FILE *"],"returnType":"long"},{"name":"fseek","return":"i32","args":[{"pointer":"FILE"},"i64","i32"],"ctype":"int (FILE *, long, int)","argumentTypes":["FILE *","long","int"],"returnType":"int"},{"name":"FITSint_","return":"i32","args":["i64",{"pointer":"char"},"i32"],"ctype":"int (long long, const char *, int)","argumentTypes":["long long","const char *","int"],"returnType":"int"},{"name":"alloc","return":{"pointer":"long"},"args":["u32"],"ctype":"long *(unsigned int)","argumentTypes":["unsigned int"],"returnType":"long *"},{"name":"fread","return":"u64","args":[{"pointer":"void"},"u64","u64",{"pointer":"FILE"}],"ctype":"unsigned long (void *, unsigned long, unsigned long, FILE *)","argumentTypes":["void *","unsigned long","unsigned long","FILE *"],"returnType":"unsigned long"},{"name":"strchr","return":{"pointer":"char"},"args":[{"pointer":"char"},"i32"],"ctype":"char *(const char *, int)","argumentTypes":["const char *","int"],"returnType":"char *"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"eos","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(char *)","argumentTypes":["char *"],"returnType":"char *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","char *"],"returnType":"void"},{"name":"fclose","return":"i32","args":[{"pointer":"FILE"}],"ctype":"int (FILE *)","argumentTypes":["FILE *"],"returnType":"int"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"luaL_loadbufferx","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"},"u64",{"pointer":"char"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *, size_t, const char *, const char *)","argumentTypes":["lua_State *","const char *","unsigned long","const char *","const char *"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"impossible","return":"void","args":[{"pointer":"char"},{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *","char *","const char *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"panic","return":"void","args":[{"pointer":"char"},"i32","i32"],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *","int","int"],"returnType":"void"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"luaL_setfuncs","return":"void","args":[{"pointer":"lua_State"},{"pointer":"struct luaL_Reg"},"i32"],"ctype":"void (lua_State *, const luaL_Reg *, int)","argumentTypes":["lua_State *","const struct luaL_Reg *","int"],"returnType":"void"},{"name":"lua_setglobal","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"void (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"void"},{"name":"l_selection_register","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"l_register_des","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"l_obj_register","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_setglobal","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"void (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"void"},{"name":"lua_getallocf","return":{"pointer":"function"},"args":[{"pointer":"lua_State"},{"pointer":"void *"}],"ctype":"lua_Alloc (lua_State *, void **)","argumentTypes":["lua_State *","void **"],"returnType":"void *(*)(void *, void *, size_t, size_t)"},{"name":"livelog_printf","return":"void","args":["i64",{"pointer":"char"},"i32",{"pointer":"char"},"i64"],"ctype":"void (long, const char *, ...)","argumentTypes":["long","const char *","int","const char *","long"],"returnType":"void"},{"name":"livelog_printf","return":"void","args":["i64",{"pointer":"char"},"i32",{"pointer":"char"},"u64"],"ctype":"void (long, const char *, ...)","argumentTypes":["long","const char *","int","const char *","unsigned long"],"returnType":"void"},{"name":"lua_close","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_isstring","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"lua_getglobal","return":"i32","args":[{"pointer":"lua_State"},{"pointer":"char"}],"ctype":"int (lua_State *, const char *)","argumentTypes":["lua_State *","const char *"],"returnType":"int"},{"name":"lua_isstring","return":"i32","args":[{"pointer":"lua_State"},"i32"],"ctype":"int (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"int"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strncmpi","return":"i32","args":[{"pointer":"char"},{"pointer":"char"},"i32"],"ctype":"int (const char *, const char *, int)","argumentTypes":["const char *","const char *","int"],"returnType":"int"},{"name":"strcpy","return":{"pointer":"char"},"args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"char *(char *, const char *)","argumentTypes":["char *","const char *"],"returnType":"char *"},{"name":"strcpy","return":{"pointer":"char"},"args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"char *(char *, const char *)","argumentTypes":["char *","const char *"],"returnType":"char *"},{"name":"lua_pushnil","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"lua_close","return":"void","args":[{"pointer":"lua_State"}],"ctype":"void (lua_State *)","argumentTypes":["lua_State *"],"returnType":"void"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_createtable","return":"void","args":[{"pointer":"lua_State"},"i32","i32"],"ctype":"void (lua_State *, int, int)","argumentTypes":["lua_State *","int","int"],"returnType":"void"},{"name":"lua_pushvalue","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"lua_setfield","return":"void","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"void (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"nh_getenv","return":{"pointer":"char"},"args":[{"pointer":"char"}],"ctype":"char *(const char *)","argumentTypes":["const char *"],"returnType":"char *"},{"name":"strtoul","return":"u64","args":[{"pointer":"char"},{"pointer":"char *"},"i32"],"ctype":"unsigned long (const char *, char **, int)","argumentTypes":["const char *","char **","int"],"returnType":"unsigned long"},{"name":"lua_getfield","return":"i32","args":[{"pointer":"lua_State"},"i32",{"pointer":"char"}],"ctype":"int (lua_State *, int, const char *)","argumentTypes":["lua_State *","int","const char *"],"returnType":"int"},{"name":"lua_pushinteger","return":"void","args":[{"pointer":"lua_State"},"i64"],"ctype":"void (lua_State *, lua_Integer)","argumentTypes":["lua_State *","long long"],"returnType":"void"},{"name":"lua_callk","return":"void","args":[{"pointer":"lua_State"},"i32","i32","i64",{"pointer":"function"}],"ctype":"void (lua_State *, int, int, lua_KContext, lua_KFunction)","argumentTypes":["lua_State *","int","int","long","int (*)(lua_State *, int, lua_KContext)"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"luaL_requiref","return":"void","args":[{"pointer":"lua_State"},{"pointer":"char"},{"pointer":"function"},"i32"],"ctype":"void (lua_State *, const char *, lua_CFunction, int)","argumentTypes":["lua_State *","const char *","int (*)(lua_State *)","int"],"returnType":"void"},{"name":"lua_gettop","return":"i32","args":[{"pointer":"lua_State"}],"ctype":"int (lua_State *)","argumentTypes":["lua_State *"],"returnType":"int"},{"name":"lua_settop","return":"void","args":[{"pointer":"lua_State"},"i32"],"ctype":"void (lua_State *, int)","argumentTypes":["lua_State *","int"],"returnType":"void"},{"name":"free","return":"void","args":[{"pointer":"void"}],"ctype":"void (void *)","argumentTypes":["void *"],"returnType":"void"},{"name":"re_alloc","return":{"pointer":"long"},"args":[{"pointer":"long"},"u32"],"ctype":"long *(long *, unsigned int)","argumentTypes":["long *","unsigned int"],"returnType":"long *"},{"name":"lua_tolstring","return":{"pointer":"char"},"args":[{"pointer":"lua_State"},"i32",{"pointer":"size_t"}],"ctype":"const char *(lua_State *, int, size_t *)","argumentTypes":["lua_State *","int","size_t *"],"returnType":"const char *"},{"name":"panic","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *","const char *"],"returnType":"void"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strlen","return":"u64","args":[{"pointer":"char"}],"ctype":"unsigned long (const char *)","argumentTypes":["const char *"],"returnType":"unsigned long"},{"name":"strncat","return":{"pointer":"char"},"args":[{"pointer":"char"},{"pointer":"char"},"u64"],"ctype":"char *(char *, const char *, unsigned long)","argumentTypes":["char *","const char *","unsigned long"],"returnType":"char *"},{"name":"paniclog","return":"void","args":[{"pointer":"char"},{"pointer":"char"}],"ctype":"void (const char *, const char *)","argumentTypes":["const char *","const char *"],"returnType":"void"},{"name":"lua_getallocf","return":{"pointer":"function"},"args":[{"pointer":"lua_State"},{"pointer":"void *"}],"ctype":"lua_Alloc (lua_State *, void **)","argumentTypes":["lua_State *","void **"],"returnType":"void *(*)(void *, void *, size_t, size_t)"},{"name":"lua_newstate","return":{"pointer":"lua_State"},"args":[{"pointer":"function"},{"pointer":"void"}],"ctype":"lua_State *(lua_Alloc, void *)","argumentTypes":["void *(*)(void *, void *, size_t, size_t)","void *"],"returnType":"lua_State *"},{"name":"panic","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...) __attribute__((noreturn))","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_atpanic","return":{"pointer":"function"},"args":[{"pointer":"lua_State"},{"pointer":"function"}],"ctype":"lua_CFunction (lua_State *, lua_CFunction)","argumentTypes":["lua_State *","int (*)(lua_State *)"],"returnType":"int (*)(lua_State *)"},{"name":"lua_setwarnf","return":"void","args":[{"pointer":"lua_State"},{"pointer":"function"},{"pointer":"void"}],"ctype":"void (lua_State *, lua_WarnFunction, void *)","argumentTypes":["lua_State *","void (*)(void *, const char *, int)","void *"],"returnType":"void"},{"name":"impossible","return":"void","args":[{"pointer":"char"}],"ctype":"void (const char *, ...)","argumentTypes":["const char *"],"returnType":"void"},{"name":"lua_sethook","return":"void","args":[{"pointer":"lua_State"},{"pointer":"function"},"i32","i32"],"ctype":"void (lua_State *, lua_Hook, int, int)","argumentTypes":["lua_State *","void (*)(lua_State *, lua_Debug *)","int","int"],"returnType":"void"}],"literals":["","%.*s","%.*s)","%c","%s","%s (line %d ","%s src=%s:%d parent=%s","(%s)","(%s) line too long","(unknown)","0","COLNO","Cannot get variable of that type","Cannot set u table values","Cannot set variable of that type","Coordinates out of range","DLB","Erroneous map char","Expected a boolean","Expected an integer parameter","FIRST_OBJECT","HIGH_PM","Incorrect arguments","LAST_OBJECT","LOW_PM","LUASTATS DMEM %d:%s %lu","LUASTATS DONE %d:%s %ld","LUASTATS PCAL %d:%s %ld","LUASTATS PMEM %d:%s %lu","Lua","Lua 5.4","Lua 5.4.8","Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio","Lua error %d:%s %s","Lua error: %d:%s %s","Lua time exceeded %d:%s","NETHACK_LUA_RNGLOG_CTX","NETHACK_RNGLOG","NETHACK_SEED","NULL lua_newstate","NUMMONS","No trap at location","Player","ROWNO","Resetting time to move #%ld.","TEST:{ x=%i, y=%i, name=\"%s\" }","THEMERM","THEMERMFILL","Unknown timer type","Unknown u table index","Wrong args","Wrong number of arguments","[lua]","[string \"","_G","_RELEASE","_VERSION","__index","__newindex","abscoord","already stored","an","any","assert","broken","burn-obj","callback","candig","clear_inventory","clock","closed","collectgarbage","conjoined","coroutine","date","debug","debug_flags","debug_themerm","debug_themerm should have 1 boolean arg","deltrap","depth","difftime","dishwasher","dlevel","dnum","dnum_name","dofile","doturn","dx","dy","dz","eckey","edge","enter_tutorial","error","error object is not a string","execute","exit","false","fig-transform","flags","flip_level","game_exit","gamestate","gamestate: %d:%d (%c vs %c)","get_config","get_config_errors","get_nh_lua_variables","get_table_str_opt","get_table_str_opt: no string","get_variables_string","getenv","gethook","getinfo","getlin","getlocal","getmap","getmetatable","getpos_tip","getregistry","gettrap","getupvalue","getuservalue","gg.gmst_disco != NULL","gg.gmst_mvitals != NULL","gg.gmst_ubak != NULL","giveobj","glyph","has_timer_at","has_trap","hatch-egg","horizontal","hunger","impossible","ing_suffix","int_to_objname","int_to_pmname","inventory","invocation_level","ipairs","is_genocided","isopen","key","lS","l_nhcore_call","l_nhcore_init failed","ladder","launch2x","launch2y","launchx","launchy","leave_tutorial","level_difficulty","level_difficulty should not have any args","lit","load","loadfile","locked","looted","lua","luaL_loadbuffer: Error loading %s: %s","luadata","luadata-lua_data_len","madeby_u","makeplural","makesingular","mapchr","math","melt-ice","menu","mh","mhmax","mongen","moveloop_turn","moves","mtimedone","nSl","name","next","nh","nh luacore not inited","nh.callback counts are wrong","nh.random","nh.rn2","nh_callback_rm","nh_callback_set","nh_get_variables_string","nh_lua_variables","nh_lua_variables is not a lua table","nh_set_variables_string","nhc","nhcore","nhcore.lua","nhl_callback","nhl_gamestate","nhl_gamestate: inconsistent state (%s vs %s)","nhl_init","nhl_loadlua","nhl_loadlua: Error opening %s","nhl_rnglog_set_lua_caller","nhl_timer_has_at: Wrong args","nhl_timer_peek_at: Wrong args","nhl_timer_start_at: Wrong args","nhl_timer_stop_at: Wrong args","nhl_variable","nhl_variable-1","nhl_variable-2","nhl_variable-3","nhlib.lua","nhlua.c","no","nodoor","none","not stored","nv_range","once","one","org.nethack.nethack.sb.fs","os","overwrite_stairs","pairs","parse_config","pcall","peek_timer_at","pline","prevent_pline","print","pudding","pushkey","r","random","randomseed","rawequal","rawget","rawlen","rawset","remove","rename","restore","restore_luadata","restore_old_game","revive-mon","ring","rn2","role","roomno","rot-corpse","rot-organic","s_suffix","sandbox doesn't know this Lua version: this=%d != expected=%d ","save","save_luadata","seenv","select","setcstacklimit","sethook","setlocal","setlocale","setmetatable","setupvalue","setuservalue","shrine","shrink-glob","stairways","start_new_game","start_timer_at","steps and perpcall both non-zero","stop_timer_at","string","swarm","table","test","text","time","tmpname","tnote","tonumber","tostring","traceback","trapped","true","tseen","ttyp","ttyp_name","tx","ty","typ","typ_name","type","u","uen","uenmax","uhave_amulet","uhp","uhpmax","uhunger","ulevel","ulevelmax","uluck","umonnum","umonster","unprotected error in call to Lua API (%s)\n","up","upvalueid","upvaluejoin","utf8","ux","uy","variable","verbalize","warn","warned","waslit","x","x1","x2","xpcall","xray_range","y","y1","y2","yes","zombify-mon"],"profile":{"bodySha256":"22c20b37bded3eda52311a3da2d5990fce5052744eaca0fda358563d0716825a","stringTokens":["\"start_new_game\"","\"restore_old_game\"","\"moveloop_turn\"","\"game_exit\"","\"getpos_tip\"","\"enter_tutorial\"","\"leave_tutorial\"","\"nhcore.lua\"","\"l_nhcore_init failed\"","\"nhcore\"","\"l_nhcore_call\"","\"-Wunreachable-code\"","\"lS\"","\"%s (line %d \"","\"%.*s)\"","\")\"","\"-Wunreachable-code\"","\"Erroneous map char\"","\"Erroneous map char\"","\"rot-organic\"","\"rot-corpse\"","\"revive-mon\"","\"zombify-mon\"","\"burn-obj\"","\"hatch-egg\"","\"fig-transform\"","\"shrink-glob\"","\"melt-ice\"","\"Unknown timer type\"","\"%c\"","\"x1\"","\"y1\"","\"x2\"","\"y2\"","\"-Wunreachable-code\"","\"Incorrect arguments\"","\"tx\"","\"ty\"","\"ttyp\"","\"ttyp_name\"","\"tseen\"","\"madeby_u\"","\"once\"","\"tnote\"","\"launchx\"","\"launchy\"","\"launch2x\"","\"launch2y\"","\"conjoined\"","\"No trap at location\"","\"Coordinates out of range\"","\"Incorrect arguments\"","\"-Wunreachable-code\"","\"Incorrect arguments\"","\"glyph\"","\"typ\"","\"typ_name\"","\"%c\"","\"mapchr\"","\"seenv\"","\"horizontal\"","\"lit\"","\"waslit\"","\"roomno\"","\"edge\"","\"candig\"","\"has_trap\"","\"\"","\"flags\"","\"nodoor\"","\"broken\"","\"isopen\"","\"closed\"","\"locked\"","\"trapped\"","\"shrine\"","\"looted\"","\"looted\"","\"swarm\"","\"looted\"","\"warned\"","\"pudding\"","\"dishwasher\"","\"ring\"","\"Coordinates out of range\"","\"%s\"","\"Wrong args\"","\"%s\"","\"Wrong args\"","\"%s\"","\"Wrong args\"","\"Wrong args\"","\"Wrong args\"","\"Wrong args\"","\"none\"","\"one\"","\"any\"","\"\"","\"Wrong args\"","\"one\"","\"\"","\"\"","\"\"","\"key\"","\"\"","\"text\"","\"Wrong args\"","\"Wrong args\"","\"Wrong args\"","\"Wrong args\"","\"Wrong args\"","\"NETHACK_LUA_RNGLOG_CTX\"","\"0\"","\"NETHACK_RNGLOG\"","\"lua\"","\"%s\"","\"lua\"","\"%s\"","\"lua\"","\"%s\"","\"lua\"","\"nSl\"","\"[string \\\"\"","\"'\n                && src_start[src_len - 1] == ']') {\n                src_start += 9;\n                src_len -= 11;\n            }\n            if (src_len >= 1 && src_start[0] == '@') {\n                src_start++;\n                src_len--;\n            }\n            if (src_len >= 2\n                && src_start[0] == '('\n                && src_start[src_len - 1] == ')') {\n                src_start++;\n                src_len -= 2;\n            }\n            nh_snprintf(__func__, 1001, rnglog_src1buf, sizeof rnglog_src1buf, \"","\", (int) src_len, src_start);\n\n        }\n        line1 = ar.currentline;\n        if (ar.name && *ar.name\n            && ((ar.name[0] >= 'A' && ar.name[0] <= 'Z')\n                || (ar.name[0] >= 'a' && ar.name[0] <= 'z')\n                || ar.name[0] == '_')) {\n            nh_snprintf(__func__, 1008, rnglog_name1buf, sizeof rnglog_name1buf, \"","\", ar.name);\n            name1 = rnglog_name1buf;\n        }\n        have1 = ((boolean) 1);\n    }\n\n    if (lua_getstack(L, 2, &ar2) && lua_getinfo(L, \"","\", &ar2)) {\n        if (ar2.short_src && *ar2.short_src) {\n            const char *src_start = ar2.short_src;\n            size_t src_len = strlen(ar2.short_src);\n\n            if (src_len >= 11\n                && !strncmp(src_start, \"","\"\"","\"'\n                && src_start[src_len - 1] == ']') {\n                src_start += 9;\n                src_len -= 11;\n            }\n            if (src_len >= 1 && src_start[0] == '@') {\n                src_start++;\n                src_len--;\n            }\n            if (src_len >= 2\n                && src_start[0] == '('\n                && src_start[src_len - 1] == ')') {\n                src_start++;\n                src_len -= 2;\n            }\n            nh_snprintf(__func__, 1037, rnglog_src2buf, sizeof rnglog_src2buf, \"","\", (int) src_len, src_start);\n\n        }\n        line2 = ar2.currentline;\n        if (ar2.name && *ar2.name\n            && ((ar2.name[0] >= 'A' && ar2.name[0] <= 'Z')\n                || (ar2.name[0] >= 'a' && ar2.name[0] <= 'z')\n                || ar2.name[0] == '_')) {\n            nh_snprintf(__func__, 1044, rnglog_parentbuf, sizeof rnglog_parentbuf, \"","\", ar2.name);\n            name2 = rnglog_parentbuf;\n        }\n        have2 = ((boolean) 1);\n    }\n\n    if (have2) {\n        src = rnglog_src2buf;\n        line = line2;\n        if (have1) {\n            nh_snprintf(__func__, 1056, rnglog_namebuf, sizeof rnglog_namebuf, \"","\", name1, rnglog_src1buf, line1, name2);\n\n\n            name = rnglog_namebuf;\n        } else {\n            name = name2;\n        }\n    } else if (have1) {\n        src = rnglog_src1buf;\n        line = line1;\n        name = name1;\n    }\n    rng_log_set_caller(src, line, name);\n}\n\n\nstatic int\nnhl_rn2(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        int range = (int) luaL_checkinteger(L, 1);\n        nhl_rnglog_set_lua_caller(L, \"","\");\n        lua_pushinteger(L, (rn2)(range));\n    }\n    else\n        nhl_error(L, \"","\");\n\n    return 1;\n}\n\n\n\nstatic int\nnhl_random(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        int range = (int) luaL_checkinteger(L, 1);\n        nhl_rnglog_set_lua_caller(L, \"","\");\n        lua_pushinteger(L, (rn2)(range));\n    } else if (argc == 2) {\n        int base = (int) luaL_checkinteger(L, 1);\n        int range = (int) luaL_checkinteger(L, 2);\n        nhl_rnglog_set_lua_caller(L, \"","\");\n        lua_pushinteger(L, base + (rn2)(range));\n    }\n    else\n        nhl_error(L, \"","\");\n\n    return 1;\n}\n\n\nstatic int\nnhl_level_difficulty(lua_State *L)\n{\n    int argc = lua_gettop(L);\n    if (argc == 0) {\n        lua_pushinteger(L, level_difficulty());\n    } else {\n        nhl_error(L, \"","\");\n    }\n    return 1;\n}\n\n\nstatic int\nnhl_is_genocided(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        const char *paramstr = (luaL_checklstring(L, (1), ((void*)0)));\n        int mgend;\n        int i = name_to_mon(paramstr, &mgend);\n\n        lua_pushboolean(L, (i != NON_PM)\n                        && (svm.mvitals[i].mvflags & 0x02)\n                        ? ((boolean) 1) : ((boolean) 0));\n    } else {\n        nhl_error(L, \"","\");\n    }\n    return 1;\n}\n\n\n\n\n\nstatic int\nnhl_get_debug_themerm_name(lua_State *L)\n{\n    int argc = lua_gettop(L);\n    if (argc == 1) {\n        char *dbg_themerm = (char *) 0;\n        boolean is_fill = lua_toboolean(L, 1);\n        lua_settop(L, -(1)-1);\n        if (flags.debug)\n            dbg_themerm = getenv(is_fill ? \"","\" : \"","\");\n        if (!dbg_themerm || !*dbg_themerm) {\n            lua_pushnil(L);\n        } else {\n            lua_pushstring(L, dbg_themerm);\n        }\n    } else {\n        nhl_error(L, \"","\");\n    }\n    return 1;\n}\n\n#pragma clang diagnostic pop\n\n\nint\nget_table_int(lua_State *L, const char *name)\n{\n    int ret;\n\n    lua_getfield(L, -1, name);\n    ret = (int) luaL_checkinteger(L, -1);\n    lua_settop(L, -(1)-1);\n    return ret;\n}\n\n\nint\nget_table_int_opt(lua_State *L, const char *name, int defval)\n{\n    int ret = defval;\n\n    lua_getfield(L, -1, name);\n    if (!(lua_type(L, (-1)) == 0)) {\n        ret = (int) luaL_checkinteger(L, -1);\n    }\n    lua_settop(L, -(1)-1);\n    return ret;\n}\n\nchar *\nget_table_str(lua_State *L, const char *name)\n{\n    char *ret;\n\n    lua_getfield(L, -1, name);\n    ret = dupstr((luaL_checklstring(L, (-1), ((void*)0))));\n    lua_settop(L, -(1)-1);\n    return ret;\n}\n\n\n\nchar *\nget_table_str_opt(lua_State *L, const char *name, char *defval)\n{\n    const char *ret;\n    int ltyp;\n\n    lua_getfield(L, -1, name);\n    ltyp = lua_type(L, -1);\n    if (ltyp == 4 || ltyp == 0) {\n        ret = (luaL_optlstring(L, (-1), (defval), ((void*)0)));\n    } else if (ltyp == 6) {\n        nhl_pcall_handle(L, 0, 1, \"","\", NHLpa_panic);\n        ret = (luaL_optlstring(L, (-1), (defval), ((void*)0)));\n    } else {\n        nhl_error(L, \"","\");\n    }\n    if (ret) {\n        lua_settop(L, -(1)-1);\n        return dupstr(ret);\n    }\n    lua_settop(L, -(1)-1);\n    return ((void*)0);\n}\n\nint\nget_table_boolean(lua_State *L, const char *name)\n{\n    static const char *const boolstr[] = {\n        \"","\", \"","\", \"","\", \"","\", ((void*)0)\n    };\n\n    int ltyp;\n    int ret = -1;\n\n    lua_getfield(L, -1, name);\n    ltyp = lua_type(L, -1);\n    if (ltyp == 4) {\n        ret = luaL_checkoption(L, -1, ((void*)0), boolstr);\n\n    } else if (ltyp == 1) {\n        ret = lua_toboolean(L, -1);\n    } else if (ltyp == 3) {\n        ret = (int) luaL_checkinteger(L, -1);\n        if (ret < 0 || ret > 1)\n            ret = -1;\n    }\n    lua_settop(L, -(1)-1);\n    if (ret == -1)\n        nhl_error(L, \"","\");\n    return ret;\n}\n\nint\nget_table_boolean_opt(lua_State *L, const char *name, int defval)\n{\n    int ret = defval;\n\n    lua_getfield(L, -1, name);\n    if (lua_type(L, -1) != 0) {\n        lua_settop(L, -(1)-1);\n        return get_table_boolean(L, name);\n    }\n    lua_settop(L, -(1)-1);\n    return ret;\n}\n\n\nint\nget_table_option(lua_State *L,\n                 const char *name,\n                 const char *defval,\n                 const char *const opts[])\n{\n    int ret;\n\n    lua_getfield(L, -1, name);\n    ret = luaL_checkoption(L, -1, defval, opts);\n    lua_settop(L, -(1)-1);\n    return ret;\n}\nstatic int\nnhl_dnum_name(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        lua_Integer dnum = luaL_checkinteger(L, 1);\n\n        if (dnum >= 0 && dnum < svn.n_dgns)\n            lua_pushstring(L, svd.dungeons[dnum].dname);\n        else\n            lua_pushstring(L, \"","\");\n    } else\n        nhl_error(L, \"","\");\n    return 1;\n}\n\n\n\n\nstatic int\nnhl_int_to_pm_name(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        lua_Integer i = luaL_checkinteger(L, 1);\n\n        if (i >= LOW_PM && i <= HIGH_PM)\n            lua_pushstring(L, mons[i].pmnames[NEUTRAL]);\n        else\n            lua_pushstring(L, \"","\");\n    } else\n        nhl_error(L, \"","\");\n    return 1;\n}\n\n\n\nstatic int\nnhl_int_to_obj_name(lua_State *L)\n{\n    int argc = lua_gettop(L);\n\n    if (argc == 1) {\n        char buf[8];\n        lua_Integer i = luaL_checkinteger(L, 1);\n\n        if (i >= 0 && i < NUM_OBJECTS && (obj_descr[(objects[i]).oc_name_idx].oc_name)) {\n            lua_pushstring(L, (obj_descr[(objects[i]).oc_name_idx].oc_name));\n            buf[0] = def_oc_syms[(int)objects[i].oc_class].sym;\n            buf[1] = '\\0';\n            lua_pushstring(L, buf);\n        } else {\n            lua_pushstring(L, \"","\");\n            lua_pushstring(L, \"","\");\n        }\n    } else\n        nhl_error(L, \"","\");\n    return 2;\n}\n\n#pragma clang diagnostic push\n#pragma clang diagnostic ignored \"","\"\n\n\n\n\n\nstatic int\nnhl_variable(lua_State *L)\n{\n    int argc = lua_gettop(L);\n    int typ;\n    const char *key;\n\n    if (!gl.luacore) {\n        panic(\"","\");\n\n        return 0;\n    }\n\n    lua_getglobal(gl.luacore, \"","\");\n    if (!(lua_type(gl.luacore, (-1)) == 5)) {\n        impossible(\"","\");\n        return 0;\n    }\n\n    if (argc == 1) {\n        key = (luaL_checklstring(L, (1), ((void*)0)));\n\n        lua_getfield(gl.luacore, -1, key);\n        typ = lua_type(gl.luacore, -1);\n        if (typ == 4)\n            lua_pushstring(L, lua_tolstring(gl.luacore, (-1), ((void*)0)));\n        else if (typ == 0)\n            lua_pushnil(L);\n        else if (typ == 1)\n            lua_pushboolean(L, lua_toboolean(gl.luacore, -1));\n        else if (typ == 3)\n            lua_pushinteger(L, lua_tointegerx(gl.luacore,(-1),((void*)0)));\n        else if (typ == 5) {\n            lua_getglobal(gl.luacore, \"","\");\n            lua_pushvalue(gl.luacore, -2);\n            nhl_pcall_handle(gl.luacore, 1, 1, \"","\", NHLpa_panic);\n            luaL_loadstring(L, lua_tolstring(gl.luacore, (-1), ((void*)0)));\n            nhl_pcall_handle(L, 0, 1, \"","\", NHLpa_panic);\n        } else\n            nhl_error(L, \"","\");\n        return 1;\n    } else if (argc == 2) {\n\n\n        key = (luaL_checklstring(L, (1), ((void*)0)));\n\n        typ = lua_type(L, -1);\n\n        if (typ == 4) {\n            lua_pushstring(gl.luacore, lua_tolstring(L, (-1), ((void*)0)));\n            lua_setfield(gl.luacore, -2, key);\n        } else if (typ == 0) {\n            lua_pushnil(gl.luacore);\n            lua_setfield(gl.luacore, -2, key);\n        } else if (typ == 1) {\n            lua_pushboolean(gl.luacore, lua_toboolean(L, -1));\n            lua_setfield(gl.luacore, -2, key);\n        } else if (typ == 3) {\n            lua_pushinteger(gl.luacore, lua_tointegerx(L,(-1),((void*)0)));\n            lua_setfield(gl.luacore, -2, key);\n        } else if (typ == 5) {\n            lua_getglobal(L, \"","\");\n            lua_pushstring(L, key);\n            lua_pushvalue(L, -3);\n            nhl_pcall_handle(L, 2, 1, \"","\", NHLpa_panic);\n            luaL_loadstring(gl.luacore, lua_tolstring(L, (-1), ((void*)0)));\n            nhl_pcall_handle(gl.luacore, 0, 0, \"","\", NHLpa_panic);\n        } else\n            nhl_error(L, \"","\");\n        return 0;\n    } else\n        nhl_error(L, \"","\");\n    return 1;\n}\n\n\nchar *\nget_nh_lua_variables(void)\n{\n    char *key = ((void*)0);\n\n    if (!gl.luacore) {\n        panic(\"","\");\n\n        return key;\n    }\n    lua_getglobal(gl.luacore, \"","\");\n    if (lua_type(gl.luacore, -1) == 6) {\n        if (nhl_pcall_handle(gl.luacore, 0, 1, \"","\",\n                             NHLpa_impossible)) {\n            return key;\n        }\n        key = dupstr(lua_tolstring(gl.luacore, (-1), ((void*)0)));\n    }\n    lua_settop(gl.luacore, -(1)-1);\n    return key;\n}\n\n#pragma clang diagnostic pop\n\n\n\n\n\n\n\n\nvoid\nsave_luadata(NHFILE *nhfp)\n{\n    unsigned lua_data_len;\n\n    char *lua_data = get_nh_lua_variables();\n\n\n    if (!lua_data)\n        lua_data = dupstr(emptystr);\n    lua_data_len = Strlen_(lua_data,__func__,1491) + 1;\n    sfo_unsigned(nhfp, &lua_data_len, \"","\");\n    sfo_char(nhfp, lua_data, \"","\", lua_data_len);\n    free(lua_data);\n}\n\n\nvoid\nrestore_luadata(NHFILE *nhfp)\n{\n    unsigned lua_data_len = 0;\n\n    char *lua_data;\n\n\n    sfi_unsigned(nhfp, &lua_data_len, \"","\");;\n    lua_data = (char *) alloc(lua_data_len);\n    sfi_char(nhfp, lua_data, \"","\", lua_data_len);\n\n\n    if (!gl.luacore)\n        l_nhcore_init();\n    luaL_loadstring(gl.luacore, lua_data);\n    free(lua_data);\n    nhl_pcall_handle(gl.luacore, 0, 0, \"","\", NHLpa_panic);\n\n}\n\n\n\n\nstatic int\nnhl_stairways(lua_State *L)\n{\n    stairway *tmp = gs.stairs;\n    int i = 1;\n\n    lua_createtable(L, 0, 0);\n\n    while (tmp) {\n        lua_pushinteger(L, i);\n        lua_createtable(L, 0, 0);\n\n        nhl_add_table_entry_bool(L, \"","\", tmp->up);\n        nhl_add_table_entry_bool(L, \"","\", tmp->isladder);\n        nhl_add_table_entry_int(L, \"","\", tmp->sx);\n        nhl_add_table_entry_int(L, \"","\", tmp->sy);\n        nhl_add_table_entry_int(L, \"","\", tmp->tolev.dnum);\n        nhl_add_table_entry_int(L, \"","\", tmp->tolev.dlevel);\n\n        lua_settable(L, -3);\n\n        tmp = tmp->next;\n        i++;\n    }\n\n    return 1;\n}\n\n\n\n\nstatic int\nnhl_test(lua_State *L)\n{\n    coordxy x, y;\n    char *name, Player[] = \"","\";\n\n\n    lua_settop(L, 1);\n\n    luaL_checktype(L, 1, 5);\n\n    x = (coordxy) get_table_int(L, \"","\");\n    y = (coordxy) get_table_int(L, \"","\");\n    name = get_table_str_opt(L, \"","\", Player);\n\n    pline(\"","\"%s\\\" }\"","\"mongen\"","\"hunger\"","\"overwrite_stairs\"","\"prevent_pline\"","\"-Wunreachable-code\"","\"nhl_timer_has_at: Wrong args\"","\"nhl_timer_peek_at: Wrong args\"","\"nhl_timer_stop_at: Wrong args\"","\"nhl_timer_start_at: Wrong args\"","\"nh luacore not inited\"","\"nh.callback counts are wrong\"","\"nh_callback_rm\"","\"nh_callback_set\"","\"nhl_callback\"","\"nhlua.c\"","\"gamestate: %d:%d (%c vs %c)\"","\"Resetting time to move #%ld.\"","\"gg.gmst_ubak != NULL\"","\"nhlua.c\"","\"gg.gmst_disco != NULL\"","\"nhlua.c\"","\"gg.gmst_mvitals != NULL\"","\"nhlua.c\"","\"nhl_gamestate: inconsistent state (%s vs %s)\"","\"restore\"","\"save\"","\"already stored\"","\"not stored\"","\"test\"","\"getmap\"","\"gettrap\"","\"deltrap\"","\"has_timer_at\"","\"peek_timer_at\"","\"stop_timer_at\"","\"start_timer_at\"","\"abscoord\"","\"impossible\"","\"pline\"","\"verbalize\"","\"menu\"","\"text\"","\"getlin\"","\"eckey\"","\"callback\"","\"gamestate\"","\"makeplural\"","\"makesingular\"","\"s_suffix\"","\"ing_suffix\"","\"an\"","\"rn2\"","\"random\"","\"level_difficulty\"","\"is_genocided\"","\"debug_themerm\"","\"parse_config\"","\"get_config\"","\"get_config_errors\"","\"dnum_name\"","\"int_to_pmname\"","\"int_to_objname\"","\"variable\"","\"stairways\"","\"pushkey\"","\"doturn\"","\"debug_flags\"","\"flip_level\"","\"COLNO\"","\"ROWNO\"","\"NUMMONS\"","\"LOW_PM\"","\"HIGH_PM\"","\"FIRST_OBJECT\"","\"LAST_OBJECT\"","\"DLB\"","\"nhc\"","\"-Wunreachable-code\"","\"ux\"","\"uy\"","\"dx\"","\"dy\"","\"dz\"","\"tx\"","\"ty\"","\"ulevel\"","\"ulevelmax\"","\"uhunger\"","\"nv_range\"","\"xray_range\"","\"umonster\"","\"umonnum\"","\"mh\"","\"mhmax\"","\"mtimedone\"","\"dlevel\"","\"dnum\"","\"uluck\"","\"uhp\"","\"uhpmax\"","\"uen\"","\"uenmax\"","\"inventory\"","\"role\"","\"moves\"","\"uhave_amulet\"","\"depth\"","\"invocation_level\"","\"Unknown u table index\"","\"Cannot set u table values\"","\"clear_inventory\"","\"giveobj\"","\"__index\"","\"__newindex\"","\"u\"","\"Lua time exceeded %d:%s\"","\"(unknown)\"","\"LUASTATS PCAL %d:%s %ld\"","\"LUASTATS PMEM %d:%s %lu\"","\"Lua error %d:%s %s\"","\"(unknown)\"","\"Lua error: %d:%s %s\"","\"(unknown)\"","\"(%s)\"","\"r\"","\"nhl_loadlua: Error opening %s\"","\"(%s) line too long\"","\"luaL_loadbuffer: Error loading %s: %s\"","\"sandbox doesn't know this Lua version: this=%d != expected=%d \"","\"nhl_init\"","\"nh\"","\"math\"","\"math\"","\"nhlib.lua\"","\"LUASTATS DONE %d:%s %ld\"","\"LUASTATS DMEM %d:%s %lu\"","\"_RELEASE\"","\"Lua \"","\"5\"","\".\"","\"4\"","\".\"","\"8\"","\"_VERSION\"","\"Lua \"","\"5\"","\".\"","\"4\"","\"Lua\"","\"Lua \"","\"5\"","\".\"","\"4\"","\".\"","\"8\"","\"  Copyright (C) 1994-2025 Lua.org, PUC-Rio\"","\"Lua \"","\"5\"","\".\"","\"4\"","\".\"","\"8\"","\"  Copyright (C) 1994-2025 Lua.org, PUC-Rio\"","\"ipairs\"","\"next\"","\"pairs\"","\"pcall\"","\"select\"","\"tonumber\"","\"tostring\"","\"type\"","\"xpcall\"","\"assert\"","\"error\"","\"print\"","\"warn\"","\"getmetatable\"","\"rawequal\"","\"rawget\"","\"rawlen\"","\"rawset\"","\"setmetatable\"","\"collectgarbage\"","\"dofile\"","\"loadfile\"","\"load\"","\"debug\"","\"getuservalue\"","\"gethook\"","\"getinfo\"","\"getlocal\"","\"getregistry\"","\"getmetatable\"","\"getupvalue\"","\"upvaluejoin\"","\"upvalueid\"","\"setuservalue\"","\"sethook\"","\"setlocal\"","\"setmetatable\"","\"setupvalue\"","\"setcstacklimit\"","\"traceback\"","\"clock\"","\"date\"","\"difftime\"","\"time\"","\"execute\"","\"exit\"","\"getenv\"","\"remove\"","\"rename\"","\"setlocale\"","\"tmpname\"","\"org.nethack.nethack.sb.fs\"","\"org.nethack.nethack.sb.fs\"","\"_G\"","\"coroutine\"","\"table\"","\"os\"","\"string\"","\"math\"","\"NETHACK_SEED\"","\"randomseed\"","\"utf8\"","\"debug\"","\"-Wunreachable-code\"","\"error object is not a string\"","\"unprotected error in call to Lua API (%s)\\n\"","\"[lua]\"","\"NULL lua_newstate\"","\"steps and perpcall both non-zero\""],"controlNodes":{"IfStmt":227,"ForStmt":10,"WhileStmt":13,"DoStmt":3,"SwitchStmt":3,"GotoStmt":6,"ConditionalOperator":20,"CallExpr":694},"defines":["NOTPARMDECL","NO_TIMED_DELAY","MACOS","NOPANICTRACE","NO_FILE_LINKS"],"forcedInclude":"nethack-c/wasm/native-terminal.h"}};

// Historical pristine comment replaced by inherited 001-deterministic-runtime.patch.
// Retained outside the configured source bodies; seeded prepared policy above is authoritative.
/* XXX Note that math.random uses Lua's built-in xoshiro256**
         * algorithm regardless of what the rest of the game uses.
         * Fixing this would require changing lmathlib.c. */
