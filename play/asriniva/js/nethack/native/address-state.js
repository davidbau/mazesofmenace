// Connect compiled address kernels to the canonical native record graph.
// Compatibility cells, byte copies and foreign calls are explicit boundaries.
const pure=new Set(['ptr','i8','u8','i16','u16','i32','u32','i64','u64','int','uint','char','uchar','short','ushort','long','ulong','boolean','bool','intdiv','min','max','abs','sign','global','staticAddress','literal','local','automatic','enterAutomatic','leaveAutomatic']);
const transport=new Set(['heap','stackAlloc','stackSave','stackRestore']);
const byteHelpers=new Set(['copy','initialize','staticArray']);
const heapViews=/^HEAP(?:U?8|U?16|U?32|64|U64|F32|F64)$/;
export function connectNativeAddressState(env,services) {
 const owner=services.nativeOwner;if(!owner)return;
 const wrappers=new Map();
 const wrap=fn=>{
  if(fn.nativeState===owner||fn.nativeStateIndependent)return fn;
  let call=wrappers.get(fn);if(!call){call=function(...args){return owner.boundary(Reflect.apply,fn,this,args);};if('address' in fn)Object.defineProperty(call,'address',{get:()=>fn.address});wrappers.set(fn,call);}return call;
 };
 const prototype=Object.getPrototypeOf(env);
 Object.setPrototypeOf(env,new Proxy(prototype,{get(target,key,receiver){
  if(typeof key==='string'&&heapViews.test(key)){owner.flush();owner.invalidate();}
  const value=Reflect.get(target,key,receiver);
  if(typeof value!=='function'||pure.has(key)||transport.has(key))return value;
  return wrap(value.nativeEntry??value);
 }}));
 for(const[name,d]of Object.entries(Object.getOwnPropertyDescriptors(env))){
  if(typeof d.value!=='function'||pure.has(name)||transport.has(name)||name==='cell'||name==='field')continue;
  if(d.value.nativeAddress)continue;
  const direct=d.value.nativeField;
  if(direct){
   const native=accessor({ctype:direct.ctype},{name:direct.field,canonical:direct.canonical}),raw=d.value,pointer=direct.canonical.includes('*'),enumeration=direct.canonical.startsWith('enum ');
   const read=at=>{at=direct.base(at);const record=at>=16?native?.(at):undefined;if(record){const value=record[direct.field];return pointer?env.ptr(value?.address??value):enumeration?Number(value)|0:direct.normalize(value);}if(owner.depth)owner.flush();return raw(at);};
   Object.defineProperty(env,name,{...d,value:read});continue;
  }
  if(owner.nativeArena&&byteHelpers.has(name))continue;
  Object.defineProperty(env,name,{...d,value:wrap(d.value)});
 }
 for(const name of ['cell','field']){
  if(owner.nativeArena)continue;
  const original=env[name];if(typeof original!=='function')continue;
  env[name]=function(...args){
   const cell=Reflect.apply(original,this,args);
   return {get address(){return cell.address;},get value(){owner.flush();return cell.value;},set value(value){owner.flush();try{cell.value=value;}finally{owner.invalidate();}}};
  };
 }
 owner.nativeKernels??=new Set();owner.nativeKernels.add(services.nativeModuleName);
 function accessor(row,field){
  const type=owner.sharedTypes.has(row.ctype)?row.ctype:owner.sharedTypes.has('struct '+row.ctype)?'struct '+row.ctype:undefined;
  if(!type||field.canonical.includes('[')||(!field.canonical.includes('*')&&/^(struct |union )/.test(field.canonical)))return;
  let lastAt,lastRecord,lastVersion=-1;
  return at=>{
   if(at===lastAt&&(lastRecord||lastVersion===owner.schemaVersion))return lastRecord;
   lastAt=at;lastVersion=owner.schemaVersion;lastRecord=undefined;
   if(!at)return;
   let record=owner.records.get(type+':'+at);
   if(record)owner.enrich(record,type,at);
   else for(const provider of owner.providers){const make=provider.get(type);if(make){record=make(at);break;}}
   if(record&&Object.hasOwn(record,field.name))lastRecord=record;
   return lastRecord;
  };
 }
 return {owner,accessor};
}
