// eat.js — eating and hunger.
// C ref: eat.c
//
// Ported so far: init_uhunger(), gethungry(), newuhs().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import {
    A_STR, A_CON, SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED,
    STARVED, SLT_ENCUMBER, SLOW_DIGESTION, REGENERATION, HUNGER, CONFLICT,
    PROTECTION, HALLUC, HALLUC_RES, DEAF, FROMFORM, W_ARTI, W_WEP, W_RINGL,
    W_RINGR,
} from './const.js';
import { M1_CARNIVORE, M1_HERBIVORE, M1_METALLIVORE, PM_WIZARD, PM_VALKYRIE,
         PM_ELF } from './monsters.js';
import { objects, RIN_SLOW_DIGESTION, MEAT_RING, RIN_PROTECTION,
         FAKE_AMULET_OF_YENDOR } from './objects.js';
import { near_capacity } from './hack.js';
import { ACURR } from './attrib.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { SPINACH_TIN, ROTTEN_TIN, HOMEMADE_TIN, NON_PM, NEUTRAL } from './const.js';
import { FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
         ACID_RES, STONE_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT,
         LAST_PROP } from './const.js';
import { can_teleport, control_teleport, telepathic } from './mondata.js';
import { getobj } from './invent.js';
import { is_edible } from './iactions.js';
import { can_reach_floor } from './engrave.js';
import { check_capacity } from './hack.js';
import { is_pool, is_lava } from './makemon.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE,
         GETOBJ_EXCLUDE_NONINVENT, GETOBJ_NOFLAGS, ECMD_OK,
         STRANGLED } from './const.js';
import { COIN_CLASS, FOOD_CLASS } from './objects.js';
import { You, You_cant } from './display.js';
import { W_ARMOR, W_TOOL, W_AMUL, W_SADDLE } from './const.js';

// C ref: eat.c tintxts[] (only the names are used so far)
const tintxts = [
    "rotten", /* ROTTEN_TIN = 0 */
    "homemade", /* HOMEMADE_TIN = 1 */
    "soup made from", "french fried", "pickled", "boiled", "smoked",
    "dried", "deep fried", "szechuan", "broiled", "stir fried", "sauteed",
    "candied", "pureed", "",
];
const TTSZ = tintxts.length;

/* C ref: mondata.h is_rider(), vegan(), vegetarian() */
function is_rider_pm(mnum) {
    return mnum === M.PM_DEATH || mnum === M.PM_FAMINE || mnum === M.PM_PESTILENCE;
}
function vegan(ptr) {
    return (ptr.mlet === M.S_BLOB || ptr.mlet === M.S_JELLY
            || ptr.mlet === M.S_FUNGUS || ptr.mlet === M.S_VORTEX
            || ptr.mlet === M.S_LIGHT
            || ((ptr.mlet === M.S_ELEMENTAL && ptr !== mons[M.PM_STALKER]))
            || (ptr.mlet === M.S_GOLEM && ptr !== mons[M.PM_FLESH_GOLEM]
                && ptr !== mons[M.PM_LEATHER_GOLEM])
            || ptr.mlet === M.S_GHOST /* noncorporeal() */);
}
function vegetarian(ptr) {
    return vegan(ptr)
        || (ptr.mlet === M.S_PUDDING && ptr !== mons[M.PM_BLACK_PUDDING]);
}
/* C ref: eat.c nonrotting_corpse() */
function nonrotting_corpse(mnum) {
    return mnum === M.PM_LIZARD || mnum === M.PM_LICHEN
        || is_rider_pm(mnum) || mnum === M.PM_ACID_BLOB;
}

// C ref: eat.c tin_variety()
export function tin_variety(obj, displ /* we're just displaying */) {
    let r;
    const mnum = obj.corpsenm;

    if (obj.spe === 1) {
        r = SPINACH_TIN;
    } else if (obj.cursed) {
        r = ROTTEN_TIN; /* always rotten if cursed */
    } else if (obj.spe < 0) {
        r = -(obj.spe);
        --r; /* get rid of the offset */
    } else {
        r = rn2(TTSZ - 1);
    }

    if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7))
        r = ROTTEN_TIN; /* some homemade tins go bad */

    if (r === ROTTEN_TIN && (mnum >= M.LOW_PM && nonrotting_corpse(mnum)))
        r = HOMEMADE_TIN; /* lizards don't rot */
    return r;
}

// C ref: eat.c tin_details() -- returns the new buf (C edits it in
// place); buf already contains the word "tin"
export function tin_details(obj, mnum, buf) {
    if (!obj || buf == null)
        return buf;

    const r = tin_variety(obj, true);

    if (r === SPINACH_TIN)
        buf += " of spinach";
    else if (mnum === NON_PM)
        buf = "empty tin";
    else {
        if ((obj.cknown || game.iflags?.override_ID) && obj.spe < 0) {
            if (r === ROTTEN_TIN || r === HOMEMADE_TIN) {
                /* put these before the word tin */
                buf = `${tintxts[r]} ${buf} of `;
            } else {
                buf += ` of ${tintxts[r]} `;
            }
        } else {
            buf += " of ";
        }
        if (vegetarian(mons[mnum]))
            buf += mons[mnum].pmnames[NEUTRAL];
        else
            buf += `${mons[mnum].pmnames[NEUTRAL]} meat`;
    }
    return buf;
}

/* C ref: mondata.h carnivorous(), herbivorous(), metallivorous() */
function carnivorous(ptr) { return (ptr.mflags1 & M1_CARNIVORE) !== 0; }
function herbivorous(ptr) { return (ptr.mflags1 & M1_HERBIVORE) !== 0; }
function metallivorous(ptr) { return (ptr.mflags1 & M1_METALLIVORE) !== 0; }
/* C ref: role.h Role_if(), Race_if() */
function Role_if(pm) { return game.urole.mnum === pm; }
function Race_if(pm) { return game.urace.mnum === pm; }

// C ref: eat.c init_uhunger()
export function init_uhunger() {
    const g = game;
    const u = g.u;

    if (!g.disp) g.disp = {};
    g.disp.botl = (u.uhs !== NOT_HUNGRY || u.atemp.a[A_STR] < 0);
    u.uhunger = 900;
    u.uhs = NOT_HUNGRY;
    if (u.atemp.a[A_STR] < 0) {
        u.atemp.a[A_STR] = 0;
        throw new Error('init_uhunger(): encumber_msg() not ported yet');
    }
}

// C ref: eat.c is_fainted()
function is_fainted() {
    return game.u.uhs === FAINTED;
}

// C ref: youprop.h Unaware -- (multi < 0 && (unconscious() || is_fainted()))
function Unaware() {
    /* unconscious() (asleep etc.) isn't ported yet; only fainting from
       hunger is tracked here */
    return game.multi < 0 && is_fainted();
}

// C ref: eat.c gethungry()
/* as time goes by - called by moveloop(every move) & domove(melee attack) */
export async function gethungry() {
    const g = game;
    const u = g.u;
    const P = u.uprops;
    let accessorytime;

    if (u.uinvulnerable || g.iflags.debug_hunger)
        return; /* you don't feel hungrier */

    /* C ref: youprop.h Slow_digestion */
    const Slow_digestion = P[SLOW_DIGESTION].intrinsic || P[SLOW_DIGESTION].extrinsic;

    /* being polymorphed into a creature which doesn't eat prevents
       this first uhunger decrement, but to stay in such form the hero
       will need to wear an Amulet of Unchanging so still burn a small
       amount of nutrition in the 'moves % 20' ring/amulet check below */
    if ((!Unaware() || !rn2(10)) /* slow metabolic rate while asleep */
        && (carnivorous(g.youmonst.data)
            || herbivorous(g.youmonst.data)
            || metallivorous(g.youmonst.data))
        && !Slow_digestion)
        u.uhunger--; /* ordinary food consumption */

    /*
     * 5.0:  trigger is randomized instead of (moves % N).  Makes
     * ring juggling ineffective.  Also causes melee-induced hunger to
     * vary from turn-based hunger instead of just replicating that.
     */
    accessorytime = rn2(20); /* rn2(20) replaces (int) (svm.moves % 20L) */
    if (accessorytime % 2) { /* odd */
        /* Regeneration uses up food, unless due to an artifact */
        if ((P[REGENERATION].intrinsic & ~FROMFORM)
            || (P[REGENERATION].extrinsic & ~(W_ARTI | W_WEP)))
            u.uhunger--;
        if (near_capacity() > SLT_ENCUMBER)
            u.uhunger--;
    } else { /* even */
        if (P[HUNGER].intrinsic || P[HUNGER].extrinsic) /* Hunger */
            u.uhunger--;
        /* Conflict uses up food too */
        if (P[CONFLICT].intrinsic || (P[CONFLICT].extrinsic & (~W_ARTI)))
            u.uhunger--;
        const uleft = g.uleft, uright = g.uright, uamul = g.uamul;
        const EProtection = P[PROTECTION].extrinsic;
        switch (accessorytime) { /* note: use even cases among 0..19 only */
        case 0:
            if (Slow_digestion
                && (!uright || uright.otyp !== RIN_SLOW_DIGESTION)
                && (!uleft || uleft.otyp !== RIN_SLOW_DIGESTION))
                u.uhunger--;
            break;
        case 4:
            if (uleft && uleft.otyp !== MEAT_RING
                && (uleft.spe
                    || !objects[uleft.otyp].oc_charged
                    || (uleft.otyp === RIN_PROTECTION
                        && ((EProtection & ~W_RINGL) === 0
                            || ((EProtection & ~W_RINGL) === W_RINGR
                                && uright && uright.otyp === RIN_PROTECTION
                                && !uright.spe)))))
                u.uhunger--;
            break;
        case 8:
            if (uamul && uamul.otyp !== FAKE_AMULET_OF_YENDOR)
                u.uhunger--;
            break;
        case 12:
            if (uright && uright.otyp !== MEAT_RING
                && (uright.spe
                    || !objects[uright.otyp].oc_charged
                    || (uright.otyp === RIN_PROTECTION
                        && (EProtection & ~W_RINGR) === 0)))
                u.uhunger--;
            break;
        case 16:
            if (u.uhave.amulet)
                u.uhunger--;
            break;
        default:
            break;
        }
    }
    await newuhs(true);
}

/* C ref: eat.c newuhs() static save_hs / saved_hs */
let save_hs = 0;
let saved_hs = false;

// C ref: eat.c morehungry()
/* called when eating a corpse, jumping, casting a spell &c */
export async function morehungry(num) {
    game.u.uhunger -= num;
    await newuhs(true);
}

// C ref: eat.c newuhs()
/* compute and comment on your (new?) hunger status */
export async function newuhs(incr) {
    const g = game;
    const u = g.u;
    let newhs;
    const h = u.uhunger;

    newhs = (h > 1000)
                ? SATIATED
                : (h > 150) ? NOT_HUNGRY
                            : (h > 50) ? HUNGRY : (h > 0) ? WEAK : FAINTING;

    /* While you're eating, you may pass from WEAK to HUNGRY to NOT_HUNGRY.
       [occupation == eatfood]: eating isn't ported yet */
    if (g.force_save_hs) {
        if (!saved_hs) {
            save_hs = u.uhs;
            saved_hs = true;
        }
        u.uhs = newhs;
        return;
    } else {
        if (saved_hs) {
            u.uhs = save_hs;
            saved_hs = false;
        }
    }

    /* C ref: youprop.h Hallucination */
    const Hallucination = u.uprops[HALLUC].intrinsic
        && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic);

    if (newhs === FAINTING) {
        /* u,uhunger is likely to be negative at this point */
        const uhunger_div_by_10 = Math.sign(u.uhunger)
                                  * Math.trunc((Math.abs(u.uhunger) + 5) / 10);

        if (is_fainted())
            newhs = FAINTED;
        if (u.uhs <= WEAK || rn2(20 - uhunger_div_by_10) >= 19) {
            if (!is_fainted() && g.multi >= 0 /* %% */) {
                const duration = 10 - uhunger_div_by_10;

                /* stop what you're doing, then faint */
                /* stop_occupation(): occupations aren't ported yet */
                await pline("You faint from lack of food.");
                /* incr_itimeout(&HDeaf, duration) */
                u.uprops[DEAF].intrinsic += duration;
                g.disp_botl = true;
                /* nomul(-duration) */
                g.multi = -duration;
                g.multi_reason = "fainted from lack of food";
                g.nomovemsg = "You regain consciousness.";
                /* afternmv = unfaint; selftouch(): not ported yet */
                newhs = FAINTED;
            }

        /* this used to be -(200 + 20 * Con) but that was when being asleep
           suppressed per-turn uhunger decrement but being fainted didn't;
           now uhunger becomes more negative at a slower rate */
        } else if (u.uhunger < -(100 + 10 * ACURR(A_CON))) {
            u.uhs = STARVED;
            g.disp_botl = true;
            await pline("You die from starvation.");
            /* done(STARVING): end of game isn't ported yet */
            return;
        }
    }

    if (newhs !== u.uhs) {
        if (newhs >= WEAK && u.uhs < WEAK) {
            u.atemp.a[A_STR] = -1; /* temporary loss overrides Fixed_abil */
        } else if (newhs < WEAK && u.uhs >= WEAK) {
            u.atemp.a[A_STR] = 0; /* repair of loss also overrides Fixed_abil */
        }

        switch (newhs) {
        case HUNGRY:
            if (Hallucination) {
                await pline(!incr ? "You now have a lesser case of the munchies."
                                  : "You are getting the munchies.");
            } else
                await pline(`You ${!incr ? "only feel hungry now"
                                   : (u.uhunger < 145) ? "feel hungry"
                                     : "are beginning to feel hungry"}.`);
            /* stop_occupation(), end_running(TRUE): not ported yet */
            break;
        case WEAK:
            if (Hallucination)
                await pline(!incr ? "You still have the munchies."
                    : "The munchies are interfering with your motor capabilities.");
            else if (incr && (Role_if(PM_WIZARD) || Race_if(PM_ELF)
                              || Role_if(PM_VALKYRIE)))
                await pline(`${(Role_if(PM_WIZARD) || Role_if(PM_VALKYRIE))
                                   ? g.urole.name.m : "Elf"} needs food, badly!`);
            else
                await pline(`You ${!incr ? "are still"
                                   : (u.uhunger < 45) ? "feel"
                                     : "are beginning to feel"} weak.`);
            /* stop_occupation(), end_running(TRUE): not ported yet */
            break;
        }
        u.uhs = newhs;
        g.disp_botl = true;
        if ((u.umonnum !== u.umonster ? u.mh : u.uhp) < 1) {
            await pline("You die from hunger and exhaustion.");
            /* done(STARVING): end of game isn't ported yet */
            return;
        }
    }
}

/* C ref: mondata.h is_giant() */
function is_giant(ptr) { return (ptr.mflags2 & M.M2_GIANT) !== 0; }

// C ref: eat.c intrinsic_possible()
/* intrinsic_possible() returns TRUE iff a monster can potentially
 * convey an intrinsic to the hero (or a pet) when its corpse is eaten */
function intrinsic_possible(type, ptr) {
    let res = 0;

    switch (type) {
    case FIRE_RES:
        res = (ptr.mconveys & M.MR_FIRE) !== 0;
        break;
    case SLEEP_RES:
        res = (ptr.mconveys & M.MR_SLEEP) !== 0;
        break;
    case COLD_RES:
        res = (ptr.mconveys & M.MR_COLD) !== 0;
        break;
    case DISINT_RES:
        res = (ptr.mconveys & M.MR_DISINT) !== 0;
        break;
    case SHOCK_RES: /* shock (electricity) resistance */
        res = (ptr.mconveys & M.MR_ELEC) !== 0;
        break;
    case POISON_RES:
        res = (ptr.mconveys & M.MR_POISON) !== 0;
        break;
    case ACID_RES:
        res = (ptr.mconveys & M.MR_ACID) !== 0;
        break;
    case STONE_RES:
        res = (ptr.mconveys & M.MR_STONE) !== 0;
        break;
    case TELEPORT:
        res = can_teleport(ptr);
        break;
    case TELEPORT_CONTROL:
        res = control_teleport(ptr);
        break;
    case TELEPAT:
        res = telepathic(ptr);
        break;
    default:
        /* res stays 0 */
        break;
    }
    return res;
}

// C ref: eat.c should_givit()
/* The "do we or do we not give the intrinsic" logic from givit(), extracted
 * into its own function. Depends on the monster's level and the type of
 * intrinsic it is trying to give you.
 */
export function should_givit(type, ptr) {
    let chance;

    /* some intrinsics are easier to get than others */
    switch (type) {
    case POISON_RES:
        if ((ptr === mons[M.PM_KILLER_BEE] || ptr === mons[M.PM_SCORPION])
            && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }

    return (ptr.mlevel > rn2(chance));
}

// C ref: eat.c corpse_intrinsic()
/* Choose (one of) the intrinsics granted by a corpse, and return it.
 * If this corpse gives no intrinsics, return 0.
 * For the special not-real-prop cases, return a negative value. */
export function corpse_intrinsic(ptr) {
    /* Check the monster for all of the intrinsics.  If this
     * monster can give more than one, pick one to try to give
     * from among all it can give.
     */
    const conveys_STR = is_giant(ptr);
    let i;
    let count = 0; /* number of possible intrinsics */
    let prop = 0;   /* which one we will try to give */

    if (conveys_STR) {
        count = 1;
        prop = -1; /* use -1 as fake prop index for STR */
    }
    for (i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        /* a 1 in count chance of replacing the old choice
           with this one, and a count-1 in count chance
           of keeping the old choice (note that 1 in 1 and
           0 in 1 are what we want for the first candidate) */
        if (!rn2(count)) {
            prop = i;
        }
    }
    /* if strength is the only candidate, give it 50% chance */
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}

let getobj_else = 0;

// C ref: eat.c eat_ok() -- getobj callback for object to eat
function eat_ok(obj) {
    /* 'getobj_else' will be non-zero if floor food is present and
       player declined to eat that; used to insert "else" into
       "you don't have anything [else] to eat" if not carrying any food */
    if (!obj)
        return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (is_edible(obj))
        return GETOBJ_SUGGEST;

    /* make sure to exclude, not downplay, gold (if not is_edible) in order to
     * produce the "You cannot eat gold" message in getobj */
    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    return GETOBJ_EXCLUDE_SELECTABLE;
}

// C ref: eat.c floorfood() -- returns an object to eat; for #eat only so
// far (sacrifice and tinning aren't ported), and eating floor food or
// metallivore food is not ported yet
async function floorfood(verb, corpsecheck) {
    const uptr = game.youmonst.data;
    const feeding = (verb === "eat");
    let otmp;

    getobj_else = 0; /* haven't asked about floor food */
    /* if we can't touch floor objects then use invent food only;
       same when 'm' prefix is used--for #eat, it means "skip floor food" */
    const ux = game.u.ux, uy = game.u.uy;
    let skipfloor = !!(game.iflags?.menu_requested
                       || !can_reach_floor(true) || (feeding && game.u.usteed));
    if (!skipfloor && (is_pool(ux, uy) || is_lava(ux, uy)))
        throw new Error('floorfood(): eating over water/lava not ported yet');
    if (!skipfloor) {
        if (feeding && (uptr.mflags1 & M1_METALLIVORE))
            throw new Error('floorfood(): metallivore floor food not ported yet');

        /* Is there some food (probably a heavy corpse) here on the ground? */
        for (const o of game.level.objects || []) {
            if (o.ox !== ux || o.oy !== uy || o.where !== 'OBJ_FLOOR')
                continue;
            if (corpsecheck ? false
                : feeding ? (o.oclass !== COIN_CLASS && is_edible(o))
                          : o.oclass === FOOD_CLASS)
                throw new Error('floorfood(): "There is <food> here; eat it?" not ported yet');
        }
    }

    /* skipfloor: */
    if (feeding) {
        otmp = await getobj("eat", eat_ok, GETOBJ_NOFLAGS);
    } else {
        throw new Error('floorfood(): sacrifice/tinning not ported yet');
    }
    /* resetting 'getobj_else' here isn't essential */
    getobj_else = 0;
    void skipfloor;
    return otmp;
}

// C ref: eat.c doeat() -- the #eat command
export async function doeat() {
    const p = game.u.uprops?.[STRANGLED];
    if (p?.intrinsic || p?.extrinsic) {
        await pline("If you can't breathe air, how can you consume solids?");
        return ECMD_OK;
    }
    const otmp = await floorfood("eat", 0);
    if (!otmp)
        return ECMD_OK;
    if (await check_capacity(null))
        return ECMD_OK;

    if (game.u.uedibility)
        throw new Error('doeat(): edibility_prompts() not ported yet');
    /* We have to make non-foods take 1 move to eat, unless we want to
     * do ridiculous amounts of coding to deal with partly eaten plate
     * mails, players who polymorph back to human in the middle of their
     * metallic meal, etc....
     */
    if (!is_edible(otmp)) {
        await You("cannot eat that!");
        return ECMD_OK;
    } else if ((otmp.owornmask & (W_ARMOR | W_TOOL | W_AMUL | W_SADDLE)) !== 0) {
        /* let them eat rings */
        await You_cant("eat something you're wearing.");
        return ECMD_OK;
    }
    throw new Error('doeat(): eating (start_eating()) not ported yet');
}
