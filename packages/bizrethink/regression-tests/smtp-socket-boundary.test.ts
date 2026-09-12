import { type AddressInfo, createServer as createTcpServer, type NetConnectOpts, type Socket } from 'node:net';
import { setImmediate } from 'node:timers/promises';
import { createSecureContext, createServer, type Server, TLSSocket } from 'node:tls';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { testOrgSmtp } from '../server-only/test-org-smtp';
import { createOutboundTlsFixture } from './outbound-tls-fixture';

const { lookup, transportState } = vi.hoisted(() => ({
  lookup: vi.fn(),
  transportState: {
    port: 0,
    ca: undefined as Buffer | undefined,
    sockets: [] as Socket[],
    connected: [] as NetConnectOpts[],
  },
}));
vi.mock('node:dns/promises', () => ({ lookup }));
vi.mock('node:net', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:net')>();
  return {
    ...original,
    createConnection: (options: NetConnectOpts) => {
      transportState.connected.push(options);
      // Remap the already checked synthetic public destination to our loopback
      // fixture. DNS validation and the real Nodemailer/TLS socket lifecycle run.
      const socket = original.createConnection({ ...options, host: '127.0.0.1', port: transportState.port });
      transportState.sockets.push(socket);
      return socket;
    },
  };
});
vi.mock('nodemailer', async (importOriginal) => {
  const original = await importOriginal<typeof import('nodemailer')>();
  return {
    ...original,
    createTransport: (options: SMTPTransport.Options) =>
      original.createTransport({
        ...options,
        tls: { ...options.tls, ca: transportState.ca },
      }),
  };
});

let tls: ReturnType<typeof createOutboundTlsFixture>;
let server: Server;
let serverSockets: Set<TLSSocket>;
let commands: string[];
let stallGreeting = false;
let secured: () => void = () => {};
beforeAll(async () => {
  tls = createOutboundTlsFixture();
  serverSockets = new Set();
  server = createServer(tls, (socket) => {
    serverSockets.add(socket);
    socket.on('close', () => serverSockets.delete(socket));
    socket.on('error', () => {});
    secured();
    if (stallGreeting) {
      return;
    }
    socket.write('220 receiver.invalid synthetic SMTP\r\n');
    let remainder = '';
    socket.on('data', (chunk: Buffer) => {
      remainder += chunk.toString();
      while (remainder.includes('\r\n')) {
        const end = remainder.indexOf('\r\n');
        const command = remainder.slice(0, end);
        remainder = remainder.slice(end + 2);
        commands.push(command.split(' ')[0]);
        if (command.startsWith('EHLO ')) {
          socket.write('250-receiver.invalid\r\n250 AUTH PLAIN\r\n');
        } else if (command.startsWith('AUTH PLAIN ')) {
          socket.write('235 Authenticated\r\n');
        } else if (command === 'QUIT') {
          socket.end('221 Bye\r\n');
        } else {
          socket.write('500 Unexpected command\r\n');
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  transportState.port = (server.address() as AddressInfo).port;
});
beforeEach(() => {
  commands = [];
  stallGreeting = false;
  secured = () => {};
  lookup.mockReset().mockResolvedValue([{ address: '8.8.8.8', family: 4 }]);
  transportState.ca = tls.cert;
  transportState.sockets = [];
  transportState.connected = [];
});
afterEach(() => {
  vi.useRealTimers();
  for (const socket of transportState.sockets) {
    socket.destroy();
  }
  for (const socket of serverSockets) {
    socket.destroy();
  }
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
const call = (host = 'receiver.invalid') =>
  testOrgSmtp({ host, port: 465, secure: true, username: 'synthetic', password: 'synthetic-test-password' });

describe('real SMTP/TLS socket lifecycle', () => {
  it.each([false, true])('requires STARTTLS before authentication (available=%s)', async (available) => {
    const sockets = new Set<Socket>();
    const phaseCommands: { command: string; encrypted: boolean }[] = [];
    const tcpServer = createTcpServer((raw) => {
      sockets.add(raw);
      raw.on('error', () => {});
      raw.write('220 receiver.invalid synthetic SMTP\r\n');
      const attach = (socket: Socket, encrypted: boolean) => {
        let remainder = '';
        const onData = (chunk: Buffer) => {
          remainder += chunk.toString();
          while (remainder.includes('\r\n')) {
            const end = remainder.indexOf('\r\n');
            const command = remainder.slice(0, end);
            remainder = remainder.slice(end + 2);
            phaseCommands.push({ command: command.split(' ')[0], encrypted });
            if (command.startsWith('EHLO ')) {
              socket.write(
                available && !encrypted
                  ? '250-receiver.invalid\r\n250 STARTTLS\r\n'
                  : '250-receiver.invalid\r\n250 AUTH PLAIN\r\n',
              );
            } else if (command === 'STARTTLS' && available && !encrypted) {
              socket.removeListener('data', onData);
              socket.write('220 Ready for TLS\r\n');
              const secure = new TLSSocket(socket, { isServer: true, secureContext: createSecureContext(tls) });
              secure.on('error', () => {});
              sockets.add(secure);
              attach(secure, true);
            } else if (command.startsWith('AUTH PLAIN ') && encrypted) {
              socket.write('235 Authenticated\r\n');
            } else if (command === 'QUIT') {
              socket.end('221 Bye\r\n');
            } else {
              socket.write('500 Command refused\r\n');
            }
          }
        };
        socket.on('data', onData);
      };
      attach(raw, false);
    });
    await new Promise<void>((resolve, reject) => {
      tcpServer.once('error', reject);
      tcpServer.listen(0, '127.0.0.1', resolve);
    });
    const originalPort = transportState.port;
    transportState.port = (tcpServer.address() as AddressInfo).port;
    try {
      const result = await testOrgSmtp({
        host: 'receiver.invalid',
        port: 587,
        secure: false,
        username: 'synthetic',
        password: 'synthetic-test-password',
      });
      expect(result.ok).toBe(available);
      expect(phaseCommands).not.toContainEqual({ command: 'AUTH', encrypted: false });
      if (available) {
        expect(phaseCommands).toContainEqual({ command: 'AUTH', encrypted: true });
      }
      expect(transportState.sockets.every((socket) => socket.destroyed)).toBe(true);
    } finally {
      transportState.port = originalPort;
      for (const socket of sockets) {
        socket.destroy();
      }
      await new Promise<void>((resolve) => tcpServer.close(() => resolve()));
    }
  });

  it('authenticates over TLS on the checked address and never sends mail', async () => {
    expect(await call()).toEqual({ ok: true });
    expect(commands).toContain('AUTH');
    expect(commands).not.toContain('MAIL');
    expect(transportState.connected).toEqual([expect.objectContaining({ host: '8.8.8.8', port: 465, family: 4 })]);
    expect(transportState.sockets.every((socket) => socket.destroyed)).toBe(true);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('refuses a wrong certificate name before authenticating', async () => {
    expect(await call('wrong.invalid')).toMatchObject({ ok: false });
    expect(commands).not.toContain('AUTH');
    expect(transportState.sockets.every((socket) => socket.destroyed)).toBe(true);
  });

  it('refuses an untrusted certificate', async () => {
    transportState.ca = undefined;
    expect(await call()).toMatchObject({ ok: false });
    expect(commands).not.toContain('AUTH');
  });

  it('destroys the actual underlying socket when the total deadline expires', async () => {
    stallGreeting = true;
    const connected = new Promise<void>((resolve) => {
      secured = resolve;
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let result: Awaited<ReturnType<typeof call>> | undefined;
    const pending = call().then((value) => {
      result = value;
    });
    await connected;
    await vi.advanceTimersByTimeAsync(10_001);
    for (let i = 0; i < 10; i += 1) {
      await setImmediate();
    }
    expect(result).toMatchObject({ ok: false });
    expect(transportState.sockets.every((socket) => socket.destroyed)).toBe(true);
    expect(serverSockets.size).toBe(0);
    await pending;
  });
});
