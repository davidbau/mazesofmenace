// Configured Emscripten libc signal()/sigaction() table semantics. No host
// process handlers are installed; delivery is an explicit runtime input.
import {C,withCEnvironment} from '../ported/c-runtime.js';
import abi from './display-abi.json' with {type:'json'};
export function createSignals(environment){
 const {memory,functions,transport,libc}=environment,actions=environment.allocateGlobal('libc.sigactions',abi.actionSize*abi.signalCount),callbacks=new WeakMap();
 const raw=value=>BigInt.asUintN(64,BigInt(value?.address??value??0));
 function handler(value){
  if(typeof value!=='function')return raw(value);
  if(callbacks.has(value))return callbacks.get(value);
  const context=C??environment.services,id=functions.functionPointer(sig=>transport.scoped(()=>withCEnvironment(context,value,sig)),'vi');callbacks.set(value,id);return id;
 }
 function valid(sig){if(Number.isInteger(sig)&&sig>=0&&sig<abi.signalCount)return true;libc.errno=abi.EINVAL;return false;}
 function sigaction(sig,action,old){sig=transport.int(sig);if(!valid(sig))return -1;const at=actions+sig*abi.actionSize;if(old)memory.memmove(environment.address(old),at,abi.actionSize);if(action)memory.memmove(at,environment.address(action),abi.actionSize);return 0;}
 function signal(sig,value){sig=transport.int(sig);if(!valid(sig))return raw(abi.SIG_ERR);const id=handler(value),at=actions+sig*abi.actionSize,old=memory.view.getBigUint64(at+abi.handler,true);return transport.scoped(()=>{const p=transport.stackAlloc(abi.actionSize);memory.memset(p,0,abi.actionSize);memory.view.setBigUint64(p+abi.handler,id,true);memory.view.setInt32(p+abi.flags,abi.SA_RESTART,true);sigaction(sig,p,0);return old;});}
 function deliver(sig){sig=transport.int(sig);if(!valid(sig))return -1;const at=actions+sig*abi.actionSize,id=memory.view.getBigUint64(at+abi.handler,true);if(id===BigInt(abi.SIG_IGN))return 0;if(id===BigInt(abi.SIG_DFL))throw new Error('Unconnected default signal action '+sig);if(memory.HEAPU8.subarray(at+abi.mask,at+abi.mask+abi.maskSize).some(v=>v!==0)||memory.view.getInt32(at+abi.flags,true)!==abi.SA_RESTART)throw new Error('Signal delivery requires its original mask/flag owner');functions.indirect(id,'vi',sig);return 0;}
 return {signal,sigaction,deliver,actions,handler};
}
