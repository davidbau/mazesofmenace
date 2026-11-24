// pray.js — prayer and god-name helpers.
// C ref: pray.c
//
// The god-name helpers, and #pray: dopray(), can_pray(), in_trouble(),
// prayer_done(), angrygods(), gods_upset(), godvoice(), and pleased() up
// to its trouble fixing and boons.

import { game } from './gstate.js';
import { livelog_printf } from './display.js';
import { LL_CONDUCT } from './const.js';
import { rn2, rn1, rnl, rnz, ROLL_FROM, rn2_on_display_rng } from './rng.js';
import { roles, randrole } from './role.js';
import { HALLUC_RES, LEVITATION, FLYING } from './const.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, IS_ALTAR, Amask2align,
         AM_MASK, AM_SHRINE, PASSES_WALLS, STONED, SLIMED, STRANGLED, SICK,
         BLINDED, DEAF, STUNNED, CONFUSION, HALLUC, WOUNDED_LEGS, UNCHANGING,
         TT_LAVA, TT_BURIEDBALL, WEAK, HUNGRY, EXT_ENCUMBER, HVY_ENCUMBER,
         A_STR, A_WIS, A_MAX, W_SADDLE, LOW_PM, SDOOR, SCORR, TIMEOUT,
         IS_OBSTRUCTED, isok, ECMD_OK, ECMD_TIME, M_AP_FURNITURE,
         MCORPSENM, MAXULEV, BOLT_LIM, TELL, NOTELL } from './const.js';
/* C ref: defsym.h S_altar (cmap index) */
const S_altar = 33;
import { M1_NOHANDS, M2_ROCKTHROW, S_HUMAN, PM_CLERIC, PM_KNIGHT, S_LICH, S_GHOST,
         S_VAMPIRE, S_WRAITH, S_MUMMY, S_ZOMBIE } from './monsters.js';
import { known_spell, spelleffects, can_chant } from './spell.js';
import { BOULDER, LOADSTONE, HELM_OF_OPPOSITE_ALIGNMENT, LEVITATION_BOOTS,
         RIN_LEVITATION, GAUNTLETS_OF_FUMBLING, FUMBLE_BOOTS, SADDLE,
         POT_WATER, SPE_TURN_UNDEAD } from './objects.js';
import { pline } from './display.js';
import { In_hell } from './dungeon.js';
import { is_demon, is_undead, is_vampshifter } from './mondata.js';
import { ABASE, AMAX, adjattrib, adjalign, change_luck, exercise } from './attrib.js';
import { losexp } from './exper.js';
import { near_capacity, nomul } from './hack.js';
import { paranoid_query } from './cmd.js';
import { welded, bimanual } from './wield.js';
import { which_armor, sobj_at, is_pool, is_lava, m_at, set_malign } from './makemon.js';
import { confers_luck } from './timeout.js';
import { region_danger } from './region.js';
import { xlev_to_rank } from './botl.js';
import { tty_yn_function } from './wintty.js';
import { couldsee } from './vision.js';
import { killed } from './mon.js';
import { monflee } from './monmove.js';
import { resist } from './zap.js';
import { aggravate } from './potion.js';
import { GLIB, PLNMSG_OBJ_GLOWS, TELEDS_NO_FLAGS, STOMACH, SICK_ALL, FIXED_ABIL, EYE } from "./const.js";
import { AMULET_OF_STRANGULATION } from './objects.js';
import { M1_NOEYES, PM_CYCLOPS, PM_FLOATING_EYE, mons } from './monsters.js';
import { Yobjnam2, vtense, makeplural } from './objnam.js';
import { hcolor } from './do_name.js';
import { body_part } from './insight.js';
import { uncurse } from './mkobj.js';
import { make_stoned, make_slimed, make_sick, make_blinded, make_deaf, make_stunned,
         make_confused, make_hallucinated, set_itimeout } from './potion.js';
import { Your, You, You_feel, Blind } from './display.js';
import { useup } from './invent.js';
import { safe_teleds } from './teleport.js';
import { reset_utrap, heal_legs } from './trap.js';
import { init_uhunger } from './eat.js';
import { region_safety } from './region.js';
import { rnd, d } from './rng.js';
import { setuhpmax } from './attrib.js';
import { unpunish, punish } from './read.js';
import { rndcurse, attrcurse } from './sit.js';
import { An } from './objnam.js';
import { ANTIMAGIC } from './const.js';
const NH_BLACK = "black"; /* color.h */
import { encumber_msg } from './pickup.js';
/* C ref: hack.h mdistu() */
function mdistu(mon) {
    const dx = mon.mx - game.u.ux, dy = mon.my - game.u.uy;
    return dx * dx + dy * dy;
}

// C ref: pray.c Moloch
const Moloch = "Moloch";

// C ref: pray.c u_gname()
/* returns the name of the hero's deity */
export function u_gname() {
    return align_gname(game.u.ualign.type);
}

// C ref: pray.c altarmask_at()
/* the altarmask of the altar at x,y, or of a mimic posing as one */
export function altarmask_at(x, y) {
    let res = 0;

    if (isok(x, y)) {
        const mon = m_at(x, y);

        if (mon && mon.m_ap_type === M_AP_FURNITURE
            && mon.mappearance === S_altar)
            res = (MCORPSENM(mon) !== -1) /* has_mcorpsenm(mon) */
                  ? MCORPSENM(mon) : 0;
        else if (IS_ALTAR(game.level.at(x, y).typ))
            res = game.level.at(x, y).altarmask;
    }
    return res;
}

// C ref: pray.c align_gname()
export function align_gname(alignment) {
    let gnam;

    switch (alignment) {
    case A_NONE:
        gnam = Moloch;
        break;
    case A_LAWFUL:
        gnam = game.urole.lgod;
        break;
    case A_NEUTRAL:
        gnam = game.urole.ngod;
        break;
    case A_CHAOTIC:
        gnam = game.urole.cgod;
        break;
    default:
        // impossible("unknown alignment.");
        gnam = "someone";
        break;
    }
    if (gnam[0] === '_')
        gnam = gnam.slice(1);
    return gnam;
}

// C ref: pray.c hallu_gods[]
const hallu_gods = [
    "the Flying Spaghetti Monster", /* Church of the FSM */
    "Eris",                         /* Discordianism */
    "the Martians",                 /* every science fiction ever */
    "Xom",                          /* Crawl */
    "AnDoR dRaKoN",                 /* ADOM */
    "the Central Bank of Yendor",   /* economics */
    "Tooth Fairy",                  /* real world(?) */
    "Om",                           /* Discworld */
    "Yawgmoth",                     /* Magic: the Gathering */
    "Morgoth",                      /* LoTR */
    "Cthulhu",                      /* Lovecraft */
    "the Ori",                      /* Stargate */
    "destiny",                      /* why not? */
    "your Friend the Computer",     /* Paranoia */
];

/* C ref: you.h Hallucination -- HHallucination && !Halluc_resistance */
function Hallucination() {
    const P = game.u.uprops;
    return !!((P[HALLUC]?.intrinsic || P[HALLUC]?.extrinsic)
              && !(P[HALLUC_RES]?.intrinsic || P[HALLUC_RES]?.extrinsic));
}

// C ref: pray.c halu_gname()
/* hallucination handling for priest/minion names: select a random god
   iff character is hallucinating */
export function halu_gname(alignment) {
    let gnam = null;
    let which;

    if (!Hallucination())
        return align_gname(alignment);

    /* Some roles (Priest) don't have a pantheon unless we're playing as
       that role, so keep trying until we get a role which does have one.
       [If playing a Priest, the current pantheon will be twice as likely
       to get picked as any of the others.  That's not significant enough
       to bother dealing with.] */
    do
        which = randrole(true);
    while (!roles[which].lgod);

    switch (rn2_on_display_rng(9)) {
    case 0:
    case 1:
        gnam = roles[which].lgod;
        break;
    case 2:
    case 3:
        gnam = roles[which].ngod;
        break;
    case 4:
    case 5:
        gnam = roles[which].cgod;
        break;
    case 6:
    case 7:
        gnam = hallu_gods[rn2_on_display_rng(hallu_gods.length)];
        break;
    case 8:
        gnam = Moloch;
        break;
    default:
        /* impossible("rn2 broken in halu_gname?!?") */
        break;
    }
    if (!gnam) {
        /* impossible("No random god name?") */
        gnam = "your Friend the Computer"; /* Paranoia */
    }
    if (gnam[0] === '_')
        gnam = gnam.slice(1);
    return gnam;
}

// C ref: pray.c align_gtitle()
/* return "god" or "goddess" */
export function align_gtitle(alignment) {
    let gnam;
    let result = "god";

    switch (alignment) {
    case A_LAWFUL:
        gnam = game.urole.lgod;
        break;
    case A_NEUTRAL:
        gnam = game.urole.ngod;
        break;
    case A_CHAOTIC:
        gnam = game.urole.cgod;
        break;
    default:
        gnam = null;
        break;
    }
    if (gnam && gnam[0] === '_')
        result = "goddess";
    return result;
}

// ── C ref: pray.c #pray: dopray(), can_pray(), in_trouble(), prayer_done(),
//    angrygods(), gods_upset(), pleased() (the parts reached so far) ──

// C ref: pray.c godvoices[]
const godvoices = [
    "booms out", "thunders", "rings out", "booms",
];

const PIOUS = 20;
const DEVOUT = 14;
const STRIDENT = 4;

const TROUBLE_STONED = 14;
const TROUBLE_SLIMED = 13;
const TROUBLE_STRANGLED = 12;
const TROUBLE_LAVA = 11;
const TROUBLE_SICK = 10;
const TROUBLE_STARVING = 9;
const TROUBLE_REGION = 8; /* stinking cloud */
const TROUBLE_HIT = 7;
const TROUBLE_LYCANTHROPE = 6;
const TROUBLE_COLLAPSING = 5;
const TROUBLE_STUCK_IN_WALL = 4;
const TROUBLE_CURSED_LEVITATION = 3;
const TROUBLE_UNUSEABLE_HANDS = 2;
const TROUBLE_CURSED_BLINDFOLD = 1;

const TROUBLE_PUNISHED = (-1);
const TROUBLE_FUMBLING = (-2);
const TROUBLE_CURSED_ITEMS = (-3);
const TROUBLE_SADDLE = (-4);
const TROUBLE_BLIND = (-5);
const TROUBLE_POISONED = (-6);
const TROUBLE_WOUNDED_LEGS = (-7);
const TROUBLE_HUNGRY = (-8);
const TROUBLE_STUNNED = (-9);
const TROUBLE_CONFUSED = (-10);
const TROUBLE_HALLUCINATION = (-11);

/* C ref: youprop.h -- intrinsic/extrinsic property tests */
function HProp(prop) { return game.u.uprops[prop]?.intrinsic || 0; }
function EProp(prop) { return game.u.uprops[prop]?.extrinsic || 0; }
function uhave(prop) { return !!(HProp(prop) || EProp(prop)); }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Luck() { return (game.u.uluck || 0) + (game.u.moreluck || 0); }
function Inhell() { return In_hell(game.u.uz); }
/* C ref: pray.c ugod_is_angry(), on_altar(), on_shrine(), a_align() */
function ugod_is_angry() { return game.u.ualign.record < 0; }
function on_altar() { return IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ); }
function on_shrine() {
    return (game.level.at(game.u.ux, game.u.uy).altarmask & AM_SHRINE) !== 0;
}
function a_align(x, y) {
    return Amask2align(game.level.at(x, y).altarmask & AM_MASK);
}
/* C ref: mondata.h nohands(), nolimbs(), throws_rocks() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
function throws_rocks(ptr) { return (ptr.mflags2 & M2_ROCKTHROW) !== 0; }
/* C ref: obj.h Cursed_obj() */
function Cursed_obj(obj, typ) { return !!(obj && obj.otyp === typ && obj.cursed); }

// C ref: engrave.c freehand()
function freehand() {
    const uwep = game.uwep;
    return (!uwep || !welded(uwep)
            || (!bimanual(uwep) && (!game.uarms || !game.uarms.cursed)));
}

// C ref: pray.c critically_low_hp()
/* critically low hit points if hp <= 5 or hp <= maxhp/N for some N */
export function critically_low_hp(only_if_injured) {
    const u = game.u;
    let divisor, hplim,
        curhp = Upolyd() ? u.mh : u.uhp,
        maxhp = Upolyd() ? u.mhmax : u.uhpmax;

    if (only_if_injured && !(curhp < maxhp))
        return false;
    hplim = 15 * u.ulevel;
    if (maxhp > hplim)
        maxhp = hplim;
    /* 7 used to be the unconditional divisor */
    switch (xlev_to_rank(u.ulevel)) { /* maps 1..30 into 0..8 */
    case 0:
    case 1:
        divisor = 5;
        break; /* explvl 1 to 5 */
    case 2:
    case 3:
        divisor = 6;
        break; /* explvl 6 to 13 */
    case 4:
    case 5:
        divisor = 7;
        break; /* explvl 14 to 21 */
    case 6:
    case 7:
        divisor = 8;
        break; /* explvl 22 to 29 */
    default:
        divisor = 9;
        break; /* explvl 30+ */
    }
    /* 5 is a magic number in TROUBLE_HIT handling below */
    return (curhp <= 5 || curhp * divisor <= maxhp);
}

// C ref: pray.c blocked_boulder()
function blocked_boulder(dx, dy) {
    const u = game.u;
    let count = 0;

    for (const otmp of game.level.objects || [])
        if (otmp.where === 'OBJ_FLOOR' && otmp.ox === u.ux + dx
            && otmp.oy === u.uy + dy && otmp.otyp === BOULDER)
            count += otmp.quan;

    const nx = u.ux + 2 * dx, ny = u.uy + 2 * dy; /* next spot beyond boulder(s) */
    switch (count) {
    case 0:
        /* no boulders--not blocked */
        return false;
    case 1:
        /* possibly blocked depending on if it's pushable */
        break;
    case 2:
        /* this is only approximate since multiple boulders might sink */
        if (isok(nx, ny) && (is_pool(nx, ny) || is_lava(nx, ny))) /* is_pool_or_lava() */
            break; /* still need Sokoban check below */
        /*FALLTHRU*/
    default:
        /* more than one boulder--blocked after they push the top one;
           don't force them to push it first to find out */
        return true;
    }

    if (dx && dy && game.level.flags.sokoban_rules) /* can't push boulder diagonally in Sokoban */
        return true;
    if (!isok(nx, ny))
        return true;
    if (IS_OBSTRUCTED(game.level.at(nx, ny).typ))
        return true;
    if (sobj_at(BOULDER, nx, ny))
        return true;

    return false;
}

// C ref: pray.c stuck_in_wall()
/* return True if surrounded by impassible rock, regardless of the state
   of your own location (for example, inside a doorless closet) */
export function stuck_in_wall() {
    const u = game.u;
    let count = 0;

    if (uhave(PASSES_WALLS))
        return false;
    for (let i = -1; i <= 1; i++) {
        const x = u.ux + i;
        for (let j = -1; j <= 1; j++) {
            if (!i && !j)
                continue;
            const y = u.uy + j;
            if (!isok(x, y)
                || (IS_OBSTRUCTED(game.level.at(x, y).typ)
                    && (game.level.at(x, y).typ !== SDOOR
                        && game.level.at(x, y).typ !== SCORR))
                || (blocked_boulder(i, j) && !throws_rocks(game.youmonst.data)))
                ++count;
        }
    }
    return (count === 8);
}

// C ref: pray.c worst_cursed_item()
function worst_cursed_item() {
    const g = game;
    let otmp;

    /* if strained or worse, check for loadstone first */
    if (near_capacity() >= HVY_ENCUMBER) {
        for (otmp = g.invent; otmp; otmp = otmp.nobj)
            if (Cursed_obj(otmp, LOADSTONE))
                return otmp;
    }
    /* weapon takes precedence if it is interfering
       with taking off a ring or putting on a shield */
    if (welded(g.uwep) && (g.uright || bimanual(g.uwep))) { /* weapon */
        otmp = g.uwep;
    /* gloves come next, due to rings */
    } else if (g.uarmg && g.uarmg.cursed) { /* gloves */
        otmp = g.uarmg;
    /* then shield due to two handed weapons and spells */
    } else if (g.uarms && g.uarms.cursed) { /* shield */
        otmp = g.uarms;
    /* then cloak due to body armor */
    } else if (g.uarmc && g.uarmc.cursed) { /* cloak */
        otmp = g.uarmc;
    } else if (g.uarm && g.uarm.cursed) { /* suit */
        otmp = g.uarm;
    /* if worn helmet of opposite alignment is making you an adherent
       of the current god, he/she/it won't uncurse that for you */
    } else if (g.uarmh && g.uarmh.cursed /* helmet */
               && g.uarmh.otyp !== HELM_OF_OPPOSITE_ALIGNMENT) {
        otmp = g.uarmh;
    } else if (g.uarmf && g.uarmf.cursed) { /* boots */
        otmp = g.uarmf;
    } else if (g.uarmu && g.uarmu.cursed) { /* shirt */
        otmp = g.uarmu;
    } else if (g.uamul && g.uamul.cursed) { /* amulet */
        otmp = g.uamul;
    } else if (g.uleft && g.uleft.cursed) { /* left ring */
        otmp = g.uleft;
    } else if (g.uright && g.uright.cursed) { /* right ring */
        otmp = g.uright;
    } else if (g.ublindf && g.ublindf.cursed) { /* eyewear */
        otmp = g.ublindf; /* must be non-blinding lenses */
    /* if weapon wasn't handled above, do it now */
    } else if (welded(g.uwep)) { /* weapon */
        otmp = g.uwep;
    /* active secondary weapon even though it isn't welded */
    } else if (g.uswapwep && g.uswapwep.cursed && g.u.twoweap) {
        otmp = g.uswapwep;
    /* all worn items ought to be handled by now */
    } else {
        for (otmp = g.invent; otmp; otmp = otmp.nobj) {
            if (!otmp.cursed)
                continue;
            if (otmp.otyp === LOADSTONE || confers_luck(otmp))
                break;
        }
    }
    return otmp || null;
}

// C ref: pray.c in_trouble()
/*
 * Return 0 if nothing particular seems wrong, positive numbers for
 * serious trouble, and negative numbers for comparative annoyances.
 * This returns the worst problem. There may be others, and the gods
 * may fix more than one.
 */
function in_trouble() {
    const g = game;
    const u = g.u;

    /*
     * major troubles
     */
    if (HProp(STONED))
        return TROUBLE_STONED;
    if (HProp(SLIMED))
        return TROUBLE_SLIMED;
    if (HProp(STRANGLED))
        return TROUBLE_STRANGLED;
    if (u.utrap && u.utraptype === TT_LAVA)
        return TROUBLE_LAVA;
    if (HProp(SICK))
        return TROUBLE_SICK;
    if (u.uhs >= WEAK)
        return TROUBLE_STARVING;
    if (region_danger())
        return TROUBLE_REGION;
    if ((!Upolyd() || uhave(UNCHANGING)) && critically_low_hp(false))
        return TROUBLE_HIT;
    if (u.ulycn >= LOW_PM) /* ismnum(u.ulycn) */
        return TROUBLE_LYCANTHROPE;
    if (near_capacity() >= EXT_ENCUMBER && AMAX(A_STR) - ABASE(A_STR) > 3)
        return TROUBLE_COLLAPSING;
    if (stuck_in_wall())
        return TROUBLE_STUCK_IN_WALL;
    if (Cursed_obj(g.uarmf, LEVITATION_BOOTS)
        || (g.uleft && g.uleft.otyp === RIN_LEVITATION)
        || (g.uright && g.uright.otyp === RIN_LEVITATION)) {
        if (Cursed_obj(g.uarmf, LEVITATION_BOOTS))
            return TROUBLE_CURSED_LEVITATION;
        /* stuck_ring(): do_wear.c isn't ported yet */
        throw new Error('in_trouble(): stuck_ring() not ported yet');
    }
    if (nohands(g.youmonst.data) || !freehand()) {
        /* for bag/box access [cf use_container()]...
           make sure it's a case that we know how to handle;
           otherwise "fix all troubles" would get stuck in a loop */
        if (welded(g.uwep))
            return TROUBLE_UNUSEABLE_HANDS;
        if (Upolyd() && nohands(g.youmonst.data))
            throw new Error('in_trouble(): unchanger() not ported yet');
    }
    if (g.ublindf && g.ublindf.cursed && EProp(BLINDED)) /* Blindfolded */
        return TROUBLE_CURSED_BLINDFOLD;

    /*
     * minor troubles
     */
    if (g.uball || (u.utrap && u.utraptype === TT_BURIEDBALL)) /* Punished */
        return TROUBLE_PUNISHED;
    if (Cursed_obj(g.uarmg, GAUNTLETS_OF_FUMBLING)
        || Cursed_obj(g.uarmf, FUMBLE_BOOTS))
        return TROUBLE_FUMBLING;
    if (worst_cursed_item())
        return TROUBLE_CURSED_ITEMS;
    if (u.usteed) { /* can't voluntarily dismount from a cursed saddle */
        const otmp = which_armor(u.usteed, W_SADDLE);
        if (Cursed_obj(otmp, SADDLE))
            return TROUBLE_SADDLE;
    }

    if ((HProp(BLINDED) & TIMEOUT) > 1 && !(HProp(BLINDED) & ~TIMEOUT)
        && !u.uswallow)
        return TROUBLE_BLIND; /* attacktype_fordmg(u.ustuck AT_ENGL AD_BLND):
                                 engulfing isn't ported */
    /* deafness isn't its own trouble; healing magic cures deafness
       when it cures blindness, so do the same with trouble repair */
    if ((HProp(DEAF) & TIMEOUT) > 1)
        return TROUBLE_BLIND;

    for (let i = 0; i < A_MAX; i++)
        if (ABASE(i) < AMAX(i))
            return TROUBLE_POISONED;
    if (uhave(WOUNDED_LEGS) && !u.usteed)
        return TROUBLE_WOUNDED_LEGS;
    if (u.uhs >= HUNGRY)
        return TROUBLE_HUNGRY;
    if (HProp(STUNNED) & TIMEOUT)
        return TROUBLE_STUNNED;
    if (HProp(CONFUSION) & TIMEOUT)
        return TROUBLE_CONFUSED;
    if (HProp(HALLUC) & TIMEOUT)
        return TROUBLE_HALLUCINATION;
    return 0;
}

// C ref: pray.c godvoice()
async function godvoice(g_align, words) {
    let quot = "";

    if (words)
        quot = "\"";
    else
        words = "";

    await pline(`The voice of ${align_gname(g_align)} ${ROLL_FROM(godvoices)}: ${
        quot}${words}${quot}`); /* pline_The() */
}

// C ref: pray.c gods_angry()
async function gods_angry(g_align) {
    await godvoice(g_align, "Thou hast angered me.");
}

// C ref: pray.c gods_upset() -- the g_align god is upset with you
async function gods_upset(g_align) {
    const u = game.u;
    if (g_align === u.ualign.type)
        u.ugangr++;
    else if (u.ugangr)
        u.ugangr--;
    await angrygods(g_align);
}

// C ref: pray.c god_zaps_you()
async function god_zaps_you(resp_god) {
    const u = game.u, g = game;

    if (u.uswallow) {
        await pline("Suddenly a bolt of lightning comes down at you from the heavens!");
        await pline(`It strikes ${mon_nam_pr(u.ustuck)}!`);
        if (!resists_elec_pr(u.ustuck)) {
            await pline(`${Monnam_pr(u.ustuck)} fries to a crisp!`);
            /* Yup, you get experience.  It takes guts to successfully
             * pull off this trick on your god, anyway.
             * Other credit/blame applies (luck or alignment adjustments),
             * but not direct kill count (pacifist conduct).
             */
            await xkilled_pr(u.ustuck, XKILL_NOMSG | XKILL_NOCONDUCT);
        } else
            await pline(`${Monnam_pr(u.ustuck)} seems unaffected.`);
    } else {
        await pline("Suddenly, a bolt of lightning strikes you!");
        if (uhave(REFLECTING)) { /* Reflecting */
            /* shieldeff(u.ux, u.uy): transient display only */
            if (Blind())
                await pline("For some reason you're unaffected.");
            else
                await ureflects_pr("%s reflects from your %s.", "It");
            monstseesu_pr(M_SEEN_REFL);
        } else if (uhave(SHOCK_RES)) { /* Shock_resistance */
            /* shieldeff(u.ux, u.uy) */
            await pline("It seems not to affect you.");
            monstseesu_pr(M_SEEN_ELEC);
            monstunseesu_pr(M_SEEN_REFL);
        } else {
            await fry_by_god(resp_god, false);
            monstunseesu_pr(M_SEEN_REFL | M_SEEN_ELEC);
        }
    }

    await pline(`${align_gname(resp_god)} is not deterred...`);
    if (u.uswallow) {
        await pline(`A wide-angle disintegration beam aimed at you hits ${
            mon_nam_pr(u.ustuck)}!`);
        if (!resists_disint_pr(u.ustuck)) {
            await pline(`${Monnam_pr(u.ustuck)} disintegrates into a pile of dust!`);
            await xkilled_pr(u.ustuck,
                             XKILL_NOMSG | XKILL_NOCORPSE | XKILL_NOCONDUCT);
        } else
            await pline(`${Monnam_pr(u.ustuck)} seems unaffected.`);
    } else {
        await pline("A wide-angle disintegration beam hits you!");

        /* disintegrate shield and body armor before disintegrating
         * the impudent mortal, like black dragon breath -3.
         */
        const ERefl = EProp(REFLECTING), EDisint = EProp(DISINT_RES);
        if (g.uarms && !(ERefl & W_ARMS) && !(EDisint & W_ARMS))
            await disintegrate_arm_pr(g.uarms);
        if (g.uarmc && !(ERefl & W_ARMC) && !(EDisint & W_ARMC))
            await disintegrate_arm_pr(g.uarmc);
        if (g.uarm && !(ERefl & W_ARM) && !(EDisint & W_ARM) && !g.uarmc)
            await disintegrate_arm_pr(g.uarm);
        if (g.uarmu && !g.uarm && !g.uarmc)
            await disintegrate_arm_pr(g.uarmu);
        if (!uhave(DISINT_RES)) { /* !Disint_resistance */
            await fry_by_god(resp_god, true);
            monstunseesu_pr(M_SEEN_DISINT);
        } else {
            await You(`bask in its ${NH_BLACK} glow for a minute...`);
            await godvoice(resp_god, "I believe it not!");
            monstseesu_pr(M_SEEN_DISINT);
        }
        if (Is_astralevel_pr(u.uz) || Is_sanctum_pr(u.uz)) {
            /* one more try for high altars */
            /* SetVoice(): speech synthesis only */
            await verbalize("Thou cannot escape my wrath, mortal!");
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            await summon_minion(resp_god, false);
            await verbalize(`Destroy ${game.flags.female ? "her" : "him"}, my servants!`); /* uhim() */
        }
    }
}

// C ref: pray.c fry_by_god()
async function fry_by_god(resp_god, via_disintegration) {
    await You(`${!via_disintegration ? "fry to a crisp"
                                     : "disintegrate into a pile of dust"}!`);
    killer_pr().format = KILLED_BY_PR;
    killer_pr().name = `the wrath of ${align_gname(resp_god)}`;
    await done_pr(DIED_PR);
}

// C ref: pray.c angrygods()
async function angrygods(resp_god) {
    const u = game.u;
    let maxanger, new_ublesscnt;

    if (Inhell())
        resp_god = A_NONE;
    u.ublessed = 0; /* lose divine protection */

    /* changed from tmp = u.ugangr + abs (u.uluck) -- rph */
    /* added test for alignment diff -dlc */
    if (resp_god !== u.ualign.type)
        maxanger = Math.trunc(u.ualign.record / 2)
                   + (Luck() > 0 ? -Math.trunc(Luck() / 3) : -Luck());
    else
        maxanger = 3 * u.ugangr + ((Luck() > 0 || u.ualign.record >= STRIDENT)
                                   ? -Math.trunc(Luck() / 3)
                                   : -Luck());
    if (maxanger < 1)
        maxanger = 1; /* possible if bad align & good luck */
    else if (maxanger > 15)
        maxanger = 15; /* be reasonable */

    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await pline(`You feel that ${align_gname(resp_god)} is ${
            uhave(HALLUC) ? "bummed" : "displeased"}.`); /* You_feel() */
        break;
    case 2:
    case 3:
        await godvoice(resp_god, null);
        await pline(`"Thou ${(ugod_is_angry() && resp_god === u.ualign.type)
                              ? "hast strayed from the path"
                              : "art arrogant"}, ${
            game.youmonst.data.mlet === S_HUMAN ? "mortal" : "creature"}."`);
        /* SetVoice(): speech synthesis only */
        await verbalize("Thou must relearn thy lessons!");
        await adjattrib(A_WIS, -1, false);
        await losexp(null);
        break;
    case 6:
        if (!game.uball) { /* !Punished */
            await gods_angry(resp_god);
            await punish(null);
            break;
        }
        /* FALLTHRU */
    case 4:
    case 5:
        await gods_angry(resp_god);
        if (!Blind() && !uhave(ANTIMAGIC))
            await pline(`${An(hcolor(NH_BLACK))} glow surrounds you.`);
        if (rn2(2) || !(await attrcurse()))
            await rndcurse();
        break;
    case 7:
    case 8:
        await godvoice(resp_god, null);
        /* SetVoice(): speech synthesis only */
        await verbalize(`Thou durst ${
            (on_altar() && (a_align(u.ux, u.uy) !== resp_god))
                ? "scorn"
                : "call upon"} me?`);
        /* [why isn't this using verbalize()?] */
        await pline(`"Then die, ${
            (game.youmonst.data.mlet === S_HUMAN) ? "mortal" : "creature"}!"`);
        await summon_minion(resp_god, false);
        break;

    default:
        await gods_angry(resp_god);
        await god_zaps_you(resp_god);
        break;
    }
    /* even though this might not be in response to prayer, set pray timer */
    new_ublesscnt = rnz(300);
    if (new_ublesscnt > u.ublesscnt)
        u.ublesscnt = new_ublesscnt;
}

/* C ref: youprop.h Blinded, Deaf; mondata.h eyecount() */
function Blinded() {
    return !!(HProp(BLINDED) && !game.u.uprops[BLINDED].blocked);
}
function Deaf() { return !!(HProp(DEAF) || EProp(DEAF) || game.u.uroleplay?.deaf); }
function eyecount(ptr) {
    return !(ptr.mflags1 & M1_NOEYES) ? ((ptr === mons[PM_CYCLOPS]
                                         || ptr === mons[PM_FLOATING_EYE]) ? 1 : 2)
                                      : 0;
}

// C ref: pray.c fix_curse_trouble()
async function fix_curse_trouble(otmp, what) {
    const g = game;
    if (!otmp) {
        console.error('impossible: fix_curse_trouble: nothing to uncurse.');
        return;
    }
    if (otmp === g.uarmg && uhave(GLIB))
        throw new Error('fix_curse_trouble(): make_glib() not ported yet');
    if (!Blind() || (otmp === g.ublindf
                     && EProp(BLINDED) && !Blinded())) { /* Blindfolded_only */
        await pline(`${what ? what : Yobjnam2(otmp, "softly glow")} ${hcolor("amber") /* NH_AMBER */}.`);
        g.iflags.last_msg = PLNMSG_OBJ_GLOWS;
        otmp.bknown = !Hallucination(); /* ok to skip set_bknown() */
    }
    uncurse(otmp);
    /* update_inventory(): no perm_invent */
}

// C ref: pray.c fix_worst_trouble()
async function fix_worst_trouble(trouble) {
    const g = game;
    const u = g.u;
    let i, maxhp;
    let otmp = null;
    let what = null;
    const leftglow = "Your left ring softly glows",
          rightglow = "Your right ring softly glows";

    switch (trouble) {
    case TROUBLE_STONED:
        await make_stoned(0, "You feel more limber.", 0, null);
        break;
    case TROUBLE_SLIMED:
        await make_slimed(0, "The slime disappears.");
        break;
    case TROUBLE_STRANGLED:
        if (g.uamul && g.uamul.otyp === AMULET_OF_STRANGULATION) {
            await Your("amulet vanishes!");
            useup(g.uamul);
        }
        await You("can breathe again.");
        u.uprops[STRANGLED].intrinsic = 0; /* Strangled = 0 */
        g.disp_botl = true;
        break;
    case TROUBLE_LAVA:
        /* teleport should always succeed, but if not, just untrap them */
        if (!(await safe_teleds(TELEDS_NO_FLAGS)))
            await reset_utrap(true);
        throw new Error('fix_worst_trouble(): rescued_from_terrain() not ported yet');
    case TROUBLE_STARVING:
        /* temporarily lost strength recovery now handled by init_uhunger() */
        /*FALLTHRU*/
    case TROUBLE_HUNGRY:
        await Your(`${body_part(STOMACH)} feels content.`);
        init_uhunger();
        g.disp_botl = true;
        break;
    case TROUBLE_SICK:
        await You_feel("better.");
        await make_sick(0, null, false, SICK_ALL);
        break;
    case TROUBLE_REGION:
        /* stinking cloud, with hero vulnerable to HP loss */
        await region_safety();
        break;
    case TROUBLE_HIT:
        /* "fix all troubles" will keep trying if hero has
           5 or less hit points, so make sure they're always
           boosted to be more than that */
        await You_feel("much better.");
        if (Upolyd()) {
            maxhp = u.mhmax + rnd(5);
            setuhpmax(Math.max(maxhp, 5 + 1), false); /* acts as setmhmax() */
            u.mh = u.mhmax;
        }
        maxhp = u.uhpmax;
        if (maxhp < u.ulevel * 5 + 11)
            maxhp += rnd(5);
        /* True: update u.uhpmax even if currently poly'd */
        setuhpmax(Math.max(maxhp, 5 + 1), true);
        u.uhp = u.uhpmax; /* setuhpmax() will do this when u.uhp is higher
                           * than u.uhpmax; prayer also does this if lower */
        g.disp_botl = true;
        break;
    case TROUBLE_COLLAPSING:
        /* override Fixed_abil; uncurse that if feasible */
        await You_feel(`${(AMAX(A_STR) - ABASE(A_STR) > 6) ? "much " : ""}stronger.`);
        u.acurr.a[A_STR] = u.amax.a[A_STR]; /* ABASE(A_STR) = AMAX(A_STR) */
        g.disp_botl = true;
        if (uhave(FIXED_ABIL))
            throw new Error('fix_worst_trouble(): stuck_ring() not ported yet');
        break;
    case TROUBLE_STUCK_IN_WALL:
        /* no control, but works on no-teleport levels */
        if (await safe_teleds(TELEDS_NO_FLAGS)) {
            await Your("surroundings change.");
        } else {
            /* safe_teleds() couldn't find a safe place; perhaps the
               level is completely full.  As a last resort, confer
               intrinsic wall/rock-phazing.  Hero might get stuck
               again fairly soon.... */
            set_itimeout(PASSES_WALLS, d(4, 4) + 4); /* 8..20 */
            /* how else could you move between packed rocks or among
               lattice forming "solid" rock? */
            await You_feel("much slimmer.");
        }
        break;
    case TROUBLE_CURSED_LEVITATION:
        if (Cursed_obj(g.uarmf, LEVITATION_BOOTS)) {
            otmp = g.uarmf;
        } else {
            throw new Error('fix_worst_trouble(): stuck_ring() not ported yet');
        }
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_UNUSEABLE_HANDS:
        if (welded(g.uwep)) {
            otmp = g.uwep;
            await fix_curse_trouble(otmp, what);
            break;
        }
        if (Upolyd() && nohands(g.youmonst.data))
            throw new Error('fix_worst_trouble(): rehumanize()/unchanger() not ported yet');
        if (nohands(g.youmonst.data) || !freehand())
            console.error('impossible: fix_worst_trouble: couldn\'t cure hands.');
        break;
    case TROUBLE_CURSED_BLINDFOLD:
        otmp = g.ublindf;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_LYCANTHROPE:
        throw new Error('fix_worst_trouble(): you_unwere() not ported yet');
    case TROUBLE_PUNISHED:
        await Your("chain disappears.");
        if (u.utrap && u.utraptype === TT_BURIEDBALL)
            throw new Error('fix_worst_trouble(): buried_ball_to_freedom() not ported yet');
        else
            await unpunish();
        break;
    case TROUBLE_FUMBLING:
        if (Cursed_obj(g.uarmg, GAUNTLETS_OF_FUMBLING))
            otmp = g.uarmg;
        else if (Cursed_obj(g.uarmf, FUMBLE_BOOTS))
            otmp = g.uarmf;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_CURSED_ITEMS:
        otmp = worst_cursed_item();
        if (otmp === g.uright)
            what = rightglow;
        else if (otmp === g.uleft)
            what = leftglow;
        await fix_curse_trouble(otmp, what);
        break;
    case TROUBLE_POISONED:
        /* override Fixed_abil; ignore items which confer that */
        if (Hallucination())
            await pline("There's a tiger in your tank.");
        else
            await You_feel("in good health again.");
        for (i = 0; i < A_MAX; i++) {
            if (ABASE(i) < AMAX(i)) {
                u.acurr.a[i] = u.amax.a[i]; /* ABASE(i) = AMAX(i) */
                g.disp_botl = true;
            }
        }
        await encumber_msg();
        break;
    case TROUBLE_BLIND: { /* handles deafness as well as blindness */
        let msgbuf = "";
        let eyes = body_part(EYE);
        const cure_deaf = (HProp(DEAF) & TIMEOUT) ? true : false;

        if (Blinded()) {
            if (eyecount(g.youmonst.data) !== 1)
                eyes = makeplural(eyes);
            msgbuf = `Your ${eyes} ${vtense(eyes, "feel")} better`;
            u.ucreamed = 0;
            await make_blinded(0, false);
        }
        if (cure_deaf) {
            await make_deaf(0, false);
            if (!Deaf())
                msgbuf += `${!msgbuf ? "You" : " and you"} can hear again`;
        }
        if (msgbuf)
            await pline(`${msgbuf}.`);
        break;
    }
    case TROUBLE_WOUNDED_LEGS:
        await heal_legs(0);
        break;
    case TROUBLE_STUNNED:
        await make_stunned(0, true);
        break;
    case TROUBLE_CONFUSED:
        await make_confused(0, true);
        break;
    case TROUBLE_HALLUCINATION:
        await pline("Looks like you are back in Kansas.");
        await make_hallucinated(0, false, 0);
        break;
    case TROUBLE_SADDLE:
        throw new Error('fix_worst_trouble(): cursed saddle not ported yet');
    }
}

// C ref: pray.c pleased()
async function pleased(g_align) {
    const u = game.u;
    /* don't use p_trouble, worst trouble may get fixed while praying */
    let trouble = in_trouble(); /* what's your worst difficulty? */
    let pat_on_head = 0;

    await pline(`You feel that ${align_gname(g_align)} is ${
        (u.ualign.record >= DEVOUT)
            ? uhave(HALLUC) ? "pleased as punch" : "well-pleased"
            : (u.ualign.record >= STRIDENT)
                ? uhave(HALLUC) ? "ticklish" : "pleased"
                : uhave(HALLUC) ? "full" : "satisfied"}.`); /* You_feel() */

    /* not your deity */
    if (on_altar() && game.p_aligntyp !== u.ualign.type) {
        adjalign(-1);
        return;
    } else if (u.ualign.record < 2 && trouble <= 0)
        adjalign(1);

    if (!trouble && u.ualign.record >= DEVOUT) {
        /* if hero was in trouble, but got better, no special favor */
        if (game.p_trouble === 0)
            pat_on_head = 1;
    } else {
        let action;
        let tryct = 0;
        const prayer_luck = Math.max(Luck(), -1); /* => (prayer_luck + 2 > 0) */
        action = rn1(prayer_luck + (on_altar() ? 3 + (on_shrine() ? 1 : 0) : 2), 1);
        if (!on_altar())
            action = Math.min(action, 3);
        if (u.ualign.record < STRIDENT)
            action = (u.ualign.record > 0 || !rnl(2)) ? 1 : 0;

        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = 1;
            /*FALLTHRU*/
        case 4:
            do
                await fix_worst_trouble(trouble);
            while ((trouble = in_trouble()) !== 0);
            break;

        case 3:
            /* up to 10 troubles */
            await fix_worst_trouble(trouble);
            /*FALLTHRU*/
        case 2:
            /* up to 9 troubles */
            while ((trouble = in_trouble()) > 0 && (++tryct < 10))
                await fix_worst_trouble(trouble);
            break;

        case 1:
            if (trouble > 0)
                await fix_worst_trouble(trouble);
            break;
        case 0:
            break; /* your god blows you off, too bad */
        }
    }

    if (pat_on_head)
        throw new Error('pleased(): pat_on_head boons not ported yet');

    u.ublesscnt = rnz(350);
    let kick_on_butt = u.uevent.udemigod ? 1 : 0;
    if (u.uevent.uhand_of_elbereth)
        kick_on_butt++;
    if (kick_on_butt)
        u.ublesscnt += kick_on_butt * rnz(1000);

    /* the 100000-turn timeout increase: moves never get that high here */
    if (game.moves > 100000)
        throw new Error('pleased(): prayer timeout past turn 100000 not ported yet');
}

// C ref: pray.c water_prayer() -- the altar's water potions
function water_prayer(bless_water) {
    const u = game.u;
    for (const otmp of game.level.objects || [])
        if (otmp.where === 'OBJ_FLOOR' && otmp.ox === u.ux && otmp.oy === u.uy
            && otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed))
            throw new Error('water_prayer(): changing holy water not ported yet');
    return false;
}

// C ref: pray.c can_pray()
export async function can_pray(praying) /* false means no messages should be given */ {
    const g = game;
    const u = g.u;
    let alignment;

    g.p_aligntyp = on_altar() ? a_align(u.ux, u.uy) : u.ualign.type;
    g.p_trouble = in_trouble();

    if (is_demon(g.youmonst.data) /* ok if chaotic or none (Moloch) */
        && (g.p_aligntyp === A_LAWFUL || g.p_aligntyp !== A_NEUTRAL)) {
        if (praying)
            await pline(`The very idea of praying to a ${
                g.p_aligntyp ? "lawful" : "neutral"} god is repugnant to you.`); /* pline_The() */
        return false;
    }

    if (praying)
        await pline(`You begin praying to ${align_gname(g.p_aligntyp)}.`); /* You() */

    if (u.ualign.type && u.ualign.type === -g.p_aligntyp)
        alignment = -u.ualign.record; /* Opposite alignment altar */
    else if (u.ualign.type !== g.p_aligntyp)
        alignment = Math.trunc(u.ualign.record / 2); /* Different alignment altar */
    else
        alignment = u.ualign.record;

    if (g.p_aligntyp === A_NONE) /* praying to Moloch */
        g.p_type = -2;
    else if ((g.p_trouble > 0) ? (u.ublesscnt > 200)   /* big trouble */
             : (g.p_trouble < 0) ? (u.ublesscnt > 100) /* minor difficulty */
               : (u.ublesscnt > 0))                    /* not in trouble */
        g.p_type = 0;                     /* too soon... */
    else if (Luck() < 0 || u.ugangr || alignment < 0)
        g.p_type = 1; /* too naughty... */
    else /* alignment >= 0 */ {
        if (on_altar() && u.ualign.type !== g.p_aligntyp)
            g.p_type = 2;
        else
            g.p_type = 3;
    }

    if (is_undead(g.youmonst.data) && !Inhell()
        && (g.p_aligntyp === A_LAWFUL
            || (g.p_aligntyp === A_NEUTRAL && !rn2(10))))
        g.p_type = -1;

    return !praying ? (g.p_type === 3 && !Inhell()) : true;
}

// C ref: pray.c dopray() -- the #pray command
export async function dopray() {
    const g = game;
    const u = g.u;
    let ok;

    /* ParanoidPray (paranoid_confirm:pray, on by default) without
       ParanoidConfirm: a plain y/n query */
    if (g.flags.paranoia_pray !== false) {
        ok = (await paranoid_query(false, "Are you sure you want to pray?"));
        if (!ok) /* declined the "are you sure?" confirmation */
            return ECMD_OK;
    }

    if (!u.uconduct.gnostic++)
        livelog_printf(LL_CONDUCT, "rejected atheism with a prayer");

    /* set up p_type and p_alignment */
    if (!(await can_pray(true)))
        return ECMD_OK;

    if (g.flags.debug && g.p_type >= 0) {
        const forcesuccess = "Force the gods to be pleased?";

        /* if we asked "are you sure?" above we suppressed the response
           from the do-again buffer, so need to suppress this response too;
           otherwise subsequent ^A would use this answer for "are you sure?"
           and bypass confirmation (gi.in_doagain: ^A isn't ported) */
        if (g.flags.paranoia_pray !== false) {
            ok = (await tty_yn_function(forcesuccess, "yn", 'n') === 'y'); /* YN() */
        } else {
            ok = (await tty_yn_function(forcesuccess, "yn", 'n') === 'y'); /* y_n() */
        }
        if (ok) {
            u.ublesscnt = 0;
            if (u.uluck < 0)
                u.uluck = 0;
            if (u.ualign.record <= 0)
                u.ualign.record = 1;
            u.ugangr = 0;
            if (g.p_type < 2)
                g.p_type = 3;
        }
    }
    nomul(-3);
    g.multi_reason = "praying";
    g.nomovemsg = "You finish your prayer.";
    g.afternmv = prayer_done;

    if (g.p_type === 3 && !Inhell()) {
        /* if you've been true to your god you can't die while you pray */
        if (!uhave(BLINDED))
            await pline("You are surrounded by a shimmering light."); /* You() */
        u.uinvulnerable = 1;
    }

    return ECMD_TIME;
}

// C ref: pray.c prayer_done() -- M. Stephenson (1.0.3b)
async function prayer_done() {
    const g = game;
    const u = g.u;
    const alignment = g.p_aligntyp;

    u.uinvulnerable = 0;
    if (g.p_type === -2 || g.p_type === -1)
        throw new Error('prayer_done(): Moloch / undead prayer results not ported yet');
    if (Inhell())
        throw new Error('prayer_done(): Gehennom prayer not ported yet');

    if (g.p_type === 0) {
        if (on_altar() && u.ualign.type !== alignment)
            water_prayer(false);
        u.ublesscnt += rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign.type);
    } else if (g.p_type === 1) {
        if (on_altar() && u.ualign.type !== alignment)
            water_prayer(false);
        await angrygods(u.ualign.type); /* naughty */
    } else if (g.p_type === 2) {
        if (water_prayer(false)) {
            /* attempted water prayer on a non-coaligned altar */
            u.ublesscnt += rnz(250);
            change_luck(-3);
            await gods_upset(u.ualign.type);
        } else
            await pleased(alignment);
    } else {
        /* coaligned */
        if (on_altar()) {
            /* pray_revive(): no pet corpse/statue revival yet */
            for (const otmp of g.level.objects || [])
                if (otmp.where === 'OBJ_FLOOR' && otmp.ox === u.ux
                    && otmp.oy === u.uy && otmp.omonst?.mtame)
                    throw new Error('prayer_done(): pray_revive() not ported yet');
            water_prayer(true);
        }
        await pleased(alignment); /* nice */
    }
    return 1;
}


// C ref: pline.c verbalize()
async function verbalize(line) {
    await pline(`"${line}"`);
}

// C ref: pray.c dosacrifice() -- the #offer command (M-o), sacrifice
// something to the gods; offering an object (floorfood() and the rest)
// isn't ported
export async function dosacrifice() {
    const u = game.u;
    /* C ref: youprop.h Levitation, Flying (BFlying isn't ported),
       Confusion, Stunned */
    const lev = u.uprops[LEVITATION] || {};
    const Levitation = !!((lev.intrinsic || lev.extrinsic) && !lev.blocked);
    const Flying = uhave(FLYING);

    if (!on_altar() || u.uswallow) {
        await pline(`You are not ${(Levitation || Flying) ? "over" : "on"} an altar.`); /* You() */
        return ECMD_OK;
    } else if (HProp(CONFUSION) || HProp(STUNNED)) {
        await pline("You are too impaired to perform the rite."); /* You() */
        return ECMD_OK;
    }
    throw new Error('dosacrifice(): floorfood("sacrifice") and the offering not ported yet');
}

/* C ref: pray.c static int turn_undead_range, turn_undead_msg_cnt */
let turn_undead_range = 0;
let turn_undead_msg_cnt = 0;

// C ref: pray.c maybe_turn_mon_iter()
/* iterable for undead turning by priest/knight */
async function maybe_turn_mon_iter(mtmp) {
    const u = game.u;
    /* 3.6.3: used to use cansee() here but the purpose is to prevent
       #turn operating through walls, not to require that the hero be
       able to see the target location */
    if (!couldsee(mtmp.mx, mtmp.my)
        || mdistu(mtmp) > turn_undead_range)
        return;

    if (!mtmp.mpeaceful
        && (is_undead(mtmp.data) || is_vampshifter(mtmp)
            || (is_demon(mtmp.data) && (u.ulevel > (MAXULEV / 2))))) {
        mtmp.msleeping = 0;
        if (uhave(CONFUSION)) {
            if (!turn_undead_msg_cnt++)
                await pline("Unfortunately, your voice falters.");
            mtmp.mflee = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        } else if (!resist(mtmp, 0, 0, TELL)) {
            let xlev = 6;
            let flee = true;

            /* this is intentional, lichs are tougher than zombies;
               each case adds 2 and falls through to the next */
            switch (mtmp.data.mlet) {
            case S_LICH:
                xlev += 2;
                /* FALLTHRU */
            // eslint-disable-next-line no-fallthrough
            case S_GHOST:
                xlev += 2;
                /* FALLTHRU */
            // eslint-disable-next-line no-fallthrough
            case S_VAMPIRE:
                xlev += 2;
                /* FALLTHRU */
            // eslint-disable-next-line no-fallthrough
            case S_WRAITH:
                xlev += 2;
                /* FALLTHRU */
            // eslint-disable-next-line no-fallthrough
            case S_MUMMY:
                xlev += 2;
                /* FALLTHRU */
            // eslint-disable-next-line no-fallthrough
            case S_ZOMBIE:
                if (u.ulevel >= xlev && !resist(mtmp, 0, 0, NOTELL)) {
                    if (u.ualign.type === A_CHAOTIC) {
                        mtmp.mpeaceful = 1;
                        set_malign(mtmp);
                    } else { /* damn them */
                        await killed(mtmp);
                    }
                    flee = false;
                } /* else flee */
                break;
            default:
                break;
            }
            if (flee)
                await monflee(mtmp, 0, false, true);
        }
    }
}

// C ref: pray.c doturn() -- #turn command (M-t)
export async function doturn() {
    const g = game;
    const u = g.u;
    /* Knights & Priest(esse)s only please */
    let Gname;

    if (g.urole.mnum !== PM_CLERIC && g.urole.mnum !== PM_KNIGHT) { /* Role_if() */
        /* Try to use the "turn undead" spell. */
        if (known_spell(SPE_TURN_UNDEAD))
            return await spelleffects(SPE_TURN_UNDEAD, false, false);
        await pline("You don't know how to turn undead!"); /* You() */
        return ECMD_OK;
    }
    if (!u.uconduct.gnostic++)
        livelog_printf(LL_CONDUCT, "rejected atheism by turning undead");

    Gname = halu_gname(u.ualign.type);

    /* [What about needing free hands (does #turn involve any gesturing)?] */
    if (!can_chant(g.youmonst)) {
        /* "evilness": "demons and undead" is too verbose and too precise */
        await pline(`You are ${uhave(STRANGLED) ? "not able to call"
                                                : "incapable of calling"} upon ${
                        Gname} to turn aside evilness.`); /* You() */
        /* violates agnosticism due to intent; conduct tracking is not
           supposed to affect play but we make an exception here:  use a
           move if this is the first time agnostic conduct has been broken */
        return (u.uconduct.gnostic === 1) ? ECMD_TIME : ECMD_OK;
    }
    if ((u.ualign.type !== A_CHAOTIC
         && (is_demon(g.youmonst.data)
             || is_undead(g.youmonst.data) || is_vampshifter(g.youmonst)))
        || u.ugangr > 6) { /* "Die, mortal!" */
        await pline(`For some reason, ${Gname} seems to ignore you.`);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (Inhell()) {
        /* not actually calling upon Moloch but use alternate
           phrasing anyway if hallucinatory feedback says it's him */
        await pline(`Since you are in Gehennom, ${Gname} ${
                        (Gname === Moloch) ? "won't" : "can't"} help you.`);
        aggravate();
        return ECMD_TIME;
    }
    await pline(`Calling upon ${Gname}, you chant an arcane formula.`);
    exercise(A_WIS, true);

    /* note: does not perform unturn_dead() on victims' inventories */
    turn_undead_range = BOLT_LIM + Math.trunc(u.ulevel / 5); /* 8 to 14 */
    turn_undead_range *= turn_undead_range;
    turn_undead_msg_cnt = 0;

    /* iter_mons(maybe_turn_mon_iter) */
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            continue;
        await maybe_turn_mon_iter(mtmp);
    }

    /*
     *  There is no detrimental effect on self for successful #turn
     *  while in demon or undead form.  That can only be done while
     *  chaotic oneself (see "For some reason" above) and chaotic
     *  turning only makes targets peaceful.
     */
    nomul(-(5 - Math.trunc((u.ulevel - 1) / 6))); /* -5 .. -1 */
    g.multi_reason = "trying to turn the monsters";
    g.nomovemsg = "You can move again."; /* You_can_move_again */
    return ECMD_TIME;
}
import { summon_minion } from './minion.js';
import { mon_nam as mon_nam_pr, Monnam as Monnam_pr } from './do_name.js';
import { resists_elec as resists_elec_pr, resists_disint as resists_disint_pr } from './mondata.js';
import { xkilled as xkilled_pr } from './mon.js';
import { ureflects as ureflects_pr } from './mcastu.js';
import { monstseesu as monstseesu_pr, monstunseesu as monstunseesu_pr } from './uhitm.js';
import { disintegrate_arm as disintegrate_arm_pr } from './do_wear.js';
import { done as done_pr } from './end.js';
import { killer as killer_pr } from './topten.js';
import { REFLECTING, SHOCK_RES, DISINT_RES, W_ARM, W_ARMC, W_ARMS, M_SEEN_REFL,
         M_SEEN_ELEC, M_SEEN_DISINT, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
         KILLED_BY as KILLED_BY_PR, DIED as DIED_PR, Is_astralevel as Is_astralevel_pr,
         Is_sanctum as Is_sanctum_pr } from './const.js';
