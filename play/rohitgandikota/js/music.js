// music.js -- musical instruments and their effects.
// C ref: src/music.c

import { record_achievement } from './insight.js';
import { find_drawbridge, open_drawbridge, close_drawbridge, is_drawbridge_wall } from './dbridge.js';
import { Is_stronghold, ACH_TUNE, DRAWBRIDGE_DOWN, IS_DRAWBRIDGE, plur } from './const.js';
import { mungspaces, highc, isok } from './hacklib.js';
import { getlin } from './cmd.js';
import { thesimpleoname, the, xname } from './objnam.js';
import { can_blow } from './mondata.js';
import { You_cant, You_hear } from './pline.js';
import { Underwater } from './youprop.js';
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

/* include/youprop.h */
const Stunned = () => !!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED);
const Confusion = () => !!(game.u.intrinsic?.HConfusion
                           || game.u.uprops?.CONFUSION);

// src/music.c:759 do_play_instrument()
export async function do_play_instrument(instr) {
    let buf = '', c = 'y';
    let x, y;
    let ok;

    if (Underwater()) {
        await You_cant('play music underwater!');
        return ECMD_OK;
    } else if ((instr.otyp === ONAMES.WOODEN_FLUTE || instr.otyp === ONAMES.MAGIC_FLUTE
                || instr.otyp === ONAMES.TOOLED_HORN || instr.otyp === ONAMES.FROST_HORN
                || instr.otyp === ONAMES.FIRE_HORN || instr.otyp === ONAMES.BUGLE)
               && !can_blow(game.youmonst)) {
        await You(`are incapable of playing ${thesimpleoname(instr)}.`);
        return ECMD_OK;
    }
    if (instr.otyp !== ONAMES.LEATHER_DRUM && instr.otyp !== ONAMES.DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = await tty_yn_function('Improvise?', 'ynq', 'q');
        if (c === 'q') {
            await pline('Never mind.'); /* goto nevermind */
            return ECMD_OK;
        }
    }

    if (c !== 'n')
        return await do_improvisation(instr);

    if (game.u.uevent?.uheard_tune === 2)
        c = await tty_yn_function('Play the passtune?', 'ynq', 'q');
    if (c === 'q') {
        await pline('Never mind.'); /* goto nevermind */
        return ECMD_OK;
    } else if (c === 'y') {
        buf = game.castle_tune;
    } else {
        buf = await getlin('What tune are you playing? [5 notes, A-G]');
        buf = mungspaces(buf);
        if (buf.charAt(0) === '\x1b') {
            await pline('Never mind.'); /* goto nevermind */
            return ECMD_OK;
        }

        /* convert to uppercase and change any "H" to the expected "B" */
        buf = [...buf].map((ch) => {
            ch = highc(ch);
            return (ch === 'H') ? 'B' : ch;
        }).join('');
    }

    await You(!Deaf() ? `extract a strange sound from ${the(xname(instr))}!`
                      : `can feel ${the(xname(instr))} emitting vibrations.`);
    /* Hero_playnotes(obj_to_instr(instr), buf, 50): empty in this build */

    /* Check if there was the Stronghold drawbridge near
     * and if the tune conforms to what we're waiting for.
     */
    if (Is_stronghold(game.u.uz)) {
        exercise(A_WIS, true); /* just for trying */
        if (buf === game.castle_tune) {
            /* Search for the drawbridge */
            for (y = game.u.uy - 1; y <= game.u.uy + 1; y++)
                for (x = game.u.ux - 1; x <= game.u.ux + 1; x++) {
                    if (!isok(x, y))
                        continue;
                    const cc = { x, y };
                    if (find_drawbridge(cc)) {
                        /* tune now fully known */
                        (game.u.uevent ||= {}).uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                        if (game.level.at(cc.x, cc.y).typ === DRAWBRIDGE_DOWN)
                            await close_drawbridge(cc.x, cc.y);
                        else
                            await open_drawbridge(cc.x, cc.y);
                        return ECMD_TIME;
                    }
                }
        } else if (!Deaf()) {
            if ((game.u.uevent?.uheard_tune | 0) < 1)
                (game.u.uevent ||= {}).uheard_tune = 1;
            /* Okay, it wasn't the right tune, but perhaps
             * we can give the player some hints like in the
             * Mastermind game */
            ok = false;
            for (y = game.u.uy - 1; y <= game.u.uy + 1 && !ok; y++)
                for (x = game.u.ux - 1; x <= game.u.ux + 1 && !ok; x++)
                    if (isok(x, y))
                        if (IS_DRAWBRIDGE(game.level.at(x, y).typ)
                            || is_drawbridge_wall(x, y) >= 0)
                            ok = true;
            if (ok) { /* There is a drawbridge near */
                let tumblers, gears;
                const matched = [false, false, false, false, false];

                tumblers = gears = 0;

                for (x = 0; x < buf.length; x++)
                    if (x < 5) {
                        if (buf[x] === game.castle_tune[x]) {
                            gears++;
                            matched[x] = true;
                        } else {
                            for (y = 0; y < 5; y++)
                                if (!matched[y] && buf[x] === game.castle_tune[y]
                                    && buf[y] !== game.castle_tune[y]) {
                                    tumblers++;
                                    matched[y] = true;
                                    break;
                                }
                        }
                    }
                if (tumblers) {
                    if (gears) {
                        /* Soundeffect(se_tumbler_click, 50); Soundeffect(se_gear_turn, 50) */
                        await You_hear(`${tumblers} tumbler${plur(tumblers)} click and ${gears} gear${plur(gears)} turn.`);
                    } else {
                        /* Soundeffect(se_tumbler_click, 50) */
                        await You_hear(`${tumblers} tumbler${plur(tumblers)} click.`);
                    }
                } else if (gears) {
                    await You_hear(`${gears} gear${plur(gears)} turn.`);
                    /* could only get `gears == 5' by playing five
                       correct notes followed by excess; otherwise,
                       tune would have matched above */
                    if (gears === 5) {
                        (game.u.uevent ||= {}).uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                    }
                }
            }
        }
    }
    return ECMD_TIME;
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
