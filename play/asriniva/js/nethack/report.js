// Original configured REPORT/NHMD4 policies on actual standalone storage.
import abi from './report-abi.json' with {type:'json'};
import * as report from '../ported/report.js';
import * as md4 from '../ported/nhmd4.js';
import {createReportState,createReportEnvironment} from './bindings/report.js';
import {withCEnvironment} from '../c-runtime/context.js';
import {VFSError} from '../c-runtime/vfs.js';

export function enableReport(environment,layouts){
 const {memory,services,ctypes,transport}=environment,address=environment.address;
 if(JSON.stringify(layouts.report)!==JSON.stringify(abi.report)||JSON.stringify(layouts.nhmd4)!==JSON.stringify(abi.nhmd4))throw new Error('Review changed REPORT/NHMD4 measured ABI');
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 const storage=[environment.allocateGlobal('report.bid',abi.report.bidSize),environment.allocateGlobal('report.url',abi.report.MAX_URL)];
 const roots=[['instance_globals_c','gc','crash_urlmax'],['instance_globals_c','gc','crash_name'],['instance_globals_c','gc','crash_email'],['sysopt_s','sysopt','crashreporturl'],['instance_globals_s','gs','saved_pline_index'],['instance_globals_s','gs','saved_plines']];
 const globals=roots.map(([type,name,field])=>ctypes.locate('struct '+type,environment.requireGlobal(name),field).at).concat(storage);
 const context=p=>{p=address(p);const L=abi.nhmd4;memory.bounds(p,L.size);const result={clear:()=>memory.memset(p,0,L.size)};
  Object.defineProperties(result,{buffer:{get:()=>memory.HEAPU8.subarray(p+L.buffer,p+L.buffer+64)},block:{get:()=>new Uint32Array(memory.buffer,p+L.block,16)}});
  for(const key of ['lo','hi','a','b','c','d'])Object.defineProperty(result,key,{get:()=>memory.view.getUint32(p+L[key],true),set:value=>memory.view.setUint32(p+L[key],value,true)});return result;};
 const hash={nhmd4_init:p=>md4.nhmd4_init(context(p)),nhmd4_update:(p,input,size)=>{const n=Number(size),at=address(input);memory.bounds(at,n);return md4.nhmd4_update(context(p),memory.HEAPU8.subarray(at,at+n),n);},nhmd4_final:(p,out)=>{const at=address(out);memory.bounds(at,16);return md4.nhmd4_final(context(p),memory.HEAPU8.subarray(at,at+16));}};
 const hashNames=Object.keys(hash).filter(name=>!environment.hasFunction(name));environment.register('report-nhmd4',Object.fromEntries(hashNames.map(name=>[name,hash[name]])));
 const formats=['%%%02X','?cos=%d&v=1','%.40s report for NetHack %.40s','%d',"Can't start /usr/bin/open: %.*s"];
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,stackAlloc:transport.stackAlloc,text,
  global:i=>{if(globals[i]===undefined)throw new Error('Unknown REPORT global '+i);return globals[i];},errnoPointer:services.__errno_location,
  panictraceHandler:()=>environment.functionPointer('panictrace_handler','vi'),
  format:(out,kind,number,a,b)=>{if(!formats[kind])throw new Error('Unknown REPORT format '+kind);const args=kind===2?[a,b]:kind===4?[number,a]:[number];return services.sprintf(address(out),text(formats[kind]),...args);},
  Strcpy:(out,input)=>services.strcpy(address(out),text(input)),strlen:input=>Number(services.strlen(text(input))),strchr:(input,ch)=>services.strchr(text(input),ch),memcpy:(out,input,n)=>services.memcpy(address(out),text(input),Number(n)),isalnum:services.isalnum,
  readlink:(path,out,size)=>{
   if(typeof services.readlink==='function'||environment.hasFunction('readlink'))return Number(resolve('readlink')(text(path),address(out),Number(size)));
   // CVFS has only regular files/directories. Preserve actual lookup errors;
   // an existing nonsymlink is EINVAL, exactly as POSIX readlink specifies.
   try{if(Number(size)<=0)throw new VFSError('EINVAL');environment.filesystem.stat(memory.readString(text(path)));throw new VFSError('EINVAL');}
   catch(error){if(!(error instanceof VFSError))throw error;environment.libc.errno=error.errno;return-1;}
  },
 };
 for(const name of ['open','read','write','close','fork','execve','waitpid','signal','exit','version_string','getversionstring','strerror','NH_abort','environ','raw_print','pline'])local[name]=(...args)=>resolve(name)(...boundary(args));
 for(const name of Object.keys(hash))local[name]=(...args)=>resolve(name)(...boundary(args));
 const state=createReportState(local,abi.report),env=createReportEnvironment(local,abi.report,state);
 const names=Object.keys(report).filter(name=>!environment.hasFunction(name));
 // Match the unchanged native bridge: private state persists, while adapter
 // stack-local array caches belong to this entry and its nested lexical calls.
 environment.register('report',Object.fromEntries(names.map(name=>[name,(...args)=>{
  const current=createReportEnvironment(local,abi.report,state);
  args=args.map(value=>typeof value==='bigint'?Number(value):value);
  if(name==='swr_add_uricoded'){args[1]=current.pointerRef(args[1]);args[2]=current.intRef(args[2]);}
  if(['crashreport_init','submit_web_report','get_saved_pline','panictrace_handler'].includes(name))args[0]=transport.int(args[0]);
  if(name==='panictrace_setsignals')args[0]=transport.char(args[0]);
  return withCEnvironment(current,report[name],...args);
 }])));
 return{state,storage,globals,context:env,services:local,exports:names,limitation:'Original REPORT and NHMD4 connected. CVFS supplies no executable symlink, so the source selects unknown BID; process launch/report submission requires real process providers. Native host backtrace branches remain excluded by the inherited configured source profile.'};
}
