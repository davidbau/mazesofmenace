// Native BONES transport for the single environment created by level-startup.
// Decisions, object mutation, callbacks and serialization remain original source.
import abi from './bones-services-abi.json' with {type:'json'};
import * as bones from '../ported/bones.js';
import {withCEnvironment} from '../c-runtime/context.js';
export function bindBonesServices(environment,local,getContext){
 const {services,memory,ctypes,transport}=environment,address=environment.address;
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const coerce={pointer:address,text,byte:transport.char,coord:transport.short,long:transport.long,integer:transport.int};
 for(const[name,row]of Object.entries(abi.calls))local[name]=(...args)=>{if(args.length!==row.coercions.length)throw new Error('Review BONES argument count '+name);const result=resolve(row.target)(...args.map((v,i)=>coerce[row.coercions[i]](v)));return row.number?Number(result?.address??result):result;};
 local.monsterAt=(x,y)=>{const p=ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at,field=ctypes.locate('dlevel_t',p,'monsters');const dimensions=[...field.field.ctype.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1]));if(dimensions.length!==2)throw new Error('Review BONES monster grid');return ctypes.load('struct monst *',field.at+(transport.short(x)*dimensions[1]+transport.short(y))*ctypes.size('struct monst *'));};
 local.callbackPointer=()=>environment.functionPointer('bones::remove_mon_from_bones','vp',p=>transport.scoped(()=>{const context=getContext();return withCEnvironment(context,bones.remove_mon_from_bones,context.monster(p));}));
 local.y_n=query=>resolve('yn_function')(text(query),environment.requireGlobal('ynchars'),110,1);
 local.Sprintf=(out,format,...args)=>{if(args.length!==2&&args.length!==5)throw new Error('Review BONES format argument count');return resolve('sprintf')(address(out),text(format),...args.map(text));};
 local.pline=format=>resolve('pline')(text(format));local.pline1=value=>resolve('pline')(text('%s'),text(value));
 local.You=(format,a,b)=>resolve('You')(text(format),text(a),text(b));
 const debug=(format,args)=>{if(resolve('debugcore')(text('bones.c'),1)){const p=environment.requireGlobal('iflags'),previous=ctypes.getField('struct instance_flags',p,'last_msg','int');try{return resolve('pline')(text(format),...args);}finally{ctypes.setField('struct instance_flags',p,'last_msg','int',previous);}}};
 local.debugpline1=(format,a)=>debug(format,[text(a)]);local.debugpline2=(format,a,b)=>debug(format,[transport.uint(a),transport.uint(b)]);
 return {public:abi.public,prepareArgs:(fn,args)=>{const context=getContext();if(['free_ebones','newebones'].includes(fn))args[0]=context.monster(args[0]);if(fn==='fix_ghostly_obj')args[0]=context.object(args[0]);if(fn==='drop_upon_death'){args[0]=context.monster(args[0]);args[1]=context.object(args[1]);}if(fn==='savebones'){args[0]=transport.int(args[0]);args[1]=transport.long(args[1]);args[2]=context.object(args[2]);}return args;}};
}
