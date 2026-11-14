// C function type declarators, including functions returning callback pointers.
// This parses declared types; values and ABI conversions belong to the caller.
function closing(text,start){
 const opens={'(':')','[':']'},stack=[];
 for(let i=start;i<text.length;i++){
  if(opens[text[i]])stack.push(opens[text[i]]);
  else if(text[i]===')'||text[i]===']'){
   if(stack.pop()!==text[i])throw new Error('Unbalanced C function type '+text);
   if(!stack.length)return i;
  }
 }
 throw new Error('Unbalanced C function type '+text);
}
export function splitCParameters(text){
 const out=[];let start=0;
 for(let i=0;i<text.length;i++){
  if(text[i]==='('||text[i]==='[')i=closing(text,i);
  else if(text[i]===')'||text[i]===']')throw new Error('Unbalanced C parameters '+text);
  else if(text[i]===','){out.push(text.slice(start,i).trim());start=i+1;}
 }
 out.push(text.slice(start).trim());
 if(out.length===1&&(out[0]===''||out[0]==='void'))return [];
 if(out.some(type=>!type))throw new Error('Empty C parameter '+text);
 return out;
}
export function parseCPrototype(source){
 const text=source.trim().replace(/\s+__attribute__\(\(.*\)\)$/,'');
 const returningPointer=/^([^()]+?)\s*\(\s*\*\s*\(/.exec(text);
 if(returningPointer){
  const start=returningPointer[0].length-1,end=closing(text,start);
  const after=text.slice(end+1).trimStart();if(after[0]!==')')throw new Error('Malformed callback return type '+text);
  const tail=after.slice(1).trim();
  if(!tail||!['(','['].includes(tail[0])||closing(tail,0)!==tail.length-1)throw new Error('Malformed callback return type '+text);
  return{result:returningPointer[1].trim()+' (*)'+tail,parameters:splitCParameters(text.slice(start+1,end))};
 }
 const pointer=/^([^()]+?)\s*\(\s*\*\s*\)\s*\(/.exec(text);
 const start=pointer?pointer[0].length-1:text.indexOf('(');
 if(start<1)throw new Error('Unknown C function type '+text);
 const end=closing(text,start);if(end!==text.length-1)throw new Error('Malformed C function type '+text);
 const result=pointer?pointer[1].trim():text.slice(0,start).trim();if(!result)throw new Error('Unknown C result type '+text);
 return{result,parameters:splitCParameters(text.slice(start+1,end))};
}
