// extcmd.js — Extended commands (`#` prefix, doextcmd).
// C ref: cmd.c doextcmd, extcmdlist
//
// JS extras: wizard **`#F`**/**`#c`** — hero **`ubuzz`** + **`zap.c`** **`destroy_items(AD_COLD, d(12,6))`** (**`zapyourself`** cold); **`#d`** — **`dig.c`** **`zap_dig`** (**`u.dz`** + horizontal);
// **`#D`** — **`dig.c`** **`dig()`** wall/door completion harness (**`dig_hero.js`**) + **`dig_occupation.js`** **`occupying`** around completion;
// **`#m`**/**`#B`** — monster **`mbuzz`** (**`muse.c`** **`BZ_M_WAND`/`BZ_M_BREATH`** from neighbor toward hero);
// **`#i`**/**`#I`** (wizard) — **`insight.c`** **`item_resistance_message`** + **`zap.c`** **`item_what`** (**`destroy_items.js`** **`u_adtyp`** AD_FIRE/COLD/DISN/ELEC/ACID);
// **`#l`**/**`#L`** — **`pickup.c`** **`use_container`** trapped (**`held`** floor vs invent) → **`trap.c`** **`chest_trap`** (**`pickup.js`**);
// **`#p`**/**`#P`**/**`#pick`** — **`lock.c`** **`pick_lock`** adjacent **door** (**`u.dx`/`u.dy`**) or floor locked box + **`picklock()`** (**`lock_hero.js`**); **`u_handsy`** gate.
// **`#pray`** — **`pray.c`** **`dopray`/`can_pray`/`prayer_done`** (**`pray_hero.js`**); tty extcmd **line** ends at `\n`/`\r` (e.g. **`#pray`** + Enter).
// **`#chat`** — **`sounds.c`** **`dochat`** subset + **`priest.c`** **`priest_talk`** / **`minion.c`** **`bribe`** (**`priest_talk_hero.js`**).
// **`#sit`** — **`sit.c`** **`dosit`** + **`throne_sit_effect`** / **`attrcurse`** / **`rndcurse`** subset (**`sit_hero.js`**).
// wizard **`z`** — **`dozap.js`**.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { readDirIntoU } from './dir_input.js';
import {
    flush_screen, pline, docrt_flags, docrtRefresh, clearPendingMessageAndToplineLikeC,
} from './display.js';
import { versionPlineText } from './nethack_version.js';
import { enhanceWeaponSkillOneStep } from './u_init_skills.js';
import { ZT_SPELL, ZT_COLD, ZT_WAND } from './zap_over_floor.js';
import { tAt } from './search.js';
import { is_pit } from './const.js';
import { canReachFloor } from './engrave.js';
import { doname } from './objnam.js';
import { theObjnamLikeC } from './trap.js';
import { floorContainerAtHeroFeetPickupLikeC, heroOpenTrappedContainerPickupLikeC, carriedTrappedUnlockedContainerPickupLikeC } from './pickup.js';
import { uHandsyHeroLikeC } from './hero_hands.js';
import { heroFirstLockToolOtypLikeC, tryPicklockFloorBoxOccupationRngHeroLikeC, tryPicklockAdjacentDoorHeroLikeC } from './lock_hero.js';
import {
    ubuzzOverFloor,
    mbuzzTowardHeroFromFacingNeighbor,
    mbuzzOffensiveWandFromMonsterTowardMux,
    BZ_M_BREATH,
    BZ_OFS_AD,
    AD_COLD,
    WAN_COLD,
} from './buzz.js';
import { heroZapDigLikeC } from './zap_dig.js';
import { heroDigCompleteWallDoorOrSecretLikeC } from './dig_hero.js';
import { setHeroDiggingOccupationLikeC } from './dig_occupation.js';
import { d } from './rng.js';
import {
    AD_FIRE as DEST_AD_FIRE,
    AD_COLD as DEST_AD_COLD,
    AD_DISN as DEST_AD_DISN,
    AD_ELEC as DEST_AD_ELEC,
    AD_ACID as DEST_AD_ACID,
    destroyItemsYoumonstCold,
    itemWhatAdtypInventoryProtectWizardLikeC,
    uAdtypResistanceObjPercentHeroLikeC,
} from './destroy_items.js';
import { runDoprayExtcmdFlowLikeC } from './pray_hero.js';
import { runDochatExtcmdFlowLikeC } from './priest_talk_hero.js';
import { runDositExtcmdFlowLikeC } from './sit_hero.js';

/** C: doextcmd — echo '#' on the top line, then read extcmd name until tty newline (`\n`/`\r`). */
export async function runExtcmdFromHashPrefix() {
    game.context.move = 0;
    if (game._overlayScreen || game._inventoryMode) {
        game._overlayScreen = null;
        game._inventoryMode = false;
        await docrt_flags(docrtRefresh);
    }
    game._pending_message = '#';
    await flush_screen(1);
    const k = await nhgetch();
    clearPendingMessageAndToplineLikeC();
    if (k === 27) {
        await flush_screen(1);
        return;
    }
    if (k === 10 || k === 13) {
        await pline('Unknown extended command.');
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    let line = String.fromCharCode(k);
    for (;;) {
        const c = await nhgetch();
        if (c === 27) {
            await flush_screen(1);
            return;
        }
        if (c === 10 || c === 13) break;
        line += String.fromCharCode(c);
        if (line.length > 200) break;
    }
    const raw = line.trim();
    const w = raw.toLowerCase();

    if (w === 'pray') {
        await runDoprayExtcmdFlowLikeC(game);
        return;
    }
    if (w === 'chat') {
        await runDochatExtcmdFlowLikeC(game);
        return;
    }
    if (w === 'sit') {
        await runDositExtcmdFlowLikeC(game);
        return;
    }
    if (w === 'version' || w === 'v') {
        await pline(versionPlineText());
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if (w === 'enhance' || w === 'e' || w.startsWith('enhanc')) {
        /* C: cmd.c doextcmd → enhance_weapon_skill — menu not ported; wizard y_n → speedy */
        let speedy = false;
        if (game.flags?.wizard) {
            await pline('Advance skills without practice? [yn]');
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            const ans = await nhgetch();
            speedy = ans === 121 || ans === 89; /* y Y */
        }
        const r = enhanceWeaponSkillOneStep(game, { speedy });
        if (!r.ok) await pline('You cannot enhance any skills at the moment.');
        else {
            for (const line2 of r.plines) {
                await pline(line2);
            }
        }
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if ((w === 'insight' || w === 'i') && game.flags?.wizard) {
        /* C: insight.c item_resistance_message + zap.c item_what — monattk.h AD types with **`u_adtyp`** in zap.c. */
        const g = game;
        let any = false;
        const lines = [
            [DEST_AD_FIRE, 'fire'],
            [DEST_AD_COLD, 'cold'],
            [DEST_AD_DISN, 'disintegration'],
            [DEST_AD_ELEC, 'electric shocks'],
            [DEST_AD_ACID, 'acid'],
        ];
        for (let i = 0; i < lines.length; i++) {
            const ad = lines[i][0];
            const word = lines[i][1];
            const prot = uAdtypResistanceObjPercentHeroLikeC(g, ad);
            if (!prot) continue;
            any = true;
            const somewhat = prot < 99;
            const suf = itemWhatAdtypInventoryProtectWizardLikeC(g, ad);
            await pline(
                `Your items ${somewhat ? 'are somewhat' : 'are'} protected from ${word}${suf}.`,
            );
        }
        if (!any) {
            await pline(
                'Your items are not specially protected from fire, cold, disintegration, electric shocks, or acid.',
            );
        }
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if ((raw === 'F' || raw === 'f') && game.flags?.wizard) {
        /* C: zap.c ubuzz — cone of cold (**`ZT_SPELL(ZT_COLD)`**), wizard harness. */
        await ubuzzOverFloor(game, ZT_SPELL(ZT_COLD), 0);
        await destroyItemsYoumonstCold(game, d(12, 6));
        await flush_screen(1);
        return;
    }
    if (w === 'c' && game.flags?.wizard) {
        /* C: zap.c weffects — wand of cold (**`ZT_WAND(ZT_COLD)`**), same facing as **`#F`**. */
        await ubuzzOverFloor(game, ZT_WAND(ZT_COLD), 6);
        await destroyItemsYoumonstCold(game, d(12, 6));
        await flush_screen(1);
        return;
    }
    if (w === 'd' && game.flags?.wizard) {
        /* C: dig.c zap_dig — wand of digging; same facing as **`#c`** (**`WAN_DIGGING`**). */
        await heroZapDigLikeC(game);
        await flush_screen(1);
        return;
    }
    if (raw === 'D' && game.flags?.wizard) {
        /* C: dig.c **`dig()`** completion at adjacent cell (**`dpx,dpy`**) — wall/SDOOR/closed door + shop billing. */
        await pline('Dig toward which wall or door?');
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        if (!(await readDirIntoU(game))) {
            await pline('Never mind.');
            await flush_screen(1);
            return;
        }
        const u = game.u;
        const tx = (u.ux | 0) + (u.dx | 0);
        const ty = (u.uy | 0) + (u.dy | 0);
        setHeroDiggingOccupationLikeC(game, true);
        try {
            if (!(await heroDigCompleteWallDoorOrSecretLikeC(game, tx, ty))) {
                await pline('Nothing happens.');
                game._retainMessageAfterCommand = true;
            }
        } finally {
            setHeroDiggingOccupationLikeC(game, false);
        }
        await flush_screen(1);
        return;
    }
    if (w === 'm' && game.flags?.wizard) {
        /* C: muse.c **`use_offensive`** ray wand — same geometry as neighbor harness (**`mx,my`→`mux,muy`**). */
        const u = game.u;
        let ok = false;
        if (u) {
            const dx0 = u.dx | 0;
            const dy0 = u.dy | 0;
            if (dx0 !== 0 || dy0 !== 0) {
                const mtmp = {
                    mx: (u.ux + dx0) | 0,
                    my: (u.uy + dy0) | 0,
                    mux: u.ux | 0,
                    muy: u.uy | 0,
                    mwandexp: 1,
                };
                ok = await mbuzzOffensiveWandFromMonsterTowardMux(game, mtmp, WAN_COLD);
            }
        }
        if (!ok) {
            await pline('Nothing happens.');
            game._retainMessageAfterCommand = true;
        }
        await flush_screen(1);
        return;
    }
    if ((raw === 'B' || w === 'b') && game.flags?.wizard) {
        /* C: zap.c **`dobuzz`** monster breath — **`BZ_M_BREATH(BZ_OFS_AD(AD_COLD))`**. */
        const breath = BZ_M_BREATH(BZ_OFS_AD(AD_COLD));
        if (!(await mbuzzTowardHeroFromFacingNeighbor(game, breath, 6))) {
            await pline('Nothing happens.');
            game._retainMessageAfterCommand = true;
        }
        await flush_screen(1);
        return;
    }
    if (w === 'loot' || w === 'l') {
        /* C: pickup.c **`use_container`** — trapped container: floor (**`held`** false) or invent (**`held`** true); **`chest_trap(HAND)`**. */
        const g = game;
        const u = g.u;
        if (!u || !g.level) {
            await pline('Nothing happens.');
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
        if (!(await uHandsyHeroLikeC(g))) {
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
        const tr = tAt(u.ux | 0, u.uy | 0);
        const reach = canReachFloor(!!(tr && is_pit(tr.ttyp)));
        const boxF = reach ? floorContainerAtHeroFeetPickupLikeC(g) : null;
        const boxC = carriedTrappedUnlockedContainerPickupLikeC(g);

        if (boxF && !(boxF.olocked | 0) && (boxF.otrapped | 0)) {
            if (await heroOpenTrappedContainerPickupLikeC(g, boxF, false)) g.context.move = 1;
        } else if (boxC) {
            if (await heroOpenTrappedContainerPickupLikeC(g, boxC, true)) g.context.move = 1;
        } else if (boxF && (boxF.olocked | 0)) {
            await pline(`${theObjnamLikeC(doname(boxF, g))} is locked.`);
        } else if (boxF && !(boxF.otrapped | 0)) {
            await pline('That container is not trapped. (Full #loot not ported.)');
        } else if (!reach) {
            await pline('You cannot reach the floor!');
        } else {
            await pline('There is no trapped container here or in your pack.');
        }
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    if (w === 'pick' || w === 'p' || w.startsWith('pick')) {
        /* C: lock.c **`pick_lock`** / **`picklock`** — neighbor door when **`u.dx`/`u.dy`** set; else floor locked **`Is_box`**. */
        const g = game;
        const u = g.u;
        if (!u || !g.level) {
            await pline('Nothing happens.');
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
        if (!(await uHandsyHeroLikeC(g))) {
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }

        const dx = u.dx | 0;
        const dy = u.dy | 0;
        if (dx !== 0 || dy !== 0) {
            const dr = await tryPicklockAdjacentDoorHeroLikeC(g, dx, dy);
            if (dr != null) {
                if (
                    dr === 'success'
                    || dr === 'gave_up'
                    || dr === 'disarmed_trap'
                    || dr === 'stopped_at_trap'
                    || dr === 'monster_block'
                    || dr === 'bad_door_state'
                    || dr === 'credit_lock'
                    || dr === 'no_tool'
                ) {
                    g.context.move = 1;
                }
                game._retainMessageAfterCommand = true;
                await flush_screen(1);
                return;
            }
        }

        const tr = tAt(u.ux | 0, u.uy | 0);
        if (!canReachFloor(!!(tr && is_pit(tr.ttyp)))) {
            await pline('You cannot reach the floor!');
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
        const box = floorContainerAtHeroFeetPickupLikeC(g);
        if (!box) {
            await pline('There is no container here.');
        } else if (!(box.olocked | 0)) {
            await pline('That container is not locked.');
        } else {
            const pickOtyp = heroFirstLockToolOtypLikeC(g);
            if (pickOtyp == null) {
                await pline("You don't have anything to pick that lock with.");
            } else {
                const r = await tryPicklockFloorBoxOccupationRngHeroLikeC(g, box);
                if (r === 'success' || r === 'gave_up' || r === 'disarmed_trap' || r === 'stopped_at_trap') g.context.move = 1;
            }
        }
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    await pline(`Unknown extended command '#${raw || w}'.`);
    game._retainMessageAfterCommand = true;
    await flush_screen(1);
}
