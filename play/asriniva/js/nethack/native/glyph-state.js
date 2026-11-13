import {withCEnvironment} from '../../c-runtime/context.js';
import {glyphHeaders} from '../glyph-header-functions.js';
// One native glyph context and stable record graph per game/provider.
import abi from '../glyph-abi.json' with {type:'json'};
import * as original from '../../ported/glyphs.js';
import {createNativeGlyphs} from './glyphs.js';
const raw=v=>BigInt(v?.address??v??0),address=v=>{const at=v?.address??v??0;return typeof at==='number'&&Number.isSafeInteger(at)?at:Number(raw(v));};
const base=Symbol('glyph native storage');
const indexed=(get,at=0)=>new Proxy({address:at},{get:(o,key)=>/^\d+$/.test(String(key))?get(Number(key)):Reflect.get(o,key),set(){throw Error('Read-only GLYPHS array');}});
export function createNativeGlyphsBridge(layout){
 const contexts=new WeakMap(),states=new WeakMap();
 function contextFor(input){
  const moduleKey=input.moduleKey;let context=contexts.get(moduleKey);if(context){if(context.owner!==input.nativeOwner)throw Error('Native glyph provider changed memory owner');return context;}
  let provider=input;const methods=new Map();
  const services=new Proxy({}, {get(_target,key){const value=Reflect.get(provider,key,provider);if(typeof value!=='function')return value;const previous=methods.get(key);if(previous?.provider===provider&&previous.value===value)return previous.call;const selected=provider,call=(...args)=>Reflect.apply(value,selected,args);methods.set(key,{provider:selected,value,call});return call;}});
  const owner=services.nativeOwner,arena=owner?.nativeArena;if(!arena||!owner.nativeRecords)throw Error('Native glyph state requires the game typed owner');
  for(const [k,v]of Object.entries({pointerSize:8,longSize:8,sizeSize:8,intSize:4,uint32Size:4,charSigned:1}))if(layout[k]!==v)throw Error('Review GLYPHS native ABI '+k);
  for(const [kind,key]of Object.entries({find:'findSize',cache:'cacheEntrySize',detail:'detailSize',map:'mapSize',unicode:'unicodeSize'}))if(layout[key]!==abi.fields.find(row=>row.kind===kind).size)throw Error('Review GLYPHS native size '+kind);
  const callbackAt=address(services.callbackAddress()),views=new Map(),arrays=new Map(),prototypes=new Map();let native;
  function typed(kind,value){
   const at=address(value);if(!at)return 0;
   const row=abi.fields.find(row=>row.kind===kind);if(!row)throw Error('Unknown native glyph record '+kind);
   if(!['find','cache','symparse','symset','custom'].includes(kind))return owner.nativeRecords.record(row.ctype,at);
   let bucket=views.get(kind);if(!bucket)views.set(kind,bucket=new Map());if(bucket.has(at))return bucket.get(at);
   let prototype=prototypes.get(kind);
   if(!prototype){prototype=Object.create(null);
    for(const field of row.fields){const offset=field.offset,method=(field.signed?'Int':'Uint')+field.size*8;
     Object.defineProperty(prototype,field.name,{enumerable:true,get(){const p=this[base]+offset,value=field.pointer?arena.pointer(p):arena.view['get'+method](p,true);if(kind==='find'&&field.name==='callback')return address(value)===callbackAt?native.to_custom_symset_entry_callback:address(value);if(kind==='custom'&&['details','details_end'].includes(field.name))return typed('detail',value);return Number(value);},set(v){if(kind==='find'&&field.name==='callback'&&typeof v==='function'){if(v!==native.to_custom_symset_entry_callback)throw Error('Review unknown native GLYPHS callback');v=callbackAt;}const p=this[base]+offset;v=typeof v==='number'&&Number.isInteger(v)?v:raw(v);if(field.pointer)arena.storePointer(p,v);else{if(typeof v==='bigint')v=Number(BigInt[field.signed?'asIntN':'asUintN'](field.size*8,v));arena.view['set'+method](p,v,true);}}});
    }
    prototypes.set(kind,prototype);
   }
   const record=Object.create(prototype,{address:{value:at,writable:true,enumerable:true},[base]:{value:at}});bucket.set(at,record);return record;
  }
  const cacheArray=at=>{at=address(at);if(!at)return 0;if(!arrays.has(at))arrays.set(at,indexed(i=>typed('cache',at+i*layout.cacheEntrySize),at));return arrays.get(at);};
  let state=states.get(services.moduleKey);
  if(!state){state={statics:new Map(),glyphid_cache:original.glyphid_cache,glyphid_cache_lsize:original.glyphid_cache_lsize,glyphid_cache_size:original.glyphid_cache_size,glyphcache_find:typed('find',services.findBacking(0)),to_custom_symbol_find:typed('find',services.findBacking(1)),zero_find:typed('find',services.findBacking(2))};for(const [key,value]of Object.entries(original.zero_find))state.zero_find[key]=value;states.set(services.moduleKey,state);}
  const privateState={glyphcache_find:state.glyphcache_find,to_custom_symbol_find:state.to_custom_symbol_find};
  Object.defineProperties(privateState,{glyphid_cache:{get:()=>cacheArray(state.glyphid_cache),set:v=>{const next=address(v);if(state.glyphid_cache!==next){arrays.delete(state.glyphid_cache);views.delete('cache');}state.glyphid_cache=next;}},glyphid_cache_lsize:{get:()=>state.glyphid_cache_lsize,set:v=>{state.glyphid_cache_lsize=Number(v)>>>0;}},glyphid_cache_size:{get:()=>state.glyphid_cache_size,set:v=>{state.glyphid_cache_size=BigInt.asUintN(64,BigInt(v));}}});
  const env=Object.assign(Object.create(services),layout,{glyphsState:privateState,zero_find:state.zero_find,
   nonzero_black:BigInt(layout[original.nonzero_black[0]])|BigInt(layout[original.nonzero_black[1]]),
   detail:at=>typed('detail',at),unicode:at=>typed('unicode',at),cacheArray,
   copyFind:(a,b)=>services.memcpy(a,b,layout.findSize),copyUnicode:(a,b)=>services.memcpy(a,b,layout.unicodeSize),
   localFind(src){const at=services.stackAlloc(layout.findSize);services.memcpy(at,src,layout.findSize);return typed('find',at);},
   callFindCallback(fn,glyph,find){const saved=services.stackSave();try{if(fn===native.to_custom_symset_entry_callback)return fn(glyph,find);return owner.boundary(withCEnvironment,env,()=>typeof fn==='function'?fn(glyph,find):services.callback(fn,glyph,find));}finally{services.stackRestore(saved);}},
   staticInt(key,initial){let value=state.statics.get(key);if(!value){let n=Number(initial)|0;value={get value(){return n;},set value(v){n=Number(v)|0;}};state.statics.set(key,value);}return value;},
   newArray:n=>Array(Number(n)),byteArray(values){const at=services.stackAlloc(values.length);services.heap().set(values,at);return at;},byteMatrix(rows,cols){const at=services.stackAlloc(rows*cols);return Array.from({length:rows},(_,i)=>at+i*cols);},
   intLocal(value){const at=services.stackAlloc(4);arena.view.setInt32(at,Number(value),true);return{address:at};},
   loadChar:(p,i=0)=>arena.view.getInt8(address(p)+Number(i)),storeChar:(p,v)=>arena.view.setInt8(address(p),Number(v)),storeInt:(p,v)=>arena.view.setInt32(address(p),Number(v),true),samePtr:(a,b)=>raw(a)===raw(b),nhUse(){},
   glyphAddress:i=>services.element(0,i,0),glyphArray:at=>indexed(i=>typed('map',address(at)+i*layout.mapSize)),glyphmap:indexed(i=>typed('map',services.element(0,i,0))),
   gs:{symset:indexed(i=>typed('symset',services.element(2,i,0))),sym_customizations:indexed(i=>indexed(j=>typed('custom',services.element(1,i,j))))},
   objects:indexed(i=>typed('object',services.element(3,i,0))),loadsyms:indexed(i=>typed('symparse',services.element(4,i,0))),monsdump:indexed(i=>typed('enum',services.element(5,i,0))),obj_descr:indexed(i=>typed('descr',services.element(6,i,0))),mons:indexed(i=>typed('monster',services.element(7,i,0))),
   Snprintf(fn,line,out,size,format,a=0,b=0){return format==='G_%s%d'?services.formatInt(fn,line,out,size,format,a,b):services.format(fn,line,out,size,format,a,b);},Strcpy:(a,b)=>services.strcpy(a,b),Strcat:(a,b)=>services.strcat(a,b),
  });
  for(const key of ['res_nothing','res_dump_glyphids','res_fill_cache','find_nothing','find_pm','find_oc','find_cmap','find_glyph'])env[key]=original[key];
  abi.globals.forEach((path,i)=>{const parts=path.split('.'),key=parts.pop();let object=env;for(const part of parts)object=object[part]??=Object.create(null);Object.defineProperty(object,key,{get:()=>Number(services.global(i)),set:v=>services.setGlobal(i,BigInt(v))});});
  abi.headers.forEach((name,i)=>{const header=glyphHeaders[i];if(!header)throw Error('Missing native glyph header '+name);env[name]=glyph=>header(Number(glyph)|0);});
  native=createNativeGlyphs(env);context={env,native,owner,typed,bind(next){const previous=provider;provider=next;return previous;}};contexts.set(moduleKey,context);return context;
 }
 const call=(services,name,...args)=>{const owner=services.nativeOwner,saved=services.stackSave();let ctx,previous;owner.enter();try{ctx=contextFor(services);previous=ctx.bind(services);if(name==='to_custom_symset_entry_callback'||name==='glyph_find_core'||name==='parse_id')args[1]=ctx.typed('find',args[1]);if(name==='add_custom_nhcolor_entry')args[2]=Number(args[2])>>>0;return ctx.native[name](...args);}finally{try{if(ctx)ctx.bind(previous);owner.leave();}finally{services.stackRestore(saved);}}};
 call.context=contextFor;return call;
}
