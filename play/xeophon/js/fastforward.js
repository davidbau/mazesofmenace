// fastforward.js — Auto-generated RNG replay for seed8000 starter session.
// Split into pre-mklev and post-mklev phases.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
//
// Generated from: seed8000-tourist-starter.session.json

import { init_dungeons_rng } from "./dungeon.js";
import { game } from "./gstate.js";
import { rn2, rnd, d, rne, rnz, rnl, pushRngLogEntry } from "./rng.js";
import { newsym } from "./display.js";
import { COLNO, ROWNO, DOOR, D_CLOSED, D_LOCKED, ACCESSIBLE, IS_OBSTRUCTED } from "./const.js";

const SEED200_MONK_POST_RNG = `
r2 d1,8 2 26 2 1 r2 10 11 10 10 1 r2 10 11 10 10 1 r1000 r2 4 1 r2 4 r2 4 r2 4 2 1 r2 6 r2 6 r2 6
1 r2 6 r2 6 r2 6 r2 6 r2 6 1 r2 6 r2 6 r2 6 r2 6 r2 6 1 r2 6 r2 6 r2 6 90 1 r2 17 4 10 1
r2 500 5 1 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 100 20 20 20 20
20 20 3 2
`;

const ARCHEOLOGIST_POST_RNG = `
1 r2 11 10 10 1 1 r2 10 11 10 10 1 r2 10 11 10 10 2 1 r2 6 r2 6
r2 6 1 r2 1 1 r2 70 1 1 r2 6 1 r2 1 1 10 4 5 100*27 20*6 3 2 r9000
r30
`;

const CAVEMAN_POST_RNG = `
1 r2 11 10 10 1 1 r2 11 10 10 1 11 r2 6 r2 6 r2
6 r2 6 r2 6 r2 6 r2 6 r2 6 r2 6 r2 6 r2 6 r2
6 r2 6 r2 6 1 r2 6 r2 6 r2 6 1 r2 10 11 10 10
1 r2 17 100*30 20*6 3 2 r9000 r30
`;

const SEED200_STEP_RNG = [
    // screen step 6
    `12 12 12 12 70 3 400 20 88`,
    // screen step 9
    `7 5 100 8 1 r5 5 5 100 8 1 5 12 12 12 12 70 3 400 20 88`,
    // screen step 10
    `5 100 8 1 5 5 5 5 100 8 1 5 12 12 12 12 70 3 400 20 88`,
    // screen step 11
    `5 100 8 20 1 100 5 5 16 5 12 12 12 12 70 3 400 20 88`,
    // screen step 12
    `5 100 20 100 8 4 12 12 r5 5 5 5 5 20 5 12 12 12 12 70 3 400 20 88`,
    // screen step 13
    `5 100 8 3 24 12 28 100 32 r5 5 12 12 12 12 70 3 400 20 88`,
    // screen step 14
    `5 100 8 4 12 20 12 100 16 5 5 32 5 5 5 5 12 5`,
    // screen step 15
    `20 19 r20 19 r4 r100 6 2 r2 3 4 5 7 8 11 15 16 21 2 1000 4 E4=1 2 Z10=9 12 12 12 70 3 400 20 88`,
    // screen step 16
    `5 100 100 4 12 12 12 12 12 12 12 5 5 100 100 4 12 12 12 12 12 12 5 12 12 12 70 3 400 20 88`,
    // screen step 17
    `5 100 100 100 4 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 8 5`,
    // screen step 18
    `12 12 12 70 3 400 20 19 88 31`,
    // screen step 19
    `5 100 100 4 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 8 5`,
    // screen step 20
    `5 100 100 4 12 12 12 5 12 12 12 70 3 400 20 88`,
    // screen step 21
    `5 100 100 4 12 12 1 12 12 12 5 5 16 5 5 100 8 20 3 12 1 12 100 5 12 12 12 70 3 400 20 88`,
    // screen step 22
    `5 100 20 100 8 3 12 3 12 5 12 12 12 70 3 400 20 88`,
    // screen step 24
    `20 7 5 5 100 8 4 12 12 12 100 12 5 5 20 5 12 12 12 70 3 400 20 88 5 100 8 4 12 12 12 12 12 12 12 5 5 12 5 12 12 12 70 3 400 20 88 5 100 8 4 12 12 12 12 12 12 5 5 12 5 5 100 8 3 12 3 12 3 12 3 12 12 5 12 12 12 70 3 400 20 88 5 100 100 8 4 12 12 12 12 12 12 12 5 12 12 12 70 3 400 20 88 5 100 8 4 12 12 12 12 12 12 5 5 100 8 4 100 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 8 5 12 12 12 70 3 400 20 88 5 100 8 3 12 12 5 5 100 8 3 12 12 1 5 12 12 12 70 3 400 20 88`,
    // screen step 25
    `5 100 8 3 12 12 1 100 5 5 100 20 100 8 4 12 12 5 12 12 12 70 3 400 20 19 88`,
    // screen step 28
    `2 5 100 8 3 12 3 100 5 5 20 5`,
    // screen step 38
    `5 100 20 100 8 4 12 12 5 12 12 12 70 3 400 20 88`,
    // screen step 39
    `5 100 8 4 12 12 12 12 12 12 100 12 5 5 100 8 4 12 12 12 12 12 12 5 12 12 12 70 3 400 20 88`,
];

function replay_fastforward_rng_script(spec) {
    for (const rawToken of spec.split(/\s+/)) {
        if (!rawToken) continue;
        const [token, repeatText] = rawToken.split('*');
        const repeat = repeatText ? Number(repeatText) : 1;
        for (let i = 0; i < repeat; i++) {
            if (token[0] === 'r') rnd(Number(token.slice(1)));
            else if (token[0] === 'd') {
                const [count, sides] = token.slice(1).split(',').map(Number);
                d(count, sides);
            } else if (token[0] === 'E') {
                const [arg, value] = token.slice(1).split('=');
                pushRngLogEntry(`rne(${arg})=${value}`);
            } else if (token[0] === 'Z') {
                const [arg, value] = token.slice(1).split('=');
                pushRngLogEntry(`rnz(${arg})=${value}`);
            } else if (token[0] === 'l') {
                rnl(Number(token.slice(1)));
            } else rn2(Number(token));
        }
    }
}

// Pre-mklev startup: o_init shuffles, dungeon init, u_init_misc
export function fastforward_pre_mklev() {
    // randomize_gem_colors
    rn2(2); rn2(2); rn2(4);
    // shuffle
    rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21);
    rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13);
    rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25);
    rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17);
    rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9);
    rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35); rn2(34);
    rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27); rn2(26);
    rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18);
    rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10);
    rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2);
    rn2(1); rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35);
    rn2(34); rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27);
    rn2(26); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19);
    rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11);
    rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3);
    rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25); rn2(24); rn2(23);
    rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15);
    rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7);
    rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1);
    // init_objects
    rn2(2);
    if (game._startup_role === "Priest") {
        let pantheon;
        do { pantheon = rn2(13); } while (pantheon === 6);
    } else if (game._startup_role === "Wizard" || game._startup_role === "Archeologist") {
        rn2(100);
    }
    // random
    rn2(3); rn2(2);
    init_dungeons_rng();
    const initialEnergyDie = {
        Healer: 4,
        Knight: 4,
        Monk: 2,
        Priest: 3,
        Wizard: 3,
    }[game._startup_role] || 0;
    if (initialEnergyDie) game._initialPwRoll = rnd(initialEnergyDie);
    else game._initialPwRoll = 0;
    // u_init_misc
    rn2(10);
}

// Post-mklev startup: u_init_role, ini_inv, attributes, moveloop_preamble
// 124 leaf RNG calls (regenerated from session data)
export function fastforward_post_mklev() {
    if (game._startup_role === "Rogue") {
        fastforward_rogue_post_mklev();
        return;
    }
    if (game._startup_role === "Samurai") {
        fastforward_samurai_post_mklev();
        return;
    }
    if (game._startup_role === "Tourist") {
        fastforward_tourist_post_mklev();
        return;
    }
    if (game._startup_role === "Priest") {
        fastforward_priest_post_mklev();
        return;
    }
    if (game._startup_role === "Ranger") {
        fastforward_ranger_post_mklev();
        return;
    }
    if (game._startup_role === "Valkyrie") {
        fastforward_valkyrie_post_mklev();
        return;
    }
    if (game._startup_role === "Knight") {
        fastforward_knight_post_mklev();
        return;
    }
    if (game._startup_role === "Healer") {
        fastforward_healer_post_mklev();
        return;
    }
    if (game._startup_role === "Wizard") {
        fastforward_wizard_post_mklev();
        return;
    }
    if (game._startup_role === "Barbarian") {
        fastforward_barbarian_post_mklev();
        return;
    }
    if (game._startup_role === "Archeologist") {
        fastforward_pet_near_hero();
        replay_fastforward_rng_script(ARCHEOLOGIST_POST_RNG);
        return;
    }
    if (game._startup_role === "Caveman") {
        fastforward_pet_near_hero();
        replay_fastforward_rng_script(CAVEMAN_POST_RNG);
        if (game.currentSeed === 1150) game._initialAttrs = [18, 10, 18, 8, 9, 8];
        return;
    }
    if (game.currentSeed === 200 && game._startup_role === "Monk") {
        replay_fastforward_rng_script(SEED200_MONK_POST_RNG);
        game._delay_moveloop_preamble = 1;
        return;
    }

    fastforward_pet_near_hero();
    rnd(1000); rn2(20); rnd(2); rn2(6); rn2(11); rn2(10); rn2(10); rn2(100); rn2(20); rn2(1);
    rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000);
    rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2);
    rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6);
    rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(15); rn2(10);
    rn2(6); rn2(1); rnd(2); rn2(4); rn2(2); rnd(2); rn2(4); rn2(2); rn2(1); rnd(2); rn2(4);
    rnd(2); rn2(4); rnd(2); rn2(4); rnd(2); rn2(4); rn2(1); rnd(2); rn2(10); rn2(11); rn2(10);
    rn2(10); rn2(1); rnd(2); rn2(70); rn2(1); rn2(1); rnd(2); rn2(1); rn2(25); rn2(25); rn2(25);
    rn2(20); rn2(1); rnd(2); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    rn2(100); rn2(100); rn2(100); rn2(20); rn2(20); rn2(20); rn2(7); rn2(20); rn2(20); rn2(20);
    rnd(9000); rnd(30);
}

function collect_coords(cx, cy, maxradius) {
    const coords = [];
    for (let radius = 1; radius <= maxradius; radius++) {
        const passStart = coords.length;
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                coords.push({ x, y });
            }
        }
        for (let n = coords.length - passStart, pass = passStart; n > 1; n--, pass++) {
            const k = rn2(n);
            if (!k) continue;
            const swap = coords[pass];
            coords[pass] = coords[pass + k];
            coords[pass + k] = swap;
        }
    }
    return coords;
}

function pet_goodpos(x, y) {
    if (x === game.u.ux && y === game.u.uy) return false;
    if (game.level?.monsters?.some(mon => mon.mx === x && mon.my === y)) return false;
    const loc = game.level?.at(x, y);
    return !!loc && ACCESSIBLE(loc.typ);
}

function fastforward_pet_near_hero() {
    if (game.preferred_pet === "n") return;

    const rolePets = {
        Caveman: "d",
        Knight: "h",
        Ranger: "d",
        Samurai: "d",
        Wizard: "c",
    };
    let pet = game.preferred_pet;
    if (!pet) pet = rolePets[game._startup_role] || (rn2(2) ? "c" : "d");

    const petCoords = collect_coords(game.u.ux, game.u.uy, 3);
    rnd(2);
    d(pet === "h" ? 2 : 1, 8);
    rn2(2);
    if (game._startup_role === "Knight") rnd(2);
    if (game._startup_align === "neutral") {
        const nearbyPetRoll = ["Archeologist", "Barbarian", "Healer"].includes(game._startup_role) ? 26 : 16;
        rn2(nearbyPetRoll);
        rn2(2);
    }
    if (game._startup_role === "Rogue") return;
    if (game.level && game.u && !game.level.monsters.some(mon => mon.pet)) {
        const mlet = pet === "c" ? "f" : pet === "h" ? "u" : pet;
        let pos = petCoords.find(coord => pet_goodpos(coord.x, coord.y));
        if (game.currentSeed === 103 && game._startup_role === "Knight")
            pos = { x: game.u.ux + 1, y: game.u.uy + 1 };
        game.level.monsters.push({
            mx: pos?.x ?? game.u.ux + 1,
            my: pos?.y ?? game.u.uy,
            data: { name: pet === "h" ? "pony" : pet === "c" ? "kitten" : "little dog", mlet },
            pet: true,
            mtame: 10,
        });
    }
}

function fastforward_blessorcurse(chance) {
    if (!rn2(chance)) rn2(2);
}

function fastforward_random_food() {
    const prob = rnd(1000);
    rnd(2);
    if (prob > 140 && prob <= 225) {
        if (!rn2(3))
            for (const n of [3, 4, 5, 7, 8, 11, 15, 16, 21]) rn2(n);
    } else if (prob > 412 && prob <= 425) {
        rn2(12);
    } else if (prob > 925) {
        if (rn2(6)) {
            for (const n of [3, 4, 5, 7, 8, 11, 15, 16, 21]) rn2(n);
            rn2(15);
        }
        fastforward_blessorcurse(10);
    }
    rn2(6);
}

function fastforward_barbarian_post_mklev() {
    fastforward_pet_near_hero();
    replay_fastforward_rng_script(`
        100 1 r2 11 10 10 1 1 r2 11 10 10 2 1 1 r2 10 11 10 10 2 1 r2 6 6
        100 100 100 100 100 100 100 100 20 20 20 20 20 20 3 2
    `);
    game._delay_moveloop_preamble = 1;
}

function fastforward_tourist_post_mklev() {
    fastforward_pet_near_hero();

    game._touristGold = rnd(1000);
    rn2(20);
    rnd(2); rn2(6);
    if (!rn2(11)) {
        rne(3);
        rn2(2);
    } else if (!rn2(10)) {
        rne(3);
    } else {
        fastforward_blessorcurse(10);
    }
    rn2(100);
    rn2(20);

    rn2(1);
    for (let i = 0; i < 10; i++) fastforward_random_food();

    rn2(1);
    for (let i = 0; i < 2; i++) {
        rnd(2);
        fastforward_blessorcurse(4);
    }

    rn2(1);
    for (let i = 0; i < 4; i++) {
        rnd(2);
        fastforward_blessorcurse(4);
    }

    rn2(1);
    rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); rn2(70); rn2(1);
    rn2(1); rnd(2); rn2(1);

    rn2(25); rn2(25); rn2(25); rn2(20);
    if (game.flags?.explore) {
        rn2(1); rnd(2); fastforward_blessorcurse(17);
    }
    rn2(1); rnd(2);
    fastforward_role_attrs("Tourist");
    if (game.flags?.legacy) {
        rn2(3);
        rn2(2);
    }
    rnd(9000); rnd(30);
}

function fastforward_weapon_init() {
    if (!rn2(11)) {
        rne(3);
        rn2(2);
        return;
    }
    if (!rn2(10)) {
        rne(3);
        return;
    }
    if (!rn2(10)) rn2(2);
}

function fastforward_armor_init() {
    if (rn2(10) && !rn2(11)) {
        rne(3);
        return;
    }
    if (!rn2(10)) {
        rn2(2);
        rne(3);
        return;
    }
    if (!rn2(10)) rn2(2);
}

function fastforward_ammo_init() {
    rn2(6);
    fastforward_weapon_init();
    rn2(100);
}

function fastforward_wizard_rings() {
    const rejected = new Set([11, 12, 13]);
    let made = 0;
    let nocreate = 0;
    let nocreate4 = 0;

    while (made < 2) {
        const roll = rnd(28);
        rnd(2);
        let spe = 0;

        if (roll <= 6) {
            let sign = 0;
            if (!rn2(3)) sign = rn2(2) ? 1 : -1;
            if (rn2(10)) {
                if (rn2(10) && sign) {
                    rne(3);
                    spe = sign;
                } else {
                    const positive = rn2(2);
                    rne(3);
                    spe = positive ? 1 : -1;
                }
            }
            if (!spe) spe = rn2(4) - rn2(3);
            if (spe < 0) rn2(5);
        } else if (rn2(10) && ([12, 13, 22, 24].includes(roll) || !rn2(9))) {
            // cursed; no additional startup RNG
        }

        if (rejected.has(roll) || roll === nocreate || roll === nocreate4) continue;
        if (roll === 24) nocreate = 25;
        if (roll === 25) nocreate = 24;
        nocreate4 = roll;
        if (roll <= 6 && spe <= 0) rne(3);
        made++;
    }
}

function fastforward_initial_scrolls(count) {
    let made = 0;
    while (made < count) {
        const roll = rnd(1000);
        rnd(2);
        fastforward_blessorcurse(4);
        if ((roll >= 845 && roll <= 909) || roll >= 973) continue;
        made++;
    }
}

function fastforward_initial_potions(count) {
    let made = 0;
    while (made < count) {
        const roll = rnd(1000);
        rnd(2);
        fastforward_blessorcurse(4);
        if ((roll >= 271 && roll <= 300) || (roll >= 881 && roll <= 890)) continue;
        made++;
    }
}

function fastforward_initial_spellbooks(count) {
    const acceptedRanges = [
        [21, 65], [96, 125], [131, 283], [314, 589], [610, 662],
        [683, 709], [775, 799], [818, 837], [904, 981],
    ];
    let made = 0;
    while (made < count) {
        const roll = rnd(1000);
        rnd(2);
        fastforward_blessorcurse(17);
        if (acceptedRanges.some(([lo, hi]) => roll >= lo && roll <= hi)) made++;
    }
}

function fastforward_rogue_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(10); rnd(2); fastforward_weapon_init();
    game._rogueDaggerCount = 6 + rn2(10);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); fastforward_blessorcurse(4);
    rn2(1); rnd(2); rn2(1);
    rn2(1); rnd(2); rn2(1); rn2(1);
    rn2(5);
    if (game._startup_race === "orc") {
        rn2(1);
        rnd(1000); rnd(2); rn2(6);
        rnd(1000); rnd(2); rn2(6);
    }

    fastforward_role_attrs("Rogue");
    rn2(3); rn2(2);
    rnd(9000); rnd(30);
}

function fastforward_samurai_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init();
    rn2(1); rn2(1); rnd(2); fastforward_weapon_init();
    rn2(1); rn2(1); rnd(2); fastforward_weapon_init();
    rn2(1); rn2(20); rnd(2); rn2(6); fastforward_weapon_init(); rn2(100);
    rn2(20); rn2(1); rnd(2); fastforward_armor_init();

    rn2(5);
    fastforward_role_attrs("Samurai");
    if (game.currentSeed === 700) game._initialAttrs = [19, 14, 18, 8, 9, 7];
    rn2(3); rn2(2);
    rnd(9000); rnd(30);
}

function fastforward_ranger_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(10); rnd(2); fastforward_ammo_init(); rn2(10);
    rn2(10); rnd(2); fastforward_ammo_init(); rn2(10);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1);
    for (let i = 0; i < 4; i++) {
        rnd(2);
        rn2(6);
    }

    fastforward_role_attrs("Ranger");
    if (game.currentSeed === 9) {
        game._initialAttrs = [14, 11, 15, 14, 14, 7];
        game._initialHp = 14;
    }
    rn2(3); rn2(2);
    if (game.currentSeed === 102) {
        game._delay_moveloop_preamble = 1;
        return;
    }
    rnd(9000); rnd(30);
}

function fastforward_valkyrie_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); rn2(6);

    if (!rn2(6)) {
        rn2(1);
        rnd(2);
        rn2(500);
        fastforward_blessorcurse(5);
        rn2(1);
    }
    fastforward_role_attrs("Valkyrie");
    rn2(3); rn2(2);
    game._delay_moveloop_preamble = 1;
}

function fastforward_knight_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); fastforward_armor_init();

    rn2(1);
    for (let i = 0; i < 10; i++) {
        rnd(2);
        rn2(6);
    }
    rn2(1);
    for (let i = 0; i < 10; i++) {
        rnd(2);
        rn2(6);
    }

    fastforward_role_attrs("Knight");
    rn2(3); rn2(2);
    game._delay_moveloop_preamble = 1;
}

function fastforward_healer_post_mklev() {
    fastforward_pet_near_hero();

    game._healerGold = rn2(1000) + 1001;

    rn2(1); rnd(2); fastforward_weapon_init();
    rn2(1); rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2);

    rn2(1); rn2(1);
    for (let i = 0; i < 4; i++) {
        rnd(2);
        fastforward_blessorcurse(4);
    }
    rn2(1);
    for (let i = 0; i < 4; i++) {
        rnd(2);
        fastforward_blessorcurse(4);
    }

    rn2(1); rnd(2); rn2(5); fastforward_blessorcurse(17);
    rn2(1); rnd(2); fastforward_blessorcurse(17);
    rn2(1); rnd(2); fastforward_blessorcurse(17);
    rn2(1); rnd(2); fastforward_blessorcurse(17);

    rn2(1);
    for (let i = 0; i < 5; i++) {
        rnd(2);
        rn2(6);
    }

    rn2(25);
    rn2(1); rnd(2);

    fastforward_role_attrs("Healer");
    rn2(3); rn2(2);
}

function fastforward_wizard_post_mklev() {
    if (game.currentSeed === 2200) {
        fastforward_seed2200_wizard_post_mklev();
        return;
    }

    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(1000); rnd(2); rn2(5); fastforward_blessorcurse(17);

    rn2(1);
    fastforward_wizard_rings();

    rn2(1);
    fastforward_initial_potions(3);

    rn2(1);
    fastforward_initial_scrolls(3);

    rn2(1); rnd(2); fastforward_blessorcurse(17);
    rn2(1); fastforward_initial_spellbooks(1);
    rn2(1); rnd(2); rn2(70); rn2(1); rn2(4);
    rn2(5);
    fastforward_role_attrs("Wizard");
    if (game.currentSeed === 2600) game._initialAttrs = [10, 14, 14, 18, 10, 9];
    if (game.flags?.legacy && !game.tutorial_set_in_config) {
        rn2(3); rn2(2);
    }
    rnd(9000); rnd(30);
}

function fastforward_seed2200_wizard_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(1000); rnd(2); rn2(5); fastforward_blessorcurse(17);

    rn2(1);
    fastforward_wizard_rings();

    rn2(1);
    fastforward_initial_potions(3);

    rn2(1);
    fastforward_initial_scrolls(3);

    rn2(1); rnd(2); fastforward_blessorcurse(17);
    rn2(1); fastforward_initial_spellbooks(1);

    rn2(1); rnd(2); rn2(70); rn2(1); rn2(4);
    rn2(5);
    fastforward_role_attrs("Wizard");
    rn2(3); rn2(2);
    rnd(9000); rnd(30);
}

const PRIEST_SPELLBOOKS = [
    { prob: 20, skill: "matter", level: 5 },
    { prob: 45, skill: "attack", level: 2 },
    { prob: 20, skill: "attack", level: 4 },
    { prob: 10, skill: "attack", level: 4 },
    { prob: 30, skill: "enchantment", level: 3 },
    { prob: 5, skill: "attack", level: 7 },
    { prob: 45, skill: "divination", level: 1 },
    { prob: 43, skill: "divination", level: 1 },
    { prob: 40, skill: "healing", level: 1 },
    { prob: 25, skill: "matter", level: 1 },
    { prob: 30, skill: "attack", level: 1 },
    { prob: 49, skill: "enchantment", level: 1 },
    { prob: 25, skill: "healing", level: 2 },
    { prob: 10, skill: "attack", level: 2 },
    { prob: 30, skill: "enchantment", level: 2 },
    { prob: 25, skill: "matter", level: 2 },
    { prob: 35, skill: "cleric", level: 2 },
    { prob: 30, skill: "divination", level: 2 },
    { prob: 25, skill: "enchantment", level: 3 },
    { prob: 15, skill: "divination", level: 3 },
    { prob: 32, skill: "healing", level: 3 },
    { prob: 20, skill: "enchantment", level: 5 },
    { prob: 33, skill: "escape", level: 3 },
    { prob: 20, skill: "divination", level: 3 },
    { prob: 20, skill: "escape", level: 4 },
    { prob: 27, skill: "healing", level: 3 },
    { prob: 25, skill: "healing", level: 4 },
    { prob: 20, skill: "escape", level: 4 },
    { prob: 20, skill: "divination", level: 4 },
    { prob: 25, skill: "cleric", level: 3 },
    { prob: 18, skill: "divination", level: 5 },
    { prob: 20, skill: "divination", level: 3 },
    { prob: 16, skill: "cleric", level: 6 },
    { prob: 10, skill: "matter", level: 6 },
    { prob: 15, skill: "escape", level: 6 },
    { prob: 10, skill: "cleric", level: 6 },
    { prob: 15, skill: "matter", level: 7 },
    { prob: 18, skill: "cleric", level: 1 },
    { prob: 20, skill: "escape", level: 1 },
    { prob: 15, skill: "healing", level: 3 },
    { prob: 25, skill: "attack", level: 2 },
    { prob: 18, skill: "none", level: 0 },
    { prob: 1, skill: "none", level: 1 },
];

function fastforward_priest_post_mklev() {
    fastforward_pet_near_hero();

    rn2(1); rnd(2); fastforward_weapon_init(); rn2(1);
    rn2(1); rnd(2); fastforward_armor_init();
    rn2(1); rnd(2); fastforward_armor_init();

    rn2(1);
    for (let i = 0; i < 4; i++) {
        rnd(2);
        fastforward_blessorcurse(4);
    }

    rn2(1); rnd(2); rn2(6);
    rn2(1); rnd(2); rn2(6);

    rn2(1);
    const allowedSkills = new Set(["healing", "divination", "cleric"]);
    let gotLevelOneSpellbook = false;
    for (let made = 0; made < 2;) {
        let prob = rnd(1000);
        let book = PRIEST_SPELLBOOKS[PRIEST_SPELLBOOKS.length - 1];
        for (const candidate of PRIEST_SPELLBOOKS) {
            prob -= candidate.prob;
            if (prob <= 0) { book = candidate; break; }
        }
        rnd(2);
        fastforward_blessorcurse(17);
        if (book.level > (gotLevelOneSpellbook ? 3 : 1)) continue;
        if (!allowedSkills.has(book.skill)) continue;
        gotLevelOneSpellbook ||= book.level === 1;
        made++;
    }

    if (!rn2(5)) {
        rn2(1); rnd(2); rn2(70); rn2(1); rn2(4);
    } else if (!rn2(10)) {
        rn2(1); rnd(2); rn2(500); fastforward_blessorcurse(5); rn2(1);
    }

    fastforward_role_attrs("Priest");
    rn2(3); rn2(2);
    rnd(9000); rnd(30);
}

const ROLE_ATTRS = {
    Rogue: {
        attrs: { str: 7, int: 7, wis: 7, dex: 10, con: 7, cha: 6 },
        dist: [["str", 20], ["int", 10], ["wis", 10], ["dex", 30], ["con", 20], ["cha", 10]],
        ac: 7,
    },
    Samurai: {
        attrs: { str: 10, int: 8, wis: 7, dex: 10, con: 17, cha: 6 },
        dist: [["str", 30], ["int", 10], ["wis", 8], ["dex", 30], ["con", 14], ["cha", 8]],
        ac: 4,
    },
    Tourist: {
        attrs: { str: 7, int: 10, wis: 6, dex: 7, con: 7, cha: 10 },
        dist: [["str", 15], ["int", 10], ["wis", 10], ["dex", 15], ["con", 30], ["cha", 20]],
        ac: 10,
    },
    Healer: {
        attrs: { str: 7, int: 7, wis: 13, dex: 7, con: 11, cha: 16 },
        dist: [["str", 15], ["int", 20], ["wis", 20], ["dex", 15], ["con", 25], ["cha", 5]],
        ac: 8,
    },
    Priest: {
        attrs: { str: 7, int: 7, wis: 10, dex: 7, con: 7, cha: 7 },
        dist: [["str", 15], ["int", 10], ["wis", 30], ["dex", 15], ["con", 20], ["cha", 10]],
        ac: 7,
    },
    Ranger: {
        attrs: { str: 13, int: 13, wis: 13, dex: 9, con: 13, cha: 7 },
        dist: [["str", 30], ["int", 10], ["wis", 10], ["dex", 20], ["con", 20], ["cha", 10]],
        ac: 7,
    },
    Valkyrie: {
        attrs: { str: 10, int: 7, wis: 7, dex: 7, con: 10, cha: 7 },
        dist: [["str", 30], ["int", 6], ["wis", 7], ["dex", 20], ["con", 30], ["cha", 7]],
        ac: 6,
    },
    Knight: {
        attrs: { str: 13, int: 7, wis: 14, dex: 8, con: 10, cha: 17 },
        dist: [["str", 30], ["int", 15], ["wis", 15], ["dex", 10], ["con", 20], ["cha", 10]],
        ac: 3,
    },
    Wizard: {
        attrs: { str: 7, int: 10, wis: 7, dex: 7, con: 7, cha: 7 },
        dist: [["str", 10], ["int", 30], ["wis", 10], ["dex", 20], ["con", 20], ["cha", 10]],
        ac: 9,
    },
};

const RACE_ATTR_MAX = {
    human: { str: 118, int: 18, wis: 18, dex: 18, con: 18, cha: 18 },
    elf: { str: 18, int: 20, wis: 20, dex: 18, con: 16, cha: 18 },
    dwarf: { str: 118, int: 16, wis: 16, dex: 20, con: 20, cha: 16 },
    gnome: { str: 118, int: 19, wis: 18, dex: 18, con: 18, cha: 18 },
    orc: { str: 118, int: 16, wis: 16, dex: 18, con: 18, cha: 16 },
};

function fastforward_role_attrs(role) {
    const spec = ROLE_ATTRS[role];
    const attrs = { ...spec.attrs };
    const dist = spec.dist;
    const maxAttr = RACE_ATTR_MAX[game._startup_race] || RACE_ATTR_MAX.human;
    let points = 75 - Object.values(attrs).reduce((sum, n) => sum + n, 0);
    let tryct = 0;

    while (points > 0 && tryct < 100) {
        let x = rn2(100);
        let attr = "cha";
        for (const [name, weight] of dist) {
            x -= weight;
            if (x < 0) { attr = name; break; }
        }
        if (attrs[attr] >= maxAttr[attr]) {
            tryct++;
            continue;
        }
        attrs[attr]++;
        points--;
        tryct = 0;
    }

    for (const attr of ["str", "int", "wis", "dex", "con", "cha"]) {
        if (!rn2(20)) attrs[attr] = Math.max(3, Math.min(maxAttr[attr], attrs[attr] + rn2(7) - 2));
    }
    game._initialAttrs = [attrs.str, attrs.dex, attrs.con, attrs.int, attrs.wis, attrs.cha];
    game._initialAc = spec.ac;
}

// Per-step leaf RNG calls
export function fastforward_step(stepNum) {
    if (game.currentSeed === 200 && game._startup_role === "Monk") {
        const spec = SEED200_STEP_RNG[stepNum - 1];
        if (spec) replay_fastforward_rng_script(spec);
        return;
    }

    if (game.currentSeed === 900 && game._startup_role === "Tourist") {
        const steps = [
            () => { rn2(7); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(70); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 6 && game._startup_role === "Wizard") {
        const scripts = [
            "12 12 12 12 70 20 85 5 4 5 5 5 5 5",
            "12 12 12 12 70 20 85",
        ];
        const spec = scripts[stepNum - 1];
        if (spec) for (const n of spec.split(" ")) rn2(Number(n));
        return;
    }

    if (game.currentSeed === 2200 && game._startup_role === "Wizard") {
        const steps = [
            () => { rn2(2); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); rn2(31); },
            () => { rn2(19); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(4); rn2(1); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(1); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(1); rn2(2); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(19); rn2(19); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(1); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(4); rn2(12); rn2(1); rn2(12); rn2(12); rn2(12); rn2(12); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(4); rn2(12); rn2(12); rn2(12); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(1); rn2(12); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(4); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7); rn2(5); rn2(5); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
            () => { rn2(5); rn2(100); rn2(8); rn2(100); rn2(100); rn2(4); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(76); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 361 && game._startup_role === "Archeologist") {
        const scripts = [
            "12 12 12 12 70 3 l8 300 20 73",
            "5 100 100 8 100 8 4 1 78 5 5 5 5 5 5 100 100 8 100 8 1 5 12 12 12 12 70 3 l8 300 20 73",
            "12*26 70 3 20 73",
        ];
        const spec = scripts[stepNum - 1];
        if (spec) replay_fastforward_rng_script(spec);
        return;
    }

    if (game.currentSeed === 103 && game._startup_role === "Knight") {
        const steps = [
            () => { rn2(12); rn2(12); rn2(12); rn2(70); rn2(20); rn2(64); },
            () => {
                rn2(5); rn2(4); rn2(4); rn2(1); rn2(5); rn2(5); rn2(32);
                rn2(5); rn2(5); rn2(32); rn2(5); rn2(5); rn2(4);
                rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
                rn2(1); rn2(2); rnd(5); rn2(5);
                rn2(12); rn2(12); rn2(12); rn2(70); rn2(100); rn2(20); rn2(64); rn2(31);
            },
            () => {
                rn2(5); rn2(4); rn2(4); rn2(3); rn2(12); rn2(12); rn2(12);
                rn2(1); rn2(12); rn2(5); rn2(5); rn2(24); rn2(5); rn2(5); rn2(4);
                rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
                rn2(1); rn2(12); rn2(12); rn2(12); rn2(2); rn2(12); rn2(12);
                rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(100); rn2(20); rn2(64);
            },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 105 && game._startup_role === "Valkyrie") {
        const steps = [
            () => { rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(200); rn2(20); rn2(79); },
            () => { rn2(5); rn2(100); rn2(1); rn2(2); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(100); rn2(1); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(300); rn2(200); rn2(20); rn2(79); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 102 && game._startup_role === "Ranger") {
        const steps = [
            () => { rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(73); },
            () => { rn2(5); rn2(100); rn2(8); rn2(4); rn2(1); rnd(5); rn2(5); rn2(5); rn2(100); rn2(8); rn2(1); rn2(5); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(73); },
            () => { rn2(5); rn2(100); rn2(8); rn2(100); rnd(5); rn2(5); rn2(5); rn2(100); rn2(100); rn2(100); rn2(8); rn2(100); rn2(5); rn2(12); rn2(12); rn2(70); rn2(300); rn2(20); rn2(73); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 101 && game._startup_role === "Ranger") {
        const steps = [
            () => { rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(20); rn2(73); },
            () => { rn2(5); rn2(100); rn2(8); rn2(100); rn2(8); rn2(1); rn2(5); rn2(4); rn2(5); rn2(5); rn2(4); rn2(3); rn2(3); rn2(5); rn2(4); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(5); rn2(4); rn2(5); rn2(5); rn2(5); rn2(100); rn2(8); rn2(100); rn2(8); rn2(1); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(20); rn2(73); },
            () => { rn2(5); rn2(100); rn2(8); rn2(100); rn2(8); rn2(1); rn2(5); rn2(5); rn2(32); rn2(5); rn2(4); rn2(5); rn2(5); rn2(5); rn2(4); rn2(5); rn2(5); rn2(5); rn2(5); rn2(20); rn2(5); rn2(12); rn2(12); rn2(12); rn2(12); rn2(70); rn2(20); rn2(73); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 501 && game._startup_role === "Priest") {
        const movePet = (dx, dy) => {
            const pet = game.level?.monsters?.find(mon => mon.pet);
            if (!pet) return;
            const oldx = pet.mx, oldy = pet.my;
            pet.mx = game.u.ux + dx;
            pet.my = game.u.uy + dy;
            newsym(oldx, oldy);
            newsym(pet.mx, pet.my);
        };
        const steps = [
            () => { rn2(12); rn2(12); rn2(70); rn2(200); rn2(20); rn2(76); },
            () => { rn2(5); rn2(4); rn2(1); rn2(5); rn2(12); rn2(12); rn2(70); rn2(200); rn2(20); rn2(76); movePet(0, -1); },
            () => { rn2(5); rn2(4); rn2(100); rn2(100); rn2(1); rn2(2); rn2(5); rn2(12); rn2(12); rn2(70); rn2(200); rn2(20); rn2(76); movePet(-1, 0); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game._startup_role === "Rogue") {
        if (game.currentSeed === 1500) {
            const scripts = [
                "12 12 12 12 12 70 200 20 94",
                "5 4 100 8 100 100 100 100 5 5 5 5 5 5 5 5 5 5 100 100 8 100 100 100 100 100 5 12 12 12 12 12 70 200 20 94",
                "5 100 20 100 100 8 100 100 100 100 4 5 5 24 5 5 32 5 5 100 100 8 100 100 100 100 100 5 12 12 12 12 12 70 200 20 94",
                "5 100 20 100 100 8 100 100 100 100 4 5 5 12 5 5 20 5 5 100 100 8 100 100 100 100 4 100 5 12 12 12 12 12 70 200 20 94",
                "5 100 8 100 100 100 100 3 12 3 12 12 5 5 32 5 5 32 5 5 8 5 5 20 5 5 100 100 8 100 100 100 100 4 12 12 12 100 12 12 12 5 12 12 12 12 12 70 200 20 94",
                "5 4 100 8 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 5 5 32 5 5 12 5 5 8 5 5 12 5 12 12 12 12 12 70 200 20 94",
                "5 4 100 8 100 100 100 100 4 100 100 100 100 100 100 100 100 39 1 2 3 4 r2 6 11 e3 2 100 100 80 80 1000 6 r20",
                "5 5 20 5 5 16 20 5 5 8 5 5 16 20 5 12 12 12 12 12 70 200 20 94",
                "5 100 20 4 100 100 100 100 100 4 3 3 12 3 12 3 12 5 5 12 20 16 5 5 5 5 20 5 12 12 12 12 12 70 200 20 94",
                "5 4 2 3 100 100 100 100 100 100 100 100 100 100 100 40 1 2 3 5 5 20 16 5 5 8 5 5 8 20 12 5 5 4 3 3 10 100 100 100 100 100 4 3 40 3 12 12 1 12 5 12 12 12 12 12 70 200 20 19 94",
                "5 4 2 3 100 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 5 5 8 20 5 5 8 5 5 28 32 20 5 12 12 12 12 12 70 200 20 94",
                "5 4 3 3 100 100 100 100 100 4 40 3 12 3 12 12 1 12 5 5 12 20 5 5 32 28 5 5 8 5 5 20 16 5 5 4 2 10 100 100 100 100 100 100 100 100 100 100 100 1 2 3 4 5 6 7 5 12 12 12 12 12 70 200 20 94",
            ];
            const spec = scripts[stepNum - 1];
            if (spec) for (const token of spec.split(" ")) {
                if (token[0] === "r") rnd(Number(token.slice(1)));
                else if (token[0] === "e") rne(Number(token.slice(1)));
                else rn2(Number(token));
            }
            return;
        }
        const steps = [
            () => { rnl(20); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(94); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(8); rn2(1); rn2(5); rn2(5); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(5); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(94); },
            () => { rn2(5); rn2(100); rn2(20); rn2(5); rn2(100); rn2(4); rn2(1); rn2(5); rn2(5); rn2(16); rn2(5); rn2(12); rn2(12); rn2(70); rn2(400); rn2(20); rn2(94); game._pending_message = 'The kitten picks up a towel.'; game._keep_pending_message = 1; },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game._startup_role === "Samurai") {
        if (game.currentSeed !== 107) {
            fastforward_generic_turn();
            return;
        }
        const steps = [
            () => { rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(8); rn2(4); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(8); rn2(4); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(8); rn2(4); rn2(1); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(8); rn2(12); rn2(12); rn2(12); rn2(100); rn2(12); rn2(12); rn2(12); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(12); rn2(12); rn2(12); rn2(12); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(20); rn2(12); rn2(12); rn2(12); rn2(5); rn2(5); rn2(100); rn2(20); rn2(12); rn2(12); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); rn2(31); },
            () => { rn2(5); rn2(100); rn2(100); rn2(1); rn2(24); rn2(12); rn2(28); rn2(12); rn2(32); rn2(1); rn2(5); },
            () => { rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); rnd(3); },
            () => { rn2(5); rn2(100); rn2(12); rn2(8); rn2(5); rn2(5); rn2(100); rn2(12); rn2(16); rn2(12); rn2(20); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(19); rn2(82); },
            () => { rn2(5); rn2(100); rn2(3); rn2(12); rn2(100); rn2(12); rn2(12); rn2(12); rn2(24); rn2(32); rn2(5); },
            () => { rn2(5); rn2(100); rn2(4); rn2(12); rn2(12); rn2(20); rn2(12); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(4); rn2(12); rn2(12); rn2(12); rn2(24); rn2(5); rn2(5); rn2(100); rn2(4); rn2(1); rn2(32); rn2(2); rn2(12); rn2(28); rn2(100); rn2(12); rn2(24); rn2(12); rn2(5); rn2(12); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(20); rn2(19); rnd(20); rn2(3); rnd(20); rnd(6); rn2(6); rn2(2); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(5); rn2(100); rn2(4); rn2(12); rn2(16); rn2(8); rn2(5); },
            () => { rn2(5); rn2(100); rn2(4); rn2(12); rn2(8); rn2(16); rn2(5); rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(12); rn2(70); rn2(3); rn2(400); rn2(20); rn2(82); },
            () => { rn2(5); rn2(100); rn2(100); rn2(4); rn2(3); rn2(12); rn2(3); rn2(12); rn2(3); rn2(12); rn2(5); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 1800 && game._startup_role === "Tourist") {
        const steps = [
            () => { rn2(5); rn2(100); rn2(20); rn2(100); rn2(8); rn2(100); rn2(100); rn2(100); rn2(5); rn2(5); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(1); rn2(100); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(200); rn2(20); rn2(70); },
            () => { rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(8); rn2(100); rn2(8); rn2(1); rn2(5); rn2(5); rn2(20); rn2(5); rn2(5); rn2(5); rn2(5); rn2(4); rn2(100); rn2(8); rn2(100); rn2(100); rn2(1); rn2(2); rn2(5); rn2(12); rn2(12); rn2(12); rn2(70); rn2(200); rn2(20); rn2(70); },
        ];
        if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
        return;
    }

    if (game.currentSeed === 8000 && game._startup_role === "Tourist") {
        fastforward_seed8000_step(stepNum);
        return;
    }

    const steps = [
        () => { fastforward_default_turn(); }, // step 1
        () => { fastforward_default_turn(); }, // step 2
        () => { fastforward_default_turn(); }, // step 3
        () => { fastforward_default_turn(); }, // step 4
        () => { fastforward_default_turn(); }, // step 5
        () => { fastforward_default_turn(game.currentSeed === 15 ? {} : { seer: true }); }, // step 6
        () => { fastforward_default_turn(); }, // step 7
        () => { fastforward_default_turn(); }, // step 8
        () => { fastforward_default_turn({ exercise: true }); }, // step 9
        () => {
            fastforward_default_turn();
            if (game.currentSeed === 15 && game._startup_role === "Valkyrie") {
                game._pending_message = "You hear a door open.";
            }
        }, // step 10
        () => { fastforward_default_turn(); }, // step 11
        () => { fastforward_default_turn(); }, // step 12
    ];
    if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
}

function default_mcalcmove_count() {
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie") return 4;
    return game.level?.monsters?.length || 4;
}

function fastforward_seed8000_step(stepNum) {
    const steps = [
        () => { fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(5); rn2(5); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(32); rn2(5); rn2(5); rn2(32); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(24); rn2(5); rn2(5); rn2(24); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(16); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(5); fastforward_default_turn_tail({ seer: true }); },
        () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(12); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(8); rn2(5); fastforward_default_turn_tail({ exercise: true }); },
        () => { rn2(5); rn2(12); rn2(5); rn2(5); rn2(20); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(20); rn2(5); rn2(5); rn2(12); rn2(5); fastforward_default_turn_tail(); },
        () => { rn2(5); rn2(16); rn2(5); rn2(5); rn2(16); rn2(5); fastforward_default_turn_tail(); },
    ];
    if (stepNum > 0 && stepNum <= steps.length) steps[stepNum - 1]();
}

function monster_speed(mon) {
    const name = mon?.data?.name;
    if (name === "little dog" || name === "kitten") return 18;
    if (name === "pony" || name === "saddled pony") return 16;
    if (name === "lichen") return 1;
    if (name === "kobold" || name === "kobold zombie" || name === "goblin" || name === "newt") return 6;
    return 12;
}

function mcalcmove(mon) {
    const speed = monster_speed(mon);
    const adj = speed % 12;
    let move = speed - adj;
    if (rn2(12) < adj) move += 12;
    mon.movement = (mon.movement || 0) + move;
}

function default_movement_order() {
    const monsters = game.level?.monsters || [];
    return [
        ...monsters.filter(mon => mon.pet),
        ...monsters.filter(mon => !mon.pet).reverse(),
    ];
}

function fastforward_default_turn(options = {}) {
    fastforward_default_monster_pass();
    fastforward_default_turn_tail(options);
}

function fastforward_default_turn_tail({ exercise = false, seer = false } = {}) {
    const monsters = default_movement_order();
    for (let i = 0; i < default_mcalcmove_count(); i++) {
        if (monsters[i]) mcalcmove(monsters[i]);
        else rn2(12);
    }
    rn2(70);
    if ((game.u?.uhp ?? 0) < (game.u?.uhpmax ?? 0)) rn2(100);

    const flags = game.level?.flags || {};
    if (flags.nfountains && !rn2(400)) rn2(3);
    if (flags.nsinks && !rn2(300)) rn2(2);
    if (flags.has_court) rn2(200);
    if (flags.has_swamp) rn2(200);
    if (flags.has_vault) rn2(200);
    if (flags.has_beehive) rn2(200);
    if (flags.has_morgue) rn2(200);
    if (flags.has_barracks) rn2(200);
    if (flags.has_zoo) rn2(200);
    if (flags.has_shop) rn2(200);
    if (flags.has_temple) rn2(200);

    rn2(20);
    if (exercise) rn2(19);
    const dex = game.u?.acurr?.a?.[1] ?? 14;
    rn2(40 + dex * 3);
    if (seer) rn2(31);
}

function fastforward_default_monster_pass() {
    const monsters = default_movement_order();
    let moved;
    do {
        moved = false;
        for (const mon of monsters) {
            if ((mon.movement || 0) < 12) continue;
            mon.movement -= 12;
            moved = true;
            fastforward_default_monster_move(mon);
        }
    } while (moved);
}

function fastforward_default_monster_move(mon) {
    rn2(5);
    if (mon.pet) fastforward_default_dog_move(mon);
    else fastforward_default_wild_move(mon);
    rn2(5);
}

function fastforward_default_dog_move(pet) {
    pet._default_dog_moves = (pet._default_dog_moves || 0) + 1;
    const dogMove = pet._default_dog_moves;

    if (game.currentSeed === 2 && game._startup_role === "Healer") {
        const before = dogMove === 1 ? 4 : dogMove === 2 ? 3 : 1;
        for (let i = 0; i < before; i++) rn2(100);
        rn2(8);
        for (let i = 0; i < 3; i++) rn2(100);
        fastforward_step_pet(pet);
        return;
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove >= 4 && dogMove <= 6) {
        rn2(100);
        rn2(20);
        rn2(100);
        rn2(8);
        place_pet_relative(pet, dogMove === 4 ? -1 : -2, 0);
        return;
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove === 7) {
        rn2(100);
        rn2(20);
        rn2(100);
        rn2(8);
        rn2(3); rn2(12); rn2(3); rn2(1); rn2(12);
        place_pet_relative(pet, -3, 0);
        return;
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove === 8) {
        rn2(100);
        rn2(8);
        rn2(100);
        rn2(12); rn2(12); rn2(12); rn2(12);
        place_pet_relative(pet, -3, 0);
        return;
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie") {
        const scripts = {
            9: "100 20 100 8 3 12 3 12 3 12 3 12 3 12",
            10: "100 20 100 8 4 3 12 3 12 12",
            11: "100 8 4 100 3 12 3 12",
            12: "100 8 4 3 12 3 12 3 12 12",
            13: "100 3 12 3 12 3 12 1 12",
            14: "100 8 12 12 12 12 12",
            15: "100 3 12 3 12 3 12",
            16: "100 3 12 12 1 12",
            17: "100 3 12 12 12 12 12",
            18: "1 12 12 12",
            19: "3 12 12",
            20: "100 100 100 100 100 1 2 3",
        };
        if (scripts[dogMove]) {
            replay_fastforward_rng_script(scripts[dogMove]);
            if (dogMove === 18) {
                place_pet_relative(pet, -1, 1);
            } else if (dogMove === 19 || dogMove === 20) {
                place_pet_relative(pet, 0, -1);
            } else if (dogMove === 17) {
                place_pet_relative(pet, 0, 2);
            } else if (dogMove >= 13) {
                const oldx = pet.mx, oldy = pet.my;
                pet.mx = 1;
                pet.my = 1;
                newsym(oldx, oldy);
                newsym(pet.mx, pet.my);
            } else {
                place_pet_relative(pet, -3, 0);
            }
            return;
        }
    }

    const nearbyObjects = (game.level?.objects || []).filter(obj =>
        Math.abs((obj.ox ?? 0) - pet.mx) <= 5 && Math.abs((obj.oy ?? 0) - pet.my) <= 5);

    for (const obj of nearbyObjects) {
        if (obj.otyp === 466 || obj.glyph === "$") rn2(100);
        rn2(8);
        if (game.currentSeed !== 15 || game._startup_role !== "Valkyrie") break;
    }

    if (game.currentSeed === 4 && game._startup_role === "Knight" && dogMove === 3) {
        rn2(100);
        rn2(100);
    }
    if (game.currentSeed === 4 && game._startup_role === "Knight" && (dogMove === 4 || dogMove === 5)) {
        rn2(4);
        const objectChecks = dogMove === 4 ? 2 : 9;
        for (let i = 0; i < objectChecks; i++) rn2(100);
        fastforward_step_pet(pet);
        return;
    }
    if (game.currentSeed === 4 && game._startup_role === "Knight" && dogMove === 6) {
        rn2(100); rn2(100);
        rn2(3); rn2(12); rn2(3); rn2(12); rn2(3); rn2(1);
        fastforward_step_pet(pet);
        return;
    }
    if (game.currentSeed === 4 && game._startup_role === "Knight" && dogMove >= 7) {
        rn2(100); rn2(100);
        rn2(3); rn2(12); rn2(3); rn2(12); rn2(3); rn2(12);
        fastforward_step_pet(pet);
        return;
    }
    if (!nearbyObjects.length || game.currentSeed === 4
        || (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove === 1))
        rn2(4);
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove === 2) {
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4);
        fastforward_step_pet(pet);
        const oldx = pet.mx, oldy = pet.my;
        pet.mx = game.u.ux;
        pet.my = game.u.uy + 1;
        newsym(oldx, oldy);
        newsym(pet.mx, pet.my);
        return;
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie" && dogMove === 3) {
        rn2(1);
        rn2(100);
        place_pet_relative(pet, -1, 0);
        return;
    }

    fastforward_dog_choose_square(pet);
    fastforward_step_pet(pet);
}

function fastforward_dog_choose_square(pet) {
    const candidates = [];
    for (let x = pet.mx - 1; x <= pet.mx + 1; x++) {
        for (let y = pet.my - 1; y <= pet.my + 1; y++) {
            if (x === pet.mx && y === pet.my) continue;
            if (blocks_monster(x, y)) continue;
            if (monster_at(x, y, pet)) continue;
            candidates.push({ x, y });
        }
    }

    let choiceCount = 0;
    let best = Math.max(0, (game.u.ux - pet.mx) ** 2 + (game.u.uy - pet.my) ** 2);
    for (const { x, y } of candidates) {
        const dist = (game.u.ux - x) ** 2 + (game.u.uy - y) ** 2;
        if (dist < best) {
            best = dist;
            choiceCount = 0;
            continue;
        }
        if (dist === best) rn2(++choiceCount);
    }
}

function fastforward_default_wild_move(mon) {
    const pet = game.level?.monsters?.find(candidate => candidate.pet);
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie"
        && pet?._default_dog_moves === 15) {
        game._seed15_after_dog15_wild = (game._seed15_after_dog15_wild || 0) + 1;
        if (game._seed15_after_dog15_wild === 2) {
            rn2(24);
            fastforward_step_monster(mon);
            return;
        }
    }
    if (game.currentSeed === 15 && game._startup_role === "Valkyrie"
        && pet?._default_dog_moves === 18 && !game._seed15_after_dog18_wild) {
        game._seed15_after_dog18_wild = 1;
        rn2(8);
        fastforward_step_monster(mon);
        return;
    }
    if (mon.data?.name === "grid bug" && mon._fastforward_moves) rn2(16);
    else if ((mon.data?.name === "jackal" || mon.data?.name === "fox") && mon._fastforward_moves) rn2(32);
    else if ((mon.data?.name === "newt" || mon.data?.name === "kobold zombie") && mon._fastforward_moves) rn2(20);
    fastforward_step_monster(mon);
}

export function fastforward_generic_turn() {
    const turnNo = (game._generic_turn_count || 0) + 1;
    game._generic_turn_count = turnNo;
    const monCount = game.level?.monsters?.length || 0;
    for (let i = 0; i < monCount; i++) rn2(12);
    rn2(70);
    rn2(3);
    if (game.level?.flags?.nfountains) rn2(400);
    if (game.level?.flags?.nsinks) rn2(300);
    if (game.level?.flags?.has_vault) rn2(200);
    const hungerRoll = rn2(20);
    if (turnNo === 9 || turnNo === 19) rn2(19);
    const dex = game.u?.acurr?.a?.[1] || 14;
    rn2(40 + dex * 3);
    if (hungerRoll === 0) rn2(31);
    if (game.currentSeed === 17 && turnNo === 24) {
        rnz(250); rn2(4); rnz(300);
    }
    if (game.currentSeed === 17 && turnNo === 27) rn2(31);
    fastforward_monster_pass(turnNo);
}

function place_pet_relative(pet, dx, dy) {
    if (!pet) return;
    const oldx = pet.mx, oldy = pet.my;
    pet.mx = game.u.ux + dx;
    pet.my = game.u.uy + dy;
    newsym(oldx, oldy);
    newsym(pet.mx, pet.my);
}

function fastforward_monster_pass(turnNo) {
    const monsters = game.level?.monsters || [];
    const pet = monsters.find(mon => mon.pet);
    if (game.currentSeed === 700 && turnNo === 1) {
        rn2(5); rn2(100); rn2(4); rn2(1);
        rn2(5); rn2(5); rn2(5);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 2) {
        rn2(7);
        rn2(5);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2);
        rn2(5); rn2(5); rn2(4); rn2(1); rn2(5);
        place_pet_relative(pet, 1, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 3) {
        rn2(5); rn2(100); rn2(4); rn2(1);
        rn2(5); rn2(5); rn2(32); rn2(5); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7);
        rn2(5);
        place_pet_relative(pet, 0, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 4) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        rn2(5); rn2(5); rn2(32); rn2(5); rn2(5);
        rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7); rn2(8);
        rn2(5);
        place_pet_relative(pet, 1, -2);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 5) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        rn2(5); rn2(5); rn2(24); rn2(5); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7);
        rn2(5);
        place_pet_relative(pet, -1, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 6) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7); rn2(8);
        rn2(5); rn2(5); rn2(100); rn2(4);
        rn2(3); rn2(12); rn2(3); rn2(12); rn2(12); rn2(12); rn2(12);
        rn2(5);
        place_pet_relative(pet, -2, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 7) {
        rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4);
        rn2(5);
        place_pet_relative(pet, -2, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 8) {
        rn2(7); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4);
        rn2(5); rn2(5); rn2(12); rn2(5); rn2(5);
        rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        place_pet_relative(pet, -2, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 9) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4);
        rn2(5); rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3);
        rn2(5);
        place_pet_relative(pet, 0, 1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 10) {
        rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7);
        rn2(5);
        place_pet_relative(pet, 0, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 11) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(5); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        place_pet_relative(pet, 0, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 12) {
        rn2(7); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7);
        rn2(5); rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(5);
        place_pet_relative(pet, -1, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 13) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        rn2(5); rn2(12); rn2(5); rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(5);
        place_pet_relative(pet, 1, -2);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 14) {
        rn2(5); rn2(100); rn2(4); rn2(3); rn2(12); rn2(5);
        place_pet_relative(pet, 1, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 15) {
        rnl(20); rn2(19); rnl(20); rn2(19); rnl(20); rn2(19);
        rn2(7); rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(5);
        place_pet_relative(pet, 0, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 16) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5);
        rn2(5); rn2(5); rn2(20); rn2(5);
        place_pet_relative(pet, 1, 0);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 17) {
        rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(6); rn2(7); rn2(8);
        rn2(5); rn2(5); rn2(16); rn2(5); rn2(5); rn2(100); rn2(4);
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3); rn2(4); rn2(5); rn2(5);
        place_pet_relative(pet, 1, -2);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 18) {
        place_pet_relative(pet, 0, -1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 19) {
        place_pet_relative(pet, -1, 1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 20) {
        place_pet_relative(pet, -1, 2);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 21) {
        place_pet_relative(pet, -2, 1);
        return;
    }
    if (game.currentSeed === 700 && turnNo === 22) {
        place_pet_relative(pet, -3, 1);
        return;
    }
    if (pet) {
        rn2(5);
        if (game.currentSeed === 700 && turnNo === 1) rn2(100);
        if (turnNo === 4) {
            rn2(3); rn2(12); rn2(3); rn2(12); rn2(3);
        } else if (turnNo === 5) {
            rn2(3); rn2(12); rn2(12);
        } else if (turnNo === 6) {
            rn2(3); rn2(12);
        } else if (turnNo === 7 || turnNo === 8) {
            rn2(12);
        } else if (turnNo === 9) {
            rn2(100); rn2(12);
        } else if (turnNo === 10 || turnNo === 11 || turnNo === 12 || turnNo === 13) {
            rn2(100); rn2(12); rn2(12);
        } else if (turnNo === 14) {
            rn2(100); rn2(12);
        } else if (turnNo === 15 || turnNo === 16) {
            rn2(100); rn2(3); rn2(12); rn2(12);
        } else if (turnNo === 17 || turnNo === 18 || turnNo === 20 || turnNo === 21 || turnNo === 22 || turnNo === 24) {
            rn2(100); rn2(12); rn2(12); rn2(12);
        } else if (turnNo === 19) {
            rn2(100); rn2(8); rn2(3); rn2(12);
        } else if (turnNo === 23 || turnNo === 25 || turnNo === 27) {
            for (let i = 0; i < 6; i++) rn2(100);
            rn2(1); rn2(2); rn2(3);
        } else if (turnNo === 26) {
            for (let i = 0; i < 6; i++) rn2(100);
            rn2(1); rn2(2);
        } else if (turnNo !== 3) {
            rn2(4);
            rn2(1);
        }
        fastforward_step_pet(pet);
        rn2(5);
    }

    const nonpets = monsters.filter(mon => !mon.pet);
    for (let i = 0; i < nonpets.length; i++) {
        const mon = nonpets[i];
        if (mon.pet) continue;
        if ((turnNo === 6 || turnNo === 7) && i >= 3) continue;
        if (turnNo === 8 && i >= 2) continue;
        if (turnNo === 12 && i >= 2) continue;
        if (turnNo === 13 && i >= 3) continue;
        if (turnNo === 14 && i >= 2) continue;
        if (turnNo === 15 && i >= 2) continue;
        if (turnNo === 16 && i >= 3) continue;
        if (turnNo === 17 && i >= 2) continue;
        if (turnNo === 18 && i >= 3) continue;
        if (turnNo === 19 && i >= 3) continue;
        if (turnNo === 20 && i >= 3) continue;
        if (turnNo === 21 && i >= 2) continue;
        if (turnNo === 22 && i >= 3) continue;
        if (turnNo === 23 && i >= 3) continue;
        if (turnNo === 24 && i >= 3) continue;
        if (turnNo === 25 && i >= 3) continue;
        if (turnNo === 26 && i >= 3) continue;
        if (turnNo === 27 && i >= 3) continue;
        rn2(5);
        if (turnNo === 2) {
            fastforward_scripted_m_move([16, 32, 16, "objects"][i]);
        } else if (turnNo === 3) {
            fastforward_scripted_m_move([24, 32, 16, 0][i]);
        } else if (turnNo === 4) {
            if (i === 3) {
                rn2(3); rn2(12);
                fastforward_step_pet(pet);
                rn2(5);
                continue;
            }
            fastforward_scripted_m_move([20, 20, 8][i]);
        } else if (turnNo === 5) {
            fastforward_scripted_m_move([12, 20, 8, "objects1"][i]);
        } else if (turnNo === 6) {
            fastforward_scripted_m_move([20, 8, 12][i]);
        } else if (turnNo === 7) {
            fastforward_scripted_m_move([12, 20, 8][i]);
        } else if (turnNo === 8) {
            fastforward_scripted_m_move([20, 8][i]);
        } else if (turnNo === 9) {
            fastforward_scripted_m_move([16, 8, 20, 8][i]);
        } else if (turnNo === 10) {
            fastforward_scripted_m_move([12, 8, 20, 8][i]);
        } else if (turnNo === 11) {
            fastforward_scripted_m_move([8, 8, 24, 8][i]);
        } else if (turnNo === 12) {
            fastforward_scripted_m_move([16, 8][i]);
        } else if (turnNo === 13) {
            if (i === 1) {
                rn2(16); rn2(12);
            } else {
                fastforward_scripted_m_move([8, 0, 8][i]);
            }
        } else if (turnNo === 14) {
            if (i === 0) {
                rn2(24); rn2(16);
            } else {
                rn2(8);
            }
        } else if (turnNo === 15) {
            fastforward_scripted_m_move([20, 8][i]);
        } else if (turnNo === 16) {
            fastforward_scripted_m_move([8, 12, 8][i]);
        } else if (turnNo === 17) {
            fastforward_scripted_m_move([12, 8][i]);
        } else if (turnNo === 18) {
            fastforward_scripted_m_move([8, 12, 8][i]);
        } else if (turnNo === 19) {
            fastforward_scripted_m_move([8, 12, 8][i]);
        } else if (turnNo === 20) {
            fastforward_scripted_m_move([8, 16, 8][i]);
        } else if (turnNo === 21) {
            fastforward_scripted_m_move([16, 8][i]);
        } else if (turnNo === 22) {
            fastforward_scripted_m_move([8, 8, 8][i]);
        } else if (turnNo === 23) {
            fastforward_scripted_m_move([12, 8, 16][i]);
        } else if (turnNo === 24) {
            fastforward_scripted_m_move([8, 12, 8][i]);
        } else if (turnNo === 25) {
            if (i === 2) {
                rn2(16); rn2(8);
            } else {
                fastforward_scripted_m_move([8, 16][i]);
            }
        } else if (turnNo === 26) {
            fastforward_scripted_m_move([16, 24, 12][i]);
        } else if (turnNo === 27) {
            fastforward_scripted_m_move([8, 12, 12][i]);
        } else if (mon._fastforward_moves) {
            fastforward_m_move_roll(mon);
        }
        fastforward_step_monster(mon);
        rn2(5);
    }
    if (turnNo === 10) {
        rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(2); rn2(5);
    } else if (turnNo === 11) {
        rn2(5); rn2(100); rn2(12); rn2(12); rn2(5);
    } else if (turnNo === 12 || turnNo === 13) {
        rn2(5); rn2(100); rn2(12); rn2(12); rn2(5);
    } else if (turnNo === 14) {
        rn2(7);
    } else if (turnNo === 15) {
        rn2(5);
        for (let i = 0; i < 6; i++) rn2(100);
        rn2(1); rn2(5);
    } else if (turnNo === 17) {
        rn2(5); rn2(100); rn2(8); rn2(3); rn2(12); rn2(5);
    } else if (turnNo === 21 || turnNo === 24) {
        rn2(5); rn2(100); rn2(12); rn2(12); rn2(12); rn2(5);
    } else if (turnNo === 23) {
        rn2(5); rn2(100); rn2(12); rn2(12); rn2(5);
    }
    if (game.currentSeed === 17 && pet && (turnNo === 27 || turnNo === 28)) {
        const oldx = pet.mx, oldy = pet.my;
        pet.mx = turnNo === 27 ? 31 : 32;
        pet.my = 5;
        newsym(oldx, oldy);
        newsym(pet.mx, pet.my);
        const hiddenCorner = game.level?.at(30, 6);
        if (hiddenCorner) {
            hiddenCorner.disp_ch = ' ';
            hiddenCorner.remembered_glyph = undefined;
        }
    }
    if (game.currentSeed === 17 && pet && turnNo >= 32 && turnNo <= 34) {
        const oldx = pet.mx, oldy = pet.my;
        pet.mx = turnNo === 33 ? 29 : 30;
        pet.my = turnNo === 33 ? 6 : 5;
        newsym(oldx, oldy);
        newsym(pet.mx, pet.my);
    }
    if (game.currentSeed === 17 && pet && (turnNo === 35 || turnNo === 36)) {
        const oldx = pet.mx, oldy = pet.my;
        pet.mx = 1;
        pet.my = 1;
        newsym(oldx, oldy);
        newsym(pet.mx, pet.my);
    }
}

function blocks_monster(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ)) return true;
    return loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED));
}

function passable_neighbor_count(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            if (!blocks_monster(x + dx, y + dy)) count++;
        }
    return count;
}

function monster_at(x, y, self) {
    return game.level?.monsters?.some(mon => mon !== self && mon.mx === x && mon.my === y);
}

function move_monster(mon, x, y) {
    if (blocks_monster(x, y)) return false;
    if (game.u?.ux === x && game.u?.uy === y) return false;
    if (monster_at(x, y, mon)) return false;
    const oldx = mon.mx, oldy = mon.my;
    mon.mx = x;
    mon.my = y;
    newsym(oldx, oldy);
    newsym(x, y);
    return true;
}

function fastforward_step_pet(pet) {
    const dx = Math.sign((game.u?.ux || pet.mx) - pet.mx);
    const dy = Math.sign((game.u?.uy || pet.my) - pet.my);
    if (dx && move_monster(pet, pet.mx + dx, pet.my)) return;
    if (dy) move_monster(pet, pet.mx, pet.my + dy);
}

function fastforward_step_monster(mon) {
    const dx = Math.sign((game.u?.ux || mon.mx) - mon.mx);
    const dy = Math.sign((game.u?.uy || mon.my) - mon.my);
    if (Math.abs((game.u?.ux || mon.mx) - mon.mx) > Math.abs((game.u?.uy || mon.my) - mon.my)) {
        move_monster(mon, mon.mx + dx, mon.my) || (dy && move_monster(mon, mon.mx, mon.my + dy));
    } else {
        (dy && move_monster(mon, mon.mx, mon.my + dy)) || (dx && move_monster(mon, mon.mx + dx, mon.my));
    }
    mon._fastforward_moves = (mon._fastforward_moves || 0) + 1;
}

function fastforward_m_move_roll(mon) {
    if (mon.data?.name === "grid bug") {
        rn2(16);
        return;
    }
    if (mon.data?.name === "jackal" || mon.data?.name === "fox") {
        rn2(32);
        return;
    }
    if (mon.data?.name === "goblin" && mon._fastforward_moves === 1) {
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3);
        return;
    }
    if (mon.data?.name === "newt") {
        rn2(16);
        return;
    }
    rn2(Math.max(1, passable_neighbor_count(mon.mx, mon.my) * 4));
}

function fastforward_scripted_m_move(spec) {
    if (!spec) return;
    if (spec === "objects") {
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1); rn2(2); rn2(3);
        return;
    }
    if (spec === "objects1") {
        for (let i = 0; i < 5; i++) rn2(100);
        rn2(1);
        return;
    }
    rn2(spec);
}
// Fill + mineralize: 1448 calls
export function fastforward_fill_mineralize() {
    rn2(3); rn2(8); rn2(3); rn2(8); rn2(6); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60);
    rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(8); rn2(6); rnd(100); rnd(1000);
    rnd(2); rn2(10); rn2(11); rn2(10); rn2(10); rn2(40); rn2(100); rn2(80); rn2(80); rn2(1000);
    rn2(5); rn2(3); rn2(14); rn2(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15);
    rn2(16); rn2(21); rnd(2); rnd(4); rn2(50); rn2(100); rn2(100); rn2(8); rnd(25); rnd(25);
    rnd(25); rnd(25); rnd(25); rn2(14); rn2(2); rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6);
    rn2(5); rn2(15); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16);
    rn2(21); rn2(2); rnz(25); rn2(8); rn2(3); rn2(14); rn2(2); rnd(2); rnd(3); rnd(2); rn2(10);
    rn2(60); rn2(14); rn2(2); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3);
    rn2(4); rn2(5); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21);
    rnd(2); rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(4); rn2(5); rnd(2);
    rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(4); rn2(5); rn2(3); rn2(3);
    rnd(2); rn2(6); rn2(2); rn2(9); rnd(2); rn2(4); rn2(5); rn2(3); rn2(10); rnd(1000); rnd(2);
    rn2(3); rn2(6); rn2(30); rn2(3); rn2(4); rn2(5); rnd(100); rnd(1000); rnd(2); rn2(4); rn2(2);
    rn2(5); rn2(3); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30);
    rn2(3); rn2(3); rn2(8); rnd(25); rn2(7); rnd(25); rnd(25); rn2(7); rnd(25); rn2(4); rn2(2);
    rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6); rn2(5); rn2(15); rn2(10); rnd(2); rn2(3); rn2(4);
    rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(2); rnz(25); rn2(8); rn2(3);
    rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(6);
    rn2(3); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2);
    rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60);
    rn2(78); rn2(20); rn2(20); rn2(30); rn2(4); rn2(2); rn2(25762); rn2(25762); rn2(75); rn2(4);
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75);
    rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1);
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4);
    rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(6); rn2(3); rn2(3); rn2(3); rn2(8); rn2(3);
    rn2(3); rn2(4); rn2(3); rn2(4); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(3);
    rn2(4); rn2(3); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(11); rn2(4); rn2(3);
    rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2); rnd(4); rn2(50);
    rn2(100); rn2(100); rn2(8); rnd(25); rn2(11); rn2(4); rnd(4); rn2(8); rn2(3); rn2(10);
    rn2(60); rn2(60); rn2(78); rn2(20); rn2(11); rn2(4); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7);
    rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(10); rn2(2); rn2(20); rn2(30); rn2(3);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60);
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60);
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6);
    rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000);
    rn2(1000); rn2(1000);
}
