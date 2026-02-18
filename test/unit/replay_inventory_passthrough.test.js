import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replaySession } from '../../js/replay_core.js';

describe('replay inventory passthrough', () => {
    it('lets a non-space key dismiss inventory and execute as a command', async () => {
        const session = {
            version: 3,
            seed: 1,
            options: {
                name: 'Wizard',
                role: 'Valkyrie',
                race: 'human',
                gender: 'female',
                align: 'neutral',
            },
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                { key: 'i', action: 'inventory', rng: [], screen: [] },
                { key: 's', action: 'search', rng: [], screen: [] },
            ],
        };

        const replay = await replaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        assert.match((replay.steps[0].screen || [])[0] || '', /Weapons/);
        assert.doesNotMatch((replay.steps[1].screen || [])[0] || '', /Weapons/);
        assert.ok((replay.steps[1].rngCalls || 0) > 0);
    });
});
