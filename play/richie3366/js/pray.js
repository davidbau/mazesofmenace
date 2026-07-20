// pray.js — Prayer / altar gods (partial).
// C ref: pray.c — can_pray, dopray, prayer_done, gods_upset, angrygods,
// water_prayer, on_altar / a_align helpers; dosacrifice (#offer); #turn
// (doturn / maybe_turn_mon_iter, D-0912).
//
// Branch envelope: ParanoidPray yn confirm (default on) + wizard Force
// (D-0517) + #pray ublesscnt-too-soon (p_type 0) → angrygods; p_type 3 →
// pleased You_feel + action rn1 + TROUBLE_HIT fix_worst_trouble (D-0920)
// + ublesscnt rnz(350); #offer not-on-altar; Knight/Cleric #turn chant +
// exercise + undead iter + nomul.
// Named omissions: other in_trouble majors/minors; other fix_worst_trouble
// cases; ParanoidConfirm "yes"; angrygods cases 4+; pleased pat_on_head
// gifts / crown / give_spell; p_type -2/-1/1/2 outcome bodies beyond
// water_prayer scan; pray_revive; floorfood sacrifice; known_spell
// SPE_TURN_UNDEAD / spelleffects fallback for non-Knight/Cleric; resist
// TELL pline polish; other livelog paths; poly silent/headless can_chant;
// Fixed_abil/Dunce adjattrib; Unaware You_feel dream prefix.

import { game } from './gstate.js';
import { rn2, rn1, rnl, rnz, rnd } from './rng.js';
import { pline, verbalize, You_feel } from './display.js';
import { nomul } from './hack.js';
import { A_WIS, change_luck, adjattrib, adjalign, exercise } from './attrib.js';
import { align_gname, xlev_to_rank } from './roles.js';
import { objects_at } from './mkobj.js';
import { yn_function } from './getline.js';
import { livelog_printf } from './pline.js';
import { can_chant } from './spell.js';
import { couldsee } from './vision.js';
import { monflee } from './monmove.js';
import { set_malign } from './makemon.js';
import { killed } from './uhitm.js';
import { aggravate } from './wizard.js';
import { setuhpmax } from './exper.js';
import {
    is_undead as mon_is_undead,
    is_demon as mon_is_demon,
    is_vampshifter,
} from './monsters.js';
import {
    PM_KNIGHT,
    PM_CLERIC,
} from './generated/monsters_data.js';
import {
    IS_ALTAR, Amask2align, AM_MASK, AM_SHRINE, A_NONE, A_LAWFUL, A_NEUTRAL,
    A_CHAOTIC, GEHENNOM, ECMD_OK, ECMD_TIME, PARANOID_PRAY, LL_CONDUCT,
    LL_MINORAC, BOLT_LIM, MAXULEV, TELL, NOTELL, Upolyd,
} from './const.js';
import { POT_WATER, POTION_CLASS } from './objects.js';

const MOLOCH = 'Moloch';

const STRIDENT = 4; // pray.c
const DEVOUT = 14; // pray.c
// C: pray.c TROUBLE_* (priority via in_trouble order, not magnitude)
const TROUBLE_HIT = 7;
// C: pray.c godvoices[]
const GODVOICES = ['booms out', 'thunders', 'rings out', 'booms'];

function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

function Inhell() {
    return (game.u?.uz?.dnum | 0) === GEHENNOM;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

function Hallucination() {
    return !!(game.u?.Hallucination);
}

/** C: pray.c on_altar */
function on_altar() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    return !!(loc && IS_ALTAR(loc.typ));
}

/** C: pray.c on_shrine — altarmask AM_SHRINE */
function on_shrine() {
    const u = game.u;
    const loc = game.level?.at(u?.ux, u?.uy);
    if (!loc) return false;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return (mask & AM_SHRINE) !== 0;
}

/** C: pray.c a_align — altarmask overlays rm.flags in C; JS mkaltar uses flags */
function a_align(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return A_NONE;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return Amask2align(mask & AM_MASK);
}

/**
 * C ref: pray.c critically_low_hp — hp ≤ 5 or hp*divisor ≤ maxhp.
 * @param {boolean} only_if_injured
 */
function critically_low_hp(only_if_injured) {
    const u = game.u || {};
    const polyd = Upolyd(u);
    let curhp = polyd ? (u.mh | 0) : (u.uhp | 0);
    let maxhp = polyd ? (u.mhmax | 0) : (u.uhpmax | 0);
    if (only_if_injured && !(curhp < maxhp)) return false;
    const hplim = 15 * (u.ulevel | 0);
    if (maxhp > hplim) maxhp = hplim;
    let divisor;
    switch (xlev_to_rank(u.ulevel | 0)) {
    case 0:
    case 1:
        divisor = 5;
        break;
    case 2:
    case 3:
        divisor = 6;
        break;
    case 4:
    case 5:
        divisor = 7;
        break;
    case 6:
    case 7:
        divisor = 8;
        break;
    default:
        divisor = 9;
        break;
    }
    return curhp <= 5 || curhp * divisor <= maxhp;
}

/**
 * C ref: pray.c in_trouble — major/minor trouble ranking.
 * Ported: TROUBLE_HIT via critically_low_hp (D-0920).
 * Named omissions: Stoned/Slimed/Strangled/Lava/Sick/Starving/Region
 * and all later major/minor arms (lycanthrope…hallucination).
 */
function in_trouble() {
    const u = game.u || {};
    // Majors above HIT deferred — when those flags are unset, HIT matches C.
    const unchanging = !!(u.Unchanging || u.HUnchanging);
    if ((!Upolyd(u) || unchanging) && critically_low_hp(false)) {
        return TROUBLE_HIT;
    }
    return 0;
}

/**
 * C ref: pray.c fix_worst_trouble — divine repair of one trouble code.
 * Ported: TROUBLE_HIT (You_feel + rnd(5) uhpmax boost + full heal).
 * Named omissions: all other TROUBLE_* cases.
 */
async function fix_worst_trouble(trouble) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    switch (trouble) {
    case TROUBLE_HIT: {
        // C: You_feel("much better.");
        await You_feel('much better.');
        let maxhp;
        if (Upolyd(u)) {
            maxhp = (u.mhmax | 0) + rnd(5);
            setuhpmax(Math.max(maxhp, 5 + 1), false);
            u.mh = u.mhmax;
        }
        maxhp = u.uhpmax | 0;
        if (maxhp < (u.ulevel | 0) * 5 + 11) {
            maxhp += rnd(5);
        }
        setuhpmax(Math.max(maxhp, 5 + 1), true);
        u.uhp = u.uhpmax;
        game.flags.botl = true;
        break;
    }
    default:
        break;
    }
}

/** Local stubs — full mondata predicates deferred (C-JS-MAP). */
function is_demon(_data) {
    return false;
}
function is_undead(_data) {
    return false;
}

function pray_state() {
    if (!game.pray) game.pray = { p_aligntyp: 0, p_trouble: 0, p_type: 0 };
    return game.pray;
}

/**
 * C ref: pray.c water_prayer — bless/curse POT_WATER on altar; no RNG.
 * @returns {boolean} true if any water changed
 */
function water_prayer(bless_water) {
    const u = game.u;
    let changed = 0;
    let other = false;
    const bc_known = !(Blind() || Hallucination());
    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (
            otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed)
        ) {
            otmp.blessed = !!bless_water;
            otmp.cursed = !bless_water;
            otmp.bknown = bc_known;
            changed += otmp.quan | 0;
        } else if (otmp.oclass === POTION_CLASS) {
            other = true;
        }
    }
    // Glow pline deferred unless screens need it
    void other;
    return changed > 0;
}

/**
 * C ref: pray.c can_pray — set p_aligntyp / p_trouble / p_type.
 * @param {boolean} praying
 */
export async function can_pray(praying) {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const data = game.youmonst?.data;

    gp.p_aligntyp = on_altar() ? a_align(u.ux, u.uy) : (u.ualign?.type ?? 0);
    gp.p_trouble = in_trouble();

    if (
        is_demon(data)
        && (gp.p_aligntyp === A_LAWFUL || gp.p_aligntyp !== A_NEUTRAL)
    ) {
        if (praying) {
            await pline(
                `The very idea of praying to a ${
                    gp.p_aligntyp ? 'lawful' : 'neutral'
                } god is repugnant to you.`,
            );
        }
        return false;
    }

    if (praying) {
        await pline(
            `You begin praying to ${align_gname(game.urole, gp.p_aligntyp)}.`,
        );
    }

    const utype = u.ualign?.type ?? 0;
    const record = u.ualign?.record | 0;
    let alignment;
    if (utype && utype === -gp.p_aligntyp) {
        alignment = -record;
    } else if (utype !== gp.p_aligntyp) {
        alignment = Math.trunc(record / 2);
    } else {
        alignment = record;
    }

    const bless = u.ublesscnt | 0;
    if (gp.p_aligntyp === A_NONE) {
        gp.p_type = -2;
    } else if (
        (gp.p_trouble > 0)
            ? (bless > 200)
            : (gp.p_trouble < 0)
                ? (bless > 100)
                : (bless > 0)
    ) {
        gp.p_type = 0; // too soon
    } else if (Luck() < 0 || (u.ugangr | 0) || alignment < 0) {
        gp.p_type = 1;
    } else if (on_altar() && utype !== gp.p_aligntyp) {
        gp.p_type = 2;
    } else {
        gp.p_type = 3;
    }

    if (
        is_undead(data)
        && !Inhell()
        && (
            gp.p_aligntyp === A_LAWFUL
            || (gp.p_aligntyp === A_NEUTRAL && !rn2(10))
        )
    ) {
        gp.p_type = -1;
    }

    return !praying ? (gp.p_type === 3 && !Inhell()) : true;
}

/**
 * C ref: pray.c godvoice — ROLL_FROM(godvoices) → rn2(4).
 * @param {number} g_align
 * @param {string|null} words
 */
async function godvoice(g_align, words) {
    let quot = '';
    let w = words;
    if (w) quot = '"';
    else w = '';
    const how = GODVOICES[rn2(GODVOICES.length)];
    await pline(
        `The voice of ${align_gname(game.urole, g_align)} ${how}: ${quot}${w}${quot}`,
    );
}

/**
 * C ref: exper.c losexp — level-drain for divine anger (drainer==null).
 * RNG-free body; resists_drli / Upolyd / achievements deferred.
 */
function losexp_divine() {
    const u = game.u || (game.u = {});
    if ((u.ulevel | 0) > 1) {
        u.ulevel = (u.ulevel | 0) - 1;
        // adjabil / "lost experience level N" livelog deferred
    } else {
        u.uexp = 0;
        // C: livelog_printf(LL_MINORAC, "lost all experience")
        livelog_printf(LL_MINORAC, 'lost all experience');
    }
    const numHp = (u.uhpinc?.[u.ulevel] | 0);
    u.uhpmax = (u.uhpmax | 0) - numHp;
    if ((u.uhpmax | 0) < 10) u.uhpmax = 10;
    u.uhp = (u.uhp | 0) - numHp;
    if ((u.uhp | 0) < 1) u.uhp = 1;
    else if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhp = u.uhpmax;
    const numEn = (u.ueninc?.[u.ulevel] | 0);
    u.uenmax = (u.uenmax | 0) - numEn;
    if ((u.uenmax | 0) < 0) u.uenmax = 0;
    u.uen = (u.uen | 0) - numEn;
    if ((u.uen | 0) < 0) u.uen = 0;
    else if ((u.uen | 0) > (u.uenmax | 0)) u.uen = u.uenmax;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: pray.c angrygods — cases 0–3 + ublesscnt rnz(300) tail.
 * Cases 4+ (curse/minion/zap) named omitted.
 */
async function angrygods(resp_god) {
    const u = game.u || (game.u = {});
    if (Inhell()) resp_god = A_NONE;
    u.ublessed = 0;

    let maxanger;
    if (resp_god !== (u.ualign?.type ?? 0)) {
        maxanger = Math.trunc((u.ualign?.record | 0) / 2)
            + (Luck() > 0 ? -Math.trunc(Luck() / 3) : -Luck());
    } else {
        maxanger = 3 * (u.ugangr | 0)
            + ((Luck() > 0 || ((u.ualign?.record | 0) >= STRIDENT))
                ? -Math.trunc(Luck() / 3)
                : -Luck());
    }
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const mortal = 'mortal'; // youmonst.data->mlet == S_HUMAN assumed for L1 roles
    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await pline(
            `You feel that ${align_gname(game.urole, resp_god)} is ${
                Hallucination() ? 'bummed' : 'displeased'
            }.`,
        );
        break;
    case 2:
    case 3: {
        await godvoice(resp_god, null);
        const strayed = ((u.ualign?.record | 0) < 0)
            && resp_god === (u.ualign?.type ?? 0);
        // C: ugod_is_angry() — (u.ualign.record < 0)
        await pline(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, ${mortal}."`,
        );
        // C: SetVoice + verbalize("Thou must relearn thy lessons!")
        await verbalize('Thou must relearn thy lessons!');
        // C: adjattrib(A_WIS, -1, FALSE) → You_feel("foolish!") → more()
        await adjattrib(A_WIS, -1, false);
        losexp_divine();
        break;
    }
    default:
        // Cases 4+ deferred — still apply pray-timer below (may desync if hit)
        await pline(
            `You feel that ${align_gname(game.urole, resp_god)} is angry.`,
        );
        break;
    }

    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > (u.ublesscnt | 0)) u.ublesscnt = new_ublesscnt;
}

/** C ref: pray.c gods_upset */
async function gods_upset(g_align) {
    const u = game.u || (game.u = {});
    if (g_align === (u.ualign?.type ?? 0)) u.ugangr = (u.ugangr | 0) + 1;
    else if (u.ugangr) u.ugangr = (u.ugangr | 0) - 1;
    await angrygods(g_align);
}

/**
 * C ref: pray.c pleased — successful prayer favor.
 * Branch envelope: You_feel align msg; off-altar/low-record adjalign;
 * action rn1 + STRIDENT clamp; fix_worst_trouble switch (HIT D-0920);
 * ublesscnt rnz(350) (+udemigod kick).
 * Named omissions: other in_trouble/fix_worst_trouble cases; pat_on_head
 * gift switch (repair/uncurse/spellbook/intrinsic/crown/give_spell);
 * moves>100000 ublesscnt incr; on_altar wrong-god early return polish.
 */
async function pleased(g_align) {
    const u = game.u || (game.u = {});
    let trouble = in_trouble();
    let pat_on_head = 0;

    const record = u.ualign?.record | 0;
    const feel = record >= DEVOUT
        ? (Hallucination() ? 'pleased as punch' : 'well-pleased')
        : record >= STRIDENT
            ? (Hallucination() ? 'ticklish' : 'pleased')
            : (Hallucination() ? 'full' : 'satisfied');
    await You_feel(`that ${align_gname(game.urole, g_align)} is ${feel}.`);

    // C: on_altar && p_aligntyp != ualign → adjalign(-1); return
    if (on_altar() && (pray_state().p_aligntyp | 0) !== (u.ualign?.type ?? 0)) {
        adjalign(-1);
        return;
    } else if (record < 2 && trouble <= 0) {
        adjalign(1);
    }

    if (!trouble && record >= DEVOUT) {
        if ((pray_state().p_trouble | 0) === 0) pat_on_head = 1;
    } else {
        // C: prayer_luck = max(Luck, -1); action = rn1(luck + altar?3+shrine:2, 1)
        const prayer_luck = Math.max(Luck(), -1);
        let action = rn1(
            prayer_luck + (on_altar() ? 3 + (on_shrine() ? 1 : 0) : 2),
            1,
        );
        if (!on_altar()) action = Math.min(action, 3);
        if (record < STRIDENT) {
            // use post-adjalign record
            const rec = u.ualign?.record | 0;
            action = (rec > 0 || !rnl(2)) ? 1 : 0;
        }

        // C: switch (min(action, 5)) — fix_worst_trouble / in_trouble loops
        let tryct = 0;
        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = 1;
            // FALLTHROUGH
        case 4:
            do {
                await fix_worst_trouble(trouble);
            } while ((trouble = in_trouble()) !== 0);
            break;
        case 3:
            await fix_worst_trouble(trouble);
            // FALLTHROUGH
        case 2:
            while ((trouble = in_trouble()) > 0 && (++tryct < 10)) {
                await fix_worst_trouble(trouble);
            }
            break;
        case 1:
            if (trouble > 0) await fix_worst_trouble(trouble);
            break;
        case 0:
            break;
        }
    }

    // pat_on_head gift switch deferred
    void pat_on_head;
    u.ublesscnt = rnz(350);
    let kick_on_butt = u.uevent?.udemigod ? 1 : 0;
    if (u.uevent?.uhand_of_elbereth) kick_on_butt++;
    if (kick_on_butt) u.ublesscnt += kick_on_butt * rnz(1000);
}

/**
 * C ref: pray.c prayer_done — afternmv after nomul(-3).
 * Ported: p_type 0 (too soon) full path; p_type 3 → pleased envelope;
 * other p_types partial/stub.
 */
export async function prayer_done() {
    const u = game.u || (game.u = {});
    const gp = pray_state();
    const alignment = gp.p_aligntyp;
    u.uinvulnerable = false;

    if (gp.p_type === -2 || gp.p_type === -1) {
        // Moloch / undead paths deferred
        return 1;
    }
    if (Inhell()) {
        await pline(
            `Since you are in Gehennom, ${align_gname(game.urole, alignment)} can't help you.`,
        );
        // angrygods gate deferred
        return 0;
    }

    if (gp.p_type === 0) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
        change_luck(-3);
        await gods_upset(u.ualign?.type ?? 0);
    } else if (gp.p_type === 1) {
        if (on_altar() && (u.ualign?.type ?? 0) !== alignment) {
            water_prayer(false);
        }
        await angrygods(u.ualign?.type ?? 0);
    } else if (gp.p_type === 2) {
        if (water_prayer(false)) {
            u.ublesscnt = (u.ublesscnt | 0) + rnz(250);
            change_luck(-3);
            await gods_upset(u.ualign?.type ?? 0);
        } else {
            await pleased(alignment);
        }
    } else {
        // p_type 3 coaligned — pray_revive deferred
        if (on_altar()) water_prayer(true);
        await pleased(alignment);
    }
    return 1;
}

/**
 * C ref: pray.c dopray — #pray
 * ParanoidPray (default) → paranoid_query(ParanoidConfirm, …);
 * wizard Force-the-gods (D-0517) → may raise p_type to 3 + clear
 * ublesscnt so uinvulnerable gates gethungry during nomul(-3).
 */
export async function dopray() {
    const u = game.u || (game.u = {});
    // C: flags.paranoia_bits defaults include PARANOID_PRAY
    const bits = game.flags?.paranoia_bits;
    const paranoidPray = bits == null
        ? true
        : (bits & PARANOID_PRAY) !== 0;
    if (paranoidPray) {
        // C: paranoid_query(ParanoidConfirm, …); Confirm→getlin "yes" deferred
        const ok = (await yn_function(
            'Are you sure you want to pray?', 'yn', 'n',
        )) === 'y';
        if (!ok) return ECMD_OK;
    }

    if (!u.uconduct) u.uconduct = {};
    // C: if (!u.uconduct.gnostic++) livelog_printf(...)
    if (!(u.uconduct.gnostic | 0)) {
        u.uconduct.gnostic = 1;
        livelog_printf(LL_CONDUCT, 'rejected atheism with a prayer');
    } else {
        u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;
    }

    if (!(await can_pray(true))) return ECMD_OK;

    const gp = pray_state();
    // C: if (wizard && gp.p_type >= 0) Force the gods to be pleased?
    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (wizard && (gp.p_type | 0) >= 0) {
        // C: YN() when ParanoidPray (no do-again); else y_n() — both yn/'n'
        const forceOk = (await yn_function(
            'Force the gods to be pleased?', 'yn', 'n',
        )) === 'y';
        if (forceOk) {
            u.ublesscnt = 0;
            if ((u.uluck | 0) < 0) u.uluck = 0;
            if (!u.ualign) u.ualign = { type: 0, record: 0 };
            if ((u.ualign.record | 0) <= 0) u.ualign.record = 1;
            u.ugangr = 0;
            if ((gp.p_type | 0) < 2) gp.p_type = 3;
        }
    }

    nomul(-3);
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    if (gp.p_type === 3 && !Inhell()) {
        if (!Blind()) {
            await pline('You are surrounded by a shimmering light.');
        }
        u.uinvulnerable = true;
    }

    return ECMD_TIME;
}

/**
 * C ref: pray.c dosacrifice (#offer).
 * Branch envelope: not-on-altar / impaired early returns (ECMD_OK, 0 RNG).
 * floorfood sacrifice / amulet / corpse / nothing_happens deferred.
 */
export async function dosacrifice() {
    const u = game.u || {};
    if (!on_altar() || u.uswallow) {
        const prep = (u.Levitation || u.Flying) ? 'over' : 'on';
        await pline(`You are not ${prep} an altar.`);
        return ECMD_OK;
    }
    if (u.Confusion || u.Stunned) {
        await pline('You are too impaired to perform the rite.');
        return ECMD_OK;
    }
    // floorfood("sacrifice", 1) + offering body deferred (C-JS-MAP)
    return ECMD_OK;
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C: pray.c halu_gname — non-Hallu → align_gname; Hallu RNG deferred. */
function halu_gname(alignment) {
    if (Hallucination()) {
        // randrole + rn2_on_display_rng pantheon pick deferred
        return align_gname(game.urole, alignment);
    }
    return align_gname(game.urole, alignment);
}

/** Squared distance hero→mon (monmove.c mdistu). */
function mdistu(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy;
}

/**
 * C ref: zap.c resist — oclass '\0' → alev = ulevel (doturn uses this).
 * Named omission: TELL/NOTELL shield pline polish (RNG-identical).
 */
function resist(mtmp, _oclass, _damage, _tell) {
    const alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

function Confusion() {
    const u = game.u || {};
    return !!(u.Confusion || (u.HConfusion | 0));
}

/**
 * C ref: pray.c maybe_turn_mon_iter — #turn undead/demon victim.
 * @param {object} mtmp
 * @param {number} turn_undead_range squared bolt range
 * @param {{ cnt: number }} msgCnt shared turn_undead_msg_cnt
 */
async function maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (!couldsee(mtmp.mx | 0, mtmp.my | 0)
        || mdistu(mtmp) > turn_undead_range) {
        return;
    }
    const u = game.u || {};
    const data = mtmp.data;
    if (mtmp.mpeaceful
        || !(mon_is_undead(data) || is_vampshifter(mtmp)
            || (mon_is_demon(data)
                && ((u.ulevel | 0) > Math.trunc(MAXULEV / 2))))) {
        return;
    }
    mtmp.msleeping = 0;
    if (Confusion()) {
        if (!(msgCnt.cnt++)) {
            await pline('Unfortunately, your voice falters.');
        }
        mtmp.mflee = 0;
        mtmp.mfrozen = 0;
        mtmp.mcanmove = 1;
        return;
    }
    if (resist(mtmp, '\0', 0, TELL)) return;

    let xlev = 6;
    const mlet = data?.mlet;
    // C: intentional fall-through ladder lich→zombie
    switch (mlet) {
    case 'S_LICH':
        xlev += 2;
        // falls through
    case 'S_GHOST':
        xlev += 2;
        // falls through
    case 'S_VAMPIRE':
        xlev += 2;
        // falls through
    case 'S_WRAITH':
        xlev += 2;
        // falls through
    case 'S_MUMMY':
        xlev += 2;
        // falls through
    case 'S_ZOMBIE':
        if ((u.ulevel | 0) >= xlev && !resist(mtmp, '\0', 0, NOTELL)) {
            if ((u.ualign?.type ?? 0) === A_CHAOTIC) {
                mtmp.mpeaceful = 1;
                set_malign(mtmp);
            } else {
                await killed(mtmp);
            }
            return;
        }
        // else flee — fall through
        // falls through
    default:
        await monflee(mtmp, 0, false, true);
        break;
    }
}

/**
 * C ref: pray.c doturn — #turn undead (Knight / Cleric).
 * Named omissions: known_spell(SPE_TURN_UNDEAD)/spelleffects for other
 * roles; Hallu halu_gname pantheon RNG; resist TELL pline.
 */
export async function doturn() {
    const u = game.u || (game.u = {});

    if (!Role_if(PM_CLERIC) && !Role_if(PM_KNIGHT)) {
        // known_spell / spelleffects deferred
        await pline("You don't know how to turn undead!");
        return ECMD_OK;
    }
    if (!(u.uconduct)) u.uconduct = {};
    if (!(u.uconduct.gnostic++)) {
        livelog_printf(LL_CONDUCT, 'rejected atheism by turning undead');
    }

    const Gname = halu_gname(u.ualign?.type ?? 0);

    if (!can_chant()) {
        const how = u.Strangled ? 'not able to call' : 'incapable of calling';
        await pline(`You are ${how} upon ${Gname} to turn aside evilness.`);
        return (u.uconduct.gnostic | 0) === 1 ? ECMD_TIME : ECMD_OK;
    }

    const youData = game.youmonst?.data;
    if (((u.ualign?.type ?? 0) !== A_CHAOTIC
            && (mon_is_demon(youData) || mon_is_undead(youData)
                || is_vampshifter(game.youmonst)))
        || (u.ugangr | 0) > 6) {
        await pline(`For some reason, ${Gname} seems to ignore you.`);
        aggravate();
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (Inhell()) {
        const wont = Gname === MOLOCH ? "won't" : "can't";
        await pline(`Since you are in Gehennom, ${Gname} ${wont} help you.`);
        aggravate();
        return ECMD_TIME;
    }

    await pline(`Calling upon ${Gname}, you chant an arcane formula.`);
    exercise(A_WIS, true);

    let turn_undead_range = BOLT_LIM + Math.trunc((u.ulevel | 0) / 5);
    turn_undead_range *= turn_undead_range;
    const msgCnt = { cnt: 0 };
    for (const mtmp of game.fmon || []) {
        await maybe_turn_mon_iter(mtmp, turn_undead_range, msgCnt);
    }

    nomul(-(5 - Math.trunc(((u.ulevel | 0) - 1) / 6)));
    game.multi_reason = 'trying to turn the monsters';
    game.nomovemsg = 'You can move again.';
    return ECMD_TIME;
}
