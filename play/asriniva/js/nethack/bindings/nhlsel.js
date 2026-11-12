import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Typed memory, original header macros and native dependency adapters only.
// Selection algorithms and source callback catalogues remain in nhlsel.js.
export function createNhlselEnvironment(services,L,source) {
    for(const[k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,coordSize:2,booleanSize:1,charSigned:1,luaIntegerSize:8,luaNumberSize:8}))if(L[k]!==v)throw new Error('Review changed NHLSEL ABI '+k);
    const address=v=>Number(v?.address??v??0),raw=v=>BigInt(v?.address??v??0),view=()=>CAdapter.currentDataView(services),global=i=>address(services.global(i));
    const scalar=(o,k,at,size)=>Object.defineProperty(o,k,{get(){return view()['getInt'+size*8](at(),true);},set(v){view()['setInt'+size*8](at(),Number(v),true);}});
    const pointer=(o,k,at,wrap)=>Object.defineProperty(o,k,{get(){return wrap(Number(view().getBigUint64(at(),true)));},set(v){view().setBigUint64(at(),raw(v),true);}});
    const struct=(p,prefix,keys)=>{p=address(p);if(!p)return 0;const o={address:p};for(const k of keys)scalar(o,k,()=>p+L[prefix+'_'+k],L[prefix+'_'+k+'_size']);return o;};
    const rect=p=>struct(p,'rect',['lx','ly','hx','hy']);
    const selection=p=>{const o=struct(p,'selection',['wid','hei','bounds_dirty']);if(!o)return 0;pointer(o,'map',()=>o.address+L.selection_map,address);Object.defineProperty(o,'bounds',{get(){return rect(o.address+L.selection_bounds);}});return o;};
    const room=p=>struct(p,'room',['lx','ly']);
    const coder=p=>{if(!address(p))return 0;const o={address:address(p)};pointer(o,'croom',()=>o.address+L.coder_croom,room);return o;};
    const copy=(a,b,n)=>services.heap().copyWithin(address(a),address(b),address(b)+n);
    const ref=(get,set)=>({get value(){return get();},set value(v){set(v);}});
    const withRefs=(spec,fn)=>{const saved=services.stackSave();try{const cells=spec.map(([p,size,kind])=>{const at=services.stackAlloc(size);if(kind==='pointer')view().setBigUint64(at,raw(p.value),true);else if(size===8)view().setBigInt64(at,BigInt(p.value??0),true);else view().setInt16(at,Number(p.value??0),true);return at;});const result=fn(...cells);spec.forEach(([p,size,kind],i)=>{p.value=kind==='pointer'?Number(view().getBigUint64(cells[i],true)):size===8?view().getBigInt64(cells[i],true):view().getInt16(cells[i],true);});return result;}finally{services.stackRestore(saved);}};
    const env=Object.assign(Object.create(services),L,{address,selection,rect,ref,coordxy:v=>Number(BigInt.asIntN(16,BigInt(v))),int:v=>Number(BigInt.asIntN(32,BigInt(v))),max:Math.max,
        copySelection:(a,b)=>copy(a,b,L.selectionSize),copyRect:(a,b)=>copy(a,b,L.rectSize),rectLocal:input=>{const at=services.stackAlloc(L.rectSize);copy(at,input,L.rectSize);return rect(at);},charArrayLocal:n=>services.stackAlloc(n),
        SP_COORD_PACK:(x,y)=>BigInt((x&255)+((y&255)<<16)),SP_COORD_PACK_RANDOM:f=>BigInt(L.SP_COORD_IS_RANDOM|f),
        cg:{zeroNhRect:global(0)},gc:{},gx:{},gy:{},svn:{},svr:{rooms:new Proxy({}, {get(t,k){return /^\d+$/.test(String(k))?room(global(5)+Number(k)*L.roomSize):Reflect.get(t,k);}})},
        levl:new Proxy({}, {get(t,x){return new Proxy({}, {get(t,y){return struct(global(6)+(Number(x)*L.ROWNO+Number(y))*L.rmSize,'rm',['typ']);}});}}),
        callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
    });
    pointer(env.gc,'coder',()=>global(1),coder);scalar(env.gx,'xstart',()=>global(2),L.xstartSize);scalar(env.gy,'ystart',()=>global(3),L.ystartSize);scalar(env.svn,'nroom',()=>global(4),L.nroomSize);
    for(const k of ['selection_new','selection_not','selection_filter_percent','selection_filter_mapchar','selection_from_mkroom','luaL_checkudata','lua_newuserdata'])env[k]=(...a)=>selection(services[k](...a));
    env.rect_bounds=(a,b,c)=>services.rectBounds(a,b,c);
    env.get_location_coord=(x,y,mode,room,packed)=>withRefs([[x,2],[y,2]],(xp,yp)=>services.get_location_coord(xp,yp,mode,room,packed));
    env.selection_rndcoord=(sel,x,y,remove)=>withRefs([[x,2],[y,2]],(xp,yp)=>services.selection_rndcoord(sel,xp,yp,remove));
    env.nhl_get_xy_params=(state,x,y)=>withRefs([[x,8],[y,8]],(xp,yp)=>services.nhl_get_xy_params(state,xp,yp));
    for(const k of ['cvt_to_abscoord','cvt_to_relcoord'])env[k]=(x,y)=>withRefs([[x,2],[y,2]],(xp,yp)=>services[k](xp,yp));
    env.mapfrag_free=p=>withRefs([[p,8,'pointer']],at=>services.mapfrag_free(at));
    const arrays=new WeakMap();
    const nativeArray=(array,kind)=>{if(arrays.has(array))return arrays.get(array);const p=services.tableStorage(kind);if(kind<2){array.forEach(([name,fn],i)=>{view().setBigUint64(p+i*L.luaRegSize+L.luaReg_name,typeof name==='string'?BigInt(services.literal(name)):0n,true);view().setBigUint64(p+i*L.luaRegSize+L.luaReg_func,fn?BigInt(services.callbackToken(source.callbackNames.findIndex(k=>source[k]===fn))):0n,true);});}else array.forEach((s,i)=>view().setBigUint64(p+i*8,typeof s==='string'?BigInt(services.literal(s)):0n,true));arrays.set(array,p);return p;};
    env.luaL_newlib=(state,array)=>{const p=nativeArray(array,array===source.l_selection_methods?0:1);services.luaL_checkversion_(state,L.LUA_VERSION_NUM,BigInt(L.LUAL_NUMSIZES));services.lua_createtable(state,0,array.length-1);services.luaL_setfuncs(state,p,0);};
    env.luaL_setfuncs=(state,array,n)=>services.luaL_setfuncs(state,nativeArray(array,array===source.l_selection_methods?0:1),n);
    env.luaL_checkoption=(state,n,def,array)=>services.luaL_checkoption(state,n,def,nativeArray(array,array.length===7?2:3));
    env.get_table_option=(state,key,def,array)=>services.get_table_option(state,key,def,nativeArray(array,array.length===7?2:3));
    env.lua_pop=(state,n)=>services.lua_settop(state,-n-1);env.lua_remove=(state,n)=>{services.lua_rotate(state,n,-1);services.lua_settop(state,-2);};env.lua_newtable=state=>services.lua_createtable(state,0,0);
    env.luaL_getmetatable=(state,name)=>services.lua_getfield(state,L.LUA_REGISTRYINDEX,name);
    return env;
}
