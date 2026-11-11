// Standalone transport for the unchanged SFBASE/SFSTRUCT implementations.
import * as sfbase from '../ported/sfbase.js';
import {createSfbaseEnvironment} from '../ported/sfbase-runtime.js';
import * as sfstruct from '../ported/sfstruct.js';
import {initializeSfstruct} from '../ported/sfstruct-runtime.js';
import {address} from './memory-services.js';
import {moves_to_relative_time,relative_time_to_moves,rest_adjust_levelflags} from '../ported/restore.js';
export function enableSerialization(environment,layouts) {
    const {services,memory,functions}=environment,L=layouts.sfbase,S=layouts.sfstruct;
    if(typeof services.fwrite!=='function'||!services.program_state)throw new Error('Enable stdio and DECL before serialization');
    const movesAt=environment.ctypes.locate('struct instance_globals_saved_m',environment.requireGlobal('svm'),'moves').at,time=Object.create(services);
    Object.defineProperty(time,'svm',{value:Object.defineProperty({},'moves',{get:()=>environment.ctypes.load('long',movesAt)})});
    const levelAt=environment.ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at,flags={address:environment.ctypes.locate('dlevel_t',levelAt,'flags').at};
    Object.defineProperty(time,'svl',{value:{level:{flags}}});
    time.longPointer=p=>{const at=address(p);return Object.defineProperty({address:at},'value',{get:()=>environment.ctypes.load('long',at),set:value=>environment.ctypes.store('long',at,value)});};
    time.addressOf=(owner,key)=>{if(owner!==flags||key!=='stasis_until')throw new Error('Unknown RESTORE timestamp field');return environment.ctypes.locate('struct levelflags',flags.address,key).at;};
    environment.register('restore-timestamps',{moves_to_relative_time,relative_time_to_moves,rest_adjust_levelflags},time,{prepareArgs:(name,args)=>{if(name!=='rest_adjust_levelflags')args[0]=time.longPointer(args[0]);return args;}});
    const names=['sfoprocs','sfiprocs','sfoflprocs','sfiflprocs','zerosfoprocs','zerosfiprocs','zerosfoflprocs','zerosfiflprocs','historical_sfo_procs','historical_sfi_procs'];
    const tables=names.map((name,i)=>environment.allocateGlobal(name,(i<4?L.NUM_SAVEFORMATS:1)*(i===2||i===3||i===6||i===7?L.fieldlevelSize:L.structlevelSize)));
    const bufferNames=Object.keys(L).filter(k=>k.startsWith('buffer_')).map(k=>k.slice(7));
    // The original adapter's declared order is part of its buffer ABI.
    const ordered=['sfvalue_char','sfvalue_boolean','sfvalue_schar','sfvalue_aligntyp','sfvalue_any','sfvalue_genericptr','sfvalue_int16','sfvalue_int32','sfvalue_int64','sfvalue_uchar','sfvalue_uint16','sfvalue_uint32','sfvalue_uint64','sfvalue_size_t','sfvalue_time_t','sfvalue_short','sfvalue_ushort','sfvalue_int','sfvalue_unsigned','sfvalue_long','sfvalue_ulong','sfvalue_xint8','sfvalue_xint16','sfvalue_bitfield','bitfield_dump','complex_dump'];
    if(ordered.some(key=>!bufferNames.includes(key)))throw new Error('Missing measured serializer buffer');
    const buffers=ordered.map(key=>environment.allocateGlobal('sfbase.'+key,L['buffer_'+key]));
    const local=Object.create(services);
    Object.assign(local,{
        global:i=>{if(!tables[i])throw new Error('Unknown serializer table');return tables[i];},
        buffer:i=>{if(!buffers[i])throw new Error('Unknown serializer buffer');return buffers[i];},
        pri:i=>['lld','lld','llu','llu'][i],
        call:(fn,nhfp,data,tag,count)=>functions.callback(fn)(nhfp,data,tag,...(count===undefined?[]:[count])),
        Snprintf:(out,n,format,...args)=>{args.pop();return environment.libc.snprintf(address(out),Number(n),format,...args);},
    });
    const baseEnv=createSfbaseEnvironment(local,L);
    environment.register('sfbase',sfbase,baseEnv,{prepareArgs:(fn,args)=>{
        if(/^(sfo_|sfi_|sf_log$)/.test(fn))args[0]=baseEnv.nhfile(args[0]);
        if(/^(sfo_|sfi_)version_info$/.test(fn))args[1]=baseEnv.version(args[1]);
        return args;
    }});
    const restore=environment.allocateGlobal('restoreinfo',S.restoreSize),structServices=Object.create(services);
    Object.assign(structServices,{
        restore:()=>restore,program:()=>environment.requireGlobal('program_state'),
        setExt:(input,p)=>memory.view.setBigUint64(tables[8+input]+S.procs_ext,BigInt(p),true),
        setProc:(input,index,p)=>{
            const keys=Object.keys((input?sfstruct.historical_sfi_procs:sfstruct.historical_sfo_procs).fn),field=keys[index].slice(3);
            const offset=S['proc_'+(field==='genericptr'?'genericptr_t':field)];
            if(offset===undefined)throw new Error('Missing measured serialization callback field');
            memory.view.setBigUint64(tables[8+input]+offset,BigInt(p),true);
        },
        callback:(input,index)=>{
            const table=input?sfstruct.historical_sfi_procs:sfstruct.historical_sfo_procs,fn=Object.values(table.fn)[index];
            const name=Object.entries(sfstruct).find(([,value])=>value===fn)?.[0];
            if(!name)throw new Error('Missing translated historical serializer');
            return functions.functionPointer((...args)=>environment.call('sfstruct',name,...args),fn.length===4?'vpppi':'vppp');
        },
        nh_terminate:services.exit,nhclose:services.close,
        delete_savefile:(...args)=>environment.resolve('delete_savefile')(...args),
        display_nhwindow:(...args)=>environment.resolve('display_nhwindow')(...args),
        pline:(...args)=>environment.resolve('pline')(...args),
        impossible:(...args)=>environment.resolve('impossible')(...args),
        error:(...args)=>environment.resolve('error')(...args),
    });
    const {env:structEnv}=initializeSfstruct(structServices,S);
    environment.register('sfstruct',sfstruct,structEnv,{prepareArgs:(fn,args)=>{
        if(fn.startsWith('historical_'))args[0]=structEnv.nhfile(args[0]);return args;
    }});
    environment.call('sfbase','sf_init');
    return{base:baseEnv,struct:structEnv,tables,buffers,restore};
}
