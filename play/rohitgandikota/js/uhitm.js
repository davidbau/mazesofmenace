import { exercise, poisoned } from './attrib.js';
import { A_DEX, A_STR, ERODE_NONE, ERODE_BURN, ERODE_RUST,
         ERODE_CORRODE } from './const.js';
// uhitm.js — the hero attacking, or declining to attack, a monster.
// C ref: src/uhitm.c
//
// Only do_attack()'s is_safemon branch is ported: the path taken when the hero
// walks into a pet or other peaceful. That path is not a corner case. Probing
// domove with an m_at() counter shows seed0030's hero steps onto a tame
// monster sixteen times in one session, and each of those is an rn2(7) the C
// draws and we do not.
//
// The hostile path (attack_checks and everything past it) is the real combat
// code and is recorded, not faked.

import { game } from './gstate.js';
import { helpless, MON_WEP } from './monst.js';
import { rn1 } from './rng.js';
import { dmgtype } from './mondata.js';
import { touch_petrifies, abuse_dog } from './dog.js';
import { which_armor } from './worn.js';
import { hitmsg, magic_negation } from './mhitu.js';
import { You, Your, You_hear } from './pline.js';
import { end_running } from './hack.js';
import { mon_nam, Monnam, y_monnam, m_monnam, upstart, a_monnam, x_monnam,
         pmname } from './do_name.js';
import { destroy_items, exclam } from './zap.js';
import { Blind, Cold_resistance, Deaf, Hallucination, Flying,
         Levitation } from './youprop.js';
import { canseemon, canspotmon, glyph_at, sensemon, newsym, pline } from './display.js';
import { wakeup, wake_nearto, killed, xkilled, seemimic, setmangry,
         is_pool, m_carrying, t_at } from './mon.js';
import { DEADMONSTER } from './monst.js';
import { is_pole } from './u_init.js';
import { bimanual, is_plural, is_flimsy } from './obj.js';
import { is_ammo, is_missile, ammo_and_launcher, uwepgone } from './wield.js';
import { useup } from './invent.js';
import { rnl } from './rng.js';
import { ART_SNICKERSNEE, ART_GIANTSLAYER,
         ART_OGRESMASHER } from './artilist_data.js';
import { yname, cxname, xname, The, makeplural, simpleonames,
         otense } from './objnam.js';
import { mintrap } from './trap.js';
import { clone_mon, goodpos, place_monster, remove_monster } from './makemon.js';
import { rn2, rnd, d } from './rng.js';
import { is_safemon } from './display.js';
import { monflee, set_apparxy } from './monmove.js';
import { IS_OBSTRUCTED, MON_POLE_DIST, M_ATTK_HIT, M_ATTK_MISS,
         M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, NATTK, MM_IGNOREWATER,
         MM_IGNORELAVA, Is_airlevel, Is_waterlevel, isok,
         FORCEBUNGLE, HURTLING, IS_DOOR, SHOPBASE, ROOMOFFSET } from './const.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { adjalign, near_capacity } from './attrib.js';
import { abon, hitval, weapon_hit_bonus, dmgval, weapon_dam_bonus, use_skill, uwep_skill_type, weapon_type } from './weapon.js';
import { find_mac } from './worn.js';
import { worn } from './do_wear.js';
import { is_orc, unsolid, noncorporeal, amorphous, thick_skinned, attacktype,
         sticks, haseyes, cantwield, is_flyer, is_floater } from './mondata.js';
import { mon_hates_silver } from './dog.js';
import { s_suffix } from './hacklib.js';
import { vtense } from './objnam.js';
import { hides_under } from './mondata.js';
import { MONSYMS } from './monst_data.js';
import { u_wipe_engr } from './engrave.js';
import { check_capacity, overexertion, doorless_door } from './hack.js';
import { is_blade, is_axe, set_ustuck, m_at } from './mon.js';
import { is_weptool, mksobj } from './mkobj.js';
import { OCLASSES, MATERIALS, ONAMES, SKILLS } from './objects_data.js';
import { sgn, distu } from './hacklib.js';
import { ATTKS } from './monst_data.js';
import { STR18 } from './const.js';
import { ACURR } from './attrib.js';
import { W_ARM, W_ARMS, P_BARE_HANDED_COMBAT, P_BASIC,
         HMON_MELEE, HMON_APPLIED, HMON_THROWN, HMON_KICKED,
         W_ARMG, W_RINGR, W_RINGL, P_KNIFE, P_WHIP, XKILL_NOMSG,
         STRAT_WAITMASK, engulfing_u, NEW_MOON } from './const.js';
import { is_undead } from './mondata.js';
import { A_LAWFUL } from './const.js';
import { FACE, HAND } from './const.js';
import { body_part, mbodypart } from './polyself.js';
import { M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT,
         M_AP_MONSTER, MIM_REVEAL, MIM_OMIT_WAIT, ARTICLE_A } from './const.js';
import { defsyms } from './drawing_data.js';
import { get_artifact, spec_dbon } from './artifact.js';
import { cansee } from './vision.js';

function note_unported_uhitm(what) {
    (game.unported ||= new Set()).add(`uhitm:${what}`);
}

// include/mondata.h:29 passes_walls()
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;

// include/mondata.h:150 is_longworm() — an identity test against three
// specific permonst entries, NOT a flag test.
const is_longworm = (ptr) =>
    ptr.pmidx === PMNAMES.PM_BABY_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM_TAIL;

// src/mon.c helpless()
/* helpless() lives in js/monst.js, matching include/monst.h:251. */

// src/uhitm.c:462 do_attack() — returns TRUE if the hero's move is used up.
//
// Returning FALSE is what lets the caller swap places with the monster, so the
// three arms below are "you stop", "it doesn't budge", and "go ahead and swap".
export async function do_attack(mtmp) {
    if (is_safemon(mtmp) && !game.context?.forcefight) {
        /* u_wield_art(ART_STORMBRINGER) — no artifact is wielded this early */
        const mdat = game.mons[mtmp.mnum];

        /* src/uhitm.c:474 — the rn2(7) fires on EVERY step onto a peaceful,
           before any of the cheaper terms, because || evaluates left to right
           and Punished is false for an unpunished hero.

           include/youprop.h:77 defines Punished as (uball != 0): it is the
           heavy iron ball, NOT a uprops intrinsic. This first read it as
           game.u.uprops.PUNISHED, which is permanently undefined -- falsy, so
           the rn2(7) did still draw and the common path was right by accident,
           but the term could never become true once punishment is ported.
           The ball subsystem does not exist yet, so u.uball is absent and this
           is false for the same reason C is false. */
        const foo = !!(game.u.uball || !rn2(7)
                       || (is_longworm(mdat) && mtmp.wormno)
                       || (IS_OBSTRUCTED(game.level.at(game.u.ux, game.u.uy)?.typ)
                           && !passes_walls(mdat)));

        /* The in-shop check only runs when foo is false. Peaceful monsters
           cannot be displaced inside a tended shop, and bumping the resident
           shopkeeper starts payment when this is an ordinary move. */
        let inshop = false;
        if (!foo) {
            const [{ in_rooms }, { tended_shop }] = await Promise.all([
                import('./hack.js'), import('./shk.js'),
            ]);
            for (const roomno of in_rooms(mtmp.mx, mtmp.my, SHOPBASE) || '') {
                const room = game.level?.rooms?.[roomno.charCodeAt(0) - ROOMOFFSET];
                if (room && tended_shop(room)) {
                    inshop = true;
                    break;
                }
            }
        }

        if (inshop || foo) {
            if (!game.context?.travel && !game.context?.run
                && canspotmon(mtmp) && mtmp.isshk) {
                const { dopay } = await import('./shk.js');
                await dopay();
                return true;
            }
            if (mtmp.mtame)     /* see 'additional considerations' in the C */
                monflee(mtmp, rnd(6), false, false);
            /* You("stop.  %s is in the way!", highc(y_monnam(mtmp))) */
            {
                const buf = upstart(y_monnam(mtmp));
                await You(`stop.  ${buf} is in the way!`);
            }
            end_running(true);
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (mdat.mmove === 0 && rn2(6))) {
            await pline(`${Monnam(mtmp)} doesn't seem to move!`);
            end_running(true);
            return true;
        } else {
            return false;       /* caller swaps places with it */
        }
    }

    /* possibly set in attack_checks; examined in known_hitum */
    game.override_confirmation = false;
    /* attack_checks() reads gb.bhitpos, which might map an invisible
       monster there */
    game.bhitpos = { x: game.u.ux + game.u.dx, y: game.u.uy + game.u.dy };
    game.notonhead = (game.bhitpos.x !== mtmp.mx || game.bhitpos.y !== mtmp.my);
    if (await attack_checks(mtmp, game.u.uwep))
        return true;

    if (game.u.umonnum !== undefined && game.Upolyd)
        note_unported_uhitm('do_attack:polyd');

    /* src/uhitm.c:530 — check_capacity() prints and returns 1 when the hero
       is overloaded; overexertion() calls gethungry(), which DRAWS, so an
       attack costs a hunger tick the plain step does not. */
    if (await check_capacity('You cannot fight while so heavily loaded.')
        || await overexertion())
        return true;                            /* goto atk_done */

    if (game.u.twoweap)
        note_unported_uhitm('do_attack:can_twoweapon');

    if (game.unweapon) {
        game.unweapon = false;
        if (game.flags?.verbose) {
            if (game.u.uwep) {
                await You(`begin bashing monsters with ${yname(game.u.uwep)}.`);
            } else if (!cantwield(game.youmonst.data)) {
                const action = Role_if(PMNAMES.PM_MONK)
                    ? 'striking' : 'bashing';
                await You(`begin ${action} monsters with your ${
                    game.u.uarmg ? 'gloved' : 'bare'} ${
                    makeplural(body_part(HAND))}.`);
            }
        }
    }
    exercise(A_STR, true);  /* you're exercising muscles */
    /* andrew@orca: prevent unlimited pick-axe attacks */
    u_wipe_engr(3);

    /* Is the "it died" check actually correct? */
    if (mdat_of(mtmp).mlet === MONSYMS.S_LEPRECHAUN && !mtmp.mfrozen
        && !helpless(mtmp) && !mtmp.mconf && mtmp.mcansee && !rn2(7))
        note_unported_uhitm('do_attack:leprechaun_dodge');

    /* C passes gy.youmonst.data->mattk, i.e. the FIRST attack row; hitum
       reads uattk->aatyp from it. */
    await hitum(mtmp, mattk_row(game.youmonst.data.mattk[0]));

    if (game.context?.forcefight && !DEADMONSTER(mtmp) && !canspotmon(mtmp))
        note_unported_uhitm('do_attack:forcefight_map_invisible');
    return true;
}

const mdat_of = (mtmp) => game.mons[mtmp.mnum];

// src/uhitm.c:6201 that_is_a_mimic() and :6282 stumble_onto_mimic().
// Naming an object-shaped mimic manufactures the temporary object which the
// map glyph claims is present. Even with init=false, mksobj() allocates an
// object id, so this visible message spends one rnd(2) before revealing it.
async function that_is_a_mimic(mtmp, mimic_flags) {
    let fmt = "Wait!  That's %s!";
    let what = null;
    const reveal_it = (mimic_flags & MIM_REVEAL) !== 0;
    const omit_wait = (mimic_flags & MIM_OMIT_WAIT) !== 0;

    if (game.u.ublind) {
        /* Blind telepathy can identify a monster-shaped disguise. That branch
           needs the full telepathy property model; the generic wording is the
           exact non-telepathic result. */
        what = 'a monster';
    } else {
        const glyph = glyph_at(mtmp.mx, mtmp.my);

        if (glyph?.kind === 'cmap') {
            if (M_AP_TYPE(mtmp) === M_AP_FURNITURE) {
                const explanation = defsyms[glyph.cmap]?.explain || 'object';
                fmt = `That ${explanation} actually is %s!`;
            }
        } else if (glyph?.kind === 'obj') {
            const fake = mksobj(glyph.otyp, false, false);
            if (fake.oclass === OCLASSES.COIN_CLASS)
                fake.quan = 2;
            else if (fake.otyp === ONAMES.SLIME_MOLD)
                fake.spe = game.context?.current_fruit || 0;
            const fake_name = simpleonames(fake);
            fmt = `${is_plural(fake) ? 'Those' : 'That'} ${fake_name} `
                + `${otense(fake, 'are')} %s!`;
        } else if (glyph?.kind === 'mon') {
            const shown = game.mons[mtmp.mappearance];
            if (shown)
                fmt = `Wait!  That ${pmname(shown, 0)} is really %s!`;
        }

        if (M_AP_TYPE(mtmp) === M_AP_MONSTER) {
            what = x_monnam(mtmp, ARTICLE_A, null, 0, true);
        } else if ((M_AP_TYPE(mtmp) === M_AP_OBJECT
                    || M_AP_TYPE(mtmp) === M_AP_FURNITURE)
                   && (mtmp.msleeping || mtmp.mfrozen)) {
            what = x_monnam(mtmp, ARTICLE_A, 'sleeping', 0, false);
        } else {
            what = a_monnam(mtmp);
        }
    }

    if (what) {
        const shown_fmt = omit_wait && fmt.startsWith('Wait!  ')
                        ? fmt.slice(7) : fmt;
        await pline(shown_fmt.replace('%s', what));
    }
    if (reveal_it)
        seemimic(mtmp);
}

async function stumble_onto_mimic(mtmp) {
    await that_is_a_mimic(mtmp, MIM_REVEAL);

    if (!game.u.ustuck && !mtmp.mflee
        && dmgtype(mdat_of(mtmp), ATTKS.AD_STCK)
        && distu(mtmp.mx, mtmp.my) <= 2)
        set_ustuck(mtmp);

    await wakeup(mtmp, false);
    if (!canspotmon(mtmp))
        note_unported_uhitm('stumble_onto_mimic:map_invisible');
}

// src/uhitm.c:189 attack_checks() — everything that can stop an attack before
// it starts. Returns TRUE when the hero's move is used up without a blow.
//
// It draws NOTHING: every arm is a message or a state change. The forcefight
// arm returns early, which is why a forced attack on an empty square never
// asks anything.
export async function attack_checks(mtmp, wep) {
    /* if you're close enough to attack, alert any waiting monster */
    mtmp.mstrategy &= ~STRAT_WAITMASK;

    if (engulfing_u(mtmp))
        return false;

    if (game.context?.forcefight)
        return false;

    /* cache the shown glyph; the cases that CHANGE it all return without
       looking at it again */
    const glyph = glyph_at(game.bhitpos.x, game.bhitpos.y);
    const glyph_is_warning = (g) => g?.kind === 'warn';
    const glyph_is_invisible = (g) => g?.kind === 'invis';

    if (!canspotmon(mtmp)
        && !glyph_is_warning(glyph) && !glyph_is_invisible(glyph)
        && !(!game.u.ublind && mtmp.mundetected
             && hides_under(mdat_of(mtmp)))) {
        await pline("Wait!  There's something there you can't see!");
        note_unported_uhitm('attack_checks:map_invisible');
        if (mtmp.m_ap_type)
            note_unported_uhitm('attack_checks:invisible_mimic');
        /* always necessary; also un-mimics mimics */
        await wakeup(mtmp, true);
        return true;
    }

    if (mtmp.m_ap_type && !sensemon(mtmp) && !glyph_is_warning(glyph)) {
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        await stumble_onto_mimic(mtmp);
        return true;
    }

    if (mtmp.mundetected && !canseemon(mtmp) && !glyph_is_warning(glyph)
        && (hides_under(mdat_of(mtmp))
            || mdat_of(mtmp).mlet === MONSYMS.S_EEL)) {
        mtmp.mundetected = mtmp.msleeping = 0;
        newsym(mtmp.mx, mtmp.my);
        if (glyph_is_invisible(glyph)) {
            seemimic(mtmp);
            return false;
        }
        if (!sensemon(mtmp)) {
            note_unported_uhitm('attack_checks:hidden_monster_message');
            return true;
        }
    }

    /* wake a monster from the above cases if the hero can sense it */
    if ((mtmp.mundetected || mtmp.m_ap_type) && sensemon(mtmp)) {
        mtmp.mundetected = 0;
        await wakeup(mtmp, true);
    }

    if (game.flags?.confirm !== false && mtmp.mpeaceful
        && !game.u.uprops?.CONFUSION && !game.u.uprops?.HALLUC
        && !game.u.uprops?.STUNNED) {
        /* is_art(wep, ART_STORMBRINGER) — no artifact is wielded this early */
        if (canspotmon(mtmp)) {
            const { tty_yn_function } = await import('./tty/topl.js');
            const answer = await tty_yn_function(
                `Really attack ${mon_nam(mtmp)}?`, 'yn', 'n');
            if (answer !== 'y') {
                game.context.move = 0;
                return true;
            }
        }
    }

    return false;
}

// src/uhitm.c:331 check_caitiff() — a Knight's chivalry and a Samurai's giri.
//
// Draws nothing, but it calls adjalign(-1), which moves the hero's alignment
// record AND raises ualign.abuse. find_roll_to_hit calls it once per attack
// sequence, guarded by `if (!(*attk_count)++)`, so it must not fire on the
// second and later attacks of a multi-attack turn.
//
// The two You() messages are displayed before the alignment change, matching
// the C call order and preserving message-window boundaries.
export async function check_caitiff(mtmp) {
    if (game.u.ualign.record <= -10)
        return;

    const d = game.mons[mtmp.mnum];

    if (Role_if(PMNAMES.PM_KNIGHT) && game.u.ualign.type === A_LAWFUL
        && !is_undead(d)
        && (helpless(mtmp) || (mtmp.mflee && !mtmp.mavenge))) {
        await You('caitiff!');
        adjalign(-1);
    } else if (Role_if(PMNAMES.PM_SAMURAI) && mtmp.mpeaceful) {
        /* attacking peaceful creatures is bad for the samurai's giri */
        await You('dishonorably attack the innocent!');
        adjalign(-1);
    }
}

// src/role.c Role_if()
//
// The role's monster number lives in urole.mnum; this used to read malenum
// and pmidx, neither of which js/role_data.js defines, so EVERY Role_if in
// this file was false. That silently disabled check_caitiff's Knight and
// Samurai arms, find_roll_to_hit's Monk bonus, and martial_bonus() -- which
// is why a Monk's bare hand rolled rnd(2) where C rolls rnd(4).
const Role_if = (pm) => {
    const m = game.urole?.mnum;
    return m === pm || m === PMNAMES[pm];
};

// src/uhitm.c find_roll_to_hit() — the number the d20 must beat.
//
// Draws nothing itself; hitum rolls rnd(20) against the value it returns.
// attk_count and role_roll_penalty are C out-parameters, passed here as a
// single mutable object so the caller sees both.
//
// The check_caitiff() call is guarded by `if (!(*attk_count)++)`, so it fires
// on the FIRST attack of a sequence only -- a multi-attack turn must not
// penalise the hero's alignment repeatedly.
export async function find_roll_to_hit(mtmp, aatyp, weapon, out) {
    const ptr = game.mons[mtmp.mnum];
    out.role_roll_penalty = 0;              /* default is `none' */

    /* include/you.h:464 Luck is uluck + moreluck */
    const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);

    let tmp = 1 + abon() + find_mac(mtmp) + (game.u.uhitinc || 0)
              + (sgn(Luck) * Math.trunc((Math.abs(Luck) + 2) / 3))
              + game.u.ulevel;              /* maybe_polyd: not polymorphed */

    /* some actions should occur only once during multiple attacks */
    if (!(out.attk_count++))
        await check_caitiff(mtmp);

    /* adjust vs. monster state */
    if (mtmp.mstun)      tmp += 2;
    if (mtmp.mflee)      tmp += 2;
    if (mtmp.msleeping)  tmp += 2;
    if (!mtmp.mcanmove)  tmp += 4;

    /* role/race adjustments */
    if (Role_if(PMNAMES.PM_MONK)) {
        if (worn(W_ARM))
            tmp -= (out.role_roll_penalty = game.urole.spelarmr);
        else if (!game.u.uwep && !worn(W_ARMS))
            tmp += Math.trunc(game.u.ulevel / 3) + 2;
    }
    if (is_orc(ptr) && Race_if(PMNAMES.PM_ELF))
        tmp++;

    /* encumbrance: with a lot of luggage, your agility diminishes */
    const tmp2 = near_capacity();
    if (tmp2 !== 0)
        tmp -= (tmp2 * 2) - 1;
    if (game.u.utrap)
        tmp -= 3;

    /* hitval applies when wielding a weapon; weapon_hit_bonus applies to any
       weapon attack, bare-handed included, and to a martial artist's kick */
    if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW) {
        if (weapon)
            tmp += hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon);
    } else if (aatyp === ATTKS.AT_KICK && martial_bonus()) {
        tmp += weapon_hit_bonus(null);
    }

    return tmp;
}

// src/role.c Race_if()
const Race_if = (pm) => game.urace?.malenum === pm || game.urace?.pmidx === pm;

/* include/skills.h:81 martial_bonus() — mirrored from js/weapon.js, which
   cannot be imported here without closing a cycle. */
const martial_bonus = () =>
    Role_if(PMNAMES.PM_SAMURAI) || Role_if(PMNAMES.PM_MONK);

// src/uhitm.c mon_maybe_unparalyze() — a paralysed monster may snap out of it.
//
// DRAWS, and the draw is unconditional on the monster being unable to move:
// hitum calls this between find_roll_to_hit and its own rnd(20), so a frozen
// target costs an rn2(10) that a mobile one does not.
export function mon_maybe_unparalyze(mtmp) {
    if (!mtmp.mcanmove) {
        if (!rn2(10)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
        }
    }
}

// src/uhitm.c double_punch() — chance of a second bare-handed hit.
//
// DRAWS rn2(5), but ONLY when bare-handed above Basic skill. C's own table:
// unskilled and basic 0%, skilled 20%, expert 40%, master 60%, grandmaster
// 80%. Note the guard is `!uwep && !uarms` -- a shield suppresses it as
// surely as a weapon does.
export function double_punch() {
    /* P_BARE_HANDED_COMBAT and P_MARTIAL_ARTS are the same skill */
    const skl_lvl = game.u.weapon_skills[P_BARE_HANDED_COMBAT].skill;

    if (!game.u.uwep && !worn(W_ARMS) && skl_lvl > P_BASIC)
        return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}

// src/uhitm.c:5198 missum() — the hero's attack misses.
//
// Draws nothing itself. Its three messages need pline plumbing and are
// recorded, but the WAKEUP is behaviour, not a message: a monster that was
// asleep stops being asleep, and wakeup() in turn calls setmangry(), which
// makes a peaceful monster hostile. That is state a later turn depends on.
//
// wakeup() is not ported -- it opens a chain through wake_msg, seemimic,
// finish_meating, growl, setmangry, ghod_hitsu and hot_pursuit -- so it is
// recorded here rather than approximated. Approximating it by just clearing
// msleeping would leave a peaceful monster peaceful after being attacked,
// which is a worse wrong answer than doing nothing.
export async function missum(mdef, mattk, wouldhavehit) {
    if (wouldhavehit)   /* a monk missing due to the body-armour penalty */
        await Your('armor is rather cumbersome...');

    /* could_seduce() needs the succubus/incubus arms; nothing ported can be
       one, so the middle branch is recorded rather than guessed */
    if (canspotmon(mdef) && game.flags?.verbose !== false)
        await You(`miss ${mon_nam(mdef)}.`);
    else
        await You('miss it.');

    if (!helpless(mdef))
        await wakeup(mdef, true);
}

// src/uhitm.c known_hitum() — resolve a hit or miss that the hero knows about.
//
// THE FIRST FUNCTION IN THIS CHAIN THAT DRAWS, and the draws are nested:
// rn2(25) gates the flee check, and only if that passes does rn2(3) decide
// whether monflee gets rnd(100) or 0. So a healthy monster costs one draw, a
// wounded one that passes the gate costs two or three.
//
// mhit is C's in/out parameter: a Vorpal Blade hit against a headless target
// is converted back to a miss. It is passed as a one-element array so the
// caller sees the change, and the conduct counter is rolled back with it --
// a miss must not count as having hit with a weapon.
//
// hmon (the damage) and cutworm (long worms) are recorded, not approximated.
// Without hmon the monster takes no damage, so mhp stays equal to oldhp and
// the Vorpal-miss branch fires every time; that is noted at the branch so the
// behaviour is not mistaken for a bug later.
export async function known_hitum(mon, weapon, mhit, rollneeded, armorpenalty,
                            uattk, dieroll) {
    let malive = true;
    /* hmon() might destroy the weapon; remember the aspect for cutworm */
    const slice_or_chop = !!(weapon && (is_blade(weapon) || is_axe(weapon)));

    if (game.override_confirmation)
        note_unported_uhitm('known_hitum:bloodthirsty_blade_message');

    if (!mhit[0]) {
        await missum(mon, uattk, (rollneeded + armorpenalty > dieroll));
    } else {
        const oldhp = mon.mhp;
        const oldweaphit = game.u.uconduct?.weaphit ?? 0;

        /* KMH, conduct */
        if (weapon && (weapon.oclass === OCLASSES.WEAPON_CLASS
                       || is_weptool(weapon, game.objects))) {
            game.u.uconduct = game.u.uconduct || {};
            if (!oldweaphit) {
                /* src/uhitm.c:1962 first_weapon_hit() — log before the
                   monster possibly dies; buf is [cursed ]simpleonames */
                const { livelog_add } = await import('./pline.js');
                const { xname } = await import('./objnam.js');
                let wnam = xname(weapon);
                if (weapon.cursed && weapon.bknown)
                    wnam = `cursed ${wnam}`;
                livelog_add(
                    `hit with a wielded weapon (${wnam}) for the first time`);
            }
            game.u.uconduct.weaphit = oldweaphit + 1;
        }

        /* src/uhitm.c:1039 — hmon() applies the damage and may kill the
           monster; it returns whether the monster survived. */
        malive = await hmon(mon, weapon, HMON_MELEE, dieroll);

        if (malive) {
            /* C integer division: a 3-hp-max jackal at 1 hp is NOT below
               mhpmax/2 (3/2 == 1, 1 < 1 false); float division made it
               flee and spend rn2(3)+rnd(100) C never drew */
            if (!rn2(25) && mon.mhp < Math.trunc(mon.mhpmax / 2)
                && !game.u.uswallow) {
                monflee(mon, !rn2(3) ? rnd(100) : 0, false, true);

                if (game.u.ustuck === mon && !game.u.uswallow)
                    set_ustuck(null);
            }
            /* Vorpal Blade hit converted to miss: headless monster or worm
               tail. NOTE: with hmon unported the monster never loses hp, so
               this fires on every hit. It is faithful to the C given no
               damage was applied. */
            if (mon.mhp === oldhp) {
                mhit[0] = 0;
                /* a miss is not a hit; uconduct is a zeroed struct in C */
                (game.u.uconduct ||= {}).weaphit = oldweaphit;
            }
            if (mon.wormno && mhit[0])
                note_unported_uhitm('known_hitum:cutworm');
        }
    }
    return malive;
}

// src/uhitm.c hitum() — one melee attack sequence, possibly two hits.
//
// This is where the chain's draws finally land in order:
//     find_roll_to_hit   (no draw)
//     mon_maybe_unparalyze   rn2(10), ONLY if the target cannot move
//     rnd(20)                the die
//     known_hitum            rn2(25), then rn2(3) and rnd(100) if it gates
// and the whole sequence repeats for a second hit when twohits is set.
//
// twohits is 0 for a single hit and 1 for the first of two, and known_hitum's
// callees read it, which is why it is game state rather than a local. It is
// set to 2 before the second hit and cleared at the end.
//
// Not ported, each recorded: hitum_cleave (wielded Cleaver), passive (the
// monster's counter-attack, 256 lines and it draws), and the exercise(A_DEX)
// on a successful hit.

/* monst_data stores each attack as [aatyp, adtyp, damn, damd]; the C reads
   them as named fields. */
const mattk_row = (a) => ({ aatyp: a[0], adtyp: a[1], damn: a[2], damd: a[3] });
export async function hitum(mon, uattk) {
    const wepbefore = game.u.uwep;
    const secondwep = game.u.twoweap ? game.u.uswapwep : null;
    const x = game.u.ux + game.u.dx, y = game.u.uy + game.u.dy;
    const oldumort = game.u.umortality || 0;
    const out = { attk_count: 0, role_roll_penalty: 0 };

    if (game.u.uwep && game.u.uwep.oartifact)
        note_unported_uhitm('hitum:cleaver_check');

    /* 0: single hit, 1: first of two; hmon_hitmon reads it downstream */
    game.twohits = (game.u.uwep ? game.u.twoweap : double_punch()) ? 1 : 0;

    let tmp = await find_roll_to_hit(mon, uattk.aatyp, game.u.uwep, out);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);
    const mhit = [(tmp > dieroll || game.u.uswallow) ? 1 : 0];
    if (tmp > dieroll)
        exercise(A_DEX, true);          /* src/uhitm.c hitum() */

    let malive = await known_hitum(mon, game.u.uwep, mhit, tmp,
                             out.role_roll_penalty, uattk, dieroll);
    const wep_was_destroyed = !!(wepbefore && !game.u.uwep);
    passive(mon, game.u.uwep, mhit[0], malive, ATTKS.AT_WEAP,
            wep_was_destroyed);

    /* second attack for two-weapon combat or skilled unarmed combat */
    if (game.twohits && !(game.override_confirmation
                          || (game.multi || 0) < 0
                          || (game.u.umortality || 0) > oldumort
                          || !malive || m_at(x, y) !== mon)) {
        game.twohits = 2;               /* second of 2 hits */
        tmp = await find_roll_to_hit(mon, uattk.aatyp, game.u.uswapwep, out);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);
        mhit[0] = (tmp > dieroll || game.u.uswallow) ? 1 : 0;
        malive = await known_hitum(mon, secondwep, mhit, tmp,
                             out.role_roll_penalty, uattk, dieroll);
        /* the second counter-attack only happens if the second hit lands */
        if (mhit[0])
            note_unported_uhitm('hitum:passive2');
    }
    game.twohits = 0;
    return malive;
}

// src/uhitm.c passive() — the monster's counter-attack after the hero hits it.
//
// hitum calls this unconditionally, so its FIRST action matters on every
// single melee swing: it scans the monster's attack table for an AT_NONE
// slot, which is how a passive attack is encoded. Most monsters have none and
// the function returns having drawn NOTHING. That early return is the common
// path and is why porting the head alone is worth doing.
//
// When a passive attack IS present, the damage roll happens BEFORE the switch
// and regardless of which arm runs:
//     d(damn, damd)        if damn is set
//     d(m_lev + 1, damd)   otherwise, if damd is set
//     0                    if neither
// C's own comment notes tmp is not always used, but the DRAW still happens.
// That is the trap: a port that computed the damage inside the arm that needs
// it would skip a draw for every arm that does not.
//
// The switch itself -- AD_FIRE, AD_ACID, AD_STON, AD_RUST, AD_CORR, AD_MAGM,
// AD_ENCH and the rest, each with its own draws -- is recorded, not faked.
export function passive(mon, weapon, mhitb, maliveb, aatyp, wep_was_destroyed) {
    const ptr = game.mons[mon.mnum];
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    const malive = maliveb ? M_ATTK_HIT : M_ATTK_MISS;

    let i;
    for (i = 0; ; i++) {
        if (i >= NATTK)
            return malive | mhit;       /* no passive attacks: NO DRAW */
        if (ptr.mattk[i] && ptr.mattk[i][0] === ATTKS.AT_NONE)
            break;                      /* try this one */
    }

    /* Note: tmp is not always used, but the draw happens regardless */
    const damn = ptr.mattk[i][2], damd = ptr.mattk[i][3];
    if (damn)
        d(damn, damd);
    else if (damd)
        d(mon.m_lev + 1, damd);

    /*  These affect you even if they just died.  */
    const adtyp = ptr.mattk[i][1];
    switch (adtyp) {
    case ATTKS.AD_FIRE:
        /* every draw here is behind THREE guards: the hit landed, the monster
           is not cancelled, and the hero was using an object. A bare-handed
           miss against a red mold draws nothing past the d() above. */
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.uarmf && !rn2(6))
                    note_unported_uhitm('passive:erode_obj:burn');
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                note_unported_uhitm('passive:passive_obj:fire');
        }
        break;
    case ATTKS.AD_ACID:
        /* NOTE the asymmetry with AD_FIRE: this arm's first block is guarded
           by mhitb alone -- no !mcan, no weapon -- so a cancelled acid blob
           still splashes you, and the rn2(2) fires bare-handed. The second
           block then repeats the weapon test separately. Folding the two
           blocks together would lose the rn2(2) on every bare-handed hit. */
        if (mhitb && rn2(2)) {
            note_unported_uhitm('passive:acid_splash');   /* mdamageu */
            if (!rn2(30))
                note_unported_uhitm('passive:erode_armor:corrode');
        }
        if (mhitb && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.uarmf && !rn2(6))
                    note_unported_uhitm('passive:erode_obj:corrode');
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                note_unported_uhitm('passive:passive_obj:acid');
        }
        note_unported_uhitm('passive:exercise:A_STR');
        break;
    case ATTKS.AD_STON:
        /* no draw of its own. The protection test decides whether you are
           stoned, and returns a THIRD value, M_ATTK_DEF_DIED, which neither
           of the two flag words above can express. */
        if (mhitb) {
            note_unported_uhitm('passive:attk_protection');
            /* Stone_resistance / poly_when_stoned / polymon / done_in_by */
        }
        break;
    case ATTKS.AD_RUST:
    case ATTKS.AD_CORR:
        /* Same three guards as AD_FIRE, but WITHOUT its !rn2(6): rust and
           corrosion erode the boots every time, fire and acid only one kick
           in six. Sharing one helper across all four arms -- they are
           otherwise character-for-character identical -- would silently add
           a draw to these two or drop it from the other two. */
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === ATTKS.AT_KICK) {
                if (game.uarmf)
                    note_unported_uhitm('passive:erode_obj:rust_corr');
            } else if (aatyp === ATTKS.AT_WEAP || aatyp === ATTKS.AT_CLAW
                       || aatyp === ATTKS.AT_MAGC || aatyp === ATTKS.AT_TUCH)
                note_unported_uhitm('passive:passive_obj:rust_corr');
        }
        break;
    case ATTKS.AD_MAGM:
        /* wrath of gods for attacking Oracle -- no draw either way */
        note_unported_uhitm('passive:magic_missiles');
        break;
    case ATTKS.AD_ENCH:     /* KMH -- remove enchantment (disenchanter) */
        /* The `break`s inside this if leave the SWITCH, not the if, so they
           skip passive_obj entirely. A kick with no weapon, and any bite,
           butt or sting, involve no object and get nothing. */
        if (mhitb) {
            if (aatyp === ATTKS.AT_KICK) {
                if (!weapon)
                    break;
            } else if (aatyp === ATTKS.AT_BITE || aatyp === ATTKS.AT_BUTT
                       || (aatyp >= ATTKS.AT_STNG && aatyp < ATTKS.AT_WEAP)) {
                break;                  /* no object involved */
            }
            note_unported_uhitm('passive:passive_obj:ench');
        }
        break;
    default:
        break;      /* C's default arm is empty (src/uhitm.c passive()) */
    }

    /*  These only affect you if they still live.
     *
     *  A SECOND switch, and its guard holds an rn2(3) that fires on every
     *  passive encounter where the monster survives and is not cancelled --
     *  far more often than any single arm of the switch above. Reading
     *  passive as one switch loses this draw on essentially every melee
     *  exchange with a passive monster.
     */
    if (malive && !mon.mcan && rn2(3)) {   /* C tests malive, the flag word,
           not maliveb. M_ATTK_MISS is 0x0 and M_ATTK_HIT is 0x1, so their
           truthiness is identical and this is behaviourally the same; written
           as C writes it so a grep for the C line finds this one. */
        switch (adtyp) {
        case ATTKS.AD_PLYS:
        case ATTKS.AD_COLD:
        case ATTKS.AD_STUN:
        case ATTKS.AD_FIRE:
        case ATTKS.AD_ELEC:
            /* the five arms of C's second switch (paralysis, brown mold or
               blue jelly chill, yellow mold stun, fire, shock) */
            note_unported_uhitm(`passive:alive_switch:adtyp=${adtyp}`);
            break;
        default:
            break;  /* C's default arm is empty */
        }
    }

    return malive | mhit;
}

// src/uhitm.c hmon() — the damage entry point.
//
// Thin, but not empty: the anger_guards flag is captured BEFORE hmon_hitmon
// runs, because hmon_hitmon can kill the monster or change its peacefulness,
// and the guards must be angered based on what it was when struck.
//
// The rn2(2) for a priest is unconditional on the priest existing, so it fires
// whether or not ghod_hitsu does anything.
//
// hmon_hitmon (the damage itself), ghod_hitsu and angry_guards are recorded.
export async function hmon(mon, obj, thrown, dieroll) {
    const anger_guards = !!(mon.mpeaceful
                            && (mon.ispriest || mon.isshk
                                || is_watch(game.mons[mon.mnum])));

    const result = await hmon_hitmon(mon, obj, thrown, dieroll);        /* hmon_hitmon returns whether mon survives */

    if (mon.ispriest && !rn2(2))
        note_unported_uhitm('hmon:ghod_hitsu');
    if (anger_guards)
        note_unported_uhitm('hmon:angry_guards');

    return result;
}

// include/mondata.h:159 is_watch() — an IDENTITY test against two specific
// permonst entries, not a msound test. The first draft of this wrote it as
// `d.msound === MFLAGS.MS_WATCH`, and MS_WATCH does not exist, so it would
// have been silently false for every monster forever.
const is_watch = (d) =>
    d.pmidx === PMNAMES.PM_WATCHMAN || d.pmidx === PMNAMES.PM_WATCH_CAPTAIN;

// src/uhitm.c:1754 hmon_hitmon() — the melee damage path.
//
// 181 lines in C, but almost all of it is a struct init followed by a fixed
// dispatch order into helpers. Both halves are ported here; the helpers
// themselves are recorded and land one at a time.
//
// The struct init is pure assignment and draws nothing, but the field VALUES
// are not defaults to be filled in later -- several encode real conditions
// that the helpers branch on, and getting one wrong misroutes the dispatch
// rather than producing a slightly wrong number:
//
//   twohits        thrown ? 0 : gt.twohits  -- a thrown weapon never twohits
//   unarmed        !uwep && !uarm && !uarms -- a SHIELD makes you not unarmed
//   hand_to_hand   HMON_MELEE, or HMON_APPLIED with a POLEARM. An applied
//                  grapnel is explicitly not hand-to-hand.
//   get_dmg_bonus  starts TRUE and is cleared by helpers, not set by them.
//
// The dispatch order is fixed and each step can short-circuit the rest:
// do_hit (which may set doreturn), then dmg_recalc only if dmg > 0, then
// poison only if ispoisoned, then the dmg < 1 branch, then exactly one of
// jousting / stagger / the two-weapon arm, then the kill handling, then pet,
// splitmon and msg_hit.
export async function hmon_hitmon(mon, obj, thrown, dieroll) {
    let maybe_knockback = false;
    const hmd = {
        dmg: 0,
        thrown: thrown,
        twohits: thrown ? 0 : (game.twohits || 0),
        dieroll: dieroll,
        mdat: game.mons[mon.mnum],
        use_weapon_skill: false,
        train_weapon_skill: false,
        barehand_silver_rings: 0,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        material: obj ? game.objects[obj.otyp].oc_material : MATERIALS.NO_MATERIAL,
        jousting: 0,
        hittxt: false,
        get_dmg_bonus: true,
        /* src/uhitm.c:1779 — `!uwep && !uarm && !uarms`.
           KNOWN WRONG, deliberately left as-is for now: game.uwep,
           game.uarm and game.uarms do NOT exist (the real accessors are
           game.u.uwep and worn(W_ARM)/worn(W_ARMS)), so this is always
           true and every armed branch below is dead. Correcting it to
              !game.u.uwep && !worn(W_ARM) && !worn(W_ARMS)
           makes hmon_hitmon's knockback arm fire, which matches C's draws
           at uhitm.c:5258/5269 -- and then diverges one draw later at
           known_hitum's rn2(25) because our monster dies where C's lives.
           Net -2 screens (seed0360), so it is reverted until that
           downstream gap is fixed with it. See docs/plan/STATUS.md. */
        unarmed: !game.u.uwep && !worn(W_ARM) && !worn(W_ARMS),
        hand_to_hand: (thrown === HMON_MELEE
                       /* not grapnels; applied implies uwep */
                       || (thrown === HMON_APPLIED && is_pole(game.uwep))),
        ispoisoned: false,
        unpoisonmsg: false,
        needpoismsg: false,
        poiskilled: false,
        already_killed: false,
        offmap: false,
        destroyed: false,
        dryit: false,
        doreturn: false,
        retval: false,
        saved_oname: '',
    };

    await hmon_hitmon_do_hit(hmd, mon, obj);
    if (hmd.doreturn)
        return hmd.retval;

    if (hmd.dmg > 0)
        await hmon_hitmon_dmg_recalc(hmd, obj);

    if (hmd.ispoisoned)
        note_unported_uhitm('hmon_hitmon:poison');

    if (hmd.dmg < 1) {
        note_unported_uhitm('hmon_hitmon:no_damage');
    }

    if (hmd.jousting) {
        note_unported_uhitm('hmon_hitmon:jousting');
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj && !game.Upolyd) {
        hmon_hitmon_stagger(hmd, mon, obj);
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !game.Upolyd
               && !game.u.twoweap && game.u.uwep) {
        maybe_knockback = true;
    }

    if (!hmd.already_killed) {
        /* the conduct test that gates first_weapon_hit is NOT just "did you
           hit with a weapon": it also requires the object to be the wielded
           one (or the offhand while two-weaponing), a melee or applied blow
           rather than a throw, no jousting (already logged), real damage, and
           weaphit <= 1 -- the caller has already incremented it, which is why
           the first hit tests as 1 rather than 0. */
        if (obj && (obj === game.uwep
                    || (obj === game.uswapwep && game.u.twoweap))
            && (obj.oclass === OCLASSES.WEAPON_CLASS
                || is_weptool(obj, game.objects))
            && (thrown === HMON_MELEE || thrown === HMON_APPLIED)
            && !hmd.jousting
            && hmd.dmg > 0 && (game.u.uconduct?.weaphit ?? 0) <= 1)
            note_unported_uhitm('hmon_hitmon:first_weapon_hit');
        mon.mhp -= hmd.dmg;
    }
    /* adjustments might have made tmp become less than what a level-draining
       artifact has already done to max HP */
    if (mon.mhp > mon.mhpmax)
        mon.mhp = mon.mhpmax;

    /* src/uhitm.c:1863 — the flag the kill tail below reads. Without it the
       hero's melee kills never reached killed(). */
    if (DEADMONSTER(mon))
        hmd.destroyed = true;

    /* src/uhitm.c hmon_hitmon_pet() — abuse and flight, even if the pet is
       being killed (affects revival) */
    if (mon.mtame && hmd.dmg > 0) {
        await abuse_dog(mon); /* reduces tameness */
        /* flee if still alive and still tame */
        if (mon.mtame && !hmd.destroyed)
            monflee(mon, 10 * rnd(hmd.dmg), false, false);
    }

    /* src/uhitm.c hmon_hitmon_splitmon() — puddings split on iron/metal
       melee hits from the wielded weapon (or either hand when twoweap) */
    if ((hmd.mdat === game.mons[PMNAMES.PM_BLACK_PUDDING]
         || hmd.mdat === game.mons[PMNAMES.PM_BROWN_PUDDING])
        /* pudding is alive and healthy enough to split */
        && mon.mhp > 1 && !mon.mcan && !hmd.offmap
        && obj && (obj === game.u.uwep
                   || (game.u.twoweap && obj === game.u.uswapwep))
        && ((hmd.material === MATERIALS.IRON
             /* allow scalpel and tsurugi to split puddings */
             || hmd.material === MATERIALS.METAL)
            /* but not bashing with darts, arrows or ya */
            && !(is_ammo(obj) || is_missile(obj)))
        && hmd.hand_to_hand) {
        const mclone = clone_mon(mon, 0, 0);

        if (mclone) {
            let withwhat = '';
            if (game.u.twoweap && game.flags.verbose)
                withwhat = ` with ${yname(obj)}`;
            await pline(`${Monnam(mon)} divides as you hit it${withwhat}!`);
            hmd.hittxt = true;
            /* mintrap(mclone, NO_TRAP_FLAGS) */
            await mintrap(mclone, 0);
        }
    }
    await hmon_hitmon_msg_hit(hmd, mon, obj);

    if (hmd.silvermsg)
        await hmon_hitmon_msg_silver(hmd, mon, obj);

    /* src/uhitm.c:1897 -- the kill/survive tail.
       poiskilled and destroyed are separate branches, and BOTH check
       already_killed again before calling the kill, because an earlier stage
       may have done it. */
    if (hmd.needpoismsg)
        note_unported_uhitm('hmon_hitmon:needpoismsg');
    if (hmd.poiskilled) {
        note_unported_uhitm('hmon_hitmon:poison_deadly');
        if (!hmd.already_killed)
            await xkilled(mon, XKILL_NOMSG);
        hmd.destroyed = true;
    } else if (hmd.destroyed) {
        if (!hmd.already_killed)
            await killed(mon);
    } else if (game.u.umconf && hmd.hand_to_hand) {
        /* confused-touch: resist() DRAWS */
        nohandglow(mon);
        note_unported_uhitm('hmon_hitmon:resist_confuse');
    }
    if (hmd.unpoisonmsg)
        note_unported_uhitm('hmon_hitmon:unpoisonmsg');

    /* A monster that is still here gets woken and angered. This is the piece
       that makes a swing have consequences beyond damage: wakeup calls
       setmangry, which turns a peaceful monster hostile and costs alignment.
       Both are ported, so this is a real call chain. */
    if (!hmd.destroyed && !hmd.offmap) {
        await wakeup(mon, true);
        /* src/uhitm.c:1926 — a solid weapon hit can hurl the defender. The
           two leading draws inside mhitm_knockback happen unconditionally,
           so skipping the call loses them for every armed hit. */
        if (maybe_knockback)
            await mhitm_knockback(game.youmonst, mon,
                                  game.youmonst.data.mattk[0],
                                  { hitflags: M_ATTK_HIT }, true);
    }

    /* src/uhitm.c:1934 — `return hmd.destroyed ? FALSE : TRUE`. This used to
       return hmd.retval, which is initialised false and only set true on the
       hit_no_harm path, so EVERY ordinary hit reported the monster dead and
       known_hitum's whole post-hit block (its rn2(25) flee check among
       others) was unreachable. */
    return hmd.destroyed ? false : true;
}

/* include/obj.h is_pole() — the real predicate lives in js/u_init.js; this
   file used to carry a stub that always returned false after recording. */

// src/uhitm.c:1387 hmon_hitmon_do_hit() — routes the blow by what is in hand.
//
// Pure dispatch, no draw of its own; everything it calls draws. Three things
// in it are load-bearing:
//
// The stone-missile early return is the only path here that ends the blow. It
// applies to THROWN and KICKED but explicitly NOT Applied, and it calls
// wakeup(mon, TRUE) -- so a rock bouncing off a xorn still angers it, and
// still costs alignment through setmangry, even though it does no damage.
//
// saved_oname is captured BEFORE the helpers run because the object may be
// destroyed by them and the name is still needed afterwards. The lamplit
// artifact case takes the bare name so a lit Sunsword does not announce
// itself.
//
// The GEM_CLASS in the weapon test is not a mistake: gems are thrown at
// unicorns and go through the weapon path.
async function hmon_hitmon_do_hit(hmd, mon, obj) {
    if (!obj) {                         /* attack with bare hands */
        hmon_hitmon_barehands(hmd, mon);
    } else {
        if ((hmd.thrown === HMON_THROWN || hmd.thrown === HMON_KICKED)
            && note_stone_missile_unported(obj) && passes_rocks(hmd.mdat)) {
            note_unported_uhitm('hmon_hitmon:hit_no_harm');
            await wakeup(mon, true);
            hmd.doreturn = true;
            hmd.retval = true;
            return;
        }
        /* remember obj's name since it might end up being destroyed and
           we'll want to use it after that. bare_artifactname needs a lit
           artifact light, which no object here can be yet. */
        if (obj.oartifact && obj.lamplit)
            note_unported_uhitm('hmon_hitmon:bare_artifactname');
        else
            hmd.saved_oname = cxname(obj);

        if (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects)
            || obj.oclass === OCLASSES.GEM_CLASS) {
            await hmon_hitmon_weapon(hmd, mon, obj);
            if (hmd.doreturn)
                return;
        /* attacking with non-weapons */
        } else if (obj.oclass === OCLASSES.POTION_CLASS) {
            note_unported_uhitm('hmon_hitmon:potion');
            if (hmd.doreturn)
                return;
        } else {
            if (hmd.mdat === game.mons[PMNAMES.PM_SHADE] && !shade_aware(obj)) {
                hmd.dmg = 0;
            } else {
                await hmon_hitmon_misc_obj(hmd, mon, obj);
            }
        }
    }
}

// src/uhitm.c:1280 hmon_hitmon_misc_obj() - non-weapon impact effects.
async function hmon_hitmon_misc_obj(hmd, mon, obj) {
    switch (obj.otyp) {
    case ONAMES.CREAM_PIE:
    case ONAMES.BLINDING_VENOM: {
        mon.msleeping = 0;
        const can_blind = haseyes(hmd.mdat)
                          && !(!mon.mcansee && !(mon.mblinded || 0));

        if (can_blind) {
            if (game.u.ublind) {
                await pline(obj.otyp === ONAMES.CREAM_PIE ? 'Splat!'
                                                          : 'Splash!');
            } else if (obj.otyp === ONAMES.BLINDING_VENOM) {
                await pline(`The venom blinds ${mon_nam(mon)}${
                    mon.mcansee ? '' : ' further'}!`);
            } else {
                let whom = mon_nam(mon);
                const what = The(xname(obj));

                if (haseyes(hmd.mdat)
                    && hmd.mdat !== game.mons[PMNAMES.PM_FLOATING_EYE])
                    whom = `${s_suffix(whom)} ${mbodypart(mon, FACE)}`;
                await pline(`${what} ${vtense(what, 'splash')} over ${whom}!`);
            }
            await setmangry(mon, true);
            mon.mcansee = 0;
            const duration = rn1(25, 21);
            mon.mblinded = Math.min(127, (mon.mblinded || 0) + duration);
        } else {
            await pline(obj.otyp === ONAMES.CREAM_PIE ? 'Splat!' : 'Splash!');
            await setmangry(mon, true);
        }

        if (hmd.thrown) {
            if (obj === game.thrownobj)
                game.thrownobj = null;
        } else {
            useup(obj);
        }
        hmd.hittxt = true;
        hmd.get_dmg_bonus = false;
        hmd.dmg = 0;
        break;
    }
    default:
        note_unported_uhitm('hmon_hitmon:misc_obj');
        break;
    }
}

// include/mondata.h:208 passes_rocks() — a header macro with no JS home yet.
// Both halves exist: passes_walls is in this file, unsolid in js/mondata.js.
export const passes_rocks = (ptr) => passes_walls(ptr) && !unsolid(ptr);

// src/dothrow.c stone_missile() /
// src/uhitm.c shade_aware() — recorded.
function note_stone_missile_unported(obj) {
    note_unported_uhitm('hmon_hitmon:stone_missile');
    return false;
}
const shade_aware = (o) => { note_unported_uhitm('hmon_hitmon:shade_aware'); return false; };

// src/uhitm.c:1663 hmon_hitmon_msg_silver() — "Your silver X sears ...".
async function hmon_hitmon_msg_silver(hmd, mon, obj) {
    let fmt_head;
    let whom = mon_nam(mon);

    if (canspotmon(mon)) {
        if (hmd.barehand_silver_rings === 1)
            fmt_head = 'Your silver ring sears ';
        else if (hmd.barehand_silver_rings === 2)
            fmt_head = 'Your silver rings sear ';
        else if (hmd.silverobj && hmd.saved_oname) {
            fmt_head = `Your ${hmd.saved_oname.includes('silver') ? ''
                              : 'silver '}${hmd.saved_oname} `
                       + `${vtense(hmd.saved_oname, 'sear')} `;
        } else
            fmt_head = 'The silver sears ';
    } else {
        whom = whom[0].toUpperCase() + whom.slice(1); /* "it" -> "It" */
        fmt_head = null; /* "%s is seared!" */
    }
    if (!noncorporeal(hmd.mdat) && !amorphous(hmd.mdat))
        whom = s_suffix(whom) + ' flesh';
    if (fmt_head === null)
        await pline(`${whom} is seared!`);
    else
        await pline(`${fmt_head}${whom}!`);
}

// src/uhitm.c:1570 hmon_hitmon_stagger() — a very small chance of stunning an
// unarmed opponent. The rnd(100) is spent BEFORE the size and hide tests, so
// it costs a draw on every qualifying bare-handed hit whatever the target is.
function hmon_hitmon_stagger(hmd, mon, obj) {
    const sk = game.u.weapon_skills;
    const P_SKILL = (t) => sk[t].skill;

    if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT) && !bigmonst(hmd.mdat)
        && !thick_skinned(hmd.mdat)) {
        if (canspotmon(mon))
            note_unported_uhitm('hmon_hitmon_stagger:message');
        note_unported_uhitm('hmon_hitmon_stagger:mhurtle_to_doom');
        hmd.hittxt = true;
    }
}

// src/uhitm.c:838 hmon_hitmon_barehands() — the bare-handed damage roll.
//
// The rnd() sits in the ELSE of the shade test, so punching a shade draws
// NOTHING. That is the whole shape of the function: a shade is immune to
// bare hands, and C does not roll damage it would discard.
//
// train_weapon_skill is set from the ROLL, not from a constant: you only
// train bare-handed combat when the d2/d4 came up above 1. A port that set
// it TRUE unconditionally would train skill on every punch.
//
// The glove/ring mask is a priority, not a sum. Gloves shadow rings
// entirely -- rings are worn UNDER gloves -- and two silver rings never
// stack. Which ring counts depends on twohits: 0 checks both (C calls this
// backwards compatibility for playability), 1 the right, 2 the left, and a
// polymorphed hero's third or later hit gets neither.
//
// special_dmgval is recorded, so silverhit stays 0 and no silver bonus is
// added yet.
function hmon_hitmon_barehands(hmd, mon) {
    const silverhit = 0;                /* worn masks */

    if (hmd.mdat === game.mons[PMNAMES.PM_SHADE]) {
        hmd.dmg = 0;                    /* NO DRAW on this path */
    } else {
        /* note: 1..2 or 1..4 can be substantially increased by
           strength bonus or skill bonus, usually both... */
        hmd.dmg = rnd(!martial_bonus() ? 2 : 4);
        hmd.use_weapon_skill = true;
        hmd.train_weapon_skill = (hmd.dmg > 1);
    }

    /* gloves shadow rings; two silver rings do not stack */
    const spcdmgflg = game.u.uarmg ? W_ARMG
                    : (((hmd.twohits === 0 || hmd.twohits === 1) ? W_RINGR : 0)
                       | ((hmd.twohits === 0 || hmd.twohits === 2) ? W_RINGL : 0));
    note_unported_uhitm('hmon_hitmon:special_dmgval');

    switch (hmd.twohits) {
    case 0:     /* one hit attempted; either hand's silver ring applies, and
                 * wearing two is the same as wearing one */
        hmd.barehand_silver_rings = (silverhit & (W_RINGR | W_RINGL)) ? 1 : 0;
        break;
    case 1:     /* first of two or more; right ring applies */
        hmd.barehand_silver_rings = (silverhit & W_RINGR) ? 1 : 0;
        break;
    case 2:     /* second of two or more; left ring applies */
        hmd.barehand_silver_rings = (silverhit & W_RINGL) ? 1 : 0;
        break;
    default:    /* third or later hit of a polymorphed hero; the rings were
                 * already applied on the first and second */
        hmd.barehand_silver_rings = 0;
        break;
    }
    if (hmd.barehand_silver_rings > 0)
        hmd.silvermsg = true;
}

// src/uhitm.c:1070 hmon_hitmon_weapon() — melee blow, or wrong-tool blow?
//
// Pure routing, no draw. The four OR'd clauses are the ways to hit something
// with a weapon that is not being used as one:
//
//   is_launcher                 swinging a bow like a club
//   !thrown && missile/ammo     jabbing with an arrow held in hand
//   !thrown && !usteed && pole  a polearm at arm's length, on foot. Mounted
//                               is fine, and ART_SNICKERSNEE is exempt.
//   ammo without its launcher   thrown, but not from the matching bow
//
// The polearm clause needs BOTH !u.usteed and the artifact test; dropping
// either turns a legitimate mounted lance charge into a fumble.
//
// is_launcher, is_missile, is_ammo, is_art and ammo_and_launcher are
// recorded, so today every weapon blow routes to the melee arm -- which is
// the correct behaviour for an ordinary weapon and wrong only for the four
// cases above, none of which can arise before those predicates exist.
async function hmon_hitmon_weapon(hmd, mon, obj) {
    /* is it not a melee weapon? */
    if (/* if you strike with a bow... */
        is_launcher_w(obj)
        /* or strike with a missile in your hand... */
        || (!hmd.thrown && (is_missile(obj) || is_ammo(obj)))
        /* or use a pole at short range and not mounted... */
        || (!hmd.thrown && !game.u.usteed && is_pole(obj)
            && obj.oartifact !== ART_SNICKERSNEE)
        /* or throw a missile without the proper bow... */
        || (is_ammo(obj) && (hmd.thrown !== HMON_THROWN
                             || !ammo_and_launcher(obj, game.u.uwep)))) {
        await hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        await hmon_hitmon_weapon_melee(hmd, mon, obj);
        if (hmd.doreturn)
            return;
    }
}

// src/uhitm.c:891 hmon_hitmon_weapon_ranged() — 1-2 points, no skill use.
async function hmon_hitmon_weapon_ranged(hmd, mon, obj) {
    /* shade_glare() (silver/blessed passes) is recorded; a shade takes 0 */
    if (hmd.mdat === game.mons[PMNAMES.PM_SHADE]
        && !shade_aware(obj))
        hmd.dmg = 0;
    else
        hmd.dmg = rnd(2);
    if (hmd.material === MATERIALS.SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = hmd.silverobj = true;
        /* if it will already inflict dmg, make it worse */
        hmd.dmg += rnd(hmd.dmg ? 20 : 10);
    }
    if (!hmd.thrown && obj === game.u.uwep
        && obj.otyp === ONAMES.BOOMERANG && rnl(4) === 4 - 1) {
        const more_than_1 = (obj.quan > 1);

        await pline(`As you hit ${mon_nam(mon)}, `
                    + `${more_than_1 ? 'one of ' : ''}${yname(obj)}`
                    + ` breaks into splinters.`);
        if (!more_than_1)
            uwepgone(); /* set gu.unweapon */
        useup(obj);
        hmd.hittxt = true;
        if (hmd.mdat !== game.mons[PMNAMES.PM_SHADE])
            hmd.dmg++;
    }
}

/* include/obj.h:235 is_launcher() — same one-liner js/wield.js keeps. */
const is_launcher_w = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_skill >= SKILLS.P_BOW
    && game.objects[o.otyp].oc_skill <= SKILLS.P_CROSSBOW;

// src/uhitm.c:934 hmon_hitmon_weapon_melee() — "normal" weapon usage.
//
// Head only. The base damage comes from dmgval (src/weapon.c, now ported),
// and train_weapon_skill is set from the RESULT: a minimal hit does not
// exercise proficiency, same rule as the bare-handed path.
//
// The Healer knife bonus is not a draw but it is not a constant either --
// it scales with how many of THIS species you have already killed,
// min(3, mvitals[monsndx].died / 6), so it needs the mvitals table.
//
// The special-attack chain below the head is a single if/else if ladder, so
// AT MOST ONE of backstab, weapon-shatter and the rest can fire. Its first
// arm is a guard that disables all of them: no skill training, or the
// monster is holding you, or you are two-weaponing, or the weapon is
// Cleaver. Porting the arms as independent ifs would let several fire at
// once and would draw where C draws nothing.
async function hmon_hitmon_weapon_melee(hmd, mon, obj) {
    /* "normal" weapon usage */
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval(obj, mon);
    /* a minimal hit doesn't exercise proficiency */
    hmd.train_weapon_skill = (hmd.dmg > 1);

    /* Healer with anatomy knowledge */
    if (Role_if(PMNAMES.PM_HEALER) && hmd.hand_to_hand
        && obj.oclass === OCLASSES.WEAPON_CLASS
        && game.objects[obj.otyp].oc_skill === P_KNIFE)
        note_unported_uhitm('hmon_hitmon:healer_anatomy');   /* mvitals */

    /* special attack actions -- an if/else ladder: at most one fires */
    if (!hmd.train_weapon_skill || mon === game.u.ustuck || game.u.twoweap
        || (hmd.hand_to_hand && note_unported_uhitm('hmon_hitmon:is_art_CLEAVER'))) {
        ;   /* no special bonuses */
    } else {
        note_unported_uhitm('hmon_hitmon:special_attacks');
    }

    if (obj.oartifact
        && await artifact_hit_u(hmd, mon, obj)) {
        if (DEADMONSTER(mon)) {
            hmd.doreturn = true;
            hmd.retval = false;
            return;
        }
        if (hmd.dmg === 0) {
            hmd.doreturn = true;
            hmd.retval = true;
            return;
        }
        hmd.hittxt = true;
    }

    /* src/uhitm.c:1035 — silver weapon against a silver-hater flags the
       sear message; the extra damage itself came from dmgval's rnd(20) */
    if (hmd.material === MATERIALS.SILVER && mon_hates_silver(mon))
        hmd.silvermsg = hmd.silverobj = true;
    if (obj.oartifact && obj.lamplit)
        note_unported_uhitm('hmon_hitmon:lightobj'); /* artifact_light */
}

// src/artifact.c:1447 artifact_hit(), hero-attacker slice. Mjollnir prints its
// own hit message when the target square is visible, then consumes an item
// destruction roll even when it is not. Other artifact attacks retain their
// damage bonus here and stay recorded until their individual effects land.
async function artifact_hit_u(hmd, mon, obj) {
    const art = get_artifact(obj);
    const attack = /^([A-Z_]+)/.exec(art.attk || '')?.[1] || 'PHYS';
    const hittee = mon_nam(mon);

    hmd.dmg += spec_dbon(obj, mon, hmd.dmg);

    if (attack !== 'ELEC') {
        if (attack !== 'PHYS')
            note_unported_uhitm(`artifact_hit:${attack}`);
        return false;
    }

    const applies = !!game.spec_dbon_applies;
    const realizes_damage = cansee(mon.mx, mon.my) || mon === game.u.ustuck;
    if (realizes_damage) {
        await pline(`The massive hammer hits${
            applies ? '!  Lightning strikes' : ''} ${hittee}${
            applies ? '!' : '.'}`);
    }
    if (applies)
        wake_nearto(mon.mx, mon.my, 4 * 4);
    if (!rn2(5))
        hmd.dmg += await destroy_items(mon, ATTKS.AD_ELEC, hmd.dmg);
    return realizes_damage;
}

// src/uhitm.c:1436 hmon_hitmon_dmg_recalc() — damage, strength and skill
// bonuses applied on top of the base roll.
//
// No draw of its own; dbon() and weapon_dam_bonus() are table lookups.
// What matters here is the arithmetic, and the two scaling cases round
// DIFFERENTLY:
//
//   dual attack        (3 * abs + 2) / 4    3/4 of the strength bonus
//   two-handed melee   (3 * abs + 1) / 2    3/2 of the strength bonus
//
// The +2 and the +1 are not interchangeable rounding fudge -- they are what
// make two hits at 3/4 each total more than one regular hit, while a
// two-handed blow approximately matches a double hit. Both use sgn() so a
// NEGATIVE strength bonus stays negative through the scaling; taking abs()
// and dropping the sign would turn a penalty into a bonus.
//
// The strength bonus is skipped entirely for ammo fired from its matching
// launcher: that gets the ring-of-increase-damage bonus but no strength.
//
// dbon, weapon_dam_bonus, ammo_and_launcher, PROJECTILE, weapon_type,
// uwep_skill_type and use_skill are recorded.
async function hmon_hitmon_dmg_recalc(hmd, obj) {
    let dmgbonus = 0, strbonus, absbonus;

    if (hmd.get_dmg_bonus) {
        /* for dual attacks, udaminc applies to both, and two-handed
           weapons use it as-is */
        dmgbonus = game.u.udaminc || 0;
        if (hmd.thrown !== HMON_THROWN
            || !obj || !game.u.uwep
            || !ammo_and_launcher(obj, game.u.uwep)) {
            strbonus = dbon();
            absbonus = Math.abs(strbonus);
            if (hmd.twohits)
                strbonus = (((3 * absbonus + 2) / 4) | 0) * sgn(strbonus);
            else if (hmd.thrown === HMON_MELEE && game.u.uwep
                     && bimanual(game.u.uwep))
                strbonus = (((3 * absbonus + 1) / 2) | 0) * sgn(strbonus);
            dmgbonus += strbonus;
        }
    }

    if (hmd.use_weapon_skill) {
        let skillwep = obj;

        /* PROJECTILE() null-guards in C: bare-handed hits pass obj null */
        if (obj && (is_ammo(obj) || is_missile(obj))
            && ammo_and_launcher(obj, game.u.uwep))
            skillwep = game.u.uwep;
        dmgbonus += weapon_dam_bonus(skillwep);

        /* hit for more than minimal damage (before being adjusted for
           damage or skill bonus) trains the skill toward future
           enhancement */
        if (hmd.train_weapon_skill) {
            /* [this assumes that `!thrown' implies wielded...] */
            const wtype = hmd.thrown ? weapon_type(skillwep)
                                     : uwep_skill_type();
            await use_skill(wtype, 1);
        }
    }

    /* apply combined damage+strength and skill bonuses */
    hmd.dmg += dmgbonus;
    /* don't let penalty, if bonus is negative, turn a hit into a miss */
    if (hmd.dmg < 1)
        hmd.dmg = 1;
}

// src/weapon.c:993 dbon() — the Strength damage bonus. A weak hero takes a
// PENALTY, which is why stubbing this at 0 made light hits kill monsters C
// leaves alive.
function dbon() {
    const str = ACURR(A_STR);

    if (game.Upolyd)
        return 0;

    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str === 18)
        return 2;                       /* up to 18 */
    else if (str <= STR18(75))
        return 3;                       /* up to 18/75 */
    else if (str <= STR18(90))
        return 4;                       /* up to 18/90 */
    else if (str < STR18(100))
        return 5;                       /* up to 18/99 */
    else
        return 6;
}

// src/uhitm.c:1637 hmon_hitmon_msg_hit() — the "You hit it!" line.
//
// SCREEN-VISIBLE, so unlike the rest of this chain the scoreboard can see it
// once do_attack is wired.
//
// The verb is chosen by what is in your hand, in a fixed priority: a shield
// or a heavy iron ball BASHES, a whip or wet towel LASHES, a Barbarian
// SMITES, and everything else HITS. The Barbarian arm is only reached when
// the object tests fail, so a Barbarian swinging a whip lashes.
//
// The punctuation is exclam(dmg), which reports the damage band: "." for 4
// or less, "!" above. It is only used when you can SEE the monster;
// otherwise the line ends in a plain period regardless of how hard you hit.
//
// The guard is subtle: the message is suppressed when hittxt is already set
// (a special attack printed its own line) OR when the object was destroyed --
// except for a multishot volley still in flight, which keeps announcing.
//
// mon_nam, mshot_xname, is_shield and is_wet_towel are recorded; the whip
// and heavy-iron-ball tests are real.
async function hmon_hitmon_msg_hit(hmd, mon, obj) {
    if (!hmd.hittxt
        && (!hmd.destroyed
            || (hmd.thrown && (game.m_shot?.n ?? 0) > 1
                && game.m_shot?.o === obj?.otyp))) {
        if (hmd.thrown) {
            note_unported_uhitm('msg_hit:mshot_xname');
        } else if (!game.flags?.verbose) {
            await You('hit it.');
        } else {    /* hand_to_hand */
            const verb =
                (obj && (note_unported_uhitm('msg_hit:is_shield')
                         || obj.otyp === ONAMES.HEAVY_IRON_BALL)) ? 'bash'
                : (obj && (game.objects[obj.otyp].oc_skill === P_WHIP
                           || note_unported_uhitm('msg_hit:is_wet_towel'))) ? 'lash'
                  : Role_if(PMNAMES.PM_BARBARIAN) ? 'smite'
                    : 'hit';
            await You(`${verb} ${mon_nam(mon)}`
                      + (canseemon(mon) ? exclam(hmd.dmg) : '.'));
        }
    }
}

// src/uhitm.c:6315 nohandglow() — one charge of confuse-monster is spent.
//
// The messages need makeplural/body_part/hcolor and are recorded, but the
// DECREMENT is behaviour a later turn depends on, so it is real: without it
// a single confuse-monster casting would confuse every monster you touch
// forever.
//
// The early return is doing two jobs. No charges left is obvious; the second,
// mon->mconf, means touching an ALREADY-confused monster spends nothing --
// so the charge is consumed per monster newly confused, not per touch.
//
// u.umconf == 1 is the last charge and gets a different message from the
// others ("stop glowing" versus "no longer glow so brightly"), which is why
// the decrement happens AFTER the message rather than before.
export function nohandglow(mon) {
    if (!game.u.umconf || mon.mconf)
        return;

    note_unported_uhitm('nohandglow:message');
    game.u.umconf--;
}

// src/uhitm.c:3981 mhitm_ad_phys() — the AD_PHYS arm of mhitm_adtyping.
//
// The mhitu (monster hits hero) and mhitm (monster vs monster) branches are
// live; the uhitm branch is only reached by a polymorphed hero using hmonas()
// and is recorded. Within the mhitu branch, the corpse-petrification, silver,
// pudding-clone and poison arms need absent subsystems and are recorded at
// their C decision points.
// src/uhitm.c:75 mhitm_mgc_atk_negated() — magical cancellation.
//
// It DRAWS: rn2(10) against three times the defender's magic negation, and
// the draw happens whatever that value is. An attacker that has itself been
// cancelled returns early WITHOUT drawing.
export async function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    /* mcan doesn't apply to youmonst; the hero can't be cancelled */
    if (magr !== game.youmonst && magr.mcan)
        return true;                    /* no message; attacker cancelled */

    const armpro = magic_negation(mdef === game.youmonst ? null : mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        if (verbosely) {
            if (mdef === game.youmonst)
                await You('avoid harm.');
            else if (canseemon(mdef))
                await pline(`${Monnam(mdef)} avoids harm.`);
        }
        return true;
    }
    return false;
}

// src/uhitm.c:2445 mhitm_ad_drli(), a monster draining the hero's life.
// The one-in-three gate precedes drain resistance and magical cancellation,
// so most successful touches do not spend the cancellation draw.
export async function mhitm_ad_drli(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        note_unported_uhitm('mhitm_ad_drli:uhitm');
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!rn2(3) && !game.u.uprops?.DRAIN_RES
            && !(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            const { losexp } = await import('./exper.js');
            await losexp('life drainage');
        }
    } else {
        note_unported_uhitm('mhitm_ad_drli:mhitm');
    }
}

// src/uhitm.c:2626 mhitm_ad_cold(), a cold touch against the hero.
export async function mhitm_ad_cold(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        note_unported_uhitm('mhitm_ad_cold:uhitm');
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            await pline("You're covered in frost!");
            if (Cold_resistance()) {
                await pline("The frost doesn't seem cold!");
                note_unported_uhitm('mhitm_ad_cold:monstseesu');
                mhm.damage = 0;
            } else {
                note_unported_uhitm('mhitm_ad_cold:monstunseesu');
            }
            if (magr.m_lev > rn2(20))
                await destroy_items(game.youmonst, ATTKS.AD_COLD, orig_dmg);
        } else {
            mhm.damage = 0;
        }
    } else {
        note_unported_uhitm('mhitm_ad_cold:mhitm');
    }
}

// src/uhitm.c:2684 mhitm_ad_elec() — a shock attack.
//
// The mhitu branch is the one a grid bug takes against the hero: the hit
// message first, then "You get zapped!", then the resistance test and, when
// the attacker is high enough level, destroy_items with an rn2(20) gate.
export async function mhitm_ad_elec(magr, mattk, mdef, mhm) {
    const orig_dmg = mhm.damage;

    if (magr === game.youmonst) {
        note_unported_uhitm('mhitm_ad_elec:uhitm');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        await hitmsg(magr, mattk, mhm.indx);
        if (!(await mhitm_mgc_atk_negated(magr, mdef, true))) {
            await You('get zapped!');
            if (game.u.uprops?.SHOCK_RES) {
                note_unported_uhitm('mhitm_ad_elec:shock_resistance');
                mhm.damage = 0;
            }
            if (magr.m_lev > rn2(20))
                note_unported_uhitm('mhitm_ad_elec:destroy_items');
        } else {
            mhm.damage = 0;
        }
    } else {
        note_unported_uhitm('mhitm_ad_elec:mhitm');
    }
}

// src/uhitm.c:3122 mhitm_ad_drst(), poison carried by a natural attack.
// Magical cancellation is checked before the one-in-eight poison gate.
export async function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = await mhitm_mgc_atk_negated(magr, mdef, false);

    if (magr === game.youmonst) {
        if (!negated && !rn2(8))
            note_unported_uhitm('mhitm_ad_drst:uhitm_poison');
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        mhm.hitflags |= M_ATTK_HIT;
        if (!negated && !rn2(8)) {
            const ptmp = mattk[1] === ATTKS.AD_DRDX ? A_DEX
                       : mattk[1] === ATTKS.AD_DRCO ? A_CON : A_STR;
            const reason = `${s_suffix(Monnam(magr))} ${
                (await import('./mhitu.js')).mpoisons_subj(magr, mattk)}`;
            await poisoned(reason, ptmp,
                pmname(game.mons[magr.mnum], magr.female ? 1 : 0), 30, false);
        }
    } else if (!negated && !rn2(8)) {
        note_unported_uhitm('mhitm_ad_drst:mhitm_really_poison');
    }
}

// src/mondata.c:305 can_blnd(), restricted to a monster's physical
// blindness attack against the hero. Ravens use AT_CLAW; facewear and a
// visored helmet protect the hero's eyes.
function can_blnd_u(magr, mattk) {
    if (!haseyes(game.youmonst.data))
        return false;
    if (mattk[0] === ATTKS.AT_CLAW) {
        if (game.u.ublindf)
            return false;
        const helm = game.u.uarmh;
        if (helm && game.objects[helm.otyp]?.oc_descr === 'visored helmet')
            return false;
    } else if ((mattk[0] === ATTKS.AT_TUCH
                || mattk[0] === ATTKS.AT_STNG) && magr.mcan) {
        return false;
    }
    return true;
}

// src/uhitm.c:2958 mhitm_ad_blnd(), monster against hero arm.
export async function mhitm_ad_blnd(magr, mattk, mdef, mhm) {
    if (mdef !== game.youmonst) {
        note_unported_uhitm('mhitm_ad_blnd:nonhero');
        mhm.damage = 0;
        return;
    }

    if (can_blnd_u(magr, mattk)) {
        if (!game.u.ublind)
            await pline(`${Monnam(magr)} blinds you!`);
        const intr = (game.u.intrinsic ||= {});
        const { make_blinded } = await import('./potion.js');
        await make_blinded((intr.HBlinded | 0) + mhm.damage, false);
        if (!game.u.ublind)
            await Your('vision clears.');
    }
    mhm.damage = 0;
}

// src/uhitm.c:4203 mhitm_ad_ston(), the cockatrice hiss attack.
export async function mhitm_ad_ston(magr, mattk, mdef, mhm) {
    if (magr === game.youmonst) {
        note_unported_uhitm('mhitm_ad_ston:uhitm');
        mhm.damage = 0;
    } else if (mdef === game.youmonst) {
        await hitmsg(magr, mattk, mhm.indx);
        if (!rn2(3)) {
            if (magr.mcan) {
                if (!Deaf())
                    await You_hear(`a cough from ${mon_nam(magr)}!`);
            } else {
                if (Hallucination() && !Blind()) {
                    await You_hear('hissing.');
                    await pline(`${Monnam(magr)} appears to be blowing you a kiss...`);
                } else if (!Deaf()) {
                    await You_hear(`${s_suffix(mon_nam(magr))} hissing!`);
                } else if (!Blind()) {
                    await pline(`${Monnam(magr)} seems to grimace.`);
                }
                if (!rn2(10) || game.flags?.moonphase === NEW_MOON)
                    note_unported_uhitm('mhitm_ad_ston:do_stone_u');
            }
        }
    } else {
        note_unported_uhitm('mhitm_ad_ston:mhitm');
    }
}

export async function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const A = ATTKS;
    const pd = game.mons[mdef.mnum];

    if (magr === game.youmonst) {
        /* uhitm — hmonas()'s claw/kick attacks for a poly'd hero */
        note_unported_uhitm('mhitm_ad_phys:uhitm');
    } else if (mdef === game.youmonst) {
        /* mhitu */
        if (mattk[0] === A.AT_HUGS && !sticks(pd)) {
            if (!game.u.ustuck && rn2(2)) {
                /* u_slip_free() needs the grab/armor-slip rules */
                note_unported_uhitm('mhitm_ad_phys:u_slip_free');
                mhm.damage = 0;
                mhm.hitflags |= M_ATTK_MISS;
            } else if (game.u.ustuck === magr) {
                exercise(A_STR, false);
                await You(`are being ${
                    magr.mnum === PMNAMES.PM_ROPE_GOLEM ? 'choked'
                                                        : 'crushed'}.`);
            }
        } else { /* hand to hand weapon */
            const otmp = MON_WEP(magr);

            if (mattk[0] === A.AT_WEAP && otmp) {
                if (otmp.otyp === ONAMES.CORPSE
                    && touch_petrifies(game.mons[otmp.corpsenm])) {
                    note_unported_uhitm('mhitm_ad_phys:corpse_stone_u');
                    mhm.damage = 1;
                }
                mhm.damage += dmgval(otmp, mdef);
                const marmg = which_armor(magr, W_ARMG);
                if (marmg && marmg.otyp === ONAMES.GAUNTLETS_OF_POWER)
                    mhm.damage += rn1(4, 3); /* 3..6 */
                if (mhm.damage <= 0)
                    mhm.damage = 1;
                if (!otmp.oartifact) {
                    await hitmsg(magr, mattk, mhm.indx);
                    mhm.hitflags |= M_ATTK_HIT;
                } else {
                    note_unported_uhitm('mhitm_ad_phys:artifact_hit_u');
                }
                if (!mhm.damage)
                    return;
                if (game.objects[otmp.otyp].oc_material === MATERIALS.SILVER
                    && hates_silver_you())
                    note_unported_uhitm('mhitm_ad_phys:silver_sears_you');
                /* the black/brown pudding clone arm needs Upolyd state */
                if (game.u.umonnum === PMNAMES.PM_BLACK_PUDDING
                    || game.u.umonnum === PMNAMES.PM_BROWN_PUDDING)
                    note_unported_uhitm('mhitm_ad_phys:cloneu');
                rustm(game.youmonst, otmp);
                if (otmp.opoisoned && game.mhitu_dieroll <= 5)
                    note_unported_uhitm('mhitm_ad_phys:poisoned_u');
            } else if (mattk[0] !== A.AT_TUCH || mhm.damage !== 0
                       || magr !== game.u.ustuck) {
                await hitmsg(magr, mattk, mhm.indx);
                mhm.hitflags |= M_ATTK_HIT;
            }
        }
    } else {
        /* mhitm branch */
        let mwep = MON_WEP(magr);
        if (mattk[0] !== A.AT_WEAP && mattk[0] !== A.AT_CLAW)
            mwep = null;

        if (noncorporeal(pd)) {
            /* shade_miss */
            note_unported_uhitm('mhitm_ad_phys:shade');
            mhm.damage = 0;
        } else if (mattk[0] === A.AT_KICK && thick_skinned(pd)) {
            /* [no 'kicking boots' check needed; monsters with kick attacks
               can't wear boots and monsters that wear boots don't kick] */
            mhm.damage = 0;
        } else if (mwep) { /* non-Null 'mwep' implies AT_WEAP || AT_CLAW */
            if (mwep.otyp === ONAMES.CORPSE
                && touch_petrifies(game.mons[mwep.corpsenm])) {
                note_unported_uhitm('mhitm_ad_phys:do_stone_mon');
            }

            mhm.damage += dmgval(mwep, mdef);
            const marmg = which_armor(magr, W_ARMG);
            if (marmg && marmg.otyp === ONAMES.GAUNTLETS_OF_POWER)
                mhm.damage += rn1(4, 3); /* 3..6 */
            if (mhm.damage < 1) /* is this necessary?  mhitu.c has it... */
                mhm.damage = 1;
            if (mwep.oartifact)
                note_unported_uhitm('mhitm_ad_phys:artifact_hit_m');
            if (mhm.damage)
                rustm(mdef, mwep);
            if (mwep.opoisoned && !rn2(4)) {
                /* 1/4 chance of weapon poison applying is the same as in
                 * uhitm and mhitu cases. */
                note_unported_uhitm('mhitm_ad_phys:mhitm_really_poison');
            }
        } else if (magr.mnum === PMNAMES.PM_PURPLE_WORM
                   && pd === game.mons[PMNAMES.PM_SHRIEKER]) {
            /* hack to enhance mm_aggression() */
            if (mhm.damage >= mdef.mhp && mdef.mhp > 1)
                mhm.damage = mdef.mhp - 1;
        }
    }
}

/* include/youprop.h Hate_silver — hero form that hates silver; base heroes
   never do, and the polymorph state that could is recorded elsewhere. */
function hates_silver_you() {
    return false;
}

// src/mhitm.c:1260 rustm() — the defender's rust/corrode/burn passive
// against the weapon that just hit it. The hero (or a monster) without such
// a passive exits before the rn2(chance) gate, which is why this draws
// nothing in ordinary fights; erode_obj() itself is absent and recorded.
function rustm(mdef, obj) {
    const A = ATTKS;
    if (!mdef || !obj)
        return; /* just in case */
    const pd = (mdef === game.youmonst) ? game.youmonst.data
                                        : game.mons[mdef.mnum];
    let dmgtyp = ERODE_NONE, chance = 1;
    if (dmgtype(pd, A.AD_CORR)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(pd, A.AD_RUST)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(pd, A.AD_FIRE)
               && pd !== game.mons[PMNAMES.PM_STEAM_VORTEX]) {
        dmgtyp = ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp !== ERODE_NONE && !rn2(chance))
        note_unported_uhitm('rustm:erode_obj');
}

// src/uhitm.c:5218 m_is_steadfast(). Grounded Giantslayer wielders and
// loadstone carriers resist knockback.
function m_is_steadfast(mtmp) {
    const is_u = mtmp === game.youmonst;
    const mdat = mtmp.data || game.mons[mtmp.mnum];
    const wep = is_u ? game.u.uwep : MON_WEP(mtmp);

    if ((is_u ? (Flying() || Levitation())
              : (is_flyer(mdat) || is_floater(mdat)))
        || Is_airlevel(game.u.uz)
        || (Is_waterlevel(game.u.uz) && !is_pool(game.u.ux, game.u.uy)))
        return false;

    if (wep?.oartifact === ART_GIANTSLAYER)
        return true;
    if (is_u) {
        const invent = game.invent || game.u.invent || [];
        if (invent.some((obj) => obj.otyp === ONAMES.LOADSTONE))
            return true;
    } else if (m_carrying(mtmp, ONAMES.LOADSTONE)) {
        return true;
    }
    return !!(game.u.usteed && mtmp === game.u.usteed
              && (game.invent || game.u.invent || [])
                     .some((obj) => obj.otyp === ONAMES.LOADSTONE));
}

function is_blunt_weapon(obj) {
    return !!obj
        && (obj.oclass === OCLASSES.WEAPON_CLASS
            || is_weptool(obj, game.objects))
        && !!(game.objects[obj.otyp].oc_dir & 4 /* WHACK */);
}

// src/dothrow.c:957 will_hurtle(). This is the destination predicate used by
// the message and by each actual hurtle step.
function will_hurtle(mon, x, y) {
    if (!isok(x, y))
        return false;
    if ((mon.data || game.mons[mon.mnum]).msize >= MFLAGS.MZ_HUGE
        || mon === game.u.ustuck || mon.mtrapped)
        return false;
    return goodpos(x, y, mon, MM_IGNOREWATER | MM_IGNORELAVA);
}

// src/dothrow.c:1118 mhurtle(). Move a monster along a straight path. The
// collision and region edge cases remain recorded, but the ordinary open
// path, including trap checks, is live.
async function mhurtle(mon, dx, dy, range) {
    await wakeup(mon, !game.context?.mon_moving);
    mon.movement = 0;
    mon.mstun = 1;

    if ((mon.data || game.mons[mon.mnum]).msize >= MFLAGS.MZ_HUGE
        || mon === game.u.ustuck || mon.mtrapped) {
        if (canseemon(mon))
            await pline(`${Monnam(mon)} doesn't budge!`);
        return;
    }

    dx = sgn(dx);
    dy = sgn(dy);
    if (!range || (!dx && !dy))
        return;
    if (dx && dy && mon.mnum === PMNAMES.PM_GRID_BUG) {
        note_unported_uhitm('mhurtle:nodiag');
        return;
    }

    if (mon.mundetected) {
        mon.mundetected = 0;
        newsym(mon.mx, mon.my);
    }
    if (M_AP_TYPE(mon))
        seemimic(mon);

    for (let step = 0; step < range; step++) {
        const x = mon.mx + dx;
        const y = mon.my + dy;
        if (!will_hurtle(mon, x, y)) {
            if (m_at(x, y))
                note_unported_uhitm('mhurtle:monster_collision');
            else if (x === game.u.ux && y === game.u.uy)
                note_unported_uhitm('mhurtle:hero_collision');
            break;
        }

        const ox = mon.mx, oy = mon.my;
        remove_monster(ox, oy);
        /* newsym's sensed-monster arm scans the monster chain, so move the
           coordinates before repainting the vacated square. C's m_at grid
           alone is authoritative here; this ordering gives JS the same
           answer while place_monster installs the new grid entry below. */
        mon.mx = x;
        mon.my = y;
        newsym(ox, oy);
        place_monster(mon, x, y);
        newsym(x, y);
        set_apparxy(mon);
        if (await mintrap(mon, HURTLING))
            break;
    }

    if (!DEADMONSTER(mon)) {
        if (t_at(mon.mx, mon.my))
            await mintrap(mon, FORCEBUNGLE);
        else
            note_unported_uhitm('mhurtle:minliquid');
    }
}

// src/uhitm.c:5247 mhitm_knockback(). Can this hit hurl the defender?
// The two leading draws precede every qualification test. Message variation
// draws also precede the blocking pline, matching C's argument evaluation.
export async function mhitm_knockback(magr, mdef, mattk, mhm, weapon_used) {
    const A = ATTKS;
    const attack = Array.isArray(mattk?.[0]) ? mattk[0] : mattk;
    const u_agr = magr === game.youmonst;
    const u_def = mdef === game.youmonst;
    const magrdata = magr.data || game.mons[magr.mnum];
    const mdefdata = mdef.data || game.mons[mdef.mnum];
    const wep = weapon_used ? (u_agr ? game.u.uwep : MON_WEP(magr)) : null;
    const knockdistance = rn2(3) ? 1 : 2;
    const chance = wep?.oartifact === ART_OGRESMASHER ? 2 : 6;

    if (rn2(chance))
        return false;
    if (!(attack?.[1] === A.AD_PHYS
          && (attack[0] === A.AT_CLAW || attack[0] === A.AT_KICK
              || attack[0] === A.AT_BUTT || attack[0] === A.AT_WEAP)))
        return false;
    if (attacktype(magrdata, A.AT_ENGL) || attacktype(magrdata, A.AT_HUGS)
        || sticks(magrdata))
        return false;

    const defx = u_def ? game.u.ux : mdef.mx;
    const defy = u_def ? game.u.uy : mdef.my;
    const agrx = u_agr ? game.u.ux : magr.mx;
    const agry = u_agr ? game.u.uy : magr.my;
    const dx = sgn(defx - agrx), dy = sgn(defy - agry);

    if (!isok(defx + dx, defy + dy))
        return false;
    if (u_def) {
        note_unported_uhitm('mhitm_knockback:test_move_u');
        return false;
    } else if (IS_DOOR(game.level.at(defx, defy).typ)
               && (defx - agrx) && (defy - agry)
               && !doorless_door(defx, defy)) {
        return false;
    }

    if ((!u_agr && DEADMONSTER(magr)) || DEADMONSTER(mdef))
        return false;
    if (!(magrdata.msize > mdefdata.msize + 1))
        return false;
    if (wep && (is_flimsy(wep) || !is_blunt_weapon(wep)))
        return false;
    if (unsolid(magrdata))
        return false;
    if (u_agr && !(mhm.hitflags & M_ATTK_HIT))
        return false;

    if (m_is_steadfast(mdef)) {
        if (canseemon(mdef))
            await pline(`${Monnam(mdef)} doesn't budge.`);
        return false;
    }

    const knockedhow = will_hurtle(mdef, defx + dx, defy + dy)
        ? 'backward' : 'back';
    if (canseemon(mdef)) {
        const magrbuf = u_agr ? 'You' : Monnam(magr);
        const mdefbuf = y_monnam(mdef);
        const force = rn2(2) ? 'forceful' : 'powerful';
        const hitkind = rn2(2) ? 'blow' : 'strike';
        await pline(`${magrbuf} ${vtense(magrbuf, 'knock')} ${mdefbuf} ${
            knockedhow} with a ${force} ${hitkind}!`);
    } else if (u_agr) {
        await You(`feel ${m_monnam(mdef)} be knocked ${knockedhow}!`);
    }

    if (game.u.ustuck && u_agr)
        set_ustuck(null);

    await mhurtle(mdef, dx, dy, knockdistance);
    if (!u_agr)
        mhm.hitflags |= M_ATTK_HIT;
    if (DEADMONSTER(mdef)) {
        mhm.hitflags |= M_ATTK_DEF_DIED;
    } else if (!rn2(4)) {
        mdef.mstun = 1;
    }
    if (!u_agr && DEADMONSTER(magr))
        mhm.hitflags |= M_ATTK_AGR_DIED;
    return true;
}
