// Function identity and targeted nonlocal unwinding for standalone C adapters.
export class CExit extends Error {constructor(status){super('C exit '+status);this.status=status;}}
class CJump {constructor(scope,value){this.scope=scope;this.value=value||1;}}
export function createFunctions() {
    const entries=new Map(),identities=new Map();let next=1n;
    const frames=[];
    function register(fn,signature) {
        if(typeof fn!=='function'||typeof signature!=='string'||!/^[vifdjp]+$/.test(signature))throw new TypeError('Invalid C callback');
        let bySignature=identities.get(fn);if(!bySignature)identities.set(fn,bySignature=new Map());
        if(bySignature.has(signature))return bySignature.get(signature);
        const id=next++;entries.set(id,{fn,signature});bySignature.set(signature,id);return id;
    }
    return {
        functionPointer:register,
        callback(id){const entry=entries.get(BigInt(id));if(!entry)throw new TypeError('Unknown C callback');return entry.fn;},
        typedCallback(id,signature){const entry=entries.get(BigInt(id));if(!entry||entry.signature!==signature)throw new TypeError('Unknown or incompatible C callback');return entry.fn;},
        indirect(id,signature,...args){const entry=entries.get(BigInt(id));if(!entry||entry.signature!==signature)throw new TypeError('Unknown or incompatible C callback');return entry.fn(...args);},
        withJumpScope(callback){const scope={};frames.push(scope);try{return callback(scope);}catch(error){if(error instanceof CJump&&error.scope===scope)return error.value;throw error;}finally{frames.pop();}},
        longjmp(scope,value){if(!frames.includes(scope))throw new Error('Expired C jump target');throw new CJump(scope,value);},
        exit:status=>{throw new CExit(Number(status));},
    };
}
