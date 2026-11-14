import {createNativeValueRecords,isNativeValueReference} from './value-records.js';
export function installNativeDisplayValues(env,services,schema,decode){
 const owner=services.nativeOwner;if(!owner?.nativeRecords)return;
 const environment=services.nativeEnvironment;
 const values=createNativeValueRecords({...environment,nativeRecords:owner.nativeRecords},environment.transport.stackAlloc);
 const rawPtr=env.ptr,rawCopy=env.copy,rawCell=env.cell;
 env.ptr=value=>isNativeValueReference(value)?value:rawPtr(value);
 env.copy=(to,from,size)=>isNativeValueReference(to)||isNativeValueReference(from)?values.copy(to,from,size):rawCopy(to,from,size);
 env.cell=(at,type)=>isNativeValueReference(at)?at:rawCell(at,type);
 env.nativeLocalRecord=type=>values.local(type);
 for(const name of ['ptr','copy','cell','nativeLocalRecord'])env[name].nativeStateIndependent=true;
 let id=0;
 for(const [kind,row]of Object.entries(schema.schema))for(const f of row.fields){
  const index=id++;if(!['glyphinfo','glyph_map_entry','classic_representation'].includes(kind))continue;
  const identity=environment.ctypes.record(row.ctype).type,check=at=>{if(at.layout?.identity!==identity)throw Error('Native display record type mismatch: '+kind);};
  const read=env.nativeFields.readers[index],write=env.nativeFields.writers[index],address=env.nativeFields.addresses[index];
  const reader=at=>{if(!isNativeValueReference(at))return read(at);check(at);const value=at.read(f.name);return f.canonical.includes('*')?decode(f.canonical,value?.address??value):value;};
  const writer=(at,value)=>{if(!isNativeValueReference(at))return write(at,value);check(at);return at.write(f.name,value);};
  const locate=at=>{if(!isNativeValueReference(at))return address(at);check(at);return at.field(f.name);};
  env.nativeFields.readers[index]=reader;env.nativeFields.writers[index]=writer;env.nativeFields.addresses[index]=locate;
  for(const [prefix,fn]of [['read',reader],['address',locate]]){const name='display_'+prefix+'_'+kind+'_'+f.name;if(typeof env[name]==='function')env[name]=fn;}
 }
}
