// Live native storage and header expansions; riding policy remains in steed.js.
const steedsByModule = new WeakMap();
export function createSteedEnvironment(services, layout, namespace) {
    const widths = { pointerSize:8, longSize:8, intSize:4, booleanSize:1, booleanSigned:1,
        coordxySize:2, coordxySigned:1, charSize:1, charSigned:1,
        obj_otyp_size:2, obj_oclass_size:1, obj_owornmask_size:8, obj_leashmon_size:4,
        mon_data_size:8, mon_mx_size:2, mon_my_size:2, mon_m_id_size:4, mon_mstate_size:8,
        mon_misc_worn_check_size:8, mon_mhp_size:4, mon_m_lev_size:1, mon_mtame_size:1,
        mon_meating_size:4, mon_m_ap_type_size:1,
        pm_mlet_size:1, pm_msize_size:1, pm_mflags1_size:8, pm_mflags2_size:8,
        cls_oc_skill_size:1, u_ux_size:2, u_uy_size:2, u_dx_size:4, u_dy_size:4, u_dz_size:4,
        u_utrap_size:4, u_utraptype_size:4, u_usteed_size:8, u_ustuck_size:8,
        u_ulevel_size:4, u_umonnum_size:4, u_umonster_size:4, u_ugallop_size:8,
        u_urideturns_size:4, coord_x_size:2, coord_y_size:2,
        prop_intrinsic_size:8, prop_extrinsic_size:8, prop_blocked_size:8,
        skill_skill_size:2, level_dnum_size:2, level_dlevel_size:2, gender_he_size:8,
        unweapon_size:1, roleMnum_size:2, inDismounting_size:1, visionRecalc_size:1,
        botl_size:1, wizard_size:1, lastMsg_size:4, config_EXTRA_SANITY_CHECKS:0,
        config_DEBUG:1, config_NDEBUG:0 };
    for (const [key, expected] of Object.entries(widths))
        if (layout[key] !== expected) throw new Error('Review changed steed ABI: ' + key);
    const address = value => Number(value?.address ?? value ?? 0);
    const raw = value => BigInt.asUintN(64, BigInt(value?.address ?? value ?? 0));
    const global = i => address(services.global(i));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32,value)) : value | 0;
    const boolean = value => int(value) << 24 >> 24;
    const coordxy = value => int(value) << 16 >> 16;
    const long = value => BigInt.asIntN(64,BigInt(value));
    const scalar = (obj,key,at,kind) => Object.defineProperty(obj,key,{
        get() { return view()['get'+kind](at(),true); },
        set(value) { view()['set'+kind](at(),kind.includes('Big') ? BigInt(value) : Number(value),true); },
    });
    const ptrField = (obj,key,at,wrap=value=>value) => Object.defineProperty(obj,key,{
        get() { return wrap(pointer(at())); }, set(value) { view().setBigUint64(at(),raw(value),true); },
    });
    const indexed = (get,set,at) => new Proxy({address:at},{
        get(obj,key) { return typeof key==='string' && /^-?\d+$/.test(key) ? get(Number(key)) : Reflect.get(obj,key); },
        set(obj,key,value) { if (set && typeof key==='string' && /^-?\d+$/.test(key)) {
            set(Number(key),value); return true; } return Reflect.set(obj,key,value); },
    });
    function permonst(value) {
        const at=address(value); if (!at) return 0; const obj={address:at};
        scalar(obj,'mlet',()=>at+layout.pm_mlet,'Int8');
        scalar(obj,'msize',()=>at+layout.pm_msize,'Uint8');
        for (const k of ['mflags1','mflags2']) scalar(obj,k,()=>at+layout['pm_'+k],'BigUint64'); return obj;
    }
    function object(value) {
        const at=address(value); if (!at) return 0; const obj={address:at};
        for (const [k,kind] of [['otyp','Int16'],['oclass','Int8'],['owornmask','BigInt64'],['leashmon','Int32']])
            scalar(obj,k,()=>at+layout['obj_'+k],kind);
        for (const [i,k] of ['cursed','greased','bknown','oeroded','oeroded2'].entries()) Object.defineProperty(obj,k,{
            get() { return services.objectBit(at,i); }, set(value) { services.setObjectBit(at,i,value); },
        }); return obj;
    }
    function monster(value) {
        const at=address(value); if (!at) return 0; const obj={address:at};
        ptrField(obj,'data',()=>at+layout.mon_data,permonst);
        for (const [k,kind] of [['mx','Int16'],['my','Int16'],['m_id','Uint32'],['mstate','BigInt64'],
            ['misc_worn_check','BigInt64'],['mhp','Int32'],['m_lev','Uint8'],['mtame','Int8'],
            ['meating','Int32'],['m_ap_type','Uint8']]) scalar(obj,k,()=>at+layout['mon_'+k],kind);
        for (const [i,k] of ['isminion','isshk','ispriest','isgd','iswiz','mundetected','mtrapped',
            'mleashed','mcanmove','mfrozen','msleeping'].entries()) Object.defineProperty(obj,k,{
            get() { return services.monsterBit(at,i); }, set(value) { services.setMonsterBit(at,i,value); },
        }); return obj;
    }
    function trap(value) {
        const at=address(value); if (!at) return 0; const obj={address:at};
        for (const [i,k] of ['ttyp','tseen'].entries()) Object.defineProperty(obj,k,{
            get() { return services.trapBit(at,i); },
        }); return obj;
    }
    function coord(value) {
        const at=address(value), obj={address:at};
        for (const k of ['x','y']) scalar(obj,k,()=>at+layout['coord_'+k],'Int16'); return obj;
    }
    function level(value) {
        const at=address(value), obj={address:at};
        for (const k of ['dnum','dlevel']) scalar(obj,k,()=>at+layout['level_'+k],'Int16'); return obj;
    }
    const u={};
    for (const [k,kind] of [['ux','Int16'],['uy','Int16'],['dx','Int32'],['dy','Int32'],['dz','Int32'],
        ['utrap','Uint32'],['utraptype','Uint32'],['ulevel','Int32'],['umonnum','Int32'],['umonster','Int32'],
        ['ugallop','BigInt64'],['urideturns','Int32']]) scalar(u,k,()=>global(0)+layout['u_'+k],kind);
    for (const k of ['usteed','ustuck']) ptrField(u,k,()=>global(0)+layout['u_'+k],monster);
    Object.defineProperties(u,{
        uz:{get(){return level(global(0)+layout.u_uz);}},
        uswallow:{get(){return services.heroBit(0);}},
    });
    const gy={}, gu={}, gi={}, gv={}, disp={}, iflags={};
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(1)+layout.youmonst);}});
    scalar(gu,'unweapon',()=>global(3)+layout.unweapon,'Int8');
    scalar(gi,'in_steed_dismounting',()=>global(4)+layout.inDismounting,'Int8');
    scalar(gv,'vision_full_recalc',()=>global(5)+layout.visionRecalc,'Int8');
    scalar(disp,'botl',()=>global(6)+layout.botl,'Int8');
    scalar(iflags,'last_msg',()=>global(11)+layout.lastMsg,'Int32');
    const gridAt=(x,y)=>global(2)+layout.floorMonsters+(x*layout.ROWNO+y)*8;
    const svl={level:{monsters:indexed(x=>indexed(y=>monster(pointer(gridAt(x,y))),
        (y,value)=>view().setBigUint64(gridAt(x,y),raw(value),true)))}};
    const mons=indexed(i=>permonst(global(8)+i*layout.permonstSize));
    const objects=indexed(i=>{const at=global(9)+i*layout.objectClassSize,obj={address:at};
        scalar(obj,'oc_skill',()=>at+layout.cls_oc_skill,'Int8');
        Object.defineProperty(obj,'oc_material',{get(){return services.objectClassBit(at,0);}});return obj;});
    const propAt=(id,key)=>global(0)+layout.u_uprops+id*layout.propSize+layout['prop_'+key];
    const prop=(id,key)=>view().getBigInt64(propAt(id,key),true);
    const active=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic'));
    const unblocked=id=>active(id)&&!prop(id,'blocked');
    const flag=(pm,key)=>Boolean(pm.mflags1&BigInt(layout[key]));
    const samePtr=(a,b)=>raw(a)===raw(b);
    const is_flyer=pm=>flag(pm,'M1_FLY');
    const is_floater=pm=>pm.mlet===layout.S_EYE||pm.mlet===layout.S_LIGHT;
    const is_swimmer=pm=>flag(pm,'M1_SWIM');
    const env=Object.assign(Object.create(services),layout,{
        address,int,boolean,coordxy,long,object,monster,permonst,coord,level,trap,
        W_SADDLE:BigInt(layout.W_SADDLE),BOTH_SIDES:BigInt(layout.BOTH_SIDES),
        u,gy,gu,gi,gv,disp,iflags,svl,mons,objects,samePtr,
        callLocal(fn,...args){const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
        coordLocal(){return coord(services.stackAlloc(layout.coordSize));},
        coordArrayLocal(count){const at=services.stackAlloc(count*layout.coordSize);return indexed(i=>coord(at+i*layout.coordSize),null,at);},
        copyCoord(dst,src){services.heap().copyWithin(address(dst),address(src),address(src)+layout.coordSize);},
        loadChar:at=>view().getInt8(address(at)),storeChar:(at,value)=>view().setInt8(address(at),value),
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        M_AP_TYPE:mon=>mon.m_ap_type&layout.M_AP_TYPMASK,
        DEADMONSTER:mon=>mon.mhp<1,
        m_at:(x,y)=>monster(pointer(gridAt(x,y))),MON_AT:(x,y)=>Boolean(pointer(gridAt(x,y))),
        remove_monster:(x,y)=>view().setBigUint64(gridAt(x,y),0n,true),
        u_at:(x,y)=>u.ux===x&&u.uy===y,
        Role_if:pm=>view().getInt16(global(3)+layout.roleMnum,true)===pm,
        P_SKILL:skill=>view().getInt16(global(0)+layout.u_weapon_skills+skill*layout.skillSize+layout.skill_skill,true),
        DIR_RIGHT:dir=>int(dir+1)%layout.N_DIRS,DIR_LEFT:dir=>int(dir+7)%layout.N_DIRS,
        NODIAG:pm=>pm===layout.PM_GRID_BUG,
        humanoid:pm=>flag(pm,'M1_HUMANOID'),amorphous:pm=>flag(pm,'M1_AMORPHOUS'),
        noncorporeal:pm=>pm.mlet===layout.S_GHOST,unsolid:pm=>flag(pm,'M1_UNSOLID'),
        is_whirly:pm=>pm.mlet===layout.S_VORTEX||samePtr(pm,mons[layout.PM_AIR_ELEMENTAL]),
        verysmall:pm=>pm.msize<layout.MZ_SMALL,bigmonst:pm=>pm.msize>=layout.MZ_LARGE,
        is_flyer,is_floater,is_swimmer,slithy:pm=>flag(pm,'M1_SLITHY'),
        touch_petrifies:pm=>samePtr(pm,mons[layout.PM_COCKATRICE])||samePtr(pm,mons[layout.PM_CHICKATRICE]),
        cant_drown:pm=>is_swimmer(pm)||flag(pm,'M1_AMPHIBIOUS')||flag(pm,'M1_BREATHLESS'),
        grounded:pm=>!is_flyer(pm)&&!is_floater(pm)&&(!flag(pm,'M1_CLING')||!services.has_ceiling(u.uz)),
        likes_lava:pm=>samePtr(pm,mons[layout.PM_FIRE_ELEMENTAL])||samePtr(pm,mons[layout.PM_SALAMANDER]),
        throws_rocks:pm=>Boolean(pm.mflags2&BigInt(layout.M2_ROCKTHROW)),
        helpless:mon=>Boolean(mon.msleeping||!mon.mcanmove),
        greatest_erosion:obj=>obj.oeroded>obj.oeroded2?obj.oeroded:obj.oeroded2,
        is_metallic:obj=>objects[obj.otyp].oc_material>=layout.IRON&&objects[obj.otyp].oc_material<=layout.MITHRIL,
        is_pole:obj=>(obj.oclass===layout.WEAPON_CLASS||obj.oclass===layout.TOOL_CLASS)
            &&(objects[obj.otyp].oc_skill===layout.P_POLEARMS||objects[obj.otyp].oc_skill===layout.P_LANCE
                ||services.is_art(obj,layout.ART_SNICKERSNEE)),
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),
        mhe:mon=>pointer(global(10)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_he),
        has_mgivenname:mon=>services.hasMgivenname(mon),
        Maybe_Half_Phys:damage=>active(layout.HALF_PHDAM)?Math.trunc(int(damage+1)/2):damage,
        pline1:text=>services.pline('%s',text),
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return new Int8Array(services.heap().buffer);}},HEAPU8:{get(){return services.heap();}},
        uwep:{get(){return object(services.equipment(0));}},uarm:{get(){return object(services.equipment(1));}},
        uarmg:{get(){return object(services.equipment(2));}},uarmf:{get(){return object(services.equipment(3));}},
        Punished:{get(){return Boolean(services.equipment(4));}},
        wizard:{get(){return view().getInt8(global(7)+layout.wizard);}},
        Never_mind:{get(){return services.commonString(0);}},ACURR:{value:services.acurr},
        Underwater:{get(){return services.heroBit(1);}},Upolyd:{get(){return u.umonnum!==u.umonster;}},
        Stone_resistance:{get(){return active(layout.STONE_RES);}},
        Confusion:{get(){return prop(layout.CONFUSION,'intrinsic');}},Stunned:{get(){return prop(layout.STUNNED,'intrinsic');}},
        Fumbling:{get(){return active(layout.FUMBLING);}},Glib:{get(){return prop(layout.GLIB,'intrinsic');}},
        Hallucination:{get(){return Boolean(prop(layout.HALLUC,'intrinsic')&&!active(layout.HALLUC_RES));}},
        Wounded_legs:{get(){return active(layout.WOUNDED_LEGS);}},HWounded_legs:{get(){return prop(layout.WOUNDED_LEGS,'intrinsic');}},
        Blind:{get(){return unblocked(layout.BLINDED);}},Blind_telepat:{get(){return active(layout.TELEPAT);}},
        Levitation:{get(){return unblocked(layout.LEVITATION);}},
        Lev_at_will:{get(){const h=prop(layout.LEVITATION,'intrinsic'),e=prop(layout.LEVITATION,'extrinsic');
            return Boolean((h&BigInt(layout.I_SPECIAL)||e&BigInt(layout.W_ARTI))
                &&!(h&~(BigInt(layout.I_SPECIAL)|BigInt(layout.TIMEOUT)))&&!(e&~BigInt(layout.W_ARTI)));}},
        Flying:{get(){return Boolean((active(layout.FLYING)||(u.usteed&&is_flyer(u.usteed.data)))&&!prop(layout.FLYING,'blocked'));}},
        Stealth:{get(){return unblocked(layout.STEALTH);}},
    });
    for(const name of ['mksobj','which_armor','sobj_at'])env[name]=(...args)=>object(services[name](...args));
    env.t_at=(...args)=>trap(services.t_at(...args));
    let steeds=steedsByModule.get(services.moduleKey);
    if(steeds===undefined){
        if(namespace.steeds.length!==7||namespace.steeds[6]!==0)throw new Error('Review changed steed classifiers');
        steeds=address(services.storage());
        for(let i=0;i<7;i++){
            const value=namespace.steeds[i]===0?0:layout[namespace.steeds[i]];
            if(!Number.isInteger(value)||value<0||value>255)throw new Error('Review changed steed class symbol');
            view().setUint8(steeds+i,value);
        }
        steedsByModule.set(services.moduleKey,steeds);
    }
    env.steeds=steeds;
    return env;
}
