import path from 'node:path';

export function resolveDataPath(dataRoot: string, relativePath: string): string {
  const root = path.resolve(dataRoot);
  const resolved = path.resolve(root, relativePath);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved === root || !resolved.startsWith(prefix)) throw new Error('Unsafe artifact path');
  return resolved;
}
