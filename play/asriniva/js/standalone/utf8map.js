// Original Unicode symbol policies on the existing standalone symbol storage.
import abi from './utf8map-abi.json' with {type:'json'};
import * as source from '../ported/utf8map.js';
import {createUtf8Environment} from '../nethack/bindings/utf8.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableUtf8map(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services:S,memory,ctypes,transport}=environment,L=layouts.utf8map,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review UTF8MAP native layout '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof S[name]==='function'?S[name]:environment.resolve(name);
 const field=name=>{const f=abi.fields[name],at=ctypes.locate(f.type,environment.requireGlobal(f.global),f.field).at;if(at-environment.requireGlobal(f.global)!==f.offset)throw new Error('Review UTF8MAP field '+name);return at;};
 const local={heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,stackAlloc:transport.stackAlloc,
  glyphmap:()=>environment.requireGlobal('glyphmap'),gbuf:()=>field('gbuf'),showsyms:()=>field('showsyms'),customizations:()=>field('customizations'),currentgraphics:()=>ctypes.load('int',field('currentgraphics')),
  hexdd:()=>environment.requireGlobal('hexdd'),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),
  alloc:n=>environment.alloc('alloc',transport.uint(n)),dupstr:p=>address(environment.alloc('dupstr',text(p))),free:p=>S.free(address(p)),
  strchr:(p,ch)=>S.strchr(text(p),transport.int(ch)),strcpy:(out,p)=>S.strcpy(address(out),text(p)),
  decode_glyph:(p,out)=>resolve('decode_glyph')(text(p),address(out)),map_glyphinfo:(x,y,glyph,flags,out)=>resolve('map_glyphinfo')(x,y,glyph,flags,address(out)),
  find_matching_customization:(name,type,set)=>address(resolve('find_matching_customization')(text(name),type,set)),apply_customizations:(set,what)=>resolve('apply_customizations')(set,what),
 };
 const call=(name,...args)=>transport.scoped(()=>{
  const context=createUtf8Environment(local,L);
  if(name==='unicode_val')args[0]=text(args[0]);
  if(name==='set_map_u')args=[context.glyphMap(address(args[0])),transport.uint(args[1]),text(args[2])];
  if(name==='mixed_to_utf8')args=[address(args[0]),Number(args[1]),text(args[2]),address(args[3])];
  if(name==='add_custom_urep_entry')args=[text(args[0]),transport.int(args[1]),transport.uint(args[2]),text(args[3]),transport.int(args[4])];
  return withCEnvironment(context,source[name],...args);
 });
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));
 environment.register('utf8map',Object.fromEntries(names.map(name=>[name,(...args)=>call(name,...args)])));
 const owner={services:local,call,exports:names,limitation:'Original configured ENHANCED_SYMBOLS policies on shared symbol/glyph/customization records; acceptance is limited to explicit C comparison cases.'};owners.set(environment,owner);return owner;
}
