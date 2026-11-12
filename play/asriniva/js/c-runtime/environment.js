// Per-runtime C environment values. Storage/copying is supplied by the owner;
// no host process environment is read or changed.
export function createEnvironmentServices(memory,{get,set},libc){
 const text=value=>typeof value==='string'?value:memory.readString(Number(value));
 const valid=name=>name.length>0&&!name.includes('='),invalid=()=>{libc.errno=28;return -1;};
 return {
  getenv:name=>{name=text(name);return valid(name)?get(name)||0:0;},
  setenv(name,value,overwrite){name=text(name);if(!valid(name))return invalid();if(overwrite||!get(name))set(name,text(value));return 0;},
  unsetenv(name){name=text(name);if(!valid(name))return invalid();set(name,null);return 0;},
 };
}
