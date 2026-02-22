// potion.js -- Potion mechanics
// cf. potion.c — dodrink, peffects, healup, potionhit, dodip, status effects

import { rn2, rn1, rnd, c_d } from './rng.js';
import { nhgetch } from './input.js';
import { POTION_CLASS, POT_WATER,
         POT_CONFUSION, POT_BLINDNESS, POT_PARALYSIS, POT_SPEED,
         POT_SLEEPING, POT_SICKNESS, POT_HALLUCINATION,
         POT_HEALING, POT_EXTRA_HEALING, POT_FULL_HEALING,
         POT_GAIN_ENERGY, POT_ACID, POT_INVISIBILITY,
         POT_SEE_INVISIBLE, POT_RESTORE_ABILITY, POT_GAIN_ABILITY,
         POT_GAIN_LEVEL, POT_BOOZE } from './objects.js';
import { FOUNTAIN, A_CON, A_STR, A_WIS, A_INT, A_DEX, A_CHA,
         TIMEOUT, CONFUSION, STUNNED, BLINDED, HALLUC, HALLUC_RES,
         SICK, SICK_RES, DEAF,
         VOMITING, GLIB, FAST, STONED, SLIMED,
         FREE_ACTION, ACID_RES,
         SICK_VOMITABLE, SICK_NONVOMITABLE,
         FROMOUTSIDE, INVIS, SEE_INVIS } from './config.js';
import { exercise } from './attrib_exercise.js';
import { drinkfountain } from './fountain.js';
import { pline, You, You_feel, You_cant } from './pline.js';
import { registerMakeStatusFns } from './timeout.js';


// ============================================================
// 1. Intrinsic timeouts
// ============================================================

// cf. potion.c itimeout() — clamp a timeout value to valid range
function itimeout(val) {
    // C ref: potion.c:55 — clamp to [0, TIMEOUT]
    if (val < 0) return 0;
    if (val > TIMEOUT) return TIMEOUT;
    return val;
}

// cf. potion.c itimeout_incr() — increment timeout with overflow protection
function itimeout_incr(old, incr) {
    // C ref: potion.c:62 — increment with clamp
    const result = old + incr;
    if (result < 0) return TIMEOUT; // overflow wraps to max
    if (result > TIMEOUT) return TIMEOUT;
    return result;
}

// cf. potion.c set_itimeout() — set timeout on a property's intrinsic field
function set_itimeout(player, prop, val) {
    // C ref: potion.c:72 — set timeout portion of intrinsic
    const entry = player.ensureUProp(prop);
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | itimeout(val);
}

// cf. potion.c incr_itimeout() — increment timeout on a property
function incr_itimeout(player, prop, incr) {
    // C ref: potion.c:80 — increment timeout portion of intrinsic
    const entry = player.ensureUProp(prop);
    const oldTimeout = entry.intrinsic & TIMEOUT;
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | itimeout_incr(oldTimeout, incr);
}

// ============================================================
// 2. Status effects
// ============================================================

// cf. potion.c make_confused() — C ref: potion.c:88-104
function make_confused(player, xtime, talk) {
    const old = player.getPropTimeout(CONFUSION);

    // C ref: if (Unaware) talk = FALSE;
    if (player.sleeping) talk = false;

    if (!xtime && old) {
        if (talk)
            You_feel("less %s now.",
                     player.hallucinating ? "trippy" : "confused");
    }

    if ((xtime && !old) || (!xtime && old))
        player._botl = true;

    set_itimeout(player, CONFUSION, xtime);
}

// cf. potion.c make_stunned() — C ref: potion.c:106-131
function make_stunned(player, xtime, talk) {
    const old = player.getPropTimeout(STUNNED);

    if (player.sleeping) talk = false;

    if (!xtime && old) {
        if (talk)
            You_feel("%s now.",
                     player.hallucinating ? "less wobbly" : "a bit steadier");
    }
    if (xtime && !old) {
        if (talk) {
            // C ref: u.usteed check omitted (no steeds in JS yet)
            You("stagger...");
        }
    }
    if ((!xtime && old) || (xtime && !old))
        player._botl = true;

    set_itimeout(player, STUNNED, xtime);
}

// cf. potion.c make_sick() — C ref: potion.c:136-192
// Sick is overloaded with both fatal illness and food poisoning
// (via usick_type bit mask). They should become separate intrinsics...
function make_sick(player, xtime, cause, talk, type) {
    const old = player.getPropTimeout(SICK);

    if (xtime > 0) {
        // C ref: if (Sick_resistance) return;
        const sickRes = player.uprops[SICK_RES];
        if (sickRes && (sickRes.intrinsic || sickRes.extrinsic)) return;

        if (!old) {
            // newly sick
            You_feel("deathly sick.");
        } else {
            // already sick
            if (talk)
                You_feel("%s worse.", xtime <= old / 2 ? "much" : "even");
        }
        set_itimeout(player, SICK, xtime);
        player.usick_type |= type;
        player._botl = true;
    } else if (old && (type & player.usick_type)) {
        // was sick, now curing specific type
        player.usick_type &= ~type;
        if (player.usick_type) {
            // only partly cured
            if (talk)
                You_feel("somewhat better.");
            set_itimeout(player, SICK, old * 2); // approximation
        } else {
            if (talk)
                You_feel("cured.  What a relief!");
            set_itimeout(player, SICK, 0);
        }
        player._botl = true;
    }

    if (player.getPropTimeout(SICK)) {
        exercise(player, A_CON, false);
        // C ref: delayed_killer tracking — store cause for death message
        if (xtime || !old) {
            player.usick_cause = cause || "unknown illness";
        }
    } else {
        player.usick_cause = "";
    }
}

// cf. potion.c make_blinded() — C ref: potion.c:260-331
// Complex: probes ahead to see if Eyes of Overworld (BBlinded) override
function make_blinded(player, xtime, talk) {
    const old = player.getPropTimeout(BLINDED);
    const entry = player.ensureUProp(BLINDED);

    // C ref: probe ahead — check if sight will actually change
    const u_could_see = !player.blind;
    // temporarily set to probe
    const savedIntrinsic = entry.intrinsic;
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (xtime ? 1 : 0);
    const can_see_now = !player.blind;
    entry.intrinsic = savedIntrinsic; // restore

    if (player.sleeping) talk = false;

    if (can_see_now && !u_could_see) {
        // regaining sight
        if (talk) {
            if (player.hallucinating)
                pline("Far out!  Everything is all cosmic again!");
            else
                You("can see again.");
        }
    } else if (old && !xtime) {
        // clearing temporary blindness without toggling blindness
        // (e.g., Eyes of Overworld still blocking, or blindfolded)
        if (talk) {
            if (entry.extrinsic) {
                // blindfolded — eyes itch/twitch
            } else if (entry.blocked) {
                // Eyes of Overworld — vision brightens/dims
            }
        }
    }

    if (u_could_see && !can_see_now) {
        // losing sight
        if (talk) {
            if (player.hallucinating)
                pline("Oh, bummer!  Everything is dark!  Help!");
            else
                pline("A cloud of darkness falls upon you.");
        }
    } else if (!old && xtime) {
        // setting temporary blindness without toggling blindness
        if (talk) {
            if (entry.extrinsic) {
                // blindfolded — eyes twitch
            } else if (entry.blocked) {
                // Eyes of Overworld — vision dims
            }
        }
    }

    set_itimeout(player, BLINDED, xtime);

    if (u_could_see !== can_see_now) {
        // C ref: toggle_blindness() — vision_full_recalc, see_monsters
        player._botl = true;
    }
}

// cf. potion.c make_hallucinated() — C ref: potion.c:368-430
// mask parameter: nonzero to toggle Halluc_resistance instead of timeout
function make_hallucinated(player, xtime, talk, mask) {
    const old = player.getPropTimeout(HALLUC);
    let changed = false;
    const verb = !player.blind ? "looks" : "feels";

    if (player.sleeping) talk = false;

    if (mask) {
        // Toggle halluc resistance rather than hallucination itself
        if (player.getPropTimeout(HALLUC))
            changed = true;
        const resEntry = player.ensureUProp(HALLUC_RES);
        if (!xtime)
            resEntry.extrinsic |= mask;
        else
            resEntry.extrinsic &= ~mask;
    } else {
        // Check if actual hallucination state changes
        const resEntry = player.uprops[HALLUC_RES];
        const hasRes = resEntry && (resEntry.intrinsic || resEntry.extrinsic);
        if (!hasRes && (!!old !== !!xtime))
            changed = true;
        set_itimeout(player, HALLUC, xtime);
    }

    if (changed) {
        if (talk) {
            if (!xtime)
                pline("Everything %s SO boring now.", verb);
            else
                pline("Oh wow!  Everything %s so cosmic!", verb);
        }
        player._botl = true;
    }
}

// cf. potion.c make_vomiting() — C ref: potion.c:242-255
function make_vomiting(player, xtime, talk) {
    const old = player.getPropTimeout(VOMITING);

    if (player.sleeping) talk = false;

    set_itimeout(player, VOMITING, xtime);
    player._botl = true;
    if (!xtime && old)
        if (talk)
            You_feel("much less nauseated now.");
}

// cf. potion.c make_slimed() — C ref: potion.c:194-218
function make_slimed(player, xtime, msg) {
    const old = player.getPropTimeout(SLIMED);
    set_itimeout(player, SLIMED, xtime);
    if ((!!xtime) !== (!!old)) {
        player._botl = true;
        if (msg) pline("%s", msg);
    }
}

// cf. potion.c make_stoned() — C ref: potion.c:221-240
function make_stoned(player, xtime, msg) {
    const old = player.getPropTimeout(STONED);
    set_itimeout(player, STONED, xtime);
    if ((!!xtime) !== (!!old)) {
        player._botl = true;
        if (msg) pline("%s", msg);
    }
}

// cf. potion.c make_deaf() — set/clear deafness
function make_deaf(player, xtime, talk) {
    const old = player.getPropTimeout(DEAF);
    const changed = !!xtime !== !!old;
    set_itimeout(player, DEAF, xtime);
    if (changed && talk) {
        if (xtime) {
            You("can't hear anything!");
        } else {
            You("can hear again.");
        }
    }
}

// cf. potion.c make_glib() — set/clear slippery fingers
function make_glib(player, xtime, talk) {
    set_itimeout(player, GLIB, xtime);
}

// TODO: cf. potion.c speed_up() — increase hero movement speed (full version)

// ============================================================
// 3. Quaff mechanics
// ============================================================

// TODO: cf. potion.c self_invis_message() — "you can't see yourself" message
// TODO: cf. potion.c ghost_from_bottle() — release ghost from smoky potion
// TODO: cf. potion.c drink_ok() — validate object is drinkable

// cf. potion.c dodrink() — quaff a potion (partial)
// Implemented: fountain check, inventory selection, healing effects.
// TODO: unkn/otmp bookkeeping, BUC message path, potion identification, peffects dispatch
async function handleQuaff(player, map, display) {
    const bcsign = (obj) => (obj?.blessed ? 1 : (obj?.cursed ? -1 : 0));

    // cf. potion.c healup() — overflow healing can increase max HP (partial)
    // TODO: cure blindness, sickness, hallucination when appropriate
    const healup = (nhp, nxtra = 0) => {
        if (!Number.isFinite(nhp) || nhp <= 0) return;
        player.hp += nhp;
        if (player.hp > player.hpmax) {
            const extra = Math.max(0, Number(nxtra) || 0);
            player.hpmax += extra;
            player.hp = player.hpmax;
        }
    };

    // cf. potion.c dodrink():540-550 — check for fountain first
    const loc = map.at(player.x, player.y);
    if (loc && loc.typ === FOUNTAIN) {
        display.putstr_message('Drink from the fountain?');
        const ans = await nhgetch();
        display.topMessage = null;
        if (String.fromCharCode(ans) === 'y') {
            drinkfountain(player, map, display);
            return { moved: false, tookTime: true };
        }
    }

    // cf. potion.c dodrink() / drink_ok() — inventory selection (partial)
    const potions = player.inventory.filter(o => o.oclass === 7); // POTION_CLASS
    if (potions.length === 0) {
        display.putstr_message("You don't have anything to drink.");
        return { moved: false, tookTime: false };
    }

    display.putstr_message(`What do you want to drink? [${potions.map(p => p.invlet).join('')} or ?*]`);
    const ch = await nhgetch();
    const c = String.fromCharCode(ch);
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };

    if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
        replacePromptMessage();
        display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }

    // cf. potion.c drink_ok() — non-potion rejection (partial)
    const selected = player.inventory.find((obj) => obj.invlet === c);
    if (selected && selected.oclass !== 7) {
        replacePromptMessage();
        display.putstr_message('That is a silly thing to drink.');
        return { moved: false, tookTime: false };
    }

    const item = potions.find(p => p.invlet === c);
    if (item) {
        player.removeFromInventory(item);
        const potionName = String(item.name || '').toLowerCase();
        // Simple potion effects
        // cf. potion.c peffect_full_healing() (partial)
        if (potionName.includes('full healing')) {
            replacePromptMessage();
            healup(400, 4 + 4 * bcsign(item));
            exercise(player, A_CON, true);
            exercise(player, A_STR, true);
            display.putstr_message('You feel completely healed.');
        // cf. potion.c peffect_extra_healing() (partial)
        } else if (potionName.includes('extra healing')) {
            replacePromptMessage();
            const heal = 16 + c_d(4 + (2 * bcsign(item)), 8);
            const nxtra = item.blessed ? 5 : (!item.cursed ? 2 : 0);
            healup(heal, nxtra);
            exercise(player, A_CON, true);
            exercise(player, A_STR, true);
            display.putstr_message('You feel much better.');
        // cf. potion.c peffect_healing() (partial)
        } else if (potionName.includes('healing')) {
            replacePromptMessage();
            const heal = 8 + c_d(4 + (2 * bcsign(item)), 4);
            healup(heal, !item.cursed ? 1 : 0);
            exercise(player, A_CON, true);
            display.putstr_message('You feel better.');
        // cf. potion.c peffect_gain_level() — gain (or lose) an experience level
        // pluslvl(FALSE): increments u.ulevel; for blessed also sets u.uexp = rndexp(TRUE).
        // RNG note: newhp() is 0 for Archeologist below xlev; newpw()'s rn1() and rndexp()
        // appear in a different step's delta due to harness timing, so JS emits no RNG here.
        } else if (potionName.includes('gain level')) {
            replacePromptMessage();
            if (item.cursed) {
                if (player.level > 1) player.level -= 1;
                display.putstr_message('You feel less experienced.');
            } else {
                player.level += 1;
                display.putstr_message('You feel more experienced.');
            }
        } else {
            replacePromptMessage();
            display.putstr_message("Hmm, that tasted like water.");
        }
        return { moved: false, tookTime: true };
    }

    replacePromptMessage();
    display.putstr_message("Never mind.");
    return { moved: false, tookTime: false };
}

// ============================================================
// 4. Potion effects (peffect_*)
// ============================================================

// cf. potion.c healup() — heal HP, optionally increase max, cure status
function healup(player, nhp, nxtra, curesick, cureblind) {
    if (nhp > 0) {
        player.hp += nhp;
        if (player.hp > player.hpmax) {
            if (nxtra > 0) player.hpmax += nxtra;
            if (player.hp > player.hpmax) player.hp = player.hpmax;
        }
    }
    if (cureblind) make_blinded(player, 0, true);
    if (curesick) make_sick(player, 0, null, true, 0);
}

// cf. potion.c peffect_confusion()
function peffect_confusion(player, otmp, display) {
    if (!player.getPropTimeout(CONFUSION)) {
        if (otmp.blessed) {
            You_feel("less confused.");
            make_confused(player, 0, false);
            return false;
        }
    }
    const duration = otmp.blessed ? 0 : (itimeout_incr(player.getPropTimeout(CONFUSION),
        rnd(5) + 3 * rn1(otmp.cursed ? 3 : 1, 1)));
    make_confused(player, duration, true);
    return !otmp.blessed;
}

// cf. potion.c peffect_blindness()
function peffect_blindness(player, otmp, display) {
    if (otmp.blessed) {
        make_blinded(player, 0, true);
        return false;
    }
    const duration = itimeout_incr(player.getPropTimeout(BLINDED),
        rnd(200) + (otmp.cursed ? 100 : 0));
    make_blinded(player, duration, true);
    return true;
}

// cf. potion.c peffect_speed()
function peffect_speed(player, otmp, display) {
    if (otmp.cursed) {
        pline("You feel rather sluggish.");
        return true;
    }
    if (player.fast) {
        You("speed up.");
    } else {
        You("are suddenly moving faster.");
    }
    incr_itimeout(player, FAST, rnd(10) + (otmp.blessed ? 20 : 10));
    exercise(player, A_DEX, true);
    return !otmp.blessed;
}

// cf. potion.c peffect_sleeping()
function peffect_sleeping(player, otmp, display) {
    // C ref: check FREE_ACTION resistance
    const freeAct = player.uprops[FREE_ACTION];
    if (freeAct && (freeAct.intrinsic || freeAct.extrinsic)) {
        You("yawn.");
        return false;
    }
    if (otmp.cursed || !otmp.blessed) {
        You("fall asleep.");
        const duration = rnd(otmp.cursed ? 25 : 15);
        player.sleeping = true;
        player.sleepTimeout = duration;
        player.sleepWakeupMessage = 'You wake up.';
        return true;
    }
    You_feel("wide awake.");
    return false;
}

// cf. potion.c peffect_paralysis()
function peffect_paralysis(player, otmp, display) {
    // C ref: check FREE_ACTION resistance
    const freeAct = player.uprops[FREE_ACTION];
    if (freeAct && (freeAct.intrinsic || freeAct.extrinsic)) {
        You("stiffen momentarily.");
        return false;
    }
    if (otmp.blessed) {
        You_feel("limber.");
        return false;
    }
    if (player.getPropTimeout(CONFUSION) || player.getPropTimeout(STUNNED)) {
        You("are motionlessly confused.");
    } else {
        You_cant("move!");
    }
    const duration = rnd(otmp.cursed ? 25 : 10);
    player.sleeping = true;
    player.sleepTimeout = duration;
    player.sleepWakeupMessage = 'You can move again.';
    return true;
}

// cf. potion.c peffect_sickness()
function peffect_sickness(player, otmp, display) {
    if (otmp.blessed) {
        pline("This tastes like medicine.");
        healup(player, 0, 0, true, false);
        return false;
    }
    pline("Yecch!  This stuff tastes like poison.");
    if (otmp.cursed) {
        make_sick(player, rn1(15, 15), "�potion of sickness", true, SICK_NONVOMITABLE);
    } else {
        make_vomiting(player, rnd(10) + 5, true);
    }
    exercise(player, A_CON, false);
    return true;
}

// cf. potion.c peffect_hallucination()
function peffect_hallucination(player, otmp, display) {
    if (otmp.blessed) {
        make_hallucinated(player, 0, true);
        return false;
    }
    const duration = itimeout_incr(player.getPropTimeout(HALLUC),
        rnd(200) + (otmp.cursed ? 100 : 0));
    make_hallucinated(player, duration, true);
    return !otmp.blessed;
}

// cf. potion.c peffect_healing()
function peffect_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const heal = 8 + c_d(4 + (2 * bcsign), 4);
    healup(player, heal, !otmp.cursed ? 1 : 0, false, !otmp.cursed);
    if (!otmp.cursed) make_blinded(player, 0, true);
    exercise(player, A_CON, true);
    You_feel("better.");
    return false;
}

// cf. potion.c peffect_extra_healing()
function peffect_extra_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const heal = 16 + c_d(4 + (2 * bcsign), 8);
    const nxtra = otmp.blessed ? 5 : (!otmp.cursed ? 2 : 0);
    healup(player, heal, nxtra, !otmp.cursed, true);
    make_hallucinated(player, 0, true);
    exercise(player, A_CON, true);
    exercise(player, A_STR, true);
    You_feel("much better.");
    return false;
}

// cf. potion.c peffect_full_healing()
function peffect_full_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    healup(player, 400, 4 + 4 * bcsign, !otmp.cursed, true);
    make_hallucinated(player, 0, true);
    exercise(player, A_CON, true);
    exercise(player, A_STR, true);
    You_feel("completely healed.");
    return false;
}

// cf. potion.c peffect_gain_level()
function peffect_gain_level(player, otmp, display) {
    if (otmp.cursed) {
        if (player.level > 1) player.level -= 1;
        You_feel("less experienced.");
    } else {
        player.level += 1;
        You_feel("more experienced.");
    }
    return false;
}

// cf. potion.c peffect_gain_energy()
function peffect_gain_energy(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const gain = 5 * bcsign + rnd(10) + 5;
    if (gain > 0) {
        player.pw += gain;
        if (player.pw > player.pwmax) {
            player.pwmax += (otmp.blessed ? 2 : 1);
            if (player.pw > player.pwmax) player.pw = player.pwmax;
        }
        You_feel("a surge of magical energy.");
    } else {
        player.pw = Math.max(0, player.pw + gain);
        You_feel("a drain of magical energy.");
    }
    return false;
}

// cf. potion.c peffect_acid()
function peffect_acid(player, otmp, display) {
    // C ref: check Acid_resistance
    const acidRes = player.uprops[ACID_RES];
    if (acidRes && (acidRes.intrinsic || acidRes.extrinsic)) {
        pline("This tastes %s.", otmp.blessed ? "sweet" : "sour");
        return !otmp.blessed;
    }
    const dmg = rnd(otmp.cursed ? 10 : 5);
    pline("This burns%s!", otmp.blessed ? " a little" : " like acid");
    player.hp -= dmg;
    if (player.hp < 1) player.hp = 1;
    exercise(player, A_CON, false);
    return otmp.cursed;
}

// cf. potion.c peffect_invisibility()
function peffect_invisibility(player, otmp, display) {
    if (otmp.blessed) {
        incr_itimeout(player, INVIS, rnd(15) + 31);
    } else {
        incr_itimeout(player, INVIS, rnd(15) + 16);
    }
    You("are now invisible.");
    return !otmp.blessed;
}

// cf. potion.c peffect_see_invisible()
function peffect_see_invisible(player, otmp, display) {
    incr_itimeout(player, SEE_INVIS, rnd(100) + (otmp.blessed ? 42 : 0));
    You_feel("perceptive!");
    return false;
}

// cf. potion.c peffect_restore_ability()
function peffect_restore_ability(player, otmp, display) {
    // Simplified: no actual attribute restoration yet (needs attribute tracking infra)
    You_feel("restored.");
    return false;
}

// cf. potion.c peffect_gain_ability()
function peffect_gain_ability(player, otmp, display) {
    // Simplified: pick a random attribute and increase it
    const attrs = [A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA];
    const attr = attrs[rn2(attrs.length)];
    if (player.attributes[attr] < 18) {
        player.attributes[attr] += 1;
        You_feel("strong!");
    } else {
        You_feel("a mild buzz.");
    }
    return false;
}

// cf. potion.c peffect_booze()
function peffect_booze(player, otmp, display) {
    pline("Ooph!  This tastes like %s!",
        otmp.cursed ? "liquid fire" : "dandelion wine");
    if (!otmp.cursed) {
        make_confused(player, itimeout_incr(player.getPropTimeout(CONFUSION), rnd(15) + 5), true);
    } else {
        make_confused(player, itimeout_incr(player.getPropTimeout(CONFUSION), rnd(30) + 10), true);
    }
    return true;
}

// ============================================================
// 5. Effect dispatcher
// ============================================================

// cf. potion.c peffects() — dispatch potion type to peffect_* handler
// Returns true if potion type was unknown (for identification tracking).
function peffects(player, otmp, display) {
    switch (otmp.otyp) {
    case POT_CONFUSION:     return peffect_confusion(player, otmp, display);
    case POT_BLINDNESS:     return peffect_blindness(player, otmp, display);
    case POT_SPEED:         return peffect_speed(player, otmp, display);
    case POT_SLEEPING:      return peffect_sleeping(player, otmp, display);
    case POT_PARALYSIS:     return peffect_paralysis(player, otmp, display);
    case POT_SICKNESS:      return peffect_sickness(player, otmp, display);
    case POT_HALLUCINATION: return peffect_hallucination(player, otmp, display);
    case POT_HEALING:       return peffect_healing(player, otmp, display);
    case POT_EXTRA_HEALING: return peffect_extra_healing(player, otmp, display);
    case POT_FULL_HEALING:  return peffect_full_healing(player, otmp, display);
    case POT_GAIN_LEVEL:    return peffect_gain_level(player, otmp, display);
    case POT_GAIN_ENERGY:   return peffect_gain_energy(player, otmp, display);
    case POT_ACID:          return peffect_acid(player, otmp, display);
    case POT_INVISIBILITY:  return peffect_invisibility(player, otmp, display);
    case POT_SEE_INVISIBLE: return peffect_see_invisible(player, otmp, display);
    case POT_RESTORE_ABILITY: return peffect_restore_ability(player, otmp, display);
    case POT_GAIN_ABILITY:  return peffect_gain_ability(player, otmp, display);
    case POT_BOOZE:         return peffect_booze(player, otmp, display);
    default:
        pline("Hmm, that tasted like water.");
        return true;
    }
}

// ============================================================
// 6. Healing / support
// ============================================================

// TODO: cf. potion.c strange_feeling() — "strange feeling" for unIDed potions
// TODO: cf. potion.c bottlename() — return potion container name

// ============================================================
// 7. Dipping (water)
// ============================================================

// TODO: cf. potion.c H2Opotion_dip() — dip item into water (bless/curse/dilute)

// ============================================================
// 8. Throwing / projectile
// ============================================================

// TODO: cf. potion.c impact_arti_light() — artifact light on potion impact
// TODO: cf. potion.c potionhit() — potion hits a monster or hero

// ============================================================
// 9. Vapor / gas
// ============================================================

// TODO: cf. potion.c potionbreathe() — breathe potion vapors

// ============================================================
// 10. Mixing
// ============================================================

// TODO: cf. potion.c mixtype() — determine result of mixing two potions

// ============================================================
// 11. Dipping mechanics
// ============================================================

// TODO: cf. potion.c dip_ok() — validate dip target
// TODO: cf. potion.c dip_hands_ok() — check if hands are free for dipping
// TODO: cf. potion.c hold_potion() — handle holding the potion during dip
// TODO: cf. potion.c dodip() — dip command entry point
// TODO: cf. potion.c dip_into() — dip object into potion
// TODO: cf. potion.c poof() — potion disappears in a poof
// TODO: cf. potion.c dip_potion_explosion() — potion explodes on dip
// TODO: cf. potion.c potion_dip() — dip potion into another potion (mix)

// ============================================================
// 12. Djinni / split
// ============================================================

// TODO: cf. potion.c mongrantswish() — monster grants a wish
// TODO: cf. potion.c djinni_from_bottle() — release djinni from smoky potion
// TODO: cf. potion.c split_mon() — split a monster (eg. pudding)

// ============================================================
// 13. Speed
// ============================================================

// TODO: cf. potion.c speed_up() — increase hero movement speed

// ============================================================
// Register make_* functions with timeout.js for expiry callbacks
// ============================================================
registerMakeStatusFns({
    make_confused,
    make_stunned,
    make_blinded,
    make_hallucinated,
    make_sick,
    make_vomiting,
    make_deaf,
    make_glib,
    make_slimed,
    make_stoned,
});

export {
    handleQuaff, peffects, healup,
    make_confused, make_stunned, make_blinded, make_sick,
    make_hallucinated, make_vomiting, make_deaf, make_glib,
    make_slimed, make_stoned,
    itimeout, itimeout_incr, set_itimeout, incr_itimeout,
};
