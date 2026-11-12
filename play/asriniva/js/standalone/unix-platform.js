// Original UNIXUNIX/UNIXMAIN entry policies; no lock-file injection.
import abi from './unix-platform-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as unixunix from '../ported/unixunix.js';
import * as unixmain from '../ported/unixmain.js';
import {createUnixunixEnvironment} from '../ported/unixunix-runtime.js';
import {createUnixmainEnvironment} from '../ported/unixmain-runtime.js';
import {enableAddressPort} from './address-ports.js';
import {createCTypes} from './c-types.js';
import {connectUnixPlatformSyscalls} from './unix-platform-syscalls.js';
import * as earlyarg from '../ported/earlyarg.js';
import {callEarlyarg} from '../ported/earlyarg-runtime.js';
import {getmailstatus,free_maildata,ckmailstatus} from '../ported/mail.js';
import {createMailEnvironment} from '../ported/mail-runtime.js';
import {extendMail} from './mail.js';
export function enableUnixPlatform(environment,layouts){
 const ctypes=createCTypes(environment.memory,{...records,aliases:{...records.aliases,...abi.aliases},records:{...records.records,...abi.records}},environment.bitfields);
 const syscalls=connectUnixPlatformSyscalls(environment,ctypes),groups={};
 for(const [name,namespace,factory]of [['unixunix',unixunix,createUnixunixEnvironment],['unixmain',unixmain,createUnixmainEnvironment]]){
  const schema=abi.ports[name].schema;
  const create=local=>{
   if(name==='unixunix'){
    const field=(kind,index)=>{const row=Object.values(schema.schema)[kind],f=row?.fields[index];if(!f)throw new Error('Unknown UNIXUNIX field');return {row,f};};
    // UNIXUNIX's syscall names read/write coexist with its abiRead/abiWrite.
    Object.assign(local,{abiLayout:local.layout,abiGlobal:local.global,abiStorage:local.storage,abiAddress:local.address,
     abiRead:(kind,at,index)=>{const {row,f}=field(kind,index);return ctypes.getField(row.ctype,at,f.name,f.canonical);},
     abiWrite:(kind,at,index,value)=>{const {row,f}=field(kind,index);return ctypes.setField(row.ctype,at,f.name,f.canonical,value);},
    });
   }
   if(name==='unixmain')local.functionAddress=index=>environment.functionPointer(schema.functionAddresses[index],'vi');
   local.teleport_native_signal=(sig,handler)=>environment.services.signal(sig,handler);
   return factory(local);
  };
  const only=Object.keys(schema.functionTypes).filter(key=>typeof namespace[key]==='function'&&(key==='main'||Object.hasOwn(publicFunctions.functions,key))&&!environment.hasFunction(key));
  groups[name]=enableAddressPort(environment,name,{only,definition:abi.ports[name],adapter:[namespace,create,'factory'],ctypes});
 }
 const {services,memory}=environment,ptr=environment.address,text=v=>typeof v==='string'?services.literal(v):ptr(v);
 const resolve=key=>typeof services[key]==='function'?services[key]:environment.resolve(key);
 const storage=[environment.requireGlobal('monsdump'),environment.allocateGlobal('objdump',layouts.earlyarg.objdump_count*layouts.earlyarg.EnumDumpSize),environment.allocateGlobal('earlyarg.ArgVal_novalue',10)];
 const globals=['gc','gd','gh','program_state','iflags','ARGV0'];
 const early=new Proxy(Object.create(services),{get:(o,k,r)=>{if(Object.hasOwn(o,k))return Reflect.get(o,k,r);const v=Reflect.get(o,k,r);if(v!==undefined&&typeof v!=='function')return v;return typeof k==='string'?(...args)=>resolve(k)(...args.map(v=>typeof v==='string'?text(v):v?.address??v)):undefined;}});
 Object.assign(early,{moduleKey:environment,literal:services.literal,heap:()=>memory.HEAPU8,storage:i=>storage[i],global:i=>environment.requireGlobal(globals[i]),stdout:()=>services.stdout,usageHelp:()=>services.literal(abi.usageHelp),dupstr:p=>environment.alloc('dupstr',text(p)),free:p=>services.free(ptr(p)),
  Snprintf:(out,size,format,value)=>resolve('nh_snprintf')(text('dump_enums'),abi.earlyargSnprintfLine,ptr(out),BigInt(size),text(format),environment.transport.int(value)),
 });
 const names=Object.keys(earlyarg).filter(name=>typeof earlyarg[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('unix-platform-earlyarg',Object.fromEntries(names.map(name=>[name,(...args)=>callEarlyarg(early,layouts.earlyarg,name,...args)])));
 const mailGlobals=['u','gs','gv','svl','svm','svp','flags','iflags','mons'],mailStorage=[0,1].map(i=>environment.allocateGlobal('unix-platform.mail-stat'+i,layouts.mail.statSize));
 const mailServices=new Proxy(Object.create(services),{get:(o,k,r)=>{if(Object.hasOwn(o,k))return Reflect.get(o,k,r);const v=Reflect.get(o,k,r);if(v!==undefined&&typeof v!=='function')return v;return typeof k==='string'?(...args)=>resolve(k)(...args.map(v=>typeof v==='string'?text(v):v?.address??v)):undefined;}});
 for(const name of mailGlobals)Object.defineProperty(mailServices,name,{value:undefined,writable:true,configurable:true});
 Object.assign(mailServices,{moduleKey:environment,literal:services.literal,heap:()=>memory.HEAPU8,storage:i=>mailStorage[i],global:i=>environment.requireGlobal(mailGlobals[i]),alloc:n=>environment.alloc('alloc',n),dupstr:p=>environment.alloc('dupstr',text(p)),free:p=>services.free(ptr(p)),
  heroBit:index=>index===0?ctypes.getField('struct you',environment.requireGlobal('u'),'uswallow','unsigned int'):ctypes.getField('struct u_roleplay',ctypes.locate('struct you',environment.requireGlobal('u'),'uroleplay').at,'deaf','boolean'),
  winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  neverMind:()=>ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_Never_mind','char *'),
 });
 const mailContext=createMailEnvironment(mailServices,layouts.mail);
 environment.register('unix-platform-mail',{getmailstatus,free_maildata,ckmailstatus},mailContext);
 const mail=extendMail(environment,layouts,{context:mailContext,services:mailServices});
 return {...groups,ctypes,syscalls,limitation:'Original platform owners linked; main executes real dependencies and fails explicitly where the startup closure is incomplete.'};
}
