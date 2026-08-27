// pray.js — prayer.
// C ref: src/pray.c
//
// The #pray command covers eligibility, delay, ordinary favors, crowning, and
// the tested sacrifice paths. Some punishment, conversion, and artifact-gift
// paths remain partial.

import { game } from './gstate.js';
import { rn1, rn2, rnd, rnz, rnl, rn2_on_display_rng } from './rng.js';
import { newsym, pline, more, see_monsters } from './display.js';
import { You, You_feel, You_hear, Your, pline_The } from './pline.js';
import { tty_yn_function } from './tty/topl.js';
import { nomul, losehp } from './hack.js';
import { adjalign, adjattrib, change_luck, near_capacity,
         exercise, encumber_msg } from './attrib.js';
import { which_armor } from './worn.js';
import { IS_ALTAR, Amask2align, A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
         ECMD_OK, ECMD_TIME, W_SADDLE, TT_LAVA, TT_BURIEDBALL, WEAK, HUNGRY,
         EXT_ENCUMBER, A_MAX, A_STR, A_WIS, AM_SHRINE, TIMEOUT,
         Upolyd, KILLED_BY, W_ARMS, W_ARMC, W_ARM, W_ARMU,
         AM_MASK, AM_SANCTUM, ROOM, MM_NOMSG, STRAT_APPEARMSG,
         LUCKMAX, NON_PM, nothing_happens, NH_BLACK, NH_ORANGE, BOLT_LIM,
         MAXULEV, FROMOUTSIDE, INTRINSIC, NH_AMBER, NH_LIGHT_BLUE,
         NH_GOLDEN, ONAME_GIFT, ONAME_KNOW_ARTI, P_ISRESTRICTED,
         P_LONG_SWORD, P_BROAD_SWORD, FOOT, STOMACH } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { An, an, ansimpleoname, makeplural, OBJ_NAME, otense, vtense,
         xname, yname, Yobjnam2 } from './objnam.js';
import { a_monnam, hcolor, mon_nam, oname, upstart } from './do_name.js';
import { attrcurse, rndcurse } from './sit.js';
import { Blind, Deaf, Flying, Hallucination, Levitation, Reflecting,
         Shock_resistance } from './youprop.js';
import { obj_resists, resist } from './zap.js';
import { carrying, update_inventory, useup, useupf } from './invent.js';
import { carried } from './obj.js';
import { find_ac } from './do_wear.js';
import { done, DIED, ESCAPED, ASCENDED } from './end.js';
import { roles } from './role_data.js';
import { PMNAMES, MONSYMS, MFLAGS } from './monst_data.js';
import { is_undead, is_demon, is_silent, has_head, is_human } from './mondata.js';
import { is_vampshifter, DEADMONSTER } from './monst.js';
import { couldsee } from './vision.js';
import { mdistu, monflee } from './monmove.js';
import { makemon, set_malign, Inhell } from './makemon.js';
import { killed } from './mon.js';
import { aggravate } from './wizard.js';
import { setuhpmax, pluslvl } from './exper.js';
import { floorfood, init_uhunger } from './eat.js';
import { dlord } from './minion.js';
import { angry_priest } from './priest.js';
import { s_suffix, sgn } from './hacklib.js';
import { bless, is_weptool, mkobj, mksobj, place_object, rnd_class,
         SPBOOK_no_NOVEL, uncurse } from './mkobj.js';
import { dropy } from './do.js';
import { discover_artifact, exist_artifact, is_art } from './artifact.js';
import { artifact_names, ART_EXCALIBUR, ART_STORMBRINGER,
         ART_VORPAL_BLADE } from './artilist_data.js';
import { add_weapon_skill, unrestrict_weapon_skill,
         weapon_type } from './weapon.js';
import { force_learn_spell, known_spell, spe_Forgotten, spe_Fresh,
         spe_Unknown, spell_skilltype } from './spell.js';
import { makeknown, observe_object } from './o_init.js';
import { make_blinded } from './potion.js';
import { body_part, mbodypart } from './polyself.js';
import { welded } from './wield.js';

function note_unported_pray(what) {
    (game.unported ||= new Set()).add('pray:' + what);
}

/* src/pray.c:105 on_altar() */
const on_altar = () => IS_ALTAR(game.level.at(game.u.ux, game.u.uy).typ);
const on_shrine = () => on_altar()
    && !!(game.level.at(game.u.ux, game.u.uy).altarmask & AM_SHRINE);

/* module state: C keeps these in gp */
let p_aligntyp = 0;
let p_trouble = 0;
let p_type = 0;

/* src/pray.c:60 TROUBLE_* — only the identity of the value matters here;
   positive are major troubles, negative minor. */
const TROUBLE_STONED = 14, TROUBLE_STARVING = 8, TROUBLE_HIT = 6,
      TROUBLE_COLLAPSING = 4, TROUBLE_STUCK_IN_WALL = 3,
      TROUBLE_CURSED_LEVITATION = 2, TROUBLE_UNUSEABLE_HANDS = 1;
const TROUBLE_PUNISHED = -1, TROUBLE_FUMBLING = -2, TROUBLE_CURSED_ITEMS = -3,
      TROUBLE_SADDLE = -4, TROUBLE_BLIND = -5, TROUBLE_POISONED = -6,
      TROUBLE_WOUNDED_LEGS = -7, TROUBLE_HUNGRY = -8, TROUBLE_STUNNED = -9,
      TROUBLE_CONFUSED = -10, TROUBLE_HALLUCINATION = -11;

/* include/align.h alignment record thresholds used by pleased() */
const DEVOUT = 14, STRIDENT = 4, PIOUS = 20;

// src/role.c Role_if().
const Role_if = (pm) => game.urole?.mnum === pm;

// src/pray.c:116 critically_low_hp()
function critically_low_hp(only_if_injured) {
    const curhp = Upolyd(game.u) ? game.u.mh : game.u.uhp;
    let maxhp = Upolyd(game.u) ? game.u.mhmax : game.u.uhpmax;

    if (only_if_injured && !(curhp < maxhp))
        return false;
    const hplim = 15 * game.u.ulevel;
    if (maxhp > hplim)
        maxhp = hplim;
    /* xlev_to_rank maps 1..30 into 0..8 */
    const rank = Math.trunc((game.u.ulevel - 1) / 3.625);
    let divisor;
    switch (rank) {
    case 0: case 1: divisor = 5; break;
    case 2: case 3: divisor = 6; break;
    case 4: case 5: divisor = 7; break;
    case 6: case 7: divisor = 8; break;
    default: divisor = 9; break;
    }
    return (curhp <= 5 || curhp * divisor <= maxhp);
}

// src/pray.c:284 worst_cursed_item() — select an item for
// TROUBLE_CURSED_ITEMS. The full priority chain scans worn gear first;
// the port keeps C's order over the slots it models.
function worst_cursed_item() {
    const u = game.u;
    /* if strained or worse, check for loadstone first */
    if (near_capacity() >= 3 /* HVY_ENCUMBER */) {
        for (const otmp of game.invent)
            if (otmp.otyp === ONAMES.LOADSTONE && otmp.cursed)
                return otmp;
    }
    /* weapon takes precedence if it is interfering with taking off a ring
       or putting on a shield */
    if (u.uwep && u.uwep.cursed
        && (u.uright?.cursed || u.uarms))          /* weapon */
        return u.uwep;
    for (const o of [u.uarmc, u.uarm, u.uarmu, u.uarmh, u.uarms,
                     u.uarmg, u.uarmf, u.uleft, u.uright, u.uamul,
                     u.ublindf, u.uwep])
        if (o && o.cursed)
            return o;
    return null;
}

// src/pray.c:198 in_trouble() — worst trouble the hero is in. Every arm
// reads real state; props the port does not model yet read as absent.
function in_trouble() {
    const u = game.u;

    /* major troubles */
    if (u.uprops?.STONED) return TROUBLE_STONED;
    if (u.uprops?.SLIMED) return 13 /* TROUBLE_SLIMED */;
    if (u.uprops?.STRANGLED) return 12 /* TROUBLE_STRANGLED */;
    if (u.utrap && u.utraptype === TT_LAVA) return 11 /* TROUBLE_LAVA */;
    if (u.uprops?.SICK) return 10 /* TROUBLE_SICK */;
    if ((u.uhs ?? 1) >= WEAK) return TROUBLE_STARVING;
    /* region_danger() — poison gas regions are not modelled */
    if (!Upolyd(u) && critically_low_hp(false)) return TROUBLE_HIT;
    if (u.ulycn >= 0 && u.ulycn != null) return 5 /* TROUBLE_LYCANTHROPE */;
    if (near_capacity() >= EXT_ENCUMBER
        && (game.u.amax.a[A_STR] - game.u.acurr.a[A_STR]) > 3)
        return TROUBLE_COLLAPSING;
    /* stuck_in_wall() — needs the surrounded-by-rock scan; a hero on an
       altar never is */
    if (u.uarmf?.cursed && u.uarmf.otyp === ONAMES.LEVITATION_BOOTS)
        return TROUBLE_CURSED_LEVITATION;
    if (u.uleft?.cursed && u.uleft.otyp === ONAMES.RIN_LEVITATION)
        return TROUBLE_CURSED_LEVITATION;
    if (u.uright?.cursed && u.uright.otyp === ONAMES.RIN_LEVITATION)
        return TROUBLE_CURSED_LEVITATION;
    /* nohands/welded — hero forms with no hands are not modelled */
    if (u.ublindf?.cursed) return TROUBLE_CURSED_BLINDFOLD_();

    /* minor troubles */
    if (game.uball || (u.utrap && u.utraptype === TT_BURIEDBALL))
        return TROUBLE_PUNISHED;
    if ((u.uarmg?.cursed && u.uarmg.otyp === ONAMES.GAUNTLETS_OF_FUMBLING)
        || (u.uarmf?.cursed && u.uarmf.otyp === ONAMES.FUMBLE_BOOTS))
        return TROUBLE_FUMBLING;
    if (worst_cursed_item()) return TROUBLE_CURSED_ITEMS;
    if (u.usteed) {
        const otmp = which_armor(u.usteed, W_SADDLE);
        if (otmp?.cursed) return TROUBLE_SADDLE;
    }

    if (u.ublind /* BlindedTimeout > 1 */
        && (u.intrinsic?.HBlinded ?? 0) > 1)
        return TROUBLE_BLIND;
    if (((u.intrinsic?.HDeaf ?? 0) & TIMEOUT) > 1)
        return TROUBLE_BLIND;

    for (let i = 0; i < A_MAX; i++)
        if (game.u.acurr.a[i] < game.u.amax.a[i])
            return TROUBLE_POISONED;
    const Wounded_legs = (u.intrinsic?.HWounded_legs || 0) > 0
                         || (u.EWounded_legs || 0);
    if (Wounded_legs && !u.usteed) return TROUBLE_WOUNDED_LEGS;
    if ((u.uhs ?? 1) >= HUNGRY) return TROUBLE_HUNGRY;
    if ((u.intrinsic?.HStun ?? 0) & TIMEOUT) return TROUBLE_STUNNED;
    if ((u.intrinsic?.HConfusion ?? 0) & TIMEOUT) return TROUBLE_CONFUSED;
    if ((u.uprops?.HALLUC ?? 0)) return TROUBLE_HALLUCINATION;
    return 0;
}

function TROUBLE_CURSED_BLINDFOLD_() { return -12; }

// src/pray.c:382 fix_worst_trouble(), implemented as each state becomes live.
async function fix_worst_trouble(trouble) {
    const u = game.u;

    switch (trouble) {
    case TROUBLE_HIT: {
        await You_feel('much better.');
        if (Upolyd(u)) {
            u.mhmax = Math.max((u.mhmax || 0) + rnd(5), 6);
            u.mh = u.mhmax;
        }
        let maxhp = u.uhpmax;
        if (maxhp < u.ulevel * 5 + 11)
            maxhp += rnd(5);
        setuhpmax(Math.max(maxhp, 6), true);
        u.uhp = u.uhpmax;
        (game.disp ||= {}).botl = true;
        return true;
    }
    default:
        note_unported_pray(`fix_worst_trouble:${trouble}`);
        return false;
    }
}

// src/pray.c:2530 align_gname()
export function align_gname(alignment) {
    let gnam;
    switch (alignment) {
    case A_NONE:    gnam = 'Moloch'; break;
    case A_LAWFUL:  gnam = game.urole?.lgod; break;
    case A_NEUTRAL: gnam = game.urole?.ngod; break;
    case A_CHAOTIC: gnam = game.urole?.cgod; break;
    default:        gnam = 'someone'; break;
    }
    if (gnam && gnam[0] === '_')
        gnam = gnam.slice(1);
    return gnam || 'someone';
}

const hallu_gods = [
    'the Flying Spaghetti Monster', 'Eris', 'the Martians', 'Xom',
    'AnDoR dRaKoN', 'the Central Bank of Yendor', 'Tooth Fairy', 'Om',
    'Yawgmoth', 'Morgoth', 'Cthulhu', 'the Ori', 'destiny',
    'your Friend the Computer',
];

const turn_destroy_levels = new Map([
    [MONSYMS.S_ZOMBIE, 6], [MONSYMS.S_MUMMY, 8],
    [MONSYMS.S_WRAITH, 10], [MONSYMS.S_VAMPIRE, 12],
    [MONSYMS.S_GHOST, 14], [MONSYMS.S_LICH, 16],
]);

// src/pray.c:2581 halu_gname(). Hallucinatory deity names use the display
// RNG, so choosing one never changes the contest's core random stream.
function halu_gname(alignment) {
    if (!Hallucination())
        return align_gname(alignment);

    let role;
    do {
        role = roles[rn2_on_display_rng(roles.length)];
    } while (!role?.lgod);

    let gnam;
    switch (rn2_on_display_rng(9)) {
    case 0:
    case 1:
        gnam = role.lgod;
        break;
    case 2:
    case 3:
        gnam = role.ngod;
        break;
    case 4:
    case 5:
        gnam = role.cgod;
        break;
    case 6:
    case 7:
        gnam = hallu_gods[rn2_on_display_rng(hallu_gods.length)];
        break;
    default:
        gnam = 'Moloch';
        break;
    }
    if (!gnam)
        gnam = 'your Friend the Computer';
    return gnam[0] === '_' ? gnam.slice(1) : gnam;
}

// src/mondata.c:580 can_chant().
function can_chant(mon) {
    const data = mon?.data;
    const strangled = mon === game.youmonst
        && !!(game.u.intrinsic?.HStrangled || game.u.uprops?.STRANGLED);
    return !!data && !strangled && !is_silent(data) && has_head(data)
        && data.msound !== MFLAGS.MS_BUZZ
        && data.msound !== MFLAGS.MS_BURBLE;
}

// src/pray.c:2378 maybe_turn_mon_iter().
async function maybe_turn_mon(mtmp, range) {
    if (DEADMONSTER(mtmp) || !couldsee(mtmp.mx, mtmp.my)
        || mdistu(mtmp) > range)
        return false;

    const data = mtmp.data || game.mons[mtmp.mnum];
    if (mtmp.mpeaceful
        || !(is_undead(data) || is_vampshifter(mtmp)
             || (is_demon(data) && game.u.ulevel > MAXULEV / 2)))
        return false;

    mtmp.msleeping = 0;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    if (confused) {
        mtmp.mflee = 0;
        mtmp.mfrozen = 0;
        mtmp.mcanmove = 1;
        return true;
    }
    if (resist(mtmp, 0, 0, true))
        return false;

    const destroy_level = turn_destroy_levels.get(data.mlet);
    if (destroy_level !== undefined && game.u.ulevel >= destroy_level
        && !resist(mtmp, 0, 0, false)) {
        if (game.u.ualign.type === A_CHAOTIC) {
            mtmp.mpeaceful = 1;
            set_malign(mtmp);
        } else {
            await killed(mtmp);
        }
    } else {
        monflee(mtmp, 0, false, true);
    }
    return false;
}

// src/pray.c:2417 doturn().
export async function doturn() {
    const role = game.urole?.mnum;
    const innate = role === PMNAMES.PM_CLERIC || role === PMNAMES.PM_KNIGHT
        || role === 'PM_CLERIC' || role === 'PM_KNIGHT';
    if (!innate) {
        if ((game.spl_book || []).some(
                spell => spell.sp_id === ONAMES.SPE_TURN_UNDEAD)) {
            const { spelleffects } = await import('./spell.js');
            return await spelleffects(ONAMES.SPE_TURN_UNDEAD, false, false);
        }
        await You("don't know how to turn undead!");
        return ECMD_OK;
    }

    game.u.uconduct ||= {};
    if (!game.u.uconduct.gnostic) {
        const { livelog_add } = await import('./pline.js');
        livelog_add('rejected atheism by turning undead');
    }
    game.u.uconduct.gnostic = (game.u.uconduct.gnostic || 0) + 1;

    const gname = halu_gname(game.u.ualign.type);
    if (!can_chant(game.youmonst)) {
        const unable = game.u.intrinsic?.HStrangled
                       || game.u.uprops?.STRANGLED;
        await You(`are ${unable ? 'not able to call' : 'incapable of calling'} `
                  + `upon ${gname} to turn aside evilness.`);
        return game.u.uconduct.gnostic === 1 ? ECMD_TIME : ECMD_OK;
    }

    const herodata = game.youmonst?.data;
    if ((game.u.ualign.type !== A_CHAOTIC
         && (is_demon(herodata) || is_undead(herodata)
             || is_vampshifter(game.youmonst)))
        || (game.u.ugangr || 0) > 6) {
        await pline(`For some reason, ${gname} seems to ignore you.`);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (Inhell()) {
        await pline(`Since you are in Gehennom, ${gname} `
                    + `${gname === 'Moloch' ? "won't" : "can't"} help you.`);
        aggravate();
        return ECMD_TIME;
    }

    await pline(`Calling upon ${gname}, you chant an arcane formula.`);
    exercise(A_WIS, true);

    const radius = BOLT_LIM + Math.trunc(game.u.ulevel / 5);
    let falter_message = false;
    for (const mtmp of [...(game.level?.monsters || [])]) {
        if (await maybe_turn_mon(mtmp, radius * radius) && !falter_message) {
            await pline('Unfortunately, your voice falters.');
            falter_message = true;
        }
    }

    nomul(-(5 - Math.trunc((game.u.ulevel - 1) / 6)));
    game.multi_reason = 'trying to turn the monsters';
    game.nomovemsg = 'You can move again.';
    return ECMD_TIME;
}

// src/pray.c:2124 can_pray() — set up p_type and p_aligntyp.
function can_pray(praying) {
    p_aligntyp = on_altar()
        ? Amask2align(game.level.at(game.u.ux, game.u.uy).altarmask ?? 0)
        : game.u.ualign.type;
    p_trouble = in_trouble();

    /* is_demon(youmonst) repugnance arm — hero demon forms not modelled */

    if (praying)
        /* the promise below is awaited by dopray */
        return (async () => {
            await You(`begin praying to ${align_gname(p_aligntyp)}.`);
            return finish_can_pray();
        })();

    return finish_can_pray();
}

function finish_can_pray() {
    const u = game.u;
    let alignment;
    if (u.ualign.type && u.ualign.type === -p_aligntyp)
        alignment = -u.ualign.record;       /* opposite alignment altar */
    else if (u.ualign.type !== p_aligntyp)
        alignment = Math.trunc(u.ualign.record / 2); /* different altar */
    else
        alignment = u.ualign.record;

    if (p_aligntyp === A_NONE) /* praying to Moloch */
        p_type = -2;
    else if ((p_trouble > 0) ? (u.ublesscnt > 200)
             : (p_trouble < 0) ? (u.ublesscnt > 100)
               : (u.ublesscnt > 0))
        p_type = 0;                          /* too soon... */
    else if ((u.uluck ?? 0) < 0 || u.ugangr || alignment < 0)
        p_type = 1;                          /* too naughty... */
    else {
        if (on_altar() && u.ualign.type !== p_aligntyp)
            p_type = 2;
        else
            p_type = 3;
    }

    /* is_undead(youmonst) turning arm — hero undead forms not modelled */

    return true;
}

// src/pray.c:1436 gods_upset()
function gods_upset(g_align) {
    if (g_align === game.u.ualign.type)
        game.u.ugangr = (game.u.ugangr || 0) + 1;
    else if (game.u.ugangr)
        game.u.ugangr--;
    return angrygods(g_align);
}

// src/pray.c:703 angrygods() — the god's response. The message arms are
// live; the arms whose machinery is missing (loss of experience, Punishment,
// random curses, minion summons, the divine lightning) record themselves.
async function angrygods(resp_god) {
    const u = game.u;
    let maxanger;

    /* Inhell → A_NONE: Gehennom is not modelled */
    u.ublessed = 0; /* lose divine protection */

    const Luck = u.uluck ?? 0;
    if (resp_god !== u.ualign.type)
        maxanger = Math.trunc(u.ualign.record / 2)
                   + (Luck > 0 ? -Math.trunc(Luck / 3) : -Luck);
    else
        maxanger = 3 * (u.ugangr || 0)
                   + ((Luck > 0 || u.ualign.record >= 8 /* STRIDENT */)
                      ? -Math.trunc(Luck / 3) : -Luck);
    if (maxanger < 1)
        maxanger = 1;
    else if (maxanger > 15)
        maxanger = 15;

    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await You_feel(`that ${align_gname(resp_god)} is ${game.u.uprops?.HALLUC ? 'bummed' : 'displeased'}.`);
        break;
    case 2:
    case 3: {
        await godvoice(resp_god, null);
        /* ugod_is_angry(): ualign.record < 0 */
        await pline(`"Thou ${(game.u.ualign.record < 0
                              && resp_god === game.u.ualign.type)
                             ? 'hast strayed from the path' : 'art arrogant'}, mortal."`);
        await pline('"Thou must relearn thy lessons!"');
        const { adjattrib } = await import('./attrib.js');
        await adjattrib(A_WIS, -1, 0);
        const { losexp } = await import('./exper.js');
        await losexp(null);
        break;
    }
    case 6:
        note_unported_pray('angrygods:punish');
        break;
    case 4:
    case 5: {
        await gods_angry(resp_god);
        const antimagic = !!(u.uprops?.ANTIMAGIC || u.uprops?.MAGIC_RES);
        if (!u.ublind && !antimagic)
            await pline(`${An(hcolor(NH_BLACK))} glow surrounds you.`);
        if (rn2(2) || !(await attrcurse()))
            await rndcurse();
        break;
    }
    case 7:
    case 8:
        note_unported_pray('angrygods:summon_minion');
        break;
    default:
        await gods_angry(resp_god);
        await god_zaps_you(resp_god);
        break;
    }
    /* even though this might not be in response to prayer, set pray timer */
    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > u.ublesscnt)
        u.ublesscnt = new_ublesscnt;
}

/* src/pray.c:60 godvoices[] */
const godvoices = ['booms out', 'thunders', 'rings out', 'booms'];

// src/pray.c:1415 godvoice() — ROLL_FROM(godvoices) draws the rn2(4).
async function godvoice(g_align, words) {
    const quot = words ? '"' : '';
    words = words || '';
    await pline_The(`voice of ${align_gname(g_align)} ${godvoices[rn2(godvoices.length)]}: ${quot}${words}${quot}`);
}

// src/pray.c at_your_feet(). Announce a divine object arriving nearby.
async function at_your_feet(str) {
    const u = game.u;
    if (Blind())
        str = 'Something';
    if (u.uswallow) {
        await pline(`${str} ${vtense(str, 'drop')} into ${
            s_suffix(mon_nam(u.ustuck))} ${mbodypart(u.ustuck, STOMACH)}.`);
    } else {
        await pline(`${str} ${vtense(str, Blind() ? 'land' : 'appear')} ${
            Levitation() ? 'beneath' : 'at'} your ${
            makeplural(body_part(FOOT))}!`);
    }
}

const ok_wep = (obj) => !!obj
    && (obj.oclass === OCLASSES.WEAPON_CLASS
        || is_weptool(obj, game.objects));

// src/pray.c gcrownu(). Bestow the alignment title, class gift, artifact,
// permanent resistances, weapon skill, and extra skill slot.
async function gcrownu() {
    const u = game.u;
    const intrinsic = (u.intrinsic ||= {});
    const uevent = (u.uevent ||= {});
    for (const prop of ['HSee_invisible', 'HFire_resistance',
                        'HCold_resistance', 'HShock_resistance',
                        'HSleep_resistance', 'HPoison_resistance'])
        intrinsic[prop] = (intrinsic[prop] | 0) | FROMOUTSIDE;

    await godvoice(u.ualign.type, null);

    const wielding = (art) => u.uwep?.oartifact === art;
    let classGift = ONAMES.STRANGE_OBJECT;
    if (Role_if(PMNAMES.PM_WIZARD)
        && !wielding(ART_VORPAL_BLADE)
        && !wielding(ART_STORMBRINGER)
        && !carrying(ONAMES.SPE_FINGER_OF_DEATH)) {
        classGift = ONAMES.SPE_FINGER_OF_DEATH;
    } else if (Role_if(PMNAMES.PM_MONK)
               && !u.uwep?.oartifact
               && !carrying(ONAMES.SPE_RESTORE_ABILITY)) {
        classGift = ONAMES.SPE_RESTORE_ABILITY;
    }

    let obj = ok_wep(u.uwep) ? u.uwep : null;
    let alreadyExists = false, inHand = false;
    switch (u.ualign.type) {
    case A_LAWFUL:
        uevent.uhand_of_elbereth = 1;
        await pline('"I crown thee...  The Hand of Elbereth!"');
        break;
    case A_NEUTRAL:
        uevent.uhand_of_elbereth = 2;
        inHand = wielding(ART_VORPAL_BLADE);
        alreadyExists = exist_artifact(ONAMES.LONG_SWORD,
                                       artifact_names[ART_VORPAL_BLADE]);
        await pline('"Thou shalt be my Envoy of Balance!"');
        break;
    case A_CHAOTIC: {
        uevent.uhand_of_elbereth = 3;
        inHand = wielding(ART_STORMBRINGER);
        alreadyExists = exist_artifact(ONAMES.RUNESWORD,
                                       artifact_names[ART_STORMBRINGER]);
        const what = ((alreadyExists && !inHand)
                      || classGift !== ONAMES.STRANGE_OBJECT)
                     ? 'take lives' : 'steal souls';
        await pline(`"Thou art chosen to ${what} for My Glory!"`);
        break;
    }
    default:
        break;
    }

    if (game.objects[classGift].oc_class === OCLASSES.SPBOOK_CLASS) {
        obj = mksobj(classGift, true, false);
        bless(obj);
        obj.bknown = 1;
        observe_object(obj);
        await at_your_feet(upstart(ansimpleoname(obj)));
        await dropy(obj);
        u.ugifts = (u.ugifts | 0) + 1;

        if (known_spell(classGift) !== spe_Unknown && ok_wep(u.uwep))
            obj = u.uwep;
    }

    switch (u.ualign.type) {
    case A_LAWFUL:
        if (classGift !== ONAMES.STRANGE_OBJECT) {
            // The class spellbook was the crowning gift.
        } else if (obj?.otyp === ONAMES.LONG_SWORD && !obj.oartifact) {
            if (!Blind())
                await Your('sword shines brightly for a moment.');
            obj = oname(obj, artifact_names[ART_EXCALIBUR],
                        ONAME_GIFT | ONAME_KNOW_ARTI);
            if (is_art(obj, ART_EXCALIBUR))
                u.ugifts = (u.ugifts | 0) + 1;
        }
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_EXCALIBUR))
            discover_artifact(ART_EXCALIBUR);
        break;
    case A_NEUTRAL:
        if (classGift !== ONAMES.STRANGE_OBJECT) {
            // The class spellbook was the crowning gift.
        } else if (obj && inHand) {
            await Your(`${xname(obj)} goes snicker-snack!`);
            observe_object(obj);
        } else if (!alreadyExists) {
            obj = mksobj(ONAMES.LONG_SWORD, false, false);
            obj = oname(obj, artifact_names[ART_VORPAL_BLADE],
                        ONAME_GIFT | ONAME_KNOW_ARTI);
            obj.spe = 1;
            await at_your_feet('A sword');
            await dropy(obj);
            u.ugifts = (u.ugifts | 0) + 1;
        }
        unrestrict_weapon_skill(P_LONG_SWORD);
        if (is_art(obj, ART_VORPAL_BLADE))
            discover_artifact(ART_VORPAL_BLADE);
        break;
    case A_CHAOTIC: {
        const sword = `${hcolor(NH_BLACK)} sword`;
        if (classGift !== ONAMES.STRANGE_OBJECT) {
            // The class spellbook was the crowning gift.
        } else if (obj && inHand) {
            await Your(`${sword} hums ominously!`);
            observe_object(obj);
        } else if (!alreadyExists) {
            obj = mksobj(ONAMES.RUNESWORD, false, false);
            obj = oname(obj, artifact_names[ART_STORMBRINGER],
                        ONAME_GIFT | ONAME_KNOW_ARTI);
            obj.spe = 1;
            await at_your_feet(An(sword));
            await dropy(obj);
            u.ugifts = (u.ugifts | 0) + 1;
        }
        unrestrict_weapon_skill(P_BROAD_SWORD);
        if (is_art(obj, ART_STORMBRINGER))
            discover_artifact(ART_STORMBRINGER);
        break;
    }
    default:
        obj = null;
        break;
    }

    if (ok_wep(obj)) {
        bless(obj);
        obj.oeroded = obj.oeroded2 = 0;
        obj.oerodeproof = 1;
        obj.bknown = obj.rknown = 1;
        if ((obj.spe | 0) < 1)
            obj.spe = 1;
        unrestrict_weapon_skill(weapon_type(obj));
    } else if (classGift === ONAMES.STRANGE_OBJECT) {
        await You_feel('unworthy.');
    }
    update_inventory();
    await add_weapon_skill(1);
}

// src/pray.c give_spell(). Prefer an unknown usable spell, then either
// teach it directly or place a blessed book at the hero's feet.
async function give_spell() {
    const u = game.u;
    let obj = mkobj(SPBOOK_no_NOVEL, true);
    let trycnt = u.ulevel + 1;

    while (--trycnt > 0) {
        if (obj.otyp !== ONAMES.SPE_BLANK_PAPER) {
            const skill = spell_skilltype(obj.otyp);
            const skillLevel = u.weapon_skills?.[skill]?.skill
                               ?? P_ISRESTRICTED;
            if (known_spell(obj.otyp) <= spe_Unknown
                && skillLevel !== P_ISRESTRICTED)
                break;
        } else if (!game.objects[ONAMES.SPE_BLANK_PAPER].oc_name_known
                   || carrying(ONAMES.MAGIC_MARKER)) {
            break;
        }
        obj.otyp = rnd_class(game.bases[OCLASSES.SPBOOK_CLASS],
                             ONAMES.SPE_BLANK_PAPER);
    }

    let knowledge;
    if (obj.otyp !== ONAMES.SPE_BLANK_PAPER && !rn2(4)
        && (knowledge = known_spell(obj.otyp)) !== spe_Fresh) {
        const letter = force_learn_spell(obj.otyp);
        if (letter) {
            const spellName = OBJ_NAME(game.objects[obj.otyp]);
            if (knowledge === spe_Unknown) {
                await pline(`Divine knowledge of ${spellName} fills your mind!  Spell '${letter}'.`);
            } else {
                await Your(`knowledge of spell '${letter}' - ${spellName} is ${
                    knowledge === spe_Forgotten ? 'restored' : 'refreshed'}.`);
            }
        }
    } else {
        observe_object(obj);
        if (obj.otyp === ONAMES.SPE_BLANK_PAPER || !rn2(100))
            makeknown(obj.otyp);
        bless(obj);
        await at_your_feet(upstart(ansimpleoname(obj)));
        place_object(obj, u.ux, u.uy);
        newsym(u.ux, u.uy);
    }
}

async function gods_angry(g_align) {
    await godvoice(g_align, 'Thou hast angered me.');
}

const sacrifice_value = (obj) => {
    if (obj.corpsenm == null || !game.mons[obj.corpsenm])
        return 0;
    if (obj.corpsenm !== PMNAMES.PM_ACID_BLOB
        && (game.moves || 0) > (obj.age || 0) + 50)
        return 0;
    let value = (game.mons[obj.corpsenm].difficulty || 0) + 1;
    if (obj.oeaten)
        note_unported_pray('sacrifice_value:eaten_corpse');
    return value;
};

const sacrifice_your_race_p = (mdat) =>
    !!mdat && !!(mdat.mflags2 & (game.urace?.selfmask || 0));

// src/pray.c:1444 consume_offering() -- consume one carried or floor object
// and give the alignment-specific visual response.
async function consume_offering(obj) {
    if (Hallucination()) {
        switch (rn2(3)) {
        case 0:
            await Your('sacrifice sprouts wings and a propeller and roars away!');
            break;
        case 1:
            await Your('sacrifice puffs up, swelling bigger and bigger, and pops!');
            break;
        default:
            await Your('sacrifice collapses into a cloud of dancing particles and fades away!');
            break;
        }
    } else if (Blind() && game.u.ualign.type === A_LAWFUL) {
        await Your('sacrifice disappears!');
    } else {
        const effect = game.u.ualign.type === A_LAWFUL ? 'flash of light'
                     : game.u.ualign.type === A_NEUTRAL ? 'plume of smoke'
                       : 'burst of flame';
        await Your(`sacrifice is consumed in a ${effect}!`);
    }
    if (carried(obj))
        useup(obj);
    else
        useupf(obj, 1);
    exercise(A_WIS, true);
}

// src/pray.c:1618 offer_different_alignment_altar(), ordinary conflict arm.
async function offer_different_alignment_altar(obj, altaralign) {
    if (game.u.ualign.record < 0
        || (altaralign === A_NONE && Inhell())) {
        note_unported_pray('sacrifice:alignment_conversion');
        return;
    }

    await consume_offering(obj);
    await You(`sense a conflict between ${align_gname(game.u.ualign.type)} and ${align_gname(altaralign)}.`);
    if (rn2(8 + game.u.ulevel) > 5) {
        await You_feel(`the power of ${align_gname(game.u.ualign.type)} increase.`);
        exercise(A_WIS, true);
        change_luck(1);
        const altar = game.level.at(game.u.ux, game.u.uy);
        const shrine = altar.altarmask & AM_SHRINE;
        altar.altarmask = shrine | (game.u.ualign.type === A_LAWFUL ? 4
                                   : game.u.ualign.type === A_NEUTRAL ? 2 : 1);
        newsym(game.u.ux, game.u.uy);
        if (!Blind()) {
            const color = game.u.ualign.type === A_LAWFUL ? 'white'
                        : game.u.ualign.type === A_CHAOTIC ? 'black' : 'gray';
            await pline_The(`altar glows ${color}.`);
        }
        const alignlim = 10 + Math.trunc((game.moves || 0) / 200);
        if (rnl(game.u.ulevel) > 6 && game.u.ualign.record > 0
            && rnd(game.u.ualign.record) > (3 * alignlim) / 4)
            note_unported_pray('sacrifice:conversion_minion');
        await angry_priest();
    } else {
        await pline(`Unluckily, you feel the power of ${align_gname(game.u.ualign.type)} decrease.`);
        change_luck(-1);
        exercise(A_WIS, false);
        const alignlim = 10 + Math.trunc((game.moves || 0) / 200);
        if (rnl(game.u.ulevel) > 6 && game.u.ualign.record > 0
            && rnd(game.u.ualign.record) > (7 * alignlim) / 8)
            note_unported_pray('sacrifice:failed_conversion_minion');
    }
}

// src/pray.c:1698 sacrifice_your_race(), including the ordinary chaotic
// altar arm used by a same-race corpse offering.
async function sacrifice_your_race(obj, highaltar, altaralign) {
    if (is_demon(game.youmonst.data)) {
        await You('find the idea very satisfying.');
        exercise(A_WIS, true);
    } else if (game.u.ualign.type !== A_CHAOTIC) {
        await pline("You'll regret this infamous offense!");
        exercise(A_WIS, false);
    }

    if (highaltar
        && (altaralign !== A_CHAOTIC
            || game.u.ualign.type !== A_CHAOTIC)) {
        note_unported_pray('sacrifice:high_altar_desecration');
        return;
    }

    if (altaralign !== A_CHAOTIC && altaralign !== A_NONE) {
        note_unported_pray('sacrifice:same_race_altar_stain');
        return;
    }

    let demonlessMessage;
    if (altaralign === A_CHAOTIC
        && game.u.ualign.type !== A_CHAOTIC) {
        await pline('The blood floods the altar, which vanishes in a black cloud!');
        const altar = game.level.at(game.u.ux, game.u.uy);
        altar.typ = ROOM;
        altar.altarmask = 0;
        newsym(game.u.ux, game.u.uy);
        await angry_priest();
        demonlessMessage = 'cloud dissipates';
    } else {
        await pline_The('blood covers the altar!');
        change_luck(altaralign === A_NONE ? -2 : 2);
        demonlessMessage = 'blood coagulates';
    }

    const pm = dlord(altaralign);
    const dmon = pm !== NON_PM
        ? makemon(game.mons[pm], game.u.ux, game.u.uy, MM_NOMSG)
        : null;
    if (dmon) {
        let name = a_monnam(dmon);
        if (name.toLowerCase() === 'it')
            name = 'something dreadful';
        else
            dmon.mstrategy = (dmon.mstrategy || 0) & ~STRAT_APPEARMSG;
        await You(`have summoned ${name}!`);
        if (sgn(game.u.ualign.type) === sgn(dmon.data.maligntyp))
            dmon.mpeaceful = 1;
        await You('are terrified, and unable to move.');
        nomul(-3);
        game.multi_reason = 'being terrified of a demon';
        game.nomovemsg = null;
    } else {
        await pline_The(`${demonlessMessage}.`);
    }

    if (game.u.ualign.type !== A_CHAOTIC) {
        adjalign(-5);
        game.u.ugangr = (game.u.ugangr || 0) + 3;
        await adjattrib(A_WIS, -1, true);
        if (!Inhell())
            await angrygods(game.u.ualign.type);
        change_luck(-5);
    } else {
        adjalign(5);
    }
    if (carried(obj))
        useup(obj);
    else
        useupf(obj, 1);
}

// src/pray.c:1959 offer_corpse(), with ordinary, alignment-conflict, prayer
// timeout, and same-race paths. Other special corpses remain explicit gaps.
async function offer_corpse(obj, highaltar, altaralign) {
    game.u.uconduct ||= {};
    game.u.uconduct.gnostic = (game.u.uconduct.gnostic || 0) + 1;

    const mdat = game.mons[obj.corpsenm];
    if (sacrifice_your_race_p(mdat)) {
        await sacrifice_your_race(obj, highaltar, altaralign);
        return;
    }
    if (obj.mextra?.mon?.mtame || obj.omonst?.mtame) {
        note_unported_pray('sacrifice:former_pet');
        return;
    }
    if (is_undead(mdat) || mdat?.mlet === MONSYMS.S_UNICORN)
        note_unported_pray('sacrifice:undead_or_unicorn');

    let value = sacrifice_value(obj);
    if (!value) {
        await pline(nothing_happens);
        return;
    }
    if (value < 0 || (highaltar && altaralign !== game.u.ualign.type)) {
        note_unported_pray('sacrifice:negative_or_high_altar');
        return;
    }
    if (game.u.ualign.type !== altaralign) {
        await offer_different_alignment_altar(obj, altaralign);
        return;
    }

    await consume_offering(obj);
    const MAXVALUE = 24;
    if (game.u.ugangr) {
        const saved = game.u.ugangr;
        game.u.ugangr -= Math.trunc(value
            * (game.u.ualign.type === A_CHAOTIC ? 2 : 3) / MAXVALUE);
        game.u.ugangr = Math.max(0, game.u.ugangr);
        if (game.u.ugangr !== saved) {
            await pline(`${align_gname(game.u.ualign.type)} seems ${game.u.ugangr ? 'slightly mollified' : 'mollified'}.`);
            if ((game.u.uluck || 0) < 0)
                game.u.uluck = game.u.ugangr ? game.u.uluck + 1 : 0;
        } else {
            await You('have a feeling of inadequacy.');
        }
    } else if (game.u.ualign.record < 0) {
        value = Math.min(value, MAXVALUE, -game.u.ualign.record);
        adjalign(value);
        await You_feel('partially absolved.');
    } else if (game.u.ublesscnt > 0) {
        const saved = game.u.ublesscnt;
        game.u.ublesscnt -= Math.trunc(value
            * (game.u.ualign.type === A_CHAOTIC ? 500 : 300) / MAXVALUE);
        game.u.ublesscnt = Math.max(0, game.u.ublesscnt);
        if (game.u.ublesscnt !== saved) {
            if (game.u.ublesscnt) {
                await You('have a hopeful feeling.');
                if ((game.u.uluck || 0) < 0)
                    change_luck(1);
            } else {
                await You('have a feeling of reconciliation.');
                if ((game.u.uluck || 0) < 0)
                    game.u.uluck = 0;
            }
        }
    } else {
        if (await bestow_artifact(value))
            return;
        const original = game.u.uluck || 0;
        let increase = Math.trunc(value * LUCKMAX / (MAXVALUE * 2));
        if (original > value)
            increase = 0;
        else if (original + increase > value)
            increase = value - original;
        change_luck(increase);
        if (game.u.uluck < 0)
            game.u.uluck = 0;
        if (game.u.uluck !== original) {
            if (Blind())
                await You('think something brushed your foot.');
            else if (Hallucination())
                await You('see crabgrass at your feet.  A funny thing in a dungeon.');
            else
                await You('glimpse a four-leaf clover at your feet.');
        }
    }
}

// src/pray.c:1781 bestow_artifact(). Debug mode asks before making the
// normal random-gift decision, which is also useful for deterministic oracle
// recipes that deliberately decline the gift.
async function bestow_artifact(maxGiftValue) {
    const u = game.u;
    if (u.ulevel <= 2 || (u.uluck | 0) < 0)
        return false;

    if (game.wizard) {
        const answer = await tty_yn_function('Gift an artifact?', 'yn', 'n');
        if (answer !== 'y')
            return false;
        note_unported_pray(`sacrifice:artifact_gift:${maxGiftValue}`);
        return true;
    }

    note_unported_pray('sacrifice:artifact_gift');
    return false;
}

// src/pray.c:1476 offer_too_soon().
async function offer_too_soon(altaralign) {
    if (altaralign === A_NONE && Inhell()) {
        await gods_upset(A_NONE);
        return;
    }
    await You_feel(`${Hallucination() ? 'homesick'
        : altaralign === game.u.ualign.type
          ? 'an urge to return to the surface' : 'ashamed'}.`);
}

// src/pray.c:1498 desecrate_altar().
async function desecrate_altar(highaltar, altaralign) {
    if (altaralign === game.u.ualign.type) {
        adjalign(-20);
        game.u.ugangr = (game.u.ugangr || 0) + 5;
    }
    await You_feel('the air around you grow charged...');
    await pline(`Suddenly, you realize that ${align_gname(altaralign)} has noticed you...`);
    await godvoice(altaralign,
                   `So, mortal!  You dare desecrate my ${
                       highaltar ? 'High Temple' : 'altar'}!`);
    await god_zaps_you(altaralign);
}

async function offer_negative_valued(highaltar, altaralign) {
    if (altaralign !== game.u.ualign.type && highaltar)
        await desecrate_altar(highaltar, altaralign);
    else
        await gods_upset(altaralign);
}

// src/pray.c:1602 offer_fake_amulet().
async function offer_fake_amulet(obj, highaltar, altaralign) {
    if (!highaltar && !obj.known) {
        await offer_too_soon(altaralign);
        return;
    }
    await You_hear('a nearby thunderclap.');
    if (!obj.known) {
        await You(`realize you have made a ${
            Hallucination() ? 'boo-boo' : 'mistake'}.`);
        obj.known = true;
        change_luck(-1);
        return;
    }

    if (Deaf())
        await pline('Oh, no.');
    change_luck(-3);
    adjalign(-1);
    game.u.ugangr = (game.u.ugangr || 0) + 3;
    await offer_negative_valued(highaltar, altaralign);
}

// src/pray.c:1529 offer_real_amulet().
async function offer_real_amulet(obj, altaralign) {
    if (game.u.uamul === obj) {
        const { Amulet_off } = await import('./do_wear.js');
        await Amulet_off();
    }
    if (carried(obj))
        useup(obj);
    else
        useupf(obj, 1);

    const altarGod = align_gname(altaralign);
    const heroGod = align_gname(game.u.ualign.type);
    await You(`offer the Amulet of Yendor to ${altarGod}...`);

    if (altaralign === A_NONE) {
        if (game.u.ualign.record > -99)
            game.u.ualign.record = -99;
        await pline('An invisible choir chants, and you are bathed in darkness...');
        await pline(`Moloch shrugs and retains dominion over ${heroGod},`);
        await pline('then mercilessly snuffs out your life.');
        game.killer = { format: KILLED_BY,
                        name: `${s_suffix('Moloch')} indifference` };
        await done(DIED);
        await pline('Moloch snarls and tries again...');
        await fry_by_god(A_NONE, true);
        await pline(`A cloud of ${hcolor(NH_BLACK)} smoke surrounds you...`);
        await done(ESCAPED);
    } else if (game.u.ualign.type !== altaralign) {
        adjalign(-99);
        await pline(`${altarGod} accepts your gift, and gains dominion over ${heroGod}...`);
        await pline(`${heroGod} is enraged...`);
        await pline(`Fortunately, ${altarGod} permits you to live...`);
        await pline(`A cloud of ${hcolor(NH_ORANGE)} smoke surrounds you...`);
        await done(ESCAPED);
    } else {
        (game.u.uevent ||= {}).ascended = 1;
        adjalign(10);
        await pline('An invisible choir sings, and you are bathed in radiance...');
        await godvoice(altaralign, 'Mortal, thou hast done well!');
        await pline('"In return for thy service, I grant thee the gift of Immortality!"');
        await You(`ascend to the status of Demigod${
            game.flags?.female ? 'dess' : ''}...`);
        await done(ASCENDED);
    }
}

// src/pray.c:1854 dosacrifice() -- #offer.
export async function dosacrifice() {
    const altar = game.level?.at(game.u.ux, game.u.uy);
    if (!altar || !IS_ALTAR(altar.typ) || game.u.uswallow) {
        await You(`are not ${(Levitation() || Flying()) ? 'over' : 'on'} an altar.`);
        return ECMD_OK;
    }
    if (game.u.intrinsic?.HConfusion || game.u.intrinsic?.HStun
        || game.u.uprops?.CONFUSION || game.u.uprops?.STUNNED) {
        await You('are too impaired to perform the rite.');
        return ECMD_OK;
    }

    const highaltar = !!(altar.altarmask & AM_SANCTUM);
    const altaralign = Amask2align(altar.altarmask);
    const obj = await floorfood('sacrifice', 1);
    if (!obj)
        return ECMD_OK;

    if (obj.otyp === ONAMES.AMULET_OF_YENDOR) {
        if (!highaltar)
            await offer_too_soon(altaralign);
        else
            await offer_real_amulet(obj, altaralign);
        return ECMD_TIME;
    }
    if (obj.otyp === ONAMES.FAKE_AMULET_OF_YENDOR) {
        await offer_fake_amulet(obj, highaltar, altaralign);
        return ECMD_TIME;
    }
    if (obj.otyp === ONAMES.CORPSE) {
        await offer_corpse(obj, highaltar, altaralign);
        return ECMD_TIME;
    }
    await pline(nothing_happens);
    return ECMD_TIME;
}

async function fry_by_god(resp_god, via_disintegration) {
    await You(via_disintegration
              ? 'disintegrate into a pile of dust!'
              : 'fry to a crisp!');
    game.killer = {
        format: KILLED_BY,
        name: `the wrath of ${align_gname(resp_god)}`,
    };
    await done(DIED);
}

async function disintegrate_divine_armor(obj, slot) {
    if (!obj || obj_resists(obj, 0, 90))
        return false;
    const message = slot === 'shield'
        ? 'Your shield crumbles away!'
        : slot === 'cloak'
          ? 'Your cloak crumbles and turns to dust!'
          : slot === 'shirt'
            ? 'Your shirt crumbles into tiny threads and falls apart!'
            : 'Your armor turns to dust and falls to the floor!';
    await pline(message);
    await more();
    useup(obj);
    return true;
}

async function god_zaps_you(resp_god) {
    const u = game.u;
    if (u.uswallow) {
        note_unported_pray('god_zaps_you:swallowed');
        return;
    }

    await pline('Suddenly, a bolt of lightning strikes you!');
    if (Reflecting()) {
        await pline(u.ublind
                    ? "For some reason you're unaffected."
                    : 'It reflects from your armor!');
    } else if (Shock_resistance()) {
        await pline('It seems not to affect you.');
    } else {
        await fry_by_god(resp_god, false);
    }

    await pline(`${align_gname(resp_god)} is not deterred...`);
    await pline('A wide-angle disintegration beam hits you!');

    const reflecting = u.uprops?.REFLECTING || 0;
    const disint = u.uprops?.DISINT_RES || 0;
    let armorDestroyed = false;
    if (u.uarms && !(reflecting & W_ARMS) && !(disint & W_ARMS))
        armorDestroyed = await disintegrate_divine_armor(u.uarms, 'shield')
                         || armorDestroyed;
    if (u.uarmc && !(reflecting & W_ARMC) && !(disint & W_ARMC))
        armorDestroyed = await disintegrate_divine_armor(u.uarmc, 'cloak')
                         || armorDestroyed;
    if (u.uarm && !(reflecting & W_ARM) && !(disint & W_ARM) && !u.uarmc)
        armorDestroyed = await disintegrate_divine_armor(u.uarm, 'armor')
                         || armorDestroyed;
    if (u.uarmu && !u.uarm && !u.uarmc)
        armorDestroyed = await disintegrate_divine_armor(u.uarmu, 'shirt')
                         || armorDestroyed;

    const disintResistant = !!(u.intrinsic?.HDisint_resistance
                               || u.uprops?.DISINT_RES);
    if (!disintResistant)
        await fry_by_god(resp_god, true);
    else {
        await You(`bask in its ${NH_BLACK} glow for a minute...`);
        await godvoice(resp_god, 'I believe it not!');
    }
    if (armorDestroyed)
        find_ac();
}

// src/pray.c:1071 pleased(). The successful-prayer favors and crowning path
// follow the C dispatch and state changes used by the reference sessions.
async function pleased(g_align) {
    const u = game.u;
    let trouble = in_trouble();
    let pat_on_head = false;
    const hallucinating = !!u.uprops?.HALLUC;

    const mood = u.ualign.record >= DEVOUT
        ? (hallucinating ? 'pleased as punch' : 'well-pleased')
        : u.ualign.record >= STRIDENT
          ? (hallucinating ? 'ticklish' : 'pleased')
          : (hallucinating ? 'full' : 'satisfied');
    await You_feel(`that ${align_gname(g_align)} is ${mood}.`);

    if (on_altar() && p_aligntyp !== u.ualign.type) {
        adjalign(-1);
        return;
    } else if (u.ualign.record < 2 && trouble <= 0) {
        adjalign(1);
    }

    if (!trouble && u.ualign.record >= DEVOUT) {
        if (p_trouble === 0)
            pat_on_head = true;
    } else {
        const luck = Math.max((u.uluck || 0) + (u.moreluck || 0), -1);
        let action = rn1(luck + (on_altar() ? 3 + Number(on_shrine()) : 2), 1);
        if (!on_altar())
            action = Math.min(action, 3);
        if (u.ualign.record < STRIDENT)
            action = (u.ualign.record > 0 || !rnl(2)) ? 1 : 0;

        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = true;
            // Fall through to fixing every trouble.
        case 4:
            while (trouble) {
                if (!(await fix_worst_trouble(trouble)))
                    break;
                trouble = in_trouble();
            }
            break;
        case 3: {
            await fix_worst_trouble(trouble);
            let tryct = 0;
            while ((trouble = in_trouble()) > 0 && ++tryct < 10) {
                if (!(await fix_worst_trouble(trouble)))
                    break;
            }
            break;
        }
        case 2: {
            let tryct = 0;
            while ((trouble = in_trouble()) > 0 && ++tryct < 10) {
                if (!(await fix_worst_trouble(trouble)))
                    break;
            }
            break;
        }
        case 1:
            if (trouble > 0)
                await fix_worst_trouble(trouble);
            break;
        default:
            break;
        }
    }

    if (pat_on_head) {
        const luck = (u.uluck || 0) + (u.moreluck || 0);
        const favor = rn2((luck + 6) >> 1);

        switch (favor) {
        case 0:
            break;
        case 1: {
            const uwep = u.uwep;
            if (!uwep || !(welded(uwep)
                           || uwep.oclass === OCLASSES.WEAPON_CLASS
                           || is_weptool(uwep, game.objects)))
                break;

            let repair = '';
            if (uwep.oeroded || uwep.oeroded2)
                repair = ` and ${otense(uwep, 'are')} now as good as new`;

            if (uwep.cursed) {
                if (!Blind()) {
                    await pline(`${Yobjnam2(uwep, 'softly glow')} ${
                        hcolor(NH_AMBER)}${repair}.`);
                } else {
                    await You_feel(`the power of ${align_gname(u.ualign.type)} over ${yname(uwep)}.`);
                }
                uncurse(uwep);
                uwep.bknown = 1;
                repair = '';
            } else if (!uwep.blessed) {
                if (!Blind()) {
                    await pline(`${Yobjnam2(uwep, 'softly glow')} with ${
                        an(hcolor(NH_LIGHT_BLUE))} aura${repair}.`);
                } else {
                    await You_feel(`the blessing of ${align_gname(u.ualign.type)} over ${yname(uwep)}.`);
                }
                bless(uwep);
                uwep.bknown = 1;
                repair = '';
            }

            if (uwep.oeroded || uwep.oeroded2) {
                uwep.oeroded = uwep.oeroded2 = 0;
                if (repair)
                    await pline(`${Yobjnam2(uwep, Blind() ? 'feel' : 'look')} as good as new!`);
            }
            update_inventory();
            break;
        }
        case 3: {
            const uevent = (u.uevent ||= {});
            if (!uevent.uopened_dbridge && !uevent.gehennom_entered) {
                if ((uevent.uheard_tune | 0) < 1) {
                    await godvoice(g_align, null);
                    await pline(`"Hark, ${is_human(game.youmonst.data)
                        ? 'mortal' : 'creature'}!"`);
                    await pline('"To enter the castle, thou must play the right tune!"');
                    uevent.uheard_tune = (uevent.uheard_tune | 0) + 1;
                    break;
                } else if (uevent.uheard_tune < 2) {
                    await You_hear('a divine music...');
                    await pline(`It sounds like:  "${game.castle_tune}".`);
                    uevent.uheard_tune++;
                    break;
                }
            }
            // Fall through once both tune hints have been given.
        }
        case 2:
            if (!Blind())
                await You(`are surrounded by ${an(hcolor(NH_GOLDEN))} glow.`);
            if (u.ulevel < u.ulevelmax) {
                u.ulevelmax--;
                await pluslvl(false);
            } else {
                u.uhpmax += 5;
                if (u.uhpmax > (u.uhppeak || 0))
                    u.uhppeak = u.uhpmax;
                if (Upolyd(u))
                    u.mhmax += 5;
            }
            u.uhp = u.uhpmax;
            if (Upolyd(u))
                u.mh = u.mhmax;
            if (u.acurr.a[A_STR] < u.amax.a[A_STR]) {
                u.acurr.a[A_STR] = u.amax.a[A_STR];
                (game.disp ||= {}).botl = true;
                await encumber_msg();
            }
            if (u.uhunger < 900)
                init_uhunger();
            if ((u.uluck | 0) < 0)
                u.uluck = 0;
            u.ucreamed = 0;
            await make_blinded(0, true);
            (game.disp ||= {}).botl = true;
            break;
        case 4: {
            let any = 0;
            if (Blind()) {
                await You_feel(`the power of ${align_gname(u.ualign.type)}.`);
            } else {
                await You(`are surrounded by ${an(hcolor(NH_LIGHT_BLUE))} aura.`);
            }
            for (const obj of game.invent || []) {
                if (!obj.cursed
                    || (obj === u.uarmh
                        && obj.otyp === ONAMES.HELM_OF_OPPOSITE_ALIGNMENT))
                    continue;
                if (!Blind()) {
                    await pline(`${Yobjnam2(obj, 'softly glow')} ${
                        hcolor(NH_AMBER)}.`);
                    obj.bknown = 1;
                    any++;
                }
                uncurse(obj);
            }
            if (any)
                update_inventory();
            break;
        }
        case 5: {
            const intrinsic = (u.intrinsic ||= {});
            await godvoice(u.ualign.type,
                           'Thou hast pleased me with thy progress,');
            let gift;
            if (!((intrinsic.HTelepat | 0) & INTRINSIC)) {
                intrinsic.HTelepat = (intrinsic.HTelepat | 0) | FROMOUTSIDE;
                gift = 'Telepathy';
                if (Blind())
                    see_monsters();
            } else if (!((intrinsic.HFast | 0) & INTRINSIC)) {
                intrinsic.HFast = (intrinsic.HFast | 0) | FROMOUTSIDE;
                gift = 'Speed';
            } else if (!((intrinsic.HStealth | 0) & INTRINSIC)) {
                intrinsic.HStealth = (intrinsic.HStealth | 0) | FROMOUTSIDE;
                gift = 'Stealth';
            } else {
                if (!((intrinsic.HProtection | 0) & INTRINSIC)) {
                    intrinsic.HProtection = (intrinsic.HProtection | 0)
                                            | FROMOUTSIDE;
                    if (!u.ublessed)
                        u.ublessed = rn1(3, 2);
                } else {
                    u.ublessed = (u.ublessed | 0) + 1;
                }
                gift = 'my protection';
            }
            await pline(`"and thus I grant thee the gift of ${gift}!"`);
            await pline('"Use it wisely in my name!"');
            break;
        }
        case 7:
        case 8:
            if (u.ualign.record >= PIOUS
                && !(u.uevent?.uhand_of_elbereth)) {
                await gcrownu();
                break;
            }
            // Fall through when the hero is not eligible for crowning.
        case 6:
            await give_spell();
            break;
        default:
            break;
        }
    }

    u.ublesscnt = rnz(350);
    let kickOnButt = u.uevent?.udemigod ? 1 : 0;
    if (u.uevent?.uhand_of_elbereth)
        kickOnButt++;
    if (kickOnButt)
        u.ublesscnt += kickOnButt * rnz(1000);
}

// src/pray.c:2276 prayer_done()
async function prayer_done() {
    const u = game.u;
    const alignment = p_aligntyp;

    u.uinvulnerable = false;

    /* p_type -1 (undead turning) and -2 (Moloch) arms — hero states the
       port does not model yet */
    if (p_type === -2) {
        note_unported_pray('prayer_done:moloch');
        return 0;
    }
    /* Inhell arm — Gehennom is not modelled */

    if (p_type === 0) {
        if (on_altar() && u.ualign.type !== alignment)
            note_unported_pray('prayer_done:water_prayer');
        u.ublesscnt += rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign.type);
    } else if (p_type === 1) {
        if (on_altar() && u.ualign.type !== alignment)
            note_unported_pray('prayer_done:water_prayer');
        await angrygods(u.ualign.type); /* naughty */
    } else if (p_type === 2) {
        note_unported_pray('prayer_done:cross_altar');
        await angrygods(u.ualign.type);
    } else {
        /* coaligned */
        if (on_altar())
            note_unported_pray('prayer_done:pray_revive_water');
        await pleased(alignment);
    }
    return 1;
}

// src/pray.c:2199 dopray() — the #pray command.
export async function dopray() {
    /* ParanoidPray is a default-on confirmation */
    const ans = await tty_yn_function('Are you sure you want to pray?',
                                      'yn', 'n');
    if (ans !== 'y')
        return ECMD_OK;

    game.u.uconduct ||= {};
    /* src/pray.c:2227 — first prayer logs the broken conduct */
    if (!game.u.uconduct.gnostic) {
        const { livelog_add } = await import('./pline.js');
        livelog_add('rejected atheism with a prayer');
    }
    game.u.uconduct.gnostic = (game.u.uconduct.gnostic || 0) + 1;

    /* set up p_type and p_alignment */
    if (!(await can_pray(true)))
        return ECMD_OK;

    /* wizard-mode "Force the gods to be pleased?" — playmode:debug only */
    if (game.wizard && p_type >= 0) {
        const ok = await tty_yn_function('Force the gods to be pleased?',
                                         'yn', 'n');
        if (ok === 'y') {
            game.u.ublesscnt = 0;
            if ((game.u.uluck ?? 0) < 0)
                game.u.uluck = 0;
            if (game.u.ualign.record <= 0)
                game.u.ualign.record = 1;
            game.u.ugangr = 0;
            if (p_type < 2)
                p_type = 3;
        }
    }
    nomul(-3);
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    if (p_type === 3) {
        /* if you've been true to your god you can't die while you pray */
        if (!game.u.ublind)
            await You('are surrounded by a shimmering light.');
        game.u.uinvulnerable = true;
    }

    return ECMD_TIME;
}
