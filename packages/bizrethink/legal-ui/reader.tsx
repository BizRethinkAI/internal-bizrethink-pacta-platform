import { Button } from '@documenso/ui/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@documenso/ui/primitives/dialog';
import { Trans } from '@lingui/react/macro';
import { ArrowLeftIcon, ArrowUpRightIcon } from 'lucide-react';
import { createContext, type ReactNode, useContext, useId, useRef, useState } from 'react';

import { type LegalReading, type LegalReference, type LegalSegment, readingParagraphs } from './reading';

type ReadingItem = {
  slug: string;
  heading: string;
  instrument?: string;
  section?: string;
  body?: string;
  text?: string;
};
type ReferenceAction = (reference: LegalReference, source: HTMLElement) => void;
const ReferenceContext = createContext<ReferenceAction | null>(null);

/** Keep supplemental utilities inside this feature, including dialogs rendered through a portal. */
export const LegalWorkspace = ({ children }: { children: ReactNode }) => (
  <div data-legal-workspace className="min-w-0">
    {children}
  </div>
);

export const legalItemId = (slug: string) => `legal-item-${slug}`;

export const focusReadingItem = (id: string) => {
  const focus = () => {
    const element = document.getElementById(id);
    if (element) {
      for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) {
          parent.open = true;
        }
      }
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
      element.focus({ preventScroll: true });
      return true;
    }
    return false;
  };
  requestAnimationFrame(() => {
    if (focus()) {
      return;
    }
    // Router loader transitions can complete after this frame. Observe the actual mount.
    const observer = new MutationObserver(() => {
      if (focus()) {
        observer.disconnect();
        clearTimeout(timeout);
      }
    });
    const timeout = setTimeout(() => observer.disconnect(), 10_000);
    observer.observe(document.body, { childList: true, subtree: true });
  });
};

/** Full original prose as React text, with links only where the canonical projection declares them. */
export const LegalText = ({
  text,
  segments,
  large = false,
  sourceId,
  paragraphs,
  renderText,
}: {
  text?: string;
  segments?: LegalSegment[];
  large?: boolean;
  sourceId?: string;
  paragraphs?: LegalSegment[][];
  renderText?: (text: string) => ReactNode;
}) => {
  const follow = useContext(ReferenceContext);
  const fallbackId = useId();
  const id = sourceId ? `legal-text-${sourceId}` : fallbackId;
  return (
    <div
      className={`max-w-[78ch] break-words font-serif text-foreground leading-[1.85] ${large ? 'text-xl' : 'text-[17px]'}`}
    >
      {(paragraphs ?? readingParagraphs(segments ?? [{ kind: 'text', text: text ?? '' }])).map(
        (paragraph, paragraphIndex) => (
          <p
            key={`${id}-${paragraphIndex}`}
            className={`whitespace-pre-wrap ${paragraphIndex ? 'mt-5' : ''} ${/^\s*\([a-z0-9]+\)/i.test(paragraph[0]?.text ?? '') ? 'pl-7 -indent-7' : ''}`}
          >
            {paragraph.map((part, index) =>
              part.kind === 'reference' && follow ? (
                <button
                  key={`${id}-${paragraphIndex}-${index}`}
                  id={`${id}-${paragraphIndex}-${index}`}
                  type="button"
                  className="inline rounded-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  aria-label={`${part.targetKind === 'section' ? 'Section' : 'Clause'} ${part.text}, open reference`}
                  onClick={(event) => follow(part, event.currentTarget)}
                >
                  {part.text}
                </button>
              ) : (
                <span key={`${id}-${paragraphIndex}-${index}`}>{renderText ? renderText(part.text) : part.text}</span>
              ),
            )}
          </p>
        ),
      )}
    </div>
  );
};

/** The host supplies only its authorized corpus. A reference never performs another data request. */
export const ReferenceWorkspace = ({
  items,
  contexts,
  onNavigate,
  captureReturn,
  renderReading,
  children,
}: {
  items: ReadingItem[];
  contexts: Record<string, Record<string, LegalReading>>;
  onNavigate: (reference: LegalReference) => void;
  captureReturn?: () => () => void;
  renderReading?: (item: ReadingItem, reading: LegalReading) => ReactNode;
  children: ReactNode;
}) => {
  const [peek, setPeek] = useState<{
    reference: LegalReference;
    origin: HTMLElement;
    trail: { reference: LegalReference; focusId: string }[];
  } | null>(null);
  const [returnTo, setReturnTo] = useState<(() => void) | null>(null);
  const closeFocus = useRef<HTMLElement | null>(null);
  const target = items.find((item) => item.slug === peek?.reference.targetSlug);
  const reading = peek ? contexts[peek.reference.context]?.[peek.reference.targetSlug] : undefined;
  const sectionItems =
    peek?.reference.targetKind === 'section'
      ? items.filter(
          (item) =>
            item.section === peek.reference.section &&
            (!item.instrument || item.instrument === peek.reference.instrument) &&
            contexts[peek.reference.context]?.[item.slug],
        )
      : target
        ? [target]
        : [];
  return (
    <ReferenceContext.Provider
      value={(reference, origin) => {
        if (peek) {
          setPeek({ ...peek, reference, trail: [...peek.trail, { reference: peek.reference, focusId: origin.id }] });
          return;
        }
        closeFocus.current = origin;
        setPeek({ reference, origin, trail: [] });
      }}
    >
      {returnTo && (
        <div className="sticky top-2 z-20 mb-3 w-fit rounded-lg border bg-background shadow-sm print:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              returnTo();
              setReturnTo(null);
            }}
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            <Trans>Return to passage</Trans>
          </Button>
        </div>
      )}
      {children}
      <Dialog
        open={peek !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPeek(null);
          }
        }}
      >
        <DialogContent
          data-legal-workspace
          className="legal-reference-dialog sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            closeFocus.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{target?.heading ?? <Trans>Reference outside this review</Trans>}</DialogTitle>
            <DialogDescription>
              {peek && (
                <>
                  {peek.reference.instrument.toUpperCase()} · {peek.reference.targetKind} {peek.reference.text}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {peek && peek.trail.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => {
                const previous = peek.trail.at(-1);
                if (previous) {
                  setPeek({ ...peek, reference: previous.reference, trail: peek.trail.slice(0, -1) });
                  focusReadingItem(previous.focusId);
                }
              }}
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              <Trans>Back to previous reference</Trans>
            </Button>
          )}
          {target && reading ? (
            <>
              <p className="rounded-md bg-muted p-3 text-muted-foreground text-xs">
                <Trans>Citation context</Trans>: {peek?.reference.context}
              </p>
              <div className="space-y-6">
                {sectionItems.map((item) => (
                  <div key={item.slug}>
                    {sectionItems.length > 1 && (
                      <h3 className="mb-2 font-semibold">
                        {contexts[peek?.reference.context ?? '']?.[item.slug]?.number} {item.heading}
                      </h3>
                    )}
                    {renderReading ? (
                      renderReading(item, contexts[peek?.reference.context ?? ''][item.slug])
                    ) : (
                      <LegalText
                        sourceId={`peek-${item.slug}`}
                        segments={contexts[peek?.reference.context ?? '']?.[item.slug]?.segments}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
                  if (!peek) {
                    return;
                  }
                  const restore = captureReturn?.();
                  const originId = peek.origin.id;
                  setReturnTo(() => () => {
                    restore?.();
                    focusReadingItem(originId);
                  });
                  onNavigate(peek.reference);
                  closeFocus.current = null;
                  setPeek(null);
                  focusReadingItem(legalItemId(peek.reference.targetSlug));
                }}
              >
                <Trans>Open in reading context</Trans>
                <ArrowUpRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <p className="text-sm leading-relaxed">
              <Trans>
                This target is outside the content authorized for this workspace. Its citation is retained; the target
                wording is unavailable here.
              </Trans>
            </p>
          )}
        </DialogContent>
      </Dialog>
    </ReferenceContext.Provider>
  );
};

export const LegalSummary = ({ values }: { values: { label: ReactNode; value: ReactNode }[] }) => (
  <dl className="my-6 grid grid-cols-2 gap-4 border-y py-4 sm:flex sm:flex-wrap sm:gap-x-10">
    {values.map((value, index) => (
      <div key={index}>
        <dd className="font-semibold text-2xl tabular-nums">{value.value}</dd>
        <dt className="mt-1 text-muted-foreground text-xs">{value.label}</dt>
      </div>
    ))}
  </dl>
);
