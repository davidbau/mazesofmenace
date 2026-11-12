// Full original EAT policies on shared hunger, inventory and callback state.
import abi from './eat-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/eat.js';
import {initializeEat,callEat,eatState} from '../nethack/bindings/eat.js';

export function enableEating(environment,layouts,hungerTable){
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.eat,address=environment.address;
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const forwards=new Map(),local=new Proxy(Object.create(services),{get:(o,k,r)=>{
  if(Reflect.has(o,k))return Reflect.get(o,k,r);
  if(typeof k!=='string')return undefined;
  if(!forwards.has(k))forwards.set(k,(...args)=>resolve(k)(...args.map(v=>typeof v==='string'?text(v):v?.address??v)));
  return forwards.get(k);
 }});
 // Source factory projections must shadow DECL accessors, never assign through them.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const storage=[hungerTable,environment.allocateGlobal('eat.msgbuf',L.BUFSZ),environment.allocateGlobal('eat.zero_victual',L.victualSize)];
 const field=(type,at,key)=>ctypes.locate(type,at,key).at;
 const packed=(kind,p,index)=>{const row=abi.bits[kind],key=row?.fields[index];if(!key)throw new Error('Unknown EAT packed field '+kind+':'+index);return{type:row.type,key,at:address(p)};};
 const callback=(name,signature)=>environment.functionPointer(Object.hasOwn(publicFunctions.functions,name)?name:'eat::'+name,signature,(...args)=>callEat(local,L,name,...args));
 const convert={pointer:address,text,int:transport.int,uint:transport.uint,byte:transport.char,ubyte:transport.uchar,short:transport.short,long:transport.long,ulong:transport.ulong};
 for(const[name,args]of Object.entries(abi.calls))local[name]=(...values)=>{
  const value=name==='alloc'?environment.alloc(name,...values.map((v,i)=>convert[args[i]](v))):resolve(name)(...values.map((v,i)=>convert[args[i]](v)));
  const ret=ctypes.canonical(publicFunctions.functions[name]?.match(/^(.+?)\s*\(/)?.[1]??'int');
  return ret.includes('*')?text(value):ret==='void'?undefined:ctypes.size(ret)===8?(ret.startsWith('unsigned')?transport.ulong(value):transport.long(value)):typeof value==='boolean'?Number(value):value;
 };
 const formatArgs=(format,args)=>{
  const f=typeof format==='string'?format:memory.readString(text(format));
  const shape=[...f.matchAll(/%(?:[-+ #0]*\d*(?:\.\d+)?)?(l?[sdiucpxX%])/g)].filter(m=>m[1]!=='%').map(m=>m[1]==='s'?'p':m[1]==='ld'?'l':m[1]==='lu'?'j':['u','x','X'].includes(m[1])?'u':m[1]==='p'?'v':'i').join('');
  if(!abi.shapes.includes(shape))throw new Error('Review EAT format '+f);
  return args.map((v,i)=>shape[i]==='p'?text(v):shape[i]==='l'?transport.long(v):transport.int(v));
 };
 const window=(name,signature,...args)=>{const at=field('struct window_procs',environment.requireGlobal('windowprocs'),name);return functions.indirect(memory.view.getBigUint64(at,true),signature,...args);};
 Object.assign(local,{
  moduleKey:environment,heap:()=>memory.HEAPU8,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown EAT global '+i);return environment.requireGlobal(name);},
  storage:i=>{if(storage[i]===undefined)throw new Error('Unknown EAT storage '+i);return storage[i];},
  equipment:i=>{const name=abi.equipment[i];if(!name)throw new Error('Unknown EAT equipment '+i);return ctypes.load('struct obj *',environment.requireGlobal(name));},
  bit:(kind,p,i)=>{const f=packed(kind,p,i);return ctypes.getField(f.type,f.at,f.key,'unsigned int');},
  setBit:(kind,p,i,v)=>{const f=packed(kind,p,i);ctypes.setField(f.type,f.at,f.key,'unsigned int',transport.uint(v));},
  commonString:i=>{const key=abi.commonFields[i];if(!key)throw new Error('Unknown EAT common string '+i);if(key==='ynchars'||key==='ynqchars')return environment.requireGlobal(key);const at=field('struct c_common_strings',environment.requireGlobal('c_common_strings'),key);return key==='c_the_your'?at:ctypes.load('char *',at);},
  color:i=>{const key=abi.colorFields[i];if(!key)throw new Error('Unknown EAT color '+i);return ctypes.load('char *',field('struct c_color_names',environment.requireGlobal('c_color_names'),key));},
  hands:()=>environment.requireGlobal('hands_obj'),
  callbackPointer:i=>{const name=abi.callbacks[i];if(!name)throw new Error('Unknown EAT callback '+i);return callback(name,'i');},
  commandPointer:()=>environment.functionPointer('donull','i'),
  set_occupation:(p,msg,n)=>resolve('set_occupation')(address(p),text(msg),transport.long(n)),
  getobj:(query,index,flags)=>{const name=abi.getobjCallbacks[index];if(!name)throw new Error('Unknown EAT selection callback '+index);return address(resolve('getobj')(text(query),callback(name,'ip'),transport.uint(flags)));},
  singular:obj=>address(resolve('singular')(address(obj),environment.functionPointer('xname','pp'))),
  safe_qbuf:(buf,prefix,suffix,obj,last)=>address(resolve('safe_qbuf')(address(buf),text(prefix),text(suffix),address(obj),environment.functionPointer('doname','pp'),environment.functionPointer('ansimpleoname','pp'),text(last))),
  iter_mons:()=>resolve('iter_mons')(callback('garlic_breath','vp')),
  y_n:query=>resolve('yn_function')(text(query),environment.requireGlobal('ynchars'),110,1),
  ynq:query=>resolve('yn_function')(text(query),environment.requireGlobal('ynqchars'),113,1),
  winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),winMap:()=>ctypes.load('int',environment.requireGlobal('WIN_MAP')),
  display_nhwindow:(win,blocking)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(blocking)),
  assert:(ok,site)=>{if(site!==0&&site!==1)throw new Error('Unknown EAT assertion '+site);if(!ok)return resolve('__assert_fail')(text(site===0?'nut > 0':'ismnum(mnum)'),text('eat.c'),site===0?344:1865,text(site===0?'adj_victual_nutrition':'eatcorpse'));},
  Strlen:(str,site)=>{if(site!==0&&site!==1)throw new Error('Unknown EAT Strlen '+site);return environment.strutil('Strlen_',text(str),text('eatmupdate'),site===0?203:204);},
  Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...formatArgs(format,args)),
  Snprintf:(out,n,format,...args)=>{const site=abi.formatSites[args.pop()];if(!site)throw new Error('Unknown EAT formatting site');return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(n),text(format),...formatArgs(format,args));},
  discover_object:(t,a,b,c)=>resolve('discover_object')(transport.int(t),transport.char(a),transport.char(b),transport.char(c)),
  free:p=>services.free(address(p)),
 });
 for(const name of ['rn2','rnd','rnl','d'])local[name]=(...args)=>{const caller=args.pop(),line=args.pop();if(services.rng_log_enabled())services.rng_log_set_caller(text('eat.c'),transport.int(line),text(caller));return resolve(name)(...args.map(transport.int));};
 for(const name of ['pline','pline_The','You','You_feel','Your','You_hear','You_cant','verbalize','impossible'])local[name]=(format,...args)=>resolve(name)(text(format),...formatArgs(format,args));
 local.livelog_printf=(category,format,...args)=>resolve('livelog_printf')(transport.long(category),text(format),...formatArgs(format,args));
 // One original factory/cache per runtime; initialization fills the same shared table.
 initializeEat(local,L);
 const names=Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const parameters=Object.fromEntries(Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)).map(name=>[name,publicFunctions.functions[name].match(/^[^(]+\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')]));
 const prepare=(name,args)=>args.map((v,i)=>{const type=ctypes.canonical(parameters[name][i]);if(type.includes('*'))return text(v);if(type==='signed char'||type==='char')return transport.char(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);});
 environment.register('hero-hunger',Object.fromEntries(names.map(name=>[name,(...args)=>callEat(local,L,name,...prepare(name,args))])),local);
 // Earlier construction groups keep their symbol ownership, while their EAT
 // hooks now execute with this same full source state and shared context.
 for(const[owner,hooks]of [['inventory-context',['food_disappears']],['object-nutrition',['obj_nutrition','eaten_stat']]]){
  const entry=environment.start(owner);
  for(const name of hooks){if(entry.namespace[name]!==source[name])throw new Error('Unexpected earlier EAT hook '+owner+'.'+name);entry.namespace[name]=(...args)=>callEat(local,L,name,...prepare(name,args));}
 }
 return {services:local,state:eatState(local,L),storage,call:(name,...args)=>callEat(local,L,name,...args),limitation:'Full original EAT owner connected; reached hunger/item/occupation policies require original-C acceptance.'};
}
