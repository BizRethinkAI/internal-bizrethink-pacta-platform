/**
 * Signature blocks, generated from the party list rather than authored as
 * clauses. Two landlords and three tenants produce the right blocks without
 * anyone writing a clause per combination.
 *
 * This is where the lease builder meets the signing platform. Every token here
 * is consumed by upstream's `extractPlaceholdersFromPDF`, which scans the
 * rendered PDF for `{{TYPE, rN, key=value}}`, converts each match into a field
 * at those coordinates, and whites the token out. A token that falls outside
 * that grammar is skipped **silently** — no error, just a missing signature
 * field on a real lease — so there is a test asserting every token matches it.
 */

/** Default widget size in PDF points, proven end-to-end by the Phase 0 spike. */
export const SIGNATURE_WIDGET = { width: 160, height: 44 } as const;

/** Point size of a rendered placeholder line. Matches the renderer's base font. */
export const LINE_TEXT_HEIGHT = 11;

export type PartyRole = 'landlord' | 'tenant';

export type LeaseParty = {
  name: string;
  role: PartyRole;
};

export type Placeholder = {
  token: string;
  /**
   * Vertical space the renderer must reserve above AND below this token.
   *
   * Overlay 034 sizes a signature widget from its width/height meta and centres
   * it on the placeholder's own text bbox, so a widget taller than the line
   * grows `(height - lineHeight) / 2` in each direction. Without this the
   * widget overprints the line above — in the Phase 0 spike, `{{NAME, r1}}` and
   * the sized signature both resolved to y=185.1, which in a real lease means a
   * signature drawn across the landlord's printed name.
   */
  reservedLeadingPt: number;
};

export type Signer = {
  name: string;
  /** `r1`, `r2`, … Stable for a party across every document in the envelope. */
  recipient: string;
  placeholders: Placeholder[];
};

export type SignatureBlock = {
  documentKey: string;
  heading: string;
  signers: Signer[];
};

export type BuildSignatureBlocksOptions = {
  parties: LeaseParty[];
  /** `lease`, `addendum:<slug>`, `disclosure:<slug>`. */
  documentKey: string;
  /** Per-page initials, for addenda where each page is acknowledged. */
  withInitials?: boolean;
  widget?: { width: number; height: number };
};

const HEADINGS: Record<PartyRole, string> = {
  landlord: 'LANDLORD',
  tenant: 'TENANT',
};

/** Order blocks appear in. Landlord first, matching the recital. */
const ROLE_ORDER: PartyRole[] = ['landlord', 'tenant'];

const plain = (token: string): Placeholder => ({ token, reservedLeadingPt: 0 });

export const buildSignatureBlocks = ({
  parties,
  documentKey,
  withInitials = false,
  widget = SIGNATURE_WIDGET,
}: BuildSignatureBlocksOptions): SignatureBlock[] => {
  /*
    Recipient numbers are assigned over the party list as given, NOT per block.
    A signer must be the same recipient in the lease and in every addendum, or
    the envelope would ask one human to sign as several different people.
  */
  const numbered = parties.map((party, index) => ({ ...party, recipient: `r${index + 1}` }));

  const leading = Math.max(0, (widget.height - LINE_TEXT_HEIGHT) / 2);

  return ROLE_ORDER.flatMap((role) => {
    const forRole = numbered.filter((party) => party.role === role);

    if (forRole.length === 0) {
      return [];
    }

    return [
      {
        documentKey,
        heading: HEADINGS[role],
        signers: forRole.map(({ name, recipient }) => ({
          name,
          recipient,
          placeholders: [
            plain(`{{NAME, ${recipient}}}`),
            {
              token: `{{SIGNATURE, ${recipient}, width=${widget.width}, height=${widget.height}}}`,
              reservedLeadingPt: leading,
            },
            plain(`{{DATE, ${recipient}}}`),
            ...(withInitials ? [plain(`{{INITIALS, ${recipient}}}`)] : []),
          ],
        })),
      },
    ];
  });
};
