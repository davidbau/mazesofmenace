// Complete measured record projections for native engine owners. Shared actors,
// properties and map cells join the existing canonical identities; other state
// remains local to this view owner. Byte aliases use the same typed arena.
import {createArrayView} from '../../c-runtime/records.js';
import {fieldAliases} from '../declarations.js';
import {nativeStateFor} from './state-bridge.js';

const scalars={char:'Int8','signed char':'Int8','unsigned char':'Uint8',short:'Int16','unsigned short':'Uint16',int:'Int32','unsigned int':'Uint32',unsigned:'Uint32',long:'BigInt64','unsigned long':'BigUint64','long long':'BigInt64','unsigned long long':'BigUint64'};
const owners=new WeakMap(),storageAddress=Symbol('native record storage'),projectionCache=Symbol('native record projections');
function nativeStorageAddress(){return this[storageAddress];}
const smallWidths={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4};
const littleHost=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
const normalizers=Object.fromEntries([...new Set(Object.values(scalars))].map(kind=>{const bits=Number(kind.match(/\d+/)[0]);return [kind,kind.startsWith('Big')?value=>BigInt.asUintN(64,BigInt(value)):value=>typeof value==='number'&&Number.isInteger(value)?value:Number(BigInt[kind.startsWith('Uint')?'asUintN':'asIntN'](bits,BigInt(value)))];}));
export function createNativeRecordViews(environment){
 if(owners.has(environment))return owners.get(environment);
 const {ctypes,memory}=environment,owner=nativeStateFor(environment),arena=owner.nativeArena;
 if(!arena)throw new Error('Native record views require typed state');
 const records=new Map(),arrays=new Map(),definitions=new Map(),viewDefinitions=new WeakMap(),sharedDescriptors=new Map(),shapes=new Map();
 const address=environment.address;
 const isRecord=type=>ctypes.isRecord(type);
 function definition(type){let row=definitions.get(type);if(!row){row=ctypes.record(type);definitions.set(type,row);}return row;}
 function value(type,p){
  type=ctypes.canonical(type);p=address(p);
  const match=type.match(/^(.*?)\[(\d+)\](.*)$/);
  if(match){
   const key=type+':'+p;if(arrays.has(key))return arrays.get(key);
   const child=match[1]+match[3],length=Number(match[2]),stride=ctypes.size(child),aggregate=child.includes('[')||isRecord(child),kind=scalars[ctypes.abiType(child)],pointer=child.endsWith('*'),pointee=pointer?child.slice(0,-1).trim():undefined,pointerRecord=pointer&&isRecord(pointee);
   const aligned=littleHost&&kind&&p>=16&&p%stride===0&&p+length*stride<=memory.buffer.byteLength;
   const cells=aligned&&kind.startsWith('Big')?new Map():undefined;
   const read=aligned?(cells?i=>{let cell=cells.get(i);if(!cell){cell=arena.scalar(kind,p+i*stride);cells.set(i,cell);}return cell.get();}:i=>arena[kind][p/stride+i]):pointer?i=>{const at=p+i*stride;memory.bounds(at,8);const raw=arena.pointer(at);return pointerRecord?record(pointee,raw):raw;}:i=>value(child,p+i*stride);
   const target={address:p,length,[Symbol.toPrimitive]:()=>p,[Symbol.iterator]:function*(){for(let i=0;i<length;i++)yield read(i);}};
   const out=createArrayView(target,{allowLeadingZeroes:true,propertyCount:aggregate?length:undefined,cacheReads:aggregate,
    read,write:(i,v)=>{const at=p+i*stride;if(pointer){memory.bounds(at,8);arena.storePointer(at,v);}else if(kind){memory.bounds(at,stride);v=normalizers[kind](v);if(aligned)arena[kind][p/stride+i]=v;else memory.view['set'+kind](at,v,true);}else ctypes.store(child,at,v);},
    onePast:i=>{if(!isRecord(child))throw new RangeError('C array bounds');return Object.freeze({address:p+i*stride});},
   });arrays.set(key,out);return out;
  }
  if(type.endsWith('*')){memory.bounds(p,8);const target=type.slice(0,-1).trim(),pointer=arena.pointer(p);return isRecord(target)?record(target,pointer):pointer;}
  if(isRecord(type))return record(type,p);
  const kind=scalars[ctypes.abiType(type)];memory.bounds(p,ctypes.size(type));return kind?arena.scalar(kind,p).get():ctypes.load(type,p);
 }
 function sharedDescriptor(type,name,field,slot){
  const key=definition(type).type+':'+name;if(sharedDescriptors.has(key))return sharedDescriptors.get(key);
  const scalar=ctypes.abiType(field.ctype.replace(new RegExp('\\s+'+name+'$'),'')),offset=field.offset;
  let result;
  if(field.bits!==undefined&&field.shift+field.bits<=32){
   const bytes=Math.ceil((field.shift+field.bits)/8),mask=2**field.bits-1,packed=mask<<field.shift,shift=field.shift;
   result={enumerable:true,get(){const at=this[storageAddress]+offset;let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[at+i]*2**(i*8);return ((raw>>>shift)&mask)>>>0;},set(v){const at=this[storageAddress]+offset;v=typeof v==='number'&&Number.isInteger(v)?v:Number(BigInt.asUintN(field.bits,BigInt(v)));let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[at+i]*2**(i*8);raw=((raw&~packed)|((v&mask)<<shift))>>>0;for(let i=0;i<bytes;i++)arena.Uint8[at+i]=raw/2**(i*8)&255;}};
  }else if(field.bits===undefined&&!field.record&&smallWidths[scalars[scalar]]){
   const kind=scalars[scalar],bytes=smallWidths[kind],normalize=normalizers[kind];
   result={enumerable:true,get(){const at=this[storageAddress]+offset,value=littleHost?arena[kind][at/bytes]:undefined;return value===undefined?memory.view['get'+kind](at,true):value;},set(v){const at=this[storageAddress]+offset;v=normalize(v);if(!littleHost||arena[kind][at/bytes]===undefined)memory.view['set'+kind](at,v,true);else arena[kind][at/bytes]=v;}};
  }
  if(!result&&field.bits===undefined){
   const declared=field.ctype.replace(new RegExp('\\s+'+name+'$'),'');
   if(field.record||scalar.includes('[')||isRecord(scalar)){
    const nested=field.record??scalar,size=field.record?definition(field.record).size:undefined;
    result={enumerable:true,get(){const cache=this[projectionCache];if(!(slot in cache))cache[slot]=value(nested,this[storageAddress]+offset);return cache[slot];},set(v){const at=this[storageAddress]+offset;if(field.record)memory.memmove(at,address(v),size);else ctypes.store(scalar,at,v);}};
   }else if(scalar.endsWith('*')){
    const target=scalar.slice(0,-1).trim(),pointee=isRecord(target);
    result={enumerable:true,get(){const raw=arena.pointer(this[storageAddress]+offset);if(!pointee)return raw;const cache=this[projectionCache],old=cache[slot];if(!old||old.raw!==raw||old.version!==owner.schemaVersion){const decoded=record(target,raw);if(old){old.raw=raw;old.version=owner.schemaVersion;old.value=decoded;}else cache[slot]={raw,version:owner.schemaVersion,value:decoded};return decoded;}return old.value;},set(v){arena.storePointer(this[storageAddress]+offset,typeof v==='string'&&declared.includes('*')?environment.services.literal(v):v);}};
   }else{
    const kind=scalar.includes('*')?'BigUint64':scalars[scalar];
    if(kind==='BigInt64'||kind==='BigUint64'){
     const normalize=scalar.includes('*')?v=>BigInt.asUintN(64,BigInt(typeof v==='string'&&declared.includes('*')?environment.services.literal(v):v?.address??v??0)):normalizers[kind];
     result={enumerable:true,get(){const at=this[storageAddress]+offset;if(!littleHost||at%8)return memory.view['get'+kind](at,true);const word=at/4,lo=arena.Uint32[word],hi=arena.Uint32[word+1];if(lo===undefined||hi===undefined)return memory.view['get'+kind](at,true);const cache=this[projectionCache],old=cache[slot];if(!old||old.lo!==lo||old.hi!==hi){const v=arena[kind][at/8];if(old){old.lo=lo;old.hi=hi;old.value=v;}else cache[slot]={lo,hi,value:v};return v;}return old.value;},set(v){const at=this[storageAddress]+offset;v=normalize(v);if(!littleHost||at%8||arena[kind][at/8]===undefined)memory.view['set'+kind](at,v,true);else arena[kind][at/8]=v;}};
    }else if(scalar==='float'||scalar==='double'){
     const kind=scalar==='float'?'Float32':'Float64';result={enumerable:true,get(){return memory.view['get'+kind](this[storageAddress]+offset,true);},set(v){memory.view['set'+kind](this[storageAddress]+offset,Number(v),true);}};
    }
   }
  }
  sharedDescriptors.set(key,result);return result;
 }
 function descriptor(type,p,name,field){
  const declared=field.ctype.replace(new RegExp('\\s+'+name+'$'),''),scalar=ctypes.abiType(declared),at=p+field.offset;
  if(field.bits!==undefined){
   const bytes=Math.ceil((field.shift+field.bits)/8),mask=2**field.bits-1;
   if(field.shift+field.bits<=32){
    const read=()=>{let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[at+i]*2**(i*8);return raw;};
    return {enumerable:true,get:()=>((read()>>>field.shift)&mask)>>>0,set(v){v=typeof v==='number'&&Number.isInteger(v)?v:Number(BigInt.asUintN(field.bits,BigInt(v)));const packed=mask<<field.shift,raw=((read()&~packed)|((v&mask)<<field.shift))>>>0;for(let i=0;i<bytes;i++)arena.Uint8[at+i]=raw/2**(i*8)&255;}};
   }
   return {enumerable:true,get:()=>ctypes.getField(type,p,name,scalar),set:v=>ctypes.setField(type,p,name,scalar,v)};
  }
  if(field.record||scalar.includes('[')||isRecord(scalar)){
   let child,ready=false;return {enumerable:true,get(){if(!ready){child=value(field.record??scalar,at);ready=true;}return child;},set:v=>{if(field.record)memory.memmove(at,address(v),definition(field.record).size);else ctypes.store(scalar,at,v);}};
  }
  if(scalar.endsWith('*')){
   const target=scalar.slice(0,-1).trim(),decode=isRecord(target)?raw=>record(target,raw):raw=>raw;
   const reference=owner.pointer(at,decode,v=>v);
   return {enumerable:true,get:reference.get,set:v=>arena.storePointer(at,typeof v==='string'&&declared.includes('*')?environment.services.literal(v):v)};
  }
  const kind=scalar.includes('*')?'BigUint64':scalars[scalar];
  if(kind)return owner.scalar(at,kind,scalar.includes('*')?v=>BigInt.asUintN(64,BigInt(typeof v==='string'&&declared.includes('*')?environment.services.literal(v):v?.address??v??0)):normalizers[kind]);
  return {enumerable:true,get:()=>ctypes.load(scalar,at),set:v=>ctypes.store(scalar,at,v)};
 }
 function shape(type,row){
  if(shapes.has(row.type))return shapes.get(row.type);
  const fields=Object.entries(row.fields).map(([name,field],slot)=>{const scalar=ctypes.abiType(field.ctype.replace(new RegExp('\\s+'+name+'$'),''));return {name,field,shared:sharedDescriptor(type,name,field,slot),counted:field.bits===undefined&&!field.record&&!scalar.includes('[')&&!isRecord(scalar)&&scalar!=='float'&&scalar!=='double'};});
  const aliases=Object.entries(fieldAliases[row.type]??{}).map(([alias,name])=>({alias,name,descriptor:{get(){return this[name];},set(v){this[name]=v;}}}));
  const result={fields,aliases};shapes.set(row.type,result);return result;
 }
 function record(type,pointer){
  const at=address(pointer);if(!at)return 0;
  const row=definition(type),sharedType=owner.sharedTypes.has('struct '+row.type)?'struct '+row.type:undefined;
  if(pointer&&typeof pointer==='object'&&viewDefinitions.get(pointer)?.type===row.type&&pointer[storageAddress]===at){if(sharedType)owner.enrich(pointer,sharedType,at);return pointer;}
  const key=row.type+':'+at;
  if(records.has(key)){const out=records.get(key);if(sharedType)owner.enrich(out,sharedType,at);return out;}
  memory.bounds(at,row.size);
  const out=(sharedType?owner.records.get(sharedType+':'+at):undefined)??{address:at};records.set(key,out);
  if(sharedType)owner.records.set(sharedType+':'+at,out);
  viewDefinitions.set(out,row);
  if(!Object.hasOwn(out,storageAddress))Object.defineProperty(out,storageAddress,{value:at});
  if(!Object.hasOwn(out,projectionCache))Object.defineProperty(out,projectionCache,{value:[]});
  if(!Object.hasOwn(out,Symbol.toPrimitive)&&!Object.hasOwn(out,'valueOf'))Object.defineProperty(out,Symbol.toPrimitive,{value:nativeStorageAddress});
  const plan=shape(type,row);
  for(const {name,field,shared,counted}of plan.fields)if(!Object.hasOwn(out,name)){if(shared&&counted)owner.fields++;Object.defineProperty(out,name,shared??descriptor(type,at,name,field));}
  for(const {alias,name,descriptor}of plan.aliases)if(!Object.hasOwn(out,alias)&&Object.hasOwn(out,name))Object.defineProperty(out,alias,descriptor);
  if(sharedType)owner.enrich(out,sharedType,at);
  return out;
 }
 owner.completeRecordTypes=new Set([...owner.sharedTypes].filter(isRecord));
 owner.registerSchemas(new Map([...owner.completeRecordTypes].map(type=>[type,p=>record(type,p)])));
 const result={record,value,argument:record,kindOf:value=>value&&typeof value==='object'?viewDefinitions.get(value)?.type:undefined,array:(type,p,length)=>value(type+'['+length+']',p),advance(view,n){const row=viewDefinitions.get(view);if(!row)throw new TypeError('Unrecognized native record view');return record(row.type,view.address+Number(n)*row.size);}};
 owner.nativeRecords=result;owners.set(environment,result);return result;
}
