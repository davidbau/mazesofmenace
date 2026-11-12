// host/qsort.js - musl's qsort(), in JS.
//
// The port's C library is musl, whose qsort is a smoothsort.  NetHack itself sorts
// through nh_deterministic_qsort() (hacklib.c, recorder patch 002), which
// breaks ties by original index so that every libc gives the same order
// for a consistent comparator.  This port goes further and makes the same
// comparator calls in the same order as musl, so even a comparator with
// side effects or an inconsistent one behaves as with musl's qsort.
//
// Smoothsort: Copyright (C) 2011 by Lynn Ochs, MIT licence; integrated in
// musl by Rich Felker (src/stdlib/qsort.c).  Transcribed to JS over the
// heap: `base` is an address, `cmp(a, b)` receives two element addresses
// (C `const void *`) and returns an int.  size_t is 32 bits (wasm32).

const WORD = 32;
const AR_LEN = 16 * 4;
const AR_MASK = AR_LEN - 1;

function ntz(x) {
  return 31 - Math.clz32(x & -x);
}

// index of the first set bit above bit 0 of the 64-bit pair p (p[0] low)
function pntz(p) {
  if (p[0] !== 1) return ntz((p[0] - 1) >>> 0);
  if (p[1]) return WORD + ntz(p[1]);
  return 0;
}

function shl(p, n) {
  if (n >= WORD) {
    n -= WORD;
    p[1] = p[0];
    p[0] = 0;
    if (!n) return;
  }
  p[1] = ((p[1] << n) | (p[0] >>> (WORD - n))) >>> 0;
  p[0] = (p[0] << n) >>> 0;
}

function shr(p, n) {
  if (n >= WORD) {
    n -= WORD;
    p[0] = p[1];
    p[1] = 0;
    if (!n) return;
  }
  p[0] = ((p[0] >>> n) | (p[1] << (WORD - n))) >>> 0;
  p[1] = p[1] >>> n;
}

/**
 * qsort(base, nel, width, cmp) on the heap given by mem.HEAPU8 (re-read after
 * every comparison: the comparator may grow memory).
 */
export function qsort(mem, base, nel, width, cmp) {
  const size = width * nel;
  if (!size) return;
  const tmp = new Uint8Array(width);

  // ar[0] <- ar[1] <- ... <- ar[n-1] <- old ar[0]
  function cycle(ar, n) {
    if (n < 2) return;
    const H = mem.HEAPU8;
    tmp.set(H.subarray(ar[0], ar[0] + width));
    for (let i = 0; i < n - 1; i++) H.copyWithin(ar[i], ar[i + 1], ar[i + 1] + width);
    H.set(tmp, ar[n - 1]);
  }

  function sift(head, pshift, lp) {
    const ar = [head];
    let i = 1;
    while (pshift > 1) {
      const rt = head - width;
      const lf = head - width - lp[pshift - 2];
      if (cmp(ar[0], lf) >= 0 && cmp(ar[0], rt) >= 0) break;
      if (cmp(lf, rt) >= 0) {
        ar[i++ & AR_MASK] = lf;
        head = lf;
        pshift -= 1;
      } else {
        ar[i++ & AR_MASK] = rt;
        head = rt;
        pshift -= 2;
      }
    }
    cycle(ar, i & AR_MASK);
  }

  function trinkle(head, pp, pshift, trusty, lp) {
    const p = [pp[0], pp[1]];
    const ar = [head];
    let i = 1;
    while (p[0] !== 1 || p[1] !== 0) {
      const stepson = head - lp[pshift];
      if (cmp(stepson, ar[0]) <= 0) break;
      if (!trusty && pshift > 1) {
        const rt = head - width;
        const lf = head - width - lp[pshift - 2];
        if (cmp(rt, stepson) >= 0 || cmp(lf, stepson) >= 0) break;
      }
      ar[i++ & AR_MASK] = stepson;
      head = stepson;
      const trail = pntz(p);
      shr(p, trail);
      pshift += trail;
      trusty = 0;
    }
    if (!trusty) {
      cycle(ar, i & AR_MASK);
      sift(head, pshift, lp);
    }
  }

  const lp = [width, width];
  for (let i = 2; (lp[i] = lp[i - 2] + lp[i - 1] + width) < size; i++);

  let head = base;
  const high = head + size - width;
  const p = [1, 0];
  let pshift = 1;

  while (head < high) {
    if ((p[0] & 3) === 3) {
      sift(head, pshift, lp);
      shr(p, 2);
      pshift += 2;
    } else {
      if (lp[pshift - 1] >= high - head) trinkle(head, p, pshift, 0, lp);
      else sift(head, pshift, lp);
      if (pshift === 1) {
        shl(p, 1);
        pshift = 0;
      } else {
        shl(p, pshift - 1);
        pshift = 1;
      }
    }
    p[0] = (p[0] | 1) >>> 0;
    head += width;
  }

  trinkle(head, p, pshift, 0, lp);

  while (pshift !== 1 || p[0] !== 1 || p[1] !== 0) {
    if (pshift <= 1) {
      const trail = pntz(p);
      shr(p, trail);
      pshift += trail;
    } else {
      shl(p, 2);
      pshift -= 2;
      p[0] = (p[0] ^ 7) >>> 0;
      shr(p, 1);
      trinkle(head - lp[pshift] - width, p, pshift + 1, 1, lp);
      shl(p, 1);
      p[0] = (p[0] | 1) >>> 0;
      trinkle(head - width, p, pshift, 1, lp);
    }
    head -= width;
  }
}
