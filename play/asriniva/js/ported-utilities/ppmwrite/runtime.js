import * as core from './ppmwrite.js';import{withCEnvironment}from'./scope.js';
const environments=new WeakMap();
export function createPpmwriteEnvironment(s){
 const meta=i=>Number(s.metadata(i)),view=()=>new DataView(s.heap().buffer),literals=new Map();
 const literal=x=>{if(typeof x!=='string')return Number(x);if(!literals.has(x)){const bytes=new TextEncoder().encode(x),at=Number(s.literal_alloc(bytes.length+1));s.heap().set(bytes,at);s.heap()[at+bytes.length]=0;literals.set(x,at);}return literals.get(x);};
 const e={TILE_X:meta(0),TILE_Y:meta(1),pixelSize:meta(2),pointerSize:meta(3),CM_RED:meta(7),CM_GREEN:meta(8),CM_BLUE:meta(9),EXIT_SUCCESS:meta(12),EXIT_FAILURE:meta(13),WRBMODE:Number(s.mode(0)),RDTMODE:Number(s.mode(1)),PpmScreen:{Width:0,Height:0},tiles_across:0,tiles_down:0,curr_tiles_across:0,image:0,ppm_file:0,
 char:x=>meta(11)?Number(x)<<24>>24:Number(x)&255,pointerAt:a=>Number(view().getBigUint64(Number(a),true)),setPointer:(a,x)=>view().setBigUint64(Number(a),BigInt(x),true),stackAlloc:n=>Number(s.stackAlloc(n)),
 alloc:n=>Number(s.alloc(Number(BigInt.asUintN(32,BigInt(n))))),free:s.free,exit:s.exit,fputc:s.fputc,rewind:s.rewind,fclose:s.fclose,
 strcmp:(a,b)=>s.strcmp(literal(a),literal(b)),fopen:(a,b)=>Number(s.fopen(literal(a),literal(b))),fopen_text_file:(a,b)=>s.text_open(literal(a),literal(b)),init_colormap:s.init_colormap,read_text_tile:s.text_read,fclose_text_file:s.text_close,
 fprintf:(f,fmt,...args)=>typeof args[0]==='number'&&args.length===2?s.header(f,literal(fmt),args[0],args[1]):s.message(f,literal(fmt),args.length?literal(args[0]):0),
 copyPixel:(a,b)=>s.heap().copyWithin(a,b,b+meta(2)),MainColorMap:(c,i)=>s.heap()[Number(s.colormap())+c*meta(10)+i]};
 e.imageAt=(j,i)=>e.pointerAt(e.image+j*e.pointerSize)+i*e.pixelSize;
 e.pixel=a=>{const p={address:a};for(const[k,i]of[['r',4],['g',5],['b',6]])Object.defineProperty(p,k,{get:()=>view().getUint8(a+meta(i)),set:x=>view().setUint8(a+meta(i),x)});return p;};
 e.callLocal=(fn,...args)=>{const sp=s.stackSave();try{return fn(...args);}finally{s.stackRestore(sp);}};
 Object.defineProperties(e,{stderr:{get:()=>Number(s.stderr())},colorsinmainmap:{get:s.colors}});return e;
}
export function callPpmwrite(s,name,...args){let e=environments.get(s.moduleKey);if(!e){e=createPpmwriteEnvironment(s);environments.set(s.moduleKey,e);}const sp=s.stackSave();try{return withCEnvironment(e,core[name],...args);}finally{s.stackRestore(sp);}}
