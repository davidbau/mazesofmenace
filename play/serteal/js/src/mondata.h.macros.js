/* NetHack 5.0	mondata.h	$NHDT-Date: 1703845738 2023/12/29 10:28:58 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.63 $ */
/* Copyright (c) 1989 Mike Threepoint                             */
/* NetHack may be freely redistributed.  See license for details. */




/* The macros in here take a permonst * as an argument */

export function monsndx(ptr) { return ((ptr).pmidx); }
export function verysmall(ptr) { return (+((ptr).msize < MZ_SMALL)); }
export function bigmonst(ptr) { return (+((ptr).msize >= MZ_LARGE)); }

export function pm_resistance(ptr, typ) { return (+(((ptr).mresists & (typ)) != 0)); }

export function immune_poisongas(ptr) { return (+((ptr) == mons[PM_HEZROU]        
                               || (ptr) == mons[PM_VROCK])); }

export function is_flyer(ptr) { return (+(((ptr).mflags1 & M1_FLY) != 0)); }
export function is_floater(ptr) { return (+((ptr).mlet == S_EYE || (ptr).mlet == S_LIGHT)); }
/* clinger: piercers, mimics, wumpus -- generally don't fall down holes */
export function is_clinger(ptr) { return (+(((ptr).mflags1 & M1_CLING) != 0)); }
export function grounded(ptr) { return (+(!is_flyer(ptr) && !is_floater(ptr) 
                       && (!is_clinger(ptr) || !has_ceiling(u.uz)))); }
export function is_swimmer(ptr) { return (+(((ptr).mflags1 & M1_SWIM) != 0)); }
export function breathless(ptr) { return (+(((ptr).mflags1 & M1_BREATHLESS) != 0)); }
export function amphibious(ptr) { return (+(((ptr).mflags1 & M1_AMPHIBIOUS) != 0)); }
export function cant_drown(ptr) { return (+(is_swimmer(ptr) || amphibious(ptr) || breathless(ptr))); }
export function passes_walls(ptr) { return (+(((ptr).mflags1 & M1_WALLWALK) != 0)); }
export function amorphous(ptr) { return (+(((ptr).mflags1 & M1_AMORPHOUS) != 0)); }
export function noncorporeal(ptr) { return (+((ptr).mlet == S_GHOST)); }
export function tunnels(ptr) { return (+(((ptr).mflags1 & M1_TUNNEL) != 0)); }
export function needspick(ptr) { return (+(((ptr).mflags1 & M1_NEEDPICK) != 0)); }
/* hides_under() requires an object at the location in order to hide */
export function hides_under(ptr) { return (+(((ptr).mflags1 & M1_CONCEAL) != 0)); }
/* is_hider() is True for mimics but when hiding they appear as something
   else rather than become mon->mundetected, so use is_hider() with care */
export function is_hider(ptr) { return (+(((ptr).mflags1 & M1_HIDE) != 0)); }
/* piercers cling to the ceiling; lurkers above are hiders but they fly
   so aren't classified as clingers; unfortunately mimics are classified
   as both hiders and clingers but have nothing to do with ceilings;
   wumpuses (not wumpi :-) cling but aren't hiders */
export function ceiling_hider(ptr) { return (+(is_hider(ptr) && ((is_clinger(ptr) && (ptr).mlet != S_MIMIC) 
                       || is_flyer(ptr)))); }

export function haseyes(ptr) { return (+(((ptr).mflags1 & M1_NOEYES) == 0)); }
/* used to decide whether plural applies so no need for 'more than 2' */
export function eyecount(ptr) { return (!haseyes(ptr) ? 0                                                     
     : ((ptr) == mons[PM_CYCLOPS] || (ptr) == mons[PM_FLOATING_EYE]) ? 1 
       : 2); }

export function nohands(ptr) { return (+(((ptr).mflags1 & M1_NOHANDS) != 0)); }
export function nolimbs(ptr) { return (+(((ptr).mflags1 & M1_NOLIMBS) == M1_NOLIMBS)); }
export function notake(ptr) { return (+(((ptr).mflags1 & M1_NOTAKE) != 0)); }
export function has_head(ptr) { return (+(((ptr).mflags1 & M1_NOHEAD) == 0)); }
export function has_horns(ptr) { return (+(num_horns(ptr) > 0)); }
export function is_whirly(ptr) { return (+((ptr).mlet == S_VORTEX || (ptr) == mons[PM_AIR_ELEMENTAL])); }

export function flaming(ptr) { return (+((ptr) == mons[PM_FIRE_VORTEX] || (ptr) == mons[PM_FLAMING_SPHERE] 
     || (ptr) == mons[PM_FIRE_ELEMENTAL] || (ptr) == mons[PM_SALAMANDER])); }

export function is_silent(ptr) { return (+((ptr).msound == MS_SILENT)); }
export function unsolid(ptr) { return (+(((ptr).mflags1 & M1_UNSOLID) != 0)); }
export function mindless(ptr) { return (+(((ptr).mflags1 & M1_MINDLESS) != 0)); }
export function humanoid(ptr) { return (+(((ptr).mflags1 & M1_HUMANOID) != 0)); }
export function is_animal(ptr) { return (+(((ptr).mflags1 & M1_ANIMAL) != 0)); }
export function slithy(ptr) { return (+(((ptr).mflags1 & M1_SLITHY) != 0)); }
export function is_wooden(ptr) { return (+((ptr) == mons[PM_WOOD_GOLEM])); }
export function thick_skinned(ptr) { return (+(((ptr).mflags1 & M1_THICK_HIDE) != 0)); }
export function hug_throttles(ptr) { return (+((ptr) == mons[PM_ROPE_GOLEM])); }
export function digests(ptr) { return (+(dmgtype_fromattack((ptr), AD_DGST, AT_ENGL) != null)); }

export function enfolds(ptr) { return (+(dmgtype_fromattack((ptr), AD_WRAP, AT_ENGL) != null)); }

export function slimeproof(ptr) { return (+((ptr) == mons[PM_GREEN_SLIME] || flaming(ptr) || noncorporeal(ptr))); }

export function lays_eggs(ptr) { return (+(((ptr).mflags1 & M1_OVIPAROUS) != 0)); }
export function eggs_in_water(ptr) { return (+(lays_eggs(ptr) && (ptr).mlet == S_EEL && is_swimmer(ptr))); }

export function regenerates(ptr) { return (+(((ptr).mflags1 & M1_REGEN) != 0)); }
export function perceives(ptr) { return (+(((ptr).mflags1 & M1_SEE_INVIS) != 0)); }
export function can_teleport(ptr) { return (+(((ptr).mflags1 & M1_TPORT) != 0)); }
export function control_teleport(ptr) { return (+(((ptr).mflags1 & M1_TPORT_CNTRL) != 0)); }
export function telepathic(ptr) { return (+((ptr) == mons[PM_FLOATING_EYE] || (ptr) == mons[PM_MIND_FLAYER] 
     || (ptr) == mons[PM_MASTER_MIND_FLAYER])); }

export function is_armed(ptr) { return attacktype(ptr, AT_WEAP); }
export function acidic(ptr) { return (+(((ptr).mflags1 & M1_ACID) != 0)); }
export function poisonous(ptr) { return (+(((ptr).mflags1 & M1_POIS) != 0)); }
export function carnivorous(ptr) { return (+(((ptr).mflags1 & M1_CARNIVORE) != 0)); }
export function herbivorous(ptr) { return (+(((ptr).mflags1 & M1_HERBIVORE) != 0)); }
export function metallivorous(ptr) { return (+(((ptr).mflags1 & M1_METALLIVORE) != 0)); }
export function polyok(ptr) { return (+(((ptr).mflags2 & M2_NOPOLY) == 0)); }
export function is_shapeshifter(ptr) { return (+(((ptr).mflags2 & M2_SHAPESHIFTER) != 0)); }
export function is_undead(ptr) { return (+(((ptr).mflags2 & M2_UNDEAD) != 0)); }
export function is_were(ptr) { return (+(((ptr).mflags2 & M2_WERE) != 0)); }
export function is_elf(ptr) { return (+(((ptr).mflags2 & M2_ELF) != 0)); }
export function is_dwarf(ptr) { return (+(((ptr).mflags2 & M2_DWARF) != 0)); }
export function is_gnome(ptr) { return (+(((ptr).mflags2 & M2_GNOME) != 0)); }
export function is_orc(ptr) { return (+(((ptr).mflags2 & M2_ORC) != 0)); }
export function is_human(ptr) { return (+(((ptr).mflags2 & M2_HUMAN) != 0)); }
export function your_race(ptr) { return (+(((ptr).mflags2 & gu.urace.selfmask) != 0)); }
export function is_bat(ptr) { return (+((ptr) == mons[PM_BAT] || (ptr) == mons[PM_GIANT_BAT] 
     || (ptr) == mons[PM_VAMPIRE_BAT])); }


export function is_giant(ptr) { return (+(((ptr).mflags2 & M2_GIANT) != 0)); }
export function is_golem(ptr) { return (+((ptr).mlet == S_GOLEM)); }
export function is_domestic(ptr) { return (+(((ptr).mflags2 & M2_DOMESTIC) != 0)); }
export function is_demon(ptr) { return (+(((ptr).mflags2 & M2_DEMON) != 0)); }
export function is_mercenary(ptr) { return (+(((ptr).mflags2 & M2_MERC) != 0)); }
export function is_male(ptr) { return (+(((ptr).mflags2 & M2_MALE) != 0)); }
export function is_female(ptr) { return (+(((ptr).mflags2 & M2_FEMALE) != 0)); }
export function is_neuter(ptr) { return (+(((ptr).mflags2 & M2_NEUTER) != 0)); }
export function is_wanderer(ptr) { return (+(((ptr).mflags2 & M2_WANDER) != 0)); }
export function always_hostile(ptr) { return (+(((ptr).mflags2 & M2_HOSTILE) != 0)); }
export function always_peaceful(ptr) { return (+(((ptr).mflags2 & M2_PEACEFUL) != 0)); }
export function race_hostile(ptr) { return (+(((ptr).mflags2 & gu.urace.hatemask) != 0)); }
export function race_peaceful(ptr) { return (+(((ptr).mflags2 & gu.urace.lovemask) != 0)); }
export function extra_nasty(ptr) { return (+(((ptr).mflags2 & M2_NASTY) != 0)); }
export function strongmonst(ptr) { return (+(((ptr).mflags2 & M2_STRONG) != 0)); }
export function can_breathe(ptr) { return attacktype(ptr, AT_BREA); }
export function cantwield(ptr) { return (+(nohands(ptr) || verysmall(ptr))); }
/* Does this type of monster have multiple weapon attacks?  If so,
   hero poly'd into this form can use two-weapon combat.  It used
   to just check mattk[1] and assume mattk[0], which was suitable
   for mons[] at the time but somewhat fragile.  This is more robust
   without going to the extreme of checking all six slots. */
export function could_twoweap(ptr) { return (+((  (+((ptr).mattk[0].aatyp == AT_WEAP))              
      + (+((ptr).mattk[1].aatyp == AT_WEAP))              
      + (+((ptr).mattk[2].aatyp == AT_WEAP))  ) > 1)); }

export function cantweararm(ptr) { return (((breakarm(ptr) || sliparm(ptr)) ? 1 : 0)); }
export function throws_rocks(ptr) { return (+(((ptr).mflags2 & M2_ROCKTHROW) != 0)); }
export function type_is_pname(ptr) { return (+(((ptr).mflags2 & M2_PNAME) != 0)); }
export function is_lord(ptr) { return (+(((ptr).mflags2 & M2_LORD) != 0)); }
export function is_prince(ptr) { return (+(((ptr).mflags2 & M2_PRINCE) != 0)); }
export function is_ndemon(ptr) { return (+(is_demon(ptr) && (((ptr).mflags2 & (M2_LORD | M2_PRINCE)) == 0))); }

export function is_dlord(ptr) { return (+(is_demon(ptr) && is_lord(ptr))); }
export function is_dprince(ptr) { return (+(is_demon(ptr) && is_prince(ptr))); }
export function is_minion(ptr) { return (+(((ptr).mflags2 & M2_MINION) != 0)); }
export function likes_gold(ptr) { return (+(((ptr).mflags2 & M2_GREEDY) != 0)); }
export function likes_gems(ptr) { return (+(((ptr).mflags2 & M2_JEWELS) != 0)); }
export function likes_objs(ptr) { return (((((ptr).mflags2 & M2_COLLECT) != 0 || is_armed(ptr)) ? 1 : 0)); }
export function likes_magic(ptr) { return (+(((ptr).mflags2 & M2_MAGIC) != 0)); }
export function webmaker(ptr) { return (+((ptr) == mons[PM_CAVE_SPIDER] || (ptr) == mons[PM_GIANT_SPIDER])); }

export function is_unicorn(ptr) { return (+((ptr).mlet == S_UNICORN && likes_gems(ptr))); }
export function is_longworm(ptr) { return (+(((ptr) == mons[PM_BABY_LONG_WORM]) || ((ptr) == mons[PM_LONG_WORM]) 
     || ((ptr) == mons[PM_LONG_WORM_TAIL]))); }

export function is_covetous(ptr) { return (((ptr).mflags3 & M3_COVETOUS)); }
export function infravision(ptr) { return (((ptr).mflags3 & M3_INFRAVISION)); }
export function infravisible(ptr) { return (((ptr).mflags3 & M3_INFRAVISIBLE)); }
export function is_displacer(ptr) { return (+(((ptr).mflags3 & M3_DISPLACES) != 0)); }
export function is_mplayer(ptr) { return (+(((ptr) >= mons[PM_ARCHEOLOGIST]) && ((ptr) <= mons[PM_WIZARD]))); }

export function is_watch(ptr) { return (+((ptr) == mons[PM_WATCHMAN] || (ptr) == mons[PM_WATCH_CAPTAIN])); }

export function is_rider(ptr) { return (+((ptr) == mons[PM_DEATH] || (ptr) == mons[PM_FAMINE] 
     || (ptr) == mons[PM_PESTILENCE])); }

/* note: placeholder monsters are used for corpses of zombies and mummies;
   PM_DWARF and PM_GNOME are normal monsters, not placeholders */
export function is_placeholder(ptr) { return (+((ptr) == mons[PM_ORC] || (ptr) == mons[PM_GIANT] 
     || (ptr) == mons[PM_ELF] || (ptr) == mons[PM_HUMAN])); }

/* return TRUE if the monster tends to revive */
export function is_reviver(ptr) { return (+(is_rider(ptr) || (ptr).mlet == S_TROLL)); }
/* monsters whose corpses and statues need special handling;
   note that high priests and the Wizard of Yendor are flagged
   as unique even though they really aren't; that's ok here */
export function unique_corpstat(ptr) { return (+(((ptr).geno & G_UNIQ) != 0)); }

/* this returns the light's range, or 0 if none; if we add more light-emitting
   monsters, we'll likely have to add a new light range field to mons[] */
export function emits_light(ptr) { return (((ptr).mlet == S_LIGHT || (ptr) == mons[PM_FLAMING_SPHERE] 
      || (ptr) == mons[PM_SHOCKING_SPHERE]                       
      || (ptr) == mons[PM_BABY_GOLD_DRAGON]                      
      || (ptr) == mons[PM_FIRE_VORTEX])                          
         ? 1                                                      
         : ((ptr) == mons[PM_FIRE_ELEMENTAL]                     
            || (ptr) == mons[PM_GOLD_DRAGON]) ? 1 : 0); }

    /* [Note: the light ranges above were reduced to 1 for performance,
     *  otherwise screen updating on the plane of fire slowed to a crawl.
     *  Note too: that was with 1990s hardware and before fumarole smoke
     *  blocking line of sight was added, so might no longer be necessary.] */
export function likes_lava(ptr) { return (+(ptr == mons[PM_FIRE_ELEMENTAL] || ptr == mons[PM_SALAMANDER])); }

export function pm_invisible(ptr) { return (+((ptr) == mons[PM_STALKER] || (ptr) == mons[PM_BLACK_LIGHT])); }


/* could probably add more */
export function likes_fire(ptr) { return (+((ptr) == mons[PM_FIRE_VORTEX] || (ptr) == mons[PM_FLAMING_SPHERE] 
     || likes_lava(ptr))); }


export function touch_petrifies(ptr) { return (+((ptr) == mons[PM_COCKATRICE] || (ptr) == mons[PM_CHICKATRICE])); }

/* Medusa doesn't pass touch_petrifies() but does petrify if eaten */
export function flesh_petrifies(pm) { return (+(touch_petrifies(pm) || (pm) == mons[PM_MEDUSA])); }

/* missiles made of rocks don't harm these: xorns and earth elementals
   (but not ghosts and shades because that would impact all missile use
   and also require an exception for blessed rocks/gems/boulders) */
export function passes_rocks(ptr) { return (+(passes_walls(ptr) && !unsolid(ptr))); }

export function is_mind_flayer(ptr) { return (+((ptr) == mons[PM_MIND_FLAYER] || (ptr) == mons[PM_MASTER_MIND_FLAYER])); }


export function is_vampire(ptr) { return (+((ptr).mlet == S_VAMPIRE)); }

export function hates_light(ptr) { return (+((ptr) == mons[PM_GREMLIN])); }

/* used to vary a few messages */
export function weirdnonliving(ptr) { return (+(is_golem(ptr) || (ptr).mlet == S_VORTEX)); }
export function nonliving(ptr) { return (+(is_undead(ptr) || (ptr) == mons[PM_MANES] || weirdnonliving(ptr))); }


/* no corpse (ie, blank scrolls) if killed by fire; special case instakill  */
export function completelyburns(ptr) { return (+((ptr) == mons[PM_PAPER_GOLEM] || (ptr) == mons[PM_STRAW_GOLEM])); }

export function completelyrots(ptr) { return (+((ptr) == mons[PM_WOOD_GOLEM] || (ptr) == mons[PM_LEATHER_GOLEM])); }

export function completelyrusts(ptr) { return (+((ptr) == mons[PM_IRON_GOLEM])); }

/* Used for conduct with corpses, tins, and digestion attacks */
/* G_NOCORPSE monsters might still be swallowed as a purple worm */
/* Maybe someday this could be in mflags... */
export function vegan(ptr) { return (+((ptr).mlet == S_BLOB || (ptr).mlet == S_JELLY               
     || (ptr).mlet == S_FUNGUS || (ptr).mlet == S_VORTEX         
     || (ptr).mlet == S_LIGHT                                     
     || ((ptr).mlet == S_ELEMENTAL && (ptr) != mons[PM_STALKER]) 
     || ((ptr).mlet == S_GOLEM && (ptr) != mons[PM_FLESH_GOLEM]  
         && (ptr) != mons[PM_LEATHER_GOLEM]) || noncorporeal(ptr))); }

export function vegetarian(ptr) { return (+(vegan(ptr)         
     || ((ptr).mlet == S_PUDDING && (ptr) != mons[PM_BLACK_PUDDING]))); }


export function corpse_eater(ptr) { return (+(ptr == mons[PM_PURPLE_WORM]            
     || ptr == mons[PM_BABY_PURPLE_WORM]    
     || ptr == mons[PM_GHOUL]               
     || ptr == mons[PM_PIRANHA])); }


/* monkeys are tamable via bananas but not pacifiable via food,
   otherwise their theft attack could be nullified too easily;
   dogs and cats can be tamed by anything they like to eat and are
   pacified by any other food;
   horses can be tamed by always-veggy food or lichen corpses but
   not tamed or pacified by other corpses or tins of veggy critters */
export function befriend_with_obj(ptr, obj) { return (((ptr) == mons[PM_MONKEY] || (ptr) == mons[PM_APE])               
     ? +((obj).otyp == BANANA)                                             
     : (+(is_domestic(ptr) && (obj).oclass == FOOD_CLASS                  
        && ((ptr).mlet != S_UNICORN                                     
            || objects[(obj).otyp].oc_material == VEGGY                 
            || ((obj).otyp == CORPSE && (obj).corpsenm == PM_LICHEN))))); }






export function monsym(ptr) { return (def_monsyms[((ptr).mlet)].sym); }
import { FOOD_CLASS } from "./defsym.h.js";
import { S_BLOB } from "./defsym.h.js";
import { S_EEL } from "./defsym.h.js";
import { S_ELEMENTAL } from "./defsym.h.js";
import { S_EYE } from "./defsym.h.js";
import { S_FUNGUS } from "./defsym.h.js";
import { S_GHOST } from "./defsym.h.js";
import { S_GOLEM } from "./defsym.h.js";
import { S_JELLY } from "./defsym.h.js";
import { S_LIGHT } from "./defsym.h.js";
import { S_MIMIC } from "./defsym.h.js";
import { S_PUDDING } from "./defsym.h.js";
import { S_TROLL } from "./defsym.h.js";
import { S_UNICORN } from "./defsym.h.js";
import { S_VAMPIRE } from "./defsym.h.js";
import { S_VORTEX } from "./defsym.h.js";
import { AD_DGST } from "./monattk.h.js";
import { AD_WRAP } from "./monattk.h.js";
import { AT_BREA } from "./monattk.h.js";
import { AT_ENGL } from "./monattk.h.js";
import { AT_WEAP } from "./monattk.h.js";
import { G_UNIQ } from "./monflag.h.js";
import { M1_ACID } from "./monflag.h.js";
import { M1_AMORPHOUS } from "./monflag.h.js";
import { M1_AMPHIBIOUS } from "./monflag.h.js";
import { M1_ANIMAL } from "./monflag.h.js";
import { M1_BREATHLESS } from "./monflag.h.js";
import { M1_CARNIVORE } from "./monflag.h.js";
import { M1_CLING } from "./monflag.h.js";
import { M1_CONCEAL } from "./monflag.h.js";
import { M1_FLY } from "./monflag.h.js";
import { M1_HERBIVORE } from "./monflag.h.js";
import { M1_HIDE } from "./monflag.h.js";
import { M1_HUMANOID } from "./monflag.h.js";
import { M1_METALLIVORE } from "./monflag.h.js";
import { M1_MINDLESS } from "./monflag.h.js";
import { M1_NEEDPICK } from "./monflag.h.js";
import { M1_NOEYES } from "./monflag.h.js";
import { M1_NOHANDS } from "./monflag.h.js";
import { M1_NOHEAD } from "./monflag.h.js";
import { M1_NOLIMBS } from "./monflag.h.js";
import { M1_NOTAKE } from "./monflag.h.js";
import { M1_OVIPAROUS } from "./monflag.h.js";
import { M1_POIS } from "./monflag.h.js";
import { M1_REGEN } from "./monflag.h.js";
import { M1_SEE_INVIS } from "./monflag.h.js";
import { M1_SLITHY } from "./monflag.h.js";
import { M1_SWIM } from "./monflag.h.js";
import { M1_THICK_HIDE } from "./monflag.h.js";
import { M1_TPORT } from "./monflag.h.js";
import { M1_TPORT_CNTRL } from "./monflag.h.js";
import { M1_TUNNEL } from "./monflag.h.js";
import { M1_UNSOLID } from "./monflag.h.js";
import { M1_WALLWALK } from "./monflag.h.js";
import { M2_COLLECT } from "./monflag.h.js";
import { M2_DEMON } from "./monflag.h.js";
import { M2_DOMESTIC } from "./monflag.h.js";
import { M2_DWARF } from "./monflag.h.js";
import { M2_ELF } from "./monflag.h.js";
import { M2_FEMALE } from "./monflag.h.js";
import { M2_GIANT } from "./monflag.h.js";
import { M2_GNOME } from "./monflag.h.js";
import { M2_GREEDY } from "./monflag.h.js";
import { M2_HOSTILE } from "./monflag.h.js";
import { M2_HUMAN } from "./monflag.h.js";
import { M2_JEWELS } from "./monflag.h.js";
import { M2_LORD } from "./monflag.h.js";
import { M2_MAGIC } from "./monflag.h.js";
import { M2_MALE } from "./monflag.h.js";
import { M2_MERC } from "./monflag.h.js";
import { M2_MINION } from "./monflag.h.js";
import { M2_NASTY } from "./monflag.h.js";
import { M2_NEUTER } from "./monflag.h.js";
import { M2_NOPOLY } from "./monflag.h.js";
import { M2_ORC } from "./monflag.h.js";
import { M2_PEACEFUL } from "./monflag.h.js";
import { M2_PNAME } from "./monflag.h.js";
import { M2_PRINCE } from "./monflag.h.js";
import { M2_ROCKTHROW } from "./monflag.h.js";
import { M2_SHAPESHIFTER } from "./monflag.h.js";
import { M2_STRONG } from "./monflag.h.js";
import { M2_UNDEAD } from "./monflag.h.js";
import { M2_WANDER } from "./monflag.h.js";
import { M2_WERE } from "./monflag.h.js";
import { M3_COVETOUS } from "./monflag.h.js";
import { M3_DISPLACES } from "./monflag.h.js";
import { M3_INFRAVISIBLE } from "./monflag.h.js";
import { M3_INFRAVISION } from "./monflag.h.js";
import { MS_SILENT } from "./monflag.h.js";
import { MZ_LARGE } from "./monflag.h.js";
import { MZ_SMALL } from "./monflag.h.js";
import { PM_AIR_ELEMENTAL } from "./monsters.h.js";
import { PM_APE } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_BABY_GOLD_DRAGON } from "./monsters.h.js";
import { PM_BABY_LONG_WORM } from "./monsters.h.js";
import { PM_BABY_PURPLE_WORM } from "./monsters.h.js";
import { PM_BAT } from "./monsters.h.js";
import { PM_BLACK_LIGHT } from "./monsters.h.js";
import { PM_BLACK_PUDDING } from "./monsters.h.js";
import { PM_CAVE_SPIDER } from "./monsters.h.js";
import { PM_CHICKATRICE } from "./monsters.h.js";
import { PM_COCKATRICE } from "./monsters.h.js";
import { PM_CYCLOPS } from "./monsters.h.js";
import { PM_DEATH } from "./monsters.h.js";
import { PM_ELF } from "./monsters.h.js";
import { PM_FAMINE } from "./monsters.h.js";
import { PM_FIRE_ELEMENTAL } from "./monsters.h.js";
import { PM_FIRE_VORTEX } from "./monsters.h.js";
import { PM_FLAMING_SPHERE } from "./monsters.h.js";
import { PM_FLESH_GOLEM } from "./monsters.h.js";
import { PM_FLOATING_EYE } from "./monsters.h.js";
import { PM_GHOUL } from "./monsters.h.js";
import { PM_GIANT } from "./monsters.h.js";
import { PM_GIANT_BAT } from "./monsters.h.js";
import { PM_GIANT_SPIDER } from "./monsters.h.js";
import { PM_GOLD_DRAGON } from "./monsters.h.js";
import { PM_GREEN_SLIME } from "./monsters.h.js";
import { PM_GREMLIN } from "./monsters.h.js";
import { PM_HEZROU } from "./monsters.h.js";
import { PM_HUMAN } from "./monsters.h.js";
import { PM_IRON_GOLEM } from "./monsters.h.js";
import { PM_LEATHER_GOLEM } from "./monsters.h.js";
import { PM_LICHEN } from "./monsters.h.js";
import { PM_LONG_WORM } from "./monsters.h.js";
import { PM_LONG_WORM_TAIL } from "./monsters.h.js";
import { PM_MANES } from "./monsters.h.js";
import { PM_MASTER_MIND_FLAYER } from "./monsters.h.js";
import { PM_MEDUSA } from "./monsters.h.js";
import { PM_MIND_FLAYER } from "./monsters.h.js";
import { PM_MONKEY } from "./monsters.h.js";
import { PM_ORC } from "./monsters.h.js";
import { PM_PAPER_GOLEM } from "./monsters.h.js";
import { PM_PESTILENCE } from "./monsters.h.js";
import { PM_PIRANHA } from "./monsters.h.js";
import { PM_PURPLE_WORM } from "./monsters.h.js";
import { PM_ROPE_GOLEM } from "./monsters.h.js";
import { PM_SALAMANDER } from "./monsters.h.js";
import { PM_SHOCKING_SPHERE } from "./monsters.h.js";
import { PM_STALKER } from "./monsters.h.js";
import { PM_STRAW_GOLEM } from "./monsters.h.js";
import { PM_VAMPIRE_BAT } from "./monsters.h.js";
import { PM_VROCK } from "./monsters.h.js";
import { PM_WATCHMAN } from "./monsters.h.js";
import { PM_WATCH_CAPTAIN } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PM_WOOD_GOLEM } from "./monsters.h.js";
import { VEGGY } from "./objclass.h.js";
import { BANANA } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { gu } from "./decl.js";
import { u } from "./decl.js";
import { def_monsyms } from "./drawing.js";
import { has_ceiling } from "./dungeon.js";
import { attacktype } from "./mondata.js";
import { breakarm } from "./mondata.js";
import { dmgtype_fromattack } from "./mondata.js";
import { num_horns } from "./mondata.js";
import { sliparm } from "./mondata.js";
import { mons } from "./monst.js";
import { objects } from "./objects.js";
