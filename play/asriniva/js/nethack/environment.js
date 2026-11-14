import {createNativeHacklibBindings} from './native/hacklib-state.js';
import {nativeGeometryFor} from './native/spatial-state.js';
import {createNativeRngBindings} from './native/rng-bindings.js';
import {createNativeRecordViews} from './native/record-views.js';
import {createEnvironmentServices} from '../c-runtime/environment.js';
import {address} from '../c-runtime/memory.js';
import {createNetHackRuntime} from './runtime-bindings.js';
// Independent environment for existing translated modules. Ports are unmodified.
import {enableSpecialInteractions} from './special-interactions.js';
import {createJsRuntime,CPanic} from './runtime.js';
import {withCEnvironment} from '../c-runtime/context.js';
import * as rect from '../ported/rect.js';
import {createRectBindings} from './rect-bindings.js';
import {createLinker} from '../c-runtime/linker.js';
import publicFunctions from './public-functions.json' with {type:'json'};
import {createStandaloneLibc} from './libc.js';
import * as hacklib from '../ported/hacklib.js';
import {createHacklibState,createHacklibEnvironment} from './bindings/hacklib.js';
import * as decl from '../ported/decl.js';
import {initializeDecl} from './bindings/decl.js';
import declStorage from './decl-storage.json' with {type:'json'};
import * as drawing from '../ported/drawing.js';
import {initializeDrawing} from './bindings/drawing.js';
import * as objects from '../ported/objects.js';
import {createObjectsState,createObjectsEnvironment} from './bindings/objects.js';
import * as monst from '../ported/monst.js';
import {createMonstState,createMonstEnvironment} from './bindings/monst.js';
import records from './records.json' with {type:'json'};
import {createStdio} from '../c-runtime/stdio.js';
import {createStandaloneLua} from './lua.js';
import {createRndState,createRndEnvironment} from './bindings/rnd.js';
import * as sys from '../ported/sys.js';
import {enableAddressPort} from './address-ports.js';
import {enableSerialization} from './serialization.js';
import * as track from '../ported/track.js';
import {isok} from '../ported/cmd.js';
import {createLibraryBindings} from '../c-runtime/library-bindings.js';
import {filesUnder,captureGameFiles,restoreGameFiles} from './game-files.js';
import {shouldPersistGameFile} from '../wasm-replay-support.js';
import {enableTerminal} from './terminal.js';
import {enableObjectState} from './object-state.js';
import {enableObjectRecords} from './object-records.js';
import {enableItemInventory} from './item-inventory.js';
import {enableTimers} from './timers.js';
import {enableMonsterSelection} from './monster-selection.js';
import {enableItemNaming} from './item-naming.js';
import {enableMonsterCreation} from './monster-creation.js';
import {enableMonsterInventory} from './monster-inventory.js';
import {enableWorldPosition} from './world-position.js';
import {createEnvironmentInputs} from '../c-runtime/environment-inputs.js';
import {nativeStateFor} from './native/state-bridge.js';
import {NativeTypedState} from './native/typed-state.js';
import {enableLuaSandbox} from './lua-sandbox.js';
import {enableMonsterLifecycle} from './monster-lifecycle.js';
import {enableMonsterMovement} from './monster-movement.js';
import {enableConfiguration} from './configuration.js';
import {enableFiles} from './files.js';
import {enableCommands} from './commands.js';
import {enableGlyphs} from './glyphs.js';
import {enableSymbols} from './symbols.js';
import {enablePets} from './pets.js';
import {enableMovement} from './movement.js';
import {enableGameWindows} from './game-windows.js';
import {enableStatus} from './status.js';
import {enableOptions} from './options.js';
import {enableVersionInfo} from './version-info.js';
import {enableWindowSystem} from './window-system.js';
import {enableLevelContents} from './level-contents.js';
import {enableLevelStartup} from './level-startup.js';
import {enableDisplayStartup} from './display-startup.js';
import {enableHeroStartup} from './hero-startup.js';
import {enableHeroEquipment} from './hero-equipment.js';
import {enableQuestPager} from './quest-pager.js';
import {enableDoLifecycle} from './do-lifecycle.js';
import {enableTerminalInput} from './terminal-input.js';
import {enableSaveLifecycle} from './save-lifecycle.js';
import {enableRestoreLifecycle} from './restore-lifecycle.js';
import {enableKillerState} from './killer-state.js';
import {enableEndLifecycle} from './end-lifecycle.js';
import {enablePotion} from './potion.js';
import {enableZap,enableZapPublic} from './zap.js';
import {enablePolyself} from './polyself.js';
import {enableWere} from './were.js';
import {enableDogmove} from './dogmove.js';
import {enableMhitu} from './mhitu.js';
import {enableMhitm} from './mhitm.js';
import {enableColorAttributes} from './color-attributes.js';
import {enableVault} from './vault.js';
import {enableUhitm} from './uhitm.js';
import {enableMthrowu} from './mthrowu.js';
import {enableMcastu} from './mcastu.js';
import {enableRead} from './read.js';
import {enableSpell} from './spell.js';
import {enableExplode} from './explode.js';
import {enableDig} from './dig.js';
import {enableWizard} from './wizard.js';
import {enableMplayer} from './mplayer.js';
import {enableMinion} from './minion.js';
import {enableGetpos} from './getpos.js';
import {enableMondata} from './mondata.js';
import {enableSteal} from './steal.js';
import {enableDokick} from './dokick.js';
import {enableLight} from './light.js';
import {enableDetect} from './detect.js';
import {enableRegion} from './region-services.js';
import {enableBall} from './ball.js';
import {enableDbridge} from './dbridge.js';
import {enableDoName} from './do-name.js';
import {enableEngrave} from './engrave.js';
import {enableDiscoveries} from './discoveries.js';
import {enableSdkBoundary} from './sdk-boundary.js';
import {enableWizcmds} from './wizcmds.js';
import {enableRip} from './rip.js';
import {enableShknam} from './shknam.js';
import {enableInsight} from './insight.js';
import {enableTopten} from './topten.js';
import {enablePriest} from './priest.js';
import {enableQuest} from './quest.js';
import {enableLock} from './lock.js';
import {enableApply} from './apply.js';
import {enableLevelPersistence} from './level-persistence.js';
import {enableWorms} from './worm.js';
import {enableReport} from './report.js';
import {enableUnixPlatform} from './unix-platform.js';
import {enableTerminalMessages} from './terminal-messages.js';
import {enableMessages} from './messages.js';
import {enableRuntimeInfo} from './runtime-info.js';
import {enableTurnLoop} from './turn-loop.js';
import {enableGameStartup} from './game-startup.js';

export function createStandaloneEnvironment(options={}) {
    const base=createJsRuntime(options),{memory}=base;
    const inputs=createEnvironmentInputs(base,options.environment);
    const {transport,functions,bitfields,ctypes,services}=createNetHackRuntime(base,records,inputs.getenv);
    const variables=createEnvironmentServices(base.memory,{get:inputs.getenv,set:inputs.setEnvironment},base.libc);
    Object.assign(services,{setenv:variables.setenv,unsetenv:variables.unsetenv});if(typeof services.getenv!=='function')services.getenv=variables.getenv;
    const ENV={...options.environment},diagnostics=[];
    Object.assign(services,{ENV,FS:base.FS,printErr:message=>diagnostics.push(String(message))});
    Object.assign(services,createStandaloneLibc(memory,base.libc,transport,functions),{
        memcpy:(d,s,n)=>memory.memcpy(address(d),address(s),Number(n)),
        memmove:(d,s,n)=>memory.memmove(address(d),address(s),Number(n)),
        memset:(d,v,n)=>memory.memset(address(d),v,Number(n)),
        callComparator:(fn,a,b)=>typeof fn==='function'?fn(a,b):functions.indirect(fn,'ipp',a,b),
    });
    const states=new Map();
    const addressAdapters=new Map();let itemInventory,monsterSelection,monsterCreation,heroStartup,were,dogmove,mhitm,vault,quest;
    const linker=createLinker({memory,transport,functions,services,ctypes,
        prototypes:publicFunctions.functions,withEnvironment:withCEnvironment,
        resolveFunction:name=>environment.resolve(name)});
    const {functionPointer,deferFunctions,resolve,extend,register,start,call,
        allocateGlobal,requireGlobal,linkGlobal}=linker;
    Object.assign(services,{global:requireGlobal,storage:requireGlobal});
    function enableRect(layout,{rn2,impossible=message=>diagnostics.push(message)}={}) {
        let generator;
        const draw=n=>{
            if(!Number.isInteger(n)||n<=0)throw new RangeError('Invalid rn2 bound');
            if(typeof services.rn2==='function'){
                if(services.rng_log_enabled?.()){const caller=records.rngSites.rect;services.rng_log_set_caller(services.literal(caller.file),caller.line,services.literal(caller.function));}
                return services.rn2(n);
            }
            generator??=base.createIsaac(options.seed??new Uint8Array());return Number(generator.next()%BigInt(n));
        };
        const binding=createRectBindings(transport,services,layout,{
            alloc:n=>base.alloc('alloc',n),panic:message=>{throw new CPanic(message);},
            impossible,rn2:rn2??draw,
        });
        register('rect',rect,binding.environment,{prepareArgs:binding.prepareArgs});
        states.set('rect',binding.state);return binding.state;
    }

    function enableHacklib(layout) {
        const local=Object.create(services),namespace={...hacklib},storage=[layout.BUFSZ,layout.BUFSZ,25,13]
            .map((size,i)=>allocateGlobal('hacklib.'+i,size));
        local.nativeOwner=nativeStateFor(environment);
        local.storage=i=>{if(!Number.isInteger(i)||i<0||i>=storage.length)throw new RangeError('Unknown hacklib static');return storage[i];};
        local.qsort=(base,n,size)=>services.qsort(base,n,size,namespace.nh_qsort_idx_cmp);
        const state=createHacklibState(),env=createHacklibEnvironment(local,layout,namespace,state);
        // Preserve the port's packet contract; the packet contains JS values,
        // not a native va_list pointer, in this provider.
        env.va_start=ap=>{ap.nativeVaList=ap[0]?.nativeVaList??ap;};
        const native=createNativeHacklibBindings(environment,env,namespace);
        register('hacklib',{...native.entries,...Object.fromEntries(Object.entries(nativeGeometryFor(environment)).filter(([name])=>name!=='isok'))},env);states.set('hacklib',state);return state;
    }
    function enableDecl(layout,{raw_printf}={}) {
        const pointers=declStorage.globals.map(g=>allocateGlobal(g.name,g.bytes));
        const local=Object.create(services);
        local.storage=i=>{if(!Number.isInteger(i)||!pointers[i])throw new Error('Unknown DECL storage index '+i);return pointers[i];};
        local.raw_printf=raw_printf??((...args)=>{throw new Error('No standalone raw output sink: '+args[0]);});
        const env=initializeDecl(local,layout);
        // Reuse the authoritative initializer and measured views; no copied
        // native images, initializer values, or independent global layouts.
        for(const g of declStorage.globals)Object.defineProperty(services,g.name,Object.getOwnPropertyDescriptor(env,g.name));
        register('decl',decl,env);states.set('decl',env);return env;
    }
    function enableDrawing(layout) {
        const sizes={objectSymbols:layout.MAXOCLASSES*layout.classSize,monsterSymbols:layout.MAXMCLASSES*layout.classSize,
            warningSymbols:layout.WARNCOUNT*layout.symdefSize,symbols:(layout.MAXPCHARS+1)*layout.symdefSize,rogueSymbols:layout.MAXOCLASSES};
        const local=Object.create(services),storage={};
        for(const [key,size]of Object.entries(sizes)){const at=allocateGlobal('drawing.'+key,size);local[key]=()=>at;storage[key]=at;}
        initializeDrawing(local,layout,drawing);
        for(const [key,method]of Object.entries({def_oc_syms:'objectSymbols',def_monsyms:'monsterSymbols',def_warnsyms:'warningSymbols',defsyms:'symbols',def_r_oc_syms:'rogueSymbols'}))linkGlobal(key,storage[method]);
        register('drawing',Object.fromEntries(Object.entries(drawing).map(([key,value])=>[key,typeof value==='function'?ch=>value(transport.char(ch)):value])));
        states.set('drawing',storage);return storage;
    }
    function enableObjects(layout) {
        if(records.records.objclass.size!==layout.objectSize)throw new Error('Objects bitfield profile mismatch');
        const sizes=[layout.sizeof_obj_descr,layout.sizeof_objects,layout.sizeof_obj_descr,layout.sizeof_objects],local=Object.create(services);
        const pointers=sizes.map((size,i)=>allocateGlobal('objects.'+i,size));local.storage=i=>pointers[i];
        const keys=['oc_name_known','oc_merge','oc_uses_known','oc_encountered','oc_magic','oc_charged','oc_unique','oc_nowish','oc_big','oc_tough','oc_spare1','oc_dir','oc_material'];
        local.setBit=(ptr,i,v)=>{if(!keys[i])throw new Error('Unknown object class bit');return bitfields.set('objclass',keys[i],ptr,v);};
        const state=createObjectsState(local,layout,objects),env=createObjectsEnvironment(local,layout,state);
        linkGlobal('obj_descr',pointers[0]);linkGlobal('objects',pointers[1]);
        register('objects',objects,env);states.set('objects',{...state,pointers});return pointers;
    }
    function enableMonst(layout) {
        if(records.records.permonst.size!==layout.monsterSize)throw new Error('Monster catalogue profile mismatch');
        const sizes=[layout.sizeof_mons,layout.sizeof_mons,layout.sizeof_attacks,layout.sizeof_attacks],local=Object.create(services);
        const pointers=sizes.map((size,i)=>allocateGlobal('monst.'+i,size));local.storage=i=>pointers[i];
        const state=createMonstState(local,layout,monst),env=createMonstEnvironment(local,layout,state);
        linkGlobal('mons',pointers[0]);linkGlobal('c_sa_yes',pointers[2]);linkGlobal('c_sa_no',pointers[3]);
        register('monst',monst,env);states.set('monst',{...state,pointers});return pointers;
    }
    let stdio;
    function enableStdio(options={}) {
        if(stdio)throw new Error('Standalone stdio already enabled');
        stdio=createStdio(memory,base.filesystem,base.libc,options);Object.assign(services,stdio);return stdio;
    }
    function enableRnd(layout,{initialize=true,seed=0n,displaySeed=seed,luck=()=>services.u?.uluck??0,level=()=>services.u?.ulevel??1,strongSeed=()=>services.has_strong_rngseed??decl.has_strong_rngseed,randomSeed}={}) {
        if(!stdio)throw new Error('Enable standalone stdio before rnd');
        const core=functionPointer('rn2','ii'),display=functionPointer('rn2_on_display_rng','ii');
        const local=Object.create(services);
        Object.assign(local,{coreFunction:()=>Number(core),displayFunction:()=>Number(display),luck,level,strongSeed,
            fopen:services.fopen,setvbuf:services.setvbuf,fputc:services.fputc,
            fprintf:(file,format,...args)=>services.fprintf(file,format,...args.map(v=>v instanceof Uint8Array?String.fromCharCode(...v.subarray(0,v.indexOf(0)<0?v.length:v.indexOf(0))):v)),
            sys_random_seed:randomSeed??(()=>environment.resolve('sys_random_seed')()),
            sgn:n=>Math.sign(n),getenv:name=>base.services.nh_getenv(name),panicBadRng:()=>{throw new CPanic('Bad RNG function');},
            impossible:(format,...args)=>{throw new Error(base.libc.format(format,...args));},
            snprintf:(buffer,n,format,...args)=>{const value=base.libc.format(format,...args),bytes=Uint8Array.from(value.slice(0,Number(n)-1),c=>c.charCodeAt(0));buffer.set(bytes);buffer[bytes.length]=0;return value.length;},
        });
        const state=createRndState(local),env=createRndEnvironment(local,layout,state);
        register('rnd',createNativeRngBindings(environment,env),env);
        // These three APIs only inspect/update the RNG logger's JS state.
        // They neither step the generator nor inspect native actor/map bytes.
        for(const name of ['rng_log_enabled','rng_log_set_caller','rng_log_get_call_count'])if(Object.getOwnPropertyDescriptor(services[name],'nativeEntry')?.get)Object.defineProperty(services[name],'nativeStateIndependent',{value:true});
        if(typeof initialize!=='boolean')throw new TypeError('RNG initialize must be boolean');
        if(initialize){call('rnd','init_isaac64',BigInt(seed),Number(core));call('rnd','init_isaac64',BigInt(displaySeed),Number(display));}
        states.set('rnd',state);return {core,display,state};
    }
    function configuredRecord(name,layout,fields,pointer) {
        const description={size:layout,fields:{}};
        for(const [key,item] of Object.entries(fields))description.fields[key]=item.kind==='array'
            ?{offset:item.offset,array:'Int32',size:item.size,length:item.size/4}
            :{offset:item.offset,type:item.kind==='pointer'?'ptr':item.kind==='ulong'?'BigUint64':item.kind==='long'?'BigInt64':'Int'+item.size*8};
        transport.defineRecord(name,description);return transport.record(name,pointer);
    }
    function enableSys(layout) {
        if(!services.gc)throw new Error('Enable DECL before SYS');
        const at=allocateGlobal('sysopt',layout.size),env=Object.assign(Object.create(services),layout.constants,layout.strings);
        env.LL_NONE=BigInt(layout.constants.LL_NONE);env.sysopt=configuredRecord('sysopt',layout.size,layout.fields,at);
        env.dupstr=v=>base.libc.strdup(typeof v==='string'?services.literal(v):v);
        env.getenv=name=>base.services.nh_getenv(name);env.sysPanic=()=>{throw new CPanic('Invalid sysopt configuration');};
        register('sys',sys,env);states.set('sys',env.sysopt);return env.sysopt;
    }
    function enableTrack(layouts) {
        const layout=layouts.track;
        if(!services.u||typeof services.sfo_int!=='function'||typeof services.distmin!=='function')throw new Error('Enable DECL, HACKLIB and serialization before TRACK');
        const at=allocateGlobal('track.state',layout.size),state={utcntAddress:at+layout.utcnt,utpntAddress:at+layout.utpnt};
        for(const key of ['utcnt','utpnt'])Object.defineProperty(state,key,{get:()=>transport.read('Int32',at+layout[key]),set:v=>transport.write('Int32',at+layout[key],v)});
        state.utrack=new Proxy({address:at+layout.utrack},{get(o,key){
            if(typeof key!=='string'||!/^\d+$/.test(key))return Reflect.get(o,key);
            const index=Number(key);if(index>layout.UTSZ)throw new RangeError('Track pointer bounds');
            const pointer=o.address+index*layout.coordSize,out={address:pointer,index};
            for(const field of ['x','y'])Object.defineProperty(out,field,{get:()=>transport.read('Int16',pointer+layout[field]),set:v=>transport.write('Int16',pointer+layout[field],v)});
            return out;
        }});
        const env=Object.create(services),mode=file=>transport.read('Int32',address(file)+layouts.sfbase.nhf_mode);
        Object.assign(env,{trackState:state,CoordSize:layout.coordSize,RIN_STEALTH:layout.RIN_STEALTH,
            update_file:file=>mode(file)&(layout.COUNTING|layout.WRITING),release_data:file=>mode(file)&layout.FREEING,
            trackPanic:()=>{throw new CPanic('rest_track: impossible pt counts');},
            Sfo_int:(...args)=>services.sfo_int(...args),Sfi_int:(...args)=>services.sfi_int(...args),
            Sfo_nhcoord:(...args)=>services.sfo_nhcoord(...args),Sfi_nhcoord:(...args)=>services.sfi_nhcoord(...args)});
        for(const key of ['uleft','uright'])Object.defineProperty(env,key,{get(){const pointer=services[key];return pointer?{otyp:ctypes.getField('struct obj',pointer,'otyp','short')}:0;}});
        register('track',track,env,{prepareArgs:(fn,args)=>['gettrack','hastrack'].includes(fn)?args.map(transport.coordxy):args});states.set('track',state);return state;
    }
    function enableCommandGeometry(){register('cmd-geometry',{isok:nativeGeometryFor(environment).isok});}
    function enableDependencies() {
        const runtime=createLibraryBindings({regex:true,regexDialect:'sdk'});
        for(const name of ['tgetent','tgetflag','tgetnum','tgetstr','tparm','tgoto','tputs','regcomp','regexec','regerror','regfree','compressFile'])services[name]=(...args)=>runtime[name](services,...args);
        services.tgetent=(_buffer,name)=>runtime.tgetent(services,name);
        return runtime;
    }
    const environment={...base,services,transport,functions,bitfields,ctypes,diagnostics,register,extend,deferFunctions,start,call,functionPointer,allocateGlobal,requireGlobal,linkGlobal,enableRect,enableHacklib,enableDecl,enableDrawing,enableObjects,enableMonst,enableStdio,enableRnd,enableSys,enableTrack,enableCommandGeometry,enableDependencies,
        // Reuse the public native-width boundary for standalone allocation callers.
        alloc:(name,...args)=>(name==='alloc'||name==='re_alloc')?resolve(name)(...args):base.alloc(name,...args),
        setEnvironment:(name,value)=>{inputs.setEnvironment(name,value);if(value===null||value===undefined)delete ENV[name];else ENV[name]=String(value);},
        captureFiles:baseline=>captureGameFiles(base.filesystem,baseline,shouldPersistGameFile),
        restoreFiles:state=>restoreGameFiles(base.filesystem,state),
        fileBaseline:()=>filesUnder(base.filesystem,'/nethack'),
        enableAddressPort:(name,options)=>{const adapter=enableAddressPort(environment,name,options);addressAdapters.set(name,adapter);return adapter;},
        exposeAddressPort:(name,names)=>{const adapter=addressAdapters.get(name);if(!adapter)throw new Error('Address adapter not enabled: '+name);return adapter.expose(names);},
        enableSpecialInteractions:(layouts,options)=>enableSpecialInteractions(environment,layouts,options),
        enableObjectState:layouts=>enableObjectState(environment,layouts),
        enableObjectRecords:layouts=>enableObjectRecords(environment,layouts),
        enableItemInventory:layouts=>itemInventory=enableItemInventory(environment,layouts),
        enableItemNaming:layouts=>{if(!itemInventory)throw new Error('Item naming requires item inventory');return enableItemNaming(environment,layouts,itemInventory);},
        enableTimers:layouts=>enableTimers(environment,layouts),
        enableMonsterSelection:layouts=>monsterSelection=enableMonsterSelection(environment,layouts),
        enableMonsterCreation:layouts=>{if(!monsterSelection)throw new Error('Monster creation requires species selection');return monsterCreation=enableMonsterCreation(environment,layouts,monsterSelection);},
        enableMonsterInventory:layouts=>{if(!monsterCreation)throw new Error('Monster inventory requires monster creation');return enableMonsterInventory(environment,layouts,monsterCreation);},
        enableWorldPosition:layouts=>{if(!monsterCreation)throw new Error('World positioning requires monster creation');return enableWorldPosition(environment,layouts,monsterCreation);},
        enableWindowSystem:layouts=>enableWindowSystem(environment,layouts),enableVersionInfo:layouts=>enableVersionInfo(environment,layouts),enableOptions:layouts=>enableOptions(environment,layouts),enableStatus:layouts=>enableStatus(environment,layouts),enableGameWindows:layouts=>enableGameWindows(environment,layouts),enableMovement:layouts=>enableMovement(environment,layouts),enableConfiguration:layouts=>enableConfiguration(environment,layouts),enableFiles:layouts=>enableFiles(environment,layouts),enableCommands:layouts=>enableCommands(environment,layouts),enableGlyphs:layouts=>enableGlyphs(environment,layouts),enableSymbols:layouts=>enableSymbols(environment,layouts),enablePets:layouts=>enablePets(environment,layouts),enableMonsterMovement:layouts=>enableMonsterMovement(environment,layouts),enableMonsterLifecycle:layouts=>enableMonsterLifecycle(environment,layouts),
        enableLevelContents:layouts=>{if(!monsterCreation)throw new Error('Level contents requires monster services');return enableLevelContents(environment,layouts,monsterCreation);},
        enableLevelStartup:layouts=>{if(!monsterCreation)throw new Error('Level startup requires monster services');return enableLevelStartup(environment,layouts,monsterCreation);},
        enableDisplayStartup:layouts=>{if(!monsterCreation)throw new Error('Display startup requires monster services');return enableDisplayStartup(environment,layouts,monsterCreation);},
        enableHeroStartup:layouts=>{if(!monsterCreation||!itemInventory)throw new Error('Hero startup requires monster/inventory services');return heroStartup=enableHeroStartup(environment,layouts,monsterCreation,itemInventory);},
        enableHeroEquipment:layouts=>{if(!heroStartup)throw new Error('Equipment requires hero startup');return enableHeroEquipment(environment,layouts,heroStartup);},
        enableQuestPager:layouts=>enableQuestPager(environment,layouts),
        enableDoLifecycle:layouts=>enableDoLifecycle(environment,layouts),
        enableTerminalInput:(layouts,options)=>enableTerminalInput(environment,layouts,options),
        enableSaveLifecycle:layouts=>enableSaveLifecycle(environment,layouts),
        enableRestoreLifecycle:layouts=>enableRestoreLifecycle(environment,layouts),
        enableKillerState:layouts=>enableKillerState(environment,layouts),
        enableEndLifecycle:layouts=>enableEndLifecycle(environment,layouts),
        enablePotion:layouts=>enablePotion(environment,layouts),
        enableZap:(layouts,options)=>enableZap(environment,layouts,options),
        enableZapPublic:layouts=>enableZapPublic(environment,layouts),
        enablePolyself:layouts=>enablePolyself(environment,layouts),
        enableWere:layouts=>were??=enableWere(environment,layouts),
        enableDogmove:layouts=>dogmove??=enableDogmove(environment,layouts),
        enableMhitu:layouts=>enableMhitu(environment,layouts),
        enableMhitm:layouts=>mhitm??=enableMhitm(environment,layouts),
        enableColorAttributes:layouts=>enableColorAttributes(environment,layouts),
        enableVault:layouts=>vault??=enableVault(environment,layouts),
        enableUhitm:layouts=>enableUhitm(environment,layouts),
        enableMthrowu:layouts=>enableMthrowu(environment,layouts),
        enableMcastu:layouts=>enableMcastu(environment,layouts),
        enableRead:layouts=>enableRead(environment,layouts),
        enableSpell:layouts=>enableSpell(environment,layouts),
        enableExplode:layouts=>enableExplode(environment,layouts),
        enableDig:layouts=>enableDig(environment,layouts),
        enableWizard:layouts=>enableWizard(environment,layouts),
        enableMplayer:layouts=>enableMplayer(environment,layouts),
        enableMinion:layouts=>enableMinion(environment,layouts),
        enableGetpos:layouts=>enableGetpos(environment,layouts),
        enableMondata:layouts=>enableMondata(environment,layouts),
        enableSteal:layouts=>enableSteal(environment,layouts),
        enableDokick:layouts=>enableDokick(environment,layouts),
        enableLight:layouts=>enableLight(environment,layouts),
        enableDetect:layouts=>enableDetect(environment,layouts),
        enableRegion:layouts=>enableRegion(environment,layouts),
        enableBall:layouts=>enableBall(environment,layouts),
        enableDbridge:layouts=>enableDbridge(environment,layouts),
        enableDoName:layouts=>enableDoName(environment,layouts),
        enableEngrave:layouts=>enableEngrave(environment,layouts),
        enableDiscoveries:layouts=>enableDiscoveries(environment,layouts),
        enableSdkBoundary:options=>enableSdkBoundary(environment,options),
        enableWizcmds:layouts=>enableWizcmds(environment,layouts),
        enableRip:layouts=>enableRip(environment,layouts),
        enableShknam:layouts=>enableShknam(environment,layouts),
        enableInsight:layouts=>enableInsight(environment,layouts),
        enableTopten:layouts=>enableTopten(environment,layouts),
        enablePriest:layouts=>enablePriest(environment,layouts),
        enableQuest:layouts=>quest??=enableQuest(environment,layouts),
        enableLock:layouts=>enableLock(environment,layouts),
        enableApply:layouts=>enableApply(environment,layouts),
        enableLevelPersistence:layouts=>enableLevelPersistence(environment,layouts),
        enableWorms:layouts=>enableWorms(environment,layouts),
        enableReport:layouts=>enableReport(environment,layouts),
        enableUnixPlatform:layouts=>enableUnixPlatform(environment,layouts),
        enableTerminalMessages:layouts=>enableTerminalMessages(environment,layouts),
        enableMessages:layouts=>enableMessages(environment,layouts),
        enableRuntimeInfo:layouts=>enableRuntimeInfo(environment,layouts),
        enableTurnLoop:layouts=>{const context=states.get('game-startup-context');if(!context)throw new Error('Turn loop requires game startup');return enableTurnLoop(environment,layouts,{environment:context});},
        enableGameStartup:layouts=>{if(!monsterCreation)throw new Error('Game startup requires monster services');const startup=enableGameStartup(environment,layouts,monsterCreation);states.set('game-startup-context',startup.environment);return startup;},
        enableSerialization:layouts=>enableSerialization(environment,layouts),
        enableTerminal:(layout,options)=>enableTerminal(environment,layout,options),
        enableLua:options=>createStandaloneLua(environment,options),
        enableLuaSandbox:layouts=>enableLuaSandbox(environment,layouts),
        state:name=>states.get(name),hasFunction:linker.hasFunction,
        resolve,
        status:linker.status,startModule:linker.start,
        record:transport.record,array:transport.array,address};
    register('runtime-string-helpers',{__isspace:c=>services.isspace(c),Strlen_:(value,caller,line)=>base.strutil('Strlen_',typeof value==='string'?services.literal(value):address(value),typeof caller==='string'?services.literal(caller):address(caller),transport.int(line))});
    register('runtime-public-allocation',{
        alloc:n=>base.alloc('alloc',transport.uint(n)),
        re_alloc:(p,n)=>base.alloc('re_alloc',address(p),transport.uint(n)),
        fmt_ptr:p=>base.alloc('fmt_ptr',p?.address??p??0),
        FITSint_:(n,file,line)=>base.alloc('FITSint_',transport.long(n),typeof file==='string'?services.literal(file):address(file),transport.int(line)),
        FITSuint_:(n,file,line)=>base.alloc('FITSuint_',transport.ulong(n),typeof file==='string'?services.literal(file):address(file),transport.int(line)),
    });
    register('runtime-public-string-buffers',{
        strbuf_init:p=>base.strutil('strbuf_init',base.strbuf(address(p))),
        strbuf_append:(p,text)=>base.strutil('strbuf_append',base.strbuf(address(p)),typeof text==='string'?services.literal(text):address(text)),
        strbuf_reserve:(p,n)=>base.strutil('strbuf_reserve',base.strbuf(address(p)),transport.int(n)),
        strbuf_empty:p=>base.strutil('strbuf_empty',base.strbuf(address(p))),
        strbuf_nl_to_crlf:p=>base.strutil('strbuf_nl_to_crlf',base.strbuf(address(p))),
    });
    register('runtime-public-calendar',Object.fromEntries(['phase_of_the_moon','friday_13th'].map(name=>[name,()=>base.calendar(name)])));
    nativeStateFor(environment).nativeArena=new NativeTypedState(memory);
    createNativeRecordViews(environment);
    return environment;
}
