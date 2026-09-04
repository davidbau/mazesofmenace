// timeout.js — timed property expiry (timeout.c nh_timeout subset).
// C ref: timeout.c nh_timeout — once-per-turn intrinsic TIMEOUT decrement.
// C ref: timeout.c wiz_timeout_queue / print_queue / kind_name (D-1527);
// callee region.c visible_region_summary.

import { game } from './gstate.js';
import {
    TIMEOUT, FROMOUTSIDE, FUMBLING, FAST, FOOT, ICE, STRAT_WAITMASK,
    UNCHANGING, LAST_PROP, WOUNDED_LEGS, CONFUSION, BLINDED, DEAF,
    GLIB, I_SPECIAL, ECMD_OK, NECK, FAINTING, FULL_MOON,
    STUNNED, HALLUC, HALLUC_RES, LEVITATION, FLYING, INVIS, SEE_INVIS,
    CLAIRVOYANT, TELEPORT, REGENERATION, DETECT_MONSTERS,
    INVULNERABLE, STONED, SLIMED, STRANGLED, SICK, SLEEPY, POLYMORPH,
    VOMITING, ACID_RES, STONE_RES, DISPLACED, PASSES_WALLS,
    MAGICAL_BREATHING, WWALKING, FIRE_RES, COLD_RES, SLEEP_RES,
    ACCESSIBLE, Is_waterlevel, SICK_NONVOMITABLE, M_AP_MONSTER,
    COLNO, ROWNO, CLOUD,
    KILLED_BY_AN,
    DISINT_RES, SHOCK_RES, POISON_RES, DRAIN_RES, SICK_RES, ANTIMAGIC,
    BLND_RES, HUNGER, TELEPAT, WARNING, WARN_OF_MON, WARN_UNDEAD,
    SEARCHING, INFRAVISION, ADORNED, STEALTH, AGGRAVATE_MONSTER,
    CONFLICT, JUMPING, TELEPORT_CONTROL, SWIMMING, SLOW_DIGESTION,
    HALF_SPDAM, HALF_PHDAM, ENERGY_REGENERATION, PROTECTION,
    PROT_FROM_SHAPE_CHANGERS, POLYMORPH_CONTROL, REFLECTING,
    FREE_ACTION, FIXED_ABIL, LIFESAVED,
    OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_MIGRATING, OBJ_FREE,
    OBJ_CONTAINED, OBJ_BURIED,
    CONTAINED_TOO, BURIED_TOO, TIMER_OBJECT, TIMER_NONE, TIMER_LEVEL,
    TIMER_GLOBAL, TIMER_MONSTER, BURN_OBJECT, LS_OBJECT,
    MAX_RADIUS, W_ARM,
    G_GENOD, G_EXTINCT, NO_MINVENT, MM_NOMSG, NON_PM,
    MV_KNOWS_EGG, ARTICLE_NONE, ARTICLE_A, EXACT_NAME,
    REVIVE_MON, ROT_CORPSE, ZOMBIFY_MON, RLOC_NOMSG,
    has_omid, has_omonst,
} from './const.js';
import { heal_legs, float_down } from './trap.js';
import { stop_occupation, nomul, is_pool, is_lava, carrying, You_hear } from './hack.js';
import { run_timers, start_timer, stop_timer, weight,
    obj_extract_self, delobj, objects_at, attach_egg_hatch_timeout,
    obj_has_timer, rider_revival_time, rot_corpse, set_corpsenm,
    free_omid, free_omonst,
} from './mkobj.js';
import { make_confused, make_deaf, make_slimed, make_stoned, make_stunned, make_vomiting } from './potion.js';
import { make_blinded } from './do.js';
import { Fumbling, Fast, Very_fast, exercise, stone_luck, A_STR, A_DEX, A_CON } from './attrib.js';
import { pline, You_feel, newsym, canseemon, verbalize, Norep, see_monsters, impossible, urgent_pline, Hallucination } from './display.js';
import { inv_weight, update_inventory, useupall } from './invent.js';
import { doname, makeplural, xname, an, The, vtense } from './objnam.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { objectNames } from './objects.js';
import {
    G_UNIQ, is_were, mons, is_floater, is_flyer, amorphous, nolimbs,
    M1_SLITHY, MZ_SMALL, is_rider, is_displacer,
    breathless, monsterNames,
} from './monsters.js';
import { little_to_big, big_to_little, mhe, cantvomit } from './mondata.js';
import { dist2, ing_suffix, strsubst, strstri, upstart } from './hacklib.js';
import { Popeye, morehungry, vomit } from './eat.js';
import { phase_of_the_moon, friday_13th } from './calendar.js';
import { zombie_form } from './mon.js';
import { cry_sound } from './sounds.js';
import { Soundeffect } from './sndprocs.js';
import { se_kaboom_boom_boom } from './generated/seffects_data.js';
import { rehumanize, body_part } from './polyself.js';
import { you_unwere } from './were.js';
import { new_light_source, del_light_source } from './light.js';
import { cansee } from './vision.js';
import { is_art } from './artifact.js';
import { ART_SUNSWORD } from './generated/artifacts_data.js';
import { Monnam, x_monnam, hcolor, rndmonnam, hliquid } from './do_name.js';
import { find_ac } from './u_init.js';
import { any_visible_region, visible_region_summary } from './region.js';

/**
 * Props whose TIMEOUT is already decremented by the dedicated arms below
 * (flat + uprops sync). C does one loop over all uprops; JS keeps those
 * arms and skips them here to avoid double --.
 */
const TIMEOUT_DEDICATED = new Set([
    WOUNDED_LEGS, CONFUSION, BLINDED, DEAF, FUMBLING, FAST,
]);

/** Flat H* mirrors that wiz_intrinsic / make_* keep beside uprops. */
const TIMEOUT_FLAT = {
    [STUNNED]: 'HStun',
    [CONFUSION]: 'HConfusion',
    [HALLUC]: 'HHallucination',
    [BLINDED]: 'HBlinded',
    [DEAF]: 'HDeaf',
    [WOUNDED_LEGS]: 'HWounded_legs',
    [FUMBLING]: 'HFumbling',
    [LEVITATION]: 'HLevitation',
    [INVIS]: 'HInvis',
    [SEE_INVIS]: 'HSee_invisible',
    [CLAIRVOYANT]: 'HClairvoyant',
    [TELEPORT]: 'HTeleportation',
    [REGENERATION]: 'HRegeneration',
    [FAST]: 'HFast',
    [GLIB]: 'Glib',
    [DETECT_MONSTERS]: 'HDetect_monsters',
    [STONED]: 'Stoned',
    [SLIMED]: 'Slimed',
    [VOMITING]: 'Vomiting',
    [SICK]: 'Sick',
    [STRANGLED]: 'Strangled',
    [PASSES_WALLS]: 'HPasses_walls',
};

/** C ref: weight.h WT_NOISY_INV — inv_weight() threshold for noisy fumbling. */
const WT_NOISY_INV = 500;
const ROCK = objectNames.indexOf('ROCK');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const FEDORA = objectNames.indexOf('FEDORA');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_ARCHEOLOGIST = monsterNames.indexOf('PM_ARCHEOLOGIST');
const NH_GREEN = 'green';
const NH_BLUE = 'blue';

/** C ref: youprop.h Unchanging — H || E via flat + uprops. */
function hero_unchanging(u = game.u || {}) {
    const e = u.uprops?.[UNCHANGING];
    return !!((u.Unchanging || u.HUnchanging || u.EUnchanging)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK (quest leaders stay meditating).
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/** C ref: dbridge.c / rm.h is_ice — ICE terrain; drawbridge-under deferred. */
function is_ice(x, y) {
    return game.level?.at?.(x, y)?.typ === ICE;
}

/**
 * C ref: timeout.c slip_or_trip — fumble message + optional ice/mount arms.
 * Envelope: floor-object trip (no RNG); ice/FROMOUTSIDE path with rn2(3);
 * on_foot stumble `rn2(4)` messages. Named omissions: Hallu highc bite;
 * corpse touch_petrifies; mounted rn2(4)+dismount_steed; ice hurtle/
 * confdir/`rn2(10+DEX)`; PLNMSG_ONE_ITEM_HERE pronoun; Blind/dknown polish.
 */
async function slip_or_trip() {
    const u = game.u || {};
    const on_foot = !u.usteed;
    let otmp = objects_at(u.ux | 0, u.uy | 0);
    if (otmp && on_foot && !u.uinwater && is_pool(u.ux | 0, u.uy | 0)) {
        otmp = null;
    }

    if (otmp && on_foot) {
        // C: trip over particular floor object — no rn2(4)
        let what;
        if (otmp.dknown || !u.Blind) {
            what = doname(otmp);
        } else {
            let rock = null;
            for (let o = otmp; o; o = o.nexthere) {
                if (o.otyp === ROCK) { rock = o; break; }
            }
            if (!rock) what = 'something';
            else what = ((rock.quan | 0) === 1) ? 'a rock' : 'some rocks';
        }
        if (u.Hallucination) {
            await pline(`Egads!  ${what} bites your ${body_part(FOOT)}!`);
        } else {
            await pline(`You trip over ${what}.`);
        }
        // touch_petrifies corpse arm deferred
    } else if (((u.HFumbling | 0) & FROMOUTSIDE)
        || (is_ice(u.ux | 0, u.uy | 0) && !rn2(3))) {
        // Ice / FROMOUTSIDE slip — mounted dismount + hurtle deferred
        const verb = rn2(2) ? 'slip' : 'slide';
        const prep = is_ice(u.ux | 0, u.uy | 0) ? 'on' : 'off';
        await pline(`You ${verb} ${prep} the ice.`);
        // !on_foot dismount / !rn2(10+DEX) hurtle deferred (no further RNG here)
    } else if (on_foot) {
        // C: timeout.c:1302 switch (rn2(4))
        switch (rn2(4)) {
        case 1:
            await pline(`You trip over your own ${
                u.Hallucination ? 'elbow' : makeplural(body_part(FOOT))
            }.`);
            break;
        case 2:
            await pline(`You slip ${
                u.Hallucination ? 'on a banana peel' : 'and nearly fall'
            }.`);
            break;
        case 3:
            await pline('You flounder.');
            break;
        default:
            await pline('You stumble.');
            break;
        }
    } else {
        // Mounted saddle messages + dismount_steed deferred; still burn rn2(4)
        rn2(4);
    }
}

/**
 * Sync flat HFumbling with uprops[FUMBLING].intrinsic (Boots_on mirror).
 */
function set_HFumbling(val) {
    const u = game.u || (game.u = {});
    u.HFumbling = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FUMBLING] || (u.uprops[FUMBLING] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFumbling;
}

/** Sync flat HFast with uprops[FAST].intrinsic. */
function set_HFast(val) {
    const u = game.u || (game.u = {});
    u.HFast = val | 0;
    if (!u.uprops) u.uprops = {};
    const prop = u.uprops[FAST] || (u.uprops[FAST] = {
        intrinsic: 0, extrinsic: 0, blocked: 0,
    });
    prop.intrinsic = u.HFast;
}

/**
 * C ref: potion.c incr_itimeout — add to TIMEOUT field only.
 */
function incr_itimeout_HFumbling(incr) {
    const u = game.u || {};
    const cur = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    let val = (cur & TIMEOUT) + (incr | 0);
    if (val > TIMEOUT) val = TIMEOUT;
    set_HFumbling((cur & ~TIMEOUT) | (val & TIMEOUT));
}

/** C youprop.h H* / malady — flat or uprops[prop].intrinsic. */
function intr_bits(u, propId, flat) {
    return (u[flat] | 0) || (u.uprops?.[propId]?.intrinsic | 0);
}

/** C youprop.h E* — flat or uprops[prop].extrinsic. */
function extr_bits(u, propId, flat) {
    return (u[flat] | 0) || (u.uprops?.[propId]?.extrinsic | 0);
}

/** C youprop.h HDeaf ≡ u.uprops[DEAF].intrinsic — one field. */
function set_HDeaf(bits) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[DEAF]) {
        u.uprops[DEAF] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    u.HDeaf = bits | 0;
    u.uprops[DEAF].intrinsic = bits | 0;
}

/** C potion.c set_itimeout(&HDeaf, val) — TIMEOUT field only. */
function set_itimeout_HDeaf(val) {
    const u = game.u || (game.u = {});
    const cur = (u.HDeaf | 0) | (u.uprops?.[DEAF]?.intrinsic | 0);
    set_HDeaf((cur & ~TIMEOUT) | (val & TIMEOUT));
}

/** C potion.c incr_itimeout(&HDeaf, incr) — TIMEOUT bits only. */
function incr_itimeout_HDeaf(incr) {
    const u = game.u || (game.u = {});
    const cur = (u.HDeaf | 0) | (u.uprops?.[DEAF]?.intrinsic | 0);
    let val = (cur & TIMEOUT) + (incr | 0);
    if (val > TIMEOUT) val = TIMEOUT;
    if (val < 1) val = 0;
    set_itimeout_HDeaf((cur & ~TIMEOUT) | (val & TIMEOUT));
}

/**
 * Copy TIMEOUT flats (make_stoned etc.) into uprops so the generic
 * nh_timeout loop decrements the same bits C stores in one field.
 */
function sync_timeout_flats(u) {
    if (!u.uprops) u.uprops = {};
    for (const [ps, flat] of Object.entries(TIMEOUT_FLAT)) {
        const p = Number(ps);
        /* DEAF has a dedicated nh_timeout arm. Copying HDeaf → uprops
         * here once (D-1792) then -- only the flat left TIMEOUT stuck
         * for #wizintrinsic (D-1817). C HDeaf ≡ uprops[DEAF].intrinsic. */
        if (p === DEAF) continue;
        const fv = u[flat] | 0;
        if (!(fv & TIMEOUT)) continue;
        if (!u.uprops[p]) {
            u.uprops[p] = { intrinsic: fv, extrinsic: 0, blocked: 0 };
        } else if (!((u.uprops[p].intrinsic | 0) & TIMEOUT)) {
            u.uprops[p].intrinsic =
                ((u.uprops[p].intrinsic | 0) & ~TIMEOUT) | (fv & TIMEOUT);
        }
    }
}

/** C youprop.h Breathless — Magical_breathing || breathless(form). */
function hero_magical_breath() {
    const u = game.u || {};
    const p = u.uprops?.[MAGICAL_BREATHING];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
        || (u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || u.Magical_breathing
        || (game.youmonst?.data && breathless(game.youmonst.data)));
}

/* C timeout.c stoned_texts[] — index SIZE-i for remaining TIMEOUT i. */
const STONED_TEXTS = [
    'You are slowing down.',
    'Your limbs are stiffening.',
    'Your limbs have turned to stone.',
    'You have turned to stone.',
    'You are a statue.',
];

/**
 * C ref: timeout.c stoned_dialogue `:136–185`.
 * Message from remaining TIMEOUT; case 5 clears HFast; 4 stops occupation
 * unless Popeye(STONED); 3 nomul(-3)+heal_legs(2); 2 Deaf bump + stop
 * vomiting/slime silently. exercise(DEX) every call.
 */
async function stoned_dialogue() {
    const u = game.u || {};
    const i = intr_bits(u, STONED, 'Stoned') & TIMEOUT;
    if (i > 0 && i <= STONED_TEXTS.length) {
        let buf = STONED_TEXTS[STONED_TEXTS.length - i];
        if (nolimbs(game.youmonst?.data) && strstri(buf, 'limbs')) {
            buf = strsubst(buf, 'limbs', 'extremities');
        }
        await urgent_pline(buf);
    }
    switch (i) {
    case 5:
        set_HFast(0);
        if ((game.multi || 0) > 0) nomul(0);
        break;
    case 4:
        if (!Popeye(STONED)) await stop_occupation();
        if ((game.multi || 0) > 0) nomul(0);
        break;
    case 3:
        await stop_occupation();
        nomul(-3);
        game.multi_reason = 'getting stoned';
        game.nomovemsg = 'You can move again.';
        if ((intr_bits(u, WOUNDED_LEGS, 'HWounded_legs')
                || extr_bits(u, WOUNDED_LEGS, 'EWounded_legs'))
            && !u.usteed) {
            await heal_legs(2);
        }
        break;
    case 2: {
        const dt = (u.HDeaf | 0) & TIMEOUT;
        if (dt > 0 && dt < 5) set_itimeout_HDeaf(5);
        if (intr_bits(u, VOMITING, 'Vomiting')) {
            await make_vomiting(0, false);
        }
        if (intr_bits(u, SLIMED, 'Slimed')) {
            await make_slimed(0, null);
        }
        break;
    }
    default:
        break;
    }
    exercise(A_DEX, false);
}

/* C timeout.c vomiting_texts[] — You1 suffixes keyed by (TIMEOUT-1). */
const VOMITING_TEXTS = [
    'are feeling mildly nauseated.',
    'feel slightly confused.',
    "can't seem to think straight.",
    'feel incredibly sick.',
    'are about to vomit.',
];

/**
 * C ref: timeout.c vomiting_dialogue `:196–265`.
 * Switch on (Vomiting&TIMEOUT)-1 because nh_timeout has not -- yet.
 * case 6 FALLTHROUGH 9: stun then confuse. case 0: morehungry+vomit.
 */
async function vomiting_dialogue() {
    const u = game.u || {};
    let txt = null;
    const v = intr_bits(u, VOMITING, 'Vomiting') & TIMEOUT;
    switch ((v - 1) | 0) {
    case 14:
        txt = VOMITING_TEXTS[0];
        break;
    case 11:
        txt = VOMITING_TEXTS[1];
        if (strstri(txt, ' confused')
            && ((u.HConfusion | 0) || (u.Confusion | 0))) {
            txt = strsubst(txt, ' confused', ' more confused');
        }
        break;
    case 6:
        await make_stunned(((u.HStun | 0) & TIMEOUT) + d(2, 4), false);
        if (!Popeye(VOMITING)) await stop_occupation();
        /* FALLTHROUGH */
    case 9:
        await make_confused(((u.HConfusion | 0) & TIMEOUT) + d(2, 4), false);
        if ((game.multi || 0) > 0) nomul(0);
        break;
    case 8:
        txt = VOMITING_TEXTS[2];
        if (strstri(txt, ' think') && ((u.HStun | 0) || (u.Stunned | 0))) {
            txt = strsubst(txt, "can't seem to ", "can't ");
        }
        break;
    case 5:
        txt = VOMITING_TEXTS[3];
        break;
    case 2:
        txt = VOMITING_TEXTS[4];
        if (cantvomit(game.youmonst?.data)) txt = 'gag uncontrollably.';
        else if (Hallucination()) txt = 'are about to hurl!';
        break;
    case 0:
        await stop_occupation();
        if (!cantvomit(game.youmonst?.data)) {
            await morehungry(20);
            if ((u.uhs | 0) < FAINTING) {
                await pline(`You ${Hallucination() ? 'hurl chunks' : 'vomit'}!`);
            }
        }
        await vomit();
        break;
    default:
        break;
    }
    if (txt) await pline(`You ${txt}`);
    exercise(A_CON, false);
}

/* C timeout.c choke_texts[] / choke_texts2[] — Strangled TIMEOUT 1..5. */
const CHOKE_TEXTS = [
    'You find it hard to breathe.',
    "You're gasping for air.",
    'You can no longer breathe.',
    "You're turning %s.",
    'You suffocate.',
];
const CHOKE_TEXTS2 = [
    'Your %s is becoming constricted.',
    'Your blood is having trouble reaching your brain.',
    'The pressure on your %s increases.',
    'Your consciousness is fading.',
    'You suffocate.',
];

/**
 * C ref: timeout.c choke_dialogue `:294–314`.
 * Breathless or !rn2(50) → neck/constriction table; else choke_texts
 * (blue hcolor on the %s arm) and stop_occupation.
 */
async function choke_dialogue() {
    const i = intr_bits(game.u || {}, STRANGLED, 'Strangled') & TIMEOUT;
    if (i > 0 && i <= CHOKE_TEXTS.length) {
        if (hero_magical_breath() || !rn2(50)) {
            const fmt = CHOKE_TEXTS2[CHOKE_TEXTS2.length - i];
            await urgent_pline(
                fmt.includes('%s') ? fmt.replace('%s', body_part(NECK)) : fmt,
            );
        } else {
            const str = CHOKE_TEXTS[CHOKE_TEXTS.length - i];
            if (str.includes('%')) {
                await urgent_pline(str.replace('%s', hcolor(NH_BLUE)));
            } else {
                await urgent_pline(str);
            }
            await stop_occupation();
        }
    }
    exercise(A_STR, false);
}

/* C timeout.c sickness_texts[] — odd remaining TIMEOUT, i = j/2. */
const SICKNESS_TEXTS = [
    'Your illness feels worse.',
    'Your illness is severe.',
    "You are at Death's door.",
];

/**
 * C ref: timeout.c sickness_dialogue `:322–345`.
 * Food poisoning (no SICK_NONVOMITABLE) substitutes "sickness".
 * Hallu Death's door appends mhe/vtense "inviting you in."
 */
async function sickness_dialogue() {
    const u = game.u || {};
    const j = intr_bits(u, SICK, 'Sick') & TIMEOUT;
    const i = (j / 2) | 0;
    if (i > 0 && i <= SICKNESS_TEXTS.length && (j % 2) !== 0) {
        let buf = SICKNESS_TEXTS[SICKNESS_TEXTS.length - i];
        if (((u.usick_type | 0) & SICK_NONVOMITABLE) === 0) {
            buf = strsubst(buf, 'illness', 'sickness');
        }
        if (Hallucination() && strstri(buf, "Death's door")) {
            let pronoun = mhe(game.youmonst);
            pronoun = upstart(pronoun);
            buf += `  ${pronoun} ${vtense(pronoun, 'are')} inviting you in.`;
        }
        await urgent_pline(buf);
    }
    exercise(A_CON, false);
}

/* C timeout.c levi_texts[] — last float_down message is not in this table. */
const LEVI_TEXTS = [
    'You float slightly lower.',
    'You wobble unsteadily %s the %s.',
];

/**
 * C ref: timeout.c levitation_dialogue `:352–378`.
 * Skip if ELevitation or not ACCESSIBLE and not pool/lava.
 * Odd remaining TIMEOUT; %s arm is over/in + surface/air.
 * Named omit: surface() Underwater "bottom" (use hliquid water/lava).
 */
async function levitation_dialogue() {
    const u = game.u || {};
    const ht = intr_bits(u, LEVITATION, 'HLevitation') & TIMEOUT;
    const i = ((ht - 1) / 2) | 0;
    if (extr_bits(u, LEVITATION, 'ELevitation')) return;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const typ = game.level?.at?.(ux, uy)?.typ | 0;
    const pool_or_lava = is_pool(ux, uy) || is_lava(ux, uy);
    if (!ACCESSIBLE(typ) && !pool_or_lava) return;
    if ((ht % 2) && i > 0 && i <= LEVI_TEXTS.length) {
        const s = LEVI_TEXTS[LEVI_TEXTS.length - i];
        if (s.includes('%')) {
            const danger = pool_or_lava && !Is_waterlevel(u.uz);
            const surf = danger
                ? (is_lava(ux, uy) ? hliquid('lava') : hliquid('water'))
                : 'air';
            await urgent_pline(
                s.replace('%s', danger ? 'over' : 'in').replace('%s', surf),
            );
        } else {
            await pline(s);
        }
        await stop_occupation();
    }
}

/* C timeout.c slime_texts[] — odd t, i = t/2, index SIZE-i-1. */
const SLIME_TEXTS = [
    'You are turning a little %s.',
    'Your limbs are getting oozy.',
    'Your skin begins to peel away.',
    'You are turning into %s.',
    'You have become %s.',
];

/**
 * C ref: timeout.c slime_dialogue `:388–443`.
 * t==1 sets green-slime mimic appearance + newsym. i==4 green hcolor
 * if !Blind; other %s arms an(Hallu rndmonnam else "green slime").
 * case 3 clears HFast; 2 Deaf bump; 1 make_stoned(0) silent.
 */
async function slime_dialogue() {
    const u = game.u || {};
    const t = intr_bits(u, SLIMED, 'Slimed') & TIMEOUT;
    const i = (t / 2) | 0;
    if (t === 1) {
        if (!game.youmonst) game.youmonst = {};
        game.youmonst.m_ap_type = M_AP_MONSTER;
        game.youmonst.mappearance = PM_GREEN_SLIME;
        newsym(u.ux | 0, u.uy | 0);
    }
    if ((t % 2) !== 0 && i >= 0 && i < SLIME_TEXTS.length) {
        let buf = SLIME_TEXTS[SLIME_TEXTS.length - i - 1];
        if (nolimbs(game.youmonst?.data) && strstri(buf, 'limbs')) {
            buf = strsubst(buf, 'limbs', 'extremities');
        }
        if (buf.includes('%')) {
            if (i === 4) {
                if (!Blind()) {
                    await urgent_pline(buf.replace('%s', hcolor(NH_GREEN)));
                }
            } else {
                await urgent_pline(buf.replace(
                    '%s',
                    an(Hallucination() ? rndmonnam(null) : 'green slime'),
                ));
            }
        } else {
            await urgent_pline(buf);
        }
    }
    switch (i) {
    case 3:
        set_HFast(0);
        if (!Popeye(SLIMED)) await stop_occupation();
        if ((game.multi || 0) > 0) nomul(0);
        break;
    case 2: {
        const dt = (u.HDeaf | 0) & TIMEOUT;
        if (dt > 0 && dt < 5) set_itimeout_HDeaf(5);
        break;
    }
    case 1:
        if (intr_bits(u, STONED, 'Stoned')) {
            await make_stoned(0, null, KILLED_BY_AN, null);
        }
        break;
    default:
        break;
    }
    exercise(A_DEX, false);
}

/* C timeout.c phaze_texts[] — temporary Passes_walls prayer timeout. */
const PHAZE_TEXTS = [
    'You start to feel bloated.',
    'You are feeling rather flabby.',
];

/**
 * C ref: timeout.c phaze_dialogue `:533–543`.
 * Skip if extrinsic or non-TIMEOUT intrinsic. Odd remaining TIMEOUT.
 */
async function phaze_dialogue() {
    const u = game.u || {};
    const hp = intr_bits(u, PASSES_WALLS, 'HPasses_walls');
    const i = ((hp & TIMEOUT) / 2) | 0;
    if (extr_bits(u, PASSES_WALLS, 'EPasses_walls') || (hp & ~TIMEOUT)) {
        return;
    }
    if (((hp & TIMEOUT) % 2) && i > 0 && i <= PHAZE_TEXTS.length) {
        await pline(PHAZE_TEXTS[PHAZE_TEXTS.length - i]);
    }
}

/**
 * C timeout.c nh_timeout `:588–623` luck timeout toward baseluck.
 * moon / friday13 / killed_leader / fedora fedora; stone_luck +
 * carrying(LUCKSTONE) gate the uluck step every 300 (amulet/angry)
 * or 600 moves.
 */
function nh_timeout_luck(u) {
    const flags = game.flags || {};
    const moonphase = flags.moonphase ?? phase_of_the_moon();
    const friday13 = flags.friday13 ?? friday_13th();
    let baseluck = moonphase === FULL_MOON ? 1 : 0;
    if (friday13) baseluck -= 1;
    if (game.quest_status?.killed_leader) baseluck -= 4;
    if (((game.urole?.mnum | 0) === PM_ARCHEOLOGIST)
        && u.uarmh && (u.uarmh.otyp | 0) === FEDORA) {
        baseluck += 1;
    }
    const uluck = u.uluck | 0;
    const moves = game.moves | 0;
    const period = (u.uhave?.amulet || u.uhave_amulet || u.ugangr) ? 300 : 600;
    if (uluck !== baseluck && period && (moves % period) === 0) {
        const time_luck = stone_luck(false);
        const nostone = !carrying(LUCKSTONE) && !stone_luck(true);
        if (uluck > baseluck && (nostone || time_luck < 0)) u.uluck = uluck - 1;
        else if (uluck < baseluck && (nostone || time_luck > 0)) {
            u.uluck = uluck + 1;
        }
    }
}

/**
 * C ref: timeout.c nh_timeout — decrement timed intrinsics; on TIMEOUT
 * expiry run property-specific handlers.
 * Envelope: luck baseluck + stone_luck (D-1792); Stoned/Slimed/Vomiting/
 * Strangled/Sick/HLevitation/HPasses_walls dialogues before --;
 * WOUNDED_LEGS → heal_legs(0) + stop_occupation;
 * CONFUSION → set_itimeout(1) + make_confused(0,TRUE) + stop_occupation;
 * BLINDED → set_itimeout(1) + make_blinded(0,TRUE) + stop_occupation (D-0928);
 * FUMBLING → slip_or_trip + nomul(-2) + incr_itimeout rnd(20) (D-0692);
 * DEAF → make_deaf(0) on expiry (D-0911; Unaware talk D-1817).
 * FAST → timeout decrement + slow-down You_feel when !Very_fast (D-0919).
 * DETECT_MONSTERS TIMEOUT → see_monsters on expiry (D-1418; C timeout.c
 * `:932–934`; remaining expiry switch still silent).
 * LEVITATION TIMEOUT → float_down(I_SPECIAL|TIMEOUT) (D-1419; C timeout.c
 * `:794–803`; Flying TIMEOUT==1 bypass so both expiring skip "now flying").
 * INVIS TIMEOUT → newsym + You no-longer-invisible / can-no-longer-see-
 * through-yourself iff !Invis && !BInvis && !Blind (D-1421; C timeout.c
 * `:759–767`).
 * mtimedone → rehumanize / Unchanging rnd refresh (D-0928 #1112).
 * usptime SPE_PROTECTION dissipate (D-1390; after mtimedone like C).
 * Remaining uprops TIMEOUT (incl. INVULNERABLE from #wizintrinsic) —
 * generic -- like C's for (upp = u.uprops; …) (D-0928 #1168); expiry
 * switch cases for those props still deferred (silent clear).
 * Named omissions: region_dialogue / sleep_dialogue; STONED/SLIMED
 * done_timeout / slimed_to_death; STUNNED/SEE_INVIS/HALLUC/SLEEPY/…
 * expiry messages; FLYING timed-land (wizintrinsic); GLIB `make_glib(0)`
 * inventory on expiry; ublesscnt (in allmain); ugallop; delayed killers;
 * defer_decor; full ice/mount slip_or_trip arms; you_unwere callers
 * beyond mtimedone (pray TROUBLE / potion); surface() Underwater bottom.
 * u.uinvulnerable early-return freezes all TIMEOUT (D-0928 #1171) after
 * luck (C: luck still runs).
 */
export async function nh_timeout() {
    const u = game.u || (game.u = {});
    /* C timeout.c :597–621 — luck toward baseluck before invulnerable. */
    nh_timeout_luck(u);
    // C: if (u.uinvulnerable) return; — freezes ALL TIMEOUT decrement (D-0928 #1171)
    if (u.uinvulnerable) return;
    /* C timeout.c :623–637 — property dialogues before uprops --. */
    if (intr_bits(u, STONED, 'Stoned')) await stoned_dialogue();
    if (intr_bits(u, SLIMED, 'Slimed')) await slime_dialogue();
    if (intr_bits(u, VOMITING, 'Vomiting')) await vomiting_dialogue();
    if (intr_bits(u, STRANGLED, 'Strangled')) await choke_dialogue();
    if (intr_bits(u, SICK, 'Sick')) await sickness_dialogue();
    if (intr_bits(u, LEVITATION, 'HLevitation') & TIMEOUT) {
        await levitation_dialogue();
    }
    if (intr_bits(u, PASSES_WALLS, 'HPasses_walls') & TIMEOUT) {
        await phaze_dialogue();
    }
    // C: for (upp = u.uprops; …) if ((intrinsic & TIMEOUT) && !(--intrinsic & TIMEOUT))

    const hw = u.HWounded_legs | 0;
    if (hw & TIMEOUT) {
        // C: --upp->intrinsic then test TIMEOUT bits cleared
        const next = hw - 1;
        u.HWounded_legs = next;
        if (!(next & TIMEOUT)) {
            // C case WOUNDED_LEGS: heal_legs(0); stop_occupation();
            await heal_legs(0);
            await stop_occupation();
        }
    }

    const hc = u.HConfusion | 0;
    if (hc & TIMEOUT) {
        const next = hc - 1;
        u.HConfusion = next;
        u.Confusion = next;
        if (!(next & TIMEOUT)) {
            // C case CONFUSION: set_itimeout(&HConfusion, 1L);
            // make_confused(0L, TRUE); if (!Confusion) stop_occupation();
            u.HConfusion = ((u.HConfusion | 0) & ~TIMEOUT) | 1;
            u.Confusion = u.HConfusion;
            await make_confused(0, true);
            if (!(u.HConfusion | 0) && !(u.Confusion | 0)) {
                await stop_occupation();
            }
        }
    }

    // C case BLINDED — timeout.c:743; make_blinded(0,TRUE) + stop if cured
    const hb = u.HBlinded | 0;
    if (hb & TIMEOUT) {
        const next = hb - 1;
        u.HBlinded = next;
        // Keep uprops[BLINDED] ≡ HBlinded (C single storage; D-0928 #1171)
        if (!u.uprops) u.uprops = {};
        if (!u.uprops[BLINDED]) {
            u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        u.uprops[BLINDED].intrinsic =
            ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (next & TIMEOUT);
        if (!(next & TIMEOUT)) {
            // C: after --, was_blind = !!Blind (props, not sticky);
            // set_itimeout(&HBlinded, 1L); make_blinded(0L, TRUE);
            // if (was_blind && !Blind) stop_occupation();
            const was_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | 1;
            u.uprops[BLINDED].intrinsic =
                ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | 1;
            await make_blinded(0, true);
            const still_blind = (!!(((u.HBlinded | 0) || (u.EBlinded | 0))
                && !(u.BBlinded | 0)))
                || !!u.uroleplay?.blind;
            if (was_blind && !still_blind) await stop_occupation();
        }
    }

    // C case DEAF — timeout.c:752; make_deaf(0,TRUE) talk suppressed if Unaware
    // HDeaf ≡ uprops[DEAF].intrinsic (youprop.h). D-1792 sync_timeout_flats
    // copied the flat once; this arm used to -- only u.HDeaf, leaving
    // uprops TIMEOUT stuck (seed4500 #wizintrinsic deafness [2], D-1817).
    const hd = (u.HDeaf | 0) | (u.uprops?.[DEAF]?.intrinsic | 0);
    if (hd & TIMEOUT) {
        const next = hd - 1;
        set_HDeaf(next);
        if (!(next & TIMEOUT)) {
            // C: set_itimeout(&HDeaf, 1L); make_deaf(0L, TRUE);
            set_itimeout_HDeaf(1);
            await make_deaf(0, true);
            if (game.disp) game.disp.botl = true;
            if (game.flags) game.flags.botl = true;
            const stillDeaf = !!(u.HDeaf || u.EDeaf || u.uroleplay?.deaf || u.Deaf
                || (u.uprops?.[DEAF]?.intrinsic | 0)
                || (u.uprops?.[DEAF]?.extrinsic | 0));
            if (!stillDeaf) await stop_occupation();
        }
    }

    // C case FUMBLING — timeout.c:902
    const hf = (u.HFumbling | 0) | (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if (hf & TIMEOUT) {
        const next = hf - 1;
        set_HFumbling(next);
        if (!(next & TIMEOUT)) {
            // C: if (u.umoved && !(Levitation || Flying))
            if (u.umoved && !(u.Levitation || u.Flying)) {
                await slip_or_trip();
                nomul(-2);
                game.multi_reason = 'fumbling';
                game.nomovemsg = '';
                // C: inv_weight() > (WT_NOISY_INV * -1)
                if (inv_weight() > -WT_NOISY_INV) {
                    if (!(u.HDeaf | u.Deaf)) {
                        await pline('You make a lot of noise!');
                    }
                    wake_nearby(false);
                }
            }
            // C: HFumbling &= ~FROMOUTSIDE; if (Fumbling) incr_itimeout rnd(20)
            set_HFumbling((u.HFumbling | 0) & ~FROMOUTSIDE);
            if (Fumbling()) {
                incr_itimeout_HFumbling(rnd(20));
            }
            // defer_decor deferred
        }
    }

    // C case FAST — timeout.c:725; timed FAST is Very_fast until TIMEOUT ends
    const hfast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
    if (hfast & TIMEOUT) {
        const next = hfast - 1;
        set_HFast(next);
        if (!(next & TIMEOUT)) {
            // C: if (!Very_fast) You_feel("yourself slow down%s.", Fast ? " a bit" : "");
            if (!Very_fast()) {
                await You_feel(`yourself slow down${Fast() ? ' a bit' : ''}.`);
            }
        }
    }

    // C: for (upp = u.uprops; upp < u.uprops + SIZE(u.uprops); upp++)
    //    if ((upp->intrinsic & TIMEOUT) && !(--upp->intrinsic & TIMEOUT))
    // Dedicated arms above already -- those props; remaining (INVULNERABLE,
    // resistances, …) only live in uprops and were never decremented — so
    // #wizintrinsic leftovers like invulnerable [30] never cleared (D-0928).
    if (!u.uprops) u.uprops = {};
    sync_timeout_flats(u);
    for (let p = 1; p <= LAST_PROP; p++) {
        if (TIMEOUT_DEDICATED.has(p)) continue;
        const prop = u.uprops[p];
        if (!prop) continue;
        const intr = prop.intrinsic | 0;
        if (!(intr & TIMEOUT)) continue;
        const next = intr - 1;
        prop.intrinsic = next;
        const flat = TIMEOUT_FLAT[p];
        if (flat) {
            u[flat] = ((u[flat] | 0) & ~TIMEOUT) | (next & TIMEOUT);
            if (p === HALLUC) {
                u.Hallucination = !!(u.HHallucination & TIMEOUT);
            }
            if (p === STUNNED) u.Stunned = u.HStun;
            if (p === GLIB) u.HGlib = next;
        }
        // Expiry switch (STONED/HALLUC/…) deferred — silent clear
        // except DETECT_MONSTERS → see_monsters (D-1418), LEVITATION
        // → float_down (D-1419), and INVIS → newsym + You (D-1421).
        if (!(next & TIMEOUT) && p === DETECT_MONSTERS) {
            see_monsters();
        }
        if (!(next & TIMEOUT) && p === LEVITATION) {
            /* C timeout.c :794–803 — if Flying times out this same
             * turn, clear it first so float_down does not report
             * "stopped levitating and are now flying". */
            const hf = (u.HFlying | 0)
                | (u.uprops?.[FLYING]?.intrinsic | 0);
            if ((hf & TIMEOUT) === 1) {
                const cleared = hf & ~TIMEOUT;
                u.HFlying = cleared;
                if (!u.uprops[FLYING]) {
                    u.uprops[FLYING] = {
                        intrinsic: 0, extrinsic: 0, blocked: 0,
                    };
                }
                u.uprops[FLYING].intrinsic = cleared;
            }
            await float_down(I_SPECIAL | TIMEOUT, 0);
            if (!u.uprops[LEVITATION]) {
                u.uprops[LEVITATION] = {
                    intrinsic: 0, extrinsic: 0, blocked: 0,
                };
            }
            u.uprops[LEVITATION].intrinsic = u.HLevitation | 0;
            u.uprops[LEVITATION].extrinsic = u.ELevitation | 0;
        }
        if (!(next & TIMEOUT) && p === INVIS) {
            /* C timeout.c :759–767 — newsym then You iff
             * !Invis && !BInvis && !Blind. */
            newsym(u.ux | 0, u.uy | 0);
            if (!Invis() && !BInvis() && !Blind()) {
                await pline(
                    !See_invisible()
                        ? 'You are no longer invisible.'
                        : 'You can no longer see through yourself.',
                );
                await stop_occupation();
            }
        }
    }

    // C: u.mtimedone && !--u.mtimedone → Unchanging refresh / were / rehumanize
    if (u.mtimedone) {
        u.mtimedone = (u.mtimedone | 0) - 1;
        if (!(u.mtimedone | 0)) {
            if (hero_unchanging(u)) {
                const mlvl = game.youmonst?.data?.mlevel | 0;
                u.mtimedone = rnd(100 * mlvl + 1);
            } else if (is_were(game.youmonst?.data)) {
                // C: you_unwere(FALSE) — polycontrl may ask rehumanize
                await you_unwere(false);
            } else {
                await rehumanize();
            }
        }
    }

    /* C timeout.c :652–661 — dissipate SPE_PROTECTION (D-1390).
     * After mtimedone / ucreamed; before ugallop / uprops in C.
     * JS uprops arms already ran above (pre-existing order). */
    if (u.usptime) {
        u.usptime = ((u.usptime | 0) - 1) & 0xff;
        if (u.usptime === 0 && (u.uspellprot | 0)) {
            u.usptime = u.uspmtime | 0;
            u.uspellprot = ((u.uspellprot | 0) - 1) & 0xff;
            find_ac();
            if (!Blind()) {
                const hgolden = hcolor('golden'); /* NH_GOLDEN */
                await Norep(
                    `The ${hgolden} haze around you ${
                        u.uspellprot ? 'becomes less dense' : 'disappears'
                    }.`,
                );
            }
        }
    }

    // C: run_timers() at end of nh_timeout — corpse rot / object timers
    await run_timers();
}

/**
 * C ref: timeout.c do_storms `:1846–1892` — once-per-turn from
 * moveloop_core after dosounds. Non-stormy levels return before
 * any RNG (`!stormy || rn2(8)` short-circuit).
 * Named omit: `buzz(BZ_M_SPELL(BZ_OFS_AD(AD_ELEC)), 8, …)` /
 * `dobuzz` (zap.c; lightning bolt). Strike position/dir RNG still
 * runs when a storm fires.
 */
export async function do_storms() {
    const flags = game.level?.flags;
    if (!flags?.stormy || rn2(8)) return;

    for (let nstrike = rnd(64); nstrike <= 64; nstrike *= 2) {
        let count = 0;
        let x = 0;
        let y = 0;
        do {
            x = rnd(COLNO - 1);
            y = rn2(ROWNO);
        } while (++count < 100
            && game.level?.at?.(x, y)?.typ !== CLOUD);

        if (count < 100) {
            const dirx = rn2(3) - 1;
            const diry = rn2(3) - 1;
            if (dirx !== 0 || diry !== 0) {
                /* C: gb.buzzer = 0; buzz(BZ_M_SPELL(BZ_OFS_AD(AD_ELEC)), …) */
                game.buzzer = null;
            }
        }
    }

    const u = game.u || {};
    if (game.level?.at?.(u.ux | 0, u.uy | 0)?.typ === CLOUD) {
        Soundeffect(se_kaboom_boom_boom, 80);
        await pline('Kaboom!!!  Boom!!  Boom!!');
        incr_itimeout_HDeaf(rn1(20, 30));
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        if (!u.uinvulnerable) {
            await stop_occupation();
            nomul(-3);
            game.multi_reason = 'hiding from thunderstorm';
            game.nomovemsg = null;
        }
    } else {
        await You_hear('a rumbling noise.');
    }
}

/* ---- light / burn (timeout.c) — D-0978 ---- */

const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const POT_OIL = objectNames.indexOf('POT_OIL');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');

/** C ref: obj.h Is_candle */
export function Is_candle(otmp) {
    return !!otmp && ((otmp.otyp | 0) === TALLOW_CANDLE
        || (otmp.otyp | 0) === WAX_CANDLE);
}

/** C ref: obj.h age_is_relative */
export function age_is_relative(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp | 0;
    return t === BRASS_LANTERN || t === OIL_LAMP
        || t === CANDELABRUM_OF_INVOCATION
        || t === TALLOW_CANDLE || t === WAX_CANDLE
        || t === POT_OIL;
}

/** C ref: obj.h ignitable */
export function ignitable(otmp) {
    if (!otmp) return false;
    const t = otmp.otyp | 0;
    return t === BRASS_LANTERN || t === OIL_LAMP
        || (t === MAGIC_LAMP && (otmp.spe | 0) > 0)
        || t === CANDELABRUM_OF_INVOCATION
        || t === TALLOW_CANDLE || t === WAX_CANDLE
        || t === POT_OIL;
}

/** C ref: artifact.c artifact_light — Sunsword + worn gold DSM/scales. */
export function artifact_light(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if ((t === GOLD_DRAGON_SCALE_MAIL || t === GOLD_DRAGON_SCALES)
        && ((obj.owornmask | 0) & W_ARM) !== 0) {
        return true;
    }
    return is_art(obj, ART_SUNSWORD);
}

/** C ref: light.c candle_light_range */
export function candle_light_range(obj) {
    if (!obj) return 3;
    if ((obj.otyp | 0) === CANDELABRUM_OF_INVOCATION) {
        const spe = obj.spe | 0;
        return spe < 4 ? 2 : (spe < 7 ? 3 : 4);
    }
    if (Is_candle(obj)) {
        const n = obj.quan | 0;
        let radius = 1;
        while (radius * radius <= n && radius < MAX_RADIUS) radius++;
        return radius;
    }
    return 3;
}

/** C ref: light.c arti_light_radius */
export function arti_light_radius(obj) {
    if (!obj?.lamplit || !artifact_light(obj)) return 0;
    let res = obj.blessed ? 3 : (!obj.cursed ? 2 : 1);
    if (obj === game.u?.uskin) res = 1;
    else if ((obj.otyp | 0) === GOLD_DRAGON_SCALE_MAIL) res++;
    return res;
}

function Blind() {
    const u = game.u || {};
    return !!((u.HBlind | 0) || (u.EBlind | 0) || u.Blind
        || ((u.HBlinded | 0) & TIMEOUT) || (u.EBlinded | 0));
}

const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');

/**
 * C youprop.h BInvis — uprops[INVIS].blocked.
 * JS setworn named-omits w_blocks; worn MUMMY_WRAPPING on uarmc
 * stands in (C worn.c setworn; zap.js / potion.js BInvis).
 */
function BInvis() {
    const u = game.u || {};
    const p = u.uprops?.[INVIS];
    if ((u.BInvis | 0) || (p?.blocked | 0)) return true;
    const cloak = u.uarmc;
    return !!(cloak && (cloak.otyp | 0) === MUMMY_WRAPPING);
}

/**
 * C youprop.h Invis — (HInvis || EInvis) && !BInvis
 */
function Invis() {
    const u = game.u || {};
    const p = u.uprops?.[INVIS];
    const H = (u.HInvis | 0) || (p?.intrinsic | 0);
    const E = (u.EInvis | 0) || (p?.extrinsic | 0);
    return !!(H || E) && !BInvis();
}

/**
 * C youprop.h See_invisible — HSee_invisible || ESee_invisible
 */
function See_invisible() {
    const u = game.u || {};
    const p = u.uprops?.[SEE_INVIS];
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
}

function carried(obj) {
    // C invent.c: #define carried(o) ((o)->where == OBJ_INVENT)
    return !!obj && obj.where === OBJ_INVENT;
}

/** C ref: zap.c get_obj_location — invent/floor/minvent + flags.
 * hatch_egg / burn_object / fig_transform / catch_lit pass 0:
 * OBJ_CONTAINED and OBJ_BURIED are false unless CONTAINED_TOO /
 * BURIED_TOO. Restore must keep cobj where=OBJ_CONTAINED
 * (restore.c restobjchn; D-1054) — not the parent chain's where. */
export function get_obj_location(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where | 0) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_MINVENT:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        }
        break;
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            return { x: obj.ox | 0, y: obj.oy | 0 };
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO) {
            return get_obj_location(obj.ocontainer, locflags);
        }
        break;
    }
    return null;
}

function Shk_Your(obj) {
    if (carried(obj)) return 'Your ';
    if (obj?.where === OBJ_MINVENT && obj.ocarry) {
        return `${Monnam(obj.ocarry)}'s `;
    }
    return 'The ';
}

function Yname2(obj) {
    if (carried(obj)) {
        const s = `your ${xname(obj)}`;
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return The(xname(obj));
}

async function You_see(line) {
    if (Blind()) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

/**
 * C ref: timeout.c burn_away_slime — clear Slimed TIMEOUT with message.
 */
export async function burn_away_slime() {
    const u = game.u || {};
    if (u.Slimed) {
        await make_slimed(0, 'The slime that covers you is burned away!');
    }
}

/**
 * C ref: timeout.c begin_burn — start BURN_OBJECT timer + LS_OBJECT light.
 * Silent. Named omit: update_inventory redraw.
 */
export function begin_burn(obj, already_lit) {
    if (!obj) return;
    let radius = 3;
    let turns = 0;
    let do_timer = true;

    if ((obj.age | 0) === 0 && (obj.otyp | 0) !== MAGIC_LAMP
        && !artifact_light(obj)) {
        return;
    }

    switch (obj.otyp | 0) {
    case MAGIC_LAMP:
        obj.lamplit = 1;
        do_timer = false;
        break;
    case POT_OIL:
        turns = obj.age | 0;
        if (obj.odiluted) turns = Math.trunc((3 * turns + 2) / 4);
        radius = 1;
        break;
    case BRASS_LANTERN:
    case OIL_LAMP:
        if ((obj.age | 0) > 150) turns = (obj.age | 0) - 150;
        else if ((obj.age | 0) > 100) turns = (obj.age | 0) - 100;
        else if ((obj.age | 0) > 50) turns = (obj.age | 0) - 50;
        else if ((obj.age | 0) > 25) turns = (obj.age | 0) - 25;
        else turns = obj.age | 0;
        break;
    case CANDELABRUM_OF_INVOCATION:
    case TALLOW_CANDLE:
    case WAX_CANDLE:
        if ((obj.age | 0) > 75) turns = (obj.age | 0) - 75;
        else if ((obj.age | 0) > 15) turns = (obj.age | 0) - 15;
        else turns = obj.age | 0;
        radius = candle_light_range(obj);
        break;
    default:
        if (artifact_light(obj)) {
            obj.lamplit = 1;
            do_timer = false;
            radius = arti_light_radius(obj);
        } else {
            turns = obj.age | 0;
        }
        break;
    }

    if (do_timer) {
        if (start_timer(turns, TIMER_OBJECT, BURN_OBJECT, obj)) {
            obj.lamplit = 1;
            obj.age = (obj.age | 0) - turns;
            // update_inventory deferred
        } else {
            obj.lamplit = 0;
        }
    } else if (carried(obj) && !already_lit) {
        // update_inventory deferred
    }

    if (obj.lamplit && !already_lit) {
        const loc = get_obj_location(obj, CONTAINED_TOO | BURIED_TOO);
        if (loc) new_light_source(loc.x, loc.y, radius, LS_OBJECT, obj);
    }
}

/**
 * C ref: timeout.c end_burn — snuff or timer-less light off.
 * timer_attached TRUE → stop_timer (+ cleanup_burn via mkobj).
 */
export function end_burn(obj, timer_attached) {
    if (!obj?.lamplit) return;
    if ((obj.otyp | 0) === MAGIC_LAMP || artifact_light(obj)) {
        timer_attached = false;
    }
    if (!timer_attached) {
        del_light_source(LS_OBJECT, obj);
        obj.lamplit = 0;
        return;
    }
    stop_timer(BURN_OBJECT, obj);
}

/**
 * C ref: light.c obj_merge_light_sources — src folded into dest.
 * src === dest means adding candles to a lit candelabrum (range only).
 */
export function obj_merge_light_sources(src, dest) {
    if (src !== dest) end_burn(src, true);
    const list = game.light_base;
    if (!list?.length || !dest) return;
    for (const ls of list) {
        if (ls.type === LS_OBJECT && ls.id === dest) {
            ls.range = candle_light_range(dest);
            game.vision_full_recalc = 1;
            break;
        }
    }
}

/**
 * C ref: timeout.c burn_object — BURN_OBJECT timer callback.
 * Envelope: fuel milestones + burn-out useup; away-timeout catch-up.
 * Named omit: maybe_unhide_at polish; update_inventory redraw.
 */
export async function burn_object(obj, timeout) {
    if (!obj) return;
    const moves = game.moves | 0;
    const menorah = (obj.otyp | 0) === CANDELABRUM_OF_INVOCATION;
    const many = menorah ? (obj.spe | 0) > 1 : (obj.quan | 0) > 1;

    if ((timeout | 0) !== moves) {
        const how_long = moves - (timeout | 0);
        if (how_long >= (obj.age | 0)) {
            obj.age = 0;
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
            } else if (Is_candle(obj) || (obj.otyp | 0) === POT_OIL) {
                obj_extract_self(obj);
                delobj(obj);
            }
        } else {
            obj.age = (obj.age | 0) - how_long;
            begin_burn(obj, true);
        }
        return;
    }

    const loc = get_obj_location(obj, 0);
    const canseeit = !Blind() && !!loc && cansee(loc.x, loc.y);
    const whose = Shk_Your(obj);
    const bytouch = obj.where === OBJ_INVENT
        && (obj.otyp | 0) !== BRASS_LANTERN;
    let need_newsym = false;

    switch (obj.otyp | 0) {
    case POT_OIL:
        if (canseeit) {
            if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                await pline(`${whose}potion of oil has burnt away.`);
            } else if (obj.where === OBJ_FLOOR) {
                await You_see('a burning potion of oil go out.');
                need_newsym = true;
            }
        }
        end_burn(obj, false);
        if (carried(obj)) useupall(obj);
        else {
            if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
            obj_extract_self(obj);
            delobj(obj);
        }
        obj = null;
        break;

    case BRASS_LANTERN:
    case OIL_LAMP: {
        const age = obj.age | 0;
        if (age === 150 || age === 100 || age === 50) {
            if (canseeit) {
                if ((obj.otyp | 0) === BRASS_LANTERN) {
                    if (obj.where === OBJ_INVENT) {
                        await pline('Your lantern is getting dim.');
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see('a lantern getting dim.');
                    } else if (obj.where === OBJ_MINVENT && obj.ocarry) {
                        await pline(
                            `${Monnam(obj.ocarry)}'s lantern is getting dim.`,
                        );
                    }
                } else {
                    const considerably = age === 50 ? ' considerably' : '';
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${Yname2(obj)} flickers${considerably}.`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `${an(xname(obj))} flicker${considerably}.`,
                        );
                    }
                }
            }
        } else if (age === 25) {
            if (canseeit) {
                if ((obj.otyp | 0) === BRASS_LANTERN) {
                    if (obj.where === OBJ_INVENT) {
                        await pline('Your lantern is getting dim.');
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see('a lantern getting dim.');
                    }
                } else if (obj.where === OBJ_INVENT
                    || obj.where === OBJ_MINVENT) {
                    await pline(`${Yname2(obj)} seems about to go out.`);
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(`${an(xname(obj))} about to go out.`);
                }
            }
        } else if (age === 0) {
            if (canseeit || bytouch) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    if ((obj.otyp | 0) === BRASS_LANTERN) {
                        await pline(`${whose}lantern has run out of power.`);
                    } else {
                        await pline(`${Yname2(obj)} has gone out.`);
                    }
                } else if (obj.where === OBJ_FLOOR) {
                    if ((obj.otyp | 0) === BRASS_LANTERN) {
                        await You_see('a lantern run out of power.');
                    } else {
                        await You_see(`${an(xname(obj))} go out.`);
                    }
                }
            }
            end_burn(obj, false);
        }
        if (obj && (obj.age | 0)) begin_burn(obj, true);
        break;
    }

    case CANDELABRUM_OF_INVOCATION:
    case TALLOW_CANDLE:
    case WAX_CANDLE: {
        const age = obj.age | 0;
        if (age === 75) {
            if (canseeit) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    await pline(
                        `${whose}${menorah ? "candelabrum's " : ''}candle${
                            many ? 's are' : ' is'} getting short.`,
                    );
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(
                        `${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                        }candle${many ? 's' : ''} getting short.`,
                    );
                }
            }
        } else if (age === 15) {
            if (canseeit) {
                if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                    await pline(
                        `${whose}${menorah ? "candelabrum's " : ''}candle${
                            many ? "s'" : "'s"} flame${many ? 's' : ''} flicker${
                            many ? '' : 's'} low!`,
                    );
                } else if (obj.where === OBJ_FLOOR) {
                    await You_see(
                        `${menorah ? "a candelabrum's " : many ? 'some ' : 'a '
                        }candle${many ? "s'" : "'s"} flame${
                            many ? 's' : ''} flicker low!`,
                    );
                }
            }
        } else if (age === 0) {
            if (canseeit || bytouch) {
                if (menorah) {
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${whose}candelabrum's flame${
                                many ? 's die' : ' dies'}.`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `a candelabrum's flame${many ? 's' : ''} die.`,
                        );
                    }
                } else {
                    if (obj.where === OBJ_INVENT || obj.where === OBJ_MINVENT) {
                        await pline(
                            `${Yname2(obj)} ${many ? 'are' : 'is'} consumed!`,
                        );
                    } else if (obj.where === OBJ_FLOOR) {
                        await You_see(
                            `${many ? 'some ' : ''}${
                                many ? xname(obj) : an(xname(obj))
                            } consumed!`,
                        );
                        need_newsym = true;
                    }
                    const u = game.u || {};
                    const hallu = !!(u.Hallucination
                        || ((u.HHallucination | 0) & TIMEOUT));
                    const msg = hallu
                        ? (many ? 'They shriek!' : 'It shrieks!')
                        : Blind() ? ''
                            : (many ? 'Their flames die.' : 'Its flame dies.');
                    if (msg) await pline(msg);
                }
            }
            end_burn(obj, false);
            if (menorah) {
                obj.spe = 0;
                obj.owt = weight(obj);
            } else if (carried(obj)) {
                useupall(obj);
                obj = null;
            } else {
                const onfloor = obj.where === OBJ_FLOOR;
                if (obj.where === OBJ_MIGRATING) obj.owornmask = 0;
                obj_extract_self(obj);
                void onfloor;
                delobj(obj);
                obj = null;
            }
        }
        if (obj && (obj.age | 0)) begin_burn(obj, true);
        break;
    }

    default:
        break;
    }
    if (need_newsym && loc) newsym(loc.x, loc.y);
}

function Deaf_hatch() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.Deaf
        || ((u.HDeaf | 0) & TIMEOUT) || (u.EDeaf | 0));
}

/** C mondata.h is_silent — ptr->msound == MS_SILENT. */
function is_silent_hatch(ptr) {
    return (ptr?.msound | 0) === 0;
}

/**
 * C ref: mondata.c locomotion — verb for how a monster moves.
 */
function locomotion_hatch(ptr, def) {
    const cap = !!(def && def[0] === def[0].toUpperCase()
        && def[0] !== def[0].toLowerCase());
    const pick = (lo, hi) => (cap ? hi : lo);
    if (is_floater(ptr)) return pick('float', 'Float');
    if (is_flyer(ptr) && (ptr.msize ?? 2) <= MZ_SMALL) {
        return pick('fly', 'Fly');
    }
    if (is_flyer(ptr)) return pick('fly', 'Fly');
    if (((ptr?.mflags1 ?? 0) & M1_SLITHY) !== 0) {
        return pick('slither', 'Slither');
    }
    if (amorphous(ptr)) return pick('ooze', 'Ooze');
    if (!(ptr?.mmove | 0)) return pick('wiggle', 'Wiggle');
    if (nolimbs(ptr)) return pick('crawl', 'Crawl');
    return def;
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix_hatch(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

function m_monnam_hatch(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, EXACT_NAME, false);
}

function a_monnam_hatch(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null, 0, false);
}

function obfree_hatch(obj) {
    if (!obj) return;
    obj.quan = 0;
    obj.where = OBJ_FREE;
    obj.timed = 0;
}

/**
 * C ref: mkobj.c container_weight — owt = weight; recurse if contained.
 */
function container_weight_hatch(obj) {
    if (!obj) return;
    obj.owt = weight(obj);
    if ((obj.where | 0) === OBJ_CONTAINED && obj.ocontainer) {
        container_weight_hatch(obj.ocontainer);
    }
}

/**
 * C ref: timeout.c learn_egg_type — little_to_big then MV_KNOWS_EGG
 * then update_inventory.
 */
export function learn_egg_type(mnum) {
    mnum = little_to_big(mnum | 0);
    if (!game.mvitals) game.mvitals = [];
    if (!game.mvitals[mnum]) game.mvitals[mnum] = { mvflags: 0 };
    game.mvitals[mnum].mvflags = (game.mvitals[mnum].mvflags | 0) | MV_KNOWS_EGG;
    update_inventory();
}

/**
 * C ref: timeout.c hatch_egg — timer callback; spawn big_to_little of
 * egg.corpsenm. Envelope: sterilized NON_PM; yours (spe / male carried
 * rn2(2)); silent timeout!=moves; get_obj_location(0); rnd(quan);
 * G_UNIQ/G_GENOD/G_EXTINCT skip spawn; enexto+makemon NO_MINVENT|MM_NOMSG;
 * tamedog yours||carried-dragon; leftover rnd(12) re-arm; invent useup /
 * floor extract+obfree+hideunder; learn_egg_type update_inventory;
 * MINVENT is_pool(hatchling); impossible unknown where.
 * Named omit: SetVoice before Gleep; migrating #if 0.
 */
export async function hatch_egg(egg, timeout) {
    if (!egg) return;
    if ((egg.corpsenm | 0) === NON_PM) return;

    const { enexto } = await import('./teleport.js');
    const { makemon } = await import('./makemon.js');
    const { tamedog } = await import('./dog.js');
    const { useup } = await import('./eat.js');
    const { m_at, hideunder } = await import('./mon.js');

    let mon = null;
    let mon2 = null;
    const mnum = big_to_little(egg.corpsenm | 0);
    const ptr = mons(mnum);
    // C: yours = (egg->spe || (!flags.female && carried(egg) && !rn2(2)))
    const yours = !!(egg.spe
        || (!game.flags?.female && carried(egg) && !rn2(2)));
    const silent = (timeout | 0) !== (game.moves | 0);
    let hatchcount = 0;
    let cansee_hatchspot = false;
    let x = 0;
    let y = 0;

    const loc = get_obj_location(egg, 0);
    if (loc) {
        x = loc.x | 0;
        y = loc.y | 0;
        hatchcount = rnd(egg.quan | 0);
        cansee_hatchspot = cansee(x, y) && !silent;
        const mv = game.mvitals?.[mnum]?.mvflags | 0;
        if (ptr && !(ptr.geno & G_UNIQ) && !(mv & (G_GENOD | G_EXTINCT))) {
            let i = hatchcount;
            for (; i > 0; i--) {
                const cc = { x, y };
                if (!enexto(cc, x, y, ptr)
                    || !(mon = makemon(ptr, cc.x, cc.y, NO_MINVENT | MM_NOMSG))) {
                    break;
                }
                if ((yours && !silent)
                    || (carried(egg) && mon.data?.mlet === 'S_DRAGON')) {
                    if (await tamedog(mon, null, false)) {
                        if (carried(egg) && mon.data?.mlet !== 'S_DRAGON') {
                            mon.mtame = 20;
                        }
                    }
                }
                if (((game.mvitals?.[mnum]?.mvflags | 0) & G_EXTINCT) !== 0) {
                    break;
                }
                mon2 = mon;
            }
            if (!mon) mon = mon2;
            hatchcount -= i;
            egg.quan = (egg.quan | 0) - hatchcount;
        }
    }

    if (!mon) return;

    let knows_egg = false;
    let redraw = false;
    const siblings = hatchcount > 1;
    let monnambuf = '';
    if (cansee_hatchspot) {
        monnambuf = `${siblings ? 'some ' : ''}${
            siblings ? makeplural(m_monnam_hatch(mon)) : an(m_monnam_hatch(mon))
        }`;
    }

    switch (egg.where | 0) {
    case OBJ_INVENT:
        knows_egg = true;
        if (!cansee_hatchspot) {
            await You_feel(
                `something ${locomotion_hatch(mon.data, 'drop')} from your pack!`,
            );
        } else {
            await You_see(
                `${monnambuf} ${locomotion_hatch(mon.data, 'drop')} out of your pack!`,
            );
        }
        if (yours) {
            const cry = ing_suffix(cry_sound(mon));
            const seems = (is_silent_hatch(mon.data) || Deaf_hatch())
                ? 'seems' : 'sounds';
            const parent = game.flags?.female ? 'mommy' : 'daddy';
            const punct = egg.spe ? '.' : '?';
            await pline(
                `${siblings ? 'Their' : 'Its'} ${cry} ${seems} like "${parent}${punct}"`,
            );
        } else if (mon.data?.mlet === 'S_DRAGON' && !Deaf_hatch()) {
            // C SetVoice(mon, 0, 80, 0) deferred
            await verbalize('Gleep!');
        }
        break;

    case OBJ_FLOOR:
        if (cansee_hatchspot) {
            knows_egg = true;
            await You_see(`${monnambuf} hatch.`);
            redraw = true;
        }
        break;

    case OBJ_MINVENT:
        if (cansee_hatchspot) {
            const carrier = egg.ocarry;
            let carriedby;
            if (carrier && canseemon(carrier)
                && (!(carrier.wormno | 0)
                    || cansee(carrier.mx | 0, carrier.my | 0))) {
                carriedby = `${s_suffix_hatch(a_monnam_hatch(carrier))} pack`;
                knows_egg = true;
            } else if (is_pool(mon.mx | 0, mon.my | 0)) {
                // C: is_pool(mon->mx, mon->my) — hatchling, not carrier
                carriedby = 'empty water';
            } else {
                carriedby = 'thin air';
            }
            await You_see(
                `${monnambuf} ${locomotion_hatch(mon.data, 'drop')} out of ${carriedby}!`,
            );
        }
        break;

    default:
        await impossible('egg hatched where? (%d)', egg.where | 0);
        break;
    }

    if (cansee_hatchspot && knows_egg) learn_egg_type(mnum);

    if ((egg.quan | 0) > 0) {
        attach_egg_hatch_timeout(egg, rnd(12));
        container_weight_hatch(egg);
    } else if (carried(egg)) {
        useup(egg);
    } else {
        obj_extract_self(egg);
        obfree_hatch(egg);
        const hidemon = m_at(x, y);
        if (hidemon && !hideunder(hidemon) && cansee(x, y)) {
            redraw = true;
        }
    }
    if (redraw) newsym(x, y);
}

/**
 * C ref: do.c revive_mon — timeout.c REVIVE_MON callback.
 * Floor displacer bump: get_obj_location(0) then m_at then rloc(RLOC_NOMSG)
 * under stasis_until < moves; revive_corpse; rider rn2(99) retry via
 * rider_revival_time(TRUE) else ROT_CORPSE d(5,50)−age.
 * Soundeffect(se_scratching, 50) on buried hear arm lives in
 * revive_corpse (D-1222).
 * @param {object} body corpse
 * @param {number} timeout unused in C
 */
export async function revive_mon(body, timeout) {
    void timeout;
    if (!body) return;
    const mptr = mons(body.corpsenm | 0);
    if (is_displacer(mptr) && (body.where | 0) === OBJ_FLOOR) {
        const loc = get_obj_location(body, 0);
        if (loc) {
            const { m_at } = await import('./mon.js');
            const mtmp = m_at(loc.x | 0, loc.y | 0);
            if (mtmp
                && (game.level?.flags?.stasis_until | 0) < (game.moves | 0)) {
                const notice_it = canseemon(mtmp);
                const monname = Monnam(mtmp);
                const { rloc } = await import('./teleport.js');
                if (await rloc(mtmp, RLOC_NOMSG)) {
                    if (notice_it && !canseemon(mtmp)) {
                        await pline(`${monname} vanishes.`);
                    } else if (!notice_it && canseemon(mtmp)) {
                        await pline(`${Monnam(mtmp)} appears.`);
                    } else if (notice_it
                        && dist2(mtmp.mx | 0, mtmp.my | 0,
                            loc.x | 0, loc.y | 0) > 2) {
                        await pline(`${monname} teleports.`);
                    }
                }
            }
        }
    }
    const { revive_corpse } = await import('./do.js');
    if (!(await revive_corpse(body))) {
        let action;
        let when;
        if (is_rider(mptr) && rn2(99)) {
            action = REVIVE_MON;
            when = rider_revival_time(body, true);
        } else {
            if (!obj_has_timer(body, ROT_CORPSE)) {
                await You_feel(`${is_rider(mptr) ? 'much ' : ''}less hassled.`);
            }
            action = ROT_CORPSE;
            when = d(5, 50) - ((game.moves | 0) - (body.age | 0));
            if (when < 1) when = 1;
        }
        if (!obj_has_timer(body, action)) {
            start_timer(when, TIMER_OBJECT, action, body);
        }
    }
}

/**
 * C ref: do.c zombify_mon — timeout.c ZOMBIFY_MON callback.
 * zombie_form + !G_GENOD → drop omid/omonst, set_corpsenm, revive_mon;
 * else rot_corpse. xkilled gz.zombify D-1210; mhitm mdamagem D-1211.
 * @param {object} body corpse
 * @param {number} timeout passed through to revive_mon
 */
export async function zombify_mon(body, timeout) {
    if (!body) return;
    const zmon = zombie_form(mons(body.corpsenm | 0));
    const mv = game.mvitals?.[zmon]?.mvflags | 0;
    if (zmon !== NON_PM && !(mv & G_GENOD)) {
        if (has_omid(body)) free_omid(body);
        if (has_omonst(body)) free_omonst(body);
        set_corpsenm(body, zmon);
        await revive_mon(body, timeout);
    } else {
        await rot_corpse(body);
    }
}

/** C timeout.c propertynames[] — #timeout listing + #wizintrinsic order. */
const PROPERTYNAMES = [
    [INVULNERABLE, 'invulnerable'],
    [STONED, 'petrifying'],
    [SLIMED, 'becoming slime'],
    [STRANGLED, 'strangling'],
    [SICK, 'fatally sick'],
    [STUNNED, 'stunned'],
    [CONFUSION, 'confused'],
    [HALLUC, 'hallucinating'],
    [BLINDED, 'blinded'],
    [DEAF, 'deafness'],
    [VOMITING, 'vomiting'],
    [GLIB, 'slippery fingers'],
    [WOUNDED_LEGS, 'wounded legs'],
    [SLEEPY, 'sleepy'],
    [TELEPORT, 'teleporting'],
    [POLYMORPH, 'polymorphing'],
    [LEVITATION, 'levitating'],
    [FAST, 'very fast'],
    [CLAIRVOYANT, 'clairvoyant'],
    [DETECT_MONSTERS, 'monster detection'],
    [SEE_INVIS, 'see invisible'],
    [INVIS, 'invisible'],
    [ACID_RES, 'acid resistance'],
    [STONE_RES, 'stoning resistance'],
    [DISPLACED, 'displaced'],
    [PASSES_WALLS, 'pass thru walls'],
    [MAGICAL_BREATHING, 'magical breathing'],
    [WWALKING, 'water walking'],
    [FIRE_RES, 'fire resistance'],
    [COLD_RES, 'cold resistance'],
    [SLEEP_RES, 'sleep resistance'],
    [DISINT_RES, 'disintegration resistance'],
    [SHOCK_RES, 'shock resistance'],
    [POISON_RES, 'poison resistance'],
    [DRAIN_RES, 'drain resistance'],
    [SICK_RES, 'sickness resistance'],
    [ANTIMAGIC, 'magic resistance'],
    [HALLUC_RES, 'hallucination resistance'],
    [BLND_RES, 'light-induced blindness resistance'],
    [FUMBLING, 'fumbling'],
    [HUNGER, 'voracious hunger'],
    [TELEPAT, 'telepathic'],
    [WARNING, 'warning'],
    [WARN_OF_MON, 'warn: monster type or class'],
    [WARN_UNDEAD, 'warn: undead'],
    [SEARCHING, 'searching'],
    [INFRAVISION, 'infravision'],
    [ADORNED, 'adorned (+/- Cha)'],
    [STEALTH, 'stealthy'],
    [AGGRAVATE_MONSTER, 'monster aggravation'],
    [CONFLICT, 'conflict'],
    [JUMPING, 'jumping'],
    [TELEPORT_CONTROL, 'teleport control'],
    [FLYING, 'flying'],
    [SWIMMING, 'swimming'],
    [SLOW_DIGESTION, 'slow digestion'],
    [HALF_SPDAM, 'half spell damage'],
    [HALF_PHDAM, 'half physical damage'],
    [REGENERATION, 'HP regeneration'],
    [ENERGY_REGENERATION, 'energy regeneration'],
    [PROTECTION, 'extra protection'],
    [PROT_FROM_SHAPE_CHANGERS, 'protection from shape changers'],
    [POLYMORPH_CONTROL, 'polymorph control'],
    [UNCHANGING, 'unchanging'],
    [REFLECTING, 'reflecting'],
    [FREE_ACTION, 'free action'],
    [FIXED_ABIL, 'fixed abilities'],
    [LIFESAVED, 'life will be saved'],
];

/**
 * C ref: timeout.c kind_name — TIMER_* label for #timeout print_queue.
 * TIMER_NONE C calls impossible(); JS returns "none" (queue never
 * stores TIMER_NONE — start_timer rejects kind <= TIMER_NONE).
 */
function kind_name(kind) {
    switch (kind | 0) {
        case TIMER_NONE:
            return 'none';
        case TIMER_LEVEL:
            return 'level';
        case TIMER_GLOBAL:
            return 'global';
        case TIMER_OBJECT:
            return 'object';
        case TIMER_MONSTER:
            return 'monster';
        default:
            return 'unknown';
    }
}

/**
 * C ref: alloc.c fmt_ptr — %p / 0x hex. TIMER_OBJECT uses o_id (C is
 * the heap pointer); TIMER_LEVEL uses packed a_long bit pattern.
 */
function fmt_timer_arg(curr) {
    if ((curr.kind | 0) === TIMER_OBJECT) {
        const id = curr.obj?.o_id | 0;
        return `0x${id.toString(16)}`;
    }
    return `0x${((curr.a_long | 0) >>> 0).toString(16)}`;
}

/**
 * C ref: timeout.c print_queue — empty line or header + one row per
 * timer_element. !VERBOSE_TIMER: "#%d(%s)" func_index + fmt_ptr.
 * @param {string[]} lines
 * @param {object | null} base  game._timer_base
 */
function print_queue(lines, base) {
    if (!base) {
        lines.push(' <empty>');
        return;
    }
    lines.push('timeout  id   kind   call');
    for (let curr = base; curr; curr = curr.next) {
        const timeout = String(curr.timeout | 0).padStart(4, ' ');
        const tid = String(curr.tid | 0).padStart(4, ' ');
        const kind = kind_name(curr.kind).padEnd(6, ' ');
        const fi = curr.action | 0;
        lines.push(` ${timeout}   ${tid}  ${kind} #${fi}(${fmt_timer_arg(curr)})`);
    }
}

/**
 * C ref: timeout.c wiz_timeout_queue putstr body (winid → string[]).
 * Envelope: moves; print_queue(gt.timer_base); timed uprops TIMEOUT
 * (COLD_RES+ banner once); uswldtim; uinvault; any_visible_region →
 * visible_region_summary; stasis_until. display_nhwindow is the
 * async caller. Named: VERBOSE_TIMER names; save/rest timer_id;
 * fmt_ptr heap vs o_id; TIMER_NONE impossible(); light.c
 * wiz_light_sources; timer_sanity_check.
 */
export function wiz_timeout_queue_lines() {
    const lines = [];
    const u = game.u || {};
    lines.push(`Current time = ${game.moves | 0}.`);
    lines.push('');
    lines.push('Active timeout queue:');
    lines.push('');
    print_queue(lines, game._timer_base || null);

    let count = 0;
    let longestlen = 0;
    let specindx = 0;
    for (let i = 0; i < PROPERTYNAMES.length; i++) {
        const [p, propname] = PROPERTYNAMES[i];
        const intrinsic = u.uprops?.[p]?.intrinsic | 0;
        if (intrinsic & TIMEOUT) {
            count++;
            const ln = propname.length;
            if (ln > longestlen) longestlen = ln;
        }
        if (specindx === 0 && p === COLD_RES) specindx = i;
    }
    lines.push('');
    if (!count) {
        lines.push('No timed properties.');
    } else {
        lines.push('Timed properties:');
        lines.push('');
        let banner = specindx;
        for (let i = 0; i < PROPERTYNAMES.length; i++) {
            const [p, propname] = PROPERTYNAMES[i];
            const intrinsic = u.uprops?.[p]?.intrinsic | 0;
            if (intrinsic & TIMEOUT) {
                if (banner > 0 && i >= banner) {
                    lines.push(' -- settable via #wizintrinsic only --');
                    banner = 0;
                }
                const left = propname.padEnd(longestlen, ' ');
                const leftv = String(intrinsic & TIMEOUT).padStart(4, ' ');
                lines.push(` ${left} ${leftv}`);
            }
        }
    }
    if (u.uswldtim) {
        lines.push('');
        lines.push(`Swallow countdown is ${u.uswldtim | 0}.`);
    }
    if (u.uinvault) {
        lines.push('');
        lines.push(`Vault counter is ${u.uinvault | 0}.`);
    }
    if (any_visible_region()) {
        visible_region_summary(lines);
    }
    const until = game.level?.flags?.stasis_until | 0;
    const moves = game.moves | 0;
    if (until >= moves) {
        lines.push('');
        const remain = until - moves;
        const word = remain > 0 ? 'turns' : 'more turn';
        lines.push(`Level is no-teleport for ${remain + 1} ${word}.`);
    }
    return lines;
}

/**
 * C ref: timeout.c wiz_timeout_queue — wizard #timeout.
 * create_nhwindow(NHW_MENU) + putstr + display_nhwindow(FALSE).
 * JS: show_nhw_menu_text (same NHW_MENU path as #wizwhere).
 */
export async function wiz_timeout_queue() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("Unavailable command 'timeout'.");
        return ECMD_OK;
    }
    const { show_nhw_menu_text } = await import('./pager.js');
    await show_nhw_menu_text(wiz_timeout_queue_lines());
    return ECMD_OK;
}
