import*as core from'./random.mjs';
import data from'./random-data.json'with{type:'json'};
import{withCEnvironment}from'./random-scope.mjs';
const states=new WeakMap();
export function createUtility(m){
 const size=Number(m._utility_long_size());if(size!==8)throw Error('configured signed long64 required');
 const view=()=>new DataView(m.HEAPU8.buffer);
 const ptr=p=>Number(p?.address??p);
 const longs=p=>{const address=ptr(p);return new Proxy({address,valueOf(){return address;}},{get(t,k){if(typeof k==='string'&&/^-?\d+$/.test(k))return view().getBigInt64(address+Number(k)*size,true);return t[k];},set(t,k,v){if(typeof k==='string'&&/^-?\d+$/.test(k)){view().setBigInt64(address+Number(k)*size,BigInt.asIntN(64,BigInt(v)),true);return true;}throw Error('unknown long field '+String(k));}});};
 let state=states.get(m);if(!state){const base=longs(m._utility_storage());data.randtbl.forEach((x,i)=>base[i]=BigInt(x));state={rand_type:3,rand_deg:31,rand_sep:3,fptr:longs(base.address+4*size),rptr:longs(base.address+size),state:longs(base.address+size),end_ptr:longs(base.address+32*size)};states.set(m,state);}
 const literals=new Map(),literal=s=>{if(typeof s!=='string')return BigInt(ptr(s));if(!literals.has(s)){const b=Buffer.from(s+'\0');const p=m._malloc(BigInt(b.length));m.HEAPU8.set(b,Number(p));literals.set(s,BigInt(p));}return literals.get(s);};
 const C={...data.constants,degrees:data.degrees,seps:data.seps,longs,at:(p,i)=>longs(ptr(p)+Number(i)*size),diff:(a,b)=>(ptr(a)-ptr(b))/size,uint:n=>Number(BigInt.asUintN(32,BigInt(n))),int:n=>Number(BigInt.asIntN(32,BigInt(n))),long:n=>BigInt.asIntN(64,BigInt(n)),impossible:(fmt,n)=>m._utility_impossible(literal(fmt),Number(n)|0)};
 for(const name of Object.keys(state))Object.defineProperty(C,name,{get:()=>state[name],set:v=>{state[name]=v;}});
 return{C,invoke(name,...args){const result=withCEnvironment(C,()=>core[name](...args));return result?.address===undefined?result:BigInt(result.address);},scalar(i){return[state.rand_type,state.rand_deg,state.rand_sep][i];},pointer(i){return BigInt(ptr(state[['state','fptr','rptr','end_ptr'][i]]));}};
}
