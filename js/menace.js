// menace.js -- Browser-only game startup wiring.
// Keeps DOM, URL, and window lifecycle logic out of the NetHackGame core.

import { Display } from './display.js';
import { initBrowserInput } from './browser_input.js';
import { clearGameUrlParams, getUrlParams, saveGame, deleteSave } from './storage.js';
import { NetHackGame } from './nethack.js';
import { getKeylog, saveKeylog, startReplay } from './keylog.js';
import { VERSION_STRING } from './config.js';
window.MENACE_VERSION = VERSION_STRING;

function createBrowserLifecycle() {
    return {
        restart: () => window.location.reload(),
        replaceUrlParams: (params) => {
            const url = new URL(window.location.href);
            for (const [key, value] of Object.entries(params || {})) {
                if (value === null || value === undefined) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, String(value));
                }
            }
            window.history.replaceState({}, '', url.toString());
        },
    };
}

function registerMenuApis() {
    window._saveAndQuit = async function() {
        if (window.gameInstance) await saveGame(window.gameInstance);
        window.location.reload();
    };
    window._newGame = function() {
        deleteSave();
        window.location.reload();
    };
}

function registerKeylogApis() {
    window.get_keylog = () => {
        const kl = getKeylog();
        console.log(JSON.stringify(kl, null, 2));
        return kl;
    };
    window.run_keylog = async (src) => {
        const data = typeof src === 'string' ? await (await fetch(src)).json() : src;
        startReplay(data);
    };
    window.save_keylog = saveKeylog;
}

window.addEventListener('DOMContentLoaded', async () => {
    registerMenuApis();
    registerKeylogApis();
    const opts = getUrlParams();
    let currentFlags = null;
    let currentDisplay = null;
    const input = initBrowserInput({
        getFlags: () => currentFlags,
        getDisplay: () => currentDisplay,
    });

    const game = new NetHackGame({
        display: new Display('game'),
        input,
        lifecycle: createBrowserLifecycle(),
        hooks: {
            onRuntimeBindings: ({ game: runningGame, flags, display }) => {
                currentFlags = flags;
                currentDisplay = display;
                window.gameInstance = runningGame;
                window.gameFlags = flags;
                window.gameDisplay = display;
            },
            onGameplayStart: () => {
                clearGameUrlParams();
                document.body.classList.add('gameplay-active');
            },
            onGameOver: () => {
                document.body.classList.remove('gameplay-active');
            },
        },
    });

    await game.init({
        seed: opts.seed,
        wizard: opts.wizard,
        reset: opts.reset,
    });
    await game.gameLoop();
});
