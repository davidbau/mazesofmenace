import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Compiler-described native views and header macros; all eight source routines
// and the explosion table remain in explode.js. Each heap read obtains the
// current backing buffer so nested dependencies may grow Wasm memory safely.
export function createExplodeEnvironment(services, layout) {
    for(const [key,value] of Object.entries({pointerSize:8,longSize:8,intSize:4,coordSize:2,booleanSize:1,mon_data_size:8,mon_mx_size:2,mon_my_size:2,mon_mhp_size:4,mon_minvent_size:8,mon_m_ap_type_size:1,pm_mlevel_size:1,obj_ox_size:2,obj_oy_size:2,obj_quan_size:8,obj_owt_size:4,obj_otyp_size:2,obj_spe_size:1,atk_damn_size:1,atk_damd_size:1,atk_adtyp_size:1,u_ux_size:2,u_uy_size:2,u_mh_size:4,u_uhp_size:4,u_usteed_size:8,u_ustuck_size:8,rm_typ_size:1,coord_x_size:2,coord_y_size:2,chain_next_size:8,chain_obj_size:8,chain_ox_size:2,chain_oy_size:2,chain_dx_size:1,chain_dy_size:1,chain_range_size:4,chain_stopped_size:1,config_SOUND:0,S_expl_tl:96,S_expl_tc:97,S_expl_tr:98,S_expl_ml:99,S_expl_mc:100,S_expl_mr:101,S_expl_bl:102,S_expl_bc:103,S_expl_br:104}))
        if(layout[key]!==value)throw new Error('Review changed EXPLODE ABI: '+key);
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const global=i=>address(services.global(i));
    const int=value=>CAdapter.signedInt(value);
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const ptr=(obj,key,at,wrap)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function permonst(value){const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'mlevel',()=>at+layout.pm_mlevel,'Int8');return obj;}
    function monster(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptr(obj,'data',()=>at+layout.mon_data,permonst);ptr(obj,'minvent',()=>at+layout.mon_minvent,object);
        for(const[key,kind]of[['mx','Int16'],['my','Int16'],['mhp','Int32'],['m_ap_type','Uint8']])scalar(obj,key,()=>at+layout['mon_'+key],kind);
        Object.defineProperty(obj,'mtrapped',{get(){return services.monsterBit(obj,0);},set(v){services.setMonsterBit(obj,0,v);}});return obj;}
    function object(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[key,kind]of[['ox','Int16'],['oy','Int16'],['quan','BigInt64'],['owt','Uint32'],['otyp','Int16'],['spe','Int8']])scalar(obj,key,()=>at+layout['obj_'+key],kind);
        for(const[i,key]of['odiluted','lamplit','how_lost'].entries())Object.defineProperty(obj,key,{get(){return services.objectBit(obj,i);},set(v){services.setObjectBit(obj,i,v);}});return obj;}
    function trap(value){const at=address(value);if(!at)return 0;return {address:at,get ttyp(){return services.trapType(at);}};}
    function attack(value){const at=address(value);if(!at)return 0;const obj={address:at};for(const key of['damn','damd','adtyp'])scalar(obj,key,()=>at+layout['atk_'+key],'Uint8');return obj;}
    function coord(value){const at=address(value);const obj={address:at};for(const key of['x','y'])scalar(obj,key,()=>at+layout['coord_'+key],'Int16');return obj;}
    function scatterChain(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptr(obj,'next',()=>at+layout.chain_next,scatterChain);ptr(obj,'obj',()=>at+layout.chain_obj,object);
        for(const[key,kind]of[['ox','Int16'],['oy','Int16'],['dx','Int8'],['dy','Int8'],['range','Int32'],['stopped','Int8']])scalar(obj,key,()=>at+layout['chain_'+key],kind);return obj;}
    const u={},gy={},svk={killer:{}},svc={context:{}},gi={},gm={},gb={},gt={},flags={},iflags={},disp={},svl={level:{}};
    for(const[key,kind]of[['ux','Int16'],['uy','Int16'],['mh','Int32'],['uhp','Int32']])scalar(u,key,()=>global(0)+layout['u_'+key],kind);
    ptr(u,'usteed',()=>global(0)+layout.u_usteed,monster);ptr(u,'ustuck',()=>global(0)+layout.u_ustuck,monster);
    Object.defineProperty(u,'urooms',{get(){return global(0)+layout.u_urooms;}});
    for(const[i,key]of['uswallow','uundetected'].entries())Object.defineProperty(u,key,{get(){return services.heroFlag(12+i);}});
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(1));}});
    scalar(svk.killer,'format',()=>global(5),'Int32');Object.defineProperty(svk.killer,'name',{get(){return global(6);}});
    scalar(svc.context,'mon_moving',()=>global(7),'Int8');ptr(gi,'invent',()=>global(8),object);
    // multi is a C long, but only its truth value is observed by this TU.
    scalar(gm,'multi',()=>global(9),'BigInt64');Object.defineProperty(gb,'bhitpos',{get(){return coord(global(10));}});
    ptr(gt,'thrownobj',()=>global(11),object);scalar(flags,'sparkle',()=>global(12),'Int8');scalar(flags,'verbose',()=>global(13),'Int8');scalar(iflags,'last_msg',()=>global(14),'Int32');
    Object.defineProperty(disp,'botl',{get(){return services.heroFlag(15);},set(v){services.setBotl(v);}});
    const grid=(g,x,y)=>global(g)+(x*layout.ROWNO+y)*layout.pointerSize;
    const objectGrid=indexed(x=>indexed(y=>object(pointer(grid(3,x,y)))));
    Object.defineProperty(svl.level,'objects',{get(){return objectGrid;}});
    const levl=indexed(x=>indexed(y=>{const at=global(2)+(x*layout.ROWNO+y)*layout.rmSize,obj={address:at};scalar(obj,'typ',()=>at+layout.rm_typ,'Int8');return obj;}));
    const env=Object.assign(Object.create(services),layout,{u,gy,svk,svc,gi,gm,gb,gt,flags,iflags,disp,svl,levl,
        monster,object,permonst,attack,scatterChain,trap,int,coordxy:value=>int(value)<<16>>16,boolean:value=>int(value)<<24>>24,
        samePtr:(a,b)=>typeof a==='string'||typeof b==='string'?a===b:raw(a)===raw(b),
        objectField:(obj,key)=>({address:address(obj)+layout['chain_'+key]}),
        loadChar:at=>view().getInt8(address(at)),storeChar:(at,v)=>view().setInt8(address(at),v),
        booleanLocal(value){const at=services.stackAlloc(1),obj={address:at};scalar(obj,'value',()=>at,'Int8');obj.value=value;return obj;},
        abs:value=>int(Math.abs(int(value))),DEADMONSTER:mon=>mon.mhp<1,
        u_at:(x,y)=>u.ux===x&&u.uy===y,m_at:(x,y)=>monster(pointer(grid(4,x,y))),
        next2u:(x,y)=>Math.abs(u.ux-x)<=1&&Math.abs(u.uy-y)<=1,
        engulfing_u:mon=>Boolean(u.uswallow&&raw(mon)===raw(u.ustuck)),
        Maybe_Half_Phys:damage=>services.heroFlag(14)?Math.trunc(int(damage+1)/2):damage,
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        cansee:(x,y)=>services.displayMacro(0,x,y),explosion_to_glyph:(type,index)=>services.displayMacro(1,type,index),cmap_to_glyph:index=>services.displayMacro(2,index,0),
        ZAP_POS:typ=>typ>=layout.POOL,IS_SINK:typ=>typ===layout.SINK,
        objects:indexed(type=>({get oc_dir(){return services.objectClassBit(type,0);},get oc_material(){return services.objectClassBit(type,1);}})),
        xdir:indexed(i=>view().getInt8(global(16)+i)),ydir:indexed(i=>view().getInt8(global(17)+i)),shield_static:indexed(i=>view().getInt32(global(18)+i*4,true)),
        Soundeffect(){}, // Configured header macro expands to no operation (guard above).
        nh_delay_output:()=>services.delay(),uhim:()=>services.pronoun(0),uhis:()=>services.pronoun(1),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const[i,key]of['Antimagic','Fire_resistance','Cold_resistance','Disint_resistance','Shock_resistance','Poison_resistance','Acid_resistance','Hallucination','Deaf','Invulnerable','Upolyd','Role_switch'].entries())Object.defineProperty(env,key,{get(){return services.heroFlag(i);}});
    for(const[i,key]of['nonliving','is_demon','digests','completelyburns','bigmonst','hides_under'].entries())env[key]=pm=>services.permonstMacro(pm,i);
    for(const[i,key]of['resists_fire','resists_cold','resists_disint','resists_elec','resists_poison','resists_acid','is_vampshifter'].entries())env[key]=mon=>services.monsterMacro(mon,i);
    for(const[i,key]of['uball','uchain'].entries())Object.defineProperty(env,key,{get(){return object(pointer(global(19+i)));}});
    for(const key of['splitobj','sobj_at'])env[key]=(...args)=>object(services[key](...args));
    env.shop_keeper=(...args)=>monster(services.shop_keeper(...args));env.t_at=(...args)=>trap(services.t_at(...args));
    return env;
}
