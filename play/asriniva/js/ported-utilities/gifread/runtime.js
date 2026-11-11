import * as core from './gifread.js';import{withCEnvironment}from'../../ported/c-runtime.js';
const environments=new WeakMap();
export function createGifreadEnvironment(s){
 const view=()=>new DataView(s.heap().buffer),sizes={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4,Pointer:8,BigInt64:8,BigUint64:8},staticCells=new Map(),literals=new Map();
 const cast=(t,x)=>t==='Pointer'?Number(x):t==='BigInt64'?BigInt.asIntN(64,BigInt(x)):t==='BigUint64'?BigInt.asUintN(64,BigInt(x)):t==='Int8'?Number(x)<<24>>24:t==='Uint8'?Number(x)&255:t==='Int16'?Number(x)<<16>>16:t==='Uint16'?Number(x)&65535:t==='Uint32'?Number(x)>>>0:Number(x)|0;
 const load=(t,a)=>t==='Pointer'?Number(view().getBigUint64(Number(a),true)):view()['get'+t](Number(a),true),store=(t,a,x)=>{x=cast(t,x);if(t==='Pointer')view().setBigUint64(Number(a),BigInt(x),true);else view()['set'+t](Number(a),x,true);return x;};
 const env={...s,cast,load,store,sizes:{'struct pixel_s':Number(s.metadata(2))},GifScreen:{Width:0,Height:0,Colors:0,ColorResolution:0,Background:0,AspectRatio:0,Interlace:0},Gif89:{transparent:-1,delayTime:-1,inputFlag:-1,disposal:0},ZeroDataBlock:0,gif_file:0,tiles_across:0,tiles_down:0,curr_tiles_across:0,curr_tiles_down:0,image:0,ColorMap:Number(s.colormap()),stackAlloc:n=>Number(s.stackAlloc(n)),
 literal:text=>{if(!literals.has(text)){const bytes=new TextEncoder().encode(text),a=Number(s.literal_alloc(bytes.length+1));s.heap().set(bytes,a);s.heap()[a+bytes.length]=0;literals.set(text,a);}return literals.get(text);},
 staticCell:(key,t,...init)=>{if(!staticCells.has(key)){let value=cast(t,init.length?init[0]:0);staticCells.set(key,{get value(){return value;},set value(v){value=cast(t,v);}});}return staticCells.get(key);},
 cell:(t,...init)=>{const a=Number(s.stackAlloc(sizes[t]));if(init.length)store(t,a,init[0]);return{address:a,get value(){return load(t,a);},set value(x){store(t,a,x);}};},
 staticBuffer:(key,n)=>{const index={'DoExtension.buf':0,'GetCode.buf':1,'LWZReadByte.table':2,'LWZReadByte.stack':3}[key];if(index===undefined||Number(s.static_size(index))!==n)throw Error('review static buffer shape '+key);return Number(s.static(index));},
 copy:(a,b,n)=>{s.heap().copyWithin(a,b,b+n);return a;},
 record:(a,type)=>{if(type!=='struct pixel_s')throw Error('review record type');const p={address:a};for(const[k,i]of[['r',4],['g',5],['b',6]])Object.defineProperty(p,k,{get:()=>view().getUint8(a+Number(s.metadata(i))),set:v=>view().setUint8(a+Number(s.metadata(i)),v)});return p;},
 va:(...args)=>args};
 env.input_code_size={address:Number(s.static(4)),get value(){return load('Uint8',this.address);},set value(x){store('Uint8',this.address,x);}};
 Object.defineProperties(env,{colorsinmap:{get:()=>load('Int32',s.colors()),set:x=>store('Int32',s.colors(),x)},stderr:{get:()=>Number(s.stderr())}});
 env.update=(t,a,delta,post)=>{const old=load(t,a),next=store(t,a,typeof old==='bigint'?old+BigInt(delta):old+delta);return post?old:next;};
 const format=(kind,f,out,fmt,args)=>{const sp=s.stackSave();try{let n=0;const offsets=args.map(([t])=>{n=Math.ceil(n/sizes[t])*sizes[t];const at=n;n+=sizes[t];return at;});const a=env.stackAlloc(Math.max(n,1));args.forEach(([t,x],i)=>store(t,a+offsets[i],x));return s.format(kind,f,out,fmt,a);}finally{s.stackRestore(sp);}};
 env.fprintf=(f,fmt,args)=>format(0,f,0,fmt,args);env.sprintf=(out,fmt,args)=>format(1,0,out,fmt,args);
 env.callLocal=(fn,...args)=>{const sp=s.stackSave();try{return fn(...args);}finally{s.stackRestore(sp);}};
 const args=core.std_args;env.std_args=Number(s.literal_alloc(args.length*8));args.forEach((x,i)=>store('Pointer',env.std_args+i*8,env.literal(x)));
 return env;
}
export function callGifread(s,name,...args){let e=environments.get(s.moduleKey);if(!e){e=createGifreadEnvironment(s);environments.set(s.moduleKey,e);}const sp=s.stackSave();try{return withCEnvironment(e,core[name],...args);}finally{s.stackRestore(sp);}}
export function gifreadState(s){return environments.get(s.moduleKey);}
