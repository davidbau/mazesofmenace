// Materialize date.js's original static initializer for the remaining C callers.
// The caller initializes it once per module before C startup, and owns the
// separate populated flag. These strings retain the original static lifetime.
export function initializeDate(services, layout, initial) {
    const fields = Object.entries(layout.fields);
    for (const [name, field] of fields) {
        if (!Object.hasOwn(initial, name))
            throw new Error(`Missing date initializer field ${name}`);
        if (!['pointer', 'ulong'].includes(field.kind) || field.size !== 8)
            throw new Error('Review changed date pointer or unsigned long ABI');
    }
    const address = Number(services.data());
    services.heap().fill(0, address, address + layout.size);
    const strings = new Map();
    const encoder = new TextEncoder();
    function stringPointer(text) {
        if (text === null) return 0;
        if (typeof text !== 'string') throw new Error('Expected date initializer string');
        if (!strings.has(text)) {
            const bytes = encoder.encode(text);
            const pointer = Number(services.malloc(bytes.length + 1));
            if (!pointer) throw new Error('Unable to allocate date initializer string');
            services.heap().set(bytes, pointer);
            services.heap()[pointer + bytes.length] = 0;
            strings.set(text, pointer);
        }
        return strings.get(text);
    }
    for (const [name, field] of fields) {
        const value = field.kind === 'pointer'
            ? BigInt(stringPointer(initial[name])) : BigInt.asUintN(64, BigInt(initial[name]));
        new DataView(services.heap().buffer).setBigUint64(address + field.offset, value, true);
    }
}
