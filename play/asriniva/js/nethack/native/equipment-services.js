// One function identity per equipment symbol. Native engine dependencies pass
// native values; retained pointer-return/foreign services keep their ABI adapter.
import publicFunctions from '../public-functions.json' with {type:'json'};
import records from '../records.json' with {type:'json'};
const scalars=new Set(['void','char','signed char','unsigned char','short','unsigned short','int','unsigned int','unsigned','long','unsigned long','long long','unsigned long long','float','double']);
const scalarReturn=prototype=>{let type=prototype.slice(0,prototype.indexOf('(')).trim();const seen=new Set();while(records.aliases[type]&&!seen.has(type)){seen.add(type);type=records.aliases[type];}return scalars.has(type)||type.startsWith('enum ');};
const directReturns=new Map(Object.entries(publicFunctions.functions).map(([name,prototype])=>[name,scalarReturn(prototype)]));
export function createEquipmentServices(environment){
 const {services}=environment,forwards=new Map();let local;
 local=new Proxy(Object.create(services),{get(o,key,receiver){
  if(Object.hasOwn(o,key))return Reflect.get(o,key,receiver);
  const existing=Reflect.has(o,key)?Reflect.get(o,key,receiver):undefined;
  if(existing!==undefined&&typeof existing!=='function')return existing;
  if(typeof key!=='string')return existing;
  const owner=Object.getOwnPropertyDescriptor(o,'nativeOwner')?.value,native=owner?.functions.get(key);
  if(native?.nativeState===owner&&native?.nativeDirect){if(native.nativeValuesEntry)return native.nativeValuesEntry;if(directReturns.get(key))return native;}
  if(!forwards.has(key))forwards.set(key,(...args)=>{
   const selected=Reflect.has(services,key)?Reflect.get(services,key,services):environment.resolve(key);
   return selected(...args.map(value=>value?.address??value));
  });
  return forwards.get(key);
 }});
 return local;
}
