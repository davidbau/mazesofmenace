// Original COLORATT storage/context and POSIXREGEX wrapper, shared game memory.
import abi from './color-attributes-abi.json' with {type:'json'};
import {REG_EXTENDED,REG_NOSUB} from '../services/posix-regex.js';
import * as color from '../ported/coloratt.js';
import {createColorattState,createColorattEnvironment} from '../ported/coloratt-runtime.js';
import * as regex from '../ported/posixregex.js';
import {createPosixregexEnvironment,initializePosixregex} from '../ported/posixregex-runtime.js';
const owners=new WeakMap();
export function enableColorAttributes(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,transport}=environment,L=layouts.coloratt,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
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
 const state=createColorattState(local,L,color),context=createColorattEnvironment(local,L,state);
 environment.register('color-attributes',{free_menu_coloring:color.free_menu_coloring,add_menu_coloring_parsed:color.add_menu_coloring_parsed},context,{prepareArgs:(name,args)=>name==='add_menu_coloring_parsed'?[text(args[0]),transport.int(args[1]),transport.int(args[2])]:args});
 const owner={services:local,state,context,storage,regex:re,limitation:'Original menu-color cleanup and five POSIXREGEX wrapper entries connected. Nonempty color rules, parsing, UI, complete regex errors and full-game cleanup require focused original-C acceptance.'};owners.set(environment,owner);return owner;
}
