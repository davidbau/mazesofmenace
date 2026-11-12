import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Fixed scalar field metadata only; offsets and ABI sizes remain checked per view.
const mondataFields=Object.freeze({
    attack:Object.freeze([Object.freeze(["aatyp","Uint8",1]),Object.freeze(["adtyp","Uint8",1]),Object.freeze(["damn","Uint8",1]),Object.freeze(["damd","Uint8",1])]),
    permonst:Object.freeze([Object.freeze(["pmidx","Int32",4]),Object.freeze(["mlet","Int8",1]),Object.freeze(["mlevel","Int8",1]),Object.freeze(["mmove","Int8",1]),Object.freeze(["ac","Int8",1]),Object.freeze(["geno","Uint16",2]),Object.freeze(["mresists","Uint8",1]),Object.freeze(["mflags1","BigUint64",8]),Object.freeze(["mflags2","BigUint64",8]),Object.freeze(["msize","Uint8",1]),Object.freeze(["msound","Uint8",1])]),
    object:Object.freeze([Object.freeze(["oclass","Int8",1]),Object.freeze(["otyp","Int16",2]),Object.freeze(["oartifact","Int8",1]),Object.freeze(["owornmask","BigInt64",8])]),
    monster:Object.freeze([Object.freeze(["mnum","Int16",2]),Object.freeze(["movement","Int16",2]),Object.freeze(["mhp","Int32",4]),Object.freeze(["mx","Int16",2]),Object.freeze(["my","Int16",2]),Object.freeze(["cham","Int16",2]),Object.freeze(["mtame","Int8",1]),Object.freeze(["m_lev","Uint8",1]),Object.freeze(["mintrinsics","Uint16",2]),Object.freeze(["mextrinsics","Uint16",2]),Object.freeze(["mtrapseen","BigInt64",8]),Object.freeze(["seen_resistance","BigUint64",8])]),
    trap:Object.freeze([Object.freeze(["tx","Int16",2]),Object.freeze(["ty","Int16",2])]),
    hero:Object.freeze([Object.freeze(["umovement","Int16",2]),Object.freeze(["ulycn","Int32",4]),Object.freeze(["ucreamed","Uint32",4]),Object.freeze(["umonnum","Int32",4]),Object.freeze(["umonster","Int32",4]),Object.freeze(["ulevel","Int32",4])]),
    props:Object.freeze([Object.freeze(["intrinsic","BigInt64",8]),Object.freeze(["extrinsic","BigInt64",8]),Object.freeze(["blocked","BigInt64",8])]),
    mvitals:Object.freeze([Object.freeze(["mvflags","Uint8",1])]),
    objects:Object.freeze([Object.freeze(["oc_oprop","Uint8",1]),Object.freeze(["oc_skill","Int8",1])]),
});
// Compiler layouts and header macros only; monster policy stays in mondata.js.
export function createMondataEnvironment(services, layout, namespace) {
    const widths = {pointerSize:8,longSize:8,intSize:4,shortSize:2,booleanSize:1,coordSize:2,
        config_DEBUG:1,config_MAKEDEFS_C:0};
    for (const [key,size] of Object.entries(widths)) if(layout[key]!==size)
        throw new Error('Review changed mondata ABI: '+key);
    const raw=value=>CAdapter.unsignedPointer(value);
    const address=value=>Number(value?.address??value??0);
    const identity=value=>{const bits=raw(value);return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits);};
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>identity(view().getBigUint64(at,true));
    const global=i=>address(services.global(i));
    const int=value=>CAdapter.signedInt(value,true);
    const boolean=value=>Number(BigInt.asIntN(8,BigInt(value)));
    const samePtr=(a,b)=>raw(a)===raw(b);
    const scalar=(obj,key,at,kind)=>Crt.defineScalarField(view,obj,key,at,kind);
    const fields=(obj,at,prefix,definitions)=>{
        for(const [key,kind,size] of definitions){
            if(layout[prefix+key+'_size']!==size)throw new Error('Review changed mondata field: '+prefix+key);
            scalar(obj,key,()=>at+layout[prefix+key],kind);
        }return obj;
    };
    const pointerField=(obj,key,at,wrap=value=>value)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=get=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);}});
    function attack(value){const at=address(value);if(!at)return 0;
        return fields({address:identity(value)},at,'atk_',mondataFields.attack);}
    function permonst(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'pm_',mondataFields.permonst);
        Object.defineProperties(obj,{
            mattk:{get(){return indexed(i=>attack(at+layout.pm_mattk+i*layout.attackSize));}},
            pmnames:{get(){return indexed(i=>pointer(at+layout.pm_pmnames+i*layout.pointerSize));}},
        });return obj;}
    function object(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'obj_',mondataFields.object);
        pointerField(obj,'nobj',()=>at+layout.obj_nobj,object);return obj;}
    function monster(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'mon_',mondataFields.monster);
        pointerField(obj,'data',()=>at+layout.mon_data,permonst);
        for(const key of ['mw','minvent'])pointerField(obj,key,()=>at+layout['mon_'+key],object);
        pointerField(obj,'nmon',()=>at+layout.mon_nmon,monster);
        for(const [i,key] of ['mblinded','mcansee','msleeping','mcan','female','iswiz','mflee'].entries())
            Object.defineProperty(obj,key,{get(){return services.monsterBit(at,i);}});
        return obj;}
    function trap(value){const at=address(value);if(!at)return 0;
        const obj=fields({address:identity(value)},at,'dtrap_',mondataFields.trap);
        Object.defineProperty(obj,'ttyp',{get(){return services.trapBit(at,0);}});return obj;}
    const scalarPointer=(value,kind)=>{const at=address(value);if(!at)return 0;const obj={address:identity(value)};scalar(obj,'value',()=>at,kind);return obj;};
    const intPointer=value=>scalarPointer(value,'Int32');
    const charPointer=value=>typeof value==='string'?services.literal(value):identity(value);
    const charPointerPointer=value=>{const at=address(value);if(!at)return 0;const obj={address:identity(value)};
        Object.defineProperty(obj,'value',{get(){return pointer(at);},set(value){view().setBigUint64(at,raw(charPointer(value)),true);}});return obj;};
    const u=fields({address:global(0)},global(0),'u_',mondataFields.hero);
    pointerField(u,'usteed',()=>global(0)+layout.u_usteed,monster);
    const props=indexed(i=>fields({address:global(0)+layout.u_uprops+i*layout.propSize},global(0)+layout.u_uprops+i*layout.propSize,'prop_',mondataFields.props));
    Object.defineProperty(u,'uprops',{get(){return props;}});
    for(const [i,key] of ['twoweap','uswallow'].entries())Object.defineProperty(u,key,{get(){return services.heroBit(i);}});
    u.uhave={};Object.defineProperty(u.uhave,'amulet',{get(){return services.heroBit(2);}});
    const gy={},svm={},gi={},cg={},gm={},gu={urace:{}};
    Object.defineProperty(gy,'youmonst',{get(){return monster(global(1)+layout.youmonst);}});
    Object.defineProperty(svm,'mvitals',{get(){return indexed(i=>fields({},global(2)+layout.mvitals+i*layout.mvitalSize,'mvital_',mondataFields.mvitals));}});
    pointerField(gi,'invent',()=>global(3)+layout.invent,object);
    Object.defineProperty(cg,'zeroobj',{get(){return object(global(4)+layout.zeroobj);}});
    scalar(gm,'multi',()=>global(5)+layout.multi,'BigInt64');
    scalar(gu.urace,'mnum',()=>global(8)+layout.raceMnum,'Int16');
    const mons=indexed(i=>permonst(global(9)+i*layout.permonstSize));
    const objects=indexed(i=>fields({address:global(10)+i*layout.objectClassSize},global(10)+i*layout.objectClassSize,'cls_',mondataFields.objects));
    const def_monsyms=indexed(i=>{const at=global(11)+i*layout.classSymSize,obj={address:at};
        scalar(obj,'sym',()=>at+layout.sym_sym,'Int8');pointerField(obj,'explain',()=>at+layout.sym_explain);return obj;});
    const levl=indexed(x=>indexed(y=>{const obj={};Object.defineProperty(obj,'lit',{get(){return services.terrainBit(x,y,0);}});return obj;}));
    const prop=(id,key)=>props[id][key];
    const either=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic'));
    const flag=(pm,field,key)=>Boolean(pm[field]&BigInt(layout[key]));
    const matches=(pm,...names)=>names.some(name=>samePtr(pm,mons[layout[name]]));
    const couldsee=(x,y)=>{const rows=pointer(global(7)+layout.vizArray),row=pointer(address(rows)+y*layout.pointerSize);
        return Boolean(view().getUint8(address(row)+x)&layout.COULD_SEE);};
    const env=Object.assign(Object.create(services),layout,{
        permonst,monster,object,attack,trap,intPointer,charPointerPointer,charPointer,
        u,gy,svm,gi,cg,gm,gu,mons,objects,def_monsyms,levl,int,boolean,bool:value=>Number(Boolean(value)),
        short:value=>int(value)<<16>>16,ushort:value=>int(value)&65535,uchar:value=>int(value)&255,uint:value=>int(value)>>>0,
        long:value=>BigInt.asIntN(64,BigInt(value)),ulong:value=>raw(value),size_t:value=>raw(value),samePtr,
        ptrAdd:(ptr,offset)=>identity(raw(ptr)+BigInt(offset)),ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),
        shortRef:(owner,key)=>scalarPointer(address(owner)+layout[(samePtr(owner,u)?'u_':'mon_')+key],'Int16'),
        attackBefore:(a,b)=>raw(a)<raw(b),attackNext:a=>attack(raw(a)+BigInt(layout.attackSize)),
        intLocal:()=>intPointer(services.stackAlloc(layout.intSize)),objectLocal:()=>object(services.stackAlloc(layout.objectSize)),
        copyObject:(dst,src)=>{const heap=services.heap();heap.copyWithin(address(dst),address(src),address(src)+layout.objectSize);},
        loadChar:at=>view().getInt8(address(at)),min:Math.min,
        monsndx:pm=>pm.pmidx,MON_WEP:mon=>mon.mw,
        Is_dragon_armor:obj=>(obj.otyp>=layout.GRAY_DRAGON_SCALES&&obj.otyp<=layout.YELLOW_DRAGON_SCALES)
            ||(obj.otyp>=layout.GRAY_DRAGON_SCALE_MAIL&&obj.otyp<=layout.YELLOW_DRAGON_SCALE_MAIL),
        is_weptool:obj=>obj.oclass===layout.TOOL_CLASS&&objects[obj.otyp].oc_skill!==layout.P_NONE,
        mon_resistancebits:mon=>mon.data.mresists|mon.mextrinsics|mon.mintrinsics,
        mon_perma_blind:mon=>!mon.mcansee&&!mon.mblinded,
        is_vampshifter:mon=>[layout.PM_VAMPIRE,layout.PM_VAMPIRE_LEADER,layout.PM_VLAD_THE_IMPALER].includes(mon.cham),
        verysmall:pm=>pm.msize<layout.MZ_SMALL,bigmonst:pm=>pm.msize>=layout.MZ_LARGE,
        is_golem:pm=>pm.mlet===layout.S_GOLEM,is_floater:pm=>pm.mlet===layout.S_EYE||pm.mlet===layout.S_LIGHT,
        noncorporeal:pm=>pm.mlet===layout.S_GHOST,is_silent:pm=>pm.msound===layout.MS_SILENT,
        is_whirly:pm=>pm.mlet===layout.S_VORTEX||matches(pm,'PM_AIR_ELEMENTAL'),
        haseyes:pm=>!flag(pm,'mflags1','M1_NOEYES'),has_head:pm=>!flag(pm,'mflags1','M1_NOHEAD'),
        nolimbs:pm=>(pm.mflags1&BigInt(layout.M1_NOLIMBS))===BigInt(layout.M1_NOLIMBS),
        is_mind_flayer:pm=>matches(pm,'PM_MIND_FLAYER','PM_MASTER_MIND_FLAYER'),
        is_unicorn:pm=>pm.mlet===layout.S_UNICORN&&flag(pm,'mflags2','M2_JEWELS'),
        is_rider:pm=>matches(pm,'PM_DEATH','PM_FAMINE','PM_PESTILENCE'),
        is_longworm:pm=>matches(pm,'PM_BABY_LONG_WORM','PM_LONG_WORM','PM_LONG_WORM_TAIL'),
        hates_light:pm=>matches(pm,'PM_GREMLIN'),
        completelyburns:pm=>matches(pm,'PM_PAPER_GOLEM','PM_STRAW_GOLEM'),
        completelyrots:pm=>matches(pm,'PM_WOOD_GOLEM','PM_LEATHER_GOLEM'),
        completelyrusts:pm=>matches(pm,'PM_IRON_GOLEM'),
        DISTANCE_ATTK_TYPE:type=>[layout.AT_SPIT,layout.AT_BREA,layout.AT_MAGC,layout.AT_GAZE].includes(type),
        u_wield_art:artifact=>services.is_art(env.uwep,artifact),ACURR:attr=>services.acurr(attr),
        DEADMONSTER:mon=>mon.mhp<1,canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        m_cansee:(mon,x,y)=>services.clear_path(mon.mx,mon.my,x,y),
        m_canseeu:mon=>(!env.Invis||flag(mon.data,'mflags1','M1_SEE_INVIS'))&&!env.Underwater&&couldsee(mon.mx,mon.my),
        m_setseenres:(mon,mask)=>{mon.seen_resistance=BigInt.asUintN(64,mon.seen_resistance|BigInt(mask));},
        m_clearseenres:(mon,mask)=>{mon.seen_resistance=BigInt.asUintN(64,mon.seen_resistance&~BigInt(mask));},
        res_to_mr:res=>layout.FIRE_RES<=res&&res<=layout.STONE_RES?(1<<(res-1))&255:0,
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const [key,mask] of Object.entries({is_flyer:'M1_FLY',breathless:'M1_BREATHLESS',passes_walls:'M1_WALLWALK',amorphous:'M1_AMORPHOUS',unsolid:'M1_UNSOLID',mindless:'M1_MINDLESS',humanoid:'M1_HUMANOID',is_animal:'M1_ANIMAL',slithy:'M1_SLITHY',metallivorous:'M1_METALLIVORE'}))
        env[key]=pm=>flag(pm,'mflags1',mask);
    for(const [key,mask] of Object.entries({is_undead:'M2_UNDEAD',is_were:'M2_WERE',is_elf:'M2_ELF',is_dwarf:'M2_DWARF',is_gnome:'M2_GNOME',is_orc:'M2_ORC',is_human:'M2_HUMAN',is_giant:'M2_GIANT',is_demon:'M2_DEMON',is_neuter:'M2_NEUTER',is_minion:'M2_MINION',type_is_pname:'M2_PNAME'}))
        env[key]=pm=>flag(pm,'mflags2',mask);
    Object.defineProperties(env,{
        fmon:{get(){return monster(pointer(global(6)+layout.fmon));}},
        uwep:{get(){return object(services.equipment(0));}},uarm:{get(){return object(services.equipment(1));}},ublindf:{get(){return object(services.equipment(2));}},
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        Blind:{get(){return Boolean(either(layout.BLINDED)&&!prop(layout.BLINDED,'blocked'));}},Blindfolded:{get(){return prop(layout.BLINDED,'extrinsic');}},
        Blnd_resist:{get(){return either(layout.BLND_RES);}},Strangled:{get(){return prop(layout.STRANGLED,'intrinsic');}},
        Unaware:{get(){return Boolean(gm.multi<0&&(services.unconscious()||services.is_fainted()));}},
        Hallucination:{get(){return Boolean(prop(layout.HALLUC,'intrinsic')&&!either(layout.HALLUC_RES));}},
        Breathless:{get(){return either(layout.MAGICAL_BREATHING)||flag(gy.youmonst.data,'mflags1','M1_BREATHLESS');}},
        Upolyd:{get(){return u.umonnum!==u.umonster;}},Invis:{get(){return Boolean(either(layout.INVIS)&&!prop(layout.INVIS,'blocked'));}},
        Underwater:{get(){return services.heroBit(3);}},
    });
    for(const [key,value] of Object.entries(layout))if(/^(M1_|M2_|M_SEEN_|W_)/.test(key)||key==='INTRINSIC')env[key]=BigInt(value);
    env.grownups=namespace.grownups.map(row=>row.map(symbol=>typeof symbol==='string'?layout[symbol]:symbol));
    for(const key of ['levitate','flys','flyl','slither','ooze','immobile','crawl'])env[key]=namespace[key].map(services.literal);
    env.which_armor=(...args)=>object(services.which_armor(...args));
    return env;
}
