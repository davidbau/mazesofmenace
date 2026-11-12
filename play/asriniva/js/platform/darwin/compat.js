// Observable LP64 Darwin libc rules used by the native NetHack reference.
// These operate on caller-owned bytes; no native oracle is used at runtime.
export const cAddress = value => Number(value?.address ?? value ?? 0);
// The configured reference target is macOS. This selects initialization policy;
// it does not pretend that Emscripten implements a native stack walker.
export const nativeSystemOptions = Object.freeze({PANICTRACE_LIBC:1});
export function writeNativePointer(heap, output, value) {
    const text = '0x' + BigInt.asUintN(64, BigInt(value?.address ?? value ?? 0)).toString(16);
    output = cAddress(output);
    for (let i = 0; i < text.length; i++) heap[output + i] = text.charCodeAt(i);
    heap[output + text.length] = 0;
    return text.length;
}
export function scanNativeLong(heap, input, output) {
    let at = cAddress(input), negative = false, count = 0, value = 0n;
    while (heap[at] === 32 || heap[at] >= 9 && heap[at] <= 13) at++;
    if (!heap[at]) return -1;
    if (heap[at] === 43 || heap[at] === 45) negative = heap[at++] === 45;
    const limit = negative ? 1n << 63n : (1n << 63n) - 1n;
    while (heap[at] >= 48 && heap[at] <= 57) {
        value = value * 10n + BigInt(heap[at++] - 48); count++;
        if (value > limit) value = limit;
    }
    if (!count) return 0;
    // The native reference's scanf saturates at the signed long boundary.
    value = BigInt.asIntN(64, negative ? -value : value);
    new DataView(heap.buffer).setBigInt64(cAddress(output), value, true);
    return 1;
}
