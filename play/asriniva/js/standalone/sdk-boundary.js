// Pinned Emscripten/musl boundary behavior; no host filesystem or Wasm.
import abi from './sdk-boundary-abi.json' with {type:'json'};
import {readSdkUtf8} from '../c-runtime/stdio.js';
import {VFSError} from '../services/c-vfs.js';
const owners=new WeakMap();
export class SdkAbortError extends Error{constructor(message){super(message);this.name='RuntimeError';}}
export function enableSdkBoundary(environment,{monotonicNow=()=>performance.now(),onAbort}={}){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,libc,transport,filesystem}=environment,address=environment.address,text=p=>readSdkUtf8(memory,p),isNull=v=>v===0||v===0n||v===null||v===undefined;
 const failure=code=>{libc.errno=abi.constants[code];return -1;},capture=fn=>{try{return fn();}catch(e){if(!(e instanceof VFSError))throw e;libc.errno=e.errno;return -1;}};
 filesystem.installNullDevice();
 const state={aborted:false,abortMessage:null},api={
  access:(path,mode)=>capture(()=>{path=text(path);if(!path)throw new VFSError('ENOENT');mode=transport.int(mode);if(mode&~7)return failure('EINVAL');const node=filesystem._lookup(path);filesystem._permissions(node,(mode&4?'r':'')+(mode&2?'w':'')+(mode&1?'x':''));return 0;}),
  getcwd:(p,size)=>{p=address(p);size=p?transport.ulong(size):BigInt(abi.constants.PATH_MAX);if(!size){failure('EINVAL');return 0;}const cwd=filesystem.cwd(),bytes=new TextEncoder().encode(cwd);if(BigInt(bytes.length+1)>size){failure('ERANGE');return 0;}if(!cwd.startsWith('/')){failure('ENOENT');return 0;}if(!p){p=memory.malloc(bytes.length+1);if(!p){failure('ENOMEM');return 0;}}memory.writeString(p,bytes);return p;},
  setuid:id=>{transport.uint(id);return failure('EPERM');},setgid:id=>{transport.uint(id);return failure('EPERM');},
  wait:status=>{void status;return failure('ENOSYS');},
  sleep:seconds=>{const ms=transport.uint(seconds)*1000,start=monotonicNow();let now=start;do{now=monotonicNow();}while(now-start<ms);return 0;},
  __assert_fail:(condition,file,line,fn)=>{const message=`Assertion failed: ${text(condition)}, at: ${isNull(file)?'unknown filename':text(file)},${transport.int(line)},${isNull(fn)?'unknown function':text(fn)}`,output='Aborted('+message+')';onAbort?.(message);services.hostError(output+'\n');state.aborted=true;state.abortMessage=message;throw new SdkAbortError(output+'. Build with -sASSERTIONS for more info.');},
 };
 if(typeof services.freopen!=='function')throw new Error('SDK boundary requires actual shared stdio freopen');api.freopen=services.freopen;
 for(const name of Object.keys(api))if(environment.hasFunction(name))throw new Error('SDK boundary would replace existing owner '+name);
 Object.assign(services,api);environment.register('sdk-boundary',api);
 const owner={api,state,limitation:'Pinned single-thread -O2/default-assertions MEMFS SDK profile. Sleep busy-waits actual monotonic time; original game has no alarm/setitimer callers, and armed SDK timer delivery remains unaccepted. Abort text/stderr/throw match SDK; pure-JS SdkAbortError replaces WebAssembly.RuntimeError class identity.'};owners.set(environment,owner);return owner;
}
