import { execFile } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

export type Source2HeaderStatus = 'VALID' | 'INVALID' | 'UNREADABLE';

const headerChildEntrypoint = fileURLToPath(
  new URL('./source2-header-child.js', import.meta.url),
);

export async function validateSource2HeaderInChild(
  filePath: string,
  timeoutMs: number,
  /** Programmatic test seam only; never populated from HTTP or environment. */
  childEntrypoint: string = headerChildEntrypoint,
): Promise<Source2HeaderStatus> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) return 'UNREADABLE';
  const encodedPath = Buffer.from(filePath).toString('base64url');
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [childEntrypoint, encodedPath],
      {
        encoding: 'utf8',
        windowsHide: true,
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: 1024,
      },
      (error, stdout) => {
        if (error) {
          resolve('UNREADABLE');
          return;
        }
        const status = stdout.trim();
        resolve(
          status === 'VALID' || status === 'INVALID' || status === 'UNREADABLE'
            ? status
            : 'UNREADABLE',
        );
      },
    );
  });
}
