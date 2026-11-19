// Pinned musl C-locale strerror data; source provenance is in the JSON profile.
// Messages have static lifetime within one JS-owned memory instance.
import profile from './errno-messages.json' with {type:'json'};
// Keep the runtime's errno numbers and translate only the displayed text.
const darwinMessages={
 0:'Undefined error: 0',
 29:'Input/output error',
 33:'Too many open files',
 37:'File name too long',
 48:'Cannot allocate memory',
 58:'Operation not supported',
 59:'Inappropriate ioctl for device',
 68:'Result too large',
 70:'Illegal seek',
};
export function createErrnoStrings(memory,{darwin=false}={}){
 const strings=new Map();
 return {strerror(code){code=Number(code)|0;const text=(darwin?darwinMessages[code]:undefined)??profile.messages[code]??profile.messages['0'];if(!strings.has(text))strings.set(text,memory.cstring(text));return strings.get(text);}};
}
