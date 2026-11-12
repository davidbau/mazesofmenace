import * as core from './uudecode.js';
import {withCEnvironment} from '../c-runtime/context.js';
export function createUudecodeEnvironment(s){
 const view=()=>new DataView(s.heap().buffer),p=x=>Number(x),literalMap=new Map();
 const literal=x=>{if(typeof x!=='string')return p(x);if(!literalMap.has(x)){const bytes=new TextEncoder().encode(x),at=p(s.malloc(bytes.length+1));s.heap().set(bytes,at);s.heap()[at+bytes.length]=0;literalMap.set(x,at);}return literalMap.get(x);};
 const e={NULL:0,int:x=>Number(BigInt.asIntN(32,BigInt(x))),char:x=>s.charSigned?(Number(x)<<24>>24):Number(x)&255,
 charAt:at=>s.charSigned?view().getInt8(p(at)):view().getUint8(p(at)),storeChar:(at,ch)=>{const x=e.char(ch);view().setInt8(p(at),x);return x;},pointerAt:at=>p(view().getBigUint64(p(at),true)),
 charBuffer:n=>p(s.stackAlloc(n)),uintLocal:()=>{const at=p(s.stackAlloc(4));return{address:at,get value(){return view().getUint32(at,true);},set value(v){view().setUint32(at,v,true);}};},
 pw_dir:user=>p(s.pw_dir(user)),exit:s.exit,
 fopen:(a,b)=>p(s.fopen(literal(a),literal(b))),perror:a=>s.perror(literal(a)),printf:fmt=>s.printf(literal(fmt)),fprintf:(f,fmt,arg=0)=>s.fprintf(f,literal(fmt),literal(arg)),
 fgets:(out,n,f)=>p(s.fgets(out,n,f)),strncmp:(a,b,n)=>s.strncmp(literal(a),literal(b),BigInt(n)),strcmp:(a,b)=>s.strcmp(literal(a),literal(b)),strlen:a=>s.strlen(literal(a)),
 sscanf:(a,fmt,mode,dest)=>s.sscanf(a,literal(fmt),mode.address,dest),strchr:(a,c)=>p(s.strchr(a,c)),getpwnam:a=>p(s.getpwnam(a)),
 strcpy:(a,b)=>p(s.strcpy(a,literal(b))),strcat:(a,b)=>p(s.strcat(a,literal(b))),chmod:(a,mode)=>s.chmod(a,mode),putc:(ch,f)=>s.putc(ch,f)};
 Object.defineProperties(e,{stdin:{get:()=>p(s.stdin())},stderr:{get:()=>p(s.stderr())}});
 e.callLocal=(fn,...args)=>{const stack=s.stackSave();try{return fn(...args);}finally{s.stackRestore(stack);}};
 return e;
}
export function callUudecode(s,name,...args){const stack=s.stackSave();try{return withCEnvironment(createUudecodeEnvironment(s),core[name],...args);}finally{s.stackRestore(stack);}}
