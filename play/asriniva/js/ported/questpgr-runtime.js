// Compiler-derived live C views and language/ABI adapters; policy is questpgr.js.
import * as questpgr from './questpgr.js';
import {withCEnvironment} from './c-runtime.js';
export function createQuestpgrEnvironment(services,layout){
    for(const [key,n] of Object.entries({pointerSize:8,intSize:4,longSize:8,shortSize:2}))if(layout[key]!==n)throw new Error('Review changed questpgr ABI '+key);
    const addr=v=>Number(v?.address??v??0),raw=v=>BigInt(v?.address??v??0),view=()=>new DataView(services.heap().buffer),glob=i=>addr(services.global(i));
    const pointer=at=>Number(view().getBigUint64(at,true));
    const int=v=>Number(BigInt.asIntN(32,BigInt(v))),char=v=>int(v)<<24>>24;
    const indexed=get=>new Proxy({}, {get(t,k){return typeof k==='string'&&/^-?\d+$/.test(k)?get(Number(k)):Reflect.get(t,k);}});
    function field(o,k,at,kind){Object.defineProperty(o,k,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(v):Number(v),true);}});}
    function ptr(o,k,at,wrap=v=>v){Object.defineProperty(o,k,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),raw(v),true);}});}
    function record(value,prefix,defs){const at=addr(value);if(!at)return 0;const o={address:at};for(const [key,kind]of defs){if(layout[prefix+'_'+key+'_size']!==parseInt(kind.replace(/\D/g,''))/8)throw new Error('Review changed questpgr field '+prefix+'_'+key);field(o,key,()=>at+layout[prefix+'_'+key],kind);}return o;}
    function object(v){const at=addr(v);if(!at)return 0;const o=record(at,'obj',[['oartifact','Int8']]);ptr(o,'nobj',()=>at+layout.obj_nobj,object);ptr(o,'cobj',()=>at+layout.obj_cobj,object);return o;}
    function monster(v){const at=addr(v);if(!at)return 0;const m=record(at,'mon',[['mhp','Int32']]);ptr(m,'nmon',()=>at+layout.mon_nmon,monster);ptr(m,'minvent',()=>at+layout.mon_minvent,object);return m;}
    function permonst(v){const at=addr(v);if(!at)return 0;const pm=record(at,'pm',[['mflags2','BigUint64']]);pm.pmnames=indexed(i=>pointer(at+layout.pm_pmnames+i*8));return pm;}
    const role=record(glob(0)+layout.urole,'role',['questarti','ldrnum','neminum','guardnum','enemy1num','enemy2num','mnum'].map(k=>[k,'Int16']).concat([['enemy1sym','Int8'],['enemy2sym','Int8']]));
    for(const k of ['filecode','intermed','homebase'])ptr(role,k,()=>role.address+layout['role_'+k]);role.name={};for(const k of ['m','f'])ptr(role.name,k,()=>role.address+layout['role_name_'+k]);
    const gn={nambuf:glob(1)+layout.nambuf},gi={},svl={level:{}},gm={},svq={quest_status:{}},gc={cvt_buf:glob(6)+layout.cvt_buf},svp={plname:glob(7)+layout.plname},svd={},u=record(glob(9),'u',[['ulevel','Int32']]),flags={},program_state={},gl={},svm={};
    ptr(gi,'invent',()=>glob(2)+layout.invent,object);ptr(svl.level,'buriedobjlist',()=>glob(3)+layout.buried,object);ptr(gm,'migrating_objs',()=>glob(4)+layout.migrating_objs,object);ptr(gm,'migrating_mons',()=>glob(4)+layout.migrating_mons,monster);
    for(const [i,k]of ['godgend','ldrgend','nemgend'].entries())Object.defineProperty(svq.quest_status,k,{get(){return services.questBit(i);}});
    svd.dungeons=indexed(i=>({dname:glob(8)+layout.dungeons+i*layout.dungeonSize+layout.dungeon_dname}));
    u.ualign={};field(u.ualign,'type',()=>glob(9)+layout.u_ualign_type,'Int8');u.ualignbase=indexed(i=>view().getInt8(glob(9)+layout.u_ualignbase+i));
    u.uprops=indexed(i=>record(glob(9)+layout.u_uprops+i*layout.propSize,'prop',[['intrinsic','BigInt64'],['extrinsic','BigInt64'],['blocked','BigInt64']]));
    field(flags,'female',()=>glob(10)+layout.female,'Int8');field(program_state,'wizkit_wishing',()=>glob(11)+layout.wizkit_wishing,'Int32');ptr(gl,'lev_message',()=>glob(15)+layout.lev_message);
    const genders=indexed(i=>{const at=glob(12)+i*layout.genderSize,g={address:at};for(const k of ['he','him','his'])ptr(g,k,()=>at+layout['gender_'+k]);return g;});
    const mons=indexed(i=>permonst(glob(13)+i*layout.pmSize));svm.mvitals=indexed(i=>record(glob(14)+layout.mvitals+i*layout.vitalSize,'vital',[['mvflags','Uint8']]));
    const env=Object.assign(Object.create(services),layout,{gu:{urole:role},gn,gi,svl,gm,svq,gc,svp,svd,u,flags,program_state,genders,mons,svm,gl,object,monster,permonst,int,uint:v=>int(v)>>>0,char,boolean:char,
        loadChar:p=>view().getInt8(addr(p)),storeChar(p,v){const c=char(v);view().setInt8(addr(p),c);return c;},ptrAdd:(p,n)=>addr(p)+Number(n),
        Has_contents:o=>Boolean(o.cobj),DEADMONSTER:m=>m.mhp<1,type_is_pname:p=>Boolean(p.mflags2&BigInt(layout.M2_PNAME)),
        lua_istable:(L,i)=>services.lua_type(L,i)===layout.LUA_TTABLE,lua_pop:(L,n)=>services.lua_settop(L,-n-1),
        charPointerReference(get,set){return {get value(){return get();},set value(v){set(v);}};},
        charPointerPointer(v){const at=addr(v);return at?{address:at,get value(){return pointer(at);},set value(p){view().setBigUint64(at,raw(p),true);}}:0;},
        sandboxLocal(...args){const at=services.stackAlloc(layout.sandboxSize);for(const [i,k]of ['flags','memlimit','steps','perpcall'].entries())view().setUint32(at+layout['sandbox_'+k],args[i]>>>0,true);return {address:at};},
        get_table_option(L,name,def,options){const saved=services.stackSave();try{const at=services.stackAlloc(options.length*8);for(let i=0;i<options.length;i++)view().setBigUint64(at+i*8,BigInt(options[i]?services.literal(options[i]):0),true);return services.get_table_option(L,name,def,at);}finally{services.stackRestore(saved);}},
        callLocal(fn,...args){const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
    });
    Object.defineProperties(env,{fobj:{get(){return object(pointer(glob(3)+layout.floorObjects));}},fmon:{get(){return monster(pointer(glob(3)+layout.floorMonsters));}},Role_switch:{get(){return role.mnum;}},Blind:{get(){const p=u.uprops[layout.BLINDED];return Boolean((p.intrinsic||p.extrinsic)&&!p.blocked);}}});
    env.mkclass=(...args)=>permonst(services.mkclass(...args));
    return env;
}
export function callQuestpgr(services,layout,name,...args){const env=createQuestpgrEnvironment(services,layout);
    if(['is_quest_artifact','find_qarti'].includes(name))args[0]=env.object(args[0]);if(name==='stinky_nemesis')args[0]=env.monster(args[0]);if(name==='com_pager_core')args[3]=env.charPointerPointer(args[3]);
    const result=withCEnvironment(env,questpgr[name],...args);return result?.address??result??0;
}
