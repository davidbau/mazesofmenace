// dat/quest-levels.js — registry of the ported role quest levels.
// C ref: the dat/<Role>-{strt,loca,goal,fila,filb}.lua files.
//
// Keys are the substituted proto names: the "x-" names in the quest dungeon
// take the hero's role filecode (src/dungeon.c:1136), so makemaz() asks for
// "Arc-strt", "Arc-fila", ... directly. Spread into SPECIAL_LEVELS by
// dat/levels.js. The Bar-* set predates this file and stays in levels.js.

import { arcstrt_level } from './arc-strt.js';
import { arcloca_level } from './arc-loca.js';
import { arcgoal_level } from './arc-goal.js';
import { arcfila_level } from './arc-fila.js';
import { arcfilb_level } from './arc-filb.js';
import { pristrt_level } from './pri-strt.js';
import { priloca_level } from './pri-loca.js';
import { prigoal_level } from './pri-goal.js';
import { prifila_level } from './pri-fila.js';
import { prifilb_level } from './pri-filb.js';
import { valstrt_level } from './val-strt.js';
import { valloca_level } from './val-loca.js';
import { valgoal_level } from './val-goal.js';
import { valfila_level } from './val-fila.js';
import { valfilb_level } from './val-filb.js';
import { wizstrt_level } from './wiz-strt.js';
import { wizloca_level } from './wiz-loca.js';
import { wizgoal_level } from './wiz-goal.js';
import { wizfila_level } from './wiz-fila.js';
import { wizfilb_level } from './wiz-filb.js';
import { samstrt_level } from './sam-strt.js';
import { samloca_level } from './sam-loca.js';
import { samgoal_level } from './sam-goal.js';
import { samfila_level } from './sam-fila.js';
import { samfilb_level } from './sam-filb.js';
import { cavstrt_level } from './cav-strt.js';
import { cavloca_level } from './cav-loca.js';
import { cavgoal_level } from './cav-goal.js';
import { cavfila_level } from './cav-fila.js';
import { cavfilb_level } from './cav-filb.js';
import { knistrt_level } from './kni-strt.js';
import { kniloca_level } from './kni-loca.js';
import { knigoal_level } from './kni-goal.js';
import { knifila_level } from './kni-fila.js';
import { knifilb_level } from './kni-filb.js';
import { toustrt_level } from './tou-strt.js';
import { touloca_level } from './tou-loca.js';
import { tougoal_level } from './tou-goal.js';
import { toufila_level } from './tou-fila.js';
import { toufilb_level } from './tou-filb.js';
import { rogstrt_level } from './rog-strt.js';
import { rogloca_level } from './rog-loca.js';
import { roggoal_level } from './rog-goal.js';
import { rogfila_level } from './rog-fila.js';
import { rogfilb_level } from './rog-filb.js';
import { ranstrt_level } from './ran-strt.js';
import { ranloca_level } from './ran-loca.js';
import { rangoal_level } from './ran-goal.js';
import { ranfila_level } from './ran-fila.js';
import { ranfilb_level } from './ran-filb.js';
import { monstrt_level } from './mon-strt.js';
import { monloca_level } from './mon-loca.js';
import { mongoal_level } from './mon-goal.js';
import { monfila_level } from './mon-fila.js';
import { monfilb_level } from './mon-filb.js';
import { heastrt_level } from './hea-strt.js';
import { healoca_level } from './hea-loca.js';
import { heagoal_level } from './hea-goal.js';
import { heafila_level } from './hea-fila.js';
import { heafilb_level } from './hea-filb.js';

export const QUEST_LEVELS = {
    'Arc-strt': arcstrt_level,
    'Arc-loca': arcloca_level,
    'Arc-goal': arcgoal_level,
    'Arc-fila': arcfila_level,
    'Arc-filb': arcfilb_level,
    'Pri-strt': pristrt_level,
    'Pri-loca': priloca_level,
    'Pri-goal': prigoal_level,
    'Pri-fila': prifila_level,
    'Pri-filb': prifilb_level,
    'Val-strt': valstrt_level,
    'Val-loca': valloca_level,
    'Val-goal': valgoal_level,
    'Val-fila': valfila_level,
    'Val-filb': valfilb_level,
    'Wiz-strt': wizstrt_level,
    'Wiz-loca': wizloca_level,
    'Wiz-goal': wizgoal_level,
    'Wiz-fila': wizfila_level,
    'Wiz-filb': wizfilb_level,
    'Sam-strt': samstrt_level,
    'Sam-loca': samloca_level,
    'Sam-goal': samgoal_level,
    'Sam-fila': samfila_level,
    'Sam-filb': samfilb_level,
    'Cav-strt': cavstrt_level,
    'Cav-loca': cavloca_level,
    'Cav-goal': cavgoal_level,
    'Cav-fila': cavfila_level,
    'Cav-filb': cavfilb_level,
    'Kni-strt': knistrt_level,
    'Kni-loca': kniloca_level,
    'Kni-goal': knigoal_level,
    'Kni-fila': knifila_level,
    'Kni-filb': knifilb_level,
    'Tou-strt': toustrt_level,
    'Tou-loca': touloca_level,
    'Tou-goal': tougoal_level,
    'Tou-fila': toufila_level,
    'Tou-filb': toufilb_level,
    'Rog-strt': rogstrt_level,
    'Rog-loca': rogloca_level,
    'Rog-goal': roggoal_level,
    'Rog-fila': rogfila_level,
    'Rog-filb': rogfilb_level,
    'Ran-strt': ranstrt_level,
    'Ran-loca': ranloca_level,
    'Ran-goal': rangoal_level,
    'Ran-fila': ranfila_level,
    'Ran-filb': ranfilb_level,
    'Mon-strt': monstrt_level,
    'Mon-loca': monloca_level,
    'Mon-goal': mongoal_level,
    'Mon-fila': monfila_level,
    'Mon-filb': monfilb_level,
    'Hea-strt': heastrt_level,
    'Hea-loca': healoca_level,
    'Hea-goal': heagoal_level,
    'Hea-fila': heafila_level,
    'Hea-filb': heafilb_level,
};
