/**
 * Legacy interface-test compatibility wrapper.
 *
 * The canonical headless game implementation now lives in js/headless_runtime.js.
 * This wrapper keeps the old interface-test harness import path working while
 * delegating gameplay execution to the shared runtime.
 */

import { createHeadlessGame } from '../../js/headless_runtime.js';
import { renderOptionsMenu, toggleOption } from '../../js/options_menu.js';

export class HeadlessGame {
    constructor(seed = 42, roleIndex = 11) {
        this.seed = seed;
        this.roleIndex = roleIndex;

        this.core = createHeadlessGame(seed, roleIndex, {
            name: 'Wizard',
            wizard: true,
        });

        this.display = this.core.display;
        this.flags = this.core.flags;
        this.state = 'in_game';
        this.optionsMenu = {
            page: 1,
            showHelp: false,
        };
    }

    init() {
        this.state = 'in_game';
        this.core.renderCurrentScreen();
    }

    async handleInput(key) {
        if (this.state === 'options_menu') {
            this.handleOptionsInput(key);
            return;
        }

        if (key === 'O') {
            this.state = 'options_menu';
            this.optionsMenu.page = 1;
            this.optionsMenu.showHelp = false;
            this.showOptionsMenu();
            return;
        }

        if (key && key !== 'startup') {
            await this.core.executeCommand(key);
        }
    }

    handleOptionsInput(key) {
        if (key === '>') {
            this.optionsMenu.page = 2;
            this.showOptionsMenu();
            return;
        }
        if (key === '<') {
            this.optionsMenu.page = 1;
            this.showOptionsMenu();
            return;
        }
        if (key === '?') {
            this.optionsMenu.showHelp = !this.optionsMenu.showHelp;
            this.showOptionsMenu();
            return;
        }
        if (key >= 'a' && key <= 'z') {
            toggleOption(this.optionsMenu.page, key, this.flags);
            this.showOptionsMenu();
            return;
        }
        if (key === '\x1b' || key === 'q' || key === 'Q') {
            this.state = 'in_game';
            this.core.renderCurrentScreen();
        }
    }

    showOptionsMenu() {
        const { screen, attrs } = renderOptionsMenu(
            this.optionsMenu.page,
            this.optionsMenu.showHelp,
            this.flags
        );

        this.display.clearScreen();

        for (let r = 0; r < 24; r++) {
            const line = screen?.[r] || '';
            const attrLine = attrs?.[r] || '';
            for (let c = 0; c < 80; c++) {
                const ch = c < line.length ? line[c] : ' ';
                const attr = c < attrLine.length ? parseInt(attrLine[c], 10) || 0 : 0;
                this.display.setCell(c, r, ch, 7, attr);
            }
        }
    }

    getScreen() {
        return this.display.getScreenLines();
    }

    getAttrs() {
        return this.display.getAttrLines();
    }
}
