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
  readParticipationEvidenceFacts,
  readPreparedParticipationSupplementRows,
  type DecodedParticipationRow,
  type ParticipationEvidenceFacts,
  type ParticipationLifecycleFact,
} from './participation-evidence.js';
