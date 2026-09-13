import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Synthetic trust root, generated locally and removed after each test file. */
export const createOutboundTlsFixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'pacta-outbound-tls-'));
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-days',
        '1',
        '-keyout',
        join(directory, 'key.pem'),
        '-out',
        join(directory, 'cert.pem'),
        '-subj',
        '/CN=receiver.invalid',
        '-addext',
        'subjectAltName=DNS:receiver.invalid',
      ],
      { stdio: 'ignore' },
    );
    return {
      key: readFileSync(join(directory, 'key.pem')),
      cert: readFileSync(join(directory, 'cert.pem')),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};
