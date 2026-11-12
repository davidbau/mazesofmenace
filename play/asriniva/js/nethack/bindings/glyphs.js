import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as glyphs from '../../ported/glyphs.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const fields={"find": ["findtype", "val", "loadsyms_offset", "loadsyms_count", "extraval", "color", "unicode_val", "callback", "restype", "reserved"], "cache": ["glyphnum", "id"], "detail": ["next", "content.urep.glyphidx", "content.urep.u.utf32ch", "content.urep.u.utf8str", "content.ccolor.glyphidx", "content.ccolor.nhcolor", "content.sym.symparse", "content.sym.val"], "map": ["customcolor", "color256idx", "u"], "unicode": ["utf32ch", "utf8str"], "custom": ["customization_name", "count", "custtype", "details", "details_end"], "symset": ["name", "handling"], "object": ["oc_descr_idx"], "symparse": ["range", "idx", "name"], "enum": ["val", "nm"], "descr": ["oc_name", "oc_descr"], "monster": ["mlet"]};
const pointers={"find.extraval": "pointer", "find.unicode_val": "pointer", "find.callback": "callback", "find.reserved": "pointer", "cache.id": "pointer", "detail.next": "detail", "detail.content.urep.u.utf8str": "pointer", "detail.content.sym.symparse": "pointer", "map.u": "unicode", "unicode.utf8str": "pointer", "custom.customization_name": "pointer", "custom.details": "detail", "custom.details_end": "detail", "symset.name": "pointer", "symparse.name": "pointer", "enum.nm": "pointer", "descr.oc_name": "pointer", "descr.oc_descr": "pointer"};
const globals=["gs.symset_which_set", "iflags.customsymbols", "iflags.customcolors", "iflags.pending_customizations", "gc.currentgraphics"];
const headers=["glyph_is_body", "glyph_is_body_piletop", "glyph_is_cmap", "glyph_is_cmap_a", "glyph_is_cmap_altar", "glyph_is_cmap_b", "glyph_is_cmap_c", "glyph_is_cmap_gehennom", "glyph_is_cmap_knox", "glyph_is_cmap_main", "glyph_is_cmap_mines", "glyph_is_cmap_sokoban", "glyph_is_cmap_zap", "glyph_is_detected_female_monster", "glyph_is_detected_male_monster", "glyph_is_explosion", "glyph_is_fem_statue", "glyph_is_fem_statue_piletop", "glyph_is_female_pet", "glyph_is_invisible", "glyph_is_male_pet", "glyph_is_male_statue", "glyph_is_male_statue_piletop", "glyph_is_monster", "glyph_is_normal_female_monster", "glyph_is_normal_male_monster", "glyph_is_normal_piletop_obj", "glyph_is_nothing", "glyph_is_object", "glyph_is_ridden_female_monster", "glyph_is_ridden_male_monster", "glyph_is_statue", "glyph_is_swallow", "glyph_is_unexplored", "glyph_is_warning", "glyph_to_body_corpsenm", "glyph_to_explosion", "glyph_to_mon", "glyph_to_obj", "glyph_to_statue_corpsenm", "glyph_to_swallow"];
const raw=v=>BigInt(v?.address??v??0),address=v=>{const at=v?.address??v??0;return typeof at==='number'&&Number.isSafeInteger(at)?at:Number(raw(v));};
const indexed=(get,set,at=0)=>new Proxy({address:at},{get:(target,key)=>/^\d+$/.test(String(key))?get(Number(key)):Reflect.get(target,key),set:(_,key,v)=>{if(!set)throw new Error('Read-only GLYPHS array');set(Number(key),v);return true;}});
const recordContexts=new WeakMap();
const kindNames=Object.keys(fields);
const recordSchemas=Object.fromEntries(kindNames.map((kind,kindIndex)=>{
 const root={descriptors:Object.create(null),children:Object.create(null)};
 fields[kind].forEach((path,fieldIndex)=>{
  const parts=path.split('.'),key=parts.pop();let node=root;
  for(const part of parts){if(!node.children[part]){node.children[part]={descriptors:Object.create(null),children:Object.create(null)};node.descriptors[part]=null;}node=node.children[part];}
  const pointerKind=pointers[kind+'.'+path];
  node.descriptors[key]={get(){const context=recordContexts.get(this),value=context.services.get(kindIndex,fieldIndex,context.at);
   if(pointerKind==='callback')return address(value)===context.callbackAt?glyphs.to_custom_symset_entry_callback:address(value);
   if(pointerKind==='pointer')return address(value);if(pointerKind)return context.typed(pointerKind,value);return Number(value);},
   set(value){const context=recordContexts.get(this);if(kind==='find'&&path==='callback'&&typeof value==='function'){if(value!==glyphs.to_custom_symset_entry_callback)throw new Error('Review unknown GLYPHS callback');value=context.callbackAt;}context.services.set(kindIndex,fieldIndex,context.at,raw(value));}};
 });return[kind,root];
}));
// Shared accessors contain schema only; every record keeps its original context.
const recordPrototypes=new WeakMap(),recordChildren=new WeakMap();
function defineRecord(node,schema,context){
 let prototype=recordPrototypes.get(schema);
 if(!prototype){
  prototype=Object.create(Object.getPrototypeOf(node));const descriptors={...schema.descriptors};
  for(const [key,childSchema]of Object.entries(schema.children))descriptors[key]={get(){let children=recordChildren.get(this);if(!children)recordChildren.set(this,children=new Map());if(!children.has(key))children.set(key,defineRecord(Object.create(null),childSchema,recordContexts.get(this)));return children.get(key);},set(value){let children=recordChildren.get(this);if(!children)recordChildren.set(this,children=new Map());children.set(key,value);},enumerable:true,configurable:true};
  Object.defineProperties(prototype,descriptors);recordPrototypes.set(schema,prototype);
 }
 recordContexts.set(node,context);Object.setPrototypeOf(node,prototype);return node;
}
export function createGlyphsBridge(layout){
 const states=new WeakMap();
 return (services,name,...args)=>{
  if(layout.pointerSize!==8||layout.longSize!==8||layout.sizeSize!==8||layout.intSize!==4||layout.uint32Size!==4||!layout.charSigned)throw new Error('Review GLYPHS memory64/long/char ABI');
  const saved=services.stackSave();
  let cacheSlot,symparseSlot,mapSlot,detailSlot,unicodeSlot,reuseActive=true;
  try{
   // Retain only the current buffer/view; every access still asks this invocation's heap service.
   let viewBuffer, dataView;
   const view=()=>{const buffer=services.heap().buffer;if(buffer!==viewBuffer){const next=new DataView(buffer);viewBuffer=buffer;dataView=next;}return dataView;};
   const callbackAt=services.callbackAddress();
   const typed=(kind,at)=>{at=address(at);if(!at)return 0;
    const slot=kind==='cache'?cacheSlot:kind==='symparse'?symparseSlot:kind==='map'?mapSlot:kind==='detail'?detailSlot:kind==='unicode'?unicodeSlot:undefined;
    if(reuseActive&&slot?.address===at)return slot.record;
    const record=defineRecord({address:at},recordSchemas[kind],{services,callbackAt,typed,at});
    if(reuseActive){if(kind==='cache')cacheSlot={address:at,record};else if(kind==='symparse')symparseSlot={address:at,record};else if(kind==='map')mapSlot={address:at,record};else if(kind==='detail')detailSlot={address:at,record};else if(kind==='unicode')unicodeSlot={address:at,record};}
    return record;
   };
   const cacheArray=at=>{at=address(at);return at?indexed(i=>typed('cache',at+i*layout.cacheEntrySize),undefined,at):0;};
   let state=states.get(services.moduleKey);
   if(!state){state={statics:new Map()};
    state.glyphid_cache=glyphs.glyphid_cache;state.glyphid_cache_lsize=glyphs.glyphid_cache_lsize;state.glyphid_cache_size=glyphs.glyphid_cache_size;
    state.glyphcache_find=typed('find',services.findBacking(0));state.to_custom_symbol_find=typed('find',services.findBacking(1));state.zero_find=typed('find',services.findBacking(2));
    for(const [key,value]of Object.entries(glyphs.zero_find))state.zero_find[key]=value;
    states.set(services.moduleKey,state);
   }
   const privateState={glyphcache_find:state.glyphcache_find,to_custom_symbol_find:state.to_custom_symbol_find};
   Object.defineProperties(privateState,{glyphid_cache:{get:()=>cacheArray(state.glyphid_cache),set:v=>{state.glyphid_cache=address(v);}},glyphid_cache_lsize:{get:()=>state.glyphid_cache_lsize,set:v=>{state.glyphid_cache_lsize=Number(v)>>>0;}},glyphid_cache_size:{get:()=>state.glyphid_cache_size,set:v=>{state.glyphid_cache_size=BigInt.asUintN(64,BigInt(v));}}});
   const env=Object.assign(Object.create(services),layout,{glyphsState:privateState,zero_find:state.zero_find,
    nonzero_black:BigInt(layout[glyphs.nonzero_black[0]])|BigInt(layout[glyphs.nonzero_black[1]]),
    detail:at=>typed('detail',at),unicode:at=>typed('unicode',at),cacheArray,
    copyFind:(dst,src)=>services.memcpy(dst,src,layout.findSize),copyUnicode:(dst,src)=>services.memcpy(dst,src,layout.unicodeSize),
    localFind(src){const at=services.stackAlloc(layout.findSize);services.memcpy(at,src,layout.findSize);return typed('find',at);},
    callLocal(fn,...values){return CAdapter.callWithStack(services,fn,...values);},
    callFindCallback(fn,glyph,find){const sp=services.stackSave();try{return typeof fn==='function'?fn(glyph,find):services.callback(fn,glyph,find);}finally{services.stackRestore(sp);}},
    staticInt(key,initial){let v=state.statics.get(key);if(!v){let value=Number(initial)|0;v={get value(){return value;},set value(n){value=Number(n)|0;}};state.statics.set(key,v);}return v;},
    newArray:n=>Array(Number(n)),
    byteArray(values){const at=services.stackAlloc(values.length);services.heap().set(values,at);return at;},
    byteMatrix(rows,cols){const at=services.stackAlloc(rows*cols);return Array.from({length:rows},(_,i)=>at+i*cols);},
    intLocal(value){const at=services.stackAlloc(4);view().setInt32(at,Number(value),true);return{address:at};},
    loadChar:(p,i=0)=>view().getInt8(address(p)+Number(i)),
    storeChar:(p,v)=>view().setInt8(address(p),Number(v)),
    storeInt:(p,v)=>view().setInt32(address(p),Number(v),true),
    samePtr:(a,b)=>raw(a)===raw(b),nhUse(){},
    glyphAddress:i=>services.element(0,i,0),glyphArray:at=>indexed(i=>typed('map',address(at)+i*layout.mapSize)),
    glyphmap:indexed(i=>typed('map',services.element(0,i,0))),
    gs:{symset:indexed(i=>typed('symset',services.element(2,i,0))),sym_customizations:indexed(i=>indexed(j=>typed('custom',services.element(1,i,j))))},
    objects:indexed(i=>typed('object',services.element(3,i,0))),loadsyms:indexed(i=>typed('symparse',services.element(4,i,0))),
    monsdump:indexed(i=>typed('enum',services.element(5,i,0))),obj_descr:indexed(i=>typed('descr',services.element(6,i,0))),mons:indexed(i=>typed('monster',services.element(7,i,0))),
    Snprintf(fn,line,out,size,format,a=0,b=0){return format==='G_%s%d'?services.formatInt(fn,line,out,size,format,a,b):services.format(fn,line,out,size,format,a,b);},
    Strcpy:(out,text)=>services.strcpy(out,text),Strcat:(out,text)=>services.strcat(out,text),
   });
   for(const key of["res_nothing", "res_dump_glyphids", "res_fill_cache", "find_nothing", "find_pm", "find_oc", "find_cmap", "find_glyph"])env[key]=glyphs[key];
   globals.forEach((path,i)=>{const parts=path.split('.'),key=parts.pop();let object=env;for(const p of parts)object=object[p]??=(Object.create(null));Object.defineProperty(object,key,{get:()=>Number(services.global(i)),set:v=>services.setGlobal(i,BigInt(v))});});
   headers.forEach((key,i)=>env[key]=glyph=>services.header(i,glyph));
   if(['to_custom_symset_entry_callback'].includes(name))args[1]=typed('find',args[1]);
   if(['glyph_find_core','parse_id'].includes(name))args[1]=typed('find',args[1]);
   if(name==='add_custom_nhcolor_entry')args[2]=Number(args[2])>>>0;
   return withCEnvironment(env,glyphs[name],...args);
  }finally{try{services.stackRestore(saved);}finally{reuseActive=false;cacheSlot=symparseSlot=mapSlot=detailSlot=unicodeSlot=undefined;}}
 };
}
