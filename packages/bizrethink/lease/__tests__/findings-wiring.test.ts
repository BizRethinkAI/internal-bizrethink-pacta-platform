import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The mechanism was built and left unplugged.
 *
 * PR #103 shipped `BizrethinkLibraryFinding`, `recordFinding`, `answerFinding`,
 * `listFindings`, `outstandingFindings` and `findingBlockers`, plus a textarea
 * on the counsel page. Every piece worked. Nothing called anything:
 *
 *   - `outstandingFindings` and `findingBlockers` had no caller outside their
 *     own test file.
 *   - `approve` never consulted a finding, so a clause with an unanswered
 *     defect report could be approved with no obstacle at all.
 *   - `listFindings` and `answerFinding` had no UI caller, so a finding landed
 *     in a table no page read and nobody could answer.
 *   - Counsel could not see the finding she had just recorded. It vanished on
 *     reload.
 *
 * This is the repo's characteristic failure — a change that fails by being
 * *absent* rather than wrong — and it passed CI, because every unit was tested
 * in isolation and no test asked whether anything used them.
 *
 * So these tests assert the wiring itself. They read source, which is coarse,
 * but a mutation nobody can reach is exactly what a fine-grained unit test
 * cannot see.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const router = read('../../server-only/trpc/lease-builder-router.ts');
const libraryPage = read('../../../../apps/remix/app/routes/_authenticated+/admin+/lease-library.tsx');
const counselPage = read('../../../../apps/remix/app/routes/_recipient+/clause-review.$token.tsx');

const proc = (source: string, name: string) => {
  const start = source.indexOf(`${name}: `);

  if (start === -1) {
    return '';
  }

  /*
    To the next procedure definition rather than a fixed byte count. `approve`
    is 90 lines and the guard being asserted could sit past any window a
    constant picked.
  */
  const rest = source.slice(start + name.length);
  const next = rest.search(/\n {4}\w+: (?:authenticatedProcedure|procedure)/);

  return name + (next === -1 ? rest : rest.slice(0, next));
};

describe('an outstanding finding blocks approval', () => {
  it('makes approve consult the findings table', () => {
    expect(proc(router, 'approve')).toMatch(/bizrethinkLibraryFinding\.findMany/);
  });

  it('refuses with the blocker sentence rather than a bare boolean', () => {
    expect(router).toMatch(/findingsBlock/);
    expect(proc(router, 'approve')).toMatch(/findingsBlock\(/);
  });

  /*
    ORDER. `admissionBlocks` first: it is a fact about the person, and nothing
    the approver does in this session fixes it — sending them to answer a
    finding they could never approve past is wasted work. The finding check
    then comes BEFORE the fingerprint check, which says "reload and read it
    again": a second reading followed by a second refusal is the same waste in
    the other direction.
  */
  it('checks admission first, then findings, then the fingerprint', () => {
    const body = proc(router, 'approve');

    expect(body.indexOf('admissionBlocks(')).toBeLessThan(body.indexOf('findingsBlock('));
    expect(body.indexOf('findingsBlock(')).toBeLessThan(body.indexOf('current !== input.fingerprint'));
  });

  /*
    NOT SCOPED TO THE CURRENT FINGERPRINT, deliberately. A finding recorded
    against wording that has since moved still blocks, because scoping it to
    the current text would mean editing a clause silently cleared every finding
    against it — as fast to bypass as to satisfy, which is the failure the
    answer rule already exists to prevent.
  */
  it('does not let an edit to the clause clear its findings', () => {
    expect(proc(router, 'approve')).not.toMatch(/findMany\([^)]*clauseFingerprint/s);
  });
});

describe('answerFinding cannot reach another organisation', () => {
  /*
    `assertAccess` proves the caller belongs to the organisation they NAMED. It
    says nothing about the finding: the id came from the caller too, and
    `update({ where: { id } })` would answer a finding on any other tenant's
    review. Pacta hosts a second tenant as of 2026-08-31.
  */
  it('scopes the write by the review, not just by the named organisation', () => {
    const body = proc(router, 'answerFinding');

    expect(body).toMatch(/review: \{ organisationId/);
  });

  it('tells the caller when nothing matched instead of reporting success', () => {
    expect(proc(router, 'answerFinding')).toMatch(/NOT_FOUND/);
  });
});

describe('staff can see and answer findings', () => {
  it('reads them', () => {
    expect(libraryPage).toMatch(/clauseLibrary\.listFindings\.useQuery/);
  });

  it('answers them', () => {
    expect(libraryPage).toMatch(/clauseLibrary\.answerFinding\.useMutation/);
  });

  /*
    `answerFinding` enforces `.trim().min(1)` server-side. The button must
    enforce it too — a request that fails validation looks, on a page with no
    error surface, exactly like one that worked.
  */
  it('will not send an empty answer', () => {
    expect(libraryPage).toMatch(/disabled=\{draft\.trim\(\) === ''/);
    expect(libraryPage).toMatch(/answer: draft\.trim\(\)/);
  });

  it('shows the failure when one happens', () => {
    expect(libraryPage).toMatch(/answerFinding[\s\S]{0,4000}?\.error/);
  });

  it('puts the outstanding ones first, which is the only ordering that is work', () => {
    expect(libraryPage).toMatch(/[Oo]utstanding/);
  });

  it('groups them by clause, because a finding is answered against a clause', () => {
    expect(libraryPage).toMatch(/findingsByClause/);
  });
});

describe('counsel can see the findings she recorded', () => {
  /*
    A SEPARATE TOKEN-SCOPED QUERY, not a field on `openLibrary`. Recording a
    finding has to refetch whatever shows it, and `openLibrary` carries 52
    clause bodies — re-downloading the entire library to render one new line.
    It is also the narrower read: this returns findings on THIS link and
    nothing else.
  */
  it('has a public procedure for it', () => {
    expect(proc(router, 'openFindings')).toMatch(/openFindings: procedure/);
    expect(proc(router, 'openFindings')).not.toMatch(/openFindings: authenticatedProcedure/);
  });

  /*
    Same rule `recordFinding` already follows: the review row decides whose
    findings these are. A token holder sees what came in on their own link,
    never another reviewer's, and never by asking for it.
  */
  it('scopes by the review row rather than by anything the caller sends', () => {
    const body = proc(router, 'openFindings');

    expect(body).toMatch(/reviewId: share\.id/);
    expect(body).not.toMatch(/authorEmail: input/);
  });

  it('refuses a dead link in the same words as the rest of the token surface', () => {
    expect(proc(router, 'openFindings')).toMatch(/no longer active/i);
  });

  it('is read by the counsel page', () => {
    expect(counselPage).toMatch(/clauseLibrary\.openFindings\.useQuery/);
  });

  it('refetches after recording, so the finding does not vanish', () => {
    expect(counselPage).toMatch(/refetch\(\)/);
  });

  it('says whether staff answered it', () => {
    expect(counselPage).toMatch(/answeredAt/);
    expect(counselPage).toMatch(/Answered/);
  });
});
