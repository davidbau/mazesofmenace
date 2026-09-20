// bones.js — Bones file I/O via frozen storage VFS (partial).
// C ref: bones.c savebones / getbones; files.c set_bonesfile_name /
// open_bonesfile / delete_bonesfile; restore.c restmonchn / restobjchn
// ghostly next_ident remapping.

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { next_ident, obj_extract_self, dealloc_obj, curse, free_omonst, set_corpsenm, weight, is_mines_prize, is_soko_prize } from './mkobj.js';
import { peace_minded, set_malign, propagate } from './makemon.js';
import {
    OBJ_FLOOR, OBJ_CONTAINED, SHOPBASE, ROOMOFFSET, ONAME_BONES,
    DEFUNCT_MONSTER, NON_PM, TRICKED, LOST_NONE, has_oname, has_omonst,
    has_mgivenname, ismnum,
} from './const.js';
import { FOOD_CLASS } from './objects.js';
import { save_track, rest_track } from './track.js';
import { yn_function } from './getline.js';
import { pline, paint_gbuf_level_to_terminal } from './display.js';
import { vision_off_newsym_gbuf } from './vision.js';
import { fruit_from_indx, fruit_from_name } from './objnam.js';
import { rn2, rnd } from './rng.js';
import { objectNames } from './generated/objects_data.js';
import { update_mlstmv } from './dog.js';
import { serLevel, deserLevel } from './lev_json.js';
import { exist_artifact, artifact_exists } from './artifact.js';
import { is_quest_artifact } from './quest.js';
import { safe_oname, free_oname } from './do_name.js';
import { get_obj_location, end_burn } from './timeout.js';
import { inside_shop, fix_shop_damage } from './shk.js';
import { in_rooms } from './hack.js';
import { tended_shop } from './sounds.js';
import { mongone, unique_corpstat } from './mon.js';
import { no_bones_level, done } from './end.js';
import { sanitize_engravings } from './engrave.js';
import { delete_convertedfile } from './files.js';
import { mons, monsterNames, SPECIAL_PM } from './monsters.js';
import { cant_revive } from './zap.js';
import { rest_regions } from './region.js';

const BONES_VFS_PREFIX = 'bones/';
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const STATUE = objectNames.indexOf('STATUE');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const CORPSE = objectNames.indexOf('CORPSE');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const EGG = objectNames.indexOf('EGG');
const TIN = objectNames.indexOf('TIN');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const BELL = objectNames.indexOf('BELL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const PM_DOPPELGANGER = monsterNames.indexOf('PM_DOPPELGANGER');
/** C ref: global.h PL_FSIZ — fruit name buffer (copynchars n = PL_FSIZ-1). */
const PL_FSIZ = 32;

/**
 * C ref: bones.c goodfruit `:42–47` — look up fruit_from_indx(-id); if
 * found, set fid = id (negative → positive). savebones first negates
 * every fid so only types that still exist as SLIME_MOLD objects on
 * the bones level are written (save.c savefruitchn fid>=0).
 * @param {number} id  slime-mold spe (the fruit's original fid)
 */
export function goodfruit(id) {
    const f = fruit_from_indx(-(id | 0));
    if (f) f.fid = id | 0;
}

/**
 * C ref: bones.c savebones `:450–453` — mark every named fruit
 * nonexistent (fid = -fid) before drop_upon_death / resetobjs call
 * goodfruit on SLIME_MOLD instances.
 */
export function savebones_negate_fruit_ids() {
    for (let f = game.ffruit; f; f = f.nextf) {
        f.fid = -(f.fid | 0);
    }
}

/**
 * C ref: bones.c sanitize_name — non-printable → '.'; 8-bit strip deferred
 * (tty eight_bit_input always on for this port). C edits the buffer in
 * place; JS strings are immutable, so callers store the result.
 * @param {string} namebuf
 * @returns {string}
 */
export function sanitize_name(namebuf) {
    let out = '';
    for (let i = 0; i < namebuf.length; i++) {
        const c = namebuf.charCodeAt(i) & 0x7f;
        if (c < 0x20 || c === 0x7f) out += '.';
        else out += String.fromCharCode(c);
    }
    return out;
}

/**
 * C ref: bones.c resetobjs `:50–193` — recurse cobj first, drop
 * in_use objects, then the restore arm (artifact bookkeeping, oname
 * sanitize, shop no_charge for partly eaten food) or the save arm
 * (known-strip, name strip, SLIME_MOLD/SCR_MAIL/EGG/TIN/corpse-statue
 * fixups, mines/soko prize nomerge, invocation-item downgrade+curse).
 * @param {object|null} ochain
 * @param {boolean} restore
 */
function resetobjs(ochain, restore) {
    let nobj;
    for (let otmp = ochain; otmp; otmp = nobj) {
        nobj = otmp.nobj;
        if (otmp.cobj) resetobjs(otmp.cobj, restore);
        if (otmp.in_use) {
            obj_extract_self(otmp);
            dealloc_obj(otmp);
            continue;
        }

        if (restore) {
            /* artifact bookkeeping needs to be done during
               restore; other fixups are done while saving */
            if (otmp.oartifact) {
                if (exist_artifact(otmp.otyp, safe_oname(otmp))
                    || is_quest_artifact(otmp)) {
                    /* prevent duplicate--revert to ordinary obj */
                    otmp.oartifact = 0;
                    if (has_oname(otmp)) free_oname(otmp);
                } else {
                    artifact_exists(otmp, safe_oname(otmp), true,
                        ONAME_BONES);
                }
            } else if (has_oname(otmp)) {
                otmp.oextra.oname = sanitize_name(otmp.oextra.oname);
            }
            /* 3.6.3: set no_charge for partly eaten food in shop;
               all other items become goods for sale if in a shop */
            if ((otmp.oclass | 0) === FOOD_CLASS && otmp.oeaten) {
                let top;
                let loc;
                let p;
                for (top = otmp; (top.where | 0) === OBJ_CONTAINED;
                    top = top.ocontainer) {
                    continue;
                }
                otmp.no_charge = ((top.where | 0) === OBJ_FLOOR
                    && (loc = get_obj_location(top, 0))
                    /* can't use costly_spot() since its
                       result depends upon hero's location */
                    && inside_shop(loc.x, loc.y)
                    && (p = in_rooms(loc.x, loc.y, SHOPBASE)).length > 0
                    && tended_shop(
                        game.level.rooms[p.charCodeAt(0) - ROOMOFFSET]))
                    ? 1 : 0;
            }
        } else { /* saving */
            /* do not zero out o_ids for ghost levels anymore */

            // C `:103–104`
            if (game.objects?.[otmp.otyp]?.oc_uses_known) otmp.known = 0;
            // C `:105–112`
            otmp.dknown = otmp.bknown = 0;
            otmp.rknown = 0;
            otmp.lknown = 0;
            otmp.cknown = 0;
            otmp.tknown = 0;
            otmp.invlet = 0;
            otmp.no_charge = 0;
            otmp.how_lost = LOST_NONE;

            /* strip user-supplied names */
            /* Statue and some corpse names are left intact,
               presumably in case they came from score file. */
            // C `:123–128`
            if (has_oname(otmp)
                && !(otmp.oartifact || (otmp.otyp | 0) === STATUE
                     || (otmp.otyp | 0) === SPE_NOVEL
                     || ((otmp.otyp | 0) === CORPSE
                         && (otmp.corpsenm | 0) >= SPECIAL_PM))) {
                free_oname(otmp);
            }

            // C `:131–132`
            if ((otmp.otyp | 0) === SLIME_MOLD) {
                goodfruit(otmp.spe);
            // C `:134–138` (MAIL_STRUCTURES is defined — global.h:430)
            } else if ((otmp.otyp | 0) === SCR_MAIL) {
                /* 0: delivered in-game via external event;
                   1: from bones or wishing; 2: written with marker */
                if ((otmp.spe | 0) === 0) otmp.spe = 1;
            // C `:140–141`
            } else if ((otmp.otyp | 0) === EGG) {
                otmp.spe = 0; /* not "laid by you" in next game */
            // C `:142–145`
            } else if ((otmp.otyp | 0) === TIN) {
                /* make tins of unique monster's meat be empty */
                if (ismnum(otmp.corpsenm | 0)
                    && unique_corpstat(mons(otmp.corpsenm | 0)))
                    otmp.corpsenm = NON_PM;
            // C `:147–165`
            } else if ((otmp.otyp | 0) === CORPSE
                || (otmp.otyp | 0) === STATUE) {
                // C `int mnum = otmp->corpsenm` — JS cant_revive takes
                // an inout { mtype } box (zap.js:2960)
                const mnumBox = { mtype: otmp.corpsenm | 0 };
                /* Discard incarnation details of unique monsters
                   (by passing null instead of otmp for object),
                   shopkeepers (by passing false for revival flag),
                   temple priests, and vault guards in order to
                   prevent corpse revival or statue reanimation. */
                if (has_omonst(otmp)
                    && cant_revive(mnumBox, false, null)) {
                    free_omonst(otmp);
                    /* mnum is now either human_zombie or doppelganger;
                       for corpses of uniques, we need to force the
                       transformation now rather than wait until a
                       revival attempt, otherwise eating this corpse
                       would behave as if it remains unique */
                    if (mnumBox.mtype === PM_DOPPELGANGER
                        && (otmp.otyp | 0) === CORPSE)
                        set_corpsenm(otmp, mnumBox.mtype);
                }
            // C `:166–169`
            } else if (is_mines_prize(otmp) || is_soko_prize(otmp)) {
                /* achievement tracking; in case prize was moved off its
                   original level (which is always a no-bones level) */
                otmp.nomerge = 0;
            // C `:170–173`
            } else if ((otmp.otyp | 0) === AMULET_OF_YENDOR) {
                /* no longer the real Amulet */
                otmp.otyp = FAKE_AMULET_OF_YENDOR;
                // sync-effect precedent: mkobj mksobj bare curse()
                // (all state changes precede its first await; these
                // arms are unlit, candelabrum via end_burn below)
                curse(otmp);
            // C `:174–183`
            } else if ((otmp.otyp | 0) === CANDELABRUM_OF_INVOCATION) {
                if (otmp.lamplit) end_burn(otmp, true);
                otmp.otyp = WAX_CANDLE;
                otmp.age = 50; /* assume used */
                if ((otmp.spe | 0) > 0) otmp.quan = otmp.spe;
                otmp.spe = 0;
                otmp.owt = weight(otmp);
                curse(otmp);
            // C `:184–186`
            } else if ((otmp.otyp | 0) === BELL_OF_OPENING) {
                otmp.otyp = BELL;
                curse(otmp);
            // C `:187–189`
            } else if ((otmp.otyp | 0) === SPE_BOOK_OF_THE_DEAD) {
                otmp.otyp = SPE_BLANK_PAPER;
                curse(otmp);
            }
        }
    }
}

/**
 * C ref: save.c savefruitchn `:951–971` — bones/whole-game fruit chain.
 * Only fid>=0 (goodfruit restored those). Walk order; load prepends.
 * FREEING dealloc named (JSON persist does not drop live ffruit).
 * @returns {{ fname: string, fid: number }[]}
 */
export function savefruitchn() {
    const out = [];
    for (let f = game.ffruit; f; f = f.nextf) {
        if ((f.fid | 0) >= 0) {
            out.push({ fname: String(f.fname || ''), fid: f.fid | 0 });
        }
    }
    return out;
}

/**
 * C ref: restore.c loadfruitchn `:468–483` — read until fid==0; prepend
 * so the last written fruit is head (reverses savefruitchn order).
 * Bones getlev stores this on go.oldfruit so ghostfruit can remap
 * SLIME_MOLD spe (D-1541).
 * @param {{ fname?: string, fid?: number }[]|null|undefined} arr
 * @returns {object|null}
 */
export function loadfruitchn(arr) {
    let flist = null;
    for (const raw of arr || []) {
        const fid = raw?.fid | 0;
        if (fid === 0) break;
        flist = {
            fname: String(raw?.fname || ''),
            fid,
            nextf: flist,
        };
    }
    return flist;
}

/**
 * C ref: files.c set_bonesfile_name — "bon" + dungeon boneid + "0" + "." + dlevel.
 * Named omissions: bones_pools digit; quest filecode; Is_special boneid letter.
 */
export function set_bonesfile_name(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    let boneid = dun?.boneid;
    if (typeof boneid === 'number') boneid = String.fromCharCode(boneid);
    if (!boneid || boneid === '\0') boneid = 'D';
    const bonesid = `${boneid}0.${dlevel}`;
    return { filename: `bon${bonesid}`, bonesid };
}

function vfsPath(filename) {
    return BONES_VFS_PREFIX + filename;
}

/** C ref: files.c open_bonesfile existence probe (no NHFILE). */
export function bones_file_exists(lev) {
    const { filename } = set_bonesfile_name(lev);
    return vfsReadFile(vfsPath(filename)) != null;
}

/** C ref: files.c delete_bonesfile `:993–1001` — VFS unlink + converted cleanup.
 * C passes `fqname(gb.bones, BONESPREFIX, 0)` to both arms; with unconfigured
 * prefixes that is the bare base (fqname precedent), so the bare filename
 * goes to delete_convertedfile here too. */
export function delete_bonesfile(lev) {
    const { filename } = set_bonesfile_name(lev);
    const reslt = vfsDeleteFile(vfsPath(filename)); // `:998`
    delete_convertedfile(filename); // `:999`
    return reslt; // `:1000` !(reslt < 0)
}

/**
 * C ref: bones.c savebones create_bonesfile + savelev subset.
 * Persists current level after ghost envelope for cross-segment getbones.
 * Fruit chain is savefruitchn (fid>=0 after goodfruit).
 */
export function write_bonesfile(lev) {
    const { filename, bonesid } = set_bonesfile_name(lev);
    // C: open_bonesfile miss required — do not replace existing
    if (vfsReadFile(vfsPath(filename)) != null) return false;

    // C bones.c:620 update_mlstmv before savelev.
    update_mlstmv();

    const lvl = game.level;
    if (lvl?.locations) {
        for (let x = 0; x < lvl.locations.length; x++) {
            // C bones.c savebones — clear seenv/waslit/glyph before save
            for (const cell of lvl.locations[x] || []) {
                if (!cell) continue;
                cell.seenv = 0;
                cell.waslit = false;
                cell.remembered_glyph = undefined;
                cell.disp_ch = ' ';
                cell.disp_color = 8; // NO_COLOR
                cell.disp_decgfx = false;
                cell.disp_attr = 0;
                cell.gnew = 0;
                cell.glyph_symidx = -1;
            }
        }
    }
    // C: svl.lastseentyp[x][y] = 0
    if (game.lastseentyp) game.lastseentyp = null;

    for (const m of game.fmon || []) {
        // C ref: bones.c savebones — pets lose tame/peaceful for next hero
        if (m.mtame) {
            m.mtame = 0;
            m.mpeaceful = 0;
        }
        // C resetobjs(mtmp->minvent, FALSE) — after drop_upon_death
        resetobjs(m.minvent, false);
    }
    // C resetobjs(fobj, FALSE) / resetobjs(buriedobjlist, FALSE)
    resetobjs(game.fobj, false);
    if (Array.isArray(lvl?.buriedobjlist)) {
        for (const o of lvl.buriedobjlist) resetobjs(o, false);
    } else {
        resetobjs(lvl?.buriedobjlist, false);
    }
    // migrating_mons are off-level (mx==0); C savelev does not include them.

    // Shared savelev codec (D-1696). Peek track then FREEING-clear.
    const levelBlob = serLevel(null);
    save_track();
    const payload = {
        version: 1,
        bonesid,
        // C savebones savefruitchn before savelev — fid>=0 only (D-1523)
        fruitchn: savefruitchn(),
        dnum: lev?.dnum | 0,
        dlevel: lev?.dlevel | 0,
        ...levelBlob,
        // Older getbones reads `flags` as level.flags (not linfo).
        flags: levelBlob.level_flags,
    };

    return vfsWriteFile(vfsPath(filename), JSON.stringify(payload));
}

/**
 * C ref: bones.c bones_include_name — cemetery who[] prefix "name-".
 * @param {string} name
 * @returns {boolean}
 */
export function bones_include_name(name) {
    const buf = `${name || ''}-`;
    const len = buf.length;
    for (let bp = game.level?.bonesinfo; bp; bp = bp.next) {
        const who = String(bp.who || '');
        if (who.length >= len && who.slice(0, len) === buf) return true;
    }
    return false;
}

/**
 * C ref: options.c fruitadd else `:8257–8286` (not user_specified —
 * `str != svp.pl_fruit`). ghostfruit passes oldf->fname, a different
 * buffer even when the text equals pl_fruit, so JS cannot use string
 * `===` (D-1520). User doset path stays in options.js (bones → options
 * → invent → mklev cycle). Walker is live objnam fruit_from_name(FALSE).
 * Does not candify, makesingular, or write current_fruit / pl_fruit.
 * 8-bit sanitize strip named (tty eight_bit_input on).
 * @param {string} str  old fruit fname
 * @returns {number} fid in the current game's ffruit chain
 */
function fruitadd_bones(str) {
    let altname = '';
    const raw = String(str || '');
    const n = raw.length > PL_FSIZ - 1 ? raw.slice(0, PL_FSIZ - 1) : raw;
    for (let i = 0; i < n.length; i++) {
        const c = n.charCodeAt(i) & 0x7f;
        altname += (c < 0x20 || c === 0x7f) ? '.' : String.fromCharCode(c);
    }
    if (!game.flags) game.flags = {};
    game.flags.made_fruit = true;
    const look = altname || str;
    const highest = { fid: 0 };
    const found = fruit_from_name(look, false, highest);
    if (found) return found.fid | 0;
    if (highest.fid >= 127) return rnd(127);
    const f = {
        fname: String(look).slice(0, PL_FSIZ - 1),
        fid: (highest.fid | 0) + 1,
        nextf: game.ffruit || null,
    };
    game.ffruit = f;
    return f.fid;
}

/**
 * C ref: restore.c ghostfruit `:500–511` — look up go.oldfruit by
 * otmp->spe; miss → impossible (pline named: restobjchn is sync);
 * hit → otmp->spe = fruitadd(oldf->fname, NULL) else-path.
 * Caller restobjchn `:260–261` after ghostly next_ident, before
 * contents / age shift (age named).
 * @param {object} otmp  SLIME_MOLD whose spe is a bones fid
 */
export function ghostfruit(otmp) {
    let oldf;
    for (oldf = game.oldfruit; oldf; oldf = oldf.nextf) {
        if ((oldf.fid | 0) === (otmp.spe | 0)) break;
    }
    if (!oldf) {
        // C: impossible("no old fruit?"); spe unchanged
        return;
    }
    otmp.spe = fruitadd_bones(oldf.fname);
}

/**
 * C ref: restore.c restobjchn ghostly — next_ident per object, then
 * SLIME_MOLD ghostfruit, parent before cobj.
 */
function remapObjChainIds(head) {
    for (let otmp = head; otmp; otmp = otmp.nobj) {
        otmp.o_id = next_ident();
        if ((otmp.otyp | 0) === SLIME_MOLD) ghostfruit(otmp);
        if (otmp.cobj) remapObjChainIds(otmp.cobj);
    }
}

/**
 * C ref: restore.c ghostly getlev id map (`gi.id_map` / `gn.n_ids_mapped`;
 * `add_id_mapping` at restmonchn `:400–405`, `lookup_id_mapping` at
 * reset_region_mids (region.c:934), `clear_id_mapping` at getlev start
 * `:1068` and end `:1304`): old m_id → remapped m_id for this bones load.
 * Recorded by remapMonChainIds, consumed by region.js reset_region_mids
 * (returns the new id, null when unmapped — the boolean+out-param shape
 * collapsed, same contract), cleared at both ends of getlev_bones like C.
 * (C light.c:543 / timeout.c:2760 ghostly lookups have no JS restore
 * counterpart yet — future rows, named here.)
 */
const bonesIdMap = new Map();
export function record_bones_id(oldId, newId) {
    bonesIdMap.set(oldId | 0, newId | 0);
}
export function lookup_bones_id(oldId) {
    const nid = bonesIdMap.get(oldId | 0);
    return nid === undefined ? null : nid;
}
export function clear_bones_ids() {
    bonesIdMap.clear();
}

/**
 * C ref: restore.c restmonchn ghostly `:399–416` — next_ident per mon,
 * then propagate(mndx, TRUE, ghostly) on the true form (cham, else the
 * saved mnum == monsndx(data)); a species that can no longer be born
 * gets the DEFUNCT_MONSTER cookie getbones purges. Then minvent objs.
 */
function remapMonChainIds(monsList) {
    for (const mtmp of monsList) {
        // C `:400-405`: nid = next_ident(); add_id_mapping(old, nid)
        const nid = next_ident();
        record_bones_id(mtmp.m_id, nid);
        mtmp.m_id = nid;
        const mndx = (mtmp.cham == null || mtmp.cham === NON_PM)
            ? (mtmp.mnum | 0) : (mtmp.cham | 0);
        if (!propagate(mndx, true, true)) {
            /* cookie to trigger purge in getbones() */
            mtmp.mhpmax = DEFUNCT_MONSTER;
        }
        remapObjChainIds(mtmp.minvent);
    }
}

function rebuildObjectsAt(fobj) {
    game._objects_at = new Map();
    // Walk oldest→newest so top-of-pile matches C nexthere head = newest
    const stack = [];
    for (let o = fobj; o; o = o.nobj) stack.push(o);
    for (let i = stack.length - 1; i >= 0; i--) {
        const otmp = stack[i];
        otmp.nexthere = null;
        const key = `${otmp.ox},${otmp.oy}`;
        const cur = game._objects_at.get(key) || null;
        otmp.nexthere = cur;
        game._objects_at.set(key, otmp);
    }
}

/**
 * C ref: restore.c trickery `:1034–1042` (JS has no restore.js; getbones
 * is the only caller here). killer.name carries the reason into done().
 * @param {string} reason
 */
async function trickery(reason) {
    await pline('Strange, this map is not as I remember it.');
    await pline('Somebody is trying some trickery here...');
    await pline('This game is void.');
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.name = reason || '';
    await done(TRICKED);
}

/**
 * C ref: restore.c getlev(nhfp, 0, 0) for a bones file (ghostly) —
 * shared JSON hydration `deserLevel` (relinks RANGE_LEVEL timers/lights
 * against the blob, review 657), then the ghostly arms: loadfruitchn →
 * restmonchn/restobjchn id remap + propagate + ghostfruit, peace/malign
 * reset for the new hero, install, rest_track, freefruitchn.
 * Named omissions: installing the blob's RANGE_LEVEL timers/lights,
 * lastseentyp (C getlev restores it); shk residency peace; hide_monst.
 * Regions ARE restored (rest_regions ghostly arm below, D-2639).
 * @param {object} payload  bones VFS payload (top-level level blob)
 */
function getlev_bones(payload) {
    // C getlev ghostly `:1068` clear_id_mapping at start.
    clear_bones_ids();
    // C getlev ghostly: go.oldfruit = loadfruitchn before restobjchn
    // so ghostfruit can remap SLIME_MOLD spe (D-1541).
    game.oldfruit = loadfruitchn(payload.fruitchn);
    const info = deserLevel(payload);
    const map = info.level;
    for (const col of map.locations || []) {
        for (const cell of col || []) {
            if (!cell) continue;
            // C savebones cleared glyph memory; strip any stale
            // display/memory fields from older JS bones payloads.
            cell.seenv = 0;
            cell.waslit = false;
            cell.remembered_glyph = undefined;
            cell.disp_ch = ' ';
            cell.disp_color = 8;
            cell.disp_decgfx = false;
            cell.disp_attr = 0;
            cell.gnew = 0;
            cell.glyph_symidx = -1;
        }
    }
    const fmon = info.fmon;

    // C restmonchn / restobjchn order: mons(+invent), fobj, buried, bill
    remapMonChainIds(fmon);
    remapObjChainIds(info.fobj);
    remapObjChainIds(map.buriedobjlist);
    remapObjChainIds(info.billobjs);

    // C ref: restore.c getlev ghostly — reset peaceful/malign for new hero
    // (shopkeepers keep saved peace; unicorn coalign special before peace_minded).
    const sgn = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const ual = game.u?.ualign?.type ?? 0;
    for (const mtmp of fmon) {
        if (!mtmp.isshk) {
            const ptr = mtmp.data;
            const uniCoalign = !!(ptr && ptr.mlet === 'S_UNICORN'
                && sgn(ual) === sgn(ptr.maligntyp | 0));
            mtmp.mpeaceful = uniCoalign ? 1 : (peace_minded(ptr) ? 1 : 0);
        }
        set_malign(mtmp);
    }

    game.level = map;
    game.fmon = fmon;
    game.fobj = info.fobj;
    game.billobjs = info.billobjs;
    game.ftrap = map.traps;
    game.head_engr = info.head_engr;
    game.stairs = info.stairs;
    rebuildObjectsAt(info.fobj);
    // C restore.c getlev `:1225` rest_regions ghostly — install the bones
    // level's regions with no ttl decay (ghostly ⇒ tmstamp 0), old-player
    // hero bits cleared, monster ids remapped (D-2639).
    rest_regions(info.regions || [], 0, true);
    // C ref: restore.c getlev → rest_track (bones NHFILE includes utrack)
    rest_track(info.track);
    // C getlev ghostly: freefruitchn(oldfruit) after restobjchn / rest_track.
    game.oldfruit = null;
    // C restore.c `:1304` clear_id_mapping at end of getlev.
    clear_bones_ids();
}

/**
 * C ref: bones.c getbones `:629–756`. Rule #2 analogue of the NHFILE:
 * open_bonesfile → frozen-VFS read; validate() → JSON parse + payload
 * version; Sfi_char bonesid → payload.bonesid; close_nhfile and
 * compress_bonesfile have nothing to do on the VFS. Wizard debugpline
 * ("Abandoning bones", "Removing defunct monster") is debug-file only.
 * @returns {Promise<number>} ok — mklev returns when nonzero
 */
export async function getbones() {
    const flags = game.flags || {};
    const wizard = !!(flags.wizard || flags.debug);
    const ps = game.program_state || (game.program_state = {});
    let ok;

    // C: discover global; JS playmode explore/discover both set flags.explore
    if (flags.explore || flags.discover) return 0;
    if (flags.bones === false) return 0;
    /* only once in three times do we find bones */
    if (rn2(3) && !wizard) return 0;
    if (no_bones_level(game.u?.uz || { dnum: 0, dlevel: 1 })) return 0;

    const lev = game.u?.uz;
    const { filename, bonesid } = set_bonesfile_name(lev);
    const raw = vfsReadFile(vfsPath(filename));
    if (raw == null) return 0;

    // Keep stale terminal map through Get/Unlink yn like C gbuf (display
    // redraw waits until goto_level flush_screen(-1) / docrt).
    // C: vision_recalc(2) newsyms leave-level into gbuf; Get bones? yn
    // flush_screen paints that gbuf before postpone. JS applies the same
    // mon→memory newsym pass on the stashed leave-level, then paints dirty
    // cells (ordinary vision_recalc(2) skips the loop — see vision.js).
    game._stale_map_flush = true;
    if (game._leave_gbuf_level) {
        const savedLevel = game.level;
        const savedFmon = game.fmon;
        let leaveFmon = null;
        for (const info of game.level_info || []) {
            if (info?.level === game._leave_gbuf_level) {
                leaveFmon = info.fmon;
                break;
            }
        }
        game.level = game._leave_gbuf_level;
        game.fmon = leaveFmon;
        // D-0852: goto_level already ran vision_off_newsym_gbuf for RNG;
        // only re-newsym when leave path skipped that burn.
        if (!game._leave_viz_burned) {
            vision_off_newsym_gbuf();
        }
        paint_gbuf_level_to_terminal(game._leave_gbuf_level);
        game.level = savedLevel;
        game.fmon = savedFmon;
    }
    try {
        ps.reading_bonesfile = 1;
        let payload = null;
        try {
            payload = JSON.parse(raw);
        } catch {
            payload = null;
        }
        if (!payload || typeof payload !== 'object' || payload.version !== 1) {
            // C: validate(nhfp, gb.bones, FALSE) != SF_UPTODATE
            if (!wizard) {
                await pline('Discarding unusable bones; no need to panic...');
            }
            ok = 0;
            ps.reading_bonesfile = 0;
        } else {
            ok = 1;
            if (wizard) {
                if ((await yn_function('Get bones?', 'yn', 'n')) === 'n') {
                    ps.reading_bonesfile = 0;
                    return 0;
                }
            }
            // C Sfi_char "bones_count" = strlen + 1; > sizeof oldbonesid
            // (40) → abandon without reading the level.
            const oldbonesid = String(payload.bonesid ?? '');
            if (oldbonesid.length + 1 > 40) {
                /* ToDo: maybe unlink these problematic bones? */
                ps.reading_bonesfile = 0;
                return 0;
            }
            if (bonesid !== oldbonesid) {
                const errbuf = `This is bones level '${oldbonesid}', not '${
                    bonesid}'!`;
                if (wizard) {
                    await pline(errbuf);
                    ok = 0; /* won't die of trickery */
                }
                ps.reading_bonesfile = 0;
                await trickery(errbuf);
            } else {
                getlev_bones(payload);

                /* getlev() tracks birth counts; an extinct or genocided
                   species came back with mhpmax = DEFUNCT_MONSTER */
                for (const mtmp of [...(game.fmon || [])]) {
                    if (has_mgivenname(mtmp)) {
                        if (mtmp.mextra?.mgivenname) {
                            mtmp.mextra.mgivenname = sanitize_name(
                                mtmp.mextra.mgivenname);
                        } else {
                            mtmp.mgivenname = sanitize_name(mtmp.mgivenname);
                        }
                    }
                    if (mtmp.mhpmax === DEFUNCT_MONSTER) {
                        await mongone(mtmp);
                    } else {
                        /* to correctly reset named artifacts on the level */
                        resetobjs(mtmp.minvent, true);
                    }
                }
                resetobjs(game.fobj, true);
                resetobjs(game.level.buriedobjlist, true);
                await fix_shop_damage();
            }
        }
        ps.reading_bonesfile = 0;
        sanitize_engravings();
        if (!game.u) game.u = {};
        if (!game.u.uroleplay) game.u.uroleplay = {};
        game.u.uroleplay.numbones = (game.u.uroleplay.numbones | 0) + 1;

        if (wizard) {
            if ((await yn_function('Unlink bones?', 'yn', 'n')) === 'n') {
                return ok;
            }
        }
        if (!delete_bonesfile(lev)) {
            /* N games restoring the same bones: the N-1 losers just
               generate a new level */
            return 0;
        }
        return ok;
    } finally {
        game._stale_map_flush = false;
        game._leave_gbuf_level = null;
        game._leave_viz_snapshot = null;
        game._leave_viz_burned = false;
    }
}
