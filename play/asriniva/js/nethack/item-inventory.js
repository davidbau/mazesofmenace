// Existing item generation and inventory functions on one JS-owned heap.
import * as artifact from '../ported/artifact.js';
import {erosion_matters,rnd_class} from '../ported/objnam.js';
import {safe_oname} from '../ported/do_name.js';
import {stone_luck,set_moreluck} from '../ported/attrib.js';
import {enableSpell} from './spell.js';
import {food_disappears} from '../ported/eat.js';
import {obj_sheds_light} from '../ported/light.js';
import {maybe_reset_pick} from '../ported/lock.js';
import {createRecordViews} from './record-views.js';
export function enableItemInventory(environment,layouts) {
    const {services,transport,ctypes}=environment,views=createRecordViews(environment);
    for(const [name,type]of [['windowprocs','struct window_procs'],['zerowri','struct win_request_info_t']]){
        try{environment.requireGlobal(name);}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;environment.allocateGlobal(name,ctypes.size(type));}
    }
    const object=p=>views.record('struct obj',p);
    const common=new Proxy(Object.create(services),{get(target,key,receiver){
        if(Reflect.has(target,key))return Reflect.get(target,key,receiver);
        if(typeof key!=='string')return undefined;
        return (...args)=>environment.resolve(key)(...args);
    }});
    // Typed header constants; preserve their compiler-reported 64-bit widths.
    function constants(layout){const result={...layout};for(const [key,width]of Object.entries(layout))if(key.startsWith('constwidth_')){
        const name=key.slice(11);result[name]=Number(width)===8?BigInt(layout[name]):Number(layout[name]);
    }return result;}
    const legacy=Object.create(common);
    Object.defineProperties(legacy,Object.getOwnPropertyDescriptors(transport));
    Object.assign(legacy,constants(layouts.artifact),constants(layouts.objnam),constants(layouts.attrib),constants(layouts.spell),{
        int:transport.int,uint:transport.uint,long:transport.long,char:transport.char,TRUE:1,FALSE:0,
        callLocal:(fn,...args)=>transport.scoped(fn,...args),bool:v=>Number(Boolean(v)),sgn:Math.sign,
        argument:(v,type)=>type.includes('*')?(type.includes('struct obj')?object(v):environment.address(v)):type==='unsigned int'?transport.uint(v):transport.int(v),
        ptrAdd:(p,n,type)=>environment.address(p)+Number(n)*ctypes.size(type),deref:(p,type)=>views.record(type,p),
        has_oname:o=>Boolean(o?.oextra?.oname),samePtr:(a,b)=>environment.address(a)===environment.address(b),
        impossible:(fmt,...args)=>environment.diagnostics.push(environment.libc.format(fmt,...args)),
    });
    for(const [name,type]of Object.entries({u:'you',gi:'instance_globals_i',go:'instance_globals_o',gm:'instance_globals_m',gu:'instance_globals_u',svc:'instance_globals_saved_c',gx:'instance_globals_x'}))
        Object.defineProperty(legacy,name,{value:views.record('struct '+type,environment.requireGlobal(name))});
    Object.defineProperty(legacy,'objects',{value:views.array('struct objclass',environment.requireGlobal('objects'),layouts.o_init.NUM_OBJECTS)});
    Object.defineProperty(legacy,'carrying',{value:type=>object(environment.resolve('carrying')(type))});
    legacy.artilist=views.array('struct artifact',environment.allocateGlobal('artilist',35*ctypes.size('struct artifact')),35);
    legacy.artiexist=views.array('struct arti_info',environment.allocateGlobal('artiexist',34*ctypes.size('struct arti_info')),34);
    legacy.sizes={artilist:35*ctypes.size('struct artifact')};legacy.state={initialized:false};
    artifact.initializeArtifactData(legacy);
    environment.register('artifact-properties',Object.fromEntries(['is_art','get_artifact','spec_ability','confers_luck','permapoisoned','nartifact_exist'].map(k=>[k,artifact[k]])),legacy,{prepareArgs:(fn,args)=>{if(!['nartifact_exist','exist_artifact'].includes(fn))args[0]=object(args[0]);return args;}});
    environment.register('object-selection',{erosion_matters,rnd_class},legacy);
    environment.register('object-safe-name',{safe_oname},legacy,{prepareArgs:(_fn,args)=>[object(args[0])]});
    environment.register('inventory-luck',{stone_luck,set_moreluck},legacy,{prepareArgs:(name,args)=>name==='stone_luck'?[transport.char(args[0])]:args});
    const book_cursed=obj=>enableSpell(environment,layouts).call('book_cursed',obj),book_disappears=obj=>enableSpell(environment,layouts).call('book_disappears',obj);
    environment.register('inventory-context',{book_cursed,book_disappears,food_disappears,obj_sheds_light,maybe_reset_pick},legacy,{prepareArgs:(_fn,args)=>[object(args[0])]});
    environment.exposeAddressPort('dungeon',['on_level','In_hell','In_quest']);
    environment.exposeAddressPort('mkobj',['mksobj','mkobj','mksobj_init','unknow_object','clear_dknown','bless','unbless','curse','uncurse','blessorcurse','mkobj_erosions','may_generate_eroded','obj_extract_self','dealloc_obj','dobjsfree','add_to_container']);
    environment.enableAddressPort('pickup',{only:['reset_justpicked']});
    environment.enableAddressPort('shk',{only:['picked_container','same_price','obfree','oid_price_adjustment']});
    environment.enableAddressPort('display',{only:['suppress_map_output']});
    environment.enableAddressPort('invent',{only:['assigninvlet','reorder_invent','merged','mergable','addinv','addinv_before','addinv_nomerge','addinv_core0','addinv_core1','addinv_core2','carry_obj_effects','freeinv','freeinv_core','update_inventory','carrying','currency','o_on','count_unpaid','count_contents']});
    return {views,legacy,limitation:'Generation/inventory dependency integration in progress; unresolved owners still fail explicitly.'};
}
