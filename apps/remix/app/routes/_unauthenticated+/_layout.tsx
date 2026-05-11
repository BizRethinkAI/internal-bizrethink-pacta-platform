import { ArrowRight } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router';

import backgroundPattern from '@documenso/assets/images/background-pattern.png';

import { BrandingLogo } from '~/components/general/branding-logo';

// MODIFIED for BizRethink (overlay 026 revised 2026-05-11): replace the
// centered "pacta + tagline" lockup that overlapped wide hero panels with a
// proper sticky header bar that mirrors the marketing site (pacta.ink) one
// for one. Pacta-on-the-platform now feels like a continuation of pacta.ink,
// not a separate app with mismatched chrome.
//
// Header structure lifted verbatim from
// ~/github/bizrethink/internal-bizrethink-pacta-web/src/components/Header.astro:
//   - Logo on the left (links to pacta.ink homepage)
//   - 5 nav links in the middle (pointing at marketing-site anchors)
//   - Right side: "Sign in" link + "Get started" button (or inverted —
//     when the user is already on /signup, the CTA flips to "Sign in")
//
// Sync this file whenever the marketing site's Header.astro nav changes.

const MARKETING_NAV = [
  { href: 'https://pacta.ink/#why-pacta', label: 'Why Pacta' },
  { href: 'https://pacta.ink/#product', label: 'Product' },
  { href: 'https://pacta.ink/#developers', label: 'Developers' },
  { href: 'https://pacta.ink/#security', label: 'Security' },
  { href: 'https://pacta.ink/#pricing', label: 'Pricing' },
];

export default function Layout() {
  const { pathname } = useLocation();

  // Right-side CTA: when the user is already on /signup, show "Sign in"
  // (they're in account-creation mode; the "Get started" button is
  // redundant). On /signin or anywhere else, show "Get started" pointing
  // at /signup. Mirrors how the marketing site always shows the OTHER
  // option as the primary CTA.
  const isOnSignup = pathname?.startsWith('/signup');
  const primaryCtaHref = isOnSignup ? '/signin' : '/signup';
  const primaryCtaLabel = isOnSignup ? 'Sign in' : 'Get started';
  const secondaryCtaHref = isOnSignup ? '/signup' : '/signin';
  const secondaryCtaLabel = isOnSignup ? 'Sign up' : 'Sign in';

  return (
    <main className="relative flex min-h-screen flex-col">
      {/* Sticky header — matches pacta.ink/src/components/Header.astro exactly. */}
      <header className="border-border-subtle/60 bg-background/85 sticky top-0 z-40 w-full border-b backdrop-blur-md">
        <nav
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10"
          aria-label="Primary"
        >
          <a
            href="https://pacta.ink"
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="Pacta home"
          >
            <BrandingLogo className="text-foreground h-10 w-auto" />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {MARKETING_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-foreground/70 hover:text-foreground text-[15px] font-medium transition"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={secondaryCtaHref}
              className="text-foreground/80 hover:text-foreground hidden rounded-md px-3 py-2 text-[15px] font-medium transition sm:inline-block"
            >
              {secondaryCtaLabel}
            </Link>
            <Link
              to={primaryCtaHref}
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md"
            >
              {primaryCtaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Page content. Centered both vertically and horizontally within the
          remaining viewport space (below the header). */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 md:p-12 lg:p-16">
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
