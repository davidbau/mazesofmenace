// Live C layouts and header macros only; wearing policy remains in worn.js.
export function createWornEnvironment(services,layout,namespace) {
    for(const[key,size]of Object.entries({pointerSize:8,longSize:8,intSize:4,shortSize:2,
        charSize:1,booleanSize:1,coordSize:2,config_EXTRA_SANITY_CHECKS:0,config_SND_LIB_INTEGRATED:0}))
        if(layout[key]!==size)throw new Error('Review changed worn ABI: '+key);
    const raw=value=>BigInt.asUintN(64,BigInt(value?.address??value??0));
    const identity=value=>{const bits=raw(value);return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits);};
    const address=value=>Number(value?.address??value??0);
    const view=()=>new DataView(services.heap().buffer);
    const global=index=>address(services.global(index));
    const pointer=at=>identity(view().getBigUint64(at,true));
    const int=value=>typeof value==='bigint'?Number(BigInt.asIntN(32,value)):Number(value)|0;
    const long=value=>BigInt.asIntN(64,BigInt(value));
    const samePtr=(a,b)=>raw(a)===raw(b);
    const scalar=(obj,key,at,kind)=>Object.defineProperty(obj,key,{
        get(){return view()['get'+kind](at(),true);},
        set(value){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(value):Number(value),true);},
    });
    const ptrField=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{
        get(){return wrap(pointer(at()));},set(value){view().setBigUint64(at(),raw(value),true);},
    });
    const fields=(obj,at,prefix,definitions)=>{
        for(const[key,kind]of definitions){
            if(layout[prefix+key+'_size']!==Number(kind.match(/\d+/)[0])/8)
                throw new Error('Review changed worn field: '+prefix+key);
            scalar(obj,key,()=>at+layout[prefix+key],kind);
        }return obj;
    };
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function permonst(value){const at=address(value);if(!at)return 0;
        return fields({address:identity(value)},at,'pm_',[['msize','Uint8'],['mlet','Int8'],['mmove','Int8'],['ac','Int8'],['mflags1','BigUint64'],['mflags2','BigUint64']]);}
    function object(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'obj_',[['otyp','Int16'],['oclass','Int8'],['oartifact','Int8'],['owornmask','BigInt64'],['where','Int8'],['spe','Int8']]);
        for(const key of ['nobj','cobj'])ptrField(obj,key,()=>at+layout['obj_'+key],object);
        for(const[index,key]of ['cursed','bypass','lamplit','oeroded','oeroded2'].entries())
            Object.defineProperty(obj,key,{get(){return services.objectBit(at,index);},set(value){services.setObjectBit(at,index,value);}});
        return obj;}
    function mextra(value){const at=address(value);if(!at)return 0;
        return fields({address:identity(value)},at,'mextra_',[['mcorpsenm','Int32']]);}
    function monster(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'mon_',[['mhp','Int32'],['mx','Int16'],['my','Int16'],['mextrinsics','Uint16'],['misc_worn_check','BigInt64']]);
        ptrField(obj,'data',()=>at+layout.mon_data,permonst);ptrField(obj,'nmon',()=>at+layout.mon_nmon,monster);
        for(const key of ['minvent','mw'])ptrField(obj,key,()=>at+layout['mon_'+key],object);
        ptrField(obj,'mextra',()=>at+layout.mon_mextra,mextra);
        for(const[index,key]of ['perminvis','invis_blkd','minvis','wormno','permspeed','mspeed','msleeping','mcanmove','ispriest','isminion','mfrozen'].entries())
            Object.defineProperty(obj,key,{get(){return services.monsterBit(at,index);},set(value){services.setMonsterBit(at,index,value);}});
        return obj;}
    function loot(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        ptrField(obj,'obj',()=>at+layout.loot_obj,object);return obj;}
    const equipmentNames=['uarm','uarmc','uarmh','uarms','uarmg','uarmf','uarmu','uleft','uright','uwep','uswapwep','uquiver','uamul','ublindf','uball','uchain','uskin'];
    const cells=equipmentNames.map((name,index)=>{const at=address(services.equipmentCell(index)),cell={address:at};
        ptrField(cell,'value',()=>at,object);return cell;});
    const u=fields({address:global(0)},global(0),'u_',[['twoweap','Int8'],['umonnum','Int32'],['unblind_telepat_range','Int32']]);
    u.uroleplay={};scalar(u.uroleplay,'nudist',()=>global(0)+layout.u_uroleplay_nudist,'Int8');
    ptrField(u,'usteed',()=>global(0)+layout.u_usteed,monster);
    const props=indexed(index=>fields({address:global(0)+layout.u_uprops+index*layout.propSize},global(0)+layout.u_uprops+index*layout.propSize,'prop_',[['intrinsic','BigInt64'],['extrinsic','BigInt64'],['blocked','BigInt64']]));
    u.uprops=props;
    const objects=indexed(index=>{const at=global(1)+index*layout.objectClassSize;
        const obj=fields({address:at},at,'cls_',[['oc_oprop','Uint8'],['oc_delay','Int8'],['oc_skill','Int8'],['oc_armcat','Int8'],['a_ac','Int8']]);
        for(const[i,key]of ['oc_merge','oc_material','oc_bimanual'].entries())Object.defineProperty(obj,key,{get(){return services.classBit(at,i);}});
        return obj;});
    const mons=indexed(index=>permonst(global(2)+index*layout.permonstSize));
    const gy={},gi={},gu={urole:{}},flags={},iflags={},disp={},svc={context:{}},svl={level:{}},gm={},gb={},go={};
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(3)+layout.youmonst);}});
    ptrField(gi,'invent',()=>global(4)+layout.invent,object);scalar(gi,'in_mklev',()=>global(4)+layout.in_mklev,'Int8');
    scalar(gu.urole,'mnum',()=>global(5)+layout.roleMnum,'Int16');scalar(gu.urole,'spelarmr',()=>global(5)+layout.roleSpelarmr,'Int32');
    for(const key of ['verbose','weaponstatus','armorstatus'])scalar(flags,key,()=>global(6)+layout[key],'Int8');
    scalar(iflags,'tux_penalty',()=>global(7)+layout.tux_penalty,'Int8');scalar(disp,'botl',()=>global(8)+layout.botl,'Int8');
    scalar(svc.context,'bypasses',()=>global(9)+layout.bypasses,'Int8');
    ptrField(svl.level,'buriedobjlist',()=>global(10)+layout.buriedobjlist,object);
    ptrField(gm,'migrating_objs',()=>global(11)+layout.migrating_objs,object);
    for(const key of ['migrating_mons','mydogs'])ptrField(gm,key,()=>global(11)+layout[key],monster);
    ptrField(gb,'billobjs',()=>global(12)+layout.billobjs,object);ptrField(go,'objs_deleted',()=>global(13)+layout.objs_deleted,object);
    const prop=(index,key)=>props[index][key];
    const either=index=>Boolean(prop(index,'intrinsic')||prop(index,'extrinsic'));
    const flag=(pm,name)=>Boolean(pm.mflags1&BigInt(layout[name]));
    const env=Object.assign(Object.create(services),layout,{
        object,monster,permonst,loot,lootNext:value=>loot(raw(value)+BigInt(layout.lootSize)),
        u,objects,mons,gy,gi,gu,flags,iflags,disp,svc,svl,gm,gb,go,samePtr,int,long,
        ulong:raw,uchar:value=>int(value)&255,ushort:value=>int(value)&65535,
        char:value=>int(value)<<24>>24,boolean:value=>int(value)<<24>>24,bool:value=>Number(Boolean(value)),
        ptrAdd:(ptr,offset)=>identity(raw(ptr)+BigInt(offset)),ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),
        charPointer:value=>typeof value==='string'?services.literal(value):identity(value),
        loadChar:at=>view().getInt8(address(at)),
        storeChar(at,value){const ch=int(value)<<24>>24;view().setInt8(address(at),ch);return ch;},
        Role_if:role=>gu.urole.mnum===role,
        MON_WEP:mon=>mon.mw,DEADMONSTER:mon=>mon.mhp<1,Has_contents:obj=>Boolean(obj.cobj),
        has_mcorpsenm:mon=>Boolean(mon.mextra&&mon.mextra.mcorpsenm!==layout.NON_PM),
        MCORPSENM:mon=>mon.mextra.mcorpsenm,
        makeknown:value=>services.discover_object(int(value),1,1,1),
        monstunseesu_prop:value=>services.monstunseesu(services.cvt_prop_to_mseenres(int(value)&255)),
        res_to_mr:value=>layout.FIRE_RES<=value&&value<=layout.STONE_RES?(1<<(value-1))&255:0,
        greatest_erosion:obj=>Math.max(obj.oeroded,obj.oeroded2),
        ARM_BONUS:obj=>objects[obj.otyp].a_ac+obj.spe-Math.min(Math.max(obj.oeroded,obj.oeroded2),objects[obj.otyp].a_ac),
        abs:value=>Math.abs(int(value)),
        is_weptool:obj=>obj.oclass===layout.TOOL_CLASS&&objects[obj.otyp].oc_skill!==layout.P_NONE,
        bimanual:obj=>(obj.oclass===layout.WEAPON_CLASS||obj.oclass===layout.TOOL_CLASS)&&objects[obj.otyp].oc_bimanual,
        verysmall:pm=>pm.msize<layout.MZ_SMALL,nohands:pm=>flag(pm,'M1_NOHANDS'),is_animal:pm=>flag(pm,'M1_ANIMAL'),
        mindless:pm=>flag(pm,'M1_MINDLESS'),slithy:pm=>flag(pm,'M1_SLITHY'),humanoid:pm=>flag(pm,'M1_HUMANOID'),
        noncorporeal:pm=>pm.mlet===layout.S_GHOST,
        has_horns:pm=>services.num_horns(pm)>0,is_whirly:pm=>pm.mlet===layout.S_VORTEX||samePtr(pm,mons[layout.PM_AIR_ELEMENTAL]),
        cantweararm:pm=>Boolean(services.breakarm(pm)||services.sliparm(pm)),
        WrappingAllowed:pm=>flag(pm,'M1_HUMANOID')&&pm.msize>=layout.MZ_SMALL&&pm.msize<=layout.MZ_HUGE&&pm.mlet!==layout.S_GHOST&&pm.mlet!==layout.S_CENTAUR&&!samePtr(pm,mons[layout.PM_WINGED_GARGOYLE])&&!samePtr(pm,mons[layout.PM_MARILITH]),
        is_flimsy:obj=>objects[obj.otyp].oc_material<=layout.LEATHER||obj.otyp===layout.RUBBER_HOSE,
        is_elven_armor:obj=>['ELVEN_LEATHER_HELM','ELVEN_MITHRIL_COAT','ELVEN_CLOAK','ELVEN_SHIELD','ELVEN_BOOTS'].some(key=>obj.otyp===layout[key]),
        Is_dragon_scales:obj=>obj.otyp>=layout.GRAY_DRAGON_SCALES&&obj.otyp<=layout.YELLOW_DRAGON_SCALES,
        Is_dragon_mail:obj=>obj.otyp>=layout.GRAY_DRAGON_SCALE_MAIL&&obj.otyp<=layout.YELLOW_DRAGON_SCALE_MAIL,
        Dragon_scales_to_pm:obj=>mons[layout.PM_GRAY_DRAGON+obj.otyp-layout.GRAY_DRAGON_SCALES],
        Dragon_mail_to_pm:obj=>mons[layout.PM_GRAY_DRAGON+obj.otyp-layout.GRAY_DRAGON_SCALE_MAIL],
        touch_petrifies:pm=>samePtr(pm,mons[layout.PM_COCKATRICE])||samePtr(pm,mons[layout.PM_CHICKATRICE]),
        cansee:(x,y)=>{const rows=pointer(global(15)+layout.vizArray),row=pointer(address(rows)+y*layout.pointerSize);
            return Boolean(view().getUint8(address(row)+x)&layout.IN_SIGHT);},
        mhim:mon=>pointer(global(14)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_him),
        mhis:mon=>pointer(global(14)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_his),
        callLocal(fn,...args){const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
    });
    for(const [index,name]of equipmentNames.entries())Object.defineProperty(env,name,{get(){return cells[index].value;},set(value){cells[index].value=value;}});
    for(const [name,category]of [['is_shirt','ARM_SHIRT'],['is_cloak','ARM_CLOAK'],['is_helmet','ARM_HELM'],['is_shield','ARM_SHIELD'],['is_gloves','ARM_GLOVES'],['is_boots','ARM_BOOTS'],['is_suit','ARM_SUIT']])
        env[name]=obj=>obj.oclass===layout.ARMOR_CLASS&&objects[obj.otyp].oc_armcat===layout[category];
    for(const [key,value]of Object.entries(layout))if(/^W_|^M1_/.test(key)||key==='I_SPECIAL')env[key]=BigInt(value);
    env.worn=namespace.worn.map(row=>({w_mask:typeof row.w_mask==='string'?long(layout[row.w_mask]):0n,
        w_obj:row.w_obj?cells[equipmentNames.indexOf(row.w_obj)]:0,w_what:row.w_what?services.literal(row.w_what):0}));
    Object.defineProperties(env,{
        HEAP8:{get(){return new Int8Array(services.heap().buffer);}},HEAPU8:{get(){return services.heap();}},
        ETelepat:{get(){return prop(layout.TELEPAT,'extrinsic');}},
        See_invisible:{get(){return either(layout.SEE_INVIS);}},Stone_resistance:{get(){return either(layout.STONE_RES);}},
        fmon:{get(){return monster(pointer(global(10)+layout.fmon));}},fobj:{get(){return object(pointer(global(10)+layout.fobj));}},
        NH_BLACK:{get(){return services.commonString(0);}},Something:{get(){return services.commonString(1);}},
    });
    env.raceptr=mon=>permonst(services.raceptr(mon));
    return env;
}
