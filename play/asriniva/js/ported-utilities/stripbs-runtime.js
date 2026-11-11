import * as stripbs from './stripbs.js';
import {withCEnvironment} from '../ported/c-runtime.js';
export function createStripbsEnvironment(services) {
 if(services.charSize!==1||services.pointerSize!==8||services.sizeSize!==8)throw Error('Review STRIPBS memory64 byte ABI');
 const view=()=>new DataView(services.heap().buffer);
 const env=Object.assign(Object.create(services),{
  charBuffer:n=>services.stackAlloc(n),
  loadChar:p=>services.charSigned?view().getInt8(Number(p)):view().getUint8(Number(p)),
  storeChar:(p,v)=>view().setInt8(Number(p),Number(v)),
 });
 Object.defineProperties(env,{stdin:{get:()=>services.stdin()},stdout:{get:()=>services.stdout()},errno:{get:()=>services.errno()}});
 return env;
}
export function callStripbs(services,argc,argv) {
 const saved=services.stackSave();
 try{return withCEnvironment(createStripbsEnvironment(services),stripbs.main,argc,argv);}
 finally{services.stackRestore(saved);}
}
