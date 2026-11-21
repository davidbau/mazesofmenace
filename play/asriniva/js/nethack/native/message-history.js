// One native history ring owns its slots. A persistent typed byte arena is the
// interchange representation for report/shutdown/real byte readers, so normal
// messages need neither per-line malloc/free nor pointer-array proxies.
export function createNativeMessageHistory(environment, owner, layout) {
    const {
        memory,
        ctypes
    } = environment, arena = owner.nativeArena, count = layout.DUMPLOG_MSG_COUNT, capacity = layout.BUFSZ;
    if (!arena || !Number.isSafeInteger(count) || count < 1 || !Number.isSafeInteger(capacity) || capacity <
        1) throw Error('Review native message history dimensions');
    const base = memory.malloc(count * capacity);
    if (!base) throw RangeError('Native message history allocation failed');
    const pointerAt = ctypes.fieldAddress('struct instance_globals_s', environment.requireGlobal('gs'),
            'saved_plines'),
        rows = Array(count).fill(0),
        overflow = new Set();
    let epoch = -1;

    function refresh() {
        if (!owner.depth || epoch !== owner.epoch) {
            for (let i = 0; i < count; i++) rows[i] = arena.pointer(pointerAt + i * 8);
            epoch = owner.epoch;
        }
        return rows;
    }

    function set(index, value) {
        if (!Number.isInteger(index) || index < 0 || index >= count) throw RangeError(
            'Native message history index');
        refresh();
        const p = environment.address(value);
        arena.storePointer(pointerAt + index * 8, p);
        rows[index] = p;
        epoch = owner.epoch;
        return value;
    }

    function copy(index, line) {
        if (!Number.isInteger(index) || index < 0 || index >= count) throw RangeError(
            'Native message history index');
        let bytes, source, length;
        if (typeof line === 'string') {
            bytes = memory.constructor.byteString(line);
            const nul = bytes.indexOf(0);
            length = (nul < 0 ? bytes.length : nul) + 1;
        } else {
            source = environment.address(line);
            length = memory.strlen(source) + 1;
        }
        const at = length <= capacity ? base + index * capacity : memory.malloc(length);
        if (!at) throw RangeError('Native message history allocation failed');
        if (length > capacity) overflow.add(at);
        memory.bounds(at, length);
        if (bytes) {
            memory.HEAPU8.set(bytes.subarray(0, length - 1), at);
            memory.HEAPU8[at + length - 1] = 0;
        } else memory.HEAPU8.copyWithin(at, source, source + length);
        return at;
    }

    function release(value) {
        const at = environment.address(value);
        if (at >= base && at < base + count * capacity && (at - base) % capacity === 0) return true;
        if (overflow.delete(at)) {
            memory.free(at);
            return true;
        }
        return false;
    }
    const result = { rows: refresh, set, copy, release, base, capacity, count, pointerAt };
    owner.messageHistory = result;
    return result;
}
