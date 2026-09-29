// js/struct_reconstructor.js
//
// Reconstructs C struct objects from per-function capture records for use in
// the generic replay oracle (tools/equiv-test/auto-replay-sweep.mjs).
//
// The C auto-trampolines (harness/capture_auto_trampolines.c Wave 6) extract
// a fixed set of struct fields as named integer args in the capture JSON:
//   { "obj_o_id": 7, "obj_otyp": 45, "obj_quan": 1, ... }
// This module turns those flat fields back into a JS object the port function
// can be called with.
//
// SELF-VALIDATION MECHANISM: each reconstructed object is wrapped in a Proxy
// that throws TypeError on any field access that wasn't captured. When the JS
// port function accesses an uncaptured field, the test fails with:
//   TypeError: struct obj* field 'nobj' was not captured
// The field-gap-report (tools/measurement/field-gap-report.mjs) reads these
// errors and suggests adding 'nobj' to STRUCT_FIELDS in
// tools/generate-auto-trampolines.mjs. This closes the empirical loop:
//   capture → replay → error → add field → regenerate → re-capture → replay again
//
// This file lives in js/ so it can be imported by both the sweep and
// (eventually) test utilities. It does NOT participate in the contest scoring
// path and is never imported by the main game bundle.

// permonstTemplate(mndx) materializes mon->data (the read-only mons[] template)
// from the captured data_mndx (= mon->data->pmidx). makemon.js owns the monster
// tables; it does not import this module, so no import cycle. (replay-only path)
import { permonstTemplate } from './makemon.js';

// LOCKSTEP: this map MUST stay byte-identical to STRUCT_FIELDS in
// tools/generate-auto-trampolines.mjs. The generator drives C-side capture
// (capture_arg_int("<name>_<field>", ...)); this map drives JS-side
// reconstruction (extractFields + the strict Proxy). Adding a field in only
// one place is a silent half-fix (see capture-schema-spec.md §2.0).
export const STRUCT_FIELDS = {
    // bypass (obj.h:144 Bitfield): set by bypass_obj/bypass_objlist (worn.c);
    // captured so the arg-state-after oracle (replay-core assertArgsAfter) can
    // observe the obj->bypass=1 mutation. LOCKSTEP with the C generator copy.
    'struct obj *':      ['o_id', 'otyp', 'quan', 'oclass', 'spe', 'where', 'corpsenm',
                          'oartifact', 'timed', 'dknown', 'owornmask', 'bypass',
                          'cursed', 'blessed', 'bknown', 'unpaid', 'known', 'lamplit',
                          'oeaten', 'owt', 'ox', 'oy', 'greased', 'in_use', 'globby', 'oeroded', 'oeroded2',
                          // wsv-V56 scalar batch: obj BUC/lock/charge/erosion scalars
                          // (otrapped is the real field behind the `opoisoned` macro).
                          // LOCKSTEP with generate-auto-trampolines.mjs.
                          'cknown', 'rknown', 'lknown', 'tknown', 'no_charge', 'nomerge',
                          'oerodeproof', 'olocked', 'invlet', 'age', 'otrapped', 'pickup_prev',
                          // wsv-V89 scalar batch: obj migration fields (obj.h:180-181).
                          // omigr_from_dnum/dlevel: xint16 scalars written by add_to_migration
                          // (mkobj.c:2718-2719). LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          'omigr_from_dnum', 'omigr_from_dlevel',
                          // wsv-recorder-batch2 (class #6 body_field remainder):
                          // usecount (aliased `wishedfor`) + how_lost scalars,
                          // plus oextra presence bits (mirrors the monst mextra
                          // presence bits). LOCKSTEP with
                          // tools/generate-auto-trampolines.mjs (full rationale
                          // there).
                          'usecount', 'how_lost',
                          'oextra_present', 'oextra_oname_present',
                          'oextra_omonst_present', 'oextra_omailcmd_present',
                          'oextra_omid',
                          // schema2 (2026-07-14): obj->ocarry carrier scalars
                          // (union v.v_ocarry, valid only when
                          // where==OBJ_MINVENT; -1 = no carrier). reconstructObj
                          // materializes fields.ocarry from these + the
                          // "<name>_ocarry_minvent" side-key. LOCKSTEP with
                          // tools/generate-auto-trampolines.mjs (full rationale
                          // there).
                          'ocarry_m_id', 'ocarry_mx', 'ocarry_my',
                          'ocarry_data_mndx',
                          // stub-capture batch (2026-08-06): recharged
                          // (obj.h:102 `Bitfield(recharged, 3)`; obj.h:103
                          // `#define on_ice recharged` aliases the same
                          // storage). Read by recharge (read.c). Plain scalar
                          // bitfield — same emission path as bypass/greased.
                          // LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          // 2026-09-04: obroken (obj.h:135) — read by mergable() on an
                          // incoming ARG object. LOCKSTEP with
                          // tools/generate-auto-trampolines.mjs.
                          'obroken',
                          'recharged'],
    'struct monst *':    ['m_id', 'mnum', 'mx', 'my', 'mhp', 'm_lev', 'mpeaceful',
                          'minvis', 'mundetected', 'wormno', 'mtrapped', 'mtrapseen',
                          'isshk', 'misc_worn_check',
                          'female', 'mcan', 'msleeping', 'mcanmove', 'mcansee',
                          'cham', 'm_ap_type',
                          'mux', 'muy', 'mconf', 'mtame', 'mspotted', 'mrevived', 'mcloned', 'mspec_used',
                          'ispriest', 'movement', 'weapon_check',
                          'data_mndx',
                          // wsv-V56 scalar batch: monst status/AI scalars read by the
                          // 69-fn scalar-only-blocked cluster. All plain scalar/bitfield
                          // reads on `struct monst *`. LOCKSTEP with the C generator copy.
                          'isminion', 'meating', 'mflee', 'mfrozen', 'mstrategy',
                          'iswiz', 'mstun', 'mleashed', 'isgd', 'mappearance',
                          'mhpmax', 'mfleetim', 'mblinded', 'mspeed', 'mavenge',
                          'mstate', 'malign', 'mlstmv', 'invis_blkd',
                          // wsv-V82 unpark: mon_resistancebits = data->mresists |
                          // mextrinsics | mintrinsics (monst.h:269). Both unsigned
                          // short (monst.h:116-117), read-only scalar reads — same
                          // class as the wsv-V56 batch. Unparks Resists_Elem.
                          // LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          'mextrinsics', 'mintrinsics',
                          // wsv-V89 scalar batch: monst speed/wand intrinsics.
                          //   permspeed (monst.h:134 Bitfield 2): intrinsic speed value.
                          //     Read+written by mon_adjust_speed (worn.c:480).
                          //   mwandexp (monst.h:165 Bitfield 1): wand experience flag.
                          //     Read by use_offensive (mhitm.c).
                          // LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          'permspeed', 'mwandexp',
                          // mw_o_id: canonicalized-pointer scalar for mon->mw
                          // (MON_WEP, monst.h:194/208) — the mon's wielded weapon.
                          // A SYNTHETIC_FIELD (like data_mndx): -1 for NULL mw,
                          // else the pointee's real o_id. mw always aliases a node
                          // already present in mon->minvent, so reconstructMonst
                          // (below) resolves fields.mw by matching this o_id
                          // against the just-built minvent chain rather than
                          // treating it as an independent struct capture. LOCKSTEP
                          // with tools/generate-auto-trampolines.mjs.
                          'mw_o_id',
                          // wsv-recorder-batch2 (docs/HARNESS-GAP-PLAN.md class #6
                          // body_field remainder): perminvis + mextra presence
                          // bits. LOCKSTEP with tools/generate-auto-trampolines.mjs
                          // (see that file's comment for the full rationale).
                          'perminvis',
                          // harness-unpark 2026-07-16: mburied (monst.h:126
                          // Bitfield 1) — "has been buried", read by
                          // get_mon_location (zap.c:701). Plain scalar
                          // bitfield, same emission path as perminvis.
                          // LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          'mburied',
                          'mextra_present', 'has_egd', 'has_epri', 'has_eshk',
                          'has_emin', 'has_edog', 'has_ebones', 'has_mgivenname',
                          // 2026-09-04: seen_resistance (monst.h:119, unsigned long,
                          // M_SEEN_* bitmask max 0x0100 so it fits an int). Read via
                          // m_seenres(mon, mask) by the muse.c item choosers.
                          // Already present in the fmon side-channel but not in the
                          // ARG path, so replay threw "field 'seen_resistance' was
                          // not captured" on find_offensive and mattacku.
                          // LOCKSTEP with tools/generate-auto-trampolines.mjs.
                          'seen_resistance',
                          'mextra_mcorpsenm'],
    'struct permonst *': ['pmidx', 'mlet', 'geno', 'msize', 'mflags1', 'mflags2'],   // pmidx index into mons[]; mlet/geno/msize/mflags1/mflags2 = read-only template scalars (wsv-V8/V9)
    // trap.h: position + type + tseen (trap.h:39 Bitfield), the seen-flag read
    // by seetrap/uescaped_shaft/uteetering_at_seen_pit. LOCKSTEP with the C
    // generator copy; scalar bitfield, same path as tx/ty/ttyp.
    // wsv-V89: once (trap.h:26 Bitfield 1): one-shot trap flag, read by
    // mtele_trap (trap.c). LOCKSTEP with tools/generate-auto-trampolines.mjs.
    // wsv-recorder-batch2 (class #6): dst/teledest nested d_level/coord VALUE
    // members (dot-notation keys, same mechanism as stairway tolev.*) — see
    // reconstructTrap below for the nesting. LOCKSTEP with the C generator.
    'struct trap *':     ['tx', 'ty', 'ttyp', 'tseen', 'once',
                          'dst.dnum', 'dst.dlevel', 'teledest.x', 'teledest.y'],
    'coord *':           ['x', 'y'],
    // d_level (dungeon.h:9): the (dnum,dlevel) pair. Read flat by
    // stairway_add/schedule_goto/stairway_find_from ({...dest} spreads dnum/dlevel).
    'struct d_level *':  ['dnum', 'dlevel'],
    // mkroom (mkroom.h:11): the fields the captured callers read — add_door
    // reads doorct/fdoor; fill_special_room/selection_from_mkroom read the
    // bounding box (lx/hx/ly/hy) + rtype/rlit/irregular; needfill/nsubrooms
    // round out the sp_lev fill path. Kept minimal-but-sufficient: pointer
    // members (sbrooms/resident) and orig_rtype/needjoining/roomnoidx are NOT
    // read by the captured JS ports, so they are omitted (the strict Proxy will
    // self-report if a future port reads one).
    // wsv-recorder-batch2 (class #6): resident_m_id — mkroom->resident
    // (struct monst *) canonicalized to the pointee's m_id, mirrors mw_o_id.
    // LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'struct mkroom *':   ['lx', 'hx', 'ly', 'hy', 'rtype', 'rlit', 'doorct',
                          'fdoor', 'irregular', 'needfill', 'nsubrooms',
                          'resident_m_id',
                          // harness-unpark 2026-07-16: resident identity
                          // scalars (SYNTHETIC, -1 for NULL resident) so
                          // reconstructMkroom (below) can materialize
                          // sroom.resident as a mini strict monst proxy —
                          // tended_shop's `mtmp = sroom->resident;
                          // inhishop(mtmp)` reads isshk/mx/my (+ eshk via the
                          // "<name>_resident_mextra" side-channel). Mirrors
                          // the obj->ocarry carrier precedent. LOCKSTEP with
                          // tools/generate-auto-trampolines.mjs.
                          'resident_isshk', 'resident_ispriest',
                          'resident_mx', 'resident_my', 'resident_data_mndx'],
    // stairway (stairs.h:8): flat scalars + the nested `tolev` d_level. The
    // nested fields use dot-notation keys (tolev.dnum / tolev.dlevel); the C
    // trampoline emits `s->tolev.dnum` and reconstructStairway() (below) nests
    // them back into { tolev: { dnum, dlevel } } so the JS port reads s.tolev.dnum.
    'struct stairway *': ['sx', 'sy', 'up', 'isladder', 'u_traversed',
                          'tolev.dnum', 'tolev.dlevel'],
    // permonst.h:40 struct attack, plus the SYNTHETIC field 'ai': the
    // array-slot index of this attack within the OWNING (attacker's)
    // data->mattk[NATTK] array, -1 when the C pointer is a getmattk()
    // stack-local substitute (alt_attk_buf) rather than a real array slot.
    // Captured C-side as "<name>_ai" in the mhitm_adtyping trampoline
    // (patches/010-capture-surface.patch) — reconstructAttack() (below)
    // renames it to '_ai' (and -1 -> null) to match the existing
    // js/mhitu.js mattk._ai convention (mattacku stamps it at
    // js/mhitu.js:5846; hitmsg_je reads it at :1010-1012). LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'struct attack *':   ['aatyp', 'adtyp', 'damn', 'damd', 'ai'],
    // hack.h:775 struct selectionvar — flat scalars wid/hei/bounds_dirty plus
    // the nested NhRect `bounds` (dot-notation keys, same mechanism as stairway
    // tolev.*: the C trampoline emits `sel->bounds.lx` and reconstructSelectionvar
    // nests them into { bounds: { lx, ly, hx, hy } }). The `char *map` byte
    // buffer rides an ADDITIVE side-channel "<name>_map" (parseSelectionMap), NOT
    // a positional scalar. LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'struct selectionvar *': ['wid', 'hei', 'bounds_dirty',
                              'bounds.lx', 'bounds.ly', 'bounds.hx', 'bounds.hy'],
    // mfndpos.h:33-37 struct mfndposdata. `cnt` is a plain scalar; poss[9]/
    // info[9] ride the array-string-encoding side-channel (see
    // parseMfndposPoss/parseMfndposInfo below), same mechanism as monst.mtrack.
    // LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'struct mfndposdata *': ['cnt'],

    // wsv-scalar-batch (docs/HARNESS-GAP-PLAN.md class #4): bare scalar
    // OUTPUT pointers modeled as a one-field pseudo-struct { value } — the
    // pointee IS the payload (SYNTHETIC_FIELDS in the C generator emits
    // `*<arg>`, not a `->` member access). LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'int *':             ['value'],
    'coordxy *':         ['value'],
    'boolean *':         ['value'],
    'long *':            ['value'],
    // struct obj **: pointee's canonicalized o_id (-1 for NULL pointee), same
    // shape as struct monst *'s mw_o_id. Resolving the id back to a real obj
    // is left to whichever port needs it (same deferral as mw_o_id).
    'struct obj **':     ['value'],
    // char **: pointee is a char* captured as a JSON string (bespoke C-side
    // branch, capture_arg_string not capture_arg_int) — reconstructFlat is
    // type-agnostic over the field's JS value so this rides the same path.
    'char **':           ['value'],

    // monattk.h:94 struct mhitm_data — the mhitm_ad_* family's INPUT+OUTPUT
    // attack-resolution scratch struct. LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'struct mhitm_data *': ['damage', 'hitflags', 'done', 'permdmg', 'specialdmg', 'dieroll'],

    // sp_lev.h lev_init (mkmap's init_lev) — level-generation init params,
    // anonymous-struct typedef (bare name, no 'struct' keyword). LOCKSTEP
    // with tools/generate-auto-trampolines.mjs.
    'lev_init *':        ['init_style', 'flags', 'filling', 'init_present', 'padding',
                          'fg', 'bg', 'smoothed', 'joined', 'lit', 'walled',
                          'icedpools', 'corrwid', 'wallthick', 'rm_deadends'],

    // wsv-recorder-batch2 (docs/HARNESS-GAP-PLAN.md class #3): NHFILE
    // (hack.h:992-1012 struct nh_file) — flat I/O-handle metadata scalars
    // only (FILE* members, the nested fieldlevel_content substruct, and the
    // self-referential nhfpconvert are deliberately excluded — see the C
    // generator's comment). Does NOT capture the underlying save-file byte
    // stream (deferred). LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'NHFILE *':          ['fd', 'mode', 'ftype', 'fnidx', 'rcount', 'wcount',
                          'structlevel', 'fieldlevel', 'addinfo', 'eof', 'bendian'],

    // wsv-recorder-batch2 (class #5): NhRect (rect.h) — flat scalars. LOCKSTEP
    // with tools/generate-auto-trampolines.mjs.
    'NhRect *':          ['lx', 'ly', 'hx', 'hy'],

    // wsv-recorder-batch2 (class #5): struct mapfragment (sp_lev.h:203) —
    // flat wid/hei; `data` (a NUL-terminated C string) rides an ADDITIVE
    // "<name>_data" side-channel (parseMapfragmentData below), NOT a
    // positional scalar. LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'struct mapfragment *': ['wid', 'hei'],

    // wsv-recorder-batch2 (class #5): mapfrag_free's struct mapfragment ** —
    // no stable id field on the pointee, so `value` is a bare presence bit
    // (1/0), NOT a canonicalized id. LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'struct mapfragment **': ['value'],

    // wsv-recorder-batch2 (class #5): relmon's struct monst ** — pointee's
    // canonicalized m_id (-1 for NULL), mirrors 'struct obj **'. LOCKSTEP
    // with tools/generate-auto-trampolines.mjs.
    'struct monst **':   ['value'],

    // wsv-recorder-batch2 (class #5): branch (dungeon.h:81) — place_branch's
    // first arg. end1/end2 are nested d_level VALUE members (dot-notation
    // keys, same tolev.*/dst.* mechanism); `next` (self-link) is omitted
    // (place_branch never walks the chain). LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'branch *':          ['id', 'type', 'end1.dnum', 'end1.dlevel',
                          'end2.dnum', 'end2.dlevel', 'end1_up'],

    // wsv-struct-type-batch (fleet-frontier-capture-bound-2026-07-12 audit):
    // context.h:59 struct victual_info. `piece` (nested struct obj *) is
    // omitted — no captured caller reads it through this arg. LOCKSTEP with
    // tools/generate-auto-trampolines.mjs.
    'struct victual_info *': ['o_id', 'usedtime', 'reqtime', 'nmod',
                              'canchoke', 'fullwarn', 'eating', 'doreset'],

    // wsv-struct-type-batch: skills.h:123 struct def_skill — two xint16
    // scalars. LOCKSTEP with tools/generate-auto-trampolines.mjs.
    'struct def_skill *': ['skill', 'skmax'],

    // wsv-struct-type-batch: hack.h:853 Loot (typedef struct sortloot_item).
    // unsortloot's loot_array_p — same bare presence-bit shape as
    // 'struct mapfragment **' (pointee has no stable id field). LOCKSTEP
    // with tools/generate-auto-trampolines.mjs.
    'Loot **':           ['value'],
};

// Type-string normalization mirroring tools/generate-auto-trampolines.mjs
// TYPE_NORMALIZE: the inventory records some pointer params with the bare
// typedef name (e.g. `d_level *`, `stairway *`) and others with the `struct`
// keyword (`struct stairway *`). The C generator keys STRUCT_FIELDS by the
// canonical `struct ...` form, so the reconstructor must normalize the cType
// the sweep passes (p.type, raw inventory string) the same way before lookup.
const TYPE_NORMALIZE = {
    'obj *':       'struct obj *',
    'monst *':     'struct monst *',
    'permonst *':  'struct permonst *',
    'trap *':      'struct trap *',
    'mkroom *':    'struct mkroom *',
    'd_level *':   'struct d_level *',
    'stairway *':  'struct stairway *',
    // cmdcount_nht is `typedef long cmdcount_nht;` (hack.h:199) — fold
    // get_count's `count` arg into the 'long *' output-pointer convention.
    'cmdcount_nht *': 'long *',
};
export function normalizeType(t) {
    return TYPE_NORMALIZE[t] ?? t;
}

// DERIVED (JS-side) field aliases: fields the JS PORT reads that are NOT
// distinct C struct members, but are provably EQUAL to a captured field by a
// C invariant. These are populated on the reconstructed object so the strict
// Proxy permits the access, WITHOUT being added to STRUCT_FIELDS (which is the
// C-capture lockstep contract — only real C members belong there, or the
// generator would emit `arg-><alias>` and fail to compile).
//
//   monst.mndx ← mnum:
//     The JS port's monsndx(mtmp) reads `mtmp.mndx ?? mtmp.mnum`
//     (js/makemon.js:830). `mndx` is NOT a `struct monst` member (monst.h:95
//     has `short mnum` "permanent monster index number" but no `mndx`). In C,
//     `mndx` is the local result of `monsndx(mtmp->data)`, and set_mon_data /
//     newmcham keep `mtmp->mnum == monsndx(mtmp->data)` as an INVARIANT — mon.c
//     even calls impossible() and repairs it if they ever differ (mon.c:75-82).
//     So the captured `mnum` IS the `mndx` value the port wants; we alias it.
//     This unblocks rnd_defensive_item / rnd_misc_item / rnd_offensive_item
//     (js/makemon.js, js/m_initweap.js) which call monsndx(mtmp) and previously
//     hit `struct monst * field 'mndx' was not captured` on the Proxy.
export const DERIVED_ALIASES = {
    'struct monst *': { mndx: 'mnum' },
    // schema2 (2026-07-14): obj.h token-macro FIELD ALIASES — the SAME storage
    // as their source field (#define leashmon corpsenm obj.h:161,
    // #define next_boulder corpsenm obj.h:165, #define opoisoned otrapped
    // obj.h:139, #define wishedfor usecount obj.h:170). Materializing them
    // (a) lets a transliterated port read obj.leashmon faithfully and
    // (b) teaches gen-port-tasks' bodyFieldReadCheck that a `->leashmon` read
    // IS captured — the false-park that kept bury_an_obj/obfree/
    // put_saddle_on_mon in the harness-gaps sidecar after their fields were
    // already live (wsv-V56/recorder-batch2).
    // The oeroded/oeroded2 trio (#define orotten oeroded obj.h:130, #define
    // odiluted oeroded obj.h:131, #define norevive oeroded2 obj.h:132) is the
    // same token-alias class: the storage is ALREADY captured as oeroded /
    // oeroded2, so these are pure aliases and must NOT be added to
    // STRUCT_FIELDS (that would double-capture one bitfield). Without them the
    // strict proxy threw "field 'odiluted' was not captured" on every replayed
    // function that reads one — cxname_singular (js/objnam.js:3075) was 2r/2d
    // for exactly that reason, and js/eat.js, js/potion.js, js/wizcmds.js and
    // js/mklev.js read .orotten/.norevive on the same storage.
    'struct obj *': {
        leashmon: 'corpsenm',
        next_boulder: 'corpsenm',
        opoisoned: 'otrapped',
        wishedfor: 'usecount',
        orotten: 'oeroded',
        odiluted: 'oeroded',
        norevive: 'oeroded2',
    },
};

// Populate any DERIVED_ALIASES for a type onto an already-extracted `fields`
// object: alias = fields[source] when the source field was captured (and the
// alias isn't already present). Mutates and returns `fields`. A no-op for types
// with no aliases. Aliases are added to `fields` BEFORE makeStrictProxy so the
// Proxy's captured-key whitelist (Object.keys(fields)) includes them.
function applyDerivedAliases(fields, typeName) {
    if (!fields) return fields;
    const aliases = DERIVED_ALIASES[typeName];
    if (!aliases) return fields;
    for (const [alias, source] of Object.entries(aliases)) {
        if (Object.prototype.hasOwnProperty.call(fields, alias)) continue;
        if (Object.prototype.hasOwnProperty.call(fields, source)) {
            fields[alias] = fields[source];
        }
    }
    return fields;
}

// Build a null-safe Proxy for a reconstructed struct that throws on any
// access to a field that wasn't in the captured set. This surfaces missing
// fields immediately as a TypeError (ERROR kind in sweep) rather than silently
// returning undefined (which would produce hard-to-diagnose DIVERGED results).
// Marker symbol stamped on obj nodes reconstructed from an obj-CHAIN capture
// (minvent / cobj / nobj tail nodes), which carry ONLY the 11 encoded
// OBJ_CHAIN_FIELD_ORDER fields — a SUBSET of the full obj schema. A function
// that RETURNS such a node (e.g. m_carrying returns a node off mon->minvent)
// cannot be compared field-for-field against the C-captured 37+-field return:
// the node legitimately lacks (and self-reports on) age/owt/… So the return
// comparator (replay-core assertReturnEqual) detects this marker and compares
// by o_id — the stable object identity — instead. Symbol-keyed so it never
// appears in Object.keys (no pollution of the subset compare, no fixture
// drift). LOCKSTEP with the o_id-canonicalization branch in replay-core.mjs.
export const CHAIN_NODE_MARKER = Symbol.for('teleport.chainNode');

// Stamp the marker on a chain-node fields object before proxying. The strict
// proxy already passes symbol reads through to the target, so a marked node's
// receiver[CHAIN_NODE_MARKER] === true. Returns the fields object for chaining.
export function markChainNode(fields) {
    Object.defineProperty(fields, CHAIN_NODE_MARKER, {
        value: true, enumerable: false, writable: false, configurable: false,
    });
    return fields;
}

function makeStrictProxy(fields, typeName) {
    const capturedKeys = new Set(Object.keys(fields));
    return new Proxy(fields, {
        get(target, prop, receiver) {
            // Allow JS built-ins and toString so the proxy doesn't break
            // string interpolation or JSON.stringify.
            if (typeof prop === 'symbol'
                || prop === 'constructor'
                || prop === 'toString'
                || prop === 'valueOf'
                || prop === 'toJSON') {
                return Reflect.get(target, prop, receiver);
            }
            if (!capturedKeys.has(prop)) {
                throw new TypeError(
                    `struct ${typeName} field '${prop}' was not captured — `
                    + `add it to STRUCT_FIELDS['${typeName}'] in `
                    + `tools/generate-auto-trampolines.mjs`
                );
            }
            return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value) {
            // Allow writes (some functions mutate their args in place;
            // we want those writes to succeed so state_after_diff captures
            // the effect rather than crashing before state comparison).
            // schema2 (2026-07-14): a written key becomes READABLE too —
            // C reads back what it wrote, and the replay splice
            // (spliceMonsterAt in command-replay-oracle.mjs) deliberately
            // sets chain links like .nmon to seeded ground-truth values; the
            // old snapshot-only whitelist made the subsequent GET throw
            // "field 'nmon' was not captured" (ledger rows mhitm_ad_stck /
            // find_misc_nmon_strict_proxy). An unwritten uncaptured field
            // still throws — the honesty contract is unchanged for true gaps.
            if (typeof prop !== 'symbol') capturedKeys.add(prop);
            return Reflect.set(target, prop, value);
        },
    });
}

// Strict proxy for a mon->data permonst template (built by makemon.js
// permonstTemplate). Same self-reporting contract as makeStrictProxy, but the
// fix for a missing field is to extend permonstTemplate's column map in
// js/makemon.js (the pmidx is already captured), NOT to touch STRUCT_FIELDS.
function makePermonstDataProxy(tmpl) {
    const keys = new Set(Object.keys(tmpl));
    return new Proxy(tmpl, {
        get(target, prop, receiver) {
            if (typeof prop === 'symbol' || prop === 'constructor'
                || prop === 'toString' || prop === 'valueOf' || prop === 'toJSON') {
                return Reflect.get(target, prop, receiver);
            }
            if (!keys.has(prop)) {
                throw new TypeError(
                    `permonst template field '${String(prop)}' not sourced by `
                    + `permonstTemplate() — add its MONS column to permonstTemplate `
                    + `in js/makemon.js (mon->data->pmidx is already captured)`
                );
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}

// mon->data materializer, shared by the struct-arg reconstructor (below) and by
// the replay bridge's side-channel monster seeding (tools/equiv-test/lib/
// replay-core.mjs seedFmonFromCapture). A monster reconstructed from flat
// capture scalars carries only the INDEX of its permonst row (`data_mndx` on a
// struct-arg capture, `mnum` on the fmon side-channel — mondata.c:13
// set_mon_data holds `mon->mnum == monsndx(mon->data)` as an invariant, so the
// two name the same row); this turns that index into the object C's
// `mon->data` pointer addresses.
//
// Returns null — NOT a default monster — when the index is absent or out of
// range, so a record that genuinely cannot say which permonst row C pointed at
// still fails on the `mtmp.data` read instead of being silently graded against
// mons[0].
//
// C-POINTER IDENTITY. `mon->data` is `&mons[idx]`: two monsters of the same
// species share ONE address, and C compares `ptr == &mons[X]`. permonstTemplate()
// mints a fresh object per call, so an uncached call site would break both
// `a.data === b.data` and any `=== someTemplate` comparison. Callers that
// materialize more than one monster at a time pass a shared `cache` Map so
// same-index monsters get the SAME object, restoring the pointer identity within
// the replayed call. (The project's index-comparison idiom `.pmidx ===` keeps
// working either way; the cache is what makes the pointer form work too.)
export function permonstDataFor(mndx, cache) {
    const i = Number(mndx);
    if (!Number.isFinite(i) || i < 0) return null;
    if (cache && cache.has(i)) return cache.get(i);
    const tmpl = permonstTemplate(i);
    const data = tmpl ? makePermonstDataProxy(tmpl) : null;
    if (cache && data) cache.set(i, data);
    return data;
}

// Presence-only substruct stub (harness-unpark 2026-07-16). The capture
// carries a PRESENCE BIT (has_egd / has_mgivenname / oextra_omonst_present ...)
// for a substruct pointer whose CONTENT is not (or not fully) captured. A
// C-faithful port only needs the pointer's truthiness for the
// allocate-if-absent / free-if-present idioms (dealloc_mextra/dealloc_oextra/
// new_oname/newomid), so we materialize the member as a truthy stub object
// whose every field read THROWS with a named gap — the same self-reporting
// honesty contract as makeStrictProxy, but for "the pointer existed; its
// contents were not captured". NOT invented state: the truthiness IS the
// captured bit; anything deeper self-reports.
function makePresenceStub(label) {
    const written = new Set();
    return new Proxy({}, {
        get(target, prop, receiver) {
            if (typeof prop === 'symbol' || prop === 'constructor'
                || prop === 'toString' || prop === 'valueOf' || prop === 'toJSON'
                || written.has(prop)) {
                return Reflect.get(target, prop, receiver);
            }
            throw new TypeError(
                `presence-only substruct '${label}': only the pointer's `
                + `truthiness was captured (its presence bit); reading `
                + `'.${String(prop)}' needs a content capture channel `
                + `(harness/capture.c)`
            );
        },
        set(target, prop, value) {
            // Writes succeed (a port may null-out / repopulate the member in
            // place); a subsequent read of the written key also succeeds —
            // same write-then-read contract as makeStrictProxy (schema2).
            if (typeof prop !== 'symbol') written.add(prop);
            return Reflect.set(target, prop, value);
        },
    });
}

// Extract the fields for a named struct arg from a flat capturedArgs object.
// Returns { fields, isNull } where fields is { field: value, ... } for the
// extracted entries and isNull=true when <name>_null===1 was recorded.
function extractFields(capturedArgs, name, fieldNames) {
    if (capturedArgs == null) return { fields: null, isNull: true };
    // null-sentinel: the C pointer was NULL at call time
    if (capturedArgs[`${name}_null`] === 1) return { fields: null, isNull: true };
    const out = {};
    for (const f of fieldNames) {
        const key = `${name}_${f}`;
        if (Object.prototype.hasOwnProperty.call(capturedArgs, key)) {
            out[f] = capturedArgs[key];
        }
    }
    // If NO fields were found, the capture predates Wave 6 (still has raw
    // address under <name>_ptr). Signal this as a stale-capture condition.
    if (Object.keys(out).length === 0) return { fields: null, isNull: false, stale: true };
    return { fields: out, isNull: false };
}

// ─── Public API ──────────────────────────────────────────────────────────────

// Field order for each node in an obj-chain (nobj / minvent) capture. The C
// encoder capture_obj_chain_encode() renders EXACTLY these 11 fields per node,
// in this order, separated by ':'. This is a SUBSET of STRUCT_FIELDS['struct
// obj *'] (the full ~39-field obj schema) — the chain encoder is deliberately
// compact (the head's full scalar set is captured separately for the arg head;
// chain TAIL nodes carry only these 11). LOCKSTEP with capture_obj_chain_encode
// in harness/capture.c: this list MUST match the snprintf field order there.
// A node thus exposes ONLY these 11 fields; a port reading an obj field beyond
// them self-reports via the strict proxy (the honest parked-gap signal), rather
// than silently reading NaN.
// wsv-encoding-width: fields 11-14 (no_charge, bypass, cknown, age) APPENDED
// after owornmask — picked_container reads obj->no_charge, bypass_objlist writes
// obj->bypass, contained_gold reads cknown on chain nodes. Positions 0-10 are
// UNCHANGED so pre-widen captures (10-field tokens) still parse (parseObjChainKey
// bounds by min(ORDER.length, parts.length)); a re-captured token carries all 15.
// LOCKSTEP with the snprintf in capture_obj_chain_encode (harness/capture.c).
// ws6g: field 16 'owt' (cached object weight) APPENDED after 'age' — read by the
// gi.invent weight/encumbrance family (inv_weight sums otmp->owt). Positions 0-14
// unchanged so pre-ws6g 15-field tokens still parse (bounded by min(ORDER,parts));
// a re-captured token carries all 16. LOCKSTEP with the snprintf in
// capture_obj_chain_encode / capture_obj_union_chain_encode (harness/capture.c).
// ws7c: fields 17-19 'cursed', 'blessed', 'nomerge' APPENDED after 'owt' — the
// chain encoding carried NO curse-state, so use_towel's cursed branch, select_rwep's
// mwelded/will_weld (cursed on wielded minvent nodes) and add_to_container's
// merged/mergable (cursed/blessed/nomerge on cobj nodes) replayed blind. Positions
// 0-15 unchanged so pre-ws7c 16-field tokens still parse (bounded by
// min(ORDER,parts)); a re-captured token carries all 19. LOCKSTEP as above.
const OBJ_CHAIN_FIELD_ORDER = ['o_id', 'otyp', 'quan', 'oclass', 'spe', 'where',
    'corpsenm', 'oartifact', 'timed', 'dknown', 'owornmask',
    'no_charge', 'bypass', 'cknown', 'age', 'owt',
    'cursed', 'blessed', 'nomerge',
    /* 2026-09-04: fields 19-23 APPENDED, LOCKSTEP with
     * capture_obj_chain_encode_off AND capture_obj_union_chain_encode in
     * patches/010-capture-surface.patch. POSITIONAL — append only, never
     * insert. A chain node is what mon->mw and gi.invent resolve to, so a port
     * reading MON_WEP(mon)->known or an invent node's invlet previously hit the
     * strict proxy even though the field is in STRUCT_FIELDS. */
    'known', 'invlet', 'bknown', 'otrapped', 'obroken',
    /* 2026-09-04: field 24. Without oeaten a partly-eaten corpse replays as
     * fresh and eat.c's partly-eaten arms are unreachable. LOCKSTEP with both
     * chain encoders in patches/010-capture-surface.patch. */
    'oeaten',
    /* 2026-09-04: field 25. A recorded menu search for ":greased" cannot match
     * on replay without it. LOCKSTEP with both chain encoders. */
    'greased',
    /* 2026-09-04: fields 26-27. greatest_erosion() (obj.h:126) reads both,
     * and a chain node is what mon->minvent and mon->mw resolve to — so C's
     * mhitm.c:1279 erode_obj(which_armor(mdef, ...)) made the strict proxy
     * throw on 61 of mhitm_adtyping's records and 5 of mattacku's. LOCKSTEP
     * with both chain encoders in patches/010-capture-surface.patch.
     * POSITIONAL — append only, never insert. */
    'oeroded', 'oeroded2',
    /* 2026-09-05: fields 28-29. A chain node is what mon->mw and gi.invent
     * resolve to, and it carried NO oextra model at all — so has_oname(obj)
     * (js/const.js:2907, obj?.oextra?.oname) hit the strict proxy on every
     * mswings->xname read of a monster's wielded weapon (mattacku's residual
     * "oextra was not captured" class, HANDOFF-2026-09-05 §9.3). The two bits
     * mirror the ARG-head scalars of the same names; the oname STRING content
     * rides the sparse side-keys "<chainkey>_oname_<o_id>" (see the oextra
     * materialization in parseObjChainKey below). LOCKSTEP with both chain
     * encoders in patches/010-capture-surface.patch — POSITIONAL, append only,
     * never insert. */
    'oextra_present', 'oextra_oname_present',
    /* 2026-09-06: fields 30-31. trap.c:251/257/270 (erode_obj's armor-burn
     * path) reads otmp->oerodeproof on a minvent-chain armor node and doname
     * reads rknown — burnarmor 2 of 3 and mattacku 1 threw on the strict
     * proxy. LOCKSTEP with both chain encoders in
     * patches/010-capture-surface.patch — POSITIONAL, append only, never
     * insert. */
    'oerodeproof', 'rknown',
    /* 2026-09-06: field 32, ocarry_m_id — the CARRYING monster's m_id (-1 = no
     * carrier: where != OBJ_MINVENT, where the union slot aliases
     * nexthere/ocontainer, or a NULL ocarry). A minvent chain node is what
     * relobj/xkilled -> distant_name (objnam.c's OBJ_MINVENT arm, reads
     * obj->ocarry->mx/my) resolves to, and it carried no carrier reference —
     * 9 do_attack records hit the strict proxy. Materialized as node.ocarry by
     * attachChainOcarry (below): bound to the owning monst proxy when the
     * chain's owner is known (reconstructMonst's <name>_minvent, reconstructObj's
     * <name>_ocarry_minvent), else resolved lazily through the fmon channel via
     * the resolver replay-core registers (setChainMonstResolver), else null.
     * LOCKSTEP with both chain encoders in patches/010-capture-surface.patch —
     * POSITIONAL, append only, never insert. */
    'ocarry_m_id',
    /* 2026-09-06: field 33, globby (obj.h uchar, plain %d like oerodeproof).
     * flooreffects (cmd.js:7373) reads it on the killed monster's dropped
     * minvent nodes immediately after the ocarry read — the four do_attack
     * records field 32 unblocked stopped here. LOCKSTEP with both chain
     * encoders in patches/010-capture-surface.patch — POSITIONAL, append
     * only, never insert. */
    'globby',
    /* 2026-09-06: fields 34-35, in_use / how_lost (obj.h Bitfields, plain %d).
     * destroy_items_mon (zap.c:5891, js/zap.js) reads obj.in_use on a
     * minvent-chain node — mintrap #165 flipped from rng_result_tape_residual
     * to "field in_use was not captured" the moment that port landed.
     * mergable (invent.c:4378, via stackobj_dm <- relobj_xkilled) reads
     * how_lost on a killed monster's dropped minvent node — do_attack #36 (the
     * next stop after field 33). Both mirror the ARG-head scalars of the same
     * names. LOCKSTEP with both chain encoders in
     * patches/010-capture-surface.patch — POSITIONAL, append only, never
     * insert. */
    'in_use', 'how_lost',
    /* 2026-09-06: field 36, unpaid (obj.h Bitfield(unpaid,1), plain %d).
     * splitobj (mkobj.c:493 `if (obj->unpaid) splitbill(obj, otmp)`,
     * js/makemon.js) reads it on the minvent-chain node m_throw splits a
     * monster's missile stack off — mattacku #239 ("field 'unpaid' was not
     * captured") on the wave-11 board. Mirrors the ARG-head scalar of the
     * same name. LOCKSTEP with both chain encoders in
     * patches/010-capture-surface.patch — POSITIONAL, append only, never
     * insert. */
    'unpaid'];

// fmon-channel monster resolver for chain-node ocarry references. Registered
// by tools/equiv-test/lib/replay-core.mjs buildHelpers() as
// (m_id) => bridge.findMonstById(m_id), which walks the game.fmon the record's
// fmon side-channel seeded (plus the spliced monst args). Unregistered (a bare
// reconstructor call outside replay) → an unresolvable id reads null honestly.
let chainMonstResolver = null;
export function setChainMonstResolver(fn) {
    chainMonstResolver = typeof fn === 'function' ? fn : null;
}

// Materialize node.ocarry from chain field 32 (see OBJ_CHAIN_FIELD_ORDER).
// -1 → null (data). id >= 0 → a lazy accessor: the owner proxy when
// bindChainOcarryOwner later binds one, else chainMonstResolver(id), else
// null. Defined BEFORE the node is proxied so 'ocarry' is in the strict
// proxy's captured-key whitelist; a port that WRITES obj.ocarry (dogmove
// add_to_minv / pickup mpickobj) replaces the accessor with a plain value.
// A null resolution is NOT cached, so a read before fmon is seeded does not
// pin null onto a later successful lookup. Absent field (pre-widen token) →
// no ocarry key: the strict proxy keeps self-reporting, exactly as before.
function attachChainOcarry(node) {
    if (typeof node.ocarry_m_id !== 'number') return;
    const id = node.ocarry_m_id;
    if (id < 0) { node.ocarry = null; return; }
    let bound = null;
    Object.defineProperty(node, 'ocarry', {
        enumerable: true, configurable: true,
        get() {
            if (bound !== null) return bound;
            const m = chainMonstResolver ? chainMonstResolver(id) : null;
            return m === undefined ? null : m;
        },
        set(v) {
            Object.defineProperty(node, 'ocarry', {
                value: v, writable: true, enumerable: true, configurable: true,
            });
        },
    });
    Object.defineProperty(node, '__bindChainOcarry', {
        value: (owner) => { bound = owner; }, enumerable: false,
        configurable: true, writable: false,
    });
}

// Bind the raw chain nodes whose ocarry_m_id names `ownerMid` to `ownerProxy`
// (the monst the chain was captured from). Identity matters: cmd.js's
// `obj.ocarry === mon` shopkeeper test must hold against the very proxy the
// port is handed. Nodes referencing some OTHER monster fall through to the
// fmon resolver.
function bindChainOcarryOwner(rawNodes, ownerMid, ownerProxy) {
    if (!Array.isArray(rawNodes) || typeof ownerMid !== 'number') return;
    for (const raw of rawNodes) {
        if (raw && raw.ocarry_m_id === ownerMid
            && typeof raw.__bindChainOcarry === 'function') {
            raw.__bindChainOcarry(ownerProxy);
        }
    }
}

// Parse an obj-chain capture stored under `key` ("o_id:otyp:...;o_id:...;") into
// an array of plain field objects, one per node, in chain order (head first).
// Each token is the node's fields colon-separated in OBJ_CHAIN_FIELD_ORDER.
// Returns null if the key is absent (old fixtures / other fns); returns [] for a
// present-but-EMPTY chain ("" — e.g. a monster with empty minvent), which is
// distinct from absent. Trailing empty token from the final ';' dropped.
// LOCKSTEP with capture_obj_chain_encode in harness/capture.c.
function parseObjChainKey(capturedArgs, key) {
    if (capturedArgs == null) return null;
    const raw = capturedArgs[key];
    if (typeof raw !== 'string') return null;
    const nodes = [];
    for (const tok of raw.split(';')) {
        if (tok === '') continue;
        const parts = tok.split(':');
        const node = {};
        // Assign only the fields actually present in the token (bounded by
        // parts.length); a node carries exactly the encoder's 11 fields, no NaN
        // padding beyond them.
        /* obj.h:139 `#define opoisoned otrapped` — ONE member with two
         * spellings. The chain encodes it once (as otrapped); alias the other
         * name below so a port using either spelling reads the same captured
         * value instead of tripping the strict proxy. */
        const fcount = Math.min(OBJ_CHAIN_FIELD_ORDER.length, parts.length);
        for (let f = 0; f < fcount; f++) {
            node[OBJ_CHAIN_FIELD_ORDER[f]] = Number(parts[f]);
        }
        /* 2026-09-04: chain nodes never got obj.h's TOKEN ALIASES, so every
         * `#define` pair in DERIVED_ALIASES was dark on this path while working
         * fine on reconstructObj's single-struct path (which aliases at the
         * applyDerivedAliases call below). A chain node is what gi.invent,
         * mon->minvent and mon->mw all resolve to, so a port reading
         * obj.odiluted / obj.opoisoned / obj.leashmon off an inventory object
         * read undefined and silently took the wrong arm.
         *
         * MEASURED: js/objnam.js's POTION_CLASS arm reads `obj.odiluted`
         * (#define odiluted oeroded, obj.h:131) to render "diluted ", so the
         * corpus's `:diluted` menu SEARCH could never match a reconstructed
         * potion — dodip records 30/31/32/37. Found by a porter who correctly
         * refused to work around it in the wrong file.
         *
         * Aliases whose SOURCE is already in OBJ_CHAIN_FIELD_ORDER go live
         * immediately (opoisoned<-otrapped, leashmon/next_boulder<-corpsenm);
         * the oeroded trio needs the recapture that adds oeroded/oeroded2. */
        applyDerivedAliases(node, 'struct obj *');
        /* 2026-09-05: chain nodes carry no cobj sub-chain. C's invariant
         * (obj.h Is_container: otyp in [LARGE_BOX, BAG_OF_TRICKS] = [214,220])
         * means every NON-container node has cobj == NULL exactly, so
         * materialize null for those; container nodes are left unset so the
         * strict proxy keeps self-reporting the genuine gap until the nested
         * "<chainkey>_cobj_<o_id>" channel exists. Readers: Has_contents
         * (mon_leave), splitobj (m_throw), weight(). */
        if (typeof node.otyp === 'number' && !(node.otyp >= 214 && node.otyp <= 220)) node.cobj = null;
        /* 2026-09-05: materialize node.oextra from chain fields 28-29 (see the
         * OBJ_CHAIN_FIELD_ORDER comment). Model mirrors reconstructObj's
         * presence-bit branch, adapted to the chain context:
         *   oextra_present absent (pre-widen token)  -> oextra left unset; the
         *     strict proxy self-reports on read (the honest parked-gap signal,
         *     exactly the pre-this-change behavior).
         *   oextra_present == 0 -> null (C's NULL oextra; has_oname false).
         *   oextra_present == 1 -> a presence stub (reads of uncaptured
         *     members like omonst/omid self-report with a named gap) with
         *     oname WRITTEN onto it:
         *       oname bit 0 -> null (has_oname false, exactly C);
         *       oname bit 1 -> the "<chainkey>_oname_<o_id>" sparse string
         *         side-key (capture_obj_chain_onames, patch 010) when present;
         *         when ABSENT (a capture from between the two landings, or a
         *         truncated emission) oname is deliberately LEFT UNSET so the
         *         stub THROWS a named gap on read — never a garbage
         *         string-coercion (the mgivenname Monnam 0->23 lesson). */
        if (typeof node.oextra_present === 'number') {
            if (node.oextra_present === 0) {
                node.oextra = null;
            } else {
                const oe = makePresenceStub(
                    `obj(chain o_id=${node.o_id}).oextra`);
                if (node.oextra_oname_present === 1) {
                    const onameKey = `${key}_oname_${node.o_id}`;
                    if (capturedArgs != null && Object.prototype
                            .hasOwnProperty.call(capturedArgs, onameKey)) {
                        oe.oname = capturedArgs[onameKey];
                    }
                    /* else: leave oname unset -> stub self-reports */
                } else {
                    oe.oname = null;
                }
                node.oextra = oe;
            }
        }
        /* 2026-09-06: chain field 32 → node.ocarry (see attachChainOcarry). */
        attachChainOcarry(node);
        nodes.push(node);
    }
    return nodes;
}

// nobj-chain arg (findgold's "<name>_nobj_chain"). Thin wrapper over the keyed
// parser preserving the original call shape.
function parseObjChain(capturedArgs, name) {
    return parseObjChainKey(capturedArgs, `${name}_nobj_chain`);
}

// ws6g: parse a bare obj-chain STRING (the hero gi.invent "invent" side-channel,
// same "o_id:otyp:...;" per-node encoding as mon.minvent) into an array of plain
// field objects (head first). Returns null for a non-string (absent channel), []
// for the empty-inventory "" case. Reuses parseObjChainKey so field order stays
// lockstep with OBJ_CHAIN_FIELD_ORDER. Callers (mapstate_game_bridge) link the
// nodes via nobj into game.invent.
//
// 2026-09-06: `onames` (optional) is the record's "invent_onames" side-channel
// — {"<o_id>":"<oname>",...} for the NAMED nodes of the chain (patch 010
// snapshot_invent_onames). A top-level invent node carries the
// oextra_oname_present BIT (field 29) but, unlike an arg-prefix chain, no
// "<chainkey>_oname_<o_id>" side-key (capture_arg_string is a no-op outside an
// args build), so 131 named invent nodes board-wide materialized an oextra stub
// whose .oname THREW. Each pair is mapped onto exactly the side-key
// parseObjChainKey already looks up, so the oextra materialization has ONE
// path. Absent/null onames (older records) behave exactly as before: the stub
// self-reports on read.
export function parseObjChainString(str, onames = null) {
    if (typeof str !== 'string') return null;
    const capturedArgs = { __chain__: str };
    if (onames && typeof onames === 'object') {
        for (const [oid, name] of Object.entries(onames)) {
            if (typeof name === 'string') {
                capturedArgs[`__chain___oname_${oid}`] = name;
            }
        }
    }
    return parseObjChainKey(capturedArgs, '__chain__');
}

export function reconstructObj(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct obj *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    // schema2 (2026-07-14): materialize the obj.h token-macro field aliases
    // (leashmon/next_boulder/opoisoned/wishedfor) — see DERIVED_ALIASES.
    applyDerivedAliases(fields, 'struct obj *');
    // obj->nobj chain reconstruction (findgold's argchain). When the
    // "<name>_nobj_chain" string was captured, build a singly-linked tail from
    // the 2nd node onward as PLAIN objects ({o_id, otyp, nobj}) and attach it as
    // fields.nobj. nobj MUST be set BEFORE makeStrictProxy so it is in the
    // captured-key whitelist (the head is a strict Proxy; tail nodes are plain
    // objects so .otyp/.nobj read freely). Additive: absent chain → no nobj key.
    const chain = parseObjChain(capturedArgs, name);
    if (chain && chain.length > 0) {
        // chain[0] is the head (its fields duplicate the head's scalar capture).
        // Build the tail (2nd node onward) back-to-front as PLAIN objects so each
        // node's .nobj points to the next; a tail node carries the full obj
        // field set, so a findgold return that lands on a tail node compares
        // equal to the C return on every captured field (not just o_id).
        let next = null;
        for (let k = chain.length - 1; k >= 1; k--) {
            chain[k].nobj = next;
            // Mark each tail node as a chain node (11 encoded fields only) so a
            // fn returning a tail node canonicalizes its return by o_id in
            // replay-core (it legitimately lacks age/owt/…). Tail nodes are PLAIN
            // objects (not strict proxies) so the symbol is read directly.
            next = markChainNode(chain[k]);
        }
        fields.nobj = next; // 2nd node, or null if chain has only the head
    }
    // obj->oextra->oname reconstruction (safe_oname). When the
    // "<name>_oextra_oname" string was captured, attach a PLAIN nested oextra
    // object so the port can evaluate has_oname(o) = (o.oextra && ONAME(o)) and
    // ONAME(o) = o.oextra.oname faithfully. The C trampoline emits the captured
    // value as the oname STRING when has_oname()==true, or JSON null otherwise
    // (NULL oextra OR NULL oname — both have_oname==false in C). We always model
    // oextra as a present object whose .oname carries that string-or-null; the
    // null case yields has_oname()==false exactly as C. oextra MUST be set
    // BEFORE makeStrictProxy so it is in the captured-key whitelist; it is a
    // plain object so .oname reads freely. Additive: absent capture → no oextra.
    if (capturedArgs != null
        && Object.prototype.hasOwnProperty.call(capturedArgs, `${name}_oextra_oname`)) {
        const oname = capturedArgs[`${name}_oextra_oname`];
        fields.oextra = { oname: oname == null ? null : oname };
    }
    // harness-unpark 2026-07-16: materialize obj->oextra from the presence
    // bits (oextra_present/oextra_*_present/oextra_omid — STRUCT_FIELDS
    // scalars on every obj arg since recorder-batch2), completing what the
    // per-fn ONAME string channel starts. oextra_present==0 -> null (C's NULL
    // oextra; overrides the ONAME channel's always-object model, whose oname
    // was null in that case anyway). ==1 -> object whose oname/omonst/omailcmd
    // are presence-backed (bit=1 -> truthy stub, content reads self-report;
    // bit=0 -> null) and omid carries its real int (0 = unset, has_omid()
    // semantics). Unparks the allocate-if-absent / free-if-present idioms
    // (dealloc_oextra/new_oname/newomid/obj_pmname).
    if (typeof fields.oextra_present === 'number') {
        if (fields.oextra_present === 0) {
            fields.oextra = null;
        } else {
            const oe = (fields.oextra && typeof fields.oextra === 'object')
                ? fields.oextra : (fields.oextra = {});
            if (!('oname' in oe)) {
                oe.oname = fields.oextra_oname_present
                    ? makePresenceStub('obj.oextra.oname') : null;
            }
            if (!('omonst' in oe)) {
                oe.omonst = fields.oextra_omonst_present
                    ? makePresenceStub('obj.oextra.omonst') : null;
            }
            if (!('omailcmd' in oe)) {
                oe.omailcmd = fields.oextra_omailcmd_present
                    ? makePresenceStub('obj.oextra.omailcmd') : null;
            }
            if (!('omid' in oe) && typeof fields.oextra_omid === 'number') {
                oe.omid = fields.oextra_omid;
            }
        }
    }
    // Layer-B obj->cobj reconstruction (the container-contents chain). When the
    // "<name>_cobj" string was captured, parse it into a singly-linked list of
    // obj nodes (head first, linked by .nobj) and attach the HEAD as fields.cobj
    // so a port walks `for (let o = obj.cobj; o; o = o.nobj)` exactly as C walks
    // `obj->cobj`. Each node is a STRICT obj proxy (so a read of an uncaptured
    // obj field self-reports rather than silently mismatching — same honesty
    // contract as a top-level reconstructed obj). An EMPTY/absent cobj ("") →
    // head = null (== C's NULL cobj, i.e. Has_contents(obj) false). cobj MUST be
    // set BEFORE makeStrictProxy so it is in the captured-key whitelist. Additive:
    // absent capture (old fixtures) → no cobj key (the strict proxy then throws if
    // a port reads it — the parked-gap signal). LOCKSTEP with the capture_obj_cobj
    // render in harness/capture.c. NOTE: this reuses the .nobj link on the content
    // nodes (the same field the nobj-chain logic above sets on the head); the cobj
    // nodes form an INDEPENDENT list, so their .nobj is set here without conflict.
    const cobjNodes = parseObjChainKey(capturedArgs, `${name}_cobj`);
    if (cobjNodes !== null) {
        let nextC = null;
        for (let k = cobjNodes.length - 1; k >= 0; k--) {
            cobjNodes[k].nobj = nextC;
            nextC = makeStrictProxy(markChainNode(cobjNodes[k]), 'struct obj *');
        }
        fields.cobj = nextC; // head content obj, or null for an empty/non-container
    }
    // obj->nexthere floor-list reconstruction. The "<name>_nexthere_chain"
    // capture is INCLUSIVE of the head (chain[0] duplicates the head's scalars),
    // so — exactly like the nobj chain — build the tail (2nd node onward) linked
    // by `.nexthere` and attach the 2nd node as fields.nexthere. A port then
    // walks `for (o = obj; o; o = o.nexthere)` the way C walks the same-tile pile
    // (nxtobj by_nexthere / can_hide_under_obj / fire_damage_chain here-list).
    // Each tail node is a STRICT obj proxy (a read of an uncaptured obj field
    // self-reports — same honesty contract as cobj). A single-node pile →
    // fields.nexthere = null (natural terminator == C's NULL nexthere). Set
    // BEFORE makeStrictProxy so it is in the captured-key whitelist. Additive:
    // absent key (old fixtures) → no nexthere key. LOCKSTEP with
    // capture_obj_herechain in harness/capture.c.
    const hereChain = parseObjChainKey(capturedArgs, `${name}_nexthere_chain`);
    if (hereChain && hereChain.length > 0) {
        let nextH = null;
        for (let k = hereChain.length - 1; k >= 1; k--) {
            hereChain[k].nexthere = nextH;
            nextH = makeStrictProxy(markChainNode(hereChain[k]), 'struct obj *');
        }
        fields.nexthere = nextH; // 2nd node, or null if only the head
    }
    // obj->ocontainer container-nesting reconstruction. The
    // "<name>_ocontainer_chain" capture is INCLUSIVE of the head and walks UPWARD
    // (chain[0]=this obj, chain[1]=its container, …, terminal=outermost). Build
    // the tail (2nd node onward) linked by `.ocontainer` and attach the 2nd node
    // as fields.ocontainer so a port walks `for (topc = obj; topc.where ==
    // OBJ_CONTAINED; topc = topc.ocontainer)` exactly as count_contents does.
    // The terminal node (where != OBJ_CONTAINED) IS captured, so the loop
    // condition sees its `where` and stops correctly. Strict-proxy tail nodes;
    // a non-contained obj → fields.ocontainer = null. Additive: absent key → no
    // ocontainer key. LOCKSTEP with capture_obj_ocontainer_chain in harness/capture.c.
    const contChain = parseObjChainKey(capturedArgs, `${name}_ocontainer_chain`);
    if (contChain && contChain.length > 0) {
        let nextO = null;
        for (let k = contChain.length - 1; k >= 1; k--) {
            contChain[k].ocontainer = nextO;
            nextO = makeStrictProxy(markChainNode(contChain[k]), 'struct obj *');
        }
        fields.ocontainer = nextO; // 2nd node (parent container), or null
    }
    // obj->ocarry carrier reconstruction (schema2 2026-07-14). The captured
    // ocarry_* SYNTHETIC_FIELDS carry the carrying monster's identity
    // (canonicalized m_id, -1 = no carrier: either where!=OBJ_MINVENT — the
    // union slot aliases nexthere/ocontainer then — or a NULL ocarry),
    // position (splash_lit's is_pool(mtmp->mx,mtmp->my)) and data_mndx
    // (humanoid/is_flyer/is_floater dispatch). The carrier's inventory chain
    // rides "<name>_ocarry_minvent" (obj_extract_self/replace_object walk
    // extract_nobj(obj, &obj->ocarry->minvent)). The carrier is a mini
    // STRICT monst proxy: a port reading an uncaptured carrier field
    // self-reports instead of silently mismatching (same honesty contract as
    // minvent nodes). -1 → fields.ocarry = null (C-faithful ports only read
    // ocarry under where==OBJ_MINVENT, where NULL is the honest "no carrier").
    // Set BEFORE makeStrictProxy so 'ocarry' is in the captured-key
    // whitelist. Additive: absent capture (old fixtures) → no ocarry key.
    // LOCKSTEP with capture_obj_ocarry_minvent + the ocarry_* SYNTHETIC_FIELDS
    // in tools/generate-auto-trampolines.mjs / harness/capture.c.
    if (typeof fields.ocarry_m_id === 'number') {
        if (fields.ocarry_m_id < 0) {
            fields.ocarry = null;
        } else {
            const carrier = {
                m_id: fields.ocarry_m_id,
                mx: fields.ocarry_mx,
                my: fields.ocarry_my,
                data_mndx: fields.ocarry_data_mndx,
            };
            if (typeof carrier.data_mndx === 'number' && carrier.data_mndx >= 0) {
                const tmpl = permonstTemplate(carrier.data_mndx);
                if (tmpl) carrier.data = makePermonstDataProxy(tmpl);
            }
            const carrierInv = parseObjChainKey(capturedArgs, `${name}_ocarry_minvent`);
            if (carrierInv !== null) {
                let nextI = null;
                for (let k = carrierInv.length - 1; k >= 0; k--) {
                    carrierInv[k].nobj = nextI;
                    nextI = makeStrictProxy(markChainNode(carrierInv[k]), 'struct obj *');
                }
                carrier.minvent = nextI; // head obj, or null for an empty chain
            }
            fields.ocarry = makeStrictProxy(carrier, 'struct monst *');
            /* 2026-09-06: the carrier's minvent nodes name the carrier as
             * their ocarry_m_id (chain field 32); bind them to this proxy. */
            if (carrierInv !== null) {
                bindChainOcarryOwner(carrierInv, carrier.m_id, fields.ocarry);
            }
        }
    }
    return makeStrictProxy(fields, 'struct obj *');
}

// MTSZ (monst.h:108) — length of the mtrack[] coord array. LOCKSTEP with the C
// MTSZ used by capture_mon_mtrack_encode.
const MTSZ = 4;

// Parse a "<name>_mtrack" capture ("x:y;x:y;x:y;x:y;") into an array of plain
// coord objects [{x,y},...] (head first, MTSZ entries). LOCKSTEP with the C
// render in harness/capture.c capture_mon_mtrack_encode. Returns null if the
// field is absent (old fixtures / non-flagged fns). Trailing empty token from
// the final ';' is dropped. The coords are PLAIN objects so the port can both
// READ (mtmp.mtrack[j].x) and WRITE (mtmp.mtrack[0].x = ...) them freely.
function parseMtrack(capturedArgs, name) {
    if (capturedArgs == null) return null;
    const raw = capturedArgs[`${name}_mtrack`];
    if (typeof raw !== 'string') return null;
    const out = [];
    for (const tok of raw.split(';')) {
        if (tok === '') continue;
        const parts = tok.split(':');
        out.push({ x: Number(parts[0]), y: Number(parts[1]) });
    }
    return out;
}

// Layer-B mon->mextra sub-field capture. Parses the "<name>_mextra" packed
// string ("D:...;S:...;P:...;G:...;" — tag-prefixed blocks for the populated
// substructs, field order LOCKSTEP with capture_mon_mextra in
// harness/capture.c) into a plain mextra object mirroring EDOG/ESHK/EPRI/EGD
// (mextra.h). A captured JSON null (mon->mextra == NULL, or unreadable at
// capture time) -> returns null, matching `mtmp->mextra` reading falsy in C
// (has_edog/has_eshk/has_epri/has_egd all gate on "mextra && X(mon)"). An
// absent key (old fixtures, pre-mextra-capture) -> returns undefined so the
// caller leaves fields.mextra unset (the strict-proxy self-report /
// "parked-gap" honesty contract, same as minvent/cobj). eshk->customer rides
// the separate "<name>_eshk_customer" string key (kept out of the packed
// numeric string so a player-chosen name can never collide with the ':'/';'
// delimiters).
function parseMextra(capturedArgs, name) {
    if (capturedArgs == null) return undefined;
    const key = `${name}_mextra`;
    if (!Object.prototype.hasOwnProperty.call(capturedArgs, key)) return undefined;
    return parseMextraPacked(capturedArgs[key], capturedArgs, key);
}

// The packed-string decoder itself, split from the args-key lookup above
// (harness batch 8, 2026-09-05) so a SIDE-CHANNEL can carry the identical
// encoding: the "rooms" channel's resident_mextra (patch 010 snapshot_rooms
// -> pack_mon_mextra, the same encoder capture_mon_mextra uses for
// "<arg>_mextra"). One format, one parser. null -> null (NULL mextra),
// non-string -> undefined (not captured), "" -> {} (allocated, nothing
// populated). `capturedArgs`/`key` are the OPTIONAL args-path context for
// the separate "<key>_eshk_customer" string; a side-channel caller passes
// neither and gets no customer (C's eshk->customer is a name string the
// numeric packing deliberately excludes).
export function parseMextraPacked(raw, capturedArgs = null, key = null) {
    if (raw === null) return null;
    if (typeof raw !== 'string') return undefined;
    const mextra = {};
    for (const block of raw.split(';')) {
        if (block === '') continue;
        const parts = block.split(':');
        const tag = parts[0];
        if (tag === 'D') {
            mextra.edog = {
                hungrytime: Number(parts[1]),
                whistletime: Number(parts[2]),
                apport: Number(parts[3]),
                dropdist: Number(parts[4]),
                droptime: Number(parts[5]),
                mhpmax_penalty: Number(parts[6]),
                ogoal: { x: Number(parts[7]), y: Number(parts[8]) },
            };
        } else if (tag === 'S') {
            mextra.eshk = {
                billct: Number(parts[1]),
                debit: Number(parts[2]),
                following: Number(parts[3]),
                robbed: Number(parts[4]),
                shd: { x: Number(parts[5]), y: Number(parts[6]) },
                shk: { x: Number(parts[7]), y: Number(parts[8]) },
            };
            // schema2 (2026-07-14): fields 9-11 (shoproom + shoplevel
            // d_level) APPENDED for inhishop()'s on_level(&eshk->shoplevel,
            // &u.uz) + strchr(shkrooms, eshk->shoproom) gate (shk.c:280-292).
            // Bounded by parts.length so pre-schema2 9-field S blocks still
            // parse (shoproom/shoplevel simply stay unset — the honest gap).
            // LOCKSTEP with capture_mon_mextra in harness/capture.c.
            if (parts.length > 11) {
                mextra.eshk.shoproom = Number(parts[9]);
                mextra.eshk.shoplevel = {
                    dnum: Number(parts[10]),
                    dlevel: Number(parts[11]),
                };
            }
            // harness-unpark 2026-07-16 FIX: capture_mon_mextra (harness/
            // capture.c) derives the customer key from the FULL packed-string
            // key it was passed — snprintf("%s_eshk_customer", name) with
            // name="<arg>_mextra" — so the emitted key is
            // "<arg>_mextra_eshk_customer". This previously looked for
            // "<arg>_eshk_customer" (never emitted): customer never
            // reconstructed. Derive from `key` (the packed-string key), which
            // also composes correctly for the "<arg>_resident_mextra" channel.
            const custKey = key != null ? `${key}_eshk_customer` : null;
            if (custKey && capturedArgs
                && Object.prototype.hasOwnProperty.call(capturedArgs, custKey)) {
                mextra.eshk.customer = capturedArgs[custKey];
            }
        } else if (tag === 'P') {
            mextra.epri = {
                shroom: Number(parts[1]),
                shrpos: { x: Number(parts[2]), y: Number(parts[3]) },
            };
        } else if (tag === 'G') {
            mextra.egd = {
                dropgoldcnt: Number(parts[1]),
                fcbeg: Number(parts[2]),
                fcend: Number(parts[3]),
                gddone: Number(parts[4]),
                gdx: Number(parts[5]),
                gdy: Number(parts[6]),
                ogx: Number(parts[7]),
                ogy: Number(parts[8]),
                warncnt: Number(parts[9]),
                witness: Number(parts[10]),
                gdlevel: { dnum: Number(parts[11]), dlevel: Number(parts[12]) },
            };
        }
    }
    return mextra;
}

export function reconstructMonst(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct monst *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    applyDerivedAliases(fields, 'struct monst *');
    // mtrack[MTSZ] coord-array reconstruction (mon_track_add/clear). When the
    // "<name>_mtrack" string was captured, parse it into fields.mtrack as an
    // array of PLAIN coord objects BEFORE makeStrictProxy so it is in the
    // captured-key whitelist; the port reads/writes mtmp.mtrack[j].{x,y}. The
    // arg-state-after oracle (assertArgsAfter) compares this against the
    // captured args_after.mtmp.mtrack. Additive: absent capture → no mtrack key.
    const mtrack = parseMtrack(capturedArgs, name);
    if (mtrack) fields.mtrack = mtrack;
    // Layer-B mon->minvent reconstruction (the carried-object chain). When the
    // "<name>_minvent" string was captured, parse it into a singly-linked list of
    // obj nodes (head first, linked by .nobj) and attach the HEAD as fields.minvent
    // so a port walks `for (let o = mon.minvent; o; o = o.nobj)` exactly as C walks
    // `mon->minvent`. Each node is a STRICT obj proxy (so a read of an uncaptured
    // obj field self-reports rather than silently mismatching — same honesty
    // contract as a top-level reconstructed obj). An EMPTY minvent ("") → head =
    // null (the natural "no carried objects" value, == C's NULL minvent). minvent
    // MUST be set BEFORE makeStrictProxy so it is in the captured-key whitelist.
    // Additive: absent capture (old fixtures) → no minvent key (the strict proxy
    // then throws if a port reads it — the parked-gap signal). LOCKSTEP with the
    // capture_mon_minvent render in harness/capture.c.
    const minvNodes = parseObjChainKey(capturedArgs, `${name}_minvent`);
    if (minvNodes !== null) {
        let next = null;
        for (let k = minvNodes.length - 1; k >= 0; k--) {
            minvNodes[k].nobj = next;
            next = makeStrictProxy(markChainNode(minvNodes[k]), 'struct obj *');
        }
        fields.minvent = next; // head obj, or null for an empty chain
    }
    // mon->mw reconstruction (droppables()/dog_invent's wielded-weapon read,
    // dogmove.c:49 MON_WEP). The captured "<name>_mw_o_id" SYNTHETIC_FIELD
    // encodes -1 for NULL mw, else the pointee's real o_id. mw always aliases a
    // node already present in mon->minvent (the chain just reconstructed above),
    // so fields.mw is resolved by walking that chain for a matching o_id rather
    // than treating mw as an independent capture — mirrors "how other
    // monst->obj* pointer fields are captured" (harness-infra-gaps note). -1 (no
    // wielded weapon) → null, matching C's NULL mw. A positive o_id with no
    // matching minvent node (should not occur for well-formed records) also
    // yields null rather than throwing — the divergence would surface via a
    // downstream field read instead. Absent capture (old fixtures, pre-mw
    // side-channel) → fields.mw left unset, same honesty contract as
    // minvent/mextra (the strict proxy self-reports on read). MUST be set
    // BEFORE makeStrictProxy so it is in the captured-key whitelist.
    if (typeof fields.mw_o_id === 'number') {
        if (fields.mw_o_id < 0) {
            fields.mw = null;
        } else {
            let mw = null;
            for (let o = fields.minvent; o; o = o.nobj) {
                if (o.o_id === fields.mw_o_id) { mw = o; break; }
            }
            fields.mw = mw;
        }
    }
    // Layer-B mon->mextra reconstruction (THE LAST MOVEMON GAP). When the
    // "<name>_mextra" key was captured, attach fields.mextra so a port can
    // evaluate has_edog/has_eshk/has_epri/has_egd and read EDOG(mon)/ESHK(mon)/
    // EPRI(mon)/EGD(mon) faithfully — dog_move's pet-status reads, shk_move's
    // shopkeeper reads, pri_move's temple reads, gd_move's vault-guard reads,
    // and mstatusline. null -> mtmp.mextra falsy (matches C's NULL mextra);
    // undefined (absent key, old fixtures) -> mextra left unset so the strict
    // proxy self-reports on read, same honesty contract as minvent. mextra
    // MUST be set BEFORE makeStrictProxy so it is in the captured-key
    // whitelist; it is a plain object (like obj.oextra) so .edog/.eshk/.epri/
    // .egd read freely. LOCKSTEP with capture_mon_mextra in harness/capture.c.
    const mextra = parseMextra(capturedArgs, name);
    if (mextra !== undefined) fields.mextra = mextra;
    // harness-unpark 2026-07-16: complete the mextra picture from the has_*
    // presence bits (STRUCT_FIELDS scalars, captured on every monst arg since
    // recorder-batch2). Two legs:
    //  (a) packed "<name>_mextra" key ABSENT (per-fn-era fixtures) but
    //      mextra_present captured -> materialize fields.mextra itself
    //      (null / fresh object), so `if (mtmp->mextra)` replays;
    //  (b) fields.mextra is a non-null object -> back-fill the substruct
    //      members parseMextra does not carry (emin/ebones/mgivenname — and
    //      egd/epri/eshk/edog when the packed block was empty for them):
    //      bit=1 -> truthy presence stub (content reads self-report),
    //      bit=0 -> null (C's NULL substruct pointer). mcorpsenm mirrors
    //      has_mcorpsenm semantics via mextra_mcorpsenm. This is what makes
    //      the free-if-present idiom (dealloc_mextra) replay faithfully.
    if (fields.mextra === undefined
        && typeof fields.mextra_present === 'number') {
        fields.mextra = fields.mextra_present ? {} : null;
    }
    if (fields.mextra !== null && fields.mextra !== undefined
        && typeof fields.mextra === 'object') {
        const mx = fields.mextra;
        for (const sub of ['egd', 'epri', 'eshk', 'emin', 'edog', 'ebones']) {
            const bit = fields[`has_${sub}`];
            if (typeof bit !== 'number') continue;
            if (!(sub in mx)) {
                mx[sub] = bit ? makePresenceStub(`monst.mextra.${sub}`) : null;
            }
        }
        // mgivenname is a STRING the naming path reads CONTENT from
        // (x_monnam's .charAt — a presence stub string-coerces to garbage, the
        // Monnam 0->23 regression this batch hit), so it rides its own string
        // side-channel "<name>_mextra_mgivenname" (capture_mon_mgivenname,
        // nethack-c-v5/patches/010-capture-surface.patch, emitted alongside
        // "<name>_has_mgivenname") rather than a stub. The C side always emits
        // the channel — "" when mextra->mgivenname is NULL, the real string
        // otherwise — so gate on the has_mgivenname bit rather than on string
        // emptiness (a monster can never legitimately be named ""). Key
        // absent (pre-channel fixtures) -> leave unset: a plain-object read
        // yields undefined (falsy), exactly the pre-batch behavior, until the
        // fixture is refreshed.
        if (capturedArgs != null && !('mgivenname' in mx)) {
            const gnKey = `${name}_mextra_mgivenname`;
            if (Object.prototype.hasOwnProperty.call(capturedArgs, gnKey)) {
                mx.mgivenname = fields.has_mgivenname ? capturedArgs[gnKey] : null;
            } else if (fields.has_mgivenname === 0) {
                mx.mgivenname = null;
            }
        }
        if (!('mcorpsenm' in mx)
            && typeof fields.mextra_mcorpsenm === 'number'
            && fields.mextra_present === 1) {
            mx.mcorpsenm = fields.mextra_mcorpsenm;
        }
    }
    // ── PRESENCE BITS FOLLOW THE SUBSTRUCT, NOT A STALE SCALAR ──────────────
    // has_egd/has_edog/... are DERIVED in js/ — js/const.js:2869 is
    // `has_egd(mtmp) { return !!mtmp?.mextra?.egd; }` — but STRUCT_FIELDS
    // carries them as captured scalars. So a port that faithfully allocates the
    // substruct (js/vault.js:420 newegd does `mtmp.mextra.egd = {}`) leaves the
    // scalar at its captured 0, and the args_after assertion reads that stale 0
    // against C's 1.
    //
    // That made SEVEN functions with correct ports unable to pass: newegd,
    // newemin, newepri, neweshk, copy_mextra, dealloc_mextra, christen_monst.
    // Filing them would have sent porters to break working code.
    //
    // Bind each bit to the substruct instead. At reconstruction the two agree
    // by construction (the back-fill above derives the substructs FROM these
    // bits), so this is inert until a port mutates mextra — which is exactly
    // when the assertion should start following it. When mextra was never
    // materialized (older fixtures) the captured value still wins, so their
    // behaviour is unchanged.
    //
    // `!= null`, not truthiness: C's has_*() is a pointer-NULL test, and
    // js/mklev.js:2032 assigns an empty-string mgivenname, which C sees as
    // non-NULL. Truthiness would read that back as 0 and diverge from C.
    {
        const bindPresence = (key, derive) => {
            if (!Object.prototype.hasOwnProperty.call(fields, key)) return;
            const captured = fields[key];
            delete fields[key];
            Object.defineProperty(fields, key, {
                enumerable: true,
                configurable: true,
                get() {
                    return fields.mextra === undefined ? captured : (derive() ? 1 : 0);
                },
                set(v) {   // a port assigning the bit directly still wins
                    Object.defineProperty(fields, key, {
                        value: v, writable: true, enumerable: true, configurable: true,
                    });
                },
            });
        };
        for (const sub of ['egd', 'epri', 'eshk', 'emin', 'edog', 'ebones']) {
            bindPresence(`has_${sub}`,
                () => fields.mextra != null && fields.mextra[sub] != null);
        }
        bindPresence('mextra_present', () => fields.mextra != null);
        // Mirrors js/const.js:2879, which also accepts a flat mgivenname.
        bindPresence('has_mgivenname',
            () => (fields.mextra != null && fields.mextra.mgivenname != null)
                  || fields.mgivenname != null);
    }
    // Materialize mon->data (the read-only mons[] permonst template) from the
    // captured data_mndx (= mon->data->pmidx, a SYNTHETIC_FIELD). This unblocks
    // the ~95 fns reading mon->data->* WITHOUT any recorder/recapture change —
    // the pmidx is already in every monst capture. Wrapped in a strict proxy so a
    // read of a template field permonstTemplate() does NOT yet source (ac, cwt,
    // cnutrit, mconveys, mcolor) self-reports instead of silently mismatching.
    if (typeof fields.data_mndx === 'number' && fields.data_mndx >= 0) {
        const tmpl = permonstTemplate(fields.data_mndx);
        if (tmpl) fields.data = makePermonstDataProxy(tmpl);
    }
    // Flattened-accessor alias: was needed because js/monmove.js, js/priest.js,
    // js/trap.js read `mtmp.mdata_mflags1` instead of `mtmp.data.mflags1`
    // (both name the SAME value — mon->data->mflags1, materialized above from
    // the template, not a distinct captured field). `mdata_mflags1` is not a
    // C struct member and is never emitted by the capture trampoline, so it
    // cannot go in STRUCT_FIELDS; this mirrored DERIVED_ALIASES (mndx←mnum)
    // but needed fields.data to already be materialized, so it was inlined here
    // rather than in applyDerivedAliases (which runs before fields.data
    // exists). Populated BEFORE makeStrictProxy so the flattened accessor
    // resolves to the true value instead of self-reporting a phantom gap.
    // TODO(tasks/generated/keystone-spec-accessor-mystery.md): all 5 read
    // sites were renamed to `mtmp.data.mflags1` on branch
    // movemon/accessor-unit-ws5 — this alias is no longer read by any live
    // js/ port. The spec did not prescribe removing it; left in place
    // (harmless no-op) pending confirmation no other harness path depends on
    // the `mdata_mflags1` key before deleting it.
    if (fields.data && typeof fields.data.mflags1 === 'number') {
        fields.mdata_mflags1 = fields.data.mflags1;
    }
    const monProxy = makeStrictProxy(fields, 'struct monst *');
    /* 2026-09-06: chain field 32 — a minvent node's ocarry IS this monster
     * (C sets obj->ocarry = mon in add_to_minv). Bind by identity so
     * `obj.ocarry === mon` holds against the proxy the port is handed. */
    if (minvNodes !== null) {
        bindChainOcarryOwner(minvNodes, fields.m_id, monProxy);
    }
    return monProxy;
}

export function reconstructPermonst(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct permonst *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    // A `struct permonst *ptr` arg carries pmidx (the mons[] index). Augment the
    // captured scalars with the FULL read-only template from permonstTemplate()
    // — the same materialization mon->data uses (line ~434) — so a port reading
    // ptr->mlevel / ->mmove / ->mattk / ->msound / ->pmnames / ->mconveys
    // resolves directly instead of round-tripping through ptr.pmidx. The captured
    // scalars (mlet/geno/msize/mflags1/mflags2) are a faithful SUBSET of the
    // template (both derive from mons[]; verified equal in wsv-pmfield
    // diagnosis), so the spread order is immaterial.
    //
    // We return a PLAIN merged object (template ∪ captured), NOT a strict proxy:
    // unlike mon->data, a direct permonst arg is sometimes read by ports through
    // a raw capture-key shim (e.g. num_horns reads `ptr.ptr_pmidx`, which must
    // stay `undefined` as it did when this returned the bare `fields` object —
    // a strict proxy would THROW on that leaked key and regress the port). A
    // template field NOT sourced by permonstTemplate (ac/cwt/cnutrit/mcolor)
    // simply reads back `undefined`; gen-port-tasks already parks such fns (the
    // field is absent from PERMONST_TEMPLATE_FIELDS), so the honest residual-gap
    // signal lives at the analyzer, not the proxy.
    if (typeof fields.pmidx === 'number' && fields.pmidx >= 0) {
        const tmpl = permonstTemplate(fields.pmidx);
        if (tmpl) return { ...tmpl, ...fields };
    }
    return fields;
}

// trap (trap.h:18) reconstructor: flat scalars plus the nested `dst`
// (d_level) and `teledest` (coord) VALUE members. extractFields gives us flat
// keys including 'dst.dnum'/'dst.dlevel'/'teledest.x'/'teledest.y'; nest
// those into real { dst: {dnum,dlevel}, teledest: {x,y} } objects so a port
// reads trap.dst.dnum / trap.teledest.x, mirroring reconstructStairway's
// tolev nesting. Plain (non-Proxy) object for the same reason as stairway: a
// strict Proxy on the outer object would reject the nested 'dst'/'teledest'
// keys unless whitelisted.
export function reconstructTrap(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct trap *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const flat = {};
    const dst = {};
    const teledest = {};
    for (const [k, v] of Object.entries(fields)) {
        if (k.startsWith('dst.')) dst[k.slice('dst.'.length)] = v;
        else if (k.startsWith('teledest.')) teledest[k.slice('teledest.'.length)] = v;
        else flat[k] = v;
    }
    flat.dst = dst;
    flat.teledest = teledest;
    return flat;
}

// MFNDPOS_N (mfndpos.h:35-36) — length of the poss[]/info[] fixed arrays.
// LOCKSTEP with the C MFNDPOS_N used by capture_mfndposdata_poss/info_encode.
const MFNDPOS_N = 9;

// Parse a "<name>_poss" capture ("x:y;x:y;...;", MFNDPOS_N entries) into an
// array of plain coord objects [{x,y},...] (head first). Mirrors parseMtrack.
// Returns null if the key is absent (old fixtures / non-flagged fns).
function parseMfndposPoss(capturedArgs, name) {
    if (capturedArgs == null) return null;
    const raw = capturedArgs[`${name}_poss`];
    if (typeof raw !== 'string') return null;
    const out = [];
    for (const tok of raw.split(';')) {
        if (tok === '') continue;
        const parts = tok.split(':');
        out.push({ x: Number(parts[0]), y: Number(parts[1]) });
    }
    return out;
}

// Parse a "<name>_info" capture ("v;v;...;", MFNDPOS_N entries) into a plain
// array of numbers (head first). Returns null if the key is absent.
function parseMfndposInfo(capturedArgs, name) {
    if (capturedArgs == null) return null;
    const raw = capturedArgs[`${name}_info`];
    if (typeof raw !== 'string') return null;
    const out = [];
    for (const tok of raw.split(';')) {
        if (tok === '') continue;
        out.push(Number(tok));
    }
    return out;
}

// mfndpos.h:33-37 struct mfndposdata reconstructor. `cnt` is the plain
// captured scalar; `poss`/`info` are reconstructed from the array side-
// channel (before-side for should_displace's read-only input, args_after
// side for mfndpos's own output — see reconstructStruct's caller and
// replay-core's assertArgsAfter for the after-side counterpart). poss/info
// MUST be set BEFORE makeStrictProxy so they are in the captured-key
// whitelist; poss holds PLAIN coord objects so a port can read/write
// data.poss[i].x/y freely, matching the mtrack precedent.
export function reconstructMfndposdata(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct mfndposdata *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const poss = parseMfndposPoss(capturedArgs, name);
    if (poss) fields.poss = poss;
    const info = parseMfndposInfo(capturedArgs, name);
    if (info) fields.info = info;
    return makeStrictProxy(fields, 'struct mfndposdata *');
}

export function reconstructCoord(capturedArgs, name) {
    // coord* is flattened to <name>_x / <name>_y in the capture
    if (capturedArgs == null) return null;
    if (capturedArgs[`${name}_null`] === 1) return null;
    const x = capturedArgs[`${name}_x`];
    const y = capturedArgs[`${name}_y`];
    if (x === undefined && y === undefined) return { __stale: true };
    return { x: x ?? 0, y: y ?? 0 };
}

// Generic flat reconstructor for a struct type whose JS port reads only flat
// (non-pointer, non-nested) members — d_level (dnum/dlevel) and mkroom
// (lx/hx/ly/hy/...). Mirrors reconstructTrap: extract the listed fields, return
// a strict Proxy (so a future port reading an un-listed field self-reports).
function reconstructFlat(capturedArgs, name, typeName) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS[typeName]);
    if (stale) return { __stale: true };
    if (isNull) return null;
    return makeStrictProxy(fields, typeName);
}

// struct attack (permonst.h:40) reconstructor. Flat scalars aatyp/adtyp/
// damn/damd via reconstructFlat's own field extraction, PLUS a rename step
// for the SYNTHETIC 'ai' field: the C trampoline (mhitm_adtyping in
// patches/010-capture-surface.patch) captures it as "<name>_ai" — a
// bounds-checked array-slot index, -1 when getmattk() substituted a
// stack-local alt_attk_buf copy rather than a real
// magr->data->mattk[i] slot — under the plain STRUCT_FIELDS key 'ai'
// (extractFields always keys off the field's own name). js/mhitu.js reads
// the underscore-prefixed mattk._ai (stamped by mattacku's loop at
// js/mhitu.js:5846, tested by hitmsg_je at :1010-1012), so this renames
// fields.ai -> fields._ai before building the strict Proxy — a Proxy
// whitelists exactly Object.keys(fields), so the exposed key must be the
// literal name the consumer reads. -1 (not-in-array) maps to JS `null`,
// matching the mattacku-loop convention where an attack nobody stamped has
// _ai === undefined (`!= null` is false for both). LOCKSTEP with
// STRUCT_FIELDS['struct attack *'] above and
// tools/generate-auto-trampolines.mjs.
function reconstructAttack(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct attack *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    if (Object.prototype.hasOwnProperty.call(fields, 'ai')) {
        const ai = fields.ai;
        delete fields.ai;
        fields._ai = (typeof ai === 'number' && ai >= 0) ? ai : null;
    }
    return makeStrictProxy(fields, 'struct attack *');
}

// mkroom (mkroom.h:11) reconstructor (harness-unpark 2026-07-16): the flat
// scalars plus the materialized `resident` monst (the room's shopkeeper /
// priest / guard). resident_m_id === -1 -> resident = null (C's NULL
// resident). Otherwise a mini STRICT monst proxy is built from the
// resident_* SYNTHETIC scalars (m_id/isshk/ispriest/mx/my/data_mndx), the
// materialized mon->data template (permonstTemplate via data_mndx), and the
// "<name>_resident_mextra" packed side-channel (parseMextra — carries the
// eshk shoproom/shoplevel that inhishop() reads for tended_shop). Reads of a
// resident field beyond these self-report via the strict proxy — the honest
// residual-gap signal, exactly the obj->ocarry carrier precedent. Old
// fixtures (no resident_m_id key) leave `resident` unset so the outer strict
// proxy self-reports on read.
function reconstructMkroom(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct mkroom *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    if (typeof fields.resident_m_id === 'number'
        // Materialize ONLY when the 0716 resident scalars are present:
        // pre-channel fixtures (IR-lane tended_shop) carry resident_m_id but
        // not resident_isshk — materializing a half-empty mini proxy would
        // read silent undefineds; leaving `resident` unset lets the outer
        // strict proxy self-report the gap instead (the parked-fixture
        // signal, until the IR-lane recapture refreshes them).
        && (fields.resident_m_id < 0
            || typeof fields.resident_isshk === 'number')) {
        if (fields.resident_m_id < 0) {
            fields.resident = null;
        } else {
            const res = {
                m_id: fields.resident_m_id,
                isshk: fields.resident_isshk,
                ispriest: fields.resident_ispriest,
                mx: fields.resident_mx,
                my: fields.resident_my,
                data_mndx: fields.resident_data_mndx,
            };
            if (typeof res.data_mndx === 'number' && res.data_mndx >= 0) {
                const tmpl = permonstTemplate(res.data_mndx);
                if (tmpl) res.data = makePermonstDataProxy(tmpl);
            }
            const rmx = parseMextra(capturedArgs, `${name}_resident`);
            if (rmx !== undefined) res.mextra = rmx;
            fields.resident = makeStrictProxy(res, 'struct monst *');
        }
    }
    // harness-b11 2026-09-06: croom->sbrooms[] via the "<name>_sbrooms"
    // side-key (LOCKSTEP with capture_mkroom_sbrooms in
    // patches/010-capture-surface.patch). undefined => the key is absent from
    // this fixture; leave `sbrooms` unset so the strict proxy self-reports.
    {
        const sb = parseMkroomSbrooms(capturedArgs, name);
        if (sb !== undefined) fields.sbrooms = sb;
    }
    return makeStrictProxy(fields, 'struct mkroom *');
}

// mkroom->sbrooms[MAX_SUBROOMS] (mkroom.h:23) subroom-pointer array. The C
// side (capture_mkroom_sbrooms, patches/010-capture-surface.patch) packs the
// croom->nsubrooms POINTEES into the side-key "<name>_sbrooms" as ';'-
// terminated nodes of ':'-separated numbers, in this POSITIONAL order. Adding
// a field means APPENDING to BOTH this list and the C snprintf — never
// inserting in the middle (the same append-only rule as the obj-chain
// encoding). A NULL slot pointer is the single-character node "N" -> null.
const MKROOM_SBROOM_FIELD_ORDER = [
    'lx', 'hx', 'ly', 'hy',
    'rtype', 'orig_rtype', 'rlit', 'needfill', 'needjoining',
    'doorct', 'fdoor', 'nsubrooms', 'irregular', 'roomnoidx',
    'resident_m_id',
];

// Parse the "<name>_sbrooms" packed side-key into an array of mini strict
// mkroom proxies (one per subroom slot, NULL slots -> null). An ABSENT key
// (a fixture recorded before the channel existed) -> undefined, so the caller
// leaves fields.sbrooms UNSET and the outer strict proxy self-reports the gap
// rather than a port silently reading an empty array — the same
// parked-gap honesty contract as minvent/cobj/mextra.
//
// DEPTH 1 ONLY: a subroom's own sbrooms[] is not encoded (NetHack never nests
// subrooms deeper), so a mini proxy is built WITHOUT an `sbrooms` key. If a
// port ever recurses into a sub-subroom the proxy throws the standard
// "field 'sbrooms' was not captured" instead of reading [].
function parseMkroomSbrooms(capturedArgs, name) {
    if (capturedArgs == null) return undefined;
    const raw = capturedArgs[`${name}_sbrooms`];
    if (raw === null) return null;
    if (typeof raw !== 'string') return undefined;
    const out = [];
    for (const tok of raw.split(';')) {
        if (tok === '') continue;
        if (tok === 'N') { out.push(null); continue; }
        const parts = tok.split(':');
        const sub = {};
        for (let i = 0; i < MKROOM_SBROOM_FIELD_ORDER.length; i++) {
            // A node from an OLDER encoding is shorter than the current field
            // list; the missing trailing fields stay unset so the mini proxy
            // self-reports them rather than reading NaN.
            if (i >= parts.length) break;
            sub[MKROOM_SBROOM_FIELD_ORDER[i]] = Number(parts[i]);
        }
        // Mirror reconstructMkroom's cautious resident materialization: only
        // the unambiguous "no resident" case becomes a real null; a present
        // resident is left UNSET (the mini proxy carries no resident scalars
        // beyond the m_id, so materializing one would read silent undefineds).
        if (sub.resident_m_id < 0) sub.resident = null;
        out.push(makeStrictProxy(sub, 'struct mkroom *'));
    }
    return out;
}

// stairway (stairs.h:8) reconstructor: the flat scalars plus the nested
// `tolev` d_level. extractFields gives us flat keys including 'tolev.dnum' /
// 'tolev.dlevel'; we nest those into a real { tolev: { dnum, dlevel } } so the
// JS port reads s.tolev.dnum. The non-nested keys pass through unchanged.
function reconstructStairway(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct stairway *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const flat = {};
    const tolev = {};
    for (const [k, v] of Object.entries(fields)) {
        if (k.startsWith('tolev.')) tolev[k.slice('tolev.'.length)] = v;
        else flat[k] = v;
    }
    // Plain (non-Proxy) object: stairway ports spread/read tolev as a nested
    // object, which a strict Proxy on the outer object would reject on the
    // 'tolev' key unless whitelisted; nesting it as a real property is the
    // faithful shape (the C member IS a nested d_level, not a flat field).
    flat.tolev = tolev;
    return flat;
}

// COLNO/ROWNO (global.h:384-385) — the fixed selection-map dimensions used by
// selection_new. LOCKSTEP with the COLNO*ROWNO cap in capture_selection_map
// (harness/capture.c). Only used as a defensive upper bound here.
const SELMAP_MAX_CELLS = 80 * 21;

// Parse a selectionvar map capture ("<name>_map"): the wid*hei byte buffer
// encoded one-char-per-cell (cell byte = charCode - '0', taken mod 256) by
// capture_selection_map in harness/capture.c. Returns a JS array of length
// wid*hei+1 — matching selection_new's `map` shape, where the extra trailing
// element is C's NUL terminator (0). Returns null if the key is absent (old
// opaque fixtures / a NULL map). LOCKSTEP with capture_selection_map.
function parseSelectionMap(capturedArgs, name, wid, hei) {
    if (capturedArgs == null) return null;
    const raw = capturedArgs[`${name}_map`];
    if (typeof raw !== 'string') return null;
    const cells = (wid | 0) * (hei | 0);
    if (cells <= 0 || cells > SELMAP_MAX_CELLS) return null;
    // selection_new memsets the buffer to 1 (unselected); fill matches that so a
    // truncated/short encoding degrades to the unselected default rather than 0.
    const map = new Array(cells + 1).fill(1);
    const n = Math.min(cells, raw.length);
    for (let i = 0; i < n; i++) {
        // -'0' inverse of the +'0' C encoding, mod 256 to round-trip any byte.
        map[i] = (((raw.charCodeAt(i) - 48) % 256) + 256) % 256;
    }
    map[cells] = 0; // C NUL terminator (selection_new sets map[COLNO*ROWNO] = 0)
    return map;
}

// selectionvar (hack.h:775) reconstructor: flat scalars wid/hei/bounds_dirty,
// the nested NhRect `bounds` (dot-notation keys, like stairway's tolev.*), and
// the dynamic `map` byte buffer from the "<name>_map" side-channel. Returns a
// PLAIN object matching selection_new's shape ({ wid, hei, bounds_dirty,
// bounds: { lx, ly, hx, hy }, map: [...] }) so a port reads sel.wid /
// sel.map[i] / sel.bounds.lx faithfully. Plain (not a strict Proxy) for the
// same reason as reconstructStairway: the port reads the nested bounds/map the
// way C reads the nested struct members.
function reconstructSelectionvar(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct selectionvar *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const sel = { bounds: {} };
    for (const [k, v] of Object.entries(fields)) {
        if (k.startsWith('bounds.')) sel.bounds[k.slice('bounds.'.length)] = v;
        else sel[k] = v;
    }
    // C boolean member → JS boolean (selection_new initializes bounds_dirty=false).
    if ('bounds_dirty' in sel) sel.bounds_dirty = !!sel.bounds_dirty;
    const map = parseSelectionMap(capturedArgs, name, sel.wid, sel.hei);
    if (map !== null) sel.map = map;
    return sel;
}

// Parse a mapfragment "<name>_data" capture: a plain JSON string (or null),
// captured verbatim by capture_mapfragment_data (harness/capture.c) via
// capture_arg_string — no byte-array decoding needed (unlike
// parseSelectionMap), mf->data is already a real NUL-terminated C string.
// Returns undefined if the key is absent (old fixtures), null if mf->data
// was NULL, else the string.
function parseMapfragmentData(capturedArgs, name) {
    if (capturedArgs == null) return undefined;
    const key = `${name}_data`;
    if (!Object.prototype.hasOwnProperty.call(capturedArgs, key)) return undefined;
    return capturedArgs[key];
}

// struct mapfragment (sp_lev.h:203) reconstructor: flat wid/hei plus the
// `data` string from the "<name>_data" side-channel. Plain object (not a
// strict Proxy) so a port reads mf.data freely, matching the C string field.
function reconstructMapfragment(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['struct mapfragment *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const data = parseMapfragmentData(capturedArgs, name);
    if (data !== undefined) fields.data = data;
    return fields;
}

// branch (dungeon.h:81) reconstructor: flat scalars plus the nested `end1`/
// `end2` d_level VALUE members (dot-notation keys, same mechanism as
// reconstructStairway's tolev). Plain object for the same reason as
// stairway/trap: a strict Proxy would reject the nested end1/end2 keys.
function reconstructBranch(capturedArgs, name) {
    const { fields, isNull, stale } = extractFields(capturedArgs, name,
        STRUCT_FIELDS['branch *']);
    if (stale) return { __stale: true };
    if (isNull) return null;
    const flat = {};
    const end1 = {};
    const end2 = {};
    for (const [k, v] of Object.entries(fields)) {
        if (k.startsWith('end1.')) end1[k.slice('end1.'.length)] = v;
        else if (k.startsWith('end2.')) end2[k.slice('end2.'.length)] = v;
        else flat[k] = v;
    }
    flat.end1 = end1;
    flat.end2 = end2;
    return flat;
}

// Dispatcher: given the C type string and captured args, return the
// reconstructed JS object (or null for NULL pointer, or { __stale: true }
// for pre-Wave-6 opaque captures).
//
// Returns { obj, skip, reason } where:
//   obj   — the reconstructed struct (or null for NULL pointer)
//   skip  — true if reconstruction is impossible (stale or unknown type)
//   reason — skip reason string
export function reconstructStruct(cType, capturedArgs, name) {
    switch (normalizeType(cType)) {
        case 'struct obj *':
            return { obj: reconstructObj(capturedArgs, name), skip: false };
        case 'struct monst *':
            return { obj: reconstructMonst(capturedArgs, name), skip: false };
        case 'struct permonst *':
            return { obj: reconstructPermonst(capturedArgs, name), skip: false };
        case 'struct trap *':
            return { obj: reconstructTrap(capturedArgs, name), skip: false };
        case 'coord *':
            return { obj: reconstructCoord(capturedArgs, name), skip: false };
        case 'struct d_level *':
            return { obj: reconstructFlat(capturedArgs, name, 'struct d_level *'), skip: false };
        case 'struct mkroom *':
            return { obj: reconstructMkroom(capturedArgs, name), skip: false };
        case 'struct stairway *':
            return { obj: reconstructStairway(capturedArgs, name), skip: false };
        case 'struct attack *':
            return { obj: reconstructAttack(capturedArgs, name), skip: false };
        case 'struct selectionvar *':
            return { obj: reconstructSelectionvar(capturedArgs, name), skip: false };
        case 'struct mfndposdata *':
            return { obj: reconstructMfndposdata(capturedArgs, name), skip: false };
        // wsv-scalar-batch: bare scalar output pointers — all one-field
        // { value } pseudo-structs, reconstructFlat handles them generically
        // regardless of the field's JS value type (number or string).
        case 'int *':
        case 'coordxy *':
        case 'boolean *':
        case 'long *':
        case 'struct obj **':
        case 'char **':
            return { obj: reconstructFlat(capturedArgs, name, normalizeType(cType)), skip: false };
        case 'struct mhitm_data *':
            return { obj: reconstructFlat(capturedArgs, name, 'struct mhitm_data *'), skip: false };
        case 'lev_init *':
            return { obj: reconstructFlat(capturedArgs, name, 'lev_init *'), skip: false };
        // wsv-recorder-batch2 (docs/HARNESS-GAP-PLAN.md classes #3/#5): NHFILE
        // and NhRect are flat one-field-per-member structs — reconstructFlat
        // handles them generically, same as attack*/mkroom*/d_level*.
        case 'NHFILE *':
            return { obj: reconstructFlat(capturedArgs, name, 'NHFILE *'), skip: false };
        case 'NhRect *':
            return { obj: reconstructFlat(capturedArgs, name, 'NhRect *'), skip: false };
        // struct mapfragment ** / struct monst **: single-field {value}
        // pseudo-structs, same mechanism as struct obj **/char **.
        case 'struct mapfragment **':
        case 'struct monst **':
            return { obj: reconstructFlat(capturedArgs, name, normalizeType(cType)), skip: false };
        case 'struct mapfragment *':
            return { obj: reconstructMapfragment(capturedArgs, name), skip: false };
        case 'branch *':
            return { obj: reconstructBranch(capturedArgs, name), skip: false };
        // wsv-struct-type-batch: victual_info/def_skill are flat one-field-
        // per-member structs (reconstructFlat, same as attack*/mkroom*);
        // Loot ** is a single-field {value} presence-bit pseudo-struct, same
        // mechanism as struct mapfragment **/struct monst **.
        case 'struct victual_info *':
            return { obj: reconstructFlat(capturedArgs, name, 'struct victual_info *'), skip: false };
        case 'struct def_skill *':
            return { obj: reconstructFlat(capturedArgs, name, 'struct def_skill *'), skip: false };
        case 'Loot **':
            return { obj: reconstructFlat(capturedArgs, name, 'Loot **'), skip: false };
        default:
            return { obj: null, skip: true,
                reason: `struct type '${cType}' not in STRUCT_FIELDS` };
    }
}

// Inspect capturedArgs to decide the marshal plan for a pointer/string param:
// returns 'string' | 'struct-fields' | 'struct-stale' | 'opaque-ptr' | 'null'.
export function detectArgShape(capturedArgs, name, cType) {
    if (capturedArgs == null) return 'null';
    if (capturedArgs[`${name}_null`] === 1) return 'null';
    // harness (2026-09-05): capture_arg_string emits a JSON null for a C NULL
    // `char *` (no <name>_null sidecar), which used to fall through to
    // 'opaque-ptr' and skip the record as pointer_arg_not_captured. A bare
    // null under the arg's own key is a captured NULL pointer.
    if (Object.prototype.hasOwnProperty.call(capturedArgs, name) && capturedArgs[name] === null) return 'null';
    // char* arg captured via capture_arg_string — field holds string value directly
    if (typeof capturedArgs[name] === 'string') return 'string';
    if (capturedArgs[`${name}_ptr`] !== undefined) return 'opaque-ptr';
    const nt = normalizeType(cType);
    if (STRUCT_FIELDS[nt]) {
        // Check if at least one expected field is present
        const fields = STRUCT_FIELDS[nt];
        const hasField = fields.some(f =>
            Object.prototype.hasOwnProperty.call(capturedArgs, `${name}_${f}`)
            || (nt === 'coord *' &&
                (Object.prototype.hasOwnProperty.call(capturedArgs, `${name}_x`)
                 || Object.prototype.hasOwnProperty.call(capturedArgs, `${name}_y`)))
        );
        return hasField ? 'struct-fields' : 'struct-stale';
    }
    return 'opaque-ptr';
}
