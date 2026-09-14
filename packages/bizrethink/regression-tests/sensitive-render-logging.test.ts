import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';
import { logRenderError } from '../log-render-error';

// Execute the real boundary functions with server-render hook semantics,
// without importing loader/database/client-provider side effects into this test.
const invokeBoundary = (path: string, error: Error) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const parsed = ts.createSourceFile('boundary.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = parsed.statements.find(
    (node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'ErrorBoundary',
  );
  if (!fn) {
    throw new Error('Expected the real route ErrorBoundary');
  }
  const code = ts.transpileModule(fn.getText(parsed).replace(/^export /, ''), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const log = vi.fn();
  const captureException = vi.fn();
  const render = runInNewContext(code + '\nErrorBoundary', {
    console: { log, error: log },
    logRenderError,
    useEffect: () => undefined,
    useAnalytics: () => ({ captureException }),
    useRouteError: () => error,
    isRouteErrorResponse: () => false,
    React: { createElement: (...args: unknown[]) => args },
    GenericErrorLayout: 'error-layout',
    Trans: 'span',
  }) as (args: { error: Error; loaderData: Record<string, never> }) => unknown;
  const consoleError = vi.spyOn(console, 'error').mockImplementation(log);
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(log);
  try {
    const output = render({ error, loaderData: {} });
    expect(output).toBeDefined();
    expect(captureException).not.toHaveBeenCalled();
    return log.mock.calls;
  } finally {
    consoleError.mockRestore();
    consoleLog.mockRestore();
  }
};
it.each([
  '../../../apps/remix/app/root.tsx',
  '../../../apps/remix/app/routes/embed+/_v0+/_layout.tsx',
])('A-21 server-rendered error boundaries do not print raw error authority: %s', (path) => {
  const error = Object.assign(new Error('synthetic-render-bearer'), { token: 'synthetic-render-bearer' });
  const calls = invokeBoundary(path, error);
  expect(calls.length).toBeGreaterThan(0);
  expect(JSON.stringify(calls)).not.toContain('synthetic-render-bearer');
});
