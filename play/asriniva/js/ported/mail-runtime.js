// Layout and header ABI only. Original mailbox and daemon policy is in mail.js.
import * as mail from './mail.js';
import { withCEnvironment } from './c-runtime.js';
const states = new WeakMap();
export function createMailEnvironment(services, L) {
    const raw = value => BigInt.asUintN(64, BigInt(value?.address ?? value ?? 0));
    const address = value => Number(raw(value));
    const view = () => new DataView(services.heap().buffer);
    const global = index => Number(services.global(index));
    const scalar = (object, key, at, type) => Object.defineProperty(object, key, {
        get: () => view()['get' + type](at(), true),
        set: value => view()['set' + type](at(), type.includes('Big') ? BigInt(value) : Number(value), true),
    });
    const pointer = at => Number(view().getBigUint64(at, true));
    const ptrField = (object, key, at, wrap = value => value) => Object.defineProperty(object, key, {
        get: () => wrap(pointer(at())),
        set: value => view().setBigUint64(at(), raw(value), true),
    });
    const array = (at, stride, wrap) => new Proxy({ address: at }, {
        get(target, key) { return typeof key === 'string' && /^\d+$/.test(key) ? wrap(at + Number(key) * stride) : target[key]; },
    });
    const coord = value => {
        const at = address(value); if (!at) return 0;
        const item = { address: at };
        scalar(item, 'x', () => at + L.coord_x, 'Int16');
        scalar(item, 'y', () => at + L.coord_y, 'Int16');
        return item;
    };
    const level = at => { const item = { address: at }; scalar(item, 'dnum', () => at + L.lev_dnum, 'Int16'); return item; };
    const monster = value => {
        const at = address(value); if (!at) return 0;
        const item = { address: at };
        for (const key of ['mx','my']) scalar(item, key, () => at + L['mon_' + key], 'Int16');
        return item;
    };
    const stairway = value => {
        const at = address(value); if (!at) return 0;
        const item = { address: at, tolev: level(at + L.stairs_tolev) };
        for (const key of ['sx','sy']) scalar(item, key, () => at + L['stairs_' + key], 'Int16');
        ptrField(item, 'next', () => at + L.stairs_next, stairway); return item;
    };
    const stat = value => {
        const at = address(value), item = { address: at };
        for (const key of ['st_mtime','st_size']) scalar(item, key, () => at + L['stat_' + key], 'BigInt64');
        return item;
    };
    const info = value => {
        const at = address(value); if (!at) return 0;
        const item = { address: at }; scalar(item, 'message_typ', () => at + L.info_message_typ, 'Int32');
        for (const key of ['display_txt','object_nam','response_cmd']) ptrField(item, key, () => at + L['info_' + key]);
        return item;
    };
    if (L.pointerSize !== 8 || L.longSize !== 8 || L.timeSize !== 8 || L.coord_x_size !== 2 || L.stat_st_mtime_size !== 8)
        throw new Error('Review changed MAIL ABI');
    if (!services.moduleKey || typeof services.moduleKey !== 'object') throw new Error('MAIL needs actual Module identity');
    if (!states.has(services.moduleKey)) states.set(services.moduleKey, {
        mailbox: 0, laststattime: 0n, omstat: stat(services.storage(0)), nmstat: stat(services.storage(1)),
        deliver: { message_typ: L.MSG_MAIL, display_txt: 'I have some mail for you', object_nam: 0, response_cmd: 0 },
    });
    const env = Object.assign(Object.create(services), L, { coord, monster, info,
        mailState: states.get(services.moduleKey),
        long: value => BigInt.asIntN(64, BigInt(value)),
        uint: value => Number(BigInt.asUintN(32, BigInt(value))),
        coordxy: value => Number(BigInt.asIntN(16, BigInt(value))),
        samePtr: (a,b) => raw(a) === raw(b),
        coordLocal: () => coord(services.stackAlloc(L.coordSize)),
        copyCoord: (dst,src) => services.heap().copyWithin(address(dst), address(src), address(src) + L.coordSize),
        callLocal: (fn,...args) => { const saved = services.stackSave(); try { return fn(...args); } finally { services.stackRestore(saved); } },
        getpwuid: uid => { const at = Number(services.getpwuid(uid)); return { address: at, get pw_name() { return pointer(at + L.passwd_pw_name); } }; },
    });
    env.u = { uz: level(global(0) + L.u_uz) };
    for (const key of ['ux','uy']) scalar(env.u, key, () => global(0) + L['u_' + key], 'Int16');
    Object.defineProperty(env.u, 'uswallow', { get: () => services.heroBit(0) });
    const property = index => {
        const at = global(0) + L.u_uprops + index * L.propSize;
        return { intrinsic: view().getBigInt64(at + L.prop_intrinsic, true), extrinsic: view().getBigInt64(at + L.prop_extrinsic, true), blocked: view().getBigInt64(at + L.prop_blocked, true) };
    };
    Object.defineProperties(env, {
        Blind: { get() { const p = property(L.BLINDED); return Number(Boolean((p.intrinsic || p.extrinsic) && !p.blocked)); } },
        Blind_telepat: { get() { const p = property(L.TELEPAT); return p.intrinsic || p.extrinsic; } },
        Deaf: { get() { const p = property(L.DEAF); return p.intrinsic || p.extrinsic || services.heroBit(1); } },
        WIN_MESSAGE: { get: () => services.winMessage() },
        Never_mind: { get: () => services.neverMind() },
    });
    env.gs = {}; ptrField(env.gs, 'stairs', () => global(1) + L.stairs, stairway);
    const rowLimits = key => array(global(2) + L[key], 2, at => view().getInt16(at, true));
    env.gv = { viz_rmin: rowLimits('rmin'), viz_rmax: rowLimits('rmax') };
    const vision = (x,y,mask) => services.heap()[pointer(pointer(global(2) + L.vizArray) + y * L.pointerSize) + x] & mask;
    env.cansee = (x,y) => Number(Boolean(vision(x,y,2)));
    env.couldsee = (x,y) => Number(Boolean(vision(x,y,1)));
    const gridAt = (x,y) => global(3) + L.monsters + (x * L.ROWNO + y) * L.pointerSize;
    env.m_at = (x,y) => monster(pointer(gridAt(x,y)));
    env.MON_AT = (x,y) => Number(Boolean(pointer(gridAt(x,y))));
    env.remove_monster = (x,y) => view().setBigUint64(gridAt(x,y), 0n, true);
    env.place_worm_seg = (mon,x,y) => view().setBigUint64(gridAt(x,y), raw(mon), true);
    env.levl = array(global(3) + L.locations, L.ROWNO * L.rmSize, at => array(at, L.rmSize, cell => ({ get typ() { return view().getInt8(cell + L.rm_typ); } })));
    env.IS_STWALL = typ => Number(typ <= L.DBWALL);
    env.u_at = (x,y) => Number(x === env.u.ux && y === env.u.uy);
    env.distu = (x,y) => services.dist2(x,y,env.u.ux,env.u.uy);
    env.m_next2u = mon => Number(env.distu(mon.mx,mon.my) <= 2);
    env.svm = {}; scalar(env.svm, 'moves', () => global(4) + L.moves, 'BigInt64');
    env.svp = { get plname() { return global(5) + L.plname; } };
    env.flags = {}; scalar(env.flags, 'biff', () => global(6) + L.biff, 'Int8');
    env.iflags = {};
    scalar(env.iflags, 'last_msg', () => global(7) + L.last_msg, 'Int32');
    scalar(env.iflags, 'debug_fuzzer', () => global(7) + L.debug_fuzzer, 'Int8');
    env.mons = array(global(8), L.permonstSize, at => ({ address: at }));
    for (const name of ['mksobj','oname','hold_another_object']) env[name] = (...args) => {
        const at = Number(services[name](...args)); return at ? { address: at } : 0;
    };
    env.makemon = (...args) => monster(services.makemon(...args));
    env.MAILPATH = L.strings.MAILPATH; env.DEF_MAILREADER = L.strings.DEF_MAILREADER;
    return env;
}
export function callMail(services, layout, name, ...args) {
    const env = createMailEnvironment(services, layout), saved = services.stackSave();
    try {
        // Test-only private-state visibility; production imports never request it.
        if (name === '$state') return BigInt([env.mailState.mailbox, env.mailState.laststattime, env.mailState.omstat.address, env.mailState.nmstat.address][Number(args[0])]);
        if (name === '$reset') {
            env.mailState.laststattime = 0n;
            for (const item of [env.mailState.omstat, env.mailState.nmstat]) services.heap().fill(0, item.address, item.address + layout.statSize);
            return;
        }
        if (name === 'md_start') args[0] = env.coord(args[0]);
        if (name === 'md_stop') { args[0] = env.coord(args[0]); args[1] = env.coord(args[1]); }
        if (name === 'md_rush') { args[0] = env.monster(args[0]); args[1] = Number(args[1]) | 0; args[2] = Number(args[2]) | 0; }
        if (name === 'newmail') args[0] = env.info(args[0]);
        return withCEnvironment(env, () => mail[name](...args));
    } finally { services.stackRestore(saved); }
}
