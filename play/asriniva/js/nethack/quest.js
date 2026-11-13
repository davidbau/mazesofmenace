// Original QUEST decisions, one live native-shaped context over shared game state.
import abi from './quest-abi.json' with {type:'json'};
import * as source from '../ported/quest.js';
import {createQuestEnvironment} from './bindings/quest.js';
export function enableQuest(environment,layouts){
 if(environment.hasFunction('onquest'))throw new Error('QUEST owner already registered');
 const {services,memory,ctypes,transport}=environment,address=environment.address,L=layouts.quest;
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review QUEST ABI '+key);
 const boundary=args=>args.map(value=>typeof value==='string'?services.literal(value):value?.address??value);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
 const packed=(kind,p,index,value)=>{const fields=abi.packed[kind],field=fields[index];if(!field)throw new Error('Unknown QUEST packed '+kind+':'+index);let type=kind==='quest'?'struct instance_globals_saved_q':kind==='hero'?'struct you':'struct monst';const parts=(kind==='quest'?'quest_status.'+field:field).split('.'),key=parts.pop();for(const part of parts){const entry=ctypes.locate(type,p,part);if(!entry.field.record)throw new Error('Unmeasured QUEST nested field '+part);p=entry.at;type=entry.field.record;}const measured=ctypes.record(type).fields[key],scalar=measured.bits!==undefined?'unsigned int':measured.ctype.replace(new RegExp('\\b'+key+'$'),'').trim();return value===undefined?ctypes.getField(type,p,key,scalar):ctypes.setField(type,p,key,scalar,value);};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
  global:index=>{const name=abi.globals[index];if(!name)throw new Error('Unknown QUEST global '+index);return environment.requireGlobal(name);},
  questBit:index=>packed('quest',environment.requireGlobal('svq'),index),setQuestBit:(index,value)=>packed('quest',environment.requireGlobal('svq'),index,value),
  heroBit:index=>packed('hero',environment.requireGlobal('u'),index),setHeroBit:(index,value)=>packed('hero',environment.requireGlobal('u'),index,value),
  monsterBit:(mon,index)=>packed('monster',address(mon),index),setMonsterBit:(mon,index,value)=>packed('monster',address(mon),index,value),
  trapType:trap=>ctypes.getField('struct trap',address(trap),'ttyp','unsigned int'),
  rn2:(bound,line)=>{if(line!==undefined&&services.rng_log_enabled())services.rng_log_set_caller(services.literal(abi.rng.file),line,services.literal(abi.rng.function));return resolve('rn2')(transport.int(bound));},
  yn_function:(query,choices,initial,history)=>resolve('yn_function')(...boundary([query,choices]),transport.char(typeof initial==='string'?initial.charCodeAt(0):initial),transport.char(history)),
  exercise:(attribute,positive)=>resolve('exercise')(transport.int(attribute),transport.char(positive)),
  align_str:alignment=>resolve('align_str')(transport.char(alignment)),
  find_quest_artifact:flags=>resolve('find_quest_artifact')(transport.uint(flags)),
  schedule_goto:(dest,flags,pre,post)=>resolve('schedule_goto')(address(dest),transport.int(flags),...boundary([pre,post])),
  create_gas_cloud:(x,y,radius,damage)=>resolve('create_gas_cloud')(transport.short(x),transport.short(y),transport.int(radius),transport.int(damage)),
  monnear:(mon,x,y)=>resolve('monnear')(address(mon),transport.short(x),transport.short(y)),
  angry_guards:silent=>resolve('angry_guards')(transport.char(silent)),setmangry:(mon,silent)=>resolve('setmangry')(address(mon),transport.char(silent)),
 });
 for(const name of ['You','pline','verbalize','impossible','livelog_printf'])local[name]=(...args)=>resolve(name)(...boundary(args));
 const context=createQuestEnvironment(local,L);Object.setPrototypeOf(context,local);
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));
 environment.register('quest',Object.fromEntries(names.map(name=>[name,source[name]])),context,{prepareArgs:(name,args)=>{
  if(['artitouch','finish_quest'].includes(name))args[0]=context.object(address(args[0]));
  if(['leader_speaks','quest_chat','quest_talk','quest_stat_check'].includes(name))args[0]=context.monster(address(args[0]));
  if(name==='nemesis_stinks')args=args.map(value=>transport.short(value));return args;
 }});
 return{context,exports:names,limitation:'Original QUEST public policies share actual quest, hero and world state. Missing foreign owners fail explicitly. Eligibility/status and reached real conversations require original-C acceptance; full quest dungeon progression is a separate gameplay requirement.'};
}
