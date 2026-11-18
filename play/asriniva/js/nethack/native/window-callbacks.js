import {isNativeValueReference} from './value-records.js';
// Per-game window function identities. Byte tokens remain the interchange
// format; only table mutations resolve a token. Foreign callbacks retain the
// generic checked boundary, including its instrumentation and error behavior.
import abi from '../window-abi.json' with {type:'json'};
export function createNativeWindowCallbacks(environment, owner) {
 const {ctypes,functions}=environment,fields=ctypes.record('struct window_procs').fields;
 const base=environment.requireGlobal('windowprocs'),slots=new Map();
 const code=raw=>{const type=ctypes.canonical(raw);return type.includes('*')?'p':type==='void'?'v':type==='float'?'f':type==='double'?'d':ctypes.size(type)===8?'j':'i';};
 for(const [name,type]of Object.entries(abi.windows.callbacks)){
  const field=fields[name],match=type.match(/^(.*?)\s*\(\s*\*\s*\)\s*\((.*)\)$/);
  if(!field||!match||field.ctype!==type+' '+name)throw new Error('Review native window callback '+name);
  const parameters=match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');
  slots.set(name,{at:base+field.offset,signature:[match[1],...parameters].map(code).join(''),token:undefined,fn:undefined});
 }
 function checkedSlot(name,signature){
   const slot=slots.get(name);
   if(!slot)throw new TypeError('Unknown native window callback '+name);
   if(signature!==slot.signature)throw new TypeError('Incompatible native window callback '+name);
   return slot;
 }
 function callbackFor(slot,token){
   const signature=slot.signature;
   if(token!==slot.token){
    // Publish the cache only after validation succeeds. A failed replacement
    // must never leave a previous callback callable under a new token.
    const fn=functions.typedCallback(token,signature);slot.fn=fn;slot.token=token;
   }
   return slot.fn;
 }
 function invokeSlot(slot,token,args){
   const signature=slot.signature;
   const fn=callbackFor(slot,token),native=fn.prepareNativeEntry?.()??fn.nativeEntry??fn;
   return native.nativeState===owner&&native.nativeDirect?native(...args):owner.boundary(functions.indirect,token,signature,...args.map((value,i)=>signature[i+1]==='p'&&isNativeValueReference(value)?value.address:value));
 }
 return Object.freeze({
  invoke(name,signature,...args){const slot=checkedSlot(name,signature);return invokeSlot(slot,owner.nativeArena.pointer(slot.at),args);},
  invokeCaptured(name,signature,token,...args){return invokeSlot(checkedSlot(name,signature),token,args);},
  bindCaptured(name,signature){const slot=checkedSlot(name,signature);return (token,...args)=>invokeSlot(slot,token,args);},
  printGlyphFrame(token,window,x,y,foreground,frame){
   const fn=callbackFor(slots.get('win_print_glyph'),token);
   if(fn.nativeState!==owner||typeof fn.nativeGlyphFrame!=='function')return false;
   fn.nativeGlyphFrame(window,x,y,foreground,frame);
   return true;
  },
 });
}
