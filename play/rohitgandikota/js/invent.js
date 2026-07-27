// invent.js — inventory and the look-here command.
// C ref: src/invent.c

import { game } from './gstate.js';
import { pline_The } from './pline.js';
import { delobj } from './mon.js';
import { costly_spot } from './shk.js';
import { u_at , HANDS_SYM, silly_thing_to, W_ARMOR, W_ACCESSORY, W_SADDLE, W_WEAPONS } from './const.js';
import { hides_under } from './mondata.js';
import { Hallucination } from './youprop.js';
import { doname } from './objnam.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { MONSYMS, NUMMONS } from './monst_data.js';
import { erosion_matters, curse, splitobj } from './mkobj.js';
import {
    carried, OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, OBJ_MINVENT, Is_container, Is_candle, Is_pudding,
} from './obj.js';
import {
    hideunder } from './makemon.js';
import { is_rider } from './mondata.js';
import { ATR_NONE, ATR_INVERSE } from './tty/wintty.js';
import { nhgetch } from './input.js';
import { pline } from './display.js';
import { tty_yn_function } from './tty/topl.js';
import { You } from './pline.js';

// include/hack.h — command result flags. ECMD_TIME means the command consumed
// a move, which is what makes moveloop advance svm.moves.
export const ECMD_OK = 0;
export const ECMD_TIME = 1;

// src/invent.c:4104 look_here()
//
// Only the empty-square path is ported so far: with no objects, no dungeon
// feature and not blind, C prints "You see no objects here." and returns
// ECMD_OK — so looking does NOT consume a turn. Objects, dungeon features and
// engravings join this function as those subsystems land.
export async function look_here(obj_cnt, lhflags) {
    const Blind = !!game.u?.ublind;
    const verb = Blind ? 'feel' : 'see';

    /* no objects at the hero's square yet, because objects are not ported */
    await You(`${verb} no objects here.`);
    return Blind ? ECMD_TIME : ECMD_OK;
}

// src/invent.c:4319 dolook()
export async function dolook() {
    return await look_here(0, 0);
}


// ---------------------------------------------------------------------------
// Inventory display
// ---------------------------------------------------------------------------

// src/decl.c flags.inv_order — the default packorder.
function inv_order() {
    const O = OCLASSES;
    return [O.COIN_CLASS, O.AMULET_CLASS, O.WEAPON_CLASS, O.ARMOR_CLASS,
            O.FOOD_CLASS, O.SCROLL_CLASS, O.SPBOOK_CLASS, O.POTION_CLASS,
            O.RING_CLASS, O.WAND_CLASS, O.TOOL_CLASS, O.GEM_CLASS,
            O.ROCK_CLASS, O.BALL_CLASS, O.CHAIN_CLASS, O.VENOM_CLASS];
}

const CLASS_NAMES = {
    COIN_CLASS: 'Coins', AMULET_CLASS: 'Amulets', WEAPON_CLASS: 'Weapons',
    ARMOR_CLASS: 'Armor', FOOD_CLASS: 'Comestibles', SCROLL_CLASS: 'Scrolls',
    SPBOOK_CLASS: 'Spellbooks', POTION_CLASS: 'Potions', RING_CLASS: 'Rings',
    WAND_CLASS: 'Wands', TOOL_CLASS: 'Tools', GEM_CLASS: 'Gems or Stones',
    ROCK_CLASS: 'Boulders/Statues', BALL_CLASS: 'Iron Balls',
    CHAIN_CLASS: 'Chains', VENOM_CLASS: 'Venoms',
};
function let_to_name(oclass) {
    for (const [k, v] of Object.entries(OCLASSES))
        if (v === oclass && CLASS_NAMES[k]) return CLASS_NAMES[k];
    return '';
}

// src/invent.c:3220 display_pickinv() — walk flags.inv_order, heading each
// non-empty class, then its items in inventory-letter order.
//
// Returns the menu entries the caller feeds to add_menu(): a heading has no
// selector and no identifier, an item carries its inventory letter. The "a - "
// prefix is NOT built here; tty_add_menu() builds it, exactly as in C, which is
// what makes the +2 in tty_end_menu()'s width the right rule for this window.
export function display_inventory() {
    const out = [];
    for (const oclass of inv_order()) {
        const items = (game.invent || []).filter(o => o.oclass === oclass);
        if (!items.length) continue;
        /* add_menu_heading(win, class_header) — iflags.menu_headings */
        out.push({ heading: true, str: let_to_name(oclass), attr: ATR_INVERSE });
        for (const o of items)
            out.push({ heading: false, str: doname(o), attr: ATR_NONE,
                       invlet: o.invlet });
    }
    return out;
}

// src/decl.c:96 quitchars — the keys that abandon a prompt.
const quitchars = ' \r\n\x1b';

// src/invent.c:1752 getobj() — ask which carried object a command applies to.
//
// The whole point of porting this is key consumption. C reads ONE key here for
// the inventory letter, and a command that skips it leaves that letter to run
// as a command instead — the same failure that made 'f' walk the hero a square
// east before dofire was ported. 'e', 'a', 'r', 'd', 't' and 'w' together
// account for over a thousand keystrokes across the public corpus, every one of
// them currently mis-consumed.
//
// C loops until it gets something usable, so an invalid letter costs another
// key; that loop is ported. The count, menu and hands branches need input paths
// this port does not have and are recorded rather than guessed, because each
// consumes a DIFFERENT number of keys and inventing one is worse than none.
// include/hack.h:512 — the obj_ok callback's return values.
export const GETOBJ_EXCLUDE = -3, GETOBJ_EXCLUDE_NONINVENT = -2,
             GETOBJ_EXCLUDE_INACCESS = -1, GETOBJ_EXCLUDE_SELECTABLE = 0,
             GETOBJ_DOWNPLAY = 1, GETOBJ_SUGGEST = 2;
export const GETOBJ_ALLOWCNT = 0x01, GETOBJ_PROMPT = 0x02;

// src/invent.c:1830 — the letter list C puts in the prompt.
//
// The '-' arm appends HANDS_SYM and then A SPACE (C's own comment: "put a
// space after the '-' in the prompt"), which is why the prompt reads
// "[- cd or ?*]" and not "[-cd or ?*]".
//
// Inventory is walked in INVLET order (sortloot with SORTLOOT_INVLET), and
// each letter is appended FIRST and then removed when the filter rejects it.
/* async because some getobj callbacks are. equip_ok() (src/do_wear.c:3404) is
   the shared body of wear_ok/takeoff_ok/puton_ok/remove_ok and it calls
   canwearobj(), which is async in this port because js/pline.js is. Calling
   such a callback synchronously yields a Promise, which is truthy and equals
   none of the GETOBJ_* constants, so every letter decision below would take the
   wrong branch WITHOUT throwing. Awaiting a non-Promise is a no-op, so sync
   callbacks are unaffected. */
async function getobj_letters(obj_ok, ctrlflags) {
    let buf = '';
    const forceprompt = (ctrlflags & GETOBJ_PROMPT) !== 0;

    if (forceprompt || !obj_ok) {
        const v = obj_ok ? await obj_ok(null) : GETOBJ_EXCLUDE;
        if (v === GETOBJ_SUGGEST)
            buf += HANDS_SYM + ' ';
    }

    const sorted = [...(game.invent || [])]
        .sort((a, b) => String(a.invlet).localeCompare(String(b.invlet)));

    for (const otmp of sorted) {
        const v = obj_ok ? await obj_ok(otmp) : GETOBJ_SUGGEST;
        if (v === GETOBJ_SUGGEST)
            buf += otmp.invlet;
    }
    return buf;
}

export async function getobj(word, obj_ok_func, ctrlflags) {
    /* src/invent.c:1919 — the prompt, then yn_function reads the key. Our
       loop already read a key here; routing it through tty_yn_function adds
       the paint without changing which keys are consumed. */
    let qbuf = `What do you want to ${word}?`;
    const lets = await getobj_letters(obj_ok_func, ctrlflags | 0);
    qbuf += lets ? ` [${lets} or ?*]` : ' [*]';

    for (;;) {
        const ilet = await tty_yn_function(qbuf, null, '\0');

        if (ilet >= '0' && ilet <= '9') {
            /* get_count() keeps reading digits and then a letter */
            note_unported_invent('getobj:count');
            return null;
        }
        if (quitchars.includes(ilet))
            return null;                       /* Never mind */
        if (ilet === '-') {
            /* HANDS_SYM — "your hands" as the object */
            note_unported_invent('getobj:hands');
            return null;
        }
        if (ilet === '?' || ilet === '*') {
            /* display_pickinv() opens a menu and reads its own keys */
            note_unported_invent('getobj:menu');
            return null;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ilet);
        if (otmp)
            return otmp;

        /* C re-prompts on an unrecognised letter, which costs another key. */
    }
}

// src/invent.c:1466 sobj_at() — try to find a particular type of object at
// designated map location.
//
// C walks svl.level.objects[x][y] through ->nexthere. This port keeps one flat
// list that place_object() PREPENDS to, so filtering it in order yields the
// same relative order the per-square chain would.
//
// It was stubbed to a bare `false` in two files. Everything that asks "is there
// a boulder here" (mfndpos' Sokoban arm, a pet's dig check) or "is there a
// scroll of scare monster here" (onscary) got NO from a function that had never
// looked, which is a wrong answer rather than a missing one.
export function sobj_at(otyp, x, y) {
    for (const otmp of (game.level.objects || []))
        if (otmp.ox === x && otmp.oy === y && otmp.otyp === otyp)
            return otmp;

    return null;
}

// src/invent.c:4763 useupf() — consume `numused` of a stack lying on the FLOOR.
//
// The floor twin of useup(). C's comment on the split is worth keeping:
// burn_floor_objects() holds an object pointer it tries to useupf() more than
// once, so obj has to survive when the stack is plural.
//
// The shop-billing arm is gated on costly_spot(), which answers false on any
// level without a shop, so the ordinary path is fully ported.
export function useupf(obj, numused) {
    const at_u = u_at(obj.ox, obj.oy);
    let otmp;

    /* burn_floor_objects() keeps an object pointer that it tries to
     * useupf() multiple times, so obj must survive if plural */
    if (obj.quan > numused)
        otmp = splitobj(obj, numused);
    else
        otmp = obj;

    if (!game.context?.mon_moving && costly_spot(otmp.ox, otmp.oy)) {
        /* addtobill() / stolen_value() need the shop subsystem */
        (game.unported ||= new Set()).add('useupf:shop_billing');
    }
    delobj(otmp);
    if (at_u && game.u?.uundetected && hides_under(game.youmonst?.data))
        hideunder(game.youmonst);
}

// src/invent.c:4366 stackobj() — merge a just-dropped object into any
// compatible stack already on its square.
//
// C walks svl.level.objects[ox][oy] through the nexthere chain; the port keeps
// one flat array and filters on ox/oy, so the iteration order is the array's.
// merged() does the real work and is already ported.
//
// The break matters: C stops at the FIRST successful merge rather than
// continuing, because merged() has already freed the merged-away object.
export function stackobj(obj) {
    for (const otmp of (game.level?.objects || []))
        if (otmp.ox === obj.ox && otmp.oy === obj.oy
            && otmp !== obj && merged(obj, otmp))
            break;
    return;
}

// src/mkobj.c weight() — how heavy is this stack, right now.
//
// Needed by merged(), which is the most-reached unported path in the whole
// port: tools/generalize.mjs finds it in 58% of random games.
//
// **5.0 delta**: coins used to weigh 0 for quantities 1..49. They now always
// weigh at least 1 unit. Writing this from 3.6 memory gives every early gold
// pile the wrong weight.
export function weight(obj) {
    let wt = game.objects[obj.otyp].oc_weight; /* weight of 1 'otyp' */

    if (obj.quan < 1)
        return 0;                       /* impossible("Calculating weight...") */

    /* globs manage their own owt in mksobj/obj_absorb/shrink_glob */
    if (obj.globby)
        return obj.owt;

    if (Is_container(obj) || obj.otyp === ONAMES.STATUE) {
        if (obj.otyp === ONAMES.STATUE && ismnum(obj.corpsenm)) {
            const msize = game.mons[obj.corpsenm].msize;   /* 0..7 */
            const minwt = (msize + msize + 1) * 100;

            /* default statue weight is 1.5 times corpse weight */
            wt = Math.trunc(3 * game.mons[obj.corpsenm].cwt / 2);
            if (wt < minwt)
                wt = minwt;
            wt *= obj.quan;             /* no effect; statues don't stack */
        }

        let cwt = 0;
        for (const contents of (obj.cobj || []))
            cwt += weight(contents);

        if (obj.otyp === ONAMES.BAG_OF_HOLDING)
            cwt = obj.cursed ? (cwt * 2)
                : obj.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2); /* uncursed */

        return wt + cwt;
    }
    if (obj.otyp === ONAMES.CORPSE && ismnum(obj.corpsenm)) {
        const long_wt = obj.quan * game.mons[obj.corpsenm].cwt;

        wt = (long_wt > LARGEST_INT) ? LARGEST_INT : long_wt;
        if (obj.oeaten)
            wt = eaten_stat(wt, obj);
        return wt;
    } else if (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten) {
        return eaten_stat(obj.quan * wt, obj);
    } else if (obj.oclass === OCLASSES.COIN_CLASS) {
        /* 5.0: always weigh at least 1 unit; used to yield 0 for 1..49 */
        wt = Math.trunc((obj.quan + 50) / 100);
        return Math.max(wt, 1);
    } else if (obj.otyp === ONAMES.HEAVY_IRON_BALL && obj.owt !== 0) {
        return obj.owt;                 /* kludge for "very" heavy iron ball */
    } else if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION && obj.spe) {
        return wt + obj.spe * game.objects[ONAMES.TALLOW_CANDLE].oc_weight;
    }
    return (wt ? wt * obj.quan : (obj.quan + 1) >> 1);
}


// include/monst.h:285 ismnum()
//
// Must bound on NUMMONS, not game.mons.length. tools/gen-monst.mjs appends the
// zeroed terminator back after counting (C indexes mons[NUMMONS] deliberately),
// so mons.length is NUMMONS + 1 and a length bound accepts corpsenm == NUMMONS,
// which C rejects. weight() would then read the terminator's cwt of 0 instead
// of falling through to the generic quan * oc_weight.
const ismnum = (x) => x >= LOW_PM && x < NUMMONS;

const LOW_PM = 0, LARGEST_INT = 32767;

// src/eat.c:3788 eaten_stat() — scale a stat by how much of the food is left.
//
// The zero case is 0, not "divide by 1". Guarding the denominator instead of
// the whole expression returns base * uneaten there, which is wrong and large.
export function eaten_stat(base, obj) {
    /* get full_amount first; obj_nutrition() might modify obj->oeaten */
    const full_amount = obj_nutrition(obj);
    let uneaten_amt = obj.oeaten;

    if (uneaten_amt > full_amount)
        uneaten_amt = full_amount;      /* impossible(...) in C */

    base = full_amount
        ? Math.trunc(base * uneaten_amt / full_amount)
        : 0;
    return (base < 1) ? 1 : base;
}

// src/eat.c obj_nutrition()
function obj_nutrition(otmp) {
    return (otmp.otyp === ONAMES.CORPSE) ? game.mons[otmp.corpsenm].cnutrit
         : otmp.globby ? otmp.owt
         : game.objects[otmp.otyp].oc_nutrition;
}

// src/invent.c mergable() — may `obj` be folded into the `otmp` stack?
//
// Pure predicate, no draws. The arms needing subsystems we lack (erosion_matters
// on unported eroded state, same_price for shops, safe_oname for named objects)
// are the LAST few; everything before them is decided here.
export function mergable(otmp, obj) {
    /* fail if already the same object, if different types, if either is
       explicitly marked to prevent merge, or if not mergable in general */
    if (obj === otmp || obj.otyp !== otmp.otyp
        || obj.nomerge || otmp.nomerge || !game.objects[obj.otyp].oc_merge)
        return false;

    /* coins of the same kind will always merge */
    if (obj.oclass === OCLASSES.COIN_CLASS)
        return true;

    if (!!obj.cursed !== !!otmp.cursed || !!obj.blessed !== !!otmp.blessed)
        return false;

    if (obj.how_lost === LOST_EXPLODING || otmp.how_lost === LOST_EXPLODING)
        return false;
    if (otmp.how_lost !== LOST_NONE && (obj.how_lost !== otmp.how_lost))
        return false;

    if (obj.globby)
        return true;

    if (!!obj.unpaid !== !!otmp.unpaid || (obj.spe | 0) !== (otmp.spe | 0)
        || !!obj.no_charge !== !!otmp.no_charge
        || !!obj.obroken !== !!otmp.obroken
        || !!obj.otrapped !== !!otmp.otrapped
        || !!obj.lamplit !== !!otmp.lamplit)
        return false;

    if (obj.oclass === OCLASSES.FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0)
            || !!obj.orotten !== !!otmp.orotten))
        return false;

    if (!!obj.dknown !== !!otmp.dknown
        || (!!obj.bknown !== !!otmp.bknown && !Role_if(PM_CLERIC)
            && (Blind() || Hallucination()))
        || (obj.oeroded | 0) !== (otmp.oeroded | 0)
        || (obj.oeroded2 | 0) !== (otmp.oeroded2 | 0)
        || !!obj.greased !== !!otmp.greased)
        return false;

    if (erosion_matters(obj, game.objects)
        && (!!obj.oerodeproof !== !!otmp.oerodeproof
            || (!!obj.rknown !== !!otmp.rknown && (Blind() || Hallucination()))))
        return false;

    if (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.EGG
        || obj.otyp === ONAMES.TIN) {
        if (obj.corpsenm !== otmp.corpsenm)
            return false;
    }

    /* hatching eggs don't merge; ditto for revivable corpses */
    if ((obj.otyp === ONAMES.EGG && (obj.timed || otmp.timed))
        || (obj.otyp === ONAMES.CORPSE && otmp.corpsenm >= LOW_PM
            && is_reviver(game.mons[otmp.corpsenm])))
        return false;

    /* allow candle merging only if their ages are close; see begin_burn()
       for a reference for the magic "25" */
    if (Is_candle(obj)
        && Math.trunc((obj.age | 0) / 25) !== Math.trunc((otmp.age | 0) / 25))
        return false;

    /* burning potions of oil never merge */
    if (obj.otyp === ONAMES.POT_OIL && obj.lamplit)
        return false;

    if (obj.unpaid) {
        note_unported_invent('mergable:same_price');   /* shop pricing */
        return false;
    }

    /* some additional information is always incompatible */
    if (obj.omonst || obj.omid || otmp.omonst || otmp.omid)
        return false;

    /* if they have names, make sure they're the same */
    const objname = obj.oname || '', otmpname = otmp.oname || '';
    if ((objname.length !== otmpname.length
         && ((objname.length && otmpname.length) || obj.otyp === ONAMES.CORPSE))
        || (objname.length && otmpname.length
            && objname.slice(0, objname.length)
               !== otmpname.slice(0, objname.length)))
        return false;

    /* if one has an attached mail command, other must have same command */
    if (!obj.omailcmd ? !!otmp.omailcmd
                      : (!otmp.omailcmd || obj.omailcmd !== otmp.omailcmd))
        return false;

    /* should be moot since matching artifacts wouldn't be unique */
    if ((obj.oartifact | 0) !== (otmp.oartifact | 0))
        return false;

    if (!!obj.known !== !!otmp.known && (Blind() || Hallucination()))
        return false;

    return true;
}

// src/invent.c merged() — fold *pobj into *potmp. Returns 1 on success.
//
// Both arguments are pointers-to-pointers in C because otmp can be REPLACED by
// oname(); the JS equivalent is a one-element holder so the caller sees it.
export function merged(potmp, pobj) {
    const otmp = potmp.o, obj = pobj.o;

    if (mergable(otmp, obj)) {
        /* Approximate age. Not done when lit: the burn would have to be
           stopped on both, merged, then restarted. */
        if (!obj.lamplit && !obj.globby)
            otmp.age = Math.trunc(((otmp.age | 0) * otmp.quan
                                   + (obj.age | 0) * obj.quan)
                                  / (otmp.quan + obj.quan));

        if (!otmp.globby)
            otmp.quan += obj.quan;
        /* temporary special case for gold objects!!!! */
        if (otmp.oclass === OCLASSES.COIN_CLASS) {
            otmp.owt = weight(otmp);
            otmp.bknown = 0;
        } else if (!Is_pudding(otmp)) {
            otmp.owt = weight(otmp);
        }
        if (!otmp.oname && obj.oname)
            otmp.oname = obj.oname;     /* oname(..., ONAME_SKIP_INVUPD) */

        obj_extract_self(obj);

        if (obj.pickup_prev && otmp.where === OBJ_INVENT)
            otmp.pickup_prev = 1;

        if (obj.lamplit || obj.timed)
            note_unported_invent('merged:light_sources_and_timers');

        /* objects can be identified by comparing them */
        if (!!obj.known !== !!otmp.known)
            otmp.known = 1;
        if (!!obj.rknown !== !!otmp.rknown)
            otmp.rknown = 1;
        if (!!obj.bknown !== !!otmp.bknown)
            otmp.bknown = 1;

        if (obj.owornmask && carried(otmp))
            note_unported_invent('merged:worn_stack');

        if (obj.bypass)
            otmp.bypass = 1;

        if (obj.globby) {
            note_unported_invent('merged:obj_absorb');
            return 1;
        }

        /* "You learn more about your items by comparing them." needs the
           discovery messages; the identification above already happened. */
        return 1;
    }
    return 0;
}

// src/mkobj.c obj_extract_self() — unlink the object from wherever it lives.
export function obj_extract_self(obj) {
    switch (obj.where) {
    case OBJ_FREE:
        break;
    case OBJ_CONTAINED: {
        const c = obj.ocontainer;
        if (c && c.cobj) {
            const i = c.cobj.indexOf(obj);
            if (i >= 0) c.cobj.splice(i, 1);
            c.owt = weight(c);          /* container_weight() */
        }
        obj.ocontainer = null;
        break;
    }
    case OBJ_MINVENT: {
        const m = obj.ocarry;
        if (m && m.minvent) {
            const i = m.minvent.indexOf(obj);
            if (i >= 0) m.minvent.splice(i, 1);
        }
        obj.ocarry = null;
        break;
    }
    case OBJ_INVENT:
        freeinv(obj);       /* src/mkobj.c:2573 -- ported at invent.js:622 */
        break;
    default: {   /* OBJ_FLOOR — remove_object() */
        const objs = game.level?.objects;
        if (objs) {
            const i = objs.indexOf(obj);
            if (i >= 0) objs.splice(i, 1);
        }
        break;
    }
    }
    obj.where = OBJ_FREE;
}

// include/obj.h — obj->where values, and the two how_lost values mergable reads.
const LOST_NONE = 0, LOST_EXPLODING = 1, LOST_THROWN = 2;

// include/mondata.h:170 is_reviver()
const is_reviver = (ptr) => !!ptr && (is_rider(ptr) || ptr.mlet === MONSYMS.S_TROLL);

/* Blind/Hallucination/Role_if and erosion_matters need property and shop state
   that is not ported; all three only ever make mergable STRICTER, so a false
   here can merge two stacks C would keep apart in those rare states. */
function Blind() { return false; }
function Role_if(role) { return false; }
/* erosion_matters() is fully ported in js/mkobj.js (its C home is
   src/mkobj.c); it was stubbed here by mistake. */
const PM_CLERIC = 0;

function note_unported_invent(what) {
    (game.unported ||= new Set()).add(what);
}

// src/invent.c xprname() — one inventory line: "b - a +1 bow".
//
// C's format is "%c - %.*s%s": the letter, " - ", the object's name, and a
// suffix that is "." when the caller asked for a sentence.
export function xprname(obj, txt, let_, dot, cost, quan) {
    const name = txt || doname(obj);
    return `${let_} - ${name}${dot ? '.' : ''}`;
}

// src/invent.c prinv() — print one inventory line, optionally prefixed.
export async function prinv(prefix, obj, quan) {
    if (!prefix) prefix = '';
    await pline(`${prefix}${prefix ? ' ' : ''}`
                + xprname(obj, null, obj.invlet, true, 0, quan));
}

// src/invent.c freeinv_core() — the bookkeeping an object needs on its way
// OUT of inventory, before it is freed or moved.
//
// Almost all of it is quest/invocation artifact tracking: the Amulet, the
// Candelabrum, the Bell, the Book and the quest artifact each clear their
// u.uhave flag, and C calls impossible() if the flag was not set. None of
// those can be carried this early, so every arm is recorded rather than
// guessed at.
//
// The three that are NOT artifact bookkeeping matter more often: a LOADSTONE
// is CURSED on the way out (that is how it resists being dropped), anything
// conferring luck triggers set_moreluck, and a timed FIGURINE has its
// transform timer stopped. The tin reference is cleared last.
// src/artifact.c:? confers_luck() — does carrying this raise Luck?
//
// The oartifact test short-circuits before spec_ability(), so for any ordinary
// object this answers FALSE without needing the artifact subsystem at all.
// Only an actual artifact reaches spec_ability(), which needs get_artifact()
// and the artilist; that arm records rather than guessing.
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === ONAMES.LUCKSTONE)
        return true;

    if (!obj.oartifact)
        return false;

    /* spec_ability(obj, SPFX_LUCK) — needs get_artifact() and artilist */
    (game.unported ||= new Set()).add('invent:confers_luck:spec_ability');
    return false;
}

function freeinv_core(obj) {
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        /* src/invent.c freeinv_core() — this arm is exactly two statements in
           5.0. The 'money2mon' gap recorded here before did not correspond to
           anything in this function; money2mon appears nowhere in invent.c. */
        (game.disp ||= {}).botl = true;
        return;
    }
    /* src/invent.c freeinv_core() — the u.uhave bookkeeping. Each arm is a
       specific artifact: the Amulet of Yendor, the Candelabrum, the Bell of
       Opening, the Book of the Dead, then any oartifact for the quest
       artifact. An ORDINARY object matches none of them and C does nothing,
       so recording unconditionally claimed a gap on every single drop. */
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.oartifact) {
        /* u.uhave is not tracked, and set_artifact_intrinsic is unported */
        note_unported_invent('freeinv_core:uhave_artifacts');
    }

    if (obj.otyp === ONAMES.LOADSTONE)
        curse(obj);
    else if (confers_luck(obj))
        /* set_moreluck() needs stone_luck() and carrying(); reached only for a
           luckstone or a luck-conferring artifact, so it records. */
        note_unported_invent('freeinv_core:set_moreluck');
    else if (obj.otyp === ONAMES.FIGURINE && obj.timed)
        note_unported_invent('freeinv_core:stop_timer');

    if (obj === game.context?.tin?.tin) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
}

// src/invent.c freeinv() — remove an object from the hero's inventory.
//
// extract_nobj unlinks it from the invent chain; C keeps a flat array here,
// so a splice by identity is the same operation. pickup_prev is cleared so a
// later pickup does not think it was already handled.
export function freeinv(obj) {
    const inv = (game.invent ||= []);
    const i = inv.indexOf(obj);
    if (i >= 0)
        inv.splice(i, 1);           /* extract_nobj(obj, &gi.invent) */
    obj.pickup_prev = 0;
    freeinv_core(obj);
    update_inventory();
}

// src/invent.c useupall() — the whole stack goes.
//
// setnotworn first (a worn item must stop being worn before it stops
// existing), then freeinv, then obfree which deletes contents recursively.
export function useupall(obj) {
    note_unported_invent('useupall:setnotworn');
    freeinv(obj);
    note_unported_invent('useupall:obfree');
}

// src/invent.c useup() — consume ONE of a stack, or all of it.
//
// C's comment notes this works correctly for containers because containers
// do not merge, so quan is always 1 for them and they take the useupall arm.
//
// in_use is cleared on the surviving stack: done_eating sets it before
// calling here, and leaving it set would make the remainder look mid-use.
export function useup(obj) {
    if (obj.quan > 1) {
        obj.in_use = false;         /* no longer in use */
        obj.quan--;
        obj.owt = weight(obj);
        update_inventory();
    } else {
        useupall(obj);
    }
}

/* src/invent.c:1710 any_obj_ok() — 'd' drop accepts anything in inventory. */
export function any_obj_ok(obj) {
    if (obj)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/invent.c update_inventory() — refresh the persistent inventory window.
//
// Two early returns first: nothing happens before the move loop starts, and
// nothing happens while map output is suppressed. Both matter here, because
// freeinv and useup call this during level generation and restore, when the
// window does not exist yet.
//
// The body brackets the windowport call with iflags.suppress_price forced to
// 0, because a perm_invent refresh can fire from inside code that is
// deliberately hiding shop prices while formatting a message, and the window
// should still show normal names. That is recorded along with the windowport
// call itself -- the tty port only does real work when perm_invent is on, and
// no recorded session turns it on.
export function update_inventory() {
    if (!game.program_state?.in_moveloop)
        return;
    if (note_unported_invent('update_inventory:suppress_map_output'))
        return;

    note_unported_invent('update_inventory:win_update_inventory');
}

// src/invent.c:2094 silly_thing() — feedback for using a command on an object
// it does not apply to.
//
// The 'P'/'R' vs 'W'/'T' cross-command advice above it in the C is inside
// `#ifdef OBSOLETE_HANDLING` and is not compiled, so the live function is only
// the Amulet special case and the generic fallback. Not ported, because it is
// not built.
export async function silly_thing(word, otmp) {
    /* see comment about Amulet of Yendor in objtyp_is_callable(do_name.c);
       known fakes yield the silly thing feedback */
    if (word === "call"
        && (otmp.otyp === ONAMES.AMULET_OF_YENDOR
            || (otmp.otyp === ONAMES.FAKE_AMULET_OF_YENDOR && !otmp.known)))
        await pline_The("Amulet doesn't like being called names.");
    else
        await pline(silly_thing_to.replace('%s', word));
}

// src/invent.c:2156 is_worn() — is this object equipped in ANY slot?
//
// Note the mask includes W_SADDLE and W_WEAPONS, not just armor and
// accessories, so a wielded weapon and a saddled steed's saddle both count.
export function is_worn(otmp) {
    return (otmp.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS))
            ? true
            : false;
}
