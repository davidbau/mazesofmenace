// Pointer-to-list values stay shared JS references between native owners.
// Actual byte consumers can request the same cell's address on demand.
import {nativeStateFor} from './state-bridge.js';
const games=new WeakMap();
export function nativeStateLinksFor(environment){
 if(games.has(environment))return games.get(environment);
 const owner=nativeStateFor(environment),{ctypes}=environment,arena=owner.nativeArena,views=owner.nativeRecords,owned=new WeakSet(),records=new WeakMap();
 function recordLink(record,key){
  let cache=records.get(record);if(!cache)records.set(record,cache=new Map());if(cache.has(key))return cache.get(key);
  const type=views.kindOf(record),field=type&&ctypes.record(type).fields[key];if(!field||!field.ctype.includes('*'))throw Error('Native state link requires a measured pointer field');
  const ref={get address(){return record.address+field.offset;},get value(){return record[key];},set value(v){record[key]=v;}};owned.add(ref);cache.set(key,ref);return ref;
 }
 function privateLink(name,type){
  let current=0,at;const ref={get address(){if(at===undefined){at=environment.allocateGlobal(name,8);arena.storePointer(at,current);current=undefined;}return at;},get value(){return at===undefined?current:views.record(type,arena.pointer(at));},set value(v){if(at===undefined)current=views.record(type,v);else arena.storePointer(at,v);}};owned.add(ref);return ref;
 }
 const result={record:recordLink,private:privateLink,owns:value=>value!==null&&typeof value==='object'&&owned.has(value)};games.set(environment,result);return result;
}
