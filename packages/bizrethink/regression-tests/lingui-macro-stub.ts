import { vi } from 'vitest';

// Stub the lingui macros that are normally transformed at build time.
// Without this, any file that imports `msg` from `@lingui/core/macro`
// fails to load under vitest. We return a MessageDescriptor-shaped
// object so callers that read .id or .message don't blow up.
vi.mock('@lingui/core/macro', () => ({
  msg: (strings: TemplateStringsArray) => ({
    id: strings.join(''),
    message: strings.join(''),
  }),
  defineMessage: (descriptor: unknown) => descriptor,
  plural: (_value: unknown, options: Record<string, string>) => options.other ?? '',
  select: (_value: unknown, options: Record<string, string>) => options.other ?? '',
  selectOrdinal: (_value: unknown, options: Record<string, string>) => options.other ?? '',
  t: (strings: TemplateStringsArray) => strings.join(''),
}));
