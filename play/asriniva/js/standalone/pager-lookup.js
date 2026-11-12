// Shared original PAGER inspection/help/lookup bridge; no policy or text is copied.
import abi from './special-interactions-abi.json' with {type:'json'};
import {createPagerBridge} from '../ported/pager-runtime.js';
import publicFunctions from './public-functions.json' with {type:'json'};
import nativeAbi from './pager-target-abi.json' with {type:'json'};
import {pagerNativeGet,pagerNativeSet,pagerNativeAddress,pagerNativeHero,pagerNativeDep} from './pager-target-header-functions.js';
import {createRecordViews} from './record-views.js';
const owners=new WeakMap();
export function enablePagerLookup(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services:S,memory,ctypes,transport}=environment,meta=abi.pagerLookup.meta,L=layouts.pager,address=environment.address;
 for(const[k,v]of Object.entries(abi.pagerLookup.layout))if(L[k]!==v)throw new Error('Review PAGER lookup layout '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const call=(n,...a)=>{const types=meta.dependencies[n]?.args??[];a=a.map((v,i)=>{const t=types[i]?.desugaredQualType??types[i]?.qualType??'';return typeof v==='string'?text(v):t.includes('*')?address(v):v?.address??v;});const out=resolve(n)(...a);return typeof out==='string'?text(out):out?.address??out;};
 const str=p=>typeof p==='string'?p:memory.readString(address(p));
 const packet=(format,p,scan=false)=>{const values=[],regex=/%(?:[-+ #0]*)(?:\d+)?(?:\.\d+)?([hljztL]*)([diuoxXcsp%])/g;for(const m of str(format).matchAll(regex)){if(m[2]==='%')continue;const at=address(p)+8*values.length;values.push(scan||'sp'.includes(m[2])?Number(memory.view.getBigUint64(at,true)):m[1]?memory.view.getBigInt64(at,true):memory.view.getInt32(at,true));}return values;};
 const storage=Object.fromEntries(Object.entries(meta.statics).map(([n,size])=>[n,environment.allocateGlobal('pager.'+n,size)])),publicAt=environment.allocateGlobal('pager.what_is_a_location',30);
 const views=createRecordViews(environment),G={};
 for(const[n,t]of Object.entries(nativeAbi.roots))Object.defineProperty(G,n,{get:()=>t.endsWith('[]')?{address:environment.requireGlobal(n)}:views.value(t,environment.requireGlobal(n)),set:v=>ctypes.store(t,environment.requireGlobal(n),v)});
 const signature=t=>{const m=t.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!m)throw new Error('Unknown PAGER indirect prototype '+t);const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':ctypes.size(t)===8?'j':'i';};return[m[1],...m[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');};
 const N=new Proxy({literal:text,index:(t,p,i)=>views.value(t,address(p)+Number(i)*ctypes.size(t)),deref:(t,p)=>views.value(t,address(p)),indirect:(t,p,...args)=>environment.functions.indirect(address(p),signature(t),...args.map(v=>v?.address??v))},{get:(o,k)=>Reflect.has(o,k)?o[k]:typeof k==='string'?(...a)=>call(k,...a):undefined});
 const nativeArg=(t,v)=>{const c=ctypes.canonical(t),p=c.replace(/\s*\*$/,'');try{ctypes.record(c.includes('*')?p:c);return views.record(c.includes('*')?p:c,address(v));}catch(e){if(!e.message.startsWith('Unmeasured C record')&&!e.message.startsWith('Unknown C record'))throw e;if(c.includes('*'))return v;if(c==='char'||c==='signed char')return transport.char(v);if(c==='unsigned char')return transport.uchar(v);if(c==='short')return transport.short(v);if(c==='unsigned short')return transport.ushort(v);if(c==='unsigned int')return transport.uint(v);if(ctypes.size(c)===8)return c.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);}};
 const locate=(type,p,path)=>{for(const k of path.split('.')){const f=ctypes.locate(type,address(p),k);p=f.at;type=f.field.record??f.field.ctype.replace(new RegExp('\\b'+k+'$'),'').trim();}return address(p);};
 const recordField=(kind,i,p)=>{const entry=Object.values(meta.records)[kind],key=entry?.[1][i];if(!key)throw new Error('Unknown PAGER record field '+kind+':'+i);return{object:views.record(entry[0],address(p)),key};};
 const locals={moduleKey:environment,heap:()=>memory.HEAPU8,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,literal:v=>BigInt(text(v)),
  staticAddress:i=>storage[Object.keys(meta.statics)[i]],publicAddress:()=>publicAt,
  copy:(a,b,n)=>memory.memmove(address(a),address(b),Number(n)),
  recordGet:(kind,i,p)=>{const r=recordField(kind,i,p),v=r.object[r.key];if(v===undefined)throw new Error('Unmapped PAGER record field '+r.key);return BigInt(v?.address??v);},
  recordSet:(kind,i,p,v)=>{const r=recordField(kind,i,p);if(!(r.key in r.object))throw new Error('Unmapped PAGER record field '+r.key);r.object[r.key]=v;},
  array:(i,x,y)=>{const name=Object.keys(meta.arrays)[i],kind=meta.arraytypes[i];let at;if(name==='levl')at=locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level.locations');else if(name.includes('.')){const [root,...path]=name.split('.'),type=root.startsWith('sv')?'struct instance_globals_saved_'+root.slice(2):'struct instance_globals_'+root.slice(1);at=locate(type,environment.requireGlobal(root),path.join('.'));}else at=environment.requireGlobal(name);const size=kind==='nhsym'||kind==='char'?1:ctypes.size(meta.records[kind][0]);return at+(name==='levl'||name==='svl.lastseentyp'?x*L.ROWNO+y:x)*size;},
  functionPointer:i=>{const name=meta.callbacks[i],proto=publicFunctions.functions[name]??meta.functions[name]?.type.qualType;if(!proto)throw new Error('Unconnected PAGER callback '+name);const match=proto.match(/^(.+?)\s*\((.*)\)$/),code=t=>{t=ctypes.canonical(t.trim());return t.includes('*')?'p':t==='void'?'v':ctypes.size(t)===8?'j':'i';},signature=[match[1],...match[2].split(',').filter(t=>t.trim()!=='void')].map(code).join('');return environment.hasFunction(name)?environment.functionPointer(name,signature):environment.functionPointer('pager::'+name,signature,(...args)=>callLookup(name,...args));},
  callHelp:p=>environment.functions.indirect(address(p),'v'),
  chararray:(kind,p,i)=>{if(kind!==1&&kind!==9)throw new Error('Unknown PAGER char-array field '+kind);const[type,key]=kind===1?['struct permonst','pmnames']:['struct engr','engr_txt'];return address(views.record(type,address(p))[key][i]);},
  dlb_fopen:(name,mode)=>S.fopen(text(name),text(mode)),dlb_fclose:p=>S.fclose(address(p)),dlb_fgets:(out,size,p)=>S.fgets(address(out),size,address(p)),dlb_fseek:(p,n,how)=>S.fseek(address(p),n,how),
  sprintf:(out,f,p)=>S.sprintf(address(out),text(f),...packet(f,p)),sscanfRaw:(input,f,p)=>S.sscanf(text(input),text(f),...packet(f,p,true)),
  plineRaw:(f,p)=>call('pline',text(f),...packet(f,p)),impossibleRaw:(f,p)=>call('impossible',text(f),...packet(f,p)),
  Strcpy:(out,s)=>S.strcpy(address(out),text(s)),Strcat:(out,s)=>S.strcat(address(out),text(s)),
  y_n:q=>resolve('yn_function')(text(q),environment.requireGlobal('ynchars'),110,1),
  get:i=>{if(!pagerNativeGet[i])throw new Error('Unknown PAGER native global '+i);return pagerNativeGet[i](G,N);},
  set:(i,v)=>{if(!pagerNativeSet[i])throw new Error('Unknown PAGER native setter '+i);return pagerNativeSet[i](G,N,BigInt(v));},
  address:i=>{if(!pagerNativeAddress[i])throw new Error('Unknown PAGER native address '+i);return address(pagerNativeAddress[i](G,N));},
  hero:i=>{if(!pagerNativeHero[i])throw new Error('Unknown PAGER native hero macro '+i);return pagerNativeHero[i](G,N);},
  m_at:(x,y)=>ctypes.load('struct monst *',locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level.monsters')+(x*L.ROWNO+y)*8),
 };
 for(const[n,fn]of Object.entries(pagerNativeDep))locals[n]=(...args)=>fn(G,N,args.map((v,i)=>nativeArg(nativeAbi.helperParameters[n][i],v)));
 for(const[name,value]of Object.entries(abi.pagerLookup.strings))locals['string_'+name]=()=>text(value);
 const roots=new Set([...meta.globalfields,...Object.keys(meta.addresses),...Object.keys(meta.arrays)].filter(n=>n.includes('.')).map(n=>n.split('.')[0]));
 const local=new Proxy(locals,{get:(o,k)=>Reflect.has(o,k)?o[k]:roots.has(k)?undefined:typeof k==='string'?(...args)=>call(k,...args):undefined});
 const bridge=createPagerBridge(L),callLookup=(name,...args)=>transport.scoped(()=>bridge(local,name,...args));
 const names=[...new Set(['checkfile',...Object.keys(meta.functions).filter(n=>Object.hasOwn(publicFunctions.functions,n))])].filter(n=>!environment.hasFunction(n));environment.register('special-pager-lookup',Object.fromEntries(names.map(n=>[n,(...args)=>callLookup(n,...args)])));
 const owner={call:callLookup,services:local,exports:names,limitation:'Shared original PAGER lookup/inspection/help source context; only explicitly C-compared ordinary paths accepted. Missing foreign owners fail explicitly; other variants require separate proof.'};owners.set(environment,owner);return owner;
}
