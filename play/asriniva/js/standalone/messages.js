// Original PLINE policies and source-private state on shared JavaScript storage.
import abi from './messages-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as pline from '../ported/pline.js';
import {createPlineEnvironment} from '../nethack/bindings/pline.js';
import {withCEnvironment} from '../c-runtime/context.js';

export function enableMessages(environment,layouts){
 const {services,memory,ctypes,functions,transport}=environment,L=layouts.pline;
 const address=environment.address,text=value=>typeof value==='string'?services.literal(value):address(value),chr=value=>typeof value==='string'?value.charCodeAt(0):transport.int(value);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=new Proxy(Object.create(services),{get:(o,key,receiver)=>Reflect.has(o,key)?Reflect.get(o,key,receiver):typeof key==='string'?(...args)=>environment.resolve(key)(...args.map(value=>value?.address??value)):undefined});
 const roots={gs:'instance_globals_s',iflags:'instance_flags',gp:'instance_globals_p',windowprocs:'window_procs',a11y:'accessibility_data',u:'you',program_state:'sinfo',gv:'instance_globals_v',gy:'instance_globals_y',gg:'instance_globals_g',svm:'instance_globals_saved_m',ge:'instance_globals_e',sysopt:'sysopt_s',flags:'flag'};
 for(const name of Object.keys(roots))Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const location=path=>{
  const [root,...parts]=path.split('.');let at=environment.requireGlobal(root),type=roots[root];
  for(const key of parts){const entry=ctypes.locate(type,at,key);at=entry.at;type=entry.field.record??entry.field.ctype.replace(new RegExp('\\s+'+key+'$'),'');}
  return at;
 };
 const globals=abi.fields.map(([path])=>location(path));
 const u=environment.requireGlobal('u'),props=ctypes.locate('struct you',u,'uprops').at;
 const prop=(name,field)=>ctypes.getField('struct prop',props+Number(layouts.do_wear[name])*ctypes.size('struct prop'),field,'long');
 Object.assign(local,{
  moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,readString:p=>memory.readString(address(p)),rectState:undefined,trackState:undefined,
  global:index=>{if(globals[index]===undefined)throw new Error('Unknown PLINE field '+index);return globals[index];},
  devteamEmail:()=>services.literal(abi.devteamEmail),stderr:()=>services.stderr,
  heroFlag:kind=>{switch(kind){
   case 0:return Number(ctypes.getField('struct instance_globals_m',environment.requireGlobal('gm'),'multi','long')<0n&&(resolve('unconscious')()||resolve('is_fainted')()));
   case 1:return Number(Boolean(prop('DEAF','intrinsic')||prop('DEAF','extrinsic')||ctypes.getField('struct u_roleplay',ctypes.locate('struct you',u,'uroleplay').at,'deaf','boolean')));
   case 2:return Number(Boolean(ctypes.getField('struct you',u,'uinwater','unsigned int')));
   case 3:return Number(Boolean((prop('BLINDED','intrinsic')||prop('BLINDED','extrinsic'))&&!prop('BLINDED','blocked')));
   default:throw new Error('Unknown PLINE hero header flag '+kind);
  }},
  alloc:size=>environment.alloc('alloc',transport.uint(size)),free:p=>services.free(address(p)),dupstr:value=>address(resolve('dupstr')(text(value))),
  strlen:value=>Number(services.strlen(text(value))),
  strncmp:(a,b,count)=>services.strncmp(text(a),text(b),transport.ulong(count)),strcmp:(a,b)=>services.strcmp(text(a),text(b)),
  strchr:(value,c)=>address(services.strchr(text(value),chr(c))),strrchr:(value,c)=>address(services.strrchr(text(value),chr(c))),
  Strcpy:(out,value)=>address(services.strcpy(address(out),text(value))),Strcat:(out,value)=>address(services.strcat(address(out),text(value))),
  strcat:(out,value)=>address(services.strcat(address(out),text(value))),strncpy:(out,value,count)=>address(services.strncpy(address(out),text(value),transport.ulong(count))),
  format3:(out,size,format,a,b,c)=>services.snprintf(address(out),Number(size),text(format),text(a),text(b),transport.int(c)),
  fprintf:(stream,format,handler)=>services.fprintf(address(stream),text(format),text(handler)),
  dirtocoord:(out,dir)=>resolve('dirtocoord')(address(out),transport.int(dir)),
  isok:(x,y)=>resolve('isok')(transport.short(x),transport.short(y)),
  coord_desc:(x,y,out,mode)=>address(resolve('coord_desc')(transport.short(x),transport.short(y),address(out),transport.char(mode))),
  msgtype_type:(line,noRepeat)=>resolve('msgtype_type')(text(line),transport.char(noRepeat)),
  vision_recalc:mode=>resolve('vision_recalc')(transport.int(mode)),flush_screen:cursor=>resolve('flush_screen')(transport.int(cursor)),
  strNsubst:(out,from,to,count)=>resolve('strNsubst')(address(out),text(from),text(to),transport.int(count)),
  livelog_add:(flags,line)=>resolve('livelog_add')(transport.long(flags),text(line)),paniclog:(reason,line)=>resolve('paniclog')(text(reason),text(line)),
  yn_function:(prompt,options,def,history)=>resolve('yn_function')(text(prompt),text(options),chr(def),transport.char(history)),
  submit_web_report:(kind,subject,reason)=>resolve('submit_web_report')(transport.int(kind),text(subject),text(reason)),
  nh_terminate:status=>resolve('nh_terminate')(transport.int(status)),
  panic:(format,value=0)=>resolve('panic')(text(format),typeof value==='string'?text(value):value?.address??value),
 });
 for(const name of ['fork','getgid','getuid'])local[name]=()=>resolve(name)();
 for(const name of ['setgid','setuid'])local[name]=id=>resolve(name)(transport.uint(id));
 local.waitpid=(pid,status,flags)=>resolve('waitpid')(transport.int(pid),address(status),transport.int(flags));
 local.execv=(path,args)=>resolve('execv')(text(path),address(args));local.perror=value=>resolve('perror')(text(value));
 const window=(field,signature,...args)=>{
  const entry=ctypes.record('struct window_procs').fields[field];if(!entry)throw new Error('Unknown PLINE window callback '+field);
  const callback=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+entry.offset,true);
  return functions.indirect(callback,signature,...args);
 };
 Object.assign(local,{
  putstr:(win,attr,line)=>window('win_putstr','viip',transport.int(win),transport.int(attr),text(line)),
  raw_print:line=>window('win_raw_print','vp',text(line)),
  display_nhwindow:(win,block)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(block)),
 });
 const state={...abi.initialState},context=createPlineEnvironment(local,L,state);
 // Standalone public calls carry source JS argument arrays, unlike the native
 // bridge's opaque SDK va_list. Keep policies intact and adapt formatting here.
 context.vsnprintf=(out,size,format,args)=>{
  if(!Array.isArray(args)||args.some(value=>value?.vaAddress!==undefined))throw new Error('Native PLINE va_list requires a native packet transport');
  return services.snprintf(address(out),Number(size),text(format),...args.map(value=>typeof value==='string'?text(value):value?.address??value));
 };
 const names=Object.keys(pline).filter(name=>typeof pline[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const prepareArgs=(name,args)=>{args=args.map(value=>typeof value==='string'?text(value):value?.address??value);if(name==='pline_mon')args[0]=context.monster(args[0]);if(name==='gamelog_add'){args[0]=transport.long(args[0]);args[1]=transport.long(args[1]);}else if(name==='livelog_printf')args[0]=transport.long(args[0]);else if(name==='set_msg_xy'||name==='pline_xy'){args[0]=transport.short(args[0]);args[1]=transport.short(args[1]);}return args;};
 environment.register('messages',Object.fromEntries(names.map(name=>[name,pline[name]])),context,{prepareArgs});
 return {state,context,services:local,call:(name,...args)=>transport.scoped(()=>withCEnvironment(context,pline[name],...prepareArgs(name,args))),limitation:'PLINE shared state and standalone JS varargs transport connected; native opaque va_list, message/error/handler branches and original-C full lifecycle need separate verification.'};
}
