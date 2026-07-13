// pray.js — Prayer / altar gods (partial).
// C ref: pray.c — can_pray, dopray, prayer_done, gods_upset, angrygods,
// water_prayer, on_altar / a_align helpers; dosacrifice (#offer).
//
// Branch envelope: ParanoidPray yn confirm (default on) + noninteractive
// #pray with ublesscnt-too-soon (p_type 0) → nomul(-3)/afternmv →
// prayer_done rnz(250)+change_luck+gods_upset → angrygods cases 0–3
// (displeased / godvoice+relearn) + trailing rnz(300); #offer not-on-altar.
// Named omissions: full in_trouble body; ParanoidConfirm "yes" path /
// wizard force; angrygods cases 4+ (curse/minion/zap); pleased / crown /
// fix troubles; p_type -2/-1/1/2/3 outcome bodies beyond water_prayer scan;
// pray_revive; floorfood sacrifice / #turn; livelog; is_demon/is_undead
// poly paths; full losexp (adjabil/resists_drli/Upolyd).

import { game } from './gstate.js';
import { rn2, rnz } from './rng.js';
import { pline } from './display.js';
import { nomul } from './hack.js';
import { A_WIS, change_luck, adjattrib } from './attrib.js';
import { align_gname } from './roles.js';
import { objects_at } from './mkobj.js';
import { yn_function } from './getline.js';
import {
    IS_ALTAR, Amask2align, AM_MASK, A_NONE, A_LAWFUL, A_NEUTRAL,
    GEHENNOM, ECMD_OK, ECMD_TIME, PARANOID_PRAY,
} from './const.js';
import { POT_WATER, POTION_CLASS } from './objects.js';

const STRIDENT = 4; // pray.c
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

/** C: pray.c a_align — altarmask overlays rm.flags in C; JS mkaltar uses flags */
function a_align(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return A_NONE;
    const mask = (loc.altarmask != null ? loc.altarmask : loc.flags) | 0;
    return Amask2align(mask & AM_MASK);
}

/**
 * C ref: pray.c in_trouble — major/minor trouble ranking.
 * Stub: return 0 (no trouble). With ublesscnt=300, any trouble still
 * yields p_type 0 ("too soon"); poly/undead overrides are separate.
 */
function in_trouble() {
    return 0;
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
        // adjabil / livelog deferred
    } else {
        u.uexp = 0;
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
        // C: ugod_is_angry() — approx via negative record
        await pline(
            `"Thou ${strayed ? 'hast strayed from the path' : 'art arrogant'}, ${mortal}."`,
        );
        await pline('Thou must relearn thy lessons!');
        adjattrib(A_WIS, -1, false);
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
 * C ref: pray.c prayer_done — afternmv after nomul(-3).
 * Ported: p_type 0 (too soon) full path; other p_types partial/stub.
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
        }
        // else pleased() deferred
    } else {
        // p_type 3 coaligned — water_prayer/pray_revive/pleased deferred
        if (on_altar()) water_prayer(true);
    }
    return 1;
}

/**
 * C ref: pray.c dopray — #pray
 * ParanoidPray (default) → paranoid_query(ParanoidConfirm, …);
 * wizard Force-the-gods omitted.
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
    u.uconduct.gnostic = (u.uconduct.gnostic | 0) + 1;

    if (!(await can_pray(true))) return ECMD_OK;

    nomul(-3);
    game.multi_reason = 'praying';
    game.nomovemsg = 'You finish your prayer.';
    game.afternmv = prayer_done;

    const gp = pray_state();
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
