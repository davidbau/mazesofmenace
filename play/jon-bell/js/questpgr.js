// @ts-nocheck
// questpgr.js — quest-text delivery (C ref: nethack-c/src/questpgr.c).
//
// Ports the qt_pager() path that quest.c's on_start()/on_locate()/on_goal()
// use to deliver a role's quest plot text on level arrival:
//
//   qt_pager(msgid)
//     -> com_pager_core(gu.urole.filecode, msgid, FALSE, 0)   [role section]
//        -> lookup questtext[<filecode>][<msgid>] in dat/quest.lua
//        -> convert_line() every line (the %-arg substitutions)
//        -> deliver_by_window(text, NHW_TEXT)  (output == "text")
//           or deliver_by_pline(text)          (output == "pline"/default)
//        -> putmsghistory(convert_line(synopsis))
//     -> on lookup failure, com_pager_core("common", msgid, TRUE, 0)
//
// RNG: com_pager_core draws rn2(nelems) ONLY for an array-form entry (no
// "text" field).  Every entry ported here is a table with a "text" field, so
// this whole path is RNG-free — the same property js/mcastu.js:147 relies on
// for its (separate, array-form) cuss() com_pager.
import { pline } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
import { s_suffix as _s_suffix } from './hacklib.js';
import { permonstTemplate, monPmname } from './makemon.js';
import { NEUTRAL, MIN_QUEST_LEVEL } from './const.js';
/* C ref: obj.h OBJ_* chain ids + Has_contents(); questpgr.c:66-70
 * is_quest_artifact() lives in js/objnam.js (js/cmd.js's same-named export is a
 * throwing stub — the file-local-stub-shadows-real-port shape). */
import { OBJ_INVENT, OBJ_FLOOR, OBJ_MINVENT, OBJ_MIGRATING, OBJ_BURIED, Has_contents } from './const.js';
import { is_quest_artifact } from './objnam.js';
import { rank_of } from './rank_data.js';
import { putmsghistory } from './display.js';
import { roles as ROLES } from './roles.js';
import { nhlib_load_toplevel_rng } from './nhlib.js';

/* C monflag.h M2_PNAME — "the " is omitted for a proper-name monster. */
const M2_PNAME = 0x00080000;
/* C mondata.h type_is_pname(ptr) */
function type_is_pname(ptr) { return !!ptr && (ptr.mflags2 & M2_PNAME) !== 0; }

/* C role.c roles[].homebase — quest leader's location, roles[0..12]
 * (Arc Bar Cav Hea Kni Mon Pri Rog Ran Sam Tou Val Wiz).  Full table, not a
 * subset: every role's string is copied verbatim from role.c. */
const ROLE_HOMEBASE = [
    "the College of Archeology",       // 0 Arc  (role.c:43)
    "the Camp of the Duali Tribe",     // 1 Bar  (role.c:84)
    "the Caves of the Ancestors",      // 2 Cav  (role.c:125)
    "the Temple of Epidaurus",         // 3 Hea  (role.c:166)
    "Camelot Castle",                  // 4 Kni  (role.c:206)
    "the Monastery of Chan-Sune",      // 5 Mon  (role.c:246)
    "the Great Temple",                // 6 Pri  (role.c:287)
    "the Thieves' Guild Hall",         // 7 Rog  (role.c:330)
    "Orion's camp",                    // 8 Ran  (role.c:384)
    "the Castle of the Taro Clan",     // 9 Sam  (role.c:425)
    "Ankh-Morpork",                    // 10 Tou (role.c:465)
    "the Shrine of Destiny",           // 11 Val (role.c:505)
    "the Lonely Tower",                // 12 Wiz (role.c:545)
];

/* C role.c roles[].intermed — the intermediate quest target, roles[0..12]. */
const ROLE_INTERMED = [
    "the Tomb of the Toltec Kings",    // 0 Arc  (role.c:44)
    "the Duali Oasis",                 // 1 Bar  (role.c:85)
    "the Dragon's Lair",               // 2 Cav  (role.c:126)
    "the Temple of Coeus",             // 3 Hea  (role.c:167)
    "the Isle of Glass",               // 4 Kni  (role.c:207)
    "the Monastery of the Earth-Lord", // 5 Mon  (role.c:247)
    "the Temple of Nalzok",            // 6 Pri  (role.c:288)
    "the Assassins' Guild Hall",       // 7 Rog  (role.c:331)
    "the cave of the wumpus",          // 8 Ran  (role.c:385)
    "the Shogun's Castle",             // 9 Sam  (role.c:426)
    "the Thieves' Guild Hall",         // 10 Tou (role.c:466)
    "the cave of Surtur",              // 11 Val (role.c:506)
    "the Tower of Darkness",           // 12 Wiz (role.c:546)
];

/* C role.c urole[].ldrnum / guardnum / neminum, roles[0..12], expressed in the
 * js/pm.generated.js PM_ index space that monPmname()/permonstTemplate() use.
 * (js/makemon.js carries its own ROLE_LDRNUM/ROLE_NEMNUM in a DIFFERENT index
 * space — the monsPack row order — so those values are not reusable here;
 * reusing them named the Monk leader for a Samurai.  Verified: every one of the
 * 13 rows round-trips through monPmname() to the role.c monster.) */
const ROLE_LDRNUM = [
    344, // Arc PM_LORD_CARNARVON
    345, // Bar PM_PELIAS
    346, // Cav PM_SHAMAN_KARNOV
    347, // Hea PM_HIPPOCRATES
    348, // Kni PM_KING_ARTHUR
    349, // Mon PM_GRAND_MASTER
    350, // Pri PM_ARCH_PRIEST
    352, // Rog PM_MASTER_OF_THIEVES
    351, // Ran PM_ORION
    353, // Sam PM_LORD_SATO
    354, // Tou PM_TWOFLOWER
    355, // Val PM_NORN
    356, // Wiz PM_NEFERET_THE_GREEN
];
const ROLE_GUARDNUM = [
    369, // Arc PM_STUDENT
    370, // Bar PM_CHIEFTAIN
    371, // Cav PM_NEANDERTHAL
    372, // Hea PM_ATTENDANT
    373, // Kni PM_PAGE
    374, // Mon PM_ABBOT
    375, // Pri PM_ACOLYTE
    377, // Rog PM_THUG
    376, // Ran PM_HUNTER
    379, // Sam PM_ROSHI
    380, // Tou PM_GUIDE
    381, // Val PM_WARRIOR
    382, // Wiz PM_APPRENTICE
];
const ROLE_NEMNUM = [
    357, // Arc PM_MINION_OF_HUHETOTL
    358, // Bar PM_THOTH_AMON
    359, // Cav PM_CHROMATIC_DRAGON
    360, // Hea PM_CYCLOPS
    361, // Kni PM_IXOTH
    362, // Mon PM_MASTER_KAEN
    363, // Pri PM_NALZOK
    365, // Rog PM_MASTER_ASSASSIN
    364, // Ran PM_SCORPIUS
    366, // Sam PM_ASHIKAGA_TAKAUJI
    352, // Tou PM_MASTER_OF_THIEVES
    367, // Val PM_LORD_SURTUR
    368, // Wiz PM_DARK_ONE
];

/* C: Role_switch / gu.urole — the hero's role index into roles[].  game.urole
 * carries only {name,rank} at replay time (allmain.js populates it from
 * roles[initrole].name), so resolve the index by role name the way
 * js/display.js's rank lookup does. */
function _roleIdx() {
    const mnum = game.urole?.mnum;
    if (typeof mnum === 'number' && mnum >= 0 && mnum <= 12)
        return mnum;
    const nm = game.urole?.name;
    if (!nm) return -1;
    for (let i = 0; i < ROLES.length; i++) {
        if ((nm.m && ROLES[i].name.m === nm.m) || (nm.f && ROLES[i].name.f === nm.f))
            return ROLES[i].mnum | 0;
    }
    return -1;
}

/* C: gu.urole.filecode — the quest.lua section name for the hero's role. */
function _roleFilecode() {
    const r = _roleIdx();
    return r < 0 ? null : ROLES[r].filecode;
}

/* C questpgr.c:49 ldrname() — "%s%s", type_is_pname ? "" : "the ", pmname */
export function ldrname() {
    const r = _roleIdx();
    if (r < 0) return '';
    const i = ROLE_LDRNUM[r];
    const ptr = permonstTemplate(i);
    return `${type_is_pname(ptr) ? '' : 'the '}${monPmname(i, NEUTRAL)}`;
}

/* C questpgr.c:121 neminame() */
export function neminame() {
    const r = _roleIdx();
    if (r < 0) return '';
    const i = ROLE_NEMNUM[r];
    const ptr = permonstTemplate(i);
    return `${type_is_pname(ptr) ? '' : 'the '}${monPmname(i, NEUTRAL)}`;
}

/* C questpgr.c:132 guardname() — no "the " prefix */
export function guardname() {
    const r = _roleIdx();
    if (r < 0) return '';
    return monPmname(ROLE_GUARDNUM[r], NEUTRAL);
}

/* C questpgr.c:139 homebase() / :62 intermed() */
function homebase() {
    const r = _roleIdx();
    return r < 0 ? '' : ROLE_HOMEBASE[r];
}
function intermed() {
    const r = _roleIdx();
    return r < 0 ? '' : ROLE_INTERMED[r];
}

/* ── quest.lua text entries (dat/quest.lua questtext[<section>][<msgid>]) ────
 *
 * PORTED ENTRIES ONLY.  A msgid that is not here delivers nothing and reports
 * an impossible(), exactly as C's com_pager_core does when the lua lookup
 * fails (questpgr.c:522-539: impossible + return FALSE, non-fatal) — so an
 * unported entry surfaces as a MISSING-message divergence and a logged
 * "not ported" line, never as a silently-wrong substitute message.
 *
 * Text is copied verbatim from nethack-c/dat/quest.lua, including its line
 * breaks: deliver_by_window() splits on '\n' and putstr()s each line, so the
 * physical line layout IS the rendered window.
 *
 * The `firsttime` msgid is now ported for ALL THIRTEEN roles (quest.lua's own
 * section order: Arc Bar Cav Hea Kni Mon Pri Ran Rog Sam Tou Val Wiz).  Four
 * more entries are ported for the two roles whose sessions run the
 * chat_with_leader Rule-5 arm end to end: Arc.leader_first + Arc.badalign
 * (seed0361 steps 179/184) and Pri.leader_first + Pri.assignquest (seed0367
 * steps 194/197).  Everything else (nexttime, othertime, encourage, badlevel,
 * leader_next, posthanks, the locate/goal chains, and the other eleven roles'
 * leader text) remains unported and takes the report-and-drop path above. */
const QUESTTEXT = {
    /* dat/quest.lua:34-194 `common` — the section com_pager() reads directly
     * and the one qt_pager() falls back to.  goto_level()'s main-dungeon arm
     * (do.c:1926-1934) delivers quest_portal / quest_portal_again /
     * quest_portal_demand when the hero reaches the Quest branch entrance
     * without having answered the leader's call; all three were missing, so
     * that arm printed nothing.  seed0367 steps 235-239 are the measured loss:
     * quest_portal is `output = "pline"` over FOUR physical lines, i.e. four
     * separate plines, and C's topline pages between each of them. */
    common: {
        /* dat/quest.lua:182-188 */
        quest_portal: {
            output: 'pline',
            text: `You receive a faint telepathic message from %l:
Your help is urgently needed at %H!
Look for a ...ic transporter.
You couldn't quite make out that last message.`,
        },
        /* dat/quest.lua:189-191 */
        quest_portal_again: {
            text: 'You again sense %l pleading for help.',
        },
        /* dat/quest.lua:192-194 */
        quest_portal_demand: {
            text: 'You again sense %l demanding your attendance.',
        },
    },
    Arc: {
        /* dat/quest.lua:256-267 */
        firsttime: {
            output: 'text',
            synopsis: '[You arrive at %H, but all is not well.]',
            text: `You are suddenly in familiar surroundings.  The buildings in the distance
seem to be those of your old alma mater, but something is wrong.  It feels
as if there has been a riot recently, or %H has
been under siege.

All of the windows are boarded up, and there are objects scattered around
the entrance.

Strange forbidding shapes seem to be moving in the distance.`,
        },
        /* dat/quest.lua:320-326 */
        leader_first: {
            output: 'text',
            synopsis: '["You have returned, %p, to a difficult task."]',
            text: `"Finally you have returned, %p.  You were always
my most promising student.  Allow me to see if you are ready for the
most difficult task of your career."`,
        },
        /* dat/quest.lua:432-434 — on_start()'s repeat-visit message
         * (quest.c:31-34, taken when Qstat(not_ready) <= 2).  This was the
         * entry seed0361-archeologist-tour reported "not ported" twice: it
         * level-teleports back onto Home 1 at step 282 and again later, and C
         * pages "You materialize on a different level!--More--" precisely
         * BECAUSE this window follows.  With the entry missing, no window was
         * delivered, no --More-- was raised, and the ^V that C spent
         * dismissing the page leaked into rhack as a command — the
         * MISSING-CONSUME input-pointer desync at step 283 that
         * input-consumption-diff has been naming (it abstained while the
         * screen root was upstream; it is the root now). */
        nexttime: {
            text: 'Once again, you are back at %H.',
        },
        /* dat/quest.lua:458-461 — on_start()'s Qstat(not_ready) > 2 variant.
         * Two physical lines with `output` unset, so com_pager_core's
         * by_pline -> by_window promotion (questpgr.c:573-590) applies. */
        othertime: {
            text: `You are back at %H.
You have an odd feeling this may be the last time you ever come here.`,
        },
        /* dat/quest.lua:397-403 — the quest LOCATE level's arrival window
         * (quest.c on_locate -> qt_pager("locate_first")).  seed0361 step 308:
         * C's "A plain opens before you.  Beyond the plain lies a foreboding
         * edifice." over a --More--'d text window. */
        locate_first: {
            output: 'text',
            synopsis: '[This foreboding edifice must hide the entrance to %i.]',
            text: `A plain opens before you.  Beyond the plain lies a foreboding edifice.

You have the feeling that you will soon find the entrance to
%i.`,
        },
        /* dat/quest.lua:405-407 */
        locate_next: {
            text: 'Once again, you are near the entrance to %i.',
        },
        /* dat/quest.lua:326-334 — the quest NEMESIS level's arrival window
         * (quest.c on_goal -> qt_pager("goal_first")). */
        goal_first: {
            output: 'text',
            synopsis: '[This strange feeling must be the presence of %o.]',
            text: `A strange feeling washes over you, and you think back to things you
learned during the many lectures of %l.

You realize the feeling must be the presence of %o.`,
        },
        /* dat/quest.lua:336-338 */
        goal_next: {
            text: 'The familiar presence of %o is in the ether.',
        },
        /* dat/quest.lua:323-325 */
        goal_alt: {
            text: 'You have returned to %ns lair.',
        },
        /* dat/quest.lua:215-223 */
        badalign: {
            output: 'text',
            synopsis: '["%pC, you have strayed from the %a path.  Purify yourself!"]',
            text: `"%pC!  I've heard that you've been using sloppy techniques.  Your
results lately can hardly be called suitable for %ra!

"How could you have strayed from the %a path?  Go from here, and come
back only when you have purified yourself."`,
        },
    },
    Bar: {
        /* dat/quest.lua:482-496 */
        firsttime: {
            output: 'text',
            synopsis: '[You reach the vicinity of %H, but sense evil magic nearby.]',
            text: `Warily you scan your surroundings, all of your senses alert for signs
of possible danger.  Off in the distance, you can %x the familiar shapes
of %H.

But why, you think, should %l be there?

Suddenly, the hairs on your neck stand on end as you detect the aura of
evil magic in the air.

Without thought, you ready your weapon, and mutter under your breath:

    "By %d, there will be blood spilt today."`,
        },
        /* dat/quest.lua:498-504 — the quest NEMESIS level's arrival window
         * (quest.c:63 on_goal -> qt_pager("goal_first")). */
        goal_first: {
            output: 'text',
            synopsis: '[This is surely the lair of %n.]',
            text: `The hairs on the nape of your neck lift as you sense an energy in the
very air around you.  You fight down a primordial panic that seeks to
make you turn and run.  This is surely the lair of %n.`,
        },
        /* dat/quest.lua:505-507 — on_goal's repeat-visit arm, artifact present. */
        goal_next: {
            text: 'Yet again you feel the air around you heavy with malevolent magical energy.',
        },
        /* dat/quest.lua:562-569 — chat_with_leader's first-audience line. */
        leader_first: {
            output: 'text',
            synopsis: '["At last you have returned.  There is a great quest you must undertake."]',
            text: `"Ah, %p.  You have returned at last.  The world is in dire
need of your help.  There is a great quest you must undertake.

"But first, I must see if you are ready to take on such a challenge."`,
        },
        /* dat/quest.lua:580-582 */
        leader_next: {
            text: '"%p, you are back.  Are you ready now for the challenge?"',
        },
        /* dat/quest.lua:583-585 */
        leader_other: {
            text: '"Again, you stand before me, %p.  Surely you have prepared yourself."',
        },
        /* dat/quest.lua:586-591 — the quest LOCATE level's arrival window
         * (quest.c:50 on_locate -> qt_pager("locate_first")).  seed0373 step 55
         * level-teleports onto Bar-loca and C pages "You materialize on a
         * different level!--More--" precisely BECAUSE this window follows; with
         * the entry missing no window was delivered, no --More-- was raised, and
         * the space that C spent dismissing the page leaked into rhack. */
        locate_first: {
            output: 'text',
            synopsis: '[You have located %i.]',
            text: `The scent of water comes to you in the desert breeze.  You know that
you have located %i.`,
        },
        /* dat/quest.lua:592-594 — on_locate's return-visit arm. */
        locate_next: {
            text: 'Yet again you have a chance to infiltrate %i.',
        },
        /* dat/quest.lua:603-605 — chat_with_nemesis, repeat visit. */
        nemesis_next: {
            text: '"I have wasted too much time on you already.  Now, you shall die."',
        },
        /* dat/quest.lua:613-616 — on_start()'s repeat-visit message
         * (quest.c:31-34, taken when Qstat(not_ready) <= 2).  Two physical
         * lines with `output` unset, so com_pager_core's by_pline -> by_window
         * promotion (questpgr.c:573-590) applies. */
        nexttime: {
            text: `Once again, you near %H.  You know that %l
will be waiting.`,
        },
        /* dat/quest.lua:645-648 — on_start()'s Qstat(not_ready) > 2 variant. */
        othertime: {
            text: `Again, and you think possibly for the last time, you approach
%H.`,
        },
        /* dat/quest.lua:649-651 — chat_with_leader after the quest is done. */
        posthanks: {
            text: '"Tell us, %p, have you fared well on your great quest?"',
        },
        /* NOT PORTED from dat/quest.lua's Bar section, and deliberately so:
         * assignquest (416), badlevel (451), killed_nemesis (554),
         * leader_last (570), nemesis_first (595), nemesis_other (606),
         * nemesis_wantsit (609), hasamulet (529), offeredit2 (636) each use a
         * %-arg convert_arg()/convert_line() does not implement (%c, %Z, and the
         * qtext_pronoun forms %ni/%nj/%lj/%dJ/%ca/%cP).  Adding them would emit
         * text with the arg silently dropped, which is worse than the
         * impossible() the missing-msgid path reports.  The three array-form
         * entries (discourage 458, encourage 470, guardtalk_* 515/522) are held
         * back for a different reason: com_pager_core reads entry.text, and an
         * array-form entry is C's rn2(nelems) pick — a shape this port has not
         * ported anywhere, and one that DRAWS RNG. */
    },
    Cav: {
        /* dat/quest.lua:720-728 */
        firsttime: {
            output: 'text',
            synopsis: '[You arrive back at %H, but something is wrong here.]',
            text: `You descend through a barely familiar stairwell that you remember
%l showing you when you embarked upon your vision quest.

You arrive back at %H, but something seems
wrong here.  The usual smoke and glowing light of the fires of the
outer caves are absent, and an uneasy quiet fills the damp air.`,
        },
    },
    Hea: {
        /* dat/quest.lua:941-952 */
        firsttime: {
            output: 'text',
            synopsis: '[You arrive back at %H and must find %l.]',
            text: `What sorcery has brought you back to %H?  The smell
of fresh funeral pyres tells you that something is amiss with the healing
powers that used to practice here.

No rhizotomists are tending the materia medica gardens, and where are the
common folk who used to come for the cures?

You know that you must quickly make your way to the collegium, and
%ls iatreion, and find out what has happened in your absence.`,
        },
        /* dat/quest.lua:1010-1024 — chat_with_leader's first-visit text. */
        leader_first: {
            output: 'text',
            synopsis: '[%l is weak from the struggle with %n.  %lH wants to examine you.]',
            text: `Feebly, %l raises %lj head to look at you.

"It is good to see you again, %p.  I see the concern in your
eyes, but do not worry for me.  I am not ready for Hades yet.  We have
exhausted much of our healing powers holding off %n.
I need your fresh strength to carry on our work.

"Come closer and let me lay hands on you, and determine if you have
the skills necessary to accomplish this mission."`,
        },
        /* dat/quest.lua:1031-1037 — chat_with_leader's repeat-visit line. */
        leader_next: {
            text: `Again you return to me, %p.  I sense that each trip back
the pleurisy and maladies of our land begin to infect you.  Let us
hope and pray to %d that you become ready for your task before
you fall victim to the bad humors.`,
        },
        /* dat/quest.lua:877-898 — the worthy healer's assignment. */
        assignquest: {
            output: 'text',
            synopsis: '[Travel to %i on your way to recover %o from %n.]',
            text: `For the first time, you sense a smile on %ls face.

    "You have indeed learned as much as we can teach you in preparation
    for this task.  Let me tell you what I know of the symptoms and hope
    that you can provide a cure.

    "A short while ago, the dreaded %nt was fooled by the gods
    into thinking that %nh could use %o to find a
    cure for old age.  Think of it, eternal youth!  But %nj good
    health is accomplished by drawing the health from those around %ni.

    "He has exhausted %nj own supply of healthy people and now %nh seeks to
    extend %nj influence into our world.  You must recover from %ni
    %o and break the spell.

    "You must travel into the swamps to %i, and from there
    follow the trail to %ns island lair.  Be careful."`,
        },
        /* dat/quest.lua:1040-1045 — first arrival at the healer quest locate. */
        locate_first: {
            output: 'text',
            synopsis: '[You have reached %i but all is not well.]',
            text: `You stand before the entrance to %i.  Strange
scratching noises come from within the building.

The swampy ground around you seems to stink with disease.`,
        },
        /* dat/quest.lua:957-964 — first arrival at the healer quest goal. */
        goal_first: {
            output: 'text',
            synopsis: '[You have reached the lair of %n.  Take %o away from %ni.]',
            text: `You stand within sight of the infamous Isle of %n.  Even
the words of %l had not prepared you for this.

Steeling yourself against the wails of the ill that pierce your ears,
you hurry on your task.  Maybe with %o you can
heal them on your return, but not now.`,
        },
        /* dat/quest.lua:965-967 — repeat arrival at the healer quest goal. */
        goal_next: {
            text: 'Once again, you %x the Isle of %n in the distance.',
        },
    },
    Kni: {
        /* dat/quest.lua:1189-1196 — the quest GOAL level's first-visit arrival
         * text (quest.c:63 on_goal -> qt_pager("goal_first")).
         * Its absence cost more than the four lines: qt_pager (questpgr.c:630)
         * is `if (!com_pager_core(filecode, msgid, FALSE))
         * com_pager_core("common", msgid, TRUE)`, and the fallback opens a
         * SECOND Lua state whose nhlib.lua body draws rn2(3)+rn2(2) on the core
         * RNG -- the standing `impossible: com_pager: questtext[common]
         * [goal_first] not ported` on every replay of
         * seed4500-knight-coverage, whose last 15 frames it owned. */
        goal_first: {
            output: 'text',
            synopsis: '[You %x the entrance to a cavern inside a hill.]',
            text: `As you exit the swamps, you %x before you a huge, gaping hole in the
side of a hill.  From within, you smell the foul stench of carrion.

The pools on either side of the entrance are fouled with blood, and
pieces of rusted metal and broken weapons show above the surface.`,
        },
        /* dat/quest.lua:1197-1199 — on_goal's return-visit arm. */
        goal_next: {
            text: 'Again, you stand at the entrance to %ns lair.',
        },
        /* dat/quest.lua:1178-1186 */
        firsttime: {
            output: 'text',
            synopsis: '[Signs of battle include long gouges in the walls of %H.]',
            text: `You materialize in the shadows of %H.  Immediately, you notice
that something is wrong.  The fields around the castle are trampled and
withered, as if some great battle has been recently fought.

Exploring further, you %x long gouges in the walls of %H.
You know of only one creature that makes those kinds of marks...`,
        },
    },
    Mon: {
        /* dat/quest.lua:1388-1395 */
        firsttime: {
            output: 'text',
            synopsis: '[You have reached %H but something is wrong.  %lC needs your aid.]',
            text: `You find yourself standing in sight of %H.
Something is obviously wrong here.  Strange shapes lumber around
outside %H!

You realize that %l needs your assistance!`,
        },
    },
    Pri: {
        /* dat/quest.lua:1601-1609 */
        firsttime: {
            output: 'text',
            synopsis: '[You are at %H; the doors are closed.  %lC needs your help!]',
            text: `You find yourself standing in sight of %H.  Something
is obviously wrong here.  The doors to %H, which usually
stand open, are closed.  Strange human shapes shamble around
outside.

You realize that %l needs your assistance!`,
        },
        /* dat/quest.lua:1671-1678 */
        leader_first: {
            output: 'text',
            synopsis: '[You have returned and we need your help.  Are you ready?]',
            text: `"Ah, %p, my %S.  You have returned to us at last.
A great blow has befallen our order; perhaps you can help us.
First, however, I must determine if you are prepared for this
great challenge."`,
        },
        /* dat/quest.lua:1693-1702 — the quest LOCATE level's arrival window
         * (quest.c on_locate -> qt_pager("locate_first")). */
        locate_first: {
            output: 'text',
            synopsis: '[You have found %i.  The trail to %n lies ahead.]',
            text: `You stand facing a large graveyard.  The sky above is filled with clouds
that seem to get thicker closer to the center.  You sense the presence of
undead in larger numbers than you have ever encountered before.

You remember the descriptions of %i, given to you by
%l.  It is ahead that you will find %ns trail.`,
        },
        /* dat/quest.lua:1703-1705 */
        locate_next: {
            text: 'Again, you stand before %i.',
        },
        /* dat/quest.lua:1597-1604 — the quest NEMESIS level's arrival window
         * (quest.c on_goal -> qt_pager("goal_first")). */
        goal_first: {
            output: 'text',
            synopsis: '[The stench of brimstone surrounds you, the shrieks and moans are endless.]',
            text: `The stench of brimstone is all about you, and the shrieks and moans
of tortured souls assault your psyche.

Ahead, there is a small clearing amidst the bubbling pits of lava...`,
        },
        /* dat/quest.lua:1605-1607 */
        goal_next: {
            text: 'Again, you have invaded %ns domain.',
        },
        /* dat/quest.lua:1741-1743 — on_start()'s repeat-visit message. */
        nexttime: {
            text: 'Once again, you stand before %H.',
        },
        /* dat/quest.lua:1755-1758 — on_start()'s not_ready > 2 variant.  Two
         * physical lines with `output` unset, so com_pager_core's by_pline ->
         * by_window promotion (questpgr.c:573-590) applies and synthesizes the
         * bracketed synopsis. */
        othertime: {
            text: `Again you face %H.  Your intuition hints that this may be
the final time you come here.`,
        },
        /* dat/quest.lua:1539-1559 */
        assignquest: {
            output: 'text',
            synopsis: '[%nC invaded %H and captured %o.  Defeat %ni and retrieve %oh.]',
            text: `"Yes, %p.  You are truly ready now.  Attend to me and I shall
tell you of what has transpired:

"At one of the Great Festivals a short time ago, %n and a legion
of undead invaded %H.  Many %gP were killed, including
the one carrying %o.

"As a final act of vengefulness, %n desecrated the altar here.
Without it, we could not mount a counter-attack.  Now, there are
barely enough %gP left to keep the undead at bay.

"We need you to find %i, then, from there, travel
to %ns lair.  If you can manage to defeat %n and return
%o here, we can then drive off the legions of
undead that befoul the land.

"Go with %d as your guide, %p."`,
        },
    },
    Ran: {
        /* dat/quest.lua:1824-1831 */
        firsttime: {
            output: 'text',
            synopsis: '[The ancient forest grove is surrounded by centaurs.]',
            text: `You arrive in familiar surroundings.  In the distance, you %x the
ancient forest grove, the place of worship to %d.

Something is wrong, though.  Surrounding the grove are centaurs!
And they've noticed you!`,
        },
    },
    Rog: {
        /* dat/quest.lua:2044-2049 */
        firsttime: {
            output: 'text',
            synopsis: '[You are in Ransmannsby, where you trained.  Find %l.]',
            text: `Unexpectedly, you find yourself back in Ransmannsby, where you trained to
be a thief.  Quickly you make the guild sign, hoping that you AND word
of your arrival reach %ls den.`,
        },
    },
    Sam: {
        /* dat/quest.lua:2260-2272 */
        firsttime: {
            output: 'text',
            synopsis: '[The banner of %n flies above town.  What has happened to %l?]',
            text: `Even before your senses adjust, you recognize the kami of
%H.

You %x the standard of your teki, %n, flying above
the town.  How could such a thing have happened?  Why are ninja
wandering freely; where are the samurai of your daimyo, %l?

You quickly say a prayer to Izanagi and Izanami and walk towards
town.`,
        },
    },
    Tou: {
        /* dat/quest.lua:2492-2502 */
        firsttime: {
            output: 'text',
            synopsis: '[You find yourself back at %H, but the quiet is ominous.]',
            text: `You breathe a sigh of relief as you find yourself back in the familiar
surroundings of %H.

You quickly notice that things do not appear the way they did when you
left.  The town is dark and quiet.  There are no sounds coming from
behind the town walls, and no campfires burning in the fields.  As a
matter of fact, you do not %x any movement in the fields at all, and
the crops seem as though they have been untended for many weeks.`,
        },
    },
    Val: {
        /* dat/quest.lua:2713-2723 */
        firsttime: {
            output: 'text',
            synopsis: '[You arrive below %H.  Something is wrong; there is lava present.]',
            text: `You materialize at the base of a snowy hill.  Atop the hill sits
a place you know well, %H.  You immediately realize
that something here is very wrong!

In places, the snow and ice have been melted into steaming pools of
water.  Fumaroles and pools of bubbling lava surround the hill.
The stench of sulphur is carried through the air, and you %x creatures
that should not be able to live in this environment moving towards you.`,
        },
    },
    Wiz: {
        /* dat/quest.lua:2930-2942 */
        firsttime: {
            output: 'text',
            synopsis: '[You have arrived at %ls tower but something is very wrong.]',
            text: `You are suddenly in familiar surroundings.  You notice what appears to
be a large, squat stone structure nearby.  Wait!  That looks like the
tower of your former teacher, %l.

However, things are not the same as when you were last here.  Mists and
areas of unexplained darkness surround the tower.  There is movement in
the shadows.

Your teacher would never allow such unaesthetic forms to surround the
tower...  unless something were dreadfully wrong!`,
        },
        /* dat/quest.lua:3053-3055 — on_start()'s repeat-visit message.  Keep
         * this role entry even though its text matches Arc.nexttime: C finds
         * Wiz.nexttime on the first com_pager_core() attempt.  Falling back
         * to common would initialize a second Lua state and consume another
         * nhlib.lua align shuffle (rn2(3), rn2(2)). */
        nexttime: {
            text: 'Once again, you are back at %H.',
        },
        /* dat/quest.lua:3010-3012 — the quest LOCATE level's arrival message
         * (quest.c:41 on_locate -> qt_pager("locate_first")).
         *
         * Its absence was NOT just a missing message.  qt_pager (questpgr.c:630)
         * is `if (!com_pager_core(filecode, msgid, FALSE)) com_pager_core("common",
         * msgid, TRUE)`, and com_pager_core opens a FRESH Lua state, whose
         * nhlib.lua module body runs `shuffle(align)` and therefore draws
         * rn2(3) + rn2(2) on the CORE rng (js/nhlib.js nhlib_load_toplevel_rng).
         * So a msgid missing from the role section costs TWO EXTRA RNG LEAVES,
         * every time, on top of the missing text.  seed0360-wizard-world-tour
         * step 781: C delivers this line and loads one Lua state; this port
         * missed on `Wiz`, fell back to `common` (which has no locate_first
         * either — hence the standing `impossible: com_pager:
         * questtext[common][locate_first] not ported` on every replay of this
         * session) and loaded two, putting the stream two leaves ahead just
         * before the Home-2 filler level was generated. */
        locate_first: {
            text: 'Wisps of fog swirl nearby.  You feel that %ns lair is close.',
        },
        /* dat/quest.lua:3013-3015 — quest.c:47 on_locate's return-visit arm. */
        locate_next: {
            text: 'You believe that you may once again invade %i.',
        },
        /* dat/quest.lua:2947-2949 — quest.c on_goal, nemesis level, first visit. */
        goal_first: {
            text: "You feel your mentor's presence; perhaps %o is nearby.",
        },
        /* dat/quest.lua:2950-2952 */
        goal_next: {
            text: 'The aura of %o tingles at the edge of your perception.',
        },
        /* dat/quest.lua:2944-2946 — on_goal's killed_nemesis arm. */
        goal_alt: {
            text: 'You have returned to %ns lair.',
        },
    },
};

/* C role.c align_gname() lives in js/cmd.js, which STATICALLY imports this
 * file (cmd.js:33 `import { qt_pager }`), so importing it back statically
 * would close an ESM cycle.  convert_arg() is synchronous (convert_line() maps
 * it over every line), so the module is loaded once from com_pager_core — the
 * only async entry point into this path — and cached here.  Same dynamic-import
 * convention deliver_by_window() already uses for display_text_window. */
let _cmdmod = null;

/* C questpgr.c:196 convert_arg(c) — expand one %-arg into cvt_buf. */
function convert_arg(c) {
    const u = game.u || {};
    switch (c) {
    case 'p': return String(game.plname ?? game.u?.plname ?? '');
    case 'l': return ldrname();
    case 'i': return intermed();
    case 'n': return neminame();
    case 'g': return guardname();
    case 'H': return homebase();
    case 'x': return _Blind() ? 'sense' : 'see';
    case 'd': {
        /* C questpgr.c:296-298: str = align_gname(u.ualignbase[A_ORIGINAL]).
         * align.h: A_ORIGINAL == 1 (u.ualignbase[] is [A_CURRENT, A_ORIGINAL]).
         * js/objnam.js:2858 reads the same slot for the des.message() copy of
         * this switch. */
        const gname = _cmdmod?.align_gname((u.ualignbase?.[1]) | 0);
        if (gname == null) {
            _impossible('convert_arg: %d — cmd.js not loaded');
            return '';
        }
        return String(gname);
    }
    /* C questpgr.c:247-252 — %r/%R: rank_of(u.ulevel, Role_switch, flags.female)
     * and rank_of(MIN_QUEST_LEVEL, ...).  rank_of() is js/rank_data.js, the ONE
     * copy of botl.c:332 (its header records the three that preceded it); its
     * roleIdx argument is roles[] order, which is what _roleIdx() returns. */
    case 'r': return _rank_of_hero(game.u?.ulevel | 0);
    case 'R': return _rank_of_hero(MIN_QUEST_LEVEL);
    /* C questpgr.c:253-258 */
    case 's': return _female() ? 'sister' : 'brother';
    case 'S': return _female() ? 'daughter' : 'son';
    /* C questpgr.c:262-271 — %o/%O: the(artiname(gu.urole.questarti)); %O then
     * shortens "the Foo of Bar" to "the Foo" by truncating at " of ". */
    case 'o': case 'O': {
        const r = _roleIdx();
        if (r < 0) return '';
        const s = _the(ROLE_QUESTARTI[r]);
        if (c === 'O') {
            const p = s.indexOf(' of ');
            if (p >= 0) return s.slice(0, p);
        }
        return s;
    }
    /* C questpgr.c:284-289 — %a: align_str(u.ualignbase[A_ORIGINAL]);
     * %A: align_str(u.ualign.type).  align.h: A_ORIGINAL == 1. */
    case 'a': return _align_str((game.u?.ualignbase?.[1]) | 0);
    case 'A': return _align_str((game.u?.ualign?.type) | 0);
    case 'C': return 'chaotic';
    case 'N': return 'neutral';
    case 'L': return 'lawful';
    case '%': return '%';
    default:
        /* Unported arg (%c/%G/%D/%Z): C's default arm yields "" for an UNKNOWN
         * letter, but these are known letters we have not ported.  Emitting ""
         * here would silently drop text, so report it (the entry is unusable)
         * and drop, matching the unported msgid policy above. */
        _impossible(`convert_arg: %${c} not ported`);
        return '';
    }
}

/* C botl.c:332 rank_of(lev, Role_switch, flags.female), through the one shared
 * table. */
function _rank_of_hero(lev) {
    const r = _roleIdx();
    if (r < 0) return '';
    return rank_of(r, lev | 0, _female());
}
/* C flag.h flags.female. */
function _female() { return !!(game.flags?.female); }
/* C: quest leaders Norn and Neferet are the only female role leaders. */
function _leader_female() { const r = _roleIdx(); return r === 11 || r === 12; }
/* C insight.c:3186-3200 align_str(alignment).  align.h:19-23 — A_NONE -128,
 * A_CHAOTIC -1, A_NEUTRAL 0, A_LAWFUL 1. */
function _align_str(alignment) {
    switch (alignment | 0) {
    case -1: return 'chaotic';
    case 0: return 'neutral';
    case 1: return 'lawful';
    case -128: return 'unaligned';
    }
    return 'unknown';
}
/* C role.c roles[].questarti, as the artilist.h name string, roles[0..12] in
 * role.c order (Arc Bar Cav Hea Kni Mon Pri Rog Ran Sam Tou Val Wiz).  Stored as
 * the raw artifact name so _the() below can do exactly what C's the() does; the
 * artifact table itself is not ported, and artiname() has no other caller here.
 * Line numbers are nethack-c-v5/upstream/include/artilist.h. */
const ROLE_QUESTARTI = [
    'The Orb of Detection',                 // 0 Arc  role.c:54  artilist.h:219
    'The Heart of Ahriman',                 // 1 Bar  role.c:95  artilist.h:225
    'The Sceptre of Might',                 // 2 Cav  role.c:136 artilist.h:232
    'The Staff of Aesculapius',             // 3 Hea  role.c:177 artilist.h:248
    'The Magic Mirror of Merlin',           // 4 Kni  role.c:217 artilist.h:255
    'The Eyes of the Overworld',            // 5 Mon  role.c:257 artilist.h:260
    'The Mitre of Holiness',                // 6 Pri  role.c:298 artilist.h:265
    'The Master Key of Thievery',           // 7 Rog  role.c:341 artilist.h:279
    'The Longbow of Diana',                 // 8 Ran  role.c:395 artilist.h:271
    'The Tsurugi of Muramasa',              // 9 Sam  role.c:436 artilist.h:285
    'The Platinum Yendorian Express Card',  // 10 Tou role.c:476 artilist.h:291
    'The Orb of Fate',                      // 11 Val role.c:516 artilist.h:297
    'The Eye of the Aethiopica',            // 12 Wiz role.c:556 artilist.h:303
];
/* C objnam.c the(str) — the arm that matters for the quest-artifact names above:
 * a string already starting with "the " (case-insensitively) keeps its article
 * and has its first letter LOWERCASED, so "The Mitre of Holiness" renders as
 * "the Mitre of Holiness" (seed0367 step 197 records exactly that).  The
 * remaining the() arms (leading quote, a lowercase or non-alphabetic first
 * letter, "Foo's", the shk/proper-noun cases) are unreachable from this table —
 * every one of its 13 entries begins "The ". */
function _the(str) {
    const s = String(str ?? '');
    if (s.slice(0, 4).toLowerCase() === 'the ')
        return s[0].toLowerCase() + s.slice(1);
    return `the ${s}`;
}

function _Blind() {
    /* C: Blind — the hero cannot see.  The only quest text this file delivers
     * uses it for see/sense; read the same uprops slot display.js does. */
    const BLINDED = 15; /* prop.h BLINDED */
    const p = game.u?.uprops?.[BLINDED];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0) || (p.blocked | 0) === -1);
}

function _impossible(msg) {
    /* Non-fatal, matching C's impossible() in this file's error paths. */
    if (typeof console !== 'undefined' && console.error)
        console.error(`impossible: ${msg}`);
}

/* C questpgr.c:262 convert_line(in_line, out_line) — %-arg substitution for one
 * line.  Ports the arms reachable from the entries above: the bare arg (default
 * `--c` undo), plus An/an, capitalize, pluralize, possessive and "the "-strip.
 * The pronoun arms (%.h/%.H/%.i/%.I/%.j/%.J) are NOT ported — no ported entry
 * uses them; hitting one reports and falls through to the bare arg. */
function convert_line(in_line) {
    let out = '';
    for (let i = 0; i < in_line.length; i++) {
        const ch = in_line[i];
        if (ch === '\r' || ch === '\n')
            return out;                     /* C: terminate the line here */
        if (ch !== '%' || i + 1 >= in_line.length) {
            out += ch;
            continue;
        }
        /* convert_arg(*(++c)) then switch (*(++c)) */
        let buf = convert_arg(in_line[++i]);
        const mod = in_line[i + 1];
        switch (mod) {
        case 'A': i++; out += _An(buf); continue;
        case 'a': i++; out += _an(buf); continue;
        case 'C': i++; buf = _highc(buf); break;
        case 'P': i++; buf = _highc(_makeplural(buf)); break;
        case 'p': i++; buf = _makeplural(buf); break;
        case 'S': i++; buf = _highc(_s_suffix(buf)); break;
        case 's': i++; buf = _s_suffix(buf); break;
        case 't': i++;
            if (buf.slice(0, 4).toLowerCase() === 'the ') { out += buf.slice(4); continue; }
            break;
        case 'h': case 'H': case 'i': case 'I': case 'j': case 'J':
            /* C questpgr.c:qtext_pronoun — the quest leader's pronoun. */
            if ('dlno'.includes(in_line[i].toLowerCase())) {
                i++;
                /* %l names the role leader; the other pronoun sources in
                 * quest.lua (%n/%d/%o) are not female in the role table. */
                const female = in_line[i].toLowerCase() === 'l' && _leader_female();
                const forms = female
                    ? { h: 'she', H: 'She', i: 'her', I: 'Her', j: 'her', J: 'Her' }
                    : { h: 'he', H: 'He', i: 'him', I: 'Him', j: 'his', J: 'His' };
                out += forms[mod] ?? buf;
                continue;
            }
            break;
        default:
            break;                          /* C: --c, i.e. don't consume mod */
        }
        out += buf;
    }
    return out;
}

function _highc(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function _an(s) { return (s && 'aeiouAEIOU'.includes(s[0])) ? `an ${s}` : `a ${s}`; }
function _An(s) { return _highc(_an(s)); }
function _makeplural(s) { return s.endsWith('s') ? s : `${s}s`; }

/* C questpgr.c:436 deliver_by_window(msg, how) — one nhwindow, one putstr per
 * converted line, display_nhwindow(datawin, TRUE). */
async function deliver_by_window(text, how) {
    const { display_text_window } = await import('./cmd.js');
    const lines = String(text).split('\n').map(convert_line);
    /* NHW_MENU delivery (output == "menu") is not ported — no entry in
     * QUESTTEXT uses it; report rather than paint the wrong window shape. */
    if (how === 'menu')
        _impossible('deliver_by_window: NHW_MENU delivery not ported');
    await display_text_window(lines);
}

/* C questpgr.c:427 deliver_by_pline(msg) — one pline per converted line. */
async function deliver_by_pline(text) {
    const { pline } = await import('./display.js');
    for (const line of String(text).split('\n')) {
        const out = convert_line(line);
        if (out) await pline(out);
    }
}

/* C questpgr.c:467 com_pager_core(section, msgid, showerror, rawtext).
 * rawtext is unused here (only stinky_nemesis passes it).  Returns TRUE when a
 * message was delivered. */
async function com_pager_core(section, msgid, showerror) {
    /* Populate the convert_arg('d') → align_gname() handle before any
     * (synchronous) convert_line() runs.  Pure module resolution: no RNG, no
     * game state touched, so its position relative to nhl_init is immaterial. */
    if (!_cmdmod)
        _cmdmod = await import('./cmd.js');
    /* C questpgr.c:458 skip_pager() — WIZKIT suppression. */
    if (game.program_state?.wizkit_wishing)
        return false;
    /* C questpgr.c:487 — L = nhl_init(&sbi), immediately after skip_pager() and
     * BEFORE the questtext[section][msgid] lookup.  nhl_init() (nhlua.c:2511)
     * always ends by loading nhlib.lua, whose module body runs
     * `align = {...}; shuffle(align)` — rn2(3) then rn2(2) on the core RNG.
     * Every fresh Lua state pays this; the level loaders and the newgame legacy
     * com_pager already do (js/fastforward.js:200), but this call site did not,
     * so a quest arrival delivered its text drawing no RNG at all.
     * Position matters twice over: the rolls happen even when this section has
     * no such msgid (C reads the table only after nhl_init succeeds), and
     * qt_pager()'s role-then-"common" retry therefore pays them TWICE. */
    nhlib_load_toplevel_rng();
    const entry = QUESTTEXT[section]?.[msgid];
    if (!entry) {
        if (showerror)
            _impossible(`com_pager: questtext[${section}][${msgid}] not ported`);
        return false;
    }
    /* howtoput2i: pline->1, window->2, text->2, menu->3, default->0 */
    let output = { pline: 1, window: 2, text: 2, menu: 3 }[entry.output] ?? 0;
    let text = entry.text;
    let synopsis = entry.synopsis;
    /* C questpgr.c:573-590 — by_pline promotes to by_window for multi-line or
     * over-long text, synthesizing a bracketed one-line synopsis. */
    if (output === 0 && (text.includes('\n') || text.length >= 255)) {
        output = 2;
        if (!synopsis)
            synopsis = `[${text.replace(/\n/g, ' ')}]`;
    }
    if (output === 0 || output === 1)
        await deliver_by_pline(text);
    else
        await deliver_by_window(text, output === 3 ? 'menu' : 'text');
    /* C questpgr.c:597-606 — the synopsis bypasses message delivery but is
     * available for ^P recall. */
    if (synopsis)
        putmsghistory(convert_line(synopsis), false);
    return true;
}

/* C ref: questpgr.c:72-84 find_qarti(ochain) — walk one object chain (and the
 * contents of any container on it, recursively) for the current role's quest
 * artifact. */
function find_qarti(ochain) {
    for (let otmp = ochain; otmp; otmp = otmp.nobj) {
        if (is_quest_artifact(otmp))
            return otmp;
        if (Has_contents(otmp)) {
            const qarti = find_qarti(otmp.cobj);
            if (qarti)
                return qarti;
        }
    }
    return null;
}
/* C ref: questpgr.c:86-120 find_quest_artifact(whichchains) — "check several
 * object chains for the quest artifact to determine whether it is present on
 * the current level".  on_goal()'s repeat-visit arm is its only caller in this
 * port; it decides between the goal_next and goal_alt quest messages. */
export function find_quest_artifact(whichchains) {
    const g = game;
    let qarti = null;
    if ((whichchains & (1 << OBJ_INVENT)) !== 0)
        qarti = find_qarti(g.invent);
    if (!qarti && (whichchains & (1 << OBJ_FLOOR)) !== 0)
        qarti = find_qarti(g.fobj);
    if (!qarti && (whichchains & (1 << OBJ_MINVENT)) !== 0)
        for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1) /* DEADMONSTER */
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != null)
                break;
        }
    if (!qarti && (whichchains & (1 << OBJ_MIGRATING)) !== 0) {
        /* check migrating objects and minvent of migrating monsters */
        for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1)
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != null)
                break;
        }
        if (!qarti)
            qarti = find_qarti(g.migrating_objs);
    }
    if (!qarti && (whichchains & (1 << OBJ_BURIED)) !== 0)
        qarti = find_qarti(g.level?.buriedobjlist);

    return qarti;
}

/* C questpgr.c:624 com_pager(msgid) — the "common" section. */
export async function com_pager(msgid) {
    await com_pager_core('common', msgid, true);
}

/* C questpgr.c:630 qt_pager(msgid) — role section, falling back to "common". */
export async function qt_pager(msgid) {
    const filecode = _roleFilecode();
    if (!filecode || !(await com_pager_core(filecode, msgid, false)))
        await com_pager_core('common', msgid, true);
}
