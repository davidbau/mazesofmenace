// Frozen v5 nhlobj.c: actual Lua object references and placement.
import { game } from './gstate.js';
import { LuaTable, LuaUserdata } from './lua/interp.js';
import { readobjnam, hands_obj } from './objnam.js';
import { mksobj, mkobj, obj_extract_self, place_object, dealloc_obj } from './mklev.js';
import { newsym } from './display.js';
import { get_table_objtype, get_table_objclass, cvt_to_abscoord } from './sp_lev.js';
import { def_char_to_objclass } from './drawing.js';
import { OBJ_FREE, OBJ_LUAFREE } from './const.js';

function l_obj_check(value) {
    if (!(value instanceof LuaUserdata) || value.metatable.get('__name') !== 'obj')
        throw new Error('Obj error');
    return value.value;
}
export async function l_obj_gc(value) {
    const lo = l_obj_check(value);
    const obj = lo.obj;
    if (obj) {
        if (obj.lua_ref_cnt > 0) obj.lua_ref_cnt--;
        if (!obj.lua_ref_cnt && (obj.where === OBJ_FREE || obj.where === OBJ_LUAFREE)) {
            while (obj.cobj) {
                const otmp = obj.cobj;
                obj_extract_self(otmp);
                await dealloc_obj(otmp);
            }
            obj.where = OBJ_FREE;
            await dealloc_obj(obj);
        }
        lo.obj = null;
    }
}
export function l_obj_push(L, obj) {
    const lo = new LuaUserdata({ state: 0, obj }, L.objMetatable);
    if (obj) obj.lua_ref_cnt = (obj.lua_ref_cnt || 0) + 1;
    L.objectRefs.add(lo);
    return lo;
}
export async function l_obj_new_readobjnam(L, ...args) {
    if (args.length !== 1) throw new Error('l_obj_new_readobjname: Wrong args');
    let obj;
    if (typeof args[0] === 'string') {
        obj = await readobjnam(args[0], null);
        if (obj === hands_obj) obj = null;
    } else if (args[0] instanceof LuaTable) {
        const id = get_table_objtype(args[0]);
        let cls = get_table_objclass(args[0]);
        if (id >= 1) obj = await mksobj(id, true, false);
        else {
            cls = def_char_to_objclass(cls);
            if (cls >= 18) cls = 0;
            obj = await mkobj(cls, false);
        }
    } else throw new Error('l_obj_new_readobjname: Wrong args');
    return l_obj_push(L, obj);
}
export function l_obj_placeobj(...args) {
    const lo = l_obj_check(args[0]);
    if (args.length !== 3) throw new Error('l_obj_placeobj: Wrong args');
    const coord = value => {
        const n = Number(value);
        if (!Number.isInteger(n)) throw new Error('Lua integer expected');
        return (n << 24) >> 24;
    };
    const { x, y } = cvt_to_abscoord(coord(args[1]), coord(args[2]),
        { xstart: game.gx?.xstart || 0, ystart: game.gy?.ystart || 0 });
    if (lo.obj && lo.obj.where !== OBJ_LUAFREE) {
        obj_extract_self(lo.obj);
        place_object(lo.obj, x, y);
        newsym(x, y);
    }
}
export function l_obj_register(L) {
    L.objectRefs = new Set();
    L.defineGlobal('obj', {
        new: (...args) => l_obj_new_readobjnam(L, ...args),
        placeobj: l_obj_placeobj,
        isnull: value => { const lo = l_obj_check(value); return !lo.obj || lo.obj.where === OBJ_LUAFREE; },
    });
    L.objMetatable = new LuaTable();
    L.objMetatable.set('__name', 'obj');
    L.objMetatable.set('__index', L.getGlobal('obj'));
    L.objMetatable.set('__gc', l_obj_gc);
}
