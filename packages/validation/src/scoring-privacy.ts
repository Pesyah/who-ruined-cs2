const forbiddenKey = /"(?:displayName|steamId|demoPath|filePath|originalFileName)"\s*:/i;
const steamId64 = /7656119\d{10}/;
const localPath = /[A-Za-z]:[\\/][^"\n]+/;

export function assertAnonymousScoringExport(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (forbiddenKey.test(serialized) || steamId64.test(serialized) || localPath.test(serialized)) {
    throw new Error('Scoring export privacy invariant failed');
  }
}
