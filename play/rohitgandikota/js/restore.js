// restore.js, level and full-game recovery from src/restore.c.
import { game } from './gstate.js';
import { fruitadd } from './options.js';
import { impossible } from './pline.js';
import { place_object } from './mkobj.js';
import { OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, W_BALL, W_CHAIN, W_WEP,
    REST_GSTATE, REST_LEVELS, REST_CURRENT_LEVEL, RANGE_LEVEL, RANGE_GLOBAL,
    Is_rogue_level, gm_levelchange, Upolyd, has_omonst, OMONST } from './const.js';
import { gamestate_encode, gamestate_decode, SAVE_SKIP_KEYS, savelev,
    savefruitchn, delete_savefile } from './save.js';
import { restore_timers, relink_timers, run_timers, TIMER_OBJECT,
    TIMER_MONSTER, TIMER_LEVEL } from './timeout.js';
import { restore_light_sources, relink_light_sources, LS_OBJECT } from './light.js';
import { rest_worm, place_wsegs } from './worm.js';
import { restore_waterlevel } from './mkmaze.js';
import { rest_regions } from './region.js';
import { rest_engravings } from './engrave.js';
import { place_monster, hideunder } from './makemon.js';
import { hides_under } from './mondata.js';
import { set_residency, restshk } from './shk.js';
import { restpriest } from './priest.js';
import { set_ustuck, restore_cham, hide_monst } from './mon.js';
import { mon_catchup_elapsed_time } from './dog.js';
import { stairway_add } from './mklev.js';
import { rnd } from './rng.js';
import { role_init, reset_mons } from './role.js';
import { reset_objects, init_oclass_probs } from './o_init.js';
import { set_playmode } from './options.js';
import { set_uasmon } from './polyself.js';
import { setworn } from './worn.js';
import { setuwep } from './wield.js';
import { ONAMES } from './objects_data.js';
import { restore_luadata } from './nhlua.js';
import { adj_erinys } from './attrib.js';
import { useup } from './invent.js';
import { xname } from './objnam.js';
import { pline, reset_glyphmap, reglyph_darkroom } from './display.js';
import { init_vision_globals, vision_reset } from './vision.js';
import { assign_graphics, ROGUESET } from './symbols.js';
import { ledger_no } from './dungeon.js';
import { max_rank_sz } from './botl.js';

// src/restore.c:71 find_lev_obj(). Local chains are rebuilt on getlev().
export async function find_lev_obj() {
    const reversed = [...game.level.objects].reverse();
    game.level.objects = [];
    game.level.objAt = new Map();
    for (const obj of reversed)
        obj.where = OBJ_FREE;
    for (const obj of reversed) {
        await place_object(obj, obj.ox, obj.oy);
        if (game.u?.uz?.dlevel && (obj.owornmask & (W_BALL | W_CHAIN)))
            await setworn(obj, obj.owornmask);
    }
}

// src/restore.c:113 inven_inuse(), before saving or after final restore.
export async function inven_inuse(quietly = false) {
    for (const obj of [...(game.invent || [])]) {
        if (obj.in_use) {
            if (!quietly)
                await pline(`Finishing off ${xname(obj)}...`);
            await useup(obj);
        }
    }
}

// src/restore.c:231 restobjchn(). Contents are restored, not inserted anew.
function restobjchn(objects, relativeTimes) {
    for (const obj of objects || []) {
        obj.nexthere = null;
        obj.lua_ref_cnt = 0;
        if (has_omonst(obj))
            restmon(OMONST(obj), relativeTimes);
        if (obj.cobj) {
            restobjchn(obj.cobj, relativeTimes);
            for (const child of obj.cobj)
                child.ocontainer = obj;
        }
        obj.bypass = 0;
        for (const [name, field] of [['victual', 'piece'], ['tin', 'tin'], ['spbook', 'book']]) {
            const context = game.context?.[name];
            if (context?.o_id === obj.o_id)
                context[field] = obj;
        }
    }
    return objects || [];
}

// src/restore.c:306 restmon(), also used for saved corpse/statue traits.
function restmon(mon, relativeTimes) {
    if (mon.edog) {
        if (relativeTimes) {
            mon.edog.droptime += game.moves;
            mon.edog.hungrytime += game.moves;
        }
        if (mon.edog.apport <= 0)
            mon.edog.apport = 1;
    }
}

// src/restore.c:376 restmonchn(). Serialized pointer values are never reused.
function restmonchn(monsters, relativeTimes) {
    for (const mon of monsters || []) {
        restmon(mon, relativeTimes);
        mon.data = game.mons[mon.mnum];
        mon.minvent = restobjchn(mon.minvent, relativeTimes);
        for (const obj of mon.minvent)
            obj.ocarry = mon;
        if (mon.mw)
            mon.mw = mon.minvent.find(obj => obj.owornmask & W_WEP) || null;
        if (mon.isshk)
            restshk(mon, false);
        if (mon.ispriest)
            restpriest(mon, false);
        if (game.context?.polearm?.m_id === mon.m_id)
            game.context.polearm.hitmon = mon;
    }
    return monsters || [];
}

// src/restore.c:468 loadfruitchn()
export function loadfruitchn(saved) {
    let flist = null;
    for (const f of saved || []) {
        if (!f.fid)
            break;
        flist = {fname: f.fname, fid: f.fid, nextf: flist};
    }
    return flist;
}

// src/restore.c:500 ghostfruit()
export async function ghostfruit(otmp) {
    let oldf;
    for (oldf = game.oldfruit; oldf; oldf = oldf.nextf)
        if (oldf.fid === otmp.spe)
            break;
    if (!oldf)
        await impossible('no old fruit?');
    else
        otmp.spe = fruitadd(oldf.fname, null);
}

// These root fields belong to the active level or its owner queues, not to
// restgamestate. Their owned records are loaded by getlev at each C phase.
const LEVEL_KEYS = new Set([
    'level', 'saved_levels', 'stairs', 'updest', 'dndest', 'worms', 'billobjs',
    'regions', 'max_regions', 'exclusion_zones', 'utcnt', 'utpnt', 'utrack',
    'timer_base', 'timer_id', 'light_sources', 'doorindex'
]);
const WORN_SLOTS = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
    'uleft', 'uright', 'uwep', 'uswapwep', 'uquiver', 'uamul', 'ublindf',
    'uball', 'uchain', 'uskin'];

// src/restore.c:525 restgamestate(), with the JSON codec replacing record I/O.
async function restgamestate(saved) {
    const bootWizard = !!game.wizard;
    const bootDiscover = !!game.discover;
    const bootHilitePet = !!game.flags.hilite_pet;
    const bootFlags = game.flags;
    const bootContext = game.context;
    const deferInventory = game.iflags?.perm_invent;
    (game.iflags ||= {}).perm_invent = false;
    const late = new Set(['u', 'mons', 'objects', 'obj_descr', 'bases', 'disco',
        'oclass_prob_totals', 'invent', 'migrating_objs', 'migrating_mons', '_save_version']);
    for (const key of Object.keys(game))
        if (!SAVE_SKIP_KEYS.has(key) && !LEVEL_KEYS.has(key) && !late.has(key))
            delete game[key];
    for (const [key, value] of Object.entries(saved))
        if (!SAVE_SKIP_KEYS.has(key) && !LEVEL_KEYS.has(key) && !late.has(key))
            game[key] = value;
    for (const [name, field] of [['victual', 'piece'], ['tin', 'tin'], ['spbook', 'book']]) {
        const context = game.context?.[name];
        if (context) {
            context.o_id = context[field]?.o_id || context.o_id || 0;
            context[field] = null;
        }
    }
    if (game.context?.polearm) {
        game.context.polearm.m_id = game.context.polearm.hitmon?.m_id
            || game.context.polearm.m_id || 0;
        game.context.polearm.hitmon = null;
    }
    game.flags.hilite_pet = bootHilitePet;
    game.iflags.deferred_X = bootDiscover && !game.discover;
    if (bootWizard) {
        game.wizard = true;
        game.discover = game.iflags.deferred_X = false;
    } else if (game.wizard || game.discover) {
        set_playmode();
    }
    const genders = [game.quest_ldrgend, game.quest_nemgend];
    role_init(game.flags.initrole, game.flags.initalign);
    game.u = saved.u;
    game.u.uz0 = { ...game.u.uz };
    game.youmonst ||= {};
    game.youmonst.cham = game.u.mcham;
    set_uasmon();
    if (game.u.uhp <= 0 && (!Upolyd(game.u) || game.u.mh <= 0)) {
        game.u.ux = game.u.uy = 0;
        await pline('You were not healthy enough to survive restoration.');
        if (game.wiz1_level)
            game.wiz1_level.dlevel = 0;
        game.u.uz = { dnum: 0, dlevel: 1 };
        game.flags = bootFlags;
        game.context = bootContext;
        game.youmonst = {};
        game.iflags.perm_invent = deferInventory;
        game.iflags.deferred_X = false;
        return false;
    }
    restore_timers({ timers: saved.timer_base || [], timer_id: saved.timer_id }, RANGE_GLOBAL);
    restore_light_sources(saved.light_sources);
    game.invent = restobjchn(saved.invent, !!saved._save_version);
    const loose = ['uball', 'uchain'].map(slot => game.u[slot])
        .filter(obj => obj && obj.where !== OBJ_FLOOR && obj.where !== OBJ_INVENT);
    for (const slot of WORN_SLOTS)
        game.u[slot] = null;
    for (const obj of loose)
        if (obj.owornmask)
            await setworn(obj, obj.owornmask);
    game.migrating_objs = restobjchn(saved.migrating_objs, !!saved._save_version);
    game.migrating_mons = restmonchn(saved.migrating_mons, !!saved._save_version);
    game.defer_see_monsters = true;
    for (const obj of game.invent)
        if (obj.owornmask)
            await setworn(obj, obj.owornmask);
    const weapon = game.u.uwep;
    game.u.uwep = null;
    await setuwep(weapon);
    if (!weapon || weapon.otyp === ONAMES.PICK_AXE || weapon.otyp === ONAMES.GRAPPLING_HOOK)
        game.unweapon = true;
    game.hero_seq = game.moves * 8;
    [game.quest_ldrgend, game.quest_nemgend] = genders;
    game.ffruit = loadfruitchn(savefruitchn());
    for (const key of ['objects', 'obj_descr', 'bases', 'disco'])
        if (Object.hasOwn(saved, key))
            game[key] = saved[key];
    restore_luadata();
    relink_timers(false);
    relink_light_sources(false);
    adj_erinys(game.u.ualign.abuse || 0);
    game.iflags.perm_invent = deferInventory;
    return true;
}

// src/restore.c:755 restlevelfile(), separate from the original full save.
function restlevelfile(key) {
    const [dnum, dlevel] = key.split(':').map(Number);
    const record = savelev(ledger_no({ dnum, dlevel }), true);
    game.saved_levels.set(key, record);
}

// Old JSON snapshots used one live graph and omitted some level records.
// Retain what they actually stored. Missing clouds or dormant worm tails are
// left absent; no level generation, replacement objects or RNG is synthesized.
function legacy_level(saved) {
    const level = saved.level;
    const localObjects = new Set();
    const collect = objects => {
        for (const obj of objects || []) {
            localObjects.add(obj.o_id);
            collect(obj.cobj);
        }
    };
    collect(level.objects);
    collect(level.buriedobjs);
    for (const mon of level.monsters || [])
        collect(mon.minvent);
    const localMonsters = new Set((level.monsters || []).map(mon => mon.m_id));
    const local = timer => timer.kind === TIMER_LEVEL
        || (timer.kind === TIMER_OBJECT && localObjects.has(timer.arg))
        || (timer.kind === TIMER_MONSTER && localMonsters.has(timer.arg));
    level._saved_omoves = saved.moves;
    level._saved_stairs = saved.stairs;
    level._saved_updest = saved.updest;
    level._saved_dndest = saved.dndest;
    level._saved_worms = saved.worms;
    level._saved_billobjs = saved.billobjs;
    level._saved_regions = saved.regions || [];
    level._saved_regions_moves = saved.moves;
    level._saved_exclusion_zones = saved.exclusion_zones || [];
    level._saved_engravings = level.lev_engr;
    level._saved_track = { utcnt: saved.utcnt, utpnt: saved.utpnt, utrack: saved.utrack || [] };
    level._saved_timers = { timers: (saved.timer_base || []).filter(local) };
    saved.timer_base = (saved.timer_base || []).filter(timer => !local(timer));
    const monsters = [...(level.monsters || []), ...(saved.migrating_mons || []),
        ...(saved.mydogs || [])];
    const isLocalLight = light => light.type === LS_OBJECT
        ? localObjects.has(light.id) : monsters.some(mon => mon.m_id === light.id && mon.mx > 0);
    level._saved_lights = (saved.light_sources || []).filter(isLocalLight);
    saved.light_sources = (saved.light_sources || []).filter(light => !isLocalLight(light));
    return level;
}

// src/restore.c:789 dorecover(). Each getlev reads an independent level copy.
export async function dorecover() {
    const raw = game.storage?.getItem(`save:${game.plname || 'anonymous'}`);
    if (!raw)
        return false;
    let saved;
    try {
        saved = gamestate_decode(JSON.parse(raw));
    } catch (error) {
        return false;
    }
    for (const timer of saved.timer_base || []) {
        if (!timer.needs_fixup && (timer.kind === TIMER_OBJECT || timer.kind === TIMER_MONSTER)) {
            timer.arg = timer.kind === TIMER_OBJECT ? timer.arg.o_id : timer.arg.m_id;
            timer.needs_fixup = 1;
        }
    }
    const original = saved._save_version ? saved.level : legacy_level(saved);
    const current = `${saved.u.uz.dnum}:${saved.u.uz.dlevel}`;
    const otherLevels = [...(saved.saved_levels || new Map()).entries()]
        .filter(([key]) => key !== current);
    const state = game.program_state ||= {};
    state.restoring = REST_GSTATE;
    game.u = { ux: 0, uy: 0, uz: { dnum: 0, dlevel: 0 } };
    game.context = {};
    game.moves = 0;
    game.timer_base = [];
    game.light_sources = [];
    game.invent = [];
    game.migrating_objs = [];
    game.migrating_mons = [];
    game.mydogs = [];
    game.saved_levels = new Map();
    game.wportal = null;
    reset_mons();
    reset_objects();
    init_vision_globals();
    await getlev(original);
    if (!await restgamestate(saved)) {
        savelev(0, true);
        delete_savefile();
        game.u.usteed_mid = game.u.ustuck_mid = 0;
        state.restoring = 0;
        return false;
    }
    init_oclass_probs();
    restlevelfile(current);
    state.restoring = REST_LEVELS;
    game.u.ustuck = game.u.usteed = null;
    const ledger = key => {
        const [dnum, dlevel] = key.split(':').map(Number);
        return ledger_no({ dnum, dlevel });
    };
    otherLevels.sort(([a], [b]) => ledger(a) - ledger(b));
    for (const [key, level] of otherLevels) {
        await getlev(level);
        restlevelfile(key);
    }
    state.restoring = REST_CURRENT_LEVEL;
    await getlev(original);
    state.something_worth_saving = 1;
    if (!game.wizard && !game.discover)
        delete_savefile();
    if (Is_rogue_level(game.u.uz))
        assign_graphics(ROGUESET);
    reset_glyphmap(gm_levelchange);
    max_rank_sz();
    if (!!game.u.uball !== !!game.u.uchain) {
        await impossible('restgamestate: lost ball & chain');
        await setworn(null, W_CHAIN);
        await setworn(null, W_BALL);
    }
    await inven_inuse();
    reglyph_darkroom();
    vision_reset();
    game.vision_full_recalc = 1;
    await run_timers();
    state.restoring = 0;
    state.beyond_savefile_load = 1;
    game.u.usteed_mid = game.u.ustuck_mid = 0;
    return true;
}

// src/restore.c:955 rest_stairs(). C prepends each stored stairway.
function rest_stairs(saved, relative) {
    game.stairs = null;
    for (let stair = saved; stair; stair = stair.next) {
        const destination = { ...stair.tolev };
        if (relative && game.program_state?.restoring !== REST_GSTATE
            && destination.dnum === game.u.uz.dnum)
            destination.dlevel += game.u.uz.dlevel;
        stairway_add(stair.sx, stair.sy, stair.up, stair.isladder, destination);
        game.stairs.u_traversed = stair.u_traversed;
    }
}

// src/restore.c:1047 getlev(), the ordinary (non-bones) level-load contract.
export async function getlev(record) {
    const state = game.program_state ||= {};
    state.in_getlev = true;
    try {
        const level = gamestate_decode(gamestate_encode(record));
        game.level = level;
        const relative = !!level._saved_format;
        const elapsed = game.moves - (level._saved_omoves ?? game.moves);
        rest_stairs(level._saved_stairs, relative);
        game.updest = { ...level._saved_updest };
        game.dndest = { ...level._saved_dndest };
        if (relative)
            level.flags.stasis_until += game.moves;
        for (const room of [...(level.rooms || []), ...(level.subrooms || [])])
            room.resident = null;
        const lastRoom = level.rooms?.[(level.nroom || 0) - 1];
        game.doorindex = lastRoom ? lastRoom.fdoor + lastRoom.doorct : 0;
        restore_timers(level._saved_timers, RANGE_LEVEL);
        restore_light_sources(level._saved_lights);
        level.monsters = restmonchn(level.monsters, relative);
        rest_worm(level._saved_worms);
        level.traps = (level.traps || []).reverse();
        for (const trap of level.traps)
            if (relative && state.restoring !== REST_GSTATE && trap.dst?.dnum === game.u.uz.dnum)
                trap.dst.dlevel += game.u.uz.dlevel;
        const buried = level.buriedobjs;
        level.buriedobjs = [];
        game.billobjs = [];
        level.objects = restobjchn(level.objects, relative);
        await find_lev_obj();
        level.buriedobjs = restobjchn(buried, relative);
        game.billobjs = restobjchn(level._saved_billobjs, relative);
        rest_engravings(level._saved_engravings || level.lev_engr);
        level.monAt = new Map();
        for (const mon of level.monsters) {
            if (mon.isshk)
                set_residency(mon, false);
            if (mon.m_id === game.u.usteed_mid) {
                game.u.usteed = mon;
                game.u.usteed_mid = 0;
            } else {
                if (mon.m_id === game.u.ustuck_mid) {
                    set_ustuck(mon);
                    game.u.ustuck_mid = 0;
                }
                place_monster(mon, mon.mx, mon.my);
                // Legacy dormant JSON maps never stored their worm segments.
                if (mon.wormno && (relative || game.worms.wtails[mon.wormno]))
                    place_wsegs(mon, null);
                if (hides_under(mon.data) && mon.mundetected)
                    await hideunder(mon);
            }
            if (!game.u.uz.dlevel || state.restoring === REST_LEVELS)
                continue;
            if (elapsed > 0)
                await mon_catchup_elapsed_time(mon, elapsed);
            await restore_cham(mon);
            if (elapsed > 0 && elapsed > rnd(10))
                await hide_monst(mon);
        }
        level.damagelist = (level.damagelist || []).reverse();
        rest_regions({ moves: level._saved_regions_moves ?? game.moves,
            regions: level._saved_regions || [] }, false);
        await restore_waterlevel();
        game.exclusion_zones = (level._saved_exclusion_zones || []).slice().reverse();
        const track = level._saved_track;
        if (track) {
            game.utcnt = track.utcnt;
            game.utpnt = track.utpnt;
            game.utrack = track.utrack.map(point => ({ ...point }));
        }
        relink_timers(false);
        relink_light_sources(false);
    } finally {
        state.in_getlev = false;
    }
}
