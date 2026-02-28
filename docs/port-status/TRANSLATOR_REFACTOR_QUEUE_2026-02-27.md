# Translator Refactor Queue (2026-02-27)

Generated from `/tmp/translator-refactor-queue-gapwave2-fix9.json` after safety+stitch dry-run.

- Total tasks: 709
- add_missing_call_binding: 7
- add_missing_identifier: 668
- rename_alias: 34

## Top Modules
- `js/shk.js`: 134
- `js/invent.js`: 120
- `js/do.js`: 87
- `js/mkobj.js`: 78
- `js/apply.js`: 71
- `js/spell.js`: 61
- `js/steal.js`: 33
- `js/detect.js`: 27
- `js/engrave.js`: 25
- `js/fountain.js`: 22
- `js/lock.js`: 17
- `js/attrib.js`: 13
- `js/sounds.js`: 12
- `js/bones.js`: 8
- `js/exper.js`: 1

## Alias Renames (Auto-caught)
- `js/apply.js::snuff_candle`: `Is_candle->isCandle`
- `js/apply.js::splash_lit`: `humanoid->is_humanoid`
- `js/attrib.js::losestr`: `Upolyd->isUpolyd`
- `js/attrib.js::restore_attrib`: `ACURR->acurr`
- `js/attrib.js::restore_attrib`: `A_MAX->AMAX`
- `js/attrib.js::acurrstr`: `ACURR->acurr`
- `js/detect.js::openit`: `openone->openone_fn`
- `js/detect.js::premap_detect`: `map_background->magic_map_background`
- `js/do.js::doaltarobj`: `Doname2->doname`
- `js/do.js::currentlevel_rewrite`: `pline1->pline`
- `js/do.js::familiar_level_msg`: `pline1->pline`
- `js/do.js::deferred_goto`: `pline1->pline`
- `js/do.js::revive_mon`: `REVIVE_MON->revive_mon`
- `js/do.js::legs_in_no_shape`: `makeplural->makeplural_simple`
- `js/do.js::heal_legs`: `makeplural->makeplural_simple`
- `js/invent.js::merged`: `setnotworn->setnotworn_safe`
- `js/invent.js::addinv_core2`: `observe_object->observeObject`
- `js/invent.js::consume_obj_charge`: `check_unpaid->ckunpaid`
- `js/invent.js::fully_identify_obj`: `observe_object->observeObject`
- `js/lock.js::stumble_on_door_mimic`: `m_at->mat`
- `js/lock.js::stumble_on_door_mimic`: `stumble_onto_mimic->stumble_on_door_mimic`
- `js/mkobj.js::mkcorpstat`: `start_corpse_timeout->start_corpse_timeout_rng`
- `js/shk.js::remote_burglary`: `in_rooms->inRoomsAt`
- `js/shk.js::shopper_financial_report`: `inside_shop->insideShop`
- `js/shk.js::inhishop`: `in_rooms->inRoomsAt`
- `js/shk.js::find_objowner`: `in_rooms->inRoomsAt`
- `js/shk.js::hot_pursuit`: `clear_no_charge_pets->clear_no_charge`
- `js/shk.js::stolen_value`: `in_rooms->inRoomsAt`
- `js/shk.js::shkcatch`: `inside_shop->insideShop`
- `js/shk.js::price_quote`: `inside_shop->insideShop`
- `js/shk.js::costly_gold`: `in_rooms->inRoomsAt`
- `js/shk.js::block_door`: `in_rooms->inRoomsAt`
- `js/shk.js::globby_bill_fixup`: `in_rooms->inRoomsAt`
- `js/spell.js::getspell`: `pline1->pline`

## First Actionable Slice
- `add_missing_identifier` js/apply.js::do_blinding_ray (FLASHED_LIGHT)
- `add_missing_identifier` js/apply.js::do_blinding_ray (bhit)
- `add_missing_identifier` js/apply.js::do_blinding_ray (flash_hits_mon)
- `add_missing_identifier` js/apply.js::do_blinding_ray (see_monster_closeup)
- `add_missing_identifier` js/apply.js::do_blinding_ray (transient_light_cleanup)
- `add_missing_call_binding` js/apply.js::um_dist (abs)
- `add_missing_identifier` js/apply.js::o_unleash (fmon)
- `add_missing_identifier` js/apply.js::o_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::m_unleash (canseemon)
- `add_missing_identifier` js/apply.js::m_unleash (get_mleash)
- `add_missing_identifier` js/apply.js::m_unleash (mhis)
- `add_missing_identifier` js/apply.js::m_unleash (update_inventory)
- `add_missing_identifier` js/apply.js::next_to_u (get_iter_mons)
- `add_missing_identifier` js/apply.js::next_to_u (mon_has_amulet)
- `rename_alias` js/apply.js::snuff_candle (Is_candle->isCandle)
- `add_missing_identifier` js/apply.js::snuff_candle (Blind)
- `add_missing_identifier` js/apply.js::snuff_candle (OBJ_MINVENT)
- `add_missing_identifier` js/apply.js::snuff_candle (Shk_Your)
- `add_missing_identifier` js/apply.js::snuff_candle (cansee)
- `add_missing_identifier` js/apply.js::snuff_candle (get_obj_location)
- `rename_alias` js/apply.js::splash_lit (humanoid->is_humanoid)
- `add_missing_identifier` js/apply.js::splash_lit (Blind)
- `add_missing_identifier` js/apply.js::splash_lit (Deaf)
- `add_missing_identifier` js/apply.js::splash_lit (Flying)
- `add_missing_identifier` js/apply.js::splash_lit (Is_waterlevel)
