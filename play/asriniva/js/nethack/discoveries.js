// Complete O_INIT public transport on its existing initialized source adapter.
import abi from './discoveries-abi.json' with {type:'json'};
import * as source from '../ported/o_init.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableDiscoveries(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services:S,ctypes,transport}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.o_init[k]!==v)throw Error('Review O_INIT ABI '+k);
 const entry=environment.start('object-state'),context=entry.environment,local=Object.getPrototypeOf(context),text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.abiType(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long')return transport.long(v);if(t==='unsigned long'||t==='size_t')return transport.ulong(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char'||t==='uchar')return transport.uchar(v);if(t==='short'||t==='coordxy'||t==='xint16')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int'||t==='unsigned')return transport.uint(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Review O_INIT prototype '+p);return{ret:m[1],args:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 for(const[n,p]of Object.entries(abi.dependencies))if(!Object.hasOwn(local,n)){const row=prototype(p);local[n]=(...args)=>scalar(row.ret,resolve(n)(...args.map((v,i)=>scalar(row.args[i],v))));}
 const window=(field,sig,...args)=>environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),field,'void *'),sig,...args);
 Object.assign(local,{create_nhwindow:t=>window('win_create_nhwindow','ii',transport.int(t)),clear_nhwindow:w=>window('win_clear_nhwindow','vi',transport.int(w)),start_menu:(w,f)=>window('win_start_menu','vij',transport.int(w),transport.ulong(f)),end_menu:(w,p)=>window('win_end_menu','vip',transport.int(w),text(p)),display_nhwindow:(w,b)=>window('win_display_nhwindow','vii',transport.int(w),transport.char(b)),destroy_nhwindow:w=>window('win_destroy_nhwindow','vi',transport.int(w)),putstr:(w,a,s)=>window('win_putstr','viip',transport.int(w),transport.int(a),text(s)),wait_synch:()=>window('win_wait_synch','v'),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),free:p=>resolve('free')(address(p)),y_n:q=>resolve('yn_function')(text(q),environment.requireGlobal('ynchars'),110,1),strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),
  Strcpy:(a,b)=>resolve('strcpy')(text(a),text(b)),Strcat:(a,b)=>resolve('strcat')(text(a),text(b)),Strlen:p=>transport.uint(resolve('Strlen_')(text(p),text(abi.strlenSite.function),abi.strlenSite.line)),
 });
 for(const n of ['raw_printf','panic','impossible','You','pline'])local[n]=(fmt,...a)=>resolve(n)(text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(out,fmt,...a)=>S.sprintf(text(out),text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.assert=condition=>{if(!condition){const a=abi.assertion;resolve('__assert_fail')(text(a.condition),text(a.file),a.line,text(a.function));}};
 const comparator=environment.functionPointer('o_init::discovered_cmp','ipp',(a,b)=>transport.scoped(()=>withCEnvironment(context,()=>source.discovered_cmp(address(a),address(b)))));
 local.comparatorPointer=()=>comparator;local.qsort=(base,count,size)=>resolve('qsort')(address(base),transport.ulong(count),transport.ulong(size),comparator);
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 environment.extend('object-state',Object.fromEntries(names.map(n=>[n,(...args)=>{const row=prototype(abi.public[n]);return transport.scoped(()=>{const result=withCEnvironment(context,()=>source[n](...args.map((v,i)=>scalar(row.args[i],v))));return scalar(row.ret,result?.address??result);});}])));
 const owner={context,services:local,exports:names,comparator,limitations:'Same initialized source adapter/private discovery data. Only separately C-compared public/UI paths accepted.'};owners.set(environment,owner);return owner;
}
