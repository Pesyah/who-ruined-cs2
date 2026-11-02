export type ArtifactFailure =
  | 'BINDING_MISMATCH'
  | 'CHECKSUM'
  | 'COMPRESSED_LIMIT'
  | 'DECOMPRESSED_LIMIT'
  | 'DEPTH'
  | 'IMMUTABLE_CONFLICT'
  | 'INTEGRITY_MISMATCH'
  | 'INVALID_JSON'
  | 'MISSING'
  | 'NOT_FILE'
  | 'SCHEMA_MISMATCH'
  | 'SYMLINK'
  | 'UNSAFE_PATH';

export class ArtifactError extends Error {
  constructor(public readonly reason: ArtifactFailure, options?: ErrorOptions) {
    super('ARTIFACT_' + reason, options);
    this.name = 'ArtifactError';
  }
}
