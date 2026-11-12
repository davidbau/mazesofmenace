// Original CMD adapter on measured standalone records and command tables.
import abi from './command-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as cmd from '../ported/cmd.js';
import {callCmd} from '../ported/cmd-runtime.js';
import {createCTypes} from './c-types.js';
import {enableAddressPort} from './address-ports.js';
export function enableCommands(environment,layouts){
 const ctypes=createCTypes(environment.memory,{...records,records:{...records.records,...abi.records}},environment.bitfields);
 const only=Object.keys(cmd).filter(n=>typeof cmd[n]==='function'&&Object.hasOwn(publicFunctions.functions,n)&&!environment.hasFunction(n));
 const group=enableAddressPort(environment,'cmd',{only,definition:{schema:abi.schema,layout:layouts.cmd},adapter:[cmd,(s,l,n,...args)=>callCmd(s,l,cmd,n,...args.map((value,i)=>typeof value==='string'&&abi.schema.sourceParameters[n]?.[i]?.canonical.includes('*')?environment.services.literal(value):value?.address??value)),'layout'],ctypes});
 group.services.Strlen_=(value,caller,line)=>environment.strutil('Strlen_',typeof value==='string'?environment.services.literal(value):environment.address(value),typeof caller==='string'?environment.services.literal(caller):environment.address(caller),environment.transport.int(line));
 for(const name of abi.schema.publicData)environment.linkGlobal(name,environment.requireGlobal('cmd.'+name));
 return {...group,limitation:'CMD shared command storage/callback transport connected; reset/input/options lifecycle and C verification remain in progress.'};
}
