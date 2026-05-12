import { useEffect, useState } from 'react';

import { Trans } from '@lingui/react/macro';
import { ArrowRight, BookOpenIcon, MailIcon, PaletteIcon, UsersIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { useSession } from '@documenso/lib/client-only/providers/session';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';

// ADDED for BizRethink (overlay 061): one-time onboarding modal that fires
// on the first authenticated render after sign-in. Helps new users find the
// four most common next-steps:
//   1. Send your first document      → docs walkthrough + Documents tab
//   2. Set up branding               → docs + Settings → Branding
//   3. Invite your team              → docs + Settings → Members
//   4. Configure your email domain   → docs + Settings → Email Domains
//
// State is per-user, persisted in localStorage. Each card has a "Learn more"
// link to the pacta.ink/docs article. Users can "Skip for now" — the dialog
// then never shows again for that browser/user combo.
//
// Storage key intentionally includes the user.id so multiple Pacta accounts
// on the same browser each get their own onboarding flow.

const ONBOARDING_DISMISSED_KEY = (userId: number | string) =>
  `pacta-onboarding-dismissed-${userId}`;

type OnboardingCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  docsHref: string;
  /** In-app deep link (relative). Optional — only present if there's a
   *  meaningful in-app destination to send the user to. */
  appHref?: (orgUrl: string) => string;
};

const CARDS: OnboardingCard[] = [
  {
    icon: BookOpenIcon,
    title: 'Send your first document',
    description:
      'Upload a PDF, place signature fields, add recipients, hit send. Five minutes start to finish.',
    docsHref: 'https://pacta.ink/docs/getting-started/send-your-first-document',
  },
  {
    icon: PaletteIcon,
    title: 'Make it yours',
    description:
      'Replace the Pacta logo with yours, pick an accent color, choose what your customers see.',
    docsHref: 'https://pacta.ink/docs/features/branding',
    appHref: (orgUrl) => `/o/${orgUrl}/settings/branding`,
  },
  {
    icon: UsersIcon,
    title: 'Invite your team',
    description:
      'Add admins, managers, and members. Each role has the right level of access — no surprises.',
    docsHref: 'https://pacta.ink/docs/getting-started/organisation-setup',
    appHref: (orgUrl) => `/o/${orgUrl}/settings/members`,
  },
  {
    icon: MailIcon,
    title: 'Send from your own domain',
    description:
      'Verify a domain via one DNS TXT record. Your signing emails go from yours, not ours.',
    docsHref: 'https://pacta.ink/docs/features/email-domains',
    appHref: (orgUrl) => `/o/${orgUrl}/settings/email-domains`,
  },
];

export const OnboardingDialog = () => {
  const { user, organisations } = useSession();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Pick the first org the user is part of for in-app deep links. For users
  // with a Personal Org only, that's the personal one (also fine — Settings
  // pages work there too).
  const firstOrgUrl = organisations[0]?.url;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissed = window.localStorage.getItem(ONBOARDING_DISMISSED_KEY(user.id));
    setHydrated(true);

    if (!dismissed) {
      // Small delay so the modal doesn't jump in before the page renders.
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user.id]);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_DISMISSED_KEY(user.id), 'true');
    }
    setOpen(false);
  };

  // Don't render anything until hydration completes — avoids server/client
  // mismatch and an awkward flash of the dialog on every page load.
  if (!hydrated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">
            <Trans>Welcome to Pacta</Trans>
            <span className="text-[#d4a574]">.</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            <Trans>
              Pick whichever you'd like to do first. Each opens a short guide — you can come back to
              the rest any time from the help icon in the top bar.
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.docsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:border-foreground/20 hover:bg-muted/30 group block rounded-lg border p-4 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-foreground text-sm font-semibold">{card.title}</h3>
                    <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
                      {card.description}
                    </p>
                    <div className="text-foreground/70 group-hover:text-foreground mt-2 flex items-center gap-1 text-[11px] font-medium">
                      <Trans>Learn more</Trans>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
                {card.appHref && firstOrgUrl && (
                  <Link
                    to={card.appHref(firstOrgUrl)}
                    onClick={dismiss}
                    className="text-foreground/60 hover:text-foreground mt-3 block text-[11px] font-medium underline-offset-2 hover:underline"
                  >
                    <Trans>Go to settings →</Trans>
                  </Link>
                )}
              </a>
            );
          })}
        </div>

        <DialogFooter className="mt-4 sm:justify-between">
          <a
            href="https://pacta.ink/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            <Trans>Browse all docs →</Trans>
          </a>
          <Button variant="ghost" onClick={dismiss}>
            <Trans>Skip for now</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
