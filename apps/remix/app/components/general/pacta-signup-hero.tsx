import { ShieldCheck } from 'lucide-react';

import { cn } from '@documenso/ui/lib/utils';

// MODIFIED for BizRethink (overlay 054, revised 2026-05-11): Pacta-branded
// signup hero panel that mirrors the pacta.ink marketing site's visual
// language instead of Documenso's "fake user demo profile" pattern.
//
// Design tokens lifted from /Users/shwet/github/bizrethink/internal-bizrethink-pacta-web:
//   - Pacta Gold: #d4a574 (accent — wordmark dot, hover accents, gradient)
//   - Charcoal: #1f2937 (primary text)
//   - Canvas: #fafafa (light backgrounds)
//   - Border subtle: #e5e7eb
//   - Tight letter-spacing (-0.045em) + large leading (0.95) on the headline
//   - Radial gold gradient backdrop at ~28% opacity from the top
//
// Copy lifted verbatim from the marketing Hero + TrustStrip components so
// the platform feels like a continuation of pacta.ink, not a different
// product. If you change tagline / trust list on the marketing site,
// update here too — they should stay in sync.

const TRUST_SIGNALS = ['eIDAS', 'CAdES', 'TSA + LTV', 'AES-256', 'GDPR-aligned', 'SOC 2'];

export type PactaSignupHeroProps = {
  className?: string;
};

export const PactaSignupHero = ({ className }: PactaSignupHeroProps) => {
  return (
    <div
      className={cn(
        'relative isolate flex h-full w-full flex-col justify-between overflow-hidden rounded-xl p-10',
        // Charcoal background matches the marketing site's dark sections.
        'bg-[#1f2937] text-[#fafafa]',
        className,
      )}
    >
      {/* Radial gold gradient backdrop — same effect as pacta.ink's Hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212, 165, 116, 0.28) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid pattern for texture (mimics marketing site's quiet
          page-background lattice). Pure CSS, no asset needed. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top: kicker badge */}
      <div className="flex">
        <div className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.18em] text-[#e8c89a] uppercase backdrop-blur-sm">
          Document infrastructure for modern teams
        </div>
      </div>

      {/* Middle: headline + value prop */}
      <div className="my-12 max-w-md">
        <h2
          className="text-5xl leading-[0.95] font-semibold tracking-[-0.045em]"
          style={{ letterSpacing: '-0.045em' }}
        >
          Agreements
          <br />
          that hold
          <span className="text-[#d4a574]">.</span>
        </h2>

        <p className="mt-7 max-w-sm text-[15px] leading-relaxed text-white/70">
          Pacta is the document signing platform built for teams that take agreements seriously.
          eIDAS-grade cryptographic signatures, long-term verifiability, and the compliance posture
          your auditors will sign off on — without the legacy enterprise sticker shock.
        </p>
      </div>

      {/* Bottom: trust strip */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-white/45 uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          Trusted by builders who can't afford to lose a contract
        </div>

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
          {TRUST_SIGNALS.map((signal) => (
            <span
              key={signal}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/75"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
