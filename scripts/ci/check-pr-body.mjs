#!/usr/bin/env node
/**
 * check-pr-body.mjs — the PR description is the review surface; this makes an
 * unfilled one fail. Template-driven, so it travels to any repo unchanged.
 *
 *   node scripts/ci/check-pr-body.mjs --body <file> [--template .github/pull_request_template.md]
 *        [--changed <file: `git diff --name-status base...HEAD`>] [--config .github/pr-discipline.json]
 *
 * Rules (always):
 *   - every "## " heading of the template is present in the body;
 *   - every section has content beyond the template's own comments ("None" is content);
 *   - a "**Tests added or changed:**" line, if the template has one, is filled.
 * Rules (from .github/pr-discipline.json, when present):
 *   - a change under any `migrationPaths` needs a file ADDED under `adrDir` in the same diff;
 *   - a change under any `redRunPaths` needs a CI run link (…/actions/runs/…) in the body —
 *     the red run §4 requires — unless the body states the `redRunWaiver` phrase.
 * Exit 1 with one "::error" line per failure (GitHub renders them on the PR).
 */
import { readFileSync, existsSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => { if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']); return acc; }, []));
const bodyPath = args.body;
const templatePath = args.template ?? '.github/pull_request_template.md';
const configPath = args.config ?? '.github/pr-discipline.json';
if (!bodyPath) { console.error('usage: check-pr-body.mjs --body <file> [--template <file>] [--changed <file>] [--config <file>]'); process.exit(2); }
if (!existsSync(templatePath)) { console.log(`no template at ${templatePath} — nothing to enforce`); process.exit(0); }

const body = readFileSync(bodyPath, 'utf8').replace(/\r\n/g, '\n');
const template = readFileSync(templatePath, 'utf8').replace(/\r\n/g, '\n');
const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
const changed = args.changed && existsSync(args.changed)
  ? readFileSync(args.changed, 'utf8').split('\n').filter(Boolean).map((l) => { const [status, ...rest] = l.split('\t'); return { status: status.trim()[0], path: rest[rest.length - 1] }; })
  : null;

const failures = [];
const fail = (title, msg) => failures.push({ title, msg });
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const headings = (s) => s.split('\n').filter((l) => /^## /.test(l)).map((l) => l.trim());

// 1. Every template heading is present.
const wanted = headings(template);
const present = new Set(headings(body));
for (const h of wanted) if (!present.has(h)) fail('Missing section', `${h} — the template's sections are the review surface; write "None" where one genuinely does not apply.`);

// 2. Every section has content beyond the template's comments.
const sections = {};
let current = null;
for (const line of body.split('\n')) {
  if (/^## /.test(line)) { current = line.trim(); sections[current] = []; continue; }
  if (current) sections[current].push(line);
}
for (const h of wanted) {
  if (!sections[h]) continue;
  const text = stripComments(sections[h].join('\n')).split('\n').map((l) => l.trim()).filter(Boolean);
  if (text.length === 0) fail('Empty section', `${h} has no content. Write "None" if it truly does not apply — it rarely does.`);
}

// 3. "Tests added or changed:" is filled when the template asks for it.
if (/\*\*Tests added or changed:\*\*/.test(template)) {
  const m = body.match(/\*\*Tests added or changed:\*\*([^\n]*)\n([\s\S]*?)(?=\n\*\*|\n## |$)/);
  const inline = m?.[1]?.trim() ?? '';
  const below = m ? stripComments(m[2]).split('\n').map((l) => l.trim()).filter(Boolean).join(' ') : '';
  if (!m || (inline.length === 0 && below.length === 0)) fail('Tests not named', '"**Tests added or changed:**" is empty. Name them, or say "none" and why.');
}

// 4. Diff-driven rules from the config.
if (changed && changed.length > 0) {
  const touches = (prefixes) => changed.filter((c) => (prefixes ?? []).some((p) => c.path.startsWith(p)));
  const migrations = touches(config.migrationPaths);
  if (migrations.length > 0 && config.adrDir) {
    const adrAdded = changed.some((c) => c.status === 'A' && c.path.startsWith(config.adrDir.replace(/\/?$/, '/')));
    if (!adrAdded) fail('Schema change without an ADR', `${migrations.map((m) => m.path).join(', ')} changes the schema; add a decision record under ${config.adrDir} in this PR (ADR 0001).`);
  }
  const money = touches(config.redRunPaths);
  if (money.length > 0) {
    const hasRunLink = /actions\/runs\/\d+/.test(body);
    const waived = config.redRunWaiver ? body.toLowerCase().includes(String(config.redRunWaiver).toLowerCase()) : false;
    if (!hasRunLink && !waived) fail('No red run linked', `This PR touches ${money.slice(0, 3).map((m) => m.path).join(', ')}${money.length > 3 ? ` (+${money.length - 3})` : ''}. Link the CI run where the test failed BEFORE implementation under "Tests added or changed", or state "${config.redRunWaiver}" in Proof if that is true.`);
  }
}

if (failures.length === 0) { console.log(`PR description: ${wanted.length} sections present and filled${changed ? `, ${changed.length} changed files checked` : ''}.`); process.exit(0); }
for (const f of failures) console.log(`::error title=${f.title}::${f.msg}`);
console.error(`\nPR description does not follow ${templatePath} (${failures.length} problem${failures.length > 1 ? 's' : ''}). Fill the template — it is the review surface.`);
process.exit(1);
