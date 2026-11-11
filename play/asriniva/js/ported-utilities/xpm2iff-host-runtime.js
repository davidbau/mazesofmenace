import {createXpm2iff} from './xpm2iff-host.js';
import {readFileSync} from 'node:fs';
const literals=JSON.parse(readFileSync(new URL('../../nethack-c/wasm/utilities/xpm2iff-host/literals.json',import.meta.url)));
export function install(m) {
 const exact=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||BigInt(n)!==BigInt(v))throw Error('utility pointer exceeds exact JS address range');return n;};
 const ptr=v=>BigInt(v),view=()=>new DataView(m.HEAPU8.buffer),address=i=>exact(m._probe_global(i));
 const expected=[8n,16n,8n,0n,4n,8n,12n,0n,1n,2n,3n,4n];for(let i=0;i<expected.length;i++)if(m._probe_layout(i)!==expected[i])throw Error('actual C layout mismatch at '+i);
 const S={
  u8:p=>m.HEAPU8[exact(p)],put8:(p,v)=>{m.HEAPU8[exact(p)]=v;},
  i32:p=>view().getInt32(exact(p),true),u32:p=>view().getUint32(exact(p),true),put32:(p,v)=>view().setUint32(exact(p),v,true),
  pointer:p=>exact(view().getBigUint64(exact(p),true)),putPointer:(p,v)=>view().setBigUint64(exact(p),BigInt.asUintN(64,BigInt(v)),true),
  stackSave:()=>m.stackSave(),stackRestore:n=>m.stackRestore(n),
  local:n=>exact(m.stackAlloc(n)),lit:s=>{const i=literals.indexOf(s);if(i<0)throw Error('literal absent from unchanged C source: '+s);return exact(m._probe_literal(i));},
  fopen:(a,b)=>exact(m._t_fopen(ptr(a),ptr(b))),fclose:a=>m._t_fclose(ptr(a)),fgets:(a,b,c)=>exact(m._t_fgets(ptr(a),b,ptr(c))),
  fputc:(a,b)=>m._t_fputc(a,ptr(b)),fwrite:(a,b,c,d)=>m._t_fwrite(ptr(a),BigInt(b),BigInt(c),ptr(d)),
  scan_dimensions:(a,b,c,d,e,f)=>m._t_scan_dimensions(ptr(a),ptr(b),ptr(c),ptr(d),ptr(e),ptr(f)),
  scan_color:(a,b,c,d,e,f)=>m._t_scan_color(ptr(a),ptr(b),ptr(c),ptr(d),ptr(e),ptr(f)),
  fprintf_p:(a,b,c)=>m._t_fprintf_p(ptr(a),ptr(b),ptr(c)),fprintf_ii:(a,b,c,d)=>m._t_fprintf_ii(ptr(a),ptr(b),c,d),
  printf5:(a,b,c,d,e,f)=>m._t_printf5(ptr(a),b,c,d,e,f>>>0),isspace:a=>m._t_isspace(a),stderr:()=>exact(m._t_stderr()),
  malloc:a=>exact(m._t_malloc(BigInt(a))),calloc:(a,b)=>exact(m._t_calloc(BigInt(a),BigInt(b))),free:a=>m._t_free(ptr(a)),memset:(a,b,c)=>m._t_memset(ptr(a),b,BigInt(c)),perror:a=>m._t_perror(ptr(a)),
  screenAddress:address(0),xbuf:address(3),XpmScreen:{},ttable:[],globals:{}
 };
 for(const[i,k]of['Width','Height','Colors','BytesPerRow'].entries())Object.defineProperty(S.XpmScreen,k,{get:()=>S.i32(S.screenAddress+4*i),set:v=>view().setInt32(S.screenAddress+4*i,v,true)});
 for(let i=0;i<256;i++){const entry={};for(const[j,k]of['flag','r','g','b','slot'].entries()){const at=address(1)+i*8+(j===4?4:j);Object.defineProperty(entry,k,{get:()=>j===4?S.i32(at):S.u8(at),set:v=>j===4?view().setInt32(at,v,true):S.put8(at,v)});}S.ttable.push(entry);}
 for(const[k,i]of Object.entries({xpmfh:2,planes:4,iff_out:5}))Object.defineProperty(S.globals,k,{get:()=>S.pointer(address(i)),set:v=>S.putPointer(address(i),v)});
 const functions=createXpm2iff(S),counts={};
 m.xpm2iff=(name,args)=>{const stack=m.stackSave();counts[name]=(counts[name]??0)+1;try{return functions[name](...args.map(v=>typeof v==='bigint'?exact(v):v));}finally{m.stackRestore(stack);}};
 return {S,functions,counts};
}
