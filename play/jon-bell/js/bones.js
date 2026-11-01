import { forget_engravings, sanitize_engravings } from './engrave.js';
import { obj_attach_mid, curse as curse_obj } from './mkobj.js';
import { weight } from './weight.js';
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
// already uses for the save file: a module-scoped Map holds the encoded level
// snapshot; a stub written through js/storage.js carries the key across the
// across segment changes.
//
// @ts-nocheck — js sibling imports.
import { rn2, rnd } from './rng.js';
import { game, wizard } from './gstate.js';
import { paranoid_query } from './paranoid.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { savelev } from './save.js';
import { encode_save_graph, decode_save_graph } from './save_graph.js';
/* js/game.js makeLocation() seeds disp_color with terminal.js's NO_COLOR. */
import { NO_COLOR as NO_COLOR_BONES } from './terminal.js';
import { has_oname, ONAME, ONAME_BONES, has_mgivenname, DEFUNCT_MONSTER, NON_PM } from './const.js';
import { free_oname } from './dokick.js';
import { In_quest, Is_botlevel, Is_oracle_level, ROOMOFFSET, DELPHI } from './const.js';
import { DUNGEON_LUA_TABLE } from './dungeon_data.js';
import { Is_branchlev } from './dungeon.js';
import { formatkiller } from './topten.js';
import { In_hell, OC_USES_KNOWN } from './mklev.js';
import { PM_ORACLE, PM_MEDUSA, PM_VLAD_THE_IMPALER } from './pm.generated.js';
import { pline, invalidate_map_row, impossible_sync } from './display.js';
import { fruitadd } from './options.js';
import { the, xname, oname, exist_artifact, is_quest_artifact, artifact_exists } from './objnam.js';
import { LEAVESTATUE, CORPSTAT_NONE, NO_MINVENT, INTRINSIC, ismnum, MON_FLOOR } from './const.js';
import { roles, races } from './roles.js';
import { dismount_steed } from './cmd.js';
import { update_mlstmv } from './dog.js';
import { DISMOUNT_BONES } from './const.js';
import { clear_bypasses } from './trap.js';
import { hhmmss, yyyymmdd } from './allmain.js';
import { permonstTemplate } from './makemon.js';

/* monflag.h G_UNIQ — the geno bit unique_corpstat() tests (see resetobjs). */
const G_UNIQ = 0x1000;

/* C bones.c:513-538,818-829 — identify the deceased hero's remnant. */
function save_ebones(mtmp) {
    const { u, flags } = game;
    mtmp.mextra ??= {};
    const ebones = mtmp.mextra.ebones ??= { parentmid: mtmp.m_id };
    Object.assign(ebones, {
        role: roles.findIndex(r => r.name.m === game.urole?.name?.m),
        race: races.findIndex(r => r.name === game.urace?.name),
        oldalign: { ...u.ualign }, deathlevel: u.ulevel, luck: u.uluck,
        mnum: game.urole.mnum, female: !!flags.female,
        demigod: !!u.uevent?.udemigod, crowned: (u.uevent?.uhand_of_elbereth | 0) & 1,
    });
}

/* ── the bones "file" ────────────────────────────────────────────────────────
 * C ref: files.c set_bonesfile_name() / open_bonesfile() / create_bonesfile() /
 * delete_bonesfile().  C's name is "bonD0.3"-ish, derived from the dungeon
 * branch and level; the only property this port needs is that the write and the
 * read agree, and that the key is per-LEVEL (a hero who dies on Dlvl 3 leaves
 * bones only on Dlvl 3).
 *
 * The BODY in the VFS is a stub, exactly as js/save.js:322 writes "NHSAVE 1\n…":
 * the encoded level stays in `bonesStore` below, keyed by the id in the stub.
 * Each read decodes a detached graph, so gameplay cannot alter a retained
 * bones file. */
const bonesStore = new Map();
let bonesSerial = 0;

const PUBLISH_BONES_FILE = true;

const PM_GHOST = 287;          /* pm.h — same constant js/mklev.js:207 holds */
const MM_NONAME = 0x00000040;  /* js/const.js:2147 */

/* C dungeon.c ledger_no(&u.uz) — the absolute cross-branch level index, the
 * same key js/save.js savelev() and js/restore.js getlev() use.  All
 * callers share this port of dungeon.c:1376-1379, including the xint16 cast. */
export function ledger_no(uz) {
    const dgn = game.dungeons?.[uz?.dnum | 0];
    const jingle = game.context?.jingle || ''; // C's dungeons[-1].ledger_start aliases context.jingle for wished portals.
    const start = (uz?.dnum | 0) === -1
        ? (jingle.charCodeAt(0) || 0) | ((jingle.charCodeAt(1) || 0) << 8) : dgn?.ledger_start | 0;
    return (((uz?.dlevel | 0) + start) << 16) >> 16;
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

/* C bones.c:18-34.  Both the death path and level generation use this guard.
 * Dungeon initialization retains the Lua name rather than boneid, so recover
 * that field from the same source table when it is not stored explicitly. */
export function no_bones_level(lev) {
    const saved = game.save_dlevel;
    if (saved && ledger_no(saved)) {
        lev.dnum = saved.dnum;
        lev.dlevel = saved.dlevel;
    }
    const dgn = game.dungeons[lev.dnum];
    const boneid = dgn.boneid
        ?? DUNGEON_LUA_TABLE.find((d) => d.name === dgn.dname)?.bonetag;
    return no_bones_special_level(lev)
        || !boneid
        || Is_botlevel(lev)
        || (!!Is_branchlev(lev) && lev.dlevel > 1)
        || (In_hell(lev) && lev.dlevel === dgn.num_dunlevs - 1);
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
    /* C bones.c:707 getlev() reads fresh allocations from the file on every
     * load.  In particular, declining "Unlink bones?" must leave the file
     * unchanged by renumbering, stair reversal, and subsequent gameplay. */
    return { bonesid: lines[1], key: lines[2], snap: decode_save_graph(snap) };
}

/* C files.c:1359 create_bonesfile() + :1400 commit_bonesfile(). */
function create_bonesfile(uz, bonesid, snap) {
    const key = `b${++bonesSerial}`;
    /* C bones.c:621 savelev() writes bytes, not aliases into the live level. */
    bonesStore.set(key, encode_save_graph(snap));
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

/* C bones.c:784 set_ghostly_objlist — mark this chain for fix_ghostly_obj.
 * C does not recurse into container contents. */
function set_ghostly_objlist(ochain) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        otmp.ghostly = 1;
    }
}

/* C bones.c:51 resetobjs(ochain, restore).
 * RNG-FREE on both halves; the next_ident() draws a bones load makes are in
 * restore.c's restobjchn/restmonchn, not here.
 *
 * Remaining gaps include in_use deallocation, how_lost, and the
 * SCR_MAIL / CORPSE-STATUE cant_revive / mines-soko prize arms. */
async function resetobjs(ochain, restore) {
    for (let otmp = ochain; otmp; otmp = otmp?.nobj) {
        if (otmp.cobj)
            await resetobjs(otmp.cobj, restore);
        if (restore) {
            // C bones.c:68-78: reject duplicates and this hero's quest artifact.
            if (otmp.oartifact) {
                if (exist_artifact(otmp.otyp, ONAME(otmp)) || is_quest_artifact(otmp)) {
                    otmp.oartifact = 0;
                    if (has_oname(otmp)) free_oname(otmp);
                } else {
                    artifact_exists(otmp, ONAME(otmp), true, ONAME_BONES);
                }
            }
            continue;
        }
        /* C bones.c:103-105: only types with oc_uses_known lose known;
         * clearing it on coins causes a false discovery when they merge. */
        if (OC_USES_KNOWN[otmp.otyp | 0])
            otmp.known = 0;
        otmp.dknown = 0;
        otmp.bknown = 0;
        otmp.rknown = 0;
        otmp.lknown = 0;
        otmp.cknown = 0;
        otmp.tknown = 0;
        otmp.invlet = 0;
        otmp.no_charge = 0;
        /* C bones.c:115-129 — strip user-supplied names; statues, novels,
         * artifacts and named corpses of special (unique) monsters keep theirs. */
        if (has_oname(otmp)
            && !((otmp.oartifact | 0) || otmp.otyp === 476 /* STATUE */
                 || otmp.otyp === 408 /* SPE_NOVEL */
                 || (otmp.otyp === 265 /* CORPSE */
                     && (otmp.corpsenm | 0) >= 330 /* SPECIAL_PM */)))
            free_oname(otmp);
        /* C bones.c:131-190 — the save-side fixups by object type; the
         * invocation relics stop being the real thing in the next game. */
        if (otmp.otyp === 285 /* SLIME_MOLD */) {
            goodfruit(otmp.spe);
        } else if (otmp.otyp === 266 /* EGG */) {
            otmp.spe = 0; /* not "laid by you" in next game */
        } else if (otmp.otyp === 296 /* TIN */) {
            /* C bones.c:142-146 — "make tins of unique monster's meat be
             * empty": a wished-for tin of unique meat (readobjnam waives
             * G_UNIQ for wizard) loads as "an empty tin" for the next player. */
            const mndx = otmp.corpsenm | 0;
            if (ismnum(mndx)
                && (permonstTemplate(mndx).geno & G_UNIQ) !== 0)
                otmp.corpsenm = NON_PM;
        } else if (otmp.otyp === 213 /* AMULET_OF_YENDOR */) {
            otmp.otyp = 212; /* FAKE_AMULET_OF_YENDOR */
            await curse_obj(otmp);
        } else if (otmp.otyp === 262 /* CANDELABRUM_OF_INVOCATION */) {
            if (otmp.lamplit) {
                const { end_burn } = await import('./timeout.js');
                end_burn(otmp, true);
            }
            otmp.otyp = 225; /* WAX_CANDLE */
            otmp.age = 50; /* assume used */
            if (otmp.spe > 0)
                otmp.quan = otmp.spe;
            otmp.spe = 0;
            otmp.owt = weight(otmp);
            await curse_obj(otmp);
        } else if (otmp.otyp === 263 /* BELL_OF_OPENING */) {
            otmp.otyp = 255; /* BELL */
            await curse_obj(otmp);
        } else if (otmp.otyp === 409 /* SPE_BOOK_OF_THE_DEAD */) {
            otmp.otyp = 407; /* SPE_BLANK_PAPER */
            await curse_obj(otmp);
        }
    }
}

/* C bones.c:203 give_to_nearby_mon / :258 drop_upon_death.  The single body
 * lives in js/shk.js (it landed there first, for finish_paybill, which is C's
 * OTHER caller — bones.c:257's own comment names both).  C's definition site is
 * bones.c:258; importing rather than re-deriving keeps one body, per the
 * two-real-bodies rule. */
import { drop_upon_death, fix_shop_damage, unleash_all, goodfruit_fp as goodfruit } from './shk.js';

async function fixuporacle(oracle) {
    if (!Is_oracle_level(game.u.uz))
        return false;
    oracle.mpeaceful = 1;
    const rooms = game.level.rooms;
    let o_ridx = game.level.locations[oracle.mx][oracle.my].roomno - ROOMOFFSET;
    if (o_ridx >= 0 && rooms[o_ridx]?.rtype === DELPHI)
        return true;

    let ridx = 0;
    for (; ridx < rooms.length; ++ridx)
        if (rooms[ridx]?.orig_rtype === DELPHI)
            break;
    if (o_ridx !== ridx && ridx < rooms.length) {
        const { enexto_out, rloc_to } = await import('./teleport.js');
        const room = rooms[ridx];
        const cc = enexto_out(Math.trunc((room.lx + room.hx) / 2),
                              Math.trunc((room.ly + room.hy) / 2), oracle.data);
        if (cc) {
            await rloc_to(oracle, cc.x, cc.y);
            o_ridx = game.level.locations[oracle.mx][oracle.my].roomno - ROOMOFFSET;
        }
    }
    if (ridx === o_ridx)
        rooms[ridx].rtype = DELPHI;
    return true;
}

/* C bones.c:390 remove_mon_from_bones(mtmp), called by savebones. */
const MS_LEADER = 36, MS_NEMESIS = 37; /* monflag.h:51-52 */
async function remove_mon_from_bones(mtmp, mongone) {
    const ptr = mtmp.data || {};
    if (mtmp.iswiz
        || ptr.pmidx === PM_MEDUSA || ptr.pmidx === PM_VLAD_THE_IMPALER
        || mtmp.cham === PM_VLAD_THE_IMPALER /* C monst.h:222 is_Vlad */
        || ptr.msound === MS_NEMESIS
        || ptr.msound === MS_LEADER
        || (ptr.pmidx === PM_ORACLE && !await fixuporacle(mtmp)))
        await mongone(mtmp);
}

export async function savebones(how, when, corpse) {
    const g = game;
    const u = g.u || (g.u = {});

    clear_bypasses(); /* C bones.c:415 — even when bones already exist */
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

    unleash_all(); /* C bones.c:435 */
    if (g.u?.uball) {
        const { unpunish } = await import('./dig.js');
        await unpunish();
    }
    if (u.usteed)
        await dismount_steed(DISMOUNT_BONES);

    /* C bones.c:445-446 iter_mons(remove_mon_from_bones); dmonsfree(); */
    {
        const { mongone } = await import('./mklev.js');
        const { dmonsfree } = await import('./mkmaze.js');
        for (let mtmp = g.fmon, next; mtmp; mtmp = next) {
            next = mtmp.nmon;
            if (mtmp.mhp > 0 && (mtmp.mstate | 0) === MON_FLOOR)
                await remove_mon_from_bones(mtmp, mongone);
        }
        await dmonsfree();
    }

    forget_engravings(); // C bones.c:449 — new hero has not discovered these.

    for (let f = g.ffruit; f; f = f.nextf)
        f.fid = -f.fid; // C bones.c:451-452: mark fruit types absent initially.

    set_ghostly_objlist(g.invent);

    if (ismnum(u.ugrave_arise)) {
        const { makemon } = await import('./mklev.js');
        g.in_mklev = true; /* use <u.ux,u.uy> as-is */
        let mtmp = await makemon(u.ugrave_arise | 0, u.ux | 0, u.uy | 0, NO_MINVENT);
        g.in_mklev = false;
        if (!mtmp) { /* arise-type might have been genocided */
            await drop_upon_death(null, null, u.ux | 0, u.uy | 0);
            u.ugrave_arise = -1; /* NON_PM */
            return;
        }
        // C mondata.c:1586 give_u_to_m_resistances: FIRE_RES..STONE_RES
        for (let intr = 1; intr <= 8; intr++) {
            if ((u.uprops?.[intr]?.intrinsic | 0) & INTRINSIC)
                mtmp.mintrinsics = (mtmp.mintrinsics | 0) | (1 << (intr - 1));
        }
        const { christen_monst } = await import('./mhitm.js');
        christen_monst(mtmp, String(g.plname ?? g.u?.plname ?? ''));
        const { newsym } = await import('./display.js');
        newsym(u.ux | 0, u.uy | 0);
        await drop_upon_death(mtmp, null, u.ux | 0, u.uy | 0);
        const { m_carrying, m_dowear } = await import('./trap.js');
        if (mtmp.data?.mlet === 39 /* S_MUMMY */ && !m_carrying(mtmp, 138 /* MUMMY_WRAPPING */)) {
            const { mongets } = await import('./m_initweap.js');
            const { mksobj } = await import('./mklev.js');
            // C bones.c:477: mongets creates the missing mummy wrapping.
            await mongets(mtmp, 138, mksobj);
        }
        await m_dowear(mtmp, true);
        // C bones.c:505-509 — fields common to every arise type.
        mtmp.m_lev = (u.ulevel | 0) ? (u.ulevel | 0) : 1;
        mtmp.mhp = mtmp.mhpmax = (u.uhpmax | 0);
        mtmp.female = !!g.flags?.female;
        mtmp.msleeping = 1;
        save_ebones(mtmp);
    } else if (u.ugrave_arise === LEAVESTATUE) {
        const { mkcorpstat } = await import('./mklev.js');
        let statue = await mkcorpstat(476 /* STATUE */, null, u.umonnum,
                                    u.ux | 0, u.uy | 0, CORPSTAT_NONE);
        if (statue)
            statue = await oname(statue, String(g.plname ?? u.plname ?? ''), 0);
        await drop_upon_death(null, statue, u.ux | 0, u.uy | 0);
        if (!statue)
            return; /* C bones.c:486-487 */
    } else {
    /* C bones.c:490-503: drop everything, then raise a ghost. */
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
    obj_attach_mid(corpse, mtmp.m_id); // C bones.c:503

    /* C bones.c:505-539 — the ghost's own fields and deceased hero's identity. */
    mtmp.m_lev = (u.ulevel | 0) ? (u.ulevel | 0) : 1;
    mtmp.mhp = mtmp.mhpmax = (u.uhpmax | 0);
    mtmp.female = !!g.flags?.female;
    mtmp.msleeping = 1;
    save_ebones(mtmp);
    }

    /* C bones.c:541-550 — every monster on the level is stripped of its
     * relationship to the DEAD hero. */
    for (let m = g.fmon; m; m = m.nmon) {
        set_ghostly_objlist(m.minvent);
        await resetobjs(m.minvent, false);
        m.mlstmv = 0;
        if (m.mtame) {
            m.mtame = 0;
            m.mpeaceful = 0;
        }
        m.seen_resistance = 0; /* M_SEEN_NOTHING */
    }
    /* C bones.c:551-554 — traps forget who made them; unhideable traps stay
     * seen.  unhideable_trap() is (ttyp == HOLE) only (trap.h:115); all other
     * traps arrive un-seen. */
    for (let t = g.ftrap; t; t = t.ntrap) {
        t.madeby_u = 0;
        t.tseen = unhideable_trap(t.ttyp | 0) ? 1 : 0;
    }
    set_ghostly_objlist(g.fobj);
    await resetobjs(g.fobj, false);
    set_ghostly_objlist(g.level?.buriedobjlist);
    await resetobjs(g.level?.buriedobjlist, false);

    /* C bones.c:558-560 — "Hero is no longer on the map." */
    u.ux0 = u.ux;
    u.uy0 = u.uy;
    u.ux = 0;
    u.uy = 0;

    /* C bones.c:563-570 — clear all MEMORY from the level (seenv/waslit/glyph/
     * lastseentyp).  The next hero has not seen any of it. */
    const lev = g.level;
    if (lev?.locations) {
        for (let y = 0; y < 21; y++) invalidate_map_row(y);
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
            how: formatkiller('', 256 /* sizeof newbones->how */, how, true),
            when: String(yyyymmdd(when)) + String(hhmmss(when)).padStart(6, '0'),
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
    /* C bones.c:620 `update_mlstmv();` ("update monsters for eventual
     * restoration") -- after the :545 zeroing above, every live monster is
     * stamped with the dying game's svm.moves before savelev(), and that value
     * travels in the bones file.  A bones monster's mlstmv is read by
     * dogmove.c:1159's return-attack guard in the NEXT game. */
    update_mlstmv();
    const ledger = ledger_no(u.uz);
    await savelev(ledger);
    const snap = game.levelStore?.get(ledger);
    if (!snap)
        return;
    snap.fruits = []; // C save.c:951 savefruitchn: omit negative fruit IDs.
    for (let f = g.ffruit; f; f = f.nextf)
        if (f.fid >= 0) snap.fruits.push({ fid: f.fid, fname: f.fname });
    if (PUBLISH_BONES_FILE)
        create_bonesfile(u.uz, bonesid, snap);
}

const HOLE = 13;
function unhideable_trap(ttyp) {
    return ttyp === HOLE;
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
    if (no_bones_level(u.uz))
        return false; /* C bones.c:648: reject before opening or prompting. */
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
    const { propagate } = await import('./makemon.js');
    for (let m = f.snap.fmon; m; m = m.nmon) {
        m.m_id = next_ident_bones();
        // C restore.c:408-415: mark extinct/genocided bones monsters for purge.
        if (!await propagate(m.cham === NON_PM ? m.mnum : m.cham, true, true))
            m.mhpmax = DEFUNCT_MONSTER;
        renumber_objchn(m.minvent, f.snap.fruits);
    }
    renumber_objchn(f.snap.fobj, f.snap.fruits);
    renumber_objchn(f.snap.level?.buriedobjlist, f.snap.fruits);
    renumber_objchn(f.snap.billobjs, f.snap.fruits);

    const ledger = ledger_no(u.uz);
    (game.levelStore || (game.levelStore = new Map())).set(ledger, f.snap);
    const { getlev } = await import('./restore.js');
    await getlev(ledger);

    /* C bones.c:714-731 — sanitize names, purge defunct monsters, repair shops. */
    const { sanitize_name } = await import('./options.js');
    const { mongone } = await import('./mklev.js');
    for (let m = g.fmon; m; m = m.nmon) {
        if (has_mgivenname(m))
            m.mextra.mgivenname = sanitize_name(m.mextra.mgivenname);
        if (m.mhpmax === DEFUNCT_MONSTER)
            await mongone(m);
        else
            await resetobjs(m.minvent, true);
    }
    await resetobjs(g.fobj, true);
    await resetobjs(g.level?.buriedobjlist, true);
    await fix_shop_damage();

    /* C bones.c:729-731 */
    g.program_state.reading_bonesfile = 0;
    sanitize_engravings(); // C bones.c:736
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

/* C bones.c:796-816 — only asymmetrical weapons need a handedness message;
 * every picked-up ghostly object loses the marker, after the message. */
export async function fix_ghostly_obj(obj) {
    if (!obj.ghostly)
        return;
    const BOW = 83, ELVEN_BOW = 84, ORCISH_BOW = 85, YUMI = 86, BOOMERANG = 26;
    switch (obj.otyp) {
    case BOW:
    case ELVEN_BOW:
    case ORCISH_BOW:
    case YUMI:
    case BOOMERANG:
        await pline('You make adjustments to %s to suit your %s hand.',
                    the(xname(obj)), game.u.uhandedness ? 'left' : 'right');
        break;
    default:
        break;
    }
    obj.ghostly = 0;
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
function renumber_objchn(ochain, fruits) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        otmp.o_id = next_ident_bones();
        if (otmp.otyp === 285 /* SLIME_MOLD; restore.c:260,500 ghostfruit */) {
            const fruit = fruits?.find(f => f.fid === otmp.spe);
            if (fruit) otmp.spe = fruitadd(fruit.fname, null, false);
            else impossible_sync('no old fruit?');
        }
        if (otmp.cobj)
            renumber_objchn(otmp.cobj, fruits);
    }
}
