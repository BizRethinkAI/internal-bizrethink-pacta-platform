import type { UtilityRow } from '@bizrethink/customizations/lease/utilities/derive-utilities';
import { splitByPayer } from '@bizrethink/customizations/lease/utilities/derive-utilities';
import { Link } from 'react-router';

/**
 * What the lease will say about utilities — shown, not asked.
 *
 * These were two free-text boxes on this step, both required, seeded once at
 * matter creation. A lease created before its property had utilities recorded
 * held two empty required boxes that adding them to the property afterwards
 * could not reach, and the two boxes could be edited into disagreeing with
 * each other about who pays for what.
 *
 * Deriving them fixed that and then created a smaller problem of its own: a
 * step titled "Utilities and insurance" showing only insurance, with no way to
 * see what the document was about to say. Deriving an answer is not a reason to
 * hide it. Every other field on this interview shows its consequence at the
 * moment it can still be changed; this one does the same, and points at the
 * one place the answer can be edited.
 */

export type UtilitySummaryProps = {
  utilities: UtilityRow[];
  /** Where the rows are actually edited. */
  propertiesHref: string;
};

export const UtilitySummary = ({ utilities, propertiesHref }: UtilitySummaryProps) => {
  const { tenant, landlord } = splitByPayer(utilities);

  return (
    <div className="border-b py-6">
      <h3 className="font-medium text-sm">Utilities</h3>
      <p className="mt-1 text-muted-foreground text-sm">
        Recorded on the property, because the supplier at an address does not change between tenancies. The lease reads
        from there, so this is what it will say.
      </p>

      {utilities.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          No utilities recorded for this property. The lease will say the tenant arranges none and you provide none —
          which is rarely what anyone means.{' '}
          <Link to={propertiesHref} className="underline">
            Add them to the property
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 space-y-3 rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
          <p>
            <span className="font-medium">Tenant arranges and pays for:</span> {tenant}
          </p>
          <p>
            <span className="font-medium">You provide:</span> {landlord}
          </p>
        </div>
      )}

      {utilities.length > 0 && (
        <p className="mt-3 text-muted-foreground text-xs">
          <Link to={propertiesHref} className="underline">
            Edit these on the property
          </Link>{' '}
          — the change reaches every draft lease for it.
        </p>
      )}
    </div>
  );
};
