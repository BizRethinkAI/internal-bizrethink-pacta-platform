import { expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  callbacks: [] as Array<(event: { query: string; params: string; duration: number }) => void>,
}));
vi.mock('@prisma/client', async (original) => ({
  ...(await original<typeof import('@prisma/client')>()),
  PrismaClient: function MockPrismaClient() {
    return {
      $extends: () => ({}),
      $on: (_event: string, callback: (event: { query: string; params: string; duration: number }) => void) =>
        state.callbacks.push(callback),
    };
  },
}));
vi.mock('@documenso/prisma/helper', () => ({ getDatabaseUrl: () => undefined }));
vi.mock('@documenso/prisma/utils/remember', () => ({ remember: (_key: string, init: () => unknown) => init() }));

import { logger } from '@documenso/lib/utils/logger';
import { prismaWithLogging } from '@documenso/prisma';

it('A-21 the optional query logger records timing without SQL text or bound parameters', () => {
  expect(prismaWithLogging).toBeDefined();
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const diagnostic = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
  try {
    expect(state.callbacks).toHaveLength(1);
    state.callbacks[0]({
      query: 'SELECT * FROM recipient WHERE token=$1',
      params: '["synthetic-query-bearer"]',
      duration: 5,
    });
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('synthetic-query-bearer');
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('synthetic-query-bearer');
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ durationMs: 5 }));
  } finally {
    consoleLog.mockRestore();
    diagnostic.mockRestore();
  }
});
