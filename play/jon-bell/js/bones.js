// bones.c — the bones subsystem: savebones() writes the level a hero died on,
// getbones() reads it back into the NEXT game on the same level.
//
// C ref: nethack-c-v5/upstream/src/bones.c.
//
// ── THE PREMISE THIS FILE USED TO CARRY, AND WHY IT IS FALSE ─────────────────
//
//      open_bonesfile always returns NULL -> getbones always returns 0.  The
//      only RNG-visible effect is the rn2(3) call at line 643."
//
// That is measurably wrong, and it is wrong because it reasons about DISK.  The
//
//   BONES WRITES (savebones)
//                                9x rn2(5)/rn2(8) @ drop_upon_death(bones.c:290/296)
//                                18x the same pair on step 187
//   BONES READS (getbones returning 1)
//                                49x rnd(2) @ next_ident(mkobj.c:521) and NO
//                                makelevel body at all (mklev returns early)
//                                "Unlink bones? [yn] (n)", 49x next_ident
//
// A bones LOAD is therefore recognisable in a recording as `rn2(3)=0 @ getbones`
// followed IMMEDIATELY by `rnd(2) @ next_ident`, not by `rn2(5) @ makelevel`.
// The next_ident leaves are restore.c:255 / restore.c:401 — restobjchn() and
// by grepping the recordings for the string "restore.c" and finding none; that
// CALLS rn2/rnd — here next_ident(mkobj.c:521) — not with its caller.  The
// earlier claim was right and its C citations were right.
//
// The rn2(3) is therefore NOT "the only RNG-visible effect"; it is the coin flip
// that decides whether the rest of this file runs.
//
// ── WHAT IS PORTED HERE ─────────────────────────────────────────────────────
// The bones "file" is the same in-memory-plus-VFS-stub arrangement js/save.js
// already uses for the save file: a module-scoped Map holds the level snapshot
// (which is a graph of live JS objects, not a serialisation), and a stub written
// through js/storage.js carries the key across the runSegment() boundary.  That
// is the ONLY channel that survives a segment change, and it is the channel the
//
// @ts-nocheck — js sibling imports.
import { rn2, rnd } from './rng.js';
import { game, wizard } from './gstate.js';
import { paranoid_query } from './paranoid.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { savelev } from './save.js';
/* js/game.js makeLocation() seeds disp_color with terminal.js's NO_COLOR. */
import { NO_COLOR as NO_COLOR_BONES } from './terminal.js';
import { In_quest } from './const.js';
import { DUNGEON_LUA_TABLE } from './dungeon_data.js';

/* ── the bones "file" ────────────────────────────────────────────────────────
 * C ref: files.c set_bonesfile_name() / open_bonesfile() / create_bonesfile() /
 * delete_bonesfile().  C's name is "bonD0.3"-ish, derived from the dungeon
 * branch and level; the only property this port needs is that the write and the
 * read agree, and that the key is per-LEVEL (a hero who dies on Dlvl 3 leaves
 * bones only on Dlvl 3).
 *
 * The BODY in the VFS is a stub, exactly as js/save.js:322 writes "NHSAVE 1\n…":
 * the level itself stays in `bonesStore` below, keyed by the id in the stub.
 * That is not a shortcut around serialisation for its own sake — the level is
 * already a live JS object graph, and C's file round-trip is a pointer swap
 * here (see js/save.js's savelev header for the same argument). */
const bonesStore = new Map();
let bonesSerial = 0;

const PUBLISH_BONES_FILE = true;

const PM_GHOST = 287;          /* pm.h — same constant js/mklev.js:207 holds */
const MM_NONAME = 0x00000040;  /* js/const.js:2147 */

/* C dungeon.c ledger_no(&u.uz) — the absolute cross-branch level index, the
 * same key js/save.js savelev() and js/restore.js getlev() use.  cmd.c has a
 * file-local copy (ledger_no_cmd); this is the same arithmetic rather than a
 * new export, because cmd.c importing bones.c would close a cycle. */
function ledger_no(uz) {
    const dgn = game.dungeons?.[uz?.dnum | 0];
    return (uz?.dlevel | 0) + (dgn?.ledger_start | 0);
}

function dgn_boneid(dnum) {
    const dname = game._dungeons_full?.[dnum | 0]?.dname;
    const row = DUNGEON_LUA_TABLE.find((d) => d.name === dname);
    return (row && row.bonetag) ? row.bonetag : '0';
}
/* C dungeon.c:585 Is_special(lev) — the s_level for this (dnum,dlevel), or
 * NULL.  js/dungeon_rng.js:553 publishes the same chain as game._sp_levchn,
 * and each entry carries the level's own boneid (its `bonetag` char code). */
function sp_level_boneid(uz) {
    const chn = game._sp_levchn || [];
    for (const sl of chn) {
        if ((sl.dlevel?.dnum | 0) === (uz?.dnum | 0)
            && (sl.dlevel?.dlevel | 0) === (uz?.dlevel | 0))
            return (sl.boneid | 0) ? String.fromCharCode(sl.boneid | 0) : null;
    }
    return null;
}
/* C bones.c:18-31 — special levels with no boneid are explicitly ineligible
 * for bones.  Keep this predicate separate from the filename helper so the
 * death path can apply the same no_bones_level guard before asking a wizard
 * whether to save bones. */
export function no_bones_special_level(uz) {
    const chn = game._sp_levchn || [];
    return chn.some((sl) => (sl.dlevel?.dnum | 0) === (uz?.dnum | 0)
        && (sl.dlevel?.dlevel | 0) === (uz?.dlevel | 0)
        && !(sl.boneid | 0));
}
function bones_filename(uz) {
    const q = In_quest(uz) ? String(game.urole?.filecode ?? '0') : '0';
    const sp = sp_level_boneid(uz);
    return `bon${dgn_boneid(uz?.dnum | 0)}${q}.${sp !== null ? sp : (uz?.dlevel | 0)}`;
}

/* C files.c:1319 open_bonesfile(lev, &bonesid) — returns NULL when no bones
 * file exists for this level.  Here: the stub body plus the resolved snapshot,
 * or null. */
function open_bonesfile(uz) {
    const body = vfsReadFile(bones_filename(uz));
    if (typeof body !== 'string')
        return null;
    const lines = body.split('\n');
    if (lines[0] !== 'NHBONES 1')
        return null;
    const snap = bonesStore.get(lines[2]);
    if (!snap)
        return null;
    return { bonesid: lines[1], key: lines[2], snap };
}

/* C files.c:1359 create_bonesfile() + :1400 commit_bonesfile(). */
function create_bonesfile(uz, bonesid, snap) {
    const key = `b${++bonesSerial}`;
    bonesStore.set(key, snap);
    if (!vfsWriteFile(bones_filename(uz), `NHBONES 1\n${bonesid}\n${key}\n`)) {
        bonesStore.delete(key);
        return false;
    }
    return true;
}

/* C files.c:1420 delete_bonesfile(). */
function delete_bonesfile(uz) {
    const f = open_bonesfile(uz);
    if (f)
        bonesStore.delete(f.key);
    return vfsDeleteFile(bones_filename(uz));
}

/* C bones.c:151 set_ghostly_objlist(ochain) — marks a chain as coming from (or
 * going to) a bones file.  The flag is read by shop/artifact bookkeeping this
 * port has no live model for; the walk is kept so the field exists and the call
 * order is C's. */
function set_ghostly_objlist(ochain) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        otmp.ghostly = 1;
        if (otmp.cobj)
            set_ghostly_objlist(otmp.cobj);
    }
}

/* C bones.c:60 resetobjs(ochain, restore) — the SAVING half (restore == FALSE).
 * RNG-FREE on both halves; the next_ident() draws a bones load makes are in
 * restore.c's restobjchn/restmonchn, not here.
 *
 * GAPs, each a field with no live model in this port rather than a decision:
 * the in_use dealloc arm (no obj->in_use writer), the artifact/oname arms
 * (no oname chain), goodfruit (no fruit list), the EGG/SCR_MAIL/TIN arms. */
function resetobjs(ochain, restore) {
    for (let otmp = ochain; otmp; otmp = otmp?.nobj) {
        if (otmp.cobj)
            resetobjs(otmp.cobj, restore);
        if (restore)
            continue;
        /* C bones.c:118-127 — saving: forget everything the dead hero knew. */
        otmp.known = 0;
        otmp.dknown = 0;
        otmp.bknown = 0;
        otmp.rknown = 0;
        otmp.lknown = 0;
        otmp.cknown = 0;
        otmp.tknown = 0;
        otmp.invlet = 0;
        otmp.no_charge = 0;
    }
}

/* C bones.c:203 give_to_nearby_mon / :258 drop_upon_death.  The single body
 * lives in js/shk.js (it landed there first, for finish_paybill, which is C's
 * OTHER caller — bones.c:257's own comment names both).  C's definition site is
 * bones.c:258; importing rather than re-deriving keeps one body, per the
 * two-real-bodies rule. */
import { drop_upon_death } from './shk.js';

const MS_LEADER = 22, MS_NEMESIS = 23; /* monflag.h */
async function remove_mon_from_bones(mtmp, mongone) {
    const ptr = mtmp.data || {};
    if (mtmp.iswiz
        || ptr.msound === MS_NEMESIS
        || ptr.msound === MS_LEADER)
        await mongone(mtmp);
}

export async function savebones(how, when, corpse) {
    const g = game;
    const u = g.u || (g.u = {});

    if (open_bonesfile(u.uz)) {
        let replace = false;
        if (wizard()) {
            if (await paranoid_query(false, 'Bones file already exists.  Replace it?')) {
                if (delete_bonesfile(u.uz)) {
                    replace = true;
                } else {
                    const { pline } = await import('./display.js');
                    await pline('Cannot unlink old bones.');
                }
            }
        }
        if (!replace)
            return;                     /* C: compress_bonesfile(); return; */
    }

    /* C bones.c:437-443 unleash_all() / Punished -> unpunish() / u.usteed ->
     * dismount_steed(DISMOUNT_BONES).  UNPORTED-CALLEEs: no leash, ball-and-
     * chain or steed model survives into a bones file here.  All three are
     * RNG-free on this path. */

    /* C bones.c:445-446 iter_mons(remove_mon_from_bones); dmonsfree(); */
    {
        const { mongone } = await import('./mklev.js');
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
            await remove_mon_from_bones(mtmp, mongone);
    }

    /* C bones.c:448 forget_engravings() — "next hero won't have read any
     * engravings yet".  engrave.c:1509 walks the level's engraving chain and
     * clears each one's `engr_time`/`guardobjects` reader flags; this port's
     * engraving map (js/mklev.js save_engravings) has no per-engraving seen
     * flag, so there is nothing to clear. */


    set_ghostly_objlist(g.invent);

    await drop_upon_death(null, null, u.ux | 0, u.uy | 0);
    const { makemon } = await import('./mklev.js');
    g.in_mklev = true; /* C bones.c:490 gi.in_mklev = TRUE — "use <u.ux,u.uy> as-is" */
    const mtmp = await makemon(PM_GHOST, u.ux | 0, u.uy | 0, MM_NONAME);
    g.in_mklev = false;
    if (!mtmp)
        return;
    {
        const { christen_monst } = await import('./mhitm.js');
        christen_monst(mtmp, String(g.plname ?? g.u?.plname ?? ''));
    }
    /* C bones.c:497 obj_attach_mid(corpse, mtmp->m_id) — the hero's corpse is
     * created by really_done()'s grave block (end.c:1306), which is NOT ported,
     * so `corpse` is always null here.  Named rather than dropped. */
    void corpse;

    /* C bones.c:499-539 — the ghost's own fields, plus the EBONES record that
     * lets a later hero identify whose ghost it is.  EBONES has no reader in
     * this port (nothing farlooks a bones ghost's role yet), so only the fields
     * with live readers are set. */
    mtmp.m_lev = (u.ulevel | 0) ? (u.ulevel | 0) : 1;
    mtmp.mhp = mtmp.mhpmax = (u.uhpmax | 0);
    mtmp.female = !!g.flags?.female;
    mtmp.msleeping = 1;

    /* C bones.c:541-550 — every monster on the level is stripped of its
     * relationship to the DEAD hero. */
    for (let m = g.fmon; m; m = m.nmon) {
        set_ghostly_objlist(m.minvent);
        resetobjs(m.minvent, false);
        m.mlstmv = 0;
        if (m.mtame) {
            m.mtame = 0;
            m.mpeaceful = 0;
        }
        m.seen_resistance = 0; /* M_SEEN_NOTHING */
    }
    /* C bones.c:551-554 — traps forget who made them; unhideable traps stay
     * seen.  unhideable_trap() is the (ttyp == HOLE || is_pit || is_xport)
     * family; without it every trap would arrive un-seen, which is C's
     * behaviour for the hideable ones. */
    for (let t = g.ftrap; t; t = t.ntrap) {
        t.madeby_u = 0;
        t.tseen = unhideable_trap(t.ttyp | 0) ? 1 : 0;
    }
    set_ghostly_objlist(g.fobj);
    resetobjs(g.fobj, false);
    set_ghostly_objlist(g.level?.buriedobjlist);
    resetobjs(g.level?.buriedobjlist, false);

    /* C bones.c:558-560 — "Hero is no longer on the map." */
    u.ux0 = u.ux;
    u.uy0 = u.uy;
    u.ux = 0;
    u.uy = 0;

    /* C bones.c:563-570 — clear all MEMORY from the level (seenv/waslit/glyph/
     * lastseentyp).  The next hero has not seen any of it. */
    const lev = g.level;
    if (lev?.locations) {
        for (let x = 1; x < 80; x++) {
            const col = lev.locations[x];
            if (!col) continue;
            for (let y = 0; y < 21; y++) {
                const c = col[y];
                if (!c) continue;
                c.seenv = 0;
                c.waslit = 0;
                c.remembered_glyph = undefined;
                c.glyph_symidx = -1;
                c.disp_ch = ' ';
                c.disp_is_warning = false;
                c.disp_color = NO_COLOR_BONES;
                c.disp_decgfx = false;
                c.disp_attr = 0;
                c.gnew = 0;
                c.lastseentyp = 0;
            }
        }
    }

    {
        const _fc3 = (v) => String(v ?? '').slice(0, 3);
        const plname = String(g.plname ?? g.u?.plname ?? '');
        const gender = g.flags?.female ? 'Fem' : 'Mal';
        /* C's aligns[] is indexed 1 - u.ualign.type, i.e. lawful(1)->0,
         * neutral(0)->1, chaotic(-1)->2, with filecodes Law/Neu/Cha. */
        const alignFc = ['Law', 'Neu', 'Cha'][1 - ((g.u?.ualign?.type) | 0)] ?? 'Neu';
        const newbones = {
            who: `${plname}-${_fc3(g.urole?.filecode)}-${_fc3(g.urace?.filecode)}`
                 + `-${gender}-${alignFc}`,
            frpx: u.ux0 | 0,
            frpy: u.uy0 | 0,
            bonesknown: false,
            next: g.level?.bonesinfo ?? null,
        };
        if (g.level)
            g.level.bonesinfo = newbones;
        /* C bones.c:598-599 — `if (wizard) svl.level.flags.wizard_bones = 1;` */
        if (wizard() && g.level?.flags)
            g.level.flags.wizard_bones = 1;
    }

    /* C files.c:1327 `*bonesid = gb.bones + 3` — the bonesid IS the file name
     * minus its "bon" prefix, and getbones() compares the one it derives from
     * the level against the one stored in the file.  Keying it off ledger_no
     * had the same cross-game defect bones_filename() had. */
    const bonesid = bones_filename(u.uz).slice(3);

    /* C bones.c:600 create_bonesfile + :617 savelev(nhfp, ledger_no(&u.uz)).
     * js/save.js savelev() snapshots the level into game.levelStore and then
     * frees the live copy — which is C's release_data arm and is correct here
     * too: savebones is the last thing that touches the level before the
     * process ends. */
    const ledger = ledger_no(u.uz);
    savelev(ledger);
    const snap = game.levelStore?.get(ledger);
    if (!snap)
        return;
    if (PUBLISH_BONES_FILE)
        create_bonesfile(u.uz, bonesid, snap);
}

const HOLE = 13, PIT = 11, SPIKED_PIT = 12, TRAPDOOR = 14,
      TELEP_TRAP = 15, LEVEL_TELEP = 16, MAGIC_PORTAL = 17, VIBRATING_SQUARE = 24;
function unhideable_trap(ttyp) {
    return ttyp === HOLE || ttyp === PIT || ttyp === SPIKED_PIT
        || ttyp === TRAPDOOR || ttyp === TELEP_TRAP || ttyp === LEVEL_TELEP
        || ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

/* C ref: bones.c:628 getbones(void), called from mklev() (mklev.c:6102) on
 * entry to a level that has not been generated yet.
 *
 * flags.bones defaults to On (TRUE) per optlist.h NHOPTB; only falsy when
 * explicitly disabled via "!bones".  JS starts with flags:{} so undefined must
 * read as ENABLED, not disabled (matches C's zero-init + On).
 */
export function getbones() {
    const g = game;
    const u = g.u || {};
    const flags = g.flags || {};
    if (flags.explore)
        return false; /* C bones.c:638 discover — save bones for real games */
    if (!flags.bones && flags.bones !== undefined)
        return false; /* C bones.c:641 !flags.bones */
    /* C bones.c:643-645 — "only once in three times do we find bones";
     * wizard bypasses. */
    if (rn2(3) && !wizard())
        return false;
    /* C bones.c:646 no_bones_level(&u.uz) — the botlevel/special-level guard.
     * js/end.js can_make_bones() carries the same test on the WRITE side; on
     * the read side a level with no bones file fails the open below anyway, so
     * the only case this guard changes is a level we never wrote to. */
    const f = open_bonesfile(u.uz);
    if (!f)
        return false; /* C bones.c:650 !nhfp */
    return getbones_load(f);
}

async function getbones_load(f) {
    const g = game;
    const u = g.u || {};

    /* C bones.c:664 validate(nhfp, gb.bones, FALSE) != SF_UPTODATE — a version
     * check on a file this port wrote in this process; always UPTODATE. */
    g.program_state = g.program_state || {};
    g.program_state.reading_bonesfile = 1;

    if (wizard()) {
        if (!await paranoid_query(false, 'Get bones?')) {
            g.program_state.reading_bonesfile = 0;
            return false;
        }
    }

    /* C bones.c:689 getlev(nhfp, 0, 0) — read the bones level in.  js/restore.js
     * getlev() reads program_state.reading_bonesfile for its `ghostly` arm: no
     * mon_catchup_elapsed_time, and NO rnd(10) hide roll (C's `ghostly ||`
     * short-circuits the && that contains it).
     *
     * getlev() must see the snapshot through the normal store, which is where
     * the bones file's copy is installed first. */
    for (let m = f.snap.fmon; m; m = m.nmon) {
        m.m_id = next_ident_bones();
        renumber_objchn(m.minvent);
    }
    renumber_objchn(f.snap.fobj);
    renumber_objchn(f.snap.level?.buriedobjlist);
    renumber_objchn(f.snap.billobjs);

    const ledger = ledger_no(u.uz);
    (game.levelStore || (game.levelStore = new Map())).set(ledger, f.snap);
    const { getlev } = await import('./restore.js');
    await getlev(ledger);

    for (let m = g.fmon; m; m = m.nmon)
        resetobjs(m.minvent, true);
    resetobjs(g.fobj, true);
    resetobjs(g.level?.buriedobjlist, true);

    /* C bones.c:729-731 */
    g.program_state.reading_bonesfile = 0;
    if (!u.uroleplay) u.uroleplay = {};
    u.uroleplay.numbones = (u.uroleplay.numbones | 0) + 1;

    if (wizard()) {
        if (!await paranoid_query(false, 'Unlink bones?'))
            return true;
    }
    /* C bones.c:739-748 delete_bonesfile(); a failure means another game won
     * the race and this one regenerates the level instead. */
    if (!delete_bonesfile(u.uz))
        return false;
    return true;
}

/* C bones.c:761-780 bones_include_name(const char *name) — TRUE when this
 * level's cemetery chain holds an entry left by a hero of the same name.  C
 * appends a terminal hyphen to the name first "to avoid partial matches
 * producing false positives", then compares that many leading characters of
 * each record's `who`.  Read by goto_level (do.c:1701) to set `familiar`. */
export function bones_include_name(name) {
    const buf = `${String(name ?? '')}-`;
    for (let bp = game.level?.bonesinfo; bp; bp = bp.next)
        if (String(bp.who ?? '').startsWith(buf))
            return true;
    return false;
}

/* C mkobj.c:509 next_ident() — js/mklev.js has the single body but does not
 * export it, and mklev.js already imports this file, so a static import would
 * close the cycle at module-evaluation time.  Same arithmetic, same global. */
function next_ident_bones() {
    const g = game;
    if (g.context == null)
        g.context = {};
    if (g.context.ident == null)
        g.context.ident = 2; /* id 1 is reserved for gy.youmonst */
    const res = g.context.ident;
    g.context.ident += rnd(2);
    if (!g.context.ident)
        g.context.ident = rnd(2) + 1;
    return res;
}

/* C restore.c:238-300 restobjchn()'s ghostly arm, applied to a chain this port
 * swapped in rather than read: one next_ident() per object, container contents
 * included (C recurses into otmp->cobj at :270 AFTER the parent's renumber). */
function renumber_objchn(ochain) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        otmp.o_id = next_ident_bones();
        if (otmp.cobj)
            renumber_objchn(otmp.cobj);
    }
}
