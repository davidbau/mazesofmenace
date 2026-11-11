import * as core from './thintile.mjs';
import {withCEnvironment} from './scope.js';
const states=new WeakMap();
export function createUtility(m){
 const ptr=p=>Number(p?.address??p??0),p64=p=>BigInt(ptr(p)),view=()=>new DataView(m.HEAPU8.buffer);
 let state=states.get(m);if(!state){state={infile:0,outfile:0,tilecount:0,tilecount_per_file:0,filenum:0,strings:new Map()};states.set(m,state);}
 const literal=s=>{if(typeof s!=='string')return ptr(s);if(state.strings.has(s))return state.strings.get(s);const b=new TextEncoder().encode(s+'\0'),p=Number(m._malloc(BigInt(b.length)));m.HEAPU8.set(b,p);state.strings.set(s,p);return p;};
 const C={TILE_X:Number(m._thin_layout(0)),TILE_Y:Number(m._thin_layout(1)),BUFSZ:Number(m._thin_layout(2)),EXIT_SUCCESS:Number(m._thin_layout(5)),TRUE:1,FALSE:0,pixels:Number(m._thin_storage(0)),comment:Number(m._thin_storage(1)),RDTMODE:Number(m._thin_mode(0)),WRTMODE:Number(m._thin_mode(1)),stderr:Number(m._thin_stderr()),
 bytesLocal:n=>m.stackAlloc(n),intLocal(){const p=m.stackAlloc(4);return{address:p,get value(){return view().getInt32(p,true);},set value(n){view().setInt32(p,Number(n),true);}};},loadChar:p=>view().getInt8(ptr(p)),storeChar(p,n){view().setInt8(ptr(p),n);return n<<24>>24;},
 callLocal(fn,...args){const sp=m.stackSave();try{return fn(...args);}finally{m.stackRestore(sp);}},
 fopen:(p,s)=>Number(m._thin_fopen(BigInt(literal(p)),BigInt(literal(s)))),fclose:p=>m._thin_fclose(p64(p)),fputc:(c,p)=>m._thin_fputc(c|0,p64(p)),
 fscanf:(f,s,...args)=>m['_thin_scan'+args.length](p64(f),BigInt(literal(s)),...args.map(p64)),
 Fprintf:(f,s,...args)=>args.length===4?m._thin_print4(p64(f),BigInt(literal(s)),...args.map(n=>n|0)):args.length===1?m._thin_printp(p64(f),BigInt(literal(s)),BigInt(literal(args[0]))):m._thin_print0(p64(f),BigInt(literal(s))),
 printf:(s,n,...args)=>args.length?m._thin_printf2(BigInt(literal(s)),n|0,BigInt(literal(args[0]))):m._thin_printf1(BigInt(literal(s)),n|0),
 Sprintf:(out,s,n,p)=>m._thin_sprintf(p64(out),BigInt(literal(s)),n|0,p64(p)),exit:n=>m._thin_exit(n|0)};
 if(Number(m._thin_layout(3))!==8||Number(m._thin_layout(4))!==4)throw Error('Review native pointer/int widths');
 for(const k of ['infile','outfile','tilecount','tilecount_per_file','filenum'])Object.defineProperty(C,k,{get:()=>state[k],set:v=>{state[k]=k==='infile'||k==='outfile'?ptr(v):v|0;}});
 return{C,invoke(name,...args){const sp=m.stackSave();try{return withCEnvironment(C,core[name],...args);}finally{m.stackRestore(sp);}}};
}
