import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const checker = resolve('../../.github/scripts/state-notes.ts');
const fixtures: string[] = [];

const setup = (extraMergedNote?: string) => {
  const root = mkdtempSync(join(tmpdir(), 'pacta-state-test-'));
  fixtures.push(root);
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const put = (path: string, contents = 'Durable context.\n') => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  };
  const commit = () => {
    git('add', '.');
    git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-q', '--initial-branch=main');
  put('docs/STATE.md');
  put('docs/state/inflight/README.md');
  put('docs/state/inflight/fix-already-merged.md');
  if (extraMergedNote) {
    put(`docs/state/inflight/${extraMergedNote}`);
  }
  const base = commit();
  const run = (mode = 'pr', branch = 'fix/new-task', bot = false) => {
    const head = commit();
    return spawnSync(process.execPath, [checker, mode], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, BASE_SHA: base, HEAD_SHA: head, PR_BRANCH: branch, IS_BOT: String(bot) },
    });
  };
  const remove = (path: string) => rmSync(join(root, path));
  return { root, put, run, remove };
};

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('per-author state and one shipping consolidation', () => {
  it('accepts an author note even when main contains another merged note', () => {
    const fixture = setup();
    fixture.put('docs/state/inflight/fix-new-task.md');
    fixture.put('app.ts', 'export const value = 1;\n');
    const result = fixture.run();
    expect(result.status, result.stderr + result.stdout).toBe(0);
  });

  it('requires this branch’s note, rather than accepting another branch’s note', () => {
    const fixture = setup();
    fixture.put('docs/state/inflight/fix-somebody-else.md');
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fix-new-task.md');
  });

  it('does not let an ordinary author edit the settled state', () => {
    const fixture = setup();
    fixture.put('docs/state/inflight/fix-new-task.md');
    fixture.put('docs/STATE.md', 'Competing synthesis.\n');
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('consolidation');
  });

  it('does not let an ordinary author delete another note', () => {
    const fixture = setup();
    fixture.put('docs/state/inflight/fix-new-task.md');
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('another branch owns this note');
  });

  it('accepts a pure consolidation without creating its own future stale note', () => {
    const fixture = setup();
    fixture.put('docs/STATE.md', 'Correct synthesized state.\n');
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    const result = fixture.run('pr', 'chore/state-consolidation-2026-09-12');
    expect(result.status, result.stderr + result.stdout).toBe(0);
  });

  it.each([
    'app.ts',
    'docs/state/inflight/chore-state-consolidation-2026-09-12.md',
  ])('rejects a consolidation that also creates %s', (path) => {
    const fixture = setup();
    fixture.put('docs/STATE.md', 'Correct synthesized state.\n');
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    fixture.put(path);
    const result = fixture.run('pr', 'chore/state-consolidation-2026-09-12');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('no code or new note');
  });

  it('does not accept deleting notes without writing their synthesis', () => {
    const fixture = setup();
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    const result = fixture.run('pr', 'chore/state-consolidation-2026-09-12');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('update docs/STATE.md');
  });

  it('does not accept a consolidation that leaves another merged note behind', () => {
    const fixture = setup('fix-another-merged.md');
    fixture.put('docs/STATE.md', 'Incomplete synthesis.\n');
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    const result = fixture.run('pr', 'chore/state-consolidation-2026-09-12');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fix-another-merged.md');
  });

  it('blocks shipping while even one note remains on the integrated branch', () => {
    const fixture = setup();
    fixture.put('docs/STATE.md', 'New state.\n');
    const result = fixture.run('ship');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('fix-already-merged.md');
  });

  it('allows shipping after all merged notes have been consolidated', () => {
    const fixture = setup();
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    fixture.put('docs/STATE.md', 'Integrated current state.\n');
    expect(fixture.run('ship').status).toBe(0);
  });

  it.each(['<<<<<<< ours\n', '>>>>>>> theirs\n'])('rejects unresolved state markers %s', (marker) => {
    const fixture = setup();
    fixture.put('docs/STATE.md', marker);
    fixture.remove('docs/state/inflight/fix-already-merged.md');
    const result = fixture.run('ship');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('conflict');
  });

  it('keeps the bot note exemption', () => {
    const fixture = setup();
    fixture.put('app.ts');
    expect(fixture.run('pr', 'dependabot/npm_and_yarn/example', true).status).toBe(0);
  });

  it('still rejects conflict markers in a bot PR', () => {
    const fixture = setup();
    fixture.put('docs/STATE.md', '<<<<<<< ours\n');
    const result = fixture.run('pr', 'dependabot/npm_and_yarn/example', true);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('conflict');
  });

  it('rejects an empty own note', () => {
    const fixture = setup();
    fixture.put('docs/state/inflight/fix-new-task.md', '  \n');
    const result = fixture.run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('nonempty');
  });

  it('does not execute branch text as shell code', () => {
    const fixture = setup();
    const branch = 'fix/$(touch PWNED)';
    fixture.put('docs/state/inflight/fix-$(touch PWNED).md');
    expect(fixture.run('pr', branch).status).toBe(0);
    expect(() => readFileSync(join(fixture.root, 'PWNED'))).toThrow();
  });
});
