// Private TU state and live C tty/input structures, outside translated getline.c.
export function createGetlineState() {
    return { suppress_history: 0 };
}

export function createGetlineEnvironment(services, layout, state) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4 || layout.longSize !== 8
        || layout.charSize !== 1 || !layout.charSigned || layout.CHAR_BIT !== 8
        || layout.booleanSize !== 1 || !layout.booleanSigned
        || layout.win_flags_size !== 4 || layout.win_maxcol_size !== 8 || layout.win_maxrow_size !== 8
        || layout.display_toplin_size !== 4 || layout.display_inread_size !== 4 || layout.display_intr_size !== 4
        || layout.display_dismiss_more_size !== 1 || layout.inDoagainSize !== 4 || layout.doneHupSize !== 4
        || layout.commandTextSize !== 8 || layout.TTY_GRAPHICS !== 1 || layout.NEWAUTOCOMP !== 1
        || layout.EDIT_GETLIN !== 0 || layout.DUMPLOG_CORE !== 1 || layout.HANGUPHANDLING !== 1)
        throw new Error('Review changed getline ABI or tty configuration');
    for (const field of ['term_gone', 'prevmsg_window', 'cbreak', 'extmenu'])
        if (layout['iflag_' + field + '_size'] !== 1) throw new Error('Review changed tty input flag ABI');
    const address = value => Number(value?.address ?? value ?? 0);
    const global = index => address(services.global(index));
    const view = () => new DataView(services.heap().buffer);
    const pointer = at => Number(view().getBigUint64(at, true));
    const int = value => typeof value === 'bigint' ? Number(BigInt.asIntN(32, value)) : value | 0;
    function window(value) {
        const at = address(value);
        if (!at) return 0;
        return {
            address: at,
            get flags() { return view().getInt32(at + layout.win_flags, true); },
            set flags(value) { view().setInt32(at + layout.win_flags, int(value), true); },
            get maxcol() { return view().getBigInt64(at + layout.win_maxcol, true); },
            set maxcol(value) { view().setBigInt64(at + layout.win_maxcol, BigInt.asIntN(64, BigInt(value)), true); },
            get maxrow() { return view().getBigInt64(at + layout.win_maxrow, true); },
            set maxrow(value) { view().setBigInt64(at + layout.win_maxrow, BigInt.asIntN(64, BigInt(value)), true); },
        };
    }
    function display(value) {
        const at = address(value);
        if (!at) return 0;
        const result = {
            address: at,
            get dismiss_more() { return view().getInt8(at + layout.display_dismiss_more); },
            set dismiss_more(value) { view().setInt8(at + layout.display_dismiss_more, int(value)); },
        };
        for (const field of ['toplin', 'inread', 'intr'])
            Object.defineProperty(result, field, {
                get() { return view().getInt32(at + layout['display_' + field], true); },
                set(value) { view().setInt32(at + layout['display_' + field], int(value), true); },
            });
        return result;
    }
    function intArray(value) {
        const at = address(value);
        if (!at) return 0;
        return new Proxy({ address: at }, {
            get(target, key) {
                if (typeof key === 'string' && /^\d+$/.test(key))
                    return view().getInt32(at + Number(key) * layout.intSize, true);
                return Reflect.get(target, key);
            },
            set(target, key, value) {
                if (typeof key === 'string' && /^\d+$/.test(key)) {
                    view().setInt32(at + Number(key) * layout.intSize, int(value), true);
                    return true;
                }
                return Reflect.set(target, key, value);
            },
        });
    }
    const iflags = {};
    for (const field of ['term_gone', 'prevmsg_window', 'cbreak', 'extmenu'])
        Object.defineProperty(iflags, field, {
            get() { return view().getInt8(global(2) + layout['iflag_' + field]); },
            set(value) { view().setInt8(global(2) + layout['iflag_' + field], int(value)); },
        });
    const environment = {
        ...services,
        ...layout,
        getlineState: state,
        get HEAP8() { return new Int8Array(services.heap().buffer); },
        get HEAPU8() { return services.heap(); },
        get WIN_MESSAGE() { return services.windowMessage(); },
        get stdout() { return address(services.stdout()); },
        get ttyDisplay() { return display(pointer(global(1))); },
        window,
        display,
        intArray,
        int,
        char(value) { return int(value) << 24 >> 24; },
        boolean(value) { return int(value) << 24 >> 24; },
        Ctrl(value) { return (typeof value === 'string' ? value.charCodeAt(0) : value) & 0x1f; },
        callHook(hook, buffer) {
            const stack = services.stackSave();
            try { return hook(buffer); }
            finally { services.stackRestore(stack); }
        },
        wins: new Proxy({}, {
            get(target, key) {
                if (typeof key === 'string' && /^\d+$/.test(key))
                    return window(pointer(global(0) + Number(key) * layout.pointerSize));
                if (key === 'length') return layout.MAXWIN;
                return Reflect.get(target, key);
            },
        }),
        iflags,
        gt: { get toplines() { return global(3) + layout.toplines; } },
        gi: { get in_doagain() { return view().getInt32(global(4) + layout.inDoagain, true); } },
        program_state: { get done_hup() { return view().getInt32(global(5) + layout.doneHup, true); } },
        intPointerLocal(initial) {
            const at = address(services.stackAlloc(layout.pointerSize));
            if (initial !== undefined) view().setBigUint64(at, BigInt(address(initial)), true);
            return {
                address: at,
                get value() { return intArray(pointer(at)); },
                set value(value) { view().setBigUint64(at, BigInt(address(value)), true); },
            };
        },
        extcmds_getentry(index) {
            const at = address(services.extcmds_getentry(index));
            return at ? { address: at, get ef_txt() { return pointer(at + layout.commandText); } } : 0;
        },
    };
    for (const [index, field] of ['morc', 'erase_char', 'kill_char'].entries())
        Object.defineProperty(environment, field, {
            get() { return services.scalar(index); },
            set(value) { services.setScalar(index, int(value) << 24 >> 24); },
        });
    return environment;
}
