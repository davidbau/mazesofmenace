// Game-owned visibility matrices and references. Stable JS ArrayBuffers let a
// typed row remain valid across allocation callbacks; bytes still alias saves
// and genuine byte-level providers. Unsupported hosts retain the old adapter.
const littleEndian=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
const kinds={u8:[Uint8Array,1],i8:[Int8Array,1],i16:[Int16Array,2]};
export function createNativeVisibilityState({environment,owner,layout,storage,privateStorage,circleLengths,read,write}){
 if(!environment?.memory?.stableBuffer||!littleEndian||!owner.nativeArena)return;
 const {memory,ctypes}=environment,arena=owner.nativeArena;
 const address=environment.address,arrays=new Map(),tables=new Map(),views=new Map(),scalars=new Map(),refCache=new Map(),wrapped=new WeakMap(),originals=new WeakMap(),dataRanges=[];
 const meta=(value,at,d,extra={})=>{Object.defineProperties(value,{address:{value:at},descriptor:{value:d},nativeVisibility:{value:true},...Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,{value:v}]))});return value;};
 const width=d=>d.t?kinds[d.t]?.[1]??Number(d.t.slice(1))/8:d.q?8:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 function vector(kind,at,length){const key=kind+':'+at+':'+length;if(views.has(key))return views.get(key);const [Ctor,bytes]=kinds[kind];memory.bounds(at,length*bytes);const out=meta(new Ctor(memory.buffer,at,length),at,{a:[length],e:{t:kind}},{nativeVisibilityKind:kind});views.set(key,out);return out;}
 function matrix(d,at){if(d.a.length===1)return vector(d.e.t,at,d.a[0]);const child={a:d.a.slice(1),e:d.e},stride=width(child);return meta(Array.from({length:d.a[0]},(_,i)=>matrix(child,at+i*stride)),at,d);}
 function pointerTable(name,at,d){const rows=meta(Array(d.a[0]).fill(0),at,d),entry={name,at,rows,kind:d.e.q.t,epoch:-1,pointers:Array(d.a[0]).fill(undefined)};tables.set(at,entry);arrays.set(name,rows);return rows;}
 function refresh(table){if(owner.depth&&table.epoch===owner.epoch)return table.rows;for(let i=0;i<table.rows.length;i++){const p=arena.pointer(table.at+i*8);if(p!==table.pointers[i]){table.rows[i]=p?vector(table.kind,p,layout.COLNO):0;table.pointers[i]=p;}}table.epoch=owner.epoch;return table.rows;}
 function rows(value){const p=address(value);if(!p)return 0;const table=tables.get(p);return table?refresh(table):undefined;}
 function coords(value){const p=address(value);if(!p)return 0;for(const [name,view]of arrays){if(!view.nativeVisibilityKind||view.nativeVisibilityKind!=='i16')continue;const end=view.address+view.byteLength;if(p>=view.address&&p<=end&&(p-view.address)%2===0)return vector('i16',p,(end-p)/2);}return undefined;}
 function pointer(at,d){let cached=refCache.get(at);if(owner.depth&&cached?.epoch===owner.epoch)return cached.value;const raw=arena.pointer(at),value=d.q?.q?rows(raw):coords(raw),out=value===undefined?read(d,at):value;if(!cached){cached={};refCache.set(at,cached);}cached.value=out;cached.epoch=owner.epoch;return out;}
 function setPointer(at,d,value){write(d,at,value);refCache.set(at,{value:value?.nativeVisibility?value:(d.q?.q?rows(value):coords(value))??read(d,at),epoch:owner.epoch});}
 const descriptors={};
 for(const [i,row]of privateStorage.entries()){
  const at=address(storage(i)),d=row.d;
  if(d.a&&d.e.t&&kinds[d.e.t]){const value=matrix(d,at);arrays.set(row.name,value);dataRanges.push([at,at+width(d)]);descriptors[row.name]={get:()=>value,set:value=>write(d,at,value)};}
  else if(d.a&&d.e.q){const value=pointerTable(row.name,at,d);descriptors[row.name]={get:()=>refresh(tables.get(at)),set:value=>{write(d,at,value);tables.get(at).epoch=-1;refCache.clear();}};}
  else if(d.q){descriptors[row.name]={get:()=>pointer(at,d),set:value=>setPointer(at,d,value)};}
  else if(d.t==='i32'){const index=at/4;descriptors[row.name]={get:()=>arena.Int32[index],set:value=>{arena.Int32[index]=Number(value);}};}
 }
 for(const [i,name]of ['circle_data','circle_start'].entries()){const at=address(storage(20+i)),value=vector('i16',at,circleLengths[name]);arrays.set(name,value);dataRanges.push([at,at+value.byteLength]);}
 const gv=environment.requireGlobal('gv'),globalPointers=Object.fromEntries(['viz_array','viz_rmin','viz_rmax'].map(name=>[name,ctypes.fieldAddress('struct instance_globals_v',gv,name)]));
 function wrapGlobals(base){if(wrapped.has(base))return wrapped.get(base);const out=Object.create(base);for(const [name,at]of Object.entries(globalPointers)){const d=name==='viz_array'?{q:{q:{t:'u8'}}}:{q:{t:'i16'}};Object.defineProperty(out,name,{get:()=>pointer(at,d),set:value=>setPointer(at,d,value)});}wrapped.set(base,out);originals.set(out,base);return out;}
 function scalar(kind,at){const key=kind+':'+at;if(scalars.has(key))return scalars.get(key);const view=vector(kind,at,1),out={address:at,descriptor:{t:kind},nativeVisibility:true,nativeVisibilityScalar:kind,get value(){return view[0];},set value(v){view[0]=Number(v);}};scalars.set(key,out);return out;}
 function advance(value,n){if(!value?.nativeVisibility)return;n=Number(n);if(value.nativeVisibilityScalar)return scalar(value.nativeVisibilityScalar,value.address+n*kinds[value.nativeVisibilityScalar][1]);if(value.nativeVisibilityKind){const bytes=kinds[value.nativeVisibilityKind][1],at=value.address+n*bytes;for(const [begin,end]of dataRanges)if(at>=begin&&at<=end)return vector(value.nativeVisibilityKind,at,Math.floor((end-at)/bytes));return;}}
 function setRow(table,index,value){const entry=tables.get(table.address);if(!entry||entry.rows!==table)return false;refresh(entry);const p=address(value);arena.storePointer(entry.at+Number(index)*8,p);entry.rows[index]=value;entry.pointers[index]=p;entry.epoch=owner.epoch;return true;}
 function fill(value,byte,length){const at=address(value);length=Number(length);if(!dataRanges.some(([a,b])=>at>=a&&at+length<=b))return;memory.bounds(at,length);memory.HEAPU8.fill(Number(byte)&255,at,at+length);return at;}
 const active=()=>pointer(globalPointers.viz_array,{q:{q:{t:'u8'}}});
 const result={descriptors,arrays,rows,coords,wrapGlobals,original:value=>originals.get(value)??value,advance,setRow,fill,scalar,element:(a,i)=>a?.nativeVisibilityKind?scalar(a.nativeVisibilityKind,a.address+Number(i)*kinds[a.nativeVisibilityKind][1]):undefined,
  read(y,x){const current=active();if(current&&y>=0&&y<layout.ROWNO&&x>=0&&x<layout.COLNO)return current[y][x];const p=arena.pointer(globalPointers.viz_array),row=arena.pointer(p+Number(y)*8);return arena.view.getUint8(row+Number(x));},
  write(y,x,value){const current=active();if(current&&y>=0&&y<layout.ROWNO&&x>=0&&x<layout.COLNO)current[y][x]=Number(value);else{const p=arena.pointer(globalPointers.viz_array),row=arena.pointer(p+Number(y)*8);arena.view.setUint8(row+Number(x),Number(value));}return value;},
  seenv(at){return matrix({a:[3,3],e:{t:'u8'}},at);},stableBuffer:true};
 owner.visibilityState=result;return result;
}
