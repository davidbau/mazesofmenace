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
import { runDocallcmdExtcmdFlowLikeC } from './do_name_call.js';
import { extCmdGetlinHookLikeC, extcmdsMatchLikeC } from './extcmd_list.js';

const ECM_IGNOREAC = 0x01;
const ECM_EXACTMATCH = 0x02;

/** C: win/tty/getline.c hooked_tty_getlin + tty_get_ext_cmd — row-0 `#` / `# name` echo. */
async function readExtcmdLineFromHashLikeC() {
    game._extcmdGetlinActiveLikeC = true;
    const query = '#';
    let line = '';
    /** Chars echoed on row 0 (C NEWAUTOCOMP backspaces over hook tail). */
    let lineVisibleLen = 0;
    /** Suffix auto-filled by ext_cmd_getlin_hook (session still sends those keys). */
    let pendingSuffix = '';
    const wizard = !!game.flags?.wizard;

    const showTop = async () => {
        game._keepToplineUntilNextCommand = true;
        /* C: row-0 wire — lone `#` before input; then `# ` + full obufp; cursor past implicit space. */
        game._extcmdVisibleLenLikeC = lineVisibleLen;
        game._pending_message = (line.length === 0 && lineVisibleLen === 0)
            ? query
            : `${query} ${line}`;
        await flush_screen(1);
    };

    await showTop();

    for (;;) {
        const c = await nhgetch();
        if (c === 27) {
            if (lineVisibleLen > 0 || line.length > 0) {
                line = '';
                lineVisibleLen = 0;
                pendingSuffix = '';
                await showTop();
                continue;
            }
            clearPendingMessageAndToplineLikeC();
            game._keepToplineUntilNextCommand = false;
            delete game._extcmdVisibleLenLikeC;
            game._extcmdGetlinActiveLikeC = false;
            await flush_screen(1);
            return null;
        }
        if (c === 10 || c === 13) break;
        if (c === 8 || c === 127) {
            if (lineVisibleLen > 0) {
                lineVisibleLen--;
                line = line.slice(0, lineVisibleLen);
                pendingSuffix = '';
                await showTop();
            }
            continue;
        }
        if (c < 32 || c === 127 || line.length >= 200) continue;

        const ch = String.fromCharCode(c);
        if (pendingSuffix.length && ch === pendingSuffix[0]) {
            pendingSuffix = pendingSuffix.slice(1);
            lineVisibleLen++;
            await showTop();
            continue;
        }
        pendingSuffix = '';
        line = line.slice(0, lineVisibleLen) + ch;
        lineVisibleLen = line.length;
        const hooked = extCmdGetlinHookLikeC(line, wizard);
        if (hooked && hooked.length > line.length) {
            pendingSuffix = hooked.slice(line.length);
            line = hooked;
            /* visible length stays — hook tail is not echoed (getline.c putsyms \b). */
        } else if (hooked) {
            line = hooked;
            lineVisibleLen = line.length;
        }
        await showTop();
    }

    clearPendingMessageAndToplineLikeC();
    game._keepToplineUntilNextCommand = false;
    delete game._extcmdVisibleLenLikeC;
    game._extcmdGetlinActiveLikeC = false;
    await flush_screen(1);
    return line.trim();
}

/** C: doextcmd — echo '#' on the top line, then read extcmd name until tty newline (`\n`/`\r`). */
export async function runExtcmdFromHashPrefix() {
    game.context.move = 0;
    if (game._overlayScreen || game._inventoryMode) {
        game._overlayScreen = null;
        game._inventoryMode = false;
        await docrt_flags(docrtRefresh);
    }
    const line = await readExtcmdLineFromHashLikeC();
    if (line == null) return;
    if (!line) {
        await pline('Unknown extended command.');
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    const exact = extcmdsMatchLikeC(line, ECM_IGNOREAC | ECM_EXACTMATCH, !!game.flags?.wizard);
    if (exact.length !== 1) {
        await pline(`${String.fromCharCode(35)}${line}: unknown extended command.`);
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }
    const raw = line;
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
    if (w === 'name') {
        await runDocallcmdExtcmdFlowLikeC(game);
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
