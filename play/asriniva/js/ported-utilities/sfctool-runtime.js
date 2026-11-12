import * as core from './sfctool.js';
import {withEnvironment} from './sfctool-scope.js';
import {createSfctoolHelpers} from './sfctool-helpers.js';
export function createSfctool(Module) {
    const helper=createSfctoolHelpers(Module),C=helper.env;
    const raw=p=>p?.address??Number(p??0), dv=()=>new DataView(Module.HEAPU8.buffer);
    const globals=Array.from({length:25},(_,i)=>Number(Module._utility_global(i)));
    const L=Array.from({length:Number(Module._utility_full_layout(-1))},(_,i)=>Number(BigInt.asIntN(64,Module._utility_full_layout(i))));
    const local=n=>Number(Module.stackAlloc(BigInt(n)));
    const literal=helper.literal;
    function box(at,size,signed=true){return{address:at,get value(){const v=dv();return size===1?v.getInt8(at):size===4?v.getInt32(at,true):v.getBigInt64(at,true);},set value(n){const v=dv();if(size===1)v.setInt8(at,Number(n));else if(size===4)v.setInt32(at,Number(n),true);else v.setBigInt64(at,BigInt(n),true);}};}
    function file(p){if(!raw(p))return 0;const out={address:raw(p)};for(const[i,name]of ['fd','mode','ftype','fnidx','rcount','structlevel','fieldlevel','addinfo','eof','fpdef','nhfpconvert'].entries()){const at=raw(p)+L[1+2*i],width=L[2+2*i];Object.defineProperty(out,name,{get(){if(name==='fpdef')return Number(dv().getBigUint64(at,true));if(name==='nhfpconvert')return file(dv().getBigUint64(at,true));return box(at,width).value;},set(n){if(name==='fpdef'||name==='nhfpconvert')dv().setBigUint64(at,BigInt(raw(n)),true);else box(at,width).value=n;},enumerable:true});}return out;}
    function property(name,key,type){Object.defineProperty(C,name,{configurable:true,enumerable:true,get(){if(type==='p')return Number(dv().getBigUint64(globals[key],true));if(type==='u32')return dv().getUint32(globals[key],true);return box(globals[key],type).value;},set(n){if(type==='p')dv().setBigUint64(globals[key],BigInt(raw(n)),true);else if(type==='u32')dv().setUint32(globals[key],n,true);else box(globals[key],type).value=n;}});}
    for(const[name,key,type]of [['unconverted_filename',0,'p'],['converted_filename',1,'p'],['renidx',4,4],['convertstyle',5,'u32'],['chosen_unconvert',6,1],['explicit_option',7,1],['thisdatamodel',8,'p']])property(name,key,type);
    C.renidx=-1;C.convertstyle=C.exportascii;
    C.plname=globals[2];C.vers_info=globals[3];C.srclogfilenm=globals[9];C.dstlogfilenm=globals[10];
    C.svm={get moves(){return dv().getBigInt64(globals[11]+L[23],true);},set moves(n){dv().setBigInt64(globals[11]+L[23],n,true);}};
    C.iflags={get initoptions_noterminate(){return dv().getInt8(globals[12]+L[24]);}};
    C.restoreinfo={get mread_flags(){return box(globals[13]+L[25],L[26]).value;},set mread_flags(n){box(globals[13]+L[25],L[26]).value=n;}};
    C.cscbuf=new Proxy({address:globals[14]},{get:(o,k)=>/^\d+$/.test(String(k))?Module.HEAPU8[o.address+Number(k)]:Reflect.get(o,k)});
    for(const[name,key,size]of [['sfoprocs',15,L[27]],['sfiprocs',16,L[27]],['sfoflprocs',17,L[28]],['sfiflprocs',18,L[28]]])C[name]=new Proxy({},{get:(_,k)=>globals[key]+Number(k)*size,set(_,k,p){Module._utility_memcpy(BigInt(globals[key]+Number(k)*size),BigInt(raw(p)),BigInt(size));return true;}});
    for(const[name,key]of [['zerosfoprocs',19],['zerosfiprocs',20],['historical_sfo_procs',21],['historical_sfi_procs',22],['exportascii_sfo_procs',23],['exportascii_sfi_procs',24]])C[name]=globals[key];
    for(const[name,index]of [['READING',30],['WRITING',31],['NHF_SAVEFILE',32],['SAVEPREFIX',33],['O_RDONLY',34],['O_BINARY',35],['FCMASK',36],['UNCONVERTING',37],['CONVERTING',38],['SF_UPTODATE',39],['SF_CRITICAL_BYTE_COUNT_MISMATCH',40],['SF_OUTDATED',41],['SF_DM_IL32LLP64_ON_ILP32LL64',42],['VERSION_MAJOR',43],['VERSION_MINOR',44],['PATCHLEVEL',45],['EDITLEVEL',46],['set_in_sysconf',47]])C[name]=L[index];
    C.UNCONVERTED=0;C.CONVERTED=1;C.SYSCF_FILE='sysconf';C.RDBMODE='r';C.WRBMODE='w+';
    C.rensuffixes=core.rensuffixes;
    C.charArrayLocal=local;C.charLocal=()=>box(local(1),1);C.addressOf=(p,i)=>raw(p)+i;
    C.nhUse=()=>{};C.int=n=>Number(n)|0;C.literal=literal;
    C.strlen=p=>Number(Module._utility_strlen(BigInt(literal(p))));
    C.strcmp=(a,b)=>Module._utility_strcmp(BigInt(literal(a)),BigInt(literal(b)));
    C.contains_directory=p=>Module._utility_contains_directory(BigInt(literal(p)));
    C.eos=p=>Number(Module._utility_eos(BigInt(raw(p))));
    C.strcpy=(a,b)=>Number(Module._utility_strcpy(BigInt(raw(a)),BigInt(literal(b))));
    C.strcat=(a,b)=>Number(Module._utility_strcat(BigInt(raw(a)),BigInt(literal(b))));
    function packet(fmt,args,fn){const sp=Module.stackSave();try{const slots=local(Math.max(1,args.length)*8);let index=0,offset=0;for(const m of fmt.matchAll(/%(?:[-+ #0]*\d*(?:\.\d+)?)(ll|l|z)?([%sdiu])/g)){if(m[2]==='%')continue;const arg=args[index++],align=(m[2]==='s'||m[1])?8:4;offset=Math.ceil(offset/align)*align;const p=slots+offset;offset+=align;if(m[2]==='s')dv().setBigUint64(p,BigInt(literal(arg)),true);else if(m[1])dv().setBigInt64(p,BigInt(arg),true);else dv().setInt32(p,Number(arg),true);}return fn(slots);}finally{Module.stackRestore(sp);}}
    C.fprintf=(f,fmt,...args)=>packet(fmt,args,p=>Module._utility_format(BigInt(raw(f)),BigInt(literal(fmt)),BigInt(p)));
    C.snprintf=(out,n,fmt,...args)=>packet(fmt,args,p=>Module._utility_snprintf(BigInt(raw(out)),BigInt(n),BigInt(literal(fmt)),BigInt(p)));
    C.nh_snprintf=(fn,line,out,n,fmt,...args)=>Module._utility_nh_snprintf(BigInt(literal(fn)),line,BigInt(raw(out)),BigInt(n),BigInt(literal(fmt)),...Array.from({length:4},(_,i)=>BigInt(literal(args[i]??0))));
    for(const name of ['nh_compress','nh_uncompress'])C[name]=p=>Module['_utility_'+name](BigInt(literal(p)));
    C.new_nhfile=()=>file(Module._utility_new_nhfile());C.free_nhfile=p=>Module._utility_free_nhfile(BigInt(raw(p)));
    C.close_nhfile=p=>Module._utility_close_nhfile(BigInt(raw(p)));
    C.open=(p,f,n)=>Module._utility_open(BigInt(literal(p)),f,n);C.creat=(p,f)=>Module._utility_creat(BigInt(literal(p)),f);
    C.fopen=(a,b)=>Number(Module._utility_fopen(BigInt(literal(a)),BigInt(literal(b))));C.fclose=p=>Module._utility_fclose(BigInt(raw(p)));
    C.unlink=p=>Module._utility_unlink(BigInt(literal(p)));C.rename=(a,b)=>Module._utility_rename(BigInt(literal(a)),BigInt(literal(b)));
    C.fqname=(a,b,c)=>Number(Module._utility_fqname(BigInt(literal(a)),b,c));
    C.datamodel=n=>Number(Module._utility_datamodel(n));C.runtime_info_init=()=>Module._utility_runtime_info_init();
    C.decl_globals_init=()=>Module._utility_decl_globals_init();C.assure_syscf_file=()=>Module._utility_assure_syscf_file();
    C.config_error_init=(a,b,c)=>Module._utility_config_error_init(Number(a),BigInt(literal(b)),Number(c));C.config_error_done=()=>Module._utility_config_error_done();
    C.read_config_file=(a,b)=>Module._utility_read_config_file(BigInt(literal(a)),b);
    C.validate=(a,b,c)=>Module._utility_validate(BigInt(raw(a)),BigInt(literal(b)),Number(c));
    C.what_datamodel_is_this=(...a)=>Number(Module._utility_what_datamodel(...a));
    C.rewind_nhfile=p=>Module._utility_rewind_nhfile(BigInt(raw(p)));
    C.Sfi_char=(f,a,n,c)=>Module._utility_sfi_char(BigInt(raw(f)),BigInt(raw(a)),BigInt(literal(n)),c);
    for(const name of ['uchar','xint8','version_info'])C['Sfi_'+name]=(f,a,n)=>Module['_utility_sfi_'+name](BigInt(raw(f)),BigInt(raw(a)),BigInt(literal(n)));
    C.store_critical_bytes=f=>Module._utility_store_critical_bytes(BigInt(raw(f)));
    C.get_plname_from_file=(f,p,b)=>Module._utility_get_plname(BigInt(raw(f)),BigInt(raw(p)),Number(b));
    C.getlev=(f,a,b)=>Module._utility_getlev(BigInt(raw(f)),Number(a),Number(b));C.restgamestate=f=>Module._utility_restgamestate(BigInt(raw(f)));
    const own=new Set(['main','process_savefile','open_srcfile','create_dstfile','my_sf_init','read_sysconf']);
    return {C,L,file,helper,invoke(name,args){if(!own.has(name))return helper.invoke(name,args);args=args.map(a=>typeof a==='bigint'?Number(a):a);if(name==='main'){const p=args[1];args[1]=new Proxy({},{get:(_,i)=>Number(dv().getBigUint64(p+Number(i)*8,true))});}if(name==='open_srcfile'||name==='create_dstfile')args[1]>>>=0;if(name==='process_savefile'){args[1]>>>=0;args[3]>>>=0;}const sp=Module.stackSave();try{const out=withEnvironment(C,core[name],...args);return name==='main'?(out??0):['open_srcfile','create_dstfile'].includes(name)?BigInt(raw(out)):out;}finally{Module.stackRestore(sp);}}};
}
