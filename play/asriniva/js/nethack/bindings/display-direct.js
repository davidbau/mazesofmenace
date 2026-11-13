// DISPLAY-specific measured field operations. No lvalue objects, service
// dispatch, descriptor decoding or BigInt round trips for small scalar reads.
import metadata from '../records.json' with {type:'json'};
import fields from '../display-direct-fields.json' with {type:'json'};
export function installDirectDisplayFields(env,memory,ptr){
 const base=at=>{at=ptr(at);if(at<0)throw new RangeError('Unrepresentable C address');return at;};
 const scalarMethods={char:'getInt8','signed char':'getInt8','unsigned char':'getUint8',short:'getInt16','unsigned short':'getUint16',int:'getInt32','unsigned int':'getUint32',unsigned:'getUint32',long:'getBigInt64','unsigned long':'getBigUint64','long long':'getBigInt64','unsigned long long':'getBigUint64'};
 const normalize={getInt8:v=>Number(v)<<24>>24,getUint8:v=>Number(v)&255,getInt16:v=>Number(v)<<16>>16,getUint16:v=>Number(v)&65535,getInt32:v=>Number(v)|0,getUint32:v=>Number(v)>>>0,getBigInt64:v=>BigInt.asIntN(64,BigInt(v)),getBigUint64:v=>BigInt.asUintN(64,BigInt(v))};
 for(const row of fields){
  const record=metadata.records[row.kind],field=record?.fields[row.field];
  if(!field||field.bits!==undefined)throw Error('Unmeasured direct DISPLAY field '+row.kind+'.'+row.field);
  const offset=field.offset;
  if(row.op==='address'){env[row.name]=at=>ptr(base(at)+offset);Object.defineProperty(env[row.name],'nativeAddress',{value:true});continue;}
  const t=row.canonical,pointer=t.includes('*'),aggregate=field.record||t.includes('[');
  if(aggregate){env[row.name]=at=>ptr(base(at)+offset);Object.defineProperty(env[row.name],'nativeAddress',{value:true});continue;}
  const enumeration=t.startsWith('enum ')?metadata.enums[t]:null;
  const method=pointer?'getBigUint64':enumeration?'get'+(enumeration.signed?'Int':'Uint')+enumeration.size*8:scalarMethods[t];
  if(!method)throw Error('Unsupported direct DISPLAY scalar '+t);
  const bytes=pointer?8:enumeration?enumeration.size:Number(method.match(/\d+/)[0])/8;
  const load=(at)=>{
   at=base(at);
   const pos=at+offset,dv=memory();
   if(!Number.isSafeInteger(pos)||pos<0)throw new RangeError('Unrepresentable C address');
   if(pos<16||pos+bytes>dv.byteLength)throw new RangeError('C memory access outside addressable range');
   return dv[method](pos,true);
  };
  // Enum decoding retains DISPLAY's signed 32-bit interpretation.
  env[row.name]=pointer?at=>ptr(load(at)):enumeration?at=>Number(load(at))|0:load;
  Object.defineProperty(env[row.name],'nativeField',{value:{ctype:'struct '+row.kind,field:row.field,canonical:row.canonical,base,normalize:normalize[method]}});
 }
}
