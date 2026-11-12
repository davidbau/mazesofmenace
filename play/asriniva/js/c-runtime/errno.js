// Pinned musl C-locale strerror data; source provenance is in the JSON profile.
// Messages have static lifetime within one JS-owned memory instance.
import profile from './errno-messages.json' with {type:'json'};
export function createErrnoStrings(memory){
 const strings=new Map();
 return {strerror(code){const text=profile.messages[String(Number(code)|0)]??profile.messages['0'];if(!strings.has(text))strings.set(text,memory.cstring(text));return strings.get(text);}};
}
