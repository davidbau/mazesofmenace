// steal.js -- Monster stealing mechanics
// cf. steal.c — leprechaun gold theft, nymph/monkey item theft, monster pickup/drop

// cf. steal.c:14 — somegold(): return proportional subset of gold quantity
// TODO: steal.c:14 — somegold(): not yet called in JS (needed for stealgold)

// cf. steal.c:45 — findgold(): find first gold object in inventory chain
// JS equivalent: findgold() in makemon.js:1030 (returns boolean, not pointer;
//   sufficient for current JS call sites but differs from C which returns the object)

// cf. steal.c:58 — stealgold(): leprechaun steals gold coins from hero
// Partially referenced in monmove.js:1822 (leprechaun flee-without-attack logic);
// the actual gold transfer is not yet implemented in JS.
// TODO: steal.c:58 — stealgold(): full leprechaun gold theft from hero inventory

// cf. steal.c:120 — thiefdead(): handle thief death during multi-turn armor steal
// TODO: steal.c:120 — thiefdead(): clear stealoid/stealmid, reset afternmv to unstolenarm

// cf. steal.c:133 — unresponsive(): check if hero is unresponsive to seduction
// TODO: steal.c:133 — unresponsive(): needed before steal() armor-seduction path

// cf. steal.c:147 [static] — unstolenarm(): afternmv when thief dies mid-armor-steal
// TODO: steal.c:147 — unstolenarm(): print "finish taking off" message when thief died

// cf. steal.c:165 [static] — stealarm(): afternmv to complete multi-turn armor theft
// TODO: steal.c:165 — stealarm(): multi-turn armor removal occupation callback

// cf. steal.c:213 — remove_worn_item(): remove a worn item from hero inventory
// TODO: steal.c:213 — remove_worn_item(): unequip worn item (armor/ring/amulet/weapon)

// cf. steal.c:294 [static] — worn_item_removal(): remove worn item with theft message
// TODO: steal.c:294 — worn_item_removal(): print "takes off/disarms/removes" then remove_worn_item

// cf. steal.c:343 — steal(): main monster steal function (nymph/monkey vs hero)
// TODO: steal.c:343 — steal(): pick item from hero inventory, handle armor delays, seduction

// cf. steal.c:618 — mpickobj(): monster picks up / acquires an object
// Partially referenced: add_to_minv() in makemon.js handles the inventory addition.
// The full mpickobj() also handles thrownobj/kickedobj tracking, unpaid shop items,
// light source handling, and carry_obj_effects().
// TODO: steal.c:618 — mpickobj(): full monster object acquisition with side effects

// cf. steal.c:689 — stealamulet(): wizard/nemesis steals quest artifact from hero
// TODO: steal.c:689 — stealamulet(): find and steal Amulet/invocation items/quest artifact

// cf. steal.c:772 — maybe_absorb_item(): mimic absorbs item poked at it
// TODO: steal.c:772 — maybe_absorb_item(): chance-based mimic item absorption

// cf. steal.c:814 — mdrop_obj(): drop one object from monster inventory to floor
// Partially implemented inline in monmove.js:2481 (monster death drops) and
// monmove.js:1477 (dog_invent droppables loop). Neither handles all mdrop_obj() cases
// (saddle no_charge, update_mon_extrinsics, flooreffects, verbose message).
// TODO: steal.c:814 — mdrop_obj(): full monster object drop with all side effects

// cf. steal.c:852 — mdrop_special_objs(): force-drop Amulet/invocation/quest items
//   from monster that is leaving the level
// TODO: steal.c:852 — mdrop_special_objs(): prevent special items from leaving level

// cf. steal.c:875 — relobj(): release all objects from monster inventory
// Partially implemented inline in monmove.js:2481 (monster death drops minvent in
// reverse order). The full relobj() also handles pet-only drop via droppables(),
// vault guard gold vanishing (findgold), and newsym() after drops.
// TODO: steal.c:875 — relobj(): full monster inventory release (pets, guard gold, newsym)
