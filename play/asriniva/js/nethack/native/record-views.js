// Complete measured record projections for native engine owners. Shared actors,
// properties and map cells join the existing canonical identities; other state
// remains local to this view owner. Byte aliases use the same typed arena.
import {createArrayView} from '../../c-runtime/records.js';
import {fieldAliases} from '../declarations.js';
import {nativeStateFor} from './state-bridge.js';

const scalars={char:'Int8','signed char':'Int8','unsigned char':'Uint8',short:'Int16','unsigned short':'Uint16',int:'Int32','unsigned int':'Uint32',unsigned:'Uint32',long:'BigInt64','unsigned long':'BigUint64','long long':'BigInt64','unsigned long long':'BigUint64'};
const owners=new WeakMap(),storageAddress=Symbol('native record storage');
const smallWidths={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4};
const littleHost=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
const normalizers=Object.fromEntries([...new Set(Object.values(scalars))].map(kind=>{const bits=Number(kind.match(/\d+/)[0]);return [kind,kind.startsWith('Big')?value=>BigInt.asUintN(64,BigInt(value)):value=>typeof value==='number'&&Number.isInteger(value)?value:Number(BigInt[kind.startsWith('Uint')?'asUintN':'asIntN'](bits,BigInt(value)))];}));
export function createNativeRecordViews(environment){
 if(owners.has(environment))return owners.get(environment);
 const {ctypes,memory}=environment,owner=nativeStateFor(environment),arena=owner.nativeArena;
 if(!arena)throw new Error('Native record views require typed state');
 const records=new Map(),arrays=new Map(),definitions=new Map(),viewDefinitions=new WeakMap(),sharedDescriptors=new Map();
 const address=environment.address;
 const isRecord=type=>ctypes.isRecord(type);
 function definition(type){let row=definitions.get(type);if(!row){row=ctypes.record(type);definitions.set(type,row);}return row;}
 function value(type,p){
  type=ctypes.canonical(type);p=address(p);
  const match=type.match(/^(.*?)\[(\d+)\](.*)$/);
  if(match){
   const key=type+':'+p;if(arrays.has(key))return arrays.get(key);
   const child=match[1]+match[3],length=Number(match[2]),stride=ctypes.size(child),aggregate=child.includes('[')||isRecord(child),kind=scalars[ctypes.canonical(child)];
   const aligned=kind&&p>=16&&p%stride===0&&p+length*stride<=memory.buffer.byteLength;
   const cells=aligned&&kind.startsWith('Big')?new Map():undefined;
   const read=aligned?(cells?i=>{let cell=cells.get(i);if(!cell){cell=arena.scalar(kind,p+i*stride);cells.set(i,cell);}return cell.get();}:i=>arena[kind][p/stride+i]):i=>value(child,p+i*stride);
   const target={address:p,length,[Symbol.iterator]:function*(){for(let i=0;i<length;i++)yield read(i);}};
   const out=createArrayView(target,{allowLeadingZeroes:true,propertyCount:aggregate?length:undefined,cacheReads:aggregate,
    read,write:(i,v)=>ctypes.store(child,p+i*stride,v),
    onePast:i=>{if(!isRecord(child))throw new RangeError('C array bounds');return Object.freeze({address:p+i*stride});},
   });arrays.set(key,out);return out;
  }
  if(type.endsWith('*')){memory.bounds(p,8);const target=type.slice(0,-1).trim(),pointer=arena.pointer(p);return isRecord(target)?record(target,pointer):pointer;}
  if(isRecord(type))return record(type,p);
  const kind=scalars[type];memory.bounds(p,ctypes.size(type));return kind?arena.scalar(kind,p).get():ctypes.load(type,p);
 }
 function sharedDescriptor(type,name,field){
  const key=definition(type).type+':'+name;if(sharedDescriptors.has(key))return sharedDescriptors.get(key);
  const scalar=ctypes.canonical(field.ctype.replace(new RegExp('\\s+'+name+'$'),'')),offset=field.offset;
  let result;
  if(field.bits!==undefined&&field.shift+field.bits<=32){
   const bytes=Math.ceil((field.shift+field.bits)/8),mask=2**field.bits-1,packed=mask<<field.shift,shift=field.shift;
   result={enumerable:true,get(){const at=this[storageAddress]+offset;let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[at+i]*2**(i*8);return ((raw>>>shift)&mask)>>>0;},set(v){const at=this[storageAddress]+offset;v=typeof v==='number'&&Number.isInteger(v)?v:Number(BigInt.asUintN(field.bits,BigInt(v)));let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[at+i]*2**(i*8);raw=((raw&~packed)|((v&mask)<<shift))>>>0;for(let i=0;i<bytes;i++)arena.Uint8[at+i]=raw/2**(i*8)&255;}};
  }else if(field.bits===undefined&&!field.record&&smallWidths[scalars[scalar]]){
   const kind=scalars[scalar],bytes=smallWidths[kind],normalize=normalizers[kind];
   result={enumerable:true,get(){const at=this[storageAddress]+offset,value=littleHost?arena[kind][at/bytes]:undefined;return value===undefined?memory.view['get'+kind](at,true):value;},set(v){const at=this[storageAddress]+offset;v=normalize(v);if(!littleHost||arena[kind][at/bytes]===undefined)memory.view['set'+kind](at,v,true);else arena[kind][at/bytes]=v;}};
  }
  sharedDescriptors.set(key,result);return result;
 }
 function descriptor(type,p,name,field){
  const declared=field.ctype.replace(new RegExp('\\s+'+name+'$'),''),scalar=ctypes.canonical(declared),at=p+field.offset;
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
 function record(type,pointer){
  const at=address(pointer);if(!at)return 0;
  const row=definition(type),key=row.type+':'+at,sharedType=owner.sharedTypes.has('struct '+row.type)?'struct '+row.type:undefined;
  if(records.has(key)){const out=records.get(key);if(sharedType)owner.enrich(out,sharedType,at);return out;}
  memory.bounds(at,row.size);
  const out=(sharedType?owner.records.get(sharedType+':'+at):undefined)??{address:at};records.set(key,out);
  if(sharedType)owner.records.set(sharedType+':'+at,out);
  viewDefinitions.set(out,row);
  if(!Object.hasOwn(out,storageAddress))Object.defineProperty(out,storageAddress,{value:at});
  if(!Object.hasOwn(out,Symbol.toPrimitive)&&!Object.hasOwn(out,'valueOf'))Object.defineProperty(out,Symbol.toPrimitive,{value:()=>at});
  for(const[name,field]of Object.entries(row.fields))if(!Object.hasOwn(out,name)){const shared=sharedDescriptor(type,name,field);if(shared&&field.bits===undefined)owner.fields++;Object.defineProperty(out,name,shared??descriptor(type,at,name,field));}
  for(const[alias,name]of Object.entries(fieldAliases[row.type]??{}))if(!Object.hasOwn(out,alias)&&Object.hasOwn(out,name))Object.defineProperty(out,alias,{get:()=>out[name],set:v=>{out[name]=v;}});
  if(sharedType)owner.enrich(out,sharedType,at);
  return out;
 }
 owner.completeRecordTypes=new Set([...owner.sharedTypes].filter(isRecord));
 owner.registerSchemas(new Map([...owner.completeRecordTypes].map(type=>[type,p=>record(type,p)])));
 const result={record,value,argument:record,array:(type,p,length)=>value(type+'['+length+']',p),advance(view,n){const row=viewDefinitions.get(view);if(!row)throw new TypeError('Unrecognized native record view');return record(row.type,view.address+Number(n)*row.size);}};
 owner.nativeRecords=result;owners.set(environment,result);return result;
}
