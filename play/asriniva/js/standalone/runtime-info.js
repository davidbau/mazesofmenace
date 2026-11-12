// Original MDLIB/DATE population on the existing VERSION nomakedefs storage.
import abi from './runtime-info-abi.json' with {type:'json'};
import * as mdlib from '../ported/mdlib.js';
import {createMdlibState,createMdlibEnvironment} from '../nethack/bindings/mdlib.js';
import * as date from '../ported/date.js';
import {early_init} from '../ported/allmain.js';

export function enableRuntimeInfo(environment,layouts){
 const {services,ctypes,memory,transport}=environment,nomakedefs=environment.requireGlobal('nomakedefs');
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 if(!Object.hasOwn(environment.status(),'hacklib'))environment.enableHacklib(layouts.hacklib);
 const storage=['optbuf','version','save_bones_compat_buf'].map((name,i)=>environment.allocateGlobal('mdlib.'+name,abi.storageBytes[i]));
 const fields=(pointer,descriptors)=>{
  const result={address:environment.address(pointer)};
  for(const [name,f]of Object.entries(descriptors))Object.defineProperty(result,name,{enumerable:true,
   get:()=>f.kind==='pointer'?Number(memory.view.getBigUint64(result.address+f.offset,true)):memory.view.getBigUint64(result.address+f.offset,true),
   set:value=>memory.view.setBigUint64(result.address+f.offset,BigInt.asUintN(64,BigInt(value?.address??value??0)),true),
  });
  return result;
 };
 const mdServices={heap:()=>memory.HEAPU8,storage:i=>storage[i],literal:services.literal,stackAlloc:transport.stackAlloc,
  dupstr:value=>environment.alloc('dupstr',text(value)),free:pointer=>services.free(environment.address(pointer)),
  datamodel:value=>resolve('datamodel')(transport.int(value)),
  populate_nomakedefs:pointer=>environment.resolve('populate_nomakedefs')(environment.address(pointer)),
  free_nomakedefs:()=>environment.resolve('free_nomakedefs')(),
  eos:value=>services.eos(text(value)),strlen:value=>Number(services.strlen(text(value))),
  strcmp:(a,b)=>services.strcmp(text(a),text(b)),strncmp:(a,b,n)=>services.strncmp(text(a),text(b),Number(n)),
  strchr:(value,ch)=>services.strchr(text(value),typeof ch==='string'?ch.charCodeAt(0):Number(ch)),
  strcpy:(out,value)=>services.strcpy(environment.address(out),text(value)),
  Strcpy:(out,value)=>services.strcpy(environment.address(out),text(value)),Strcat:(out,value)=>services.strcat(environment.address(out),text(value)),
  Sprintf:(out,format,...args)=>services.sprintf(environment.address(out),text(format),...args.map(v=>v?.address??v)),
  Snprintf:(out,n,format,...args)=>{const value=typeof format==='string'?format:memory.readString(text(format)),line=value==='%s NetHack%s Version %s%s - last %s %s.'?abi.formatLines.version:value==='         Version %s %s%s, %s %s.'?abi.formatLines.banner:null;if(line===null)throw new Error('Unrecognized MDLIB native formatting shape');return resolve('nh_snprintf')(services.literal(line===abi.formatLines.version?'version_id_string':'bannerc_string'),line,environment.address(out),transport.ulong(n),text(format),...args.map(text));},
 };
 const state=createMdlibState(mdServices,abi.mdlib,mdlib),mdContext=createMdlibEnvironment(mdServices,abi.mdlib,state);
 const mdNames=Object.keys(abi.mdlibFunctions).filter(name=>typeof mdlib[name]==='function'&&!environment.hasFunction(name));
 environment.register('runtime-info',Object.fromEntries(mdNames.map(name=>[name,mdlib[name]])),mdContext,{prepareArgs:(name,args)=>{
  if(name==='do_runtime_info')args[0]=mdContext.intPointer(args[0]);
  if(['mdlib_version_string','version_id_string','bannerc_string'].includes(name))args[0]=environment.address(args[0]);
  if(name==='mdlib_version_string')args[1]=text(args[1]);
  if(['version_id_string','bannerc_string'].includes(name)){args[1]=transport.ulong(args[1]);args[2]=text(args[2]);}
  return args;
 }});
 const dateState={nomakedefs_populated:0};
 const dateContext={...abi.date.strings,BUFSZ:abi.date.BUFSZ,dateState,nomakedefs:fields(nomakedefs,abi.date.fields),
  stackAlloc:transport.stackAlloc,getenv:services.getenv,strlen:value=>Number(services.strlen(text(value))),atoi:services.atoi,
  case_insensitive_comp:(a,b)=>resolve('case_insensitive_comp')(text(a),text(b)),
  zeroTm:()=>{const pointer=transport.stackAlloc(abi.tm.size);memory.memset(pointer,0,abi.tm.size);const value={address:pointer};for(const [name,f]of Object.entries(abi.tm.fields)){const type=f.ctype.replace(new RegExp('\\s+'+name+'$'),'');Object.defineProperty(value,name,{enumerable:true,get:()=>ctypes.load(type,pointer+f.offset),set:v=>ctypes.store(type,pointer+f.offset,v)});}return value;},
  mktime:value=>services.mktime(value),dupstr:value=>environment.alloc('dupstr',text(value)),free:pointer=>services.free(environment.address(pointer)),
  SnprintDate:(out,n,value)=>resolve('nh_snprintf')(services.literal('populate_nomakedefs'),abi.formatLines.date,environment.address(out),transport.ulong(n),services.literal('%s'),text(value)),
 };
 for(const name of ['md_ignored_features','mdlib_version_string','version_id_string','bannerc_string'])dateContext[name]=(...args)=>environment.resolve(name)(...boundary(args));
 Object.defineProperties(dateContext,{HEAPU8:{get:()=>memory.HEAPU8},HEAP8:{get:()=>memory.HEAP8}});
 const dateNames=['populate_nomakedefs','free_nomakedefs'].filter(name=>!environment.hasFunction(name));
 environment.register('date-population',Object.fromEntries(dateNames.map(name=>[name,date[name]])),dateContext,{prepareArgs:(name,args)=>name==='populate_nomakedefs'?[fields(args[0],abi.date.versionFields)]:args});
 if(!environment.hasFunction('early_init')){
  const early=new Proxy(Object.create(services),{get:(o,key,r)=>Reflect.has(o,key)?Reflect.get(o,key,r):typeof key==='string'?(...args)=>environment.resolve(key)(...boundary(args)):undefined});
  environment.register('runtime-early-init',{early_init},early,{prepareArgs:(_name,args)=>[transport.int(args[0]),environment.address(args[1])]});
 }
 return{nomakedefs,storage,state,mdContext,dateContext,dateState,limitation:'Original MDLIB/DATE and early_init linkage connected; source-pinned/real-build date, timezone, option tables and real-bootstrap/full-game acceptance require original-C verification.'};
}
