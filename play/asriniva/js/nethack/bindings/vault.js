import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Typed fields and configured header macros only; all25 VAULT algorithms live
// in vault.js. Every read refreshes the heap after dependencies or reentry.
export function createVaultEnvironment(services,L) {
    for(const[k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,coordSize:2,charSigned:1,booleanSize:1,programStopprintSize:4,multiSize:8,config_SOUND:0,mon_nmon_size:8,mon_mextra_size:8,extra_egd_size:8,obj_quan_size:8,fc_flags_size:1,fc_ftyp_size:1}))if(L[k]!==v)throw new Error('Review changed VAULT ABI: '+k);
    const address=v=>Number(v?.address??v??0),raw=v=>CAdapter.unsignedPointer(v);
    const view=()=>CAdapter.currentDataView(services),global=i=>address(services.global(i));
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const int=v=>CAdapter.signedInt(v);
    const field=(obj,key,at,kind)=>Object.defineProperty(obj,key,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(v):Number(v),true);}});
    const sized=(obj,key,at,size,signed=true)=>{if(![1,2,4].includes(size))throw new Error('Review VAULT scalar '+key);field(obj,key,at,(signed?'Int':'Uint')+size*8);};
    const ptr=(obj,key,at,wrap)=>Object.defineProperty(obj,key,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),raw(v),true);}});
    const structure=(at,prefix,keys)=>{const obj={address:at};for(const key of keys)sized(obj,key,()=>at+L[prefix+'_'+key],L[prefix+'_'+key+'_size']);return obj;};
    const indexed=(get,set)=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},set(obj,key,v){if(set&&typeof key==='string'&&/^-?\d+$/.test(key)){set(Number(key),v);return true;}return Reflect.set(obj,key,v);}});
    function level(v){return structure(address(v),'level',['dnum','dlevel']);}
    function fakecorr(v){const at=address(v),obj=structure(at,'fc',['fx','fy','ftyp']);sized(obj,'flags',()=>at+L.fc_flags,L.fc_flags_size,false);return obj;}
    function egd(v){const at=address(v);if(!at)return 0;const obj=structure(at,'egd',['fcbeg','fcend','vroom','gdx','gdy','ogx','ogy','warncnt','dropgoldcnt']);sized(obj,'parentmid',()=>at+L.egd_parentmid,L.egd_parentmid_size,false);Object.defineProperty(obj,'gdlevel',{get(){return level(at+L.egd_gdlevel);}});obj.fakecorr=indexed(i=>fakecorr(at+L.egd_fakecorr+i*L.fakecorrSize));for(const[i,key]of['gddone','witness'].entries())Object.defineProperty(obj,key,{get(){return services.egdBit(obj,i);},set(v){services.setEgdBit(obj,i,v);}});return obj;}
    function extra(v){const at=address(v);if(!at)return 0;const obj={address:at};ptr(obj,'egd',()=>at+L.extra_egd,egd);return obj;}
    function permonst(v){const at=address(v);if(!at)return 0;const obj={address:at};sized(obj,'msound',()=>at+L.pm_msound,L.pm_msound_size,false);return obj;}
    function monster(v){const at=address(v);if(!at)return 0;const obj=structure(at,'mon',['mhp','mhpmax','mx','my','mux','muy','mtame','weapon_check']);for(const key of['m_id','mappearance','m_ap_type'])sized(obj,key,()=>at+L['mon_'+key],L['mon_'+key+'_size'],false);ptr(obj,'nmon',()=>at+L.mon_nmon,monster);ptr(obj,'mextra',()=>at+L.mon_mextra,extra);ptr(obj,'data',()=>at+L.mon_data,permonst);ptr(obj,'mw',()=>at+L.mon_mw,object);ptr(obj,'minvent',()=>at+L.mon_minvent,object);for(const[i,key]of['isgd','mpeaceful','mcansee'].entries())Object.defineProperty(obj,key,{get(){return services.monsterBit(obj,i);},set(v){services.setMonsterBit(obj,i,v);}});return obj;}
    function object(v){const at=address(v);if(!at)return 0;const obj=structure(at,'obj',['otyp','ox','oy','where']);ptr(obj,'nobj',()=>at+L.obj_nobj,object);ptr(obj,'cobj',()=>at+L.obj_cobj,object);field(obj,'quan',()=>at+L.obj_quan,'BigInt64');Object.defineProperty(obj,'cknown',{get(){return services.objectCknown(obj);}});return obj;}
    const trap=v=>address(v)?{address:address(v)}:0;
    const monsterPointer=v=>{const at=address(v),obj={address:at};ptr(obj,'value',()=>at,monster);return obj;};
    const coordPointer=v=>{const at=address(v),obj={address:at};field(obj,'value',()=>at,'Int16');return obj;};
    const coord=v=>structure(address(v),'coord',['x','y']);
    const u=structure(global(0),'u',['ux','uy','uhp','mh','umonster','uinvault']);Object.defineProperty(u,'uz',{get(){return level(global(0)+L.u_uz);}});Object.defineProperty(u,'urooms',{get(){return global(0)+L.u_urooms;}});u.ualign=structure(global(0)+L.u_ualign,'align',['type']);ptr(u,'ustuck',()=>global(0)+L.u_ustuck,monster);for(const[i,key]of['uswallow','uundetected'].entries())Object.defineProperty(u,key,{get(){return services.heroBit(i);}});
    const gm={},gv={},program_state={},svc={context:{polearm:{}}},gy={},gi={},svm={},svp={},flags={},svr={};
    ptr(gm,'migrating_mons',()=>global(2),monster);field(gm,'multi',()=>global(12),'BigInt64');field(gv,'vision_full_recalc',()=>global(7),'Int8');field(program_state,'stopprint',()=>global(8),'Int32');ptr(svc.context.polearm,'hitmon',()=>global(9),monster);Object.defineProperty(gy,'youmonst',{get(){return monster(global(10));}});ptr(gi,'invent',()=>global(11),object);Object.defineProperty(svp,'plname',{get(){return global(14);}});field(flags,'female',()=>global(17),'Int8');
    svr.rooms=indexed(i=>structure(global(5)+i*L.roomSize,'room',['lx','hx','ly','hy','rtype']));
    svm.mvitals=indexed(i=>{const obj={};sized(obj,'died',()=>global(13)+i*L.mvitalSize+L.vital_died,L.vital_died_size,false);return obj;});
    const vizAt=(x,y)=>pointer(pointer(global(6))+y*L.pointerSize)+x;
    gv.viz_array=indexed(y=>indexed(x=>view().getUint8(vizAt(x,y)),(x,v)=>view().setUint8(vizAt(x,y),v)));
    const levl=indexed(x=>indexed(y=>{const at=global(3)+(x*L.ROWNO+y)*L.rmSize,obj=structure(at,'rm',['typ']);for(const[i,key]of['flags','lit','waslit','wall_info','doormask'].entries())Object.defineProperty(obj,key,{get(){return services.terrainBit(x,y,i);},set(v){services.setTerrainBit(x,y,i,v);}});return obj;}));
    const grid=(x,y)=>global(4)+(x*L.ROWNO+y)*L.pointerSize;
    const env=Object.assign(Object.create(services),L,{u,gm,gv,program_state,svc,gy,gi,svm,svp,flags,svr,levl,monster,object,extra,egd,trap,permonst,monsterPointer,coordPointer,address,
        int,long:v=>BigInt.asIntN(64,BigInt(v)),coordxy:v=>int(v)<<16>>16,schar:v=>int(v)<<24>>24,uchar:v=>int(v)&255,
        coordLocal:()=>coord(services.stackAlloc(L.coordStructSize)),coordLocalPointer:()=>coordPointer(services.stackAlloc(L.coordSize)),
        egdCoordPointer:(obj,key)=>coordPointer(address(obj)+L['egd_'+key]),migratingPointer:()=>global(2),
        copyCoord:(out,source)=>{out.x=source.x;out.y=source.y;},
        samePtr:(a,b)=>raw(a)===raw(b),abs:v=>int(Math.abs(int(v))),
        loadChar:at=>view().getInt8(address(at)),storeChar:(at,v)=>view().setInt8(address(at),v),
        mons:indexed(i=>permonst(global(15)+i*L.permonstSize)),objects:indexed(i=>({get oc_class(){return services.objectClass(i);}})),
        DEADMONSTER:mon=>mon.mhp<1,carried:obj=>obj.where===L.OBJ_INVENT,Has_contents:obj=>Boolean(obj.cobj),MON_WEP:mon=>mon.mw,
        IS_WALL:typ=>Boolean(typ&&typ<=L.DBWALL),IS_STWALL:typ=>typ<=L.DBWALL,IS_OBSTRUCTED:typ=>typ<L.POOL,
        ACCESSIBLE:typ=>typ>=L.DOOR,IS_ROOM:typ=>typ>=L.ROOM,IS_POOL:typ=>typ>=L.POOL&&typ<=L.DRAWBRIDGE_UP,
        u_at:(x,y)=>u.ux===x&&u.uy===y,m_at:(x,y)=>monster(pointer(grid(x,y))),MON_AT:(x,y)=>Boolean(pointer(grid(x,y))),
        remove_monster:(x,y)=>view().setBigUint64(grid(x,y),0n,true),
        distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        cansee:(x,y)=>Boolean(view().getUint8(vizAt(x,y))&L.IN_SIGHT),couldsee:(x,y)=>Boolean(view().getUint8(vizAt(x,y))&L.COULD_SEE),
        is_silent:pm=>pm.msound===L.MS_SILENT,SetVoice(){},
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    Object.defineProperties(env,{fmon:{get(){return monster(pointer(global(1)));},set(v){view().setBigUint64(global(1),raw(v),true);}},uball:{get(){return object(pointer(global(16)));}},Punished:{get(){return Boolean(pointer(global(16)));}},U_AP_TYPE:{get(){return gy.youmonst.m_ap_type&L.M_AP_TYPMASK;}}});
    for(const[i,key]of['Upolyd','Blind','Deaf','Strangled'].entries())Object.defineProperty(env,key,{get(){return Boolean(services.flag(i));}});
    env.mhe=mon=>services.pronoun(mon,0);env.noit_mhis=mon=>services.pronoun(mon,1);
    for(const key of['sobj_at','g_at','m_carrying'])env[key]=(...args)=>object(services[key](...args));
    env.makemon=(...args)=>monster(services.makemon(...args));env.newmextra=(...args)=>extra(services.newmextra(...args));env.t_at=(...args)=>trap(services.t_at(...args));
    return env;
}
