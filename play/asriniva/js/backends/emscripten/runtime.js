import {callFiles} from '../../nethack/bindings/files.js';



import {callHack} from '../../nethack/bindings/hack.js';
import {callUhitm} from '../../nethack/bindings/uhitm.js';
import {callMon,monState} from '../../nethack/bindings/mon.js';
import {callPickup} from '../../nethack/bindings/pickup.js';
import {callShk} from '../../nethack/bindings/shk.js';



import * as spLevNamespace from '../../ported/sp_lev.js';
import {callSpLev,initializeSpLev} from '../../nethack/bindings/sp_lev.js';
import {callTrap} from '../../nethack/bindings/trap.js';
import {callTermcap} from '../../nethack/bindings/termcap.js';
import {callTopl} from '../../nethack/bindings/topl.js';
import {callWintty,initializeWintty} from '../../nethack/bindings/wintty.js';



import {callUnixunix} from '../../nethack/bindings/unixunix.js';
import {callUnixmain} from '../../nethack/bindings/unixmain.js';
import {callOptions} from '../../nethack/bindings/options.js';
import {callBotl} from '../../nethack/bindings/botl.js';
import {callZap,initializeZap,zapState} from '../../nethack/bindings/zap.js';

import {callDisplay,initializeDisplay} from '../../nethack/bindings/display.js';
import {callInvent} from '../../nethack/bindings/invent.js';
import * as cmd from '../../ported/cmd.js';
import {callCmd,initializeCmd} from '../../nethack/bindings/cmd.js';
import {callNhlua} from '../../nethack/bindings/nhlua.js';
import {callMkobj} from '../../ported/mkobj-dispatch.js';
import {callEat,initializeEat} from '../../nethack/bindings/eat.js';
import {callObjnam,objnamState} from '../../nethack/bindings/objnam.js';
import {callApply} from '../../nethack/bindings/apply.js';
import {callRead} from '../../nethack/bindings/read.js';
import {callInsight,initializeInsight} from '../../nethack/bindings/insight.js';
import {callMakemon} from '../../nethack/bindings/makemon.js';
import { callMhitu } from '../../nethack/bindings/mhitu.js';
import {callArtifact} from '../../nethack/bindings/artifact.js';
import {initializeDecl,callDecl} from '../../nethack/bindings/decl.js';
import * as pray from '../../ported/pray.js';
import {createPrayEnvironment} from '../../nethack/bindings/pray.js';
import {callDothrow} from '../../nethack/bindings/dothrow.js';
import {createPagerBridge} from '../../nethack/bindings/pager.js';
import * as muse from '../../ported/muse.js';
import {createMuseEnvironment} from '../../nethack/bindings/muse.js';
import {callDungeon} from '../../nethack/bindings/dungeon.js';
import {callTimeout} from '../../nethack/bindings/timeout.js';
import {callSpell} from '../../nethack/bindings/spell.js';
import * as detect from '../../ported/detect.js';
import {createDetectEnvironment} from '../../nethack/bindings/detect.js';
import {createTeleportBridge} from '../../nethack/bindings/teleport.js';
import {callMklev} from '../../nethack/bindings/mklev.js';
import {callPolyself} from '../../nethack/bindings/polyself.js';
import {callWizcmds} from '../../nethack/bindings/wizcmds.js';
import {callEnd} from '../../nethack/bindings/end.js';
import {callMkmaze} from '../../nethack/bindings/mkmaze.js';
import {callDokick} from '../../nethack/bindings/dokick.js';
import {callDig} from '../../nethack/bindings/dig.js';
import {callMonmove} from '../../nethack/bindings/monmove.js';
import {callPotion} from '../../nethack/bindings/potion.js';
import {callVision,initializeVision} from '../../nethack/bindings/vision.js';
import {callDo} from '../../nethack/bindings/do.js';
import {callDoWear} from '../../nethack/bindings/do_wear.js';
import {callRestore} from '../../nethack/bindings/restore.js';
import {callNhlobj} from '../../nethack/bindings/nhlobj.js';
import {callDoName,initializeDoName} from '../../nethack/bindings/do_name.js';
import {callWindows} from '../../nethack/bindings/windows.js';
import * as cfgfiles from '../../ported/cfgfiles.js';
import {createCfgfilesEnvironment} from '../../nethack/bindings/cfgfiles.js';
import * as topten from '../../ported/topten.js';
import {createToptenEnvironment} from '../../nethack/bindings/topten.js';
import * as dogmove from '../../ported/dogmove.js';
import {createDogmoveEnvironment} from '../../nethack/bindings/dogmove.js';
import {createGlyphsBridge} from '../../nethack/bindings/glyphs.js';
import {callEngrave} from '../../nethack/bindings/engrave.js';
import {initializeRole,callRole} from '../../nethack/bindings/role.js';
import {callMthrowu} from '../../nethack/bindings/mthrowu.js';
import {callMhitm} from '../../nethack/bindings/mhitm.js';
import * as getpos from '../../ported/getpos.js';
import {createGetposEnvironment} from '../../nethack/bindings/getpos.js';
import {createAllmainBridge} from '../../nethack/bindings/allmain.js';
import * as save from '../../ported/save.js';
import {createSaveEnvironment} from '../../nethack/bindings/save.js';
import {callSounds} from '../../nethack/bindings/sounds.js';
import * as vault from '../../ported/vault.js';
import {createVaultEnvironment} from '../../nethack/bindings/vault.js';
import {createUInitBridge} from '../../nethack/bindings/u_init.js';
import {callWeapon} from '../../nethack/bindings/weapon.js';
import {callRegion} from '../../nethack/bindings/region.js';
import {callDog} from '../../nethack/bindings/dog.js';
import * as sfbase from '../../ported/sfbase.js';
import {createOptimizedSfbaseEnvironment} from '../../nethack/bindings/sfbase.js';
import * as attrib from '../../ported/attrib.js';
import {createAttribEnvironment} from '../../nethack/bindings/attrib.js';
import {createPlineBridge} from '../../nethack/bindings/pline.js';
import {callMail} from '../../nethack/bindings/mail.js';
import {callQuestpgr} from '../../nethack/bindings/questpgr.js';
import {callSymbols} from '../../nethack/bindings/symbols.js';
import * as bones from '../../ported/bones.js';
import {createBonesEnvironment} from '../../nethack/bindings/bones.js';
import * as explode from '../../ported/explode.js';
import {createExplodeEnvironment} from '../../nethack/bindings/explode.js';
import {initializeEarlyarg,callEarlyarg} from '../../nethack/bindings/earlyarg.js';
import {createReportBridge} from '../../nethack/bindings/report.js';
import {callMkroom} from '../../nethack/bindings/mkroom.js';
import {callSfstruct} from '../../nethack/bindings/sfstruct.js';
// Temporary ABI bridge while the remaining translation units are C/Wasm.
import * as isaac64 from '../../isaac64.js';
import * as nhmd4 from '../../ported/nhmd4.js';
import * as strutil from '../../ported/strutil.js';
import * as rect from '../../ported/rect.js';
import * as track from '../../ported/track.js';
import * as calendar from '../../ported/calendar.js';
import * as nhlsel from '../../ported/nhlsel.js';
import { createNhlselEnvironment } from '../../nethack/bindings/nhlsel.js';
import { cAddress, writeNativePointer } from '../../platform/darwin/compat.js';
import { createRegexAbi } from '../../c-runtime/regex-abi.js';
import { nativeQsort } from '../../platform/darwin/qsort.js';
import { createNativeTerminal } from '../../platform/darwin/terminal.js';
import * as stairs from '../../ported/stairs.js';
import * as sys from '../../ported/sys.js';
import * as rip from '../../ported/rip.js';
import * as date from '../../ported/date.js';
import { initializeDate } from '../../nethack/bindings/date.js';
import * as alloc from '../../ported/alloc.js';
import * as utf8map from '../../ported/utf8map.js';
import * as drawing from '../../ported/drawing.js';
import * as posixregex from '../../ported/posixregex.js';
import * as rnd from '../../ported/rnd.js';
import * as ioctl from '../../ported/ioctl.js';
import * as unixtty from '../../ported/unixtty.js';
import * as were from '../../ported/were.js';
import * as extralev from '../../ported/extralev.js';
import * as mplayer from '../../ported/mplayer.js';
import * as exper from '../../ported/exper.js';
import * as mkmap from '../../ported/mkmap.js';
import * as getline from '../../ported/getline.js';
import * as write from '../../ported/write.js';
import * as mdlib from '../../ported/mdlib.js';
import * as quest from '../../ported/quest.js';
import * as minion from '../../ported/minion.js';
import * as iactions from '../../ported/iactions.js';
import * as selvar from '../../ported/selvar.js';
import * as steal from '../../ported/steal.js';
import * as sit from '../../ported/sit.js';
import * as fountain from '../../ported/fountain.js';
import * as objects from '../../ported/objects.js';
import * as monst from '../../ported/monst.js';
import * as shknam from '../../ported/shknam.js';
import * as rumors from '../../ported/rumors.js';
import * as music from '../../ported/music.js';
import * as version from '../../ported/version.js';
import * as coloratt from '../../ported/coloratt.js';
import * as priest from '../../ported/priest.js';
import { createPriestEnvironment } from '../../nethack/bindings/priest.js';
import * as light from '../../ported/light.js';
import { createLightEnvironment } from '../../nethack/bindings/light.js';
import * as lock from '../../ported/lock.js';
import { withLockEnvironment } from '../../nethack/bindings/lock.js';
import * as wield from '../../ported/wield.js';
import { createWieldEnvironment } from '../../nethack/bindings/wield.js';
import * as worn from '../../ported/worn.js';
import { createWornEnvironment } from '../../nethack/bindings/worn.js';
import * as hacklib from '../../ported/hacklib.js';
import { createHacklibState, createHacklibEnvironment } from '../../nethack/bindings/hacklib.js';
import * as mondata from '../../ported/mondata.js';
import { createMondataEnvironment } from '../../nethack/bindings/mondata.js';
import * as dbridge from '../../ported/dbridge.js';
import { createDbridgeEnvironment } from '../../nethack/bindings/dbridge.js';
import * as mcastu from '../../ported/mcastu.js';
import { createMcastuEnvironment } from '../../nethack/bindings/mcastu.js';
import * as ball from '../../ported/ball.js';
import { createBallState, createBallEnvironment } from '../../nethack/bindings/ball.js';
import * as o_init from '../../ported/o_init.js';
import { createOInitEnvironment } from '../../nethack/bindings/o_init.js';
import * as worm from '../../ported/worm.js';
import { createWormState, withWormEnvironment } from '../../nethack/bindings/worm.js';
import * as wizard from '../../ported/wizard.js';
import { createWizardEnvironment } from '../../nethack/bindings/wizard.js';
import * as steed from '../../ported/steed.js';
import { callSteed } from '../../nethack/bindings/steed.js';
import { createColorattState, createColorattEnvironment } from '../../nethack/bindings/coloratt.js';
import { createVersionState, createVersionEnvironment } from '../../nethack/bindings/version.js';
import { createMusicState, createMusicEnvironment } from '../../nethack/bindings/music.js';
import { createRumorsState, createRumorsEnvironment } from '../../nethack/bindings/rumors.js';
import { createShknamState, createShknamEnvironment } from '../../nethack/bindings/shknam.js';
import { createMonstState, createMonstEnvironment } from '../../nethack/bindings/monst.js';
import { createObjectsState, createObjectsEnvironment } from '../../nethack/bindings/objects.js';
import { createFountainEnvironment } from '../../nethack/bindings/fountain.js';
import { createSitEnvironment } from '../../nethack/bindings/sit.js';
import { createStealEnvironment } from '../../nethack/bindings/steal.js';
import { createSelvarState, withSelvarEnvironment } from '../../nethack/bindings/selvar.js';
import { createIactionsEnvironment } from '../../nethack/bindings/iactions.js';
import { createMinionEnvironment } from '../../nethack/bindings/minion.js';
import { withQuestEnvironment } from '../../nethack/bindings/quest.js';
import { createMdlibState, createMdlibEnvironment } from '../../nethack/bindings/mdlib.js';
import { createWriteEnvironment } from '../../nethack/bindings/write.js';
import { createGetlineState, createGetlineEnvironment } from '../../nethack/bindings/getline.js';
import { createMkmapEnvironment } from '../../nethack/bindings/mkmap.js';
import { createExperEnvironment } from '../../nethack/bindings/exper.js';
import { createMplayerEnvironment } from '../../nethack/bindings/mplayer.js';
import { createExtralevEnvironment } from '../../nethack/bindings/extralev.js';
import { createWereEnvironment } from '../../nethack/bindings/were.js';
import { createUnixttyState, createUnixttyEnvironment } from '../../nethack/bindings/unixtty.js';
import { createIoctlEnvironment } from '../../nethack/bindings/ioctl.js';
import { createRndState, createRndEnvironment } from '../../nethack/bindings/rnd.js';
import { createPosixregexEnvironment, initializePosixregex } from '../../nethack/bindings/posixregex.js';
import { initializeDrawing } from '../../nethack/bindings/drawing.js';
import { createUtf8Environment } from '../../nethack/bindings/utf8.js';
import { withCEnvironment } from '../../c-runtime/context.js';

function isaac64Context(heap, pointer, layout) {
    const view = new DataView(heap.buffer);
    const context = {
        r: new BigUint64Array(heap.buffer, pointer + layout.r, 256),
        m: new BigUint64Array(heap.buffer, pointer + layout.m, 256),
    };
    Object.defineProperty(context, 'n', {
        get: () => view.getUint32(pointer + layout.n, true),
        set: value => view.setUint32(pointer + layout.n, value, true),
    });
    for (const field of ['a', 'b', 'c']) {
        Object.defineProperty(context, field, {
            get: () => view.getBigUint64(pointer + layout[field], true),
            set: value => view.setBigUint64(pointer + layout[field], value, true),
        });
    }
    return context;
}

function nhmd4Context(heap, pointer, layout) {
    const view = new DataView(heap.buffer);
    const context = {
        buffer: heap.subarray(pointer + layout.buffer, pointer + layout.buffer + 64),
        block: new Uint32Array(heap.buffer, pointer + layout.block, 16),
        clear: () => heap.fill(0, pointer, pointer + layout.size),
    };
    for (const field of ['lo', 'hi', 'a', 'b', 'c', 'd']) {
        Object.defineProperty(context, field, {
            get: () => view.getUint32(pointer + layout[field], true),
            set: value => view.setUint32(pointer + layout[field], value, true),
        });
    }
    return context;
}

function rectView(services, pointer, layout) {
    const result = {};
    Object.defineProperty(result, 'address', { value: pointer });
    for (const field of ['lx', 'ly', 'hx', 'hy']) {
        Object.defineProperty(result, field, {
            enumerable: true,
            get: () => new DataView(services.heap().buffer)['getInt' + layout.coordSize * 8](pointer + layout[field], true),
            set: value => new DataView(services.heap().buffer)['setInt' + layout.coordSize * 8](pointer + layout[field], value, true),
        });
    }
    return result;
}

function rectArray(services, pointer, layout) {
    if (!pointer) return 0;
    return new Proxy({ address: pointer }, {
        get(target, key) {
            if (typeof key === 'string' && /^\d+$/.test(key)) return rectView(services, pointer + Number(key) * layout.size, layout);
            return Reflect.get(target, key);
        },
        set(target, key, value) {
            if (typeof key === 'string' && /^\d+$/.test(key)) {
                // C struct assignment copies all source fields before any stores.
                Object.assign(rectView(services, pointer + Number(key) * layout.size, layout), { ...value });
                return true;
            }
            return Reflect.set(target, key, value);
        },
    });
}

function localRect(layout, value) {
    // The C automatic struct has coordxy fields, including truncation on store.
    const heap = new Uint8Array(layout.size);
    return Object.assign(rectView({ heap: () => heap }, 0, layout), value);
}

function signedFields(services, pointer, fields, width) {
    const result = {};
    Object.defineProperty(result, 'address', { value: pointer });
    for (const [field, offset] of Object.entries(fields)) {
        Object.defineProperty(result, field, {
            enumerable: true,
            get: () => new DataView(services.heap().buffer)['getInt' + width * 8](pointer + offset, true),
            set: value => new DataView(services.heap().buffer)['setInt' + width * 8](pointer + offset, value, true),
        });
    }
    return result;
}

function trackContext(services, pointer, layout) {
    const result = signedFields(services, pointer, { utcnt: layout.utcnt, utpnt: layout.utpnt }, layout.intSize);
    result.utcntAddress = pointer + layout.utcnt;
    result.utpntAddress = pointer + layout.utpnt;
    const array = pointer + layout.utrack;
    result.utrack = new Proxy({ address: array }, {
        get(target, key) {
            if (typeof key === 'string' && /^\d+$/.test(key)) {
                const index = Number(key);
                const view = signedFields(services, array + index * layout.coordSize,
                    { x: layout.x, y: layout.y }, layout.coordxySize);
                Object.defineProperty(view, 'index', { value: index });
                return view;
            }
            return Reflect.get(target, key);
        },
    });
    return result;
}

// Descriptor widths and offsets come from Clang, including conditional fields.
function configuredFields(services, pointer, fields, intSize) {
    const result = {};
    for (const [name, field] of Object.entries(fields)) {
        Object.defineProperty(result, name, {
            enumerable: true,
            get() {
                const buffer = services.heap().buffer;
                const address = pointer + field.offset;
                if (field.kind === 'array') return new Int32Array(buffer, address, field.size / intSize);
                const view = new DataView(buffer);
                if (field.kind === 'pointer') return Number(view.getBigUint64(address, true));
                if (field.kind === 'ulong') return view.getBigUint64(address, true);
                return view[field.kind === 'long' ? 'getBigInt64' : 'getInt' + field.size * 8](address, true);
            },
            set(value) {
                const view = new DataView(services.heap().buffer);
                const address = pointer + field.offset;
                if (field.kind === 'pointer' || field.kind === 'ulong') view.setBigUint64(address, BigInt(value), true);
                else if (field.kind === 'long') view.setBigInt64(address, BigInt(value), true);
                else view['setInt' + field.size * 8](address, value, true);
            },
        });
    }
    return result;
}

export function createPortedRuntime(layouts) {
    const hackLayout=layouts.hack&&Object.freeze({...layouts.hack});
    const selvarLayout=layouts.selvar&&Object.freeze({...layouts.selvar});
    const wormLayout=layouts.worm&&Object.freeze({...layouts.worm});
    const prayEnvironments = new WeakMap();
    const museEnvironments = new WeakMap();
    const pagerBridge = layouts.pager ? createPagerBridge(layouts.pager) : undefined;
    const detectEnvironments = new WeakMap();
    const teleportBridge = createTeleportBridge(layouts.teleport);
    const cfgfilesEnvironments = new WeakMap();
    const toptenEnvironments = new WeakMap();
    const dogmoveEnvironments = new WeakMap();
    const dogmoveArgumentTypes = {droppables:['monst'],cursed_object_at:['int','int'],dog_nutrition:['monst','obj'],dog_eat:['monst','obj','int','int','int'],dog_starve:['monst'],dog_hunger:['monst','edog'],dog_invent:['monst','edog','int'],dog_goal:['monst','edog','int','int','int'],find_targ:['monst','int','int','int'],find_friends:['monst','monst','int'],score_targ:['monst','monst'],best_target:['monst','int'],pet_ranged_attk:['monst','int'],dog_move:['monst','int'],could_reach_item:['monst','int','int'],can_reach_location:['monst','int','int','int','int'],wantdoor:['int','int','int'],finish_meating:['monst'],mnum_leashable:['int'],quickmimic:['monst']};
    const callGlyphs = layouts.glyphs ? createGlyphsBridge(layouts.glyphs) : undefined;
    const getposEnvironments = new WeakMap();
    const callAllmain = layouts.allmain ? createAllmainBridge(layouts.allmain) : undefined;
    const saveEnvironments = new WeakMap();
    const saveArgumentTypes = {
        dosave:[], dosave0:[], save_gamelog:['nh_file'], savegamestate:['nh_file'],
        tricked_fileremoved:['nh_file','pointer'], savestateinlock:[],
        savelev:['nh_file','int'], savelev_core:['nh_file','int'],
        save_adjust_levelflags:[], savelevl:['nh_file'], save_bubbles:['nh_file','int'],
        savecemetery:['nh_file','cell:cemetery'], savedamage:['nh_file'],
        save_stairs:['nh_file'], save_bc:['nh_file'], saveobj:['nh_file','obj'],
        saveobjchn:['nh_file','cell:obj'], savemon:['nh_file','monst'],
        savemonchn:['nh_file','monst'], savetrapchn:['nh_file','trap'],
        savefruitchn:['nh_file'], savelevchn:['nh_file'], store_plname_in_file:['nh_file'],
        save_msghistory:['nh_file'], free_dungeons:[], freedynamicdata:[]
    };
    const vaultEnvironments = new WeakMap();
    const callUInit = layouts.u_init ? createUInitBridge(layouts.u_init) : undefined;
    const sfbaseEnvironments = new WeakMap();
    const attribEnvironments = new WeakMap();
    const bonesEnvironments = new WeakMap();
    const explodeEnvironments = new WeakMap();
    const callPline = layouts.pline ? createPlineBridge(layouts.pline) : undefined;
    const reportBridge = layouts.report ? createReportBridge(layouts.report) : undefined;
    const nhlselEnvironments = new WeakMap();
    const nativeTerminal = createNativeTerminal();
    const nativeRegexServices = createRegexAbi();
    const objectsStates = new WeakMap();
    const monstStates = new WeakMap();
    const shknamStates = new WeakMap();
    const rumorsStates = new WeakMap();
    const musicStates = new WeakMap();
    const versionStates = new WeakMap();
    const colorattStates = new WeakMap();
    const mondataEnvironments = new WeakMap();
    const dbridgeEnvironments = new WeakMap();
    const hacklibEnvironments = new WeakMap();
    const hacklibStates = new WeakMap();
    const hacklibState = services => {
        if (!hacklibStates.has(services.moduleKey))
            hacklibStates.set(services.moduleKey, createHacklibState(services, layouts.hacklib, hacklib));
        return hacklibStates.get(services.moduleKey);
    };
    const ballStates = new WeakMap();
    const ballState = services => {
        if (!ballStates.has(services.moduleKey))
            ballStates.set(services.moduleKey, createBallState(services, layouts.ball));
        return ballStates.get(services.moduleKey);
    };
    const wormStates = new WeakMap();
    const wormState = services => {
        if (!wormStates.has(services.moduleKey))
            wormStates.set(services.moduleKey, createWormState(services, wormLayout));
        return wormStates.get(services.moduleKey);
    };
    const getlineState = createGetlineState();
    let mdlibState;
    const selvarState = createSelvarState();
    const unixttyState = createUnixttyState();
    const rectState = { rect: 0, n_rects: 0, rect_cnt: 0 };
    let trackState;
    let drawingInitialized = false;
    let dateInitialized = false;
    let rndState, rndEnvironment;
    const posixregexInitialized = new WeakSet();
    const allocState = { ptrbufidx: 0 };
    const dateState = { nomakedefs_populated: 0 };
    // New views on every ABI call: WebAssembly memory.grow detaches old views.
    // These pure ISAAC routines cannot grow Wasm memory while a call is running.
    const context = (heap, pointer) => isaac64Context(heap, pointer, layouts.isaac64);
    const seed = (heap, pointer, length) => heap.subarray(pointer,
        pointer + Math.max(0, Math.min(length, 2048)));
    const stringCall = (services, name, ...args) => {
        const environment = Object.create(services);
        Object.defineProperties(environment, {
            HEAPU8: { get: () => services.heap() },
            HEAP8: { get: () => services.signedHeap() },
            LARGEST_INT: { value: layouts.strutil.largestInt },
        });
        return withCEnvironment(environment, strutil[name], ...args);
    };
    const stringBuffer = (services, pointer) => {
        const layout = layouts.strutil;
        const context = { buf: pointer + layout.buf, bufSize: layout.bufSize };
        Object.defineProperties(context, {
            len: {
                get: () => new DataView(services.heap().buffer).getInt32(pointer + layout.len, true),
                set: value => new DataView(services.heap().buffer).setInt32(pointer + layout.len, value, true),
            },
            str: {
                get: () => Number(new DataView(services.heap().buffer).getBigUint64(pointer + layout.str, true)),
                set: value => new DataView(services.heap().buffer).setBigUint64(pointer + layout.str, BigInt(value), true),
            },
        });
        return context;
    };
    return {
        nhlsel(services,name,...args) {
            let environment=nhlselEnvironments.get(services.moduleKey);
            if(!environment){environment=createNhlselEnvironment(services,layouts.nhlsel,nhlsel);nhlselEnvironments.set(services.moduleKey,environment);}
            if(name==='l_selection_push_copy')args[1]=environment.selection(args[1]);
            if(name==='params_sel_2coords'){
                const view=()=>new DataView(services.heap().buffer);
                args=args.map((p,i)=>{
                    if(!i)return p;
                    const at=Number(p);
                    return {get value(){return i===1?environment.selection(Number(view().getBigUint64(at,true))):view().getInt16(at,true);},set value(v){if(i===1)view().setBigUint64(at,BigInt(v?.address??v??0),true);else view().setInt16(at,Number(v),true);}};
                });
            }
            const result=withCEnvironment(environment,nhlsel[name],...args);
            return name==='l_selection_check'||name==='l_selection_push_new'?result?.address??0:result;
        },
        nativeQsort(services,base,count,size) { return nativeQsort(services.heap,base,count,size,services.compare); },
        nativeTerminal(services,name,...args) {return nativeTerminal(services,name,...args);},
        nativeRegex(services,name,...args) {return nativeRegexServices(services)[name](...args);},
        initializeDate(services) {
            if (dateInitialized) throw new Error('Version metadata already initialized');
            initializeDate(services, layouts.date, date.nomakedefs_initial);
            dateInitialized = true;
        },
        explode(services, name, ...args) {
            let environment = explodeEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createExplodeEnvironment(services, layouts.explode);
                explodeEnvironments.set(services.moduleKey, environment);
            }
            if (name === 'explosionmask') args[0] = environment.monster(args[0]);
            if (name === 'scatter') args[4] = environment.object(args[4]);
            if (name === 'explode_oil') args[0] = environment.object(args[0]);
            if (name === 'mon_explodes') {
                args[0] = environment.monster(args[0]); args[1] = environment.attack(args[1]);
            }
            const result = withCEnvironment(environment, explode[name], ...args);
            return result?.address ?? result ?? 0;
        },
        bones(services,name,...args) {
            let environment = bonesEnvironments.get(services.moduleKey);
            if (!environment) {
                environment=createBonesEnvironment(services,layouts.bones,bones);
                bonesEnvironments.set(services.moduleKey,environment);
            }
            const parameters={
                no_bones_level:['level'],goodfruit:['int'],resetobjs:['object','boolean'],
                sanitize_name:['pointer'],give_to_nearby_mon:['object','coordxy','coordxy'],
                drop_upon_death:['monster','object','coordxy','coordxy'],fixuporacle:['monster'],
                can_make_bones:[],remove_mon_from_bones:['monster'],savebones:['int','long','object'],
                getbones:[],bones_include_name:['pointer'],set_ghostly_objlist:['object'],
                fix_ghostly_obj:['object'],newebones:['monster'],free_ebones:['monster'],
            };
            const saved=services.stackSave();
            try {
                const converted=args.map((value,index)=>{
                    const kind=parameters[name][index];
                    return ['object','monster','level'].includes(kind)?environment[kind](value)
                        :kind==='long'?BigInt.asIntN(64,BigInt(value)):Number(value);
                });
                const result=withCEnvironment(environment,bones[name],...converted);
                return typeof result==='boolean'?Number(result):result?.address??result??0;
            } finally { services.stackRestore(saved); }
        },
        initializeEarlyarg(services) {return initializeEarlyarg(services,layouts.earlyarg);},
        earlyarg(services,name,...args) {return callEarlyarg(services,layouts.earlyarg,name,...args);},
        report(services,name,...args) {
            if (!reportBridge) throw new Error('Missing REPORT layout');
            return reportBridge(services,name,...args);
        },
        vault(services, name, ...args) {
            let environment = vaultEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createVaultEnvironment(services, layouts.vault);
                vaultEnvironments.set(services.moduleKey, environment);
            }
            if (['newegd', 'free_egd', 'clear_fcorr', 'restfakecorr',
                 'parkguard', 'grddead', 'in_fcorridor', 'uleftvault',
                 'find_guard_dest', 'wallify_vault', 'gd_mv_monaway',
                 'gd_pick_corridor_gold', 'gd_move_cleanup', 'gd_letknow',
                 'gd_move'].includes(name))
                args[0] = environment.monster(args[0]);
            if (name === 'move_gold') args[0] = environment.object(args[0]);
            if (name === 'vault_occupied') args[0] = environment.address(args[0]);
            if (name === 'find_guard_dest') {
                args[1] = environment.coordPointer(args[1]);
                args[2] = environment.coordPointer(args[2]);
            }
            const result = withCEnvironment(environment, vault[name], ...args);
            return result?.address ?? result ?? 0;
        },
        u_init(services,name,...args) {
            if (!callUInit) throw new Error('Missing U_INIT layout');
            return callUInit(services,name,...args);
        },
        save(services,name,...args) {
            let environment = saveEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createSaveEnvironment(services, layouts.save);
                saveEnvironments.set(services.moduleKey, environment);
            }
            const saved = services.stackSave();
            try {
                const converted = args.map((value, i) => {
                    const type = saveArgumentTypes[name][i];
                    if (type?.startsWith('cell:')) return environment.pointerCell(type.slice(5), value);
                    if (type === 'int' || type === 'pointer') return Number(value);
                    return environment.view(type, value);
                });
                return withCEnvironment(environment, save[name], ...converted);
            } finally { services.stackRestore(saved); }
        },
        mhitm(services,name,...args) {return callMhitm(services,layouts.mhitm,name,...args);},
        allmain(services,name,...args) {
            if (!callAllmain) throw new Error('Missing ALLMAIN layout');
            return callAllmain(services,name,...args);
        },
        getpos(services, name, ...args) {
            let environment = getposEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createGetposEnvironment(services, layouts.getpos, getpos);
                getposEnvironments.set(services.moduleKey, environment);
            }
            if (['getpos', 'getpos_menu'].includes(name))
                args[0] = environment.coord(args[0]);
            if (name === 'getpos_getvalids_selection')
                args[0] = environment.selection(args[0]);
            if (name === 'gather_locs') {
                args[0] = environment.coordArrayPointer(args[0]);
                args[1] = environment.intPointer(args[1]);
            }
            if (name === 'truncate_to_map') {
                args[0] = environment.coordPointer(args[0]);
                args[1] = environment.coordPointer(args[1]);
            }
            const result = withCEnvironment(environment, getpos[name], ...args);
            return result?.address ?? result ?? 0;
        },
        callMthrowu(services,name,...args) {return callMthrowu(services,layouts.mthrowu,name,...args);},
        initializeRole(services) {return initializeRole(services,layouts.role);},
        role(services,name,...args) {return callRole(services,layouts.role,name,...args);},
        polyself(services,name,...args) {return callPolyself(services,layouts.polyself,name,...args);},
        wizcmds(services,name,...args) {return callWizcmds(services,layouts.wizcmds,name,...args);},
        spell(services,name,...args) {return callSpell(services,layouts.spell,name,...args);},
        timeout(services,name,...args){return callTimeout(services,layouts.timeout,name,...args);},
        makemon(services,name,...args) {return callMakemon(services,layouts.makemon,name,...args);},
        mhitu(services,name,...args) { return callMhitu(services, layouts.mhitu, name, ...args); } ,
        artifact(services,name,...args) {return callArtifact(services,layouts.artifact,name,...args);},
        // NHLUA initializes its private source data lazily after validating native ABI metadata.
        nhlua(services,name,...args) {return callNhlua(services,name,...args);},
        initializeDecl(services) { return initializeDecl(services, layouts.decl); },
        decl(services,name,...args) { return callDecl(services, layouts.decl, name, ...args); },
        read(services,name,...args) {return callRead(services,layouts.read,name,...args);},
        apply(services,name,...args) {return callApply(services,layouts.apply,name,...args);},
        initializeEat(services){return initializeEat(services,layouts.eat);},
        eat(services,name,...args){return callEat(services,layouts.eat,name,...args);},
        objnam(services,name,...args){return callObjnam(services,layouts.objnam,name,...args);},
        objnamState(services){return objnamState(services);},
        mkobj(services,name,...args){return callMkobj(services,layouts.mkobj,name,...args);},
        initializeInsight(services){return initializeInsight(services,layouts.insight);},
        insight(services,name,...args){return callInsight(services,layouts.insight,name,...args);},
        end(services,name,...args) {return callEnd(services,layouts.end,name,...args);},
        callVision(services,name,...args) {return callVision(services,layouts.vision,name,...args);},
        initializeVision(services) {return initializeVision(services,layouts.vision);},
        callDo(services,name,...args) {return callDo(services,layouts.do,name,...args);},
        callDoWear(services,name,...args) {return callDoWear(services,layouts.do_wear,name,...args);},
        callRestore(services,name,...args) {return callRestore(services,layouts.restore,name,...args);},
        nhlobj(services,name,...args) {return callNhlobj(services,layouts.nhlobj,name,...args);},
        initializeDoName(services) {return initializeDoName(services);},
        do_name(services,name,...args) {return callDoName(services,layouts.do_name,name,...args);},
        engrave(services,name,...args) {return callEngrave(services,layouts.engrave,name,...args);},
        glyphs(services,name,...args) {
            if (!callGlyphs) throw new Error('Missing GLYPHS layout');
            return callGlyphs(services,name,...args);
        },
        topten(services, name, ...args) {
            let environment = toptenEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createToptenEnvironment(services, layouts.topten);
                toptenEnvironments.set(services.moduleKey, environment);
            }
            if (name === 'formatkiller') args[0] = environment.address(args[0]);
            if (name === 'observable_depth') args[0] = environment.level(args[0]);
            if (['readentry', 'writeentry', 'writexlentry'].includes(name)) {
                args[0] = environment.address(args[0]);
                args[1] = environment.entry(args[1]);
            }
            if (name === 'discardexcess') args[0] = environment.address(args[0]);
            if (name === 'free_ttlist') args[0] = environment.entry(args[0]);
            if (['encode_extended_achievements', 'encode_extended_conducts',
                 'add_achieveX'].includes(name))
                args[0] = environment.address(args[0]);
            if (name === 'outentry') args[1] = environment.entry(args[1]);
            if (name === 'score_wanted') {
                args[2] = environment.entry(args[2]);
                args[4] = environment.stringArray(args[4]);
            }
            if (name === 'prscore') args[1] = environment.stringArray(args[1]);
            if (name === 'tt_oname') args[0] = environment.object(args[0]);
            if (name === 'tt_doppel') args[0] = environment.monster(args[0]);
            const result = withCEnvironment(environment, topten[name], ...args);
            return result?.address ?? result ?? 0;
        },
        windows(services,name,...args) {
            if (!layouts.windows) throw new Error('Missing WINDOWS layout');
            return callWindows(services,layouts.windows,name,...args);
        },
        cfgfiles(services,name,...args) {
            if (!layouts.cfgfiles) throw new Error('Missing CFGFILES layout');
            let env = cfgfilesEnvironments.get(services.moduleKey);
            if (!env) {
                env = createCfgfilesEnvironment(services,layouts.cfgfiles,cfgfiles);
                cfgfilesEnvironments.set(services.moduleKey,env);
            }
            const saved = services.stackSave(), va = env.vaList;
            try {
                if (name === 'config_error_add') env.vaList = env.ptr(args[1]);
                const result = withCEnvironment(env,cfgfiles[name],...args.map(env.ptr));
                return ['get_configfile','get_default_configfile','fopen_config_file',
                    'choose_random_part','is_config_section','find_optparam'].includes(name)
                    ? BigInt(result ?? 0) : result;
            } finally {
                env.vaList = va;
                services.stackRestore(saved);
            }
        },
        cfgfilesPrivate(module,index) {
            const env = cfgfilesEnvironments.get(module);
            if (!env) throw new Error('CFGFILES observation before initialization');
            return index >= 100 ? env.disregarded_config_lines[index-100]
                : [env.ignore_errors_on_unmatched,env.ignore_statement_errors,
                    env.configfile,env.default_configfile,env.config_error_data,env.config_error_msg][index];
        },
        mkmaze(services,name,...args) {return callMkmaze(services,name,...args);},
        dokick(services,name,...args) {
            if (!layouts.dokick) throw new Error('Missing DOKICK layout');
            return callDokick(services,layouts.dokick,name,...args);
        },
        potion(services,name,...args) {
            if (!layouts.potion) throw new Error('Missing POTION layout');
            return callPotion(services,layouts.potion,name,...args);
        },
        monmove(services,name,...args) {
            if (!layouts.monmove) throw new Error('Missing MONMOVE layout');
            return callMonmove(services,layouts.monmove,name,...args);
        },
        dig(services,name,...args) {
            if (!layouts.dig) throw new Error('Missing DIG layout');
            return callDig(services,layouts.dig,name,...args);
        },
        detect(services,name,...args) {
            if (!layouts.detect) throw new Error('Missing DETECT layout');
            let env = detectEnvironments.get(services.moduleKey);
            if (!env) {env = createDetectEnvironment(services,layouts.detect,detect);detectEnvironments.set(services.moduleKey,env);}
            const frame = services.stackSave();
            try {
                const result = withCEnvironment(env,detect[name],...args.map(env.ptr));
                return ['o_in','o_material','level_distance'].includes(name) ? BigInt(result ?? 0) : result;
            } finally {services.stackRestore(frame);}
        },
        teleport(services,name,...args) {return teleportBridge(services,name,...args);},
        pray(services,name,...args) {
            if (!layouts.pray) throw new Error('Missing PRAY layout');
            let env=prayEnvironments.get(services.moduleKey);
            if (!env) {env=createPrayEnvironment(services,layouts.pray,pray);prayEnvironments.set(services.moduleKey,env);}
            const frame=services.stackSave();
            try {
                const result=withCEnvironment(env,pray[name],...args.map(env.ptr));
                return ['worst_cursed_item','a_gname','a_gname_at','u_gname','align_gname','halu_gname','align_gtitle'].includes(name) ? BigInt(result ?? 0) : result;
            } finally {services.stackRestore(frame);}
        },
        muse(services,name,...args) {
            if (!layouts.muse) throw new Error('Missing MUSE layout');
            let env=museEnvironments.get(services.moduleKey);
            if (!env) {env=createMuseEnvironment(services,layouts.muse,muse);museEnvironments.set(services.moduleKey,env);}
            const frame=services.stackSave();
            try {
                const result=withCEnvironment(env,muse[name],...args.map(env.ptr));
                return name === 'muse_newcham_mon' ? BigInt(result ?? 0) : result;
            } finally {services.stackRestore(frame);}
        },
        dungeon(services,name,...args) {return callDungeon(services,name,...args);},
        dothrow(services,name,...args) {return callDothrow(services,name,...args);},
        pager(services,name,...args) {
            if (!pagerBridge) throw new Error('Missing PAGER layout');
            return pagerBridge(services,name,...args);
        },
        files(services,name,...args) {return callFiles(services,name,...args);},



        hack(services,name,...args) {return callHack(services,hackLayout,name,...args);},
        uhitm(services,name,...args) {return callUhitm(services,layouts.uhitm,name,...args);},
        mon(services,name,...args) {return callMon(services,layouts.mon,name,...args);},
        monState(services) {return monState(services,layouts.mon);},
        pickup(services,name,...args) {return callPickup(services,name,...args);},
        shk(services,name,...args) {return callShk(services,name,...args);},



        sp_lev(services,name,...args) {return callSpLev(services,layouts.sp_lev,spLevNamespace,name,...args);},
        initializeSpLev(services) {return initializeSpLev(services,layouts.sp_lev,spLevNamespace);},
        trap(services,name,...args) {return callTrap(services,name,...args);},
        termcap(services,name,...args) {return callTermcap(services,layouts.termcap,name,...args);},
        topl(services,name,...args) {return callTopl(services,layouts.topl,name,...args);},
        wintty(services,name,...args) {return callWintty(services,layouts.wintty,name,...args);},
        initializeWintty(services) {return initializeWintty(services,layouts.wintty);},


// Inside the existing runtime object. Owned dispatchers cast original formals.
unixunix(services,name,...args) {return callUnixunix(services,name,...args);},
unixmain(services,name,...args) {return callUnixmain(services,name,...args);},
callOptions(services,name,...args) {return callOptions(services,layouts.options,name,...args);},
callBotl(services,name,...args) {return callBotl(services,layouts.botl,name,...args);},
zap(services,name,...args) {return callZap(services,layouts.zap,name,...args);},
initializeZap(services) {return initializeZap(services,layouts.zap);},
zapState(services) {return zapState(services);},
// No UNIX initialization hooks. No eager OPTIONS allopt_array_init/do_init.
// BOTL library startup calls callBotl(services,"initialize"); no extra method.

        display(services,name,...args) {return callDisplay(services,name,...args);},
        initializeDisplay(services) {return initializeDisplay(services);},
        invent(services,name,...args) {return callInvent(services,name,...args);},
        cmd(services,name,...args) {return callCmd(services,layouts.cmd,cmd,name,...args);},
        initializeCmd(services) {return initializeCmd(services,layouts.cmd,cmd);},
        mklev(services,name,...args) {return callMklev(services,name,...args);},
        dogmove(services,name,...args) {
            let environment = dogmoveEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createDogmoveEnvironment(services, layouts.dogmove, dogmove);
                dogmoveEnvironments.set(services.moduleKey, environment);
            }
            const saved = services.stackSave();
            try {
                const converted = args.map((value, i) => dogmoveArgumentTypes[name][i] === 'int'
                    ? Number(value) : environment.view(dogmoveArgumentTypes[name][i], value));
                const result = withCEnvironment(environment, dogmove[name], ...converted);
                return ['droppables','find_targ','best_target'].includes(name) ? result?.address ?? 0 : result;
            } finally { services.stackRestore(saved); }
        },
        sounds(services,name,...args) {return callSounds(services,layouts.sounds,name,...args);},
        weapon(services,name,...args) {return callWeapon(services,layouts.weapon,name,...args);},
        callRegion(services,name,...args) {return callRegion(services,layouts.region,name,...args);},
        dog(services,name,...args) {return callDog(services,layouts.dog,name,...args);},
        sfbase(services,name,...args) {
            let environment = sfbaseEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createOptimizedSfbaseEnvironment(services,layouts.sfbase);
                sfbaseEnvironments.set(services.moduleKey,environment);
            }
            const saved = services.stackSave();
            try {
                const rawSize = name === 'sf_log' ? args[2] : null;
                args = args.map(value => typeof value === 'bigint' ? Number(value) : value);
                if (name.startsWith('sfo_') || name.startsWith('sfi_') || name === 'sf_log')
                    args[0] = environment.nhfile(args[0]);
                if (name === 'sfo_version_info' || name === 'sfi_version_info')
                    args[1] = environment.version(args[1]);
                if (name === 'sf_log') args[2] = BigInt.asUintN(64,rawSize);
                return withCEnvironment(environment,sfbase[name],...args);
            } finally { services.stackRestore(saved); }
        },
        initializeAttrib(services) {
            let environment = attribEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createAttribEnvironment(services, layouts.attrib, attrib);
                attribEnvironments.set(services.moduleKey, environment);
            }
            return environment;
        },
        attrib(services, name, ...args) {
            let environment = attribEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createAttribEnvironment(services, layouts.attrib, attrib);
                attribEnvironments.set(services.moduleKey, environment);
            }
            if (name === 'gainstr') args[0] = environment.object(args[0]);
            if (['postadjabil', 'check_innate_abil', 'innately'].includes(name))
                args[0] = environment.longPointer(args[0]);
            const result = withCEnvironment(environment, attrib[name], ...args);
            return result?.address ?? result ?? 0;
        },
        pline(services,name,...args) {
            if (!callPline) throw new Error('Missing PLINE layout');
            return callPline(services,name,...args);
        },
        mail(services,name,...args) {return callMail(services,layouts.mail,name,...args);},
        questpgr(services,name,...args) {return callQuestpgr(services,layouts.questpgr,name,...args);},
        callSymbols(services,name,...args) {return callSymbols(services,layouts.symbols,name,...args);},
        mkroom(services,name,...args) {return callMkroom(services,layouts.mkroom,name,...args);},
        callSfstruct(services,name,...args) {return callSfstruct(services,layouts.sfstruct,name,...args);},
        wield(services, name, ...args) {
            const environment = createWieldEnvironment(services, layouts.wield, wield);
            if (['setuwep', 'cant_wield_corpse', 'ready_weapon', 'setuqwep',
                'setuswapwep', 'ready_ok', 'wield_ok', 'finish_splitting',
                'wield_tool', 'chwepon', 'welded', 'weldmsg', 'mwelded'].includes(name))
                args[0] = environment.object(args[0]);
            if (name === 'set_twoweap') args[0] = Number(args[0]) << 24 >> 24;
            const result = withCEnvironment(environment, wield[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        worn(services, name, ...args) {
            const environment = createWornEnvironment(services, layouts.worn, worn);
            if (['setworn', 'setnotworn', 'wearslot', 'bypass_obj', 'bypass_objlist',
                'nxt_unbypassed_obj', 'clear_bypass'].includes(name))
                args[0] = environment.object(args[0]);
            if (['mon_set_minvis', 'mon_adjust_speed', 'update_mon_extrinsics',
                'find_mac', 'm_dowear', 'which_armor', 'mon_break_armor',
                'racial_exception', 'extract_from_minvent', 'm_lose_armor',
                'm_dowear_type', 'extra_pref'].includes(name))
                args[0] = environment.monster(args[0]);
            if (['update_mon_extrinsics', 'racial_exception', 'extract_from_minvent',
                'm_lose_armor', 'extra_pref'].includes(name))
                args[1] = environment.object(args[1]);
            if (name === 'mon_adjust_speed') args[2] = environment.object(args[2]);
            if (name === 'nxt_unbypassed_loot') {
                args[0] = environment.loot(args[0]); args[1] = environment.object(args[1]);
            }
            const result = withCEnvironment(environment, worn[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        hacklibState,
        hacklib(services, name, ...args) {
            let environment = hacklibEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createHacklibEnvironment(services, layouts.hacklib, hacklib, hacklibState(services));
                hacklibEnvironments.set(services.moduleKey, environment);
            }
            const result = withCEnvironment(environment, hacklib[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        mondata(services, name, ...args) {
            let environment = mondataEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createMondataEnvironment(services, layouts.mondata, mondata);
                mondataEnvironments.set(services.moduleKey, environment);
            }
            if (['attacktype_fordmg', 'attacktype', 'noattacks', 'poly_when_stoned',
                'ranged_attk', 'mstrength', 'mstrength_ranged_attk', 'hates_silver',
                'hates_blessings', 'passes_bars', 'can_track', 'sliparm', 'breakarm',
                'sticks', 'cantvomit', 'num_horns', 'dmgtype_fromattack', 'dmgtype',
                'locomotion', 'stagger', 'on_fire', 'msummon_environ', 'olfaction',
                'same_race'].includes(name)) args[0] = environment.permonst(args[0]);
            if (['defended', 'Resists_Elem', 'resists_drli', 'resists_magm', 'resists_blnd',
                'resists_blnd_by_arti', 'mon_hates_silver', 'mon_hates_blessings',
                'mon_hates_light', 'can_blow', 'can_chant', 'can_be_strangled', 'gender',
                'pronoun_gender', 'levl_follower', 'raceptr', 'give_u_to_m_resistances',
                'resist_conflict', 'mon_knows_traps', 'mon_learns_traps', 'set_mon_data',
                'max_passive_dmg', 'can_blnd'].includes(name)) args[0] = environment.monster(args[0]);
            if (['set_mon_data', 'same_race'].includes(name)) args[1] = environment.permonst(args[1]);
            if (['max_passive_dmg', 'can_blnd'].includes(name)) args[1] = environment.monster(args[1]);
            if (name === 'can_blnd') args[3] = environment.object(args[3]);
            if (name === 'on_fire') args[1] = environment.attack(args[1]);
            if (name === 'mons_see_trap') args[0] = environment.trap(args[0]);
            if (['name_to_mon', 'name_to_monclass'].includes(name)) args[1] = environment.intPointer(args[1]);
            if (name === 'name_to_monplus') {
                args[1] = environment.charPointerPointer(args[1]); args[2] = environment.intPointer(args[2]);
            }
            if (name === 'msummon_environ') args[1] = environment.charPointerPointer(args[1]);
            const result = withCEnvironment(environment, mondata[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        dbridge(services, name, ...args) {
            let environment = dbridgeEnvironments.get(services.moduleKey);
            if (!environment) {
                environment = createDbridgeEnvironment(services, layouts.dbridge);
                dbridgeEnvironments.set(services.moduleKey, environment);
            }
            if (['find_drawbridge', 'get_wall_for_db'].includes(name)) {
                args[0] = environment.coordPointer(args[0]); args[1] = environment.coordPointer(args[1]);
            }
            if (['u_to_e', 'e_nam', 'E_phrase', 'e_survives_at', 'e_died', 'automiss',
                'e_missed', 'e_jumps', 'do_entity'].includes(name)) args[0] = environment.entity(args[0]);
            if (name === 'm_to_e') {
                args[0] = environment.monster(args[0]); args[3] = environment.entity(args[3]);
            }
            if (name === 'set_entity') args[2] = environment.entity(args[2]);
            const result = withCEnvironment(environment, dbridge[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        mcastu(services, name, ...args) {
            const environment = createMcastuEnvironment(services, layouts.mcastu, mcastu);
            if (['castmu', 'touch_of_death', 'buzzmu', 'cursetxt', 'choose_monster_spell',
                'm_cure_self', 'mcast_death_touch', 'mcast_clone_wiz', 'mcast_summon_mons',
                'mcast_weaken_you', 'mcast_disappear', 'mcast_fire_pillar', 'mcast_lightning',
                'mcast_insects', 'mcast_paralyze', 'mcast_confuse_you', 'mcast_spell',
                'spell_would_be_useless'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'death_inflicted_by') args[2] = environment.monster(args[2]);
            if (['castmu', 'buzzmu'].includes(name)) args[1] = environment.attack(args[1]);
            const result = withCEnvironment(environment, mcastu[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        ballState,
        ball(services, name, ...args) {
            const environment = createBallEnvironment(services, layouts.ball, ballState(services));
            if (name === 'drag_ball') {
                args[2] = environment.intPointer(args[2]);
                for (let i = 3; i <= 6; i++) args[i] = environment.coordPointer(args[i]);
                args[7] = environment.booleanPointer(args[7]);
            }
            const result = withCEnvironment(environment, ball[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        o_init(services, name, ...args) {
            const environment = createOInitEnvironment(services, layouts.o_init, o_init);
            if (name === 'setgemprobs') args[0] = environment.level(args[0]);
            if (['objdescr_is', 'observe_object'].includes(name)) args[0] = environment.object(args[0]);
            if (['savenames', 'restnames'].includes(name)) args[0] = environment.nhfile(args[0]);
            if (name === 'obj_shuffle_range') {
                args[1] = environment.intPointer(args[1]); args[2] = environment.intPointer(args[2]);
            }
            if (name === 'disco_output_sorted') args[1] = environment.pointerArray(args[1]);
            const result = withCEnvironment(environment, o_init[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        wormState,
        worm(services, name, ...args) {
            return withWormEnvironment(services,wormLayout,wormState(services),environment=>{

            if (['initworm', 'worm_move', 'worm_nomove', 'wormgone', 'wormhitu',
                'cutworm', 'see_wsegs', 'detect_wsegs', 'place_wsegs', 'sanity_check_worm',
                'remove_worm', 'place_worm_tail_randomly', 'size_wseg', 'count_wsegs',
                'worm_known', 'wseg_at', 'flip_worm_segs_vertical', 'flip_worm_segs_horizontal',
                'redraw_worm'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'place_wsegs') args[1] = environment.monster(args[1]);
            if (name === 'toss_wsegs') args[0] = environment.segment(args[0]);
            if (['save_worm', 'rest_worm'].includes(name)) args[0] = environment.nhfile(args[0]);
            const result = withCEnvironment(environment, worm[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
            });
        },
        wizard(services, name, ...args) {
            const environment = createWizardEnvironment(services, layouts.wizard, wizard);
            if (['mon_has_amulet', 'mon_has_special', 'mon_has_arti', 'other_mon_has_arti', 'strategy', 'tactics', 'has_aggravatables', 'nasty', 'cuss'].includes(name))
                args[0] = environment.monster(args[0]);
            if (name === 'target_on') {
                args[0] = environment.int(args[0]); args[1] = environment.monster(args[1]);
            }
            if (name === 'on_ground') args[0] = environment.short(args[0]);
            if (['which_arti', 'you_have', 'pick_nasty'].includes(name)) args[0] = environment.int(args[0]);
            if (name === 'choose_stairs') {
                args[0] = environment.coordPointer(args[0]); args[1] = environment.coordPointer(args[1]);
                args[2] = environment.boolean(args[2]);
            }
            const result = withCEnvironment(environment, wizard[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        steed(services, name, ...args) {
            return callSteed(services, layouts.steed, steed, name, ...args);
        },
        lock(services, name, ...args) {
            return withLockEnvironment(services, layouts.lock, lock, (environment, activeServices) => {
            if (name === 'picking_lock') {
                args[0] = environment.coordPointer(args[0]); args[1] = environment.coordPointer(args[1]);
            }
            if (['breakchestlock', 'maybe_reset_pick', 'pick_lock', 'doorlock', 'chest_shatter_msg'].includes(name))
                args[0] = environment.object(args[0]);
            if (name === 'pick_lock') args[3] = environment.object(args[3]);
            if (name === 'boxlock') {
                args[0] = environment.object(args[0]); args[1] = environment.object(args[1]);
            }
            const result = withCEnvironment(environment, lock[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
            });
        },
        light(services, name, ...args) {
            const environment = createLightEnvironment(services, layouts.light);
            environment.fmt_ptr = value => {
                const out = services.fmt_ptr(value);
                writeNativePointer(services.heap(), out, value);
                return out;
            };
            if (['new_light_source', 'new_light_core'].includes(name)) args[4] = environment.anything(args[4]);
            if (name === 'del_light_source') args[1] = environment.anything(args[1]);
            if (name === 'delete_ls') args[0] = environment.lightSource(args[0]);
            if (name === 'do_light_sources') args[0] = environment.seenRows(args[0]);
            if (['show_transient_light', 'obj_sheds_light', 'obj_is_burning',
                'obj_adjust_light_radius', 'candle_light_range', 'arti_light_radius',
                'arti_light_description'].includes(name)) args[0] = environment.object(args[0]);
            if (['obj_move_light_source', 'obj_split_light_source', 'obj_merge_light_sources'].includes(name)) {
                args[0] = environment.object(args[0]); args[1] = environment.object(args[1]);
            }
            if (name === 'whereis_mon') args[0] = environment.monster(args[0]);
            if (['save_light_sources', 'restore_light_sources', 'write_ls', 'maybe_write_ls'].includes(name))
                args[0] = environment.nhfile(args[0]);
            if (name === 'write_ls') args[1] = environment.lightSource(args[1]);
            if (name === 'light_stats') {
                args[2] = environment.longPointer(args[2]); args[3] = environment.longPointer(args[3]);
            }
            const result = withCEnvironment(environment, light[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        priest(services, name, ...args) {
            const environment = createPriestEnvironment(services, layouts.priest);
            if (['newepri', 'free_epri', 'move_special', 'histemple_at', 'inhistemple',
                'pri_move', 'mon_aligntyp', 'priestname', 'p_coaligned', 'has_shrine',
                'forget_temple_entry', 'priest_talk', 'reset_hostility',
                'in_your_sanctuary', 'ghod_hitsu', 'restpriest'].includes(name))
                args[0] = environment.monster(args[0]);
            if (name === 'priestini') {
                args[0] = environment.level(args[0]);
                args[1] = environment.room(args[1]);
            }
            if (name === 'mk_roamer') args[0] = environment.permonst(args[0]);
            const result = withCEnvironment(environment, priest[name], ...args);
            return result?.address ?? result ?? 0;
        },
        initializeColoratt(services) {
            if (!colorattStates.has(services.moduleKey))
                colorattStates.set(services.moduleKey, createColorattState(services, layouts.coloratt, coloratt));
        },
        coloratt(services, name, ...args) {
            if (!colorattStates.has(services.moduleKey))
                colorattStates.set(services.moduleKey, createColorattState(services, layouts.coloratt, coloratt));
            const environment = createColorattEnvironment(services, layouts.coloratt, colorattStates.get(services.moduleKey));
            if (['color_attr_to_str', 'color_attr_parse_str', 'query_color_attr'].includes(name)) args[0] = environment.colorAttr(args[0]);
            if (name === 'colortable_to_int32') args[0] = environment.colorEntry(args[0]);
            if (['attr2attrname', 'clr2colorname', 'free_one_menu_coloring', 'wc_color_name', 'get_nhcolor_from_256_index'].includes(name)) args[0] = environment.int(args[0]);
            if (['query_attr', 'query_color'].includes(name)) args[1] = environment.int(args[1]);
            if (['match_str2clr', 'match_str2attr'].includes(name)) args[1] = environment.boolean(args[1]);
            if (name === 'basic_menu_colors') args[0] = environment.boolean(args[0]);
            if (name === 'add_menu_coloring_parsed') {
                args[1] = environment.int(args[1]); args[2] = environment.int(args[2]);
            }
            if (name === 'set_map_customcolor') {
                args[0] = environment.glyphMap(args[0]); args[1] = environment.uint(args[1]);
            }
            if (name === 'color_distance') args = args.map(environment.uint);
            if (name === 'closest_color') {
                args[0] = environment.uint(args[0]);
                args[1] = environment.uint32Pointer(args[1]); args[2] = environment.uint16Pointer(args[2]);
            }
            const result = withCEnvironment(environment, coloratt[name], ...args);
            return result?.address ?? result ?? 0;
        },
        initializeVersion(services) {
            if (!versionStates.has(services.moduleKey))
                versionStates.set(services.moduleKey, createVersionState(services, layouts.version, version));
        },
        version(services, name, ...args) {
            if (!versionStates.has(services.moduleKey))
                versionStates.set(services.moduleKey, createVersionState(services, layouts.version, version));
            const environment = createVersionEnvironment(services, layouts.version, versionStates.get(services.moduleKey));

            if (['version_string', 'getversionstring', 'status_version'].includes(name)) args[1] = environment.size_t(args[1]);
            if (name === 'status_version') args[2] = environment.boolean(args[2]);
            if (name === 'early_version_info') args[0] = environment.boolean(args[0]);
            if (name === 'check_version') {
                args[0] = environment.versionInfo(args[0]); args[2] = environment.boolean(args[2]);
                args[3] = environment.ulong(args[3]);
            }
            if (name === 'copyright_banner_line') args[0] = environment.int(args[0]);
            if (['store_version', 'store_critical_bytes', 'uptodate', 'compare_critical_bytes', 'validate'].includes(name)) args[0] = environment.nhfile(args[0]);
            if (['uptodate', 'compare_critical_bytes'].includes(name)) args[2] = environment.ulong(args[2]);
            if (name === 'compare_critical_bytes') args[1] = environment.intPointer(args[1]);
            if (name === 'validate') args[2] = environment.boolean(args[2]);
            const result = withCEnvironment(environment, version[name], ...args);
            return result?.address ?? result ?? 0;
        },
        music(services, name, ...args) {
            if (!musicStates.has(services.moduleKey))
                musicStates.set(services.moduleKey, createMusicState(services, layouts.music, music));
            const environment = createMusicEnvironment(services, layouts.music, musicStates.get(services.moduleKey));
            if (['awaken_scare', 'awaken_soldiers'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'awaken_scare') args[1] = environment.boolean(args[1]);
            if (['awaken_monsters', 'put_monsters_to_sleep', 'charm_snakes', 'calm_nymphs', 'charm_monsters', 'do_earthquake'].includes(name)) args[0] = environment.int(args[0]);
            if (name === 'do_pit') {
                args[0] = environment.coordxy(args[0]); args[1] = environment.coordxy(args[1]);
                args[2] = environment.uint(args[2]);
            }
            if (['do_improvisation', 'do_play_instrument', 'obj_to_instr'].includes(name)) args[0] = environment.object(args[0]);
            if (name === 'improvised_notes') args[0] = environment.booleanPointer(args[0]);
            const result = withCEnvironment(environment, music[name], ...args);
            return result?.address ?? result ?? 0;
        },
        rumorsState(services) {
            let state = rumorsStates.get(services.moduleKey);
            if (!state) { state = createRumorsState(); rumorsStates.set(services.moduleKey, state); }
            return state;
        },
        rumors(services, name, ...args) {
            let state = rumorsStates.get(services.moduleKey);
            if (!state) { state = createRumorsState(); rumorsStates.set(services.moduleKey, state); }
            const environment = createRumorsEnvironment(services, layouts.rumors, state);
            if (name === 'doconsult') args[0] = environment.monster(args[0]);
            if (name === 'getrumor') {
                args[0] = environment.int(args[0]); args[2] = environment.boolean(args[2]);
            }
            if (name === 'outrumor') args = args.map(environment.int);
            if (name === 'outoracle') args = args.map(environment.boolean);
            if (name === 'others_check') args[2] = environment.winPointer(args[2]);
            if (name === 'get_rnd_text') {
                args[2] = environment.rng(args[2]); args[3] = environment.uint(args[3]);
            }
            if (name === 'get_rnd_line') {
                args[2] = environment.uint(args[2]); args[3] = environment.rng(args[3]);
                args[4] = environment.long(args[4]); args[5] = environment.long(args[5]);
                args[6] = environment.uint(args[6]);
            }
            const result = withCEnvironment(environment, rumors[name], ...args);
            return result?.address ?? result ?? 0;
        },
        initializeShknam(services) {
            if (!shknamStates.has(services.moduleKey))
                shknamStates.set(services.moduleKey, createShknamState(services, layouts.shknam, shknam));
        },
        shknam(services, name, ...args) {
            if (!shknamStates.has(services.moduleKey))
                shknamStates.set(services.moduleKey, createShknamState(services, layouts.shknam, shknam));
            const environment = createShknamEnvironment(services, layouts.shknam, shknamStates.get(services.moduleKey));
            if (['neweshk', 'free_eshk', 'saleable', 'Shknam', 'shkname', 'shkname_is_pname', 'is_izchak', 'nameshk'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'saleable') args[1] = environment.object(args[1]);
            if (name === 'veggy_item') {
                args[0] = environment.object(args[0]);
                args[1] = environment.int(args[1]);
            }
            if (name === 'stock_room') {
                args[0] = environment.int(args[0]);
                args[1] = environment.room(args[1]);
            }
            if (name === 'get_shop_item') args[0] = environment.int(args[0]);
            if (name === 'is_izchak') args[1] = environment.boolean(args[1]);
            if (name === 'nameshk') args[1] = environment.nameList(args[1]);
            if (['mkshobj_at', 'shkinit'].includes(name)) args[0] = environment.shopClass(args[0]);
            if (name === 'shkinit') args[1] = environment.room(args[1]);
            if (name === 'mkshobj_at') {
                args[1] = environment.int(args[1]); args[2] = environment.int(args[2]);
                args[3] = environment.boolean(args[3]);
            }
            if (name === 'mkveggy_at') args = args.map(environment.int);
            if (name === 'good_shopdoor') {
                args[0] = environment.room(args[0]);
                args[1] = environment.coordPointer(args[1]); args[2] = environment.coordPointer(args[2]);
            }
            if (name === 'stock_room_goodpos') {
                args[0] = environment.room(args[0]);
                for (let i = 1; i < args.length; i++) args[i] = environment.int(args[i]);
            }
            const result = withCEnvironment(environment, shknam[name], ...args);
            return result?.address ?? result ?? 0;
        },
        initializeMonst(services) {
            if (!monstStates.has(services.moduleKey))
                monstStates.set(services.moduleKey, createMonstState(services, layouts.monst, monst));
        },
        monst(services, name, ...args) {
            if (!monstStates.has(services.moduleKey))
                monstStates.set(services.moduleKey, createMonstState(services, layouts.monst, monst));
            const environment = createMonstEnvironment(services, layouts.monst, monstStates.get(services.moduleKey));
            return withCEnvironment(environment, monst[name], ...args) ?? 0;
        },
        objects(services, name, ...args) {
            let state = objectsStates.get(services.moduleKey);
            if (!state) {
                state = createObjectsState(services, layouts.objects, objects);
                objectsStates.set(services.moduleKey, state);
            }
            const environment = createObjectsEnvironment(services, layouts.objects, state);
            return withCEnvironment(environment, objects[name], ...args) ?? 0;
        },
        fountain(services, name, ...args) {
            const environment = createFountainEnvironment(services, layouts.fountain, fountain);
            if (['dipfountain', 'dipsink'].includes(name)) args[0] = environment.object(args[0]);
            if (name === 'watchman_warn_fountain') args[0] = environment.monster(args[0]);
            if (['gush', 'dryup', 'breaksink', 'sink_backs_up'].includes(name)) {
                args[0] = environment.coordxy(args[0]);
                args[1] = environment.coordxy(args[1]);
            }
            if (name === 'gush') args[2] = environment.intPointer(args[2]);
            if (name === 'dryup') args[2] = environment.boolean(args[2]);
            if (name === 'dogushforth') args[0] = environment.int(args[0]);
            return withCEnvironment(environment, fountain[name], ...args) ?? 0;
        },
        sit(services, name, ...args) {
            const environment = createSitEnvironment(services, layouts.sit);
            if (name === 'special_throne_effect') args[0] = args[0] | 0;
            return withCEnvironment(environment, sit[name], ...args) ?? 0;
        },
        steal(services, name, ...args) {
            const environment = createStealEnvironment(services, layouts.steal, steal);
            if (['findgold', 'remove_worn_item'].includes(name)) args[0] = environment.object(args[0]);
            if (['stealgold', 'steal', 'mpickobj', 'stealamulet', 'maybe_absorb_item', 'mdrop_obj', 'mdrop_special_objs', 'relobj', 'worn_item_removal'].includes(name)) args[0] = environment.monster(args[0]);
            if (['mpickobj', 'maybe_absorb_item', 'mdrop_obj', 'worn_item_removal'].includes(name)) args[1] = environment.object(args[1]);
            if (name === 'remove_worn_item') args[1] = Number(args[1]) << 24 >> 24;
            if (['mdrop_obj', 'relobj'].includes(name)) args[2] = Number(args[2]) << 24 >> 24;
            const result = withCEnvironment(environment, steal[name], ...args);
            return result?.address ?? result ?? 0;
        },
        get selvarState() { return selvarState; },
        selvar(services, name, ...args) {
            return withSelvarEnvironment(services,selvarLayout,selvarState,environment=>{
            if (name.startsWith('selection_') && !['selection_new', 'selection_getpoint', 'selection_setpoint', 'selection_do_line', 'selection_do_randline', 'selection_from_mkroom'].includes(name)) args[0] = environment.selection(args[0]);
            if (['selection_getpoint', 'selection_setpoint'].includes(name)) {
                args[0] = environment.coordxy(args[0]); args[1] = environment.coordxy(args[1]);
                args[2] = environment.selection(args[2]);
            }
            if (['selection_do_line', 'selection_do_randline'].includes(name)) {
                for (let i = 0; i < 4; i++) args[i] = environment.coordxy(args[i]);
                if (name === 'selection_do_randline') { args[4] = environment.char(args[4]); args[5] = environment.char(args[5]); }
                const index = name === 'selection_do_line' ? 4 : 6;
                args[index] = environment.selection(args[index]);
            }
            if (name === 'selection_getbounds') args[1] = environment.rect(args[1]);
            if (name === 'selection_rndcoord') { args[1] = environment.coordPointer(args[1]); args[2] = environment.coordPointer(args[2]); args[3] = environment.char(args[3]); }
            if (name === 'selection_free') args[1] = environment.char(args[1]);
            if (name === 'selection_filter_mapchar') args[1] = environment.coordxy(args[1]);
            if (name === 'selection_floodfill') { args[1] = environment.coordxy(args[1]); args[2] = environment.coordxy(args[2]); args[3] = environment.char(args[3]); }
            if (name === 'selection_from_mkroom') args[0] = environment.room(args[0]);
            if (name === 'sel_flood_havepoint') {
                args[0] = environment.coordxy(args[0]); args[1] = environment.coordxy(args[1]);
                args[2] = environment.coordArray(args[2]); args[3] = environment.coordArray(args[3]);
            }
            const result = withCEnvironment(environment, selvar[name], ...args);
            return result?.address ?? result ?? 0;
            });
        },
        iactions(services, name, ...args) {
            const environment = createIactionsEnvironment(services, layouts.iactions);
            if (['itemactions', 'item_naming_classification', 'item_reading_classification', 'itemactions_pushkeys'].includes(name)) args[0] = environment.object(args[0]);
            if (name === 'ia_addmenu') args[2] = environment.char(args[2]);
            return withCEnvironment(environment, iactions[name], ...args);
        },
        minion(services, name, ...args) {
            const environment = createMinionEnvironment(services, layouts.minion, minion);

            if (['newemin', 'free_emin', 'msummon', 'demon_talk', 'bribe', 'lose_guardian_angel'].includes(name)) args[0] = environment.monster(args[0]);
            if (['monster_census', 'dprince', 'dlord', 'ndemon'].includes(name)) args[0] = args[0] << 24 >> 24;
            if (name === 'summon_minion') args = args.map(value => value << 24 >> 24);
            return withCEnvironment(environment, minion[name], ...args);
        },
        quest(services, name, ...args) {
            return withQuestEnvironment(services, layouts.quest, quest, (environment, activeServices) => {
            if (['artitouch', 'finish_quest'].includes(name)) args[0] = environment.object(args[0]);
            if (['leader_speaks', 'quest_chat', 'quest_talk', 'quest_stat_check', 'chat_with_leader', 'prisoner_speaks'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'nemesis_stinks') args = args.map(value => value << 16 >> 16);
            if (['is_pure', 'expulsion'].includes(name)) args[0] = args[0] << 24 >> 24;
            return withCEnvironment(environment, quest[name], ...args);
            });
        },
        get mdlibState() { return mdlibState; },
        mdlib(services, name, ...args) {
            mdlibState ??= createMdlibState(services, layouts.mdlib, mdlib);
            const environment = createMdlibEnvironment(services, layouts.mdlib, mdlibState);
            if (name === 'opt_out_words') args[1] = environment.intPointer(args[1]);
            if (name === 'do_runtime_info') args[0] = environment.intPointer(args[0]);
            return withCEnvironment(environment, mdlib[name], ...args);
        },
        write(services, name, ...args) {
            const environment = createWriteEnvironment(services, layouts.write);
            if (['cost', 'write_ok', 'dowrite'].includes(name)) args[0] = environment.object(args[0]);
            return withCEnvironment(environment, write[name], ...args);
        },
        get getlineState() { return getlineState; },
        getline(services, name, ...args) {
            const environment = createGetlineEnvironment(services, layouts.getline, getlineState);
            if (name === 'hooked_tty_getlin') args[2] = args[2] ? getline.ext_cmd_getlin_hook : 0;
            return withCEnvironment(environment, getline[name], ...args);
        },
        mkmap(services, name, ...args) {
            const environment = createMkmapEnvironment(services, layouts.mkmap);
            if (name === 'mkmap') args[0] = environment.levInit(args[0]);
            return withCEnvironment(environment, mkmap[name], ...args);
        },
        exper(services, name, ...args) {
            const environment = createExperEnvironment(services, layouts.exper);
            if (name === 'experience') args[0] = environment.monster(args[0]);
            if (name === 'pluslvl' || name === 'rndexp') args[0] = args[0] << 24 >> 24;
            return withCEnvironment(environment, exper[name], ...args);
        },
        mplayer(services, name, ...args) {
            const environment = createMplayerEnvironment(services, layouts.mplayer);
            if (['get_mplname', 'mk_mplayer_armor', 'mplayer_talk'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'mk_mplayer') {
                args[0] = environment.permonst(args[0]);
                args[3] = args[3] << 24 >> 24;
            }
            if (name === 'create_mplayers') args[1] = args[1] << 24 >> 24;
            if (name === 'mk_mplayer_armor') args[1] = environment.short(args[1]);
            const result = withCEnvironment(environment, mplayer[name], ...args);
            return result && typeof result === 'object' ? result.address : result;
        },
        extralev(services, name, ...args) {
            const environment = createExtralevEnvironment(services, layouts.extralev);
            return withCEnvironment(environment, extralev[name], ...args);
        },
        were(services, name, ...args) {
            const layout = layouts.were;
            const environment = createWereEnvironment(services, layout);
            const boolean = value => layout.booleanSigned
                ? value << (32 - layout.booleanSize * 8) >> (32 - layout.booleanSize * 8)
                : (value >>> 0) % 2 ** (layout.booleanSize * 8);
            if (name === 'were_change' || name === 'new_were') args[0] = environment.monster(args[0]);
            if (name === 'were_summon') {
                args[0] = environment.permonst(args[0]);
                args[1] = boolean(args[1]);
                args[2] = environment.intPointer(args[2]);
            }
            if (name === 'you_unwere') args[0] = boolean(args[0]);
            return withCEnvironment(environment, were[name], ...args);
        },
        get unixttyState() { return unixttyState; },
        unixtty(services, name, ...args) {
            const environment = createUnixttyEnvironment(services, layouts.unixtty, unixttyState);
            if (name === 'error') args[1] = { nativeVaList: args[1] };
            return withCEnvironment(environment, unixtty[name], ...args);
        },
        ioctl(services, name) {
            const environment = createIoctlEnvironment(services, layouts.ioctl);
            return withCEnvironment(environment, ioctl[name]);
        },
        get rndState() { return rndState; },
        rnd(services, name, ...args) {
            rndState ||= createRndState(services);
            rndEnvironment ||= createRndEnvironment(services, layouts.rnd, rndState);
            if (name === 'shuffle_int_array') args[0] = rndEnvironment.intArray(args[0]);
            return withCEnvironment(rndEnvironment, rnd[name], ...args);
        },
        nativeRegexDiagnostics(moduleKey) {
            return nativeRegexServices.diagnostics(moduleKey);
        },
        initializePosixregex(services) {
            const key=services.moduleKey ?? services;
            if (posixregexInitialized.has(key)) throw new Error('POSIX regex identifier already initialized');
            initializePosixregex(services, layouts.posixregex, posixregex.regex_id);
            posixregexInitialized.add(key);
        },
        posixregex(services, name, ...args) {
            const environment = createPosixregexEnvironment({...services,...nativeRegexServices(services)}, layouts.posixregex);
            if (name === 'regex_compile' || name === 'regex_match') args[1] = environment.regex(args[1]);
            else if (name !== 'regex_init') args[0] = environment.regex(args[0]);
            return withCEnvironment(environment, posixregex[name], ...args);
        },
        initializeDrawing(services) {
            if (drawingInitialized) throw new Error('Drawing tables already initialized');
            initializeDrawing(services, layouts.drawing, drawing);
            drawingInitialized = true;
        },
        drawing(name, ch) {
            return drawing[name](ch);
        },
        utf8map(services, name, ...args) {
            const environment = createUtf8Environment(services, layouts.utf8map);
            if (name === 'set_map_u') args[0] = environment.glyphMap(args[0]);
            return withCEnvironment(environment, utf8map[name], ...args);
        },
        alloc(services, name, ...args) {
            const layout = layouts.alloc;
            const environment = Object.assign(Object.create(services), layout, { allocState });
            environment.ptrbuf = Array.from({ length: layout.PTRBUFCNT }, (_, i) => services.buffers() + i * layout.PTRBUFSIZ);
            return withCEnvironment(environment, alloc[name], ...args);
        },
        date(services, name, ...args) {
            const layout = layouts.date;
            const environment = Object.assign(Object.create(services), layout.strings, { BUFSZ: layout.BUFSZ, dateState });
            Object.defineProperties(environment, {
                HEAPU8: { get: () => services.heap() },
                HEAP8: { get: () => services.signedHeap() },
                nomakedefs: { value: configuredFields(services, services.data(), layout.fields, 4) },
                zeroTm: { value: () => {
                    const tmLayout = layouts.calendar;
                    const pointer = services.stackAlloc(tmLayout.size);
                    services.heap().fill(0, pointer, pointer + tmLayout.size);
                    return signedFields(services, pointer, tmLayout.fields, tmLayout.intSize);
                } },
            });
            if (name === 'populate_nomakedefs') args[0] = configuredFields(services, args[0], layout.versionFields, 4);
            return withCEnvironment(environment, date[name], ...args);
        },
        rip(services, name, ...args) {
            const layout = layouts.rip;
            const environment = Object.assign(Object.create(services), layout);
            const pointer = address => Number(new DataView(services.heap().buffer).getBigUint64(address, true));
            const storePointer = (address, value) => new DataView(services.heap().buffer).setBigUint64(address, BigInt(value), true);
            Object.defineProperties(environment, {
                HEAPU8: { get: () => services.heap() },
                HEAP8: { get: () => services.signedHeap() },
                pointer: { value: pointer },
                storePointer: { value: storePointer },
                gr: { value: Object.defineProperty({}, 'rip', {
                    get: () => pointer(services.head()),
                    set: value => storePointer(services.head(), value),
                }) },
                gd: { value: Object.defineProperty({}, 'done_money', { get: () => services.money() }) },
                svp: { value: Object.defineProperty({}, 'plname', { get: () => services.name() }) },
            });
            return withCEnvironment(environment, rip[name], ...args);
        },
        sys(services, name, ...args) {
            // This original function has no active body or global accesses.
            if (name === 'sysopt_seduce_set') return sys[name](...args);
            const layout = layouts.sys;
            const environment = Object.assign(Object.create(services), layout.constants, layout.strings);
            environment.LL_NONE = BigInt(layout.constants.LL_NONE);
            environment.sysopt = configuredFields(services, services.sysPointer(), layout.fields, layout.intSize);
            environment.gc = configuredFields(services, services.gcPointer(), layout.gcFields, layout.intSize);
            return withCEnvironment(environment, sys[name], ...args);
        },
        stairs(services, name, ...args) {
            const layout = layouts.stairs;
            const level = pointer => pointer ? signedFields(services, pointer,
                { dnum: layout.dnum, dlevel: layout.dlevel }, layout.levelFieldSize) : 0;
            const node = pointer => {
                if (!pointer) return 0;
                const result = signedFields(services, pointer, { sx: layout.sx, sy: layout.sy }, layout.coordxySize);
                for (const field of ['up', 'isladder', 'u_traversed']) {
                    const suffix = (layout.boolSigned ? 'Int' : 'Uint') + layout.boolSize * 8;
                    Object.defineProperty(result, field, {
                        enumerable: true,
                        get: () => new DataView(services.heap().buffer)['get' + suffix](pointer + layout[field], true),
                        set: value => new DataView(services.heap().buffer)['set' + suffix](pointer + layout[field], value, true),
                    });
                }
                Object.defineProperties(result, {
                    tolev: { enumerable: true, get: () => level(pointer + layout.tolev) },
                    next: {
                        get: () => node(Number(new DataView(services.heap().buffer).getBigUint64(pointer + layout.next, true))),
                        set: value => new DataView(services.heap().buffer).setBigUint64(pointer + layout.next, BigInt(value ? value.address : 0), true),
                    },
                });
                return result;
            };
            const gs = {};
            Object.defineProperty(gs, 'stairs', {
                get: () => node(Number(new DataView(services.heap().buffer).getBigUint64(services.head(), true))),
                set: value => new DataView(services.heap().buffer).setBigUint64(services.head(), BigInt(value ? value.address : 0), true),
            });
            const environment = Object.create(services);
            Object.defineProperties(environment, {
                HEAPU8: { get: () => services.heap() },
                StairwaySize: { value: layout.size },
                stairway: { value: node },
                gs: { value: gs },
                u: { value: {
                    uz: level(services.u() + layout.uz),
                    uhave: Object.defineProperty({}, 'amulet', { get: () => services.amulet() }),
                } },
                quest_dnum: { get: () => services.quest() },
                levelCopy: { value: value => {
                    const pointer = services.stackAlloc(layout.levelSize);
                    services.heap().copyWithin(pointer, value.address, value.address + layout.levelSize);
                    return level(pointer);
                } },
                boolean: { value: value => layout.boolSigned
                    ? value << (32 - layout.boolSize * 8) >> (32 - layout.boolSize * 8)
                    : (value >>> 0) % 2 ** (layout.boolSize * 8) },
                svd: { value: { dungeons: new Proxy({}, {
                    get: (target, index) => ({ dname: services.dname(Number(index)) }),
                }) } },
            });
            for (const [i, field] of ['earth_level', 'air_level', 'fire_level', 'water_level'].entries()) {
                Object.defineProperty(environment, field, { get: () => level(services.specialLevel(i)) });
            }
            if (name === 'stairway_add') args[4] = level(args[4]);
            else if (name === 'stairway_find' || name === 'stairway_find_from') args[0] = level(args[0]);
            else if (name === 'known_branch_stairs' || name === 'stairs_description') args[0] = node(args[0]);
            const result = withCEnvironment(environment, stairs[name], ...args);
            return result && typeof result === 'object' ? result.address : result;
        },
        calendar(services, name, ...args) {
            const layout = layouts.calendar;
            const environment = Object.create(services);
            const tm = pointer => pointer ? signedFields(services, pointer, layout.fields, layout.intSize) : 0;
            Object.defineProperties(environment, {
                HEAPU8: { get: () => services.heap() },
                HEAP8: { get: () => services.signedHeap() },
                localtime: { value: date => tm(services.localtimePointer(date)) },
                mktime: { value: value => services.mktimePointer(value.address) },
                tmCopy: { value: value => {
                    const pointer = services.stackAlloc(layout.size);
                    services.heap().copyWithin(pointer, value.address, value.address + layout.size);
                    return tm(pointer);
                } },
            });
            return withCEnvironment(environment, calendar[name], ...args);
        },
        get trackState() { return trackState; },
        track(services, name, ...args) {
            const layout = layouts.track;
            trackState ||= trackContext(services, services.state(), layout);
            const environment = Object.create(services);
            const object = pointer => pointer ? signedFields(services, pointer, { otyp: layout.otyp }, layout.otypSize) : 0;
            Object.defineProperties(environment, {
                trackState: { value: trackState },
                HEAPU8: { get: () => services.heap() },
                CoordSize: { value: layout.coordSize },
                RIN_STEALTH: { value: layout.RIN_STEALTH },
                u: { get: () => signedFields(services, services.u(), { ux: layout.ux, uy: layout.uy }, layout.coordxySize) },
                uleft: { get: () => object(services.left()) },
                uright: { get: () => object(services.right()) },
            });
            const result = withCEnvironment(environment, track[name], ...args);
            return result && typeof result === 'object' ? result.address : result;
        },
        rectState,
        rect(services, name, ...args) {
            const layout = layouts.rect;
            const environment = Object.create(services);
            Object.assign(environment, {
                rectState,
                COLNO: layout.COLNO,
                ROWNO: layout.ROWNO,
                NhRectSize: layout.size,
                rectArray: pointer => rectArray(services, pointer, layout),
                rectLocal: () => localRect(layout),
                rectCopy: value => localRect(layout, value),
            });
            args = args.map(pointer => rectView(services, pointer, layout));
            if (name === 'rect_bounds') {
                args[0] = { ...args[0] };
                args[1] = { ...args[1] };
            }
            const result = withCEnvironment(environment, rect[name], ...args);
            return result && typeof result === 'object' ? result.address : result;
        },
        strutil(services, name, ...args) {
            if (name.startsWith('strbuf_')) args[0] = stringBuffer(services, args[0]);
            return stringCall(services, name, ...args);
        },
        isaac64_init(heap, _ctx, _seed, _nseed) {
            // The frozen initializer owns the algorithm; only copy its result
            // into the C ABI context used by the remaining Wasm callers.
            const initialized = isaac64.isaac64_init(seed(heap, _seed, _nseed));
            const target = context(heap, _ctx);
            target.r.set(initialized.r);
            target.m.set(initialized.m);
            for (const field of ['a', 'b', 'c', 'n']) target[field] = initialized[field];
        },
        isaac64_reseed(heap, _ctx, _seed, _nseed) {
            isaac64.isaac64_reseed(context(heap, _ctx), seed(heap, _seed, _nseed));
        },
        isaac64_next_uint64(heap, _ctx) {
            return isaac64.isaac64_next_uint64(context(heap, _ctx));
        },
        isaac64_next_uint(heap, _ctx, _n) {
            // A Wasm i64 crosses the JS ABI as signed even for C uint64_t.
            // The frozen bounded helper mixes BigInt with the Number literal 1.
            // Keep the frozen file untouched; adapt the C bound here while all
            // random draws still come from the canonical generator.
            const target = context(heap, _ctx), bound = BigInt.asUintN(64, _n);
            let value, remainder, multiple;
            do {
                value = isaac64.isaac64_next_uint64(target);
                remainder = value % bound;
                multiple = value - remainder;
            } while (BigInt.asUintN(64, multiple + bound - 1n) < multiple);
            return remainder;
        },
        nhmd4_init(heap, ctx) {
            nhmd4.nhmd4_init(nhmd4Context(heap, ctx, layouts.nhmd4));
        },
        nhmd4_update(heap, ctx, data, size) {
            nhmd4.nhmd4_update(nhmd4Context(heap, ctx, layouts.nhmd4), heap.subarray(data, data + size), size);
        },
        nhmd4_final(heap, ctx, result) {
            nhmd4.nhmd4_final(nhmd4Context(heap, ctx, layouts.nhmd4), heap.subarray(result, result + 16));
        },
    };
}
