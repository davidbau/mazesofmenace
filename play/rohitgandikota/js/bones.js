// bones.js — bones files.
// C ref: src/bones.c
//
// Levels persist in storage between games. Native file encoding and
// compression are represented by JSON; gameplay state follows bones.c.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth, ledger_no, maxledgerno, Is_special, Invocation_lev } from './dungeon.js';
import { isok } from './hacklib.js';
import { m_at, can_carry, m_carrying, mongone, dmonsfree } from './mon.js';
import { obj_extract_self, weight, obfree } from './invent.js';
import { curse, place_object, add_to_minv, add_to_container,
         mk_named_object, set_corpsenm, obj_attach_mid } from './mkobj.js';
import { MAGIC_PORTAL, LEAVESTATUE, OBJ_INVENT, OBJ_MINVENT, OBJ_FLOOR,
         OBJ_CONTAINED, NON_PM, LOST_NONE, ONAME_BONES, SHOPBASE,
         ROOMOFFSET, has_omonst, free_omonst, HOLE, Is_botlevel,
         has_omid, OMID, free_omid, OMONST, EBONES, DELPHI,
         Is_oracle_level, DISMOUNT_BONES, RANGE_LEVEL, DEFUNCT_MONSTER,
         has_mgivenname, MGIVENNAME, BR_STAIR, BR_NO_END1, BR_NO_END2,
         BR_PORTAL } from './const.js';
import { PMNAMES, MMFLAGS, MONSYMS, MSOUND } from './monst_data.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { is_undead, unique_corpstat, give_u_to_m_resistances } from './mondata.js';
import { obj_no_longer_held } from './do.js';
import { artifact_light, exist_artifact, artifact_exists } from './artifact.js';
import { obj_is_burning, save_light_sources, restore_light_sources,
         relink_light_sources } from './light.js';
import { end_burn, save_timers, restore_timers, relink_timers } from './timeout.js';
import { GameMap } from './game.js';
import { deltrap } from './trap.js';
import { free_oname, christen_monst } from './do_name.js';
import { is_quest_artifact } from './questpgr.js';
import { is_mines_prize, is_soko_prize, age_is_relative } from './obj.js';
import { cant_revive, unpunish } from './read.js';
import { get_obj_location } from './zap.js';
import { inside_shop, tended_shop, restshk, set_residency } from './shk.js';
import { restpriest } from './priest.js';
import { save_rooms, rest_rooms } from './mkroom.js';
import { in_rooms } from './hack.js';
import { enexto, rloc_to } from './teleport.js';
import { clear_bypasses, m_dowear } from './worn.js';
import { unleash_all } from './apply.js';
import { dismount_steed } from './steed.js';
import { roles, races } from './role_data.js';
import { makemon, mongets, propagate } from './makemon.js';
import { newsym } from './display.js';
import { save_regions, rest_regions } from './region.js';
import { save_engravings, rest_engravings,
         forget_engravings, sanitize_engravings } from './engrave.js';
import { NO_COLOR } from './terminal.js';
import { savefruitchn } from './save.js';
import { loadfruitchn, ghostfruit } from './restore.js';
import { xname, the } from './objnam.js';
import { You } from './pline.js';

// src/bones.c goodfruit(), mark a fruit type as present in these remains.
function goodfruit(id) {
    for (let f = game.ffruit; f; f = f.nextf)
        if (f.fid === -id) {
            f.fid = id;
            break;
        }
}

// src/bones.c sanitize_name(), tty uses byte characters in saved names.
export function sanitize_name(name) {
    return [...name].map(ch => {
        const byte = ch.charCodeAt(0), c = byte & 0x7f;
        if (c < 32 || c === 127)
            return '.';
        return c !== byte && !game.iflags?.wc_eight_bit_input ? '_' : ch;
    }).join('');
}

// src/bones.c resetobjs(), recurse into contents before fixing the parent.
export async function resetobjs(chain, restore) {
    for (const obj of [...(chain || [])]) {
        if (obj.cobj?.length)
            await resetobjs(obj.cobj, restore);
        if (obj.in_use) {
            obj_extract_self(obj);
            obfree(obj);
            continue;
        }
        if (restore) {
            if (obj.oartifact) {
                if (exist_artifact(obj.otyp, obj.oname) || is_quest_artifact(obj)) {
                    obj.oartifact = 0;
                    free_oname(obj);
                } else {
                    artifact_exists(obj, obj.oname, true, ONAME_BONES);
                }
            } else if (obj.oname != null) {
                obj.oname = sanitize_name(obj.oname);
            }
            if (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten) {
                let top = obj;
                while (top.where === OBJ_CONTAINED)
                    top = top.ocontainer;
                const cc = {x: 0, y: 0};
                let room = '';
                obj.no_charge = !!(top.where === OBJ_FLOOR
                    && get_obj_location(top, cc, 0) && inside_shop(cc.x, cc.y)
                    && (room = in_rooms(cc.x, cc.y, SHOPBASE))
                    && tended_shop(game.level.rooms[room.charCodeAt(0) - ROOMOFFSET]
                        || game.level.subrooms?.find(r =>
                            r.roomnoidx === room.charCodeAt(0) - ROOMOFFSET)));
            }
            continue;
        }

        if (game.objects[obj.otyp].oc_uses_known)
            obj.known = 0;
        obj.dknown = obj.bknown = obj.rknown = obj.lknown = 0;
        obj.cknown = obj.tknown = 0;
        obj.invlet = '';
        obj.no_charge = 0;
        obj.how_lost = LOST_NONE;
        if (obj.oname != null && !(obj.oartifact || obj.otyp === ONAMES.STATUE
            || obj.otyp === ONAMES.SPE_NOVEL
            || (obj.otyp === ONAMES.CORPSE && obj.corpsenm >= PMNAMES.SPECIAL_PM)))
            free_oname(obj);

        if (obj.otyp === ONAMES.SLIME_MOLD) {
            goodfruit(obj.spe);
        } else if (obj.otyp === ONAMES.SCR_MAIL) {
            if (obj.spe === 0)
                obj.spe = 1;
        } else if (obj.otyp === ONAMES.EGG) {
            obj.spe = 0;
        } else if (obj.otyp === ONAMES.TIN) {
            if (obj.corpsenm >= 0 && obj.corpsenm < game.mons.length
                && unique_corpstat(game.mons[obj.corpsenm]))
                obj.corpsenm = NON_PM;
        } else if (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.STATUE) {
            const mnum = {v: obj.corpsenm};
            if (has_omonst(obj) && cant_revive(mnum, false, null)) {
                free_omonst(obj);
                if (mnum.v === PMNAMES.PM_DOPPELGANGER && obj.otyp === ONAMES.CORPSE)
                    set_corpsenm(obj, mnum.v);
            }
        } else if (is_mines_prize(obj) || is_soko_prize(obj)) {
            obj.nomerge = 0;
        } else if (obj.otyp === ONAMES.AMULET_OF_YENDOR) {
            obj.otyp = ONAMES.FAKE_AMULET_OF_YENDOR;
            await curse(obj);
        } else if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
            if (obj.lamplit)
                await end_burn(obj, true);
            obj.otyp = ONAMES.WAX_CANDLE;
            obj.age = 50;
            if (obj.spe > 0)
                obj.quan = obj.spe;
            obj.spe = 0;
            obj.owt = weight(obj);
            await curse(obj);
        } else if (obj.otyp === ONAMES.BELL_OF_OPENING) {
            obj.otyp = ONAMES.BELL;
            await curse(obj);
        } else if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            obj.otyp = ONAMES.SPE_BLANK_PAPER;
            await curse(obj);
        }
    }
}

// src/bones.c:356 can_make_bones()
export function can_make_bones() {
    if (!(game.flags?.bones ?? true))
        return false;
    if (ledger_no(game.u.uz) <= 0 || ledger_no(game.u.uz) > maxledgerno())
        return false;
    if (no_bones_level(game.u.uz))
        return false;
    if (game.u.uswallow)
        return false;
    if (!Is_branchlev_bones(game.u.uz)) {
        /* no bones on non-branches with portals */
        for (const t of game.level?.traps || [])
            if (t.ttyp === MAGIC_PORTAL)
                return false;
    }
    if (depth(game.u.uz) <= 0
        || (!rn2(1 + (depth(game.u.uz) >> 2)) /* fewer ghosts on low levels */
            && !game.wizard))
        return false;
    if (game.discover)
        return false;
    return true;
}

/* src/dungeon.c Is_branchlev() — a branch has an end on this level. */
function Is_branchlev_bones(lev) {
    for (const br of (game.branches || [])) {
        if ((br.end1.dnum === lev.dnum && br.end1.dlevel === lev.dlevel)
            || (br.end2.dnum === lev.dnum && br.end2.dlevel === lev.dlevel))
            return br;
    }
    return null;
}

// src/bones.c no_bones_level(), shared by the save and load gates.
export function no_bones_level(lev) {
    if (game.save_dlevel && ledger_no(game.save_dlevel))
        Object.assign(lev, game.save_dlevel);
    const special = Is_special(lev);
    return !!((special && !special.boneid)
        || !game.dungeons[lev.dnum].boneid || Is_botlevel(lev)
        || (Is_branchlev_bones(lev) && lev.dlevel > 1) || Invocation_lev(lev));
}

// src/bones.c:226 give_to_nearby_mon() — hand a dropped item to a random
// adjacent item-liking monster, if any can carry it.
async function give_to_nearby_mon(otmp, x, y) {
    let selected = null, nmon = 0;
    for (let xx = x - 1; xx <= x + 1; ++xx) {
        for (let yy = y - 1; yy <= y + 1; ++yy) {
            if (!isok(xx, yy)) continue;
            if (xx === game.u.ux && yy === game.u.uy) continue;
            const mtmp = m_at(xx, yy);
            if (!mtmp) continue;
            const md = game.mons[mtmp.mnum];
            if (!likes_stuff(md)) continue;
            nmon++;
            if (!rn2(nmon))
                selected = mtmp;
        }
    }
    if (selected && can_carry(selected, otmp)) {
        add_to_minv(selected, otmp);
    } else {
        await obj_no_longer_held(otmp);
        place_object(otmp, x, y);
    }
}

/* include/mondata.h likes_gold/gems/objs/magic — monflag.h M2_ bits */
function likes_stuff(md) {
    const M2_GREEDY = 0x10000000, M2_JEWELS = 0x20000000,
          M2_COLLECT = 0x40000000, M2_MAGIC = 0x80000000;
    return !!((md.mflags2 ?? md.flags2 ?? 0) & (M2_GREEDY | M2_JEWELS | M2_COLLECT | M2_MAGIC));
}

// src/bones.c:264 drop_upon_death() — all inventory is dropped, usually
// cursed; each item draws rn2(5) for the curse and, with no receiving
// monster or container, rn2(8) for the nearby-scavenger chance.
export async function drop_upon_death(mtmp, cont, x, y) {
    let otmp;
    game.u.twoweap = false;
    while ((otmp = (game.invent || [])[0]) != null) {
        obj_extract_self(otmp);
        if (!mtmp || is_undead(mtmp.data))
            await obj_no_longer_held(otmp);
        if ((cont || artifact_light(otmp)) && obj_is_burning(otmp))
            await end_burn(otmp, true);
        otmp.owornmask = 0;

        if (otmp.otyp === ONAMES.SLIME_MOLD)
            goodfruit(otmp.spe);

        if (rn2(5))
            await curse(otmp);
        if (mtmp) {
            add_to_minv(mtmp, otmp);
        } else if (cont) {
            // C add_to_container repeats the held-state transition for a
            // floor container. The shared JS helper is synchronous.
            if (cont.where !== OBJ_INVENT && cont.where !== OBJ_MINVENT)
                await obj_no_longer_held(otmp);
            add_to_container(cont, otmp);
        } else if (!rn2(8)) {
            await give_to_nearby_mon(otmp, x, y);
        } else {
            await obj_no_longer_held(otmp);
            place_object(otmp, x, y);
        }
    }
    if (cont)
        cont.owt = weight(cont);
}

// src/bones.c fixuporacle(), restore her chamber and put her back inside.
export async function fixuporacle(oracle) {
    if (!Is_oracle_level(game.u.uz))
        return false;
    oracle.mpeaceful = 1;
    const rooms = [...game.level.rooms, ...(game.level.subrooms || [])];
    let roomno = game.level.at(oracle.mx, oracle.my).roomno - ROOMOFFSET;
    const atroom = rooms.find((r, i) => (r.roomnoidx ?? i) === roomno);
    if (roomno >= 0 && atroom?.rtype === DELPHI)
        return true;
    const original = rooms.find(r => r.orig_rtype === DELPHI);
    const index = original ? (original.roomnoidx ?? rooms.indexOf(original)) : -1;
    if (original && roomno !== index) {
        const cc = {x: Math.trunc((original.lx + original.hx) / 2),
                    y: Math.trunc((original.ly + original.hy) / 2)};
        if (enexto(cc, cc.x, cc.y, oracle.data)) {
            await rloc_to(oracle, cc.x, cc.y);
            roomno = game.level.at(oracle.mx, oracle.my).roomno - ROOMOFFSET;
        }
    }
    if (original && roomno === index)
        original.rtype = DELPHI;
    return true;
}

// src/bones.c remove_mon_from_bones(), these uniques stay in their own games.
export async function remove_mon_from_bones(mon) {
    const data = mon.data;
    if (mon.iswiz || data === game.mons[PMNAMES.PM_MEDUSA]
        || data.msound === MSOUND.MS_NEMESIS || data.msound === MSOUND.MS_LEADER
        || mon.mnum === PMNAMES.PM_VLAD_THE_IMPALER
        || mon.cham === PMNAMES.PM_VLAD_THE_IMPALER
        || (data === game.mons[PMNAMES.PM_ORACLE] && !await fixuporacle(mon)))
        await mongone(mon);
}

// src/bones.c newebones()/free_ebones(), retain the deceased hero's identity.
export function newebones(mon) {
    (mon.mextra ||= {}).ebones ||= {parentmid: mon.m_id, role: 0, race: 0,
        oldalign: {type: 0, record: 0}, deathlevel: 0, luck: 0,
        mnum: 0, female: 0, demigod: 0, crowned: 0};
}

export function free_ebones(mon) {
    if (mon.mextra)
        delete mon.mextra.ebones;
}

// src/bones.c savebones(), prepare the remains and save the level.
export async function savebones(how, corpse, when) {
    const u = game.u;
    clear_bypasses();

    /* src/bones.c:418 open_bonesfile(). A second death on this level asks
       a wizard whether to replace the existing bones file. */
    if (game.storage?.getItem(bones_key()) != null) {
        if (!game.wizard)
            return;
        const { tty_yn_function } = await import('./tty/topl.js');
        const ans = await tty_yn_function(
            'Bones file already exists.  Replace it?', 'yn', 'n');
        if (ans !== 'y')
            return;
        try {
            game.storage.removeItem(bones_key());
        } catch (e) {
            const { pline } = await import('./display.js');
            await pline('Cannot unlink old bones.');
            return;
        }
    }

    unleash_all();
    if (u.uchain)
        unpunish();
    if (u.usteed)
        await dismount_steed(DISMOUNT_BONES);
    for (const mon of [...game.level.monsters])
        await remove_mon_from_bones(mon);
    dmonsfree();
    forget_engravings();
    for (let fruit = game.ffruit; fruit; fruit = fruit.nextf)
        fruit.fid = -fruit.fid;
    set_ghostly_objlist(game.invent);

    let mtmp = null;
    if (u.ugrave_arise >= 0 && u.ugrave_arise < game.mons.length) {
        game.in_mklev = true;
        mtmp = await makemon(game.mons[u.ugrave_arise], u.ux, u.uy,
                            MMFLAGS.NO_MINVENT);
        game.in_mklev = false;
        if (!mtmp) {
            await drop_upon_death(null, null, u.ux, u.uy);
            u.ugrave_arise = NON_PM;
            return;
        }
        give_u_to_m_resistances(mtmp);
        christen_monst(mtmp, game.plname);
        newsym(u.ux, u.uy);
        await drop_upon_death(mtmp, null, u.ux, u.uy);
        if (mtmp.data.mlet === MONSYMS.S_MUMMY
            && !m_carrying(mtmp, ONAMES.MUMMY_WRAPPING))
            mongets(mtmp, ONAMES.MUMMY_WRAPPING);
        await m_dowear(mtmp, true);
    } else if (u.ugrave_arise === LEAVESTATUE) {
        const statue = mk_named_object(ONAMES.STATUE, u.umonnum,
                                      u.ux, u.uy, game.plname);
        await drop_upon_death(null, statue, u.ux, u.uy);
        if (!statue)
            return;
    } else {
        /* drop everything, then leave a ghost */
        await drop_upon_death(null, null, u.ux, u.uy);
        game.in_mklev = true; /* allow creation on the hero's square */
        mtmp = await makemon(game.mons[PMNAMES.PM_GHOST], u.ux, u.uy,
                                   MMFLAGS.MM_NONAME);
        game.in_mklev = false;
        if (!mtmp)
            return;
        christen_monst(mtmp, game.plname);
        if (corpse)
            obj_attach_mid(corpse, mtmp.m_id);
    }
    if (mtmp) {
        mtmp.m_lev = u.ulevel ? u.ulevel : 1;
        mtmp.mhp = mtmp.mhpmax = u.uhpmax;
        mtmp.female = game.flags?.female ? 1 : 0;
        mtmp.msleeping = 1;
        newebones(mtmp);
        Object.assign(EBONES(mtmp), {
            role: roles.findIndex(r => r.name.m === game.urole.name.m),
            race: races.findIndex(r => r.noun === game.urace.noun),
            oldalign: {...u.ualign}, deathlevel: u.ulevel, luck: u.uluck,
            mnum: game.urole.mnum, female: +!!game.flags.female,
            demigod: (u.uevent?.udemigod || 0) & 1,
            crowned: (u.uevent?.uhand_of_elbereth || 0) & 1,
        });
    }

    for (const mon of game.level.monsters || []) {
        set_ghostly_objlist(mon.minvent);
        await resetobjs(mon.minvent, false);
    }
    for (const trap of game.level.traps || []) {
        trap.madeby_u = 0;
        trap.tseen = trap.ttyp === HOLE;
    }
    set_ghostly_objlist(game.level.objects);
    await resetobjs(game.level.objects, false);
    set_ghostly_objlist(game.level.buriedobjs);
    await resetobjs(game.level.buriedobjs, false);
    u.ux0 = u.ux;
    u.uy0 = u.uy;
    u.ux = u.uy = 0;
    await write_bonesfile(how, when);
}

/* the storage key for the current level's bones */
function bones_key() {
    return `bones:${game.u.uz.dnum}.${game.u.uz.dlevel}`;
}

/* JSON-safe deep copy of an object list, stripping the parent backrefs
   (ocarry/ocontainer) that make the live structures circular. */
function strip_objs(list) {
    return (list || []).map(o => {
        const copy = { ...o };
        delete copy.ocarry;
        delete copy.ocontainer;
        if (copy.cobj)
            copy.cobj = strip_objs(copy.cobj);
        return copy;
    });
}

function strip_mons(list) {
    return (list || []).map(m => {
        const copy = { ...m };
        delete copy.data;
        /* MON_WEP points back into minvent and would make the snapshot
           circular.  Save its chain position and restore the pointer after
           parsing. */
        copy.mw_index = m.mw ? (m.minvent || []).indexOf(m.mw) : -1;
        delete copy.mw;
        copy.minvent = strip_objs(m.minvent);
        /* src/bones.c:544 — per-monster bones sanitization: pets go feral,
           movement bookkeeping resets, hero observations are wiped. Trap
           tseen and madeby_u resets are handled with the trap snapshot. */
        copy.mlstmv = 0;
        if (copy.mtame)
            copy.mtame = copy.mpeaceful = 0;
        copy.seen_resistance = 0;
        return copy;
    });
}

function strip_stairs() {
    const stairs = [];
    for (let st = game.stairs; st; st = st.next) {
        stairs.push({
            sx: st.sx,
            sy: st.sy,
            up: !!st.up,
            isladder: !!st.isladder,
            u_traversed: !!st.u_traversed,
            tolev: { ...st.tolev },
        });
    }
    return stairs;
}

function restore_stairs(stairs) {
    let chain = null;
    for (let i = (stairs || []).length - 1; i >= 0; --i) {
        const st = stairs[i];
        chain = { ...st, tolev: { ...st.tolev }, next: chain };
    }
    return chain;
}

// the write half of src/bones.c:403 savebones()
async function write_bonesfile(how, when) {
    if (!game.storage)
        return;
    const lvl = game.level;
    /* src/bones.c:563: a future hero inherits the level, not the dead
       hero's explored map or remembered glyphs. */
    for (let x = 1; x < 80; x++) {
        for (let y = 0; y < 21; y++) {
            const loc = lvl.at(x, y);
            if (!loc)
                continue;
            loc.seenv = 0;
            loc.waslit = 0;
            loc.lastseentyp = 0;
            delete loc.remembered_glyph;
            delete loc.disp_glyph;
            loc.disp_ch = ' ';
            loc.disp_color = NO_COLOR;
            loc.disp_decgfx = false;
            loc.disp_attr = 0;
            loc.gnew = 0;
        }
    }
    const cells = [];
    for (let x = 0; x < 80; x++) {
        const col = [];
        for (let y = 0; y < 21; y++) {
            const loc = lvl.at(x, y);
            col.push(loc ? { ...loc } : null);
        }
        cells.push(col);
    }
    // src/bones.c savebones(), preserve every prior cemetery entry. The
    // coordinates determine when a later hero learns about these bones.
    const { genders, aligns } = await import('./role_data.js');
    const { formatkiller } = await import('./end.js');
    const { yyyymmddhhmmss } = await import('./calendar.js');
    lvl.bonesinfo = {
        who: [game.plname, game.urole.filecode.slice(0, 3),
            game.urace.filecode.slice(0, 3), genders[+!!game.flags.female].filecode.slice(0, 3),
            aligns[1 - game.u.ualign.type].filecode.slice(0, 3)].join('-'),
        how: formatkiller(how, true),
        when: yyyymmddhhmmss(when),
        frpx: game.u.ux0,
        frpy: game.u.uy0,
        bonesknown: false,
        next: lvl.bonesinfo || null,
    };
    if (game.wizard)
        lvl.flags.wizard_bones = 1;
    const snap = {
        moves: game.moves,
        fruits: savefruitchn(),
        timers: save_timers(RANGE_LEVEL),
        lights: save_light_sources(RANGE_LEVEL),
        regions: save_regions(),
        cells,
        flags: { ...(lvl.flags || {}) },
        rooms: save_rooms(),
        doors: (lvl.doors || []).map(d => ({ ...d })),
        traps: (lvl.traps || []).map(t => ({ ...t })),
        stairs: strip_stairs(),
        updest: {...game.updest},
        dndest: {...game.dndest},
        upstair: lvl.upstair ? { ...lvl.upstair } : null,
        dnstair: lvl.dnstair ? { ...lvl.dnstair } : null,
        engravings: save_engravings(),
        objects: strip_objs((lvl.objects || [])
            .filter(o => o.where === 1 /* OBJ_FLOOR */ || o.where === 0)),
        buried: strip_objs(lvl.buriedobjs || []),
        monsters: strip_mons((lvl.monsters || []).filter(m => m.mhp > 0)),
        /* savelev() writes the hero trail as part of the level. A tracking
           monster on a later bones load follows that old trail before it can
           see the new hero. */
        track: {
            utcnt: game.utcnt | 0,
            utpnt: game.utpnt | 0,
            utrack: (game.utrack || []).map(p => ({ x: p.x, y: p.y })),
        },
        bonesinfo: lvl.bonesinfo,
    };
    try {
        game.storage.setItem(bones_key(), JSON.stringify(snap));
    } catch (e) {
        /* storage full or absent: bones simply don't get made */
    }
}

/* restore backrefs after JSON parse */
function rewire_objs(list, owner, container) {
    for (const o of (list || [])) {
        if (owner) o.ocarry = owner;
        if (container) o.ocontainer = container;
        if (o.cobj)
            rewire_objs(o.cobj, null, o);
    }
    return list || [];
}

// src/bones.c:626 getbones() — the load half. Returns true when a bones
// level was installed in place of makelevel(). The caller drew rn2(3)
// already (mklev's gate keeps C's draw position); the wizard 'Get bones?'
// prompt consumes its key here. Each loaded object gets a fresh o_id via
// next_ident(), whose rnd(2) draws are the visible cost of the load.
export async function getbones_load() {
    if (!game.storage)
        return false;
    const raw = game.storage.getItem(bones_key());
    if (!raw)
        return false;

    // C's static level array also exists before first-level generation.
    // A fresh JS game can encounter bones before makelevel allocates it.
    game.level ||= new GameMap();
    game.program_state.reading_bonesfile = 1;

    if (game.wizard) {
        // tty_yn_function flushes only once the hero is on the map.
        const { tty_yn_function } = await import('./tty/topl.js');
        const ans = await tty_yn_function('Get bones?', 'yn', 'n');
        if (ans !== 'y') {
            game.program_state.reading_bonesfile = 0;
            return false;
        }
    }

    let snap;
    try {
        snap = JSON.parse(raw);
    } catch (e) {
        game.program_state.reading_bonesfile = 0;
        return false;
    }

    game.oldfruit = loadfruitchn(snap.fruits);
    const lvl = game.level;
    for (let x = 0; x < 80; x++)
        for (let y = 0; y < 21; y++) {
            if (snap.cells[x][y])
                lvl.locations[x][y] = { ...snap.cells[x][y] };
        }
    lvl.flags = snap.flags || {};
    rest_rooms(snap.rooms);
    const lastroom = lvl.rooms[lvl.nroom - 1];
    game.doorindex = lastroom ? lastroom.fdoor + lastroom.doorct : 0;
    lvl.doors = snap.doors || [];
    lvl.traps = snap.traps || [];
    game.stairs = restore_stairs(snap.stairs);
    game.updest = {...snap.updest};
    game.dndest = {...snap.dndest};
    lvl.upstair = snap.upstair ? { ...snap.upstair } : null;
    lvl.dnstair = snap.dnstair ? { ...snap.dnstair } : null;
    rest_engravings(snap.engravings);
    restore_timers(snap.timers, RANGE_LEVEL, true, game.moves - snap.moves);
    restore_light_sources(snap.lights);
    lvl.objects = rewire_objs(snap.objects, null, null);
    lvl.buriedobjs = rewire_objs(snap.buried || [], null, null);
    lvl.monsters = snap.monsters || [];
    for (const m of lvl.monsters) {
        m.data = game.mons[m.mnum];
        rewire_objs(m.minvent, m, null);
        m.mw = m.mw_index >= 0 ? (m.minvent?.[m.mw_index] || null) : null;
        delete m.mw_index;
    }
    if (snap.track) {
        game.utcnt = snap.track.utcnt | 0;
        game.utpnt = snap.track.utpnt | 0;
        game.utrack = (snap.track.utrack || [])
            .map(p => ({ x: p.x, y: p.y }));
    }
    lvl.monAt = new Map();
    for (const m of lvl.monsters)
        lvl.monAt.set(`${m.mx},${m.my}`, m);

    // src/restore.c getlev/restmonchn/restobjchn: monster then its inventory,
    // followed by floor objects and buried objects. Preserve the old-to-new
    // mapping for corpses attached to their ghosts.
    const { next_ident } = await import('./mkobj.js');
    const idmap = new Map();
    const renumber = async (list, frozen = false) => {
        for (const o of (list || [])) {
            const oldid = o.o_id;
            o.o_id = next_ident();
            idmap.set(oldid, o.o_id);
            if (o.otyp === ONAMES.SLIME_MOLD)
                await ghostfruit(o);
            if (!frozen && !age_is_relative(o))
                o.age += game.moves - (snap.moves ?? game.moves);
            if (o.cobj)
                await renumber(o.cobj, o.otyp === ONAMES.ICE_BOX);
            o.bypass = 0;
        }
    };
    for (const m of lvl.monsters) {
        const oldid = m.m_id;
        m.m_id = next_ident();
        idmap.set(oldid, m.m_id);
        if (!propagate(m.cham === NON_PM ? m.mnum : m.cham, true, true))
            m.mhpmax = DEFUNCT_MONSTER;
        await renumber(m.minvent);
        if (m.isshk)
            restshk(m, true);
        if (m.ispriest)
            restpriest(m, true);
    }
    await renumber(lvl.objects);
    // find_lev_obj() rebuilds piles in reverse list order. place_object's
    // held-state transition is relevant even to objects inside a statue.
    for (const obj of [...lvl.objects].reverse())
        await obj_no_longer_held(obj);
    await renumber(lvl.buriedobjs);

    /* restore.c:1202 ghostly monsters meet a different hero, so their
       peacefulness and alignment must be recomputed before they move. */
    const { is_unicorn } = await import('./mondata.js');
    const { peace_minded, set_malign } = await import('./makemon.js');
    const { restore_cham, hide_monst } = await import('./mon.js');
    const { sgn } = await import('./hacklib.js');
    for (const m of lvl.monsters) {
        if (m.isshk)
            set_residency(m, false);
        if (!m.isshk) {
            m.mpeaceful = is_unicorn(m.data)
                && sgn(game.u.ualign.type) === sgn(m.data.maligntyp)
                ? true : peace_minded(m.data);
        }
        set_malign(m);
        restore_cham(m);
        hide_monst(m);
    }

    rest_regions(snap.regions, true, idmap);

    // src/restore.c getlev(), ghostly branch destinations belong to the
    // new game's dungeon layout. getbones passes lev=0, so getlev's
    // separate Medusa-to-Castle missing-stair repair does not run here.
    game.oldfruit = null;
    const branch = Is_branchlev_bones(game.u.uz);
    if (branch && game.u.uz.dlevel === 1) {
        const dest = branch.end1.dnum === game.u.uz.dnum
            && branch.end1.dlevel === game.u.uz.dlevel ? branch.end2 : branch.end1;
        switch (branch.type) {
        case BR_STAIR:
        case BR_NO_END1:
        case BR_NO_END2:
            for (let stair = game.stairs; stair; stair = stair.next) {
                if (stair.tolev.dnum !== game.u.uz.dnum) {
                    Object.assign(stair.tolev, dest);
                    break;
                }
            }
            break;
        case BR_PORTAL: {
            const portal = lvl.traps.find(trap => trap.ttyp === MAGIC_PORTAL);
            if (!portal)
                throw new Error('getlev: need portal but none found');
            Object.assign(portal.dst, dest);
            break;
        }
        }
    } else if (!branch) {
        for (const trap of [...lvl.traps])
            if (trap.ttyp === MAGIC_PORTAL)
                deltrap(trap);
    }

    relink_timers(true, idmap);
    relink_light_sources(true, idmap);

    for (const m of [...lvl.monsters]) {
        if (has_mgivenname(m))
            christen_monst(m, sanitize_name(MGIVENNAME(m)));
        if (m.mhpmax === DEFUNCT_MONSTER)
            await mongone(m);
        else
            await resetobjs(m.minvent, true);
    }
    await resetobjs(lvl.objects, true);
    await resetobjs(lvl.buriedobjs, true);
    for (const obj of lvl.objects) {
        if (has_omonst(obj)) {
            const mon = OMONST(obj);
            mon.m_id = 0;
            mon.mpeaceful = mon.mtame = 0;
        }
        if (has_omid(obj)) {
            const newid = idmap.get(OMID(obj));
            if (newid)
                obj.oextra.omid = newid;
            else
                free_omid(obj);
        }
    }

    /* the cemetery record: goto_level's familiar_level_msg reads it */
    lvl.bonesinfo = snap.bonesinfo || null;
    game.program_state.reading_bonesfile = 0;
    sanitize_engravings();
    game.u.uroleplay.numbones = (game.u.uroleplay.numbones || 0) + 1;

    /* src/bones.c:744: debug mode lets the wizard keep a loaded bones file
       so another game can encounter the same level. */
    if (game.wizard) {
        const { tty_yn_function } = await import('./tty/topl.js');
        const ans = await tty_yn_function('Unlink bones?', 'yn', 'n');
        if (ans !== 'y')
            return true;
    }
    try {
        game.storage.removeItem(bones_key());
    } catch (e) {
        return false;
    }
    return true;
}

// src/bones.c:762 bones_include_name() — did this hero (by name) die in
// any of the bones lives on this level?
export function bones_include_name(name) {
    for (let bp = game.level?.bonesinfo; bp; bp = bp.next)
        if (bp.who.startsWith(name + '-'))
            return true;
    return false;
}

// src/bones.c:784 set_ghostly_objlist(), the outer chain only.
export function set_ghostly_objlist(objchain) {
    for (const obj of objchain || [])
        obj.ghostly = 1;
}

// src/bones.c:796 fix_ghostly_obj()
export async function fix_ghostly_obj(obj) {
    if (!obj.ghostly)
        return;
    switch (obj.otyp) {
    case ONAMES.BOW:
    case ONAMES.ELVEN_BOW:
    case ONAMES.ORCISH_BOW:
    case ONAMES.YUMI:
    case ONAMES.BOOMERANG:
        await You(`make adjustments to ${the(xname(obj))} to suit your ${
            game.u.uhandedness === 0 /* RIGHT_HANDED */ ? 'right' : 'left'} hand.`);
        break;
    }
    obj.ghostly = 0;
}
