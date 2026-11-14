// Compile command window calls once. A captured token preserves source argument
// evaluation order; foreign targets keep their original checked ABI boundary.
export function createNativeCommandWindowDispatch(environment,owner,ctypes=environment.ctypes){
 const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'?'f':t==='double'?'d':ctypes.size(t)===8?'j':'i';};
 function signature(type){const match=type.match(/^(.*?)\s*(?:\(\*\))?\s*\((.*?)\)/);if(!match)throw Error('Unknown native command window prototype '+type);return [match[1],...match[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')].map(code).join('');}
 const fields=ctypes.record('struct window_procs').fields;
 return Object.freeze({owner,bind(field,prototype){
  const declaration=fields[field]?.ctype,sig=signature(prototype);
  if(!declaration||signature(declaration)!==sig)throw Error('Review CMD native window callback '+field);
  return(token,...args)=>environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invokeCaptured(field,sig,token,...args):environment.functions.indirect(token,sig,...args);
 }});
}
