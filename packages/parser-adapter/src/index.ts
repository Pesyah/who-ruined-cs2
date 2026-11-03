export {
  PARSER_LIBRARY_VERSION,
  isSource2Header,
  loadNativeParser,
  sanitizeSchema,
  toRows,
  type DemoParserPort,
  type UnknownRow,
} from './native-adapter.js';
export { asInteger, asText } from './decoding.js';
export {
  NORMALIZER_VERSION,
  parseDemoSnapshot,
  parsedDemoSnapshotSchema,
  toNormalizationInput,
  validateParsedDemoSnapshot,
  type NormalizationInputRequest,
  type ParsedDemoSnapshot,
} from './normalization-mapping.js';
export {
  parseDemoReplaySnapshot,
  parsedReplaySnapshotSchema,
  validateParsedReplaySnapshot,
  type ParsedReplaySnapshot,
  type ReplaySamplingRequest,
  type ReplaySamplingRound,
} from './replay-sampling.js';
export {
  decodeParticipationRow,
  parseParticipationSupplement,
  parsedParticipationSupplementSchema,
  readParticipationEvidenceFacts,
  readPreparedParticipationSupplementRows,
  validateParsedParticipationSupplement,
  type DecodedParticipationRow,
  type ParticipationEvidenceFacts,
  type ParticipationLifecycleFact,
  type ParsedParticipationSupplement,
} from './participation-evidence.js';
export {
  parseDemoMatchSnapshot,
  parsedMatchSnapshotEnvelopeSchema,
  validateParsedMatchSnapshotEnvelope,
  type ParsedMatchSnapshotEnvelope,
} from './parse-envelope.js';
export {
  validateSource2HeaderInChild,
  type Source2HeaderStatus,
} from './source2-header-boundary.js';
