// Private C static state is owned by JS, separately for each actual WASM Module.
export function createWormState(services, layout) {
    const growtimeValues=new BigInt64Array(layout.MAX_NUM_WORMS);
    const growtimeBorrows=new Map();
    const indexed=key=>typeof key==='string'&&/^-?\d+$/.test(key);
    const state={wheads:Array(layout.MAX_NUM_WORMS).fill(0),wtails:Array(layout.MAX_NUM_WORMS).fill(0),
        growtimeValues,growtimeBorrows};
    state.wgrowtime=new Proxy({length:layout.MAX_NUM_WORMS},{
        get(obj,key){
            if(key===Symbol.iterator)return function*(){for(let i=0;i<layout.MAX_NUM_WORMS;i++)yield state.wgrowtime[i];};
            if(indexed(key)){const i=Number(key),borrow=growtimeBorrows.get(i);
                return borrow?new DataView(services.heap().buffer).getBigInt64(borrow.address,true):growtimeValues[i];}
            return Reflect.get(obj,key);
        },
        set(obj,key,value){if(indexed(key)){const i=Number(key),borrow=growtimeBorrows.get(i);
            if(borrow)new DataView(services.heap().buffer).setBigInt64(borrow.address,BigInt(value),true);
            else growtimeValues[i]=BigInt(value);return true;}return Reflect.set(obj,key,value);},
    });
    return state;
}

// Live native storage and header expansions; worm policy remains in worm.js.
export function createWormEnvironment(services, layout, state) {
    const widths={pointerSize:8,longSize:8,intSize:4,booleanSize:1,booleanSigned:1,
        coordxySize:2,coordxySigned:1,seg_nseg_size:8,seg_wx_size:2,seg_wy_size:2,
        mon_data_size:8,mon_mx_size:2,mon_my_size:2,mon_mhp_size:4,mon_mhpmax_size:4,
        mon_m_lev_size:1,mon_mtame_size:1,mon_mextra_size:8,mextra_mcorpsenm_size:4,
        u_ux_size:2,u_uy_size:2,prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,
        nhf_mode_size:4,nhf_structlevel_size:1,nhf_fnidx_size:4,moves_size:8,
        monMoving_size:1,vizArray_size:8,config_SFCTOOL:0,config_EXTRA_SANITY_CHECKS:0};
    for(const[key,expected]of Object.entries(widths))if(layout[key]!==expected)
        throw new Error('Review changed worm ABI: '+key);
    if(state.wheads.length!==layout.MAX_NUM_WORMS||state.wtails.length!==layout.MAX_NUM_WORMS
        ||state.wgrowtime.length!==layout.MAX_NUM_WORMS)throw new Error('Review changed worm slots');
    const address=value=>Number(value?.address??value??0);
    const raw=value=>BigInt.asUintN(64,BigInt(value?.address??value??0));
    const global=i=>address(services.global(i));
    const view=()=>new DataView(services.heap().buffer);
    const rawPointer=at=>view().getBigUint64(at,true);
    const pointer=at=>Number(rawPointer(at));
    const int=value=>typeof value==='bigint'?Number(BigInt.asIntN(32,value)):value|0;
    const boolean=value=>int(value)<<24>>24;
    const coordxy=value=>int(value)<<16>>16;
    const long=value=>BigInt.asIntN(64,BigInt(value));
    const scalar=(obj,key,at,kind)=>Object.defineProperty(obj,key,{
        get(){return view()['get'+kind](at(),true);},
        set(value){view()['set'+kind](at(),kind.includes('Big')?BigInt(value):Number(value),true);},
    });
    const ptrField=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{
        get(){return wrap(pointer(at()));},set(value){view().setBigUint64(at(),raw(value),true);},
    });
    const indexed=(get,set,at)=>new Proxy({address:at},{
        get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},
        set(obj,key,value){if(set&&typeof key==='string'&&/^-?\d+$/.test(key)){set(Number(key),value);return true;}return Reflect.set(obj,key,value);},
    });
    function segment(value){const at=address(value);if(!at)return 0;const obj={address:at};
        ptrField(obj,'nseg',()=>at+layout.seg_nseg,segment);
        for(const k of['wx','wy'])scalar(obj,k,()=>at+layout['seg_'+k],'Int16');return obj;}
    const permonst=value=>address(value)?{address:address(value)}:0;
    function mextra(value){const at=address(value);if(!at)return 0;const obj={address:at};
        scalar(obj,'mcorpsenm',()=>at+layout.mextra_mcorpsenm,'Int32');return obj;}
    function monster(value){const bits=raw(value);if(!bits)return 0;const at=Number(bits);
        const obj={address:bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:at};
        ptrField(obj,'data',()=>at+layout.mon_data,permonst);ptrField(obj,'mextra',()=>at+layout.mon_mextra,mextra);
        for(const[k,kind]of[['mx','Int16'],['my','Int16'],['mhp','Int32'],['mhpmax','Int32'],['m_lev','Uint8'],['mtame','Int8']])
            scalar(obj,k,()=>at+layout['mon_'+k],kind);
        for(const[i,k]of['wormno','mcloned','female'].entries())Object.defineProperty(obj,k,{
            get(){return services.monsterBit(at,i);},set(value){services.setMonsterBit(at,i,value);},
        });return obj;}
    function nhfile(value){const at=address(value);if(!at)return 0;const obj={address:at};
        for(const[k,kind]of[['mode','Int32'],['structlevel','Int8'],['fnidx','Int32']])scalar(obj,k,()=>at+layout['nhf_'+k],kind);return obj;}
    const scalarBox=(at,kind)=>{const obj={address:at};scalar(obj,'value',()=>at,kind);return obj;};
    const u={},svm={},svc={context:{}};
    for(const k of['ux','uy'])scalar(u,k,()=>global(3)+layout['u_'+k],'Int16');
    scalar(svm,'moves',()=>global(1)+layout.moves,'BigInt64');
    scalar(svc.context,'mon_moving',()=>global(2)+layout.monMoving,'Int8');
    const gridAt=(x,y)=>global(0)+layout.floorMonsters+(x*layout.ROWNO+y)*8;
    const svl={level:{monsters:indexed(x=>indexed(y=>monster(rawPointer(gridAt(x,y))),
        (y,value)=>view().setBigUint64(gridAt(x,y),raw(value),true)))}};
    const mons=indexed(i=>permonst(global(5)+i*layout.permonstSize));
    const wheads=indexed(i=>segment(state.wheads[i]),(i,value)=>{state.wheads[i]=address(value);});
    const wtails=indexed(i=>segment(state.wtails[i]),(i,value)=>{state.wtails[i]=address(value);});
    const namedCoords=new Map();
    let growtimeBuffer=0;
    // The active borrowed native cell is authoritative, including through reentry.
    function serializeLong(name,fp,ref,tag){
        const index=ref.index;
        let borrow=state.growtimeBorrows.get(index);
        if(borrow){borrow.depth++;}
        else{
            if(!growtimeBuffer)growtimeBuffer=services.stackAlloc(layout.MAX_NUM_WORMS*layout.longSize);
            const at=growtimeBuffer+index*layout.longSize;
            view().setBigInt64(at,state.wgrowtime[index],true);
            borrow={address:at,depth:1};state.growtimeBorrows.set(index,borrow);
        }
        try{return services[name](fp,{address:borrow.address},tag);}
        finally{if(--borrow.depth===0){
            state.growtimeValues[index]=view().getBigInt64(borrow.address,true);
            state.growtimeBorrows.delete(index);
        }}
    }
    const env=Object.assign(Object.create(services),layout,{
        address,int,uint:value=>int(value)>>>0,boolean,coordxy,long,ulong:value=>BigInt.asUintN(64,BigInt(value)),
        bool:value=>Number(Boolean(value)),segment,monster,permonst,nhfile,u,svm,svc,svl,mons,wheads,wtails,
        wgrowtime:state.wgrowtime,wormState:state,
        samePtr:(a,b)=>raw(a)===raw(b),
        newseg:()=>segment(services.alloc(layout.segmentSize)),dealloc_seg:seg=>services.free(seg),
        intLocal:()=>scalarBox(services.stackAlloc(layout.intSize),'Int32'),
        coordxyLocal(name){if(!namedCoords.has(name))namedCoords.set(name,scalarBox(services.stackAlloc(layout.coordxySize),'Int16'));
            return namedCoords.get(name);},
        coordRef:(seg,key)=>scalarBox(address(seg)+layout['seg_'+key],'Int16'),
        growtimeRef:index=>({index}),
        Sfo_long:(fp,ref,tag)=>serializeLong('Sfo_long',fp,ref,tag),
        Sfi_long:(fp,ref,tag)=>serializeLong('Sfi_long',fp,ref,tag),
        max:Math.max,has_mcorpsenm:mon=>Boolean(mon.mextra&&mon.mextra.mcorpsenm!==layout.NON_PM),
        m_at:(x,y)=>monster(rawPointer(gridAt(x,y))),
        remove_monster:(x,y)=>view().setBigUint64(gridAt(x,y),0n,true),
        place_worm_seg:(mon,x,y)=>view().setBigUint64(gridAt(x,y),raw(mon),true),
        distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        cansee(x,y){return Boolean(view().getUint8(pointer(pointer(global(4)+layout.vizArray)+y*8)+x)&layout.IN_SIGHT);},
        update_file:fp=>fp.mode&(layout.COUNTING|layout.WRITING),release_data:fp=>fp.mode&layout.FREEING,
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        newsym_rn2:services.rn2_on_display_rng,
        what_mon:(mon,rng)=>env.Hallucination?rng(layout.NUMMONS):mon,
        monnum_to_glyph:(mon,gender)=>int(int(mon)+(gender===layout.MALE?layout.GLYPH_MON_MALE_OFF:layout.GLYPH_MON_FEM_OFF)),
        detected_monnum_to_glyph:(mon,gender)=>int(int(mon)+(gender===layout.MALE?layout.GLYPH_DETECT_MALE_OFF:layout.GLYPH_DETECT_FEM_OFF)),
        petnum_to_glyph:(mon,gender)=>int(int(mon)+(gender===layout.MALE?layout.GLYPH_PET_MALE_OFF:layout.GLYPH_PET_FEM_OFF)),
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return new Int8Array(services.heap().buffer);}},HEAPU8:{get(){return services.heap();}},
        Hallucination:{get(){const at=global(3)+layout.u_uprops;
            const get=(id,key)=>view().getBigInt64(at+id*layout.propSize+layout['prop_'+key],true);
            return Boolean(get(layout.HALLUC,'intrinsic')&&!(get(layout.HALLUC_RES,'intrinsic')||get(layout.HALLUC_RES,'extrinsic')));}},
    });
    env.clone_mon=(...args)=>monster(services.clone_mon(...args));
    return env;
}
