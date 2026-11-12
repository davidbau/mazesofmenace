// Shared C binding construction; transport/profile decisions remain caller supplied.
import * as Crt from './adapter-memory.js';
import {createRecordStore,createArrayView} from './records.js';
export function callWithStack(services,fn,...args){const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}}

export function unsignedPointer(value){return BigInt.asUintN(64,BigInt(value?.address??value??0));}

export function exactAddress(value,errorText,coalesceNull=false){if(coalesceNull)value=value??0;const n=Number(value);if(!Number.isSafeInteger(n)||BigInt(n)!==BigInt(value))throw Error(errorText);return n;}

export function signedInt(value,coerceNumber=false){return typeof value==='bigint'?Number(BigInt.asIntN(32,value)):coerceNumber?Number(value)|0:value|0;}

export function currentDataView(services){return new DataView(services.heap().buffer);}

export function currentInt8View(services){return new Int8Array(services.heap().buffer);}

export function readPointerNumber(view,at){return Number(view().getBigUint64(at,true));}

export function createScalarEnvironment(services,layout,ptr){return Object.assign(Object.create(services),layout,{ptr,sizes:Object.fromEntries(Object.entries(layout).filter(([k])=>k.startsWith('size:')).map(([k,v])=>[k.slice(5),v]))});}

export function installDescriptorGlobals(globals,env,services,read,write,addr){globals.forEach((g,i)=>Object.defineProperty(env,g.name,{get:()=>read(g.d,addr(services.global(i))),set:v=>write(g.d,addr(services.global(i)),v)}));}

export function installAddressGlobals(globals,env,services,ptr){globals.forEach((g,i)=>Object.defineProperty(env,g.name,{get:()=>ptr(services.global(i))}));}

export function createDescriptorViewFactory({services,schemas,address,raw,cache,names,decode,decorate,numericRows=false,layout,aggregateField}){
 let store;function view(name,value){return store.record(name,value);}
 store=createRecordStore({address,cache,cacheKey:(name,at)=>name+':'+at,describe:type=>({type}),checked:false,trackDefinitions:false,
  createView:({type:name},at)=>{const base={address:at,kind:name};return numericRows?new Proxy(base,{get:(o,k)=>typeof k==='string'&&/^\d+$/.test(k)?view(name,at+Number(k)*Number(layout[name+'Size'])):Reflect.get(o,k)}):base;},
  initialize(result,{type:name},at){const ki=names.indexOf(name);schemas[name].fields.forEach((f,i)=>Object.defineProperty(result,f.name,{get:()=>{if(!aggregateField)return decode(f.d,services.read(ki,at,i));const value=services.read(ki,at,i);return name===aggregateField.record&&f.name===aggregateField.field?aggregateField.array(aggregateField.makeDescriptor(),aggregateField.address(value)):decode(f.d,value);},set:v=>services.write(ki,at,i,raw(v))}));},
  decorate:(result,{type:name})=>decorate(name,result)
 });return view;
}


export function createPrototypeDescriptorFactory({address,cache,recordTypes,layout,errorPrefix},initializePrototype){
 let store;function view(name,value){return store.record(name,value);}
 store=createRecordStore({address,cache,cacheKey:(name,at)=>name+':'+at,describe:type=>({type}),checked:false,trackDefinitions:false,publish:'late',
  createView({type:name},at){let type=recordTypes.get(name);if(!type){const prototype=initializePrototype(name,at);type={prototype,handler:{get(o,k){if(typeof k==='string'&&/^\d+$/.test(k))return view(name,o.address+Number(k)*Number(layout[name+'Size']));if(typeof k==='string'&&!Reflect.has(o,k))throw Error(errorPrefix+name+'.'+k);return Reflect.get(o,k);},set(o,k,v){if(!Reflect.has(o,k))throw Error(errorPrefix+name+'.'+String(k));return Reflect.set(o,k,v);}}};recordTypes.set(name,type);}return new Proxy(Object.assign(Object.create(type.prototype),{address:at,kind:name}),type.handler);},initialize(){}
 });return view;
}


export function installStringAliases(target,aliases,paths){for(const[name,field]of Object.entries(aliases)){const path=paths?field.split('.'): [field];installAliasedFields(target,null,[{kind:null,key:name,path,writable:true,returnsAssigned:!paths,onlyIfInTargetMissingAlias:true}],false);}return target;}

export function installAliasedFields(target,kind,rows,dynamic){for(const row of rows)if(row.kind===kind){if(row.onlyIfOwnTargetMissingAlias&&(Object.hasOwn(target,row.key)||!Object.hasOwn(target,row.path[0])))continue;if(row.onlyIfInTargetMissingAlias&&(!(row.path[0]in target)||row.key in target))continue;const descriptor=dynamic?{get(){let value=this;for(const key of row.path)value=value[key];return value;}}:{get:()=>{let value=target;for(const key of row.path)value=value[key];return value;}};if(row.writable){if(dynamic)descriptor.set={set(value){let object=this;for(const key of row.path.slice(0,-1))object=object[key];const assigned=object[row.path.at(-1)]=value;if(row.returnsAssigned)return assigned;}}.set;else descriptor.set={set:value=>{let object=target;for(const key of row.path.slice(0,-1))object=object[key];const assigned=object[row.path.at(-1)]=value;if(row.returnsAssigned)return assigned;}}.set;}Object.defineProperty(target,row.key,descriptor);}return target;}

export function createTypedRecordFactory({services,L,records,address,size,read,write,decorate,cache,primitive,immutableErrorPrefix,unknownErrorPrefix}){
 let record;
 const store=createRecordStore({address,cache:cache??null,cacheKey:(type,at)=>cache?type+':'+at:null,describe:type=>({type}),checked:false,trackDefinitions:false,publish:'late',
  createView({type:t},p){const out={address:p};if(primitive)Object.defineProperty(out,Symbol.toPrimitive,{value:()=>p});Object.defineProperty(out,'nativeType',{value:t});return out;},
  initialize(out,{type:t},p){for(const[name,f]of Object.entries(records[t]))Object.defineProperty(out,name,{enumerable:true,get:()=>f.bit?services.bit(f.bitIndex,p):read(f.type,p+L[f.key]),set:v=>{if(immutableErrorPrefix&&f.const)throw Error(immutableErrorPrefix+t+'.'+name);if(f.bit)services.setBit(f.bitIndex,p,v);else write(f.type,p+L[f.key],v);}});},
  decorate:(out,{type:t})=>decorate(t,out),
  finalize:(out,{type:t},p)=>createArrayView(out,{checked:false,allowLeadingZeroes:true,read:i=>record(t,p+i*size(t)),write:(i,v)=>services.heap().copyWithin(p+i*size(t),address(v),address(v)+size(t)),fallbackRead:(o,k)=>unknownErrorPrefix?k in o?o[k]:(()=>{throw Error(unknownErrorPrefix+t+' field '+String(k));})():o[k],fallbackWrite:(o,k,v)=>{if(unknownErrorPrefix&&!(k in o))throw Error(unknownErrorPrefix+t+' field '+String(k));o[k]=v;return true;}})
 });record=store.record;return record;
}


export function createDescriptorMemory({services,layout,addr,raw,memory,cache,view,pointerArrays=false,rows=false,coerceRecordSize=false,voidPointer='number',directIntegerReads=false,decodeCallback,rowDescriptor,arrays={}}){
 if(voidPointer!=='number'&&voidPointer!=='bigint'&&typeof voidPointer!=='function')throw new TypeError('Unknown C void-pointer representation');
 const width=d=>rows&&d.row?8:d.t?Number(d.t.slice(1))/8:d.p!==undefined||(pointerArrays&&d.q)||d.f?8:d.s?coerceRecordSize?Number(layout[d.s+'Size']):layout[d.s+'Size']:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 const decode=(d,v)=>{if(pointerArrays&&d.q)return v?array({a:[0],e:d.q},addr(v)):0;if(d.p!==undefined)return d.p?view(d.p,v):typeof voidPointer==='function'?voidPointer(v):voidPointer==='bigint'?BigInt(v):Number(v);if(d.s)return view(d.s,v);if(d.a)return array(d,addr(v));if(d.f)return decodeCallback?decodeCallback(v):v;const bits=+d.t.slice(1),r=d.t[0]==='i'?BigInt.asIntN(bits,BigInt(v)):BigInt.asUintN(bits,BigInt(v));return bits===64?r:Number(r);};
 const read=(d,at)=>{if(rows&&d.row)return array(rowDescriptor?rowDescriptor(d.row):{a:[0],e:{t:d.row}},Number(memory().getBigUint64(at,true)));if(d.s||d.a)return decode(d,at);const dv=memory();if(d.p!==undefined||(pointerArrays&&d.q)||d.f)return decode(d,dv.getBigUint64(at,true));const bits=+d.t.slice(1);if(directIntegerReads)return bits===64?decode(d,dv.getBigUint64(at,true)):dv[(d.t[0]==='i'?'getInt':'getUint')+bits](at,true);return decode(d,bits===64?dv.getBigUint64(at,true):dv['getUint'+bits](at,true));};
 const write=(d,at,v)=>{if(d.s){services.heap().copyWithin(at,addr(v),addr(v)+width(d));return;}const dv=memory();if(d.p!==undefined||(pointerArrays&&d.q)||d.f||d.t?.slice(1)==='64')dv.setBigUint64(at,raw(v),true);else dv['setUint'+d.t.slice(1)](at,Number(v),true);};
 function array(d,at){
  if(arrays.profile!==undefined&&arrays.profile!=='identity'&&arrays.profile!=='structural')throw new TypeError('Unknown C descriptor-array profile');
  const childOf=d=>arrays.childOf?arrays.childOf(d):d.a.length===1?d.e:{a:d.a.slice(1),e:d.e},keyOf=d=>arrays.keyOf?arrays.keyOf(d):JSON.stringify(d);
  let child,stride,bytes,addresses,key;
  if(arrays.profile==='identity'){
   const types=arrays.types;let type=types.get(d);if(!type){const next=childOf(d);type={key:'array:'+keyOf(d),child:next,stride:width(next),bytes:width(d)};types.set(d,type);}addresses=cache.get(type.key);if(!addresses)cache.set(type.key,addresses=new Map());if(addresses.has(at))return addresses.get(at);({child,stride}=type);bytes=type.bytes;
  }else{
   key='array:'+keyOf(d)+':'+at;if(cache.has(key))return cache.get(key);child=childOf(d);stride=width(child);bytes=width(d);
  }
  const target=arrays.primitiveAddress?{address:at,byteLength:bytes,length:d.a[0],descriptor:d,[Symbol.toPrimitive]:()=>at}:{address:at,byteLength:bytes,descriptor:d},children=arrays.cacheChildren&&(child.s||child.a)?new Map():null;
  const result=createArrayView(target,{checked:false,allowLeadingZeroes:true,read:i=>{if(!children)return read(child,at+i*stride);if(!children.has(i))children.set(i,read(child,at+i*stride));return children.get(i);},write:(i,v)=>write(child,at+i*stride,v)});
  if(addresses)addresses.set(at,result);else cache.set(key,result);return result;
 }
 return{width,decode,read,write,array};
}


export function createDependencyCall(callNative,mapArgument,convertResult){return (...args)=>{args=args.map(mapArgument);try{const value=callNative(...args);return convertResult?convertResult(value,args):value;}finally{for(const arg of args)arg?.copyback?.();}};}

export function createScalarTypes(){return {char:'i8','signed char':'i8','unsigned char':'u8',short:'i16','unsigned short':'u16',int:'i32','unsigned int':'u32',unsigned:'u32',long:'i64','unsigned long':'u64','long long':'i64','unsigned long long':'u64'};}
export function createScalarAdapter(services,layout,schema,ptr,options){
 const {profile,errors,address,fieldMetadata}=options,cached=profile==='cached-fields',declaredEnum=profile==='declared-enum',addressCells=profile==='address-cells',abi=profile==='abi-globals';
 if(!['signed-enum','cached-fields','declared-enum','address-cells','abi-globals'].includes(profile))throw new TypeError('Unknown C scalar transport profile: '+profile);
 const types=createScalarTypes(),env=createScalarEnvironment(services,layout,ptr);
 for(const signed of ['i','u'])for(const bits of [8,16,32,64])env[signed+bits]=v=>{
  if(cached&&bits!==64&&typeof v==='number'&&Number.isFinite(v)){if(bits===32)return signed==='i'?v|0:v>>>0;return signed==='i'?v<<(32-bits)>>(32-bits):(v>>>0)&(2**bits-1);}
  return Crt.narrowInteger(signed,bits,v);
 };
 let dataView;
 const memory=cached?()=>{const buffer=services.heap().buffer;if(dataView?.buffer!==buffer)dataView=new DataView(buffer);return dataView;}:()=>new DataView(services.heap().buffer);
 const type=t=>t.includes('*')?'p':t.startsWith('enum ')?(declaredEnum?(layout['enumSigned:'+t.slice(5)]?'i32':'u32'):'i32'):types[t];
 const decode=(t,v)=>{const d=type(t);if(d==='p')return ptr(v);if(!d)throw Error(errors[0]+t);return env[d](v);};
 const cellAddress=addressCells?address:ptr;
 env.cell=(at,t)=>{at=cellAddress(at);const d=type(t);if(!d)throw Error(errors[1]+t);const bits=d==='p'?64:+d.slice(1);return {address:at,get value(){if(cached){const dv=memory();return bits===64?decode(t,dv.getBigUint64(at,true)):dv[(d[0]==='i'?'getInt':'getUint')+bits](at,true);}return Crt.readIntegerCell(memory,decode,t,bits,at);},set value(v){return Crt.writeIntegerCell(memory,at,bits,v);}};};
 let kinds;
 if(cached){
  const fieldAccessors=new Map(),fieldBases=new WeakMap();
  env.field=(at,name,field)=>{
   const metadata=fieldMetadata.get(name)?.get(field);if(!metadata)throw Error(errors[2]+name+'.'+field);at=ptr(at);
   let bucket=fieldAccessors.get(metadata);
   if(bucket){if(bucket.last.at===at)return bucket.last.accessor;if(at!==0&&bucket.entries.has(at)){const entry=bucket.entries.get(at);bucket.last=entry;return entry.accessor;}}
   else{
    const {kind,index,canonical}=metadata;
    const prototype={get address(){return ptr(services.address(kind,fieldBases.get(this),index));},get value(){return decode(canonical,services.read(kind,fieldBases.get(this),index));},set value(v){services.write(kind,fieldBases.get(this),index,BigInt.asUintN(64,BigInt(v)));}};
    bucket={entries:new Map(),prototype,last:null};fieldAccessors.set(metadata,bucket);
   }
   const accessor=Object.create(bucket.prototype);fieldBases.set(accessor,at);const entry={at,accessor};bucket.last=entry;bucket.entries.set(at,entry);
   if(bucket.entries.size>128)bucket.entries.delete(bucket.entries.keys().next().value);
   return accessor;
  };
 }else{
  kinds=Object.keys(schema.schema);const convert=addressCells?address:ptr,readName=abi?'abiRead':'read',writeName=abi?'abiWrite':'write',addressName=abi?'abiAddress':'address';
  env.field=(at,name,field)=>{const kind=kinds.indexOf(name),index=schema.schema[name]?.fields.findIndex(f=>f.name===field),f=schema.schema[name]?.fields[index];if(kind<0||index<0||!f)throw Error(errors[2]+name+'.'+field);at=convert(at);return {get address(){return convert(services[addressName](kind,at,index));},get value(){return decode(f.canonical,services[readName](kind,at,index));},set value(v){services[writeName](kind,at,index,BigInt.asUintN(64,BigInt(v)));}};};
 }
 const globalAddress=addressCells?address:ptr,globalName=abi?'abiGlobal':'global';schema.globals.forEach((g,i)=>Object.defineProperty(env,g.name,{get:()=>globalAddress(services[globalName](i))}));
 return {env,types,memory,type,decode,kinds};
}
