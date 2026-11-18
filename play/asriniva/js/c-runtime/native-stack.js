// Instance-owned temporary byte storage. Frames rewind bump cursors; individual
// locals never enter the heap allocator. Chunks retain bytes and follow growth.
let nextMark=1;
const align=n=>Math.ceil(Math.max(n,1)/16)*16;
export function createNativeStack(memory,{chunkBytes=65536}={}){
 if(!Number.isSafeInteger(chunkBytes)||chunkBytes<16)throw new RangeError('Invalid native stack chunk size');
 const chunks=[],tokens=[],chunkMarks=[],offsetMarks=[],reservationMarks=[],reservations=[];
 let cursor=0,offset=0;
 function size(n){n=Number(n);if(!Number.isSafeInteger(n)||n<0||n>memory.maximumBytes)throw new RangeError('C stack allocation failed');return align(n);}
 function placement(n){
  const bytes=size(n);let index=cursor,start=offset,chunk=chunks[index];
  if(chunk&&start+bytes>chunk.capacity){index++;start=0;chunk=chunks[index];}
  if(!chunk||bytes>chunk.capacity){
   // Only inactive chunks can be replaced. No live frame/reservation refers
   // beyond the current cursor.
   if(chunk?.base)memory.free(chunk.base);
   chunk={base:0,capacity:Math.max(bytes,Math.min(chunkBytes,Math.max(16,memory.maximumBytes-16))),used:0};chunks[index]=chunk;
  }
  return{chunk,index,start,end:start+bytes};
 }
 function materialize(chunk){
  if(!chunk.base){
   let base=memory.malloc(chunk.capacity);
   if(!base&&chunk.used<chunk.capacity){base=memory.malloc(chunk.used);if(base)chunk.capacity=chunk.used;}
   if(!base)throw new RangeError('C stack allocation failed');chunk.base=base;
  }
  return chunk.base;
 }
 function commit(p){cursor=p.index;offset=p.end;p.chunk.used=Math.max(p.chunk.used,p.end);}
 const alloc=n=>{const p=placement(n),oldUsed=p.chunk.used;p.chunk.used=Math.max(p.chunk.used,p.end);let base;try{base=materialize(p.chunk);}catch(error){p.chunk.used=oldUsed;throw error;}commit(p);return base+p.start;};
 alloc.reserve=n=>{
  const p=placement(n);commit(p);
  const slot={chunk:p.chunk,start:p.start,active:true};reservations.push(slot);
  const assertAlive=()=>{if(!slot.active)throw new Error('Expired native stack reservation');};
  const reserved=()=>{assertAlive();return materialize(slot.chunk)+slot.start;};reserved.assertAlive=assertAlive;return reserved;
 };
 function stackSave(){
  if(nextMark>Number.MAX_SAFE_INTEGER)throw new RangeError('Native stack mark space exhausted');
  const token=nextMark++;
  tokens.push(token);chunkMarks.push(cursor);offsetMarks.push(offset);reservationMarks.push(reservations.length);
  return token;
 }
 function stackRestore(token){
  let index=tokens.length-1;
  if(index<0||tokens[index]!==token){
   if(!Number.isSafeInteger(token))throw new Error('Invalid C stack mark');
   // Active marks are increasing. Only a rewind past nested marks searches.
   let lo=0,hi=index;
   while(lo<=hi){const mid=lo+((hi-lo)>>1);if(tokens[mid]<token)lo=mid+1;else hi=mid-1;}
   index=lo;
   if(tokens[index]!==token)throw new Error('Invalid C stack mark');
  }
  while(reservations.length>reservationMarks[index])reservations.pop().active=false;
  cursor=chunkMarks[index];offset=offsetMarks[index];
  tokens.length=chunkMarks.length=offsetMarks.length=reservationMarks.length=index;
 }
 return{stackSave,stackRestore,stackAlloc:alloc,stackPosition:()=>cursor+':'+offset+':'+reservations.length};
}
