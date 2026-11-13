import {nativeStateFor} from './state-bridge.js';
const littleHost=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
// Native field operations used by the generated address-engine kernels.
// Public byte-level transports remain available for lvalue carriers/ABI callbacks.
import {connectNativeAddressState} from './address-state.js';
export function createNativeAddressFields(env,services,schema,decode,convert=env.ptr) {
 const connected=connectNativeAddressState(env,services),owner=connected?.owner;
 const readers=[],writers=[],addresses=[],nativeScalars=new Set(['char','signed char','unsigned char','short','unsigned short','int','unsigned int','unsigned','long','unsigned long','long long','unsigned long long']);
 Object.values(schema.schema).forEach((row,kind)=>row.fields.forEach((field,index)=>{
  const id=readers.length,plan=services.nativeFieldPlans?.[kind]?.[index];
  const readRaw=plan?plan.read:(at=>services.read(kind,at,index));
  const writeRaw=plan?plan.write:((at,value)=>services.write(kind,at,index,value));
  const addressRaw=plan?plan.address:(at=>services.address(kind,at,index));
  const native=connected?.accessor(row,field),pointer=field.canonical.includes('*');
  const read=plan&&!field.bit&&nativeScalars.has(field.canonical)?readRaw:(at=>decode(field.canonical,readRaw(at)));
  readers[id]=owner?.nativeArena&&plan?.nativeRead?(nativeScalars.has(field.canonical)&&!field.bit?at=>plan.nativeRead(convert(at?.address??at)):at=>decode(field.canonical,plan.nativeRead(convert(at?.address??at)))):at=>{at=convert(at?.address??at);const record=native?.(at);if(record){const value=record[field.name];return decode(field.canonical,value?.address??value);}if(owner?.depth)owner.flush();return read(at);};
  writers[id]=owner?.nativeArena&&plan?.nativeWrite?((at,value)=>{at=convert(at?.address??at);plan.nativeWrite(at,value);return value;}):(at,value)=>{
   at=convert(at?.address??at);const record=native?.(at);let encoded;
   if(record&&(nativeScalars.has(field.canonical)||pointer||field.canonical.startsWith('enum '))){
    if(typeof value==='number'&&Number.isInteger(value)){
     if(!pointer||(Number.isSafeInteger(value)&&value>=0)){record[field.name]=decode(field.canonical,value);return value;}
    }else{
     encoded=BigInt.asUintN(64,BigInt(value));
     if(!pointer||encoded<=9007199254740991n){record[field.name]=decode(field.canonical,encoded);return value;}
    }
   }
   encoded??=BigInt.asUintN(64,BigInt(value));
   if(owner?.depth)owner.flush();try{writeRaw(at,encoded);}finally{if(owner)owner.invalidate();}return value;
  };
  addresses[id]=at=>convert(addressRaw(convert(at?.address??at)));
 }));
 const compound=(get,set,at,op,rhs)=>{
  const before=get(at);let after;
  switch(op){
   case '+=':after=before+rhs();break;case '-=':after=before-rhs();break;
   case '*=':after=before*rhs();break;case '/=':after=before/rhs();break;
   case '%=':after=before%rhs();break;case '**=':after=before**rhs();break;
   case '<<=':after=before<<rhs();break;case '>>=':after=before>>rhs();break;
   case '>>>=':after=before>>>rhs();break;case '&=':after=before&rhs();break;
   case '|=':after=before|rhs();break;case '^=':after=before^rhs();break;
   case '&&=':if(!before)return before;after=rhs();break;
   case '||=':if(before)return before;after=rhs();break;
   case '??=':if(before!==null&&before!==undefined)return before;after=rhs();break;
   default:throw Error('Unknown native field assignment '+op);
  }
  set(at,after);return after;
 };
 const update=(get,set,at,op,prefix)=>{
  const before=get(at),one=typeof before==='bigint'?1n:1;
  const after=op==='++'?before+one:before-one;set(at,after);return prefix?after:before;
 };
 return {readers,writers,addresses,compound,update};
}

// Resolve immutable field declarations once, rather than on every engine read.
export function compileNativeFieldPlans(environment,schema,ctypes=environment.ctypes) {
 const {memory}=environment,scalarMethods={char:'Int8','signed char':'Int8','unsigned char':'Uint8',short:'Int16','unsigned short':'Uint16',int:'Int32','unsigned int':'Uint32',unsigned:'Uint32',long:'BigInt64','unsigned long':'BigUint64','long long':'BigInt64','unsigned long long':'BigUint64',float:'Float32',double:'Float64'};
 const owner=nativeStateFor(environment),arena=owner.nativeArena;
 const at=value=>environment.address(value);
 const readBytes=(p,n)=>{if(n===1)return memory.view.getUint8(p);if(n===2)return memory.view.getUint16(p,true);if(n===4)return memory.view.getUint32(p,true);let v=0;for(let i=0;i<n;i++)v+=memory.HEAPU8[p+i]*2**(8*i);return v;};
 const writeBytes=(p,n,v)=>{for(let i=0;i<n;i++)memory.HEAPU8[p+i]=v/2**(8*i)&255;};
 return Object.values(schema.schema).map(row=>{
  const definition=ctypes.record(row.ctype);
  return row.fields.map(declaration=>{
   const field=definition.fields[declaration.name];if(!field)throw Error('Unmeasured native field '+row.ctype+'.'+declaration.name);
   const address=base=>{if(field.bits!==undefined)throw Error('C bitfields have no address');return at(base)+field.offset;};
   const shared=owner.sharedTypes.has(row.ctype)||owner.sharedTypes.has('struct '+row.ctype);
   const nativeReader=(bytes,read)=>{if(!arena)return;let lastBase;return base=>{base=at(base);if(shared&&base>=16&&base!==lastBase){memory.bounds(base,definition.size);lastBase=base;}const p=base+field.offset;if(p<16)memory.bounds(p,bytes);return read(p);};};
   const nativeWriter=(bytes,write)=>{if(!arena)return;let lastBase;return (base,value)=>{base=at(base);if(shared&&base>=16&&base!==lastBase){memory.bounds(base,definition.size);lastBase=base;}value=typeof value==='number'&&Number.isInteger(value)?value:BigInt.asUintN(64,BigInt(value));const p=base+field.offset;if(p<16)memory.bounds(p,bytes);write(p,value);};};
   if(field.bits!==undefined){
    const bytes=Math.ceil((field.shift+field.bits)/8),mask=2**field.bits-1;
    if(field.shift+field.bits>32){
     return {address,read:base=>ctypes.getField(row.ctype,base,declaration.name,declaration.canonical),write:(base,v)=>ctypes.setField(row.ctype,base,declaration.name,declaration.canonical,v)};
    }
    return {address,nativeRead:nativeReader(bytes,p=>{memory.bounds(p,bytes);let raw=0;for(let i=0;i<bytes;i++)raw+=arena.Uint8[p+i]*2**(i*8);return ((raw>>>field.shift)&mask)>>>0;}),
     nativeWrite:nativeWriter(bytes,(p,v)=>{memory.bounds(p,bytes);const packed=mask<<field.shift,value=typeof v==='number'?v:Number(BigInt.asUintN(field.bits,v));let old=0;for(let i=0;i<bytes;i++)old+=arena.Uint8[p+i]*2**(i*8);const raw=((old&~packed)|((value&mask)<<field.shift))>>>0;for(let i=0;i<bytes;i++)arena.Uint8[p+i]=raw/2**(i*8)&255;}),
     read:base=>{const p=at(base)+field.offset;memory.bounds(p,bytes);return ((readBytes(p,bytes)>>>field.shift)&mask)>>>0;},
     write:(base,v)=>{const p=at(base)+field.offset;memory.bounds(p,bytes);const packed=mask<<field.shift,old=readBytes(p,bytes),value=Number(BigInt.asUintN(field.bits,BigInt(v)));writeBytes(p,bytes,((old&~packed)|((value&mask)<<field.shift))>>>0);},
    };
   }
   const type=ctypes.canonical(declaration.canonical),pointer=type.includes('*'),aggregate=field.record||type.includes('[')||(!scalarMethods[type]&&!pointer&&!type.startsWith('enum '));
   if(aggregate){let bytes;const size=()=>bytes??=(field.record?ctypes.record(field.record).size:ctypes.size(type));return {address,read:base=>{const p=at(base)+field.offset;if(!field.record)memory.bounds(p,size());return BigInt(p);},write:(base,v)=>memory.memmove(at(base)+field.offset,at(v),size())};}
   if(type.startsWith('enum '))return {address,read:base=>ctypes.load(type,at(base)+field.offset),write:(base,v)=>ctypes.store(type,at(base)+field.offset,v)};
   const method=pointer?'BigUint64':scalarMethods[type],bytes=Number(method.match(/\d+/)[0])/8;
   const nativeRead=pointer?nativeReader(bytes,p=>arena.pointer(p)):bytes<=4&&!method.startsWith('Float')?nativeReader(bytes,p=>{const value=littleHost?arena[method][p/bytes]:undefined;if(value!==undefined)return value;memory.bounds(p,bytes);return memory.view['get'+method](p,true);}):undefined;
   const nativeWrite=pointer?nativeWriter(bytes,(p,v)=>arena.storePointer(p,v)):!method.startsWith('Float')?nativeWriter(bytes,(p,v)=>{if(bytes===8){if(typeof v!=='bigint')v=BigInt(v);}else if(typeof v==='bigint')v=Number(BigInt[method.startsWith('Uint')?'asUintN':'asIntN'](bytes*8,v));const index=p/bytes;if(littleHost&&Number.isInteger(index)&&index>=0&&index<arena[method].length)arena[method][index]=v;else{memory.bounds(p,bytes);memory.view['set'+method](p,v,true);}}):undefined;
   return {address,nativeRead,nativeWrite,
    read:base=>{const p=at(base)+field.offset;memory.bounds(p,bytes);return memory.view['get'+method](p,true);},
    write:(base,v)=>{const p=at(base)+field.offset;memory.bounds(p,bytes);const value=method.startsWith('Big')?BigInt.asUintN(64,BigInt(v)):method.startsWith('Float')?Number(v):Number(BigInt[method.startsWith('Uint')?'asUintN':'asIntN'](bytes*8,BigInt(v)));memory.view['set'+method](p,value,true);},
   };
  });
 });
}
