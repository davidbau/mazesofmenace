// Native DOG policies share canonical actors, inventory and migration lists.
import {nativeDogFor} from './native/dog-graph.js';
import * as originalDog from '../ported/dog.js';
export function enablePets(environment,layouts){
 const graph=nativeDogFor(environment,layouts);
 const entries=Object.fromEntries(Object.entries(graph.functions).filter(([name])=>!environment.hasFunction(name)));
 environment.register('pets',entries,graph.context);
 const earlier=environment.start('monster-companion-extra');
 for(const name of ['newedog','free_edog']){if(earlier.namespace[name]!==originalDog[name])throw Error('Unexpected earlier DOG owner '+name);earlier.namespace[name]=graph.functions[name];}
 return {services:graph.services,context:graph.context,call:(name,...args)=>name==='failed_arrivals'?environment.address(graph.context.failed_arrivals):graph.functions[name](...args),limitation:'Connected native DOG gameplay; exact C/public recording checks and unprofiled timing are reported separately.'};
}
