// were.js — Port of NetHack 5.0 were.c (lycanthropy) and its call-site
// machinery into the JS monster/hero model.
//
// C references use paths under nethack-c/upstream:
//   src/were.c, src/uhitm.c, src/polyself.c, src/mhitu.c, src/mon.c,
//   include/monsters.h, include/calendar-related code in src/calendar.c.
//
// RNG-parity notes:
//  * NetHack 5.0's rn2(x)/rnd(x)/rn1(x,y) each consume exactly one PRNG
//    draw regardless of x (rnd.c uses one RANDOM() call per rn2/rnd), so
//    were_change()'s moon-phase-dependent arity (rn2(3/30/10/50)) keeps the
//    recorded draw *sequence* bit-exact as long as a roll is made exactly
//    once per were-monster turn, matching the former parity stub.
//  * Protection_from_shape_changers short-circuits the human-form roll
//    (were.c:16 `!Protection_from_shape_changers && !rn2(...)`), so no draw
//    is consumed in that case; the port preserves that ordering.

import { rn2, rnd, rn1 } from './rng.js';
import { game } from './gstate.js';

// C ref: include/flag.h:80-81
export const NEW_MOON = 0;
export const FULL_MOON = 4;

// Canonical were-species form data.
// C ref: include/monsters.h — beast forms: wererat S_RODENT (line ~911),
// werejackal S_DOG (line ~220), werewolf S_DOG (line ~267); human forms:
// S_HUMAN wererat/werejackal/werewolf (lines ~2609/2618/2627).
// LVL(level, move, ac, mr, align); difficulty is the last MON() arg.
// Both shapes share mmove 12 (set_mon_data would prorate movement, but
// 12->12 proration is a no-op; mondata.c:13).
export const WERE_SPECIES = new Map([
    ['wererat', {
        beastNoun: 'rat',
        human: {
            name: 'wererat', mlet: '@', glyph: '@', color: 3 /*CLR_BROWN*/,
            mlevel: 2, difficulty: 3, mmove: 12, mac: 10, mr: 10, maligntyp: -7,
            were: true, wereHuman: true, armed: true, regen: true,
            mrPoison: true, noCorpse: false,
            // monsters.h:2611 — ATTK(AT_WEAP, AD_PHYS, 2, 4)
            attack: { verb: 'hits', aatyp: 'weap', adtyp: 'phys', dice: 2, sides: 4 },
        },
        beast: {
            name: 'wererat', mlet: 'r', glyph: 'r', color: 3 /*CLR_BROWN*/,
            mlevel: 2, difficulty: 4, mmove: 12, mac: 6, mr: 10, maligntyp: -7,
            were: true, wereBeast: true, nohands: true, animal: true,
            verysmall: true, regen: true, mrPoison: true, noCorpse: true,
            attack: { verb: 'bites', aatyp: 'bite', adtyp: 'were', dice: 1, sides: 4 },
        },
        // were.c:149-153: were_summon() wererat pack composition and rolls
        summonKinds: { rolls: [[3, 'sewer rat'], [3, 'giant rat']], fallback: 'rabid rat', genbuf: 'rat' },
    }],
    ['werejackal', {
        beastNoun: 'jackal',
        howlNoun: 'jackal', // were.c:25-39 (default/howler switch)
        human: {
            name: 'werejackal', mlet: '@', glyph: '@', color: 1 /*CLR_RED*/,
            mlevel: 2, difficulty: 3, mmove: 12, mac: 10, mr: 10, maligntyp: -7,
            were: true, wereHuman: true, armed: true, regen: true,
            mrPoison: true, noCorpse: false,
            // monsters.h:2620 — ATTK(AT_WEAP, AD_PHYS, 2, 4)
            attack: { verb: 'hits', aatyp: 'weap', adtyp: 'phys', dice: 2, sides: 4 },
        },
        beast: {
            name: 'werejackal', mlet: 'd', glyph: 'd', color: 3 /*CLR_BROWN*/,
            mlevel: 2, difficulty: 4, mmove: 12, mac: 7, mr: 10, maligntyp: -7,
            were: true, wereBeast: true, nohands: true, animal: true,
            regen: true, mrPoison: true, noCorpse: true,
            attack: { verb: 'bites', aatyp: 'bite', adtyp: 'were', dice: 1, sides: 4 },
        },
        // were.c:154-158
        summonKinds: { rolls: [[7, 'jackal'], [3, 'coyote']], fallback: 'fox', genbuf: 'jackal' },
    }],
    ['werewolf', {
        beastNoun: 'wolf',
        howlNoun: 'wolf',
        human: {
            name: 'werewolf', mlet: '@', glyph: '@', color: 9 /*CLR_ORANGE*/,
            mlevel: 5, difficulty: 6, mmove: 12, mac: 10, mr: 20, maligntyp: -7,
            were: true, wereHuman: true, armed: true, regen: true,
            mrPoison: true, noCorpse: false,
            // monsters.h:2629 — ATTK(AT_WEAP, AD_PHYS, 2, 4)
            attack: { verb: 'hits', aatyp: 'weap', adtyp: 'phys', dice: 2, sides: 4 },
        },
        beast: {
            name: 'werewolf', mlet: 'd', glyph: 'd', color: 8 /*CLR_GRAY*/,
            mlevel: 5, difficulty: 7, mmove: 12, mac: 4, mr: 20, maligntyp: -7,
            were: true, wereBeast: true, nohands: true, animal: true,
            regen: true, mrPoison: true, noCorpse: true,
            attack: { verb: 'bites', aatyp: 'bite', adtyp: 'were', dice: 2, sides: 6 },
        },
        // were.c:159-163
        summonKinds: { rolls: [[5, 'wolf'], [2, 'warg']], fallback: 'winter wolf', genbuf: 'wolf' },
    }],
]);

// C ref: include/mondata.h:96 is_were(ptr) — M2_WERE.
export function isWereData(data) {
    return !!(data && (data.were || data.wereHuman || data.wereBeast || data.isWere));
}

// C ref: include/mondata.h:101 is_human(ptr) — M2_HUMAN; in were.c the
// human/animal split is `is_human(mon->data)`.
export function isWereHumanForm(data) {
    return isWereData(data) && !data.wereBeast && (data.wereHuman || data.mlet === '@');
}

// Species key for a monster data record, or null for non-were monsters.
export function wereSpeciesOf(data) {
    if (!isWereData(data)) return null;
    const name = String(data.name || '').toLowerCase();
    const match = name.match(/\b(were(?:rat|jackal|wolf))\b/);
    return match && WERE_SPECIES.has(match[1]) ? match[1] : null;
}

// C ref: were.c:48-67 counter_were() — map human<->beast form of a were.
// Accepts a data record or species name; returns the counter form data
// record, or null (C returns NON_PM for non-were input).
export function counterWereData(data) {
    const species = typeof data === 'string' ? data : wereSpeciesOf(data);
    const entry = species ? WERE_SPECIES.get(species) : null;
    if (!entry) return null;
    const isHuman = typeof data === 'string' ? false : isWereHumanForm(data);
    return isHuman ? entry.beast : entry.human;
}

// C ref: were.c:70-93 were_beastie() — convert monsters similar to
// werecritters into their werebeast species; returns null (NON_PM) if none.
export function wereBeastieSpecies(name) {
    switch (String(name || '').toLowerCase()) {
    case 'wererat': case 'sewer rat': case 'giant rat': case 'rabid rat':
        return 'wererat';
    case 'werejackal': case 'jackal': case 'fox': case 'coyote':
        return 'werejackal';
    case 'werewolf': case 'wolf': case 'warg': case 'winter wolf':
    case 'winter wolf cub':
        return 'werewolf';
    default:
        return null;
    }
}

// C ref: include/youprop.h:359-360 Protection_from_shape_changers —
// hero-only worn/extrinsic property.
function heroProtectionFromShapeChangers(g) {
    const u = g?.u;
    if (u?.protectionFromShapeChangers || u?.Protection_from_shape_changers) return true;
    return (g?.inventory || []).some(item => {
        if (!(item.worn || item.line?.includes('being worn'))) return false;
        return /protection from shape (?:changers|shifters)/i
            .test(String(item.kind || item.actualKind || item.line || ''));
    });
}

// C ref: src/calendar.c:214-220 night() — (hour < 6 || hour > 21), real-time
// hour taken from the recorded game clock (_datetime "YYYYMMDDHHMMSS").
export function nightNow(g = game) {
    if (g?.flags?.night || g?.flags?.isnight) return true;
    const hourValue = g?.flags?.hour ?? g?.hour ?? g?.context?.hour;
    const datetime = String(g?._datetime || '');
    const hour = hourValue == null
        ? (/^\d{10}/.test(datetime) ? Number(datetime.slice(8, 10)) : NaN)
        : Number(hourValue);
    return Number.isFinite(hour) && (hour < 6 || hour > 21);
}

function monnam(mon) {
    // C: Monnam() — "The <name>" for ordinary monsters.
    const base = String(mon?.givenName || mon?.data?.name || mon?.name || 'creature');
    if (mon?.givenName) return base;
    return `The ${base}`;
}

// C ref: src/allmain.c wake_nearto_core() — wake sleeping monsters whose
// dx*dx+dy*dy distance is strictly less than `dist`.
function wakeNearto(g, x, y, dist) {
    for (const mtmp of (g?.level?.monsters || [])) {
        if (!mtmp || mtmp.dead || (mtmp.mhp != null && mtmp.mhp <= 0)) continue;
        if (dist === 0 || (((mtmp.mx - x) ** 2) + ((mtmp.my - y) ** 2) < dist)) {
            mtmp.msleeping = 0;
            if (mtmp.mstrategy) mtmp.mstrategy = 0;
        }
    }
}

// C ref: were.c:96-139 new_were() — swap mon->data to the counter form,
// waken, regenerate 1/4 of lost hp, refresh display, shed unusable gear.
// ctx: { g, addToplineMessage, newsym, hallucination }.
export function newWere(mon, ctx = {}) {
    const g = ctx.g || game;
    // were.c:101-104: Protection_from_shape_changers blocks human->beast.
    if (heroProtectionFromShapeChangers(g) && isWereHumanForm(mon?.data || {}))
        return false;

    const next = counterWereData(mon?.data || {});
    if (!next) return false; // were.c:106-111 impossible() -> bail

    const toHuman = isWereHumanForm(next);
    const canSeeMonster = typeof ctx.canseemon === 'function'
        ? ctx.canseemon(mon) : !mon?.minvis && !mon?.mundetected;
    const hallucinating = !!(ctx.hallucination ?? g?.u?.hallucinating ?? g?.u?.hallucination);
    // were.c:113-115: visible, non-hallucinating feedback. `pmname+4`
    // skips the "were" prefix -> "changes into a wolf."
    if (canSeeMonster && !hallucinating) {
        const msg = `${monnam(mon)} changes into a ${toHuman ? 'human' : next.name.replace(/^were/, '')}.`;
        if (typeof ctx.addToplineMessage === 'function') ctx.addToplineMessage(msg);
        else (g._deferredMessages ??= []).push(msg);
    }

    // were.c:117 set_mon_data: identity swap, hp preserved; movement
    // prorated (no-op here, both forms are mmove 12).
    mon.data = { ...next };
    mon.name = next.name;
    mon.mlet = next.mlet;
    mon.glyph = next.glyph;
    if (next.color != null) mon.color = next.color;
    mon.were = true;
    mon.isWere = true;
    mon.wereHuman = !!next.wereHuman;
    mon.wereBeast = !!next.wereBeast;

    // were.c:118-123: helpless() transformation wakens and/or revitalizes.
    if (mon.msleeping || mon.mfrozen || mon.mcanmove === false) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = true;
    }
    // were.c:125: regenerate by 1/4 of the lost hit points (healmon).
    mon.mhpmax = mon.mhpmax ?? mon.mhp ?? 1;
    mon.mhp = mon.mhp ?? mon.mhpmax;
    const lost = mon.mhpmax - mon.mhp;
    if (lost > 0) mon.mhp = Math.min(mon.mhpmax, mon.mhp + Math.trunc(lost / 4));
    // were.c:126-128: newsym; mon_break_armor + possibly_unwield — beast
    // forms are M1_NOHANDS so wielded/worn gear is forced off.
    if (typeof ctx.newsym === 'function') ctx.newsym(mon.mx, mon.my);
    if (next.nohands && mon.mw) { // possibly_unwield: drop monster weapon
        (mon.minvent ??= []).push(mon.mw);
        mon.mw = null;
    }
    if (next.nohands) {
        // mon_break_armor: beast shape can't wear armor; shed worn pieces.
        for (const slot of ['chest', 'shield', 'helmet', 'gloves', 'boots', 'cloak']) {
            if (mon[slot]) (mon.minvent ??= []).push(mon[slot]);
            mon[slot] = null;
        }
    }

    // were.c:131-136: flee hero if standing on a scary square at the target
    // destination. onscary()/elbereth semantics are handled by ctx.onscary
    // when available; the flee roll is rn1(9, 2) = 2..10 turns.
    if (ctx.monMoving && !mon.mpeaceful) {
        const scary = typeof ctx.onscary === 'function' && mon.mux != null
            && ctx.onscary(mon.mux, mon.muy, mon);
        const nearTarget = mon.mux != null
            && Math.abs((mon.mx ?? mon.mux) - mon.mux) <= 1
            && Math.abs((mon.my ?? mon.muy) - mon.muy) <= 1;
        if (scary && nearTarget) {
            mon.mfleetim = rn1(9, 2);
            mon.mflee = true;
        }
    }
    return true;
}

// C ref: were.c:9-44 were_change() — per-turn lycanthrope shapeshift roll,
// called for every were monster each monster turn (mon.c:1198 in
// m_calcdistress). Returns true if mon changed form.
// ctx: { g, addToplineMessage, newsym }.
export function wereChange(mon, ctx = {}) {
    const g = ctx.g || game;
    const data = mon?.data || {};
    if (!isWereData(data)) return false; // were.c:11-12

    if (isWereHumanForm(data)) {
        // were.c:16-33: maybe change into animal form.
        if (!heroProtectionFromShapeChangers(g)
            && !rn2(nightNow(g) ? (g?.flags?.moonphase === FULL_MOON ? 3 : 30)
                                : (g?.flags?.moonphase === FULL_MOON ? 10 : 50))) {
            if (!newWere(mon, { ...ctx, g })) return false;
            g.were_changes = (g.were_changes || 0) + 1; // were.c:19
            if (!(g?.u?.deaf) && !(typeof ctx.canseemon === 'function' && ctx.canseemon(mon))) {
                // were.c:24-38: unseen wolf/jackal howl feedback.
                const howler = WERE_SPECIES.get(wereSpeciesOf(mon.data))?.howlNoun || null;
                if (howler) {
                    const msg = `You hear a ${howler} howling at the moon.`;
                    if (typeof ctx.addToplineMessage === 'function') ctx.addToplineMessage(msg);
                    else (g._deferredMessages ??= []).push(msg);
                    wakeNearto(g, mon.mx, mon.my, 4 * 4); // were.c:34
                }
            }
            return true;
        }
        return false;
    }
    // were.c:40-43: beast form — maybe change back into human form.
    if (!rn2(30) || heroProtectionFromShapeChangers(g)) {
        if (newWere(mon, { ...ctx, g })) {
            g.were_changes = (g.were_changes || 0) + 1; // were.c:43
            return true;
        }
        return false;
    }
    return false;
}

// C ref: were.c:142-189 were_summon() — a were-creature (maybe the hero in
// were form) summons a horde: rnd(5) attempts, species-dependent rn2 chain
// per attempt. Returns { total, visible } like C's (total, *visible) pair.
// ctx: { g, yours, heroX, heroY, makemon, tamedog, canseemon }.
export async function wereSummon(ptr, ctx = {}) {
    const g = ctx.g || game;
    const yours = !!ctx.yours;
    const species = typeof ptr === 'string' ? ptr : wereSpeciesOf(ptr);
    const entry = species && WERE_SPECIES.get(species);
    // were.c:151-152: Protection blocks other-monster summons only.
    if (heroProtectionFromShapeChangers(g) && !yours) return { total: 0, visible: 0 };

    let total = 0, visible = 0;
    if (!entry) return { total, visible };
    const hx = ctx.heroX ?? g?.u?.ux ?? 0;
    const hy = ctx.heroY ?? g?.u?.uy ?? 0;
    for (let i = rnd(5); i > 0; i--) { // were.c:149
        // Per-species conditional rn2 chain (were.c:150-168).
        let typ = entry.summonKinds.fallback;
        for (const [n, name] of entry.summonKinds.rolls) {
            if (rn2(n)) { typ = name; break; }
        }
        const mon = typeof ctx.makemon === 'function'
            ? await ctx.makemon(typ, hx, hy)
            : null;
        if (mon) {
            total++;
            if (typeof ctx.canseemon === 'function' && ctx.canseemon(mon)) visible++;
            // were.c:184-185: hero's summons arrive tame.
            if (yours && typeof ctx.tamedog === 'function') ctx.tamedog(mon);
        }
    }
    return { total, visible };
}

// C ref: uhitm.c:4265-4290 mhitm_ad_were(), mhitu branch — a werebeast's
// AD_WERE bite against the hero may infect the hero with lycanthropy.
// Roll ordering follows C exactly: rn2(4) is consumed unconditionally when
// the bite lands; rn2(10) (mhitm_mgc_atk_negated, uhitm.c:75-90) is consumed
// only when all earlier terms hold (C short-circuit semantics).
// ctx: { g, uwepDefendsWere, magicNegation, addToplineMessage }.
export function wereBiteInfectsHero(attacker, ctx = {}) {
    const g = ctx.g || game;
    const species = wereSpeciesOf(attacker?.data || attacker);
    if (!species) return false;
    const roll = rn2(4); // uhitm.c:4275
    const alreadyLycanthropic = g?.u?.ulycn && g.u.ulycn !== -1; // u.ulycn != NON_PM
    if (roll || alreadyLycanthropic || heroProtectionFromShapeChangers(g)
        || ctx.uwepDefendsWere) {
        return false;
    }
    // uhitm.c:75-90 mhitm_mgc_atk_negated(magr, mdef, TRUE): cancellation
    // check against hero's armor-class-based magic negation.
    const armpro = ctx.magicNegation ?? 0;
    if (rn2(10) < 3 * armpro) return false;
    setUlycn(species, g); // uhitm.c:4281-4283
    if (typeof ctx.addToplineMessage === 'function')
        ctx.addToplineMessage('You feel feverish.');
    return true;
}

// C ref: were.c:231-238 set_ulycn() — start/cure lycanthropy infection
// without any shape change. `which` is a species name or -1 (NON_PM).
export function setUlycn(which, g = game) {
    if (!g?.u) return;
    g.u.ulycn = which ?? -1;
    if (g.u.ulymon == null) g.u.ulymon = -1;
    // were.c:236-237 set_uasmon(): would swap the lycanthrope's innate
    // drain-resistance intrinsic in/out; the JS attribute cache doesn't
    // track that yet, so only the flag is updated here.
}

function heroIsInWereForm(g) {
    const form = g?.u?._polyself_form;
    return !!form && isWereData(form);
}

function heroUnchanging(g) {
    return !!(g?.u?.unchanging || g?.u?.Unchanging || g?.u?.heroHasUnchanging);
}

function monsterNearby(g) {
    // C: monster_nearby() — hostile monster adjacent (polyself machinery
    // also checks !_polyself_form adjacency rules; this is the simple case).
    const ux = g?.u?.ux, uy = g?.u?.uy;
    if (ux == null || uy == null) return false;
    return (g?.level?.monsters || []).some(mon =>
        mon && !mon.dead && !mon.mpeaceful && !mon.mundetected
        && (mon.mhp == null || mon.mhp > 0)
        && Math.abs((mon.mx ?? ux) - ux) <= 1 && Math.abs((mon.my ?? uy) - uy) <= 1);
}

// C ref: were.c:192-211 you_were() — periodic lycanthropy flare-up turning
// the hero into their beast form. Hooks: ctx.polymon(species) performs the
// polymorph; ctx.queryYNC('Do you want to change into X?') supplies the
// paranoid_query(ParanoidWerechange) answer when Polymorph_control is set.
export function youWere(ctx = {}) {
    const g = ctx.g || game;
    const u = g?.u;
    if (!u) return false;
    const lycn = u.ulycn;
    if (!lycn || lycn === -1) return false;
    const species = String(lycn).toLowerCase();
    const entry = WERE_SPECIES.get(species);
    if (!entry) return false;
    // were.c:196-197: Unchanging or already in were form -> no change.
    if (heroUnchanging(g) || heroIsInWereForm(g)) return false;
    const controllable = !!(u.polymorphControl || u.Polymorph_control)
        && !(u.stunned || u.unaware); // Stunned || Unaware
    if (controllable) {
        // were.c:199-203: confirm before changing.
        if (typeof ctx.queryYNC === 'function'
            && !ctx.queryYNC(`Do you want to change into ${entry.beastNoun}?`))
            return false;
    } else if (monsterNearby(g)) {
        return false; // were.c:204-205
    }
    g.were_changes = (g.were_changes || 0) + 1;
    if (typeof ctx.polymon === 'function') { ctx.polymon(species); return true; }
    // Minimal fallback: mark beast-form poly state without gear effects.
    u._polyself_form = { ...entry.beast };
    return true;
}

// C ref: were.c:213-229 you_unwere() — hero returns to (or remains away
// from) normal form; with purify=true the lycanthropy infection is cured
// (pray.c:515, potion.c:754 call this with TRUE).
export function youUnwere(purify, ctx = {}) {
    const g = ctx.g || game;
    const u = g?.u;
    if (!u) return false;
    if (purify) { // were.c:218-219
        if (typeof ctx.addToplineMessage === 'function')
            ctx.addToplineMessage('You feel purified.');
        setUlycn(-1, g);
    }
    const controllable = !!(u.polymorphControl || u.Polymorph_control)
        && !(u.stunned || u.unaware);
    const wantsRemain = controllable && typeof ctx.queryYNC === 'function'
        && ctx.queryYNC('Remain in beast form?');
    if (!heroUnchanging(g) && heroIsInWereForm(g) && !monsterNearby(g) && !wantsRemain) {
        if (typeof ctx.rehumanize === 'function') ctx.rehumanize();
        else u._polyself_form = null;
        return true;
    }
    if (heroIsInWereForm(g) && !(u.mtimedone || 0)) {
        u.mtimedone = rn1(200, 200); // were.c:228 — 40% of initial change
    }
    return false;
}
