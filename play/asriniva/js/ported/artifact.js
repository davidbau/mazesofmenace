/* NetHack 5.0	artifact.c	$NHDT-Date: 1715889721 2024/05/16 20:02:01 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.236 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */

// Source-faithful configured artifact.c policy; the runtime owns only typed transport.
import { C } from './c-runtime.js';

const FATAL_DAMAGE_MODIFIER = 200;
const MB_MAX_DIEROLL = 8;
const MB_INDEX_PROBE = 0, MB_INDEX_STUN = 1, MB_INDEX_SCARE = 2, MB_INDEX_CANCEL = 3;

const mb_verb = [
    ['probe', 'stun', 'scare', 'cancel'],
    ['prod', 'amaze', 'tickle', 'purge'],
];
const glow_verbs = ['quiver', 'flicker', 'glimmer', 'gleam'];

/* Once-per-Module native backing initialized from the actual configured artilist.h. */
export function initializeArtifactData(C)
{
    if (C.state.initialized)
        return;
    const artilist = [
    [ C.STRANGE_OBJECT, "", 0, 0, 0, [0,0,0,0], [0,0,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 0, 0, 0n, 8 ],
    [ C.LONG_SWORD, "Excalibur", (0x00000001n | 0x00000002n | 0x00000010n | 0x00000080n | 0x00000004n | 0x00000200n), 0, 0, [0,0,5,10], [0,15,0,0], [0,0,0,0], 0, 1, C.PM_KNIGHT, C.NON_PM, 0, 10, 4000n, 8 ],
    [ C.RUNESWORD, "Stormbringer", (0x00000002n | 0x00000040n | 0x00000080n | 0x00000004n | 0x00000100n), 0, 0, [0,15,5,2], [0,15,0,0], [0,0,0,0], 0, (-1), C.NON_PM, C.NON_PM, 0, 9, 8000n, 8 ],
    [ C.WAR_HAMMER, "Mjollnir", (0x00000002n | 0x00000040n), 0, 0, [0,6,5,24], [0,0,0,0], [0,0,0,0], 0, 0, C.PM_VALKYRIE, C.NON_PM, 0, 8, 4000n, 8 ],
    [ C.BATTLE_AXE, "Cleaver", 0x00000002n, 0, 0, [0,0,3,6], [0,0,0,0], [0,0,0,0], 0, 0, C.PM_BARBARIAN, C.NON_PM, 0, 8, 1500n, 8 ],
    [ C.ORCISH_DAGGER, "Grimtooth", (0x00000002n | 0x00000020n | 0x00800000n), 0, 0x00000010n, [0,0,2,6], [0,7,0,0], [0,0,0,0], C.FLING_POISON, (-1), C.NON_PM, C.PM_ORC, 0, 5, 1200n, 1 ],
    [ C.ELVEN_BROADSWORD, "Orcrist", (0x00000020n | 0x00800000n), 0, 0x00000080n, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, (-1), C.NON_PM, C.PM_ELF, 3, 4, 2000n, 12 ],
    [ C.ELVEN_DAGGER, "Sting", (0x00000020n | 0x00800000n), 0, 0x00000080n, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, (-1), C.NON_PM, C.PM_ELF, 3, 1, 800n, 12 ],
    [ C.ATHAME, "Magicbane", (0x00000002n | 0x00000040n | 0x00000080n), 0, 0, [0,12,3,4], [0,1,0,0], [0,0,0,0], 0, 0, C.PM_WIZARD, C.NON_PM, 0, 7, 3500n, 8 ],
    [ C.LONG_SWORD, "Frost Brand", (0x00000002n | 0x00000040n | 0x00000080n), 0, 0, [0,3,5,0], [0,3,0,0], [0,0,0,0], C.SNOWSTORM, (-128), C.NON_PM, C.NON_PM, 0, 9, 3000n, 8 ],
    [ C.LONG_SWORD, "Fire Brand", (0x00000002n | 0x00000040n | 0x00000080n), 0, 0, [0,2,5,0], [0,2,0,0], [0,0,0,0], C.FIRESTORM, (-128), C.NON_PM, C.NON_PM, 0, 5, 3000n, 8 ],
    [ C.BROADSWORD, "Dragonbane", (0x00000002n | 0x00200000n | 0x04000000n), 0, C.S_DRAGON, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 2, 5, 500n, 8 ],
    [ C.SILVER_MACE, "Demonbane", (0x00000002n | 0x00800000n), 0, 0x00000100n, [0,0,5,0], [0,0,0,0], [0,0,0,0], C.BANISH, 1, C.PM_CLERIC, C.NON_PM, 1, 3, 2500n, 8 ],
    [ C.SILVER_SABER, "Werebane", (0x00000002n | 0x00800000n), 0, 0x00000004n, [0,0,5,0], [0,29,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 1, 4, 1500n, 8 ],
    [ C.SILVER_SABER, "Grayswandir", (0x00000002n | 0x00000800n), 0, 0, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, 1, C.NON_PM, C.NON_PM, 0, 10, 8000n, 8 ],
    [ C.LONG_SWORD, "Giantslayer", (0x00000002n | 0x00800000n), 0, 0x00002000n, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, 0, C.NON_PM, C.NON_PM, 2, 4, 200n, 8 ],
    [ C.WAR_HAMMER, "Ogresmasher", (0x00000002n | 0x00200000n), 0, C.S_OGRE, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 2, 1, 200n, 8 ],
    [ C.MORNING_STAR, "Trollsbane", (0x00000002n | 0x00200000n | 0x00004000n), 0, C.S_TROLL, [0,0,5,0], [0,0,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 2, 1, 200n, 8 ],
    [ C.LONG_SWORD, "Vorpal Blade", (0x00000002n | 0x00000400n), 0, 0, [0,0,5,1], [0,0,0,0], [0,0,0,0], 0, 0, C.NON_PM, C.NON_PM, 1, 5, 4000n, 8 ],
    [ C.KATANA, "Snickersnee", 0x00000002n, 0, 0, [0,0,0,8], [0,0,0,0], [0,0,0,0], 0, 1, C.PM_SAMURAI, C.NON_PM, 0, 8, 1200n, 8 ],
    [ C.LONG_SWORD, "Sunsword", (0x00000002n | 0x00800000n), 0, 0x00000002n, [0,0,5,0], [0,11,0,0], [0,0,0,0], C.BLINDING_RAY, 1, C.NON_PM, C.NON_PM, 0, 6, 1500n, 8 ],
    [ C.CRYSTAL_BALL, "The Orb of Detection", (0x00000001n | 0x00000002n | 0x00000004n), (0x00001000n | 0x00010000n), 0, [0,0,0,0], [0,0,0,0], [0,1,0,0], C.INVIS, 1, C.PM_ARCHEOLOGIST, C.NON_PM, 0, 12, 2500n, 8 ],
    [ C.LUCKSTONE, "The Heart of Ahriman", (0x00000001n | 0x00000002n | 0x00000004n), 0x00002000n, 0, [0,0,5,0], [0,0,0,0], [0,0,0,0], C.LEVITATION, 0, C.PM_BARBARIAN, C.NON_PM, 0, 12, 2500n, 8 ],
    [ C.MACE, "The Sceptre of Might", (0x00000001n | 0x00000002n | 0x00000004n | 0x01000000n), 0, 0, [0,0,5,0], [0,1,0,0], [0,0,0,0], C.CONFLICT, 1, C.PM_CAVE_DWELLER, C.NON_PM, 0, 12, 2500n, 8 ],
    [ C.QUARTERSTAFF, "The Staff of Aesculapius", (0x00000001n | 0x00000002n | 0x00000040n | 0x00000004n | 0x00000100n | 0x00004000n), 0, 0, [0,15,0,0], [0,15,0,0], [0,0,0,0], C.HEALING, 0, C.PM_HEALER, C.NON_PM, 0, 12, 5000n, 8 ],
    [ C.MIRROR, "The Magic Mirror of Merlin", (0x00000001n | 0x00000002n | 0x00000004n | 0x00000008n), 0x00001000n, 0, [0,0,0,0], [0,0,0,0], [0,1,0,0], 0, 1, C.PM_KNIGHT, C.NON_PM, 0, 12, 1500n, 8 ],
    [ C.LENSES, "The Eyes of the Overworld", (0x00000001n | 0x00000002n | 0x00000004n | 0x02000000n), 0, 0, [0,0,0,0], [0,1,0,0], [0,0,0,0], C.ENLIGHTENING, 0, C.PM_MONK, C.NON_PM, 0, 12, 2500n, 8 ],
    [ C.HELM_OF_BRILLIANCE, "The Mitre of Holiness", (0x00000001n | 0x00000002n | 0x00800000n | 0x00000004n | 0x08000000n), 0, 0x00000002n, [0,0,0,0], [0,0,0,0], [0,2,0,0], C.ENERGY_BOOST, 1, C.PM_CLERIC, C.NON_PM, 0, 12, 2000n, 8 ],
    [ C.BOW, "The Longbow of Diana", (0x00000001n | 0x00000002n | 0x00000004n | 0x04000000n), 0x00001000n, 0, [0,0,5,0], [0,0,0,0], [0,0,0,0], C.CREATE_AMMO, (-1), C.PM_RANGER, C.NON_PM, 0, 12, 4000n, 8 ],
    [ C.SKELETON_KEY, "The Master Key of Thievery", (0x00000001n | 0x00000002n | 0x00000004n | 0x00000008n), (0x00000020n | 0x00040000n | 0x00020000n), 0, [0,0,0,0], [0,0,0,0], [0,0,0,0], C.UNTRAP, (-1), C.PM_ROGUE, C.NON_PM, 0, 12, 3500n, 8 ],
    [ C.TSURUGI, "The Tsurugi of Muramasa", (0x00000001n | 0x00000002n | 0x00000004n | 0x00000400n | 0x00080000n | 0x08000000n), 0, 0, [0,0,0,8], [0,0,0,0], [0,0,0,0], 0, 1, C.PM_SAMURAI, C.NON_PM, 0, 12, 4500n, 8 ],
    [ C.CREDIT_CARD, "The Platinum Yendorian Express Card", (0x00000001n | 0x00000002n | 0x00000004n | 0x00000080n), (0x00001000n | 0x00010000n), 0, [0,0,0,0], [0,0,0,0], [0,1,0,0], C.CHARGE_OBJ, 0, C.PM_TOURIST, C.NON_PM, 0, 12, 7000n, 8 ],
    [ C.CRYSTAL_BALL, "The Orb of Fate", (0x00000001n | 0x00000002n | 0x00000004n | 0x00080000n), (0x00000020n | 0x00010000n | 0x00020000n), 0, [0,0,0,0], [0,0,0,0], [0,0,0,0], C.LEV_TELE, 0, C.PM_VALKYRIE, C.NON_PM, 0, 12, 3500n, 8 ],
    [ C.AMULET_OF_ESP, "The Eye of the Aethiopica", (0x00000001n | 0x00000002n | 0x00000004n), (0x00008000n | 0x00010000n), 0, [0,0,0,0], [0,1,0,0], [0,0,0,0], C.CREATE_PORTAL, 0, C.PM_WIZARD, C.NON_PM, 0, 12, 4000n, 8 ],
    [ 0, 0, 0, 0, 0, [0,0,0,0], [0,0,0,0], [0,0,0,0], 0, (-128), C.NON_PM, C.NON_PM, 0, 0, 0n, 8 ]
];
    if (artilist.length !== 35)
        throw Error('Review changed original artifact initializer count');
    C.memset(C.artilist, 0, BigInt(C.sizes.artilist));
    const names = ['otyp', 'name', 'spfx', 'cspfx', 'mtype', 'attk', 'defn',
                   'cary', 'inv_prop', 'alignment', 'role', 'race', 'gen_spe',
                   'gift_value', 'cost', 'acolor'];
    const attack_names = ['aatyp', 'adtyp', 'damn', 'damd'];
    for (let i = 0; i < artilist.length; ++i) {
        const art = C.artilist[i];
        for (let j = 0; j < names.length; ++j) {
            if (j >= 5 && j <= 7) {
                for (let k = 0; k < attack_names.length; ++k)
                    art[names[j]][attack_names[k]] = artilist[i][j][k];
            } else {
                art[names[j]] = artilist[i][j];
            }
        }
    }
    C.state.initialized = true;
}

/*
 * Note:  both artilist[] and artiexist[] have a dummy element #0,
 *        so loops over them should normally start at #1.  The primary
 *        exception is the save & restore code, which doesn't care about
 *        the contents, just the total size.
 */
/* #define get_artifact(o) \
    (((o) && ((o)->artifact > 0 && (o)->artifact < AFTER_LAST_ARTIFACT)) \
                             ? &artilist[(int) (o)->oartifact] \
                             : &artilist[ART_NONARTIFACT]) */
/* The amount added to the victim's total hit points to insure that the
   victim will be killed even after damage bonus/penalty adjustments.
   Most such penalties are small, and 200 is plenty; the exception is
   half physical damage.  3.3.1 and previous versions tried to use a very
   large number to account for this case; now, we just compute the fatal
   damage by adding it to 2 times the total hit points instead of 1 time.
   Note: this will still break if they have more than about half the number
   of hit points that will fit in a 15 bit integer. */
/* SFCTOOL */
/* arti_info struct definition moved to artifact.h */
/* array of flags tracking which artifacts exist, indexed by ART_xx;
   ART_xx values are 1..N, element [0] isn't used; no terminator needed */
/* discovery list; for N discovered artifacts, the first N entries are ART_xx
   values in discovery order, the remaining (NROFARTIFACTS-N) slots are 0 */
/* note: artiexist[] and artidisco[] don't need to be in struct ga; they
 * get explicitly initialized at game start so don't need to be part of
 * bulk re-init if game restart ever gets implemented.  They are saved
 * and restored but that is done through this file so they can be local.
 */
/* all bits zero */
/* handle some special cases; must be called after u_init() */
export function hack_artifacts()
{
    let art;
    let alignmnt = C.aligns[C.flags.initalign].value;

    /* Fix up the alignments of "gift" artifacts */
    for (art = C.artilist[1]; art.otyp; art = C.advanceRecord(art, 1))
        if (art.role == C.Role_switch && art.alignment != C.A_NONE)
            art.alignment = alignmnt;

    /* Excalibur can be used by any lawful character, not just knights */
    if (!C.Role_if(C.PM_KNIGHT))
        C.artilist[C.ART_EXCALIBUR].role = C.NON_PM;

    /* Fix up the quest artifact */
    if (C.gu.urole.questarti) {
        C.artilist[C.gu.urole.questarti].alignment = alignmnt;
        C.artilist[C.gu.urole.questarti].role = C.Role_switch;
    }
    return;
}

/* zero out the artifact existence list */
export function init_artifacts()
{
    C.memset(C.artiexist, 0, BigInt(C.sizes.artiexist));
    C.memset(C.artidisco, 0, BigInt(C.sizes.artidisco));
    C.callLocal(hack_artifacts);
}

export function save_artifacts(nhfp)
{
    let i;

    for (i = 0; i < (C.NROFARTIFACTS + 1); ++i)
        C.Sfo_arti_info(nhfp, C.artiexist[i], 'artiexist');

    for (i = 0; i < C.NROFARTIFACTS; ++i)
        C.Sfo_xint16(nhfp, C.scalarPointer('short', C.artidisco.address + i * C.sizes.short), 'artidisco');
}

/* SFCTOOL */
export function restore_artifacts(nhfp)
{
    let i;

    for (i = 0; i < (C.NROFARTIFACTS + 1); ++i)
        C.Sfi_arti_info(nhfp, C.artiexist[i], 'artiexist');
    for (i = 0; i < C.NROFARTIFACTS; ++i)
        C.Sfi_short(nhfp, C.scalarPointer('short', C.artidisco.address + i * C.sizes.short), 'artidisco');
    C.callLocal(hack_artifacts);   /* redo non-saved special cases */
}

export function artiname(artinum)
{
    if (artinum <= 0 || artinum > C.NROFARTIFACTS)
        return '';
    return C.artilist[artinum].name;
}

/*
   Make an artifact.  If a specific alignment is specified, then an object of
   the appropriate alignment is created from scratch, or 0 is returned if
   none is available.  (If at least one aligned artifact has already been
   given, then unaligned ones also become eligible for this.)
   If no alignment is given, then 'otmp' is converted
   into an artifact of matching type, or returned as-is if that's not
   possible.
   For the 2nd case, caller should use ``obj = mk_artifact(obj, A_NONE, 99);''
   For the 1st, ``obj = mk_artifact((struct obj *) 0, some_alignment, ...);''.
   The max_giftvalue is the value of the sacrifice, for an artifact obtained
   by sacrificing, or 99 otherwise.
 */
/* existing object; ignored and disposed of
                          * if alignment specified */
/* target alignment, or A_NONE */
/* cap on generated giftvalue */
/* whether to add spe to situational artifacts */
export function mk_artifact(otmp, alignment, max_giftvalue, adjust_spe)
{
    let a;
    let m, n, altn;
    let by_align = Number(alignment != C.A_NONE);
    let o_typ = (by_align || !otmp) ? 0 : otmp.otyp;
    let unique = Number(Boolean(!by_align && otmp && C.objects[o_typ].oc_unique));
    let eligible = C.shortArray(C.stackAlloc(C.NROFARTIFACTS * C.sizes.short), C.NROFARTIFACTS);
    let skill_compatibility;

    n = altn = 0;    /* no candidates found yet */
    eligible[0] = 0; /* lint suppression */
    /* gather eligible artifacts */
    for (m = 1, a = C.artilist[m]; a.otyp; a = C.advanceRecord(a, 1), m++) {
        if (C.artiexist[m].exists)
            continue;
        if ((a.spfx & C.SPFX_NOGEN) || unique)
            continue;
        if (a.gift_value > max_giftvalue && !C.Role_if(a.role))
            continue;

        if (!by_align) {
            /* looking for a particular type of item; not producing a
               divine gift so we don't care about role's first choice */
            if (a.otyp == o_typ)
                eligible[n++] = m;
            continue; /* move on to next possibility */
        }

        /* we're looking for an alignment-specific item
           suitable for hero's role+race */
        if ((a.alignment == alignment || a.alignment == C.A_NONE)
            /* avoid enemies' equipment */
            && (a.race == C.NON_PM || !C.race_hostile(C.mons[a.race]))) {
            /* when a role-specific first choice is available, use it */
            if (C.Role_if(a.role)) {
                /* make this be the only possibility in the list */
                eligible[0] = m;
                n = 1;
                break; /* skip all other candidates */
            }

            /* check if this is skill-compatible */
            skill_compatibility = C.P_SKILLED;
            if (C.objects[a.otyp].oc_class == C.WEAPON_CLASS) {
                let skill = C.objects[a.otyp].oc_skill;
                if (skill < 0)
                    skill_compatibility = C.P_MAX_SKILL(-skill);
                else
                    skill_compatibility = C.P_MAX_SKILL(skill);
            }

            /* found something to consider for random selection */
            if ((a.alignment != C.A_NONE || C.u.ugifts > 0 || !(C.rngCaller(230, 'mk_artifact'), C.rn2(3))) &&
                (!(C.rngCaller(231, 'mk_artifact'), C.rn2(4)) || skill_compatibility >= C.P_SKILLED ||
                 (skill_compatibility >= C.P_BASIC && (C.rngCaller(232, 'mk_artifact'), C.rn2(2))))) {
                /* right alignment, or non-aligned with at least 1
                   previous gift bestowed, makes this one viable;
                   unaligned artifacts are possible even as the first
                   gift, but less likely; if it's a bad weapon type
                   for the role that also makes it less likely */
                eligible[n++] = m;
            } else {
                /* if no candidates have been found yet, record
                   this one as a[nother] fallback possibility in
                   case all aligned candidates have been used up
                   (via wishing, naming, bones, random generation)
                   or failed the randomized compatibility checks */
                if (!n)
                    eligible[altn++] = m;
                /* [once a regular candidate is found, the list
                   is overwritten and `altn' becomes irrelevant] */
            }
        }
    }

    /* resort to fallback list if main list was empty */
    if (!n)
        n = altn;

    if (n) {
        /* found at least one candidate; pick one at random */
        m = eligible[(C.rngCaller(259, 'mk_artifact'), C.rn2(n))]; /* [0..n-1] */
        a = C.artilist[m];

        /* make an appropriate object if necessary, then christen it */
        if (by_align) {
            /* 'by_align' indicates that an alignment was passed as
             * an argument, but also that the 'otmp' argument is not
             * relevant */
            let artiobj = C.mksobj(C.int(a.otyp), C.TRUE, C.FALSE);

            /* nonnull value of 'otmp' is unexpected. Cope. */
            if (otmp) /* just in case; avoid orphaning */
                C.callLocal(dispose_of_orig_obj, otmp);
            otmp = artiobj;
        }
        /*
         * otmp should be nonnull at this point:
         * either the passed argument (if !by_align == A_NONE), or
         * the result of mksobj() just above if by_align is an alignment. */
        if (!otmp)
            C.__assert_fail('otmp != 0', 'artifact.c', 278, 'mk_artifact');
        /* prevent erosion from generating */
        otmp.oeroded = otmp.oeroded2 = 0;
        otmp = C.oname(otmp, a.name, C.ONAME_NO_FLAGS);
        otmp.oartifact = m;  /* probably already set by this point, but */
        /* set existence and reason for creation bits */
        C.callLocal(artifact_origin, otmp, C.ONAME_RANDOM); /* 'random' is default */
        if (adjust_spe) {
            let new_spe;

            /* Adjust artiobj->spe by a->gen_spe. (This is a no-op for
               non-weapons, which always have a gen_spe of 0, and for many
               weapons, too.) The result is clamped into the "normal" range to
               prevent an outside chance of +12 artifacts generating. */
            new_spe = C.int(otmp.spe) + a.gen_spe;
            if (new_spe >= -10 && new_spe < 10)
                otmp.spe = new_spe;
        }
    } else {
        /* nothing appropriate could be found; return original object */
        if (by_align && otmp) {
            /* (there shouldn't have been an original object). Deal with it.
             * The callers that passed an alignment and a NULL otmp are
             * prepared to get a potential NULL return value, so this is okay */
            C.callLocal(dispose_of_orig_obj, otmp);
            otmp = 0;
        } /* otherwise, otmp has not changed; just fallthrough to return it */
    }
    if (otmp && C.callLocal(permapoisoned, otmp))
        otmp.opoisoned = 1;
    return otmp;
}

export function dispose_of_orig_obj(obj)
{
    if (!obj)
        return;

    C.obj_extract_self(obj);
    C.obfree(obj, 0);
}

/*
 * Returns the full name (with articles and correct capitalization) of an
 * artifact named "name" if one exists, or NULL, it not.
 * The given name must be rather close to the real name for it to match.
 * The object type of the artifact is returned in otyp if the return value
 * is non-NULL.
 */
/* string from player that might be an artifact name */
/* secondary output */
/* whether to allow extra or omitted spaces or dashes */
export function artifact_name(name, otyp_p, fuzzy)
{
    let a;
    let aname;

    if (!C.strncmpi(name, 'the ', 4))
        name = C.charPointer(name) + 4;

    for (a = C.artilist[1]; a.otyp; a = C.advanceRecord(a, 1)) {
        aname = a.name;
        if (!C.strncmpi(aname, 'the ', 4))
            aname = C.charPointer(aname) + 4;
        if (!fuzzy ? !C.strcmpi(name, aname)
                   : C.fuzzymatch(name, aname, ' -', C.TRUE)) {
            if (otyp_p)
                otyp_p.value = a.otyp;
            return a.name;
        }
    }

    return 0;
}

export function exist_artifact(otyp, name)
{
    let a;
    let arex;

    if (otyp && C.loadChar(name))
        for (a = C.artilist[1], arex = C.artiexist[1]; a.otyp;
             a = C.advanceRecord(a, 1), arex = C.advanceRecord(arex, 1))
            if (C.int(a.otyp) == otyp && !C.strcmp(a.name, name))
                return arex.exists ? C.TRUE : C.FALSE;
    return C.FALSE;
}

/* an artifact has just been created or is being "un-created" for a chance
   to be created again later */
/* True: exists, False: being un-created */
/* ONAME_xyz flags; not relevant if !mod */
export function artifact_exists(otmp, name, mod, flgs)
{
    let a;

    if (otmp && C.loadChar(name))
        for (a = C.artilist[1]; a.otyp; a = C.advanceRecord(a, 1))
            if (a.otyp == otmp.otyp && !C.strcmp(a.name, name)) {
                let m = C.int(C.pointerDifference(a, C.artilist, 'artifact'));

                otmp.oartifact = C.char(mod ? m : 0);
                otmp.age = 0n;
                if (otmp.otyp == C.RIN_INCREASE_DAMAGE)
                    otmp.spe = 0;
                if (mod) { /* means being created rather than un-created */
                    /* one--and only one--of these should always be set */
                    if ((flgs & (C.ONAME_VIA_NAMING | C.ONAME_WISH | C.ONAME_GIFT
                                 | C.ONAME_VIA_DIP | C.ONAME_LEVEL_DEF
                                 | C.ONAME_BONES | C.ONAME_RANDOM)) == 0)
                        flgs |= C.ONAME_RANDOM; /* the default origin */
                    /* 'exists' bit will become set (in artifact_origin();
                       there's no ONAME_ flag) and flgs might also contain
                       the know_arti bit (hero knows that artifact exists) */
                    C.callLocal(artifact_origin, otmp, flgs);
                } else { /* uncreate */
                    /* clear all the flag bits */
                    C.copyRecord(C.artiexist[m], C.zero_artiexist, C.sizes.arti_info);
                }
                break;
            }
    return;
}

/* mark an artifact as 'found' */
export function found_artifact(a)
{
    if (a < 1 || a > C.NROFARTIFACTS)
        C.impossible('found_artifact: invalid artifact index! (%d)', a);
    else if (!C.artiexist[a].exists)
        C.impossible("found_artifact: artifact doesn't exist yet? (%d)", a);
    else
        C.artiexist[a].found = 1;
}

/* if an artifact hasn't already been designated 'found', do that now
   and generate a livelog event about finding it */
/*
         * Unlike costly_spot(), inside_shop() includes the "free spot"
         * in front of the door.  And it doesn't care whether or not
         * there is a shopkeeper present.
         *
         * If hero sees a monster pick up a not-yet-found artifact, it
         * will have its dknown flag set even if far away and will be
         * described as 'found on the floor'.  Similarly for dropping
         * (possibly upon monster's death), dknown will be set and the
         * artifact will be described as 'carried by a monster'.
         * That's handled by caller:  dog_invent(), mpickstuff(), or
         * mdrop_obj() so that we get called before obj->where changes.
         */
export function find_artifact(otmp)
{
    let a = otmp.oartifact;

    if (a && !C.artiexist[a].found) {
        let where;

        C.callLocal(found_artifact, a); /* artiexist[a].found = 1 */
        /*
         * Unlike costly_spot(), inside_shop() includes the "free spot"
         * in front of the door.  And it doesn't care about whether or not
         * there is a shopkeeper present.
         *
         * If hero sees a monster pick up a not-yet-found artifact, it
         * will have its dknown flag set even if far away and will be
         * described as 'found on the floor'.  Similarly for dropping
         * (possibly upon monster's death), dknown will be set and the
         * artifact will be described as 'carried by a monster'.
         * That's handled by caller:  dog_invent(), mpickstuff(), or
         * mdrop_obj() so that we get called before obj->where changes.
         */
        where = ((otmp.where == C.OBJ_FLOOR)
                 ? ((C.inside_shop(otmp.ox, otmp.oy) != C.NO_ROOM)
                     ? ' in a shop'
                     : ' on the floor')
                 /* artifacts aren't created in containers but could be
                    inside one if it comes from a bones level */
                 : (otmp.where == C.OBJ_CONTAINED) ? ' in a container'
                   /* perhaps probing, or seeing monster wield artifact */
                   : (otmp.where == C.OBJ_MINVENT) ? ' carried by a monster'
                     /* catchall: probably in inventory, picked up while
                        blind but now seen; there's no previous_where to
                        figure out how it got here */
                     : '');
        C.livelog_printf(C.LL_ARTIFACT, 'found %s%s', C.bare_artifactname(otmp), where);
    }
}

export function nartifact_exist()
{
    let i, a = 0;

    for (i = 1; i <= C.NROFARTIFACTS; ++i)
        if (C.artiexist[i].exists)
            ++a;

    return a;
}

/* set artifact tracking flags;
   calling sequence: oname() -> artifact_exists() -> artifact_origin() or
   mksobj(),others -> mk_artifact() -> artifact_origin(random) possibly
   followed by mksobj(),others -> artifact_origin(non-random origin) */
/* new artifact */
/* ONAME_xxx flags, shared by artifact_exists() */
export function artifact_origin(arti, aflags)
{
    let ct, a = arti.oartifact;

    if (a) {
        /* start by clearing all bits; most are mutually exclusive */
        C.copyRecord(C.artiexist[a], C.zero_artiexist, C.sizes.arti_info);
        /* set 'exists' bit back on; not specified via flag bit in aflags */
        C.artiexist[a].exists = 1;
        /* 'hero knows it exists' is expected for wish, gift, viadip, or
           named and could eventually become set for any of the others */
        if ((aflags & C.ONAME_KNOW_ARTI) != 0)
            C.artiexist[a].found = 1;
        /* should be exactly one of wish, gift, via_dip, via_naming,
           level_def (quest), bones, and random (floor or monst's minvent) */
        ct = 0;
        if ((aflags & C.ONAME_WISH) != 0)
            C.artiexist[a].wish = 1, ++ct;
        if ((aflags & C.ONAME_GIFT) != 0)
            C.artiexist[a].gift = 1, ++ct;
        if ((aflags & C.ONAME_VIA_DIP) != 0)
            C.artiexist[a].viadip = 1, ++ct;
        if ((aflags & C.ONAME_VIA_NAMING) != 0)
            C.artiexist[a].named = 1, ++ct;
        if ((aflags & C.ONAME_LEVEL_DEF) != 0)
            C.artiexist[a].lvldef = 1, ++ct;
        if ((aflags & C.ONAME_BONES) != 0)
            C.artiexist[a].bones = 1, ++ct;
        if ((aflags & C.ONAME_RANDOM) != 0)
            C.artiexist[a].rndm = 1, ++ct;
        if (ct != 1)
            C.impossible('invalid artifact origin: %4o', aflags);
    }
}

export function spec_ability(otmp, abil)
{
    let arti = C.callLocal(get_artifact, otmp);

    return Number(Boolean(arti != C.artilist[C.ART_NONARTIFACT]
                          && (arti.spfx & abil) != 0n));
}

/* used so that callers don't need to known about SPFX_ codes */
export function confers_luck(obj)
{
    /* might as well check for this too */
    if (obj.otyp == C.LUCKSTONE)
        return C.TRUE;

    return Number(Boolean(obj.oartifact && C.callLocal(spec_ability, obj, C.SPFX_LUCK)));
}

/* used to check whether a monster is getting reflection from an artifact */
export function arti_reflects(obj)
{
    let arti = C.callLocal(get_artifact, obj);

    if (arti != C.artilist[C.ART_NONARTIFACT]) {
        /* while being worn */
        if ((obj.owornmask & ~C.W_ART) && (arti.spfx & C.SPFX_REFLECT))
            return C.TRUE;
        /* just being carried */
        if (arti.cspfx & C.SPFX_REFLECT)
            return C.TRUE;
    }
    return C.FALSE;
}

/* decide whether this obj is effective when attacking against shades;
   does not consider the bonus for blessed objects versus undead */
export function shade_glare(obj)
{
    let arti;

    /* any silver object is effective */
    if (C.objects[obj.otyp].oc_material == C.SILVER)
        return C.TRUE;
    /* non-silver artifacts with bonus against undead also are effective */
    arti = C.callLocal(get_artifact, obj);
    if (arti != C.artilist[C.ART_NONARTIFACT] && (arti.spfx & C.SPFX_DFLAG2)
                             && arti.mtype == C.M2_UNDEAD)
        return C.TRUE;
    /* [if there was anything with special bonus against noncorporeals,
       it would be effective too] */
    /* otherwise, harmless to shades */
    return C.FALSE;
}

/* returns 1 if name is restricted for otmp->otyp */
export function restrict_name(otmp, name)
{
    let a;
    let aname, odesc, other;
    let sametype = C.byteArray(C.stackAlloc(C.NUM_OBJECTS * C.sizes.boolean), C.NUM_OBJECTS);
    let i, lo = 0, hi = 0, otyp = otmp.otyp, ocls = C.objects[otyp].oc_class;

    if (!C.loadChar(name))
        return C.FALSE;
    if (!C.strncmpi(name, 'the ', 4))
        name = C.charPointer(name) + 4;

    /* decide what types of objects are the same as otyp;
       if it's been discovered, then only itself matches;
       otherwise, include all other undiscovered objects
       of the same class which have the same description
       or share the same pool of shuffled descriptions */
    C.memset(sametype, 0, BigInt(C.NUM_OBJECTS * C.sizes.boolean)); /* FALSE */
    sametype[otyp] = C.TRUE;
    if (!C.objects[otyp].oc_name_known
        && (odesc = C.OBJ_DESCR(C.objects[otyp])) != 0) {
        C.obj_shuffle_range(otyp, C.localPointer('int', () => lo, v => lo = v),
                            C.localPointer('int', () => hi, v => hi = v));
        for (i = C.svb.bases[ocls]; i < C.NUM_OBJECTS; i++) {
            if (C.objects[i].oc_class != ocls)
                break;
            if (!C.objects[i].oc_name_known
                && (other = C.OBJ_DESCR(C.objects[i])) != 0
                && (!C.strcmp(odesc, other) || (i >= lo && i <= hi)))
                sametype[i] = C.TRUE;
        }
    }

    /* Since almost every artifact is SPFX_RESTR, it doesn't cost
       us much to do the string comparison before the spfx check.
       Bug fix:  don't name multiple elven daggers "Sting".
     */
    for (a = C.artilist[1]; a.otyp; a = C.advanceRecord(a, 1)) {
        if (!sametype[a.otyp])
            continue;
        aname = a.name;
        if (!C.strncmpi(aname, 'the ', 4))
            aname = C.charPointer(aname) + 4;
        if (!C.strcmp(aname, name))
            return Number(Boolean((a.spfx & (C.SPFX_NOGEN | C.SPFX_RESTR)) != 0n
                                  || otmp.quan > 1n));
    }

    return C.FALSE;
}

export function attacks(adtyp, otmp)
{
    let weap;

    if ((weap = C.callLocal(get_artifact, otmp)) != C.artilist[C.ART_NONARTIFACT])
        return Number(weap.attk.adtyp == adtyp);
    return C.FALSE;
}

export function defends(adtyp, otmp)
{
    let weap;

    if (!otmp)
        return C.FALSE;
    if ((weap = C.callLocal(get_artifact, otmp)) != C.artilist[C.ART_NONARTIFACT])
        return Number(weap.defn.adtyp == adtyp);
    if (C.Is_dragon_armor(otmp)) {
        let otyp = otmp.otyp;

        /* convert mail to scales to simplify testing */
        if (C.Is_dragon_mail(otmp))
            otyp += C.GRAY_DRAGON_SCALES - C.GRAY_DRAGON_SCALE_MAIL;

        switch (adtyp) {
        case C.AD_MAGM: /* magic missiles => general magic resistance */
            return Number(otyp == C.GRAY_DRAGON_SCALES);
        case C.AD_HALU: /* confers hallucination resistance */
            return Number(otyp == C.GOLD_DRAGON_SCALES);
        case C.AD_FIRE:
      /*case AD_BLND: -- gives infravision but does not prevent blindness */
            return Number(otyp == C.RED_DRAGON_SCALES); /* red but not gold */
        case C.AD_COLD:
      /*case AD_FAMN: -- slows digestion but does not override Famine */
            return Number(otyp == C.WHITE_DRAGON_SCALES); /* white but not silver */
        case C.AD_DRST: /* drain strength => poison */
        case C.AD_DISE: /* blocks disease but not slime */
            return Number(otyp == C.GREEN_DRAGON_SCALES);
        case C.AD_SLEE: /* sleep */
        case C.AD_PLYS: /* paralysis => free action */
            return Number(otyp == C.ORANGE_DRAGON_SCALES);
        case C.AD_DISN: /* disintegration */
        case C.AD_DRLI: /* level drain resistance */
            return Number(otyp == C.BLACK_DRAGON_SCALES);
        case C.AD_ELEC: /* electricity == lightning */
        case C.AD_SLOW: /* confers speed so blocks speed removal */
            return Number(otyp == C.BLUE_DRAGON_SCALES);
        case C.AD_ACID:
        case C.AD_STON: /* petrification resistance */
            return Number(otyp == C.YELLOW_DRAGON_SCALES);
        default:
            /* SILVER_DRAGON_SCALES don't resist any particular attack type */
            break;
        }
    }
    return C.FALSE;
}

/* used for monsters */
export function defends_when_carried(adtyp, otmp)
{
    let weap;

    if ((weap = C.callLocal(get_artifact, otmp)) != C.artilist[C.ART_NONARTIFACT])
        return Number(weap.cary.adtyp == adtyp);
    return C.FALSE;
}

/* determine whether an item confers Protection */
export function protects(otmp, being_worn)
{
    let arti;

    if (being_worn && C.objects[otmp.otyp].oc_oprop == C.PROTECTION)
        return C.TRUE;
    arti = C.callLocal(get_artifact, otmp);
    if (arti == C.artilist[C.ART_NONARTIFACT])
        return C.FALSE;
    return Number(Boolean((arti.cspfx & C.SPFX_PROTECT) != 0n
                          || (being_worn && (arti.spfx & C.SPFX_PROTECT) != 0n)));
}

/*
 * a potential artifact has just been worn/wielded/picked-up or
 * unworn/unwielded/dropped.  Pickup/drop only set/reset the W_ART mask.
 */
/* make_hallucinated must (re)set the mask itself to get
         * the display right */
export function set_artifact_intrinsic(otmp, on, wp_mask)
{
    let mask = 0;
    let art, oart = C.callLocal(get_artifact, otmp);
    let obj;
    let dtyp;
    let spfx;

    if (oart == C.artilist[C.ART_NONARTIFACT])
        return;

    /* effects from the defn field */
    dtyp = (wp_mask != C.W_ART) ? oart.defn.adtyp : oart.cary.adtyp;

    if (dtyp == C.AD_FIRE)
        mask = C.fieldPointer(C.u.uprops[C.FIRE_RES], 'extrinsic');
    else if (dtyp == C.AD_COLD)
        mask = C.fieldPointer(C.u.uprops[C.COLD_RES], 'extrinsic');
    else if (dtyp == C.AD_ELEC)
        mask = C.fieldPointer(C.u.uprops[C.SHOCK_RES], 'extrinsic');
    else if (dtyp == C.AD_MAGM)
        mask = C.fieldPointer(C.u.uprops[C.ANTIMAGIC], 'extrinsic');
    else if (dtyp == C.AD_DISN)
        mask = C.fieldPointer(C.u.uprops[C.DISINT_RES], 'extrinsic');
    else if (dtyp == C.AD_DRST)
        mask = C.fieldPointer(C.u.uprops[C.POISON_RES], 'extrinsic');
    else if (dtyp == C.AD_DRLI)
        mask = C.fieldPointer(C.u.uprops[C.DRAIN_RES], 'extrinsic');

    if (mask && wp_mask == C.W_ART && !on) {
        /* find out if some other artifact also confers this intrinsic;
           if so, leave the mask alone */
        for (obj = C.gi.invent; obj; obj = obj.nobj) {
            if (obj != otmp && obj.oartifact) {
                art = C.callLocal(get_artifact, obj);
                if (art != C.artilist[C.ART_NONARTIFACT]
                        && art.cary.adtyp == dtyp) {
                    mask = 0;
                    break;
                }
            }
        }
    }
    if (mask) {
        if (on)
            mask.value |= wp_mask;
        else
            mask.value &= ~wp_mask;
    }

    /* intrinsics from the spfx field; there could be more than one */
    spfx = C.long((wp_mask != C.W_ART) ? oart.spfx : oart.cspfx);
    if (spfx && wp_mask == C.W_ART && !on) {
        /* don't change any spfx also conferred by other artifacts */
        for (obj = C.gi.invent; obj; obj = obj.nobj)
            if (obj != otmp && obj.oartifact) {
                art = C.callLocal(get_artifact, obj);
                if (art != C.artilist[C.ART_NONARTIFACT])
                    spfx = C.long(spfx & ~art.cspfx);
            }
    }

    if (spfx & C.SPFX_SEARCH) {
        if (on)
            C.ESearching |= wp_mask;
        else
            C.ESearching &= ~wp_mask;
    }
    if (spfx & C.SPFX_HALRES) {
        /* make_hallucinated must (re)set the mask itself to get
           the display right */
        /* restoring needed because this is the only artifact intrinsic
         * that can print a message--need to guard against being printed
         * when restoring a game
         */
        C.make_hallucinated(C.long(!on), C.program_state.restoring ? C.FALSE : C.TRUE, wp_mask);
    }
    if (spfx & C.SPFX_ESP) {
        if (on)
            C.ETelepat |= wp_mask;
        else
            C.ETelepat &= ~wp_mask;
        C.recalc_telepat_range();
        C.see_monsters();
    }
    if (spfx & C.SPFX_STLTH) {
        if (on)
            C.EStealth |= wp_mask;
        else
            C.EStealth &= ~wp_mask;
    }
    if (spfx & C.SPFX_REGEN) {
        if (on)
            C.ERegeneration |= wp_mask;
        else
            C.ERegeneration &= ~wp_mask;
    }
    if (spfx & C.SPFX_TCTRL) {
        if (on)
            C.ETeleport_control |= wp_mask;
        else
            C.ETeleport_control &= ~wp_mask;
    }
    if (spfx & C.SPFX_WARN) {
        if (C.callLocal(spec_m2, otmp)) {
            if (on) {
                C.EWarn_of_mon |= wp_mask;
                C.svc.context.warntype.obj |= C.callLocal(spec_m2, otmp);
            } else {
                C.EWarn_of_mon &= ~wp_mask;
                C.svc.context.warntype.obj &= ~C.callLocal(spec_m2, otmp);
            }
            C.see_monsters();
        } else {
            if (on)
                C.EWarning |= wp_mask;
            else
                C.EWarning &= ~wp_mask;
        }
    }
    if (spfx & C.SPFX_EREGEN) {
        if (on)
            C.EEnergy_regeneration |= wp_mask;
        else
            C.EEnergy_regeneration &= ~wp_mask;
    }
    if (spfx & C.SPFX_HSPDAM) {
        if (on)
            C.EHalf_spell_damage |= wp_mask;
        else
            C.EHalf_spell_damage &= ~wp_mask;
    }
    if (spfx & C.SPFX_HPHDAM) {
        if (on)
            C.EHalf_physical_damage |= wp_mask;
        else
            C.EHalf_physical_damage &= ~wp_mask;
    }
    if (spfx & C.SPFX_XRAY) {
        /* this assumes that no one else is using xray_range */
        if (on)
            C.u.xray_range = 3;
        else
            C.u.xray_range = -1;
        C.gv.vision_full_recalc = 1;
    }
    if ((spfx & C.SPFX_REFLECT) && (wp_mask & C.W_WEP)) {
        if (on)
            C.EReflecting |= wp_mask;
        else
            C.EReflecting &= ~wp_mask;
    }
    if (spfx & C.SPFX_PROTECT) {
        if (on)
            C.EProtection |= wp_mask;
        else
            C.EProtection &= ~wp_mask;
    }

    if (wp_mask == C.W_ART && !on && oart.inv_prop) {
        /* might have to turn off invoked power too */
        if (oart.inv_prop <= C.LAST_PROP
            && (C.u.uprops[oart.inv_prop].extrinsic & C.W_ARTI))
            C.callLocal(arti_invoke, otmp);
    }

    if (wp_mask == C.W_WEP && C.callLocal(is_art, otmp, C.ART_SUNSWORD)) {
        if (on)
            C.EBlnd_resist |= wp_mask;
        else
            C.EBlnd_resist &= ~wp_mask;
    }
}

/* touch_artifact()'s return value isn't sufficient to tell whether it
   dished out damage, and tracking changes to u.uhp, u.mh, Lifesaved
   when trying to avoid second wounding is too cumbersome */
/* for retouch_object() */
/*
 * creature (usually hero) tries to touch (pick up or wield) an artifact obj.
 * Returns 0 if the object refuses to be touched.
 * This routine does not change any object chains.
 * Ignores such things as gauntlets, assuming the artifact is not
 * fooled by such trappings.
 */
export function touch_artifact(obj, mon)
{
    let oart = C.callLocal(get_artifact, obj);
    let badclass, badalign, self_willed, yours;

    C.state.touch_blasted = C.FALSE;
    if (oart == C.artilist[C.ART_NONARTIFACT])
        return 1;

    yours = Number(mon == C.gy.youmonst);
    /* all quest artifacts are self-willed; if this ever changes, `badclass'
       will have to be extended to explicitly include quest artifacts */
    self_willed = Number((oart.spfx & C.SPFX_INTEL) != 0n);
    if (yours) {
        badclass = Number(Boolean(self_willed
                   && ((oart.role != C.NON_PM && !C.Role_if(oart.role))
                       || (oart.race != C.NON_PM && !C.Race_if(oart.race)))));
        badalign = Number(Boolean((oart.spfx & C.SPFX_RESTR) != 0n
                    && oart.alignment != C.A_NONE
                    && (oart.alignment != C.u.ualign.type
                        || C.u.ualign.record < 0)));
    } else if (!C.is_covetous(mon.data) && !C.is_mplayer(mon.data)) {
        badclass = Number(Boolean(self_willed && oart.role != C.NON_PM
                   && oart != C.artilist[C.ART_EXCALIBUR]));
        badalign = Number(Boolean((oart.spfx & C.SPFX_RESTR) && oart.alignment != C.A_NONE
                   && (oart.alignment != C.mon_aligntyp(mon))));
    } else { /* an M3_WANTSxxx monster or a fake player */
        /* special monsters trying to take the Amulet, invocation tools or
           quest item can touch anything except `spec_applies' artifacts */
        badclass = badalign = C.FALSE;
    }
    /* weapons which attack specific categories of monsters are
       bad for them even if their alignments happen to match */
    if (!badalign)
        badalign = C.callLocal(bane_applies, oart, mon);

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !(C.rngCaller(945, 'touch_artifact'), C.rn2(4))))) {
        let dmg, tmp;
        let buf = C.stackAlloc(C.BUFSZ);

        if (!yours)
            return 0;
        C.You('are blasted by %s power!', C.s_suffix(C.the(C.xname(obj))));
        C.state.touch_blasted = C.TRUE;
        dmg = (C.rngCaller(953, 'touch_artifact'), C.d((C.Antimagic ? 2 : 4), (self_willed ? 10 : 4)));
        /* add half (maybe quarter) of the usual silver damage bonus */
        if (C.objects[obj.otyp].oc_material == C.SILVER && C.Hate_silver)
            tmp = (C.rngCaller(956, 'touch_artifact'), C.rnd(10)), dmg += C.Maybe_Half_Phys(tmp);
        C.Sprintf(buf, 'touching %s', oart.name);
        C.losehp(dmg, buf, C.KILLED_BY); /* magic damage, not physical */
        C.exercise(C.A_WIS, C.FALSE);
    }

    /* can pick it up unless you're totally non-synch'd with the artifact */
    if (badclass && badalign && self_willed) {
        if (yours) {
            if (!C.carried(obj))
                C.pline('%s your grasp!', C.Tobjnam(obj, 'evade'));
            else
                C.pline('%s beyond your control!', C.Tobjnam(obj, 'are'));
        }
        return 0;
    }

    return 1;
}

/* decide whether an artifact itself is vulnerable to a particular type
   of erosion damage, independent of the properties of its bearer */
export function arti_immune(obj, dtyp)
{
    let weap = C.callLocal(get_artifact, obj);

    if (weap == C.artilist[C.ART_NONARTIFACT])
        return C.FALSE;
    if (dtyp == C.AD_PHYS)
        return C.FALSE; /* nothing is immune to phys dmg */
    return Number(Boolean(weap.attk.adtyp == dtyp
                          || weap.defn.adtyp == dtyp
                          || weap.cary.adtyp == dtyp));
}

export function bane_applies(oart, mon)
{
    let atmp = C.recordLocal('artifact');

    if (oart != C.artilist[C.ART_NONARTIFACT]
            && (oart.spfx & C.SPFX_DBONUS) != 0n) {
        C.copyRecord(atmp, oart, C.sizes.artifact);
        atmp.spfx &= C.SPFX_DBONUS; /* clear other spfx fields */
        if (C.callLocal(spec_applies, atmp, mon))
            return C.TRUE;
    }
    return C.FALSE;
}

/* decide whether an artifact's special attacks apply against mtmp */
export function spec_applies(weap, mtmp)
{
    let ptr;
    let yours;

    if (!(weap.spfx & (C.SPFX_DBONUS | C.SPFX_ATTK)))
        return Number(weap.attk.adtyp == C.AD_PHYS);

    yours = Number(mtmp == C.gy.youmonst);
    ptr = mtmp.data;

    if (weap.spfx & C.SPFX_DMONS) {
        return Number(ptr == C.mons[C.int(weap.mtype)]);
    } else if (weap.spfx & C.SPFX_DCLAS) {
        return Number(weap.mtype == C.ulong(ptr.mlet));
    } else if (weap.spfx & C.SPFX_DFLAG1) {
        return Number((ptr.mflags1 & weap.mtype) != 0n);
    } else if (weap.spfx & C.SPFX_DFLAG2) {
        return Number(Boolean((ptr.mflags2 & weap.mtype)
                || (yours
                    && ((!C.Upolyd && (C.ulong(C.gu.urace.selfmask) & weap.mtype))
                        || ((weap.mtype & C.M2_WERE) && C.ismnum(C.u.ulycn))))));
    } else if (weap.spfx & C.SPFX_DALIGN) {
        return Number(Boolean(yours ? (C.u.ualign.type != weap.alignment)
                     : (ptr.maligntyp == C.A_NONE
                        || C.sgn(ptr.maligntyp) != weap.alignment)));
    } else if (weap.spfx & C.SPFX_ATTK) {
        if (C.defended(mtmp, C.int(weap.attk.adtyp)))
            return C.FALSE;

        switch (weap.attk.adtyp) {
        case C.AD_FIRE:
            return Number(!(yours ? C.Fire_resistance : C.resists_fire(mtmp)));
        case C.AD_COLD:
            return Number(!(yours ? C.Cold_resistance : C.resists_cold(mtmp)));
        case C.AD_ELEC:
            return Number(!(yours ? C.Shock_resistance : C.resists_elec(mtmp)));
        case C.AD_MAGM:
        case C.AD_STUN:
            return Number(!(yours ? C.Antimagic : ((C.rngCaller(1048, 'spec_applies'), C.rn2(100)) < ptr.mr)));
        case C.AD_DRST:
            return Number(!(yours ? C.Poison_resistance : C.resists_poison(mtmp)));
        case C.AD_DRLI:
            return Number(!(yours ? C.Drain_resistance : C.resists_drli(mtmp)));
        case C.AD_STON:
            return Number(!(yours ? C.Stone_resistance : C.resists_ston(mtmp)));
        default:
            C.impossible('Weird weapon special attack.');
        }
    }
    return 0;
}

/* return the M2 flags of monster that an artifact's special attacks apply
 * against */
export function spec_m2(otmp)
{
    let artifact = C.callLocal(get_artifact, otmp);

    if (artifact != C.artilist[C.ART_NONARTIFACT])
        return C.long(artifact.mtype);
    return 0n;
}

/* special attack bonus */
export function spec_abon(otmp, mon)
{
    let weap = C.callLocal(get_artifact, otmp);

    /* no need for an extra check for `NO_ATTK' because this will
       always return 0 for any artifact which has that attribute */

    if (weap != C.artilist[C.ART_NONARTIFACT]
            && weap.attk.damn && C.callLocal(spec_applies, weap, mon))
        return (C.rngCaller(1085, 'spec_abon'), C.rnd(C.int(weap.attk.damn)));
    return 0;
}

/* special damage bonus */
export function spec_dbon(otmp, mon, tmp)
{
    let weap = C.callLocal(get_artifact, otmp);

    if ((weap == C.artilist[C.ART_NONARTIFACT])
        || (weap.attk.adtyp == C.AD_PHYS /* check for `NO_ATTK' */
                  && weap.attk.damn == 0 && weap.attk.damd == 0))
        C.gs.spec_dbon_applies = C.FALSE;
    else if (C.callLocal(is_art, otmp, C.ART_GRIMTOOTH))
        /* Grimtooth has SPFX settings to warn against elves but we want its
           damage bonus to apply to all targets, so bypass spec_applies() */
        C.gs.spec_dbon_applies = C.TRUE;
    else
        C.gs.spec_dbon_applies = C.callLocal(spec_applies, weap, mon);

    if (C.gs.spec_dbon_applies)
        return weap.attk.damd ? (C.rngCaller(1107, 'spec_dbon'), C.rnd(C.int(weap.attk.damd))) : C.max(tmp, 1);
    return 0;
}

/* add identified artifact to discoveries list */
export function discover_artifact(m)
{
    let i;

    /* look for this artifact in the discoveries list;
       if we hit an empty slot then it's not present, so add it */
    for (i = 0; i < C.NROFARTIFACTS; i++)
        if (C.artidisco[i] == 0 || C.artidisco[i] == m) {
            C.artidisco[i] = m;
            return;
        }
    /* there is one slot per artifact, so we should never reach the
       end without either finding the artifact or an empty slot... */
    C.impossible("couldn't discover artifact (%d)", C.int(m));
}

/* used to decide whether an artifact has been fully identified */
export function undiscovered_artifact(m)
{
    let i;

    /* look for this artifact in the discoveries list;
       if we hit an empty slot then it's undiscovered */
    for (i = 0; i < C.NROFARTIFACTS; i++)
        if (C.artidisco[i] == m)
            return C.FALSE;
        else if (C.artidisco[i] == 0)
            break;
    return C.TRUE;
}

/* display a list of discovered artifacts; return their count */
/* supplied by dodiscover(); type is NHW_TEXT */
export function disp_artifact_discoveries(tmpwin)
{
    let i, m, otyp;
    let algnstr;
    let buf = C.stackAlloc(C.BUFSZ);

    for (i = 0; i < C.NROFARTIFACTS; i++) {
        if (C.artidisco[i] == 0)
            break; /* empty slot implies end of list */
        if (tmpwin == C.WIN_ERR)
            continue; /* for WIN_ERR, we just count */

        if (i == 0)
            C.putstr(tmpwin, C.iflags.menu_headings.attr, 'Artifacts');
        m = C.artidisco[i];
        otyp = C.artilist[m].otyp;
        algnstr = C.align_str(C.artilist[m].alignment);
        if (!C.strcmp(algnstr, 'unaligned'))
            algnstr = 'non-aligned';

        C.Sprintf(buf, '  %s [%s %s]', C.callLocal(artiname, m), algnstr, C.simple_typename(otyp));
        C.putstr(tmpwin, 0, buf);
    }
    return i;
}

/* (wizard mode only) show all artifacts and their flags */
/* 'tmpwin' here is a text window, not a menu */
export function dump_artifact_info(tmpwin)
{
    let m;
    let buf = C.stackAlloc(C.BUFSZ), buf2 = C.stackAlloc(C.BUFSZ);

    /* not a menu, but header uses same bold or whatever attribute as such */
    C.putstr(tmpwin, C.iflags.menu_headings.attr, 'Artifacts');
    for (m = 1; m <= C.NROFARTIFACTS; ++m) {
        C.nh_snprintf('dump_artifact_info', 1197, buf2, BigInt(C.BUFSZ),
                '[%s%s%s%s%s%s%s%s%s]', /* 9 bits overall */
                C.artiexist[m].exists ? 'exists;' : '',
                C.artiexist[m].found ? ' hero knows;' : '',
                /* .exists and .found have different punctuation because
                   they're expected to be combined with one of these */
                C.artiexist[m].gift ? ' gift' : '',
                C.artiexist[m].wish ? ' wish' : '',
                C.artiexist[m].named ? ' named' : '',
                C.artiexist[m].viadip ? ' viadip' : '',
                C.artiexist[m].lvldef ? ' lvldef' : '',
                C.artiexist[m].bones ? ' bones' : '',
                C.artiexist[m].rndm ? ' random' : '');
        /* #if 0 menu branch is not configured for this text window. */
        /* "The Platinum Yendorian Express Card" is 35 characters */
        C.nh_snprintf('dump_artifact_info', 1204, buf, BigInt(C.BUFSZ),
            '  %-36.36s%s', C.callLocal(artiname, m), buf2);
        C.putstr(tmpwin, 0, buf);
    }
    return;
}

/*
 * Magicbane's intrinsic magic is incompatible with normal
 * enchantment magic.  Thus, its effects have a negative
 * dependence on spe.  Against low mr victims, it typically
 * does "double athame" damage, 2d4.  Occasionally, it will
 * cast unbalancing magic which effectively averages out to
 * 4d4 damage (3d4 against high mr victims), for spe = 0.
 *
 * Prior to 3.4.1, the cancel (aka purge) effect always
 * included the scare effect too; now it's one or the other.
 * Likewise, the stun effect won't be combined with either
 * of those two; it will be chosen separately or possibly
 * used as a fallback when scare or cancel fails.
 *
 * [Historical note: a change to artifact_hit() for 3.4.0
 * unintentionally made all of Magicbane's special effects
 * be blocked if the defender successfully saved against a
 * stun attack.  As of 3.4.1, those effects can occur but
 * will be slightly less likely than they were in 3.3.x.]
 */
/* rolls above this aren't magical */
/* called when someone is being hit by Magicbane */
/* attacker */
/* defender */
/* Magicbane */
/* extra damage target will suffer */
/* d20 that has already scored a hit */
/* whether the action can be seen */
/* target's name: "you" or mon_nam(mdef) */
/* no message given yet */
/* the most severe effects are less likely at higher enchantment */
/* if target successfully resisted the artifact damage bonus,
       reduce overall likelihood of the assorted special effects */
/* might stun even when attempting a more severe effect, but
       in that case it will only happen if the other effect fails;
       extra damage will apply regardless; 3.4.1: sometimes might
       just probe even when it hasn't been enchanted */
/* the special effects also boost physical damage; increments are
       generally cumulative, but since the stun effect is based on a
       different criterium its damage might not be included; the base
       damage is either 1d4 (athame) or 2d4 (athame+spec_dbon) depending
       on target's resistance check against AD_STUN (handled by caller)
       [note that a successful save against AD_STUN doesn't actually
       prevent the target from ending up stunned] */
/* (2..3)d4 */
/* (3..4)d4 */
/* (3..5)d4 */
/* (4..6)d4 */
/* give the hit message prior to inflicting the effects */
/* assume probing has some sort of noticeable feedback
           even if it is being done by one monster to another */
/* now perform special effects */
/* No mdef->mcan check: even a cancelled monster can be polymorphed
         * into a golem, and the "cancel" effect acts as if some magical
         * energy remains in spellcasting defenders to be absorbed later.
         */
/* rehumanized, so no more damage */
/* canceled shapeshifter/vamp may have changed forms, so
                   update its name if necessary */
/* cancelled clay golems will die */
/* (this is redundant...) */
/* pre-damage status */
/* stun if that was selected and a worse effect didn't occur */
/* avoid extra stun message below if we used mb_verb["stun"] above */
/* lastly, all this magic can be confusing... */
/* now give message(s) describing side-effects; Use fakename
       so vtense() won't be fooled by assigned name ending in 's' */
/* capitalize */
export function Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee)
{
    let old_mdat, verb;
    let youattack = Number(magr == C.gy.youmonst);
    let youdefend = Number(mdef == C.gy.youmonst);
    let resisted = 0, do_stun, do_confuse, result;
    let attack_indx, fakeidx, scare_dieroll = Math.trunc(MB_MAX_DIEROLL / 2);
    result = 0;
    if (mb.spe >= 3) scare_dieroll = Math.trunc(scare_dieroll / (1 << Math.trunc(mb.spe / 3)));
    if (!C.gs.spec_dbon_applies) dieroll += 1;
    do_stun = Number(C.max(mb.spe, 0) < (C.rngCaller(1277, 'Mb_hit'), C.rn2(C.gs.spec_dbon_applies ? 11 : 7)));
    attack_indx = MB_INDEX_PROBE;
    dmgptr.value += (C.rngCaller(1287, 'Mb_hit'), C.rnd(4));
    if (do_stun) {
        attack_indx = MB_INDEX_STUN;
        dmgptr.value += (C.rngCaller(1290, 'Mb_hit'), C.rnd(4));
    }
    if (dieroll <= scare_dieroll) {
        attack_indx = MB_INDEX_SCARE;
        dmgptr.value += (C.rngCaller(1294, 'Mb_hit'), C.rnd(4));
    }
    if (dieroll <= Math.trunc(scare_dieroll / 2)) {
        attack_indx = MB_INDEX_CANCEL;
        dmgptr.value += (C.rngCaller(1298, 'Mb_hit'), C.rnd(4));
    }
    verb = mb_verb[Number(Boolean(C.Hallucination))][attack_indx];
    if (youattack || youdefend || vis) {
        result = 1;
        C.pline_The('magic-absorbing blade %s %s!', C.vtense(0, verb), hittee);
        if (attack_indx == MB_INDEX_PROBE && !C.canspotmon(mdef)) C.map_invisible(mdef.mx, mdef.my);
    }
    switch (attack_indx) {
    case MB_INDEX_CANCEL:
        old_mdat = youdefend ? C.gy.youmonst.data : mdef.data;
        if (!C.cancel_monst(mdef, mb, youattack, 0, 0)) resisted = 1;
        else {
            do_stun = 0;
            if (youdefend) {
                if (C.gy.youmonst.data != old_mdat) dmgptr.value = 0;
                if (C.u.uenmax > 0) {
                    C.u.uenmax--;
                    if (C.u.uen > 0) C.u.uen--;
                    C.disp.botl = 1;
                    C.You('lose magical energy!');
                }
            } else {
                if (mdef.data != old_mdat) C.Strcpy(hittee, C.mon_nam(mdef));
                if (mdef.data == C.mons[C.PM_CLAY_GOLEM]) mdef.mhp = 1;
                if (youattack && C.attacktype(mdef.data, C.AT_MAGC)) {
                    C.u.uenmax++;
                    if (C.u.uenmax > C.u.uenpeak) C.u.uenpeak = C.u.uenmax;
                    C.u.uen++;
                    C.disp.botl = 1;
                    C.You('absorb magical energy!');
                }
            }
        }
        break;
    case MB_INDEX_SCARE:
        if (youdefend) {
            if (C.Antimagic) resisted = 1;
            else {
                C.nomul(-3);
                C.gm.multi_reason = 'being scared stiff';
                C.gn.nomovemsg = '';
                if (magr && magr == C.u.ustuck && C.sticks(C.gy.youmonst.data)) {
                    C.set_ustuck(0);
                    C.You('release %s!', C.mon_nam(magr));
                }
            }
        } else {
            if ((C.rngCaller(1368, 'Mb_hit'), C.rn2(2)) && C.resist(mdef, C.WEAPON_CLASS, 0, C.NOTELL))
                resisted = 1;
            else C.monflee(mdef, 3, 0, Number(mdef.mhp > dmgptr.value));
        }
        if (!resisted) do_stun = 0;
        break;
    case MB_INDEX_STUN: do_stun = 1; break;
    case MB_INDEX_PROBE:
        if (youattack && (mb.spe == 0 || !(C.rngCaller(1382, 'Mb_hit'), C.rn2(3 * C.abs(mb.spe))))) {
            C.pline_The('%s is insightful.', verb);
            C.probe_monster(mdef);
        }
        break;
    }
    if (do_stun) {
        if (youdefend) C.make_stunned((C.HStun & C.TIMEOUT) + 3n, 0);
        else mdef.mstun = 1;
        if (attack_indx == MB_INDEX_STUN) do_stun = 0;
    }
    do_confuse = Number(!(C.rngCaller(1400, 'Mb_hit'), C.rn2(12)));
    if (do_confuse) {
        if (youdefend) C.make_confused((C.HConfusion & C.TIMEOUT) + 4n, 0);
        else mdef.mconf = 1;
    }
    fakeidx = youdefend ? 1 : 0;
    if (youattack || youdefend || vis) {
        C.upstart(hittee);
        if (resisted) {
            C.pline('%s %s!', hittee, C.vtense(C.fakename[fakeidx], 'resist'));
            C.shieldeff(youdefend ? C.u.ux : mdef.mx, youdefend ? C.u.uy : mdef.my);
        }
        if ((do_stun || do_confuse) && C.flags.verbose) {
            let buf = C.stackAlloc(C.BUFSZ);
            C.storeChar(buf, 0);
            if (do_stun) C.Strcat(buf, 'stunned');
            if (do_stun && do_confuse) C.Strcat(buf, ' and ');
            if (do_confuse) C.Strcat(buf, 'confused');
            C.pline('%s %s %s%c', hittee, C.vtense(C.fakename[fakeidx], 'are'), buf,
                do_stun && do_confuse ? 33 : 46);
        }
    }
    return result;
}

/* Function used when someone attacks someone else with an artifact
 * weapon.  Only adds the special (artifact) damage, and returns a 1 if it
 * did something special (in which case the caller won't print the normal
 * hit message).  This should be called once upon every artifact attack;
 * dmgval() no longer takes artifact bonuses into account.  Possible
 * extension: change the killer so that when an orc kills you with
 * Stormbringer it's "killed by Stormbringer" instead of "killed by an orc".
 */
/* attacker; might be Null if 'mdef' is youmonst */
/* defender */
/* artifact weapon */
/* output */
/* needed for Magicbane and vorpal blades */
/* The following takes care of most of the damage, but not all--
     * the exception being for level draining, which is specially
     * handled.  Messages are done in this function, however.
     */
/* feel the effect even if not seen */
/* the four basic attacks: fire, cold, shock and missiles */
/* item destruction dmg */
/* item destruction dmg */
/* item destruction dmg */
/* Magicbane's special attacks (possibly modifies hittee[]) */
/* since damage bonus didn't apply, nothing more to do;
           no further attacks have side-effects on inventory */
/* We really want "on a natural 20" but Nethack does it in */
/* reverse from AD&D. */
/* not really beheading, but so close, why add another SPFX */
/* allow normal cutworm() call to add extra damage */
/* Players with negative AC's take less damage instead
                 * of just not getting hit.  We must add a large enough
                 * value to the damage so that this reduction in
                 * damage does not prevent death.
                 */
/* Should amulets fall off? */
/* some non-living creatures (golems, vortices) are vulnerable to
           life drain effects so can get "<Arti> draws the <life>" feedback */
/* will be 0 for 1d4 mon */
/* usually 1d8 */
/* note: DRLI attack uses 2d6, attacker doesn't get healed */
/* stop draining HP if it drops too low (still drains level;
               also caller still inflicts regular weapon damage) */
/* call distant_name() for possible side-effects even if
                   the result won't be printed */
/* losing a level when at 0 is fatal */
/* drain: was target's damage, now heal attacker by half */
/* drain/2 rounded up */
/* youdefend */
/* call distant_name() for possible side-effects even if
                   the result won't be printed */
export function artifact_hit(magr, mdef, otmp, dmgptr, dieroll)
{
    let youattack = Number(magr == C.gy.youmonst);
    let youdefend = Number(mdef == C.gy.youmonst);
    let vis = Number(Boolean((!youattack && magr && C.cansee(magr.mx, magr.my))
        || (!youdefend && C.cansee(mdef.mx, mdef.my))
        || (youattack && C.engulfing_u(mdef) && !C.Blind)));
    let realizes_damage, wepdesc;
    const you = 'you';
    let hittee = C.stackAlloc(C.BUFSZ);
    C.Strcpy(hittee, youdefend ? you : C.mon_nam(mdef));
    dmgptr.value += C.callLocal(spec_dbon, otmp, mdef, dmgptr.value);
    if (youattack && youdefend) { C.impossible('attacking yourself with weapon?'); return 0; }
    realizes_damage = Number(Boolean(youdefend || vis || (youattack && mdef == C.u.ustuck)));
    if (C.callLocal(attacks, C.AD_FIRE, otmp)) {
        if (realizes_damage)
            C.pline_The('fiery blade %s %s%c', !C.gs.spec_dbon_applies ? 'hits'
                : mdef.data == C.mons[C.PM_WATER_ELEMENTAL] ? 'vaporizes part of' : 'burns',
                hittee, !C.gs.spec_dbon_applies ? 46 : 33);
        if (!(C.rngCaller(1491, 'artifact_hit'), C.rn2(4))) {
            let itemdmg = C.destroy_items(mdef, C.AD_FIRE, dmgptr.value);
            if (!youdefend) dmgptr.value += itemdmg;
            C.ignite_items(mdef.minvent);
        }
        if (youdefend && C.Slimed) C.burn_away_slime();
        return realizes_damage;
    }
    if (C.callLocal(attacks, C.AD_COLD, otmp)) {
        if (realizes_damage)
            C.pline_The('ice-cold blade %s %s%c', !C.gs.spec_dbon_applies ? 'hits' : 'freezes',
                hittee, !C.gs.spec_dbon_applies ? 46 : 33);
        if (!(C.rngCaller(1506, 'artifact_hit'), C.rn2(4))) {
            let itemdmg = C.destroy_items(mdef, C.AD_COLD, dmgptr.value);
            if (!youdefend) dmgptr.value += itemdmg;
        }
        return realizes_damage;
    }
    if (C.callLocal(attacks, C.AD_ELEC, otmp)) {
        if (realizes_damage)
            C.pline_The('massive hammer hits%s %s%c', !C.gs.spec_dbon_applies ? '' : '!  Lightning strikes',
                hittee, !C.gs.spec_dbon_applies ? 46 : 33);
        if (C.gs.spec_dbon_applies) C.wake_nearto(mdef.mx, mdef.my, 4 * 4);
        if (!(C.rngCaller(1520, 'artifact_hit'), C.rn2(5))) {
            let itemdmg = C.destroy_items(mdef, C.AD_ELEC, dmgptr.value);
            if (!youdefend) dmgptr.value += itemdmg;
        }
        return realizes_damage;
    }
    if (C.callLocal(attacks, C.AD_MAGM, otmp)) {
        if (realizes_damage)
            C.pline_The('imaginary widget hits%s %s%c', !C.gs.spec_dbon_applies ? ''
                : '!  A hail of magic missiles strikes', hittee, !C.gs.spec_dbon_applies ? 46 : 33);
        return realizes_damage;
    }
    if (C.callLocal(attacks, C.AD_STUN, otmp) && dieroll <= MB_MAX_DIEROLL)
        return C.callLocal(Mb_hit, magr, mdef, otmp, dmgptr, dieroll, vis, hittee);
    if (!C.gs.spec_dbon_applies) return 0;
    if (C.callLocal(spec_ability, otmp, C.SPFX_BEHEAD)) {
        if (C.callLocal(is_art, otmp, C.ART_TSURUGI_OF_MURAMASA) && dieroll == 1) {
            wepdesc = 'The razor-sharp blade';
            if (youattack && C.engulfing_u(mdef)) {
                C.You('slice %s wide open!', C.mon_nam(mdef));
                dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                return 1;
            }
            if (!youdefend) {
                if (C.gn.notonhead) return 0;
                if (C.bigmonst(mdef.data)) {
                    if (youattack) C.You('slice deeply into %s!', C.mon_nam(mdef));
                    else if (vis) C.pline('%s cuts deeply into %s!', C.Monnam(magr), hittee);
                    dmgptr.value *= 2;
                    return 1;
                }
                dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                C.pline('%s cuts %s in half!', wepdesc, C.mon_nam(mdef));
                C.observe_object(otmp);
                return 1;
            } else {
                if (C.bigmonst(C.gy.youmonst.data)) {
                    C.pline('%s cuts deeply into you!', magr ? C.Monnam(magr) : wepdesc);
                    dmgptr.value *= 2;
                    return 1;
                }
                dmgptr.value = 2 * (C.Upolyd ? C.u.mh : C.u.uhp) + FATAL_DAMAGE_MODIFIER;
                C.pline('%s cuts you in half!', wepdesc);
                C.observe_object(otmp);
                return 1;
            }
        } else if (C.callLocal(is_art, otmp, C.ART_VORPAL_BLADE)
            && (dieroll == 1 || mdef.data == C.mons[C.PM_JABBERWOCK])) {
            const behead_msg = ['%s beheads %s!', '%s decapitates %s!'];
            if (youattack && C.engulfing_u(mdef)) return 0;
            wepdesc = C.artilist[C.ART_VORPAL_BLADE].name;
            if (!youdefend) {
                if (!C.has_head(mdef.data) || C.gn.notonhead || C.u.uswallow) {
                    if (youattack) C.pline('Somehow, you miss %s wildly.', C.mon_nam(mdef));
                    else if (vis) C.pline('Somehow, %s misses wildly.', C.mon_nam(magr));
                    dmgptr.value = 0;
                    return Number(Boolean(youattack || vis));
                }
                if (C.noncorporeal(mdef.data) || C.amorphous(mdef.data)) {
                    C.pline('%s slices through %s %s.', wepdesc, C.s_suffix(C.mon_nam(mdef)), C.mbodypart(mdef, C.NECK));
                    return 1;
                }
                dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
                C.pline(behead_msg[(C.rngCaller(1618, 'artifact_hit'), C.rn2(C.SIZE(behead_msg)))], wepdesc, C.mon_nam(mdef));
                if (C.Hallucination && !C.flags.female) C.pline("Good job Henry, but that wasn't Anne.");
                C.observe_object(otmp);
                return 1;
            } else {
                if (!C.has_head(C.gy.youmonst.data)) {
                    C.pline('Somehow, %s misses you wildly.', magr ? C.mon_nam(magr) : wepdesc);
                    dmgptr.value = 0;
                    return 1;
                }
                if (C.noncorporeal(C.gy.youmonst.data) || C.amorphous(C.gy.youmonst.data)) {
                    C.pline('%s slices through your %s.', wepdesc, C.body_part(C.NECK));
                    return 1;
                }
                dmgptr.value = 2 * (C.Upolyd ? C.u.mh : C.u.uhp) + FATAL_DAMAGE_MODIFIER;
                C.pline(behead_msg[(C.rngCaller(1638, 'artifact_hit'), C.rn2(C.SIZE(behead_msg)))], wepdesc, 'you');
                C.observe_object(otmp);
                return 1;
            }
        }
    }
    if (C.callLocal(spec_ability, otmp, C.SPFX_DRLI)) {
        let life = C.nonliving(mdef.data) ? 'animating force' : 'life';
        if (!youdefend) {
            let m_lev = C.int(mdef.m_lev), mhpmax = mdef.mhpmax;
            let drain = C.monhp_per_lvl(mdef);
            if (mhpmax - drain <= m_lev) drain = mhpmax > m_lev ? mhpmax - (m_lev + 1) : 0;
            if (vis) {
                let otmpname = C.distant_name(otmp, C.xname);
                if (C.callLocal(is_art, otmp, C.ART_STORMBRINGER))
                    C.pline_The('%s blade draws the %s from %s!', C.hcolor(C.NH_BLACK), life, C.mon_nam(mdef));
                else C.pline('%s draws the %s from %s!', C.The(otmpname), life, C.mon_nam(mdef));
            }
            if (mdef.m_lev == 0) dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
            else { dmgptr.value += drain; mdef.mhpmax -= drain; mdef.m_lev--; }
            if (drain > 0) {
                drain = Math.trunc((drain + 1) / 2);
                if (youattack) C.healup(drain, 0, 0, 0);
                else {
                    if (!magr) C.__assert_fail('magr != 0', 'artifact.c', 1688, 'artifact_hit');
                    C.healmon(magr, drain, 0);
                }
            }
            return vis;
        } else {
            let oldhpmax = C.u.uhpmax;
            if (C.Blind) C.You_feel('an %s drain your %s!',
                C.callLocal(is_art, otmp, C.ART_STORMBRINGER) ? 'unholy blade' : 'object', life);
            else {
                let otmpname = C.distant_name(otmp, C.xname);
                if (C.callLocal(is_art, otmp, C.ART_STORMBRINGER))
                    C.pline_The('%s blade drains your %s!', C.hcolor(C.NH_BLACK), life);
                else C.pline('%s drains your %s!', C.The(otmpname), life);
            }
            C.losexp('life drainage');
            if (magr && magr.mhp < magr.mhpmax) C.healmon(magr, Math.trunc((C.abs(oldhpmax - C.u.uhpmax) + 1) / 2), 0);
            return 1;
        }
    }
    return 0;
}

/* getobj callback for object to be invoked */
/* artifacts and other special items */
/* synonym for apply, though actually invoking it will do different things
     * depending if it's a regular crystal ball, an artifact one that has an
     * invoke power, and a (theoretical) artifact one that doesn't have an
     * invoke power */
export function invoke_ok(obj)
{
    if (!obj) return C.GETOBJ_EXCLUDE;
    if (obj.oartifact || C.objects[obj.otyp].oc_unique
        || (obj.otyp == C.FAKE_AMULET_OF_YENDOR && !obj.known))
        return C.GETOBJ_SUGGEST;
    if (obj.otyp == C.CRYSTAL_BALL) return C.GETOBJ_SUGGEST;
    return C.GETOBJ_EXCLUDE;
}

/* the #invoke command */
export function doinvoke()
{
    let obj = C.getobj('invoke', invoke_ok, C.GETOBJ_PROMPT);
    if (!obj) return C.ECMD_CANCEL;
    if (!C.callLocal(retouch_object, C.localPointer('struct obj *', () => obj, v => obj = v), 0))
        return C.ECMD_TIME;
    return C.callLocal(arti_invoke, obj);
}

export function nothing_special(obj)
{
    if (C.carried(obj)) C.You_feel('a surge of power, but nothing seems to happen.');
}

/* neither cursed nor blessed, zero oextra too */
export function invoke_taming(obj)
{
    let pseudo = C.recordLocal('obj', C.cg.zeroobj);
    pseudo.otyp = C.SCR_TAMING;
    C.seffects(pseudo);
    return C.ECMD_TIME;
}

/* when healing temporary blindness (aside from
                     goop covering face), might still be blind
                     due to PermaBlind or eyeless polymorph;
                     vary the message in that situation */
export function invoke_healing(obj)
{
    let healamt = Math.trunc((C.u.uhpmax + 1 - C.u.uhp) / 2);
    let creamed = BigInt(C.u.ucreamed);
    if (C.Upolyd) healamt = Math.trunc((C.u.mhmax + 1 - C.u.mh) / 2);
    if (healamt || C.Sick || C.Slimed || C.Blinded > creamed) C.You_feel('better.');
    if (healamt || C.Sick || C.Slimed || C.BlindedTimeout > creamed)
        C.You_feel('%sbetter.', (!healamt && !C.Sick && !C.Slimed
            && (C.HBlinded & ~C.TIMEOUT) != 0n) ? 'slightly ' : '');
    else { C.callLocal(nothing_special, obj); return C.ECMD_TIME; }
    if (healamt > 0) {
        if (C.Upolyd) C.u.mh += healamt;
        else C.u.uhp += healamt;
    }
    if (C.Sick) C.make_sick(0n, 0, 0, C.SICK_ALL);
    if (C.Slimed) C.make_slimed(0n, 0);
    if (C.BlindedTimeout > creamed) C.make_blinded(creamed, 0);
    C.disp.botl = 1;
    return C.ECMD_TIME;
}

/* arbitrary */
export function invoke_energy_boost(obj)
{
    let epboost = Math.trunc((C.u.uenmax + 1 - C.u.uen) / 2);
    if (epboost > 120) epboost = 120;
    else if (epboost < 12) epboost = C.u.uenmax - C.u.uen;
    if (epboost) {
        C.u.uen += epboost;
        C.disp.botl = 1;
        C.You_feel('re-energized.');
    } else { C.callLocal(nothing_special, obj); return C.ECMD_TIME; }
    return C.ECMD_TIME;
}

/* don't charge for changing their mind */
export function invoke_untrap(obj)
{
    if (!C.untrap(1, 0, 0, 0)) { obj.age = 0n; return C.ECMD_CANCEL; }
    return C.ECMD_TIME;
}

export function invoke_charge_obj(obj)
{
    let oart = C.callLocal(get_artifact, obj);
    let otmp = C.getobj('charge', C.charge_ok, C.GETOBJ_PROMPT | C.GETOBJ_ALLOWCNT);
    let b_effect;
    if (!otmp) { obj.age = 0n; return C.ECMD_CANCEL; }
    b_effect = Number(Boolean(obj.blessed && (oart.role == C.Role_switch || oart.role == C.NON_PM)));
    C.recharge(otmp, b_effect ? 1 : obj.cursed ? -1 : 0);
    C.update_inventory();
    return C.ECMD_TIME;
}

/* set all bits to zero */
/* use index+1 (can't use 0) as identifier */
/* can't portal into tutorial */
/* more than one entry; display menu for choices */
/* also first & only OK dungeon */
/*
     * i is now index into dungeon structure for the new dungeon.
     * Find the closest level in the given dungeon, open
     * a use-once portal to that dungeon and go there.
     * The closest level is either the entry or dunlev_ureached.
     */
export function invoke_create_portal(obj)
{
    let i, num_ok_dungeons, last_ok_dungeon = 0;
    let newlev = C.recordLocal('d_level');
    let tmpwin = C.create_nhwindow(C.NHW_MENU);
    let any = C.recordLocal('any', C.cg.zeroany);
    let clr = C.NO_COLOR;
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    for (i = num_ok_dungeons = 0; i < C.svn.n_dgns; i++) {
        if (!C.svd.dungeons[i].dunlev_ureached) continue;
        if (i == C.tutorial_dnum) continue;
        any.a_int = i + 1;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, clr,
            C.svd.dungeons[i].dname, C.MENU_ITEMFLAGS_NONE);
        num_ok_dungeons++;
        last_ok_dungeon = i;
    }
    C.end_menu(tmpwin, 'Open a portal to which dungeon?');
    if (num_ok_dungeons > 1) {
        let selected;
        let n = C.select_menu(tmpwin, C.PICK_ONE,
            C.localPointer('menu_item *', () => selected, v => selected = v));
        if (n <= 0) {
            C.destroy_nhwindow(tmpwin);
            C.callLocal(nothing_special, obj);
            return C.ECMD_TIME;
        }
        i = C.view('mi', selected).item.a_int - 1;
        C.free(selected);
    } else i = last_ok_dungeon;
    C.destroy_nhwindow(tmpwin);
    newlev.dnum = i;
    if (C.svd.dungeons[i].depth_start >= C.depth(C.u.uz))
        newlev.dlevel = C.svd.dungeons[i].entry_lev;
    else newlev.dlevel = C.svd.dungeons[i].dunlev_ureached;
    if (C.u.uhave.amulet || C.In_endgame(C.u.uz) || C.In_endgame(newlev)
        || newlev.dnum == C.u.uz.dnum || !C.next_to_u()) {
        C.You_feel('very disoriented for a moment.');
    } else {
        if (!C.Blind) C.You('are surrounded by a shimmering sphere!');
        else C.You_feel('weightless for a moment.');
        C.goto_level(newlev, 0, 0, 0);
    }
    return C.ECMD_TIME;
}

export function invoke_create_ammo(obj)
{
    let otmp = C.mksobj(C.ARROW, 1, 0);
    if (!otmp) { C.callLocal(nothing_special, obj); return C.ECMD_TIME; }
    otmp.blessed = obj.blessed;
    otmp.cursed = obj.cursed;
    otmp.bknown = obj.bknown;
    otmp.oeroded = otmp.oeroded2 = 0;
    if (obj.blessed) {
        if (otmp.spe < 0) otmp.spe = 0;
        otmp.quan += BigInt((C.rngCaller(1949, 'invoke_create_ammo'), C.rnd(10)));
    } else if (obj.cursed) {
        if (otmp.spe > 0) otmp.spe = 0;
    } else otmp.quan += BigInt((C.rngCaller(1954, 'invoke_create_ammo'), C.rnd(5)));
    otmp.owt = C.weight(otmp);
    otmp = C.hold_another_object(otmp, 'Suddenly %s out.', C.aobjnam(otmp, 'fall'), 0);
    C.nhUse(otmp);
    return C.ECMD_TIME;
}

/* banish to a random level in Gehennom */
/* remove 's' */
export function invoke_banish(obj)
{
    let nvanished = 0, nstayed = 0;
    let mtmp, mtmp2;
    let dest = C.recordLocal('d_level');
    C.find_hell(dest);
    for (mtmp = C.fmon; mtmp; mtmp = mtmp2) {
        let chance = 1;
        mtmp2 = mtmp.nmon;
        if (C.DEADMONSTER(mtmp) || !C.isok(mtmp.mx, mtmp.my)) continue;
        if (!C.is_demon(mtmp.data) && mtmp.data.mlet != C.S_IMP) continue;
        if (!C.couldsee(mtmp.mx, mtmp.my)) continue;
        if (mtmp.data.msound == C.MS_NEMESIS) continue;
        if (C.In_quest(C.u.uz) && !C.svq.quest_status.killed_nemesis) chance += 10;
        if (C.is_dprince(mtmp.data)) chance += 2;
        if (C.is_dlord(mtmp.data)) chance++;
        mtmp.msleeping = mtmp.mtame = mtmp.mpeaceful = 0;
        if (chance <= 1 || !(C.rngCaller(1992, 'invoke_banish'), C.rn2(chance))) {
            if (!C.Inhell) {
                nvanished++;
                dest.dlevel = (C.rngCaller(1996, 'invoke_banish'), C.rn2(C.dunlevs_in_dungeon(dest)));
                C.migrate_mon(mtmp, C.ledger_no(dest), C.MIGR_RANDOM);
            } else C.u_teleport_mon(mtmp, 0);
        } else nstayed++;
    }
    if (nvanished) {
        let subject = C.stackAlloc(7);
        C.Strcpy(subject, 'demons');
        if (nvanished == 1) C.storeChar(C.eos(subject) - 1n, 0);
        C.pline('%s %s %s in a cloud of brimstone!',
            nstayed ? (nvanished > nstayed ? 'Most of the' : 'Some of the') : 'The',
            subject, C.vtense(subject, 'disappear'));
    }
    return C.ECMD_TIME;
}

/* the poison is yours */
/* no direction picked */
export function invoke_fling_poison(obj)
{
    if (C.getdir(0)) {
        let venom = (C.rngCaller(2025, 'invoke_fling_poison'), C.rn2(2)) ? C.BLINDING_VENOM : C.ACID_VENOM;
        let otmp = C.mksobj(venom, 1, 0);
        otmp.spe = 1;
        C.throwit(otmp, 0n, 0, 0);
    } else {
        C.pline('%s', C.Never_mind);
        obj.age = C.svm.moves;
        return C.ECMD_CANCEL;
    }
    return C.ECMD_TIME;
}

export function invoke_storm_spell(obj)
{
    let oart = C.callLocal(get_artifact, obj);
    let storm = oart.inv_prop == C.SNOWSTORM ? C.SPE_CONE_OF_COLD : C.SPE_FIREBALL;
    let skill = C.spell_skilltype(storm);
    let expertise = C.u.weapon_skills[skill].skill;
    C.u.weapon_skills[skill].skill = C.P_EXPERT;
    C.spelleffects(storm, 0, 1);
    C.u.weapon_skills[skill].skill = expertise;
    return C.ECMD_TIME;
}

/* up or down => light this map spot; litroom() uses
               radius 0 for Sunsword, except on Rogue level where
               whole room gets lit and corridor spots remain unlit */
/* zapyourself() */
/* could be fatal if Unchanging */
/* no direction picked */
export function invoke_blinding_ray(obj)
{
    if (C.getdir(0)) {
        if (C.u.dx || C.u.dy) C.do_blinding_ray(obj);
        else if (C.u.dz) {
            C.litroom(1, obj);
            C.pline('%s', ((!C.Blind && C.levl[C.u.ux][C.u.uy].lit
                && !C.levl[C.u.ux][C.u.uy].waslit) ? 'It is lit here now.' : C.nothing_seems_to_happen));
        } else {
            let vulnerable = Number(C.u.umonnum == C.PM_GREMLIN);
            let damg = obj.blessed ? 15 : !obj.cursed ? 10 : 5;
            if (vulnerable) C.lightdamage(obj, 1, 2 * damg);
            if (!C.flashburn(BigInt(damg + (C.rngCaller(2075, 'invoke_blinding_ray'), C.rnd(damg))), 0)
                && !vulnerable) C.pline('%s', C.nothing_seems_to_happen);
        }
    } else {
        C.pline('%s', C.Never_mind);
        obj.age = C.svm.moves;
        return C.ECMD_CANCEL;
    }
    return C.ECMD_TIME;
}

/* return the amount of Pw invoking an object costs.
   return a negative value, if obj invoking cannot be paid with Pw */
/* pretend it's a level 5 spell */
export function arti_invoke_cost_pw(obj)
{
    let oart = C.callLocal(get_artifact, obj);
    if (oart.inv_prop == C.FLING_POISON || oart.inv_prop == C.BLINDING_RAY)
        return C.SPELL_LEV_PW(5);
    return -1;
}

/* return TRUE if artifact object's invoke cost can be paid (and pay it) */
/* the artifact is tired :-) */
/* and just got more so; patience is essential... */
/* you pay invoke cost with your own magic */
export function arti_invoke_cost(obj)
{
    if (obj.age > C.svm.moves) {
        let pw_cost = C.callLocal(arti_invoke_cost_pw, obj);
        if (pw_cost < 0 || C.u.uen < pw_cost) {
            C.You_feel('that %s %s ignoring you.', C.the(C.xname(obj)), C.otense(obj, 'are'));
            obj.age += BigInt((C.rngCaller(2116, 'arti_invoke_cost'), C.d(3, 10)));
            return 0;
        } else {
            C.You_feel('drained...');
            C.u.uen -= pw_cost;
            C.disp.botl = 1;
        }
    } else obj.age = C.svm.moves + BigInt((C.rngCaller(2125, 'arti_invoke_cost'), C.rnz(100)));
    return 1;
}

/* It's a special power, not "just" a property */
/*FALLTHRU*/
/* true if prop just set */
/* the artifact is tired :-) */
/* can't just keep repeatedly trying */
/* when turning off property, determine downtime */
/* arbitrary for now until we can tune this -dlc */
/* you had the property from some other source too */
export function arti_invoke(obj)
{
    let oart;
    let res = C.ECMD_OK;
    if (!obj) { C.impossible('arti_invoke without obj'); return C.ECMD_OK; }
    oart = C.callLocal(get_artifact, obj);
    if (oart == C.artilist[C.ART_NONARTIFACT] || !oart.inv_prop) {
        if (obj.otyp == C.CRYSTAL_BALL)
            C.use_crystal_ball(C.localPointer('struct obj *', () => obj, v => obj = v));
        else C.pline1(C.nothing_happens);
        return C.ECMD_TIME;
    }
    if (oart.inv_prop > C.LAST_PROP) {
        if (!C.callLocal(arti_invoke_cost, obj)) return C.ECMD_TIME;
        switch (oart.inv_prop) {
        case C.TAMING: res = C.callLocal(invoke_taming, obj); break;
        case C.HEALING: res = C.callLocal(invoke_healing, obj); break;
        case C.ENERGY_BOOST: res = C.callLocal(invoke_energy_boost, obj); break;
        case C.UNTRAP: res = C.callLocal(invoke_untrap, obj); break;
        case C.CHARGE_OBJ: res = C.callLocal(invoke_charge_obj, obj); break;
        case C.LEV_TELE: C.level_tele(); res = C.ECMD_TIME; break;
        case C.CREATE_PORTAL: res = C.callLocal(invoke_create_portal, obj); break;
        case C.ENLIGHTENING: C.enlightenment(C.MAGICENLIGHTENMENT, C.ENL_GAMEINPROGRESS); res = C.ECMD_TIME; break;
        case C.CREATE_AMMO: res = C.callLocal(invoke_create_ammo, obj); break;
        case C.BANISH: res = C.callLocal(invoke_banish, obj); break;
        case C.FLING_POISON: res = C.callLocal(invoke_fling_poison, obj); break;
        case C.SNOWSTORM:
        case C.FIRESTORM: res = C.callLocal(invoke_storm_spell, obj); break;
        case C.BLINDING_RAY: res = C.callLocal(invoke_blinding_ray, obj); break;
        default: C.impossible('Unknown invoke power %d.', oart.inv_prop); break;
        }
        return res;
    } else {
        let eprop = C.u.uprops[oart.inv_prop].extrinsic ^= C.W_ARTI;
        let iprop = C.u.uprops[oart.inv_prop].intrinsic;
        let on = Number((eprop & C.W_ARTI) != 0n);
        if (on && obj.age > C.svm.moves) {
            C.u.uprops[oart.inv_prop].extrinsic ^= C.W_ARTI;
            C.You_feel('that %s %s ignoring you.', C.the(C.xname(obj)), C.otense(obj, 'are'));
            obj.age += BigInt((C.rngCaller(2189, 'arti_invoke'), C.d(3, 10)));
            return C.ECMD_TIME;
        } else if (!on) obj.age = C.svm.moves + BigInt((C.rngCaller(2194, 'arti_invoke'), C.rnz(100)));
        if ((eprop & ~C.W_ARTI) || iprop) { C.callLocal(nothing_special, obj); return C.ECMD_TIME; }
        switch (oart.inv_prop) {
        case C.CONFLICT:
            if (on) C.You_feel('like a rabble-rouser.');
            else C.You_feel('the tension decrease around you.');
            break;
        case C.LEVITATION:
            if (on) { C.float_up(); C.spoteffects(0); }
            else C.float_down(C.I_SPECIAL | C.TIMEOUT, C.W_ARTI);
            break;
        case C.INVIS:
            if (C.BInvis || C.Blind) { C.callLocal(nothing_special, obj); return C.ECMD_TIME; }
            C.newsym(C.u.ux, C.u.uy);
            if (on) C.Your('body takes on a %s transparency...', C.Hallucination ? 'normal' : 'strange');
            else C.Your('body seems to unfade...');
            break;
        }
    }
    return C.ECMD_TIME;
}

/* will freeing this object from inventory cause levitation to end? */
export function finesse_ahriman(obj)
{
    let oart;
    let save_Lev = C.recordLocal('prop');
    let result;

    /* if we aren't levitating or this isn't an artifact which confers
       levitation via #invoke then freeinv() won't toggle levitation */
    if (!C.Levitation
        || (oart = C.callLocal(get_artifact, obj)) == C.artilist[C.ART_NONARTIFACT]
        || oart.inv_prop != C.LEVITATION || !(C.ELevitation & C.W_ARTI))
        return C.FALSE;

    /* arti_invoke(off) -> float_down() clears I_SPECIAL|TIMEOUT & W_ARTI;
       probe ahead to see whether that actually results in floating down;
       (this assumes that there aren't two simultaneously invoked artifacts
       both conferring levitation--safe, since if there were two of them,
       invoking the 2nd would negate the 1st rather than stack with it) */
    C.copyRecord(save_Lev, C.u.uprops[C.LEVITATION], C.sizes.prop);
    C.HLevitation &= ~(C.I_SPECIAL | C.TIMEOUT);
    C.ELevitation &= ~C.W_ARTI;
    result = Number(!C.Levitation);
    C.copyRecord(C.u.uprops[C.LEVITATION], save_Lev, C.sizes.prop);
    return result;
}

/* WAC return TRUE if artifact is always lit */
export function artifact_light(obj)
{
    /* not artifacts but treat them as if they were because they emit
       light without burning */
    if (obj && (obj.otyp == C.GOLD_DRAGON_SCALE_MAIL
                || obj.otyp == C.GOLD_DRAGON_SCALES)
        && (obj.owornmask & C.W_ARM) != 0n)
        return C.TRUE;

    return Number(Boolean((C.callLocal(get_artifact, obj) != C.artilist[C.ART_NONARTIFACT])
                          && C.callLocal(is_art, obj, C.ART_SUNSWORD)));
}

/* KMH -- Talking artifacts are finally implemented */
export function arti_speak(obj)
{
    let oart = C.callLocal(get_artifact, obj);
    let line;
    let buf = C.stackAlloc(C.BUFSZ);

    /* Is this a speaking artifact? */
    if (oart == C.artilist[C.ART_NONARTIFACT] || !(oart.spfx & C.SPFX_SPEAK))
        return C.ECMD_OK; /* nothing happened */

    line = C.getrumor(C.bcsign(obj), buf, C.TRUE);
    if (!C.loadChar(line))
        line = 'NetHack rumors file closed for renovation.';
    C.pline('%s:', C.Tobjnam(obj, 'whisper'));
    /* SetVoice((struct monst *) 0, 0, 80, voice_talking_artifact);
       expands to no tokens in the actual configured profile. */
    C.verbalize1(line);
    return C.ECMD_TIME;
}

export function artifact_has_invprop(otmp, inv_prop)
{
    let arti = C.callLocal(get_artifact, otmp);

    return Number(Boolean((arti != C.artilist[C.ART_NONARTIFACT])
                          && (arti.inv_prop == inv_prop)));
}

/* Return the price sold to the hero of a given artifact or unique item */
export function arti_cost(otmp)
{
    if (!otmp.oartifact)
        return C.long(C.objects[otmp.otyp].oc_cost);
    else if (C.artilist[C.int(otmp.oartifact)].cost)
        return C.artilist[C.int(otmp.oartifact)].cost;
    else
        return (100n * C.long(C.objects[otmp.otyp].oc_cost));
}

export function abil_to_adtyp(abil)
{
    const abil2adtyp = [
        { abil: C.fieldPointer(C.u.uprops[C.FIRE_RES], 'extrinsic'), adtyp: C.AD_FIRE },
        { abil: C.fieldPointer(C.u.uprops[C.COLD_RES], 'extrinsic'), adtyp: C.AD_COLD },
        { abil: C.fieldPointer(C.u.uprops[C.SHOCK_RES], 'extrinsic'), adtyp: C.AD_ELEC },
        { abil: C.fieldPointer(C.u.uprops[C.ANTIMAGIC], 'extrinsic'), adtyp: C.AD_MAGM },
        { abil: C.fieldPointer(C.u.uprops[C.DISINT_RES], 'extrinsic'), adtyp: C.AD_DISN },
        { abil: C.fieldPointer(C.u.uprops[C.POISON_RES], 'extrinsic'), adtyp: C.AD_DRST },
        { abil: C.fieldPointer(C.u.uprops[C.DRAIN_RES], 'extrinsic'), adtyp: C.AD_DRLI },
    ];
    let k;

    for (k = 0; k < C.SIZE(abil2adtyp); k++) {
        if (C.pointerEqual(abil2adtyp[k].abil, abil))
            return abil2adtyp[k].adtyp;
    }
    return 0;
}

export function abil_to_spfx(abil)
{
    // The original immutable table contains true addresses of native fields.
    const abil2spfx = [
        { abil: C.fieldPointer(C.u.uprops[C.SEARCHING], 'extrinsic'), spfx: C.SPFX_SEARCH },
        { abil: C.fieldPointer(C.u.uprops[C.HALLUC_RES], 'extrinsic'), spfx: C.SPFX_HALRES },
        { abil: C.fieldPointer(C.u.uprops[C.TELEPAT], 'extrinsic'), spfx: C.SPFX_ESP },
        { abil: C.fieldPointer(C.u.uprops[C.STEALTH], 'extrinsic'), spfx: C.SPFX_STLTH },
        { abil: C.fieldPointer(C.u.uprops[C.REGENERATION], 'extrinsic'), spfx: C.SPFX_REGEN },
        { abil: C.fieldPointer(C.u.uprops[C.TELEPORT_CONTROL], 'extrinsic'), spfx: C.SPFX_TCTRL },
        { abil: C.fieldPointer(C.u.uprops[C.WARN_OF_MON], 'extrinsic'), spfx: C.SPFX_WARN },
        { abil: C.fieldPointer(C.u.uprops[C.WARNING], 'extrinsic'), spfx: C.SPFX_WARN },
        { abil: C.fieldPointer(C.u.uprops[C.ENERGY_REGENERATION], 'extrinsic'), spfx: C.SPFX_EREGEN },
        { abil: C.fieldPointer(C.u.uprops[C.HALF_SPDAM], 'extrinsic'), spfx: C.SPFX_HSPDAM },
        { abil: C.fieldPointer(C.u.uprops[C.HALF_PHDAM], 'extrinsic'), spfx: C.SPFX_HPHDAM },
        { abil: C.fieldPointer(C.u.uprops[C.REFLECTING], 'extrinsic'), spfx: C.SPFX_REFLECT },
    ];
    let k;

    for (k = 0; k < C.SIZE(abil2spfx); k++) {
        if (C.pointerEqual(abil2spfx[k].abil, abil))
            return C.ulong(abil2spfx[k].spfx);
    }
    return 0n;
}

/*
 * Return the first item that is conveying a particular intrinsic.
 */
export function what_gives(abil)
{
    let obj;
    let dtyp;
    let spfx;
    let wornbits;
    let wornmask = C.long(C.W_ARM | C.W_ARMC | C.W_ARMH | C.W_ARMS
                     | C.W_ARMG | C.W_ARMF | C.W_ARMU
                     | C.W_AMUL | C.W_RINGL | C.W_RINGR | C.W_TOOL
                     | C.W_ART | C.W_ARTI);

    if (C.u.twoweap)
        wornmask = C.long(wornmask | C.W_SWAPWEP);
    dtyp = C.callLocal(abil_to_adtyp, abil);
    spfx = C.callLocal(abil_to_spfx, abil);
    wornbits = C.long(wornmask & abil.value);

    for (obj = C.gi.invent; obj; obj = obj.nobj) {
        if (obj.oartifact
            && (!C.pointerEqual(abil, C.fieldPointer(C.u.uprops[C.WARN_OF_MON], 'extrinsic')) || C.svc.context.warntype.obj)) {
            let art = C.callLocal(get_artifact, obj);

            if (art != C.artilist[C.ART_NONARTIFACT]) {
                if (dtyp) {
                    if (art.cary.adtyp == dtyp /* carried */
                        || (art.defn.adtyp == dtyp /* defends while worn */
                            && (obj.owornmask & ~(C.W_ART | C.W_ARTI))))
                        return obj;
                }
                if (spfx) {
                    /* property conferred when carried */
                    if ((art.cspfx & spfx) == spfx)
                        return obj;
                    /* property conferred when wielded or worn */
                    if ((art.spfx & spfx) == spfx && obj.owornmask)
                        return obj;
                }
                if (obj == C.uwep && C.pointerEqual(abil, C.fieldPointer(C.u.uprops[C.BLND_RES], 'extrinsic'))
                    && (abil.value & C.W_WEP) != 0n) {
                    return obj; /* Sunsword */
                }
            }
        } else {
            if (wornbits && wornbits == C.long(wornmask & obj.owornmask))
                return obj;
        }
    }
    return 0;
}

export function glow_color(arti_indx)
{
    let colornum = C.artilist[arti_indx].acolor;
    let colorstr = C.clr2colorname(colornum);

    return C.hcolor(colorstr);
}

/* glow verb; [0] holds the value used when blind */
/* relative strength that Sting is glowing (0..3), to select verb */
/* glow strength should also be proportional to proximity and
       probably difficulty, but we don't have that information and
       gathering it is more trouble than this would be worth */
export function glow_strength(count)
{
    return (count > 12) ? 3 : (count > 4) ? 2 : Number(count > 0);
}

export function glow_verb(count, /* 0 means blind rather than no applicable creatures */ ingsfx)
{
    let resbuf = C.resbuf;

    C.Strcpy(resbuf, glow_verbs[C.callLocal(glow_strength, count)]);
    /* ing_suffix() will double the last consonant for all the words
       we're using and none of them should have that, so bypass it */
    if (ingsfx)
        C.Strcat(resbuf, 'ing');
    return resbuf;
}

/* use for warning "glow" for Sting, Orcrist, and Grimtooth */
/* new count (warn_obj_cnt is old count);
                    * -1 is a flag value */
/* -1 means that blindness has just been toggled; give a
               'continue' message that eventual 'stop' message will match */
/* goto_level() -> docrt() -> see_monsters() -> Sting_effects();
               if "you materialize on a different level" is pending, give
               it now so that start-glowing message comes after it */
/* usually called by goto_level() */
/* 'start' message */
/* quivers */
/* 'stop' message */
export function Sting_effects(orc_count)
{
    if (C.u_wield_art(C.ART_STING) || C.u_wield_art(C.ART_ORCRIST)
        || C.u_wield_art(C.ART_GRIMTOOTH)) {
        let oldstr = C.callLocal(glow_strength, C.gw.warn_obj_cnt);
        let newstr = C.callLocal(glow_strength, orc_count);
        if (orc_count == -1 && C.gw.warn_obj_cnt > 0) {
            C.pline('%s is %s.', C.bare_artifactname(C.uwep),
                C.callLocal(glow_verb, C.Blind ? 0 : C.gw.warn_obj_cnt, 1));
        } else if (newstr > 0 && newstr != oldstr) {
            C.maybe_lvltport_feedback();
            if (!C.Blind)
                C.pline('%s %s %s%c', C.bare_artifactname(C.uwep),
                    C.otense(C.uwep, C.callLocal(glow_verb, orc_count, 0)),
                    C.callLocal(glow_color, C.uwep.oartifact), newstr > oldstr ? 33 : 46);
            else if (oldstr == 0)
                C.pline('%s %s slightly.', C.bare_artifactname(C.uwep),
                    C.otense(C.uwep, C.callLocal(glow_verb, 0, 0)));
        } else if (orc_count == 0 && C.gw.warn_obj_cnt > 0) {
            C.pline('%s stops %s.', C.bare_artifactname(C.uwep),
                C.callLocal(glow_verb, C.Blind ? 0 : C.gw.warn_obj_cnt, 1));
        }
    }
}

/* called when hero is wielding/applying/invoking a carried item, or
   after undergoing a transformation (alignment change, lycanthropy,
   polymorph) which might affect item access */
/* might be destroyed or unintentionally dropped */
/* whether to drop it if hero can longer touch it */
/* allow hero in silver-hating form to try to perform invocation ritual */
/* nothing else to do if hero can successfully handle this object */
/* hero can't handle this object, but didn't get touch_artifact()'s
           "<obj> evades your grasp|control" message; give an alternate one */
/* also inflict damage unless touch_artifact() already did so */
/* 'obj' is silver; for rings and wands it ended up that
                   way due to randomization at start of game; showing this
                   game's silver item without stating that it is silver
                   potentially leads to confusion about cause of death */
/* for anything else, stick with killer_xname() */
/* damage is somewhat arbitrary; half the usual 1d20 physical
               for silver, 1d10 magical for <foo>bane, potentially both */
/* removing a worn item might result in loss of levitation,
       dropping the hero onto a polymorph trap or into water or
       lava and potentially dropping or destroying the item */
/* if we still have it and caller wants us to drop it, do so now */
/* dropx gives a message if a dropped item lands on an altar;
               we provide one for other terrain */
/* no longer in inventory */
export function retouch_object(objp, loseit)
{
    let obj = objp.value;
    if (obj.otyp == C.BELL_OF_OPENING && C.invocation_pos(C.u.ux, C.u.uy)
        && !C.On_stairs(C.u.ux, C.u.uy)) return 1;
    if (C.callLocal(touch_artifact, obj, C.gy.youmonst)) {
        let buf = C.stackAlloc(C.BUFSZ);
        let dmg = 0, tmp;
        let ag = Number(Boolean(C.objects[obj.otyp].oc_material == C.SILVER && C.Hate_silver));
        let bane = C.callLocal(bane_applies, C.callLocal(get_artifact, obj), C.gy.youmonst);
        if (!ag && !bane) return 1;
        C.You_cant('handle %s%s!', C.yname(obj), obj.owornmask ? ' anymore' : '');
        if (!C.state.touch_blasted) {
            let what = C.killer_xname(obj);
            if (ag && !obj.oartifact && !bane) {
                if (obj.oclass == C.RING_CLASS) what = 'a silver ring';
                else if (obj.oclass == C.WAND_CLASS) what = 'a silver wand';
            }
            if (ag) {
                tmp = (C.rngCaller(2552, 'retouch_object'), C.rnd(10));
                dmg += C.Maybe_Half_Phys(tmp);
            }
            if (bane) dmg += (C.rngCaller(2554, 'retouch_object'), C.rnd(10));
            C.Sprintf(buf, 'handling %s', what);
            C.losehp(dmg, buf, C.KILLED_BY);
            C.exercise(C.A_CON, 0);
        }
    }
    if (obj.owornmask) {
        let otmp;
        C.remove_worn_item(obj, 0);
        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
            if (otmp == obj) break;
        if (!otmp) objp.value = obj = 0;
    }
    if (loseit && obj) {
        if (C.Levitation) { C.freeinv(obj); C.hitfloor(obj, 1); }
        else {
            if (!C.IS_ALTAR(C.levl[C.u.ux][C.u.uy].typ))
                C.pline('%s to the %s.', C.Tobjnam(obj, 'fall'), C.surface(C.u.ux, C.u.uy));
            C.dropx(obj);
        }
        objp.value = obj = 0;
    }
    return 0;
}

/* hero has changed form or alignment; an item which is worn/wielded
   or an artifact which conveys something via being carried or which
   has an #invoke effect currently in operation undergoes a touch test;
   if it fails, it will be unworn/unwielded and maybe dropped */
/* object to test; in invent or is steed's saddle */
/* whether to drop it if it can't be touched */
/* never Null; this pacifies static analysis when
                      * the get_artifact() macro tests 'obj' for Null */
/* some items in use don't have any wornmask setting */
/* "<artifact> is beyond your control" or "you can't handle
               <object>" has been given and it is now unworn/unwielded
               and possibly dropped (depending upon caller); if dropped,
               carried effect was turned off, else we leave that alone;
               we turn off invocation property here if still carried */
/* reverse #invoke */
export function untouchable(obj, drop_untouchable)
{
    let art;
    let beingworn, carryeffect, invoked;
    let wearmask = C.long(~(C.W_QUIVER | (C.u.twoweap ? 0n : C.W_SWAPWEP) | C.W_BALL));
    beingworn = Number(Boolean(obj && ((obj.owornmask & wearmask) != 0n
        || (obj.oclass == C.TOOL_CLASS && (obj.lamplit
            || (obj.otyp == C.LEASH && obj.leashmon)
            || (C.Is_container(obj) && C.Has_contents(obj)))))));
    if ((art = C.callLocal(get_artifact, obj)) != C.artilist[C.ART_NONARTIFACT]) {
        carryeffect = Number(Boolean(art.cary.adtyp || art.cspfx));
        invoked = Number(Boolean(art.inv_prop > 0 && art.inv_prop <= C.LAST_PROP
            && (C.u.uprops[art.inv_prop].extrinsic & C.W_ARTI) != 0n));
    } else carryeffect = invoked = 0;
    if (beingworn || carryeffect || invoked) {
        if (!C.callLocal(retouch_object, C.localPointer('struct obj *', () => obj, v => obj = v), drop_untouchable)) {
            if (invoked && obj) C.callLocal(arti_invoke, obj);
            return 1;
        }
    }
    return 0;
}

/* check all items currently in use (mostly worn) for touchability */
/* 0==don't drop, 1==drop all, 2==drop weapon */
/* recursion control */
/*
     * We can potentially be called recursively if losing/unwearing
     * an item causes worn helm of opposite alignment to come off or
     * be destroyed.
     *
     * BUG: if the initial call was due to putting on a helm of
     * opposite alignment and it does come off to trigger recursion,
     * after the inner call executes, the outer call will finish
     * using the non-helm alignment rather than the helm alignment
     * which triggered this in the first place.
     */
/* init upon initial entry */
/* drop all or drop weapon */
/* check secondary weapon first, before possibly unwielding primary */
/* so loop below won't process it again */
/* check primary weapon next so that they're handled together */
/* so loop below won't process it again */
/* in case someone is daft enough to add artifact or silver saddle */
/* untouchable() calls retouch_object() which expects an object in
           hero's inventory, but remove_worn_item() will be harmless for
           saddle and we're suppressing drop, so this works as intended */
/*
     * TODO?  Force off gloves if either or both rings are going to
     * become unworn; force off cloak [suit] before suit [shirt].
     * The torso handling is hypothetical; the case for gloves is
     * not, due to the possibility of unwearing silver rings.
     */
/* all untouchable items */
/* loss of levitation (silver ring, or Heart of Ahriman invocation)
       might cause hero to lose inventory items (by dropping into lava,
       for instance), so inventory traversal needs to rescan the whole
       gi.invent chain each time it moves on to another object; we use bypass
       handling to keep track of which items have already been processed */
/* temporary? hack for ring removal plausibility */
/* reset upon final exit */
export function retouch_equipment(dropflag)
{
    let obj;
    let dropit, had_gloves = Number(C.uarmg != 0);
    let had_rings = Number(Boolean(C.uleft)) + Number(Boolean(C.uright));
    if (!C.state.nesting++) C.clear_bypasses();
    dropit = Number(dropflag > 0);
    if (C.u.twoweap) { C.bypass_obj(C.uswapwep); C.callLocal(untouchable, C.uswapwep, dropit); }
    if (C.uwep) { C.bypass_obj(C.uwep); C.callLocal(untouchable, C.uwep, dropit); }
    if (C.u.usteed && (obj = C.which_armor(C.u.usteed, C.W_SADDLE)) != 0) {
        if (C.callLocal(untouchable, obj, 0)) C.dismount_steed(C.DISMOUNT_THROWN);
    }
    dropit = Number(dropflag == 1);
    while ((obj = C.nxt_unbypassed_obj(C.gi.invent)) != 0) C.callLocal(untouchable, obj, dropit);
    if (had_rings != (Number(Boolean(C.uleft)) + Number(Boolean(C.uright))) && C.uarmg && C.uarmg.cursed)
        C.uncurse(C.uarmg);
    if (had_gloves && !C.uarmg) C.selftouch('After losing your gloves, you');
    if (!--C.state.nesting) C.clear_bypasses();
}

/* If a trap is shown here, don't count it; the hero
             * should be expecting it.  But if there is a trap here
             * that's not shown, either undiscovered or covered by
             * something, do count it.
             */
/* we're counting locations, so just */
/* count the first one in a pile     */
/*
     * [Shouldn't we also check inventory for a trapped container?
     * Even if its trap has already been found, there's no 'tknown'
     * flag to help hero remember that so we have nothing comparable
     * to a shown glyph to justify skipping it.]
     */
export function count_surround_traps(x, y)
{
    let levp, o, dx, dy;
    let glyph, ret = 0;
    for (dx = C.short(x - 1); dx < x + 2; dx = C.short(dx + 1))
        for (dy = C.short(y - 1); dy < y + 2; dy = C.short(dy + 1)) {
            if (!C.isok(dx, dy)) continue;
            glyph = C.glyph_at(dx, dy);
            if (C.glyph_is_trap(glyph)) continue;
            if (C.t_at(dx, dy)) { ++ret; continue; }
            levp = C.levl[dx][dy];
            if (C.IS_DOOR(levp.typ) && (levp.doormask & C.D_TRAPPED) != 0) { ++ret; continue; }
            for (o = C.svl.level.objects[dx][dy]; o; o = o.nexthere)
                if (C.Is_container(o) && o.otrapped) { ++ret; break; }
        }
    return ret;
}

/* sense adjacent traps if wielding MKoT without wearing gloves */
export function mkot_trap_warn()
{
    const heat = ['cool', 'slightly warm', 'warm', 'very warm', 'hot', 'very hot', 'like fire'];
    if (!C.uarmg && C.u_wield_art(C.ART_MASTER_KEY_OF_THIEVERY)) {
        let idx, ntraps = C.callLocal(count_surround_traps, C.u.ux, C.u.uy);
        if (ntraps != C.gm.mkot_trap_warn_count) {
            idx = C.min(ntraps, C.SIZE(heat) - 1);
            C.pline_The('Key feels %s%c', heat[idx], ntraps > 3 ? 33 : 46);
        }
        C.gm.mkot_trap_warn_count = ntraps;
    } else C.gm.mkot_trap_warn_count = 0;
}

/* Master Key is magic key if its bless/curse state meets our criteria:
   not cursed for rogues or blessed for non-rogues */
export function is_magic_key(mon, /* if null, non-rogue is assumed */ obj)
{
    if (C.callLocal(is_art, obj, C.ART_MASTER_KEY_OF_THIEVERY)) {
        if ((mon == C.gy.youmonst) ? C.Role_if(C.PM_ROGUE)
                                 : (mon && mon.data == C.mons[C.PM_ROGUE]))
            return Number(!obj.cursed); /* a rogue; non-cursed suffices for magic */
        /* not a rogue; key must be blessed to behave as a magic one */
        return obj.blessed;
    }
    return C.FALSE;
}

/* figure out whether 'mon' (usually youmonst) is carrying the magic key */
export function has_magic_key(mon) /* if null, hero assumed */
{
    let o;
    let key = C.artilist[C.ART_MASTER_KEY_OF_THIEVERY].otyp;

    if (!mon)
        mon = C.gy.youmonst;
    for (o = ((mon == C.gy.youmonst) ? C.gi.invent : mon.minvent); o;
         o = C.nxtobj(o, key, C.FALSE)) {
        if (C.callLocal(is_magic_key, mon, o))
            return o;
    }
    return 0;
}

/* #define is_art(o,art) ((o) && (o)->oartifact == (art)) */
export function is_art(obj, art)
{
    if (obj && obj.oartifact == art)
        return C.TRUE;
    return C.FALSE;
}

/* #define get_artifact(o) \
    (((o) && ((o)->artifact > 0 && (o)->artifact < AFTER_LAST_ARTIFACT)) \
                             ? &artilist[(int) (o)->oartifact] \
                             : &artilist[ART_NONARTIFACT]) */
export function get_artifact(obj)
{
    if (obj) {
        let artidx = C.int(obj.oartifact);

        /* skip 0, 1st artifact at 1 */
        /* SIZE(artilist) would include the terminator,
           so use AFTER_LAST_ARTIFACT instead */
        if (artidx > 0 && artidx < C.AFTER_LAST_ARTIFACT)
            return C.artilist[artidx];
    }
    return C.artilist[C.ART_NONARTIFACT];
}

/* is object permanently poisoned? (currently only Grimtooth) */
/* SFCTOOL */
/*artifact.c*/
export function permapoisoned(obj)
{
    return Number(Boolean(obj && C.callLocal(is_art, obj, C.ART_GRIMTOOTH)));
}

