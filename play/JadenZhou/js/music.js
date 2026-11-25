// music.js -- port of NetHack 5.0 music.c: playing musical instruments
// (do_play_instrument(), do_improvisation() and the effects they need).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, You, You_feel, You_cant } from './display.js';
import { yname, Tobjnam, Yname2, an } from './objnam.js';
import { thesimpleoname } from './iactions.js';
import { exercise } from './attrib.js';
import { incr_itimeout } from './potion.js';
import { resist } from './zap.js';
import { onscary, monflee } from './monmove.js';
import { dist2, mdistu } from './hacklib.js';
import { tty_yn_function } from './wintty.js';
import { ACURR } from './attrib.js';
import * as O from './objects.js';
import { objects, TOOL_CLASS } from './objects.js';
import { G_UNIQ, M1_MINDLESS, M1_BREATHLESS, M1_NOHEAD, MZ_SMALL, MS_SILENT,
         MS_BUZZ, S_EEL } from './monsters.js';
import { STUNNED, CONFUSION, DEAF, STRANGLED, UNCHANGING, STRAT_WAITMASK,
         NOTELL, A_DEX, A_WIS, ECMD_OK, ECMD_TIME } from './const.js';
import {
    Stunned, Confusion, Deaf, Strangled, Unchanging, Underwater, Hallucination
} from './youprop.js';
import { consume_obj_charge as consume_obj_charge_mu } from './apply.js';
import { sleep_monst as sleep_monst_mu } from './trap.js';
import { slept_monst as slept_monst_mu } from './mhitm.js';
import { tamedog as tamedog_mu } from './dog.js';
import { d as d_mu } from './rng.js';
import { NOTELL as NOTELL_MU } from './const.js';
import { mindless, unique_corpstat, can_blow } from './mondata.js';

// C ref: music.c awaken_scare()
/* wake up monster, possibly scare it */
async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!unique_corpstat(mtmp.data)
        && (mtmp.mstrategy & STRAT_WAITMASK) !== 0)
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    else if (scary
             && !mindless(mtmp.data)
             && !resist(mtmp, TOOL_CLASS, 0, NOTELL)
             /* some monsters are immune */
             && onscary(0, 0, mtmp))
        await monflee(mtmp, 0, false, true);
}

// C ref: music.c awaken_monsters()
/*
 * Wake every monster in range...
 */
async function awaken_monsters(distance) {
    let distm;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            continue;
        if ((distm = mdistu(mtmp)) < distance)
            await awaken_scare(mtmp, (distm < Math.trunc(distance / 3)));
    }
}

const beats = [
    "stepper", "one drop", "slow two", "triple stroke roll",
    "double shuffle", "half-time shuffle", "second line", "train"
];

const PLAY_NORMAL = 0x00;
const PLAY_STUNNED = 0x01;
const PLAY_CONFUSED = 0x02;
const PLAY_HALLU = 0x04;

// C ref: music.c do_improvisation()
/*
 * The player is trying to extract something from his/her instrument.
 */
async function do_improvisation(instr) {
    const u = game.u;
    let mode, do_spec = !(Stunned() || Confusion()) ? 1 : 0;
    let mundane = false;
    const same_old_song = { val: false };
    let itmp_otyp = instr.otyp;

    /* if won't yield special effect, make sound of mundane counterpart */
    if (!do_spec || (instr.spe || 0) <= 0)
        while (objects[itmp_otyp].oc_magic) {
            itmp_otyp -= 1;
            mundane = true;
        }

    mode = PLAY_NORMAL;
    if (Stunned())
        mode |= PLAY_STUNNED;
    if (Confusion())
        mode |= PLAY_CONFUSED;
    if (Hallucination())
        mode |= PLAY_HALLU;

    if (!rn2(2)) {
        /*
         * TEMPORARY?  for multiple impairments, don't always
         * give the generic "it's far from music" message.
         */
        /* remove if STUNNED+CONFUSED ever gets its own message below */
        if (mode === (PLAY_STUNNED | PLAY_CONFUSED))
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
        /* likewise for stunned and/or confused combined with hallucination */
        if (mode & PLAY_HALLU)
            mode = PLAY_HALLU;
    }

    /* 3.6.3: most of these gave "You produce <blah>" and then many of
       the instrument-specific messages below which immediately follow
       also gave "You produce <something>."  That looked strange so we
       now use a different verb here */
    switch (mode) {
    case PLAY_NORMAL:
        await You(`start playing ${yname(instr)}.`);
        break;
    case PLAY_STUNNED:
        if (!Deaf())
            await You("radiate an obnoxious droning sound.");
        else
            await You_feel("a monotonous vibration.");
        break;
    case PLAY_CONFUSED:
        if (!Deaf())
            await You("generate a raucous noise.");
        else
            await You_feel("a jarring vibration.");
        break;
    case PLAY_HALLU:
        await You("disseminate a kaleidoscopic display of floating butterflies.");
        break;
    /* TODO? give some or all of these combinations their own feedback;
       hallucination ones should reference senses other than hearing... */
    default:
        await pline("What you perform is quite far from music...");
        break;
    }

    const improvisation = improvised_notes(same_old_song);
    void improvisation; /* Hero_playnotes(): sound only */

    switch (itmp_otyp) { /* note: itmp.otyp might differ from instr->otyp */
    case O.MAGIC_FLUTE: /* Make monster fall asleep */
        consume_obj_charge_mu(instr, true);

        await You(`${!Deaf() ? "" : "seem to "}produce ${
            Hallucination() ? "piped" : "soft"}${
            same_old_song.val ? ", familiar" : ""} music.`);
        /* Hero_playnotes(obj_to_instr(&itmp), improvisation, 50): sound only */
        await put_monsters_to_sleep(u.ulevel * 5);
        await exercise(A_DEX, true);
        break;
    case O.WOODEN_FLUTE: /* May charm snakes */
        do_spec &= (rn2(ACURR(A_DEX)) + u.ulevel > 25) ? 1 : 0;
        if (!Deaf())
            await pline(`${Tobjnam(instr, do_spec ? "trill" : "toot")}${
                same_old_song.val ? " a familiar tune" : ""}.`);
        else
            await You_feel(`${yname(instr)} ${do_spec ? "trill" : "toot"}.`);
        if (do_spec)
            throw new Error('do_improvisation(): charm_snakes() not ported yet');
        await exercise(A_DEX, true);
        break;
    case O.FIRE_HORN:  /* Idem wand of fire */
    case O.FROST_HORN: /* Idem wand of cold */
        throw new Error('do_improvisation(): fire/frost horn not ported yet');
    case O.TOOLED_HORN: /* Awaken or scare monsters */
        if (!Deaf())
            await You(`produce a frightful, grave${
                same_old_song.val ? ", yet familiar," : ""} sound.`);
        else
            await You("blow into the horn.");
        await awaken_monsters(u.ulevel * 30);
        await exercise(A_WIS, false);
        break;
    case O.BUGLE: /* Awaken & attract soldiers */
        throw new Error('do_improvisation(): awaken_soldiers() not ported yet');
    case O.MAGIC_HARP: /* Charm monsters */
        consume_obj_charge_mu(instr, true);

        if (!Deaf())
            await pline(`${Tobjnam(instr, "produce")} very attractive${
                same_old_song.val ? " and familiar" : ""} music.`);
        else
            await You_feel("very soothing vibrations.");
        /* Hero_playnotes(obj_to_instr(&itmp), improvisation, 50): sound only */
        await charm_monsters(Math.trunc((u.ulevel - 1) / 3) + 1);
        await exercise(A_DEX, true);
        break;
    case O.WOODEN_HARP: /* May calm Nymph */
        do_spec &= (rn2(ACURR(A_DEX)) + u.ulevel > 25) ? 1 : 0;
        if (!Deaf())
            await pline(`${Yname2(instr)} ${
                (do_spec && same_old_song.val)
                    ? "produces a familiar, lilting melody"
                    : (do_spec) ? "produces a lilting melody"
                        : (same_old_song.val) ? "twangs a familiar tune"
                            : "twangs"}.`);
        else
            await You_feel("soothing vibrations.");
        if (do_spec)
            throw new Error('do_improvisation(): calm_nymphs() not ported yet');
        await exercise(A_DEX, true);
        break;
    case O.DRUM_OF_EARTHQUAKE: /* create several pits */
        throw new Error('do_improvisation(): drum of earthquake (do_earthquake()) not ported yet');
    case O.LEATHER_DRUM: /* Awaken monsters */
        if (!mundane) {
            if (!Deaf()) {
                await You(`beat a ${same_old_song.val ? "familiar " : ""}deafening row!`);
                incr_itimeout(DEAF, rn1(20, 30));
            } else {
                await You("pound on the drum.");
            }
            await exercise(A_WIS, false);
        } else {
            /* TODO maybe: sound effects for these riffs */
            const verb = rn2(2) ? "butcher" : rn2(2) ? "manage" : "pull off";
            await You(`${verb} ${an(beats[rn2(beats.length)])}.`);
        }
        await awaken_monsters(u.ulevel * (mundane ? 5 : 40));
        game.disp_botl = true;
        break;
    default:
        /* impossible("What a weird instrument (%d)!", instr->otyp) */
        return 0;
    }
    return 2; /* That takes time */
}

// C ref: music.c improvised_notes()
function improvised_notes(same_as_last_time) {
    const notes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    /* target buffer has to be in svc.context, otherwise saving game
     * between improvised recitals would not be able to maintain
     * the same_as_last_time context. */
    const ctx = game.context;
    if (ctx.jingle === undefined)
        ctx.jingle = '';

    /* You can change your tune, usually */
    if (!(Unchanging() && ctx.jingle !== '')) {
        const notecount = rnd(6 - 1); /* SIZE(svc.context.jingle) - 1: 1 - 5 */
        let jingle = '';

        for (let i = 0; i < notecount; ++i)
            jingle += notes[rn2(notes.length)]; /* ROLL_FROM(notes) */
        ctx.jingle = jingle;
        same_as_last_time.val = false;
    } else {
        same_as_last_time.val = true;
    }
    return ctx.jingle;
}

// C ref: music.c do_play_instrument()
/*
 * So you want music...
 */
export async function do_play_instrument(instr) {
    let c = 'y';

    if (Underwater()) {
        await You_cant("play music underwater!");
        return ECMD_OK;
    } else if ((instr.otyp === O.WOODEN_FLUTE || instr.otyp === O.MAGIC_FLUTE
                || instr.otyp === O.TOOLED_HORN || instr.otyp === O.FROST_HORN
                || instr.otyp === O.FIRE_HORN || instr.otyp === O.BUGLE)
               && !can_blow(game.youmonst)) {
        await You(`are incapable of playing ${thesimpleoname(instr)}.`);
        return ECMD_OK;
    }
    if (instr.otyp !== O.LEATHER_DRUM && instr.otyp !== O.DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = await tty_yn_function("Improvise?", "ynq", 'q'); /* ynq() */
        if (c === 'q')
            return ECMD_OK; /* nevermind */
    }

    if (c !== 'n')
        return (await do_improvisation(instr)) ? ECMD_TIME : ECMD_OK;

    /* playing a tune (passtune, Mastermind hints at the Castle drawbridge) */
    throw new Error('do_play_instrument(): playing a tune not ported yet');
}

// C ref: music.c put_monsters_to_sleep()
/* Make monsters fall asleep.  Note that they may resist the spell. */
async function put_monsters_to_sleep(distance) {
    let mtmp;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            continue;
        if (mdistu(mtmp) < distance
            && sleep_monst_mu(mtmp, d_mu(10, 10), TOOL_CLASS)) {
            mtmp.msleeping = 1; /* 10d10 turns + wake_nearby to rouse */
            await slept_monst_mu(mtmp);
        }
    }
}

// C ref: music.c charm_monsters()
/* Charm monsters in range.  Note that they may resist the spell. */
async function charm_monsters(distance) {
    let mtmp, mtmp2;

    if (game.u.uswallow)
        distance = 0; /* only u.ustuck will be affected (u.usteed is Null
                       * since hero gets forcibly dismounted when engulfed) */

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            continue;

        if (mdistu(mtmp) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry
               one; do that even if mtmp resists in order to behave the same
               as a non-cursed scroll of taming or spell of charm monster */
            if (!resist(mtmp, TOOL_CLASS, 0, NOTELL_MU) || mtmp.isshk)
                await tamedog_mu(mtmp, null, true);
        }
    }
}
