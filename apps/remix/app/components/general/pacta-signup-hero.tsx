import {
  ClipboardCheck,
  CodeSquare,
  FileStack,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@documenso/ui/lib/utils';

// MODIFIED for BizRethink (overlay 054, revised 2x 2026-05-11): Pacta-branded
// signup hero panel mirroring the pacta.ink marketing site (charcoal +
// radial gold gradient + headline + auto-scrolling feature carousel +
// trust strip). Previous revisions had a fake "Acme Capital" mockup or
// empty space mid-panel; this version fills the real estate with the
// actual product story.
//
// Design tokens lifted from /Users/shwet/github/bizrethink/internal-bizrethink-pacta-web:
//   - Pacta Gold: #d4a574 (accent — period dot, hover lines, icon highlights)
//   - Charcoal: #1f2937 (primary background)
//   - Canvas: #fafafa (primary text on dark)
//   - Tight letter-spacing (-0.045em) + large leading (0.95) on the headline
//   - Radial gold gradient backdrop at ~28% opacity from the top
//
// Copy lifted from Hero.astro, Capabilities.astro, TrustStrip.astro so the
// platform feels like a continuation of the marketing site, not a separate
// product. Sync this file whenever marketing copy/tokens drift.

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  body: string;
  soon?: string;
};

// Six cards lifted from Capabilities.astro on pacta.ink. Order chosen so
// the most credibility-bearing one (cryptographic) sits first in the loop;
// then alternates trust signals (audit, embed) with growth signals (AI,
// mobile, branding). Bodies truncated to fit the narrower hero column.
const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: ShieldCheck,
    title: 'Cryptographic signatures',
    body: "Every signature is a CAdES / PKCS#7 envelope, not a JPEG of someone's name. With TSA + LTV, signatures stay verifiable for decades.",
  },
  {
    icon: Sparkles,
    title: 'AI-assisted contracts',
    body: 'Draft from a plain-English brief. Drop a PDF and AI places signature fields for you. Signers can ask what each clause means.',
    soon: 'Pro & Business',
  },
  {
    icon: Smartphone,
    title: 'Native iOS app',
    body: 'Voice-to-contract drafting, camera-based field detection, on-the-go eIDAS signing — built mobile-first.',
    soon: 'Q4 2026',
  },
  {
    icon: Workflow,
    title: 'Multi-party workflows',
    body: 'Sequential, parallel, or hybrid signing orders. Approvers, observers, CC recipients with distinct permissions and auto-reminders.',
  },
  {
    icon: Palette,
    title: 'Per-tenant branding',
    body: 'Each team ships its own logo, sender domain, footer, and signing-page theme. White-label without the enterprise upcharge.',
  },
  {
    icon: ClipboardCheck,
    title: 'Immutable audit trails',
    body: 'Every view, signature, and field change recorded with timestamp, IP, and authenticated identity — embedded in the signed PDF.',
  },
  {
    icon: FileStack,
    title: 'Smart templates',
    body: 'Convert your master agreements once. Reusable templates with form fields, conditional sections, and recipient-aware variables.',
  },
  {
    icon: CodeSquare,
    title: 'Embedded signing',
    body: 'Drop the signing experience directly into your product. White-labeled iframe or React SDK with full event hooks.',
  },
];

const TRUST_SIGNALS = ['eIDAS', 'CAdES', 'TSA + LTV', 'AES-256', 'GDPR-aligned', 'SOC 2'];

const FeatureCardTile = ({ card }: { card: FeatureCard }) => {
  const Icon = card.icon;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#d4a574]/15">
          <Icon className="h-4 w-4 text-[#d4a574]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{card.title}</h3>
            {card.soon && (
              <span className="rounded-full bg-[#d4a574]/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-[#d4a574] uppercase">
                {card.soon}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{card.body}</p>
        </div>
      </div>
    </div>
  );
};

export type PactaSignupHeroProps = {
  className?: string;
};

export const PactaSignupHero = ({ className }: PactaSignupHeroProps) => {
  return (
    <div
      className={cn(
        'relative isolate flex h-full w-full flex-col overflow-hidden rounded-xl',
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
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212, 165, 116, 0.28) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid pattern for texture. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top: kicker + headline + value prop */}
      <div className="px-10 pt-10">
        <div className="flex">
          <div className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-medium tracking-[0.18em] text-[#e8c89a] uppercase backdrop-blur-sm">
            Document infrastructure for modern teams
          </div>
        </div>

        <h2
          className="mt-7 text-[2.75rem] leading-[0.95] font-semibold tracking-[-0.045em]"
          style={{ letterSpacing: '-0.045em' }}
        >
          Agreements
          <br />
          that hold
          <span className="text-[#d4a574]">.</span>
        </h2>

        <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-white/65">
          The document signing platform built for teams that take agreements seriously. eIDAS-grade
          cryptographic signatures, AI drafting, and the compliance posture your auditors will sign
          off on.
        </p>
      </div>

      {/* Middle: scrolling feature carousel (infinite loop via doubled list).
          masked top/bottom so cards fade in/out instead of clipping hard. */}
      <div
        className="relative my-7 flex-1 overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          className="flex flex-col gap-3 px-10 will-change-transform"
          style={{
            animation: 'pacta-hero-scroll 40s linear infinite',
          }}
        >
          {/* Doubled so the wrap-around is invisible. */}
          {[...FEATURE_CARDS, ...FEATURE_CARDS].map((card, idx) => (
            <FeatureCardTile key={`${card.title}-${idx}`} card={card} />
          ))}
        </div>
        {/* Inline keyframes so the file is self-contained — no global CSS edit. */}
        <style>{`
          @keyframes pacta-hero-scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
        `}</style>
      </div>

      {/* Bottom: trust strip */}
      <div className="px-10 pb-10">
        <div className="flex items-center gap-2 text-[10.5px] font-medium tracking-[0.16em] text-white/45 uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          Trusted by builders who can&apos;t afford to lose a contract
        </div>

        <div className="mt-3.5 flex flex-wrap gap-x-2.5 gap-y-2">
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
