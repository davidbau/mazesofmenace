// Existing terminal capability and recorder-shadow code on standalone storage.
// The source port owns terminal policy; this file supplies memory and transport.
import metadata from './terminal-metadata.json' with {type:'json'};
import * as termcap from '../ported/termcap.js';
import {callTermcap} from '../ported/termcap-runtime.js';
import {encodeRecorderScreen} from '../wasm-replay-support.js';
import {address} from './memory-services.js';
export function enableTerminal(environment,layout,{onCapture}={}) {
    const {services,memory,functions,ctypes,transport}=environment;
    if(!services.flags||typeof services.tgetent!=='function'||typeof services.fflush!=='function')throw new Error('Enable DECL, dependencies and stdio before terminal');
    const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.f?8:d.s?Number(layout[d.s+'Size']):d.a.reduce((a,b)=>a*b,1)*width(d.e);
    const globals=metadata.globals.map(g=>{
        try{return environment.requireGlobal(g.name);}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;}
        const at=environment.allocateGlobal(g.name,width(g.d));
        if(g.name==='stdout')memory.view.setBigUint64(at,BigInt(services.stdout),true);
        return at;
    });
    const buffers=metadata.bufferSizes.map((n,i)=>environment.allocateGlobal('termcap.'+metadata.bufferKeys[i],n));
    const schemas=Object.entries(metadata.schemas),frames=[],callbackIds=new Map(),local=Object.create(services);
    const cptr=v=>typeof v==='string'?services.literal(v):address(v);
    const scalar=d=>d.t?({i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'})[d.t]:d.p!==undefined||d.f?'void *':d.s??'void *';
    function field(kind,p,index) {
        const record=schemas[kind]?.[1],f=record?.fields[index];if(!f)throw new Error('Unknown terminal C field');
        return{type:metadata.typeAliases[record.ctype]??record.ctype,f,p};
    }
    Object.assign(local,{
        global:i=>{if(!globals[i])throw new Error('Unknown terminal global');return globals[i];},
        read:(kind,p,i)=>{const e=field(kind,p,i);return ctypes.getField(e.type,p,e.f.name,scalar(e.f.d));},
        write:(kind,p,i,v)=>{const e=field(kind,p,i);return ctypes.setField(e.type,p,e.f.name,scalar(e.f.d),v);},
        address:(kind,p,i)=>{const e=field(kind,p,i);return ctypes.locate(e.type,p,e.f.name).at;},
        staticBuffer:i=>{if(!buffers[i])throw new Error('Unknown terminal static');return buffers[i];},
        functionPointer:i=>{
            const name=metadata.functions[i],signature=metadata.signatures[name];if(!name||!signature)throw new Error('Missing terminal callback ABI');
            if(!callbackIds.has(name))callbackIds.set(name,environment.functionPointer(name,signature,(...args)=>environment.call('termcap',name,...args)));
            return callbackIds.get(name);
        },
        foreignFunctionPointer:i=>{
            const name=metadata.foreignCallbacks[i];if(name!=='tty_utf8graphics_fixup')throw new Error('Unknown terminal foreign callback');
            if(!callbackIds.has(name))callbackIds.set(name,environment.functionPointer(name,'v'));
            return callbackIds.get(name);
        },
        getenv:name=>environment.services.nh_getenv(typeof name==='string'?name:memory.readString(cptr(name))),
        alloc:n=>environment.alloc('alloc',Number(n)),
        dupstr:p=>environment.libc.strdup(cptr(p)),
        teleport_capture:(screen,x,y,animation)=>{
            const frame={screen:encodeRecorderScreen(memory.readString(cptr(screen))),cursor:[Number(x),Number(y),1],animation:Boolean(animation)};
            frames.push(frame);if(onCapture)onCapture(frame);
        },
        error_p:(...args)=>environment.resolve('error')(...args),error_pp:(...args)=>environment.resolve('error')(...args),
        fprintf_pppiiiij:(...args)=>services.fprintf(...args),
        sprintf_pp:(out,fmt)=>environment.libc.sprintf(cptr(out),memory.readString(cptr(fmt))),
        sprintf_ppi:(out,fmt,v)=>environment.libc.sprintf(cptr(out),memory.readString(cptr(fmt)),v),
        tparm_pi:(format,value)=>transport.scoped(()=>{const at=transport.stackAlloc(72);memory.memset(at,0,72);memory.view.setInt32(at,Number(value),true);return services.tparm(cptr(format),at);}),
        nh_snprintf_pipjpjjj:(...args)=>environment.resolve('nh_snprintf')(...args),
        nh_snprintf_pipjpi:(...args)=>environment.resolve('nh_snprintf')(...args),
    });
    for(const name of ['setclipped','tty_raw_print','tty_wait_synch','tty_utf8graphics_fixup','tty_curs','erase_tty_screen'])local[name]=(...args)=>environment.resolve(name)(...args);
    for(const name of ['strlen','strcpy','strcat','strcmp','strstr'])local[name]=(...args)=>environment.libc[name](...args.map(cptr));
    for(const name of ['strncmp','strncpy'])local[name]=(a,b,n)=>environment.libc[name](cptr(a),cptr(b),Number(n));
    local.tgetent=(buffer,name)=>services.tgetent(cptr(buffer),cptr(name));
    for(const name of ['tgetflag','tgetnum'])local[name]=arg=>services[name](cptr(arg));
    local.tgetstr=(name,area)=>services.tgetstr(cptr(name),address(area));
    local.tgoto=(format,col,row)=>services.tgoto(cptr(format),col,row);
    local.tputs=(text,lines,fn)=>services.tputs(cptr(text),lines,fn);
    const wrappers=Object.fromEntries(metadata.functions.map(name=>[name,(...args)=>callTermcap(local,layout,name,...args)]));
    environment.register('termcap',wrappers,local);
    return{frames,globals,services:local,global:name=>{const i=metadata.globals.findIndex(g=>g.name===name);if(i<0)throw new Error('Unknown terminal global '+name);return globals[i];}};
}
