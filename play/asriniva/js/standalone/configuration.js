// Shared filesystem/record transport for unchanged CFGFILES policies.
import abi from './configuration-abi.json' with {type:'json'};
import optionAbi from './options-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import {build_english_list} from '../ported/end.js';
import * as cfgfiles from '../ported/cfgfiles.js';
import {createCfgfilesEnvironment} from '../ported/cfgfiles-runtime.js';
import {createCTypes} from './c-types.js';
import {enableAddressPort} from './address-ports.js';
export function enableConfiguration(environment,layouts){
 const ctypes=createCTypes(environment.memory,{...records,records:{...records.records,...abi.records},enums:{...records.enums,...optionAbi.enums}},environment.bitfields);
 const text=v=>typeof v==='string'?environment.services.literal(v):environment.address(v),lists=Object.create(environment.services);
 Object.assign(lists,{int:environment.transport.int,uchar:environment.transport.uchar,alloc:n=>environment.alloc('alloc',n),loadChar:p=>environment.memory.view.getInt8(environment.address(p)),storeChar:(p,v)=>environment.memory.view.setInt8(environment.address(p),Number(v)),reference:(get,set)=>Object.defineProperty({},'value',{get,set}),Strcat:(a,b)=>environment.services.strcat(text(a),text(b)),impossible:(...args)=>environment.resolve('impossible')(...args)});
 environment.register('configuration-lists',{build_english_list},lists,{prepareArgs:(_fn,args)=>[text(args[0])]});
 const schema={...abi.schema,backings:[{name:'configfileBuffer',type:'char['+abi.configfileBytes+']'}]};
 const only=Object.keys(cfgfiles).filter(n=>typeof cfgfiles[n]==='function'&&Object.hasOwn(publicFunctions.functions,n)&&!environment.hasFunction(n));
 const group=enableAddressPort(environment,'cfgfiles',{only,definition:{schema,layout:layouts.cfgfiles},adapter:[cfgfiles,createCfgfilesEnvironment,'factory'],ctypes});
 group.services.callVoid=fn=>environment.functions.indirect(fn,'v');group.services.callProc=(fn,p)=>environment.functions.indirect(fn,'ip',environment.address(p));
 return {...group,limitation:'Configuration records/filesystem transport connected; parser/error/configuration lifecycle still requires original-C verification.'};
}
