import { game } from './gstate.js';
import { pline } from './display.js';
import { splitobj, place_object } from './mkobj.js';
import { freeinv, stackobj } from './invent.js';
import { encumber_msg, ACURR, acurrstr } from './attrib.js';
import { A_DEX, BOLT_LIM, IS_SOFT, LOST_THROWN, THROWN_WEAPON } from './const.js';
/* include/objclass.h:79 — oc_dir bits for weapons */
const PIERCE = 1;
import { singular, xname, an } from './objnam.js';
import { skill_name, weapon_descr, weapon_type, P_SKILL } from './weapon.js';
import { SKILLS, MATERIALS } from './objects_data.js';
import { rn2, rnd } from './rng.js';
import { bhit, obj_resists } from './zap.js';
import { is_pool, is_lava } from './mon.js';
import { is_blade } from './mon.js';
import { is_missile, is_sword } from './wield.js';
import { cansee } from './vision.js';
import { newsym } from './display.js';
import { Levitation } from './youprop.js';
import { cmdq_add_ec, cmdq_add_key } from './cmd.js';
import { doswapweapon, dowield, doquiver_core, is_ammo } from './wield.js';
import { is_pole, is_spear } from './u_init.js';
import { You } from './pline.js';
import { ammo_and_launcher } from './wield.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, CQ_CANNED } from './const.js';
import { getobj, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_PROMPT, GETOBJ_ALLOWCNT } from './invent.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { throws_rocks } from './mondata.js';
import { PMNAMES } from './monst_data.js';
import { getdir } from './cmd.js';

// dothrow.js — throwing, firing, and the path a thrown thing takes.
// C ref: src/dothrow.c
//
// walk_path() is here first because several unrelated things need it: jump()
// walks the hero's leap through it, throwit() walks a missile, and the polearm
// code checks reach with it. It draws nothing at all — it is pure geometry —
// but every caller decides where something ENDS UP from its result, and a
// wrong endpoint moves the hero or an object without costing a single PRNG
// call, which is the kind of divergence the RNG log cannot show.

// src/dothrow.c:39 multishot_class_bonus() — role-based volley bonus.
//
// Draws nothing; the Caveman sling/spear arm is what turns a flint volley
// into rnd(2) at the roll below. `pm` is the role's mnum (string or index).
export function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = game.objects[ammo.otyp].oc_skill;
    const is = (name) => pm === name || pm === PMNAMES[name];

    if (is('PM_CAVE_DWELLER')) {
        /* give bonus for low-tech gear */
        if (skill === -SKILLS.P_SLING || skill === SKILLS.P_SPEAR)
            multishot++;
    } else if (is('PM_MONK')) {
        /* allow higher volley count despite skill limitation */
        if (skill === -SKILLS.P_SHURIKEN)
            multishot++;
    } else if (is('PM_RANGER')) {
        /* arbitrary; encourage use of other missiles beside daggers */
        if (skill !== SKILLS.P_DAGGER)
            multishot++;
    } else if (is('PM_ROGUE')) {
        /* possibly should add knives... */
        if (skill === SKILLS.P_DAGGER)
            multishot++;
    } else if (is('PM_NINJA') || is('PM_SAMURAI')) {
        if (is('PM_NINJA')
            && (skill === -SKILLS.P_SHURIKEN || skill === -SKILLS.P_DART))
            multishot++;
        /* role-specific launcher and its ammo */
        if (ammo.otyp === ONAMES.YA && launcher
            && launcher.otyp === ONAMES.YUMI)
            multishot++;
    }
    return multishot;
}

// src/dothrow.c:100 throw_obj() — ask a direction, then throw.
//
// res starts at ECMD_TIME and only a cancelled getdir() changes it, so a
// throw that reaches this point takes a turn. The artifact arms (Mjollnir)
// and the petrifying-corpse arm need subsystems that are absent; each is
// gated on state no current session reaches and recorded if hit.
export async function throw_obj(obj, shotlimit) {
    let res = ECMD_TIME;
    const u = game.u;
    const save_osplit = game.context.objsplit
                        ? { ...game.context.objsplit } : null;

    /* ask "in what direction?" */
    if (!await getdir(null))
        return ECMD_OK; /* ECMD_CANCEL — no time passes */

    if (obj.otyp === ONAMES.BOULDER && !throws_rocks(game.mons?.[u.umonnum])) {
        await pline("It's too heavy.");
        return ECMD_TIME;
    }
    if (!u.dx && !u.dy && !u.dz) {
        await You('cannot throw an object at yourself.');
        return ECMD_OK;
    }
    /* u_wipe_engr(2) — draws only when an engraving is underfoot */
    if ((game.level?.engravings || []).some(e => e.engr_x === u.ux
                                                && e.engr_y === u.uy))
        note_unported_dothrow('throw_obj:u_wipe_engr');

    if (obj.otyp === ONAMES.CORPSE && !game.u.uarmg)
        note_unported_dothrow('throw_obj:petrify_check');

    /* welded(obj) needs cursed-weld state; nothing wields cursed yet */

    /* src/dothrow.c:158 — multishot. Ammo volleys need the matching
       launcher wielded; a lone item or mismatched launcher stays at 1 and
       draws nothing, which is why a hand-thrown arrow is a single shot. */
    let multishot = 1;
    if (obj.quan > 1
        && (is_ammo(obj) ? ammo_and_launcher(obj, game.u.uwep)
                         : obj.oclass === OCLASSES.WEAPON_CLASS)
        && !(u.uprops?.CONFUSION || u.uprops?.STUNNED)) {
        const skill = game.objects[obj.otyp].oc_skill;
        const mnum = game.urole?.mnum;
        const role_is = (pm) => mnum === pm || mnum === PMNAMES[pm];
        const weakmultishot =
            (role_is('PM_WIZARD') || role_is('PM_CLERIC')
             || (role_is('PM_HEALER') && skill !== SKILLS.P_KNIFE)
             || (role_is('PM_TOURIST') && skill !== -SKILLS.P_DART)
             || u.uprops?.FUMBLING || ACURR(A_DEX) <= 6);

        switch (P_SKILL(weapon_type(obj))) {
        case SKILLS.P_EXPERT:
            multishot++;
            /* FALLTHRU */
        case SKILLS.P_SKILLED:
            if (!weakmultishot)
                multishot++;
            break;
        default:
            break;
        }
        /* ...or is using a special weapon for their role... */
        multishot += multishot_class_bonus(mnum, obj, game.u.uwep);

        /* the racial-bow arms need launcher matching that the reachable
           races do not trigger; the Elf/Orc bows and gnomish crossbows are
           recorded when they arise */
        if (!weakmultishot
            && (game.urace?.mnum === 'PM_ELF' || game.urace?.mnum === 'PM_ORC'
                || game.urace?.mnum === 'PM_GNOME'))
            note_unported_dothrow('throw_obj:racial_multishot');

        if (multishot > 1 && skill === -SKILLS.P_CROSSBOW
            && ammo_and_launcher(obj, game.u.uwep)
            && acurrstr() < 18)
            multishot = rnd(multishot);

        multishot = rnd(multishot);
        if (multishot > obj.quan)
            multishot = obj.quan;
        if (shotlimit > 0 && multishot > shotlimit)
            multishot = shotlimit;
    }

    const m_shot_s = ammo_and_launcher(obj, game.u.uwep);
    if (multishot > 1 || shotlimit > 0) {
        await You(`${m_shot_s ? 'shoot' : 'throw'} ${multishot} ${
            multishot === 1 ? singular(obj, xname) : xname(obj)}.`);
    }

    const wep_mask = obj.owornmask || 0;
    for (let i = 1; i <= multishot; i++) {
        let otmp;
        if (obj && obj.quan > 1) {
            otmp = splitobj(obj, 1);
        } else {
            otmp = obj;
            if (otmp.owornmask)
                note_unported_dothrow('throw_obj:remove_worn_item');
            obj = null;
        }
        freeinv(otmp);
        await throwit(otmp, wep_mask);
        await encumber_msg();
    }

    /* src/dothrow.c:290 — undo a pre-existing object split if the leftover
       stack is one of its halves; unsplitobj is not ported and no current
       flow leaves this true. */
    if (obj && obj !== game.u.uquiver && save_osplit
        && (obj.o_id === save_osplit.parent_oid
            || obj.o_id === save_osplit.child_oid))
        note_unported_dothrow('throw_obj:unsplitobj');
    return res;
}

// src/dothrow.c:1510 throwit() — fly the missile and land it.
//
// The reachable spine: a horizontal hand-thrown or launched missile that
// crosses open floor and lands. The swallow, straight-up/down, boomerang
// and throw-and-return arms are gated on state no session reaches yet.
export async function throwit(obj, wep_mask) {
    const u = game.u;

    game.thrownobj = obj;
    obj.how_lost = LOST_THROWN;

    /* src/dothrow.c:1526 — a cursed or greased missile can slip */
    if ((obj.cursed || obj.greased) && (u.dx || u.dy) && !rn2(7)) {
        let slipok = true;
        if (ammo_and_launcher(obj, game.u.uwep)) {
            note_unported_dothrow('throwit:misfire_msg');
        } else {
            if (obj.greased || throwing_weapon(obj))
                note_unported_dothrow('throwit:slip_msg');
            else
                slipok = false;
        }
        if (slipok) {
            u.dx = rn2(3) - 1;
            u.dy = rn2(3) - 1;
            if (!u.dx && !u.dy)
                u.dz = 1;
        }
    }

    /* the low-stamina drop arm reads encumbrance; calc_capacity stays 0
       for every current session so the gate is the hp test alone */
    if (u.uswallow) {
        note_unported_dothrow('throwit:uswallow');
        game.thrownobj = null;
        return;
    }
    if (u.dz) {
        note_unported_dothrow('throwit:vertical_throw');
        game.thrownobj = null;
        return;
    }
    if (obj.otyp === ONAMES.BOOMERANG) {
        note_unported_dothrow('throwit:boomerang');
        game.thrownobj = null;
        return;
    }

    /* src/dothrow.c:1615 — range from strength and weight */
    const crossbowing = (ammo_and_launcher(obj, game.u.uwep)
                         && weapon_type(game.u.uwep) === SKILLS.P_CROSSBOW);
    let urange = Math.trunc((crossbowing ? 18 : acurrstr()) / 2);
    let range;
    if (obj.otyp === ONAMES.HEAVY_IRON_BALL)
        range = urange - Math.trunc(obj.owt / 100);
    else
        range = urange - Math.trunc(obj.owt / 40);
    if (range < 1)
        range = 1;

    if (is_ammo(obj)) {
        if (ammo_and_launcher(obj, game.u.uwep)) {
            if (crossbowing)
                range = BOLT_LIM;
            else
                range++;
        } else if (obj.oclass !== OCLASSES.GEM_CLASS) {
            range = Math.trunc(range / 2);
            /* body_part(HAND) is "hand" for every un-polymorphed form */
            await pline(`You aren't wielding ${
                an(skill_name(weapon_type(obj)))}, so you throw your ${
                weapon_descr(obj)} by hand.`);
        }
    }

    if (Levitation()) {
        urange -= range;
        if (urange < 1) urange = 1;
        range -= urange;
        if (range < 1) range = 1;
    }
    if (obj.otyp === ONAMES.BOULDER)
        range = 20;

    const pobjRef = { obj };
    const mon = bhit(u.dx, u.dy, range, THROWN_WEAPON, null, null, pobjRef);

    if (!pobjRef.obj) {
        game.thrownobj = null;
        return;
    }

    if (mon) {
        /* throwit_mon_hit: the hit/damage chain (thitmonst) is combat */
        note_unported_dothrow('throwit:mon_hit');
        game.thrownobj = null;
        return;
    }

    /* src/dothrow.c:1780 — landing: break, splash, or come to rest */
    const bx = game.bhitpos.x, by = game.bhitpos.y;
    const btyp = game.level.at(bx, by)?.typ;
    if ((!IS_SOFT(btyp) && breaktest(obj))
        || obj.oclass === OCLASSES.VENOM_CLASS) {
        /* breakmsg + breakobj destroy the missile */
        note_unported_dothrow('throwit:breakage');
        game.thrownobj = null;
        return;
    }
    if (is_pool(bx, by) || is_lava(bx, by))
        note_unported_dothrow('throwit:splash');

    /* flooreffects consumes the object in water/lava/altars; plain floor
       falls through to placement */
    game.thrownobj = null;
    place_object(obj, bx, by);
    stackobj(obj);
    if (cansee(bx, by))
        newsym(bx, by);
}

// src/dothrow.c:2582 breaktest() — does this object break on impact?
export function breaktest(obj) {
    let nonbreakchance = 1;

    if (obj.oclass === OCLASSES.ARMOR_CLASS
        && game.objects[obj.otyp].oc_material === MATERIALS.GLASS)
        nonbreakchance = 90;

    if (obj_resists(obj, nonbreakchance, 99))
        return false;
    if (game.objects[obj.otyp].oc_material === MATERIALS.GLASS
        && !obj.oartifact && obj.oclass !== OCLASSES.GEM_CLASS)
        return true;
    switch (obj.oclass === OCLASSES.POTION_CLASS ? ONAMES.POT_WATER
                                                 : obj.otyp) {
    case ONAMES.EXPENSIVE_CAMERA:
    case ONAMES.POT_WATER: /* really, all potions */
    case ONAMES.EGG:
    case ONAMES.CREAM_PIE:
    case ONAMES.MELON:
    case ONAMES.ACID_VENOM:
    case ONAMES.BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

// src/dothrow.c:63 throwing_weapon() — a weapon meant to be thrown.
function throwing_weapon(obj) {
    return (is_missile(obj) || is_spear(obj)
            /* daggers and knife (excludes scalpel) */
            || (is_blade(obj) && !is_sword(obj)
                && (game.objects[obj.otyp].oc_dir & PIERCE) !== 0)
            || obj.otyp === ONAMES.WAR_HAMMER || obj.otyp === ONAMES.AKLYS);
}

// src/dothrow.c dothrow() — the 't' command.
//
// ok_to_throw() reads nothing (it only fails for notake, nohands or being
// overloaded), then getobj() takes the object letter and throw_obj() the
// direction. Three keys in total, and leaving them unconsumed ran both as
// commands.
// src/dothrow.c throw_ok() — which objects getobj should suggest for 't'.
//
// The '-' choice is EXCLUDED outright, so the prompt has no "- " prefix the
// way the quiver's does. A wielded single item is downplayed but still
// selectable; coins and weapons are suggested, gems only when slinging.
function throw_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* welded/AutoReturn/Mjollnir need the wield and artifact code */
    if (obj.quan === 1
        && (obj === game.u.uwep || (obj === game.u.uswapwep && game.u.twoweap)))
        return GETOBJ_DOWNPLAY;

    if (obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_SUGGEST;

    /* uslinging() needs the wielded launcher's skill; a sling is rare enough
       that the not-slinging arm is the one every recorded session takes. */
    if (obj.oclass === OCLASSES.WEAPON_CLASS)
        return GETOBJ_SUGGEST;

    /* gy.youmonst.data is the hero's current form; this port keeps it as
       u.umonnum indexing game.mons. Guarded because the boulder arm is only
       reachable for a rock-throwing polyform. */
    const uptr = game.mons?.[game.u?.umonnum];
    if (uptr && throws_rocks(uptr) && obj.otyp === ONAMES.BOULDER)
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

export async function dothrow() {
    const obj = await getobj('throw', throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    return obj ? await throw_obj(obj, 0) : ECMD_OK;
}

function note_unported_dothrow(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dothrow.c:656 walk_path() — Bresenham from src to dest, calling
// check_proc at every step and stopping early when it returns false.
//
// On failure dest_cc is rewritten to the LAST square that passed, which is how
// callers learn where the path was blocked. C's comment notes the algorithm
// handles slanted moves suboptimally — a diagonal that clips a corner fails
// rather than routing around it — and that quirk is part of the behaviour.
export function walk_path(src_cc, dest_cc, check_proc, arg) {
    let err;
    let x, y, dx, dy, x_change, y_change, i, prev_x, prev_y;
    let keep_going = true;

    dx = dest_cc.x - src_cc.x;
    dy = dest_cc.y - src_cc.y;
    prev_x = x = src_cc.x;
    prev_y = y = src_cc.y;

    if (dx < 0) {
        x_change = -1;
        dx = -dx;
    } else {
        x_change = 1;
    }
    if (dy < 0) {
        y_change = -1;
        dy = -dy;
    } else {
        y_change = 1;
    }
    i = err = 0;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x;
            prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) {
                x += x_change;
                err -= dy << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = check_proc(arg, x, y)))
                break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x;
            prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) {
                y += y_change;
                err -= dx << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = check_proc(arg, x, y)))
                break;
        }
    }

    if (keep_going)
        return true; /* successful */

    dest_cc.x = prev_x;
    dest_cc.y = prev_y;
    return false;
}

// src/dothrow.c:447 find_launcher() — the launcher in inventory matching this
// ammo, preferring one whose B/U/C is known not-cursed; a known-cursed one is
// skipped outright and an unknown one is the fallback.
export function find_launcher(ammo) {
    let oX = null;

    if (!ammo)
        return null;

    for (const otmp of (game.invent || [])) {
        if (otmp.cursed && otmp.bknown)
            continue; /* known to be cursed, so skip */
        if (ammo_and_launcher(ammo, otmp)) {
            if (otmp.bknown)
                return otmp; /* known-B or known-U (known-C won't get here) */
            if (!oX)
                oX = otmp; /* unknown-BUC; used if no known-BU item found */
        }
    }
    return oX;
}

/*
 * src/dothrow.c:469 dofire() — the 'f' command: fire from the quiver.
 *
 * The shot-count prefix (ok_to_throw/shotlimit) cannot arise here because
 * this port's input path has no count prefixes, so shotlimit is always 0.
 * The polearm/bullwhip arms, autoquiver, and the throw-and-return artifact
 * head are recorded where their state can occur.
 */
export async function dofire() {
    const shotlimit = 0;
    let obj;
    let skip_fireassist = false;
    let res = ECMD_OK;

    if (game.u.uwep && game.u.uwep.oartifact)
        note_unported_dothrow('dofire:AutoReturn');

    obj = game.u.uquiver;
    if (!obj) {
        if (!game.flags.autoquiver) {
            /* if we're wielding a polearm, apply it */
            if (game.u.uwep && is_pole(game.u.uwep)) {
                note_unported_dothrow('dofire:use_pole');
                return ECMD_OK;
            /* if we're wielding a bullwhip, apply it */
            } else if (game.u.uwep && game.u.uwep.otyp === ONAMES.BULLWHIP) {
                note_unported_dothrow('dofire:use_whip');
                return ECMD_OK;
            } else if ((game.iflags.fireassist !== false)
                       && game.u.uswapwep && is_pole(game.u.uswapwep)
                       && !(game.u.uswapwep.cursed && game.u.uswapwep.bknown)) {
                /* we have a known not-cursed polearm as swap weapon.
                   swap to it and retry */
                cmdq_add_ec(CQ_CANNED, doswapweapon);
                cmdq_add_ec(CQ_CANNED, dofire);
                return ECMD_OK; /* haven't taken any time yet */
            } else {
                await You("have no ammunition readied.");
            }
        } else {
            note_unported_dothrow('dofire:autoquiver');
        }
    }

    /* if autoquiver is disabled or has failed, prompt for missile */
    if (!obj) {
        /* this gives its own feedback about populating the quiver slot */
        res = await doquiver_core("fire");
        if (res !== ECMD_OK && res !== ECMD_TIME)
            return res;

        obj = game.u.uquiver;
    }

    if (game.u.uquiver && is_ammo(game.u.uquiver)
        && (game.iflags.fireassist !== false) /* optlist.h:309 — default On */
        && !skip_fireassist) {
        let olauncher;

        if (game.u.uwep && is_pole(game.u.uwep)) {
            note_unported_dothrow('dofire:use_pole');
            return ECMD_OK;
        }
        /* Try to find a launcher */
        if (ammo_and_launcher(game.u.uquiver, game.u.uwep)) {
            obj = game.u.uquiver;
        } else if (ammo_and_launcher(game.u.uquiver, game.u.uswapwep)) {
            /* swap weapons and retry fire */
            cmdq_add_ec(CQ_CANNED, doswapweapon);
            cmdq_add_ec(CQ_CANNED, dofire);
            return res;
        } else if ((olauncher = find_launcher(game.u.uquiver)) != null) {
            /* wield launcher, retry fire */
            if (game.u.uwep && !game.flags.pushweapon)
                cmdq_add_ec(CQ_CANNED, doswapweapon);
            cmdq_add_ec(CQ_CANNED, dowield);
            cmdq_add_key(CQ_CANNED, olauncher.invlet);
            cmdq_add_ec(CQ_CANNED, dofire);
            return res;
        }
    }

    const altres = obj ? await throw_obj(obj, shotlimit) : ECMD_CANCEL;
    /* fire can take time by filling quiver (if that causes something which
       was wielded to be unwielded) even if the throw itself gets cancelled */
    return (res === ECMD_TIME) ? res : altres;
}
