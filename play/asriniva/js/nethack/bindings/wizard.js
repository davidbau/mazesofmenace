import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Live native storage and header expansions; Wizard policy remains in wizard.js.
export function createWizardEnvironment(services, layout, namespace) {
    const widths={pointerSize:8,longSize:8,intSize:4,shortSize:2,shortSigned:1,
        booleanSize:1,booleanSigned:1,coordxySize:2,coordxySigned:1,charSize:1,charSigned:1,
        mon_nmon_size:8,mon_data_size:8,mon_minvent_size:8,mon_mx_size:2,mon_my_size:2,
        mon_mux_size:2,mon_muy_size:2,mon_m_id_size:4,mon_mstrategy_size:8,mon_mhp_size:4,
        mon_mhpmax_size:4,mon_mtame_size:1,mon_m_ap_type_size:1,mon_mappearance_size:4,
        mon_mspec_used_size:4,mon_mlstmv_size:8,mon_mextra_size:8,
        pm_mflags2_size:8,pm_mflags3_size:2,pm_difficulty_size:1,pm_mlet_size:1,
        pm_maligntyp_size:1,pm_geno_size:2,obj_nobj_size:8,obj_otyp_size:2,
        obj_oartifact_size:1,obj_ox_size:2,obj_oy_size:2,stair_next_size:8,
        stair_sx_size:2,stair_sy_size:2,trap_ntrap_size:8,trap_tx_size:2,trap_ty_size:2,
        u_ux_size:2,u_uy_size:2,u_ulevel_size:4,u_uhp_size:4,u_udg_cnt_size:4,u_ustuck_size:8,
        prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        level_dnum_size:2,level_dlevel_size:2,coord_x_size:2,coord_y_size:2,
        mextra_emin_size:8,emin_renegade_size:1,mvital_mvflags_size:1,sym_sym_size:1,
        fmon_size:8,fobj_size:8,migratingMons_size:8,moves_size:8,noOfWizards_size:4,
        madeAmulet_size:1,ftrap_size:8,stairs_size:8,vizArray_size:8,config_SND_LIB_INTEGRATED:0,
        config_NDEBUG:0};
    for(const [key,expected]of Object.entries(widths))
        if(layout[key]!==expected)throw new Error('Review changed wizard ABI: '+key);
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const global=i=>address(services.global(i));
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const int=value=>CAdapter.signedInt(value);
    const short=value=>int(value)<<16>>16;
    const boolean=value=>int(value)<<24>>24;
    const long=value=>BigInt.asIntN(64,BigInt(value));
    const ulong=value=>BigInt.asUintN(64,BigInt(value));
    const scalar=(obj,key,at,kind)=>Object.defineProperty(obj,key,{
        get(){return view()['get'+kind](at(),true);},
        set(value){view()['set'+kind](at(),kind.includes('Big')?BigInt(value):Number(value),true);},
    });
    const ptrField=(obj,key,at,wrap=value=>value)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=(get,at)=>new Proxy({address:at},{get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function coord(value){const at=address(value),obj={address:at};
        for(const k of ['x','y'])scalar(obj,k,()=>at+layout['coord_'+k],'Int16');return obj;}
    function level(value){const at=address(value),obj={address:at};
        for(const k of ['dnum','dlevel'])scalar(obj,k,()=>at+layout['level_'+k],'Int16');return obj;}
    function object(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptrField(obj,'nobj',()=>at+layout.obj_nobj,object);
        for(const[k,kind]of[['otyp','Int16'],['oartifact','Int8'],['ox','Int16'],['oy','Int16']])
            scalar(obj,k,()=>at+layout['obj_'+k],kind);return obj;}
    function permonst(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[k,kind]of[['mflags2','BigUint64'],['mflags3','Uint16'],['difficulty','Uint8'],
            ['mlet','Int8'],['maligntyp','Int8'],['geno','Uint16']])scalar(obj,k,()=>at+layout['pm_'+k],kind);
        Object.defineProperty(obj,'pmnames',{get(){return indexed(i=>pointer(at+layout.pm_pmnames+i*8));}});return obj;}
    function emin(value){const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'renegade',()=>at+layout.emin_renegade,'Int8');return obj;}
    function mextra(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptrField(obj,'emin',()=>at+layout.mextra_emin,emin);return obj;}
    function monster(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[k,wrap]of[['nmon',monster],['data',permonst],['minvent',object],['mextra',mextra]])ptrField(obj,k,()=>at+layout['mon_'+k],wrap);
        for(const[k,kind]of[['mx','Int16'],['my','Int16'],['mux','Int16'],['muy','Int16'],
            ['m_id','Uint32'],['mstrategy','BigUint64'],['mhp','Int32'],['mhpmax','Int32'],
            ['mtame','Int8'],['m_ap_type','Uint8'],['mappearance','Uint32'],['mspec_used','Int32'],['mlstmv','BigInt64']])
            scalar(obj,k,()=>at+layout['mon_'+k],kind);
        Object.defineProperty(obj,'mgoal',{get(){return coord(at+layout.mon_mgoal);}});
        for(const[i,k]of['iswiz','isshk','ispriest','msleeping','mcanmove','mfrozen','mpeaceful',
            'mflee','mavenge','mrevived','isminion'].entries())Object.defineProperty(obj,k,{
            get(){return services.monsterBit(at,i);},set(value){services.setMonsterBit(at,i,value);},
        });return obj;}
    function stair(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptrField(obj,'next',()=>at+layout.stair_next,stair);
        for(const k of['sx','sy'])scalar(obj,k,()=>at+layout['stair_'+k],'Int16');
        Object.defineProperty(obj,'tolev',{get(){return level(at+layout.stair_tolev);}});return obj;}
    function trap(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptrField(obj,'ntrap',()=>at+layout.trap_ntrap,trap);
        for(const k of['tx','ty'])scalar(obj,k,()=>at+layout['trap_'+k],'Int16');
        Object.defineProperty(obj,'ttyp',{get(){return services.trapType(at);}});return obj;}
    const u={uhave:{},uevent:{}};
    for(const[k,kind]of[['ux','Int16'],['uy','Int16'],['ulevel','Int32'],['uhp','Int32'],['udg_cnt','Uint32']])
        scalar(u,k,()=>global(0)+layout['u_'+k],kind);
    ptrField(u,'ustuck',()=>global(0)+layout.u_ustuck,monster);
    Object.defineProperties(u,{uz:{get(){return level(global(0)+layout.u_uz);}},uswallow:{get(){return services.heroBit(7);}}});
    for(const[i,k]of['amulet','bell','menorah','book','questart'].entries())Object.defineProperty(u.uhave,k,{
        get(){return services.heroBit(i);},set(value){services.setHeroBit(i,value);},
    });
    for(const[i,k]of['invoked','udemigod'].entries())Object.defineProperty(u.uevent,k,{
        get(){return services.heroBit(i+5);},set(value){services.setHeroBit(i+5,value);},
    });
    const gm={},svm={},svc={context:{}},gf={},gs={};
    ptrField(gm,'migrating_mons',()=>global(2)+layout.migratingMons,monster);
    scalar(svm,'moves',()=>global(3)+layout.moves,'BigInt64');
    Object.defineProperty(svm,'mvitals',{get(){return indexed(i=>{const at=global(3)+layout.mvitals+i*layout.mvitalSize,obj={address:at};
        scalar(obj,'mvflags',()=>at+layout.mvital_mvflags,'Uint8');return obj;});}});
    scalar(svc.context,'no_of_wizards',()=>global(4)+layout.noOfWizards,'Uint32');
    scalar(svc.context,'made_amulet',()=>global(4)+layout.madeAmulet,'Int8');
    ptrField(gf,'ftrap',()=>global(5)+layout.ftrap,trap);ptrField(gs,'stairs',()=>global(6)+layout.stairs,stair);
    const mons=indexed(i=>permonst(global(9)+i*layout.permonstSize));
    const prop=(id,key)=>view().getBigInt64(global(0)+layout.u_uprops+id*layout.propSize+layout['prop_'+key],true);
    const active=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic'));
    const constants=Object.fromEntries(Object.entries(layout).map(([key,value])=>[key,key.startsWith('STRAT_')?BigInt(value):key.startsWith('M3_')?Number(value):value]));
    const listRef=at=>{const obj={address:at};ptrField(obj,'value',()=>at,monster);return obj;};
    const coordPointer=value=>{const at=address(value);if(!at)return 0;const obj={address:at};scalar(obj,'value',()=>at,'Int16');return obj;};
    const lcheck=(l,offset)=>{const target=level(global(11)+offset);return Boolean((target.dnum||target.dlevel)&&services.on_level(l,target));};
    const is_minion=pm=>Boolean(pm.mflags2&BigInt(layout.M2_MINION));
    const env=Object.assign(Object.create(services),constants,{
        address,int,short,boolean,long,ulong,object,monster,permonst,coord,level,stair,trap,
        u,gm,svm,svc,gf,gs,mons,coordPointer,
        samePtr:(a,b)=>raw(a)===raw(b),
        coordxyLocal:()=>coordPointer(services.stackAlloc(2)),coordLocal:()=>coord(services.stackAlloc(layout.coordSize)),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
        migratingRef:()=>listRef(global(2)+layout.migratingMons),nextMonRef:mon=>listRef(address(mon)+layout.mon_nmon),
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        min:Math.min,max:Math.max,DEADMONSTER:mon=>mon.mhp<1,
        helpless:mon=>Boolean(mon.msleeping||!mon.mcanmove),
        any_quest_artifact:obj=>obj.oartifact>=layout.ART_ORB_OF_DETECTION,
        is_covetous:pm=>pm.mflags3&Number(layout.M3_COVETOUS),is_minion,
        is_lminion:mon=>is_minion(mon.data)&&services.mon_aligntyp(mon)===layout.A_LAWFUL,
        EMIN:mon=>mon.mextra.emin,
        MON_AT:(x,y)=>Boolean(pointer(global(1)+layout.floorMonsters+(x*layout.ROWNO+y)*8)),
        u_at:(x,y)=>u.ux===x&&u.uy===y,
        distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),
        m_next2u:mon=>services.dist2(mon.mx,mon.my,u.ux,u.uy)<=2,
        monsym:pm=>view().getInt8(global(12)+pm.mlet*layout.classSymSize+layout.sym_sym),
        cansee(x,y){return Boolean(view().getUint8(pointer(pointer(global(13)+layout.vizArray)+y*8)+x)&layout.IN_SIGHT);},
        In_endgame:l=>l.dnum===level(global(11)+layout.astralLevel).dnum,
        Is_astralevel:l=>lcheck(l,layout.astralLevel),Is_rogue_level:l=>lcheck(l,layout.rogueLevel),
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        fmon:{get(){return monster(pointer(global(1)+layout.fmon));}},fobj:{get(){return object(pointer(global(1)+layout.fobj));}},
        uamul:{get(){return object(services.equipment(0));}},uwep:{get(){return object(services.equipment(1));}},
        NH_BLACK:{get(){return services.commonString(0);}},
        Deaf:{get(){return active(layout.DEAF)||services.roleplayDeaf();}},
        Blind:{get(){return active(layout.BLINDED)&&!prop(layout.BLINDED,'blocked');}},
        Protection_from_shape_changers:{get(){return active(layout.PROT_FROM_SHAPE_CHANGERS);}},
        Inhell:{get(){return services.In_hell(u.uz);}},
    });
    for(const[name,count]of[['nasties',44],['wizapp',12]]){
        if(namespace[name].length!==count)throw new Error('Review changed wizard catalogue '+name);
        env[name]=namespace[name].map(key=>{const value=layout[key];if(!Number.isInteger(value))throw new Error('Missing Wizard species '+key);return value;});
    }
    for(const[name,count]of[['random_insult',28],['random_malediction',11]]){
        if(namespace[name].length!==count)throw new Error('Review changed wizard catalogue '+name);
        env[name]=namespace[name].map(services.literal);
    }
    for(const name of['makemon','unmakemon'])env[name]=(...args)=>monster(services[name](...args));
    for(const name of['mksobj'])env[name]=(...args)=>object(services[name](...args));
    env.stairway_find_type_dir=(...args)=>stair(services.stairway_find_type_dir(...args));
    return env;
}
