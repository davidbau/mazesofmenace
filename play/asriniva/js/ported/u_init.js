/* NetHack 5.0	u_init.c	$NHDT-Date: 1769398807 2026/01/25 19:40:07 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.121 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2017. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/*
 *      Initial inventory for the various roles.
 */

export const Archeologist = [
    /* if adventure has a name...  idea from tan@uvm-gen */
    [ "BULLWHIP", 2, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "LEATHER_JACKET", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FEDORA", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FOOD_RATION", 0, "FOOD_CLASS", 3, 3, 0 ],
    [ "PICK_AXE", "UNDEF_SPE", "TOOL_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "TINNING_KIT", "UNDEF_SPE", "TOOL_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "TOUCHSTONE", 0, "GEM_CLASS", 1, 1, 0 ],
    [ "SACK", 0, "TOOL_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Barbarian_0 = [
    [ "TWO_HANDED_SWORD", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "AXE", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "RING_MAIL", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FOOD_RATION", 0, "FOOD_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Barbarian_1 = [
    [ "BATTLE_AXE", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SHORT_SWORD", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "RING_MAIL", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FOOD_RATION", 0, "FOOD_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Cave_man = [
    [ "CLUB", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SLING", 2, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FLINT", 0, "GEM_CLASS", 10, 20, "UNDEF_BLESS" ],
    [ "ROCK", 0, "GEM_CLASS", 3, 3, 0 ], /* yields 18..33 */
    [ "LEATHER_ARMOR", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Healer = [
    [ "SCALPEL", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "LEATHER_GLOVES", 1, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "STETHOSCOPE", 0, "TOOL_CLASS", 1, 1, 0 ],
    [ "POT_HEALING", 0, "POTION_CLASS", 4, 4, "UNDEF_BLESS" ],
    [ "POT_EXTRA_HEALING", 0, "POTION_CLASS", 4, 4, "UNDEF_BLESS" ],
    [ "WAN_SLEEP", "UNDEF_SPE", "WAND_CLASS", 1, 1, "UNDEF_BLESS" ],
    /* always blessed, so it's guaranteed readable */
    [ "SPE_HEALING", 0, "SPBOOK_CLASS", 1, 1, 1 ],
    [ "SPE_EXTRA_HEALING", 0, "SPBOOK_CLASS", 1, 1, 1 ],
    [ "SPE_STONE_TO_FLESH", 0, "SPBOOK_CLASS", 1, 1, 1 ],
    [ "APPLE", 0, "FOOD_CLASS", 5, 5, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Knight = [
    [ "LONG_SWORD", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "LANCE", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "RING_MAIL", 1, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "HELMET", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SMALL_SHIELD", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "LEATHER_GLOVES", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "APPLE", 0, "FOOD_CLASS", 10, 10, 0 ],
    [ "CARROT", 0, "FOOD_CLASS", 10, 10, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Monk = [
    [ "LEATHER_GLOVES", 2, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "ROBE", 1, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "SCROLL_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "POT_HEALING", 0, "POTION_CLASS", 3, 3, "UNDEF_BLESS" ],
    [ "FOOD_RATION", 0, "FOOD_CLASS", 3, 3, 0 ],
    [ "APPLE", 0, "FOOD_CLASS", 5, 5, "UNDEF_BLESS" ],
    [ "ORANGE", 0, "FOOD_CLASS", 5, 5, "UNDEF_BLESS" ],
    /* Yes, we know fortune cookies aren't really from China.  They were
       invented by George Jung in Los Angeles, California, USA in 1916. */
    [ "FORTUNE_COOKIE", 0, "FOOD_CLASS", 3, 3, "UNDEF_BLESS" ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Priest = [
    [ "MACE", 1, "WEAPON_CLASS", 1, 1, 1 ],
    [ "ROBE", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SMALL_SHIELD", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "POT_WATER", 0, "POTION_CLASS", 4, 4, 1 ], /* holy water */
    [ "CLOVE_OF_GARLIC", 0, "FOOD_CLASS", 1, 1, 0 ],
    [ "SPRIG_OF_WOLFSBANE", 0, "FOOD_CLASS", 1, 1, 0 ],
    [ "UNDEF_TYP", "UNDEF_SPE", "SPBOOK_CLASS", 2, 2, "UNDEF_BLESS" ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Ranger = [
    [ "DAGGER", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "BOW", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "ARROW", 2, "WEAPON_CLASS", 50, 59, "UNDEF_BLESS" ],
    [ "ARROW", 0, "WEAPON_CLASS", 30, 39, "UNDEF_BLESS" ],
    [ "CLOAK_OF_DISPLACEMENT", 2, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "CRAM_RATION", 0, "FOOD_CLASS", 4, 4, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Rogue = [
    [ "SHORT_SWORD", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "DAGGER", 0, "WEAPON_CLASS", 6, 15, 0 ],
    [ "LEATHER_ARMOR", 1, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "POT_SICKNESS", 0, "POTION_CLASS", 1, 1, 0 ],
    [ "LOCK_PICK", 0, "TOOL_CLASS", 1, 1, 0 ],
    [ "SACK", 0, "TOOL_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Samurai = [
    [ "KATANA", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SHORT_SWORD", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ], /* wakizashi */
    [ "YUMI", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "YA", 0, "WEAPON_CLASS", 26, 45, "UNDEF_BLESS" ],
    [ "SPLINT_MAIL", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Tourist = [
    [ "DART", 2, "WEAPON_CLASS", 21, 40, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "FOOD_CLASS", 10, 10, 0 ],
    [ "POT_EXTRA_HEALING", 0, "POTION_CLASS", 2, 2, "UNDEF_BLESS" ],
    [ "SCR_MAGIC_MAPPING", 0, "SCROLL_CLASS", 4, 4, "UNDEF_BLESS" ],
    [ "HAWAIIAN_SHIRT", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "EXPENSIVE_CAMERA", "UNDEF_SPE", "TOOL_CLASS", 1, 1, 0 ],
    [ "CREDIT_CARD", 0, "TOOL_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Valkyrie = [
    [ "SPEAR", 1, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "DAGGER", 0, "WEAPON_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "SMALL_SHIELD", 3, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "FOOD_RATION", 0, "FOOD_CLASS", 1, 1, 0 ],
    [ 0, 0, 0, 0, 0, 0 ]];
export const Wizard = [
    [ "QUARTERSTAFF", 1, "WEAPON_CLASS", 1, 1, 1 ],
    [ "CLOAK_OF_MAGIC_RESISTANCE", 0, "ARMOR_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "WAND_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "RING_CLASS", 2, 2, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "POTION_CLASS", 3, 3, "UNDEF_BLESS" ],
    [ "UNDEF_TYP", "UNDEF_SPE", "SCROLL_CLASS", 3, 3, "UNDEF_BLESS" ],
    [ "SPE_FORCE_BOLT", 0, "SPBOOK_CLASS", 1, 1, 1 ],
    [ "UNDEF_TYP", "UNDEF_SPE", "SPBOOK_CLASS", 1, 1, "UNDEF_BLESS" ],
    [ "MAGIC_MARKER", 19, "TOOL_CLASS", 1, 1, 0 ], /* actually spe = 18 + d4 */
    [ 0, 0, 0, 0, 0, 0 ]];

/*
 *      Optional extra inventory items.
 */

export const Healing_book = [ [ "SPE_HEALING", "UNDEF_SPE", "SPBOOK_CLASS", 1, 1, 1 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Protection_book = [ [ "SPE_PROTECTION", "UNDEF_SPE", "SPBOOK_CLASS", 1, 1, 1 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Confuse_monster_book = [ [ "SPE_CONFUSE_MONSTER", "UNDEF_SPE", "SPBOOK_CLASS", 1, 1, 1 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Tinopener = [ [ "TIN_OPENER", 0, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Magicmarker = [ [ "MAGIC_MARKER", 19, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Lamp = [ [ "OIL_LAMP", 1, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Blindfold = [ [ "BLINDFOLD", 0, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Xtra_food = [ [ "UNDEF_TYP", "UNDEF_SPE", "FOOD_CLASS", 2, 2, 0],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Leash = [ [ "LEASH", 0, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Towel = [ [ "TOWEL", 0, "TOOL_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Wishing = [ [ "WAN_WISHING", 3, "WAND_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];
export const Money = [ [ "GOLD_PIECE", 0, "COIN_CLASS", 1, 1, 0 ],
      [ 0, 0, 0, 0, 0, 0 ] ];

/* race-based substitutions for initial inventory;
   the weaker cloak for elven rangers is intentional--they shoot better */
export const inv_subs = [
    [ "PM_ELF", "DAGGER", "ELVEN_DAGGER" ],
    [ "PM_ELF", "SPEAR", "ELVEN_SPEAR" ],
    [ "PM_ELF", "SHORT_SWORD", "ELVEN_SHORT_SWORD" ],
    [ "PM_ELF", "BOW", "ELVEN_BOW" ],
    [ "PM_ELF", "ARROW", "ELVEN_ARROW" ],
    [ "PM_ELF", "HELMET", "ELVEN_LEATHER_HELM" ],
    /* { PM_ELF, SMALL_SHIELD, ELVEN_SHIELD }, */
    [ "PM_ELF", "CLOAK_OF_DISPLACEMENT", "ELVEN_CLOAK" ],
    [ "PM_ELF", "CRAM_RATION", "LEMBAS_WAFER" ],
    [ "PM_ORC", "DAGGER", "ORCISH_DAGGER" ],
    [ "PM_ORC", "SPEAR", "ORCISH_SPEAR" ],
    [ "PM_ORC", "SHORT_SWORD", "ORCISH_SHORT_SWORD" ],
    [ "PM_ORC", "BOW", "ORCISH_BOW" ],
    [ "PM_ORC", "ARROW", "ORCISH_ARROW" ],
    [ "PM_ORC", "HELMET", "ORCISH_HELM" ],
    [ "PM_ORC", "SMALL_SHIELD", "ORCISH_SHIELD" ],
    [ "PM_ORC", "RING_MAIL", "ORCISH_RING_MAIL" ],
    [ "PM_ORC", "CHAIN_MAIL", "ORCISH_CHAIN_MAIL" ],
    [ "PM_ORC", "CRAM_RATION", "TRIPE_RATION" ],
    [ "PM_ORC", "LEMBAS_WAFER", "TRIPE_RATION" ],
    [ "PM_DWARF", "SPEAR", "DWARVISH_SPEAR" ],
    [ "PM_DWARF", "SHORT_SWORD", "DWARVISH_SHORT_SWORD" ],
    [ "PM_DWARF", "HELMET", "DWARVISH_IRON_HELM" ],
    /* { PM_DWARF, SMALL_SHIELD, DWARVISH_ROUNDSHIELD }, */
    /* { PM_DWARF, PICK_AXE, DWARVISH_MATTOCK }, */
    [ "PM_DWARF", "LEMBAS_WAFER", "CRAM_RATION" ],
    [ "PM_GNOME", "BOW", "CROSSBOW" ],
    [ "PM_GNOME", "ARROW", "CROSSBOW_BOLT" ],
    [ "NON_PM", "STRANGE_OBJECT", "STRANGE_OBJECT" ]];

export const Skill_A = [
    [ "P_DAGGER", "P_BASIC" ],
    [ "P_KNIFE", "P_BASIC" ],
    [ "P_PICK_AXE", "P_EXPERT" ],
    [ "P_SHORT_SWORD", "P_BASIC" ],
    [ "P_SABER", "P_EXPERT" ],
    [ "P_CLUB", "P_SKILLED" ],
    [ "P_QUARTERSTAFF", "P_SKILLED" ],
    [ "P_SLING", "P_SKILLED" ],
    [ "P_DART", "P_BASIC" ],
    [ "P_BOOMERANG", "P_EXPERT" ],
    [ "P_WHIP", "P_EXPERT" ],
    [ "P_UNICORN_HORN", "P_SKILLED" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_HEALING_SPELL", "P_BASIC" ],
    [ "P_DIVINATION_SPELL", "P_EXPERT" ],
    [ "P_MATTER_SPELL", "P_BASIC" ],
    [ "P_RIDING", "P_BASIC" ],
    [ "P_TWO_WEAPON_COMBAT", "P_BASIC" ],
    [ "P_BARE_HANDED_COMBAT", "P_EXPERT" ],
    [ "P_NONE", 0 ]];
export const Skill_B = [
    [ "P_DAGGER", "P_BASIC" ],
    [ "P_AXE", "P_EXPERT" ],
    [ "P_PICK_AXE", "P_SKILLED" ],
    [ "P_SHORT_SWORD", "P_EXPERT" ],
    [ "P_BROAD_SWORD", "P_SKILLED" ],
    [ "P_LONG_SWORD", "P_SKILLED" ],
    [ "P_TWO_HANDED_SWORD", "P_EXPERT" ],
    [ "P_SABER", "P_SKILLED" ],
    [ "P_CLUB", "P_SKILLED" ],
    [ "P_MACE", "P_SKILLED" ],
    [ "P_MORNING_STAR", "P_SKILLED" ],
    [ "P_FLAIL", "P_BASIC" ],
    [ "P_HAMMER", "P_EXPERT" ],
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_SPEAR", "P_SKILLED" ],
    [ "P_TRIDENT", "P_SKILLED" ],
    [ "P_BOW", "P_BASIC" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_ESCAPE_SPELL", "P_BASIC" ], /* special spell is haste self */
    [ "P_RIDING", "P_BASIC" ],
    [ "P_TWO_WEAPON_COMBAT", "P_BASIC" ],
    [ "P_BARE_HANDED_COMBAT", "P_MASTER" ],
    [ "P_NONE", 0 ]];
export const Skill_C = [
    [ "P_DAGGER", "P_BASIC" ],
    [ "P_KNIFE", "P_SKILLED" ],
    [ "P_AXE", "P_SKILLED" ],
    [ "P_PICK_AXE", "P_BASIC" ],
    [ "P_CLUB", "P_EXPERT" ],
    [ "P_MACE", "P_EXPERT" ],
    [ "P_MORNING_STAR", "P_BASIC" ],
    [ "P_FLAIL", "P_SKILLED" ],
    [ "P_HAMMER", "P_SKILLED" ],
    [ "P_QUARTERSTAFF", "P_EXPERT" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_EXPERT" ],
    [ "P_TRIDENT", "P_SKILLED" ],
    [ "P_BOW", "P_SKILLED" ],
    [ "P_SLING", "P_EXPERT" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_MATTER_SPELL", "P_SKILLED" ],
    [ "P_BOOMERANG", "P_EXPERT" ],
    [ "P_UNICORN_HORN", "P_BASIC" ],
    [ "P_BARE_HANDED_COMBAT", "P_MASTER" ],
    [ "P_NONE", 0 ]];
export const Skill_H = [
    [ "P_DAGGER", "P_SKILLED" ],
    [ "P_KNIFE", "P_EXPERT" ],
    [ "P_SHORT_SWORD", "P_SKILLED" ],
    [ "P_SABER", "P_BASIC" ],
    [ "P_CLUB", "P_SKILLED" ],
    [ "P_MACE", "P_BASIC" ],
    [ "P_QUARTERSTAFF", "P_EXPERT" ],
    [ "P_POLEARMS", "P_BASIC" ],
    [ "P_SPEAR", "P_BASIC" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_SLING", "P_SKILLED" ],
    [ "P_DART", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_SKILLED" ],
    [ "P_UNICORN_HORN", "P_EXPERT" ],
    [ "P_HEALING_SPELL", "P_EXPERT" ],
    [ "P_BARE_HANDED_COMBAT", "P_BASIC" ],
    [ "P_NONE", 0 ]];
export const Skill_K = [
    [ "P_DAGGER", "P_BASIC" ],
    [ "P_KNIFE", "P_BASIC" ],
    [ "P_AXE", "P_SKILLED" ],
    [ "P_PICK_AXE", "P_BASIC" ],
    [ "P_SHORT_SWORD", "P_SKILLED" ],
    [ "P_BROAD_SWORD", "P_SKILLED" ],
    [ "P_LONG_SWORD", "P_EXPERT" ],
    [ "P_TWO_HANDED_SWORD", "P_SKILLED" ],
    [ "P_SABER", "P_SKILLED" ],
    [ "P_CLUB", "P_BASIC" ],
    [ "P_MACE", "P_SKILLED" ],
    [ "P_MORNING_STAR", "P_SKILLED" ],
    [ "P_FLAIL", "P_BASIC" ],
    [ "P_HAMMER", "P_BASIC" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_SKILLED" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_LANCE", "P_EXPERT" ],
    [ "P_BOW", "P_BASIC" ],
    [ "P_CROSSBOW", "P_SKILLED" ],
    [ "P_ATTACK_SPELL", "P_SKILLED" ],
    [ "P_HEALING_SPELL", "P_SKILLED" ],
    [ "P_CLERIC_SPELL", "P_SKILLED" ],
    [ "P_RIDING", "P_EXPERT" ],
    [ "P_TWO_WEAPON_COMBAT", "P_SKILLED" ],
    [ "P_BARE_HANDED_COMBAT", "P_EXPERT" ],
    [ "P_NONE", 0 ]];
export const Skill_Mon = [
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_SPEAR", "P_BASIC" ],
    [ "P_CROSSBOW", "P_BASIC" ],
    [ "P_SHURIKEN", "P_BASIC" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_HEALING_SPELL", "P_EXPERT" ],
    [ "P_DIVINATION_SPELL", "P_BASIC" ],
    [ "P_ENCHANTMENT_SPELL", "P_BASIC" ],
    [ "P_CLERIC_SPELL", "P_SKILLED" ],
    [ "P_ESCAPE_SPELL", "P_SKILLED" ],
    [ "P_MATTER_SPELL", "P_BASIC" ],
    [ "P_MARTIAL_ARTS", "P_GRAND_MASTER" ],
    [ "P_NONE", 0 ]];
export const Skill_P = [
    [ "P_CLUB", "P_EXPERT" ],
    [ "P_MACE", "P_EXPERT" ],
    [ "P_MORNING_STAR", "P_EXPERT" ],
    [ "P_FLAIL", "P_EXPERT" ],
    [ "P_HAMMER", "P_EXPERT" ],
    [ "P_QUARTERSTAFF", "P_EXPERT" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_SKILLED" ],
    [ "P_TRIDENT", "P_SKILLED" ],
    [ "P_LANCE", "P_BASIC" ],
    [ "P_BOW", "P_BASIC" ],
    [ "P_SLING", "P_BASIC" ],
    [ "P_CROSSBOW", "P_BASIC" ],
    [ "P_DART", "P_BASIC" ],
    [ "P_SHURIKEN", "P_BASIC" ],
    [ "P_BOOMERANG", "P_BASIC" ],
    [ "P_UNICORN_HORN", "P_SKILLED" ],
    [ "P_HEALING_SPELL", "P_EXPERT" ],
    [ "P_DIVINATION_SPELL", "P_EXPERT" ],
    [ "P_CLERIC_SPELL", "P_EXPERT" ],
    [ "P_BARE_HANDED_COMBAT", "P_BASIC" ],
    [ "P_NONE", 0 ]];
export const Skill_R = [
    [ "P_DAGGER", "P_EXPERT" ],
    [ "P_KNIFE", "P_EXPERT" ],
    [ "P_SHORT_SWORD", "P_EXPERT" ],
    [ "P_BROAD_SWORD", "P_SKILLED" ],
    [ "P_LONG_SWORD", "P_SKILLED" ],
    [ "P_TWO_HANDED_SWORD", "P_BASIC" ],
    [ "P_SABER", "P_SKILLED" ],
    [ "P_CLUB", "P_SKILLED" ],
    [ "P_MACE", "P_SKILLED" ],
    [ "P_MORNING_STAR", "P_BASIC" ],
    [ "P_FLAIL", "P_BASIC" ],
    [ "P_HAMMER", "P_BASIC" ],
    [ "P_POLEARMS", "P_BASIC" ],
    [ "P_SPEAR", "P_BASIC" ],
    [ "P_CROSSBOW", "P_EXPERT" ],
    [ "P_DART", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_SKILLED" ],
    [ "P_DIVINATION_SPELL", "P_SKILLED" ],
    [ "P_ESCAPE_SPELL", "P_SKILLED" ],
    [ "P_MATTER_SPELL", "P_SKILLED" ],
    [ "P_RIDING", "P_BASIC" ],
    [ "P_TWO_WEAPON_COMBAT", "P_EXPERT" ],
    [ "P_BARE_HANDED_COMBAT", "P_EXPERT" ],
    [ "P_NONE", 0 ]];
export const Skill_Ran = [
    [ "P_DAGGER", "P_EXPERT" ],
    [ "P_KNIFE", "P_SKILLED" ],
    [ "P_AXE", "P_SKILLED" ],
    [ "P_PICK_AXE", "P_BASIC" ],
    [ "P_SHORT_SWORD", "P_BASIC" ],
    [ "P_MORNING_STAR", "P_BASIC" ],
    [ "P_FLAIL", "P_SKILLED" ],
    [ "P_HAMMER", "P_BASIC" ],
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_EXPERT" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_BOW", "P_EXPERT" ],
    [ "P_SLING", "P_EXPERT" ],
    [ "P_CROSSBOW", "P_EXPERT" ],
    [ "P_DART", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_SKILLED" ],
    [ "P_BOOMERANG", "P_EXPERT" ],
    [ "P_WHIP", "P_BASIC" ],
    [ "P_HEALING_SPELL", "P_BASIC" ],
    [ "P_DIVINATION_SPELL", "P_EXPERT" ],
    [ "P_ESCAPE_SPELL", "P_BASIC" ],
    [ "P_RIDING", "P_BASIC" ],
    [ "P_BARE_HANDED_COMBAT", "P_BASIC" ],
    [ "P_NONE", 0 ]];
export const Skill_S = [
    [ "P_DAGGER", "P_BASIC" ],
    [ "P_KNIFE", "P_SKILLED" ],
    [ "P_SHORT_SWORD", "P_EXPERT" ],
    [ "P_BROAD_SWORD", "P_SKILLED" ],
    [ "P_LONG_SWORD", "P_EXPERT" ],
    [ "P_TWO_HANDED_SWORD", "P_EXPERT" ],
    [ "P_SABER", "P_BASIC" ],
    [ "P_FLAIL", "P_SKILLED" ],
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_SKILLED" ],
    [ "P_LANCE", "P_SKILLED" ],
    [ "P_BOW", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_EXPERT" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_DIVINATION_SPELL", "P_BASIC" ], /* special spell is clairvoyance */
    [ "P_CLERIC_SPELL", "P_SKILLED" ],
    [ "P_RIDING", "P_SKILLED" ],
    [ "P_TWO_WEAPON_COMBAT", "P_EXPERT" ],
    [ "P_MARTIAL_ARTS", "P_MASTER" ],
    [ "P_NONE", 0 ]];
export const Skill_T = [
    [ "P_DAGGER", "P_EXPERT" ],
    [ "P_KNIFE", "P_SKILLED" ],
    [ "P_AXE", "P_BASIC" ],
    [ "P_PICK_AXE", "P_BASIC" ],
    [ "P_SHORT_SWORD", "P_EXPERT" ],
    [ "P_BROAD_SWORD", "P_BASIC" ],
    [ "P_LONG_SWORD", "P_BASIC" ],
    [ "P_TWO_HANDED_SWORD", "P_BASIC" ],
    [ "P_SABER", "P_SKILLED" ],
    [ "P_MACE", "P_BASIC" ],
    [ "P_MORNING_STAR", "P_BASIC" ],
    [ "P_FLAIL", "P_BASIC" ],
    [ "P_HAMMER", "P_BASIC" ],
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_POLEARMS", "P_BASIC" ],
    [ "P_SPEAR", "P_BASIC" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_LANCE", "P_BASIC" ],
    [ "P_BOW", "P_BASIC" ],
    [ "P_SLING", "P_BASIC" ],
    [ "P_CROSSBOW", "P_BASIC" ],
    [ "P_DART", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_BASIC" ],
    [ "P_BOOMERANG", "P_BASIC" ],
    [ "P_WHIP", "P_BASIC" ],
    [ "P_UNICORN_HORN", "P_SKILLED" ],
    [ "P_DIVINATION_SPELL", "P_BASIC" ],
    [ "P_ENCHANTMENT_SPELL", "P_BASIC" ],
    [ "P_ESCAPE_SPELL", "P_SKILLED" ],
    [ "P_RIDING", "P_BASIC" ],
    [ "P_TWO_WEAPON_COMBAT", "P_SKILLED" ],
    [ "P_BARE_HANDED_COMBAT", "P_SKILLED" ],
    [ "P_NONE", 0 ]];
export const Skill_V = [
    [ "P_DAGGER", "P_EXPERT" ],
    [ "P_AXE", "P_EXPERT" ],
    [ "P_PICK_AXE", "P_SKILLED" ],
    [ "P_SHORT_SWORD", "P_SKILLED" ],
    [ "P_BROAD_SWORD", "P_SKILLED" ],
    [ "P_LONG_SWORD", "P_EXPERT" ],
    [ "P_TWO_HANDED_SWORD", "P_EXPERT" ],
    [ "P_SABER", "P_BASIC" ],
    [ "P_HAMMER", "P_EXPERT" ],
    [ "P_QUARTERSTAFF", "P_BASIC" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_EXPERT" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_LANCE", "P_SKILLED" ],
    [ "P_SLING", "P_BASIC" ],
    [ "P_ATTACK_SPELL", "P_BASIC" ],
    [ "P_ESCAPE_SPELL", "P_BASIC" ],
    [ "P_RIDING", "P_SKILLED" ],
    [ "P_TWO_WEAPON_COMBAT", "P_SKILLED" ],
    [ "P_BARE_HANDED_COMBAT", "P_EXPERT" ],
    [ "P_NONE", 0 ]];
export const Skill_W = [
    [ "P_DAGGER", "P_EXPERT" ],
    [ "P_KNIFE", "P_SKILLED" ],
    [ "P_AXE", "P_SKILLED" ],
    [ "P_SHORT_SWORD", "P_BASIC" ],
    [ "P_CLUB", "P_SKILLED" ],
    [ "P_MACE", "P_BASIC" ],
    [ "P_QUARTERSTAFF", "P_EXPERT" ],
    [ "P_POLEARMS", "P_SKILLED" ],
    [ "P_SPEAR", "P_BASIC" ],
    [ "P_TRIDENT", "P_BASIC" ],
    [ "P_SLING", "P_SKILLED" ],
    [ "P_DART", "P_EXPERT" ],
    [ "P_SHURIKEN", "P_BASIC" ],
    [ "P_ATTACK_SPELL", "P_EXPERT" ],
    [ "P_HEALING_SPELL", "P_SKILLED" ],
    [ "P_DIVINATION_SPELL", "P_EXPERT" ],
    [ "P_ENCHANTMENT_SPELL", "P_SKILLED" ],
    [ "P_CLERIC_SPELL", "P_SKILLED" ],
    [ "P_ESCAPE_SPELL", "P_EXPERT" ],
    [ "P_MATTER_SPELL", "P_EXPERT" ],
    [ "P_RIDING", "P_BASIC" ],
    [ "P_BARE_HANDED_COMBAT", "P_BASIC" ],
    [ "P_NONE", 0 ]];


export function knows_object(obj, override_pauper)
{
    if (C.u.uroleplay.pauper && !override_pauper)
        return;
    /* mark as known, but not yet encountered */
    C.discover_object(obj, C.TRUE, C.FALSE, C.FALSE);
}

/* Know ordinary (non-magical) objects of a certain class,
   like all gems except the loadstone and luckstone. */
export function knows_class(sym)
{
    let odummy, o;
    let ct;

    if (C.u.uroleplay.pauper)
        return;

    odummy = C.copyObj(C.cg.zeroobj);
    odummy.oclass = sym;
    o = odummy; /* for use in various obj.h macros */

    /*
     * Note:  the exceptions here can be bypassed if necessary by
     *        calling knows_object() directly.  So an elven ranger,
     *        for example, knows all elven weapons despite the bow,
     *        arrow, and spear limitation below.
     */

    for (ct = C.svb.bases[(sym & 255)]; ct < C.svb.bases[(sym & 255) + 1]; ct++) {
        /* not flagged as magic but shouldn't be pre-discovered
           (small shields look the same as two types of magical shield;
           cornuthaum / dunce cap look the same as each other) */
        if (ct == C.CORNUTHAUM || ct == C.DUNCE_CAP || ct == C.SMALL_SHIELD)
            continue;
        if (sym == C.WEAPON_CLASS) {
            odummy.otyp = ct; /* update 'o' */
            /* arbitrary: only knights and samurai recognize polearms */
            if ((!C.Role_if(C.PM_KNIGHT) && !C.Role_if(C.PM_SAMURAI)) && C.is_pole(o))
                continue;
            /* rangers know all launchers (bows, &c), ammo (arrows, &c),
               and spears regardless of race/species, but not other weapons */
            if (C.Role_if(C.PM_RANGER)
                && (!C.is_launcher(o) && !C.is_ammo(o) && !C.is_spear(o)))
                continue;
            /* rogues know daggers, regardless of racial variations */
            if (C.Role_if(C.PM_ROGUE) && (C.objects[o.otyp].oc_skill != C.P_DAGGER))
                continue;
        }

        if (C.objects[ct].oc_class == sym && !C.objects[ct].oc_magic)
            knows_object(ct, C.FALSE);
    }
}

/* role-specific initializations, mostly inventory

   other things may be initialised here, but the function might run more than
   once, so any non-inventory initialisations should be nonrandom and
   idempotent (i.e. doing them twice is OK) */
export function u_init_role()
{
    let i;

    /* the program used to check moves<=1 && invent==NULL do decide whether
       a new game has started, but due to the 'pauper' option/conduct, can't
       rely on invent becoming non-Null anymore; instead, initialize moves
       to 0 instead of 1, then set it to 1 here, where invent init occurs */
    C.svm.moves = 1n;

    switch (C.Role_switch) {
    /* rn2(100) > 50 necessary for some choices because some
     * random number generators are bad enough to seriously
     * skew the results if we use rn2(2)...  --KAA
     */
    case C.PM_ARCHEOLOGIST:
        ini_inv(C.Archeologist);
        if (!C.rn2(10, 654, "u_init_role"))
            ini_inv(C.Tinopener);
        else if (!C.rn2(4, 656, "u_init_role"))
            ini_inv(C.Lamp);
        else if (!C.rn2(5, 658, "u_init_role"))
            ini_inv(C.Magicmarker);
        knows_object(C.SACK, C.FALSE);
        knows_object(C.TOUCHSTONE, C.FALSE); /* FALSE: don't override pauper here,
                                          * but TOUCHSTONE will be made known
                                          * in pauper_reinit() */
        break;
    case C.PM_BARBARIAN:
        if (C.rn2(100, 666, "u_init_role") >= 50) { /* see above comment */
            ini_inv(C.Barbarian_0);
        } else {
            ini_inv(C.Barbarian_1);
        }
        if (!C.rn2(6, 671, "u_init_role"))
            ini_inv(C.Lamp);
        knows_class(C.WEAPON_CLASS); /* excluding polearms */
        knows_class(C.ARMOR_CLASS);
        break;
    case C.PM_CAVE_DWELLER:
        ini_inv(C.Cave_man);
        break;
    case C.PM_HEALER:
        C.u.umoney0 = C.rn1(1000, 1001, 680, "u_init_role");
        ini_inv(C.Healer);
        if (!C.rn2(25, 682, "u_init_role"))
            ini_inv(C.Lamp);
        knows_object(C.POT_FULL_HEALING, C.FALSE);
        break;
    case C.PM_KNIGHT:
        ini_inv(C.Knight);
        knows_class(C.WEAPON_CLASS); /* all weapons */
        knows_class(C.ARMOR_CLASS);
        /* give knights chess-like mobility--idea from wooledge@..cwru.edu */
        C.HJumping |= C.FROMOUTSIDE;
        break;
    case C.PM_MONK: {
        const M_spell = [
            C.Healing_book, C.Protection_book, C.Confuse_monster_book
        ];

        ini_inv(C.Monk);
        ini_inv(M_spell[Math.trunc(C.rn2(90, 699, "u_init_role") / 30)]); /* [0..2] */
        if (!C.rn2(4, 700, "u_init_role"))
            ini_inv(C.Magicmarker);
        else if (!C.rn2(10, 702, "u_init_role"))
            ini_inv(C.Lamp);
        knows_class(C.ARMOR_CLASS);
        /* sufficiently martial-arts oriented item to ignore language issue */
        knows_object(C.SHURIKEN, C.FALSE);
        break;
    }
    case C.PM_CLERIC: /* priest/priestess */
        ini_inv(C.Priest);
        if (!C.rn2(5, 711, "u_init_role"))
            ini_inv(C.Magicmarker);
        else if (!C.rn2(10, 713, "u_init_role"))
            ini_inv(C.Lamp);
        knows_object(C.POT_WATER, C.TRUE); /* override pauper */
        /* KMH, conduct --
         * Some may claim that this isn't agnostic, since they
         * are literally "priests" and they have holy water.
         * But we don't count it as such.  Purists can always
         * avoid playing priests and/or confirm another player's
         * role in their YAAP.
         */
        break;
    case C.PM_RANGER:
        ini_inv(C.Ranger);
        knows_class(C.WEAPON_CLASS); /* bows, arrows, spears only */
        break;
    case C.PM_ROGUE:
        C.u.umoney0 = 0n;
        ini_inv(C.Rogue);
        if (!C.rn2(5, 731, "u_init_role"))
            ini_inv(C.Blindfold);
        knows_object(C.SACK, C.FALSE); /* FALSE: don't override pauper here,
                                    * but sack will be made known in
                                    * pauper_reinit() */
        knows_class(C.WEAPON_CLASS); /* daggers only */
        break;
    case C.PM_SAMURAI:
        ini_inv(C.Samurai);
        if (!C.rn2(5, 740, "u_init_role"))
            ini_inv(C.Blindfold);
        knows_class(C.WEAPON_CLASS); /* all weapons */
        knows_class(C.ARMOR_CLASS);
        /* in order to assist non-Japanese speakers, pre-discover items
           that switch to Japanese names when playing as a Samurai */
        for (i = C.MAXOCLASSES; i < C.NUM_OBJECTS; ++i) {
            if (C.objects[i].oc_magic) /* skip "magic koto" */
                continue;
            if (C.Japanese_item_name(i, 0))
                /* we don't override pauper here because that would give
                   samarai an advantage of knowing several items in advance */
                knows_object(i, C.FALSE);
        }
        break;
    case C.PM_TOURIST:
        C.u.umoney0 = C.rnd(1000, 756, "u_init_role");
        ini_inv(C.Tourist);
        if (!C.rn2(25, 758, "u_init_role"))
            ini_inv(C.Tinopener);
        else if (!C.rn2(25, 760, "u_init_role"))
            ini_inv(C.Leash);
        else if (!C.rn2(25, 762, "u_init_role"))
            ini_inv(C.Towel);
        else if (!C.rn2(20, 764, "u_init_role"))
            ini_inv(C.Magicmarker);
        break;
    case C.PM_VALKYRIE:
        ini_inv(C.Valkyrie);
        if (!C.rn2(6, 769, "u_init_role"))
            ini_inv(C.Lamp);
        knows_class(C.WEAPON_CLASS); /* excludes polearms */
        knows_class(C.ARMOR_CLASS);
        break;
    case C.PM_WIZARD:
        ini_inv(C.Wizard);
        if (!C.rn2(5, 776, "u_init_role"))
            ini_inv(C.Blindfold);
        break;

    default: /* impossible */
        break;
    }

    C.gn.nocreate = C.STRANGE_OBJECT;
    C.gn.nocreate2 = C.STRANGE_OBJECT;
    C.gn.nocreate3 = C.STRANGE_OBJECT;
    C.gn.nocreate4 = C.STRANGE_OBJECT;
}

/* race-specific initializations, same restrictions as u_init_role */
export function u_init_race()
{
    switch (C.Race_switch) {
    case C.PM_HUMAN:
        /* Nothing special */
        break;

    case C.PM_ELF:
        /*
         * Elves are people of music and song, or they are warriors.
         * Non-warriors get an instrument.  We use a kludge to
         * get only non-magic instruments.
         */
        if (C.Role_if(C.PM_CLERIC) || C.Role_if(C.PM_WIZARD)) {
            const trotyp =
                [ C.WOODEN_FLUTE, C.TOOLED_HORN, C.WOODEN_HARP,
                  C.BELL,         C.BUGLE,       C.LEATHER_DRUM ];
            const Instrument = C.localTrobj(
                [ [ trotyp[C.rn2(trotyp.length, 810, "u_init_race")], 0, C.TOOL_CLASS, 1, 1, 0 ],
                  [ 0, 0, 0, 0, 0, 0 ] ]);
            ini_inv(Instrument);
        }

        /* Elves can recognize all elvish objects */
        knows_object(C.ELVEN_SHORT_SWORD, C.FALSE);
        knows_object(C.ELVEN_ARROW, C.FALSE);
        knows_object(C.ELVEN_BOW, C.FALSE);
        knows_object(C.ELVEN_SPEAR, C.FALSE);
        knows_object(C.ELVEN_DAGGER, C.FALSE);
        knows_object(C.ELVEN_BROADSWORD, C.FALSE);
        knows_object(C.ELVEN_MITHRIL_COAT, C.FALSE);
        knows_object(C.ELVEN_LEATHER_HELM, C.FALSE);
        knows_object(C.ELVEN_SHIELD, C.FALSE);
        knows_object(C.ELVEN_BOOTS, C.FALSE);
        knows_object(C.ELVEN_CLOAK, C.FALSE);
        break;

    case C.PM_DWARF:
        /* Dwarves can recognize all dwarvish objects */
        knows_object(C.DWARVISH_SPEAR, C.FALSE);
        knows_object(C.DWARVISH_SHORT_SWORD, C.FALSE);
        knows_object(C.DWARVISH_MATTOCK, C.FALSE);
        knows_object(C.DWARVISH_IRON_HELM, C.FALSE);
        knows_object(C.DWARVISH_MITHRIL_COAT, C.FALSE);
        knows_object(C.DWARVISH_CLOAK, C.FALSE);
        knows_object(C.DWARVISH_ROUNDSHIELD, C.FALSE);
        break;

    case C.PM_GNOME:
        break;

    case C.PM_ORC:
        /* compensate for generally inferior equipment */
        if (!C.Role_if(C.PM_WIZARD))
            ini_inv(C.Xtra_food);
        /* Orcs can recognize all orcish objects */
        knows_object(C.ORCISH_SHORT_SWORD, C.FALSE);
        knows_object(C.ORCISH_ARROW, C.FALSE);
        knows_object(C.ORCISH_BOW, C.FALSE);
        knows_object(C.ORCISH_SPEAR, C.FALSE);
        knows_object(C.ORCISH_DAGGER, C.FALSE);
        knows_object(C.ORCISH_CHAIN_MAIL, C.FALSE);
        knows_object(C.ORCISH_RING_MAIL, C.FALSE);
        knows_object(C.ORCISH_HELM, C.FALSE);
        knows_object(C.ORCISH_SHIELD, C.FALSE);
        knows_object(C.URUK_HAI_SHIELD, C.FALSE);
        knows_object(C.ORCISH_CLOAK, C.FALSE);
        break;

    default: /* impossible */
        break;
    }
}

/* for 'pauper' aka 'unprepared'; take away any skills (bare-handed combat,
   riding) that are better than unskilled; learn the book (without carrying
   it or knowing its spell yet) for some key spells */
export function pauper_reinit()
{
    let skill, preknown = C.STRANGE_OBJECT;

    if (!C.u.uroleplay.pauper)
        return;

    for (skill = 0; skill < C.P_NUM_SKILLS; skill++)
        if (C.u.weapon_skills[skill].skill > C.P_UNSKILLED) {
            C.u.weapon_skills[skill].skill = C.P_UNSKILLED;
            C.u.weapon_skills[skill].advance = 0;
        }
    /* pauper has lost out on initial skills, but provide some unspent skill
       credits to make up for that */
    C.u.weapon_slots = 2;

    /* paupers don't know any spells yet, but several roles will recognize
       the spellbook for a key spell (not necessarily that role's special
       spell); "supply chests" on the first few levels provide a fairly
       high chance to find the book; some other roles know a non-book item */
    switch (C.Role_switch) {
    case C.PM_HEALER:
        preknown = C.SPE_HEALING;
        break;
    case C.PM_CLERIC:
    case C.PM_KNIGHT:
    case C.PM_MONK:
        preknown = C.SPE_PROTECTION;
        break;
    case C.PM_WIZARD:
        preknown = C.SPE_FORCE_BOLT;
        break;
    case C.PM_ARCHEOLOGIST:
        preknown = C.TOUCHSTONE;
        break;
    case C.PM_CAVE_DWELLER:
        preknown = C.FLINT;
        break;
    case C.PM_ROGUE:
    case C.PM_TOURIST:
        preknown = C.SACK;
        break;
    case C.PM_SAMURAI:
        /* food ration isn't interesting to discover, but put "gunyoki" into
           discoveries list for players who might not recognize what it is */
        preknown = C.FOOD_RATION;
        break;
    default:
    case C.PM_BARBARIAN:
    case C.PM_RANGER:
    case C.PM_VALKYRIE:
        break;
    }
    if (preknown != C.STRANGE_OBJECT)
        knows_object(preknown, C.TRUE);
}

/* boost STR and CON until hero can carry inventory */
export function u_init_carry_attr_boost()
{
    /* make sure you can carry all you have - especially for Tourists */
    while (C.inv_weight() > 0) {
        if (C.adjattrib(C.A_STR, 1, C.TRUE))
            continue;
        if (C.adjattrib(C.A_CON, 1, C.TRUE))
            continue;
        /* only get here when didn't boost strength or constitution */
        break;
    }
}

/* initialise u, except inventory, attributes, skills and discoveries */
export function u_init_misc()
{
    let i;
    let tmpuroleplay = C.copyRoleplay(C.u.uroleplay); /* set by rcfile options */

    C.flags.female = C.flags.initgend;
    C.flags.beginner = C.TRUE;

    /* zero u, including pointer values --
     * necessary when aborting from a failed restore */
    C.memset(C.u.address, 0, C.youSize);
    C.u.ustuck = 0;
    C.memset(C.globalAddress("ubirthday"), 0, C.timeSize);
    C.memset(C.globalAddress("urealtime"), 0, C.realtimeSize);

    C.u.uroleplay = tmpuroleplay; /* restore options set via rcfile */

/* documentation of more zero values as desirable */
/* bypass set_twoweap() */
/* not worthy yet */
/* gods not angry */
/* no divine gifts bestowed */
/* not a demi-god yet... */
/* 0 */

    C.u.uz.dlevel = 1;
    C.u.uz0.dlevel = 0;
    C.copyLevel(C.u.utolev, C.u.uz);

    C.u.umoved = C.FALSE;
    C.u.umortality = 0;
    C.u.ugrave_arise = C.NON_PM;

    C.u.umonnum = C.u.umonster = C.gu.urole.mnum;
    C.u.ulycn = C.NON_PM;
    C.set_uasmon();

    C.u.ulevel = 0; /* set up some of the initial attributes */
    C.u.uhp = C.u.uhpmax = C.u.uhppeak = C.newhp();
    C.u.uen = C.u.uenmax = C.u.uenpeak = C.newpw();
    C.u.uspellprot = 0;
    C.adjabil(0, 1);
    C.u.ulevel = C.u.ulevelmax = 1;

    C.init_uhunger();
    for (i = 0; i <= C.MAXSPELL; i++)
        C.svs.spl_book[i].sp_id = C.NO_SPELL;
    C.u.ublesscnt = 300; /* no prayers just yet */
    C.u.ualignbase[C.A_CURRENT] = C.u.ualignbase[C.A_ORIGINAL] = C.u.ualign.type =
        C.aligns[C.flags.initalign].value;

    /* Route through getnow() so fixed datetime also controls ubirthday. */
    C.ubirthday = C.getnow();

    /*
     *  For now, everyone starts out with a night vision range of 1 and
     *  their xray_range disabled.
     */
    C.u.nv_range = 1;
    C.u.xray_range = -1;
    C.u.unblind_telepat_range = -1;

    /* OPTIONS:blind results in permanent blindness (unless overridden
       by the Eyes of the Overworld, which will clear 'u.uroleplay.blind'
       to void the conduct, but will leave the PermaBlind bit set so that
       blindness resumes when the Eyes are removed). */
    if (C.u.uroleplay.blind)
        C.HBlinded |= C.FROMOUTSIDE; /* set PermaBlind */

    /* roughly based on distribution in human population */
    C.u.uhandedness = C.rn2(10, 1028, "u_init_misc") ? C.RIGHT_HANDED : C.LEFT_HANDED;

    C.max_rank_sz(); /* set max str size for class ranks */

    return;
}

/* the appropriate set of skills for the role */
export function skills_for_role()
{
    let skills;

    switch (C.Role_switch) {
    case C.PM_ARCHEOLOGIST:
        skills = C.Skill_A;
        break;
    case C.PM_BARBARIAN:
        skills = C.Skill_B;
        break;
    case C.PM_CAVE_DWELLER:
        skills = C.Skill_C;
        break;
    case C.PM_HEALER:
        skills = C.Skill_H;
        break;
    case C.PM_KNIGHT:
        skills = C.Skill_K;
        break;
    case C.PM_MONK:
        skills = C.Skill_Mon;
        break;
    case C.PM_CLERIC:
        skills = C.Skill_P;
        break;
    case C.PM_RANGER:
        skills = C.Skill_Ran;
        break;
    case C.PM_ROGUE:
        skills = C.Skill_R;
        break;
    case C.PM_SAMURAI:
        skills = C.Skill_S;
        break;
    case C.PM_TOURIST:
        skills = C.Skill_T;
        break;
    case C.PM_VALKYRIE:
        skills = C.Skill_V;
        break;
    case C.PM_WIZARD:
        skills = C.Skill_W;
        break;
    default:
        C.panic("No skills found for role");
        break;
    }

    return skills;
}

/* skills aren't initialized, so we use the role-specific skill lists */
export function restricted_spell_discipline(otyp)
{
    let skills = skills_for_role();
    let this_skill = C.spell_skilltype(otyp);

    while (skills && skills.skill != C.P_NONE) {
        if (skills.skill == this_skill)
            return C.FALSE;
        skills = C.nextSkill(skills);
    }
    return C.TRUE;
}

/* randomizes the quantity given a trobj description */
export function trquan(trop)
{
    if (!trop.trquan_min)
        return 1n;
    return BigInt(trop.trquan_min + C.rn2(trop.trquan_max - trop.trquan_min + 1, 1110, "trquan"));
}

/* create random object of certain class, filtering out too powerful items */
export function ini_inv_mkobj_filter(oclass, got_level1_spellbook)
{
    let obj;
    let otyp, trycnt = 0;

    /*
     * For random objects, do not create certain overly powerful
     * items: wand of wishing, ring of levitation, or the
     * polymorph/polymorph control combination.  Specific objects,
     * i.e. the discovery wishing, are still OK.
     * Also, don't get a couple of really useless items.  (Note:
     * punishment isn't "useless".  Some players who start out with
     * one will immediately read it and use the iron ball as a
     * weapon.)
     */
    obj = C.mkobj(oclass, C.FALSE);
    otyp = obj.otyp;

    while (otyp == C.WAN_WISHING || otyp == C.gn.nocreate
           || otyp == C.gn.nocreate2 || otyp == C.gn.nocreate3
           || otyp == C.gn.nocreate4 || otyp == C.RIN_LEVITATION
           /* 'useless' items */
           || otyp == C.POT_HALLUCINATION
           || otyp == C.POT_ACID
           || otyp == C.SCR_AMNESIA
           || otyp == C.SCR_FIRE
           || otyp == C.SCR_BLANK_PAPER
           || otyp == C.SPE_BLANK_PAPER
           || otyp == C.RIN_AGGRAVATE_MONSTER
           || otyp == C.RIN_HUNGER
           || otyp == C.WAN_NOTHING
           /* orcs start with poison resistance */
           || (otyp == C.RIN_POISON_RESISTANCE && C.Race_if(C.PM_ORC))
           /* Monks don't use weapons */
           || (otyp == C.SCR_ENCHANT_WEAPON && C.Role_if(C.PM_MONK))
           /* wizard patch -- they already have one */
           || (otyp == C.SPE_FORCE_BOLT && C.Role_if(C.PM_WIZARD))
           /* powerful spells are either useless to
              low level players or unbalancing; also
              spells in restricted skill categories */
           || (obj.oclass == C.SPBOOK_CLASS
               && (C.objects[otyp].oc_level > (got_level1_spellbook ? 3 : 1)
                   || restricted_spell_discipline(otyp)))
           || otyp == C.SPE_NOVEL) {
        C.dealloc_obj(obj);
        if (++trycnt > 1000) {
            /* This lonely pancake's potential will never be realized.
             * It will exist only as a thought, of something that could have
             * been, but never will be. It will never experience maple syrup
             * oozing into its nooks, or see the delightful expression on
             * someone's face as they are about to let it dance across their
             * taste buds. */
            obj = C.mksobj(C.PANCAKE, C.TRUE, C.FALSE);
            break;
        }
        obj = C.mkobj(oclass, C.FALSE);
        otyp = obj.otyp;
    }
    return obj;
}

/* substitute object with something else based on race.
   only changes otyp, and returns it. */
export function ini_inv_obj_substitution(trop, obj)
{
    if (C.gu.urace.mnum != C.PM_HUMAN) {
        let i;

        /* substitute race-specific items; this used to be in
           the 'if (otyp != UNDEF_TYP) { }' block above, but then
           substitutions didn't occur for randomly generated items
           (particularly food) which have racial substitutes */
        for (i = 0; C.inv_subs[i].race_pm != C.NON_PM; ++i)
            if (C.inv_subs[i].race_pm == C.gu.urace.mnum
                && obj.otyp == C.inv_subs[i].item_otyp) {
                C.debugpline3("ini_inv: substituting %s for %s%s",
                            C.OBJ_NAME(C.objects[C.inv_subs[i].subs_otyp]),
                            (trop.trotyp == C.UNDEF_TYP) ? "random " : "",
                            C.OBJ_NAME(C.objects[obj.otyp]));
                obj.otyp = C.inv_subs[i].subs_otyp;
                break;
            }
    }
    return obj.otyp;
}

/* returns: TRUE to stop generating items from this trobj,
   FALSE for normal behaviour */
export function ini_inv_adjust_obj(trop, obj)
{
    let stop = C.FALSE;
    if (trop.trclass == C.COIN_CLASS) {
        /* no "blessed" or "identified" money */
        obj.quan = C.u.umoney0;
    } else {
        if (C.objects[obj.otyp].oc_uses_known)
            obj.known = 1;
        /* not observe_object during startup, that's handled later */
        obj.dknown = obj.bknown = obj.rknown = 1;
        if (C.Is_container(obj) || obj.otyp == C.STATUE) {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = 0;
        if (obj.opoisoned && C.u.ualign.type != C.A_CHAOTIC)
            obj.opoisoned = 0;
        if (obj.oclass == C.WEAPON_CLASS || obj.oclass == C.TOOL_CLASS) {
            obj.quan = trquan(trop);
            stop = C.TRUE;
        } else if (obj.oclass == C.GEM_CLASS && C.is_graystone(obj)
                   && obj.otyp != C.FLINT) {
            obj.quan = 1n;
        }
        if (trop.trspe != C.UNDEF_SPE) {
            obj.spe = trop.trspe;
            if (trop.trotyp == C.MAGIC_MARKER && obj.spe < 96)
                obj.spe += C.rn2(4, 1233, "ini_inv_adjust_obj");
        } else {
            /* Don't start with +0 or negative rings */
            if (C.objects[obj.otyp].oc_class == C.RING_CLASS
                && C.objects[obj.otyp].oc_charged && obj.spe <= 0)
                obj.spe = C.rne(3, 1238, "ini_inv_adjust_obj");
        }
        if (trop.trbless != C.UNDEF_BLESS)
            obj.blessed = trop.trbless;

    }
    /* defined after setting otyp+quan + blessedness */
    obj.owt = C.weight(obj);
    return stop;
}

/* initial inventory: wear, wield, learn the spell/obj */
export function ini_inv_use_obj(obj)
{
    /* Make the type known if necessary */
    if (C.OBJ_DESCR(C.objects[obj.otyp]) && obj.known)
        C.discover_object(obj.otyp, C.TRUE, C.TRUE, C.FALSE);
    if (obj.otyp == C.OIL_LAMP)
        C.discover_object(C.POT_OIL, C.TRUE, C.TRUE, C.FALSE);

    if (obj.oclass == C.ARMOR_CLASS) {
        if (C.is_shield(obj) && !C.uarms && !(C.uwep && C.bimanual(C.uwep))) {
            /* Prior to 3.6.2 this used to unset uswapwep if it was set,
               but wearing a shield doesn't prevent having an alternate
               weapon ready to swap with the primary; just make sure we
               aren't two-weaponing (academic; no one starts that way) */
            C.set_twoweap(C.FALSE); /* u.twoweap = FALSE */
            C.setworn(obj, C.W_ARMS);
        } else if (C.is_helmet(obj) && !C.uarmh)
            C.setworn(obj, C.W_ARMH);
        else if (C.is_gloves(obj) && !C.uarmg)
            C.setworn(obj, C.W_ARMG);
        else if (C.is_shirt(obj) && !C.uarmu)
            C.setworn(obj, C.W_ARMU);
        else if (C.is_cloak(obj) && !C.uarmc)
            C.setworn(obj, C.W_ARMC);
        else if (C.is_boots(obj) && !C.uarmf)
            C.setworn(obj, C.W_ARMF);
        else if (C.is_suit(obj) && !C.uarm)
            C.setworn(obj, C.W_ARM);
    }

    if (obj.oclass == C.WEAPON_CLASS || C.is_weptool(obj)
        || obj.otyp == C.TIN_OPENER
        || obj.otyp == C.FLINT || obj.otyp == C.ROCK) {
        if (C.is_ammo(obj) || C.is_missile(obj)) {
            if (!C.uquiver)
                C.setuqwep(obj);
        } else if (!C.uwep && (!C.uarms || !C.bimanual(obj))) {
            C.setuwep(obj);
        } else if (!C.uswapwep) {
            C.setuswapwep(obj);
        }
    }
    if (obj.oclass == C.SPBOOK_CLASS && obj.otyp != C.SPE_BLANK_PAPER)
        C.initialspell(obj);
}

export function ini_inv(trop)
{
    let obj;
    let otyp;
    let got_sp1 = C.FALSE; /* got a level 1 spellbook? */
    let quan;

    if (C.u.uroleplay.pauper) /* pauper gets no items */
        return;

    quan = trquan(trop);
    while (trop.trclass) {
        otyp = trop.trotyp;
        if (otyp != C.UNDEF_TYP) {
            obj = C.mksobj(otyp, C.TRUE, C.FALSE);
        } else { /* UNDEF_TYP */
            obj = ini_inv_mkobj_filter(trop.trclass, got_sp1);
            otyp = obj.otyp;
            /* Heavily relies on the facts that 1) we create wands
             * before rings, that 2) we create rings before
             * spellbooks, and that 3) not more than 1 object of a
             * particular symbol is to be prohibited.  (For more
             * objects, we need more nocreate variables...)
             */
            switch (otyp) {
            case C.WAN_POLYMORPH:
            case C.RIN_POLYMORPH:
            case C.POT_POLYMORPH:
                C.gn.nocreate = C.RIN_POLYMORPH_CONTROL;
                break;
            case C.RIN_POLYMORPH_CONTROL:
                C.gn.nocreate = C.RIN_POLYMORPH;
                C.gn.nocreate2 = C.SPE_POLYMORPH;
                C.gn.nocreate3 = C.POT_POLYMORPH;
            }
            /* Don't have 2 of the same ring or spellbook */
            if (obj.oclass == C.RING_CLASS || obj.oclass == C.SPBOOK_CLASS)
                C.gn.nocreate4 = otyp;
        }
        /* Put post-creation object adjustments that don't depend on whether
         * it was UNDEF_TYP or not after this. */

        otyp = ini_inv_obj_substitution(trop, obj);
        C.nhUse(otyp);

        /* nudist gets no armor */
        if (C.u.uroleplay.nudist && obj.oclass == C.ARMOR_CLASS) {
            C.dealloc_obj(obj);
            trop = C.nextTrobj(trop);
            continue;
        }

        if (ini_inv_adjust_obj(trop, obj))
            quan = 1n;
        obj = C.addinv(obj);

        /* First spellbook should be level 1 - did we get it? */
        if (obj.oclass == C.SPBOOK_CLASS && C.objects[obj.otyp].oc_level == 1)
            got_sp1 = C.TRUE;

        if (--quan)
            continue; /* make a similar object */
        trop = C.nextTrobj(trop);
        quan = trquan(trop);
    }
}

/* initialise starting inventory and attributes

   this function can be run multiple times and will overwrite the effects of
   previous runs */
export function u_init_inventory_attrs()
{
    C.gl.lastinvnr = 51;
    while (C.gi.invent)
        C.useupall(C.gi.invent);

    C.u.umoney0 = 0n;
    u_init_role();
    u_init_race();

    if (C.discover)
        ini_inv(C.Wishing);

    if (C.u.umoney0)
        ini_inv(C.Money);
    C.u.umoney0 += C.hidden_gold(C.TRUE); /* in case sack has gold in it */

    C.init_attr(75);    /* init attribute values */
    C.vary_init_attr(); /* minor variation to attrs */
    u_init_carry_attr_boost();
}

/* side effects of starting inventory (e.g. discovering it) and skills (both
   those based on role and those based on starting inventory) */
export function u_init_skills_discoveries()
{
    let otmp;
    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        ini_inv_use_obj(otmp);

    C.skill_init(skills_for_role());
    if (C.u.uroleplay.pauper)
        pauper_reinit();

    /* If we have at least one spell, force starting Pw to be enough,
       so hero can cast the level 1 spell they should have */
    if (C.num_spells() && (C.u.uenmax < C.SPELL_LEV_PW(1)))
        C.u.uen = C.u.uenmax = C.u.uenpeak = C.u.ueninc[C.u.ulevel] = C.SPELL_LEV_PW(1);

    C.find_ac();     /* get initial ac value */
}


/*u_init.c*/
