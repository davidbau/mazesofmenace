import { C } from './c-runtime.js';

/* NetHack 5.0	zap.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.584 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */
/* Disintegration rays have special treatment; corpses are never left.
 * But the routine which calculates the damage is separate from the routine
 * which kills the monster.  The damage routine returns this cookie to
 * indicate that the monster should be disintegrated.
 */
/* all callers of boxlock_invent() pass a NONNULL obj, and boxlock
 * boxlock_invent() calls boxlock() which has nonnull arg. */
/* or disintegration */
/* 8 and 9 are currently unassigned */
/*
 * A positive index means zapped/cast/breathed by hero.
 * A negative index means zapped/cast/breathed by a monster, with value
 * index fixup beyond abs() needed for wand zaps.  Wand zaps for monster
 * use -39..-30 rather than -9..-0 because -0 is ambiguous (same as 0).
 */
export const flash_types = [
    "magic missile", /* Wands must be 0-9 */
    "bolt of fire", "bolt of cold", "sleep ray", "death ray",
    "bolt of lightning", "", "", "", "",

    "magic missile", /* Spell equivalents must be 10-19 */
    "fireball", "cone of cold", "sleep ray", "finger of death",
    "bolt of lightning", /* there is no spell, used for retribution */
    "", "", "", "",

    "blast of missiles", /* Dragon breath equivalents 20-29*/
    "blast of fire", "blast of frost", "blast of sleep gas",
    "blast of disintegration", "blast of lightning",
    "blast of poison gas", "blast of acid", "", ""
];

/* convert monster zap/spell/breath value to hero zap/spell/breath value */
export function zaptype(type) {
    type = C.argument(type, "int");
    if (Number(!!(Number(type <= C.int((-30))) && Number(C.int((-39)) <= type)))) /* monster wand zap */
    (type = C.int((type + 30)));
/* first convert -39..-30 to -9..0 so that abs()
                     * will yield 0..9 (hero wand zap) for it */
    (type = C.abs(type));
    return type;
}

/*
 * Recognizing unseen wands by zapping:  in 3.4.3 and earlier, zapping
 * most wand types while blind would add that type to the discoveries
 * list even if it had never been seen (ie, picked up while blinded
 * and shown in inventory as simply "a wand").  This behavior has been
 * changed; now such wands won't be discovered.  But if the type is
 * already discovered, then the individual wand whose effect was just
 * observed will be flagged as if seen.  [You already know wands of
 * striking; you zap "a wand" and observe striking effect (presumably
 * by sound or touch); it'll become shown in inventory as "a wand of
 * striking".]
 *
 * Unfortunately, the new behavior isn't really correct either.  There
 * should be an `eknown' bit for "effect known" added for wands (and
 * for potions since quaffing one of a stack is similar) so that the
 * particular wand which has been zapped would have its type become
 * known (it would change from "a wand" to "a wand of striking", for
 * example) without the type becoming discovered or other unknown wands
 * of that type showing additional information.  When blindness ends,
 * all objects in inventory with the eknown bit set would be discovered
 * and other items of the same type would become known as such.
 */
/* wand discovery gets special handling when hero is blinded */
export function learnwand(obj) {
    obj = C.argument(obj, "struct obj *");
/* For a wand (or wand-like tool) zapped by the player, if the
       effect was observable (determined by caller; usually seen, but
       possibly heard or felt if the hero is blinded) then discover the
       object type provided that the object itself is known (as more
       than just "a wand").  If object type is already discovered and
       we observed the effect, mark the individual wand as having been
       seen.  Suppress spells (which use fake spellbook object for `obj')
       so that casting a spell won't re-discover its forgotten book. */
    if (Number((obj).oclass != C.SPBOOK_CLASS)) {
/* if type already discovered, treat this item has having been seen
           even if hero is currently blinded (skips redundant makeknown) */
        if ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known) {
            C.observe_object(obj);
/* will usually be dknown already */
/* otherwise discover it if item itself has been or can be seen */
        }
        else {
/* in case it was picked up while blind and then zapped without
               examining inventory after regaining sight (bypassing xname) */
            if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.observe_object(obj);
/* make the discovery iff we know what we're manipulating */
            if ((obj).dknown) C.discover_object(((obj).otyp), (C.char(1)), (C.char(1)), (C.char(1)));
        }
        C.update_inventory();
    }
}

/*
 * Routines for IMMEDIATE wands and spells.
 * Also RAY or NODIR for wands that are being broken rather than zapped.
 */
/* bhitm: monster mtmp was hit by the effect of wand or spell otmp */
export function bhitm(mtmp, otmp) {
    mtmp = C.argument(mtmp, "struct monst *");
    otmp = C.argument(otmp, "struct obj *");
    let ret = 0;
    let wake = (C.char(1));
/* Most 'zaps' should wake monster */
    let reveal_invis = (C.char(0));
    const learn_it = C.scalarLocal("boolean", (C.char(0)));
    let dbldam = C.char(Number(!!((Number(((C.gu).urole).mnum == (C.PM_KNIGHT))) && C.int(((C.u).uhave).questart))));
    let skilled_spell;
    let helpful_gesture = (C.char(0));
    let dmg;
    let otyp = (otmp).otyp;
/* otmp is not NULL */
    let zap_type_text = C.literal("spell");
    let obj;
    let disguised_mimic = C.char((Number(!!(Number(((mtmp).data).mlet == C.S_MIMIC) && Number((C.int((((mtmp)).m_ap_type & 7))) != C.M_AP_NOTHING)))));
/* box_or_door(): mimic appearances that have locks */
/* is_cmap_door() tests S_symbol values, and            */
/* mon->mappearance for furniture contains one of those */
    if ((Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "==")))))) (reveal_invis = (C.char(0)));
    ((C.gn).notonhead = C.char((Number(!!(Number((mtmp).mx != ((C.gb).bhitpos).x) || Number((mtmp).my != ((C.gb).bhitpos).y))))));
    (skilled_spell = C.char((Number(!!(Number((otmp).oclass == C.SPBOOK_CLASS) && C.int((otmp).blessed))))));
    switch (otyp) {
        case (C.WAN_STRIKING):
            (zap_type_text = C.literal("wand"));
        ;
/*FALLTHRU*/
        case (C.SPE_FORCE_BOLT):
            (reveal_invis = (C.char(1)));
        (learn_it.value = C.char((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, ((C.gb).bhitpos).y, "seenV *"), "seenV *"), ((C.gb).bhitpos).x, "seenV"), "seenV") & 2))) != 0))));
        if (C.resists_magm(mtmp)) {
/* match effect on player */
            if (Number(!!(disguised_mimic && Number(!(C.disguised_as_mon(mtmp)))))) C.seemimic(mtmp);
            C.shieldeff((mtmp).mx, (mtmp).my);
            C.pline(C.literal("Boing!"), "");
/* 5.0: used to 'break' to avoid setting learn_it here */
        }
        else if (Number(!!(C.int((C.u).uswallow) || Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 202, C.literal("bhitm")), C.rnd(20))) : C.rnd(20))) < C.int((10 + C.find_mac(mtmp))))))) {
            if (disguised_mimic) C.seemimic(mtmp);
            (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 205, C.literal("bhitm")), C.d((2), (12)))) : C.d((2), (12)))));
            if (dbldam) (dmg = C.int(Math.imul(dmg, 2)));
            if (Number(otyp == C.SPE_FORCE_BOLT)) (dmg = spell_damage_bonus(dmg));
            C.callLocal(hit, zap_type_text, mtmp, exclam(dmg));
            C.callLocal(resist, mtmp, (otmp).oclass, dmg, C.TELL);
        }
        else {
            if (Number(!(disguised_mimic))) miss(zap_type_text, mtmp);
            (learn_it.value = (C.char(0)));
        }
        break;
        case (C.WAN_SLOW_MONSTER):
            case (C.SPE_SLOW_MONSTER):
                if (Number(!(C.callLocal(resist, mtmp, (otmp).oclass, 0, C.NOTELL)))) {
                    if (disguised_mimic) C.seemimic(mtmp);
                    C.mon_adjust_speed(mtmp, C.int((-1)), otmp);
                    C.check_gear_next_turn(mtmp);
/* might want speed boots */
                    if (Number(!!((Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "=="))))) && (Number(!!(Number((((mtmp).data)).mlet == C.S_VORTEX) || C.ptrCompare(((mtmp).data), C.ptrAdd(C.mons, C.PM_AIR_ELEMENTAL, "struct permonst"), "=="))))))) {
                        C.You(C.literal("disrupt %s!"), C.mon_nam(mtmp), "p");
                        C.pline(C.literal("A huge hole opens up..."), "");
                        C.expels(mtmp, (mtmp).data, (C.char(1)));
                    }
                }
        break;
        case (C.WAN_SPEED_MONSTER):
            if (Number(!(C.callLocal(resist, mtmp, (otmp).oclass, 0, C.NOTELL)))) {
                if (disguised_mimic) C.seemimic(mtmp);
                C.mon_adjust_speed(mtmp, 1, otmp);
                C.check_gear_next_turn(mtmp);
/* might want speed boots */
            }
/* wake but don't anger a peaceful target */
        (helpful_gesture = (C.char(1)));
        break;
        case (C.WAN_UNDEAD_TURNING):
            case (C.SPE_TURN_UNDEAD):
                (wake = (C.char(0)));
        if (C.callLocal(unturn_dead, mtmp)) (wake = (C.char(1)));
        if (Number(!!((Number((C.ulong(((((mtmp).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || (Number(!!(Number(!!(Number(((mtmp)).cham == C.PM_VAMPIRE) || Number(((mtmp)).cham == C.PM_VAMPIRE_LEADER))) || Number(((mtmp)).cham == C.PM_VLAD_THE_IMPALER))))))) {
            (reveal_invis = (C.char(1)));
            (wake = (C.char(1)));
            (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 251, C.literal("bhitm")), C.rnd(8))) : C.rnd(8))));
            if (dbldam) (dmg = C.int(Math.imul(dmg, 2)));
            if (Number(otyp == C.SPE_TURN_UNDEAD)) (dmg = spell_damage_bonus(dmg));
            (((C.svc).context).bypasses = (C.char(1)));
/* for make_corpse() */
            if (Number(!(C.callLocal(resist, mtmp, (otmp).oclass, dmg, C.NOTELL)))) {
                if (Number(!((Number(((mtmp)).mhp < 1))))) C.monflee(mtmp, 0, (C.char(0)), (C.char(1)));
            }
        }
        break;
        case (C.WAN_POLYMORPH):
            case (C.SPE_POLYMORPH):
                case (C.POT_POLYMORPH):
                    if (Number(!!(C.ptrCompare((mtmp).data, C.ptrAdd(C.mons, C.PM_LONG_WORM, "struct permonst"), "==") && (Number(!!(((mtmp)).mextra && Number(((((mtmp)).mextra).mcorpsenm) != C.NON_PM))))))) {
/* if a long worm has mcorpsenm set, it was polymorphed by
               the current zap and shouldn't be affected if hit again */
                        ;
                    }
                    else if (C.resists_magm(mtmp)) {
/* magic resistance protects from polymorph traps, so make
               it guard against involuntary polymorph attacks too... */
                        C.shieldeff_mon(mtmp);
                    }
                    else if (Number(!(C.callLocal(resist, mtmp, (otmp).oclass, 0, C.NOTELL)))) {
                        let polyspot = C.char((Number(otyp != C.POT_POLYMORPH)));
                        let give_msg = C.char((Number(!!(Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))))) && (Number(!!(C.canseemon(mtmp) || (Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "=="))))))))))));
/* dropped inventory (due to death by system shock,
               or loss of wielded weapon and/or worn armor due to
               limitations of new shape) won't be hit by this zap */
                        if (polyspot) for ((obj = (mtmp).minvent); obj; (obj = (obj).nobj)) C.bypass_obj(obj);
/* natural shapechangers aren't affected by system shock
               (unless protection from shapechangers is interfering
               with their metabolism...) */
                        if (Number(!!(Number((mtmp).cham == C.NON_PM) && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 290, C.literal("bhitm")), C.rn2(25))) : C.rn2(25)))))))) {
                            if (C.canseemon(mtmp)) {
                                C.pline(C.literal("%s shudders!"), C.Monnam(mtmp), "p");
                                (learn_it.value = (C.char(1)));
                            }
/* svc.context.bypasses = TRUE; ## for make_corpse() */
/* no corpse after system shock */
                            C.xkilled(mtmp, C.int((C.XKILL_GIVEMSG | C.XKILL_NOCORPSE)));
                        }
                        else {
                            let ncflags = C.NO_NC_FLAGS;
                            if (polyspot) (ncflags = C.uint((ncflags | C.NC_VIA_WAND_OR_SPELL)));
                            if (give_msg) (ncflags = C.uint((ncflags | C.NC_SHOW_MSG)));
                            if (Number(!!(Number(C.newcham(mtmp, 0, ncflags) != 0) || (Number(!!((Number(!!(Number(((mtmp).cham) >= C.LOW_PM) && Number(((mtmp).cham) < C.NUMMONS)))) && Number(C.newcham(mtmp, C.ptrAdd(C.mons, (mtmp).cham, "struct permonst"), ncflags) != 0))))))) /* if shapechange failed because there aren't
                              enough eligible candidates (most likely for
                              vampshifter), try reverting to original form */
{
                                if (Number(!!(give_msg && (Number(!!((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp)))) || (Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "=="))))))))))) (learn_it.value = (C.char(1)));
                            }
                        }
/* do this even if polymorphed failed (otherwise using
               flags.mon_polycontrol prompting to force mtmp to remain
               'long worm' would prompt again if zap hit another segment) */
                        if (Number(!!(Number(!((Number(((mtmp)).mhp < 1)))) && C.ptrCompare((mtmp).data, C.ptrAdd(C.mons, C.PM_LONG_WORM, "struct permonst"), "==")))) {
                            if (Number(!((Number(!!(((mtmp)).mextra && Number(((((mtmp)).mextra).mcorpsenm) != C.NON_PM))))))) C.newmcorpsenm(mtmp);
/* flag to indicate that mtmp became a long worm
                   on current zap, so further hits (on mtmp's new
                   tail) don't do further transforms */
                            ((((mtmp)).mextra).mcorpsenm = C.PM_LONG_WORM);
/* flag to indicate that cleanup is needed; object
                   bypass cleanup also clears mon->mextra->mcorpsenm
                   for all long worms on the level */
                            (((C.svc).context).bypasses = (C.char(1)));
                        }
                    }
        break;
        case (C.WAN_CANCELLATION):
            case (C.SPE_CANCELLATION):
                if (disguised_mimic) C.seemimic(mtmp);
        C.callLocal(cancel_monst, mtmp, otmp, (C.char(1)), (C.char(1)), (C.char(0)));
        break;
        case (C.WAN_TELEPORTATION):
            case (C.SPE_TELEPORT_AWAY):
                if (disguised_mimic) C.seemimic(mtmp);
        (reveal_invis = C.char(Number(!(C.u_teleport_mon(mtmp, (C.char(1)))))));
        (learn_it.value = C.char((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))));
        break;
        case (C.WAN_MAKE_INVISIBLE):
{
                let oldinvis = C.int((mtmp).minvis);
                let couldsee = C.char(C.canseemon(mtmp));
                const nambuf = C.localArray("char[256]", 0);
                if (disguised_mimic) C.seemimic(mtmp);
/* format monster's name before altering its visibility */
                C.strcpy(nambuf, C.Monnam(mtmp));
                C.mon_set_minvis(mtmp, (C.char(0)));
                if (Number(!!(Number(!(oldinvis)) && C.knowninvisible(mtmp)))) {
                    C.pline(C.literal("%s turns transparent!"), nambuf, "p");
                    (reveal_invis = (C.char(1)));
                    (learn_it.value = (C.char(1)));
                }
                else if (Number(!!(couldsee && Number(!(C.canseemon(mtmp)))))) {
/* keep the immediate effects of make invisible and teleportation
               ambiguous by using the same message that's used if we
               teleported mtmp (and it ended up somewhere you can't see) */
                    C.pline(C.literal("%s vanishes!"), nambuf, "p");
                }
                break;
            }
        case (C.WAN_LOCKING):
            case (C.SPE_WIZARD_LOCK):
                if (Number(!!(disguised_mimic && (Number(!!((Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT) && (Number(!!(Number(((mtmp)).mappearance == C.uint(C.CHEST)) || Number(((mtmp)).mappearance == C.uint(C.LARGE_BOX)))))))) || (Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_FURNITURE) && (Number(!!(Number((((mtmp)).mappearance) >= C.uint(C.S_vodoor)) && Number((((mtmp)).mappearance) <= C.uint(C.S_hcdoor)))))))))))))) C.that_is_a_mimic(mtmp, C.MIM_REVEAL);
/*seemimic()*/
        (wake = C.closeholdingtrap(mtmp, learn_it));
        break;
        case (C.WAN_PROBING):
            (wake = (C.char(0)));
        (reveal_invis = (C.char(1)));
        probe_monster(mtmp);
        (learn_it.value = (C.char(1)));
        break;
        case (C.WAN_OPENING):
            case (C.SPE_KNOCK):
                if (Number(!!(disguised_mimic && (Number(!!((Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT) && (Number(!!(Number(((mtmp)).mappearance == C.uint(C.CHEST)) || Number(((mtmp)).mappearance == C.uint(C.LARGE_BOX)))))))) || (Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_FURNITURE) && (Number(!!(Number((((mtmp)).mappearance) >= C.uint(C.S_vodoor)) && Number((((mtmp)).mappearance) <= C.uint(C.S_hcdoor)))))))))))))) C.that_is_a_mimic(mtmp, C.MIM_REVEAL);
/*seemimic()*/
        (wake = (C.char(0)));
/* don't want immediate counterattack */
        if (C.ptrCompare(mtmp, (C.u).ustuck, "==")) {
/* zapping either holder/holdee or self [zapyourself()] will
               release hero from holder's grasp or holdee from hero's grasp */
            C.callLocal(release_hold);
            (learn_it.value = (C.char(1)));
/* zap which hits steed will only release saddle if it
           doesn't hit a holding or falling trap; playability
           here overrides the more logical target ordering */
        }
        else if (C.openholdingtrap(mtmp, learn_it)) {
            break;
        }
        else if (C.openfallingtrap(mtmp, (C.char(1)), learn_it)) {
/* mtmp might now be on the migrating monsters list */
            break;
        }
        else if (Number(otyp == C.SPE_KNOCK)) {
            (wake = (C.char(1)));
            (ret = 1);
            if (Number(!!(Number(((mtmp).data).msize < C.MZ_HUMAN) && Number(!(C.m_is_steadfast(mtmp)))))) {
                if (C.canseemon(mtmp)) C.pline(C.literal("%s is knocked back!"), C.Monnam(mtmp), "p");
                C.mhurtle(mtmp, C.int(((mtmp).mx - (C.u).ux)), C.int(((mtmp).my - (C.u).uy)), (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 408, C.literal("bhitm")), C.rnd(2))) : C.rnd(2))));
            }
            else {
                if (C.canseemon(mtmp)) C.pline(C.literal("%s doesn't budge."), C.Monnam(mtmp), "p");
            }
            if (Number(!((Number(((mtmp)).mhp < 1))))) {
                C.wakeup(mtmp, C.char(Number(!((Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(65536n)))) != C.ulong(0n)))))));
                C.abuse_dog(mtmp);
            }
        }
        else if (C.ptrCompare(((obj = C.which_armor(mtmp, C.W_SADDLE))), 0, "!=")) {
            const buf = C.localArray("char[256]", 0);
            C.sprintf(buf, C.literal("%s %s"), C.s_suffix(C.Monnam(mtmp)), C.distant_name(obj, C.callback("xname", C.xname)), "pp");
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (mtmp).my, "seenV *"), "seenV *"), (mtmp).mx, "seenV"), "seenV") & 2))) != 0))) {
                if (Number(!((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))))) C.strcpy(buf, C.An(C.distant_name(obj, C.callback("xname", C.xname))));
                C.pline(C.literal("%s falls to the %s."), buf, C.surface((mtmp).mx, (mtmp).my), "pp");
            }
            else if ((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))) {
                C.pline(C.literal("%s falls off."), buf, "p");
            }
            C.mdrop_obj(mtmp, obj, (C.char(0)));
        }
        break;
        case (C.SPE_HEALING):
            case (C.SPE_EXTRA_HEALING):
{
                    let healamt = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 435, C.literal("bhitm")), C.d((6), (((Number(otyp == C.SPE_EXTRA_HEALING)) ? 8 : 4))))) : C.d((6), (((Number(otyp == C.SPE_EXTRA_HEALING)) ? 8 : 4)))));
                    (reveal_invis = (C.char(1)));
                    if (C.ptrCompare((mtmp).data, C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "!=")) {
                        let delta = C.int(((mtmp).mhpmax - (mtmp).mhp));
                        (wake = (C.char(0)));
/* wakeup() makes the target angry */
                        C.healmon(mtmp, healamt, 0);
/* plain healing must be blessed to cure blindness; extra
               healing only needs to not be cursed, so spell always cures
               [potions quaffed by monsters behave slightly differently;
               we use the rules for the hero here...] */
                        if (Number(!!(skilled_spell || Number(otyp == C.SPE_EXTRA_HEALING)))) C.mcureblindness(mtmp, C.char(C.canseemon(mtmp)));
                        if (C.canseemon(mtmp)) {
                            if (disguised_mimic) {
                                if ((Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT) && Number(((mtmp)).mappearance == C.uint((C.STRANGE_OBJECT))))))) {
/* it can do better now */
                                    C.set_mimic_sym(mtmp);
                                    C.newsym((mtmp).mx, (mtmp).my);
                                }
                                else C.mimic_hit_msg(mtmp, C.short(otyp));
                            }
                            else C.pline(C.literal("%s looks%s better."), C.Monnam(mtmp), ((Number(otyp == C.SPE_EXTRA_HEALING)) ? C.literal(" much") : C.literal("")), "pp");
                        }
                        if (Number(!!(Number(!!((mtmp).mtame && (Number(((C.gu).urole).mnum == (C.PM_HEALER))))) && (Number(delta > 0))))) {
                            C.more_experienced((((Number((delta) < (healamt))) ? (delta) : (healamt))), 0);
                            C.newexplevel();
                        }
                        if (Number(!!((mtmp).mtame || C.int((mtmp).mpeaceful)))) {
                            C.adjalign((((Number(((C.gu).urole).mnum == (C.PM_HEALER)))) ? 1 : C.sgn(((C.u).ualign).type)));
                        }
                    }
                    else {
/* Pestilence */
/* Pestilence will always resist; damage is half of (healamt/2) */
                        C.callLocal(resist, mtmp, (otmp).oclass, C.int(Math.trunc(healamt / 2)), C.TELL);
                    }
                    break;
                }
        case (C.WAN_LIGHT):
/* (broken wand) */
            if (C.flash_hits_mon(mtmp, otmp)) {
                (learn_it.value = (C.char(1)));
                (reveal_invis = (C.char(1)));
            }
        break;
        case (C.WAN_SLEEP):
/* (broken wand) */
/* [wakeup() doesn't rouse victims of temporary sleep,
           so it's okay to leave `wake' set to TRUE here;
           revealing concealed mimic is handled by sleep_monst()] */
            (reveal_invis = (C.char(1)));
        if (C.sleep_monst(mtmp, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 485, C.literal("bhitm")), C.d((C.int((1 + (otmp).spe))), (12)))) : C.d((C.int((1 + (otmp).spe))), (12)))), C.WAND_CLASS)) C.slept_monst(mtmp);
        if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) (learn_it.value = (C.char(1)));
        break;
        case (C.SPE_STONE_TO_FLESH):
            if (Number(((mtmp).data).mlet == C.S_GOLEM)) {
                let mesg;
                let name = C.Monnam(mtmp);
/* before possible polymorph */
/* turn stone golem into flesh golem */
                if (Number(!!(Number(C.int(((((mtmp).data)).pmidx)) == C.PM_STONE_GOLEM) && C.newcham(mtmp, C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"), C.NO_NC_FLAGS)))) (mesg = C.literal("turns to flesh!"));
                else if (Number(C.int(((((mtmp).data)).pmidx)) == C.PM_FLESH_GOLEM)) (mesg = C.literal("seems fleshier..."));
                else (mesg = C.literal("looks rather fleshy for a moment."));
                if (C.canseemon(mtmp)) C.pline(C.literal("%s %s"), name, mesg, "pp");
            }
            else if (Number(!!(Number(((mtmp).data).mlet == C.S_MIMIC) && (Number(!!((Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_FURNITURE) && C.stone_furniture_type((mtmp).mappearance)))) || (Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT) && C.stone_object_type((mtmp).mappearance)))))))))) {
/* note: if that_is_a_mimic() doesn't get called to reveal the
               mimic, wakeup() below will call seemimic() */
                if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (mtmp).my, "seenV *"), "seenV *"), (mtmp).mx, "seenV"), "seenV") & 2))) != 0))) {
                    C.set_msg_xy((mtmp).mx, (mtmp).my);
                    C.that_is_a_mimic(mtmp, C.uint(C.int((C.MIM_REVEAL | C.MIM_OMIT_WAIT))));
                }
            }
            else {
                (wake = (C.char(0)));
            }
        break;
        case (C.SPE_DRAIN_LIFE):
            if (disguised_mimic) C.seemimic(mtmp);
        (dmg = C.monhp_per_lvl(mtmp));
        if (dbldam) (dmg = C.int(Math.imul(dmg, 2)));
        if (Number(otyp == C.SPE_DRAIN_LIFE)) (dmg = spell_damage_bonus(dmg));
        if (C.resists_drli(mtmp)) {
            C.shieldeff_mon(mtmp);
        }
        else if (Number(!!(Number(!(C.callLocal(resist, mtmp, (otmp).oclass, dmg, C.NOTELL))) && Number(!((Number(((mtmp)).mhp < 1))))))) {
            ((mtmp).mhp = C.int(((mtmp).mhp - dmg)));
            ((mtmp).mhpmax = C.int(((mtmp).mhpmax - dmg)));
/* die if already level 0, regardless of hit points */
            if (Number(!!(Number(!!((Number(((mtmp)).mhp < 1)) || Number((mtmp).mhpmax <= 0))) || Number((mtmp).m_lev < 1)))) {
                C.killed(mtmp);
            }
            else {
                C.bump(C.fieldRef(mtmp, "m_lev"), -1, true, "unsigned char");
                if (C.canseemon(mtmp)) C.pline(C.literal("%s suddenly seems weaker!"), C.Monnam(mtmp), "p");
            }
        }
        break;
        case (C.WAN_NOTHING):
            (wake = (C.char(0)));
        break;
        default:
            C.impossible(C.literal("What an interesting effect (%d)"), otyp, "i");
        break;
    }
    if (Number(!!(wake && Number(!((Number(((mtmp)).mhp < 1))))))) {
/* seemimic() is done by wakeup() and might unblock vision */
        C.wakeup(mtmp, C.char(((helpful_gesture) ? (C.char(0)) : (C.char(1)))));
        C.m_respond(mtmp);
        if (Number(!!(C.int((mtmp).isshk) && Number(!(C.deref((C.u).ushops, "char")))))) C.hot_pursuit(mtmp);
    }
/* note: gb.bhitpos won't be set if swallowed, but that's okay since
     * reveal_invis will be false.  We can't use mtmp->mx, my since it
     * might be an invisible worm hit on the tail.
     */
    if (Number(!!(reveal_invis && Number(!((Number(((mtmp)).mhp < 1))))))) {
        if (Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, ((C.gb).bhitpos).y, "seenV *"), "seenV *"), ((C.gb).bhitpos).x, "seenV"), "seenV") & 2))) != 0)) && Number(!((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))))))) C.map_invisible(((C.gb).bhitpos).x, ((C.gb).bhitpos).y);
    }
/* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it.value) learnwand(otmp);
    return ret;
}

/* hero is held by a monster or engulfed or holding a monster and has zapped
   opening/unlocking magic at holder/engulfer/holdee or at self */
export function release_hold() {
    let mtmp = (C.u).ustuck;
    if (Number(!(mtmp))) {
        C.impossible(C.literal("release_hold when not held?"), "");
    }
    else if ((C.u).uswallow) {
/* possible for sticky hero to be swallowed */
        if ((C.ptrCompare(C.dmgtype_fromattack(((mtmp).data), 26, 11), 0, "!="))) {
            if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.pline(C.literal("%s opens its mouth!"), C.Monnam(mtmp), "p");
            else C.You_feel(C.literal("a sudden rush of air!"), "");
        }
/* gives "you get regurgitated" or "you get expelled from <mon>" */
        C.expels(mtmp, (mtmp).data, (C.char(1)));
    }
    else if (C.sticks(((C.gy).youmonst).data)) {
/* order matters if 'holding' status condition is enabled;
           set_ustuck() will set flag for botl update, You() pline will
           trigger a status update with "UHold" removed */
        C.set_ustuck(0);
        C.You(C.literal("release %s."), C.mon_nam(mtmp), "p");
    }
    else {
/* held but not swallowed */
        const relbuf = C.localArray("char[256]", 0);
        C.unstuck((C.u).ustuck);
        if (Number(!((Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(8192n)))) != C.ulong(0n)))))) C.sprintf(relbuf, C.literal("from %s grasp"), C.s_suffix(C.mon_nam(mtmp)), "p");
        else C.sprintf(relbuf, C.literal("by %s"), C.mon_nam(mtmp), "p");
        C.You(C.literal("are released %s."), relbuf, "p");
    }
}

export function probe_objchain(otmp) {
    otmp = C.argument(otmp, "struct obj *");
    for (; otmp; (otmp = (otmp).nobj)) {
        C.observe_object(otmp);
/* treat as "seen" */
        if (Number(!!((Number(!!(Number(((otmp)).otyp >= C.LARGE_BOX) && Number(((otmp)).otyp <= C.BAG_OF_TRICKS)))) || Number((otmp).otyp == C.STATUE)))) {
            ((otmp).lknown = C.uint(1));
            if (Number(!((Number(!!(Number(((otmp)).otyp == C.LARGE_BOX) && Number(((otmp)).spe == 1))))))) ((otmp).cknown = C.uint(1));
        }
        else if (Number((otmp).otyp == C.TIN)) ((otmp).known = C.uint(1));
    }
}

export function probe_monster(mtmp) {
    mtmp = C.argument(mtmp, "struct monst *");
    C.mstatusline(mtmp);
    if ((C.gn).notonhead) return;
/* don't show minvent for long worm tail */
    if ((mtmp).minvent) {
        probe_objchain((mtmp).minvent);
        C.display_minventory(mtmp, C.int((C.int((C.MINV_ALL | C.MINV_NOLET)) | C.PICK_NONE)), 0);
    }
    else {
        C.pline(C.literal("%s is not carrying anything%s."), C.noit_Monnam(mtmp), (((Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "==")))))) ? C.literal(" besides you") : C.literal("")), "pp");
    }
}

/*
 * Return the object's physical location.  This only makes sense for
 * objects that are currently on the level (i.e. migrating objects
 * are nowhere).  By default, only things that can be seen (in hero's
 * inventory, monster's inventory, or on the ground) are reported.
 * By adding BURIED_TOO and/or CONTAINED_TOO flags, you can also get
 * the location of buried and contained objects.  Note that if an
 * object is carried by a monster, its reported position may change
 * from turn to turn.  This function returns FALSE if the position
 * is not available or subject to the constraints above.
 */
export function get_obj_location(obj, xp, yp, locflags) {
    obj = C.argument(obj, "struct obj *");
    xp = C.argument(xp, "coordxy *");
    yp = C.argument(yp, "coordxy *");
    locflags = C.argument(locflags, "int");
    switch ((obj).where) {
        case (3):
            C.store(xp, "coordxy", (C.u).ux);
        C.store(yp, "coordxy", (C.u).uy);
        return (C.char(1));
        case C.OBJ_FLOOR:
            C.store(xp, "coordxy", (obj).ox);
        C.store(yp, "coordxy", (obj).oy);
        return (C.char(1));
        case C.OBJ_MINVENT:
            if ((((obj).ocarry).ocarry).mx) {
                C.store(xp, "coordxy", (((obj).ocarry).ocarry).mx);
                C.store(yp, "coordxy", (((obj).ocarry).ocarry).my);
                return (C.char(1));
            }
        break;
/* !mx => migrating monster */
        case C.OBJ_BURIED:
            if (C.int((locflags & C.BURIED_TOO))) {
                C.store(xp, "coordxy", (obj).ox);
                C.store(yp, "coordxy", (obj).oy);
                return (C.char(1));
            }
        break;
        case C.OBJ_CONTAINED:
            if (C.int((locflags & C.CONTAINED_TOO))) return get_obj_location(((obj).ocontainer).ocontainer, xp, yp, locflags);
        break;
    }
    C.store(xp, "coordxy", C.store(yp, "coordxy", C.short(0)));
    return (C.char(0));
}

export function get_mon_location(mon, xp, yp, locflags) /* non-zero means get location even if monster is buried */
{
    mon = C.argument(mon, "struct monst *");
    xp = C.argument(xp, "coordxy *");
    yp = C.argument(yp, "coordxy *");
    locflags = C.argument(locflags, "int");
    if (Number(!!(C.ptrCompare(mon, C.fieldRef(C.gy, "youmonst"), "==") || (Number(!!((C.u).usteed && C.ptrCompare(mon, (C.u).usteed, "=="))))))) {
        C.store(xp, "coordxy", (C.u).ux);
        C.store(yp, "coordxy", (C.u).uy);
        return (C.char(1));
    }
    else if (Number(!!(Number((mon).mx > 0) && (Number(!!(Number(!((mon).mburied)) || locflags)))))) {
        C.store(xp, "coordxy", (mon).mx);
        C.store(yp, "coordxy", (mon).my);
        return (C.char(1));
    }
    else {
/* migrating or buried */
        C.store(xp, "coordxy", C.store(yp, "coordxy", C.short(0)));
        return (C.char(0));
    }
}

/* used by revive() and animate_statue() */
export function montraits(obj, cc, adjacentok) /* False: at obj's spot only,
                         * True: nearby is allowed */
{
    obj = C.argument(obj, "struct obj *");
    cc = C.argument(cc, "coord *");
    adjacentok = C.argument(adjacentok, "boolean");
    let mtmp = 0;
    let mtmp2 = (((Number(!!(((obj)).oextra && ((((obj)).oextra).omonst))))) ? C.get_mtraits(obj, (C.char(1))) : 0);
    if (mtmp2) {
/* save_mtraits() validated mtmp2->mnum */
        ((mtmp2).data = C.ptrAdd(C.mons, (mtmp2).mnum, "struct permonst"));
        if (Number(!!(Number((mtmp2).mhpmax > 0) || (Number(!!(Number(!!(C.ptrCompare(((mtmp2).data), C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") || C.ptrCompare(((mtmp2).data), C.ptrAdd(C.mons, C.PM_FAMINE, "struct permonst"), "=="))) || C.ptrCompare(((mtmp2).data), C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "=="))))))) {
            (mtmp = C.makemon((mtmp2).data, (cc).x, (cc).y, C.uint((C.long((C.long((C.long((C.long((C.long((C.NO_MINVENT | C.MM_NOWAIT)) | C.MM_NOCOUNTBIRTH)) | C.MM_NOTAIL)) | C.MM_NOMSG)) | (((adjacentok) ? C.MM_ADJACENTOK : C.long(0)))))))));
/* in case mtmp2 is a long worm; saved traits for
                               long worm don't include tail segments so don't
                               give mtmp any; it will be given a new 'wormno'
                               though (unless those are exhausted) so be able
                               to grow new tail segments */
        }
        if (Number(!(mtmp))) {
/* mtmp2 is a copy of obj's object->oextra->omonst extension
               and is not on the map or on any monst lists */
            C.dealloc_monst(mtmp2);
            return 0;
        }
/* heal the monster; lower than normal level might come from
           adj_lev() but we assume it has come from 'mtmp' being level
           drained before finally killed; give a chance to restore
           some levels so that trolls and Riders can't be drained to
           level 0 and then trivially killed repeatedly */
        if (Number(C.int((mtmp).m_lev) < ((mtmp).data).mlevel)) {
            let ltmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 750, C.literal("montraits")), C.rnd(C.int((((mtmp).data).mlevel + 1))))) : C.rnd(C.int((((mtmp).data).mlevel + 1)))));
            if (Number(ltmp > C.int((mtmp).m_lev))) {
                while (Number(C.int((mtmp).m_lev) < ltmp)) {
                    C.bump(C.fieldRef(mtmp, "m_lev"), 1, true, "unsigned char");
                    ((mtmp).mhpmax = C.int(((mtmp).mhpmax + C.monhp_per_lvl(mtmp))));
                }
                ((mtmp2).m_lev = (mtmp).m_lev);
            }
        }
        if (Number((mtmp).mhpmax > (mtmp2).mhpmax)) /* &&is_rider(mtmp2->data)*/
        ((mtmp2).mhpmax = (mtmp).mhpmax);
        ((mtmp2).mhp = (mtmp2).mhpmax);
/* Get these ones from mtmp */
        ((mtmp2).minvent = (mtmp).minvent);
/*redundant*/
/* monster ID is available if the monster died in the current
           game, but will be zero if the corpse was in a bones level
           (we cleared it when loading bones) */
        if ((mtmp).m_id) {
            ((mtmp2).m_id = (mtmp).m_id);
/* might be bringing quest leader back to life */
            if (Number(!!(C.int(((C.svq).quest_status).leader_is_dead) && Number((mtmp2).m_id == ((C.svq).quest_status).leader_m_id)))) /* leader_is_dead implies leader_m_id is valid */
            (((C.svq).quest_status).leader_is_dead = C.uint((C.char(0))));
        }
        ((mtmp2).mx = (mtmp).mx);
        ((mtmp2).my = (mtmp).my);
        ((mtmp2).mux = (mtmp).mux);
        ((mtmp2).muy = (mtmp).muy);
        ((mtmp2).mw = (mtmp).mw);
        ((mtmp2).wormno = (mtmp).wormno);
        ((mtmp2).misc_worn_check = (mtmp).misc_worn_check);
        ((mtmp2).weapon_check = (mtmp).weapon_check);
        ((mtmp2).mtrapseen = (mtmp).mtrapseen);
        ((mtmp2).mflee = (mtmp).mflee);
        ((mtmp2).mburied = (mtmp).mburied);
        ((mtmp2).mundetected = (mtmp).mundetected);
        ((mtmp2).mfleetim = (mtmp).mfleetim);
        ((mtmp2).mlstmv = (mtmp).mlstmv);
        ((mtmp2).m_ap_type = (mtmp).m_ap_type);
/* set these ones explicitly */
        ((mtmp2).mrevived = C.uint(1));
        ((mtmp2).mavenge = C.uint(0));
        ((mtmp2).meating = 0);
        ((mtmp2).mleashed = C.uint(0));
        ((mtmp2).mtrapped = C.uint(0));
        ((mtmp2).msleeping = C.uint(0));
        ((mtmp2).mfrozen = C.uint(0));
        ((mtmp2).mcanmove = C.uint(1));
/* most cancelled monsters return to normal,
           but some need to stay cancelled */
        if (Number(!!(Number(!(C.dmgtype((mtmp2).data, C.AD_SEDU))) && (Number(!!(Number(!((C.sysopt).seduce)) || Number(!(C.dmgtype((mtmp2).data, C.AD_SSEX))))))))) ((mtmp2).mcan = C.uint(0));
        ((mtmp2).mcansee = C.uint(1));
/* set like in makemon */
        ((mtmp2).mblinded = C.uint(0));
        ((mtmp2).mstun = C.uint(0));
        ((mtmp2).mconf = C.uint(0));
/* when traits are for a shopkeeper, dummy monster 'mtmp' won't
           have necessary eshk data for replmon() -> replshk() */
        if ((mtmp2).isshk) {
            C.neweshk(mtmp);
            C.store(((((mtmp)).mextra).eshk), "struct eshk", C.deref(((((mtmp2)).mextra).eshk), "struct eshk"));
            if (Number(!!(C.ptrCompare((((((mtmp2)).mextra).eshk)).bill_p, 0, "!=") && C.ptrCompare((((((mtmp2)).mextra).eshk)).bill_p, C.castPointer(C.int((-1000)), "struct bill_x *"), "!=")))) ((((((mtmp)).mextra).eshk)).bill_p = C.ptrAdd((((((mtmp)).mextra).eshk)).bill, 0, "struct bill_x"));
            ((mtmp).isshk = C.uint(1));
        }
        C.replmon(mtmp, mtmp2);
        C.newsym((mtmp2).mx, (mtmp2).my);
/* Might now be invisible */
/* in case Protection_from_shape_changers is different
           now than it was when the traits were stored */
        C.restore_cham(mtmp2);
    }
    return mtmp2;
}

/*
 * get_container_location() returns the following information
 * about the outermost container:
 * loc argument gets set to:
 *      OBJ_INVENT      if in hero's inventory; return 0.
 *      OBJ_FLOOR       if on the floor; return 0.
 *      OBJ_BURIED      if buried; return 0.
 *      OBJ_MINVENT     if in monster's inventory; return monster.
 * container_nesting is updated with the nesting depth of the containers
 * if applicable.
 */
export function get_container_location(obj, loc, container_nesting) {
    obj = C.argument(obj, "struct obj *");
    loc = C.argument(loc, "int *");
    container_nesting = C.argument(container_nesting, "int *");
    if (container_nesting) C.store(container_nesting, "int", 0);
    while (Number(!!(obj && Number((obj).where == C.OBJ_CONTAINED)))) {
        if (container_nesting) C.store(container_nesting, "int", C.int((C.deref(container_nesting, "int") + 1)));
        (obj = ((obj).ocontainer).ocontainer);
    }
    if (obj) {
        C.store(loc, "int", (obj).where);
/* outermost container's location */
        if (Number((obj).where == C.OBJ_MINVENT)) return ((obj).ocarry).ocarry;
    }
    return 0;
}

/* can zombie dig the location at x,y */
export function zombie_can_dig(x, y) {
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    if (C.isok(x, y)) {
        let typ = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ;
        let ttmp;
        if (C.ptrCompare(((ttmp = C.t_at(x, y))), 0, "!=")) return (C.char(0));
        if (Number(!!(Number(!!(Number(typ == C.ROOM) || Number(typ == C.CORR))) || Number(typ == C.GRAVE)))) return (C.char(1));
    }
    return (C.char(0));
}

/*
 * Attempt to revive the given corpse, return the revived monster if
 * successful.  Note: this does NOT use up the corpse if it fails.
 * If corpse->quan is more than 1, only one corpse will be affected
 * and only one monster will be resurrected.
 */
export function revive(corpse, by_hero) {
    corpse = C.argument(corpse, "struct obj *");
    by_hero = C.argument(by_hero, "boolean");
    let mtmp = 0;
    let mptr;
    let container;
    const xy = C.recordLocal("coord", 0);
    const x = C.scalarLocal("coordxy");
    const y = C.scalarLocal("coordxy");
    let one_of;
    let mmflags = C.uint(C.long((C.long((C.NO_MINVENT | C.MM_NOWAIT)) | C.MM_NOMSG)));
    const montype = C.scalarLocal("int");
    let cgend;
    const container_nesting = C.scalarLocal("int", 0);
    let is_zomb;
    if (Number((corpse).otyp != C.CORPSE)) {
        C.impossible(C.literal("Attempting to revive %s?"), C.xname(corpse), "p");
        return 0;
    }
    (montype.value = (corpse).corpsenm);
/* treat buried auto-reviver (troll, Rider?) like a zombie
       so that it can dig itself out of the ground if it revives */
    (is_zomb = C.char(Number(!!(Number((C.deref(C.ptrAdd(C.mons, montype.value, "struct permonst"), "struct permonst")).mlet == C.S_ZOMBIE) || (Number(!!(Number((corpse).where == C.OBJ_BURIED) && (Number(!!((Number(!!(Number(!!(C.ptrCompare((C.ptrAdd(C.mons, montype.value, "struct permonst")), C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") || C.ptrCompare((C.ptrAdd(C.mons, montype.value, "struct permonst")), C.ptrAdd(C.mons, C.PM_FAMINE, "struct permonst"), "=="))) || C.ptrCompare((C.ptrAdd(C.mons, montype.value, "struct permonst")), C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "==")))) || Number(((C.ptrAdd(C.mons, montype.value, "struct permonst"))).mlet == C.S_TROLL)))))))))));
/* if this corpse is being eaten, stop doing that; this should be done
       after makemon() succeeds and skipped if it fails, but waiting until
       we know the result for that would be too late */
    C.cant_finish_meal(corpse);
    (x.value = (y.value = C.short(0)));
    if (Number((corpse).where != C.OBJ_CONTAINED)) {
        let locflags = ((is_zomb) ? C.BURIED_TOO : 0);
/* only for invent, minvent, or floor, or if zombie, buried */
        (container = 0);
        get_obj_location(corpse, x, y, locflags);
    }
    else {
/* deal with corpses in [possibly nested] containers */
        let carrier;
        const holder = C.scalarLocal("int", C.OBJ_FREE);
        (container = ((corpse).ocontainer).ocontainer);
        (carrier = get_container_location(container, holder, container_nesting));
        switch (holder.value) {
            case C.OBJ_MINVENT:
                ((x.value = (carrier).mx), (y.value = (carrier).my));
            break;
            case (3):
                ((x.value = (C.u).ux), (y.value = (C.u).uy));
            break;
            case C.OBJ_FLOOR:
                get_obj_location(corpse, x, y, C.CONTAINED_TOO);
            break;
            default:
                break;
/* x,y are 0 */
        }
    }
    if (x.value) /* update corpse's location now that we're sure where it is */
    (((corpse).ox = x.value), ((corpse).oy = y.value));
    if (Number(!!(Number(!!(Number(!(x.value)) || (Number(!!(container && (Number(!!(Number(!!(Number(!!(C.int((container).olocked) || Number(container_nesting.value > 2))) || Number((container).otyp == C.STATUE))) || (Number(!!(Number((container).otyp == C.BAG_OF_HOLDING) && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 952, C.literal("revive")), C.rn2(40))) : C.rn2(40)))))))))))))) || (Number(!!(Number(!!(is_zomb && Number((corpse).where == C.OBJ_BURIED))) && Number(!(zombie_can_dig(x.value, y.value))))))))) /* Rules for revival from containers:
         *  - the container cannot be locked
         *  - the container cannot be heavily nested (>2 is arbitrary)
         *  - the container cannot be a statue or bag of holding
         *    (except in very rare cases for the latter)
         */
/* if buried zombie cannot dig itself out, do not revive */
    return 0;
/* prepare for the monster */
    (mptr = C.ptrAdd(C.mons, montype.value, "struct permonst"));
/* [should probably handle recorporealization first; if corpse and
       ghost are at same location, revived creature shouldn't be bumped
       to an adjacent spot by ghost which joins with it] */
    if ((C.ptrCompare(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x.value, "struct monst *[21]"), "struct monst *[21]"), y.value, "struct monst *"), "struct monst *"), 0, "!="))) {
        if (C.enexto(xy, x.value, y.value, mptr)) ((x.value = (xy).x), (y.value = (xy).y));
    }
    if (Number(!!(C.int((corpse).norevive) || (Number(!!(Number((C.deref(C.ptrAdd(C.mons, montype.value, "struct permonst"), "struct permonst")).mlet == C.S_EEL) && Number(!((Number(!!(Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x.value, "struct rm[21]"), "struct rm[21]"), y.value, "struct rm"), "struct rm")).typ) >= C.POOL) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x.value, "struct rm[21]"), "struct rm[21]"), y.value, "struct rm"), "struct rm")).typ) <= C.DRAWBRIDGE_UP)))))))))))) {
        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y.value, "seenV *"), "seenV *"), x.value, "seenV"), "seenV") & 2))) != 0))) C.pline(C.literal("%s twitches feebly."), C.upstart(C.corpse_xname(corpse, 0, C.CXN_PFX_THE)), "p");
        return 0;
    }
/* applicable when montraits/corpse->oextra->omonst aren't used */
    (cgend = (C.int(((corpse).spe & C.CORPSTAT_GENDER))));
    if (Number(cgend == C.CORPSTAT_MALE)) (mmflags = C.uint((mmflags | C.MM_MALE)));
    else if (Number(cgend == C.CORPSTAT_FEMALE)) (mmflags = C.uint((mmflags | C.MM_FEMALE)));
    if (C.cant_revive(montype, (C.char(1)), corpse)) {
/* make a zombie or doppelganger instead */
/* note: montype has changed; mptr keeps old value for newcham() */
        (mtmp = C.makemon(C.ptrAdd(C.mons, montype.value, "struct permonst"), x.value, y.value, mmflags));
        if (mtmp) {
/* skip ghost handling */
            if ((Number(!!(((corpse)).oextra && ((((corpse)).oextra).omid))))) C.free_omid(corpse);
            if ((Number(!!(((corpse)).oextra && ((((corpse)).oextra).omonst))))) C.free_omonst(corpse);
            if (Number((mtmp).cham == C.PM_DOPPELGANGER)) {
/* change shape to match the corpse */
                C.newcham(mtmp, mptr, C.NO_NC_FLAGS);
            }
            else if (Number(((mtmp).data).mlet == C.S_ZOMBIE)) {
                ((mtmp).mhp = ((mtmp).mhpmax = 100));
                C.mon_adjust_speed(mtmp, 2, 0);
/* MFAST */
            }
        }
    }
    else if ((Number(!!(((corpse)).oextra && ((((corpse)).oextra).omonst))))) {
/* use saved traits */
        (((xy).x = x.value), ((xy).y = y.value));
        (mtmp = C.callLocal(montraits, corpse, xy, (C.char(0))));
        if (Number(!!(Number(!!(mtmp && (mtmp).mtame)) && Number(!((mtmp).isminion))))) C.wary_dog(mtmp, (C.char(1)));
    }
    else {
/* make a new monster */
        (mtmp = C.makemon(mptr, x.value, y.value, C.uint(C.long((C.long(mmflags) | C.MM_NOCOUNTBIRTH)))));
    }
    if (Number(!(mtmp))) return 0;
/* hiders shouldn't already be re-hidden when they revive */
    if ((mtmp).mundetected) {
        ((mtmp).mundetected = C.uint(0));
        C.newsym((mtmp).mx, (mtmp).my);
    }
    if ((C.int((((mtmp)).m_ap_type & 7)))) C.seemimic(mtmp);
    (one_of = C.char((Number((corpse).quan > 1n))));
    if (one_of) (corpse = C.splitobj(corpse, 1n));
/* if this is caused by the hero there might be a shop charge */
    if (by_hero) {
        let shkp = 0;
        ((x.value = (corpse).ox), (y.value = (corpse).oy));
        if (Number(!!(C.costly_spot(x.value, y.value) && ((((Number(((corpse)).where == 3))) ? C.int((corpse).unpaid) : Number(!((corpse).no_charge))))))) (shkp = C.shop_keeper(C.deref(C.in_rooms(x.value, y.value, C.SHOPBASE), "char")));
        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y.value, "seenV *"), "seenV *"), x.value, "seenV"), "seenV") & 2))) != 0))) {
            const buf = C.localArray("char[256]", 0);
            C.strcpy(buf, ((one_of) ? C.literal("one of ") : C.literal("")));
/* shk_your: "the " or "your " or "<mon>'s " or "<Shk>'s ".
               If the result is "Shk's " then it will be ambiguous:
               is Shk the mon carrying it, or does Shk's shop own it?
               Let's not worry about that... */
            C.shk_your(C.eos(buf), corpse);
            if (one_of) C.bump(C.fieldRef(corpse, "quan"), 1, true, "long");
/* force plural */
            C.strcat(buf, C.corpse_xname(corpse, 0, C.CXN_NO_PFX));
            if (one_of) /* could be simplified to ''corpse->quan = 1L;'' */
            C.bump(C.fieldRef(corpse, "quan"), -1, true, "long");
            C.pline(C.literal("%s glows iridescently."), C.upstart(buf), "p");
            ((C.iflags).last_msg = C.PLNMSG_OBJ_GLOWS);
/* usually for BUC change */
        }
        else if (shkp) {
/* need some prior description of the corpse since
               stolen_value() will refer to the object as "it" */
            C.pline(C.literal("A corpse is resuscitated."), "");
        }
/* don't charge for shopkeeper's own corpse if we just revived him */
        if (Number(!!(shkp && C.ptrCompare(mtmp, shkp, "!=")))) C.stolen_value(corpse, x.value, y.value, C.char((shkp).mpeaceful), (C.char(0)));
/* [we don't give any comparable message about the corpse for
           the !by_hero case because caller might have already done so] */
    }
/* handle recorporealization of an active ghost */
    if ((Number(!!(((corpse)).oextra && ((((corpse)).oextra).omid))))) {
        let m_id;
        let ghost;
        let otmp;
        (m_id = ((((corpse)).oextra).omid));
        (ghost = C.find_mid(m_id, C.FM_FMON));
        if (Number(!!(ghost && C.ptrCompare((ghost).data, C.ptrAdd(C.mons, C.PM_GHOST, "struct permonst"), "==")))) {
            if (C.canseemon(ghost)) C.pline(C.literal("%s is suddenly drawn into its former body!"), C.Monnam(ghost), "p");
/* transfer the ghost's inventory along with it */
            while (C.ptrCompare(((otmp = (ghost).minvent)), 0, "!=")) {
                C.obj_extract_self(otmp);
                C.add_to_minv(mtmp, otmp);
            }
/* tame the revived monster if its ghost was tame */
            if (Number(!!((ghost).mtame && Number(!((mtmp).mtame))))) {
                if (C.tamedog(mtmp, 0, (C.char(0)))) {
/* ghost's edog data is ignored */
                    ((mtmp).mtame = (ghost).mtame);
                }
            }
/* was ghost, now alive, it's all very confusing */
            ((mtmp).mconf = C.uint(1));
/* separate ghost monster no longer exists */
            C.mongone(ghost);
        }
        C.free_omid(corpse);
    }
/* monster retains its name */
    if (Number(!!((Number(!!(((corpse)).oextra && ((((corpse)).oextra).oname)))) && Number(!((Number((C.int(((((mtmp).data)).geno & 4096))) != 0))))))) (mtmp = C.christen_monst(mtmp, ((((corpse)).oextra).oname)));
/* partially eaten corpse yields wounded monster */
    if ((corpse).oeaten) ((mtmp).mhp = C.eaten_stat((mtmp).mhp, corpse));
/* track that this monster was revived at least once */
    ((mtmp).mrevived = C.uint(1));
/* finally, get rid of the corpse--it's gone now */
    switch ((corpse).where) {
        case (3):
            C.useup(corpse);
        break;
        case C.OBJ_FLOOR:
/* not useupf(), which charges;
           delobj() won't use up a Rider's corpse, delobj_core(,TRUE) will */
            C.delobj_core(corpse, (C.char(1)));
/* for floor, also calls newsym() */
        break;
        case C.OBJ_MINVENT:
            C.m_useup(((corpse).ocarry).ocarry, corpse);
        break;
        case C.OBJ_CONTAINED:
/* obj_extract_self() will update corpse->ocontainer->owt */
            C.obj_extract_self(corpse);
        C.obfree(corpse, 0);
        break;
        case C.OBJ_BURIED:
            if (is_zomb) {
                C.obj_extract_self(corpse);
                C.obfree(corpse, 0);
                break;
            }
        ;
/*FALLTHRU*/
        case C.OBJ_FREE:
            case C.OBJ_MIGRATING:
                case C.OBJ_ONBILL:
                    case C.OBJ_LUAFREE:
                        default:
                            C.panic(C.literal("revive default case %d"), C.int((corpse).where), "i");
    }
    return mtmp;
}

export function revive_egg(obj) /* nonnull */
{
    obj = C.argument(obj, "struct obj *");
/*
     * Note: generic eggs with corpsenm set to NON_PM will never hatch.
     */
    if (Number((obj).otyp != C.EGG)) return;
    if (Number(!!(Number((obj).corpsenm != C.NON_PM) && Number(!(C.dead_species((obj).corpsenm, (C.char(1)))))))) C.attach_egg_hatch_timeout(obj, 0n);
}

/* try to revive all corpses and eggs carried by `mon' */
export function unturn_dead(mon) {
    mon = C.argument(mon, "struct monst *");
    let otmp;
    let otmp2;
    let mtmp2;
    const owner = C.localArray("char[256]", 0);
    const corpse = C.localArray("char[256]", 0);
    let save_norevive;
    let youseeit;
    let different_type;
    let is_u = C.char((C.ptrCompare(mon, C.fieldRef(C.gy, "youmonst"), "==")));
    let corpsenm;
    let res = 0;
    (youseeit = C.char(((is_u) ? (C.char(1)) : C.canseemon(mon))));
    (otmp2 = ((is_u) ? (C.gi).invent : (mon).minvent));
    C.store(C.ptrAdd(owner, 0, "char"), "char", C.store(C.ptrAdd(corpse, 0, "char"), "char", C.char(0)));
/* lint suppression */
    while (C.ptrCompare(((otmp = otmp2)), 0, "!=")) {
        (otmp2 = (otmp).nobj);
        if (Number((otmp).otyp == C.EGG)) revive_egg(otmp);
        if (Number((otmp).otyp != C.CORPSE)) continue;
/* save the name; the object is liable to go away */
        if (youseeit) {
            C.strcpy(corpse, C.corpse_xname(otmp, 0, C.CXN_NORMAL));
/* shk_your/Shk_Your produces a value with a trailing space */
            if (Number((otmp).quan > 1n)) {
                C.strcpy(owner, C.literal("One of "));
                C.shk_your(C.eos(owner), otmp);
            }
            else C.Shk_Your(owner, otmp);
        }
/* for a stack, only one is revived; if is_u, revive() calls
           useup() which calls update_inventory() but not encumber_msg() */
        (corpsenm = (otmp).corpsenm);
/* norevive applies to revive timer, not to explicit unturn_dead() */
        (save_norevive = (otmp).norevive);
        ((otmp).norevive = C.uint(0));
        if (C.ptrCompare(((mtmp2 = C.callLocal(revive, otmp, C.char(Number(!(((C.svc).context).mon_moving)))))), 0, "!=")) {
            (res = C.int((res + 1)));
/* might get revived as a zombie rather than corpse's monster */
            (different_type = C.char((C.ptrCompare((mtmp2).data, C.ptrAdd(C.mons, corpsenm, "struct permonst"), "!="))));
            if (Number((C.iflags).last_msg == C.PLNMSG_OBJ_GLOWS)) {
/* when hero zaps undead turning at self (or breaks
                   non-empty wand), revive() reports "[one of] your <mon>
                   corpse[s] glows iridescently"; override saved corpse
                   and owner names to say "It comes alive" [note: we did
                   earlier setup because corpse gets used up but need to
                   do the override here after revive() sets 'last_msg'] */
                C.strcpy(corpse, C.literal("It"));
                C.store(C.ptrAdd(owner, 0, "char"), "char", C.char(0));
            }
            if (youseeit) C.pline(C.literal("%s%s suddenly %s%s%s!"), owner, corpse, (((Number(!!(Number(!!((Number((C.ulong(((((mtmp2).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || C.ptrCompare(((mtmp2).data), C.ptrAdd(C.mons, C.PM_MANES, "struct permonst"), "=="))) || (Number(!!((Number((((mtmp2).data)).mlet == C.S_GOLEM)) || Number((((mtmp2).data)).mlet == C.S_VORTEX)))))))) ? C.literal("reanimates") : C.literal("comes alive")), ((different_type) ? C.literal(" as ") : C.literal("")), ((different_type) ? C.an(C.mon_pmname(mtmp2)) : C.literal("")), "ppppp");
            else if (C.canseemon(mtmp2)) C.pline(C.literal("%s suddenly appears!"), C.Amonnam(mtmp2), "p");
        }
        else {
/* revival failed; corpse 'otmp' is intact */
            ((otmp).norevive = C.uint(((save_norevive) ? 1 : 0)));
        }
    }
    if (Number(!!(is_u && res))) C.encumber_msg();
    return res;
}

export function unturn_you() {
    C.callLocal(unturn_dead, C.fieldRef(C.gy, "youmonst"));
/* hit carried corpses and eggs */
    if ((Number((C.ulong((((((C.gy).youmonst).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n)))) {
        C.You_feel(C.literal("frightened and %sstunned."), (((C.deref(C.ptrAdd((C.u).uprops, C.STUNNED, "struct prop"), "struct prop")).intrinsic) ? C.literal("even more ") : C.literal("")), "p");
        C.make_stunned(C.long(((C.long(((C.deref(C.ptrAdd((C.u).uprops, C.STUNNED, "struct prop"), "struct prop")).intrinsic & C.TIMEOUT))) + C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1231, C.literal("unturn_you")), C.rnd(30))) : C.rnd(30)))))), (C.char(0)));
    }
    else {
        C.You(C.literal("shudder in dread."), "");
    }
}

/* cancel obj, possibly carried by you or a monster */
export function cancel_item(obj) {
    obj = C.argument(obj, "struct obj *");
    let otyp = (obj).otyp;
    if ((Number(((obj)).where == 3))) {
/* handle items being worn by hero */
        switch (otyp) {
            case (C.RIN_GAIN_STRENGTH):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) {
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_STR, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_STR, "schar"), "schar")) - (obj).spe)));
                    ((C.disp).botl = (C.char(1)));
                }
            break;
            case (C.RIN_GAIN_CONSTITUTION):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) {
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_CON, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_CON, "schar"), "schar")) - (obj).spe)));
                    ((C.disp).botl = (C.char(1)));
                }
            break;
            case (C.RIN_ADORNMENT):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) {
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_CHA, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_CHA, "schar"), "schar")) - (obj).spe)));
                    ((C.disp).botl = (C.char(1)));
                }
            break;
            case (C.RIN_INCREASE_ACCURACY):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) ((C.u).uhitinc = C.char(((C.u).uhitinc - (obj).spe)));
            break;
            case (C.RIN_INCREASE_DAMAGE):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) ((C.u).udaminc = C.char(((C.u).udaminc - (obj).spe)));
            break;
            case (C.RIN_PROTECTION):
                if (Number((C.long(((obj).owornmask & C.W_RING))) != 0n)) ((C.disp).botl = (C.char(1)));
            break;
            case (C.GAUNTLETS_OF_DEXTERITY):
                if (Number((C.long(((obj).owornmask & C.W_ARMG))) != 0n)) {
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_DEX, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_DEX, "schar"), "schar")) - (obj).spe)));
                    ((C.disp).botl = (C.char(1)));
                }
            break;
            case (C.HELM_OF_BRILLIANCE):
                if (Number((C.long(((obj).owornmask & C.W_ARMH))) != 0n)) {
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_INT, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_INT, "schar"), "schar")) - (obj).spe)));
                    C.store(C.ptrAdd(((C.u).abon).a, C.A_WIS, "schar"), "schar", C.char(((C.deref(C.ptrAdd(((C.u).abon).a, C.A_WIS, "schar"), "schar")) - (obj).spe)));
                    ((C.disp).botl = (C.char(1)));
                }
            break;
            default:
                if (Number((C.long(((obj).owornmask & C.W_ARMOR))) != 0n)) /* AC */
                ((C.disp).botl = (C.char(1)));
            break;
        }
    }
/* cancelled item might not be in hero's possession but
       cancellation is presumed to be instigated by hero */
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_magic) || (Number(!!((obj).spe && (Number(!!(Number(!!(Number((obj).oclass == C.ARMOR_CLASS) || Number((obj).oclass == C.WEAPON_CLASS))) || (Number(!!(Number(((obj)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE)))))))))))) || Number(otyp == C.POT_ACID))) || Number(otyp == C.POT_SICKNESS))) || (Number(!!(Number(otyp == C.POT_WATER) && (Number(!!(C.int((obj).blessed) || C.int((obj).cursed))))))))) || Number(otyp == C.SPE_NOVEL)))) /* not magic; cancels to blank spellbook */
{
        let cancelled_spe = (((Number(!!(Number((obj).oclass == C.WAND_CLASS) || Number(otyp == C.CRYSTAL_BALL))))) ? C.int((-1)) : 0);
        if (Number(!!(Number(!!(Number(!!(Number((obj).spe != cancelled_spe) && Number(otyp != C.WAN_CANCELLATION))) && Number(otyp != C.MAGIC_LAMP))) && Number(otyp != C.CANDELABRUM_OF_INVOCATION)))) /* can't cancel cancellation */
/* cancelling doesn't remove djinni */
{
            C.costly_alteration(obj, C.COST_CANCEL);
            ((obj).spe = C.char(cancelled_spe));
        }
        switch ((obj).oclass) {
            case (C.SCROLL_CLASS):
                C.costly_alteration(obj, C.COST_CANCEL);
            ((obj).otyp = C.short(C.SCR_BLANK_PAPER));
            ((obj).spe = C.char(0));
            break;
            case (C.SPBOOK_CLASS):
                if (Number(!!(Number(otyp != C.SPE_CANCELLATION) && Number(otyp != C.SPE_BOOK_OF_THE_DEAD)))) {
                    C.costly_alteration(obj, C.COST_CANCEL);
                    ((obj).otyp = C.short(C.SPE_BLANK_PAPER));
/* cancelling a novel is more involved than a spellbook */
                    if (Number(otyp == C.SPE_NOVEL)) /* old type */
                    blank_novel(obj);
                }
            break;
            case (C.POTION_CLASS):
                C.costly_alteration(obj, (((Number(otyp != C.POT_WATER))) ? C.COST_CANCEL : ((C.int((obj).cursed)) ? C.COST_UNCURS : C.COST_UNBLSS)));
            if (Number(!!(Number(otyp == C.POT_SICKNESS) || Number(otyp == C.POT_SEE_INVISIBLE)))) {
/* sickness is "biologically contaminated" fruit juice;
                   cancel it and it just becomes fruit juice...
                   whereas see invisible tastes like "enchanted" fruit
                   juice, it similarly cancels */
                ((obj).otyp = C.short(C.POT_FRUIT_JUICE));
            }
            else {
                ((obj).otyp = C.short(C.POT_WATER));
                ((obj).odiluted = C.uint(0));
/* same as any other water */
            }
            break;
        }
    }
/* cancelling a troll's corpse prevents it from reviving (on its own;
       does not affect undead turning induced revival) */
    if (Number(!!(Number(!!(Number((obj).otyp == C.CORPSE) && (obj).timed)) && Number(!((Number(!!(Number(!!(C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") || C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_FAMINE, "struct permonst"), "=="))) || C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "=="))))))))) {
        const a = C.recordLocal("anything", C.deref(C.obj_to_any(obj), "anything"));
        let timout = C.peek_timer(C.short(C.REVIVE_MON), a);
        if (timout) {
            C.stop_timer(C.short(C.REVIVE_MON), a);
            C.start_timer(timout, C.short(C.TIMER_OBJECT), C.short(C.ROT_CORPSE), a);
        }
    }
    C.unbless(obj);
    C.uncurse(obj);
    return;
}

/* soaking or cancelling a novel converts it into a blank spellbook but
   needs more than just changing its otyp (caller is responsible for that) */
export function blank_novel(obj) {
    obj = C.argument(obj, "struct obj *");
    ((Number(!!((Number((obj).otyp == C.SPE_BLANK_PAPER)) || ((C.__assert_fail(C.literal("obj->otyp == SPE_BLANK_PAPER"), C.literal("zap.c"), 1369, C.literal("blank_novel")), 0))))));
/* novelidx overloads corpsenm, not used for spellbooks */
    ((obj).novelidx = 0);
    C.free_oname(obj);
/* get rid of [former] novel's title */
/* a blank spellbook weighs more than a novel; update obj's weight and
       recursively the weight of any container holding it */
    C.container_weight(obj);
}

/* Remove a positive enchantment or charge from obj,
 * possibly carried by you or a monster
 */
export function drain_item(obj, by_you) {
    obj = C.argument(obj, "struct obj *");
    by_you = C.argument(by_you, "boolean");
    let u_ring;
/* Is this a charged/enchanted object? */
    if (Number(!!(Number(!!(Number(!(obj)) || (Number(!!(Number(!!(Number(!!(Number(!((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_charged)) && Number((obj).oclass != C.WEAPON_CLASS))) && Number((obj).oclass != C.ARMOR_CLASS))) && Number(!((Number(!!(Number(((obj)).oclass == C.TOOL_CLASS) && Number((C.deref(C.ptrAdd(C.objects, ((obj)).otyp, "struct objclass"), "struct objclass")).oc_subtyp != C.P_NONE))))))))))) || Number((obj).spe <= 0)))) return (C.char(0));
    if (Number(!!(Number(!!(C.defends(C.AD_DRLI, obj) || C.defends_when_carried(C.AD_DRLI, obj))) || C.callLocal(obj_resists, obj, 10, 90)))) return (C.char(0));
/* Charge for the cost of the object */
    if (by_you) C.costly_alteration(obj, C.COST_DRAIN);
/* Drain the object and any implied effects */
    C.bump(C.fieldRef(obj, "spe"), -1, true, "signed char");
    (u_ring = C.char(Number(!!((C.ptrCompare(obj, C.uleft, "==")) || (C.ptrCompare(obj, C.uright, "=="))))));
    switch ((obj).otyp) {
        case (C.RIN_GAIN_STRENGTH):
            if (Number(!!((C.long(((obj).owornmask & C.W_RING))) && u_ring))) {
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_STR, "schar"), "schar"), -1, true, "signed char");
                ((C.disp).botl = (C.char(1)));
            }
        break;
        case (C.RIN_GAIN_CONSTITUTION):
            if (Number(!!((C.long(((obj).owornmask & C.W_RING))) && u_ring))) {
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_CON, "schar"), "schar"), -1, true, "signed char");
                ((C.disp).botl = (C.char(1)));
            }
        break;
        case (C.RIN_ADORNMENT):
            if (Number(!!((C.long(((obj).owornmask & C.W_RING))) && u_ring))) {
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_CHA, "schar"), "schar"), -1, true, "signed char");
                ((C.disp).botl = (C.char(1)));
            }
        break;
        case (C.RIN_INCREASE_ACCURACY):
            if (Number(!!((C.long(((obj).owornmask & C.W_RING))) && u_ring))) C.bump(C.fieldRef(C.u, "uhitinc"), -1, true, "signed char");
        break;
        case (C.RIN_INCREASE_DAMAGE):
            if (Number(!!((C.long(((obj).owornmask & C.W_RING))) && u_ring))) C.bump(C.fieldRef(C.u, "udaminc"), -1, true, "signed char");
        break;
        case (C.RIN_PROTECTION):
            if (u_ring) ((C.disp).botl = (C.char(1)));
/* bot() will recalc u.uac */
        break;
        case (C.HELM_OF_BRILLIANCE):
            if (Number(!!((C.long(((obj).owornmask & C.W_ARMH))) && (C.ptrCompare(obj, C.uarmh, "=="))))) {
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_INT, "schar"), "schar"), -1, true, "signed char");
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_WIS, "schar"), "schar"), -1, true, "signed char");
                ((C.disp).botl = (C.char(1)));
            }
        break;
        case (C.GAUNTLETS_OF_DEXTERITY):
            if (Number(!!((C.long(((obj).owornmask & C.W_ARMG))) && (C.ptrCompare(obj, C.uarmg, "=="))))) {
                C.bump(C.reference(C.ptrAdd(((C.u).abon).a, C.A_DEX, "schar"), "schar"), -1, true, "signed char");
                ((C.disp).botl = (C.char(1)));
            }
        break;
        default:
            break;
    }
    if ((C.disp).botl) C.bot();
    if ((Number(((obj)).where == 3))) C.update_inventory();
    return (C.char(1));
}

export function obj_resists(obj, ochance, achance) /* percent chance for ordinary objects */
/* percent chance for artifacts */
{
    obj = C.argument(obj, "struct obj *");
    ochance = C.argument(ochance, "int");
    achance = C.argument(achance, "int");
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number((obj).otyp == C.AMULET_OF_YENDOR) || Number((obj).otyp == C.SPE_BOOK_OF_THE_DEAD))) || Number((obj).otyp == C.CANDELABRUM_OF_INVOCATION))) || Number((obj).otyp == C.BELL_OF_OPENING))) || (Number(!!(Number((obj).otyp == C.CORPSE) && (Number(!!(Number(!!(C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") || C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_FAMINE, "struct permonst"), "=="))) || C.ptrCompare((C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "==")))))))))) {
        return (C.char(1));
    }
    else {
        let chance = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1469, C.literal("obj_resists")), C.rn2(100))) : C.rn2(100)));
        return C.char((Number(chance < ((((obj).oartifact) ? achance : ochance)))));
    }
}

export function obj_shudders(obj) {
    obj = C.argument(obj, "struct obj *");
    let zap_odds;
    if (Number(!!(((C.svc).context).bypasses && C.int((obj).bypass)))) return (C.char(0));
    if (Number((obj).oclass == C.WAND_CLASS)) (zap_odds = 3);
    else /* half-life = 2 zaps */
    if ((obj).cursed) (zap_odds = 3);
    else /* half-life = 2 zaps */
    if ((obj).blessed) (zap_odds = 12);
    else /* half-life = 8 zaps */
    (zap_odds = 8);
/* half-life = 6 zaps */
/* adjust for "large" quantities of identical things */
    if (Number((obj).quan > 4n)) (zap_odds = C.int(Math.trunc(zap_odds / 2)));
    return C.char(Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1496, C.literal("obj_shudders")), C.rn2(zap_odds))) : C.rn2(zap_odds))))));
}

/* Use up at least minwt number of things made of material mat.
 * There's also a chance that other stuff will be used up.  Finally,
 * there's a random factor here to keep from always using the stuff
 * at the top of the pile.
 */
export function polyuse(objhdr, mat, minwt) {
    objhdr = C.argument(objhdr, "struct obj *");
    mat = C.argument(mat, "int");
    minwt = C.argument(minwt, "int");
    let otmp;
    let otmp2;
    for ((otmp = objhdr); Number(!!(Number(minwt > 0) && otmp)); (otmp = otmp2)) {
        (otmp2 = ((otmp).nexthere).nexthere);
        if (Number(!!(((C.svc).context).bypasses && C.int((otmp).bypass)))) continue;
        if (Number(!!(C.ptrCompare(otmp, C.uball, "==") || C.ptrCompare(otmp, C.uchain, "==")))) continue;
        if (C.callLocal(obj_resists, otmp, 0, 0)) continue;
/* preserve unique objects */
        if (Number((otmp).otyp == C.SCR_MAIL)) continue;
        if (Number((Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == mat)) == (Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1523, C.literal("polyuse")), C.rn2(C.int((minwt + 1))))) : C.rn2(C.int((minwt + 1))))) != 0)))) {
/* appropriately add damage to bill */
            if (C.costly_spot((otmp).ox, (otmp).oy)) {
                if (C.deref((C.u).ushops, "char")) C.addtobill(otmp, (C.char(0)), (C.char(0)), (C.char(0)));
                else C.stolen_value(otmp, (otmp).ox, (otmp).oy, (C.char(0)), (C.char(0)));
            }
            if (Number((otmp).quan < C.LARGEST_INT)) (minwt = C.int((minwt - C.int((otmp).quan))));
            else (minwt = 0);
            C.delobj(otmp);
        }
    }
}

/*
 * Polymorph some of the stuff in this pile into a monster, preferably
 * a golem of the kind okind.
 */
export function create_polymon(obj, okind) {
    obj = C.argument(obj, "struct obj *");
    okind = C.argument(okind, "int");
    let mdat = 0;
    let mtmp;
    let material;
    let pm_index;
    if (((C.svc).context).bypasses) {
/* this is approximate because the "no golems" !obj->nexthere
           check below doesn't understand bypassed objects; but it
           should suffice since bypassed objects always end up as a
           consecutive group at the top of their pile */
        while (Number(!!(obj && C.int((obj).bypass)))) (obj = ((obj).nexthere).nexthere);
    }
/* no golems if you zap only one object -- not enough stuff */
    if (Number(!!(Number(!(obj)) || (Number(!!(Number(!(((obj).nexthere).nexthere)) && Number((obj).quan == 1n))))))) return;
/* some of these choices are arbitrary */
    switch (okind) {
        case (C.IRON):
            case (C.METAL):
                case (C.MITHRIL):
                    (pm_index = C.PM_IRON_GOLEM);
        (material = C.literal("metal "));
        break;
        case (C.COPPER):
            case (C.SILVER):
                case (C.PLATINUM):
                    case (C.GEMSTONE):
                        case (C.MINERAL):
                            (pm_index = (((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1579, C.literal("create_polymon")), C.rn2(2))) : C.rn2(2)))) ? C.PM_STONE_GOLEM : C.PM_CLAY_GOLEM));
        (material = C.literal("lithic "));
        break;
        case (0):
            case (C.FLESH):
/* there is no flesh type, but all food is type 0, so we use it */
                (pm_index = C.PM_FLESH_GOLEM);
        (material = C.literal("organic "));
        break;
        case (C.WOOD):
            (pm_index = C.PM_WOOD_GOLEM);
        (material = C.literal("wood "));
        break;
        case (C.LEATHER):
            (pm_index = C.PM_LEATHER_GOLEM);
        (material = C.literal("leather "));
        break;
        case (C.CLOTH):
            (pm_index = C.PM_ROPE_GOLEM);
        (material = C.literal("cloth "));
        break;
        case (C.BONE):
            (pm_index = C.PM_SKELETON);
/* nearest thing to "bone golem" */
        (material = C.literal("bony "));
        break;
        case (C.GOLD):
            (pm_index = C.PM_GOLD_GOLEM);
        (material = C.literal("gold "));
        break;
        case (C.GLASS):
            (pm_index = C.PM_GLASS_GOLEM);
        (material = C.literal("glassy "));
        break;
        case (C.PAPER):
            (pm_index = C.PM_PAPER_GOLEM);
        (material = C.literal("paper "));
        break;
        default:
/* if all else fails... */
            (pm_index = C.PM_STRAW_GOLEM);
        (material = C.literal(""));
        break;
    }
    if (Number(!((C.int(((C.deref(C.ptrAdd((C.svm).mvitals, pm_index, "struct mvitals"), "struct mvitals")).mvflags & C.G_GENOD)))))) (mdat = C.ptrAdd(C.mons, pm_index, "struct permonst"));
    (mtmp = C.makemon(mdat, (obj).ox, (obj).oy, C.MM_NOMSG));
    polyuse(obj, okind, C.int((C.deref(C.ptrAdd(C.mons, pm_index, "struct permonst"), "struct permonst")).cwt));
    if (Number(!!(mtmp && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (mtmp).my, "seenV *"), "seenV *"), (mtmp).mx, "seenV"), "seenV") & 2))) != 0))))) {
        C.pline(C.literal("Some %sobjects meld, and %s arises from the pile!"), material, C.a_monnam(mtmp), "pp");
    }
}

/* Assumes obj is on the floor. */
export function do_osshock(obj) {
    obj = C.argument(obj, "struct obj *");
    let i;
    if (Number((obj).otyp == C.SCR_MAIL)) return;
    ((C.go).obj_zapped = (C.char(1)));
    if (Number((C.gp).poly_zapped < 0)) {
/* some may metamorphose */
        for ((i = (obj).quan); i; ((i = C.long((i - 1n))), C.long((i + 1n)))) if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1650, C.literal("do_osshock")), C.rn2(C.int(((C.int(((C.u).uluck + (C.u).moreluck))) + 45))))) : C.rn2(C.int(((C.int(((C.u).uluck + (C.u).moreluck))) + 45)))))))) {
            ((C.gp).poly_zapped = C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material));
            break;
        }
    }
/* if quan > 1 then some will survive intact */
    if (Number((obj).quan > 1n)) {
        if (Number((obj).quan > C.LARGEST_INT)) (obj = C.splitobj(obj, C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1659, C.literal("do_osshock")), C.rnd(30000))) : C.rnd(30000))))));
        else (obj = C.splitobj(obj, C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1661, C.literal("do_osshock")), C.rnd(C.int((C.int((obj).quan) - 1))))) : C.rnd(C.int((C.int((obj).quan) - 1))))))));
    }
/* appropriately add damage to bill */
    if (C.costly_spot((obj).ox, (obj).oy)) {
        if (C.deref((C.u).ushops, "char")) C.addtobill(obj, (C.char(0)), (C.char(0)), (C.char(0)));
        else C.stolen_value(obj, (obj).ox, (obj).oy, (C.char(0)), (C.char(0)));
    }
/* zap the object */
    C.delobj(obj);
}

/* Returns TRUE if obj resists polymorphing */
export function obj_unpolyable(obj) {
    obj = C.argument(obj, "struct obj *");
    return C.char((Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(!!(Number(((obj)).otyp == C.WAN_POLYMORPH) || Number(((obj)).otyp == C.SPE_POLYMORPH))) || Number(((obj)).otyp == C.POT_POLYMORPH))) || Number(((obj)).otyp == C.AMULET_OF_UNCHANGING)))) || C.ptrCompare(obj, C.uball, "=="))) || C.ptrCompare(obj, C.uskin, "=="))) || C.callLocal(obj_resists, obj, 5, 95)))));
}

/* classes of items whose current charge count carries over across polymorph
 */
export const charged_objs = [ "WAND_CLASS", "WEAPON_CLASS", "ARMOR_CLASS",
                                     0 ];

/*
 * Polymorph the object to the given object ID.  If the ID is STRANGE_OBJECT
 * then pick random object from the source's class (this is the standard
 * "polymorph" case).  If ID is set to a specific object, inhibit fusing
 * n objects into 1.  This could have been added as a flag, but currently
 * it is tied to not being the standard polymorph case. The new polymorphed
 * object replaces obj in its link chains.  Return value is a pointer to
 * the new object.
 *
 * This should be safe to call for an object anywhere.
 */
export function poly_obj(obj, id) {
    obj = C.argument(obj, "struct obj *");
    id = C.argument(id, "int");
    let otmp;
    const ox = C.scalarLocal("coordxy", C.short(0));
    const oy = C.scalarLocal("coordxy", C.short(0));
    let old_wornmask;
    let new_wornmask = 0n;
    let can_merge = C.char((Number(id == C.STRANGE_OBJECT)));
    let obj_location = (obj).where;
    if (Number((obj).otyp == C.BOULDER)) C.sokoban_guilt();
    if (Number(id == C.STRANGE_OBJECT)) {
/* preserve symbol */
        let try_limit = 3;
        let magic_obj = (C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_magic;
        if (Number(!!(Number((obj).otyp == C.UNICORN_HORN) && C.int((obj).degraded_horn)))) (magic_obj = C.uint(0));
/* Try up to 3 times to make the magic-or-not status of
           the new item the same as the old item. */
        (otmp = 0);
        do {
            if (otmp) C.delobj(otmp);
            (otmp = C.mkobj((obj).oclass, (C.char(0))));
        }
        while (Number(!!(Number((try_limit = C.int((try_limit - 1))) > 0) && Number(C.uint((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_magic) != magic_obj))));
    }
    else {
/* literally replace obj with this new thing */
        (otmp = C.mksobj(id, (C.char(0)), (C.char(0))));
/* Actually more things use corpsenm but they polymorph differently */
        if (Number(!!((Number(!!(Number(!!(Number(((obj).otyp) == C.CORPSE) || Number(((obj).otyp) == C.STATUE))) || Number(((obj).otyp) == C.FIGURINE)))) && (Number(!!(Number(!!(Number((id) == C.CORPSE) || Number((id) == C.STATUE))) || Number((id) == C.FIGURINE))))))) C.set_corpsenm(otmp, (obj).corpsenm);
    }
/* preserve quantity */
    ((otmp).quan = (obj).quan);
/* preserve the shopkeeper's (lack of) interest */
    ((otmp).no_charge = (obj).no_charge);
/* preserve inventory letter if in inventory */
    if (Number(obj_location == 3)) ((otmp).invlet = (obj).invlet);
/* You can't send yourself 100 mail messages and then
     * polymorph them into useful scrolls
     */
    if (Number((obj).otyp == C.SCR_MAIL)) {
        ((otmp).otyp = C.short(C.SCR_MAIL));
        ((otmp).spe = C.char(1));
    }
/* avoid abusing eggs laid by you */
    if (Number(!!(Number((obj).otyp == C.EGG) && (obj).spe))) {
        let mnum;
        let tryct = 100;
/* first, turn into a generic egg */
        if (Number((otmp).otyp == C.EGG)) C.kill_egg(otmp);
        else {
            ((otmp).otyp = C.short(C.EGG));
            ((otmp).owt = C.uint(C.weight(otmp)));
        }
        ((otmp).corpsenm = C.NON_PM);
        ((otmp).spe = C.char(0));
/* now change it into something laid by the hero */
        while (((tryct = C.int((tryct - 1))), C.int((tryct + 1)))) {
            (mnum = C.can_be_hatched((C.callIndirect((C.deref(C.callback("rn2", C.rn2), "int (int)")), "int (*)(int)", C.NUMMONS))));
            if (Number(!!(Number(mnum != C.NON_PM) && Number(!(C.dead_species(mnum, (C.char(1)))))))) {
                ((otmp).spe = C.char(1));
/* laid by hero */
                C.set_corpsenm(otmp, mnum);
/* also sets hatch timer */
                break;
            }
        }
    }
/* keep special fields (including charges on wands) */
    if (C.strchr(C.charged_objs, (otmp).oclass)) ((otmp).spe = (obj).spe);
    ((otmp).recharged = (obj).recharged);
    ((otmp).cursed = (obj).cursed);
    ((otmp).blessed = (obj).blessed);
    if (C.erosion_matters(otmp)) {
        if (Number(!!(Number(!!(C.is_flammable(otmp) || (Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((otmp)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((otmp)).oclass == C.ARMOR_CLASS))))))) ((otmp).oeroded = (obj).oeroded);
        if (Number(!!((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))) || C.is_rottable(otmp)))) ((otmp).oeroded2 = (obj).oeroded2);
        if ((Number(!!(Number(!!(Number(!!(Number(!!((Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)) || C.is_flammable(otmp))) || C.is_rottable(otmp))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.COPPER) || Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) == C.IRON)))))) || (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, ((otmp)).otyp, "struct objclass"), "struct objclass")).oc_material) == C.GLASS) && Number(((otmp)).oclass == C.ARMOR_CLASS)))))))) ((otmp).oerodeproof = (obj).oerodeproof);
    }
/* Keep chest/box traps and poisoned ammo if we may */
    if (Number(!!(C.int((obj).otrapped) && (Number(!!(Number(((otmp)).otyp == C.LARGE_BOX) || Number(((otmp)).otyp == C.CHEST))))))) ((otmp).otrapped = C.uint(1));
    if (Number(!!(C.int((obj).opoisoned) && (Number(!!((Number(!!(Number(!!(Number((otmp).oclass == C.WEAPON_CLASS) && Number((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp >= C.int((-C.P_SHURIKEN))))) && Number((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_subtyp <= C.int((-C.P_BOW)))))) || C.permapoisoned(otmp))))))) ((otmp).opoisoned = C.uint(1));
    if (Number(!!(Number(id == C.STRANGE_OBJECT) && Number((obj).otyp == C.CORPSE)))) {
/* turn crocodile corpses into shoes */
        if (Number((obj).corpsenm == C.PM_CROCODILE)) {
            ((otmp).otyp = C.short(C.LOW_BOOTS));
            ((otmp).oclass = C.char(C.ARMOR_CLASS));
            ((otmp).spe = C.char(0));
            ((otmp).oeroded = C.uint(0));
            ((otmp).oerodeproof = C.uint((C.char(1))));
            ((otmp).quan = 1n);
            ((otmp).cursed = C.uint((C.char(0))));
        }
    }
    if (Number(!!(Number((obj).otyp == C.LEASH) && Number((obj).leashmon != 0)))) {
        if (Number((otmp).otyp == C.LEASH)) {
            ((otmp).leashmon = (obj).leashmon);
/* clear m_id before delobj(), to avoid o_unleash() by obfree() */
            ((obj).leashmon = 0);
        }
        else {
/* obfree() would do this if we didn't do it here */
            C.o_unleash(obj);
        }
    }
/* no box contents --KAA */
    if ((C.ptrCompare(((otmp)).cobj, 0, "!="))) C.delete_contents(otmp);
/* 'n' merged objects may be fused into 1 object */
    if (Number(!!(Number((otmp).quan > 1n) && (Number(!!(Number(!((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_merge)) || (Number(!!(can_merge && Number((otmp).quan > C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1833, C.literal("poly_obj")), C.rn2(1000))) : C.rn2(1000)))))))))))))) ((otmp).quan = 1n);
    switch ((otmp).oclass) {
        case (C.TOOL_CLASS):
            if (Number((otmp).otyp == C.MAGIC_LAMP)) {
                ((otmp).otyp = C.short(C.OIL_LAMP));
                ((otmp).age = 1500n);
/* "best" oil lamp possible */
            }
            else if (Number((otmp).otyp == C.MAGIC_MARKER)) {
                ((otmp).recharged = C.uint(1));
/* degraded quality */
            }
/* don't care about the recharge count of other tools */
        break;
        case (C.WAND_CLASS):
            while (Number(!!(Number((otmp).otyp == C.WAN_WISHING) || Number((otmp).otyp == C.WAN_POLYMORPH)))) ((otmp).otyp = C.short(C.rnd_class(C.WAN_LIGHT, C.WAN_LIGHTNING)));
/* altering the object tends to degrade its quality
           (analogous to spellbook `read count' handling) */
        if (Number(C.int((otmp).recharged) < (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1852, C.literal("poly_obj")), C.rn2(7))) : C.rn2(7))))) /* recharge_limit */
        C.bump(C.fieldRef(otmp, "recharged"), 1, true, "unsigned int");
        break;
        case (C.POTION_CLASS):
            while (Number((otmp).otyp == C.POT_POLYMORPH)) ((otmp).otyp = C.short(C.rnd_class(C.POT_GAIN_ABILITY, C.POT_WATER)));
/* potions of oil use obj->age field differently from other potions */
        if (Number(!!(Number((otmp).otyp == C.POT_OIL) || Number((obj).otyp == C.POT_OIL)))) C.fixup_oil(otmp, obj);
        break;
        case (C.SPBOOK_CLASS):
            while (Number((otmp).otyp == C.SPE_POLYMORPH)) ((otmp).otyp = C.short(C.rnd_class(C.deref(C.ptrAdd((C.svb).bases, C.SPBOOK_CLASS, "int"), "int"), C.SPE_BLANK_PAPER)));
/* reduce spellbook abuse; non-blank books degrade;
           5.0: novels don't use spestudied so shouldn't degrade to blank
           (but don't force spestudied to zero for them since a non-zero
           value could get passed along to a future polymorph) */
        if (Number(!!(Number((otmp).otyp != C.SPE_BLANK_PAPER) && Number((otmp).otyp != C.SPE_NOVEL)))) {
            ((otmp).spestudied = C.int(((obj).spestudied + 1)));
            if (Number((otmp).spestudied > C.MAX_SPELL_STUDY)) {
                ((otmp).otyp = C.short(C.SPE_BLANK_PAPER));
/* writing a new book over it will yield an unstudied
                   one; re-polymorphing this one as-is may or may not
                   get something non-blank */
                ((otmp).spestudied = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1878, C.literal("poly_obj")), C.rn2((otmp).usecount))) : C.rn2((otmp).usecount))));
            }
        }
        break;
        case (C.GEM_CLASS):
            if (Number(!!(Number(!!(Number((otmp).quan > C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 1884, C.literal("poly_obj")), C.rnd(4))) : C.rnd(4))))) && Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) == C.MINERAL))) && Number(C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_material) != C.MINERAL)))) {
                ((otmp).otyp = C.short(C.ROCK));
/* transmutation backfired */
                ((otmp).quan = C.long(((otmp).quan / 2n)));
/* some material has been lost */
            }
        break;
    }
/* update the weight */
    ((otmp).owt = C.uint(C.weight(otmp)));
/*
     * ** we are now done adjusting the object (except possibly wearing it) **
     */
    get_obj_location(obj, ox, oy, C.int((C.BURIED_TOO | C.CONTAINED_TOO)));
    (old_wornmask = C.long(((obj).owornmask & C.long((~(C.long((C.W_ART | C.W_ARTI))))))));
/* swap otmp for obj */
    C.replace_object(obj, otmp);
    if (Number(obj_location == 3)) {
/*
         * We may need to do extra adjustments for the hero if we're
         * messing with the hero's inventory.  The following calls are
         * equivalent to calling freeinv() on obj and addinv_nomerge()
         * on otmp, while doing an in-place swap of the actual objects.
         */
        C.freeinv_core(obj);
        C.addinv_core1(otmp);
        C.addinv_core2(otmp);
/*
         * Handle polymorph of worn item.  Stone-to-flesh cast on self can
         * affect multiple objects at once, but their new forms won't
         * produce any side-effects.  A single worn item dipped into potion
         * of polymorph can produce side-effects but those won't yield out
         * of sequence messages because current polymorph is finished.
         */
        if (old_wornmask) {
            let was_twohanded = C.char((Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.TOOL_CLASS)))) && C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_big)))));
            let was_twoweap = (C.u).twoweap;
/* wearslot() expects us to deal with wielded/alt-wep/quivered
               items in case they're not weapons; for other slots it might
               return multiple bits (ring left|right); narrow that down to
               the bit(s) currently in use */
            (new_wornmask = (((Number((C.long((old_wornmask & C.W_WEAPONS))) != 0n))) ? old_wornmask : (C.long((C.wearslot(otmp) & old_wornmask)))));
            C.remove_worn_item(obj, (C.char(1)));
/* if the new form can be worn in the same slot, make it so */
            if (Number((C.long((new_wornmask & C.W_WEP))) != 0n)) {
                if (Number(!!(Number(!!(was_twohanded || Number(!((Number(!!((Number(!!(Number((otmp).oclass == C.WEAPON_CLASS) || Number((otmp).oclass == C.TOOL_CLASS)))) && C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_big)))))))) || Number(!(C.uarms))))) C.setuwep(otmp);
                if (Number(!!(Number(!!(was_twoweap && C.uwep)) && Number(!((Number(!!((Number(!!(Number((C.uwep).oclass == C.WEAPON_CLASS) || Number((C.uwep).oclass == C.TOOL_CLASS)))) && C.int((C.deref(C.ptrAdd(C.objects, (C.uwep).otyp, "struct objclass"), "struct objclass")).oc_big))))))))) C.set_twoweap((C.char(1)));
/* u.twoweap = TRUE */
            }
            else if (Number((C.long((new_wornmask & C.W_SWAPWEP))) != 0n)) {
                if (Number(!!(was_twohanded || Number(!((Number(!!((Number(!!(Number((otmp).oclass == C.WEAPON_CLASS) || Number((otmp).oclass == C.TOOL_CLASS)))) && C.int((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_big))))))))) C.setuswapwep(otmp);
                if (Number(!!(was_twoweap && C.uswapwep))) C.set_twoweap((C.char(1)));
/* u.twoweap = TRUE */
            }
            else if (Number((C.long((new_wornmask & C.W_QUIVER))) != 0n)) {
                C.setuqwep(otmp);
            }
            else if (new_wornmask) {
                C.setworn(otmp, new_wornmask);
/* set_wear() might result in otmp being destroyed if
                   worn amulet has been turned into an amulet of change */
                C.set_wear(otmp);
                (otmp = C.wearmask_to_obj(new_wornmask));
/* might be Null */
            }
        }
/* old_wornmask */
    }
    else if (Number(obj_location == C.OBJ_FLOOR)) {
        if (Number(!!(Number((obj).otyp == C.BOULDER) && Number((otmp).otyp != C.BOULDER)))) {
            if (Number(!(C.does_block(ox.value, oy.value, C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, ox.value, "struct rm[21]"), "struct rm[21]"), oy.value, "struct rm"))))) C.unblock_point(ox.value, oy.value);
        }
        else if (Number(!!(Number((obj).otyp != C.BOULDER) && Number((otmp).otyp == C.BOULDER)))) {
/* leaving boulder in liquid would trigger sanity_check warning */
            if (C.is_pool_or_lava(ox.value, oy.value)) C.callLocal(fracture_rock, otmp);
            if (C.does_block(ox.value, oy.value, C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, ox.value, "struct rm[21]"), "struct rm[21]"), oy.value, "struct rm"))) C.block_point(ox.value, oy.value);
        }
    }
/* note: if otmp is gone, billing for it was handled by useup() */
    if (Number(!!((Number(!!((Number(!!(otmp && Number(!((Number(((otmp)).where == 3))))))) || C.int((obj).unpaid)))) && C.costly_spot(ox.value, oy.value)))) {
        let shkp = C.shop_keeper(C.deref(C.in_rooms(ox.value, oy.value, C.SHOPBASE), "char"));
        if (Number(!!((Number(!!(Number(!((obj).no_charge)) || (Number(!!((C.ptrCompare(((obj)).cobj, 0, "!=")) && (Number(C.contained_cost(obj, shkp, 0n, (C.char(0)), (C.char(0))) != 0n)))))))) && C.inhishop(shkp)))) {
            if ((shkp).mpeaceful) {
                if (Number(!!(Number(!!(C.deref((C.u).ushops, "char") && (Number(C.deref(C.in_rooms((C.u).ux, (C.u).uy, 0), "char") == C.deref(C.in_rooms((shkp).mx, (shkp).my, 0), "char"))))) && Number(!(C.costly_spot((C.u).ux, (C.u).uy)))))) {
                    C.make_angry_shk(shkp, ox.value, oy.value);
                }
                else {
                    C.pline(C.literal("%s gets angry!"), C.Shknam(shkp), "p");
                    C.hot_pursuit(shkp);
                }
            }
            else C.Norep(C.literal("%s is furious!"), C.Shknam(shkp), "p");
        }
    }
    C.delobj(obj);
    return otmp;
}

/* stone-to-flesh spell hits and maybe transforms or animates obj */
export function stone_to_flesh_obj(obj) /* nonnull */
{
    obj = C.argument(obj, "struct obj *");
    let ptr;
    let mon;
    let shkp;
    let item;
    const oox = C.scalarLocal("coordxy");
    const ooy = C.scalarLocal("coordxy");
    let smell = (C.char(0));
    let golem_xform = (C.char(0));
    let res = 1;
/* affected object by default */
    if (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) != C.MINERAL) && Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_material) != C.GEMSTONE)))) return 0;
/* Heart of Ahriman usually resists; ordinary items rarely do */
    if (C.callLocal(obj_resists, obj, 2, 98)) return 0;
    get_obj_location(obj, oox, ooy, 0);
/* add more if stone objects are added... */
    switch ((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_class) {
        case (C.ROCK_CLASS):
/* boulders and statues */
            case (C.TOOL_CLASS):
/* figurines */
                if (Number((obj).otyp == C.BOULDER)) {
                    (obj = C.callLocal(poly_obj, obj, C.ENORMOUS_MEATBALL));
                    (smell = (C.char(1)));
                }
                else if (Number(!!(Number((obj).otyp == C.STATUE) || Number((obj).otyp == C.FIGURINE)))) {
                    (ptr = C.ptrAdd(C.mons, (obj).corpsenm, "struct permonst"));
                    if ((Number(((ptr)).mlet == C.S_GOLEM))) {
                        (golem_xform = C.char((C.ptrCompare(ptr, C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"), "!="))));
                    }
                    else if ((Number(!!((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(((ptr)).mlet == C.S_BLOB) || Number(((ptr)).mlet == C.S_JELLY))) || Number(((ptr)).mlet == C.S_FUNGUS))) || Number(((ptr)).mlet == C.S_VORTEX))) || Number(((ptr)).mlet == C.S_LIGHT))) || (Number(!!(Number(((ptr)).mlet == C.S_ELEMENTAL) && C.ptrCompare((ptr), C.ptrAdd(C.mons, C.PM_STALKER, "struct permonst"), "!=")))))) || (Number(!!(Number(!!(Number(((ptr)).mlet == C.S_GOLEM) && C.ptrCompare((ptr), C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"), "!="))) && C.ptrCompare((ptr), C.ptrAdd(C.mons, C.PM_LEATHER_GOLEM, "struct permonst"), "!=")))))) || (Number(((ptr)).mlet == C.S_GHOST))))) || (Number(!!(Number(((ptr)).mlet == C.S_PUDDING) && C.ptrCompare((ptr), C.ptrAdd(C.mons, C.PM_BLACK_PUDDING, "struct permonst"), "!=")))))))) {
/* Don't animate monsters that aren't flesh */
                        (obj = C.callLocal(poly_obj, obj, C.MEATBALL));
                        (smell = (C.char(1)));
                        break;
                    }
                    if (Number((obj).otyp == C.STATUE)) {
/* animate_statue() forces all golems to become flesh golems */
                        (mon = C.animate_statue(obj, oox.value, ooy.value, C.ANIMATE_SPELL, 0));
                    }
                    else {
/* (obj->otyp == FIGURINE) */
                        if (golem_xform) (ptr = C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"));
                        (mon = C.makemon(ptr, oox.value, ooy.value, C.uint(C.long((C.NO_MINVENT | C.MM_NOMSG)))));
                        if (mon) {
                            if (Number(!!(C.costly_spot(oox.value, ooy.value) && ((((Number(((obj)).where == 3))) ? C.int((obj).unpaid) : Number(!((obj).no_charge))))))) {
                                (shkp = C.shop_keeper(C.deref(C.in_rooms(oox.value, ooy.value, C.SHOPBASE), "char")));
                                C.stolen_value(obj, oox.value, ooy.value, C.char((Number(!!(shkp && C.int((shkp).mpeaceful))))), (C.char(0)));
                            }
                            if ((obj).timed) C.obj_stop_timers(obj);
                            if ((Number(((obj)).where == 3))) C.useup(obj);
                            else C.delobj(obj);
                            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (mon).my, "seenV *"), "seenV *"), (mon).mx, "seenV"), "seenV") & 2))) != 0))) C.pline_The(C.literal("figurine %sanimates!"), ((golem_xform) ? C.literal("turns to flesh and ") : C.literal("")), "p");
                        }
                    }
                    if (mon) {
                        (ptr = (mon).data);
/* this golem handling is redundant... */
                        if (Number(!!((Number(((ptr)).mlet == C.S_GOLEM)) && C.ptrCompare(ptr, C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"), "!=")))) C.newcham(mon, C.ptrAdd(C.mons, C.PM_FLESH_GOLEM, "struct permonst"), C.NC_VIA_WAND_OR_SPELL);
                    }
                    else if (Number((C.int(((ptr).geno & (C.int((C.G_NOCORPSE | C.G_UNIQ)))))) != 0)) {
/* didn't revive but can't leave corpse either */
                        (res = 0);
                    }
                    else {
/* unlikely to get here since genociding monsters also
                   sets the G_NOCORPSE flag; drop statue's contents */
                        while (C.ptrCompare(((item = (obj).cobj)), 0, "!=")) {
                            C.bypass_obj(item);
/* make stone-to-flesh miss it */
                            C.obj_extract_self(item);
                            C.place_object(item, oox.value, ooy.value);
                        }
                        (obj = C.callLocal(poly_obj, obj, C.CORPSE));
                    }
                }
                else {
/* miscellaneous tool or unexpected rock... */
                    (res = 0);
                }
        break;
/* maybe add weird things to become? */
        case (C.RING_CLASS):
/* some of the rings are stone */
            (obj = C.callLocal(poly_obj, obj, C.MEAT_RING));
        (smell = (C.char(1)));
        break;
        case (C.WAND_CLASS):
/* marble wand */
            (obj = C.callLocal(poly_obj, obj, C.MEAT_STICK));
        (smell = (C.char(1)));
        break;
        case (C.GEM_CLASS):
/* stones & gems */
            (obj = C.callLocal(poly_obj, obj, C.MEATBALL));
        (smell = (C.char(1)));
        break;
        case (C.WEAPON_CLASS):
/* crysknife */
            ;
/*FALLTHRU*/
        default:
            (res = 0);
        break;
    }
    ((obj));
/* avoid 'assigned value not used' for poly_obj() calls */
    if (smell) {
/* non-meat eaters smell meat, meat eaters smell its flavor;
           monks are considered non-meat eaters regardless of behavior;
           other roles are non-meat eaters if they haven't broken
           vegetarian conduct yet (or if poly'd into non-carnivorous/
           non-omnivorous form, regardless of whether it's herbivorous,
           non-eating, or something stranger) */
        if (Number(!!(Number(!!((Number(((C.gu).urole).mnum == (C.PM_MONK))) || Number(!(((C.u).uconduct).unvegetarian)))) || Number(!((Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(536870912n)))) != C.ulong(0n)))))))) C.Norep(C.literal("You smell the odor of meat."), "");
        else C.Norep(C.literal("You smell a delicious smell."), "");
    }
    C.newsym(oox.value, ooy.value);
    return res;
}

/*
 * Object obj was hit by the effect of the wand/spell otmp.  Return
 * non-zero if the wand/spell had any effect.
 */
export function bhito(obj, otmp) {
    obj = C.argument(obj, "struct obj *");
    otmp = C.argument(otmp, "struct obj *");
    let res = 1;
/* affected object by default */
    let learn_it = (C.char(0));
    let maybelearnit;
/* fundamental: a wand effect hitting itself doesn't do anything;
       otherwise we need to guard against accessing otmp after something
       strange has happened to it (along the lines of polymorph or
       stone-to-flesh [which aren't good examples since polymorph wands
       aren't affected by polymorph zaps and stone-to-flesh isn't
       available in wand form, but the concept still applies...]) */
    if (C.ptrCompare(obj, otmp, "==")) return 0;
    if ((obj).bypass) {
/* The bypass bit is currently only used as follows:
         *
         * POLYMORPH - When a monster being polymorphed drops something
         *             from its inventory as a result of the change.
         *             If the items fall to the floor, they are not
         *             subject to direct subsequent polymorphing
         *             themselves on that same zap.  This makes it
         *             consistent with items that remain in the monster's
         *             inventory.  They are not polymorphed either.
         * UNDEAD_TURNING - When an undead creature gets killed via
         *             undead turning, prevent its corpse from being
         *             immediately revived by the same effect.
         * STONE_TO_FLESH - If a statue can't be revived, its
         *             contents get dropped before turning it into
         *             meat; prevent those contents from being hit.
         * retouch_equipment() - bypass flag is used to track which
         *             items have been handled (bhito isn't involved).
         * menu_drop(), askchain() - inventory traversal where multiple
         *             Drop can alter the invent chain while traversal
         *             is in progress (bhito isn't involved).
         * destroy_items() - inventory traversal where item destruction can
         *             trigger drop or destruction of other item(s) and alter
         *             the invent or mon->minvent chain, possibly recursively.
         *
         * The bypass bit on all objects is reset each turn, whenever
         * svc.context.bypasses is set.
         *
         * We check the obj->bypass bit above AND svc.context.bypasses
         * as a safeguard against any stray occurrence left in an obj
         * struct someplace, although that should never happen.
         */
        if (((C.svc).context).bypasses) {
            return 0;
        }
        else {
            do {
                if (C.debugcore(C.literal("zap.c"), (C.char(1)))) {
                    let save_plnmsg = (C.iflags).last_msg;
                    C.pline(C.literal("%s for a moment."), C.Tobjnam(obj, C.literal("pulsate")), "p");
                    ((C.iflags).last_msg = save_plnmsg);
                }
            }
            while (0);
            ((obj).bypass = C.uint(0));
        }
    }
/*
     * Some parts of this function expect the object to be on the floor
     * obj->{ox,oy} to be valid.  The exception to this (so far) is
     * for the STONE_TO_FLESH spell.
     */
    if (Number(!((Number(!!(Number((obj).where == C.OBJ_FLOOR) || Number((otmp).otyp == C.SPE_STONE_TO_FLESH))))))) C.impossible(C.literal("bhito: obj is not floor or Stone To Flesh spell"), "");
    if (C.ptrCompare(obj, C.uball, "==")) {
        (res = 0);
    }
    else if (C.ptrCompare(obj, C.uchain, "==")) {
        if (Number(!!(Number((otmp).otyp == C.WAN_OPENING) || Number((otmp).otyp == C.SPE_KNOCK)))) {
            (learn_it = (C.char(1)));
            C.unpunish();
        }
        else (res = 0);
    }
    else switch ((otmp).otyp) {
        case (C.WAN_POLYMORPH):
            case (C.SPE_POLYMORPH):
                if (obj_unpolyable(obj)) {
                    (res = 0);
                    break;
                }
/* KMH, conduct */
        if (Number(!(C.bump(C.fieldRef((C.u).uconduct, "polypiles"), 1, true, "long")))) C.livelog_printf(C.LL_CONDUCT, C.literal("polymorphed %s first object"), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).his), "p");
/* any saved lock context will be dangerously obsolete */
        if ((Number(!!(Number(((obj)).otyp == C.LARGE_BOX) || Number(((obj)).otyp == C.CHEST))))) C.boxlock(obj, otmp);
        if (obj_shudders(obj)) {
            let cover = C.char((Number(!!(Number(!!((C.ptrCompare(obj, C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, (C.u).ux, "struct obj *[21]"), "struct obj *[21]"), (C.u).uy, "struct obj *"), "struct obj *"), "==")) && C.int((C.u).uundetected))) && (Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(128n)))) != C.ulong(0n)))))));
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (obj).oy, "seenV *"), "seenV *"), (obj).ox, "seenV"), "seenV") & 2))) != 0))) (learn_it = (C.char(1)));
            do_osshock(obj);
/* eek - your cover might have been blown */
            if (cover) C.hideunder(C.fieldRef(C.gy, "youmonst"));
            break;
        }
        (obj = C.callLocal(poly_obj, obj, C.STRANGE_OBJECT));
        C.newsym((obj).ox, (obj).oy);
        break;
        case (C.WAN_PROBING):
            (res = Number(!((obj).dknown)));
/* target object has now been "seen (up close)" */
        C.observe_object(obj);
        if (Number(!!((Number(!!(Number(((obj)).otyp >= C.LARGE_BOX) && Number(((obj)).otyp <= C.BAG_OF_TRICKS)))) || Number((obj).otyp == C.STATUE)))) {
            ((obj).cknown = ((obj).lknown = C.uint(1)));
            if (Number(!!((Number(!!(Number(((obj)).otyp == C.LARGE_BOX) || Number(((obj)).otyp == C.CHEST)))) && Number(!((obj).tknown))))) {
/* obj->tknown applies to boxes and chests, not bags or
                       statues; plural handling here and the "empty" case
                       below are superfluous because containers don't stack */
                if ((obj).otrapped) C.pline(C.literal("%s trapped!"), C.Tobjnam(obj, C.literal("are")), "p");
                ((obj).tknown = C.uint(1));
            }
            if (Number(!((obj).cobj))) {
                C.pline(C.literal("%s empty."), C.Tobjnam(obj, C.literal("are")), "p");
            }
            else if ((Number(!!(Number(((obj)).otyp == C.LARGE_BOX) && Number(((obj)).spe == 1))))) {
/* we don't want to force alive vs dead
                       determination for Schroedinger's Cat here,
                       so just make probing be inconclusive for it */
                C.You(C.literal("aren't sure whether %s has %s or its corpse inside."), C.the(C.xname(obj)), C.an((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))) ? C.rndmonnam(0) : C.literal("cat"))), "pp");
/* unfortunately, we can't tell whether rndmonnam()
                           picks a form which can't leave a corpse */
                ((obj).cknown = C.uint(0));
            }
            else {
                let o;
/* view contents (not recursively) */
                for ((o = (obj).cobj); o; (o = (o).nobj)) C.observe_object(o);
/* "seen", even if blind */
                C.display_cinventory(obj);
            }
            (res = 1);
        }
        else if (Number((obj).otyp == C.TIN)) {
/* don't learn wand if tin is already known */
            if (Number(!!(Number(!((obj).known)) || Number(!((obj).cknown))))) (res = 1);
            ((obj).known = C.uint(1));
            C.set_cknown_lknown(obj);
/* if TIN obj->cknown = 1 */
        }
        else if (Number((obj).otyp == C.EGG)) {
/* if egg is unhatchable, probing it won't learn wand
                   because even when flagged as known, it's just "an egg" */
            if (Number(!!(Number(!((obj).known)) && Number((obj).corpsenm != C.NON_PM)))) (res = 1);
            ((obj).known = C.uint(1));
/* [should this call learn_egg_type()?] */
        }
        if (res) (learn_it = (C.char(1)));
        break;
        case (C.WAN_STRIKING):
            case (C.SPE_FORCE_BOLT):
/* learn the type if you see or hear something break
               (the sound could be implicit) */
                (maybelearnit = C.char(Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (obj).oy, "seenV *"), "seenV *"), (obj).ox, "seenV"), "seenV") & 2))) != 0)) || Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf)))))))));
        if (Number((obj).otyp == C.BOULDER)) {
            ;
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (obj).oy, "seenV *"), "seenV *"), (obj).ox, "seenV"), "seenV") & 2))) != 0))) C.pline_The(C.literal("boulder falls apart."), "");
            else C.You_hear(C.literal("a crumbling sound."), "");
            C.callLocal(fracture_rock, obj);
        }
        else if (Number((obj).otyp == C.STATUE)) {
            if (break_statue(obj)) {
                if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (obj).oy, "seenV *"), "seenV *"), (obj).ox, "seenV"), "seenV") & 2))) != 0))) {
                    if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))) C.pline_The(C.literal("%s shatters."), C.rndmonnam(0), "p");
                    else C.pline_The(C.literal("statue shatters."), "");
                }
                else C.You_hear(C.literal("a crumbling sound."), "");
            }
        }
        else {
            let oox = (obj).ox;
            let ooy = (obj).oy;
            if (((((C.svc).context).mon_moving) ? Number(!(C.breaks(obj, C.short(oox), C.short(ooy)))) : Number(!(C.hero_breaks(obj, C.short(oox), C.short(ooy), C.uint(0)))))) (maybelearnit = (C.char(0)));
            else /* nothing broke */
/* obj broke; force redisplay in case it was the only--
                       or last--item under non-breaking pile-top; top item
                       here might now be a lone object rather than a pile */
            C.newsym_force(C.short(oox), C.short(ooy));
            (res = 0);
        }
        if (maybelearnit) (learn_it = (C.char(1)));
        break;
        case (C.WAN_CANCELLATION):
            case (C.SPE_CANCELLATION):
                C.callLocal(cancel_item, obj);
        C.newsym((obj).ox, (obj).oy);
/* might change color */
        break;
        case (C.SPE_DRAIN_LIFE):
            drain_item(obj, (C.char(1)));
        break;
        case (C.WAN_TELEPORTATION):
            case (C.SPE_TELEPORT_AWAY):
{
                    let ox = (obj).ox;
                    let oy = (obj).oy;
                    C.rloco(obj);
                    C.maybe_unhide_at(ox, oy);
                }
        break;
        case (C.WAN_MAKE_INVISIBLE):
            break;
        case (C.WAN_UNDEAD_TURNING):
            case (C.SPE_TURN_UNDEAD):
                if (Number((obj).otyp == C.EGG)) {
                    revive_egg(obj);
                }
                else if (Number((obj).otyp == C.CORPSE)) {
                    let mtmp;
                    const ox = C.scalarLocal("coordxy");
                    const oy = C.scalarLocal("coordxy");
                    let save_norevive;
                    let by_u = C.char(Number(!(((C.svc).context).mon_moving)));
                    let corpsenm = C.corpse_revive_type(obj);
                    let corpsname = C.cxname_singular(obj);
/* get corpse's location before revive() uses it up */
                    if (Number(!(get_obj_location(obj, ox, oy, 0)))) ((ox.value = (obj).ox), (oy.value = (obj).oy));
/* won't happen */
/* explicit revival magic overrides timer-based no-revive */
                    (save_norevive = (obj).norevive);
                    ((obj).norevive = C.uint(0));
                    (mtmp = C.callLocal(revive, obj, (C.char(1))));
                    if (Number(!(mtmp))) {
                        ((obj).norevive = save_norevive);
                        (res = 0);
/* no monster implies corpse was left intact */
                    }
                    else {
                        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, oy.value, "seenV *"), "seenV *"), ox.value, "seenV"), "seenV") & 2))) != 0))) {
                            if ((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))) {
                                C.pline(C.literal("%s is resurrected!"), C.upstart(C.noname_monnam(mtmp, C.ARTICLE_THE)), "p");
                                (learn_it = C.char(((by_u) ? (C.char(1)) : (C.gz).zap_oseen)));
                            }
                            else {
/* saw corpse but don't see monster: maybe
                               mtmp is invisible, or has been placed at
                               a different spot than <ox,oy> */
                                if (Number(!((Number((C.ulong((((C.ptrAdd(C.mons, corpsenm, "struct permonst"))).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))))) (corpsname = C.The(corpsname));
                                C.pline(C.literal("%s disappears."), corpsname, "p");
                            }
                        }
                        else {
/* couldn't see corpse's location */
                            if (Number(!!(Number(!!((Number(((C.gu).urole).mnum == (C.PM_HEALER))) && Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf))))))) && Number(!((Number(!!(Number(!!((Number((C.ulong((((C.ptrAdd(C.mons, corpsenm, "struct permonst"))).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || C.ptrCompare((C.ptrAdd(C.mons, corpsenm, "struct permonst")), C.ptrAdd(C.mons, C.PM_MANES, "struct permonst"), "=="))) || (Number(!!((Number(((C.ptrAdd(C.mons, corpsenm, "struct permonst"))).mlet == C.S_GOLEM)) || Number(((C.ptrAdd(C.mons, corpsenm, "struct permonst"))).mlet == C.S_VORTEX)))))))))))) {
                                if (Number(!((Number((C.ulong((((C.ptrAdd(C.mons, corpsenm, "struct permonst"))).mflags2 & C.ulong(524288n)))) != C.ulong(0n)))))) (corpsname = C.an(corpsname));
                                if (Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))))) C.You_hear(C.literal("%s reviving."), corpsname, "p");
                                else C.You_hear(C.literal("a defibrillator."), "");
                                (learn_it = C.char(((by_u) ? (C.char(1)) : (C.gz).zap_oseen)));
                            }
                            if ((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))) /* didn't see corpse but do see monster: it
                               has been placed somewhere other than <ox,oy>
                               or blind hero spots it with ESP */
                            C.pline(C.literal("%s appears."), C.Monnam(mtmp), "p");
                        }
                        if (learn_it) C.exercise(C.A_WIS, (C.char(1)));
                    }
                }
        break;
        case (C.WAN_OPENING):
            case (C.SPE_KNOCK):
                case (C.WAN_LOCKING):
                    case (C.SPE_WIZARD_LOCK):
                        if ((Number(!!(Number(((obj)).otyp == C.LARGE_BOX) || Number(((obj)).otyp == C.CHEST))))) (res = C.boxlock(obj, otmp));
                        else (res = 0);
        if (res) (learn_it = (C.char(1)));
        break;
        case (C.WAN_SLOW_MONSTER):
/* no effect on objects */
            case (C.SPE_SLOW_MONSTER):
                case (C.WAN_SPEED_MONSTER):
                    case (C.WAN_NOTHING):
                        case (C.SPE_HEALING):
                            case (C.SPE_EXTRA_HEALING):
                                (res = 0);
        break;
        case (C.SPE_STONE_TO_FLESH):
            (res = C.callLocal(stone_to_flesh_obj, obj));
        break;
        default:
            C.impossible(C.literal("What an interesting effect (%d)"), (otmp).otyp, "i");
        break;
    }
/* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it) learnwand(otmp);
    return res;
}

/* returns nonzero if something was hit */
export function bhitpile(obj, fhito, tx, ty, zz) /* wand or fake spellbook for type of zap */
/* callback for each object being hit */
/* target location */
/* direction for up/down zaps */
{
    obj = C.argument(obj, "struct obj *");
    fhito = C.argument(fhito, "int (*)(struct obj *, struct obj *)");
    tx = C.argument(tx, "coordxy");
    ty = C.argument(ty, "coordxy");
    zz = C.argument(zz, "schar");
    let otmp;
    let next_obj;
    let hidingunder;
    let first;
    let prevotyp;
    let hitanything = 0;
    if (Number(!(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *")))) return 0;
/* if hiding underneath an object and zapping up or down, the top item
       is either the only thing hit (up) or is skipped (down) */
    (hidingunder = C.char((Number(!!(Number(!!(Number(zz != 0) && C.int((C.u).uundetected))) && (Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(128n)))) != C.ulong(0n))))))));
    (first = (C.char(1)));
    if (Number(!!(Number((obj).otyp == C.SPE_FORCE_BOLT) || Number((obj).otyp == C.WAN_STRIKING)))) {
        let t = C.t_at(tx, ty);
        let topofpile = C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *");
/* We can't settle for the default calling sequence of
           bhito(otmp) -> break_statue(otmp) -> activate_statue_trap(ox,oy)
           because that last call might end up operating on our `next_obj'
           (below), rather than on the current object, if it happens to
           encounter a statue which mustn't become animated. */
        if (Number(!!(Number(!!(t && Number(C.int((t).ttyp) == C.STATUE_TRAP))) && C.activate_statue_trap(t, tx, ty, (C.char(1)))))) learnwand(obj);
/* assume zapping up or down while hiding under the top item can
           still activate the trap even if it's below (when zapping up)
           or above (when zapping down) */
        if (C.ptrCompare(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *"), topofpile, "!=")) (first = (C.char(0)));
/* top item was statue which activated */
    }
    ((C.gp).poly_zapped = C.int((-1)));
    for ((otmp = C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *")); otmp; (otmp = next_obj)) {
        (next_obj = ((otmp).nexthere).nexthere);
        if (hidingunder) {
            if (first) {
                (first = (C.char(0)));
/* reset for next item */
                if (Number(zz > 0)) /* down when hiding-under skips first item */
                continue;
            }
            else {
/* !first */
                if (Number(zz < 0)) /* up when hiding-under skips rest of pile */
                continue;
            }
        }
        if (Number(!!(Number(!!(Number((otmp).where != C.OBJ_FLOOR) || Number((otmp).ox != tx))) || Number((otmp).oy != ty)))) continue;
        (hitanything = C.int((hitanything + C.callIndirect((C.deref(fhito, "int (struct obj *, struct obj *)")), "int (*)(struct obj *, struct obj *)", otmp, obj))));
    }
    if (Number((C.gp).poly_zapped >= 0)) C.callLocal(create_polymon, C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *"), (C.gp).poly_zapped);
/* when boulders are present they're expected to be on top; with
       multiple boulders it's possible for some to have been changed into
       non-boulders (polymorph, stone-to-flesh) while ones beneath resist,
       so re-stack pile if there are any non-boulders above boulders */
    (prevotyp = C.BOULDER);
    for ((otmp = C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, tx, "struct obj *[21]"), "struct obj *[21]"), ty, "struct obj *"), "struct obj *")); otmp; (otmp = ((otmp).nexthere).nexthere)) {
        if (Number(!!(Number((otmp).otyp == C.BOULDER) && Number(prevotyp != C.BOULDER)))) {
            C.recreate_pile_at(tx, ty);
            break;
        }
        (prevotyp = (otmp).otyp);
    }
    if (hidingunder) /* pile might have been destroyed or dispersed */
    C.maybe_unhide_at(tx, ty);
    C.fill_pit(tx, ty);
    return hitanything;
}

/*
 * zappable - returns 1 if zap is available, 0 otherwise.
 *            it removes a charge from the wand if zappable.
 * added by GAN 11/03/86
 */
export function zappable(wand) {
    wand = C.argument(wand, "struct obj *");
    if (Number(!!(Number((wand).spe < 0) || (Number(!!(Number((wand).spe == 0) && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2516, C.literal("zappable")), C.rn2(121))) : C.rn2(121))))))))) return 0;
    if (Number((wand).spe == 0)) C.You(C.literal("wrest one last charge from the worn-out wand."), "");
    C.bump(C.fieldRef(wand, "spe"), -1, true, "signed char");
    return 1;
}

export function do_enlightenment_effect() {
    C.You_feel(C.literal("self-knowledgeable..."), "");
    C.callIndirect((C.deref((C.windowprocs).win_display_nhwindow, "void (winid, boolean)")), "void (*)(winid, boolean)", C.WIN_MESSAGE, (C.char(0)));
    C.enlightenment(2, 0);
    C.pline_The(C.literal("feeling subsides."), "");
    C.exercise(C.A_WIS, (C.char(1)));
}

/*
 * zapnodir - zaps a NODIR wand/spell.
 * Won't get here if wand has no charges (unless wresting 1 last charge).
 */
export function zapnodir(obj) {
    obj = C.argument(obj, "struct obj *");
    let known = (C.char(0));
    switch ((obj).otyp) {
        case (C.WAN_LIGHT):
            case (C.SPE_LIGHT):
/* FIXME? wand of light becoming discovered should be contingent upon
           seeing at least one previously unlit spot become lit */
                (known = C.char((Number(!!(C.int((obj).dknown) && Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))))))));
        C.litroom((C.char(1)), obj);
        C.callLocal(lightdamage, obj, (C.char(1)), 5);
        break;
        case (C.WAN_SECRET_DOOR_DETECTION):
            case (C.SPE_DETECT_UNSEEN):
/* findit() gives sufficient feedback to discover the wand even when
           blinded or when it fails to find anything */
                (known = C.char(Number(!(Number(!((obj).dknown))))));
        C.findit();
        break;
        case (C.WAN_STASIS):
{
                let tmp_until = C.long(((C.svm).moves + C.long((C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2560, C.literal("zapnodir")), C.rn2(21))) : C.rn2(21))) + (10)))))));
/* no immediately obvious effect, and no message so that it isn't
           distinguishable from other NODIR wands that produce no message;
           for multiple zaps, keep the longest duration rather than latest */
                if (Number(tmp_until > (((C.svl).level).flags).stasis_until)) ((((C.svl).level).flags).stasis_until = tmp_until);
                break;
            }
        case (C.WAN_CREATE_MONSTER):
/* create_critters() returns True iff hero sees a new monster appear */
            if (C.create_critters((((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2571, C.literal("zapnodir")), C.rn2(23))) : C.rn2(23)))) ? 1 : (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2571, C.literal("zapnodir")), C.rn2(7))) : C.rn2(7))) + (2))))), 0, (C.char(0)))) (known = C.char(Number(!(Number(!((obj).dknown))))));
        break;
        case (C.WAN_WISHING):
            if (Number(C.int(((C.int(((C.u).uluck + (C.u).moreluck))) + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2576, C.literal("zapnodir")), C.rn2(5))) : C.rn2(5))))) < 0)) {
                C.pline(C.literal("Unfortunately, nothing happens."), "");
                (known = (C.char(0)));
            }
            else {
                (known = C.char(Number(!(Number(!((obj).dknown))))));
/* wand of wishing asks player what to wish for so always becomes
               discovered (unless it hasn't been seen) */
                C.callLocal(makewish);
            }
        break;
        case (C.WAN_ENLIGHTENMENT):
            (known = C.char(Number(!(Number(!((obj).dknown))))));
/* do_enlightenmnt_effect() always describes enlightenment */
        do_enlightenment_effect();
        break;
        default:
            break;
    }
    if (known) {
        if (Number(!((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_name_known))) C.more_experienced(0, 10);
/* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

export function backfire(otmp) {
    otmp = C.argument(otmp, "struct obj *");
    let dmg;
    ((otmp).in_use = C.uint((C.char(1))));
/* in case losehp() is fatal */
    C.pline(C.literal("%s suddenly explodes!"), C.The(C.xname(otmp)), "p");
    (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2611, C.literal("backfire")), C.d((C.int(((otmp).spe + 2))), (6)))) : C.d((C.int(((otmp).spe + 2))), (6)))));
    C.losehp((((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).extrinsic))))) ? (C.int(Math.trunc((C.int(((dmg) + 1))) / 2))) : (dmg))), C.literal("exploding wand"), C.KILLED_BY_AN);
    C.useupall(otmp);
}

/* getobj callback for object to zap */
export function zap_ok(obj) {
    obj = C.argument(obj, "struct obj *");
    if (Number(!!(obj && Number((obj).oclass == C.WAND_CLASS)))) return C.GETOBJ_SUGGEST;
    return C.GETOBJ_EXCLUDE;
}

/* #zap command, 'z' (or 'y' if numbed_pad==-1) */
export function dozap() {
    let obj;
    let damage;
    let need_dir;
    if ((Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(8192n)))) != C.ulong(0n)))) {
        C.You(C.literal("aren't able to zap anything in your current form."), "");
        return C.ECMD_OK;
    }
    if (C.check_capacity(0)) return C.ECMD_OK;
    (obj = C.getobj(C.literal("zap"), C.callback("zap_ok", zap_ok), C.GETOBJ_NOFLAGS));
    if (Number(!(obj))) return C.ECMD_CANCEL;
    C.check_unpaid(obj);
    (need_dir = Number(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_dir) != C.NODIR));
    if (Number(!(zappable(obj)))) {
        C.pline(C.literal("%s"), (C.c_common_strings).c_nothing_happens, "p");
    }
    else if (Number(!!(C.int((obj).cursed) && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2647, C.literal("dozap")), C.rn2(100))) : C.rn2(100)))))))) {
        backfire(obj);
/* the wand blows up in your face! */
        C.exercise(C.A_STR, (C.char(0)));
/* 'obj' is gone; skip update_inventory() because
           backfire() -> useupall() -> freeinv() did it */
        return C.ECMD_TIME;
    }
    else if (Number(!!(need_dir && Number(!(C.getdir(0)))))) {
        if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.pline(C.literal("%s glows and fades."), C.The(C.xname(obj)), "p");
/* make him pay for knowing !NODIR */
    }
    else if (Number(!!(Number(!!(Number(!!(need_dir && Number(!((C.u).dx)))) && Number(!((C.u).dy)))) && Number(!((C.u).dz))))) {
        if (Number(((damage = C.callLocal(zapyourself, obj, (C.char(1))))) != 0)) {
            const buf = C.localArray("char[256]", 0);
            C.sprintf(buf, C.literal("zapped %sself with %s"), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).him), C.killer_xname(obj), "pp");
            C.losehp((((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).extrinsic))))) ? (C.int(Math.trunc((C.int(((damage) + 1))) / 2))) : (damage))), buf, C.NO_KILLER_PREFIX);
        }
    }
    else {
/*      Are we having fun yet?
         * weffects -> buzz(obj->otyp) -> zhitm (temple priest) ->
         * attack -> hitum -> known_hitum -> ghod_hitsu ->
         * buzz(AD_ELEC) -> destroy_items(AD_ELEC) ->
         * useup -> obfree -> dealloc_obj -> free(obj)
         */
        ((C.gc).current_wand = obj);
        weffects(obj);
        (obj = (C.gc).current_wand);
        ((C.gc).current_wand = 0);
    }
    if (Number(!!(obj && Number((obj).spe < 0)))) {
        C.pline(C.literal("%s to dust."), C.Tobjnam(obj, C.literal("turn")), "p");
        C.useupall(obj);
/* calls freeinv() -> update_inventory() */
    }
    else C.update_inventory();
/* maybe used a charge */
    return C.ECMD_TIME;
}

/* Lock or unlock all boxes in inventory */
export function boxlock_invent(obj) {
    obj = C.argument(obj, "struct obj *");
    let otmp;
    let nextobj;
    let boxing = (C.char(0));
/* (un)lock carried boxes */
    for ((otmp = (C.gi).invent); otmp; (otmp = nextobj)) {
        (nextobj = (otmp).nobj);
        if ((Number(!!(Number(((otmp)).otyp == C.LARGE_BOX) || Number(((otmp)).otyp == C.CHEST))))) {
            C.boxlock(otmp, obj);
            (boxing = (C.char(1)));
        }
    }
    if (boxing) C.update_inventory();
/* in case any box->lknown has changed */
}

export function zapyourself(obj, ordinary) {
    obj = C.argument(obj, "struct obj *");
    ordinary = C.argument(ordinary, "boolean");
    const learn_it = C.scalarLocal("boolean", (C.char(0)));
    let damage = 0;
    let orig_dmg = 0;
/* for passing to destroy_items() */
    switch ((obj).otyp) {
        case (C.WAN_STRIKING):
            case (C.SPE_FORCE_BOLT):
                (learn_it.value = (C.char(1)));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.pline(C.literal("Boing!"), "");
            C.monstseesu(C.ulong(C.M_SEEN_MAGR));
        }
        else {
            if (ordinary) {
                C.You(C.literal("bash yourself!"), "");
                (damage = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2722, C.literal("zapyourself")), C.d((2), (12)))) : C.d((2), (12)))));
            }
            else (damage = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2724, C.literal("zapyourself")), C.d((C.int((1 + (obj).spe))), (6)))) : C.d((C.int((1 + (obj).spe))), (6)))));
            C.exercise(C.A_STR, (C.char(0)));
            C.monstunseesu(C.ulong(C.M_SEEN_MAGR));
        }
        break;
        case (C.WAN_LIGHTNING):
            (learn_it.value = (C.char(1)));
        (orig_dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2732, C.literal("zapyourself")), C.d((12), (6)))) : C.d((12), (6)))));
        if (Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).extrinsic)))))) {
            C.You(C.literal("shock yourself!"), "");
            (damage = orig_dmg);
            C.exercise(C.A_CON, (C.char(0)));
            C.monstunseesu(C.ulong(C.M_SEEN_ELEC));
        }
        else {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.You(C.literal("zap yourself, but seem unharmed."), "");
            C.monstseesu(C.ulong(C.M_SEEN_ELEC));
            C.ugolemeffects(C.AD_ELEC, orig_dmg);
        }
        C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_ELEC, orig_dmg);
        C.callLocal(flashburn, C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2745, C.literal("zapyourself")), C.rnd(100))) : C.rnd(100)))), (C.char(1)));
        break;
        case (C.SPE_FIREBALL):
            C.You(C.literal("explode a fireball on top of yourself!"), "");
        C.explode((C.u).ux, (C.u).uy, 11, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2750, C.literal("zapyourself")), C.d((6), (6)))) : C.d((6), (6)))), C.char(C.WAND_CLASS), C.EXPL_FIERY);
        break;
        case (C.WAN_FIRE):
            case (C.FIRE_HORN):
                (learn_it.value = (C.char(1)));
        (orig_dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2755, C.literal("zapyourself")), C.d((12), (6)))) : C.d((12), (6)))));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.You_feel(C.literal("rather warm."), "");
            C.monstseesu(C.ulong(C.M_SEEN_FIRE));
            C.ugolemeffects(C.AD_FIRE, orig_dmg);
        }
        else {
            C.pline(C.literal("You've set yourself afire!"), "");
            (damage = orig_dmg);
            C.monstunseesu(C.ulong(C.M_SEEN_FIRE));
        }
        C.burn_away_slime();
        C.burnarmor(C.fieldRef(C.gy, "youmonst"));
        C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_FIRE, orig_dmg);
        C.ignite_items((C.gi).invent);
        break;
        case (C.WAN_COLD):
            case (C.SPE_CONE_OF_COLD):
                case (C.FROST_HORN):
                    (learn_it.value = (C.char(1)));
        (orig_dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2776, C.literal("zapyourself")), C.d((12), (6)))) : C.d((12), (6)))));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.COLD_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.COLD_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.You_feel(C.literal("a little chill."), "");
            C.monstseesu(C.ulong(C.M_SEEN_COLD));
            C.ugolemeffects(C.AD_COLD, orig_dmg);
        }
        else {
            C.You(C.literal("imitate a popsicle!"), "");
            (damage = orig_dmg);
            C.monstunseesu(C.ulong(C.M_SEEN_COLD));
        }
        C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_COLD, orig_dmg);
        break;
        case (C.WAN_MAGIC_MISSILE):
            case (C.SPE_MAGIC_MISSILE):
                (learn_it.value = (C.char(1)));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.pline_The(C.literal("missiles bounce!"), "");
            C.monstseesu(C.ulong(C.M_SEEN_MAGR));
        }
        else {
            (damage = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2798, C.literal("zapyourself")), C.d((4), (6)))) : C.d((4), (6)))));
            C.pline(C.literal("Idiot!  You've shot yourself!"), "");
            C.monstunseesu(C.ulong(C.M_SEEN_MAGR));
        }
        break;
        case (C.WAN_POLYMORPH):
            case (C.SPE_POLYMORPH):
                if (Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.UNCHANGING, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.UNCHANGING, "struct prop"), "struct prop")).extrinsic)))))) {
                    (learn_it.value = (C.char(1)));
                    C.polyself(C.POLY_NOFLAGS);
                }
        break;
        case (C.WAN_CANCELLATION):
            case (C.SPE_CANCELLATION):
                C.callLocal(cancel_monst, C.fieldRef(C.gy, "youmonst"), obj, (C.char(1)), (C.char(1)), (C.char(1)));
        break;
        case (C.SPE_DRAIN_LIFE):
            if (Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DRAIN_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DRAIN_RES, "struct prop"), "struct prop")).extrinsic)))))) {
                (learn_it.value = (C.char(1)));
/* (no effect for spells...) */
                C.losexp(C.literal("life drainage"));
            }
        (damage = 0);
/* No additional damage */
        break;
        case (C.WAN_MAKE_INVISIBLE):
{
/* have to test before changing HInvis but must change
         * HInvis before doing newsym().
         */
                let msg = Number(!!(Number(!!(Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop")).blocked))))))) && Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop")).blocked))));
                if (Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop")).blocked && Number((C.uarmc).otyp == C.MUMMY_WRAPPING)))) {
/* A mummy wrapping absorbs it and protects you */
                    C.You_feel(C.literal("rather itchy under %s."), C.yname(C.uarmc), "p");
                    break;
                }
                C.incr_itimeout(C.fieldRef(C.deref(C.ptrAdd((C.u).uprops, C.INVIS, "struct prop"), "struct prop"), "intrinsic"), (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2836, C.literal("zapyourself")), C.rn2(15))) : C.rn2(15))) + (31)))));
                if (msg) {
                    (learn_it.value = (C.char(1)));
                    C.newsym((C.u).ux, (C.u).uy);
                    C.self_invis_message();
                }
                break;
            }
        case (C.WAN_SPEED_MONSTER):
/* no longer gives intrinsic, but gives very fast speed instead */
            C.speed_up(C.long((C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2847, C.literal("zapyourself")), C.rn2(25))) : C.rn2(25))) + (50))))));
        (learn_it.value = (C.char(1)));
        break;
        case (C.WAN_SLEEP):
            case (C.SPE_SLEEP):
                (learn_it.value = (C.char(1)));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.SLEEP_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.SLEEP_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff((C.u).ux, (C.u).uy);
            C.You(C.literal("don't feel sleepy!"), "");
            C.monstseesu(C.ulong(C.M_SEEN_SLEEP));
        }
        else {
            if (ordinary) C.pline_The(C.literal("sleep ray hits you!"), "");
            else C.You(C.literal("fall asleep!"), "");
            C.monstunseesu(C.ulong(C.M_SEEN_SLEEP));
            C.fall_asleep(C.int((-(((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2864, C.literal("zapyourself")), C.rnd(50))) : C.rnd(50))))), (C.char(1)));
        }
        break;
        case (C.WAN_SLOW_MONSTER):
            case (C.SPE_SLOW_MONSTER):
                if (C.long(((C.deref(C.ptrAdd((C.u).uprops, C.FAST, "struct prop"), "struct prop")).intrinsic & (C.long((C.TIMEOUT | (C.long((C.long((67108864n | 33554432n)) | 16777216n))))))))) {
                    (learn_it.value = (C.char(1)));
                    C.u_slow_down();
                }
        break;
        case (C.WAN_TELEPORTATION):
            case (C.SPE_TELEPORT_AWAY):
                C.tele();
/* same criteria as when mounted (zap_steed) */
        if (Number(!!(Number(!!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.TELEPORT_CONTROL, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.TELEPORT_CONTROL, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.STUNNED, "struct prop"), "struct prop")).intrinsic))))) || Number(!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (C.u).uy0, "seenV *"), "seenV *"), (C.u).ux0, "seenV"), "seenV") & 1))) != 0)))))) || Number(C.dist2(((C.u).ux0), ((C.u).uy0), (C.u).ux, (C.u).uy) >= 16)))) (learn_it.value = (C.char(1)));
        break;
        case (C.WAN_DEATH):
            case (C.SPE_FINGER_OF_DEATH):
                if (Number(!!((Number(!!(Number(!!((Number((C.ulong((((((C.gy).youmonst).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || C.ptrCompare((((C.gy).youmonst).data), C.ptrAdd(C.mons, C.PM_MANES, "struct permonst"), "=="))) || (Number(!!((Number(((((C.gy).youmonst).data)).mlet == C.S_GOLEM)) || Number(((((C.gy).youmonst).data)).mlet == C.S_VORTEX))))))) || (Number((C.ulong((((((C.gy).youmonst).data)).mflags2 & C.ulong(256n)))) != C.ulong(0n)))))) {
                    C.pline((((Number((obj).otyp == C.WAN_DEATH))) ? C.literal("The wand shoots an apparently harmless beam at you.") : C.literal("You seem no deader than before.")), "");
                    break;
                }
        (learn_it.value = (C.char(1)));
        C.sprintf(((C.svk).killer).name, C.literal("shot %sself with a death ray"), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).him), "p");
        (((C.svk).killer).format = C.NO_KILLER_PREFIX);
/* probably don't need these to be urgent; player just gave input
           without subsequent opportunity to dismiss --More-- with ESC */
        C.urgent_pline(C.literal("You irradiate yourself with pure energy!"), "");
        C.urgent_pline(C.literal("You die."), "");
/* They might survive with an amulet of life saving */
        C.done(C.DIED);
        break;
        case (C.WAN_UNDEAD_TURNING):
            case (C.SPE_TURN_UNDEAD):
                (learn_it.value = (C.char(1)));
        C.callLocal(unturn_you);
        break;
        case (C.SPE_HEALING):
            case (C.SPE_EXTRA_HEALING):
                (learn_it.value = (C.char(1)));
/* (no effect for spells...) */
        C.healup((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2911, C.literal("zapyourself")), C.d((6), (((Number((obj).otyp == C.SPE_EXTRA_HEALING)) ? 8 : 4))))) : C.d((6), (((Number((obj).otyp == C.SPE_EXTRA_HEALING)) ? 8 : 4))))), 0, (C.char(0)), C.char((Number(!!(C.int((obj).blessed) || Number((obj).otyp == C.SPE_EXTRA_HEALING))))));
        C.You_feel(C.literal("%sbetter."), ((Number((obj).otyp == C.SPE_EXTRA_HEALING)) ? C.literal("much ") : C.literal("")), "p");
        break;
        case (C.WAN_LIGHT):
/* (broken wand) */
/* assert( !ordinary ); */
            (damage = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2917, C.literal("zapyourself")), C.d(((obj).spe), (25)))) : C.d(((obj).spe), (25)))));
        ;
/*FALLTHRU*/
        case (C.EXPENSIVE_CAMERA):
            if (Number(!(damage))) (damage = 5);
        (damage = C.callLocal(lightdamage, obj, ordinary, damage));
        (damage = C.int((damage + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 2924, C.literal("zapyourself")), C.rnd(25))) : C.rnd(25))))));
        if (C.callLocal(flashburn, C.long(damage), (C.char(0)))) (learn_it.value = (C.char(1)));
        (damage = 0);
/* reset */
        break;
        case (C.WAN_OPENING):
            case (C.SPE_KNOCK):
                if ((C.u).ustuck) {
/* zapping either self or holder/holdee [bhitm()] will release
               holder's grasp from the hero or hero's grasp from holdee */
                    C.callLocal(release_hold);
                    (learn_it.value = (C.char(1)));
                }
        if ((C.ptrCompare(C.uball, 0, "!="))) {
            (learn_it.value = (C.char(1)));
            C.unpunish();
        }
/* invent is hit iff hero doesn't escape from a trap */
        if (Number(!!(Number(!((C.u).utrap)) || Number(!(C.openholdingtrap(C.fieldRef(C.gy, "youmonst"), learn_it)))))) {
            boxlock_invent(obj);
/* trigger previously escaped trapdoor */
            C.openfallingtrap(C.fieldRef(C.gy, "youmonst"), (C.char(1)), learn_it);
        }
        break;
        case (C.WAN_LOCKING):
            case (C.SPE_WIZARD_LOCK):
/* similar logic to opening; invent is hit iff no trap triggered */
                if (Number(!!((C.u).utrap || Number(!(C.closeholdingtrap(C.fieldRef(C.gy, "youmonst"), learn_it)))))) {
                    boxlock_invent(obj);
                }
        break;
        case (C.WAN_DIGGING):
            case (C.SPE_DIG):
                case (C.SPE_DETECT_UNSEEN):
                    case (C.WAN_NOTHING):
                        break;
        case (C.WAN_PROBING):
            probe_objchain((C.gi).invent);
        C.update_inventory();
        (learn_it.value = (C.char(1)));
        C.ustatusline();
        break;
        case (C.SPE_STONE_TO_FLESH):
{
                const otmp = C.scalarLocal("struct obj *");
                const onxt = C.scalarLocal("struct obj *");
                let didmerge;
                if (Number((C.u).umonnum == C.PM_STONE_GOLEM)) {
                    (learn_it.value = (C.char(1)));
                    C.polymon(C.PM_FLESH_GOLEM);
                }
                if ((C.deref(C.ptrAdd((C.u).uprops, C.STONED, "struct prop"), "struct prop")).intrinsic) {
                    (learn_it.value = (C.char(1)));
                    C.fix_petrification();
/* saved! */
                }
/* but at a cost.. */
                for ((otmp.value = (C.gi).invent); otmp.value; (otmp.value = onxt.value)) {
                    (onxt.value = (otmp.value).nobj);
                    if (C.callLocal(bhito, otmp.value, obj)) (learn_it.value = (C.char(1)));
                }
/*
         * It is possible that we can now merge some inventory.
         * Do a highly paranoid merge.  Restart from the beginning until
         * no merges.  Don't merge worn items (in case of stone-to-flesh
         * of rocks wielded in differing weapon/alt-wep/quiver slot).
         */
                do {
                    (didmerge = (C.char(0)));
                    for ((otmp.value = (C.gi).invent); Number(!!(Number(!(didmerge)) && otmp.value)); (otmp.value = (otmp.value).nobj)) {
                        if ((otmp.value).owornmask) continue;
                        for ((onxt.value = (otmp.value).nobj); onxt.value; (onxt.value = (onxt.value).nobj)) if (C.merged(otmp, onxt)) {
                            (didmerge = (C.char(1)));
                            break;
                        }
                    }
                }
                while (didmerge);
                break;
            }
        default:
            C.impossible(C.literal("zapyourself: object %d used?"), (obj).otyp, "i");
        break;
    }
/* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it.value) learnwand(obj);
    return damage;
}

/* called when poly'd hero uses breath attack against self */
export function ubreatheu(mattk) {
    mattk = C.argument(mattk, "struct attack *");
    let dtyp = C.int((C.int((20 + (mattk).adtyp)) - 1));
/* breath by hero */
    C.callLocal(zhitu, dtyp, (mattk).damn, flash_str(dtyp, (C.char(1))), (C.u).ux, (C.u).uy);
}

/* light damages hero in gremlin form */
export function lightdamage(obj, ordinary, amt) /* item making light (fake book if spell) */
/* wand/camera zap vs wand destruction */
/* pseudo-damage used to determine blindness duration */
{
    obj = C.argument(obj, "struct obj *");
    ordinary = C.argument(ordinary, "boolean");
    amt = C.argument(amt, "int");
    const buf = C.localArray("char[256]", 0);
    let how;
    let dmg = amt;
    if (Number(!!(dmg && C.ptrCompare(((C.gy).youmonst).data, C.ptrAdd(C.mons, C.PM_GREMLIN, "struct permonst"), "==")))) {
/* reduce high values (from destruction of wand with many charges) */
        (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3037, C.literal("lightdamage")), C.rnd(dmg))) : C.rnd(dmg))));
        if (Number(dmg > 10)) (dmg = C.int((10 + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3039, C.literal("lightdamage")), C.rnd(C.int((dmg - 10))))) : C.rnd(C.int((dmg - 10))))))));
        if (Number(dmg > 20)) (dmg = 20);
        C.pline(C.literal("Ow, that light hurts%c"), (((Number(!!(Number(dmg > 2) || Number((C.u).mh <= 5))))) ? 33 : 46), "i");
/* [composing killer/reason is superfluous here; if fatal, cause
           of death will always be "killed while stuck in creature form"] */
        if (Number(!!(Number((obj).oclass == C.SCROLL_CLASS) || Number((obj).oclass == C.SPBOOK_CLASS)))) (ordinary = (C.char(0)));
/* say blasted rather than zapped */
        (how = (((Number((obj).oclass == C.SPBOOK_CLASS))) ? C.literal("spell of light") : (((Number(!((obj).oartifact)))) ? C.ansimpleoname(obj) : C.bare_artifactname(obj))));
        C.sprintf(buf, C.literal("%s %sself with %s"), ((ordinary) ? C.literal("zapped") : C.literal("blasted")), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).him), how, "ppp");
/* might rehumanize(); could be fatal, but only for Unchanging */
        C.losehp((((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).extrinsic))))) ? (C.int(Math.trunc((C.int(((dmg) + 1))) / 2))) : (dmg))), buf, C.NO_KILLER_PREFIX);
    }
    return dmg;
}

/* light[ning] causes blindness */
export function flashburn(duration, via_lightning) {
    duration = C.argument(duration, "long");
    via_lightning = C.argument(via_lightning, "boolean");
    if (Number(!(C.resists_blnd(C.fieldRef(C.gy, "youmonst"))))) {
        C.You(C.literal("are blinded by the flash!"), "");
        C.make_blinded(duration, (C.char(0)));
        if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.Your(C.literal("%s"), (C.c_common_strings).c_vision_clears, "p");
        return (C.char(1));
    }
/* if blinding is resisted due to magical equipment (Sunsword), give
       a sparkle animation (even if also resisted due to being blind)
       _unless_ this is lightning-induced; we don't want a double sparkle
       if hero is both lightning resistant and blindness resistant, or
       worse, have a single sparkle where the player confuses blindness
       resistance for lightning resistance */
    if (Number(!!(Number(!(via_lightning)) && C.resists_blnd_by_arti(C.fieldRef(C.gy, "youmonst"))))) {
        C.shieldeff((C.u).ux, (C.u).uy);
        return (C.char(1));
    }
    return (C.char(0));
}

/* you've zapped a wand downwards while riding
 * Return TRUE if the steed was hit by the wand.
 * Return FALSE if the steed was not hit by the wand.
 */
export function zap_steed(obj) /* wand or spell */
{
    obj = C.argument(obj, "struct obj *");
    let steedhit = (C.char(0));
    ((((C.gb).bhitpos).x = ((C.u).usteed).mx), (((C.gb).bhitpos).y = ((C.u).usteed).my));
    ((C.gn).notonhead = (C.char(0)));
    switch ((obj).otyp) {
/*
     * Wands that are allowed to hit the steed
     * Carefully test the results of any that are
     * moved here from the bottom section.
     */
        case (C.WAN_PROBING):
            probe_monster((C.u).usteed);
        learnwand(obj);
        (steedhit = (C.char(1)));
        break;
        case (C.WAN_TELEPORTATION):
            case (C.SPE_TELEPORT_AWAY):
/* you go together */
                C.tele();
/* same criteria as when unmounted (zapyourself) */
        if (Number(!!(Number(!!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.TELEPORT_CONTROL, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.TELEPORT_CONTROL, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.STUNNED, "struct prop"), "struct prop")).intrinsic))))) || Number(!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (C.u).uy0, "seenV *"), "seenV *"), (C.u).ux0, "seenV"), "seenV") & 1))) != 0)))))) || Number(C.dist2(((C.u).ux0), ((C.u).uy0), (C.u).ux, (C.u).uy) >= 16)))) learnwand(obj);
        (steedhit = (C.char(1)));
        break;
/* Default processing via bhitm() for these */
        case (C.SPE_CURE_SICKNESS):
            case (C.WAN_MAKE_INVISIBLE):
                case (C.WAN_CANCELLATION):
                    case (C.SPE_CANCELLATION):
                        case (C.WAN_POLYMORPH):
                            case (C.SPE_POLYMORPH):
                                case (C.WAN_STRIKING):
                                    case (C.SPE_FORCE_BOLT):
                                        case (C.WAN_SLOW_MONSTER):
                                            case (C.SPE_SLOW_MONSTER):
                                                case (C.WAN_SPEED_MONSTER):
                                                    case (C.SPE_HEALING):
                                                        case (C.SPE_EXTRA_HEALING):
                                                            case (C.SPE_DRAIN_LIFE):
                                                                case (C.WAN_OPENING):
                                                                    case (C.SPE_KNOCK):
                                                                        C.callLocal(bhitm, (C.u).usteed, obj);
        (steedhit = (C.char(1)));
        break;
        default:
            (steedhit = (C.char(0)));
        break;
    }
    return C.char(steedhit);
}

/*
 * cancel a monster (possibly the hero).  inventory is cancelled only
 * if the monster is zapping itself directly, since otherwise the
 * effect is too strong.  currently non-hero monsters do not zap
 * themselves with cancellation.
 */
export function cancel_monst(mdef, obj, youattack, allow_cancel_kill, self_cancel) {
    mdef = C.argument(mdef, "struct monst *");
    obj = C.argument(obj, "struct obj *");
    youattack = C.argument(youattack, "boolean");
    allow_cancel_kill = C.argument(allow_cancel_kill, "boolean");
    self_cancel = C.argument(self_cancel, "boolean");
    C.declareStatic("cancel_monst.writing_vanishes", "const char[36]", C.literal("Some writing vanishes from %s head!"));
    C.declareStatic("cancel_monst.your", "const char[5]", C.literal("your"));
/* should be extern */
    let youdefend = C.char((C.ptrCompare(mdef, C.fieldRef(C.gy, "youmonst"), "==")));
    if (((youdefend) ? (Number(!!(Number(!(youattack)) && (Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).extrinsic)))))) : C.callLocal(resist, mdef, (obj).oclass, 0, C.NOTELL))) return (C.char(0));
/* resisted cancellation */
    if (self_cancel) {
/* 1st cancel inventory */
        let otmp;
        for ((otmp = (((youdefend) ? (C.gi).invent : (mdef).minvent))); otmp; (otmp = (otmp).nobj)) C.callLocal(cancel_item, otmp);
        if (youdefend) {
            ((C.disp).botl = (C.char(1)));
/* potential AC change */
            C.find_ac();
/* update_inventory(); -- handled by caller */
        }
    }
/* now handle special cases */
    if (youdefend) {
        if ((Number((C.u).umonnum != (C.u).umonster))) {
/* includes lycanthrope in creature form */
/*
             * Return to normal form unless Unchanging.
             * Hero in clay golem form dies if Unchanging.
             * Does not cure lycanthropy or stop timed random polymorph.
             */
            if (Number((C.u).umonnum == C.PM_CLAY_GOLEM)) {
                if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.pline(C.staticCell("cancel_monst.writing_vanishes").value, C.staticCell("cancel_monst.your").value, "p");
                else /* note: "dark" rather than "heavy" is intentional... */
                C.You_feel(C.literal("%s headed."), (((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))) ? C.literal("dark") : C.literal("light")), "p");
                ((C.u).mh = 0);
/* fatal; death handled by rehumanize() */
            }
            if (Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.UNCHANGING, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.UNCHANGING, "struct prop"), "struct prop")).extrinsic))) && Number((C.u).mh > 0)))) C.Your(C.literal("amulet grows hot for a moment, then cools."), "");
            else C.rehumanize();
        }
    }
    else {
        ((mdef).mcan = C.uint(1));
/* force shapeshifter into its base form or mimic to unhide */
        C.normal_shape(mdef);
        if (C.ptrCompare((mdef).data, C.ptrAdd(C.mons, C.PM_CLAY_GOLEM, "struct permonst"), "==")) {
            if (C.canseemon(mdef)) C.pline(C.staticCell("cancel_monst.writing_vanishes").value, C.s_suffix(C.mon_nam(mdef)), "p");
/* !allow_cancel_kill is for Magicbane, where clay golem
               will be killed somewhere back up the call/return chain... */
            if (allow_cancel_kill) {
                if (youattack) C.killed(mdef);
                else C.monkilled(mdef, C.literal(""), C.AD_SPEL);
            }
        }
    }
    return (C.char(1));
}

/* you've zapped an immediate type wand up or down */
export function zap_updown(obj) /* wand or spell, nonnull */
{
    obj = C.argument(obj, "struct obj *");
    let striking = (C.char(0));
    const disclose = C.scalarLocal("boolean", (C.char(0)));
    let map_zapped = (C.char(0));
    let x;
    let y;
    const xx = C.scalarLocal("coordxy");
    const yy = C.scalarLocal("coordxy");
    let ptmp;
    let otmp;
    let e;
    let ttmp;
    let stway = (C.gs).stairs;
/* some wands have special effects other than normal bhitpile */
/* drawbridge might change <u.ux,u.uy> */
    (x = (xx.value = (C.u).ux));
/* <x,y> is zap location */
    (y = (yy.value = (C.u).uy));
/* <xx,yy> is drawbridge (portcullis) position */
    (ttmp = C.t_at(x, y));
/* trap if there is one */
    switch ((obj).otyp) {
        case (C.WAN_PROBING):
            (ptmp = 0);
        if (Number((C.u).dz < 0)) {
            C.You(C.literal("probe towards the %s."), C.ceiling(x, y), "p");
        }
        else {
/* down */
            let surf;
            let ltyp;
            let rememberedltyp = C.char(C.update_mapseen_for(x, y));
            (ptmp = C.int((ptmp + bhitpile(obj, C.callback("bhito", bhito), x, y, C.char((C.u).dz)))));
/* sequencing: zap_map() calls force_decor() for ice or furniture;
               we need to call it before probing for buried objects */
            (ltyp = C.char(((((Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ == C.DRAWBRIDGE_UP))) ? C.db_under_typ(C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).flags)) : (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ))));
            C.callLocal(zap_map, x, y, obj);
/*map_zapped = TRUE; // not needed due to early return*/
            if (Number(!!(Number(ltyp == C.ICE) || (Number(!!(Number((ltyp) >= C.STAIRS) && Number((ltyp) <= C.ALTAR))))))) {
                (surf = C.literal("it"));
                if (Number(C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.svl).lastseentyp, x, "schar[21]"), "schar[21]"), y, "schar"), "schar") != rememberedltyp)) (ptmp = C.int((ptmp + 1)));
            }
            else {
                (surf = C.the(C.surface(x, y)));
            }
            C.You(C.literal("probe beneath %s."), surf, "p");
            (ptmp = C.int((ptmp + C.display_binventory(x, y, (C.char(1))))));
        }
        if (Number(!(ptmp))) C.Your(C.literal("probe reveals nothing."), "");
        return (C.char(1));
/* we've done our own bhitpile */
        case (C.WAN_OPENING):
            case (C.SPE_KNOCK):
                while (stway) {
                    if (Number(!!(Number(!!(Number(!((stway).isladder)) && Number(!((stway).up)))) && Number(((stway).tolev).dnum == ((C.u).uz).dnum)))) break;
                    (stway = (stway).next);
                }
/* up or down, but at closed portcullis only */
        if (Number(!!(C.is_db_wall(x, y) && C.find_drawbridge(xx, yy)))) {
            C.open_drawbridge(xx.value, yy.value);
            (disclose.value = (C.char(1)));
        }
        else if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number((C.u).dz > 0) && stway)) && Number((stway).sx == x))) && Number((stway).sy == y))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_qstart_level")))) && Number(!(C.ok_to_quest()))))) /* can't use the stairs down to quest level 2 until
                      leader "unlocks" them; give feedback if you try */
{
            C.pline_The(C.literal("stairs seem to ripple momentarily."), "");
            (disclose.value = (C.char(1)));
        }
/* down will release you from bear trap or web */
        if (Number(!!(Number((C.u).dz > 0) && (C.u).utrap))) {
            C.openholdingtrap(C.fieldRef(C.gy, "youmonst"), disclose);
/* down will trigger trapdoor, hole, or [spiked-] pit */
        }
        else if (Number(!!(Number((C.u).dz > 0) && Number(!((C.u).utrap))))) {
            C.openfallingtrap(C.fieldRef(C.gy, "youmonst"), (C.char(0)), disclose);
        }
        break;
        case (C.WAN_STRIKING):
            case (C.SPE_FORCE_BOLT):
                (striking = (C.char(1)));
        ;
/*FALLTHRU*/
        case (C.WAN_LOCKING):
            case (C.SPE_WIZARD_LOCK):
/* down at open bridge or up or down at open portcullis */
                if (Number(!!(((((Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ == C.DRAWBRIDGE_DOWN))) ? (Number((C.u).dz > 0)) : (Number(!!(Number(C.is_drawbridge_wall(x, y) >= 0) && Number(!(C.is_db_wall(x, y)))))))) && C.find_drawbridge(xx, yy)))) {
                    if (Number(!(striking))) C.close_drawbridge(xx.value, yy.value);
                    else C.destroy_drawbridge(xx.value, yy.value);
                    (disclose.value = (C.char(1)));
                }
                else if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(striking && Number((C.u).dz < 0))) && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3307, C.literal("zap_updown")), C.rn2(3))) : C.rn2(3))))) && Number(!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_air_level")))))))))) && Number(!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_water_level")))))))))) && Number(!(((C.u).uinwater))))) && Number(!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_qstart_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_qstart_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_qstart_level"))))))))))) {
                    let dmg;
/* similar to zap_dig() */
                    C.pline(C.literal("A rock is dislodged from the %s and falls on your %s."), C.ceiling(x, y), C.body_part(C.HEAD), "pp");
                    (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3314, C.literal("zap_updown")), C.rnd(((C.hard_helmet(C.uarmh)) ? 2 : 6)))) : C.rnd(((C.hard_helmet(C.uarmh)) ? 2 : 6)))));
                    C.losehp((((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).extrinsic))))) ? (C.int(Math.trunc((C.int(((dmg) + 1))) / 2))) : (dmg))), C.literal("falling rock"), C.KILLED_BY_AN);
                    if (C.ptrCompare(((otmp = C.mksobj_at(C.ROCK, x, y, (C.char(0)), (C.char(0))))), 0, "!=")) {
                        C.xname(otmp);
/* set dknown, maybe bknown */
                        C.stackobj(otmp);
                    }
                    C.newsym(x, y);
                }
                else if (Number(!!(Number((C.u).dz > 0) && ttmp))) {
                    if (Number(!!(Number(!(striking)) && C.closeholdingtrap(C.fieldRef(C.gy, "youmonst"), disclose)))) {
                        ;
/* now stuck in web or bear trap */
                    }
                    else if (Number(!!(striking && Number(C.int((ttmp).ttyp) == C.TRAPDOOR)))) {
/* striking transforms trapdoor into hole */
                        if (Number(!!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))) && Number(!((ttmp).tseen))))) {
                            C.pline(C.literal("%s beneath you shatters."), (C.c_common_strings).c_Something, "p");
                        }
                        else if (Number(!((ttmp).tseen))) {
/* => !Blind */
                            C.pline(C.literal("There's a trapdoor beneath you; it shatters."), "");
                        }
                        else {
                            C.pline(C.literal("The trapdoor beneath you shatters."), "");
                            (disclose.value = (C.char(1)));
                        }
                        ((ttmp).ttyp = C.uint(C.HOLE));
                        ((ttmp).tseen = C.uint(1));
                        C.newsym(x, y);
/* might fall down hole */
                        C.dotrap(ttmp, C.NO_TRAP_FLAGS);
                    }
                    else if (Number(!!(Number(!(striking)) && Number(C.int((ttmp).ttyp) == C.HOLE)))) {
/* locking transforms hole into trapdoor */
                        ((ttmp).ttyp = C.uint(C.TRAPDOOR));
                        if (Number(!!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))) || Number(!((ttmp).tseen))))) {
                            C.pline(C.literal("Some %s swirls beneath you."), ((C.is_ice(x, y)) ? C.literal("frost") : C.literal("dust")), "p");
                        }
                        else {
                            ((ttmp).tseen = C.uint(1));
                            C.newsym(x, y);
                            C.pline(C.literal("A trapdoor appears beneath you."), "");
                            (disclose.value = (C.char(1)));
                        }
/* hadn't fallen down hole; won't fall now */
                    }
                }
        break;
        case (C.SPE_STONE_TO_FLESH):
            if (Number(!!(Number(!!(Number(!!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_air_level")))))) || ((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_water_level")))))))) || C.int(((C.u).uinwater)))) || (Number(!!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_qstart_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_qstart_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_qstart_level")))))) && Number((C.u).dz < 0))))))) {
                C.pline(C.literal("%s"), (C.c_common_strings).c_nothing_happens, "p");
            }
            else if (Number((C.u).dz < 0)) {
/* we should do more... */
                C.pline(C.literal("Blood drips on your %s."), C.body_part(C.FACE), "p");
            }
            else if (Number(!!(Number((C.u).dz > 0) && Number(!((C.ptrCompare(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, (C.u).ux, "struct obj *[21]"), "struct obj *[21]"), (C.u).uy, "struct obj *"), "struct obj *"), 0, "!="))))))) {
/*
            Print this message only if there wasn't an engraving
            affected here.  If water or ice, act like waterlevel case.
            */
                (e = C.engr_at((C.u).ux, (C.u).uy));
                if (Number(!((Number(!!(e && Number((e).engr_type == C.ENGRAVE))))))) {
                    if (Number(!!(C.is_pool((C.u).ux, (C.u).uy) || C.is_ice((C.u).ux, (C.u).uy)))) C.pline(C.literal("%s"), (C.c_common_strings).c_nothing_happens, "p");
                    else C.pline(C.literal("Blood %ss %s your %s."), ((C.is_lava((C.u).ux, (C.u).uy)) ? C.literal("boil") : C.literal("pool")), (((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.LEVITATION, "struct prop"), "struct prop")).blocked)))))) ? C.literal("beneath") : C.literal("at")), C.makeplural(C.body_part(C.FOOT)), "ppp");
                }
            }
        break;
        default:
            break;
    }
    if (Number((C.u).dz > 0)) {
/* zapping downward */
        bhitpile(obj, C.callback("bhito", bhito), x, y, C.char((C.u).dz));
/* note: engraving handling that used to be here has been moved
           to zap_map() */
        if (Number(!(map_zapped))) C.callLocal(zap_map, x, y, obj);
    }
    else if (Number((C.u).dz < 0)) {
/* zapping upward */
/* game flavor: if you're hiding under "something"
         * a zap upward should hit that "something".
         */
        if (Number(!!(C.int((C.u).uundetected) && (Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(128n)))) != C.ulong(0n)))))) {
            let hitit = 0;
            (otmp = C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, (C.u).ux, "struct obj *[21]"), "struct obj *[21]"), (C.u).uy, "struct obj *"), "struct obj *"));
            if (otmp) (hitit = C.callLocal(bhito, otmp, obj));
            if (hitit) {
                C.hideunder(C.fieldRef(C.gy, "youmonst"));
                (disclose.value = (C.char(1)));
            }
        }
    }
    return disclose.value;
}

/* used by do_break_wand() was well as by weffects() */
export function zapsetup() {
    ((C.go).obj_zapped = (C.char(0)));
}

export function zapwrapup() {
/* if do_osshock() set obj_zapped while polying, give a message now */
    if ((C.go).obj_zapped) C.You_feel(C.literal("shuddering vibrations."), "");
    ((C.go).obj_zapped = (C.char(0)));
}

/* called for various wand and spell effects - M. Stephenson */
export function weffects(obj) {
    obj = C.scalarLocal("struct obj *", C.argument(obj, "struct obj *"));
    let otyp = (obj.value).otyp;
    let disclose = (C.char(0));
    let was_unkn = C.char(Number(!((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_name_known)));
    C.exercise(C.A_WIS, (C.char(1)));
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((C.u).usteed && (Number(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_dir) != C.NODIR)))) && Number(!((C.u).dx)))) && Number(!((C.u).dy)))) && (Number((C.u).dz > 0)))) && zap_steed(obj.value)))) {
        (disclose = (C.char(1)));
    }
    else if (Number(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_dir) == C.IMMEDIATE)) {
        zapsetup();
/* reset obj_zapped */
        if ((C.u).uswallow) {
            C.callLocal(bhitm, (C.u).ustuck, obj.value);
/* [how about `bhitpile(u.ustuck->minvent)' effect?] */
        }
        else if ((C.u).dz) {
            (disclose = C.callLocal(zap_updown, obj.value));
        }
        else {
            C.callLocal(bhit, (C.u).dx, (C.u).dy, (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3448, C.literal("weffects")), C.rn2(8))) : C.rn2(8))) + (6)))), C.int(C.ZAPPED_WAND), C.callback("bhitm", bhitm), C.callback("bhito", bhito), obj);
        }
        zapwrapup();
/* give feedback for obj_zapped */
    }
    else if (Number(C.int((C.deref(C.ptrAdd(C.objects, otyp, "struct objclass"), "struct objclass")).oc_dir) == C.NODIR)) {
        zapnodir(obj.value);
    }
    else {
/* neither immediate nor directionless */
        if (Number(!!(Number(otyp == C.WAN_DIGGING) || Number(otyp == C.SPE_DIG)))) C.zap_dig();
        else if (Number(!!(Number(otyp >= C.SPE_MAGIC_MISSILE) && Number(otyp <= C.SPE_FINGER_OF_DEATH)))) ubuzz((C.int((10 + ((C.int((C.abs(C.int(((otyp) - C.SPE_MAGIC_MISSILE))) % 10))))))), C.int((C.int(Math.trunc((C.u).ulevel / 2)) + 1)));
        else if (Number(!!(Number(otyp >= C.WAN_MAGIC_MISSILE) && Number(otyp <= C.WAN_LIGHTNING)))) ubuzz((C.int((0 + ((C.int((C.abs(C.int(((otyp) - C.WAN_MAGIC_MISSILE))) % 10))))))), (((Number(otyp == C.WAN_MAGIC_MISSILE))) ? 2 : 6));
        else C.impossible(C.literal("weffects: unexpected spell or wand"), "");
        (disclose = (C.char(1)));
    }
    if (disclose) {
        learnwand(obj.value);
        if (was_unkn) C.more_experienced(0, 10);
    }
    return;
}

/* augment damage for a spell based on the hero's intelligence (and level) */
export function spell_damage_bonus(dmg) /* base amount to be adjusted by bonus or penalty */
{
    dmg = C.argument(dmg, "int");
    let intell = (C.acurr(C.A_INT));
/* Punish low intelligence before low level else low intelligence
       gets punished only when high level */
    if (Number(intell <= 9)) {
/* -3 penalty, but never reduce combined amount below 1
           (if dmg is 0 for some reason, we're careful to leave it there) */
        if (Number(dmg > 1)) (dmg = (((Number(dmg <= 3))) ? 1 : C.int((dmg - 3))));
    }
    else if (Number(!!(Number(intell <= 13) || Number((C.u).ulevel < 5)))) ;
    else /* no bonus or penalty; dmg remains same */
    if (Number(intell <= 18)) (dmg = C.int((dmg + 1)));
    else if (Number(!!(Number(intell <= 24) || Number((C.u).ulevel < 14)))) (dmg = C.int((dmg + 2)));
    else (dmg = C.int((dmg + 3)));
/* Int 25 */
    return dmg;
}

/*
 * Generate the to-hit bonus for a spell.  Based on the hero's skill in
 * spell class and dexterity.
 */
export function spell_hit_bonus(skill) {
    skill = C.argument(skill, "int");
    let hit_bon = 0;
    let dex = (C.acurr(C.A_DEX));
    switch (((C.deref(C.ptrAdd((C.u).weapon_skills, C.spell_skilltype(skill), "struct skills"), "struct skills")).skill)) {
        case (C.P_ISRESTRICTED):
            case (C.P_UNSKILLED):
                (hit_bon = C.int((-4)));
        break;
        case (C.P_BASIC):
            (hit_bon = 0);
        break;
        case (C.P_SKILLED):
            (hit_bon = 2);
        break;
        case (C.P_EXPERT):
            (hit_bon = 3);
        break;
    }
    if (Number(dex < 4)) (hit_bon = C.int((hit_bon - 3)));
    else if (Number(dex < 6)) (hit_bon = C.int((hit_bon - 2)));
    else if (Number(dex < 8)) (hit_bon = C.int((hit_bon - 1)));
    else if (Number(dex < 14)) /* Will change when print stuff below removed */
    (hit_bon = C.int((hit_bon - 0)));
    else /* Even increment for dexterous heroes (see weapon.c abon) */
    (hit_bon = C.int((hit_bon + C.int((dex - 14)))));
    return hit_bon;
}

export function exclam(force) {
    force = C.argument(force, "int");
/* force == 0 occurs e.g. with sleep ray */
/* note that large force is usual with wands so that !! would
            require information about hand/weapon/wand */
    return ((((Number(force < 0))) ? C.literal("?") : (((Number(force <= 4))) ? C.literal(".") : C.literal("!"))));
}

export function hit(str, mtmp, force) /* zap text or missile name */
/* target; for missile, might be hero */
/* usually either "." or "!" via exclam() */
{
    str = C.argument(str, "const char *");
    mtmp = C.argument(mtmp, "struct monst *");
    force = C.argument(force, "const char *");
    let verbosely = C.char((Number(!!(C.ptrCompare(mtmp, C.fieldRef(C.gy, "youmonst"), "==") || (Number(!!((C.flags).verbose && (Number(!!(Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, ((C.gb).bhitpos).y, "seenV *"), "seenV *"), ((C.gb).bhitpos).x, "seenV"), "seenV") & 2))) != 0)) || (Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp)))))) || (Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mtmp), "==")))))))))))))));
    C.pline(C.literal("%s %s %s%s"), C.The(str), C.vtense(str, C.literal("hit")), ((verbosely) ? C.mon_nam(mtmp) : C.literal("it")), force, "pppp");
}

export function miss(str, mtmp) {
    str = C.argument(str, "const char *");
    mtmp = C.argument(mtmp, "struct monst *");
    C.pline(C.literal("%s %s %s."), C.The(str), C.vtense(str, C.literal("miss")), (((Number(!!((Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, ((C.gb).bhitpos).y, "seenV *"), "seenV *"), ((C.gb).bhitpos).x, "seenV"), "seenV") & 2))) != 0)) || (Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))))) && (C.flags).verbose)))) ? C.mon_nam(mtmp) : C.literal("it")), "ppp");
}

export function skiprange(range, skipstart, skipend) {
    range = C.argument(range, "int");
    skipstart = C.argument(skipstart, "int *");
    skipend = C.argument(skipend, "int *");
    let tr = (C.int(Math.trunc(range / 4)));
    let tmp = C.int((range - ((((Number(tr > 0))) ? (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3582, C.literal("skiprange")), C.rnd(tr))) : C.rnd(tr))) : 0))));
    C.store(skipstart, "int", tmp);
    C.store(skipend, "int", C.int((tmp - (C.int(Math.imul((C.int(Math.trunc(tmp / 4))), (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3585, C.literal("skiprange")), C.rnd(3))) : C.rnd(3)))))))));
    if (Number(C.deref(skipend, "int") >= tmp)) C.store(skipend, "int", C.int((tmp - 1)));
}

/* Maybe explode a trap hit by object otmp's effect;
   cancellation beam hitting a magical trap causes an explosion.
   Might delete the trap; won't destroy otmp. */
export function maybe_explode_trap(ttmp, otmp, learn_it) {
    ttmp = C.argument(ttmp, "struct trap *");
    otmp = C.argument(otmp, "struct obj *");
    learn_it = C.argument(learn_it, "boolean *");
    if (Number(!!(Number(!(ttmp)) || Number(!(otmp))))) return;
    if (Number(!!(Number((otmp).otyp == C.WAN_CANCELLATION) || Number((otmp).otyp == C.SPE_CANCELLATION)))) {
        let x = (ttmp).tx;
        let y = (ttmp).ty;
        if ((Number(!!(Number(C.int(((ttmp).ttyp)) == C.MAGIC_PORTAL) || Number(C.int(((ttmp).ttyp)) == C.VIBRATING_SQUARE))))) {
            C.shieldeff(x, y);
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) {
                ((ttmp).tseen = C.uint(1));
                C.newsym(x, y);
                C.store(learn_it, "boolean", (C.char(1)));
            }
        }
        else if ((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.int(((ttmp).ttyp)) == C.TELEP_TRAP) || Number(C.int(((ttmp).ttyp)) == C.LEVEL_TELEP))) || Number(C.int(((ttmp).ttyp)) == C.MAGIC_TRAP))) || Number(C.int(((ttmp).ttyp)) == C.ANTI_MAGIC))) || Number(C.int(((ttmp).ttyp)) == C.POLY_TRAP))))) {
            let seeit = (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0));
/* note: this explosion mustn't destroy otmp */
            C.explode(x, y, C.int((-C.WAN_CANCELLATION)), C.int((20 + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3616, C.literal("maybe_explode_trap")), C.d((3), (6)))) : C.d((3), (6)))))), C.char((C.int((C.MAXOCLASSES + 3)))), C.EXPL_MAGICAL);
            C.deltrap(ttmp);
            C.newsym(x, y);
            if (seeit) C.store(learn_it, "boolean", (C.char(1)));
        }
    }
}

/* zap_map() occurs before hitting monsters or objects and handles wands or
   spells that don't dish out 'elemental' damage */
export function zap_map(x, y, obj) /* zapped wand, or book for cast spell */
{
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    obj = C.argument(obj, "struct obj *");
    let ttmp = C.t_at(x, y);
    const dbx = C.scalarLocal("coordxy", x);
    const dby = C.scalarLocal("coordxy", y);
/* might be changed by drawbridge handling */
    const learn_it = C.scalarLocal("boolean", (C.char(0)));
/*
     * We handle drawbridge for lateral zaps; zap_updown() handles up/down.
     * Engravings only get hit by down zaps and we handle that here.
     */
/* cancellation */
    maybe_explode_trap(ttmp, obj, learn_it);
    (ttmp = C.t_at(x, y));
/* refresh in case trap was altered or is gone */
    if (Number((C.u).dz > 0)) {
/* zapping down */
        const ebuf = C.localArray("char[256]", 0);
        const pristinebuf = C.localArray("char[256]", 0);
        let etxt;
        let e = C.engr_at(x, y);
/* subset of engraving effects; none sets `disclose' */
        if (Number(!!(e && Number((e).engr_type != C.HEADSTONE)))) {
            switch ((obj).otyp) {
                case (C.WAN_POLYMORPH):
                    case (C.SPE_POLYMORPH):
                        C.del_engr(e);
                (etxt = C.random_engraving(ebuf, pristinebuf));
                C.make_engr_at(x, y, etxt, pristinebuf, (C.svm).moves, 0);
                break;
                case (C.WAN_CANCELLATION):
                    case (C.SPE_CANCELLATION):
                        case (C.WAN_MAKE_INVISIBLE):
                            C.del_engr(e);
                break;
                case (C.WAN_TELEPORTATION):
                    case (C.SPE_TELEPORT_AWAY):
                        C.rloc_engr(e);
                break;
                case (C.SPE_STONE_TO_FLESH):
                    if (Number((e).engr_type == C.ENGRAVE)) {
/* only affects things in stone */
                        C.pline_The((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))) ? C.literal("floor runs like butter!") : C.literal("edges on the floor get smoother.")), "");
                        C.wipe_engr_at(x, y, C.short((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3673, C.literal("zap_map")), C.d((2), (4)))) : C.d((2), (4))))), (C.char(1)));
                    }
                break;
                case (C.WAN_STRIKING):
                    case (C.SPE_FORCE_BOLT):
                        C.wipe_engr_at(x, y, C.short((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3678, C.literal("zap_map")), C.d((2), (4)))) : C.d((2), (4))))), (C.char(1)));
                break;
                default:
                    break;
            }
        }
    }
    else if (Number(!((C.u).dz))) {
        let ltyp = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ;
        if (C.find_drawbridge(dbx, dby)) {
            switch ((obj).otyp) {
                case (C.WAN_OPENING):
                    case (C.SPE_KNOCK):
/* dbwall: 'closed door' of raised drawbridge */
                        if (C.is_db_wall(x, y)) {
                            if (Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, dby.value, "seenV *"), "seenV *"), dbx.value, "seenV"), "seenV") & 2))) != 0)) || (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))))) (learn_it.value = (C.char(1)));
                            C.open_drawbridge(dbx.value, dby.value);
                        }
                break;
                case (C.WAN_LOCKING):
                    case (C.SPE_WIZARD_LOCK):
/* drawbridge_down: span of lowered drawbridge */
                        if (Number(!!((Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, dby.value, "seenV *"), "seenV *"), dbx.value, "seenV"), "seenV") & 2))) != 0)) || (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))))) && Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, dbx.value, "struct rm[21]"), "struct rm[21]"), dby.value, "struct rm"), "struct rm")).typ == C.DRAWBRIDGE_DOWN)))) (learn_it.value = (C.char(1)));
                C.close_drawbridge(dbx.value, dby.value);
                break;
                case (C.WAN_STRIKING):
                    case (C.SPE_FORCE_BOLT):
/* !drawbridge_up: not spot in front of raised bridge,
                   so either span of lowered bridge or portcullis */
                        if (Number(ltyp != C.DRAWBRIDGE_UP)) {
                            (learn_it.value = (C.char(1)));
                            C.destroy_drawbridge(dbx.value, dby.value);
                        }
                break;
            }
        }
/* find_drawbridge */
    }
/* !u.uz */
    if (Number((obj).otyp == C.WAN_PROBING)) {
/*
         * Probing, either up/down or lateral.
         */
        let ltyp;
        let oldtyp;
        let oldglyph;
/* map terrain; might reveal a special room which is already within
           view that hasn't been entered yet */
        (oldtyp = C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.svl).lastseentyp, x, "schar[21]"), "schar[21]"), y, "schar"), "schar"));
        (oldglyph = C.glyph_at(x, y));
        C.show_map_spot(x, y, (C.char(0)));
        if (Number(!!(Number(oldtyp != C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.svl).lastseentyp, x, "schar[21]"), "schar[21]"), y, "schar"), "schar")) || Number(oldglyph != C.glyph_at(x, y))))) {
/* TODO: ought to give some message */
            (learn_it.value = (C.char(1)));
        }
        (ltyp = C.char(((((Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ == C.DRAWBRIDGE_UP))) ? C.db_under_typ(C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).flags)) : (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ))));
/* secret door gets revealed, converted into regular door */
        if (Number(ltyp == C.SDOOR)) {
            C.cvt_sdoor_to_door(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"));
/* .typ = DOOR */
            C.recalc_block_point(x, y);
            C.newsym(x, y);
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) {
                C.pline(C.literal("Probing reveals a secret door."), "");
                (learn_it.value = (C.char(1)));
            }
            else if (((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))))))) {
/* from zap_over_floor() */
                C.draft_message((C.char(0)));
/* "You feel a draft." (open doorway) */
            }
/* secret corridor likewise, although only ones within view will
           still be secret; for the !cansee(x,y) case, show_map_spot()
           above has already converted the spot to regular corridor */
        }
        else if (Number(ltyp == C.SCORR)) {
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ = C.char(C.CORR));
            C.unblock_point(x, y);
            C.newsym(x, y);
            C.pline(C.literal("Probing exposes a secret corridor."), "");
            (learn_it.value = (C.char(1)));
/* if on or over ice, describe it ("solid ice", "thin ice", &c);
           likewise for furniture in case hero is levitating while blind */
        }
        else if (Number(!!(Number(ltyp == C.ICE) || (Number(!!(Number((ltyp) >= C.STAIRS) && Number((ltyp) <= C.ALTAR))))))) {
            if (Number((C.u).dz > 0)) {
/* down, which also means x,y == u.ux,u.uy */
                C.force_decor((C.char(1)));
                (learn_it.value = (C.char(1)));
            }
        }
/*
         * Probing reveals undiscovered traps.
         *
         * FIXME?  This finds floor traps even when zapping up and
         * ceiling traps even when zapping down.
         */
        if (ttmp) {
            let ttmpname;
            let t_already_seen = (ttmp).tseen;
            let use_the;
            let hallu = C.char(Number((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))) != 0));
/* should probably be changed to use sense_trap(detect.c)
               so that trap can temporarily be forced to be shown and
               map browsing can take place before it reverts to being
               covered by monster or object(s) */
            ((ttmp).tseen = C.uint(1));
            C.newsym(x, y);
            if (Number(!!(Number(!(t_already_seen)) || hallu))) {
                (ttmpname = C.trapname(C.int((ttmp).ttyp), (C.char(0))));
                (use_the = C.char(((Number(!(hallu))) ? (Number(!!(Number(C.int((ttmp).ttyp) == C.VIBRATING_SQUARE) && C.Invocation_lev(C.fieldRef(C.u, "uz"))))) : Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3789, C.literal("zap_map")), C.rn2(4))) : C.rn2(4))))))));
                C.You(C.literal("find %s%c"), ((use_the) ? C.the(ttmpname) : C.an(ttmpname)), ((use_the) ? 33 : 46), "pi");
                (learn_it.value = C.char(Number(!(hallu))));
            }
        }
/* t_at() */
    }
/* probing */
    if (learn_it.value) learnwand(obj);
    return;
}

/*
 *  Called for the following distance effects:
 *      when a weapon is thrown (weapon == THROWN_WEAPON)
 *      when an object is kicked (KICKED_WEAPON)
 *      when an IMMEDIATE wand is zapped (ZAPPED_WAND)
 *      when a light beam is flashed (FLASHED_LIGHT)
 *      when a mirror is applied (INVIS_BEAM)
 *  A thrown/kicked object falls down at end of its range or when a monster
 *  is hit.  The variable 'gb.bhitpos' is set to the final position of the
 *  weapon thrown/zapped.  The ray of a wand may affect (by calling a provided
 *  function) several objects and monsters on its path.  The return value
 *  is the monster hit (weapon != ZAPPED_WAND), or a null monster pointer.
 *
 *  Thrown and kicked objects (THROWN_WEAPON or KICKED_WEAPON) may be
 *  destroyed and *pobj set to NULL to indicate this.
 *
 *  Check !u.uswallow before calling bhit().
 *  This function reveals the absence of a remembered invisible monster in
 *  necessary cases (throwing or kicking weapons).  The presence of a real
 *  one is revealed for a weapon, but if not a weapon is left up to fhitm().
 *
 *  If fhitm returns non-zero value, stops the beam and returns the monster
 */
export function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobj) /* direction and range */
/* defined in hack.h */
/* fns called when mon/obj hit */
/* object tossed/used, set to NULL
                                   * if object is destroyed */
{
    ddx = C.argument(ddx, "int");
    ddy = C.argument(ddy, "int");
    range = C.argument(range, "int");
    weapon = C.argument(weapon, "enum bhit_call_types");
    fhitm = C.argument(fhitm, "int (*)(struct monst *, struct obj *)");
    fhito = C.argument(fhito, "int (*)(struct obj *, struct obj *)");
    pobj = C.argument(pobj, "struct obj **");
    let mtmp;
    let result = 0;
    let obj = C.deref(pobj, "struct obj *");
    let ttmp;
    let typ;
    let shopdoor = (C.char(0));
    let point_blank = (C.char(1));
    let in_skip = (C.char(0));
    let allow_skip = (C.char(0));
    let tethered_weapon = (C.char(0));
    const skiprange_start = C.scalarLocal("int", 0);
    const skiprange_end = C.scalarLocal("int", 0);
    let skipcount = 0;
    let was_returning = (((C.ptrCompare((C.iflags).returning_missile, C.castPointer(obj, "void *"), "=="))) ? obj : 0);
    bhit_done: {
    if (Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))) {
/* object starts one square in front of player */
        (((C.gb).bhitpos).x = C.short(C.int(((C.u).ux + ddx))));
        (((C.gb).bhitpos).y = C.short(C.int(((C.u).uy + ddy))));
        ((range = C.int((range - 1))), C.int((range + 1)));
    }
    else {
        (((C.gb).bhitpos).x = (C.u).ux);
        (((C.gb).bhitpos).y = (C.u).uy);
    }
    if (Number(!!(Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) && obj)) && Number((obj).otyp == C.ROCK)))) {
        skiprange(range, skiprange_start, skiprange_end);
        (allow_skip = C.char(Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3858, C.literal("bhit")), C.rn2(3))) : C.rn2(3)))))));
    }
    if (Number(C.uint(weapon) == C.uint(C.FLASHED_LIGHT))) {
        C.tmp_at(C.DISP_BEAM, C.short(((((Number((C.S_flashbeam) == C.S_stone))) ? C.GLYPH_CMAP_STONE_OFF : (((Number((C.S_flashbeam) <= C.S_trwall))) ? (C.int((C.int(((C.S_flashbeam) - C.S_vwall)) + (((C.In_mines(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_MINES_OFF : ((C.In_hell(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_GEH_OFF : ((((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))))))) ? C.GLYPH_CMAP_KNOX_OFF : (((Number(((C.fieldRef(C.u, "uz"))).dnum == (((C.svd).dungeon_topology).d_sokoban_dnum)))) ? C.GLYPH_CMAP_SOKO_OFF : C.GLYPH_CMAP_MAIN_OFF)))))))) : (((Number((C.S_flashbeam) < C.S_altar))) ? (C.int(((C.int(((C.S_flashbeam) - C.S_ndoor))) + C.GLYPH_CMAP_A_OFF))) : (((Number((C.S_flashbeam) == C.S_altar))) ? ((((Number((C.int(((2) & 16))) == 16))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_other))) : (((Number((C.int(((2) & 7))) == 4))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_lawful))) : (((Number((C.int(((2) & 7))) == 2))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_neutral))) : (((Number((C.int(((2) & 7))) == 1))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_chaotic))) : (C.int((C.GLYPH_ALTAR_OFF + C.altar_unaligned)))))))) : (((Number((C.S_flashbeam) < C.int((C.S_arrow_trap + (C.int((C.TRAPNUM - 1)))))))) ? (C.int(((C.int(((C.S_flashbeam) - C.S_grave))) + C.GLYPH_CMAP_B_OFF))) : (((Number((C.S_flashbeam) <= C.S_goodpos))) ? (C.int(((C.int(((C.S_flashbeam) - C.S_digbeam))) + C.GLYPH_CMAP_C_OFF))) : C.MAX_GLYPH)))))))));
    }
    else if (Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_TETHERED_WEAPON)) && obj))) {
        (tethered_weapon = (C.char(1)));
        (weapon = C.int(C.THROWN_WEAPON));
/* simplify 'if's that follow below */
        C.tmp_at(C.DISP_TETHER, C.short(((((Number(((obj)).otyp == C.STATUE))) ? (((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))))) ? (C.int((((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.NUMMONS))) + ((((Number(!(C.rn2_on_display_rng(2))))) ? C.GLYPH_MON_MALE_OFF : C.GLYPH_MON_FEM_OFF))))) : (C.int((((obj)).corpsenm + ((((Number((C.int((((obj)).spe & 3))) == 1))) ? ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_STATUE_FEM_PILETOP_OFF : C.GLYPH_STATUE_FEM_OFF)) : ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_STATUE_MALE_PILETOP_OFF : C.GLYPH_STATUE_MALE_OFF))))))))) : ((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))))) ? ((((Number((((C.go).otg_temp = (C.int((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.int((C.NUM_OBJECTS - C.FIRST_OBJECT))) + C.FIRST_OBJECT))))) == C.CORPSE))) ? (C.int(((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.NUMMONS)) + C.GLYPH_BODY_OFF))) : (C.int(((C.go).otg_temp + C.GLYPH_OBJ_OFF))))) : (((Number(((obj)).otyp == C.CORPSE))) ? ((C.int((((obj)).corpsenm + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_BODY_PILETOP_OFF : C.GLYPH_BODY_OFF)))))) : (((Number(!!(Number(!(((obj)).dknown)) && (Number(!!(Number(!!(Number(((obj)).oclass == C.POTION_CLASS) || (Number(!!(Number(((obj)).otyp >= C.FIRST_REAL_GEM) && (Number(((obj)).otyp <= C.LAST_GLASS_GEM))))))) || (Number(!!(Number(((obj)).otyp >= C.FIRST_SPELL) && (Number(((obj)).otyp <= C.LAST_SPELL)))))))))))) ? ((C.int((((obj)).oclass + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_OBJ_PILETOP_OFF : C.GLYPH_OBJ_OFF)))))) : ((C.int((((obj)).otyp + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_OBJ_PILETOP_OFF : C.GLYPH_OBJ_OFF)))))))))))));
    }
    else if (Number(!!(Number(C.uint(weapon) != C.uint(C.ZAPPED_WAND)) && Number(C.uint(weapon) != C.uint(C.INVIS_BEAM))))) C.tmp_at(C.DISP_FLASH, C.short(((((Number(((obj)).otyp == C.STATUE))) ? (((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))))) ? (C.int((((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.NUMMONS))) + ((((Number(!(C.rn2_on_display_rng(2))))) ? C.GLYPH_MON_MALE_OFF : C.GLYPH_MON_FEM_OFF))))) : (C.int((((obj)).corpsenm + ((((Number((C.int((((obj)).spe & 3))) == 1))) ? ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_STATUE_FEM_PILETOP_OFF : C.GLYPH_STATUE_FEM_OFF)) : ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_STATUE_MALE_PILETOP_OFF : C.GLYPH_STATUE_MALE_OFF))))))))) : ((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))))) ? ((((Number((((C.go).otg_temp = (C.int((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.int((C.NUM_OBJECTS - C.FIRST_OBJECT))) + C.FIRST_OBJECT))))) == C.CORPSE))) ? (C.int(((C.callIndirect((C.deref(C.callback("rn2_on_display_rng", C.rn2_on_display_rng), "int (int)")), "int (*)(int)", C.NUMMONS)) + C.GLYPH_BODY_OFF))) : (C.int(((C.go).otg_temp + C.GLYPH_OBJ_OFF))))) : (((Number(((obj)).otyp == C.CORPSE))) ? ((C.int((((obj)).corpsenm + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_BODY_PILETOP_OFF : C.GLYPH_BODY_OFF)))))) : (((Number(!!(Number(!(((obj)).dknown)) && (Number(!!(Number(!!(Number(((obj)).oclass == C.POTION_CLASS) || (Number(!!(Number(((obj)).otyp >= C.FIRST_REAL_GEM) && (Number(((obj)).otyp <= C.LAST_GLASS_GEM))))))) || (Number(!!(Number(((obj)).otyp >= C.FIRST_SPELL) && (Number(((obj)).otyp <= C.LAST_SPELL)))))))))))) ? ((C.int((((obj)).oclass + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_OBJ_PILETOP_OFF : C.GLYPH_OBJ_OFF)))))) : ((C.int((((obj)).otyp + ((((Number(!!(Number(!!(Number(((obj)).where == 1) && (C.ptrCompare((((C.go).otg_otmp = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, ((obj)).ox, "struct obj *[21]"), "struct obj *[21]"), ((obj)).oy, "struct obj *"), "struct obj *")).v).v_nexthere)), 0, "!=")))) && (Number(!!(Number(((obj)).otyp != C.BOULDER) || Number(((C.go).otg_otmp).otyp == C.BOULDER)))))))) ? C.GLYPH_OBJ_PILETOP_OFF : C.GLYPH_OBJ_OFF)))))))))))));
    while (Number(((range = C.int((range - 1))), C.int((range + 1))) > 0)) {
        let x;
        let y;
        let xyglyph;
        (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x + ddx)));
        (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y + ddy)));
        (x = ((C.gb).bhitpos).x);
        (y = ((C.gb).bhitpos).y);
        if (Number(!(C.isok(x, y)))) {
            (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x - ddx)));
            (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y - ddy)));
            break;
        }
        if (Number(!!(Number(!!((Number(!!((Number(!!(Number((obj).oclass == C.WEAPON_CLASS) || Number((obj).oclass == C.TOOL_CLASS)))) && Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_subtyp == C.P_PICK_AXE)))) && C.inside_shop(x, y))) && C.ptrCompare(((mtmp = C.shkcatch(obj, x, y))), 0, "!=")))) {
            C.tmp_at(C.DISP_END, C.short(0));
            (result = mtmp);
            break bhit_done;
        }
        (typ = C.uchar((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ));
/* WATER aka "wall of water" stops items */
        if (Number(!!((Number((typ) == C.WATER)) || Number(typ == C.LAVAWALL)))) {
            if (Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) || Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))))) break;
        }
/* iron bars will block anything big enough and break some things */
        if (Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) || Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))))) {
            if (Number(!!(C.int((obj).lamplit) && Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))))) C.show_transient_light(obj, x, y);
            if (Number(!!(Number(typ == C.IRONBARS) && C.hits_bars(pobj, C.short(C.int((x - ddx))), C.short(C.int((y - ddy))), x, y, ((point_blank) ? 0 : Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3906, C.literal("bhit")), C.rn2(5))) : C.rn2(5)))))), 1)))) {
/* caveat: obj might now be null... */
                (obj = C.deref(pobj, "struct obj *"));
/* not currently needed due to 'break'; keep */
                ((obj));
/* in case usage gets added after the loop   */
                (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x - ddx)));
                (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y - ddy)));
                break;
            }
        }
        else if (Number(C.uint(weapon) == C.uint(C.FLASHED_LIGHT))) {
            if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.show_transient_light(0, x, y);
        }
        if (Number(C.uint(weapon) == C.uint(C.ZAPPED_WAND))) {
/* cancellation/opening/locking/striking/probing */
            C.callLocal(zap_map, x, y, obj);
/* terrain might have changed (exposed secret door|corridor) */
            (typ = C.uchar((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ));
        }
        (mtmp = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x, "struct monst *[21]"), "struct monst *[21]"), y, "struct monst *"), "struct monst *")));
        (ttmp = C.t_at(x, y));
        if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(mtmp)) && ttmp)) && (Number(C.int((ttmp).ttyp) == C.WEB)))) && (Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) || Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))))))) && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 3930, C.literal("bhit")), C.rn2(3))) : C.rn2(3)))))))) {
            if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) {
                C.pline(C.literal("%s gets stuck in a web!"), C.Yname2(obj), "p");
                ((ttmp).tseen = C.uint((C.char(1))));
                C.newsym(x, y);
            }
            if (was_returning) ((C.iflags).returning_missile = 0);
            break;
        }
/*
         * skipping rocks
         *
         * skiprange_start is only set if this is a thrown rock
         */
        if (Number(!!(Number(!!(skiprange_start.value && (Number(range == skiprange_start.value)))) && allow_skip))) {
            if (Number(!!(C.is_pool(x, y) && Number(!(mtmp))))) {
                (in_skip = (C.char(1)));
                if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) C.pline(C.literal("%s %s%s."), C.Yname2(obj), C.otense(obj, C.literal("skip")), ((skipcount) ? C.literal(" again") : C.literal("")), "ppp");
                else C.You_hear(C.literal("%s skip."), C.yname(obj), "p");
                ((skipcount = C.int((skipcount + 1))), C.int((skipcount - 1)));
            }
            else if (Number(skiprange_start.value > C.int((skiprange_end.value + 1)))) {
                (skiprange_start.value = C.int((skiprange_start.value - 1)));
            }
        }
        if (in_skip) {
            if (Number(range <= skiprange_end.value)) {
                (in_skip = (C.char(0)));
                if (Number(range > 3)) /* another bounce? */
                skiprange(range, skiprange_start, skiprange_end);
            }
            else if (Number(!!(mtmp && (Number(!!(Number((((mtmp).data)).mlet == C.S_EEL) || (Number(!!(Number(!!((Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(2n)))) != C.ulong(0n))) || (Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(512n)))) != C.ulong(0n))))) || (Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(1024n)))) != C.ulong(0n)))))))))))) {
                if (Number(!!(Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))) && (Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))))) C.pline(C.literal("%s %s over %s."), C.Yname2(obj), C.otense(obj, C.literal("pass")), C.mon_nam(mtmp), "ppp");
                (mtmp = 0);
            }
        }
/* if mtmp is a shade and missile passes harmlessly through it,
           give message and skip it in order to keep going;
           if attack is light and mtmp is a mimic pretending to be an
           object, behave as if there is no monster here (if pretending
           to be furniture, it will be revealed by flash_hits_mon());
           thrown objects don't hit mimics pretending to be objects (both
           because the hero is likely aiming to throw over what seems to
           be an object rather than at it, and for balance because
           otherwise mimics are too easy to identify by throwing gold at
           them); exception: if the hero knows there is a monster there,
           they will be aiming at the monster */
        (xyglyph = C.glyph_at(x, y));
        if (Number(!!(mtmp && (Number(!!((Number(!!((Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) || Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))))) && (Number(!!(C.shade_miss(C.fieldRef(C.gy, "youmonst"), mtmp, obj, (C.char(1)), (C.char(1))) || (Number(!!(Number(!!(Number(!!(Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT) && Number(!((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((xyglyph) >= C.GLYPH_MON_MALE_OFF) && Number((xyglyph) < (C.int((C.GLYPH_MON_MALE_OFF + C.NUMMONS))))))) || (Number(!!(Number((xyglyph) >= C.GLYPH_MON_FEM_OFF) && Number((xyglyph) < (C.int((C.GLYPH_MON_FEM_OFF + C.NUMMONS)))))))))) || (Number(!!((Number(!!(Number((xyglyph) >= C.GLYPH_PET_MALE_OFF) && Number((xyglyph) < (C.int((C.GLYPH_PET_MALE_OFF + C.NUMMONS))))))) || (Number(!!(Number((xyglyph) >= C.GLYPH_PET_FEM_OFF) && Number((xyglyph) < (C.int((C.GLYPH_PET_FEM_OFF + C.NUMMONS)))))))))))) || (Number(!!((Number(!!(Number((xyglyph) >= C.GLYPH_RIDDEN_MALE_OFF) && Number((xyglyph) < (C.int((C.GLYPH_RIDDEN_MALE_OFF + C.NUMMONS))))))) || (Number(!!(Number((xyglyph) >= C.GLYPH_RIDDEN_FEM_OFF) && Number((xyglyph) < (C.int((C.GLYPH_RIDDEN_FEM_OFF + C.NUMMONS)))))))))))) || (Number(!!((Number(!!(Number((xyglyph) >= C.GLYPH_DETECT_MALE_OFF) && Number((xyglyph) < (C.int((C.GLYPH_DETECT_MALE_OFF + C.NUMMONS))))))) || (Number(!!(Number((xyglyph) >= C.GLYPH_DETECT_FEM_OFF) && Number((xyglyph) < (C.int((C.GLYPH_DETECT_FEM_OFF + C.NUMMONS))))))))))))))))) && Number(!((Number(!!(Number((xyglyph) >= C.GLYPH_WARNING_OFF) && Number((xyglyph) < (C.int((C.GLYPH_WARNING_OFF + 6))))))))))) && Number(!((Number((xyglyph) == C.GLYPH_INVIS_OFF))))))))))))) || (Number(!!(Number(C.uint(weapon) == C.uint(C.FLASHED_LIGHT)) && Number((C.int((((mtmp)).m_ap_type & 7))) == C.M_AP_OBJECT)))))))))) (mtmp = 0);
        if (mtmp) {
            ((C.gn).notonhead = C.char((Number(!!(Number(x != (mtmp).mx) || Number(y != (mtmp).my))))));
            if (Number(C.uint(weapon) == C.uint(C.FLASHED_LIGHT))) {
/* FLASHED_LIGHT hitting invisible monster should pass
                   through instead of stop so we call flash_hits_mon()
                   directly rather than returning mtmp back to caller.
                   That allows the flash to keep on going.  Note that we
                   use mtmp->minvis, not canspotmon(), because it makes no
                   difference whether hero can see the monster or not. */
                if ((mtmp).minvis) {
                    (((obj).ox = (C.u).ux), ((obj).oy = (C.u).uy));
                    C.flash_hits_mon(mtmp, obj);
                }
                else {
                    C.tmp_at(C.DISP_END, C.short(0));
                    (result = mtmp);
/* caller will call flash_hits_mon() */
                    break bhit_done;
                }
            }
            else if (Number(C.uint(weapon) == C.uint(C.INVIS_BEAM))) {
/* Like FLASHED_LIGHT, INVIS_BEAM should continue
                   through invisible targets; unlike it, we aren't
                   prepared for multiple hits so just get first one
                   that's either visible or could see its invisible
                   self.  [No tmp_at() cleanup is needed here.] */
                if (Number(!!(Number(!((mtmp).minvis)) || (Number((C.ulong(((((mtmp).data)).mflags1 & C.ulong(16777216n)))) != C.ulong(0n)))))) {
                    (result = mtmp);
                    break bhit_done;
                }
            }
            else if (Number(C.uint(weapon) != C.uint(C.ZAPPED_WAND))) {
/* THROWN_WEAPON, KICKED_WEAPON */
                if (Number(!(tethered_weapon))) C.tmp_at(C.DISP_END, C.short(0));
                if (Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0)) && Number(!((Number(!!(C.canseemon(mtmp) || C.sensemon(mtmp))))))))) C.map_invisible(x, y);
                (result = mtmp);
                break bhit_done;
            }
            else {
/* ZAPPED_WAND */
                if (C.callIndirect((C.deref(fhitm, "int (struct monst *, struct obj *)")), "int (*)(struct monst *, struct obj *)", mtmp, obj)) {
                    (result = mtmp);
                    break bhit_done;
                }
                (range = C.int((range - 3)));
            }
        }
        else {
            if (Number(!!(Number(!!(Number(C.uint(weapon) == C.uint(C.ZAPPED_WAND)) && Number((obj).otyp == C.WAN_PROBING))) && (Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).glyph) == C.GLYPH_INVIS_OFF))))) {
                C.unmap_object(x, y);
                C.newsym(x, y);
            }
        }
        if (fhito) {
            if (bhitpile(obj, fhito, x, y, C.char(0))) ((range = C.int((range - 1))), C.int((range + 1)));
        }
        else {
            if (Number(!!(Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON)) && (Number(!!((Number(!!(Number((obj).oclass == C.COIN_CLASS) && (C.ptrCompare(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *"), 0, "!="))))) || C.ship_object(obj, x, y, C.costly_spot(x, y)))))))) {
                C.tmp_at(C.DISP_END, C.short(0));
                break bhit_done;
/* result == (struct monst *) 0 */
            }
        }
        if (Number(!!(Number(C.uint(weapon) == C.uint(C.ZAPPED_WAND)) && (Number(!!((Number((typ) == C.DOOR)) || Number(typ == C.SDOOR))))))) {
            switch ((obj).otyp) {
                case (C.WAN_OPENING):
                    case (C.WAN_LOCKING):
                        case (C.WAN_STRIKING):
                            case (C.SPE_KNOCK):
                                case (C.SPE_WIZARD_LOCK):
                                    case (C.SPE_FORCE_BOLT):
                                        if (C.doorlock(obj, x, y)) {
                                            if (Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0)) || (Number(!!(Number((obj).otyp == C.WAN_STRIKING) && Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf))))))))))) learnwand(obj);
                                            if (Number(!!(Number(C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).doormask) == C.D_BROKEN) && C.deref(C.in_rooms(x, y, C.SHOPBASE), "char")))) {
                                                (shopdoor = (C.char(1)));
                                                C.add_damage(x, y, C.SHOP_DOOR_COST);
                                            }
                                        }
                break;
            }
        }
        if (Number(!!(Number(!((Number((typ) >= C.POOL)))) || C.closed_door(x, y)))) {
            (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x - ddx)));
            (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y - ddy)));
            break;
        }
        if (Number(!!(Number(C.uint(weapon) != C.uint(C.ZAPPED_WAND)) && Number(C.uint(weapon) != C.uint(C.INVIS_BEAM))))) {
/* 'I' present but no monster: erase; do this before tmp_at() */
            if (Number(!!((Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).glyph) == C.GLYPH_INVIS_OFF)) && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))))) {
                C.unmap_object(x, y);
                C.newsym(x, y);
            }
            C.tmp_at(x, y);
            C.callIndirect((C.deref((C.windowprocs).win_delay_output, "void (void)")), "void (*)(void)");
/* kicked objects fall in pools */
            if (Number(!!((Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))) && C.is_pool_or_lava(x, y)))) break;
            if (Number(!!((Number((typ) == C.SINK)) && Number(C.uint(weapon) != C.uint(C.FLASHED_LIGHT))))) break;
/* physical objects fall onto sink */
        }
/* limit range of ball so hero won't make an invalid move */
        if (Number(!!(Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) && Number(range > 0))) && Number((obj).otyp == C.HEAVY_IRON_BALL)))) {
            let bobj;
            let t;
            if (C.ptrCompare(((bobj = C.sobj_at(C.BOULDER, x, y))), 0, "!=")) {
                if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) C.pline(C.literal("%s hits %s."), C.The(C.distant_name(obj, C.callback("xname", C.xname))), C.an(C.xname(bobj)), "pp");
                (range = 0);
            }
            else if (C.ptrCompare(obj, C.uball, "==")) {
                if (Number(!(C.test_move(C.short(C.int((x - ddx))), C.short(C.int((y - ddy))), C.short(ddx), C.short(ddy), C.TEST_MOVE)))) {
/* nb: it didn't hit anything directly */
                    if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) C.pline(C.literal("%s jerks to an abrupt halt."), C.The(C.distant_name(obj, C.callback("xname", C.xname))), "p");
/* lame */
                    (range = 0);
                }
                else if (Number(!!(Number(!!(C.int((((C.svl).level).flags).sokoban_rules) && C.ptrCompare(((t = C.t_at(x, y))), 0, "!="))) && (Number(!!((Number(!!(Number(C.int(((t).ttyp)) == C.PIT) || Number(C.int(((t).ttyp)) == C.SPIKED_PIT)))) || (Number(!!(Number(C.int(((t).ttyp)) == C.HOLE) || Number(C.int(((t).ttyp)) == C.TRAPDOOR)))))))))) {
/* hero falls into the trap, so ball stops */
                    (range = 0);
                }
            }
        }
/* thrown/kicked missile has moved away from its starting spot */
        (point_blank = (C.char(0)));
/* affects passing through iron bars */
    }
    if (Number(!!((Number(!!(Number(!!(Number(C.uint(weapon) != C.uint(C.ZAPPED_WAND)) && Number(C.uint(weapon) != C.uint(C.INVIS_BEAM)))) && Number(!(tethered_weapon))))) || (Number(!!(was_returning && C.ptrCompare(was_returning, C.castPointer((C.iflags).returning_missile, "struct obj *"), "!="))))))) C.tmp_at(C.DISP_END, C.short(0));
    if (shopdoor) C.pay_for_damage(C.literal("destroy"), (C.char(0)));
    } // bhit_done
/* note: for FLASHED_LIGHT, _caller_ must call transient_light_cleanup()
       after possibly calling flash_hits_mon() */
    if (Number(!!(Number(C.uint(weapon) == C.uint(C.THROWN_WEAPON)) || Number(C.uint(weapon) == C.uint(C.KICKED_WEAPON))))) C.transient_light_cleanup();
    return result;
}

/* process thrown boomerang, which travels a curving path...
 * A multi-shot volley ought to have all missiles in flight at once,
 * but we're called separately for each one.  We terminate the volley
 * early on a failed catch since continuing to throw after being hit
 * is too obviously silly.
 */
export function boomhit(obj, dx, dy) {
    obj = C.scalarLocal("struct obj *", C.argument(obj, "struct obj *"));
    dx = C.argument(dx, "int");
    dy = C.argument(dy, "int");
    let i;
    let ct;
    let boom;
/* showsym[] index  */
    let mtmp;
    let counterclockwise = C.char((Number(C.int((C.u).uhandedness) == 0)));
/* ULEFTY => clockwise */
    let nhits = (((Number((1) > (C.int(((obj.value).spe + 1))))) ? (1) : (C.int(((obj.value).spe + 1)))));
/* counterclockwise traversal patterns, from @ to 1 then on through to 9
     *  ..........................54.................................
     *  ..................43.....6..3....765.........................
     *  ..........32.....5..2...7...2...8...4....87..................
     *  .........4..1....6..1...8..1....9...3...9..6.....98..........
     *  ..21@....5...@...7..@....9@......@12....@...5...@..7.....@9..
     *  .3...9....6..9....89.....................1..4...1..6....1..8.
     *  .4...8.....78.............................23....2..5...2...7.
     *  ..567............................................34....3..6..
     *  ........................................................45...
     * (invert rows for corresponding clockwise patterns)
     */
    (((C.gb).bhitpos).x = (C.u).ux);
    (((C.gb).bhitpos).y = (C.u).uy);
    (boom = ((counterclockwise) ? C.S_boomleft : C.S_boomright));
    (i = C.xytodir(dx, dy));
    C.tmp_at(C.DISP_FLASH, C.short(((((Number((boom) == C.S_stone))) ? C.GLYPH_CMAP_STONE_OFF : (((Number((boom) <= C.S_trwall))) ? (C.int((C.int(((boom) - C.S_vwall)) + (((C.In_mines(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_MINES_OFF : ((C.In_hell(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_GEH_OFF : ((((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))))))) ? C.GLYPH_CMAP_KNOX_OFF : (((Number(((C.fieldRef(C.u, "uz"))).dnum == (((C.svd).dungeon_topology).d_sokoban_dnum)))) ? C.GLYPH_CMAP_SOKO_OFF : C.GLYPH_CMAP_MAIN_OFF)))))))) : (((Number((boom) < C.S_altar))) ? (C.int(((C.int(((boom) - C.S_ndoor))) + C.GLYPH_CMAP_A_OFF))) : (((Number((boom) == C.S_altar))) ? ((((Number((C.int(((2) & 16))) == 16))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_other))) : (((Number((C.int(((2) & 7))) == 4))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_lawful))) : (((Number((C.int(((2) & 7))) == 2))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_neutral))) : (((Number((C.int(((2) & 7))) == 1))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_chaotic))) : (C.int((C.GLYPH_ALTAR_OFF + C.altar_unaligned)))))))) : (((Number((boom) < C.int((C.S_arrow_trap + (C.int((C.TRAPNUM - 1)))))))) ? (C.int(((C.int(((boom) - C.S_grave))) + C.GLYPH_CMAP_B_OFF))) : (((Number((boom) <= C.S_goodpos))) ? (C.int(((C.int(((boom) - C.S_digbeam))) + C.GLYPH_CMAP_C_OFF))) : C.MAX_GLYPH)))))))));
    for ((ct = 0); Number(ct < 10); ((ct = C.int((ct + 1))), C.int((ct - 1)))) {
        (i = (C.int(((C.int(((i) + (C.int((C.N_DIRS_Z - 2)))))) % (C.int((C.N_DIRS_Z - 2)))))));
        (boom = (C.int((C.int((C.S_boomleft + C.S_boomright)) - boom))));
/* toggle */
        C.tmp_at(C.DISP_CHANGE, C.short(((((Number((boom) == C.S_stone))) ? C.GLYPH_CMAP_STONE_OFF : (((Number((boom) <= C.S_trwall))) ? (C.int((C.int(((boom) - C.S_vwall)) + (((C.In_mines(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_MINES_OFF : ((C.In_hell(C.fieldRef(C.u, "uz"))) ? C.GLYPH_CMAP_GEH_OFF : ((((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_knox_level"))))))) ? C.GLYPH_CMAP_KNOX_OFF : (((Number(((C.fieldRef(C.u, "uz"))).dnum == (((C.svd).dungeon_topology).d_sokoban_dnum)))) ? C.GLYPH_CMAP_SOKO_OFF : C.GLYPH_CMAP_MAIN_OFF)))))))) : (((Number((boom) < C.S_altar))) ? (C.int(((C.int(((boom) - C.S_ndoor))) + C.GLYPH_CMAP_A_OFF))) : (((Number((boom) == C.S_altar))) ? ((((Number((C.int(((2) & 16))) == 16))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_other))) : (((Number((C.int(((2) & 7))) == 4))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_lawful))) : (((Number((C.int(((2) & 7))) == 2))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_neutral))) : (((Number((C.int(((2) & 7))) == 1))) ? (C.int((C.GLYPH_ALTAR_OFF + C.altar_chaotic))) : (C.int((C.GLYPH_ALTAR_OFF + C.altar_unaligned)))))))) : (((Number((boom) < C.int((C.S_arrow_trap + (C.int((C.TRAPNUM - 1)))))))) ? (C.int(((C.int(((boom) - C.S_grave))) + C.GLYPH_CMAP_B_OFF))) : (((Number((boom) <= C.S_goodpos))) ? (C.int(((C.int(((boom) - C.S_digbeam))) + C.GLYPH_CMAP_C_OFF))) : C.MAX_GLYPH)))))))));
/* change glyph */
        (dx = C.deref(C.ptrAdd(C.xdir, i, "const schar"), "const schar"));
        (dy = C.deref(C.ptrAdd(C.ydir, i, "const schar"), "const schar"));
        (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x + dx)));
        (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y + dy)));
        if (Number(!(C.isok(((C.gb).bhitpos).x, ((C.gb).bhitpos).y)))) {
            (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x - dx)));
            (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y - dy)));
            break;
        }
        if (C.ptrCompare(((mtmp = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, ((C.gb).bhitpos).x, "struct monst *[21]"), "struct monst *[21]"), ((C.gb).bhitpos).y, "struct monst *"), "struct monst *")))), 0, "!=")) {
            C.m_respond(mtmp);
            if (Number(((nhits = C.int((nhits - 1))), C.int((nhits + 1))) < 0)) {
                C.tmp_at(C.DISP_END, C.short(0));
                return mtmp;
            }
            else if (Number(!!(C.throwit_mon_hit(obj.value, mtmp) || Number(!((C.gt).thrownobj))))) {
                break;
            }
        }
        if (Number(!!(Number(!((Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, ((C.gb).bhitpos).x, "struct rm[21]"), "struct rm[21]"), ((C.gb).bhitpos).y, "struct rm"), "struct rm")).typ) >= C.POOL)))) || C.closed_door(((C.gb).bhitpos).x, ((C.gb).bhitpos).y)))) {
            (((C.gb).bhitpos).x = C.short((((C.gb).bhitpos).x - dx)));
            (((C.gb).bhitpos).y = C.short((((C.gb).bhitpos).y - dy)));
            break;
        }
        if ((Number(!!(Number((((C.gb).bhitpos).x) == (C.u).ux) && Number((((C.gb).bhitpos).y) == (C.u).uy))))) {
/* ct == 9 */
            if (Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.FUMBLING, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.FUMBLING, "struct prop"), "struct prop")).extrinsic))) || Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4203, C.literal("boomhit")), C.rn2(20))) : C.rn2(20))) >= (C.acurr(C.A_DEX)))))) {
                let dam = C.dmgval(obj.value, C.fieldRef(C.gy, "youmonst"));
/* we hit ourselves */
                C.thitu(C.int((10 + (obj.value).spe)), (((((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_PHDAM, "struct prop"), "struct prop")).extrinsic))))) ? (C.int(Math.trunc((C.int(((dam) + 1))) / 2))) : (dam))), obj, C.literal("boomerang"));
                C.endmultishot((C.char(1)));
                break;
            }
            else {
/* we catch it */
                C.tmp_at(C.DISP_END, C.short(0));
                C.You(C.literal("skillfully catch the boomerang."), "");
                return C.fieldRef(C.gy, "youmonst");
            }
        }
        C.tmp_at(((C.gb).bhitpos).x, ((C.gb).bhitpos).y);
        C.callIndirect((C.deref((C.windowprocs).win_delay_output, "void (void)")), "void (*)(void)");
        if ((Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, ((C.gb).bhitpos).x, "struct rm[21]"), "struct rm[21]"), ((C.gb).bhitpos).y, "struct rm"), "struct rm")).typ) == C.SINK))) {
            ;
            if (Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf)))))) C.pline(C.literal("Klonk!"), "");
            C.wake_nearto(((C.gb).bhitpos).x, ((C.gb).bhitpos).y, 20);
            break;
/* boomerang falls on sink */
        }
/* ct==0, initial position, we want next delta to be same;
           ct==5, opposite position, repeat delta undoes first one */
        if (Number(C.int((ct % 5)) != 0)) (i = ((counterclockwise) ? (C.int(((C.int(((i) + 7))) % (C.int((C.N_DIRS_Z - 2)))))) : (C.int(((C.int(((i) + 1))) % (C.int((C.N_DIRS_Z - 2))))))));
    }
    C.tmp_at(C.DISP_END, C.short(0));
/* do not leave last symbol */
    return 0;
}

/* used by buzz(); also used by munslime(muse.c); returns damage applied
   to mon; note: caller is responsible for killing mon if damage is fatal */
export function zhitm(mon, type, nd, ootmp) /* monster being hit */
/* zap or breath type */
/* number of hit dice to use */
/* to return worn armor for caller to disintegrate */
{
    mon = C.argument(mon, "struct monst *");
    type = C.argument(type, "int");
    nd = C.argument(nd, "int");
    ootmp = C.argument(ootmp, "struct obj **");
    let tmp = 0;
    let orig_dmg = 0;
/* damage amount */
    let damgtype = C.int((zaptype(type) % 10));
    let sho_shieldeff = (C.char(0));
    let spellcaster = C.char((Number(!!(Number((type) >= 10) && Number((type) < 20)))));
/* maybe get a bonus! */
    C.store(ootmp, "struct obj *", 0);
    switch (damgtype) {
        case C.ZT_MAGIC_MISSILE:
            if (Number(!!(C.resists_magm(mon) || C.defended(mon, C.AD_MAGM)))) {
                (sho_shieldeff = (C.char(1)));
                break;
            }
        (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4256, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if (spellcaster) (tmp = spell_damage_bonus(tmp));
        break;
        case C.ZT_FIRE:
            if (Number(!!(C.Resists_Elem(mon, C.FIRE_RES) || C.defended(mon, C.AD_FIRE)))) {
                (sho_shieldeff = (C.char(1)));
                break;
            }
        (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4265, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if (spellcaster) (tmp = spell_damage_bonus(tmp));
        (orig_dmg = tmp);
/* includes spell bonus but not monster vuln to fire */
        if (C.Resists_Elem(mon, C.COLD_RES)) (tmp = C.int((tmp + 7)));
        if (C.burnarmor(mon)) {
            if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4272, C.literal("zhitm")), C.rn2(3))) : C.rn2(3)))))) {
                (tmp = C.int((tmp + C.callLocal(destroy_items, mon, C.AD_FIRE, orig_dmg))));
                C.ignite_items((mon).minvent);
            }
        }
        break;
        case C.ZT_COLD:
            if (Number(!!(C.Resists_Elem(mon, C.COLD_RES) || C.defended(mon, C.AD_COLD)))) {
                (sho_shieldeff = (C.char(1)));
                break;
            }
        (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4283, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if (spellcaster) (tmp = spell_damage_bonus(tmp));
        (orig_dmg = tmp);
/* includes spell bonus but not monster vuln to cold */
        if (C.Resists_Elem(mon, C.FIRE_RES)) (tmp = C.int((tmp + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4288, C.literal("zhitm")), C.d((nd), (3)))) : C.d((nd), (3)))))));
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4289, C.literal("zhitm")), C.rn2(3))) : C.rn2(3)))))) (tmp = C.int((tmp + C.callLocal(destroy_items, mon, C.AD_COLD, orig_dmg))));
        break;
        case C.ZT_SLEEP:
/* resistance and shield effect and revealing concealed mimic are
           handled by sleep_monst() */
            (tmp = 0);
        C.sleep_monst(mon, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4296, C.literal("zhitm")), C.d((nd), (25)))) : C.d((nd), (25)))), ((Number(type == ((C.int((4 - 1)))))) ? C.WAND_CLASS : 0));
        break;
        case C.ZT_DEATH:
/* death/disintegration */
            if (Number(C.abs(type) != (C.int((20 + ((C.int((5 - 1))))))))) {
/* death */
                if (C.ptrCompare((mon).data, C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==")) {
                    C.healmon(mon, C.int(Math.trunc(C.int(Math.imul((mon).mhpmax, 3)) / 2)), C.int(Math.trunc((mon).mhpmax / 2)));
                    if (Number((mon).mhpmax >= C.MAGIC_COOKIE)) ((mon).mhpmax = C.int((C.MAGIC_COOKIE - 1)));
                    (tmp = 0);
                    break;
                }
                if (Number(!!(Number(!!(Number(!!((Number(!!(Number(!!((Number((C.ulong(((((mon).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_MANES, "struct permonst"), "=="))) || (Number(!!((Number((((mon).data)).mlet == C.S_GOLEM)) || Number((((mon).data)).mlet == C.S_VORTEX))))))) || (Number((C.ulong(((((mon).data)).mflags2 & C.ulong(256n)))) != C.ulong(0n))))) || (Number(!!(Number(!!(Number(((mon)).cham == C.PM_VAMPIRE) || Number(((mon)).cham == C.PM_VAMPIRE_LEADER))) || Number(((mon)).cham == C.PM_VLAD_THE_IMPALER)))))) || C.resists_magm(mon)))) {
/* similar to player */
                    (sho_shieldeff = (C.char(1)));
                    break;
                }
                (type = C.int((-1)));
/* so they don't get saving throws */
            }
            else {
                let otmp2;
                if (Number(!!(C.Resists_Elem(mon, C.DISINT_RES) || C.defended(mon, C.AD_DISN)))) {
                    (sho_shieldeff = (C.char(1)));
                }
                else if (C.long(((mon).misc_worn_check & C.W_ARMS))) {
/* destroy shield; victim survives */
                    C.store(ootmp, "struct obj *", C.which_armor(mon, C.W_ARMS));
                }
                else if (C.long(((mon).misc_worn_check & C.W_ARM))) {
/* destroy suit, also cloak if present */
                    C.store(ootmp, "struct obj *", C.which_armor(mon, C.W_ARM));
                    if (C.ptrCompare(((otmp2 = C.which_armor(mon, C.W_ARMC))), 0, "!=")) C.m_useup(mon, otmp2);
                }
                else {
/* no suit, victim dies; destroy cloak
                   and shirt now in case target gets life-saved */
                    (tmp = C.MAGIC_COOKIE);
                    if (C.ptrCompare(((otmp2 = C.which_armor(mon, C.W_ARMC))), 0, "!=")) C.m_useup(mon, otmp2);
                    if (C.ptrCompare(((otmp2 = C.which_armor(mon, C.W_ARMU))), 0, "!=")) C.m_useup(mon, otmp2);
                }
                (type = C.int((-1)));
/* no saving throw wanted */
                break;
/* not ordinary damage */
            }
        (tmp = C.int(((mon).mhp + 1)));
        break;
        case C.ZT_LIGHTNING:
            (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4343, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if (spellcaster) (tmp = spell_damage_bonus(tmp));
        (orig_dmg = tmp);
        if (Number(!!(C.Resists_Elem(mon, C.SHOCK_RES) || C.defended(mon, C.AD_ELEC)))) {
            (sho_shieldeff = (C.char(1)));
            (tmp = 0);
/* can still blind the monster */
        }
        if (Number(!!(Number(!!(Number(!(C.resists_blnd(mon))) && Number(!((Number(!!(Number(type > 0) && (Number(!!(C.int((C.u).uswallow) && (C.ptrCompare((C.u).ustuck, (mon), "==")))))))))))) && Number(nd > 2)))) {
/* sufficiently powerful lightning blinds monsters */
            let rnd_tmp = C.uint((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4356, C.literal("zhitm")), C.rnd(50))) : C.rnd(50))));
            ((mon).mcansee = C.uint(0));
            if (Number((C.uint((C.uint((mon).mblinded) + rnd_tmp))) > C.uint(127))) ((mon).mblinded = C.uint(127));
            else ((mon).mblinded = C.uint(((mon).mblinded + rnd_tmp)));
        }
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4363, C.literal("zhitm")), C.rn2(3))) : C.rn2(3)))))) (tmp = C.int((tmp + C.callLocal(destroy_items, mon, C.AD_ELEC, orig_dmg))));
        break;
        case C.ZT_POISON_GAS:
            if (Number(!!(C.Resists_Elem(mon, C.POISON_RES) || C.defended(mon, C.AD_DRST)))) {
                (sho_shieldeff = (C.char(1)));
                break;
            }
        (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4371, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        break;
        case C.ZT_ACID:
            if (Number(!!(C.Resists_Elem(mon, C.ACID_RES) || C.defended(mon, C.AD_ACID)))) {
                (sho_shieldeff = (C.char(1)));
                break;
            }
        (tmp = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4378, C.literal("zhitm")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4379, C.literal("zhitm")), C.rn2(6))) : C.rn2(6)))))) C.acid_damage((((mon)).mw));
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4381, C.literal("zhitm")), C.rn2(6))) : C.rn2(6)))))) C.erode_armor(mon, C.ERODE_CORRODE);
        break;
    }
    if (sho_shieldeff) C.shieldeff((mon).mx, (mon).my);
    if (Number(!!((Number(!!(Number((type) >= 10) && Number((type) < 20)))) && (Number(!!((Number(((C.gu).urole).mnum == (C.PM_KNIGHT))) && C.int(((C.u).uhave).questart))))))) (tmp = C.int(Math.imul(tmp, 2)));
    if (Number(!!(Number(!!(Number(tmp > 0) && Number(type >= 0))) && C.callLocal(resist, mon, C.char(((Number(type < (C.int((10 + (0)))))) ? C.WAND_CLASS : 0)), 0, C.NOTELL)))) (tmp = C.int(Math.trunc(tmp / 2)));
    if (Number(tmp < 0)) (tmp = 0);
/* don't allow negative damage */
    do {
        if (C.debugcore(C.literal("zap.c"), (C.char(1)))) {
            let save_plnmsg = (C.iflags).last_msg;
            C.pline(C.literal("zapped monster hp = %d (= %d - %d)"), C.int(((mon).mhp - tmp)), (mon).mhp, tmp, "iii");
            ((C.iflags).last_msg = save_plnmsg);
        }
    }
    while (0);
    ((mon).mhp = C.int(((mon).mhp - tmp)));
    return tmp;
}

export function zhitu(type, nd, fltxt, sx, sy) {
    type = C.argument(type, "int");
    nd = C.argument(nd, "int");
    fltxt = C.argument(fltxt, "const char *");
    sx = C.argument(sx, "coordxy");
    sy = C.argument(sy, "coordxy");
    let dam = 0;
    let abstyp = zaptype(type);
    let orig_dam = 0;
    switch (C.int((abstyp % 10))) {
        case C.ZT_MAGIC_MISSILE:
            if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).extrinsic)))) {
                C.shieldeff(sx, sy);
                C.pline_The(C.literal("missiles bounce off!"), "");
                C.monstseesu(C.ulong(C.M_SEEN_MAGR));
            }
            else {
                (dam = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4416, C.literal("zhitu")), C.d((nd), (6)))) : C.d((nd), (6)))));
                C.exercise(C.A_STR, (C.char(0)));
                C.monstunseesu(C.ulong(C.M_SEEN_MAGR));
            }
        break;
        case C.ZT_FIRE:
            (orig_dam = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4422, C.literal("zhitu")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff(sx, sy);
            C.You(C.literal("don't feel hot!"), "");
            C.monstseesu(C.ulong(C.M_SEEN_FIRE));
            C.ugolemeffects(C.AD_FIRE, orig_dam);
        }
        else {
            (dam = orig_dam);
            C.monstunseesu(C.ulong(C.M_SEEN_FIRE));
        }
        C.burn_away_slime();
        if (C.burnarmor(C.fieldRef(C.gy, "youmonst"))) {
/* "body hit" */
            if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4434, C.literal("zhitu")), C.rn2(3))) : C.rn2(3)))))) C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_FIRE, orig_dam);
            if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4436, C.literal("zhitu")), C.rn2(3))) : C.rn2(3)))))) C.ignite_items((C.gi).invent);
        }
        break;
        case C.ZT_COLD:
            (orig_dam = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4441, C.literal("zhitu")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.COLD_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.COLD_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff(sx, sy);
            C.You(C.literal("don't feel cold."), "");
            C.monstseesu(C.ulong(C.M_SEEN_COLD));
            C.ugolemeffects(C.AD_COLD, orig_dam);
        }
        else {
            (dam = orig_dam);
            C.monstunseesu(C.ulong(C.M_SEEN_COLD));
        }
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4451, C.literal("zhitu")), C.rn2(3))) : C.rn2(3)))))) C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_COLD, orig_dam);
        break;
        case C.ZT_SLEEP:
            if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.SLEEP_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.SLEEP_RES, "struct prop"), "struct prop")).extrinsic)))) {
                C.shieldeff((C.u).ux, (C.u).uy);
                C.You(C.literal("don't feel sleepy."), "");
                C.monstseesu(C.ulong(C.M_SEEN_SLEEP));
            }
            else {
                C.monstunseesu(C.ulong(C.M_SEEN_SLEEP));
                C.fall_asleep(C.int((-(((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4461, C.literal("zhitu")), C.d((nd), (25)))) : C.d((nd), (25)))))), (C.char(1)));
/* sleep ray */
            }
        break;
        case C.ZT_DEATH:
            if (Number(abstyp == (C.int((20 + ((C.int((5 - 1))))))))) {
                let disn_prot = inventory_resistance_check(C.AD_DISN);
                if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DISINT_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DISINT_RES, "struct prop"), "struct prop")).extrinsic)))) {
                    C.You(C.literal("are not disintegrated."), "");
                    C.monstseesu(C.ulong(C.M_SEEN_DISINT));
                    break;
                }
                else if (disn_prot) {
                    break;
                }
                C.monstunseesu(C.ulong(C.M_SEEN_DISINT));
                if (C.uarms) {
/* destroy shield; other possessions are safe */
                    C.disintegrate_arm(C.uarms);
                    break;
                }
                else if (C.uarm) {
/* destroy suit; if present, cloak goes too */
                    if (C.uarmc) C.disintegrate_arm(C.uarmc);
                    C.disintegrate_arm(C.uarm);
                    break;
                }
/* no shield or suit, you're dead; wipe out cloak
               and/or shirt in case of life-saving or bones */
                if (C.uarmc) C.disintegrate_arm(C.uarmc);
                if (C.uarmu) C.disintegrate_arm(C.uarmu);
            }
            else if (Number(!!((Number(!!(Number(!!((Number((C.ulong((((((C.gy).youmonst).data)).mflags2 & C.ulong(2n)))) != C.ulong(0n))) || C.ptrCompare((((C.gy).youmonst).data), C.ptrAdd(C.mons, C.PM_MANES, "struct permonst"), "=="))) || (Number(!!((Number(((((C.gy).youmonst).data)).mlet == C.S_GOLEM)) || Number(((((C.gy).youmonst).data)).mlet == C.S_VORTEX))))))) || (Number((C.ulong((((((C.gy).youmonst).data)).mflags2 & C.ulong(256n)))) != C.ulong(0n)))))) {
                C.shieldeff(sx, sy);
                C.You(C.literal("seem unaffected."), "");
                break;
            }
            else if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ANTIMAGIC, "struct prop"), "struct prop")).extrinsic)))) {
                C.shieldeff(sx, sy);
                C.monstseesu(C.ulong(C.M_SEEN_MAGR));
                C.You(C.literal("aren't affected."), "");
                break;
            }
        C.monstunseesu(C.ulong(C.M_SEEN_MAGR));
        (((C.svk).killer).format = C.KILLED_BY_AN);
        C.strcpy(((C.svk).killer).name, ((fltxt) ? fltxt : C.castPointer(C.literal(""), "char *")));
/* when killed by disintegration breath, don't leave corpse */
        ((C.u).ugrave_arise = (((Number(type == C.int((-(C.int((20 + ((C.int((5 - 1)))))))))))) ? C.int((-3)) : C.NON_PM));
        C.done(C.DIED);
        return;
/* lifesaved */
        case C.ZT_LIGHTNING:
            (orig_dam = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4511, C.literal("zhitu")), C.d((nd), (6)))) : C.d((nd), (6)))));
        if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).extrinsic)))) {
            C.shieldeff(sx, sy);
            C.You(C.literal("aren't affected."), "");
            C.monstseesu(C.ulong(C.M_SEEN_ELEC));
            C.ugolemeffects(C.AD_ELEC, orig_dam);
        }
        else {
            (dam = orig_dam);
            C.exercise(C.A_CON, (C.char(0)));
            C.monstunseesu(C.ulong(C.M_SEEN_ELEC));
        }
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4522, C.literal("zhitu")), C.rn2(3))) : C.rn2(3)))))) C.callLocal(destroy_items, C.fieldRef(C.gy, "youmonst"), C.AD_ELEC, orig_dam);
        break;
        case C.ZT_POISON_GAS:
            C.poisoned(C.literal("blast"), C.A_DEX, C.literal("poisoned blast"), 15, (C.char(0)));
        break;
        case C.ZT_ACID:
            if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.ACID_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.ACID_RES, "struct prop"), "struct prop")).extrinsic)))) {
                C.pline_The(C.literal("%s doesn't hurt."), C.hliquid(C.literal("acid")), "p");
                C.monstseesu(C.ulong(C.M_SEEN_ACID));
                (dam = 0);
            }
            else {
                C.pline_The(C.literal("%s burns!"), C.hliquid(C.literal("acid")), "p");
                (dam = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4535, C.literal("zhitu")), C.d((nd), (6)))) : C.d((nd), (6)))));
                C.exercise(C.A_STR, (C.char(0)));
                C.monstunseesu(C.ulong(C.M_SEEN_ACID));
            }
/* using two weapons at once makes both of them more vulnerable */
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4540, C.literal("zhitu")), C.rn2((((C.u).twoweap) ? 3 : 6)))) : C.rn2((((C.u).twoweap) ? 3 : 6))))))) C.acid_damage(C.uwep);
        if (Number(!!((C.u).twoweap && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4542, C.literal("zhitu")), C.rn2(3))) : C.rn2(3)))))))) C.acid_damage(C.uswapwep);
        if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4544, C.literal("zhitu")), C.rn2(6))) : C.rn2(6)))))) C.erode_armor(C.fieldRef(C.gy, "youmonst"), C.ERODE_CORRODE);
        break;
    }
/*
     * 5.0: when fatal, this used to yield "Killed by <fltxt>." without any
     * information about who was responsible.  Now 'buzzer' is used to try
     * to supply "zapped/cast/breathed by <mon> [imitating <other_mon>]."
     *
     * Room for improvement:  there is no monster available when player is
     * hit by divine lighting or by Plane of Air thunderstorm so cause of
     * death remains "killed by a bolt of lightning" w/o extra explanation.
     *
     * Wand of death, spell of finger of death, and disintegration breath
     * don't use this routine so don't include 'inflicted by'.
     */
{
        const kbuf = C.localArray("char[256]", 0);
        let otmp = (C.gc).current_wand;
/* fire horn and frost horn get handled as wands by caller */
        let verb = (((Number(abstyp < 10))) ? ((((Number(!!(otmp && Number((otmp).oclass == C.TOOL_CLASS))))) ? C.literal("played") : C.literal("zapped"))) : (((Number(abstyp < 20))) ? C.literal("cast") : (((Number(abstyp < 30))) ? C.literal("exhaled") : C.literal("imagined"))));
/* wand */
/* should never happen */
        if (Number(!!(Number(type < 0) || (Number(!!(Number(type == 0) && C.ptrCompare((C.gb).buzzer, 0, "!="))))))) {
/* if gb.buzzer is Null, kbuf[] will end up with just <fltxt> */
            C.death_inflicted_by(kbuf, fltxt, (C.gb).buzzer);
/* change "death inflicted by mon" to "death <verb> by mon" */
            if ((C.gb).buzzer) C.strsubst(kbuf, C.literal("inflicted"), verb);
        }
        else {
/* FIXME: "zapped by herself" is suitable for a rebound;
               "zapped at herself" would be better if player explicitly
               targeted hero */
            C.sprintf(kbuf, C.literal("%s %s by %sself"), fltxt, verb, ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).him), "ppp");
        }
/* Half_spell_damage protection yields half-damage for wands & spells,
           including hero's own ricochets; breath attacks do full damage */
        if (Number(!!(Number(!!(dam && (Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALF_SPDAM, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALF_SPDAM, "struct prop"), "struct prop")).extrinsic))))) && Number(abstyp < 20)))) (dam = C.int(Math.trunc((C.int((dam + 1))) / 2)));
        C.losehp(dam, kbuf, C.KILLED_BY_AN);
    }
    return;
}

/*
 * burn objects (such as scrolls and spellbooks) on floor
 * at position x,y; return the number of objects burned
 */
export function burn_floor_objects(x, y, give_feedback, u_caused) /* caller needs to decide about visibility checks */
{
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    give_feedback = C.argument(give_feedback, "boolean");
    u_caused = C.argument(u_caused, "boolean");
    let obj;
    let obj2;
    let i;
    let scrquan;
    let delquan;
    const buf1 = C.localArray("char[256]", 0);
    const buf2 = C.localArray("char[256]", 0);
    let cnt = 0;
    for ((obj = C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *")); obj; (obj = obj2)) {
        (obj2 = ((obj).nexthere).nexthere);
        if (Number(!!(Number(!!(Number((obj).oclass == C.SCROLL_CLASS) || Number((obj).oclass == C.SPBOOK_CLASS))) || (Number(!!(Number((obj).oclass == C.FOOD_CLASS) && Number((obj).otyp == C.GLOB_OF_GREEN_SLIME))))))) {
            if (Number(!!(Number(!!(Number((obj).otyp == C.SCR_FIRE) || Number((obj).otyp == C.SPE_FIREBALL))) || C.callLocal(obj_resists, obj, 2, 100)))) continue;
            (scrquan = (obj).quan);
/* number present */
            (delquan = 0n);
/* number to destroy */
            for ((i = scrquan); Number(i > 0n); ((i = C.long((i - 1n))), C.long((i + 1n)))) if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4619, C.literal("burn_floor_objects")), C.rn2(3))) : C.rn2(3)))))) ((delquan = C.long((delquan + 1n))), C.long((delquan - 1n)));
            if (delquan) {
/* save name before potential delobj() */
                if (give_feedback) {
                    ((obj).quan = 1n);
                    C.strcpy(buf1, (((Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))) ? C.xname(obj) : C.distant_name(obj, C.callback("xname", C.xname))));
                    ((obj).quan = 2n);
                    C.strcpy(buf2, (((Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))) ? C.xname(obj) : C.distant_name(obj, C.callback("xname", C.xname))));
                    ((obj).quan = scrquan);
                }
/* useupf(), which charges, only if hero caused damage */
                if (u_caused) C.useupf(obj, delquan);
                else if (Number(delquan < scrquan)) {
                    ((obj).quan = C.long(((obj).quan - delquan)));
                    ((obj).owt = C.uint(C.weight(obj)));
                }
                else C.delobj(obj);
                (cnt = C.int((cnt + delquan)));
                if (give_feedback) {
                    if (Number(delquan > 1n)) C.pline(C.literal("%ld %s burn."), delquan, buf2, "lp");
                    else C.pline(C.literal("%s burns."), C.An(buf1), "p");
                }
            }
        }
    }
/* This also ignites floor items, but does not change cnt
       because they weren't consumed. */
    C.ignite_items(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *"));
    return cnt;
}

/* which direction a ray bounces.
   current location is sx,sy, direction is ddx, ddy.
   bounceback is 1/n chance of bouncing back.
   caller must ensure sx,sy is a bouncing location: !ZAP_POS or closed_door
 */
export function bounce_dir(sx, sy, ddx, ddy, bounceback) {
    sx = C.argument(sx, "coordxy");
    sy = C.argument(sy, "coordxy");
    ddx = C.argument(ddx, "int *");
    ddy = C.argument(ddy, "int *");
    bounceback = C.argument(bounceback, "int");
    if (Number(!!(Number(!!(Number(!(C.deref(ddx, "int"))) || Number(!(C.deref(ddy, "int"))))) || (Number(!!(Number(bounceback > 0) && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4668, C.literal("bounce_dir")), C.rn2(bounceback))) : C.rn2(bounceback))))))))))) {
        C.store(ddx, "int", C.int((-(C.deref(ddx, "int")))));
        C.store(ddy, "int", C.int((-(C.deref(ddy, "int")))));
    }
    else {
        let rmn;
        let bounce = 0;
        let lsy = C.short(C.int((sy - C.deref(ddy, "int"))));
        let lsx = C.short(C.int((sx - C.deref(ddx, "int"))));
        if (Number(!!(Number(!!(Number(!!(C.isok(sx, lsy) && (Number(((rmn = C.uchar((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), lsy, "struct rm"), "struct rm")).typ))) >= C.POOL)))) && Number(!(C.closed_door(sx, lsy))))) && (Number(!!((Number((rmn) >= C.ROOM)) || (Number(!!(C.isok(C.short(C.int((sx + C.deref(ddx, "int")))), lsy) && (Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, C.int((sx + C.deref(ddx, "int"))), "struct rm[21]"), "struct rm[21]"), lsy, "struct rm"), "struct rm")).typ) >= C.POOL))))))))))) (bounce = 1);
        if (Number(!!(Number(!!(Number(!!(C.isok(lsx, sy) && (Number(((rmn = C.uchar((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, lsx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ))) >= C.POOL)))) && Number(!(C.closed_door(lsx, sy))))) && (Number(!!((Number((rmn) >= C.ROOM)) || (Number(!!(C.isok(lsx, C.short(C.int((sy + C.deref(ddy, "int"))))) && (Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, lsx, "struct rm[21]"), "struct rm[21]"), C.int((sy + C.deref(ddy, "int"))), "struct rm"), "struct rm")).typ) >= C.POOL))))))))))) if (Number(!!(Number(!(bounce)) || (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4686, C.literal("bounce_dir")), C.rn2(2))) : C.rn2(2)))))) (bounce = 2);
        switch (bounce) {
            case (0):
                C.store(ddx, "int", C.int((-(C.deref(ddx, "int")))));
            ;
/*FALLTHRU*/
            case (1):
                C.store(ddy, "int", C.int((-(C.deref(ddy, "int")))));
            break;
            case (2):
                C.store(ddx, "int", C.int((-(C.deref(ddx, "int")))));
            break;
        }
    }
}

/* will zap/spell/breath attack score a hit against armor class `ac'? */
export function zap_hit(ac, type) /* either hero cast spell type or 0 */
{
    ac = C.argument(ac, "int");
    type = C.argument(type, "int");
    let chance = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4709, C.literal("zap_hit")), C.rn2(20))) : C.rn2(20)));
    let spell_bonus = ((type) ? spell_hit_bonus(type) : 0);
/* small chance for naked target to avoid being hit */
    if (Number(!(chance))) return Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4714, C.literal("zap_hit")), C.rnd(10))) : C.rnd(10))) < C.int((ac + spell_bonus)));
/* very high armor protection does not achieve invulnerability */
    (ac = (((Number((ac) >= 0)) ? (ac) : C.int((-(((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4717, C.literal("zap_hit")), C.rnd(C.int((-(ac)))))) : C.rnd(C.int((-(ac)))))))))));
    return (Number(C.int((3 - chance)) < C.int((ac + spell_bonus))));
}

export function disintegrate_mon(mon, type, fltxt) /* hero vs other */
{
    mon = C.argument(mon, "struct monst *");
    type = C.argument(type, "int");
    fltxt = C.argument(fltxt, "const char *");
    let otmp;
    let otmp2;
    let m_amulet = C.mlifesaver(mon);
    if (C.canseemon(mon)) {
        if (Number(!(m_amulet))) C.pline(C.literal("%s is disintegrated!"), C.Monnam(mon), "p");
        else C.callLocal(hit, fltxt, mon, C.literal("!"));
    }
/* note: worn amulet of life saving must be preserved in order to operate */
    for ((otmp = (mon).minvent); otmp; (otmp = otmp2)) {
        (otmp2 = (otmp).nobj);
        if (Number(!((Number(!!(Number(!!(Number(!!(Number((C.deref(C.ptrAdd(C.objects, (otmp).otyp, "struct objclass"), "struct objclass")).oc_oprop == C.DISINT_RES) || C.callLocal(obj_resists, otmp, 5, 50))) || C.is_quest_artifact(otmp))) || C.ptrCompare(otmp, m_amulet, "=="))))))) {
            C.extract_from_minvent(mon, otmp, (C.char(1)), (C.char(1)));
            C.obfree(otmp, 0);
        }
    }
    if (Number(type < 0)) C.monkilled(mon, 0, C.int((-C.AD_RBRE)));
    else C.xkilled(mon, C.int((C.XKILL_NOMSG | C.XKILL_NOCORPSE)));
}

export function ubuzz(type, nd) {
    type = C.argument(type, "int");
    nd = C.argument(nd, "int");
    C.callLocal(dobuzz, type, nd, (C.u).ux, (C.u).uy, (C.u).dx, (C.u).dy, (C.char(1)), (C.char(0)), (C.char(0)));
}

export function buzz(type, nd, sx, sy, dx, dy) {
    type = C.argument(type, "int");
    nd = C.argument(nd, "int");
    sx = C.argument(sx, "coordxy");
    sy = C.argument(sy, "coordxy");
    dx = C.argument(dx, "int");
    dy = C.argument(dy, "int");
    C.callLocal(dobuzz, type, nd, sx, sy, dx, dy, (C.char(1)), (C.char(0)), (C.char(0)));
}

/*
 * type ==   0 to   9 : you zapping a wand
 * type ==  10 to  19 : you casting a spell
 * type ==  20 to  29 : you breathing as a monster
 * type == -10 to -19 : monster casting spell
 * type == -20 to -29 : monster breathing at you
 * type == -30 to -39 : monster zapping a wand
 * called with dx = dy = 0 for vertical bolts
 */
export function dobuzz(type, nd, sx, sy, dx, dy, sayhit, saymiss, forcemiss) /* 0..29 (by hero) or -39..-10 (by monster) */
/* damage strength ('number of dice') */
/* starting point */
/* direction delta */
/* report out of sight hit/miss events */
{
    type = C.argument(type, "int");
    nd = C.argument(nd, "int");
    sx = C.argument(sx, "coordxy");
    sy = C.argument(sy, "coordxy");
    dx = C.scalarLocal("int", C.argument(dx, "int"));
    dy = C.scalarLocal("int", C.argument(dy, "int"));
    sayhit = C.argument(sayhit, "boolean");
    saymiss = C.argument(saymiss, "boolean");
    forcemiss = C.argument(forcemiss, "boolean");
    let range;
    let fltyp = zaptype(type);
    let damgtype = C.int((fltyp % 10));
    let lsx;
    let lsy;
    let mon;
    const save_bhitpos = C.recordLocal("coord", 0);
    const shopdamage = C.scalarLocal("boolean", (C.char(0)));
    let fireball = C.char((Number(type == (C.int((10 + ((C.int((2 - 1))))))))));
    let gas_hit = (C.char(0));
/* set once */
/* will be set during each iteration */
    const otmp = C.scalarLocal("struct obj *");
    let spell_type;
    let hdmgtype = (((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic))))))))) ? (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4797, C.literal("dobuzz")), C.rn2(6))) : C.rn2(6))) : damgtype);
/* if it's a hero spell then get its SPE_TYPE */
    (spell_type = (((Number(!!(Number((type) >= 10) && Number((type) < 20))))) ? C.int((C.SPE_MAGIC_MISSILE + damgtype)) : 0));
    if ((C.u).uswallow) {
        let tmp;
        if (Number(type < 0)) return;
        (tmp = C.callLocal(zhitm, (C.u).ustuck, type, nd, otmp));
        if (Number(!((C.u).ustuck))) {
            ((C.u).uswallow = C.uint(0));
        }
        else {
            C.pline(C.literal("%s rips into %s%s"), C.The(flash_str(fltyp, (C.char(0)))), C.mon_nam((C.u).ustuck), exclam(tmp), "ppp");
/* Using disintegration from the inside only makes a hole... */
            if (Number(tmp == C.MAGIC_COOKIE)) (((C.u).ustuck).mhp = 0);
            if ((Number((((C.u).ustuck)).mhp < 1))) C.killed((C.u).ustuck);
        }
        return;
    }
    if (Number(type < 0)) C.newsym((C.u).ux, (C.u).uy);
    (range = (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4823, C.literal("dobuzz")), C.rn2(7))) : C.rn2(7))) + (7)))));
    if (Number(!!(Number(dx.value == 0) && Number(dy.value == 0)))) (range = 1);
    C.store(save_bhitpos, "coord", (C.gb).bhitpos);
    C.tmp_at(C.DISP_BEAM, C.short(C.zapdir_to_glyph(dx.value, dy.value, hdmgtype)));
    beam: while (Number(((range = C.int((range - 1))), C.int((range + 1))) > 0)) {
        (lsx = sx);
        (sx = C.short((sx + dx.value)));
        (lsy = sy);
        (sy = C.short((sy + dy.value)));
        bounce_done: {
        make_bounce: {
        if (Number(!!(Number(!(C.isok(sx, sy))) || Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ == C.STONE)))) break make_bounce;
        (mon = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, sx, "struct monst *[21]"), "struct monst *[21]"), sy, "struct monst *"), "struct monst *")));
        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, sy, "seenV *"), "seenV *"), sx, "seenV"), "seenV") & 2))) != 0))) {
/* reveal/unreveal invisible monsters before tmp_at() */
            if (Number(!!(mon && Number(!((Number(!!(C.canseemon(mon) || C.sensemon(mon))))))))) C.map_invisible(sx, sy);
            else if (Number(!(mon))) C.unmap_invisible(sx, sy);
            if (Number(!!((Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ) >= C.POOL)) || (Number(!!(C.isok(lsx, lsy) && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, lsy, "seenV *"), "seenV *"), lsx, "seenV"), "seenV") & 2))) != 0)))))))) C.tmp_at(sx, sy);
            C.callIndirect((C.deref((C.windowprocs).win_delay_output, "void (void)")), "void (*)(void)");
/* wait a little */
        }
/* hit() and miss() need gb.bhitpos to match the target */
        ((((C.gb).bhitpos).x = sx), (((C.gb).bhitpos).y = sy));
        (gas_hit = C.char((Number(damgtype == C.ZT_POISON_GAS))));
/* fireballs only damage when they explode; poison gas leaves
           a trail of 1x1 clouds via zap_over_floor(), but that gets
           skipped for a hit that is reflected so is deferred until we
           know whether reflection is happening */
        if (Number(!!(Number(!(fireball)) && Number(!(gas_hit))))) {
            (range = C.int((range + C.callLocal(zap_over_floor, sx, sy, type, shopdamage, (C.char(1)), C.short(0)))));
/* zap with fire -> melt ice -> drown monster, so monster
               found and cached above might not be here any more */
            (mon = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, sx, "struct monst *[21]"), "struct monst *[21]"), sy, "struct monst *"), "struct monst *")));
        }
        let buzzmonst_entry = false;
        buzzmonst: for (;;) {
        if (mon) {
        if (!buzzmonst_entry) {
            if (fireball) break beam;
            if (Number(type >= 0)) ((mon).mstrategy = C.ulong(((mon).mstrategy & C.ulong(C.long((~C.STRAT_WAITMASK))))));
        }
            ((C.gn).notonhead = C.char((Number(!!(Number((mon).mx != ((C.gb).bhitpos).x) || Number((mon).my != ((C.gb).bhitpos).y))))));
            if (Number(!!(Number(!(forcemiss)) && zap_hit(C.find_mac(mon), spell_type)))) {
                if (C.mon_reflects(mon, 0)) {
                    if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (mon).my, "seenV *"), "seenV *"), (mon).mx, "seenV"), "seenV") & 2))) != 0))) {
                        C.callLocal(hit, flash_str(fltyp, (C.char(0))), mon, exclam(0));
                        C.shieldeff((mon).mx, (mon).my);
                        C.mon_reflects(mon, C.literal("But it reflects from %s %s!"));
                        (gas_hit = (C.char(0)));
                    }
                    (dx.value = C.int((-dx.value)));
                    (dy.value = C.int((-dy.value)));
                }
                else {
                    let mon_could_move = C.char((mon).mcanmove);
                    let tmp = C.callLocal(zhitm, mon, type, nd, otmp);
                    if (Number(!!((Number(!!(Number(!!(C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") || C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_FAMINE, "struct permonst"), "=="))) || C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_PESTILENCE, "struct permonst"), "==")))) && Number(C.abs(type) == (C.int((20 + ((C.int((5 - 1))))))))))) {
                        if (C.canseemon(mon)) {
                            C.callLocal(hit, flash_str(fltyp, (C.char(0))), mon, C.literal("."));
                            C.pline(C.literal("%s disintegrates."), C.Monnam(mon), "p");
                            C.pline(C.literal("%s body reintegrates before your %s!"), C.s_suffix(C.Monnam(mon)), (((Number((((Number(!((Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(4096n)))) == C.ulong(0n)))))) ? 0 : (((Number(!!(C.ptrCompare((((C.gy).youmonst).data), C.ptrAdd(C.mons, C.PM_CYCLOPS, "struct permonst"), "==") || C.ptrCompare((((C.gy).youmonst).data), C.ptrAdd(C.mons, C.PM_FLOATING_EYE, "struct permonst"), "=="))))) ? 1 : 2))) == 1))) ? C.body_part(C.EYE) : C.castPointer(C.makeplural(C.body_part(C.EYE)), "char *")), "pp");
                            C.pline(C.literal("%s resurrects!"), C.Monnam(mon), "p");
                        }
                        ((mon).mhp = (mon).mhpmax);
                        break beam;
/* Out of while loop */
                    }
                    if (Number(!!(C.ptrCompare((mon).data, C.ptrAdd(C.mons, C.PM_DEATH, "struct permonst"), "==") && Number(damgtype == C.ZT_DEATH)))) {
                        if (C.canseemon(mon)) {
                            C.callLocal(hit, flash_str(fltyp, (C.char(0))), mon, C.literal("."));
                            C.pline(C.literal("%s absorbs the deadly %s!"), C.Monnam(mon), ((Number(type == (C.int((20 + ((C.int((5 - 1))))))))) ? C.literal("blast") : C.literal("ray")), "pp");
                            C.pline(C.literal("It seems even stronger than before."), "");
                        }
                        break beam;
/* Out of while loop */
                    }
                    if (Number(tmp == C.MAGIC_COOKIE)) {
/* disintegration */
                        disintegrate_mon(mon, type, flash_str(fltyp, (C.char(0))));
                    }
                    else if ((Number(((mon)).mhp < 1))) {
                        if (Number(type < 0)) {
/* mon has just been killed by another monster */
                            C.monkilled(mon, flash_str(fltyp, (C.char(0))), C.AD_RBRE);
                        }
                        else {
                            let xkflags = C.XKILL_GIVEMSG;
/* killed(mon); */
/* killed by hero; we know 'type' isn't negative;
                               if it's fire, highly flammable monsters leave
                               no corpse; don't bother reporting that they
                               "burn completely" -- unnecessary verbosity */
                            if (Number(!!(Number(damgtype == C.ZT_FIRE) && (Number(!!(C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_PAPER_GOLEM, "struct permonst"), "==") || C.ptrCompare(((mon).data), C.ptrAdd(C.mons, C.PM_STRAW_GOLEM, "struct permonst"), "=="))))))) /* paper golem or straw golem */
                            (xkflags = C.int((xkflags | C.XKILL_NOCORPSE)));
                            C.xkilled(mon, xkflags);
                        }
                    }
                    else {
                        if (Number(!(otmp.value))) {
/* normal non-fatal hit */
                            if (Number(!!(sayhit || C.canseemon(mon)))) C.callLocal(hit, flash_str(fltyp, (C.char(0))), mon, exclam(tmp));
                        }
                        else {
/* some armor was destroyed; no damage done */
                            if (C.canseemon(mon)) C.pline(C.literal("%s %s is disintegrated!"), C.s_suffix(C.Monnam(mon)), C.distant_name(otmp.value, C.callback("xname", C.xname)), "pp");
                            C.m_useup(mon, otmp.value);
                        }
                        if (Number(!!(mon_could_move && Number(!((mon).mcanmove))))) /* ZT_SLEEP */
                        C.slept_monst(mon);
                        if (Number(damgtype != C.ZT_SLEEP)) C.wakeup(mon, C.char((((Number(type >= 0))) ? (C.char(1)) : (C.char(0)))));
                    }
                }
                (range = C.int((range - 2)));
            }
            else {
                if (Number(!!(saymiss || (Number(!!(C.canseemon(mon) && Number(!(C.disguised_as_non_mon(mon))))))))) miss(flash_str(fltyp, (C.char(0))), mon);
            }
        }
        else if (Number(!!((Number(!!(Number((sx) == (C.u).ux) && Number((sy) == (C.u).uy)))) && Number(range >= 0)))) {
            C.nomul(0);
            if (Number(!!(Number(!!((C.u).usteed && Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4959, C.literal("dobuzz")), C.rn2(3))) : C.rn2(3))))))) && Number(!(C.mon_reflects((C.u).usteed, 0)))))) {
                (mon = (C.u).usteed);
                { buzzmonst_entry = true; continue buzzmonst; }
            }
            else if (Number(!!(Number(!(forcemiss)) && zap_hit(C.int((C.u).uac), 0)))) {
                (range = C.int((range - 2)));
                C.pline_dir(C.xytodir(C.int((-dx.value)), C.int((-dy.value))), C.literal("%s hits you!"), C.The(flash_str(fltyp, (C.char(0)))), "p");
                if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.REFLECTING, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.REFLECTING, "struct prop"), "struct prop")).extrinsic)))) {
                    if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) {
                        C.ureflects(C.literal("But %s reflects from your %s!"), C.literal("it"));
                    }
                    else C.pline(C.literal("For some reason you are not affected."), "");
                    C.monstseesu(C.ulong(C.M_SEEN_REFL));
                    (dx.value = C.int((-dx.value)));
                    (dy.value = C.int((-dy.value)));
                    C.shieldeff(sx, sy);
                    (gas_hit = (C.char(0)));
                }
                else {
/* flash_str here only used for killer; suppress
                     * hallucination */
                    C.callLocal(zhitu, type, nd, flash_str(fltyp, (C.char(1))), sx, sy);
                    C.monstunseesu(C.ulong(C.M_SEEN_REFL));
                }
            }
            else if (Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) {
                C.pline(C.literal("%s whizzes by you!"), C.The(flash_str(fltyp, (C.char(0)))), "p");
            }
            else if (Number(damgtype == C.ZT_LIGHTNING)) {
                C.Your(C.literal("%s tingles."), C.body_part(C.ARM), "p");
            }
            if (Number(damgtype == C.ZT_LIGHTNING)) C.callLocal(flashburn, C.long((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 4989, C.literal("dobuzz")), C.d((nd), (50)))) : C.d((nd), (50))))), (C.char(1)));
            C.stop_occupation();
            C.nomul(0);
        }
        break buzzmonst;
        } // buzzmonst
/* gas that missed or that hit without being reflected will leave
           a 1x1 cloud here; the earlier zap_over_floor() was deferred */
        if (gas_hit) C.callLocal(zap_over_floor, sx, sy, type, shopdamage, (C.char(1)), C.short(0));
        if (!(Number(!!(Number(!((Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ) >= C.POOL)))) || (Number(!!(C.closed_door(sx, sy) && Number(range >= 0)))))))) break bounce_done;
        } // make_bounce
        let bchance;
            (bchance = (((Number(!!(Number(!(C.isok(sx, sy))) || Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ == C.STONE))))) ? 10 : (((Number(!!(C.In_mines(C.fieldRef(C.u, "uz")) && (Number(!!(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, sx, "struct rm[21]"), "struct rm[21]"), sy, "struct rm"), "struct rm")).typ) <= C.DBWALL)))))))) ? 20 : 75)));
            if (Number(!!((Number(!!(Number(!!(Number((range = C.int((range - 1))) > 0) && C.isok(lsx, lsy))) && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, lsy, "seenV *"), "seenV *"), lsx, "seenV"), "seenV") & 2))) != 0))))) || fireball))) {
                if (((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_air_level"))))))) {
/* nothing to bounce off of */
                    C.pline_The(C.literal("%s vanishes into the aether!"), flash_str(fltyp, (C.char(0))), "p");
                    if (fireball) (type = ((C.int((2 - 1)))));
/* skip pending fireball */
                    break;
                }
                else if (fireball) {
                    (sx = lsx);
                    (sy = lsy);
                    break;
/* fireballs explode before the obstacle */
                }
                else C.pline_The(C.literal("%s bounces!"), flash_str(fltyp, (C.char(0))), "p");
            }
            bounce_dir(sx, sy, dx, dy, bchance);
            C.tmp_at(C.DISP_CHANGE, C.short(C.zapdir_to_glyph(dx.value, dy.value, hdmgtype)));
                } // bounce_done

    }
    C.tmp_at(C.DISP_END, C.short(0));
    if (fireball) C.explode(sx, sy, type, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5027, C.literal("dobuzz")), C.d((12), (6)))) : C.d((12), (6)))), C.char(0), C.EXPL_FIERY);
    if (shopdamage.value) C.pay_for_damage(((Number(damgtype == C.ZT_FIRE)) ? C.literal("burn away") : ((Number(damgtype == C.ZT_COLD)) ? C.literal("shatter") : ((Number(damgtype == C.ZT_ACID)) ? C.literal("damage") : ((Number(damgtype == C.ZT_DEATH)) ? C.literal("disintegrate") : C.literal("destroy"))))), (C.char(0)));
/* "damage" indicates wall rather than door */
    ((C.gb).bhitpos = save_bhitpos);
}

export function melt_ice(x, y, msg) {
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    msg = C.argument(msg, "const char *");
    let lev = C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm");
    let otmp;
    let mtmp;
    if (Number(!(msg))) (msg = C.literal("The ice crackles and melts."));
    if (Number(!!(Number((lev).typ == C.DRAWBRIDGE_UP) || Number((lev).typ == C.DRAWBRIDGE_DOWN)))) {
        ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_ICE)))));
/* revert to DB_MOAT */
    }
    else {
/* lev->typ == ICE */
        ((lev).typ = C.char((((Number(C.int((lev).icedpool) == C.ICED_POOL)) ? C.POOL : C.MOAT))));
        ((lev).icedpool = C.uint(0));
    }
    C.spot_stop_timers(x, y, C.short(C.MELT_ICE_AWAY));
/* no more ice to melt away */
    if (C.t_at(x, y)) C.trap_ice_effects(x, y, (C.char(1)));
/* TRUE because ice_is_melting */
    C.obj_ice_effects(x, y, (C.char(0)));
    C.unearth_objs(x, y);
    if (((C.u).uinwater)) C.vision_recalc(1);
    C.newsym(x, y);
    if (Number(!!((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0)) || (Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))))) C.Norep(C.literal("%s"), msg, "p");
    if (C.ptrCompare(((otmp = C.sobj_at(C.BOULDER, x, y))), 0, "!=")) {
        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0))) C.pline(C.literal("%s settles..."), C.An(C.xname(otmp)), "p");
        do {
            C.obj_extract_self(otmp);
/* boulder isn't being pushed */
            if (Number(!(C.boulder_hits_pool(otmp, x, y, (C.char(0)))))) C.impossible(C.literal("melt_ice: no pool?"), "");
/* try again if there's another boulder and pool didn't fill */
        }
        while (Number(!!(C.is_pool(x, y) && C.ptrCompare(((otmp = C.sobj_at(C.BOULDER, x, y))), 0, "!="))));
        C.newsym(x, y);
    }
    if ((Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))) C.spoteffects((C.char(1)));
    else /* possibly drown, notice objects */
    if (Number(!!(C.is_pool(x, y) && C.ptrCompare(((mtmp = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x, "struct monst *[21]"), "struct monst *[21]"), y, "struct monst *"), "struct monst *")))), 0, "!=")))) C.minliquid(mtmp);
}

/*
 * Usually start a melt_ice timer; sometimes the ice will become
 * permanent instead.
 */
export function start_melt_ice_timeout(x, y, min_time) /* <x,y>'s old melt timeout (deleted by time we get here) */
{
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    min_time = C.argument(min_time, "long");
    let when;
    let where;
    (when = C.int(min_time));
    if (Number(when < C.int((50 - 1)))) (when = C.int((50 - 1)));
/* random timeout; surrounding ice locations ought to be a factor... */
    while (Number((when = C.int((when + 1))) <= 2000)) if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5101, C.literal("start_melt_ice_timeout")), C.rn2(C.int(((C.int((2000 - when))) + 50))))) : C.rn2(C.int(((C.int((2000 - when))) + 50)))))))) break;
/* if we're within MAX_ICE_TIME, install a melt timer;
       otherwise, omit it to leave this ice permanent */
    if (Number(when <= 2000)) {
        (where = C.long(((C.long((C.long(x) << BigInt(Number(16) & 63)))) | C.long(y))));
        C.start_timer(C.long(when), C.short(C.TIMER_LEVEL), C.short(C.MELT_ICE_AWAY), C.long_to_any(where));
    }
}

/*
 * Called when ice has melted completely away.
 */
export function melt_ice_away(arg, timeout) {
    arg = C.argument(arg, "anything *");
    timeout = C.argument(timeout, "long");
    let x;
    let y;
    let where = (arg).a_long;
    let save_mon_moving = ((C.svc).context).mon_moving;
/* will be False */
/* melt_ice -> minliquid -> mondead|xkilled shouldn't credit/blame hero */
    (((C.svc).context).mon_moving = (C.char(1)));
/* hero isn't causing this ice to melt */
    (y = C.short((C.long((where & C.long(65535))))));
    (x = C.short((C.long(((C.long((where >> BigInt(Number(16) & 63)))) & C.long(65535))))));
/* melt_ice does newsym when appropriate */
    C.callLocal(melt_ice, x, y, C.literal("Some ice melts away."));
    (((C.svc).context).mon_moving = save_mon_moving);
}

/* Burn floor scrolls, evaporate pools, etc... in a single square.
 * Used both for normal bolts of fire, cold, etc... and for fireballs.
 * Sets shopdamage to TRUE if a shop door is destroyed, and returns the
 * amount by which range is reduced (value is negative and will be added
 * to remaining range by caller; ignored by fireballs and poison gas).
 */
export function zap_over_floor(x, y, type, shopdamage, ignoremon, exploding_wand_typ) /* location */
/* damage type plus {wand|spell|breath} info */
/* extra output if shop door is destroyed */
/* ignore any monster here */
/* supplied when breaking a wand; or POT_OIL
                               * when a lit potion of oil explodes */
{
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    type = C.argument(type, "int");
    shopdamage = C.argument(shopdamage, "boolean *");
    ignoremon = C.argument(ignoremon, "boolean");
    exploding_wand_typ = C.argument(exploding_wand_typ, "short");
    let zapverb;
    let mon;
    let t;
    let lev = C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm");
    let see_it = C.char((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 2))) != 0)));
    let yourzap;
    let rangemod = 0;
    let damgtype = C.int((zaptype(type) % 10));
    let lavawall = C.char((Number((lev).typ == C.LAVAWALL)));
    if (Number(type == C.PHYS_EXPL_TYPE)) {
/* this won't have any effect on the floor */
        return C.int((-1000));
/* not a zap anyway, shouldn't matter */
    }
    switch (damgtype) {
        case C.ZT_FIRE:
            (t = C.t_at(x, y));
        if (Number(!!(t && Number(C.int((t).ttyp) == C.WEB)))) {
/* a burning web is too flimsy to notice if you can't see it */
            if (see_it) C.Norep(C.literal("A web bursts into flames!"), "");
            (C.delfloortrap(t), (t = 0));
            if (see_it) C.newsym(x, y);
        }
        if (C.is_ice(x, y)) {
            C.callLocal(melt_ice, x, y, 0);
        }
        else if (C.is_pool(x, y)) {
            let on_water_level = C.char(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_water_level")))))));
            let msggiven = (C.char(0));
            let msgtxt = (((Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf))))))) ? C.literal("You hear hissing gas.") : (((Number(type >= 0))) ? C.literal("That seemed remarkably uneventful.") : 0));
/* Deaf-aware */
/* don't create steam clouds on Plane of Water; air bubble
               movement and gas regions don't understand each other */
            if (Number(!(on_water_level))) {
                C.create_gas_cloud(x, y, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5186, C.literal("zap_over_floor")), C.rnd(5))) : C.rnd(5))), 0);
/* 1..5, no damg */
                if (Number((C.iflags).last_msg == C.PLNMSG_ENVELOPED_IN_GAS)) (msggiven = (C.char(1)));
            }
            if (Number((lev).typ != C.POOL)) {
/* MOAT or DRAWBRIDGE_UP or WATER */
                (t = 0);
                if (on_water_level) (msgtxt = (((Number(!!(see_it || Number(!((Number(!!(Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.DEAF, "struct prop"), "struct prop")).extrinsic)) || ((C.u).uroleplay).deaf))))))))) ? C.literal("Some water boils.") : 0));
                else if (see_it) (msgtxt = C.literal("Some water evaporates."));
            }
            else {
                (rangemod = C.int((rangemod - 3)));
                (((lev).typ = C.char(C.ROOM)), ((lev).flags = C.uint(0)));
                (t = C.maketrap(x, y, C.PIT));
/*if (t) -- this was before the vapor cloud was added --
                      t->tseen = 1;*/
                if (see_it) (msgtxt = C.literal("The water evaporates."));
            }
            if (Number(!!(msgtxt && Number(!(msggiven))))) C.Norep(C.literal("%s"), msgtxt, "p");
            if (Number((lev).typ == C.ROOM)) {
/* POOL changed to ROOM above */
                if (C.ptrCompare(((mon = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x, "struct monst *[21]"), "struct monst *[21]"), y, "struct monst *"), "struct monst *")))), 0, "!=")) {
/* probably ought to do some hefty damage to any
                       creature caught in boiling water;
                       at a minimum, eels are forced out of hiding */
                    if (Number(!!((Number((C.ulong(((((mon).data)).mflags1 & C.ulong(2n)))) != C.ulong(0n))) && C.int((mon).mundetected)))) {
                        ((mon).mundetected = C.uint(0));
                    }
                }
                C.newsym(x, y);
                if (t) {
/* if water walking/swimming/magical breathing, maybe fall
                       into the new pit (after the water evaporation message);
                       if flying or levitating, nothing will happen */
                    if ((Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))) C.dotrap(t, C.NO_TRAP_FLAGS);
                    else if (mon) C.mintrap(mon, C.NO_TRAP_FLAGS);
                }
            }
        }
        else if ((Number(((lev).typ) == C.FOUNTAIN))) {
            C.create_gas_cloud(x, y, (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5230, C.literal("zap_over_floor")), C.rnd(3))) : C.rnd(3))), 0);
/* 1..3, no damage */
            if (see_it) C.pline(C.literal("Steam billows from the fountain."), "");
            (rangemod = C.int((rangemod - 1)));
            C.dryup(x, y, C.char(Number(type > 0)));
        }
        break;
/* ZT_FIRE */
        case C.ZT_COLD:
            if (Number(!!(Number(!!(C.is_pool(x, y) || C.is_lava(x, y))) || lavawall))) {
                let lava = C.char((Number(!!(C.is_lava(x, y) || lavawall))));
                let moat = C.is_moat(x, y);
                let chance = (((Number((2) > (C.int((5 + C.int(Math.imul((((C.svl).level).flags).temperature, 10))))))) ? (2) : (C.int((5 + C.int(Math.imul((((C.svl).level).flags).temperature, 10)))))));
                if (Number(!!((Number(((lev).typ) == C.WATER)) || (Number(!!(lavawall && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5244, C.literal("zap_over_floor")), C.rn2(chance))) : C.rn2(chance))))))))) {
/* For now, don't let WATER freeze. */
                    ;
                    if (see_it) C.pline_The(C.literal("%s freezes for a moment."), C.hliquid(((lavawall) ? C.literal("lava") : C.literal("water"))), "p");
                    else C.You_hear(C.literal("a soft crackling."), "");
                    (rangemod = C.int((rangemod - 1000)));
/* stop */
                }
                else {
                    const buf = C.localArray("char[256]", 0);
                    C.strcpy(buf, C.waterbody_name(x, y));
/* for MOAT */
                    (rangemod = C.int((rangemod - 3)));
                    if (Number((lev).typ == C.DRAWBRIDGE_UP)) {
                        ((lev).drawbridgemask = C.uint(((lev).drawbridgemask & C.int((~C.DB_UNDER)))));
/* clear lava */
                        ((lev).drawbridgemask = C.uint(((lev).drawbridgemask | (((lava) ? C.DB_FLOOR : C.DB_ICE)))));
                    }
                    else {
                        ((lev).icedpool = C.uint(((lava) ? 0 : (((Number((lev).typ == C.POOL))) ? C.ICED_POOL : C.ICED_MOAT))));
                        if (lavawall) {
                            if (Number(!!((Number(!!(C.isok(x, C.short(C.int((y - 1)))) && (Number(!!(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), C.int((y - 1)), "struct rm"), "struct rm")).typ) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), C.int((y - 1)), "struct rm"), "struct rm")).typ) <= C.DBWALL))))))) || (Number(!!(C.isok(x, C.short(C.int((y + 1)))) && (Number(!!(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), C.int((y + 1)), "struct rm"), "struct rm")).typ) && Number(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), C.int((y + 1)), "struct rm"), "struct rm")).typ) <= C.DBWALL)))))))))) ((lev).typ = C.char(C.VWALL));
                            else ((lev).typ = C.char(C.HWALL));
                            C.fix_wall_spines(C.short((((Number((0) > (C.int((x - 1))))) ? (0) : (C.int((x - 1)))))), C.short((((Number((0) > (C.int((y - 1))))) ? (0) : (C.int((y - 1)))))), C.short((((Number((C.int((80 - 1))) < (C.int((x + 1))))) ? (C.int((80 - 1))) : (C.int((x + 1)))))), C.short((((Number((C.int((21 - 1))) < (C.int((y + 1))))) ? (C.int((21 - 1))) : (C.int((y + 1)))))));
                        }
                        else {
                            ((lev).typ = C.char(((lava) ? C.ROOM : C.ICE)));
                        }
                    }
                    C.bury_objs(x, y);
                    if (Number(!(lava))) {
                        ;
                    }
                    if (see_it) {
                        if (lava) C.Norep(C.literal("The %s cools and solidifies."), C.hliquid(C.literal("lava")), "p");
                        else if (moat) C.Norep(C.literal("The %s is bridged with ice!"), buf, "p");
                        else C.Norep(C.literal("The %s freezes."), C.hliquid(C.literal("water")), "p");
                        C.newsym(x, y);
                    }
                    else if (Number(!(lava))) {
                        C.You_hear(C.literal("a crackling sound."), "");
                    }
                    if ((Number(!!(Number((x) == (C.u).ux) && Number((y) == (C.u).uy))))) {
                        if ((C.u).uinwater) {
/* not just `if (Underwater)' */
/* leave the no longer existent water */
                            C.set_uinwater(0);
/* u.uinwater = 0 */
                            ((C.u).uundetected = C.uint(0));
                            C.docrt();
                            ((C.gv).vision_full_recalc = C.char(1));
                        }
                        else if (Number(!!((C.u).utrap && Number((C.u).utraptype == C.uint(C.TT_LAVA))))) {
                            if ((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.PASSES_WALLS, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.PASSES_WALLS, "struct prop"), "struct prop")).extrinsic)))) {
                                C.You(C.literal("pass through the now-solid rock."), "");
                                C.reset_utrap((C.char(1)));
                            }
                            else {
                                C.set_utrap(C.uint((C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5305, C.literal("zap_over_floor")), C.rn2(50))) : C.rn2(50))) + (20))))), C.uint(C.TT_INFLOOR));
                                C.You(C.literal("are firmly stuck in the cooling rock."), "");
                            }
                        }
                    }
                    else if (C.ptrCompare(((mon = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x, "struct monst *[21]"), "struct monst *[21]"), y, "struct monst *"), "struct monst *")))), 0, "!=")) {
/* probably ought to do some hefty damage to any
                       non-ice creature caught in freezing water;
                       at a minimum, eels are forced out of hiding */
                        if (Number(!!((Number((C.ulong(((((mon).data)).mflags1 & C.ulong(2n)))) != C.ulong(0n))) && C.int((mon).mundetected)))) {
                            ((mon).mundetected = C.uint(0));
                            C.newsym(x, y);
                        }
                    }
                    if (Number(!(lava))) {
                        start_melt_ice_timeout(x, y, 0n);
                        C.obj_ice_effects(x, y, (C.char(1)));
                    }
                }
/* ?WATER */
            }
            else if (C.is_ice(x, y)) {
                let melt_time;
/* Already ice here, so just firm it up. */
/* Now ensure that only ice that is already timed is affected */
                if (Number(((melt_time = C.spot_time_left(x, y, C.short(C.MELT_ICE_AWAY)))) != 0n)) {
                    C.spot_stop_timers(x, y, C.short(C.MELT_ICE_AWAY));
                    start_melt_ice_timeout(x, y, melt_time);
                }
            }
        break;
/* ZT_COLD */
        case C.ZT_POISON_GAS:
/* poison gas with range 1: green dragon/iron golem breath (AD_DRST);
           caller is placing a series of 1x1 clouds along the zap's path;
           <x,y> for wall locations might be included--reject those */
            if ((Number(((lev).typ) >= C.POOL))) C.create_gas_cloud(x, y, 1, 8);
        break;
        case C.ZT_LIGHTNING:
            ;
/*FALLTHRU*/
        case C.ZT_ACID:
            if (Number((lev).typ == C.IRONBARS)) {
                if (Number(!!(Number(damgtype == C.ZT_LIGHTNING) && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5349, C.literal("zap_over_floor")), C.rn2(10))) : C.rn2(10)))))) break;
                if (Number((C.int((C.int((lev).wall_info) & C.W_NONDIGGABLE))) != 0)) {
                    if (see_it) C.Norep(C.literal("The %s %s somewhat but remain intact."), (C.deref(C.ptrAdd(C.defsyms, C.S_bars, "const struct symdef"), "const struct symdef")).explanation, (((Number(damgtype == C.ZT_ACID))) ? C.literal("corrode") : C.literal("melt")), "pp");
/* but nothing actually happens... */
                }
                else {
                    (rangemod = C.int((rangemod - 3)));
                    if (see_it) C.Norep(C.literal("The %s %s."), (C.deref(C.ptrAdd(C.defsyms, C.S_bars, "const struct symdef"), "const struct symdef")).explanation, (((Number(damgtype == C.ZT_ACID))) ? C.literal("corrode away") : C.literal("melt")), "pp");
                    C.dissolve_bars(x, y);
                    if (C.deref(C.in_rooms(x, y, C.SHOPBASE), "char")) {
                        C.add_damage(x, y, (((Number(type >= 0))) ? C.SHOP_BARS_COST : 0n));
                        if (Number(type >= 0)) C.store(shopdamage, "boolean", (C.char(1)));
                    }
                }
            }
        break;
/* ZT_ACID */
        default:
            break;
    }
/* set up zap text for possible door feedback; for exploding wand, we
       want "the blast" rather than "your blast" even if hero caused it */
    (yourzap = C.char((Number(!!(Number(type >= 0) && Number(!(exploding_wand_typ)))))));
    (zapverb = C.literal("blast"));
/* breath attack or wand explosion */
    if (Number(!(exploding_wand_typ))) {
        let ztype = zaptype(type);
/* 0..29 for both hero and monsters */
        if (Number(ztype < (C.int((10 + (0)))))) (zapverb = C.literal("bolt"));
        else /* wand zap */
        if (Number(ztype < (C.int((20 + (0)))))) (zapverb = C.literal("spell"));
    }
    else if (Number(!!(Number(exploding_wand_typ == C.POT_OIL) || Number(exploding_wand_typ == C.SCR_FIRE)))) {
/* breakobj() -> explode_oil() -> splatter_burning_oil()
           -> explode(ZT_SPELL(ZT_FIRE), BURNING_OIL)
           -> zap_over_floor(ZT_SPELL(ZT_FIRE), POT_OIL) */
/* leave zapverb as "blast"; exploding_wand_typ was nonzero, so
           'yourzap' is FALSE and the result will be "the blast" */
        (exploding_wand_typ = C.short(0));
/* not actually an exploding wand */
    }
/* secret door gets revealed, converted into regular door */
    if (Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"), "struct rm")).typ == C.SDOOR)) {
        C.cvt_sdoor_to_door(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, x, "struct rm[21]"), "struct rm[21]"), y, "struct rm"));
/* .typ = DOOR */
        C.recalc_block_point(x, y);
/* target spot will now pass closed_door() test below
           (except on rogue level) */
        C.newsym(x, y);
        if (see_it) C.pline(C.literal("%s %s reveals a secret door."), ((yourzap) ? C.literal("Your") : C.literal("The")), zapverb, "pp");
        else if (((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_rogue_level"))))))) C.draft_message((C.char(0)));
/* "You feel a draft." (open doorway) */
    }
/* regular door absorbs remaining zap range, possibly gets destroyed */
    if (C.closed_door(x, y)) {
        let new_doormask = C.int((-1));
        let see_txt = 0;
        let sense_txt = 0;
        let hear_txt = 0;
        (rangemod = C.int((-1000)));
        let damage_case = damgtype;
        damage_dispatch: for (;;) {
        switch (damage_case) {
            case C.ZT_FIRE:
                (new_doormask = C.D_NODOOR);
            (see_txt = C.literal("The door is consumed in flames!"));
            (sense_txt = C.literal("smell smoke."));
            break;
            case C.ZT_COLD:
                (new_doormask = C.D_NODOOR);
            (see_txt = C.literal("The door freezes and shatters!"));
            (hear_txt = C.literal("a deep cracking sound."));
            break;
            case C.ZT_DEATH:
/* death spells/wands don't disintegrate */
                if (Number(C.abs(type) != (C.int((20 + ((C.int((5 - 1))))))))) { damage_case = -1; continue damage_dispatch; }
            (new_doormask = C.D_NODOOR);
            (see_txt = C.literal("The door disintegrates!"));
            (hear_txt = C.literal("crashing wood."));
            break;
            case C.ZT_LIGHTNING:
                (new_doormask = C.D_BROKEN);
            (see_txt = C.literal("The door splinters!"));
            (hear_txt = C.literal("crackling."));
            break;
            default:
                if (Number(exploding_wand_typ > 0)) {
/* Magical explosion from misc exploding wand */
                    if (Number(exploding_wand_typ == C.WAN_STRIKING)) {
                        (new_doormask = C.D_BROKEN);
                        (see_txt = C.literal("The door crashes open!"));
                        (sense_txt = C.literal("feel a burst of cool air."));
                        break;
                    }
                }
            if (see_it) {
/* "the door absorbs the blast" would be
                   inaccurate for an exploding wand since
                   other adjacent locations still get hit */
                if (exploding_wand_typ) C.pline_The(C.literal("door remains intact."), "");
                else C.pline_The(C.literal("door absorbs %s %s!"), ((yourzap) ? C.literal("your") : C.literal("the")), zapverb, "pp");
            }
            else C.You_feel(C.literal("vibrations."), "");
            break;
                }
        break damage_dispatch;
        }

        if (Number(new_doormask >= 0)) {
/* door gets broken */
            if (C.deref(C.in_rooms(x, y, C.SHOPBASE), "char")) {
                if (Number(type >= 0)) {
                    C.add_damage(x, y, C.SHOP_DOOR_COST);
                    C.store(shopdamage, "boolean", (C.char(1)));
                }
                else /* caused by monster */
                C.add_damage(x, y, 0n);
            }
            ((lev).doormask = C.uint(new_doormask));
            C.recalc_block_point(x, y);
/* vision */
            if (see_it) {
                C.pline(C.literal("%s"), see_txt, "p");
                C.newsym(x, y);
            }
            else if (sense_txt) {
                C.You(C.literal("%s"), sense_txt, "p");
            }
            else if (hear_txt) C.You_hear(C.literal("%s"), hear_txt, "p");
            if (C.picking_at(x, y)) {
                C.stop_occupation();
                C.reset_pick();
            }
        }
    }
    if (Number(!!((C.ptrCompare(C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).objects, x, "struct obj *[21]"), "struct obj *[21]"), y, "struct obj *"), "struct obj *"), 0, "!=")) && Number(damgtype == C.ZT_FIRE)))) if (Number(!!(C.callLocal(burn_floor_objects, x, y, (C.char(0)), C.char(Number(type > 0))) && (Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, y, "seenV *"), "seenV *"), x, "seenV"), "seenV") & 1))) != 0))))) {
        C.newsym(x, y);
        C.You(C.literal("%s of smoke."), ((Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked)))))))) ? C.literal("see a puff") : C.literal("smell a whiff")), "p");
    }
    if (Number(!!(Number(!(ignoremon)) && C.ptrCompare(((mon = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).monsters, x, "struct monst *[21]"), "struct monst *[21]"), y, "struct monst *"), "struct monst *")))), 0, "!=")))) C.wakeup(mon, C.char((((Number(type >= 0))) ? (C.char(1)) : (C.char(0)))));
    return rangemod;
}

/* monster has cast flames or frost at target on <x,y>; called by mcastu() */
export function mon_spell_hits_spot(caster, adtyp, x, y) /* canonical damage type */
/* so far, only used for targeting <u.ux,u.uy> */
{
    caster = C.argument(caster, "struct monst *");
    adtyp = C.argument(adtyp, "int");
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
/* "shower of missiles" or [hypothetical] "acid rain" attack:
       thoroughly clobber an engraving (unless its type makes it be
       scuff-protected); zap_over_floor() doesn't handle this */
    if (Number(!!(Number(adtyp == C.AD_MAGM) || Number(adtyp == C.AD_ACID)))) {
        let ep = C.engr_at(x, y);
        let etext = ((ep) ? C.deref(C.ptrAdd((ep).engr_txt, C.actual_text, "char *"), "char *") : 0);
        if (etext) C.wipe_engr_at(x, y, C.short(C.int((C.int(C.strlen(etext)) + (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5514, C.literal("mon_spell_hits_spot")), C.d((6), (6)))) : C.d((6), (6))))))), (C.char(1)));
/* hero and player will still remember prior text until the spot
           is re-examined (lookhere or move off and back on) */
    }
/* hit items and/or terrain; only matters for AD_FIRE and AD_COLD but
       accept any basic damage type that zap_over_floor() might handle */
    if (Number(!!(Number(adtyp >= C.AD_MAGM) && Number(adtyp <= C.AD_ACID)))) {
        const shopdummy = C.scalarLocal("boolean", (C.char(0)));
/* zap_over_floor() requires this even
                                    * though it's only used when zapdmgtyp
                                    * is non-negative (hero's fault) */
        let zt_typ = C.int((adtyp - 1));
        let zapdmgtyp = C.int((-(C.int((10 + (zt_typ))))));
/* convert AD_xxxx to ZT_xxxx */
/* damage is from monster spell */
        C.callLocal(zap_over_floor, x, y, zapdmgtyp, shopdummy, (C.char(1)), C.short(0));
    }
    else {
        C.impossible(C.literal("Unsupported damage type (%d) for mon_spell_hits_spot."), adtyp, "i");
    }
}

/* fractured by pick-axe or wand of striking or by vault guard or shopkeeper */
export function fracture_rock(obj) /* no texts here! */
{
    obj = C.argument(obj, "struct obj *");
    const x = C.scalarLocal("coordxy");
    const y = C.scalarLocal("coordxy");
    let by_you = C.char(Number(!(((C.svc).context).mon_moving)));
    if (Number(!!(Number(!!(by_you && get_obj_location(obj, x, y, 0))) && C.costly_spot(x.value, y.value)))) {
        const shkp = C.scalarLocal("struct monst *", 0);
        let objroom = C.deref(C.in_rooms(x.value, y.value, C.SHOPBASE), "char");
        if (C.billable(shkp, obj, objroom, (C.char(0)))) {
/* shop message says "you owe <shk> <$> for it!" so we need
               to precede that with a message explaining what "it" is */
            C.You(C.literal("fracture %s %s."), C.s_suffix(C.shkname(shkp.value)), C.xname(obj), "pp");
/* breakobj won't destroy fracturing statue or boulder but
               will charge for shop goods */
            C.breakobj(obj, x.value, y.value, (C.char(1)), (C.char(0)));
        }
    }
    if (Number(!!(by_you && Number((obj).otyp == C.BOULDER)))) C.sokoban_guilt();
    ((obj).otyp = C.short(C.ROCK));
    ((obj).oclass = C.char(C.GEM_CLASS));
    ((obj).quan = C.long((C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5560, C.literal("fracture_rock")), C.rn2(60))) : C.rn2(60))) + (7))))));
    ((obj).owt = C.uint(C.weight(obj)));
    ((obj).dknown = ((obj).bknown = ((obj).rknown = C.uint(0))));
    ((obj).known = C.uint(((C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_uses_known)) ? 0 : 1)));
    C.dealloc_oextra(obj);
    if (Number((obj).where == C.OBJ_FLOOR)) {
        C.obj_extract_self(obj);
/* move rocks back on top */
        C.place_object(obj, (obj).ox, (obj).oy);
        if (Number(!(C.does_block((obj).ox, (obj).oy, C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (obj).ox, "struct rm[21]"), "struct rm[21]"), (obj).oy, "struct rm"))))) {
            C.unblock_point((obj).ox, (obj).oy);
/* need immediate update in case this is a striking/force bolt
               zap that is about hit more things */
            C.vision_recalc(0);
        }
        if ((Number((C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((C.gv).viz_array, (obj).oy, "seenV *"), "seenV *"), (obj).ox, "seenV"), "seenV") & 2))) != 0))) C.newsym((obj).ox, (obj).oy);
    }
}

/* handle statue hit by striking/force bolt/pick-axe */
export function break_statue(obj) {
    obj = C.argument(obj, "struct obj *");
/* [obj is assumed to be on floor, so no get_obj_location() needed] */
    let trap = C.t_at((obj).ox, (obj).oy);
    let item;
    let by_you = C.char(Number(!(((C.svc).context).mon_moving)));
    if (Number(!!(Number(!!(trap && Number(C.int((trap).ttyp) == C.STATUE_TRAP))) && C.activate_statue_trap(trap, (obj).ox, (obj).oy, (C.char(1)))))) return (C.char(0));
/* drop any objects contained inside the statue */
    while (C.ptrCompare(((item = (obj).cobj)), 0, "!=")) {
        C.obj_extract_self(item);
        C.place_object(item, (obj).ox, (obj).oy);
    }
    if (Number(!!(Number(!!(by_you && (Number(((C.gu).urole).mnum == (C.PM_ARCHEOLOGIST))))) && (C.int(((obj).spe & C.CORPSTAT_HISTORIC)))))) {
        C.You_feel(C.literal("guilty about damaging such a historic statue."), "");
        C.adjalign(C.int((-1)));
    }
    ((obj).spe = C.char(0));
    C.callLocal(fracture_rock, obj);
    return (C.char(1));
}

/* Return TRUE if obj is eligible to pass to maybe_destroy_item given
 * the type of elemental damage it's being subjected to.
 * Note that things like the Book of the Dead are eligible even though they
 * won't get destroyed, because it will attempt to be destroyed but print a
 * special message instead. */
export function destroyable(obj, adtyp) {
    obj = C.argument(obj, "struct obj *");
    adtyp = C.argument(adtyp, "int");
    if ((obj).oartifact) {
/* don't destroy artifacts */
        return (C.char(0));
    }
    if (Number(!!(C.int((obj).in_use) && Number((obj).quan == 1n)))) {
/* not available for destroying */
        return (C.char(0));
    }
    if (Number(adtyp == C.AD_FIRE)) {
/* fire-magic items are immune */
        if (Number(!!(Number((obj).otyp == C.SCR_FIRE) || Number((obj).otyp == C.SPE_FIREBALL)))) {
            return (C.char(0));
        }
        if (Number(!!(Number(!!(Number(!!(Number((obj).otyp == C.GLOB_OF_GREEN_SLIME) || Number((obj).oclass == C.POTION_CLASS))) || Number((obj).oclass == C.SCROLL_CLASS))) || Number((obj).oclass == C.SPBOOK_CLASS)))) {
            return (C.char(1));
        }
    }
    else if (Number(adtyp == C.AD_COLD)) {
/* non-water potions don't freeze and shatter */
        if (Number(!!(Number((obj).oclass == C.POTION_CLASS) && Number((obj).otyp != C.POT_OIL)))) {
            return (C.char(1));
        }
    }
    else if (Number(adtyp == C.AD_ELEC)) {
        if (Number(!!(Number((obj).oclass != C.RING_CLASS) && Number((obj).oclass != C.WAND_CLASS)))) {
            return (C.char(0));
        }
/* electric-magic items are immune */
        if (Number(!!(Number((obj).otyp != C.RIN_SHOCK_RESISTANCE) && Number((obj).otyp != C.WAN_LIGHTNING)))) {
            return (C.char(1));
        }
/* There used to be a commented out bit of code that would exclude
         * gc.current_wand, but it wasn't used, so it wasn't moved into this
         * function. */
    }
    return (C.char(0));
}

/* convert attack damage AD_foo to property resistance */
export function adtyp_to_prop(dmgtyp) {
    dmgtyp = C.argument(dmgtyp, "int");
    switch (dmgtyp) {
        case C.AD_COLD:
            return C.COLD_RES;
        case C.AD_FIRE:
            return C.FIRE_RES;
        case C.AD_ELEC:
            return C.SHOCK_RES;
        case C.AD_ACID:
            return C.ACID_RES;
        case C.AD_DISN:
            return C.DISINT_RES;
        default:
            break;
    }
    return 0;
/* prop_types start at 1 */
}

/* Is hero wearing or wielding an object with resistance to attack
   damage type? Returns the percentage protection that the object gives. */
export function u_adtyp_resistance_obj(dmgtyp) {
    dmgtyp = C.argument(dmgtyp, "int");
    let prop = adtyp_to_prop(dmgtyp);
    if (Number(!(prop))) return 0;
/* FIXME? these percentages (99 and 90) seem too high... */
/* items that give an extrinsic resistance when worn or wielded or
       carried give 99% protection to your items */
    if (Number((C.long(((C.deref(C.ptrAdd((C.u).uprops, prop, "struct prop"), "struct prop")).extrinsic & (C.long((C.long((C.long((C.W_ARMOR | C.W_ACCESSORY)) | C.W_WEP)) | C.W_ART)))))) != 0n)) return 99;
/* worn dwarvish cloaks give 90% protection against heat and cold to
       carried items */
    if (Number(!!(Number(!!(C.uarmc && Number((C.uarmc).otyp == C.DWARVISH_CLOAK))) && (Number(!!(Number(dmgtyp == C.AD_COLD) || Number(dmgtyp == C.AD_FIRE))))))) return 90;
    return 0;
}

/* Rolls to see whether an object in inventory resists damage from the
   given damage type, due to an equipped item protecting it. Use
   u_adtyp_resistance_obj to discover whether objects are protected in
   general (e.g. for enlightenment) and this function to actually do
   the roll to see whether a specific object is protected.

   This function doesn't check for other reasons why an object might
   be protected; you will usually need to do an obj_resists() call
   too. */
export function inventory_resistance_check(dmgtyp) {
    dmgtyp = C.argument(dmgtyp, "int");
    let prob = u_adtyp_resistance_obj(dmgtyp);
    if (Number(!(prob))) return (C.char(0));
    return C.char(Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5717, C.literal("inventory_resistance_check")), C.rn2(100))) : C.rn2(100))) < prob));
}

/* for enlightenment; currently only useful in wizard mode; cf from_what() */
export function item_what(dmgtyp) {
    dmgtyp = C.argument(dmgtyp, "int");
    C.declareStatic("item_what.whatbuf", "char[50]", 0);
    let what = 0;
    let prop = adtyp_to_prop(dmgtyp);
    let xtrinsic = (C.deref(C.ptrAdd((C.u).uprops, prop, "struct prop"), "struct prop")).extrinsic;
    C.store(C.ptrAdd(C.staticCell("item_what.whatbuf").value, 0, "char"), "char", C.char(0));
    if ((C.flags).debug) {
        if (Number(!!(Number(!(prop)) || Number(!(xtrinsic))))) {
            ;
/* 'what' stays Null */
        }
        else if (C.long((xtrinsic & C.W_ARMC))) {
            (what = C.cloak_simple_name(C.uarmc));
        }
        else if (C.long((xtrinsic & C.W_ARM))) {
            (what = C.suit_simple_name(C.uarm));
/* "dragon {scales,mail}" */
        }
        else if (C.long((xtrinsic & C.W_ARMU))) {
            (what = C.shirt_simple_name(C.uarmu));
        }
        else if (C.long((xtrinsic & C.W_ARMH))) {
            (what = C.helm_simple_name(C.uarmh));
        }
        else if (C.long((xtrinsic & C.W_ARMG))) {
            (what = C.gloves_simple_name(C.uarmg));
        }
        else if (C.long((xtrinsic & C.W_ARMF))) {
            (what = C.boots_simple_name(C.uarmf));
        }
        else if (C.long((xtrinsic & C.W_ARMS))) {
            (what = C.shield_simple_name(C.uarms));
        }
        else if (C.long((xtrinsic & (C.long((C.W_AMUL | C.W_TOOL)))))) {
            (what = C.simpleonames((((C.long((xtrinsic & C.W_AMUL)))) ? C.uamul : C.ublindf)));
        }
        else if (C.long((xtrinsic & C.W_RING))) {
            if (Number((C.long((xtrinsic & C.W_RING))) == C.W_RING)) /* both */
            (what = C.literal("rings"));
            else (what = C.simpleonames((((C.long((xtrinsic & C.W_RINGL)))) ? C.uleft : C.uright)));
        }
        else if (C.long((xtrinsic & C.W_WEP))) {
            (what = C.simpleonames(C.uwep));
        }
/* format the output to be ready for enl_msg() to append it to
           "Your items {are,were} protected against <damage-type>" */
        if (what) /* strlen(what) will be less than 30 */
        C.sprintf(C.staticCell("item_what.whatbuf").value, C.literal(" by your %.40s"), what, "p");
    }
    return C.staticCell("item_what.whatbuf").value;
}

/*
 * destroy_strings[dindx][0:singular,1:plural,2:killer_reason]
 *      [0] freezing potion
 *      [1] boiling potion other than oil
 *      [2] boiling potion of oil
 *      [3] burning scroll
 *      [4] burning spellbook
 *      [5] shocked ring
 *      [6] shocked wand
 * (books, rings, and wands don't stack so don't need plural form;
 *  crumbling ring doesn't do damage so doesn't need killer reason)
 * externally referenced from trap.c.
 */
export const destroy_strings = [
    /* also used in trap.c */
    [ "freezes and shatters", "freeze and shatter", "shattered potion" ],
    [ "boils and explodes", "boil and explode", "boiling potion" ],
    [ "ignites and explodes", "ignite and explode", "exploding potion" ],
    [ "catches fire and burns", "catch fire and burn", "burning scroll" ],
    [ "catches fire and burns", "", "burning book" ],
    [ "turns to dust and vanishes", "", "" ],
    [ "breaks apart and explodes", "", "exploding wand" ],
];

/* guts of destroy_items();
   caller must decide whether obj is eligible, though there's one case (Book
   of the Dead) in which an eligible item shouldn't be destroyed (it prints a
   special message instead).
   Returns the amount of damage done, but it's used differently depending on
   whether it's the player or a monster having an item destroyed: players lose
   the HP and possibly die in this function, and the return value is unused,
   whereas monsters return the damage to their caller to be taken off later */
export function maybe_destroy_item(carrier, obj, dmgtyp) {
    carrier = C.argument(carrier, "struct monst *");
    obj = C.argument(obj, "struct obj *");
    dmgtyp = C.argument(dmgtyp, "int");
    let i;
    let cnt;
    let quan;
    let dmg;
    let xresist;
    let skip;
    let dindx;
    let mult;
    let u_carry = C.char((C.ptrCompare(carrier, C.fieldRef(C.gy, "youmonst"), "==")));
    let vis = C.char(Number(!!(Number(!(u_carry)) && C.canseemon(carrier))));
    let chargeit = (C.char(0));
    (xresist = (skip = 0));
/* lint suppression */
    (dmg = (dindx = 0));
    (quan = 0n);
/* external worn item protects inventory? */
    if (Number(!!(u_carry && inventory_resistance_check(dmgtyp)))) return 0;
    switch (dmgtyp) {
        case C.AD_COLD:
            (quan = (obj).quan);
        (dindx = 0);
        (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5823, C.literal("maybe_destroy_item")), C.rnd(4))) : C.rnd(4))));
        break;
        case C.AD_FIRE:
            (xresist = (Number(!!(Number(!!(Number((obj).oclass != C.POTION_CLASS) && Number((obj).otyp != C.GLOB_OF_GREEN_SLIME))) && (((u_carry) ? (Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.FIRE_RES, "struct prop"), "struct prop")).extrinsic))) : C.Resists_Elem(carrier, C.FIRE_RES)))))));
        if (Number((obj).otyp == C.SPE_BOOK_OF_THE_DEAD)) {
            (skip = 1);
            if (((u_carry) ? Number(!((Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).extrinsic))) && Number(!((C.deref(C.ptrAdd((C.u).uprops, C.BLINDED, "struct prop"), "struct prop")).blocked))))))) : vis)) {
                C.pline(C.literal("%s glows a strange %s, but remains intact."), C.The(((u_carry) ? C.xname(obj) : C.distant_name(obj, C.callback("xname", C.xname)))), C.hcolor(C.literal("dark red")), "pp");
            }
            break;
        }
        (quan = (obj).quan);
        switch ((obj).oclass) {
            case (C.POTION_CLASS):
                (dindx = (((Number((obj).otyp != C.POT_OIL))) ? 1 : 2));
            (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5842, C.literal("maybe_destroy_item")), C.rnd(6))) : C.rnd(6))));
            break;
            case (C.SCROLL_CLASS):
                (dindx = 3);
            (dmg = 1);
            break;
            case (C.SPBOOK_CLASS):
                (dindx = 4);
            (dmg = 1);
            break;
            case (C.FOOD_CLASS):
/* only GLOB_OF_GREEN_SLIME */
                (dindx = 1);
/* boil and explode */
            (dmg = C.int(C.uint(Math.trunc((C.uint(((obj).owt + C.uint(19)))) / C.uint(20)))));
            break;
        }
        break;
        case C.AD_ELEC:
            (xresist = (Number(!!(Number((obj).oclass != C.RING_CLASS) && (((u_carry) ? (Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.SHOCK_RES, "struct prop"), "struct prop")).extrinsic))) : C.Resists_Elem(carrier, C.SHOCK_RES)))))));
        (quan = (obj).quan);
        switch ((obj).oclass) {
            case (C.RING_CLASS):
                if (Number(!!((Number(!!(Number(!!((C.long(((obj).owornmask & C.W_RING))) && C.uarmg)) && Number(!((Number(!!(Number(C.int((C.deref(C.ptrAdd(C.objects, (C.uarmg).otyp, "struct objclass"), "struct objclass")).oc_material) >= C.IRON) && Number(C.int((C.deref(C.ptrAdd(C.objects, (C.uarmg).otyp, "struct objclass"), "struct objclass")).oc_material) <= C.MITHRIL))))))))) || Number((obj).otyp == C.RIN_SHOCK_RESISTANCE)))) {
                    ((skip = C.int((skip + 1))), C.int((skip - 1)));
                    break;
                }
                else if (Number(!!(C.int((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_charged) && (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5868, C.literal("maybe_destroy_item")), C.rn2(3))) : C.rn2(3)))))) {
                    (chargeit = (C.char(1)));
                    break;
                }
            (dindx = 5);
            (dmg = 0);
            break;
            case (C.WAND_CLASS):
                (dindx = 6);
            (dmg = (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5877, C.literal("maybe_destroy_item")), C.rnd(10))) : C.rnd(10))));
            break;
        }
        break;
        default:
            (skip = 1);
/* just in case ineligible damage type gets through... */
        C.impossible(C.literal("maybe_destroy_item with unexpected dmgtyp %d"), dmgtyp, "i");
        break;
    }
    if (chargeit) {
/* FIXME: recharge only handles items in hero's inventory */
        if (u_carry) C.recharge(obj, 0);
    }
    else if (Number(!(skip))) {
        let osym = (obj).oclass;
/* for checking glob of slime after it's
                                       destroyed */
        if ((obj).in_use) (quan = C.long((quan - 1n)));
/* one will be used up elsewhere */
        for ((i = (cnt = 0n)); Number(i < quan); ((i = C.long((i + 1n))), C.long((i - 1n)))) if (Number(!((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5897, C.literal("maybe_destroy_item")), C.rn2(3))) : C.rn2(3)))))) ((cnt = C.long((cnt + 1n))), C.long((cnt - 1n)));
        if (Number(!(cnt))) return 0;
        if (Number(!!(u_carry || vis))) {
            (mult = (((Number(cnt == 1n))) ? ((((Number(quan == 1n))) ? C.literal("") : C.literal("One of "))) : ((((Number(cnt < quan))) ? C.literal("Some of ") : (((Number(quan == 2n))) ? C.literal("Both of ") : C.literal("All of "))))));
/* 1 of 1 */
/* 1 of N */
/* n of N */
/* 2 of 2 */
/* N of N */
            C.pline(C.literal("%s%s %s!"), mult, (((Number(!!(Number(cnt == 1n) && Number(quan == 1n))))) ? C.Yname2(obj) : C.yname(obj)), C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.destroy_strings, dindx, "const char *const[3]"), "const char *const[3]"), (Number(cnt > 1n)), "const char *const"), "const char *const"), "ppp");
        }
        if (u_carry) {
/* effects that happen only to the player */
            if (Number(!!(Number(!!(Number(osym == C.POTION_CLASS) && Number(dmgtyp != C.AD_COLD))) && (Number(!!(Number(!((Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(1024n)))) != C.ulong(0n))))) || (Number((C.ulong((((((C.gy).youmonst).data)).mflags1 & C.ulong(4096n)))) == C.ulong(0n))))))))) {
                C.potionbreathe(obj);
            }
            if ((obj).owornmask) {
/* m_useup handles these for monster */
                if (C.long(((obj).owornmask & C.W_RING))) /* ring being worn */
                C.Ring_gone(obj);
                else C.setnotworn(obj);
            }
            if (C.ptrCompare(obj, (C.gc).current_wand, "==")) {
                ((C.gc).current_wand = 0);
/* destroyed */
            }
        }
        for ((i = C.long(0)); Number(i < cnt); ((i = C.long((i + 1n))), C.long((i - 1n)))) {
            if (u_carry) C.useup(obj);
            else C.m_useup(carrier, obj);
        }
        if (dmg) {
            if (Number(!(u_carry))) {
                return ((xresist) ? 0 : dmg);
            }
            if (xresist) {
                C.You(C.literal("aren't hurt!"), "");
            }
            else {
                let how = C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.destroy_strings, dindx, "const char *const[3]"), "const char *const[3]"), 2, "const char *const"), "const char *const");
                let one = C.char((Number(cnt == 1n)));
                if (Number(!!(Number(dmgtyp == C.AD_FIRE) && Number(osym == C.FOOD_CLASS)))) (how = C.literal("exploding glob of slime"));
                C.losehp(dmg, ((one) ? how : C.makeplural(how)), C.char(((one) ? C.KILLED_BY_AN : C.KILLED_BY)));
                C.exercise(C.A_STR, (C.char(0)));
            }
        }
    }
    return dmg;
}

/* scaling factor; dmg/5 stacks will be subjected to destroy_items() */
/* largest amount of stacks that will be destroyed in a single call */
/* target items of specified class in mon's inventory for possible destruction
   return total amount of damage inflicted, though this is unused if mon is
   the player */
export function destroy_items(mon, dmgtyp, dmg_in) /* monster whose invent is being subjected to
                        * destruction */
/* AD_**** - currently only cold, fire, elec */
/* the amount of HP damage the attack dealt */
{
    mon = C.argument(mon, "struct monst *");
    dmgtyp = C.argument(dmgtyp, "int");
    dmg_in = C.argument(dmg_in, "int");
    let obj;
    let i;
    let defer;
    let limit;
/* max amount of item stacks destroyed, based on damage */
    const items_to_destroy = C.localRecordArray("struct teleport_zap_destroy_item[20]");
    let elig_stacks = 0;
/* number of destroyable objects found so far */
    let u_carry = C.char((C.ptrCompare(mon, C.fieldRef(C.gy, "youmonst"), "==")));
/* this is a struct obj** because we might destroy the first item in it */
    let objchn = ((u_carry) ? C.fieldRef(C.gi, "invent") : C.fieldRef(mon, "minvent"));
    let dmg_out = 0;
/* damage caused by items getting destroyed */
    let where = C.NOBJ_STATES;
/* initialize items_to_destroy */
    for ((i = 0); Number(i < C.MAX_ITEMS_DESTROYED); (i = C.int((i + 1)))) {
/* 0 should not be a valid o_id for anything */
        ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).oid = C.uint(0));
        ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).otmp = 0);
        ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).deferred = (C.char(0)));
    }
/* don't straight up destroy all items with an equal chance; limit it
       based on the amount of damage being dealt by the source of the item
       destruction */
    (limit = C.int(Math.trunc(dmg_in / C.DMG_DESTROY_SCALE)));
    if (Number(C.int((dmg_in % C.DMG_DESTROY_SCALE)) > (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 5998, C.literal("destroy_items")), C.rn2(5))) : C.rn2(5))))) {
        ((limit = C.int((limit + 1))), C.int((limit - 1)));
/* dmg = 9: 20% chance of limit=1, 80% of limit=2, etc */
    }
    if (Number(limit > C.MAX_ITEMS_DESTROYED)) {
/* in case of incredibly high damage, prevent from overflowing
         * items_to_destroy */
        (limit = C.MAX_ITEMS_DESTROYED);
    }
    if (Number(limit < 1)) {
        return 0;
/* nothing destroyed */
    }
/* Sometimes destroying an item can change inventory aside from
     * the item itself (cited case was a potion of unholy water; when
     * boiled, potionbreathe() caused hero to transform into were-beast
     * form and that resulted in dropping or destroying some worn armor).
     *
     * Unlike other uses of the object bypass mechanism, destroy_items()
     * can be called multiple times for the same event.  So we have to
     * explicitly clear it before each use and hope no other section of
     * code expects it to retain previous value.
     *
     * Destruction of a ring of levitation or form change which pushes
     * off levitation boots could drop hero onto a fire trap that
     * could destroy other items and we'll get called recursively.  Or
     * onto a trap which transports hero elsewhere, which won't disrupt
     * traversal but could yield message sequencing issues.  So we
     * defer handling such things until after rest of inventory has
     * been processed.  If some other combination of items and events
     * triggers a recursive call, rest of inventory after the triggering
     * item will be skipped by the outer call since the inner one will
     * have set the bypass bits of the whole list.
     *
     * [Unfortunately, death while poly'd into flyer and subsequent
     * rehumanization could also drop hero onto a trap, and there's no
     * straightforward way to defer that.  Things could be improved by
     * redoing this to use two passes, first to collect a list or array
     * of o_id and quantity of what is targeted for destruction,
     * second pass to handle the destruction.]
     */
    C.bypass_objlist(C.deref(objchn, "struct obj *"), (C.char(0)));
/* clear bypass bit for invent */
    while (C.ptrCompare(((obj = C.nxt_unbypassed_obj(C.deref(objchn, "struct obj *")))), 0, "!=")) {
        if (Number(!(destroyable(obj, dmgtyp)))) continue;
/* this dmg type can't destroy this obj */
/* obj is eligible; maybe add it to items_to_destroy */
        (i = (((Number(elig_stacks < limit))) ? elig_stacks : (((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 6045, C.literal("destroy_items")), C.rn2(elig_stacks))) : C.rn2(elig_stacks)))));
/* do this afterwards to avoid not filling items_to_destroy[0] */
        ((elig_stacks = C.int((elig_stacks + 1))), C.int((elig_stacks - 1)));
        if (Number(!!(Number(i < 0) || Number(i >= limit)))) {
/* random index was too high; mollify analyzer by including < 0 */
            continue;
        }
        ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).oid = (obj).o_id);
        ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).otmp = obj);
        if (Number(where == C.NOBJ_STATES)) (where = (obj).where);
        else if (Number(where != (obj).where)) C.impossible(C.literal("destroy_item: items in multiple chains"), "");
/* if loss of this item might dump us onto a trap, hold off
           until later because potential recursive destroy_items() will
           result in setting bypass bits on whole chain--we would skip
           the rest as already processed once control returns here */
        if (Number(!!(u_carry && (Number(!!((Number(!!(Number((obj).owornmask != 0n) && (Number(!!(Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_oprop == C.LEVITATION) || Number((C.deref(C.ptrAdd(C.objects, (obj).otyp, "struct objclass"), "struct objclass")).oc_oprop == C.FLYING))))))) || (Number(!!(Number(!!(Number((obj).otyp == C.POT_WATER) && (Number(!!(Number(((C.u).ulycn) >= C.LOW_PM) && Number(((C.u).ulycn) < C.NUMMONS)))))) && ((((Number((C.u).umonnum != (C.u).umonster))) ? C.int((obj).blessed) : C.int((obj).cursed)))))))))))) /* destroyed wands and potions of polymorph don't trigger
                   polymorph so don't need to be deferred */
{
            ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).deferred = (C.char(1)));
        }
        else {
            ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).deferred = (C.char(0)));
        }
    }
    if (Number(elig_stacks > limit)) {
        (elig_stacks = limit);
/* so we can loop up to elig_stacks */
    }
    for ((defer = 0); Number(defer <= 1); (defer = C.int((defer + 1)))) {
/* if we saved some items for later (most likely just a worn ring
           of levitation) and they're still in inventory, handle them on the
           second iteration of the loop */
        for ((i = 0); Number(i < elig_stacks); (i = C.int((i + 1)))) {
            (obj = (C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).otmp);
            if (Number(!!(Number(!!(Number(!!(obj && Number((obj).o_id == (C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).oid))) && Number((obj).where == where))) && (Number((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).deferred == (Number(defer == 1))))))) {
                (dmg_out = C.int((dmg_out + C.callLocal(maybe_destroy_item, mon, obj, dmgtyp))));
                ((C.deref(C.ptrAdd(items_to_destroy, i, "struct teleport_zap_destroy_item"), "struct teleport_zap_destroy_item")).otmp = 0);
            }
        }
    }
/* almost certainly not everything was destroyed; clear bypass bit after
       it was set earlier */
    C.bypass_objlist(C.deref(objchn, "struct obj *"), (C.char(0)));
    return dmg_out;
}

export function resist(mtmp, oclass, damage, tell) {
    mtmp = C.argument(mtmp, "struct monst *");
    oclass = C.argument(oclass, "char");
    damage = C.argument(damage, "int");
    tell = C.argument(tell, "int");
    let resisted;
    let alev;
    let dlev;
/* fake players always pass resistance test against Conflict
       (this doesn't guarantee that they're never affected by it) */
    if (Number(!!(Number(!!(Number(!!(Number(oclass == C.RING_CLASS) && Number(!(damage)))) && Number(!(tell)))) && (Number(!!((C.ptrCompare(((mtmp).data), C.ptrAdd(C.mons, C.PM_ARCHEOLOGIST, "struct permonst"), ">=")) && (C.ptrCompare(((mtmp).data), C.ptrAdd(C.mons, C.PM_WIZARD, "struct permonst"), "<=")))))))) return 1;
/* attack level */
    switch (oclass) {
        case (C.WAND_CLASS):
            (alev = 12);
        break;
        case (C.TOOL_CLASS):
            (alev = 10);
        break;
/* instrument */
        case (C.WEAPON_CLASS):
            (alev = 10);
        break;
/* artifact */
        case (C.SCROLL_CLASS):
            (alev = 9);
        break;
        case (C.POTION_CLASS):
            (alev = 6);
        break;
        case (C.RING_CLASS):
            (alev = 5);
        break;
        default:
            (alev = (C.u).ulevel);
        break;
/* spell */
    }
/* defense level */
    (dlev = C.int((mtmp).m_lev));
    if (Number(dlev > 50)) (dlev = 50);
    else if (Number(dlev < 1)) (dlev = (((Number(!!((C.ptrCompare(((mtmp).data), C.ptrAdd(C.mons, C.PM_ARCHEOLOGIST, "struct permonst"), ">=")) && (C.ptrCompare(((mtmp).data), C.ptrAdd(C.mons, C.PM_WIZARD, "struct permonst"), "<=")))))) ? (C.u).ulevel : 1));
    (resisted = Number((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 6141, C.literal("resist")), C.rn2(C.int((C.int((100 + alev)) - dlev))))) : C.rn2(C.int((C.int((100 + alev)) - dlev))))) < ((mtmp).data).mr));
    if (resisted) {
        if (tell) C.shieldeff_mon(mtmp);
        (damage = C.int(Math.trunc((C.int((damage + 1))) / 2)));
    }
    if (damage) {
        ((mtmp).mhp = C.int(((mtmp).mhp - damage)));
        if ((Number(((mtmp)).mhp < 1))) {
            if ((C.gm).m_using) C.monkilled(mtmp, C.literal(""), C.AD_RBRE);
            else C.killed(mtmp);
        }
    }
    return resisted;
}

export function wishcmdassist(triesleft) {
    triesleft = C.argument(triesleft, "int");
    C.declareStatic("wishcmdassist.wishinfo", "const char *[16]", [C.literal("Wish details:"), C.literal(""), C.literal("Enter the name of an object, such as \"potion of monster detection\","), C.literal("\"scroll labeled README\", \"elven mithril-coat\", or \"Grimtooth\""), C.literal("(without the quotes)."), C.literal(""), C.literal("For object types which come in stacks, you may specify a plural name"), C.literal("such as \"potions of healing\", or specify a count, such as \"1000 gold"), C.literal("pieces\", although that aspect of your wish might not be granted."), C.literal(""), C.literal("You may also specify various prefix values which might be used to"), C.literal("modify the item, such as \"uncursed\" or \"rustproof\" or \"+1\"."), C.literal("Most modifiers shown when viewing your inventory can be specified."), C.literal(""), C.literal("You may specify 'nothing' to explicitly decline this wish."), 0]);
    C.declareStatic("wishcmdassist.preserve_wishless", "const char[43]", C.literal("Doing so will preserve 'wishless' conduct."));
    C.declareStatic("wishcmdassist.retry_info", "const char[56]", C.literal("If you specify an unrecognized object name %s%s time%s,"));
    C.declareStatic("wishcmdassist.retry_too", "const char[40]", C.literal("a randomly chosen item will be granted."));
    C.declareStatic("wishcmdassist.suppress_cmdassist", "const char[64]", C.literal("(Suppress this assistance with !cmdassist in your config file.)"));
    C.declareStatic("wishcmdassist.cardinals", "const char *[6]", [C.literal("zero"), C.literal("one"), C.literal("two"), C.literal("three"), C.literal("four"), C.literal("five")]);
    C.declareStatic("wishcmdassist.too_many", "const char[9]", C.literal("too many"));
    let i;
    let win;
    const buf = C.localArray("char[256]", 0);
    (win = C.callIndirect((C.deref((C.windowprocs).win_create_nhwindow, "winid (int)")), "winid (*)(int)", C.NHW_TEXT));
    if (Number(!(win))) return;
    for ((i = 0); Number(i < C.int((C.int((C.ulong((BigInt(C.sizeof("const char *[16]")) / BigInt(C.sizeof("const char *")))))) - 1))); (i = C.int((i + 1)))) C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.deref(C.ptrAdd(C.staticCell("wishcmdassist.wishinfo").value, i, "const char *"), "const char *"));
    if (Number(!(((C.u).uconduct).wishes))) C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.staticCell("wishcmdassist.preserve_wishless").value);
    C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.literal(""));
    C.sprintf(buf, C.staticCell("wishcmdassist.retry_info").value, (((Number(!!(Number(triesleft >= 0) && Number(triesleft < C.int((C.ulong((BigInt(C.sizeof("const char *[6]")) / BigInt(C.sizeof("const char *"))))))))))) ? C.deref(C.ptrAdd(C.staticCell("wishcmdassist.cardinals").value, triesleft, "const char *"), "const char *") : C.staticCell("wishcmdassist.too_many").value), (((Number(triesleft < C.MAXWISHTRY))) ? C.literal(" more") : C.literal("")), ((((Number((triesleft) == 1))) ? C.literal("") : C.literal("s"))), "ppp");
    C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, buf);
    C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.staticCell("wishcmdassist.retry_too").value);
    C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.literal(""));
    if ((C.iflags).cmdassist) C.callIndirect((C.deref((C.windowprocs).win_putstr, "void (winid, int, const char *)")), "void (*)(winid, int, const char *)", win, 0, C.staticCell("wishcmdassist.suppress_cmdassist").value);
    C.callIndirect((C.deref((C.windowprocs).win_display_nhwindow, "void (winid, boolean)")), "void (*)(winid, boolean)", win, (C.char(1)));
    C.callIndirect((C.deref((C.windowprocs).win_destroy_nhwindow, "void (winid)")), "void (*)(winid)", win);
}

/* add string to wish history list */
export function wish_history_add(buf) {
    buf = C.argument(buf, "char *");
    let i;
    if (Number(!((C.flags).debug))) return;
    for ((i = 0); Number(i < C.MAX_WISH_HISTORY); ((i = C.int((i + 1))), C.int((i - 1)))) {
        let idx = C.int(((C.int((C.zapState.wish_history_idx + i))) % C.MAX_WISH_HISTORY));
        if (Number(!(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *")))) continue;
        if (Number(!(C.strncmpi(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"), buf, C.int(C.strlen(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"))))))) break;
    }
    if (Number(i == C.MAX_WISH_HISTORY)) {
        let idx = C.int(((C.int((C.zapState.wish_history_idx + i))) % C.MAX_WISH_HISTORY));
        if (C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *")) C.free(C.castPointer(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"), "void *"));
        C.store(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *", C.castPointer(C.alloc(C.uint(C.ulong((C.strlen(buf) + C.ulong(1))))), "char *"));
        C.strcpy(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"), buf);
        (C.zapState.wish_history_idx = C.int(((C.int((C.zapState.wish_history_idx + 1))) % C.MAX_WISH_HISTORY)));
    }
/* DEBUG */
}

/* release any old wish text; called from freedynamicdata(save.c) */
export function wish_history_flush() {
    let idx;
    for ((idx = 0); Number(idx < C.MAX_WISH_HISTORY); (idx = C.int((idx + 1)))) {
        if (C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *")) (C.free(C.castPointer(C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"), "void *")), C.store(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *", 0));
    }
    (C.zapState.wish_history_idx = 0);
}

/* shows menu of previous wishes, copies selected into buf, max BUFSZ len.
   buf is not modified, if nothing was selected. */
export function wish_history_menu(buf) {
    buf = C.argument(buf, "char *");
    let win;
    const any = C.recordLocal("anything", 0);
    let i = 0;
    let npick;
    const picks = C.scalarLocal("menu_item *", 0);
    let idx;
    (win = C.callIndirect((C.deref((C.windowprocs).win_create_nhwindow, "winid (int)")), "winid (*)(int)", C.NHW_MENU));
    C.callIndirect((C.deref((C.windowprocs).win_start_menu, "void (winid, unsigned long)")), "void (*)(winid, unsigned long)", win, C.MENU_BEHAVE_STANDARD);
    C.store(any, "anything", (C.cg).zeroany);
    for ((i = C.int((C.MAX_WISH_HISTORY - 1))); Number(i >= 0); ((i = C.int((i - 1))), C.int((i + 1)))) {
        (idx = C.int(((C.int((C.zapState.wish_history_idx + i))) % C.MAX_WISH_HISTORY)));
        if (C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *")) {
            ((any).a_int = (C.int((i + 1))));
            C.add_menu(win, C.nul_glyphinfo, any, C.char(0), C.char(0), C.ATR_NONE, C.NO_COLOR, C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"), C.MENU_ITEMFLAGS_NONE);
        }
    }
    C.callIndirect((C.deref((C.windowprocs).win_end_menu, "void (winid, const char *)")), "void (*)(winid, const char *)", win, C.literal("Wish what?"));
    (npick = C.select_menu(win, C.PICK_ONE, picks));
    C.callIndirect((C.deref((C.windowprocs).win_destroy_nhwindow, "void (winid)")), "void (*)(winid)", win);
    if (Number(npick > 0)) {
        (i = ((picks.value).item).a_int);
        ((i = C.int((i - 1))), C.int((i + 1)));
        (idx = C.int(((C.int((C.zapState.wish_history_idx + i))) % C.MAX_WISH_HISTORY)));
        if (C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *")) C.strcpy(buf, C.deref(C.ptrAdd(C.zapState.wish_history, idx, "char *"), "char *"));
    }
/* DEBUG */
}

export function makewish() {
    const buf = C.localArray("char[256]", []);
    const bufcpy = C.localArray("char[256]", 0);
    const wish = C.localArray("char[256]", 0);
    const promptbuf = C.localArray("char[128]", 0);
    let otmp;
    const nothing = C.recordLocal("struct obj", 0);
    let maybe_LL_arti;
    let tries = 0;
    let oldwisharti = ((C.u).uconduct).wisharti;
    (((C.svc).context).resume_wish = C.char(0));
    C.store(C.ptrAdd(promptbuf, 0, "char"), "char", C.char(0));
    C.store(nothing, "struct obj", (C.cg).zeroobj);
/* lint suppression; only its address matters */
    if ((C.flags).verbose) C.You(C.literal("may wish for an object."), "");
    retry: for (;;) {
    C.strcpy(promptbuf, C.literal("For what do you wish"));
    if (Number(!!((C.iflags).cmdassist && Number(tries > 0)))) C.strcat(promptbuf, C.literal(" (enter 'help' for assistance)"));
    C.strcat(promptbuf, C.literal("?"));
    if (Number(!!(Number(!!((C.iflags).menu_requested && C.deref(C.ptrAdd(C.zapState.wish_history, 0, "char *"), "char *"))) && (Number(tries == 0))))) C.callLocal(wish_history_menu, buf);
    else C.getlin(promptbuf, buf);
    if ((C.iflags).term_gone) {
        if (Number(!((C.iflags).debug_fuzzer))) (((C.svc).context).resume_wish = C.char(1));
        return;
    }
    C.mungspaces(buf);
    if (Number(C.deref(C.ptrAdd(buf, 0, "char"), "char") == 27)) {
        C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
    }
    else if (Number(!(C.strncmpi((buf), (C.literal("help")), C.int((-1)))))) {
        C.callLocal(wishcmdassist, C.int((C.MAXWISHTRY - tries)));
        C.store(C.ptrAdd(buf, 0, "char"), "char", C.char(0));
/* for EDIT_GETLIN */
        continue retry;
    }
/*
     *  Note: if they wished for and got a non-object successfully,
     *  otmp == &hands_obj.  That includes an artifact which has been
     *  denied. Wishing for "nothing" requires a separate value to remain
     *  distinct.
     */
    C.strcpy(bufcpy, buf);
    (otmp = C.readobjnam(buf, nothing));
    if (Number(!(otmp))) {
        C.pline(C.literal("Nothing fitting that description exists in the game."), "");
        if (Number((tries = C.int((tries + 1))) < C.MAXWISHTRY)) continue retry;
        C.pline(C.literal("%s"), (C.c_common_strings).c_thats_enough_tries, "p");
        (otmp = C.readobjnam(0, 0));
        if (Number(!(otmp))) return;
/* for safety; should never happen */
    }
    else if (C.ptrCompare(otmp, nothing, "==")) {
/* explicitly wished for "nothing", presumably attempting
           to retain wishless conduct */
        C.livelog_printf(C.LL_WISH, C.literal("declined to make a wish"), "");
        return;
    }
    else if (C.ptrCompare(otmp, C.hands_obj, "==")) {
        wish_history_add(bufcpy);
/* wizard mode terrain wish: skip livelogging, etc */
        return;
    }
    wish_history_add(bufcpy);
    if ((otmp).oartifact) {
/* update artifact bookkeeping; doesn't produce a livelog event */
        C.artifact_origin(otmp, C.uint((C.ONAME_WISH | C.ONAME_KNOW_ARTI)));
    }
/* wisharti conduct handled in readobjnam() */
    (maybe_LL_arti = ((((Number(oldwisharti < ((C.u).uconduct).wisharti))) ? C.LL_ARTIFACT : 0n)));
    C.nh_snprintf(C.literal("makewish"), 6388, wish, BigInt(C.sizeof("char[256]")), C.literal("\"%s\", got \"%s\""), bufcpy, C.doname(otmp), "pp");
/* KMH, conduct */
    if (Number(!(C.bump(C.fieldRef((C.u).uconduct, "wishes"), 1, true, "long")))) C.livelog_printf((C.long((C.long((C.LL_CONDUCT | C.LL_WISH)) | maybe_LL_arti))), C.literal("made %s first wish - %s"), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).his), wish, "pp");
    else if (Number(!!(Number(!(oldwisharti)) && ((C.u).uconduct).wisharti))) C.livelog_printf((C.long((C.long((C.LL_CONDUCT | C.LL_WISH)) | C.LL_ARTIFACT))), C.literal("made %s first artifact wish - %s"), ((C.deref(C.ptrAdd(C.genders, (((C.flags).female) ? 1 : 0), "const struct Gender"), "const struct Gender")).his), wish, "pp");
    else C.livelog_printf((C.long((C.LL_WISH | maybe_LL_arti))), C.literal("wished for %s"), wish, "p");
/* TODO? maybe generate a second event describing what was received since
       these just echo player's request rather than show actual result */
    if (Number(!!(Number((otmp).otyp == C.CORPSE) && Number(!(C.u_safe_from_fatal_corpse(otmp, C.st_all)))))) ((otmp).wishedfor = 1);
    let verb = ((((Number(!!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_air_level")))))) || C.int((C.u).uinwater))))) ? C.literal("slip") : (((Number(!!(Number((otmp).otyp == C.CORPSE) && (otmp).wishedfor)))) ? C.literal("materialize") : C.literal("drop"))));
    let oops_msg = (((C.int((C.u).uswallow)) ? C.literal("Oops!  %s out of your reach!") : (((Number(!!(Number(!!(Number(!!(((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_air_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_air_level")))))) || ((Number(!!((Number(!!(((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dlevel || ((C.fieldRef((C.svd).dungeon_topology, "d_water_level"))).dnum))) && C.on_level(C.fieldRef(C.u, "uz"), C.fieldRef((C.svd).dungeon_topology, "d_water_level")))))))) || Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), (C.u).uy, "struct rm"), "struct rm")).typ < C.IRONBARS))) || Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(((C.svl).level).locations, (C.u).ux, "struct rm[21]"), "struct rm[21]"), (C.u).uy, "struct rm"), "struct rm")).typ >= C.ICE))))) ? C.literal("Oops!  %s away from you!") : ((Number(!((Number(!!(Number((otmp).otyp == C.CORPSE) && (otmp).wishedfor)))))) ? C.literal("Oops!  %s to the floor!") : C.literal("Careful! %s on the floor!")))));
/* The(aobjnam()) is safe since otmp is unidentified -dlc */
    C.hold_another_object(otmp, oops_msg, C.The(C.aobjnam(otmp, verb)), 0);
    ((C.u).ublesscnt = C.int(((C.u).ublesscnt + (C.int(((((C.rng_log_enabled()) ? ((C.rng_log_set_caller(C.literal("zap.c"), 6421, C.literal("makewish")), C.rn2(100))) : C.rn2(100))) + (50)))))));
/* the gods take notice */
    break retry;
    } // retry
}

/* Fills buf with the appropriate string for this ray.
 * In the hallucination case, insert "blast of <silly thing>".
 * Assumes that the caller will specify typ in the appropriate range for
 * wand/spell/breath weapon. */
export function flash_str(typ, nohallu) /* suppress hallucination (for death reasons) */
{
    typ = C.argument(typ, "int");
    nohallu = C.argument(nohallu, "boolean");
    C.declareStatic("flash_str.fltxt", "char[256]", 0);
    (typ = zaptype(typ));
    if (Number(!!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC, "struct prop"), "struct prop")).intrinsic && Number(!((Number(!!((C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).intrinsic || (C.deref(C.ptrAdd((C.u).uprops, C.HALLUC_RES, "struct prop"), "struct prop")).extrinsic)))))))) && Number(!(nohallu))))) {
/* always return "blast of foo" for simplicity;
           this could be extended with hallucinatory rays, but probably
           not worth it at this time */
        C.sprintf(C.staticCell("flash_str.fltxt").value, C.literal("blast of %s"), C.rnd_hallublast(), "p");
    }
    else {
        C.strcpy(C.staticCell("flash_str.fltxt").value, C.deref(C.ptrAdd(C.flash_types, typ, "const char *const"), "const char *const"));
    }
    return C.staticCell("flash_str.fltxt").value;
}

/*zap.c*/
