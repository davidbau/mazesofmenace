// js/crt/qsort.js: Darwin libc qsort, ported exactly (transpiler-design.md 5).
// Hand-written runtime.
//
// Source: apple-oss-distributions/Libc, stdlib/FreeBSD/qsort.c and heapsort.c
// (identical from Libc-1534.100.14 through Libc-1752.120.2; reference platform
// macOS 15.8.1, 24H32). Apple's qsort differs from FreeBSD's: a recursion depth
// limit 2 * (flsl(n) - 1) that falls back to heapsort, insertion sort for
// n <= 7, and an insertion-sort attempt with a swap limit when a partition pass
// made no swaps (it may give up after moving elements: "nevermind").
//
// Order of comparator calls is observable in NetHack (sortloot_cmp can consume
// RNG), so the algorithm is followed statement by statement. Positions are
// element indices relative to the array start; TEMP is heapsort's scratch
// element `k`. Byte-level swap strategy (swaptype) does not affect order and is
// not modeled. The algorithm is a generator that yields each comparison
// [i, j] and receives the comparator's int; swaps and copies are synchronous
// callbacks, run in algorithm order. qsortSync / qsortAsync drive it.

import { Ptr } from './mem.js';
import { CTrap } from './int.js';

export const TEMP = -1;

const flsl = (x) => (x <= 0 ? 0 : Math.floor(Math.log2(x)) + 1);
const DEPTH = (n) => 2 * (flsl(n) - 1);

function* med3(a, b, c) {
    return (yield [a, b]) < 0
        ? ((yield [b, c]) < 0 ? b : ((yield [a, c]) < 0 ? c : a))
        : ((yield [b, c]) > 0 ? b : ((yield [a, c]) < 0 ? a : c));
}

/** _isort: true if completed, false if the swap limit was exceeded. */
function* isort(a, n, swapLimit, ops) {
    let swapCnt = 0;
    for (let pm = a + 1; pm < a + n; pm++) {
        for (let pl = pm; pl > a && (yield [pl - 1, pl]) > 0; pl--) {
            ops.swap(pl, pl - 1);
            if (swapLimit && ++swapCnt > swapLimit) return false;
        }
    }
    return true;
}

/** heapsort.c on elements a .. a+n-1 (1-based heap: element i at a + i - 1). */
function* heapsort(a, nmemb, ops) {
    if (nmemb <= 1) return;
    const at = (i) => a + i - 1;      // base = vbase - size
    const pos = (i) => (i === 'k' ? TEMP : at(i));
    let i, j, l;
    // CREATE
    for (l = Math.floor(nmemb / 2) + 1; --l;) {
        for (i = l; (j = i * 2) <= nmemb; i = j) {
            let child = j;
            if (j < nmemb && (yield [pos(child), pos(child + 1)]) < 0) { child++; j++; }
            if ((yield [pos(child), pos(i)]) <= 0) break;
            ops.swap(pos(i), pos(child));
        }
    }
    while (nmemb > 1) {
        ops.copy(TEMP, at(nmemb));
        ops.copy(at(nmemb), at(1));
        --nmemb;
        // SELECT
        for (i = 1; (j = i * 2) <= nmemb; i = j) {
            let child = j;
            if (j < nmemb && (yield [pos(child), pos(child + 1)]) < 0) { child++; j++; }
            ops.copy(at(i), at(child));
        }
        for (;;) {
            j = i;
            i = Math.floor(j / 2);
            if (j === 1 || (yield [TEMP, at(i)]) < 0) { ops.copy(at(j), TEMP); break; }
            ops.copy(at(j), at(i));
        }
    }
}

function* qsortRec(a, n, depthLimit, ops) {
    for (;;) {   // loop:
        let swapCnt = 0;
        if (depthLimit-- <= 0) { yield* heapsort(a, n, ops); return; }
        if (n <= 7) { yield* isort(a, n, 0, ops); return; }

        let pl = a, pm = a + Math.floor(n / 2), pn = a + n - 1;
        if (n > 40) {
            const d = Math.floor(n / 8);
            pl = yield* med3(pl, pl + d, pl + 2 * d);
            pm = yield* med3(pm - d, pm, pm + d);
            pn = yield* med3(pn - 2 * d, pn - d, pn);
        }
        pm = yield* med3(pl, pm, pn);
        ops.swap(a, pm);
        let pa = a + 1, pb = a + 1;
        let pc = a + n - 1, pd = a + n - 1;
        for (;;) {
            let r;
            while (pb <= pc && (r = yield [pb, a]) <= 0) {
                if (r === 0) { swapCnt = 1; ops.swap(pa, pb); pa++; }
                pb++;
            }
            while (pb <= pc && (r = yield [pc, a]) >= 0) {
                if (r === 0) { swapCnt = 1; ops.swap(pc, pd); pd--; }
                pc--;
            }
            if (pb > pc) break;
            ops.swap(pb, pc);
            swapCnt = 1;
            pb++;
            pc--;
        }
        pn = a + n;
        let d1 = Math.min(pa - a, pb - pa);
        vecswap(a, pb - d1, d1, ops);
        d1 = Math.min(pd - pc, pn - pd - 1);
        vecswap(pb, pn - d1, d1, ops);

        if (swapCnt === 0) {   // switch to insertion sort
            const r = 1 + Math.floor(n / 4);
            if (yield* isort(a, n, r, ops)) return;
            // nevermind: partition bounds from before the attempt are reused
        }
        d1 = pb - pa;
        const d2 = pd - pc;
        if (d1 <= d2) {
            if (d1 > 1) yield* qsortRec(a, d1, depthLimit, ops);
            if (d2 > 1) { a = pn - d2; n = d2; continue; }
        } else {
            if (d2 > 1) yield* qsortRec(pn - d2, d2, depthLimit, ops);
            if (d1 > 1) { n = d1; continue; }
        }
        return;
    }
}
function vecswap(a, b, n, ops) { for (let k = 0; k < n; k++) ops.swap(a + k, b + k); }

/** The comparison sequence of qsort(a, n, ...) as a generator. */
export function* darwinQsort(n, ops) { yield* qsortRec(0, n, DEPTH(n), ops); }

/** ops: { cmp(i, j) -> int, swap(i, j), copy(dst, src) }; positions may be TEMP. */
export function qsortSync(n, ops) {
    const g = darwinQsort(n, ops);
    let step = g.next();
    while (!step.done) step = g.next(ops.cmp(step.value[0], step.value[1]));
}
/** Same, for an async comparator (e.g. one that can reach a --More-- prompt). */
export async function qsortAsync(n, ops) {
    const g = darwinQsort(n, ops);
    let step = g.next();
    while (!step.done) step = g.next(await ops.cmp(step.value[0], step.value[1]));
}

/** Convenience: sort a JS array of values in place (elements moved as values). */
export function qsortValues(arr, cmp) {
    let tmp;
    const get = (i) => (i === TEMP ? tmp : arr[i]);
    qsortSync(arr.length, {
        cmp: (i, j) => cmp(get(i), get(j)),
        swap: (i, j) => { const t = get(i); set(i, get(j)); set(j, t); },
        copy: (d, s) => set(d, get(s)),
    });
    function set(i, v) { if (i === TEMP) tmp = v; else arr[i] = v; }
    return arr;
}

// ---------- nh_deterministic_qsort (patch 002, src/hacklib.c): hand-written override ----------
// The C wrapper sorts an index array with qsort, comparing compar(base + a.idx * size,
// base + b.idx * size) and breaking ties by index, then permutes the elements through a
// byte copy. Byte arithmetic on an arbitrary base cannot be transpiled into the object
// world, so it is written here (annotation functions["nh_deterministic_qsort"]): the
// comparator sees element pointers exactly as transpiled code makes them, and elements
// move by value (records by $copyFrom, so pointers to array positions keep their meaning).
function elements(base, n) {
    if (base instanceof Ptr) {
        return {
            at: (i) => base.add(i),
            get: (i) => { const v = base.get(i); return v !== null && typeof v === 'object' ? cloneVal(v) : v; },
            put: (i, v) => { const t = base.get(i); if (ArrayBuffer.isView(t)) t.set(v); else if (t && t.$copyFrom) t.$copyFrom(v); else base.set(i, v); },
        };
    }
    if (base && base.__arr) {   // an element of a record array
        const a = base.__arr, o = base.__idx;
        if (o + n > a.length) throw new CTrap('qsort past the end of a record array');
        return { at: (i) => a[o + i], get: (i) => a[o + i].$clone(), put: (i, v) => a[o + i].$copyFrom(v) };
    }
    if (n === 1 || n === 0) return null;
    throw new CTrap('qsort of a base that is neither a scalar/pointer array nor a record array');
}
function cloneVal(v) {
    if (ArrayBuffer.isView(v)) return v.slice();
    if (v.$clone) return v.$clone();
    return v;   // a pointer
}
function idxOps(order, cmpIdx) {
    let tmp;
    const get = (i) => (i === TEMP ? tmp : order[i]);
    const set = (i, v) => { if (i === TEMP) tmp = v; else order[i] = v; };
    return {
        cmp: (i, j) => cmpIdx(get(i), get(j)),
        swap: (i, j) => { const t = get(i); set(i, get(j)); set(j, t); },
        copy: (d, s) => set(d, get(s)),
    };
}
const tie = (c, a, b) => (c ? c : a < b ? -1 : a > b ? 1 : 0);
function permute(el, order) {
    const vals = order.map((k) => el.get(k));
    vals.forEach((v, i) => el.put(i, v));
}
export function nh_deterministic_qsort(base, nmemb, size, compar) {
    const n = Number(nmemb);
    if (base === null || compar === null || Number(size) === 0 || n < 2) return;
    const el = elements(base, n);
    const order = Array.from({ length: n }, (_, i) => i);
    qsortSync(n, idxOps(order, (a, b) => tie(compar(el.at(a), el.at(b)), a, b)));
    permute(el, order);
}
/** The same, for a comparator in the async set (sortloot_cmp can reach a window port call). */
export async function nh_deterministic_qsort$async(base, nmemb, size, compar) {
    const n = Number(nmemb);
    if (base === null || compar === null || Number(size) === 0 || n < 2) return;
    const el = elements(base, n);
    const order = Array.from({ length: n }, (_, i) => i);
    let tmp;
    const get = (i) => (i === TEMP ? tmp : order[i]);
    const set = (i, v) => { if (i === TEMP) tmp = v; else order[i] = v; };
    await qsortAsync(n, {
        cmp: async (i, j) => { const a = get(i), b = get(j); return tie(await compar(el.at(a), el.at(b)), a, b); },
        swap: (i, j) => { const t = get(i); set(i, get(j)); set(j, t); },
        copy: (d, s) => set(d, get(s)),
    });
    permute(el, order);
}
