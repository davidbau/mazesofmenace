// Pinned SDK single-thread signal table and synchronous virtual delivery.
// No host process signal, OS thread or subprocess is used.
import {C,withCEnvironment} from '../c-runtime/context.js';
import abi from './display-abi.json' with {type:'json'};
import delivery from './signal-delivery-abi.json' with {type:'json'};
const owners=new WeakMap();
export function createSignals(environment){
 if(owners.has(environment))return owners.get(environment);
 const {memory,functions,transport,libc}=environment,actions=environment.allocateGlobal('libc.sigactions',abi.actionSize*abi.signalCount),callbacks=new WeakMap();
 for(const key of ['actionSize','mask','maskSize','flags','restorer','signalCount','SA_RESTART'])if(Number(delivery[key])!==abi[key])throw Error('Review native signal ABI '+key);
 const blocked=environment.allocateGlobal('libc.sigmask',abi.maskSize),pending=environment.allocateGlobal('libc.sigpending',abi.maskSize),raw=value=>BigInt.asUintN(64,BigInt(value?.address??value??0)),word=p=>memory.view.getBigUint64(environment.address(p),true),setWord=(p,v)=>memory.view.setBigUint64(environment.address(p),BigInt.asUintN(64,v),true);
 function handler(value){
  if(typeof value!=='function')return raw(value);
  if(callbacks.has(value))return callbacks.get(value);
  const context=C??environment.services,id=functions.functionPointer(sig=>transport.scoped(()=>withCEnvironment(context,value,sig)),'vi');callbacks.set(value,id);return id;
 }
 function valid(sig){if(Number.isInteger(sig)&&sig>=0&&sig<abi.signalCount)return true;libc.errno=abi.EINVAL;return false;}
 function sigaction(sig,action,old){sig=transport.int(sig);if(!valid(sig))return -1;const at=actions+sig*abi.actionSize;if(old)memory.memmove(environment.address(old),at,abi.actionSize);if(action)memory.memmove(at,environment.address(action),abi.actionSize);return 0;}
 function signal(sig,value){sig=transport.int(sig);if(!valid(sig))return raw(abi.SIG_ERR);const id=handler(value),at=actions+sig*abi.actionSize,old=memory.view.getBigUint64(at+abi.handler,true);return transport.scoped(()=>{const p=transport.stackAlloc(abi.actionSize);memory.memset(p,0,abi.actionSize);memory.view.setBigUint64(p+abi.handler,id,true);memory.view.setInt32(p+abi.flags,abi.SA_RESTART,true);sigaction(sig,p,0);return old;});}
 // Musl's LP64 sigset is 128 bytes, but configured _NSIG65 helpers operate on
 // its first word only; SETMASK/pending copy the complete source structure.
 function sigismember(set,sig){const s=transport.uint(transport.int(sig)-1);return s>=abi.signalCount-1?0:Number((word(set)>>BigInt(s))&1n);}
 function change(set,sig,add){const s=transport.uint(transport.int(sig)-1);if(s>=abi.signalCount-1||transport.uint(transport.int(sig)-32)<3){libc.errno=abi.EINVAL;return -1;}const bit=1n<<BigInt(s),w=word(set);setWord(set,add?w|bit:w&~bit);return 0;}
 function sigaddset(set,sig){return change(set,sig,true);}function sigdelset(set,sig){return change(set,sig,false);}
 function sigemptyset(set){setWord(set,0n);return 0;}function sigfillset(set){setWord(set,0xfffffffc7fffffffn);return 0;}
 function sigandset(dest,left,right){setWord(dest,word(left)&word(right));return 0;}function sigorset(dest,left,right){setWord(dest,word(left)|word(right));return 0;}
 function raise(sig){
  sig=transport.int(sig);
  // Original SDK raise indexes its action array without a range check.
  // Invalid native game signals are rejected by the Darwin bridge before here.
  if(sig<0||sig>=abi.signalCount)throw new RangeError('Undefined out-of-range SDK raise '+sig);
  if(sigismember(blocked,sig)){sigaddset(pending,sig);return 0;}
  const at=actions+sig*abi.actionSize,id=memory.view.getBigUint64(at+abi.handler,true),flags=memory.view.getInt32(at+abi.flags,true);
  if(flags&Number(delivery.SA_SIGINFO))return transport.scoped(()=>{const info=transport.stackAlloc(Number(delivery.infoSize));memory.memset(info,0,Number(delivery.infoSize));functions.indirect(id,'vipp',sig,info,0);return 0;});
  if(id===BigInt(abi.SIG_DFL)){const action=delivery.defaultActions[sig]?.action;if(action==='abort')environment.resolve('abort')();else if(action==='terminate')functions.exit(128+sig);}
  else if(id!==BigInt(abi.SIG_IGN))functions.indirect(id,'vi',sig);
  return 0;
 }
 function pthread_sigmask(how,set,old){
  how=transport.int(how);if(old)memory.memmove(environment.address(old),blocked,abi.maskSize);
  switch(how){case Number(delivery.SIG_SETMASK):memory.memmove(blocked,environment.address(set),abi.maskSize);break;case Number(delivery.SIG_BLOCK):sigorset(blocked,blocked,set);break;case Number(delivery.SIG_UNBLOCK):setWord(blocked,word(blocked)&~word(set));break;default:return abi.EINVAL;}
  sigdelset(blocked,Number(delivery.SIGKILL));sigdelset(blocked,Number(delivery.SIGSTOP));
  for(let sig=0;sig<abi.signalCount;sig++)if(sigismember(pending,sig)&&!sigismember(blocked,sig)){sigdelset(pending,sig);raise(sig);}return 0;
 }
 function sigprocmask(how,set,old){const result=pthread_sigmask(how,set,old);if(!result)return result;libc.errno=result;return -1;}
 function sigpending(out){memory.memmove(environment.address(out),pending,abi.maskSize);return 0;}
 const api={signal,sigaction,raise,sigprocmask,pthread_sigmask,sigpending,sigemptyset,sigfillset,sigaddset,sigdelset,sigismember,sigandset,sigorset};
 const owner={...api,api,deliver:raise,actions,blocked,pending,handler};owners.set(environment,owner);return owner;
}
