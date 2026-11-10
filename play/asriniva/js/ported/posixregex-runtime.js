// Native regex_t remains owned by libc; the JS TU uses its compiler-derived
// address and the adjacent C error field without interpreting libc internals.
export function createPosixregexEnvironment(services, layout) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4)
        throw new Error('Review changed posixregex ABI');
    return {
        ...services,
        ...layout,
        get HEAP8() { return services.signedHeap(); },
        get HEAPU8() { return services.heap(); },
        regex(pointer) {
            const address = Number(pointer);
            if (!address) return 0;
            return {
                address,
                re: address + layout.re,
                get err() {
                    return new DataView(services.heap().buffer).getInt32(address + layout.err, true);
                },
                set err(value) {
                    new DataView(services.heap().buffer).setInt32(address + layout.err, value, true);
                },
            };
        },
    };
}

export function initializePosixregex(services, layout, id) {
    if (layout.pointerSize !== 8 || layout.intSize !== 4)
        throw new Error('Review changed posixregex ABI');
    const bytes = new TextEncoder().encode(id);
    if (bytes.length + 1 !== layout.identifierSize)
        throw new Error('Regex identifier length does not match C storage');
    const address = Number(services.identifier());
    services.heap().fill(0, address, address + layout.identifierSize);
    services.heap().set(bytes, address);
}
