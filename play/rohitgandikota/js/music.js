// music.js -- musical instruments and their effects.
// C ref: src/music.c

import { Norep } from './pline.js';
import { dist2 } from './hacklib.js';
import { MFLAGS, PMNAMES } from './monst_data.js';
import { game } from './gstate.js';
import { A_WIS, ECMD_OK, ECMD_TIME, G_UNIQ, STRAT_WAITMASK } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { rn2, rnd, rn1 } from './rng.js';
import { You } from './pline.js';
import { pline, canseemon } from './display.js';
import { yname } from './objnam.js';
import { Deaf, Hallucination } from './youprop.js';
import { tty_yn_function } from './tty/topl.js';
import { exercise } from './attrib.js';
import { mdistu, monflee, onscary } from './monmove.js';
import { mindless } from './mondata.js';
import { DEADMONSTER } from './monst.js';
import { Monnam } from './do_name.js';

function note_unported_music(what) {
    (game.unported ||= new Set()).add('music:' + what);
}

// src/music.c:738 improvised_notes(). The five-character context belongs to
// the game because save and restore preserve the last tune.
function improvised_notes() {
    const context = (game.context ||= {});
    if (game.u.uprops?.UNCHANGING && context.jingle)
        return { notes: game.context.jingle, same: true };

    const notes = 'ABCDEFG';
    const count = rnd(5);
    let tune = '';
    for (let i = 0; i < count; ++i)
        tune += notes[rn2(notes.length)];
    context.jingle = tune;
    return { notes: tune, same: false };
}

async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;

    const unique = !!(game.mons[mtmp.mnum].geno & G_UNIQ);
    if (!unique && ((mtmp.mstrategy | 0) & STRAT_WAITMASK)) {
        mtmp.mstrategy &= ~STRAT_WAITMASK;
        return;
    }
    if (!scary || mindless(game.mons[mtmp.mnum]))
        return;

    const { resist } = await import('./zap.js');
    if (resist(mtmp, OCLASSES.TOOL_CLASS, 0, false) || !onscary(0, 0, mtmp))
        return;

    if (!mtmp.mflee && canseemon(mtmp))
        await pline(`${Monnam(mtmp)} turns to flee.`);
    monflee(mtmp, 0, false, false);
}

// src/music.c:67 awaken_monsters(). level.monsters is the port's fmon chain,
// kept newest first by makemon().
async function awaken_monsters(distance) {
    for (const mtmp of game.level.monsters || []) {
        if (DEADMONSTER(mtmp))
            continue;
        const distm = mdistu(mtmp);
        if (distm < distance)
            await awaken_scare(mtmp, distm < distance / 3);
    }
}

async function start_improvisation(instr) {
    const stunned = !!game.u.uprops?.STUNNED;
    const confused = !!game.u.uprops?.CONFUSION;
    const hallucinating = Hallucination();
    let mode = (stunned ? 1 : 0) | (confused ? 2 : 0)
             | (hallucinating ? 4 : 0);

    if (!rn2(2)) {
        if (mode === 3)
            mode = !rn2(2) ? 1 : 2;
        if (mode & 4)
            mode = 4;
    }

    switch (mode) {
    case 0:
        await You(`start playing ${yname(instr)}.`);
        break;
    case 1:
        await You(Deaf() ? 'feel a monotonous vibration.'
                         : 'radiate an obnoxious droning sound.');
        break;
    case 2:
        await You(Deaf() ? 'feel a jarring vibration.'
                         : 'generate a raucous noise.');
        break;
    case 4:
        await You('disseminate a kaleidoscopic display of floating butterflies.');
        break;
    default:
        await pline('What you perform is quite far from music...');
        break;
    }
}

// src/music.c:506 do_improvisation(). The ordinary leather drum path is
// complete. Other instruments retain their correct entry prompt and note
// draws, then record the effect that still needs its own subsystem.
async function do_improvisation(instr) {
    await start_improvisation(instr);
    const { same } = improvised_notes();

    if (instr.otyp !== ONAMES.LEATHER_DRUM) {
        note_unported_music(`do_improvisation:${instr.otyp}`);
        return ECMD_TIME;
    }

    if (!Deaf()) {
        await You(`beat a ${same ? 'familiar ' : ''}deafening row!`);
        const deaf_duration = rn1(20, 30);
        exercise(A_WIS, false);
        await awaken_monsters(game.u.ulevel * 40);
        /* C dirties the status only after awaken_monsters. Deferring this
           assignment keeps the old status under the intervening --More--. */
        const intr = (game.u.intrinsic ||= {});
        intr.HDeaf = (intr.HDeaf | 0) + deaf_duration;
    } else {
        await You('pound on the drum.');
        exercise(A_WIS, false);
        await awaken_monsters(game.u.ulevel * 40);
    }
    (game.disp ||= {}).botl = true;
    return ECMD_TIME;
}

// src/music.c:755 do_play_instrument(). Drums always improvise. Other
// instruments ask first when the hero is unimpaired.
export async function do_play_instrument(instr) {
    let choice = 'y';
    const impaired = !!(game.u.uprops?.STUNNED || game.u.uprops?.CONFUSION
                        || Hallucination());

    if (instr.otyp !== ONAMES.LEATHER_DRUM
        && instr.otyp !== ONAMES.DRUM_OF_EARTHQUAKE && !impaired) {
        choice = await tty_yn_function('Improvise?', 'ynq', 'q');
        if (choice === 'q')
            return ECMD_OK;
    }
    if (choice !== 'n')
        return await do_improvisation(instr);

    note_unported_music('play_tune');
    return ECMD_OK;
}

/* include/mondata.h is_mercenary() */
const is_mercenary_m = (ptr) => (ptr.mflags2 & MFLAGS.M2_MERC) !== 0;

// src/music.c:162 awaken_soldiers(), a bugle readies every soldier and
// wakes (or scares) everything else within earshot.
export async function awaken_soldiers(bugler /* monster that played instrument */) {
    let distance, distm;

    /* distance of affected non-soldier monsters to bugler */
    distance = ((bugler === game.youmonst) ? game.u.ulevel
                                           : bugler.data.mlevel) * 30;

    for (const mtmp of (game.level?.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if (is_mercenary_m(mtmp.data) && mtmp.data.pmidx !== PMNAMES.PM_GUARD) {
            if (!mtmp.mtame)
                mtmp.mpeaceful = 0;
            mtmp.msleeping = mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} is now ready for battle!`);
            else if (!Deaf())
                await Norep('You hear the rattle of battle gear being readied.'); /* Deaf-aware */
        } else if ((distm = ((bugler === game.youmonst)
                                 ? mdistu(mtmp)
                                 : dist2(bugler.mx, bugler.my, mtmp.mx,
                                         mtmp.my))) < distance) {
            await awaken_scare(mtmp, (distm < distance / 3));
        }
    }
}
