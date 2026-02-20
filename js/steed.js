// steed.js -- Riding steeds (saddle, mount, dismount)
// cf. steed.c — saddle application, mounting/dismounting, steed movement and kicks

// cf. steed.c:17 — rider_cant_reach(): print message when rider can't reach something
// TODO: steed.c:17 — rider_cant_reach(): "You aren't skilled enough to reach from <steed>."

// cf. steed.c:26 — can_saddle(mtmp): can this monster wear a saddle?
// Requires: mlet in steeds[] (QUADRUPED/UNICORN/ANGEL/CENTAUR/DRAGON/JABBERWOCK),
//   MZ_MEDIUM+, not humanoid (unless centaur), not amorphous/noncorporeal/whirly/unsolid.
// TODO: steed.c:26 — can_saddle(): saddleability check for monster

// cf. steed.c:36 — use_saddle(otmp): apply a saddle to an adjacent monster
// Checks: can_saddle, petrification, special monsters (minion/shk/priest/guard/wiz),
//   skill-based chance (DEX + CHA/2 + 2*tameness + ulevel*modifier ± adjustments),
//   cursed saddle -50, calls maybewakesteed().
// TODO: steed.c:36 — use_saddle(): saddle application command handler

// cf. steed.c:142 — put_saddle_on_mon(saddle, mtmp): put a saddle on a monster
// Creates saddle if null, calls mpickobj(), sets misc_worn_check |= W_SADDLE,
//   saddle->owornmask = W_SADDLE, saddle->leashmon = m_id.
// Partially implemented inline in u_init.js:289 (pony starting saddle).
// TODO: steed.c:142 — put_saddle_on_mon(): full saddle-equip function

// cf. steed.c:169 — can_ride(mtmp): can hero ride this monster?
// Requires: tame, humanoid hero, not verysmall/bigmonst, swimmer if Underwater.
// TODO: steed.c:169 — can_ride(): ridability check

// cf. steed.c:178 — doride(): #ride command — mount or dismount current steed
// TODO: steed.c:178 — doride(): #ride command handler

// cf. steed.c:197 — mount_steed(mtmp, force): start riding a monster
// Checks: already mounted, Hallucination, Wounded_legs, body shape, encumbrance,
//   visibility, saddle, tame, trapped, tame decrement (non-knight), Underwater,
//   can_saddle/can_ride, Levitation, rusty/corroded armor, slip chance.
// On success: calls maybewakesteed(), sets u.usteed, teleds() hero to steed position,
//   steed_vs_stealth().
// TODO: steed.c:197 — mount_steed(): full mount logic with all checks

// cf. steed.c:387 — exercise_steed(): called each move while riding to gain riding XP
// Increments u.urideturns; every 100 turns calls use_skill(P_RIDING, 1).
// TODO: steed.c:387 — exercise_steed(): riding-skill exercise counter

// cf. steed.c:402 — kick_steed(): hero kicks or whips the steed
// Sleeping steed: rn2(2) chance to wake or reduce mfrozen.
// Awake steed: decrements mtame; if tameness too low → dismount_steed(DISMOUNT_THROWN);
//   otherwise gallop: u.ugallop += rn1(20, 30).
// TODO: steed.c:402 — kick_steed(): kick/whip steed with tameness and wake effects

// cf. steed.c:459 [static] — landing_spot(spot, reason, forceit): find dismount landing spot
// Tries adjacent squares in priority order based on dismount reason (KNOCKED prefers
//   direction of knock; voluntary avoids known traps and boulders in 3-pass loop).
// Falls back to enexto() if forceit and nothing found.
// TODO: steed.c:459 — landing_spot(): adjacent square finder for dismounting

// cf. steed.c:576 — dismount_steed(reason): stop riding; place hero and steed
// Reasons: BYCHOICE, THROWN, KNOCKED, FELL, POLY, ENGULFED, BONES, GENERIC.
// Heals Wounded_legs (steed's while mounted → hero's after), calls landing_spot(),
//   places steed on map, teleds() hero to landing spot, steed_vs_stealth(),
//   float_down() to return to surface.
// TODO: steed.c:576 — dismount_steed(): full dismount with all reason cases

// cf. steed.c:827 [static] — maybewakesteed(steed): wake sleeping/paralyzed steed
// Clears msleeping; halves mfrozen with rn2(frozen) chance to fully wake;
//   calls finish_meating().
// TODO: steed.c:827 — maybewakesteed(): wake steed when saddling or mounting

// cf. steed.c:852 — poly_steed(steed, oldshape): handle steed polymorphing
// If can no longer saddle/ride: dismount_steed(DISMOUNT_FELL).
// Otherwise: print adjustment message, call steed_vs_stealth().
// TODO: steed.c:852 — poly_steed(): steed polymorph handling

// cf. steed.c:878 — stucksteed(checkfeeding): check if steed can move
// Returns TRUE if helpless or (if checkfeeding) meating.
// TODO: steed.c:878 — stucksteed(): steed mobility check

// cf. steed.c:898 — place_monster(mon, x, y): place a monster at map coordinates
// Validates coordinates, checks for steed conflict and dead monster,
//   sets mon->mx/my and level.monsters[x][y] = mon; sets mstate = MON_FLOOR.
// Referenced (but not implemented) in comments: commands.js:947, dogmove.js:1527.
// TODO: steed.c:898 — place_monster(): canonical monster placement on map grid
