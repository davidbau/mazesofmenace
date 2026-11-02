// alloc.js — C ref: alloc.c.

// C alloc() compatibility helper.  The active mapfragment/selection paths now
// construct native JS objects directly, but a few C-shaped special-level
// helpers still ask for byte storage by size.  Return zeroed storage with the
// requested extent rather than turning that compatibility call into a crash.
function alloc(size) {
    const n = Math.max(0, Number.isFinite(size) ? Math.trunc(size) : 0);
    return new Uint8Array(n);
}

export function dupstr(str) {
    // C dupstr: duplicate (copy) a string
    // In JS, strings are immutable so we just return the same string.
    return str;
}
