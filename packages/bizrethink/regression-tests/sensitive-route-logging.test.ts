import type { LoaderFunctionArgs } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';

const { createServerConsole } = vi.hoisted(() => ({
  createServerConsole: vi.fn(() => ({ error: vi.fn() })),
}));

vi.mock('../server-only/logging/server-console', () => ({ createServerConsole }));
vi.mock('@documenso/lib/server-only/team/get-team-settings', () => ({}));
vi.mock('@documenso/lib/universal/crypto', () => ({}));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({}));
vi.mock('@documenso/lib/utils/images/logo', () => ({}));
vi.mock('@documenso/prisma', () => ({}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

it.each([
  '../../../apps/remix/app/routes/api+/branding.logo.team.$teamId.ts',
  '../../../apps/remix/app/routes/api+/branding.logo.organisation.$orgId.ts',
])('initializes server diagnostics only when the branding loader executes: %s', async (routePath) => {
  // Route-generated types are checked by the app's own CI type generation;
  // retain the public loader contract in this standalone regression type gate.
  const route = (await import(new URL(routePath, import.meta.url).pathname)) as {
    loader: (args: LoaderFunctionArgs) => Promise<Response>;
  };
  expect(createServerConsole).not.toHaveBeenCalled();

  const response = await route.loader({
    params: { teamId: '0', orgId: '' },
    request: new Request('https://pacta.test/api/branding/logo'),
    url: new URL('https://pacta.test/api/branding/logo'),
    pattern: '/api/branding/logo',
    context: {},
  });

  expect(response.status).toBe(400);
  expect(createServerConsole).toHaveBeenCalledOnce();
});
