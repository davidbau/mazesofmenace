// Temporary ABI bridge while the remaining translation units are C/Wasm.
import * as isaac64 from '../isaac64.js';
import * as nhmd4 from './nhmd4.js';
import * as strutil from './strutil.js';
import * as rect from './rect.js';
import * as track from './track.js';
import * as calendar from './calendar.js';
import { cAddress, writeNativePointer, scanNativeLong, nativeSystemOptions } from '../services/native-c-compat.js';
import { createCTime } from '../services/c-time.js';
import { createNativeRegexLibc } from '../services/native-regex-libc.js';
import { nativeQsort } from '../services/native-qsort.js';
import { createNativeTerminal } from '../services/native-terminal.js';
import * as stairs from './stairs.js';
import * as sys from './sys.js';
import * as rip from './rip.js';
import * as date from './date.js';
import { initializeDate } from './date-runtime.js';
import * as alloc from './alloc.js';
import * as utf8map from './utf8map.js';
import * as drawing from './drawing.js';
import * as posixregex from './posixregex.js';
import * as rnd from './rnd.js';
import * as ioctl from './ioctl.js';
import * as unixtty from './unixtty.js';
import * as were from './were.js';
import * as extralev from './extralev.js';
import * as mplayer from './mplayer.js';
import * as exper from './exper.js';
import * as mkmap from './mkmap.js';
import * as getline from './getline.js';
import * as write from './write.js';
import * as mdlib from './mdlib.js';
import * as quest from './quest.js';
import * as minion from './minion.js';
import * as iactions from './iactions.js';
import * as selvar from './selvar.js';
import * as steal from './steal.js';
import * as sit from './sit.js';
import * as fountain from './fountain.js';
import * as objects from './objects.js';
import * as monst from './monst.js';
import * as shknam from './shknam.js';
import * as rumors from './rumors.js';
import * as music from './music.js';
import * as version from './version.js';
import * as coloratt from './coloratt.js';
import * as priest from './priest.js';
import { createPriestEnvironment } from './priest-runtime.js';
import * as light from './light.js';
import { createLightEnvironment } from './light-runtime.js';
import * as lock from './lock.js';
import { createLockEnvironment } from './lock-runtime.js';
import * as wield from './wield.js';
import { createWieldEnvironment } from './wield-runtime.js';
import * as worn from './worn.js';
import { createWornEnvironment } from './worn-runtime.js';
import * as hacklib from './hacklib.js';
import { createHacklibState, createHacklibEnvironment } from './hacklib-runtime.js';
import * as mondata from './mondata.js';
import { createMondataEnvironment } from './mondata-runtime.js';
import * as dbridge from './dbridge.js';
import { createDbridgeEnvironment } from './dbridge-runtime.js';
import * as mcastu from './mcastu.js';
import { createMcastuEnvironment } from './mcastu-runtime.js';
import * as ball from './ball.js';
import { createBallState, createBallEnvironment } from './ball-runtime.js';
import * as o_init from './o_init.js';
import { createOInitEnvironment } from './o_init-runtime.js';
import * as worm from './worm.js';
import { createWormState, createWormEnvironment } from './worm-runtime.js';
import * as wizard from './wizard.js';
import { createWizardEnvironment } from './wizard-runtime.js';
import * as steed from './steed.js';
import { createSteedEnvironment } from './steed-runtime.js';
import { createColorattState, createColorattEnvironment } from './coloratt-runtime.js';
import { createVersionState, createVersionEnvironment } from './version-runtime.js';
import { createMusicState, createMusicEnvironment } from './music-runtime.js';
import { createRumorsState, createRumorsEnvironment } from './rumors-runtime.js';
import { createShknamState, createShknamEnvironment } from './shknam-runtime.js';
import { createMonstState, createMonstEnvironment } from './monst-runtime.js';
import { createObjectsState, createObjectsEnvironment } from './objects-runtime.js';
import { createFountainEnvironment } from './fountain-runtime.js';
import { createSitEnvironment } from './sit-runtime.js';
import { createStealEnvironment } from './steal-runtime.js';
import { createSelvarState, createSelvarEnvironment } from './selvar-runtime.js';
import { createIactionsEnvironment } from './iactions-runtime.js';
import { createMinionEnvironment } from './minion-runtime.js';
import { createQuestEnvironment } from './quest-runtime.js';
import { createMdlibState, createMdlibEnvironment } from './mdlib-runtime.js';
import { createWriteEnvironment } from './write-runtime.js';
import { createGetlineState, createGetlineEnvironment } from './getline-runtime.js';
import { createMkmapEnvironment } from './mkmap-runtime.js';
import { createExperEnvironment } from './exper-runtime.js';
import { createMplayerEnvironment } from './mplayer-runtime.js';
import { createExtralevEnvironment } from './extralev-runtime.js';
import { createWereEnvironment } from './were-runtime.js';
import { createUnixttyState, createUnixttyEnvironment } from './unixtty-runtime.js';
import { createIoctlEnvironment } from './ioctl-runtime.js';
import { createRndState, createRndEnvironment } from './rnd-runtime.js';
import { createPosixregexEnvironment, initializePosixregex } from './posixregex-runtime.js';
import { initializeDrawing } from './drawing-runtime.js';
import { createUtf8Environment } from './utf8-runtime.js';
import { withCEnvironment } from './c-runtime.js';

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
    const nativeTerminal = createNativeTerminal();
    const nativeRegexServices = createNativeRegexLibc();
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
            wormStates.set(services.moduleKey, createWormState(services, layouts.worm));
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
        nativeQsort(services,base,count,size) { return nativeQsort(services.heap,base,count,size,services.compare); },
        nativeTerminal(services,name,...args) {return nativeTerminal(services,name,...args);},
        nativeRegex(services,name,...args) {return nativeRegexServices(services)[name](...args);},
        initializeDate(services) {
            if (dateInitialized) throw new Error('Version metadata already initialized');
            initializeDate(services, layouts.date, date.nomakedefs_initial);
            dateInitialized = true;
        },
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
            const environment = createWormEnvironment(services, layouts.worm, wormState(services));
            environment.fmt_ptr = value => {
                const out = services.fmt_ptr(value);
                writeNativePointer(services.heap(), out, value);
                return out;
            };
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
            const environment = createSteedEnvironment(services, layouts.steed, steed);
            if (name === 'use_saddle') args[0] = environment.object(args[0]);
            if (name === 'put_saddle_on_mon') {
                args[0] = environment.object(args[0]); args[1] = environment.monster(args[1]);
            }
            if (['can_saddle', 'can_ride', 'mount_steed', 'maybewakesteed', 'poly_steed', 'place_monster'].includes(name))
                args[0] = environment.monster(args[0]);
            if (name === 'poly_steed') args[1] = environment.permonst(args[1]);
            if (name === 'landing_spot') args[0] = environment.coord(args[0]);
            const result = withCEnvironment(environment, steed[name], ...args);
            return typeof result === 'string' ? services.literal(result) : result?.address ?? result ?? 0;
        },
        lock(services, name, ...args) {
            const environment = createLockEnvironment(services, layouts.lock, lock);
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
            environment.Snprintf = (out, size, format, ...values) => {
                // Native formatting preserves the source before writing an
                // aliased destination; the Emscripten formatter clears it first.
                if (format === '%s' && cAddress(values[0]) === cAddress(out)) {
                    const heap = services.heap(), start = cAddress(out);
                    let end = start; while (heap[end]) end++;
                    const copy = services.stackAlloc(end - start + 1);
                    services.heap().set(heap.slice(start, end + 1), copy);
                    values[0] = copy;
                }
                return services.Snprintf(out, size, format, ...values);
            };
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
            const environment = createSelvarEnvironment(services, layouts.selvar, selvarState);
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
        },
        iactions(services, name, ...args) {
            const environment = createIactionsEnvironment(services, layouts.iactions);
            if (['itemactions', 'item_naming_classification', 'item_reading_classification', 'itemactions_pushkeys'].includes(name)) args[0] = environment.object(args[0]);
            if (name === 'ia_addmenu') args[2] = environment.char(args[2]);
            return withCEnvironment(environment, iactions[name], ...args);
        },
        minion(services, name, ...args) {
            const environment = createMinionEnvironment(services, layouts.minion, minion);
            environment.sscanf = (input, format, out) => {
                if (format !== '%ld') throw new Error('Review native minion scan format');
                return scanNativeLong(services.heap(), input, out);
            };
            if (['newemin', 'free_emin', 'msummon', 'demon_talk', 'bribe', 'lose_guardian_angel'].includes(name)) args[0] = environment.monster(args[0]);
            if (['monster_census', 'dprince', 'dlord', 'ndemon'].includes(name)) args[0] = args[0] << 24 >> 24;
            if (name === 'summon_minion') args = args.map(value => value << 24 >> 24);
            return withCEnvironment(environment, minion[name], ...args);
        },
        quest(services, name, ...args) {
            const environment = createQuestEnvironment(services, layouts.quest);
            if (['artitouch', 'finish_quest'].includes(name)) args[0] = environment.object(args[0]);
            if (['leader_speaks', 'quest_chat', 'quest_talk', 'quest_stat_check', 'chat_with_leader', 'prisoner_speaks'].includes(name)) args[0] = environment.monster(args[0]);
            if (name === 'nemesis_stinks') args = args.map(value => value << 16 >> 16);
            if (['is_pure', 'expulsion'].includes(name)) args[0] = args[0] << 24 >> 24;
            return withCEnvironment(environment, quest[name], ...args);
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
            environment.Sprintf = (out, format, value) => format === '%p'
                ? writeNativePointer(services.heap(), out, value) : services.Sprintf(out, format, value);
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
            const environment = Object.assign(Object.create(services), layout.constants, layout.strings, nativeSystemOptions);
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
            const nativeTime = createCTime({native:true});
            const tm = pointer => pointer ? signedFields(services, pointer, layout.fields, layout.intSize) : 0;
            Object.defineProperties(environment, {
                HEAPU8: { get: () => services.heap() },
                HEAP8: { get: () => services.signedHeap() },
                localtime: { value: date => nativeTime.localtime(date) },
                mktime: { value: value => nativeTime.mktime(value) },
                tmCopy: { value: value => {
                    return {...value};
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
