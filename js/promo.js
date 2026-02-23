// promo.js -- Attract-mode promotional display.
// Shown when the user declines to play again after game over.
// Cycles through scenes and a high-score table until any key is pressed.

import { CLR_RED, CLR_YELLOW, CLR_BRIGHT_GREEN, CLR_WHITE, CLR_GRAY } from './display.js';
import { loadScores, formatTopTenHeader, formatTopTenEntry } from './topten.js';
import { VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL } from './config.js';

// NETHACK logo — hand-crafted 5×5 pixel-art letterforms
const LETTERS = {
    N: ['█   █', '██  █', '█ █ █', '█  ██', '█   █'],
    E: ['█████', '█    ', '████ ', '█    ', '█████'],
    T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
    H: ['█   █', '█   █', '█████', '█   █', '█   █'],
    A: [' ███ ', '█   █', '█████', '█   █', '█   █'],
    C: [' ████', '█    ', '█    ', '█    ', ' ████'],
    K: ['█   █', '█  █ ', '███  ', '█  █ ', '█   █'],
};

// Draw the "NETHACK" logo starting at the given row, centered on 80 cols.
function drawLogo(display, startRow, color) {
    const word = 'NETHACK';
    const letterWidth = 5;
    const gap = 2;
    const totalWidth = word.length * letterWidth + (word.length - 1) * gap;
    const startCol = Math.floor((80 - totalWidth) / 2);
    for (let li = 0; li < word.length; li++) {
        const rows = LETTERS[word[li]];
        const colOff = startCol + li * (letterWidth + gap);
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < letterWidth; c++) {
                if (rows[r][c] === '█') {
                    display.setCell(colOff + c, startRow + r, '█', color);
                }
            }
        }
    }
}

// Scene 1: red dragon guarding a gold pile in a dungeon room.
function drawDragonScene(display) {
    const left = 15, right = 64;
    const top = 11, bottom = 21;

    // Room walls
    for (let col = left; col <= right; col++) {
        display.setCell(col, top,    '-', CLR_GRAY);
        display.setCell(col, bottom, '-', CLR_GRAY);
    }
    for (let row = top; row <= bottom; row++) {
        display.setCell(left,  row, '|', CLR_GRAY);
        display.setCell(right, row, '|', CLR_GRAY);
    }
    display.setCell(left,  top,    '+', CLR_GRAY);
    display.setCell(right, top,    '+', CLR_GRAY);
    display.setCell(left,  bottom, '+', CLR_GRAY);
    display.setCell(right, bottom, '+', CLR_GRAY);

    // Scattered floor tiles
    const floor = [
        [18,13],[23,13],[31,13],[39,13],[46,13],[54,13],[61,13],
        [17,14],[25,14],[34,14],[42,14],[51,14],[62,14],
        [19,15],[29,15],[37,15],[56,15],[62,15],
        [17,16],[23,16],[57,16],[63,16],
        [18,17],[26,17],[35,17],[53,17],[61,17],
        [21,18],[29,18],[39,18],[48,18],[59,18],
        [17,19],[25,19],[33,19],[44,19],[57,19],[62,19],
        [20,20],[30,20],[43,20],[52,20],[61,20],
    ];
    for (const [col, row] of floor) {
        display.setCell(col, row, '.', CLR_GRAY);
    }

    // Bones near the dragon
    display.setCell(28, 17, '%', CLR_GRAY);
    display.setCell(30, 18, '%', CLR_GRAY);

    // The dragon
    display.setCell(27, 16, 'D', CLR_RED);

    // Gold pile (cluster)
    const gold = [
                    [47,14],[48,14],
        [45,15],[46,15],[47,15],[48,15],[49,15],[50,15],
        [44,16],[45,16],[46,16],[47,16],[48,16],[49,16],[50,16],[51,16],
        [45,17],[46,17],[47,17],[48,17],[49,17],[50,17],
                    [47,18],[48,18],
    ];
    for (const [col, row] of gold) {
        display.setCell(col, row, '$', CLR_YELLOW);
    }
}

// Scene 2: large green potion bottle.
function drawPotionScene(display) {
    const cx = 40;  // center column
    const liq = CLR_BRIGHT_GREEN;
    const rim = CLR_GRAY;

    // Bottle cap / stopper
    display.setCell(cx - 1, 10, '[', rim);
    display.setCell(cx,     10, '=', liq);
    display.setCell(cx + 1, 10, ']', rim);

    // Neck (rows 11-12)
    for (let row = 11; row <= 12; row++) {
        display.setCell(cx - 1, row, '|', rim);
        display.setCell(cx,     row, '!', liq);
        display.setCell(cx + 1, row, '|', rim);
    }

    // Shoulder (row 13)
    display.setCell(cx - 4, 13, '/', rim);
    display.setCell(cx - 3, 13, '_', rim);
    display.setCell(cx - 2, 13, '_', rim);
    display.setCell(cx - 1, 13, '(', rim);
    display.setCell(cx,     13, '!', liq);
    display.setCell(cx + 1, 13, ')', rim);
    display.setCell(cx + 2, 13, '_', rim);
    display.setCell(cx + 3, 13, '_', rim);
    display.setCell(cx + 4, 13, '\\', rim);

    // Body (rows 14-20)
    for (let row = 14; row <= 20; row++) {
        display.setCell(cx - 6, row, '|', rim);
        for (let col = cx - 5; col <= cx + 5; col++) {
            display.setCell(col, row, '!', liq);
        }
        display.setCell(cx + 6, row, '|', rim);
    }

    // Base (row 21)
    display.setCell(cx - 6, 21, '\\', rim);
    for (let col = cx - 5; col <= cx + 5; col++) {
        display.setCell(col, 21, '_', rim);
    }
    display.setCell(cx + 6, 21, '/', rim);

    // Label in the middle of the body
    const label = 'POTION';
    const labelCol = cx - Math.floor(label.length / 2);
    for (let i = 0; i < label.length; i++) {
        display.setCell(labelCol + i, 17, label[i], CLR_WHITE);
    }
}

// High-score table display.
function drawHighScores(display) {
    const scores = loadScores();
    const title = 'High Scores';
    const titleRow = 11;
    const headerRow = 13;
    let row = 14;

    display.putstr(Math.floor((80 - title.length) / 2), titleRow, title, CLR_YELLOW);
    display.putstr(4, headerRow, formatTopTenHeader(), CLR_GRAY);

    if (scores.length === 0) {
        const msg = '(no scores recorded yet)';
        display.putstr(Math.floor((80 - msg.length) / 2), row + 2, msg, CLR_GRAY);
    } else {
        const maxEntries = Math.min(scores.length, 6);
        for (let i = 0; i < maxEntries; i++) {
            const lines = formatTopTenEntry(scores[i], i + 1);
            for (const line of lines) {
                if (row < 22) {
                    display.putstr(4, row++, line, CLR_WHITE);
                }
            }
        }
    }
}

// Render a full promo frame: logo + version + scene + prompt.
function renderFrame(display, sceneIdx) {
    const version = `NetHack ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL}`;
    const prompt  = '\u2014 Press any key to play \u2014';

    display.clearScreen();

    // Centered logo (rows 2-6)
    drawLogo(display, 2, CLR_YELLOW);

    // Version line (row 8)
    display.putstr(Math.floor((80 - version.length) / 2), 8, version, CLR_GRAY);

    // Scene
    const scenes = [drawDragonScene, drawHighScores, drawPotionScene];
    scenes[sceneIdx % scenes.length](display);

    // Always-visible play prompt (row 22)
    display.putstr(Math.floor((80 - prompt.length) / 2), 22, prompt, CLR_WHITE);
}

export class Promo {
    // Run the attract-mode loop.
    // Displays cycling scenes until any key is pressed.
    // Calls onPlay() when the user presses a key.
    async run(display, nhgetch, onPlay) {
        let sceneIdx = 0;
        let keyPressed = false;

        // A single persistent nhgetch() call covers all scene transitions.
        // Racing it against per-scene timers lets us advance slides without
        // calling nhgetch() again (which would overwrite the pending resolver).
        const keyPromise = nhgetch().then(ch => {
            keyPressed = true;
            return ch;
        });

        while (!keyPressed) {
            renderFrame(display, sceneIdx);

            // Wait 5 s or until a key arrives — whichever comes first.
            const timer = new Promise(resolve => setTimeout(resolve, 5000));
            await Promise.race([keyPromise, timer]);

            if (keyPressed) break;
            sceneIdx++;
        }

        onPlay();
    }
}
