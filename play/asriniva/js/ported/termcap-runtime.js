// TERMCAP typed native-memory views; terminal policy remains in termcap.js.
import * as core from './termcap.js';
import { withCEnvironment } from './c-runtime.js';
const schemas={"flag":{"ctype":"struct flag","fields":[{"name":"null","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"silent","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false}]},"tc_gbl_data":{"ctype":"struct tc_gbl_data","fields":[{"name":"tc_CO","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"tc_LI","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"tc_AS","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_AE","d":{"p":""},"ctype":"char *","bit":false,"const":false}]},"instance_globals_t":{"ctype":"struct instance_globals_t","fields":[{"name":"tc_gbl_data","d":{"s":"tc_gbl_data"},"ctype":"struct tc_gbl_data","bit":false,"const":false}]},"tc_lcl_data":{"ctype":"struct tc_lcl_data","fields":[{"name":"tc_ND","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_ul_hack","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"tc_CM","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_US","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_UE","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_HI","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_HE","d":{"p":""},"ctype":"char *","bit":false,"const":false},{"name":"tc_CD","d":{"p":""},"ctype":"char *","bit":false,"const":false}]},"symsetentry":{"ctype":"struct symsetentry","fields":[{"name":"handling","d":{"t":"u32"},"ctype":"enum symset_handling_types","bit":false,"const":false}]},"instance_globals_s":{"ctype":"struct instance_globals_s","fields":[{"name":"symset","d":{"a":[2],"e":{"s":"symsetentry"}},"ctype":"struct symsetentry[2]","bit":false,"const":false}]},"instance_globals_c":{"ctype":"struct instance_globals_c","fields":[{"name":"currentgraphics","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"Cmd","d":{"s":"cmd"},"ctype":"struct cmd","bit":false,"const":false}]},"cmd":{"ctype":"struct cmd","fields":[{"name":"num_pad","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false}]},"DisplayDesc":{"ctype":"struct DisplayDesc","fields":[{"name":"cury","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"curx","d":{"t":"i16"},"ctype":"short","bit":false,"const":false}]},"nomux_cell":{"ctype":"nomux_cell","fields":[{"name":"ch","d":{"t":"i8"},"ctype":"char","bit":false,"const":false},{"name":"fg","d":{"t":"u8"},"ctype":"unsigned char","bit":false,"const":false},{"name":"attr","d":{"t":"u8"},"ctype":"unsigned char","bit":false,"const":false},{"name":"decgfx","d":{"t":"u8"},"ctype":"unsigned char","bit":false,"const":false}]},"instance_flags":{"ctype":"struct instance_flags","fields":[{"name":"wc2_darkgray","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"debug_fuzzer","d":{"t":"i8"},"ctype":"xint8","bit":false,"const":false},{"name":"colorcount","d":{"t":"u32"},"ctype":"uint32_t","bit":false,"const":false}]},"ti_map_entry":{"ctype":"TELEPORT_TERMCAP_TI_MAP_TYPE","fields":[{"name":"nh_color","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"nh_bright_color","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"ti_color","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]}};
const globals=[{"name":"tbuf","d":{"a":[512],"e":{"t":"i8"}}},{"name":"flags","d":{"s":"flag"}},{"name":"PC","d":{"t":"i8"}},{"name":"BC","d":{"p":""}},{"name":"HO","d":{"p":""}},{"name":"gt","d":{"s":"instance_globals_t"}},{"name":"tc_lcl_data","d":{"s":"tc_lcl_data"}},{"name":"CE","d":{"p":""}},{"name":"UP","d":{"p":""}},{"name":"XD","d":{"p":""}},{"name":"SO","d":{"p":""}},{"name":"SE","d":{"p":""}},{"name":"ZH","d":{"p":""}},{"name":"ZR","d":{"p":""}},{"name":"SG","d":{"t":"i32"}},{"name":"nullstr","d":{"a":[1],"e":{"t":"i8"}}},{"name":"TI","d":{"p":""}},{"name":"TE","d":{"p":""}},{"name":"VS","d":{"p":""}},{"name":"VE","d":{"p":""}},{"name":"KS","d":{"p":""}},{"name":"KE","d":{"p":""}},{"name":"MR","d":{"p":""}},{"name":"MB","d":{"p":""}},{"name":"MD","d":{"p":""}},{"name":"MH","d":{"p":""}},{"name":"ME","d":{"p":""}},{"name":"nh_VI","d":{"p":""}},{"name":"nh_VE","d":{"p":""}},{"name":"nh_Ic","d":{"p":""}},{"name":"dynamic_HIHE","d":{"t":"i8"}},{"name":"CL","d":{"p":""}},{"name":"tty_standout_on","d":{"a":[16],"e":{"t":"i8"}}},{"name":"tty_standout_off","d":{"a":[16],"e":{"t":"i8"}}},{"name":"gs","d":{"s":"instance_globals_s"}},{"name":"gc","d":{"s":"instance_globals_c"}},{"name":"HE_resets_AS","d":{"t":"i8"}},{"name":"decgraphics_mode_callback","d":{"f":true}},{"name":"utf8graphics_mode_callback","d":{"f":true}},{"name":"ttyDisplay","d":{"p":"DisplayDesc"}},{"name":"BASE_WINDOW","d":{"t":"i32"}},{"name":"stdout","d":{"p":""}},{"name":"nomux_seq","d":{"t":"i32"}},{"name":"nomux_anim_id","d":{"t":"i32"}},{"name":"nomux_buf","d":{"a":[24,80],"e":{"s":"nomux_cell"}}},{"name":"nomux_fg_cur","d":{"t":"u8"}},{"name":"nomux_attr_cur","d":{"t":"u8"}},{"name":"nomux_decgfx_cur","d":{"t":"u8"}},{"name":"iflags","d":{"s":"instance_flags"}},{"name":"nomux_out","d":{"a":[6144],"e":{"t":"i8"}}},{"name":"nomux_raw_active","d":{"t":"i32"}},{"name":"nomux_raw_row","d":{"t":"i32"}},{"name":"nomux_raw_col","d":{"t":"i32"}},{"name":"ospeed","d":{"t":"i16"}},{"name":"tmspc10","d":{"a":[15],"e":{"t":"i16"}}},{"name":"hilites","d":{"a":[16],"e":{"p":""}}},{"name":"nilstring","d":{"a":[1],"e":{"t":"i8"}}},{"name":"ti_map","d":{"a":[6],"e":{"s":"ti_map_entry"}}},{"name":"nulstr","d":{"a":[1],"e":{"t":"i8"}}}];
const moduleStates=new WeakMap();
const environments=new WeakMap();
export function createTermcapEnvironment(services,layout,namespace=core) {
    for(const [k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,charSigned:1,littleEndian:1}))
        if(Number(layout[k])!==v)throw Error('Review changed TERMCAP ABI: '+k);
    const pointerValue=v=>{const n=BigInt.asUintN(64,BigInt(v?.address??v??0));return n<=BigInt(Number.MAX_SAFE_INTEGER)?Number(n):n;};
    const addr=v=>Number(v?.address??v??0),raw=v=>BigInt.asUintN(64,BigInt(typeof v==='function'?functionPointer(v):typeof v==='string'?services.literal(v):typeof v==='boolean'?Number(v):typeof v==='number'?Math.trunc(v):v?.address??v??0));
    let dataView;
    const memory=()=>{const buffer=services.heap().buffer;if(dataView?.buffer!==buffer)dataView=new DataView(buffer);return dataView;},cache=new Map(),names=Object.keys(schemas);
    const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.f?8:d.s?Number(layout[d.s+'Size']):d.a.reduce((a,b)=>a*b,1)*width(d.e);
    const decode=(d,v)=>{if(d.p!==undefined)return d.p?view(d.p,v):pointerValue(v);if(d.s)return view(d.s,v);if(d.a)return array(d,addr(v));if(d.f)return v;
        const bits=+d.t.slice(1),r=d.t[0]==='i'?BigInt.asIntN(bits,BigInt(v)):BigInt.asUintN(bits,BigInt(v));return bits===64?r:Number(r);};
    const read=(d,at)=>{if(d.s||d.a)return decode(d,at);const dv=memory();if(d.p!==undefined||d.f)return decode(d,dv.getBigUint64(at,true));const bits=+d.t.slice(1);return bits===64?decode(d,dv.getBigUint64(at,true)):dv[(d.t[0]==='i'?'getInt':'getUint')+bits](at,true);};
    const write=(d,at,v)=>{if(d.s){services.heap().copyWithin(at,addr(v),addr(v)+width(d));return;}const dv=memory();if(d.p!==undefined||d.f||d.t?.slice(1)==='64')dv.setBigUint64(at,raw(v),true);else dv['setUint'+d.t.slice(1)](at,Number(v),true);};
    const arrayTypes=new WeakMap(),recordTypes=new Map();
    function array(d,at){let type=arrayTypes.get(d);if(!type){const child=d.a.length===1?d.e:{a:d.a.slice(1),e:d.e};type={key:'array:'+JSON.stringify(d),child,stride:width(child),bytes:width(d)};arrayTypes.set(d,type);}let addresses=cache.get(type.key);if(!addresses)cache.set(type.key,addresses=new Map());if(addresses.has(at))return addresses.get(at);const {child,stride}=type,target={address:at,byteLength:type.bytes,descriptor:d},children=child.s||child.a?new Map():null;
        const result=new Proxy(target,{get(o,k){if(typeof k==='string'&&/^\d+$/.test(k)){const i=Number(k);if(!children)return read(child,at+i*stride);if(!children.has(i))children.set(i,read(child,at+i*stride));return children.get(i);}return Reflect.get(o,k);},set(o,k,v){if(typeof k==='string'&&/^\d+$/.test(k)){write(child,at+Number(k)*stride,v);return true;}return Reflect.set(o,k,v);}});addresses.set(at,result);return result;}
    function view(name,value){const at=pointerValue(value);if(!at)return 0;const key=name+':'+at;if(cache.has(key))return cache.get(key);
        let type=recordTypes.get(name);
        if(!type){
            const prototype={},ki=names.indexOf(name);
            for(const [i,f]of schemas[name].fields.entries()){
                if(name==='nomux_cell'){
                    // The connected C module supplies the byte offset. Every
                    // access still reads/writes live memory, including growth.
                    const offset=addr(services.address(ki,at,i))-addr(at);
                    if(!Number.isInteger(offset)||offset<0||offset+width(f.d)>Number(layout.nomux_cellSize))throw Error('Review changed TERMCAP cell offset '+f.name);
                    Object.defineProperty(prototype,f.name,{get(){return read(f.d,addr(this.address)+offset);},set(v){write(f.d,addr(this.address)+offset,v);}});
                }else Object.defineProperty(prototype,f.name,{get(){return decode(f.d,services.read(ki,this.address,i));},set(v){services.write(ki,this.address,i,raw(v));}});
            }
            type={prototype,handler:{get(o,k){if(typeof k==='string'&&/^\d+$/.test(k))return view(name,o.address+Number(k)*Number(layout[name+'Size']));if(typeof k==='string'&&!Reflect.has(o,k))throw Error('Unknown TERMCAP record field '+name+'.'+k);return Reflect.get(o,k);},set(o,k,v){if(!Reflect.has(o,k))throw Error('Unknown TERMCAP record field '+name+'.'+String(k));return Reflect.set(o,k,v);}}};
            recordTypes.set(name,type);
        }
        const result=new Proxy(Object.assign(Object.create(type.prototype),{address:at,kind:name}),type.handler);cache.set(key,result);return result;}
    const env=Object.assign(Object.create(services),layout,{view,
        callLocal:(fn,...args)=>{const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
        addressOf:(o,f)=>addr(services.address(names.indexOf(o.kind),o.address,schemas[o.kind].fields.findIndex(x=>x.name===f))),
        int:v=>Number(BigInt.asIntN(32,raw(v))),char:v=>Number(BigInt.asIntN(8,raw(v))),uchar:v=>Number(BigInt.asUintN(8,raw(v))),boolean:v=>Number(BigInt.asIntN(8,raw(v))),short:v=>Number(BigInt.asIntN(16,raw(v))),long:v=>BigInt.asIntN(64,raw(v)),ulong:v=>raw(v),
        charPointer:v=>typeof v==='function'?functionPointer(v):typeof v==='string'?services.literal(v):Array.isArray(v)?services.literal(String.fromCharCode(...v.slice(0,v.indexOf(0)<0?v.length:v.indexOf(0)))):addr(v),
        loadChar:v=>memory().getInt8(addr(v)),storeChar:(v,b)=>memory().setInt8(addr(v),Number(b)),intReference:(get,set)=>({get,set}),
    });
    for(const [name,value]of Object.entries(layout))if(name.startsWith('constwidth_')){const k=name.slice(11);env[k]=Number(value)===8?(Number(layout['constsigned_'+k])?BigInt.asIntN(64,BigInt(layout[k])):BigInt.asUintN(64,BigInt(layout[k]))):Number(layout['constsigned_'+k])?Number(BigInt.asIntN(32,BigInt(layout[k]))):Number(BigInt.asUintN(32,BigInt(layout[k])));}
    for(const [name,sch]of Object.entries(schemas))for(const f of sch.fields)if(!f.bit&&width(f.d)!==Number(layout['width_'+name+'_'+f.name]))throw Error('Review changed TERMCAP field width: '+name+'.'+f.name);
    globals.forEach((g,i)=>Object.defineProperty(env,g.name,{get:()=>read(g.d,addr(services.global(i))),set:v=>write(g.d,addr(services.global(i)),v)}));
    const expectedRecordSizes={"flag": 208, "tc_gbl_data": 24, "instance_globals_t": 456, "tc_lcl_data": 64, "symsetentry": 40, "instance_globals_s": 1408, "instance_globals_c": 584, "cmd": 80, "DisplayDesc": 60, "nomux_cell": 4, "instance_flags": 424, "ti_map_entry": 12};
    for(const[name,size]of Object.entries(expectedRecordSizes))if(Number(layout[name+'Size'])!==size)throw Error('TERMCAP native record size '+name);
    const functions=["term_startup", "term_shutdown", "tty_number_pad", "tty_decgraphics_termcap_fixup", "term_start_screen", "term_end_screen", "nocmov", "cmov", "xputc", "nomux_markers_enabled", "nomux_emit_marker", "nomux_capture_write_screen", "nomux_capture_write_input_boundary", "nomux_clear_screen", "nomux_clear_to_eol", "nomux_putch", "nomux_set_attr", "nomux_end_attr", "nomux_set_fg", "nomux_end_fg", "nomux_sgr_fg", "nomux_capture_screen", "nomux_enter_raw_mode", "nomux_raw_putch", "nomux_raw_emit", "nomux_raw_emit_eol", "nomux_get_cursor", "xputs", "cl_end", "term_clear_screen", "home", "standoutbeg", "standoutend", "backsp", "tty_nhbell", "graph_on", "graph_off", "tty_delay_output", "cl_eos", "init_hilite", "kill_hilite", "s_atr2str", "e_atr2str", "term_attr_fixup", "term_start_attr", "term_end_attr", "term_start_raw_bold", "term_end_raw_bold", "term_end_color", "term_start_color", "term_start_bgcolor", "term_curs_set", "emit24bit", "emit256", "term_start_extracolor", "term_end_extracolor"];
    for(const name of functions)env[name]=(...args)=>env.callLocal(namespace[name],...args);
    const foreignCallbacks=['tty_utf8graphics_fixup'];
    const functionPointer=fn=>{if(typeof fn!=='function')return fn;const i=functions.findIndex(n=>namespace[n]===fn||env[n]===fn);if(i>=0)return services.functionPointer(i);const j=foreignCallbacks.findIndex(n=>env[n]===fn);if(j>=0)return services.foreignFunctionPointer(j);throw Error('Unrecognized TERMCAP callback identity');};
    env.functionPointer=functionPointer;
    const invoke=(fn,args)=>{const refs=args.filter(a=>a&&Object.prototype.hasOwnProperty.call(a,'localRef')&&a.localRef);try{return fn(...args.map(a=>typeof a==='function'?functionPointer(a):a));}finally{for(const ref of refs)ref.set(read(ref.descriptor,ref.address));}};
    const aliases={boolean:'signed char',uint32:'unsigned int',uint16:'unsigned short',uint8:'unsigned char'};
    const descriptor=type=>{type=type.trim().replace(/^(?:const )?(?:struct |union )/,'');type=aliases[type]??type;if(type.endsWith('*')){const n=type.slice(0,-1).trim();return{p:schemas[n]?n:''};}if(schemas[type])return{s:type};const scalars={char:'i8','signed char':'i8','unsigned char':'u8',uchar:'u8',short:'i16','unsigned short':'u16',int:'i32','unsigned int':'u32',long:'i64','unsigned long':'u64'};if(scalars[type])return{t:scalars[type]};throw Error('Unreviewed TERMCAP local type '+type);};
    Object.defineProperty(env,'HEAP8',{get:()=>new Int8Array(services.heap().buffer)});
    Object.defineProperty(env,'HEAPU8',{get:()=>services.heap()});
    env.sizes=Object.assign(Object.fromEntries(names.map(n=>[n,Number(layout[n+'Size'])])),{ptr:8,char:1,short:2,int:4,long:8,boolean:1});
    env.int=v=>Number(BigInt.asIntN(32,raw(v)));env.uint=v=>Number(BigInt.asUintN(32,raw(v)));env.short=v=>Number(BigInt.asIntN(16,raw(v)));env.ushort=v=>Number(BigInt.asUintN(16,raw(v)));env.char=v=>Number(BigInt.asIntN(8,raw(v)));env.uchar=v=>Number(BigInt.asUintN(8,raw(v)));env.long=v=>BigInt.asIntN(64,raw(v));env.ulong=raw;
    env.pointerEqual=(a,b)=>Number(raw(a)===raw(b));
    env.pointerDifference=(a,b,kind)=>(raw(a)-raw(b))/BigInt(env.sizes[kind]??(()=>{throw Error('Unreviewed TERMCAP pointer stride '+kind);})());
    env.scalarPointer=(type,at)=>{if(!pointerValue(at))return 0;const d=descriptor(type);return Object.defineProperty({address:pointerValue(at),descriptor:d},'value',{get:()=>read(d,addr(at)),set:v=>write(d,addr(at),v)});};
    env.localPointer=(type,get,set)=>{const d=descriptor(type),at=addr(services.stackAlloc(width(d)));write(d,at,get());return{address:at,descriptor:d,localRef:true,set,get value(){return read(d,at);},set value(v){write(d,at,v);set(read(d,at));}};};
    env.localArray=(type,dimensions)=>{const d={a:dimensions.map(Number),e:descriptor(type)},at=addr(services.stackAlloc(width(d)));return array(d,at);};
    env.SIZE=v=>typeof v==='string'?v.length+1:v.descriptor?.a?.[0]??(()=>{throw Error('Unreviewed TERMCAP SIZE');})();
    env.nhStr=env.charPointer;
    env.digit=v=>{v=typeof v==='string'?v.charCodeAt(0):Number(v);return Number(v>=48&&v<=57);};
    env.SYMHANDLING=n=>Number(env.gs.symset[env.gc.currentgraphics].handling===n);
    const bufferKeys=["tty_decgraphics_termcap_fixup.ctrlN", "tty_decgraphics_termcap_fixup.ctrlO", "tty_decgraphics_termcap_fixup.appMode", "tty_decgraphics_termcap_fixup.numMode", "emit24bit.tcolorbuf", "emit256.tcolorbuf"];
    env.staticBuffer=key=>{const i=bufferKeys.indexOf(key);if(i<0)throw Error('Unreviewed TERMCAP static buffer '+key);return services.staticBuffer(i);};
    let state=moduleStates.get(services.moduleKey);if(!state){state={initialized:false};moduleStates.set(services.moduleKey,state);}env.state=state;
    env.getenv=(...args)=>invoke(services.getenv,args);
    env.alloc=(...args)=>invoke(services.alloc,args);
    env.strncmp=(...args)=>invoke(services.strncmp,args);
    env.tgetent=(...args)=>invoke(services.tgetent,args);
    env.strncpy=(...args)=>invoke(services.strncpy,args);
    env.tgetstr=(...args)=>invoke(services.tgetstr,args);
    env.tgetnum=(...args)=>invoke(services.tgetnum,args);
    env.setclipped=(...args)=>invoke(services.setclipped,args);
    env.tgetflag=(...args)=>invoke(services.tgetflag,args);
    env.tty_raw_print=(...args)=>invoke(services.tty_raw_print,args);
    env.tty_wait_synch=(...args)=>invoke(services.tty_wait_synch,args);
    env.digit=(...args)=>invoke(services.digit,args);
    env.dupstr=(...args)=>invoke(services.dupstr,args);
    env.free=(...args)=>invoke(services.free,args);
    env.strlen=(...args)=>invoke(services.strlen,args);
    env.strcpy=(...args)=>invoke(services.strcpy,args);
    env.strstr=(...args)=>invoke(services.strstr,args);
    env.tty_utf8graphics_fixup=(...args)=>invoke(services.tty_utf8graphics_fixup,args);
    env.tty_curs=(...args)=>invoke(services.tty_curs,args);
    env.tgoto=(...args)=>invoke(services.tgoto,args);
    env.putchar=(...args)=>invoke(services.putchar,args);
    env.fflush=(...args)=>invoke(services.fflush,args);
    env.teleport_capture=(...args)=>invoke(services.teleport_capture,args);
    env.strcmp=(...args)=>invoke(services.strcmp,args);
    env.fwrite=(...args)=>invoke(services.fwrite,args);
    env.tputs=(...args)=>invoke(services.tputs,args);
    env.erase_tty_screen=(...args)=>invoke(services.erase_tty_screen,args);
    env.strcat=(...args)=>invoke(services.strcat,args);
    Object.defineProperty(env,"AS",{get:()=>env.gt.tc_gbl_data.tc_AS,set:value=>{env.gt.tc_gbl_data.tc_AS=value;}});
    Object.defineProperty(env,"AE",{get:()=>env.gt.tc_gbl_data.tc_AE,set:value=>{env.gt.tc_gbl_data.tc_AE=value;}});
    Object.defineProperty(env,"CO",{get:()=>env.gt.tc_gbl_data.tc_CO,set:value=>{env.gt.tc_gbl_data.tc_CO=value;}});
    Object.defineProperty(env,"LI",{get:()=>env.gt.tc_gbl_data.tc_LI,set:value=>{env.gt.tc_gbl_data.tc_LI=value;}});
    Object.defineProperty(env,"nh_CM",{get:()=>env.tc_lcl_data.tc_CM,set:value=>{env.tc_lcl_data.tc_CM=value;}});
    Object.defineProperty(env,"nh_ND",{get:()=>env.tc_lcl_data.tc_ND,set:value=>{env.tc_lcl_data.tc_ND=value;}});
    Object.defineProperty(env,"nh_CD",{get:()=>env.tc_lcl_data.tc_CD,set:value=>{env.tc_lcl_data.tc_CD=value;}});
    Object.defineProperty(env,"nh_HI",{get:()=>env.tc_lcl_data.tc_HI,set:value=>{env.tc_lcl_data.tc_HI=value;}});
    Object.defineProperty(env,"nh_HE",{get:()=>env.tc_lcl_data.tc_HE,set:value=>{env.tc_lcl_data.tc_HE=value;}});
    Object.defineProperty(env,"nh_US",{get:()=>env.tc_lcl_data.tc_US,set:value=>{env.tc_lcl_data.tc_US=value;}});
    Object.defineProperty(env,"nh_UE",{get:()=>env.tc_lcl_data.tc_UE,set:value=>{env.tc_lcl_data.tc_UE=value;}});
    Object.defineProperty(env,"ul_hack",{get:()=>env.tc_lcl_data.tc_ul_hack,set:value=>{env.tc_lcl_data.tc_ul_hack=value;}});
    env.NULL=0;
    const cString=v=>{if(typeof v==='string')return v;const bytes=services.heap();let at=addr(v),out='';while(bytes[at])out+=String.fromCharCode(bytes[at++]);return out;};
    const formatShape=fmt=>{let shape='';for(const m of cString(fmt).matchAll(/%(?:[-+ #0]*)(\*|\d+)?(?:\.(\*|\d+))?(hh|ll|[hljztL])?([%csdiouxXpfgeEaAn])/g)){if(m[4]==='%')continue;if(m[1]==='*')shape+='i';if(m[2]==='*')shape+='i';shape+=m[4]==='s'||m[4]==='p'?'p':/[fgeEaA]/.test(m[4])?'d':m[3]==='l'||m[3]==='ll'||m[3]==='z'?'j':'i';}return shape;};
    env.error=(...args)=>{const key="error_p"+formatShape(args[0]);if(!services[key])throw Error("Unconfigured TERMCAP varargs "+key);return invoke(services[key],args);};
    env.fprintf=(...args)=>{const key="fprintf_pp"+formatShape(args[1]);if(!services[key])throw Error("Unconfigured TERMCAP varargs "+key);return invoke(services[key],args);};
    env.sprintf=(...args)=>{const key="sprintf_pp"+formatShape(args[1]);if(!services[key])throw Error("Unconfigured TERMCAP varargs "+key);return invoke(services[key],args);};
    env.tparm=(...args)=>{const key="tparm_pi";if(!services[key])throw Error("Unconfigured TERMCAP varargs "+key);return invoke(services[key],args);};
    env.nh_snprintf=(...args)=>{const key="nh_snprintf_pipjp"+formatShape(args[4]);if(!services[key])throw Error("Unconfigured TERMCAP varargs "+key);return invoke(services[key],args);};
    env.Sprintf=env.sprintf;env.Strcpy=env.strcpy;env.Strcat=env.strcat;
    return env;
}
export function callTermcap(services,layout,name,...args){
    if(typeof core[name]!=='function')throw Error('Unknown TERMCAP source entry '+name);
    let layouts=environments.get(services.moduleKey);if(!layouts){layouts=new WeakMap();environments.set(services.moduleKey,layouts);}
    let entry=layouts.get(layout);const fresh=!entry;
    if(fresh){entry={services,env:null};const scoped=new Proxy({}, {get:(_,key)=>Reflect.get(entry.services,key),has:(_,key)=>Reflect.has(entry.services,key)});entry.env=createTermcapEnvironment(scoped,layout,core);}
    const previous=entry.services;entry.services=services;const saved=services.stackSave();
    try{
        const env=entry.env;if(!env.state.initialized)core.initializeTermcapData(env);
        if(fresh)layouts.set(layout,entry);
        if(name==='term_startup')args=args.map(p=>env.scalarPointer('int',p));
        if(name==='nomux_get_cursor')args=args.map(p=>env.scalarPointer('int',p));
        const result=withCEnvironment(env,()=>core[name](...args));return typeof result==='string'?services.literal(result):result?.address??result;
    }finally{try{services.stackRestore(saved);}finally{entry.services=previous;}}
}
