import path from 'node:path';
import { pathToFileURL } from 'node:url';

const configured = path.resolve(process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data'));
export const dataRoot = configured;
export const dataDir = pathToFileURL(configured + path.sep);

export function safeDataPath(relativePath: string): string {
  const resolved = path.resolve(dataRoot, relativePath);
  const prefix = dataRoot.endsWith(path.sep) ? dataRoot : dataRoot + path.sep;
  if (resolved !== dataRoot && !resolved.startsWith(prefix)) throw new Error('Unsafe artifact path');
  return resolved;
}
