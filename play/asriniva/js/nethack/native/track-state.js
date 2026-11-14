// Stable native coordinates shared by hero tracking, monster pursuit and saves.
import {nativeStateFor} from './state-bridge.js';
import {createNativeTrack} from './track.js';
import {createNativeAbiCaster} from './execution.js';
export function createNativeTrackBindings(environment,layouts,panic){
 const L=layouts.track,{memory,transport:t,services:S}=environment,owner=nativeStateFor(environment),arena=owner.nativeArena,views=owner.nativeRecords;
 const at=environment.allocateGlobal('track.state',L.size),state={utcntAddress:at+L.utcnt,utpntAddress:at+L.utpnt};
 for(const key of ['utcnt','utpnt']){const cell=arena.scalar('Int32',at+L[key]);Object.defineProperty(state,key,{enumerable:true,get:cell.get,set:v=>cell.set(t.int(v))});}
 const base=at+L.utrack,coords=Array.from({length:L.UTSZ},(_,i)=>{const row=views.record('struct nhcoord',base+i*L.coordSize);Object.defineProperty(row,'index',{value:i});return row;});
 // The original algorithm forms, but never dereferences, the one-past pointer.
 coords.push({address:base+L.UTSZ*L.coordSize,index:L.UTSZ});Object.defineProperty(coords,'address',{value:base});state.utrack=coords;
 const coordinate=createNativeAbiCaster(environment.ctypes,t,environment.address)('coordxy'),distmin=owner.functions.get('distmin')??S.distmin.nativeEntry??S.distmin;
 const context={trackState:state,CoordSize:L.coordSize,RIN_STEALTH:L.RIN_STEALTH,get HEAPU8(){return memory.HEAPU8;},
  u:views.record('struct you',environment.requireGlobal('u')),
  distmin,
  update_file:file=>arena.view.getInt32(environment.address(file)+layouts.sfbase.nhf_mode,true)&(L.COUNTING|L.WRITING),
  release_data:file=>arena.view.getInt32(environment.address(file)+layouts.sfbase.nhf_mode,true)&L.FREEING,trackPanic:panic};
 for(const key of ['uleft','uright'])Object.defineProperty(context,key,{get:()=>views.record('struct obj',arena.pointer(environment.requireGlobal(key)))});
 for(const direction of ['o','i'])for(const type of ['int','nhcoord'])context['Sf'+direction+'_'+type]=(...args)=>S['sf'+direction+'_'+type](...args);
 const policies=createNativeTrack(context,state),functions={};
 for(const[name,policy]of Object.entries(policies)){const fn=['gettrack','hastrack'].includes(name)?(x,y)=>policy(coordinate(x),coordinate(y)):policy;Object.assign(fn,{nativeState:owner,nativeDirect:true,nativePrepared:true});functions[name]=fn;owner.functions.set(name,fn);}
 return {state,context,policies,functions};
}
