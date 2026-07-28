import { exercise } from './attrib.js';
import { A_DEX } from './const.js';
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
import { helpless } from './monst.js';
import { You } from './pline.js';
import { mon_nam } from './do_name.js';
import { exclam } from './zap.js';
import { canseemon } from './display.js';
import { wakeup, killed, xkilled } from './mon.js';
import { rn2, rnd, d } from './rng.js';
import { is_safemon } from './display.js';
import { monflee } from './monmove.js';
import { IS_OBSTRUCTED, MON_POLE_DIST, M_ATTK_HIT, M_ATTK_MISS,
         NATTK } from './const.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { adjalign, near_capacity } from './attrib.js';
import { abon, hitval, weapon_hit_bonus, dmgval } from './weapon.js';
import { find_mac } from './worn.js';
import { worn } from './do_wear.js';
import { is_orc, unsolid, noncorporeal, thick_skinned, attacktype, sticks } from './mondata.js';
import { is_blade, is_axe, set_ustuck, m_at } from './mon.js';
import { is_weptool } from './mkobj.js';
import { OCLASSES, MATERIALS, ONAMES } from './objects_data.js';
import { sgn } from './hacklib.js';
import { ATTKS } from './monst_data.js';
import { W_ARM, W_ARMS, P_BARE_HANDED_COMBAT, P_BASIC,
         HMON_MELEE, HMON_APPLIED, HMON_THROWN, HMON_KICKED,
         W_ARMG, W_RINGR, W_RINGL, P_KNIFE, P_WHIP, XKILL_NOMSG } from './const.js';
import { is_undead } from './mondata.js';
import { A_LAWFUL } from './const.js';

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
export function do_attack(mtmp) {
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

        /* the in-shop check only runs when foo is false; it needs the shop
           bookkeeping and is recorded rather than guessed */
        let inshop = false;
        if (!foo && mtmp.isshk)
            note_unported_uhitm('do_attack:tended_shop');

        if (inshop || foo) {
            if (mtmp.isshk)
                note_unported_uhitm('do_attack:dopay');
            if (mtmp.mtame)     /* see 'additional considerations' in the C */
                monflee(mtmp, rnd(6), false, false);
            note_unported_uhitm('do_attack:in_the_way_message');
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (mdat.mmove === 0 && rn2(6))) {
            note_unported_uhitm('do_attack:doesnt_seem_to_move');
            return true;
        } else {
            return false;       /* caller swaps places with it */
        }
    }

    /* everything past here is attack_checks() and the combat code */
    note_unported_uhitm('do_attack:combat');
    return true;
}

// src/uhitm.c:331 check_caitiff() — a Knight's chivalry and a Samurai's giri.
//
// Draws nothing, but it calls adjalign(-1), which moves the hero's alignment
// record AND raises ualign.abuse. find_roll_to_hit calls it once per attack
// sequence, guarded by `if (!(*attk_count)++)`, so it must not fire on the
// second and later attacks of a multi-attack turn.
//
// The two You() messages need pline plumbing and are recorded; the alignment
// change is the part that persists.
export function check_caitiff(mtmp) {
    if (game.u.ualign.record <= -10)
        return;

    const d = game.mons[mtmp.mnum];

    if (Role_if(PMNAMES.PM_KNIGHT) && game.u.ualign.type === A_LAWFUL
        && !is_undead(d)
        && (helpless(mtmp) || (mtmp.mflee && !mtmp.mavenge))) {
        note_unported_uhitm('check_caitiff:caitiff_message');
        adjalign(-1);
    } else if (Role_if(PMNAMES.PM_SAMURAI) && mtmp.mpeaceful) {
        /* attacking peaceful creatures is bad for the samurai's giri */
        note_unported_uhitm('check_caitiff:dishonor_message');
        adjalign(-1);
    }
}

// src/role.c Role_if()
const Role_if = (pm) => game.urole?.malenum === pm || game.urole?.pmidx === pm;

// src/uhitm.c find_roll_to_hit() — the number the d20 must beat.
//
// Draws nothing itself; hitum rolls rnd(20) against the value it returns.
// attk_count and role_roll_penalty are C out-parameters, passed here as a
// single mutable object so the caller sees both.
//
// The check_caitiff() call is guarded by `if (!(*attk_count)++)`, so it fires
// on the FIRST attack of a sequence only -- a multi-attack turn must not
// penalise the hero's alignment repeatedly.
export function find_roll_to_hit(mtmp, aatyp, weapon, out) {
    const ptr = game.mons[mtmp.mnum];
    out.role_roll_penalty = 0;              /* default is `none' */

    /* include/you.h:464 Luck is uluck + moreluck */
    const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);

    let tmp = 1 + abon() + find_mac(mtmp) + (game.u.uhitinc || 0)
              + (sgn(Luck) * Math.trunc((Math.abs(Luck) + 2) / 3))
              + game.u.ulevel;              /* maybe_polyd: not polymorphed */

    /* some actions should occur only once during multiple attacks */
    if (!(out.attk_count++))
        check_caitiff(mtmp);

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
export function missum(mdef, mattk, wouldhavehit) {
    if (wouldhavehit)   /* a monk missing due to the body-armour penalty */
        note_unported_uhitm('missum:cumbersome_armor_message');

    note_unported_uhitm('missum:miss_message');

    if (!helpless(mdef))
        note_unported_uhitm('missum:wakeup');
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
export function known_hitum(mon, weapon, mhit, rollneeded, armorpenalty,
                            uattk, dieroll) {
    let malive = true;
    /* hmon() might destroy the weapon; remember the aspect for cutworm */
    const slice_or_chop = !!(weapon && (is_blade(weapon) || is_axe(weapon)));

    if (game.override_confirmation)
        note_unported_uhitm('known_hitum:bloodthirsty_blade_message');

    if (!mhit[0]) {
        missum(mon, uattk, (rollneeded + armorpenalty > dieroll));
    } else {
        const oldhp = mon.mhp;
        const oldweaphit = game.u.uconduct?.weaphit ?? 0;

        /* KMH, conduct */
        if (weapon && (weapon.oclass === OCLASSES.WEAPON_CLASS
                       || is_weptool(weapon, game.objects))) {
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.weaphit = oldweaphit + 1;
        }

        /* hmon() applies the damage and may kill the monster */
        note_unported_uhitm('known_hitum:hmon');

        if (malive) {
            if (!rn2(25) && mon.mhp < mon.mhpmax / 2 && !game.u.uswallow) {
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
                game.u.uconduct.weaphit = oldweaphit;  /* a miss is not a hit */
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
export function hitum(mon, uattk) {
    const wepbefore = game.u.uwep;
    const secondwep = game.u.twoweap ? game.u.uswapwep : null;
    const x = game.u.ux + game.u.dx, y = game.u.uy + game.u.dy;
    const oldumort = game.u.umortality || 0;
    const out = { attk_count: 0, role_roll_penalty: 0 };

    if (game.u.uwep && game.u.uwep.oartifact)
        note_unported_uhitm('hitum:cleaver_check');

    /* 0: single hit, 1: first of two; hmon_hitmon reads it downstream */
    game.twohits = (game.u.uwep ? game.u.twoweap : double_punch()) ? 1 : 0;

    let tmp = find_roll_to_hit(mon, uattk.aatyp, game.u.uwep, out);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);
    const mhit = [(tmp > dieroll || game.u.uswallow) ? 1 : 0];
    if (tmp > dieroll)
        exercise(A_DEX, true);          /* src/uhitm.c hitum() */

    let malive = known_hitum(mon, game.u.uwep, mhit, tmp,
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
        tmp = find_roll_to_hit(mon, uattk.aatyp, game.u.uswapwep, out);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);
        mhit[0] = (tmp > dieroll || game.u.uswallow) ? 1 : 0;
        malive = known_hitum(mon, secondwep, mhit, tmp,
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
        note_unported_uhitm(`passive:adtyp=${adtyp}`);
        break;
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
        note_unported_uhitm(`passive:alive_switch:adtyp=${adtyp}`);
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
        unarmed: !game.uwep && !game.uarm && !game.uarms,
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
        hmon_hitmon_dmg_recalc(hmd, obj);

    if (hmd.ispoisoned)
        note_unported_uhitm('hmon_hitmon:poison');

    if (hmd.dmg < 1) {
        note_unported_uhitm('hmon_hitmon:no_damage');
    }

    if (hmd.jousting) {
        note_unported_uhitm('hmon_hitmon:jousting');
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown && !obj && !game.Upolyd) {
        note_unported_uhitm('hmon_hitmon:stagger');
    } else if (!hmd.unarmed && hmd.dmg > 1 && !thrown && !game.Upolyd) {
        note_unported_uhitm('hmon_hitmon:twoweap_arm');
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

    note_unported_uhitm('hmon_hitmon:pet');
    note_unported_uhitm('hmon_hitmon:splitmon');
    await hmon_hitmon_msg_hit(hmd, mon, obj);

    /* src/uhitm.c:1897 -- the kill/survive tail.
       poiskilled and destroyed are separate branches, and BOTH check
       already_killed again before calling the kill, because an earlier stage
       may have done it. */
    if (hmd.needpoismsg)
        note_unported_uhitm('hmon_hitmon:needpoismsg');
    if (hmd.poiskilled) {
        note_unported_uhitm('hmon_hitmon:poison_deadly');
        if (!hmd.already_killed)
            xkilled(mon, XKILL_NOMSG);
        hmd.destroyed = true;
    } else if (hmd.destroyed) {
        if (!hmd.already_killed)
            killed(mon);
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
        note_unported_uhitm('hmon_hitmon:maybe_knockback');
    }

    return hmd.retval;
}

// include/obj.h is_pole() — a polearm or lance, the applied weapons that
// still count as hand-to-hand.
const is_pole = (o) => !!o && note_is_pole_unported();
function note_is_pole_unported() {
    note_unported_uhitm('hmon_hitmon:is_pole');
    return false;
}

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
        /* remember obj's name since it might end up being destroyed */
        note_unported_uhitm('hmon_hitmon:saved_oname');

        if (obj.oclass === OCLASSES.WEAPON_CLASS || is_weptool(obj, game.objects)
            || obj.oclass === OCLASSES.GEM_CLASS) {
            hmon_hitmon_weapon(hmd, mon, obj);
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
                note_unported_uhitm('hmon_hitmon:misc_obj');
            }
        }
    }
}

// include/mondata.h:208 passes_rocks() — a header macro with no JS home yet.
// Both halves exist: passes_walls is in this file, unsolid in js/mondata.js.
const passes_rocks = (ptr) => passes_walls(ptr) && !unsolid(ptr);

// src/dothrow.c stone_missile() /
// src/uhitm.c shade_aware() — recorded.
function note_stone_missile_unported(obj) {
    note_unported_uhitm('hmon_hitmon:stone_missile');
    return false;
}
const shade_aware = (o) => { note_unported_uhitm('hmon_hitmon:shade_aware'); return false; };

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
    const spcdmgflg = game.uarmg ? W_ARMG
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
function hmon_hitmon_weapon(hmd, mon, obj) {
    /* is it not a melee weapon? */
    if (note_pred('is_launcher', obj)
        || (!hmd.thrown && (note_pred('is_missile', obj)
                            || note_pred('is_ammo', obj)))
        || (!hmd.thrown && !game.u.usteed && note_pred('is_pole', obj)
            && !note_pred('is_art:SNICKERSNEE', obj))
        || (note_pred('is_ammo', obj)
            && (hmd.thrown !== HMON_THROWN
                || !note_pred('ammo_and_launcher', obj)))) {
        note_unported_uhitm('hmon_hitmon:weapon_ranged');
    } else {
        hmon_hitmon_weapon_melee(hmd, mon, obj);
        if (hmd.doreturn)
            return;
    }
}

// The object predicates this routing needs, none of them ported. Each is
// recorded by name so game.unported says which one a divergence wanted.
function note_pred(name, obj) {
    note_unported_uhitm('hmon_hitmon:' + name);
    return false;
}

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
function hmon_hitmon_weapon_melee(hmd, mon, obj) {
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
function hmon_hitmon_dmg_recalc(hmd, obj) {
    let dmgbonus = 0, strbonus, absbonus;

    if (hmd.get_dmg_bonus) {
        /* for dual attacks, udaminc applies to both, and two-handed
           weapons use it as-is */
        dmgbonus = game.u.udaminc || 0;
        if (hmd.thrown !== HMON_THROWN
            || !obj || !game.uwep
            || !note_unported_uhitm('dmg_recalc:ammo_and_launcher')) {
            strbonus = note_dbon_unported();
            absbonus = Math.abs(strbonus);
            if (hmd.twohits)
                strbonus = (((3 * absbonus + 2) / 4) | 0) * sgn(strbonus);
            else if (hmd.thrown === HMON_MELEE && game.uwep
                     && note_unported_uhitm('dmg_recalc:bimanual'))
                strbonus = (((3 * absbonus + 1) / 2) | 0) * sgn(strbonus);
            dmgbonus += strbonus;
        }
    }

    if (hmd.use_weapon_skill) {
        note_unported_uhitm('dmg_recalc:weapon_dam_bonus');

        /* hit for more than minimal damage (before being adjusted for
           damage or skill bonus) trains the skill toward future
           enhancement */
        if (hmd.train_weapon_skill)
            note_unported_uhitm('dmg_recalc:use_skill');
    }

    /* apply combined damage+strength and skill bonuses */
    hmd.dmg += dmgbonus;
    /* don't let penalty, if bonus is negative, turn a hit into a miss */
    if (hmd.dmg < 1)
        hmd.dmg = 1;
}

// src/attrib.c dbon() — strength damage bonus. Not ported; returns 0 so the
// scaling above is exercised but adds nothing.
function note_dbon_unported() {
    note_unported_uhitm('dmg_recalc:dbon');
    return 0;
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
// Only the monster-vs-monster branch is live here (the uhitm and mhitu
// branches run through their own files' flows). With no wielded monster
// weapons yet, the mwep arms record; a plain claw/bite deals the rolled
// damage unchanged.
export function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const A = ATTKS;
    const pd = game.mons[mdef.mnum];

    /* mhitm branch */
    if (noncorporeal(pd)) {
        /* shade_miss */
        note_unported_uhitm('mhitm_ad_phys:shade');
        mhm.damage = 0;
    } else if (mattk[0] === A.AT_KICK && thick_skinned(pd)) {
        mhm.damage = 0;
    }
    /* non-Null mwep arms (weapon damage, poison, artifact hits) are absent:
       mon_wield_item has no port, so MON_WEP is always empty here */
}

// src/uhitm.c:5247 mhitm_knockback() — can this hit hurl the defender?
//
// The TWO leading draws happen before any qualification test: rn2(3) for
// the distance and rn2(chance) for the 1-in-6 gate, so every damaging hit
// spends them even when the attack type can never knock back. The actual
// hurtle needs subsystems that are absent and is recorded.
export function mhitm_knockback(magr, mdef, mattk, mhm, weapon_used) {
    const A = ATTKS;
    rn2(3);                     /* knockdistance: 67% 1 step, 33% 2 */
    const chance = 6;           /* Ogresmasher needs an artifact wielder */

    if (rn2(chance))
        return false;

    /* only certain attacks qualify for knockback */
    if (!((mattk[1] === A.AD_PHYS)
          && (mattk[0] === A.AT_CLAW
              || mattk[0] === A.AT_KICK
              || mattk[0] === A.AT_BUTT
              || mattk[0] === A.AT_WEAP)))
        return false;

    /* don't knockback if attacker also wants to grab or engulf */
    if (attacktype(game.mons[magr.mnum], A.AT_ENGL)
        || attacktype(game.mons[magr.mnum], A.AT_HUGS)
        || sticks(game.mons[magr.mnum]))
        return false;

    /* the hurtle itself (test_move, mhurtle, messages) is absent */
    note_unported_uhitm('mhitm_knockback:hurtle');
    return false;
}

