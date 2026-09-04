// readobjnam.js — Wish object parsing (partial).
// C ref: objnam.c readobjnam / rnd_otyp_by_namedesc / wishymatch;
//        non-wizard spe clamp uses objects[].oc_charged (D-1690);
//        wish quan uses objects[].oc_merge (D-1712);
//        wish "poisoned " / permapoisoned (D-1732).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { str_start_is } from './hacklib.js';
import {
    objectNames,
    objectNameStrs,
    objectDescrs,
    NUM_OBJECTS,
    MAXOCLASSES,
    ARMOR_CLASS,
    WEAPON_CLASS,
    WAND_CLASS,
    RING_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    GEM_CLASS,
    AMULET_CLASS,
    SPBOOK_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    is_poisonable,
} from './objects.js';
import { mksobj, mkobj, weight, curse, oc_merge_of, spot_stop_timers } from './mkobj.js';
import { artifact_name, nartifact_exist, permapoisoned } from './artifact.js';
import { oname, lookup_novel } from './do_name.js';
import { name_to_monplus } from './mondata.js';
import { makesingular, An, an } from './objnam.js';
import { is_weptool, is_ammo, is_missile } from './wield.js';
import { Is_candle } from './timeout.js';
import { NON_PM, LOW_PM, monsterNames } from './monsters.js';
import {
    ONAME_WISH, SPE_LIM,
    FOUNTAIN, THRONE, SINK, ALTAR, TREE, IRONBARS, CLOUD,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, ROOM,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, STAIRS, LADDER, SDOOR, DOOR,
    CORR, SCORR,
    HWALL, VWALL, DBWALL, COLNO, ROWNO, isok, Is_rogue_level,
    F_LOOTED, T_LOOTED, S_LPUDDING, S_LDWASHER, S_LRING,
    TREE_LOOTED, TREE_SWARM, ICED_POOL, ICED_MOAT,
    A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE, Align2amask,
    IS_FOUNTAIN, IS_SINK, IS_GRAVE, IS_WALL, IS_DOOR, IS_FURNITURE,
    MAGIC_PORTAL, MELT_ICE_AWAY, TT_LAVA, TT_NONE,
    NO_TRAP, TRAPNUM, ROCKTRAP, is_hole, Can_fall_thru,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    WM_MASK, W_NONDIGGABLE, W_NONPASSWALL,
} from './const.js';

const STRANGE_OBJECT = 0;
const GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const GRAY_DSM = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DS = objectNames.indexOf('GRAY_DRAGON_SCALES');
const SCALE_MAIL = objectNames.indexOf('SCALE_MAIL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const ROCK = objectNames.indexOf('ROCK');
const FLINT = objectNames.indexOf('FLINT');
const GOLD_SYM = '$';

/** C ref: objnam.c wrp[] / wrpsym[] — class words for wishing. */
const WRP = [
    'wand', 'ring', 'potion', 'scroll', 'gem',
    'amulet', 'spellbook', 'spell book',
    'weapon', 'armor', 'tool', 'food', 'comestible',
];
const WRPSYMS = [
    WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS,
    AMULET_CLASS, SPBOOK_CLASS, SPBOOK_CLASS, WEAPON_CLASS,
    ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, FOOD_CLASS,
];

/** Sentinels matching C &hands_obj / &nothing */
export const HANDS_OBJ = { _hands_obj: true };
export const NOTHING_OBJ = { _nothing_obj: true };

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/** C objnam.c BSTRCMPI(bp, eos(bp)-n, suff) — case-insensitive suffix. */
function bstrcmpi_end(bp, suff) {
    const s = String(bp || '');
    const t = String(suff);
    if (s.length < t.length) return false;
    return s.slice(-t.length).toLowerCase() === t.toLowerCase();
}

function strncmpi_start(bp, pref) {
    const s = String(bp || '');
    const t = String(pref);
    return s.slice(0, t.length).toLowerCase() === t.toLowerCase();
}

/**
 * C BSTRCMPI(bp, p-4, "wall") && (bp == p-4 || p[-5] == ' ') —
 * reject fused suffixes like "swallow".
 */
function is_wall_wish(bp) {
    if (!bstrcmpi_end(bp, 'wall')) return false;
    const s = String(bp || '');
    return s.length === 4 || s.charAt(s.length - 5) === ' ';
}

/**
 * C ref: objnam.c set_wallprop_from_str — case-sensitive strstr on
 * remaining bp; |= into wall_info (overlays flags).
 */
function set_wallprop_from_str(bp) {
    const u = game.u;
    const lev = u && game.level?.at(u.ux | 0, u.uy | 0);
    if (!lev) return;
    const s = String(bp || '');
    let wall_prop = 0;
    if (s.includes('undiggable ') || s.includes('nondiggable ')) {
        wall_prop |= W_NONDIGGABLE;
    }
    if (s.includes('unphaseable ') || s.includes('nonpasswall ')) {
        wall_prop |= W_NONPASSWALL;
    }
    if (wall_prop) {
        lev.wall_info = (lev.wall_info | 0) | wall_prop;
        if (lev.flags !== undefined) lev.flags = (lev.flags | 0) | wall_prop;
    }
}

function upstart(str) {
    const s = String(str || '');
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function t_at_local(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) return t;
    }
    return null;
}

function deltrap_local(trap) {
    const traps = game.level?.traps;
    if (!traps || !trap) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

function CAN_OVERWRITE_TERRAIN(ttyp) {
    return ttyp !== LADDER && ttyp !== STAIRS;
}

function fuzzymatch(u, t) {
    const norm = (x) => String(x).toLowerCase().replace(/[- ]+/g, '');
    return norm(u) === norm(t);
}

/** C ref: objnam.c wishymatch — fuzzy + "of" inversion subset. */
function wishymatch(u_str, o_str, retry_inverted) {
    if (!u_str || !o_str) return false;
    if (fuzzymatch(u_str, o_str)) return true;
    if (retry_inverted) {
        const uOf = u_str.toLowerCase().indexOf(' of ');
        const oOf = o_str.toLowerCase().indexOf(' of ');
        if (uOf >= 0 && oOf < 0) {
            const buf = `${u_str.slice(uOf + 4)} ${u_str.slice(0, uOf)}`;
            if (fuzzymatch(buf, o_str)) return true;
        } else if (oOf >= 0 && uOf < 0) {
            const buf = `${o_str.slice(oOf + 4)} ${o_str.slice(0, oOf)}`;
            if (fuzzymatch(u_str, buf)) return true;
        }
    }
    return false;
}

/** C ref: objnam.c rnd_otyp_by_namedesc */
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name) return STRANGE_OBJECT;
    const check_of = !name.toLowerCase().includes(' of ');
    const objs = game.objects || [];
    let lo = MAXOCLASSES;
    let hi = NUM_OBJECTS - 1;
    if (oclass) {
        const bases = game.bases;
        if (bases) {
            lo = bases[oclass] | 0;
            hi = (bases[oclass + 1] | 0) - 1;
        }
    }
    const valid = [];
    let maxprob = 0;
    const minglob = objectNames.indexOf('GLOB_OF_GRAY_OOZE');
    const maxglob = objectNames.indexOf('GLOB_OF_BLACK_PUDDING');

    for (let i = lo; i <= hi; i++) {
        const zn = objectNameStrs[i];
        if (!zn) continue;
        let hit = wishymatch(name, zn, true);
        if (!hit && check_of) {
            const of = zn.toLowerCase().indexOf(' of ');
            if (of >= 0 && i !== BELL_OF_OPENING
                && (minglob < 0 || i < minglob || i > maxglob)) {
                hit = wishymatch(name, zn.slice(of + 4), false);
            }
        }
        const zd = objectDescrs[i];
        if (!hit && zd) {
            hit = wishymatch(name, zd, false);
            if (!hit && check_of) {
                const of = zd.toLowerCase().indexOf(' of ');
                if (of >= 0) hit = wishymatch(name, zd.slice(of + 4), false);
            }
        }
        if (hit) {
            valid.push(i);
            maxprob += (objs[i]?.oc_prob || 0) + (xtra_prob | 0);
        }
    }
    if (valid.length > 0 && maxprob) {
        let prob = rn2(maxprob);
        for (let i = 0; i < valid.length - 1; i++) {
            prob -= (objs[valid[i]]?.oc_prob || 0) + (xtra_prob | 0);
            if (prob < 0) return valid[i];
        }
        return valid[valid.length - 1];
    }
    return STRANGE_OBJECT;
}

/**
 * C ref: objnam.c readobjnam_parse_charges — strip trailing "(N)" / "(R:S)".
 */
function readobjnam_parse_charges(d) {
    if (!d.bp || d.bp.length <= 1) return;
    const paren = d.bp.lastIndexOf('(');
    if (paren < 0) return;
    let keeptrailing = true;
    let cut = paren;
    if (paren > 0 && d.bp[paren - 1] === ' ') cut = paren - 1;
    let p = d.bp.slice(paren + 1); // past '('
    const head = d.bp.slice(0, cut);
    if (/^lit\)/i.test(p)) {
        d.islit = 1;
        p = p.slice(4); // after "lit)"
    } else {
        let i = 0;
        while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
        d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
        p = p.slice(i);
        if (p[0] === ':') {
            p = p.slice(1);
            d.rechrg = d.spe;
            i = 0;
            while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
            d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
            p = p.slice(i);
        }
        if (p[0] !== ')') {
            d.spe = 0;
            d.rechrg = 0;
            keeptrailing = false;
            p = '';
        } else {
            d.spesgn = 1;
            p = p.slice(1); // past ')'
        }
    }
    d.bp = keeptrailing ? head + p : head;
    if (d.spe < 0) {
        d.spesgn = -1;
        d.spe = Math.abs(d.spe);
    }
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.rechrg < 0 || d.rechrg > 7) d.rechrg = 7;
}

/**
 * C ref: objnam.c postparse1 wrp[] loop — "wand of X" / "X wand" → oclass.
 * Returns true when actualn/oclass are set for srch (rnd_otyp_by_namedesc).
 */
function readobjnam_parse_class_words(d) {
    const bp = d.bp;
    if (!bp) return false;
    // C false-hit guards before wrp scan
    if (/^enchant /i.test(bp) || /^destroy /i.test(bp)
        || /^detect food/i.test(bp) || /^food detection/i.test(bp)
        || /^ring mail/i.test(bp) || /^studded leather armor/i.test(bp)
        || /^leather armor/i.test(bp) || /^tooled horn/i.test(bp)
        || /^food ration/i.test(bp) || /^meat ring/i.test(bp)) {
        return false;
    }
    const lower = bp.toLowerCase();
    for (let i = 0; i < WRP.length; i++) {
        const word = WRP[i];
        const j = word.length;
        if (lower.startsWith(word)
            && (bp.length === j || bp[j] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let rest = bp.slice(j);
                if (/^ of /i.test(rest)) d.actualn = rest.slice(4);
                // else leave actualn unset (C: /* else if(*bp) ?? */)
            } else {
                d.actualn = bp;
            }
            return true;
        }
        // trailing " <class>"
        if (lower.endsWith(word)
            && (bp.length === j || bp[bp.length - j - 1] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let cut = bp.length - j;
                if (cut > 0 && bp[cut - 1] === ' ') cut -= 1;
                d.bp = bp.slice(0, cut);
                d.actualn = d.dn = d.bp;
            } else {
                d.actualn = d.dn = bp;
            }
            return true;
        }
    }
    return false;
}

/**
 * C ref: objnam.c readobjnam `any:` — wrpsym[rn2(sizeof)] then mkobj(oclass, FALSE).
 * Used when bp is NULL (makewish after MAXWISHTRY) or empty after preparse
 * (ESC/empty wish → makewish clears ESC to "" → preparse returns 1).
 */
function readobjnam_any(d) {
    if (!d.oclass) {
        d.oclass = WRPSYMS[rn2(WRPSYMS.length)];
    }
    if (d.typ) {
        d.oclass = game.objects?.[d.typ]?.oc_class ?? d.oclass;
        d.otmp = mksobj(d.typ, true, false);
    } else {
        d.otmp = mkobj(d.oclass, false);
    }
    if (!d.otmp) return null;
    d.typ = d.otmp.otyp;
    d.oclass = d.otmp.oclass;
    d.otmp.owt = weight(d.otmp);
    return d.otmp;
}

/**
 * C ref: objnam.c wizterrainwish — trap loop then furniture/terrain wish
 * then madeterrain postamble switch_terrain (D-1279 furniture; D-1289
 * traps; D-1290 door/wall; D-1304 secret corridor; C :3563–3582 then
 * :3740–3845 then :3872–3910). Drawbridge under, lava pooleffects,
 * water/fire_damage_chain, melting ice still named.
 */
async function wizterrainwish(d) {
    const u = game.u;
    if (!u) return HANDS_OBJ;
    const x = u.ux | 0;
    const y = u.uy | 0;
    const lev = game.level?.at(x, y);
    if (!lev) return null;
    const {
        switch_terrain, set_uinwater, is_pool, is_lava, waterbody_name,
    } = await import('./hack.js');
    const { feel_newsym, pline, docrt } = await import('./display.js');
    const { recalc_block_point } = await import('./vision.js');
    const { maketrap, trapname } = await import('./trap.js');
    const bp = d.bp || '';
    let madeterrain = false;
    let badterrain = false;
    const oldtyp = lev.typ | 0;
    const is_dbridge = oldtyp === DRAWBRIDGE_DOWN || oldtyp === DRAWBRIDGE_UP;
    const lf = game.level.flags || (game.level.flags = {});

    /* C :3563–3582 — trap names before furniture; always return hands_obj */
    for (let trap = NO_TRAP + 1; trap < TRAPNUM; trap++) {
        let tname = trapname(trap, true);
        if (!str_start_is(bp, tname, true)) continue;
        if (is_hole(trap) && !Can_fall_thru(u.uz)) trap = ROCKTRAP;
        const t = maketrap(x, y, trap);
        if (t) {
            trap = t.ttyp | 0;
            tname = trapname(trap, true);
            await pline(`${An(tname)}${trap !== MAGIC_PORTAL ? '' : ' to nowhere'}.`);
        } else {
            await pline(`Creation of ${an(tname)} failed.`);
        }
        return HANDS_OBJ;
    }

    if (bstrcmpi_end(bp, 'fountain')) {
        lev.typ = FOUNTAIN;
        if (oldtyp !== FOUNTAIN) lf.nfountains = (lf.nfountains | 0) + 1;
        lev.looted = d.looted ? F_LOOTED : 0;
        lev.blessedftn = !!(d.blessed || strncmpi_start(bp, 'magic '));
        await pline(`A ${lev.blessedftn ? 'magic ' : ''}fountain.`);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'throne')) {
        lev.typ = THRONE;
        lev.looted = d.looted ? T_LOOTED : 0;
        await pline('A throne.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'sink')) {
        lev.typ = SINK;
        if (oldtyp !== SINK) lf.nsinks = (lf.nsinks | 0) + 1;
        lev.looted = d.looted ? (S_LPUDDING | S_LDWASHER | S_LRING) : 0;
        await pline('A sink.');
        madeterrain = true;
    } else if (!is_dbridge && (bstrcmpi_end(bp, 'pool')
            || bstrcmpi_end(bp, 'moat')
            || bstrcmpi_end(bp, 'wall of water'))) {
        const ltyp = bstrcmpi_end(bp, 'pool') ? POOL
            : bstrcmpi_end(bp, 'moat') ? MOAT
            : WATER;
        lev.typ = ltyp;
        lev.flags = 0;
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        const save = u.EHalluc_resistance | 0;
        u.EHalluc_resistance = 1;
        const new_water = waterbody_name(x, y);
        u.EHalluc_resistance = save;
        await pline(`${An(new_water)}.`);
        madeterrain = true;
    } else if (!is_dbridge && (bstrcmpi_end(bp, 'lava')
            || bstrcmpi_end(bp, 'wall of lava'))) {
        const ltyp = bstrcmpi_end(bp, 'wall of lava') ? LAVAWALL : LAVAPOOL;
        lev.typ = ltyp;
        lev.flags = 0;
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        await pline(`A ${ltyp === LAVAPOOL ? 'pool' : 'wall'} of molten lava.`);
        madeterrain = true;
    } else if (!is_dbridge && bstrcmpi_end(bp, 'ice')) {
        lev.typ = ICE;
        lev.icedpool = (oldtyp === ROOM) ? ICED_POOL : ICED_MOAT;
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        await pline(`${upstart(waterbody_name(x, y))}.`);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'altar')) {
        lev.typ = ALTAR;
        let al;
        if (strncmpi_start(bp, 'chaotic ')) al = A_CHAOTIC;
        else if (strncmpi_start(bp, 'neutral ')) al = A_NEUTRAL;
        else if (strncmpi_start(bp, 'lawful ')) al = A_LAWFUL;
        else if (strncmpi_start(bp, 'unaligned ')) al = A_NONE;
        else al = !rn2(6) ? A_NONE : (rn2((A_LAWFUL | 0) + 2) - 1);
        lev.altarmask = Align2amask(al);
        const alstr = al === A_NONE ? 'unaligned'
            : al === A_CHAOTIC ? 'chaotic'
            : al === A_LAWFUL ? 'lawful'
            : 'neutral';
        await pline(`${An(alstr)} altar.`);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'grave') || bstrcmpi_end(bp, 'headstone')) {
        const { make_grave } = await import('./engrave.js');
        make_grave(x, y, null);
        if (IS_GRAVE(lev.typ)) {
            lev.looted = 0;
            lev.disturbed = d.looted ? 1 : 0;
            lev.horizontal = !!lev.disturbed;
            await pline(`A ${lev.disturbed ? 'disturbed ' : ''}grave.`);
            madeterrain = true;
        } else {
            await pline("Can't place a grave here.");
            badterrain = true;
        }
    } else if (bstrcmpi_end(bp, 'tree')) {
        lev.typ = TREE;
        lev.looted = d.looted ? (TREE_LOOTED | TREE_SWARM) : 0;
        set_wallprop_from_str(bp);
        await pline('A tree.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'bars')) {
        lev.typ = IRONBARS;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        await pline('Iron bars.');
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'cloud')) {
        lev.typ = CLOUD;
        lev.flags = 0;
        await pline('A cloud.');
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        madeterrain = true;
    } else if (bstrcmpi_end(bp, 'door')
            || ((d.doorless | 0) && bstrcmpi_end(bp, 'doorway'))) {
        /* C :3740–3821 — require door/wall/bars so horizontal is set */
        const secret = bstrcmpi_end(bp, 'secret door');
        const okLoc = (lev.typ | 0) === DOOR || (lev.typ | 0) === SDOOR
            || (IS_WALL(lev.typ) && (lev.typ | 0) !== DBWALL)
            || (lev.typ | 0) === IRONBARS;
        if (okLoc) {
            const old_wall_info = ((lev.typ | 0) !== DOOR)
                ? (lev.wall_info | 0) : 0;
            lev.typ = secret ? SDOOR : DOOR;
            lev.wall_info = 0;
            if (Is_rogue_level(u.uz)) {
                d.doorless = 1;
                d.locked = 0;
                d.closed = 0;
                d.open = 0;
                d.broken = 0;
            }
            lev.doormask = (d.locked | 0) ? D_LOCKED
                : ((d.doorless | 0) || secret) ? D_NODOOR
                  : (d.open | 0) ? D_ISOPEN
                    : (d.broken | 0) ? D_BROKEN
                      : D_CLOSED;
            if (secret) lev.wall_info |= (old_wall_info & WM_MASK);
            if ((d.trapped | 0) === 2
                || (((lev.doormask & (D_LOCKED | D_CLOSED)) === 0)
                    && !secret)) {
                d.trapped = 0;
            }
            if (d.trapped) lev.doormask |= D_TRAPPED;
            if (lev.flags !== undefined) lev.flags = lev.doormask;
            let dbuf = '';
            if (lev.doormask & D_TRAPPED) dbuf += 'trapped ';
            if (lev.doormask & D_LOCKED) dbuf += 'locked ';
            if ((lev.typ | 0) === SDOOR) {
                dbuf += 'secret door';
            } else {
                if (lev.doormask & D_CLOSED) dbuf += 'closed ';
                if (lev.doormask & D_ISOPEN) dbuf += 'open ';
                if (lev.doormask & D_BROKEN) dbuf += 'broken ';
                if ((lev.doormask & ~D_TRAPPED) === D_NODOOR) {
                    dbuf += 'doorless doorway';
                } else {
                    dbuf += 'door';
                }
            }
            await pline(`${upstart(an(dbuf))}.`);
            madeterrain = true;
        } else {
            const dbuf = secret ? 'secret door' : 'door';
            await pline(`${upstart(dbuf)} requires door or wall location.`);
            badterrain = true;
        }
    } else if (is_wall_wish(bp)) {
        /* C :3822–3835 — HWALL unless N/S neighbor is a wall */
        let wall = HWALL;
        if ((isok(u.ux, u.uy - 1)
                && IS_WALL(game.level.at(u.ux, u.uy - 1)?.typ))
            || (isok(u.ux, u.uy + 1)
                && IS_WALL(game.level.at(u.ux, u.uy + 1)?.typ))) {
            wall = VWALL;
        }
        madeterrain = true;
        lev.typ = wall;
        lev.flags = 0;
        lev.wall_info = 0;
        set_wallprop_from_str(bp);
        const { fix_wall_spines } = await import('./mklev.js');
        fix_wall_spines(
            Math.max(0, u.ux - 1),
            Math.max(0, u.uy - 1),
            Math.min(COLNO, u.ux + 1),
            Math.min(ROWNO, u.uy + 1),
        );
        await pline('A wall.');
    } else if (bstrcmpi_end(bp, 'secret corridor')) {
        /* C :3836–3845 — CORR only; neither CORR nor SCORR uses flags */
        if ((lev.typ | 0) === CORR) {
            lev.typ = SCORR;
            await pline('Secret corridor.');
            madeterrain = true;
        } else {
            await pline('Secret corridor requires corridor location.');
            badterrain = true;
        }
    } else if (!is_dbridge && (bstrcmpi_end(bp, 'room')
            || bstrcmpi_end(bp, 'floor')
            || bstrcmpi_end(bp, 'ground'))) {
        if (oldtyp === ROOM
            || (IS_FURNITURE(oldtyp) && CAN_OVERWRITE_TERRAIN(oldtyp))
            || oldtyp === ICE
            || is_pool(x, y) || is_lava(x, y)) {
            lev.typ = ROOM;
            await pline('Room floor.');
            const t = t_at_local(x, y);
            if (t && (t.ttyp | 0) !== MAGIC_PORTAL) deltrap_local(t);
            madeterrain = true;
        } else {
            await pline('Room|floor|ground not allowed here.');
            badterrain = true;
        }
    }

    if (madeterrain) {
        feel_newsym(x, y);
        if ((u.uinwater | 0) && !is_pool(u.ux | 0, u.uy | 0)) {
            await set_uinwater(0);
            await docrt();
        } else {
            if ((u.utrap | 0) && (u.utraptype | 0) === TT_LAVA
                && !is_lava(u.ux | 0, u.uy | 0)) {
                u.utrap = 0;
                u.utraptype = TT_NONE;
            }
            recalc_block_point(x, y);
        }
        if (IS_FOUNTAIN(oldtyp) && !IS_FOUNTAIN(lev.typ)
            && (lf.nfountains | 0) > 0) {
            lf.nfountains--;
        }
        if (IS_SINK(oldtyp) && !IS_SINK(lev.typ)
            && (lf.nsinks | 0) > 0) {
            lf.nsinks--;
        }
        if ((lev.typ | 0) !== ICE) spot_stop_timers(x, y, MELT_ICE_AWAY);
        if (IS_FOUNTAIN(oldtyp) || IS_GRAVE(oldtyp)
            || IS_WALL(oldtyp) || oldtyp === IRONBARS
            || IS_DOOR(oldtyp) || oldtyp === SDOOR) {
            if (!IS_FOUNTAIN(lev.typ) && !IS_GRAVE(lev.typ)
                && !IS_DOOR(lev.typ) && (lev.typ | 0) !== SDOOR) {
                lev.horizontal = 0;
                lev.blessedftn = 0;
                lev.disturbed = 0;
            }
        }
        /* C :3907–3910 leftover Lev/Fly FROMOUTSIDE after terrain change */
        await switch_terrain();
    }
    if (madeterrain || badterrain) return HANDS_OBJ;
    return null;
}

/**
 * C ref: objnam.c readobjnam wiztrap — wizard && !wizkit_wishing &&
 * !d.oclass then wizterrainwish (D-1279 furniture; D-1289 traps;
 * D-1290 door/wall; D-1304 secret corridor).
 * Object-only readobjnam stays sync for wizkit/mklev (C skips terrain
 * when wizkit_wishing).
 */
export async function readobjnam_wish(bp, no_wish) {
    const missOut = {};
    const otmp = readobjnam(bp, no_wish, missOut);
    if (otmp) return otmp;
    if (wizardMode() && !(game.program_state?.wizkit_wishing | 0)
        && missOut.d && !(missOut.d.oclass | 0) && !(missOut.d.typ | 0)) {
        const t = await wizterrainwish(missOut.d);
        if (t) return t;
    }
    return otmp;
}

/**
 * C ref: objnam.c readobjnam — wish subset for artifact / named armor / amulet.
 * Empty/NULL → `any` (D-0559); qualifier-only empty (blessed/rustproof/…) deferred.
 * Terrain wish is readobjnam_wish (D-1279 furniture; D-1289 traps;
 * D-1290 door/wall; D-1304 secret corridor).
 */
export function readobjnam(bp, no_wish, missOut) {
    // C: readobjnam_init + if (!bp) goto any
    if (bp == null) {
        return readobjnam_any({
            typ: 0, oclass: 0, otmp: null,
        });
    }
    bp = mungspaces(bp);
    // C: "nothing"/"nil"/"none" → return no_wish (wishless conduct)
    if (/^(nothing|nil|none)$/i.test(bp)) return no_wish || NOTHING_OBJ;
    // C: empty bp (or ESC already cleared by makewish) → preparse returns 1 → any
    if (!bp || bp === '\x1b') {
        return readobjnam_any({
            typ: 0, oclass: 0, otmp: null,
        });
    }

    const d = {
        bp,
        origbp: bp,
        cnt: 0,
        spe: 0,
        spesgn: 0,
        rechrg: 0,
        typ: 0,
        blessed: 0,
        uncursed: 0,
        iscursed: 0,
        oclass: 0,
        actualn: null,
        dn: null,
        un: null,
        name: null,
        mntmp: NON_PM,
        otmp: null,
        islit: 0,
        looted: 0,
        trapped: 0,
        locked: 0,
        unlocked: 0,
        broken: 0,
        open: 0,
        closed: 0,
        doorless: 0,
        ispoisoned: 0,
    };

    for (;;) {
        if (!d.bp) break;
        let l = 0;
        const s = d.bp;
        if (/^an /i.test(s)) { d.cnt = 1; l = 3; }
        else if (/^a /i.test(s)) { d.cnt = 1; l = 2; }
        else if (/^the /i.test(s)) { l = 4; }
        else if (!d.cnt && /^\d/.test(s) && s !== '0') {
            const m = s.match(/^(\d+)/);
            d.cnt = parseInt(m[1], 10);
            d.bp = s.slice(m[1].length).replace(/^ +/, '');
            continue;
        } else if (s[0] === '+' || s[0] === '-') {
            d.spesgn = s[0] === '+' ? 1 : -1;
            d.bp = s.slice(1);
            const m = d.bp.match(/^(\d+)/);
            d.spe = m ? parseInt(m[1], 10) : 0;
            d.bp = d.bp.slice(m ? m[1].length : 0).replace(/^ +/, '');
            continue;
        } else if (/^blessed /i.test(s) || /^holy /i.test(s)) {
            d.blessed = 1; d.uncursed = 0; d.iscursed = 0;
            l = /^blessed /i.test(s) ? 8 : 5;
        } else if (/^cursed /i.test(s) || /^unholy /i.test(s)) {
            d.iscursed = 1; d.blessed = 0; d.uncursed = 0;
            l = 7;
        } else if (/^uncursed /i.test(s)) {
            d.uncursed = 1; d.blessed = 0; d.iscursed = 0;
            l = 9;
        } else if (/^poisoned /i.test(s)) {
            /* C objnam.c readobjnam `:4034–4035` — before trapped. */
            d.ispoisoned = 1;
            l = 9;
        } else if (/^trapped /i.test(s)) {
            /* C :4038–4041 — honor trapped only in wizard mode */
            d.trapped = 0;
            if (wizardMode()) d.trapped = 1;
            l = 8;
        } else if (/^untrapped /i.test(s)) {
            d.trapped = 2;
            l = 10;
        } else if (/^locked /i.test(s)) {
            d.locked = 1; d.closed = 1;
            d.unlocked = 0; d.broken = 0; d.open = 0; d.doorless = 0;
            l = 7;
        } else if (/^unlocked /i.test(s)) {
            d.unlocked = 1; d.closed = 1;
            d.locked = 0; d.broken = 0; d.open = 0; d.doorless = 0;
            l = 9;
        } else if (/^broken /i.test(s)) {
            d.broken = 1;
            d.locked = 0; d.unlocked = 0; d.open = 0; d.closed = 0;
            d.doorless = 0;
            l = 7;
        } else if (/^open /i.test(s)) {
            d.open = 1;
            d.closed = 0; d.locked = 0; d.broken = 0; d.doorless = 0;
            l = 5;
        } else if (/^closed /i.test(s)) {
            d.closed = 1;
            d.open = 0; d.locked = 0; d.broken = 0; d.doorless = 0;
            l = 7;
        } else if (/^doorless /i.test(s)) {
            d.doorless = 1;
            d.open = 0; d.closed = 0; d.locked = 0; d.unlocked = 0;
            d.broken = 0;
            l = 9;
        } else {
            break;
        }
        if (l) d.bp = s.slice(l);
    }
    if (!d.cnt) d.cnt = 1;

    // C: readobjnam_parse_charges before postparse
    readobjnam_parse_charges(d);

    {
        const rem = { rest: null };
        if (d.mntmp < LOW_PM && d.bp.length > 2) {
            const mndx = name_to_monplus(d.bp, rem);
            if (mndx >= LOW_PM) {
                d.mntmp = mndx;
                let rest = rem.rest || '';
                if (rest.startsWith(' ')) rest = rest.slice(1);
                else if (/^s /i.test(rest)) rest = rest.slice(2);
                else if (/^es /i.test(rest) || /^'s /i.test(rest)) rest = rest.slice(3);
                else if (!rest && !d.actualn && !d.dn && !d.un && !d.oclass) {
                    d.mntmp = NON_PM;
                    rest = d.bp;
                }
                if (d.mntmp >= LOW_PM) d.bp = rest;
            }
        }
    }

    if (/^scales$/i.test(d.bp) && d.mntmp >= GRAY_DRAGON && d.mntmp <= YELLOW_DRAGON) {
        d.typ = GRAY_DS + (d.mntmp - GRAY_DRAGON);
        d.mntmp = NON_PM;
    }

    // C ref: objnam.c readobjnam — makesingular before alt spellings / wrp / srch.
    // Exceptions: "tricks" (bag of tricks), "clothes" (avoid cloth false hit).
    if (d.bp && !/^tricks$/i.test(d.bp) && !/^clothes$/i.test(d.bp)) {
        const sng = makesingular(d.bp);
        if (sng !== d.bp) {
            if (d.cnt === 1) d.cnt = 2;
            d.bp = sng;
        }
    }

    // C ref: objnam.c readobjnam_postparse1 — gold/money → mksobj(GOLD_PIECE, FALSE)
    // and return otmp (skips namedesc / typfnd). Case 3 in C.
    {
        const bp = d.bp || '';
        const end = bp.length;
        const isGold = (end >= 10 && bp.slice(end - 10).toLowerCase() === 'gold piece')
            || (end >= 7 && bp.slice(end - 7).toLowerCase() === 'zorkmid')
            || /^gold$/i.test(bp) || /^money$/i.test(bp) || /^coin$/i.test(bp)
            || bp === GOLD_SYM;
        if (isGold && GOLD_PIECE >= 0) {
            let cnt = d.cnt | 0;
            if (cnt > 5000 && !wizardMode()) cnt = 5000;
            else if (cnt < 1) cnt = 1;
            d.otmp = mksobj(GOLD_PIECE, false, false);
            if (!d.otmp) return null;
            d.otmp.quan = cnt;
            d.otmp.owt = weight(d.otmp);
            return d.otmp;
        }
    }

    // C: postparse1 wrp[] — "wand of polymorph" → WAND_CLASS + "polymorph"
    if (!d.typ && !d.oclass) {
        readobjnam_parse_class_words(d);
    }

    if (!d.typ) {
        if (!d.actualn) d.actualn = d.bp;
        if (!d.dn) d.dn = d.actualn;

        // C: postparse3 — search even when oclass is set (srch path)
        if (d.actualn) {
            let typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1);
            if (typ === STRANGE_OBJECT && d.dn !== d.actualn) {
                typ = rnd_otyp_by_namedesc(d.dn, d.oclass, 1);
            }
            if (typ === STRANGE_OBJECT && d.un) {
                typ = rnd_otyp_by_namedesc(d.un, d.oclass, 1);
            }
            if (typ === STRANGE_OBJECT && d.origbp !== d.actualn) {
                typ = rnd_otyp_by_namedesc(d.origbp, d.oclass, 1);
            }
            if (typ !== STRANGE_OBJECT) d.typ = typ;
        }

        if (!d.typ && !d.oclass && d.actualn) {
            const out = { otyp: 0 };
            const aname = artifact_name(d.actualn, out, true);
            if (aname) {
                d.name = aname;
                d.typ = out.otyp;
            }
        }
    }

    /* C wiztrap: object miss then wizard terrain. Stash d for readobjnam_wish. */
    if (!d.typ && !d.oclass) {
        if (missOut) missOut.d = d;
        return null;
    }

    if (d.typ) d.oclass = game.objects?.[d.typ]?.oc_class ?? 0;
    d.otmp = mksobj(d.typ, true, false);
    d.typ = d.otmp.otyp;
    d.oclass = d.otmp.oclass;

    // C ref: objnam.c readobjnam :5071–5083 — honor d.cnt when oc_merge
    // (wizard unrestricted; else rnd(6) / candle <=7 / ammo-or-rock <=20).
    // Globby gsize/weight override still named.
    if ((d.cnt | 0) > 0) {
        if (oc_merge_of(d.typ)
            && (wizardMode()
                || (d.cnt | 0) < rnd(6)
                || ((d.cnt | 0) <= 7 && Is_candle(d.otmp))
                || ((d.cnt | 0) <= 20
                    && ((d.typ | 0) === ROCK || (d.typ | 0) === FLINT
                        || is_missile(d.otmp)
                        || (d.oclass === WEAPON_CLASS && is_ammo(d.otmp)))))) {
            d.otmp.quan = d.cnt | 0;
            d.otmp.owt = weight(d.otmp);
        }
    }

    if (d.spesgn === 0) {
        /* spe not specified; retain the randomly assigned value */
        d.spe = d.otmp.spe | 0;
    } else if (wizardMode()) {
        /* no restrictions except SPE_LIM */
    } else if (d.oclass === ARMOR_CLASS || d.oclass === WEAPON_CLASS
        || is_weptool(d.otmp)
        || (d.oclass === RING_CLASS && game.objects?.[d.typ]?.oc_charged)) {
        // C objnam.c readobjnam :5099–5105 — rnd(5) then Luck < 0 flips sign
        if ((d.spe | 0) > rnd(5) && (d.spe | 0) > (d.otmp.spe | 0))
            d.spe = 0;
        if ((d.spe | 0) > 2 && Luck() < 0)
            d.spesgn = -1;
    } else {
        // C: crystal ball cancels like a wand, to (n:-1)
        if (d.oclass === WAND_CLASS || d.typ === CRYSTAL_BALL) {
            if ((d.spe | 0) > 1 && d.spesgn === -1)
                d.spe = 1;
        } else if ((d.spe | 0) > 0 && d.spesgn === -1) {
            d.spe = 0;
        }
        if ((d.spe | 0) > (d.otmp.spe | 0))
            d.spe = d.otmp.spe | 0;
    }
    if (d.spesgn === -1) d.spe = -d.spe;
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.spe < -SPE_LIM) d.spe = -SPE_LIM;
    d.otmp.spe = d.spe;

    // C: set otmp->recharged for WAND_CLASS
    if (d.oclass === WAND_CLASS) {
        let rechrg = d.rechrg | 0;
        if (d.otmp.otyp === WAN_WISHING && !wizardMode()) rechrg = 1;
        d.otmp.recharged = rechrg;
    }

    // C objnam.c readobjnam `:5298–5305` — wish "poisoned" coats
    // is_poisonable; else taint FOOD by age=1.
    if (d.ispoisoned) {
        if (is_poisonable(d.otmp)) d.otmp.opoisoned = (Luck() >= 0) ? 1 : 0;
        else if (d.oclass === FOOD_CLASS) d.otmp.age = 1;
    }

    if (d.mntmp >= GRAY_DRAGON && d.mntmp <= YELLOW_DRAGON
        && d.otmp.otyp === SCALE_MAIL) {
        d.otmp.otyp = GRAY_DSM + (d.mntmp - GRAY_DRAGON);
        d.typ = d.otmp.otyp;
        d.otmp.oclass = ARMOR_CLASS;
    }

    if (d.iscursed) {
        curse(d.otmp);
    } else if (d.uncursed) {
        d.otmp.blessed = false;
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.blessed) {
        d.otmp.blessed = (Luck() >= 0 || wizardMode());
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.spesgn < 0) {
        curse(d.otmp);
    }

    d.otmp.oeroded = 0;
    d.otmp.oeroded2 = 0;

    if (d.name) {
        const out = { otyp: 0 };
        const aname = artifact_name(d.name, out, true);
        if (aname && out.otyp === d.otmp.otyp) d.name = aname;
        // C objnam.c readobjnam :5355–5358 — SPE_NOVEL lookup_novel
        if (d.otmp.otyp === SPE_NOVEL) {
            const novelname = lookup_novel(d.name, d.otmp);
            if (novelname) d.name = novelname;
        }
        const wishedName = d.name;
        d.otmp = oname(d.otmp, d.name, ONAME_WISH);
        if (d.otmp.oartifact || wishedName === aname) {
            d.otmp.quan = 1;
            if (!game.u) game.u = {};
            if (!game.u.uconduct) game.u.uconduct = {};
            game.u.uconduct.wisharti = (game.u.uconduct.wisharti | 0) + 1;
        }
    }

    // C objnam.c readobjnam `:5368–5369` — Grimtooth always poisoned.
    if (permapoisoned(d.otmp)) d.otmp.opoisoned = 1;

    // C: evaluate rn2(nartifact_exist()) even when wizard (|| short-circuit)
    if (d.otmp.oartifact) {
        const denyRoll = rn2(nartifact_exist()) > 1;
        if (denyRoll && !wizardMode()) return HANDS_OBJ;
    }

    d.otmp.owt = weight(d.otmp);
    return d.otmp;
}
