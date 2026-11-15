// Explicit ownership of a compatibility provider which may be temporarily
// replaced during callback reentry. Native fast entries can check that identity
// without switching providers or reconstructing a binding environment.
const scopes=new WeakMap();
export function createServiceForwarder(state){
 const proxy=new Proxy(Object.create(null),{get:(_,key)=>Reflect.get(state.services,key,state.services)});
 scopes.set(proxy,state);return proxy;
}
export function serviceScopeFor(services){return scopes.get(services);}
