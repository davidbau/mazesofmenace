// js/crt/isaac64-glue.js: adapter from rnd.c's ISAAC64 calls to the frozen
// js/isaac64.js (annotation groups.isaac64; contract: the RNG must use the
// frozen implementation). Hand-written runtime.
//
// C: isaac64_init(isaac64_ctx *ctx, const unsigned char *seed, int nseed) and
// isaac64_next_uint64(isaac64_ctx *ctx). The frozen module returns its own
// context object, kept on the transpiled record as $ctx; the record's C fields
// are not used by rnd.c.
import * as frozen from '../isaac64.js';
import { u64 } from './int.js';

export function isaac64_init(ctx, seed, nseed) {
    const bytes = [];
    for (let i = 0; i < nseed; i++) bytes.push(seed.get(i) & 0xff);
    ctx.$ctx = frozen.isaac64_init(bytes);
}
export function isaac64_reseed(ctx, seed, nseed) {
    const bytes = [];
    for (let i = 0; i < nseed; i++) bytes.push(seed.get(i) & 0xff);
    frozen.isaac64_reseed(ctx.$ctx, bytes);
}
export const isaac64_next_uint64 = (ctx) => u64(frozen.isaac64_next_uint64(ctx.$ctx));
export const isaac64_next_uint = (ctx, n) => u64(frozen.isaac64_next_uint(ctx.$ctx, BigInt(n)));
