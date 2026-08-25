// pray.js — prayer.
// C ref: src/pray.c
//
// The #pray command covers confirmation, eligibility, the three-turn delay,
// failed prayer, and the ordinary coaligned successful response. Punishments,
// trouble cures, rare divine favors, and sacrifice remain partial.

import { game } from './gstate.js';
import { rn1, rn2, rnd, rnz, rnl } from './rng.js';
import { pline } from './display.js';
import { You, You_feel, pline_The } from './pline.js';
import { tty_yn_function } from './tty/topl.js';
import { nomul, losehp } from './hack.js';
import { adjalign, change_luck, near_capacity, exercise } from './attrib.js';
import { which_armor } from './worn.js';
import { IS_ALTAR, Amask2align, A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
         ECMD_OK, ECMD_TIME, W_SADDLE, TT_LAVA, TT_BURIEDBALL, WEAK, HUNGRY,
         EXT_ENCUMBER, A_MAX, A_STR, A_WIS, AM_SHRINE, TIMEOUT,
         Upolyd } from './const.js';
import { ONAMES } from './objects_data.js';

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
const DEVOUT = 14, STRIDENT = 4;

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
    case 5:
        note_unported_pray('angrygods:rndcurse');
        break;
    case 7:
    case 8:
        note_unported_pray('angrygods:summon_minion');
        break;
    default:
        note_unported_pray('angrygods:god_zaps_you');
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

// src/pray.c:1071 pleased(). The ordinary no-trouble successful-prayer path is
// complete. Trouble cures and rare favors preserve their dispatch draw and
// record the missing state change.
async function pleased(g_align) {
    const u = game.u;
    const trouble = in_trouble();
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

        if (trouble || action > 1)
            note_unported_pray(`pleased:action=${Math.min(action, 5)}:trouble=${trouble}`);
        if (action >= 5)
            pat_on_head = true;
    }

    if (pat_on_head) {
        const luck = (u.uluck || 0) + (u.moreluck || 0);
        const favor = rn2((luck + 6) >> 1);
        if (favor)
            note_unported_pray(`pleased:favor=${favor}`);
    }

    u.ublesscnt = rnz(350);
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
