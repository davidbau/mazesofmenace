// Original FILES policies on shared measured records and virtual filesystem.
import abi from './files-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as files from '../ported/files.js';
import {createFilesEnvironment} from './bindings/files.js';
import {createCTypes} from './c-types.js';
import {enableAddressPort} from './address-ports.js';
import {enableSdkDirectory} from './sdk-directory.js';
import {nativeStateFor} from './native/state-bridge.js';
export function enableFiles(environment,layouts){
 enableSdkDirectory(environment);
 const ctypes=createCTypes(environment.memory,{...records,records:{...records.records,...abi.records}},environment.bitfields);
 const only=Object.keys(files).filter(n=>typeof files[n]==='function'&&Object.hasOwn(publicFunctions.functions,n)&&!environment.hasFunction(n));
 const basebuf=environment.requireGlobal('files.nh_basename.basebuf');
 let context;
 const factory=services=>{
  if(context)return context;
  const saved=environment.memory.readBytes(basebuf,80);try{return context=createFilesEnvironment(services);}finally{environment.memory.HEAPU8.set(saved,basebuf);}};
 const group=enableAddressPort(environment,'files',{only,definition:{schema:abi.schema,layout:abi.layout},adapter:[files,factory,'factory'],ctypes,backingAddresses:{'nh_basename.basebuf':basebuf}});
 group.services.strlen=p=>environment.transport.ulong(environment.services.strlen(typeof p==='string'?environment.services.literal(p):environment.address(p)));
 group.services.getuid=()=>environment.services.getuid();
 group.services.getpid=()=>environment.services.getpid();
 for(const name of ['yyyymmdd','hhmmss'])group.services[name]=date=>environment.calendar(name,environment.transport.long(date));
 group.services.teleport_native_signal=(signal,handler)=>environment.services.signal(environment.transport.int(signal),handler);
 group.services.teleport_compress_file=(filename,compressed,unpack)=>environment.services.compressFile(environment.address(filename),environment.address(compressed),environment.transport.int(unpack));
 const owner=nativeStateFor(environment);
 const entry=environment.start('files');
 if(Object.hasOwn(entry.namespace,'livelog_add')){
  const maskAt=ctypes.fieldAddress('struct sysopt_s',environment.requireGlobal('sysopt'),'livelog');
  const liveLog=(flags,message)=>{
   const context=factory(group.services);
   if(!Object.hasOwn(context,'livelogMask'))
    Object.defineProperty(context,'livelogMask',{value:()=>environment.memory.view.getBigInt64(maskAt,true)});
   return files.livelog_add(flags,message,context)??0;
  };
  liveLog.nativeState=owner;
  liveLog.nativeDirect=true;
  liveLog.nativePrepared=true;
  owner.functions.set('livelog_add',liveLog);
  entry.namespace.livelog_add=liveLog;
 }
 return {...group,limitation:'Shared FILES transport connected; save/restore, compression and error lifecycle require original-C verification.'};
}
