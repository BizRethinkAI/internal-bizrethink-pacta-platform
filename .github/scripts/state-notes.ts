// MODIFIED for BizRethink: authors own one note; shipping owns consolidation.
// Runs on Node 24 without installing app dependencies.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const notesDirectory = 'docs/state/inflight';
const statePath = 'docs/STATE.md';
const isNote = (path: string) =>
  path.startsWith(`${notesDirectory}/`) && path.endsWith('.md') && path !== `${notesDirectory}/README.md`;
const remainingNotes = () =>
  readdirSync(notesDirectory)
    .map((name) => join(notesDirectory, name))
    .filter(isNote)
    .map((note) => `${note}: merged state awaits the assigned consolidation PR.`);

const check = (): string[] => {
  const mode = process.argv[2];
  if (mode !== 'pr' && mode !== 'ship') {
    return ['Expected mode pr or ship.'];
  }
  const state = readFileSync(statePath, 'utf8');
  if (/^(<<<<<<< |>>>>>>> )/m.test(state)) {
    return ['docs/STATE.md contains unresolved conflict markers.'];
  }
  if (mode === 'ship') {
    return remainingNotes();
  }

  const base = process.env['BASE_SHA'];
  const head = process.env['HEAD_SHA'];
  const branch = process.env['PR_BRANCH'];
  if (!base || !head || !branch || !/^[a-f0-9]{40}$/.test(base) || !/^[a-f0-9]{40}$/.test(head)) {
    return ['PR mode needs full BASE_SHA, HEAD_SHA and PR_BRANCH.'];
  }
  const ancestor = execFileSync('git', ['merge-base', base, head], { encoding: 'utf8' }).trim();
  const fields = execFileSync('git', ['diff', '--name-status', '--no-renames', '-z', ancestor, head], {
    encoding: 'utf8',
  }).split('\0');
  const changes: { status: string; path: string }[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    changes.push({ status: fields[index] ?? '', path: fields[index + 1] ?? '' });
  }

  if (branch.startsWith('chore/state-consolidation-')) {
    const hasSynthesis = changes.some(({ status, path }) => path === statePath && status === 'M');
    const hasDeletion = changes.some(({ status, path }) => isNote(path) && status === 'D');
    const isPure = changes.every(
      ({ status, path }) => (path === statePath && status === 'M') || (isNote(path) && status === 'D'),
    );
    if (!hasSynthesis || !hasDeletion || !isPure) {
      return ['A consolidation must only update docs/STATE.md and delete merged notes; no code or new note.'];
    }
    return remainingNotes();
  }

  const ownNote = `${notesDirectory}/${branch.replace(/\//g, '-')}.md`;
  const errors: string[] = [];
  if (changes.some(({ path }) => path === statePath)) {
    errors.push('docs/STATE.md belongs to the assigned consolidation PR.');
  }
  for (const { path } of changes) {
    if (isNote(path) && path !== ownNote) {
      errors.push(`${path}: another branch owns this note; only consolidation may remove it.`);
    }
  }
  const isBot = process.env['IS_BOT'] === 'true';
  const hasOwnNote = changes.some(({ path, status }) => path === ownNote && status !== 'D');
  if (!isBot && (!hasOwnNote || !existsSync(ownNote) || !readFileSync(ownNote, 'utf8').trim())) {
    errors.push(`Record this PR in its own nonempty ${ownNote}.`);
  }
  return errors;
};

try {
  const errors = check();
  if (errors.length > 0) {
    console.error(`State notes:\n${errors.map((error) => `- ${error}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('State notes: passed. PR ownership and shipping readiness are separate gates.');
  }
} catch (error) {
  console.error('State notes: could not verify the repository state.', error);
  process.exitCode = 1;
}
