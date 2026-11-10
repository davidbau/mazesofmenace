// Typed memory/ABI/header adapters. All original targeting algorithms stay in
// getpos.js; private callbacks/state belong to one actual Module environment.
export function createGetposEnvironment(services,L,source) {
    for(const[k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,coordSize:2,charSigned:1,booleanSize:1,frameColorSize:4,spkeySize:1,showsymSize:1}))if(L[k]!==v)throw new Error('Review changed GETPOS ABI '+k);
    const address=v=>Number(v?.address??v??0),raw=v=>BigInt(typeof v==='string'?services.literal(v):v?.address??v??0),view=()=>new DataView(services.heap().buffer),global=i=>address(services.global(i));
    const index=(get,set)=>new Proxy({}, {get(t,k){return typeof k==='string'&&/^-?\d+$/.test(k)?get(Number(k)):Reflect.get(t,k);},set(t,k,v){if(set&&typeof k==='string'&&/^-?\d+$/.test(k)){set(Number(k),v);return true;}return Reflect.set(t,k,v);}});
    const scalar=(o,k,at,size,signed=true)=>{if(![1,2,4,8].includes(size))throw new Error('GETPOS field width '+k);const type=(size===8?'Big':'')+(signed?'Int':'Uint')+size*8;Object.defineProperty(o,k,{get(){return view()['get'+type](at(),true);},set(v){view()['set'+type](at(),size===8?raw(v):Number(v),true);}});};
    const ptr=(o,k,at,wrap)=>Object.defineProperty(o,k,{get(){return wrap(Number(view().getBigUint64(at(),true)));},set(v){view().setBigUint64(at(),raw(v),true);}});
    const struct=(at,prefix,keys)=>{at=address(at);const o={address:at};for(const k of keys)scalar(o,k,()=>at+L[prefix+'_'+k],L[prefix+'_'+k+'_size']);return o;};
    const coord=v=>address(v)?struct(v,'coord',['x','y']):0;
    const coordArray=v=>address(v)?Object.assign(index(i=>coord(address(v)+i*L.coordStructSize)),{address:address(v)}):0;
    const intPointer=v=>{const o={address:address(v)};scalar(o,'value',()=>o.address,4);return o;};
    const coordPointer=v=>{const o={address:address(v)};scalar(o,'value',()=>o.address,2);return o;};
    const coordArrayPointer=v=>{const o={address:address(v)};ptr(o,'value',()=>o.address,coordArray);return o;};
    const stringPointer=v=>{const o={address:address(v)};ptr(o,'value',()=>o.address,address);return o;};
    const anything=v=>{const o={address:address(v)};scalar(o,'a_int',()=>o.address,4);return o;};
    const menu=v=>{const o={address:address(v)};Object.defineProperty(o,'item',{get(){return anything(o.address+L.menu_item);}});return o;};
    const menuPointer=v=>{const o={address:address(v)};ptr(o,'value',()=>o.address,menu);return o;};
    const command=v=>address(v)?struct(v,'cmdq',['typ','key','dirx','diry','dirz','intval']):0;
    const selection=v=>address(v)?struct(v,'selection',['wid','hei']):0;
    const trap=v=>{if(!address(v))return 0;const o={address:address(v)};for(const[i,k]of['ttyp','tseen'].entries())Object.defineProperty(o,k,{get(){return services.trapBit(o,i);}});return o;};
    const alloc=size=>services.stackAlloc(size),zero=size=>{const at=alloc(size);services.heap().fill(0,at,at+size);return at;};
    const charArray=v=>Object.assign(index(i=>view().getInt8(address(v)+i),(i,n)=>view().setInt8(address(v)+i,n)),{address:address(v)});
    const intArray=v=>Object.assign(index(i=>view().getInt32(address(v)+i*4,true),(i,n)=>view().setInt32(address(v)+i*4,n,true)),{address:address(v)});
    const coordArrayCells=n=>{const at=zero(n*8);return Object.assign(index(i=>coordArrayPointer(at+i*8).value,(i,v)=>{coordArrayPointer(at+i*8).value=v;}),{address:at});};
    const copy=(out,input,size)=>{const heap=services.heap();heap.copyWithin(address(out),address(input),address(input)+size);};
    const u=struct(global(0),'u',['ux','uy','dx','dy','dz']),iflags=struct(global(4),'iflags',['bgcolors','getloc_filter','getloc_moveskip','getloc_travelmode','getloc_usemenu','getpos_coords','autodescribe','remember_getpos','cmdassist']);scalar(iflags,'terrainmode',()=>global(4)+L.iflags_terrainmode,L.iflags_terrainmode_size,false);
    const gg=struct(global(2),'gg',['getposx','getposy','gloc_filter_floodfill_match_glyph']);ptr(gg,'gloc_filter_map',()=>global(2)+L.gg_gloc_filter_map,selection);
    const gw={wsettings:{}},flags={},gi={},svl={level:{flags:{}}};scalar(gw.wsettings,'map_frame_color',()=>global(3),4,false);scalar(gi,'in_doagain',()=>global(8),L.inDoagainSize);
    for(const[i,k]of['help','verbose'].entries())Object.defineProperty(flags,k,{get(){return services.flag(i);}});Object.defineProperty(svl.level.flags,'hero_memory',{get(){return services.flag(2);}});
    const env=Object.assign(Object.create(services),L,{u,iflags,gg,gw,flags,gi,svl,coord,command,selection,trap,intPointer,coordPointer,coordArrayPointer,coordArray,menuPointer,address,
        gc:{Cmd:{spkeys:index(i=>view().getUint8(global(5)+i))}},gs:{showsyms:index(i=>view().getUint8(global(6)+i*L.showsymSize))},defsyms:index(i=>{const o={};scalar(o,'sym',()=>global(7)+i*L.symbolSize+L.symbol_sym,L.symbol_sym_size,false);return o;}),cg:{zeroany:global(10)},nul_glyphinfo:global(11),quitchars:global(12),what_is_a_location:global(13),
        ...source.getpos_initial_state,
        callLocal:(fn,...a)=>{const saved=services.stackSave();try{return fn(...a);}finally{services.stackRestore(saved);}},samePtr:(a,b)=>raw(a)===raw(b),coordxy:v=>Number(v)<<16>>16,schar:v=>Number(v)<<24>>24,abs:v=>Math.abs(v|0),max:Math.max,sgn:v=>v>0?1:v<0?-1:0,
        coordLocal:()=>coord(alloc(L.coordStructSize)),commandLocal:()=>command(alloc(L.commandSize)),anythingLocal:()=>anything(alloc(L.anythingSize)),coordLocalPointer:()=>coordPointer(zero(2)),intLocalPointer:()=>intPointer(zero(4)),coordArrayPointerLocal:()=>coordArrayPointer(zero(8)),menuPointerLocal:()=>menuPointer(zero(8)),stringPointerLocal:value=>{const o=stringPointer(alloc(8));o.value=services.literal(value);return o;},
        charArrayLocal:n=>charArray(alloc(n)),intArrayLocal:n=>intArray(zero(n*4)),coordArrayCells,coordArrayCell:(a,i)=>coordArrayPointer(address(a)+i*8),intArrayCell:(a,i)=>intPointer(address(a)+i*4),copyAnything:(a,b)=>copy(a,b,L.anythingSize),copyCommand:(a,b)=>copy(a,b,L.commandSize),
        loadChar:v=>view().getInt8(address(v)),storeChar:(v,n)=>view().setInt8(address(v),n),IS_DOOR:t=>t===L.DOOR,u_at:(x,y)=>x===u.ux&&y===u.uy,
        monnum_to_glyph:(n,g)=>services.monnumToGlyph(n,g),objnum_to_glyph:n=>services.objnumToGlyph(n),
        levl:index(x=>index(y=>struct(global(1)+(x*L.ROWNO+y)*L.rmSize,'rm',['typ','glyph','seenv']))),
        qsort:(p,n,size,fn)=>{if(fn!==source.cmp_coord_distu)throw new Error('Unexpected GETPOS comparator');return services.qsortCoords(p,n,size);},
        set_selection_floodfillchk:fn=>{if(fn!==source.gloc_filter_floodfill_matcharea)throw new Error('Unexpected GETPOS floodfill callback');return services.setFloodfillCallback();},
    });
    for(const[i,k]of['glyph_is_cmap','glyph_is_monster','glyph_is_object','glyph_is_nothing','glyph_is_unexplored','is_cmap_room','is_cmap_furniture','is_cmap_wall','is_cmap_corr','is_cmap_water','is_cmap_lava','is_cmap_door','is_cmap_drawbridge','is_cmap_trap','is_cmap_engraving'].entries())env[k]=v=>services.glyphMacro(i,v);
    for(const[i,k]of['do_move_west','do_move_south','do_move_north','do_move_east','do_run_west','do_run_south','do_run_north','do_run_east','do_run','do_rush'].entries())Object.defineProperty(env,k,{get(){return services.commandToken(i);}});
    Object.defineProperties(env,{WIN_MAP:{get(){return services.flag(3);}},WIN_MESSAGE:{get(){return services.flag(4);}}});
    env.selection_new=()=>selection(services.selection_new());env.cmdq_pop=()=>command(services.cmdq_pop());env.t_at=(...a)=>trap(services.t_at(...a));env.Strcpy=(...a)=>services.strcpy(...a);
    return env;
}
