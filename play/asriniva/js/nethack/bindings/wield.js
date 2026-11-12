import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Live native layouts, original header macros, and addressable-local ABI only.
export function createWieldEnvironment(services,layout,namespace) {
    for(const[key,size]of Object.entries({pointerSize:8,longSize:8,intSize:4,shortSize:2,booleanSize:1,coordSize:2}))
        if(layout[key]!==size)throw new Error('Review changed wield ABI: '+key);
    const raw=value=>CAdapter.unsignedPointer(value);
    const identity=value=>{const bits=raw(value);return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits);};
    const address=value=>Number(value?.address??value??0);
    const view=()=>CAdapter.currentDataView(services);
    const global=index=>address(services.global(index));
    const pointer=at=>identity(view().getBigUint64(at,true));
    const int=value=>CAdapter.signedInt(value,true);
    const long=value=>BigInt.asIntN(64,BigInt(value));
    const samePtr=(a,b)=>raw(a)===raw(b);
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const ptrField=(obj,key,at,wrap=value=>value)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const fields=(obj,at,prefix,definitions)=>{
        for(const[key,kind]of definitions){
            if(layout[prefix+key+'_size']!==Number(kind.match(/\d+/)[0])/8)
                throw new Error('Review changed wield field: '+prefix+key);
            scalar(obj,key,()=>at+layout[prefix+key],kind);
        }return obj;
    };
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function permonst(value){const at=address(value);if(!at)return 0;
        const pm=fields({address:identity(value)},at,'pm_',[['msize','Uint8'],['mlet','Int8'],['mflags1','BigUint64'],['mflags2','BigUint64']]);
        pm.mattk=indexed(index=>fields({address:at+layout.pm_mattk+index*layout.attackSize},at+layout.pm_mattk+index*layout.attackSize,'atk_',[['aatyp','Uint8']]));return pm;}
    function oextra(value){const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        ptrField(obj,'oname',()=>at+layout.oextra_oname);return obj;}
    function object(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'obj_',[['otyp','Int16'],['oclass','Int8'],['oartifact','Int8'],['corpsenm','Int32'],['o_id','Uint32'],['quan','BigInt64'],['owt','Uint32'],['owornmask','BigInt64'],['spe','Int8']]);
        ptrField(obj,'nobj',()=>at+layout.obj_nobj,object);ptrField(obj,'oextra',()=>at+layout.obj_oextra,oextra);
        for(const[index,key]of ['cursed','bknown','lamplit','unpaid','oerodeproof','known'].entries())
            Object.defineProperty(obj,key,{get(){return services.objectBit(at,index);},set(value){services.setObjectBit(at,index,value);}});
        return obj;}
    function monster(value){const at=address(value);if(!at)return 0;const mon={address:identity(value)};
        ptrField(mon,'data',()=>at+layout.mon_data,permonst);return mon;}
    const equipmentNames=['uwep','uswapwep','uquiver','uarmg','uarms'];
    const cells=equipmentNames.map((name,index)=>{const at=address(services.equipmentCell(index)),cell={address:at};ptrField(cell,'value',()=>at,object);return cell;});
    const u=fields({address:global(0)},global(0),'u_',[['twoweap','Int8'],['ux','Int16'],['uy','Int16'],['umonnum','Int32'],['umonster','Int32']]);
    ptrField(u,'usteed',()=>global(0)+layout.u_usteed,monster);
    Object.defineProperty(u,'uhandedness',{get(){return services.heroBit(0);}});
    const props=indexed(index=>{const at=global(0)+layout.u_uprops+index*layout.propSize;return fields({address:at},at,'prop_',[['intrinsic','BigInt64'],['extrinsic','BigInt64'],['blocked','BigInt64']]);});u.uprops=props;
    const objects=indexed(index=>{const at=global(1)+index*layout.objectClassSize;const obj=fields({address:at},at,'cls_',[['oc_skill','Int8'],['oc_armcat','Int8']]);Object.defineProperty(obj,'oc_bimanual',{get(){return services.classBit(at,0);}});return obj;});
    const mons=indexed(index=>permonst(global(2)+index*layout.permonstSize));
    const gy={},gu={urole:{name:{}}},flags={},disp={},gi={},gm={},svc={context:{objsplit:{}}};
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(3)+layout.youmonst);}});
    scalar(gu,'unweapon',()=>global(4)+layout.unweapon,'Int8');
    ptrField(gu.urole.name,'m',()=>global(4)+layout.roleNameM);ptrField(gu.urole.name,'f',()=>global(4)+layout.roleNameF);
    for(const key of ['female','verbose','pushweapon','weaponstatus'])scalar(flags,key,()=>global(5)+layout[key],'Int8');
    scalar(disp,'botl',()=>global(6)+layout.botl,'Int8');ptrField(gi,'invent',()=>global(7)+layout.invent,object);scalar(gm,'multi',()=>global(8)+layout.multi,'BigInt64');
    for(const key of ['child_oid','parent_oid'])scalar(svc.context.objsplit,key,()=>global(9)+layout[key],'Uint32');
    const condtests=indexed(index=>{const obj={};scalar(obj,'enabled',()=>global(10)+index*layout.condtestSize+layout.cond_enabled,'Int8');return obj;});
    const either=index=>Boolean(props[index].intrinsic||props[index].extrinsic);
    const skill=obj=>objects[obj.otyp].oc_skill;
    const weaponOrTool=obj=>obj.oclass===layout.WEAPON_CLASS||obj.oclass===layout.TOOL_CLASS;
    const env=Object.assign(Object.create(services),layout,{
        object,monster,permonst,u,objects,mons,gy,gu,flags,disp,gi,gm,svc,condtests,samePtr,int,long,ulong:raw,
        boolean:value=>int(value)<<24>>24,char:value=>int(value)<<24>>24,
        charPointer:value=>typeof value==='string'?services.literal(value):identity(value),
        loadChar:at=>view().getInt8(address(at)),
        storeChar(at,value){const ch=int(value)<<24>>24;view().setInt8(address(at),ch);return ch;},
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
        objectReference:(get,set)=>({get,set}),
        retouch_object(ref,loseit){const saved=services.stackSave();let at=0,initialized=false;
            try{at=services.stackAlloc(layout.pointerSize);view().setBigUint64(at,raw(ref.get()),true);initialized=true;return services.retouch_object(at,loseit);}
            finally{try{if(initialized)ref.set(object(pointer(at)));}finally{services.stackRestore(saved);}}},
        getobj(prompt,selector,flags){const index=selector===namespace.ready_ok?0:selector===namespace.wield_ok?1:-1;
            if(index<0)throw new Error('Unexpected original wield getobj callback');
            return object(services.getobj(prompt,services.callbackPointer(index),flags));},
        is_weptool:obj=>obj.oclass===layout.TOOL_CLASS&&skill(obj)!==layout.P_NONE,
        bimanual:obj=>weaponOrTool(obj)&&objects[obj.otyp].oc_bimanual,
        is_pole:obj=>weaponOrTool(obj)&&(skill(obj)===layout.P_POLEARMS||skill(obj)===layout.P_LANCE||services.is_art(obj,layout.ART_SNICKERSNEE)),
        is_sword:obj=>obj.oclass===layout.WEAPON_CLASS&&skill(obj)>=layout.P_SHORT_SWORD&&skill(obj)<=layout.P_SABER,
        is_launcher:obj=>obj.oclass===layout.WEAPON_CLASS&&skill(obj)>=layout.P_BOW&&skill(obj)<=layout.P_CROSSBOW,
        is_ammo:obj=>(obj.oclass===layout.WEAPON_CLASS||obj.oclass===layout.GEM_CLASS)&&skill(obj)>=-layout.P_CROSSBOW&&skill(obj)<=-layout.P_BOW,
        is_missile:obj=>weaponOrTool(obj)&&skill(obj)>=-layout.P_BOOMERANG&&skill(obj)<=-layout.P_DART,
        is_wet_towel:obj=>obj.otyp===layout.TOWEL&&obj.spe>0,
        is_plural:obj=>obj.quan!==1n||(obj.oartifact===layout.ART_EYES_OF_THE_OVERWORLD&&!services.undiscovered_artifact(layout.ART_EYES_OF_THE_OVERWORLD)),
        pair_of:obj=>obj.otyp===layout.LENSES||(obj.oclass===layout.ARMOR_CLASS&&(objects[obj.otyp].oc_armcat===layout.ARM_GLOVES||objects[obj.otyp].oc_armcat===layout.ARM_BOOTS)),
        is_elven_weapon:obj=>['ELVEN_ARROW','ELVEN_SPEAR','ELVEN_DAGGER','ELVEN_SHORT_SWORD','ELVEN_BROADSWORD','ELVEN_BOW'].some(key=>obj.otyp===layout[key]),
        could_twoweap:pm=>Number(pm.mattk[0].aatyp===layout.AT_WEAP)+Number(pm.mattk[1].aatyp===layout.AT_WEAP)+Number(pm.mattk[2].aatyp===layout.AT_WEAP)>1,
        cantwield:pm=>Boolean(pm.mflags1&BigInt(layout.M1_NOHANDS))||pm.msize<layout.MZ_SMALL,
        humanoid:pm=>Boolean(pm.mflags1&BigInt(layout.M1_HUMANOID)),
        touch_petrifies:pm=>samePtr(pm,mons[layout.PM_COCKATRICE])||samePtr(pm,mons[layout.PM_CHICKATRICE]),
        u_wield_art:artifact=>services.is_art(cells[0].value,artifact),
        ONAME:obj=>obj.oextra.oname,has_oname:obj=>Boolean(obj.oextra&&obj.oextra.oname),
        makeknown:otyp=>services.discover_object(int(otyp),1,1,1),ACURR:services.acurr,
        plur:n=>n==1n?'':'s',
    });
    env.ammo_and_launcher=(ammo,launcher)=>env.is_ammo(ammo)&&launcher&&skill(ammo)===-skill(launcher);
    for(const[index,key]of equipmentNames.entries())Object.defineProperty(env,key,{get(){return cells[index].value;},set(value){cells[index].value=value;}});
    for(const[key,value]of Object.entries(layout))if(/^W_|^M1_|^M2_/.test(key))env[key]=BigInt(value);
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        hands_obj:{get(){return object(services.hands());}},
        NH_BLACK:{get(){return services.commonString(0);}},NH_BLUE:{get(){return services.commonString(1);}},NH_AMBER:{get(){return services.commonString(2);}},
        URIGHTY:{get(){return u.uhandedness===layout.RIGHT_HANDED;}},
        Upolyd:{get(){return u.umonnum!==u.umonster;}},
        Blind:{get(){return Boolean((props[layout.BLINDED].intrinsic||props[layout.BLINDED].extrinsic)&&!props[layout.BLINDED].blocked);}},
        Stone_resistance:{get(){return either(layout.STONE_RES);}},
        Hallucination:{get(){return Boolean(props[layout.HALLUC].intrinsic&&!either(layout.HALLUC_RES));}},
        Glib:{get(){return props[layout.GLIB].intrinsic;}},
    });
    for(const key of ['unsplitobj','splitobj','addinv_nomerge'])env[key]=(...args)=>object(services[key](...args));
    env.shop_keeper=(...args)=>monster(services.shop_keeper(...args));
    return env;
}
