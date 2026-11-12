import * as core from './tile2bmp.mjs';
import {withCEnvironment} from '../../c-runtime/context.js';
const states=new WeakMap();
export function createUtility(m){
 const names=['bmpSize','bmfhSize','bmihSize','rgbSize','pixelSize','pointerSize','intSize','bmpnameSize','TILE_X','TILE_Y','RGBQUAD_COUNT','CM_RED','CM_GREEN','CM_BLUE','MAXCOLORMAPSIZE','EXIT_SUCCESS','EXIT_FAILURE','bmfh','bmih','bmaColors','packtile','bfType','bfSize','bfReserved1','bfReserved2','bfOffBits','biSize','biWidth','biHeight','biPlanes','biBitCount','biCompression','biSizeImage','biXPelsPerMeter','biYPelsPerMeter','biClrUsed','biClrImportant','rgbBlue','rgbGreen','rgbRed','rgbReserved','r','g','b'];
 const L=Object.fromEntries(names.map((s,i)=>[s,Number(m._tb_layout(i))]));if(L.pointerSize!==8||L.intSize!==4||L.TILE_X!==16||L.TILE_Y!==16)throw Error('Review configured utility ABI');
 const ptr=p=>Number(p?.address??p??0),p64=p=>BigInt(ptr(p)),size=n=>BigInt.asUintN(64,BigInt(n)),int=n=>typeof n==='bigint'?Number(BigInt.asIntN(32,n)):Number(n)|0,view=()=>new DataView(m.HEAPU8.buffer),bmp=Number(m._tb_storage(0));
 let state=states.get(m);if(!state){state={strings:new Map(),tilecnt:[0,0,0],tilefileset:0,tiles_counted:0,max_x:0,max_y:0,magictileno:0,bmpsize:0,num_colors:0,max_tiles_in_row:40,tiles_in_row:0,filenum:0,initflag:0,pass:0,yoffset:0,xoffset:0,newbmp:0,fp:0};states.set(m,state);}
 const literal=s=>{if(typeof s!=='string')return ptr(s);if(state.strings.has(s))return state.strings.get(s);const b=new TextEncoder().encode(s+'\0'),p=Number(m._malloc(BigInt(b.length)));m.HEAPU8.set(b,p);state.strings.set(s,p);return p;};
 const indexed=(p,stride,make)=>new Proxy({address:p},{get(o,k){if(typeof k==='string'&&/^\d+$/.test(k))return make(p+Number(k)*stride);return Reflect.get(o,k);}});
 function record(p,fields){const o={address:p};for(const[k,type]of fields)Object.defineProperty(o,k,{get:()=>view()['get'+type](p+L[k],true),set:n=>view()['set'+type](p+L[k],Number(n),true)});return o;}
 const pixel=p=>record(p,[['r','Uint8'],['g','Uint8'],['b','Uint8']]);
 const colorBase=Number(m._tb_storage(3));
 const C={int,short:n=>int(n)<<16>>16,uchar:n=>int(n)&255,size_t:size,div:(a,b)=>Math.trunc(a/b),BI_RGB:0,
 bmfhSize:BigInt(L.bmfhSize),bmihSize:BigInt(L.bmihSize),bmpSize:BigInt(L.bmpSize),rgbSize:BigInt(L.rgbSize),bmpnameSize:BigInt(L.bmpnameSize),
 ...Object.fromEntries(['TILE_X','TILE_Y','RGBQUAD_COUNT','CM_RED','CM_GREEN','CM_BLUE','EXIT_SUCCESS','EXIT_FAILURE'].map(k=>[k,L[k]])),stderr:Number(m._tb_stderr()),RDTMODE:Number(m._tb_mode()),bmpname:Number(m._tb_storage(2)),tilecnt:state.tilecnt,
 bmfh:record(bmp+L.bmfh,[['bfType','Uint16'],['bfSize','Uint32'],['bfReserved1','Uint16'],['bfReserved2','Uint16'],['bfOffBits','Uint32']]),
 bmih:record(bmp+L.bmih,[['biSize','Uint32'],['biWidth','Int32'],['biHeight','Int32'],['biPlanes','Uint16'],['biBitCount','Uint16'],['biCompression','Uint32'],['biSizeImage','Uint32'],['biXPelsPerMeter','Int32'],['biYPelsPerMeter','Int32'],['biClrUsed','Uint32'],['biClrImportant','Uint32']]),
 bmaColors:indexed(bmp+L.bmaColors,L.rgbSize,p=>record(p,[['rgbBlue','Uint8'],['rgbGreen','Uint8'],['rgbRed','Uint8'],['rgbReserved','Uint8']])),
 tilepixels:indexed(Number(m._tb_storage(1)),L.TILE_X*L.pixelSize,p=>indexed(p,L.pixelSize,pixel)),
 ColorMap:indexed(colorBase,L.MAXCOLORMAPSIZE,p=>indexed(p,1,at=>view().getUint8(at))),
 bytesLocal(n,zero=false){const p=m.stackAlloc(n);if(zero)m.HEAPU8.fill(0,p,p+n);return p;},storeByte:(p,n)=>{view().setUint8(ptr(p),n);return int(n)&255;},
 copyBmp:p=>m._memcpy(p64(p),BigInt(bmp),BigInt(L.bmpSize)),packtile:p=>ptr(p)+L.packtile,
 callLocal(fn,...args){const sp=m.stackSave();try{return fn(...args);}finally{m.stackRestore(sp);}},
 strlen:p=>m._strlen(BigInt(literal(p))),strcpy:(a,b)=>m._strcpy(p64(a),BigInt(literal(b))),Strcpy:(a,b)=>m._strcpy(p64(a),BigInt(literal(b))),Strcat:(a,b)=>m._strcat(p64(a),BigInt(literal(b))),strncmp:(a,b,n)=>m._strncmp(BigInt(literal(a)),BigInt(literal(b)),size(n)),
 malloc:n=>Number(m._malloc(size(n))),free:p=>m._free(p64(p)),fopen:(p,s)=>Number(m._tb_fopen(BigInt(literal(p)),BigInt(literal(s)))),fclose:p=>m._tb_fclose(p64(p)),fgets:(p,n,f)=>Number(m._tb_fgets(p64(p),n|0,p64(f))),fwrite:(p,n,s,f)=>m._tb_fwrite(p64(p),size(n),size(s),p64(f)),
 objects_globals_init:()=>m._objects_globals_init(),monst_globals_init:()=>m._monst_globals_init(),fopen_text_file:(p,s)=>m._fopen_text_file(BigInt(literal(p)),BigInt(literal(s))),read_text_tile:p=>m._read_text_tile(p64(p)),fclose_text_file:()=>m._fclose_text_file(),set_grayscale:n=>m._set_grayscale(Number(n)|0),
 Fprintf(f,s,...a){const fmt=BigInt(literal(s));if(a.length===0)return m._tb_print0(p64(f),fmt);if(a.length===1)return s.includes('%s')?m._tb_printp(p64(f),fmt,BigInt(literal(a[0]))):m._tb_printi(p64(f),fmt,int(a[0]));if(a.length===3)return typeof a[0]==='string'?m._tb_printppi(p64(f),fmt,BigInt(literal(a[0])),BigInt(literal(a[1])),int(a[2])):m._tb_printiip(p64(f),fmt,int(a[0]),int(a[1]),BigInt(literal(a[2])));if(a.length===4)return m._tb_printipii(p64(f),fmt,int(a[0]),BigInt(literal(a[1])),int(a[2]),int(a[3]));throw Error('Unknown source vararg shape');},
 printf:(s,...a)=>a.length===2?m._tb_printfii(BigInt(literal(s)),int(a[0]),int(a[1])):m._tb_printfp(BigInt(literal(s)),BigInt(literal(a[0]))),fputs:(s,f)=>m._tb_fputs(BigInt(literal(s)),p64(f)),exit:n=>m._tb_exit(n|0)};
 Object.defineProperty(C,'colorsinmap',{get:()=>view().getInt32(Number(m._tb_storage(4)),true)});
 for(const k of ['tilefileset','tiles_counted','max_x','max_y','magictileno','bmpsize','num_colors','max_tiles_in_row','tiles_in_row','filenum','initflag','pass','yoffset','xoffset','newbmp','fp'])Object.defineProperty(C,k,{get:()=>state[k],set:v=>{state[k]=k==='fp'||k==='newbmp'?ptr(v):int(v);}});
 return{C,L,invoke(name,...args){const sp=m.stackSave();try{if(name==='main')args[1]=indexed(ptr(args[1]),8,p=>Number(view().getBigUint64(p,true)));return withCEnvironment(C,core[name],...args);}finally{m.stackRestore(sp);}}};
}
