import {nativeStateFor} from './native/state-bridge.js';
import {createNativeRecordViews} from './native/record-views.js';
import {compileNativeFieldPlans} from './native/address-fields.js';
import {createNativeAbiCaster,installNativeDependency} from './native/execution.js';
// Upgrade the existing artifact owner; all bookkeeping storage remains shared.
import abi from './artifact-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/artifact.js';
import {createArtifactEnvironment} from './bindings/artifact.js';

const descriptorScalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
const nativeSchema={schema:Object.fromEntries(Object.entries(abi.schemas).map(([name,row])=>[name,{ctype:row.ctype,fields:row.fields.map(field=>({name:field.name,canonical:field.d.s||field.d.a?field.ctype:descriptorScalar(field.d),bit:field.bit}))}]))};
export function createArtifactFieldPlans(environment){return compileNativeFieldPlans(environment,nativeSchema);}
export function upgradeArtifact(environment,layouts,legacy){
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.artifact,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 const owner=nativeStateFor(environment);createNativeRecordViews(environment);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>resolve(k)(...args.map(v=>typeof v==='string'?text(v):v?.address??v)):undefined});
 for(const row of abi.globals)Object.defineProperty(local,row.name,{value:undefined,writable:true,configurable:true});
 const schemas=Object.values(abi.schemas),locate=(kind,p,index)=>{const row=schemas[kind],f=row?.fields[index];if(!f)throw new Error('Unknown ARTIFACT field '+kind+':'+index);return{row,f,at:ctypes.locate(row.ctype,address(p),f.name).at};};
 const convert={pointer:address,text,int:transport.int,uint:transport.uint,byte:transport.char,ubyte:transport.uchar,short:transport.short,ushort:transport.ushort,long:transport.long,ulong:transport.ulong};
 for(const[name,row]of Object.entries(abi.calls)){const legacy=(...args)=>{
  const value=resolve(row.target)(...args.map((v,i)=>convert[row.arguments[i]](v)));
  const ret=ctypes.abiType(publicFunctions.functions[row.target]?.match(/^(.+?)\s*\(/)?.[1]??'void');
  return ret.includes('*')?text(value):ret==='void'?undefined:ctypes.size(ret)===8?(ret.startsWith('unsigned')?transport.ulong(value):transport.long(value)):typeof value==='boolean'?Number(value):value;
 };const strings=row.arguments.flatMap((kind,i)=>kind==='text'?[i]:[]);installNativeDependency(local,name,row.target,owner,legacy,strings.length?args=>{for(const i of strings)if(typeof args[i]==='string')args[i]=text(args[i]);return args;}:undefined);}
 const resbuf=environment.allocateGlobal('artifact.resbuf',abi.resbufBytes);
 let context;
 const parameters=Object.fromEntries(Object.entries(publicFunctions.functions).map(([name,proto])=>[name,proto.match(/^[^(]+\((.*)\)$/)?.[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')]));
 const caster=createNativeAbiCaster(ctypes,transport,text),prepared=new Map();
 const prepare=(name,args)=>{
  let plan=prepared.get(name);if(!plan){const views=new Map((abi.argumentViews[name]??[]).map(row=>[row.index,row]));plan=(parameters[name]??[]).map((type,i)=>views.has(i)?value=>{const row=views.get(i);return context[row.method](row.type,value);}:caster(type));
   // Static helpers have measured record/reference views but no public prototype.
   for(const [i,row]of views)plan[i]=value=>context[row.method](row.type,value);prepared.set(name,plan);}
  return args.map((value,i)=>plan[i]?plan[i](value):value);
 };
 const invoke=(name,args)=>{const saved=owner.depth?undefined:transport.stackSave();owner.enter();try{const value=context.nativeNamespace[name](...prepare(name,args));return typeof value==='string'?text(value):value;}finally{try{owner.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};
 const bind=name=>{const fn=(...args)=>invoke(name,args);fn.nativeState=owner;fn.nativeDirect=true;fn.nativePrepared=true;owner.functions.set(name,fn);return fn;};
 const pointer=(name,signature)=>environment.functionPointer(Object.hasOwn(publicFunctions.functions,name)?name:'artifact::'+name,signature,(...args)=>{const value=invoke(name,args);return typeof value==='string'?text(value):value?.address??value;});
 const window=(field,signature,...args)=>{if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke(field,signature,...args);const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),field).at;return functions.indirect(memory.view.getBigUint64(at,true),signature,...args);};
 Object.assign(local,{
  nativeOwner:owner,nativeFieldPlans:createArtifactFieldPlans(environment),moduleKey:environment,heap:()=>memory.HEAPU8,
  global:i=>{const row=abi.globals[i];if(!row)throw new Error('Unknown ARTIFACT global '+i);return environment.requireGlobal(row.name);},resbuf:()=>resbuf,
  read:(kind,p,index)=>{const{row,f,at}=locate(kind,p,index);return f.d.s||f.d.a?BigInt(at):BigInt(ctypes.getField(row.ctype,address(p),f.name,f.ctype));},
  write:(kind,p,index,value)=>{const{row,f}=locate(kind,p,index);if(f.const)throw new Error('Write to const ARTIFACT field '+f.name);ctypes.setField(row.ctype,address(p),f.name,f.ctype,value);},
  address:(kind,p,index)=>locate(kind,p,index).at,
  functionPointer:i=>{const name=abi.callbacks[i];if(!name)throw new Error('Unknown ARTIFACT callback '+i);return pointer(name,'ip');},
  foreignFunctionPointer:i=>{const name=abi.foreignCallbacks[i];if(!name)throw new Error('Unknown ARTIFACT foreign callback '+i);return environment.functionPointer(name,name==='xname'?'pp':'ip');},
  rngCaller:(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('artifact.c'),transport.int(line),text(caller));},
  create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),start_menu:(win,flags)=>window('win_start_menu','vij',transport.int(win),transport.ulong(flags)),
  end_menu:(win,message)=>window('win_end_menu','vip',transport.int(win),text(message)),destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win)),
  display_nhwindow:(win,block)=>window('win_display_nhwindow','vii',transport.int(win),transport.char(block)),putstr:(win,attr,message)=>window('win_putstr','viip',transport.int(win),transport.int(attr),text(message)),
 });
 // Preserve initialized table bytes and alias legacy calls to the factory state.
 const tables=['artilist','artiexist','artidisco'].map(name=>({name,at:environment.requireGlobal(name),bytes:memory.readBytes(environment.requireGlobal(name),name==='artilist'?35*L.artifactSize:name==='artiexist'?34*L.arti_infoSize:33*2)}));
 context=createArtifactEnvironment(local,L,source);
 Object.assign(context.state,legacy.state);legacy.state=context.state;
 for(const row of tables)if(!memory.readBytes(row.at,row.bytes.length).every((v,i)=>v===row.bytes[i]))throw new Error('ARTIFACT construction changed initialized '+row.name);
 const entry=environment.start('artifact-properties');
 // Existing symbols keep their canonical owner; the original factory becomes its context.
 entry.environment=context;entry.prepareArgs=undefined;
 for(const name of Object.keys(entry.namespace))entry.namespace[name]=bind(name);
 const add=names=>environment.extend('artifact-properties',Object.fromEntries(names.filter(name=>!environment.hasFunction(name)).map(name=>[name,bind(name)])));
 add(['retouch_object','save_artifacts','restore_artifacts']);
 return{environment:context,services:local,enablePublic:()=>add(Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name))),call:(name,...args)=>invoke(name,args)};
}
