// sounds.js -- Monster sounds, ambient room sounds, chat command
// cf. sounds.c — dosounds, domonnoise, growl/yelp/whimper/beg, dotalk/dochat,
//                maybe_gasp, cry_sound, set_voice, sound library system
//
// Three subsystems:
// 1. Ambient room sounds: dosounds() — per-turn feature-triggered messages
//    (fountains, sinks, court, swamp, vault, beehive, morgue, barracks, zoo,
//    shop, leprechaun hall, temple, zoo, oracle).
// 2. Monster vocalization: domonnoise() dispatches on mtmp->data->msound (MS_*);
//    pet distress: growl(), yelp(), whimper(), beg();
//    helper strings: growl_sound(), cry_sound(); gasp: maybe_gasp().
// 3. Chat command: dotalk() → dochat() → getdir + responsive_mon_at + domonnoise;
//    tiphat() for non-monster 't' targets.
// 4. Sound library (N/A for browser port): add_sound_mapping, play_sound_for_message,
//    maybe_play_sound, release_sound_mappings, activate_chosen_soundlib,
//    assign_soundlib, get_soundlib_name, soundlib_id_from_opt,
//    get_sound_effect_filename, base_soundname_to_filename, set_voice, sound_speak.
//    nosound_* no-op stubs for the null sound backend.
//
// JS implementations:
//   dosounds() → dosounds() method on NetHack class (nethack.js:1759)
//                and headless_runtime.js:977. Partially implemented:
//                fountains/sinks/vault/barracks/shop messages done;
//                throne/beehive/morgue/zoo stubs (return early consuming rn2).
//   All other functions → not implemented in JS.
//   Sound library and set_voice: N/A (browser port has no audio subsystem).

// cf. sounds.c:19 [static] — mon_in_room(mon, rmtyp): check if monster is in room type
// Returns TRUE if mon's tile has a room number and that room's rtype == rmtyp.
// Used by throne/beehive/morgue/zoo/temple ambient sound helpers.
// TODO: sounds.c:19 — mon_in_room(): monster room-type predicate

// cf. sounds.c:29 [static] — throne_mon_sound(mtmp): throne room ambient sound
// Fires if monster is lord/prince or sleeping, non-animal, in COURT room.
// Messages: courtly conversation / sceptre pounded / "Off with X head!" / Queen Beruthiel's cats.
// Hallucination shifts selection up by 1 (toward sillier messages).
// TODO: sounds.c:29 — throne_mon_sound(): throne room ambient

// cf. sounds.c:61 [static] — beehive_mon_sound(mtmp): beehive ambient sound
// Fires for S_ANT flyers in BEEHIVE room. Messages: low buzzing / angry drone / bees in bonnet.
// TODO: sounds.c:61 — beehive_mon_sound(): beehive ambient

// cf. sounds.c:88 [static] — morgue_mon_sound(mtmp): morgue ambient sound
// Fires for undead/vampshifters in MORGUE. Messages: "unnaturally quiet" /
//   hair stands up on neck / hair seems to stand up.
// TODO: sounds.c:88 — morgue_mon_sound(): morgue ambient

// cf. sounds.c:114 [static] — zoo_mon_sound(mtmp): zoo ambient sound
// Fires for sleeping or animal monsters in ZOO.
// Messages: elephant on peanut / seal barking / Doctor Dolittle.
// TODO: sounds.c:114 — zoo_mon_sound(): zoo ambient

// cf. sounds.c:130 [static] — temple_priest_sound(mtmp): temple ambient sound
// Fires for awake priests in their temple, hero not in that temple.
// Messages: praising deity / beseeching deity / animal sacrifice / plea for donations.
// Skips speech messages if monster can't speak; skips altar message if priest/altar visible.
// TODO: sounds.c:130 — temple_priest_sound(): temple ambient

// cf. sounds.c:180 [static] — oracle_sound(mtmp): oracle ambient sound
// Fires for Oracle monster when hallucinating or out of sight.
// Messages: strange wind / convulsive ravings / snoring snakes / no more woodchucks / loud ZOT.
// TODO: sounds.c:180 — oracle_sound(): oracle ambient

// cf. sounds.c:201 — dosounds(): per-turn ambient level sound effects
// Checks level feature flags in order; each check uses !rn2(N) and short-circuits.
// Order: fountains(400) → sinks(300) → court(200) → swamp(200) → vault(200) →
//   beehive(200) → morgue(200) → barracks(200) → zoo(200) → shop(200) →
//   leprehall(200) → temple(200) → oracle(200).
// Fountains and sinks don't return early; all others return after triggering.
// Uses get_iter_mons() for throne/beehive/morgue/zoo/temple/oracle which walk
//   monster list calling the appropriate *_mon_sound helper.
// Skips entirely if Deaf or !flags.acoustics or swallowed or Underwater.
// JS equivalent: dosounds() method in nethack.js:1759 and headless_runtime.js:977.
//   Implemented: fountains, sinks, vault, barracks, shop, swamp.
//   Stubbed (consumes rn2 only): court, beehive, morgue, zoo.
//   Missing: leprehall, temple, oracle.
// PARTIAL: sounds.c:201 — dosounds() ↔ dosounds() (nethack.js:1759, headless_runtime.js:977)

// cf. sounds.c:350 — growl_sound(mtmp): return growl verb string for monster's sound type
// Maps MS_* sound type to string: MS_MEW/HISS→"hiss", MS_BARK/GROWL→"growl",
//   MS_ROAR→"roar", MS_BELLOW→"bellow", MS_BUZZ→"buzz", MS_SQEEK→"squeal",
//   MS_SQAWK→"screech", MS_NEIGH→"neigh", MS_WAIL→"wail", MS_GROAN→"groan",
//   MS_MOO→"low", MS_SILENT→"commotion", default→"scream".
// TODO: sounds.c:350 — growl_sound(): growl verb for monster type

// cf. sounds.c:401 — growl(mtmp): seriously abused pet growls at hero
// Skips if helpless or MS_SILENT. Picks growl_sound() verb (or hallucination sound).
// Prints "<Monster> <verb>s!" if can see or not Deaf; sets iflags.last_msg = PLNMSG_GROWL;
//   stops running; wakes monsters within mlevel*18.
// Called from dogmove.c when hero attacks own pet.
// TODO: sounds.c:401 — growl(): pet growl on abuse

// cf. sounds.c:426 — yelp(mtmp): mistreated pet yelps
// MS_ → verb: MEW→"yowl"/Deaf:"arch"; BARK/GROWL→"yelp"/Deaf:"recoil";
//   ROAR→"snarl"/Deaf:"bluff"; SQEEK→"squeal"/Deaf:"quiver";
//   SQAWK→"screak"/Deaf:"thrash"; WAIL→"wail"/Deaf:"cringe".
// Plays sound effect. Stops running; wakes within mlevel*12.
// Referenced as omitted in dogmove.js.
// TODO: sounds.c:426 — yelp(): pet yelp on mistreatment

// cf. sounds.c:478 — whimper(mtmp): distressed pet whimpers
// MS_MEW/GROWL→"whimper", MS_BARK→"whine", MS_SQEEK→"squeal".
// Plays sound effect (non-hallucination). Stops running; wakes within mlevel*6.
// Referenced as omitted in dogmove.js (leashed pet at trap).
// TODO: sounds.c:478 — whimper(): pet whimper when distressed

// cf. sounds.c:518 — beg(mtmp): hungry pet begs for food
// Skips if helpless or not carnivorous/herbivorous.
// Animal (msound<=MS_ANIMAL, not silent): domonnoise().
// Humanoid (msound>=MS_HUMANOID): verbalize("I'm hungry.") with map_invisible.
// Other: "seems famished" pline if visible.
// Referenced as omitted in dogmove.js.
// TODO: sounds.c:518 — beg(): hungry pet begging

// cf. sounds.c:545 — maybe_gasp(mon): hero attacked a peaceful monster — does it gasp?
// Returns one of "Gasp!"/"Uh-oh."/"Oh my!"/"What?"/"Why?" if monster can/would react.
// Humanoid speech types (MS_HUMANOID, MS_ARREST, MS_SOLDIER, MS_GUARD, MS_NURSE,
//   MS_SEDUCE, MS_LEADER, MS_GUARDIAN, MS_SELL, MS_ORACLE, MS_PRIEST, MS_BOAST,
//   MS_IMITATE): always gasp.
// Semi-speech types (MS_ORC, MS_GRUNT, MS_LAUGH, MS_ROAR, etc.): gasp only if
//   same mlet as hero (similar creature).
// Non-social (MS_BRIBE, MS_CUSS, MS_RIDER, MS_NEMESIS, MS_SILENT): no gasp.
// Guardian and cross-aligned priest sounds downgraded to MS_SILENT.
// TODO: sounds.c:545 — maybe_gasp(): peaceful monster reaction to being attacked

// cf. sounds.c:616 — cry_sound(mtmp): sound verb for a hatching egg
// Used with "ing" suffix: "chitter", "hiss", "growl", "chirp", "buzz",
//   "screech", "grunt", "mumble" based on ms_sound type.
// MS_SILENT+S_EEL → "gurgle"; MS_SILENT otherwise → "chitter".
// TODO: sounds.c:616 — cry_sound(): hatchling sound string

// cf. sounds.c:658 [static] — mon_is_gecko(mon): check if monster appears as gecko
// Returns TRUE if actually gecko; FALSE if long worm; else checks glyph_to_mon() == PM_GECKO
//   (could be true due to hallucination or mimicry).
// Used by domonnoise to give gecko hallucination a "15 minutes" shopkeeper spiel.
// TODO: sounds.c:658 — mon_is_gecko(): gecko appearance check

// cf. sounds.c:678 — domonnoise(mtmp): monster makes its characteristic sound/speech
// Large dispatch on mtmp->data->msound (MS_*) after adjustments:
//   leader override (quest leader by m_id), guardian same-genus fallback,
//   shopkeeper → MS_SELL, orc + same-race/hallucination → MS_HUMANOID,
//   non-tame moo → MS_BELLOW, hallucination+gecko → MS_SELL.
// Key dispatches:
//   MS_ORACLE → doconsult(); MS_PRIEST → priest_talk(); MS_LEADER/NEMESIS/GUARDIAN → quest_chat();
//   MS_SELL → shk_chat() or hallucination GEICO joke;
//   MS_VAMPIRE → varied messages by night/tameness/kindred;
//   MS_WERE → moon-phase messages; MS_BARK → dog barking/howling/etc;
//   MS_MEW → cat sounds; MS_ROAR → roaring; MS_GROWL/HISS/etc → animal sounds;
//   MS_HUMANOID → random humanoid phrases; MS_GUARD → vault guard lines;
//   MS_SOLDIER → army phrases; MS_ARREST → Kop lines; MS_NURSE → heal/strip message;
//   MS_SEDUCE → nymph/demon seduction; MS_RIDER → "We are the Three";
//   MS_SPELL → magic-user incantations; ... many more.
// TODO: sounds.c:678 — domonnoise(): monster vocalization dispatch

// cf. sounds.c:1247 — dotalk(): 't' command — talk to a monster
// Thin wrapper: calls dochat() and returns result.
// TODO: sounds.c:1247 — dotalk(): chat command handler

// cf. sounds.c:1256 [static] — dochat(): implementation of talk command
// Checks: hero is silent (can't speak), Strangled, swallowed, Underwater.
// Standing on shop item → price_quote() (interrupts other chat).
// getdir prompt; steed (dz<0) → domonnoise(usteed); dz≠0 → up/down message;
//   dx==dy==0 → "talking to yourself" message.
// responsive_mon_at(tx,ty) to find chatted-with monster.
// No monster/mundetected: statue message or wall knock (IS_WALL/SDOOR).
// Has monster: domonnoise(mtmp) or tiphat().
// TODO: sounds.c:1256 — dochat(): chat implementation

// cf. sounds.c:1412 [static] — responsive_mon_at(x, y): find monster at position for chat
// Returns monster at (x,y) if visible/detectable (canspotmon or Blind+Telepat check).
// Skips invisible/undetectable monsters for chat targeting.
// TODO: sounds.c:1412 — responsive_mon_at(): chatting target selection

// cf. sounds.c:1426 — tiphat(): non-monster target for 't' chat
// Prints "You tip your <hat type>" when no monster to chat with.
// Hat types: helmet/hard hat/dunce cap/pointy hat/fedora/porkpie/etc.
// TODO: sounds.c:1426 — tiphat(): hat-tip when nothing to chat with

// cf. sounds.c:1555 — add_sound_mapping(mapping): add sound-effect → filename mapping
// Parses "soundname=filename" option string; stored in sound_mappings[].
// N/A: browser port has no audio file system.
// N/A: sounds.c:1555 — add_sound_mapping()

// cf. sounds.c:1628 [static] — sound_matches_message(msg): check if sound mapping matches
// N/A: sounds.c:1628 — sound_matches_message()

// cf. sounds.c:1641 — play_sound_for_message(msg): play audio matching a message string
// N/A: sounds.c:1641 — play_sound_for_message()

// cf. sounds.c:1658 — maybe_play_sound(msg): conditionally play sound for message
// N/A: sounds.c:1658 — maybe_play_sound()

// cf. sounds.c:1675 — release_sound_mappings(): free sound mapping table
// N/A: sounds.c:1675 — release_sound_mappings()

// cf. sounds.c:1778 — activate_chosen_soundlib(): activate the configured sound library
// N/A: sounds.c:1778 — activate_chosen_soundlib()

// cf. sounds.c:1797 — assign_soundlib(idx): assign sound library by index
// N/A: sounds.c:1797 — assign_soundlib()

// cf. sounds.c:1808 [static] — choose_soundlib(s): parse soundlib name option
// N/A: sounds.c:1808 — choose_soundlib()

// cf. sounds.c:1863 — get_soundlib_name(dest, maxlen): copy active soundlib name
// N/A: sounds.c:1863 — get_soundlib_name()

// cf. sounds.c:1882 — soundlib_id_from_opt(op): parse soundlib option string to id
// N/A: sounds.c:1882 — soundlib_id_from_opt()

// cf. sounds.c:1916..1952 [static] — nosound_*(): no-op stubs for null sound backend
// nosound_init_nhsound, nosound_exit_nhsound, nosound_achievement,
// nosound_soundeffect, nosound_hero_playnotes, nosound_play_usersound,
// nosound_ambience, nosound_verbal — all no-ops forming the default soundlib.
// N/A: browser port uses no audio backend.
// N/A: sounds.c:1916 — nosound_* stubs

// cf. sounds.c:1980 [static] — initialize_semap_basenames(): init sound-effect base names
// Fills semap[] table mapping sound effect enum to base filename.
// N/A: sounds.c:1980 — initialize_semap_basenames()

// cf. sounds.c:1994 — get_sound_effect_filename(seidint, buf, bufsz, ...): sound file path
// Looks up sound effect id in semap[], applies user mapping overrides, builds path.
// N/A: sounds.c:1994 — get_sound_effect_filename()

// cf. sounds.c:2083 — base_soundname_to_filename(basename, buf, bufsz, approach): convert name to path
// Searches sound directories for basename with known audio extensions.
// N/A: sounds.c:2083 — base_soundname_to_filename()

// cf. sounds.c:2160 — set_voice(mtmp, tone, volume, moreinfo): configure voice for verbalize
// Sets voice parameters for the next verbalize()/verbalize1() call.
// In C: calls soundlib->verbal() with the voice parameters.
// Referenced in outrumor() (BY_ORACLE path uses SetVoice macro) and beg().
// N/A: browser port has no audio/TTS system.
// N/A: sounds.c:2160 — set_voice()

// cf. sounds.c:2184 — sound_speak(text): speak text with current voice settings
// Invokes soundlib verbal() with the text and stored voice parameters.
// N/A: sounds.c:2184 — sound_speak()
