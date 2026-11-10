// Native layouts and dependency ABI only; all original region decisions live in region.js.
import * as regionCore from './region.js';
import {withCEnvironment} from './c-runtime.js';
const modules=new WeakMap();
export function createRegionEnvironment(services,L){
    for(const[k,n]of Object.entries({pointerSize:8,longSize:8,intSize:4,unsignedSize:4,booleanSize:1,rect_lx_size:2,rect_ly_size:2,rect_hx_size:2,rect_hy_size:2,reg_nrects_size:2,reg_ttl_size:8,reg_arg_size:8,pm_mflags1_size:8,pm_mflags2_size:8,mon_mhp_size:4,mon_m_id_size:4,u_xray_range_size:4,nhf_mode_size:4,nhf_ftype_size:4}))if(L[k]!==n)throw Error('Review changed REGION ABI: '+k);
    if(!(L.S_cloud>=L.S_grave&&L.S_cloud<=L.S_goodpos&&L.S_poisoncloud>=L.S_grave&&L.S_poisoncloud<=L.S_goodpos))throw Error('Review changed REGION cloud glyph header branch');
    const address=p=>Number(p?.address??p??0),dv=()=>new DataView(services.heap().buffer);
    const cache=new Map();
    const read=(p,k)=>dv()['get'+k](p,true),write=(p,k,v)=>dv()['set'+k](p,k.includes('Big')?BigInt(v):Number(v),true);
    const cell=(p,k)=>({address:p,get value(){return read(p,k);},set value(v){write(p,k,v);}});
    function struct(p,tag,fields){p=address(p);if(!p)return 0;const key=tag+':'+p;if(cache.has(key))return cache.get(key);const o={address:p};cache.set(key,o);for(const [name,kind]of Object.entries(fields))Object.defineProperty(o,name,{enumerable:true,get(){const at=p+L[tag+'_'+name];if(typeof kind==='function')return kind(at);return read(at,kind);},set(v){const at=p+L[tag+'_'+name];if(typeof kind==='function')throw new Error('Native struct assignment requires full memcpy: '+name);write(at,kind,v);}});return o;}
    function pointerField(o,p,name,fn){Object.defineProperty(o,name,{enumerable:true,get(){return fn(Number(read(p+L['reg_'+name],'BigUint64')));},set(v){write(p+L['reg_'+name],'BigUint64',BigInt(address(v)));}});}
    const rect=p=>struct(p,'rect',{lx:'Int16',ly:'Int16',hx:'Int16',hy:'Int16'});
    const any=p=>struct(p,'any',{a_int:'Int32',a_ulong:'BigUint64',a_void:'BigUint64'});
    const permonst=p=>struct(p,'pm',{mflags1:'BigUint64',mflags2:'BigUint64',msound:'Uint8',mlet:'Int8'});
    const monster=p=>{const o=struct(p,'mon',{m_id:'Uint32',mx:'Int16',my:'Int16',mhp:'Int32'});if(o&&!Object.hasOwn(o,'data')){Object.defineProperty(o,'data',{get(){return permonst(Number(read(o.address+L.mon_data,'BigUint64')));}});for(const[key,index]of [['mcansee',0],['mblinded',1]])Object.defineProperty(o,key,{get(){return services.monsterBit(o,index);},set(v){services.setMonsterBit(o,index,v);}});}return o;};
    const array=(p,stride,load,store)=>{p=address(p);if(!p)return 0;return new Proxy({address:p},{get(t,k){if(k in t)return t[k];if(/^\d+$/.test(String(k)))return load(p+Number(k)*stride);},set(t,k,v){if(/^\d+$/.test(String(k))){store(p+Number(k)*stride,v);return true;}t[k]=v;return true;}});};
    const rectArray=p=>array(p,L.rectSize,rect,(at,v)=>services.memcpy(at,v,L.rectSize));
    const uintArray=p=>array(p,L.unsignedSize,at=>read(at,'Uint32'),(at,v)=>write(at,'Uint32',v));
    const regionArray=p=>array(p,L.pointerSize,at=>region(Number(read(at,'BigUint64'))),(at,v)=>write(at,'BigUint64',BigInt(address(v))));
    function region(p){const o=struct(p,'reg',{bounding_box:rect,nrects:'Int16',attach_2_u:'Int8',attach_2_m:'Uint32',enter_msg:'BigUint64',leave_msg:'BigUint64',ttl:'BigInt64',expire_f:'Int16',can_enter_f:'Int16',enter_f:'Int16',can_leave_f:'Int16',leave_f:'Int16',inside_f:'Int16',player_flags:'Uint32',n_monst:'Int16',max_monst:'Int16',visible:'Int8',glyph:'Int32',arg:any});if(!o)return 0;if(!Object.hasOwn(o,'rects')){pointerField(o,o.address,'rects',rectArray);pointerField(o,o.address,'monsters',uintArray);}return o;}
    const globalNames=['gr','gm','svn','svm','gg','u','gy','gi','svc','iflags','cg','svl','mons','gv'];
    const bases=Object.fromEntries(globalNames.map((name,i)=>[name,address(services.global(i))]));
    const base=name=>bases[name];
    const globals={};
    const globalCell=(name,field,kind)=>{const obj=globals[name]??={};Object.defineProperty(obj,field,{get(){return read(base(name)+L[name+'_'+field],kind);},set(v){write(base(name)+L[name+'_'+field],kind,v);}});};
    for(const [name,field,kind]of [['gm','max_regions','Int32'],['svn','n_regions','Int32'],['svm','moves','BigInt64'],['gg','gas_cloud_diss_within','Int8'],['gg','gas_cloud_diss_seen','Int32'],['gi','in_mklev','Int8'],['iflags','menu_tab_sep','Int8'],['iflags','last_msg','Int32']])globalCell(name,field,kind);
    globals.gr={};Object.defineProperty(globals.gr,'regions',{get(){return regionArray(Number(read(base('gr')+L.gr_regions,'BigUint64')));},set(v){write(base('gr')+L.gr_regions,'BigUint64',BigInt(address(v)));}});
    globals.u={};for(const[field,kind]of [['ux','Int16'],['uy','Int16'],['xray_range','Int32']])Object.defineProperty(globals.u,field,{get(){return read(base('u')+L['u_'+field],kind);},set(v){write(base('u')+L['u_'+field],kind,v);}});
    for(const[field,i]of [['uswallow',0],['uinwater',1]])Object.defineProperty(globals.u,field,{get(){return services.heroBit(i);},set(v){services.setHeroBit(i,v);}});
    globals.gy={};Object.defineProperty(globals.gy,'youmonst',{get(){return monster(base('gy')+L.gy_youmonst);}});
    globals.cg={};Object.defineProperty(globals.cg,'zeroany',{get(){return any(base('cg')+L.cg_zeroany);}});Object.defineProperty(globals.cg,'zeroNhRect',{get(){return rect(base('cg')+L.cg_zeroNhRect);}});
    globals.svc={context:{}};Object.defineProperty(globals.svc.context,'mon_moving',{get(){return read(base('svc')+L.svc_context+L.context_mon_moving,'Int8');},set(v){write(base('svc')+L.svc_context+L.context_mon_moving,'Int8',v);}});
    const prop=(n,field)=>cell(base('u')+L.u_uprops+n*L.propSize+L['prop_'+field],'BigInt64');
    const env=Object.assign(Object.create(services),L,globals,{region,rect,rectArray,uintArray,regionArray,monster,permonst,any,address,
      mons:array(base('mons'),L.permonstSize,permonst,()=>{throw Error('readonly catalogue');}),
      long:v=>BigInt.asIntN(64,BigInt(v)),int:v=>Number(BigInt.asIntN(32,BigInt(v))),uint:v=>Number(BigInt.asUintN(32,BigInt(v))),
      copyRect:(to,from)=>services.memcpy(to,from,L.rectSize),copyAny:(to,from)=>services.memcpy(to,from,L.anythingSize),
      rectLocal:from=>{const p=services.stackAlloc(L.rectSize);if(from)services.memcpy(p,from,L.rectSize);return rect(p);},
      uintLocal:(v=0)=>{const o=cell(services.stackAlloc(4),'Uint32');o.value=v;return o;},longLocal:(v=0n)=>{const o=cell(services.stackAlloc(8),'BigInt64');o.value=v;return o;},
      addressOf:(o,field)=>address(o)+L['reg_'+field],elementAddress:(o,i)=>address(o)+i*4,
      globalField:(name,field)=>base(name)+L[name+'_'+field],magicalBreathingAddress:()=>prop(L.MAGICAL_BREATHING,'intrinsic').address,
      cansee:(x,y)=>{const rows=Number(read(base('gv')+L.gv_viz_array,'BigUint64')),row=Number(read(rows+y*L.pointerSize,'BigUint64'));return !!(read(row+x,'Uint8')&L.IN_SIGHT);},
      distu:(x,y)=>services.dist2(x,y,globals.u.ux,globals.u.uy),
      cmap_to_glyph:n=>{if(n!==L.S_cloud&&n!==L.S_poisoncloud)throw Error('Review changed REGION cmap macro inputs');return n<L.S_arrow_trap+L.MAXTCHARS?n-L.S_grave+L.GLYPH_CMAP_B_OFF:n-L.S_digbeam+L.GLYPH_CMAP_C_OFF;},
      terrain:(x,y)=>base('svl')+L.terrain+(x*L.ROWNO+y)*L.terrainSize,
      hero_inside:r=>r.player_flags&L.REG_HERO_INSIDE,heros_fault:r=>!(r.player_flags&L.REG_NOT_HEROS),
      set_hero_inside:r=>{r.player_flags|=L.REG_HERO_INSIDE;},clear_hero_inside:r=>{r.player_flags&=~L.REG_HERO_INSIDE;},
      set_heros_fault:r=>{r.player_flags&=~L.REG_NOT_HEROS;},clear_heros_fault:r=>{r.player_flags|=L.REG_NOT_HEROS;},
      DEADMONSTER:m=>m.mhp<1,u_at:(x,y)=>globals.u.ux===x&&globals.u.uy===y,
      is_silent:p=>p.msound===L.MS_SILENT,haseyes:p=>!(p.mflags1&BigInt(L.M1_NOEYES)),
      nonliving:p=>!!((p.mflags2&BigInt(L.M2_UNDEAD))||p===env.mons[L.PM_MANES]||p.mlet===L.S_GOLEM||p.mlet===L.S_VORTEX),resists_poison:m=>services.Resists_Elem(m,L.POISON_RES),
      find_mid:(id,flags)=>monster(services.find_mid(id,flags)),m_at:(x,y)=>monster(Number(read(base('svl')+L.floorMonsters+(x*L.ROWNO+y)*8,'BigUint64'))),
      update_file:nhfp=>nhfp.mode&(L.COUNTING|L.WRITING),release_data:nhfp=>nhfp.mode&L.FREEING,
      nhfile:p=>struct(p,'nhf',{ftype:'Int32',mode:'Int32',structlevel:'Int8',fnidx:'Int32'}),longPointer:p=>p?cell(address(p),'BigInt64'):0,
    });
    Object.defineProperties(env,{
      Blind:{get(){return !!((prop(L.BLINDED,'intrinsic').value||prop(L.BLINDED,'extrinsic').value)&&!prop(L.BLINDED,'blocked').value);}},
      BlindedTimeout:{get(){return prop(L.BLINDED,'intrinsic').value&BigInt(L.TIMEOUT);}},
      Poison_resistance:{get(){return prop(L.POISON_RES,'intrinsic').value||prop(L.POISON_RES,'extrinsic').value;}},
      Half_physical_damage:{get(){return prop(L.HALF_PHDAM,'intrinsic').value||prop(L.HALF_PHDAM,'extrinsic').value;}},
      Breathless:{get(){return prop(L.MAGICAL_BREATHING,'intrinsic').value||prop(L.MAGICAL_BREATHING,'extrinsic').value||(globals.gy.youmonst.data.mflags1&BigInt(L.M1_BREATHLESS));}},
      Half_gas_damage:{get(){const p=address(services.blindfold());return p&&read(p+L.obj_otyp,'Int16')===L.TOWEL&&read(p+L.obj_spe,'Int8')>0;}},
      Something:{get(){return services.something();}},
    });
    return env;
}
export function callRegion(services,layout,name,...args){
    const key=services.moduleKey;if(!key)throw Error('REGION requires actual Module identity');let env=modules.get(key);if(!env){env=createRegionEnvironment(services,layout);modules.set(key,env);}if(name==='environment')return env;
    const regions=new Set(['inside_region','add_rect_to_reg','add_mon_to_reg','remove_mon_from_reg','mon_in_region','free_region','add_region','remove_region','reg_damg','show_region','reset_region_mids','make_gas_cloud','expire_gas_cloud','inside_gas_cloud']);
    if(regions.has(name))args[0]=env.region(args[0]);if(name==='inside_rect')args[0]=env.rect(args[0]);
    if(name==='create_region')args[0]=env.rectArray(args[0]);if(name==='add_rect_to_reg')args[1]=env.rect(args[1]);
    if(['add_mon_to_reg','remove_mon_from_reg','mon_in_region','inside_gas_cloud'].includes(name))args[1]=env.monster(args[1]);
    if(['m_in_out_region','update_monster_region'].includes(name))args[0]=env.monster(args[0]);
    if(['save_regions','rest_regions'].includes(name))args[0]=env.nhfile(args[0]);
    if(name==='region_stats'){args[2]=env.longPointer(args[2]);args[3]=env.longPointer(args[3]);}
    const sp=services.stackSave();try{return withCEnvironment(env,regionCore[name],...args);}finally{services.stackRestore(sp);}
}
