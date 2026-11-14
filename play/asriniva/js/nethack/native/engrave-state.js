// Native engraving records, hero/map state, occupation and command values.
import {createNativeByteValues} from './byte-values.js';
import {createNativeLocalReference,isNativeLocalReference} from './local-reference.js';
import abi from '../engrave-abi.json' with {type:'json'};
export function createNativeEngraveState(environment,layouts,services,source,owner){
 const L=layouts.engrave,{transport:t,ctypes,memory}=environment,arena=owner.nativeArena,views=owner.nativeRecords,address=environment.address;
 const raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),view=()=>arena.view,pointer=at=>arena.pointer(at),global=i=>environment.requireGlobal(abi.globals[i]),literal=v=>typeof v==='string'?services.literal(v):address(v);
 if(L.pointerSize!==8||L.longSize!==8||L.booleanSize!==1||L.text_states!==3)throw Error('Review native ENGRAVE ABI');
 const object=v=>views.record('struct obj',v),monster=v=>views.record('struct monst',v),permonst=v=>views.record('struct permonst',v),engr=v=>views.record('struct engr',v),dlevel=v=>views.record('struct d_level',v);
 const roots={};for(const[name,type]of Object.entries({u:'you',svm:'instance_globals_saved_m',svc:'instance_globals_saved_c',svl:'instance_globals_saved_l',gi:'instance_globals_i',gm:'instance_globals_m',gn:'instance_globals_n',gy:'instance_globals_y',iflags:'instance_flags',flags:'flag',gu:'instance_globals_u'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 function table(type,base,stride,length){const out=Array(length);for(let i=0;i<length;i++)Object.defineProperty(out,i,{enumerable:true,configurable:true,get(){const value=views.record(type,base+i*stride);Object.defineProperty(out,i,{value,enumerable:true});return value;}});return out;}
 const props=table('struct prop',roots.u.address+L.u_uprops,L.propSize,roots.u.uprops.length),skills=table('struct skills',roots.u.address+L.u_weapon_skills,L.skillSize,roots.u.weapon_skills.length);
 const property=i=>props[i],objects=table('struct objclass',global(11),L.objectClassSize,layouts.o_init.NUM_OBJECTS),mons=table('struct permonst',global(12),L.permonstSize,layouts.makemon.NUMMONS+1),bytes=createNativeByteValues(environment),commands=new WeakSet();
 function staticBytes(value){return {text:value,get address(){return services.literal(value);},[Symbol.toPrimitive](){return this.address;}};}
 const tables={rubouts:source.rubouts.map(row=>({wipefrom:row.wipefrom,wipeto:staticBytes(row.wipeto)})),blind_writing:source.blind_writing.map(row=>staticBytes(String.fromCharCode(...row)))};
 function nativeCommandContext(){const out={};commands.add(out);for(const[name,width,normalize]of [['dengr',1,v=>Number(v)<<24>>24],['doblind',1,v=>Number(v)<<24>>24],['doknown',1,v=>Number(v)<<24>>24],['eow',1,v=>Number(v)<<24>>24],['jello',1,v=>Number(v)<<24>>24],['ptext',1,v=>Number(v)<<24>>24],['teleengr',1,v=>Number(v)<<24>>24],['zapwand',1,v=>Number(v)<<24>>24],['disprefresh',1,v=>Number(v)<<24>>24],['frosted',1,v=>Number(v)<<24>>24],['adding',1,v=>Number(v)<<24>>24],['ret',4,v=>Number(v)|0],['type',4,v=>Number(v)|0],['oetype',4,v=>Number(v)|0],['len',8,v=>BigInt.asUintN(64,BigInt(v))]]){if(L['ctx_'+name+'_size']!==width)throw Error('Review ENGRAVE command width '+name);let value;Object.defineProperty(out,name,{enumerable:true,get:()=>value,set:v=>{value=normalize(v);}});}
  for(const[name,wrap]of [['otmp',object],['oep',engr]]){let value;Object.defineProperty(out,name,{enumerable:true,get:()=>value,set:v=>{value=wrap(v);}});}
  for(const name of ['buf','ebuf','fbuf','qbuf','post_engr_text'])out[name]=bytes(L['ctx_'+name+'_size']);return out;
 }
 const txtOffset=ctypes.record('struct engr').fields.engr_txt.offset,textAt=(ep,i)=>{if(!Number.isInteger(i)||i<0||i>=L.text_states)throw RangeError('Native engraving text slot');return address(ep)+txtOffset+i*L.pointerSize;};
 let namespace;
 const env=Object.assign({},L,roots,tables,{object,monster,permonst,engr,objects,mons,levl:owner.spatial.cells,nativeCommandContext,
  int:t.int,uint:t.uint,char:t.char,short:t.short,long:t.long,samePtr:(a,b)=>(a?.address??a??0)===(b?.address??b??0),ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),charPointer:literal,
  loadChar:p=>p?.nativeBytes?p.load():arena.Int8[literal(p)],storeChar:(p,v)=>{v=t.char(v);if(p?.nativeBytes)return p.store(0,v);arena.Int8[address(p)]=v;return v;},loadCharAt:(p,i)=>p?.nativeBytes?p.load(i):arena.Int8[address(p)+i],storeCharAt:(p,i,v)=>{v=t.char(v);if(p?.nativeBytes)return p.store(i,v);arena.Int8[address(p)+i]=v;return v;},
  min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,
  engrText:(ep,i)=>arena.pointer(textAt(ep,i)),setEngrText:(ep,i,value)=>{arena.storePointer(textAt(ep,i),value);return value;},updateEngrText:(ep,i,delta,prefix)=>{const at=textAt(ep,i),before=arena.pointer(at),after=before+delta;arena.storePointer(at,after);return prefix?after:before;},
  uintLocal:value=>createNativeLocalReference({owner,kind:'u32',width:4,allocate:t.stackAlloc,get:()=>value,set:()=>{},normalize:v=>Number(v)>>>0,read:p=>arena.Uint32[p/4],write:(p,v)=>{arena.Uint32[p/4]=v;},uninitialized:value===undefined}),
  longPointer:value=>{if(isNativeLocalReference(value,owner,'i64'))return value;const p=address(value);if(!p)return 0;const cell=arena.scalar('BigInt64',p);return {address:p,get value(){return cell.get();},set value(v){cell.set(BigInt(v));}};},
  nhfile:v=>views.record('struct nh_file',v),newengr:size=>engr(services.alloc(t.uint(t.uint(size)+L.EngrSize))),dealloc_engr:ep=>services.free(ep),engr_text_space:ep=>address(ep)+L.EngrSize,
  free:value=>{if(value&&typeof value==='object'&&commands.has(value))return;return services.free(value);},
  callLocal:(fn,...args)=>fn(...args),
 });
 for(const key of Object.keys(L))if(/^(M[12]_|W_|LL_)/.test(key))env[key]=BigInt(L[key]);
 for(const[i,key]of ['Something','Never_mind','vision_clears','ynqchars'].entries())Object.defineProperty(env,key,{get:()=>services.commonString(i)});
 for(const key of ['air_level','water_level'])env['Is_'+key.replace('_level','level')]=level=>{const target=dlevel(global(13)+L[key]);return Number(Boolean((target.dnum||target.dlevel)&&services.on_level(level,target)));};
 env.P_SKILL=index=>skills[index].skill;
 env.ACCESSIBLE=typ=>Number(typ>=L.DOOR);for(const[name,typ]of [['IS_ALTAR','ALTAR'],['IS_FOUNTAIN','FOUNTAIN'],['IS_GRAVE','GRAVE']])env[name]=value=>Number(value===L[typ]);env.IS_AIR=typ=>Number(typ===L.AIR||typ===L.CLOUD);env.SURFACE_AT=(x,y)=>{const cell=env.levl[x][y];return cell.typ===L.DRAWBRIDGE_UP?services.db_under_typ(cell.drawbridgemask):cell.typ;};
 for(const[name,field,mask]of [['is_animal','mflags1','M1_ANIMAL'],['is_demon','mflags2','M2_DEMON']])env[name]=pm=>Number(Boolean(pm[field]&BigInt(L[mask])));
 env.is_vampire=pm=>Number(pm.mlet===L.S_VAMPIRE);env.is_whirly=pm=>Number(pm.mlet===L.S_VORTEX||raw(pm)===raw(env.mons[L.PM_AIR_ELEMENTAL]));env.cantwield=pm=>Number(Boolean(pm.mflags1&BigInt(L.M1_NOHANDS))||pm.msize<L.MZ_SMALL);env.ceiling_hider=pm=>Number(Boolean((pm.mflags1&BigInt(L.M1_HIDE))&&(((pm.mflags1&BigInt(L.M1_CLING))&&pm.mlet!==L.S_MIMIC)||(pm.mflags1&BigInt(L.M1_FLY)))));
 env.bimanual=obj=>Number(Boolean((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.TOOL_CLASS)&&env.objects[obj.otyp].oc_bimanual));env.is_blade=obj=>Number(obj.oclass===L.WEAPON_CLASS&&env.objects[obj.otyp].oc_skill>=L.P_DAGGER&&env.objects[obj.otyp].oc_skill<=L.P_SABER);env.is_boots=obj=>Number(obj.oclass===L.ARMOR_CLASS&&env.objects[obj.otyp].oc_armcat===L.ARM_BOOTS);env.is_wet_towel=obj=>Number(obj.otyp===L.TOWEL&&obj.spe>0);
 Object.defineProperty(env,'head_engr',{get:()=>engr(arena.pointer(environment.requireGlobal('head_engr'))),set:v=>arena.storePointer(environment.requireGlobal('head_engr'),v)});
 for(const name of ['uwep','uarms','ublindf'])Object.defineProperty(env,name,{get:()=>object(arena.pointer(environment.requireGlobal(name)))});Object.defineProperty(env,'hands_obj',{get:()=>object(environment.requireGlobal('hands_obj'))});
 for(const[name,key]of [['Blind','BLINDED'],['Deaf','DEAF'],['Levitation','LEVITATION'],['Flying','FLYING'],['Confusion','CONFUSION'],['Stunned','STUNNED'],['Hallucination','HALLUC']])Object.defineProperty(env,name,{get(){const p=property(L[key]);if(name==='Confusion'||name==='Stunned')return p.intrinsic;if(name==='Hallucination'){const r=property(L.HALLUC_RES);return Number(Boolean(p.intrinsic&&!r.intrinsic&&!r.extrinsic));}const value=p.intrinsic||p.extrinsic||(name==='Deaf'&&env.u.uroleplay.deaf)||(name==='Flying'&&env.u.usteed&&(env.u.usteed.data.mflags1&BigInt(L.M1_FLY)));return Number(Boolean(value&&((name==='Deaf')||!p.blocked)));}});
 env.bindNamespace=value=>{if(namespace&&namespace!==value)throw Error('ENGRAVE native namespace already bound');namespace=value;};
 env.getobj=(prompt,fn,flags)=>{if(fn!==namespace.stylus_ok)throw Error('Unknown native ENGRAVE selector');return object(services.getobj(prompt,flags));};env.set_occupation=(fn,text,time)=>{if(fn!==namespace.engrave)throw Error('Unknown native ENGRAVE occupation');return services.set_occupation(text,time);};env.get_rnd_text=(file,out,rng,pad)=>{if(rng!==env.rn2)throw Error('Unknown native ENGRAVE RNG callback');return services.get_rnd_text(file,out,pad);};
 for(const key of ['splitobj','hold_another_object'])env[key]=(...args)=>object(services[key](...args));env.strcmpi=(a,b)=>services.strncmpi(a,b,-1);env.update_file=file=>file.mode&(L.COUNTING|L.WRITING);env.release_data=file=>file.mode&L.FREEING;env.pline1=text=>services.pline('%s',text);env.Your1=text=>services.Your('%s',text);
 Object.setPrototypeOf(env,services);return env;
}
