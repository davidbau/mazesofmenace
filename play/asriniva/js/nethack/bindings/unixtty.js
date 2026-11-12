import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native terminal storage and scalar globals, outside translated unixtty.c.
export function createUnixttyState() {
    return { settty_needed: 0 };
}

export function createUnixttyEnvironment(services, layout, state, vaPointer) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.charSize !== 1
        || layout.CHAR_BIT !== 8 || layout.ccSize !== 1 || !layout.POSIX_TYPES
        || !layout.USG || layout.BSD || layout.AUX || layout.LINUX)
        throw new Error('Review changed unixtty ABI or platform configuration');
    for(const key of ['ECHO','CBRKMASK','STRIPHI','EXTABS','CS7'])
        if(!Number.isInteger(layout[key])||layout[key]<0||layout[key]>0xffffffff)
            throw new Error('Review native terminal mask width: '+key);
    const view = () => CAdapter.currentDataView(services);
    function unsigned(at, width) {
        // Active terminal masks occupy the low 32 bits. Avoid rounding the
        // low bits of a poisoned/native 64-bit flag word through Number.
        return width === 8 ? view().getUint32(at, true)
            : view()['getUint' + width * 8](at, true);
    }
    function setUnsigned(at, width, value) {
        // All assignments here are low-mask bit operations; preserve the
        // untouched high half just as native 64-bit &= and |= do.
        if (width === 8) view().setUint32(at, Number(value) >>> 0, true);
        else view()['setUint' + width * 8](at, Number(value), true);
    }
    function term(pointer) {
        const address = Number(pointer);
        const c_cc = new Proxy({}, {
            get(target, key) {
                if (typeof key === 'string' && /^\d+$/.test(key))
                    return services.heap()[address + layout.c_cc + Number(key)];
                if (key === 'length') return layout.ccCount;
                return Reflect.get(target, key);
            },
            set(target, key, value) {
                if (typeof key === 'string' && /^\d+$/.test(key)) {
                    services.heap()[address + layout.c_cc + Number(key)] = Number(value);
                    return true;
                }
                return Reflect.set(target, key, value);
            },
        });
        const result = { address, c_cc };
        for (const [name, native] of Object.entries({
            c_iflag: 'c_iflag', c_oflag: 'c_oflag', c_cflag: 'c_cflag', c_lflag: 'c_lflag',
            tabflgs: 'c_oflag', echoflgs: 'c_lflag', cbrkflgs: 'c_lflag', inputflags: 'c_iflag',
        })) Object.defineProperty(result, name, {
            get() { return unsigned(address + layout[native], layout.tcflagSize); },
            set(value) { setUnsigned(address + layout[native], layout.tcflagSize, value); },
        });
        for (const [name, index] of Object.entries({
            erase_sym: layout.VERASE, kill_sym: layout.VKILL, intr_sym: layout.VINTR,
        })) Object.defineProperty(result, name, {
            get() { return c_cc[index]; },
            set(value) { c_cc[index] = value; },
        });
        return result;
    }
    const initial = term(services.initial());
    const current = term(services.current());
    const iflags = {};
    for (const [index, name] of ['echo', 'cbreak', 'window_inited'].entries())
        Object.defineProperty(iflags, name, {
            get() { return services.iflag(index); },
            set(value) { services.setIflag(index, value); },
        });
    const environment = {
        ...services,
        ...layout,
        unixttyState: state,
        get HEAP8() { return services.signedHeap(); },
        get HEAPU8() { return services.heap(); },
        inittyb: initial,
        inittyb2: initial,
        curttyb: current,
        curttyb2: current,
        iflags,
        windowprocs: { get wp_id() { return services.wpId(); } },
        get nonesuch() { return BigInt(services.fpathconf(0, layout._PC_VDISABLE)); },
        copyTerm(destination, source) {
            services.heap().copyWithin(destination.address, source.address, source.address + layout.termioSize);
        },
        CBRKON(value) { return !value; },
        IS_7BIT(value) { return value.c_cflag & layout.CS7; },
        GTTY(value) { return services.tcgetattr(0, value.address); },
        STTY(value) { return services.tcsetattr(0, layout.TCSADRAIN, value.address); },
        GTTY2() { return 1; },
        STTY2() { return 1; },
        cfgetospeed(pointer) { return services.cfgetospeed(pointer); },
        va_start(args) {
            const packet = args.find(value => value && typeof value === 'object'
                && Object.hasOwn(value, 'nativeVaList'));
            const pointer = vaPointer ?? packet?.nativeVaList;
            if (pointer === undefined) throw new Error('Missing native unixtty error varargs');
            args.nativeVaList = pointer;
        },
        Vprintf(format, args) { return services.vprintf(format, args.nativeVaList); },
        va_end() {},
    };
    for (const [index, name] of ['ospeed', 'erase_char', 'kill_char', 'intr_char'].entries())
        Object.defineProperty(environment, name, {
            get() { return services.scalar(index); },
            set(value) { services.setScalar(index, value); },
        });
    return environment;
}
