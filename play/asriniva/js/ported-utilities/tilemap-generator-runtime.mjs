import*as core from'./tilemap-generator.mjs';import{createUtility as createCommon}from'./tilemap-common-runtime.mjs';import{withCEnvironment}from'./tilemap-scope.mjs';
import constants from'./tilemap-generator-constants.json'with{type:'json'};import formats from'./tilemap-generator-formats.json'with{type:'json'};
const stateByModule=new WeakMap();
export function createUtility(m){
 const base=createCommon(m),C=base.C,L=base.L,view=()=>new DataView(m.HEAPU8.buffer),ptr=p=>Number(p?.address??p??0),p64=p=>BigInt(ptr(p));
 const str=s=>C.charPointer(s),int=C.int,size=n=>BigInt.asUintN(64,BigInt(n));
 let state=stateByModule.get(m);if(!state){state=Object.fromEntries(['tilemap_file','TILE_corr','TILE_stone','TILE_unexplored','TILE_nothing','lastmontile','lastobjtile','lastothtile','laststatuetile'].map(k=>[k,0]));stateByModule.set(m,state);}
 constants.forEach((name,i)=>{C[name]=Number(m._gen_constant(i));});C.SOURCE_TEMPLATE='../src/%s';C.TILE_FILE='tile.c';
 C.wall_offsets=[C.GLYPH_CMAP_MAIN_OFF,C.GLYPH_CMAP_MINES_OFF,C.GLYPH_CMAP_GEH_OFF,C.GLYPH_CMAP_KNOX_OFF,C.GLYPH_CMAP_SOKO_OFF];
 C.expl_offsets=[C.GLYPH_EXPLODE_DARK_OFF,C.GLYPH_EXPLODE_NOXIOUS_OFF,C.GLYPH_EXPLODE_MUDDY_OFF,C.GLYPH_EXPLODE_WET_OFF,C.GLYPH_EXPLODE_MAGICAL_OFF,C.GLYPH_EXPLODE_FIERY_OFF,C.GLYPH_EXPLODE_FROSTY_OFF];
 for(const k of Object.keys(state))Object.defineProperty(C,k,{get:()=>state[k],set:v=>{state[k]=k==='tilemap_file'?ptr(v):int(v);}});
 const map=Number(m._tm_storage(0)),nameOffset=Number(m._gen_layout(0)),nameSize=Number(m._gen_layout(1)),glyphOffset=Number(m._gen_layout(2));C.mapNameSize=BigInt(nameSize);
 C.tilemap=new Proxy({address:map,length:L.MAX_GLYPH},{get(o,k){if(typeof k==='string'&&/^\d+$/.test(k)){const p=map+Number(k)*L.mapSize;return{address:p,name:p+nameOffset,get tilenum(){return view().getInt16(p+L.map_tilenum,true);},set tilenum(v){view().setInt16(p+L.map_tilenum,int(v),true);},get glyph(){return view().getInt32(p+glyphOffset,true);},set glyph(v){view().setInt32(p+glyphOffset,int(v),true);}};}return Reflect.get(o,k);}});
 let scratch;
 C.scratchLocal=(key,n)=>{if(!scratch)throw Error('Native scratch outside utility invocation');if(!scratch.has(key))scratch.set(key,m.stackAlloc(n));return scratch.get(key);};
 C.callLocal=(fn,...args)=>{const sp=m.stackSave(),old=scratch;scratch=new Map();try{return fn(...args);}finally{scratch=old;m.stackRestore(sp);}};
 const originals={Snprintf:C.Snprintf,Sprintf:C.Sprintf,Fprintf:C.Fprintf};
 for(const[name,callee,prefix,packets]of[['Snprintf','nh_snprintf','snprintf','genSnprintfSites'],['Sprintf','sprintf','sprintf','genSprintfSites'],['Fprintf','fprintf','fprintf','genFprintfSites']]){
  const sites=formats.filter(x=>x.callee===callee);C[packets]=sites.map((row,i)=>Object.freeze({kind:name,index:i,shape:row.shape}));
  C[name]=(...args)=>{const meta=args.at(-1);if(!meta||typeof meta!=='object'||meta.kind!==name)return originals[name](...args);args.pop();const count=name==='Snprintf'?3:2,head=name==='Snprintf'?[p64(args[0]),size(args[1]),BigInt(str(args[2]))]:[p64(args[0]),BigInt(str(args[1]))];return m['_gen_'+prefix+meta.index](...head,...args.slice(count).map((v,i)=>meta.shape[i]==='p'?BigInt(str(v)):meta.shape[i]==='z'?size(v):int(v)));};
 }
 C.objects_globals_init=()=>m._objects_globals_init();C.monst_globals_init=()=>m._monst_globals_init();C.fopen=(a,b)=>Number(m._gen_fopen(BigInt(str(a)),BigInt(str(b))));C.fclose=p=>m._gen_fclose(p64(p));C.perror=p=>m._gen_perror(BigInt(str(p)));C.unlink=p=>m._gen_unlink(BigInt(str(p)));
 return{C,L,state,invoke(name,...args){const sp=m.stackSave(),old=scratch;scratch=new Map();try{return withCEnvironment(C,core[name],...args);}finally{scratch=old;m.stackRestore(sp);}}};
}
