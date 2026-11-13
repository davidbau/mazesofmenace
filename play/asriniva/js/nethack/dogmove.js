// One original DOGMOVE factory, shared game bytes and source-private backing.
import abi from './dogmove-abi.json' with{type:'json'};
import * as source from '../ported/dogmove.js';
import{createDogmoveEnvironment}from'./bindings/dogmove.js';
import{withCEnvironment}from'../c-runtime/context.js';
export function enableDogmove(environment,layouts){
 const{services,memory,ctypes,transport,functions}=environment,L=layouts.dogmove,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review DOGMOVE ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const local=Object.create(services),schemas=Object.values(abi.schemas),storage=[environment.allocateGlobal('dogmove.dummy',ctypes.size('struct obj')),environment.allocateGlobal('dogmove.nofetch',4)];
 const field=(k,p,i)=>{const row=schemas[k],f=row?.fields[i];if(!f)throw new Error('Unknown DOGMOVE field '+k+':'+i);return{row,f,at:ctypes.locate(row.ctype,address(p),f.name).at};};
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t.includes('*'))return text(v);if(t==='signed char'||t==='char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 for(const[name,target]of Object.entries(abi.calls)){
  const p=abi.dependencies[target];if(!p)throw new Error('Missing DOGMOVE dependency type '+target);const m=p.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  local[name]=(...args)=>{const v=resolve(target)(...args.map((v,i)=>scalar(types[i],v)));return ctypes.canonical(m[1])==='void'?undefined:scalar(m[1],v);};
 }
 let context;
 const prepare=(name,args)=>args.map((v,i)=>{const t=abi.types[name]?.parameters[i]?.canonical;if(!t)throw new Error('Unknown DOGMOVE argument '+name+':'+i);const m=t.match(/^struct (\w+) \*$/);if(m)return context.view(m[1],address(v));if(name==='wantdoor'&&i===2)return address(v);return scalar(t,v);});
 const invoke=(name,args)=>transport.scoped(()=>withCEnvironment(context,()=>{const v=source[name](...prepare(name,args));return v?.address??v;}));
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(i<abi.globals.length)return environment.requireGlobal(abi.globals[i].name);if(storage[i-abi.globals.length]===undefined)throw new Error('Unknown DOGMOVE storage '+i);return storage[i-abi.globals.length];},
  read:(k,p,i)=>{const{row,f,at}=field(k,p,i);return f.d.s||f.d.a?BigInt(at):BigInt(ctypes.getField(row.ctype,address(p),f.name,f.ctype));},
  write:(k,p,i,v)=>{const{row,f}=field(k,p,i);if(f.const)throw new Error('Write to const DOGMOVE field '+f.name);ctypes.setField(row.ctype,address(p),f.name,f.ctype,v);},address:(k,p,i)=>field(k,p,i).at,
  rngCaller:i=>{const r=abi.rngSites[i];if(!r)throw new Error('Unknown DOGMOVE RNG site '+i);if(services.rng_log_enabled())services.rng_log_set_caller(text('dogmove.c'),r.line,text(r.function));},rn2Value:n=>resolve('rn2')(transport.int(n)),rndValue:n=>resolve('rnd')(transport.int(n)),
  donamePointer:()=>environment.functionPointer('doname','pp'),callbackPointer:()=>environment.functionPointer('dogmove::wantdoor','viip',(x,y,p)=>invoke('wantdoor',[x,y,p])),
  do_clear_area:(x,y,r,cb,p)=>resolve('do_clear_area')(transport.short(x),transport.short(y),transport.int(r),address(cb),address(p)),
  display_nhwindow:(win,block)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_display_nhwindow').at;return functions.indirect(memory.view.getBigUint64(at,true),'vii',transport.int(win),transport.char(block));},
  assert:v=>{if(!v){const r=abi.assertion;return resolve('__assert_fail')(text(r.condition),text('dogmove.c'),r.line,text(r.function));}},
  pline:(fmt,...args)=>{if(args.length===2)return resolve('pline')(text(fmt),...args.map(text));if(args.length===3)return resolve('pline')(text(fmt),text(args[0]),transport.long(args[1]),text(args[2]));throw new Error('Review DOGMOVE pline signature');},
  pline_mon:(mon,fmt,...args)=>{if(args.length<1||args.length>4)throw new Error('Review DOGMOVE pline_mon signature');return resolve('pline_mon')(address(mon),text(fmt),...args.map(text));},
  pline_xy:(x,y,fmt,a,b)=>resolve('pline_xy')(transport.short(x),transport.short(y),text(fmt),text(a),text(b)),
  Your:fmt=>resolve('Your')(text('%s'),text(fmt)),You_feel:(fmt,a)=>resolve('You_feel')(text(fmt),text(a)),
  You:(fmt,...args)=>{if(args.length!==2&&args.length!==4)throw new Error('Review DOGMOVE You signature');return resolve('You')(text(fmt),...args.map(text));},
  impossible:(fmt,...a)=>{if(!a.length)return resolve('impossible')(text('%s'),text(fmt));if(a.length===7)return resolve('impossible')(text(fmt),transport.int(a[0]),transport.int(a[1]),transport.long(a[2]),transport.long(a[3]),transport.int(a[4]),transport.uint(a[5]),transport.uint(a[6]));throw new Error('Review DOGMOVE impossible signature');},
 });
 for(const r of abi.globals)Object.defineProperty(local,r.name,{value:undefined,writable:true,configurable:true});
 context=createDogmoveEnvironment(local,L,source);
 environment.register('dogmove',Object.fromEntries(abi.public.map(n=>[n,(...args)=>invoke(n,args)])),local);
 return{context,services:local,storage,exports:abi.public,call:(name,...args)=>invoke(name,args),limitation:'Whole original DOGMOVE context and private storage connected; reached movement, eating, combat and world effects require real foreign owners and focused C acceptance.'};
}
