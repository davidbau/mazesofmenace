// Stable game-owned command function identities. Native source consumes these
// functions directly; numeric callback values exist for comparison/byte aliases.
export function createNativeCommandFunctions(environment,owner){
 const {functions}=environment,cells=new Map();
 return Object.freeze({owner,view(value){
  const id=BigInt(value?.address??value??0);if(!id)return 0;
  let cell=cells.get(id);if(cell)return cell;
  let callback;
  cell=(...args)=>{
   callback??=functions.typedCallback(id,'i');
   const native=callback.prepareNativeEntry?.()??callback.nativeEntry??callback;
   return native.nativeState===owner&&native.nativeDirect?native(...args):functions.indirect(id,'i',...args);
  };
  Object.defineProperties(cell,{address:{value:id},[Symbol.toPrimitive]:{value:()=>id},nativeState:{value:owner},nativeDirect:{value:true},nativeCommandFunction:{value:true}});
  cells.set(id,cell);return cell;
 }});
}
