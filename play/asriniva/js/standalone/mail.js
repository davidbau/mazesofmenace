// Original MAIL extension on the already-created UNIX mail context and state.
import abi from './mail-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/mail.js';
import {withCEnvironment} from '../ported/c-runtime.js';

export function connectMailSdk(environment){
 const {transport,libc}=environment,address=environment.address;
 const sdk={};
 for(const[name,row]of Object.entries(abi.sdkFailures))if(!environment.hasFunction(name))sdk[name]=(...args)=>{
  if(name==='getpwuid')transport.uint(args[0]);
  if(name==='execl'&&address(args.at(-1))!==0)throw new Error('MAIL execl requires the source NULL terminator');
  libc.errno=row.errno;return row.result;
 };
 if(Object.keys(sdk).length)environment.register('mail-sdk-boundaries',sdk);
 return sdk;
}

export function extendMail(environment,layouts,{context,services:local}){
 const {services,memory,ctypes,transport,functions}=environment,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 connectMailSdk(environment);
 const convert={pointer:address,text,int:transport.int,uint:transport.uint,byte:transport.char,coord:transport.short};
 const prior=new Map(Object.keys(abi.calls).filter(name=>Object.hasOwn(local,name)).map(name=>[name,local[name]]));
 for(const[name,row]of Object.entries(abi.calls))local[name]=(...args)=>{
  const value=(prior.get(name)??resolve(row.target))(...args.map((v,i)=>convert[row.arguments[i]](v)));
  const ret=ctypes.canonical(publicFunctions.functions[row.target]?.match(/^(.+?)\s*\(/)?.[1]??'int');
  return ret.includes('*')?text(value):name==='strlen'?Number(value):ret==='void'?undefined:ctypes.size(ret)===8?(ret.startsWith('unsigned')?transport.ulong(value):transport.long(value)):typeof value==='boolean'?Number(value):value;
 };
 const window=(name,signature,...args)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name).at;return functions.indirect(memory.view.getBigUint64(at,true),signature,...args);};
 Object.assign(local,{
  rn2:(bound,line,caller)=>{const site=abi.rngSites.find(row=>row.line===line&&row.function===caller);if(!site)throw new Error('Unknown MAIL RNG site '+caller+':'+line);if(services.rng_log_enabled())services.rng_log_set_caller(text('mail.c'),line,text(caller));return services.rn2(transport.int(bound));},
  display_nhwindow:(win,blocking)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(blocking)),
  nh_delay_output:()=>window('win_delay_output','v'),
  pline:(format,...args)=>{if(![0,1,3].includes(args.length))throw new Error('Unknown MAIL message shape');return resolve('pline')(text(format),...args.map((v,i)=>args.length===3&&i!==1?transport.int(v):text(v)));},
  verbalize:(format,...args)=>{if(args.length>3)throw new Error('Unknown MAIL voice shape');return resolve('verbalize')(text(format),...args.map(text));},
 });
 // The pinned SDK returns NULL for getpwuid. Original MAIL dereferences that
 // result, and its compiled Wasm strlen/strcat read the zeroed linear-memory
 // page as an empty string. Reproduce those reached reads, not a virtual user;
 // preserve normal pointer handling and all global CMemory guards.
 const nullLength=()=>{const end=memory.HEAPU8.indexOf(0,0);if(end<0)throw new RangeError('Unterminated MAIL null-page CString');return end;};
 local.strlen=value=>{const at=text(value);return at===0?nullLength():Number(services.strlen(at));};
 local.Strcat=(out,value)=>{const from=text(value),to=address(out);if(from!==0)return services.strcat(to,from);const n=nullLength(),end=to+Number(services.strlen(to));memory.bounds(end,n+1);memory.HEAPU8.copyWithin(end,0,n+1);return to;};
 // The original gv fields are coordxy pointers. Follow the live VISION backing,
 // rather than indexing the pointer cell as an inline array.
 for(const row of abi.rowPointers)context.gv[row.name]=new Proxy({}, {get:(o,key)=>{
  if(typeof key!=='string'||!/^\d+$/.test(key))return Reflect.get(o,key);
  const base=Number(memory.view.getBigUint64(environment.requireGlobal('gv')+row.offset,true));
  if(!base)throw new Error('MAIL requires initialized VISION '+row.name);
  return memory.view.getInt16(base+Number(key)*row.elementSize,true);
 }});
 const prepare=(name,args)=>{args=[...args];if(name==='md_start')args[0]=context.coord(args[0]);if(name==='md_stop'){args[0]=context.coord(args[0]);args[1]=context.coord(args[1]);}if(name==='md_rush'){args[0]=context.monster(args[0]);args[1]=transport.short(args[1]);args[2]=transport.short(args[2]);}if(name==='newmail')args[0]=context.info(args[0]);if(name==='readmail')args[0]=address(args[0]);return args;};
 const entry=environment.start('unix-platform-mail');if(entry.environment!==context)throw new Error('MAIL source context changed during extension');
 const state=context.mailState,statAddresses=[state.omstat.address,state.nmstat.address];
 const names=Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.extend('unix-platform-mail',Object.fromEntries(names.map(name=>[name,source[name]])));entry.prepareArgs=prepare;
 if(context.mailState!==state||state.omstat.address!==statAddresses[0]||state.nmstat.address!==statAddresses[1])throw new Error('MAIL extension changed source state/storage');
 return{context,services:local,call:(name,...args)=>transport.scoped(()=>withCEnvironment(context,source[name],...prepare(name,args))),limitation:'Whole original MAIL owner transport connected; actual mailbox/delivery/reader failure paths require connected original-C acceptance.'};
}
