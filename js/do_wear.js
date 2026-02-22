// do_wear.js -- Armor wearing/removing mechanics
// cf. do_wear.c — dowear, doputon, dotakeoff, doremring, doddoremarm, find_ac

import { nhgetch } from './input.js';
import { ARMOR_CLASS, RING_CLASS, AMULET_CLASS, objectData,
         ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK, ARM_SHIRT,
         SPEED_BOOTS, ELVEN_BOOTS, LEVITATION_BOOTS, FUMBLE_BOOTS,
         ELVEN_CLOAK, CLOAK_OF_PROTECTION, CLOAK_OF_INVISIBILITY,
         CLOAK_OF_MAGIC_RESISTANCE, CLOAK_OF_DISPLACEMENT,
         HELM_OF_BRILLIANCE, HELM_OF_TELEPATHY, DUNCE_CAP,
         GAUNTLETS_OF_FUMBLING, GAUNTLETS_OF_POWER, GAUNTLETS_OF_DEXTERITY,
         RIN_ADORNMENT,
         RIN_GAIN_STRENGTH, RIN_GAIN_CONSTITUTION,
         RIN_INCREASE_ACCURACY, RIN_INCREASE_DAMAGE,
         RIN_PROTECTION, RIN_REGENERATION, RIN_SEARCHING,
         RIN_STEALTH, RIN_SUSTAIN_ABILITY, RIN_LEVITATION,
         RIN_HUNGER, RIN_AGGRAVATE_MONSTER, RIN_CONFLICT, RIN_WARNING,
         RIN_POISON_RESISTANCE, RIN_FIRE_RESISTANCE, RIN_COLD_RESISTANCE,
         RIN_SHOCK_RESISTANCE, RIN_FREE_ACTION, RIN_SLOW_DIGESTION,
         RIN_TELEPORTATION, RIN_TELEPORT_CONTROL,
         RIN_POLYMORPH, RIN_POLYMORPH_CONTROL,
         RIN_INVISIBILITY, RIN_SEE_INVISIBLE,
         RIN_PROTECTION_FROM_SHAPE_CHAN,
         AMULET_OF_STRANGULATION, AMULET_OF_CHANGE, AMULET_OF_RESTFUL_SLEEP,
         AMULET_OF_UNCHANGING, AMULET_OF_FLYING, AMULET_OF_REFLECTION,
         AMULET_OF_MAGICAL_BREATHING, AMULET_OF_GUARDING,
         AMULET_OF_ESP, AMULET_OF_LIFE_SAVING, AMULET_VERSUS_POISON } from './objects.js';
import { doname } from './mkobj.js';
import { discoverObject } from './discovery.js';
import { pline, You, You_feel } from './pline.js';
import { rnd } from './rng.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         FAST, STEALTH, FUMBLING, LEVITATION, INVIS, SEE_INVIS,
         DISPLACED, TELEPAT, PROTECTION, REGENERATION, SEARCHING,
         FIXED_ABIL, REFLECTING, LIFESAVED, FLYING, UNCHANGING,
         MAGICAL_BREATHING, STRANGLED, SLEEPING,
         HUNGER, AGGRAVATE_MONSTER, CONFLICT, WARNING,
         POISON_RES, FIRE_RES, COLD_RES, SHOCK_RES,
         FREE_ACTION, SLOW_DIGESTION,
         TELEPORT, TELEPORT_CONTROL, POLYMORPH, POLYMORPH_CONTROL,
         PROT_FROM_SHAPE_CHANGERS,
         TIMEOUT } from './config.js';
import { set_itimeout, incr_itimeout } from './potion.js';


// ============================================================
// 1. Armor slot mapping
// ============================================================

const ARMOR_SLOTS = {
    [ARM_SUIT]:   { prop: 'armor',   name: 'body armor' },
    [ARM_SHIELD]: { prop: 'shield',  name: 'shield' },
    [ARM_HELM]:   { prop: 'helmet',  name: 'helmet' },
    [ARM_GLOVES]: { prop: 'gloves',  name: 'gloves' },
    [ARM_BOOTS]:  { prop: 'boots',   name: 'boots' },
    [ARM_CLOAK]:  { prop: 'cloak',   name: 'cloak' },
    [ARM_SHIRT]:  { prop: 'shirt',   name: 'shirt' },
};

// ============================================================
// 2. Slot on/off effect stubs (hook points for future intrinsic effects)
// ============================================================

// TODO: cf. do_wear.c fingers_or_gloves() — "fingers" or "gloves" depending on worn gloves
// TODO: cf. do_wear.c off_msg() — message when taking off an item
// TODO: cf. do_wear.c on_msg() — message when putting on an item

// C ref: makeknown(otyp) — discover an object type
function makeknown(otyp) {
    discoverObject(otyp, true, true);
}

// Helper: toggle stealth — C ref: do_wear.c toggle_stealth()
function toggle_stealth(player, on) {
    const entry = player.ensureUProp(STEALTH);
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
}

// Helper: toggle displacement — C ref: do_wear.c toggle_displacement()
function toggle_displacement(player, on) {
    const entry = player.ensureUProp(DISPLACED);
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
}

// Helper: adjust a single extrinsic flag by +1 or -1
function toggle_extrinsic(player, prop, on) {
    const entry = player.ensureUProp(prop);
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
}

// cf. do_wear.c Boots_on() — C ref: do_wear.c:186-260
function Boots_on(player) {
    if (!player || !player.boots) return;
    const otyp = player.boots.otyp;
    const oldprop = player.uprops[FAST]?.extrinsic || 0;

    switch (otyp) {
    case SPEED_BOOTS:
        toggle_extrinsic(player, FAST, true);
        // C ref: if (!oldprop && !(HFast & TIMEOUT)) { makeknown(); message }
        if (!oldprop && !(player.getPropTimeout(FAST))) {
            makeknown(otyp);
            You_feel("yourself speed up%s.",
                     player.fast ? " a bit more" : "");
        }
        break;
    case ELVEN_BOOTS:
        toggle_stealth(player, true);
        break;
    case FUMBLE_BOOTS:
        toggle_extrinsic(player, FUMBLING, true);
        // C ref: if (!oldprop && !(HFumbling & ~TIMEOUT))
        //     incr_itimeout(&HFumbling, rnd(20));
        if (!(player.getPropTimeout(FUMBLING)))
            incr_itimeout(player, FUMBLING, rnd(20));
        break;
    case LEVITATION_BOOTS:
        toggle_extrinsic(player, LEVITATION, true);
        // C ref: if (!oldprop && !HLevitation && !(BLevitation & FROMOUTSIDE))
        //     makeknown(otyp); float_up();
        makeknown(otyp);
        break;
    }
    // C ref: uarmf->known = 1 (boots +/- evident from AC)
    if (player.boots) player.boots.known = true;
}

// cf. do_wear.c Boots_off() — C ref: do_wear.c:262-330
function Boots_off(player) {
    if (!player || !player.boots) return;
    const otyp = player.boots.otyp;

    switch (otyp) {
    case SPEED_BOOTS:
        toggle_extrinsic(player, FAST, false);
        // C ref: if (!Very_fast) { makeknown(otyp); message }
        if (!player.veryFast) {
            makeknown(otyp);
            You_feel("yourself slow down%s.",
                     player.fast ? " a bit" : "");
        }
        break;
    case ELVEN_BOOTS:
        toggle_stealth(player, false);
        break;
    case FUMBLE_BOOTS:
        toggle_extrinsic(player, FUMBLING, false);
        // C ref: if (!oldprop && !(HFumbling & ~TIMEOUT))
        //     HFumbling = EFumbling = 0;
        {
            const entry = player.uprops[FUMBLING];
            if (entry && !entry.extrinsic) {
                entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            }
        }
        break;
    case LEVITATION_BOOTS:
        toggle_extrinsic(player, LEVITATION, false);
        // C ref: float_down(0L, 0L); makeknown(otyp);
        makeknown(otyp);
        break;
    }
}

// cf. do_wear.c Cloak_on() — C ref: do_wear.c:332-390
function Cloak_on(player) {
    if (!player || !player.cloak) return;
    const otyp = player.cloak.otyp;
    switch (otyp) {
    case ELVEN_CLOAK:
        toggle_stealth(player, true);
        break;
    case CLOAK_OF_DISPLACEMENT:
        toggle_displacement(player, true);
        break;
    case CLOAK_OF_INVISIBILITY:
        toggle_extrinsic(player, INVIS, true);
        if (!player.blind) {
            makeknown(otyp);
        }
        break;
    case CLOAK_OF_MAGIC_RESISTANCE:
        // Magic resistance is passive — no uprops tracking needed yet
        break;
    case CLOAK_OF_PROTECTION:
        // C ref: makeknown(uarmc->otyp);
        makeknown(otyp);
        break;
    }
    if (player.cloak && !player.cloak.known) {
        player.cloak.known = true;
    }
}

// cf. do_wear.c Cloak_off() — C ref: do_wear.c:392-430
function Cloak_off(player) {
    if (!player || !player.cloak) return;
    const otyp = player.cloak.otyp;
    switch (otyp) {
    case ELVEN_CLOAK:
        toggle_stealth(player, false);
        break;
    case CLOAK_OF_DISPLACEMENT:
        toggle_displacement(player, false);
        break;
    case CLOAK_OF_INVISIBILITY:
        toggle_extrinsic(player, INVIS, false);
        if (!player.blind) {
            makeknown(otyp);
        }
        break;
    case CLOAK_OF_MAGIC_RESISTANCE:
        break;
    case CLOAK_OF_PROTECTION:
        break;
    }
}

// cf. do_wear.c Helmet_on() — C ref: do_wear.c:432-490
function Helmet_on(player) {
    if (!player || !player.helmet) return;
    const otyp = player.helmet.otyp;
    switch (otyp) {
    case HELM_OF_BRILLIANCE:
        // Adjust INT and WIS by spe
        adj_abon(player, player.helmet, A_INT, player.helmet.spe || 0);
        adj_abon(player, player.helmet, A_WIS, player.helmet.spe || 0);
        break;
    case HELM_OF_TELEPATHY:
        toggle_extrinsic(player, TELEPAT, true);
        break;
    case DUNCE_CAP:
        // Reduce INT and WIS
        adj_abon(player, player.helmet, A_INT, -(player.helmet.spe || 1));
        adj_abon(player, player.helmet, A_WIS, -(player.helmet.spe || 1));
        break;
    }
}

// cf. do_wear.c Helmet_off() — C ref: do_wear.c:492-540
function Helmet_off(player) {
    if (!player || !player.helmet) return;
    const otyp = player.helmet.otyp;
    switch (otyp) {
    case HELM_OF_BRILLIANCE:
        adj_abon(player, player.helmet, A_INT, -(player.helmet.spe || 0));
        adj_abon(player, player.helmet, A_WIS, -(player.helmet.spe || 0));
        break;
    case HELM_OF_TELEPATHY:
        toggle_extrinsic(player, TELEPAT, false);
        break;
    case DUNCE_CAP:
        adj_abon(player, player.helmet, A_INT, (player.helmet.spe || 1));
        adj_abon(player, player.helmet, A_WIS, (player.helmet.spe || 1));
        break;
    }
}
// TODO: cf. do_wear.c hard_helmet() — check if helmet is hard (non-cloth)

// cf. do_wear.c Gloves_on() — C ref: do_wear.c:542-590
function Gloves_on(player) {
    if (!player || !player.gloves) return;
    const otyp = player.gloves.otyp;
    switch (otyp) {
    case GAUNTLETS_OF_FUMBLING:
        toggle_extrinsic(player, FUMBLING, true);
        if (!(player.getPropTimeout(FUMBLING)))
            incr_itimeout(player, FUMBLING, rnd(20));
        break;
    case GAUNTLETS_OF_POWER:
        // C ref: makeknown(otyp); botl = TRUE;
        // STR becomes 25 while wearing — store old value
        makeknown(otyp);
        player._savedStr = player.attributes[A_STR];
        player.attributes[A_STR] = 25;
        break;
    case GAUNTLETS_OF_DEXTERITY:
        adj_abon(player, player.gloves, A_DEX, player.gloves.spe || 0);
        break;
    }
    if (player.gloves && !player.gloves.known) {
        player.gloves.known = true;
    }
}

// cf. do_wear.c Gloves_off() — C ref: do_wear.c:592-640
function Gloves_off(player) {
    if (!player || !player.gloves) return;
    const otyp = player.gloves.otyp;
    switch (otyp) {
    case GAUNTLETS_OF_FUMBLING:
        toggle_extrinsic(player, FUMBLING, false);
        // C ref: clear fumbling if no other source
        {
            const entry = player.uprops[FUMBLING];
            if (entry && !entry.extrinsic) {
                entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            }
        }
        break;
    case GAUNTLETS_OF_POWER:
        // Restore old STR
        if (player._savedStr !== undefined) {
            player.attributes[A_STR] = player._savedStr;
            delete player._savedStr;
        }
        break;
    case GAUNTLETS_OF_DEXTERITY:
        adj_abon(player, player.gloves, A_DEX, -(player.gloves.spe || 0));
        break;
    }
}
// TODO: cf. do_wear.c wielding_corpse() — check if wielding a corpse (glove interaction)

// cf. do_wear.c Shield_on/off — mostly no-ops in C
function Shield_on(player) {}
function Shield_off(player) {}

// cf. do_wear.c Shirt_on/off — mostly no-ops in C
function Shirt_on(player) {}
function Shirt_off(player) {}

// cf. do_wear.c Armor_on/off (body armor / suit) — mostly no-ops in C
function Armor_on(player) {}
function Armor_off(player) {}
// TODO: cf. do_wear.c Armor_gone() — handle armor being destroyed while worn
// TODO: cf. do_wear.c dragon_armor_handling() — handle dragon scale mail transformation

// cf. do_wear.c Amulet_on() — C ref: do_wear.c:1100-1235
function Amulet_on(player) {
    if (!player || !player.amulet) return;
    const otyp = player.amulet.otyp;
    switch (otyp) {
    case AMULET_OF_ESP:
        toggle_extrinsic(player, TELEPAT, true);
        break;
    case AMULET_OF_LIFE_SAVING:
        toggle_extrinsic(player, LIFESAVED, true);
        break;
    case AMULET_OF_STRANGULATION:
        // Start strangulation timer
        toggle_extrinsic(player, STRANGLED, true);
        pline("It constricts your throat!");
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        toggle_extrinsic(player, SLEEPING, true);
        break;
    case AMULET_VERSUS_POISON:
        // Passive poison resistance — tracked via extrinsic
        break;
    case AMULET_OF_CHANGE:
        // Gender swap — simplified
        player.gender = player.gender === 0 ? 1 : 0;
        pline("You are suddenly very %s!", player.gender === 0 ? "masculine" : "feminine");
        break;
    case AMULET_OF_UNCHANGING:
        toggle_extrinsic(player, UNCHANGING, true);
        break;
    case AMULET_OF_REFLECTION:
        toggle_extrinsic(player, REFLECTING, true);
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        toggle_extrinsic(player, MAGICAL_BREATHING, true);
        break;
    case AMULET_OF_GUARDING:
        // AC bonus handled by find_ac()
        break;
    case AMULET_OF_FLYING:
        toggle_extrinsic(player, FLYING, true);
        break;
    }
}

// cf. do_wear.c Amulet_off() — C ref: do_wear.c:1237-1300
function Amulet_off(player) {
    if (!player || !player.amulet) return;
    const otyp = player.amulet.otyp;
    switch (otyp) {
    case AMULET_OF_ESP:
        toggle_extrinsic(player, TELEPAT, false);
        break;
    case AMULET_OF_LIFE_SAVING:
        toggle_extrinsic(player, LIFESAVED, false);
        break;
    case AMULET_OF_STRANGULATION:
        toggle_extrinsic(player, STRANGLED, false);
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        toggle_extrinsic(player, SLEEPING, false);
        break;
    case AMULET_OF_UNCHANGING:
        toggle_extrinsic(player, UNCHANGING, false);
        break;
    case AMULET_OF_REFLECTION:
        toggle_extrinsic(player, REFLECTING, false);
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        toggle_extrinsic(player, MAGICAL_BREATHING, false);
        break;
    case AMULET_OF_GUARDING:
        break;
    case AMULET_OF_FLYING:
        toggle_extrinsic(player, FLYING, false);
        break;
    }
}

// Helper: adjust attribute bonus — C ref: do_wear.c adj_abon()
function adj_abon(player, obj, attr, delta) {
    if (!delta) return;
    player.attributes[attr] = Math.max(3, Math.min(25, player.attributes[attr] + delta));
}

// Helper: learn ring type from wearing effects — C ref: do_wear.c learnring()
function learnring(obj, _seen) {
    if (obj) obj.known = true;
}

// C ref: objects[].oc_oprop — maps ring otyp to property index
// Used for oldprop check: was property already active from another source?
const RING_OPROP_MAP = {
    [RIN_TELEPORTATION]: TELEPORT, [RIN_REGENERATION]: REGENERATION,
    [RIN_SEARCHING]: SEARCHING, [RIN_HUNGER]: HUNGER,
    [RIN_AGGRAVATE_MONSTER]: AGGRAVATE_MONSTER,
    [RIN_POISON_RESISTANCE]: POISON_RES, [RIN_FIRE_RESISTANCE]: FIRE_RES,
    [RIN_COLD_RESISTANCE]: COLD_RES, [RIN_SHOCK_RESISTANCE]: SHOCK_RES,
    [RIN_CONFLICT]: CONFLICT, [RIN_TELEPORT_CONTROL]: TELEPORT_CONTROL,
    [RIN_POLYMORPH]: POLYMORPH, [RIN_POLYMORPH_CONTROL]: POLYMORPH_CONTROL,
    [RIN_FREE_ACTION]: FREE_ACTION, [RIN_SLOW_DIGESTION]: SLOW_DIGESTION,
    [RIN_SUSTAIN_ABILITY]: FIXED_ABIL, [RIN_STEALTH]: STEALTH,
    [RIN_WARNING]: WARNING, [RIN_SEE_INVISIBLE]: SEE_INVIS,
    [RIN_INVISIBILITY]: INVIS, [RIN_LEVITATION]: LEVITATION,
    [RIN_PROTECTION]: PROTECTION,
    [RIN_PROTECTION_FROM_SHAPE_CHAN]: PROT_FROM_SHAPE_CHANGERS,
};

// cf. do_wear.c Ring_on() — C ref: do_wear.c:1237-1340
// Matches C's exact switch structure. Most rings are passive extrinsic
// toggles handled by toggle_extrinsic; special cases get additional logic.
function Ring_on(player, ring) {
    if (!player) return;
    const r = ring || player.leftRing || player.rightRing;
    if (!r) return;
    const otyp = r.otyp;

    // C ref: oldprop = u.uprops[objects[obj->otyp].oc_oprop].extrinsic
    // Check if property was already active before this ring.
    // Uses RING_OPROP_MAP since JS objects.js lacks oc_oprop field.
    const oprop = RING_OPROP_MAP[otyp];
    const oldprop = oprop !== undefined
        ? (player.uprops[oprop]?.extrinsic || 0) : 0;

    switch (otyp) {
    // Passive extrinsic toggles — C just breaks (handled by setworn bitmask)
    // In JS we explicitly toggle the extrinsic
    case RIN_TELEPORTATION:
        toggle_extrinsic(player, TELEPORT, true);
        break;
    case RIN_REGENERATION:
        toggle_extrinsic(player, REGENERATION, true);
        break;
    case RIN_SEARCHING:
        toggle_extrinsic(player, SEARCHING, true);
        break;
    case RIN_HUNGER:
        toggle_extrinsic(player, HUNGER, true);
        break;
    case RIN_AGGRAVATE_MONSTER:
        toggle_extrinsic(player, AGGRAVATE_MONSTER, true);
        break;
    case RIN_POISON_RESISTANCE:
        toggle_extrinsic(player, POISON_RES, true);
        break;
    case RIN_FIRE_RESISTANCE:
        toggle_extrinsic(player, FIRE_RES, true);
        break;
    case RIN_COLD_RESISTANCE:
        toggle_extrinsic(player, COLD_RES, true);
        break;
    case RIN_SHOCK_RESISTANCE:
        toggle_extrinsic(player, SHOCK_RES, true);
        break;
    case RIN_CONFLICT:
        toggle_extrinsic(player, CONFLICT, true);
        break;
    case RIN_TELEPORT_CONTROL:
        toggle_extrinsic(player, TELEPORT_CONTROL, true);
        break;
    case RIN_POLYMORPH:
        toggle_extrinsic(player, POLYMORPH, true);
        break;
    case RIN_POLYMORPH_CONTROL:
        toggle_extrinsic(player, POLYMORPH_CONTROL, true);
        break;
    case RIN_FREE_ACTION:
        toggle_extrinsic(player, FREE_ACTION, true);
        break;
    case RIN_SLOW_DIGESTION:
        toggle_extrinsic(player, SLOW_DIGESTION, true);
        break;
    case RIN_SUSTAIN_ABILITY:
        toggle_extrinsic(player, FIXED_ABIL, true);
        break;

    // Special cases with messages/effects
    case RIN_STEALTH:
        toggle_stealth(player, true);
        break;
    case RIN_WARNING:
        toggle_extrinsic(player, WARNING, true);
        // C ref: see_monsters();
        break;
    case RIN_SEE_INVISIBLE:
        toggle_extrinsic(player, SEE_INVIS, true);
        // C ref: set_mimic_blocking(); see_monsters();
        if (!oldprop && !player.blind) {
            // C ref: "Suddenly you are transparent, but there!"
            learnring(r, true);
        }
        break;
    case RIN_INVISIBILITY:
        toggle_extrinsic(player, INVIS, true);
        if (!oldprop && !player.blind) {
            learnring(r, true);
            // C ref: self_invis_message()
        }
        break;
    case RIN_LEVITATION:
        toggle_extrinsic(player, LEVITATION, true);
        if (!oldprop) {
            // C ref: float_up(); learnring(obj, TRUE);
            learnring(r, true);
        }
        break;
    case RIN_GAIN_STRENGTH:
        adj_abon(player, r, A_STR, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_GAIN_CONSTITUTION:
        adj_abon(player, r, A_CON, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_ADORNMENT:
        adj_abon(player, r, A_CHA, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_INCREASE_ACCURACY:
        player.uhitinc = (player.uhitinc || 0) + (r.spe || 0);
        break;
    case RIN_INCREASE_DAMAGE:
        player.udaminc = (player.udaminc || 0) + (r.spe || 0);
        break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        toggle_extrinsic(player, PROT_FROM_SHAPE_CHANGERS, true);
        break;
    case RIN_PROTECTION:
        toggle_extrinsic(player, PROTECTION, true);
        learnring(r, (r.spe || 0) !== 0);
        if (r.spe) find_ac(player);
        break;
    }
}

// cf. do_wear.c Ring_off_or_gone() — C ref: do_wear.c:1345-1441
function Ring_off(player, ring) {
    if (!player || !ring) return;
    const otyp = ring.otyp;

    switch (otyp) {
    case RIN_TELEPORTATION:
        toggle_extrinsic(player, TELEPORT, false);
        break;
    case RIN_REGENERATION:
        toggle_extrinsic(player, REGENERATION, false);
        break;
    case RIN_SEARCHING:
        toggle_extrinsic(player, SEARCHING, false);
        break;
    case RIN_HUNGER:
        toggle_extrinsic(player, HUNGER, false);
        break;
    case RIN_AGGRAVATE_MONSTER:
        toggle_extrinsic(player, AGGRAVATE_MONSTER, false);
        break;
    case RIN_POISON_RESISTANCE:
        toggle_extrinsic(player, POISON_RES, false);
        break;
    case RIN_FIRE_RESISTANCE:
        toggle_extrinsic(player, FIRE_RES, false);
        break;
    case RIN_COLD_RESISTANCE:
        toggle_extrinsic(player, COLD_RES, false);
        break;
    case RIN_SHOCK_RESISTANCE:
        toggle_extrinsic(player, SHOCK_RES, false);
        break;
    case RIN_CONFLICT:
        toggle_extrinsic(player, CONFLICT, false);
        break;
    case RIN_TELEPORT_CONTROL:
        toggle_extrinsic(player, TELEPORT_CONTROL, false);
        break;
    case RIN_POLYMORPH:
        toggle_extrinsic(player, POLYMORPH, false);
        break;
    case RIN_POLYMORPH_CONTROL:
        toggle_extrinsic(player, POLYMORPH_CONTROL, false);
        break;
    case RIN_FREE_ACTION:
        toggle_extrinsic(player, FREE_ACTION, false);
        break;
    case RIN_SLOW_DIGESTION:
        toggle_extrinsic(player, SLOW_DIGESTION, false);
        break;
    case RIN_SUSTAIN_ABILITY:
        toggle_extrinsic(player, FIXED_ABIL, false);
        break;
    case RIN_STEALTH:
        toggle_stealth(player, false);
        break;
    case RIN_WARNING:
        toggle_extrinsic(player, WARNING, false);
        break;
    case RIN_SEE_INVISIBLE:
        toggle_extrinsic(player, SEE_INVIS, false);
        if (!player.blind) {
            learnring(ring, true);
        }
        break;
    case RIN_INVISIBILITY:
        toggle_extrinsic(player, INVIS, false);
        if (!player.blind) {
            learnring(ring, true);
        }
        break;
    case RIN_LEVITATION:
        toggle_extrinsic(player, LEVITATION, false);
        // C ref: float_down(0L, 0L);
        learnring(ring, true);
        break;
    case RIN_GAIN_STRENGTH:
        adj_abon(player, ring, A_STR, -(ring.spe || 0));
        break;
    case RIN_GAIN_CONSTITUTION:
        adj_abon(player, ring, A_CON, -(ring.spe || 0));
        break;
    case RIN_ADORNMENT:
        adj_abon(player, ring, A_CHA, -(ring.spe || 0));
        break;
    case RIN_INCREASE_ACCURACY:
        player.uhitinc = (player.uhitinc || 0) - (ring.spe || 0);
        break;
    case RIN_INCREASE_DAMAGE:
        player.udaminc = (player.udaminc || 0) - (ring.spe || 0);
        break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        toggle_extrinsic(player, PROT_FROM_SHAPE_CHANGERS, false);
        break;
    case RIN_PROTECTION:
        toggle_extrinsic(player, PROTECTION, false);
        learnring(ring, (ring.spe || 0) !== 0);
        if (ring.spe) find_ac(player);
        break;
    }
}

// TODO: cf. do_wear.c Blindf_on() — apply effects when wearing a blindfold/towel
// TODO: cf. do_wear.c Blindf_off() — remove effects when taking off a blindfold/towel

const SLOT_ON = {
    [ARM_SUIT]: Armor_on,
    [ARM_SHIELD]: Shield_on,
    [ARM_HELM]: Helmet_on,
    [ARM_GLOVES]: Gloves_on,
    [ARM_BOOTS]: Boots_on,
    [ARM_CLOAK]: Cloak_on,
    [ARM_SHIRT]: Shirt_on,
};

const SLOT_OFF = {
    [ARM_SUIT]: Armor_off,
    [ARM_SHIELD]: Shield_off,
    [ARM_HELM]: Helmet_off,
    [ARM_GLOVES]: Gloves_off,
    [ARM_BOOTS]: Boots_off,
    [ARM_CLOAK]: Cloak_off,
    [ARM_SHIRT]: Shirt_off,
};


// ============================================================
// 3. Validation functions
// ============================================================

// cf. do_wear.c canwearobj() — check if player can wear this armor piece
function canwearobj(player, obj, display) {
    const sub = objectData[obj.otyp]?.sub;
    const slot = ARMOR_SLOTS[sub];
    if (!slot) return false;

    // Already wearing something in that slot?
    if (player[slot.prop]) {
        display.putstr_message(`You are already wearing ${doname(player[slot.prop], player)}.`);
        return false;
    }

    // Layering checks
    if (sub === ARM_SUIT && player.cloak) {
        display.putstr_message('You are wearing a cloak.');
        return false;
    }
    if (sub === ARM_SHIRT && (player.cloak || player.armor)) {
        if (player.cloak) {
            display.putstr_message('You are wearing a cloak.');
        } else {
            display.putstr_message('You are wearing body armor.');
        }
        return false;
    }
    // Bimanual weapon + shield
    if (sub === ARM_SHIELD && player.weapon && objectData[player.weapon.otyp]?.big) {
        display.putstr_message('You cannot wear a shield while wielding a two-handed weapon.');
        return false;
    }

    return true;
}

// cf. do_wear.c cursed() — check if item is cursed and print message
function cursed_check(obj, display) {
    if (obj && obj.cursed) {
        display.putstr_message("You can't. It is cursed.");
        obj.bknown = true;
        return true;
    }
    return false;
}

// ============================================================
// 4. Wear-state management stubs
// ============================================================

// TODO: cf. do_wear.c set_wear() — set wear-state flags on equipment
// TODO: cf. do_wear.c donning() — check if player is in process of putting on armor
// TODO: cf. do_wear.c doffing() — check if player is in process of taking off armor
// TODO: cf. do_wear.c cancel_doff() — cancel in-progress doffing
// TODO: cf. do_wear.c cancel_don() — cancel in-progress donning
// TODO: cf. do_wear.c stop_donning() — stop donning if item is taken away

// ============================================================
// 5. AC calculation
// ============================================================

// cf. do_wear.c find_ac() — recalculate player AC from all worn equipment
// C ref: ARM_BONUS(obj) = objects[otyp].a_ac + obj->spe - min(greatest_erosion, a_ac)
// Rings contribute only spe (enchantment), not base AC.
function find_ac(player) {
    let uac = 10; // base AC for human player form (mons[PM_HUMAN].ac = 10)
    const arm_bonus = (obj) => {
        if (!obj) return 0;
        const baseAc = Number(objectData[obj.otyp]?.oc1 || 0);
        const spe = Number(obj.spe || 0);
        const erosion = Math.max(Number(obj.oeroded || 0), Number(obj.oeroded2 || 0));
        return baseAc + spe - Math.min(erosion, baseAc);
    };
    uac -= arm_bonus(player.armor);   // uarm: body armor
    uac -= arm_bonus(player.cloak);   // uarmc
    uac -= arm_bonus(player.helmet);  // uarmh
    uac -= arm_bonus(player.boots);   // uarmf
    uac -= arm_bonus(player.shield);  // uarms
    uac -= arm_bonus(player.gloves);  // uarmg
    uac -= arm_bonus(player.shirt);   // uarmu
    if (player.leftRing)  uac -= Number(player.leftRing.spe  || 0);
    if (player.rightRing) uac -= Number(player.rightRing.spe || 0);
    player.ac = uac;
}

// TODO: cf. do_wear.c glibr() — slippery fingers: drop weapon/rings

// ============================================================
// 6. Utility stubs
// ============================================================

// TODO: cf. do_wear.c some_armor() — return armor worn in a given slot
// TODO: cf. do_wear.c stuck_ring() — check if ring is stuck due to gloves/etc
// TODO: cf. do_wear.c unchanger() — check if wearing an unchanging item
// TODO: cf. do_wear.c count_worn_stuff() — count number of worn items
// TODO: cf. do_wear.c armor_or_accessory_off() — take off armor or accessory

// ============================================================
// 7. Multi-item takeoff (A) stubs
// ============================================================

// TODO: cf. do_wear.c select_off() — mark item for takeoff in multi-remove
// TODO: cf. do_wear.c do_takeoff() — execute one step of multi-takeoff
// TODO: cf. do_wear.c take_off() — take off a specific item
// TODO: cf. do_wear.c better_not_take_that_off() — warn about taking off load-bearing item
// TODO: cf. do_wear.c reset_remarm() — reset multi-remove state
// TODO: cf. do_wear.c doddoremarm() — A command: take off multiple items
// TODO: cf. do_wear.c remarm_swapwep() — handle swapweapon during multi-remove
// TODO: cf. do_wear.c menu_remarm() — menu-driven multi-remove

// ============================================================
// 8. Armor destruction stubs
// ============================================================

// TODO: cf. do_wear.c wornarm_destroyed() — check if worn armor should be destroyed
// TODO: cf. do_wear.c maybe_destroy_armor() — maybe destroy armor by erosion/monster
// TODO: cf. do_wear.c destroy_arm() — destroy a worn piece of armor

// ============================================================
// 9. Stat adjustment stubs
// ============================================================

// adj_abon() implemented above in the equipment effects section

// ============================================================
// 10. Accessibility/getobj stubs
// ============================================================

// TODO: cf. do_wear.c inaccessible_equipment() — check if equipment is inaccessible
// TODO: cf. do_wear.c equip_ok() — general equipment validation callback
// TODO: cf. do_wear.c puton_ok() — validation for P command items
// TODO: cf. do_wear.c remove_ok() — validation for R command items
// TODO: cf. do_wear.c wear_ok() — validation for W command items
// TODO: cf. do_wear.c takeoff_ok() — validation for T command items
// TODO: cf. do_wear.c any_worn_armor_ok() — check if any worn armor is ok target
// TODO: cf. do_wear.c count_worn_armor() — count pieces of worn armor


// ============================================================
// Command handlers
// ============================================================

// Helper: collect all currently worn armor items
function getWornArmorItems(player) {
    const items = [];
    for (const sub of Object.keys(ARMOR_SLOTS)) {
        const prop = ARMOR_SLOTS[sub].prop;
        if (player[prop]) items.push(player[prop]);
    }
    return items;
}

// cf. do_wear.c dowear() — W command: wear a piece of armor
async function handleWear(player, display) {
    const wornSet = new Set(getWornArmorItems(player));
    const armor = (player.inventory || []).filter((o) => o.oclass === ARMOR_CLASS && !wornSet.has(o));
    if (armor.length === 0) {
        if (wornSet.size > 0) {
            display.putstr_message("You don't have anything else to wear.");
        } else {
            display.putstr_message('You have no armor to wear.');
        }
        return { moved: false, tookTime: false };
    }

    display.putstr_message(`Wear what? [${armor.map(a => a.invlet).join('')}]`);
    const ch = await nhgetch();
    const c = String.fromCharCode(ch);

    const item = armor.find(a => a.invlet === c);
    if (!item) {
        display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }

    // Validate that we can wear this item in its slot
    if (!canwearobj(player, item, display)) {
        return { moved: false, tookTime: false };
    }

    const sub = objectData[item.otyp]?.sub;
    const slot = ARMOR_SLOTS[sub];
    player[slot.prop] = item;
    const onFn = SLOT_ON[sub];
    if (onFn) onFn(player);
    find_ac(player);
    display.putstr_message(`You are now wearing ${doname(item, player)}.`);
    return { moved: false, tookTime: true };
}

// cf. do_wear.c doputon() — P command: put on ring or amulet
async function handlePutOn(player, display) {
    const eligible = (player.inventory || []).filter((o) => {
        if (o.oclass === RING_CLASS && o !== player.leftRing && o !== player.rightRing) return true;
        if (o.oclass === AMULET_CLASS && o !== player.amulet) return true;
        return false;
    });
    if (eligible.length === 0) {
        display.putstr_message("You don't have anything else to put on.");
        return { moved: false, tookTime: false };
    }

    display.putstr_message(`What do you want to put on? [${eligible.map(r => r.invlet).join('')}]`);
    const ch = await nhgetch();
    const c = String.fromCharCode(ch);
    const item = eligible.find(r => r.invlet === c);
    if (!item) {
        display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }

    if (item.oclass === RING_CLASS) {
        if (player.leftRing && player.rightRing) {
            display.putstr_message("You're already wearing two rings.");
            return { moved: false, tookTime: false };
        }
        if (!player.leftRing) player.leftRing = item;
        else player.rightRing = item;
        Ring_on(player, item);
    } else if (item.oclass === AMULET_CLASS) {
        if (player.amulet) {
            display.putstr_message("You're already wearing an amulet.");
            return { moved: false, tookTime: false };
        }
        player.amulet = item;
        Amulet_on(player);
    }

    find_ac(player);
    display.putstr_message(`You are now wearing ${doname(item, player)}.`);
    return { moved: false, tookTime: true };
}

// cf. do_wear.c dotakeoff() — T command: take off a piece of armor
async function handleTakeOff(player, display) {
    const worn = getWornArmorItems(player);
    if (worn.length === 0) {
        display.putstr_message("You're not wearing any armor.");
        return { moved: false, tookTime: false };
    }

    let item;
    if (worn.length === 1) {
        item = worn[0];
    } else {
        display.putstr_message(`What do you want to take off? [${worn.map(a => a.invlet).join('')}]`);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);
        item = worn.find(a => a.invlet === c);
        if (!item) {
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
    }

    // Layering: can't remove suit if cloak worn, can't remove shirt if cloak or suit worn
    const sub = objectData[item.otyp]?.sub;
    if (sub === ARM_SUIT && player.cloak) {
        display.putstr_message("You can't take that off while wearing a cloak.");
        return { moved: false, tookTime: false };
    }
    if (sub === ARM_SHIRT && (player.cloak || player.armor)) {
        if (player.cloak) {
            display.putstr_message("You can't take that off while wearing a cloak.");
        } else {
            display.putstr_message("You can't take that off while wearing body armor.");
        }
        return { moved: false, tookTime: false };
    }

    // Cursed check
    if (cursed_check(item, display)) {
        return { moved: false, tookTime: false };
    }

    const slot = ARMOR_SLOTS[sub];
    const offFn = SLOT_OFF[sub];
    if (offFn) offFn(player);
    player[slot.prop] = null;
    find_ac(player);
    display.putstr_message(`You take off ${doname(item, player)}.`);
    return { moved: false, tookTime: true };
}

// cf. do_wear.c doremring() — R command: remove ring or amulet
async function handleRemove(player, display) {
    const accessories = [];
    if (player.leftRing) accessories.push(player.leftRing);
    if (player.rightRing) accessories.push(player.rightRing);
    if (player.amulet) accessories.push(player.amulet);

    if (accessories.length === 0) {
        display.putstr_message("You aren't wearing any accessories.");
        return { moved: false, tookTime: false };
    }

    let item;
    if (accessories.length === 1) {
        item = accessories[0];
    } else {
        display.putstr_message(`What do you want to remove? [${accessories.map(a => a.invlet).join('')}]`);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);
        item = accessories.find(a => a.invlet === c);
        if (!item) {
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
    }

    // Cursed check
    if (cursed_check(item, display)) {
        return { moved: false, tookTime: false };
    }

    if (item === player.leftRing) {
        Ring_off(player, item);
        player.leftRing = null;
    } else if (item === player.rightRing) {
        Ring_off(player, item);
        player.rightRing = null;
    } else if (item === player.amulet) {
        Amulet_off(player);
        player.amulet = null;
    }

    find_ac(player);
    display.putstr_message(`You remove ${doname(item, player)}.`);
    return { moved: false, tookTime: true };
}

export {
    handleWear, handlePutOn, handleTakeOff, handleRemove, find_ac,
    canwearobj, cursed_check,
    Boots_on, Boots_off, Cloak_on, Cloak_off, Helmet_on, Helmet_off,
    Gloves_on, Gloves_off, Shield_on, Shield_off, Shirt_on, Shirt_off,
    Armor_on, Armor_off, Amulet_on, Amulet_off, Ring_on, Ring_off,
};
