# Companion spoilers — audit trail

Running record of claims in `companion.md` that have been verified against
NetHack 5.0 source (`nethack-c/upstream/src/`, `include/`, `dat/`).

Format per entry:
- **Claim** — the statement as it appears (or appeared) in the spoiler
- **Spoiler line** — line number in `companion.md` at time of audit
- **Source ref** — C file:line that decides the answer
- **Verdict** — Correct / Wrong / Defensible / Ambiguous
- **Notes** — interpretation and any caveat

Sort key: ascending spoiler line number within each audit session.

---

## 2026-05-11 — first systematic pass

Audit by Claude Opus 4.7. Covered Tier 1-4 from the audit candidate list:
specific numeric claims, "in current editions" version-change claims, and
monster level / mechanic specifics. NetHack 5.0 source HEAD.

### Class and starting-inventory claims

**Claim**: "Knight pony will get you into trouble if it wanders into a shop."
- **Spoiler line**: 169 (pre-fix, replaced 2026-05-11)
- **Source ref**: `steal.c:618` `mpickobj()` (specifically the `subfrombill()`
  call at line ~641), `mkobj.c:3184` (sanity-check comment confirming
  `no_charge` is valid for pet-held shop items)
- **Verdict**: Wrong
- **Notes**: Pet picking up shop merchandise removes the item from the
  player's bill (`subfrombill`) and sets `no_charge = 0`; only when the
  shopkeeper enters `hot_pursuit` does `clear_no_charge_pets()` flip the
  flag. So pet-aided "shoplifting" is actually favorable to the player.
  Replaced with Excalibur + lance discussion. Section now line 167.

**Claim**: Knight Excalibur dipping odds = 1/6 vs 1/30 for other Lawfuls.
- **Spoiler line**: 172-174 (added 2026-05-11)
- **Source ref**: `fountain.c:405` — `!rn2(Role_if(PM_KNIGHT) ? 6 : 30)`
- **Verdict**: Correct
- **Notes**: Knight gets `rn2(6)`, every other Lawful gets `rn2(30)`.

**Claim**: Rogue starts with short sword, 6 daggers, +1 leather armor,
lock pick, sack, and potion of sickness.
- **Spoiler line**: 207-213 (rewritten 2026-05-11)
- **Source ref**: `u_init.c:133`
- **Verdict**: Correct
- **Notes**: The Rogue inventory table in u_init.c matches exactly.

### Dungeon features

**Claim**: Castle is around level 27; Medusa around level 25.
- **Spoiler line**: 951, 1039
- **Source ref**: `dat/dungeon.lua:78-84` — Medusa `base = -5 range = 4`,
  Castle `base = -1`
- **Verdict**: Defensible
- **Notes**: Both are approximations; Castle is "level (max-1)" and Medusa
  is somewhere in `[max-5, max-2]`. Internally consistent; main dungeon
  depth varies by seed.

**Claim**: Supply containers appear in 2/3 of levels above the Oracle
(new in NetHack 5.0).
- **Spoiler line**: 480-503 (rewritten 2026-05-11)
- **Source ref**: `mklev.c:1009-1126`, especially comment at lines 1014-1022
  ("on other levels above the Oracle, 2/3 chance of a 'supply chest'")
  and the content pool at `mklev.c:1051-1059`.
- **Verdict**: Correct
- **Notes**: Content pool exactly: `POT_EXTRA_HEALING, POT_SPEED,
  POT_GAIN_ENERGY, SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR,
  SCR_CONFUSE_MONSTER, SCR_SCARE_MONSTER, WAN_DIGGING, SPE_HEALING`,
  with 50% override to `POT_HEALING` (and 50% of those drop a stack of 2).
  Container is 2/3 chest 1/3 large box (`rn2(3) ? CHEST : LARGE_BOX`);
  5/6 locked (`!!(rn2(6))`). Mines branch level gets the food cache.

**Claim**: Iron bars can be dissolved with a potion of acid.
- **Spoiler line**: 1192-1196 (pre-fix, replaced 2026-05-11)
- **Source ref**: `zap.c:5348` (`zap_over_floor` with `ZT_ACID`),
  `dothrow.c:812` (thrown-potion bounces off bars), `potion.c:1297`
  (potion's `peffect_acid` operates on creatures only)
- **Verdict**: Wrong
- **Notes**: Bars only dissolve under `ZT_ACID` zap (i.e., monster acid
  breath or you-breathing-acid-while-polymorphed). Thrown potions of acid
  do not trigger this path. Rewritten to recommend dig-around-the-side
  via pick-axe as the practical answer. Also fixed the matching appendix
  bullet at line 5488 (was "broken with a war hammer" — also wrong).

**Claim**: What's behind barred niches: scroll of teleportation
(guaranteed), random object (1/3), human corpse (1/3).
- **Spoiler line**: 1207-1211
- **Source ref**: `mklev.c:782-794`
- **Verdict**: Correct
- **Notes**: Niche generation: `rn2(5) == 0 && IS_WALL` → place IRONBARS;
  `rn2(3) == 0` → human corpse on outside square; SCR_TELEPORTATION
  always placed inside (unless `noteleport` flag); `rn2(3) == 0` → random
  RANDOM_CLASS object also placed.

### Monsters

**Claim**: Lurker above is level 10.
- **Spoiler line**: 1605
- **Source ref**: `include/monsters.h:981` `MON(NAM("lurker above"), ...,
  LVL(10, ...), ...)`
- **Verdict**: Correct

**Claim**: Trapper is level 12.
- **Spoiler line**: 1607
- **Source ref**: `include/monsters.h:990` `LVL(12, ...)`
- **Verdict**: Correct

**Claim**: Yellow/black lights, "level 3-5".
- **Spoiler line**: 1622
- **Source ref**: `include/monsters.h:1169` (yellow light LVL 3),
  `monsters.h:1181` (black light LVL 5)
- **Verdict**: Correct

**Claim**: The Riders are level 30.
- **Spoiler line**: 1657
- **Source ref**: `include/monsters.h:3144` (Death LVL 30),
  `monsters.h:3154` (Pestilence LVL 30), `monsters.h:3164` (Famine LVL 30)
- **Verdict**: Correct

**Claim**: Touch of Death deals 8d6+50 and drains half the damage as
max-HP.
- **Spoiler line**: 1519-1521
- **Source ref**: `mcastu.c:323-355` — `int dmg = 50 + d(8, 6); int drain = dmg / 2;`
- **Verdict**: Correct
- **Notes**: Permanent max-HP reduction applies. Outright death if
  `drain >= u.uhpmax`.

**Claim**: "Magic resistance does not save you from Touch of Death."
- **Spoiler line**: 1527-1528
- **Source ref**: `mcastu.c:395-407` (`mcast_death_touch` gated by
  `!Antimagic`), `uhitm.c:3837-3884` (`mhitm_ad_deth`)
- **Verdict**: Partially wrong (corrected 2026-05-11)
- **Notes**: MR fully blocks the spell-cast version; on the Death rider's
  touch (rolls 17-19 of 20), MR blocks the full 8d6+50, leaving only
  permdmg life-drain from the default (rolls 5-16). So MR substantially
  mitigates but doesn't fully neutralize the Death rider's attack.

**Claim**: Spheres "explode in a 3x3 area in current editions" (line 1371).
- **Spoiler line**: 1371
- **Source ref**: `explode.c:198-215` — `explmask[3][3]` and "adjacent
  spots are also affected"; `mhitu.c:839-842` invokes `explmu`, which
  in turn calls `explode()` for AD_FIRE/COLD/ELEC.
- **Verdict**: Correct

**Claim**: Gold dragons breathe fire.
- **Spoiler line**: 1430
- **Source ref**: `include/monsters.h:1444` —
  `MON("gold dragon", ..., ATTK(AT_BREA, AD_FIRE, 4, 6), ...)`
- **Verdict**: Correct

### Engravings and alignment

**Claim**: Attacking from Elbereth costs -5 alignment.
- **Spoiler line**: 1285
- **Source ref**: `mon.c:4267-4299` — `if (via_attack && sengr_at("Elbereth",...
  ... adjalign(-5)`
- **Verdict**: Correct

### Tools and items

**Claim**: Unicorn horn cures sickness, blindness, hallucination,
vomiting, confusion, stunning, deafness (deaf new in 5.0). Effectiveness:
blessed can fix up to 7 troubles per apply, uncursed maxes at 3 with
35% no-effect rate; cursed inflicts a random ailment.
- **Spoiler line**: 3111-3128 (rewritten 2026-05-11)
- **Source ref**: `apply.c:2259-2381` `use_unicorn_horn`. Probability
  table is inline in the function comments:
  `blessed: 22.7%/22.7%/19.5%/15.4%/10.7%/5.7%/2.6%/0.8%`
  `uncursed: 35.4%/35.4%/22.9%/6.3%/0/0/0/0`
- **Verdict**: Correct
- **Notes**: The "no longer restores ability scores" caveat is still
  accurate; the horn cures only the seven status ailments listed, never
  drained stats.

**Claim**: Magic marker has 30-99 starting charges; blessed scroll of
charging restores to ≥50 (once only). Scroll write costs: identify 7-13,
enchant 8-15, charging 8-15, magic mapping 4-7, **genocide 15-29**.
Spellbooks 10 × spell level.
- **Spoiler line**: 3132-3155 (rewritten 2026-05-11)
- **Source ref**: `mkobj.c:1025` (`spe = rn1(70, 30)`),
  `read.c:857-880` (charging restoration),
  `write.c:14-57` (cost table by scroll type),
  `write.c:265` (`actualcost = rn1(basecost / 2, basecost / 2)`)
- **Verdict**: Correct
- **Notes**: The earlier spoiler claim "writing identified scrolls costs
  fewer charges" was wrong — `actualcost` depends only on the target
  scroll's basecost, not identification status. **Self-correction
  needed**: in the rewrite I claimed blessed charging gives "two more
  wishes" to a wand of wishing — that's wrong; it gives exactly one
  more wish per recharge (see wand of wishing entry below).

**Claim**: Confused remove curse has "25% chance of blessing or cursing"
each uncursed item.
- **Spoiler line**: 2690
- **Source ref**: `read.c:1556-1561` (uses `blessorcurse(obj, 2)`),
  `mkobj.c:1010-1023` (`blessorcurse` definition: `!rn2(chance)` then
  `!rn2(2)` to choose direction)
- **Verdict**: Correct but ambiguous
- **Notes**: Actual is 25% bless, 25% curse, 50% no change. The phrasing
  "25% of blessing or cursing" could be misread as "25% combined" — but
  the per-direction numbers are right.

### Magic-cancellation / armor

**Claim**: MC3 blocks 90% of monster special attacks (down from 98% in
older editions).
- **Spoiler line**: 3214
- **Source ref**: `uhitm.c:86-87` — `armpro = magic_negation(mdef);
  negated = !(rn2(10) >= 3 * armpro);` → MC3 = `rn2(10) < 9` = 90%
- **Verdict**: Correct (90%); the "98% historical" not verified against
  any older source

### Weapons and combat

**Claim**: Two-handed weapons get a 50% STR damage bonus.
- **Spoiler line**: 3506-3514
- **Source ref**: `uhitm.c:1463-1470` —
  `if (bimanual(uwep)) strbonus = ((3 * absbonus + 1) / 2) * sgn(strbonus);`
  → 3/2 = 1.5x = +50%
- **Verdict**: Correct
- **Notes**: Spoiler states the same fact in two consecutive paragraphs
  (3506 and 3510), minor stylistic redundancy.

**Claim**: Cursed wands may explode when zapped.
- **Spoiler line**: 2154
- **Source ref**: `zap.c:2647` (`obj->cursed && !rn2(WAND_BACKFIRE_CHANCE)`
  → `backfire(obj)`), `hack.h:1410` (`WAND_BACKFIRE_CHANCE = 100`)
- **Verdict**: Correct
- **Notes**: 1/100 chance per zap of a cursed wand. Damage is
  `d(spe + 2, 6)`.

**Claim**: Recharge explosion chances 0.3% / 2.3% / 7.9% / 100% for
recharges 1 / 2 / 3 / 7.
- **Spoiler line**: 2858-2861
- **Source ref**: `read.c:747-762` — inline comment table lists
  `0.29% / 2.33% / 7.87% / 100%` cumulative odds.
- **Verdict**: Correct (spoiler is the same numbers, rounded)
- **Notes**: Formula is `n*n*n > rn2(7*7*7)`. Wand of wishing additionally
  always explodes if `recharged > 0`.

**Claim**: Wand of wishing yields "2-3 wishes with wresting".
- **Spoiler line**: 3644
- **Source ref**: `mkobj.c:1083` (`WAN_WISHING spe = 1` initial),
  `zap.c:2515-2525` (`zappable` and wrest at `rn2(WAND_WREST_CHANCE)`
  with `WAND_WREST_CHANCE = 121`), `read.c:739-792` (recharge: lim = 1
  for WAN_WISHING, gives +1 spe; second recharge always explodes).
- **Verdict**: Defensible
- **Notes**: Initial 1 wish + 1 safe recharge with blessed charging
  scroll + 1/121 wresting chance on each post-empty zap = 2-3 wishes
  realistically achievable. Self-correction: my magic marker section
  said charging gives "two more wishes" — that's wrong (one more).

### Wish sources

**Claim**: Magic lamp rubbed blessed = 80% chance of wish.
- **Spoiler line**: 3074, 3633
- **Source ref**: `apply.c:1816-1834` (rub mechanic: djinni emerges on
  `!rn2(3)` = 1/3 of rubs); `potion.c:2840-2842` (djinni_from_bottle:
  blessed = 80% wish conditional on djinni emerging)
- **Verdict**: Wrong
- **Notes**: 80% is conditional on djinni emerging. True per-rub wish
  chance ≈ 1/3 × 80% = ~27% for blessed. Spoiler conflates the two
  probabilities.

**Claim**: Smoky potion djinni: 20% wish (80% if blessed).
- **Spoiler line**: 3640-3642
- **Source ref**: same `potion.c:2840-2842`
- **Verdict**: Correct
- **Notes**: These are conditional on djinni-emerges, which the spoiler
  separately notes is "1 in 13 base probability."

**Claim**: Fountain ~1 in 30 chance of a wish per quaff.
- **Spoiler line**: 3636
- **Source ref**: `fountain.c:243` `drinkfountain` (`fate = rnd(30)`,
  case 23 = water demon), `fountain.c:64-89` `dowaterdemon` (wish on
  `rnd(100) > 80 + level_difficulty()`)
- **Verdict**: Wrong
- **Notes**: 1/30 is just the water-demon spawn rate. Conditional wish
  from the demon is ~20% on shallow floors (less deeper). True per-quaff
  wish chance is closer to 1/150 (~0.67%).

**Claim**: Vlad's throne: 4 of 13 outcomes are a wish.
- **Spoiler line**: 3626-3629
- **Source ref**: `sit.c:240-255` `special_throne_effect`, cases 1-4 of 13
  each call `makewish()` then disintegrate the throne.
- **Verdict**: Correct

**Claim**: Throne (ordinary): very rare chance of a wish.
- **Spoiler line**: 3638
- **Source ref**: `sit.c:64-110` ordinary throne effects, case 6 calls
  `makewish()` conditional on `u.uluck + rn2(5) >= 0` (so positive Luck
  ≈ guaranteed wish on that branch). 1/13 cases gives ~7.7% per sit.
- **Verdict**: Defensible
- **Notes**: "Very rare" is roughly accurate; spoiler doesn't pin the
  exact %.

**Claim**: Amulet of Yendor grants a wish when first picked up.
- **Spoiler line**: 3631
- **Source ref**: `allmain.c:446-450` —
  `if (u.uhave.amulet && !u.uevent.amulet_wish) { u.uevent.amulet_wish = 1;
  pline("The Amulet is bestowing a wish upon you!"); makewish(); }`
- **Verdict**: Correct

### Cursing and item generation

**Claim**: Rings of teleportation / polymorph / aggravate / hunger and
amulets of strangulation / change / restful sleep generate cursed 90%
of the time.
- **Spoiler line**: 2916, 2928
- **Source ref**: `mkobj.c:1063` (amulets), `mkobj.c:1143` (rings) — both
  use `rn2(10)` (truthy 9/10 = 90% of the time → `curse(otmp)`)
- **Verdict**: Correct

**Claim**: Items on a bones level have an 80% chance of being cursed.
- **Spoiler line**: 3822
- **Source ref**: `bones.c:290` `if (rn2(5)) curse(otmp);` → 4/5 = 80%
- **Verdict**: Correct

### Locks

**Claim**: Skeleton key — 70%+ on doors, 75%+ on boxes.
- **Spoiler line**: 3066
- **Source ref**: `lock.c:299` (boxes: `ch = 75 + ACURR(A_DEX)`),
  `lock.c:639` (doors: `ch = 70 + ACURR(A_DEX)`)
- **Verdict**: Correct (matches base constants exactly)

### Potions and rings

**Claim**: Dipping a potion mix has ~10% explosion chance on non-water
combinations.
- **Spoiler line**: 2583
- **Source ref**: `potion.c:2420-2428` `dip_potion_explosion` —
  `!rn2((uarmc && uarmc->otyp == ALCHEMY_SMOCK) ? 30 : 10)` → 10% base,
  always for cursed/acid/lit-oil
- **Verdict**: Correct
- **Notes**: Wearing alchemy smock reduces it to 1/30.

**Claim**: Throwing a ring down a sink loses it 95% of the time
(searching and slow digestion always returned).
- **Spoiler line**: 2194-2196
- **Source ref**: `do.c:649-664` —
  `!rn2(20)` (5%) returns ring; otherwise `!rn2(5)` (19/100 overall)
  buries it; otherwise (76/100) `useup`. RIN_SEARCHING/SLOW_DIGESTION
  exit early via `goto giveback` at `do.c:510-518`.
- **Verdict**: Correct
