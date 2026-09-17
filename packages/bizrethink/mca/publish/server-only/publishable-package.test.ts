import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    bizrethinkMcaLibraryFinding: { count: vi.fn() },
    bizrethinkMcaPackageFinding: { count: vi.fn() },
  },
  approvals: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../server-only/clause-approvals', () => ({ loadMcaClauseApprovals: mocks.approvals }));

import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { assertMcaPackagePublishable, mcaPublicationRefusals } from '../publishable';
import { mcaPublishablePackageFor } from './publishable-package';

const snapshot = () => compileMcaTemplate(providerFixture());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.approvals.mockResolvedValue(new Map());
  mocks.db.bizrethinkMcaLibraryFinding.count.mockResolvedValue(0);
  mocks.db.bizrethinkMcaPackageFinding.count.mockResolvedValue(0);
});

/**
 * Where the gate's inputs come from.
 *
 * `assertMcaPackagePublishable` is a pure rule that deliberately knows nothing
 * about its sources (#288). This is the one place that assembles them, so a
 * second caller cannot build a subtly different package and get a different
 * answer about the same template.
 */
describe('the package handed to the gate describes this template', () => {
  it('carries the clauses of the instrument being published', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');

    expect(pkg.items.length).toBeGreaterThan(0);

    for (const item of pkg.items) {
      expect(item.content.instrument).toBe('frpa');
      expect(item.content.slug).toBe(item.slug);
    }
  });

  /**
   * The gate checks an approval fingerprint over the AUTHORED words, so it
   * needs the library's own `McaContent` — not the snapshot's projection, which
   * is numbered and has provider values resolved into it.
   */
  it('hands over the authored clause, not the rendered projection', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');
    const [first] = pkg.items;

    expect(first.content).toHaveProperty('examinedBy');
    expect(first.content).toHaveProperty('source');
  });

  /**
   * A template has no deal, so none of a filled draft's blockers. What it can
   * have is a field it can neither mark nor print — a hole no caller could
   * fill, because there is no widget to send a value to.
   */
  it('reports a field nothing can fill as a missing input', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');

    expect(pkg.blockers).toEqual([]);
    expect(pkg.missing.length).toBeGreaterThan(0);
    expect(pkg.missing.every((entry) => typeof entry.binding === 'string')).toBe(true);
  });

  it('counts unanswered findings from both registers', async () => {
    mocks.db.bizrethinkMcaLibraryFinding.count.mockResolvedValue(2);
    mocks.db.bizrethinkMcaPackageFinding.count.mockResolvedValue(3);

    expect((await mcaPublishablePackageFor(snapshot(), 'frpa')).unansweredCounselFindings).toBe(5);
  });

  /**
   * An unreadable register returns an empty findings list, which is
   * indistinguishable from a clean library. The gate must be told which it is.
   */
  it('passes the register’s availability rather than inferring it', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');

    expect(typeof pkg.evidenceAvailable).toBe('boolean');
  });

  /**
   * Approvals arrive as a Map. A plain object answers for its prototype, and a
   * truthy non-approval is exactly the shape that gets past a gate — the class
   * of bug #283 shipped and a review caught.
   */
  it('takes approvals as a Map, so there are no prototype keys to answer', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');

    expect(pkg.approvals).toBeInstanceOf(Map);
    expect(pkg.approvals.get('constructor')).toBeUndefined();
  });
});

/**
 * IT IS EXPECTED TO REFUSE, and that is the designed state rather than an
 * unfinished one. ADR 0023: the gate ships shut and stays shut until counsel
 * approves clauses. A gate that passed today would be measuring nothing.
 */
describe('nothing publishes yet, and the refusal says why', () => {
  it('refuses every clause for want of an approval', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');
    const refusals = mcaPublicationRefusals(pkg);

    expect(refusals.length).toBeGreaterThan(0);
    expect(refusals.some((refusal) => refusal.reason.includes('no current attorney approval'))).toBe(true);
  });

  it('throws rather than returning a list a caller could ignore', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');

    expect(() => assertMcaPackagePublishable(pkg)).toThrow();
  });

  /**
   * The refusal a reader acts on. A field nothing can fill is named by its
   * binding, so the fix is findable rather than a count.
   */
  it('names each unfillable field, not just how many there are', async () => {
    const pkg = await mcaPublishablePackageFor(snapshot(), 'frpa');
    const refusals = mcaPublicationRefusals(pkg);
    const named = refusals.filter((refusal) => refusal.reason.startsWith('required input not supplied:'));

    expect(named.length).toBe(pkg.missing.length);
    expect(named[0].reason).toMatch(/[a-z]+\.[a-zA-Z]+/);
  });
});
