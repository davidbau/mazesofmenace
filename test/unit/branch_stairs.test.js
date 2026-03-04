import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STAIRS } from '../../js/config.js';
import { init_dungeons, dungeon_branch, resolveBranchDestinationForStair } from '../../js/dungeon.js';
import { handleDownstairs } from '../../js/do.js';

describe('branch stairs', () => {
    it('resolves branch destination by stair direction', () => {
        init_dungeons(11, true);
        const mines = dungeon_branch('gnomish mines');
        assert.ok(mines, 'expected gnomish mines branch');

        const fromEnd1 = resolveBranchDestinationForStair(
            mines.end1.dnum,
            mines.end1.dlevel,
            !!mines.end1_up
        );
        assert.deepEqual(fromEnd1, { dnum: mines.end2.dnum, dlevel: mines.end2.dlevel });

        const wrongDir = resolveBranchDestinationForStair(
            mines.end1.dnum,
            mines.end1.dlevel,
            !mines.end1_up
        );
        assert.equal(wrongDir, null);
    });

    it('uses branch destination when descending a branch stair', async () => {
        init_dungeons(11, true);
        const mines = dungeon_branch('gnomish mines');
        assert.ok(mines, 'expected gnomish mines branch');

        const downFromEnd1 = !mines.end1_up;
        const current = downFromEnd1 ? mines.end1 : mines.end2;
        const expected = downFromEnd1 ? mines.end2 : mines.end1;

        const loc = { typ: STAIRS, flags: 0, branchStair: true };
        const map = {
            _genDnum: current.dnum,
            at() { return loc; },
        };
        const player = {
            x: 40,
            y: 10,
            dungeonLevel: current.dlevel,
            maxDungeonLevel: current.dlevel,
        };
        const display = {
            async putstr_message() {},
            _moreBlockingEnabled: false,
        };
        let changeArgs = null;
        const game = {
            dnum: current.dnum,
            async changeLevel(...args) {
                changeArgs = args;
            },
        };

        const res = await handleDownstairs(player, map, display, game);

        assert.equal(res.tookTime, true);
        assert.ok(changeArgs, 'expected changeLevel to be called');
        assert.equal(changeArgs[0], expected.dlevel);
        assert.equal(changeArgs[1], 'down');
        assert.deepEqual(changeArgs[2], { targetDnum: expected.dnum });
    });
});
