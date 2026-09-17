import { MCA_PROVIDER_BINDINGS } from '../templates/profile';
import contract from './live-template-contract.json';
import { type ProducedInstrument, RECIPIENTS } from './recipient-contract';
import { WIDGET_PARITY, type WidgetParity } from './template-parity';

/**
 * What a merchant-ready render has to put on the page, worked out once.
 *
 * The renderer, the injector and anything that reports on parity all need the
 * same three lists, and deriving them separately is how two of them come to
 * disagree. So they are derived here, from the pinned contract and the pinned
 * parity map, and nothing else computes them.
 *
 * Every live widget name lands in exactly one list:
 *
 *   marked    the page prints `«name»`, and `injectMcaWidgets` puts a widget
 *             there. This is the ordinary case.
 *   printed   the builder KNOWS the value when it publishes — the funder's own
 *             address, its approved processor — so it sets it in type. There is
 *             no widget, and a value the platform sends for it lands nowhere.
 *   absent    the builder cannot produce it: retired on purpose, settled by
 *             clause selection, or a fact the library does not hold.
 *
 * `printed` and `absent` are both breaks and they break differently. A printed
 * name is a deliberate difference that the caller has not been told about; an
 * absent name is a hole in the document.
 */

export type MarkedField = {
  widget: string;
  /** The value key the renderer resolves to fill this widget. */
  binding: string;
};

export type LostField = {
  widget: string;
  kind: 'printed' | 'absent';
  why: string;
};

export type PlannedSigner = {
  role: string;
  /** `r1`, `r2` … in published signing order. */
  token: string;
  /** The binding prefix carrying this party's `.signature` and `.signedDate`. */
  signs: string;
  signature: string;
  date: string;
};

export type McaFieldPlan = {
  marked: MarkedField[];
  printed: LostField[];
  absent: LostField[];
  /** Exactly what `injectMcaWidgets` should be told to expect. */
  expect: string[];
  signers: PlannedSigner[];
};

/** Why a widget the builder resolves at publication has no slot in the page. */
const printedBecause = (binding: string): string =>
  `The builder resolves ${binding} from the provider profile when it publishes, and sets it in type. There is no widget, so a value sent for this name lands nowhere.`;

/** Why a widget the builder cannot produce has no slot either. */
const absentBecause = (parity: Extract<WidgetParity, { gap: string }>): string => {
  switch (parity.gap) {
    case 'retired':
    case 'compile-time':
    case 'unmodelled':
    case 'absent-from-instrument':
      return parity.why;
    default:
      return 'The builder does not produce this document.';
  }
};

export const fieldPlanFor = (instrument: ProducedInstrument): McaFieldPlan => {
  const marked: MarkedField[] = [];
  const printed: LostField[] = [];
  const absent: LostField[] = [];

  // Iterating the LIVE names rather than the parity map's keys, so a name the
  // map somehow lost would go missing loudly in the partition test rather than
  // quietly here.
  for (const widget of contract.instruments[instrument].widgets) {
    const parity: WidgetParity | undefined = WIDGET_PARITY[instrument][widget];

    if (!parity) {
      absent.push({ widget, kind: 'absent', why: 'This widget is not in the parity map at all.' });
      continue;
    }

    if ('gap' in parity) {
      absent.push({ widget, kind: 'absent', why: absentBecause(parity) });
      continue;
    }

    if (MCA_PROVIDER_BINDINGS.has(parity.binding)) {
      printed.push({ widget, kind: 'printed', why: printedBecause(parity.binding) });
      continue;
    }

    marked.push({ widget, binding: parity.binding });
  }

  const signers = [...RECIPIENTS[instrument]]
    .sort((a, b) => a.signingOrder - b.signingOrder)
    .map((party, index) => {
      // Numbered from the ORDER, not from the stored `signingOrder`: `rN` is a
      // position in the recipient list Documenso builds, and a gap in the
      // published numbers must not become a gap in the tokens.
      const token = `r${index + 1}`;

      return {
        role: party.role,
        token,
        signs: party.signs,
        signature: `{{SIGNATURE, ${token}}}`,
        date: `{{DATE, ${token}}}`,
      };
    });

  return { marked, printed, absent, expect: marked.map((field) => field.widget), signers };
};

/**
 * Every value a caller would send into a builder-produced template and lose.
 *
 * This is the parity gap as the funder's platform would experience it, which is
 * the only way it is worth stating: not "we model 37 of 42 fields" but "five
 * values you send today would go nowhere."
 */
export const parityShortfall = (instrument: ProducedInstrument): LostField[] => {
  const plan = fieldPlanFor(instrument);

  return [...plan.printed, ...plan.absent].sort((a, b) => a.widget.localeCompare(b.widget));
};
