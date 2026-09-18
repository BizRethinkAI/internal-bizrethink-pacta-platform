import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * A "Next" button must not share a render slot with a submit button.
 *
 * #319: on the MCA entity page, opening a SAVED entity and pressing Next did
 * nothing. No step change, no error, nothing on screen looked wrong. What
 * actually happened is worse than nothing: the form SAVED, and the save put the
 * person back where they started.
 *
 * The editor rendered both buttons from one ternary —
 *
 *   {step === 0 ? <Button type="button" onClick={next}/> : <Button type="submit"/>}
 *
 * — which is one position in one children array, so React reconciles them onto
 * ONE host node and mutates its attributes rather than replacing it. `setStep`
 * comes from a discrete event, so React flushes it synchronously WHILE the
 * click is still dispatching; by the time the browser runs the click's
 * activation behaviour, the very node that was clicked reads
 * `type="submit"` and its form owner is submitted. Verified in Chromium against
 * React 19.2.8: the captured node is the same object and now reads
 * `<button type="submit">Save A</button>`, and the form's onSubmit fires once.
 *
 * On the saved entity the record was already valid, so the accidental submit
 * succeeded, bumped `version`, and the editor's `key` — `${id}:${version}` —
 * changed, remounting it back at step one. On the create path the same submit
 * failed validation and the invalid handler happened to land on step two, which
 * is why the create path looked fine and this went unnoticed.
 *
 * The rule, then: the branches of a conditional may not render elements whose
 * `type` differs. Give each its own slot, so React unmounts one and mounts the
 * other. Asserted on the syntax rather than on rendered output because this
 * repo has no React rendering harness — no jsdom, no @testing-library — and the
 * failure lives in reconciliation, not in the markup either branch produces.
 */

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Our own package, plus the files we own that must live in upstream directories. */
const collectSources = (): { path: string; body: string }[] => {
  const paths: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(`${ROOT}${dir}`, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      const next = `${dir}/${entry.name}`;

      if (entry.isDirectory()) {
        walk(next);
      } else if (entry.name.endsWith('.tsx')) {
        paths.push(next);
      }
    }
  };

  walk('packages/bizrethink');

  /*
    A Remix route we wrote still has to sit in apps/remix — the router resolves
    by filename — so `overlays/BIZRETHINK-OWNED.txt` is the list of files that
    are ours despite their address. Reading it here rather than hard-coding the
    directories keeps the two in step.
  */
  const owned = readFileSync(`${ROOT}overlays/BIZRETHINK-OWNED.txt`, 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter((line) => line.endsWith('.tsx'));

  for (const glob of owned) {
    const dir = glob.slice(0, glob.lastIndexOf('/'));
    const name = glob.slice(glob.lastIndexOf('/') + 1);
    const matcher = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^/]*')}$`);

    for (const entry of readdirSync(`${ROOT}${dir}`)) {
      if (matcher.test(entry) && statSync(`${ROOT}${dir}/${entry}`).isFile()) {
        paths.push(`${dir}/${entry}`);
      }
    }
  }

  return [...new Set(paths)].sort().map((path) => ({ path, body: readFileSync(`${ROOT}${path}`, 'utf8') }));
};

/** The `type` of the element a branch renders, when the branch renders one element with a literal type. */
const slotType = (node: ts.Expression): string | null => {
  let expression = node;

  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression;
  }

  const opening = ts.isJsxElement(expression)
    ? expression.openingElement
    : ts.isJsxSelfClosingElement(expression)
      ? expression
      : null;

  if (!opening) {
    return null;
  }

  for (const attribute of opening.attributes.properties) {
    if (
      ts.isJsxAttribute(attribute) &&
      ts.isIdentifier(attribute.name) &&
      attribute.name.text === 'type' &&
      attribute.initializer &&
      ts.isStringLiteral(attribute.initializer)
    ) {
      return attribute.initializer.text;
    }
  }

  return null;
};

const sharedSlots = (path: string, body: string) => {
  const source = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node)) {
      const whenTrue = slotType(node.whenTrue);
      const whenFalse = slotType(node.whenFalse);

      if (whenTrue && whenFalse && whenTrue !== whenFalse) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));

        found.push(`${path}:${line + 1} renders type="${whenTrue}" and type="${whenFalse}" in one slot`);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return found;
};

const sources = collectSources();

describe('a control that changes an element’s type on click', () => {
  it('finds our components, or this test is asserting nothing', () => {
    expect(sources.length).toBeGreaterThan(20);
    expect(sources.map((source) => source.path)).toContain('packages/bizrethink/mca/components/entity-editor.tsx');
  });

  it('never renders two element types from one conditional slot', () => {
    const offenders = sources.flatMap((source) => sharedSlots(source.path, source.body));

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  /*
    The structural rule above is what fixes #319, and it only covers the shape
    that caused it. A handler that advances a step is one flushed re-render away
    from a submit button however it is rendered — from a `.map` over steps, say,
    which no syntax rule here would see. Cancelling the click's default action
    costs one line and holds regardless.
  */
  it('cancels the click that advances the entity editor', () => {
    const editor = sources.find((source) => source.path.endsWith('mca/components/entity-editor.tsx'));

    expect(editor?.body).toMatch(/const next = \(event: [^)]*\) => \{\s*event\.preventDefault\(\);/);
  });

  it('still has the two buttons this is about', () => {
    const editor = sources.find((source) => source.path.endsWith('mca/components/entity-editor.tsx'))?.body ?? '';

    expect(editor).toMatch(/onClick=\{next\}/);
    expect(editor).toMatch(/type="submit"/);
  });
});
