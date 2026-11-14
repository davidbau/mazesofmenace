// Shared native REGION identities and bounded arrays. Array slots alias measured
// storage so retained serialization and foreign byte consumers see the same state.
export function installNativeRegionState(services,L,env,globals){
 const owner=services.nativeOwner,views=owner.nativeRecords,arena=owner.nativeArena;
 const address=v=>Number(v?.address??v??0),regions=new Map(),arrays=new Map();
 function array(kind,p,length){
  p=address(p);if(!p)return 0;
  const stride=kind==='uint'?4:kind==='rect'?L.rectSize:8;
  length??=services.nativeAllocationSize(p)/stride;
  if(!Number.isSafeInteger(length)||length<0)throw Error('Native REGION array requires a measured extent');
  const key=kind+':'+p+':'+length;if(arrays.has(key))return arrays.get(key);
  const out=Array(length);Object.defineProperty(out,'address',{value:p});arrays.set(key,out);
  for(let i=0;i<length;i++){
   const at=p+i*stride;
   if(kind==='rect')Object.defineProperty(out,i,{enumerable:true,value:views.record('NhRect',at)});
   else Object.defineProperty(out,i,{enumerable:true,get:kind==='uint'?()=>arena.Uint32[at/4]:()=>region(arena.pointer(at)),set:kind==='uint'?v=>{arena.Uint32[at/4]=typeof v==='bigint'?Number(BigInt.asUintN(32,v)):v;}:v=>arena.storePointer(at,v)});
  }
  return out;
 }
 function region(p){
  p=address(p);if(!p)return 0;if(regions.has(p))return regions.get(p);
  const base=views.record('NhRegion',p),out=Object.create(base);regions.set(p,out);
  Object.defineProperties(out,{
   rects:{get:()=>array('rect',arena.pointer(p+L.reg_rects),base.nrects),set:v=>{base.rects=v;}},
   monsters:{get:()=>array('uint',arena.pointer(p+L.reg_monsters),base.max_monst),set:v=>{base.monsters=v?.address??v;}},
  });return out;
 }
 const roots={gm:'instance_globals_m',svn:'instance_globals_saved_n',svm:'instance_globals_saved_m',gg:'instance_globals_g',u:'you',gy:'instance_globals_y',gi:'instance_globals_i',svc:'instance_globals_saved_c',iflags:'instance_flags',cg:'const_globals',svl:'instance_globals_saved_l',gv:'instance_globals_v'};
 for(const [name,type]of Object.entries(roots))env[name]=globals[name]=views.record('struct '+type,services.nativeGlobal(name));
 const gr={};Object.defineProperty(gr,'regions',{get:()=>array('region',arena.pointer(services.nativeGlobal('gr')+L.gr_regions)),set:v=>arena.storePointer(services.nativeGlobal('gr')+L.gr_regions,v)});env.gr=globals.gr=gr;
 Object.assign(env,{
  region,rect:p=>views.record('NhRect',p),rectArray:(p,n)=>array('rect',p,n),uintArray:p=>array('uint',p),regionArray:p=>array('region',p),
  monster:p=>views.record('struct monst',p),permonst:p=>views.record('struct permonst',p),any:p=>views.record('union any',p),nhfile:p=>views.record('struct nh_file',p),
  mons:views.array('struct permonst',services.nativeGlobal('mons'),services.nativeSpeciesCount),
  terrain:(x,y)=>env.svl.level.locations[x][y],m_at:(x,y)=>env.svl.level.monsters[x][y],
  find_mid:(id,flags)=>views.record('struct monst',services.find_mid(id,flags)),
  cansee:(x,y)=>!!(arena.Uint8[arena.pointer(env.gv.viz_array+y*8)+x]&L.IN_SIGHT),
  rectLocal:from=>{const p=services.stackAlloc(L.rectSize);if(from)services.memcpy(p,from,L.rectSize);return views.record('NhRect',p);},
 });
 owner.regionRecord=region;
 return env;
}
