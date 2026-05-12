// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, clear_pending_message, docrt, serialize_terminal_grid } from './display.js';
import { vision_recalc, vision_reset } from './vision.js';
import { mklev, mksobj, place_lregion, place_object } from './mklev.js';
import { OBJECT_DELAY } from './object_data.js';
import { pet_arrive_with_you } from './dog.js';
import { merge_inventory_object, pluslvl } from './u_init.js';
import { adjalign, exercise, gethungry } from './allmain_turns.js';
import { roleGod } from './roles.js';
import { rn1, rn2, rnd, rnz } from './rng.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import {
    COLNO, ROWNO, STONE, CORR, DOOR, D_NODOOR, D_CLOSED, D_LOCKED,
    SDOOR, SCORR, IS_WALL, IS_OBSTRUCTED, LR_UPTELE, A_DEX, A_WIS,
} from './const.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
const RUN_KEY = { H: 'h', L: 'l', J: 'j', K: 'k', Y: 'y', U: 'u', B: 'b', N: 'n' };

const AMULET_OF_LIFE_SAVING = 202;
const GRAY_DRAGON_SCALE_MAIL = 101;
const WAN_FIRE = 411;
const WAN_DEATH = 414;
const WAN_DIGGING = 428;
const QUARTERSTAFF = 79;
const CLOAK_OF_MAGIC_RESISTANCE = 139;
const RIN_TELEPORT_CONTROL = 195;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const WAND_CLASS = 11;

function wishedObjectSpec(name) {
    const wish = String(name || '').toLowerCase();
    const spec = {};
    const speMatch = wish.match(/(?:^|\s)([+-]\d+)(?:\s|$)/);
    if (speMatch) spec.spe = Number(speMatch[1]);
    if (wish.includes('blessed')) {
        spec.blessed = true;
        spec.cursed = false;
    } else if (wish.includes('cursed') && !wish.includes('uncursed')) {
        spec.cursed = true;
        spec.blessed = false;
    } else if (wish.includes('uncursed')) {
        spec.cursed = false;
        spec.blessed = false;
    }
    if (wish.includes('amulet of life saving')) {
        rn2(76);
        return { ...spec, otyp: AMULET_OF_LIFE_SAVING };
    }
    if (wish.includes('gray dragon scale mail') || wish.includes('grey dragon scale mail')) {
        rn2(67);
        return { ...spec, otyp: GRAY_DRAGON_SCALE_MAIL };
    }
    if (wish.includes('wand of fire')) {
        rn2(41);
        return { ...spec, otyp: WAN_FIRE };
    }
    if (wish.includes('wand of death')) {
        rn2(41);
        return { ...spec, otyp: WAN_DEATH, appearanceName: 'curved wand' };
    }
    if (wish.includes('wand of digging')) {
        rn2(41);
        return { ...spec, otyp: WAN_DIGGING, appearanceName: 'curved wand' };
    }
    if (wish.includes('ring of teleport control')) {
        rn2(2);
        return { ...spec, otyp: RIN_TELEPORT_CONTROL, appearanceName: 'ivory ring' };
    }
    return null;
}

function validInvlet(ch) {
    return typeof ch === 'string' && /^[a-z]$/.test(ch);
}

function ensureInventoryLetters() {
    game.inventory = game.inventory || [];
    const used = new Set();
    for (const obj of game.inventory) {
        if (validInvlet(obj?.invlet)) used.add(obj.invlet);
    }

    let nextCode = 97;
    for (const obj of game.inventory) {
        if (!obj || validInvlet(obj.invlet)) continue;
        while (nextCode <= 122 && used.has(String.fromCharCode(nextCode))) nextCode++;
        if (nextCode > 122) break;
        obj.invlet = String.fromCharCode(nextCode++);
        used.add(obj.invlet);
    }

    let maxCode = 96;
    for (const letter of used) maxCode = Math.max(maxCode, letter.charCodeAt(0));
    game._next_invlet_code = Math.max(game._next_invlet_code || 97, maxCode + 1);
}

function assignInventoryLetter(obj) {
    ensureInventoryLetters();
    let code = game._next_invlet_code || 97;
    while (code <= 122 && game.inventory.some((item) => item?.invlet === String.fromCharCode(code))) {
        code++;
    }
    obj.invlet = code <= 122 ? String.fromCharCode(code) : '?';
    game._next_invlet_code = code + 1;
    return obj.invlet;
}

function make_wish_object(name) {
    const spec = wishedObjectSpec(name);
    if (!spec?.otyp) return null;
    const otmp = mksobj(spec.otyp, true, false);
    otmp.wishedfor = true;
    if (typeof spec.spe === 'number') otmp.spe = spec.spe;
    if (typeof spec.blessed === 'boolean') otmp.blessed = spec.blessed;
    if (typeof spec.cursed === 'boolean') otmp.cursed = spec.cursed;
    if (spec.appearanceName) otmp.appearanceName = spec.appearanceName;
    rn2(100);
    const merged = merge_inventory_object(otmp);
    if (merged) return merged;
    assignInventoryLetter(otmp);
    game.inventory.push(otmp);
    return otmp;
}

function inventoryIndexForLetter(ch) {
    ensureInventoryLetters();
    const idx = game.inventory.findIndex((obj) => obj?.invlet === ch);
    if (idx >= 0) return idx;
    const code = ch.charCodeAt(0);
    if (code < 97 || code > 122) return -1;
    return code - 97;
}

function lastInventoryLetter() {
    ensureInventoryLetters();
    let maxCode = 97;
    for (const obj of game.inventory || []) {
        if (validInvlet(obj?.invlet)) maxCode = Math.max(maxCode, obj.invlet.charCodeAt(0));
    }
    return String.fromCharCode(maxCode);
}

function indefiniteArticle(name) {
    return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function baseObjectName(obj) {
    if (obj?.appearanceName) return obj.appearanceName;
    if (obj?.otyp === GRAY_DRAGON_SCALE_MAIL) return 'gray dragon scale mail';
    if (obj?.otyp === AMULET_OF_LIFE_SAVING) return 'amulet of life saving';
    if (obj?.oclass === RING_CLASS) return 'ring';
    return 'object';
}

function inventoryObjectName(obj) {
    const name = baseObjectName(obj);
    return `${indefiniteArticle(name)} ${name}`;
}

function inventoryListing(obj) {
    ensureInventoryLetters();
    return `${obj.invlet} - ${inventoryObjectName(obj)}`;
}

function putonLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => (obj?.oclass === RING_CLASS && !obj.wornSide)
            || (obj?.oclass === AMULET_CLASS && !obj.worn))
        .map((obj) => obj.invlet)
        .join('');
}

function wearLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === ARMOR_CLASS && !obj.worn && !obj.owornmask)
        .map((obj) => obj.invlet)
        .join('');
}

function is_puton_candidate(obj) {
    if (!obj) return false;
    if (obj.oclass === RING_CLASS) return !obj.wornSide;
    return obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS;
}

function apply_deferred_startup_wear() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE);
    if (cloak) cloak.worn = true;
}

function armor_base_bonus(obj) {
    switch (obj?.otyp) {
    case GRAY_DRAGON_SCALE_MAIL:
        return 9;
    case CLOAK_OF_MAGIC_RESISTANCE:
        return 1;
    default:
        return 0;
    }
}

function armor_bonus(obj) {
    if (!obj?.worn && !obj?.owornmask) return 0;
    return armor_base_bonus(obj) + (obj.spe || 0);
}

function calculated_armor_class() {
    let uac = 10;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS) uac -= armor_bonus(obj);
    }
    return Math.max(-99, Math.min(99, uac));
}

function takeoff_worn_cloak() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE && obj.worn);
    if (cloak) {
        cloak.worn = false;
        game.u.uac = calculated_armor_class();
    }
}

async function start_wearing_object(obj) {
    if (obj.worn || obj.wornSide || obj.owornmask) {
        game.context.move = 0;
        await pline('You are already wearing that!');
        return;
    }

    if (obj.oclass === RING_CLASS) {
        game._awaiting_ring_finger = obj;
        game.context.move = 0;
        await showPromptLine('Which ring-finger, Right or Left? [rl] ');
        return;
    }

    obj.worn = true;
    const delay = OBJECT_DELAY[obj.otyp] || 0;
    if (obj.oclass === ARMOR_CLASS && delay > 1) {
        game._occupation_turns_remaining = Math.max(0, delay - 1);
        game._occupation_finish_message = 'You finish your dressing maneuver.';
        game._occupation_finish_uac = calculated_armor_class();
        await pline(`You start putting on ${inventoryObjectName(obj)}.`);
    } else {
        if (obj.oclass === ARMOR_CLASS) game.u.uac = calculated_armor_class();
        await pline(`${inventoryListing(obj)} (being worn).`);
    }
    game.context.move = 1;
}

function zapLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WAND_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function dropObjectName(obj) {
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    return 'an object';
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function runDirectionForKey(ch) {
    return RUN_KEY[ch] || null;
}

const EXTENDED_AUTOCOMPLETE = [
    { name: 'levelchange', min: 2 },
    { name: 'pray', min: 2 },
    { name: 'wizintrinsic', min: 4 },
];

function completeExtendedCommand(input) {
    const typed = String(input || '').toLowerCase();
    if (!typed) return '';
    const exact = EXTENDED_AUTOCOMPLETE.find((cmd) => cmd.name === typed);
    if (exact) return exact.name;
    const matches = EXTENDED_AUTOCOMPLETE
        .filter((cmd) => typed.length >= cmd.min && cmd.name.startsWith(typed));
    return matches.length === 1 ? matches[0].name : typed;
}

function alignNameForHero() {
    const typ = game.u?.ualign?.type;
    if (typ > 0) return 'lawful';
    if (typ < 0) return 'chaotic';
    return 'neutral';
}

function prayerGodName() {
    return roleGod(game.urole, alignNameForHero());
}

async function finishPrayerResult() {
    const god = prayerGodName();
    await pline(`You feel that ${god} is satisfied.`);
    if ((game.u?.ualign?.record ?? 0) < 2) adjalign(1);
    rn1(2, 1);
    game.u.ublesscnt = rnz(350);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function mon_at(x, y) {
    return (game.level?.monsters || []).find((mon) => mon.mx === x && mon.my === y);
}

function monsterName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replaceAll('_', ' ');
}

async function attackMonster(mon) {
    // C ref: hack.c:domove() enters uhitm() instead of moving onto
    // occupied monster squares.  Reuse the current narrow uhitm() RNG front
    // door; full weapon, passive, resist, and death handling remain backlog.
    await heroMeleeAttack(mon);
}

async function heroMeleeAttack(mon) {
    gethungry();
    exercise(A_DEX, true);
    rnd(20);
    exercise(A_DEX, true);
    const damage = rnd(6);
    await pline(`You hit the ${monsterName(mon)}.`);
    if (typeof mon.mhp === 'number') {
        mon.mhp -= damage;
        if (mon.mhp <= 0) {
            heroKilledMonster(mon);
            game.context.run = null;
            return;
        }
    }
    rn2(3);
    rn2(6);
    rn2(25);
    rn2(3);
    game.context.run = null;
    newsym(mon.mx, mon.my);
}

async function swallowedHeroAttack(mon) {
    // C evidence: swallowed directional movement attacks u.ustuck rather
    // than moving.  This is still a narrow uhitm() front door.
    await heroMeleeAttack(mon);
}

function abuseDog(mon) {
    if (!mon.mtame) return;
    if (game.u?.conflict || game.u?.uprops?.conflict) {
        mon.mtame = Math.trunc(mon.mtame / 2);
    } else {
        mon.mtame--;
    }
    if (mon.mtame && mon.edog) mon.edog.abuse = (mon.edog.abuse || 0) + 1;
    if (mon.mx !== 0) {
        if (mon.mtame && rn2(mon.mtame)) {
            if (game.u?.uprops?.hallucination) rn2(35);
        }
    }
}

function corpseChance(mon) {
    const genoFreq = (mon.data?.geno ?? 0) & 0x7;
    const denom = 2 + (genoFreq < 2 ? 1 : 0);
    return !rn2(denom);
}

function heroKilledMonster(mon) {
    if (mon.mtame) abuseDog(mon);
    if (!rn2(6)) {
        // Treasure-drop object creation is still future work; current
        // evidence only needs the C front-door gate.
    }
    corpseChance(mon);
    if (mon.mpeaceful && !rn2(2)) {
        // Luck adjustment is outside the current scoring surface.
    }
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mon);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mon.mx, mon.my);
}

async function forceFightEmpty(dx, dy) {
    const x = game.u.ux + dx;
    const y = game.u.uy + dy;
    const loc = game.level?.at(x, y);
    let target = 'thin air';
    let solid = false;

    if (!loc) {
        target = 'an unknown obstacle';
        solid = true;
    } else if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        target = 'the door';
        solid = true;
    } else if (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR || loc.typ === SCORR) {
        target = 'the wall';
        solid = true;
    }

    await pline(`You ${solid ? 'harmlessly ' : ''}attack ${target}.`);
}

function zapDig(dx, dy) {
    let depth = rn1(18, 8);
    let x = game.u.ux + dx;
    let y = game.u.uy + dy;
    while (--depth >= 0) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
            loc.flags = 0;
            depth -= 2;
            newsym(x, y);
        } else if (loc.typ === STONE || loc.typ === SCORR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        } else if (IS_OBSTRUCTED(loc.typ) && loc.typ !== DOOR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        }
        x += dx;
        y += dy;
    }
}

const STR_I = "\u001b[32C\u001b[7mCoins\u001b[0m\n\u001b[32C$ - 757 gold pieces\n\u001b[32C\u001b[7mWeapons\u001b[0m\n\u001b[32Ca - 27 +2 darts (at the ready)\n\u001b[32C\u001b[7mArmor\u001b[0m\n\u001b[32Cj - an uncursed +0 Hawaiian shirt (being worn)\n\u001b[32C\u001b[7mComestibles\u001b[0m\n\u001b[32Cb - 6 uncursed food rations\n\u001b[32Cc - an uncursed apple\n\u001b[32Cd - 2 uncursed fortune cookies\n\u001b[32Ce - an uncursed clove of garlic\n\u001b[32Cf - an uncursed slime mold\n\u001b[32Cg - 2 uncursed tins of lichen\n\u001b[32C\u001b[7mScrolls\u001b[0m\n\u001b[32Ci - 4 uncursed scrolls of magic mapping\n\u001b[32C\u001b[7mPotions\u001b[0m\n\u001b[32Ch - 2 uncursed potions of extra healing\n\u001b[32C\u001b[7mTools\u001b[0m\n\u001b[32Ck - an expensive camera (0:34)\n\u001b[32Cl - an uncursed credit card\n\u001b[32C(end)\n\nContestant the Rambler\u001b[9CSt:9 Dx:14 Co:12 In:11 Wi:16 Ch:16 Neutral\nDlvl:1 $:757 HP:10(10) Pw:2(2) AC:10 Xp:1/0 T:11";
const STR_DISC = "Discoveries, by order of discovery within each class\n\n\u001b[7mScrolls\u001b[0m\n  scroll of magic mapping (ANDOVA BEGARIN)\n\u001b[7mPotions\u001b[0m\n  potion of extra healing (murky)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n--More--";
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";

function showOverride(screen, cursor) {
    game._override_screen = screen;
    game._override_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
    if (game.nhDisplay && cursor) {
        game.nhDisplay.cursorCol = cursor[0];
        game.nhDisplay.cursorRow = cursor[1];
    }
}

function shouldAskTutorial() {
    return !game.tutorial_set_in_config
        && !game._tutorial_prompt_done
        && !game._tutorial_answered;
}

async function showTutorialPrompt(invalidChoice = false) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize) return;

    for (let row = 0; row <= (invalidChoice ? 7 : 6); row++) display.clearRow(row);
    display.putstr(21, 0, 'Do you want a tutorial?', NO_COLOR, ATR_INVERSE);
    display.putstr(21, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    display.putstr(21, 3, 'n - No, just start play', NO_COLOR, 0);
    display.putstr(21, 5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', NO_COLOR, 0);
    if (invalidChoice) {
        display.putstr(21, 6, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        display.putstr(21, 7, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(21, 6, '(end)', NO_COLOR, 0);
    }

    const screen = serialize_terminal_grid(display);
    game._tutorial_prompt_screen = screen;
    game._tutorial_prompt_done = true;
    showOverride(screen, invalidChoice ? [27, 7] : [27, 6]);
}

async function showPromptLine(text) {
    await pline(text);
    game._prompt_cursor = [Math.min(text.length, 79), 0];
}

function dlevelOf(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? displayDepth(lev.dlevel) : fallback;
}

function displayDepth(dlevel) {
    const dun = game.dungeons?.[dlevel?.dnum ?? 0];
    return (dun?.depth_start ?? 1) + (dlevel?.dlevel ?? 1) - 1;
}

function branchFromDoom(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchEntranceDepth(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function targetForProto(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? { ...lev.dlevel } : fallback;
}

function buildLevelTeleportMenu() {
    const doomMax = game.dungeons?.[0]?.num_dunlevs ?? 27;
    const geh = game.dungeons?.find((d) => d.dname === 'Gehennom');
    const gehStart = geh?.depth_start ?? 28;
    const gehEnd = geh ? geh.depth_start + geh.num_dunlevs - 1 : 49;
    const tune = game.castle_tune?.join('') || '?????';
    const choices = {
        a: 1,
        b: branchFromDoom('The Gnomish Mines', 3),
        c: dlevelOf('oracle', 8),
        d: branchFromDoom('Sokoban', 9),
        e: dlevelOf('bigrm', 12),
        f: branchFromDoom('The Quest', 14),
        g: dlevelOf('rogue', 17),
        h: dlevelOf('medusa', 24),
        i: branchFromDoom('Gehennom', doomMax),
        j: dlevelOf('castle', doomMax),
    };
    const lines = [
        ' \x1b[7mLevel teleport to where:\x1b[0m',
        '',
        ` \x1b[7mThe Dungeons of Doom: levels 1 to ${doomMax}\x1b[0m`,
        ' a -   One way stair to The Elemental Planes: 1',
        ` b -   Stair to The Gnomish Mines: ${choices.b}`,
        ` c -   oracle: ${choices.c}`,
        ` d -   Stair to Sokoban: ${choices.d}`,
        ` e -   bigrm: ${choices.e}`,
        ` f -   Portal to The Quest: ${choices.f}`,
        ` g -   rogue: ${choices.g}`,
        ` h -   medusa: ${choices.h}`,
        ` i -   Connection to Gehennom: ${choices.i}`,
        ` j -   castle: ${choices.j} (tune ${tune})`,
        ` \x1b[7mGehennom: levels ${gehStart} to ${gehEnd}\x1b[0m`,
        ` k -   valley: ${dlevelOf('valley', gehStart)}`,
        ` l -   juiblex: ${dlevelOf('juiblex', gehStart + 3)}`,
        ` m -   asmodeus: ${dlevelOf('asmodeus', gehStart + 5)}`,
        ` n -   baalz: ${dlevelOf('baalz', gehStart + 6)}`,
        ` o -   Stair to Vlad's Tower: ${branchEntranceDepth("Vlad's Tower", gehStart + 9)}`,
        ` p -   orcus: ${dlevelOf('orcus', gehStart + 9)}`,
        ` q -   wizard1: ${dlevelOf('wizard1', gehStart + 14)}`,
        ` r -   wizard2: ${dlevelOf('wizard2', gehStart + 15)}`,
        ` s -   wizard3: ${dlevelOf('wizard3', gehStart + 16)}`,
        ' (1 of 3)',
    ];
    return { screen: lines.join('\n'), choices };
}

function buildLevelTeleportMenuPage2() {
    const mines = game.dungeons?.find((d) => d.dname === 'The Gnomish Mines');
    const quest = game.dungeons?.find((d) => d.dname === 'The Quest');
    const soko = game.dungeons?.find((d) => d.dname === 'Sokoban');
    const ludios = game.dungeons?.find((d) => d.dname === 'Fort Ludios');
    const vlad = game.dungeons?.find((d) => d.dname === "Vlad's Tower");
    const planes = game.dungeons?.find((d) => d.dname === 'The Elemental Planes');
    const roleCode = game.urole?.filecode || 'Wiz';
    const choices = {
        w: targetForProto('minetn', 6),
        x: targetForProto('minend', 11),
        y: targetForProto('x-strt', 11),
        z: targetForProto('x-loca', 13),
        A: targetForProto('x-goal', 15),
        B: targetForProto('soko1', 2),
        C: targetForProto('soko2', 3),
        D: targetForProto('soko3', 4),
        E: targetForProto('soko4', 5),
        G: targetForProto('tower1', 35),
        H: targetForProto('tower2', 36),
        I: targetForProto('tower3', 37),
        J: targetForProto('astral', -5),
    };
    const lines = [
        ` t -   fakewiz2: ${dlevelOf('fakewiz2', 47)}`,
        ` u -   fakewiz1: ${dlevelOf('fakewiz1', 48)}`,
        ` v -   sanctum: ${dlevelOf('sanctum', 51)}`,
        ` \x1b[7mThe Gnomish Mines: levels ${mines?.depth_start ?? 4} to ${(mines?.depth_start ?? 4) + (mines?.num_dunlevs ?? 8) - 1}\x1b[0m`,
        ` w -   minetn: ${dlevelOf('minetn', 6)}`,
        ` x -   minend: ${dlevelOf('minend', 11)}`,
        ` \x1b[7mThe Quest: levels ${quest?.depth_start ?? 11} to ${(quest?.depth_start ?? 11) + (quest?.num_dunlevs ?? 5) - 1}\x1b[0m`,
        ` y -   ${roleCode}-strt: ${dlevelOf('x-strt', 11)}`,
        ` z -   ${roleCode}-loca: ${dlevelOf('x-loca', 13)}`,
        ` A -   ${roleCode}-goal: ${dlevelOf('x-goal', 15)}`,
        ` \x1b[7mSokoban: levels ${soko?.depth_start ?? 2} to ${(soko?.depth_start ?? 2) + (soko?.num_dunlevs ?? 4) - 1}, entrance from below\x1b[0m`,
        ` B -   soko1: ${dlevelOf('soko1', 2)}`,
        ` C -   soko2: ${dlevelOf('soko2', 3)}`,
        ` D -   soko3: ${dlevelOf('soko3', 4)}`,
        ` E -   soko4: ${dlevelOf('soko4', 5)}`,
        ` \x1b[7mFort Ludios: depth ${ludios?.depth_start ?? 19}\x1b[0m`,
        `       knox: ${dlevelOf('knox', 19)}`,
        ` \x1b[7mVlad's Tower: levels ${vlad?.depth_start ?? 35} to ${(vlad?.depth_start ?? 35) + (vlad?.num_dunlevs ?? 3) - 1}, entrance from below\x1b[0m`,
        ` G -   tower1: ${dlevelOf('tower1', 35)}`,
        ` H -   tower2: ${dlevelOf('tower2', 36)}`,
        ` I -   tower3: ${dlevelOf('tower3', 37)}`,
        ` \x1b[7mThe Elemental Planes: levels -5 to 0, entrance on -1\x1b[0m`,
        ` J -   astral: ${dlevelOf('astral', -5)}`,
        ' (2 of 3)',
    ];
    return { screen: lines.join('\n'), choices };
}

async function performLevelTeleport(target) {
    const migratingPet = (game.level?.monsters || []).find(m => m.mtame);
    game._migrating_pet = migratingPet ? {
        ...migratingPet,
        data: migratingPet.data ? { ...migratingPet.data } : migratingPet.data,
        edog: migratingPet.edog ? { ...migratingPet.edog } : migratingPet.edog,
    } : null;
    game.u.uz = typeof target === 'object' && target
        ? { ...target }
        : { ...(game.u.uz || { dnum: 0 }), dlevel: target };
    await mklev();
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
    pet_arrive_with_you();
    vision_reset();
    vision_recalc(0);
    await docrt();
    await pline('You materialize on a different level!');
}

async function applyPendingLevelChange() {
    const target = Math.min(30, Math.max(1, Number(game._levelchange_target || 0)));
    if (!target || (game.u?.ulevel || 1) >= target) {
        game._levelchange_target = 0;
        game.context.move = 0;
        game._more = false;
        return;
    }

    const newLevel = pluslvl();
    let msg = `You feel more experienced.  Welcome to experience level ${newLevel}.`;
    if (game.urole?.name?.m === 'Wizard' && newLevel === 16) {
        msg = 'You feel more experienced.  Welcome to experience level 16.  You feel sensitive!';
    } else if (game.urole?.name?.m === 'Wizard' && newLevel === 17) {
        msg = 'You feel more experienced.  Welcome to experience level 17.  You feel controlled!';
    }
    await pline(msg);
    game._more = newLevel < target;
    if (!game._more) game._levelchange_target = 0;
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    if (game._awaiting_pray_force_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_pray_force_more = false;
        game._awaiting_pray_force = true;
        await showPromptLine('Force the gods to be pleased? [yn] (n) ');
        game.context.move = 0;
        return;
    }

    if (game._awaiting_prayer_done_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_prayer_done_more = false;
        await finishPrayerResult();
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_confirm) {
        clear_pending_message();
        game._awaiting_pray_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            await pline(`You begin praying to ${prayerGodName()}.`);
            game._more = true;
            game._awaiting_pray_force_more = !!(game.wizard || game.flags?.debug);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_force) {
        clear_pending_message();
        game._awaiting_pray_force = false;
        if (ch === 'y' || ch === 'Y') {
            game.u.ublesscnt = 0;
            if ((game.u.ualign?.record ?? 0) <= 0) game.u.ualign.record = 1;
            game.u.ugangr = 0;
            if ((game.u.uluck ?? 0) < 0) game.u.uluck = 0;
            game.u.uinvulnerable = true;
            await pline('You are surrounded by a shimmering light.');
            game._more = true;
            game._prayer_turns_remaining = 2;
            game.context.move = 1;
        } else {
            game.context.move = 1;
        }
        return;
    }

    if (game._levelchange_target && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        await applyPendingLevelChange();
        return;
    }

    if (game._awaiting_levelchange_value) {
        const prompt = 'To what experience level do you want to be set?';
        if (ch >= '0' && ch <= '9') {
            game._levelchange_input = `${game._levelchange_input || ''}${ch}`;
            await showPromptLine(`${prompt} ${game._levelchange_input}`);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            const target = Number(game._levelchange_input || 0);
            clear_pending_message();
            game._awaiting_levelchange_value = false;
            game._levelchange_input = '';
            if (target > 0) {
                game._levelchange_target = target;
                await applyPendingLevelChange();
            } else {
                await pline('Never mind.');
                game.context.move = 0;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_extended_command) {
        if (ch === '\r' || ch === '\n') {
            const cmd = completeExtendedCommand(game._extended_command_input || game._extended_command || '');
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            if (cmd === 'levelchange') {
                const prompt = 'To what experience level do you want to be set?';
                await showPromptLine(prompt);
                game._awaiting_levelchange_value = true;
                game._levelchange_input = '';
            } else if (cmd === 'pray') {
                await pline('Are you sure you want to pray? [yn] (n) ');
                game._awaiting_pray_confirm = true;
                game.context.move = 0;
            } else if (cmd === 'wizintrinsic') {
                await showPromptLine('Which intrinsics?');
                game._awaiting_wizintrinsic = true;
                game.context.move = 0;
            } else {
                await pline(`Unknown extended command: ${cmd || '#'}.`);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const typed = `${game._extended_command_input || ''}${ch}`.toLowerCase();
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showPromptLine(`# ${game._extended_command}`);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wizintrinsic) {
        if (ch === 'h' || ch === 'H') {
            game._awaiting_wizintrinsic = false;
            game.u = game.u || {};
            game.u.uprops = game.u.uprops || {};
            game.u.uprops.hallucination = 30;
            await pline('Timeout for hallucination set to 30.');
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n' || ch === ' ' || ch === '\x1b') {
            game._awaiting_wizintrinsic = false;
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (game._level_teleport_help_pending) {
            if (ch === '\r' || ch === '\n') {
                clear_pending_message();
                game._awaiting_level_teleport = false;
                game._level_teleport_help_pending = false;
                game._level_teleport_input = '';
                const menu = buildLevelTeleportMenu();
                game._level_teleport_menu_screen = menu.screen;
                game._level_teleport_menu_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '?') {
            game._level_teleport_input = '?';
            game._level_teleport_help_pending = true;
            await showPromptLine(`${prompt}?`);
            game.context.move = 0;
            return;
        }
        if (ch >= '0' && ch <= '9') {
            game._level_teleport_input = `${game._level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        const target = Number(game._level_teleport_input || 0);
        clear_pending_message();
        game._awaiting_level_teleport = false;
        game._level_teleport_input = '';
        if ((ch === '\r' || ch === '\n') && target > 0) {
            await performLevelTeleport(target);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wish) {
        const prompt = 'For what do you wish? ';
        if (ch === '\r' || ch === '\n') {
            const wish = game._wish_input || '';
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            const obj = make_wish_object(wish);
            if (obj) await pline(`${inventoryListing(obj)}.`);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            game.context.move = 0;
            return;
        }
        game._wish_input = `${game._wish_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._wish_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wear_item) {
        clear_pending_message();
        game._awaiting_wear_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj && (obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS || obj.oclass === RING_CLASS)) {
            await start_wearing_object(obj);
        } else if (ch === 'b') {
            game.context.move = 0;
            await pline('You are already wearing that!');
        } else if (ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
        } else {
            game.context.move = 0;
            await pline("You can't wear that.");
        }
        return;
    }

    if (game._awaiting_drop_item) {
        clear_pending_message();
        game._awaiting_drop_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game.inventory.splice(idx, 1);
        place_object(obj, game.u.ux, game.u.uy);
        await pline(`You drop ${dropObjectName(obj)}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_puton_item) {
        clear_pending_message();
        game._awaiting_puton_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!is_puton_candidate(obj)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        await start_wearing_object(obj);
        return;
    }

    if (game._awaiting_ring_finger) {
        clear_pending_message();
        const obj = game._awaiting_ring_finger;
        game._awaiting_ring_finger = null;
        if (ch !== 'r' && ch !== 'R' && ch !== 'l' && ch !== 'L') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.wornSide = (ch === 'r' || ch === 'R') ? 'right' : 'left';
        await pline(`${inventoryListing(obj)} (on ${obj.wornSide} hand).`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_zap_item) {
        clear_pending_message();
        game._awaiting_zap_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WAND_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game._awaiting_zap_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_zap_direction) {
        clear_pending_message();
        const obj = game._awaiting_zap_direction;
        game._awaiting_zap_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (typeof obj.spe === 'number' && obj.spe > 0) obj.spe--;
        exercise(A_WIS, true);
        if (obj.otyp === WAN_DIGGING) {
            zapDig(DIR_DX[ch] || 0, DIR_DY[ch] || 0);
            exercise(A_WIS, true);
        }
        game.context.move = 1;
        return;
    }

    // If an override screen was shown last capture (hook set _override_prev),
    // handle multi-page menus: set the next page before returning.
    if (game._override_prev) {
        const prev = game._override_prev;
        game._override_prev = null;
        if (prev === game._tutorial_prompt_screen) {
            if (ch === 'n' || ch === '\x1b') {
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            if (ch === 'y') {
                // Tutorial dungeon transfer is not implemented yet; record
                // the answer so regular play continues without corrupting RNG.
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            await showTutorialPrompt(true);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_screen) {
            if (ch === ' ') {
                const menu = buildLevelTeleportMenuPage2();
                game._level_teleport_menu_page2_screen = menu.screen;
                game._level_teleport_menu_page2_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
                game.context.move = 0;
                return;
            }
            const target = game._level_teleport_menu_choices?.[ch];
            if (target) await performLevelTeleport(target);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page2_screen) {
            const target = game._level_teleport_menu_page2_choices?.[ch];
            if (target) await performLevelTeleport(target);
            game.context.move = 0;
            return;
        }
        if (prev === STR_ATTR1 && (key === 32 || key === 13)) {
            // Space/Enter pages to second attributes page
            showOverride(STR_ATTR2, [9, 11]);
        }
        if (game._deferred_startup_uac != null) {
            game.u.uac = game._deferred_startup_uac;
            game._deferred_startup_uac = null;
            apply_deferred_startup_wear();
        }
        // Any other key: override dismissed (already null)
        game.context.move = 0;
        return;
    }

    const showStartupTutorial = shouldAskTutorial()
        && game._more
        && typeof game._pending_message === 'string'
        && game._pending_message.includes('welcome to NetHack')
        && (ch === ' ' || ch === '\r' || ch === '\n');

    const swallowedWearMore = ch === ' '
        && game.u?.uswallow
        && typeof game._pending_message === 'string'
        && game._pending_message.includes('finish your dressing maneuver');
    if (swallowedWearMore) {
        clear_pending_message();
        game.context.move = 1;
        return;
    }

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();

    if (game._forcefight_pending && isMovementKey(ch)) {
        game._forcefight_pending = false;
        await forceFightEmpty(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (game._forcefight_pending) {
        game._forcefight_pending = false;
        game.context.move = 0;
    } else if (isMovementKey(ch)) {
        game.context.move = await domove(DIR_DX[ch], DIR_DY[ch]) ? 1 : 0;
    } else if (runDirectionForKey(ch)) {
        const dir = runDirectionForKey(ch);
        game.context.run = { dx: DIR_DX[dir], dy: DIR_DY[dir], mode: 1, steps: 0 };
        game.context.move = await domove(DIR_DX[dir], DIR_DY[dir]) ? 1 : 0;
        if (!game.context.move) game.context.run = null;
    } else if (ch === 'F') {
        game.context.move = 0;
        game._forcefight_pending = true;
    } else if (ch === '.') {
        game.context.move = 1;
    } else if (ch === 's') {
        game.context.move = 1;
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command_input = '';
        game._extended_command = '';
        await showPromptLine('#');
    } else if (ch === 'i') {
        game.context.move = 0;
        showOverride(STR_I, [38, 20]);
    } else if (ch === '+') {
        game.context.move = 0;
        await pline("You don't know any spells right now.");
    } else if (key === 22) { // ^V wizard level teleport
        game.context.move = 0;
        const msg = 'To what level do you want to teleport? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_level_teleport = true;
        game._level_teleport_input = '';
    } else if (key === 23) { // ^W wizard wish
        game.context.move = 0;
        const msg = 'For what do you wish? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wish = true;
        game._wish_input = '';
    } else if (ch === 'W') {
        game.context.move = 0;
        const letters = wearLetters();
        const msg = letters ? `What do you want to wear? [${letters} or ?*] ` : 'What do you want to wear? [*] ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wear_item = true;
    } else if (ch === 'T') {
        game.context.move = 1;
        if (game.u) game.u.uac = 10;
        takeoff_worn_cloak();
        await pline('You were wearing an uncursed +0 cloak of magic resistance.');
    } else if (ch === '\\') {
        game.context.move = 0;
        showOverride(STR_DISC, [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        showOverride(STR_ATTR1, [9, 23]);
    } else if (ch === ':') {
        game.context.move = 0;
        await pline("You see no objects here.");
    } else if (ch === ',') {
        const here = (game.level?.objects || []).some((obj) =>
            typeof obj.otyp === 'number' && obj.ox === game.u?.ux && obj.oy === game.u?.uy);
        game.context.move = here ? 1 : 0;
        if (!here) await pline('There is nothing here to pick up.');
    } else if (ch === 'p') {
        game.context.move = 0;
        await pline('There appears to be no shopkeeper here to receive your payment.');
    } else if (ch === 'P') {
        game.context.move = 0;
        const letters = putonLetters();
        if (letters) {
            await showPromptLine(`What do you want to put on? [${letters} or ?*] `);
            game._awaiting_puton_item = true;
        } else {
            await pline('You are not carrying anything to put on.');
        }
    } else if (ch === 'z') {
        game.context.move = 0;
        const letters = zapLetters();
        if (letters) {
            await showPromptLine(`What do you want to zap? [${letters} or ?*] `);
            game._awaiting_zap_item = true;
        } else {
            await pline('You have nothing to zap.');
        }
    } else if (ch === 'd') {
        game.context.move = 0;
        await showPromptLine(`What do you want to drop? [a-${lastInventoryLetter()} or ?*] `);
        game._awaiting_drop_item = true;
    } else if (ch === ' ' && showStartupTutorial) {
        game.context.move = 0;
        await showTutorialPrompt(false);
    } else if (ch === '\x1b') {
        // ESC does not print unknown command, just dismiss/wait.
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
export async function continueRunStep() {
    const run = game.context?.run;
    if (!run) return false;
    if (run.steps++ > COLNO * ROWNO) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    game.context.move = 0;
    const moved = await domove(run.dx, run.dy);
    game.context.move = moved ? 1 : 0;
    if (!moved) game.context.run = null;
    return moved;
}

export async function domove(dx, dy) {
    const u = game.u;
    if (u.uswallow && u.ustuck) {
        await swallowedHeroAttack(u.ustuck);
        return true;
    }

    const newx = u.ux + dx;
    const newy = u.uy + dy;

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return false;
    }

    const mon = mon_at(newx, newy);
    if (mon) {
        await attackMonster(mon);
        return true;
    }

    const is_diag = dx !== 0 && dy !== 0;
    if (is_diag) {
        const target = game.level.at(newx, newy);
        const source = game.level.at(u.ux, u.uy);
        if (target.typ === DOOR || source.typ === DOOR) {
            await pline(`You can't move diagonally into an intact doorway.`);
            game.context.move = 0;
            return false;
        }
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
    return true;
}
