// engrave.js — engravings.
// C ref: engrave.c — rubouts[], wipeout_text, engr_at, wipe_engr_at,
// make_engr_at, del_engr.
//
// The level's engraving list (C's head_engr) is game.level.head_engr.
// Engraving text is kept as JS strings; C's in-place char edits are done
// on a character array.
//
// Also random_engraving, make_grave, del_engr_at (text files: js/rumors.js).
// Not ported yet: the player-side engrave commands, reading and sensing
// engravings.

import { game } from './gstate.js';
import { rn2, rnd, rn2_fnptr } from './rng.js';
import { DUST, BURN, ENGR_BLOOD, HEADSTONE, N_ENGRAVE, ICE, ROOM, GRAVE } from './const.js';
import { getrumor, get_rnd_text, ENGRAVEFILE, EPITAPHFILE, MD_PAD_RUMORS } from './rumors.js';
import { t_at, is_pit, is_hole } from './trap.js';
import { LEVITATION, FLYING, TT_PIT, Is_airlevel, Is_waterlevel } from './const.js';
import { ENGRAVE, MARK, BLINDED, IS_AIR, IS_POOL, LAVAPOOL, DRAWBRIDGE_DOWN,
         IS_ALTAR, IS_GRAVE, IS_FOUNTAIN, STAIRS, LADDER, IS_WALL, SDOOR,
         IS_DOOR, IS_ROOM } from './const.js';
import { pline } from './display.js';
import { nomul } from './hack.js';
import { AD_STCK, AD_WRAP, AT_ENGL, AT_HUGS, M1_HIDE, M1_CLING, S_MIMIC,
         MZ_HUGE } from './monsters.js';
import { dmgtype, is_flyer } from './mondata.js';
import { set_levltyp } from './mkmaze.js';
import { sanitize_name } from './bones.js';
import { exercise } from './attrib.js';
import { A_WIS, P_DAGGER, P_SABER, CONFUSION, STUNNED, DEAF, DRAWBRIDGE_UP,
         CLOUD, ACCESSIBLE, Never_mind, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_PROMPT, ECMD_OK, ECMD_FAIL, ECMD_TIME, ECMD_CANCEL,
         FINGERTIP, HAND, NO_MM_FLAGS, COLNO, ROWNO } from './const.js';
import { mons, M1_ANIMAL, M1_NOHANDS, S_VORTEX, PM_AIR_ELEMENTAL, MZ_SMALL,
         PM_GHOUL } from './monsters.js';
import { objects, WEAPON_CLASS, ARMOR_CLASS, WAND_CLASS, GEM_CLASS, RING_CLASS,
         TOOL_CLASS, AMULET_CLASS, CHAIN_CLASS, POTION_CLASS, COIN_CLASS,
         BALL_CLASS, ROCK_CLASS, FOOD_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         RANDOM_CLASS, VENOM_CLASS, ILLOBJ_CLASS, ARM_BOOTS, TOWEL,
         MAGIC_MARKER, ATHAME, WAN_LIGHT, WAN_SECRET_DOOR_DETECTION,
         WAN_STASIS, WAN_CREATE_MONSTER, WAN_WISHING, WAN_ENLIGHTENMENT,
         WAN_STRIKING, WAN_SLOW_MONSTER, WAN_SPEED_MONSTER, WAN_POLYMORPH,
         WAN_NOTHING, WAN_UNDEAD_TURNING, WAN_OPENING, WAN_LOCKING,
         WAN_PROBING, WAN_MAGIC_MISSILE, WAN_SLEEP, WAN_DEATH, WAN_COLD,
         WAN_CANCELLATION, WAN_MAKE_INVISIBLE, WAN_TELEPORTATION, WAN_DIGGING,
         WAN_FIRE, WAN_LIGHTNING } from './objects.js';
import { db_under_typ, You, You_cant, Your, pline_The, There, Blind,
         Hallucination, newsym } from './display.js';
import { ceiling } from './dungeon.js';
import { surface } from './iactions.js';
import { is_lava, is_pool, goodpos, makemon } from './makemon.js';
import { check_capacity } from './hack.js';
import { is_demon, is_vampire, resists_blnd } from './mondata.js';
import { is_ice } from './dig.js';
import { zapnodir, zappable, check_unpaid, learnwand } from './zap.js';
import { welded, is_wet_towel, freehand } from './wield.js';
import { xname, Yname2, Yobjnam2, yname, doname, The, Tobjnam,
         otense } from './objnam.js';
import { getobj, hands_obj, useup, prinv } from './invent.js';
import { body_part } from './insight.js';
import { mon_nam } from './do_name.js';
import { more_experienced } from './exper.js';
import { tty_yn_function, tty_getlin } from './wintty.js';
import { mungspaces } from './hacklib.js';
import { set_occupation } from './allmain.js';
import { make_blinded } from './potion.js';
import { splitobj, obj_extract_self } from './mkobj.js';
import { hold_another_object } from './wizcmds.js';
import { rn1 } from './rng.js';
import { ART_FIRE_BRAND } from './artilist.js';

/* C ref: potion.c vision_clears[] */
const vision_clears = "vision quickly clears.";

const BUFSZ = 256;

// C ref: engrave.c rubouts[]
/* Partial rubouts for engraving characters. -3. */
const rubouts = [
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
];

/* C ref: dungeon.c surface() -- the ordinary terrain cases; engulfers,
   air, water, lava and drawbridges aren't reached by read_engr_at() yet */
function engr_surface(x, y) {
    const lev = game.level.at(x, y);
    const levtyp = lev.typ;

    if ((x === game.u.ux && y === game.u.uy && game.u.uswallow)
        || IS_AIR(levtyp) || IS_POOL(levtyp) || levtyp === LAVAPOOL
        || levtyp === DRAWBRIDGE_DOWN)
        throw new Error('surface(): engulfer/air/water/lava/bridge not ported yet');
    else if (levtyp === ICE)
        return "ice";
    else if (IS_ALTAR(levtyp))
        return "altar";
    else if (IS_GRAVE(levtyp))
        return "headstone";
    else if (IS_FOUNTAIN(levtyp))
        return "fountain";
    else if (levtyp === STAIRS || levtyp === LADDER) /* On_stairs() */
        return "stairs";
    else if (IS_WALL(levtyp) || levtyp === SDOOR)
        return "wall"; /* 'surface' during Passes_walls */
    else if (IS_DOOR(levtyp))
        return "doorway"; /* even for closed door */
    else if (IS_ROOM(levtyp) /* && !Is_earthlevel(&u.uz) */)
        return "floor";
    else
        return "ground";
}

// C ref: engrave.c read_engr_at()
export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    let sensed = 0;
    const bl = game.u.uprops[BLINDED];
    const Blind = !!((bl.intrinsic || bl.extrinsic) && !bl.blocked);

    /* Sensing an engraving does not require sight for some engraving types,
     * nor does it necessarily imply comprehension (literacy).
     */
    if (ep && ep.engr_txt.actual_text && ep.engr_txt.actual_text[0]) {
        const eloc = engr_surface(x, y);
        switch (ep.engr_type) {
        case DUST:
            if (!Blind) {
                sensed = 1;
                await pline(`Something is written here in the ${
                    game.level.at(x, y).typ === ICE ? "frost" : "dust"}.`);
            }
            break;
        case ENGRAVE:
        case HEADSTONE:
            if (!Blind || can_reach_floor(true)) {
                sensed = 1;
                await pline(`Something is engraved here on the ${eloc}.`);
            }
            break;
        case BURN:
            if (!Blind || can_reach_floor(true)) {
                sensed = 1;
                await pline(`Some text has been ${
                    game.level.at(x, y).typ === ICE ? "melted" : "burned"} into the ${eloc} here.`);
            }
            break;
        case MARK:
            if (!Blind) {
                sensed = 1;
                await pline(`There's some graffiti on the ${eloc} here.`);
            }
            break;
        case ENGR_BLOOD:
            /* "It's a message!  Scrawled in blood!"
             * "What's it say?"
             * "It says... `See you next Wednesday.'" -- Thriller
             */
            if (!Blind) {
                sensed = 1;
                await pline("You see a message scrawled in blood here.");
            }
            break;
        default:
            throw new Error('read_engr_at(): a very strange engraving type');
        }

        if (sensed) {
            const maxelen = BUFSZ - "You feel the words: \"\".".length - 1;
            let et = ep.engr_txt.actual_text;
            let elen = et.length;
            /* offset of actual_text within the engraving's text space is 0 */
            const off = 0;

            if (elen > maxelen) {
                et = et.slice(0, maxelen);
                elen = maxelen;
            }
            let endpunct = "";
            const pristine = ep.engr_txt.pristine_text || '';
            if (elen < 2
                /* only skip if punctuation is original, not degraded char */
                || !((pristine[off + elen - 1] === et[elen - 1])
                     && ".!?".includes(et[elen - 1]))) {
                endpunct = ".";
            }
            await pline(`You ${Blind ? "feel the words" : "read"}: "${et}"${endpunct}`);
            ep.engr_txt.remembered_text = ep.engr_txt.actual_text;
            ep.eread = 1;
            ep.erevealed = 1;
            if (game.context.run > 0)
                nomul(0);
        }
    }
}

// C ref: engrave.c wipeout_text()
/* degrade some of the characters in a string; returns the new string */
export function wipeout_text(engr, cnt, seed) {
    const s = engr.split('');
    let i, j, nxt, use_rubout;
    let lth = s.length;

    if (lth && cnt > 0) {
        while (cnt--) {
            /* pick next character */
            if (!seed) {
                /* random */
                nxt = rn2(lth);
                use_rubout = rn2(4);
            } else {
                /* predictable; caller can reproduce the same sequence by
                   supplying the same arguments later, or a pseudo-random
                   sequence by varying any of them */
                nxt = seed % lth;
                seed *= 31, seed %= (BUFSZ - 1);
                use_rubout = seed & 3;
            }
            if (s[nxt] === ' ')
                continue;

            /* rub out unreadable & small punctuation marks */
            if ("?.,'`-|_".includes(s[nxt])) {
                s[nxt] = ' ';
                continue;
            }

            if (!use_rubout) {
                i = rubouts.length;
            } else {
                for (i = 0; i < rubouts.length; i++)
                    if (s[nxt] === rubouts[i][0]) {
                        const ln = rubouts[i][1].length;
                        /*
                         * Pick one of the substitutes at random.
                         */
                        if (!seed) {
                            j = rn2(ln);
                        } else {
                            seed *= 31, seed %= (BUFSZ - 1);
                            j = seed % ln;
                        }
                        s[nxt] = rubouts[i][1][j];
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i === rubouts.length)
                s[nxt] = '?';
        }
    }

    /* trim trailing spaces */
    while (lth && s[lth - 1] === ' ')
        s.length = --lth;
    return s.join('');
}

// C ref: engrave.c engr_at()
export function engr_at(x, y) {
    let ep = game.level.head_engr || null;

    while (ep) {
        if (x === ep.engr_x && y === ep.engr_y)
            return ep;
        ep = ep.nxt_engr;
    }
    return null;
}

// C ref: engrave.c wipe_engr_at()
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = engr_at(x, y);

    /* Headstones and some specially marked engravings are indelible */
    if (ep && ep.engr_type !== HEADSTONE && !ep.nowipeout) {
        /* debugpline1("asked to erode %d characters", cnt); */
        const loc = game.level.at(x, y);
        if (ep.engr_type !== BURN || loc.typ === ICE /* is_ice() */
            || (magical && !rn2(2))) {
            if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
                cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
                /* debugpline1("actually eroding %d characters", cnt); */
            }
            ep.engr_txt.actual_text = wipeout_text(ep.engr_txt.actual_text, cnt, 0);
            while (ep.engr_txt.actual_text[0] === ' ')
                ep.engr_txt.actual_text = ep.engr_txt.actual_text.slice(1);
            if (!ep.engr_txt.actual_text.length)
                del_engr(ep);
        }
    }
}

// C ref: engrave.c make_engr_at()
export function make_engr_at(x, y, s, pristine_s, e_time, e_type) {
    let ep;

    if ((ep = engr_at(x, y)) !== null)
        del_engr(ep);

    ep = {
        nxt_engr: game.level.head_engr || null,
        engr_x: x,
        engr_y: y,
        engr_txt: { actual_text: s, remembered_text: s, pristine_text: s },
    };
    game.level.head_engr = ep;
    if (pristine_s !== null && pristine_s !== undefined)
        ep.engr_txt.pristine_text = pristine_s;
    if (s === 'Elbereth') {
        /* engraving "Elbereth":  if done when making a level, it creates
           an old-style Elbereth that deters monsters when any objects are
           present; otherwise (done by the player), exercises wisdom */
        if (game.in_mklev)
            ep.guardobjects = 1;
        else
            exercise(A_WIS, true);
    }
    ep.engr_time = e_time;
    ep.engr_type = (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1);
    /* we do not set ep->eread or ep->erevealed;
     * the caller will need to if required */
    return ep;
}

// C ref: engrave.c del_engr()
/* delete any engraving at location <x,y> */
export function del_engr(ep) {
    if (ep === game.level.head_engr) {
        game.level.head_engr = ep.nxt_engr;
    } else {
        let ept;

        for (ept = game.level.head_engr; ept; ept = ept.nxt_engr)
            if (ept.nxt_engr === ep) {
                ept.nxt_engr = ep.nxt_engr;
                break;
            }
        if (!ept) {
            console.error('impossible: Error in del_engr?');
            return;
        }
    }
    /* dealloc_engr(ep) */
}

// C ref: engrave.c del_engr_at()
export function del_engr_at(x, y) {
    const ep = engr_at(x, y);

    if (ep)
        del_engr(ep);
}

// C ref: engrave.c random_engraving()
/* pick a random engraving; pristine_copy.s receives the undegraded text */
export function random_engraving(pristine_copy) {
    let rumor;

    /* a random engraving may come from the "rumors" file,
       or from the "engrave" file (formerly in an array here) */
    if (!rn2(4) || !(rumor = getrumor(0, pristine_copy, true)) || !rumor)
        get_rnd_text(ENGRAVEFILE, pristine_copy, rn2_fnptr, MD_PAD_RUMORS);

    let outbuf = pristine_copy.s;
    outbuf = wipeout_text(outbuf, Math.trunc(outbuf.length / 4), 0);
    return outbuf;
}

// C ref: engrave.c sanitize_engravings()
export function sanitize_engravings() {
    for (let ep = game.level.head_engr; ep; ep = ep.nxt_engr) {
        ep.engr_txt.actual_text = sanitize_name(ep.engr_txt.actual_text);
    }
}

// C ref: engrave.c forget_engravings()
export function forget_engravings() {
    for (let ep = game.level.head_engr; ep; ep = ep.nxt_engr) {
        ep.erevealed = ep.eread = 0;

        /* Note: engr_txt[actual_text], engr_txt[rememberd_text], and
         * engr_txt[pristine_text] retain their original text rather
         * than get updated to reflect each engraving's current text.
         * Does it matter? */
    }
}

// C ref: engrave.c make_grave()
export function make_grave(x, y, str) {
    const buf = { s: '' };
    const lev = game.level.at(x, y);

    /* Can we put a grave here? */
    if ((lev.typ !== ROOM && lev.typ !== GRAVE) || t_at(x, y))
        return;
    /* Make the grave */
    if (!set_levltyp(x, y, GRAVE))
        return;
    /* Engrave the headstone */
    del_engr_at(x, y);
    if (!str)
        str = get_rnd_text(EPITAPHFILE, buf, rn2_fnptr, MD_PAD_RUMORS);
    make_engr_at(x, y, str, null, 0, HEADSTONE);
    return;
}

/* C ref: mondata.c attacktype(); mondata.h sticks(), is_hider(),
   is_clinger(), ceiling_hider() */
function attacktype(ptr, atyp) {
    for (let i = 0; i < ptr.mattk.length; i++)
        if (ptr.mattk[i].aatyp === atyp) return true;
    return false;
}
export function sticks(ptr) {
    return dmgtype(ptr, AD_STCK)
           || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL))
           || attacktype(ptr, AT_HUGS);
}
export function ceiling_hider(ptr) {
    return (ptr.mflags1 & M1_HIDE) !== 0
           && ((((ptr.mflags1 & M1_CLING) !== 0) && ptr.mlet !== S_MIMIC)
               || is_flyer(ptr)); /* lurker above */
}

// C ref: trap.c uteetering_at_seen_pit()
export function uteetering_at_seen_pit(trap) {
    const u = game.u;
    return (trap && is_pit(trap.ttyp) && trap.tseen
            && u.ux === trap.tx && u.uy === trap.ty
            && !(u.utrap && u.utraptype === TT_PIT));
}

// C ref: trap.c uescaped_shaft()
export function uescaped_shaft(trap) {
    const u = game.u;
    return (trap && is_hole(trap.ttyp) && trap.tseen
            && u.ux === trap.tx && u.uy === trap.ty);
}

// C ref: engrave.c can_reach_floor()
/* can hero reach the floor? */
export function can_reach_floor(check_pit) {
    const g = game;
    const u = g.u;
    let t;
    /* C ref: youprop.h Levitation, Flying (BFlying: not ported yet) */
    const lev = u.uprops[LEVITATION];
    const Levitation = (lev.intrinsic || lev.extrinsic) && !lev.blocked;
    const Flying = u.uprops[FLYING].intrinsic || u.uprops[FLYING].extrinsic;

    if (u.uswallow
        || (u.ustuck && !sticks(g.youmonst.data)
            /* assume that arms are pinned rather than that the hero
               has been lifted up above the floor */
            && attacktype(u.ustuck.data, AT_HUGS))
        || (Levitation && !(Is_airlevel(u.uz) || Is_waterlevel(u.uz))))
        return false;
    /* Restricted/unskilled riders can't reach the floor */
    if (u.usteed) {
        /* P_SKILL(P_RIDING) < P_BASIC: weapon skills aren't ported yet */
        throw new Error('can_reach_floor(): P_SKILL() not ported yet');
    }
    if (u.uundetected && ceiling_hider(g.youmonst.data))
        return false;

    if (Flying || g.youmonst.data.msize >= MZ_HUGE)
        return true;

    if (check_pit && (t = t_at(u.ux, u.uy)) != null
        && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))
        return false;

    return true;
}

// C ref: engrave.c u_wipe_engr()
export function u_wipe_engr(cnt) {
    if (can_reach_floor(true))
        wipe_engr_at(game.u.ux, game.u.uy, cnt, false);
}

/* C ref: mondata.h is_animal(), is_whirly(), cantwield() */
function is_animal(ptr) { return (ptr.mflags1 & M1_ANIMAL) !== 0; }
function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}
function cantwield(ptr) {
    return ((ptr.mflags1 & M1_NOHANDS) !== 0) || ptr.msize < MZ_SMALL;
}
/* C ref: obj.h is_blade(); objclass.h is_boots(); artifact.h is_art() */
function is_blade(otmp) {
    return otmp.oclass === WEAPON_CLASS
           && objects[otmp.otyp].oc_skill >= P_DAGGER
           && objects[otmp.otyp].oc_skill <= P_SABER;
}
function is_boots(otmp) {
    return otmp.oclass === ARMOR_CLASS
           && objects[otmp.otyp].oc_armcat === ARM_BOOTS;
}
function is_art(o, art) { return !!(o && o.oartifact === art); }
/* C ref: youprop.h Confusion, Stunned, Deaf */
function uprop(p) {
    return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
}
function Confusion() { return !!(uprop(CONFUSION).intrinsic || uprop(CONFUSION).extrinsic); }
function Stunned() { return !!(uprop(STUNNED).intrinsic || uprop(STUNNED).extrinsic); }
function Deaf() {
    return !!(uprop(DEAF).intrinsic || uprop(DEAF).extrinsic
              || game.u.uroleplay?.deaf);
}
/* C ref: rm.h SURFACE_AT() */
function SURFACE_AT(x, y) {
    const lev = game.level.at(x, y);
    return (lev.typ === DRAWBRIDGE_UP) ? db_under_typ(lev.drawbridgemask || 0)
                                       : lev.typ;
}
const WAND_BACKFIRE_CHANCE = 100;

// C ref: engrave.c cant_reach_floor()
/* give a message after caller has determined that hero can't reach */
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    await pline(`${wand_engraving
                   ? "The wand does nothing more, and the tip of the wand"
                   : "You"} can't reach the ${
                up ? ceiling(x, y)
                   : (check_pit && can_reach_floor(false)) ? "bottom of the pit"
                                                           : surface(x, y)}.`);
}

// C ref: engrave.c stylus_ok()
/* getobj callback for an object to engrave with */
function stylus_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;

    /* Potential extension: exclude weapons that don't make any sense (such as
     * bullwhips) and downplay rings and gems that wouldn't be good to write
     * with (such as glass and non-gem rings) */
    if (obj.oclass === WEAPON_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === GEM_CLASS || obj.oclass === RING_CLASS)
        return GETOBJ_SUGGEST;

    /* Only markers and towels are recommended tools. */
    if (obj.oclass === TOOL_CLASS
        && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER))
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

// C ref: engrave.c u_can_engrave()
/* can hero engrave at all (at their location)? */
async function u_can_engrave() {
    const u = game.u;
    const levtyp = SURFACE_AT(u.ux, u.uy);

    if (u.uswallow) {
        if (is_animal(u.ustuck.data)) {
            await pline("What would you write?  \"Jonah was here\"?");
            return false;
        } else if (is_whirly(u.ustuck.data)) {
            await cant_reach_floor(u.ux, u.uy, false, false, false);
            return false;
        }
        /* Note: for amorphous engulfers, writing attempt is allowed here
           but yields the 'jello' result in doengrave() */
    } else if (is_lava(u.ux, u.uy)) {
        await You_cant(`write on the ${surface(u.ux, u.uy)}!`);
        return false;
    } else if (is_pool(u.ux, u.uy) || IS_FOUNTAIN(levtyp)) {
        await You_cant(`write on the ${surface(u.ux, u.uy)}!`);
        return false;
    } else if (IS_AIR(levtyp)) {
        /* airlevel or inside bubble on waterlevel */
        await You_cant(`write in ${(levtyp === CLOUD) ? "cloud vapor"
                                                      : "thin air"}!`);
        return false;
    } else if (!ACCESSIBLE(levtyp)) {
        /* stone, tree, wall, secret corridor, pool, lava, bars */
        await You_cant("write here.");
        return false;
    }

    if (cantwield(game.youmonst.data)) {
        await You_cant("even hold anything!");
        return false;
    }
    if (await check_capacity(null))
        return false;
    return true;
}

// C ref: engrave.c doengrave_ctx_init()
/* initialize the doengrave data */
function doengrave_ctx_init(de) {
    const u = game.u;

    de.dengr = false;
    de.doblind = false;
    de.doknown = false;
    de.eow = false;
    de.ptext = true;
    de.teleengr = false;
    de.zapwand = false;
    de.disprefresh = false;
    de.adding = false;

    de.ret = ECMD_OK;
    de.type = DUST;
    de.oetype = 0;

    de.otmp = null;
    de.oep = engr_at(u.ux, u.uy);

    de.buf = '';
    de.ebuf = '';
    de.fbuf = '';
    de.qbuf = '';
    de.post_engr_text = '';
    de.writer = null;

    if (de.oep)
        de.oetype = de.oep.engr_type;
    if (is_demon(game.youmonst.data) || is_vampire(game.youmonst.data))
        de.type = ENGR_BLOOD;

    de.jello = !!(u.uswallow && !(is_animal(u.ustuck.data)
                                  || is_whirly(u.ustuck.data)));
    de.frosted = is_ice(u.ux, u.uy);
}

// C ref: engrave.c doengrave_sfx_item_WAN()
/* special engraving effects for WAND objects */
async function doengrave_sfx_item_WAN(de) {
    const u = game.u;

    switch (de.otmp.otyp) {
        /* DUST wands */
    default:
        break;
        /* NODIR wands */
    case WAN_LIGHT:
    case WAN_SECRET_DOOR_DETECTION:
    case WAN_STASIS:
    case WAN_CREATE_MONSTER:
    case WAN_WISHING:
    case WAN_ENLIGHTENMENT:
        await zapnodir(de.otmp);
        break;
        /* IMMEDIATE wands */
        /* If wand is "IMMEDIATE", remember to affect the
         * previous engraving even if turning to dust.
         */
    case WAN_STRIKING:
        de.post_engr_text =
            "The wand unsuccessfully fights your attempt to write!";
        break;
    case WAN_SLOW_MONSTER:
        if (!Blind()) {
            de.post_engr_text = `The bugs on the ${
                surface(u.ux, u.uy)} slow down!`;
        }
        break;
    case WAN_SPEED_MONSTER:
        if (!Blind()) {
            de.post_engr_text = `The bugs on the ${
                surface(u.ux, u.uy)} speed up!`;
        }
        break;
    case WAN_POLYMORPH:
        if (de.oep) {
            if (!Blind()) {
                const pristine = { s: '' };

                de.type = 0; /* random */
                de.buf = random_engraving(pristine);
                de.ebuf = pristine.s;
            } else {
                /* keep the same type so that feels don't
                   change and only the text is altered,
                   but you won't know anyway because
                   you're a _blind writer_ */
                if (de.oetype)
                    de.type = de.oetype;
                throw new Error('doengrave_sfx_item_WAN(): xcrypt(blengr()) not ported yet');
            }
            de.dengr = true;
        }
        break;
    case WAN_NOTHING:
    case WAN_UNDEAD_TURNING:
    case WAN_OPENING:
    case WAN_LOCKING:
    case WAN_PROBING:
        break;
        /* RAY wands */
    case WAN_MAGIC_MISSILE:
        de.ptext = true;
        if (!Blind()) {
            de.post_engr_text = `The ${
                surface(u.ux, u.uy)} is riddled by bullet holes!`;
        }
        break;
        /* can't tell sleep from death - Eric Backus */
    case WAN_SLEEP:
    case WAN_DEATH:
        if (!Blind()) {
            de.post_engr_text = `The bugs on the ${
                surface(u.ux, u.uy)} stop moving!`;
        }
        break;
    case WAN_COLD:
        if (!Blind())
            de.post_engr_text = "A few ice cubes drop from the wand.";
        if (!de.oep || (de.oep.engr_type !== BURN))
            break;
        /*FALLTHRU*/
    // eslint-disable-next-line no-fallthrough
    case WAN_CANCELLATION:
    case WAN_MAKE_INVISIBLE:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind())
                await pline_The(`engraving on the ${
                    surface(u.ux, u.uy)} vanishes!`);
            de.dengr = true;
        }
        break;
    case WAN_TELEPORTATION:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind())
                await pline_The(`engraving on the ${
                    surface(u.ux, u.uy)} vanishes!`);
            de.teleengr = true;
        }
        break;
        /* type = ENGRAVE wands */
    case WAN_DIGGING:
        de.ptext = true;
        de.type = ENGRAVE;
        if (!objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of digging!`);
            de.doknown = true;
        }
        de.post_engr_text =
            (Blind() && !Deaf())
            ? "You hear drilling!"    /* Deaf-aware */
            : Blind()
               ? "You feel tremors."
               : IS_GRAVE(game.level.at(u.ux, u.uy).typ)
                  ? "Chips fly out from the headstone."
                  : de.frosted
                     ? "Ice chips fly up from the ice surface!"
                     : (game.level.at(u.ux, u.uy).typ === DRAWBRIDGE_DOWN)
                        ? "Splinters fly up from the bridge."
                        : "Gravel flies up from the floor.";
        break;
        /* type = BURN wands */
    case WAN_FIRE:
        de.ptext = true;
        de.type = BURN;
        if (!objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of fire!`);
            de.doknown = true;
        }
        de.post_engr_text = Blind() ? "You feel the wand heat up."
                                    : "Flames fly from the wand.";
        break;
    case WAN_LIGHTNING:
        de.ptext = true;
        de.type = BURN;
        if (!objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of lightning!`);
            de.doknown = true;
        }
        if (!Blind()) {
            de.post_engr_text = "Lightning arcs from the wand.";
            de.doblind = true;
        } else {
            de.post_engr_text = !Deaf()
                ? "You hear crackling!"     /* Deaf-aware */
                : "Your hair stands up!";
        }
        break;
        /* type = MARK wands */
        /* type = ENGR_BLOOD wands */
    }
}

// C ref: engrave.c doengrave_sfx_item()
/* special engraving effects for all objects */
async function doengrave_sfx_item(de) {
    const u = game.u;

    switch (de.otmp.oclass) {
    default:
    case AMULET_CLASS:
    case CHAIN_CLASS:
    case POTION_CLASS:
    case COIN_CLASS:
        break;
    case RING_CLASS:
        /* "diamond" rings and others should work */
    // eslint-disable-next-line no-fallthrough
    case GEM_CLASS:
        /* diamonds & other hard gems should work */
        if (objects[de.otmp.otyp].oc_tough) {
            de.type = ENGRAVE;
            break;
        }
        break;
    case ARMOR_CLASS:
        if (is_boots(de.otmp)) {
            de.type = DUST;
            break;
        }
        /*FALLTHRU*/
    /* Objects too large to engrave with */
    // eslint-disable-next-line no-fallthrough
    case BALL_CLASS:
    case ROCK_CLASS:
        await You_cant("engrave with such a large object!");
        de.ptext = false;
        break;
    /* Objects too silly to engrave with */
    case FOOD_CLASS:
    case SCROLL_CLASS:
    case SPBOOK_CLASS:
        await pline(`${Yname2(de.otmp)} would get ${
            de.frosted ? "all frosty" : "too dirty"}.`);
        de.ptext = false;
        break;
    case RANDOM_CLASS: /* This should mean fingers */
        break;

    /* The charge is removed from the wand before prompting for
     * the engraving text, because all kinds of setup decisions
     * and pre-engraving messages are based upon knowing what type
     * of engraving the wand is going to do.  Also, the player
     * will have potentially seen "You wrest .." message, and
     * therefore will know they are using a charge.
     */
    case WAND_CLASS:
        if (await zappable(de.otmp)) {
            check_unpaid(de.otmp);
            if (de.otmp.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
                throw new Error('doengrave_sfx_item(): wand_explode() not ported yet');
            }
            de.zapwand = true;
            if (!can_reach_floor(true))
                de.ptext = false;
            await doengrave_sfx_item_WAN(de);
        } else { /* end if zappable */
            /* failing to wrest one last charge takes time */
            de.ptext = false; /* use "early exit" below, return 1 */
            /* give feedback here if we won't be getting the
               "can't reach floor" message below */
            if (can_reach_floor(true)) {
                /* cancelled wand turns to dust */
                if (de.otmp.spe < 0)
                    de.zapwand = true;
                /* empty wand just doesn't write */
                else
                    await pline_The("wand is too worn out to engrave.");
            }
        }
        break;

    case WEAPON_CLASS:
        if (is_art(de.otmp, ART_FIRE_BRAND)) {
            de.type = BURN; /* doesn't dull weapon */
        } else if (is_blade(de.otmp)) {
            /* if non-blade or welded or too dull, engraving type stays set
               to DUST; feedback for that is only given for bladed weapons */
            if (welded(de.otmp))
                await pline(`${Yname2(de.otmp)} can only scratch the ${
                    surface(u.ux, u.uy)}.`);
            else if (de.otmp.spe <= -3)
                await pline(`${Yobjnam2(de.otmp, "are")} too dull for engraving.`);
            else
                de.type = ENGRAVE;
        }
        break;

    case TOOL_CLASS:
        if (de.otmp === game.ublindf) {
            await pline(
                "That is a bit difficult to engrave with, don't you think?");
            de.ret = ECMD_FAIL;
            return false;
        }
        switch (de.otmp.otyp) {
        case MAGIC_MARKER:
            if (de.otmp.spe <= 0)
                await Your("marker has dried out.");
            else
                de.type = MARK;
            break;
        case TOWEL:
            /* Can't really engrave with a towel */
            de.ptext = false;
            if (de.oep) {
                if (de.oep.engr_type === DUST
                    || de.oep.engr_type === ENGR_BLOOD
                    || de.oep.engr_type === MARK) {
                    if (is_wet_towel(de.otmp))
                        throw new Error('doengrave_sfx_item(): dry_a_towel() not ported yet');
                    if (!Blind())
                        await You("wipe out the message here.");
                    else
                        await pline(`${Yobjnam2(de.otmp, "get")} ${
                            de.frosted ? "frosty" : "dusty"}.`);
                    de.dengr = true;
                } else {
                    await pline(`${Yname2(de.otmp)} can't wipe out this engraving.`);
                }
            } else {
                await pline(`${Yobjnam2(de.otmp, "get")} ${
                    de.frosted ? "frosty" : "dusty"}.`);
            }
            break;
        default:
            break;
        }
        break;

    case VENOM_CLASS:
        /* this used to be ``if (wizard)'' and fall through to ILLOBJ_CLASS
           for normal play, but splash of venom isn't "illegal" because it
           could occur in normal play via wizard mode bones */
        await pline("Writing a poison pen letter?");
        break;

    case ILLOBJ_CLASS:
        console.error("impossible: You're engraving with an illegal object!");
        break;
    }

    return true;
}

// C ref: engrave.c doengrave_ctx_verb()
/* which verb phrasing to use for engraving */
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? "add to the weird writing on"
                             : "write strangely on";
        break;
    case DUST:
        de.everb = de.adding ? "add to the writing in" : "write in";
        de.eloc = de.frosted ? "frost" : "dust";
        break;
    case HEADSTONE:
        de.everb = de.adding ? "add to the epitaph on" : "engrave on";
        break;
    case ENGRAVE:
        de.everb = de.adding ? "add to the engraving in" : "engrave in";
        break;
    case BURN:
        de.everb = de.adding ? (de.frosted ? "add to the text melted into"
                                           : "add to the text burned into")
                             : (de.frosted ? "melt into" : "burn into");
        break;
    case MARK:
        de.everb = de.adding ? "add to the graffiti on" : "scribble on";
        break;
    case ENGR_BLOOD:
        de.everb = de.adding ? "add to the scrawl on" : "scrawl on";
        break;
    }
}

// C ref: engrave.c doengrave()
/* the #engrave command */
export async function doengrave() {
    const u = game.u;
    let initial_msg_given = false;

    /* Can the adventurer engrave at all? */
    if (!await u_can_engrave())
        return ECMD_FAIL;

    const de = {};
    doengrave_ctx_init(de);

    game.multi = 0;          /* moves consumed */
    game.nomovemsg = null;   /* occupation end message */

    /* One may write with finger, or weapon, or wand, or..., or...
     * Edited by GAN 10/20/86 so as not to change weapon wielded.
     */

    doengr: {
        de.otmp = await getobj("write with", stylus_ok, GETOBJ_PROMPT);
        if (!de.otmp) { /* otmp == &hands_obj if fingers */
            de.ret = ECMD_CANCEL;
            break doengr;
        }

        if (de.otmp === hands_obj) {
            de.fbuf = `your ${body_part(FINGERTIP)}`;
            de.writer = de.fbuf;
        } else {
            de.writer = yname(de.otmp);
        }

        /* There's no reason you should be able to write with a wand
         * while both your hands are tied up.
         */
        if (!freehand() && de.otmp !== game.uwep && !de.otmp.owornmask) {
            await You(`have no free ${body_part(HAND)} to write with!`);
            break doengr;
        }

        if (de.jello) {
            await You(`tickle ${mon_nam(u.ustuck)} with ${de.writer}.`);
            await Your("message dissolves...");
            break doengr;
        }
        if (!can_reach_floor(true)) {
            if (de.otmp.oclass !== WAND_CLASS) {
                await cant_reach_floor(u.ux, u.uy, false, true, false);
                break doengr;
            } else {
                await You(`gesture, with your wand, towards the ${
                    surface(u.ux, u.uy)} below you.`);
                initial_msg_given = true;
            }
        }
        if (IS_ALTAR(game.level.at(u.ux, u.uy).typ)) {
            if (!initial_msg_given)
                await You(`make a motion towards the altar with ${de.writer}.`);
            throw new Error('doengrave(): altar_wrath() not ported yet');
        }
        if (IS_GRAVE(game.level.at(u.ux, u.uy).typ)) {
            if (de.otmp === hands_obj) { /* using only finger */
                await You(`would only make a small smudge on the ${
                    surface(u.ux, u.uy)}.`);
                break doengr;
            } else if (!game.level.at(u.ux, u.uy).disturbed) {
                /* disturb the grave: summon a ghoul, same as sometimes
                   happens when kicking; sets levl[ux][uy]->disturbed so
                   that it'll only happen once */
                await disturb_grave(u.ux, u.uy);
                break doengr;
            }
        }

        /* SPFX for items */
        if (!await doengrave_sfx_item(de))
            break doengr;

        if (IS_GRAVE(game.level.at(u.ux, u.uy).typ)) {
            if (de.type === ENGRAVE || de.type === 0) {
                de.type = HEADSTONE;
            } else {
                /* ensures the "cannot wipe out" case */
                de.type = DUST;
                de.dengr = false;
                de.teleengr = false;
                de.buf = '';
            }
        }

        /*
         * End of implement setup
         */

        /* Identify stylus */
        if (de.doknown) {
            learnwand(de.otmp);
            if (objects[de.otmp.otyp].oc_name_known)
                more_experienced(0, 10);
        }
        if (de.teleengr) {
            rloc_engr(de.oep);
            de.oep.eread = 0;
            de.oep.erevealed = 0;
            de.disprefresh = true;
            de.oep = null;
        }
        if (de.dengr) {
            del_engr(de.oep);
            de.oep = null;
            de.disprefresh = true;
        }
        /* Something has changed the engraving here */
        if (de.buf) {
            make_engr_at(u.ux, u.uy, de.buf, de.ebuf, game.moves, de.type);
            const tmp_ep = engr_at(u.ux, u.uy);
            if (!Blind()) {
                if (tmp_ep) {
                    await pline_The(`engraving now reads: "${de.buf}".`);
                    tmp_ep.eread = 1;
                    tmp_ep.erevealed = 1;
                    de.disprefresh = true;
                }
            }
            de.ptext = false;
        }
        if (de.zapwand && (de.otmp.spe < 0)) {
            await pline(`${The(xname(de.otmp))} ${
                Blind() ? "" : "glows violently, then "}turns to dust.`);
            if (!IS_GRAVE(game.level.at(u.ux, u.uy).typ))
                await You(`are not going to get anywhere trying to write in the ${
                    de.frosted ? "frost" : "dust"} with your dust.`);
            useup(de.otmp);
            de.otmp = null; /* wand is now gone */
            de.ptext = false;
        }
        /* Early exit for some implements. */
        if (!de.ptext) {
            if (de.otmp && de.otmp.oclass === WAND_CLASS
                && !can_reach_floor(true))
                await cant_reach_floor(u.ux, u.uy, false, true, true);
            de.ret = ECMD_TIME;
            break doengr;
        }
        /*
         * Special effects should have deleted the current engraving (if
         * possible) by now.
         */
        if (de.oep) {
            let c = 'n';

            /* Give player the choice to add to engraving. */
            if (de.type === HEADSTONE) {
                /* no choice, only append */
                c = 'y';
            } else if (de.type === de.oep.engr_type
                       && (!Blind() || de.oep.engr_type === BURN
                           || de.oep.engr_type === ENGRAVE)) {
                c = await tty_yn_function(
                    "Do you want to add to the current engraving?",
                    "ynq", 'y');
                if (c === 'q') {
                    await pline(Never_mind);
                    break doengr;
                }
            }

            if (c === 'n' || Blind()) {
                if (de.oep.engr_type === DUST
                    || de.oep.engr_type === ENGR_BLOOD
                    || de.oep.engr_type === MARK) {
                    if (!Blind()) {
                        await You(`wipe out the message that was ${
                            (de.oep.engr_type === DUST)
                                ? (de.frosted
                                    ? "written in the frost"
                                    : "written in the dust")
                                : (de.oep.engr_type === ENGR_BLOOD)
                                    ? "scrawled in blood"
                                    : "written"} here.`);
                        del_engr(de.oep);
                        de.oep = null;
                        de.disprefresh = true;
                    } else {
                        /* defer deletion until after we *know* we're engraving */
                        de.eow = true;
                    }
                } else if (de.type === DUST || de.type === MARK
                           || de.type === ENGR_BLOOD) {
                    await You(`cannot wipe out the message that is ${
                        (de.oep.engr_type === BURN)
                            ? (de.frosted ? "melted into" : "burned into")
                            : "engraved in"} the ${surface(u.ux, u.uy)} here.`);
                    de.ret = ECMD_TIME;
                    break doengr;
                } else if (de.type !== de.oep.engr_type || c === 'n') {
                    if (!Blind() || can_reach_floor(true))
                        await You("will overwrite the current message.");
                    de.eow = true;
                }
            } else if (de.oep
                       && de.oep.engr_txt.actual_text.length >= BUFSZ - 1) {
                await There("is no room to add anything else here.");
                de.ret = ECMD_TIME;
                break doengr;
            }
        }

        de.eloc = surface(u.ux, u.uy);
        de.adding = !!(de.oep && !de.eow);
        doengrave_ctx_verb(de);

        /* Tell adventurer what is going on */
        if (de.otmp !== hands_obj)
            await You(`${de.everb} the ${de.eloc} with ${
                /* since doname() yields "N items" when quantity is more than
                   one, match that by using "1 of" rather than "one of" when
                   informing the player that the stack will be split */
                (de.type === ENGRAVE && de.otmp.quan > 1) ? "1 of " : ""}${
                doname(de.otmp)}.`);
        else
            await You(`${de.everb} the ${de.eloc} with your ${
                body_part(FINGERTIP)}.`);

        /* Prompt for engraving! */
        de.qbuf = `What do you want to ${de.everb} the ${de.eloc} here?`;
        de.ebuf = (await tty_getlin(de.qbuf)) || '';
        /* convert tabs to spaces and condense consecutive spaces to one */
        de.ebuf = mungspaces(de.ebuf);

        /* Count the actual # of chars engraved not including spaces */
        de.len = de.ebuf.length;
        for (const ch of de.ebuf)
            if (ch === ' ')
                de.len -= 1;

        if (de.len === 0 || de.ebuf.includes('\x1b')) {
            if (de.zapwand) {
                if (!Blind())
                    await pline(`${Tobjnam(de.otmp, "glow")}, then ${
                        otense(de.otmp, "fade")}.`);
                de.ret = ECMD_TIME;
                break doengr;
            } else {
                await pline(Never_mind);
                break doengr;
            }
        }

        /* A single `x' is the traditional signature of an illiterate person */
        if (de.len !== 1 || (!de.ebuf.includes('x') && !de.ebuf.includes('X')))
            u.uconduct.literate = (u.uconduct.literate || 0) + 1;
            /* livelog_printf(LL_CONDUCT, "became literate ..."): no livelog */

        /* Mix up engraving if surface or state of mind is unsound.
           Note: this won't add or remove any spaces. */
        const sp = de.ebuf.split('');
        for (let i = 0; i < sp.length; i++) {
            if (sp[i] === ' ')
                continue;
            if (((de.type === DUST || de.type === ENGR_BLOOD) && !rn2(25))
                || (Blind() && !rn2(11)) || (Confusion() && !rn2(7))
                || (Stunned() && !rn2(4)) || (Hallucination() && !rn2(2)))
                sp[i] = String.fromCharCode(0x20 + rnd(96 - 2)); /* ASCII '!' thru '~'
                                                       (excludes ' ' and DEL) */
        }
        de.ebuf = sp.join('');

        /* Previous engraving is overwritten */
        if (de.eow) {
            del_engr(de.oep);
            de.oep = null;
            de.disprefresh = true;
        }

        if (!game.context.engraving)
            game.context.engraving = {};
        const eng = game.context.engraving;
        eng.text = de.ebuf.slice(0, BUFSZ - 1);
        eng.nextc = 0; /* index into eng.text */
        eng.stylus = de.otmp;
        eng.type = de.type;
        eng.pos = { x: u.ux, y: u.uy };
        eng.actionct = 0;
        set_occupation(engrave, "engraving", 0);

        if (de.post_engr_text)
            await pline(de.post_engr_text);
        if (de.doblind && !resists_blnd(game.youmonst)) {
            await You("are blinded by the flash!");
            await make_blinded(rnd(50), false);
            if (!Blind())
                await Your(vision_clears);
        }

        /* Engraving will always take at least one action via being run as an
           occupation, so do not count this setup as taking time. */
    }
    /* doengr_exit: */
    if (de.disprefresh)
        newsym(u.ux, u.uy);
    return de.ret;
}

// C ref: engrave.c engrave()
/* occupation callback for engraving some text */
async function engrave() {
    const u = game.u;
    const eng = game.context.engraving;
    let buf; /* holds the post-this-action engr text, including
              * anything already there */
    let finishverb; /* "You finish [foo]." */
    let stylus; /* shorthand for svc.context.engraving.stylus */
    const firsttime = (eng.actionct === 0);
    let rate = 10; /* # characters that can be engraved in this action */
    let truncate = false;
    const neweng = (eng.actionct === 0);

    const carving = (eng.type === ENGRAVE || eng.type === HEADSTONE);
    let endc; /* index of the character 1 beyond the last character to
               * engrave this action */
    let i;

    if (eng.pos.x !== u.ux || eng.pos.y !== u.uy) { /* teleported? */
        await You("are unable to continue engraving.");
        return 0;
    }
    /* Stylus might have been taken out of inventory and destroyed somehow.
     * Not safe to dereference stylus until after this. */
    if (eng.stylus === hands_obj) { /* bare finger */
        stylus = null;
    } else {
        for (stylus = game.invent; stylus; stylus = stylus.nobj) {
            if (stylus === eng.stylus)
                break;
        }
        if (!stylus) {
            await You("are unable to continue engraving.");
            return 0;
        }
    }

    const dulling_wep = !!(carving && stylus && stylus.oclass === WEAPON_CLASS
                           && (stylus.otyp !== ATHAME || stylus.cursed));
    const marker = !!(stylus && stylus.otyp === MAGIC_MARKER
                      && eng.type === MARK);

    eng.actionct++;

    /* sanity checks */
    if (dulling_wep && !is_blade(stylus)) {
        console.error("impossible: carving with non-bladed weapon");
    } else if (eng.type === MARK && !marker) {
        console.error("impossible: making graffiti with non-marker stylus");
    }

    /* Step 1: Compute rate. */
    if (carving && stylus
        && (dulling_wep || stylus.oclass === RING_CLASS
            || stylus.oclass === GEM_CLASS)) {
        /* slow engraving methods */
        rate = 1;
    } else if (marker) {
        /* one charge / 2 letters */
        rate = Math.min(rate, stylus.spe * 2);
    }

    /* Step 2: Compute last character that can be engraved this action. */
    i = rate;
    for (endc = eng.nextc; endc < eng.text.length && i > 0; endc++) {
        if (eng.text[endc] !== ' ') {
            i--;
        }
    }

    /* Step 3: affect stylus from engraving - it might wear out. */
    if (dulling_wep) {
        let splitstack = false, dulled = false;

        /* 'dulling_wep' guarantees that 'stylus' is a weapon which is
           not welded to the hero's hand(s) */
        if (stylus.quan > 1) {
            if (firsttime)
                await pline(`One of ${yname(stylus)} gets dull.`);
            stylus = eng.stylus = splitobj(stylus, 1);
            /* if stack is wielded or quivered, the split-off one isn't */
            stylus.owornmask = 0;
            splitstack = true;
        } else {
            /* normal case: stylus->quan==1 */
            if (firsttime)
                await pline(`${Yname2(stylus)} gets dull.`);
        }
        /* Dull the weapon at a rate of -1 enchantment per 2 characters,
         * rounding down. */
        if (eng.actionct % 2 === 1) { /* 1st,3rd,... action */
            /* deduct a point on 1st, 3rd, 5th, ... turns, unless this is the
             * last character being engraved (a rather convoluted way to round
             * down), but always deduct a point on the 1st turn to prevent
             * zero-cost engravings.
             * Check for truncation *before* deducting a point - otherwise,
             * attempting to e.g. engrave 3 characters with a -2 weapon will
             * stop at the 1st. */
            if (stylus.spe <= -3) {
                if (firsttime) {
                    console.error("impossible: <= -3 weapon valid for engraving");
                }
                truncate = true;
            } else if (endc < eng.text.length || eng.actionct === 1) {
                stylus.spe -= 1;
                dulled = true;
            }
        }
        if (splitstack) {
            obj_extract_self(stylus);
            stylus = await hold_another_object(stylus, "You drop one %s!",
                                               doname(stylus), null);
        } else if (dulled && stylus.known) {
            /* reflect change in stylus->spe; not needed for splitstack
               since hold_another_object() does this */
            await prinv(null, stylus, 1);
            /* update_inventory(): no perm_invent */
        }
    } else if (marker) {
        let ink_cost = Math.max(Math.trunc(rate / 2), 1); /* Prevent infinite graffiti */

        if (stylus.spe < ink_cost) {
            console.error("impossible: overly dry marker valid for graffiti?");
            ink_cost = stylus.spe;
            truncate = true;
        }
        stylus.spe -= ink_cost;
        /* update_inventory(): no perm_invent */
        if (stylus.spe === 0) {
            /* can't engrave any further; truncate the string */
            await Your("marker dries out.");
            truncate = true;
        }
    }

    switch (eng.type) {
    default:
        finishverb = "your weird engraving";
        break;
    case DUST:
        finishverb = is_ice(u.ux, u.uy) ? "writing in the frost"
                     : "writing in the dust";
        break;
    case HEADSTONE:
    case ENGRAVE:
        finishverb = "engraving";
        break;
    case BURN:
        finishverb = is_ice(u.ux, u.uy) ? "melting your message into the ice"
                     : "burning your message into the floor";
        break;
    case MARK:
        finishverb = "defacing the dungeon";
        break;
    case ENGR_BLOOD:
        finishverb = "scrawling";
    }

    /* actions that happen at the end of every engraving action go here */

    buf = '';
    let oep = engr_at(u.ux, u.uy);
    if (oep) /* add to existing engraving */
        buf = oep.engr_txt.actual_text;

    const space_left = BUFSZ - buf.length - 1;
    if (endc - eng.nextc > space_left) {
        await You("run out of room to write.");
        endc = eng.nextc + space_left;
        truncate = true;
    }

    /* If the stylus did wear out mid-engraving, truncate the input so that we
     * can't go any further. */
    if (truncate && endc < eng.text.length) {
        eng.text = eng.text.slice(0, endc);
        await You(`are only able to write "${eng.text}".`);
    } else {
        /* input was not truncated; stylus may still have worn out on the last
         * character, though */
        truncate = false;
    }

    buf += eng.text.slice(eng.nextc,
                          eng.nextc + Math.min(space_left, endc - eng.nextc));
    make_engr_at(u.ux, u.uy, buf, null, game.moves - game.multi, eng.type);
    oep = engr_at(u.ux, u.uy);
    if (oep) {
        oep.eread = 1;
        oep.erevealed = 1;
    }

    if (endc < eng.text.length) {
        eng.nextc = endc;
        if (neweng) {
            newsym(eng.pos.x, eng.pos.y);
        }
        return 1; /* not yet finished this turn */
    } else { /* finished engraving */
        /* actions that happen after the engraving is finished go here */

        if (truncate) {
            /* Now that "You are only able to write 'foo'" also prints at the
             * end of engraving, this might be redundant. */
            await You("cannot write any more.");
        } else if (!firsttime) {
            /* only print this if engraving took multiple actions */
            await You(`finish ${finishverb}.`);
        }
        eng.text = '';
        eng.nextc = null;
        eng.stylus = null;
    }
    if (neweng)
        newsym(eng.pos.x, eng.pos.y);
    return 0;
}

// C ref: engrave.c rloc_engr()
/* randomly relocate an engraving */
export function rloc_engr(ep) {
    let tx, ty, tryct = 200;

    do {
        if (--tryct < 0)
            return;
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
    } while (engr_at(tx, ty) || !goodpos(tx, ty, null, 0));

    ep.engr_x = tx;
    ep.engr_y = ty;
    newsym(tx, ty); /* caller took care of the old location */
}

// C ref: engrave.c disturb_grave()
/* called when kicking or engraving on a grave's headstone */
export async function disturb_grave(x, y) {
    const lev = game.level.at(x, y);

    if (!IS_GRAVE(lev.typ)) {
        console.error(`impossible: Disturbing grave that isn't a grave? (${lev.typ})`);
    } else if (lev.disturbed) {
        console.error("impossible: Disturbing already disturbed grave?");
    } else {
        await You("disturb the undead!");
        lev.disturbed = 1;
        makemon(mons[PM_GHOUL], x, y, NO_MM_FLAGS);
        exercise(A_WIS, false);
    }
}
