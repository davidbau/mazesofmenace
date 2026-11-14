// Formatting ABI only. Original libc, HACKLIB and PLINE own output behavior.
import abi from './equipment-format-abi.json' with {type:'json'};

export function attachEquipmentFormatting(environment,{weapon,worn,wield,armor},layouts){
 const {services,transport}=environment;
 if(layouts.weapon.pointerSize!==8||layouts.weapon.longSize!==8||layouts.do_wear.longSize!==8)
  throw new Error('Review changed equipment formatting ABI');
 const text=value=>typeof value==='string'?services.literal(value):environment.address(value?.address??value??0);
 const value=argument=>typeof argument==='string'?services.literal(argument):argument?.address??argument;
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const invoke=(name,args)=>resolve(name)(...args);
 const typed=(type,argument)=>{
  if(type.includes('*'))return text(argument);
  if(type==='int')return transport.int(argument??0);
  if(type==='long')return transport.long(argument??0);
  if(type==='unsigned long')return transport.ulong(argument??0);
  throw new Error('Unknown equipment formatter scalar '+type);
 };
 const packet=(row,args)=>{
  if(args.length!==row.types.length)throw new Error('Changed equipment formatter argument count '+row.name);
  return args.map((argument,index)=>typed(row.types[index],argument));
 };
 const checkedPrint=(row,args)=>invoke(row.actual,[text(row.fn),transport.int(row.line),...packet(row,args)]);

 // These owners have no site carrier except WEAPON's explicit Snprintf index.
 // Strings and shared views cross the boundary as actual C addresses; long
 // values already emitted by the original policy retain their BigInt width.
 for(const [owner,local]of Object.entries({weapon,worn,wield})){
  if(!local)continue;
  local.Sprintf=(out,format,...args)=>invoke('sprintf',[text(out),text(format),...args.map(value)]);
  for(const name of abi.messages[owner])local[name]=(...args)=>invoke(name,args.map(value));
 }
 weapon.Snprintf=(out,size,format,...args)=>{
  const site=args.pop(),row=abi.weapon.snprintf[site];
  if(!Number.isInteger(site)||!row||row.id!==site)throw new Error('Unknown WEAPON Snprintf source site');
  return checkedPrint(row,[out,size,format,...args]);
 };
 if(worn)worn.Snprintf=(out,size,format,argument)=>checkedPrint(abi.worn.snprintf,[out,size,format,argument]);
 const strlenSite=abi.weapon.strlen;
 weapon.Strlen=(str)=>environment.strutil('Strlen_',text(str),text(strlenSite.fn),strlenSite.line);
 weapon.Strlen_=(str,fn=strlenSite.fn,line=strlenSite.line)=>environment.strutil('Strlen_',text(str),text(fn),transport.int(line));

 // DO_WEAR carries a source-bound variadic site token. It is ABI metadata,
 // never a printf argument. The original native transport's typed packet
 // also restores __func__/__LINE__ for nh_snprintf.
 for(const name of new Set(abi.armorSites.map(row=>row.name)))armor[name]=(...args)=>{
  const marker=args.pop(),site=marker?.varargSite,row=abi.armorSites[site];
  if(!Number.isInteger(site)||!row||row.id!==site||row.name!==name)
   throw new Error('Unknown DO_WEAR variadic source site '+name);
  const types=row.types.slice(row.prefix),values=packet({...row,types},args);
  if(row.prefix)values.unshift(text(row.fn),transport.int(row.line));
  return invoke(row.actual,values);
 };
 armor[abi.armorPlain.name]=str=>invoke(abi.armorPlain.actual,[text(abi.armorPlain.format),text(str)]);
 return {limitation:'Source formatting sites/typed arguments connected; original-C output, truncation and diagnostic observations remain required.'};
}
