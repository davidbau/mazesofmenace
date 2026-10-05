// music.js -- musical instruments and their effects.
// C ref: src/music.c

import { record_achievement } from './insight.js';
import { find_drawbridge, open_drawbridge, close_drawbridge, is_drawbridge_wall } from './dbridge.js';
import { Is_stronghold, ACH_TUNE, DRAWBRIDGE_DOWN, IS_DRAWBRIDGE, plur } from './const.js';
import { mungspaces, highc, isok } from './hacklib.js';
import { getlin, getdir } from './cmd.js';
import { thesimpleoname, the, xname } from './objnam.js';
import { can_blow } from './mondata.js';
import { You_cant, You_hear } from './pline.js';
import { Underwater } from './youprop.js';
import { Norep } from './pline.js';
import { dist2 } from './hacklib.js';
import { MFLAGS, PMNAMES, MONSYMS } from './monst_data.js';
import { game } from './gstate.js';
import { A_WIS, ECMD_OK, ECMD_TIME, STRAT_WAITMASK } from './const.js';
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
import { Monnam, a_monnam, Amonnam, mon_nam, x_monnam } from './do_name.js';
import { d, rnl } from './rng.js';
import { sleep_monst, slept_monst } from './mhitm.js';
import { resist, zapyourself, flash_str, ubuzz, BZ_U_WAND } from './zap.js';
import { tamedog } from './dog.js';
import { newsym } from './display.js';
import { maketrap } from './mklev.js';
import { sobj_at, obj_extract_self } from './invent.js';
import { flooreffects, Maybe_Half_Phys } from './do.js';
import { fillholetyp, liquid_flow } from './dig.js';
import { set_levltyp } from './mkmaze.js';
import { t_at, m_at, wakeup, seemimic, xkilled } from './mon.js';
import { is_flyer, is_clinger, humanoid, ceiling_hider, slithy, nolimbs,
         unique_corpstat } from './mondata.js';
import { mselftouch, selftouch, set_utrap, reset_utrap } from './trap.js';
import { losehp, in_rooms } from './hack.js';
import { ACURR, Role_if } from './attrib.js';
import { Fumbling, Levitation, Flying, Blind, Stunned, Confusion,
         Unchanging } from './youprop.js';
import { Upolyd, u_at, is_pit, M_AP_TYPE, has_mgivenname, Amask2align,
         Is_sanctum, In_V_tower, In_endgame, Is_astralevel, COLNO, ROWNO,
         A_DEX, KILLED_BY, NO_KILLER_PREFIX, XKILL_NOMSG, ARTICLE_THE,
         SUPPRESS_SADDLE, TT_PIT, TT_BURIEDBALL, PIT, FOUNTAIN, SINK, ALTAR,
         GRAVE, THRONE, SCORR, CORR, ROOM, SDOOR, DOOR, D_NODOOR, SHOPBASE,
         AM_SANCTUM, AM_MASK, M_AP_NOTHING, M_AP_MONSTER, NOTELL,
         BZ_OFS_AD } from './const.js';
import { In_sokoban } from './dungeon.js';
import { altarmask_at, desecrate_altar } from './pray.js';
import { align_str } from './role.js';
import { unblock_point, recalc_block_point, cansee } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';
import { add_damage } from './shk.js';
import { consume_obj_charge } from './apply.js';
import { Tobjnam, Yname2, an } from './objnam.js';
import { You_feel, pline_The, Your, impossible } from './pline.js';
import { uhim } from './mhitu.js';
import { makeknown } from './o_init.js';
import { incr_itimeout } from './potion.js';
import { ATTKS as ADTYPES } from './monst_data.js';

// src/music.c:45 awaken_scare() — wake up monster, possibly scare it
async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!unique_corpstat(mtmp.data)
        && ((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0)
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    else if (scary
             && !mindless(mtmp.data)
             && !(await resist(mtmp, OCLASSES.TOOL_CLASS, 0, NOTELL))
             /* some monsters are immune */
             && onscary(0, 0, mtmp))
        await monflee(mtmp, 0, false, true);
}

// src/music.c:67 awaken_monsters() — wake every monster in range...
// level.monsters is the port's fmon chain, kept newest first by makemon().
async function awaken_monsters(distance) {
    let distm;

    for (const mtmp of (game.level.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if ((distm = mdistu(mtmp)) < distance)
            await awaken_scare(mtmp, (distm < distance / 3));
    }
}

// src/music.c:85 put_monsters_to_sleep() — make monsters fall asleep.
// Note that they may resist the spell.
async function put_monsters_to_sleep(distance) {
    for (const mtmp of (game.level.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mdistu(mtmp) < distance
            && await sleep_monst(mtmp, d(10, 10), OCLASSES.TOOL_CLASS)) {
            mtmp.msleeping = 1; /* 10d10 turns + wake_nearby to rouse */
            await slept_monst(mtmp);
        }
    }
}

// src/music.c:105 charm_snakes() — charm snakes in range.  Note that the
// snakes are NOT tamed.
async function charm_snakes(distance) {
    let could_see_mon, was_peaceful;

    for (const mtmp of (game.level.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet === MONSYMS.S_SNAKE && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            could_see_mon = canseemon(mtmp);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
            if (canseemon(mtmp)) {
                if (!could_see_mon)
                    await You(`notice ${a_monnam(mtmp)}, swaying with the music.`);
                else
                    await pline(`${Monnam(mtmp)} freezes, then sways with the music${
                                was_peaceful ? '' : ', and now seems quieter'}.`);
            }
        }
    }
}

// src/music.c:139 calm_nymphs() — calm nymphs in range.
async function calm_nymphs(distance) {
    for (const mtmp of (game.level.monsters || [])) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.data.mlet === MONSYMS.S_NYMPH && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} listens cheerfully to the music, then seems quieter.`);
        }
    }
}

// src/music.c:196 charm_monsters() — charm monsters in range.  Note that
// they may resist the spell.
async function charm_monsters(distance) {
    if (game.u.uswallow)
        distance = 0; /* only u.ustuck will be affected (u.usteed is Null
                       * since hero gets forcibly dismounted when engulfed) */

    for (const mtmp of [...(game.level.monsters || [])]) { /* mtmp2 = nmon */
        if (DEADMONSTER(mtmp))
            continue;

        if (mdistu(mtmp) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry
               one; do that even if mtmp resists in order to behave the same
               as a non-cursed scroll of taming or spell of charm monster */
            if (!(await resist(mtmp, OCLASSES.TOOL_CLASS, 0, NOTELL)) || mtmp.isshk)
                await tamedog(mtmp, null, true);
        }
    }
}

// src/music.c:221 do_pit() — create a chasm at x,y for the earthquake
async function do_pit(x, y, tu_pit) {
    let mtmp;
    let otmp;
    let chasm;
    let filltype;
    const u = game.u;

    chasm = maketrap(x, y, PIT);
    if (!chasm)
        return; /* no pit if portal at that location */
    chasm.tseen = 1;

    mtmp = m_at(x, y); /* (redundant?) */
    if ((otmp = sobj_at(ONAMES.BOULDER, x, y)) !== null && otmp !== undefined) {
        if (cansee(x, y))
            await pline(`KADOOM!  The boulder falls into a chasm${
                        u_at(x, y) ? ' below you' : ''}!`);
        if (mtmp)
            mtmp.mtrapped = 0;
        obj_extract_self(otmp);
        await flooreffects(otmp, x, y, '');
        return;
    }

    /* Let liquid flow into the newly created chasm.
       Adjust corresponding code in apply.c for exploding
       wand of digging if you alter this sequence. */
    filltype = fillholetyp(x, y, false);
    if (filltype !== ROOM) {
        set_levltyp(x, y, filltype); /* levl[x][y] = filltype; */
        await liquid_flow(x, y, filltype, chasm, null);
        /* liquid_flow() deletes trap, might kill mtmp */
        if ((chasm = t_at(x, y)) === null || chasm === undefined)
            return;
    }

    /* We have to check whether monsters or hero falls into a
       new pit....  Note: if we get here, chasm is non-Null. */
    if (mtmp) {
        if (!is_flyer(mtmp.data) && !is_clinger(mtmp.data)) {
            const m_already_trapped = !!mtmp.mtrapped;

            mtmp.mtrapped = 1;
            if (!m_already_trapped) { /* suppress messages */
                if (cansee(x, y)) {
                    await pline(`${Monnam(mtmp)} falls into a chasm!`);
                } else if (humanoid(mtmp.data)) {
                    /* Soundeffect(se_scream, 50); */
                    await You_hear('a scream!');
                }
            }
            /* Falling is okay for falling down
               within a pit from jostling too */
            await mselftouch(mtmp, 'Falling, ', true);
            if (!DEADMONSTER(mtmp)) {
                mtmp.mhp -= rnd(m_already_trapped ? 4 : 6);
                if (DEADMONSTER(mtmp)) {
                    if (!cansee(x, y)) {
                        await pline('It is destroyed!');
                    } else {
                        await You(`destroy ${
                            mtmp.mtame
                             ? x_monnam(mtmp, ARTICLE_THE, 'poor',
                                        has_mgivenname(mtmp)
                                         ? SUPPRESS_SADDLE : 0,
                                        false)
                             : mon_nam(mtmp)}!`);
                    }
                    await xkilled(mtmp, XKILL_NOMSG);
                }
            }
        }
    } else if (u_at(x, y)) {
        if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            /* Note:  the chain should break if a pit gets
               created at the buried ball's location, which
               is not necessarily here.  But if we don't do
               things this way, entering the new pit below
               will override current trap anyway, but too
               late to get Lev and Fly handling. */
            await Your('chain breaks!');
            await reset_utrap(true);
        }
        if (Levitation() || Flying() || is_clinger(game.youmonst.data)) {
            if (!tu_pit) { /* no pit here previously */
                await pline('A chasm opens up under you!');
                await You("don't fall in!");
            }
        } else if (!tu_pit || !u.utrap || u.utraptype !== TT_PIT) {
            /* no pit here previously, or you were
               not in it even if there was */
            await You('fall into a chasm!');
            set_utrap(rn1(6, 2), TT_PIT);
            await losehp(Maybe_Half_Phys(rnd(6)),
                         'fell into a chasm', NO_KILLER_PREFIX);
            await selftouch('Falling, you');
        } else if (u.utrap && u.utraptype === TT_PIT) {
            const keepfooting =
                    (!(Fumbling() && rn2(5))
                     && (!rnl(Role_if(PMNAMES.PM_ARCHEOLOGIST) ? 3 : 9)
                         || ((ACURR(A_DEX) > 7) && rn2(5))));

            await You('are jostled around violently!');
            set_utrap(rn1(6, 2), TT_PIT);
            await losehp(Maybe_Half_Phys(rnd(keepfooting ? 2 : 4)),
                         'hurt in a chasm', NO_KILLER_PREFIX);
            if (keepfooting)
                exercise(A_DEX, true);
            else
                await selftouch((Upolyd(u) && (slithy(game.youmonst.data)
                                               || nolimbs(game.youmonst.data)))
                                ? 'Shaken, you'
                                : 'Falling down, you');
        }
    } else {
        newsym(x, y);
    }
}

// src/music.c:344 do_earthquake() — generate earthquake :-) of desired
// force.  That is:  create random chasms (pits).
async function do_earthquake(force) {
    const into_a_chasm = ' into a chasm';
    let x, y;
    let mtmp;
    const u = game.u;
    const trap_at_u = t_at(u.ux, u.uy);
    let start_x, start_y, end_x, end_y, amsk;
    let algn;
    let tu_pit = 0;

    if (trap_at_u)
        tu_pit = is_pit(trap_at_u.ttyp) ? 1 : 0;
    if (force > 13) /* sanity precaution; maximum used is actually 10 */
        force = 13;
    start_x = u.ux - (force * 2);
    start_y = u.uy - (force * 2);
    end_x = u.ux + (force * 2);
    end_y = u.uy + (force * 2);
    start_x = Math.max(start_x, 1);
    start_y = Math.max(start_y, 0);
    end_x = Math.min(end_x, COLNO - 1);
    end_y = Math.min(end_y, ROWNO - 1);
    for (x = start_x; x <= end_x; x++)
        for (y = start_y; y <= end_y; y++) {
            if ((mtmp = m_at(x, y)) !== null && mtmp !== undefined) {
                await wakeup(mtmp, true); /* peaceful monster will become hostile */
                if (mtmp.mundetected) {
                    mtmp.mundetected = 0;
                    newsym(x, y);
                    if (ceiling_hider(mtmp.data)) {
                        if (cansee(x, y)) {
                            await pline(`${Amonnam(mtmp)} is shaken loose from the ceiling!`);
                        } else if (!is_flyer(mtmp.data)) {
                            /* Soundeffect(se_thump, 50); */
                            await You_hear('a thump.');
                        }
                    }
                }
                if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
                    && M_AP_TYPE(mtmp) !== M_AP_MONSTER)
                    seemimic(mtmp);
            }
            if (rn2(14 - force))
                continue;

       /*
        * Possible extensions:
        *  When a door is trapped, explode it instead of silently
        *   turning it into an empty doorway.
        *  Trigger divine wrath when an altar is dumped into a chasm.
        *  Sometimes replace sink with fountain or fountain with pool
        *   instead of always producing a pit.
        *  Sometimes release monster and/or treasure from a grave or
        *   a throne instead of just dumping them into the chasm.
        *  Chance to destroy wall segments?  Trees too?
        *  Honor non-diggable for locked doors, walls, and trees.
        *   Treat non-passwall as if it was non-diggable?
        *  Conjoin some of the umpteen pits when they're adjacent?
        *
        *  Replace 'goto do_pit;' with 'do_pit = TRUE; break;' and
        *   move the pit code to after the switch.
        */

            const lev = game.level.at(x, y);
            switch (lev.typ) {
            case FOUNTAIN: /* make the fountain disappear */
                if (cansee(x, y))
                    await pline_The(`fountain falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit);
                break;
            case SINK:
                if (cansee(x, y))
                    await pline_The(`kitchen sink falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit);
                break;
            case ALTAR:
                amsk = altarmask_at(x, y);
                /* always preserve the high altars */
                if ((amsk & AM_SANCTUM) !== 0)
                    break;
                algn = Amask2align(amsk & AM_MASK);
                if (cansee(x, y))
                    await pline_The(`${align_str(algn)} altar falls${into_a_chasm}.`);
                await desecrate_altar(false, algn);
                await do_pit(x, y, tu_pit);
                break;
            case GRAVE:
                if (cansee(x, y))
                    await pline_The(`headstone topples${into_a_chasm}.`);
                await do_pit(x, y, tu_pit);
                break;
            case THRONE:
                if (cansee(x, y))
                    await pline_The(`throne falls${into_a_chasm}.`);
                await do_pit(x, y, tu_pit);
                break;
            case SCORR:
                lev.typ = CORR;
                unblock_point(x, y);
                if (cansee(x, y))
                    await pline('A secret corridor is revealed.');
                /*FALLTHRU*/
            case CORR:
            case ROOM:
                await do_pit(x, y, tu_pit);
                break;
            case SDOOR:
                cvt_sdoor_to_door(lev); /* .typ = DOOR */
                if (cansee(x, y))
                    await pline('A secret door is revealed.');
                /*FALLTHRU*/
            case DOOR: /* make the door collapse */
                /* if already doorless, treat like room or corridor */
                if (lev.doormask === D_NODOOR) {
                    await do_pit(x, y, tu_pit);
                    break;
                }
                /* wasn't doorless, now it will be */
                lev.doormask = D_NODOOR;
                recalc_block_point(x, y);
                newsym(x, y); /* before pline */
                if (cansee(x, y))
                    await pline_The('door collapses.');
                if (in_rooms(x, y, SHOPBASE))
                    add_damage(x, y, 0);
                break;
            }
        }
}

// src/music.c:478 generic_lvl_desc()
function generic_lvl_desc() {
    const uz = game.u.uz;

    if (Is_astralevel(uz))
        return 'astral plane';
    else if (In_endgame(uz))
        return 'plane';
    else if (Is_sanctum(uz))
        return 'sanctum';
    else if (In_sokoban(uz))
        return 'puzzle';
    else if (In_V_tower(uz))
        return 'tower';
    else
        return 'dungeon';
}

const beats = [
    'stepper', 'one drop', 'slow two', 'triple stroke roll',
    'double shuffle', 'half-time shuffle', 'second line', 'train',
];

/*
 * The player is trying to extract something from his/her instrument.
 */
// src/music.c:503 do_improvisation().  Hero_playnotes() is the sound
// library hook, empty in this build.
async function do_improvisation(instr) {
    let damage, mode, do_spec = !(Stunned() || Confusion());
    const itmp = { ...instr };
    let mundane = false, same_old_song = false;
    let improvisation;
    const u = game.u;

    itmp.oextra = null; /* ok on this copy as instr maintains
                         * the ptr to free at some point if
                         * there is one */
    /* if won't yield special effect, make sound of mundane counterpart */
    if (!do_spec || instr.spe <= 0)
        while (game.objects[itmp.otyp].oc_magic) {
            itmp.otyp -= 1;
            mundane = true;
        }
    const PLAY_NORMAL = 0x00;
    const PLAY_STUNNED = 0x01;
    const PLAY_CONFUSED = 0x02;
    const PLAY_HALLU = 0x04;
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
            await You('radiate an obnoxious droning sound.');
        else
            await You_feel('a monotonous vibration.');
        break;
    case PLAY_CONFUSED:
        if (!Deaf())
            await You('generate a raucous noise.');
        else
            await You_feel('a jarring vibration.');
        break;
    case PLAY_HALLU:
        await You('disseminate a kaleidoscopic display of floating butterflies.');
        break;
    /* TODO? give some or all of these combinations their own feedback;
       hallucination ones should reference senses other than hearing... */
    case PLAY_STUNNED | PLAY_CONFUSED:
    case PLAY_STUNNED | PLAY_HALLU:
    case PLAY_CONFUSED | PLAY_HALLU:
    case PLAY_STUNNED | PLAY_CONFUSED | PLAY_HALLU:
    default:
        await pline('What you perform is quite far from music...');
        break;
    }

    ({ notes: improvisation, same: same_old_song } = improvised_notes());

    switch (itmp.otyp) { /* note: itmp.otyp might differ from instr->otyp */
    case ONAMES.MAGIC_FLUTE: /* Make monster fall asleep */
        await consume_obj_charge(instr, true);
        await You(`${!Deaf() ? '' : 'seem to '}produce ${
                  Hallucination() ? 'piped' : 'soft'}${
                  same_old_song ? ', familiar' : ''} music.`);
        await put_monsters_to_sleep(u.ulevel * 5);
        exercise(A_DEX, true);
        break;
    case ONAMES.WOODEN_FLUTE: { /* May charm snakes */
        const trill = (rn2(ACURR(A_DEX)) + u.ulevel > 25); /* do_spec &= ... */
        do_spec = do_spec && trill;
        if (!Deaf())
            await pline(`${Tobjnam(instr, do_spec ? 'trill' : 'toot')}${
                        same_old_song ? ' a familiar tune' : ''}.`);
        else
            await You_feel(`${yname(instr)} ${do_spec ? 'trill' : 'toot'}.`);
        if (do_spec)
            await charm_snakes(u.ulevel * 3);
        exercise(A_DEX, true);
        break;
    }
    case ONAMES.FIRE_HORN:  /* Idem wand of fire */
    case ONAMES.FROST_HORN: /* Idem wand of cold */
        await consume_obj_charge(instr, true);
        if (!(await getdir(null))) {
            await pline(`${Tobjnam(instr, 'vibrate')}.`);
            break;
        } else if (!u.dx && !u.dy && !u.dz) {
            if ((damage = await zapyourself(instr, true)) !== 0) {
                const buf = `using a magical horn on ${uhim()}self`;
                await losehp(damage, buf, KILLED_BY); /* fire or frost damage */
            }
        } else {
            const type = BZ_OFS_AD((instr.otyp === ONAMES.FROST_HORN) ? ADTYPES.AD_COLD
                                                                       : ADTYPES.AD_FIRE);
            if (!Blind())
                await pline(`A ${flash_str(type, false)} blasts out of the horn!`);
            game.current_wand = instr;
            await ubuzz(BZ_U_WAND(type), rn1(6, 6));
            game.current_wand = null;
        }
        makeknown(instr.otyp);
        break;
    case ONAMES.TOOLED_HORN: /* Awaken or scare monsters */
        if (!Deaf())
            await You(`produce a frightful, grave${
                      same_old_song ? ', yet familiar,' : ''} sound.`);
        else
            await You('blow into the horn.');
        await awaken_monsters(u.ulevel * 30);
        exercise(A_WIS, false);
        break;
    case ONAMES.BUGLE: /* Awaken & attract soldiers */
        if (!Deaf())
            await You(`extract a loud${
                      same_old_song ? ', familiar' : ''} noise from ${yname(instr)}.`);
        else
            await You('blow into the bugle.');
        await awaken_soldiers(game.youmonst);
        exercise(A_WIS, false);
        break;
    case ONAMES.MAGIC_HARP: /* Charm monsters */
        await consume_obj_charge(instr, true);
        if (!Deaf())
            await pline(`${Tobjnam(instr, 'produce')} very attractive${
                        same_old_song ? ' and familiar' : ''} music.`);
        else
            await You_feel('very soothing vibrations.');
        await charm_monsters(Math.trunc((u.ulevel - 1) / 3) + 1);
        exercise(A_DEX, true);
        break;
    case ONAMES.WOODEN_HARP: { /* May calm Nymph */
        const lilt = (rn2(ACURR(A_DEX)) + u.ulevel > 25); /* do_spec &= ... */
        do_spec = do_spec && lilt;
        if (!Deaf())
            await pline(`${Yname2(instr)} ${
                  (do_spec && same_old_song)
                  ? 'produces a familiar, lilting melody'
                  : (do_spec) ? 'produces a lilting melody'
                    : (same_old_song) ? 'twangs a familiar tune'
                      : 'twangs'}.`);
        else
            await You_feel('soothing vibrations.');
        if (do_spec)
            await calm_nymphs(u.ulevel * 3);
        exercise(A_DEX, true);
        break;
    }
    case ONAMES.DRUM_OF_EARTHQUAKE: /* create several pits */
        /* a drum of earthquake does not cause deafness
           while still magically functional, nor afterwards
           when it invokes the LEATHER_DRUM case instead and
           mundane is flagged */
        await consume_obj_charge(instr, true);
        await You('produce a heavy, thunderous rolling!');
        await pline_The(`entire ${generic_lvl_desc()} is shaking around you!`);
        await do_earthquake(Math.trunc((u.ulevel - 1) / 3) + 1);
        /* shake up monsters in a much larger radius... */
        await awaken_monsters(ROWNO * COLNO);
        makeknown(ONAMES.DRUM_OF_EARTHQUAKE);
        break;
    case ONAMES.LEATHER_DRUM: /* Awaken monsters */
        if (!mundane) {
            if (!Deaf()) {
                await You(`beat a ${same_old_song ? 'familiar ' : ''}deafening row!`);
                incr_itimeout('HDeaf', rn1(20, 30));
            } else {
                await You('pound on the drum.');
            }
            exercise(A_WIS, false);
        } else {
            /* TODO maybe: sound effects for these riffs */
            const verb = rn2(2) ? 'butcher' : rn2(2) ? 'manage' : 'pull off';
            await You(`${verb} ${an(beats[rn2(beats.length)])}.`); /* ROLL_FROM(beats) */
        }
        await awaken_monsters(u.ulevel * (mundane ? 5 : 40));
        (game.disp ||= {}).botl = true;
        break;
    default:
        await impossible(`What a weird instrument (${instr.otyp})!`);
        return 0;
    }
    return 2; /* That takes time */
}

// src/music.c:733 improvised_notes(). The five-character context belongs to
// the game because save and restore preserve the last tune.
function improvised_notes() {
    const notes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const context = (game.context ||= {});
    /* target buffer has to be in svc.context, otherwise saving game
     * between improvised recitals would not be able to maintain
     * the same_as_last_time context. */

    /* You can change your tune, usually */
    if (!(Unchanging() && context.jingle)) {
        const notecount = rnd(5); /* 1 - 5 */
        let tune = '';

        for (let i = 0; i < notecount; ++i)
            tune += notes[rn2(notes.length)]; /* ROLL_FROM(notes) */
        context.jingle = tune;
        return { notes: tune, same: false };
    }
    return { notes: context.jingle, same: true };
}

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
        return (await do_improvisation(instr)) ? ECMD_TIME : ECMD_OK;

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
