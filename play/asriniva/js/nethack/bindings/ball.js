import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Native layout and header macros; ball and chain policy remains in ball.js.
export function createBallState(services, layout) {
    let bcrestriction = 0;
    return {get bcrestriction(){return bcrestriction;},
        set bcrestriction(value){bcrestriction = Number(BigInt.asIntN(32,BigInt(value)));}};
}

export function createBallEnvironment(services, layout, state) {
    const widths={pointerSize:8,longSize:8,intSize:4,coordSize:2,booleanSize:1,
        obj_nobj_size:8,obj_nexthere_size:8,obj_ox_size:2,obj_oy_size:2,
        obj_where_size:1,obj_otyp_size:2,obj_owt_size:4,obj_quan_size:8,obj_owornmask_size:8,
        u_ux_size:2,u_uy_size:2,u_ux0_size:2,u_uy0_size:2,u_dx_size:4,u_dy_size:4,
        u_bglyph_size:4,u_cglyph_size:4,u_bc_order_size:4,u_bc_felt_size:4,
        u_utrap_size:4,u_utraptype_size:4,u_uluck_size:1,u_moreluck_size:1,
        u_usteed_size:8,rm_glyph_size:4,rm_typ_size:1,
        prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        level_dnum_size:2,level_dlevel_size:2,config_BREADCRUMBS:0};
    for(const[key,value]of Object.entries(widths))if(layout[key]!==value)
        throw new Error('Review changed ball ABI: '+key);
    if(![0,1].includes(layout.config_DEVELOPMENT_LOG))throw new Error('Missing ball development configuration');
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const global=i=>address(services.global(i));
    const int=value=>CAdapter.signedInt(value);
    const coordxy=value=>int(value)<<16>>16;
    const boolean=value=>int(value)<<24>>24;
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const pointerField=(obj,key,at,wrap)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function monster(value){const at=address(value);return at?{address:at}:0;}
    function object(value){const at=address(value);if(!at)return 0;const obj={address:at};
        pointerField(obj,'nobj',()=>at+layout.obj_nobj,object);
        pointerField(obj,'nexthere',()=>at+layout.obj_nexthere,object);
        for(const[key,kind]of[['ox','Int16'],['oy','Int16'],['where','Int8'],['otyp','Int16'],
            ['owt','Uint32'],['quan','BigInt64'],['owornmask','BigInt64']])
            scalar(obj,key,()=>at+layout['obj_'+key],kind);
        return obj;}
    function trap(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[i,key]of['ttyp','tseen'].entries())Object.defineProperty(obj,key,{
            get(){return services.trapBit(at,i);},set(value){services.setTrapBit(at,i,value);},
        });return obj;}
    function level(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const key of['dnum','dlevel'])scalar(obj,key,()=>at+layout['level_'+key],'Int16');return obj;}
    const u={},flags={},gv={},gi={},svl={level:{}};
    for(const[key,kind]of[['ux','Int16'],['uy','Int16'],['ux0','Int16'],['uy0','Int16'],
        ['dx','Int32'],['dy','Int32'],['bglyph','Int32'],['cglyph','Int32'],['bc_order','Int32'],
        ['bc_felt','Int32'],['utrap','Uint32'],['utraptype','Uint32'],['uluck','Int8'],['moreluck','Int8']])
        scalar(u,key,()=>global(0)+layout['u_'+key],kind);
    Object.defineProperty(u,'uswallow',{get(){return services.heroBit(0);}});
    Object.defineProperty(u,'uz',{get(){return level(global(0)+layout.u_uz);}});
    pointerField(u,'usteed',()=>global(0)+layout.u_usteed,monster);
    pointerField(gi,'invent',()=>global(3)+layout.invent,object);
    scalar(flags,'verbose',()=>global(4)+layout.verbose,'Int8');
    scalar(gv,'vision_full_recalc',()=>global(5)+layout.visionRecalc,'Int8');
    const objectGrid=indexed(x=>indexed(y=>object(pointer(global(1)+layout.objects+(x*layout.ROWNO+y)*layout.pointerSize))));
    const monsterAt=(x,y)=>monster(pointer(global(1)+layout.monsters+(x*layout.ROWNO+y)*layout.pointerSize));
    Object.defineProperty(svl.level,'objects',{get(){return objectGrid;}});
    const levl=indexed(x=>indexed(y=>{const at=global(1)+layout.locations+(x*layout.ROWNO+y)*layout.rmSize,obj={address:at};
        scalar(obj,'glyph',()=>at+layout.rm_glyph,'Int32');scalar(obj,'typ',()=>at+layout.rm_typ,'Int8');
        Object.defineProperty(obj,'doormask',{get(){return services.terrainBit(x,y,0);}});return obj;}));
    const scalarPointer=(value,kind)=>{const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'value',()=>at,kind);return obj;};
    const prop=(id,key)=>view().getBigInt64(global(0)+layout.u_uprops+id*layout.propSize+layout['prop_'+key],true);
    const env=Object.assign(Object.create(services),layout,{
        ballState:state,object,monster,trap,level,u,gi,gv,flags,svl,levl,int,coordxy,boolean,
        abs:value=>int(Math.abs(int(value))),
        long:value=>BigInt.asIntN(64,BigInt(value)),
        intPointer:value=>scalarPointer(value,'Int32'),coordPointer:value=>scalarPointer(value,'Int16'),
        booleanPointer:value=>scalarPointer(value,'Int8'),
        samePtr:(a,b)=>raw(a)===raw(b),carried:obj=>obj.where===layout.OBJ_INVENT,
        IS_OBSTRUCTED:typ=>typ<layout.POOL,IS_DOOR:typ=>typ===layout.DOOR,
        is_pit:type=>type===layout.PIT||type===layout.SPIKED_PIT,
        is_hole:type=>type===layout.HOLE||type===layout.TRAPDOOR,
        m_at:monsterAt,MON_AT:(x,y)=>Boolean(monsterAt(x,y)),
        Is_waterlevel:lev=>{const water=level(global(2)+layout.waterLevel);
            return Boolean((water.dnum||water.dlevel)&&services.on_level(lev,water));},
        rn1:(range,base,line,caller)=>int(services.rn2(range,line,caller)+base),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const name of['W_BALL','W_WEAPONS','W_CHAIN','LEFT_SIDE','RIGHT_SIDE'])env[name]=BigInt(layout[name]);
    for(const name of['override_restriction'])env[name]=Number(BigInt.asIntN(64,BigInt(layout[name])));
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        Blind:{get(){return Boolean((prop(layout.BLINDED,'intrinsic')||prop(layout.BLINDED,'extrinsic'))&&!prop(layout.BLINDED,'blocked'));}},
        Levitation:{get(){return Boolean((prop(layout.LEVITATION,'intrinsic')||prop(layout.LEVITATION,'extrinsic'))&&!prop(layout.LEVITATION,'blocked'));}},
        Half_physical_damage:{get(){return Boolean(prop(layout.HALF_PHDAM,'intrinsic')||prop(layout.HALF_PHDAM,'extrinsic'));}},
        Punished:{get(){return Boolean(env.uball);}},Luck:{get(){return u.uluck+u.moreluck;}},
    });
    for(const[i,key]of['uball','uchain','uwep','uswapwep','uquiver','uarmh'].entries())
        Object.defineProperty(env,key,{get(){return object(services.equipment(i));}});
    const nativeTrap=services.t_at;
    env.t_at=(...args)=>trap(nativeTrap(...args));
    return env;
}
