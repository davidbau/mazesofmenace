import {createNativeByteValues} from './byte-values.js';
// Native WORN roots and slot cells; header rules retain source semantics.
import equipment from '../equipment-abi.json' with {type:'json'};
export function createNativeWornState(environment,layouts,services,namespace,owner){
 const layout=layouts.worn,{memory,transport:t}=environment,views=owner.nativeRecords,arena=owner.nativeArena;
 const raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),identity=v=>arena.handle(v),address=environment.address,view=()=>arena.view,pointer=p=>arena.pointer(p),int=t.int,long=t.long;
 const object=p=>views.record('struct obj',p),monster=p=>views.record('struct monst',p),permonst=p=>views.record('struct permonst',p),loot=p=>views.record('Loot',p);
 const global=i=>environment.requireGlobal(equipment.worn.globals[i]);
 const roots={};for(const[name,type]of Object.entries({u:'you',gy:'instance_globals_y',gi:'instance_globals_i',gu:'instance_globals_u',flags:'flag',iflags:'instance_flags',disp:'display_hints',svc:'instance_globals_saved_c',svl:'instance_globals_saved_l',gm:'instance_globals_m',gb:'instance_globals_b',go:'instance_globals_o'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 const {u,gy,gi,gu,flags,iflags,disp,svc,svl,gm,gb,go}=roots;
 function table(type,base,stride,length){const out=Array(length);for(let i=0;i<length;i++)Object.defineProperty(out,i,{enumerable:true,configurable:true,get(){const value=views.record(type,base+i*stride);Object.defineProperty(out,i,{value,enumerable:true});return value;}});return out;}
 const objects=table('struct objclass',global(1),layout.objectClassSize,layouts.o_init.NUM_OBJECTS),mons=table('struct permonst',global(2),layout.permonstSize,layouts.makemon.NUMMONS);
 const props=table('struct prop',u.address+layout.u_uprops,layout.propSize,u.uprops.length),prop=(id,key)=>props[id][key],either=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic'));
 const equipmentNames=equipment.worn.equipment,cells=equipmentNames.map(name=>{const at=environment.requireGlobal(name);let previous,value;return {address:at,get value(){const p=arena.pointer(at);if(p!==previous){value=object(p);previous=p;}return value;},set value(v){arena.storePointer(at,v);previous=undefined;}};});
 const samePtr=(a,b)=>(a?.address??a??0)===(b?.address??b??0);
    const flag=(pm,name)=>Boolean(pm.mflags1&BigInt(layout[name]));
    const env=Object.assign({},layout,{
        object,monster,permonst,loot,lootNext:value=>loot(address(value)+layout.lootSize),
        u,objects,mons,gy,gi,gu,flags,iflags,disp,svc,svl,gm,gb,go,samePtr,int,long,
        ulong:raw,uchar:value=>int(value)&255,ushort:value=>int(value)&65535,
        char:value=>int(value)<<24>>24,boolean:value=>int(value)<<24>>24,bool:value=>Number(Boolean(value)),
        ptrAdd:(ptr,offset)=>identity(raw(ptr)+BigInt(offset)),ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),
        charPointer:value=>typeof value==='string'?services.literal(value):identity(value),
        loadChar:at=>at?.nativeBytes?at.load():view().getInt8(address(at)),
        storeChar(at,value){if(at?.nativeBytes)return at.store(0,value);const ch=int(value)<<24>>24;view().setInt8(address(at),ch);return ch;},
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
            return Boolean(arena.Uint8[address(row)+x]&layout.IN_SIGHT);},
        mhim:mon=>views.record('struct Gender',global(14)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize).him,
        mhis:mon=>views.record('struct Gender',global(14)+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize).his,
        callLocal:(fn,...args)=>fn(...args),
    });
    for(const [index,name]of equipmentNames.entries())Object.defineProperty(env,name,{get(){return cells[index].value;},set(value){cells[index].value=value;}});
    for(const [name,category]of [['is_shirt','ARM_SHIRT'],['is_cloak','ARM_CLOAK'],['is_helmet','ARM_HELM'],['is_shield','ARM_SHIELD'],['is_gloves','ARM_GLOVES'],['is_boots','ARM_BOOTS'],['is_suit','ARM_SUIT']])
        env[name]=obj=>obj.oclass===layout.ARMOR_CLASS&&objects[obj.otyp].oc_armcat===layout[category];
    for(const [key,value]of Object.entries(layout))if(/^W_|^M1_/.test(key)||key==='I_SPECIAL')env[key]=BigInt(value);
    env.worn=namespace.worn.map(row=>({w_mask:typeof row.w_mask==='string'?long(layout[row.w_mask]):0n,
        w_obj:row.w_obj?cells[equipmentNames.indexOf(row.w_obj)]:0,w_what:row.w_what||0}));
    Object.defineProperties(env,{
        HEAP8:{get(){return arena.Int8;}},HEAPU8:{get(){return services.heap();}},
        ETelepat:{get(){return prop(layout.TELEPAT,'extrinsic');}},
        See_invisible:{get(){return either(layout.SEE_INVIS);}},Stone_resistance:{get(){return either(layout.STONE_RES);}},
        fmon:{get(){return svl.level.monlist;}},fobj:{get(){return svl.level.objlist;}},
        NH_BLACK:{get(){return services.commonString(0);}},Something:{get(){return services.commonString(1);}},
    });
    env.nativeByteBuffer=createNativeByteValues(environment);
    env.storeCharAt=(at,i,value)=>at?.nativeBytes?at.store(i,value):env.storeChar(address(at)+i,value);
    env.raceptr=mon=>permonst(services.raceptr(mon));
    Object.setPrototypeOf(env,services);
    return env;
}
