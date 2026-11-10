/* Lua5.4.8 ltablib.c sort/partition/choosePivot; Lua notice in lua/lobject.js.
 * Comparator and table metamethod order are observable. Native adapters inject
 * the original clock/time entropy. A standalone VM uses JS clock sources;
 * callers can assign vm.sortRandomize for a controlled host entropy policy. */
import { LuaError, luaType, toInteger, truth } from './lua/lobject.js';

export function luaSortEntropy(clock, time) {
  const c = BigInt.asUintN(64, BigInt(clock)), t = BigInt.asUintN(64, BigInt(time));
  return Number(BigInt.asUintN(32, (c & 0xffffffffn) + (c >> 32n) + (t & 0xffffffffn) + (t >> 32n)));
}

export function sortLuaTable(vm, table, comparator = null) {
  const length = toInteger(vm.length(table));
  if (length === null) throw new LuaError('object length is not an integer');
  if (length <= 1n) return [];
  if (length >= 2147483647n) throw new LuaError('array too big');
  if (comparator !== null && luaType(comparator) !== 'function') throw new LuaError('function expected');
  // Mirror ltablib's temporary C-stack slots, including their exact pop order.
  // A table metamethod/comparator may collect while these values are live.
  const stack = [], roots = {table, comparator, stack}; vm.heap?.transient.add(roots);
  const get = i => stack.push(vm.get(table, BigInt(i)));
  const pop = (n = 1) => { stack.length -= n; };
  const set = i => { vm.set(table, BigInt(i), stack.at(-1)); pop(); };
  const set2 = (i,j) => { set(i); set(j); };
  const less = (a,b) => {
    const left=stack.at(a), right=stack.at(b);
    return comparator === null ? vm.binary('<',left,right) : truth(vm.call(comparator,[left,right])[0] ?? null);
  };
  const randomize = () => Number(BigInt.asUintN(32, BigInt(vm.sortRandomize ? vm.sortRandomize() : luaSortEntropy(
    Math.trunc((typeof performance === 'undefined' ? Date.now() : performance.now()) * 1000), Math.trunc(Date.now() / 1000)))));
  const sort = (lo, up, rnd) => {
    while (lo < up) {
      get(lo); get(up);
      if (less(-1,-2)) set2(lo,up); else pop(2);
      if (up - lo === 1) return;
      const quarter = Math.trunc((up - lo) / 4);
      let p = up - lo < 100 || rnd === 0 ? Math.trunc((lo + up) / 2) : rnd % (quarter * 2) + lo + quarter;
      get(p); get(lo);
      if (less(-2,-1)) set2(p,lo);
      else { pop(); get(up); if (less(-1,-2)) set2(p,up); else pop(2); }
      if (up - lo === 2) return;
      get(p); stack.push(stack.at(-1)); get(up-1); set2(p,up-1);
      let i = lo, j = up - 1;
      while (true) {
        do { get(++i); if (!less(-1,-2)) break; if (i === up - 1) throw new LuaError('invalid order function for sorting'); pop(); } while (true);
        do { get(--j); if (!less(-3,-1)) break; if (j < i) throw new LuaError('invalid order function for sorting'); pop(); } while (true);
        if (j < i) { pop(); set2(up-1,i); p=i; break; }
        set2(i,j);
      }
      let n;
      if (p - lo < up - p) { sort(lo, p - 1, rnd); n = p - lo; lo = p + 1; }
      else { sort(p + 1, up, rnd); n = up - p; up = p - 1; }
      if (Math.trunc((up - lo) / 128) > n) rnd = randomize();
    }
  };
  try { sort(1, Number(length), 0); return []; }
  finally { vm.heap?.transient.delete(roots); }
}
