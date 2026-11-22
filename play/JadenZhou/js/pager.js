// pager.js -- describing what the hero sees at a map location.
// C ref: pager.c
//
// Ported so far: do_screen_description() for a looked-at map location
// (getpos autodescribe), lookat(), look_at_monster(), look_at_object()
// and self_lookat().
//
// The JS display keeps each map cell as the character it shows, not as a
// glyph number, so the screen-symbol matching of do_screen_description()
// (showsyms[] per monster class, object class and cmap entry) can't be
// done here. For a looked-at spot C's description ends in lookat() whenever
// the symbol is ambiguous or names a class (monsters, objects, traps,
// DECgraphics floor/doorway/dark room, blank stone/unexplored); for an
// unambiguous terrain symbol its first match is the same defsyms[]
// explanation lookat() returns. So firstmatch is lookat()'s description.
// lookat() works out which glyph C would show from the game state
// (glyph_at()): hero, seen monster, seen object, seen trap, or the
// background (back_to_glyph()).

import { game } from './gstate.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, add_menu_str,
         tty_yn_function } from './wintty.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { NHW_TEXT, MENU_SELECT_ALL, MENU_SELECT_PAGE, MENU_INVERT_ALL,
         MENU_INVERT_PAGE, MENU_UNSELECT_ALL, MENU_UNSELECT_PAGE,
         MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE, MENU_LAST_PAGE,
         MENU_SEARCH } from './const.js';
import { getpos } from './getpos.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ONE,
         ECMD_OK } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { extcmdlist } from './func_tab.js';
import { cmd_from_func, key2extcmddesc, key2txt } from './cmd.js';
import { visctrl } from './hacklib.js';
import { canspotmon, vobj_at, pline, Hallucination, Blind } from './display.js';
import { cansee } from './vision.js';
import { m_at, closed_door, is_pool, is_lava } from './makemon.js';
import { t_at } from './trap.js';
import { engr_at } from './engrave.js';
import { x_monnam, ARTICLE_NONE } from './do_name.js';
import { pmname } from './do_name.js';
import { distant_name, doname } from './objnam.js';
import { u_at, M_AP_OBJECT, MCORPSENM } from './const.js';
import { objects, OBJ_NAME, CHEST, LARGE_BOX, STRANGE_OBJECT, COIN_CLASS,
         SLIME_MOLD, LEASH, CORPSE, STATUE } from './objects.js';
import { mksobj, mkobj } from './mkobj.js';
import { sobj_at } from './makemon.js';
import { observe_object } from './o_init.js';
import { costly_spot } from './shk.js';
import { STONE, SCORR, ROOM, CORR, SDOOR, HWALL, VWALL, TLCORNER, TRCORNER,
         BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
         DOOR, IRONBARS, TREE, POOL, MOAT, STAIRS, LADDER, FOUNTAIN, SINK,
         ALTAR, GRAVE, THRONE, ICE, LAVAPOOL, LAVAWALL, AIR, CLOUD, WATER,
         DBWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LA_DOWN, D_BROKEN, D_ISOPEN,
         D_TRAPPED, IS_WALL, MALE, FEMALE, HALLUC, INVIS, BLINDED,
         isok, IS_WATERWALL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT,
         Is_medusa_level, Is_juiblex_level, Is_qstart, Is_waterlevel } from './const.js';
import { hliquid } from './potion.js';
import { PM_SAMURAI } from './monsters.js';

/* C ref: defsym.h PCHAR()/PCHAR2() explanations, S_stone .. S_water */
const S_stone = 0, S_ndoor = 12, S_vodoor = 13, S_hodoor = 14,
    S_vcdoor = 15, S_hcdoor = 16, S_bars = 17, S_tree = 18, S_room = 19,
    S_darkroom = 20, S_corr = 22, S_litcorr = 23, S_upstair = 25,
    S_dnstair = 26, S_upladder = 27, S_dnladder = 28, S_altar = 33,
    S_grave = 34, S_throne = 35, S_sink = 36, S_fountain = 37, S_pool = 38,
    S_ice = 39, S_lava = 40, S_lavawall = 41, S_vodbridge = 42,
    S_vcdbridge = 44, S_air = 46, S_cloud = 47, S_water = 48;
export const defsyms_explanation = [
    "stone", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall",
    "wall", "wall", "wall", "doorway", "open door", "open door",
    "closed door", "closed door", "iron bars", "tree", "floor of a room",
    "dark part of a room", "engraving", "corridor", "lit corridor",
    "engraving", "staircase up", "staircase down", "ladder up",
    "ladder down", "branch staircase up", "branch staircase down",
    "branch ladder up", "branch ladder down", "altar", "grave",
    "opulent throne", "sink", "fountain", "water", "ice", "molten lava",
    "wall of lava", "lowered drawbridge", "lowered drawbridge",
    "raised drawbridge", "raised drawbridge", "air", "cloud", "water",
];

function uhave(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: display.c back_to_glyph() -- the cmap index of the background
// at <x,y> (walls are all "wall", so wall_angle() isn't needed here)
export function back_to_cmap(x, y) {
    const ptr = game.level.at(x, y);

    switch (ptr.typ) {
    case SCORR:
    case STONE:
        return game.level.flags?.arboreal ? S_tree : S_stone;
    case ROOM:
        return S_room;
    case CORR:
        return (ptr.waslit || game.flags.lit_corridor) ? S_litcorr : S_corr;
    case SDOOR:
    case HWALL:
    case VWALL:
    case TLCORNER:
    case TRCORNER:
    case BLCORNER:
    case BRCORNER:
    case CROSSWALL:
    case TUWALL:
    case TDWALL:
    case TLWALL:
    case TRWALL:
        return ptr.seenv ? 1 /* wall_angle(ptr): some wall */ : S_stone;
    case DOOR:
        if (ptr.doormask) {
            if (ptr.doormask & D_BROKEN)
                return S_ndoor;
            else if (ptr.doormask & D_ISOPEN)
                return ptr.horizontal ? S_hodoor : S_vodoor;
            else /* else is closed */
                return ptr.horizontal ? S_hcdoor : S_vcdoor;
        }
        return S_ndoor;
    case IRONBARS:
        return S_bars;
    case TREE:
        return S_tree;
    case POOL:
    case MOAT:
        return S_pool;
    case STAIRS:
        /* known_branch_stairs(): the explanation for S_brupstair etc. */
        return (ptr.ladder & LA_DOWN) ? S_dnstair : S_upstair;
    case LADDER:
        return (ptr.ladder & LA_DOWN) ? S_dnladder : S_upladder;
    case FOUNTAIN:
        return S_fountain;
    case SINK:
        return S_sink;
    case ALTAR:
        return S_altar;
    case GRAVE:
        return S_grave;
    case THRONE:
        return S_throne;
    case ICE:
        return S_ice;
    case LAVAPOOL:
        return S_lava;
    case LAVAWALL:
        return S_lavawall;
    case AIR:
        return S_air;
    case CLOUD:
        return S_cloud;
    case WATER:
        return S_water;
    case DBWALL:
        return S_vcdbridge;
    case DRAWBRIDGE_UP:
        throw new Error('back_to_glyph(): drawbridges not ported yet');
    case DRAWBRIDGE_DOWN:
        return S_vodbridge;
    default:
        return S_room;
    }
}

// C ref: dbridge.c db_under_typ()
function db_under_typ(mask) {
    switch (mask & DB_UNDER) {
    case DB_ICE: return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default: return STONE;
    }
}

// C ref: pager.c waterbody_name()
/* describe a pool location's contents; the Snprintf()s are into a
   40-character buffer (pooltype[40]) */
export function waterbody_name(x, y) {
    let ltyp;
    const hallucinate = Hallucination() && !game.program_state?.gameover;

    if (!isok(x, y))
        return "drink"; /* should never happen */
    /* ltyp = SURFACE_AT(x, y) */
    const loc = game.level.at(x, y);
    ltyp = (loc.typ === DRAWBRIDGE_UP) ? db_under_typ(loc.drawbridgemask)
                                        : loc.typ;

    if (ltyp === LAVAPOOL) {
        return `molten ${hliquid("lava")}`.slice(0, 39);
    } else if (ltyp === ICE) {
        if (!hallucinate)
            return "ice";
        return `frozen ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === POOL) {
        return `pool of ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === MOAT) {
        /* a bit of extra flavor over general moat */
        if (hallucinate) {
            return `deep ${hliquid("water")}`.slice(0, 39);
        } else if (Is_medusa_level(game.u.uz)) {
            /* somewhat iffy since ordinary stairs can take you beneath,
               but previous generic "water" was rather anti-climactic */
            return "shallow sea";
        } else if (Is_juiblex_level(game.u.uz)) {
            return "swamp";
        } else if (game.urole.mnum === PM_SAMURAI && Is_qstart(game.u.uz)) {
            /* samurai quest home level has two isolated moat spots;
               they sound silly if farlook describes them as such */
            return "pond";
        } else {
            return "moat";
        }
    } else if (IS_WATERWALL(ltyp)) {
        if (Is_waterlevel(game.u.uz))
            return "limitless water"; /* even if hallucinating */
        return `wall of ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === LAVAWALL) {
        return `wall of ${hliquid("lava")}`.slice(0, 39);
    }
    /* default; should be unreachable */
    return "water"; /* don't hallucinate this as some other liquid */
}

// C ref: pager.c self_lookat()
export function self_lookat() {
    const u = game.u;
    let race = "";

    /* include race with role unless polymorphed */
    if (!u.mtimedone) /* !Upolyd */
        race = `${game.urace.adj} `;
    let outbuf = `${uhave(INVIS) && !uhave(BLINDED) ? "invisible " : ""}${race}`
        + `${pmname(game.youmonst.data, game.flags.female ? FEMALE : MALE)}`
        + ` called ${game.plname}`;
    if (u.usteed)
        outbuf += `, mounted on ${y_monnam_pg(u.usteed)}`;
    if (u.uundetected || (u.mtimedone && game.youmonst.m_ap_type)
        || visible_region_at_pg(u.ux, u.uy))
        throw new Error('self_lookat(): mhidden_description() not ported yet');
    if (game.uball) /* Punished */
        outbuf += `, chained to ${game.uball ? ansimpleoname_pg(game.uball) : "nothing?"}`;
    if (u.utrap) /* bear trap, pit, web, in-floor, in-lava, tethered */
        outbuf += `, ${trap_predicament(0, false)}`;
    return outbuf;
}

// C ref: pager.c look_at_object()
function look_at_object(x, y, otmp) {
    let buf;

    /* object_from_map(): the object shown here */
    if (otmp) {
        if (!otmp.dknown && otmp.quan > 1)
            throw new Error('look_at_object(): doname_vague_quan() not ported yet');
        /* doname_with_price() adds a price only for shop goods */
        if (otmp.unpaid || otmp.no_charge)
            throw new Error('look_at_object(): doname_with_price() not ported yet');
        buf = distant_name(otmp, doname);
    } else {
        buf = "something"; /* sanity precaution */
    }

    const lev = game.level.at(x, y);
    /* check TREE before STONE due to level.flags.arboreal */
    if (lev.typ === TREE)
        throw new Error('look_at_object(): object in a tree not ported yet');
    else if (lev.typ === STONE || lev.typ === SCORR)
        buf += " embedded in stone";
    else if (IS_WALL(lev.typ) || lev.typ === SDOOR)
        buf += " embedded in a wall";
    else if (closed_door(x, y))
        buf += " embedded in a door";
    else if (is_pool(x, y))
        buf += " in water";
    else if (is_lava(x, y))
        buf += " in molten lava"; /* [can this ever happen?] */
    return buf;
}

// C ref: display.h is_obj_mappear()
function is_obj_mappear(mon, otyp) {
    return mon.m_ap_type === M_AP_OBJECT && mon.mappearance === otyp;
}

// C ref: pager.c object_from_map()
/* extracted from lookat(); also used by namefloorobj() */
// glyph is a glyph_at()/lev->glyph glyph; returns { fakeobj, otmp } for
// C's return value and *obj_p
export function object_from_map(glyph, x, y) {
    let fakeobj = false, mimic_obj = false;
    let mtmp;
    let otmp;
    const glyphotyp = (glyph.kind === 'obj') ? glyph.otyp /* glyph_to_obj() */
                      /* if not an object, probably a detected chest trap */
                      : (glyph.kind === 'cmap' || glyph.kind === 'trap')
                        /* assume trapped chest|door */
                        ? (sobj_at(CHEST, x, y) ? CHEST : LARGE_BOX)
                        : STRANGE_OBJECT;

    /* TODO: check inside containers in case glyph came from detection */
    if ((otmp = sobj_at(glyphotyp, x, y)) === null)
        otmp = (game.level.buriedobjlist || []).find(o =>
            o.ox === x && o.oy === y && o.otyp === glyphotyp) || null;

    /* there might be a mimic here posing as an object */
    mtmp = m_at(x, y);
    if (mtmp && is_obj_mappear(mtmp, glyphotyp)) {
        otmp = null;
        mimic_obj = true;
    } else
        mtmp = null;

    if (!otmp || otmp.otyp !== glyphotyp) {
        /* this used to exclude STRANGE_OBJECT; now caller deals with it */
        if (OBJ_NAME(objects[glyphotyp])) {
            /* map shows a regular object, but one that's not actually here */
            otmp = mksobj(glyphotyp, false, false);
        } else {
            /* map shows a non-item that holds an extra object type (shown
               on map due to hallucination) for a name which might have been
               shuffled into play but wasn't (or was shuffled out of play);
               pick another item that is a regular one in same object class */
            otmp = mkobj(objects[glyphotyp].oc_class, false);
            /* mkobj() doesn't provide any no-init option; however, there
               aren't any extra tool items (or statues) so we won't get here
               for tools and don't need to check for and delete container
               contents or extinguish lights on the temporary object */
        }
        /* even though we pass False for mksobj()'s 'init' arg, corpse-rot,
           egg-hatch, and figurine-transform timers get initialized */
        if (otmp.timer || otmp.timed) {
            otmp.timer = null; /* obj_stop_timers(otmp) */
            otmp.timed = 0;
        }
        fakeobj = true;
        if (otmp.oclass === COIN_CLASS)
            otmp.quan = 2; /* to force pluralization */
        else if (otmp.otyp === SLIME_MOLD)
            otmp.spe = game.context.current_fruit; /* give it a type */
        if (mtmp && MCORPSENM(mtmp) !== -1) { /* has_mcorpsenm(): mimic as corpse/statue */
            if (otmp.otyp === SLIME_MOLD)
                /* override svc.context.current_fruit to avoid
                     look, use 'O' to make new named fruit, look again
                   giving different results when current_fruit changes */
                otmp.spe = MCORPSENM(mtmp);
            else
                otmp.corpsenm = MCORPSENM(mtmp);
        } else if (otmp.otyp === CORPSE && glyph.kind === 'obj'
                   && glyph.otyp === CORPSE) { /* glyph_is_body(glyph) */
            otmp.corpsenm = glyph.corpsenm; /* glyph_to_body_corpsenm() */
        } else if (otmp.otyp === STATUE && glyph.kind === 'obj'
                   && glyph.otyp === STATUE) { /* glyph_is_statue(glyph) */
            otmp.corpsenm = glyph.corpsenm; /* glyph_to_statue_corpsenm() */
        }
        if (otmp.otyp === LEASH)
            otmp.leashmon = 0;
        /* extra fields needed for shop price with doname() formatting */
        otmp.where = 'OBJ_FLOOR';
        otmp.ox = x, otmp.oy = y;
        otmp.no_charge = (otmp.otyp === STRANGE_OBJECT && costly_spot(x, y)) ? 1 : 0;
    }
    /* if located at adjacent spot, mark it as having been seen up close
       (corpse type will be known even if dknown is 0, so we don't need a
       touch check for cockatrice corpse--we're looking without touching) */
    if (otmp && Math.abs(x - game.u.ux) <= 1 && Math.abs(y - game.u.uy) <= 1 /* next2u() */
        && !Blind() && !Hallucination()
        /* redundant: we only look for an object which matches current
           glyph among floor and buried objects; when !Blind, any buried
           object's glyph will have been replaced by whatever is present
           on the surface as soon as we moved next to its spot */
        && (fakeobj || otmp.where === 'OBJ_FLOOR') /* not buried */
        /* terrain mode views what's already known, doesn't learn new stuff */
        && !game.iflags.terrainmode) /* so don't set dknown when in terrain mode */
        observe_object(otmp, Hallucination()); /* if a pile, clearly see the top item only */
    if (fakeobj && mtmp && mimic_obj
        && (otmp.dknown || mtmp.m_ap_fdknown /* M_AP_FLAG() & M_AP_F_DKNOWN */)) {
        mtmp.m_ap_fdknown = 1; /* mtmp->m_ap_type |= M_AP_F_DKNOWN */
        observe_object(otmp, Hallucination());
    }
    return { fakeobj, otmp }; /* when fakeobj, caller needs to dealloc otmp */
}

// C ref: pager.c look_at_monster()
function look_at_monster(mtmp, x, y) {
    const accurate = !uhave(HALLUC);

    if (!accurate)
        throw new Error('look_at_monster(): hallucination not ported yet');
    /* PM_COYOTE: coyotename() */
    if (mtmp.data.mlet !== undefined && mtmp.data.pmnames?.[2] === "coyote")
        throw new Error('look_at_monster(): coyotename() not ported yet');
    const name = x_monnam(mtmp, ARTICLE_NONE, null, 0, false); /* distant_monnam() */
    let buf = `${(mtmp.mx !== x || mtmp.my !== y)
                 ? ((mtmp.isshk && accurate) ? "tail of " : "tail of a ") : ""}`
        /* monhealthdescr() is disabled in C ("") */
        + `${(mtmp.mtame && accurate) ? "tame "
             : (mtmp.mpeaceful && accurate) ? "peaceful " : ""}`
        + name;
    if (game.u.ustuck === mtmp)
        throw new Error('look_at_monster(): u.ustuck not ported yet');
    if (mtmp.mfrozen)
        buf += ", can't move (paralyzed or sleeping or busy)";
    else if (mtmp.msleeping)
        buf += ", asleep";
    else if ((mtmp.mstrategy & 0x0f000000) !== 0) /* STRAT_WAITMASK */
        buf += ", meditating";

    if (mtmp.mleashed)
        buf += ", leashed to you";
    if (mtmp.mtrapped && cansee(mtmp.mx, mtmp.my))
        throw new Error('look_at_monster(): trapped monster not ported yet');
    if (mtmp.mundetected || mtmp.m_ap_type)
        throw new Error('look_at_monster(): mhidden_description() not ported yet');
    return buf;
}

// C ref: engrave.h spot_shows_engravings()
function spot_shows_engravings(x, y) {
    const typ = game.level.at(x, y).typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

// C ref: display.c _map_location() -- which kind of glyph a spot in view
// shows when no monster is displayed there: object, trap, engraving or
// the background
function map_location_kind(x, y) {
    const covers = is_pool(x, y) || is_lava(x, y); /* covers_objects() */
    let trap, ep;

    if (vobj_at(x, y) && !covers)
        return 'object';
    else if ((trap = t_at(x, y)) && trap.tseen && !covers)
        return 'trap';
    else if (spot_shows_engravings(x, y) && (ep = engr_at(x, y)) && ep.erevealed
             && !covers)
        return 'engraving';
    return 'cmap';
}

// C ref: pager.c lookat() -- the glyph_is_cmap() case
function cmap_lookat(symidx, x, y) {
    const lev = game.level.at(x, y);

    switch (symidx) {
    case S_altar:
        throw new Error('lookat(): altar description not ported yet');
    case S_ndoor:
        /* is_drawbridge_wall(x, y) >= 0: drawbridges aren't ported */
        if ((lev.doormask & ~D_TRAPPED) === D_BROKEN)
            return "broken door";
        return "doorway";
    case S_cloud:
        return "fog/vapor cloud"; /* Is_airlevel(): "cloudy area" */
    case S_pool:
    case S_water:
    case S_lava:
    case S_lavawall:
    case S_ice: /* for hallucination; otherwise defsyms[] would be fine */
        return waterbody_name(x, y);
    case S_stone:
        if (!lev.seenv)
            return "unexplored";
        else if (game.u.uinwater)
            throw new Error('lookat(): Underwater not ported yet');
        else if (lev.typ === STONE || lev.typ === SCORR)
            return "stone";
        return defsyms_explanation[symidx];
    default:
        return defsyms_explanation[symidx];
    }
}

// C ref: pager.c lookat() -- describe the glyph shown at <x,y>
export function lookat(x, y) {
    const lev = game.level.at(x, y);
    let buf = "";

    if (u_at(x, y)) { /* && canspotself() */
        buf = self_lookat();
    } else if (game.u.uswallow) {
        throw new Error('lookat(): swallowed not ported yet');
    } else {
        const mtmp = m_at(x, y);

        if (mtmp && mtmp.m_ap_type && cansee(x, y))
            throw new Error('lookat(): mimic appearance not ported yet');
        if (mtmp && !mtmp.mundetected && canspotmon(mtmp)) {
            /* glyph_is_monster(glyph) */
            buf = look_at_monster(mtmp, x, y);
        } else if (cansee(x, y)) {
            switch (map_location_kind(x, y)) {
            case 'object':
                buf = look_at_object(x, y, vobj_at(x, y));
                break;
            case 'trap':
                throw new Error('lookat(): trap_description() not ported yet');
            case 'engraving':
                buf = "engraving";
                break;
            default:
                buf = cmap_lookat(back_to_cmap(x, y), x, y);
                break;
            }
        } else if (!lev.seenv && !lev.remembered_glyph) {
            /* glyph_is_unexplored(glyph) */
            buf = "unexplored area";
        } else {
            /* what the hero remembers here: only the background is
               worked out so far */
            if (map_location_kind(x, y) !== 'cmap')
                throw new Error('lookat(): remembered objects/traps/engravings not ported yet');
            let idx = back_to_cmap(x, y);
            /* remembered lit floor out of sight is shown as dark room */
            if (idx === S_room && game.flags.dark_room !== false)
                idx = S_darkroom;
            buf = cmap_lookat(idx, x, y);
        }
    }
    return buf;
}

// C ref: pager.c do_screen_description() -- for a looked-at location;
// returns { found, firstmatch } (out_str isn't used by the callers so far)
export function do_screen_description(cc) {
    const firstmatch = lookat(cc.x, cc.y);
    return { found: 1, firstmatch };
}

/* help menu choices that aren't ported yet */
// C ref: pager.c domenucontrols()
async function domenucontrols() {
    const cwin = tty_create_nhwindow(NHW_TEXT);

    show_menu_controls(cwin, false);
    await tty_display_nhwindow(cwin, false);
    await tty_destroy_nhwindow(cwin);
}

/* C ref: options.c get_menu_cmd_key() -- no menu command remapping is
   configured, so each menu command is its own key */
function get_menu_cmd_key(ch) { return ch.charCodeAt(0); }

/* C sprintf() field helpers for show_menu_controls()'s formats */
function padl(s, w) { return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function padr(s, w) { return s.length >= w ? s : s + ' '.repeat(w - s.length); }

// C ref: options.c show_menu_controls() -- the '?k' (dolist FALSE) form
function show_menu_controls(win, dolist) {
    const hardcoded = [
        { key: "Return", desc: "Accept current choice(s) and dismiss menu" },
        { key: "Enter",  desc: "Same as Return" },
        { key: "Space",  desc: "If not on last page, advance one page;" },
        { key: "     ",  desc: "when on last page, treat like Return" },
        { key: "Escape", desc: "Cancel menu without making any choice(s)" },
    ];
    /* mc_fmt "%8s     %-6s %s", mc_altfmt "%9s  %-6s %s" */
    const mc_fmt = (a, b, c) => `${padl(a, 8)}     ${padr(b, 6)} ${c}`;
    const mc_altfmt = (a, b, c) => `${padl(a, 9)}  ${padr(b, 6)} ${c}`;
    /* wc2_supported("menu_shift"): tty doesn't offer WC2_MENU_SHIFT */
    const has_menu_shift = false;
    let fmt, arg;

    /*
     * Relies on spaces to line things up in columns, so must be rendered
     * with a fixed-width font or will look dreadful.
     */
    tty_putstr(win, 0, "Menu control keys:");
    if (dolist) { /* key bindings help: '?i' */
        throw new Error('show_menu_controls(): the key bindings list not ported yet');
    } else { /* menu controls help: '?k' */
        tty_putstr(win, 0, "");
        tty_putstr(win, 0, mc_altfmt("", "Whole", "Current"));
        tty_putstr(win, 0, mc_altfmt("", " Menu", " Page"));
        tty_putstr(win, 0, mc_fmt("Select",
                                  visctrl(get_menu_cmd_key(MENU_SELECT_ALL)),
                                  visctrl(get_menu_cmd_key(MENU_SELECT_PAGE))));
        tty_putstr(win, 0, mc_fmt("Invert",
                                  visctrl(get_menu_cmd_key(MENU_INVERT_ALL)),
                                  visctrl(get_menu_cmd_key(MENU_INVERT_PAGE))));
        tty_putstr(win, 0, mc_fmt("Deselect",
                                  visctrl(get_menu_cmd_key(MENU_UNSELECT_ALL)),
                                  visctrl(get_menu_cmd_key(MENU_UNSELECT_PAGE))));
        tty_putstr(win, 0, "");
        tty_putstr(win, 0, mc_fmt("Go to",
                                  visctrl(get_menu_cmd_key(MENU_NEXT_PAGE)),
                                  "Next page"));
        tty_putstr(win, 0, mc_fmt("",
                                  visctrl(get_menu_cmd_key(MENU_PREVIOUS_PAGE)),
                                  "Previous page"));
        tty_putstr(win, 0, mc_fmt("",
                                  visctrl(get_menu_cmd_key(MENU_FIRST_PAGE)),
                                  "First page"));
        tty_putstr(win, 0, mc_fmt("",
                                  visctrl(get_menu_cmd_key(MENU_LAST_PAGE)),
                                  "Last page"));
        if (has_menu_shift)
            throw new Error('show_menu_controls(): menu_shift lines not ported yet');
        tty_putstr(win, 0, "");
        tty_putstr(win, 0, mc_fmt("Search",
                                  visctrl(get_menu_cmd_key(MENU_SEARCH)),
                                  "Exter a target string and invert all matching entries"));
        /* separator before hardcoded */
        tty_putstr(win, 0, "");
        /* fmt "%9s  %-8s %s" */
        fmt = (a, b, c) => `${padl(a, 9)}  ${padr(b, 8)} ${c}`;
        arg = "Other "; /* prefix for first hardcoded[] entry, then reset */
    }
    for (const xcp of hardcoded) {
        tty_putstr(win, 0, fmt(arg, xcp.key, xcp.desc));
        arg = "";
    }
}

function hmenu_not_ported(fn) {
    return () => { throw new Error(`dohelp(): ${fn}() not ported yet`); };
}

// C ref: pager.c help_menu_items[] -- data for dohelp(); the PORT_HELP
// entry isn't compiled into the unix build
const help_menu_items = [
    { f: 'hmenu_doextversion', text: "About NetHack (version information)." },
    { f: 'dispfile_help', text: "Long description of the game and commands." },
    { f: 'dispfile_shelp', text: "List of game commands." },
    { f: 'hmenu_dohistory', text: "Concise history of NetHack." },
    { f: 'hmenu_dowhatis', text: "Info on a character in the game display." },
    { f: 'hmenu_dowhatdoes', text: "Info on what a given key does." },
    { f: 'option_help', text: "List of game options." },
    { f: 'dispfile_optionfile', text: "Longer explanation of game options." },
    { f: 'dispfile_optmenu', text: "Using the %s command to set options." },
    { f: 'dokeylist', text: "Full list of keyboard commands." },
    { f: 'hmenu_doextlist', text: "List of extended commands." },
    { f: 'domenucontrols', text: "List menu control keys." },
    { f: 'dispfile_usagehelp', text: "Description of NetHack's command line." },
    { f: 'dispfile_license', text: "The NetHack license." },
    { f: 'docontact', text: "Support information." },
    { f: 'dispfile_debughelp', text: "List of wizard-mode commands." },
];

// C ref: cmd.c cmdname_from_func() -- the fullname case
function cmdname_from_func(fn) {
    const extcmd = extcmdlist.find(e => e.ef_funct === fn);
    return extcmd ? extcmd.ef_txt : null;
}

// C ref: pager.c setopt_cmd() -- how to run the full options menu
function setopt_cmd() {
    let outbuf = "'";
    let cmdnm;
    let key;

    /* #optionsfull */
    key = cmd_from_func("doset");
    if (key) {
        outbuf += visctrl(key);
    } else {
        /* extended command name, with leading "#" */
        cmdnm = cmdname_from_func("doset");
        if (!cmdnm) /* paranoia */
            cmdnm = "optionsfull";
        outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;

        /* since there's no key bound to #optionsfull, include 'm O' */
        outbuf += "' or '";
        /* m prefix plus #options */
        key = cmd_from_func("do_reqmenu");
        if (key) {
            /* key for 'm' prefix */
            outbuf += visctrl(key);
        } else {
            /* extended command name for 'm' prefix */
            cmdnm = cmdname_from_func("do_reqmenu");
            if (!cmdnm)
                cmdnm = "reqmenu";
            outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;
        }
        /* this is slightly iffy because the user shouldn't type <space> to
           get the command we're describing, but it improves readability */
        outbuf += " ";
        /* now #options, normally 'O' */
        key = cmd_from_func("doset_simple");
        if (key) {
            outbuf += visctrl(key);
        } else {
            /* extended command name */
            cmdnm = cmdname_from_func("doset_simple");
            if (!cmdnm) /* paranoia */
                cmdnm = "options";
            outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;
        }
    }
    outbuf += "'";
    return outbuf;
}

// C ref: pager.c dohelp() -- the #help command; the menu is ported, the
// help texts it leads to are not yet
export async function dohelp() {
    const tmpwin = tty_create_nhwindow(NHW_MENU);
    let helpbuf;
    const clr = NO_COLOR;

    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    for (let i = 0; i < help_menu_items.length; i++) {
        if (!game.flags?.debug && help_menu_items[i].f === 'dispfile_debughelp')
            continue;
        /* sysopt.hideusage is off */

        if (help_menu_items[i].f === 'dispfile_optmenu')
            helpbuf = help_menu_items[i].text.replace('%s', setopt_cmd());
        else
            helpbuf = help_menu_items[i].text;
        /* any.a_int = i + 1 */
        tty_add_menu(tmpwin, null, i + 1, 0, 0, ATR_NONE, clr,
                     helpbuf, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, "Select one item:");
    const res = await tty_select_menu(tmpwin, PICK_ONE);
    await tty_destroy_nhwindow(tmpwin);
    if (res.n > 0) {
        const sel = res.selected[0].item - 1;
        const f = help_menu_items[sel].f;
        if (f === 'hmenu_dowhatis')
            await hmenu_dowhatis();
        else if (f === 'domenucontrols')
            await domenucontrols();
        else
            hmenu_not_ported(f)();
    }
    return ECMD_OK;
}

/* C ref: lookat.h LOOK_* -- getpos() results for the [.,;:] picks */
const LOOK_ONCE = 2;

/* C ref: pager.c what_is_a_location[] */
const what_is_a_location = "a monster, object or location";

// C ref: pager.c do_look()
export async function do_look(mode, click_cc) {
    const quick = (mode === 1); /* use cursor; don't search for "more info" */
    const clicklook = (mode === 2); /* right mouse-click method */
    const flags = game.flags;
    let i = '\0', ans = 0;
    let found;            /* count of matching syms found */
    const cc = { x: 0, y: 0 }; /* screen pos of unknown glyph */
    let from_screen;      /* question from the screen */
    const clr = NO_COLOR;

    /* cmdq_pop(): the command queue isn't ported */

    if (!clicklook) {
        if (quick) {
            i = 'y';
        } else {
            const win = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(win, MENU_BEHAVE_STANDARD);

            /*
             * Originally this was just a y|n question about whether to
             * use the cursor or to type a word.  When other choices were
             * added, it was changed to be a menu.  Using 'y' and 'n' as
             * unshown accelerators keeps backwards compatibility with
             * the old y|n behavior.
             *
             * When lootabc is set, abandon the 'y'|'n' compatibility in
             * favor of newer '/' and '?' compatibility instead.
             */
            const lootabc = !!flags.lootabc;
            tty_add_menu(win, null, '/', lootabc ? 0 : '/', lootabc ? '/' : 'y',
                         ATR_NONE, clr, "something on the map", MENU_ITEMFLAGS_NONE);
            /* [don't use 'i' as lootabc group accelerator because
               it will make the regular 'i' choice inaccessible] */
            tty_add_menu(win, null, 'i', lootabc ? 0 : 'i', 0, ATR_NONE,
                         clr, "something you're carrying", MENU_ITEMFLAGS_NONE);
            tty_add_menu(win, null, '?', lootabc ? 0 : '?', lootabc ? '?' : 'n',
                         ATR_NONE, clr, "something else (by symbol or name)",
                         MENU_ITEMFLAGS_NONE);
            if (!game.u.uswallow && !Hallucination()) {
                add_menu_str(win, "");
                /* these options work sensibly for swallowed case, but
                   there's no reason for player to use them then because
                   the swallowed display hides all applicable targets;
                   objects work fine when hallucinating, but screen
                   symbol/monster class letter doesn't match up with
                   bogus monster type, so suppress when hallucinating */
                /* [a_char, group accelerator without/with lootabc] */
                const more = [
                    ['m', 0, 'm', "nearby monsters"],
                    ['M', 0, 'M', "all monsters shown on map"],
                    ['o', 0, 'o', "nearby objects"],
                    ['O', 0, 'O', "all objects shown on map"],
                    ['t', '^', 't', "nearby traps"],
                    ['T', '"', 'T', "all seen or remembered traps"],
                    /* [don't use 'e' as lootabc group accelerator] */
                    ['e', '`', 0, "nearby engravings"],
                    ['E', '|', 'E', "all seen or remembered engravings"],
                ];
                for (const [a_char, gacc, gacc_abc, txt] of more)
                    tty_add_menu(win, null, a_char, lootabc ? 0 : a_char,
                                 lootabc ? gacc_abc : gacc, ATR_NONE, clr, txt,
                                 MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(win, "What do you want to look at:");
            const res = await tty_select_menu(win, PICK_ONE);
            if (res.n > 0)
                i = res.selected[0].item;
            await tty_destroy_nhwindow(win);
        }

        /* dowhatiscmd: */
        switch (i) {
        default:
        case 'q':
            return ECMD_OK;
        case 'y':
        case '/':
            from_screen = true;
            cc.x = game.u.ux;
            cc.y = game.u.uy;
            break;
        case 'i':
            throw new Error("do_look(): something you're carrying (checkfile()) not ported yet");
        case '?':
            throw new Error('do_look(): something else by symbol or name not ported yet');
        case 'm':
        case 'M':
        case 'o':
        case 'O':
            throw new Error('do_look(): look_all() not ported yet');
        case 't':
        case 'T':
            throw new Error('do_look(): look_traps() not ported yet');
        case 'e':
        case 'E':
            throw new Error('do_look(): look_engrs() not ported yet');
        }
    } else { /* clicklook */
        cc.x = click_cc.x;
        cc.y = click_cc.y;
        from_screen = false;
    }

    /* Save the verbose flag, we change it later. */
    const save_verbose = flags.verbose;
    flags.verbose = flags.verbose && !quick;
    /*
     * The user typed one letter, or we're identifying from the screen.
     */
    try {
        do {
            if (from_screen || clicklook) {
                if (from_screen) {
                    if (flags.verbose)
                        await pline(`Please move the cursor to ${what_is_a_location}.`);
                    else
                        await pline(`Pick ${what_is_a_location}.`);

                    ans = await getpos(cc, quick, what_is_a_location);
                    if (ans < 0 || cc.x < 0)
                        break; /* done */
                    flags.verbose = false; /* only print long question once */
                }
            }

            ({ found } = do_screen_description(cc));

            /* Finally, print out our explanation. */
            if (found) {
                /* use putmixed() because there may be an encoded glyph
                   present; then maybe checkfile() for more info */
                throw new Error('do_look(): describing a picked spot (putmixed(), checkfile()) not ported yet');
            } else {
                await pline("I've never heard of such things.");
            }
        } while (from_screen && !quick && ans !== LOOK_ONCE && !clicklook);
    } finally {
        flags.verbose = save_verbose;
    }
    return ECMD_OK;
}

// C ref: pager.c dowhatis() -- the #whatis command
export async function dowhatis() {
    return await do_look(0, null);
}

// C ref: pager.c dowhatdoes_core() -- the description of a key, from the
// command table (C's cmdhelp-file lookup is #if 0)
export function dowhatdoes_core(q) {
    let ec_desc;

    if ((ec_desc = key2extcmddesc(q)) !== null) {
        /* note: if "%-8s" gets changed, the "%8.8s" in dowhatdoes() will
           need a comparable change */
        return `${key2txt(q).padEnd(8)}${ec_desc}.`;
    }
    return null;
}

// C ref: pager.c dowhatdoes() -- the whatdoes command
export async function dowhatdoes() {
    let q, reslt;

    if (!game.whatdoes_once) { /* static boolean once */
        await pline(`Ask about '&' or '?' to get more info.${game.iflags.altmeta ? "  (For ESC, type it twice.)" : ""}`);
        game.whatdoes_once = true;
    }
    /* introff(): disables ^C but not ^\ */
    q = (await tty_yn_function("What command?", null, '\0')).charCodeAt(0);
    if (q === 0x1b && game.iflags.altmeta) {
        /* in an ideal world, we would know whether another keystroke
           was already pending, but this is not an ideal world...
           if user typed ESC, we'll essentially hang until another
           character is typed */
        q = (await tty_yn_function("]", null, '\0')).charCodeAt(0);
        if (q !== 0x1b)
            q = (q | 0o200) & 0xff;
    }
    /* intron(): reenables ^C */
    reslt = dowhatdoes_core(q);
    if (reslt) {
        const p = reslt.indexOf('\n'); /* 'm' prefix has two lines of output */

        if (q === 0x26 || q === 0x3f) /* '&' or '?' */
            throw new Error('dowhatdoes(): whatdoes_help() (keyhelp file) not ported yet');
        if (p < 0) {
            /* normal usage; 'reslt' starts with key, some indentation, and
               then explanation followed by '.' for sentence punctuation */
            await pline(reslt);
        } else {
            /* for 'm' prefix, where 'reslt' has an embedded newline to
               indicate and separate two lines of output; we add a comma to
               first line so that the combination is a complete sentence */
            await pline(`${reslt.slice(0, p)},`);
            /* cheat by knowing how dowhatdoes_core() handles key portion */
            await pline(`${reslt.slice(0, 8).padStart(8)}${reslt.slice(p + 1)}`);
        }
    } else {
        const oct = q.toString(8).padStart(3, '0'), hex = q.toString(16).padStart(2, '0');
        await pline(`No such command '${visctrl(q)}', char code ${q} (0${oct} or 0x${hex}).`);
    }
    return ECMD_OK;
}

// C ref: pager.c hmenu_dowhatis()
async function hmenu_dowhatis() {
    await dowhatis();
}

import { trap_predicament } from './insight.js';
import { y_monnam as y_monnam_pg } from './do_name.js';
import { visible_region_at as visible_region_at_pg } from './region.js';
import { ansimpleoname as ansimpleoname_pg } from './iactions.js';
