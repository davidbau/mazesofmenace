// One source-owned light graph with canonical actors and opaque union bits.
export function createNativeLightState(environment,L,owner){
 const {memory,transport:t}=environment,views=owner.nativeRecords,arena=owner.nativeArena;
 const address=environment.address,raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0));
 const nodes=new Map(),unions=new Map(),opaque=new Map(),circles=new Map(),roots={};
 for(const[name,type]of Object.entries({gv:'instance_globals_v',u:'you',gy:'instance_globals_y',gm:'instance_globals_m',gb:'instance_globals_b',svl:'instance_globals_saved_l'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 function actor(type,bits){if(!bits)return 0;const p=Number(bits);if(Number.isSafeInteger(p)&&p>=16&&p+environment.ctypes.size(type)<=memory.buffer.byteLength)return views.record(type,p);const key=type+':'+bits;if(!opaque.has(key))opaque.set(key,Object.freeze({address:bits}));return opaque.get(key);}
 function union(p,local=false){
  if(!local){p=address(p);if(unions.has(p))return unions.get(p);}
  const reservation=local?t.stackAlloc.reserve(8):undefined;let bits=0n,at=local?undefined:p;
  const alive=()=>reservation?.assertAlive(),read=()=>{alive();return at===undefined?bits:arena.view.getBigUint64(at,true);},write=v=>{alive();v=raw(v);if(at===undefined)bits=v;else arena.view.setBigUint64(at,v,true);};
  const pointer=()=>{alive();return at===undefined?bits:arena.pointer(at);};
  const out={get address(){alive();if(at===undefined){at=reservation();arena.view.setBigUint64(at,bits,true);}return at;},get a_void(){return read();},set a_void(v){write(v);},get a_obj(){return actor('struct obj',pointer());},set a_obj(v){write(v);},get a_monst(){return actor('struct monst',pointer());},set a_monst(v){write(v);},get a_uint(){return Number(read()&0xffffffffn);},set a_uint(v){const low=BigInt(t.uint(v));write((read()&0xffffffff00000000n)|low);}};
  if(!local)unions.set(p,out);return out;
 }
 function lightSource(p){p=address(p);if(!p)return 0;if(nodes.has(p))return nodes.get(p);const out=Object.create(views.record('struct ls_t',p));nodes.set(p,out);Object.defineProperties(out,{next:{get:()=>lightSource(arena.pointer(p+L.ls_next)),set:v=>arena.storePointer(p+L.ls_next,v)},id:{get:()=>union(p+L.ls_id),set:v=>{arena.view.setBigUint64(p+L.ls_id,raw(v.a_void),true);}}});return out;}
 const head=environment.requireGlobal('gl')+L.lightBase;
 roots.gl={get light_base(){return lightSource(arena.pointer(head));},set light_base(v){arena.storePointer(head,v);}};
 roots.cg={zeroany:union(environment.requireGlobal('cg')+L.zeroany)};
 const ref=(at,kind)=>({address:at,get value(){return arena.view['get'+kind](at,true);},set value(v){arena.view['set'+kind](at,kind==='BigInt64'?t.long(v):kind==='Int16'?t.short(v):t.int(v),true);}});
 function local(kind,size){const reservation=t.stackAlloc.reserve(size);let value=0,at;return {get address(){reservation.assertAlive();if(at===undefined){at=reservation();arena.view['set'+kind](at,value,true);}return at;},get value(){reservation.assertAlive();return at===undefined?value:arena.view['get'+kind](at,true);},set value(v){reservation.assertAlive();v=kind==='Uint32'?t.uint(v):t.int(v);if(at===undefined)value=v;else arena.view['set'+kind](at,v,true);}};}
 const link=at=>({address:at,get value(){return lightSource(arena.pointer(at));},set value(v){arena.storePointer(at,v);}});
 let rowCache;
 function seenRows(p){if(Array.isArray(p)&&p.address===undefined)return p;p=address(p);let rows=rowCache;if(!rows||rows.address!==p||rows.buffer!==memory.buffer){rows={address:p,buffer:memory.buffer,value:Array(L.ROWNO),pointers:Array(L.ROWNO)};rowCache=rows;}for(let y=0;y<L.ROWNO;y++){const row=arena.pointer(p+y*8);if(rows.pointers[y]!==row){memory.bounds(row,L.COLNO);rows.value[y]=arena.Uint8.subarray(row,row+L.COLNO);rows.pointers[y]=row;}}return rows.value;}
 const context={...L,...roots,rawPointer:raw,address,lightSource,anything:p=>union(p),anyLocal:()=>union(0,true),copyAny:(to,from)=>{to.a_void=from.a_void;},copyLight:(to,from)=>memory.memmove(address(to),address(from),L.lightSourceSize),
  object:p=>views.record('struct obj',p),monster:p=>views.record('struct monst',p),nhfile:p=>views.record('struct nh_file',p),
  samePtr:(a,b)=>(a?.address??a??0)===(b?.address??b??0)||raw(a)===raw(b),
  intLocal:()=>local('Int32',4),uintLocal:()=>local('Uint32',4),longPointer:p=>ref(address(p),'BigInt64'),coordRef:(ls,key)=>ref(address(ls)+L['ls_'+key],'Int16'),
  lightHeadRef:()=>link(head),lightNextRef:ls=>link(address(ls)+L.ls_next),seenRows,
  circle_ptr(radius){const base=environment.requireGlobal('vision.circle_data'),start=environment.requireGlobal('vision.circle_start'),p=base+arena.view.getInt16(start+radius*2,true)*2;let out=circles.get(radius);if(!out){out=Array.from({length:radius+1},(_,i)=>arena.view.getInt16(p+i*2,true));circles.set(radius,out);}return out;},
  abs:Math.abs,u_at:(x,y)=>x===roots.u.ux&&y===roots.u.uy,DEADMONSTER:mon=>mon.mhp<1,mon_is_local:mon=>mon.mx>0,
  update_file:f=>f.mode&(L.COUNTING|L.WRITING),release_data:f=>f.mode&L.FREEING,
  Is_candle:o=>o.otyp===L.TALLOW_CANDLE||o.otyp===L.WAX_CANDLE,
  ignitable:o=>o.otyp===L.BRASS_LANTERN||o.otyp===L.OIL_LAMP||(o.otyp===L.MAGIC_LAMP&&o.spe>0)||o.otyp===L.CANDELABRUM_OF_INVOCATION||o.otyp===L.TALLOW_CANDLE||o.otyp===L.WAX_CANDLE||o.otyp===L.POT_OIL,
 };
 Object.defineProperties(context,{fmon:{get:()=>roots.svl.level.monlist},uskin:{get:()=>views.record('struct obj',arena.pointer(environment.requireGlobal('uskin')))},levl:{get:()=>owner.spatial?.cells??roots.svl.level.locations},HEAP8:{get:()=>arena.Int8},HEAPU8:{get:()=>arena.Uint8}});
 return context;
}
