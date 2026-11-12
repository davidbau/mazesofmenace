import * as CAdapter from '../../c-runtime/adapter-factories.js';
// PLINE ABI views, per-module statics, and va_list transport only.
import * as pline from '../../ported/pline.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const fields=[["gs.saved_pline_index", "Uint32"], ["gs.saved_plines", "array"], ["iflags.debug_prevent_pline", "Int8"], ["gp.pline_flags", "Uint32"], ["windowprocs.wincap2", "BigUint64"], ["WIN_MESSAGE", "Int32"], ["a11y.msg_loc", "coord"], ["u.ux", "Int16"], ["u.uy", "Int16"], ["program_state.done_hup", "Int32"], ["program_state.wizkit_wishing", "Int32"], ["a11y.accessiblemsg", "Int8"], ["iflags.getpos_coords", "Int32"], ["iflags.window_inited", "Int8"], ["iflags.last_msg", "Int32"], ["gp.prevmsg", "bytes"], ["gv.vision_full_recalc", "Int8"], ["gy.you_buf", "pointer"], ["gy.you_buf_siz", "Int32"], ["gg.gamelog", "gamelog"], ["svm.moves", "BigInt64"], ["program_state.beyond_savefile_load", "Int32"], ["ge.early_raw_messages", "Int32"], ["program_state.in_impossible", "Int32"], ["iflags.debug_fuzzer", "Int8"], ["program_state.in_sanity_check", "Int32"], ["program_state.something_worth_saving", "Int32"], ["sysopt.support", "pointer"], ["sysopt.crashreporturl", "pointer"], ["sysopt.msghandler", "pointer"], ["flags.acoustics", "Int8"], ["gy.youmonst", "monster"], ["ynchars", "bytes"]];
const variadic=new Set(['pline','pline_dir','pline_xy','pline_mon','custompline','urgent_pline','Norep','You','Your','You_feel','You_cant','pline_The','There','You_hear','You_see','verbalize','livelog_printf','raw_printf','impossible']);
export function createPlineEnvironment(services,layout,state) {
    for(const[key,value]of Object.entries({pointerSize:8,intSize:4,longSize:8,coordxySize:2,booleanSize:1,charSigned:1,vaSize:8,config_CHRONICLE:1,config_DUMPLOG_CORE:1,config_HANGUPHANDLING:1,config_CRASHREPORT:1,config_UNIX:1,config_SND_SPEECH:0,config_USER_SOUNDS:0,config_SND_LIB_INTEGRATED:0,config_WIN32:0,config_VMS:0}))
        if(layout[key]!==value)throw new Error('Review changed PLINE ABI/config: '+key);
    const address=value=>Number(value?.address??value??0), raw=value=>CAdapter.unsignedPointer(value);
    const memory=()=>CAdapter.currentDataView(services),pointer=at=>Number(memory().getBigUint64(at,true));
    const indexed=(get,set)=>new Proxy({}, {get(o,key){return typeof key==='string'&&/^\d+$/.test(key)?get(Number(key)):Reflect.get(o,key);},set(o,key,value){if(typeof key==='string'&&/^\d+$/.test(key)){set(Number(key),value);return true;}return Reflect.set(o,key,value);}});
    function field(object,key,at,kind) {
        Object.defineProperty(object,key,{get(){if(kind==='pointer')return pointer(at);return memory()['get'+kind](at,true);},
            set(value){memory()['set'+(kind==='pointer'?'BigUint64':kind)](at,kind==='pointer'?raw(value):kind.startsWith('Big')?BigInt(value):Number(value),true);}});
    }
    function coord(at){const result={address:address(at)};for(const key of['x','y']){if(layout['coord_'+key+'_size']!==2)throw new Error('Review PLINE coord');field(result,key,address(at)+layout['coord_'+key],'Int16');}return result;}
    function monster(at){at=address(at);if(!at)return 0;const result={address:at};for(const key of['mx','my']){if(layout['monster_'+key+'_size']!==2)throw new Error('Review PLINE monster coordinates');field(result,key,at+layout['monster_'+key],'Int16');}return result;}
    function gamelog(at){at=address(at);if(!at)return 0;const result={address:at};for(const key of['turn','flags','text','next']){if(layout['gamelog_'+key+'_size']!==8)throw new Error('Review PLINE gamelog');
        if(key==='next')Object.defineProperty(result,key,{get:()=>gamelog(pointer(at+layout.gamelog_next)),set:value=>memory().setBigUint64(at+layout.gamelog_next,raw(value),true)});
        else field(result,key,at+layout['gamelog_'+key],key==='text'?'pointer':'BigInt64');}return result;}
    const env=Object.assign(Object.create(services),layout,{plineState:state,monster,gamelog,
        text:value=>typeof value==='string'?services.literal(value):address(value),
        int:value=>Number(value)|0,unsigned:value=>Number(value)>>>0,
        samePtr:(a,b)=>raw(a)===raw(b),
        intLocal(){const at=services.stackAlloc(4),value={address:at};field(value,'value',at,'Int32');return value;},
        pointerArrayLocal(count){const at=services.stackAlloc(count*8);const values=indexed(i=>pointer(at+i*8),(i,v)=>memory().setBigUint64(at+i*8,raw(v),true));Object.defineProperty(values,'address',{value:at});return values;},
        vaArgString(args){if(args.length===1&&args[0]?.vaAddress!==undefined)return pointer(args[0].vaAddress);return env.text(args[0]);},
        vsnprintf(out,size,format,args){
            if(args.length===1&&args[0]?.vaAddress!==undefined)return services.vsnprintf(out,size,format,args[0].vaAddress);
            // All source-internal varargs have these fixed original formats.
            // Public C varargs always retain their actual opaque SDK packet.
            const fmt=typeof format==='string'?format:services.readString(format);
            if(!['%s','Please report these messages to %s.','Alternatively, contact local support: %s',"nhassert(%s) failed in file '%s' at line %d"].includes(fmt))throw new Error('Unreviewed internal PLINE varargs: '+fmt);
            return services.format3(out,size,format,args[0]??0,args[1]??0,Number(args[2]??0)|0);
        },
        SoundSpeak(){},
    });
    Object.defineProperty(env,'HEAPU8',{get:()=>services.heap()});
    fields.forEach(([path,kind],index)=>{const at=Number(services.global(index));let target=env;const parts=path.split('.'),key=parts.pop();for(const part of parts)target=target[part]??=(Object.create(null));
        if(kind==='bytes'){Object.defineProperty(target,key,{get:()=>at});return;}
        if(kind==='array'){if(layout['width_'+index]!==layout.DUMPLOG_MSG_COUNT*8)throw new Error('Review PLINE saved array');Object.defineProperty(target,key,{value:indexed(i=>pointer(at+i*8),(i,v)=>memory().setBigUint64(at+i*8,raw(v),true))});return;}
        if(kind==='coord'||kind==='monster'){Object.defineProperty(target,key,{get:()=>kind==='coord'?coord(at):monster(at)});return;}
        if(kind==='gamelog'){if(layout['width_'+index]!==8)throw new Error('Review PLINE log pointer');Object.defineProperty(target,key,{get:()=>gamelog(pointer(at)),set:v=>memory().setBigUint64(at,raw(v),true)});return;}
        const size=kind==='pointer'?8:Number(kind.match(/\d+/)[0])/8;
        if(layout['width_'+index]!==size)throw new Error('Review PLINE field '+path);field(target,key,at,kind);
    });
    for(const[i,key]of['Unaware','Deaf','Underwater','Blind'].entries())Object.defineProperty(env,key,{get:()=>services.heroFlag(i)});
    Object.defineProperty(env,'DEVTEAM_EMAIL',{get:()=>services.devteamEmail()});
    Object.defineProperty(env,'stderr',{get:()=>services.stderr()});
    return env;
}
export function createPlineBridge(layout) {
    const states=new WeakMap();
    return (services,name,...args)=>{
        let state=states.get(services.moduleKey);if(!state){state={in_pline:0,use_pline_handler:1};states.set(services.moduleKey,state);}
        const saved=services.stackSave();
        try{const env=createPlineEnvironment(services,layout,state);
            if(variadic.has(name))args[args.length-1]={vaAddress:Number(args.at(-1))};
            if(name==='vpline'||name==='vraw_printf')args[1]=[{vaAddress:Number(args[1])}];
            if(name==='pline_mon')args[0]=env.monster(args[0]);
            args=args.map(value=>typeof value==='bigint'&&!['gamelog_add','livelog_printf'].includes(name)?Number(value):value);
            return withCEnvironment(env,pline[name],...args);
        }finally{services.stackRestore(saved);}
    };
}
