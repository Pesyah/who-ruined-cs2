import { z } from 'zod';
import {
  loadNativeParser,
  type DemoParserPort,
} from './native-adapter.js';
import {
  parseDemoSnapshot,
  parsedDemoSnapshotSchema,
} from './normalization-mapping.js';
import {
  parseParticipationSupplement,
  parsedParticipationSupplementSchema,
} from './participation-evidence.js';

export const parsedMatchSnapshotEnvelopeSchema = z.object({
  schemaVersion: z.literal('parser-match-snapshot@1'),
  snapshot: parsedDemoSnapshotSchema,
  participation: parsedParticipationSupplementSchema,
}).strict();

export type ParsedMatchSnapshotEnvelope = z.infer<
  typeof parsedMatchSnapshotEnvelopeSchema
>;

export function validateParsedMatchSnapshotEnvelope(
  value: unknown,
): ParsedMatchSnapshotEnvelope {
  return parsedMatchSnapshotEnvelopeSchema.parse(value);
}

export function parseDemoMatchSnapshot(
  path: string,
  parser: DemoParserPort = loadNativeParser(),
): ParsedMatchSnapshotEnvelope {
  const snapshot = parseDemoSnapshot(path, parser);
  return {
    schemaVersion: 'parser-match-snapshot@1',
    snapshot,
    participation: parseParticipationSupplement(path, snapshot, parser),
  };
}
