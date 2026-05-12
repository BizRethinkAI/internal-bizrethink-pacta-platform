import { Outlet } from 'react-router';

import backgroundPattern from '@documenso/assets/images/background-pattern.png';

import { BrandingLogo } from '~/components/general/branding-logo';

// MODIFIED for BizRethink (overlay 026 revised 3x 2026-05-11): minimal
// unauth chrome. Previous revisions tried a centered logo + tagline lockup
// (clipped by wide hero panels) and a full sticky marketing-style header
// with nav + CTAs (crowded the form, redundant with the in-form "Sign in
// instead" / "Sign up" links).
//
// Final shape: just a left-aligned Pacta wordmark at the top of the page,
// linking back to pacta.ink. No nav, no header CTAs, no tagline — the
// hero already carries "Agreements that hold." and the form already
// carries its own switch-mode link. Clean.

export default function Layout() {
  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Top-left logo strip. Not sticky — scrolls with content. */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-8 lg:px-10 lg:pt-10">
        <a
          href="https://pacta.ink"
          className="inline-flex items-center transition-opacity hover:opacity-80"
          aria-label="Pacta home"
        >
          <BrandingLogo className="text-foreground h-10 w-auto" />
        </a>
      </div>

      {/* Page content centered in the remaining viewport space. The top
          padding is intentionally LARGER than the side padding so the
          panels sit clearly below the logo (previous symmetric `p-16`
          made the panels crowd the logo). */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 pt-12 pb-8 md:px-12 md:pt-20 md:pb-12 lg:px-16 lg:pt-28 lg:pb-16">
        <div className="absolute -inset-[min(600px,max(400px,60vw))] -z-[1] flex items-center justify-center opacity-70">
          <img
            src={backgroundPattern}
            alt="background pattern"
            className="dark:brightness-95 dark:contrast-[70%] dark:invert dark:sepia"
            style={{
              mask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
              WebkitMask: 'radial-gradient(rgba(255, 255, 255, 1) 0%, transparent 80%)',
            }}
          />
        </div>

        <div className="relative w-full">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
