// Original COLORATT storage/context and POSIXREGEX wrapper, shared game memory.
import abi from './color-attributes-abi.json' with {type:'json'};
import {REG_EXTENDED,REG_NOSUB} from '../libraries/regex/posix.js';
import * as color from '../ported/coloratt.js';
import {createColorattState,createColorattEnvironment} from './bindings/coloratt.js';
import * as regex from '../ported/posixregex.js';
import {createPosixregexEnvironment,initializePosixregex} from './bindings/posixregex.js';
const owners=new WeakMap();
export function enableColorAttributes(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,transport,ctypes,functions}=environment,L=layouts.coloratt,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const name of ['coloratt'])for(const[k,v]of Object.entries(abi.layout[name]))if(layouts[name][k]!==v)throw new Error('Review '+name+' ABI '+k);
 const identifier=environment.allocateGlobal('regex_id',abi.layout.posixregex.identifierSize);
 const r={heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,identifier:()=>identifier,alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),Strcpy:(out,value)=>services.strcpy(address(out),text(value))};
 for(const name of ['regcomp','regexec','regerror','regfree'])r[name]=(...args)=>services[name](...args.map(v=>v?.address??v));
 r.regcomp=(at,pattern,flags)=>{if(flags!==(abi.layout.posixregex.REG_EXTENDED|abi.layout.posixregex.REG_NOSUB))throw new Error('Unsupported configured native regex flags '+flags);return services.regcomp(address(at),text(pattern),REG_EXTENDED|REG_NOSUB);};
 initializePosixregex(r,abi.layout.posixregex,regex.regex_id);const re=createPosixregexEnvironment(r,abi.layout.posixregex);
 environment.register('posixregex',Object.fromEntries(['regex_init','regex_compile','regex_error_desc','regex_match','regex_free'].map(n=>[n,regex[n]])),re,{prepareArgs:(name,args)=>{if(['regex_compile','regex_match'].includes(name)){args[0]=text(args[0]);args[1]=re.regex(address(args[1]));}if(['regex_error_desc','regex_free'].includes(name))args[0]=re.regex(address(args[0]));return args;}});
 const sizes=[L.colorCount*L.colorEntrySize,L.colorNameCount*L.nameEntrySize,L.attrNameCount*L.nameEntrySize,L.color256Count*L.color256Size,L.BUFSZ,8];
 const storage=sizes.map((n,i)=>environment.allocateGlobal('coloratt.storage.'+i,n));
 const local=Object.create(services);
 for(const name of ['cg','gm','gc','gs','iflags'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,storage:i=>storage[i],global:i=>{const n=['cg','gm','gc','gs','iflags'][i];if(!n)throw new Error('Unknown COLORATT global');return environment.requireGlobal(n);},stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),regex_free:p=>environment.resolve('regex_free')(address(p))});
 Object.defineProperty(local,'hexdd',{value:undefined,writable:true,configurable:true});
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 Object.assign(local,{
  regexId:()=>environment.requireGlobal('regex_id'),hexdd:()=>environment.requireGlobal('hexdd'),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),
  dupstr:value=>environment.alloc('dupstr',text(value)),strlen:value=>Number(resolve('strlen')(text(value))),
  strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),strncmpi:(a,b,n)=>resolve('strncmpi')(text(a),text(b),transport.int(n)),
  strncpy:(out,value,n)=>address(resolve('strncpy')(address(out),text(value),transport.ulong(n))),strchr:(value,ch)=>address(resolve('strchr')(text(value),transport.int(ch))),strstri:(value,sub)=>address(resolve('strstri')(text(value),text(sub))),
  memcpy:(out,value,n)=>address(resolve('memcpy')(address(out),text(value),transport.ulong(n))),fuzzymatch:(a,b,skip,insensitive)=>resolve('fuzzymatch')(text(a),text(b),text(skip),transport.char(insensitive)),atoi:value=>resolve('atoi')(text(value)),mungspaces:value=>address(resolve('mungspaces')(address(value))),isspace:value=>resolve('isspace')(transport.int(value)),
  regex_init:()=>address(resolve('regex_init')()),regex_compile:(value,re)=>resolve('regex_compile')(text(value),address(re)),regex_error_desc:(re,out)=>address(resolve('regex_error_desc')(address(re),address(out))),
  Sprintf:(out,format,a,b)=>resolve('sprintf')(address(out),text(format),text(a),text(b)),config_error_add:(format,a,b)=>resolve('config_error_add')(text(format),text(a),text(b)),
  sscanf:(value,format,r,g,b,extra)=>resolve('sscanf')(text(value),text(format),address(r),address(g),address(b),address(extra)),
  Snprintf:(out,size,format,...args)=>{const site=abi.snprintfSites[transport.int(args.pop())];if(!site)throw new Error('Unknown COLORATT Snprintf source site');return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(size),text(format),...args.map(v=>args.length===3?transport.uint(v):text(v)));},
  assert:condition=>{if(!condition){const a=abi.assertion;return resolve('__assert_fail')(text(a.condition),text(a.file),a.line,text(a.function));}},
  add_menu:(win,glyph,any,accelerator,group,attr,clr,value,flags)=>resolve('add_menu')(transport.int(win),address(glyph),address(any),transport.char(accelerator),transport.char(group),transport.int(attr),transport.int(clr),text(value),transport.uint(flags)),select_menu:(win,how,picks)=>resolve('select_menu')(transport.int(win),transport.int(how),address(picks)),
 });
 const window=(field,sig,...args)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),field).at;return functions.indirect(memory.view.getBigUint64(at,true),sig,...args);};
 Object.assign(local,{create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),start_menu:(win,behavior)=>window('win_start_menu','vij',transport.int(win),transport.ulong(behavior)),end_menu:(win,prompt)=>window('win_end_menu','vip',transport.int(win),text(prompt)),destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win))});
 const state=createColorattState(local,L,color),context=createColorattEnvironment(local,L,state);
 const publicNames=Object.keys(abi.public);for(const n of publicNames)if(environment.hasFunction(n))throw new Error('Unexpected existing COLORATT owner '+n);
 environment.register('color-attributes',Object.fromEntries(publicNames.map(n=>[n,color[n]])),context,{prepareArgs:(name,args)=>{const types=abi.public[name].match(/\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');args=types.map((t,i)=>t.includes('*')?text(args[i]):/\b(boolean|char)\b/.test(t)?transport.char(args[i]):/\b(uint32|uint32_t)\b/.test(t)?transport.uint(args[i]):transport.int(args[i]));if(name==='colortable_to_int32')args[0]=context.colorEntry(args[0]);if(['color_attr_to_str','color_attr_parse_str','query_color_attr'].includes(name))args[0]=context.colorAttr(args[0]);if(name==='set_map_customcolor')args[0]=context.glyphMap(args[0]);if(name==='closest_color'){args[1]=context.uint32Pointer(args[1]);args[2]=context.uint16Pointer(args[2]);}return args;}});
 const owner={services:local,state,context,storage,regex:re,exports:publicNames,limitation:'One original COLORATT context/table/storage with full public connection; selected parser/regex/menu behavior requires original-C proof, not inferred from registration.'};owners.set(environment,owner);return owner;
}
