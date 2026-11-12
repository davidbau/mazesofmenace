// Unchanged OPTIONS adapter owns its initializer tables and option policies.
import abi from './options-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import {createCTypes} from './c-types.js';
import * as options from '../ported/options.js';
import {callOptions} from '../nethack/bindings/options.js';
export function enableOptions(environment,layouts){
 const {services,memory}=environment,L=layouts.options,S=abi.schema;
 const ctypes=createCTypes(memory,{...records,records:{...records.records,...abi.records},enums:{...records.enums,...abi.enums}},environment.bitfields);
 function size(type){type=type.replace(/\b(const|volatile)\b/g,'').replace(/\s+/g,' ').trim();const a=type.match(/^(.*?)\[(\d+)\](.*)$/);if(a)return Number(a[2])*size(a[1]+a[3]);if(type.includes('*'))return 8;return L['size:'+type]??ctypes.size(type);}
 for(const [name,bytes]of [['wcolors_opt',16],['options_set_window_colors_flag',4]])environment.allocateGlobal(name,bytes);
 const storage=S.statics.map(row=>environment.allocateGlobal('options.'+row.name,size(row.type)));
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const kinds=Object.keys(S.schema),field=(kind,index)=>{const row=S.schema[kinds[kind]],f=row?.fields[index];if(!f)throw new Error('Unknown OPTIONS field');return {type:row.ctype,f};};
 const code=type=>{type=ctypes.canonical(type);return type.includes('*')?'p':type==='void'?'v':ctypes.size(type)===8?'j':'i';};
 function pointer(name){const proto=S.functionTypes[name]??publicFunctions.functions[name],m=proto?.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown OPTIONS callback '+name);const signature=[m[1],...m[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');return environment.functionPointer(S.private.includes(name)?'options::'+name:name,signature,typeof options[name]==='function'?((...args)=>callOptions(local,L,name,...args)):undefined);}
 local.__isspace=c=>services.isspace(c);
 local.Strlen_=p=>environment.strutil('Strlen_',typeof p==='string'?services.literal(p):environment.address(p));
 local.strlen=p=>environment.transport.ulong(services.strlen(typeof p==='string'?services.literal(p):environment.address(p)));
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,layout:i=>{const key=S.layoutKeys[i];if(!key||L[key]===undefined)throw new Error('Missing OPTIONS layout '+key);return BigInt(L[key]);},
  storage:i=>storage[i],global:i=>environment.requireGlobal(S.globals[i].name),functionAddress:i=>pointer(S.functionAddresses[i]),
  address:(kind,p,index)=>{const e=field(kind,index);return ctypes.locate(e.type,environment.address(p),e.f.name).at;},
  read:(kind,p,index)=>{const e=field(kind,index);return BigInt(ctypes.getField(e.type,environment.address(p),e.f.name,e.f.canonical));},
  write:(kind,p,index,value)=>{const e=field(kind,index);return ctypes.setField(e.type,environment.address(p),e.f.name,e.f.canonical,value);},
 });
 // Existing adapter dispatches its source variadic/callback sites by index.
 for(const row of S.variadics)local['var'+row.site]=(...args)=>(typeof services[row.function]==='function'?services[row.function]:environment.resolve(row.function))(...args);
 for(const row of S.callbacks)local['cb'+row.site]=(fn,...args)=>environment.functions.indirect(fn,[row.ret,...row.types].map(code).join(''),...args);
 const context=callOptions(local,L,'environment');
 const names=S.names.filter(name=>!S.private.includes(name)&&typeof options[name]==='function'&&!environment.hasFunction(name));
 environment.register('options',Object.fromEntries(names.map(name=>[name,(...args)=>callOptions(local,L,name,...args)])));
 return {context,services:local,storage,ctypes,pointer,limitation:'OPTIONS source data and adapter connected; callback and full option/config lifecycle verification pending.'};
}
