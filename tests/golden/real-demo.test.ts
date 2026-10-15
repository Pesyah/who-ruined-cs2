import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { CDataGCCStrike15_v2_MatchInfoSchema, fromBinary } from 'csgo-protobuf';
import { describe, expect, it } from 'vitest';
import { normalizeSnapshot, stableTeamId } from '../../packages/match-domain/dist/index.js';
import { parseDemoSnapshot } from '../../packages/parser-adapter/dist/index.js';

const demoPath = process.env.GOLDEN_DEMO_PATH;
const infoPath = process.env.GOLDEN_INFO_PATH;
const hasFixture = Boolean(demoPath && infoPath);
const steamId64Base = 76_561_197_960_265_728n;

describe.skipIf(!hasFixture)('real demo reconciliation', () => {
  it('matches the external info scoreboard and every round score transition', async () => {
    if (!demoPath || !infoPath) throw new Error('GOLDEN_DEMO_PATH and GOLDEN_INFO_PATH are required');
    const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8')) as {
      fixtures: Array<{ sha256: string; expected: { map: string; players: number; teams: number; rounds: number; deathEvents: number; scoreAfterByReferenceTeam: number[][]; sortedKda: number[][] } }>;
    };
    const fixture = manifest.fixtures[0];
    if (!fixture) throw new Error('Golden manifest is empty');
    expect(createHash('sha256').update(await readFile(demoPath)).digest('hex')).toBe(fixture.sha256);
    const match = normalizeSnapshot({
      matchId: 'golden-local',
      fileSha256: '0'.repeat(64),
      normalizedAt: '2000-01-01T00:00:00.000Z',
      snapshot: parseDemoSnapshot(demoPath)
    });
    const info = fromBinary(CDataGCCStrike15_v2_MatchInfoSchema, await readFile(infoPath));
    const referenceRounds = info.roundstatsall;
    const finalReference = referenceRounds.at(-1);
    if (!finalReference?.reservation || finalReference.reservation.accountIds.length !== 10) throw new Error('Reference info does not contain a 10-player roster');

    const referencePlayerIds = finalReference.reservation.accountIds.map((accountId) => (BigInt(accountId) + steamId64Base).toString());
    const referenceTeamIds = [stableTeamId(referencePlayerIds.slice(0, 5)), stableTeamId(referencePlayerIds.slice(5, 10))];
    expect(match.qualityIssues).toEqual([]);
    expect(match.quality).toBe('VALID');
    expect(match.map).toBe(fixture.expected.map);
    expect(match.players).toHaveLength(fixture.expected.players);
    expect(match.teams).toHaveLength(fixture.expected.teams);
    expect(match.rounds).toHaveLength(fixture.expected.rounds);
    expect(match.rounds).toHaveLength(referenceRounds.length);

    for (const [index, round] of match.rounds.entries()) {
      const referenceScores = referenceRounds[index]?.teamScores;
      expect(referenceScores).toHaveLength(2);
      expect(referenceTeamIds.map((teamId) => round.scoreAfter[teamId])).toEqual(referenceScores);
    }
    expect(match.rounds.map((round) => referenceTeamIds.map((teamId) => round.scoreAfter[teamId]))).toEqual(fixture.expected.scoreAfterByReferenceTeam);

    const deaths = match.events.filter((event) => event.kind === 'PLAYER_DEATH');
    const actualKda = referencePlayerIds.map((playerId) => [
      deaths.filter((event) => event.actorId === playerId && event.targetId !== playerId && event.attrs.friendlyFire !== true).length,
      deaths.filter((event) => event.targetId === playerId).length,
      deaths.filter((event) => event.assisterId === playerId).length
    ]);
    const expectedKda = referencePlayerIds.map((_playerId, index) => [finalReference.kills[index], finalReference.deaths[index], finalReference.assists[index]]);
    expect(actualKda).toEqual(expectedKda);
    expect(actualKda.toSorted((a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0) || (a[2] ?? 0) - (b[2] ?? 0))).toEqual(fixture.expected.sortedKda);
    expect(deaths).toHaveLength(fixture.expected.deathEvents);
  });
});
