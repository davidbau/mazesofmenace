// sfbase.js — save file I/O: the NHFILE handle and the Sfo_/Sfi_ field
// writers/readers.
// C ref: sfbase.c (Sfo_*/Sfi_* dispatch), sfstruct.c (struct-level I/O),
// files.c new_nhfile()/close_nhfile()/rewind_nhfile().
//
// The byte format of C's save file is not observable, so a JS NHFILE
// holds a list of [tag, value] records instead of bytes.  Each Sfo_ call
// appends one record with C's tag ("gamestate-moves", "monst", ...), and
// the matching Sfi_ call reads the next record back, checking the tag.
//
// Values are copied by structure, like C writing a struct's bytes:
//  - plain data (numbers, strings, arrays, plain objects, Maps, typed
//    arrays) is copied; sharing inside one record is kept;
//  - an object or monster met inside another record's value is written as
//    its o_id / m_id, the way C keeps such links as ids
//    (context.victual.o_id, u.ustuck_mid, ...) and re-links them after
//    restoring; restore.js resolves them (resolve_saved_ids());
//  - entries of the static tables (mons[], objects[]) are written as
//    their index, the way C saves mtmp->mnum and sets data = &mons[mnum].

import { game } from './gstate.js';
import { mons } from './monsters.js';
import { objects } from './objects.js';
import { makeLocation, GameMap } from './game.js';
import { READING } from './const.js';

// C ref: files.c new_nhfile()
export function new_nhfile() {
    return {
        ftype: 0,
        mode: READING,
        structlevel: true,
        fieldlevel: false,
        addinfo: false,
        eof: false,
        fd: -1,
        name: null,
        recs: [],    /* the file contents: [tag, value] records */
        rpos: 0,     /* read position */
        fixups: [],  /* id links read from the file, see Sfi() */
    };
}

// C ref: files.c close_nhfile() -- writing files are flushed by the
// caller-specific create_*file()/close step (see files.js)
export function close_nhfile(nhfp) {
    if (nhfp && nhfp.onclose)
        nhfp.onclose(nhfp);
}

// C ref: files.c rewind_nhfile()
export function rewind_nhfile(nhfp) {
    nhfp.rpos = 0;
    nhfp.eof = false;
}

// ---------------------------------------------------------------------
// static tables: written as indices

let static_index = null;
function static_ref(v) {
    if (!static_index || static_index.mons !== mons || static_index.objects !== objects
        || static_index.size !== mons.length + objects.length) {
        const map = new Map();
        mons.forEach((p, i) => map.set(p, ['mons', i]));
        objects.forEach((o, i) => map.set(o, ['objects', i]));
        static_index = { map, mons, objects, size: mons.length + objects.length };
    }
    return static_index.map.get(v) || null;
}

function static_value(ref) {
    const [table, i] = ref;
    if (table === 'mons') return mons[i];
    if (table === 'objects') return objects[i];
    throw new Error(`Sfi(): static table ${table} not ported yet`);
}

/* C struct obj / struct monst, as the JS port shapes them */
export function is_obj_struct(v) {
    return typeof v.o_id === 'number' && 'otyp' in v && 'oclass' in v;
}
export function is_monst_struct(v) {
    return typeof v.m_id === 'number' && 'data' in v && 'mx' in v;
}

// ---------------------------------------------------------------------
// encoding

/* struct rm (makeLocation()) has accessor fields (doormask); its data
   fields are copied and the accessors come back from makeLocation() */
function is_rm_struct(v) {
    const d = Object.getOwnPropertyDescriptor(v, 'doormask');
    return !!(d && d.get);
}

const CLASSES = { GameMap };

function enc(v, ctx, top) {
    if (v === null) return null;
    switch (typeof v) {
    case 'number':
        if (Number.isFinite(v)) return v;
        return { $n: String(v) };
    case 'string':
    case 'boolean':
        return v;
    case 'undefined':
        return { $u: 1 };
    case 'bigint':
        return { $b: String(v) };
    case 'function':
        throw new Error(`Sfo(): function-valued field in ${ctx.tag} not ported yet`);
    case 'symbol':
        throw new Error(`Sfo(): symbol-valued field in ${ctx.tag} not ported yet`);
    default:
        break;
    }
    const st = static_ref(v);
    if (st) return { $s: st };
    if (!top) {
        if (v === game.youmonst) return { $you: 1 };
        if (is_obj_struct(v)) return { $O: v.o_id };
        if (is_monst_struct(v)) return { $M: v.m_id };
    }
    if (ctx.seen.has(v)) return { $r: ctx.seen.get(v) };
    const id = ctx.next++;
    ctx.seen.set(v, id);
    if (Array.isArray(v)) {
        const out = new Array(v.length);
        for (let i = 0; i < v.length; i++)
            out[i] = (i in v) ? enc(v[i], ctx, false) : { $h: 1 };
        return { $a: id, v: out };
    }
    if (ArrayBuffer.isView(v))
        return { $t: v.constructor.name, id, v: Array.from(v) };
    if (v instanceof Map)
        return { $m: id, v: [...v].map(([k, x]) => [enc(k, ctx, false), enc(x, ctx, false)]) };
    if (v instanceof Set)
        return { $set: id, v: [...v].map(x => enc(x, ctx, false)) };
    const proto = Object.getPrototypeOf(v);
    let cls = null;
    if (proto !== Object.prototype && proto !== null) {
        cls = proto.constructor?.name;
        if (!CLASSES[cls])
            throw new Error(`Sfo(): ${cls} value in ${ctx.tag} not ported yet`);
    }
    const o = {};
    for (const k of Object.keys(v)) {
        const d = Object.getOwnPropertyDescriptor(v, k);
        if (d.get || d.set) continue; /* accessor: recreated on restore */
        o[k] = enc(d.value, ctx, false);
    }
    const r = { $o: id, v: o };
    if (cls) r.c = cls;
    if (is_rm_struct(v)) r.rm = 1;
    return r;
}

// ---------------------------------------------------------------------
// decoding

function dec(x, ctx, holder, key) {
    if (x === null || typeof x !== 'object') return x;
    if ('$n' in x) return Number(x.$n);
    if ('$u' in x) return undefined;
    if ('$b' in x) return BigInt(x.$b);
    if ('$s' in x) return static_value(x.$s);
    if ('$you' in x) return game.youmonst;
    if ('$O' in x || '$M' in x) {
        /* an object/monster link: resolved once everything is restored */
        if (holder)
            ctx.fixups.push({ holder, key, kind: ('$O' in x) ? 'O' : 'M',
                              id: ('$O' in x) ? x.$O : x.$M });
        return null;
    }
    if ('$r' in x) return ctx.refs.get(x.$r);
    if ('$a' in x) {
        const out = new Array(x.v.length);
        ctx.refs.set(x.$a, out);
        for (let i = 0; i < x.v.length; i++) {
            const e = x.v[i];
            if (e && typeof e === 'object' && '$h' in e) continue; /* hole */
            out[i] = dec(e, ctx, out, i);
        }
        return out;
    }
    if ('$t' in x) {
        const T = globalThis[x.$t];
        const out = T ? T.from(x.v) : x.v.slice();
        ctx.refs.set(x.id, out);
        return out;
    }
    if ('$m' in x) {
        const out = new Map();
        ctx.refs.set(x.$m, out);
        for (const [k, v] of x.v) {
            const dk = dec(k, ctx, null, null);
            out.set(dk, dec(v, ctx, out, dk));
        }
        return out;
    }
    if ('$set' in x) {
        const out = new Set();
        ctx.refs.set(x.$set, out);
        for (const v of x.v) out.add(dec(v, ctx, null, null));
        return out;
    }
    if ('$o' in x) {
        let out;
        if (x.rm)
            out = makeLocation();
        else if (x.c)
            out = Object.create(CLASSES[x.c].prototype);
        else
            out = {};
        ctx.refs.set(x.$o, out);
        for (const k of Object.keys(x.v))
            out[k] = dec(x.v[k], ctx, out, k);
        return out;
    }
    throw new Error('Sfi(): bad save file record');
}

// ---------------------------------------------------------------------
// Sfo_/Sfi_: one record per call

/* write 'value' as one record; 'top' is true when value itself is the
   struct obj/monst being saved (saveobj()/savemon()) rather than a link */
export function Sfo(nhfp, value, tag, top = false) {
    const ctx = { seen: new Map(), next: 1, tag };
    nhfp.recs.push([tag, enc(value, ctx, top)]);
}

/* read the next record, which must have been written with 'tag' */
export function Sfi(nhfp, tag) {
    if (nhfp.rpos >= nhfp.recs.length) {
        nhfp.eof = true;
        return undefined;
    }
    const [rtag, val] = nhfp.recs[nhfp.rpos++];
    if (rtag !== tag)
        throw new Error(`Sfi(): save file out of step: read ${rtag}, wanted ${tag}`);
    const ctx = { refs: new Map(), fixups: nhfp.fixups };
    return dec(val, ctx, null, null);
}

/* peek: is the file at its end? */
export function Sf_eof(nhfp) {
    return nhfp.rpos >= nhfp.recs.length;
}

// serialized form used by files.js for storage
export function nhfile_contents(nhfp) {
    return JSON.stringify(nhfp.recs);
}
export function nhfile_from_contents(nhfp, text) {
    nhfp.recs = JSON.parse(text);
    nhfp.rpos = 0;
    nhfp.eof = false;
}
