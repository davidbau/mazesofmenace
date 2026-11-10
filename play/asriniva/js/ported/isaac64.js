/*Written by Timothy B. Terriberry (tterribe@xiph.org) 1999-2009
  CC0 (Public domain) - see http://creativecommons.org/publicdomain/zero/1.0/
  for details.
  Based on the public domain ISAAC implementation by Robert J. Jenkins Jr.*/

/*
 * Changes for NetHack:
 *      include config.h;
 *      skip rest of file if USE_ISAAC64 isn't defined there;
 *      re-do 'inline' handling.
 */

/* JavaScript translation of src/isaac64.c.
 * C's includes, conditional compilation, declarations and inline qualifiers
 * have no runtime equivalent here. Constants below also come from isaac64.h.
 * BigInt operations use an explicit mask for uint64_t local assignments;
 * BigUint64Array element assignments perform that wrapping automatically.
 * Array indices are Numbers; uint64_t values and shifts are BigInts.
 */
// Original C fallback declaration: #define inline /*empty*/
const ISAAC64_MASK = 0xFFFFFFFFFFFFFFFFn;
const ISAAC64_SZ_LOG = 8;
const ISAAC64_SZ = 1 << ISAAC64_SZ_LOG;
const ISAAC64_SEED_SZ_MAX = ISAAC64_SZ << 3;

/* Extract ISAAC64_SZ_LOG bits (starting at bit 3). */
function lower_bits(x)
{
    return Number((x & BigInt((ISAAC64_SZ-1) << 3)) >> 3n);
}

/* Extract next ISAAC64_SZ_LOG bits (starting at bit ISAAC64_SZ_LOG+2). */
function upper_bits(y)
{
    return Number((y >> BigInt(ISAAC64_SZ_LOG+3)) & BigInt(ISAAC64_SZ-1));
}

function isaac64_update(_ctx){
  let m;
  let r;
  let a;
  let b;
  let x;
  let y;
  let i;
  m=_ctx.m;
  r=_ctx.r;
  a=_ctx.a;
  _ctx.c=(_ctx.c+1n)&ISAAC64_MASK;
  b=(_ctx.b+_ctx.c)&ISAAC64_MASK;
  for(i=0;i<ISAAC64_SZ/2;i++){
    x=m[i];
    a=(~(a^a<<21n)+m[i+ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a>>5n)+m[i+ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a<<12n)+m[i+ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a>>33n)+m[i+ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
  }
  for(i=ISAAC64_SZ/2;i<ISAAC64_SZ;i++){
    x=m[i];
    a=(~(a^a<<21n)+m[i-ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a>>5n)+m[i-ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a<<12n)+m[i-ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
    x=m[++i];
    a=((a^a>>33n)+m[i-ISAAC64_SZ/2])&ISAAC64_MASK;
    m[i]=y=(m[lower_bits(x)]+a+b)&ISAAC64_MASK;
    r[i]=b=(m[upper_bits(y)]+x)&ISAAC64_MASK;
  }
  _ctx.b=b;
  _ctx.a=a;
  _ctx.n=ISAAC64_SZ;
}

function isaac64_mix(_x){
  const SHIFT=[9n,9n,23n,15n,14n,20n,17n,14n];
  let i;
  for(i=0;i<8;i++){
    _x[i]-=_x[(i+4)&7];
    _x[(i+5)&7]^=_x[(i+7)&7]>>SHIFT[i];
    _x[(i+7)&7]+=_x[i];
    i++;
    _x[i]-=_x[(i+4)&7];
    _x[(i+5)&7]^=_x[(i+7)&7]<<SHIFT[i];
    _x[(i+7)&7]+=_x[i];
  }
}


export function isaac64_init(_ctx,_seed,_nseed){
  _ctx.a=_ctx.b=_ctx.c=0n;
  _ctx.r.fill(0n);
  isaac64_reseed(_ctx,_seed,_nseed);
}

export function isaac64_reseed(_ctx,_seed,_nseed){
  let m;
  let r;
  const x=new BigUint64Array(8);
  let i;
  let j;
  m=_ctx.m;
  r=_ctx.r;
  if(_nseed>ISAAC64_SEED_SZ_MAX)_nseed=ISAAC64_SEED_SZ_MAX;
  for(i=0;i<_nseed>>3;i++){
    r[i]^=BigInt(_seed[i<<3|7])<<56n|BigInt(_seed[i<<3|6])<<48n|
     BigInt(_seed[i<<3|5])<<40n|BigInt(_seed[i<<3|4])<<32n|
     BigInt(_seed[i<<3|3])<<24n|BigInt(_seed[i<<3|2])<<16n|
     BigInt(_seed[i<<3|1])<<8n|BigInt(_seed[i<<3]);
  }
  _nseed-=i<<3;
  if(_nseed>0){
    let ri;
    ri=BigInt(_seed[i<<3]);
    for(j=1;j<_nseed;j++)ri|=BigInt(_seed[i<<3|j])<<BigInt(j<<3);
    r[i++]^=ri;
  }
  x[0]=x[1]=x[2]=x[3]=x[4]=x[5]=x[6]=x[7]=0x9E3779B97F4A7C13n;
  for(i=0;i<4;i++)isaac64_mix(x);
  for(i=0;i<ISAAC64_SZ;i+=8){
    for(j=0;j<8;j++)x[j]+=r[i+j];
    isaac64_mix(x);
    m.set(x,i);
  }
  for(i=0;i<ISAAC64_SZ;i+=8){
    for(j=0;j<8;j++)x[j]+=m[i+j];
    isaac64_mix(x);
    m.set(x,i);
  }
  isaac64_update(_ctx);
}

export function isaac64_next_uint64(_ctx){
  if(!_ctx.n)isaac64_update(_ctx);
  return _ctx.r[--_ctx.n];
}

export function isaac64_next_uint(_ctx,_n){
  let r;
  let v;
  let d;
  do{
    r=isaac64_next_uint64(_ctx);
    v=r%_n;
    d=r-v;
  }
  while(((d+_n-1n)&ISAAC64_MASK)<d);
  return v;
}

/* USE_ISAAC64 */

/*isaac64.c*/
