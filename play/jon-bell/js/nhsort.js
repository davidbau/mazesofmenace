// nhsort.js — the ONE qsort of this port.
//
// Every C qsort() call in NetHack 5.0 (all 16 live sites include hack.h) is
// (include/hack.h macro) to nh_deterministic_qsort() (src/hacklib.c):
//
//   order[i].idx = i;  qsort(order, nmemb, sizeof *order, nh_qsort_idx_cmp);
//   nh_qsort_idx_cmp(a, b): c = compar(base + a->idx*size, base + b->idx*size);
//                           if (c) return c; return a->idx < b->idx ? -1 : a->idx > b->idx;
//   then base[i] = old base[order[i].idx]   (memcpy through tmp)
//
// so the caller's comparator always sees the ORIGINAL, unmoved elements (any
// cache it writes into them — sortloot_cmp's orderclass/str — persists across
// comparisons), ties are broken by original index, and the inner qsort is the
// Libc stdlib/FreeBSD/qsort.c (unchanged from Libc-1244 through Libc-1752):
// Bentley-McIlroy with insertion sort for n <= 7, med3 / ninther (n > 40)
// pivot, the bounded "swap_cnt == 0" insertion-sort retry (limit 1 + n/4,
// abandoned -> "nevermind"), recursion on the smaller side, and a heapsort
// fallback once depth_limit = 2 * (flsl(n) - 1) is exhausted (heapsort.c).
// The model below is that source transcribed with element indices for
// pointers (es == 1 element).  With a consistent comparator the result is the
// unique sorted order; with an inconsistent one (sortloot_cmp's obj1-only
// oc_uses_known tier, invent.c:533) the result and the comparison sequence
// are Apple's.  Verified in isolation against the Apple source compiled
// locally (test/nhsort-apple-qsort.test.mjs) and against Mac recordings.

function fls(n) {
    let r = 0;
    while (n > 0) { r++; n = Math.floor(n / 2); }
    return r;
}

function swapEl(a, i, j) {
    const t = a[i]; a[i] = a[j]; a[j] = t;
}

/* qsort.c swapfunc via vecswap(a, b, n): n element swaps, ascending. */
function vecswap(a, i, j, n) {
    for (let k = 0; k < n; k++) swapEl(a, i + k, j + k);
}

/* qsort.c _isort(): plain insertion sort; swap_limit 0 means unbounded.
 * Returns false when the swap limit was exceeded (array left part-sorted). */
function isort(a, lo, n, cmp, swapLimit) {
    let swapCnt = 0;
    for (let pm = lo + 1; pm < lo + n; pm++) {
        for (let pl = pm; pl > lo && cmp(a[pl - 1], a[pl]) > 0; pl--) {
            swapEl(a, pl, pl - 1);
            if (swapLimit && ++swapCnt > swapLimit) return false;
        }
    }
    return true;
}

/* qsort.c med3() */
function med3(a, x, y, z, cmp) {
    return cmp(a[x], a[y]) < 0
        ? (cmp(a[y], a[z]) < 0 ? y : (cmp(a[x], a[z]) < 0 ? z : x))
        : (cmp(a[y], a[z]) > 0 ? y : (cmp(a[x], a[z]) < 0 ? x : z));
}

/* Apple Libc stdlib/FreeBSD/heapsort.c heapsort() over a[lo .. lo+n-1]
 * (Knuth numbering 1..n, base = a - 1). */
function heapsort(a, lo, nmemb, cmp) {
    if (nmemb <= 1) return;
    const B = (i) => lo + i - 1;
    let parI, childI;
    /* CREATE(l, nmemb, ...) */
    for (let l = Math.floor(nmemb / 2) + 1; --l;) {
        for (parI = l; (childI = parI * 2) <= nmemb; parI = childI) {
            if (childI < nmemb && cmp(a[B(childI)], a[B(childI + 1)]) < 0)
                ++childI;
            if (cmp(a[B(childI)], a[B(parI)]) <= 0)
                break;
            swapEl(a, B(parI), B(childI));
        }
    }
    while (nmemb > 1) {
        const k = a[B(nmemb)];
        a[B(nmemb)] = a[B(1)];
        --nmemb;
        /* SELECT(...) */
        for (parI = 1; (childI = parI * 2) <= nmemb; parI = childI) {
            if (childI < nmemb && cmp(a[B(childI)], a[B(childI + 1)]) < 0)
                ++childI;
            a[B(parI)] = a[B(childI)];
        }
        for (;;) {
            childI = parI;
            parI = Math.floor(childI / 2);
            if (childI === 1 || cmp(k, a[B(parI)]) < 0) {
                a[B(childI)] = k;
                break;
            }
            a[B(childI)] = a[B(parI)];
        }
    }
}

/* qsort.c _qsort() */
function _qsort(a, lo, n, cmp, depthLimit) {
    for (;;) { /* loop: */
        let swapCnt = 0;
        if (depthLimit-- <= 0) {
            heapsort(a, lo, n, cmp);
            return;
        }
        if (n <= 7) {
            isort(a, lo, n, cmp, 0);
            return;
        }
        let pl = lo;
        let pm = lo + Math.floor(n / 2);
        let pn = lo + n - 1;
        if (n > 40) {
            const d = Math.floor(n / 8);
            pl = med3(a, pl, pl + d, pl + 2 * d, cmp);
            pm = med3(a, pm - d, pm, pm + d, cmp);
            pn = med3(a, pn - 2 * d, pn - d, pn, cmp);
        }
        pm = med3(a, pl, pm, pn, cmp);
        swapEl(a, lo, pm);
        let pa = lo + 1, pb = lo + 1;
        let pc = lo + n - 1, pd = lo + n - 1;
        for (;;) {
            let r;
            while (pb <= pc && (r = cmp(a[pb], a[lo])) <= 0) {
                if (r === 0) { swapCnt = 1; swapEl(a, pa, pb); pa++; }
                pb++;
            }
            while (pb <= pc && (r = cmp(a[pc], a[lo])) >= 0) {
                if (r === 0) { swapCnt = 1; swapEl(a, pc, pd); pd--; }
                pc--;
            }
            if (pb > pc) break;
            swapEl(a, pb, pc);
            swapCnt = 1;
            pb++;
            pc--;
        }
        const pe = lo + n;
        let d1 = Math.min(pa - lo, pb - pa);
        if (d1 > 0) vecswap(a, lo, pb - d1, d1);
        d1 = Math.min(pd - pc, pe - pd - 1);
        if (d1 > 0) vecswap(a, pb, pe - d1, d1);

        if (swapCnt === 0) { /* Switch to insertion sort */
            const r = 1 + Math.floor(n / 4);
            if (isort(a, lo, n, cmp, r))
                return;
            /* goto nevermind */
        }
        d1 = pb - pa;
        const d2 = pd - pc;
        if (d1 <= d2) {
            if (d1 > 1) _qsort(a, lo, d1, cmp, depthLimit);
            if (d2 > 1) { lo = pe - d2; n = d2; continue; }
        } else {
            if (d2 > 1) _qsort(a, pe - d2, d2, cmp, depthLimit);
            if (d1 > 1) { n = d1; continue; }
        }
        return;
    }
}

/* C int result of a JS comparator: only the sign matters to qsort.c, and a
 * NaN/undefined/false is 0 in the C it mirrors. */
function sgn(c) {
    return c > 0 ? 1 : c < 0 ? -1 : 0;
}

/* macOS libc qsort(3) on a JS array, in place.  cmp(x, y) -> number. */
export function macos_qsort(a, cmp) {
    const n = a.length;
    _qsort(a, 0, n, (x, y) => sgn(cmp(x, y)), 2 * (fls(n) - 1));
    return a;
}

export function nh_qsort(arr, compar, nmemb = arr.length) {
    if (!arr || !compar || nmemb < 2) return arr;
    const order = new Array(nmemb);
    for (let i = 0; i < nmemb; ++i) order[i] = i;
    const base = arr.slice(0, nmemb);
    macos_qsort(order, (ia, ib) => {
        const c = sgn(compar(base[ia], base[ib]));
        if (c) return c;
        return ia < ib ? -1 : (ia > ib ? 1 : 0);
    });
    for (let i = 0; i < nmemb; ++i) arr[i] = base[order[i]];
    return arr;
}

/* Same as nh_qsort for comparators that are async (a port that awaits inside
 * its comparator, e.g. a namer).  The comparison sequence is computed with a
 * synchronous replay: each needed comparison result is awaited before the
 * sort step that consumes it, by re-running the sort from scratch with the
 * results learned so far (results are memoised per (ia, ib) ordered pair in
 * call order, so the comparator runs exactly once per C call, in C's order). */
export async function nh_qsort_async(arr, compar, nmemb = arr.length) {
    if (!arr || !compar || nmemb < 2) return arr;
    const base = arr.slice(0, nmemb);
    const results = []; /* sequence of C-call results, in call order */
    for (;;) {
        const order = new Array(nmemb);
        for (let i = 0; i < nmemb; ++i) order[i] = i;
        let k = 0, need = null;
        try {
            macos_qsort(order, (ia, ib) => {
                if (k < results.length) {
                    const c = results[k++];
                    if (c) return c;
                    return ia < ib ? -1 : (ia > ib ? 1 : 0);
                }
                need = [ia, ib];
                throw NEED;
            });
        } catch (e) {
            if (e !== NEED) throw e;
            results.push(sgn(await compar(base[need[0]], base[need[1]])));
            continue;
        }
        for (let i = 0; i < nmemb; ++i) arr[i] = base[order[i]];
        return arr;
    }
}
const NEED = { nhsortNeed: true };
