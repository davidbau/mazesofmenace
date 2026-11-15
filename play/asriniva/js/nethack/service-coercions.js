// Validate fixed service adapters against their actual declared C signatures.
// A successfully parsed empty prefix is never evidence of complete metadata.
import {parseCPrototype} from '../c-runtime/prototypes.js';
export function validateServiceCoercions(owner,calls,prototypes,converters){
 for(const [name,row]of Object.entries(calls)){
  const fail=detail=>{throw Error('Invalid '+owner+' service metadata '+name+': '+detail);};
  const declared=Object.hasOwn(prototypes,row.target)&&prototypes[row.target];if(typeof declared!=='string')fail('unknown target '+row.target);
  let signature,supplied;try{signature=parseCPrototype(declared);supplied=row.prototype&&parseCPrototype(row.prototype);}catch(error){fail(error.message);}
  if(supplied&&(supplied.result!==signature.result||JSON.stringify(supplied.parameters)!==JSON.stringify(signature.parameters)))fail('prototype differs from '+row.target);
  if(!Array.isArray(row.coercions)||row.coercions.length!==signature.parameters.length)fail('expected '+signature.parameters.length+' argument conversions, got '+row.coercions?.length);
  if(signature.parameters.includes('...'))fail('variadic calls require an explicit format adapter');
  for(const [i,entry]of row.coercions.entries()){
   const pair=Array.isArray(entry),kind=pair?entry[0]:entry,index=pair?entry[1]:i;
   if(pair&&entry.length!==2||typeof kind!=='string'||!Object.hasOwn(converters,kind)||typeof converters[kind]!=='function')fail('unknown conversion at argument '+i);
   if(!Number.isInteger(index)||index<0||index>=signature.parameters.length)fail('invalid source argument '+index);
  }
 }
}
