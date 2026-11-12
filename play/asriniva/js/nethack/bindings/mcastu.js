import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Compiler layouts and header expansions; spell decisions stay in mcastu.js.
export function createMcastuEnvironment(services, layout, namespace) {
    const widths={pointerSize:8,longSize:8,intSize:4,coordSize:2,booleanSize:1,
        mon_data_size:8,mon_mx_size:2,mon_my_size:2,mon_mux_size:2,mon_muy_size:2,
        mon_mhp_size:4,mon_mhpmax_size:4,mon_m_lev_size:1,mon_mspec_used_size:4,
        mon_mtame_size:1,mon_cham_size:2,mon_seen_resistance_size:8,
        mon_mappearance_size:4,mon_m_ap_type_size:1,pm_mlet_size:1,
        pm_mflags1_size:8,pm_mflags2_size:8,atk_adtyp_size:1,atk_damn_size:1,atk_damd_size:1,
        u_ux_size:2,u_uy_size:2,u_mh_size:4,u_uhp_size:4,u_uhpmax_size:4,
        u_umonnum_size:4,u_umonster_size:4,prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        coord_x_size:2,coord_y_size:2,gender_he_size:8,config_DEBUG:1,config_SOUND:0};
    for(const[key,value]of Object.entries(widths))if(layout[key]!==value)
        throw new Error('Review changed mcastu ABI: '+key);
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const global=i=>address(services.global(i));
    const int=value=>CAdapter.signedInt(value);
    const boolean=value=>int(value)<<24>>24;
    const long=value=>BigInt.asIntN(64,BigInt(value));
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const pointerField=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{
        get(){return wrap(pointer(at()));},
        set(value){view().setBigUint64(at(),typeof value==='string'?raw(services.literal(value)):raw(value),true);},
    });
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function permonst(value){const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'mlet',()=>at+layout.pm_mlet,'Int8');
        for(const key of['mflags1','mflags2'])scalar(obj,key,()=>at+layout['pm_'+key],'BigUint64');return obj;}
    function monster(value){const at=address(value);if(!at)return 0;const obj={address:at};
        pointerField(obj,'data',()=>at+layout.mon_data,permonst);
        for(const[key,kind]of[['mx','Int16'],['my','Int16'],['mux','Int16'],['muy','Int16'],
            ['mhp','Int32'],['mhpmax','Int32'],['m_lev','Uint8'],['mspec_used','Int32'],
            ['mtame','Int8'],['cham','Int16'],['seen_resistance','BigUint64'],['mappearance','Uint32'],['m_ap_type','Uint8']])
            scalar(obj,key,()=>at+layout['mon_'+key],kind);
        for(const[i,key]of['mcan','mconf','iswiz','minvis','invis_blkd','msleeping','mpeaceful','permspeed'].entries())
            Object.defineProperty(obj,key,{get(){return services.monsterBit(at,i);},set(value){services.setMonsterBit(at,i,value);}});
        return obj;}
    function attack(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const key of['adtyp','damn','damd'])scalar(obj,key,()=>at+layout['atk_'+key],'Uint8');return obj;}
    function coord(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const key of['x','y'])scalar(obj,key,()=>at+layout['coord_'+key],'Int16');return obj;}
    const u={},gy={},svm={},svc={context:{}},svk={killer:{}},gi={},gm={},gn={},gb={},gt={},iflags={};
    for(const[key,kind]of[['ux','Int16'],['uy','Int16'],['mh','Int32'],['uhp','Int32'],['uhpmax','Int32'],['umonnum','Int32'],['umonster','Int32']])
        scalar(u,key,()=>global(0)+layout['u_'+key],kind);
    Object.defineProperty(u,'uundetected',{get(){return services.heroBit(0);}});
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(1)+layout.youmonst);}});
    scalar(svm,'moves',()=>global(2)+layout.moves,'BigInt64');
    scalar(svc.context,'no_of_wizards',()=>global(3)+layout.noOfWizards,'Uint32');
    scalar(svk.killer,'format',()=>global(4)+layout.killerFormat,'Int32');
    Object.defineProperty(svk.killer,'name',{get(){return global(4)+layout.killerName;}});
    pointerField(gi,'invent',()=>global(5)+layout.invent);
    scalar(gm,'multi',()=>global(6)+layout.multi,'BigInt64');
    pointerField(gm,'multi_reason',()=>global(6)+layout.multiReason);
    pointerField(gn,'nomovemsg',()=>global(7)+layout.nomovemsg);
    pointerField(gb,'buzzer',()=>global(8)+layout.buzzer,monster);
    scalar(gt,'tbx',()=>global(9)+layout.tbx,'Int8');scalar(gt,'tby',()=>global(9)+layout.tby,'Int8');
    scalar(iflags,'last_msg',()=>global(13)+layout.lastMsg,'Int32');
    const mons=indexed(i=>permonst(global(11)+i*layout.permonstSize));
    const property=(id,key)=>view().getBigInt64(global(0)+layout.u_uprops+id*layout.propSize+layout['prop_'+key],true);
    const intrinsic=id=>property(id,'intrinsic'),extrinsic=id=>property(id,'extrinsic');
    const either=id=>Boolean(intrinsic(id)||extrinsic(id));
    const visible=(x,y,mask)=>{const rows=pointer(global(10)+layout.vizArray),row=pointer(rows+y*layout.pointerSize);
        return Boolean(view().getUint8(row+x)&mask);};
    const env=Object.assign(Object.create(services),layout,{
        monster,permonst,attack,coord,coordLocal:()=>coord(services.stackAlloc(layout.coordStructSize)),
        u,gy,svm,svc,svk,gi,gm,gn,gb,gt,iflags,mons,int,boolean,long,
        coordxy:value=>int(value)<<16>>16,ulong:value=>BigInt.asUintN(64,BigInt(value)),
        samePtr:(a,b)=>raw(a)===raw(b),max:Math.max,
        plur:count=>count===1?'':'s',
        m_seenres:(mon,mask)=>mon.seen_resistance&BigInt.asUintN(64,BigInt(mask)),
        perceives:pm=>Boolean(pm.mflags1&BigInt(layout.M1_SEE_INVIS)),
        type_is_pname:pm=>Boolean(pm.mflags2&BigInt(layout.M2_PNAME)),
        is_demon:pm=>Boolean(pm.mflags2&BigInt(layout.M2_DEMON)),
        nonliving:pm=>Boolean(pm.mflags2&BigInt(layout.M2_UNDEAD))||raw(pm)===raw(mons[layout.PM_MANES])
            ||pm.mlet===layout.S_GOLEM||pm.mlet===layout.S_VORTEX,
        eyecount:pm=>pm.mflags1&BigInt(layout.M1_NOEYES)?0:
            raw(pm)===raw(mons[layout.PM_CYCLOPS])||raw(pm)===raw(mons[layout.PM_FLOATING_EYE])?1:2,
        ismnum:value=>value>=layout.LOW_PM&&value<layout.NUMMONS,
        is_obj_mappear:(mon,type)=>(mon.m_ap_type&layout.M_AP_TYPMASK)===layout.M_AP_OBJECT&&mon.mappearance===type,
        couldsee:(x,y)=>visible(x,y,layout.COULD_SEE),cansee:(x,y)=>visible(x,y,layout.IN_SIGHT),
        u_at:(x,y)=>u.ux===x&&u.uy===y,
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        mhe:mon=>pointer(global(12)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_he),
        ACURR:attribute=>services.acurr(attribute),
        BZ_VALID_ADTYP:type=>type>=layout.AD_MAGM&&type<=layout.AD_SPC2,
        BZ_OFS_AD:type=>Math.abs(int(type-layout.AD_MAGM))%10,BZ_M_SPELL:type=>int(-10-type),
        storeChar:(at,value)=>view().setInt8(address(at),value),
        Your1:value=>services.Your('%s',value),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        Upolyd:{get(){return u.umonnum!==u.umonster;}},
        Invis:{get(){return Boolean(either(layout.INVIS)&&!property(layout.INVIS,'blocked'));}},
        Displaced:{get(){return either(layout.DISPLACED);}},
        Deaf:{get(){return Boolean(either(layout.DEAF)||services.roleplayDeaf());}},
        Antimagic:{get(){return either(layout.ANTIMAGIC);}},
        Fire_resistance:{get(){return either(layout.FIRE_RES);}},Cold_resistance:{get(){return either(layout.COLD_RES);}},
        Shock_resistance:{get(){return either(layout.SHOCK_RES);}},
        Half_spell_damage:{get(){return either(layout.HALF_SPDAM);}},Half_physical_damage:{get(){return either(layout.HALF_PHDAM);}},
        Hallucination:{get(){return Boolean(intrinsic(layout.HALLUC)&&!either(layout.HALLUC_RES));}},
        See_invisible:{get(){return either(layout.SEE_INVIS);}},
        Free_action:{get(){return extrinsic(layout.FREE_ACTION);}},
        HStun:{get(){return intrinsic(layout.STUNNED);}},Stunned:{get(){return intrinsic(layout.STUNNED);}},
        HConfusion:{get(){return intrinsic(layout.CONFUSION);}},Confusion:{get(){return intrinsic(layout.CONFUSION);}},
        Detect_monsters:{get(){return either(layout.DETECT_MONSTERS);}},
        Unaware:{get(){return Boolean(gm.multi<0&&(services.unconscious()||services.is_fainted()));}},
        Blinded:{get(){return Boolean(intrinsic(layout.BLINDED)&&!property(layout.BLINDED,'blocked'));}},
        Blind:{get(){return Boolean(either(layout.BLINDED)&&!property(layout.BLINDED,'blocked'));}},
        vision_clears:{get(){return services.commonString(0);}},
    });
    env.TIMEOUT=BigInt(layout.TIMEOUT);
    if(namespace.mcast_data.length!==20||namespace.mon_cleric_spells.length!==10||namespace.mon_wizard_spells.length!==12)
        throw new Error('Review changed monster spell catalogue');
    env.mcast_data=namespace.mcast_data.map(row=>({level:row.level,flags:row.flags.reduce((flags,key)=>{
        if(!Number.isInteger(layout[key]))throw new Error('Missing monster spell flag '+key);return flags|layout[key];},0)}));
    for(const key of['mon_cleric_spells','mon_wizard_spells'])env[key]=namespace[key].map(symbol=>{
        if(!Number.isInteger(layout[symbol]))throw new Error('Missing monster spell '+symbol);
        if(namespace[symbol]!==layout[symbol])throw new Error('Review changed monster spell enum '+symbol);
        return layout[symbol];});
    env.mkclass=(...args)=>permonst(services.mkclass(...args));
    env.makemon=(...args)=>monster(services.makemon(...args));
    return env;
}
