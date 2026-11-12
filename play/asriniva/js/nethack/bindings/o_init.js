import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// Live native storage and header expansions; object discovery policy stays in o_init.js.
export function createOInitEnvironment(services, layout, namespace) {
    const widths={pointerSize:8,longSize:8,sizeTSize:8,intSize:4,shortSize:2,shortSigned:1,
        charSize:1,charSigned:1,booleanSize:1,booleanSigned:1,
        cls_oc_name_idx_size:2,cls_oc_descr_idx_size:2,cls_oc_uname_size:8,
        cls_oc_class_size:1,cls_oc_color_size:1,cls_oc_prob_size:2,
        obj_otyp_size:2,obj_oclass_size:1,obj_corpsenm_size:4,obj_spe_size:1,obj_quan_size:8,
        descr_oc_name_size:8,descr_oc_descr_size:8,loot_obj_size:8,loot_str_size:8,
        loot_orderclass_size:1,loot_subclass_size:1,loot_disco_size:1,any_a_int_size:4,
        menu_item_size:8,prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        level_dnum_size:2,level_dlevel_size:2,nhf_mode_size:4,sym_sym_size:1,
        baseElementSize:4,discoElementSize:2,probTotalElementSize:2,
        sanityCheck_size:1,menuRequested_size:1,menuHeadingAttr_size:4,discosort_size:1,
        menuStyle_size:1,wizard_size:1,gameover_size:4,inMoveloop_size:4,
        roleMnum_size:2,currentFruit_size:4,config_SFCTOOL:0,config_TILES_IN_GLYPHMAP:0,config_NDEBUG:0};
    for(const[key,expected]of Object.entries(widths))if(layout[key]!==expected)
        throw new Error('Review changed o_init ABI: '+key);
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const global=i=>address(services.global(i));
    const view=()=>CAdapter.currentDataView(services);
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const int=value=>CAdapter.signedInt(value);
    const short=value=>int(value)<<16>>16;
    const char=value=>int(value)<<24>>24;
    const size_t=value=>BigInt.asUintN(64,BigInt(value));
    const scalar=(obj,key,at,kind)=>Object.defineProperty(obj,key,{
        get(){return view()['get'+kind](at(),true);},
        set(value){view()['set'+kind](at(),kind.includes('Big')?BigInt(value):Number(value),true);},
    });
    const ptrField=(obj,key,at,wrap=value=>value)=>Crt.definePointerField(pointer,view,raw,obj,key,at,wrap);
    const indexed=(get,set,at)=>new Proxy({address:at},{
        get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},
        set(obj,key,value){if(set&&typeof key==='string'&&/^-?\d+$/.test(key)){set(Number(key),value);return true;}return Reflect.set(obj,key,value);},
    });
    const scalarBox=(at,kind)=>{const obj={address:at};scalar(obj,'value',()=>at,kind);return obj;};
    function object(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[k,kind]of[['otyp','Int16'],['oclass','Int8'],['corpsenm','Int32'],['spe','Int8'],['quan','BigInt64']])
            scalar(obj,k,()=>at+layout['obj_'+k],kind);
        for(const[i,k]of['dknown','known'].entries())Object.defineProperty(obj,k,{
            get(){return services.objectBit(at,i);},set(value){services.setObjectBit(at,i,value);},
        });return obj;}
    function objectClass(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[k,kind]of[['oc_name_idx','Int16'],['oc_descr_idx','Int16'],['oc_class','Int8'],['oc_color','Uint8'],['oc_prob','Int16']])
            scalar(obj,k,()=>at+layout['cls_'+k],kind);
        ptrField(obj,'oc_uname',()=>at+layout.cls_oc_uname);
        for(const[i,k]of['oc_name_known','oc_encountered','oc_tough','oc_material','oc_unique','oc_magic','oc_uses_known','oc_dir'].entries())
            Object.defineProperty(obj,k,{get(){return services.classBit(at,i);},set(value){services.setClassBit(at,i,value);}});
        return obj;}
    function level(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const k of['dnum','dlevel'])scalar(obj,k,()=>at+layout['level_'+k],'Int16');return obj;}
    function nhfile(value){const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'mode',()=>at+layout.nhf_mode,'Int32');return obj;}
    function any(value){const at=address(value),obj={address:at};
        scalar(obj,'a_int',()=>at+layout.any_a_int,'Int32');return obj;}
    function loot(value){const at=address(value),obj={address:at};
        ptrField(obj,'obj',()=>at+layout.loot_obj,object);ptrField(obj,'str',()=>at+layout.loot_str);
        for(const k of['orderclass','subclass','disco'])scalar(obj,k,()=>at+layout['loot_'+k],'Int8');return obj;}
    const pointerArray=value=>{const at=address(value);if(!at)return 0;
        return indexed(i=>pointer(at+i*layout.pointerSize),(i,v)=>view().setBigUint64(at+i*layout.pointerSize,raw(v),true),at);};
    const menuArray=value=>{const at=address(value);if(!at)return 0;
        return indexed(i=>{const p=at+i*layout.menuItemSize;return{address:p,item:any(p+layout.menu_item)};},null,at);};
    const menuPointerLocal=()=>{const at=services.stackAlloc(layout.pointerSize),obj={address:at};
        ptrField(obj,'value',()=>at,menuArray);return obj;};
    const scalarArray=(at,kind,width)=>indexed(i=>view()['get'+kind](at+i*width,true),
        (i,v)=>view()['set'+kind](at+i*width,Number(v),true),at);
    const objects=indexed(i=>objectClass(global(0)+i*layout.objectClassSize));
    const obj_descr=indexed(i=>{const at=global(1)+i*layout.descriptorSize,obj={address:at};
        for(const k of['oc_name','oc_descr'])ptrField(obj,k,()=>at+layout['descr_'+k]);return obj;});
    const svb={},svd={},go={},iflags={menu_headings:{}},flags={},program_state={},u={},cg={},svc={context:{}};
    Object.defineProperty(svb,'bases',{get(){return scalarArray(global(2)+layout.bases,'Int32',4);}});
    Object.defineProperty(svd,'disco',{get(){return scalarArray(global(3)+layout.disco,'Int16',2);}});
    Object.defineProperty(go,'oclass_prob_totals',{get(){return scalarArray(global(4)+layout.probTotals,'Int16',2);}});
    scalar(iflags,'sanity_check',()=>global(5)+layout.sanityCheck,'Int8');
    scalar(iflags,'menu_requested',()=>global(5)+layout.menuRequested,'Int8');
    scalar(iflags.menu_headings,'attr',()=>global(5)+layout.menuHeadingAttr,'Int32');
    scalar(flags,'discosort',()=>global(6)+layout.discosort,'Int8');
    scalar(flags,'menu_style',()=>global(6)+layout.menuStyle,'Int8');
    Object.defineProperty(flags,'inv_order',{get(){return global(6)+layout.invOrder;}});
    scalar(program_state,'gameover',()=>global(7)+layout.gameover,'Int32');
    scalar(program_state,'in_moveloop',()=>global(7)+layout.inMoveloop,'Int32');
    Object.defineProperty(u,'uz',{get(){return level(global(8)+layout.u_uz);}});
    Object.defineProperty(cg,'zeroobj',{get(){return object(global(9)+layout.zeroobj);}});
    Object.defineProperty(cg,'zeroany',{get(){return any(global(9)+layout.zeroany);}});
    scalar(svc.context,'current_fruit',()=>global(11)+layout.currentFruit,'Int32');
    const def_oc_syms=indexed(i=>{const at=global(12)+i*layout.classSymSize,obj={address:at};
        scalar(obj,'sym',()=>at+layout.sym_sym,'Int8');return obj;});
    const env=Object.assign(Object.create(services),layout,{
        address,int,short,char,boolean:char,uint:value=>int(value)>>>0,size_t,
        bool:value=>Number(Boolean(value)),long:value=>BigInt.asIntN(64,BigInt(value)),
        object,objectClass,level,nhfile,pointerArray,any,loot,
        objects,obj_descr,svb,svd,go,iflags,flags,program_state,u,cg,svc,def_oc_syms,
        intPointer:value=>address(value)?scalarBox(address(value),'Int32'):0,
        intLocal:()=>scalarBox(services.stackAlloc(layout.intSize),'Int32'),
        uintLocal:()=>scalarBox(services.stackAlloc(layout.intSize),'Uint32'),
        charPointerLocal:()=>{const at=services.stackAlloc(layout.pointerSize),obj={address:at};ptrField(obj,'value',()=>at);return obj;},
        pointerArrayLocal:count=>pointerArray(services.stackAlloc(count*layout.pointerSize)),menuPointerLocal,
        objectLocal:()=>object(services.stackAlloc(layout.objectSize)),lootLocal:()=>loot(services.stackAlloc(layout.lootSize)),
        anyLocal:()=>any(services.stackAlloc(layout.anythingSize)),
        copyObject:(dst,src)=>services.heap().copyWithin(address(dst),address(src),address(src)+layout.objectSize),
        copyAny:(dst,src)=>services.heap().copyWithin(address(dst),address(src),address(src)+layout.anythingSize),
        intRef:(array,i)=>scalarBox(address(array)+i*4,'Int32'),shortRef:(array,i)=>scalarBox(address(array)+i*2,'Int16'),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
        loadPointer:at=>pointer(address(at)),loadChar:at=>view().getInt8(address(at)),storeChar:(at,value)=>view().setInt8(address(at),value),
        ptrAdd:(ptr,offset)=>{const bits=BigInt.asUintN(64,raw(ptr)+BigInt(offset));return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits);},
        ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),
        OBJ_NAME:cls=>obj_descr[cls.oc_name_idx].oc_name,OBJ_DESCR:cls=>obj_descr[cls.oc_descr_idx].oc_descr,
        Role_if:pm=>view().getInt16(global(10)+layout.roleMnum,true)===pm,
        update_file:fp=>fp.mode&(layout.COUNTING|layout.WRITING),release_data:fp=>fp.mode&layout.FREEING,
        qsort(base,count,size,compare){if(compare!==namespace.discovered_cmp)throw new Error('Unexpected original discovery comparator');
            return services.qsort(base,size_t(count),size_t(size));},
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return CAdapter.currentInt8View(services);}},HEAPU8:{get(){return services.heap();}},
        nul_glyphinfo:{get(){return services.nulGlyphInfo();}},WIN_MESSAGE:{get(){return services.winMessage();}},
        wizard:{get(){return view().getInt8(global(6)+layout.wizard);}},
        Hallucination:{get(){const at=global(8)+layout.u_uprops;
            const get=(id,key)=>view().getBigInt64(at+id*layout.propSize+layout['prop_'+key],true);
            return Boolean(get(layout.HALLUC,'intrinsic')&&!(get(layout.HALLUC_RES,'intrinsic')||get(layout.HALLUC_RES,'extrinsic')));}},
    });
    if(namespace.uniq_objs.length!==4||namespace.disco_orders_descr.length!==5||namespace.disco_orders_descr[4]!==0)
        throw new Error('Review changed discovery tables');
    env.uniq_objs=namespace.uniq_objs.map(key=>{const value=layout[key];if(!Number.isInteger(value))throw new Error('Missing discovery object '+key);return value;});
    env.disco_order_let=services.literal(namespace.disco_order_let);
    env.disco_orders_descr=namespace.disco_orders_descr.map(value=>value===0?0:services.literal(value));
    return env;
}
