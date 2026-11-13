// Original DATE storage and VERSION policies; all shared roots remain live.
import * as version from '../ported/version.js';
import abi from './persistence-transport-abi.json' with {type:'json'};
import * as date from '../ported/date.js';
import {initializeDate} from './bindings/date.js';
import {createVersionState,createVersionEnvironment} from './bindings/version.js';
import {regex_id} from '../ported/posixregex.js';
export function enableVersionInfo(environment,layouts){
 const {services,memory,ctypes,transport}=environment,L=layouts.version;
 const text=p=>typeof p==='string'?services.literal(p):environment.address(p);
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const nomakedefs=environment.allocateGlobal('nomakedefs',layouts.date.size);
 initializeDate({data:()=>nomakedefs,heap:()=>memory.HEAPU8,malloc:n=>memory.malloc(n)},layouts.date,date.nomakedefs_initial);
 const storage=[environment.allocateGlobal('version.critical_sizes',L.criticalCount*L.criticalSize),environment.allocateGlobal('version.cscbuf',L.criticalCount),environment.allocateGlobal('version.rt_opts',L.rtOptCount*L.rtOptSize)];
 const globals=['nomakedefs','flags','iflags','gh','gl','gc'];
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,storage:i=>storage[i],global:i=>environment.requireGlobal(globals[i]),regexId:()=>services.literal(regex_id),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),
  literal:services.literal,strlen:p=>memory.strlen(text(p)),Strcpy:(out,input)=>services.strcpy(environment.address(out),text(input)),
  strcpy:(out,input)=>services.strcpy(environment.address(out),text(input)),strncpy:(out,input,n)=>services.strncpy(environment.address(out),text(input),Number(n)),
  Sprintf:(out,format,...args)=>environment.libc.sprintf(environment.address(out),text(format),...args),
  Snprintf:(out,size,format,...args)=>{args.pop();return environment.libc.snprintf(environment.address(out),Number(size),text(format),...args);},
 });
 for(const name of ['strcmp','strchr','strrchr'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v));
 for(const direction of ['sfo','sfi'])for(const type of ['char','uchar','version_info'])local[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(file,data,tag,...count)=>environment.resolve(direction+'_'+type)(environment.address(file),environment.address(data),text(tag),...count.map(transport.int));
 // Native VERSION macros call the live shared windowprocs, without a second owner.
 const windowCall=(name,...args)=>{const row=abi.versionWindows[name];if(!row||ctypes.record('struct window_procs').fields[row.field]?.ctype!==row.nativeType)throw Error('Review VERSION native window '+name);return environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),row.field,'void *'),row.signature,...args);};
 Object.assign(local,{
  create_nhwindow:type=>windowCall('create_nhwindow',transport.int(type)),
  putstr:(win,attr,value)=>windowCall('putstr',transport.int(win),transport.int(attr),text(value)),
  display_nhwindow:(win,blocking)=>windowCall('display_nhwindow',transport.int(win),transport.char(blocking)),
  destroy_nhwindow:win=>windowCall('destroy_nhwindow',transport.int(win)),
  wait_synch:()=>windowCall('wait_synch'),
  raw_print:value=>environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),'win_raw_print','void *'),'vp',text(value)),
 });
 const state=createVersionState(local,L,version),context=createVersionEnvironment(local,L,state);
 environment.register('version',version,context,{prepareArgs:(name,args)=>{
  args=[...args];if(['version_string','getversionstring','status_version'].includes(name))args[1]=context.size_t(args[1]);
  if(name==='status_version')args[2]=context.boolean(args[2]);if(name==='early_version_info')args[0]=context.boolean(args[0]);
  if(name==='check_version'){args[0]=context.versionInfo(args[0]);args[2]=context.boolean(args[2]);args[3]=context.ulong(args[3]);}
  if(name==='copyright_banner_line')args[0]=context.int(args[0]);
  if(['store_version','store_critical_bytes','uptodate','compare_critical_bytes','validate'].includes(name))args[0]=context.nhfile(args[0]);
  if(['uptodate','compare_critical_bytes'].includes(name))args[2]=context.ulong(args[2]);if(name==='compare_critical_bytes')args[1]=context.intPointer(args[1]);if(name==='validate')args[2]=context.boolean(args[2]);return args;
 }});
 return {nomakedefs,state,context,storage,limitation:'Source DATE initializer and VERSION adapter connected; DATE population and complete version/window lifecycle require original-C verification.'};
}
