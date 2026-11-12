// Caller-injected environment variables on JS-owned storage. The shared base
// keeps its historical clock input handling; C getenv sees every injected key.
export function createEnvironmentInputs(base,initial={}){
 const {memory}=base,variables=new Map();
 function store(name,value){const previous=variables.get(name);if(value===null||value===undefined)variables.delete(name);else variables.set(name,memory.cstring(String(value)));if(previous)memory.free(previous);}
 for(const [name,value]of Object.entries(initial))store(name,value);
 return {
  getenv:name=>variables.get(typeof name==='string'?name:memory.readString(Number(name)))??0,
  setEnvironment(name,value){base.setEnvironment(name,value);store(name,value);},
 };
}
