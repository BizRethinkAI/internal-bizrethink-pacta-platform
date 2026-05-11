import { useEffect, useRef, useState } from 'react';

import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

import { cn } from '@documenso/ui/lib/utils';

// MODIFIED for BizRethink (overlay 054, revised 3x 2026-05-11): the signup
// hero is a single-card-at-a-time horizontal carousel — one big feature card
// visible at a time with a rich CSS/SVG visual on top, auto-rotating every
// ~5s, pause on hover, pagination dots. Prior revisions tried a vertical
// scrolling list of small cards (looked like a contact list) and a fake
// "Acme Capital" mockup — neither read as a world-class hero.
//
// Each card is implemented as a self-contained sub-component so visuals
// can be edited independently. Pure CSS + SVG — no image assets.
//
// Design tokens lifted from pacta.ink:
//   - Charcoal #1f2937 background
//   - Pacta Gold #d4a574 accent (period dot, badges, mockup highlights)
//   - Canvas #fafafa text on dark
//   - Radial gold gradient backdrop
//
// Sync this file's tagline/trust list whenever marketing site copy drifts.

const TRUST_SIGNALS = ['eIDAS', 'CAdES', 'TSA + LTV', 'AES-256', 'GDPR-aligned', 'SOC 2'];

const ROTATION_MS = 5500;

type FeatureCard = {
  kicker: string;
  title: string;
  body: string;
  badge?: string;
  Visual: () => JSX.Element;
};

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 1 — Cryptographic signatures
// A mock "signed document" verification panel. PDF page silhouette + center
// verification stamp + metadata rows in monospace.
// ─────────────────────────────────────────────────────────────────────────────
const CryptographicVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center p-6">
    {/* Document silhouette */}
    <div className="relative w-full max-w-[280px] rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
      {/* Faux page lines */}
      <div className="space-y-1.5">
        <div className="h-1.5 w-3/5 rounded-full bg-white/10" />
        <div className="h-1.5 w-4/5 rounded-full bg-white/10" />
        <div className="h-1.5 w-2/3 rounded-full bg-white/10" />
        <div className="h-1.5 w-3/4 rounded-full bg-white/10" />
        <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
      </div>

      {/* Verification stamp */}
      <div className="my-5 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#d4a574]/30" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#d4a574] bg-[#d4a574]/10">
            <CheckCircle2 className="h-7 w-7 text-[#d4a574]" />
          </div>
        </div>
      </div>

      {/* Metadata rows */}
      <div className="space-y-1.5 font-mono text-[10px] text-white/55">
        <div className="flex justify-between border-t border-white/10 pt-1.5">
          <span className="text-white/40">SIGNER</span>
          <span>john@acme.com</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">HASH</span>
          <span>a1b2…f9e7</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">TSA</span>
          <span className="text-[#d4a574]">✓ verified</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">LTV</span>
          <span className="text-[#d4a574]">✓ long-term</span>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 2 — AI-assisted contracts
// Chat-bubble interface: user prompt → AI response → field placement summary.
// ─────────────────────────────────────────────────────────────────────────────
const AiDraftingVisual = () => (
  <div className="relative flex h-full w-full items-end p-6">
    <div className="w-full max-w-[300px] space-y-2.5">
      {/* User bubble */}
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-white/10 px-3 py-2 text-[12px] text-white/85">
          Draft an MSA for a fintech partner with 30-day net terms
        </div>
      </div>

      {/* AI bubble */}
      <div className="flex justify-start">
        <div className="flex max-w-[85%] gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#d4a574]/15">
            <Sparkles className="h-3.5 w-3.5 text-[#d4a574]" />
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl rounded-tl-sm bg-[#d4a574]/10 px-3 py-2 text-[12px] text-white/85">
              Generated a 12-clause MSA with Pacta's fintech template. Net 30, IP carve-outs, and
              limitation of liability are all in there.
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10.5px] text-white/55">
              <div className="flex items-center justify-between">
                <span>✦ 4 signature fields placed</span>
                <span className="text-[#d4a574]">Ready to send</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Typing indicator */}
      <div className="flex items-center gap-1.5 pl-9">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />
        <div
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40"
          style={{ animationDelay: '200ms' }}
        />
        <div
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40"
          style={{ animationDelay: '400ms' }}
        />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 3 — Native iOS app
// iPhone frame with proper ~9:19 aspect ratio (prior revision was too
// square, looked like an Apple Watch). Includes status bar, Dynamic
// Island notch, app content, and home indicator pill.
// ─────────────────────────────────────────────────────────────────────────────
const IosAppVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center p-4">
    {/* Phone frame — fixed aspect ratio so it always reads as a phone. */}
    <div
      className="relative flex flex-col overflow-hidden rounded-[2rem] border-[3px] border-white/15 bg-[#0a0e14] shadow-2xl"
      style={{ width: '155px', aspectRatio: '9 / 19' }}
    >
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-2 text-[8px] font-semibold text-white">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          {/* Signal bars */}
          <div className="flex items-end gap-px">
            <div className="h-1 w-0.5 rounded-sm bg-white/80" />
            <div className="h-1.5 w-0.5 rounded-sm bg-white/80" />
            <div className="h-2 w-0.5 rounded-sm bg-white/80" />
            <div className="h-2.5 w-0.5 rounded-sm bg-white/80" />
          </div>
          {/* Battery */}
          <div className="relative ml-0.5 h-2 w-3.5 rounded-[2px] border border-white/70">
            <div className="absolute inset-0.5 rounded-[1px] bg-white/80" />
          </div>
        </div>
      </div>

      {/* Dynamic Island */}
      <div className="mt-1 flex justify-center">
        <div className="h-3 w-12 rounded-full bg-black" />
      </div>

      {/* App content */}
      <div className="flex flex-1 flex-col px-3 pt-3">
        {/* App header */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[12px] font-bold tracking-tight text-white">
            pacta<span className="text-[#d4a574]">.</span>
          </div>
          <div className="h-5 w-5 rounded-full bg-white/15" />
        </div>

        {/* Section label */}
        <div className="mb-1.5 text-[7px] font-semibold tracking-[0.14em] text-white/40 uppercase">
          Awaiting signature
        </div>

        {/* Document card (in progress) */}
        <div className="mb-2 rounded-lg border border-[#d4a574]/30 bg-[#d4a574]/[0.06] p-2">
          <div className="mb-1 h-1 w-3/4 rounded-full bg-white/40" />
          <div className="mb-1.5 h-0.5 w-1/2 rounded-full bg-white/20" />
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-[#d4a574]" />
            <div className="text-[7px] font-medium text-[#d4a574]">2 of 3 signed</div>
          </div>
        </div>

        {/* Section label */}
        <div className="mt-1 mb-1.5 text-[7px] font-semibold tracking-[0.14em] text-white/40 uppercase">
          Recently completed
        </div>

        {/* Document card (sealed 3h) */}
        <div className="mb-1.5 rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="mb-1 h-1 w-2/3 rounded-full bg-white/30" />
          <div className="mb-1.5 h-0.5 w-3/5 rounded-full bg-white/15" />
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400" />
            <div className="text-[7px] font-medium text-emerald-400/80">Sealed · 3h ago</div>
          </div>
        </div>

        {/* Document card (sealed yesterday) */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <div className="mb-1 h-1 w-3/5 rounded-full bg-white/30" />
          <div className="mb-1.5 h-0.5 w-2/5 rounded-full bg-white/15" />
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 rounded-full bg-emerald-400" />
            <div className="text-[7px] font-medium text-emerald-400/80">Sealed · yesterday</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto mb-2 rounded-xl bg-white py-2 text-center text-[9px] font-semibold text-[#1f2937]">
          Sign with Face ID
        </div>

        {/* Home indicator */}
        <div className="mb-1.5 flex justify-center">
          <div className="h-0.5 w-10 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL 4 — Immutable audit trails
// Terminal-style log feed with streaming entries.
// ─────────────────────────────────────────────────────────────────────────────
const AuditTrailVisual = () => (
  <div className="relative flex h-full w-full items-center justify-center p-6">
    <div className="w-full max-w-[300px] overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-2xl backdrop-blur-sm">
      {/* Terminal header */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-red-400/60" />
        <div className="h-2 w-2 rounded-full bg-amber-400/60" />
        <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
        <div className="ml-2 font-mono text-[9px] text-white/40">audit.log</div>
      </div>

      {/* Log entries */}
      <div className="space-y-1.5 p-3 font-mono text-[10px] leading-relaxed text-white/65">
        <div>
          <span className="text-white/35">14:32</span> <span className="text-[#d4a574]">VIEW</span>{' '}
          <span className="text-white/55">recipient@acme · 173.94.±</span>
        </div>
        <div>
          <span className="text-white/35">14:35</span>{' '}
          <span className="text-blue-300/80">FIELD</span>{' '}
          <span className="text-white/55">signature_1 placed</span>
        </div>
        <div>
          <span className="text-white/35">14:36</span>{' '}
          <span className="text-emerald-300/80">SIGN</span>{' '}
          <span className="text-white/55">hash:a1b2…f9e7</span>
        </div>
        <div>
          <span className="text-white/35">14:36</span> <span className="text-[#d4a574]">SEAL</span>{' '}
          <span className="text-white/55">CAdES + TSA + LTV</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/35">14:36</span> <span className="text-white/55">cursor</span>
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-[#d4a574]" />
        </div>
      </div>
    </div>
  </div>
);

const FEATURE_CARDS: FeatureCard[] = [
  {
    kicker: 'Cryptographic, not just legal',
    title: 'Signatures that hold up in court — and in code.',
    body: 'Every signature is a CAdES / PKCS#7 envelope with a Time Stamp Authority and Long-Term Validation. Verifiable for decades, even after issuing certificates expire.',
    Visual: CryptographicVisual,
  },
  {
    kicker: 'AI-assisted contracts',
    title: 'Draft a contract by describing it.',
    body: 'Plain-English brief in, fully-formed contract out. Drop a PDF and AI places signature fields for you. Signers can ask what each clause means without leaving the document.',
    badge: 'Pro & Business',
    Visual: AiDraftingVisual,
  },
  {
    kicker: 'Native iOS app',
    title: 'Your phone is the office.',
    body: 'Voice-to-contract drafting, camera-based field detection, on-the-go eIDAS signing. The first e-signature platform built mobile-first.',
    badge: 'Q4 2026',
    Visual: IosAppVisual,
  },
  {
    kicker: 'Immutable audit trails',
    title: 'Every action, in the signed PDF.',
    body: 'Views, field changes, signatures — all timestamped, IP-stamped, identity-bound. The audit certificate is embedded directly in the signed document, not stored separately to be lost.',
    Visual: AuditTrailVisual,
  },
];

export type PactaSignupHeroProps = {
  className?: string;
};

export const PactaSignupHero = ({ className }: PactaSignupHeroProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) {
      return;
    }
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURE_CARDS.length);
    }, ROTATION_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused]);

  return (
    <div
      className={cn(
        'relative isolate flex h-full w-full flex-col overflow-hidden rounded-xl',
        'bg-[#1f2937] text-[#fafafa]',
        className,
      )}
    >
      {/* Radial gold gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 165, 116, 0.28) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top: kicker + headline */}
      <div className="px-10 pt-10">
        <div className="flex">
          <div className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.18em] text-[#e8c89a] uppercase backdrop-blur-sm">
            Document infrastructure for modern teams
          </div>
        </div>

        <h2
          className="mt-6 text-[2.5rem] leading-[0.95] font-semibold tracking-[-0.045em]"
          style={{ letterSpacing: '-0.045em' }}
        >
          Agreements
          <br />
          that hold
          <span className="text-[#d4a574]">.</span>
        </h2>
      </div>

      {/* Middle: feature carousel — one big card at a time, slides horizontally. */}
      <div
        className="relative my-7 flex-1 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {FEATURE_CARDS.map((card, idx) => {
            const Visual = card.Visual;
            return (
              <div key={idx} className="flex h-full w-full flex-shrink-0 flex-col px-10">
                {/* Big visual area */}
                <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                  <Visual />
                </div>

                {/* Card text below visual */}
                <div className="mt-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-[#d4a574] uppercase">
                      {card.kicker}
                    </span>
                    {card.badge && (
                      <span className="rounded-full bg-[#d4a574]/15 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-[#d4a574] uppercase">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg leading-tight font-semibold">{card.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{card.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 px-10 pb-6">
        {FEATURE_CARDS.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Show feature ${idx + 1}`}
            onClick={() => setActiveIndex(idx)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              activeIndex === idx ? 'w-8 bg-[#d4a574]' : 'w-1.5 bg-white/20 hover:bg-white/40',
            )}
          />
        ))}
      </div>

      {/* Bottom: trust strip */}
      <div className="border-t border-white/5 px-10 py-6">
        <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.16em] text-white/40 uppercase">
          <ShieldCheck className="h-3 w-3" />
          Trusted by builders who can&apos;t afford to lose a contract
        </div>

        <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-2">
          {TRUST_SIGNALS.map((signal) => (
            <span
              key={signal}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-medium text-white/75"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
