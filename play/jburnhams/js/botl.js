import { game } from './gstate.js';
import { BOTL_NSIZ, A_CHAOTIC, A_NEUTRAL, A_LAWFUL, COLNO, A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA } from './const.js';

function get_strength_str() {
    const st = game.u?.acurr?.a?.[0] || 0;
    if (st > 18) {
        if (st > 118) {
            return (st - 100).toString().padStart(2, ' ');
        } else if (st < 118) {
            return `18/${(st - 18).toString().padStart(2, '0')}`;
        } else {
            return '18/**';
        }
    } else {
        return st.toString().padEnd(1, ' ');
    }
}

export function bot1() {
    if (!game.u) return '';

    let newbot1 = '';
    const plname = game.plname || 'Hero';
    let nameStr = plname;
    if (nameStr.length > 0 && nameStr[0] >= 'a' && nameStr[0] <= 'z') {
        nameStr = nameStr[0].toUpperCase() + nameStr.slice(1);
    }
    nameStr = nameStr.slice(0, BOTL_NSIZ);
    newbot1 += nameStr + " the ";

    let rankStr = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    newbot1 += rankStr;

    const title = `${nameStr} the ${rankStr}`;
    const gap = Math.max(1, 31 - title.length);
    let output = '';

    const u = game.u;
    const statsStr = `St:${get_strength_str()} Dx:${u.acurr?.a?.[1] || '?'} Co:${u.acurr?.a?.[2] || '?'} In:${u.acurr?.a?.[3] || '?'} Wi:${u.acurr?.a?.[4] || '?'} Ch:${u.acurr?.a?.[5] || '?'}`;

    const alignType = game.u.ualign?.type ?? 0;
    const alignStr = alignType === A_CHAOTIC ? " Chaotic" : alignType === A_NEUTRAL ? " Neutral" : " Lawful";

    if (gap > 4) {
        output = `${title}\x1b[${gap}C${statsStr}${alignStr}`;
    } else {
        output = `${title}${' '.repeat(gap)}${statsStr}${alignStr}`;
    }

    return output;
}

export const hu_stat = [
    "Satiated", "       ", "Hungry", "Weak", "Fainting", "Fainted", "Starved"
];

export const enc_stat = [
    "",         "Burdened",  "Stressed",
    "Strained", "Overtaxed", "Overloaded"
];

export function bot2() {
    if (!game.u) return '';

    const dlvl = game.u.uz?.dlevel ?? 1;
    let money = game._goldCount || 0;
    if (money < 0) money = 0;

    let hp = game.u.uhp || 0;
    let hpmax = game.u.uhpmax || 0;
    if (hp < 0) hp = 0;
    let uen = game.u.uen ?? 0;
    let uenmax = game.u.uenmax ?? 0;
    let uac = game.u.uac ?? 10;

    let ulevel = game.u.ulevel || 1;
    let uexp = game.u.uexp || 0;
    let moves = game.moves || 1;

    let expr = '';
    // if Upolyd, it would be HD:mlevel. We skip it for now.
    // game.flags isn't defined yet usually, default showexp is TRUE in C unless set.
    // wait, we can just use `game.flags?.showexp !== false` to assume true if undefined.
    if (game.flags?.showexp !== false) {
        expr = `Xp:${ulevel}/${uexp}`;
    } else {
        expr = `Xp:${ulevel}`;
    }

    let tmmv = '';
    // game.flags?.time is FALSE by default in NetHack until set (except in some configs).
    // BUT the expected screen in seed8000 DOES have it! So let's match the old static behavior
    // when flags isn't present, or use flags.time if it is. The old code had:
    // return `Dlvl:${...} ... Xp:${...} T:${game.moves}`;
    if (game.flags?.time || game.flags?.time === undefined) {
        tmmv = ` T:${moves}`; // leading space for joining
    }

    let cond = '';
    if (game.u.ustoned) cond += " Stone";
    if (game.u.uslimed) cond += " Slime";
    if (game.u.ustrangled) cond += " Strngl";
    if (game.u.usick_type) {
        if (game.u.usick_type & 1) cond += " FoodPois"; // SICK_VOMITABLE
        if (game.u.usick_type & 2) cond += " TermIll"; // SICK_NONVOMITABLE
    }

    const uhs = game.u.uhs ?? 1;
    if (uhs !== 1 && hu_stat[uhs]) cond += ` ${hu_stat[uhs]}`;
    const cap = game.u.ucap ?? 0;
    if (cap > 0 && enc_stat[cap]) cond += ` ${enc_stat[cap]}`;

    // In C, it checks macro Blind, Deaf, Stunned, etc.
    if (game.u.ublindf || game.u.ublind) cond += " Blind";
    if (game.u.udeaf) cond += " Deaf";
    if (game.u.ustun) cond += " Stun";
    if (game.u.uconf) cond += " Conf";
    if (game.u.uhallu) cond += " Hallu";
    // Levitation, Flying, and Riding checks usually involve complex conditions. Let's do basic for now
    if (game.u.ulev) cond += " Lev";
    if (game.u.ufly) cond += " Fly";
    if (game.u.usteed) cond += " Ride";

    let acStr = uac.toString().padEnd(2, ' ');
    let newbot2 = `Dlvl:${dlvl} $:${Math.min(money, 999999)} HP:${Math.min(hp, 9999)}(${Math.min(hpmax, 9999)}) Pw:${Math.min(uen, 9999)}(${Math.min(uenmax, 9999)}) AC:${acStr} ${expr}${tmmv}${cond}`;

    return newbot2;
}
