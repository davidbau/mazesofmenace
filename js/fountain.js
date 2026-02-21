import { rn2, rnd } from './rng.js';
import { FOUNTAIN, ROOM, A_WIS, A_CON } from './config.js';
import { exercise } from './attrib_exercise.js';

// fountain.js -- Fountain and sink effects: quaff, dip, wash
// cf. fountain.c — floating_above, dowatersnakes, dowaterdemon, dowaternymph,
//                  dogushforth, gush, dofindgem, watchman_warn_fountain,
//                  dryup, drinkfountain, dipfountain, wash_hands,
//                  breaksink, drinksink, dipsink, sink_backs_up
//
// fountain.c handles all fountain and sink interactions:
//   drinkfountain(): random effects when player quaffs from fountain.
//   dipfountain(obj): dipping object into fountain for magical effects.
//   drinksink(): random effects when player quaffs from sink.
//   dipsink(obj): dipping into sink with special potion interactions.
//   dryup(): drain a fountain/sink, optionally with guard warning.
//   wash_hands(): remove grease effect from fountain or sink.
//
// JS implementations:
//   drinkfountain → commands.js:3184 (PARTIAL — RNG-parity implementation)
//   dryup → commands.js:3234 (PARTIAL)

// cf. fountain.c:21 — floating_above(what): levitation message
// Displays "You are floating above the <what>" when levitating over it.
// TODO: fountain.c:21 — floating_above(): levitation over fountain message

// cf. fountain.c:38 [static] — dowatersnakes(void): fountain spawns snakes
// Spawns water moccasins from a fountain of snakes.
// TODO: fountain.c:38 — dowatersnakes(): snake fountain effect

// cf. fountain.c:64 [static] — dowaterdemon(void): fountain spawns demon or wish
// Spawns a water demon or grants a wish when drinking from fountain.
// TODO: fountain.c:64 — dowaterdemon(): demon/wish fountain effect

// cf. fountain.c:94 [static] — dowaternymph(void): fountain spawns nymph
// Spawns a water nymph when drinking from a fountain.
// TODO: fountain.c:94 — dowaternymph(): nymph fountain effect

// cf. fountain.c:120 — dogushforth(drinking): fountain gushes
// Creates spreading water pools from fountain in line of sight.
// TODO: fountain.c:120 — dogushforth(): fountain gush effect

// cf. fountain.c:134 [static] — gush(x, y, poolcnt): place pool at location
// Places a pool at given location with proper tile type and display updates.
// TODO: fountain.c:134 — gush(): individual pool placement

// cf. fountain.c:165 [static] — dofindgem(void): gem in fountain
// Creates a gem in the fountain waters that the player can find.
// TODO: fountain.c:165 — dofindgem(): gem discovery in fountain

// cf. fountain.c:179 [static] — watchman_warn_fountain(mtmp): guard fountain warning
// Watchman warns player about inappropriate fountain use in town.
// TODO: fountain.c:179 — watchman_warn_fountain(): guard fountain warning

// cf. fountain.c:201 — dryup(x, y, isyou): dry up fountain or sink
function dryup(x, y, map, display) {
    const loc = map.at(x, y);
    if (loc && loc.typ === FOUNTAIN) {
        if (!rn2(3)) {
            loc.typ = ROOM;
            loc.flags = 0;
            loc.blessedftn = 0;
            display.putstr_message('The fountain dries up!');
        }
    }
}

// cf. fountain.c:243 — drinkfountain(void): drink from fountain
export function drinkfountain(player, map, display) {
    const loc = map.at(player.x, player.y);
    const mgkftn = loc && loc.blessedftn === 1;
    const fate = rnd(30);

    // C ref: fountain.c:254 — blessed fountain jackpot
    if (mgkftn && (player.luck || 0) >= 0 && fate >= 10) {
        display.putstr_message('Wow!  This makes you feel great!');
        rn2(6); // rn2(A_MAX) — random starting attribute
        // adjattrib loop — simplified, no RNG for basic case
        display.putstr_message('A wisp of vapor escapes the fountain...');
        exercise(player, A_WIS, true);
        if (loc) loc.blessedftn = 0;
        return; // NO dryup on blessed jackpot path
    }

    if (fate < 10) {
        // C ref: fountain.c:279 — cool draught refreshes
        display.putstr_message('The cool draught refreshes you.');
        player.hunger += rnd(10);
        if (mgkftn) return; // blessed fountain, no dryup
    } else {
        // C ref: fountain.c:286-387 — switch on fate
        switch (fate) {
        case 19:
            display.putstr_message('You feel self-knowledgeable...');
            exercise(player, A_WIS, true);
            break;
        case 20:
            display.putstr_message('The water is foul!  You gag and vomit.');
            rn2(20) + 11; // rn1(20, 11) = rn2(20) + 11 for morehungry
            break;
        case 21:
            display.putstr_message('The water is contaminated!');
            rn2(4) + 3; // rn1(4, 3) for poison_strdmg
            rnd(10);    // damage
            exercise(player, A_CON, false);
            break;
        // cases 22-30: complex effects with sub-functions
        // TODO: implement dowatersnakes, dowaterdemon, etc.
        default:
            display.putstr_message('This tepid water is tasteless.');
            break;
        }
    }
    // C ref: fountain.c:389 — dryup at end of all non-jackpot paths
    dryup(player.x, player.y, map, display);
}

// cf. fountain.c:394 — dipfountain(obj): dip object into fountain
// Handles magical effects of dipping objects into a fountain.
// TODO: fountain.c:394 — dipfountain(): fountain dipping effects

// cf. fountain.c:558 — wash_hands(void): wash hands in fountain/sink
// Removes grease effect from hands at fountain or sink.
// TODO: fountain.c:558 — wash_hands(): grease removal

// cf. fountain.c:581 — breaksink(x, y): sink becomes fountain
// Converts a sink into a fountain when pipes break (levitation potion).
// TODO: fountain.c:581 — breaksink(): sink-to-fountain conversion

// cf. fountain.c:595 — drinksink(void): drink from sink
// Handles random effects when player quaffs from a sink.
// TODO: fountain.c:595 — drinksink(): sink drinking effects

// cf. fountain.c:716 — dipsink(obj): dip object into sink
// Handles special interactions from dipping objects into a sink.
// TODO: fountain.c:716 — dipsink(): sink dipping effects

// cf. fountain.c:805 — sink_backs_up(x, y): ring spawns from backed-up sink
// Creates a ring object from sink when levitation potion causes backup.
// TODO: fountain.c:805 — sink_backs_up(): backed-up sink ring spawn
