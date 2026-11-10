// Native layouts and dependency ABI; original serialization decisions live in sfstruct.js.
import * as sfstruct from './sfstruct.js';
import {withCEnvironment} from './c-runtime.js';
const states=new WeakMap();
export function createSfstructState(){return {bw_sticky:Int32Array.from(sfstruct.bw_sticky_initial),bw_buffered:Int32Array.from(sfstruct.bw_buffered_initial),bw_FILE:[...sfstruct.bw_FILE_initial]};}
export function createSfstructEnvironment(services,layout,state){
    for(const[key,size]of Object.entries({pointerSize:8,intSize:4,longSize:8,unsignedSize:4,booleanSize:1}))if(layout[key]!==size)throw new Error('Review changed sfstruct ABI: '+key);
    const address=value=>Number(value?.address??value??0),view=()=>new DataView(services.heap().buffer);
    const nhfile=value=>{const at=address(value);if(!at)return 0;const obj={address:at};for(const[key,kind]of [['fd','Int32'],['eof','Int8']])Object.defineProperty(obj,key,{get(){return view()['get'+kind](at+layout['nhf_'+key],true);},set(value){view()['set'+kind](at+layout['nhf_'+key],Number(value),true);}});return obj;};
    const restoreinfo={};Object.defineProperty(restoreinfo,'mread_flags',{get(){return view().getInt32(address(services.restore())+layout.restore_flags,true);},set(value){view().setInt32(address(services.restore())+layout.restore_flags,Number(value),true);}});
    const program_state={};for(const [name,key]of [['done_hup','program_hup'],['reading_bonesfile','program_bones'],['restoring','program_restoring']])Object.defineProperty(program_state,name,{get(){return view().getInt32(address(services.program())+layout[key],true);},set(value){view().setInt32(address(services.program())+layout[key],Number(value),true);}});
    const env=Object.assign(Object.create(services),layout,state,{nhfile,restoreinfo,program_state,int:value=>Number(BigInt.asIntN(32,BigInt(value))),uint:value=>Number(BigInt.asUintN(32,BigInt(value)))});
    return env;
}
export function initializeSfstruct(services,layout){
    const key=services.moduleKey;if(!key)throw new Error('SFSTRUCT requires actual Module identity');
    let entry=states.get(key);if(entry)return entry;
    const state=createSfstructState(),env=createSfstructEnvironment(services,layout,state);entry={state,env};states.set(key,entry);
    const heap=()=>new DataView(services.heap().buffer),restore=Number(services.restore());
    heap().setBigUint64(restore+layout.restore_name,BigInt(services.literal(sfstruct.restoreinfo_initial.name)),true);
    heap().setInt32(restore+layout.restore_flags,sfstruct.restoreinfo_initial.mread_flags,true);
    for(const [input,table]of [[0,sfstruct.historical_sfo_procs],[1,sfstruct.historical_sfi_procs]]){
        services.setExt(input,services.literal(table.ext));
        for(const [index,[field,fn]]of Object.entries(table.fn).entries()){
            if(fn!==sfstruct[(input?'historical_sfi_':'historical_sfo_')+(field==='sf_genericptr'?'genericptr_t':field.slice(3))])throw new Error('Review changed sfstruct table identity');
            services.setProc(input,index,services.callback(input,index));
        }
    }
    return entry;
}
export function callSfstruct(services,layout,name,...args){
    const entry=initializeSfstruct(services,layout);if(name==='initialize')return;if(name==='state')return entry.state;
    const fn=sfstruct[name];if(typeof fn!=='function')throw new Error('Unknown original sfstruct function: '+name);
    if(name.startsWith('historical_'))args[0]=entry.env.nhfile(args[0]);
    return withCEnvironment(entry.env,fn,...args);
}
