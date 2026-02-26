// exper.js -- Experience points and leveling
// cf. exper.c — newuexp, newexplevel, pluslvl, experience, losexp, more_experienced

import { rn1, rn2, rnd } from './rng.js';
import { roles, races } from './player.js';
import { A_CON, A_WIS,
         PM_PRIEST, PM_WIZARD, PM_HEALER, PM_KNIGHT,
         PM_BARBARIAN, PM_VALKYRIE } from './config.js';

const MAXULEV = 30;

// cf. exper.c:14 — newuexp(): experience points threshold for given level
export function newuexp(lev) {
    if (lev < 1)
        return 0;
    if (lev < 10)
        return 10 * (1 << lev);
    if (lev < 20)
        return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

// cf. exper.c:25 — enermod(): role-dependent energy modifier for level-up
export function enermod(en, roleIndex) {
    switch (roleIndex) {
    case PM_PRIEST:
    case PM_WIZARD:
        return (2 * en);
    case PM_HEALER:
    case PM_KNIGHT:
        return Math.floor((3 * en) / 2);
    case PM_BARBARIAN:
    case PM_VALKYRIE:
        return Math.floor((3 * en) / 4);
    default:
        return en;
    }
}

// cf. exper.c:44 — newpw(): calculate spell power gain for new/current level
// For ulevel==0 (init): en = role.enadv.infix + race.enadv.infix + optional rnd(inrnd)
// For ulevel>0 (level-up): en = enermod(rn1(enrnd, enfix))
export function newpw(player) {
    const role = roles[player.roleIndex];
    const race = races[player.race];
    if (!role || !race) return 1;
    const roleEnadv = role.enadv_full || {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1};
    const raceEnadv = race.enadv || {infix:0, inrnd:0, lofix:0, lornd:0, hifix:0, hirnd:0};
    let en = 0;

    if (player.level === 0) {
        // Initialization
        en = roleEnadv.infix + raceEnadv.infix;
        if (roleEnadv.inrnd > 0)
            en += rnd(roleEnadv.inrnd);
        if (raceEnadv.inrnd > 0)
            en += rnd(raceEnadv.inrnd);
    } else {
        // Level-up
        const enrndWis = Math.floor((player.attributes?.[A_WIS] || 10) / 2);
        let enrnd, enfix;
        if (player.level < (role.xlev || 14)) {
            enrnd = enrndWis + roleEnadv.lornd + raceEnadv.lornd;
            enfix = roleEnadv.lofix + raceEnadv.lofix;
        } else {
            enrnd = enrndWis + roleEnadv.hirnd + raceEnadv.hirnd;
            enfix = roleEnadv.hifix + raceEnadv.hifix;
        }
        en = enermod(rn1(enrnd, enfix), player.roleIndex);
    }
    if (en <= 0) en = 1;
    return en;
}

// cf. attrib.c:1077 — newhp(): calculate hit point gain for new/current level
// For ulevel==0 (init): hp = role.hpadv.infix + race.hpadv.infix + optional rnd(inrnd)
// For ulevel>0 (level-up): hp = role.hpadv.lo/hifix + race + optional rnd(lo/hirnd) + conplus
export function newhp(player) {
    const role = roles[player.roleIndex];
    const race = races[player.race];
    if (!role || !race) return 1;
    const roleHpadv = role.hpadv || {infix:10, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0};
    const raceHpadv = race.hpadv || {infix:2, inrnd:0, lofix:0, lornd:2, hifix:1, hirnd:0};
    let hp;

    if (player.level === 0) {
        // Initialization — no Con adjustment
        hp = roleHpadv.infix + raceHpadv.infix;
        if (roleHpadv.inrnd > 0)
            hp += rnd(roleHpadv.inrnd);
        if (raceHpadv.inrnd > 0)
            hp += rnd(raceHpadv.inrnd);
    } else {
        // Level-up
        if (player.level < (role.xlev || 14)) {
            hp = roleHpadv.lofix + raceHpadv.lofix;
            if (roleHpadv.lornd > 0)
                hp += rnd(roleHpadv.lornd);
            if (raceHpadv.lornd > 0)
                hp += rnd(raceHpadv.lornd);
        } else {
            hp = roleHpadv.hifix + raceHpadv.hifix;
            if (roleHpadv.hirnd > 0)
                hp += rnd(roleHpadv.hirnd);
            if (raceHpadv.hirnd > 0)
                hp += rnd(raceHpadv.hirnd);
        }
        // Con adjustment for level-up
        const con = player.attributes?.[A_CON] || 10;
        let conplus;
        if (con <= 3) conplus = -2;
        else if (con <= 6) conplus = -1;
        else if (con <= 14) conplus = 0;
        else if (con <= 16) conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else conplus = 4;
        hp += conplus;
    }
    if (hp <= 0) hp = 1;
    return hp;
}

// cf. exper.c:206 — losexp(): level drain (e.g., hit by drain life attack)
// Partial: drains level and HP but does not implement adjabil/uhpinc/ueninc.
// RNG: consumes rnd(10) for HP loss, rn2(5) for PW loss (matching C's newhp/newpw calls).
export function losexp(player, display, drainer) {
    if (player.level <= 1) {
        // Can't lose a level below 1; C would kill the hero
        return;
    }
    // cf. exper.c:230 — lose HP: normally role-dependent via uhpinc array;
    // simplified: rnd(10) as placeholder (matches C's newhp typical range).
    const hpLoss = rnd(10);
    player.hpmax = Math.max(1, player.hpmax - hpLoss);
    player.hp = Math.min(player.hp, player.hpmax);

    // cf. exper.c:250 — lose PW: normally role-dependent via ueninc array;
    // simplified: rn2(5) placeholder (matches C's newpw typical range).
    const pwLoss = rn2(5);
    player.pwmax = Math.max(0, player.pwmax - pwLoss);
    player.pw = Math.min(player.pw, player.pwmax);

    player.level--;
    player.exp = newuexp(player.level);
    if (display) {
        display.putstr_message(`You feel your life force draining away.`);
    }
}

// cf. exper.c:299 — newexplevel(): check if player should gain a level
// TRANSLATOR: AUTO (exper.c:299)
export function newexplevel(player) {
  if (player.ulevel < MAXULEV &player.uexp >= newuexp(player.ulevel)) pluslvl(true);
}

// cf. exper.c:306 — pluslvl(): gain an experience level
export function pluslvl(player, display, incr) {
    if (!incr) {
        display.putstr_message('You feel more experienced.');
    }

    // cf. exper.c:324 newhp() — role-dependent HP gain
    const hpGain = newhp(player);
    player.hpmax += hpGain;
    player.hp += hpGain;

    // cf. exper.c:330 newpw() — role-dependent PW gain
    const pwGain = newpw(player);
    player.pwmax += pwGain;
    player.pw += pwGain;

    if (player.level < MAXULEV) {
        if (incr) {
            const tmp = newuexp(player.level + 1);
            if (player.exp >= tmp) {
                player.exp = tmp - 1;
            }
        } else {
            player.exp = newuexp(player.level);
        }
        player.level++;
        const back = (player.ulevelmax != null && player.ulevelmax >= player.level) ? 'back ' : '';
        display.putstr_message(`Welcome ${back}to experience level ${player.level}.`);
        if (player.ulevelmax == null || player.ulevelmax < player.level) {
            player.ulevelmax = player.level;
        }
    }
}

// cf. exper.c:377 — rndexp(): random XP for potions/polyself
// TODO: exper.c:377 — rndexp(gaining): needs LARGEST_INT handling, rn2 with large diff
