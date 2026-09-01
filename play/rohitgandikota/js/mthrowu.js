// mthrowu.js — monsters throwing and shooting.
// C ref: src/mthrowu.c
//
// monmulti() first: it is the volley-size roll, and its rnd(multishot) is
// the first draw of every monster shot. monshoot()/m_throw()/ohitmon() —
// the flight itself — are the remaining consumers and arrive with thrwmu.

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { rounddiv } from './hack.js';
import { is_ammo, matching_launcher, ammo_and_launcher, welded } from './wield.js';
import { multishot_class_bonus } from './dothrow.js';
import { is_prince, is_lord, is_mplayer, is_elf, is_orc,
         is_gnome, is_unicorn, nohands } from './mondata.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { should_mulch_missile } from './dothrow.js';
import { delobj, m_at } from './mon.js';
import { down_gate, ship_object } from './dokick.js';
import { dropy, flooreffects } from './do.js';
import { place_object, mksobj } from './mkobj.js';
import { hold_another_object, stackobj } from './invent.js';
import { u_at, M_AP_MONSTER, XKILL_NOMSG, SLT_ENCUMBER,
         A_DEX, WATER, LAVAWALL, M_SEEN_MAGR, M_SEEN_FIRE,
         M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_DISINT, M_SEEN_ELEC,
         M_SEEN_POISON, M_SEEN_ACID, M_SEEN_REFL } from './const.js';
import { calc_capacity, ACURR } from './attrib.js';
import { MON_WEP } from './monst.js';
import { DEADMONSTER, is_vampshifter } from './monst.js';
import { cansee } from './vision.js';
import { makeknown, observe_object } from './o_init.js';
import { find_mac } from './worn.js';
import { omon_adj } from './dothrow.js';
import { dobuzz, hit, miss, exclam } from './zap.js';
import { distant_name, mshot_xname, simpleonames, xname, an, the } from './objnam.js';
import { pline, canspotmon, display_object_at, temporary_object_glyph,
         newsym } from './display.js';
import { pline_The, You } from './pline.js';
import { seemimic, setmangry, xkilled, mondied } from './mon.js';
import { dmgval } from './weapon.js';
import { resists_acid, resists_poison, resists_ston, noncorporeal,
         amorphous, nonliving } from './mondata.js';
import { mon_nam, Monnam, hliquid } from './do_name.js';
import { mhim } from './mondata.js';
import { s_suffix } from './hacklib.js';
import { mon_hates_silver, touch_petrifies } from './dog.js';
import { bimanual, stone_missile, is_poisonable } from './obj.js';
import { passes_rocks, passive_obj } from './uhitm.js';
import { obj_extract_self } from './invent.js';
import { MATERIALS } from './objects_data.js';
import { isok, IS_OBSTRUCTED, IRONBARS, IS_SINK, BOLT_LIM, W_WEP,
         NEED_WEAPON, NEED_RANGED_WEAPON, MON_POLE_DIST, FACE,
         EYE, M_ATTK_MISS, M_ATTK_HIT } from './const.js';
import { closed_door } from './cmd.js';
import { setmnotwielded, select_rwep, mon_wield_item,
         autoreturn_weapon } from './weapon.js';
import { splitobj } from './mkobj.js';
import { canseemon } from './display.js';
import { Tobjnam, singular, The, makeplural, vtense } from './objnam.js';
import { MONSYMS } from './monst_data.js';
import { SKILLS } from './objects_data.js';
import { nomul } from './hack.js';
import { thitu } from './trap.js';
import { distmin, dist2, sgn } from './hacklib.js';
import { bigmonst } from './mondata.js';
import { body_part } from './polyself.js';
import { Your, pline_The as pline_The2 } from './pline.js';
import { stop_occupation } from './allmain.js';
import { mswings_verb } from './mhitu.js';
import { couldsee, clear_path } from './vision.js';
import { lined_up, mdistu } from './monmove.js';
import { is_pole } from './u_init.js';
import { rn2 } from './rng.js';
import { ATTKS } from './monst_data.js';
import { Deaf, Hallucination, Sleep_resistance } from './youprop.js';
import { You_hear } from './pline.js';

// src/mthrowu.c:198 monmulti() — how many missiles this volley holds.
//
// The rnd(multishot) fires only when the stack, launcher and confusion
// guards all pass; a lone dagger or a confused monster throws exactly one
// and draws nothing here.
export function monmulti(mtmp, otmp, mwep) {
    const mdat = game.mons[mtmp.mnum];
    let multishot = 1;

    if (otmp.quan > 1 /* no point checking if there's only 1 */
        /* ammo requires corresponding launcher be wielded */
        && (is_ammo(otmp)
                ? matching_launcher(otmp, mwep)
                /* otherwise any stackable (non-ammo) weapon */
                : otmp.oclass === OCLASSES.WEAPON_CLASS)
        && !mtmp.mconf) {
        /* Assumes lords are skilled, princes are expert */
        if (is_prince(mdat))
            multishot += 2;
        else if (is_lord(mdat))
            multishot++;
        /* fake players treated as skilled (regardless of role limits) */
        else if (is_mplayer(mdat))
            multishot++;

        /* Elven Craftsmanship makes for light, quick bows */
        if (otmp.otyp === ONAMES.ELVEN_ARROW && !otmp.cursed)
            multishot++;
        if (mwep && mwep.otyp === ONAMES.ELVEN_BOW
            && ammo_and_launcher(otmp, mwep) && !mwep.cursed)
            multishot++;
        /* 1/3 of launcher enchantment */
        if (ammo_and_launcher(otmp, mwep) && mwep.spe > 1)
            multishot += rounddiv(mwep.spe, 3);
        /* Some randomness */
        multishot = rnd(multishot);

        /* class bonus */
        multishot += multishot_class_bonus(mtmp.mnum, otmp, mwep);

        /* racial bonus */
        if ((is_elf(mdat) && otmp.otyp === ONAMES.ELVEN_ARROW
             && mwep && mwep.otyp === ONAMES.ELVEN_BOW)
            || (is_orc(mdat) && otmp.otyp === ONAMES.ORCISH_ARROW
                && mwep && mwep.otyp === ONAMES.ORCISH_BOW)
            || (is_gnome(mdat) && otmp.otyp === ONAMES.CROSSBOW_BOLT
                && mwep && mwep.otyp === ONAMES.CROSSBOW))
            multishot++;
    }

    if (otmp.quan < multishot)
        multishot = otmp.quan;
    if (multishot < 1)
        multishot = 1;
    return multishot;
}

// src/mthrowu.c drop_throw() — the missile lands (or breaks). Returns
// whether the object is gone. passive_obj (rot/corrode the missile against
// the target's passive defense) records, gated on an actual hit.
export async function drop_throw(obj, ohit, x, y) {
    let broken;

    if (obj.otyp === ONAMES.CREAM_PIE || obj.oclass === OCLASSES.VENOM_CLASS
        || (ohit && obj.otyp === ONAMES.EGG)) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj));
    }

    if (broken) {
        delobj(obj);
    } else {
        if (down_gate(x, y) !== -1)
            broken = !!ship_object(obj, x, y, false);
        if (!broken) {
            let mtmp = m_at(x, y);
            if (!(broken = await flooreffects(obj, x, y, 'fall'))) {
                place_object(obj, x, y);
                if (!mtmp && u_at(x, y))
                    mtmp = game.youmonst;
                if (mtmp && ohit)
                    await passive_obj(mtmp, obj);
                stackobj(obj);
            }
        }
    }
    game.thrownobj = null;
    return broken;
}

function note_unported_mthrowu(what) {
    (game.unported ||= new Set()).add('mthrowu:' + what);
}

// src/mthrowu.c:321 ohitmon() — an object launched by someone other than
// the hero attacks a monster. Returns 1 when the object stops (hit, or
// range exhausted). potionhit, munstone and minstapetrify record, each
// gated on the object that needs it.
export async function ohitmon(mtmp, otmp, range, verbose) {
    const mdat = game.mons[mtmp.mnum];
    const mon_launcher = game.marcher ? MON_WEP(game.marcher) : null;
    let damage, tmp;

    game.notonhead = (game.bhitpos.x !== mtmp.mx
                      || game.bhitpos.y !== mtmp.my);
    const ismimic = (mtmp.m_ap_type ?? 0) !== 0
                    && mtmp.m_ap_type !== M_AP_MONSTER;
    const vis = cansee(game.bhitpos.x, game.bhitpos.y);
    if (vis)
        observe_object(otmp);

    tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, false);
    /* High level monsters will be more likely to hit, but only against
       the target the archer was aiming at. */
    if (game.marcher && game.mtarget === mtmp) {
        if (game.marcher.m_lev > 5)
            tmp += game.marcher.m_lev - 5;
        if (mon_launcher && mon_launcher.oartifact)
            note_unported_mthrowu('ohitmon:spec_abon');
    }
    if (tmp < rnd(20)) {
        if (!ismimic) {
            if (vis)
                await miss(distant_name(otmp, mshot_xname), mtmp);
            else if (verbose && !game.mtarget)
                await pline('It is missed.');
        }
        if (!range) { /* Last position; object drops */
            await drop_throw(otmp, 0, mtmp.mx, mtmp.my);
            return 1;
        }
    } else if (otmp.oclass === OCLASSES.POTION_CLASS) {
        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
        note_unported_mthrowu('ohitmon:potionhit');
        return 1;
    } else {
        const material = game.objects[otmp.otyp].oc_material;
        const harmless = (stone_missile(otmp) && passes_rocks(mdat));

        damage = dmgval(otmp, mtmp);
        if (otmp.otyp === ONAMES.ACID_VENOM && resists_acid(mtmp))
            damage = 0;
        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
        if (vis) {
            if (otmp.otyp === ONAMES.EGG) {
                await pline(`Splat!  ${Monnam(mtmp)} is hit with `
                            + `${otmp.known
                                 ? an(game.mons[otmp.corpsenm].name)
                                 : 'an'} egg!`);
            } else {
                const how = !harmless
                    ? exclam(damage)
                    : ` but passes harmlessly through ${mhim(mtmp)}.`;
                await hit(distant_name(otmp, mshot_xname), mtmp, how);
            }
        } else if (verbose && !game.mtarget) {
            await pline(`${otmp.otyp === ONAMES.EGG ? 'Splat!  ' : ''}`
                        + `${Monnam(mtmp)} is hit${exclam(damage)}`);
        }

        if (otmp.opoisoned && is_poisonable(otmp)) {
            if (resists_poison(mtmp)) {
                if (vis)
                    await pline_The(`poison doesn't seem to affect `
                                    + `${mon_nam(mtmp)}.`);
            } else {
                if (rn2(30)) {
                    damage += rnd(6);
                } else {
                    if (vis)
                        await pline_The('poison was deadly...');
                    damage = mtmp.mhp;
                }
            }
        }
        if (material === MATERIALS.SILVER && mon_hates_silver(mtmp)) {
            const flesh = (!noncorporeal(mdat) && !amorphous(mdat));

            /* note: extra silver damage is handled by dmgval() */
            if (vis) {
                let m_name = mon_nam(mtmp);
                if (flesh)
                    m_name = s_suffix(m_name) + ' flesh';
                await pline_The(`silver sears ${m_name}!`);
            } else if (verbose && !game.mtarget) {
                await pline(`${flesh ? 'Its flesh' : 'It'} is seared!`);
            }
        }
        if (otmp.otyp === ONAMES.ACID_VENOM && cansee(mtmp.mx, mtmp.my)) {
            if (resists_acid(mtmp)) {
                if (vis || (verbose && !game.mtarget))
                    await pline(`${Monnam(mtmp)} is unaffected.`);
            } else {
                if (vis)
                    await pline_The(`${hliquid('acid')} burns `
                                    + `${mon_nam(mtmp)}!`);
                else if (verbose && !game.mtarget)
                    await pline('It is burned!');
            }
        }
        if (otmp.otyp === ONAMES.EGG
            && touch_petrifies(game.mons[otmp.corpsenm])) {
            note_unported_mthrowu('ohitmon:egg_petrify');
            if (resists_ston(mtmp))
                damage = 0;
        }

        /* might already be dead (if petrified) */
        if (!harmless && !DEADMONSTER(mtmp)) {
            mtmp.mhp -= damage;
            if (DEADMONSTER(mtmp)) {
                if (vis || (verbose && !game.mtarget))
                    await pline(`${Monnam(mtmp)} is `
                        + `${(nonliving(mdat) || is_vampshifter(mtmp)
                              || !canspotmon(mtmp))
                             ? 'destroyed' : 'killed'}!`);
                /* don't blame hero for unknown rolling boulder trap */
                if (!game.context?.mon_moving
                    && (otmp.otyp !== ONAMES.BOULDER || range >= 0
                        || otmp.otrapped))
                    await xkilled(mtmp, XKILL_NOMSG);
                else
                    await mondied(mtmp);
            }
        }

        /* blinding venom and cream pie do 0 damage, but verify
           that the target is still alive anyway */
        if (!DEADMONSTER(mtmp)
            && can_blnd_mt(otmp)) {
            if (vis && mtmp.mcansee)
                await pline(`${Monnam(mtmp)} is blinded by `
                    + `${the((otmp.oclass === OCLASSES.VENOM_CLASS)
                             ? 'venom'
                             : (otmp.otyp === ONAMES.CREAM_PIE)
                               ? 'pie' : xname(otmp))}.`);
            mtmp.mcansee = 0;
            tmp = (mtmp.mblinded ?? 0) + rnd(25) + 20;
            if (tmp > 127)
                tmp = 127;
            mtmp.mblinded = tmp;
        }

        if (!DEADMONSTER(mtmp) && !game.context?.mon_moving)
            await setmangry(mtmp, true);

        const objgone = await drop_throw(otmp, 1, game.bhitpos.x,
                                         game.bhitpos.y);
        if (!objgone && range === -1) { /* special case */
            obj_extract_self(otmp);     /* free it for motion again */
            return 0;
        }
        return 1;
    }
    return 0;
}

/* src/uhitm.c can_blnd() reduced to the arms ohitmon can reach: blinding
   venom (AT_SPIT) and cream pie always can, anything else cannot blind
   through a thrown hit. The full can_blnd matrix arrives with mhitu. */
function can_blnd_mt(otmp) {
    return otmp.otyp === ONAMES.BLINDING_VENOM
           || otmp.otyp === ONAMES.CREAM_PIE;
}

/* src/mthrowu.c:552 MT_FLIGHTCHECK — can the missile enter the next square?
   hits_bars (iron bars breakage) records; the bars still stop the missile. */
function mt_flightcheck(pre, singleobj, dx, dy) {
    const nx = game.bhitpos.x + dx, ny = game.bhitpos.y + dy;

    if (!isok(nx, ny))
        return true;                        /* edge of screen */
    const nloc = game.level.at(nx, ny);
    if (IS_OBSTRUCTED(nloc.typ))
        return true;                        /* wall */
    if (closed_door(nx, ny))
        return true;
    if (nloc.typ === IRONBARS) {
        note_unported_mthrowu('m_throw:hits_bars');
        return true;
    }
    if (!pre && IS_SINK(game.level.at(game.bhitpos.x, game.bhitpos.y).typ))
        return true;                        /* thrown objects "sink" */
    return false;
}

// src/mthrowu.c:572 m_throw() — fly the missile from (x,y) along (dx,dy).
//
// tmp_at()/nh_delay_output() keeps one temporary missile glyph on the map as
// the object advances.  The tether
// (aklys) return journey, hero catch/gem-catch, potion hit, poisoning and
// blinding of the HERO record, each gated on the missile that would do it.
// src/mthrowu.c:532 u_catch_thrown_obj() — hero may catch a thrown object.
// The rn2(catch_chance) draw happens whenever the hero is unimpaired with a
// free hand and the object light enough; the actual catch (1 in ~90) then
// adds it to inventory.
function freehand() {
    const u = game.u;
    return !u.uwep || !welded(u.uwep)
        || (!bimanual(u.uwep) && (!u.uarms || !u.uarms.cursed));
}

// src/mthrowu.c:497 ucatchgem(): unicorn forms catch real and glass gems.
async function ucatchgem(gem, mon) {
    if (gem.otyp > ONAMES.LAST_GLASS_GEM
        || !is_unicorn(game.youmonst.data))
        return false;

    const gemName = xname(gem);
    const owner = s_suffix(mon_nam(mon));
    if (gem.otyp >= ONAMES.FIRST_GLASS_GEM) {
        await You(`catch the ${gemName}.`);
        await You(`are not interested in ${owner} junk.`);
        makeknown(gem.otyp);
        await dropy(gem);
    } else {
        await You(`accept ${owner} gift in the spirit in which it was intended.`);
        await hold_another_object(gem, 'You catch, but drop, %s.', gemName,
                                  'You catch:');
    }
    return true;
}

async function u_catch_thrown_obj(otmp) {
    const roleName = game.urole?.name?.m ?? game.urole?.name;
    const catch_chance = 100 - ACURR(A_DEX)
        - ((roleName === 'Monk' || roleName === 'Rogue')
           ? 20 : 0);

    const impaired = game.u.ublind
        || game.u.intrinsic?.HConfusion || game.u.uprops?.CONFUSION
        || game.u.intrinsic?.HStun || game.u.uprops?.STUNNED
        || game.u.uprops?.FUMBLING;
    if (!impaired
        && otmp.oclass !== OCLASSES.VENOM_CLASS
        && !nohands(game.youmonst.data) && freehand()
        && calc_capacity(otmp.owt) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        const simpleName = simpleonames(otmp);
        await hold_another_object(otmp,
                                  'You catch, but drop, the %s.', simpleName,
                                  `You catch the ${simpleName}!`);
        return true;
    }
    return false;
}

export async function m_throw(mon, x, y, dx, dy, range, obj) {
    let mtmp, singleobj;
    let hitu = 0, blindinc = 0;
    let tempMissile = null;

    game.bhitpos = { x, y };
    game.notonhead = false;     /* reset potentially stale value */

    if (obj.quan === 1) {
        /* Remove object from minvent; cannot be done later (the infamous
           2^32-1 orcish dagger bug) */
        if (MON_WEP(mon) === obj)
            setmnotwielded(mon, obj);
        obj_extract_self(obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = splitobj(obj, 1);
        obj_extract_self(singleobj);
    }
    game.thrownobj = singleobj;

    /* display.c tmp_at() restores the preceding temporary cell whenever the
       missile advances, then leaves the new one painted during messages. */
    const show_missile = async () => {
        if (tempMissile)
            newsym(tempMissile.x, tempMissile.y);
        display_object_at(singleobj, game.bhitpos.x, game.bhitpos.y,
                          missileGlyph);
        tempMissile = { x: game.bhitpos.x, y: game.bhitpos.y };
        if (game.animationFrame)
            await game.animationFrame();
    };
    const end_missile = () => {
        if (tempMissile) {
            newsym(tempMissile.x, tempMissile.y);
            tempMissile = null;
        }
    };

    singleobj.owornmask = 0;    /* threw one of multiple weapons in hand? */
    if (!canseemon(mon))
        singleobj.dknown = 0;   /* clear_dknown(singleobj) */

    /* C passes obj_to_glyph() to tmp_at() once, before visible flight
       squares can make the object dknown. tmp_at() retains that glyph. */
    const missileGlyph = temporary_object_glyph(singleobj);

    if ((singleobj.cursed || singleobj.greased) && (dx || dy) && !rn2(7)) {
        if (canseemon(mon) && game.flags.verbose) {
            if (is_ammo(singleobj))
                await pline(`${Monnam(mon)} misfires!`);
            else
                await pline(`${Tobjnam(singleobj, 'slip')} as `
                            + `${mon_nam(mon)} throws it!`);
        }
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        /* check validity of new direction */
        if (!dx && !dy) {
            await drop_throw(singleobj, 0, game.bhitpos.x, game.bhitpos.y);
            return;
        }
    }

    if (mt_flightcheck(true, singleobj, dx, dy)) {
        await drop_throw(singleobj, 0, game.bhitpos.x, game.bhitpos.y);
        return;
    }
    game.mesg_given = 0; /* a 'missile misses' message not yet shown */

    while (range-- > 0) { /* loop is always exited by break */
        game.bhitpos.x += dx;
        game.bhitpos.y += dy;
        singleobj.ox = game.bhitpos.x;
        singleobj.oy = game.bhitpos.y;
        if (cansee(game.bhitpos.x, game.bhitpos.y))
            observe_object(singleobj);

        mtmp = m_at(game.bhitpos.x, game.bhitpos.y);
        if (mtmp && game.mons[mtmp.mnum].mlet === MONSYMS.S_GHOST
            && singleobj.oclass !== OCLASSES.WEAPON_CLASS) {
            /* shade_miss(): only silver or blessed connects; the full test
               lives in mhitm and is recorded there. Keep going. */
            note_unported_mthrowu('m_throw:shade_miss');
            mtmp = null;
        } else if (mtmp) {
            if (await ohitmon(mtmp, singleobj, range, true))
                break;
        } else if (u_at(game.bhitpos.x, game.bhitpos.y)) {
            if (game.multi)
                nomul(0);

            if (singleobj.oclass === OCLASSES.GEM_CLASS
                && await ucatchgem(singleobj, mon)) {
                break;
            }

            /* src/mthrowu.c:695 — hero may catch the thrown object;
               rn2(catch_chance) draws whenever unimpaired with a free
               hand and light enough load. */
            if (await u_catch_thrown_obj(singleobj))
                break;

            if (singleobj.oclass === OCLASSES.POTION_CLASS) {
                const { potionhit } = await import('./potion.js');
                const { POTHIT_MONST_THROW } = await import('./const.js');
                await potionhit(game.youmonst, singleobj, POTHIT_MONST_THROW);
                break;
            }

            const oldumort = game.u.umortality ?? 0;
            switch (singleobj.otyp) {
            case ONAMES.EGG:
            case ONAMES.CREAM_PIE:
            case ONAMES.BLINDING_VENOM:
                hitu = await thitu(8, 0, { obj: singleobj }, null);
                break;
            default: {
                let dam = dmgval(singleobj, game.youmonst);
                let hitv = 3 - distmin(game.u.ux, game.u.uy,
                                       mon.mx, mon.my);
                if (hitv < -4)
                    hitv = -4;
                /* [elves get a shooting bonus, orcs don't...] */
                if (is_elf(game.mons[mon.mnum])
                    && game.objects[singleobj.otyp].oc_skill
                       === -SKILLS.P_BOW) {
                    hitv++;
                    if (MON_WEP(mon)
                        && MON_WEP(mon).otyp === ONAMES.ELVEN_BOW)
                        hitv++;
                    if (singleobj.otyp === ONAMES.ELVEN_ARROW)
                        dam++;
                }
                if (bigmonst(game.mons[game.u.umonnum ?? 0]))
                    hitv++;
                hitv += 8 + (singleobj.spe || 0);
                if (dam < 1)
                    dam = 1;
                /* Maybe_Half_Phys: Half_physical_damage is an extrinsic no
                   recorded hero has */
                hitu = await thitu(hitv, dam, { obj: singleobj }, null);
            }
            }
            if (hitu && singleobj.opoisoned && is_poisonable(singleobj)) {
                /* poisoned(): attribute loss and possible death */
                note_unported_mthrowu('m_throw:poisoned');
                void oldumort;
            }
            if (hitu && (singleobj.otyp === ONAMES.BLINDING_VENOM
                         || singleobj.otyp === ONAMES.CREAM_PIE)) {
                blindinc = rnd(25);
                if (singleobj.otyp === ONAMES.CREAM_PIE) {
                    if (!game.u.ublind)
                        await pline("Yecch!  You've been creamed.");
                    else
                        await pline(`There's something sticky all over `
                                    + `your ${body_part(FACE)}.`);
                } else { /* venom in the eyes */
                    if (!game.u.ublind)
                        await pline_The('venom blinds you.');
                    else {
                        const eyes = makeplural(body_part(EYE));
                        await Your(`${eyes} ${vtense(eyes, 'sting')}.`);
                    }
                }
            }
            if (hitu && singleobj.otyp === ONAMES.EGG) {
                note_unported_mthrowu('m_throw:egg_stoning');
            }
            await stop_occupation();
            if (hitu) {
                await drop_throw(singleobj, hitu, game.u.ux, game.u.uy);
                break;
            }
        }

        const forcehit = !rn2(5);
        if (!range || mt_flightcheck(false, singleobj, dx, dy)) {
            /* end of path or blocked */
            if (singleobj) { /* hits_bars might have destroyed it */
                if ((game.m_shot?.n ?? 0) > 1
                    && (!game.mesg_given
                        || game.bhitpos.x !== game.u.ux
                        || game.bhitpos.y !== game.u.uy)
                    && (cansee(game.bhitpos.x, game.bhitpos.y)
                        || (game.marcher && canseemon(game.marcher))))
                    await pline(`${The(mshot_xname(singleobj))} misses.`);
                await drop_throw(singleobj, 0,
                                 game.bhitpos.x, game.bhitpos.y);
            }
            break;
        }
        void forcehit; /* consumed by the flightcheck's hits_bars in C */
        await show_missile();
    }
    await show_missile();
    end_missile();
    game.mesg_given = 0; /* reset */

    if (blindinc) {
        game.u.ucreamed = (game.u.ucreamed ?? 0) + blindinc;
        note_unported_mthrowu('m_throw:make_blinded');
    }
    game.thrownobj = null;
}

// src/mthrowu.c:262 monshoot() — fire a volley of monmulti() missiles.
export async function monshoot(mtmp, otmp, mwep) {
    const mtarg = game.mtarget || null;
    const dm = distmin(mtmp.mx, mtmp.my,
                       mtarg ? mtarg.mx : mtmp.mux,
                       mtarg ? mtarg.my : mtmp.muy);
    const multishot = monmulti(mtmp, otmp, mwep);
    /* Caller must have called linedup() to set up game.tbx/tby. */

    if (canseemon(mtmp)) {
        let onm;
        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so
               xname's result is already pluralized */
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            onm = singular(otmp, xname);
            onm = otmp.oartifact ? the(onm) : an(onm);
        }
        (game.m_shot ||= {}).s = !!ammo_and_launcher(otmp, mwep);
        const trgbuf = mtarg ? mon_nam(mtarg) : '';
        await pline(`${Monnam(mtmp)} ${game.m_shot.s ? 'shoots' : 'throws'} `
                    + `${onm}${mtarg ? ' at ' : ''}${trgbuf}!`);
        game.m_shot.o = otmp.otyp;
    } else {
        (game.m_shot ||= {}).o = ONAMES.STRANGE_OBJECT;
    }
    game.m_shot.n = multishot;
    for (game.m_shot.i = 1; game.m_shot.i <= game.m_shot.n;
         game.m_shot.i++) {
        await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(game.tbx),
                      sgn(game.tby), dm, otmp);
        if (DEADMONSTER(mtmp) && game.m_shot.i < game.m_shot.n)
            break; /* cancel pending shots */
    }
    /* reset 'gm.m_shot' */
    game.m_shot.n = game.m_shot.i = 0;
    game.m_shot.o = ONAMES.STRANGE_OBJECT;
    game.m_shot.s = false;
}

// src/mthrowu.c:1016 spitmm() -- a monster spits venom at another monster.
// Venom is a real temporary object, so even a failed spit spends the
// next_ident() draw in mksobj() before rolling its chance to fire.
export async function spitmm(mtmp, mattk, mtarg) {
    if (mtmp.mcan) {
        if (!Deaf() && mdistu(mtmp) < BOLT_LIM * BOLT_LIM) {
            if (canspotmon(mtmp)) {
                await pline(`A dry rattle comes from ${
                    s_suffix(mon_nam(mtmp))} throat.`);
            } else {
                await You_hear('a dry rattle nearby.');
            }
        }
        return M_ATTK_MISS;
    }

    const utarg = mtarg === game.youmonst;
    const tx = utarg ? mtmp.mux : mtarg.mx;
    const ty = utarg ? mtmp.muy : mtarg.my;
    const tbx = tx - mtmp.mx, tby = ty - mtmp.my;

    /* m_lined_up(mtarg, mtmp), with boulders blocking monster targets. */
    game.tbx = tbx;
    game.tby = tby;
    const lined = utarg
        ? lined_up(mtmp)
        : !!((!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
             && distmin(tbx, tby, 0, 0) < BOLT_LIM
             && clear_path(tx, ty, mtmp.mx, mtmp.my));
    if (!lined)
        return M_ATTK_MISS;

    let otyp;
    switch (mattk[1]) {
    case ATTKS.AD_BLND:
    case ATTKS.AD_DRST:
        otyp = ONAMES.BLINDING_VENOM;
        break;
    case ATTKS.AD_ACID:
    default:
        otyp = ONAMES.ACID_VENOM;
        break;
    }
    const otmp = mksobj(otyp, true, false);

    if (!rn2(BOLT_LIM - distmin(mtmp.mx, mtmp.my, tx, ty))) {
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} spits venom!`);
        if (!utarg)
            game.mtarget = mtarg;
        await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby),
                      distmin(mtmp.mx, mtmp.my, tx, ty), otmp);
        game.mtarget = null;
        nomul(0);

        if (mtmp.mtame && !mtmp.isminion && mtmp.edog
            && mtmp.edog.hungrytime > 1)
            mtmp.edog.hungrytime -= 5;
        return M_ATTK_HIT;
    }

    /* obj_extract_self() and obfree() are no-ops for this OBJ_FREE venom. */
    return M_ATTK_MISS;
}

const breathwep = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];

function get_atkdam_type(adtyp) {
    if (adtyp === ATTKS.AD_RBRE) {
        const randomBreaths = [
            ATTKS.AD_MAGM, ATTKS.AD_FIRE, ATTKS.AD_COLD, ATTKS.AD_SLEE,
            ATTKS.AD_DISN, ATTKS.AD_ELEC, ATTKS.AD_DRST, ATTKS.AD_ACID,
        ];
        return randomBreaths[rn2(randomBreaths.length)];
    }
    return adtyp;
}

function seen_resistance_mask(adtyp) {
    switch (adtyp) {
    case ATTKS.AD_MAGM: return M_SEEN_MAGR;
    case ATTKS.AD_FIRE: return M_SEEN_FIRE;
    case ATTKS.AD_COLD: return M_SEEN_COLD;
    case ATTKS.AD_SLEE: return M_SEEN_SLEEP;
    case ATTKS.AD_DISN: return M_SEEN_DISINT;
    case ATTKS.AD_ELEC: return M_SEEN_ELEC;
    case ATTKS.AD_DRST: return M_SEEN_POISON;
    case ATTKS.AD_ACID: return M_SEEN_ACID;
    default: return 0;
    }
}

// src/mthrowu.c:1093 breamm(), a monster breath attack against the hero or
// another monster.
export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk[1]);
    const utarget = mtarg === game.youmonst;
    const tx = utarget ? mtmp.mux : mtarg.mx;
    const ty = utarget ? mtmp.muy : mtarg.my;
    const tbx = tx - mtmp.mx, tby = ty - mtmp.my;

    game.tbx = tbx;
    game.tby = tby;
    const lined = utarget
        ? lined_up(mtmp)
        : !!((!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
             && distmin(tbx, tby, 0, 0) < BOLT_LIM
             && clear_path(tx, ty, mtmp.mx, mtmp.my));
    if (!lined)
        return M_ATTK_HIT;

    if (mtmp.mcan) {
        if (!Deaf()) {
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} coughs.`);
            else
                await You_hear('a cough.');
        }
        return M_ATTK_MISS;
    }

    const seen = mtmp.seen_resistance ?? 0;
    if (utarget && (seen & (seen_resistance_mask(typ) | M_SEEN_REFL)))
        return M_ATTK_HIT;

    if (!mtmp.mspec_used && rn2(3)) {
        if (typ >= ATTKS.AD_MAGM && typ <= ATTKS.AD_SPC2) {
            if (canseemon(mtmp)) {
                const name = Hallucination()
                    ? 'strange breath' : breathwep[(typ - ATTKS.AD_MAGM) % 10];
                await pline(`${Monnam(mtmp)} breathes ${name}!`);
            }
            game.buzzer = mtmp;
            await dobuzz(-20 - ((typ - ATTKS.AD_MAGM) % 10), mattk[2],
                         mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby));
            game.buzzer = null;
            nomul(0);

            if (!utarget || !rn2(3))
                mtmp.mspec_used = 8 + rn2(18);
            if (utarget && typ === ATTKS.AD_SLEE && !Sleep_resistance())
                mtmp.mspec_used += rnd(20);
            if (mtmp.mtame && !mtmp.isminion && mtmp.edog
                && mtmp.edog.hungrytime >= 10)
                mtmp.edog.hungrytime -= 10;
        }
    } else {
        return M_ATTK_MISS;
    }
    return M_ATTK_HIT;
}

// src/mthrowu.c:1174 thrwmu() — monster attempts ranged attack on the hero.
export async function thrwmu(mtmp) {
    /* Rearranged beginning so monsters can use polearms not in a line */
    if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return;
    }

    /* Pick a weapon */
    const otmp = select_rwep(mtmp);
    if (!otmp)
        return;

    if (is_pole(otmp)) {
        if (otmp !== MON_WEP(mtmp))
            return; /* polearm must be wielded */

        const rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > MON_POLE_DIST || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */

        if (canseemon(mtmp)) {
            const onm = xname(otmp);
            await pline(`${Monnam(mtmp)} `
                + `${mswings_verb(otmp, rang <= 2)} `
                + `${otmp.oartifact ? the(onm) : an(onm)}.`);
        }

        let dam = dmgval(otmp, game.youmonst);
        let hitv = 3 - distmin(game.u.ux, game.u.uy, mtmp.mx, mtmp.my);
        if (hitv < -4)
            hitv = -4;
        if (bigmonst(game.mons[game.u.umonnum ?? 0]))
            hitv++;
        hitv += 8 + (otmp.spe || 0);
        if (dam < 1)
            dam = 1;

        await thitu(hitv, dam, { obj: otmp }, null);
        await stop_occupation();
        return;
    } else if (autoreturn_weapon(otmp) && !mwelded_mt(otmp)) {
        const arw = autoreturn_weapon(otmp);
        const rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > arw.range || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */
        /* always_toss = TRUE; the tether return journey is recorded in
           m_throw */
    }

    const x = mtmp.mx, y = mtmp.my;
    /* If you are coming toward the monster, soften you up with missiles;
       if you are retreating, chase unless you are getting too far away. */
    const always_toss = !!autoreturn_weapon(otmp);
    if (!lined_up(mtmp)
        || (URETREATING(x, y)
            && (!always_toss
                && rn2(BOLT_LIM - distmin(x, y, mtmp.mux, mtmp.muy)))))
        return;

    const mwep = MON_WEP(mtmp); /* wielded weapon */
    await monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
    /* src/mthrowu.c:1263, firing a volley interrupts any counted command
       even when the missile hits a pet or another monster instead of the
       hero.  The occupation wrapper notices multi == 0 on its next call and
       releases the queued input. */
    nomul(0);
}

/* src/mthrowu.c:18 URETREATING(x,y) */
function URETREATING(x, y) {
    return distmin(game.u.ux, game.u.uy, x, y)
           > distmin(game.u.ux0 ?? game.u.ux, game.u.uy0 ?? game.u.uy, x, y);
}

/* wield.c mwelded(), local: caller guarantees a monster's item */
function mwelded_mt(obj) {
    return !!(obj && (obj.owornmask & W_WEP) && obj.cursed);
}

// src/mthrowu.c:1280 blocking_terrain() — terrain at x,y blocks linedup
// checks.
function blocking_terrain(x, y) {
    if (!isok(x, y))
        return true;
    const typ = game.level.at(x, y).typ;
    /* src/dbridge.c:38 is_waterwall() is IS_WATERWALL(typ), i.e. WATER */
    if (IS_OBSTRUCTED(typ) || closed_door(x, y)
        || typ === WATER || typ === LAVAWALL)
        return true;
    return false;
}

// src/mthrowu.c:1295 linedup_callback() — walk from (bx,by) toward (ax,ay)
// along a straight or diagonal line within BOLT_LIM, calling fnc for each
// step; stops at blocking terrain, returns true when fnc does.
export function linedup_callback(ax, ay, bx, by, fnc) {
    /* These two values are set for use after successful return. */
    game.tbx = ax - bx;
    game.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!game.tbx && !game.tby)
        return false;

    /* straight line, orthogonal to the map or diagonal */
    if ((!game.tbx || !game.tby || Math.abs(game.tbx) === Math.abs(game.tby))
        && distmin(game.tbx, game.tby, 0, 0) < BOLT_LIM) {
        const dx = sgn(ax - bx), dy = sgn(ay - by);
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return false;
            if (fnc(bx, by))
                return true;
        } while (bx !== ax || by !== ay);
    }
    return false;
}
