// selfplay/interface/adapter.js -- Abstract game interface
//
// Defines the GameAdapter interface that all platform adapters implement.
// The agent interacts with the game exclusively through this interface,
// making it work identically against the C binary and the JS port.

/**
 * Abstract base class for game adapters.
 * Subclasses must implement all methods.
 */
export class GameAdapter {
    /**
     * Start a new game session.
     * @param {Object} options
     * @param {number} [options.seed] - PRNG seed for deterministic games
     * @param {string} [options.role] - Role name (e.g., 'Valkyrie')
     * @param {string} [options.race] - Race name (e.g., 'human')
     * @param {string} [options.name] - Character name
     * @param {string} [options.gender] - 'male' or 'female'
     * @param {string} [options.align] - 'lawful', 'neutral', 'chaotic'
     * @returns {Promise<void>}
     */
    async start(options = {}) {
        throw new Error('GameAdapter.start() not implemented');
    }

    /**
     * Send a keystroke to the game.
     * @param {string} key - Single character or key name
     * @returns {Promise<void>}
     */
    async sendKey(key) {
        throw new Error('GameAdapter.sendKey() not implemented');
    }

    /**
     * Read the current screen state.
     * Returns a 24-row x 80-col grid of {ch, color} objects.
     * @returns {Promise<Array>} - grid[row][col] = {ch: string, color: number}
     */
    async readScreen() {
        throw new Error('GameAdapter.readScreen() not implemented');
    }

    /**
     * Check if the game is still running (not game over / quit).
     * @returns {Promise<boolean>}
     */
    async isRunning() {
        throw new Error('GameAdapter.isRunning() not implemented');
    }

    /**
     * Stop the game session and clean up.
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error('GameAdapter.stop() not implemented');
    }

    /**
     * Get the current message line text.
     * Default implementation reads screen and extracts row 0.
     * @returns {Promise<string>}
     */
    async getMessage() {
        const grid = await this.readScreen();
        if (!grid || !grid[0]) return '';
        return grid[0].map(c => c.ch).join('').trimEnd();
    }
}
