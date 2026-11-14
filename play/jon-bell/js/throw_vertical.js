// C dothrow.c:1220-1430 — upward throws and falling-object consequences.
import { game } from './gstate.js';
import { In_endgame, Is_earthlevel, HEAD, FACE, KILLED_BY, KILLED_BY_AN,
    STONING, WT_TO_DMG, POTHIT_HERO_THROW, Has_contents, ismnum,
    STONE_RES, Upolyd } from './const.js';
import { PM_SHADE, PM_STONE_GOLEM } from './pm.generated.js';
import { rn1 } from './rng.js';
import { rnd } from './rnd.js';
import { pline } from './pline.js';
import { Blind } from './vision.js';
import { potionhit, POTION_CLASS } from './potion.js';
import { body_part } from './cmd.js';
import { ceiling } from './dungeon.js';
import { breaktest, breakmsg, breakobj, hitfloor } from './dothrow.js';
import { dropy } from './do.js';
import { touch_petrifies } from './uhitm.js';
import { dmgval } from './weapon.js';
import { artifact_hit } from './artifact.js';
import { hard_helmet } from './do_wear.js';
import { can_blnd, poly_when_stoned, mon_hates_blessings } from './mondata.js';
import { BlindedTimeout, make_blinded, hit } from './zap.js';
import { polymon } from './polyself.js';
import { permonstTemplate } from './makemon.js';
import { hates_silver } from './mondata.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { doname, helm_simple_name, thesimpleoname, an } from './objnam.js';
import { losehp } from './hack.js';
import { done } from './end.js';
import { has_ceiling } from './dungeon.js'; // relocate-fns
export { harmless_missile, toss_up } from './dothrow.js'; // relocate-fns






