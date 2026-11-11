// Storage and typed calls for source-schema adapters. No game policy lives here.
import publicFunctions from './public-functions.json' with {type:'json'};
export function enableSchemaPort(environment,name,source,schema,layout,invoke,only){
 const {services,functions}=environment,names=Object.keys(schema.data),globals=Object.keys(schema.foreignGlobals);
 const size=t=>typeof t==='string'?Number(t.slice(1))/8:t.pointer?8:t.record?schema.records[t.record].size:t.array.reduce((n,d)=>n*d,size(t.of));
 const storage=names.map(key=>environment.allocateGlobal(name+'.'+key,size(schema.data[key].type)));
 const local=Object.create(services),call=(key,...args)=>invoke(local,key,...args);
 const resolve=key=>['alloc','re_alloc','dupstr','FITSuint_','FITSint_'].includes(key)?((...args)=>environment.alloc(key,...args)):key==='Strlen_'?((...args)=>environment.strutil(key,...args)):typeof services[key]==='function'?services[key]:environment.resolve(key);
 const code=t=>typeof t==='object'||t.includes('*')?'p':t==='void'?'v':/^f\d+$/.test(t)||/\b(float|double)\b/.test(t)?'d':/64|\blong\b/.test(t)?'j':'i';
 const signature=(result,args)=>[result,...args].map(code).join('');
 function native(type,value){
  if(type==='void')return undefined;
  if(typeof type==='object')return typeof value==='string'?services.literal(value):environment.address(value);
  if(type[0]==='f')return type==='f32'?Math.fround(Number(value)):Number(value);
  const bits=Number(type.slice(1)),n=BigInt(typeof value==='boolean'?Number(value):value);
  return bits===64?(type[0]==='i'?BigInt.asIntN(bits,n):BigInt.asUintN(bits,n)):Number(type[0]==='i'?BigInt.asIntN(bits,n):BigInt.asUintN(bits,n));
 }
 function pointer(key){
  const owned=schema.functions.find(f=>f.name===key),foreign=schema.callSites.find(f=>f.name===key);
  let sig;if(owned)sig=signature(owned.returnType,owned.parameters.map(p=>p.type));else if(foreign)sig=signature(foreign.return,foreign.args);else{
   const prototype=publicFunctions.functions[key],match=prototype?.match(/^(.+?)\s*\((.*)\)$/);
   if(!match)throw new Error('Unknown '+name+' callback prototype '+key);
   sig=signature(environment.ctypes.canonical(match[1]),match[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void').map(environment.ctypes.canonical));
  }
  return environment.functionPointer(owned&&!Object.hasOwn(publicFunctions.functions,key)?name+'::'+key:key,sig,owned?((...args)=>call(key,...args)):undefined);
 }
 Object.assign(local,{layout,moduleKey:environment,global:i=>{if(!globals[i])throw new Error('Unknown '+name+' global '+i);return environment.requireGlobal(globals[i]);},storage:i=>{if(storage[i]===undefined)throw new Error('Unknown '+name+' storage '+i);return storage[i];},functionPointer:pointer,
  api:(site,...args)=>{const row=schema.callSites[site];if(!row?.name)throw new Error('Unknown '+name+' direct call '+site);return native(row.return,resolve(row.name)(...args));},
  indirect:(site,p,...args)=>{const row=schema.callSites[site];if(!row?.indirect)throw new Error('Unknown '+name+' indirect call '+site);return native(row.return,functions.indirect(p,signature(row.return,row.args),...args));},
 });
 for(const key of only)if(typeof source[key]!=='function')throw new Error('Unknown '+name+' export '+key);
 environment.register(name,Object.fromEntries(only.map(key=>[key,(...args)=>call(key,...args)])));
 environment.deferFunctions(name,Object.fromEntries(schema.functions.filter(row=>Object.hasOwn(publicFunctions.functions,row.name)&&!only.includes(row.name)).map(({name:key})=>[key,(...args)=>call(key,...args)])));
 return {services:local,storage};
}
