// MKOBJ call transport. Original gameplay functions remain in mkobj.js.
import * as mkobj from './mkobj.js';
import {withCEnvironment} from '../c-runtime/context.js';
import {createMkobjEnvironment} from '../nethack/bindings/mkobj.js';
import {wideArguments,pointerReturns} from './mkobj-dispatch-data.js';

const environments=new WeakMap();

function entryFor(services,layout) {
    const key=services.moduleKey;
    if(!key || !['object','function'].includes(typeof key))
        throw new Error('MKOBJ requires actual Module identity');
    let entry=environments.get(key);
    if(entry) {
        if(entry.layout!==layout)throw new Error('Review changed MKOBJ layout identity');
        return entry;
    }
    entry={current:services,layout,environment:null};
    const forwarding=new Proxy(Object.create(null),{
        get(_target,name){return Reflect.get(entry.current,name,entry.current);},
        has(_target,name){return name in entry.current;},
    });
    entry.environment=createMkobjEnvironment(forwarding,layout,mkobj);
    // A failed constructor must not publish partially initialized state.
    environments.set(key,entry);
    return entry;
}

// Typed observers share the exact native views used by source calls.
export function getMkobjEnvironment(services,layout) {
    return entryFor(services,layout).environment;
}

export function callMkobj(services,layout,name,...args) {
    if(typeof mkobj[name]!=='function')throw new Error('Unknown MKOBJ source function '+name);
    const entry=entryFor(services,layout),previous=entry.current;
    entry.current=services;
    let stack;
    try {
        stack=services.stackSave();
        const environment=entry.environment;
        const typed=args.map((value,index)=>{
            const type=wideArguments[name]?.[index];
            return type==='long'?environment.i64(value)
                :type==='unsigned long'?environment.u64(value):environment.ptr(value);
        });
        const value=withCEnvironment(environment,mkobj[name],...typed);
        return pointerReturns.has(name)?BigInt(value??0):value;
    } finally {
        try {if(stack!==undefined)services.stackRestore(stack);}
        finally {entry.current=previous;}
    }
}
