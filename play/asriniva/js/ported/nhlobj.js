import {C} from '../c-runtime/context.js';

/* NetHack 5.0	nhlobj.c	$NHDT-Date: 1576097301 2019/12/11 20:48:21 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.0 $ */
/*      Copyright (c) 2019 by Pasi Kallinen */
/* NetHack may be freely redistributed.  See license for details. */






/* UNUSED */

// #define lobj_is_ok(lo) ((lo) && (lo)->obj && (lo)->obj->where != OBJ_LUAFREE)

export function l_obj_check(L, indx)
{
    let lo;

    C.luaL_checktype(L, indx, C.LUA_TUSERDATA);
    lo = C.luaObject(C.luaL_checkudata(L, indx, "obj"));
    if (!lo)
        C.nhl_error(L, "Obj error");
    return lo;
}

export function l_obj_gc(L)
{
    let obj, otmp;
    let lo = l_obj_check(L, 1);

    if (lo && (obj = lo.obj) != 0) {
        if (obj.lua_ref_cnt > 0)
            obj.lua_ref_cnt--;
        /* free-floating objects with no other refs are deallocated. */
        if (!obj.lua_ref_cnt
            && (obj.where == C.OBJ_FREE || obj.where == C.OBJ_LUAFREE)) {
            if (C.Has_contents(obj)) {
                while ((otmp = obj.cobj) != 0) {
                    C.obj_extract_self(otmp);
                    C.dealloc_obj(otmp);
                }
            }
            obj.where = C.OBJ_FREE;
            C.dealloc_obj(obj), obj = 0;
        }
        lo.obj = 0;
    }
    return 0;
}

export function l_obj_push(L, otmp)
{
    let lo
        = C.luaObject(C.lua_newuserdata(L, C.userdataSize));
    C.luaL_getmetatable(L, "obj");
    C.lua_setmetatable(L, -2);

    lo.state = 0;
    lo.obj = otmp;
    if (otmp)
        otmp.lua_ref_cnt++;

    return lo;
}

export function nhl_push_obj(L, otmp)
{
    l_obj_push(L, otmp);
}

/* local o = obj.new("large chest");
   local cobj = o:contents(); */
export function l_obj_getcontents(L)
{
    let lo = l_obj_check(L, 1);
    let obj = lo.obj;

    if (!obj)
        C.nhl_error(L, "l_obj_getcontents: no obj");

    l_obj_push(L, obj.cobj);
    return 1;
}

/* Puts object inside another object. */
/* local box = obj.new("large chest");
   box:addcontent(obj.new("rock"));
*/
export function l_obj_add_to_container(L)
{
    let lobox = l_obj_check(L, 1);
    let lo = l_obj_check(L, 2);
    let otmp;
    let refs;

    if (!(lo && lo.obj && lo.obj.where != C.OBJ_LUAFREE) || !(lobox && lobox.obj && lobox.obj.where != C.OBJ_LUAFREE))
        return 0;

    refs = C.int(lo.obj.lua_ref_cnt);

    C.obj_extract_self(lo.obj);
    otmp = C.add_to_container(lobox.obj, lo.obj);

    /* was lo->obj merged? */
    if (!C.samePtr(otmp, lo.obj)) {
        lo.obj = otmp;
        lo.obj.lua_ref_cnt += refs;
    }
    lobox.obj.owt = C.weight(lobox.obj);

    return 0;
}

/* Put object into player's inventory */
/* u.giveobj(obj.new("rock")); */
export function nhl_obj_u_giveobj(L)
{
    let lo = l_obj_check(L, 1);
    let otmp;
    let refs;

    if (!(lo && lo.obj && lo.obj.where != C.OBJ_LUAFREE) || lo.obj.where == C.OBJ_INVENT)
        return 0;

    refs = C.int(lo.obj.lua_ref_cnt);

    C.obj_extract_self(lo.obj);
    otmp = C.addinv(lo.obj);

    if (!C.samePtr(otmp, lo.obj)) {
        lo.obj.lua_ref_cnt += refs;
        lo.obj = otmp;
    }

    return 0;
}


/* Get a table of object class data. */
/* local odata = obj.class(otbl.otyp); */
/* local odata = obj.class(obj.new("rock")); */
/* local odata = o:class(); */
export function l_obj_objects_to_table(L)
{
    let argc = C.lua_gettop(L);
    let otyp = -1;
    let o;

    if (argc != 1) {
        C.nhl_error(L, "l_obj_objects_to_table: Wrong args");
        /*NOTREACHED*/
        return 0;
    }

    if (C.lua_type(L, 1) == C.LUA_TNUMBER) {
        otyp = C.int(C.luaL_checkinteger(L, 1));
    } else if (C.lua_type(L, 1) == C.LUA_TUSERDATA) {
        let lo = l_obj_check(L, 1);
        if (lo && lo.obj)
            otyp = lo.obj.otyp;
    }
    C.lua_pop(L, 1);

    if (otyp == -1) {
        C.nhl_error(L, "l_obj_objects_to_table: Wrong args");
        /*NOTREACHED*/
        return 0;
    }

    o = C.objects[otyp];

    C.lua_newtable(L);

    if (C.OBJ_NAME(C.objects[otyp]))
        C.nhl_add_table_entry_str(L, "name", C.OBJ_NAME(C.objects[otyp]));
    if (C.OBJ_DESCR(C.objects[otyp]))
        C.nhl_add_table_entry_str(L, "descr",
                                C.OBJ_DESCR(C.objects[otyp]));
    if (o.oc_uname)
        C.nhl_add_table_entry_str(L, "uname", o.oc_uname);

    C.nhl_add_table_entry_int(L, "name_known", o.oc_name_known);
    C.nhl_add_table_entry_int(L, "merge", o.oc_merge);
    C.nhl_add_table_entry_int(L, "uses_known", o.oc_uses_known);
    C.nhl_add_table_entry_int(L, "encountered", o.oc_encountered);
    C.nhl_add_table_entry_int(L, "magic", o.oc_magic);
    C.nhl_add_table_entry_int(L, "charged", o.oc_charged);
    C.nhl_add_table_entry_int(L, "unique", o.oc_unique);
    C.nhl_add_table_entry_int(L, "nowish", o.oc_nowish);
    C.nhl_add_table_entry_int(L, "big", o.oc_big);
    /* TODO: oc_bimanual, oc_bulky */
    C.nhl_add_table_entry_int(L, "tough", o.oc_tough);
    C.nhl_add_table_entry_int(L, "dir", o.oc_dir); /* TODO: convert to text */
    C.nhl_add_table_entry_str(L, "material", C.materialnm[o.oc_material]);
    /* TODO: oc_subtyp, oc_skill, oc_armcat */
    C.nhl_add_table_entry_int(L, "oprop", o.oc_oprop);
    C.nhl_add_table_entry_char(L, "class",
                             C.def_oc_syms[C.uchar(o.oc_class)].sym);
    C.nhl_add_table_entry_int(L, "delay", o.oc_delay);
    C.nhl_add_table_entry_int(L, "color", o.oc_color); /* TODO: text? */
    C.nhl_add_table_entry_int(L, "prob", o.oc_prob);
    C.nhl_add_table_entry_int(L, "weight", o.oc_weight);
    C.nhl_add_table_entry_int(L, "cost", o.oc_cost);
    C.nhl_add_table_entry_int(L, "damage_small", o.oc_wsdam);
    C.nhl_add_table_entry_int(L, "damage_large", o.oc_wldam);
    /* TODO: oc_oc1, oc_oc2, oc_hitbon, a_ac, a_can, oc_level */
    C.nhl_add_table_entry_int(L, "nutrition", o.oc_nutrition);

    return 1;
}


/* Create a lua table representation of the object, unpacking all the
   object fields.
   local o = obj.new("rock");
   local otbl = o:totable(); */
export function l_obj_to_table(L)
{
    let lo = l_obj_check(L, 1);
    let obj = lo.obj;

    C.lua_newtable(L);

    if (!obj || obj.where == C.OBJ_LUAFREE) {
        C.nhl_add_table_entry_int(L, "NO_OBJ", 1);
        return 1;
    }

    C.nhl_add_table_entry_int(L, "has_contents", C.Has_contents(obj));
    C.nhl_add_table_entry_int(L, "is_container", C.Is_container(obj));
    C.nhl_add_table_entry_int(L, "o_id", obj.o_id);
    C.nhl_add_table_entry_int(L, "ox", obj.ox);
    C.nhl_add_table_entry_int(L, "oy", obj.oy);
    C.nhl_add_table_entry_int(L, "otyp", obj.otyp);
    if (C.OBJ_NAME(C.objects[obj.otyp]))
        C.nhl_add_table_entry_str(L, "otyp_name", C.OBJ_NAME(C.objects[obj.otyp]));
    if (C.OBJ_DESCR(C.objects[obj.otyp]))
        C.nhl_add_table_entry_str(L, "otyp_descr",
                                C.OBJ_DESCR(C.objects[obj.otyp]));
    C.nhl_add_table_entry_int(L, "owt", obj.owt);
    C.nhl_add_table_entry_int(L, "quan", obj.quan);
    C.nhl_add_table_entry_int(L, "spe", obj.spe);

    if (obj.otyp == C.STATUE)
        C.nhl_add_table_entry_int(L, "historic",
                                (obj.spe & C.CORPSTAT_HISTORIC) != 0);
    if (obj.otyp == C.CORPSE || obj.otyp == C.STATUE) {
        C.nhl_add_table_entry_int(L, "male",
                                (obj.spe & C.CORPSTAT_MALE) != 0);
        C.nhl_add_table_entry_int(L, "female",
                                (obj.spe & C.CORPSTAT_FEMALE) != 0);
    }

    C.nhl_add_table_entry_char(L, "oclass",
                             C.def_oc_syms[C.uchar(obj.oclass)].sym);
    C.nhl_add_table_entry_char(L, "invlet", obj.invlet);
    /* TODO: nhl_add_table_entry_char(L, "oartifact", obj->oartifact);*/
    C.nhl_add_table_entry_int(L, "where", obj.where);
    /* TODO: nhl_add_table_entry_int(L, "timed", obj->timed); */
    C.nhl_add_table_entry_int(L, "cursed", obj.cursed);
    C.nhl_add_table_entry_int(L, "blessed", obj.blessed);
    C.nhl_add_table_entry_int(L, "unpaid", obj.unpaid);
    C.nhl_add_table_entry_int(L, "no_charge", obj.no_charge);
    C.nhl_add_table_entry_int(L, "known", obj.known);
    C.nhl_add_table_entry_int(L, "dknown", obj.dknown);
    C.nhl_add_table_entry_int(L, "bknown", obj.bknown);
    C.nhl_add_table_entry_int(L, "rknown", obj.rknown);
    C.nhl_add_table_entry_int(L, "tknown", obj.tknown);
    if (obj.oclass == C.POTION_CLASS)
        C.nhl_add_table_entry_int(L, "odiluted", obj.odiluted);
    else
        C.nhl_add_table_entry_int(L, "oeroded", obj.oeroded);
    C.nhl_add_table_entry_int(L, "oeroded2", obj.oeroded2);
    /* TODO: orotten, norevive */
    C.nhl_add_table_entry_int(L, "oerodeproof", obj.oerodeproof);
    C.nhl_add_table_entry_int(L, "olocked", obj.olocked);
    C.nhl_add_table_entry_int(L, "obroken", obj.obroken);
    if (C.is_poisonable(obj))
        C.nhl_add_table_entry_int(L, "opoisoned", obj.opoisoned);
    else
        C.nhl_add_table_entry_int(L, "otrapped", obj.otrapped);
    /* TODO: degraded_horn */
    C.nhl_add_table_entry_int(L, "recharged", obj.recharged);
    /* TODO: on_ice */
    C.nhl_add_table_entry_int(L, "lamplit", obj.lamplit);
    C.nhl_add_table_entry_int(L, "globby", obj.globby);
    C.nhl_add_table_entry_int(L, "greased", obj.greased);
    C.nhl_add_table_entry_int(L, "nomerge", obj.nomerge);
    C.nhl_add_table_entry_int(L, "how_lost", obj.how_lost);
    C.nhl_add_table_entry_int(L, "in_use", obj.in_use);
    C.nhl_add_table_entry_int(L, "bypass", obj.bypass);
    C.nhl_add_table_entry_int(L, "cknown", obj.cknown);
    C.nhl_add_table_entry_int(L, "lknown", obj.lknown);
    C.nhl_add_table_entry_int(L, "corpsenm", obj.corpsenm);
    if (obj.corpsenm != C.NON_PM
        && (obj.otyp == C.TIN || obj.otyp == C.CORPSE || obj.otyp == C.EGG
            || obj.otyp == C.FIGURINE || obj.otyp == C.STATUE))
        C.nhl_add_table_entry_str(L, "corpsenm_name",
                                C.mons[obj.corpsenm].pmnames[C.NEUTRAL]);
    /* TODO: leashmon, fromsink, novelidx, record_achieve_special */
    C.nhl_add_table_entry_int(L, "usecount", obj.usecount);
    /* TODO: spestudied */
    C.nhl_add_table_entry_int(L, "oeaten", obj.oeaten);
    C.nhl_add_table_entry_int(L, "age", obj.age);
    C.nhl_add_table_entry_int(L, "owornmask", obj.owornmask);
    /* TODO: more of oextra */
    C.nhl_add_table_entry_int(L, "has_oname", C.has_oname(obj));
    if (C.has_oname(obj))
        C.nhl_add_table_entry_str(L, "oname", C.ONAME(obj));

    return 1;
}


/* create a new object via wishing routine */
/* local o = obj.new("rock"); */
/* local o = obj.new({ id = "food ration", class = "%" }); */
export function l_obj_new_readobjnam(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 1 && C.lua_type(L, 1) == C.LUA_TSTRING) {
        const buf = C.stackAlloc(C.BUFSZ);
        let otmp;

        C.Sprintf(buf, "%s", C.luaL_checkstring(L, 1));
        C.lua_pop(L, 1);
        if ((otmp = C.readobjnam(buf, 0)), C.samePtr(otmp, C.hands_obj))
            otmp = 0;
        l_obj_push(L, otmp);
        return 1;
    } else if (argc == 1 && C.lua_type(L, 1) == C.LUA_TTABLE) {
        let id = C.short(C.get_table_objtype(L));
        let class_ = C.short(C.get_table_objclass(L));
        let otmp;

        if (id >= C.FIRST_OBJECT) {
            otmp = C.mksobj(id, 1, 0);
        } else {
            class_ = C.short(C.def_char_to_objclass(class_));
            if (class_ >= C.MAXOCLASSES)
                class_ = C.RANDOM_CLASS;
            otmp = C.mkobj(class_, 0);
        }
        C.lua_pop(L, 1);
        l_obj_push(L, otmp);
        return 1;
    } else
        C.nhl_error(L, "l_obj_new_readobjname: Wrong args");
    /*NOTREACHED*/
    return 0;
}

/* Get the topmost object on the map at x,y */
/* local o = obj.at(x, y); */
export function l_obj_at(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 2) {
        const x = C.coordLocal(0), y = C.coordLocal(0);

        x.value = C.short(C.luaL_checkinteger(L, 1));
        y.value = C.short(C.luaL_checkinteger(L, 2));
        C.cvt_to_abscoord(x, y);

        C.lua_pop(L, 2);
        l_obj_push(L, C.svl.level.objects[x.value][y.value]);
        return 1;
    } else
        C.nhl_error(L, "l_obj_at: Wrong args");
    /*NOTREACHED*/
    return 0;
}

/* Place an object on the map at (x,y).
   local o = obj.new("rock");
   o:placeobj(u.ux, u.uy); */
export function l_obj_placeobj(L)
{
    let argc = C.lua_gettop(L);
    let lo = l_obj_check(L, 1);
    const x = C.coordLocal(0), y = C.coordLocal(0);

    if (argc != 3)
        C.nhl_error(L, "l_obj_placeobj: Wrong args");

    x.value = C.short(C.luaL_checkinteger(L, 2));
    y.value = C.short(C.luaL_checkinteger(L, 3));
    C.cvt_to_abscoord(x, y);

    C.lua_pop(L, 3);

    if ((lo && lo.obj && lo.obj.where != C.OBJ_LUAFREE)) {
        C.obj_extract_self(lo.obj);
        C.place_object(lo.obj, x.value, y.value);
        C.newsym(x.value, y.value);
    }

    return 0;
}


/* Get the next object in the object chain */
/* local o = obj.at(x, y);
   local o2 = o:next(true);
   local firstobj = obj.next();
*/
export function l_obj_nextobj(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 0) {
        l_obj_push(L, C.fobj);
    } else {
        let lo = l_obj_check(L, 1);
        let use_nexthere = 0;

        if (argc == 2)
            use_nexthere = C.lua_toboolean(L, 2);

        if (lo && lo.obj)
            l_obj_push(L, (use_nexthere && lo.obj.where == C.OBJ_FLOOR)
                                  ? lo.obj.nexthere
                                  : lo.obj.nobj);
    }
    return 1;
}

/* Get the container object is in */
/* local box = o:container(); */
export function l_obj_container(L)
{
    let lo = l_obj_check(L, 1);

    if (lo && lo.obj && lo.obj.where == C.OBJ_CONTAINED)
        l_obj_push(L, lo.obj.ocontainer);
    else
        l_obj_push(L, 0);
    return 1;
}

/* Is the object a null? */
/* local badobj = o:isnull(); */
export function l_obj_isnull(L)
{
    let lo = l_obj_check(L, 1);

    C.lua_pushboolean(L, !(lo && lo.obj && lo.obj.where != C.OBJ_LUAFREE));
    return 1;
}


/* does object have a timer of certain type? */
/* local hastimer = o:has_timer("rot-organic"); */
export function l_obj_timer_has(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 2) {
        let lo = l_obj_check(L, 1);
        let timertype = C.nhl_get_timertype(L, 2);

        if (C.timer_is_obj(timertype) && lo && lo.obj) {
            C.lua_pushboolean(L, C.obj_has_timer(lo.obj, timertype));
            return 1;
        } else {
            C.lua_pushboolean(L, 0);
            return 1;
        }
    } else
        C.nhl_error(L, "l_obj_timer_has: Wrong args");
    return 0;
}

/* peek at an object timer. return the turn when timer triggers.
   returns 0 if no such timer attached to the object. */
/* local timeout = o:peek_timer("hatch-egg"); */
export function l_obj_timer_peek(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 2) {
        let lo = l_obj_check(L, 1);
        let timertype = C.nhl_get_timertype(L, 2);

        if (C.timer_is_obj(timertype) && lo && lo.obj) {
            C.lua_pushinteger(L, C.peek_timer(timertype, C.obj_to_any(lo.obj)));
            return 1;
        } else {
            C.lua_pushinteger(L, 0);
            return 1;
        }
    } else
        C.nhl_error(L, "l_obj_timer_peek: Wrong args");
    /*NOTREACHED*/
    return 0;
}

/* stop object timer(s). return the turn when timer triggers.
   returns 0 if no such timer attached to the object.
   without a timer type parameter, stops all timers for the object. */
/* local timeout = o:stop_timer("rot-organic"); */
/* o:stop_timer(); */
export function l_obj_timer_stop(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 1) {
        let lo = l_obj_check(L, 1);

        if (lo && lo.obj)
            C.obj_stop_timers(lo.obj);
        return 0;

    } else if (argc == 2) {
        let lo = l_obj_check(L, 1);
        let timertype = C.nhl_get_timertype(L, 2);

        if (C.timer_is_obj(timertype) && lo && lo.obj) {
            C.lua_pushinteger(L, C.stop_timer(timertype, C.obj_to_any(lo.obj)));
            return 1;
        } else {
            C.lua_pushinteger(L, 0);
            return 1;
        }
    } else
        C.nhl_error(L, "l_obj_timer_stop: Wrong args");
    return 0;
}


/* start an object timer. */
/* o:start_timer("hatch-egg", 10); */
export function l_obj_timer_start(L)
{
    let argc = C.lua_gettop(L);

    if (argc == 3) {
        let lo = l_obj_check(L, 1);
        let timertype = C.nhl_get_timertype(L, 2);
        let when = C.luaL_checkinteger(L, 3);

        if (C.timer_is_obj(timertype) && lo && lo.obj && when > 0) {
            if (C.obj_has_timer(lo.obj, timertype))
                C.stop_timer(timertype, C.obj_to_any(lo.obj));
            C.start_timer(when, C.TIMER_OBJECT, timertype, C.obj_to_any(lo.obj));
        }
    } else
        C.nhl_error(L, "l_obj_timer_start: Wrong args");
    return 0;
}

/* bury an obj. returns true if object is gone (merged with ground),
   false otherwise. */
/* local ogone = o:bury(); */
/* local ogone = o:bury(5,5); */
export function l_obj_bury(L)
{
    let argc = C.lua_gettop(L);
    const dealloced = C.booleanLocal(0);
    let lo = l_obj_check(L, 1);
    const x = C.coordLocal(0), y = C.coordLocal(0);

    if (argc == 1) {
        x.value = lo.obj.ox;
        y.value = lo.obj.oy;
    } else if (argc == 3) {
        x.value = C.short(C.lua_tointeger(L, 2));
        y.value = C.short(C.lua_tointeger(L, 3));
        C.cvt_to_abscoord(x, y);
    } else
        C.nhl_error(L, "l_obj_bury: Wrong args");

    if ((lo && lo.obj && lo.obj.where != C.OBJ_LUAFREE) && C.isok(x.value, y.value)) {
        lo.obj.ox = x.value;
        lo.obj.oy = y.value;
        C.bury_an_obj(lo.obj, dealloced);
    }
    C.lua_pushboolean(L, dealloced.value);
    return 1;
}

export const l_obj_methods = [

    {name:"new", func:l_obj_new_readobjnam},
    {name:"isnull", func:l_obj_isnull},
    {name:"at", func:l_obj_at},
    {name:"next", func:l_obj_nextobj},
    {name:"totable", func:l_obj_to_table},
    {name:"class", func:l_obj_objects_to_table},
    {name:"placeobj", func:l_obj_placeobj},
    {name:"container", func:l_obj_container},
    {name:"contents", func:l_obj_getcontents},
    {name:"addcontent", func:l_obj_add_to_container},
    {name:"has_timer", func:l_obj_timer_has},
    {name:"peek_timer", func:l_obj_timer_peek},
    {name:"stop_timer", func:l_obj_timer_stop},
    {name:"start_timer", func:l_obj_timer_start},
    {name:"bury", func:l_obj_bury},
    {name:0, func:0}

];

export const l_obj_meta = [

    {name:"__gc", func:l_obj_gc},
    {name:0, func:0}

];

export function l_obj_register(L)
{
    /* Table of instance methods (e.g. an_object:isnull())
       and static methods (e.g. obj.new("dagger")). */
    C.luaL_newlib(L, C.l_obj_methods);

    /* metatable = { __name = "obj", __gc = l_obj_gc } */
    C.luaL_newmetatable(L, "obj");
    C.luaL_setfuncs(L, C.l_obj_meta, 0);
    /* metatable.__index points at the object method table. */
    C.lua_pushvalue(L, -2);
    C.lua_setfield(L, -2, "__index");

    /* Don't let lua code mess with the real metatable.
       Instead offer a fake one that only contains __gc. */
    C.luaL_newlib(L, C.l_obj_meta);
    C.lua_setfield(L, -2, "__metatable");

    /* We don't need the metatable anymore. It's safe in the
       Lua registry for use by luaL_setmetatable. */
    C.lua_pop(L, 1);

    /* global obj = the method table we created at the start */
    C.lua_setglobal(L, "obj");
    return 0;
}

/* for 'onefile' processing where end of this file isn't necessarily the
   end of the source code seen by the compiler */

// #undef lobj_is_ok

/*nhlobj.c*/


