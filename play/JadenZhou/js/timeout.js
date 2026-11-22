// timeout.js — timed intrinsics and timers.
// C ref: timeout.c
//
// Ported so far: nh_timeout() (luck timeout, the uprops countdown and the
// timeout cases that can occur with what the JS port sets so far).  The
// *_dialogue() routines and run_timers() are not ported yet; nothing the
// JS port does yet starts them (see the comments below).

import { is_flyer } from './mondata.js';
import { vobj_at } from './display.js';
import { inv_weight } from './hack.js';
import { wake_nearby } from './mon.js';
import { is_ice } from './dig.js';
import { sobj_at as sobj_at_to } from './makemon.js';
import { doname, makeplural } from './objnam.js';
import { FROMOUTSIDE, WT_NOISY_INV, FOOT } from './const.js';
import { CORPSE, ROCK } from './objects.js';
import { PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { game } from './gstate.js';
import * as P from './const.js';
import { rnd } from './rng.js';
import { MAX_EGG_HATCH_TIME } from './const.js';
import { pline } from './display.js';
import {
    FULL_MOON, TIMEOUT, LAST_PROP, STONED, SLIMED, VOMITING, STRANGLED, SICK,
    LEVITATION, PASSES_WALLS, MAGICAL_BREATHING, SLEEPY, FAST, FUMBLING,
    FLYING, INTRINSIC, WOUNDED_LEGS, CONFUSION, STUNNED, BLINDED, DEAF,
    INVIS, SEE_INVIS, HALLUC, HALLUC_RES, FIRE_RES, WWALKING, ACID_RES,
    STONE_RES, DISPLACED, WARN_OF_MON, PROT_FROM_SHAPE_CHANGERS,
    DETECT_MONSTERS, GLIB,
} from './const.js';
import { newsym, see_monsters } from './display.js';
import { set_itimeout, make_confused, make_stunned, make_blinded, make_deaf,
         make_hallucinated, make_glib, set_mimic_blocking } from './potion.js';

/* C ref: youprop.h -- (H* || E*) for the timeout cases; Blind */
function uhave(p) {
    const q = game.u.uprops[p];
    return !!(q.intrinsic || q.extrinsic);
}
function Blind() {
    const q = game.u.uprops[BLINDED];
    return !!((q.intrinsic || q.extrinsic) && !q.blocked);
}
import { PM_ARCHEOLOGIST } from './monsters.js';
import { FEDORA, LUCKSTONE } from './objects.js';
import { stone_luck } from './attrib.js';
import { carrying } from './invent.js';
import { heal_legs } from './trap.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { Popeye, morehungry, vomit } from './eat.js';
import { make_vomiting, make_slimed, make_stoned, incr_itimeout } from './potion.js';
import { exercise } from './attrib.js';
import { A_DEX, A_CON, A_STR, NECK, FAINTING, SICK_NONVOMITABLE, M_AP_MONSTER,
         KILLED_BY_AN, ACCESSIBLE, SLEEP_RES } from './const.js';
import { mons, M1_NOLIMBS, M1_BREATHLESS, S_RODENT, PM_ROCK_MOLE, PM_WOODCHUCK,
         PM_GREEN_SLIME } from './monsters.js';
import { rn2, d } from './rng.js';
import { body_part } from './insight.js';
import { hcolor } from './do_name.js';
import { You } from './display.js';
import { is_pool, is_lava } from './makemon.js';
import { Is_waterlevel } from './const.js';
import { surface } from './iactions.js';
import { region_danger } from './region.js';
import { an } from './objnam.js';
import { spec_ability, SPFX_LUCK } from './artifact.js';

/* C ref: role.h Role_if() */
function Role_if(pm) { return game.urole.mnum === pm; }


// C ref: timeout.c propertynames[]
/* used by wizard mode #timeout and #wizintrinsic; order by 'interest'
   for timeout countdown, where most won't occur in normal play */
const propertynames = [
    { prop_num: P.INVULNERABLE, prop_name: "invulnerable" },
    { prop_num: P.STONED, prop_name: "petrifying" },
    { prop_num: P.SLIMED, prop_name: "becoming slime" },
    { prop_num: P.STRANGLED, prop_name: "strangling" },
    { prop_num: P.SICK, prop_name: "fatally sick" },
    { prop_num: P.STUNNED, prop_name: "stunned" },
    { prop_num: P.CONFUSION, prop_name: "confused" },
    { prop_num: P.HALLUC, prop_name: "hallucinating" },
    { prop_num: P.BLINDED, prop_name: "blinded" },
    { prop_num: P.DEAF, prop_name: "deafness" },
    { prop_num: P.VOMITING, prop_name: "vomiting" },
    { prop_num: P.GLIB, prop_name: "slippery fingers" },
    { prop_num: P.WOUNDED_LEGS, prop_name: "wounded legs" },
    { prop_num: P.SLEEPY, prop_name: "sleepy" },
    { prop_num: P.TELEPORT, prop_name: "teleporting" },
    { prop_num: P.POLYMORPH, prop_name: "polymorphing" },
    { prop_num: P.LEVITATION, prop_name: "levitating" },
    { prop_num: P.FAST, prop_name: "very fast" },
    { prop_num: P.CLAIRVOYANT, prop_name: "clairvoyant" },
    { prop_num: P.DETECT_MONSTERS, prop_name: "monster detection" },
    { prop_num: P.SEE_INVIS, prop_name: "see invisible" },
    { prop_num: P.INVIS, prop_name: "invisible" },
    /* temporary acid resistance and stone resistance can come from eating */
    { prop_num: P.ACID_RES, prop_name: "acid resistance" },
    { prop_num: P.STONE_RES, prop_name: "stoning resistance" },
    /* timed displacement is possible via eating a displacer beast corpse */
    { prop_num: P.DISPLACED, prop_name: "displaced" },
    /* timed pass-walls is a potential prayer result if surrounded by stone
       with nowhere to be safely teleported to */
    { prop_num: P.PASSES_WALLS, prop_name: "pass thru walls" },
    /* likewise for magical breathing vs poison gas regions */
    { prop_num: P.MAGICAL_BREATHING, prop_name: "magical breathing" },
    /* timed fire resistance and water walking are possible in explore mode
       (as well as in wizard mode) after life-saving in lava if it fails to
       teleport the hero to safety and player declines to die */
    { prop_num: P.WWALKING, prop_name: "water walking" },
    { prop_num: P.FIRE_RES, prop_name: "fire resistance" },
    /*
     * Properties beyond here don't have timed values during normal play,
     * so there's not much point in trying to order them sensibly.
     * They're either on or off based on equipment, role, actions, &c,
     * but in wizard mode, #wizintrinsic can give them as timed effects.
     */
    { prop_num: P.COLD_RES, prop_name: "cold resistance" },
    { prop_num: P.SLEEP_RES, prop_name: "sleep resistance" },
    { prop_num: P.DISINT_RES, prop_name: "disintegration resistance" },
    { prop_num: P.SHOCK_RES, prop_name: "shock resistance" },
    { prop_num: P.POISON_RES, prop_name: "poison resistance" },
    { prop_num: P.DRAIN_RES, prop_name: "drain resistance" },
    { prop_num: P.SICK_RES, prop_name: "sickness resistance" },
    { prop_num: P.ANTIMAGIC, prop_name: "magic resistance" },
    { prop_num: P.HALLUC_RES, prop_name: "hallucination resistance" },
    { prop_num: P.BLND_RES, prop_name: "light-induced blindness resistance" },
    { prop_num: P.FUMBLING, prop_name: "fumbling" },
    { prop_num: P.HUNGER, prop_name: "voracious hunger" },
    { prop_num: P.TELEPAT, prop_name: "telepathic" },
    { prop_num: P.WARNING, prop_name: "warning" },
    { prop_num: P.WARN_OF_MON, prop_name: "warn: monster type or class" },
    { prop_num: P.WARN_UNDEAD, prop_name: "warn: undead" },
    { prop_num: P.SEARCHING, prop_name: "searching" },
    { prop_num: P.INFRAVISION, prop_name: "infravision" },
    { prop_num: P.ADORNED, prop_name: "adorned (+/- Cha)" },
    { prop_num: P.STEALTH, prop_name: "stealthy" },
    { prop_num: P.AGGRAVATE_MONSTER, prop_name: "monster aggravation" },
    { prop_num: P.CONFLICT, prop_name: "conflict" },
    { prop_num: P.JUMPING, prop_name: "jumping" },
    { prop_num: P.TELEPORT_CONTROL, prop_name: "teleport control" },
    { prop_num: P.FLYING, prop_name: "flying" },
    { prop_num: P.SWIMMING, prop_name: "swimming" },
    { prop_num: P.SLOW_DIGESTION, prop_name: "slow digestion" },
    { prop_num: P.HALF_SPDAM, prop_name: "half spell damage" },
    { prop_num: P.HALF_PHDAM, prop_name: "half physical damage" },
    { prop_num: P.REGENERATION, prop_name: "HP regeneration" },
    { prop_num: P.ENERGY_REGENERATION, prop_name: "energy regeneration" },
    { prop_num: P.PROTECTION, prop_name: "extra protection" },
    { prop_num: P.PROT_FROM_SHAPE_CHANGERS, prop_name: "protection from shape changers" },
    { prop_num: P.POLYMORPH_CONTROL, prop_name: "polymorph control" },
    { prop_num: P.UNCHANGING, prop_name: "unchanging" },
    { prop_num: P.REFLECTING, prop_name: "reflecting" },
    { prop_num: P.FREE_ACTION, prop_name: "free action" },
    { prop_num: P.FIXED_ABIL, prop_name: "fixed abilities" },
    { prop_num: P.LIFESAVED, prop_name: "life will be saved" },
    { prop_num: 0, prop_name: null },
];

// C ref: timeout.c property_by_index()
/* returns the property's name and sets propertynum.v to its number */
export function property_by_index(idx, propertynum) {
    if (!(idx >= 0 && idx < propertynames.length)) /* IndexOkT() */
        idx = propertynames.length - 1;

    if (propertynum)
        propertynum.v = propertynames[idx].prop_num;
    return propertynames[idx].prop_name;
}

// C ref: artifact.c confers_luck()
export function confers_luck(obj) {
    /* might as well check for this too */
    if (obj.otyp === LUCKSTONE)
        return true;
    return !!(obj.oartifact && spec_ability(obj, SPFX_LUCK));
}

/* u.uprops[p] for the dialogue functions (nh_timeout() shadows the
   module's P namespace with u.uprops) */
function up(p) { return game.u.uprops[p]; }
/* C ref: color.h NH_BLUE, NH_GREEN (color names for hcolor()) */
const NH_BLUE = "blue", NH_GREEN = "green";
/* C ref: mondata.h nolimbs(), breathless(), cantvomit(); youprop.h
   Breathless */
function nolimbs(ptr) { return (ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS; }
function Breathless() {
    return !!(up(MAGICAL_BREATHING).intrinsic || up(MAGICAL_BREATHING).extrinsic
              || (game.youmonst.data.mflags1 & M1_BREATHLESS) !== 0);
}
function cantvomit(ptr) {
    return ptr.mlet === S_RODENT && ptr !== mons[PM_ROCK_MOLE]
           && ptr !== mons[PM_WOODCHUCK];
}
function Hallucination_to() {
    return !!(up(HALLUC).intrinsic
              && !(up(HALLUC_RES).intrinsic || up(HALLUC_RES).extrinsic));
}
/* C ref: trap.c unconscious() */
function unconscious() {
    const g = game;
    if (g.multi >= 0)
        return false;
    return !!(g.u.usleep
              || (g.nomovemsg
                  && (g.nomovemsg.startsWith("You awake")
                      || g.nomovemsg.startsWith("You regain con")
                      || g.nomovemsg.startsWith("You are consci"))));
}
/* C ref: pline.c urgent_pline() -- pline() that overrides msgtype
   suppression; no MSGTYPE patterns are set, so it's plain pline() */
async function urgent_pline(line) { await pline(line); }

// C ref: timeout.c stoned_texts[], stoned_dialogue()
const stoned_texts = [
    "You are slowing down.",            /* 5 */
    "Your limbs are stiffening.",       /* 4 */
    "Your limbs have turned to stone.", /* 3 */
    "You have turned to stone.",        /* 2 */
    "You are a statue.",                /* 1 */
];

async function stoned_dialogue() {
    const g = game;
    const i = (up(STONED).intrinsic & TIMEOUT);

    if (i > 0 && i <= stoned_texts.length) {
        let buf = stoned_texts[stoned_texts.length - i];
        if (nolimbs(g.youmonst.data) && buf.includes("limbs"))
            buf = buf.replace("limbs", "extremities"); /* strsubst() */
        await urgent_pline(buf);
    }
    switch (i) {
    case 5: /* slowing down */
        up(FAST).intrinsic = 0; /* HFast = 0L */
        if (g.multi > 0)
            nomul(0);
        break;
    case 4: /* limbs stiffening */
        /* just one move left to save oneself so quit fiddling around;
           don't stop attempt to eat tin--might be lizard or acidic */
        if (!Popeye(STONED))
            await stop_occupation();
        if (g.multi > 0)
            nomul(0);
        break;
    case 3: /* limbs turned to stone */
        await stop_occupation();
        nomul(-3); /* can't move anymore */
        g.multi_reason = "getting stoned";
        g.nomovemsg = "You can move again."; /* not unconscious */
        /* "your limbs have turned to stone" so terminate wounded legs */
        if ((up(WOUNDED_LEGS).intrinsic || up(WOUNDED_LEGS).extrinsic)
            && !g.u.usteed)
            await heal_legs(2);
        break;
    case 2: /* turned to stone */
        if ((up(DEAF).intrinsic & TIMEOUT) > 0
            && (up(DEAF).intrinsic & TIMEOUT) < 5)
            set_itimeout(DEAF, 5); /* avoid Hear_again at tail end */
        /* if also vomiting or turning into slime, stop those (no messages) */
        if (up(VOMITING).intrinsic)
            await make_vomiting(0, false);
        if (up(SLIMED).intrinsic)
            await make_slimed(0, null);
        break;
    default:
        break;
    }
    exercise(A_DEX, false);
}

// C ref: timeout.c vomiting_texts[], vomiting_dialogue()
/* hero is getting sicker and sicker prior to vomiting */
const vomiting_texts = [
    "are feeling mildly nauseated.", /* 14 */
    "feel slightly confused.",       /* 11 */
    "can't seem to think straight.", /* 8 */
    "feel incredibly sick.",         /* 5 */
    "are about to vomit.",           /* 2 */
];

async function vomiting_dialogue() {
    const g = game;
    let txt = null;
    const v = (up(VOMITING).intrinsic & TIMEOUT);

    /* note: nhtimeout() hasn't decremented timed properties for the
       current turn yet, so we use Vomiting-1 here */
    switch (v - 1) {
    case 14:
        txt = vomiting_texts[0];
        break;
    case 11:
        txt = vomiting_texts[1];
        if (txt.includes(" confused")
            && (up(CONFUSION).intrinsic || up(CONFUSION).extrinsic))
            txt = txt.replace(" confused", " more confused");
        break;
    case 6:
        await make_stunned((up(STUNNED).intrinsic & TIMEOUT) + d(2, 4), false);
        if (!Popeye(VOMITING))
            await stop_occupation();
        /*FALLTHRU*/
    // eslint-disable-next-line no-fallthrough
    case 9:
        await make_confused((up(CONFUSION).intrinsic & TIMEOUT) + d(2, 4), false);
        if (g.multi > 0)
            nomul(0);
        break;
    case 8:
        txt = vomiting_texts[2];
        if (txt.includes(" think")
            && (up(STUNNED).intrinsic || up(STUNNED).extrinsic))
            txt = txt.replace("can't seem to ", "can't ");
        break;
    case 5:
        txt = vomiting_texts[3];
        break;
    case 2:
        txt = vomiting_texts[4];
        if (cantvomit(g.youmonst.data))
            txt = "gag uncontrollably.";
        else if (Hallucination_to())
            /* "hurl" is short for "hurl chunks" which is slang for
               relatively violent vomiting... */
            txt = "are about to hurl!";
        break;
    case 0:
        await stop_occupation();
        if (!cantvomit(g.youmonst.data)) {
            await morehungry(20);
            /* case 2 used to be "You suddenly vomit!" ... give one here to
               have more specific point at which hero became unable to move */
            if (g.u.uhs < FAINTING)
                await You(`${!Hallucination_to() ? "vomit" : "hurl chunks"}!`);
        }
        await vomit();
        break;
    default:
        break;
    }
    if (txt)
        await You(txt); /* You1(txt) */
    exercise(A_CON, false);
}

// C ref: timeout.c sleep_dialogue()
async function sleep_dialogue() {
    const i = (up(SLEEPY).intrinsic & TIMEOUT);

    if (i === 4)
        await You("yawn.");
}

// C ref: timeout.c choke_texts[], choke_texts2[], choke_dialogue()
const choke_texts = [
    "You find it hard to breathe.",
    "You're gasping for air.",
    "You can no longer breathe.",
    "You're turning %s.",
    "You suffocate.",
];

const choke_texts2 = [
    "Your %s is becoming constricted.",
    "Your blood is having trouble reaching your brain.",
    "The pressure on your %s increases.",
    "Your consciousness is fading.",
    "You suffocate.",
];

async function choke_dialogue() {
    const i = (up(STRANGLED).intrinsic & TIMEOUT);

    if (i > 0 && i <= choke_texts.length) {
        if (Breathless() || !rn2(50)) {
            await urgent_pline(choke_texts2[choke_texts2.length - i]
                               .replace("%s", body_part(NECK)));
        } else {
            const str = choke_texts[choke_texts.length - i];

            if (str.includes('%'))
                await urgent_pline(str.replace("%s", hcolor(NH_BLUE)));
            else
                await urgent_pline(str);
            await stop_occupation();
        }
    }
    exercise(A_STR, false);
}

// C ref: timeout.c sickness_texts[], sickness_dialogue()
const sickness_texts = [
    "Your illness feels worse.",
    "Your illness is severe.",
    "You are at Death's door.",
];

async function sickness_dialogue() {
    const j = (up(SICK).intrinsic & TIMEOUT), i = Math.trunc(j / 2);

    if (i > 0 && i <= sickness_texts.length && (j % 2) !== 0) {
        let buf = sickness_texts[sickness_texts.length - i];
        /* change the message slightly for food poisoning */
        if ((game.u.usick_type & SICK_NONVOMITABLE) === 0)
            buf = buf.replace("illness", "sickness"); /* strsubst() */
        if (Hallucination_to() && buf.includes("Death's door"))
            throw new Error('sickness_dialogue(): hallucinatory "inviting you in" (mhe()) not ported yet');
        await urgent_pline(buf);
    }
    exercise(A_CON, false);
}

// C ref: timeout.c levi_texts[], levitation_dialogue()
const levi_texts = [
    "You float slightly lower.",
    "You wobble unsteadily %s the %s.",
];

async function levitation_dialogue() {
    const u = game.u;
    /* -1 because the last message comes via float_down() */
    const i = Math.trunc(((up(LEVITATION).intrinsic & TIMEOUT) - 1) / 2);

    if (up(LEVITATION).extrinsic) /* ELevitation */
        return;

    if (!ACCESSIBLE(game.level.at(u.ux, u.uy).typ)
        && !(is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) /* is_pool_or_lava() */
        return;

    if (((up(LEVITATION).intrinsic & TIMEOUT) % 2) && i > 0
        && i <= levi_texts.length) {
        const s = levi_texts[levi_texts.length - i];

        if (s.includes('%')) {
            const danger = ((is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))
                            && !Is_waterlevel(u.uz));

            await urgent_pline(s.replace("%s", danger ? "over" : "in")
                                .replace("%s", danger ? surface(u.ux, u.uy)
                                                      : "air"));
        } else
            await pline(s);
        await stop_occupation();
    }
}

// C ref: timeout.c slime_texts[], slime_dialogue()
const slime_texts = [
    "You are turning a little %s.",   /* 5 */
    "Your limbs are getting oozy.",   /* 4 */
    "Your skin begins to peel away.", /* 3 */
    "You are turning into %s.",       /* 2 */
    "You have become %s.",            /* 1 */
];

async function slime_dialogue() {
    const g = game, u = g.u;
    const t = (up(SLIMED).intrinsic & TIMEOUT), i = Math.trunc(t / 2);

    if (t === 1) {
        /* display as green slime during "You have become green slime."
           but don't worry about not being able to see self; if already
           mimicking something else at the time, implicitly be revealed */
        g.youmonst.m_ap_type = M_AP_MONSTER;
        g.youmonst.mappearance = PM_GREEN_SLIME;
        /* no message given when 't' is odd, so no automatic update of
           self; force one */
        newsym(u.ux, u.uy);
    }

    if ((t % 2) !== 0 && i >= 0 && i < slime_texts.length) {
        let buf = slime_texts[slime_texts.length - i - 1];
        if (nolimbs(g.youmonst.data) && buf.includes("limbs"))
            buf = buf.replace("limbs", "extremities"); /* strsubst() */

        if (buf.includes('%')) {
            if (i === 4) { /* "you are turning green" */
                if (!Blind()) /* [what if you're already green?] */
                    await urgent_pline(buf.replace("%s", hcolor(NH_GREEN)));
            } else {
                if (Hallucination_to())
                    throw new Error('slime_dialogue(): rndmonnam() not ported yet');
                await urgent_pline(buf.replace("%s", an("green slime")));
            }
        } else {
            await urgent_pline(buf);
        }
    }

    switch (i) {
    case 3: /* limbs becoming oozy */
        up(FAST).intrinsic = 0; /* lose intrinsic speed */
        if (!Popeye(SLIMED))
            await stop_occupation();
        if (g.multi > 0)
            nomul(0);
        break;
    case 2: /* skin begins to peel */
        if ((up(DEAF).intrinsic & TIMEOUT) > 0
            && (up(DEAF).intrinsic & TIMEOUT) < 5)
            set_itimeout(DEAF, 5); /* avoid Hear_again at tail end */
        break;
    case 1: /* turning into slime */
        /* if also turning to stone, stop doing that (no message) */
        if (up(STONED).intrinsic)
            await make_stoned(0, null, KILLED_BY_AN, null);
        break;
    }
    exercise(A_DEX, false);
}

// C ref: timeout.c phaze_texts[], phaze_dialogue()
const phaze_texts = [
    "You start to feel bloated.",
    "You are feeling rather flabby.",
];

async function phaze_dialogue() {
    const H = up(PASSES_WALLS).intrinsic;
    const i = Math.trunc((H & TIMEOUT) / 2);

    if (up(PASSES_WALLS).extrinsic || (H & ~TIMEOUT))
        return;

    if (((H & TIMEOUT) % 2) && i > 0 && i <= phaze_texts.length)
        await pline(phaze_texts[phaze_texts.length - i]);
}

// C ref: timeout.c region_texts[], region_dialogue()
const region_texts = [
    "You seem to have some trouble breathing.",
    "The air here seems foul.",
];

async function region_dialogue() {
    const p = up(MAGICAL_BREATHING);
    const r = (p.intrinsic & TIMEOUT), i = Math.trunc(r / 2);

    /* might have poly'd into non-breather or moved out of gas cloud */
    p.intrinsic &= ~TIMEOUT;
    const no_need_to_breathe = Breathless();
    const in_poison_gas_cloud = region_danger();
    p.intrinsic |= r;
    if (no_need_to_breathe || !in_poison_gas_cloud)
        return;

    if ((r % 2) && i > 0 && i <= region_texts.length)
        await pline(region_texts[region_texts.length - i]);
}

// C ref: timeout.c nh_timeout()
export async function nh_timeout() {
    const g = game;
    const u = g.u;
    const flags = g.flags;
    const P = u.uprops;
    let baseluck = (flags.moonphase === FULL_MOON) ? 1 : 0;

    if (flags.friday13)
        baseluck -= 1;

    if (g.quest_status.killed_leader)
        baseluck -= 4;

    if (Role_if(PM_ARCHEOLOGIST) && g.uarmh && g.uarmh.otyp === FEDORA)
        baseluck += 1;

    if (u.uluck !== baseluck
        && g.moves % ((u.uhave.amulet || u.ugangr) ? 300 : 600) === 0) {
        /* Cursed luckstones stop bad luck from timing out; blessed luckstones
         * stop good luck from timing out; normal luckstones stop both;
         * neither is stopped if you don't have a luckstone.
         * Luck is based at 0 usually, +1 if a full moon and -1 on Friday 13th
         */
        const time_luck = stone_luck(false);
        const nostone = !carrying(LUCKSTONE) && !stone_luck(true);

        if (u.uluck > baseluck && (nostone || time_luck < 0))
            u.uluck--;
        else if (u.uluck < baseluck && (nostone || time_luck > 0))
            u.uluck++;
    }
    if (u.uinvulnerable)
        return; /* things past this point could kill you */
    if (P[STONED].intrinsic) /* Stoned */
        await stoned_dialogue();
    if (P[SLIMED].intrinsic) /* Slimed */
        await slime_dialogue();
    if (P[VOMITING].intrinsic) /* Vomiting */
        await vomiting_dialogue();
    if (P[STRANGLED].intrinsic) /* Strangled */
        await choke_dialogue();
    if (P[SICK].intrinsic) /* Sick */
        await sickness_dialogue();
    if (P[LEVITATION].intrinsic & TIMEOUT)
        await levitation_dialogue();
    if (P[PASSES_WALLS].intrinsic & TIMEOUT)
        await phaze_dialogue();
    if (P[MAGICAL_BREATHING].intrinsic & TIMEOUT)
        await region_dialogue();
    if (P[SLEEPY].intrinsic & TIMEOUT)
        await sleep_dialogue();
    if (u.mtimedone && !--u.mtimedone) {
        /* Unchanging / you_unwere() / rehumanize(): polymorphing isn't
           ported yet */
        throw new Error('nh_timeout(): rehumanize() not ported yet');
    }
    if (u.ucreamed)
        u.ucreamed--;

    /* Dissipate spell-based protection. */
    if (u.usptime) {
        if (--u.usptime === 0 && u.uspellprot) {
            u.usptime = u.uspmtime;
            u.uspellprot--;
            /* find_ac() and the "golden haze" message: spell protection
               isn't ported yet */
            throw new Error('nh_timeout(): spell protection not ported yet');
        }
    }

    if (u.ugallop) {
        if (--u.ugallop === 0 && u.usteed)
            await pline("Your steed stops galloping."); /* Monnam() isn't ported yet */
    }

    for (let idx = 0; idx <= LAST_PROP; idx++) {
        const upp = P[idx];
        if ((upp.intrinsic & TIMEOUT) && !(--upp.intrinsic & TIMEOUT)) {
            /* find_delayed_killer(): not ported yet */
            switch (idx) {
            case FAST: {
                const HFast = P[FAST].intrinsic, EFast = P[FAST].extrinsic;
                const Very_fast = ((HFast & ~INTRINSIC) || EFast);
                if (!Very_fast)
                    await pline(`You feel yourself slow down${
                        (HFast || EFast) ? " a bit" : ""}.`);
                break;
            }
            case CONFUSION:
                /* So make_confused works properly */
                set_itimeout(CONFUSION, 1);
                await make_confused(0, true);
                if (!uhave(CONFUSION))
                    await stop_occupation();
                break;
            case STUNNED:
                set_itimeout(STUNNED, 1);
                await make_stunned(0, true);
                if (!uhave(STUNNED))
                    await stop_occupation();
                break;
            case BLINDED: {
                const was_blind = Blind();

                set_itimeout(BLINDED, 1);
                await make_blinded(0, true);
                if (was_blind && !Blind())
                    await stop_occupation();
                break;
            }
            case DEAF:
                set_itimeout(DEAF, 1);
                await make_deaf(0, true);
                g.disp_botl = true;
                if (!(uhave(DEAF) || u.uroleplay?.deaf))
                    await stop_occupation();
                break;
            case INVIS: {
                const Invis = uhave(INVIS) && !P[INVIS].blocked;
                newsym(u.ux, u.uy);
                if (!Invis && !P[INVIS].blocked && !Blind()) {
                    await pline(!uhave(SEE_INVIS)
                                ? "You are no longer invisible."
                                : "You can no longer see through yourself.");
                    await stop_occupation();
                }
                break;
            }
            case SEE_INVIS:
                set_mimic_blocking(); /* do special mimic handling */
                see_monsters();       /* make invis mons appear */
                newsym(u.ux, u.uy);   /* make self appear */
                await stop_occupation();
                break;
            case HALLUC:
                set_itimeout(HALLUC, 1);
                await make_hallucinated(0, true, 0);
                if (!(P[HALLUC].intrinsic && !uhave(HALLUC_RES)))
                    await stop_occupation();
                break;
            case FIRE_RES:
                /* timed fire resistance and timed water walking combine
                   as a way to survive lava after multiple life-saving
                   attempts fail to relocate hero; skip timeout message
                   if hero has acquired fire resistance in the meantime */
                if (!uhave(FIRE_RES))
                    await pline("Your temporary ability to survive burning has ended.");
                break;
            case WWALKING:
                /* [see fire resistance] */
                if (!uhave(WWALKING))
                    await pline("Your temporary ability to walk on liquid has ended.");
                break;
            case ACID_RES:
            case STONE_RES:
            case DISPLACED:
            case WARN_OF_MON:
            case PROT_FROM_SHAPE_CHANGERS:
                /* eating_dangerous_corpse(), wielding_corpse(),
                   toggle_displacement(), restartcham() */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            case DETECT_MONSTERS:
                see_monsters();
                break;
            case GLIB:
                make_glib(0); /* might update persistent inventory */
                break;
            case FLYING:
                /* timed Flying is via #wizintrinsic only */
                break;
            case WOUNDED_LEGS:
                await heal_legs(0);
                await stop_occupation();
                break;
            case STONED:
                /* done_timeout(STONING, STONED) */
                throw new Error('nh_timeout(): petrification (done_timeout()) not ported yet');
            case SLIMED:
                /* slimed_to_death() */
                throw new Error('nh_timeout(): slimed_to_death() not ported yet');
            case VOMITING:
                await make_vomiting(0, true);
                break;
            case STRANGLED:
                /* done_timeout(DIED, STRANGLED) */
                throw new Error('nh_timeout(): strangulation (done_timeout()) not ported yet');
            case SLEEPY:
                if (unconscious()
                    || P[SLEEP_RES].intrinsic || P[SLEEP_RES].extrinsic) {
                    incr_itimeout(SLEEPY, rnd(100));
                } else if (P[SLEEPY].intrinsic || P[SLEEPY].extrinsic) {
                    await You("fall asleep.");
                    const sleeptime = rnd(20);
                    await fall_asleep(-sleeptime, true);
                    incr_itimeout(SLEEPY, sleeptime + rnd(100));
                }
                break;
            case LEVITATION:
                /* float_down(I_SPECIAL | TIMEOUT, 0L) */
                throw new Error('nh_timeout(): float_down() not ported yet');
            case PASSES_WALLS:
            case MAGICAL_BREATHING:
                /* stuck_in_wall(), region_danger() feedback */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            case SICK:
                /* rn2(100) < ACURR(A_CON) and done_timeout() */
                throw new Error(`nh_timeout(): timeout of property ${idx} not ported yet`);
            case FUMBLING:
                /* call this only when a move took place.  */
                /* otherwise handle fumbling msgs locally. */
                if (u.umoved && !(prop_on(P[LEVITATION]) && !P[LEVITATION].blocked)
                    && !((prop_on(P[FLYING])
                          || (u.usteed && is_flyer(u.usteed.data)))
                         && !P[FLYING].blocked)) {
                    await slip_or_trip();
                    nomul(-2);
                    g.multi_reason = "fumbling";
                    g.nomovemsg = "";
                    /* The more you are carrying the more likely you
                     * are to make noise when you fumble.  Adjustments
                     * to this number must be thoroughly play tested.
                     */
                    if ((inv_weight() > (WT_NOISY_INV * -1))) {
                        if (!(prop_on(P[DEAF]) || u.uroleplay?.deaf)) /* !Deaf */
                            await You("make a lot of noise!");
                        await wake_nearby(false);
                    }
                }
                /* from outside means slippery ice; don't reset
                   counter if that's the only fumble reason */
                upp.intrinsic &= ~FROMOUTSIDE;
                if (prop_on(upp)) /* Fumbling */
                    incr_itimeout(FUMBLING, rnd(20));
                break;
            default:
                /* the remaining properties have no case in C */
                break;
            }
        }
    }

    /* run_timers(): the timer queue isn't ported yet; no timer set by
       level creation (corpse rot, revival, melting ice) comes due within
       the turns the sessions reach so far */
}

/* C ref: youprop.h property test: intrinsic or extrinsic */
function prop_on(upp) { return !!(upp.intrinsic || upp.extrinsic); }

// C ref: timeout.c slip_or_trip()
/* give a fumble message */
async function slip_or_trip() {
    const u = game.u;
    let otmp = vobj_at(u.ux, u.uy), otmp2;
    let what;
    const on_foot = !u.usteed;
    const P = u.uprops;
    /* Hallucination: HHallucination && !Halluc_resistance */
    const Hallu = !!(P[HALLUC].intrinsic && !prop_on(P[HALLUC_RES]));

    if (otmp && on_foot && !u.uinwater && is_pool(u.ux, u.uy))
        otmp = null;

    if (otmp && on_foot) { /* trip over something in particular */
        /*
          If there is only one item, it will have just been named
          during the move, so refer to it by pronoun; otherwise,
          if the top item has been or can be seen, refer to it by
          name; if not, look for rocks to trip over; trip over
          anonymous "something" if there aren't any rocks.
        */
        /* Blind: (HBlinded || EBlinded) && !BBlinded */
        const Blnd = !!(prop_on(P[BLINDED]) && !P[BLINDED].blocked);
        what = (game.iflags.last_msg === 'PLNMSG_ONE_ITEM_HERE')
                ? ((otmp.quan === 1) ? "it"
                      : Hallu ? "they" : "them")
                : (otmp.dknown || !Blnd)
                      ? doname(otmp)
                      : ((otmp2 = sobj_at_to(ROCK, u.ux, u.uy)) == null
                             ? "something"
                             : (otmp2.quan === 1 ? "a rock" : "some rocks"));
        if (Hallu) {
            throw new Error('slip_or_trip(): hallucinatory "Egads!" message not ported yet');
        } else {
            await You(`trip over ${what}.`);
        }
        if (!game.uarmf && otmp.otyp === CORPSE
            && (otmp.corpsenm === PM_COCKATRICE
                || otmp.corpsenm === PM_CHICKATRICE) /* touch_petrifies() */
            && !prop_on(P[STONE_RES]))
            throw new Error('slip_or_trip(): instapetrify() not ported yet');
    } else if ((P[FUMBLING].intrinsic & FROMOUTSIDE)
               || (is_ice(u.ux, u.uy) && !rn2(3))) {
        /* slipping on ice: message, dismount_steed() or hurtle() */
        throw new Error('slip_or_trip(): slipping on ice not ported yet');
    } else {
        if (on_foot) {
            switch (rn2(4)) {
            case 1:
                await You(`trip over your own ${
                    Hallu ? "elbow" : makeplural(body_part(FOOT))}.`);
                break;
            case 2:
                await You(`slip ${
                    Hallu ? "on a banana peel" : "and nearly fall"}.`);
                break;
            case 3:
                await You("flounder.");
                break;
            default:
                await You("stumble.");
                break;
            }

        /* mounted; saddle should never end up being Null here;
           don't fall off when it happens to be cursed */
        } else {
            throw new Error('slip_or_trip(): mounted fumbling (dismount_steed()) not ported yet');
        }
    }
}

// C ref: timeout.c fall_asleep()
export async function fall_asleep(how_long, wakeup_msg) {
    await stop_occupation();
    nomul(how_long);
    game.multi_reason = "sleeping";
    /* (#if 0 in C: the Deaf/Hear_again handling is disabled) */
    /* early wakeup from combat won't be possible until next monster turn */
    game.u.usleep = game.moves;
    game.nomovemsg = wakeup_msg ? "You wake up." : "You can move again.";
}

// C ref: timeout.c attach_egg_hatch_timeout()
// The timer queue isn't ported yet: as with start_corpse_timeout(), the
// pending timer is kept in obj.timer = { when, action }.
export function attach_egg_hatch_timeout(egg, when) {
    let i;

    /* stop previous timer, if any */
    /* (void) stop_timer(HATCH_EGG, obj_to_any(egg)) */
    if (egg.timer && egg.timer.action === 'HATCH_EGG')
        egg.timer = null;

    /*
     * Decide if and when to hatch the egg.  The old hatch_it() code tried
     * once a turn from age 151 to 200 (inclusive), hatching if it rolled
     * a number x, 1<=x<=age, where x>150.  This yields a chance of
     * hatching > 99.9993%.  Mimic that here.
     */
    if (!when) {
        for (i = (MAX_EGG_HATCH_TIME - 50) + 1; i <= MAX_EGG_HATCH_TIME; i++)
            if (rnd(i) > 150) {
                /* egg will hatch */
                when = i;
                break;
            }
    }
    if (when) {
        /* (void) start_timer(when, TIMER_OBJECT, HATCH_EGG, obj_to_any(egg)) */
        egg.timer = { when, action: 'HATCH_EGG' };
    }
}

// C ref: timeout.c kill_egg()
/* prevent an egg from ever hatching */
export function kill_egg(egg) {
    /* stop previous timer, if any */
    /* (void) stop_timer(HATCH_EGG, obj_to_any(egg)): the timer queue isn't
       ported yet and no hatch timer is ever started, so there is none */
}
