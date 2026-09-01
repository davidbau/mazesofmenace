// read.js — the 'r' command.
// C ref: src/read.c
//
// The spellbook route is live (doread -> study_book); scroll effects need
// seffects and stay recorded after their prompt keys are consumed.

import { game } from './gstate.js';
import { getobj, GETOBJ_PROMPT, ECMD_TIME, ECMD_OK } from './invent.js';
import { ECMD_CANCEL, SPE_LIM, CORR, Is_rogue_level, W_ARMOR,
         A_STR, A_CON, W_BALL, W_CHAIN, W_ART, W_ARTI, TT_BURIEDBALL,
         BY_COOKIE, G_UNIQ, M_AP_TYPE, M_AP_MONSTER, M_AP_OBJECT,
         M_AP_FURNITURE, MM_FEMALE, MM_MALE, NON_PM, W_SADDLE,
         OBJ_AT, COLNO, ROWNO, BOLT_LIM, HAND, HEAD, NH_RED,
         NH_PURPLE } from './const.js';
import { sgn, distu, isok } from './hacklib.js';
import { valid_cloud_pos } from './region.js';
import { cansee } from './vision.js';
import { bcsign, blessorcurse, mkobj, mksobj, place_object,
         uncurse } from './mkobj.js';
import { chwepon } from './wield.js';
import { erosion_matters } from './mkobj.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { newsym, pline, sensemon, canspotmon } from './display.js';
import { rn1, rn2, rnd } from './rng.js';
import { getlin } from './cmd.js';
import { has_head, hides_under, is_hider, is_silent,
         name_to_monplus } from './mondata.js';
import { is_female, is_male, makemon, mkclass, rndmonst,
         set_malign } from './makemon.js';
import { canseemon } from './display.js';
import { Amonnam, hcolor, trycall, upstart } from './do_name.js';
import { an, makeplural, makesingular, simpleonames, vtense } from './objnam.js';
import { def_monsyms, defsyms, monexplain } from './drawing_data.js';
import { MM_MINVIS, MM_NOEXCLAM } from './const.js';
import { study_book } from './spell.js';
import { do_mapping } from './detect.js';
import { do_clear_area, vision_recalc } from './vision.js';
import { makeknown } from './o_init.js';
import { more_experienced } from './exper.js';
import { Norep, pline_The, set_msg_xy, You, Your, You_feel } from './pline.js';
import { useup, identify_pack, update_inventory } from './invent.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { outrumor } from './rumors.js';
import { setworn, which_armor } from './worn.js';
import { LIMITS, MFLAGS, MONSYMS, PMNAMES, mons_name } from './monst_data.js';
import { delobj, is_pool, m_at, setmangry } from './mon.js';
import { roles } from './role_data.js';
import { body_part } from './polyself.js';
import { Blind, Hallucination, Invisible } from './youprop.js';
import { make_confused } from './potion.js';

function note_unported_read(what) {
    (game.unported ||= new Set()).add('read:' + what);
}

// src/mondata.c:580 can_chant().
function can_chant(mtmp) {
    const data = mtmp?.data;
    const strangled = mtmp === game.youmonst
        && !!(game.u.intrinsic?.HStrangled || game.u.uprops?.STRANGLED);

    return !!data && !strangled && !is_silent(data) && has_head(data)
        && data.msound !== MFLAGS.MS_BUZZ
        && data.msound !== MFLAGS.MS_BURBLE;
}

// src/read.c:315 read_ok() — getobj filter for 'r'; lives in js/cmd.js
// beside the other command filters and is passed in by the caller.

// src/read.c:330 doread()
export async function doread(read_ok) {
    const { check_capacity } = await import('./hack.js');
    if (await check_capacity(null))
        return ECMD_OK;

    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0;

    if (otyp === ONAMES.FORTUNE_COOKIE) {
        if (game.flags.verbose)
            await You('break up the cookie and throw away the pieces.');
        await outrumor(bcsign(scroll), BY_COOKIE);
        if (!game.u.ublind) {
            game.u.uconduct = game.u.uconduct || {};
            game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
        }
        useup(scroll);
        return ECMD_TIME;
    }

    /* shirts / candy wrapper arms */
    if (otyp === ONAMES.T_SHIRT || otyp === ONAMES.ALCHEMY_SMOCK
        || otyp === ONAMES.HAWAIIAN_SHIRT
        || otyp === ONAMES.APRON || otyp === ONAMES.CANDY_BAR) {
        note_unported_read('doread:novelty_text');
        return ECMD_TIME;
    }
    if (scroll.oclass !== OCLASSES.SCROLL_CLASS
        && scroll.oclass !== OCLASSES.SPBOOK_CLASS) {
        await pline("That is a silly thing to read.");
        return ECMD_OK;
    }
    if (game.u.ublind && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
        let what = null;
        if (otyp === ONAMES.SPE_NOVEL)
            what = 'words';
        else if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
            what = 'mystic runes';
        else if (!scroll.dknown)
            what = 'formula on the scroll';
        if (what) {
            await pline(`Being blind, you cannot read the ${what}.`);
            return ECMD_OK;
        }
    }

    /* Blank paper and the two special books do not break illiterate conduct. */
    if (otyp !== ONAMES.SCR_BLANK_PAPER
        && otyp !== ONAMES.SPE_BLANK_PAPER
        && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD
        && otyp !== ONAMES.SPE_NOVEL) {
        game.u.uconduct = game.u.uconduct || {};
        game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    }

    if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;

    /* src/read.c:617 — the scroll path. Blind and confused readings need
       state no session reaches yet. */
    game.known = false;
    if (otyp !== ONAMES.SCR_BLANK_PAPER) {
        const nodisappear = (otyp === ONAMES.SCR_FIRE
                             || (otyp === ONAMES.SCR_REMOVE_CURSE
                                 && scroll.cursed));
        const silently = !can_chant(game.youmonst);
        if (Blind()) {
            await pline(nodisappear
                ? `You ${silently ? 'cogitate' : 'pronounce'} the formula on the scroll.`
                : `As you ${silently ? 'cogitate' : 'pronounce'} the formula on it, the scroll disappears.`);
        } else {
            await pline(nodisappear ? 'You read the scroll.'
                                    : 'As you read the scroll, it disappears.');
        }
        if (game.u.uprops?.CONFUSION || game.u.intrinsic?.HConfusion) {
            if (Hallucination())
                await pline('Being so trippy, you screw up...');
            else
                await pline(`Being confused, you ${silently
                    ? 'misunderstand' : 'mispronounce'} the magic words...`);
        }
    }

    if (!await seffects(scroll)) {
        if (!game.objects[otyp].oc_name_known) {
            if (game.known)
                learnscroll(scroll);
            else
                await trycall(scroll);
        }
        if (otyp !== ONAMES.SCR_BLANK_PAPER)
            useup(scroll);
    }
    return ECMD_TIME;
}

// src/read.c:308 learnscroll() — reading identifies the scroll type.
// Also called from teleport.js for the scroll of teleportation.
export function learnscroll(sobj) {
    /* it's implied that sobj->dknown is set;
       we couldn't be reading this scroll otherwise */
    if (sobj.oclass !== OCLASSES.SPBOOK_CLASS)
        learnscrolltyp(sobj.otyp);
}

// src/read.c:2263 seffects() — scroll effects, one arm per type. Only
// magic mapping is live; every other scroll records with its otyp so the
// gap is visible per type. Returns true when the scroll was already used
// up by its own arm.
async function seffects(sobj) {
    const otyp = sobj.otyp;

    /* src/read.c:2199 — "just for trying": any magical scroll exercises
       wisdom before its effect, the same dispatcher prologue weffects has */
    if (game.objects[otyp].oc_magic)
        exercise(A_WIS, true);

    switch (otyp) {
    case ONAMES.SCR_MAGIC_MAPPING:
    case ONAMES.SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case ONAMES.SCR_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        await seffect_teleportation(sobj);
        break;
    case ONAMES.SCR_IDENTIFY:
        return await seffect_identify(sobj);
    case ONAMES.SCR_BLANK_PAPER:
        if (game.u.ublind)
            await You("don't remember there being any magic words on this scroll.");
        else
            await pline('This scroll seems to be blank.');
        game.known = true;
        break;
    case ONAMES.SCR_ENCHANT_WEAPON:
        return await seffect_enchant_weapon(sobj);
    case ONAMES.SCR_TAMING:
    case ONAMES.SPE_CHARM_MONSTER:
        await seffect_taming(sobj);
        break;
    case ONAMES.SCR_LIGHT:
        return await seffect_light(sobj);
    case ONAMES.SCR_DESTROY_ARMOR:
        return await seffect_destroy_armor(sobj);
    case ONAMES.SCR_CONFUSE_MONSTER:
    case ONAMES.SPE_CONFUSE_MONSTER:
        await seffect_confuse_monster(sobj);
        break;
    case ONAMES.SCR_REMOVE_CURSE:
    case ONAMES.SPE_REMOVE_CURSE:
        await seffect_remove_curse(sobj);
        break;
    case ONAMES.SCR_STINKING_CLOUD:
        await seffect_stinking_cloud(sobj);
        break;
    case ONAMES.SCR_PUNISHMENT:
        await seffect_punishment(sobj);
        break;
    default:
        note_unported_read(`seffects:otyp=${otyp}`);
        break;
    }
    return false;
}

// src/read.c:1044 maybe_tame(), apply one taming effect to one monster.
async function maybe_tame(mtmp, sobj) {
    const was_tame = mtmp.mtame | 0;
    const was_peaceful = !!mtmp.mpeaceful;

    if (sobj.cursed) {
        await setmangry(mtmp, false);
        return was_peaceful && !mtmp.mpeaceful ? -1 : 0;
    }

    const { resist } = await import('./zap.js');
    if (!resist(mtmp, sobj.oclass, 0, false) || mtmp.isshk) {
        const { tamedog } = await import('./dog.js');
        await tamedog(mtmp, sobj, false);
    }
    return ((!was_peaceful && mtmp.mpeaceful)
            || was_tame !== (mtmp.mtame | 0)) ? 1 : 0;
}

// src/read.c:1679 seffect_taming(), affect every monster in the nearby square
// for a normal reading, or the wider 11 by 11 area when confused.
async function seffect_taming(sobj) {
    let candidates = 0, results = 0, vis_results = 0;

    if (game.u.uswallow) {
        candidates = 1;
        results = vis_results = await maybe_tame(game.u.ustuck, sobj);
    } else {
        const bd = (game.u.intrinsic?.HConfusion
                    || game.u.uprops?.CONFUSION) ? 5 : 1;
        for (let i = -bd; i <= bd; ++i) {
            for (let j = -bd; j <= bd; ++j) {
                const x = game.u.ux + i, y = game.u.uy + j;
                if (!isok(x, y))
                    continue;
                const mtmp = m_at(x, y)
                    || (!i && !j ? game.u.usteed : null);
                if (!mtmp)
                    continue;
                ++candidates;
                const res = await maybe_tame(mtmp, sobj);
                results += res;
                if (canspotmon(mtmp))
                    vis_results += res;
            }
        }
    }

    if (!results) {
        await pline(`Nothing interesting ${
            candidates ? 'seems to happen' : 'happens'}.`);
    } else {
        await pline_The(`neighborhood ${vis_results ? 'is' : 'seems'} ${
            results < 0 ? 'un' : ''}friendlier.`);
        if (vis_results > 0)
            game.known = true;
    }
}

// src/read.c:1400 seffect_confuse_monster().
async function seffect_confuse_monster(sobj) {
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    const altfeedback = Blind() || Invisible();
    const hands = makeplural(body_part(HAND));

    if (game.youmonst.data.mlet !== MONSYMS.S_HUMAN || scursed) {
        if (!game.u.intrinsic?.HConfusion)
            await You_feel('confused.');
        await make_confused((game.u.intrinsic?.HConfusion || 0) + rnd(100),
                            false);
    } else if (confused) {
        if (!sblessed) {
            await Your(`${hands} begin to ${altfeedback ? 'tingle'
                : `glow ${hcolor(NH_PURPLE)}`}.`);
            await make_confused((game.u.intrinsic?.HConfusion || 0)
                                + rnd(100), false);
        } else {
            await pline(`A ${altfeedback ? 'faint buzz'
                : `${hcolor(NH_RED)} glow`} surrounds your ${body_part(HEAD)}.`);
            await make_confused(0, true);
        }
    } else {
        let incr = sobj.oclass === OCLASSES.SCROLL_CLASS ? 3 : 0;

        if (!sblessed) {
            if (altfeedback)
                await Your(`${hands} tingle${game.u.umconf ? ' even more' : ''}.`);
            else if (!game.u.umconf)
                await Your(`${hands} begin to glow ${hcolor(NH_RED)}.`);
            else
                await pline_The(`${hcolor(NH_RED)} glow of your ${hands} intensifies.`);
            incr += rnd(2);
        } else {
            if (altfeedback)
                await Your(`${hands} tingle ${game.u.umconf
                    ? 'even more' : 'very'} sharply.`);
            else
                await Your(`${hands} glow ${game.u.umconf
                    ? 'an even more' : 'a'} brilliant ${hcolor(NH_RED)}.`);
            incr += rn1(8, 2);
        }
        if ((game.u.umconf || 0) >= 40)
            incr = 1;
        game.u.umconf = (game.u.umconf || 0) + incr;
    }
}

// src/read.c:1976 seffect_punishment() and :3019 punish().
async function seffect_punishment(sobj) {
    game.known = true;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    if (confused || sobj.blessed) {
        await You('feel guilty.');
        return;
    }

    await You('are being punished for your misbehavior!');
    if (game.u.uball) {
        await Your('iron ball gets heavier.');
        game.u.uball.owt = (game.u.uball.owt || 0)
            + 160 * (1 + (sobj.cursed ? 1 : 0));
        return;
    }

    const chain = mkobj(OCLASSES.CHAIN_CLASS, true);
    setworn(chain, W_CHAIN);
    const ball = mkobj(OCLASSES.BALL_CLASS, true);
    setworn(ball, W_BALL);

    game.uchain = game.u.uchain;
    game.uball = game.u.uball;
    (game.u.uprops ||= {}).PUNISHED = true;
    place_object(ball, game.u.ux, game.u.uy);
    place_object(chain, game.u.ux, game.u.uy);
    newsym(game.u.ux, game.u.uy);
}

// src/read.c:3066 unpunish() -- destroy the attached chain while leaving the
// detached heavy iron ball as an ordinary object on the floor.
export function unpunish() {
    const chain = game.u.uchain;

    setworn(null, W_CHAIN);
    delobj(chain);
    setworn(null, W_BALL);

    game.uchain = game.u.uchain;
    game.uball = game.u.uball;
    if (game.u.uprops)
        delete game.u.uprops.PUNISHED;
}

// src/read.c:1490 seffect_remove_curse(). A cursed scroll only reports and
// disintegrates. An uncursed one processes eligible carried objects in list
// order, which also preserves blessorcurse() draw order when confused.
async function seffect_remove_curse(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u.intrinsic?.HConfusion
                         || game.u.uprops?.CONFUSION);
    const hallucinating = !!game.u.uprops?.HALLUC
                          && !game.u.uprops?.HALLUC_RES;

    await You(`feel ${!hallucinating
        ? (!confused ? 'like someone is helping you.'
                     : 'like you need some help.')
        : (!confused ? 'in touch with the Universal Oneness.'
                     : 'the power of the Force against you!')}`);

    if (scursed) {
        await pline('The scroll disintegrates.');
    } else {
        for (const obj of [...(game.invent || [])]) {
            if (obj.oclass === OCLASSES.COIN_CLASS)
                continue;
            if (obj === sobj && obj.quan === 1)
                continue;

            let wornmask = (obj.owornmask | 0) & ~(W_BALL | W_ART | W_ARTI);
            if (wornmask && !sblessed) {
                if (obj === game.u.uswapwep && !game.u.twoweap) {
                    wornmask = 0;
                } else if (obj === game.u.uquiver) {
                    if (obj.oclass === OCLASSES.WEAPON_CLASS) {
                        if (!game.objects[obj.otyp].oc_merge)
                            wornmask = 0;
                    } else if (obj.oclass === OCLASSES.GEM_CLASS) {
                        if (game.u.uwep?.otyp !== ONAMES.SLING)
                            wornmask = 0;
                    } else {
                        wornmask = 0;
                    }
                }
            }

            if (sblessed || wornmask || obj.otyp === ONAMES.LOADSTONE
                || (obj.otyp === ONAMES.LEASH && obj.leashmon)) {
                if (confused) {
                    blessorcurse(obj, 2);
                    obj.bknown = 0;
                } else if (obj.cursed) {
                    const knew_curse = !!obj.bknown;
                    uncurse(obj);
                    if (knew_curse && otyp === ONAMES.SCR_REMOVE_CURSE)
                        learnscrolltyp(ONAMES.SCR_REMOVE_CURSE);
                }
            }
        }
        if (game.u.usteed)
            note_unported_read('seffect_remove_curse:saddle');
    }

    if (game.uball && !confused)
        unpunish();
    if (game.u.utraptype === TT_BURIEDBALL)
        note_unported_read('seffect_remove_curse:buried_ball');
    update_inventory();
}

// src/read.c:1324 seffect_destroy_armor()
//
// The confused (erodeproofing) arm, the cursed arms and the blessed
// choose-your-armor arm need Confusion/curse state no ported path sets on
// a read scroll yet; they record. The plain arm runs destroy_arm() with
// its rn2(4)+1 hit rolls, or gives the "Your skin itches." strange
// feeling with no armor.
// src/read.c:1080 can_center_cloud()
function can_center_cloud(x, y) {
    if (!valid_cloud_pos(x, y))
        return false;
    return cansee(x, y) && distu(x, y) < 32;
}

// src/read.c:3081 do_stinking_cloud() — prompt for the center, then grow
// the cloud; the size and damage scale with the scroll's beatitude.
async function do_stinking_cloud(sobj, mention_stinking) {
    const cc = { x: game.u.ux, y: game.u.uy };

    await pline(`Where do you want to center the ${
        mention_stinking ? 'stinking ' : ''}cloud?`);
    /* getpos_sethilite(display_stinking_cloud_positions, can_center_cloud):
       the highlight pass draws nothing */
    const { getpos } = await import('./getpos.js');
    if (await getpos(cc, true, 'the desired position') < 0) {
        await pline('Never mind.');
        return;
    } else if (!can_center_cloud(cc.x, cc.y)) {
        if (game.u.uprops?.HALLUC && !game.u.uprops?.HALLUC_RES)
            await pline('Ugh... someone cut the cheese.');
        else
            await pline(`${sobj.oclass === OCLASSES.SCROLL_CLASS
                ? 'The scroll crumbles with' : 'You smell'
                } a whiff of rotten eggs.`);
        return;
    }
    const { create_gas_cloud } = await import('./region.js');
    create_gas_cloud(cc.x, cc.y, 15 + 10 * bcsign(sobj),
                     8 + 4 * bcsign(sobj));
}

// src/read.c:1991 seffect_stinking_cloud()
async function seffect_stinking_cloud(sobj) {
    const otyp = sobj.otyp;
    const already_known = (sobj.oclass === OCLASSES.SPBOOK_CLASS
                           || game.objects[otyp].oc_name_known);

    if (!already_known)
        await You('have found a scroll of stinking cloud!');
    game.known = true;
    await do_stinking_cloud(sobj, already_known);
}

async function seffect_destroy_armor(sobj) {
    const { destroy_arm } = await import('./do_wear.js');
    const { strange_feeling } = await import('./potion.js');
    const scursed = !!sobj.cursed;

    /* some_armor(&youmonst): any worn armor piece */
    const otmp = (game.invent || [])
        .find(o => ((o.owornmask ?? 0) & W_ARMOR) !== 0);

    if (game.u.uprops?.CONFUSION) {
        note_unported_read('seffect_destroy_armor:confused');
        return false;
    }

    if (scursed) {
        note_unported_read('seffect_destroy_armor:cursed');
        return false;
    } else {
        const gets_choice = (otmp && sobj.blessed
                             && count_worn_armor() > 1);
        if (gets_choice || sobj.blessed) {
            note_unported_read('seffect_destroy_armor:blessed');
            return false;
        } else if (!await destroy_arm()) {
            await strange_feeling(sobj, 'Your skin itches.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return true;        /* useup() done by strange_feeling() */
        } else
            game.known = true;
    }
    return false;
}

/* src/do_wear.c count_worn_armor() */
function count_worn_armor() {
    return (game.invent || [])
        .filter(o => ((o.owornmask ?? 0) & W_ARMOR) !== 0).length;
}

// src/read.c:58 learnscrolltyp() — learning a scroll type is worth 10 score.
function learnscrolltyp(scrolltyp) {
    if (!game.objects[scrolltyp].oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    }
    return false;
}

// src/read.c seffect_light() — the scroll of light.
//
// The confused arm makes yellow/black lights, which needs makemon with
// MM_EDOG plus initedog; recorded. The ordinary arm is live.
async function seffect_light(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);

    if (!confused) {
        if (!game.u.ublind)
            game.known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            /* lightdamage(sobj, TRUE, 5): the gremlin arm is the only one
               with draws or effect, and the hero is never a gremlin here */
            if (5)
                game.known = true;
        }
    } else {
        note_unported_read('seffect_light:confused_lights');
    }
    return false;
}

// src/read.c set_lit() — do_clear_area()'s callback.
//
// The gremlin collection list is recorded: it only matters when a gremlin is
// standing in the lit area, and light_hits_gremlin's rnd(5) would be a draw.
function set_lit(x, y, val) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (val) {
        loc.lit = 1;
        const mtmp = (game.level?.monsters || [])
            .find(m => m.mx === x && m.my === y && m.mhp > 0);
        if (mtmp && mtmp.data?.mname === 'gremlin')
            note_unported_read('set_lit:gremlin');
    } else {
        loc.lit = 0;
        note_unported_read('set_lit:snuff_light_source');
    }
}

// src/read.c:2491 litroom() — light (on) or darken (!on) the hero's area.
//
// Radius is 5, or 9 for a blessed scroll. The darkening arm needs
// snuff_lit/artifact_light over the inventory and is recorded; the lighting
// arm is what a scroll of light reaches.
export async function litroom(on, obj) {
    const blessed_effect = !!(obj && obj.oclass === OCLASSES.SCROLL_CLASS
                              && obj.blessed);
    const no_op = !!game.u.uswallow;    /* Underwater/waterlevel not modelled */

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        note_unported_read('litroom:darken');
        return;
    }
    if (blessed_effect)
        /* impact_arti_light over lamplit artifacts; none exist yet */
        note_unported_read('litroom:blessed_arti_light');

    if (game.u.uswallow) {
        note_unported_read('litroom:swallowed');
    } else if (!game.u.ublind
               && (!Is_rogue_level(game.u.uz)
                   || game.level?.at(game.u.ux, game.u.uy)?.typ !== CORR)) {
        await pline(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;

    do_clear_area(game.u.ux, game.u.uy, blessed_effect ? 9 : 5,
                  set_lit, on ? 1 : 0);

    /*
     *  If we are not blind, then force a redraw on all positions in sight
     *  by temporarily blinding the hero. The vision recalculation will
     *  correctly update all previously seen positions *and* correctly set
     *  the waslit bit.
     */
    if (!game.u.ublind)
        vision_recalc(2);

    game.vision_full_recalc = 1;        /* delayed vision recalculation */
}

// src/read.c:1627 seffect_enchant_weapon() — the scroll of enchant weapon.
//
// The confused arm rustproofs the weapon instead of enchanting it, and returns
// before chwepon(); erosion_matters() plus the ARMOR_CLASS exclusion is what
// keeps it to actual weapons. `s` guards its own uwep tests against a null
// pointer, which is why the !uwep case yields 1 rather than reading uwep->spe.
async function seffect_enchant_weapon(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);
    const sblessed = sobj.blessed;
    const uwep = game.u.uwep;
    let s;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && uwep && erosion_matters(uwep, game.objects)
        && uwep.oclass !== OCLASSES.ARMOR_CLASS) {
        note_unported_read('seffect_enchant_weapon:erodeproof');
        return false;
    }
    s = scursed ? -1
        : !uwep ? 1                     /* guard the tests below against null */
        : (uwep.spe >= 9) ? (rn2(uwep.spe) === 0)  /* usually 0, maybe 1 */
        : sblessed ? rnd(3 - Math.trunc(uwep.spe / 3)) /* >=9 prevents rnd(0) */
        : 1;                            /* uncursed */
    /* nothing enchanted: strange_feeling -> useup */
    const used_up = !(await chwepon(sobj, s));
    if (uwep)
        cap_spe(uwep);
    return used_up;
}

// src/read.c cap_spe() — clamp enchantment to the +/-SPE_LIM band.
function cap_spe(obj) {
    if (obj) {
        if (Math.abs(obj.spe) > SPE_LIM)
            obj.spe = sgn(obj.spe) * SPE_LIM;
    }
}

// src/read.c:2055 seffect_identify() — the scroll arm.
//
// The scroll is used up BEFORE the messages, and the cval roll only happens
// on the blessed or lucky path: `sblessed || (!scursed && !rn2(5))`, so an
// ordinary uncursed scroll spends one rn2(5) and usually identifies one item.
// identify_pack's menu needs the inventory-selection path and is recorded.
// Returns true because the scroll has already been used up.
async function seffect_identify(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;
    const already_known = !!game.objects[otyp].oc_name_known;

    useup(sobj);

    if (confused || (scursed && !already_known))
        await You('identify this as an identify scroll.');
    else if (!already_known)
        await pline('This is an identify scroll.');
    if (!already_known)
        learnscrolltyp(ONAMES.SCR_IDENTIFY);
    if (confused || (scursed && !already_known))
        return true;

    if ((game.invent || []).length) {
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) {
            cval = rn2(5);
            /* note: if cval==0, identify all items */
            if (cval === 1 && sblessed && (game.u.uluck | 0) > 0)
                ++cval;
        }
        await identify_pack(cval, !already_known);
    }
    return true;
}

// src/read.c:2015 seffect_teleportation()
async function seffect_teleportation(sobj) {
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;

    if (confused || scursed) {
        const { level_tele } = await import('./teleport.js');
        await level_tele();
        /* gives "materialize on different/same level!" message, must
           be a teleport scroll */
        game.known = true;
    } else {
        /* src/read.c:2090 — scrolltele(): controlled getpos teleport when
           Teleport_control/blessed, else a random destination */
        const { scrolltele } = await import('./teleport.js');
        await scrolltele(sobj);
        game.known = true;
    }
}

// src/read.c:2100 seffect_magic_mapping()
async function seffect_magic_mapping(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic;

    if (game.level?.flags?.nommap) {
        note_unported_read('seffect_magic_mapping:nommap');
        return;
    }
    if (sblessed)
        note_unported_read('seffect_magic_mapping:blessed_reveal');
    game.known = true;

    await pline('A map coalesces in your mind!');
    const cval = (scursed && !confused);
    if (cval)
        note_unported_read('seffect_magic_mapping:cursed_confusion');
    /* notice_mon_off/_on wrap the mapping so newly drawn monsters are not
       announced */
    do_mapping();
}


const CP_MALE = 0, CP_FEMALE = 1, CP_NEUTRAL = 2;

function title_to_mon(str) {
    const lower = str.toLowerCase();
    for (const role of roles) {
        for (const rank of role.rank || []) {
            for (const title of [rank.m, rank.f]) {
                if (title && lower.startsWith(title.toLowerCase()))
                    return role.mnum;
            }
        }
    }
    return NON_PM;
}

function name_to_monclass(str) {
    if (!str)
        return { monclass: 0, which: NON_PM };

    if (str.length === 1) {
        let monclass = def_monsyms.indexOf(str);
        let which = NON_PM;
        if (monclass === MONSYMS.S_MIMIC_DEF)
            monclass = MONSYMS.S_MIMIC;
        else if (monclass === MONSYMS.S_WORM_TAIL) {
            monclass = MONSYMS.S_WORM;
            which = PMNAMES.PM_LONG_WORM;
        } else if (monclass < 0) {
            monclass = str === 'I' ? MONSYMS.S_invisible : 0;
        }
        return { monclass, which };
    }

    if (/^long$/i.test(str))
        return { monclass: 0, which: NON_PM };
    const singular = makesingular(str);
    if (/^(an|the|or|other|or other)$/i.test(singular))
        return { monclass: 0, which: NON_PM };

    const trueClasses = new Map([
        ['demon', MONSYMS.S_DEMON],
        ['devil', MONSYMS.S_DEMON],
        ['bug', MONSYMS.S_XAN],
        ['fish', MONSYMS.S_EEL],
    ]);
    const lower = singular.toLowerCase();
    if (lower === 'long worm') {
        return {
            monclass: game.mons[PMNAMES.PM_LONG_WORM].mlet,
            which: PMNAMES.PM_LONG_WORM,
        };
    }
    if (trueClasses.has(lower))
        return { monclass: trueClasses.get(lower), which: NON_PM };

    for (let i = 1; i < LIMITS.MAXMCLASSES; ++i) {
        const explanation = monexplain[i]?.toLowerCase() || '';
        const at = explanation.indexOf(lower);
        if (at >= 0 && (at === 0 || explanation[at - 1] === ' ')
            && (at + lower.length === explanation.length
                || explanation[at + lower.length] === ' ')) {
            return { monclass: i, which: NON_PM };
        }
    }

    const which = name_to_monplus(singular, {});
    return which >= 0
        ? { monclass: game.mons[which].mlet, which }
        : { monclass: 0, which: NON_PM };
}

async function parse_create_particular(str) {
    let bufp = str.trim().replace(/\s+/g, ' ');
    const commandCount = (game.multi || 0) > 0 ? game.multi : 0;
    let quan = 1 + commandCount;
    if (commandCount)
        game.multi = 0;
    const count = bufp.match(/^\d+/);
    if (count) {
        quan = Number.parseInt(count[0], 10);
        bufp = bufp.slice(count[0].length).trimStart();
    }
    const quanLimit = ROWNO * (COLNO - 1);
    if (quan < 1 || quan > quanLimit) {
        const { monster_census } = await import('./minion.js');
        quan = quanLimit - monster_census(false);
    }

    const takeModifier = (word) => {
        const re = new RegExp(`${word} `, 'i');
        const found = re.test(bufp);
        if (found)
            bufp = bufp.replace(re, ' ');
        return found;
    };
    const saddled = takeModifier('saddled');
    const sleeping = takeModifier('sleeping');
    const invisible = takeModifier('invisible');
    const hidden = takeModifier('hidden');
    let fem = -1;
    if (takeModifier('female'))
        fem = CP_FEMALE;
    if (takeModifier('male'))
        fem = CP_MALE;
    bufp = bufp.trim().replace(/\s+/g, ' ');

    let maketame = false, makepeaceful = false, makehostile = false;
    if (/^tame /i.test(bufp)) {
        maketame = true;
        bufp = bufp.slice(5);
    } else if (/^peaceful /i.test(bufp)) {
        makepeaceful = true;
        bufp = bufp.slice(9);
    } else if (/^hostile /i.test(bufp)) {
        makehostile = true;
        bufp = bufp.slice(8);
    }

    const base = {
        quan, monclass: LIMITS.MAXMCLASSES,
        which: game.urole.mnum, fem, genderconf: -1,
        randmonst: false, maketame, makepeaceful, makehostile,
        sleeping, saddled, invisible, hidden,
    };
    if (game.wizard && (bufp === '*' || /^random$/i.test(bufp)))
        return { valid: true, text: bufp, data: { ...base, randmonst: true } };

    const genderName = { v: CP_NEUTRAL };
    let which = name_to_monplus(bufp, {}, genderName);
    if (which < 0)
        which = title_to_mon(bufp);
    if (fem === CP_MALE || fem === CP_FEMALE) {
        if (genderName.v !== CP_NEUTRAL && fem !== genderName.v)
            base.genderconf = genderName.v;
    } else {
        base.fem = genderName.v;
    }
    if (which >= 0)
        return { valid: true, text: bufp, data: { ...base, which } };

    const byClass = name_to_monclass(bufp);
    if (byClass.which >= 0) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: byClass.which },
        };
    }
    if (byClass.monclass === MONSYMS.S_invisible) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: PMNAMES.PM_STALKER },
        };
    }
    if (byClass.monclass === MONSYMS.S_WORM_TAIL) {
        return {
            valid: true, text: bufp,
            data: { ...base, which: PMNAMES.PM_LONG_WORM },
        };
    }
    if (byClass.monclass > 0) {
        return {
            valid: true, text: bufp,
            data: { ...base, monclass: byClass.monclass },
        };
    }
    return { valid: false, text: bufp, data: null };
}

async function announce_created_monster(mtmp, mmflags) {
    const appearance = M_AP_TYPE(mtmp);
    let exclaim = !(mmflags & MM_NOEXCLAM);
    let what = null;

    if ((canseemon(mtmp) && (!appearance || appearance === M_AP_MONSTER))
        || sensemon(mtmp)) {
        what = Amonnam(mtmp);
        if (appearance === M_AP_MONSTER)
            exclaim = true;
    } else if (canseemon(mtmp)) {
        if (appearance === M_AP_OBJECT) {
            const fake = mksobj(mtmp.mappearance, false, false);
            if (fake.oclass === OCLASSES.COIN_CLASS)
                fake.quan = 2;
            const simple = simpleonames(fake);
            what = upstart(fake.quan === 1 ? an(simple) : simple);
        } else if (appearance === M_AP_FURNITURE) {
            what = upstart(an(defsyms[mtmp.mappearance]?.explain
                              || 'something'));
        } else {
            what = 'Something';
        }
    }
    if (!what)
        return;

    const near = Math.abs(mtmp.mx - game.u.ux) <= 1
              && Math.abs(mtmp.my - game.u.uy) <= 1;
    const where = near ? ' next to you'
                : distu(mtmp.mx, mtmp.my) <= BOLT_LIM * BOLT_LIM
                    ? ' close by' : '';
    set_msg_xy(mtmp.mx, mtmp.my);
    await Norep(`${what}${exclaim ? ' suddenly' : ''} ${
        vtense(what, 'appear')}${where}${exclaim ? '!' : '.'}`);
}

async function create_particular_creation(d) {
    let whichpm = null, firstchoice = NON_PM;
    let madeany = false;

    if (!d.randmonst) {
        firstchoice = d.which;
        if (d.which === PMNAMES.PM_GUARD
            || d.which === PMNAMES.PM_SHOPKEEPER
            || d.which === PMNAMES.PM_HIGH_CLERIC
            || d.which === PMNAMES.PM_ALIGNED_CLERIC
            || d.which === PMNAMES.PM_ANGEL) {
            d.which = PMNAMES.PM_HUMAN_ZOMBIE;
        } else if (d.which === PMNAMES.PM_LONG_WORM_TAIL) {
            d.which = PMNAMES.PM_LONG_WORM;
        } else if ((game.mons[d.which].geno & G_UNIQ) !== 0) {
            d.which = PMNAMES.PM_DOPPELGANGER;
        }

        if (d.which !== firstchoice
            && firstchoice !== PMNAMES.PM_LONG_WORM_TAIL) {
            const { tty_yn_function } = await import('./tty/topl.js');
            const answer = await tty_yn_function(
                `Creating ${mons_name(game.mons[d.which])} instead; force ${
                    mons_name(game.mons[firstchoice])}?`,
                'yn', 'n');
            if (answer === 'y')
                d.which = firstchoice;
        }
        whichpm = game.mons[d.which];
    }

    for (let i = 0; i < d.quan; ++i) {
        let mmflags = 0;
        if (d.monclass !== LIMITS.MAXMCLASSES)
            whichpm = mkclass(d.monclass, 0);
        else if (d.randmonst)
            whichpm = rndmonst();

        if (d.genderconf === -1) {
            if (d.fem !== -1
                && (!whichpm || (!is_male(whichpm) && !is_female(whichpm)))) {
                if (d.fem === CP_FEMALE)
                    mmflags |= MM_FEMALE;
                else if (d.fem === CP_MALE)
                    mmflags |= MM_MALE;
            }
            mmflags |= MM_NOEXCLAM;
        } else if (d.fem === CP_FEMALE) {
            mmflags |= MM_FEMALE;
        } else if (d.fem === CP_MALE) {
            mmflags |= MM_MALE;
        }
        if (d.invisible)
            mmflags |= MM_MINVIS;

        const mtmp = makemon(whichpm, game.u.ux, game.u.uy, mmflags);
        if (!mtmp) {
            if (d.monclass === LIMITS.MAXMCLASSES && !d.randmonst)
                break;
            continue;
        }
        const mx = mtmp.mx, my = mtmp.my;
        await announce_created_monster(mtmp, mmflags);

        if (d.maketame) {
            const { tamedog } = await import('./dog.js');
            await tamedog(mtmp, null, false);
        } else if (d.makepeaceful || d.makehostile) {
            mtmp.mtame = 0;
            mtmp.mpeaceful = d.makepeaceful ? 1 : 0;
            set_malign(mtmp);
        }
        if (d.saddled) {
            const { can_saddle, put_saddle_on_mon } = await import('./steed.js');
            if (can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE))
                put_saddle_on_mon(null, mtmp);
        }
        if (d.hidden
            && ((is_hider(mtmp.data) && mtmp.data.mlet !== MONSYMS.S_MIMIC)
                || (hides_under(mtmp.data) && OBJ_AT(mx, my))
                || (mtmp.data.mlet === MONSYMS.S_EEL && is_pool(mx, my)))) {
            mtmp.mundetected = 1;
            newsym(mx, my);
        }
        if (d.sleeping)
            mtmp.msleeping = 1;

        madeany = true;
        if (mtmp.cham !== NON_PM && firstchoice !== NON_PM
            && mtmp.cham !== firstchoice) {
            const { newcham } = await import('./mon.js');
            newcham(mtmp, game.mons[firstchoice], 0);
        }
    }
    return madeany;
}

// src/read.c:3372 create_particular(), the wizard-mode monster maker.
export async function create_particular() {
    const CP_TRYLIM = 5;
    let tryct = CP_TRYLIM, altmsg = 0;
    let prompt = 'Create what kind of monster?';

    do {
        const buf = await getlin(prompt);
        if (buf === null || buf === '\x1b')
            return false;
        /* C's getlin prompt separates this command from the preceding Norep
           message. Our prompt renderer does not feed _prevmsg, so clear it
           before the first creation announcement. */
        game._prevmsg = null;
        const parsed = await parse_create_particular(buf);
        if (parsed.valid)
            return create_particular_creation(parsed.data);

        if (parsed.text || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM)
            prompt += ' [type name or symbol]';
    } while (--tryct > 0);

    return false;
}

// src/wizcmds.c:203 wiz_genesis() — the ^G command.
export async function wiz_genesis() {
    if (game.wizard) {
        const mongen_saved = game.iflags?.debug_mongen;
        if (game.iflags) game.iflags.debug_mongen = false;
        await create_particular();
        if (game.iflags) game.iflags.debug_mongen = mongen_saved;
    } else {
        note_unported_read('wiz_genesis:unavailcmd');
    }
    return ECMD_OK;
}
