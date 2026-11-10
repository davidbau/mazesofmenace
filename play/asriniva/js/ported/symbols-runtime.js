// Live native aliases and original-header ABI; symbol parsing remains in symbols.js.
import * as symbols from './symbols.js';
import {withCEnvironment} from './c-runtime.js';
const modules=new WeakMap();
export function createSymbolsEnvironment(services,layout){
 const address=x=>Number(x?.address??x??0),view=()=>new DataView(services.heap().buffer),global=i=>address(services.global(i));
 const pointer=at=>Number(view().getBigUint64(at,true));
 const indexed=get=>new Proxy({}, {get(o,k){return typeof k==='string'&&/^-?\d+$/.test(k)?get(Number(k)):o[k];}});
 const scalar=(o,k,at,kind)=>Object.defineProperty(o,k,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),Number(v),true);}});
 const ptr=(o,k,at,wrap=x=>x)=>Object.defineProperty(o,k,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),BigInt(address(v)),true);}});
 function symparse(x){const at=address(x);if(!at)return 0;const o={address:at};scalar(o,'range',()=>at+layout.symparse_range,'Int32');scalar(o,'idx',()=>at+layout.symparse_idx,'Int32');ptr(o,'name',()=>at+layout.symparse_name);return o;}
 function symset(x){const at=address(x);if(!at)return 0;const o={address:at};ptr(o,'next',()=>at+layout.symset_next,symset);for(const k of ['name','desc'])ptr(o,k,()=>at+layout['symset_'+k]);for(const k of ['idx','handling'])scalar(o,k,()=>at+layout['symset_'+k],'Int32');for(const [i,k]of ['nocolor','primary','rogue','explicitly'].entries())Object.defineProperty(o,k,{get(){return services.bit(at,i);},set(v){services.setBit(at,i,Number(v));}});return o;}
 function saved(x){const at=address(x);if(!at)return 0;const o={address:at};for(const k of ['name','val'])ptr(o,k,()=>at+layout['saved_'+k]);scalar(o,'which_set',()=>at+layout.saved_which_set,'Int32');ptr(o,'next',()=>at+layout.saved_next,saved);return o;}
 const byteArray=(at,n)=>new Proxy({}, {get(o,k){return /^\d+$/.test(String(k))?view().getUint8(at+Number(k)):o[k];},set(o,k,v){view().setUint8(at+Number(k),Number(v));return true;}});
 const gs={showsyms:byteArray(global(0)+layout.showsyms,layout.SYM_MAX),symset:indexed(i=>symset(global(0)+layout.symset+i*layout.symsetSize))},go={ov_primary_syms:byteArray(global(1)+layout.ov_primary,layout.SYM_MAX),ov_rogue_syms:byteArray(global(1)+layout.ov_rogue,layout.SYM_MAX)},gp={primary_syms:byteArray(global(2)+layout.primary,layout.SYM_MAX)},gr={rogue_syms:byteArray(global(3)+layout.rogue,layout.SYM_MAX)},gc={},cg={zeroany:global(5)+layout.zeroany},u={};
 ptr(gs,'symset_list',()=>global(0)+layout.symset_list,symset);for(const k of ['symset_count','symset_which_set'])scalar(gs,k,()=>global(0)+layout[k],'Int32');scalar(gc,'currentgraphics',()=>global(4)+layout.currentgraphics,'Int32');for(const [k,f]of [['chosen_symset_start','chosen_start'],['chosen_symset_end','chosen_end']])scalar(gc,k,()=>global(4)+layout[f],'Int8');Object.defineProperty(u,'uz',{get(){return global(6)+layout.hero_level;}});
 const drawing=(index,size,offset,kind)=>indexed(i=>{const o={};scalar(o,'sym',()=>global(index)+i*size+offset,kind);return o;});
 const local=n=>services.stackAlloc(n),pointerLocal=(value=0)=>{const at=local(layout.pointerSize),o={address:at};view().setBigUint64(at,BigInt(address(value)),true);ptr(o,'value',()=>at);return o;};
 const env=Object.assign(Object.create(services),layout,{gs,go,gp,gr,gc,cg,u,symparse,symset,saved,
  known_handling:indexed(i=>pointer(address(services.storage(1))+i*layout.pointerSize)),known_restrictions:indexed(i=>pointer(address(services.storage(2))+i*layout.pointerSize)),
  defsyms:drawing(7,layout.symdefSize,layout.symdef_sym,'Uint8'),def_oc_syms:drawing(8,layout.classSize,layout.class_sym,'Int8'),def_monsyms:drawing(9,layout.classSize,layout.class_sym,'Int8'),def_warnsyms:drawing(10,layout.symdefSize,layout.symdef_sym,'Uint8'),def_r_oc_syms:byteArray(global(11),layout.MAXOCLASSES),
  int:v=>Number(v)|0,uchar:v=>Number(v)&255,boolean:v=>Number(v)<<24>>24,
  loadChar:at=>view().getInt8(address(at)),storeChar(at,v){view().setInt8(address(at),Number(v));return Number(v)<<24>>24;},
  SYMHANDLING:type=>gs.symset[gc.currentgraphics].handling===type,WC2_utf8_bits:BigInt(layout.WC2_U_UTF8STR),
  pointerLocal,intLocal(value){const at=local(4),o={address:at};if(value!==undefined)view().setInt32(at,Number(value),true);scalar(o,'value',()=>at,'Int32');return o;},
  anythingLocalCopy(source){const at=local(layout.anythingSize);services.heap().copyWithin(at,address(source),address(source)+layout.anythingSize);const o={address:at};scalar(o,'a_int',()=>at+layout.anyInt,'Int32');return o;},
  menuItems:at=>indexed(i=>{const o={item:{}};scalar(o.item,'a_int',()=>address(at)+i*layout.menuSize+layout.menuInt,'Int32');return o;}),
  callLocal(fn,...args){const sp=services.stackSave();try{return fn(...args);}finally{services.stackRestore(sp);}},
  Is_rogue_level:level=>services.on_level(level,services.rogueLevel()),
 });
 Object.defineProperties(env,{loadsyms:{get(){return symparse(services.storage(0));}},saved_symbols:{get(){return saved(pointer(address(services.storage(3))));},set(v){view().setBigUint64(address(services.storage(3)),BigInt(address(v)),true);}},decgraphics_mode_callback:{get(){return services.callback(0);}},utf8graphics_mode_callback:{get(){return services.callback(1);}},SYMBOLS:{get(){return services.fileName();}}});
 return env;
}
export function initializeSymbols(services,layout){
 const key=services.moduleKey;if(!key)throw new Error('SYMBOLS requires actual Module identity');let env=modules.get(key);if(env)return env;
 for(const[k,n]of Object.entries({pointerSize:8,intSize:4,nhsymSize:1,loadsymsCount:symbols.loadsyms.length,knownHandlingCount:symbols.known_handling.length,knownRestrictionCount:symbols.known_restrictions.length}))if(layout[k]!==n)throw new Error('Review changed symbols layout: '+k);
 const view=()=>new DataView(services.heap().buffer),resolve=expr=>expr.split('+').map(x=>x.trim()).reduce((a,k)=>{const v=/^\d+$/.test(k)?Number(k):layout[k];if(!Number.isSafeInteger(v))throw new Error('Missing native symbols selector '+k);return a+v;},0);
 for(const [storage,table]of [[1,symbols.known_handling],[2,symbols.known_restrictions]])for(const[i,value]of table.entries()){const p=value?services.literal(value):0;view().setBigUint64(Number(services.storage(storage))+i*layout.pointerSize,BigInt(p),true);}
 for(const[i,row]of symbols.loadsyms.entries()){const p=row.name?services.literal(row.name):0,at=Number(services.storage(0))+i*layout.symparseSize;view().setInt32(at+layout.symparse_range,resolve(row.range),true);view().setInt32(at+layout.symparse_idx,resolve(row.idx),true);view().setBigUint64(at+layout.symparse_name,BigInt(p),true);}
 env=createSymbolsEnvironment(services,layout);modules.set(key,env);return env;
}
export function callSymbols(services,layout,name,...args){const env=initializeSymbols(services,layout);if(name==='initialize')return;if(name==='environment')return env;const fn=symbols[name];if(typeof fn!=='function')throw new Error('Unknown original symbols function '+name);if(name.startsWith('update_'))args[0]=env.symparse(args[0]);const sp=services.stackSave();try{return withCEnvironment(env,fn,...args);}finally{services.stackRestore(sp);}}
