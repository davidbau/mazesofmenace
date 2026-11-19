// js/hand/nhlua.js: hand-written replacement of nhlua.c nhl_alloc()
// (transpiler/annotations.jsonc functions.nhl_alloc).
//
// C (src/nhlua.c:3132):
//     nhl_alloc(void *ud, void *ptr, size_t osize, size_t nsize)
//     {   nhl_user_data *nud = ud;
//         if (nsize == 0) { if (ptr != NULL) free(ptr); return NULL; }
//         if (nud && nud->L && nud->memlimit)
//             if (nhl_getmeminuse(nud->L) > nud->memlimit) return NULL;
//         return re_alloc(ptr, (unsigned) nsize);
//     }
// One C function serves two memories: NetHack calls it for its own
// nhl_user_data (ud NULL: object-world memory), and Lua calls it through
// lua_Alloc for every Lua object (heap-world memory). So there are two JS
// faces: nhl_alloc (object world) and nhl_alloc.$heap (the lua_Alloc the
// bridge hands to lua_newstate; ud is the handle of the nud record).
import * as $c from '../crt/alloc.js';
import * as H from '../crt/heap.js';
import { heapApi } from '../crt/bridge.js';
import { CTrap } from '../crt/int.js';

export function nhl_alloc(ud, ptr, osize, nsize) {
    if (Number(nsize) === 0) {
        if (ptr !== null) $c.free(ptr);
        return null;
    }
    if (ud && ud.L && ud.memlimit) throw new CTrap('nhl_alloc: an object-world allocation with a memory limit');   // NetHack passes ud NULL
    let n = Number(nsize) >>> 0;
    if (n % 8) n += 8 - n % 8;   // re_alloc's ForceAlignedLength
    return $c.realloc(ptr, n);
}
/** nhl_getmeminuse(L): lua_gc(L, LUA_GCCOUNT) * 1024 + lua_gc(L, LUA_GCCOUNTB), as uint32_t. */
async function meminuse(L) {
    const kb = await heapApi.lua_gc(L, 3), b = await heapApi.lua_gc(L, 4);
    return (Math.imul(kb, 1024) + b) >>> 0;
}
nhl_alloc.$heap = async (ud, ptr, osize, nsize) => {
    if (Number(nsize) === 0) {
        if (ptr !== 0) H.free(ptr);
        return 0;
    }
    const nud = ud === 0 ? null : H.deref(ud);
    if (nud && nud.L && nud.memlimit) {
        if (await meminuse(nud.L) > (nud.memlimit >>> 0)) return 0;
    }
    let n = Number(nsize) >>> 0;
    if (n % 8) n += 8 - n % 8;   // re_alloc's ForceAlignedLength
    return H.realloc(ptr, n);   // re_alloc panics only when the host is out of memory
};
