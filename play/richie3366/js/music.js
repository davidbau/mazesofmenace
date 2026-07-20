// music.js — Musical instruments (apply → do_play_instrument).
// C ref: music.c do_play_instrument / do_improvisation / awaken_monsters.
//
// Branch envelope this iteration: LEATHER_DRUM improvisation (non-mundane
// deafening row + awaken_scare/resist). Named omissions: passtune /
// getlin tune / drawbridge; Hero_playnotes audio; charm_snakes /
// put_monsters_to_sleep / calm_nymphs / charm_monsters / do_earthquake /
// awaken_soldiers bodies; fire/frost horn ubuzz; consume_obj_charge polish;
// onscary(0,0) auditory → monflee; can_blow poly;
// mundane drum ROLL_FROM(beats) riffs.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline } from './display.js';
import { yn_function } from './getline.js';
import { objectNames, TOOL_CLASS, objects } from './objects.js';
import { ECMD_OK, ECMD_TIME, TIMEOUT, STRAT_WAITMASK, NOTELL,
    M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { A_WIS, exercise } from './attrib.js';
import { cxname, an } from './objnam.js';
import { mindless, G_UNIQ } from './monsters.js';
import { dist2 } from './hacklib.js';
import { canseemon } from './display.js';
import { Monnam } from './do_name.js';

const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const TOOLED_HORN = objectNames.indexOf('TOOLED_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const WOODEN_HARP = objectNames.indexOf('WOODEN_HARP');
const MAGIC_HARP = objectNames.indexOf('MAGIC_HARP');
const BUGLE = objectNames.indexOf('BUGLE');
const LEATHER_DRUM = objectNames.indexOf('LEATHER_DRUM');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');

const PLAY_NORMAL = 0x00;
const PLAY_STUNNED = 0x01;
const PLAY_CONFUSED = 0x02;
const PLAY_HALLU = 0x04;

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
/** C music.c beats[] — mundane leather-drum riff nouns (ROLL_FROM). */
const BEATS = [
    'stepper', 'one drop', 'slow two', 'triple stroke roll',
    'double shuffle', 'half-time shuffle', 'second line', 'train',
];

function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

function Stunned() {
    const u = game.u || {};
    return !!((u.HStun | 0) || u.Stunned);
}

function Confusion() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}

function Hallucination() {
    const u = game.u || {};
    return !!((u.HHallucination | 0) || u.Hallucination);
}

/** C ref: objnam.c yname — invent → "your ", else "the ". */
function yname(obj) {
    const carried = (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/** C potion.c incr_itimeout — TIMEOUT field only. */
function incr_itimeout_HDeaf(incr) {
    const u = game.u || (game.u = {});
    const cur = u.HDeaf | 0;
    const next = ((cur & TIMEOUT) + (incr | 0)) & TIMEOUT;
    u.HDeaf = (cur & ~TIMEOUT) | next;
}

/**
 * C ref: zap.c resist — TOOL_CLASS alev=10 (instrument); tell/HP deferred.
 */
function resist(mtmp, oclass, _damage, _tell) {
    let alev;
    if (oclass === TOOL_CLASS) alev = 10;
    else alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

/** C ref: music.c unique_corpstat gate via G_UNIQ (long-worm-tail polish deferred). */
function unique_corpstat(ptr) {
    return !!((ptr?.geno ?? 0) & G_UNIQ);
}

/** C ref: monmove.c / muse.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    const u = game.u;
    return dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
}

/**
 * C ref: monmove.c onscary — <0,0> is auditory (musical) scare → TRUE
 * after wiz/lminion/angel/rider gate. Magical Elbereth/scroll arms deferred.
 */
function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    // iswiz / is_lminion / PM_ANGEL / is_rider deferred → rare immunities
    if (mtmp.iswiz) return false;
    if (auditory_scare) return true;
    return false;
}

/**
 * C ref: monmove.c monflee(fleetime=0, first=FALSE, fleemsg) — set mflee;
 * flees_light rn2(10)/verbalize and Vrock gas deferred.
 */
async function monflee(mtmp, fleetime, first, fleemsg) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (!first || !mtmp.mflee) {
        if (!fleetime) mtmp.mfleetim = 0;
        else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += mtmp.mfleetim | 0;
            if (fleetime === 1) fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg) {
            const ap = mtmp.m_ap_type | 0;
            if (canseemon(mtmp) && ap !== M_AP_FURNITURE && ap !== M_AP_OBJECT) {
                // flees_light / immobile flinch deferred
                await pline(`${Monnam(mtmp)} turns to flee.`);
            }
        }
        mtmp.mflee = 1;
    }
    // C: monflee always mon_track_clear — local music copy
    if (mtmp.mtrack) {
        for (let j = 0; j < mtmp.mtrack.length; j++) {
            mtmp.mtrack[j] = { x: 0, y: 0 };
        }
    }
}

/**
 * C ref: music.c awaken_scare — wake; scary → resist(TOOL) then onscary/flee.
 */
async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    if (!unique_corpstat(mtmp.data)
        && ((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0) {
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    } else if (scary
        && !mindless(mtmp.data)
        && !resist(mtmp, TOOL_CLASS, 0, NOTELL)
        && onscary(0, 0, mtmp)) {
        await monflee(mtmp, 0, false, true);
    }
}

/** C ref: music.c awaken_monsters */
async function awaken_monsters(distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mhp <= 0) continue;
        const distm = mdistu(mtmp);
        if (distm < distance) {
            await awaken_scare(mtmp, distm < Math.floor(distance / 3));
        }
    }
}

/**
 * C ref: music.c improvised_notes — rnd(SIZE(jingle)-1) notes via ROLL_FROM.
 * svc.context.jingle[6]; Unchanging keeps prior tune.
 */
function improvised_notes(sameRef) {
    if (!game.context) game.context = {};
    if (!game.context.jingle) game.context.jingle = '';
    const unchanging = !!(game.u?.Unchanging);
    if (!(unchanging && game.context.jingle.length > 0)) {
        const notecount = rnd(5); // SIZE(jingle)-1 == 5 → 1..5
        let s = '';
        for (let i = 0; i < notecount; ++i) {
            s += NOTES[rn2(NOTES.length)];
        }
        game.context.jingle = s;
        sameRef.v = false;
    } else {
        sameRef.v = true;
    }
    return game.context.jingle;
}

/** C ref: music.c Hero_playnotes — tty/sound deferred (no RNG). */
function Hero_playnotes(_instr, _notes, _vol) {
    /* no-op */
}

/**
 * C ref: music.c do_improvisation.
 * @returns {number} 2 on success (truthy → ECMD_TIME), 0 on impossible
 */
async function do_improvisation(instr) {
    const u = game.u;
    let do_spec = !(Stunned() || Confusion());
    let mundane = false;
    // C: itmp = *instr with oextra cleared — only otyp mutated for mundane
    let itmp_otyp = instr.otyp;

    if (!do_spec || (instr.spe | 0) <= 0) {
        while (objects()[itmp_otyp]?.oc_magic) {
            itmp_otyp -= 1;
            mundane = true;
        }
    }

    let mode = PLAY_NORMAL;
    if (Stunned()) mode |= PLAY_STUNNED;
    if (Confusion()) mode |= PLAY_CONFUSED;
    if (Hallucination()) mode |= PLAY_HALLU;

    if (!rn2(2)) {
        if (mode === (PLAY_STUNNED | PLAY_CONFUSED)) {
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
        }
        if (mode & PLAY_HALLU) mode = PLAY_HALLU;
    }

    switch (mode) {
    case PLAY_NORMAL:
        await pline(`You start playing ${yname(instr)}.`);
        break;
    case PLAY_STUNNED:
        if (!Deaf()) await pline('You radiate an obnoxious droning sound.');
        else await pline('You feel a monotonous vibration.');
        break;
    case PLAY_CONFUSED:
        if (!Deaf()) await pline('You generate a raucous noise.');
        else await pline('You feel a jarring vibration.');
        break;
    case PLAY_HALLU:
        await pline('You disseminate a kaleidoscopic display of floating butterflies.');
        break;
    default:
        await pline('What you perform is quite far from music...');
        break;
    }

    const same = { v: false };
    const improvisation = improvised_notes(same);
    const same_old_song = same.v;

    switch (itmp_otyp) {
    case LEATHER_DRUM:
        if (!mundane) {
            if (!Deaf()) {
                await pline(`You beat a ${same_old_song ? 'familiar ' : ''}deafening row!`);
                Hero_playnotes(itmp_otyp, 'CCC', 100);
                incr_itimeout_HDeaf(rn1(20, 30));
            } else {
                await pline('You pound on the drum.');
            }
            exercise(A_WIS, false);
        } else {
            // C: rn2(2) ? "butcher" : rn2(2) ? "manage" : "pull off"
            const verb = rn2(2) ? 'butcher' : rn2(2) ? 'manage' : 'pull off';
            await pline(`You ${verb} ${an(BEATS[rn2(BEATS.length)])}.`);
            Hero_playnotes(itmp_otyp, improvisation, 50);
        }
        await awaken_monsters((u.ulevel | 0) * (mundane ? 5 : 40));
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
        break;

    case TOOLED_HORN:
        if (!Deaf()) {
            await pline(`You produce a frightful, grave${same_old_song ? ', yet familiar,' : ''} sound.`);
        } else {
            await pline('You blow into the horn.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 80);
        await awaken_monsters((u.ulevel | 0) * 30);
        exercise(A_WIS, false);
        break;

    case BUGLE:
        if (!Deaf()) {
            await pline(`You extract a loud${same_old_song ? ', familiar' : ''} noise from ${yname(instr)}.`);
        } else {
            await pline('You blow into the bugle.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 80);
        // awaken_soldiers deferred → awaken nearby only
        await awaken_monsters((u.ulevel | 0) * 30);
        exercise(A_WIS, false);
        break;

    case WOODEN_FLUTE:
    case MAGIC_FLUTE:
    case WOODEN_HARP:
    case MAGIC_HARP:
    case FIRE_HORN:
    case FROST_HORN:
    case DRUM_OF_EARTHQUAKE:
        // Shared prefix RNG already consumed; effect bodies deferred.
        await pline(`You play ${yname(instr)}.`);
        break;

    default:
        await pline(`What a weird instrument (${instr.otyp})!`);
        return 0;
    }
    void improvisation;
    return 2;
}

/**
 * C ref: music.c do_play_instrument.
 * @returns {number} ECMD_TIME | ECMD_OK
 */
export async function do_play_instrument(instr) {
    const u = game.u;
    if (u?.Underwater) {
        await pline("You can't play music underwater!");
        return ECMD_OK;
    }
    // can_blow gate for wind instruments deferred → allow

    let c = 'y';
    if (instr.otyp !== LEATHER_DRUM && instr.otyp !== DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = await yn_function('Improvise?', 'ynq', 'y');
        if (c === 'q') {
            await pline('Never mind.');
            return ECMD_OK;
        }
    }

    if (c !== 'n') {
        const took = await do_improvisation(instr);
        return took ? ECMD_TIME : ECMD_OK;
    }

    // Passtune / getlin tune / drawbridge deferred
    await pline('You decide not to play a specific tune.');
    return ECMD_OK;
}
