// quest.js -- Quest dungeon branch mechanics and NPC dialog dispatch
// cf. quest.c — onquest, nemdead, leaddead, artitouch, ok_to_quest,
//               finish_quest, leader_speaks, nemesis_speaks, nemesis_stinks,
//               quest_chat, quest_talk, quest_stat_check,
//               and static helpers on_start, on_locate, on_goal,
//               not_capable, is_pure, expulsion, chat_with_leader,
//               chat_with_nemesis, chat_with_guardian, prisoner_speaks
//
// The quest system manages entry to the role-specific quest dungeon branch:
//   - Level arrival messages (on_start/on_locate/on_goal via onquest())
//   - Eligibility checks (level, alignment purity, got_quest flag)
//   - Leader/nemesis/guardian NPC conversations (quest_chat/quest_talk)
//   - Quest completion (artitouch, finish_quest)
//   - Expulsion from quest dungeon for ineligible players
//   - nemesis_stinks() creates a gas cloud on nemesis death
//
// Key macros in quest.c:
//   Not_firsttime: on_level(&u.uz0, &u.uz) — not the first arrival
//   Qstat(x): svq.quest_status.x — quest status flag accessor
//   MIN_QUEST_LEVEL: minimum XL to get the quest (role-dependent, from quest.h)
//   MIN_QUEST_ALIGN: minimum alignment record required
//
// JS implementations: none. All functions are runtime gameplay quest state.

// cf. quest.c:26 [static] — on_start(): first-arrival message on start level
// If first_start: qt_pager("firsttime").
// Else if returning or going deeper: qt_pager("nexttime") or "othertime".
// TODO: quest.c:26 — on_start(): quest start-level arrival message

// cf. quest.c:40 [static] — on_locate(): first-arrival message on locate level
// Skips if killed_nemesis. First visit from above: qt_pager("locate_first");
//   subsequent visits from above: qt_pager("locate_next").
// TODO: quest.c:40 — on_locate(): quest locate-level arrival message

// cf. quest.c:62 [static] — on_goal(): message on goal/nemesis level
// Skips if killed_nemesis. First arrival: qt_pager("goal_first"); else
//   "goal_next" or "goal_alt" depending on quest artifact presence.
// TODO: quest.c:62 — on_goal(): quest goal-level arrival message

// cf. quest.c:89 — onquest(): dispatch arrival messages for quest levels
// Called on level change; does nothing if qcompleted or Not_firsttime.
// Routes to on_start/on_locate/on_goal based on Is_qstart/Is_qlocate/Is_nemesis.
// TODO: quest.c:89 — onquest(): quest level arrival dispatcher

// cf. quest.c:107 — nemdead(): nemesis was killed
// Sets Qstat(killed_nemesis)=TRUE; calls qt_pager("killed_nemesis").
// TODO: quest.c:107 — nemdead(): nemesis death handler

// cf. quest.c:116 — leaddead(): quest leader was killed
// Sets Qstat(killed_leader)=TRUE.
// TODO: quest.c:116 — leaddead(): leader death bookkeeping

// cf. quest.c:125 — artitouch(obj): player first touches quest artifact
// Sets Qstat(touched_artifact); calls qt_pager("gotit"); awards WIS exercise.
// Also calls observe_object() so blind player gets it named.
// TODO: quest.c:125 — artitouch(): quest artifact first-touch event

// cf. quest.c:140 — ok_to_quest(): is player allowed to enter quest dungeon?
// Returns TRUE if (got_quest || got_thanks) && is_pure>0, or killed_leader.
// Called from do.c on level-change to allow/block quest portal use.
// TODO: quest.c:140 — ok_to_quest(): quest dungeon entry eligibility

// cf. quest.c:147 [static] — not_capable(): is player too low level?
// Returns u.ulevel < MIN_QUEST_LEVEL.
// TODO: quest.c:147 — not_capable(): minimum XL check

// cf. quest.c:153 [static] — is_pure(talk): alignment purity check
// Returns: 1=pure (alignment record ≥ MIN_QUEST_ALIGN, not converted);
//   0=impure (record too low but not converted); -1=converted.
// talk=TRUE: prints wizard-mode info and offers alignment adjustment.
// TODO: quest.c:153 — is_pure(): quest alignment purity evaluation

// cf. quest.c:186 [static] — expulsion(seal): expel player from quest dungeon
// Finds quest branch; schedule_goto() to parent dungeon.
// seal=TRUE: removes the magic portal permanently, sets qexpelled.
// TODO: quest.c:186 — expulsion(): force-return from quest branch

// cf. quest.c:225 — finish_quest(obj): handle quest artifact return to leader
// obj=NULL: player has Amulet — calls qt_pager("hasamulet").
// obj=quest artifact: qt_pager("offeredit" / "offeredit2"), sets qcompleted.
// obj=other item: verbalize item recognition (fakes, invocation items).
// TODO: quest.c:225 — finish_quest(): quest completion with leader

// cf. quest.c:282 [static] — chat_with_leader(mtmp): leader conversation logic
// Rule 0: cheater check (has artifact without meeting nemesis).
// Rule 1-4: got_thanks / has artifact / got_quest / not yet worthy.
// Checks not_capable, is_pure; expels if not eligible; assigns quest.
// TODO: quest.c:282 — chat_with_leader(): quest leader dialog tree

// cf. quest.c:357 — leader_speaks(mtmp): leader is chatted with or becomes hostile
// If hostile: qt_pager("leader_last"); sets pissed_off; activates monster.
// If not on qstart level: return. Else calls chat_with_leader().
// TODO: quest.c:357 — leader_speaks(): leader NPC response to chat

// cf. quest.c:380 [static] — chat_with_nemesis(): nemesis conversation
// qt_pager("discourage"); increments met_nemesis counter.
// TODO: quest.c:380 — chat_with_nemesis(): nemesis taunt dialog

// cf. quest.c:388 — nemesis_speaks(): nemesis NPC response to chat
// Selects message based on in_battle, made_goal counter, has questart flag.
// Messages: nemesis_wantsit / nemesis_first / nemesis_next / nemesis_other / discourage.
// TODO: quest.c:388 — nemesis_speaks(): nemesis taunts and threats

// cf. quest.c:411 — nemesis_stinks(mx, my): gas cloud on nemesis death
// Creates a gas cloud at (mx,my) with radius=5, damage=8.
// Uses mon_moving context so hero is not attributed with the cloud.
// TODO: quest.c:411 — nemesis_stinks(): nemesis death gas cloud

// cf. quest.c:427 [static] — chat_with_guardian(): guardian NPC dialog
// qt_pager("guardtalk_after") if quest done; else qt_pager("guardtalk_before").
// TODO: quest.c:427 — chat_with_guardian(): guardian NPC dialog

// cf. quest.c:437 [static] — prisoner_speaks(mtmp): prisoner awakening
// If mtmp is a PRISONER monster in waiting strategy: awakens it, says
//   "I'm finally free!", sets mpeaceful; adjusts alignment +3; angers guards.
// TODO: quest.c:437 — prisoner_speaks(): prisoner NPC activation

// cf. quest.c:459 — quest_chat(mtmp): dispatch chat to quest NPC
// Routes to chat_with_leader / chat_with_nemesis / chat_with_guardian
//   based on mtmp->m_id (leader) or msound (MS_NEMESIS/MS_GUARDIAN).
// Called from domonnoise() (sounds.c) for quest NPCs.
// TODO: quest.c:459 — quest_chat(): quest NPC chat dispatcher

// cf. quest.c:481 — quest_talk(mtmp): dispatch proactive NPC talk
// Routes to leader_speaks / nemesis_speaks / prisoner_speaks
//   based on m_id or msound.
// Called from monmove() and other combat events.
// TODO: quest.c:481 — quest_talk(): quest NPC proactive speech

// cf. quest.c:499 — quest_stat_check(mtmp): update nemesis battle status
// Sets Qstat(in_battle)=TRUE if nemesis is not helpless and adjacent to player.
// Called each turn to update nemesis battle state for speech selection.
// TODO: quest.c:499 — quest_stat_check(): nemesis proximity tracking
