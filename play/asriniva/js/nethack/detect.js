// Full public DETECT exposure on the already cached native address adapter.
import abi from './detect-abi.json' with {type:'json'};
import metadata from './address-ports.json' with {type:'json'};
const cache=new WeakMap();
export function enableDetect(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const definition=metadata.ports.detect;
 if(JSON.stringify(definition.layout)!==JSON.stringify(abi.layout)||JSON.stringify(definition.schema)!==JSON.stringify(abi.schema))throw new Error('Review canonical DETECT native adapter binding');
 if(JSON.stringify(layouts.detect)!==JSON.stringify(abi.layout))throw new Error('Review DETECT configured layout');
 let entry;try{entry=environment.start('detect');}catch(e){if(e.message!=='Unresolved standalone module detect')throw e;environment.enableAddressPort('detect',{only:[]});entry=environment.start('detect');}
 const prior=new Map(Object.entries(entry.namespace));for(const name of Object.keys(abi.public))if(environment.hasFunction(name)&&!Object.hasOwn(entry.namespace,name))throw new Error('Unexpected existing DETECT source owner '+name);
 const exposed=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));environment.exposeAddressPort('detect',exposed);
 for(const[name,fn]of prior)if(entry.namespace[name]!==fn)throw new Error('Canonical DETECT entry identity changed '+name);
 const backing=environment.requireGlobal('detect.dummytrap');if(entry.environment.global(abi.schema.globals.length)!==backing)throw new Error('Duplicate DETECT private trap backing');
 const result={owner:'detect',exposed,preserved:[...prior.keys()],backing,scope:'One existing cached original native factory/private backing; full public exposure. Native behavior requires focused original-C proof.'};cache.set(environment,result);return result;
}
