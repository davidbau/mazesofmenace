import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Native views and header macros; drawbridge policy remains in dbridge.js.
export function createDbridgeEnvironment(services, layout) {
    const widths={pointerSize:8,longSize:8,intSize:4,coordSize:2,booleanSize:1,
        entity_emon_size:8,entity_edata_size:8,entity_ex_size:4,entity_ey_size:4,
        mon_data_size:8,mon_mx_size:2,mon_my_size:2,mon_mhp_size:4,
        pm_mflags1_size:8,pm_mlet_size:1,pm_mmove_size:1,obj_ox_size:2,obj_oy_size:2,
        rm_typ_size:1,u_ux_size:2,u_uy_size:2,u_usteed_size:8,
        prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        coord_x_size:2,coord_y_size:2,level_dnum_size:2,level_dlevel_size:2,gender_he_size:8,
        ENTITIES:2,phraseSize:80,config_DEBUG:1,config_D_DEBUG:0,config_EXTRA_SANITY_CHECKS:0};
    for(const[key,value]of Object.entries(widths))if(layout[key]!==value)
        throw new Error('Review changed drawbridge ABI: '+key);
    const raw=value=>CAdapter.unsignedPointer(value);
    const address=value=>Number(value?.address??value??0);
    const identity=value=>{const bits=raw(value);return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits);};
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>identity(view().getBigUint64(at,true));
    const global=i=>address(services.global(i));
    const int=value=>CAdapter.signedInt(value);
    const coordxy=value=>int(value)<<16>>16;
    const boolean=value=>int(value)<<24>>24;
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const pointerField=(obj,key,at,wrap=value=>value)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    const samePtr=(a,b)=>raw(a)===raw(b);
    function permonst(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        scalar(obj,'mflags1',()=>at+layout.pm_mflags1,'BigUint64');
        scalar(obj,'mlet',()=>at+layout.pm_mlet,'Int8');scalar(obj,'mmove',()=>at+layout.pm_mmove,'Int8');return obj;}
    function monster(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        pointerField(obj,'data',()=>at+layout.mon_data,permonst);
        for(const[key,kind]of[['mx','Int16'],['my','Int16'],['mhp','Int32']])scalar(obj,key,()=>at+layout['mon_'+key],kind);
        for(const[i,key]of['wormno','msleeping','mcanmove','mconf','mstun'].entries())
            Object.defineProperty(obj,key,{get(){return services.monsterBit(at,i);}});
        return obj;}
    function entity(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        pointerField(obj,'emon',()=>at+layout.entity_emon,monster);pointerField(obj,'edata',()=>at+layout.entity_edata,permonst);
        for(const key of['ex','ey'])scalar(obj,key,()=>at+layout['entity_'+key],'Int32');return obj;}
    function object(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        for(const key of['ox','oy'])scalar(obj,key,()=>at+layout['obj_'+key],'Int16');return obj;}
    function trap(value){const at=address(value);return at?{address:identity(value)}:0;}
    function coord(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        for(const key of['x','y'])scalar(obj,key,()=>at+layout['coord_'+key],'Int16');return obj;}
    function level(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        for(const key of['dnum','dlevel'])scalar(obj,key,()=>at+layout['level_'+key],'Int16');return obj;}
    const coordPointer=value=>{const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        scalar(obj,'value',()=>at,'Int16');return obj;};
    const u={uevent:{}},go={},gy={},svk={killer:{}},svc={context:{}},gm={},iflags={};
    scalar(u,'ux',()=>global(0)+layout.u_ux,'Int16');scalar(u,'uy',()=>global(0)+layout.u_uy,'Int16');
    Object.defineProperty(u,'uz',{get(){return level(global(0)+layout.u_uz);}});
    pointerField(u,'usteed',()=>global(0)+layout.u_usteed,monster);
    for(const[i,key]of['uopened_dbridge','uheard_tune'].entries())
        Object.defineProperty(u.uevent,key,{get(){return services.heroEvent(i);},set(value){services.setHeroEvent(i,value);}});
    Object.defineProperty(go,'occupants',{get(){return indexed(i=>entity(global(1)+layout.occupants+i*layout.entitySize));}});
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(2)+layout.youmonst);}});
    scalar(svk.killer,'format',()=>global(5)+layout.killerFormat,'Int32');
    Object.defineProperty(svk.killer,'name',{get(){return global(5)+layout.killerName;}});
    scalar(svc.context,'mon_moving',()=>global(6)+layout.monMoving,'Int8');
    scalar(gm,'multi',()=>global(7)+layout.multi,'BigInt64');
    scalar(iflags,'last_msg',()=>global(9)+layout.lastMsg,'Int32');
    const mons=indexed(i=>permonst(global(10)+i*layout.permonstSize));
    const levl=indexed(x=>indexed(y=>{const at=global(3)+layout.locations+(x*layout.ROWNO+y)*layout.rmSize,obj={address:at};
        scalar(obj,'typ',()=>at+layout.rm_typ,'Int8');
        for(const[i,key]of['drawbridgemask','doormask','wall_info','horizontal','icedpool'].entries())
            Object.defineProperty(obj,key,{get(){return services.terrainBit(x,y,i);},set(value){services.setTerrainBit(x,y,i,value);}});
        return obj;}));
    const gridAddress=(x,y)=>global(3)+layout.monsters+(x*layout.ROWNO+y)*layout.pointerSize;
    const prop=(id,key)=>view().getBigInt64(global(0)+layout.u_uprops+id*layout.propSize+layout['prop_'+key],true);
    const either=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic'));
    const flag=(pm,key)=>Boolean(pm.mflags1&BigInt(layout[key]));
    const checkLevel=(lev,key)=>{const target=level(global(4)+layout[key]);
        return Boolean((target.dnum||target.dlevel)&&services.on_level(lev,target));};
    const env=Object.assign(Object.create(services),layout,{
        entity,monster,permonst,object,trap,coord,level,coordPointer,
        coordLocal:()=>coord(services.stackAlloc(layout.coordStructSize)),
        coordLocalValue:()=>coordPointer(services.stackAlloc(layout.coordSize)),
        u,go,gy,svk,svc,gm,iflags,mons,levl,int,coordxy,boolean,bool:value=>Number(Boolean(value)),samePtr,
        charPointer:value=>typeof value==='string'?services.literal(value):identity(value),
        loadChar:at=>view().getInt8(address(at)),storeChar:(at,value)=>view().setInt8(address(at),value),
        IS_WATERWALL:typ=>typ===layout.WATER,IS_WALL:typ=>Boolean(typ&&typ<=layout.DBWALL),
        IS_DRAWBRIDGE:typ=>typ===layout.DRAWBRIDGE_UP||typ===layout.DRAWBRIDGE_DOWN,
        Is_juiblex_level:lev=>checkLevel(lev,'juiblex'),Is_stronghold:lev=>checkLevel(lev,'stronghold'),
        m_at:(x,y)=>monster(pointer(gridAddress(x,y))),
        remove_monster:(x,y)=>view().setBigUint64(gridAddress(x,y),0n,true),
        OBJ_AT:(x,y)=>Boolean(pointer(global(3)+layout.objects+(x*layout.ROWNO+y)*layout.pointerSize)),
        u_at:(x,y)=>u.ux===x&&u.uy===y,distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),
        noncorporeal:pm=>pm.mlet===layout.S_GHOST,is_swimmer:pm=>flag(pm,'M1_SWIM'),
        is_flyer:pm=>flag(pm,'M1_FLY'),is_floater:pm=>pm.mlet===layout.S_EYE||pm.mlet===layout.S_LIGHT,
        passes_walls:pm=>flag(pm,'M1_WALLWALK'),
        likes_lava:pm=>samePtr(pm,mons[layout.PM_FIRE_ELEMENTAL])||samePtr(pm,mons[layout.PM_SALAMANDER]),
        DEADMONSTER:mon=>mon.mhp<1,helpless:mon=>Boolean(mon.msleeping||!mon.mcanmove),
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        mhe:mon=>pointer(global(11)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_he),
        cansee:(x,y)=>{const rows=pointer(global(8)+layout.vizArray),row=pointer(address(rows)+y*layout.pointerSize);
            return Boolean(view().getUint8(address(row)+x)&layout.IN_SIGHT);},
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        Wwalking:{get(){return Boolean(either(layout.WWALKING)&&!checkLevel(u.uz,'water'));}},
        Amphibious:{get(){return either(layout.MAGICAL_BREATHING)||flag(gy.youmonst.data,'M1_AMPHIBIOUS');}},
        Breathless:{get(){return either(layout.MAGICAL_BREATHING)||flag(gy.youmonst.data,'M1_BREATHLESS');}},
        Swimming:{get(){return either(layout.SWIMMING)||Boolean(u.usteed&&flag(u.usteed.data,'M1_SWIM'));}},
        Flying:{get(){return Boolean((either(layout.FLYING)||(u.usteed&&flag(u.usteed.data,'M1_FLY')))&&!prop(layout.FLYING,'blocked'));}},
        Levitation:{get(){return Boolean(either(layout.LEVITATION)&&!prop(layout.LEVITATION,'blocked'));}},
        Passes_walls:{get(){return either(layout.PASSES_WALLS);}},Fumbling:{get(){return either(layout.FUMBLING);}},
        Confusion:{get(){return prop(layout.CONFUSION,'intrinsic');}},Stunned:{get(){return prop(layout.STUNNED,'intrinsic');}},
        Hallucination:{get(){return Boolean(prop(layout.HALLUC,'intrinsic')&&!either(layout.HALLUC_RES));}},
        Deaf:{get(){return Boolean(either(layout.DEAF)||services.roleplayDeaf());}},
        Underwater:{get(){return services.heroBit(0);}},
        Unaware:{get(){return Boolean(gm.multi<0&&(services.unconscious()||services.is_fainted()));}},
    });
    env.t_at=(...args)=>trap(services.t_at(...args));
    env.sobj_at=(...args)=>object(services.sobj_at(...args));
    env.mksobj_at=(...args)=>object(services.mksobj_at(...args));
    return env;
}
